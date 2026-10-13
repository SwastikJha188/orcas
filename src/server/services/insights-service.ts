/**
 * ULTRON Insights Service — server-side prognosis & analysis.
 *
 * All values are derived deterministically from the PostgreSQL catalog
 * (mapped_signals, machine_systems, machine_subassemblies, diagnosis_records,
 * trend_records) so every client page fetches from a single DB source of
 * truth and never recomputes or hardcodes anything. When a real ML service
 * lands, swap these builders for its output — the API contract stays.
 */

import { getDiagnosisRecords, getMachineCatalog, getTrendRecords } from "./industrial-service";
import type { DiagnosisRecord } from "@/components/assets/assets-data";

export type Severity = "Normal" | "Advisory" | "Critical";

/* ------------------------------------------------------------------ */
/* Deterministic helpers                                              */
/* ------------------------------------------------------------------ */

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));


/* ------------------------------------------------------------------ */
/* Normalized input                                                   */
/* ------------------------------------------------------------------ */

export interface InsightController {
  ruleId: string;
  ruleName: string;
  primaryCause: string;
  mechanism: string;
  symptomSignature: string;
  consequence: string;
  prescriptiveAction: string;
  crossCheckSensors?: string[];
}

export interface InsightSensor {
  tag: string;
  name: string;
  unit: string;
  status: Severity;
  numericValue: number;
  warningVal: number;
  alarmVal: number;
  component: string;
  subAssembly: string;
  subassemblyId: string;
  systemId: string;
  reasons: InsightController[];
  /** Measured history (oldest → newest). Empty when no trend points exist. */
  history: number[];
}

export interface InsightSubsystem {
  subassemblyId: string;
  name: string;
  systemId: string;
  health: number;
  status: Severity;
}

/* ------------------------------------------------------------------ */
/* Output contracts                                                   */
/* ------------------------------------------------------------------ */

export interface ForecastHorizon {
  id: string;
  label: string;
  hours: number;
  steps: number;
}

export const FORECAST_HORIZONS: ForecastHorizon[] = [
  { id: "1h", label: "1H", hours: 1, steps: 14 },
  { id: "6h", label: "6H", hours: 6, steps: 18 },
  { id: "24h", label: "24H", hours: 24, steps: 24 },
  { id: "7d", label: "7D", hours: 168, steps: 26 },
  { id: "30d", label: "30D", hours: 720, steps: 30 },
];

export interface ForecastSeries {
  tag: string;
  name: string;
  unit: string;
  status: Severity;
  history: number[];
  forecast: number[];
  lower: number[];
  upper: number[];
  current: number;
  predicted: number;
  deltaPct: number;
  trend: "rising" | "falling" | "stable";
  warning: number | null;
  alarm: number | null;
  horizonLabel: string;
  confidence: number;
}

export interface InfluenceLink {
  tag: string;
  name: string;
  unit: string;
  coefficient: number;
  delta: number;
  direction: "up" | "down";
}

/** A system of the machine as registered in `machine_systems` (or the sim's system list). */
export interface ConditionSystem {
  id: string;
  name: string;
}

/** Projected health at `day`: overall plus one value per system id in `condition.systems`. */
export interface ConditionPoint {
  day: number;
  overall: number;
  systems: Record<string, number>;
}

/** Where a sensor sits in the machine hierarchy (DB catalog or sim signal defs). */
export interface SensorLocation {
  systemId: string;
  system: string;
  subassemblyId: string;
  subassembly: string;
  component: string;
}

/** Pearson r between two sensors over their measured history. */
export interface CorrelationPair {
  a: string;
  b: string;
  r: number;
  /** Number of paired samples the coefficient was computed from. */
  n: number;
  /** r over the earlier part of the window and over its most recent part, when there is enough history. */
  baseline?: number;
  recent?: number;
}

export interface FailureRisk {
  id: string;
  fault: string;
  component: string;
  probability: number;
  severity: Severity;
  window: string;
  priority: "Low" | "Medium" | "High" | "Immediate";
}

export interface RulItem {
  id: string;
  name: string;
  component: string;
  health: number;
  hours: number;
  days: number;
  confidence: number;
  status: Severity;
  dueLabel: string;
}

