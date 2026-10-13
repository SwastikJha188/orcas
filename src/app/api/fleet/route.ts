import { NextResponse } from "next/server";
import { getFleetStats } from "@/server/services/industrial-service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await getFleetStats();
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load fleet overview stats";
    return NextResponse.json(
      { error: { code: "FLEET_STATS_ERROR", message } },
      { status: 500 }
    );
  }
}
