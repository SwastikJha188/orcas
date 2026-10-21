"use client";

/**
 * Diagnosis sensor rows: every mapped sensor of the machine, in catalog order,
 * with the faults it is evidence for. A fault (condition rule) is a candidate
 * on a sensor's row when the rule fired on that sensor, or reads it and the
 * sensor is off-normal. Rows and faults keep a fixed (definition) order.
 *
 * Match % is evidence coverage, not a calibrated probability: of the sensors
 * the rule reads that are trusted (not invalid / stale), the share that are
 * off-normal now (fired by the rule, outside a limit, or |z| ≥ 3). A firing
 * rule is scored at the sub-assemblies it fired on.
 */

import type { ClearedAlarm } from "@shared/lib/alarm-journal";
import type { SimFrame } from "@shared/lib/kiln-sim/engine";
import { isConditionRule, type PlantDefs } from "@shared/lib/plant-defs";
import { alarmStateOf, faultModesFromCatalog, type AlarmState, type DxSensor } from "./diagnosis-model";
import { twoSided } from "./sensor-gauge";

/** Residual beyond which a valid reading counts as off-normal (Analysis → Detection uses the same). */
export const Z_OFF = 3;

export interface FaultCandidate {
  ruleId: string;
  /** Plain-language headline when the rule has one (docs/plain-language.md), else the engineering name. */
  name: string;
  /** Engineering rule name (tooltip / details). */
  engName: string;
  where: string;
  /** Null while the rule is quiet: a candidate only through its evidence. */
  state: AlarmState | null;
  persistence: number;
  threshold: number;
  clean: number;
  acknowledged: boolean;
  /** Sim minute the rule was confirmed. */
  since: number | null;
  /** Quiet now, with an occurrence nobody acknowledged (returned to normal, unacknowledged). */
  cleared: boolean;
  /** Plant clock (ms) that occurrence cleared, once the journal has it. */
  clearedAt: number | null;
  /** This row's sensor is one the rule fired on. */
  fired: boolean;
  /** Share of the rule's trusted input sensors that are off-normal now, 0–100. */
  match: number;
  matched: number;
  of: number;
}

export interface SensorRow {
  s: DxSensor;
  /** Beyond its alarm limit, or evidence for a raised fault. */
  inAlarm: boolean;
  /** Sim minute the row went into alarm, when the engine recorded it. */
  since: number | null;
  /** Alarm-limit severity alone (no escalation by findings). */
  beyondAlarm: boolean;
  faults: FaultCandidate[];
}

export const isRaised = (st: AlarmState | null): boolean => st === "active" || st === "clearing";

/**
 * Fixed sensor order: the machine's definitions (sub-assembly order, then
 * signal order), never load state or live values. The DB catalog comes back by tag
 * and the engine by definition, so both are put in definition order; sensors
 * the definitions do not list follow by tag.
 */
export function inDefinitionOrder(sensors: DxSensor[], defs: PlantDefs | null): DxSensor[] {
  const subAt = new Map((defs?.subassemblies ?? []).map((sa, i) => [sa.id, i]));
  const n = defs?.signals.length ?? 0;
  // Sub-assembly first (so Where reads in blocks), then the signal's place in the definitions.
  const idx = new Map((defs?.signals ?? []).map((d, i) => [d.tag, (subAt.get(d.sub) ?? n) * (n + 1) + i]));
  const at = (t: string) => idx.get(t) ?? Number.MAX_SAFE_INTEGER;
  return [...sensors].sort((a, b) => at(a.tag) - at(b.tag) || a.tag.localeCompare(b.tag));
}

const trusted = (s: DxSensor | undefined): s is DxSensor => !!s && s.validity !== "invalid" && s.validity !== "stale";

export function isOffNormal(s: DxSensor | undefined): boolean {
  if (!trusted(s)) return false;
  return s.severity !== "Normal" || (s.z !== null && Math.abs(s.z) >= Z_OFF);
}

function subNames(subs: string[], defs: PlantDefs): string {
  return subs.map((x) => defs.subassemblies.find((sa) => sa.id === x)?.name ?? x).join(", ");
}

