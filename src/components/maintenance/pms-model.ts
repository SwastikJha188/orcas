"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { invalidateApi, useApi } from "@/lib/api-cache";
import { isConditionRule } from "@/lib/plant-defs";
import { ROUTES, type RouteId } from "@/lib/maintenance";
import { PRIORITY_LABEL, STAGE_LABEL, isOpenStage, planDues, readinessBlockers, statusForStage, type PlanDue } from "@/lib/pms";
import { PYRO_MACHINE_BY_ID } from "@/lib/pyro-sim/signals";
import { useKilnFleet } from "@/providers/kiln-simulation-context";
import { useKilnOps } from "@/providers/kiln-ops-context";
import type { Tone } from "@/components/ui";
import type { ChecklistDocument, ChecklistKind, MaintenanceRecord } from "@/types/maintenance";
import type { PmsEvent, PmsLine, PmsPlan, PmsWorkOrder, WoStage } from "@/types/pms";

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
  severity: "Normal" | "Advisory" | "Critical";
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

export const PRIORITY_RANK: Record<string, number> = { P1: 1, P2: 2, P3: 3, P4: 4 };
export const priorityTone = (p: string): Tone => (p === "P1" ? "bad" : p === "P2" ? "warn" : "idle");

/** "KLN-01" for PYR-KLN-01; merged machines keep their code (FED-01). */
export const machineCode = (id: string) => PYRO_MACHINE_BY_ID[id]?.code ?? id;
export const machineName = (id: string) => PYRO_MACHINE_BY_ID[id]?.shortName ?? PYRO_MACHINE_BY_ID[id]?.name ?? id;

export function stageTone(s: WoStage): Tone {
  if (s === "on_hold" || s === "deferred" || s === "awaiting_verification") return "warn";
  if (s === "in_progress" || s === "released") return "info";
  return "idle";
}

/** Plan due position as words + tone (tone only when it needs attention). */
export function dueStatus(p: PmsPlan, d: PlanDue | undefined): { label: string; tone: Tone } {
  if (p.state === "Site verify" || p.state === "Retired") return { label: p.state, tone: "idle" };
  if (!d || d.state === "none") return { label: p.route === "live" ? "Continuous" : p.route === "stop" ? "Next stop" : p.route === "event" ? "On event" : "Not timed", tone: "idle" };
  if (d.state === "overdue") return { label: `${d.tasksOverdue} overdue`, tone: "warn" };
  if (d.state === "due") return { label: `${d.tasksDue} due`, tone: "idle" };
  if (d.state === "soon") return { label: "Due this week", tone: "idle" };
  return { label: "Scheduled", tone: "idle" };
}

export const ROUND_NAME: Record<string, string> = {
  shift: "Shift round",
  daily: "Daily round",
  weekly: "Weekly round",
  monthly: "Monthly round",
  quarterly: "Quarterly round",
  annual: "Annual round",
  stop: "Planned-stop round",
  event: "Event inspection",
  live: "Live checks",
  oem: "Calibration and tests",
  site: "Site survey",
};

export const unitLabel = (code: string) => (code === "GEN" ? "General hardware" : code);

/** "KLN-01 · Weekly round" / "KLN-01 instruments · Calibration and tests" */
export function planName(p: PmsPlan): string {
  const unit = p.unitCode === "GEN" ? `${machineCode(p.machineId)} general` : p.unitCode;
  return `${unit}${p.kind === "sensor" ? " instruments" : ""} · ${ROUND_NAME[p.route] ?? ROUTES[p.route as RouteId]?.label ?? p.route}`;
}

export function intervalText(p: PmsPlan): string {
  const h = ROUTES[p.route as RouteId]?.hours ?? null;
  if (h === null) return p.route === "stop" ? "At a planned stop" : p.route === "event" ? "After a trip or upset" : p.route === "live" ? "Continuous" : p.route === "oem" ? "OEM interval" : "After site survey";
  if (h < 24) return `Every ${h} h`;
  const d = h / 24;
  return d === 1 ? "Every day" : d === 7 ? "Every week" : d === 365 ? "Every 12 months" : `Every ${d} days`;
}

