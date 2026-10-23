/**
 * Server evaluation (Purpose steps 4 and 6–12).
 *
 * Every period it reads the stored readings and the stored configuration and
 * writes what they show:
 *
 *   data assessment   valid / stale / missing / unreliable, per measurement
 *   operating state   recognised from the state criteria, kept as periods
 *   limit check       configured limits with their raise / clear persistence
 *   reference check   accepted reference range for the current state
 *   change            sustained change over the trend window, inside limits
 *   process check     process requirements
 *   rule patterns     active diagnostic rules reported by the analytics module
 *   health index      the machine's configured health model
 *   maintenance hold  a machine out of service for maintenance (service state
 *                     "Maintenance", set by a shutdown) only has its operating
 *                     state followed: no new findings, open ones keep their state
 *
 * Findings open, update and clear; nothing is overwritten, so the history of
 * what was flagged and when stays reviewable. All thresholds, windows and
 * weights come from the database (system_settings, measurement_limits,
 * reference_values, health_model_parameters, …).
 */
import pool, { query } from "@backend/db";
import { evaluateLimit, type LimitContext, type Severity } from "@shared/lib/kiln-sim/signals";
import { limitRuleFromRow, type LimitRow } from "@shared/lib/limit-codec";
import { loadSettings } from "./settings";
import { syncAlertChecks } from "./alert-checks";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** A diagnostic rule's state as the analytics module reports it. */
export interface EngineRuleState {
  machineId: string;
  code: string;
  status: "PENDING" | "ACTIVE";
  severity: Severity;
  evidence: string;
}

type LimitCfg = LimitRow & { pairMeasurementId: string | null; driveMeasurementId: string | null };

interface MeasurementCfg {
  id: string;
  tag: string;
  name: string;
  machineId: string;
  subassemblyId: string;
  systemId: string;
  valueKind: "analog" | "state";
  originId: string;
  unit: string;
  decimals: number;
  rangeLo: number | null;
  rangeHi: number | null;
  publishPeriodS: number | null;
  staleAfterS: number | null;
  sigma: number | null;
  limit: LimitCfg | null;
  states: Map<string, Severity>;
}

interface Sample {
  t: number;
  value: number | null;
  state: string | null;
  quality: string;
  usable: boolean;
}

interface Trend {
  n: number;
  slopePerH: number | null;
  spanH: number;
}

type FindingType =
  | "limit_exceeded"
  | "behaviour_deviation"
  | "sustained_change"
  | "process_requirement"
  | "rule_pattern"
  | "new_operating_condition"
  | "data_unavailable";

interface Desired {
  machineId: string;
  type: FindingType;
  measurementId: string | null;
  ruleId: number | null;
  severity: Severity;
  stateId: number | null;
  referenceSetId: number | null;
  observed: number | null;
  expected: number | null;
  expectedLo: number | null;
  expectedHi: number | null;
  limitValue: number | null;
  change: number | null;
  changeWindowS: number | null;
  dataAssessment: "valid" | "stale" | "missing" | "unreliable";
  summary: string;
}

interface OpenFinding {
  id: number;
  machine_id: string;
  finding_type_id: FindingType;
  measurement_id: string | null;
  rule_id: number | null;
  severity_id: Severity;
}

export interface EvaluationSummary {
  at: string;
  machines: number;
  measurements: number;
  opened: number;
  updated: number;
  cleared: number;
}

const RANK: Record<Severity, number> = { Normal: 0, Alert: 1, Critical: 2 };
const maxSev = (a: Severity, b: Severity): Severity => (RANK[b] > RANK[a] ? b : a);
const minSev = (list: Severity[]): Severity => list.reduce<Severity>((a, b) => (RANK[b] < RANK[a] ? b : a), "Critical");
const fmt = (v: number, d: number) => (Math.round(v * 10 ** d) / 10 ** d).toString();
const keyOf = (machineId: string, type: string, measurementId: string | null, ruleId: number | null) => `${machineId}|${type}|${measurementId ?? ""}|${ruleId ?? 0}`;
const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

/* ------------------------------------------------------------------ */
/* Configuration and data                                              */
/* ------------------------------------------------------------------ */

