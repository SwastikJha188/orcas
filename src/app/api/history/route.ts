import { NextRequest, NextResponse } from "next/server";
import { getOperatingEvents } from "@/server/services/industrial-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get("machineId") || undefined;
    const data = await getOperatingEvents(machineId);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load operating events";
    return NextResponse.json(
      { error: { code: "HISTORY_FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}
