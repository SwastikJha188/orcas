/**
 * Prognosis & Analysis payload computed from a live frame (kiln-seal fleet or
 * pyro line). The machine is described by `frame.defs` (signals, sub-assemblies,
 * systems, rules), never by the kiln module catalog.
 *
 * Same contract as the server `InsightsResponse`, so every Prognosis and
 * Analysis module renders it unchanged. Every number here comes from the
 * running engine — measured history, reference-model residuals, rule
 * persistence and time to limit — following the capability specifications:
 *
 *  - Condition monitoring: machine / component / process health and the
 *    measurements contributing to reduced health.
 *  - Expected behaviour: actual vs model, deviation in σ.
 *  - Unknown anomaly: deviating signals with no confirmed fault pattern.
 *  - Issue source & fault diagnosis: ranked rule findings with evidence.
 *  - Degradation, future condition, failure risk, RUL, maintenance.
 *  - Explainable AI: per-signal contribution and a clear "model influence is
 *    not physical cause" limitation.
 */
import type {
  AnomalyItem,
  ConditionPoint,
  CorrelationPair,
  DegradationItem,
  FailureRisk,
  FaultClass,
  FeatureWeight,
  ForecastHorizon,
  ForecastSeries,
  InfluenceLink,
  InsightsResponse,
  IssueSource,
  MaintenanceAction,
  ReasoningStep,
  RulItem,
  SensorLocation,
  SourceEvidence,
  Severity,
} from "@/server/services/insights-service";
import { limitPair, resolveLimit, type SignalDef } from "./signals";
import type { PlantDefs } from "../plant-defs";
import { formatDuration, type RuleState, type SimFrame } from "./engine";

const HORIZONS: ForecastHorizon[] = [
  { id: "1h", label: "1H", hours: 1, steps: 14 },
  { id: "6h", label: "6H", hours: 6, steps: 18 },
  { id: "24h", label: "24H", hours: 24, steps: 24 },
  { id: "7d", label: "7D", hours: 168, steps: 26 },
  { id: "30d", label: "30D", hours: 720, steps: 30 },
];
const DEGRADATION_STAGES = ["As-new", "Healthy", "Early wear", "Progressive", "Severe", "Failure"];
const CONDITION_HORIZONS = [0, 7, 30, 90, 180];
/** Kiln-seal fleet key-sensor fallback; other plants use their operating-point tags. */
const KILN_PREFERRED = ["VIB-KLN-01", "VIB-KLN-02", "TMP-KLN-21", "TMP-KLN-05", "PRS-KLN-07", "VIB-KLN-04", "TMP-KLN-22", "CAL-KLN-03", "GAS-KLN-01"];

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const subName = (defs: PlantDefs, id: string) => defs.subassemblies.find((s) => s.id === id)?.name ?? id;
const subNames = (defs: PlantDefs, ids: string[]) => ids.map((id) => subName(defs, id)).join(", ");
/** Systems that carry a health score (process context is not scored). */
const healthSystems = (defs: PlantDefs) => defs.systems.filter((s) => s.scored);
/** Sub-assemblies of the machine itself (process-context systems excluded). */
const machineSubs = (defs: PlantDefs) => defs.subassemblies.filter((x) => !defs.processSystems.includes(x.system));
const isAnalog = (f: SimFrame, tag: string) => f.defs.signalByTag[tag]?.type === "analog" && Array.isArray(f.history[tag]);

/** Least-squares slope per sample and its standard error. */
function slopeWithError(ys: number[]): { slope: number; se: number } {
  const n = ys.length;
  if (n < 4) return { slope: 0, se: Infinity };
  const xm = (n - 1) / 2;
  const ym = ys.reduce((a, b) => a + b, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (i - xm) ** 2;
    sxy += (i - xm) * (ys[i] - ym);
  }
  const slope = sxx ? sxy / sxx : 0;
  let rss = 0;
  for (let i = 0; i < n; i++) rss += (ys[i] - (ym + slope * (i - xm))) ** 2;
  const se = sxx ? Math.sqrt(rss / (n - 2) / sxx) : Infinity;
  return { slope, se };
}

/** Normalized zero-mean unit vector and standard deviation for fast Pearson dot products. */
interface NormVec {
  z: Float64Array;
  sd: number;
  valid: boolean;
}

