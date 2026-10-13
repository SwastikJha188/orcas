"use client";

import React, { createContext, use, useContext, useMemo } from "react";
import { KILN_FLEET_IDS, useKilnFleetSimulation, type KilnSimulation } from "@/components/assets/kiln-seals-simulation";
import type { SimFrame } from "@/lib/kiln-sim/engine";

/**
 * The live kiln fleet, one simulation per kiln machine. Its value changes
 * every tick, so every reader re-renders once a second. Read it only where
 * live values are actually drawn; use `useKilnLiveStatus()` where only machine
 * health / status is needed.
 */
const KilnFleetContext = createContext<Record<string, KilnSimulation> | null>(null);

/** KLN-01's simulation: the plant-wide demo features (ops, Copilot, AI engine) follow this kiln. */
export const KilnSimulationContext = createContext<KilnSimulation | null>(null);

type LiveCell = Pick<SimFrame, "overall" | "condition">;
/** Machine-level health only. Changes when a kiln's health or condition changes, not every tick. */
export type KilnLiveStatus = { frame: LiveCell; byMachine: Record<string, LiveCell> };
const KilnStatusContext = createContext<KilnLiveStatus | null>(null);

/** Machine whose simulation `useKilnSimulation()` returns. */
export const PRIMARY_KILN_ID = "KLN-01";

/**
 * The live kiln fleet for the whole workspace. Mounted at the app root so the
 * running scenarios survive tab changes and every page reads the same frames:
 * Overview, Sensor Mapping, Insights, Rack and the fleet home.
 */
export function KilnSimulationProvider({ children }: { children: React.ReactNode }) {
  const fleet = useKilnFleetSimulation(true);
  const primary = fleet[PRIMARY_KILN_ID] ?? null;
  const key = Object.entries(fleet)
    .map(([id, s]) => `${id}:${s.frame.overall}:${s.frame.condition}`)
    .join("|");
  const status = useMemo<KilnLiveStatus>(() => {
    const byMachine: Record<string, LiveCell> = {};
    for (const [id, s] of Object.entries(fleet)) byMachine[id] = { overall: s.frame.overall, condition: s.frame.condition };
    return { frame: byMachine[PRIMARY_KILN_ID], byMachine };
    // Recomputed only when some kiln's health or condition changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return (
    <KilnFleetContext.Provider value={fleet}>
      <KilnSimulationContext.Provider value={primary}>
        <KilnStatusContext.Provider value={status}>{children}</KilnStatusContext.Provider>
      </KilnSimulationContext.Provider>
    </KilnFleetContext.Provider>
  );
}

/** KLN-01's live simulation, or `null` outside the provider. Re-renders every tick. */
export function useKilnSimulation(): KilnSimulation | null {
  return useContext(KilnSimulationContext);
}

/** Every live kiln by machine id (empty outside the provider). Re-renders every tick. */
export function useKilnFleet(): Record<string, KilnSimulation> {
  return useContext(KilnFleetContext) ?? {};
}

/**
 * The live plant for a kiln machine, else `null`. Other machines do not
 * subscribe, so their pages skip the 1 s re-render entirely.
 */
export function useKilnSimulationFor(machineId: string | null | undefined): KilnSimulation | null {
  return isKilnMachine(machineId) ? (use(KilnFleetContext)?.[machineId!] ?? null) : null;
}

/** Live kiln health / condition, or `null` outside the provider. Re-renders only on change. */
export function useKilnLiveStatus(): KilnLiveStatus | null {
  return useContext(KilnStatusContext);
}

/** True for machines driven by a live kiln engine (the `KILN_FLEET`). */
export function isKilnMachine(machineId: string | null | undefined): boolean {
  return Boolean(machineId && KILN_FLEET_IDS.has(machineId));
}

/**
 * Machine-level status for a live machine: one health figure everywhere —
 * header, directory card, hierarchy tree, fleet home and Diagnosis — all read
 * from the running plant.
 */
export function liveMachineStatus(
  simulation: KilnLiveStatus | null,
  machineId: string,
  fallback: { health: number; status: string },
): { health: number; status: string; isLive: boolean } {
  const cell = simulation && isKilnMachine(machineId) ? simulation.byMachine[machineId] : undefined;
  if (!cell) return { ...fallback, isLive: false };
  const { overall, condition } = cell;
  const status = condition === "Healthy" ? "Operational" : condition === "Critical" ? "Critical" : "Advisory";
  return { health: overall, status, isLive: true };
}

/** Convenience hook form of `liveMachineStatus`. */
export function useLiveMachineStatus(machineId: string, fallback: { health: number; status: string }) {
  return liveMachineStatus(useKilnLiveStatus(), machineId, fallback);
}
