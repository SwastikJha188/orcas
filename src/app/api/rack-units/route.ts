import { NextRequest, NextResponse } from "next/server";
import { getMachineRackUnits, getRackChassisByMachine } from "@/server/services/industrial-service";
import { getMachineCabinet } from "@/server/services/edge-service";
import { accessFail, requestScope } from "@/app/api/_lib/respond";
import { requireMachineParam } from "@/server/services/access-service";

export const runtime = "nodejs";

/**
 * GET /api/rack-units?machineId=KLN-01
 * The machine's cabinet: chassis → card → channel. A machine with points in
 * the edge registry is built from the registry (the same rows the Acquisition
 * view reads); any other machine from the documented acquisition path of its measurements.
 * Live values are overlaid client-side.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get("machineId") || undefined;
    const scope = await requestScope(request);
    requireMachineParam(scope, machineId);
    const registry = machineId ? await getMachineCabinet(machineId) : null;
    if (registry && machineId) {
      const chassis = (await getRackChassisByMachine(machineId)).get(machineId) ?? null;
      return NextResponse.json({ data: registry.map((r) => ({ ...r, chassis })) });
    }
    const data = await getMachineRackUnits(machineId);
    return NextResponse.json({ data });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const message = error instanceof Error ? error.message : "Failed to fetch rack units";
    return NextResponse.json(
      { error: { code: "RACK_UNITS_FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}
