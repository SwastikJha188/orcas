import { Hono } from "hono";
import { currentUser, fail as pmsFail, signedOut as pmsSignedOut } from "./maintenance-pms-respond";
import { accessFail, failFrom, ok, readCookie, requestScope } from "@backend/http";
import { requireMachine, requireMachineRow } from "@backend/services/access-service";
import { SESSION_COOKIE, sessionUser } from "@backend/services/auth-service";
import { MaintenanceInputError, addChecklistItem, getChecklist, getVocabulary, recordInspection, removeChecklistItem, restoreChecklistItem, undoInspection } from "@backend/services/maintenance-service";
import { alertCheckMachine, listAlertChecks, listServiceParts, listTrendLives, maintenanceMachinesIn, recordAlertCheck, replaceServicePart, servicePartMachine } from "@backend/services/maintenance-types-service";
import { getPms, getPmsLine, proposeRequest, setPlanState, transitionWorkOrder, updateWorkOrderDetails } from "@backend/services/pms-service";

/** /api/maintenance */
export const maintenance = new Hono();

function fail(error: unknown, code: string, fallback: string) {
  const bad = error instanceof MaintenanceInputError;
  const message = error instanceof Error ? error.message : fallback;
  return Response.json({ error: { code: bad ? "INVALID_INPUT" : code, message } }, { status: bad ? 400 : 500 });
}

const signedOut = () => Response.json({ error: { code: "NOT_SIGNED_IN", message: "Sign in to edit the checklist." } }, { status: 401 });
maintenance.get("/", async (c) => {
  const request = c.req.raw;
  try {
    const sp = new URL(request.url).searchParams;
    const machineId = sp.get("machineId");
    if (!machineId) throw new MaintenanceInputError("machineId is required");
    requireMachine(await requestScope(request), machineId);
    return Response.json({ data: await getChecklist(machineId, sp.get("kind")) });
  } catch (error) {
    return accessFail(error) ?? fail(error, "MAINTENANCE_ERROR", "Failed to load the maintenance checklist");
  }
});

maintenance.post("/", async (c) => {
  const request = c.req.raw;
  try {
    const userId = await sessionUser(readCookie(request, SESSION_COOKIE));
    if (!userId) return Response.json({ error: { code: "NOT_SIGNED_IN", message: "Sign in to record inspections." } }, { status: 401 });
    const body = (await request.json()) as Record<string, unknown>;
    requireMachine(await requestScope(request), typeof body.machineId === "string" ? body.machineId : null);
    return Response.json({ data: await recordInspection(body, userId) }, { status: 201 });
  } catch (error) {
    return accessFail(error) ?? fail(error, "MAINTENANCE_RECORD_ERROR", "Failed to record the inspection");
  }
});

maintenance.delete("/", async (c) => {
  const request = c.req.raw;
  try {
    const userId = await sessionUser(readCookie(request, SESSION_COOKIE));
    if (!userId) return Response.json({ error: { code: "NOT_SIGNED_IN", message: "Sign in to change inspections." } }, { status: 401 });
    const recordId = Number(new URL(request.url).searchParams.get("recordId"));
    await requireMachineRow(await requestScope(request), "maintenance_records", recordId, "Result");
    await undoInspection(recordId);
    return Response.json({ data: { ok: true } });
  } catch (error) {
    return accessFail(error) ?? fail(error, "MAINTENANCE_UNDO_ERROR", "Failed to take back the result");
  }
});

maintenance.get("/alert-checks", async (c) => {
  const request = c.req.raw;
  try {
    const machines = await maintenanceMachinesIn(await requestScope(request));
    return Response.json({ data: await listAlertChecks(machines) });
  } catch (error) {
    return accessFail(error) ?? pmsFail(error, "ALERT_CHECKS_ERROR", "Failed to load the checks");
  }
});

maintenance.post("/items", async (c) => {
  const request = c.req.raw;
  try {
    const userId = await sessionUser(readCookie(request, SESSION_COOKIE));
    if (!userId) return signedOut();
    const body = (await request.json()) as Record<string, unknown>;
    requireMachine(await requestScope(request), typeof body.machineId === "string" ? body.machineId : null);
    return Response.json({ data: await addChecklistItem(body, userId) }, { status: 201 });
  } catch (error) {
    return accessFail(error) ?? fail(error, "MAINTENANCE_ITEM_ERROR", "Failed to add the item");
  }
});

maintenance.delete("/items", async (c) => {
  const request = c.req.raw;
  try {
    const userId = await sessionUser(readCookie(request, SESSION_COOKIE));
    if (!userId) return signedOut();
    const sp = new URL(request.url).searchParams;
    requireMachine(await requestScope(request), sp.get("machineId"));
    await removeChecklistItem({ machineId: sp.get("machineId"), kind: sp.get("kind"), taskId: sp.get("taskId") }, userId);
    return Response.json({ data: { ok: true } });
  } catch (error) {
    return accessFail(error) ?? fail(error, "MAINTENANCE_ITEM_ERROR", "Failed to remove the item");
  }
});

maintenance.get("/parts", async (c) => {
  const request = c.req.raw;
  try {
    const machines = await maintenanceMachinesIn(await requestScope(request));
    return Response.json({ data: await listServiceParts(machines) });
  } catch (error) {
    return accessFail(error) ?? pmsFail(error, "PARTS_ERROR", "Failed to load the parts");
  }
});

