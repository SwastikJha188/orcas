/**
 * The live pyro line: one engine, six machines, each with the autopilot
 * profile it is held at. A mix so the line always shows healthy machines,
 * developing findings and a danger one. Pure data: safe for client and server.
 */
import type { StoryProfile } from "../kiln-sim/engine";

export const PYRO_LINE_SEED = 20261014;

export const PYRO_FLEET: ReadonlyArray<{ machineId: string; profile: StoryProfile }> = [
  { machineId: "PYR-FED-01", profile: "healthy" },
  { machineId: "PYR-PHC-01", profile: "advisory" },
  { machineId: "PYR-KLN-01", profile: "advisory" },
  { machineId: "PYR-BRN-01", profile: "healthy" },
  { machineId: "PYR-CLR-01", profile: "critical" },
  { machineId: "PYR-CCT-01", profile: "healthy" },
];
