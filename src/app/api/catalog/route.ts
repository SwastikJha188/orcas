import { NextRequest, NextResponse } from "next/server";
import { getMachineCatalog } from "@/server/services/industrial-service";
import { accessFail, requestScope } from "@/app/api/_lib/respond";
import { requireMachine } from "@/server/services/access-service";

export const runtime = "nodejs";

/**
 * GET /api/catalog?machineId=KLN-01
 * Single canonical source: systems + sub-assemblies + sensors from PostgreSQL.
 * Every page (Overview / Sensor Mapping / Component Health / Diagnosis /
 * Trends / Rack) must derive counts from this endpoint so they can never drift.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get("machineId");
    if (!machineId) return NextResponse.json({ error: { code: "INVALID_INPUT", message: "machineId is required" } }, { status: 400 });
    requireMachine(await requestScope(request), machineId);
    const data = await getMachineCatalog(machineId);
    return NextResponse.json({ data });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const message = error instanceof Error ? error.message : "Failed to load machine catalog";
    return NextResponse.json(
      { error: { code: "CATALOG_FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}
