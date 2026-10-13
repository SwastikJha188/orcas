/**
 * KLN-01 sensor relationships.
 *
 * Builds the sensor graph from the specification and from data:
 *  - Model links: D5 Table 9.5 reference model. Each equation's inputs are its
 *    upstream sensors; the live sensitivity ∂y/∂x comes from the same equation
 *    evaluated at the current operating point.
 *  - Derived links: calculated signals (CAL-*) and their source signals.
 *  - Rule links: D5 Tables 9.6 / 9.7 associations for status signals, switches
 *    and validation (spray → pinion, oil switches → oil pressure, …).
 *  - Learned links: couplings found in the live history that the spec does not
 *    explain. Residuals (reading − model) are correlated pairwise with a lag
 *    search; the reference model has already removed every specified effect, so
 *    what remains coupled is a relationship the spec does not contain.
 *
 * Pure TypeScript, no React. Every signal in `SIGNALS` is a node, plus the
 * estimated ambient (D5 Table 9.5, last row).
 */

import { BEARING_OFFSETS, VIB_BASE, type SimFrame } from "./engine";
import { SIGNALS, SIGNAL_BY_TAG, SUBASSEMBLIES, type SubassemblyId } from "./signals";

/* ------------------------------------------------------------------ */
/* Nodes                                                               */
/* ------------------------------------------------------------------ */

/** Virtual node for the ambient estimate (not a wired tag). */
export const AMBIENT = "AMB-KLN-EST";

export interface RelNode {
  tag: string;
  name: string;
  /** Short label for the map. */
  label: string;
  unit: string;
  sub: SubassemblyId | null;
  subName: string;
  type: "analog" | "state" | "estimate";
  sigma: number;
}

function shortLabel(name: string): string {
  return name
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/\s+\/.*$/, "")
    .replace(/^Kiln-inlet /, "Inlet ")
    .replace(/,.*$/, "")
    .replace(/ (status|system status)$/, "")
    .replace(/^Station (\d) /, "Stn $1 ")
    .replace(/ temperature\s*$/, " temp")
    .replace(/\s+/g, " ")
    .trim();
}

const SUB_NAME = Object.fromEntries(SUBASSEMBLIES.map((s) => [s.id, s.name])) as Record<SubassemblyId, string>;

export const REL_NODES: RelNode[] = [
  ...SIGNALS.map<RelNode>((s) => ({
    tag: s.tag,
    name: s.name,
    label: shortLabel(s.name),
    unit: s.unit,
    sub: s.sub,
    subName: SUB_NAME[s.sub],
    type: s.type,
    sigma: s.sigma || (s.type === "state" ? 0.5 : 1),
  })),
  {
    tag: AMBIENT,
    name: "Ambient temperature (estimated)",
    label: "Ambient (estimated)",
    unit: "°C",
    sub: null,
    subName: "Median of 12 support bearings",
    type: "estimate",
    sigma: 0.5,
  },
];

export const NODE_BY_TAG: Record<string, RelNode> = Object.fromEntries(REL_NODES.map((n) => [n.tag, n]));

/* ------------------------------------------------------------------ */
/* Specification: D5 Table 9.5 reference model + calculated signals    */
/* ------------------------------------------------------------------ */

type Get = (tag: string) => number;

export interface Equation {
  target: string;
  inputs: string[];
  /** Expression as written in the specification. */
  expr: string;
  ref: string;
  kind: "model" | "derived";
  /** Expected value from the inputs. Used for live sensitivities. */
  f: (v: Get) => number;
}

const T95 = "D5 Table 9.5";
const FEED = "FLO-KLN-01";
const FUEL = "FLO-KLN-02";
const SPEED = "SPD-KLN-01";
const DRAFT = "PRS-KLN-01";
const TORQUE = "ELE-KLN-01";
const OIL = "TMP-KLN-15";
const O2 = "GAS-KLN-01";
const tr = (v: Get) => v(TORQUE) / 62 - 1;

