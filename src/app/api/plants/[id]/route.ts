import { NextRequest, NextResponse } from "next/server";
import { PlantServiceError, UpdatePlantInput, deletePlant, getPlantById, updatePlant } from "@/server/services/plant-service";
import { AccessError, assertCanDeletePlant, assertCanEditPlant, requireActor, requirePlant } from "@/server/services/access-service";
import { accessFail, requestScope } from "@/app/api/_lib/respond";
import { SESSION_COOKIE } from "@/server/services/auth-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    requirePlant(await requestScope(request), id);
    const data = await getPlantById(id);
    if (!data) {
      return NextResponse.json({ error: { code: "PLANT_NOT_FOUND", message: `Plant '${id}' not found` } }, { status: 404 });
    }
    return NextResponse.json({ data });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const message = error instanceof Error ? error.message : "Failed to load plant";
    return NextResponse.json({ error: { code: "PLANT_FETCH_ERROR", message } }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await requireActor(request.cookies.get(SESSION_COOKIE)?.value);
    assertCanEditPlant(actor, id);
    const body = (await request.json()) as UpdatePlantInput;
    const data = await updatePlant(id, body);
    return NextResponse.json({ data });
  } catch (error) {
    const status = error instanceof PlantServiceError || error instanceof AccessError ? error.status : 500;
    const code = error instanceof AccessError ? error.code : "PLANT_UPDATE_ERROR";
    const message = error instanceof Error ? error.message : "Failed to update plant";
    return NextResponse.json({ error: { code, message } }, { status });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await requireActor(request.cookies.get(SESSION_COOKIE)?.value);
    assertCanDeletePlant(actor, id);
    await deletePlant(id);
    return NextResponse.json({ data: { id, deleted: true } });
  } catch (error) {
    const status = error instanceof PlantServiceError || error instanceof AccessError ? error.status : 500;
    const code = error instanceof AccessError ? error.code : "PLANT_DELETE_ERROR";
    const message = error instanceof Error ? error.message : "Failed to delete plant";
    return NextResponse.json({ error: { code, message } }, { status });
  }
}