function normSlice(arr: number[], start: number, end: number): NormVec {
  const s = Math.max(0, start < 0 ? arr.length + start : start);
  const e = Math.min(arr.length, end < 0 ? arr.length + end : end);
  const n = e - s;
  if (n < 3) return { z: new Float64Array(0), sd: 1, valid: false };
  let sum = 0;
  for (let i = s; i < e; i++) sum += arr[i];
  const mean = sum / n;
  const z = new Float64Array(n);
  let ss = 0;
  for (let i = 0; i < n; i++) {
    const d = arr[s + i] - mean;
    z[i] = d;
    ss += d * d;
  }
  const sd = Math.sqrt(ss / n) || 1;
  if (ss <= 0) return { z, sd, valid: false };
  const invNorm = 1 / Math.sqrt(ss);
  for (let i = 0; i < n; i++) z[i] *= invNorm;
  return { z, sd, valid: true };
}

function dotNorm(a: NormVec, b: NormVec): number {
  if (!a.valid || !b.valid || a.z.length !== b.z.length) return 0;
  const za = a.z;
  const zb = b.z;
  const n = za.length;
  let s = 0;
  for (let i = 0; i < n; i++) s += za[i] * zb[i];
  return s;
}

function downsample(values: number[], points: number): number[] {
  if (values.length <= points) return values.slice();
  const step = values.length / points;
  return Array.from({ length: points }, (_, i) => values[Math.min(values.length - 1, Math.round((i + 1) * step) - 1)]);
}

const activeRules = (f: SimFrame) => f.rules.filter((r) => r.status === "ACTIVE");
const machineRules = (rs: RuleState[]) => rs.filter((r) => r.category !== "Data quality" && r.category !== "Anomaly");

function sevWeight(r: RuleState): number {
  return (r.severity === "Critical" ? 3 : r.severity === "Advisory" ? 1.6 : 0.4) * (r.status === "ACTIVE" ? 1 : 0.4);
}

/** Minutes to the rule's limit, parsed back from the engine label (first figure). */
function ttlMinutes(label: string): number | null {
  const m = label.match(/^(?:(\d+)h\s*)?(\d+)m/);
  if (m) return Number(m[1] ?? 0) * 60 + Number(m[2]);
  const d = label.match(/^(\d+) d/);
  if (d) return Number(d[1]) * 1440;
  return null;
}

/* ------------------------------------------------------------------ */

const SEV_ORDER: Record<Severity, number> = { Critical: 0, Advisory: 1, Normal: 2 };
const PRIO_ORDER: Record<FailureRisk["priority"], number> = { Immediate: 0, High: 1, Medium: 2, Low: 3 };

function keySensors(f: SimFrame): string[] {
  const out: string[] = [];
  for (const r of activeRules(f).concat(f.rules.filter((r) => r.status === "PENDING"))) {
    for (const tg of r.tags) if (isAnalog(f, tg) && !out.includes(tg)) out.push(tg);
  }
  for (const def of f.defs.signals) {
    const s = f.signals[def.tag];
    if (s && s.status !== "Normal" && s.quality === "Good" && isAnalog(f, s.tag) && !out.includes(s.tag)) {
      out.push(s.tag);
    }
  }
  const preferred = f.defs.plant === "kiln" ? KILN_PREFERRED : f.defs.operatingTags;
  for (const tg of preferred) if (!out.includes(tg) && isAnalog(f, tg) && f.signals[tg]) out.push(tg);
  for (const def of f.defs.signals) {
    if (out.length >= 6) break;
    if (!out.includes(def.tag) && isAnalog(f, def.tag) && f.signals[def.tag]) out.push(def.tag);
  }
  return out.slice(0, 6);
}

