"use client";

import React, { createContext, use, useContext, useMemo } from "react";
import { KILN_FLEET_IDS, useKilnFleetSimulation, type KilnSimulation } from "@/components/assets/kiln-seals-simulation";
import type { SimFrame } from "@/lib/kiln-sim/engine";
import { isLiveMachineId, isPyroMachineId } from "@/lib/live-defs";
import { useIndustrialData } from "@/providers/industrial-data-context";

/**
 * The live kiln fleet, one simulation per kiln machine. Its value changes
 * every tick, so every reader re-renders once a second. Read it only where
 * live values are actually drawn; use `useKilnLiveStatus()` where only machine
 * health / status is needed.
 */
const KilnFleetContext = createContext<Record<string, KilnSimulation> | null>(null);

/** The active plant's primary machine simulation: the plant-wide features (ops, Copilot, AI engine) follow it. */
export const KilnSimulationContext = createContext<KilnSimulation | null>(null);

/** Primary machine of the active plant (KLN-01 on the kiln-seal plant, PYR-KLN-01 on the pyro line). */
const PrimaryMachineContext = createContext<string>("KLN-01");

type LiveCell = Pick<SimFrame, "overall" | "condition">;
/** Machine-level health only. Changes when a kiln's health or condition changes, not every tick. */
export type KilnLiveStatus = { frame: LiveCell; byMachine: Record<string, LiveCell> };
const KilnStatusContext = createContext<KilnLiveStatus | null>(null);

/** Primary machine of the kiln-seal plant. Plant-aware code uses `usePrimaryMachineId()`. */
export const PRIMARY_KILN_ID = "KLN-01";
/** Primary machine of the pyro line. */
export const PRIMARY_PYRO_ID = "PYR-KLN-01";
export const PYRO_PLANT_ID = "plant-pyro";

/** Primary live machine for a plant: the plant-wide demo features follow it. */
export function primaryMachineFor(plantId: string | null | undefined): string {
  return plantId === PYRO_PLANT_ID ? PRIMARY_PYRO_ID : PRIMARY_KILN_ID;
}

/** True when a live machine belongs to the same plant as the primary machine. */
function samePlant(machineId: string, primaryId: string): boolean {
  return isPyroMachineId(machineId) === isPyroMachineId(primaryId);
}

/**
 * The live kiln fleet for the whole workspace. Mounted at the app root so the
 * running scenarios survive tab changes and every page reads the same frames:
 * Overview, Sensor Mapping, Insights, Rack and the fleet home.
 */
export function KilnSimulationProvider({ children }: { children: React.ReactNode }) {
  const fleet = useKilnFleetSimulation(true);
  const { selectedPlantId } = useIndustrialData();
  const primaryId = primaryMachineFor(selectedPlantId);
  const primary = fleet[primaryId] ?? null;
  const key = Object.entries(fleet)
    .map(([id, s]) => `${id}:${s.frame.overall}:${s.frame.condition}`)
    .join("|");
  const status = useMemo<KilnLiveStatus>(() => {
    const byMachine: Record<string, LiveCell> = {};
    for (const [id, s] of Object.entries(fleet)) byMachine[id] = { overall: s.frame.overall, condition: s.frame.condition };
    return { frame: byMachine[primaryId], byMachine };
    // Recomputed only when some machine's health or condition changes, or the plant changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, primaryId]);
  return (
    <PrimaryMachineContext.Provider value={primaryId}>
      <KilnFleetContext.Provider value={fleet}>
        <KilnSimulationContext.Provider value={primary}>
          <KilnStatusContext.Provider value={status}>{children}</KilnStatusContext.Provider>
        </KilnSimulationContext.Provider>
      </KilnFleetContext.Provider>
    </PrimaryMachineContext.Provider>
  );
}

/** The active plant's primary live simulation, or `null` outside the provider. Re-renders every tick. */
export function useKilnSimulation(): KilnSimulation | null {
  return useContext(KilnSimulationContext);
}

/** Primary live machine id of the active plant. */
export function usePrimaryMachineId(): string {
  return useContext(PrimaryMachineContext);
}

/** Every live machine of the active plant by id (empty outside the provider). Re-renders every tick. */
export function useKilnFleet(): Record<string, KilnSimulation> {
  const all = useContext(KilnFleetContext);
  const primaryId = useContext(PrimaryMachineContext);
  return useMemo(() => (all ? Object.fromEntries(Object.entries(all).filter(([id]) => samePlant(id, primaryId))) : {}), [all, primaryId]);
}

/**
 * The live plant for a live machine (kiln-seal fleet or pyro line), else
 * `null`. Other machines do not subscribe, so their pages skip the 1 s
 * re-render entirely.
 */
export function useKilnSimulationFor(machineId: string | null | undefined): KilnSimulation | null {
  return isLiveMachine(machineId) ? (use(KilnFleetContext)?.[machineId!] ?? null) : null;
}

/** Live kiln health / condition, or `null` outside the provider. Re-renders only on change. */
export function useKilnLiveStatus(): KilnLiveStatus | null {
  return useContext(KilnStatusContext);
}

/** True for the kiln-seal fleet (`KILN_FLEET`) only. Use `isLiveMachine` for "has a live engine". */
export function isKilnMachine(machineId: string | null | undefined): boolean {
  return Boolean(machineId && KILN_FLEET_IDS.has(machineId));
}

/** True for every machine driven by a live engine: the kiln-seal fleet and the pyro line. */
export function isLiveMachine(machineId: string | null | undefined): boolean {
  return isLiveMachineId(machineId);
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
  const cell = simulation && isLiveMachine(machineId) ? simulation.byMachine[machineId] : undefined;
  if (!cell) return { ...fallback, isLive: false };
  const { overall, condition } = cell;
  const status = condition === "Healthy" ? "Operational" : condition === "Critical" ? "Critical" : "Advisory";
  return { health: overall, status, isLive: true };
}

/** Convenience hook form of `liveMachineStatus`. */
export function useLiveMachineStatus(machineId: string, fallback: { health: number; status: string }) {
  return liveMachineStatus(useKilnLiveStatus(), machineId, fallback);
}
