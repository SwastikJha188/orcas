import type { ChecklistKind, MaintenanceRecord } from "@/types/maintenance";
import type { PlanState, PmsPlan, PmsWorkOrder, Readiness, ReadinessKey, ReadinessState, WoStage } from "@/types/pms";
import { ROUTES, latestByTask, type RouteId } from "@/lib/maintenance";

/* ==========================================================================
   Planned maintenance vocabulary and rules (pure; client and server).
   OSW-SW-PMS-PYR-01 §5: priority (urgency) and stage (workflow) are separate;
   a finding is not a work order; nothing closes without verification.
   ========================================================================== */

/* ------------------------------------------------------------ lifecycle */

export const STAGE_LABEL: Record<WoStage, string> = {
  identified: "Identified",
  awaiting_review: "Awaiting review",
  approved: "Approved for planning",
  planning: "Planning",
  ready: "Ready",
  scheduled: "Scheduled",
  released: "Released",
  in_progress: "In progress",
  awaiting_verification: "Awaiting verification",
  completed: "Completed",
  closed: "Closed",
  deferred: "Deferred",
  on_hold: "On hold",
  rejected: "Rejected",
  merged: "Merged",
  cancelled: "Cancelled",
};

export const STAGES = Object.keys(STAGE_LABEL) as WoStage[];
export const isStage = (v: unknown): v is WoStage => typeof v === "string" && v in STAGE_LABEL;

/** The seven steps a work order walks (team brief §05). */
export const STEPS = ["Identify", "Review", "Plan", "Schedule", "Execute", "Verify", "Close"] as const;

const STEP_OF: Partial<Record<WoStage, number>> = {
  identified: 0,
  awaiting_review: 1,
  approved: 2,
  planning: 2,
  ready: 2,
  scheduled: 3,
  released: 3,
  in_progress: 4,
  awaiting_verification: 5,
  completed: 5,
  closed: 6,
};

/** Step index (0–6); paused / ended work orders keep the step they left. */
export function stepOf(wo: Pick<PmsWorkOrder, "stage" | "resumeStage">): number {
  return STEP_OF[wo.stage] ?? (wo.resumeStage ? STEP_OF[wo.resumeStage] ?? 0 : 0);
}

export const TERMINAL: WoStage[] = ["closed", "rejected", "merged", "cancelled"];
export const PAUSED: WoStage[] = ["deferred", "on_hold"];
export const isOpenStage = (s: WoStage) => !TERMINAL.includes(s);

/** work_orders.status kept in step with the stage (the ops loop and Diagnosis read it). */
export function statusForStage(s: WoStage): PmsWorkOrder["status"] {
  if (s === "in_progress") return "in_progress";
  if (s === "awaiting_verification" || s === "completed" || s === "closed") return "done";
  if (s === "rejected" || s === "merged" || s === "cancelled") return "cancelled";
  return "open";
}

/**
 * A work order without a PMS stage yet (raised from Diagnosis, the ops loop or a
 * checklist defect) reads from its status. Done is not closed: it still needs
 * verification (Rule 10).
 */
export function stageForStatus(status: string): WoStage {
  if (status === "in_progress") return "in_progress";
  if (status === "done") return "awaiting_verification";
  if (status === "cancelled") return "cancelled";
  return "awaiting_review";
}

export interface Transition {
  to: WoStage;
  label: string;
  /** Primary = the next step forward. */
  primary?: boolean;
  /** Needs a recorded reason (alternative dispositions). */
  reason?: boolean;
  /** Needs approval rights (role can_manage_work_orders). */
  approval?: boolean;
}

const FORWARD: Partial<Record<WoStage, Transition[]>> = {
  identified: [{ to: "awaiting_review", label: "Submit for review", primary: true }],
  awaiting_review: [
    { to: "approved", label: "Approve for planning", primary: true, approval: true },
    { to: "merged", label: "Merge", reason: true },
    { to: "rejected", label: "Reject", reason: true, approval: true },
  ],
  approved: [{ to: "planning", label: "Start planning", primary: true }],
  planning: [{ to: "ready", label: "Mark ready", primary: true }],
  ready: [
    { to: "scheduled", label: "Schedule", primary: true },
    { to: "planning", label: "Back to planning" },
  ],
  scheduled: [
    { to: "released", label: "Release", primary: true, approval: true },
    { to: "ready", label: "Unschedule" },
  ],
  released: [{ to: "in_progress", label: "Start work", primary: true }],
  in_progress: [{ to: "awaiting_verification", label: "Work done", primary: true }],
  awaiting_verification: [
    { to: "completed", label: "Verify", primary: true, approval: true },
    { to: "in_progress", label: "Verification failed", reason: true },
  ],
  completed: [{ to: "closed", label: "Close", primary: true, approval: true }],
};

