/**
 * The always-on plant.
 *
 * The live engines used to exist only inside an open page, so Health over
 * time held nothing for the hours no page was open. One server process now
 * runs the same engines (src/lib/fleet-boot) at the page's pace, one
 * simulated minute per real second, around the clock:
 *
 * - every publish period the simulated gateways' readings go to `readings`
 *   (./sim-gateway), and the server evaluation turns them into findings and
 *   the Machine Health Index (@backend/monitoring/evaluate);
 * - every few minutes the whole plant is saved to `plant_state`, and pages
 *   resume it (caught up to now) instead of pre-rolling a plant of their own,
 *   so every page shows this one plant and its recorded history;
 * - a lease in `plant_runner_lease` lets exactly one of several servers on
 *   the same database run it; the others stand by and take over if it stops.
 *   A leader whose loop stops making progress (setup failed, a pump hung)
 *   gives the lease up rather than renewing it while producing nothing.
 *
 * On start it resumes the saved plant and steps through the time it was down
 * (at most HEALTH_KEEP_MS, in small slices so requests keep being served); a
 * plant saved longer ago, or none, starts fresh that far back, so the charts'
 * whole window is filled. The engines are deterministic, so the minutes
 * stepped late are the ones the plant would have run.
 *
 * Off on Vercel (no long-lived process) unless PLANT_RUNNER=on;
 * PLANT_RUNNER=off disables it anywhere.
 */
import { randomBytes } from "crypto";
import { hostname } from "os";
import { promisify } from "util";
import { gunzip, gzip } from "zlib";
import { applySimCommand, ensureCopies, finishFleet, freezeFleet, prerollFleet, stepCopy, syncFleetConfig, type FleetEngines, type FleetSnapshot, type PlantState } from "@shared/lib/fleet-boot";
import { COPY_SOURCE } from "@shared/lib/pyro-sim/fleet";
import { simulationVersion, takePendingCommands } from "@backend/services/simulation-service";
import { setWallClock, stepSim } from "@shared/lib/kiln-sim/engine";
import { stepLine } from "@shared/lib/pyro-sim/engine";
import { createVpcSim, setVpcAutopilot, setVpcProfile, stepVpcSim } from "@shared/lib/vpc-sim/engine";
import { VPC_FLEET } from "@shared/lib/vpc-sim/defs";
import { recordFrames } from "@shared/lib/condition-report";
import { HEALTH_KEEP_MS } from "@shared/lib/health-recorder";
import { decodePlant, encodePlant } from "@shared/lib/plant-codec";
import { ensurePlantTables, holdLease, loadState, releaseLease, saveState } from "./store";
import { applyEngineConfig } from "@shared/lib/engine-config";
import { readEngineConfig } from "@backend/monitoring/engine-config";
import { loadSimBindings, sampleFleet, type SimBinding } from "./sim-gateway";
import { backfillLimitSensors, loadLimitSensors, sampleLimitSensors, type LimitSensor } from "./limit-sim";
import { rollupAndPrune, writeReadings, type ReadingIn } from "@backend/monitoring/readings";
import { setting } from "@backend/monitoring/settings";
import { evaluateFleet, type EngineRuleState } from "@backend/monitoring/evaluate";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

/** Real milliseconds per simulated minute: the page's 1× pace (TICK_MS in kiln-seals-simulation). */
const MS_PER_MIN = 1000;
const LEASE_TTL_MS = 30_000;
const LEASE_RENEW_MS = 10_000;
/** A leader whose loop has not progressed for this long steps down and frees the lease. */
const STALL_MS = 2 * LEASE_TTL_MS;
const SAVE_EVERY_MS = 5 * 60_000;
/** How often raw readings are summarised and pruned (the windows themselves are system settings). */
const ROLLUP_EVERY_MS = 60 * 60_000;
/** How often the engines' configuration is re-read from the database. */
const CONFIG_EVERY_MS = 60_000;
/** Minutes stepped between yields while catching up (a few tens of ms of work). */
const SLICE = 10;

const holder = `${hostname()}:${process.pid}:${randomBytes(3).toString("hex")}`;
/** Bump when the runner's behaviour changes: a newer runner takes the lease from older ones. */
// 6: pyro line on the OSW-PE-SNL-PYR-01 sensor list (223 online points).
// 12: part service lives from the database (SW-ALL-01); alarms issue maintenance checks.
// 13: the limit engine publishes for every machine without a dedicated model.
// 14: copies of the pyro line publish their kiln as a machine of its own (engine pyro-kln).
// 15: pyro line on the OSW-PE-SNL-PYR-01 Rev. 02 register (294 points; saved lines are migrated when thawed).
const RUNNER_VERSION = 15;

