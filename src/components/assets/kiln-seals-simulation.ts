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
  createSim,
  performAction as enginePerformAction,
  setAutopilot as engineSetAutopilot,
  setProfile as engineSetProfile,
  setScenario as engineSetScenario,
  setWallClock,
  formatClock,
  stepSim,
  type OperatorAction,
  type SimFrame,
  type SimState,
  type StoryPhase,
  type StoryProfile,
} from "@/lib/kiln-sim/engine";
import { KILN_SCENARIOS, scenarioById, type KilnScenario } from "@/lib/kiln-sim/scenarios";
import { KILN_FLEET } from "@/lib/kiln-sim/fleet";
import {
  createLine,
  performAction as linePerformAction,
  setAutopilot as lineSetAutopilot,
  setProfile as lineSetProfile,
  setScenario as lineSetScenario,
  stepLine,
  type LineState,
} from "@/lib/pyro-sim/engine";
import { PYRO_FLEET, PYRO_LINE_SEED } from "@/lib/pyro-sim/fleet";
import { recordFrames } from "@/lib/condition-report";
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

/** Simulated minutes run before the first frame, so each kiln opens already in its condition. */
const PRE_ROLL_MIN = 90;

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

/** The pyro line: one engine for all six machines, on the same clock and pre-roll as the kilns. */
function createPyroLine(): LineState {
  const line = createLine(PYRO_LINE_SEED);
  for (const m of PYRO_FLEET) {
    lineSetAutopilot(line, m.machineId, true);
    lineSetProfile(line, m.machineId, m.profile);
  }
  anchorClock(line.t + PRE_ROLL_MIN, 1);
  for (let i = 1; i < PRE_ROLL_MIN; i++) recordFrames(stepLine(line, false));
  recordFrames(stepLine(line, true));
  for (const ms of Object.values(line.machines)) {
    ms.events = ms.events.filter((e) => e.kind !== "scenario" && !(e.kind === "action" && e.title.startsWith("Autopilot")));
    if (ms.frame) ms.frame = { ...ms.frame, events: ms.events.slice() };
  }
  return line;
}

const isPyro = (id: string) => PYRO_MACHINE_IDS.has(id);

function createFleet(): Record<string, SimState> {
  const out: Record<string, SimState> = {};
  for (const k of KILN_FLEET) {
    const sim = createSim("healthy", k.seed);
    engineSetAutopilot(sim, true);
    engineSetProfile(sim, k.profile);
    // All kilns run on one clock: the first frame lands on "now".
    anchorClock(sim.t + PRE_ROLL_MIN, 1);
    for (let i = 1; i < PRE_ROLL_MIN; i++) stepSim(sim, false);
    stepSim(sim, true);
    sim.events = sim.events.filter((e) => e.kind !== "scenario" && !(e.kind === "action" && e.title.startsWith("Autopilot")));
    sim.frame = { ...sim.frame!, events: sim.events.slice() };
    out[k.machineId] = sim;
  }
  return out;
}

/**
 * Owns every kiln engine and advances them together, one simulated minute per
 * tick (several when fast-forwarding), with one state update per tick.
 */
