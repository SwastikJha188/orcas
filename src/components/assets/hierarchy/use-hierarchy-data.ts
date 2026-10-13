"use client";

import { useMemo } from "react";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { liveMachineStatus, useKilnLiveStatus } from "@/providers/kiln-simulation-context";
import type { MachineLookup } from "./hierarchy-model";

/**
 * Hierarchy roots plus one machine condition lookup. KLN-01 reads the running
 * plant (`liveMachineStatus`); every other machine its stored record.
 * Roots and machines come only from PostgreSQL (via the data context): they are
 * empty while loading or when the load failed — check `isLoading` / `loadError`.
 */
export function useHierarchyData() {
  const { hierarchy: roots, machines, isLoading, hasLoaded, loadError } = useIndustrialData();
  const liveKiln = useKilnLiveStatus();

  const lookup = useMemo<MachineLookup>(() => {
    const map: MachineLookup = new Map();
    for (const m of machines) {
      const live = liveMachineStatus(liveKiln, m.id, m);
      map.set(m.id, { machine: m, status: live.status, health: live.health, isLive: live.isLive });
    }
    return map;
  }, [machines, liveKiln]);

  // Still loading until the first attempt has finished.
  return { roots, machines, lookup, isLoading: isLoading || !hasLoaded, loadError };
}