maintenance.get("/pms", async (c) => {
  const request = c.req.raw;
  try {
    const machineId = new URL(request.url).searchParams.get("machineId") ?? "";
    requireMachine(await requestScope(request), machineId);
    return Response.json({ data: await getPms(machineId, await currentUser(request)) });
  } catch (error) {
    return accessFail(error) ?? pmsFail(error, "PMS_ERROR", "Failed to load planned maintenance");
  }
});

maintenance.get("/remaining-life", async (c) => {
  const request = c.req.raw;
  try {
    const machines = await maintenanceMachinesIn(await requestScope(request));
    return Response.json({ data: await listTrendLives(machines) });
  } catch (error) {
    return accessFail(error) ?? pmsFail(error, "REMAINING_LIFE_ERROR", "Failed to load the remaining life");
  }
});

maintenance.get("/vocabulary", async () => {
  try {
    return ok(await getVocabulary());
  } catch (error) {
    return failFrom(error, "MAINTENANCE_VOCABULARY_FAILED");
  }
});

maintenance.post("/items/restore", async (c) => {
  const request = c.req.raw;
  try {
    const userId = await sessionUser(readCookie(request, SESSION_COOKIE));
    if (!userId) return Response.json({ error: { code: "NOT_SIGNED_IN", message: "Sign in to edit the checklist." } }, { status: 401 });
    const body = (await request.json()) as Record<string, unknown>;
    requireMachine(await requestScope(request), typeof body.machineId === "string" ? body.machineId : null);
    await restoreChecklistItem(body);
    return Response.json({ data: { ok: true } });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const bad = error instanceof MaintenanceInputError;
    const message = error instanceof Error ? error.message : "Failed to restore the item";
    return Response.json({ error: { code: bad ? "INVALID_INPUT" : "MAINTENANCE_ITEM_ERROR", message } }, { status: bad ? 400 : 500 });
  }
});

maintenance.get("/pms/line", async (c) => {
  const request = c.req.raw;
  try {
    return Response.json({ data: await getPmsLine(await currentUser(request)) });
  } catch (error) {
    return pmsFail(error, "PMS_ERROR", "Failed to load planned maintenance");
  }
});

maintenance.post("/pms/plans", async (c) => {
  const request = c.req.raw;
  try {
    const userId = await currentUser(request);
    if (!userId) return pmsSignedOut();
    const body = (await request.json()) as Record<string, unknown>;
    requireMachine(await requestScope(request), typeof body.machineId === "string" ? body.machineId : null);
    return Response.json({ data: await setPlanState(body, userId) });
  } catch (error) {
    return accessFail(error) ?? pmsFail(error, "PMS_PLAN_ERROR", "Failed to change the plan");
  }
});

maintenance.post("/pms/requests", async (c) => {
  const request = c.req.raw;
  try {
    const userId = await currentUser(request);
    if (!userId) return pmsSignedOut();
    const body = (await request.json()) as Record<string, unknown>;
    requireMachine(await requestScope(request), typeof body.machineId === "string" ? body.machineId : null);
    return Response.json({ data: await proposeRequest(body, userId) }, { status: 201 });
  } catch (error) {
    return accessFail(error) ?? pmsFail(error, "PMS_REQUEST_ERROR", "Failed to propose the request");
  }
});

maintenance.post("/pms/work-orders/:id", async (c) => {
  const request = c.req.raw;
  try {
    const userId = await currentUser(request);
    if (!userId) return pmsSignedOut();
    const { id } = c.req.param();
    await requireMachineRow(await requestScope(request), "work_orders", Number(id), "Work order");
    const body = (await request.json()) as Record<string, unknown>;
    return Response.json({ data: await transitionWorkOrder(Number(id), body, userId) });
  } catch (error) {
    return accessFail(error) ?? pmsFail(error, "PMS_TRANSITION_ERROR", "Failed to change the work order");
  }
});

maintenance.patch("/pms/work-orders/:id", async (c) => {
  const request = c.req.raw;
  try {
    const userId = await currentUser(request);
    if (!userId) return pmsSignedOut();
    const { id } = c.req.param();
    await requireMachineRow(await requestScope(request), "work_orders", Number(id), "Work order");
    const body = (await request.json()) as Record<string, unknown>;
    return Response.json({ data: await updateWorkOrderDetails(Number(id), body, userId) });
  } catch (error) {
    return accessFail(error) ?? pmsFail(error, "PMS_UPDATE_ERROR", "Failed to update the work order");
  }
});

maintenance.post("/alert-checks/:id", async (c) => {
  const request = c.req.raw;
  try {
    const userId = await currentUser(request);
    if (!userId) return pmsSignedOut();
    const id = Number(c.req.param().id);
    requireMachine(await requestScope(request), await alertCheckMachine(id));
    const body = (await request.json()) as Record<string, unknown>;
    return Response.json({ data: await recordAlertCheck(id, body, userId) });
  } catch (error) {
    return accessFail(error) ?? pmsFail(error, "ALERT_CHECK_ERROR", "Failed to record the check");
  }
});

maintenance.post("/parts/:id/replace", async (c) => {
  const request = c.req.raw;
  try {
    const userId = await currentUser(request);
    if (!userId) return pmsSignedOut();
    const { id } = c.req.param();
    requireMachine(await requestScope(request), await servicePartMachine(id));
    const body = (await request.json()) as Record<string, unknown>;
    await replaceServicePart(id, body, userId);
    return Response.json({ data: { id } });
  } catch (error) {
    return accessFail(error) ?? pmsFail(error, "PART_REPLACE_ERROR", "Failed to record the replacement");
  }
});
