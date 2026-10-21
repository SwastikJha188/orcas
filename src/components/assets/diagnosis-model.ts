"use client";

/**
 * Diagnosis page model: turns the live rule engine (kiln fleet, pyro line), the stored
 * AssetIQ record (`/api/diagnosis`) and the DB sensor catalog into what the
 * page shows — alarms with their lifecycle, findings, the sensors that are
 * their evidence (with validity), ISO 10816-3 / 20816-3 vibration zones,
 * prescriptive actions and the event log. No numbers are invented here: every
 * value comes from the running engine, the catalog or the stored record.
 *
 * Terminology follows D4 §8.2 / D5 §8–9: data quality → reference model →
 * sensor validation → rules → confirmation (persistence 2–4 samples, 1 for
 * critical; hysteresis 4 clean samples) → diagnosis.
 */

import { useApi } from "@/lib/api-cache";
import { displayName } from "@/lib/display-name";
import type { DiagnosisRecord } from "./assets-data";
import type { CatalogSensorView } from "./use-machine-catalog";
import type { RuleState, SimFrame } from "@shared/lib/kiln-sim/engine";
import { formatDuration } from "@shared/lib/kiln-sim/engine";
import { isRelativeLimit, limitPair, type SignalDef } from "@shared/lib/kiln-sim/signals";
import type { PlantDefs } from "@shared/lib/plant-defs";
import type { WorkOrderPriorityDto } from "@shared/types/monitoring";
import { twoSided, type TwoSided } from "./sensor-gauge";
import { VALIDITY_WORDS } from "@/components/ui/status";

export type Severity = "Normal" | "Alert" | "Critical";
export type Tone = "good" | "warn" | "bad" | "idle" | "info";

export const toneOf = (sev: Severity): Tone => (sev === "Critical" ? "bad" : sev === "Alert" ? "warn" : "good");

/** Rules clear after this many consecutive clean samples (D5 §9.2). */
export const HYSTERESIS_SAMPLES = 4;

/* ------------------------------------------------------------------ */
/* ISO 10816-3 / ISO 20816-3 vibration zones                            */
/* ------------------------------------------------------------------ */

/**
 * Default zone boundaries, mm/s RMS — ISO 10816-3 group 1 rigid / group 2
 * flexible (A/B 2.3, B/C 4.5, C/D 7.1). D5 Table 9.3 uses B/C and C/D as the
 * alert and alarm limits; sensors with other limits (pinion 5.6 / 9.0) use
 * their own and have no defined A/B boundary.
 */
export const ISO_AB = 2.3;
export const ISO_BC = 4.5;
export const ISO_CD = 7.1;
export type IsoZone = "A" | "B" | "C" | "D";

export interface IsoBounds {
  ab: number | null;
  bc: number;
  cd: number;
  /** True when the boundaries come from the sensor's own alert / alarm limits. */
  fromLimits: boolean;
}

export function isoBounds(s: Pick<DxSensor, "warn" | "alarm">): IsoBounds {
  if (s.warn !== null && s.alarm !== null && s.alarm > s.warn) {
    const std = s.warn === ISO_BC && s.alarm === ISO_CD;
    return { ab: std ? ISO_AB : null, bc: s.warn, cd: s.alarm, fromLimits: true };
  }
  return { ab: ISO_AB, bc: ISO_BC, cd: ISO_CD, fromLimits: false };
}

export function isoZone(mmps: number, b: IsoBounds = { ab: ISO_AB, bc: ISO_BC, cd: ISO_CD, fromLimits: false }): IsoZone {
  if (mmps >= b.cd) return "D";
  if (mmps >= b.bc) return "C";
  if (b.ab !== null && mmps >= b.ab) return "B";
  return b.ab === null ? "B" : "A";
}

export const ISO_ZONE_TEXT: Record<IsoZone, string> = {
  A: "Newly commissioned machine",
  B: "Unrestricted long-term operation",
  C: "Restricted operation — plan action",
  D: "Damage likely — act now",
};

/* ------------------------------------------------------------------ */
/* Sensors                                                              */
/* ------------------------------------------------------------------ */

/**
 * Sensor validity (D5 Table 9.6). `unvalidated` = no live reference model, so
 * the reading carries no validity flag (stored catalog value).
 */
export type Validity = "valid" | "suspect" | "invalid" | "stale" | "unvalidated";

