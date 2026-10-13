/**
 * Prognosis & Analysis payload computed from the live KLN-01 frame.
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
import { SIGNAL_BY_TAG, SUBASSEMBLIES, SYSTEMS, limitPair, type SubassemblyId } from "./signals";
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
const PREFERRED = ["VIB-KLN-01", "VIB-KLN-02", "TMP-KLN-21", "TMP-KLN-05", "PRS-KLN-07", "VIB-KLN-04", "TMP-KLN-22", "CAL-KLN-03", "GAS-KLN-01"];

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const subName = (id: SubassemblyId) => SUBASSEMBLIES.find((s) => s.id === id)?.name ?? id;
/** Systems that carry a health score (process context is not scored). */
const HEALTH_SYSTEMS = SYSTEMS.filter((s) => s.scored);

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

function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 3) return 0;
  const xa = a.slice(-n);
  const xb = b.slice(-n);
  const ma = xa.reduce((s, v) => s + v, 0) / n;
  const mb = xb.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    num += (xa[i] - ma) * (xb[i] - mb);
    da += (xa[i] - ma) ** 2;
    db += (xb[i] - mb) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : 0;
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

function keySensors(f: SimFrame): string[] {
  const out: string[] = [];
  for (const r of activeRules(f).concat(f.rules.filter((r) => r.status === "PENDING"))) {
    for (const tg of r.tags) if (SIGNAL_BY_TAG[tg]?.type === "analog" && !out.includes(tg)) out.push(tg);
  }
  const ranked = Object.values(f.signals)
    .filter((s) => s.z !== null && s.quality === "Good")
    .sort((a, b) => Math.abs(b.z!) - Math.abs(a.z!));
  for (const s of ranked) if (Math.abs(s.z!) > 3 && !out.includes(s.tag)) out.push(s.tag);
  for (const tg of PREFERRED) if (!out.includes(tg)) out.push(tg);
  return out.slice(0, 6);
}

function forecast(f: SimFrame, tag: string, h: ForecastHorizon): ForecastSeries {
  const def = SIGNAL_BY_TAG[tag];
  const sig = f.signals[tag];
  const hist = f.history[tag];
  const current = sig.value ?? 0;
  // Trend of the deviation from the reference model over the last 2 h. A rise
  // the model explains (ambient, feed, speed) is not degradation and is not
  // projected; only an unexplained drift is. It is kept only when it is real:
  // a slope within two standard errors of zero, or worth less than 1 σ over
  // the 2 h, is scatter, and the forecast stays flat at the recent mean.
  const model = f.modelHistory[tag];
  const residual = model && model.length === hist.length ? hist.map((v, i) => v - model[i]) : hist;
  const recent = residual.slice(-120);
  const fit = slopeWithError(recent);
  const significant = Math.abs(fit.slope) > 2 * fit.se && Math.abs(fit.slope * recent.length) >= def.sigma;
  const perMin = significant ? fit.slope : 0;
  const tail = hist.slice(-10);
  const base = significant ? current : tail.reduce((a, v) => a + v, 0) / Math.max(1, tail.length) || current;
  const horizonMin = h.hours * 60;
  // A 2 h trend says little about the day after: extrapolate it 6 h, then hold.
  const damp = (mins: number) => Math.min(mins, 360);
  // Deviation from the model now. When the trend is taking the signal back to
  // the model (recovery), project it only until it gets there, never past it.
  const r0 = model && model.length === hist.length ? current - model[model.length - 1] : 0;
  const returning = perMin !== 0 && Math.sign(perMin) !== Math.sign(r0) && r0 !== 0;
  const lim = limitPair(def);
  const values: number[] = [];
  const lower: number[] = [];
  const upper: number[] = [];
  for (let j = 1; j <= h.steps; j++) {
    const mins = (horizonMin * j) / h.steps;
    let v = base + perMin * damp(mins);
    if (returning) v = Math.sign(r0) > 0 ? Math.max(v, current - r0) : Math.min(v, current - r0);
    if (def.limit?.kind === "hi") v = Math.min(v, (lim?.alarm ?? v) * 1.25);
    const sd = def.sigma * (1.2 + Math.sqrt(mins / 30)) + Math.abs(perMin) * damp(mins) * 0.25;
    values.push(v);
    lower.push(v - sd);
    upper.push(v + sd);
  }
  const predicted = values[values.length - 1] ?? current;
  const deltaPct = ((predicted - current) / (Math.abs(current) || 1)) * 100;
  return {
    tag,
    name: def.name,
    unit: def.unit,
    status: sig.status,
    history: downsample(hist, 30),
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
}

function influences(f: SimFrame, driver: string, pool: string[]): InfluenceLink[] {
  const dh = f.history[driver].slice(-240);
  const dMean = dh.reduce((x, y) => x + y, 0) / Math.max(1, dh.length);
  const dSd = Math.sqrt(dh.reduce((a, v) => a + (v - dMean) ** 2, 0) / Math.max(1, dh.length)) || 1;
  return pool
    .filter((tg) => tg !== driver && SIGNAL_BY_TAG[tg].type === "analog")
    .map((tg) => {
      const r = pearson(dh, f.history[tg].slice(-240));
      return { tag: tg, name: SIGNAL_BY_TAG[tg].name, unit: SIGNAL_BY_TAG[tg].unit, coefficient: r, delta: r * dSd, direction: r >= 0 ? ("up" as const) : ("down" as const) };
    })
    .sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient))
    .slice(0, 6);
}

