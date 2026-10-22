/**
 * Analysis · investigation model.
 *
 * The three investigation windows (Diagnosis, Prognosis and Sensors) walk the
 * same eight steps — what changed · evidence · explanation · likely causes ·
 * impact · how it develops · what to do · how to confirm. This module holds
 * the calculations behind them, all on the live frame (readings, reference
 * model, rule states, event log) and the plant's own records:
 *
 *   changes      when a reading left its expected band, by how much, and how
 *                (sudden, gradual, on and off); whether it is getting worse
 *   context      the operating drivers (feed, fuel, speed) then and now, so a
 *                change can be judged under comparable conditions
 *   causes       candidate causes ranked against the evidence; nothing is
 *                given a confidence the engine did not compute
 *   signal       the shape of one sensor's signal (spike, step, drift, flat
 *                line…) and whether its correlated neighbours agree
 *
 * Every fact carries its basis: measured, inferred, predicted or to verify.
 */
import { formatDuration, type RuleState, type SimFrame } from "@shared/lib/kiln-sim/engine";
import { isConditionRule } from "@shared/lib/plant-defs";
import { displayName } from "@/lib/display-name";
import { plainWords } from "@/lib/plain-words";
import { distinctTexts, type FaultEntry } from "../fault-library";
import { Z_ANOMALY, episodes } from "./an-derive";

/* ------------------------------------------------------------------ */
/* Basis                                                               */
/* ------------------------------------------------------------------ */

export type Basis = "measured" | "inferred" | "predicted" | "verify";

export const BASIS_WORD: Record<Basis, string> = {
  measured: "Measured",
  inferred: "Inferred",
  predicted: "Predicted",
  verify: "To verify",
};

export const BASIS_TIP: Record<Basis, string> = {
  measured: "Read by a sensor, or taken from the plant's own records",
  inferred: "Worked out by ULTRON from the measurements: likely, not proven",
  predicted: "A forecast of what may happen, with its range",
  verify: "Not known yet: needs a check on site or more data",
};

/* ------------------------------------------------------------------ */
/* Series helpers                                                      */
/* ------------------------------------------------------------------ */

/** Samples compared for "how fast it is changing": the most recent window and the one before it. */
export const RATE_WINDOW = 30;

/** Residual of a sensor in multiples of its σ, one per history sample (NaN where a sample is missing). */
export function zSeries(f: SimFrame, tag: string): number[] {
  const sigma = f.defs.signalByTag[tag]?.sigma || 1;
  const h = f.history[tag] ?? [];
  const m = f.modelHistory[tag] ?? [];
  const n = Math.min(h.length, m.length);
  const out: number[] = new Array(n);
  for (let i = 0; i < n; i++) out[i] = (h[h.length - n + i] - m[m.length - n + i]) / sigma;
  return out;
}

/** Least-squares slope per sample over `vals[from, to)`, skipping gaps; null with fewer than 5 points. */
function slope(vals: number[], from: number, to: number): number | null {
  let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = Math.max(0, from); i < Math.min(vals.length, to); i++) {
    const y = vals[i];
    if (!Number.isFinite(y)) continue;
    n++;
    sx += i;
    sy += y;
    sxx += i * i;
    sxy += i * y;
  }
  const den = n * sxx - sx * sx;
  return n >= 5 && den ? (n * sxy - sx * sy) / den : null;
}

