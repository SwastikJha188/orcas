/**
 * Analysis page · pure derivations.
 *
 * Inputs are the insights payload (`useMachineInsights`) and, for live
 * machines (kiln fleet, pyro line), the running simulation frame; the machine
 * is described by `frame.defs`. Nothing here invents values: when a
 * figure is computed on the page it is marked "calc." where it is shown, and
 * when the data does not carry a figure the section shows what is missing.
 */
import type { InsightsResponse, RulItem, Severity } from "@/server/services/insights-service";
import type { SimFrame, RuleState } from "@/lib/kiln-sim/engine";
import type { PlantDefs } from "@/lib/plant-defs";
import type { AssetMachine } from "../assets-data";
import type { AssetsSubPage } from "../assets-view";
import type { Tone } from "../assets-shell-ui";
import { realFaults, realSources } from "./an-ui";

export type Insights = InsightsResponse;

/** Props every Analysis section receives. */
export interface SectionProps {
  machine: AssetMachine;
  insights: Insights;
  /** Live frame for machines on a demonstration engine (kiln fleet, pyro line); null for stored snapshots. */
  frame: SimFrame | null;
  go: (sub: AssetsSubPage) => void;
}

export const SECTION_IDS = {
  summary: "an-summary",
  detection: "an-detection",
  diagnosis: "an-diagnosis",
  degradation: "an-degradation",
  explanation: "an-explanation",
  actions: "an-actions",
  quality: "an-quality",
} as const;

/** Three-class health (engine bands 85 / 60): healthy / attention required / poor condition. */
export function healthClass(h: number): { label: string; tone: Tone } {
  if (h >= 85) return { label: "Healthy", tone: "good" };
  if (h >= 60) return { label: "Attention required", tone: "warn" };
  return { label: "Poor condition", tone: "bad" };
}

export const sevToTone = (s: Severity): Tone => (s === "Critical" ? "bad" : s === "Advisory" ? "warn" : "good");

