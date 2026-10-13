import { NextRequest, NextResponse } from "next/server";
import { getProcessStages } from "@/server/services/industrial-service";

export const runtime = "nodejs";

/**
 * GET /api/process?machineId=KLN-01
 * Returns the machine's ordered process stages from PostgreSQL.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get("machineId") || undefined;
    const data = await getProcessStages(machineId);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch process stages";
    return NextResponse.json(
      { error: { code: "PROCESS_FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}
