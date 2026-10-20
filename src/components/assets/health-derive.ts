/**
 * Machine health · pure derivations (no React). Shown on Diagnosis (the former Health page).
 *
 * Live machines (kiln-sim / pyro-sim engines) — the health roll-up is
 * reconstructed term by term from the same frame the engine scored, so every
 * point subtracted can be named:
 *
 *   sub-assembly raw  = clamp(99 − Σ penalties, 12, 99), shown smoothed (EMA 0.35)
 *     residual        min(12, max(0, |z| − 3.0) × 1.4)   per Good-quality signal
 *     absolute limit  9 (Alert) · 22 (Critical)       per Good-quality signal
 *     rule            4 pending · 13 active · 30 active Critical, on every
 *                     sub-assembly the rule covers (data-quality and
 *                     unclassified-anomaly rules subtract nothing)
 *   system            ½ · mean(sub-assemblies) + ½ · min(sub-assemblies)
 *   machine           ½ · mean(scored systems) + ½ · min(scored systems)
 *   bands             from the machine's health model (DB, `useHealthBands`)
 *
 * Signals of Suspect / Invalid quality are excluded from the score (they
 * lower input coverage instead). Process-context systems (`scored: false` in
 * `frame.defs.systems`, e.g. PRC-KLN-01) are shown but carry no health score
 * (D5 Table 4.1). The same roll-up serves every live machine (kiln-seal fleet
 * and pyro line): signals, sub-assemblies and systems come from `frame.defs`.
 *
 * Other machines read the stored DB catalog: scores and statuses only; no
 * decomposition, history or quality data exist, and the page says so.
 */
import type { LiveSignal, RuleState, SimFrame } from "@/lib/kiln-sim/engine";
import { describeLimit, limitNum, type Severity } from "@/lib/kiln-sim/signals";
import type { DefSignal } from "@/lib/plant-defs";
import type { Tone } from "./assets-shell-ui";
import type { MachineCatalog } from "./use-machine-catalog";
import { isConditionRule } from "@/lib/plant-defs";
import type { HealthBands } from "@/lib/reference-data";

export const HEALTH_SECTIONS = {
  summary: "hl-summary",
  breakdown: "hl-breakdown",
  trend: "hl-trend",
  register: "hl-register",
  indicators: "hl-indicators",
  drivers: "hl-drivers",
  quality: "hl-quality",
} as const;

/** sessionStorage key another page can set to open Health at a section id. */
export const HEALTH_ANCHOR_KEY = "ultron.health.anchor";

export type Band = "Healthy" | "Alert" | "Critical";

/** Band of a score under the machine's health-model bands; null while the bands are unknown. */
export function bandOf(score: number, bands: HealthBands | null): Band | null {
  if (!bands) return null;
  if (score < bands.critical) return "Critical";
  if (score < bands.advisory) return "Alert";
  return "Healthy";
}

export const sevTone = (s: Severity | Band | string): Tone =>
  s === "Critical" ? "bad" : s === "Alert" || s === "Maintenance" ? "warn" : "good";

export const bandTone = (score: number | null, bands: HealthBands | null): Tone => {
  const band = score === null ? null : bandOf(score, bands);
  return band === null ? "idle" : sevTone(band);
};

export function signed(n: number, digits = 0): string {
  const v = Number(n.toFixed(digits));
  if (v === 0) return "0";
  return `${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(digits)}`;
}

export function toNum(v: number | string | null | undefined): number | null {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : null;
}

/* ------------------------------------------------------------------ */
/* Model                                                               */
/* ------------------------------------------------------------------ */

export type ContributionKind = "residual" | "limit" | "rule";

export interface Contribution {
  id: string;
  kind: ContributionKind;
  subId: string;
  subName: string;
  systemId: string;
  points: number;
  /** Short label: tag or rule id + name. */
  label: string;
  /** One-line measurement / evidence summary. */
  detail: string;
  severity: Severity;
  /** How the points were computed. */
  formula: string;
  tag?: string;
  rule?: RuleState;
}

export interface IndicatorRow {
  tag: string;
  name: string;
  unit: string;
  subId: string;
  subName: string;
  systemId: string;
  value: string;
  model: string | null;
  residual: string | null;
  z: number | null;
  limits: string;
  limitSeverity: Severity;
  /** The limit branch that fired (pyro relative limits, e.g. "+ 14 % over model"). */
  limitNote?: string | null;
  status: Severity;
  quality: "Good" | "Suspect" | "Invalid" | null;
  qualityNote: string | null;
  slope: string | null;
  calculated: boolean;
  /** Points this signal subtracts from its sub-assembly now (null = not scored / unknown). */
  points: number | null;
}

