import { NextRequest, NextResponse } from "next/server";
import { setPlanState } from "@/server/services/pms-service";
import { currentUser, fail, signedOut } from "../_respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/maintenance/pms/plans { machineId, planId, state, reason? } → the plan in its new state. */
export async function POST(request: NextRequest) {
  try {
    const userId = await currentUser(request);
    if (!userId) return signedOut();
    const body = (await request.json()) as Record<string, unknown>;
    return NextResponse.json({ data: await setPlanState(body, userId) });
  } catch (error) {
    return fail(error, "PMS_PLAN_ERROR", "Failed to change the plan");
  }
}
