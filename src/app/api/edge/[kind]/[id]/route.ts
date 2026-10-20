import { NextRequest, NextResponse } from "next/server";
import { deleteEdgeEntity, isEdgeKind, updateEdgeEntity } from "@/server/services/edge-service";
import { getMqttRuntime } from "@/server/mqtt/runtime";
import { fail, failFrom, readBody } from "../../_respond";
import { accessFail, requestScope } from "@/app/api/_lib/respond";
import { requireEdgeEntity, requireEdgeFields } from "@/server/services/edge-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ kind: string; id: string }> };

/** Update any subset of fields. */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { kind, id } = await params;
  if (!isEdgeKind(kind)) return fail(404, "INVALID_KIND", `Unknown registry kind “${kind}”.`);
  const body = await readBody(request);
  if (!body) return fail(400, "INVALID_JSON", "Request body must be a JSON object.");
  try {
    const scope = await requestScope(request);
    await requireEdgeEntity(scope, kind, id);
    await requireEdgeFields(scope, kind, body);
    const data = await updateEdgeEntity(kind, id, body);
    // Brokers, gateways and formats decide what each connection subscribes to.
    if (kind !== "points" && kind !== "sources" && kind !== "cards") await getMqttRuntime().reload();
    return NextResponse.json({ data });
  } catch (err) {
    return accessFail(err) ?? failFrom(err, "EDGE_UPDATE_ERROR");
  }
}

/** Delete; a gateway takes its sources and their points with it. */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { kind, id } = await params;
  if (!isEdgeKind(kind)) return fail(404, "INVALID_KIND", `Unknown registry kind “${kind}”.`);
  try {
    await requireEdgeEntity(await requestScope(request), kind, id);
    await deleteEdgeEntity(kind, id);
    // Brokers, gateways and formats decide what each connection subscribes to.
    if (kind !== "points" && kind !== "sources" && kind !== "cards") await getMqttRuntime().reload();
    return NextResponse.json({ data: { id } });
  } catch (err) {
    return accessFail(err) ?? failFrom(err, "EDGE_DELETE_ERROR");
  }
}