function conditionProjection(f: SimFrame): ConditionPoint[] {
  const rates = HEALTH_SYSTEMS.map((sys) => {
    const rs = machineRules(f.rules.filter((r) => r.status !== "QUIET" && r.system === sys.id));
    return 0.012 + rs.reduce((a, r) => a + sevWeight(r) * 0.18, 0);
  });
  const at = (start: number, rate: number, day: number) => clamp(start - rate * day * (day > 30 ? 0.8 : 1), 20, 100);
  return CONDITION_HORIZONS.map((day) => {
    const systems: Record<string, number> = {};
    const vals = HEALTH_SYSTEMS.map((sys, i) => (systems[sys.id] = at(f.systems[sys.id].health, rates[i], day)));
    const avg = vals.reduce((a, v) => a + v, 0) / (vals.length || 1);
    return { day, systems, overall: 0.5 * avg + 0.5 * Math.min(...vals) };
  });
}

function locations(): Record<string, SensorLocation> {
  const out: Record<string, SensorLocation> = {};
  for (const def of Object.values(SIGNAL_BY_TAG)) {
    out[def.tag] = {
      systemId: def.system,
      system: SYSTEMS.find((s) => s.id === def.system)?.name ?? def.system,
      subassemblyId: def.sub,
      subassembly: subName(def.sub),
      component: subName(def.sub),
    };
  }
  return out;
}

/** Pearson r over the last 4 h for every pair of forecast (analog) signals. */
function correlationPairs(f: SimFrame, tags: string[]): CorrelationPair[] {
  const hist = tags.map((tg) => f.history[tg].slice(-240));
  const out: CorrelationPair[] = [];
  for (let i = 0; i < tags.length; i++) {
    for (let j = i + 1; j < tags.length; j++) {
      const n = Math.min(hist[i].length, hist[j].length);
      if (n < 3) continue;
      // Coupling before the last hour vs within it: a strong pair whose
      // recent r has moved away is a relationship that broke.
      const baseline = pearson(hist[i].slice(0, -60), hist[j].slice(0, -60));
      const recentR = pearson(hist[i].slice(-60), hist[j].slice(-60));
      out.push({ a: tags[i], b: tags[j], r: pearson(hist[i], hist[j]), n, baseline, recent: recentR });
    }
  }
  return out.sort((x, y) => Math.abs(y.r) - Math.abs(x.r));
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
      component: r.subs.map(subName).join(", ") || r.system,
      probability: p,
      severity: r.severity,
      window: ttl !== null ? `< ${formatDuration(ttl * 1.3)}` : r.severity === "Critical" ? "< 72 h" : "< 30 d",
      priority: r.severity === "Critical" ? "Immediate" : r.status === "ACTIVE" ? "High" : "Medium",
    };
  });
  // Baseline exposure for the sub-assemblies with no finding.
  for (const sa of SUBASSEMBLIES.filter((x) => x.system !== "PRC-KLN-01")) {
    if (out.some((o) => o.component.includes(sa.name))) continue;
    const cell = f.subs[sa.id];
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
  return out.sort((a, b) => b.probability - a.probability);
}

