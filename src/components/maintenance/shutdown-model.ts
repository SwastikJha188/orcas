"use client";

import { useCallback, useMemo, useState } from "react";
import { invalidateApi, useApi } from "@/lib/api-cache";
import { latestByTask } from "@shared/lib/maintenance";
import { isActiveShutdown, isOpenShutdown, scheduleShutdown, type ShutdownSchedule, type WorkBlock } from "@shared/lib/shutdown";
import { isOpenStage, planGenerates } from "@shared/lib/pms";
import { useIndustrialData } from "@/providers/industrial-data-context";
import type { ServicePartRecord } from "@shared/types/maintenance-types";
import type { PmsPlan, PmsWorkOrder, Readiness } from "@shared/types/pms";
import type { ShutdownDetail, ShutdownItem, ShutdownItemKind, ShutdownList, ShutdownState, ShutdownSummary } from "@shared/types/shutdown";
import type { Outcome, PmsData } from "./pms-model";
import { machineName, planRound, woRef } from "./pms-model";
import { partLife } from "./maint-types-model";

/* ==========================================================================
   Maintenance › Shutdown: the plant's shutdowns (/api/maintenance/shutdowns)
   and one shutdown's work, resolved against the planned-maintenance data
   (checklist items, work orders) and the part records, so every row has a
   title, a trade, hours and a readiness state.
   ========================================================================== */

export const SHUTDOWNS_URL = "/api/maintenance/shutdowns";

export const useShutdownList = (plantId: string | null) => useApi<ShutdownList>(plantId ? `${SHUTDOWNS_URL}?plantId=${encodeURIComponent(plantId)}` : null);
/** Closed shutdowns of the plant with their work, for the report in History. */
export const useShutdownReports = (plantId: string | null) => useApi<ShutdownDetail[]>(plantId ? `${SHUTDOWNS_URL}/reports?plantId=${encodeURIComponent(plantId)}` : null);
/** One shutdown; re-read every minute while it is under way (stop and start times come from the readings). */
export function useShutdown(id: number | null, active: boolean) {
  return useApi<ShutdownDetail>(id === null ? null : `${SHUTDOWNS_URL}/${id}`, { refreshMs: active ? 60_000 : undefined });
}

/** One shutdown call; refreshes the cached reads it changes. */
export async function shutdownCall<T = ShutdownDetail>(path: string, method: "POST" | "PATCH" | "PUT" | "DELETE", body: unknown, fallback: string): Promise<{ data: T } | { error: string }> {
  try {
    const res = await fetch(`${SHUTDOWNS_URL}${path}`, { method, headers: { "content-type": "application/json" }, body: method === "DELETE" ? undefined : JSON.stringify(body ?? {}) });
    const json = (await res.json().catch(() => null)) as { data?: T; error?: { message?: string } } | null;
    if (!res.ok || !json || json.data === undefined) throw new Error(json?.error?.message ?? fallback);
    // A state step changes machine states; a SAP send changes the SAP outbox.
    invalidateApi(path.endsWith("/state") || path.endsWith("/sap") ? "/api/" : "/api/maintenance/");
    return { data: json.data };
  } catch (e) {
    return { error: e instanceof Error ? e.message : fallback };
  }
}

export const toOutcome = (out: { data: unknown } | { error: string }, good: string): Outcome => ("error" in out ? { tone: "bad", text: out.error } : { tone: "good", text: good });

/* ------------------------------------------------------------ which shutdown */

const PICK_KEY = "ultron.shutdown.pick";

/** Makes the Shutdown views open on this shutdown (another page's link). */
export function pickShutdown(id: number) {
  try {
    sessionStorage.setItem(PICK_KEY, String(id));
  } catch {
    /* storage unavailable */
  }
}

/**
 * The shutdown the views show: the one picked here (kept for the session), else the
 * one under way, else the next one planned, else the latest.
 */
export function useShutdownPick(list: ShutdownSummary[] | undefined): [ShutdownSummary | null, (id: number) => void] {
  const [picked, setPicked] = useState<number | null>(() => {
    try {
      const v = Number(sessionStorage.getItem(PICK_KEY));
      return Number.isInteger(v) && v > 0 ? v : null;
    } catch {
      return null;
    }
  });
  const pick = useCallback((id: number) => {
    setPicked(id);
    try {
      sessionStorage.setItem(PICK_KEY, String(id));
    } catch {
      /* storage unavailable */
    }
  }, []);
  const shown = useMemo(() => {
    if (!list?.length) return null;
    const mine = list.find((s) => s.id === picked);
    if (mine) return mine;
    const active = list.find((s) => isActiveShutdown(s.state));
    if (active) return active;
    const upcoming = list.filter((s) => isOpenShutdown(s.state)).sort((a, b) => a.plannedStart.localeCompare(b.plannedStart))[0];
    return upcoming ?? list[0];
  }, [list, picked]);
  return [shown, pick];
}

