import { Hono } from "hono";
import { currentUserId, fail, failFrom, numParam, ok, requestScope, timeParam } from "@backend/http";
import { narrowMachine, singlePlant } from "@backend/services/access-service";
import { acknowledgeFinding, addInvestigationEntry, listFindings } from "@backend/services/monitoring-service";

/** /api/findings */
export const findings = new Hono();


findings.get("/", async (c) => {
  const request = c.req.raw;
  try {
    const p = new URL(request.url).searchParams;
    const status = (p.get("status") ?? "open") as "open" | "cleared" | "all";
    if (!["open", "cleared", "all"].includes(status)) return fail(400, "INVALID_INPUT", "status must be open, cleared or all");
    const scope = await requestScope(request);
    const machineId = narrowMachine(scope, p.get("machineId")) ?? undefined;
    const plantId = singlePlant(scope, p.get("plantId"), machineId) ?? undefined;
    return ok(
      await listFindings({
        machineId,
        plantId,
        status,
        since: timeParam(request, "since"),
        limit: numParam(request, "limit", 200),
      }),
    );
  } catch (error) {
    return failFrom(error, "FINDINGS_FAILED");
  }
});

findings.post("/:id/acknowledge", async (c) => {
  const request = c.req.raw;
  try {
    const id = Number(c.req.param().id);
    if (!Number.isInteger(id)) return fail(400, "INVALID_INPUT", "Finding id must be a number");
    const body = (await request.json().catch(() => ({}))) as { note?: string };
    return ok(await acknowledgeFinding(id, await currentUserId(request), body.note?.trim() || null));
  } catch (error) {
    return failFrom(error, "ACK_FAILED");
  }
});

findings.post("/:id/entries", async (c) => {
  const request = c.req.raw;
  try {
    const id = Number(c.req.param().id);
    if (!Number.isInteger(id)) return fail(400, "INVALID_INPUT", "Finding id must be a number");
    const body = (await request.json().catch(() => null)) as Parameters<typeof addInvestigationEntry>[1] | null;
    if (!body) return fail(400, "INVALID_INPUT", "Send a JSON object");
    return ok(await addInvestigationEntry(id, body, await currentUserId(request)));
  } catch (error) {
    return failFrom(error, "INVESTIGATION_FAILED");
  }
});
