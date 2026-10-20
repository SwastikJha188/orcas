import type { NextRequest } from "next/server";
import { failFrom, ok, requestScope } from "@/app/api/_lib/respond";
import { requirePlant, scopedRows } from "@/server/services/access-service";
import { listSimulations } from "@/server/services/monitoring-service";

export const runtime = "nodejs";

/** GET /api/simulations[?plantId=…] → machines whose gateway is simulated, with the engine, seed and profile. */
export async function GET(request: NextRequest) {
  try {
    const plantIds = request.nextUrl.searchParams.getAll("plantId");
    const scope = await requestScope(request);
    for (const id of plantIds) requirePlant(scope, id);
    return ok(scopedRows(scope, await listSimulations(plantIds.length ? plantIds : undefined)));
  } catch (error) {
    return failFrom(error, "SIMULATIONS_FAILED");
  }
}