/** Pearson r of two series aligned at their ends, over the last `n` samples before the final `end` ones; null when flat or short. */
export function correlation(a: number[], b: number[], n: number, end = 0): number | null {
  const len = Math.min(a.length, b.length) - end;
  if (len <= 0) return null;
  const xa = a.slice(a.length - end - len, a.length - end).slice(-n);
  const xb = b.slice(b.length - end - len, b.length - end).slice(-n);
  const pairs: [number, number][] = [];
  for (let i = 0; i < xa.length; i++) if (Number.isFinite(xa[i]) && Number.isFinite(xb[i])) pairs.push([xa[i], xb[i]]);
  if (pairs.length < 20) return null;
  const ma = pairs.reduce((s, p) => s + p[0], 0) / pairs.length;
  const mb = pairs.reduce((s, p) => s + p[1], 0) / pairs.length;
  let sab = 0, saa = 0, sbb = 0;
  for (const [x, y] of pairs) {
    sab += (x - ma) * (y - mb);
    saa += (x - ma) ** 2;
    sbb += (y - mb) ** 2;
  }
  return saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : null;
}

/** Simulated minutes between history sample `i` (of a series `len` long) and the frame time. */
function agoAt(f: SimFrame, len: number, i: number): number {
  const t = f.times[f.times.length - (len - i)];
  return t === undefined ? 0 : Math.max(0, f.t - t);
}

/* ------------------------------------------------------------------ */
/* What changed                                                        */
/* ------------------------------------------------------------------ */

export type ChangePattern = "Sudden" | "Gradual" | "On and off" | "As expected";
export type Progress = "Worsening faster" | "Worsening" | "Steady" | "Easing";

export interface SignalChange {
  tag: string;
  name: string;
  unit: string;
  subId: string;
  sub: string;
  value: number | null;
  expected: number | null;
  z: number | null;
  /** Reading minus expected, in the sensor's unit, and as % of expected. */
  change: number | null;
  changePct: number | null;
  /** Minutes since the reading first left the ±3σ band in this episode; null while it is inside. */
  beganAgo: number | null;
  pattern: ChangePattern;
  /** Separate times the reading left the band in the history window. */
  excursions: number;
  /** How far the gap to expected moved over the last RATE_WINDOW samples and the window before (sensor units, + = further off). */
  moveNow: number | null;
  moveBefore: number | null;
  progress: Progress | null;
  quality: "Good" | "Suspect" | "Invalid";
  qualityNote: string | null;
}

/** How one sensor's reading changed against what the reference model expects (calc. from history vs model). */
export function signalChange(f: SimFrame, tag: string): SignalChange | null {
  const def = f.defs.signalByTag[tag];
  const s = f.signals[tag];
  if (!def || !s) return null;
  const zs = zSeries(f, tag);
  const n = zs.length;
  const off = (z: number) => Number.isFinite(z) && Math.abs(z) > Z_ANOMALY;
  // Episodes beyond the band: runs of at least 3 samples (the engine's persistence), bridging dips of up to
  // 2 samples back inside it. Shorter blips are noise, not a change.
  const runs: [number, number][] = [];
  for (let i = 0; i < n; ) {
    if (!off(zs[i])) {
      i++;
      continue;
    }
    let e = i;
    let j = i + 1;
    while (j < n && (off(zs[j]) || j - e <= 2)) {
      if (off(zs[j])) e = j;
      j++;
    }
    if (e - i + 1 >= 3) runs.push([i, e]);
    i = e + 1;
  }
  const current = runs.length && runs[runs.length - 1][1] >= n - 3 ? runs[runs.length - 1] : null;
  const excursions = runs.length;
  let pattern: ChangePattern = "As expected";
  let beganAgo: number | null = null;
  if (current) {
    if (runs.length >= 3) {
      pattern = "On and off";
      beganAgo = agoAt(f, n, runs[0][0]);
    } else {
      // Rise time: samples from the last "near expected" point (under 1.5σ) to the band edge.
      const start = current[0];
      let j = start - 1;
      while (j >= 0 && Number.isFinite(zs[j]) && Math.abs(zs[j]) >= 1.5) j--;
      pattern = start - j <= 5 ? "Sudden" : "Gradual";
      beganAgo = agoAt(f, n, start);
    }
  } else if (excursions >= 2) {
    pattern = "On and off";
  }
  const abs = zs.map((z) => (Number.isFinite(z) ? Math.abs(z) : NaN));
  const sNow = slope(abs, n - RATE_WINDOW, n);
  const sBefore = slope(abs, n - 2 * RATE_WINDOW, n - RATE_WINDOW);
  const sigma = def.sigma || 1;
  const moveNow = sNow === null ? null : sNow * RATE_WINDOW * sigma;
  const moveBefore = sBefore === null ? null : sBefore * RATE_WINDOW * sigma;
  // Progress only means something for a reading that is off expected (beyond 2σ).
  let progress: Progress | null = null;
  if (sNow !== null && s.z !== null && Math.abs(s.z) > 2) {
    const perWin = sNow * RATE_WINDOW;
    const before = (sBefore ?? 0) * RATE_WINDOW;
    if (Math.abs(perWin) < 0.25) progress = "Steady";
    else if (perWin < 0) progress = "Easing";
    else progress = before > 0.25 && perWin > 1.5 * before ? "Worsening faster" : "Worsening";
  }
  const expected = s.model;
  const change = s.value !== null && expected !== null ? s.value - expected : null;
  return {
    tag,
    name: displayName(def.name),
    unit: def.unit && def.unit !== "state" ? def.unit : "",
    subId: def.sub,
    sub: f.defs.subassemblies.find((x) => x.id === def.sub)?.name ?? def.sub,
    value: s.value,
    expected,
    z: s.z,
    change,
    changePct: change !== null && expected !== null && Math.abs(expected) > 1e-6 ? (change / Math.abs(expected)) * 100 : null,
    beganAgo,
    pattern,
    excursions,
    moveNow,
    moveBefore,
    progress,
    quality: s.quality,
    qualityNote: s.qualityNote,
  };
}

