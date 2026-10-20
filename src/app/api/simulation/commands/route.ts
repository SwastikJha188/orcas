import type { NextRequest } from "next/server";
import { canAdminister, currentUserId, fail, failFrom, forbidden, ok, requestScope } from "@/app/api/_lib/respond";
import { requireMachine } from "@/server/services/access-service";
import { addSimCommand } from "@/server/services/simulation-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/simulation/commands { kind: "raise" | "inject" | "signal" | "clear", machineId?, faultKind?, scenarioId?, spec? } (administrators). */
export async function POST(request: NextRequest) {
  if (!(await canAdminister(request))) return forbidden();
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
}
