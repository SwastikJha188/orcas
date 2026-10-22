import { Hono } from "hono";
import { currentUserId, fail, failFrom, isSuperAdmin, ok, readCookie, requestScope } from "@backend/http";
import { AccessError, assertCanEditPlant, requireActor, requirePlant, type Actor } from "@backend/services/access-service";
import { SESSION_COOKIE } from "@backend/services/auth-service";
import {
  deleteEquipmentMapping,
  deleteMaterialMapping,
  processDueSapOutbox,
  publishSapReadings,
  sapSimStatus,
  savePointMappings,
  startSimulatedSap,
  stopSimulatedSap,
  updateSapSim,
  raiseSapNotification,
  retrySapWrite,
  sapDashboard,
  saveEquipmentMapping,
  saveMaterialMapping,
  saveSapConnection,
  syncSapPlant,
  testSapPlant,
} from "@backend/sap/service";
import { SAP_RESOURCE_NAMES, SapError, type SapConnectionInput, type SapResourceName } from "@backend/sap/types";

/**
 * /api/sap — the plant's SAP integration (Maintenance › SAP).
 *
 *   GET    /?plantId=                 connection, cached SAP records, mappings, sync runs, outbox, audit
 *   PUT    /connection                save the connection (plant managers and plant administrators)
 *   POST   /connection/test           try the connection
 *   POST   /sync                      read SAP into the cache (all resources, or { resources })
 *   POST   /notifications             raise a notification for a machine problem
 *   POST   /outbox/process            send writes that are due
 *   POST   /outbox/:id/retry          try a failed write again
 *   PUT    /mappings/equipment        machine ↔ SAP equipment
 *   DELETE /mappings/equipment/:machineId
 *   PUT    /mappings/materials        machine part ↔ SAP material
 *   DELETE /mappings/materials/:id
 *   PUT    /mappings/points           measurements ↔ SAP measuring points ({ rows })
 *   POST   /publish                   send the linked measurements' latest readings
 *
 *   Simulation tab (super administrator):
 *   GET    /simulation?plantId=       the plant's simulated SAP: settings and counts
 *   POST   /simulation/start          start it (again from scratch) and link the plant
 *   PUT    /simulation                change how it behaves
 *   DELETE /simulation?plantId=       stop it
 *
 * Reading needs the plant in the account's scope; changes need write access
 * to the plant (or an all-plants role).
 */
export const sap = new Hono();

const sapFail = (error: unknown, code: string) => (error instanceof SapError ? fail(error.status, "SAP_FAILED", error.message) : failFrom(error, code));

function assertCanWritePlant(actor: Actor, plantId: string): void {
  if (actor.allPlants) return;
  const level = actor.plants.get(plantId);
  if (level === "admin" || level === "write") return;
  throw new AccessError("You can only read this plant's SAP data.");
}

async function body(request: Request): Promise<Record<string, unknown>> {
  return ((await request.json().catch(() => null)) as Record<string, unknown> | null) ?? {};
}

/** The signed-in writer and the plant of the request; throws the access failure. */
async function writer(request: Request, b: Record<string, unknown>, manage = false): Promise<{ actor: Actor; plantId: string }> {
  const plantId = typeof b.plantId === "string" ? b.plantId : new URL(request.url).searchParams.get("plantId");
  if (!plantId) throw new AccessError("Say which plant (plantId).", 400, "INVALID_INPUT");
  const actor = await requireActor(readCookie(request, SESSION_COOKIE));
  requirePlant(await requestScope(request), plantId);
  if (manage) assertCanEditPlant(actor, plantId);
  else assertCanWritePlant(actor, plantId);
  return { actor, plantId };
}

sap.get("/", async (c) => {
  const request = c.req.raw;
  try {
    const plantId = new URL(request.url).searchParams.get("plantId");
    if (!plantId) return fail(400, "INVALID_INPUT", "Say which plant (plantId).");
    requirePlant(await requestScope(request), plantId);
    return ok(await sapDashboard(plantId));
  } catch (error) {
    return sapFail(error, "SAP_FAILED");
  }
});

sap.put("/connection", async (c) => {
  const request = c.req.raw;
  try {
    const b = await body(request);
    const { actor, plantId } = await writer(request, b, true);
    return ok(await saveSapConnection({ ...(b as unknown as SapConnectionInput), plantId }, actor.id));
  } catch (error) {
    return sapFail(error, "SAP_CONNECTION_FAILED");
  }
});

