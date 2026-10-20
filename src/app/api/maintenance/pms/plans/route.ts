import { NextRequest, NextResponse } from "next/server";
import { setPlanState } from "@/server/services/pms-service";
import { currentUser, fail, signedOut } from "../_respond";
import { accessFail, requestScope } from "@/app/api/_lib/respond";
import { requireMachine } from "@/server/services/access-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/maintenance/pms/plans { machineId, planId, state, reason? } → the plan in its new state. */
export async function POST(request: NextRequest) {
  try {
    const userId = await currentUser(request);
    if (!userId) return signedOut();
    const body = (await request.json()) as Record<string, unknown>;
    requireMachine(await requestScope(request), typeof body.machineId === "string" ? body.machineId : null);
    return NextResponse.json({ data: await setPlanState(body, userId) });
  } catch (error) {
    return accessFail(error) ?? fail(error, "PMS_PLAN_ERROR", "Failed to change the plan");
  }
}