async function loadMeasurements(): Promise<Map<string, MeasurementCfg>> {
  const res = await query<Record<string, unknown>>(
    `SELECT c.measurement_id, c.tag, c.name, c.machine_id, c.subassembly_id, c.system_id, c.value_kind, c.origin_id,
            COALESCE(c.unit, '') AS unit, c.decimals, c.range_lo, c.range_hi, c.publish_period_s, c.stale_after_s, c.noise_sigma,
            l.kind_id, l.direction, l.warn_value, l.alarm_value, l.warn_lo, l.warn_hi, l.alarm_lo, l.alarm_hi, l.warn_pct, l.alarm_pct,
            l.collapse_pct, l.ratio, l.rise, l.split, pm.tag AS pair_tag, dm.tag AS drive_tag, l.drive_on, l.reference_value,
            l.abs_warn_lo, l.abs_warn_hi, l.abs_alarm_lo, l.abs_alarm_hi, l.rate_per_hour, l.rate_of, l.rate_window,
            l.raise_samples, l.clear_samples, l.basis_normal, l.basis_warning, l.basis_alarm, l.source, l.note, l.approval,
            l.pair_measurement_id, l.drive_measurement_id
       FROM v_measurement_context c
       LEFT JOIN measurement_limits l ON l.measurement_id = c.measurement_id
       LEFT JOIN measurements pm ON pm.id = l.pair_measurement_id
       LEFT JOIN measurements dm ON dm.id = l.drive_measurement_id`,
  );
  const states = await query<{ measurement_id: string; state: string; severity_id: Severity }>("SELECT measurement_id, state, severity_id FROM measurement_states");
  const byM = new Map<string, Map<string, Severity>>();
  for (const s of states.rows) (byM.get(s.measurement_id) ?? byM.set(s.measurement_id, new Map()).get(s.measurement_id)!).set(s.state, s.severity_id);
  const out = new Map<string, MeasurementCfg>();
  for (const r of res.rows) {
    const id = String(r.measurement_id);
    out.set(id, {
      id,
      tag: String(r.tag),
      name: String(r.name),
      machineId: String(r.machine_id),
      subassemblyId: String(r.subassembly_id),
      systemId: String(r.system_id),
      valueKind: r.value_kind as "analog" | "state",
      originId: String(r.origin_id),
      unit: String(r.unit),
      decimals: Number(r.decimals),
      rangeLo: num(r.range_lo),
      rangeHi: num(r.range_hi),
      publishPeriodS: num(r.publish_period_s),
      staleAfterS: num(r.stale_after_s),
      sigma: num(r.noise_sigma),
      states: byM.get(id) ?? new Map(),
      limit: r.kind_id
        ? {
            kind: r.kind_id as LimitRow["kind"],
            direction: (r.direction as LimitRow["direction"]) ?? null,
            warnValue: num(r.warn_value),
            alarmValue: num(r.alarm_value),
            warnLo: num(r.warn_lo),
            warnHi: num(r.warn_hi),
            alarmLo: num(r.alarm_lo),
            alarmHi: num(r.alarm_hi),
            warnPct: num(r.warn_pct),
            alarmPct: num(r.alarm_pct),
            collapsePct: num(r.collapse_pct),
            ratio: num(r.ratio),
            rise: num(r.rise),
            split: num(r.split),
            pairTag: (r.pair_tag as string) ?? null,
            driveTag: (r.drive_tag as string) ?? null,
            driveOn: num(r.drive_on),
            referenceValue: num(r.reference_value),
            absWarnLo: num(r.abs_warn_lo),
            absWarnHi: num(r.abs_warn_hi),
            absAlarmLo: num(r.abs_alarm_lo),
            absAlarmHi: num(r.abs_alarm_hi),
            ratePerHour: num(r.rate_per_hour),
            rateOf: (r.rate_of as LimitRow["rateOf"]) ?? null,
            rateWindow: num(r.rate_window),
            raiseSamples: Number(r.raise_samples),
            clearSamples: Number(r.clear_samples),
            basisNormal: (r.basis_normal as string) ?? null,
            basisWarning: (r.basis_warning as string) ?? null,
            basisAlarm: (r.basis_alarm as string) ?? null,
            source: (r.source as string) ?? null,
            note: (r.note as string) ?? null,
            approval: r.approval as LimitRow["approval"],
            pairMeasurementId: (r.pair_measurement_id as string) ?? null,
            driveMeasurementId: (r.drive_measurement_id as string) ?? null,
          }
        : null,
    });
  }
  return out;
}

/** The last `k` readings of every measurement acquired after `since`, newest first. */
async function loadRecent(k: number, since: Date): Promise<Map<string, Sample[]>> {
  const res = await pool.query<{ measurement_id: string; t: Date; value: number | null; state: string | null; quality_id: string; usable: boolean }>(
    // Per measurement, the newest k rows straight off the primary key (a window function sorts the whole span).
    `SELECT m.id AS measurement_id, r.acquired_at AS t, r.value, r.state, r.quality_id, q.usable
       FROM measurements m
      CROSS JOIN LATERAL (
            SELECT r.acquired_at, r.value, r.state, r.quality_id FROM readings r
             WHERE r.measurement_id = m.id AND r.acquired_at > $1
             ORDER BY r.acquired_at DESC LIMIT $2) r
       JOIN quality_codes q ON q.id = r.quality_id`,
    [since, k],
  );
  const out = new Map<string, Sample[]>();
  for (const r of res.rows) {
    const list = out.get(r.measurement_id) ?? out.set(r.measurement_id, []).get(r.measurement_id)!;
    list.push({ t: r.t.getTime(), value: r.value === null ? null : Number(r.value), state: r.state, quality: r.quality_id, usable: r.usable });
  }
  for (const list of out.values()) list.sort((a, b) => b.t - a.t);
  return out;
}

/** The newest reading of every measurement (any age), to tell "stale" from "never received". */
async function loadLastSeen(): Promise<Map<string, number>> {
  const res = await pool.query<{ measurement_id: string; t: Date | null }>(
    `SELECT m.id AS measurement_id, (SELECT MAX(r.acquired_at) FROM readings r WHERE r.measurement_id = m.id) AS t FROM measurements m`,
  );
  const hourly = await pool.query<{ measurement_id: string; t: Date | null }>(
    `SELECT m.id AS measurement_id, (SELECT MAX(h.hour_start) FROM reading_hourly h WHERE h.measurement_id = m.id) + interval '1 hour' AS t FROM measurements m`,
  );
  const out = new Map<string, number>();
  for (const r of hourly.rows) if (r.t) out.set(r.measurement_id, r.t.getTime());
  for (const r of res.rows) if (r.t) out.set(r.measurement_id, r.t.getTime());
  return out;
}

