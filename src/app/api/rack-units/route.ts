import { NextRequest, NextResponse } from "next/server";
import { getMachineRackUnits, getRackChassisByMachine, rebuildMachineRackUnits } from "@/server/services/industrial-service";
import { getMachineCabinet } from "@/server/services/edge-service";

export const runtime = "nodejs";

/**
 * GET /api/rack-units?machineId=KLN-01
 * The machine's cabinet: chassis → card → channel. A machine with points in
 * the edge registry is built from the registry (the same rows the Acquisition
 * view reads); any other machine from its stored mapped_signals model.
 * Live values are overlaid client-side.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get("machineId") || undefined;
    const registry = machineId ? await getMachineCabinet(machineId) : null;
    if (registry && machineId) {
      const chassis = (await getRackChassisByMachine(machineId)).get(machineId) ?? null;
      return NextResponse.json({ data: registry.map((r) => ({ ...r, chassis })) });
    }
    const data = await getMachineRackUnits(machineId);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch rack units";
    return NextResponse.json(
      { error: { code: "RACK_UNITS_FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rack-units
 * Regenerates every machine's stored cabinet model from its mapped_signals
 * rows (edge_rack / card_slot). Idempotent.
 */
export async function POST() {
  try {
    const data = await rebuildMachineRackUnits();
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to rebuild rack units";
    return NextResponse.json(
      { error: { code: "RACK_UNITS_REBUILD_ERROR", message } },
      { status: 500 }
    );
  }
}