/* ------------------------------------------------------------ resolved work */

export interface WorkRow {
  item: ShutdownItem;
  machineId: string;
  kind: ShutdownItemKind;
  title: string;
  sub: string;
  /** maintenance_owners code, null when not known. */
  trade: string | null;
  hours: number | null;
  /** Work order readiness, for work orders. */
  readiness: Readiness | null;
  wo: PmsWorkOrder | null;
  part: ServicePartRecord | null;
  status: "done" | "moved" | "open";
}

/** The trade code of a checklist owner field ("ME", "ME / EL" → "ME"). */
const firstTrade = (owner: string | undefined) => owner?.split(/[\s/,+]+/).find(Boolean) ?? null;

function taskOf(plans: PmsPlan[], machineId: string, kind: string, taskId: string): { plan: PmsPlan; task: PmsPlan["tasks"][number] } | null {
  for (const plan of plans) {
    if (plan.machineId !== machineId || plan.kind !== kind) continue;
    const task = plan.tasks.find((t) => t.id === taskId);
    if (task) return { plan, task };
  }
  return null;
}

export function resolveWork(d: ShutdownDetail, data: PmsData | null, parts: ServicePartRecord[] | undefined): WorkRow[] {
  const out: WorkRow[] = [];
  for (const item of d.work) {
    const status = item.moved ? "moved" : item.done ? "done" : "open";
    if (item.kind === "task") {
      const hit = data ? taskOf(data.plans, item.machineId!, item.checklistKind!, item.taskId!) : null;
      out.push({
        item,
        machineId: item.machineId!,
        kind: "task",
        title: hit ? `${hit.task.tag ? `${hit.task.tag} · ` : ""}${hit.task.component}` : item.taskId!,
        sub: hit ? `${item.taskId} · ${planRound(hit.plan)}${item.checklistKind === "sensor" ? " · instruments" : ""}` : `${item.taskId}`,
        trade: firstTrade(hit?.task.owner),
        hours: item.estimateHours,
        readiness: null,
        wo: null,
        part: null,
        status,
      });
    } else if (item.kind === "work_order") {
      const wo = data?.workOrders.find((w) => w.id === item.workOrderId) ?? null;
      out.push({
        item,
        machineId: wo?.machineId ?? "",
        kind: "work_order",
        title: wo?.title ?? woRef(item.workOrderId!),
        sub: `${woRef(item.workOrderId!)}${wo?.component ? ` · ${wo.component}` : ""}${wo ? ` · ${wo.priority}` : ""}`,
        trade: item.owner,
        hours: wo?.estimateHours ?? null,
        readiness: wo?.readiness ?? null,
        wo,
        part: null,
        status,
      });
    } else {
      const part = parts?.find((p) => p.id === item.partId) ?? null;
      out.push({
        item,
        machineId: part?.machineId ?? "",
        kind: "part",
        title: part ? `Replace ${part.name}` : `Part ${item.partId}`,
        sub: part ? `${part.subName ?? "Part"} · ${part.id}` : `${item.partId}`,
        trade: item.owner,
        hours: item.estimateHours,
        readiness: null,
        wo: null,
        part,
        status,
      });
    }
  }
  return out;
}

/** Work items still open in the plan (moved ones left out). */
export const inPlan = (rows: WorkRow[]) => rows.filter((r) => r.status !== "moved");

/** The shutdown's timeline from its work starting at `start` (only the open work when `onlyOpen`); cool-downs count from `coolFrom`. */
export function shutdownSchedule(d: ShutdownDetail, rows: WorkRow[], start: number, onlyOpen = false, coolFrom: number = start): ShutdownSchedule {
  const work: WorkBlock[] = [];
  for (const r of inPlan(rows)) {
    if (onlyOpen && r.status === "done") continue;
    if (r.trade && r.hours) work.push({ machineId: r.machineId, trade: r.trade, hours: r.hours });
  }
  return scheduleShutdown(start, d.machines, work, d.crews, coolFrom);
}

/** Planned work not on the timeline: without an estimate, or (work orders, parts) without a trade. */
export function offTimeline(rows: WorkRow[]): { noHours: number; noTrade: number } {
  const plan = inPlan(rows);
  return { noHours: plan.filter((r) => !r.hours).length, noTrade: plan.filter((r) => r.hours && !r.trade).length };
}

/* ------------------------------------------------------------ work to collect */

export interface Candidate {
  key: string;
  group: "stop" | "due" | "wo" | "part";
  machineId: string;
  title: string;
  sub: string;
  item: { kind: ShutdownItemKind; machineId?: string; checklistKind?: "equipment" | "sensor"; taskId?: string; workOrderId?: number; partId?: string };
}

