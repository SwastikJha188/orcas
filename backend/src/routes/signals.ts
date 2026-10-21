import { Hono } from "hono";
import { accessFail, requestScope } from "@backend/http";
import { requireMachine, scopedRows } from "@backend/services/access-service";
import { getMappedSignals } from "@backend/services/industrial-service";

/** /api/signals */
export const signals = new Hono();


signals.get("/", async (c) => {
  const request = c.req.raw;
  try {
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get("machineId") || undefined;
    const scope = await requestScope(request);
    requireMachine(scope, machineId);
    const data = scopedRows(scope, await getMappedSignals(machineId));
    return Response.json({ data });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const message = error instanceof Error ? error.message : "Failed to load mapped signals";
    return Response.json(
      { error: { code: "SIGNALS_FETCH_ERROR", message } },
      { status: 500 }
    );
  }
});
