import { NextResponse } from "next/server";
import { applyMachineSensorSpecs } from "@/server/services/industrial-service";

export const runtime = "nodejs";

/**
 * POST /api/db/sensor-specs
 * Writes the non-kiln limits, sub-assembly / acquisition mapping and failure
 * modes (seed-data/fleet-sensor-specs.ts) to mapped_signals, then rebuilds
 * those machines' rack payloads, trend history and diagnosis records
 * (seed-data/fleet-history.ts). Idempotent; KLN-01 is untouched.
 */
export async function POST() {
  try {
    const data = await applyMachineSensorSpecs();
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to apply sensor specs";
    return NextResponse.json({ error: { code: "SENSOR_SPECS_APPLY_ERROR", message } }, { status: 500 });
  }
}
