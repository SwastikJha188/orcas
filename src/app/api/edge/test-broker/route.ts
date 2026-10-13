import { NextRequest, NextResponse } from "next/server";
import { brokerConfigForTest } from "@/server/services/edge-service";
import { testBrokerConnection } from "@/server/mqtt/runtime";
import type { ApiSuccess } from "@/types/api";
import type { BrokerTestResult } from "@/types/edge";
import { fail, failFrom, readBody } from "../_respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Opens a throwaway connection with the form's settings. `id` reuses the
 * stored password and certificates for fields the form left untouched.
 */
export async function POST(request: NextRequest) {
  const body = await readBody(request);
  if (!body) return fail(400, "INVALID_JSON", "Request body must be a JSON object.");
  const id = typeof body.id === "string" && body.id ? body.id : null;
  const { id: _omit, ...fields } = body;
  void _omit;
  try {
    const config = await brokerConfigForTest(fields, id);
    const res: ApiSuccess<BrokerTestResult> = { data: await testBrokerConnection(config) };
    return NextResponse.json(res);
  } catch (err) {
    return failFrom(err, "BROKER_TEST_ERROR");
  }
}
