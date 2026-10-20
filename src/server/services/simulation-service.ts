/**
 * Simulation page: the live demonstration's settings (`simulation_settings`),
 * each simulated machine's demo profile (`machine_simulations.profile`) and the
 * actions queued for the always-on plant (`simulation_commands`). The plant
 * runner and every open page apply them (src/lib/fleet-boot syncFleetConfig /
 * applySimCommand). Settings are in engine units: simulated minutes, and one
 * simulated minute passes every real second.
 */
import pool, { invalidateReadCache, query } from "@/server/db";
import { LIVE_SIM_SETTINGS, eventPool, type LineSimSettings } from "@/lib/pyro-sim/engine";
import { PYRO_SCENARIOS, levelDelta, signalFaultScenario, type PyroScenario, type SignalFaultSpec } from "@/lib/pyro-sim/scenarios";
import { isEquipmentEffect } from "@/lib/pyro-sim/scenarios/common";
import { PYRO_SIGNAL_BY_TAG } from "@/lib/pyro-sim/signals";
import type { SimCommandSpec } from "@/lib/fleet-boot";
import { InputError, NotFoundError } from "@/server/errors";

export const LINE_ID = "pyro-line";

export type SimProfile = "story" | "healthy" | "advisory" | "critical";
const PROFILES: Record<string, readonly SimProfile[]> = {
  pyro: ["healthy", "advisory", "critical", "story"],
  kiln: ["healthy", "advisory", "critical", "story"],
  vpc: ["healthy", "advisory", "critical"],
};

export interface SimMachine {
  machineId: string;
  name: string;
  plantId: string;
  engine: "pyro" | "kiln" | "vpc";
  profile: SimProfile | null;
  profiles: readonly SimProfile[];
  enabled: boolean;
  /** Faults the page can start on this machine now (pyro line). */
  faults: Array<{ id: string; name: string; kind: "fault" | "sensor" }>;
  /** Every library scenario the page can start on this machine (pyro line), healthy baseline left out. */
  scenarios: SimScenario[];
}

/** What a library scenario does: wears a part, misreads a sensor, stops a unit, or moves the operating point. */
export type SimScenarioKind = "fault" | "sensor" | "trip" | "process";

export interface SimScenario {
  id: string;
  name: string;
  kind: SimScenarioKind;
  description: string;
  /** Rules it is expected to raise (empty: quiet, nothing should alarm). */
  rules: string[];
}

export interface SimCommandDto {
  id: number;
  kind: "raise" | "inject" | "signal" | "clear";
  machineId: string | null;
  faultKind: "fault" | "sensor" | null;
  scenarioId: string | null;
  /** Options of an inject, or the one-reading fault of a signal (engine units). */
  spec: SimCommandSpec | null;
  createdAt: string;
  createdBy: string | null;
  appliedAt: string | null;
}

export interface SimulationDto {
  /** The live line's settings: stored values over the built-in defaults. */
  settings: LineSimSettings;
  defaults: LineSimSettings;
  version: number;
  updatedAt: string | null;
  updatedBy: string | null;
  machines: SimMachine[];
  commands: SimCommandDto[];
}

/** Numeric knobs with their allowed range (engine units). */
const RANGES: Partial<Record<keyof LineSimSettings, [number, number]>> = {
  eventEvery: [30, 7200],
  eventLead: [1, 600],
  eventLife: [10, 7200],
  maxEvents: [0, 6],
  sensorShare: [0, 1],
  intensity: [0.5, 2.5],
  noise: [0, 4],
  healthDrift: [0, 3],
  holdMinutes: [0, 14400],
  changeGap: [0, 7200],
  holdCreep: [0, 0.5],
  limitClear: [3, 3600],
};

const scenarioKind = (sc: PyroScenario): SimScenarioKind =>
  sc.effects.some(isEquipmentEffect) ? "trip" : sc.group === "Sensor validation" ? "sensor" : sc.expected.length === 0 || sc.group === "Process change" ? "process" : "fault";