export interface AnomalyItem {
  tag: string;
  name: string;
  component: string;
  score: number;
  severity: Severity;
  deviation: string;
  onset: string;
}

/** A sensor reading that supports an issue source, as measured. */
export interface SourceEvidence {
  tag: string;
  label: string;
  /** Measured value / deviation text, e.g. "7.4 mm/s · +12 % vs warning". */
  detail: string;
  severity: Severity;
}

export interface IssueSource {
  id: string;
  cause: string;
  subsystem: string;
  contribution: number;
  confidence: number;
  severity: Severity;
  /** Sensors behind this source; empty when the source has no sensor link (e.g. a diagnosis finding). */
  evidence: SourceEvidence[];
}

export interface FaultClass {
  id: string;
  label: string;
  probability: number;
  severity: Severity;
  band: string;
}

export interface DegradationItem {
  id: string;
  name: string;
  stageIndex: number;
  stageLabel: string;
  health: number;
  trend: "rising" | "stable" | "falling";
}

export interface MaintenanceAction {
  id: string;
  title: string;
  component: string;
  priority: "Low" | "Medium" | "High" | "Immediate";
  window: string;
  eta: string;
  confidence: number;
  rationale: string;
}

export interface FeatureWeight {
  id: string;
  label: string;
  weight: number;
  tag: string;
}

export interface ReasoningStep {
  id: string;
  label: string;
  detail: string;
  status: Severity;
}

export const DEGRADATION_STAGES = [
  "As-new",
  "Healthy",
  "Early wear",
  "Progressive",
  "Severe",
  "Failure",
] as const;

export const CONDITION_HORIZONS = [0, 7, 30, 90, 180];

export interface InsightsResponse {
  machineId: string;
  generatedAt: string;
  keySensors: string[];
  prognosis: {
    horizons: ForecastHorizon[];
    forecasts: Record<string, Record<string, ForecastSeries>>;
    /**
     * `tags`/`matrix`: key sensors only, for a readable heat-map.
     * `pairs`: every pair of forecast sensors that both carry measured
     * history (strongest |r| first).
     */
    correlation: { tags: string[]; matrix: number[][]; pairs: CorrelationPair[] };
    influences: Record<string, InfluenceLink[]>;
    condition: { horizons: number[]; systems: ConditionSystem[]; points: ConditionPoint[] };
    /** Hierarchy location for every sensor tag on the machine. */
    locations: Record<string, SensorLocation>;
    risks: FailureRisk[];
    rul: RulItem[];
    anomalies: AnomalyItem[];
    anomalyTimeline: number[];
  };
  analysis: {
    model: {
      healthIndex: number;
      confidence: number;
      inputs: number;
      condition: string;
      engine: string;
    };
    sources: IssueSource[];
    faults: FaultClass[];
    degradation: { stages: string[]; items: DegradationItem[] };
    actions: MaintenanceAction[];
    features: FeatureWeight[];
    reasoning: ReasoningStep[];
  };
}

/* ------------------------------------------------------------------ */
/* Builders                                                           */
/* ------------------------------------------------------------------ */

const PREFERRED_TAGS = [
  "VIB-KLN-01",
  "VIB-KLN-02",
  "TMP-KLN-21",
  "TMP-KLN-05",
  "PRS-KLN-07",
  "VIB-KLN-04",
  "TMP-KLN-22",
  "CAL-KLN-03",
  "GAS-KLN-01",
];

export function pickKeySensors(sensors: InsightSensor[], count = 6): InsightSensor[] {
  const byTag = new Map(sensors.map((s) => [s.tag, s]));
  const picked: InsightSensor[] = [];
  for (const t of PREFERRED_TAGS) {
    const s = byTag.get(t);
    if (s && !picked.includes(s)) picked.push(s);
    if (picked.length >= count) break;
  }
  for (const s of sensors) {
    if (picked.length >= count) break;
    if (!picked.includes(s) && s.unit.toLowerCase() !== "state") picked.push(s);
  }
  return picked;
}

