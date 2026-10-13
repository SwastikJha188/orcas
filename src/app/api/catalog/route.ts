import { NextRequest, NextResponse } from "next/server";
import { getMachineCatalog } from "@/server/services/industrial-service";

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
    const machineId = searchParams.get("machineId") || "KLN-01";
    const data = await getMachineCatalog(machineId);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load machine catalog";
    return NextResponse.json(
      { error: { code: "CATALOG_FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}
