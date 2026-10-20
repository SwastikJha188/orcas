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
