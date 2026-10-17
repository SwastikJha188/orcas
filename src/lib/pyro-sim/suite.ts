/**
 * Headless validation suite for the pyro line.
 *
 * Each library scenario runs on its own fresh line (never the live one) for
 * up to `RUN_MIN` simulated minutes. A fault scenario passes when its expected
 * rule is ACTIVE on its machine and no other rule is active anywhere on the
 * line; a no-fault scenario passes when the whole line stays quiet. Results
 * use the kiln Test Lab result shape so the Simulation tab shows both plants
 * in the same table.
 */
import { createLine, setScenario, stepLine } from "./engine";
import { createVpcSim, setVpcAutopilot, setVpcScenario, stepVpcSim } from "../vpc-sim/engine";
import { PYRO_LINE_SEED } from "./fleet";
import { PYRO_SCENARIOS, type PyroScenario } from "./scenarios";
import { VPC_SCENARIOS } from "../vpc-sim/scenarios";
import { VPC_MACHINE_IDS } from "../vpc-sim/signals";
import type { Affected, Fired, SuiteCase, TestResult } from "../kiln-sim/test-lab";

/** Simulated minutes per scenario. */
export const RUN_MIN = 600;
/** Consecutive samples beyond 3σ before a signal counts as affected (as in the kiln Test Lab). */
const SUSTAIN = 5;

/**
 * A headless scenario run that advances in chunks, so a browser can yield
 * between them (a whole line minute costs far more than one kiln minute).
 */
export interface PyroScenarioRun {
  /** Advance up to `minutes` simulated minutes; true once the run is complete. */
  step(minutes: number): boolean;
  result(): TestResult;
}

/** Start one pyro or VPC scenario on a fresh line. */
export function startPyroScenarioTest(sc: PyroScenario, seed = PYRO_LINE_SEED): PyroScenarioRun {
  const isVpc = VPC_MACHINE_IDS.has(sc.machine);
  const vpcState = isVpc ? createVpcSim(seed) : null;
  const line = isVpc ? null : createLine(seed);
  if (vpcState) {
    setVpcAutopilot(vpcState, false);
    setVpcScenario(vpcState, sc.id);
  } else if (line) {
    setScenario(line, sc.machine, sc.id);
  }
  const own: Record<string, Fired> = {};
  const other: Record<string, Fired> = {};
  const maxZ: Record<string, number> = {};
  const streak: Record<string, number> = {};
  const sustained = new Set<string>();
  /** Service-life findings (calendar / hour due): listed as fired, never counted against a scenario. */
  const serviceLife = new Set<string>();
  let dangerAt: number | null = null;
  let m = 0;

  const step = (minutes: number): boolean => {
    const end = Math.min(RUN_MIN, m + Math.max(1, Math.floor(minutes)));
    while (m < end) {
      m += 1;
      const frames = vpcState ? { [sc.machine]: stepVpcSim(vpcState, true) } : stepLine(line!, false);
      for (const [mid, f] of Object.entries(frames)) {
        for (const r of f.rules) {
          if (r.status !== "ACTIVE") continue;
          const key = mid === sc.machine ? r.id : `${mid} · ${r.id}`;
          const into = mid === sc.machine ? own : other;
          if (!into[key]) into[key] = { id: key, name: r.name, t: m, severity: r.severity, confidence: r.confidence };
          if (r.category === "Service life") serviceLife.add(key);
        }
      }
      const f = frames[sc.machine];
      if (!f) continue;
      for (const [tag, sig] of Object.entries(f.signals)) {
        if (dangerAt === null && sig.limitSeverity === "Critical") dangerAt = m;
        if (sig.z === null || sig.quality === "Invalid") continue;
        const z = Math.abs(sig.z);
        if (z > (maxZ[tag] ?? 0)) maxZ[tag] = z;
        streak[tag] = z > 3 ? (streak[tag] ?? 0) + 1 : 0;
        if (streak[tag] >= SUSTAIN) sustained.add(tag);
      }
    }
    return m >= RUN_MIN;
  };

  const result = (): TestResult => {
    const list = [...Object.values(own), ...Object.values(other)].sort((a, b) => a.t - b.t);
    // Cross-machine scenarios also expect the propagation's findings on other machines ("<machine> · <rule>").
    const allowed = new Set([...sc.expected, ...(sc.expectedElsewhere ?? [])]);
    const first = list.find((x) => sc.expected.includes(x.id)) ?? list.find((x) => allowed.has(x.id)) ?? null;
    const unexpected = list.filter((x) => !allowed.has(x.id) && !serviceLife.has(x.id)).map((x) => x.id);
    const quiet = sc.expected.length === 0 && !sc.expectedElsewhere?.length;
    const pass = m >= RUN_MIN && (quiet ? unexpected.length === 0 : first !== null && unexpected.length === 0);
    const affected: Affected[] = Object.entries(maxZ)
      .filter(([tag]) => sustained.has(tag))
      .sort((a, b) => b[1] - a[1])
      .map(([tag, z]) => ({ tag, z, path: null }));
    return {
      scenarioId: sc.id,
      name: sc.name,
      expectLabel: quiet ? "No alarm" : [...allowed].join(", "),
      pass,
      // Minutes from scenario start, the same clock as the documented detection.
      detectedAfter: first ? first.t : null,
      detectedConfidence: first?.confidence ?? null,
      dangerAt,
      leadMin: first && dangerAt !== null ? dangerAt - first.t : null,
      fired: list,
      unexpected,
      affected,
      ranMin: m,
      kind: quiet ? "quiet" : "fault",
    };
  };

  return { step, result };
}

/** Run one pyro scenario headless to the end and score it. */
export function runPyroScenarioTest(sc: PyroScenario, seed = PYRO_LINE_SEED): TestResult {
  const run = startPyroScenarioTest(sc, seed);
  run.step(RUN_MIN);
  return run.result();
}

export type PyroSuiteCase = SuiteCase & { start: () => PyroScenarioRun };

/** Every library scenario of one pyro or VPC machine except the healthy baseline. */
export function pyroSuiteCases(machineId: string): PyroSuiteCase[] {
  const list = VPC_MACHINE_IDS.has(machineId) ? VPC_SCENARIOS : (PYRO_SCENARIOS[machineId] ?? []);
  return list
    .filter((sc) => sc.id !== "healthy")
    .map((sc) => ({ id: sc.id, name: sc.name, run: () => runPyroScenarioTest(sc), start: () => startPyroScenarioTest(sc) }));
}
