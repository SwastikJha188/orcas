import { NextRequest, NextResponse } from "next/server";
import { ensurePlantTables, loadState, stateWallMs } from "@/server/plant/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The saved plant is about 1.5 MB gzipped and changes every few minutes: keep
// the last one in memory and let browsers revalidate it by its time stamp.
const g = globalThis as typeof globalThis & { __ultronPlantBody?: { wallMs: number; body: Buffer } };

/** GET /api/plant/state → the always-on plant (gzipped `{ data: PlantState }`, tagged JSON; see @/lib/plant-codec). */
export async function GET(request: NextRequest) {
  try {
    await ensurePlantTables();
    const wallMs = await stateWallMs();
    if (wallMs === null) {
      return NextResponse.json({ error: { code: "NO_PLANT", message: "No server is running the plant." } }, { status: 404 });
    }
    const etag = `"plant-${wallMs}"`;
    if (request.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    if (g.__ultronPlantBody?.wallMs !== wallMs) {
      const saved = await loadState();
      if (!saved) return NextResponse.json({ error: { code: "NO_PLANT", message: "No server is running the plant." } }, { status: 404 });
      g.__ultronPlantBody = saved;
    }
    const { body, wallMs: at } = g.__ultronPlantBody!;
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": "application/json",
        "Content-Encoding": "gzip",
        "Cache-Control": "no-cache",
        ETag: `"plant-${at}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load the plant";
    return NextResponse.json({ error: { code: "PLANT_STATE_ERROR", message } }, { status: 500 });
  }
}