/** Worst progress among several readings (one word for a whole problem). */
export function worstProgress(list: (Progress | null)[]): Progress | null {
  const order: Progress[] = ["Worsening faster", "Worsening", "Steady", "Easing"];
  for (const p of order) if (list.includes(p)) return p;
  return null;
}

/** Sensors a rule reads (its inputs and the ones it fired on), fired ones first, in definition order. */
export function ruleTags(rule: RuleState, f: SimFrame): string[] {
  const inputs = f.defs.ruleById[rule.id]?.inputs ?? [];
  const all = Array.from(new Set([...rule.tags, ...inputs]));
  const fired = new Set(rule.tags);
  return all.sort((a, b) => Number(fired.has(b)) - Number(fired.has(a)));
}

/* ------------------------------------------------------------------ */
/* Operating context: were conditions comparable?                      */
/* ------------------------------------------------------------------ */

export interface ContextRow {
  tag: string;
  name: string;
  unit: string;
  then: number | null;
  now: number | null;
  /** Moved between then and now by more than its noise (3σ) and by more than 5 % of its value: a different operating point. */
  changed: boolean;
}

/**
 * The machine's operating drivers (feed, fuel, speed) shortly before
 * `minutesAgo` and now. Only drivers this machine records.
 */
export function operatingContext(f: SimFrame, minutesAgo: number | null): ContextRow[] {
  const d = f.defs.driverTags;
  const tags = Array.from(new Set([d.feed, d.fuel, d.speed ?? f.defs.speedTag].filter((t): t is string => Boolean(t))));
  return tags
    .map((tag) => {
      const def = f.defs.signalByTag[tag];
      const h = f.history[tag];
      if (!def || def.type !== "analog" || !h || h.length < 2) return null;
      // 15 minutes before the change began (or the start of the window).
      const back = Math.min(h.length - 1, (minutesAgo ?? h.length) + 15);
      const then = h[h.length - 1 - back];
      const now = f.signals[tag]?.value ?? h[h.length - 1];
      const ok = (v: number | null | undefined): v is number => v !== null && v !== undefined && Number.isFinite(v);
      return {
        tag,
        name: displayName(def.name),
        unit: def.unit,
        then: ok(then) ? then : null,
        now: ok(now) ? now : null,
        changed: ok(then) && ok(now) ? Math.abs(now - then) > Math.max(3 * (def.sigma || 1), 0.05 * Math.abs(then)) : false,
      } satisfies ContextRow;
    })
    .filter((r): r is ContextRow => r !== null);
}

