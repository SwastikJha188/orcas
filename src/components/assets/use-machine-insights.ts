"use client";

import { useMemo } from "react";
import { useApi } from "@/lib/api-cache";
import { useKilnSimulationFor } from "@/providers/kiln-simulation-context";
import { buildLiveInsights, type DbSensorMeta } from "@/lib/kiln-sim/live-insights";
import { useStoredCatalog } from "./use-machine-catalog";
import type { AssetMachine } from "./assets-data";
import type { InsightsResponse } from "@/server/services/insights-service";

export interface MachineInsightsState {
  data: InsightsResponse | null;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
}

/**
 * Prognosis & analysis payload for a machine.
 *
 * Live machines (kiln-seal fleet, pyro line) run on a demonstration engine,
 * so their payload is built from the running frame and its `defs` (refreshed
 * every 5 simulated minutes) over the sensors in the DB catalog. Other
 * machines use the server-computed snapshot. Same contract either way.
 */
export function useMachineInsights(machine: AssetMachine): MachineInsightsState {
  const frame = useKilnSimulationFor(machine.id)?.frame ?? null;
  // A live machine's payload comes from the frame; skip the server snapshot.
  const stored = useStoredInsights(frame ? null : machine);
  // The DB catalog decides which sensors exist and their names, units, limits
  // and locations; the engine only supplies live values and history.
  const catalog = useStoredCatalog(machine);
  const db = useMemo<DbSensorMeta[]>(() => {
    const systemName = new Map(catalog.systems.map((s) => [s.systemId, s.name]));
    return catalog.sensors.map((s) => ({
      tag: s.tag,
      name: s.name,
      unit: s.unit,
      numericValue: s.numericValue,
      status: s.status,
      warningVal: s.warningVal,
      alarmVal: s.alarmVal,
      systemId: s.systemId,
      system: systemName.get(s.systemId) ?? s.systemId,
      subassemblyId: s.subassemblyId,
      subAssembly: s.subAssembly,
      component: s.component,
    }));
  }, [catalog.sensors, catalog.systems]);
  // Rebuild on scenario change and every 5 simulated minutes, not every tick.
  const bucket = frame ? `${frame.scenarioId}:${Math.floor(frame.t / 5)}` : null;
  const live = useMemo(
    () => (frame && catalog.isLive ? buildLiveInsights(frame, machine.id, db) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bucket, machine.id, db, catalog.isLive],
  );
  if (live) return { data: live, isLoading: false, isError: false, error: null };
  if (frame) return { data: null, isLoading: catalog.isLoading, isError: false, error: null };
  return stored;
}

function useStoredInsights(machine: AssetMachine | null): MachineInsightsState {
  const { data, isLoading, error } = useApi<InsightsResponse | null>(
    machine ? `/api/insights?machineId=${encodeURIComponent(machine.id)}` : null,
  );
  return { data: data ?? null, isLoading, isError: error !== null, error };
}