export const CANDIDATE_GROUPS: Record<Candidate["group"], string> = {
  stop: "Done at every planned stop",
  due: "Need the machine stopped and fall due",
  wo: "Work orders that need the machine stopped",
  part: "Parts to replace",
};

const H = 3_600_000;

/**
 * Work that belongs in a shutdown of `machines`: every planned-stop checklist item, the
 * stopped-machine items that fall due by `horizon` (the next shutdown's start, else this
 * one's end), open work orders done with the machine stopped and parts whose life calls
 * for a replacement by then. `existing` keys (already in the shutdown) are left out.
 */
export function collectCandidates(
  data: PmsData | null,
  parts: ServicePartRecord[] | undefined,
  counter: (machineId: string) => number | null,
  machines: string[],
  horizon: number,
  now: number,
  existing: Set<string> = new Set(),
): Candidate[] {
  if (!data) return [];
  const on = new Set(machines);
  const out: Candidate[] = [];
  const seen = new Set(existing);
  const add = (c: Candidate) => {
    if (seen.has(c.key)) return;
    seen.add(c.key);
    out.push(c);
  };
  const latest = new Map<string, ReturnType<typeof latestByTask>>();
  const latestOf = (m: string, kind: string) => {
    const k = `${m}|${kind}`;
    if (!latest.has(k)) latest.set(k, latestByTask(data.records.filter((r) => r.machineId === m && r.kind === kind)));
    return latest.get(k)!;
  };
  for (const p of data.plans) {
    if (!on.has(p.machineId) || !planGenerates(p)) continue;
    for (const t of p.tasks) {
      const key = taskKey(p.machineId, p.kind, t.id);
      const item = { kind: "task" as const, machineId: p.machineId, checklistKind: p.kind, taskId: t.id };
      const title = `${t.tag ? `${t.tag} · ` : ""}${t.component}`;
      if (p.route === "stop") {
        add({ key, group: "stop", machineId: p.machineId, title, sub: `${t.id} · ${planRound(p)}`, item });
        continue;
      }
      if (t.mode !== "OFF" || p.intervalHours === null) continue;
      const rec = latestOf(p.machineId, p.kind).get(t.id);
      // An open defect or hold is followed up through its work order.
      if (rec && (rec.result === "Defect" || rec.result === "Hold")) continue;
      const next = rec ? Date.parse(rec.recordedAt) + p.intervalHours * H : Math.min(Date.parse(p.activatedAt), now);
      if (next <= horizon) add({ key, group: "due", machineId: p.machineId, title, sub: `${t.id} · ${planRound(p)}`, item });
    }
  }
  for (const w of data.workOrders) {
    if (!on.has(w.machineId) || w.workMode !== "Isolate" || !isOpenStage(w.stage) || w.status === "done" || w.status === "cancelled") continue;
    add({ key: `w:${w.id}`, group: "wo", machineId: w.machineId, title: w.title, sub: `${woRef(w.id)} · ${w.priority}`, item: { kind: "work_order", workOrderId: w.id } });
  }
  for (const part of parts ?? []) {
    if (!on.has(part.machineId)) continue;
    const life = partLife(part, counter(part.machineId), now);
    if (life.state === "ok" && (life.planBy === null || life.planBy > horizon)) continue;
    add({ key: `r:${part.id}`, group: "part", machineId: part.machineId, title: `Replace ${part.name}`, sub: `${part.subName ?? "Part"} · ${Math.round(life.share * 100)} % of its life used`, item: { kind: "part", partId: part.id } });
  }
  return out;
}

export const taskKey = (machineId: string, kind: string, taskId: string) => `t:${machineId}|${kind}|${taskId}`;

/** Keys of the items already in a shutdown (to leave them out of the candidates). */
export function itemKeys(d: ShutdownDetail): Set<string> {
  return new Set(
    d.work.map((i) => (i.kind === "task" ? taskKey(i.machineId!, i.checklistKind!, i.taskId!) : i.kind === "work_order" ? `w:${i.workOrderId}` : `r:${i.partId}`)),
  );
}

/** The next planned shutdown of the plant after this one ends (its start bounds what falls due). */
export function nextShutdownStart(list: ShutdownSummary[], after: number, except: number | null): number | null {
  const next = list
    .filter((s) => s.id !== except && isOpenShutdown(s.state) && Date.parse(s.plannedStart) > after)
    .sort((a, b) => a.plannedStart.localeCompare(b.plannedStart))[0];
  return next ? Date.parse(next.plannedStart) : null;
}

/* ------------------------------------------------------------ report */

const H_MS = 3_600_000;