/** Pairs of the given sensors whose gaps to expected rise and fall together (|r| ≥ 0.8 over the last hour of samples). */
export function changingTogether(f: SimFrame, tags: string[]): { a: string; b: string; r: number }[] {
  const z = new Map(tags.map((t) => [t, zSeries(f, t)]));
  const out: { a: string; b: string; r: number }[] = [];
  for (let i = 0; i < tags.length; i++)
    for (let j = i + 1; j < tags.length; j++) {
      const r = correlation(z.get(tags[i])!, z.get(tags[j])!, 60);
      if (r !== null && Math.abs(r) >= 0.8) out.push({ a: tags[i], b: tags[j], r });
    }
  return out;
}

/* ------------------------------------------------------------------ */
/* Likely causes                                                       */
/* ------------------------------------------------------------------ */

export type CauseStatus = "Leading" | "Possible" | "To check" | "Ruled out";

export interface Hypothesis {
  key: string;
  cause: string;
  /** What kind of cause: the rule's equipment group, "Sensor", "Operating change"… */
  kind: string;
  support: string[];
  against: string[];
  status: CauseStatus;
  /** The engine's own rule confidence (%); null for causes it does not score. */
  confidence: number | null;
  basis: Basis;
}

const STATUS_ORDER: Record<CauseStatus, number> = { Leading: 0, Possible: 1, "To check": 2, "Ruled out": 3 };

export function sortCauses(list: Hypothesis[]): Hypothesis[] {
  return [...list].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || (b.confidence ?? -1) - (a.confidence ?? -1));
}

const sentence = (t: string) => {
  const s = plainWords(t.trim()).replace(/\.$/, "");
  return s ? s[0].toUpperCase() + s.slice(1) : s;
};

const nameOf = (f: SimFrame, tag: string) => displayName(f.defs.signalByTag[tag]?.name ?? tag);

const list = (names: string[]) => (names.length <= 3 ? names.join(", ") : `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`);

/** Driver moves as plain text ("Kiln feed rose 12 %"). */
export function contextMoves(ctx: ContextRow[]): string[] {
  return ctx
    .filter((c) => c.changed && c.then !== null && c.now !== null)
    .map((c) => {
      const pct = c.then ? Math.round(((c.now! - c.then) / Math.abs(c.then)) * 100) : null;
      return `${c.name} ${c.now! > c.then! ? "rose" : "fell"}${pct !== null ? ` ${Math.abs(pct)} %` : ""}`;
    });
}

/**
 * Candidate causes of a problem the engine is matching now, ranked:
 * the rule's own cause (the engine's confidence), other problems that read the
 * same sensors, a faulty sensor, a change in operating point, recent
 * maintenance, and the fault library's "rule out first" alternatives.
 */
