import { serve } from "@hono/node-server";
import { app } from "@backend/app";
import { startBackground } from "@backend/background";

const PORT = Number(process.env.API_PORT ?? process.env.PORT ?? 4000);
const HOST = process.env.API_HOST ?? "0.0.0.0";

process.on("unhandledRejection", (reason) => console.error("[unhandledRejection]", reason));

const server = serve({ fetch: app.fetch, port: PORT, hostname: HOST }, (info) => {
  console.log(`[api] ULTRON backend listening on http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${info.port}`);
});

startBackground();

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    server.close();
    process.exit(0);
  });
}
