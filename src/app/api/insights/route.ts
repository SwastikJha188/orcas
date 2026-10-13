import { NextRequest, NextResponse } from "next/server";
import { getMachineInsights } from "@/server/services/insights-service";

export const runtime = "nodejs";

/**
 * GET /api/insights?machineId=KLN-01
 * Server-computed prognosis & analysis derived entirely from the PostgreSQL
 * catalog. No client-side hardcoding — the Insights sub-pages only render.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get("machineId") || "KLN-01";
    const data = await getMachineInsights(machineId);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to compute insights";
    return NextResponse.json(
      { error: { code: "INSIGHTS_FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}
