/**
 * Building the live plant: every kiln engine of `KILN_FLEET` and the pyro
 * line, each warmed up and pre-rolled so it opens already in its condition.
 *
 * The warm-up and pre-roll take most of a second, so the browser runs them in
 * a worker (`fleet-boot.worker.ts`): `prerollFleet` there, then `finishFleet`
 * on the main thread steps each engine's last minute, so the frames the UI
 * reads are built (and their `defs` resolved) on the page itself. Running both
 * in one thread gives exactly what the old one-step boot gave.
 * Pure TypeScript, no React.
 */
import { createSim, freezeSim, setAutopilot, setProfile, setWallClock, stepSim, thawSim, type FrozenSim, type SimState } from "./kiln-sim/engine";
import { KILN_FLEET } from "./kiln-sim/fleet";
import { LIVE_SIM_SETTINGS, createLine, freezeLine, setAutopilot as lineSetAutopilot, setLineSettings, setProfile as lineSetProfile, stepLine, thawLine, type FrozenLine, type LineState } from "./pyro-sim/engine";
import { PYRO_FLEET, PYRO_LINE_SEED } from "./pyro-sim/fleet";
import { exportReportTotals, importReportTotals, recordFrames, type ReportTotals } from "./condition-report";

/** Simulated minutes run before the first frame, so each kiln opens already in its condition. */
export const PRE_ROLL_MIN = 90;

export type FleetEngines = { sims: Record<string, SimState>; line: LineState };
/** Every engine one minute short of its first frame, as structured-cloneable data. */
export type FleetSnapshot = { sims: Record<string, FrozenSim>; line: FrozenLine; report: ReportTotals };

/**
 * Warm up and pre-roll every engine, all but the last minute. All engines run
 * on one clock: simulated minute `t + PRE_ROLL_MIN` is anchored at `nowMs`.
 */
export function prerollFleet(nowMs: number, msPerMin: number): FleetSnapshot {
  const sims: Record<string, FrozenSim> = {};
  for (const k of KILN_FLEET) {
    const sim = createSim("healthy", k.seed);
    setAutopilot(sim, true);
    setProfile(sim, k.profile);
    setWallClock(sim.t + PRE_ROLL_MIN, nowMs, msPerMin);
    for (let i = 1; i < PRE_ROLL_MIN; i++) stepSim(sim, false);
    sims[k.machineId] = freezeSim(sim);
  }
  const line = createLine(PYRO_LINE_SEED);
  // The live line runs the demo layer: generated events, health drift, rotating held faults.
  setLineSettings(line, LIVE_SIM_SETTINGS);
  for (const m of PYRO_FLEET) {
    lineSetAutopilot(line, m.machineId, true);
    lineSetProfile(line, m.machineId, m.profile);
  }
  setWallClock(line.t + PRE_ROLL_MIN, nowMs, msPerMin);
  for (let i = 1; i < PRE_ROLL_MIN; i++) recordFrames(stepLine(line, false));
  return { sims, line: freezeLine(line), report: exportReportTotals() };
}

const isStartupEvent = (e: { kind: string; title: string }) => e.kind === "scenario" || (e.kind === "action" && e.title.startsWith("Autopilot"));

/**
 * Step every engine's first frame. `anchor(tEnd)` pins the display clock so
 * simulated minute `tEnd` reads as now (the caller owns the wall clock).
 */
export function finishFleet(snap: FleetSnapshot, anchor: (tEnd: number) => void): FleetEngines {
  importReportTotals(snap.report);
  const sims: Record<string, SimState> = {};
  for (const [id, frozen] of Object.entries(snap.sims)) {
    const sim = thawSim(frozen);
    anchor(sim.t + 1);
    stepSim(sim, true);
    sim.events = sim.events.filter((e) => !isStartupEvent(e));
    sim.frame = { ...sim.frame!, events: sim.events.slice() };
    sims[id] = sim;
  }
  const line = thawLine(snap.line);
  anchor(line.t + 1);
  recordFrames(stepLine(line, true));
  for (const ms of Object.values(line.machines)) {
    ms.events = ms.events.filter((e) => !isStartupEvent(e));
    if (ms.frame) ms.frame = { ...ms.frame, events: ms.events.slice() };
  }
  return { sims, line };
}
