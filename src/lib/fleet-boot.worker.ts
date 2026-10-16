/**
 * Loads the live plant off the main thread — the server's always-on plant
 * caught up to now, or a fresh warm-up and pre-roll — and posts the engines
 * back one minute short of their first frame (see `fleet-boot.ts`).
 */
import { loadFleet, type FleetSnapshot } from "./fleet-boot";

export type FleetBootRequest = { nowMs: number; msPerMin: number };
export type FleetBootResult = { snap: FleetSnapshot; resumed: boolean };

self.onmessage = (e: MessageEvent<FleetBootRequest>) => {
  void loadFleet(e.data.nowMs, e.data.msPerMin, self.location.origin).then((result: FleetBootResult) => self.postMessage(result));
};
