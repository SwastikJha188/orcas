import { NextResponse } from "next/server";
import { rebuildKilnFleet } from "@/server/services/industrial-service";

export const runtime = "nodejs";

/**
 * POST /api/db/kiln-fleet
 * Builds KLN-02 and KLN-03 from KLN-01's catalog, each with its own identity
 * and hierarchy group. Idempotent; KLN-01 is untouched.
 */
export async function POST() {
  try {
    const data = await rebuildKilnFleet();
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build the kiln fleet";
    return NextResponse.json({ error: { code: "KILN_FLEET_ERROR", message } }, { status: 500 });
  }
}