/** A finding's time-to-limit in words. Time to a measurement limit is never a failure time (Rule 3). */
export function prognosisText(ttl: string | null | undefined): string {
  if (!ttl || ttl === "—") return "Trend only · no validated RUL";
  if (ttl === "stable") return "Stable · not moving toward the limit";
  if (ttl === "at limit") return "At the limit now";
  if (ttl === "> 72 h") return "More than 72 h to the limit";
  return `${ttl} to the limit · not a failure time`;
}

export const woRef = (id: number) => `WO-${String(id).padStart(4, "0")}`;

export function woNextStep(wo: PmsWorkOrder): string {
  switch (wo.stage) {
    case "identified": return "Submit for review";
    case "awaiting_review": return "Technical review";
    case "approved":
    case "planning": {
      const left = readinessBlockers(wo.readiness).length;
      return left ? `Planning · ${left} open` : "Mark ready";
    }
    case "ready": return wo.plannedStart ? "Schedule" : "Set window";
    case "scheduled": return "Release";
    case "released": return "Start work";
    case "in_progress": return "Execute";
    case "awaiting_verification": return "Verify as-left";
    case "completed": return "Close";
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
  }) => Promise<Outcome & { id?: number }>;
  setPlanState: (plan: PmsPlan, state: string, reason?: string) => Promise<Outcome>;
}

export function usePmsLine(): PmsModel {
  const api = useApi<PmsLine>(PMS_LINE_URL);
  const fleet = useKilnFleet();
  const ops = useKilnOps();

  const data = useMemo<PmsData | null>(() => {
    const line = api.data;
    if (!line || !line.snapshots.length) return null;
    return {
      documents: line.snapshots[0].documents,
      plans: line.snapshots.flatMap((s) => s.plans),
      workOrders: line.snapshots.flatMap((s) => s.workOrders),
      records: line.snapshots.flatMap((s) => s.records),
      events: line.snapshots.flatMap((s) => s.events).sort((a, b) => b.at.localeCompare(a.at)),
      canApprove: line.canApprove,
      machineIds: line.snapshots.map((s) => s.machineId),
    };
  }, [api.data]);

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
          workOrderId: openWos.find((w) => w.machineId === m && w.ruleId === r.id && w.status !== "done")?.id ?? null,
        });
      }
    return out.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleKey, openWos]);

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
        title: f.name,
        sub: f.subs.join(", ") || f.ruleId,
        reason: f.evidence,
        next: f.priority === "P1" ? "Immediate review" : "Propose request",
        status: { label: "New finding", tone: f.severity === "Critical" ? "bad" : "warn" },
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
        reason: w.source.kind === "finding" ? `Finding ${w.source.ref}` : w.source.kind === "inspection" ? `Inspection ${w.source.ref}` : "Manual request",
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
        sub: `${p.id} · ${p.tasks.length} tasks`,
        reason: d.state === "overdue" ? `${d.tasksOverdue} of ${p.tasks.length} tasks past interval` : d.lastRunAt ? `${d.tasksDue} tasks due` : "Not run since the plan started",
        next: p.kind === "sensor" ? "Run instrument checks" : "Run the round",
        status: d.state === "overdue" ? { label: "Overdue", tone: "warn" } : { label: "Due", tone: "idle" },
        at: d.dueAt ?? now,
        ref: p.id,
      });
    }
    const kindRank: Record<QueueKind, number> = { finding: 0, wo: 1, plan: 2 };
    return out.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || kindRank[a.kind] - kindRank[b.kind] || a.at - b.at);
  }, [data, findings, openWos, dues, now]);

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
    return "error" in out ? { tone: "bad", text: out.error } : { tone: "good", text: `${plan.id} · ${out.data.state}` };
  }, []);

  return { data, loading: api.isLoading, error: api.error ?? null, now, dues, findings, openWos, queue, transition, update, propose, setPlanState };
}

export { PRIORITY_LABEL };
