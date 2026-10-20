import { getMqttRuntime } from "@/server/mqtt/runtime";

// Guard against Next.js 15 Turbopack throwing unhandledRejection when an
// existing browser tab sends a legacy webpack HMR `{"event":"ping"}` frame.
const g = globalThis as unknown as { __ultronHmrGuard?: boolean };
if (!g.__ultronHmrGuard) {
  g.__ultronHmrGuard = true;
  process.on("unhandledRejection", (reason) => {
    const msg = reason instanceof Error ? reason.message : String(reason ?? "");
    if (msg.includes("unrecognized HMR message")) return;
    console.error("[unhandledRejection]", reason);
  });
}

// Brokers come from the edge registry in PostgreSQL. The runtime reads it in
// the background and retries every 30 s, so a database outage never blocks boot.
try {
  getMqttRuntime();
} catch (err) {
  console.error("[mqtt] runtime failed to start", err instanceof Error ? err.message : err);
}

// Fill the database read cache in the background so the first page after a
// deploy is served from memory too.
setTimeout(() => {
  void import("@/server/warm-cache")
    .then((m) => m.warmReadCache())
    .catch((err) => console.error("[cache] warm-up failed", err instanceof Error ? err.message : err));
}, 500);

// Run the live plant around the clock (one server per database holds the
// lease), so its health is recorded while no page is open.
setTimeout(() => {
  void import("@/server/plant/runner")
    .then((m) => m.startPlantRunner())
    .catch((err) => console.error("[plant] runner failed to start", err instanceof Error ? err.message : err));
}, 1_000);
