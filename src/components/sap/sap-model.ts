"use client";

import { useMemo } from "react";
import type { PmsFinding } from "@/components/maintenance/pms-model";
import { dateField, field, numField, sameSapNumber, sapNumber, type SapDashboard, type SapOutboxJob } from "./sap-api";

/**
 * One reading of the plant's SAP records for every SAP view: records joined
 * to ULTRON's machines through the equipment mapping, order states read from
 * SAP's status line, stock per material, and each problem's thread from
 * ULTRON through SAP. SAP field names differ between releases, so readers try
 * the usual names in turn (sap-api `field`).
 */

type Rec = Record<string, unknown>;
const H = 3600_000;

/** SAP V2 date + Edm.Time ("PT08H30M00S"), or a V4 date + "08:30:00". */
export function dateTime(r: Rec, dateKeys: string[], timeKeys: string[]): number | null {
  const d = dateField(r, ...dateKeys);
  if (d === null) return null;
  const t = field(r, ...timeKeys);
  if (!t) return d;
  const pt = /PT(\d+)H(\d+)M(\d+)?S?/.exec(t) ?? /^(\d{2}):(\d{2}):?(\d{2})?/.exec(t);
  if (!pt) return d;
  const day = Math.floor(d / (24 * H)) * 24 * H;
  return day + (Number(pt[1]) * 60 + Number(pt[2])) * 60_000 + Number(pt[3] ?? 0) * 1000;
}

export type OrderStage = "created" | "released" | "working" | "verifying" | "closed";
export const ORDER_WORD: Record<OrderStage, string> = { created: "Created", released: "Released", working: "In progress", verifying: "Done, being checked", closed: "Closed" };

export interface SapOrder {
  number: string;
  type: string | null;
  description: string;
  equipment: string | null;
  machineId: string | null;
  notification: string | null;
  priority: string | null;
  start: number | null;
  finish: number | null;
  stage: OrderStage;
  status: string | null;
  workCenter: string | null;
  parts: { material: string; description: string | null; sloc: string | null; need: number; unit: string | null; available: number }[];
}

export interface SapNotification {
  number: string;
  text: string;
  type: string | null;
  priority: string | null;
  equipment: string | null;
  machineId: string | null;
  created: number | null;
  order: string | null;
  open: boolean;
  reportedBy: string | null;
}

export interface ProductionOrder {
  number: string;
  material: string | null;
  description: string | null;
  quantity: number | null;
  confirmed: number | null;
  unit: string | null;
  start: number | null;
  end: number | null;
  released: boolean;
  delivered: boolean;
  workCenter: string | null;
  machineId: string | null;
}

export interface Thread {
  finding: PmsFinding | null;
  job: SapOutboxJob | null;
  notification: SapNotification | null;
  order: SapOrder | null;
  machineId: string;
  title: string;
}

function orderStage(r: Rec, now: number): { stage: OrderStage; status: string | null } {
  const status = field(r, "OrderSystemStatus", "MaintenanceOrderSystemStatus", "SystemStatus");
  if (status) {
    if (/\bTECO\b|\bCLSD\b/.test(status)) return { stage: "closed", status };
    if (/\bPCNF\b/.test(status)) return { stage: "working", status };
    if (/\bCNF\b/.test(status)) return { stage: "verifying", status };
    if (/\bREL\b/.test(status)) return { stage: "released", status };
    return { stage: "created", status };
  }
  if (dateField(r, "TechnicalCompletionDate")) return { stage: "closed", status: null };
  if (dateField(r, "ReleaseDate")) {
    const start = dateTime(r, ["MaintOrdBasicStartDate", "BasicStartDate"], ["MaintOrdBasicStartTime"]);
    return { stage: start !== null && start <= now ? "working" : "released", status: null };
  }
  return { stage: "created", status: null };
}

/** Hours in a time-left text such as "3 d 4 h", "2 h 30 min", "45 min"; null when none. */
export function hoursIn(text: string | null | undefined): number | null {
  if (!text || text === "—") return null;
  let h = 0;
  let found = false;
  for (const m of text.matchAll(/(\d+(?:[.,]\d+)?)\s*(d|days?|h|hours?|min|minutes?|w|weeks?)\b/gi)) {
    const n = Number(m[1].replace(",", "."));
    const u = m[2].toLowerCase();
    h += u.startsWith("w") ? n * 168 : u.startsWith("d") ? n * 24 : u.startsWith("h") ? n : n / 60;
    found = true;
  }
  return found ? h : null;
}

