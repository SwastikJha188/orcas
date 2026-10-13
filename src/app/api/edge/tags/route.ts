import { NextRequest, NextResponse } from "next/server";
import { getMqttRuntime } from "@/server/mqtt/runtime";
import { deleteEdgeTag } from "@/server/services/edge-service";
import { fail, failFrom, readBody } from "../_respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Delete a tag (its card and points) and clear its live reading. Body: { gatewayId, rack, card }. */
export async function DELETE(request: NextRequest) {
  const body = await readBody(request);
  if (!body) return fail(400, "INVALID_BODY", "Send a JSON object with gatewayId, rack and card.");
  try {
    const res = await deleteEdgeTag(body);
    if (res.brokerId) getMqttRuntime().forgetCard(res.brokerId, String(body.gatewayId), res.gatewayCode, String(body.rack).trim(), String(body.card).trim());
    return NextResponse.json({ data: { cards: res.cards, points: res.points } });
  } catch (err) {
    return failFrom(err, "EDGE_TAG_DELETE_ERROR");
  }
}
