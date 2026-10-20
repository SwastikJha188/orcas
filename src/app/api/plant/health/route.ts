import { NextRequest, NextResponse } from "next/server";
import { ensurePlantTables, readHealth } from "@/server/plant/store";
import { setting } from "@/server/monitoring/settings";
import { accessFail, requestScope } from "@/app/api/_lib/respond";
import { seesMachine } from "@/server/services/access-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/plant/health?from=<epoch ms> → each machine's recorded 10 s health buckets since `from`. */
export async function GET(request: NextRequest) {
  try {
    const now = Date.now();
    const keepMs = (await setting("health.sample_keep_h")) * 3_600_000;
    const asked = Number(request.nextUrl.searchParams.get("from"));
    const from = Number.isFinite(asked) && asked > 0 ? Math.max(asked, now - keepMs) : now - keepMs;
    const scope = await requestScope(request);
    await ensurePlantTables();
    const health = await readHealth(from);
    const series = Object.fromEntries(Object.entries(health.series).filter(([machineId]) => seesMachine(scope, machineId)));
    return NextResponse.json({ data: { ...health, series } });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const message = error instanceof Error ? error.message : "Failed to load the health record";
    return NextResponse.json({ error: { code: "PLANT_HEALTH_ERROR", message } }, { status: 500 });
  }
}
