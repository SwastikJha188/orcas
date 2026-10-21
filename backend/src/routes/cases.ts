import { Hono } from "hono";
import { currentUserId, fail, failFrom, ok, requestScope } from "@backend/http";
import { narrowMachine, requireCase, requireMachine, requireMachineRow, singlePlant } from "@backend/services/access-service";
import { acknowledgeAlarm, addCause, addCheck, addFile, addManualAlarm, addRequest, caseVocabulary, closeCase, conditionStrip, createCase, finishCheck, getCase, getFile, importSeries, listCases, listGuides, listRequests, removeCause, removeFile, reopenCase, updateCase, verifyRecovery } from "@backend/services/case-service";

/** /api/cases */
export const cases = new Hono();


cases.get("/", async (c) => {
  const request = c.req.raw;
  try {
    const p = new URL(request.url).searchParams;
    const scope = await requestScope(request);
    const machineId = narrowMachine(scope, p.get("machineId"));
    const plantId = singlePlant(scope, p.get("plantId"), machineId);
    return ok(await listCases({ plantId, machineId, ruleCode: p.get("ruleCode") }));
  } catch (error) {
    return failFrom(error, "CASES_FAILED");
  }
});

cases.post("/", async (c) => {
  const request = c.req.raw;
  const user = await currentUserId(request);
  if (!user) return fail(401, "SIGN_IN", "Sign in to start a case.");
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return fail(400, "INVALID_INPUT", "Send the case as JSON");
    requireMachine(await requestScope(request), typeof body.machineId === "string" ? body.machineId : null);
    return ok({ id: await createCase(body, user) });
  } catch (error) {
    return failFrom(error, "CASE_CREATE_FAILED");
  }
});

cases.post("/alarms", async (c) => {
  const request = c.req.raw;
  const user = await currentUserId(request);
  if (!user) return fail(401, "SIGN_IN", "Sign in to record an alarm.");
  try {
    const body = ((await request.json().catch(() => null)) as Record<string, unknown>) ?? {};
    const scope = await requestScope(request);
    requireMachine(scope, typeof body.machineId === "string" ? body.machineId : null);
    if (body.caseId !== undefined && body.caseId !== null) await requireCase(scope, Number(body.caseId));
    await addManualAlarm(body, user);
    return ok({ recorded: true });
  } catch (error) {
    return failFrom(error, "ALARM_FAILED");
  }
});

cases.get("/condition", async (c) => {
  const request = c.req.raw;
  try {
    const p = new URL(request.url).searchParams;
    const scope = await requestScope(request);
    const machineId = narrowMachine(scope, p.get("machineId"));
    const plantId = singlePlant(scope, p.get("plantId"), machineId);
    return ok(await conditionStrip({ plantId, machineId }));
  } catch (error) {
    return failFrom(error, "CONDITION_FAILED");
  }
});

cases.post("/condition", async (c) => {
  const request = c.req.raw;
  const user = await currentUserId(request);
  if (!user) return fail(401, "SIGN_IN", "Sign in to acknowledge an alarm.");
  try {
    const body = ((await request.json().catch(() => null)) as { kind?: string; id?: number }) ?? {};
    if ((body.kind !== "system" && body.kind !== "manual") || !Number.isFinite(Number(body.id))) return fail(400, "INVALID_INPUT", "Send { kind, id }");
    await requireMachineRow(await requestScope(request), body.kind === "system" ? "findings" : "manual_alarms", Number(body.id), "Alarm");
    await acknowledgeAlarm(body.kind, Number(body.id), user);
    return ok({ acknowledged: true });
  } catch (error) {
    return failFrom(error, "ACK_FAILED");
  }
});

