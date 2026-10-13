import { NextRequest, NextResponse } from "next/server";
import { commissionGateway } from "@/server/services/edge-service";
import { getMqttRuntime } from "@/server/mqtt/runtime";
import type { ApiSuccess } from "@/types/api";
import type { EdgeCommissionResult } from "@/types/edge";
import { fail, failFrom, readBody } from "../_respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Register a gateway with its sources and cards in one step (detected or typed). */
export async function POST(request: NextRequest) {
  const body = await readBody(request);
  if (!body) return fail(400, "INVALID_JSON", "Request body must be a JSON object.");
  try {
    const res: ApiSuccess<EdgeCommissionResult> = { data: await commissionGateway(body) };
    // A new gateway may carry a custom format: its topic joins the subscriptions.
    await getMqttRuntime().reload();
    return NextResponse.json(res, { status: 201 });
  } catch (err) {
    return failFrom(err, "EDGE_COMMISSION_ERROR");
  }
}
