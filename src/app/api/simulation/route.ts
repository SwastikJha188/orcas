import type { NextRequest } from "next/server";
import { canAdminister, currentUserId, fail, failFrom, forbidden, ok, requestScope } from "@/app/api/_lib/respond";
import { requireMachine, requirePlant, seesMachine } from "@/server/services/access-service";
import { getSimulation, resetSimulation, updateSimulation } from "@/server/services/simulation-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/simulation[?plantId=…][&since=commandId] → the live simulation's settings, machine profiles and recent actions. */
export async function GET(request: NextRequest) {
  try {
    const since = request.nextUrl.searchParams.get("since");
    const plantId = request.nextUrl.searchParams.get("plantId");
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
}

/** PUT /api/simulation { settings?, profiles? } → saves them (administrators). */
export async function PUT(request: NextRequest) {
  if (!(await canAdminister(request))) return forbidden();
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
}

/** DELETE /api/simulation → back to the built-in live settings (administrators). */
export async function DELETE(request: NextRequest) {
  if (!(await canAdminister(request))) return forbidden();
  try {
    await resetSimulation(await currentUserId(request));
    return ok(await getSimulation());
  } catch (error) {
    return failFrom(error, "SIMULATION_RESET_FAILED");
  }
}