export const EQUATIONS: Equation[] = [
  {
    target: TORQUE, inputs: [FEED, SPEED], ref: T95, kind: "model",
    expr: "62 % × (feed/330)^0.8 × (speed/3.8)^0.3",
    f: (v) => 62 * Math.pow(v(FEED) / 330, 0.8) * Math.pow(v(SPEED) / 3.8, 0.3),
  },
  {
    target: "TMP-KLN-21", inputs: [AMBIENT, TORQUE], ref: T95, kind: "model",
    expr: "ambient + 64 × (torque/62)²",
    f: (v) => v(AMBIENT) + 64 * Math.pow(v(TORQUE) / 62, 2),
  },
  ...([["TMP-KLN-19", 29.2], ["TMP-KLN-20", 24.7]] as const).map<Equation>(([tag, off]) => ({
    target: tag, inputs: [AMBIENT, TORQUE], ref: T95, kind: "model",
    expr: `ambient + ${off} + 4 × (torque/62 − 1)`,
    f: (v) => v(AMBIENT) + off + 4 * tr(v),
  })),
  {
    target: OIL, inputs: [AMBIENT, TORQUE], ref: T95, kind: "model",
    expr: "ambient + 24 + 9 × (torque/62 − 1)",
    f: (v) => v(AMBIENT) + 24 + 9 * tr(v),
  },
  {
    target: "PRS-KLN-04", inputs: [OIL], ref: T95, kind: "model",
    expr: "2.2 − 0.018 × (oil temperature − 56)",
    f: (v) => 2.2 - 0.018 * (v(OIL) - 56),
  },
  ...([["TMP-KLN-22", 10.1], ["TMP-KLN-23", 7.9]] as const).map<Equation>(([tag, off]) => ({
    target: tag, inputs: [OIL, TORQUE], ref: T95, kind: "model",
    expr: `oil temperature + ${off} + 2 × (torque/62 − 1)`,
    f: (v) => v(OIL) + off + 2 * tr(v),
  })),
  ...Object.entries(VIB_BASE).map<Equation>(([tag, base]) => ({
    target: tag, inputs: [SPEED, TORQUE], ref: T95, kind: "model",
    expr: `${base} × speed/3.8 × (1 + 0.12 × (torque/62 − 1))`,
    f: (v) => base * (v(SPEED) / 3.8) * (1 + 0.12 * tr(v)),
  })),
  ...Object.entries(BEARING_OFFSETS).map<Equation>(([tag, off]) => ({
    target: tag, inputs: [AMBIENT, SPEED, FEED], ref: T95, kind: "model",
    expr: `ambient + ${off} + 6 × (speed/3.8 − 1) + 3 × (feed/330 − 1)`,
    f: (v) => v(AMBIENT) + off + 6 * (v(SPEED) / 3.8 - 1) + 3 * (v(FEED) / 330 - 1),
  })),
  {
    target: "PRS-KLN-07", inputs: [FEED], ref: T95, kind: "model",
    expr: "86 × (feed/330)^0.6 ± 4 (floating direction)",
    f: (v) => 86 * Math.pow(v(FEED) / 330, 0.6),
  },
  {
    target: O2, inputs: [FEED, FUEL, DRAFT], ref: T95, kind: "model",
    expr: "2.6 + 0.028 × (330 − feed) − 0.4 × (fuel − 10.6) − 0.12 × (draft + 3.8)",
    f: (v) => 2.6 + 0.028 * (330 - v(FEED)) - 0.4 * (v(FUEL) - 10.6) - 0.12 * (v(DRAFT) + 3.8),
  },
  {
    target: "GAS-KLN-02", inputs: [O2], ref: T95, kind: "model",
    expr: "420 + 2,500 × max(0, 1.6 − O₂)",
    f: (v) => 420 + 2500 * Math.max(0, 1.6 - v(O2)),
  },
  {
    target: "TMP-KLN-13", inputs: [FUEL, FEED], ref: T95, kind: "model",
    expr: "1,085 + 35 × (fuel − 10.6) + 0.35 × (330 − feed)",
    f: (v) => 1085 + 35 * (v(FUEL) - 10.6) + 0.35 * (330 - v(FEED)),
  },
  {
    target: "TMP-KLN-14", inputs: [FUEL, FEED], ref: T95, kind: "model",
    expr: "1,445 + 40 × (fuel − 10.6) − 0.3 × (feed − 330)",
    f: (v) => 1445 + 40 * (v(FUEL) - 10.6) - 0.3 * (v(FEED) - 330),
  },
  {
    target: "CAL-KLN-03", inputs: [FUEL, AMBIENT], ref: "D5 Thermal profile model", kind: "model",
    expr: "max(expected shell profile) + 6 × (fuel − 10.6) + 0.4 × (ambient − 35.8)",
    f: (v) => 6 * (v(FUEL) - 10.6) + 0.4 * (v(AMBIENT) - 35.8),
  },
  {
    target: "CAL-KLN-06", inputs: [O2], ref: "Calculated (D5 R-SHL-03)", kind: "derived",
    expr: "O₂ − expected O₂",
    f: (v) => v(O2),
  },
  {
    target: "CAL-KLN-07", inputs: ["POS-KLN-01"], ref: "Calculated (D5 R-SHL-05)", kind: "derived",
    expr: "40 − |axial position|",
    f: (v) => 40 - Math.abs(v("POS-KLN-01")),
  },
];

