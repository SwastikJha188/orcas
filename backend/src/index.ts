import { serve } from "@hono/node-server";
import { app } from "@backend/app";
import { getMqttRuntime } from "@backend/mqtt/runtime";

const PORT = Number(process.env.API_PORT ?? process.env.PORT ?? 4000);
const HOST = process.env.API_HOST ?? "0.0.0.0";

process.on("unhandledRejection", (reason) => console.error("[unhandledRejection]", reason));

const server = serve({ fetch: app.fetch, port: PORT, hostname: HOST }, (info) => {
  console.log(`[api] ULTRON backend listening on http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${info.port}`);
});

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

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    server.close();
    process.exit(0);
  });
}
