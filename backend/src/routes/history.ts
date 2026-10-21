import { Hono } from "hono";
import { accessFail, requestScope } from "@backend/http";
import { requireMachine, scopedRows } from "@backend/services/access-service";
import { createOperatingEvent, getOperatingEvents } from "@backend/services/industrial-service";

/** /api/history */
export const history = new Hono();


history.get("/", async (c) => {
  const request = c.req.raw;
  try {
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get("machineId") || undefined;
    const scope = await requestScope(request);
    requireMachine(scope, machineId);
    const data = scopedRows(scope, await getOperatingEvents(machineId));
    return Response.json({ data });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const message = error instanceof Error ? error.message : "Failed to load operating events";
    return Response.json(
      { error: { code: "HISTORY_FETCH_ERROR", message } },
      { status: 500 }
    );
  }
});

history.post("/", async (c) => {
  const request = c.req.raw;
  try {
    const body = (await request.json()) as {
      machineId: string;
      actorUserId?: string | null;
      type: "Telemetry Alert" | "Maintenance Log" | "Operating Change" | "Inspection";
      severity: "Alert" | "Normal" | "Critical";
      title: string;
      description: string;
      source?: string;
    };
    requireMachine(await requestScope(request), body.machineId);
    const data = await createOperatingEvent(body);
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const message = error instanceof Error ? error.message : "Failed to create operating event";
    return Response.json(
      { error: { code: "HISTORY_CREATE_ERROR", message } },
      { status: 400 }
    );
  }
});
