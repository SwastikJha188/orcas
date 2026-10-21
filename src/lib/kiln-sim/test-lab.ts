/**
 * Test Lab: custom fault injections and headless test runs on the kiln engine.
 *
 * A custom test is a few injections (signal or driver, real change or sensor
 * error, shape, magnitude, onset, duration) turned into an ordinary
 * `KilnScenario`, so the live plant and the headless runner use the same
 * engine path as the library scenarios. Headless runs use their own `SimState`
 * and never touch the live fleet.
 */

import { createSim, setScenario, stepSim, type SimFrame } from "@shared/lib/kiln-sim/engine";
import { RULES, RULE_BY_ID } from "@shared/lib/kiln-sim/rules";
import { KILN_SCENARIOS, registerScenario, type EffectShape, type EffectTarget, type KilnScenario, type ScenarioEffect } from "@shared/lib/kiln-sim/scenarios";
import { SIGNALS, SIGNAL_BY_TAG, SYSTEMS, type SystemId } from "@shared/lib/kiln-sim/signals";
import { AMBIENT, EQUATIONS, SPEC_LINKS } from "./relationships";

/* ------------------------------------------------------------------ */
/* Injections                                                          */
/* ------------------------------------------------------------------ */

export type InjectionMode = "real" | "sensor";
export type InjectionShape = "step" | "ramp" | "drift" | "osc" | "spike" | "noise" | "stuck";

export const SHAPES: Array<{ id: InjectionShape; label: string; sensorOnly?: boolean }> = [
  { id: "step", label: "Step" },
  { id: "ramp", label: "Ramp" },
  { id: "drift", label: "Drift (keeps going)" },
  { id: "osc", label: "Oscillation" },
  { id: "spike", label: "Spike" },
  { id: "noise", label: "Noise", sensorOnly: true },
  { id: "stuck", label: "Stuck reading", sensorOnly: true },
];

export interface Injection {
  /** Signal tag, or `drv:<name>` for an operating driver (real change only). */
  target: string;
  mode: InjectionMode;
  shape: InjectionShape;
  magnitude: number;
  onsetMin: number;
  durationMin: number;
}

/** "ANY" finding, "NONE" (must stay quiet), "SENSOR" (data-quality only) or one rule id. */
export type Expectation = string;

export interface CustomTest {
  id: string;
  name: string;
  injections: Injection[];
  expect: Expectation;
}

/** Operating drivers with no measured tag of their own. Feed, fuel, speed and draft are injected on their meters. */
export const DRIVERS: Array<{ id: string; name: "ambient"; label: string; unit: string; node: string; mag: number }> = [
  { id: "drv:ambient", name: "ambient", label: "Ambient temperature", unit: "K", node: AMBIENT, mag: 10 },
];
/** A real change on these meters moves the plant driver itself, so the physics carries it everywhere. */
const DRIVER_TAGS: Record<string, "feed" | "fuel" | "speed" | "draft"> = {
  "FLO-KLN-01": "feed",
  "FLO-KLN-02": "fuel",
  "SPD-KLN-01": "speed",
  "PRS-KLN-01": "draft",
};
const DRIVER_BY_ID = Object.fromEntries(DRIVERS.map((d) => [d.id, d]));

/** Analog, measured signals that can take an injection, grouped by system. */
export const INJECTABLE = SYSTEMS.map((sys) => ({
  system: sys,
  signals: SIGNALS.filter((d) => d.system === sys.id && d.type === "analog" && !d.calculated),
}));

export function isDriver(target: string): boolean {
  return target.startsWith("drv:");
}

export function targetUnit(target: string): string {
  return DRIVER_BY_ID[target]?.unit ?? SIGNAL_BY_TAG[target]?.unit ?? "";
}

export function targetLabel(target: string): string {
  return DRIVER_BY_ID[target]?.label ?? SIGNAL_BY_TAG[target]?.name ?? target;
}

/** A magnitude that is clearly visible on the target: ~8 σ, or the driver's usual step. */
export function defaultMagnitude(target: string): number {
  const drv = DRIVER_BY_ID[target];
  if (drv) return drv.mag;
  const def = SIGNAL_BY_TAG[target];
  if (!def) return 1;
  const raw = def.sigma * 8;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  return +(Math.ceil(raw / p) * p).toFixed(Math.max(0, def.decimals));
}

/** Keep an injection consistent after an edit (drivers are real only, sensor-only shapes need a sensor). */
export function normaliseInjection(inj: Injection): Injection {
  const out = { ...inj };
  if (isDriver(out.target)) out.mode = "real";
  if (out.mode === "real" && SHAPES.find((s) => s.id === out.shape)?.sensorOnly) out.shape = "step";
  out.onsetMin = Math.max(0, Math.round(out.onsetMin || 0));
  out.durationMin = Math.max(1, Math.round(out.durationMin || 1));
  return out;
}