export interface DxSensor {
  tag: string;
  point: string;
  name: string;
  systemId: string;
  subAssembly: string;
  component: string;
  sensorType: string;
  unit: string;
  /** Numeric reading, or null for state signals / non-numeric values. */
  value: number | null;
  display: string;
  /** Expected value from the reference model (live engine only). */
  model: number | null;
  warn: number | null;
  alarm: number | null;
  /** Both sides of a band / |x| limit (engine definition); null for one-sided limits. */
  band: TwoSided | null;
  severity: Severity;
  /** Residual against the reference model, σ (live engine only). */
  z: number | null;
  validity: Validity;
  qualityNote: string | null;
  timeToLimit: string | null;
  isVibration: boolean;
  live: boolean;
  reasons: CatalogSensorView["reasons"];
}

function isNumeric(v: string): boolean {
  return /^-?\d+(\.\d+)?$/.test(v.trim());
}

export function isVibrationSensor(unit: string, sensorType: string, tag: string): boolean {
  return unit.toLowerCase() === "mm/s" || sensorType.toLowerCase().includes("vibrat") || /^VIB|^VE-/.test(tag.toUpperCase());
}

function validityOf(live: CatalogSensorView["live"]): Validity {
  if (!live) return "unvalidated";
  if (live.quality === "Invalid") return /flat|frozen|stale|stuck|held/i.test(live.qualityNote ?? "") ? "stale" : "invalid";
  if (live.quality === "Suspect") return "suspect";
  return "valid";
}

/**
 * DB limits of 0 / 0 mean "not configured". The DB keeps one warning / alarm
 * value each; pass the live machine's `defs` so band limits keep their low side.
 */
export function toDxSensors(sensors: CatalogSensorView[], defs?: PlantDefs | null): DxSensor[] {
  return sensors.map((s) => {
    const live = s.live;
    // Relative limits (pyro D5 Table 9.2) at the live reference model; else the DB pair.
    const defLimit = defs?.signalByTag[s.tag]?.limit;
    const rel = isRelativeLimit(defLimit) ? limitPair({ limit: defLimit }, undefined, live?.model) : null;
    const warn = rel ? rel.warn : Number(s.warningVal);
    const alarm = rel ? rel.alarm : Number(s.alarmVal);
    const configured = Number.isFinite(warn) && Number.isFinite(alarm) && !(warn === 0 && alarm === 0);
    const value = live ? live.value : isNumeric(String(s.value)) ? Number(s.value) : null;
    return {
      tag: s.tag,
      point: s.point,
      name: displayName(s.name),
      systemId: s.systemId,
      subAssembly: s.subAssembly,
      component: s.component,
      sensorType: s.sensorType,
      unit: s.unit,
      value: value !== null && Number.isFinite(value) ? value : null,
      display: live ? live.display : String(s.value),
      model: live?.model ?? null,
      warn: configured ? warn : null,
      alarm: configured ? alarm : null,
      band: twoSided(defLimit, live?.model),
      severity: live ? live.status : s.status,
      z: live?.z ?? null,
      validity: validityOf(live),
      qualityNote: live?.qualityNote ?? null,
      timeToLimit: live?.timeToLimit ?? null,
      isVibration: isVibrationSensor(s.unit, s.sensorType, s.tag),
      live: !!live,
      reasons: s.reasons,
    };
  });
}

/**
 * Live machine without a loaded DB catalog (loading, or the database is
 * unreachable): the engine's own signal list (`frame.defs`) with its frame.
 */
export function dxSensorsFromFrame(frame: SimFrame): DxSensor[] {
  const out: DxSensor[] = [];
  const subs = frame.defs.subassemblies;
  for (const def of frame.defs.signals) {
    const live = frame.signals[def.tag];
    if (!live) continue;
    // limitPair only reads `limit`, which kiln and pyro definitions share.
    const lim = def.type === "analog" ? limitPair(def as SignalDef, undefined, live.model) : null;
    out.push({
      tag: def.tag,
      point: def.point,
      name: displayName(def.name),
      systemId: def.system,
      subAssembly: subs.find((x) => x.id === def.sub)?.name ?? def.sub,
      component: def.instrument,
      sensorType: def.instrument,
      unit: def.unit,
      value: live.value !== null && Number.isFinite(live.value) ? live.value : null,
      display: live.display,
      model: live.model,
      warn: lim?.warn ?? null,
      alarm: lim?.alarm ?? null,
      band: def.type === "analog" ? twoSided(def.limit, live.model) : null,
      severity: live.status,
      z: live.z,
      validity: validityOf(live),
      qualityNote: live.qualityNote,
      timeToLimit: live.timeToLimit,
      isVibration: isVibrationSensor(def.unit, def.instrument, def.tag),
      live: true,
      reasons: [],
    });
  }
  return out;
}

