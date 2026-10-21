import { Hono } from "hono";
import { accessFail, requestScope } from "@backend/http";
import { requireMachine } from "@backend/services/access-service";
import { getMachineInsights } from "@backend/services/insights-service";

/** /api/insights */
export const insights = new Hono();


insights.get("/", async (c) => {
  const request = c.req.raw;
  try {
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get("machineId");
    if (!machineId) return Response.json({ error: { code: "INVALID_INPUT", message: "machineId is required" } }, { status: 400 });
    requireMachine(await requestScope(request), machineId);
    const data = await getMachineInsights(machineId);
    return Response.json({ data });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const message = error instanceof Error ? error.message : "Failed to compute insights";
    return Response.json(
      { error: { code: "INSIGHTS_FETCH_ERROR", message } },
      { status: 500 }
    );
  }
});
