import { Hono } from "hono";
import { accessFail, requestScope } from "@backend/http";
import { requireMachineParam } from "@backend/services/access-service";
import { getMachineCabinet } from "@backend/services/edge-service";
import { getMachineRackUnits, getRackChassisByMachine } from "@backend/services/industrial-service";

/** /api/rack-units */
export const rackUnits = new Hono();


rackUnits.get("/", async (c) => {
  const request = c.req.raw;
  try {
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get("machineId") || undefined;
    const scope = await requestScope(request);
    requireMachineParam(scope, machineId);
    const registry = machineId ? await getMachineCabinet(machineId) : null;
    if (registry && machineId) {
      const chassis = (await getRackChassisByMachine(machineId)).get(machineId) ?? null;
      return Response.json({ data: registry.map((r) => ({ ...r, chassis })) });
    }
    const data = await getMachineRackUnits(machineId);
    return Response.json({ data });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const message = error instanceof Error ? error.message : "Failed to fetch rack units";
    return Response.json(
      { error: { code: "RACK_UNITS_FETCH_ERROR", message } },
      { status: 500 }
    );
  }
});