export interface SubNode {
  id: string;
  name: string;
  systemId: string;
  systemName: string;
  health: number | null;
  /** Unsmoothed score of the current sample (kiln only). */
  raw: number | null;
  penalty: number | null;
  status: Severity;
  criticality: string;
  scored: boolean;
  sensors: number;
  sensorsOff: number;
  excluded: number;
  findingsActive: number;
  findingsPending: number;
  worst: IndicatorRow | null;
}

export interface SystemNode {
  id: string;
  name: string;
  scored: boolean;
  health: number | null;
  status: Severity;
  mean: number | null;
  min: number | null;
  subs: SubNode[];
}

export interface QualityModel {
  total: number;
  valid: number;
  suspect: number;
  invalid: number;
  held: number;
  /** Signals excluded from scored sub-assemblies. */
  excludedScored: number;
  scoredTotal: number;
  rows: IndicatorRow[];
  dqRules: RuleState[];
}

export interface HealthModel {
  basis: "live" | "stored" | "none";
  systems: SystemNode[];
  subs: SubNode[];
  indicators: IndicatorRow[];
  contributions: Contribution[] | null;
  quality: QualityModel | null;
  /** Mean / min of scored systems (kiln) for the machine roll-up. */
  rollup: { mean: number; min: number; value: number } | null;
}

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

