"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { invalidateApi, useApi } from "@/lib/api-cache";
import { isConditionRule } from "@/lib/plant-defs";
import { everyText, roundName } from "@/lib/maintenance";
import { STAGE_LABEL, isOpenStage, planDues, readinessBlockers, statusForStage, type PlanDue } from "@/lib/pms";
import { useKilnFleet, usePrimaryMachineId } from "@/providers/kiln-simulation-context";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { useKilnOps } from "@/providers/kiln-ops-context";
import type { Tone } from "@/components/ui";
import type { ChecklistDocument, ChecklistKind, MaintenanceRecord } from "@/types/maintenance";
import type { PmsEvent, PmsLine, PmsPlan, PmsWorkOrder, WoStage } from "@/types/pms";
import type { WorkOrderPriorityDto } from "@/types/monitoring";
import type { MaintenanceTypeId } from "@/types/maintenance-types";
import { useWorkOrderPriorities } from "@/lib/reference-data";

/* ==========================================================================
   Maintenance workspace model: plans, work orders, checklist results and the
   audit trail of every machine on the line (one request), plus the live
   condition findings that may become work requests. Every page derives from it.
   ========================================================================== */

/** A live condition finding (Diagnosis) that may become a work request. */
export interface PmsFinding {
  machineId: string;
  ruleId: string;
  name: string;
  priority: "P1" | "P2" | "P3" | "P4";
  severity: "Normal" | "Alert" | "Critical";
  status: "ACTIVE" | "PENDING";
  evidence: string;
  cause: string;
  consequence: string;
  action: string;
  timeToLimit: string;
  confidence: number;
  subs: string[];
  tags: string[];
  since: number | null;
  owner?: string;
  unproven?: string;
  /** Plain headline, what is happening and what to do (docs/plain-language.md), when the rule carries them. */
  plainTitle?: string;
  plainWhat?: string;
  plainTodo?: string;
  /** Open request / work order already linked to it (no duplicates). */
  workOrderId: number | null;
}

export type QueueKind = "finding" | "wo" | "plan";

export interface QueueItem {
  key: string;
  kind: QueueKind;
  machineId: string;
  priority: string;
  title: string;
  sub: string;
  reason: string;
  next: string;
  status: { label: string; tone: Tone };
  at: number;
  ref: string;
}

export type Outcome = { tone: "good" | "bad"; text: string };

export interface PmsData {
  documents: Record<ChecklistKind, ChecklistDocument>;
  plans: PmsPlan[];
  workOrders: PmsWorkOrder[];
  records: MaintenanceRecord[];
  events: PmsEvent[];
  canApprove: boolean;
  machineIds: string[];
}

/** One planned-maintenance call; refreshes every cached API read on success. */
export async function pmsCall<T = unknown>(url: string, method: "POST" | "PATCH", body: unknown, fallback: string): Promise<{ data: T } | { error: string }> {
  try {
    const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const json = (await res.json()) as { data?: T; error?: { message: string } };
    if (!res.ok || json.data === undefined) throw new Error(json.error?.message ?? fallback);
    invalidateApi("/api/");
    return { data: json.data };
  } catch (e) {
    return { error: e instanceof Error ? e.message : fallback };
  }
}

export const PMS_LINE_URL = "/api/maintenance/pms/line";

export const priorityTone = (p: string): Tone => (p === "P1" ? "bad" : p === "P2" ? "warn" : "idle");

/** Select options for the work-order priorities (database); only the current value while they load. */
export function priorityOptions(list: WorkOrderPriorityDto[] | null, current: string): { value: string; label: string }[] {
  if (!list?.length) return [{ value: current, label: current || "—" }];
  return list.map((p) => ({ value: p.id, label: `${p.id} · ${p.name}` }));
}

/** The machine a page opens on: the plant's primary machine when it has planned maintenance, else the first. */
export function useDefaultMachine(ids: string[] | undefined): string | null {
  const primary = usePrimaryMachineId();
  if (!ids?.length) return null;
  return ids.includes(primary) ? primary : ids[0];
}

/** Machine names from the database (the machines register), kept by `usePmsLine`. */
const MACHINE_NAMES = new Map<string, string>();

/** The machine's register id (shown as a hint next to its name). */
export const machineCode = (id: string) => id;
/** The machine's name from the database; the id until the register has loaded. */
export const machineName = (id: string) => MACHINE_NAMES.get(id) ?? id;

