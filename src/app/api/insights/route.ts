import { NextRequest, NextResponse } from "next/server";
import { getMachineInsights } from "@/server/services/insights-service";
import { accessFail, requestScope } from "@/app/api/_lib/respond";
import { requireMachine } from "@/server/services/access-service";

export const runtime = "nodejs";

/**
 * GET /api/insights?machineId=KLN-01
 * Server-computed prognosis & analysis derived entirely from the PostgreSQL
 * catalog. No client-side hardcoding — the Insights sub-pages only render.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get("machineId");
    if (!machineId) return NextResponse.json({ error: { code: "INVALID_INPUT", message: "machineId is required" } }, { status: 400 });
    requireMachine(await requestScope(request), machineId);
    const data = await getMachineInsights(machineId);
    return NextResponse.json({ data });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const message = error instanceof Error ? error.message : "Failed to compute insights";
    return NextResponse.json(
      { error: { code: "INSIGHTS_FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}
