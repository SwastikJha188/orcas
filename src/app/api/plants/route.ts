import { NextRequest, NextResponse } from "next/server";
import { CreatePlantInput, PlantServiceError, createPlant, listPlants } from "@/server/services/plant-service";
import { AccessError, assertCanCreatePlant, requireActor, seesPlant } from "@/server/services/access-service";
import { accessFail, requestScope } from "@/app/api/_lib/respond";
import { SESSION_COOKIE } from "@/server/services/auth-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const userId = new URL(request.url).searchParams.get("userId") || undefined;
    const scope = await requestScope(request);
    const data = (await listPlants(userId)).filter((p) => seesPlant(scope, p.id));
    return NextResponse.json({ data });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const message = error instanceof Error ? error.message : "Failed to load plants";
    return NextResponse.json({ error: { code: "PLANTS_FETCH_ERROR", message } }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireActor(request.cookies.get(SESSION_COOKIE)?.value);
    assertCanCreatePlant(actor);
    const body = (await request.json()) as CreatePlantInput;
    const data = await createPlant(body, actor.id);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const status = error instanceof PlantServiceError || error instanceof AccessError ? error.status : 500;
    const code = error instanceof AccessError ? error.code : "PLANT_CREATE_ERROR";
    const message = error instanceof Error ? error.message : "Failed to create plant";
    return NextResponse.json({ error: { code, message } }, { status });
  }
}
