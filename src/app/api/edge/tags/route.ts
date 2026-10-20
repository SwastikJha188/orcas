import { NextRequest, NextResponse } from "next/server";
import { getMqttRuntime } from "@/server/mqtt/runtime";
import { deleteEdgeTag } from "@/server/services/edge-service";
import { fail, failFrom, readBody } from "../_respond";
import { accessFail, requestScope } from "@/app/api/_lib/respond";
import { requireGateway } from "@/server/services/edge-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Delete a tag (its card and points) and clear its live reading. Body: { gatewayId, rack, card }. */
export async function DELETE(request: NextRequest) {
  const body = await readBody(request);
  if (!body) return fail(400, "INVALID_BODY", "Send a JSON object with gatewayId, rack and card.");
  try {
    await requireGateway(await requestScope(request), typeof body.gatewayId === "string" ? body.gatewayId.trim() : null);
    const res = await deleteEdgeTag(body);
    if (res.brokerId) getMqttRuntime().forgetCard(res.brokerId, String(body.gatewayId), res.gatewayCode, String(body.rack).trim(), String(body.card).trim());
    return NextResponse.json({ data: { cards: res.cards, points: res.points } });
  } catch (err) {
    return accessFail(err) ?? failFrom(err, "EDGE_TAG_DELETE_ERROR");
  }
}