cases.get("/guides", async (c) => {
  const request = c.req.raw;
  try {
    const p = new URL(request.url).searchParams;
    const scope = await requestScope(request);
    const machineId = narrowMachine(scope, p.get("machineId"));
    const plantId = singlePlant(scope, p.get("plantId"), machineId);
    return ok(await listGuides({ plantId, machineId }));
  } catch (error) {
    return failFrom(error, "GUIDES_FAILED");
  }
});

cases.get("/requests", async (c) => {
  const request = c.req.raw;
  try {
    return ok(await listRequests({ plantId: singlePlant(await requestScope(request), new URL(request.url).searchParams.get("plantId")) }));
  } catch (error) {
    return failFrom(error, "REQUESTS_FAILED");
  }
});

cases.get("/vocabulary", async () => {
  return ok(caseVocabulary());
});

cases.get("/:id", async (c) => {
  const request = c.req.raw;
  try {
    await requireCase(await requestScope(request), Number(c.req.param().id));
    return ok(await getCase(Number(c.req.param().id)));
  } catch (error) {
    return failFrom(error, "CASE_FAILED");
  }
});

cases.patch("/:id", async (c) => {
  const request = c.req.raw;
  const user = await currentUserId(request);
  if (!user) return fail(401, "SIGN_IN", "Sign in to change a case.");
  try {
    const id = Number(c.req.param().id);
    await requireCase(await requestScope(request), id);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return fail(400, "INVALID_INPUT", "Send the changes as JSON");
    await updateCase(id, body, user);
    return ok(await getCase(id));
  } catch (error) {
    return failFrom(error, "CASE_UPDATE_FAILED");
  }
});

cases.post("/:id/actions", async (c) => {
  const request = c.req.raw;
  const user = await currentUserId(request);
  if (!user) return fail(401, "SIGN_IN", "Sign in to change a case.");
  try {
    const id = Number(c.req.param().id);
    await requireCase(await requestScope(request), id);
    const body = ((await request.json().catch(() => null)) as Record<string, unknown>) ?? {};
    if (body.action === "verify") await verifyRecovery(id, body, user);
    else if (body.action === "close") await closeCase(id, body, user);
    else if (body.action === "reopen") await reopenCase(id, user);
    else return fail(400, "INVALID_INPUT", 'action must be "verify", "close" or "reopen"');
    return ok(await getCase(id));
  } catch (error) {
    return failFrom(error, "CASE_ACTION_FAILED");
  }
});

cases.post("/:id/causes", async (c) => {
  const request = c.req.raw;
  const user = await currentUserId(request);
  if (!user) return fail(401, "SIGN_IN", "Sign in to change a case.");
  try {
    const id = Number(c.req.param().id);
    await requireCase(await requestScope(request), id);
    await addCause(id, ((await request.json().catch(() => null)) as Record<string, unknown>) ?? {}, user);
    return ok(await getCase(id));
  } catch (error) {
    return failFrom(error, "CAUSE_FAILED");
  }
});

cases.delete("/:id/causes", async (c) => {
  const request = c.req.raw;
  const user = await currentUserId(request);
  if (!user) return fail(401, "SIGN_IN", "Sign in to change a case.");
  try {
    const id = Number(c.req.param().id);
    await requireCase(await requestScope(request), id);
    await removeCause(id, Number(new URL(request.url).searchParams.get("causeId")), user);
    return ok(await getCase(id));
  } catch (error) {
    return failFrom(error, "CAUSE_FAILED");
  }
});

cases.post("/:id/checks", async (c) => {
  const request = c.req.raw;
  const user = await currentUserId(request);
  if (!user) return fail(401, "SIGN_IN", "Sign in to change a case.");
  try {
    const id = Number(c.req.param().id);
    await requireCase(await requestScope(request), id);
    await addCheck(id, ((await request.json().catch(() => null)) as Record<string, unknown>) ?? {}, user);
    return ok(await getCase(id));
  } catch (error) {
    return failFrom(error, "CHECK_FAILED");
  }
});

