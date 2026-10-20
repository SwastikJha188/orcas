import type { NextRequest } from "next/server";
import { currentUserId, fail, failFrom, ok, requestScope } from "@/app/api/_lib/respond";
import { requireCase, requireMachine } from "@/server/services/access-service";
import { addManualAlarm } from "@/server/services/case-service";

export const runtime = "nodejs";

/** POST /api/cases/alarms { machineId, caseId?, title, severity, location, observedValue?, limitText?, observedAt, source } → record an alarm seen by hand. */
export async function POST(request: NextRequest) {
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
}