function fix(v: number, d: number): string {
  return v.toLocaleString("en-GB", { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function limitText(def: DefSignal, ref?: number | null): string {
  const l = def.limit;
  if (!l) {
    if (def.states) {
      const bad = [...(def.states.warn ?? []), ...(def.states.alarm ?? [])];
      return bad.length ? `${def.states.normal} · alarm ${bad.join(" / ")}` : def.states.normal;
    }
    return "—";
  }
  switch (l.kind) {
    case "hi":
      return `≥ ${l.warn} / ≥ ${l.alarm}`;
    case "lo":
      return `≤ ${l.warn} / ≤ ${l.alarm}`;
    case "abs":
      return `|x| ≥ ${l.warn} / ≥ ${l.alarm}`;
    case "band": {
      const w = [l.warnLo !== undefined ? `≤ ${l.warnLo}` : null, l.warnHi !== undefined ? `≥ ${l.warnHi}` : null].filter(Boolean).join(" or ");
      const a = [l.alarmLo !== undefined ? `≤ ${l.alarmLo}` : null, l.alarmHi !== undefined ? `≥ ${l.alarmHi}` : null].filter(Boolean).join(" or ");
      return `${w || "—"} / ${a || "—"}`;
    }
    case "setpoint":
      return `± ${l.warnPct} % / ± ${l.alarmPct} % of SP`;
    default: {
      // Relative limits (pyro line, D5 Table 9.2): the logic, and the reference it is judged against now.
      const d = describeLimit(l, def.unit);
      return `${d.warning} / ${d.alarm}${ref !== null && ref !== undefined ? ` · ref. ${limitNum(ref)}` : ""}`;
    }
  }
}

const residualPoints = (z: number | null) => (z === null ? 0 : Math.min(12, Math.max(0, Math.abs(z) - 3.0) * 1.4));
const limitPoints = (s: Severity) => (s === "Critical" ? 22 : s === "Alert" ? 9 : 0);
const rulePoints = (r: RuleState) => (r.status === "PENDING" ? 4 : r.severity === "Critical" ? 30 : 13);
const scoringRule = (r: RuleState) => r.status !== "QUIET" && isConditionRule(r);

/* ------------------------------------------------------------------ */
/* Live engine (kiln-seal fleet and pyro line, from `frame.defs`)      */
/* ------------------------------------------------------------------ */

function indicatorFromSignal(def: DefSignal, sg: LiveSignal, subName: string, scoredSys: Set<string>): IndicatorRow {
  const d = def.decimals;
  const scored = sg.quality === "Good";
  return {
    tag: def.tag,
    name: def.name,
    unit: def.unit === "state" ? "" : def.unit,
    subId: def.sub,
    subName,
    systemId: def.system,
    value: sg.display,
    model: sg.model === null ? null : fix(sg.model, d),
    residual: sg.residual === null ? null : `${signed(sg.residual, d)}`,
    z: sg.z,
    limits: limitText(def, sg.model),
    limitSeverity: sg.limitSeverity,
    limitNote: sg.limitNote ?? null,
    status: sg.status,
    quality: sg.quality,
    qualityNote: sg.qualityNote,
    slope: sg.slopePerHour === null || Math.abs(sg.slopePerHour) < 10 ** -d ? null : `${signed(sg.slopePerHour, d)} /h`,
    calculated: Boolean(def.calculated),
    points: scored && scoredSys.has(def.system) ? Math.round((residualPoints(sg.z) + limitPoints(sg.limitSeverity)) * 10) / 10 : null,
  };
}

/** Health model of any live machine; definitions come from `frame.defs`. */
export function kilnHealthModel(frame: SimFrame, catalog: MachineCatalog): HealthModel {
  const { signals: defSignals, subassemblies: defSubs, systems: defSystems } = frame.defs;
  const subName = new Map(defSubs.map((s) => [s.id, s.name]));
  const subSystem = new Map(defSubs.map((s) => [s.id, s.system]));
  const sysName = new Map(defSystems.map((s) => [s.id, s.name]));
  const scoredSys = new Set(defSystems.filter((s) => s.scored).map((s) => s.id));
  const crit = new Map(catalog.subassemblies.map((s) => [s.subassemblyId, s.criticality]));

  const indicators: IndicatorRow[] = defSignals.filter((d) => frame.signals[d.tag]).map((d) =>
    indicatorFromSignal(d, frame.signals[d.tag], subName.get(d.sub) ?? d.sub, scoredSys),
  );

  const contributions: Contribution[] = [];
  for (const row of indicators) {
    if (row.quality !== "Good" || !scoredSys.has(row.systemId)) continue;
    const rp = residualPoints(row.z);
    if (rp > 0.05) {
      contributions.push({
        id: `res:${row.tag}`,
        kind: "residual",
        subId: row.subId,
        subName: row.subName,
        systemId: row.systemId,
        points: rp,
        label: row.tag,
        detail: `${row.name} ${row.z !== null ? `${signed(row.z, 1)}σ` : ""} from reference model`,
        severity: Math.abs(row.z ?? 0) >= 6 ? "Critical" : "Alert",
        formula: `min(12, (|z| − 3.0) × 1.4) with z = ${row.z !== null ? row.z.toFixed(2) : "—"} → ${rp.toFixed(1)} pts. Measured ${row.value}${row.unit ? ` ${row.unit}` : ""}, model ${row.model ?? "—"}${row.unit ? ` ${row.unit}` : ""}, residual ${row.residual ?? "—"}.`,
        tag: row.tag,
      });
    }
    const lp = limitPoints(row.limitSeverity);
    if (lp > 0) {
      contributions.push({
        id: `lim:${row.tag}`,
        kind: "limit",
        subId: row.subId,
        subName: row.subName,
        systemId: row.systemId,
        points: lp,
        label: row.tag,
        detail: `${row.name} beyond ${row.limitSeverity === "Critical" ? "alarm" : "warning"} limit (${row.value}${row.unit ? ` ${row.unit}` : ""}${row.limitNote ? ` · ${row.limitNote}` : ""})`,
        severity: row.limitSeverity,
        formula: `Limit (warning / alarm ${row.limits}) → ${lp} pts for ${row.limitSeverity === "Critical" ? "alarm" : "warning"}.`,
        tag: row.tag,
      });
    }
  }
  for (const r of frame.rules) {
    if (!scoringRule(r)) continue;
    const covered = r.subs.filter((sid) => scoredSys.has(subSystem.get(sid) ?? ""));
    for (const sid of covered) {
      const pts = rulePoints(r);
      contributions.push({
        id: `rule:${r.id}:${sid}`,
        kind: "rule",
        subId: sid,
        subName: subName.get(sid) ?? sid,
        systemId: subSystem.get(sid) ?? "",
        points: pts,
        label: `${r.id} ${r.name}`,
        detail: r.evidence,
        severity: r.status === "PENDING" ? "Alert" : r.severity,
        formula:
          r.status === "PENDING"
            ? `Pending confirmation (${r.persistence} / ${r.threshold} samples) → 4 pts on each covered sub-assembly.`
            : `Confirmed ${r.severity === "Critical" ? "Critical" : "Alert"} finding → ${pts} pts on each scored sub-assembly it covers (${covered.length}).`,
        rule: r,
        tag: r.tags[0],
      });
    }
  }
  const kindOrder: Record<Contribution["kind"], number> = { rule: 0, limit: 1, residual: 2 };
  const sevOrder: Record<Severity, number> = { Critical: 0, Alert: 1, Normal: 2 };
  contributions.sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind] || sevOrder[a.severity] - sevOrder[b.severity]);

  const subs: SubNode[] = defSubs.map((sa) => {
    const cell = frame.subs[sa.id] as SimFrame["subs"][string] | undefined;
    const rows = indicators.filter((r) => r.subId === sa.id);
    const penalty = contributions.filter((c) => c.subId === sa.id).reduce((a, c) => a + c.points, 0);
    const scored = scoredSys.has(sa.system);
    const sigRank = (r: IndicatorRow) => {
      if (r.status === "Critical" || Math.abs(r.z ?? 0) >= 6) return 0;
      if (r.status === "Alert" || Math.abs(r.z ?? 0) >= 3) return 1;
      return 2;
    };
    const ranked = rows
      .filter((r) => r.quality === "Good" && r.z !== null)
      .sort((a, b) => sigRank(a) - sigRank(b));
    let fa = 0;
    let fp = 0;
    for (const r of frame.rules) {
      if (r.status === "QUIET" || !r.subs.includes(sa.id)) continue;
      if (r.status === "ACTIVE") fa++;
      else fp++;
    }
    return {
      id: sa.id,
      name: sa.name,
      systemId: sa.system,
      systemName: sysName.get(sa.system) ?? sa.system,
      health: scored ? (cell?.health ?? null) : null,
      raw: scored ? Math.round(Math.min(99, Math.max(12, 99 - penalty))) : null,
      penalty: scored ? Math.round(penalty * 10) / 10 : null,
      status: cell?.status ?? "Normal",
      criticality: crit.get(sa.id) ?? (scored ? "A" : "Context"),
      scored,
      sensors: rows.length,
      sensorsOff: rows.filter((r) => r.status !== "Normal").length,
      excluded: rows.filter((r) => r.quality !== "Good").length,
      findingsActive: fa,
      findingsPending: fp,
      worst: ranked[0] ?? null,
    };
  });

  const systems: SystemNode[] = defSystems.map((sy) => {
    const list = subs.filter((s) => s.systemId === sy.id);
    const hs = list.map((s) => frame.subs[s.id]?.health).filter((h): h is number => typeof h === "number");
    const cell = frame.systems[sy.id];
    return {
      id: sy.id,
      name: sy.name,
      scored: sy.scored,
      health: sy.scored ? (cell?.health ?? null) : null,
      status: cell?.status ?? "Normal",
      mean: sy.scored && hs.length ? hs.reduce((a, b) => a + b, 0) / hs.length : null,
      min: sy.scored && hs.length ? Math.min(...hs) : null,
      subs: list,
    };
  });

  const sh = systems.filter((s) => s.scored && s.health !== null).map((s) => s.health as number);
  const rollup = sh.length
    ? { mean: sh.reduce((a, b) => a + b, 0) / sh.length, min: Math.min(...sh), value: frame.overall }
    : null;

  const scoredRows = indicators.filter((r) => scoredSys.has(r.systemId));
  const quality: QualityModel = {
    total: indicators.length,
    valid: frame.pipeline.valid,
    suspect: frame.pipeline.suspect,
    invalid: frame.pipeline.invalid,
    held: frame.pipeline.held,
    excludedScored: scoredRows.filter((r) => r.quality !== "Good").length,
    scoredTotal: scoredRows.length,
    rows: indicators.filter((r) => r.quality !== "Good"),
    dqRules: frame.rules.filter((r) => r.status !== "QUIET" && (r.category === "Data quality" || r.category === "Anomaly")),
  };

  return { basis: "live", systems, subs, indicators, contributions, quality, rollup };
}

/* ------------------------------------------------------------------ */
/* Stored DB catalog (non-kiln machines)                               */
/* ------------------------------------------------------------------ */

export function storedHealthModel(catalog: MachineCatalog): HealthModel {
  if (!catalog.isLive || catalog.subassemblies.length === 0) {
    return { basis: catalog.isLive ? "stored" : "none", systems: [], subs: [], indicators: [], contributions: null, quality: null, rollup: null };
  }
  const sysName = new Map(catalog.systems.map((s) => [s.systemId, s.name]));
  const indicators: IndicatorRow[] = catalog.sensors.map((s) => ({
    tag: s.tag,
    name: s.name,
    unit: s.unit,
    subId: s.subassemblyId,
    subName: s.subAssembly,
    systemId: s.systemId,
    value: s.value,
    model: null,
    residual: null,
    z: null,
    limits: s.warningThreshold || s.alarmThreshold ? `${s.warningThreshold || "—"} / ${s.alarmThreshold || "—"}` : "—",
    limitSeverity: s.status,
    status: s.status,
    quality: null,
    qualityNote: null,
    slope: null,
    calculated: false,
    points: null,
  }));
  const subs: SubNode[] = catalog.subassemblies.map((sa) => {
    const direct = catalog.sensors.filter((s) => s.subassemblyId === sa.subassemblyId);
    const list = direct.length ? direct : catalog.sensors.filter((s) => (sa.sensorTags ?? []).includes(s.tag));
    const rules = new Set<string>();
    for (const s of list) if (s.status !== "Normal") for (const r of s.reasons) if (r.ruleId) rules.add(r.ruleId);
    const h = toNum(sa.health);
    const worstSensor = list.find((s) => s.status === "Critical") ?? list.find((s) => s.status === "Alert");
    return {
      id: sa.subassemblyId,
      name: sa.shortName || sa.name,
      systemId: sa.systemId,
      systemName: sysName.get(sa.systemId) ?? (sa.systemId || "Unassigned"),
      health: h === null ? null : Math.round(h),
      raw: null,
      penalty: null,
      status: sa.status,
      criticality: sa.criticality,
      scored: sa.criticality !== "Context",
      sensors: list.length,
      sensorsOff: list.filter((s) => s.status !== "Normal").length,
      excluded: 0,
      findingsActive: rules.size,
      findingsPending: 0,
      worst: worstSensor ? (indicators.find((r) => r.tag === worstSensor.tag) ?? null) : null,
    };
  });
  const known = new Set(catalog.systems.map((s) => s.systemId));
  const sysList = [
    ...catalog.systems.map((s) => ({ id: s.systemId, name: s.name, health: toNum(s.health), status: s.status })),
    ...[...new Set(subs.map((s) => s.systemId).filter((id) => !known.has(id)))].map((id) => ({
      id,
      name: id || "Unassigned",
      health: null as number | null,
      status: "Normal" as Severity,
    })),
  ];
  const systems: SystemNode[] = sysList
    .map((sy) => {
      const list = subs.filter((s) => s.systemId === sy.id);
      const hs = list.map((s) => s.health).filter((h): h is number => h !== null);
      return {
        id: sy.id,
        name: sy.name,
        scored: list.some((s) => s.scored),
        health: sy.health === null ? null : Math.round(sy.health),
        status: sy.status,
        mean: hs.length ? hs.reduce((a, b) => a + b, 0) / hs.length : null,
        min: hs.length ? Math.min(...hs) : null,
        subs: list,
      };
    })
    .filter((g) => g.subs.length > 0);
  return { basis: "stored", systems, subs, indicators, contributions: null, quality: null, rollup: null };
}

/* ------------------------------------------------------------------ */
/* Trend events                                                        */
/* ------------------------------------------------------------------ */

export interface TrendEvent {
  index: number;
  t: number;
  title: string;
  severity: Severity;
  raised: boolean;
}

/** Rule raised / cleared events mapped onto the health-history index. */
export function trendEvents(frame: SimFrame): TrendEvent[] {
  const times = frame.times;
  const n = frame.healthHistory.overall.length;
  if (!times.length || n < 2) return [];
  const offset = times.length - n;
  const t0 = times[offset];
  const out: TrendEvent[] = [];
  for (const e of frame.events) {
    if (e.kind !== "rule" || e.t < t0) continue;
    let idx = -1;
    for (let i = offset; i < times.length; i++) {
      if (times[i] >= e.t) {
        idx = i - offset;
        break;
      }
    }
    if (idx < 0) idx = n - 1;
    out.push({ index: idx, t: e.t, title: e.title, severity: e.severity, raised: !/cleared/i.test(e.title) });
  }
  return out;
}
