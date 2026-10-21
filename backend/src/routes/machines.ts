import { Hono } from "hono";
import { accessFail, currentUserId, fail, failFrom, numParam, ok, requestScope, timeParam } from "@backend/http";
import { setting } from "@backend/monitoring/settings";
import { plantFilter, requireMachine, requirePlant, scopedById } from "@backend/services/access-service";
import { CreateMachineInput, HierarchyError, createMachineRecord, deleteMachineRecord, getMachineById, getMachines, updateMachineRecord, type UpdateMachineInput } from "@backend/services/industrial-service";
import { createEvent, deriveReferenceSet, listEvents, listOperatingStates, listReferenceSets, machineCondition, machineHealthHistory } from "@backend/services/monitoring-service";
import { machineVerdicts, setMachineVerdict } from "@backend/services/verdict-service";

/** /api/machines */
export const machines = new Hono();


machines.get("/", async (c) => {
  const request = c.req.raw;
  try {
    const plantId = new URL(request.url).searchParams.get("plantId") || undefined;
    const scope = await requestScope(request);
    const plants = plantFilter(scope, plantId);
    const data = scopedById(scope, (await getMachines(plantId)).filter((m) => !plants || (m.plantId && plants.includes(m.plantId))));
    return Response.json({ data });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const message = error instanceof Error ? error.message : "Failed to load machines";
    return Response.json(
      { error: { code: "MACHINES_FETCH_ERROR", message } },
      { status: 500 }
    );
  }
});

machines.post("/", async (c) => {
  const request = c.req.raw;
  try {
    const body = (await request.json()) as CreateMachineInput;
    requirePlant(await requestScope(request), body.plantId);
    const data = await createMachineRecord(body);
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const message = error instanceof Error ? error.message : "Failed to create machine";
    return Response.json(
      { error: { code: "MACHINE_CREATE_ERROR", message } },
      { status: 400 }
    );
  }
});

machines.delete("/", async (c) => {
  const request = c.req.raw;
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return Response.json(
        { error: { code: "INVALID_INPUT", message: "Machine id query param is required" } },
        { status: 400 }
      );
    }
    requireMachine(await requestScope(request), id);
    await deleteMachineRecord(id);
    return Response.json({ data: { id, deleted: true } });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const message = error instanceof Error ? error.message : "Failed to delete machine";
    return Response.json(
      { error: { code: "MACHINE_DELETE_ERROR", message } },
      { status: 400 }
    );
  }
});

machines.get("/:id", async (c) => {
  const request = c.req.raw;
  try {
    const { id } = c.req.param();
    requireMachine(await requestScope(request), id);
    const data = await getMachineById(id);
    if (!data) {
      return Response.json(
        { error: { code: "MACHINE_NOT_FOUND", message: `Machine ${id} not found` } },
        { status: 404 }
      );
    }
    return Response.json({ data });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const message = error instanceof Error ? error.message : "Failed to load machine detail";
    return Response.json(
      { error: { code: "MACHINE_DETAIL_ERROR", message } },
      { status: 500 }
    );
  }
});

machines.patch("/:id", async (c) => {
  const request = c.req.raw;
  try {
    const { id } = c.req.param();
    requireMachine(await requestScope(request), id);
    const body = (await request.json().catch(() => null)) as UpdateMachineInput | null;
    if (!body || typeof body !== "object") {
      return Response.json({ error: { code: "INVALID_INPUT", message: "Send { name?, areaId?, criticality? } as JSON" } }, { status: 400 });
    }
    const data = await updateMachineRecord(id, { name: body.name, areaId: body.areaId, criticality: body.criticality });
    return Response.json({ data });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    if (error instanceof HierarchyError) return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status });
    const message = error instanceof Error ? error.message : "Failed to update the machine";
    return Response.json({ error: { code: "MACHINE_UPDATE_ERROR", message } }, { status: 500 });
  }
});

