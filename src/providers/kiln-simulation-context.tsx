"use client";

import React, { createContext, use, useContext, useEffect, useMemo, useRef, useState } from "react";
import { KILN_FLEET_IDS, snapshotSimulation, useKilnFleetSimulation, type KilnSimulation } from "@/components/assets/kiln-seals-simulation";
import type { SimFrame } from "@/lib/kiln-sim/engine";
import { isLiveMachineId } from "@/lib/live-defs";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { useApi } from "@/lib/api-cache";
import type { FleetConditionRow } from "@/server/services/monitoring-service";
import type { SimulationDto } from "@/types/monitoring";

/**
 * The live fleet as pages show it: a snapshot that changes every
 * `DISPLAY_MS`, or at once when something an operator must see happens (an
 * alarm raised, cleared or acknowledged, a scenario or autopilot change). The
 * engines still step every second; readings just do not churn under the
 * reader's eyes. Use `useKilnSimulationFor` / `useKilnFleet`.
 */
const KilnFleetContext = createContext<Record<string, KilnSimulation> | null>(null);

/** The fleet at every 1 s tick, for the Simulation lab only (`useRealtimeKilnFleet`). */
const RealtimeFleetContext = createContext<Record<string, KilnSimulation> | null>(null);

/** How often pages get new readings when nothing meaningful happened (real ms). */
export const DISPLAY_MS = 30_000;

/**
 * What must reach the screen at once for one machine: its scenario, autopilot
 * and profile, which of its alarms are raised (a rule confirmed or cleared),
 * the last action an operator took on it (acknowledge, mitigate, repair), and
 * the faults started or stopped on it by hand (Simulation page).
 * Confirming rules flicker from one minute to the next and the autopilot crew
 * acts on its own; those, readings and health drift wait for the next snapshot.
 */
function machineSignature(s: KilnSimulation): string {
  const f = s.frame;
  const raised = f.rules.filter((r) => r.status === "ACTIVE").map((r) => r.id).join(",");
  const lastAction = f.events.find((e) => e.action && !e.action.auto)?.t ?? "";
  // Faults started or stopped by hand on the Simulation page (an operator action, not the event generator).
  const started = (s.line?.events ?? []).filter((j) => j.machine === s.machineId && !j.auto && f.t < j.end).map((j) => j.id).join(",");
  return `${f.scenarioId}|${f.autopilot}|${f.profile}|${raised}|${lastAction}|${started}`;
}

/**
 * The fleet snapshot pages show (see `KilnFleetContext`): every machine moves
 * to its latest frame every `DISPLAY_MS`; a machine whose signature changed
 * moves at once, alone, so an alarm on one machine does not redraw the
 * others' pages.
 */
function useDisplayFleet(fleet: Record<string, KilnSimulation>): Record<string, KilnSimulation> {
  const [shown, setShown] = useState(() => snapshotFleet(fleet));
  const last = useRef<{ at: number; sigs: Record<string, string> }>({ at: 0, sigs: {} });
  useEffect(() => {
    const now = Date.now();
    const sigs: Record<string, string> = {};
    for (const [id, sim] of Object.entries(fleet)) sigs[id] = machineSignature(sim);
    if (now - last.current.at >= DISPLAY_MS) {
      last.current = { at: now, sigs };
      setShown(snapshotFleet(fleet));
      return;
    }
    const changed = Object.keys(fleet).filter((id) => sigs[id] !== last.current.sigs[id]);
    if (changed.length === 0) return;
    for (const id of changed) last.current.sigs[id] = sigs[id];
    setShown((prev) => {
      const next = { ...prev };
      for (const id of changed) next[id] = snapshotSimulation(fleet[id]);
      return next;
    });
  }, [fleet]);
  return shown;
}

/** Every machine frozen as of now: the engines keep appending to their series, the snapshot must not. */
function snapshotFleet(fleet: Record<string, KilnSimulation>): Record<string, KilnSimulation> {
  return Object.fromEntries(Object.entries(fleet).map(([id, sim]) => [id, snapshotSimulation(sim)]));
}