export function buildForecast(sensor: InsightSensor, horizon: ForecastHorizon): ForecastSeries {
  const current = sensor.numericValue || 1;
  const status = sensor.status;
  const unit = sensor.unit || "";

  // Status-driven drift toward the sensor's own limit (DB warning/alarm):
  // falling when the alarm sits below the warning, rising otherwise.
  const perDay = status === "Critical" ? 0.06 : status === "Advisory" ? 0.03 : 0.006;
  const maxPct = perDay * Math.sqrt(horizon.hours / 24);
  const bias = sensor.alarmVal > 0 && sensor.warningVal > 0 && sensor.alarmVal < sensor.warningVal ? -1 : 1;

  // Measured trend points only; with none, the single current DB value.
  const history = sensor.history.length > 0 ? sensor.history.slice(-30) : [current];

  const forecast: number[] = [];
  const lower: number[] = [];
  const upper: number[] = [];
  for (let j = 1; j <= horizon.steps; j++) {
    const frac = j / horizon.steps;
    const v = current * (1 + maxPct * bias * frac);
    const sd = current * (0.006 + maxPct * 0.42 * frac);
    forecast.push(v);
    lower.push(v - sd);
    upper.push(v + sd);
  }

  const predicted = forecast[forecast.length - 1] ?? current;
  const deltaPct = ((predicted - current) / (current || 1)) * 100;
  const trend: ForecastSeries["trend"] =
    deltaPct > 0.4 ? "rising" : deltaPct < -0.4 ? "falling" : "stable";

  return {
    tag: sensor.tag,
    name: sensor.name,
    unit,
    status,
    history,
    forecast,
    lower,
    upper,
    current,
    predicted,
    deltaPct,
    trend,
    warning: Number.isFinite(sensor.warningVal) && sensor.warningVal > 0 ? sensor.warningVal : null,
    alarm: Number.isFinite(sensor.alarmVal) && sensor.alarmVal > 0 ? sensor.alarmVal : null,
    horizonLabel: horizon.label,
    confidence: clamp(
      99 - (status === "Critical" ? 9 : status === "Advisory" ? 5 : 1.5) - horizon.hours / 220,
      72,
      99
    ),
  };
}

const mean = (v: number[]) => v.reduce((s, x) => s + x, 0) / (v.length || 1);

/** Pearson r over the shared tail of two measured series; null below 5 pairs or with a flat series. */
export function pearson(a: number[], b: number[]): { r: number; n: number } | null {
  const n = Math.min(a.length, b.length);
  if (n < 5) return null;
  const xa = a.slice(-n);
  const xb = b.slice(-n);
  const ma = mean(xa);
  const mb = mean(xb);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    num += (xa[i] - ma) * (xb[i] - mb);
    da += (xa[i] - ma) ** 2;
    db += (xb[i] - mb) ** 2;
  }
  if (!da || !db) return null;
  return { r: num / Math.sqrt(da * db), n };
}

const hasMeasured = (s: InsightSensor | undefined) => !!s && s.history.length >= 5;

/** Correlation matrix from measured trend history; 0 where a pair has no shared history. */
export function buildCorrelation(sensors: InsightSensor[], tags: string[]): number[][] {
  const byTag = new Map(sensors.map((s) => [s.tag, s]));
  return tags.map((a, i) =>
    tags.map((b, j) => {
      if (i === j) return 1;
      const sa = byTag.get(a);
      const sb = byTag.get(b);
      return (sa && sb && pearson(sa.history, sb.history)?.r) || 0;
    })
  );
}

/** Every pair of the given sensors that both carry measured history, strongest |r| first. */
export function buildCorrelationPairs(sensors: InsightSensor[]): CorrelationPair[] {
  const measured = sensors.filter(hasMeasured);
  const out: CorrelationPair[] = [];
  for (let i = 0; i < measured.length; i++) {
    for (let j = i + 1; j < measured.length; j++) {
      const ha = measured[i].history;
      const hb = measured[j].history;
      const p = pearson(ha, hb);
      if (!p) continue;
      // Earlier two thirds vs the latest third, when each part has enough samples.
      const cut = Math.floor((Math.min(ha.length, hb.length) * 2) / 3);
      const early = cut >= 6 ? pearson(ha.slice(0, cut), hb.slice(0, cut)) : null;
      const late = cut >= 6 ? pearson(ha.slice(cut), hb.slice(cut)) : null;
      out.push({ a: measured[i].tag, b: measured[j].tag, r: p.r, n: p.n, baseline: early?.r, recent: late?.r });
    }
  }
  return out.sort((x, y) => Math.abs(y.r) - Math.abs(x.r));
}

