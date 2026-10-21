/**
 * The live pyro line: one engine, six machines, each with the autopilot
 * profile it is held at. A mix so the line always shows healthy machines,
 * developing findings and a danger one. Pure data: safe for client and server.
 */
import type { StoryProfile } from "../kiln-sim/engine";
import type { LineSimSettings } from "./engine";

const fleet: Array<{ machineId: string; profile: StoryProfile }> = [];
let lineSeed: number | null = null;

/**
 * The pyro machines' demo profiles and the line's seed, from the database
 * (`machine_simulations`, engine "pyro"), set by `applyEngineConfig`. The line
 * itself always simulates every machine of the D4 schedule.
 */
export const PYRO_FLEET: ReadonlyArray<{ machineId: string; profile: StoryProfile }> = fleet;

/** Replaces the profiles (in place) and the line seed. */
export function setPyroFleet(members: Array<{ machineId: string; profile: StoryProfile }>, seed: number | null): void {
  fleet.splice(0, fleet.length, ...members);
  lineSeed = seed;
}

/** The live line's simulation settings from the database (`simulation_settings`, Simulation page) and their version. */
let lineSim: { settings: Partial<LineSimSettings>; version: number } | null = null;

export function setPyroLineSim(cfg: { settings: Partial<LineSimSettings>; version: number } | null): void {
  lineSim = cfg;
}

/** The database simulation settings of the live line (null before the configuration is applied, or none stored). */
export const pyroLineSim = (): { settings: Partial<LineSimSettings>; version: number } | null => lineSim;

/** Seed of the pyro line engine; throws before the configuration is applied. */
export function pyroLineSeed(): number {
  if (lineSeed === null) throw new Error("pyro line not configured: apply the engine configuration first");
  return lineSeed;
}

/** The line machine a copy publishes as a machine of its own. */
export const COPY_SOURCE = "PYR-KLN-01";

const copies: Array<{ machineId: string; seed: number; profile: StoryProfile }> = [];

/**
 * Independent copies of the line (`machine_simulations`, engine "pyro-kln"):
 * each runs a whole line of its own, with its own seed, and only its rotary
 * kiln (`COPY_SOURCE`) is published, under the copy's machine id. Set by
 * `applyEngineConfig`.
 */
export const PYRO_COPIES: ReadonlyArray<{ machineId: string; seed: number; profile: StoryProfile }> = copies;

export function setPyroCopies(members: Array<{ machineId: string; seed: number; profile: StoryProfile }>): void {
  copies.splice(0, copies.length, ...members);
}

/** True for a machine published by a copy of the line. */
export const isPyroCopy = (machineId: string | null | undefined): boolean => Boolean(machineId && copies.some((c) => c.machineId === machineId));

/** The line machine whose drawings, catalogue and scenarios serve `machineId`: a copy's source, else itself. */
export const sourceMachineId = (machineId: string): string => (isPyroCopy(machineId) ? COPY_SOURCE : machineId);
