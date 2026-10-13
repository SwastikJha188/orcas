import { NextResponse } from "next/server";
import { OpsInputError, createWorkOrder, listWorkOrders } from "@/server/services/ops-service";

export const runtime = "nodejs";

function fail(error: unknown, code: string, fallback: string) {
  const bad = error instanceof OpsInputError;
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: { code: bad ? "INVALID_INPUT" : code, message } }, { status: bad ? 400 : 500 });
}

export async function GET(request: Request) {
  try {
    const machineId = new URL(request.url).searchParams.get("machineId");
    return NextResponse.json({ data: await listWorkOrders(machineId) });
  } catch (error) {
    return fail(error, "WORK_ORDERS_ERROR", "Failed to load work orders");
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    return NextResponse.json({ data: await createWorkOrder(body) }, { status: 201 });
  } catch (error) {
    return fail(error, "WORK_ORDER_CREATE_ERROR", "Failed to create work order");
  }
}