/** Transitions offered from a stage (forward, then hold / defer / cancel). */
export function transitionsFrom(wo: Pick<PmsWorkOrder, "stage" | "resumeStage">): Transition[] {
  const s = wo.stage;
  if (TERMINAL.includes(s)) return [];
  if (PAUSED.includes(s)) {
    const back = wo.resumeStage ?? "planning";
    return [
      { to: back, label: `Resume · ${STAGE_LABEL[back]}`, primary: true },
      { to: "cancelled", label: "Cancel", reason: true },
    ];
  }
  const out = [...(FORWARD[s] ?? [])];
  if (s !== "completed" && s !== "awaiting_verification") {
    if (STEP_OF[s] !== undefined && STEP_OF[s]! <= 3) out.push({ to: "deferred", label: "Defer", reason: true });
    out.push({ to: "on_hold", label: "Hold", reason: true });
    out.push({ to: "cancelled", label: "Cancel", reason: true });
  }
  return out;
}

/* ------------------------------------------------------------ readiness */

export const READINESS_KEYS: ReadinessKey[] = ["spares", "personnel", "tools", "procedure", "isolation", "access", "window"];

export const READINESS_LABEL: Record<ReadinessKey, string> = {
  spares: "Spare parts",
  personnel: "Qualified personnel",
  tools: "Special tools",
  procedure: "Work instructions",
  isolation: "Isolation and permits",
  access: "Access and cooling",
  window: "Plant window",
};

export const READINESS_STATE_LABEL: Record<ReadinessState, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  blocked: "Blocked",
  na: "Not needed",
};

export function emptyReadiness(): Readiness {
  const r = {} as Readiness;
  for (const k of READINESS_KEYS) r[k] = { state: "pending", note: null };
  return r;
}

/** Items still stopping Ready (§9: a date alone does not make a job ready). */
export function readinessBlockers(r: Readiness): ReadinessKey[] {
  return READINESS_KEYS.filter((k) => r[k].state === "pending" || r[k].state === "blocked");
}

/**
 * What a transition still needs, or null when it may go ahead.
 * The server enforces the same rules (PMS-12, -13, -16).
 */
export function transitionBlocker(wo: PmsWorkOrder, to: WoStage, reason: string): string | null {
  const t = transitionsFrom(wo).find((x) => x.to === to);
  if (!t) return `${STAGE_LABEL[wo.stage]} cannot move to ${STAGE_LABEL[to]}`;
  if (t.reason && !reason.trim()) return "Record the reason";
  if (to === "ready") {
    const left = readinessBlockers(wo.readiness);
    if (left.length) return `Not ready: ${left.map((k) => READINESS_LABEL[k].toLowerCase()).join(", ")}`;
  }
  if (to === "scheduled" && !wo.plannedStart) return "Set the planned start";
  if (to === "awaiting_verification" && !wo.asFound?.trim()) return "Record the as-found condition and the work done";
  if (to === "completed" && !wo.asLeft?.trim()) return "Record the as-left verification";
  return null;
}

/* ------------------------------------------------------------ priority */

export const PRIORITY_LABEL: Record<string, string> = {
  P1: "Immediate",
  P2: "Urgent",
  P3: "Planned",
  P4: "Routine",
};

/* ------------------------------------------------------------ plans */

const ROUTE_CODE: Record<RouteId, string> = {
  shift: "SH",
  daily: "D",
  weekly: "W",
  monthly: "M",
  quarterly: "Q",
  annual: "A",
  stop: "STOP",
  event: "EVT",
  live: "LIVE",
  oem: "OEM",
  site: "SITE",
};

/** Stable plan id: one plan per unit and route (GEN is per machine). */
export function planId(machineCode: string, kind: ChecklistKind, unitCode: string, route: RouteId): string {
  const unit = unitCode === "GEN" ? `${machineCode}-GEN` : unitCode;
  return `PLN-${unit}${kind === "sensor" ? "-IN" : ""}-${ROUTE_CODE[route]}`;
}

/** Trigger as the plan library names it (report §4). */
export function planTrigger(route: string): string {
  switch (route) {
    case "stop": return "Shutdown window";
    case "event": return "Condition / event";
    case "live": return "Live (ULTRON)";
    case "oem": return "OEM interval";
    case "site": return "Site survey";
    default: return "Calendar";
  }
}

