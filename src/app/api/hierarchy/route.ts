import { NextRequest, NextResponse } from "next/server";
import { getPlantHierarchy } from "@/server/services/industrial-service";
import { accessFail, requestScope } from "@/app/api/_lib/respond";
import { plantFilter } from "@/server/services/access-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const plantId = new URL(request.url).searchParams.get("plantId") || undefined;
    const plants = plantFilter(await requestScope(request), plantId);
    const data = (await getPlantHierarchy(plantId)).filter((p) => !plants || plants.includes(p.id));
    return NextResponse.json({ data });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const message = error instanceof Error ? error.message : "Failed to load plant hierarchy";
    return NextResponse.json(
      { error: { code: "HIERARCHY_FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}
