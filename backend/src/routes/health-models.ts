import { Hono } from "hono";
import { failFrom, ok } from "@backend/http";
import { listHealthModels } from "@backend/services/monitoring-service";

/** /api/health-models */
export const healthModels = new Hono();


healthModels.get("/", async () => {
  try {
    return ok(await listHealthModels());
  } catch (error) {
    return failFrom(error, "HEALTH_MODELS_FAILED");
  }
});
