import { NextRequest, NextResponse } from "next/server";
import { createEdgeEntity, isEdgeKind } from "@/server/services/edge-service";
import { getMqttRuntime } from "@/server/mqtt/runtime";
import { fail, failFrom, readBody } from "../_respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Create a broker, gateway, source or point. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!isEdgeKind(kind)) return fail(404, "INVALID_KIND", `Unknown registry kind “${kind}”.`);
  const body = await readBody(request);
  if (!body) return fail(400, "INVALID_JSON", "Request body must be a JSON object.");
  try {
    const data = await createEdgeEntity(kind, body);
    // Brokers, gateways and formats decide what each connection subscribes to.
    if (kind !== "points" && kind !== "sources" && kind !== "cards") await getMqttRuntime().reload();
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return failFrom(err, "EDGE_CREATE_ERROR");
  }
}