export const VALIDITY_LABEL: Record<Validity, string> = {
  valid: VALIDITY_WORDS.Valid,
  suspect: VALIDITY_WORDS.Suspect,
  invalid: VALIDITY_WORDS.Invalid,
  stale: VALIDITY_WORDS.Stale,
  unvalidated: "Not checked",
};

/** What each validity word means, in everyday words (tooltips next to the word). */
export const VALIDITY_HELP: Record<Validity, string> = {
  valid: "The reading passed its checks and is trusted",
  suspect: "The reading may be wrong: it does not fit what the other readings suggest",
  invalid: "The reading is wrong or out of range and is not used",
  stale: "The sensor has stopped updating: the value is old",
  unvalidated: "There is no live check for this reading",
};

export const VALIDITY_TONE: Record<Validity, Tone> = {
  valid: "good",
  suspect: "warn",
  invalid: "bad",
  stale: "warn",
  unvalidated: "idle",
};

/* ------------------------------------------------------------------ */
/* Alarm lifecycle (live engine)                                        */
/* ------------------------------------------------------------------ */

/**
 * D5 confirmation states mapped onto an ISA-18.2-style lifecycle:
 * confirming (matching, persistence not met) → active → clearing
 * (hysteresis) → cleared; acknowledgement is orthogonal.
 */
export type AlarmState = "confirming" | "active" | "clearing";

export interface DxAlarm {
  ruleId: string;
  name: string;
  category: string;
  where: string;
  severity: Severity;
  priority: RuleState["priority"];
  state: AlarmState;
  acknowledged: boolean;
  persistence: number;
  threshold: number;
  clean: number;
  /** Sim minute the rule was confirmed (active / clearing). */
  since: number | null;
  activeFor: string | null;
  evidence: string;
  tags: string[];
  timeToLimit: string | null;
  confidence: number;
  rule: RuleState;
}

export function alarmStateOf(r: RuleState): AlarmState | null {
  if (r.status === "QUIET") return null;
  if (r.status === "PENDING") return "confirming";
  return r.clean > 0 ? "clearing" : "active";
}

/** Rules acknowledged in the engine's event log since they were last confirmed. */
export function ackedFromEvents(frame: SimFrame): Set<string> {
  const out = new Set<string>();
  const since = new Map(frame.rules.map((r) => [r.id, r.since]));
  for (const e of frame.events) {
    if (e.action?.kind !== "acknowledge") continue;
    const s = since.get(e.action.ruleId);
    if (s === undefined) continue;
    if (s === null || e.t >= s) out.add(e.action.ruleId);
  }
  return out;
}

const SEV_RANK: Record<Severity, number> = { Critical: 0, Alert: 1, Normal: 2 };
const STATE_RANK: Record<AlarmState, number> = { active: 0, clearing: 1, confirming: 2 };
/** Position of a priority id in the DB order (most urgent first); unknown ids, or priorities still loading, sort last. */
function prioRank(id: string | null | undefined, priorities: readonly WorkOrderPriorityDto[] | null): number {
  const i = id && priorities ? priorities.findIndex((p) => p.id === id) : -1;
  return i < 0 ? Number.MAX_SAFE_INTEGER : i;
}

function subNames(subs: string[], defs: PlantDefs): string {
  return subs.map((x) => defs.subassemblies.find((sa) => sa.id === x)?.name ?? x).join(", ");
}

const usefulTtl = (v: string | null | undefined) => (v && v !== "—" ? v : null);