export function diagnosisCauses(rule: RuleState, f: SimFrame, sheets: FaultEntry[], beganAgo: number | null, ctx: ContextRow[]): Hypothesis[] {
  const out: Hypothesis[] = [];
  const tags = ruleTags(rule, f);
  const mine = new Set(tags);
  const fired = rule.tags.filter((t) => f.signals[t]);
  const untrusted = tags.filter((t) => f.signals[t] && f.signals[t].quality !== "Good");
  const firedOk = fired.filter((t) => f.signals[t].quality === "Good");

  // 1. The rule's own explanation.
  out.push({
    key: `rule-${rule.id}`,
    cause: sentence(rule.cause || rule.plainTitle || rule.name),
    kind: rule.category,
    support: [
      ...(firedOk.length ? [`${list(firedOk.map((t) => nameOf(f, t)))} off expected the way this problem predicts`] : []),
      ...distinctTexts(sheets.map((s) => s.what)).slice(0, 1),
    ],
    against: [...(rule.unproven ? [`Not yet proven: ${sentence(rule.unproven)}`] : []), ...(untrusted.length ? [`${list(untrusted.map((t) => nameOf(f, t)))} failed the sensor checks`] : [])],
    status: rule.status === "ACTIVE" && untrusted.length < fired.length ? "Leading" : "Possible",
    confidence: Number.isFinite(rule.confidence) ? Math.round(rule.confidence) : null,
    basis: "inferred",
  });

  // 2. Other problems the engine matches on the same sensors.
  for (const o of f.rules) {
    if (o.id === rule.id || o.status === "QUIET" || !isConditionRule(o)) continue;
    const shared = ruleTags(o, f).filter((t) => mine.has(t));
    if (!shared.length) continue;
    out.push({
      key: `rule-${o.id}`,
      cause: sentence(o.cause || o.plainTitle || o.name),
      kind: o.category,
      support: [`Also matched now (${o.plainTitle || o.name}), on ${list(shared.map((t) => nameOf(f, t)))}`],
      against: [],
      status: "Possible",
      confidence: Number.isFinite(o.confidence) ? Math.round(o.confidence) : null,
      basis: "inferred",
    });
  }

  // 3. A faulty sensor rather than a faulty machine.
  out.push({
    key: "sensor",
    cause: "A sensor is reading wrong, not the machine",
    kind: "Sensor",
    support: untrusted.map((t) => `${nameOf(f, t)}: ${f.signals[t].qualityNote ?? `${f.signals[t].quality.toLowerCase()} reading`}`),
    against: untrusted.length ? [] : [`All ${tags.length} sensors behind it pass the sensor checks`],
    status: untrusted.length ? (untrusted.length >= fired.length && fired.length > 0 ? "Leading" : "Possible") : "Ruled out",
    confidence: null,
    basis: "measured",
  });

  // 4. A normal change of operating point (load, feed, fuel, speed).
  if (ctx.length) {
    const moves = contextMoves(ctx);
    out.push({
      key: "operating",
      cause: "The machine was run differently (load, feed, fuel or speed)",
      kind: "Operating change",
      support: moves,
      against: moves.length ? [] : [`${list(ctx.map((c) => c.name))} steady since before it began`],
      status: moves.length ? "Possible" : "Ruled out",
      confidence: null,
      basis: "measured",
    });
  }

  // 5. Maintenance shortly before it began (the operator actions in the event log).
  if (beganAgo !== null) {
    const startT = f.t - beganAgo;
    const work = f.events.filter((e) => e.kind === "action" && e.action && !e.action.auto && (e.action.kind === "repair" || e.action.kind === "complete") && e.t <= startT && e.t >= startT - 360);
    if (work.length)
      out.push({
        key: "maintenance",
        cause: "Recent maintenance work changed how it runs",
        kind: "Maintenance",
        support: work.map((e) => `${e.title} at ${e.clock}`),
        against: [],
        status: "Possible",
        confidence: null,
        basis: "measured",
      });
  }

  // 6. What the fault library says to rule out first.
  distinctTexts(sheets.map((s) => s.alternatives)).forEach((t, i) =>
    out.push({ key: `alt-${i}`, cause: t, kind: "From the fault library", support: [], against: [], status: "To check", confidence: null, basis: "verify" }),
  );
  return sortCauses(out);
}

/** Past episodes of the same rule in the history window (its event log), newest first. */
export const episodesOf = (rule: RuleState, f: SimFrame) => episodes(f).filter((e) => e.ruleId === rule.id);

/* ------------------------------------------------------------------ */
/* Sensor intelligence: the signal itself                              */
/* ------------------------------------------------------------------ */

