"use client";

import { useApi } from "@/lib/api-cache";
import type { AssetMachine } from "./assets-data";
import type { MachineProcessStage } from "./process-data";

export interface MachineProcessesState {
  stages: MachineProcessStage[];
  isLoading: boolean;
  isError: boolean;
  error: string | null;
}

/**
 * Fetches the machine's ordered process stages from PostgreSQL.
 * No static fallback — the UI renders only what the database returns.
 */
export function useMachineProcesses(machine: AssetMachine): MachineProcessesState {
  const { data, isLoading, error } = useApi<MachineProcessStage[]>(`/api/process?machineId=${encodeURIComponent(machine.id)}`);
  return { stages: Array.isArray(data) ? data : [], isLoading, isError: error !== null, error };
}
