"use client";

import { useApi } from "@/lib/api-cache";
import type { AssetMachine } from "./assets-data";
import type { MachineRackInfo } from "./rack-data";

export interface MachineRackUnitsState {
  racks: MachineRackInfo[];
  isLoading: boolean;
  isError: boolean;
  error: string | null;
}

/**
 * Fetches the machine's acquisition enclosure model (rack units + slots)
 * from PostgreSQL. Live telemetry is overlaid on the client.
 */
export function useMachineRackUnits(machine: AssetMachine): MachineRackUnitsState {
  const { data, isLoading, error } = useApi<MachineRackInfo[]>(`/api/rack-units?machineId=${encodeURIComponent(machine.id)}`);
  return { racks: Array.isArray(data) ? data : [], isLoading, isError: error !== null, error };
}