interface Runner {
  engines: FleetEngines | null;
  /** Wall time of the last stepped minute. */
  wallMs: number;
  lastSavedMs: number;
  lastConfigMs: number;
  /** Version of the Simulation page's settings last read (simulation_settings). */
  simVersion: number;
  /** Readings the simulated gateways published and not yet stored. */
  readings: ReadingIn[];
  /** Measurement bindings and publish period, refreshed from the database every pump. */
  bindings: SimBinding[];
  /** Limit-engine sensors (machines without a dedicated model), and the machines whose missed history is filled. */
  limitSensors: LimitSensor[];
  limitFilled: Set<string>;
  publishMs: number;
  lastPublishMs: number;
  lastEvalMs: number;
  evalMs: number;
  lastRollupMs: number;
  pumping: boolean;
  leader: boolean;
  leaseOkAt: number;
  /** Last time the loop stepped or finished a pump with readings flowing; the lease is only renewed while it moves. */
  progressAt: number;
  /** After a stall this process waits until then, so another server can take the lease. */
  standByUntil: number;
  /** Bumped on step-down so a pump still in flight from the old lead stops touching the runner. */
  generation: number;
  timers: ReturnType<typeof setInterval>[];
}

const g = globalThis as typeof globalThis & { __ultronPlantRunner?: Runner };

const log = (msg: string) => console.log(`[plant] ${msg}`);

function enabled(): boolean {
  const flag = process.env.PLANT_RUNNER?.toLowerCase();
  if (flag === "off" || flag === "0" || flag === "false") return false;
  if (process.env.VERCEL && flag !== "on") return false;
  return true;
}

/** Starts the runner once per process: it stands by until it holds the lease. */
export function startPlantRunner(): void {
  if (!enabled() || g.__ultronPlantRunner) return;
  const r: Runner = (g.__ultronPlantRunner = {
    engines: null,
    wallMs: 0,
    lastSavedMs: 0,
    lastConfigMs: 0,
    simVersion: -1,
    readings: [],
    bindings: [],
    limitSensors: [],
    limitFilled: new Set(),
    publishMs: 0,
    lastPublishMs: 0,
    lastEvalMs: 0,
    evalMs: 0,
    lastRollupMs: 0,
    pumping: false,
    leader: false,
    leaseOkAt: 0,
    progressAt: 0,
    standByUntil: 0,
    generation: 0,
    timers: [],
  });
  const tryLead = async () => {
    try {
      if (r.leader && Date.now() - r.progressAt > STALL_MS) {
        stepDown(r, `no progress for ${Math.round((Date.now() - r.progressAt) / 1000)} s`);
        r.standByUntil = Date.now() + 2 * LEASE_TTL_MS;
        await releaseLease(holder);
        return;
      }
      if (Date.now() < r.standByUntil) return;
      await ensurePlantTables();
      const held = await holdLease(holder, LEASE_TTL_MS, RUNNER_VERSION);
      if (held) r.leaseOkAt = Date.now();
      if (held && !r.leader) await lead(r);
      if (!held && r.leader) stepDown(r, "lease taken by another server");
    } catch (err) {
      // A database blip: keep running until the lease would have expired.
      if (r.leader && Date.now() - r.leaseOkAt > LEASE_TTL_MS) stepDown(r, "lease could not be renewed");
      if (!r.leader) console.error("[plant] standing by:", err instanceof Error ? err.message : err);
    }
  };
  void tryLead();
  setInterval(() => void tryLead(), LEASE_RENEW_MS).unref?.();
}

async function lead(r: Runner): Promise<void> {
  r.leader = true;
  r.progressAt = Date.now();
  try {
    await startLead(r);
  } catch (err) {
    stepDown(r, `could not start: ${err instanceof Error ? err.message : err}`);
  }
}

async function startLead(r: Runner): Promise<void> {
  // Which machines are simulated, and their signals' limits, states and rule texts, come from the database.
  applyEngineConfig(await readEngineConfig());
  r.lastConfigMs = Date.now();
  const now = Date.now();
  const saved = await loadState().catch(() => null);
  let state: PlantState | null = null;
  if (saved && now - saved.wallMs <= HEALTH_KEEP_MS) {
    try {
      const text = (await gunzipAsync(saved.body)).toString("utf8");
      const parsed = decodePlant<{ data: PlantState }>(text).data;
      if (parsed.msPerMin === MS_PER_MIN) state = parsed;
    } catch (err) {
      console.error("[plant] saved plant unreadable, starting fresh:", err instanceof Error ? err.message : err);
    }
  }
  if (state) {
    // The save is the fleet after its minute at wallMs: step the next one to get frames.
    r.engines = finish(state.fleet, state.wallMs + MS_PER_MIN, false);
    r.wallMs = state.wallMs + MS_PER_MIN;
    log(`resumed the saved plant from ${new Date(state.wallMs).toISOString()}; catching up ${Math.round((now - r.wallMs) / 60_000)} min`);
  } else {
    const start = now - HEALTH_KEEP_MS;
    r.engines = finish(prerollFleet(start, MS_PER_MIN), start, true);
    r.wallMs = start;
    log(`started a fresh plant at ${new Date(start).toISOString()}; catching up ${Math.round(HEALTH_KEEP_MS / 60_000)} min`);
  }
  r.lastSavedMs = r.wallMs;
  r.progressAt = Date.now();
  r.timers.push(setInterval(() => void pump(r), MS_PER_MIN));
  void pump(r);
}