export const EQUATION_BY_TARGET: Record<string, Equation> = Object.fromEntries(EQUATIONS.map((e) => [e.target, e]));

/* ------------------------------------------------------------------ */
/* Specification: D5 Tables 9.6 / 9.7 rule associations                */
/* ------------------------------------------------------------------ */

interface RuleLink {
  from: string;
  to: string;
  ref: string;
  note: string;
}

const RULE_LINKS: RuleLink[] = [
  { from: "STS-KLN-05", to: "VIB-KLN-04", ref: "R-DRV-02 / R-DRV-04", note: "Pinion vibration cause ranked by spray status" },
  { from: "FLO-KLN-05", to: "PRS-KLN-04", ref: "R-DRV-03", note: "Oil pressure drop confirmed by flow switch" },
  { from: "LEV-KLN-01", to: "PRS-KLN-04", ref: "R-DRV-03", note: "Oil pressure drop confirmed by level switch" },
  { from: "STS-KLN-10", to: "PRS-KLN-03", ref: "R-SHL-04", note: "Seal fan stopped drives hood pressure toward positive" },
  { from: "STS-KLN-06", to: O2, ref: "R-DQ-01", note: "Analyser fault invalidates O₂" },
  { from: "STS-KLN-06", to: "GAS-KLN-02", ref: "R-DQ-01", note: "Analyser fault invalidates CO" },
  { from: "STS-KLN-08", to: "CAL-KLN-03", ref: "R-DQ-01", note: "Low scanner coverage under-reads the shell map" },
  { from: "PRS-KLN-07", to: "POS-KLN-01", ref: "R-SUP-03", note: "Thrust pressure loss lets the kiln drift downhill" },
  { from: "POS-KLN-01", to: "POS-KLN-02", ref: "R-SUP-04", note: "Axial travel reaches the limit switches" },
];

/** D5 Table 9.6 witness vote: independent estimates of a driver. */
export const WITNESSES: Record<string, string[]> = {
  [FEED]: [TORQUE, O2],
  [FUEL]: ["TMP-KLN-14", "TMP-KLN-13"],
};

/* ------------------------------------------------------------------ */
/* Links                                                               */
/* ------------------------------------------------------------------ */

export type LinkKind = "model" | "derived" | "rule" | "learned";

export interface RelLink {
  key: string;
  from: string;
  to: string;
  kind: LinkKind;
  ref: string;
  note: string;
}

