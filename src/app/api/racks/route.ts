import { NextRequest, NextResponse } from "next/server";
import { getRackRecords } from "@/server/services/industrial-service";
import { accessFail, requestScope } from "@/app/api/_lib/respond";
import { requireMachine, seesMachine } from "@/server/services/access-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get("machineId") || undefined;
    const scope = await requestScope(request);
    requireMachine(scope, machineId);
    const data = (await getRackRecords(machineId)).filter((r) => seesMachine(scope, r.machineId));
    return NextResponse.json({ data });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const message = error instanceof Error ? error.message : "Failed to load rack records";
    return NextResponse.json(
      { error: { code: "RACKS_FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}