async function readCommands(sinceId: number | null, limit: number): Promise<SimCommandDto[]> {
  const res = await query<{ id: string; kind: SimCommandDto["kind"]; machine_id: string | null; fault_kind: SimCommandDto["faultKind"]; scenario_id: string | null; spec: SimCommandSpec | null; created_at: Date; created_by: string | null; applied_at: Date | null }>(
    `SELECT c.id, c.kind, c.machine_id, c.fault_kind, c.scenario_id, c.spec, c.created_at, COALESCE(u.full_name, c.created_by) AS created_by, c.applied_at
       FROM simulation_commands c LEFT JOIN users u ON u.id::text = c.created_by
      WHERE c.target = $1 AND ($2::bigint IS NULL OR c.id > $2)
      ORDER BY c.id DESC LIMIT $3`,
    [LINE_ID, sinceId, limit],
  );
  return res.rows
    .map((r) => ({
      id: Number(r.id),
      kind: r.kind,
      machineId: r.machine_id,
      faultKind: r.fault_kind,
      scenarioId: r.scenario_id,
      spec: r.spec,
      createdAt: r.created_at.toISOString(),
      createdBy: r.created_by,
      appliedAt: r.applied_at ? r.applied_at.toISOString() : null,
    }))
    .reverse();
}

export async function getSimulation(opts: { plantId?: string | null; sinceCommand?: number | null } = {}): Promise<SimulationDto> {
  const row = await query<{ settings: Partial<LineSimSettings>; version: number; updated_at: Date; updated_by: string | null }>(
    `SELECT s.settings, s.version, s.updated_at, COALESCE(u.full_name, s.updated_by) AS updated_by
       FROM simulation_settings s LEFT JOIN users u ON u.id::text = s.updated_by WHERE s.id = $1`,
    [LINE_ID],
  );
  const stored = row.rows[0]?.settings ?? {};
  const settings: LineSimSettings = { ...LIVE_SIM_SETTINGS, ...stored, machines: { ...LIVE_SIM_SETTINGS.machines, ...(stored.machines ?? {}) } };
  const machines = await query<{ machine_id: string; name: string; plant_id: string; engine_id: SimMachine["engine"]; profile: string | null; enabled: boolean }>(
    `SELECT s.machine_id, m.name, m.plant_id, s.engine_id, s.profile, s.enabled
       FROM machine_simulations s JOIN machines m ON m.id = s.machine_id
      WHERE ($1::varchar IS NULL OR m.plant_id = $1)
      ORDER BY m.plant_id, s.engine_id, s.machine_id`,
    [opts.plantId ?? null],
  );
  return {
    settings,
    defaults: LIVE_SIM_SETTINGS,
    version: Number(row.rows[0]?.version ?? 0),
    updatedAt: row.rows[0]?.updated_at.toISOString() ?? null,
    updatedBy: row.rows[0]?.updated_by ?? null,
    machines: machines.rows.map((m) => ({
      machineId: m.machine_id,
      name: m.name,
      plantId: m.plant_id,
      engine: m.engine_id,
      profile: (m.profile as SimProfile | null) ?? null,
      profiles: PROFILES[m.engine_id] ?? [],
      enabled: m.enabled,
      faults:
        m.engine_id === "pyro"
          ? [
              ...eventPool(m.machine_id, "fault").map((sc) => ({ id: sc.id, name: sc.name, kind: "fault" as const })),
              ...eventPool(m.machine_id, "sensor").map((sc) => ({ id: sc.id, name: sc.name, kind: "sensor" as const })),
            ]
          : [],
      scenarios:
        m.engine_id === "pyro"
          ? (PYRO_SCENARIOS[m.machine_id] ?? [])
              .filter((sc) => sc.id !== "healthy")
              .map((sc) => ({ id: sc.id, name: sc.name, kind: scenarioKind(sc), description: sc.description, rules: sc.expected }))
          : [],
    })),
    commands: await readCommands(opts.sinceCommand ?? null, 20),
  };
}

