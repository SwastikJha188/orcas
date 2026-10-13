import { NextRequest, NextResponse } from "next/server";
import { getRackRecords } from "@/server/services/industrial-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get("machineId") || undefined;
    const data = await getRackRecords(machineId);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load rack records";
    return NextResponse.json(
      { error: { code: "RACKS_FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}