function rul(f: SimFrame): RulItem[] {
  return SUBASSEMBLIES.filter((x) => x.system !== "PRC-KLN-01")
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
    .sort((a, b) => a.hours - b.hours);
}

function anomalies(f: SimFrame): { items: AnomalyItem[]; timeline: number[] } {
  const items: AnomalyItem[] = [];
  const n = f.times.length;
  for (const s of Object.values(f.signals)) {
    const def = SIGNAL_BY_TAG[s.tag];
    if (s.quality !== "Good") {
      items.push({ tag: s.tag, name: def.name, component: subName(def.sub), score: 0.5, severity: "Advisory", deviation: s.qualityNote ?? `Data ${s.quality.toLowerCase()}`, onset: "sensor validation" });
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
      component: subName(def.sub),
      score: clamp(Math.abs(s.z) / 12, 0.25, 1),
      severity: Math.abs(s.z) > 8 || s.limitSeverity === "Critical" ? "Critical" : "Advisory",
      deviation: `${s.z >= 0 ? "+" : "−"}${Math.abs(s.z).toFixed(1)}σ vs model${covered ? "" : " · no known pattern"}`,
      onset: `${formatDuration(k)} ago`,
    });
  }
  items.sort((a, b) => b.score - a.score);
  // 24 buckets × 15 min = the last 6 h: signal-minutes off the model by more
  // than 3σ for at least 3 consecutive minutes. Single-sample blips are normal
  // scatter (46 signals give a few per bucket) and are not anomaly activity.
  const SUSTAIN = 3;
  const timeline = new Array(24).fill(0);
  for (const tag of Object.keys(f.history)) {
    const def = SIGNAL_BY_TAG[tag];
    if (def.type !== "analog") continue;
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
    .filter((tg) => f.signals[tg] && SIGNAL_BY_TAG[tg])
    .map((tg) => {
      const s = f.signals[tg];
      const def = SIGNAL_BY_TAG[tg];
      const z = s.z === null ? "" : ` · ${s.z >= 0 ? "+" : "−"}${Math.abs(s.z).toFixed(1)}σ vs model`;
      const unit = def.type === "analog" && def.unit && !s.display.includes(def.unit) ? ` ${def.unit}` : "";
      return { tag: tg, label: def.name, detail: `${s.display}${unit}${z}`, severity: s.status };
    });
}

