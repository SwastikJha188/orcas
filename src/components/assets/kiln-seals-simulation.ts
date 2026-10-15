"use client";

/**
 * React binding for the kiln live demonstration engine (`@/lib/kiln-sim`).
 *
 * The engine simulates all 43 D4/D5 signals plus calculated values, the
 * reference model, sensor validation, the 21-rule library and the 27
 * validation scenarios. This hook owns one engine per kiln of `KILN_FLEET`,
 * advances them together one simulated minute per tick (several when
 * fast-forwarding) and exposes, per kiln:
 *
 *  - `frame`: the full live frame every page reads from;
 *  - the older seal-centred fields (`sensorData`, `healthScores`,
 *    `evaluatedRules`, `timeSeries`) derived from the same frame, so pages
 *    written against the first seals demo keep working unchanged.
 *
 * Mount it once (see `KilnSimulationProvider`) and read a kiln through
 * `useKilnSimulationFor(machineId)`; a second fleet would run second plants.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  performAction as enginePerformAction,
  setAutopilot as engineSetAutopilot,
  setProfile as engineSetProfile,
  setScenario as engineSetScenario,
  setWallClock,
  formatClock,
  stepSim,
  type OperatorAction,
  type SimFrame,
  type StoryPhase,
  type StoryProfile,
} from "@/lib/kiln-sim/engine";
import { KILN_SCENARIOS, scenarioById, type KilnScenario } from "@/lib/kiln-sim/scenarios";
import { KILN_FLEET } from "@/lib/kiln-sim/fleet";
import {
  LIVE_SIM_SETTINGS,
  clearEvent as lineClearEvent,
  clearEvents as lineClearEvents,
  injectEvent as lineInjectEvent,
  injectSignalFault as lineInjectSignalFault,
  performAction as linePerformAction,
  raiseEvent as lineRaiseEvent,
  setAutopilot as lineSetAutopilot,
  setLineSettings as lineSetSettings,
  setProfile as lineSetProfile,
  setScenario as lineSetScenario,
  stepLine,
  type Injection,
  type LineSimSettings,
  type LineState,
  type SignalFaultSpec,
} from "@/lib/pyro-sim/engine";
import { PYRO_FLEET } from "@/lib/pyro-sim/fleet";
import { recordFrames } from "@/lib/condition-report";
import { flushHealth, recordHealth } from "@/lib/health-recorder";
import { finishFleet, prerollFleet, type FleetEngines, type FleetSnapshot } from "@/lib/fleet-boot";
import type { FleetBootRequest } from "@/lib/fleet-boot.worker";
import { PYRO_SCENARIOS, pyroScenario } from "@/lib/pyro-sim/scenarios";
import { PYRO_MACHINE_IDS } from "@/lib/pyro-sim/signals";

export { KILN_FLEET, KILN_FLEET_IDS } from "@/lib/kiln-sim/fleet";
import type { EvaluatedRule, KilnSealsHealthScores, KilnSealsSensorData, SealTimeSeriesPoint } from "./kiln-seals-types";

/** Simulated minutes advanced per real second. */
export const SIM_SPEEDS = [
  { id: 1, label: "1×" },
  { id: 5, label: "5×" },
  { id: 20, label: "20×" },
] as const;

const TICK_MS = 1000;
const SERIES_LEN = 60;
/** Most simulated minutes replayed when a hidden tab becomes visible again. */
const MAX_CATCH_UP = 120;

function num(frame: SimFrame, tag: string): number {
  return frame.signals[tag]?.value ?? 0;
}
function st(frame: SimFrame, tag: string): string {
  return frame.signals[tag]?.state ?? "";
}