function forecastForSignal(f: SimFrame, tag: string, meta?: DbSensorMeta): Record<string, ForecastSeries> {
  const def = f.defs.signalByTag[tag];
  const sig = f.signals[tag];
  const hist = f.history[tag];
  const current = sig.value ?? 0;
  // Trend of the deviation from the reference model over the last 2 h. A rise
  // the model explains (ambient, feed, speed) is not degradation and is not
  // projected; only an unexplained drift is. It is kept only when it is real:
  // a slope within two standard errors of zero, or worth less than 1 σ over
  // the 2 h, is scatter, and the forecast stays flat at the recent mean.
  const model = f.modelHistory[tag];
  const hasModel = Boolean(model && model.length === hist.length);
  const start = Math.max(0, hist.length - 120);
  const recent: number[] = new Array(hist.length - start);
  for (let i = start; i < hist.length; i++) {
    recent[i - start] = hasModel ? hist[i] - model[i] : hist[i];
  }
  const fit = slopeWithError(recent);
  const significant = Math.abs(fit.slope) > 2 * fit.se && Math.abs(fit.slope * recent.length) >= def.sigma;
  const perMin = significant ? fit.slope : 0;
  let tailSum = 0;
  const tailStart = Math.max(0, hist.length - 10);
  const tailLen = Math.max(1, hist.length - tailStart);
  for (let i = tailStart; i < hist.length; i++) tailSum += hist[i];
  const base = significant ? current : tailSum / tailLen || current;
  // A 2 h trend says little about the day after: extrapolate it 6 h, then hold.
  const damp = (mins: number) => Math.min(mins, 360);
  // Deviation from the model now. When the trend is taking the signal back to
  // the model (recovery), project it only until it gets there, never past it.
  const r0 = hasModel ? current - model[model.length - 1] : 0;
  const returning = perMin !== 0 && Math.sign(perMin) !== Math.sign(r0) && r0 !== 0;
  // limitPair only reads `limit`, which kiln and pyro definitions share; relative limits (pyro D5) at the live model.
  const lim = limitPair(def as SignalDef, undefined, sig.model);
  const hiLimit = resolveLimit(def.limit, sig.model)?.kind === "hi";
  const downsampled = downsample(hist, 30);
  const out: Record<string, ForecastSeries> = {};
  for (const h of HORIZONS) {
    const horizonMin = h.hours * 60;
    const values: number[] = new Array(h.steps);
    const lower: number[] = new Array(h.steps);
    const upper: number[] = new Array(h.steps);
    for (let j = 1; j <= h.steps; j++) {
      const mins = (horizonMin * j) / h.steps;
      const dMins = damp(mins);
      let v = base + perMin * dMins;
      if (returning) v = Math.sign(r0) > 0 ? Math.max(v, current - r0) : Math.min(v, current - r0);
      if (hiLimit) v = Math.min(v, (lim?.alarm ?? v) * 1.25);
      const sd = def.sigma * (1.2 + Math.sqrt(mins / 30)) + Math.abs(perMin) * dMins * 0.25;
      values[j - 1] = v;
      lower[j - 1] = v - sd;
      upper[j - 1] = v + sd;
    }
    const predicted = values[values.length - 1] ?? current;
    const deltaPct = ((predicted - current) / (Math.abs(current) || 1)) * 100;
    const series: ForecastSeries = {
      tag,
      name: def.name,
      unit: def.unit,
      status: sig.status,
      history: downsampled,
      forecast: values,
      lower,
      upper,
      current,
      predicted,
      deltaPct,
      trend: Math.abs(perMin * horizonMin) < def.sigma ? "stable" : perMin > 0 ? "rising" : "falling",
      warning: lim && def.limit?.kind !== "lo" ? lim.warn : lim?.warn ?? null,
      alarm: lim ? lim.alarm : null,
      horizonLabel: h.label,
      confidence: Math.round(clamp(97 - h.hours / 18 - (sig.status === "Normal" ? 0 : 4) - (sig.quality === "Good" ? 0 : 15), 60, 98)),
    };
    out[h.id] = meta ? withDbMeta(series, meta) : series;
  }
  return out;
}

function conditionProjection(f: SimFrame): ConditionPoint[] {
  const scored = healthSystems(f.defs);
  const rates = scored.map((sys) => {
    const rs = machineRules(f.rules.filter((r) => r.status !== "QUIET" && r.system === sys.id));
    return 0.012 + rs.reduce((a, r) => a + sevWeight(r) * 0.18, 0);
  });
  const at = (start: number, rate: number, day: number) => clamp(start - rate * day * (day > 30 ? 0.8 : 1), 20, 100);
  return CONDITION_HORIZONS.map((day) => {
    const systems: Record<string, number> = {};
    const vals = scored.map((sys, i) => (systems[sys.id] = at(f.systems[sys.id].health, rates[i], day)));
    const avg = vals.reduce((a, v) => a + v, 0) / (vals.length || 1);
    return { day, systems, overall: 0.5 * avg + 0.5 * Math.min(...vals) };
  });
}

const LOCATIONS = new WeakMap<PlantDefs, Record<string, SensorLocation>>();

/** Sensor locations from the machine's definitions (cached per defs object). */
function locations(defs: PlantDefs): Record<string, SensorLocation> {
  const hit = LOCATIONS.get(defs);
  if (hit) return hit;
  const out: Record<string, SensorLocation> = {};
  for (const def of defs.signals) {
    out[def.tag] = {
      systemId: def.system,
      system: defs.systems.find((s) => s.id === def.system)?.name ?? def.system,
      subassemblyId: def.sub,
      subassembly: subName(defs, def.sub),
      component: subName(defs, def.sub),
    };
  }
  LOCATIONS.set(defs, out);
  return out;
}