export type SignalPattern = "Missing data" | "Flat line" | "Step change" | "Spike" | "Drift" | "Oscillation" | "Noisy" | "Off expected" | "As expected";

export interface SignalShape {
  pattern: SignalPattern;
  /** One plain line saying what in the signal shows it. */
  detail: string;
}

const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / (v.length || 1);
const std = (v: number[]) => {
  const m = mean(v);
  return Math.sqrt(mean(v.map((x) => (x - m) ** 2)));
};

/** Shape of a sensor's signal over its history window (calc. from the raw samples and the reference model). */
export function signalShape(f: SimFrame, tag: string): SignalShape {
  const def = f.defs.signalByTag[tag];
  const h = f.history[tag] ?? [];
  const n = h.length;
  const sigma = def?.sigma || 1;
  const unit = def?.unit && def.unit !== "state" ? ` ${def.unit}` : "";
  const fmtV = (v: number) => `${Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2)}${unit}`;
  const recent = h.slice(-60);
  const gaps = recent.filter((v) => !Number.isFinite(v)).length;
  if (n === 0 || gaps > 5) return { pattern: "Missing data", detail: n === 0 ? "No samples received" : `${gaps} of the last ${recent.length} samples missing` };
  const finite = (v: number[]) => v.filter(Number.isFinite);
  const flatN = def?.flatlineN ?? 30;
  const flat = finite(h.slice(-flatN));
  const minVar = def?.minVar ?? 0;
  if (flat.length >= Math.min(flatN, 10) && Math.max(...flat) - Math.min(...flat) <= minVar)
    return { pattern: "Flat line", detail: `No change at all over the last ${formatSamples(f, flat.length)}` };
  const zs = zSeries(f, tag);
  const zr = finite(zs.slice(-RATE_WINDOW));
  const zp = finite(zs.slice(-2 * RATE_WINDOW, -RATE_WINDOW));
  if (zr.length >= 10 && zp.length >= 10) {
    const jump = mean(zr) - mean(zp);
    if (Math.abs(jump) > 3 && std(zr) < 1.5 && std(zp) < 1.5)
      return { pattern: "Step change", detail: `Jumped by ${fmtV(jump * sigma)} and stayed there` };
  }
  const last = zs.slice(-60);
  let spikes = 0;
  for (let i = 2; i < last.length - 2; i++)
    if (Math.abs(last[i]) > 4 && Math.abs(last[i - 2]) < 2 && Math.abs(last[i + 2]) < 2) spikes++;
  if (spikes > 0) return { pattern: "Spike", detail: `${spikes} short jump${spikes === 1 ? "" : "s"} that came straight back, in the last ${formatSamples(f, last.length)}` };
  const long = zs.slice(-120);
  const sl = slope(long, 0, long.length);
  if (sl !== null && Math.abs(sl * long.length) > 2) {
    const r = correlation(long, long.map((_, i) => i), long.length);
    if (r !== null && r * r > 0.6) return { pattern: "Drift", detail: `Moving away from expected steadily: ${fmtV(sl * long.length * sigma)} over ${formatSamples(f, long.length)}` };
  }
  const lz = finite(last);
  if (lz.length >= 30) {
    const m = mean(lz);
    let cross = 0;
    for (let i = 1; i < lz.length; i++) if (Math.sign(lz[i] - m) !== Math.sign(lz[i - 1] - m)) cross++;
    const amp = std(lz);
    if (amp > 1.5 && cross > lz.length / 3) return { pattern: "Oscillation", detail: `Swinging ±${fmtV(amp * sigma)} around its level` };
    const diffs = lz.slice(1).map((v, i) => v - lz[i]);
    if (std(diffs) > 2) return { pattern: "Noisy", detail: `Sample-to-sample scatter ${std(diffs).toFixed(1)}× its usual` };
  }
  const z = f.signals[tag]?.z ?? null;
  if (z !== null && Math.abs(z) > Z_ANOMALY) return { pattern: "Off expected", detail: `Holding ${fmtV(Math.abs(z) * sigma)} ${z > 0 ? "above" : "below"} what is expected, without swings` };
  return { pattern: "As expected", detail: "Moves with what the reference model expects" };
}

