import { NextResponse } from "next/server";
import { OpsInputError, updateWorkOrder } from "@/server/services/ops-service";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const data = await updateWorkOrder(Number(id), body);
    if (!data) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Work order not found" } }, { status: 404 });
    return NextResponse.json({ data });
  } catch (error) {
    const bad = error instanceof OpsInputError;
    const message = error instanceof Error ? error.message : "Failed to update work order";
    return NextResponse.json({ error: { code: bad ? "INVALID_INPUT" : "WORK_ORDER_UPDATE_ERROR", message } }, { status: bad ? 400 : 500 });
  }
}
