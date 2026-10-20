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
import { LIVE_SIM_SETTINGS, clearEvents, createLine, freezeLine, injectEvent, injectSignalFault, raiseEvent, setAutopilot as lineSetAutopilot, setLineSettings, setProfile as lineSetProfile, stepLine, thawLine, type FrozenLine, type LineSimSettings, type Injection, type LineState, type SignalFaultSpec } from "./pyro-sim/engine";
import { PYRO_FLEET, pyroLineSeed, pyroLineSim } from "./pyro-sim/fleet";
import { createVpcSim, freezeVpc, setVpcAutopilot, setVpcProfile, stepVpcSim, thawVpc, type FrozenVpc, type VpcSimState } from "./vpc-sim/engine";
import { VPC_FLEET } from "./vpc-sim/defs";
import { exportReportTotals, importReportTotals, recordFrames, type ReportTotals } from "./condition-report";
import { decodePlant } from "./plant-codec";
import { applyEngineConfig, fetchEngineConfig } from "./engine-config";

/** Simulated minutes run before the first frame, so each kiln opens already in its condition. */
export const PRE_ROLL_MIN = 90;

export type FleetEngines = { sims: Record<string, SimState>; line: LineState; vpcs: Record<string, VpcSimState> };
/** Every engine one minute short of its first frame, as structured-cloneable data. */
export type FleetSnapshot = { sims: Record<string, FrozenSim>; line: FrozenLine; vpcs?: Record<string, FrozenVpc>; report: ReportTotals };

function buildFreshVpcs(): Record<string, FrozenVpc> {
  const out: Record<string, FrozenVpc> = {};
  for (const m of VPC_FLEET) {
    const vpc = createVpcSim(m.seed);
    setVpcAutopilot(vpc, true);
    setVpcProfile(vpc, m.profile);
    for (let i = 1; i < PRE_ROLL_MIN; i++) stepVpcSim(vpc, false);
    out[m.machineId] = freezeVpc(vpc);
  }
  return out;
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
  const line = createLine(pyroLineSeed());
  // The live line runs the demo layer: generated events, health drift, rotating held faults.
  setLineSettings(line, liveLineSettings());
  line.simVersion = pyroLineSim()?.version;
  for (const m of PYRO_FLEET) {
    lineSetAutopilot(line, m.machineId, true);
    lineSetProfile(line, m.machineId, m.profile);
  }
  setWallClock(line.t + PRE_ROLL_MIN, nowMs, msPerMin);
  for (let i = 1; i < PRE_ROLL_MIN; i++) recordFrames(stepLine(line, false));
  const vpcs = buildFreshVpcs();
  return { sims, line: freezeLine(line), vpcs, report: exportReportTotals() };
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
  // The Simulation page's stored settings and profiles win over what the snapshot carried.
  syncFleetConfig({ sims, line, vpcs: {} });
  anchor(line.t + 1);
  recordFrames(stepLine(line, true));
  for (const ms of Object.values(line.machines)) {
    if (fresh) ms.events = ms.events.filter((e) => !isStartupEvent(e));
    if (ms.frame) ms.frame = { ...ms.frame, events: ms.events.slice() };
  }
  const rawVpcs = snap.vpcs && Object.keys(snap.vpcs).length === VPC_FLEET.length ? snap.vpcs : buildFreshVpcs();
  const vpcs: Record<string, VpcSimState> = {};
  for (const m of VPC_FLEET) {
    const vpc = thawVpc(rawVpcs[m.machineId]);
    // Ensure saved fleets match the configured profile
    if (vpc.profile !== m.profile) setVpcProfile(vpc, m.profile);
    anchor(vpc.t + 1);
    stepVpcSim(vpc, true);
    if (fresh || !snap.vpcs) vpc.events = vpc.events.filter((e) => !isStartupEvent(e));
    if (vpc.frame) vpc.frame = { ...vpc.frame, events: vpc.events.slice() };
    vpcs[m.machineId] = vpc;
  }
  return { sims, line, vpcs };
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
  const vpcs = Object.fromEntries(Object.entries(e.vpcs).map(([id, v]) => [id, freezeVpc(v)])) as Record<string, FrozenVpc>;
  return { sims, line: { ...line, machines } as FrozenLine, vpcs, report: exportReportTotals() };
}

/** Step a frozen fleet `minutes` simulated minutes without frames (catching a saved plant up to now). */
export function advanceFrozenFleet(snap: FleetSnapshot, minutes: number): FleetSnapshot {
  const baseVpcs = snap.vpcs && Object.keys(snap.vpcs).length === VPC_FLEET.length ? snap.vpcs : buildFreshVpcs();
  if (minutes < 1) return { ...snap, vpcs: baseVpcs };
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
  const vpcs: Record<string, FrozenVpc> = {};
  for (const m of VPC_FLEET) {
    const vpc = thawVpc(baseVpcs[m.machineId]);
    if (vpc.profile !== m.profile) setVpcProfile(vpc, m.profile);
    for (let i = 0; i < minutes; i++) stepVpcSim(vpc, false);
    vpcs[m.machineId] = freezeVpc(vpc);
  }
  return { sims, line: { ...frozen, machines } as FrozenLine, vpcs, report: exportReportTotals() };
}