function risks(f: SimFrame): FailureRisk[] {
  const out: FailureRisk[] = machineRules(f.rules.filter((r) => r.status !== "QUIET")).map((r) => {
    const ttl = ttlMinutes(r.timeToLimit);
    const base = r.severity === "Critical" ? 70 : 34;
    const urgency = ttl === null ? 0 : clamp(30 - ttl / 20, 0, 25);
    const p = Math.round(clamp((base + urgency) * (r.status === "ACTIVE" ? 1 : 0.55), 5, 96));
    return {
      id: r.id,
      fault: r.name,
      component: subNames(f.defs, r.subs) || r.system,
      probability: p,
      severity: r.severity,
      window: ttl !== null ? `< ${formatDuration(ttl * 1.3)}` : r.severity === "Critical" ? "< 72 h" : "< 30 d",
      priority: r.severity === "Critical" ? "Immediate" : r.status === "ACTIVE" ? "High" : "Medium",
    };
  });
  // Baseline exposure for the sub-assemblies with no finding.
  for (const sa of machineSubs(f.defs)) {
    if (out.some((o) => o.component.includes(sa.name))) continue;
    const cell = f.subs[sa.id];
    if (!cell) continue;
    out.push({
      id: `base-${sa.id}`,
      fault: `${sa.name} functional failure`,
      component: sa.name,
      probability: Math.round(clamp((100 - cell.health) * 0.6, 1, 40)),
      severity: cell.status,
      window: "< 30 d",
      priority: cell.status === "Normal" ? "Low" : "Medium",
    });
  }
  return out.sort(
    (a, b) =>
      Number(a.id.startsWith("base-")) - Number(b.id.startsWith("base-")) ||
      SEV_ORDER[a.severity] - SEV_ORDER[b.severity] ||
      PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority],
  );
}

export function rul(f: SimFrame): RulItem[] {
  return machineSubs(f.defs)
    .filter((sa) => f.subs[sa.id])
    .map((sa) => {
      const cell = f.subs[sa.id];
      const rs = machineRules(f.rules.filter((r) => r.status !== "QUIET" && r.subs.includes(sa.id)));
      const ttls = rs.map((r) => ttlMinutes(r.timeToLimit)).filter((x): x is number => x !== null);
      let hours: number;
      if (ttls.length) hours = Math.max(1, Math.min(...ttls) / 60 + (rs.some((r) => r.severity === "Critical") ? 2 : 24));
      else if (rs.length) hours = rs.some((r) => r.severity === "Critical") ? 24 : 240;
      else hours = Math.round(6000 * (cell.health / 100) ** 2);
      const status: Severity = hours < 72 ? "Critical" : hours < 720 ? "Advisory" : "Normal";
      const days = Math.round(hours / 24);
      return {
        id: sa.id,
        name: sa.name,
        component: sa.name,
        health: cell.health,
        hours: Math.round(hours),
        days,
        confidence: Math.round(clamp(rs.length ? 70 + rs[0].confidence * 0.25 : 90, 60, 97)),
        status,
        dueLabel: hours < 48 ? `${Math.round(hours)} h` : days < 45 ? `${days} d` : `${Math.round(days / 30)} mo`,
      };
    })
    .sort((a, b) => SEV_ORDER[a.status] - SEV_ORDER[b.status]);
}

