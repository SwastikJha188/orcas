import { NextResponse } from "next/server";
import { getMachines } from "@/server/services/industrial-service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await getMachines();
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load machines";
    return NextResponse.json(
      { error: { code: "MACHINES_FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}
