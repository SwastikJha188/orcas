import { NextRequest, NextResponse } from "next/server";
import { CreateMachineInput, createMachineRecord, deleteMachineRecord, getMachines } from "@/server/services/industrial-service";
import { accessFail, requestScope } from "@/app/api/_lib/respond";
import { plantFilter, requireMachine, requirePlant } from "@/server/services/access-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const plantId = new URL(request.url).searchParams.get("plantId") || undefined;
    const plants = plantFilter(await requestScope(request), plantId);
    const data = (await getMachines(plantId)).filter((m) => !plants || (m.plantId && plants.includes(m.plantId)));
    return NextResponse.json({ data });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const message = error instanceof Error ? error.message : "Failed to load machines";
    return NextResponse.json(
      { error: { code: "MACHINES_FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateMachineInput;
    requirePlant(await requestScope(request), body.plantId);
    const data = await createMachineRecord(body);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const message = error instanceof Error ? error.message : "Failed to create machine";
    return NextResponse.json(
      { error: { code: "MACHINE_CREATE_ERROR", message } },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Machine id query param is required" } },
        { status: 400 }
      );
    }
    requireMachine(await requestScope(request), id);
    await deleteMachineRecord(id);
    return NextResponse.json({ data: { id, deleted: true } });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const message = error instanceof Error ? error.message : "Failed to delete machine";
    return NextResponse.json(
      { error: { code: "MACHINE_DELETE_ERROR", message } },
      { status: 400 }
    );
  }
}
