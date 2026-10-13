"use client";

import { useEffect, useState } from "react";
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
  const [racks, setRacks] = useState<MachineRackInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    fetch(`/api/rack-units?machineId=${encodeURIComponent(machine.id)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((j) => {
        if (cancelled) return;
        setRacks(Array.isArray(j?.data) ? (j.data as MachineRackInfo[]) : []);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setRacks([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [machine.id]);

  return { racks, isLoading, isError: error !== null, error };
}
