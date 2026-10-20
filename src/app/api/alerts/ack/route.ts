import { NextResponse } from "next/server";
import { OpsInputError, acknowledgeAlert, listAcks } from "@/server/services/ops-service";
import { accessFail, requestScope } from "@/app/api/_lib/respond";
import { requireMachine, scopedRows } from "@/server/services/access-service";

export const runtime = "nodejs";

function fail(error: unknown, code: string, fallback: string) {
  const bad = error instanceof OpsInputError;
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: { code: bad ? "INVALID_INPUT" : code, message } }, { status: bad ? 400 : 500 });
}

export async function GET(request: Request) {
  try {
    const machineId = new URL(request.url).searchParams.get("machineId");
    const scope = await requestScope(request);
    requireMachine(scope, machineId);
    return NextResponse.json({ data: scopedRows(scope, await listAcks(machineId)) });
  } catch (error) {
    return accessFail(error) ?? fail(error, "ALERT_ACK_ERROR", "Failed to load acknowledgements");
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    requireMachine(await requestScope(request), typeof body.machineId === "string" ? body.machineId : null);
    return NextResponse.json({ data: await acknowledgeAlert(body) }, { status: 201 });
  } catch (error) {
    return accessFail(error) ?? fail(error, "ALERT_ACK_ERROR", "Failed to acknowledge alert");
  }
}