function anomalies(f: SimFrame): { items: AnomalyItem[]; timeline: number[] } {
  const items: AnomalyItem[] = [];
  const n = f.times.length;
  for (const s of Object.values(f.signals)) {
    const def = f.defs.signalByTag[s.tag];
    if (!def) continue;
    if (s.quality !== "Good") {
      items.push({ tag: s.tag, name: def.name, component: subName(f.defs, def.sub), score: 0.5, severity: "Advisory", deviation: s.qualityNote ?? `Data ${s.quality.toLowerCase()}`, onset: "sensor validation" });
      continue;
    }
    if (s.z === null || Math.abs(s.z) < 3) continue;
    const h = f.history[s.tag];
    const mh = f.modelHistory[s.tag];
    let k = 0;
    while (k < n && Math.abs((h[n - 1 - k] - mh[n - 1 - k]) / (def.sigma || 1)) > 3) k++;
    const covered = f.rules.some((r) => r.status !== "QUIET" && r.tags.includes(s.tag) && r.category !== "Anomaly");
    items.push({
      tag: s.tag,
      name: def.name,
      component: subName(f.defs, def.sub),
      score: clamp(Math.abs(s.z) / 12, 0.25, 1),
      severity: Math.abs(s.z) > 8 || s.limitSeverity === "Critical" ? "Critical" : "Advisory",
      deviation: `${s.z >= 0 ? "+" : "−"}${Math.abs(s.z).toFixed(1)}σ vs model${covered ? "" : " · no known pattern"}`,
      onset: `${formatDuration(k)} ago`,
    });
  }
  items.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
  // 24 buckets × 15 min = the last 6 h: signal-minutes off the model by more
  // than 3σ for at least 3 consecutive minutes. Single-sample blips are normal
  // scatter (46 signals give a few per bucket) and are not anomaly activity.
  const SUSTAIN = 3;
  const timeline = new Array(24).fill(0);
  for (const tag of Object.keys(f.history)) {
    const def = f.defs.signalByTag[tag];
    if (!def || def.type !== "analog" || !f.modelHistory[tag]) continue;
    const h = f.history[tag];
    const mh = f.modelHistory[tag];
    let run = 0;
    for (let i = 0; i < n; i++) {
      run = Math.abs((h[i] - mh[i]) / (def.sigma || 1)) > 3 ? run + 1 : 0;
      if (run === SUSTAIN) for (let k = i - SUSTAIN + 1; k <= i; k++) timeline[Math.min(23, Math.floor((k / n) * 24))] += 1;
      else if (run > SUSTAIN) timeline[Math.min(23, Math.floor((i / n) * 24))] += 1;
    }
  }
  return { items, timeline };
}

/** Live reading and model residual for each sensor a rule cites. */
function evidenceFor(f: SimFrame, tags: string[]): SourceEvidence[] {
  return tags
    .filter((tg) => f.signals[tg] && f.defs.signalByTag[tg])
    .map((tg) => {
      const s = f.signals[tg];
      const def = f.defs.signalByTag[tg];
      const z = s.z === null ? "" : ` · ${s.z >= 0 ? "+" : "−"}${Math.abs(s.z).toFixed(1)}σ vs model`;
      const unit = def.type === "analog" && def.unit && !s.display.includes(def.unit) ? ` ${def.unit}` : "";
      return { tag: tg, label: def.name, detail: `${s.display}${unit}${z}`, severity: s.status };
    });
}

function sources(f: SimFrame): IssueSource[] {
  const rs = f.rules.filter((r) => r.status !== "QUIET" && r.category !== "Data quality").sort((a, b) => sevWeight(b) - sevWeight(a));
  const total = rs.reduce((a, r) => a + sevWeight(r), 0) || 1;
  const out: IssueSource[] = rs.map((r) => ({
    id: r.id,
    cause: `${r.name} — ${r.cause}`,
    subsystem: subNames(f.defs, r.subs) || (r.category === "Anomaly" ? "Unclassified" : r.system),
    contribution: clamp((sevWeight(r) / total) * 100, 4, 100),
    confidence: r.confidence || 60,
    severity: r.severity,
    evidence: evidenceFor(f, r.tags),
  }));
  const dq = f.rules.filter((r) => r.status !== "QUIET" && r.category === "Data quality");
  for (const r of dq) {
    out.push({ id: r.id, cause: `${r.name} — instrument, not machine`, subsystem: r.tags.join(", "), contribution: 6, confidence: r.confidence || 60, severity: "Advisory", evidence: evidenceFor(f, r.tags) });
  }
  if (!out.length) {
    out.push({ id: "src-baseline", cause: "No active issue source — every signal within ±3σ of the reference model", subsystem: "All sub-assemblies", contribution: 100, confidence: 97, severity: "Normal", evidence: [] });
  }
  return out;
}

function faults(f: SimFrame): FaultClass[] {
  const out: FaultClass[] = f.rules
    .filter((r) => r.status !== "QUIET")
    .sort((a, b) => sevWeight(b) - sevWeight(a))
    .map((r) => ({ id: r.id, label: `${r.id} ${r.name}`, probability: r.status === "ACTIVE" ? r.confidence : Math.round(r.confidence * 0.6), severity: r.severity, band: r.category }));
  if (!out.length) out.push({ id: "nominal", label: "Healthy signature — no fault pattern above threshold", probability: 97, severity: "Normal", band: `${f.defs.rules.length} rules quiet` });
  return out;
}

