import { NextRequest, NextResponse } from "next/server";
import { getPms } from "@/server/services/pms-service";
import { accessFail, requestScope } from "@/app/api/_lib/respond";
import { requireMachine } from "@/server/services/access-service";
import { currentUser, fail } from "./_respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/maintenance/pms?machineId= → plans, work orders, results and audit trail. */
export async function GET(request: NextRequest) {
  try {
    const machineId = request.nextUrl.searchParams.get("machineId") ?? "";
    requireMachine(await requestScope(request), machineId);
    return NextResponse.json({ data: await getPms(machineId, await currentUser(request)) });
  } catch (error) {
    return accessFail(error) ?? fail(error, "PMS_ERROR", "Failed to load planned maintenance");
  }
}