export function describeInjection(inj: Injection): string {
  const shape = SHAPES.find((s) => s.id === inj.shape)?.label.toLowerCase() ?? inj.shape;
  const mag = inj.shape === "stuck" ? "" : ` ${inj.magnitude > 0 ? "+" : ""}${inj.magnitude} ${targetUnit(inj.target)}`;
  const tag = isDriver(inj.target) ? targetLabel(inj.target).split(" (")[0] : inj.target;
  return `${tag} · ${inj.mode === "sensor" ? "sensor" : "real"} ${shape}${mag}`;
}

/** Healthy operating point of every relationship node (D5 Table 9.5 at nominal drivers). */
function solve(fixed: Record<string, number>): Record<string, number> {
  const v: Record<string, number> = { "FLO-KLN-01": 330, "FLO-KLN-02": 10.6, "SPD-KLN-01": 3.8, "PRS-KLN-01": -3.8, [AMBIENT]: 35.8, "POS-KLN-01": -3.1, ...fixed };
  for (let pass = 0; pass < 4; pass++) for (const eq of EQUATIONS) if (!(eq.target in fixed)) v[eq.target] = eq.f((tag) => v[tag] ?? 0);
  return v;
}
const NOMINAL = solve({});

/**
 * Real change on a measured signal: the signal itself plus every measured
 * signal the relationship equations drive from it, at the same shape and
 * timing. (Library scenarios script their downstream effects by hand.)
 */
function downstream(tag: string, delta: number): Array<[string, number]> {
  const moved = solve({ [tag]: NOMINAL[tag] + delta });
  const out: Array<[string, number]> = [];
  for (const [t, v] of Object.entries(moved)) {
    if (t === tag) continue;
    const def = SIGNAL_BY_TAG[t];
    if (!def || def.calculated || def.type !== "analog") continue;
    const d = v - NOMINAL[t];
    if (Math.abs(d) > def.sigma * 0.05) out.push([t, d]);
  }
  return out;
}

function toEffects(inj: Injection): ScenarioEffect[] {
  const timing = { onsetMin: inj.onsetMin, rampMin: inj.durationMin, shape: inj.shape as EffectShape };
  const drv = DRIVER_BY_ID[inj.target];
  if (drv) return [{ target: { kind: "driver", name: drv.name }, delta: inj.magnitude, ...timing }];
  const target: EffectTarget = { kind: "signal", tag: inj.target };
  if (inj.shape === "stuck") return [{ target, hold: true, onsetMin: inj.onsetMin, rampMin: 0, shape: "step", sensor: true }];
  if (inj.mode === "sensor") return [{ target, delta: inj.magnitude, sensor: true, ...timing }];
  const plant = DRIVER_TAGS[inj.target];
  if (plant) return [{ target: { kind: "driver", name: plant }, delta: inj.magnitude, ...timing }];
  return [
    { target, delta: inj.magnitude, ...timing },
    ...downstream(inj.target, inj.magnitude).map<ScenarioEffect>(([tag, d]) => ({ target: { kind: "signal", tag }, delta: d, ...timing })),
  ];
}

export function expectationLabel(e: Expectation): string {
  if (e === "ANY") return "Any finding";
  if (e === "NONE") return "No alarm";
  if (e === "SENSOR") return "Sensor error detected";
  return `${e} ${RULE_BY_ID[e]?.name ?? ""}`.trim();
}

export const EXPECTATIONS: Array<{ value: Expectation; label: string }> = [
  { value: "ANY", label: "Any finding" },
  { value: "NONE", label: "No alarm (must stay quiet)" },
  { value: "SENSOR", label: "Sensor error detected" },
  ...RULES.map((r) => ({ value: r.id, label: `${r.id} · ${r.name}` })),
];

/** Turn a custom test into a scenario under `id` and register it with the engine. */
export function buildScenario(test: CustomTest, id: string): KilnScenario {
  const injections = test.injections.map(normaliseInjection);
  const sc: KilnScenario = {
    id,
    name: test.name || "Custom test",
    group: "Custom",
    expected: test.expect === "ANY" || test.expect === "NONE" || test.expect === "SENSOR" ? [] : [test.expect],
    documentedDetection: "—",
    description: injections.map(describeInjection).join(" + "),
    effects: injections.flatMap(toEffects),
  };
  registerScenario(sc);
  return sc;
}

/* ------------------------------------------------------------------ */
/* Headless runs                                                       */
/* ------------------------------------------------------------------ */

const SEED = 20261012;
const MAX_RUN = 900;
const TAIL = 180;
/** Consecutive samples beyond 3σ before a signal counts as affected (not a noise tail). */
const SUSTAIN = 5;

