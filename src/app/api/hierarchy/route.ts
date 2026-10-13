import { NextResponse } from "next/server";
import { getPlantHierarchy } from "@/server/services/industrial-service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await getPlantHierarchy();
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load plant hierarchy";
    return NextResponse.json(
      { error: { code: "HIERARCHY_FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}
