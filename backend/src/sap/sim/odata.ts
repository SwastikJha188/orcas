import crypto from "crypto";
import { query } from "@backend/db";
import { SIM_TOKEN_PATH as TOKEN_PATH } from "./origin";
import { SimODataError, advanceSapSim, secretHash, simCreateMeasurementDocument, simCreateNotification, simRow, type SimRow } from "./engine";

/**
 * The SAP simulator's front door: answers `fetch`-style requests to
 * SIM_ORIGIN the way SAP Gateway does, so the integration's real client code
 * (sign-in, CSRF tokens, paging, V2 / V4 payloads, errors) is what runs.
 *
 *   POST /sap/bc/sec/oauth2/token        client credentials → bearer token
 *   GET  <resource path>[?$top&$skiptoken]  OData V2 (`d.results`, `/Date()/`)
 *                                        or V4 (`value`) like the real API
 *   GET  with x-csrf-token: Fetch         → a CSRF token for the next write
 *   POST notifications, measurement documents
 *
 * Every answer waits the plant's latency; a share of them fail like an
 * overloaded SAP (503), and the "slow" API times out (504).
 */

const PAGE = 100;

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
const sapError = (status: number, message: string) => json(status, { error: { code: `SY/${status}`, message: { lang: "en", value: message } } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const tokenFor = (s: SimRow) => crypto.createHash("sha256").update(`${s.plant_id}|${s.client_id}|${s.client_secret_hash}`).digest("base64url");
const csrfFor = (s: SimRow) => crypto.createHash("sha256").update(`csrf|${tokenFor(s)}|${new Date().toISOString().slice(0, 10)}`).digest("base64url").slice(0, 24);

/* -------------------------------------------------------------- formatters */

const v2Date = (d: Date | null) => (d ? `/Date(${Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())})/` : null);
const v2DateTime = (d: Date | null) => (d ? `/Date(${d.getTime()})/` : null);
const v2Time = (d: Date | null) => (d ? `PT${String(d.getUTCHours()).padStart(2, "0")}H${String(d.getUTCMinutes()).padStart(2, "0")}M${String(d.getUTCSeconds()).padStart(2, "0")}S` : null);
const isoDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
const isoTime = (d: Date | null) => (d ? d.toISOString().slice(11, 19) : null);
const dec = (n: number, places = 3) => n.toFixed(places);

/** Order status from its planned times, as SAP's system status line reads. */
function orderStatus(o: { created_at: Date; released_at: Date; start_at: Date; finish_at: Date; closed_at: Date }, now: number): string {
  if (now >= o.closed_at.getTime()) return "TECO CNF";
  if (now >= o.finish_at.getTime()) return "CNF";
  if (now >= o.start_at.getTime()) return "REL PCNF";
  if (now >= o.released_at.getTime()) return "REL";
  return "CRTD";
}

/* ------------------------------------------------------------- the records */

async function records(plantId: string, resource: string, s: SimRow): Promise<{ rows: Record<string, unknown>[]; v4: boolean } | null> {
  const now = Date.now();
  switch (resource) {
    case "equipment": {
      const r = await query<{ equipment: string; description: string; floc: string; work_center: string; cost_center: string }>(
        "SELECT equipment, description, floc, work_center, cost_center FROM sap_sim_equipment WHERE plant_id = $1 ORDER BY equipment",
        [plantId],
      );
      return {
        v4: false,
        rows: r.rows.map((e) => ({
          Equipment: e.equipment,
          EquipmentName: e.description,
          FunctionalLocation: e.floc,
          MaintenancePlant: s.plant_code,
          MaintenancePlanningPlant: s.plant_code,
          MainWorkCenter: e.work_center,
          CostCenter: e.cost_center,
          EquipmentCategory: "M",
          TechnicalObjectType: "MACH",
        })),
      };
    }
    case "notifications": {
      const r = await query<{ notification: string; equipment: string; notification_type: string; priority: string | null; text: string; long_text: string | null; reported_by: string; created_at: Date; maintenance_order: string | null; closed_at: Date | null; start_at: Date | null }>(
        `SELECT n.*, o.maintenance_order, o.closed_at, o.start_at FROM sap_sim_notifications n
           LEFT JOIN sap_sim_orders o ON o.plant_id = n.plant_id AND o.notification = n.notification
          WHERE n.plant_id = $1 AND n.created_at <= now() ORDER BY n.created_at DESC`,
        [plantId],
      );
      return {
        v4: true,
        rows: r.rows.map((n) => {
          const done = n.closed_at && n.closed_at.getTime() <= now;
          return {
            MaintenanceNotification: n.notification,
            NotificationType: n.notification_type,
            NotificationText: n.text,
            MaintNotifLongText: n.long_text,
            MaintPriority: n.priority,
            TechnicalObject: n.equipment,
            TechObjIsEquipOrFuncnlLoc: "EAMS_EQUI",
            MaintenancePlanningPlant: s.plant_code,
            ReportedByUser: n.reported_by,
            NotificationCreationDate: isoDate(n.created_at),
            NotificationCreationTime: isoTime(n.created_at),
            NotifProcessingPhase: done ? "4" : n.maintenance_order ? "2" : "1",
            MaintenanceOrder: n.maintenance_order,
            CompletionDate: done ? isoDate(n.closed_at) : null,
          };
        }),
      };
    }
    case "maintenanceOrders": {
      const r = await query<{ maintenance_order: string; order_type: string; equipment: string; notification: string | null; description: string; priority: string | null; created_at: Date; released_at: Date; start_at: Date; finish_at: Date; closed_at: Date; work_center: string }>(
        `SELECT o.*, e.work_center FROM sap_sim_orders o JOIN sap_sim_equipment e ON e.plant_id = o.plant_id AND e.equipment = o.equipment
          WHERE o.plant_id = $1 AND o.created_at <= now() AND o.closed_at > now() - interval '14 days' ORDER BY o.start_at`,
        [plantId],
      );
      return {
        v4: false,
        rows: r.rows.map((o) => ({
          MaintenanceOrder: o.maintenance_order,
          MaintenanceOrderType: o.order_type,
          MaintenanceOrderDesc: o.description,
          Equipment: o.equipment,
          MaintenanceNotification: o.notification,
          MaintPriority: o.priority,
          MainWorkCenter: o.work_center,
          MaintenancePlanningPlant: s.plant_code,
          MaintOrdBasicStartDate: v2Date(o.start_at),
          MaintOrdBasicStartTime: v2Time(o.start_at),
          MaintOrdBasicEndDate: v2Date(o.finish_at),
          MaintOrdBasicEndTime: v2Time(o.finish_at),
          ReleaseDate: now >= o.released_at.getTime() ? v2DateTime(o.released_at) : null,
          TechnicalCompletionDate: now >= o.closed_at.getTime() ? v2DateTime(o.closed_at) : null,
          OrderSystemStatus: orderStatus(o, now),
          CreationDate: v2DateTime(o.created_at),
        })),
      };
    }
    case "orderComponents": {
      const r = await query<{ maintenance_order: string; item: number; material: string; storage_location: string; quantity: number; base_unit: string; released_at: Date }>(
        `SELECT c.maintenance_order, c.item, c.material, c.storage_location, c.quantity, m.base_unit, o.released_at
           FROM sap_sim_order_components c
           JOIN sap_sim_orders o ON o.plant_id = c.plant_id AND o.maintenance_order = c.maintenance_order
           JOIN sap_sim_materials m ON m.plant_id = c.plant_id AND m.material = c.material
          WHERE c.plant_id = $1 AND o.created_at <= now() AND o.closed_at > now() - interval '14 days' ORDER BY c.maintenance_order, c.item`,
        [plantId],
      );
      return {
        v4: false,
        rows: r.rows.map((c) => ({
          MaintenanceOrder: c.maintenance_order,
          MaintenanceOrderComponent: String(c.item).padStart(4, "0"),
          Material: c.material,
          Plant: s.plant_code,
          StorageLocation: c.storage_location,
          RequiredQuantity: dec(c.quantity),
          BaseUnit: c.base_unit,
          WithdrawnQuantity: dec(now >= c.released_at.getTime() ? c.quantity : 0),
          MatlCompRequirementDate: v2Date(c.released_at),
        })),
      };
    }
    case "materials": {
      const r = await query<{ material: string; description: string }>("SELECT material, description FROM sap_sim_materials WHERE plant_id = $1 ORDER BY material", [plantId]);
      return { v4: false, rows: r.rows.map((m) => ({ Product: m.material, Language: "EN", ProductDescription: m.description })) };
    }
    case "materialStock": {
      const r = await query<{ material: string; storage_location: string; qty: number; base_unit: string }>(
        `SELECT s.material, s.storage_location, m.base_unit,
                s.opening_qty * $2 + COALESCE((SELECT sum(quantity) FROM sap_sim_stock_movements x
                  WHERE x.plant_id = s.plant_id AND x.material = s.material AND x.storage_location = s.storage_location AND x.at <= now()), 0) AS qty
           FROM sap_sim_stock s JOIN sap_sim_materials m ON m.plant_id = s.plant_id AND m.material = s.material
          WHERE s.plant_id = $1 ORDER BY s.material, s.storage_location`,
        [plantId, s.stock_level],
      );
      return {
        v4: false,
        rows: r.rows.map((x) => ({
          Material: x.material,
          Plant: s.plant_code,
          StorageLocation: x.storage_location,
          Batch: "",
          Supplier: "",
          Customer: "",
          WBSElementInternalID: "",
          SDDocument: "",
          SDDocumentItem: "",
          InventorySpecialStockType: "",
          InventoryStockType: "01",
          MatlWrhsStkQtyInMatlBaseUnit: dec(Math.max(0, Number(x.qty))),
          MaterialBaseUnit: x.base_unit,
        })),
      };
    }
    case "productionOrders": {
      const r = await query<{ production_order: string; material: string; equipment: string; quantity: number; unit: string; start_at: Date; end_at: Date; description: string; work_center: string }>(
        `SELECT p.production_order, p.material, p.equipment, p.quantity, pr.unit, p.start_at, p.end_at, pr.description, e.work_center
           FROM sap_sim_production_orders p
           JOIN sap_sim_products pr ON pr.plant_id = p.plant_id AND pr.material = p.material
           JOIN sap_sim_equipment e ON e.plant_id = p.plant_id AND e.equipment = p.equipment
          WHERE p.plant_id = $1 AND p.created_at <= now() AND p.end_at > now() - interval '3 days' ORDER BY p.start_at`,
        [plantId],
      );
      return {
        v4: false,
        rows: r.rows.map((p) => {
          const share = Math.min(1, Math.max(0, (now - p.start_at.getTime()) / (p.end_at.getTime() - p.start_at.getTime())));
          return {
            ProductionOrder: p.production_order,
            ManufacturingOrder: p.production_order,
            ProductionOrderType: "PP01",
            Material: p.material,
            MaterialName: p.description,
            ProductionPlant: s.plant_code,
            WorkCenter: p.work_center,
            Equipment: p.equipment,
            TotalQuantity: dec(p.quantity),
            ProductionUnit: p.unit,
            MfgOrderConfirmedYieldQty: dec(Math.round(p.quantity * share)),
            MfgOrderPlannedStartDate: v2Date(p.start_at),
            MfgOrderPlannedStartTime: v2Time(p.start_at),
            MfgOrderPlannedEndDate: v2Date(p.end_at),
            MfgOrderPlannedEndTime: v2Time(p.end_at),
            OrderIsReleased: now >= p.start_at.getTime() - 12 * 3600_000 ? "X" : "",
            OrderIsDelivered: now >= p.end_at.getTime() ? "X" : "",
          };
        }),
      };
    }
    case "measuringPoints": {
      const r = await query<{ measuring_point: string; equipment: string; description: string; unit: string | null; last_at: Date | null; last_reading: number | null }>(
        `SELECT p.measuring_point, p.equipment, p.description, p.unit, d.reading_at AS last_at, d.reading AS last_reading
           FROM sap_sim_measuring_points p
           LEFT JOIN LATERAL (SELECT reading_at, reading FROM sap_sim_measurement_documents d
                               WHERE d.plant_id = p.plant_id AND d.measuring_point = p.measuring_point ORDER BY reading_at DESC LIMIT 1) d ON true
          WHERE p.plant_id = $1 ORDER BY p.measuring_point`,
        [plantId],
      );
      return {
        v4: false,
        rows: r.rows.map((p) => ({
          MeasuringPoint: p.measuring_point,
          MeasuringPointDescription: p.description,
          TechnicalObject: p.equipment,
          Equipment: p.equipment,
          MeasurementRangeUnit: p.unit,
          MsmtRdngIsCounter: false,
          LastMeasurementReading: p.last_reading === null ? null : dec(p.last_reading),
          LastMeasurementDateTime: v2DateTime(p.last_at),
        })),
      };
    }
    case "measurementDocuments": {
      const r = await query<{ document: string; measuring_point: string; reading: number; unit: string | null; reading_at: Date }>(
        "SELECT document, measuring_point, reading, unit, reading_at FROM sap_sim_measurement_documents WHERE plant_id = $1 ORDER BY reading_at DESC LIMIT 500",
        [plantId],
      );
      return {
        v4: true,
        rows: r.rows.map((d) => ({
          MeasurementDocument: d.document,
          MeasuringPoint: d.measuring_point,
          MeasurementReading: dec(d.reading, 4),
          MeasurementReadingEntryUoM: d.unit,
          MsmtRdngDate: isoDate(d.reading_at),
          MsmtRdngTime: isoTime(d.reading_at),
        })),
      };
    }
    default:
      return null;
  }
}

/* ----------------------------------------------------------------- handler */

let pathsCache: { at: number; paths: Map<string, string> } | null = null;

async function resourceOf(pathname: string): Promise<string | null> {
  if (!pathsCache || Date.now() - pathsCache.at > 60_000) {
    const r = await query<{ id: string; default_path: string }>("SELECT id, default_path FROM sap_resources");
    pathsCache = { at: Date.now(), paths: new Map(r.rows.map((x) => [x.default_path.toLowerCase(), x.id])) };
  }
  return pathsCache.paths.get(pathname.replace(/\/+$/, "").toLowerCase()) ?? null;
}

/** Answers one request to the plant's simulated SAP system. */
export async function handleSimRequest(plantId: string, request: Request): Promise<Response> {
  const s = await simRow(plantId);
  const url = new URL(request.url);
  if (!s) return new Response("<html><body>Service unavailable</body></html>", { status: 503, headers: { "content-type": "text/html" } });
  await sleep(Math.round(s.latency_ms * (0.6 + Math.random())));

  if (url.pathname === TOKEN_PATH) {
    if (request.method !== "POST") return sapError(405, "Method not allowed");
    const basic = request.headers.get("authorization")?.replace(/^Basic\s+/i, "") ?? "";
    const [id, secret] = Buffer.from(basic, "base64").toString("utf8").split(":");
    if (id !== s.client_id || !secret || secretHash(secret) !== s.client_secret_hash) return json(401, { error: "invalid_client", error_description: "Bad client credentials" });
    return json(200, { access_token: tokenFor(s), token_type: "bearer", expires_in: 43199, scope: "uaa.resource" });
  }

  if (request.headers.get("authorization") !== `Bearer ${tokenFor(s)}`) return json(401, { error: "invalid_token" }, { "www-authenticate": 'Bearer realm="SAP"' });
  const resource = await resourceOf(url.pathname);
  if (!resource) return sapError(404, `Resource not found for segment '${url.pathname.split("/").pop()}'`);
  if (resource === s.slow_resource_id) return sapError(504, "Gateway timeout: the backend did not answer in time");
  if (Math.random() < s.failure_rate) return sapError(503, "Service temporarily unavailable, try again later");

  await advanceSapSim(plantId);

  if (request.method === "GET" && request.headers.get("x-csrf-token")?.toLowerCase() === "fetch") {
    return json(200, {}, { "x-csrf-token": csrfFor(s), "set-cookie": `SAP_SESSIONID_${s.plant_code}=${tokenFor(s).slice(0, 16)}; path=/; secure; HttpOnly` });
  }

  if (request.method === "POST") {
    if (request.headers.get("x-csrf-token") !== csrfFor(s)) return json(403, { error: { message: "CSRF token validation failed" } }, { "x-csrf-token": "Required" });
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return sapError(400, "The request body is not valid JSON");
    try {
      if (resource === "notifications") return json(201, await simCreateNotification(plantId, body, s.client_id));
      if (resource === "measurementDocuments") return json(201, await simCreateMeasurementDocument(plantId, body));
      return sapError(405, "Create is not supported for this entity set");
    } catch (error) {
      if (error instanceof SimODataError) return sapError(error.status, error.message);
      throw error;
    }
  }
  if (request.method !== "GET") return sapError(405, "Method not allowed");

  const all = await records(plantId, resource, s);
  if (!all) return sapError(404, "Resource not found");
  const top = Math.min(Math.max(Number(url.searchParams.get("$top") ?? PAGE) || PAGE, 1), 1000);
  const skip = Math.max(Number(url.searchParams.get("$skiptoken") ?? url.searchParams.get("$skip") ?? 0) || 0, 0);
  const rows = all.rows.slice(skip, skip + top);
  let next: string | null = null;
  if (skip + top < all.rows.length) {
    const n = new URL(url.toString());
    n.searchParams.set("$skiptoken", String(skip + top));
    next = `${n.pathname}${n.search}`;
  }
  return all.v4
    ? json(200, { "@odata.context": `$metadata#${url.pathname.split("/").pop()}`, value: rows, ...(next ? { "@odata.nextLink": next } : {}) })
    : json(200, { d: { results: rows.map((r) => ({ __metadata: { type: `API.${resource}` }, ...r })), ...(next ? { __next: next } : {}) } });
}