export function buildAlarms(frame: SimFrame, acked: Set<string>, priorities: readonly WorkOrderPriorityDto[] | null): DxAlarm[] {
  const out: DxAlarm[] = [];
  for (const r of frame.rules) {
    const state = alarmStateOf(r);
    if (!state) continue;
    out.push({
      ruleId: r.id,
      name: r.name,
      category: r.category,
      where: subNames(r.subs, frame.defs) || r.system,
      severity: r.severity,
      priority: r.priority,
      state,
      acknowledged: state !== "confirming" && acked.has(r.id),
      persistence: r.persistence,
      threshold: Math.max(1, r.threshold),
      clean: r.clean,
      since: r.since,
      activeFor: r.since !== null && state !== "confirming" ? formatDuration(frame.t - r.since) : null,
      evidence: r.evidence,
      tags: r.tags,
      timeToLimit: usefulTtl(r.timeToLimit),
      confidence: r.confidence,
      rule: r,
    });
  }
  // Critical first, then unacknowledged active, acknowledged, clearing, confirming, then priority.
  return out.sort(
    (a, b) =>
      SEV_RANK[a.severity] - SEV_RANK[b.severity] ||
      STATE_RANK[a.state] - STATE_RANK[b.state] ||
      Number(a.acknowledged) - Number(b.acknowledged) ||
      prioRank(a.priority, priorities) - prioRank(b.priority, priorities) ||
      a.ruleId.localeCompare(b.ruleId),
  );
}

/* ------------------------------------------------------------------ */
/* Findings (fault patterns)                                            */
/* ------------------------------------------------------------------ */

/**
 * active      — rule confirmed (persistence met)
 * clearing    — confirmed, now counting clean samples (hysteresis)
 * confirming  — rule matching, persistence not yet met
 * recorded    — present in the stored AssetIQ record (no live engine)
 * matching    — DB failure-mode signature partly in excursion (no live engine)
 * clear       — checked and not present
 */
export type FindingState = "active" | "clearing" | "confirming" | "recorded" | "matching" | "clear";

export interface Finding {
  key: string;
  ruleId: string | null;
  name: string;
  category: string;
  where: string;
  severity: Severity;
  state: FindingState;
  /** Evidence strength / likelihood, %. */
  probability: number | null;
  /** Where the number comes from, and whether it is calibrated. */
  basis: "Rule engine" | "AssetIQ record" | "Signature match";
  persistence: number;
  threshold: number;
  clean: number;
  activeFor: string | null;
  timeToLimit: string | null;
  priority: "P1" | "P2" | "P3" | "P4" | null;
  evidence: string;
  /** Sensors that fired the rule (or its signature). */
  tags: string[];
  /** Sensors the rule reads (rule library inputs); empty when the rule is not in the machine's library. */
  inputs: string[];
  logic: string | null;
  cause: string | null;
  consequence: string | null;
  action: string | null;
  signature: string | null;
  /** Default action owner (role) when no work order names one. */
  owner?: string | null;
  /** What the evidence does not yet prove. */
  unproven?: string | null;
  /** HOLD disclosure for rules on unapproved channels. */
  hold?: string | null;
}

const F_STATE_RANK: Record<FindingState, number> = { active: 0, clearing: 1, confirming: 2, recorded: 3, matching: 4, clear: 9 };

export const isOpenFinding = (f: Finding) => f.state !== "clear";

export const BASIS_TEXT: Record<Finding["basis"], string> = {
  "Rule engine": "persistence score (sim.): grows with matching samples; not a probability",
  "AssetIQ record": "stored AssetIQ model probability",
  "Signature match": "share of the failure mode's sensors in excursion, not a probability",
};

const RULE_IN_FAULT = /\(((?:R|SW)-[A-Z]+-\d+)\)\s*$/;

function liveFinding(r: RuleState, frame: SimFrame, signature: string | null): Finding {
  const state: FindingState = r.status === "PENDING" ? "confirming" : r.clean > 0 ? "clearing" : "active";
  return {
    key: `rule-${r.id}`,
    ruleId: r.id,
    name: r.name,
    category: r.category,
    where: subNames(r.subs, frame.defs) || r.system,
    severity: r.severity,
    state,
    probability: r.confidence,
    basis: "Rule engine",
    persistence: r.persistence,
    threshold: Math.max(1, r.threshold),
    clean: r.clean,
    activeFor: r.status === "ACTIVE" && r.since !== null ? formatDuration(frame.t - r.since) : null,
    timeToLimit: usefulTtl(r.timeToLimit),
    priority: r.priority,
    evidence: r.evidence,
    tags: r.tags,
    inputs: frame.defs.ruleById[r.id]?.inputs ?? [],
    logic: r.logic,
    cause: r.cause,
    consequence: r.consequence,
    action: r.action,
    signature,
    owner: r.owner ?? null,
    unproven: r.unproven ?? null,
    hold: r.hold ?? null,
  };
}

