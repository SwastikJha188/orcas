import { NextResponse } from "next/server";
import { getEdgeRegistry } from "@/server/services/edge-service";
import type { ApiSuccess } from "@/types/api";
import type { EdgeRegistry } from "@/types/edge";
import { failFrom } from "./_respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The whole edge registry: brokers, gateways, sources, points and the pick lists. */
export async function GET() {
  try {
    const body: ApiSuccess<EdgeRegistry> = { data: await getEdgeRegistry() };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return failFrom(err, "EDGE_FETCH_ERROR");
  }
}