function degradation(f: SimFrame): DegradationItem[] {
  return machineSubs(f.defs)
    .filter((sa) => f.subs[sa.id])
    .map((sa) => {
      const cell = f.subs[sa.id];
      const stageIndex = clamp(Math.round((100 - cell.health) / 14), 0, 5);
      const firing = f.rules.some((r) => r.status !== "QUIET" && r.subs.includes(sa.id) && r.category !== "Data quality" && r.category !== "Anomaly");
      return { id: sa.id, name: sa.name, stageIndex, stageLabel: DEGRADATION_STAGES[stageIndex], health: cell.health, trend: (firing ? "falling" : "stable") as DegradationItem["trend"] };
    })
    .sort((a, b) => b.stageIndex - a.stageIndex);
}

function actions(f: SimFrame): MaintenanceAction[] {
  const rs = f.rules.filter((r) => r.status !== "QUIET").sort((a, b) => sevWeight(b) - sevWeight(a));
  const out: MaintenanceAction[] = rs.map((r) => {
    const ttl = ttlMinutes(r.timeToLimit);
    const dq = r.category === "Data quality" || r.category === "Anomaly";
    return {
      id: r.id,
      title: r.action,
      component: subNames(f.defs, r.subs) || r.tags.join(", ") || r.system,
      priority: dq ? "Medium" : r.severity === "Critical" ? "Immediate" : r.status === "ACTIVE" ? "High" : "Medium",
      window: r.priority === "P1" ? "Now" : dq ? "Next walk-down" : ttl !== null ? `Before limit (${formatDuration(ttl)})` : "Next planned stop",
      eta: r.priority === "P1" ? "≤ 1 h" : dq ? "≤ 8 h" : "≤ 24 h",
      confidence: r.confidence || 60,
      rationale: `${r.evidence}. ${r.consequence}.`,
    };
  });
  if (!out.length) {
    out.push({ id: "routine", title: "Continue condition-based monitoring", component: "All sub-assemblies", priority: "Low", window: "Routine schedule", eta: "—", confidence: 97, rationale: f.defs.plant === "kiln" ? "No finding confirmed. Monthly condition report per D4 §11 acceptance." : "No finding confirmed." });
  }
  return out;
}

function features(f: SimFrame): FeatureWeight[] {
  // Stable selection of 6 key signals (rule inputs -> alert signals -> operating tags) so rows never jump on random noise.
  const tags = keySensors(f);
  const contrib = tags.map((tag) => {
    const s = f.signals[tag];
    const z = s?.z ?? 0;
    const w = Math.max(0.5, Math.abs(z) - 0.5) + (s && s.status !== "Normal" ? 3 : 0);
    return { tag, w };
  });
  const total = contrib.reduce((a, c) => a + c.w, 0) || 1;
  return contrib.map((c) => ({
    id: c.tag,
    tag: c.tag,
    label: f.defs.signalByTag[c.tag]?.name ?? c.tag,
    weight: Math.round(clamp((c.w / total) * 100, 1, 100)),
  }));
}

function reasoning(f: SimFrame, src: IssueSource[]): ReasoningStep[] {
  const p = f.pipeline;
  const top = src[0];
  const hot: Severity = top && top.severity !== "Normal" ? top.severity : "Normal";
  const isVpc = Boolean(f.defs.signalByTag["T1"] && f.defs.signalByTag["P2"]);
  const modelDetail = isVpc
    ? `${p.beyond3s} signals beyond 3σ · melt T1 ${(f.signals["T1"]?.value ?? 1020).toFixed(0)} °C · flask vac P2 ${(f.signals["P2"]?.value ?? 300).toFixed(0)} mbar`
    : `${p.beyond3s} signals beyond 3σ · ambient est. ${f.drivers.ambientEst.toFixed(1)} °C · feed ${f.drivers.feed.toFixed(0)} t/h`;
  return [
    { id: "quality", label: "1 · Data quality", detail: `${p.valid} valid · ${p.held} held · ${p.invalid} invalid · ${p.suspect} suspect`, status: p.invalid + p.suspect > 0 ? "Advisory" : "Normal" },
    { id: "model", label: "2 · Reference model", detail: modelDetail, status: p.beyond3s > 0 ? "Advisory" : "Normal" },
    { id: "rules", label: "3 · Rules", detail: `${p.evaluated} evaluated · ${p.matching} matching`, status: hot },
    { id: "confirm", label: "4 · Confirmation", detail: `${p.confirmed} confirmed · ${p.pending} pending (persistence 2–4 samples, hysteresis 4)`, status: p.confirmed > 0 ? hot : "Normal" },
    { id: "action", label: "5 · Action", detail: `P1 ${p.p1} · P2 ${p.p2} · P3 ${p.p3}${top && top.severity !== "Normal" ? ` — ${top.cause}` : ""}`, status: p.p1 > 0 ? "Critical" : p.p2 > 0 ? "Advisory" : "Normal" },
  ];
}