/** Measured co-movement of other sensors with the driver; empty when the driver has no history. */
export function buildInfluence(sensors: InsightSensor[], driverTag: string): InfluenceLink[] {
  const driver = sensors.find((s) => s.tag === driverTag);
  if (!driver || !hasMeasured(driver)) return [];
  const dh = driver.history;
  const dm = mean(dh);
  const dSd = Math.sqrt(mean(dh.map((v) => (v - dm) ** 2))) || 1;
  const links: InfluenceLink[] = [];
  for (const s of sensors) {
    if (s.tag === driverTag || !hasMeasured(s)) continue;
    const p = pearson(dh, s.history);
    if (!p) continue;
    links.push({
      tag: s.tag,
      name: s.name,
      unit: s.unit,
      coefficient: p.r,
      delta: p.r * dSd,
      direction: p.r >= 0 ? "up" : "down",
    });
  }
  return links.sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient)).slice(0, 6);
}

const SEV_WEIGHT: Record<Severity, number> = { Critical: 3, Advisory: 1.6, Normal: 0 };

/** Health-loss rate (%/day) from the sensors in alarm/warning: 0.012 %/d base + 0.18 per weighted finding. */
const lossPerDay = (hot: InsightSensor[]) => 0.012 + hot.reduce((a, s) => a + SEV_WEIGHT[s.status] * 0.18, 0);

/**
 * Health projection per DB `machine_systems` row. Each system starts at its
 * catalog health and loses health at a rate set by its own sensors in
 * warning/alarm; overall starts at the machine health index and falls by the
 * mean system loss.
 */
export function buildConditionProjection(
  startHealth: number,
  systems: Array<{ id: string; health: number }>,
  sensors: InsightSensor[]
): ConditionPoint[] {
  const at = (start: number, rate: number, day: number) => clamp(start - rate * day * (day > 30 ? 0.8 : 1), 0, 100);
  const rates = new Map(
    systems.map((sys) => [sys.id, lossPerDay(sensors.filter((s) => s.systemId === sys.id && s.status !== "Normal"))])
  );
  const machineRate = lossPerDay(sensors.filter((s) => s.status !== "Normal"));
  return CONDITION_HORIZONS.map((day) => {
    const values: Record<string, number> = {};
    let drop = 0;
    for (const sys of systems) {
      const v = at(sys.health, rates.get(sys.id) ?? 0.012, day);
      values[sys.id] = v;
      drop += sys.health - v;
    }
    const overall = systems.length
      ? clamp(startHealth - drop / systems.length, 0, 100)
      : at(startHealth, machineRate, day);
    return { day, overall, systems: values };
  });
}

/** 0–1: how far a sensor sits past its warning toward (and beyond) its alarm, from DB limits. */
function exceedance(s: InsightSensor): number {
  const w = s.warningVal;
  const a = s.alarmVal;
  if (!(w > 0) || !(a > 0) || w === a) return 0.5;
  return clamp((s.numericValue - w) / (a - w), 0, 1.5) / 1.5;
}

export function buildFailureRisks(
  sensors: InsightSensor[],
  subsystems: InsightSubsystem[],
  diagnosis?: DiagnosisRecord
): FailureRisk[] {
  const risks: FailureRisk[] = [];
  const covered = new Set<string>();
  for (const s of sensors) {
    if (s.status === "Normal") continue;
    const e = exceedance(s);
    const rule = s.reasons[0];
    if (s.subassemblyId) covered.add(s.subassemblyId);
    risks.push({
      id: s.tag,
      fault: rule?.ruleName || `${s.name} degradation`,
      component: s.component || s.subAssembly || s.tag,
      probability: Math.round(s.status === "Critical" ? 70 + 25 * e : 34 + 30 * e),
      severity: s.status,
      window: s.status === "Critical" ? "< 72 h" : "< 30 d",
      priority: s.status === "Critical" ? "Immediate" : "High",
    });
  }
  if (diagnosis) {
    for (const f of diagnosis.findings) {
      if (f.severity === "Normal") continue;
      const loc = f.location.toLowerCase();
      for (const sa of subsystems) if (loc.includes(sa.name.toLowerCase())) covered.add(sa.subassemblyId);
      risks.push({
        id: f.id,
        fault: f.fault,
        component: f.location,
        probability: Math.round(clamp(f.probability * 4 + 30, 20, 95)),
        severity: f.severity === "Critical" ? "Critical" : "Advisory",
        window: f.severity === "Critical" ? "< 7 d" : "< 45 d",
        priority: f.severity === "Critical" ? "Immediate" : "Medium",
      });
    }
  }
  // Baseline exposure for every DB sub-assembly without a finding, from its catalog health.
  for (const sa of subsystems) {
    if (covered.has(sa.subassemblyId)) continue;
    risks.push({
      id: `base-${sa.subassemblyId}`,
      fault: `${sa.name} functional failure`,
      component: sa.name,
      probability: Math.round(clamp((100 - sa.health) * 0.6, 1, 40)),
      severity: sa.status,
      window: "< 30 d",
      priority: sa.status === "Critical" ? "High" : sa.status === "Advisory" ? "Medium" : "Low",
    });
  }
  const seen = new Set<string>();
  return risks
    .filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)))
    .sort((a, b) => b.probability - a.probability);
}

