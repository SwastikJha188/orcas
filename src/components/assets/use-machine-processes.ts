"use client";

import { useEffect, useState } from "react";
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
  const [stages, setStages] = useState<MachineProcessStage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    fetch(`/api/process?machineId=${encodeURIComponent(machine.id)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((j) => {
        if (cancelled) return;
        setStages(Array.isArray(j?.data) ? (j.data as MachineProcessStage[]) : []);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setStages([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [machine.id]);

  return { stages, isLoading, isError: error !== null, error };
}