async function loadTrends(windowH: number): Promise<Map<string, Trend>> {
  const res = await pool.query<{ measurement_id: string; n: string; slope: number | null; span: number | null }>(
    `SELECT r.measurement_id, COUNT(*) AS n,
            regr_slope(r.value, extract(epoch FROM r.acquired_at)) * 3600 AS slope,
            (extract(epoch FROM MAX(r.acquired_at)) - extract(epoch FROM MIN(r.acquired_at))) / 3600 AS span
       FROM readings r JOIN quality_codes q ON q.id = r.quality_id
      WHERE q.usable AND r.value IS NOT NULL AND r.acquired_at > NOW() - make_interval(secs => $1)
      GROUP BY r.measurement_id`,
    [windowH * 3600],
  );
  return new Map(res.rows.map((r) => [r.measurement_id, { n: Number(r.n), slopePerH: r.slope === null ? null : Number(r.slope), spanH: Number(r.span ?? 0) }]));
}

interface StateDef {
  id: number;
  machineId: string;
  code: string;
  name: string;
  running: boolean;
  priority: number;
  criteria: Array<{ measurementId: string; min: number | null; max: number | null }>;
}

async function loadStates(): Promise<Map<string, StateDef[]>> {
  const res = await query<{ id: number; machine_id: string; code: string; name: string; running: boolean; priority: number; measurement_id: string | null; min_value: number | null; max_value: number | null }>(
    `SELECT s.id, s.machine_id, s.code, s.name, s.running, s.priority, c.measurement_id, c.min_value, c.max_value
       FROM operating_states s LEFT JOIN operating_state_criteria c ON c.state_id = s.id
      ORDER BY s.machine_id, s.priority, s.id`,
  );
  const out = new Map<string, StateDef[]>();
  for (const r of res.rows) {
    const list = out.get(r.machine_id) ?? out.set(r.machine_id, []).get(r.machine_id)!;
    let s = list.find((x) => x.id === r.id);
    if (!s) list.push((s = { id: r.id, machineId: r.machine_id, code: r.code, name: r.name, running: r.running, priority: r.priority, criteria: [] }));
    if (r.measurement_id) s.criteria.push({ measurementId: r.measurement_id, min: num(r.min_value), max: num(r.max_value) });
  }
  return out;
}

interface RefSet {
  id: number;
  stateId: number | null;
  name: string;
  values: Map<string, { expected: number | null; lo: number | null; hi: number | null }>;
}

