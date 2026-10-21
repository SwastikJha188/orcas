import { Hono } from "hono";
import { accessFail, failFrom, ok, requestScope } from "@backend/http";
import { plantFilter, scopedRows } from "@backend/services/access-service";
import { getFleetStats } from "@backend/services/industrial-service";
import { fleetCondition } from "@backend/services/monitoring-service";

/** /api/fleet */
export const fleet = new Hono();


fleet.get("/", async (c) => {
  const request = c.req.raw;
  try {
    const plantId = new URL(request.url).searchParams.get("plantId") || undefined;
    const data = await getFleetStats(plantFilter(await requestScope(request), plantId));
    return Response.json({ data });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const message = error instanceof Error ? error.message : "Failed to load fleet overview stats";
    return Response.json(
      { error: { code: "FLEET_STATS_ERROR", message } },
      { status: 500 }
    );
  }
});

fleet.get("/condition", async (c) => {
  const request = c.req.raw;
  try {
    const scope = await requestScope(request);
    return ok(scopedRows(scope, await fleetCondition(plantFilter(scope, new URL(request.url).searchParams.get("plantId")))));
  } catch (error) {
    return failFrom(error, "FLEET_CONDITION_FAILED");
  }
});
