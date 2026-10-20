import { NextRequest, NextResponse } from "next/server";
import { listAlertChecks, maintenanceMachinesIn } from "@/server/services/maintenance-types-service";
import { accessFail, requestScope } from "@/app/api/_lib/respond";
import { fail } from "../pms/_respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/maintenance/alert-checks → the "go and check" tasks alarms raised (open, and the last 30 days). */
export async function GET(request: NextRequest) {
  try {
    const machines = await maintenanceMachinesIn(await requestScope(request));
    return NextResponse.json({ data: await listAlertChecks(machines) });
  } catch (error) {
    return accessFail(error) ?? fail(error, "ALERT_CHECKS_ERROR", "Failed to load the checks");
  }
}