async function loadReferences(): Promise<Map<string, RefSet[]>> {
  const res = await query<{ id: number; machine_id: string; state_id: number | null; name: string; measurement_id: string | null; expected: number | null; lo: number | null; hi: number | null }>(
    `SELECT s.id, s.machine_id, s.state_id, s.name, v.measurement_id, v.expected, v.lo, v.hi
       FROM reference_sets s LEFT JOIN reference_values v ON v.reference_set_id = s.id
      WHERE s.status = 'accepted'`,
  );
  const out = new Map<string, RefSet[]>();
  for (const r of res.rows) {
    const list = out.get(r.machine_id) ?? out.set(r.machine_id, []).get(r.machine_id)!;
    let s = list.find((x) => x.id === r.id);
    if (!s) list.push((s = { id: r.id, stateId: r.state_id, name: r.name, values: new Map() }));
    if (r.measurement_id) s.values.set(r.measurement_id, { expected: num(r.expected), lo: num(r.lo), hi: num(r.hi) });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Checks                                                              */
/* ------------------------------------------------------------------ */

function stateSeverity(m: MeasurementCfg, state: string | null): Severity {
  if (state === null) return "Normal";
  return m.states.get(state) ?? (m.states.size ? "Alert" : "Normal");
}

/** Recognised operating state from the latest usable readings; null when the criteria cannot be judged. */
function recognise(states: StateDef[], recent: Map<string, Sample[]>): StateDef | null {
  for (const s of states) {
    let judged = true;
    let match = true;
    for (const c of s.criteria) {
      const v = recent.get(c.measurementId)?.find((x) => x.usable && x.value !== null)?.value;
      if (v === undefined || v === null) {
        judged = false;
        break;
      }
      if ((c.min !== null && v <= c.min) || (c.max !== null && v > c.max)) match = false;
    }
    if (!judged) return null;
    if (match) return s;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Evaluation                                                          */
/* ------------------------------------------------------------------ */

export async function evaluateFleet(opts: { ruleStates?: EngineRuleState[] } = {}): Promise<EvaluationSummary> {
  const now = Date.now();
  const settings = await loadSettings();
  const need = (k: string) => {
    const v = settings.get(k);
    if (v === undefined) throw new Error(`system setting "${k}" is not configured`);
    return v;
  };
  const publishS = need("readings.publish_period_s");
  const staleFactor = need("readings.stale_factor");
  const devN = need("evaluation.deviation_samples");
  const devClearN = need("evaluation.clear_samples");
  const trendH = need("evaluation.trend_window_h");
  const changeFraction = need("evaluation.change_fraction");
  const changeClearFraction = need("evaluation.change_clear_fraction");
  const minTrendN = need("evaluation.min_trend_samples");
  const unreliableN = need("evaluation.unreliable_samples");
  const stateRaiseN = need("evaluation.state_raise_samples");
  const stateClearN = need("evaluation.state_clear_samples");
  const keepH = need("health.sample_keep_h");

  const measurements = await loadMeasurements();
  let maxLimitN = 1;
  for (const m of measurements.values()) if (m.limit) maxLimitN = Math.max(maxLimitN, m.limit.raiseSamples, m.limit.clearSamples);
  const k = Math.max(maxLimitN, devN, devClearN, unreliableN, stateRaiseN, stateClearN) + 1;
  const periodS = (m: MeasurementCfg) => Math.max(m.publishPeriodS ?? 0, publishS);
  const staleS = (m: MeasurementCfg) => m.staleAfterS ?? periodS(m) * staleFactor;
  let lookbackS = 0;
  for (const m of measurements.values()) lookbackS = Math.max(lookbackS, staleS(m), periodS(m) * (k + 2));
  const [recent, lastSeen, trends, statesByMachine, refsByMachine] = await Promise.all([
    loadRecent(k, new Date(now - lookbackS * 1000)),
    loadLastSeen(),
    loadTrends(trendH),
    loadStates(),
    loadReferences(),
  ]);

  const rules = await query<{ id: number; machine_id: string; code: string; name: string; scored: boolean; enabled: boolean }>(
    `SELECT r.id, r.machine_id, r.code, r.name, c.scored, r.enabled FROM rules r JOIN rule_categories c ON c.id = r.category_id`,
  );
  const ruleByCode = new Map(rules.rows.map((r) => [`${r.machine_id}|${r.code}`, r]));
  const ruleSubs = await query<{ rule_id: number; subassembly_id: string }>("SELECT rule_id, subassembly_id FROM rule_subassemblies");
  const subsOfRule = new Map<number, string[]>();
  for (const r of ruleSubs.rows) (subsOfRule.get(r.rule_id) ?? subsOfRule.set(r.rule_id, []).get(r.rule_id)!).push(r.subassembly_id);
  const requirements = await query<{ id: number; measurement_id: string; state_id: number | null; min_value: number | null; max_value: number | null; description: string }>(
    "SELECT id, measurement_id, state_id, min_value, max_value, description FROM process_requirements",
  );
  const machinesRes = await query<{ id: string; health_model_id: string | null; service_state: string }>("SELECT id, health_model_id, service_state FROM machines");
  // A machine a person took out of service for maintenance (a shutdown) raises nothing new and keeps its open findings.
  const inMaintenance = new Set(machinesRes.rows.filter((m) => m.service_state === "Maintenance").map((m) => m.id));
  const heldMachines = new Set<string>();
  const params = await query<{ model_id: string; key: string; value: number }>("SELECT model_id, key, value FROM health_model_parameters");
  const modelParams = new Map<string, Map<string, number>>();
  for (const p of params.rows) (modelParams.get(p.model_id) ?? modelParams.set(p.model_id, new Map()).get(p.model_id)!).set(p.key, Number(p.value));
  const systems = await query<{ id: string; machine_id: string; scored: boolean }>("SELECT id, machine_id, scored FROM machine_systems");
  const subsRes = await query<{ id: string; system_id: string }>("SELECT id, machine_system_ref_id AS system_id FROM machine_subassemblies");
  const openPeriods = await query<{ machine_id: string; state_id: number; started_at: Date }>("SELECT machine_id, state_id, started_at FROM machine_state_periods WHERE ended_at IS NULL");
  const openPeriod = new Map(openPeriods.rows.map((p) => [p.machine_id, p]));

  const byMachine = new Map<string, MeasurementCfg[]>();
  for (const m of measurements.values()) (byMachine.get(m.machineId) ?? byMachine.set(m.machineId, []).get(m.machineId)!).push(m);

  const desired: Desired[] = [];
  const stateChanges: Array<{ machineId: string; from: StateDef | null; to: StateDef; at: number }> = [];
  const machineScores: Array<{ machineId: string; score: number }> = [];
  const subScores: Array<{ subassemblyId: string; score: number }> = [];
  /** Measurements that could not be judged this cycle: their open findings keep their state (no evidence is not evidence of normal). */
  const unjudged = new Set<string>();

  for (const [machineId, list] of byMachine) {
    const recentOf = (id: string) => recent.get(id) ?? [];
    const firstDesired = desired.length;
    const base = (m: MeasurementCfg) => ({
      machineId,
      measurementId: m.id,
      ruleId: null,
      stateId: null as number | null,
      referenceSetId: null as number | null,
      observed: null as number | null,
      expected: null as number | null,
      expectedLo: null as number | null,
      expectedHi: null as number | null,
      limitValue: null as number | null,
      change: null as number | null,
      changeWindowS: null as number | null,
      dataAssessment: "valid" as Desired["dataAssessment"],
    });

    /* ---- data assessment ---- */
    const assessment = new Map<string, Desired["dataAssessment"]>();
    for (const m of list) {
      if (m.originId === "manual") continue;
      const latest = recentOf(m.id)[0];
      const seen = lastSeen.get(m.id);
      let a: Desired["dataAssessment"] = "valid";
      if (!latest) a = seen === undefined ? "missing" : "stale";
      else if (now - latest.t > staleS(m) * 1000) a = "stale";
      else if (!latest.usable) a = "unreliable";
      assessment.set(m.id, a);
      if (a !== "valid") unjudged.add(m.id);
    }
    const judged = list.filter((m) => assessment.has(m.id));
    const allMissing = judged.length > 0 && judged.every((m) => assessment.get(m.id) === "missing" || assessment.get(m.id) === "stale");
    if (allMissing) {
      const anySeen = judged.some((m) => lastSeen.has(m.id));
      desired.push({
        machineId,
        type: "data_unavailable",
        measurementId: null,
        ruleId: null,
        severity: "Alert",
        stateId: null,
        referenceSetId: null,
        observed: null,
        expected: null,
        expectedLo: null,
        expectedHi: null,
        limitValue: null,
        change: null,
        changeWindowS: null,
        dataAssessment: anySeen ? "stale" : "missing",
        summary: anySeen
          ? "No current readings from any measurement of this machine; condition cannot currently be assessed."
          : "No readings have been received from this machine; condition cannot be assessed.",
      });
    } else {
      for (const m of judged) {
        const a = assessment.get(m.id)!;
        if (a === "valid") continue;
        // An isolated bad sample is not a data finding: it takes this many unusable readings in a row.
        if (a === "unreliable") {
          const run = recentOf(m.id).findIndex((x) => x.usable);
          if (run !== -1 && run < unreliableN) continue;
        }
        const latest = recentOf(m.id)[0];
        const age = latest ? Math.round((now - latest.t) / 1000) : null;
        desired.push({
          ...base(m),
          type: "data_unavailable",
          severity: "Alert",
          dataAssessment: a,
          summary:
            a === "missing"
              ? `${m.name} (${m.tag}): no reading has been received.`
              : a === "stale"
                ? `${m.name} (${m.tag}): the latest reading is ${age === null ? "older than the window" : `${age} s old`}; the value is historical, not current.`
                : `${m.name} (${m.tag}): the latest reading is flagged ${latest?.quality}; it does not support a dependable comparison.`,
        });
      }
    }

    /* ---- operating state ---- */
    const states = statesByMachine.get(machineId) ?? [];
    const state = recognise(states, recent);
    const prevPeriod = openPeriod.get(machineId);
    if (state && (!prevPeriod || prevPeriod.state_id !== state.id)) {
      stateChanges.push({ machineId, from: prevPeriod ? (states.find((s) => s.id === prevPeriod.state_id) ?? null) : null, to: state, at: now });
    }
    const running = state ? state.running : null;

    // Held for maintenance: its operating state is still followed (when it stopped and started), nothing else.
    if (inMaintenance.has(machineId)) {
      desired.length = firstDesired;
      for (const m of list) unjudged.add(m.id);
      heldMachines.add(machineId);
      continue;
    }

    /* ---- reference for the state ---- */
    const refs = refsByMachine.get(machineId) ?? [];
    const ref = state ? (refs.find((r) => r.stateId === state.id) ?? refs.find((r) => r.stateId === null) ?? null) : null;
    if (state && state.running && !ref && !allMissing) {
      desired.push({
        machineId,
        type: "new_operating_condition",
        measurementId: null,
        ruleId: null,
        severity: "Normal",
        stateId: state.id,
        referenceSetId: null,
        observed: null,
        expected: null,
        expectedLo: null,
        expectedHi: null,
        limitValue: null,
        change: null,
        changeWindowS: null,
        dataAssessment: "valid",
        summary: `No accepted reference covers the current operating state (${state.name}). Engineering limits are still checked.`,
      });
    }

    /* ---- per-measurement checks ---- */
    const limitSev = new Map<string, Severity>();
    const latestUsable = (id: string) => recentOf(id).find((x) => x.usable && (x.value !== null || x.state !== null));
    for (const m of list) {
      if (assessment.get(m.id) !== "valid") continue;
      const samples = recentOf(m.id).filter((x) => x.usable);
      const latest = samples[0];
      if (!latest) continue;
      const refVal = ref?.values.get(m.id);

      // Limit check with persistence (raise after N, clear after M).
      let sevs: Severity[] = [];
      let why: string | null = null;
      let limitValue: number | null = null;
      if (m.valueKind === "state") {
        sevs = samples.map((x) => stateSeverity(m, x.state));
      } else if (m.limit) {
        let rule;
        try {
          rule = limitRuleFromRow(m.limit);
        } catch {
          rule = null;
        }
        if (rule) {
          const def = { limit: rule, unit: m.unit };
          const pair = rule.kind === "bearing" ? m.limit.pairMeasurementId : null;
          const drive = rule.kind === "speedRef" ? m.limit.driveMeasurementId : null;
          const trend = trends.get(m.id);
          const ctx: LimitContext = {
            model: refVal?.expected ?? undefined,
            running: running ?? undefined,
            pair: pair ? (latestUsable(pair)?.value ?? undefined) : undefined,
            pairModel: pair ? (ref?.values.get(pair)?.expected ?? undefined) : undefined,
            drive: drive ? (latestUsable(drive)?.value ?? undefined) : undefined,
            rate: () => (trend && trend.n >= minTrendN ? trend.slopePerH : null),
          };
          sevs = samples.map((x) => (x.value === null ? "Normal" : evaluateLimit(def, x.value, ctx).severity));
          const res = latest.value === null ? null : evaluateLimit(def, latest.value, ctx);
          why = res?.why ?? null;
          if (rule.kind === "hi" || rule.kind === "lo" || rule.kind === "abs") limitValue = sevs[0] === "Critical" ? rule.alarm : rule.warn;
        }
      }
      if (sevs.length) {
        const raiseN = m.limit?.raiseSamples ?? stateRaiseN;
        const clearN = m.limit?.clearSamples ?? stateClearN;
        const raised = sevs.length >= raiseN ? minSev(sevs.slice(0, raiseN)) : "Normal";
        const recentMax = sevs.length >= clearN ? sevs.slice(0, clearN).reduce<Severity>((a, b) => maxSev(a, b), "Normal") : sevs[0];
        limitSev.set(m.id, raised);
        // Persistence: a finding is wanted while the raise window holds; an open one stays until the clear window is clean.
        if (raised !== "Normal" || recentMax !== "Normal") {
          const value = latest.value;
          desired.push({
            ...base(m),
            type: "limit_exceeded",
            severity: raised !== "Normal" ? raised : recentMax,
            stateId: state?.id ?? null,
            referenceSetId: ref?.id ?? null,
            observed: value,
            expected: refVal?.expected ?? null,
            expectedLo: refVal?.lo ?? null,
            expectedHi: refVal?.hi ?? null,
            limitValue,
            summary:
              m.valueKind === "state"
                ? (() => {
                    const worst = samples.find((x) => stateSeverity(m, x.state) === (raised !== "Normal" ? raised : recentMax))?.state ?? latest.state;
                    return worst === latest.state ? `${m.name} (${m.tag}) reports ${latest.state}.` : `${m.name} (${m.tag}) reported ${worst}; latest ${latest.state}.`;
                  })()
                : `${m.name} (${m.tag}) is ${value === null ? "—" : `${fmt(value, m.decimals)} ${m.unit}`.trim()}: ${why ?? "configured limit crossed"}.`,
            // Marks findings that only the clear window keeps alive.
            ...(raised === "Normal" ? { holdOnly: true } : {}),
          } as Desired);
        }
      }

      // Reference comparison: sustained departure from the accepted range for this state.
      if (m.valueKind === "analog" && refVal && running && (refVal.lo !== null || refVal.hi !== null)) {
        const outside = (v: number | null) => v !== null && ((refVal.lo !== null && v < refVal.lo) || (refVal.hi !== null && v > refVal.hi));
        const lastN = samples.slice(0, devN);
        const lastClear = samples.slice(0, devClearN);
        const raise = lastN.length >= devN && lastN.every((x) => outside(x.value));
        const hold = lastClear.some((x) => outside(x.value));
        if (raise || hold) {
          const v = latest.value!;
          const side = refVal.hi !== null && v > refVal.hi ? "above" : "below";
          desired.push({
            ...base(m),
            type: "behaviour_deviation",
            severity: "Alert",
            stateId: state?.id ?? null,
            referenceSetId: ref!.id,
            observed: v,
            expected: refVal.expected,
            expectedLo: refVal.lo,
            expectedHi: refVal.hi,
            summary: `${m.name} (${m.tag}) is ${fmt(v, m.decimals)} ${m.unit}, ${side} the accepted range ${refVal.lo ?? "−∞"}–${refVal.hi ?? "∞"} ${m.unit} for ${state!.name.toLowerCase()} (${ref!.name}).`.replace(/\s+\)/, ")"),
            ...(raise ? {} : { holdOnly: true }),
          } as Desired);
        }
      }

      // Sustained change inside the limits over the trend window.
      const trend = trends.get(m.id);
      if (m.valueKind === "analog" && running && trend && trend.n >= minTrendN && trend.slopePerH !== null && refVal && refVal.lo !== null && refVal.hi !== null && refVal.hi > refVal.lo) {
        const change = trend.slopePerH * trend.spanH;
        const width = refVal.hi - refVal.lo;
        const raise = Math.abs(change) >= changeFraction * width;
        const hold = Math.abs(change) >= changeClearFraction * width;
        if ((raise || hold) && (limitSev.get(m.id) ?? "Normal") === "Normal") {
          desired.push({
            ...base(m),
            type: "sustained_change",
            severity: "Alert",
            stateId: state?.id ?? null,
            referenceSetId: ref!.id,
            observed: latest.value,
            expected: refVal.expected,
            expectedLo: refVal.lo,
            expectedHi: refVal.hi,
            change,
            changeWindowS: trend.spanH * 3600,
            summary: `${m.name} (${m.tag}) ${change > 0 ? "rose" : "fell"} ${fmt(Math.abs(change), m.decimals)} ${m.unit} over ${fmt(trend.spanH, 1)} h while still inside its limits.`,
            ...(raise ? {} : { holdOnly: true }),
          } as Desired);
        }
      }
    }

    /* ---- process requirements ---- */
    for (const req of requirements.rows) {
      const m = measurements.get(req.measurement_id);
      if (!m || m.machineId !== machineId || assessment.get(m.id) !== "valid") continue;
      if (req.state_id !== null && state?.id !== req.state_id) continue;
      const v = latestUsable(m.id)?.value;
      if (v === undefined || v === null) continue;
      const lo = num(req.min_value);
      const hi = num(req.max_value);
      if ((lo !== null && v < lo) || (hi !== null && v > hi)) {
        desired.push({
          ...base(m),
          type: "process_requirement",
          severity: "Alert",
          stateId: state?.id ?? null,
          referenceSetId: null,
          observed: v,
          expected: null,
          expectedLo: lo,
          expectedHi: hi,
          limitValue: lo !== null && v < lo ? lo : hi,
          change: null,
          changeWindowS: null,
          dataAssessment: "valid",
          summary: `${m.name} (${m.tag}) is ${fmt(v, m.decimals)} ${m.unit}: ${req.description}.`,
        });
      }
    }

    /* ---- rule patterns from the analytics module ---- */
    const activeRules: Array<{ id: number; severity: Severity; pending: boolean; scored: boolean }> = [];
    for (const rs of opts.ruleStates ?? []) {
      if (rs.machineId !== machineId) continue;
      const rule = ruleByCode.get(`${machineId}|${rs.code}`);
      if (!rule || !rule.enabled) continue;
      activeRules.push({ id: rule.id, severity: rs.severity, pending: rs.status === "PENDING", scored: rule.scored });
      if (rs.status !== "ACTIVE") continue;
      desired.push({
        machineId,
        type: "rule_pattern",
        measurementId: null,
        ruleId: rule.id,
        severity: rs.severity,
        stateId: state?.id ?? null,
        referenceSetId: ref?.id ?? null,
        observed: null,
        expected: null,
        expectedLo: null,
        expectedHi: null,
        limitValue: null,
        change: null,
        changeWindowS: null,
        dataAssessment: "valid",
        summary: rs.evidence ? `${rule.name} (${rule.code}): ${rs.evidence}` : `${rule.name} (${rule.code}) is active.`,
      });
    }

    /* ---- Machine Health Index ---- */
    const model = machinesRes.rows.find((x) => x.id === machineId)?.health_model_id;
    const p = model ? modelParams.get(model) : undefined;
    if (p && !allMissing) {
      const P = (key: string) => {
        const v = p.get(key);
        if (v === undefined) throw new Error(`health model ${model} has no parameter "${key}"`);
        return v;
      };
      const ceiling = P("ceiling");
      const floor = P("floor");
      const subScore = new Map<string, number>();
      const machineSystems = systems.rows.filter((s) => s.machine_id === machineId);
      const sysIds = new Set(machineSystems.map((s) => s.id));
      const subs = subsRes.rows.filter((s) => sysIds.has(s.system_id));
      for (const sub of subs) {
        let penalty = 0;
        for (const m of list) {
          if (m.subassemblyId !== sub.id || assessment.get(m.id) !== "valid") continue;
          const v = latestUsable(m.id)?.value;
          const rv = ref?.values.get(m.id);
          if (m.valueKind === "analog" && v !== undefined && v !== null && rv?.expected != null && m.sigma && m.sigma > 0 && running) {
            const z = (v - rv.expected) / m.sigma;
            penalty += Math.min(P("z_cap"), Math.max(0, Math.abs(z) - P("z_free")) * P("z_weight"));
          }
          const ls = limitSev.get(m.id) ?? "Normal";
          penalty += ls === "Critical" ? P("limit_critical") : ls === "Alert" ? P("limit_advisory") : 0;
        }
        for (const r of activeRules) {
          if (!r.scored || !(subsOfRule.get(r.id) ?? []).includes(sub.id)) continue;
          penalty += r.pending ? P("rule_watch") : r.severity === "Critical" ? P("rule_critical") : r.severity === "Alert" ? P("rule_advisory") : 0;
        }
        const score = Math.max(floor, Math.min(ceiling, ceiling - penalty));
        subScore.set(sub.id, score);
        subScores.push({ subassemblyId: sub.id, score: Math.round(score * 10) / 10 });
      }
      const combine = (scores: number[], w: number) => (scores.length ? w * Math.min(...scores) + (1 - w) * (scores.reduce((a, b) => a + b, 0) / scores.length) : null);
      const sysScores: number[] = [];
      for (const sy of machineSystems) {
        if (!sy.scored) continue;
        const s = combine(subs.filter((x) => x.system_id === sy.id).map((x) => subScore.get(x.id)!).filter((x) => x !== undefined), P("system_min_weight"));
        if (s !== null) sysScores.push(s);
      }
      const overall = combine(sysScores, P("combine_min_weight"));
      if (overall !== null) {
        const cap = p.get("max_score") ?? ceiling;
        machineScores.push({ machineId, score: Math.round(Math.max(0, Math.min(cap, overall)) * 10) / 10 });
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Persist                                                             */
  /* ------------------------------------------------------------------ */
  const c = await pool.connect();
  let opened = 0;
  let updated = 0;
  let cleared = 0;
  const at = new Date(now);
  try {
    await c.query("BEGIN");
    const open = (await c.query<OpenFinding>("SELECT id, machine_id, finding_type_id, measurement_id, rule_id, severity_id FROM findings WHERE cleared_at IS NULL")).rows;
    const openByKey = new Map(open.map((f) => [keyOf(f.machine_id, f.finding_type_id, f.measurement_id, f.rule_id), f]));
    const seen = new Set<string>();
    const events: Array<{ machineId: string; type: string; severity: Severity; measurementId: string | null; title: string; description: string }> = [];

    const inserts: Array<Record<string, unknown>> = [];
    const updates: Array<Record<string, unknown>> = [];
    for (const d of desired as Array<Desired & { holdOnly?: boolean }>) {
      const key = keyOf(d.machineId, d.type, d.measurementId, d.ruleId);
      if (seen.has(key)) continue;
      const cur = openByKey.get(key);
      // A finding kept alive only by its clear window never opens on its own.
      if (!cur && d.holdOnly) continue;
      seen.add(key);
      const row = {
        machine_id: d.machineId,
        finding_type_id: d.type,
        measurement_id: d.measurementId,
        rule_id: d.ruleId,
        severity_id: d.severity,
        state_id: d.stateId,
        reference_set_id: d.referenceSetId,
        observed_value: d.observed,
        expected_value: d.expected,
        expected_lo: d.expectedLo,
        expected_hi: d.expectedHi,
        limit_value: d.limitValue,
        change_value: d.change,
        change_window_s: d.changeWindowS,
        data_assessment: d.dataAssessment,
        summary: d.summary,
      };
      if (cur) {
        updates.push({ id: cur.id, ...row, severity_id: d.holdOnly ? cur.severity_id : d.severity });
      } else {
        inserts.push(row);
        if (d.type === "limit_exceeded" || d.type === "rule_pattern") {
          events.push({ machineId: d.machineId, type: "alarm_raised", severity: d.severity, measurementId: d.measurementId, title: d.type === "limit_exceeded" ? "Limit crossed" : "Diagnostic pattern active", description: d.summary });
        } else if (d.type !== "data_unavailable" && d.type !== "new_operating_condition") {
          events.push({ machineId: d.machineId, type: "telemetry_advisory", severity: d.severity, measurementId: d.measurementId, title: "Monitoring finding", description: d.summary });
        }
      }
    }
    const findingCols = "machine_id, finding_type_id, measurement_id, rule_id, severity_id, state_id, reference_set_id, observed_value, expected_value, expected_lo, expected_hi, limit_value, change_value, change_window_s, data_assessment, summary";
    const recordType = `machine_id varchar, finding_type_id varchar, measurement_id varchar, rule_id int, severity_id varchar, state_id int, reference_set_id int,
      observed_value float8, expected_value float8, expected_lo float8, expected_hi float8, limit_value float8, change_value float8,
      change_window_s float8, data_assessment varchar, summary text`;
    if (inserts.length) {
      const r = await c.query(
        `INSERT INTO findings (${findingCols}, opened_at, last_evaluated_at)
         SELECT ${findingCols}, $2, $2 FROM jsonb_to_recordset($1::jsonb) AS x(${recordType})`,
        [JSON.stringify(inserts), at],
      );
      opened = r.rowCount ?? 0;
    }
    if (updates.length) {
      const r = await c.query(
        `UPDATE findings f SET severity_id = x.severity_id, state_id = x.state_id, reference_set_id = x.reference_set_id,
                observed_value = x.observed_value, expected_value = x.expected_value, expected_lo = x.expected_lo, expected_hi = x.expected_hi,
                limit_value = x.limit_value, change_value = x.change_value, change_window_s = x.change_window_s,
                data_assessment = x.data_assessment, summary = x.summary, last_evaluated_at = $2
           FROM jsonb_to_recordset($1::jsonb) AS x(id bigint, ${recordType})
          WHERE f.id = x.id`,
        [JSON.stringify(updates), at],
      );
      updated = r.rowCount ?? 0;
    }
    const toClear = open.filter(
      (f) =>
        !seen.has(keyOf(f.machine_id, f.finding_type_id, f.measurement_id, f.rule_id)) &&
        !heldMachines.has(f.machine_id) &&
        !(f.finding_type_id !== "data_unavailable" && f.measurement_id !== null && unjudged.has(f.measurement_id)),
    );
    // Rule findings are only cleared by rule reports; without a report this cycle they keep their state.
    const reported = new Set((opts.ruleStates ?? []).map((r) => r.machineId));
    const clearIds = toClear.filter((f) => f.finding_type_id !== "rule_pattern" || reported.has(f.machine_id)).map((f) => f.id);
    if (clearIds.length) {
      const r = await c.query("UPDATE findings SET cleared_at = GREATEST($2, opened_at), last_evaluated_at = $2 WHERE id = ANY($1)", [clearIds, at]);
      cleared = r.rowCount ?? 0;
      for (const f of toClear) {
        if (!clearIds.includes(f.id) || (f.finding_type_id !== "limit_exceeded" && f.finding_type_id !== "rule_pattern")) continue;
        events.push({ machineId: f.machine_id, type: "alarm_cleared", severity: "Normal", measurementId: f.measurement_id, title: "Returned to normal", description: f.finding_type_id === "limit_exceeded" ? `${measurements.get(f.measurement_id ?? "")?.name ?? "Measurement"} is back inside its limits.` : "Diagnostic pattern no longer active." });
      }
    }

    // Operating state periods and start / stop events.
    for (const ch of stateChanges) {
      await c.query("UPDATE machine_state_periods SET ended_at = $2 WHERE machine_id = $1 AND ended_at IS NULL", [ch.machineId, at]);
      await c.query("INSERT INTO machine_state_periods (machine_id, started_at, state_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", [ch.machineId, at, ch.to.id]);
      if (ch.from) {
        const type = ch.from.running && !ch.to.running ? "machine_stop" : !ch.from.running && ch.to.running ? "machine_start" : "state_change";
        events.push({ machineId: ch.machineId, type, severity: "Normal", measurementId: null, title: `${ch.from.name} → ${ch.to.name}`, description: `Operating state recognised as ${ch.to.name}.` });
      }
    }

    if (events.length) {
      await c.query(
        `INSERT INTO machine_events (machine_id, event_type_id, occurred_at, severity_id, measurement_id, title, description, source)
         SELECT x.machine_id, x.type, $2, x.severity, x.measurement_id, x.title, x.description, 'ULTRON evaluation'
           FROM jsonb_to_recordset($1::jsonb) AS x(machine_id varchar, type varchar, severity varchar, measurement_id varchar, title varchar, description text)`,
        [JSON.stringify(events.map((e) => ({ machine_id: e.machineId, type: e.type, severity: e.severity, measurement_id: e.measurementId, title: e.title.slice(0, 255), description: e.description }))), at],
      );
    }

    if (machineScores.length) {
      await c.query(
        `INSERT INTO machine_health_scores (machine_id, scored_at, score)
         SELECT x.m, $3, x.s FROM unnest($1::varchar[], $2::real[]) AS x(m, s) ON CONFLICT DO NOTHING`,
        [machineScores.map((s) => s.machineId), machineScores.map((s) => s.score), at],
      );
    }
    if (subScores.length) {
      await c.query(
        `INSERT INTO subassembly_health_scores (subassembly_id, scored_at, score)
         SELECT x.m, $3, x.s FROM unnest($1::varchar[], $2::real[]) AS x(m, s) ON CONFLICT DO NOTHING`,
        [subScores.map((s) => s.subassemblyId), subScores.map((s) => s.score), at],
      );
    }
    // Every new alarm issues its "go and check" task with it (Maintenance › Predictive).
    if (opened) await syncAlertChecks(c);
    await c.query("DELETE FROM machine_health_scores WHERE scored_at < NOW() - make_interval(hours => $1::int)", [Math.round(keepH)]);
    await c.query("DELETE FROM subassembly_health_scores WHERE scored_at < NOW() - make_interval(hours => $1::int)", [Math.round(keepH)]);
    await c.query("COMMIT");
  } catch (err) {
    await c.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    c.release();
  }

  return { at: at.toISOString(), machines: byMachine.size, measurements: measurements.size, opened, updated, cleared };
}