export function useKilnFleetSimulation(enabled = true): Record<string, KilnSimulation> {
  const simsRef = useRef<Record<string, SimState> | null>(null);
  if (simsRef.current === null) simsRef.current = createFleet();
  const lineRef = useRef<LineState | null>(null);
  if (lineRef.current === null) lineRef.current = createPyroLine();

  const [frames, setFrames] = useState<Record<string, SimFrame>>(() => ({
    ...Object.fromEntries(Object.entries(simsRef.current!).map(([id, sim]) => [id, sim.frame!])),
    ...Object.fromEntries(Object.entries(lineRef.current!.machines).map(([id, ms]) => [id, ms.frame!])),
  }));
  const [isPaused, setIsPaused] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [rotationAngle, setRotationAngle] = useState(0);

  /** Re-read the frames after an out-of-step change to one engine. */
  const refresh = useCallback((id: string) => {
    const frame = isPyro(id) ? lineRef.current!.machines[id]?.frame : simsRef.current![id]?.frame;
    if (frame) setFrames((f) => ({ ...f, [id]: frame }));
  }, []);

  useEffect(() => {
    if (!enabled || isPaused) return;
    const stepAll = (minutes: number) => {
      const next: Record<string, SimFrame> = {};
      const sims = Object.values(simsRef.current!);
      if (sims.length) anchorClock(sims[0].t + minutes, speedMultiplier);
      for (const [id, sim] of Object.entries(simsRef.current!)) {
        for (let i = 1; i < minutes; i++) stepSim(sim, false);
        next[id] = stepSim(sim, true);
      }
      const line = lineRef.current!;
      for (let i = 1; i < minutes; i++) recordFrames(stepLine(line, false));
      Object.assign(next, recordFrames(stepLine(line, true)));
      setFrames(next);
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
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, isPaused, speedMultiplier]);

  /** Manual scenario pick: switches that kiln's autopilot off. */
  const applyScenario = useCallback((id: string, scenarioId: string) => {
    if (isPyro(id)) {
      lineSetAutopilot(lineRef.current!, id, false);
      lineSetScenario(lineRef.current!, id, scenarioId);
      refresh(id);
      return;
    }
    const sim = simsRef.current![id];
    if (!sim) return;
    engineSetAutopilot(sim, false);
    engineSetScenario(sim, scenarioId);
    stepSim(sim, true);
    refresh(id);
  }, [refresh]);

  const setAutopilot = useCallback((id: string, on: boolean) => {
    if (isPyro(id)) {
      lineSetAutopilot(lineRef.current!, id, on);
      refresh(id);
      return;
    }
    const sim = simsRef.current![id];
    if (!sim) return;
    engineSetAutopilot(sim, on);
    refresh(id);
  }, [refresh]);

  const setProfile = useCallback((id: string, profile: StoryProfile) => {
    if (isPyro(id)) {
      lineSetProfile(lineRef.current!, id, profile);
      refresh(id);
      return;
    }
    const sim = simsRef.current![id];
    if (!sim) return;
    engineSetProfile(sim, profile);
    refresh(id);
  }, [refresh]);

  /** Operator action on a finding: acknowledge (log only), mitigate (temporary relief) or repair (recover). */
  const performAction = useCallback((id: string, ruleId: string, kind: OperatorAction) => {
    if (isPyro(id)) {
      linePerformAction(lineRef.current!, id, ruleId, kind);
      refresh(id);
      return;
    }
    const sim = simsRef.current![id];
    if (!sim) return;
    enginePerformAction(sim, ruleId, kind);
    refresh(id);
  }, [refresh]);

  /** Jump the whole fleet forward `minutes` simulated minutes at once (demo fast-forward). */
  const speedRef = useRef(speedMultiplier);
  speedRef.current = speedMultiplier;
  const advance = useCallback((minutes: number) => {
    const next: Record<string, SimFrame> = {};
    const sims = Object.values(simsRef.current!);
    if (sims.length) anchorClock(sims[0].t + minutes, speedRef.current);
    for (const [id, sim] of Object.entries(simsRef.current!)) {
      for (let i = 1; i < minutes; i++) stepSim(sim, false);
      next[id] = stepSim(sim, true);
    }
    const line = lineRef.current!;
    for (let i = 1; i < minutes; i++) recordFrames(stepLine(line, false));
    Object.assign(next, recordFrames(stepLine(line, true)));
    setFrames(next);
  }, []);

  const controls = useMemo(
    () => ({ applyScenario, setAutopilot, setProfile, performAction, advance, setIsPaused, setSpeedMultiplier }),
    [applyScenario, setAutopilot, setProfile, performAction, advance],
  );

  return useMemo(
    () =>
      Object.fromEntries(
        [...KILN_FLEET, ...PYRO_FLEET].map((k) => [k.machineId, buildSimulation(k.machineId, frames[k.machineId], rotationAngle, isPaused, speedMultiplier, controls)]),
      ),
    [frames, rotationAngle, isPaused, speedMultiplier, controls],
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
};

/** One kiln's view of the fleet: its frame plus controls bound to it. Clock and speed are fleet-wide. */
function buildSimulation(
  machineId: string,
  frame: SimFrame,
  rotationAngle: number,
  isPaused: boolean,
  speedMultiplier: number,
  c: FleetControls,
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