sap.post("/connection/test", async (c) => {
  const request = c.req.raw;
  try {
    const b = await body(request);
    const { actor, plantId } = await writer(request, b, true);
    return ok(await testSapPlant(plantId, actor.id));
  } catch (error) {
    return sapFail(error, "SAP_TEST_FAILED");
  }
});

sap.post("/sync", async (c) => {
  const request = c.req.raw;
  try {
    const b = await body(request);
    const { actor, plantId } = await writer(request, b);
    const wanted = Array.isArray(b.resources) ? b.resources.filter((r): r is SapResourceName => SAP_RESOURCE_NAMES.includes(r as SapResourceName)) : undefined;
    // Due writes go first, so the sync reads what they created.
    await processDueSapOutbox(plantId, actor.id);
    return ok(await syncSapPlant(plantId, actor.id, wanted));
  } catch (error) {
    return sapFail(error, "SAP_SYNC_FAILED");
  }
});

sap.post("/notifications", async (c) => {
  const request = c.req.raw;
  try {
    const b = await body(request);
    const { actor, plantId } = await writer(request, b);
    const str = (k: string) => (typeof b[k] === "string" ? (b[k] as string) : null);
    const machineId = str("machineId");
    if (!machineId) return fail(400, "INVALID_INPUT", "Say which machine (machineId).");
    return ok(await raiseSapNotification(plantId, { machineId, ruleCode: str("ruleCode"), title: str("title") ?? "", detail: str("detail"), priority: str("priority") }, actor.id));
  } catch (error) {
    return sapFail(error, "SAP_NOTIFICATION_FAILED");
  }
});

sap.post("/outbox/process", async (c) => {
  const request = c.req.raw;
  try {
    const b = await body(request);
    const { actor, plantId } = await writer(request, b);
    return ok({ processed: await processDueSapOutbox(plantId, actor.id) });
  } catch (error) {
    return sapFail(error, "SAP_OUTBOX_FAILED");
  }
});

sap.post("/outbox/:id/retry", async (c) => {
  const request = c.req.raw;
  try {
    const b = await body(request);
    const { actor, plantId } = await writer(request, b);
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id <= 0) return fail(400, "INVALID_INPUT", "Unknown write.");
    await retrySapWrite(plantId, id, actor.id);
    return ok({ id });
  } catch (error) {
    return sapFail(error, "SAP_RETRY_FAILED");
  }
});

sap.put("/mappings/equipment", async (c) => {
  const request = c.req.raw;
  try {
    const b = await body(request);
    const { actor, plantId } = await writer(request, b);
    const str = (k: string) => (typeof b[k] === "string" ? (b[k] as string) : null);
    const machineId = str("machineId");
    if (!machineId) return fail(400, "INVALID_INPUT", "Pick the machine.");
    await saveEquipmentMapping(plantId, { machineId, sapEquipmentId: str("sapEquipmentId") ?? "", functionalLocation: str("functionalLocation"), workCenter: str("workCenter"), costCenter: str("costCenter") }, actor.id);
    return ok({ machineId });
  } catch (error) {
    return sapFail(error, "SAP_MAPPING_FAILED");
  }
});

sap.delete("/mappings/equipment/:machineId", async (c) => {
  const request = c.req.raw;
  try {
    const { actor, plantId } = await writer(request, {});
    await deleteEquipmentMapping(plantId, c.req.param("machineId"), actor.id);
    return ok({ machineId: c.req.param("machineId") });
  } catch (error) {
    return sapFail(error, "SAP_MAPPING_FAILED");
  }
});

sap.put("/mappings/materials", async (c) => {
  const request = c.req.raw;
  try {
    const b = await body(request);
    const { actor, plantId } = await writer(request, b);
    const str = (k: string) => (typeof b[k] === "string" ? (b[k] as string) : null);
    const machineId = str("machineId");
    if (!machineId) return fail(400, "INVALID_INPUT", "Pick the machine.");
    const qty = b.requiredQuantity === null || b.requiredQuantity === undefined || b.requiredQuantity === "" ? null : Number(b.requiredQuantity);
    await saveMaterialMapping(
      plantId,
      { machineId, partId: str("partId"), description: str("description") ?? "", sapMaterial: str("sapMaterial") ?? "", storageLocation: str("storageLocation"), requiredQuantity: qty, unit: str("unit") },
      actor.id,
    );
    return ok({ machineId });
  } catch (error) {
    return sapFail(error, "SAP_MAPPING_FAILED");
  }
});

