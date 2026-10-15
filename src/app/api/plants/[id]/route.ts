import { NextRequest, NextResponse } from "next/server";
import { PlantServiceError, UpdatePlantInput, deletePlant, getPlantById, updatePlant } from "@/server/services/plant-service";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await getPlantById(id);
    if (!data) {
      return NextResponse.json({ error: { code: "PLANT_NOT_FOUND", message: `Plant '${id}' not found` } }, { status: 404 });
    }
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load plant";
    return NextResponse.json({ error: { code: "PLANT_FETCH_ERROR", message } }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as UpdatePlantInput;
    const data = await updatePlant(id, body);
    return NextResponse.json({ data });
  } catch (error) {
    const status = error instanceof PlantServiceError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to update plant";
    return NextResponse.json({ error: { code: "PLANT_UPDATE_ERROR", message } }, { status });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deletePlant(id);
    return NextResponse.json({ data: { id, deleted: true } });
  } catch (error) {
    const status = error instanceof PlantServiceError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to delete plant";
    return NextResponse.json({ error: { code: "PLANT_DELETE_ERROR", message } }, { status });
  }
}
