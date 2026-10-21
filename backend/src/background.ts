import { getMqttRuntime } from "@backend/mqtt/runtime";

/**
 * Background work the API starts with its process: the MQTT runtime, the
 * read-cache warm-up and the live plant runner. Used by the standalone server
 * (index.ts) and, on Vercel, by the Next.js instrumentation hook.
 */
export function startBackground(): void {
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
    void import("@backend/warm-cache")
      .then((m) => m.warmReadCache())
      .catch((err) => console.error("[cache] warm-up failed", err instanceof Error ? err.message : err));
  }, 500);

  // Run the live plant around the clock (one server per database holds the
  // lease), so its health is recorded while no page is open.
  setTimeout(() => {
    void import("@backend/plant/runner")
      .then((m) => m.startPlantRunner())
      .catch((err) => console.error("[plant] runner failed to start", err instanceof Error ? err.message : err));
  }, 1_000);
}
