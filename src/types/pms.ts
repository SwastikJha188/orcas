// Planned maintenance (OSW-SW-PMS-PYR-01 Rev.00) for one pyro-line machine:
// controlled plans built from the checklist documents, the work-order
// lifecycle on top of `work_orders`, readiness and the audit trail.
//
// Plans are the checklist sections grouped by unit and inspection route; the
// intervals are the documents' starting values until the plant approves them.

import type { ChecklistDocument, ChecklistKind, MaintenanceRecord } from "./maintenance";

/* ------------------------------------------------------------ plans */

/**
 * Provisional  document starting interval, generating due work until approved
 * Approved     plant-approved (records who and when)
 * Site verify  equipment presence / scope must be confirmed first (no due work)
 * Retired      taken out of use (no due work)
 */
export type PlanState = "Provisional" | "Approved" | "Site verify" | "Retired";

export const PLAN_STATES: PlanState[] = ["Provisional", "Approved", "Site verify", "Retired"];

export interface PlanTask {
  id: string;
  /** Checklist section the task belongs to ("7.6" · "Main drive motor, reduction gearbox …"). */
  section: string;
  sectionTitle: string;
  component: string;
  tag?: string;
  owner: string;
  mode: string;
  scope: string;
}

export interface PmsPlan {
  /** e.g. PLN-KLN-01-W, PLN-KLN-01-GEN-M, PLN-KLN-01-IN-OEM */
  id: string;
  machineId: string;
  kind: ChecklistKind;
  unitCode: string;
  unitTitle: string;
  /** Route id from src/lib/maintenance (shift, weekly, stop, oem …). */
  route: string;
  /** Section numbers the tasks come from (e.g. ["7.2", "7.4"]). */
  sections: string[];
  tasks: PlanTask[];
  state: PlanState;
  /** Default state from the document (what Reset returns to). */
  defaultState: PlanState;
  /** Start of the plan's schedule (first read or last re-activation). */
  activatedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  /** Unit is conditional on installed equipment (EXH-IF sensor candidates). */
  conditional: boolean;
}

/* ------------------------------------------------------------ work orders */

export type WoStage =
  | "identified"
  | "awaiting_review"
  | "approved"
  | "planning"
  | "ready"
  | "scheduled"
  | "released"
  | "in_progress"
  | "awaiting_verification"
  | "completed"
  | "closed"
  | "deferred"
  | "on_hold"
  | "rejected"
  | "merged"
  | "cancelled";

export type ReadinessKey = "spares" | "personnel" | "tools" | "procedure" | "isolation" | "access" | "window";
export type ReadinessState = "pending" | "confirmed" | "blocked" | "na";
export type Readiness = Record<ReadinessKey, { state: ReadinessState; note: string | null }>;

export type WorkMode = "Run" | "Isolate";

export interface PmsEvent {
  id: number;
  machineId: string;
  workOrderId: number | null;
  planId: string | null;
  /** create · transition · readiness · details · plan-state · inspection */
  action: string;
  from: string | null;
  to: string | null;
  reason: string | null;
  actor: string | null;
  at: string;
}

export interface PmsWorkOrder {
  id: number;
  machineId: string;
  /** Live finding (rule id) the request came from, if any. */
  ruleId: string | null;
  title: string;
  component: string | null;
  priority: string;
  /** work_orders.status (kept in step with the stage for the ops loop). */
  status: "open" | "in_progress" | "done" | "cancelled";
  actionKind: "mitigate" | "repair";
  assignee: string | null;
  notes: string | null;
  simTime: number | null;
  createdAt: string;
  updatedAt: string;
  stage: WoStage;
  /** Stage to return to from Deferred / On hold. */
  resumeStage: WoStage | null;
  workMode: WorkMode | null;
  plannedStart: string | null;
  estimateHours: number | null;
  asFound: string | null;
  asLeft: string | null;
  readiness: Readiness;
  /** Inspection result that opened it (checklist defect), if any. */
  source: { kind: "finding" | "inspection" | "manual"; ref: string | null };
}

/** GET /api/maintenance/pms/line → every machine with planned maintenance on the line. */
export interface PmsLine {
  snapshots: PmsSnapshot[];
  canApprove: boolean;
}

/** GET /api/maintenance/pms?machineId= */
export interface PmsSnapshot {
  machineId: string;
  documents: Record<ChecklistKind, ChecklistDocument>;
  plans: PmsPlan[];
  workOrders: PmsWorkOrder[];
  records: MaintenanceRecord[];
  events: PmsEvent[];
  /** Signed-in user may approve, release and close (role can_manage_work_orders). */
  canApprove: boolean;
}