/** What `/api/plant/state` serves: the server's fleet after its last step, taken at `wallMs`. */
export type PlantState = { wallMs: number; msPerMin: number; fleet: FleetSnapshot };

/** A saved plant older than this means no server is running it: pre-roll a fresh one instead. */
export const PLANT_RESUME_MAX_MS = 10 * 60_000;

/**
 * The fleet a page starts from, one minute short of its first frame: the
 * server's plant caught up to `nowMs` when one is running (`savedAt`: when the
 * server took it), otherwise a fresh pre-roll.
 */
export async function loadFleet(
  nowMs: number,
  msPerMin: number,
  origin: string,
): Promise<{ snap: FleetSnapshot; resumed: boolean; savedAt: number | null }> {
  // The fleet, its signals' limits and states and the rule texts come from the database.
  applyEngineConfig(await fetchEngineConfig(origin));
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
        return { snap: advanceFrozenFleet(data.fleet, due - 1), resumed: true, savedAt: data.wallMs };
      }
    }
  } catch {
    /* no server plant (offline, disabled, or not saved yet): pre-roll locally */
  }
  return { snap: prerollFleet(nowMs, msPerMin), resumed: false, savedAt: null };
}

/* ------------------------------------------------------------------ */
/* Simulation page: database settings, profiles and commands          */
/* ------------------------------------------------------------------ */

/** The live line's settings: the stored ones (Simulation page) over the built-in live defaults. */
export function liveLineSettings(): LineSimSettings {
  const stored = pyroLineSim()?.settings ?? {};
  return { ...LIVE_SIM_SETTINGS, ...stored, machines: { ...LIVE_SIM_SETTINGS.machines, ...(stored.machines ?? {}) } };
}

/**
 * Brings a running fleet in line with the applied configuration (`applyEngineConfig`): the line's settings when
 * their stored version changed, and every machine's demo profile. Cheap and idempotent: call it after each
 * configuration refresh (plant runner, open pages).
 */
export function syncFleetConfig(e: FleetEngines): boolean {
  let changed = false;
  const sim = pyroLineSim();
  if (sim && e.line.simVersion !== sim.version) {
    setLineSettings(e.line, liveLineSettings());
    e.line.simVersion = sim.version;
    changed = true;
  }
  for (const m of PYRO_FLEET) {
    const ms = e.line.machines[m.machineId];
    if (ms && ms.story.profile !== m.profile) {
      lineSetProfile(e.line, m.machineId, m.profile);
      changed = true;
    }
  }
  for (const k of KILN_FLEET) {
    const sim = e.sims[k.machineId];
    if (sim && sim.story.profile !== k.profile) {
      setProfile(sim, k.profile);
      changed = true;
    }
  }
  for (const v of VPC_FLEET) {
    const vpc = e.vpcs[v.machineId];
    if (vpc && vpc.profile !== v.profile) {
      setVpcProfile(vpc, v.profile);
      changed = true;
    }
  }
  return changed;
}

/** Options of a Simulation page action (`simulation_commands.spec`, engine units). */
export interface SimCommandSpec {
  /** inject: strength (× the alerting point); signal: ignored. */
  scale?: number;
  /** Minutes until it eases off. */
  life?: number;
  /** Share of its size added every 60 minutes once in place. */
  grow?: number;
  /** signal: the one-reading fault. */
  tag?: string;
  shape?: SignalFaultSpec["shape"];
  delta?: number;
  level?: SignalFaultSpec["level"];
  rampMin?: number;
  sensor?: boolean;
}

/** One action from the Simulation page (`simulation_commands`). */
export interface SimCommand {
  id: number;
  kind: "raise" | "inject" | "signal" | "clear";
  machineId: string | null;
  faultKind: "fault" | "sensor" | null;
  scenarioId: string | null;
  spec?: SimCommandSpec | null;
  /** When the plant runner applied it (ISO; null: not yet). */
  appliedAt?: string | null;
}

/**
 * Applies a Simulation page action to the live line. `agoMin`: the plant applied it that many minutes ago (a page
 * that resumed a plant saved before it), so the fault is as far along here as there.
 */
export function applySimCommand(e: FleetEngines, cmd: SimCommand, agoMin = 0): void {
  const machine = cmd.machineId ?? undefined;
  const o = cmd.spec ?? {};
  let j: Injection | null = null;
  if (cmd.kind === "raise") j = raiseEvent(e.line, cmd.faultKind ?? "fault", machine, false);
  else if (cmd.kind === "inject" && machine && cmd.scenarioId) j = injectEvent(e.line, machine, cmd.scenarioId, { scale: o.scale, life: o.life, grow: o.grow });
  else if (cmd.kind === "signal" && machine && o.tag && o.shape)
    j = injectSignalFault(e.line, {
      machine,
      tag: o.tag,
      shape: o.shape,
      delta: o.delta ?? 0,
      level: o.level,
      rampMin: o.rampMin ?? 0,
      sensor: o.sensor ?? false,
      life: o.life ?? 60,
      grow: o.grow,
    });
  else if (cmd.kind === "clear") clearEvents(e.line, machine);
  if (j && agoMin > 0) {
    j.start -= agoMin;
    j.end -= agoMin;
  }
}
