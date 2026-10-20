import { NextResponse } from "next/server";
import { OpsInputError, createWorkOrder, deleteWorkOrder, listWorkOrders } from "@/server/services/ops-service";
import { accessFail, requestScope } from "@/app/api/_lib/respond";
import { requireMachine, requireMachineRow, singlePlant } from "@/server/services/access-service";

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
    const plantId = singlePlant(await requestScope(request), params.get("plantId"), machineId);
    return NextResponse.json({ data: await listWorkOrders(machineId, plantId) });
  } catch (error) {
    return accessFail(error) ?? fail(error, "WORK_ORDERS_ERROR", "Failed to load work orders");
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    requireMachine(await requestScope(request), typeof body.machineId === "string" ? body.machineId : null);
    return NextResponse.json({ data: await createWorkOrder(body) }, { status: 201 });
  } catch (error) {
    return accessFail(error) ?? fail(error, "WORK_ORDER_CREATE_ERROR", "Failed to create work order");
  }
}

export async function DELETE(request: Request) {
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    await requireMachineRow(await requestScope(request), "work_orders", id, "Work order");
    const deleted = await deleteWorkOrder(id);
    if (!deleted) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Work order not found" } }, { status: 404 });
    }
    return NextResponse.json({ data: { id, deleted: true } });
  } catch (error) {
    return accessFail(error) ?? fail(error, "WORK_ORDER_DELETE_ERROR", "Failed to delete work order");
  }
}