/**
 * Every analog signal on the machine, key sensors first, then the rest by
 * status and canonical definition order. State signals (switches, run status)
 * carry no numeric trend, so they have no forecast.
 */
function forecastTags(f: SimFrame, keys: string[]): string[] {
  const rank = (tg: string) => {
    const s = f.signals[tg];
    return s.status === "Critical" ? 200 : s.status === "Advisory" ? 100 : 0;
  };
  const rest = Object.keys(f.signals)
    .filter((tg) => isAnalog(f, tg) && !keys.includes(tg))
    .sort((a, b) => rank(b) - rank(a));
  return keys.concat(rest);
}

/** One sensor row of the machine's DB catalog (mapped_signals). */
export interface DbSensorMeta {
  tag: string;
  name: string;
  unit: string;
  numericValue: number;
  status: Severity;
  warningVal: number;
  alarmVal: number;
  systemId: string;
  system: string;
  subassemblyId: string;
  subAssembly: string;
  component: string;
}

const isState = (unit: string) => unit.trim().toLowerCase() === "state";

/** DB limits win; 0/0 means "none stored", so the engine limit stays. */
function withDbMeta(series: ForecastSeries, db: DbSensorMeta): ForecastSeries {
  const hasLimits = !(db.warningVal === 0 && db.alarmVal === 0);
  return {
    ...series,
    name: db.name || series.name,
    unit: db.unit || series.unit,
    warning: hasLimits ? db.warningVal : series.warning,
    alarm: hasLimits ? db.alarmVal : series.alarm,
  };
}

/** A DB sensor the engine does not simulate: its stored value, no invented trend. */
function storedSeries(db: DbSensorMeta, h: ForecastHorizon): ForecastSeries {
  const v = db.numericValue;
  const hasLimits = !(db.warningVal === 0 && db.alarmVal === 0);
  return {
    tag: db.tag,
    name: db.name,
    unit: db.unit,
    status: db.status,
    history: [v],
    forecast: new Array(h.steps).fill(v),
    lower: new Array(h.steps).fill(v),
    upper: new Array(h.steps).fill(v),
    current: v,
    predicted: v,
    deltaPct: 0,
    trend: "stable",
    warning: hasLimits ? db.warningVal : null,
    alarm: hasLimits ? db.alarmVal : null,
    horizonLabel: h.label,
    confidence: 0,
  };
}

const INSIGHTS_CACHE = new WeakMap<SimFrame, Map<string, InsightsResponse>>();

/**
 * `db` is the machine's DB catalog. When given, it decides which sensors the
 * payload covers (every numeric mapped signal) and their names, units, limits
 * and locations; the engine supplies live values, history and model.
 */