/** The active plant's primary machine simulation: the plant-wide features (ops, Copilot, AI engine) follow it. */
export const KilnSimulationContext = createContext<KilnSimulation | null>(null);

/** Primary machine of the active plant (`plants.primary_machine_id`); "" while loading or when the plant has none. */
const PrimaryMachineContext = createContext<string>("");

/** Simulation engine per plant id: the engine of each plant's primary machine. */
const PlantEnginesContext = createContext<Record<string, SimulationDto["engine"]>>({});

/** Machines of the active plant (from the machine register). */
const PlantMachinesContext = createContext<ReadonlySet<string>>(new Set());

/** Simulation engine of the active plant's primary machine (`machine_simulations`); null for a plant without one. */
const PlantEngineContext = createContext<SimulationDto["engine"] | null>(null);

type LiveCell = { overall: number | null; condition: SimFrame["condition"] | "No data" };
/**
 * Machine-level health only, from the server evaluation (latest Machine Health
 * Index and its status). Changes when a machine's health or condition changes.
 */
export type KilnLiveStatus = { frame: LiveCell | undefined; byMachine: Record<string, LiveCell> };

/** How often machine condition is re-read from the server evaluation (real ms). */
const CONDITION_REFRESH_MS = 30_000;
const KilnStatusContext = createContext<KilnLiveStatus | null>(null);

/** True while the live engines are still being built (about a second after the app mounts). */
const LiveStartingContext = createContext(false);

/**
 * The live kiln fleet for the whole workspace. Mounted at the app root so the
 * running scenarios survive tab changes and every page reads the same frames:
 * Overview, Sensor Mapping, Insights, Rack and the fleet home.
 */
