import { NextRequest, NextResponse } from "next/server";
import { CreatePlantInput, PlantServiceError, createPlant, listPlants } from "@/server/services/plant-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const userId = new URL(request.url).searchParams.get("userId") || undefined;
    const data = await listPlants(userId);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load plants";
    return NextResponse.json({ error: { code: "PLANTS_FETCH_ERROR", message } }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreatePlantInput;
    const data = await createPlant(body);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const status = error instanceof PlantServiceError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to create plant";
    return NextResponse.json({ error: { code: "PLANT_CREATE_ERROR", message } }, { status });
  }
}