/** A sample count as a duration ("the last 30m"). */
function formatSamples(f: SimFrame, samples: number): string {
  const t0 = f.times[Math.max(0, f.times.length - samples)];
  const mins = t0 === undefined ? samples : f.t - t0;
  return formatDuration(mins);
}

export interface Partner {
  tag: string;
  name: string;
  sub: string;
  /** How closely the two used to move together (r over the earlier part of the window). */
  r: number;
  z: number | null;
  /** The partner is off expected too (beyond 2σ). */
  moved: boolean;
  quality: "Good" | "Suspect" | "Invalid";
}

/**
 * Sensors that used to move with this one (|r| ≥ 0.8 over the earlier two
 * thirds of the window, raw readings), strongest first, at most 5. If the
 * machine really changed they should have moved too.
 */
export function partnersOf(f: SimFrame, tag: string): Partner[] {
  const h = f.history[tag];
  if (!h) return [];
  const end = Math.floor(h.length / 3);
  const out: Partner[] = [];
  for (const d of f.defs.signals) {
    if (d.tag === tag || d.type !== "analog" || !f.history[d.tag]) continue;
    const r = correlation(h, f.history[d.tag], h.length - end, end);
    if (r === null || Math.abs(r) < 0.8) continue;
    const s = f.signals[d.tag];
    out.push({
      tag: d.tag,
      name: displayName(d.name),
      sub: f.defs.subassemblies.find((x) => x.id === d.sub)?.name ?? d.sub,
      r,
      z: s?.z ?? null,
      moved: s?.z !== null && s?.z !== undefined && Math.abs(s.z) > 2,
      quality: s?.quality ?? "Invalid",
    });
  }
  return out.sort((a, b) => Math.abs(b.r) - Math.abs(a.r)).slice(0, 5);
}

/** Minutes since the source stamped the value (stale data), when the engine tracks it. */
export function lagOf(f: SimFrame, tag: string): number | null {
  const s = f.signals[tag];
  return s?.sourceTs === undefined ? null : Math.max(0, f.t - s.sourceTs);
}

/** Data-quality checks the engine matches on this sensor now. */
export function qualityRulesOn(f: SimFrame, tag: string): RuleState[] {
  return f.rules.filter((r) => r.status !== "QUIET" && r.category === "Data quality" && ruleTags(r, f).includes(tag));
}

/** Machine problems (condition rules) that read this sensor, matched now first. */
export function rulesReading(f: SimFrame, tag: string): RuleState[] {
  return f.rules
    .filter((r) => isConditionRule(r) && ruleTags(r, f).includes(tag))
    .sort((a, b) => Number(b.status !== "QUIET") - Number(a.status !== "QUIET"));
}

/**
 * Why a sensor's signal is abnormal, ranked: the sensor itself, the data
 * link, the process, or a real change in the machine. Support and against
 * are the measured facts behind each.
 */