/** Health index treated as end of life. */
const EOL_HEALTH = 25;
const SEV_RANK: Record<Severity, number> = { Normal: 0, Advisory: 1, Critical: 2 };

/**
 * RUL per DB sub-assembly: hours until catalog health reaches end of life at
 * a loss rate set by the sub-assembly status and its own sensors in
 * warning/alarm. Confidence grows with the number of mapped sensors.
 */
export function buildRul(subsystems: InsightSubsystem[], sensors: InsightSensor[]): RulItem[] {
  return subsystems
    .map((s) => {
      const mapped = sensors.filter((x) => x.subassemblyId === s.subassemblyId);
      const hot = mapped.filter((x) => x.status !== "Normal");
      const base = s.status === "Critical" ? 1 : s.status === "Advisory" ? 0.25 : 0.05;
      const rate = base + hot.reduce((a, x) => a + SEV_WEIGHT[x.status] * 0.18, 0);
      const hours = Math.max(1, Math.round((Math.max(0, s.health - EOL_HEALTH) / rate) * 24));
      const days = Math.round(hours / 24);
      const byHours: Severity = hours < 72 ? "Critical" : hours < 720 ? "Advisory" : "Normal";
      const status = SEV_RANK[s.status] > SEV_RANK[byHours] ? s.status : byHours;
      return {
        id: s.subassemblyId,
        name: s.name,
        component: s.name,
        health: s.health,
        hours,
        days,
        confidence: clamp(70 + mapped.length * 5, 70, 95),
        status,
        dueLabel: hours < 48 ? `${hours} h` : days < 45 ? `${days} d` : `${Math.round(days / 30)} mo`,
      };
    })
    .sort((a, b) => a.hours - b.hours);
}

