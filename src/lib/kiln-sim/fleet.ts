/**
 * The live kiln fleet: three KLN seal lines, each its own engine and seed.
 * The autopilot keeps each at its profile — one healthy, one on alert, one in
 * danger. Machine ids must match the DB catalog (KLN-02 / KLN-03 are cloned
 * from KLN-01 by `applyKilnFleet`). Pure data: safe for client and server.
 */
import type { StoryProfile } from "./engine";

export interface KilnFleetMember {
  machineId: string;
  seed: number;
  profile: StoryProfile;
}

/**
 * The simulated kiln-seal machines, from the database (`machine_simulations`,
 * engine "kiln"), filled by `applyEngineConfig` before any engine runs.
 */
const fleet: KilnFleetMember[] = [];
const ids = new Set<string>();

export const KILN_FLEET: ReadonlyArray<KilnFleetMember> = fleet;
export const KILN_FLEET_IDS: ReadonlySet<string> = ids;

/** Replaces the fleet in place (every importer sees the new members). */
export function setKilnFleet(members: KilnFleetMember[]): void {
  fleet.splice(0, fleet.length, ...members);
  ids.clear();
  for (const m of members) ids.add(m.machineId);
}
