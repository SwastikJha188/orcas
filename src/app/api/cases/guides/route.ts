import type { NextRequest } from "next/server";
import { failFrom, ok, requestScope } from "@/app/api/_lib/respond";
import { singlePlant } from "@/server/services/access-service";
import { listGuides } from "@/server/services/case-service";

export const runtime = "nodejs";

/** GET /api/cases/guides[?plantId][&machineId] → investigation guides. */
export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams;
    const plantId = singlePlant(await requestScope(request), p.get("plantId"), p.get("machineId"));
    return ok(await listGuides({ plantId, machineId: p.get("machineId") }));
  } catch (error) {
    return failFrom(error, "GUIDES_FAILED");
  }
}