cases.patch("/:id/checks", async (c) => {
  const request = c.req.raw;
  const user = await currentUserId(request);
  if (!user) return fail(401, "SIGN_IN", "Sign in to change a case.");
  try {
    const id = Number(c.req.param().id);
    await requireCase(await requestScope(request), id);
    const body = ((await request.json().catch(() => null)) as Record<string, unknown>) ?? {};
    await finishCheck(id, Number(body.checkId), body, user);
    return ok(await getCase(id));
  } catch (error) {
    return failFrom(error, "CHECK_FAILED");
  }
});

cases.get("/:id/export", async (c) => {
  const request = c.req.raw;
  try {
    await requireCase(await requestScope(request), Number(c.req.param().id));
    const detail = await getCase(Number(c.req.param().id));
    const { readings, ...rest } = detail;
    const body = JSON.stringify({ ...rest, readings: readings.map(({ history, ...r }) => ({ ...r, readingsInLast24h: history.length })) }, null, 2);
    return new Response(body, { headers: { "content-type": "application/json", "content-disposition": `attachment; filename="case-${detail.id}.json"` } });
  } catch (error) {
    return failFrom(error, "CASE_EXPORT_FAILED");
  }
});

cases.get("/:id/files", async (c) => {
  const request = c.req.raw;
  try {
    await requireCase(await requestScope(request), Number(c.req.param().id));
    const f = await getFile(Number(c.req.param().id), Number(new URL(request.url).searchParams.get("fileId")));
    return new Response(new Uint8Array(f.data), {
      headers: { "content-type": f.type, "content-disposition": `attachment; filename="${encodeURIComponent(f.name)}"; filename*=UTF-8''${encodeURIComponent(f.name)}` },
    });
  } catch (error) {
    return failFrom(error, "FILE_FAILED");
  }
});

cases.post("/:id/files", async (c) => {
  const request = c.req.raw;
  const user = await currentUserId(request);
  if (!user) return fail(401, "SIGN_IN", "Sign in to change a case.");
  try {
    const id = Number(c.req.param().id);
    await requireCase(await requestScope(request), id);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return fail(400, "INVALID_INPUT", "Choose a file");
    await addFile(id, { name: file.name, type: file.type, data: Buffer.from(await file.arrayBuffer()) }, user);
    return ok(await getCase(id));
  } catch (error) {
    return failFrom(error, "FILE_FAILED");
  }
});

cases.delete("/:id/files", async (c) => {
  const request = c.req.raw;
  const user = await currentUserId(request);
  if (!user) return fail(401, "SIGN_IN", "Sign in to change a case.");
  try {
    const id = Number(c.req.param().id);
    await requireCase(await requestScope(request), id);
    await removeFile(id, Number(new URL(request.url).searchParams.get("fileId")), user);
    return ok(await getCase(id));
  } catch (error) {
    return failFrom(error, "FILE_FAILED");
  }
});

cases.post("/:id/requests", async (c) => {
  const request = c.req.raw;
  const user = await currentUserId(request);
  if (!user) return fail(401, "SIGN_IN", "Sign in to change a case.");
  try {
    const id = Number(c.req.param().id);
    await requireCase(await requestScope(request), id);
    await addRequest(id, ((await request.json().catch(() => null)) as Record<string, unknown>) ?? {}, user);
    return ok(await getCase(id));
  } catch (error) {
    return failFrom(error, "REQUEST_FAILED");
  }
});

cases.post("/:id/series", async (c) => {
  const request = c.req.raw;
  const user = await currentUserId(request);
  if (!user) return fail(401, "SIGN_IN", "Sign in to change a case.");
  try {
    const id = Number(c.req.param().id);
    await requireCase(await requestScope(request), id);
    await importSeries(id, ((await request.json().catch(() => null)) as Record<string, unknown>) ?? {}, user);
    return ok(await getCase(id));
  } catch (error) {
    return failFrom(error, "SERIES_FAILED");
  }
});
