import { NextRequest, NextResponse } from "next/server";
import { getMachineById } from "@/server/services/industrial-service";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await getMachineById(id);
    if (!data) {
      return NextResponse.json(
        { error: { code: "MACHINE_NOT_FOUND", message: `Machine ${id} not found` } },
        { status: 404 }
      );
    }
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load machine detail";
    return NextResponse.json(
      { error: { code: "MACHINE_DETAIL_ERROR", message } },
      { status: 500 }
    );
  }
}
