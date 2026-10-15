/**
 * Shared pieces of the pyro-line rule library: the rule definition shape, the
 * per-machine data-quality / anomaly / service-life rules every machine
 * carries, and the vibration + bearing-temperature rule template.
 */
import type { RuleCategory } from "../../kiln-sim/rules";

export interface PyroRuleDef {
  id: string;
  /** Owning machine id. */
  machine: string;
  name: string;
  category: RuleCategory;
  system: string;
  subs: string[];
  logic: string;
  cause: string;
  consequence: string;
  action: string;
  inputs: string[];
  /** D4 Table 8.3 rule this implements, when it is one of the 19. */
  spec?: string;
  /** Default action owner (role) when no work order names one (D4 §8.2). */
  owner?: string;
  /** What the evidence does not yet prove (D4 §8.2, SW-ALL-02). */
  unproven?: string;
  /**
   * HOLD disclosure: the rule runs on channels or designs still on HOLD (D4 Table 6.6,
   * MOM Table B.1). The text states when findings are also capped at Advisory.
   */
  hold?: string;
  /** D5 Table 9.4.3 fault-pattern ids this rule implements (e.g. "FP-12"). */
  fp?: string[];
  /** D5 "alternative causes" to rule out before acting on the finding. */
  alternatives?: string;
}

export type R = Omit<PyroRuleDef, "machine">;

/** Rules every machine carries once: data quality, unclassified deviation, service life. */
export const DQ = (machine: string): PyroRuleDef[] => [
  {
    id: "R-DQ-01",
    machine,
    name: "Stale / flat-line / plausibility screening",
    category: "Data quality",
    system: "DQ",
    subs: [],
    logic: "Flat-line while running, zero vibration while turning, analyser or scanner status (SW-DQ-01, SW-DATA-01)",
    cause: "Instrument, wiring, analyser sample system or source timestamp fault",
    consequence: "Condition rules would judge a reading that no longer describes the plant",
    action: "Hold the reading out of diagnosis, check the source channel and instrument; no automatic failure call",
    inputs: [],
    spec: "SW-DQ-01",
    unproven: "That the instrument has failed: a stale or flat reading is screened out, not diagnosed",
  },
  {
    id: "R-DQ-02",
    machine,
    name: "Sensor validation against independent witnesses",
    category: "Data quality",
    system: "DQ",
    subs: [],
    logic: "Implausible step not explained by drivers; meter out-voted by two agreeing witnesses (SW-DQ-02)",
    cause: "Calibration drift, damaged sensor or scaling error on one instrument",
    consequence: "A false process change would be fed to every model that uses the reading",
    action: "Substitute the witness estimate, mark the instrument suspect and request calibration; vibration-vs-temperature disagreement alone is not a sensor fault",
    inputs: [],
    spec: "SW-DQ-02",
    unproven: "Which instrument is wrong: discordance alone is not proof of instrument failure",
  },
  {
    id: "R-ANM-01",
    machine,
    name: "Unclassified deviation",
    category: "Anomaly",
    system: "DQ",
    subs: [],
    logic: "A trusted signal more than 10σ from its reference model with no known pattern",
    cause: "Unknown — no rule in the library explains the deviation",
    consequence: "Possible new failure mode; evidence for the engineer, not a diagnosis",
    action: "Review the signal and its neighbours; label the event so the library can learn it",
    inputs: [],
    unproven: "Any cause: no rule in the library explains the deviation",
  },
  {
    id: "SW-ALL-01",
    machine,
    name: "Component service life due",
    category: "Service life",
    system: "SVC",
    subs: [],
    logic: "Component running hours / calendar days at 90 % or more of the OEM / plant life criterion (yellow advisory)",
    cause: "Service span reached by installation / rebuild record and duty",
    consequence: "Planned replacement window; calendar / hour / service-span due is NOT observed mechanical deterioration",
    action: "Plan the replacement or inspection in the next stop; confirm the record and life criterion",
    inputs: [],
    spec: "SW-ALL-01",
    owner: "Maintenance planning",
    unproven: "No measured deterioration: the due date comes from the component record, not from any sensor",
  },
];

/** Stamp a group of rules with their machine. The DQ / anomaly / service-life rules are added once per machine in `../rules.ts`. */
export const m = (machine: string, rules: R[]): PyroRuleDef[] => rules.map((r) => ({ ...r, machine }));

export const bearingRule = (id: string, name: string, system: string, sub: string, inputs: string[], asset: string): R => ({
  id,
  name,
  category: "Rotating equipment",
  system,
  subs: [sub],
  logic: "Vibration ×1.4 its load-corrected model together with the same bearing heating > 1.5 K (two independent signals)",
  cause: `${asset} rolling-element bearing wear, lubrication breakdown or looseness`,
  consequence: "Bearing failure, shaft damage and an unplanned stop of the line",
  action: `Take a vibration spectrum on the ${asset.toLowerCase()} bearing, check grease / oil and plan the bearing change at the next stop`,
  inputs,
});
