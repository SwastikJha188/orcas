/** Plant definitions of each pyro-line machine (see `../plant-defs`). */
import type { PlantDefs } from "../plant-defs";
import { PYRO_MACHINES, PYRO_SIGNALS, PYRO_SUBASSEMBLIES, PYRO_SYSTEMS } from "./signals";
import { PYRO_RULES_BY_MACHINE } from "./rules";

/** Operating point per machine, in process order. */
const OPERATING: Record<string, string[]> = {
  "PYR-FED-01": ["LEV-FSL-01", "PRS-FSL-01", "ELE-FSL-01", "POS-FSL-01", "WGT-KFS-01", "FLO-KFS-01", "FLO-KFS-02", "PRS-KFS-01", "PRS-KFS-03", "ELE-KFS-01"],
  "PYR-PHC-01": ["TMP-PHC-30", "PRS-PHC-01", "TMP-PHC-06", "TMP-PHC-08", "TMP-PHC-07", "GAS-PHC-01", "GAS-PHC-02", "TMP-PHC-31", "SPD-PHC-01", "ELE-PHC-01"],
  "PYR-KLN-01": ["SPD-KLN-01", "ELE-KLN-01", "TMP-KLN-14", "TMP-KLN-13", "GAS-KLN-01", "GAS-KLN-02", "GAS-KLN-03", "PRS-KLN-01", "PRS-KLN-03", "STS-KLN-08", "POS-KLN-01"],
  "PYR-BRN-01": ["FLO-BRN-01", "PRS-BRN-01", "PRS-BRN-02", "PRS-BRN-03", "TMP-BRN-02", "LEV-BRN-01", "PRS-BRN-04", "FLO-BRN-02"],
  "PYR-CLR-01": ["SPD-CLR-11", "PRS-CLR-01", "PRS-CLR-03", "PRS-CLR-06", "ELE-CLR-11", "TMP-CLR-08", "TMP-CLR-09", "ELE-CLR-07"],
  "PYR-CCT-01": ["ELE-HMR-01", "TMP-HMR-03", "TMP-HMR-06", "ELE-CSL-01", "LEV-CSL-01", "PRS-CSL-01"],
};

/** Speed signal of each machine (OSW-PE-SNL-PYR-01 Rev. 02: the elevator, crusher and conveyor have zero-speed switches only). */
const SPEED: Record<string, string | null> = {
  "PYR-FED-01": null,
  "PYR-PHC-01": "SPD-PHC-01",
  "PYR-KLN-01": "SPD-KLN-01",
  "PYR-BRN-01": null,
  "PYR-CLR-01": "SPD-CLR-11",
  "PYR-CCT-01": null,
};

function build(machineId: string): PlantDefs {
  const signals = PYRO_SIGNALS.filter((s) => s.machine === machineId);
  const rules = PYRO_RULES_BY_MACHINE[machineId] ?? [];
  const tags = new Set(signals.map((s) => s.tag));
  return {
    plant: "pyro",
    signals,
    signalByTag: Object.fromEntries(signals.map((s) => [s.tag, s])),
    subassemblies: PYRO_SUBASSEMBLIES.filter((s) => s.machine === machineId),
    systems: PYRO_SYSTEMS.filter((s) => s.machine === machineId),
    rules,
    ruleById: Object.fromEntries(rules.map((r) => [r.id, r])),
    sharedSignals: {},
    operatingTags: OPERATING[machineId] ?? [],
    speedTag: SPEED[machineId] ?? null,
    setpoints: {
      ...(tags.has("FLO-KFS-01") ? { "FLO-KFS-01": "feedSp" as const, "FLO-KFS-02": "feedSp" as const } : {}),
      ...(tags.has("FLO-BRN-01") ? { "FLO-BRN-01": "fuelSp" as const } : {}),
    },
    // Solid-flow meters A and B each carry half of the kiln-feed set-point.
    ...(tags.has("FLO-KFS-01") ? { setpointShare: { "FLO-KFS-01": 0.5, "FLO-KFS-02": 0.5 } } : {}),
    driverTags: {
      feed: tags.has("FLO-KFS-01") ? "FLO-KFS-01" : null,
      fuel: tags.has("FLO-BRN-01") ? "FLO-BRN-01" : null,
      speed: SPEED[machineId] ?? null,
    },
    hasShell: machineId === "PYR-KLN-01",
    thermalRules: machineId === "PYR-KLN-01" ? ["SW-KLN-04", "R-KLN-19", "R-KLN-14", "R-KLN-17", "SW-KLN-03", "R-KLN-10", "R-DQ-01"] : [],
    processSystems: PYRO_SYSTEMS.filter((s) => s.machine === machineId && !s.scored).map((s) => s.id),
  };
}

export const PYRO_DEFS: Record<string, PlantDefs> = Object.fromEntries(PYRO_MACHINES.map((m) => [m.id, build(m.id)]));