sap.delete("/mappings/materials/:id", async (c) => {
  const request = c.req.raw;
  try {
    const { actor, plantId } = await writer(request, {});
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id <= 0) return fail(400, "INVALID_INPUT", "Unknown mapping.");
    await deleteMaterialMapping(plantId, id, actor.id);
    return ok({ id });
  } catch (error) {
    return sapFail(error, "SAP_MAPPING_FAILED");
  }
});

sap.put("/mappings/points", async (c) => {
  const request = c.req.raw;
  try {
    const b = await body(request);
    const { actor, plantId } = await writer(request, b);
    const rows = Array.isArray(b.rows)
      ? b.rows.flatMap((r: unknown) => {
          const x = r as Record<string, unknown>;
          return typeof x?.measurementId === "string" ? [{ measurementId: x.measurementId, sapPoint: typeof x.sapPoint === "string" ? x.sapPoint : null }] : [];
        })
      : [];
    if (!rows.length) return fail(400, "INVALID_INPUT", "Send { rows: [{ measurementId, sapPoint }] }.");
    return ok({ saved: await savePointMappings(plantId, rows, actor.id) });
  } catch (error) {
    return sapFail(error, "SAP_MAPPING_FAILED");
  }
});

sap.post("/publish", async (c) => {
  const request = c.req.raw;
  try {
    const b = await body(request);
    const { actor, plantId } = await writer(request, b);
    return ok(await publishSapReadings(plantId, actor.id));
  } catch (error) {
    return sapFail(error, "SAP_PUBLISH_FAILED");
  }
});

/* ------------------------------------------------- simulation (super admin) */

async function simPlant(request: Request, b: Record<string, unknown>): Promise<string | Response> {
  if (!(await isSuperAdmin(request))) return fail(403, "FORBIDDEN", "Only the Oswar administrator runs simulations.");
  const plantId = typeof b.plantId === "string" ? b.plantId : new URL(request.url).searchParams.get("plantId");
  if (!plantId) return fail(400, "INVALID_INPUT", "Say which plant (plantId).");
  return plantId;
}

sap.get("/simulation", async (c) => {
  try {
    const plantId = await simPlant(c.req.raw, {});
    if (plantId instanceof Response) return plantId;
    return ok(await sapSimStatus(plantId));
  } catch (error) {
    return sapFail(error, "SAP_SIM_FAILED");
  }
});

sap.post("/simulation/start", async (c) => {
  const request = c.req.raw;
  try {
    const b = await body(request);
    const plantId = await simPlant(request, b);
    if (plantId instanceof Response) return plantId;
    const user = await currentUserId(request);
    return ok(await startSimulatedSap(plantId, user, { replace: b.replace === true }));
  } catch (error) {
    return sapFail(error, "SAP_SIM_FAILED");
  }
});

sap.put("/simulation", async (c) => {
  const request = c.req.raw;
  try {
    const b = await body(request);
    const plantId = await simPlant(request, b);
    if (plantId instanceof Response) return plantId;
    const num = (k: string) => (typeof b[k] === "number" ? (b[k] as number) : undefined);
    await updateSapSim(
      plantId,
      {
        plannerDelayMin: num("plannerDelayMin"),
        releaseDelayMin: num("releaseDelayMin"),
        workHours: num("workHours"),
        verifyHours: num("verifyHours"),
        preventiveEveryDays: num("preventiveEveryDays"),
        productionHours: num("productionHours"),
        latencyMs: num("latencyMs"),
        failureRate: num("failureRate"),
        stockLevel: num("stockLevel"),
        ...(b.slowResourceId !== undefined ? { slowResourceId: typeof b.slowResourceId === "string" ? b.slowResourceId : null } : {}),
      },
      await currentUserId(request),
    );
    return ok(await sapSimStatus(plantId));
  } catch (error) {
    return sapFail(error, "SAP_SIM_FAILED");
  }
});

sap.delete("/simulation", async (c) => {
  try {
    const plantId = await simPlant(c.req.raw, {});
    if (plantId instanceof Response) return plantId;
    return ok(await stopSimulatedSap(plantId));
  } catch (error) {
    return sapFail(error, "SAP_SIM_FAILED");
  }
});