/** Saves the line's settings and machine profiles; one version step so the plant and pages pick them up. */
export async function updateSimulation(
  input: { settings?: Partial<LineSimSettings>; profiles?: Record<string, string> },
  userId: string | null,
): Promise<void> {
  const patch: Partial<LineSimSettings> = {};
  const src = input.settings ?? {};
  for (const [key, range] of Object.entries(RANGES) as Array<[keyof LineSimSettings, [number, number]]>) {
    const v = src[key];
    if (v === undefined) continue;
    if (typeof v !== "number" || !Number.isFinite(v) || v < range[0] || v > range[1]) throw new InputError(`${key} must be a number from ${range[0]} to ${range[1]}`);
    (patch as Record<string, number>)[key] = key === "maxEvents" ? Math.round(v) : v;
  }
  if (src.events !== undefined) {
    if (typeof src.events !== "boolean") throw new InputError("events must be true or false");
    patch.events = src.events;
  }
  if (src.machines !== undefined) {
    if (typeof src.machines !== "object" || src.machines === null || Object.values(src.machines).some((b) => typeof b !== "boolean"))
      throw new InputError("machines must map machine ids to true or false");
    patch.machines = src.machines;
  }
  const profiles = Object.entries(input.profiles ?? {});
  if (profiles.length) {
    const engines = await query<{ machine_id: string; engine_id: string }>("SELECT machine_id, engine_id FROM machine_simulations WHERE machine_id = ANY($1)", [profiles.map(([id]) => id)]);
    const engineOf = new Map(engines.rows.map((r) => [r.machine_id, r.engine_id]));
    for (const [id, p] of profiles) {
      const allowed = PROFILES[engineOf.get(id) ?? ""];
      if (!allowed) throw new NotFoundError(`${id} is not a simulated machine`);
      if (!allowed.includes(p as SimProfile)) throw new InputError(`${id}: profile must be one of ${allowed.join(", ")}`);
    }
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const [id, p] of profiles) await client.query("UPDATE machine_simulations SET profile = $2 WHERE machine_id = $1", [id, p]);
    await client.query(
      `INSERT INTO simulation_settings (id, settings, version, updated_at, updated_by) VALUES ($1, $2::jsonb, 1, NOW(), $3)
       ON CONFLICT (id) DO UPDATE SET settings = simulation_settings.settings || $2::jsonb, version = simulation_settings.version + 1, updated_at = NOW(), updated_by = $3`,
      [LINE_ID, JSON.stringify(patch), userId],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    invalidateReadCache(new Set(["simulation_settings", "machine_simulations"]));
  }
}

/** Back to the built-in live defaults (machine profiles are left as they are). */
export async function resetSimulation(userId: string | null): Promise<void> {
  await query(
    `UPDATE simulation_settings SET settings = $2::jsonb, version = version + 1, updated_at = NOW(), updated_by = $3 WHERE id = $1`,
    [LINE_ID, JSON.stringify(LIVE_SIM_SETTINGS), userId],
  );
}

const SHAPES: ReadonlyArray<SignalFaultSpec["shape"]> = ["step", "ramp", "drift", "osc", "spike", "noise", "freeze"];

/** A number in [lo, hi], or undefined when absent; anything else is an input error. */
function optNum(v: unknown, label: string, lo: number, hi: number): number | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "number" || !Number.isFinite(v) || v < lo || v > hi) throw new InputError(`${label} must be a number from ${lo} to ${hi}`);
  return v;
}

