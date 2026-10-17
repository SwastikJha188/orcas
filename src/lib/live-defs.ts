/**
 * Which plant definitions a live machine runs on. Use `frame.defs` when a
 * frame is at hand; this is for code that only has a machine id.
 */
import type { PlantDefs } from "./plant-defs";
import { KILN_DEFS } from "./kiln-sim/defs";
import { KILN_FLEET_IDS } from "./kiln-sim/fleet";
import { PYRO_DEFS } from "./pyro-sim/defs";
import { PYRO_MACHINE_IDS } from "./pyro-sim/signals";
import { VPC_DEFS } from "./vpc-sim/defs";
import { VPC_MACHINE_ID, VPC_MACHINE_IDS } from "./vpc-sim/signals";

export function defsFor(machineId: string | null | undefined): PlantDefs | null {
  if (!machineId) return null;
  if (KILN_FLEET_IDS.has(machineId)) return KILN_DEFS;
  if (machineId === VPC_MACHINE_ID || VPC_MACHINE_IDS.has(machineId)) return VPC_DEFS;
  return PYRO_DEFS[machineId] ?? null;
}

/** True for machines driven by a live engine: the kiln-seal fleet, the pyro line, and VPC 066. */
export function isLiveMachineId(machineId: string | null | undefined): boolean {
  return Boolean(machineId && (KILN_FLEET_IDS.has(machineId) || PYRO_MACHINE_IDS.has(machineId) || VPC_MACHINE_IDS.has(machineId)));
}

export function isPyroMachineId(machineId: string | null | undefined): boolean {
  return Boolean(machineId && PYRO_MACHINE_IDS.has(machineId));
}

export function isVpcMachineId(machineId: string | null | undefined): boolean {
  return Boolean(machineId && VPC_MACHINE_IDS.has(machineId));
}
