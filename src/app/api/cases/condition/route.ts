import type { NextRequest } from "next/server";
import { currentUserId, fail, failFrom, ok, requestScope } from "@/app/api/_lib/respond";
import { requireMachineRow, singlePlant } from "@/server/services/access-service";
import { acknowledgeAlarm, conditionStrip } from "@/server/services/case-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/cases/condition[?plantId][&machineId] → machine condition and its basis, open alarms, data freshness. */
export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams;
    const plantId = singlePlant(await requestScope(request), p.get("plantId"), p.get("machineId"));
    return ok(await conditionStrip({ plantId, machineId: p.get("machineId") }));
  } catch (error) {
    return failFrom(error, "CONDITION_FAILED");
  }
}

/** POST /api/cases/condition { kind: "system" | "manual", id } → acknowledge an alarm (it stays open until it clears). */
export async function POST(request: NextRequest) {
  const user = await currentUserId(request);
  if (!user) return fail(401, "SIGN_IN", "Sign in to acknowledge an alarm.");
  try {
    const body = ((await request.json().catch(() => null)) as { kind?: string; id?: number }) ?? {};
    if ((body.kind !== "system" && body.kind !== "manual") || !Number.isFinite(Number(body.id))) return fail(400, "INVALID_INPUT", "Send { kind, id }");
    await requireMachineRow(await requestScope(request), body.kind === "system" ? "alarm_events" : "manual_alarms", Number(body.id), "Alarm");
    await acknowledgeAlarm(body.kind, Number(body.id), user);
    return ok({ acknowledged: true });
  } catch (error) {
    return failFrom(error, "ACK_FAILED");
  }
}