export interface Fired {
  id: string;
  name: string;
  /** Minutes after scenario start. */
  t: number;
  severity: string;
  confidence: number;
}

export interface Affected {
  tag: string;
  z: number;
  path: string[] | null;
}

export interface TestResult {
  scenarioId: string;
  name: string;
  expectLabel: string;
  pass: boolean;
  /** Minutes after the first injection to the first matching finding. */
  detectedAfter: number | null;
  detectedConfidence: number | null;
  /** Minutes after scenario start to the first danger-limit reading. */
  dangerAt: number | null;
  leadMin: number | null;
  fired: Fired[];
  unexpected: string[];
  affected: Affected[];
  ranMin: number;
  /** Library scenario with expected rules (scored for detection), or a no-fault case. */
  kind: "fault" | "quiet" | "custom";
}

/** Downstream links of the relationship graph, for "how the change propagated". */
const CHILDREN: Record<string, string[]> = {};
for (const l of SPEC_LINKS) (CHILDREN[l.from] ??= []).push(l.to);

function pathTo(src: string, tgt: string): string[] | null {
  if (src === tgt) return [src];
  const prev: Record<string, string> = {};
  const seen = new Set([src]);
  const q = [src];
  while (q.length) {
    const x = q.shift()!;
    for (const c of CHILDREN[x] ?? []) {
      if (seen.has(c)) continue;
      seen.add(c);
      prev[c] = x;
      if (c === tgt) {
        const p = [c];
        let y = c;
        while (prev[y]) p.unshift((y = prev[y]));
        return p;
      }
      q.push(c);
    }
  }
  return null;
}

function sourceNode(target: string): string {
  return DRIVER_BY_ID[target]?.node ?? target;
}

function runLength(sc: KilnScenario): number {
  const end = Math.max(0, ...sc.effects.map((e) => e.onsetMin + (e.shape === "drift" || e.shape === "osc" || e.shape === "noise" ? e.rampMin * 2 : e.rampMin)));
  const m = /\+(\d+)h\s*(\d+)m/.exec(sc.documentedDetection);
  const documented = m ? Number(m[1]) * 60 + Number(m[2]) : 0;
  return Math.min(MAX_RUN, Math.max(end, documented * 1.5) + TAIL);
}

function isDanger(f: SimFrame): boolean {
  for (const sig of Object.values(f.signals)) if (sig.limitSeverity === "Critical") return true;
  return false;
}

function matches(expect: Expectation | string[], ruleId: string): boolean {
  if (Array.isArray(expect)) return expect.includes(ruleId);
  if (expect === "ANY") return true;
  if (expect === "SENSOR") return ruleId.startsWith("R-DQ");
  if (expect === "NONE") return false;
  return ruleId === expect;
}

/**
 * Run a scenario headless from a healthy warm plant and score it.
 * `expect` is the scenario's rule list (library) or an expectation (custom).
 */
export function runScenarioTest(sc: KilnScenario, expect: Expectation | string[], sources: string[] = []): TestResult {
  const s = createSim("healthy", SEED);
  setScenario(s, sc.id);
  const minutes = runLength(sc);
  const onset = Math.min(...sc.effects.map((e) => e.onsetMin), Infinity);
  const t0 = Number.isFinite(onset) ? onset : 0;
  const fired: Record<string, Fired> = {};
  const maxZ: Record<string, number> = {};
  const streak: Record<string, number> = {};
  const sustained = new Set<string>();
  let dangerAt: number | null = null;

  for (let m = 1; m <= minutes; m++) {
    const f = stepSim(s, false);
    for (const r of f.rules) {
      if (r.status === "ACTIVE" && !fired[r.id]) fired[r.id] = { id: r.id, name: r.name, t: m, severity: r.severity, confidence: r.confidence };
    }
    if (dangerAt === null && m > t0 && isDanger(f)) dangerAt = m;
    for (const [tag, sig] of Object.entries(f.signals)) {
      if (sig.z === null || sig.quality === "Invalid") continue;
      const z = Math.abs(sig.z);
      if (z > (maxZ[tag] ?? 0)) maxZ[tag] = z;
      streak[tag] = z > 3 ? (streak[tag] ?? 0) + 1 : 0;
      if (streak[tag] >= SUSTAIN) sustained.add(tag);
    }
  }

  const list = Object.values(fired).sort((a, b) => a.t - b.t);
  const hit = list.filter((f) => matches(expect, f.id));
  const first = hit[0] ?? null;
  const quiet = Array.isArray(expect) ? expect.length === 0 : expect === "NONE";
  // Data-quality findings are the right answer to a sensor fault, never collateral of one.
  const sensorCase = sc.group === "Sensor validation" || expect === "SENSOR";
  const extra = list.filter((f) => !matches(expect, f.id) && !(sensorCase && f.id.startsWith("R-DQ"))).map((f) => f.id);
  const pass = quiet ? list.length === 0 : first !== null && (sensorCase ? extra.length === 0 : true);
  const srcNodes = sources.map(sourceNode);
  const affected = Object.entries(maxZ)
    .filter(([tag]) => sustained.has(tag))
    .sort((a, b) => b[1] - a[1])
    .map(([tag, z]) => ({ tag, z, path: srcNodes.map((src) => pathTo(src, tag)).find((p) => p) ?? null }));

  return {
    scenarioId: sc.id,
    name: sc.name,
    expectLabel: Array.isArray(expect) ? (expect.length ? expect.join(", ") : "No alarm") : expectationLabel(expect),
    pass,
    detectedAfter: first ? Math.max(0, first.t - t0) : null,
    detectedConfidence: first?.confidence ?? null,
    dangerAt,
    leadMin: first && dangerAt !== null ? dangerAt - first.t : null,
    fired: list,
    unexpected: extra,
    affected,
    ranMin: minutes,
    kind: sc.group === "Custom" ? "custom" : quiet ? "quiet" : "fault",
  };
}

