import { Hono } from "hono";
import { getHealthStatus } from "@backend/health";
import { type ApiSuccess } from "@shared/types/api";

/** /api/health */
export const health = new Hono();


health.get("/", async () => {
  const status = await getHealthStatus();
  const body: ApiSuccess<typeof status> = {
    data: status,
  };

  return Response.json(body);
});
