/**
 * Runs the live plant's warm-up and pre-roll off the main thread and posts the
 * engines back one minute short of their first frame (see `fleet-boot.ts`).
 */
import { prerollFleet } from "./fleet-boot";

export type FleetBootRequest = { nowMs: number; msPerMin: number };

self.onmessage = (e: MessageEvent<FleetBootRequest>) => {
  self.postMessage(prerollFleet(e.data.nowMs, e.data.msPerMin));
};
