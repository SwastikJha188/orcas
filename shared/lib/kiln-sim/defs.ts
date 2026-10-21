/** The kiln-seal fleet's plant definitions (see `../plant-defs`). */
import type { PlantDefs } from "../plant-defs";
import { SHARED_SIGNALS, SIGNALS, SIGNAL_BY_TAG, SUBASSEMBLIES, SYSTEMS } from "./signals";
import { RULES, RULE_BY_ID } from "./rules";

export const KILN_DEFS: PlantDefs = {
  plant: "kiln",
  signals: SIGNALS,
  signalByTag: SIGNAL_BY_TAG,
  subassemblies: SUBASSEMBLIES,
  systems: SYSTEMS,
  rules: RULES,
  ruleById: RULE_BY_ID,
  sharedSignals: SHARED_SIGNALS as Record<string, string[]>,
  operatingTags: ["SPD-KLN-01", "ELE-KLN-01", "FLO-KLN-01", "FLO-KLN-02", "TMP-KLN-14", "TMP-KLN-13", "GAS-KLN-01", "GAS-KLN-02", "PRS-KLN-01", "PRS-KLN-03", "CAL-KLN-03", "POS-KLN-01"],
  speedTag: "SPD-KLN-01",
  setpoints: { "FLO-KLN-01": "feedSp", "FLO-KLN-02": "fuelSp" },
  driverTags: { feed: "FLO-KLN-01", fuel: "FLO-KLN-02", speed: "SPD-KLN-01" },
  hasShell: true,
  thermalRules: ["R-SHL-01", "R-SHL-02", "R-DQ-01"],
  processSystems: ["PRC-KLN-01"],
};
