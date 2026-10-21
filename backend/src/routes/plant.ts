import { Hono } from "hono";
import { accessFail, requestScope } from "@backend/http";
import { setting } from "@backend/monitoring/settings";
import { ensurePlantTables, loadState, readHealth, stateWallMs } from "@backend/plant/store";
import { seesMachine } from "@backend/services/access-service";

/** /api/plant */
export const plant = new Hono();

// The saved plant is about 1.5 MB gzipped and changes every few minutes: keep
// the last one in memory and let browsers revalidate it by its time stamp.
const g = globalThis as typeof globalThis & { __ultronPlantBody?: { wallMs: number; body: Buffer } };
plant.get("/health", async (c) => {
  const request = c.req.raw;
  try {
    const now = Date.now();
    const keepMs = (await setting("health.sample_keep_h")) * 3_600_000;
    const asked = Number(new URL(request.url).searchParams.get("from"));
    const from = Number.isFinite(asked) && asked > 0 ? Math.max(asked, now - keepMs) : now - keepMs;
    const scope = await requestScope(request);
    await ensurePlantTables();
    const health = await readHealth(from);
    const series = Object.fromEntries(Object.entries(health.series).filter(([machineId]) => seesMachine(scope, machineId)));
    return Response.json({ data: { ...health, series } });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const message = error instanceof Error ? error.message : "Failed to load the health record";
    return Response.json({ error: { code: "PLANT_HEALTH_ERROR", message } }, { status: 500 });
  }
});

plant.get("/state", async (c) => {
  const request = c.req.raw;
  try {
    await ensurePlantTables();
    const wallMs = await stateWallMs();
    if (wallMs === null) {
      return Response.json({ error: { code: "NO_PLANT", message: "No server is running the plant." } }, { status: 404 });
    }
    const etag = `"plant-${wallMs}"`;
    if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: { ETag: etag } });
    if (g.__ultronPlantBody?.wallMs !== wallMs) {
      const saved = await loadState();
      if (!saved) return Response.json({ error: { code: "NO_PLANT", message: "No server is running the plant." } }, { status: 404 });
      g.__ultronPlantBody = saved;
    }
    const { body, wallMs: at } = g.__ultronPlantBody!;
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": "application/json",
        "Content-Encoding": "gzip",
        "Cache-Control": "no-cache",
        ETag: `"plant-${at}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load the plant";
    return Response.json({ error: { code: "PLANT_STATE_ERROR", message } }, { status: 500 });
  }
});
