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
import { createVpcSim, freezeVpc, setVpcAutopilot, setVpcProfile, stepVpcSim, thawVpc, type FrozenVpc, type VpcSimState } from "./vpc-sim/engine";
import { exportReportTotals, importReportTotals, recordFrames, type ReportTotals } from "./condition-report";
import { decodePlant } from "./plant-codec";

/** Simulated minutes run before the first frame, so each kiln opens already in its condition. */
export const PRE_ROLL_MIN = 90;

export type FleetEngines = { sims: Record<string, SimState>; line: LineState; vpc: VpcSimState };
/** Every engine one minute short of its first frame, as structured-cloneable data. */
export type FleetSnapshot = { sims: Record<string, FrozenSim>; line: FrozenLine; vpc?: FrozenVpc; report: ReportTotals };

function buildFreshVpc(): FrozenVpc {
  const vpc = createVpcSim(20261016);
  setVpcAutopilot(vpc, true);
  setVpcProfile(vpc, "advisory");
  for (let i = 1; i < PRE_ROLL_MIN; i++) stepVpcSim(vpc, false);
  return freezeVpc(vpc);
}

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
  const vpc = buildFreshVpc();
  return { sims, line: freezeLine(line), vpc, report: exportReportTotals() };
}

const isStartupEvent = (e: { kind: string; title: string }) => e.kind === "scenario" || (e.kind === "action" && e.title.startsWith("Autopilot"));

/**
 * Step every engine's first frame. `anchor(tEnd)` pins the display clock so
 * simulated minute `tEnd` reads as now (the caller owns the wall clock).
 * A freshly pre-rolled fleet drops its start-up events; a resumed one keeps
 * its log (`fresh` false).
 */
export function finishFleet(snap: FleetSnapshot, anchor: (tEnd: number) => void, fresh = true): FleetEngines {
  importReportTotals(snap.report);
  const sims: Record<string, SimState> = {};
  for (const [id, frozen] of Object.entries(snap.sims)) {
    const sim = thawSim(frozen);
    anchor(sim.t + 1);
    stepSim(sim, true);
    if (fresh) sim.events = sim.events.filter((e) => !isStartupEvent(e));
    sim.frame = { ...sim.frame!, events: sim.events.slice() };
    sims[id] = sim;
  }
  const line = thawLine(snap.line);
  anchor(line.t + 1);
  recordFrames(stepLine(line, true));
  for (const ms of Object.values(line.machines)) {
    if (fresh) ms.events = ms.events.filter((e) => !isStartupEvent(e));
    if (ms.frame) ms.frame = { ...ms.frame, events: ms.events.slice() };
  }
  const vpc = thawVpc(snap.vpc ?? buildFreshVpc());
  anchor(vpc.t + 1);
  stepVpcSim(vpc, true);
  if (fresh || !snap.vpc) vpc.events = vpc.events.filter((e) => !isStartupEvent(e));
  if (vpc.frame) vpc.frame = { ...vpc.frame, events: vpc.events.slice() };
  return { sims, line, vpc };
}

/* --------------------------------------------------------------------------
   The always-on plant.
   A server process (src/server/plant) runs the same engines around the clock
   and saves them every minute; pages resume that plant instead of pre-rolling
   their own, so every browser shows one continuous plant and the health the
   server recorded while no page was open belongs to it.
   -------------------------------------------------------------------------- */

/** Every engine as cloneable data, frames dropped (the next step rebuilds them). */
export function freezeFleet(e: FleetEngines): FleetSnapshot {
  const sims = Object.fromEntries(Object.entries(e.sims).map(([id, sim]) => [id, { ...freezeSim(sim), frame: null }])) as Record<string, FrozenSim>;
  const line = freezeLine(e.line);
  const machines = Object.fromEntries(Object.entries(line.machines).map(([id, ms]) => [id, { ...ms, frame: null }]));
  return { sims, line: { ...line, machines } as FrozenLine, vpc: freezeVpc(e.vpc), report: exportReportTotals() };
}

/** Step a frozen fleet `minutes` simulated minutes without frames (catching a saved plant up to now). */
export function advanceFrozenFleet(snap: FleetSnapshot, minutes: number): FleetSnapshot {
  const baseVpc = snap.vpc ?? buildFreshVpc();
  if (minutes < 1) return { ...snap, vpc: baseVpc };
  importReportTotals(snap.report);
  const sims: Record<string, FrozenSim> = {};
  for (const [id, frozen] of Object.entries(snap.sims)) {
    const sim = thawSim(frozen);
    for (let i = 0; i < minutes; i++) stepSim(sim, false);
    sims[id] = { ...freezeSim(sim), frame: null } as FrozenSim;
  }
  const line = thawLine(snap.line);
  for (let i = 0; i < minutes; i++) recordFrames(stepLine(line, false));
  const frozen = freezeLine(line);
  const machines = Object.fromEntries(Object.entries(frozen.machines).map(([id, ms]) => [id, { ...ms, frame: null }]));
  const vpc = thawVpc(baseVpc);
  for (let i = 0; i < minutes; i++) stepVpcSim(vpc, false);
  return { sims, line: { ...frozen, machines } as FrozenLine, vpc: freezeVpc(vpc), report: exportReportTotals() };
}

/** What `/api/plant/state` serves: the server's fleet after its last step, taken at `wallMs`. */
export type PlantState = { wallMs: number; msPerMin: number; fleet: FleetSnapshot };

/** A saved plant older than this means no server is running it: pre-roll a fresh one instead. */
export const PLANT_RESUME_MAX_MS = 10 * 60_000;

/**
 * The fleet a page starts from, one minute short of its first frame: the
 * server's plant caught up to `nowMs` when one is running, otherwise a fresh
 * pre-roll.
 */
export async function loadFleet(
  nowMs: number,
  msPerMin: number,
  origin: string,
): Promise<{ snap: FleetSnapshot; resumed: boolean }> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6_000);
    const res = await fetch(new URL("/api/plant/state", origin), { cache: "no-cache", signal: ctrl.signal }).finally(() => clearTimeout(timer));
    if (res.ok) {
      const { data } = decodePlant<{ data: PlantState }>(await res.text());
      const age = Date.now() - data.wallMs;
      if (data.msPerMin === msPerMin && age >= 0 && age <= PLANT_RESUME_MAX_MS) {
        // The server stepped its last minute at wallMs; catch up to one minute short of now.
        const due = Math.round(age / msPerMin);
        return { snap: advanceFrozenFleet(data.fleet, due - 1), resumed: true };
      }
    }
  } catch {
    /* no server plant (offline, disabled, or not saved yet): pre-roll locally */
  }
  return { snap: prerollFleet(nowMs, msPerMin), resumed: false };
}
