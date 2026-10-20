import { NextRequest, NextResponse } from "next/server";
import { getFleetStats } from "@/server/services/industrial-service";
import { accessFail, requestScope } from "@/app/api/_lib/respond";
import { plantFilter } from "@/server/services/access-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const plantId = new URL(request.url).searchParams.get("plantId") || undefined;
    const data = await getFleetStats(plantFilter(await requestScope(request), plantId));
    return NextResponse.json({ data });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const message = error instanceof Error ? error.message : "Failed to load fleet overview stats";
    return NextResponse.json(
      { error: { code: "FLEET_STATS_ERROR", message } },
      { status: 500 }
    );
  }
}