export const SPEC_LINKS: RelLink[] = [
  ...EQUATIONS.flatMap((e) =>
    e.inputs.map<RelLink>((from) => ({
      key: `${from}>${e.target}`,
      from,
      to: e.target,
      kind: e.kind,
      ref: e.ref,
      note: `${NODE_BY_TAG[e.target].label} = ${e.expr}`,
    }))
  ),
  ...RULE_LINKS.map<RelLink>((r) => ({ key: `${r.from}>${r.to}`, from: r.from, to: r.to, kind: "rule", ref: `D5 ${r.ref}`, note: r.note })),
];

/* ------------------------------------------------------------------ */
/* Layout: width-limited layering of the spec DAG                      */
/* ------------------------------------------------------------------ */

export interface RelLayout {
  columns: string[][];
  /** Column header per column. */
  headers: string[];
  col: Record<string, number>;
  row: Record<string, number>;
}

function computeLayout(): RelLayout {
  const parents: Record<string, string[]> = {};
  const children: Record<string, string[]> = {};
  for (const n of REL_NODES) {
    parents[n.tag] = [];
    children[n.tag] = [];
  }
  for (const l of SPEC_LINKS) {
    parents[l.to].push(l.from);
    children[l.from].push(l.to);
  }

  // Longest-path depth.
  const depth: Record<string, number> = {};
  const depthOf = (t: string): number => (depth[t] ??= parents[t].length ? 1 + Math.max(...parents[t].map(depthOf)) : 0);
  REL_NODES.forEach((n) => depthOf(n.tag));

  // Chunks keep a sub-assembly's sensors of one depth together.
  type Chunk = { tags: string[]; depth: number; hasKids: boolean };
  const chunkMap = new Map<string, Chunk>();
  for (const n of REL_NODES) {
    const hasKids = children[n.tag].length > 0;
    const key = `${depth[n.tag]}|${hasKids}|${n.sub ?? n.tag}`;
    const c = chunkMap.get(key) ?? { tags: [], depth: depth[n.tag], hasKids };
    c.tags.push(n.tag);
    chunkMap.set(key, c);
  }

  // One or more columns per depth (never mixed), at most `cap` rows each.
  const maxDepth = Math.max(...Object.values(depth));
  const roots = REL_NODES.filter((n) => depth[n.tag] === 0).length;
  const cap = Math.max(roots, Math.ceil(REL_NODES.length / (maxDepth + 2)));
  const col: Record<string, number> = {};
  const colDepth: number[] = [];
  const chunkOrder: Chunk[] = [];
  for (let d = 0; d <= maxDepth; d++) {
    const cs = [...chunkMap.values()]
      .filter((c) => c.depth === d)
      .sort((a, b) => Number(b.hasKids) - Number(a.hasKids) || b.tags.length - a.tags.length);
    const count = cs.reduce((s, c) => s + c.tags.length, 0);
    const n = Math.max(1, Math.ceil(count / cap));
    const target = Math.ceil(count / n);
    const first = colDepth.length;
    const fill = Array.from({ length: n }, () => 0);
    for (let k = 0; k < n; k++) colDepth.push(d);
    for (const c of cs) {
      let k = fill.findIndex((f) => f + c.tags.length <= target);
      if (k < 0) k = fill.indexOf(Math.min(...fill));
      fill[k] += c.tags.length;
      for (const t of c.tags) col[t] = first + k;
      chunkOrder.push(c);
    }
  }
  // Order within columns by parent barycenter (chunks stay contiguous).
  const columns: string[][] = colDepth.map(() => []);
  const row: Record<string, number> = {};
  for (const c of chunkOrder) columns[col[c.tags[0]]].push(...c.tags);
  for (let pass = 0; pass < 3; pass++) {
    for (let k = 0; k < columns.length; k++) {
      columns[k].forEach((t, i) => (row[t] = i));
      if (k === 0) continue;
      const bary = (t: string) => {
        const ps = parents[t];
        return ps.length ? ps.reduce((s, p) => s + row[p] / Math.max(1, columns[col[p]].length), 0) / ps.length : 1;
      };
      const groups = new Map<string, string[]>();
      for (const t of columns[k]) {
        const g = `${NODE_BY_TAG[t].sub ?? t}|${depth[t]}`;
        groups.set(g, [...(groups.get(g) ?? []), t]);
      }
      columns[k] = [...groups.values()]
        .map((ts) => ({ ts, b: ts.reduce((s, t) => s + bary(t), 0) / ts.length }))
        .sort((a, b) => a.b - b.b)
        .flatMap((g) => g.ts);
    }
  }
  // Column 0: process drivers first, then status inputs.
  columns[0].sort((a, b) => Number(NODE_BY_TAG[a].type === "state") - Number(NODE_BY_TAG[b].type === "state"));
  columns.forEach((c) => c.forEach((t, i) => (row[t] = i)));

  const ORDER = ["Drivers & inputs", "Direct effects", "Second-order effects", "Third-order effects"];
  const headers = colDepth.map((d) => ORDER[d] ?? `Order ${d}`);
  return { columns, headers, col, row };
}