/** The checked options of an inject or a one-reading fault (engine units). */
function checkSpec(kind: SimCommandDto["kind"], machineId: string, scenarioId: string | null, raw: unknown): SimCommandSpec | null {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const common = { life: optNum(o.life, "life", 1, 14400), grow: optNum(o.grow, "grow", 0, 1) };
  if (kind === "inject") {
    if (!(PYRO_SCENARIOS[machineId] ?? []).some((sc) => sc.id === scenarioId)) throw new NotFoundError(`${scenarioId} is not a scenario of ${machineId}`);
    return { ...common, scale: optNum(o.scale, "scale", 0.5, 2.5) };
  }
  const tag = typeof o.tag === "string" ? o.tag : "";
  const def = PYRO_SIGNAL_BY_TAG[tag];
  if (!def || def.machine !== machineId) throw new InputError(`tag must be a reading of ${machineId}`);
  const shape = o.shape as SignalFaultSpec["shape"];
  if (!SHAPES.includes(shape)) throw new InputError(`shape must be one of ${SHAPES.join(", ")}`);
  const level = o.level === undefined || o.level === null ? undefined : o.level;
  if (level !== undefined && level !== "Alert" && level !== "Critical") throw new InputError("level must be Alert or Critical");
  if (level && levelDelta(def, level) === null) throw new InputError(`${tag} has no ${level} limit a fault can cross`);
  if (typeof o.sensor !== "boolean" && o.sensor !== undefined) throw new InputError("sensor must be true or false");
  const spec: SimCommandSpec = {
    ...common,
    tag,
    shape,
    level,
    delta: level || shape === "freeze" ? 0 : (optNum(o.delta, "delta", -1e6, 1e6) ?? 0),
    rampMin: optNum(o.rampMin, "rampMin", 0, 14400) ?? 0,
    sensor: o.sensor === true,
  };
  if (!signalFaultScenario({ machine: machineId, tag, shape, delta: spec.delta!, level, rampMin: spec.rampMin!, sensor: spec.sensor! })) throw new InputError("That fault cannot be made on this reading");
  return spec;
}

/** Queues an action for the plant and every open page. */
export async function addSimCommand(
  cmd: { kind: SimCommandDto["kind"]; machineId?: string | null; faultKind?: "fault" | "sensor" | null; scenarioId?: string | null; spec?: unknown },
  userId: string | null,
): Promise<void> {
  if (!["raise", "inject", "signal", "clear"].includes(cmd.kind)) throw new InputError("kind must be raise, inject, signal or clear");
  if (cmd.kind === "inject" && (!cmd.machineId || !cmd.scenarioId)) throw new InputError("inject needs machineId and scenarioId");
  if (cmd.kind === "signal" && !cmd.machineId) throw new InputError("signal needs machineId");
  if (cmd.faultKind && cmd.faultKind !== "fault" && cmd.faultKind !== "sensor") throw new InputError("faultKind must be fault or sensor");
  const spec = cmd.kind === "inject" || cmd.kind === "signal" ? checkSpec(cmd.kind, cmd.machineId!, cmd.scenarioId ?? null, cmd.spec) : null;
  await query(
    "INSERT INTO simulation_commands (target, kind, machine_id, fault_kind, scenario_id, spec, created_by) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)",
    [LINE_ID, cmd.kind, cmd.machineId ?? null, cmd.faultKind ?? null, cmd.kind === "signal" ? null : (cmd.scenarioId ?? null), spec ? JSON.stringify(spec) : null, userId],
  );
}

/** Plant runner: the actions not applied yet, oldest first; marks them applied. */
export async function takePendingCommands(): Promise<SimCommandDto[]> {
  const res = await pool.query<{ id: string; kind: SimCommandDto["kind"]; machine_id: string | null; fault_kind: SimCommandDto["faultKind"]; scenario_id: string | null; spec: SimCommandSpec | null; created_at: Date }>(
    `UPDATE simulation_commands SET applied_at = NOW()
      WHERE id IN (SELECT id FROM simulation_commands WHERE target = $1 AND applied_at IS NULL ORDER BY id LIMIT 20)
      RETURNING id, kind, machine_id, fault_kind, scenario_id, spec, created_at`,
    [LINE_ID],
  );
  return res.rows
    .map((r) => ({ id: Number(r.id), kind: r.kind, machineId: r.machine_id, faultKind: r.fault_kind, scenarioId: r.scenario_id, spec: r.spec, createdAt: r.created_at.toISOString(), createdBy: null, appliedAt: new Date().toISOString() }))
    .sort((a, b) => a.id - b.id);
}

/** Plant runner: the stored settings' version (cheap; a change means re-read the engine configuration). */
export async function simulationVersion(): Promise<number> {
  // Straight to the pool: another server may have written it, and the read cache is per process.
  const res = await pool.query<{ version: number }>("SELECT version FROM simulation_settings WHERE id = $1", [LINE_ID]);
  return Number(res.rows[0]?.version ?? 0);
}
