import { Hono } from "hono";
import { failFrom, ok, requestScope } from "@backend/http";
import { readEngineConfig } from "@backend/monitoring/engine-config";
import { requirePlant, scopedRows } from "@backend/services/access-service";
import { listSimulations } from "@backend/services/monitoring-service";

/** /api/simulations */
export const simulations = new Hono();


simulations.get("/", async (c) => {
  const request = c.req.raw;
  try {
    const plantIds = new URL(request.url).searchParams.getAll("plantId");
    const scope = await requestScope(request);
    for (const id of plantIds) requirePlant(scope, id);
    return ok(scopedRows(scope, await listSimulations(plantIds.length ? plantIds : undefined)));
  } catch (error) {
    return failFrom(error, "SIMULATIONS_FAILED");
  }
});

simulations.get("/config", async () => {
  try {
    return ok(await readEngineConfig());
  } catch (error) {
    return failFrom(error, "ENGINE_CONFIG_FAILED");
  }
});