function stepDown(r: Runner, why: string): void {
  log(`stopped: ${why}`);
  for (const t of r.timers) clearInterval(t);
  r.timers = [];
  r.leader = false;
  r.engines = null;
  r.readings = [];
  r.pumping = false;
  r.generation++;
}

/** Thaw a frozen fleet and step its next minute, that minute landing on `wallMs`. */
function finish(snap: FleetSnapshot, wallMs: number, fresh: boolean): FleetEngines {
  return finishFleet(snap, (tEnd) => setWallClock(tEnd, wallMs, MS_PER_MIN), fresh);
}

/**
 * One simulated minute for every engine, landing on `wallMs`. No frames: the
 * server never draws, and the engines' state is the same either way (the page
 * builds its own frames after resuming).
 */
function ensureVpc(e: FleetEngines): void {
  e.vpcs ??= {};
  for (const m of VPC_FLEET) {
    if (!e.vpcs[m.machineId]) {
      const v = createVpcSim(m.seed);
      setVpcAutopilot(v, true);
      setVpcProfile(v, m.profile);
      for (let i = 0; i < 90; i++) stepVpcSim(v, false);
      e.vpcs[m.machineId] = v;
    }
  }
}

function stepFleet(e: FleetEngines, wallMs: number): void {
  ensureVpc(e);
  // A copy added (or removed) in the database joins (or leaves) the running plant.
  e.copies = ensureCopies(e.copies, e.line);
  const sims = Object.values(e.sims);
  if (sims.length) setWallClock(sims[0].t + 1, wallMs, MS_PER_MIN);
  for (const sim of sims) stepSim(sim, false);
  recordFrames(stepLine(e.line, false));
  for (const [id, c] of Object.entries(e.copies)) stepCopy(id, c, false);
  for (const v of Object.values(e.vpcs)) stepVpcSim(v, false);
}

/** Diagnostic rules each engine's analytics currently report (building up or active). */
function ruleStates(e: FleetEngines | null): EngineRuleState[] {
  if (!e) return [];
  const out: EngineRuleState[] = [];
  for (const [machineId, sim] of Object.entries(e.sims)) {
    for (const [code, m] of Object.entries(sim.rules)) if (m.status !== "QUIET") out.push({ machineId, code, status: m.status, severity: m.severity, evidence: m.evidence });
  }
  for (const [machineId, ms] of Object.entries(e.line.machines)) {
    for (const [code, m] of Object.entries(ms.rules)) if (m.status !== "QUIET") out.push({ machineId, code, status: m.status, severity: m.severity, evidence: m.evidence });
  }
  for (const [machineId, c] of Object.entries(e.copies ?? {})) {
    const ms = c.machines[COPY_SOURCE];
    for (const [code, m] of Object.entries(ms?.rules ?? {})) if (m.status !== "QUIET") out.push({ machineId, code, status: m.status, severity: m.severity, evidence: m.evidence });
  }
  for (const [machineId, v] of Object.entries(e.vpcs ?? {})) {
    for (const [code, m] of Object.entries(v.ruleMem)) if (m.status !== "QUIET") out.push({ machineId, code, status: m.status, severity: m.severity, evidence: "" });
  }
  return out;
}

/** Publish each simulated gateway's readings once per publish period (also while catching up). */
function publish(r: Runner, wallMs: number): void {
  if (!r.publishMs || !r.bindings.length) return;
  const slot = Math.floor(wallMs / r.publishMs);
  if (slot === Math.floor(r.lastPublishMs / r.publishMs)) return;
  r.lastPublishMs = wallMs;
  for (const row of sampleFleet(r.engines!, r.bindings, wallMs)) r.readings.push(row);
  for (const row of sampleLimitSensors(r.limitSensors.filter((s) => r.limitFilled.has(s.machineId)), wallMs)) r.readings.push(row);
}

