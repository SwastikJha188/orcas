import type { NextRequest } from "next/server";
import { failFrom, ok, requestScope } from "@/app/api/_lib/respond";
import { singlePlant } from "@/server/services/access-service";
import { getFaultLibrary } from "@/server/services/fault-library-service";

export const runtime = "nodejs";

/** GET /api/fault-library?machineId= | ?plantId= → fault library entries and rule links (OSW-PE-FLT-PYR-01). */
export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams;
    const plantId = singlePlant(await requestScope(request), p.get("plantId"), p.get("machineId"));
    return ok(await getFaultLibrary({ machineId: p.get("machineId"), plantId }));
  } catch (error) {
    return failFrom(error, "FAULT_LIBRARY_FAILED");
  }
}
