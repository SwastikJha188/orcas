import { Hono } from "hono";
import { failFrom, ok, requestScope } from "@backend/http";
import { narrowMachine, singlePlant } from "@backend/services/access-service";
import { getFaultLibrary } from "@backend/services/fault-library-service";

/** /api/fault-library */
export const faultLibrary = new Hono();


faultLibrary.get("/", async (c) => {
  const request = c.req.raw;
  try {
    const p = new URL(request.url).searchParams;
    const scope = await requestScope(request);
    const machineId = narrowMachine(scope, p.get("machineId"));
    const plantId = singlePlant(scope, p.get("plantId"), machineId);
    return ok(await getFaultLibrary({ machineId, plantId }));
  } catch (error) {
    return failFrom(error, "FAULT_LIBRARY_FAILED");
  }
});
