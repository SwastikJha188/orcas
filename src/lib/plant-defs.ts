/**
 * Plant definitions a live frame was computed from.
 *
 * Every live engine (the kiln-seal fleet in `kiln-sim`, the pyro line in
 * `pyro-sim`) stamps its frames with the signal catalog, sub-assemblies,
 * systems and rules of that machine. Pages read definitions from
 * `frame.defs` (or `defsFor(machineId)` when they have no frame) instead of a
 * module-level kiln catalog, so the same page works for every live machine.
 *
 * Pure data, no React and no server imports.
 */
import type { LimitRule } from "./kiln-sim/signals";
import type { RuleCategory } from "./kiln-sim/rules";

export interface DefSignal {
  tag: string;
  name: string;
  unit: string;
  sub: string;
  system: string;
  point: string;
  type: "analog" | "state";
  sigma: number;
  decimals: number;
  limit?: LimitRule;
  states?: { normal: string; warn?: string[]; alarm?: string[] };
  calculated?: boolean;
  instrument: string;
  normalBand: string;
  /** "manual" = dated record (laboratory, handheld), never a wired channel. */
  origin?: "online" | "calculated" | "manual";
  /**
   * SW-DQ-01 variability profile: a running channel whose peak-to-peak spread
   * over `flatlineN` samples stays below `minVar` (engineering units) is flat-lined.
   */
  flatlineN?: number;
  minVar?: number;
  /** Scanner scan rate / spatial resolution metadata (MOM 1.10.1), where the source is a scanner. */
  scanResolution?: string;
}

export interface DefRule {
  id: string;
  name: string;
  category: RuleCategory;
  system: string;
  subs: string[];
  logic: string;
  cause: string;
  consequence: string;
  action: string;
  inputs: string[];
  /** Default action owner (role) when no work order names one (D4 §8.2). */
  owner?: string;
  /** What the evidence does not yet prove (D4 §8.2, SW-ALL-02). */
  unproven?: string;
  /** HOLD disclosure: the rule runs on channels or designs still on HOLD (D4 Table 6.6 / MOM Table B.1); the text says when findings are capped at Advisory. */
  hold?: string;
}

export interface PlantDefs {
  /** "kiln" for the kiln-seal fleet, "pyro" for the pyro line. */
  plant: "kiln" | "pyro";
  signals: DefSignal[];
  signalByTag: Record<string, DefSignal>;
  subassemblies: Array<{ id: string; system: string; name: string }>;
  systems: Array<{ id: string; name: string; scored: boolean }>;
  rules: DefRule[];
  ruleById: Record<string, DefRule>;
  /** Signals a sub-assembly window also shows that belong elsewhere. */
  sharedSignals: Record<string, string[]>;
  /** Signals that summarise the operating point (Overview). */
  operatingTags: string[];
  /** Rotation / speed signal for the "State: Rotating x" header, if the machine has one. */
  speedTag: string | null;
  /** Analog tags judged against an operator set-point: tag → `frame.drivers` key. */
  setpoints: Record<string, "feedSp" | "fuelSp">;
  /** Feed / fuel / speed meters the analysis treats as process drivers. */
  driverTags: { feed: string | null; fuel: string | null; speed: string | null };
  /** True when the frame carries a kiln shell scanner profile (Thermal tab). */
  hasShell: boolean;
  /** Rules shown on the Thermal tab. */
  thermalRules: string[];
  /** System ids that describe process context rather than machine condition. */
  processSystems: string[];
}

/** Categories that describe the measurement or the service plan, not machine condition: never scored. */
export const NON_CONDITION_CATEGORIES: readonly string[] = ["Data quality", "Anomaly", "Service life"];

/** True when a rule describes machine condition (counts toward health, condition and findings). */
export function isConditionRule(r: { category: string }): boolean {
  return !NON_CONDITION_CATEGORIES.includes(r.category);
}

/** Severity-ordered category list for rule boards. */
export function ruleCategories(defs: PlantDefs): RuleCategory[] {
  const seen: RuleCategory[] = [];
  for (const r of defs.rules) if (!seen.includes(r.category)) seen.push(r.category);
  const tail: RuleCategory[] = ["Service life", "Data quality", "Anomaly"];
  return [...seen.filter((c) => !tail.includes(c)), ...tail.filter((c) => seen.includes(c))];
}

/**
 * A dated manual record (D4 Table 6.4): laboratory oil analysis or a matched
 * handheld shell scan, entered in ULTRON — never substituted by a live sensor.
 */
export interface ManualRecord {
  id: string;
  tag: string;
  /** Simulated minute the record was taken. */
  t: number;
  /** Where / how it was collected. */
  where: string;
  method: string;
  /** Headline result in the record's unit. */
  value: number;
  unit: string;
  /** Further record fields, in D4 Table 6.4 order. */
  fields: Array<{ label: string; value: string }>;
  by: string;
  review: "Pending review" | "Reviewed";
  /** Named reviewer and simulated minute of acceptance, once reviewed. */
  reviewedBy?: string;
  reviewedAt?: number;
}