function recordFinding(f: DiagnosisRecord["findings"][number], i: number, live: boolean, defs: PlantDefs | null): Finding {
  const ruleId = f.fault.match(RULE_IN_FAULT)?.[1] ?? null;
  const rule = ruleId ? defs?.ruleById[ruleId] : undefined;
  const stored = Number(f.probability);
  // With a live engine, a quiet rule is not present whatever the stored record says.
  const present = !live && f.severity !== "Normal";
  return {
    key: `rec-${f.id}-${i}`,
    ruleId,
    name: rule?.name ?? f.fault.replace(RULE_IN_FAULT, "").trim(),
    category: rule?.category ?? "AssetIQ",
    where: f.location,
    severity: present ? f.severity : "Normal",
    state: present ? "recorded" : "clear",
    probability: Number.isFinite(stored) ? stored : null,
    basis: "AssetIQ record",
    persistence: 0,
    threshold: 0,
    clean: 0,
    activeFor: null,
    timeToLimit: null,
    priority: null,
    evidence: f.recommendation,
    tags: [],
    inputs: rule?.inputs ?? [],
    logic: rule?.logic ?? null,
    cause: rule?.cause ?? null,
    consequence: rule?.consequence ?? null,
    action: rule?.action ?? f.recommendation,
    signature: f.frequency || null,
  };
}

/** DB failure-mode library (non-kiln): rules linked to sensors in `mapped_signals.reasons`. */
export interface FaultMode {
  id: string;
  name: string;
  expected: Severity;
  /** Share of the mode's signature sensors in excursion, 0–100 %. */
  score: number;
  signature: string[];
  reason: CatalogSensorView["reasons"][number];
}