export function stageTone(s: WoStage): Tone {
  if (s === "on_hold" || s === "deferred" || s === "awaiting_verification") return "warn";
  if (s === "in_progress" || s === "released") return "info";
  return "idle";
}

/** Plan due position as words + tone (tone only when it needs attention). */
export function dueStatus(p: PmsPlan, d: PlanDue | undefined): { label: string; tone: Tone } {
  if (p.state === "Site verify" || p.state === "Retired") return { label: p.state === "Site verify" ? "To be checked on site" : "No longer used", tone: "idle" };
  if (!d || d.state === "none") return { label: p.route === "live" ? "Watched all the time" : p.route === "stop" ? "At the next shutdown" : p.route === "event" ? "When something triggers it" : "No fixed time", tone: "idle" };
  if (d.state === "overdue") return { label: `${d.tasksOverdue} overdue`, tone: "warn" };
  if (d.state === "due") return { label: `${d.tasksDue} due`, tone: "idle" };
  if (d.state === "soon") return { label: "Due this week", tone: "idle" };
  return { label: "Scheduled", tone: "idle" };
}

export const unitLabel = (code: string) => (code === "GEN" ? "General hardware" : code);

/** The plan's round name from the database vocabulary ("Weekly round", "Planned stop"). */
export const planRound = (p: Pick<PmsPlan, "routeLabel" | "intervalHours">) => roundName(p.routeLabel, p.intervalHours);

/** "<unit> · Weekly round" / "<unit> instruments · OEM interval" */
export function planName(p: PmsPlan): string {
  const unit = p.unitCode === "GEN" ? `${machineName(p.machineId)} general` : p.unitCode;
  return `${unit}${p.kind === "sensor" ? " instruments" : ""} · ${planRound(p)}`;
}

/** The plan's interval in words, or its trigger when it is not calendar-driven. */
export function intervalText(p: Pick<PmsPlan, "intervalHours" | "trigger">): string {
  return p.intervalHours === null ? p.trigger : everyText(p.intervalHours);
}

/** A finding's time-to-limit in words. Time to a measurement limit is never a failure time (Rule 3). */
export function prognosisText(ttl: string | null | undefined): string {
  if (!ttl || ttl === "—") return "No reliable estimate of the time left";
  if (ttl === "stable") return "Steady, not moving toward its limit";
  if (ttl === "at limit") return "At its limit now";
  if (ttl === "> 72 h") return "More than 72 h until it reaches its limit";
  return `${ttl} until it reaches its limit (not the time it will fail)`;
}

export const woRef = (id: number) => `Work order ${String(id).padStart(4, "0")}`;

export function woNextStep(wo: PmsWorkOrder): string {
  switch (wo.stage) {
    case "identified": return "Send for review";
    case "awaiting_review": return "Engineer to review";
    case "approved":
    case "planning": {
      const left = readinessBlockers(wo.readiness).length;
      return left ? `Plan it · ${left} still missing` : "Mark as ready";
    }
    case "ready": return wo.plannedStart ? "Schedule" : "Pick a time slot";
    case "scheduled": return "Hand over to the crew";
    case "released": return "Start work";
    case "in_progress": return "Do the work";
    case "awaiting_verification": return "Check the finished work";
    case "completed": return "Close it";
    case "on_hold":
    case "deferred": return "Resume";
    default: return STAGE_LABEL[wo.stage];
  }
}

export interface PmsModel {
  data: PmsData | null;
  loading: boolean;
  error: string | null;
  now: number;
  dues: Map<string, PlanDue>;
  findings: PmsFinding[];
  openWos: PmsWorkOrder[];
  queue: QueueItem[];
  transition: (wo: PmsWorkOrder, to: WoStage, reason?: string) => Promise<Outcome>;
  update: (wo: PmsWorkOrder, patch: Record<string, unknown>) => Promise<Outcome>;
  propose: (input: {
    machineId: string;
    ruleId?: string | null;
    title: string;
    component?: string | null;
    priority: string;
    notes?: string | null;
    actionKind?: "mitigate" | "repair";
    workMode?: "Run" | "Isolate" | null;
    /** A planned job: its date (ISO) and estimate. */
    plannedStart?: string | null;
    estimateHours?: number | null;
    type?: MaintenanceTypeId | null;
    /** Part whose life the job renews (proactive). */
    componentId?: string | null;
  }) => Promise<Outcome & { id?: number }>;
  setPlanState: (plan: PmsPlan, state: string, reason?: string) => Promise<Outcome>;
}

