"use client";

/**
 * Client side of the SAP integration (backend/src/sap, /api/sap): the
 * dashboard URL, the calls the SAP views make, and readers for SAP's OData
 * records (field names differ between SAP releases, so each reader tries the
 * usual names in turn).
 */
import { invalidateApi } from "@/lib/api-cache";
import type { SapDashboard } from "@backend/sap/service";
import type { SapResourceName } from "@backend/sap/types";

export type { SapAuditEntry, SapDashboard, SapEquipmentMapping, SapMaterialMapping, SapOutboxJob, SapSyncRun } from "@backend/sap/service";
export type { PublicSapConnection, SapAuthType, SapResourceName } from "@backend/sap/types";

export const sapUrl = (plantId: string) => `/api/sap?plantId=${encodeURIComponent(plantId)}`;

/** One SAP call; refreshes the SAP reads on success. Answers the error message on failure. */
export async function sapCall<T = unknown>(path: string, method: "POST" | "PUT" | "DELETE", body: Record<string, unknown>, fallback: string): Promise<{ data: T } | { error: string }> {
  try {
    const url = method === "DELETE" ? `/api/sap${path}?plantId=${encodeURIComponent(String(body.plantId ?? ""))}` : `/api/sap${path}`;
    const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: method === "DELETE" ? undefined : JSON.stringify(body) });
    const json = (await res.json().catch(() => null)) as { data?: T; error?: { message?: string } } | null;
    if (!res.ok || !json || json.data === undefined) throw new Error(json?.error?.message ?? fallback);
    invalidateApi("/api/sap");
    return { data: json.data };
  } catch (e) {
    return { error: e instanceof Error ? e.message : fallback };
  }
}

/* ------------------------------------------------------------ OData readers */

type Rec = Record<string, unknown>;

/** The first non-empty of `keys` as text, or null. */
export function field(rec: Rec, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = rec[k];
    if (v === undefined || v === null || v === "") continue;
    if (typeof v === "object") continue;
    return String(v).trim() || null;
  }
  return null;
}

/** A number field (OData V2 sends decimals as strings). */
export function numField(rec: Rec, ...keys: string[]): number | null {
  const v = field(rec, ...keys);
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** A date field: OData V2 `/Date(ms)/`, V4 ISO text, or a plain date. */
export function dateField(rec: Rec, ...keys: string[]): number | null {
  const v = field(rec, ...keys);
  if (!v) return null;
  const legacy = /\/Date\((-?\d+)/.exec(v);
  const t = legacy ? Number(legacy[1]) : Date.parse(v);
  return Number.isFinite(t) && t > 0 ? t : null;
}

/** SAP keeps leading zeros on numbers (000010004712); people read them without. */
export const sapNumber = (v: string | null) => (v && /^\d+$/.test(v) ? v.replace(/^0+(?=\d)/, "") : v);

/** Same object number, with or without SAP's leading zeros. */
export const sameSapNumber = (a: string | null, b: string | null) => Boolean(a && b && sapNumber(a) === sapNumber(b));

/** A resource's name as the database labels it. */
export const resourceLabel = (dash: SapDashboard, id: SapResourceName | null) => (id ? (dash.vocabulary.resources.find((r) => r.id === id)?.label ?? id) : "—");
