import { NextRequest, NextResponse } from "next/server";
import { CreateMachineInput, createMachineRecord, deleteMachineRecord, getMachines } from "@/server/services/industrial-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const plantId = new URL(request.url).searchParams.get("plantId") || undefined;
    const data = await getMachines(plantId);
    return NextResponse.json({ data });
  } catch (error) {
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
    const data = await createMachineRecord(body);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
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
    await deleteMachineRecord(id);
    return NextResponse.json({ data: { id, deleted: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete machine";
    return NextResponse.json(
      { error: { code: "MACHINE_DELETE_ERROR", message } },
      { status: 400 }
    );
  }
}
