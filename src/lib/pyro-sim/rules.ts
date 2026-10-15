/**
 * Pyro-line rule library.
 *
 * The spec rules come from D4-OSW-PE-PYR Rev. 02 Table 8.3 ("19 software and
 * quality rules from the MOM-reconciled register") and keep their SW-* ids.
 * Rules the D4 states only as signal purposes ("Mechanical trend: bearing,
 * imbalance, looseness / misalignment investigation", "Bearing heating;
 * correlate with load, lubrication and vibration", "Actual speed/stroke;
 * detect underspeed …") are written out per machine as R-<asset>-nn.
 * The data-quality pair keeps the R-DQ-01 / R-DQ-02 ids the ULTRON UI already
 * knows (they implement SW-DQ-01 / SW-DQ-02 / SW-DATA-01).
 *
 * Every rule follows the D4 analysis contract (§8.2): comparable operating
 * state, more than one independent signal where the asset has them, named
 * competing causes, and advisories that never replace PLC / DCS / SIS trips.
 *
 * Definitions live per machine in `rules/<machine>.ts` (shared pieces in
 * `rules/common.ts`); this module assembles the library in line order.
 */
import type { RuleCategory } from "../kiln-sim/rules";
import { DQ, type PyroRuleDef } from "./rules/common";
import { FED_RULES } from "./rules/fed";
import { PHC_RULES } from "./rules/phc";
import { KLN_RULES } from "./rules/kln";
import { BRN_RULES } from "./rules/brn";
import { CLR_RULES } from "./rules/clr";
import { CCT_RULES } from "./rules/cct";

export type { PyroRuleDef };

// Each machine's own rules, then the common data-quality / service-life set once per machine (a merged machine —
// FED-01 = FSL-01 + KFS-01, CCT-01 = HMR-01 + CSL-01 — builds its own rules from two D4 groups).
const OWN_RULES: PyroRuleDef[] = [...FED_RULES, ...PHC_RULES, ...KLN_RULES, ...BRN_RULES, ...CLR_RULES, ...CCT_RULES];
const RULE_LIST: PyroRuleDef[] = [...new Set(OWN_RULES.map((r) => r.machine))].flatMap((machine) => [...OWN_RULES.filter((r) => r.machine === machine), ...DQ(machine)]);

/** Default action owner per category (D4 §8.2: every alert names an owner). */
const OWNER: Partial<Record<RuleCategory, string>> = {
  Process: "Process / control room",
  "Rotating equipment": "Mechanical maintenance",
  Lubrication: "Mechanical maintenance (lubrication)",
  Combustion: "Process / burner engineer",
  "Material handling": "Mechanical maintenance",
  "Drive train": "Mechanical / electrical maintenance",
  "Support & thrust": "Kiln mechanical",
  "Shell & seals": "Kiln mechanical / refractory",
  "Data quality": "E&I / instrumentation",
  Anomaly: "Reliability engineer",
  "Service life": "Maintenance planning",
};

/** What a finding does not yet prove, by category, where the rule states nothing of its own (D4 §8.2 "what is not yet proven"). */
const UNPROVEN_BY_CATEGORY: Partial<Record<RuleCategory, string>> = {
  "Rotating equipment": "The fault type: bearing, imbalance, looseness and misalignment need a vibration spectrum",
  Process: "An equipment fault: the deviation may be an operating choice — confirm with the control room",
  "Material handling": "Where the restriction or wear is, until the line is walked and inspected",
  Lubrication: "Oil condition, until a dated laboratory sample confirms it",
  "Drive train": "The mechanical cause, until the drive is inspected",
  Combustion: "Flame quality, until confirmed by the operator and the shell effects",
  "Support & thrust": "The mechanical cause, until the support or thrust station is inspected; support count, tyre arrangement and bath design are reference assumptions",
  "Shell & seals": "The shell or seal defect itself: the evidence is temperature and gas, not a direct measurement of the lining or seal",
};

export const PYRO_RULES: PyroRuleDef[] = RULE_LIST.map((r) => ({
  ...r,
  owner: r.owner ?? OWNER[r.category],
  unproven: r.unproven ?? UNPROVEN_BY_CATEGORY[r.category],
}));

export const PYRO_RULES_BY_MACHINE: Record<string, PyroRuleDef[]> = PYRO_RULES.reduce<Record<string, PyroRuleDef[]>>((acc, r) => {
  (acc[r.machine] ??= []).push(r);
  return acc;
}, {});

export function pyroRule(machine: string, id: string): PyroRuleDef | undefined {
  return PYRO_RULES_BY_MACHINE[machine]?.find((r) => r.id === id);
}