/** Number with engineering precision. */
export function fmt(v: number | null | undefined, decimals?: number): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  if (decimals !== undefined) return v.toFixed(decimals);
  const a = Math.abs(v);
  if (a >= 1000) return Math.round(v).toLocaleString();
  if (a >= 100) return v.toFixed(0);
  if (a >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

export const sigma = (z: number) => `${z >= 0 ? "+" : "−"}${Math.abs(z).toFixed(1)}σ`;

/** Hours as h below 72 h, d below a year, else y. */
export function durationText(hours: number): string {
  if (!Number.isFinite(hours)) return "—";
  if (hours < 72) return `${Math.max(0, Math.round(hours))} h`;
  if (hours < 8760) return `${Math.round(hours / 24)} d`;
  return `${(hours / 8760).toFixed(1)} y`;
}

export const firstIntervention = (rul: RulItem[]): RulItem | null =>
  rul.reduce<RulItem | null>((m, r) => (m === null || r.hours < m.hours ? r : m), null);

/* ------------------------------------------------------------------ */
/* Detection (live kiln): expected vs actual per signal               */
/* ------------------------------------------------------------------ */

export type MonitoringKind = "condition" | "process";

export interface DetectionRow {
  tag: string;
  name: string;
  unit: string;
  sub: string;
  system: string;
  kind: MonitoringKind;
  expected: number | null;
  actual: number | null;
  residual: number | null;
  z: number | null;
  sigma: number;
  decimals: number;
  quality: "Good" | "Suspect" | "Invalid";
  qualityNote: string | null;
  status: Severity;
  /** Consecutive most-recent samples beyond 3σ (calc.). */
  persistence: number;
  /** Rules (non-anomaly) that cite this signal and are pending or active. */
  rules: string[];
  timeToLimit: string | null;
}

/** Threshold a residual must exceed to count as anomalous (D5 §9: ±3σ band). */
export const Z_ANOMALY = 3;
/** R-ANM-01: signals far from model with no known pattern (D5 Table 9.7). */
export const Z_UNCLASSIFIED = 6;

const subName = (defs: PlantDefs, id: string) => defs.subassemblies.find((x) => x.id === id)?.name ?? id;
const systemName = (defs: PlantDefs, id: string) => defs.systems.find((x) => x.id === id)?.name ?? id;
/** Process-context systems (exit gas, feed / fuel) vs machine condition. */
const kindOf = (defs: PlantDefs, system: string): MonitoringKind => (defs.processSystems.includes(system) ? "process" : "condition");

export function detectionRows(f: SimFrame): DetectionRow[] {
  const n = f.times.length;
  const defs = f.defs;
  const firing = f.rules.filter((r) => r.status !== "QUIET" && r.category !== "Anomaly");
  const out: DetectionRow[] = [];
  for (const s of Object.values(f.signals)) {
    const def = defs.signalByTag[s.tag];
    if (!def || def.type !== "analog") continue;
    const h = f.history[s.tag] ?? [];
    const mh = f.modelHistory[s.tag] ?? [];
    let k = 0;
    if (h.length === n && mh.length === n) {
      while (k < n && Math.abs((h[n - 1 - k] - mh[n - 1 - k]) / (def.sigma || 1)) > Z_ANOMALY) k++;
    }
    out.push({
      tag: s.tag,
      name: def.name,
      unit: def.unit,
      sub: subName(defs, def.sub),
      system: systemName(defs, def.system),
      kind: kindOf(defs, def.system),
      expected: s.model,
      actual: s.value,
      residual: s.residual,
      z: s.z,
      sigma: def.sigma,
      decimals: def.decimals,
      quality: s.quality,
      qualityNote: s.qualityNote,
      status: s.status,
      persistence: k,
      rules: firing.filter((r) => r.tags.includes(s.tag)).map((r) => r.id),
      timeToLimit: s.timeToLimit,
    });
  }
  return out;
}

export const isAnomalous = (r: DetectionRow) => r.quality === "Good" && r.z !== null && Math.abs(r.z) > Z_ANOMALY;
/** Beyond 3σ with no supported known-fault rule: an unknown anomaly. */
export const isUnknown = (r: DetectionRow) => isAnomalous(r) && r.rules.length === 0;

/* ------------------------------------------------------------------ */
/* Rules (live kiln)                                                  */
/* ------------------------------------------------------------------ */

export const liveRules = (f: SimFrame | null): RuleState[] =>
  f ? f.rules.filter((r) => r.status !== "QUIET").sort((a, b) => rank(b) - rank(a)) : [];

function rank(r: RuleState): number {
  return (r.status === "ACTIVE" ? 100 : 0) + (r.severity === "Critical" ? 20 : r.severity === "Advisory" ? 10 : 0) + r.confidence / 10;
}

export const ruleById = (f: SimFrame | null, id: string): RuleState | undefined => f?.rules.find((r) => r.id === id);

/** Health per scored system / sub-assembly from the live frame. */
export function liveHealth(f: SimFrame) {
  return f.defs.systems.map((sys) => ({
    id: sys.id,
    name: sys.name,
    scored: sys.scored,
    health: f.systems[sys.id]?.health ?? null,
    status: f.systems[sys.id]?.status ?? ("Normal" as Severity),
    history: (f.healthHistory as Record<string, number[]>)[sys.id] ?? [],
    subs: f.defs.subassemblies.filter((s) => s.system === sys.id).map((s) => ({
      id: s.id,
      name: s.name,
      health: f.subs[s.id]?.health ?? null,
      status: f.subs[s.id]?.status ?? ("Normal" as Severity),
    })),
  }));
}

/* ------------------------------------------------------------------ */
/* Machine findings vs instrument findings                            */
/* ------------------------------------------------------------------ */

/** Data-quality rules describe the instrument, not the machine; Model quality shows them. */
const instrumentIds = (a: Insights["analysis"]) =>
  new Set([
    ...a.faults.filter((f) => f.band === "Data quality").map((f) => f.id),
    ...a.sources.filter((s) => /instrument, not machine/i.test(s.cause)).map((s) => s.id),
  ]);

export function machineFaults(a: Insights["analysis"]) {
  const skip = instrumentIds(a);
  return realFaults(a).filter((f) => !skip.has(f.id));
}

export function machineSources(a: Insights["analysis"]) {
  const skip = instrumentIds(a);
  return realSources(a).filter((s) => !skip.has(s.id));
}

/** Evidence detail from the live frame when there is one (same instant as Detection), else the payload's text. */
export function liveDetail(f: SimFrame | null, tag: string, fallback: string): string {
  const z = f?.signals[tag]?.z;
  return z === null || z === undefined ? fallback : `${sigma(z)} vs model`;
}

/* ------------------------------------------------------------------ */
/* Residual matrix, Σz² statistic, process chain, episodes (live)     */
/* ------------------------------------------------------------------ */

export interface MatrixRow {
  tag: string;
  name: string;
  system: string;
  kind: MonitoringKind;
  /** Mean |z| per time bucket, oldest first; null where the bucket has no model. */
  cells: (number | null)[];
}

/** |residual σ| per analog signal × time bucket (bucket = mean |z|, which suppresses single-sample chatter), grouped by sub-assembly in `defs` order (calc.). */
export function residualMatrix(f: SimFrame, buckets = 36): { rows: MatrixRow[]; minutes: number } {
  const n = f.times.length;
  const size = Math.max(1, Math.ceil(n / buckets));
  const order = new Map(f.defs.subassemblies.map((s, i) => [s.id, i]));
  const defs = f.defs.signals
    .filter((d) => d.type === "analog" && f.history[d.tag] && f.modelHistory[d.tag])
    .sort((a, b) => (order.get(a.sub) ?? 0) - (order.get(b.sub) ?? 0));
  const rows = defs.map((d) => {
    const h = f.history[d.tag];
    const m = f.modelHistory[d.tag];
    const cells: (number | null)[] = [];
    for (let b = 0; b < Math.ceil(n / size); b++) {
      let sum = 0;
      let k = 0;
      for (let i = b * size; i < Math.min(n, (b + 1) * size); i++) {
        if (!Number.isFinite(h[i]) || !Number.isFinite(m[i])) continue;
        sum += Math.abs((h[i] - m[i]) / (d.sigma || 1));
        k++;
      }
      cells.push(k ? sum / k : null);
    }
    return { tag: d.tag, name: d.name, system: systemName(f.defs, d.system), kind: kindOf(f.defs, d.system), cells };
  });
  return { rows, minutes: size };
}

/** χ² quantile (Wilson–Hilferty approximation). */
export function chi2Quantile(df: number, zScore: number): number {
  const k = 2 / (9 * df);
  return df * (1 - k + zScore * Math.sqrt(k)) ** 3;
}

/**
 * Σz² over the analog signals each minute: Hotelling T² with a diagonal
 * (independent-residual) covariance, against χ² limits (calc.). No PCA model
 * exists, so SPE/Q is not available.
 */
export function sumZ2Series(f: SimFrame): { values: number[]; df: number; l95: number; l99: number } {
  const defs = f.defs.signals.filter((d) => d.type === "analog" && f.history[d.tag] && f.modelHistory[d.tag]);
  const n = f.times.length;
  const values = new Array(n).fill(0);
  for (const d of defs) {
    const h = f.history[d.tag];
    const m = f.modelHistory[d.tag];
    for (let i = 0; i < n; i++) {
      const z = (h[i] - m[i]) / (d.sigma || 1);
      if (Number.isFinite(z)) values[i] += z * z;
    }
  }
  const df = defs.length || 1;
  return { values, df, l95: chi2Quantile(df, 1.645), l99: chi2Quantile(df, 2.326) };
}

/** Max |z| per minute over valid analog signals (calc.). */
export function maxZSeries(f: SimFrame): number[] {
  const defs = f.defs.signals.filter((d) => d.type === "analog" && f.history[d.tag] && f.modelHistory[d.tag]);
  const n = f.times.length;
  const out = new Array(n).fill(0);
  for (const d of defs) {
    const h = f.history[d.tag];
    const m = f.modelHistory[d.tag];
    for (let i = 0; i < n; i++) {
      const z = Math.abs((h[i] - m[i]) / (d.sigma || 1));
      if (Number.isFinite(z) && z > out[i]) out[i] = z;
    }
  }
  return out;
}

/** Kiln-seal fleet flow order: material and gas path first, then drive and support. */
const KILN_FLOW: string[] = ["feed-fuel", "kiln-inlet", "inlet-seal", "shell-refractory", "outlet-seal", "burner-hood", "main-motor", "gearbox", "pinion-gear", "lubrication", "auxiliary-drive", "station-1", "station-2", "station-3", "thrust"];

/** Process-flow order of the machine's sub-assemblies. Pyro sub-assemblies are defined in process order. */
function flowOrder(defs: PlantDefs): string[] {
  return defs.plant === "kiln" ? KILN_FLOW : defs.subassemblies.map((s) => s.id);
}

export interface ChainNode {
  id: string;
  name: string;
  /** Minutes since the sub-assembly's earliest signal left the ±3σ band (current run). */
  minutesAgo: number;
  tags: string[];
}

/** Sub-assemblies currently off model, in process flow order, with first-deviation time (calc. from persistence). */
export function deviationChain(f: SimFrame): ChainNode[] {
  const rows = detectionRows(f).filter(isAnomalous);
  const subOf = (tag: string) => f.defs.signalByTag[tag]?.sub ?? "";
  return flowOrder(f.defs).map((id) => {
    const mine = rows.filter((r) => subOf(r.tag) === id);
    return { id, name: subName(f.defs, id), minutesAgo: Math.max(0, ...mine.map((r) => r.persistence)), tags: mine.map((r) => r.tag) };
  }).filter((n) => n.tags.length > 0);
}

export interface Episode {
  ruleId: string;
  name: string;
  confirmedT: number;
  confirmedClock: string;
  clearedClock: string | null;
  minutes: number;
  actions: string[];
}

/** Rule episodes from the engine's event log (confirmed → cleared), newest first. */
export function episodes(f: SimFrame): Episode[] {
  const evs = [...f.events].sort((a, b) => a.t - b.t);
  const open = new Map<string, Episode>();
  const out: Episode[] = [];
  for (const e of evs) {
    if (e.kind === "rule") {
      const m = /^((?:R|SW)-[A-Z]+-\d+)\s+(.*)\s+(confirmed|cleared)$/.exec(e.title);
      if (!m) continue;
      const [, id, name, what] = m;
      if (what === "confirmed") {
        const ep: Episode = { ruleId: id, name, confirmedT: e.t, confirmedClock: e.clock, clearedClock: null, minutes: f.t - e.t, actions: [] };
        open.set(id, ep);
        out.push(ep);
      } else {
        const ep = open.get(id);
        if (ep) {
          ep.clearedClock = e.clock;
          ep.minutes = e.t - ep.confirmedT;
          open.delete(id);
        }
      }
    } else if (e.kind === "action" && e.action) {
      const ep = open.get(e.action.ruleId);
      if (ep) ep.actions.push(`${e.action.kind}${e.action.auto ? " (auto)" : ""}`);
    }
  }
  return out.reverse();
}