/** Is a reading beyond the sensor's alarm limit (band sides, else the one-sided DB pair)? */
function beyondAlarm(s: DxSensor, v: number, frame: SimFrame): boolean {
  const band = s.band ?? twoSided(frame.defs.signalByTag[s.tag]?.limit, s.model);
  if (band) return (band.alarmLo !== undefined && v <= band.alarmLo) || (band.alarmHi !== undefined && v >= band.alarmHi);
  if (s.alarm === null) return false;
  return s.warn !== null && s.alarm < s.warn ? v <= s.alarm : v >= s.alarm;
}

/**
 * When the sensor went beyond its alarm limit: the engine's limit event when it
 * is still in the (60-event) log, else the start of the current excursion in
 * the 6 h history.
 */
function limitOnset(frame: SimFrame, s: DxSensor): number | null {
  for (const e of frame.events) {
    if (e.kind !== "limit" || !e.detail.startsWith(`${s.tag} `)) continue;
    // Newest first: the latest limit event for this tag decides.
    if (e.severity === "Critical" && e.title.includes("beyond")) return e.t;
    break;
  }
  const h = frame.history[s.tag];
  if (!h || h.length !== frame.times.length || !beyondAlarm(s, h[h.length - 1], frame)) return null;
  let i = h.length - 1;
  while (i > 0 && beyondAlarm(s, h[i - 1], frame)) i--;
  // Beyond for the whole window: the onset is older than the history.
  return i === 0 ? null : frame.times[i];
}

/**
 * `cleared`: alarms back to normal that nobody acknowledged (from the alarm
 * journal). They stay on the row of the sensor that triggered them.
 */
export function buildSensorRows(
  sensors: DxSensor[],
  frame: SimFrame | null,
  acked: Set<string>,
  cleared: Map<string, ClearedAlarm> = new Map(),
): SensorRow[] {
  const byTag = new Map(sensors.map((s) => [s.tag, s]));
  const byRow = new Map<string, FaultCandidate[]>();
  const add = (tag: string, c: FaultCandidate) => byRow.set(tag, [...(byRow.get(tag) ?? []), c]);

  if (frame) {
    const live = new Map(frame.rules.map((r) => [r.id, r]));
    for (const def of frame.defs.rules) {
      if (!isConditionRule(def)) continue;
      const r = live.get(def.id);
      const state = r ? alarmStateOf(r) : null;
      const fired = new Set(state && r ? r.tags : []);
      const inputs = Array.from(new Set([...(def.inputs.length ? def.inputs : []), ...fired]));
      // A rule over several stations (roller temperatures 1–4) fires on one: score it
      // against the inputs at the sub-assemblies it fired on, not every station it reads.
      const liveSubs = state && r?.subs?.length && r.subs.length < def.subs.length ? new Set(r.subs) : null;
      const scope = liveSubs ? inputs.filter((t) => fired.has(t) || liveSubs.has(frame.defs.signalByTag[t]?.sub ?? "")) : inputs;
      const valid = scope.filter((t) => trusted(byTag.get(t)));
      const matched = valid.filter((t) => fired.has(t) || isOffNormal(byTag.get(t))).length;
      // Confirming again counts too: the earlier occurrence is still waiting for an acknowledgement.
      const done = isRaised(state) ? null : (cleared.get(def.id) ?? null);
      const trigger = done ? (done.triggerTag ?? inputs[0] ?? null) : null;
      for (const tag of trigger && !inputs.includes(trigger) ? [...inputs, trigger] : inputs) {
        add(tag, {
          ruleId: def.id,
          name: def.plainTitle || def.name,
          engName: def.name,
          where: subNames(r?.subs?.length ? r.subs : def.subs, frame.defs) || def.system,
          state,
          persistence: r?.persistence ?? 0,
          threshold: Math.max(1, r?.threshold ?? 1),
          clean: r?.clean ?? 0,
          acknowledged: state !== null && state !== "confirming" && acked.has(def.id),
          since: r?.since ?? null,
          cleared: done !== null,
          clearedAt: done?.clearedAt ?? null,
          fired: fired.has(tag) || tag === trigger,
          match: valid.length ? Math.round((matched / valid.length) * 100) : 0,
          matched,
          of: valid.length,
        });
      }
    }
  } else {
    // No live engine: the DB failure-mode library (sensor reasons) and its signature share.
    for (const m of faultModesFromCatalog(sensors)) {
      const hot = m.signature.filter((t) => isOffNormal(byTag.get(t))).length;
      for (const tag of m.signature) {
        add(tag, {
          ruleId: m.id,
          name: m.name,
          engName: m.name,
          where: byTag.get(tag)?.subAssembly ?? "",
          state: null,
          persistence: 0,
          threshold: 1,
          clean: 0,
          acknowledged: false,
          since: null,
          cleared: false,
          clearedAt: null,
          fired: false,
          match: m.score,
          matched: hot,
          of: m.signature.length,
        });
      }
    }
  }

  const ruleIdx = new Map((frame?.defs.rules ?? []).map((r, i) => [r.id, i]));
  const ruleAt = (id: string) => ruleIdx.get(id) ?? Number.MAX_SAFE_INTEGER;

  return sensors.map((s) => {
    const off = isOffNormal(s);
    // Only sensors that carry evidence list faults: fired by the rule, or off-normal themselves.
    const faults = (byRow.get(s.tag) ?? [])
      .filter((c) => c.fired || (off && c.match > 0))
      // Fixed order (rule library order): lines never swap as states or match % change.
      .sort((a, b) => ruleAt(a.ruleId) - ruleAt(b.ruleId) || a.ruleId.localeCompare(b.ruleId));
    // An invalid or stale reading beyond a limit is an instrument problem (Validity), not an alarm.
    const limitHit = trusted(s) && (frame ? frame.signals[s.tag]?.limitSeverity === "Critical" : s.severity === "Critical");
    const raisedOn = faults.filter((f) => isRaised(f.state) && f.fired);
    const inAlarm = limitHit || raisedOn.length > 0;
    const onsets = [
      ...raisedOn.map((f) => f.since).filter((t): t is number => t !== null),
      ...(frame && limitHit ? [limitOnset(frame, s)].filter((t): t is number => t !== null) : []),
    ];
    return { s, inAlarm, beyondAlarm: limitHit, since: inAlarm && onsets.length ? Math.min(...onsets) : null, faults };
  });
}