export function planStrategy(route: string): string {
  switch (route) {
    case "stop": return "Time-based, at a planned stop";
    case "event": return "Condition-based";
    case "live": return "Continuous validation";
    case "oem": return "Calibration / verification";
    case "site": return "Scope verification";
    default: return "Time-based PM";
  }
}

/** Plans that generate due work (Rule 1 / Rule 8). */
export const planGenerates = (p: Pick<PmsPlan, "state">) => p.state === "Provisional" || p.state === "Approved";

export const planHours = (p: Pick<PmsPlan, "route">) => ROUTES[p.route as RouteId]?.hours ?? null;

/** Plan work mode: isolation if any task needs a verified stop. */
export function planMode(p: Pick<PmsPlan, "tasks">): "Run" | "Run + stop" | "Isolate" {
  if (p.tasks.some((t) => t.mode === "OFF")) return "Isolate";
  if (p.tasks.some((t) => t.mode.includes("STOP"))) return "Run + stop";
  return "Run";
}

export interface PlanDue {
  /** Next due instant (ms); null when not calendar-driven or not generating. */
  dueAt: number | null;
  /** Last time every task in the plan was recorded (the last complete run). */
  lastRunAt: number | null;
  tasksDue: number;
  tasksOverdue: number;
  tasksDone: number;
  /** due: at or past dueAt · overdue: a task lapsed past its interval · soon: due in 7 days. */
  state: "overdue" | "due" | "soon" | "scheduled" | "none";
}

const WEEK = 7 * 24 * 3_600_000;

/**
 * Due position of one plan from its tasks' latest results (same rule as the
 * checklist sheet: a task never recorded is due, a recorded task is due again
 * one interval later).
 */
export function planDue(plan: PmsPlan, latest: Map<string, MaintenanceRecord>, now: number): PlanDue {
  const hours = planHours(plan);
  const empty: PlanDue = { dueAt: null, lastRunAt: null, tasksDue: 0, tasksOverdue: 0, tasksDone: 0, state: "none" };
  if (!planGenerates(plan)) return empty;
  const step = hours === null ? null : hours * 3_600_000;
  const activated = Date.parse(plan.activatedAt);
  let dueAt = Infinity;
  let lastRun = Infinity;
  let due = 0;
  let overdue = 0;
  let done = 0;
  for (const t of plan.tasks) {
    const rec = latest.get(t.id);
    const open = rec && (rec.result === "Defect" || rec.result === "Hold");
    const at = rec ? Date.parse(rec.recordedAt) : null;
    lastRun = Math.min(lastRun, at ?? -Infinity);
    // An open defect / hold is followed up through its work order, not the round.
    if (open) continue;
    if (step === null) {
      if (rec) done += 1;
      continue;
    }
    const next = at === null ? Math.min(activated, now) : at + step;
    dueAt = Math.min(dueAt, next);
    if (next <= now) {
      due += 1;
      if (at !== null) overdue += 1;
    } else done += 1;
  }
  const lastRunAt = Number.isFinite(lastRun) && lastRun > 0 ? lastRun : null;
  if (step === null) return { ...empty, lastRunAt, tasksDone: done };
  const at = Number.isFinite(dueAt) ? dueAt : null;
  const state = overdue ? "overdue" : due ? "due" : at !== null && at - now <= WEEK ? "soon" : "scheduled";
  return { dueAt: at, lastRunAt, tasksDue: due, tasksOverdue: overdue, tasksDone: done, state };
}

/** Due position of every plan; results are matched per machine (GEN task ids repeat on every machine). */
export function planDues(plans: PmsPlan[], records: MaintenanceRecord[], now: number): Map<string, PlanDue> {
  const groups = new Map<string, MaintenanceRecord[]>();
  for (const r of records) {
    const k = `${r.machineId}|${r.kind}`;
    const list = groups.get(k);
    if (list) list.push(r);
    else groups.set(k, [r]);
  }
  const latest = new Map<string, Map<string, MaintenanceRecord>>();
  for (const [k, list] of groups) latest.set(k, latestByTask(list));
  const none = new Map<string, MaintenanceRecord>();
  return new Map(plans.map((p) => [p.id, planDue(p, latest.get(`${p.machineId}|${p.kind}`) ?? none, now)]));
}

export const PLAN_STATE_ORDER: Record<PlanState, number> = { Approved: 0, Provisional: 1, "Site verify": 2, Retired: 3 };