export const REL_LAYOUT: RelLayout = computeLayout();

/* ------------------------------------------------------------------ */
/* Live evaluation                                                     */
/* ------------------------------------------------------------------ */

function pearson(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 3) return 0;
  let mx = 0;
  let my = 0;
  for (let i = 0; i < n; i++) {
    mx += x[i];
    my += y[i];
  }
  mx /= n;
  my /= n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const a = x[i] - mx;
    const b = y[i] - my;
    sxy += a * b;
    sxx += a * a;
    syy += b * b;
  }
  return sxx > 1e-12 && syy > 1e-12 ? sxy / Math.sqrt(sxx * syy) : 0;
}

const sd = (v: number[]) => {
  const m = v.reduce((a, x) => a + x, 0) / (v.length || 1);
  return Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / (v.length || 1));
};

/** Current value of a node (ambient from the estimate, states as 1 = normal). */
export function nodeValue(frame: SimFrame, tag: string): number | null {
  if (tag === AMBIENT) return frame.drivers.ambientEst;
  const s = frame.signals[tag];
  if (!s) return null;
  if (SIGNAL_BY_TAG[tag].type === "state") return s.state === SIGNAL_BY_TAG[tag].states?.normal ? 1 : 0;
  return s.value;
}

/** ∂target/∂input at the current operating point (target units per input unit). */
export function sensitivity(frame: SimFrame, link: RelLink): number | null {
  const eq = EQUATION_BY_TARGET[link.to];
  if (!eq || !eq.inputs.includes(link.from)) return null;
  const at: Record<string, number> = {};
  for (const t of eq.inputs) {
    const v = nodeValue(frame, t);
    if (v === null || !Number.isFinite(v)) return null;
    at[t] = v;
  }
  const h = Math.max(NODE_BY_TAG[link.from].sigma, Math.abs(at[link.from]) * 1e-3, 1e-4);
  const up = eq.f((t) => (t === link.from ? at[t] + h : at[t]));
  const dn = eq.f((t) => (t === link.from ? at[t] - h : at[t]));
  return (up - dn) / (2 * h);
}

/* ------------------------------------------------------------------ */
/* Discovery: learned links from residual history                      */
/* ------------------------------------------------------------------ */

export interface LearnedLink extends RelLink {
  r: number;
  /** Minutes `from` leads `to`; 0 = simultaneous. */
  lag: number;
  directed: boolean;
  /** Active / pending D5 rule whose evidence includes either sensor, if any. */
  rule: string | null;
}

/** Residual r at or above this, sustained over the window, counts as a coupling. */
export const LEARN_R = 0.65;
const LEARN_WINDOW = 180;
const MAX_LAG = 10;
/** Residual scatter must exceed noise (σ) by this factor on both sides. */
const LEARN_EXCITATION = 1.5;