export function useSapModel(dash: SapDashboard, findings: PmsFinding[], machineId: string | null) {
  return useMemo(() => {
    const now = Date.now();
    const rec = (k: keyof SapDashboard["records"]) => dash.records[k].map((x) => x.payload);
    const mapped = dash.equipment.filter((e) => e.sapEquipmentId);
    const machineOf = (eq: string | null) => (eq ? (mapped.find((m) => sameSapNumber(m.sapEquipmentId, eq))?.machineId ?? null) : null);
    const inScope = (m: string | null) => m !== null && (!machineId || m === machineId);
    const plantCode = dash.connection?.sapPlant ?? null;
    const ofPlant = (r: Rec, ...keys: string[]) => !plantCode || field(r, ...keys) === plantCode;

    const descriptions = new Map(rec("materials").map((r) => [field(r, "Product", "Material") ?? "", field(r, "ProductDescription", "MaterialName")]));
    const stock = new Map<string, { total: number; unit: string | null; bySloc: { sloc: string; qty: number }[] }>();
    for (const r of rec("materialStock").filter((r) => ofPlant(r, "Plant"))) {
      const m = sapNumber(field(r, "Material")) ?? "";
      const q = numField(r, "MatlWrhsStkQtyInMatlBaseUnit", "StockQuantity", "Quantity") ?? 0;
      const e = stock.get(m) ?? { total: 0, unit: field(r, "MaterialBaseUnit", "BaseUnit"), bySloc: [] };
      e.total += q;
      e.bySloc.push({ sloc: field(r, "StorageLocation") ?? "—", qty: q });
      stock.set(m, e);
    }
    const available = (material: string, sloc: string | null) => {
      const s = stock.get(sapNumber(material) ?? material);
      if (!s) return 0;
      return sloc ? (s.bySloc.find((x) => x.sloc === sloc)?.qty ?? 0) : s.total;
    };
    const parts = new Map<string, SapOrder["parts"]>();
    for (const r of rec("orderComponents")) {
      const o = field(r, "MaintenanceOrder") ?? "";
      const material = field(r, "Material") ?? "";
      const need = numField(r, "RequiredQuantity") ?? 0;
      const withdrawn = numField(r, "WithdrawnQuantity") ?? 0;
      const sloc = field(r, "StorageLocation");
      // Parts already issued to the order are in hand.
      const list = parts.get(o) ?? [];
      list.push({ material, description: descriptions.get(material) ?? null, sloc, need, unit: field(r, "BaseUnit"), available: withdrawn >= need ? need : available(material, sloc) });
      parts.set(o, list);
    }

    const orders: SapOrder[] = rec("maintenanceOrders")
      .map((r) => {
        const eq = field(r, "Equipment", "TechnicalObject");
        const st = orderStage(r, now);
        const number = field(r, "MaintenanceOrder") ?? "";
        return {
          number,
          type: field(r, "MaintenanceOrderType"),
          description: field(r, "MaintenanceOrderDesc", "OrderDescription") ?? "—",
          equipment: eq,
          machineId: machineOf(eq),
          notification: field(r, "MaintenanceNotification"),
          priority: field(r, "MaintPriority"),
          start: dateTime(r, ["MaintOrdBasicStartDate", "BasicStartDate"], ["MaintOrdBasicStartTime"]),
          finish: dateTime(r, ["MaintOrdBasicEndDate", "BasicEndDate"], ["MaintOrdBasicEndTime"]),
          stage: st.stage,
          status: st.status,
          workCenter: field(r, "MainWorkCenter", "WorkCenter"),
          parts: parts.get(number) ?? [],
        };
      })
      .filter((o) => inScope(o.machineId))
      .sort((a, b) => (a.start ?? 0) - (b.start ?? 0));

    const notifications: SapNotification[] = rec("notifications")
      .map((r) => {
        const eq = field(r, "TechnicalObject", "Equipment");
        const number = field(r, "MaintenanceNotification", "Notification") ?? "";
        const order = field(r, "MaintenanceOrder") ?? orders.find((o) => sameSapNumber(o.notification, number))?.number ?? null;
        return {
          number,
          text: field(r, "NotificationText", "MaintenanceNotificationDesc") ?? "—",
          type: field(r, "NotificationType"),
          priority: field(r, "MaintPriority"),
          equipment: eq,
          machineId: machineOf(eq),
          created: dateTime(r, ["NotificationCreationDate", "CreationDate"], ["NotificationCreationTime", "CreationTime"]),
          order,
          open: !field(r, "CompletionDate", "NotificationCompletionDate") && !["4", "5"].includes(field(r, "NotifProcessingPhase", "MaintNotifProcessingPhase") ?? ""),
          reportedBy: field(r, "ReportedByUser"),
        };
      })
      .filter((n) => inScope(n.machineId))
      .sort((a, b) => (b.created ?? 0) - (a.created ?? 0));

    const workCenterMachine = new Map(mapped.filter((m) => m.workCenter).map((m) => [m.workCenter!.replace(/^WC-/, ""), m.machineId]));
    const production: ProductionOrder[] = rec("productionOrders")
      .filter((r) => ofPlant(r, "ProductionPlant", "Plant"))
      .map((r) => {
        const wc = field(r, "WorkCenter");
        return {
          number: field(r, "ProductionOrder", "ManufacturingOrder") ?? "",
          material: field(r, "Material", "Product"),
          description: field(r, "MaterialName", "ProductDescription"),
          quantity: numField(r, "TotalQuantity", "MfgOrderPlannedTotalQty"),
          confirmed: numField(r, "MfgOrderConfirmedYieldQty", "ConfirmedYieldQuantity"),
          unit: field(r, "ProductionUnit"),
          start: dateTime(r, ["MfgOrderPlannedStartDate", "MfgOrderScheduledStartDate"], ["MfgOrderPlannedStartTime", "MfgOrderScheduledStartTime"]),
          end: dateTime(r, ["MfgOrderPlannedEndDate", "MfgOrderScheduledEndDate"], ["MfgOrderPlannedEndTime", "MfgOrderScheduledEndTime"]),
          released: ["X", "true"].includes(field(r, "OrderIsReleased") ?? ""),
          delivered: ["X", "true"].includes(field(r, "OrderIsDelivered") ?? ""),
          workCenter: wc,
          machineId: machineOf(field(r, "Equipment")) ?? (wc ? (workCenterMachine.get(wc) ?? null) : null),
        };
      })
      .sort((a, b) => (a.start ?? 0) - (b.start ?? 0));

    // One thread per problem raised from ULTRON, plus the open problems not raised yet.
    const scopedFindings = findings.filter((f) => f.status === "ACTIVE" && (!machineId || f.machineId === machineId));
    const jobs = dash.outbox.filter((o) => o.resource === "notifications" && o.machineId && (!machineId || o.machineId === machineId));
    const threads: Thread[] = [];
    for (const job of jobs) {
      const finding = scopedFindings.find((f) => f.machineId === job.machineId && f.ruleId === job.ruleCode) ?? null;
      if (threads.some((t) => t.job && t.job.machineId === job.machineId && t.job.ruleCode === job.ruleCode)) continue;
      const notification = job.objectKey ? (notifications.find((n) => sameSapNumber(n.number, job.objectKey)) ?? null) : null;
      const order = notification?.order ? (orders.find((o) => sameSapNumber(o.number, notification.order)) ?? null) : null;
      threads.push({ finding, job, notification, order, machineId: job.machineId!, title: job.title ?? finding?.plainTitle ?? finding?.name ?? "Problem" });
    }
    for (const f of scopedFindings) {
      if (threads.some((t) => t.machineId === f.machineId && t.job?.ruleCode === f.ruleId)) continue;
      threads.push({ finding: f, job: null, notification: null, order: null, machineId: f.machineId, title: f.plainTitle || f.name });
    }

    return {
      now,
      mapped,
      machineOf,
      eqOf: (m: string) => mapped.find((e) => e.machineId === m)?.sapEquipmentId ?? null,
      synced: dash.syncRuns.length > 0,
      orders,
      notifications,
      production,
      stock,
      descriptions,
      threads,
      equipmentRecords: rec("equipment"),
      measuringPoints: rec("measuringPoints"),
    };
  }, [dash, findings, machineId]);
}

export type SapModel = ReturnType<typeof useSapModel>;

/** Where a thread stands: 0 found, 1 notification, 2 order, 3 work, 4 verifying, 5 closed. */
export function threadStep(t: Thread): number {
  if (t.order) return { created: 2, released: 2, working: 3, verifying: 4, closed: 5 }[t.order.stage];
  if (t.notification || t.job?.state === "completed") return 1;
  return 0;
}

export const kitShare = (o: SapOrder) => (o.parts.length ? o.parts.filter((p) => p.available >= p.need).length / o.parts.length : 1);
