import { Hono } from "hono";
import { currentUserId, fail, failFrom, isSuperAdmin, ok, requestScope } from "@backend/http";
import { requireMachine, requirePlant, seesMachine } from "@backend/services/access-service";
import { addSimCommand, getSimulation, resetSimulation, updateSimulation } from "@backend/services/simulation-service";

/** /api/simulation */
export const simulation = new Hono();


simulation.get("/", async (c) => {
  const request = c.req.raw;
  try {
    const since = new URL(request.url).searchParams.get("since");
    const plantId = new URL(request.url).searchParams.get("plantId");
    const scope = await requestScope(request);
    requirePlant(scope, plantId);
    // The pages' engines poll this without a plant: other plants' machines and commands are left out.
    const sim = await getSimulation({ plantId, sinceCommand: since ? Number(since) : null });
    return ok({
      ...sim,
      machines: sim.machines.filter((m) => seesMachine(scope, m.machineId)),
      commands: sim.commands.filter((c) => !c.machineId || seesMachine(scope, c.machineId)),
    });
  } catch (error) {
    return failFrom(error, "SIMULATION_FAILED");
  }
});

simulation.put("/", async (c) => {
  const request = c.req.raw;
  if (!(await isSuperAdmin(request))) return fail(403, "FORBIDDEN", "Only the Oswar super administrator controls the simulation.");
  try {
    const body = (await request.json().catch(() => null)) as { settings?: Record<string, unknown>; profiles?: Record<string, string> } | null;
    if (!body || (body.settings === undefined && body.profiles === undefined)) return fail(400, "INVALID_INPUT", "Send { settings } and/or { profiles }");
    const scope = await requestScope(request);
    const machines = body.settings?.machines;
    for (const id of [...Object.keys(body.profiles ?? {}), ...(machines && typeof machines === "object" ? Object.keys(machines) : [])]) requireMachine(scope, id);
    await updateSimulation({ settings: body.settings as never, profiles: body.profiles }, await currentUserId(request));
    return ok(await getSimulation());
  } catch (error) {
    return failFrom(error, "SIMULATION_UPDATE_FAILED");
  }
});

simulation.delete("/", async (c) => {
  const request = c.req.raw;
  if (!(await isSuperAdmin(request))) return fail(403, "FORBIDDEN", "Only the Oswar super administrator controls the simulation.");
  try {
    await resetSimulation(await currentUserId(request));
    return ok(await getSimulation());
  } catch (error) {
    return failFrom(error, "SIMULATION_RESET_FAILED");
  }
});

simulation.post("/commands", async (c) => {
  const request = c.req.raw;
  if (!(await isSuperAdmin(request))) return fail(403, "FORBIDDEN", "Only the Oswar super administrator controls the simulation.");
  try {
    const body = (await request.json().catch(() => null)) as { kind?: string; machineId?: string; faultKind?: string; scenarioId?: string; spec?: unknown } | null;
    if (!body?.kind) return fail(400, "INVALID_INPUT", "Send { kind }");
    requireMachine(await requestScope(request), body.machineId);
    await addSimCommand(
      { kind: body.kind as "raise", machineId: body.machineId ?? null, faultKind: (body.faultKind as "fault" | "sensor" | undefined) ?? null, scenarioId: body.scenarioId ?? null, spec: body.spec },
      await currentUserId(request),
    );
    return ok({ queued: true });
  } catch (error) {
    return failFrom(error, "SIMULATION_COMMAND_FAILED");
  }
});