export function usePmsLine(): PmsModel {
  const api = useApi<PmsLine>(PMS_LINE_URL);
  const fleet = useKilnFleet();
  const ops = useKilnOps();
  const { machines, selectedPlantId } = useIndustrialData();
  const priorities = useWorkOrderPriorities();
  // Urgency order as the database lists the priorities (most urgent first); codes order the rest.
  const byPriority = useCallback(
    (a: string, b: string) => {
      const rank = (id: string) => {
        const i = priorities?.findIndex((p) => p.id === id) ?? -1;
        return i < 0 ? Number.MAX_SAFE_INTEGER : i;
      };
      return rank(a) - rank(b) || a.localeCompare(b);
    },
    [priorities],
  );

  // Machine names come from the machines register; refreshed before the pages render.
  useMemo(() => {
    for (const m of machines) if (m.name) MACHINE_NAMES.set(m.id, m.name);
  }, [machines]);

  const data = useMemo<PmsData | null>(() => {
    const line = api.data;
    if (!line) return null;
    // The active plant's machines that have planned maintenance (the line endpoint covers every accessible plant).
    const inPlant = new Set(machines.filter((m) => !selectedPlantId || m.plantId === selectedPlantId).map((m) => m.id));
    const snaps = line.snapshots.filter((s) => inPlant.has(s.machineId));
    if (!snaps.length) return null;
    return {
      documents: snaps[0].documents,
      plans: snaps.flatMap((s) => s.plans),
      workOrders: snaps.flatMap((s) => s.workOrders),
      records: snaps.flatMap((s) => s.records),
      events: snaps.flatMap((s) => s.events).sort((a, b) => b.at.localeCompare(a.at)),
      canApprove: line.canApprove,
      machineIds: snaps.map((s) => s.machineId),
    };
  }, [api.data, machines, selectedPlantId]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Findings change rarely; frames tick every second. Re-derive on a change of the active set.
  const ids = data?.machineIds ?? [];
  const ruleKey = ids
    .flatMap((m) =>
      (fleet[m]?.frame.rules ?? [])
        .filter((r) => r.status !== "QUIET" && isConditionRule(r))
        .map((r) => `${m}:${r.id}:${r.status}:${r.severity}:${r.priority}:${r.timeToLimit}`),
    )
    .join("|");
  const openWos = useMemo(() => (data?.workOrders ?? []).filter((w) => isOpenStage(w.stage)), [data]);
  const findings = useMemo<PmsFinding[]>(() => {
    const out: PmsFinding[] = [];
    for (const m of ids)
      for (const r of fleet[m]?.frame.rules ?? []) {
        if (r.status === "QUIET" || !isConditionRule(r)) continue;
        out.push({
          machineId: m,
          ruleId: r.id,
          name: r.name,
          priority: r.priority,
          severity: r.severity,
          status: r.status as "ACTIVE" | "PENDING",
          evidence: r.evidence,
          cause: r.cause,
          consequence: r.consequence,
          action: r.action,
          timeToLimit: r.timeToLimit,
          confidence: r.confidence,
          subs: r.subs,
          tags: r.tags,
          since: r.since,
          owner: r.owner,
          unproven: r.unproven,
          plainTitle: r.plainTitle,
          plainWhat: r.plainWhat,
          plainTodo: r.plainTodo,
          workOrderId: openWos.find((w) => w.machineId === m && w.ruleId === r.id && w.status !== "done")?.id ?? null,
        });
      }
    return out.sort((a, b) => byPriority(a.priority, b.priority));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleKey, openWos, byPriority]);

  const dues = useMemo(() => (data ? planDues(data.plans, data.records, now) : new Map<string, PlanDue>()), [data, now]);

  const queue = useMemo<QueueItem[]>(() => {
    if (!data) return [];
    const out: QueueItem[] = [];
    for (const f of findings) {
      if (f.workOrderId || f.status !== "ACTIVE") continue;
      out.push({
        key: `f:${f.machineId}:${f.ruleId}`,
        kind: "finding",
        machineId: f.machineId,
        priority: f.priority,
        title: f.plainTitle || f.name,
        sub: f.subs.join(", ") || f.ruleId,
        reason: f.plainWhat || f.evidence,
        next: f.priority === "P1" ? "Review it now" : "Ask for a repair",
        status: { label: "New problem", tone: f.severity === "Critical" ? "bad" : "warn" },
        at: 0,
        ref: `${f.machineId}:${f.ruleId}`,
      });
    }
    for (const w of openWos) {
      out.push({
        key: `w:${w.id}`,
        kind: "wo",
        machineId: w.machineId,
        priority: w.priority,
        title: w.title,
        sub: `${woRef(w.id)}${w.component ? ` · ${w.component}` : ""}`,
        reason: w.source.kind === "finding" ? "Raised from a sensor problem" : w.source.kind === "inspection" ? `Raised from inspection ${w.source.ref}` : "Requested by a person",
        next: woNextStep(w),
        status: { label: STAGE_LABEL[w.stage], tone: stageTone(w.stage) },
        at: Date.parse(w.createdAt),
        ref: String(w.id),
      });
    }
    for (const p of data.plans) {
      const d = dues.get(p.id);
      if (!d || (d.state !== "due" && d.state !== "overdue")) continue;
      out.push({
        key: `p:${p.id}`,
        kind: "plan",
        machineId: p.machineId,
        priority: d.state === "overdue" ? "P3" : "P4",
        title: planName(p),
        sub: `${p.tasks.length} tasks in this round`,
        reason: d.state === "overdue" ? `${d.tasksOverdue} of ${p.tasks.length} tasks are past their due date` : d.lastRunAt ? `${d.tasksDue} tasks due` : "Not done since the plan started",
        next: p.kind === "sensor" ? "Check the sensors" : "Do the inspection round",
        status: d.state === "overdue" ? { label: "Overdue", tone: "warn" } : { label: "Due", tone: "idle" },
        at: d.dueAt ?? now,
        ref: p.id,
      });
    }
    const kindRank: Record<QueueKind, number> = { finding: 0, wo: 1, plan: 2 };
    return out.sort((a, b) => byPriority(a.priority, b.priority) || kindRank[a.kind] - kindRank[b.kind] || a.at - b.at);
  }, [data, findings, openWos, dues, now, byPriority]);

  const transition = useCallback(
    async (wo: PmsWorkOrder, to: WoStage, reason = ""): Promise<Outcome> => {
      const out = await pmsCall<PmsWorkOrder>(`/api/maintenance/pms/work-orders/${wo.id}`, "POST", { to, reason }, "Could not change the work order");
      if ("error" in out) return { tone: "bad", text: out.error };
      // The simulated plant follows its work orders: mirror the status into the ops loop.
      const status = statusForStage(to);
      if (wo.ruleId && status !== wo.status && ops.machineId === wo.machineId) void ops.updateWorkOrder(wo.id, { status });
      return { tone: "good", text: `${woRef(wo.id)} · ${STAGE_LABEL[out.data.stage]}` };
    },
    [ops],
  );

  const update = useCallback(async (wo: PmsWorkOrder, patch: Record<string, unknown>): Promise<Outcome> => {
    const out = await pmsCall<PmsWorkOrder>(`/api/maintenance/pms/work-orders/${wo.id}`, "PATCH", patch, "Could not save");
    return "error" in out ? { tone: "bad", text: out.error } : { tone: "good", text: `${woRef(wo.id)} saved` };
  }, []);

  const propose = useCallback(
    async (input: Parameters<PmsModel["propose"]>[0]) => {
      const simTime = fleet[input.machineId]?.frame.t ?? null;
      const out = await pmsCall<PmsWorkOrder>("/api/maintenance/pms/requests", "POST", { simTime, ...input }, "Could not propose the request");
      if ("error" in out) return { tone: "bad" as const, text: out.error };
      return { tone: "good" as const, text: `${woRef(out.data.id)} · ${STAGE_LABEL[out.data.stage]}`, id: out.data.id };
    },
    [fleet],
  );

  const setPlanState = useCallback(async (plan: PmsPlan, state: string, reason = ""): Promise<Outcome> => {
    const out = await pmsCall<PmsPlan>("/api/maintenance/pms/plans", "POST", { machineId: plan.machineId, planId: plan.id, state, reason }, "Could not change the plan");
    return "error" in out ? { tone: "bad", text: out.error } : { tone: "good", text: `Plan ${plan.id} is now: ${out.data.state}` };
  }, []);

  return { data, loading: api.isLoading, error: api.error ?? null, now, dues, findings, openWos, queue, transition, update, propose, setPlanState };
}

