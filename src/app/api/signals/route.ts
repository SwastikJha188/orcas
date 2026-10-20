import { NextRequest, NextResponse } from "next/server";
import { getMappedSignals } from "@/server/services/industrial-service";
import { accessFail, requestScope } from "@/app/api/_lib/respond";
import { requireMachine, scopedRows } from "@/server/services/access-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get("machineId") || undefined;
    const scope = await requestScope(request);
    requireMachine(scope, machineId);
    const data = scopedRows(scope, await getMappedSignals(machineId));
    return NextResponse.json({ data });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const message = error instanceof Error ? error.message : "Failed to load mapped signals";
    return NextResponse.json(
      { error: { code: "SIGNALS_FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}