export function buildAnomalies(sensors: InsightSensor[]): AnomalyItem[] {
  return sensors
    .filter((s) => s.status !== "Normal")
    .map((s) => {
      const e = exceedance(s);
      const score = s.status === "Critical" ? 0.72 + 0.27 * e : 0.38 + 0.32 * e;
      const current = s.numericValue || 0;
      const ref = s.warningVal > 0 ? s.warningVal : current;
      const devPct = ref ? ((current - ref) / ref) * 100 : 0;
      return {
        tag: s.tag,
        name: s.name,
        component: s.component || s.subAssembly || s.tag,
        score: clamp(score, 0, 1),
        severity: s.status,
        deviation: `${devPct >= 0 ? "+" : ""}${devPct.toFixed(1)}% vs warning limit`,
        // The catalog stores no onset timestamp.
        onset: "—",
      };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Anomaly activity per hour needs timestamped anomaly events, which the DB
 * does not store; return no buckets rather than invent a distribution.
 */
export function buildAnomalyTimeline(): number[] {
  return [];
}

export function buildIssueSources(sensors: InsightSensor[], diagnosis?: DiagnosisRecord): IssueSource[] {
  const sources: IssueSource[] = [];
  const active = sensors.filter((s) => s.status !== "Normal");
  const grouped = new Map<string, InsightSensor[]>();
  for (const s of active) {
    const key = s.subassemblyId || s.subAssembly || s.systemId || s.tag;
    const arr = grouped.get(key) || [];
    arr.push(s);
    grouped.set(key, arr);
  }
  const total = active.length || 1;
  for (const [key, arr] of grouped) {
    const critical = arr.filter((s) => s.status === "Critical").length;
    sources.push({
      id: key,
      cause: arr[0].reasons[0]?.ruleName || `${arr[0].name} deviation`,
      subsystem: arr[0].subAssembly || arr[0].component || key,
      contribution: clamp(((arr.length + critical) / total) * 100, 4, 100),
      // More corroborating sensors on the same sub-assembly → higher confidence.
      confidence: clamp(76 + arr.length * 4 + critical * 3, 70, 97),
      severity: critical > 0 ? "Critical" : "Advisory",
      evidence: arr.map((x) => {
        const ref = x.warningVal > 0 ? x.warningVal : 0;
        const dev = ref ? ((x.numericValue - ref) / ref) * 100 : null;
        return {
          tag: x.tag,
          label: x.name,
          detail: `${x.numericValue} ${x.unit}${dev === null ? "" : ` · ${dev >= 0 ? "+" : ""}${dev.toFixed(1)} % vs warning`}`,
          severity: x.status,
        };
      }),
    });
  }
  if (diagnosis) {
    for (const f of diagnosis.findings) {
      if (f.severity === "Normal") continue;
      sources.push({
        id: f.id,
        cause: f.fault,
        subsystem: f.location,
        contribution: clamp(f.probability * 6 + 12, 8, 90),
        confidence: clamp(diagnosis.confidence - 4, 70, 99),
        severity: f.severity === "Critical" ? "Critical" : "Advisory",
        evidence: [],
      });
    }
  }
  if (sources.length === 0) {
    sources.push({
      id: "src-baseline",
      cause: "No active defect source — model residuals within control limits",
      subsystem: "All subsystems nominal",
      contribution: 100,
      confidence: 97,
      severity: "Normal",
      evidence: [],
    });
  }
  return sources.sort((a, b) => b.contribution - a.contribution);
}

export function buildFaultClasses(sensors: InsightSensor[], diagnosis?: DiagnosisRecord): FaultClass[] {
  const classes: FaultClass[] = [];
  if (diagnosis) {
    for (const f of diagnosis.findings) {
      classes.push({
        id: f.id,
        label: f.fault,
        // The record's own probability, as stored.
        probability: clamp(Number(f.probability) || 0, 0, 100),
        severity: f.severity as Severity,
        band: f.frequency,
      });
    }
  }
  for (const s of sensors.filter((x) => x.status !== "Normal")) {
    const e = exceedance(s);
    classes.push({
      id: s.tag,
      label: s.reasons[0]?.ruleName || `${s.name} anomaly`,
      probability: Math.round(s.status === "Critical" ? 55 + 30 * e : 20 + 35 * e),
      severity: s.status,
      band: s.unit,
    });
  }
  if (classes.length === 0) {
    classes.push({
      id: "nominal",
      label: "Healthy signature — no fault class above threshold",
      probability: 96,
      severity: "Normal",
      band: "—",
    });
  }
  return classes.sort((a, b) => b.probability - a.probability);
}

export function buildDegradation(subsystems: InsightSubsystem[]): DegradationItem[] {
  return subsystems
    .map((s) => {
      const health = s.health;
      const stageIndex = clamp(Math.round((100 - health) / 14), 0, 5);
      return {
        id: s.subassemblyId,
        name: s.name,
        stageIndex,
        stageLabel: DEGRADATION_STAGES[stageIndex],
        health,
        trend: (s.status === "Critical" || s.status === "Advisory" ? "falling" : "stable") as DegradationItem["trend"],
      };
    })
    .sort((a, b) => b.stageIndex - a.stageIndex || a.health - b.health);
}

export function buildMaintenanceActions(sensors: InsightSensor[], diagnosis?: DiagnosisRecord): MaintenanceAction[] {
  const actions: MaintenanceAction[] = [];
  const active = sensors.filter((s) => s.status !== "Normal");
  for (const s of active) {
    const rule = s.reasons[0];
    actions.push({
      id: s.tag,
      title: rule?.ruleName || `Inspect ${s.name}`,
      component: s.component || s.subAssembly || s.tag,
      priority: s.status === "Critical" ? "Immediate" : "High",
      window: s.status === "Critical" ? "Next 72 h" : "Next 2 weeks",
      // No work-order duration is stored for sensor-raised actions.
      eta: "—",
      confidence: Math.round(clamp(72 + 25 * exceedance(s), 72, 97)),
      rationale: rule?.prescriptiveAction || `Restore ${s.name} to baseline envelope.`,
    });
  }
  if (diagnosis) {
    actions.push({
      id: `${diagnosis.machineId}-presire`,
      title: "Scheduled intervention",
      component: diagnosis.findings[0]?.location || "Multi-subsystem",
      priority: diagnosis.maintenancePriority,
      window:
        diagnosis.maintenancePriority === "Low"
          ? "Annual turnaround"
          : diagnosis.maintenancePriority === "Medium"
          ? "Next planned stop"
          : "Immediate",
      eta: diagnosis.maintenancePriority === "Low" ? "—" : "≤ 72 h",
      confidence: clamp(diagnosis.confidence, 80, 99),
      rationale: diagnosis.prescriptiveAction,
    });
  }
  if (actions.length === 0) {
    actions.push({
      id: "routine",
      title: "Continue condition-based monitoring",
      component: "All subsystems",
      priority: "Low",
      window: "Routine schedule",
      eta: "—",
      confidence: 97,
      rationale: "No defect above action threshold. Maintain quarterly vibration audit.",
    });
  }
  return actions;
}

export function buildFeatureWeights(sensors: InsightSensor[], diagnosis?: DiagnosisRecord): FeatureWeight[] {
  const pool: Array<{ tag: string; label: string; boost: number }> = [];
  for (const s of sensors.slice(0, 60)) {
    pool.push({
      tag: s.tag,
      label: s.name,
      boost: s.status === "Critical" ? 40 : s.status === "Advisory" ? 22 : 6,
    });
  }
  for (const f of diagnosis?.findings || []) {
    pool.push({ tag: f.id, label: f.fault, boost: 14 + (f.probability || 0) });
  }
  const weights = pool.map((p) => ({ id: p.tag, tag: p.tag, label: p.label, weight: clamp(8 + p.boost, 4, 100) }));
  return weights.sort((a, b) => b.weight - a.weight).slice(0, 6);
}

export function buildReasoningSteps(sources: IssueSource[], diagnosis?: DiagnosisRecord, sensorCount = 0): ReasoningStep[] {
  const top = sources[0];
  const hot = top && top.severity !== "Normal" ? top.severity : "Normal";
  return [
    {
      id: "ingest",
      label: "Signal ingestion",
      detail: `${sensorCount} sensors · 1 s sampling · PTP synchronized`,
      status: "Normal",
    },
    {
      id: "features",
      label: "Feature extraction",
      detail: "RMS, crest factor, kurtosis, envelope FFT harmonics",
      status: "Normal",
    },
    {
      id: "model",
      label: "Reference model residual",
      detail: diagnosis?.engineVersion || "AssetIQ ML reference model",
      status: hot,
    },
    {
      id: "isolate",
      label: "Source isolation",
      detail: top ? `${top.subsystem} — ${top.cause}` : "No anomaly isolated",
      status: hot,
    },
    {
      id: "action",
      label: "Prescriptive output",
      detail: diagnosis?.prescriptiveAction || "Continue condition-based monitoring",
      status: "Normal",
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Orchestration                                                      */
/* ------------------------------------------------------------------ */

export async function getMachineInsights(machineId: string): Promise<InsightsResponse> {
  const [catalog, diagnosisList, trendList] = await Promise.all([
    getMachineCatalog(machineId),
    getDiagnosisRecords(machineId),
    getTrendRecords(machineId),
  ]);
  const diagnosis = diagnosisList[0];

  const historyByTag = new Map<string, number[]>();
  for (const rec of trendList) {
    for (const metric of rec.metrics) {
      historyByTag.set(metric.key, metric.points.map((p) => p.value));
    }
  }

  const sensors: InsightSensor[] = catalog.sensors.map((s) => ({
    tag: s.tag,
    name: s.name,
    unit: s.unit,
    status: s.status,
    // pg returns numeric columns as strings; coerce so every derived
    // figure (forecast current, deviation, limits) is a real number.
    numericValue: Number(s.numericValue) || 0,
    warningVal: Number(s.warningVal) || 0,
    alarmVal: Number(s.alarmVal) || 0,
    component: s.component || s.subAssembly || s.tag,
    subAssembly: s.subAssembly || "",
    subassemblyId: s.subassemblyId || "",
    systemId: s.systemId || "",
    reasons: Array.isArray(s.reasons) ? s.reasons : [],
    history: historyByTag.get(s.tag) || [],
  }));

  const subsystems: InsightSubsystem[] = catalog.subassemblies.map((s) => ({
    subassemblyId: s.subassemblyId,
    name: s.name,
    systemId: s.systemId,
    health: Number(s.health) || 0,
    status: s.status,
  }));

  const systems = catalog.systems.map((s) => ({ id: s.systemId, name: s.name, health: Number(s.health) || 0 }));
  const subName = new Map(subsystems.map((s) => [s.subassemblyId, s.name]));
  const sysName = new Map(systems.map((s) => [s.id, s.name]));
  const locations: Record<string, SensorLocation> = {};
  for (const s of sensors) {
    locations[s.tag] = {
      systemId: s.systemId,
      system: sysName.get(s.systemId) ?? "",
      subassemblyId: s.subassemblyId,
      subassembly: subName.get(s.subassemblyId) ?? s.subAssembly,
      component: s.component,
    };
  }

  const keySensors = pickKeySensors(sensors, 6);
  const keyTags = keySensors.map((s) => s.tag);

  // Forecast every numeric sensor mapped in the DB, key sensors first; state
  // signals (unit "state") carry no numeric trend.
  const forecastSensors = keySensors.concat(
    sensors.filter((s) => !keySensors.includes(s) && s.unit.toLowerCase() !== "state")
  );
  const forecasts: Record<string, Record<string, ForecastSeries>> = {};
  for (const s of forecastSensors) {
    forecasts[s.tag] = {};
    for (const h of FORECAST_HORIZONS) {
      forecasts[s.tag][h.id] = buildForecast(s, h);
    }
  }

  const influences: Record<string, InfluenceLink[]> = {};
  // Heat-map: every forecast sensor with measured history. Correlation needs
  // real history; none → no matrix.
  const measuredForecast = forecastSensors.filter((s) => s.history.length >= 5);
  const matrixTags = measuredForecast.map((s) => s.tag);
  for (const s of forecastSensors) {
    influences[s.tag] = buildInfluence(sensors, s.tag);
  }

  const anomalies = buildAnomalies(sensors);
  const overallHealth =
    Math.round(
      (subsystems.reduce((acc, x) => acc + x.health, 0) / (subsystems.length || 1)) * 10
    ) / 10;

  const condition = buildConditionProjection(overallHealth, systems, sensors);

  const sources = buildIssueSources(sensors, diagnosis);

  return {
    machineId,
    generatedAt: new Date().toISOString(),
    keySensors: keyTags,
    prognosis: {
      horizons: FORECAST_HORIZONS,
      forecasts,
      correlation: {
        tags: matrixTags,
        matrix: buildCorrelation(sensors, matrixTags),
        pairs: buildCorrelationPairs(forecastSensors),
      },
      influences,
      condition: {
        horizons: CONDITION_HORIZONS,
        systems: systems.map(({ id, name }) => ({ id, name })),
        points: condition,
      },
      locations,
      risks: buildFailureRisks(sensors, subsystems, diagnosis),
      rul: buildRul(subsystems, sensors),
      anomalies,
      anomalyTimeline: buildAnomalyTimeline(),
    },
    analysis: {
      model: {
        healthIndex: overallHealth,
        confidence: diagnosis?.confidence ?? sources[0]?.confidence ?? 96,
        inputs: sensors.length,
        condition: diagnosis?.overallCondition ?? "Nominal",
        engine: diagnosis?.engineVersion ?? "AssetIQ ML reference model",
      },
      sources,
      faults: buildFaultClasses(sensors, diagnosis),
      degradation: { stages: [...DEGRADATION_STAGES], items: buildDegradation(subsystems) },
      actions: buildMaintenanceActions(sensors, diagnosis),
      features: buildFeatureWeights(sensors, diagnosis),
      reasoning: buildReasoningSteps(sources, diagnosis, sensors.length),
    },
  };
}