function toSensorData(frame: SimFrame, rotationAngle: number): KilnSealsSensorData {
  const falseAir = num(frame, "CAL-KLN-06");
  return {
    gasO2: +num(frame, "GAS-KLN-01").toFixed(2),
    gasO2Model: +(frame.signals["GAS-KLN-01"]?.model ?? 0).toFixed(2),
    gasO2Residual: +(frame.signals["GAS-KLN-01"]?.residual ?? 0).toFixed(2),
    gasCO: Math.round(num(frame, "GAS-KLN-02")),
    inletGasTemp: Math.round(num(frame, "TMP-KLN-13")),
    inletGasTempModel: Math.round(frame.signals["TMP-KLN-13"]?.model ?? 0),
    inletGasTempResidual: Math.round(frame.signals["TMP-KLN-13"]?.residual ?? 0),
    inletDraft: +num(frame, "PRS-KLN-01").toFixed(2),
    gasAnalyserStatus: (st(frame, "STS-KLN-06") || "OK") as KilnSealsSensorData["gasAnalyserStatus"],
    hoodPressure: +num(frame, "PRS-KLN-03").toFixed(2),
    hoodPressureModel: +(frame.signals["PRS-KLN-03"]?.model ?? -0.3).toFixed(2),
    outletFanStatus: (st(frame, "STS-KLN-10") || "RUNNING") as KilnSealsSensorData["outletFanStatus"],
    shellMaxTemp: Math.round(num(frame, "CAL-KLN-03")),
    scannerCoverage: +num(frame, "STS-KLN-08").toFixed(1),
    lvdtPosition: +num(frame, "POS-KLN-01").toFixed(1),
    travelLimitSwitch: (st(frame, "POS-KLN-02") || "CLEAR") as KilnSealsSensorData["travelLimitSwitch"],
    falseAirIndex: +falseAir.toFixed(2),
    sealOverlapMargin: +num(frame, "CAL-KLN-07").toFixed(1),
    kilnFeed: Math.round(num(frame, "FLO-KLN-01")),
    kilnFuel: +num(frame, "FLO-KLN-02").toFixed(2),
    kilnSpeed: +num(frame, "SPD-KLN-01").toFixed(2),
    ambientTemp: +frame.drivers.ambientEst.toFixed(1),
    inletSealWear: Math.round(Math.max(4, Math.min(100, 5 + Math.max(0, falseAir) * 80))),
    outletSealWear: st(frame, "STS-KLN-10") === "STOPPED" ? 75 : 12,
    rotationAngle,
    timestamp: frame.day > 0 ? `D+${frame.day} ${frame.clock}` : frame.clock,
  };
}

function toHealthScores(frame: SimFrame): KilnSealsHealthScores {
  const lead = frame.rules
    .filter((r) => r.status === "ACTIVE")
    .sort((a, b) => (a.severity === b.severity ? b.confidence - a.confidence : a.severity === "Critical" ? -1 : 1))[0];
  const total = Object.keys(frame.signals).length;
  return {
    overallHealth: frame.overall,
    inletSealHealth: frame.subs["inlet-seal"]?.health ?? frame.overall,
    outletSealHealth: frame.subs["outlet-seal"]?.health ?? frame.overall,
    axialOverlapHealth: frame.subs.thrust?.health ?? frame.overall,
    dataQualityScore: Math.round((frame.pipeline.valid / Math.max(1, total)) * 100),
    condition: frame.condition,
    primaryCause: lead ? `${lead.id} ${lead.name}: ${lead.cause}` : undefined,
    recommendedAction: lead?.action,
  };
}

function toEvaluatedRules(frame: SimFrame): EvaluatedRule[] {
  return frame.rules.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    severity: r.severity,
    status: r.status,
    logicDescription: r.logic,
    triggerCondition: r.logic,
    activeEvidence: r.evidence,
    persistenceCount: r.persistence,
    persistenceThreshold: r.threshold,
    hysteresisCount: r.clean,
    leadTimeToLimit: r.timeToLimit,
    rootCause: r.cause,
    prescriptiveAction: r.action,
  }));
}

