import { Hono } from "hono";
import { currentUser, fail, signedOut } from "./maintenance-pms-respond";
import { accessFail, requestScope } from "@backend/http";
import { requirePlant } from "@backend/services/access-service";
import { PmsInputError } from "@backend/services/pms-service";
import {
  addIsolation,
  addShutdownItems,
  createShutdown,
  getShutdown,
  listShutdowns,
  removeIsolation,
  removeShutdownItem,
  sendShutdownToSap,
  shutdownReports,
  setShutdownCrew,
  shutdownPlant,
  transitionShutdown,
  updateIsolation,
  updateShutdown,
  updateShutdownItem,
} from "@backend/services/shutdown-service";

/** /api/maintenance/shutdowns */
export const shutdowns = new Hono();

const body = async (request: Request) => (await request.json()) as Record<string, unknown>;

/** Runs a write on one shutdown: signed in, and the shutdown's plant in the caller's scope. */
function write(code: string, fallback: string, run: (id: number, request: Request, userId: string, params: Record<string, string>) => Promise<unknown>, status = 200) {
  return async (c: { req: { raw: Request; param: () => Record<string, string> } }) => {
    const request = c.req.raw;
    try {
      const userId = await currentUser(request);
      if (!userId) return signedOut();
      const params = c.req.param();
      const id = Number(params.id);
      requirePlant(await requestScope(request), await shutdownPlant(id));
      return Response.json({ data: await run(id, request, userId, params) }, { status });
    } catch (error) {
      return accessFail(error) ?? fail(error, code, fallback);
    }
  };
}

shutdowns.get("/", async (c) => {
  const request = c.req.raw;
  try {
    const plantId = new URL(request.url).searchParams.get("plantId");
    if (!plantId) throw new PmsInputError("plantId is required");
    requirePlant(await requestScope(request), plantId);
    return Response.json({ data: await listShutdowns(plantId, await currentUser(request)) });
  } catch (error) {
    return accessFail(error) ?? fail(error, "SHUTDOWNS_ERROR", "Failed to load the shutdowns");
  }
});

shutdowns.get("/reports", async (c) => {
  const request = c.req.raw;
  try {
    const plantId = new URL(request.url).searchParams.get("plantId");
    if (!plantId) throw new PmsInputError("plantId is required");
    requirePlant(await requestScope(request), plantId);
    return Response.json({ data: await shutdownReports(plantId) });
  } catch (error) {
    return accessFail(error) ?? fail(error, "SHUTDOWN_REPORTS_ERROR", "Failed to load the shutdown reports");
  }
});

shutdowns.post("/", async (c) => {
  const request = c.req.raw;
  try {
    const userId = await currentUser(request);
    if (!userId) return signedOut();
    const input = await body(request);
    requirePlant(await requestScope(request), typeof input.plantId === "string" ? input.plantId : null);
    return Response.json({ data: await createShutdown(input, userId) }, { status: 201 });
  } catch (error) {
    return accessFail(error) ?? fail(error, "SHUTDOWN_CREATE_ERROR", "Failed to plan the shutdown");
  }
});

shutdowns.get("/:id", async (c) => {
  const request = c.req.raw;
  try {
    const id = Number(c.req.param().id);
    requirePlant(await requestScope(request), await shutdownPlant(id));
    return Response.json({ data: await getShutdown(id) });
  } catch (error) {
    return accessFail(error) ?? fail(error, "SHUTDOWN_ERROR", "Failed to load the shutdown");
  }
});

shutdowns.patch("/:id", write("SHUTDOWN_UPDATE_ERROR", "Failed to save the shutdown", async (id, request, userId) => updateShutdown(id, await body(request), userId)));
shutdowns.post("/:id/state", write("SHUTDOWN_STATE_ERROR", "Failed to change the shutdown", async (id, request, userId) => transitionShutdown(id, await body(request), userId)));
shutdowns.post("/:id/items", write("SHUTDOWN_ITEMS_ERROR", "Failed to add the work", async (id, request, userId) => addShutdownItems(id, await body(request), userId)));
shutdowns.patch("/:id/items/:itemId", write("SHUTDOWN_ITEM_ERROR", "Failed to change the item", async (id, request, userId, p) => updateShutdownItem(id, Number(p.itemId), await body(request), userId)));
shutdowns.delete("/:id/items/:itemId", write("SHUTDOWN_ITEM_ERROR", "Failed to remove the item", async (id, _request, userId, p) => removeShutdownItem(id, Number(p.itemId), userId)));
shutdowns.post("/:id/sap", write("SHUTDOWN_SAP_ERROR", "Failed to send the work list to SAP", async (id, _request, userId) => sendShutdownToSap(id, userId)));
shutdowns.put("/:id/crews", write("SHUTDOWN_CREW_ERROR", "Failed to save the crew", async (id, request, userId) => setShutdownCrew(id, await body(request), userId)));
shutdowns.post("/:id/isolations", write("SHUTDOWN_ISOLATION_ERROR", "Failed to add the lock-off point", async (id, request, userId) => addIsolation(id, await body(request), userId)));
shutdowns.patch("/:id/isolations/:isoId", write("SHUTDOWN_ISOLATION_ERROR", "Failed to change the lock-off point", async (id, request, userId, p) => updateIsolation(id, Number(p.isoId), await body(request), userId)));
shutdowns.delete("/:id/isolations/:isoId", write("SHUTDOWN_ISOLATION_ERROR", "Failed to remove the lock-off point", async (id, _request, userId, p) => removeIsolation(id, Number(p.isoId), userId)));