const specParents: Record<string, string[]> = {};
const specKids: Record<string, string[]> = {};
for (const l of SPEC_LINKS) {
  (specParents[l.to] ??= []).push(l.from);
  (specKids[l.from] ??= []).push(l.to);
}
const reach = (from: string, to: string, seen = new Set<string>()): boolean =>
  (specKids[from] ?? []).some((k) => k === to || (!seen.has(k) && (seen.add(k), reach(k, to, seen))));

/**
 * Explained by the spec: one drives the other along a specified path (a
 * residual propagates down it), or both share a specified parent whose own
 * residual is excited (a common cause that is visible).
 */
function explained(a: string, b: string, excited: Set<string>): boolean {
  if (reach(a, b) || reach(b, a)) return true;
  const pa = specParents[a] ?? [];
  const pb = specParents[b] ?? [];
  return pa.some((p) => excited.has(p) && pb.includes(p));
}

let cache: { key: string; links: LearnedLink[] } | null = null;

/**
 * Pairwise residual cross-correlation (lags 0…10 min) over the last 3 h.
 * Recomputed every 10 simulated minutes.
 */
export function learnLinks(frame: SimFrame): LearnedLink[] {
  const key = `${frame.scenarioId}|${Math.floor(frame.t / 10)}`;
  if (cache?.key === key) return cache.links;

  const res: Record<string, number[]> = {};
  for (const def of SIGNALS) {
    const h = frame.history[def.tag];
    const m = frame.modelHistory[def.tag];
    if (!h || !m) continue;
    const k = Math.min(LEARN_WINDOW + MAX_LAG, h.length, m.length);
    if (k < 60) continue;
    const r = h.slice(-k).map((v, i) => v - m[m.length - k + i]);
    if (r.some((v) => !Number.isFinite(v))) continue;
    const sigma = def.sigma || 0.5;
    if (sd(r.slice(-LEARN_WINDOW)) < LEARN_EXCITATION * sigma) continue;
    res[def.tag] = r;
  }

  const tags = Object.keys(res);
  const excited = new Set(tags);
  const out: LearnedLink[] = [];
  for (let i = 0; i < tags.length; i++) {
    for (let j = i + 1; j < tags.length; j++) {
      const a = tags[i];
      const b = tags[j];
      if (explained(a, b, excited)) continue;
      const ra = res[a];
      const rb = res[b];
      const n = Math.min(ra.length, rb.length) - MAX_LAG;
      let best = 0;
      let bestLag = 0;
      for (let lag = -MAX_LAG; lag <= MAX_LAG; lag++) {
        // lag > 0: a leads b.
        const xa = ra.slice(ra.length - n - Math.max(0, lag), ra.length - Math.max(0, lag));
        const xb = rb.slice(rb.length - n - Math.max(0, -lag), rb.length - Math.max(0, -lag));
        const r = pearson(xa, xb);
        if (Math.abs(r) > Math.abs(best) + 0.02) {
          best = r;
          bestLag = lag;
        }
      }
      if (Math.abs(best) < LEARN_R) continue;
      const [from, to] = bestLag < 0 ? [b, a] : [a, b];
      const rule = frame.rules.find((r) => r.status !== "QUIET" && (r.tags.includes(a) || r.tags.includes(b)));
      out.push({
        key: `${from}~${to}`,
        from,
        to,
        kind: "learned",
        ref: "Learned from residual history",
        note: `Residuals move ${best > 0 ? "together" : "in opposition"}${bestLag ? `, ${NODE_BY_TAG[from].label} leads by ${Math.abs(bestLag)} min` : ""}`,
        r: best,
        lag: Math.abs(bestLag),
        directed: bestLag !== 0,
        rule: rule ? `${rule.id} ${rule.name}` : null,
      });
    }
  }
  out.sort((x, y) => Math.abs(y.r) - Math.abs(x.r));
  cache = { key, links: out };
  return out;
}
