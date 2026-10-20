import { NextRequest, NextResponse } from "next/server";
import { createOperatingEvent, getOperatingEvents } from "@/server/services/industrial-service";
import { accessFail, requestScope } from "@/app/api/_lib/respond";
import { requireMachine, scopedRows } from "@/server/services/access-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get("machineId") || undefined;
    const scope = await requestScope(request);
    requireMachine(scope, machineId);
    const data = scopedRows(scope, await getOperatingEvents(machineId));
    return NextResponse.json({ data });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const message = error instanceof Error ? error.message : "Failed to load operating events";
    return NextResponse.json(
      { error: { code: "HISTORY_FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      machineId: string;
      actorUserId?: string | null;
      type: "Telemetry Alert" | "Maintenance Log" | "Operating Change" | "Inspection";
      severity: "Alert" | "Normal" | "Critical";
      title: string;
      description: string;
      source?: string;
    };
    requireMachine(await requestScope(request), body.machineId);
    const data = await createOperatingEvent(body);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const message = error instanceof Error ? error.message : "Failed to create operating event";
    return NextResponse.json(
      { error: { code: "HISTORY_CREATE_ERROR", message } },
      { status: 400 }
    );
  }
}
