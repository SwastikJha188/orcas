import { NextResponse } from "next/server";
import { OpsInputError, acknowledgeAlert, clearAck, listAcks } from "@/server/services/ops-service";

export const runtime = "nodejs";

function fail(error: unknown, code: string, fallback: string) {
  const bad = error instanceof OpsInputError;
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: { code: bad ? "INVALID_INPUT" : code, message } }, { status: bad ? 400 : 500 });
}

export async function GET(request: Request) {
  try {
    return NextResponse.json({ data: await listAcks(new URL(request.url).searchParams.get("machineId")) });
  } catch (error) {
    return fail(error, "ALERT_ACK_ERROR", "Failed to load acknowledgements");
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    return NextResponse.json({ data: await acknowledgeAlert(body) }, { status: 201 });
  } catch (error) {
    return fail(error, "ALERT_ACK_ERROR", "Failed to acknowledge alert");
  }
}

export async function DELETE(request: Request) {
  try {
    const sp = new URL(request.url).searchParams;
    const machineId = sp.get("machineId");
    const ruleId = sp.get("ruleId");
    if (!machineId || !ruleId) throw new OpsInputError("machineId and ruleId are required");
    await clearAck(machineId, ruleId);
    return NextResponse.json({ data: { cleared: true } });
  } catch (error) {
    return fail(error, "ALERT_ACK_ERROR", "Failed to clear acknowledgement");
  }
}
