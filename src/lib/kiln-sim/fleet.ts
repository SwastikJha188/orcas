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

export const KILN_FLEET: ReadonlyArray<KilnFleetMember> = [
  { machineId: "KLN-01", seed: 20261012, profile: "advisory" },
  { machineId: "KLN-02", seed: 20261013, profile: "critical" },
  { machineId: "KLN-03", seed: 20261014, profile: "healthy" },
];

export const KILN_FLEET_IDS: ReadonlySet<string> = new Set(KILN_FLEET.map((k) => k.machineId));