machines.get("/:id/condition", async (c) => {
  const request = c.req.raw;
  try {
    requireMachine(await requestScope(request), decodeURIComponent(c.req.param().id));
    return ok(await machineCondition(decodeURIComponent(c.req.param().id)));
  } catch (error) {
    return failFrom(error, "CONDITION_FAILED");
  }
});

machines.get("/:id/events", async (c) => {
  const request = c.req.raw;
  try {
    requireMachine(await requestScope(request), decodeURIComponent(c.req.param().id));
    return ok(await listEvents({ machineId: decodeURIComponent(c.req.param().id), from: timeParam(request, "from"), limit: numParam(request, "limit", 200) }));
  } catch (error) {
    return failFrom(error, "EVENTS_FAILED");
  }
});

machines.post("/:id/events", async (c) => {
  const request = c.req.raw;
  try {
    const body = (await request.json().catch(() => null)) as Parameters<typeof createEvent>[1] | null;
    if (!body) return fail(400, "INVALID_INPUT", "Send a JSON object");
    requireMachine(await requestScope(request), decodeURIComponent(c.req.param().id));
    return ok(await createEvent(decodeURIComponent(c.req.param().id), body, await currentUserId(request)), { status: 201 });
  } catch (error) {
    return failFrom(error, "EVENT_CREATE_FAILED");
  }
});

machines.get("/:id/health-scores", async (c) => {
  const request = c.req.raw;
  try {
    requireMachine(await requestScope(request), decodeURIComponent(c.req.param().id));
    const from = timeParam(request, "from") ?? new Date(Date.now() - (await setting("health.sample_keep_h")) * 3_600_000);
    return ok(await machineHealthHistory(decodeURIComponent(c.req.param().id), from));
  } catch (error) {
    return failFrom(error, "HEALTH_HISTORY_FAILED");
  }
});

machines.get("/:id/operating-states", async (c) => {
  const request = c.req.raw;
  try {
    requireMachine(await requestScope(request), decodeURIComponent(c.req.param().id));
    return ok(await listOperatingStates(decodeURIComponent(c.req.param().id)));
  } catch (error) {
    return failFrom(error, "OPERATING_STATES_FAILED");
  }
});

machines.get("/:id/references", async (c) => {
  const request = c.req.raw;
  try {
    requireMachine(await requestScope(request), decodeURIComponent(c.req.param().id));
    return ok(await listReferenceSets(decodeURIComponent(c.req.param().id)));
  } catch (error) {
    return failFrom(error, "REFERENCES_FAILED");
  }
});

machines.post("/:id/references", async (c) => {
  const request = c.req.raw;
  try {
    const body = (await request.json().catch(() => null)) as Parameters<typeof deriveReferenceSet>[1] | null;
    if (!body) return fail(400, "INVALID_INPUT", "Send a JSON object");
    requireMachine(await requestScope(request), decodeURIComponent(c.req.param().id));
    return ok(await deriveReferenceSet(decodeURIComponent(c.req.param().id), body, await currentUserId(request)), { status: 201 });
  } catch (error) {
    return failFrom(error, "REFERENCE_DERIVE_FAILED");
  }
});

machines.get("/:id/verdicts", async (c) => {
  const request = c.req.raw;
  try {
    const machineId = decodeURIComponent(c.req.param().id);
    requireMachine(await requestScope(request), machineId);
    return ok(await machineVerdicts(machineId));
  } catch (error) {
    return failFrom(error, "VERDICTS_FAILED");
  }
});

machines.post("/:id/verdicts", async (c) => {
  const request = c.req.raw;
  const user = await currentUserId(request);
  if (!user) return fail(401, "SIGN_IN", "Sign in to answer.");
  try {
    const machineId = decodeURIComponent(c.req.param().id);
    requireMachine(await requestScope(request), machineId);
    const body = (await request.json().catch(() => null)) as { ruleCode?: string; kind?: string | null } | null;
    if (!body) return fail(400, "INVALID_INPUT", "Send { ruleCode, kind }");
    return ok(await setMachineVerdict(machineId, body, user));
  } catch (error) {
    return failFrom(error, "VERDICT_FAILED");
  }
});
