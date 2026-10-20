import { NextRequest, NextResponse } from "next/server";
import { mapEdgeChannel } from "@/server/services/edge-service";
import type { ApiSuccess } from "@/types/api";
import type { EdgeMapResult } from "@/types/edge";
import { fail, failFrom, readBody } from "../_respond";
import { accessFail, requestScope } from "@/app/api/_lib/respond";
import { requireMachine } from "@/server/services/access-service";
import { requireGateway } from "@/server/services/edge-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Map a gateway channel (rack · card · channel) to a machine signal. */
export async function POST(request: NextRequest) {
  const body = await readBody(request);
  if (!body) return fail(400, "INVALID_JSON", "Request body must be a JSON object.");
  try {
    const scope = await requestScope(request);
    await requireGateway(scope, typeof body.gatewayId === "string" ? body.gatewayId : null);
    requireMachine(scope, typeof body.machineId === "string" ? body.machineId : null);
    const res: ApiSuccess<EdgeMapResult> = { data: await mapEdgeChannel(body) };
    return NextResponse.json(res, { status: 201 });
  } catch (err) {
    return accessFail(err) ?? failFrom(err, "EDGE_MAP_ERROR");
  }
}
