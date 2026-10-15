/**
 * Pyro-line demonstration scenarios, per machine.
 *
 * Same effect model as the kiln library (`../kiln-sim/scenarios`): timed
 * effects on a signal (physical, or `sensor` = only the reading is wrong), on
 * a line operating driver, or on the kiln shell profile. Driver effects act on
 * the whole line, so a feed cut started from KFS-01 moves every machine.
 *
 * `documentedDetection` is the detection time measured by the headless suite
 * on this simulation (D4 §8.2: simulated results demonstrate scripted demo
 * behaviour only, never a field detection rate).
 *
 * Scenarios live per machine in `scenarios/<machine>.ts`, cross-machine ones
 * in `scenarios/line.ts` (shared shapes in `scenarios/common.ts`).
 */
import { effectLevel } from "../kiln-sim/scenarios";
import { healthy, type PyroScenario } from "./scenarios/common";
import { FED_SCENARIOS } from "./scenarios/fed";
import { PHC_SCENARIOS } from "./scenarios/phc";
import { KLN_SCENARIOS } from "./scenarios/kln";
import { BRN_SCENARIOS } from "./scenarios/brn";
import { CLR_SCENARIOS } from "./scenarios/clr";
import { CCT_SCENARIOS } from "./scenarios/cct";
import { LINE_SCENARIOS } from "./scenarios/line";

export { effectLevel };
export type { PyroDriver, PyroEffect, PyroScenario, PyroTarget } from "./scenarios/common";

const BY_MACHINE: Record<string, PyroScenario[]> = {
  "PYR-FED-01": FED_SCENARIOS,
  "PYR-PHC-01": PHC_SCENARIOS,
  "PYR-KLN-01": KLN_SCENARIOS,
  "PYR-BRN-01": BRN_SCENARIOS,
  "PYR-CLR-01": CLR_SCENARIOS,
  "PYR-CCT-01": CCT_SCENARIOS,
};

export const PYRO_SCENARIOS: Record<string, PyroScenario[]> = Object.fromEntries(
  Object.entries(BY_MACHINE).map(([machine, list]) => [machine, [...list, ...LINE_SCENARIOS.filter((sc) => sc.machine === machine)]]),
);

const CUSTOM = new Map<string, PyroScenario>();

export function registerPyroScenario(sc: PyroScenario): void {
  CUSTOM.set(`${sc.machine}:${sc.id}`, sc);
}

export function pyroScenario(machine: string, id: string): PyroScenario {
  return CUSTOM.get(`${machine}:${id}`) ?? PYRO_SCENARIOS[machine]?.find((s) => s.id === id) ?? healthy(machine);
}