function toTimeSeries(frame: SimFrame): SealTimeSeriesPoint[] {
  // The seal-centred series only exists for the kiln-seal fleet.
  if (frame.defs.plant !== "kiln") return [];
  const n = Math.min(SERIES_LEN, frame.times.length);
  const start = frame.times.length - n;
  const h = frame.history;
  const mh = frame.modelHistory;
  const at = (tag: string, i: number) => h[tag][start + i];
  const out: SealTimeSeriesPoint[] = [];
  for (let i = 0; i < n; i++) {
    const t = frame.times[start + i];
    out.push({
      time: formatClock(t).clock,
      gasO2: +at("GAS-KLN-01", i).toFixed(2),
      gasO2Model: +mh["GAS-KLN-01"][start + i].toFixed(2),
      inletGasTemp: Math.round(at("TMP-KLN-13", i)),
      inletGasTempModel: Math.round(mh["TMP-KLN-13"][start + i]),
      inletDraft: +at("PRS-KLN-01", i).toFixed(2),
      hoodPressure: +at("PRS-KLN-03", i).toFixed(2),
      hoodPressureModel: +mh["PRS-KLN-03"][start + i].toFixed(2),
      outletFanRunning: at("STS-KLN-10", i),
      sealOverlap: +at("CAL-KLN-07", i).toFixed(1),
      lvdtPosition: +at("POS-KLN-01", i).toFixed(1),
      falseAirIndex: +at("CAL-KLN-06", i).toFixed(2),
      shellMaxTemp: Math.round(at("CAL-KLN-03", i)),
      kilnFeed: Math.round(at("FLO-KLN-01", i)),
      kilnFuel: +at("FLO-KLN-02", i).toFixed(2),
      kilnSpeed: +at("SPD-KLN-01", i).toFixed(2),
      health: frame.healthHistory.overall[frame.healthHistory.overall.length - n + i] ?? frame.overall,
    });
  }
  return out;
}

/** Real milliseconds per simulated minute at a speed (simulated minutes per tick). */
const msPerMin = (speed: number) => TICK_MS / speed;

/**
 * Pin the display clock so simulated minute `tEnd` reads as the viewer's
 * local time now; minutes stepped on the way there are stamped in the
 * seconds before it.
 */
function anchorClock(tEnd: number, speed: number) {
  setWallClock(tEnd, Date.now(), msPerMin(speed));
}

const isPyro = (id: string) => PYRO_MACHINE_IDS.has(id);

// The engines are built once per page, and React may discard a first render
// (a lazy tab suspending, StrictMode), so they live here rather than in a ref.
// Building them (warm-up + pre-roll) takes most of a second; a worker does
// that so the page never freezes, and the last minute is stepped here so the
// frames are this page's own. Until they arrive the fleet is empty and pages
// show their non-live values, as they do outside the provider.
let fleetEngines: FleetEngines | null = null;
let fleetBoot: Promise<FleetEngines> | null = null;

function bootFleet(): Promise<FleetEngines> {
  return (fleetBoot ??= new Promise<FleetSnapshot>((resolve) => {
    // All engines run on one clock: the first frame lands on "now".
    const request: FleetBootRequest = { nowMs: Date.now(), msPerMin: msPerMin(1) };
    const onMainThread = () => resolve(prerollFleet(request.nowMs, request.msPerMin));
    let worker: Worker;
    try {
      worker = new Worker(new URL("../../lib/fleet-boot.worker.ts", import.meta.url));
    } catch {
      onMainThread();
      return;
    }
    worker.onmessage = (e: MessageEvent<FleetSnapshot>) => {
      worker.terminate();
      resolve(e.data);
    };
    worker.onerror = () => {
      worker.terminate();
      onMainThread();
    };
    worker.postMessage(request);
  }).then((snap) => (fleetEngines = finishFleet(snap, (tEnd) => anchorClock(tEnd, 1)))));
}

/** What the Simulation page shows of the line's demo layer: its knobs and the events layered on it. */
export interface LineSimView {
  t: number;
  settings: LineSimSettings;
  events: Injection[];
  nextEventAt: number;
}

function lineView(line: LineState | undefined): LineSimView | null {
  if (!line) return null;
  return { t: line.t, settings: line.sim, events: line.injections.map((j) => ({ ...j })), nextEventAt: line.nextEventAt };
}

/** Hand every machine's health to the wall-clock recorder (Health over time reads it, not the per-minute frame history). */
function recordFleetHealth(frames: Record<string, SimFrame>): void {
  recordHealth(Object.fromEntries(Object.entries(frames).map(([id, f]) => [id, f.overall])));
}

function currentFrames(e: FleetEngines | null): Record<string, SimFrame> {
  if (!e) return {};
  return {
    ...Object.fromEntries(Object.entries(e.sims).map(([id, sim]) => [id, sim.frame!])),
    ...Object.fromEntries(Object.entries(e.line.machines).map(([id, ms]) => [id, ms.frame!])),
  };
}

/**
 * Owns every kiln engine and advances them together, one simulated minute per
 * tick (several when fast-forwarding), with one state update per tick. Empty
 * until the engines are built (about a second after the first mount).
 */
