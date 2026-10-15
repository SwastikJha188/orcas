import { NextResponse } from "next/server";
import { rebuildPyroLine } from "@/server/services/industrial-service";

export const runtime = "nodejs";

/**
 * POST /api/db/pyro-line
 * Builds the full pyro line (D4-OSW-PE-PYR Rev. 02): plant, hierarchy, six
 * machines, 167 sensors, edge registry and the plant's user. Idempotent; it
 * rebuilds only rows the pyro line owns.
 */
export async function POST() {
  try {
    const data = await rebuildPyroLine();
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build the pyro line";
    return NextResponse.json({ error: { code: "PYRO_LINE_ERROR", message } }, { status: 500 });
  }
}
