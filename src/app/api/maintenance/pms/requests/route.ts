import { NextRequest, NextResponse } from "next/server";
import { proposeRequest } from "@/server/services/pms-service";
import { currentUser, fail, signedOut } from "../_respond";
import { accessFail, requestScope } from "@/app/api/_lib/respond";
import { requireMachine } from "@/server/services/access-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/maintenance/pms/requests { machineId, ruleId?, title, component, priority, notes } → the request (existing one for a repeated finding). */
export async function POST(request: NextRequest) {
  try {
    const userId = await currentUser(request);
    if (!userId) return signedOut();
    const body = (await request.json()) as Record<string, unknown>;
    requireMachine(await requestScope(request), typeof body.machineId === "string" ? body.machineId : null);
    return NextResponse.json({ data: await proposeRequest(body, userId) }, { status: 201 });
  } catch (error) {
    return accessFail(error) ?? fail(error, "PMS_REQUEST_ERROR", "Failed to propose the request");
  }
}
