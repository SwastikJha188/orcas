import { Hono } from "hono";
import { failFrom, ok } from "@backend/http";
import { listWorkOrderPriorities } from "@backend/services/monitoring-service";

/** /api/work-order-priorities */
export const workOrderPriorities = new Hono();


workOrderPriorities.get("/", async () => {
  try {
    return ok(await listWorkOrderPriorities());
  } catch (error) {
    return failFrom(error, "PRIORITIES_FAILED");
  }
});
