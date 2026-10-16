import { NextRequest, NextResponse } from "next/server";
import { SAMPLE_KEEP_MS, ensurePlantTables, readHealth } from "@/server/plant/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/plant/health?from=<epoch ms> → each machine's recorded 10 s health buckets since `from`. */
export async function GET(request: NextRequest) {
  try {
    const now = Date.now();
    const asked = Number(request.nextUrl.searchParams.get("from"));
    const from = Number.isFinite(asked) && asked > 0 ? Math.max(asked, now - SAMPLE_KEEP_MS) : now - SAMPLE_KEEP_MS;
    await ensurePlantTables();
    return NextResponse.json({ data: await readHealth(from) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load the health record";
    return NextResponse.json({ error: { code: "PLANT_HEALTH_ERROR", message } }, { status: 500 });
  }
}
