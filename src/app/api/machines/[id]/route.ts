import { NextRequest, NextResponse } from "next/server";
import { getMachineById, HierarchyError, updateMachineRecord, type UpdateMachineInput } from "@/server/services/industrial-service";
import { accessFail, requestScope } from "@/app/api/_lib/respond";
import { requireMachine } from "@/server/services/access-service";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    requireMachine(await requestScope(request), id);
    const data = await getMachineById(id);
    if (!data) {
      return NextResponse.json(
        { error: { code: "MACHINE_NOT_FOUND", message: `Machine ${id} not found` } },
        { status: 404 }
      );
    }
    return NextResponse.json({ data });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const message = error instanceof Error ? error.message : "Failed to load machine detail";
    return NextResponse.json(
      { error: { code: "MACHINE_DETAIL_ERROR", message } },
      { status: 500 }
    );
  }
}

/** PATCH /api/machines/:id { name?, areaId?, criticality? } — rename, move to another area of its plant, or change criticality. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    requireMachine(await requestScope(request), id);
    const body = (await request.json().catch(() => null)) as UpdateMachineInput | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: { code: "INVALID_INPUT", message: "Send { name?, areaId?, criticality? } as JSON" } }, { status: 400 });
    }
    const data = await updateMachineRecord(id, { name: body.name, areaId: body.areaId, criticality: body.criticality });
    return NextResponse.json({ data });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    if (error instanceof HierarchyError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
    const message = error instanceof Error ? error.message : "Failed to update the machine";
    return NextResponse.json({ error: { code: "MACHINE_UPDATE_ERROR", message } }, { status: 500 });
  }
}
