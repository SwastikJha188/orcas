import type { NextRequest } from "next/server";
import { failFrom, ok, requestScope } from "@/app/api/_lib/respond";
import { requireMachine, requirePlant } from "@/server/services/access-service";
import { listMeasurements } from "@/server/services/monitoring-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/measurements?machineId=…|plantId=… → identity, limit, reference, latest reading and data assessment. */
export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams;
    const machineId = p.get("machineId") ?? undefined;
    const plantId = p.get("plantId") ?? undefined;
    if (!machineId && !plantId) return ok([]);
    const scope = await requestScope(request);
    requireMachine(scope, machineId);
    requirePlant(scope, plantId);
    return ok(await listMeasurements({ machineId, plantId }));
  } catch (error) {
    return failFrom(error, "MEASUREMENTS_FAILED");
  }
}