/** Run a custom test headless under a throw-away scenario id. */
export function runCustomTest(test: CustomTest): TestResult {
  const sc = buildScenario(test, `lab-run-${test.id}`);
  return runScenarioTest(sc, test.expect, test.injections.map((i) => i.target));
}

export interface SweepPoint {
  magnitude: number;
  detectedAfter: number | null;
  finding: string | null;
}

export const SWEEP_LEVELS = [0.25, 0.5, 0.75, 1, 1.5, 2];

/** Scale the first injection over `SWEEP_LEVELS` to find the smallest change that is detected. */
export function runSweep(test: CustomTest): { points: SweepPoint[]; unit: string; smallest: number | null } {
  const base = test.injections[0];
  const points = SWEEP_LEVELS.map((k) => {
    const injections = test.injections.map((inj, i) => (i === 0 ? { ...inj, magnitude: +(inj.magnitude * k).toPrecision(4) } : inj));
    const r = runCustomTest({ ...test, id: `${test.id}-sweep`, injections });
    const top = r.fired.find((f) => matches(test.expect, f.id)) ?? null;
    return { magnitude: injections[0].magnitude, detectedAfter: r.detectedAfter, finding: top ? `${top.id} ${top.name}` : null };
  });
  const found = points.filter((p) => p.detectedAfter !== null).map((p) => Math.abs(p.magnitude));
  return { points, unit: targetUnit(base.target), smallest: found.length ? Math.min(...found) * Math.sign(base.magnitude || 1) : null };
}

/* ------------------------------------------------------------------ */
/* Validation suite                                                    */
/* ------------------------------------------------------------------ */

export interface SuiteCase {
  id: string;
  name: string;
  run: () => TestResult;
}

/** Every library scenario except the healthy baseline, then the saved tests. */
export function suiteCases(saved: CustomTest[]): SuiteCase[] {
  return [
    ...KILN_SCENARIOS.filter((sc) => sc.id !== "healthy").map((sc) => ({ id: sc.id, name: sc.name, run: () => runScenarioTest(sc, sc.expected) })),
    ...saved.map((t) => ({ id: `saved-${t.id}`, name: t.name, run: () => runCustomTest(t) })),
  ];
}

export interface SuiteSummary {
  detection: number | null;
  noFalseAlarm: number | null;
  meanLead: number | null;
  passed: number;
  total: number;
}

export function summariseSuite(results: TestResult[]): SuiteSummary {
  const faults = results.filter((r) => r.kind === "fault");
  const quiet = results.filter((r) => r.kind === "quiet");
  const leads = results.map((r) => r.leadMin).filter((x): x is number => x !== null && x > 0);
  return {
    detection: faults.length ? faults.filter((r) => r.detectedAfter !== null).length / faults.length : null,
    noFalseAlarm: quiet.length ? quiet.filter((r) => r.pass).length / quiet.length : null,
    meanLead: leads.length ? leads.reduce((a, b) => a + b, 0) / leads.length : null,
    passed: results.filter((r) => r.pass).length,
    total: results.length,
  };
}

/**
 * Simulated plant time ("2h 31m", "45m"), the unit of D5 Table 9.8. Unlike
 * `formatDuration` it ignores the display wall clock: headless results are
 * plant minutes, whatever speed the live view runs at.
 */
export function fmtMin(m: number | null): string {
  if (m === null || !Number.isFinite(m)) return "—";
  const r = Math.max(0, Math.round(m));
  const h = Math.floor(r / 60);
  return h > 0 ? `${h}h ${String(r % 60).padStart(2, "0")}m` : `${r}m`;
}

export type { SystemId };
