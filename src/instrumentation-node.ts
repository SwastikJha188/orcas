import { getMqttRuntime } from "@/server/mqtt/runtime";

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
