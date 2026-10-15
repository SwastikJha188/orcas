import { NextResponse } from "next/server";
import { OpsInputError, createWorkOrder, deleteWorkOrder, listWorkOrders } from "@/server/services/ops-service";

export const runtime = "nodejs";

function fail(error: unknown, code: string, fallback: string) {
  const bad = error instanceof OpsInputError;
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: { code: bad ? "INVALID_INPUT" : code, message } }, { status: bad ? 400 : 500 });
}

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const machineId = params.get("machineId");
    const plantId = params.get("plantId");
    return NextResponse.json({ data: await listWorkOrders(machineId, plantId) });
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

export async function DELETE(request: Request) {
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    const deleted = await deleteWorkOrder(id);
    if (!deleted) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Work order not found" } }, { status: 404 });
    }
    return NextResponse.json({ data: { id, deleted: true } });
  } catch (error) {
    return fail(error, "WORK_ORDER_DELETE_ERROR", "Failed to delete work order");
  }
}