function sources(f: SimFrame): IssueSource[] {
  const rs = f.rules.filter((r) => r.status !== "QUIET" && r.category !== "Data quality");
  const total = rs.reduce((a, r) => a + sevWeight(r), 0) || 1;
  const out: IssueSource[] = rs.map((r) => ({
    id: r.id,
    cause: `${r.name} — ${r.cause}`,
    subsystem: r.subs.map(subName).join(", ") || (r.category === "Anomaly" ? "Unclassified" : r.system),
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
  return out.sort((a, b) => b.contribution - a.contribution);
}

function faults(f: SimFrame): FaultClass[] {
  const out: FaultClass[] = f.rules
    .filter((r) => r.status !== "QUIET")
    .map((r) => ({ id: r.id, label: `${r.id} ${r.name}`, probability: r.status === "ACTIVE" ? r.confidence : Math.round(r.confidence * 0.6), severity: r.severity, band: r.category }));
  if (!out.length) out.push({ id: "nominal", label: "Healthy signature — no fault pattern above threshold", probability: 97, severity: "Normal", band: "21 rules quiet" });
  return out.sort((a, b) => b.probability - a.probability);
}

function degradation(f: SimFrame): DegradationItem[] {
  return SUBASSEMBLIES.filter((x) => x.system !== "PRC-KLN-01")
    .map((sa) => {
      const cell = f.subs[sa.id];
      const stageIndex = clamp(Math.round((100 - cell.health) / 14), 0, 5);
      const firing = f.rules.some((r) => r.status !== "QUIET" && r.subs.includes(sa.id) && r.category !== "Data quality" && r.category !== "Anomaly");
      return { id: sa.id, name: sa.name, stageIndex, stageLabel: DEGRADATION_STAGES[stageIndex], health: cell.health, trend: (firing ? "falling" : "stable") as DegradationItem["trend"] };
    })
    .sort((a, b) => b.stageIndex - a.stageIndex || a.health - b.health);
}

function actions(f: SimFrame): MaintenanceAction[] {
  const rs = f.rules.filter((r) => r.status !== "QUIET").sort((a, b) => sevWeight(b) - sevWeight(a));
  const out: MaintenanceAction[] = rs.map((r) => {
    const ttl = ttlMinutes(r.timeToLimit);
    const dq = r.category === "Data quality" || r.category === "Anomaly";
    return {
      id: r.id,
      title: r.action,
      component: r.subs.map(subName).join(", ") || r.tags.join(", ") || r.system,
      priority: dq ? "Medium" : r.severity === "Critical" ? "Immediate" : r.status === "ACTIVE" ? "High" : "Medium",
      window: r.priority === "P1" ? "Now" : dq ? "Next walk-down" : ttl !== null ? `Before limit (${formatDuration(ttl)})` : "Next planned stop",
      eta: r.priority === "P1" ? "≤ 1 h" : dq ? "≤ 8 h" : "≤ 24 h",
      confidence: r.confidence || 60,
      rationale: `${r.evidence}. ${r.consequence}.`,
    };
  });
  if (!out.length) {
    out.push({ id: "routine", title: "Continue condition-based monitoring", component: "All sub-assemblies", priority: "Low", window: "Routine schedule", eta: "—", confidence: 97, rationale: "No finding confirmed. Monthly condition report per D4 §11 acceptance." });
  }
  return out;
}

function features(f: SimFrame): FeatureWeight[] {
  const contrib = Object.values(f.signals)
    .filter((s) => s.z !== null && s.quality === "Good")
    .map((s) => ({ tag: s.tag, w: Math.max(0, Math.abs(s.z!) - 1) + (s.status !== "Normal" ? 3 : 0) }));
  const total = contrib.reduce((a, c) => a + c.w, 0) || 1;
  return contrib
    .sort((a, b) => b.w - a.w)
    .slice(0, 6)
    .map((c) => ({ id: c.tag, tag: c.tag, label: SIGNAL_BY_TAG[c.tag].name, weight: Math.round(clamp((c.w / total) * 100, 1, 100)) }));
}

function reasoning(f: SimFrame, src: IssueSource[]): ReasoningStep[] {
  const p = f.pipeline;
  const top = src[0];
  const hot: Severity = top && top.severity !== "Normal" ? top.severity : "Normal";
  return [
    { id: "quality", label: "1 · Data quality", detail: `${p.valid} valid · ${p.held} held · ${p.invalid} invalid · ${p.suspect} suspect`, status: p.invalid + p.suspect > 0 ? "Advisory" : "Normal" },
    { id: "model", label: "2 · Reference model", detail: `${p.beyond3s} signals beyond 3σ · ambient est. ${f.drivers.ambientEst.toFixed(1)} °C · feed ${f.drivers.feed.toFixed(0)} t/h`, status: p.beyond3s > 0 ? "Advisory" : "Normal" },
    { id: "rules", label: "3 · Rules", detail: `${p.evaluated} evaluated · ${p.matching} matching`, status: hot },
    { id: "confirm", label: "4 · Confirmation", detail: `${p.confirmed} confirmed · ${p.pending} pending (persistence 2–4 samples, hysteresis 4)`, status: p.confirmed > 0 ? hot : "Normal" },
    { id: "action", label: "5 · Action", detail: `P1 ${p.p1} · P2 ${p.p2} · P3 ${p.p3}${top && top.severity !== "Normal" ? ` — ${top.cause}` : ""}`, status: p.p1 > 0 ? "Critical" : p.p2 > 0 ? "Advisory" : "Normal" },
  ];
}

/**
 * Every analog signal on the machine, key sensors first, then the rest by
 * status and deviation. State signals (switches, run status) carry no numeric
 * trend, so they have no forecast.
 */
function forecastTags(f: SimFrame, keys: string[]): string[] {
  const rank = (tg: string) => {
    const s = f.signals[tg];
    return (s.status === "Critical" ? 200 : s.status === "Advisory" ? 100 : 0) + Math.abs(s.z ?? 0);
  };
  const rest = Object.keys(f.signals)
    .filter((tg) => SIGNAL_BY_TAG[tg]?.type === "analog" && !keys.includes(tg))
    .sort((a, b) => rank(b) - rank(a));
  return keys.concat(rest);
}

const LOCATIONS = locations();

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

/**
 * `db` is the machine's DB catalog. When given, it decides which sensors the
 * payload covers (every numeric mapped signal) and their names, units, limits
 * and locations; the engine supplies live values, history and model.
 */
export function buildLiveInsights(f: SimFrame, machineId: string, db: DbSensorMeta[] = []): InsightsResponse {
  const dbByTag = new Map(db.map((d) => [d.tag, d]));
  const inDb = (tg: string) => !db.length || dbByTag.has(tg);
  const keys = keySensors(f).filter(inDb);
  const simulated = forecastTags(f, keys).filter(inDb);
  const dbOnly = db.filter((d) => !isState(d.unit) && !f.signals[d.tag]);
  const forecasts: InsightsResponse["prognosis"]["forecasts"] = {};
  for (const tg of simulated) {
    forecasts[tg] = {};
    const meta = dbByTag.get(tg);
    for (const h of HORIZONS) forecasts[tg][h.id] = meta ? withDbMeta(forecast(f, tg, h), meta) : forecast(f, tg, h);
  }
  for (const d of dbOnly) {
    forecasts[d.tag] = {};
    for (const h of HORIZONS) forecasts[d.tag][h.id] = storedSeries(d, h);
  }
  // Every simulated sensor has measured history, so the matrix covers them all.
  const matrixTags = simulated;
  const matrix = matrixTags.map((a) => matrixTags.map((b) => (a === b ? 1 : pearson(f.history[a].slice(-240), f.history[b].slice(-240)))));
  const pool = Object.keys(f.signals);
  const infl: InsightsResponse["prognosis"]["influences"] = {};
  for (const tg of simulated) infl[tg] = influences(f, tg, pool).filter((l) => inDb(l.tag));
  for (const d of dbOnly) infl[d.tag] = [];
  const an = anomalies(f);
  const src = sources(f);
  const top = activeRules(f)[0];
  return {
    machineId,
    generatedAt: `${f.day > 0 ? `D+${f.day} ` : ""}${f.clock} (simulated)`,
    keySensors: keys,
    prognosis: {
      horizons: HORIZONS,
      forecasts,
      correlation: { tags: matrixTags, matrix, pairs: correlationPairs(f, simulated) },
      influences: infl,
      condition: {
        horizons: CONDITION_HORIZONS,
        systems: HEALTH_SYSTEMS.map((s) => ({ id: s.id, name: s.name })),
        points: conditionProjection(f),
      },
      locations: db.length
        ? Object.fromEntries(
            db.map((d) => [
              d.tag,
              { systemId: d.systemId, system: d.system || d.systemId, subassemblyId: d.subassemblyId, subassembly: d.subAssembly, component: d.component || d.subAssembly },
            ]),
          )
        : LOCATIONS,
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
        engine: "ULTRON reference model (D5 Table 9.5) · 21-rule library",
      },
      sources: src,
      faults: faults(f),
      degradation: { stages: DEGRADATION_STAGES, items: degradation(f) },
      actions: actions(f),
      features: features(f),
      reasoning: reasoning(f, src),
    },
  };
}