/** Once per limit-engine machine: the readings it missed, from its last stored one (at most the raw-readings window back). */
async function fillLimitHistory(r: Runner): Promise<void> {
  const fresh = r.limitSensors.filter((s) => !r.limitFilled.has(s.machineId));
  if (!fresh.length || !r.publishMs) return;
  const keepMs = (await setting("readings.raw_keep_h")) * 3_600_000;
  const rows = await backfillLimitSensors(fresh, r.publishMs, keepMs, r.wallMs);
  for (const s of fresh) r.limitFilled.add(s.machineId);
  if (rows.length) {
    await writeReadings(rows);
    log(`limit engine: filled ${rows.length} readings for ${new Set(fresh.map((s) => s.machineId)).size} machines`);
  }
}

/** Refresh the database-held configuration the loop depends on. */
async function refreshConfig(r: Runner): Promise<void> {
  try {
    // The Simulation page bumps the settings version: re-read the configuration at once rather than on the minute.
    const simVersion = await simulationVersion();
    if (Date.now() - r.lastConfigMs >= CONFIG_EVERY_MS || simVersion !== r.simVersion) {
      applyEngineConfig(await readEngineConfig());
      r.lastConfigMs = Date.now();
      r.simVersion = simVersion;
    }
    if (r.engines) {
      syncFleetConfig(r.engines);
      for (const cmd of await takePendingCommands()) applySimCommand(r.engines, cmd);
    }
    r.bindings = await loadSimBindings();
    r.limitSensors = await loadLimitSensors();
    r.publishMs = (await setting("readings.publish_period_s")) * 1000;
    r.evalMs = (await setting("evaluation.period_s")) * 1000;
  } catch (err) {
    console.error("[plant] configuration unavailable; readings paused:", err instanceof Error ? err.message : err);
    r.publishMs = 0;
  }
}

/** Step until the plant reaches now, a slice at a time, then flush, save and prune as due. */
async function pump(r: Runner): Promise<void> {
  if (r.pumping || !r.engines) return;
  r.pumping = true;
  const generation = r.generation;
  const current = () => r.engines !== null && r.generation === generation;
  try {
    await refreshConfig(r);
    let behind = false;
    while (current() && r.wallMs + MS_PER_MIN <= Date.now()) {
      for (let i = 0; i < SLICE && current() && r.wallMs + MS_PER_MIN <= Date.now(); i++) {
        r.wallMs += MS_PER_MIN;
        stepFleet(r.engines!, r.wallMs);
        publish(r, r.wallMs);
      }
      if (r.publishMs) r.progressAt = Date.now();
      behind = Date.now() - r.wallMs > 5 * MS_PER_MIN;
      if (r.readings.length >= 5000) await flushReadings(r);
      if (behind) await new Promise((res) => setImmediate(res));
    }
    if (!current()) return;
    await fillLimitHistory(r).catch((err) => console.error("[plant] limit engine history failed:", err instanceof Error ? err.message : err));
    const now = Date.now();
    if (r.readings.length) await flushReadings(r);
    if (r.evalMs && now - r.lastEvalMs >= r.evalMs) {
      r.lastEvalMs = now;
      await evaluateFleet({ ruleStates: ruleStates(r.engines) }).catch((err) => console.error("[plant] evaluation failed:", err instanceof Error ? err.message : err));
    }
    if (now - r.lastRollupMs >= ROLLUP_EVERY_MS) {
      r.lastRollupMs = now;
      await rollupAndPrune().catch((err) => console.error("[plant] readings rollup failed:", err instanceof Error ? err.message : err));
    }
    if (current() && r.wallMs - r.lastSavedMs >= SAVE_EVERY_MS) await save(r);
    // Stepping with readings paused (configuration unreadable) is not progress: another server may do better.
    if (current() && r.publishMs) r.progressAt = Date.now();
  } catch (err) {
    console.error("[plant] tick failed:", err instanceof Error ? err.message : err);
  } finally {
    if (r.generation === generation) r.pumping = false;
  }
}

async function flushReadings(r: Runner): Promise<void> {
  const rows = r.readings;
  r.readings = [];
  try {
    await writeReadings(rows);
  } catch (err) {
    // Keep the most recent backlog for the next attempt; older rows are lost, never invented.
    r.readings = rows.concat(r.readings).slice(-50_000);
    throw err;
  }
}

async function save(r: Runner): Promise<void> {
  const wallMs = r.wallMs;
  const state: PlantState = { wallMs, msPerMin: MS_PER_MIN, fleet: freezeFleet(r.engines!) };
  const body = await gzipAsync(Buffer.from(encodePlant({ data: state }), "utf8"));
  await saveState(wallMs, body);
  r.lastSavedMs = wallMs;
}