export function sensorCauses(f: SimFrame, tag: string, shape: SignalShape, partners: Partner[], ctx: ContextRow[]): Hypothesis[] {
  const s = f.signals[tag];
  const off = s?.z !== null && s?.z !== undefined && Math.abs(s.z) > 2;
  const dq = qualityRulesOn(f, tag);
  const lag = lagOf(f, tag);
  const moved = partners.filter((p) => p.moved);
  const still = partners.filter((p) => !p.moved && p.quality === "Good");
  const machineRules = rulesReading(f, tag).filter((r) => r.status !== "QUIET");
  const moves = contextMoves(ctx);
  const sensorShape = ["Flat line", "Spike", "Noisy", "Step change"].includes(shape.pattern);

  const sensor: Hypothesis = {
    key: "sensor",
    cause: "The sensor or its wiring is faulty",
    kind: "Sensor",
    support: [
      ...(s && s.quality !== "Good" ? [`Failed the sensor checks${s.qualityNote ? `: ${s.qualityNote}` : ""}`] : []),
      ...dq.map((r) => r.plainTitle || r.name),
      ...(sensorShape ? [`${shape.pattern}: ${shape.detail}`] : []),
      ...(off && still.length ? [`${list(still.map((p) => p.name))} did not move with it`] : []),
    ],
    against: [...(s?.quality === "Good" && !dq.length ? ["Passes the sensor checks"] : []), ...(off && moved.length ? [`${list(moved.map((p) => p.name))} moved with it`] : [])],
    status: "Possible",
    confidence: null,
    basis: "inferred",
  };
  const link: Hypothesis = {
    key: "link",
    cause: "Data is lost or late on the way from the sensor",
    kind: "Communication",
    support: [
      ...(shape.pattern === "Missing data" ? [shape.detail] : []),
      ...(lag !== null && lag > 2 ? [`Last value is ${formatDuration(lag)} old`] : []),
    ],
    against: shape.pattern !== "Missing data" && (lag === null || lag <= 2) ? ["Values arrive on time, none missing"] : [],
    status: "Possible",
    confidence: null,
    basis: "measured",
  };
  const process: Hypothesis = {
    key: "process",
    cause: "The process changed (load, feed, fuel or speed)",
    kind: "Process",
    support: moves,
    against: ctx.length && !moves.length ? [`${list(ctx.map((c) => c.name))} steady`] : [],
    status: "Possible",
    confidence: null,
    basis: "measured",
  };
  const machine: Hypothesis = {
    key: "machine",
    cause: "The machine really changed",
    kind: "Machine",
    support: [
      ...(off && moved.length ? [`${list(moved.map((p) => p.name))} moved with it`] : []),
      ...machineRules.map((r) => `Matches a known problem: ${r.plainTitle || r.name}`),
    ],
    against: off && still.length && !moved.length ? [`${list(still.map((p) => p.name))} stayed as expected`] : [],
    status: "Possible",
    confidence: null,
    basis: "inferred",
  };
  const all = [sensor, link, process, machine];
  // Rank on the evidence: more support than against, the strongest leads; nothing for it and something against, ruled out.
  const score = (h: Hypothesis) => h.support.length - h.against.length;
  const best = Math.max(...all.map(score));
  for (const h of all) {
    if (!h.support.length && h.against.length) h.status = "Ruled out";
    else if (!h.support.length) h.status = "To check";
    else if (score(h) === best && best > 0 && all.filter((x) => score(x) === best).length === 1) h.status = "Leading";
  }
  return sortCauses(all);
}

/* ------------------------------------------------------------------ */
/* Plant level                                                         */
/* ------------------------------------------------------------------ */

export interface PlantProblem {
  machineId: string;
  title: string;
  where: string;
  severity: string;
  /** Minutes since it was confirmed (or started matching). */
  ago: number | null;
}

/** Problems the engine is matching now on other machines of the same plant. */
export function plantProblems(frames: Record<string, SimFrame | null>, self: string): PlantProblem[] {
  const out: PlantProblem[] = [];
  for (const [id, fr] of Object.entries(frames)) {
    if (id === self || !fr) continue;
    for (const r of fr.rules) {
      if (r.status === "QUIET" || !isConditionRule(r)) continue;
      out.push({
        machineId: id,
        title: r.plainTitle || r.name,
        where: r.subs.map((x) => fr.defs.subassemblies.find((s) => s.id === x)?.name ?? x).join(", "),
        severity: r.severity,
        ago: r.since !== null ? Math.max(0, fr.t - r.since) : null,
      });
    }
  }
  return out;
}
