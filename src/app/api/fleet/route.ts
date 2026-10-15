import { NextRequest, NextResponse } from "next/server";
import { getFleetStats } from "@/server/services/industrial-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const plantId = new URL(request.url).searchParams.get("plantId") || undefined;
    const data = await getFleetStats(plantId);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load fleet overview stats";
    return NextResponse.json(
      { error: { code: "FLEET_STATS_ERROR", message } },
      { status: 500 }
    );
  }
}