export function buildLiveInsights(f: SimFrame, machineId: string, db: DbSensorMeta[] = []): InsightsResponse {
  const cacheKey = `${machineId}:${db.length}`;
  let frameCache = INSIGHTS_CACHE.get(f);
  if (frameCache) {
    const cached = frameCache.get(cacheKey);
    if (cached) return cached;
  } else {
    frameCache = new Map();
    INSIGHTS_CACHE.set(f, frameCache);
  }

  const dbByTag = new Map(db.map((d) => [d.tag, d]));
  const inDb = (tg: string) => !db.length || dbByTag.has(tg);
  const keys = keySensors(f).filter(inDb);
  const simulated = forecastTags(f, keys).filter(inDb);
  const dbOnly = db.filter((d) => !isState(d.unit) && !f.signals[d.tag]);
  const forecasts: InsightsResponse["prognosis"]["forecasts"] = {};
  for (const tg of simulated) {
    forecasts[tg] = forecastForSignal(f, tg, dbByTag.get(tg));
  }
  for (const d of dbOnly) {
    forecasts[d.tag] = {};
    for (const h of HORIZONS) forecasts[d.tag][h.id] = storedSeries(d, h);
  }
  // Every simulated sensor has measured history; pre-normalize the 4h, baseline (0..-60) and recent (-60) slices once per tag.
  const matrixTags = simulated;
  const mLen = matrixTags.length;
  const vec240 = matrixTags.map((tg) => normSlice(f.history[tg], -240, f.history[tg].length));
  const vecBase = matrixTags.map((tg) => {
    const arr = f.history[tg];
    const start = Math.max(0, arr.length - 240);
    const end = Math.max(start, arr.length - 60);
    return normSlice(arr, start, end);
  });
  const vecRec = matrixTags.map((tg) => normSlice(f.history[tg], -60, f.history[tg].length));

  const matrix: number[][] = Array.from({ length: mLen }, () => new Array(mLen).fill(0));
  const pairs: CorrelationPair[] = [];
  for (let i = 0; i < mLen; i++) {
    matrix[i][i] = 1;
    for (let j = i + 1; j < mLen; j++) {
      const r = dotNorm(vec240[i], vec240[j]);
      matrix[i][j] = r;
      matrix[j][i] = r;
      const n = Math.min(vec240[i].z.length, vec240[j].z.length);
      if (n >= 3) {
        pairs.push({
          a: matrixTags[i],
          b: matrixTags[j],
          r,
          n,
          baseline: dotNorm(vecBase[i], vecBase[j]),
          recent: dotNorm(vecRec[i], vecRec[j]),
        });
      }
    }
  }
  pairs.sort((x, y) => Math.round(Math.abs(y.r) * 10) - Math.round(Math.abs(x.r) * 10));

  const infl: InsightsResponse["prognosis"]["influences"] = {};
  for (let i = 0; i < mLen; i++) {
    const driver = matrixTags[i];
    const dSd = vec240[i].sd;
    const links: InfluenceLink[] = [];
    for (let j = 0; j < mLen; j++) {
      if (i === j) continue;
      const tg = matrixTags[j];
      const r = matrix[i][j];
      const def = f.defs.signalByTag[tg];
      links.push({
        tag: tg,
        name: def.name,
        unit: def.unit,
        coefficient: r,
        delta: r * dSd,
        direction: r >= 0 ? ("up" as const) : ("down" as const),
      });
    }
    links.sort((a, b) => Math.round(Math.abs(b.coefficient) * 10) - Math.round(Math.abs(a.coefficient) * 10));
    infl[driver] = links.slice(0, 6);
  }
  for (const d of dbOnly) infl[d.tag] = [];

  const an = anomalies(f);
  const src = sources(f);
  const top = activeRules(f)[0];
  const result: InsightsResponse = {
    machineId,
    generatedAt: `${f.day > 0 ? `D+${f.day} ` : ""}${f.clock} (simulated)`,
    keySensors: keys,
    prognosis: {
      horizons: HORIZONS,
      forecasts,
      correlation: { tags: matrixTags, matrix, pairs },
      influences: infl,
      condition: {
        horizons: CONDITION_HORIZONS,
        systems: healthSystems(f.defs).map((s) => ({ id: s.id, name: s.name })),
        points: conditionProjection(f),
      },
      locations: db.length
        ? Object.fromEntries(
            db.map((d) => [
              d.tag,
              { systemId: d.systemId, system: d.system || d.systemId, subassemblyId: d.subassemblyId, subassembly: d.subAssembly, component: d.component || d.subAssembly },
            ]),
          )
        : locations(f.defs),
      risks: risks(f),
      rul: rul(f),
      anomalies: an.items,
      anomalyTimeline: an.timeline,
    },
    analysis: {
      model: {
        healthIndex: f.overall,
        confidence: top ? top.confidence : 96,
        inputs: db.length || Object.keys(f.signals).length,
        condition: f.condition === "Healthy" ? "Nominal" : f.condition,
        engine:
          f.defs.plant === "kiln"
            ? "ULTRON reference model (D5 Table 9.5) · 21-rule library"
            : f.defs.signalByTag["T1"] && f.defs.signalByTag["P2"]
              ? `ULTRON VPC 066 reference model (§7.4) · ${f.defs.rules.length}-rule library`
              : `ULTRON operating-state reference model (D4-OSW-PE-PYR) · ${f.defs.rules.length}-rule library`,
      },
      sources: src,
      faults: faults(f),
      degradation: { stages: DEGRADATION_STAGES, items: degradation(f) },
      actions: actions(f),
      features: features(f),
      reasoning: reasoning(f, src),
    },
  };
  frameCache.set(cacheKey, result);
  return result;
}
