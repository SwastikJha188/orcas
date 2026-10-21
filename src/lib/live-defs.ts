/**
 * Which plant definitions a live machine runs on. Use `frame.defs` when a
 * frame is at hand; this is for code that only has a machine id.
 */
import type { PlantDefs } from "@shared/lib/plant-defs";
import { KILN_DEFS } from "@shared/lib/kiln-sim/defs";
import { KILN_FLEET_IDS } from "@shared/lib/kiln-sim/fleet";
import { PYRO_DEFS } from "@shared/lib/pyro-sim/defs";
import { PYRO_MACHINE_IDS } from "@shared/lib/pyro-sim/signals";
import { COPY_SOURCE, isPyroCopy } from "@shared/lib/pyro-sim/fleet";
import { VPC_DEFS } from "@shared/lib/vpc-sim/defs";
import { VPC_MACHINE_ID, VPC_MACHINE_IDS } from "@shared/lib/vpc-sim/signals";

export function defsFor(machineId: string | null | undefined): PlantDefs | null {
  if (!machineId) return null;
  if (KILN_FLEET_IDS.has(machineId)) return KILN_DEFS;
  if (machineId === VPC_MACHINE_ID || VPC_MACHINE_IDS.has(machineId)) return VPC_DEFS;
  // A copy of the pyro line publishes its kiln: the kiln's definitions.
  if (isPyroCopy(machineId)) return PYRO_DEFS[COPY_SOURCE] ?? null;
  return PYRO_DEFS[machineId] ?? null;
}

/** True for machines driven by a live engine: the kiln-seal fleet, the pyro line, and VPC 066. */
export function isLiveMachineId(machineId: string | null | undefined): boolean {
  return Boolean(machineId && (KILN_FLEET_IDS.has(machineId) || PYRO_MACHINE_IDS.has(machineId) || isPyroCopy(machineId) || VPC_MACHINE_IDS.has(machineId)));
}

export function isPyroMachineId(machineId: string | null | undefined): boolean {
  return Boolean(machineId && (PYRO_MACHINE_IDS.has(machineId) || isPyroCopy(machineId)));
}

export function isVpcMachineId(machineId: string | null | undefined): boolean {
  return Boolean(machineId && VPC_MACHINE_IDS.has(machineId));
}
