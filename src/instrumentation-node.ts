import { getMqttRuntime } from "@/server/mqtt/runtime";

// Brokers come from the edge registry in PostgreSQL. The runtime reads it in
// the background and retries every 30 s, so a database outage never blocks boot.
try {
  getMqttRuntime();
} catch (err) {
  console.error("[mqtt] runtime failed to start", err instanceof Error ? err.message : err);
}