export interface ShutdownReport {
  d: ShutdownDetail;
  rows: WorkRow[];
  /** Planned window and the time the line was actually stopped (stop began → restart approved), in hours. */
  plannedH: number;
  actualH: number | null;
  /** Hours the stop began after (+) or before (−) the planned start. */
  startDelayH: number | null;
  total: number;
  done: number;
  moved: number;
  found: number;
  /** Work hours of the finished items and of the whole plan (moved left out). */
  doneH: number;
  planH: number;
  partsUsed: WorkRow[];
  sapOrders: number;
}

export function shutdownReport(d: ShutdownDetail, rows: WorkRow[]): ShutdownReport {
  const stop = d.phases.stopping ? Date.parse(d.phases.stopping) : null;
  const restart = d.phases.restarting ? Date.parse(d.phases.restarting) : null;
  const plan = inPlan(rows);
  return {
    d,
    rows,
    plannedH: (Date.parse(d.plannedEnd) - Date.parse(d.plannedStart)) / H_MS,
    actualH: stop !== null && restart !== null ? (restart - stop) / H_MS : null,
    startDelayH: stop !== null ? (stop - Date.parse(d.plannedStart)) / H_MS : null,
    total: rows.length,
    done: rows.filter((r) => r.status === "done").length,
    moved: rows.length - plan.length,
    found: rows.filter((r) => r.item.found).length,
    doneH: plan.reduce((s, r) => s + (r.status === "done" && r.hours ? r.hours : 0), 0),
    planH: plan.reduce((s, r) => s + (r.hours ?? 0), 0),
    partsUsed: rows.filter((r) => r.kind === "part" && r.status === "done"),
    sapOrders: d.sapOrders.filter((o) => o.state === "completed" && rows.some((r) => r.machineId === o.machineId)).length,
  };
}

const KIND_WORD: Record<ShutdownItemKind, string> = { task: "Checklist item", work_order: "Work order", part: "Part replacement" };

/** The shutdown's work list as CSV: one row per item, times in UTC (ISO 8601). */
export function shutdownCsv(d: ShutdownDetail, rows: WorkRow[], list: ShutdownList | undefined): string {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const orderOf = new Map(d.sapOrders.filter((o) => o.order).map((o) => [o.machineId, o.order]));
  const head = ["Shutdown", "Machine", "Work", "Reference", "Kind", "Trade", "Planned hours", "State", "Done at (UTC)", "Done by", "Result", "Found during the shutdown", "Moved because", "SAP order"];
  const lines = [head.map(esc).join(",")];
  for (const r of rows)
    lines.push(
      [
        d.name,
        machineName(r.machineId),
        r.title,
        r.sub,
        KIND_WORD[r.kind],
        r.trade ? tradeLabel(list, r.trade) : "",
        r.hours ?? "",
        r.status === "done" ? "Done" : r.status === "moved" ? "Moved to the next shutdown" : "Not done",
        r.item.done?.at ?? "",
        r.item.done?.by ?? "",
        r.item.done?.result ?? "",
        r.item.found ? "Yes" : "No",
        r.item.moved?.reason ?? "",
        orderOf.get(r.machineId) ?? "",
      ]
        .map(esc)
        .join(","),
    );
  return lines.join("\n");
}

/** Saves text as a file in the browser. */
export function downloadText(filename: string, text: string, type = "text/csv;charset=utf-8") {
  // A byte-order mark so spreadsheet programs read the file as UTF-8.
  const url = URL.createObjectURL(new Blob([type.startsWith("text/csv") ? `\uFEFF${text}` : text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.replace(/[^\w.-]+/g, "_");
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const csvName = (d: ShutdownDetail) => `shutdown-${d.name}-${d.plannedStart.slice(0, 10)}.csv`;

/* ------------------------------------------------------------ words */

/** Hours as read: "40 min", "6 h", "3 d 4 h". */
export function hoursText(h: number | null | undefined): string {
  if (h === null || h === undefined || !Number.isFinite(h)) return "—";
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `${Math.round(h * 10) / 10} h`;
  const d = Math.floor(h / 24);
  const r = Math.round(h - d * 24);
  return r ? `${d} d ${r} h` : `${d} d`;
}

export function stateLabel(list: ShutdownList | undefined, s: ShutdownState): string {
  return list?.vocabulary.states.find((x) => x.id === s)?.label ?? s;
}

export const tradeLabel = (list: ShutdownList | undefined, code: string | null) => (code ? (list?.vocabulary.owners.find((o) => o.code === code)?.label ?? code) : "Trade not set");

/** Machines of the active plant, for names in lists. */
export function useShutdownPlant(): string | null {
  return useIndustrialData().selectedPlantId;
}

export { machineName };
