/** Plant definitions for Schultheiss VPC 066 (see `../plant-defs`). */
import type { PlantDefs } from "../plant-defs";
import { VPC_MACHINE_ID, VPC_SIGNALS, VPC_SIGNAL_BY_TAG, VPC_SUBASSEMBLIES, VPC_SYSTEMS } from "./signals";
import { VPC_RULES } from "./rules";

export const VPC_DEFS: PlantDefs = {
  plant: "pyro",
  signals: VPC_SIGNALS,
  signalByTag: VPC_SIGNAL_BY_TAG,
  subassemblies: VPC_SUBASSEMBLIES,
  systems: VPC_SYSTEMS,
  rules: VPC_RULES,
  ruleById: Object.fromEntries(VPC_RULES.map((r) => [r.id, r])),
  sharedSignals: {},
  operatingTags: ["T1", "E1", "P2", "P1", "P3", "F1", "T2", "T3", "DT1", "V1", "T4", "V2"],
  speedTag: null,
  setpoints: {},
  driverTags: {
    feed: null,
    fuel: "E1",
    speed: null,
  },
  hasShell: false,
  thermalRules: [],
  processSystems: [],
};

export interface VpcFleetMember {
  machineId: string;
  seed: number;
  profile: "healthy" | "advisory" | "critical";
}

export const VPC_FLEET: ReadonlyArray<VpcFleetMember> = [
  { machineId: "VPC-066", seed: 20261016, profile: "healthy" },
  { machineId: "VPC-067", seed: 20261017, profile: "advisory" },
  { machineId: "VPC-068", seed: 20261018, profile: "critical" },
];

