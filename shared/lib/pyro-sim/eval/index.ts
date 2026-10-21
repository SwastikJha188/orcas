/**
 * Rule evaluation of the whole line for one minute, machine by machine in
 * line order, then service life, then data quality / anomaly (which need
 * every other machine's findings to know which deviations are covered).
 */
import { PYRO_MACHINES } from "../signals";
import { servicePartsOf, serviceUsed } from "../service-life";
import type { EvalContext } from "./context";
import { evalFed } from "./fed";
import { evalPhc } from "./phc";
import { evalKln } from "./kln";
import { evalBrn } from "./brn";
import { evalClr } from "./clr";
import { evalCct } from "./cct";
import { evalQualityRules } from "./quality";

export { bearingHit, type EvalContext, type Hit, type Lead, type Values } from "./context";
export {
  adoptLineMemory,
  applyAnalyserCycle,
  lineMemory,
  qualityNoteOf,
  screenQuality,
  shiftValidityOf,
  signalQuality,
  spanOf,
  type HealthMem,
  type QualityInput,
  type QualityScreen,
  type ShiftTally,
  type ShiftValidity,
} from "./quality";

const MACHINE_IDS = PYRO_MACHINES.map((m) => m.id);

/** SW-ALL-01: part service records (database) — calendar / hour due, not deterioration. */
function evalServiceLife({ t, H }: EvalContext): void {
  for (const id of MACHINE_IDS) {
    const due = servicePartsOf(id).filter((c) => serviceUsed(c, t) >= c.dueShare);
    if (due.length)
      H(id, "SW-ALL-01", {
        severity: "Alert",
        evidence: due
          .map((c) => `${c.name} ${(serviceUsed(c, t) * 100).toFixed(0)} % of ${c.life.toLocaleString("en-GB")} ${c.basis === "h" ? "h" : "days"}${c.installed ? ` (installed ${c.installed})` : ""}`)
          .join(" · "),
        tags: [],
        subs: [...new Set(due.flatMap((c) => (c.sub ? [c.sub] : [])))],
        stateRule: true,
      });
  }
}

/** Evaluate every rule of the line into `c.hits`. */
export function evaluateRules(c: EvalContext): void {
  evalFed(c);
  evalPhc(c);
  evalKln(c);
  evalBrn(c);
  evalClr(c);
  evalCct(c);
  evalServiceLife(c);
  evalQualityRules(c);
}