export function faultModesFromCatalog(sensors: DxSensor[]): FaultMode[] {
  const byTag = new Map(sensors.map((s) => [s.tag, s]));
  const byRule = new Map<string, { reason: FaultMode["reason"]; tags: string[] }>();
  for (const s of sensors) {
    for (const r of s.reasons) {
      if (!r.ruleId) continue;
      const entry = byRule.get(r.ruleId) ?? { reason: r, tags: [] };
      if (!entry.tags.includes(s.tag)) entry.tags.push(s.tag);
      byRule.set(r.ruleId, entry);
    }
  }
  return Array.from(byRule.entries())
    .map(([id, { reason, tags }]) => {
      const sevs = tags.map((t) => byTag.get(t)?.severity ?? "Normal");
      const expected: Severity = sevs.includes("Critical") ? "Critical" : "Alert";
      // Full weight for a sensor at the expected severity, 0.6 for Alert where Critical is expected.
      const hit = sevs.reduce((acc, sev) => acc + (sev === "Normal" ? 0 : sev === "Critical" || sev === expected ? 1 : 0.6), 0);
      return { id, name: reason.ruleName || id, expected, score: Math.round((hit / tags.length) * 100), signature: tags, reason };
    })
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

/**
 * `defs` names the machine's rule library when there is no frame (stored
 * record, failure-mode library); with a frame, `frame.defs` is used.
 */
export function buildFindings(
  frame: SimFrame | null,
  record: DiagnosisRecord | null,
  modes: FaultMode[],
  sensors: DxSensor[],
  priorities: readonly WorkOrderPriorityDto[] | null,
  defs: PlantDefs | null = frame?.defs ?? null,
): Finding[] {
  const out: Finding[] = [];
  const recordSig = new Map<string, string>();
  for (const f of record?.findings ?? []) {
    const id = f.fault.match(RULE_IN_FAULT)?.[1];
    if (id && f.frequency) recordSig.set(id, f.frequency);
  }

  if (frame) {
    for (const r of frame.rules) {
      if (r.status === "QUIET") continue;
      out.push(liveFinding(r, frame, recordSig.get(r.id) ?? null));
    }
  } else {
    const byTag = new Map(sensors.map((s) => [s.tag, s]));
    const listed = new Set<string>();
    (record?.findings ?? []).forEach((f, i) => {
      const finding = recordFinding(f, i, false, defs);
      if (finding.ruleId) listed.add(finding.ruleId);
      out.push(finding);
    });
    for (const m of modes) {
      if (m.score === 0 || listed.has(m.id)) continue;
      const hot = m.signature.filter((t) => (byTag.get(t)?.severity ?? "Normal") !== "Normal");
      out.push({
        key: `mode-${m.id}`,
        ruleId: m.id,
        name: m.name,
        category: "Failure-mode library",
        where: Array.from(new Set(hot.map((t) => byTag.get(t)?.subAssembly).filter(Boolean))).join(", "),
        severity: m.expected,
        state: "matching",
        probability: m.score,
        basis: "Signature match",
        persistence: 0,
        threshold: 0,
        clean: 0,
        activeFor: null,
        timeToLimit: null,
        priority: null,
        evidence: m.reason.symptomSignature,
        tags: hot,
        inputs: defs?.ruleById[m.id]?.inputs ?? [],
        logic: m.reason.mechanism || null,
        cause: m.reason.primaryCause || null,
        consequence: m.reason.consequence || null,
        action: m.reason.prescriptiveAction || null,
        signature: null,
      });
    }
  }

  return out.sort(
    (a, b) =>
      F_STATE_RANK[a.state] - F_STATE_RANK[b.state] ||
      SEV_RANK[a.severity] - SEV_RANK[b.severity] ||
      prioRank(a.priority, priorities) - prioRank(b.priority, priorities) ||
      (b.probability ?? -1) - (a.probability ?? -1),
  );
}

/** Sensors a rule reads (the machine's rule-library inputs). */
export function ruleInputs(ruleId: string, defs: PlantDefs | null | undefined): string[] {
  return defs?.ruleById[ruleId]?.inputs ?? [];
}

/**
 * Alternative explanations for a finding (Fault Diagnosis spec: "reports
 * supported alternatives instead of assuming one confirmed cause"): other
 * open rules reading the same evidence, and a sensor error when an evidence
 * sensor is suspect / invalid (D5 Table 9.6).
 */
export function alternativesFor(f: Finding, open: Finding[], byTag: Map<string, DxSensor>): string[] {
  const out: string[] = [];
  const tags = new Set(f.tags);
  for (const o of open) {
    if (o.key === f.key || !o.ruleId) continue;
    const shared = (o.tags.length ? o.tags : o.inputs).filter((t) => tags.has(t));
    if (shared.length) out.push(`${o.ruleId} ${o.name} (${o.state}) also reads ${shared.slice(0, 2).join(", ")}${shared.length > 2 ? "…" : ""}`);
  }
  const bad = f.tags.filter((t) => {
    const v = byTag.get(t)?.validity;
    return v === "suspect" || v === "invalid" || v === "stale";
  });
  if (bad.length) out.push(`Sensor error (R-DQ-02): ${bad.join(", ")} flagged by sensor validation`);
  return out;
}

/* ------------------------------------------------------------------ */
/* Alarm response window                                                */
/* ------------------------------------------------------------------ */

/** Response time left for a raised alarm (its priority's DB response time, sim minutes), or "overdue"; null while priorities load. */
export function responseLeft(a: DxAlarm, t: number, priorities: readonly WorkOrderPriorityDto[] | null): string | null {
  const due = priorities?.find((p) => p.id === a.priority)?.responseMinutes;
  if (!due || a.since === null || a.state === "confirming") return null;
  const left = due - (t - a.since);
  return left <= 0 ? "overdue" : formatDuration(left);
}

/* ------------------------------------------------------------------ */
/* Stored AssetIQ record                                                */
/* ------------------------------------------------------------------ */

/** Latest `diagnosis_records` row for one machine (`/api/diagnosis`), or null when none is stored. */
export function useDiagnosisRecord(machineId: string, enabled = true): { record: DiagnosisRecord | null; loading: boolean; failed: boolean } {
  const { data, isLoading, error } = useApi<DiagnosisRecord[]>(enabled ? `/api/diagnosis?machineId=${encodeURIComponent(machineId)}` : null);
  if (!enabled) return { record: null, loading: false, failed: false };
  const rows = Array.isArray(data) ? data : [];
  return { record: rows[rows.length - 1] ?? null, loading: isLoading, failed: error !== null };
}
