import { Hono } from "hono";
import { accessFail, readCookie, requestScope } from "@backend/http";
import { AccessError, assertCanCreatePlant, assertCanDeletePlant, assertCanEditPlant, requireActor, requirePlant, seesPlant } from "@backend/services/access-service";
import { SESSION_COOKIE } from "@backend/services/auth-service";
import { CreatePlantInput, PlantServiceError, UpdatePlantInput, createPlant, deletePlant, getPlantById, listPlants, updatePlant } from "@backend/services/plant-service";

/** /api/plants */
export const plants = new Hono();


plants.get("/", async (c) => {
  const request = c.req.raw;
  try {
    const userId = new URL(request.url).searchParams.get("userId") || undefined;
    const scope = await requestScope(request);
    const data = (await listPlants(userId)).filter((p) => seesPlant(scope, p.id));
    return Response.json({ data });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const message = error instanceof Error ? error.message : "Failed to load plants";
    return Response.json({ error: { code: "PLANTS_FETCH_ERROR", message } }, { status: 500 });
  }
});

plants.post("/", async (c) => {
  const request = c.req.raw;
  try {
    const actor = await requireActor(readCookie(request, SESSION_COOKIE));
    assertCanCreatePlant(actor);
    const body = (await request.json()) as CreatePlantInput;
    const data = await createPlant(body, actor.id);
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    const status = error instanceof PlantServiceError || error instanceof AccessError ? error.status : 500;
    const code = error instanceof AccessError ? error.code : "PLANT_CREATE_ERROR";
    const message = error instanceof Error ? error.message : "Failed to create plant";
    return Response.json({ error: { code, message } }, { status });
  }
});

plants.get("/:id", async (c) => {
  const request = c.req.raw;
  try {
    const { id } = c.req.param();
    requirePlant(await requestScope(request), id);
    const data = await getPlantById(id);
    if (!data) {
      return Response.json({ error: { code: "PLANT_NOT_FOUND", message: `Plant '${id}' not found` } }, { status: 404 });
    }
    return Response.json({ data });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const message = error instanceof Error ? error.message : "Failed to load plant";
    return Response.json({ error: { code: "PLANT_FETCH_ERROR", message } }, { status: 500 });
  }
});

plants.patch("/:id", async (c) => {
  const request = c.req.raw;
  try {
    const { id } = c.req.param();
    const actor = await requireActor(readCookie(request, SESSION_COOKIE));
    assertCanEditPlant(actor, id);
    const body = (await request.json()) as UpdatePlantInput;
    const data = await updatePlant(id, body);
    return Response.json({ data });
  } catch (error) {
    const status = error instanceof PlantServiceError || error instanceof AccessError ? error.status : 500;
    const code = error instanceof AccessError ? error.code : "PLANT_UPDATE_ERROR";
    const message = error instanceof Error ? error.message : "Failed to update plant";
    return Response.json({ error: { code, message } }, { status });
  }
});

plants.delete("/:id", async (c) => {
  const request = c.req.raw;
  try {
    const { id } = c.req.param();
    const actor = await requireActor(readCookie(request, SESSION_COOKIE));
    assertCanDeletePlant(actor, id);
    await deletePlant(id);
    return Response.json({ data: { id, deleted: true } });
  } catch (error) {
    const status = error instanceof PlantServiceError || error instanceof AccessError ? error.status : 500;
    const code = error instanceof AccessError ? error.code : "PLANT_DELETE_ERROR";
    const message = error instanceof Error ? error.message : "Failed to delete plant";
    return Response.json({ error: { code, message } }, { status });
  }
});
