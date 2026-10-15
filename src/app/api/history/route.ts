import { NextRequest, NextResponse } from "next/server";
import { createOperatingEvent, getOperatingEvents } from "@/server/services/industrial-service";

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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      machineId: string;
      actorUserId?: string | null;
      type: "Telemetry Advisory" | "Maintenance Log" | "Operating Change" | "Inspection";
      severity: "Advisory" | "Normal" | "Critical";
      title: string;
      description: string;
      source?: string;
    };
    const data = await createOperatingEvent(body);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create operating event";
    return NextResponse.json(
      { error: { code: "HISTORY_CREATE_ERROR", message } },
      { status: 400 }
    );
  }
}