export function useKilnFleetSimulation(enabled = true): Record<string, KilnSimulation> {
  const [frames, setFrames] = useState<Record<string, SimFrame>>(() => currentFrames(fleetEngines));
  const [ready, setReady] = useState(() => fleetEngines !== null);
  useEffect(() => {
    if (ready) return;
    let mounted = true;
    void bootFleet().then((e) => {
      if (!mounted) return;
      setFrames(currentFrames(e));
      setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, [ready]);
  const [lineSim, setLineSim] = useState<LineSimView | null>(() => lineView(fleetEngines?.line));
  useEffect(() => {
    if (ready) setLineSim(lineView(fleetEngines?.line));
  }, [ready]);
  const [isPaused, setIsPaused] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [rotationAngle, setRotationAngle] = useState(0);

  /** Re-read the frames after an out-of-step change to one engine. */
  const refresh = useCallback((id: string) => {
    const frame = isPyro(id) ? fleetEngines!.line.machines[id]?.frame : fleetEngines!.sims[id]?.frame;
    if (frame) setFrames((f) => ({ ...f, [id]: frame }));
    if (isPyro(id)) setLineSim(lineView(fleetEngines!.line));
  }, []);

  useEffect(() => {
    if (!enabled || isPaused || !ready) return;
    const stepAll = (minutes: number) => {
      const next: Record<string, SimFrame> = {};
      const sims = Object.values(fleetEngines!.sims);
      if (sims.length) anchorClock(sims[0].t + minutes, speedMultiplier);
      for (const [id, sim] of Object.entries(fleetEngines!.sims)) {
        for (let i = 1; i < minutes; i++) stepSim(sim, false);
        next[id] = stepSim(sim, true);
      }
      const line = fleetEngines!.line;
      for (let i = 1; i < minutes; i++) recordFrames(stepLine(line, false));
      Object.assign(next, recordFrames(stepLine(line, true)));
      setFrames(next);
      setLineSim(lineView(line));
      recordFleetHealth(next);
    };
    // A hidden tab neither steps the plant nor re-renders; on return the
    // missed minutes are simulated in one go (capped) and drawn once.
    let hiddenSince: number | null = null;
    const timer = setInterval(() => {
      if (document.hidden) return;
      stepAll(speedMultiplier);
      setRotationAngle((a) => (a + 8) % 360);
    }, TICK_MS);
    const onVisibility = () => {
      if (document.hidden) {
        hiddenSince = Date.now();
        return;
      }
      if (hiddenSince === null) return;
      const missed = Math.min(MAX_CATCH_UP, Math.floor((Date.now() - hiddenSince) / TICK_MS) * speedMultiplier);
      hiddenSince = null;
      if (missed >= 1) stepAll(missed);
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flushHealth);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flushHealth);
    };
  }, [enabled, isPaused, speedMultiplier, ready]);

  /** Manual scenario pick: switches that kiln's autopilot off. */
  const applyScenario = useCallback((id: string, scenarioId: string) => {
    if (isPyro(id)) {
      lineSetAutopilot(fleetEngines!.line, id, false);
      lineSetScenario(fleetEngines!.line, id, scenarioId);
      refresh(id);
      return;
    }
    const sim = fleetEngines!.sims[id];
    if (!sim) return;
    engineSetAutopilot(sim, false);
    engineSetScenario(sim, scenarioId);
    stepSim(sim, true);
    refresh(id);
  }, [refresh]);

  const setAutopilot = useCallback((id: string, on: boolean) => {
    if (isPyro(id)) {
      lineSetAutopilot(fleetEngines!.line, id, on);
      refresh(id);
      return;
    }
    const sim = fleetEngines!.sims[id];
    if (!sim) return;
    engineSetAutopilot(sim, on);
    refresh(id);
  }, [refresh]);

  const setProfile = useCallback((id: string, profile: StoryProfile) => {
    if (isPyro(id)) {
      lineSetProfile(fleetEngines!.line, id, profile);
      refresh(id);
      return;
    }
    const sim = fleetEngines!.sims[id];
    if (!sim) return;
    engineSetProfile(sim, profile);
    refresh(id);
  }, [refresh]);

  /** Operator action on a finding: acknowledge (log only), mitigate (temporary relief) or repair (recover). */
  const performAction = useCallback((id: string, ruleId: string, kind: OperatorAction) => {
    if (isPyro(id)) {
      linePerformAction(fleetEngines!.line, id, ruleId, kind);
      refresh(id);
      return;
    }
    const sim = fleetEngines!.sims[id];
    if (!sim) return;
    enginePerformAction(sim, ruleId, kind);
    refresh(id);
  }, [refresh]);

  /** Jump the whole fleet forward `minutes` simulated minutes at once (demo fast-forward). */
  const speedRef = useRef(speedMultiplier);
  speedRef.current = speedMultiplier;
  const advance = useCallback((minutes: number) => {
    const next: Record<string, SimFrame> = {};
    const sims = Object.values(fleetEngines!.sims);
    if (sims.length) anchorClock(sims[0].t + minutes, speedRef.current);
    for (const [id, sim] of Object.entries(fleetEngines!.sims)) {
      for (let i = 1; i < minutes; i++) stepSim(sim, false);
      next[id] = stepSim(sim, true);
    }
    const line = fleetEngines!.line;
    for (let i = 1; i < minutes; i++) recordFrames(stepLine(line, false));
    Object.assign(next, recordFrames(stepLine(line, true)));
    setFrames(next);
    setLineSim(lineView(line));
    recordFleetHealth(next);
  }, []);

  /* ---------------- pyro line demo layer (events, noise, health drift) ---------------- */

  /** Re-read every pyro frame and the line view after a change to the line. */
  const refreshLine = useCallback(() => {
    const line = fleetEngines!.line;
    setFrames((f) => ({ ...f, ...Object.fromEntries(Object.entries(line.machines).map(([id, ms]) => [id, ms.frame!])) }));
    setLineSim(lineView(line));
  }, []);

  const line = useMemo<LineControls>(
    () => ({
      setSettings: (patch) => {
        lineSetSettings(fleetEngines!.line, patch);
        refreshLine();
      },
      resetSettings: () => {
        lineSetSettings(fleetEngines!.line, { ...LIVE_SIM_SETTINGS, machines: Object.fromEntries(PYRO_FLEET.map((m) => [m.machineId, true])) });
        refreshLine();
      },
      inject: (machine, scenarioId) => {
        lineInjectEvent(fleetEngines!.line, machine, scenarioId);
        refreshLine();
      },
      raise: (kind, machine) => {
        lineRaiseEvent(fleetEngines!.line, kind, machine);
        refreshLine();
      },
      burst: (n) => {
        const l = fleetEngines!.line;
        for (let i = 0; i < n; i++) lineRaiseEvent(l, l.rand() < l.sim.sensorShare ? "sensor" : "fault");
        refreshLine();
      },
      signalFault: (spec) => {
        lineInjectSignalFault(fleetEngines!.line, spec);
        refreshLine();
      },
      clear: (id) => {
        lineClearEvent(fleetEngines!.line, id);
        refreshLine();
      },
      clearAll: (machine) => {
        lineClearEvents(fleetEngines!.line, machine);
        refreshLine();
      },
      setAllProfiles: (profile) => {
        const l = fleetEngines!.line;
        for (const id of Object.keys(l.machines)) {
          lineSetAutopilot(l, id, true);
          lineSetProfile(l, id, profile);
        }
        refreshLine();
      },
      restoreMix: () => {
        const l = fleetEngines!.line;
        for (const m of PYRO_FLEET) {
          lineSetAutopilot(l, m.machineId, true);
          lineSetProfile(l, m.machineId, m.profile);
        }
        refreshLine();
      },
      repairAll: () => {
        const l = fleetEngines!.line;
        lineClearEvents(l);
        for (const [id, ms] of Object.entries(l.machines)) {
          const sc = pyroScenario(id, ms.scenarioId);
          if (sc.expected.length) linePerformAction(l, id, sc.expected[0], "repair");
        }
        refreshLine();
      },
    }),
    [refreshLine],
  );

  const controls = useMemo(
    () => ({ applyScenario, setAutopilot, setProfile, performAction, advance, setIsPaused, setSpeedMultiplier, line }),
    [applyScenario, setAutopilot, setProfile, performAction, advance, line],
  );

  return useMemo(
    () =>
      Object.fromEntries(
        [...KILN_FLEET, ...PYRO_FLEET]
          .filter((k) => frames[k.machineId])
          .map((k) => [k.machineId, buildSimulation(k.machineId, frames[k.machineId], rotationAngle, isPaused, speedMultiplier, controls, lineSim)]),
      ),
    [frames, rotationAngle, isPaused, speedMultiplier, controls, lineSim],
  );
}

type FleetControls = {
  applyScenario: (id: string, scenarioId: string) => void;
  setAutopilot: (id: string, on: boolean) => void;
  setProfile: (id: string, profile: StoryProfile) => void;
  performAction: (id: string, ruleId: string, kind: OperatorAction) => void;
  advance: (minutes: number) => void;
  setIsPaused: (paused: boolean) => void;
  setSpeedMultiplier: (speed: number) => void;
  line: LineControls;
};

/** Plant-wide controls of the pyro line's demo layer (Simulation page). */
export interface LineControls {
  setSettings: (patch: Partial<LineSimSettings>) => void;
  /** Back to the live demo defaults, every machine allowed. */
  resetSettings: () => void;
  /** Run a library scenario on a machine as an event (time-compressed to its alerting point). */
  inject: (machine: string, scenarioId: string) => void;
  /** Raise one generated event now, on `machine` or the least busy one. */
  raise: (kind: "sensor" | "fault", machine?: string) => void;
  /** Raise `n` generated events at once. */
  burst: (n: number) => void;
  signalFault: (spec: SignalFaultSpec) => void;
  clear: (id: number) => void;
  clearAll: (machine?: string) => void;
  /** Autopilot on every machine, held at `profile`. */
  setAllProfiles: (profile: StoryProfile) => void;
  /** The demo mix of `PYRO_FLEET` (healthy / advisory / critical machines). */
  restoreMix: () => void;
  /** Clear every event and repair every machine's own fault. */
  repairAll: () => void;
}

/** One kiln's view of the fleet: its frame plus controls bound to it. Clock and speed are fleet-wide. */
function buildSimulation(
  machineId: string,
  frame: SimFrame,
  rotationAngle: number,
  isPaused: boolean,
  speedMultiplier: number,
  c: FleetControls,
  lineSim: LineSimView | null,
) {
  // Pyro scenarios share the kiln scenario shape (driver names differ, which no page reads).
  const pyro = isPyro(machineId);
  const scenario: KilnScenario = pyro ? (pyroScenario(machineId, frame.scenarioId) as unknown as KilnScenario) : scenarioById(frame.scenarioId);
  let _sensorData: KilnSealsSensorData | undefined;
  let _healthScores: KilnSealsHealthScores | undefined;
  let _evaluatedRules: EvaluatedRule[] | undefined;
  let _timeSeries: SealTimeSeriesPoint[] | undefined;
  return {
    machineId,
    frame,
    scenario,
    scenarios: pyro ? ((PYRO_SCENARIOS[machineId] ?? []) as unknown as KilnScenario[]) : KILN_SCENARIOS,
    activeScenarioId: frame.scenarioId,
    autopilot: frame.autopilot,
    profile: frame.profile,
    setAutopilot: (on: boolean) => c.setAutopilot(machineId, on),
    setProfile: (profile: StoryProfile) => c.setProfile(machineId, profile),
    performAction: (ruleId: string, kind: OperatorAction) => c.performAction(machineId, ruleId, kind),
    phase: frame.phase as StoryPhase,
    storyLabel: frame.storyLabel,
    applyScenario: (scenarioId: string) => c.applyScenario(machineId, scenarioId),
    resetToHealthy: () => c.applyScenario(machineId, "healthy"),
    advance: c.advance,
    isPaused,
    setIsPaused: c.setIsPaused,
    speedMultiplier,
    setSpeedMultiplier: c.setSpeedMultiplier,
    rotationAngle,
    /** The pyro line's demo layer (events, noise, health drift); null on the kiln-seal fleet. */
    line: pyro && lineSim ? { ...lineSim, ...c.line } : null,
    get sensorData() {
      return (_sensorData ??= toSensorData(frame, rotationAngle));
    },
    get healthScores() {
      return (_healthScores ??= toHealthScores(frame));
    },
    get evaluatedRules() {
      return (_evaluatedRules ??= toEvaluatedRules(frame));
    },
    get timeSeries() {
      return (_timeSeries ??= toTimeSeries(frame));
    },
  };
}

export type KilnSimulation = ReturnType<typeof buildSimulation>;
