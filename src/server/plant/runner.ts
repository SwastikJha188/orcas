/**
 * The always-on plant.
 *
 * The live engines used to exist only inside an open page, so Health over
 * time held nothing for the hours no page was open. One server process now
 * runs the same engines (src/lib/fleet-boot) at the page's pace, one
 * simulated minute per real second, around the clock:
 *
 * - every 10 s bucket of each machine's health goes to `plant_health_samples`
 *   (the buckets the page's recorder keeps, see @/lib/health-recorder);
 * - every few minutes the whole plant is saved to `plant_state`, and pages
 *   resume it (caught up to now) instead of pre-rolling a plant of their own,
 *   so every page shows this one plant and its recorded history;
 * - a lease in `plant_runner_lease` lets exactly one of several servers on
 *   the same database run it; the others stand by and take over if it stops.
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
import { finishFleet, freezeFleet, prerollFleet, type FleetEngines, type FleetSnapshot, type PlantState } from "@/lib/fleet-boot";
import { setWallClock, stepSim } from "@/lib/kiln-sim/engine";
import { stepLine } from "@/lib/pyro-sim/engine";
import { recordFrames } from "@/lib/condition-report";
import { HEALTH_KEEP_MS, HEALTH_STEP_MS } from "@/lib/health-recorder";
import { decodePlant, encodePlant } from "@/lib/plant-codec";
import { ensurePlantTables, holdLease, loadState, pruneHealth, saveState, writeHealth, type HealthRow } from "./store";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

/** Real milliseconds per simulated minute: the page's 1× pace (TICK_MS in kiln-seals-simulation). */
const MS_PER_MIN = 1000;
const LEASE_TTL_MS = 30_000;
const LEASE_RENEW_MS = 10_000;
const SAVE_EVERY_MS = 5 * 60_000;
const FLUSH_EVERY_MS = HEALTH_STEP_MS;
const PRUNE_EVERY_MS = 6 * 60 * 60_000;
/** Minutes stepped between yields while catching up (a few tens of ms of work). */
const SLICE = 10;

const holder = `${hostname()}:${process.pid}:${randomBytes(3).toString("hex")}`;

interface Runner {
  engines: FleetEngines | null;
  /** Wall time of the last stepped minute. */
  wallMs: number;
  lastSavedMs: number;
  lastFlushMs: number;
  lastPruneMs: number;
  /** The open bucket: start ms and per-machine running sums. */
  bucket: { start: number; sums: Map<string, { sum: number; n: number }> } | null;
  pending: HealthRow[];
  pumping: boolean;
  leader: boolean;
  leaseOkAt: number;
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
    lastFlushMs: 0,
    lastPruneMs: 0,
    bucket: null,
    pending: [],
    pumping: false,
    leader: false,
    leaseOkAt: 0,
    timers: [],
  });
  const tryLead = async () => {
    try {
      await ensurePlantTables();
      const held = await holdLease(holder, LEASE_TTL_MS);
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
  r.lastFlushMs = Date.now();
  record(r, r.wallMs);
  r.timers.push(setInterval(() => void pump(r), MS_PER_MIN));
  void pump(r);
}

function stepDown(r: Runner, why: string): void {
  log(`stopped: ${why}`);
  for (const t of r.timers) clearInterval(t);
  r.timers = [];
  r.leader = false;
  r.engines = null;
  r.bucket = null;
  r.pending = [];
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
function stepFleet(e: FleetEngines, wallMs: number): void {
  const sims = Object.values(e.sims);
  if (sims.length) setWallClock(sims[0].t + 1, wallMs, MS_PER_MIN);
  for (const sim of sims) stepSim(sim, false);
  recordFrames(stepLine(e.line, false));
}

/** Each machine's health after the last step (the engines log it every minute, frame or not). */
function fleetHealth(e: FleetEngines): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, sim] of Object.entries(e.sims)) out[id] = sim.healthHist.overall[sim.healthHist.overall.length - 1];
  for (const [id, ms] of Object.entries(e.line.machines)) out[id] = ms.healthHist.overall[ms.healthHist.overall.length - 1];
  return out;
}

/** Add the fleet's health to the open bucket, closing it when `wallMs` starts the next. */
function record(r: Runner, wallMs: number): void {
  const values = fleetHealth(r.engines!);
  const start = Math.floor(wallMs / HEALTH_STEP_MS) * HEALTH_STEP_MS;
  if (r.bucket && r.bucket.start !== start) {
    for (const [id, { sum, n }] of r.bucket.sums) r.pending.push({ machineId: id, t: r.bucket.start, health: Math.round((sum / n) * 10) / 10 });
    r.bucket = null;
  }
  r.bucket ??= { start, sums: new Map() };
  for (const [id, v] of Object.entries(values)) {
    if (!Number.isFinite(v)) continue;
    const s = r.bucket.sums.get(id) ?? { sum: 0, n: 0 };
    s.sum += v;
    s.n += 1;
    r.bucket.sums.set(id, s);
  }
}

/** Step until the plant reaches now, a slice at a time, then flush, save and prune as due. */
async function pump(r: Runner): Promise<void> {
  if (r.pumping || !r.engines) return;
  r.pumping = true;
  try {
    let behind = false;
    while (r.engines && r.wallMs + MS_PER_MIN <= Date.now()) {
      for (let i = 0; i < SLICE && r.engines && r.wallMs + MS_PER_MIN <= Date.now(); i++) {
        r.wallMs += MS_PER_MIN;
        stepFleet(r.engines, r.wallMs);
        record(r, r.wallMs);
      }
      behind = Date.now() - r.wallMs > 5 * MS_PER_MIN;
      if (r.pending.length >= 2000) await flush(r);
      if (behind) await new Promise((res) => setImmediate(res));
    }
    if (!r.engines) return;
    const now = Date.now();
    if (now - r.lastFlushMs >= FLUSH_EVERY_MS) await flush(r);
    if (r.wallMs - r.lastSavedMs >= SAVE_EVERY_MS) await save(r);
    if (now - r.lastPruneMs >= PRUNE_EVERY_MS) {
      r.lastPruneMs = now;
      await pruneHealth();
    }
  } catch (err) {
    console.error("[plant] tick failed:", err instanceof Error ? err.message : err);
  } finally {
    r.pumping = false;
  }
}

async function flush(r: Runner): Promise<void> {
  r.lastFlushMs = Date.now();
  if (!r.pending.length) return;
  const rows = r.pending;
  r.pending = [];
  try {
    await writeHealth(rows);
  } catch (err) {
    r.pending = rows.concat(r.pending).slice(-20_000);
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