/**
 * Page totals: raised condition alarms, unacknowledged ones, rules still
 * confirming, untrusted sensors. Unacknowledged counts alarm points, raised
 * or already cleared (ISA-18.2 "returned to normal, unacknowledged").
 */
export function diagnosisTotals(
  frame: SimFrame | null,
  acked: Set<string>,
  sensors: DxSensor[],
  cleared: Map<string, ClearedAlarm> = new Map(),
  /** Only rules this keeps (a part's rules); all when omitted. */
  ruleIn: (ruleId: string) => boolean = () => true,
) {
  const states = (frame?.rules ?? []).filter((r) => isConditionRule(r) && ruleIn(r.id)).map((r) => ({ id: r.id, state: alarmStateOf(r), critical: r.severity === "Critical" }));
  const raised = states.filter((x) => isRaised(x.state));
  const raisedIds = new Set(raised.map((x) => x.id));
  const activeUnacked = raised.filter((x) => !acked.has(x.id)).length;
  const clearedUnacked = Array.from(cleared.keys()).filter((id) => ruleIn(id) && !raisedIds.has(id)).length;
  return {
    active: raised.length,
    /** Raised problems at Critical: the problem totals read Critical only then, otherwise Alert. */
    critical: raised.filter((x) => x.critical).length,
    unacked: activeUnacked + clearedUnacked,
    activeUnacked,
    clearedUnacked,
    confirming: states.filter((x) => x.state === "confirming").length,
    invalid: sensors.filter((s) => s.validity === "invalid" || s.validity === "stale").length,
    stale: sensors.filter((s) => s.validity === "stale").length,
    suspect: sensors.filter((s) => s.validity === "suspect").length,
  };
}