export function KilnSimulationProvider({ children }: { children: React.ReactNode }) {
  const realtime = useKilnFleetSimulation(true);
  const fleet = useDisplayFleet(realtime);
  const { selectedPlantId, plants, machines } = useIndustrialData();
  const plantMachineIds = useMemo(() => new Set(machines.filter((m) => m.plantId === selectedPlantId).map((m) => m.id)), [machines, selectedPlantId]);
  const primaryId = plants.find((p) => p.id === selectedPlantId)?.primaryMachineId ?? "";
  const { data: simulations } = useApi<SimulationDto[]>("/api/simulations");
  const plantEngine = simulations?.find((m) => m.machineId === primaryId)?.engine ?? null;
  const plantEngines = useMemo(() => {
    const out: Record<string, SimulationDto["engine"]> = {};
    for (const p of plants) {
      const engine = simulations?.find((m) => m.machineId === p.primaryMachineId)?.engine;
      if (engine) out[p.id] = engine;
    }
    return out;
  }, [plants, simulations]);
  const primary = fleet[primaryId] ?? null;
  // Machine condition is the server's evaluation of the stored readings, for every machine.
  const { data: condition } = useApi<FleetConditionRow[]>("/api/fleet/condition", { refreshMs: CONDITION_REFRESH_MS });
  const key = (condition ?? []).map((c) => `${c.machineId}:${c.health}:${c.status}`).join("|");
  const status = useMemo<KilnLiveStatus | null>(() => {
    if (!condition) return null;
    const byMachine: Record<string, LiveCell> = {};
    for (const c of condition) {
      byMachine[c.machineId] = {
        overall: c.health,
        condition: c.status === null ? "No data" : c.status === "Normal" ? "Healthy" : c.status,
      };
    }
    return { frame: byMachine[primaryId], byMachine };
    // Recomputed only when some machine's health or condition changes, or the plant changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, primaryId]);
  return (
    <PrimaryMachineContext.Provider value={primaryId}>
      <PlantEngineContext.Provider value={plantEngine}>
      <PlantEnginesContext.Provider value={plantEngines}>
      <PlantMachinesContext.Provider value={plantMachineIds}>
      <RealtimeFleetContext.Provider value={realtime}>
        <KilnFleetContext.Provider value={fleet}>
          <KilnSimulationContext.Provider value={primary}>
            <KilnStatusContext.Provider value={status}>
              <LiveStartingContext.Provider value={Object.keys(fleet).length === 0}>{children}</LiveStartingContext.Provider>
            </KilnStatusContext.Provider>
          </KilnSimulationContext.Provider>
        </KilnFleetContext.Provider>
      </RealtimeFleetContext.Provider>
      </PlantMachinesContext.Provider>
      </PlantEnginesContext.Provider>
      </PlantEngineContext.Provider>
    </PrimaryMachineContext.Provider>
  );
}

/** The active plant's primary live simulation, or `null` outside the provider. Re-renders with each display snapshot. */
export function useKilnSimulation(): KilnSimulation | null {
  return useContext(KilnSimulationContext);
}

/** Primary machine id of the active plant ("" while loading or when the plant has none). */
export function usePrimaryMachineId(): string {
  return useContext(PrimaryMachineContext);
}

/** Simulation engine of any plant (by plant id), or null when the plant has no simulated primary machine. */
export function usePlantEngineOf(plantId: string | null | undefined): SimulationDto["engine"] | null {
  const map = useContext(PlantEnginesContext);
  return plantId ? (map[plantId] ?? null) : null;
}

/** Which simulation engine the active plant runs on ("kiln", "pyro", "vpc"), or null. */
export function usePlantEngine(): SimulationDto["engine"] | null {
  return useContext(PlantEngineContext);
}

/**
 * Every live machine of the active plant at every 1 s tick. Only for pages
 * whose job is to watch the engine respond (the Simulation lab); every other
 * page reads the calmer `useKilnFleet`.
 */
export function useRealtimeKilnFleet(): Record<string, KilnSimulation> {
  const all = useContext(RealtimeFleetContext);
  const plantIds = useContext(PlantMachinesContext);
  return useMemo(() => (all ? Object.fromEntries(Object.entries(all).filter(([id]) => plantIds.has(id))) : {}), [all, plantIds]);
}

/** Every live machine of the active plant by id (empty outside the provider). New snapshot every `DISPLAY_MS` or on a meaningful change. */
export function useKilnFleet(): Record<string, KilnSimulation> {
  const all = useContext(KilnFleetContext);
  const plantIds = useContext(PlantMachinesContext);
  return useMemo(() => (all ? Object.fromEntries(Object.entries(all).filter(([id]) => plantIds.has(id))) : {}), [all, plantIds]);
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

/**
 * True during the second or so after the app mounts while the live plant is
 * still being built (off the main thread). Live hooks return `null` / `{}`
 * meanwhile; a page that would otherwise say "no live data" can say so.
 */
export function useLivePlantStarting(): boolean {
  return useContext(LiveStartingContext);
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
 * Machine-level status: one health figure everywhere — header, directory card,
 * hierarchy tree, fleet home and Diagnosis — the server evaluation's latest
 * Machine Health Index. A manual service state (Standby / Maintenance) wins.
 * `fallback` is the machine record as loaded (also server-evaluated), used
 * until the first poll returns.
 */
export function liveMachineStatus(
  simulation: KilnLiveStatus | null,
  machineId: string,
  fallback: { health: number | null; status: string },
): { health: number | null; status: string; isLive: boolean } {
  const isLive = isLiveMachine(machineId);
  const cell = simulation?.byMachine[machineId];
  if (!cell || fallback.status === "Standby" || fallback.status === "Maintenance") return { ...fallback, isLive };
  const status = cell.condition === "No data" ? "No data" : cell.condition === "Healthy" ? "Operational" : cell.condition;
  return { health: cell.overall, status, isLive };
}

/** Convenience hook form of `liveMachineStatus`. */
export function useLiveMachineStatus(machineId: string, fallback: { health: number | null; status: string }) {
  return liveMachineStatus(useKilnLiveStatus(), machineId, fallback);
}
