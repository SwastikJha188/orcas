import { NextRequest, NextResponse } from "next/server";
import { listTrendLives, maintenanceMachinesIn } from "@/server/services/maintenance-types-service";
import { accessFail, requestScope } from "@/app/api/_lib/respond";
import { fail } from "../pms/_respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/maintenance/remaining-life → per sub-assembly, the time until a reading reaches its alarm limit at its trend. */
export async function GET(request: NextRequest) {
  try {
    const machines = await maintenanceMachinesIn(await requestScope(request));
    return NextResponse.json({ data: await listTrendLives(machines) });
  } catch (error) {
    return accessFail(error) ?? fail(error, "REMAINING_LIFE_ERROR", "Failed to load the remaining life");
  }
}
