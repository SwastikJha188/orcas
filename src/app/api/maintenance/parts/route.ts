import { NextRequest, NextResponse } from "next/server";
import { listServiceParts, maintenanceMachinesIn } from "@/server/services/maintenance-types-service";
import { accessFail, requestScope } from "@/app/api/_lib/respond";
import { fail } from "../pms/_respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/maintenance/parts → part service lives (life, used at a running-hours reading) and their replacements. */
export async function GET(request: NextRequest) {
  try {
    const machines = await maintenanceMachinesIn(await requestScope(request));
    return NextResponse.json({ data: await listServiceParts(machines) });
  } catch (error) {
    return accessFail(error) ?? fail(error, "PARTS_ERROR", "Failed to load the parts");
  }
}
