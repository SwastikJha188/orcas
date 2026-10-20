import type { NextRequest } from "next/server";
import { failFrom, ok, requestScope } from "@/app/api/_lib/respond";
import { plantFilter } from "@/server/services/access-service";
import { fleetCondition } from "@/server/services/monitoring-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/fleet/condition[?plantId=…] → per machine: the latest Machine Health
 * Index, its status under the machine's health model, the service state and the
 * open findings. Pages poll it; it is the one source of machine health.
 */
export async function GET(request: NextRequest) {
  try {
    const scope = await requestScope(request);
    return ok(await fleetCondition(plantFilter(scope, request.nextUrl.searchParams.get("plantId"))));
  } catch (error) {
    return failFrom(error, "FLEET_CONDITION_FAILED");
  }
}
