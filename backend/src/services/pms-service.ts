import { query } from "@backend/db";
import { createWorkOrder, isPriority, listWorkOrders, resolvePriority } from "@backend/services/ops-service";
import {
  RECORD_SELECT,
  documentsFor,
  ensureTables,
  getVocabulary,
  hasMaintenanceChecklist,
  machineChecklist,
  maintenanceMachineIds,
  mapRecord,
} from "@backend/services/maintenance-service";
import {
  PAUSED,
  READINESS_KEYS,
  emptyReadiness,
  isOpenStage,
  isStage,
  planId,
  stageForStatus,
  statusForStage,
  transitionBlocker,
  transitionsFrom,
} from "@shared/lib/pms";
import type { ChecklistKind } from "@shared/types/maintenance";
import type { MaintenanceTypeId } from "@shared/types/maintenance-types";
import {
  PLAN_STATES,
  type PlanState,
  type PlanTask,
  type PmsEvent,
  type PmsLine,
  type PmsPlan,
  type PmsSnapshot,
  type PmsWorkOrder,
  type Readiness,
  type ReadinessState,
  type WoStage,
  type WorkMode,
} from "@shared/types/pms";

/*
 * Planned maintenance for the pyro-line machines (OSW-SW-PMS-PYR-01 Rev.00).
 *
 *   maintenance_plan_states  one row per plan (machine × unit × round): state, schedule start, approval
 *   maintenance_wo_stages    PMS layer on work_orders: stage, readiness, as-found / as-left
 *   maintenance_events       audit trail: who changed what, from → to, and why
 *
 * Plans are derived from the checklist documents (unit × route); the work
 * orders stay in `work_orders`, so Diagnosis and the ops loop see the same jobs.
 */

export class PmsInputError extends Error {}
export class PmsPermissionError extends Error {}

type Row = Record<string, unknown>;
const iso = (v: unknown) => (v === null || v === undefined ? null : new Date(v as string).toISOString());
const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/** The machine's short equipment code (machines.code); only machines with checklists have planned maintenance. */
async function machineCode(machineId: string): Promise<string> {
  const res = await query<{ code: string }>("SELECT code FROM machines WHERE id = $1", [machineId]);
  if (!res.rows[0] || !(await hasMaintenanceChecklist(machineId))) throw new PmsInputError(`No planned maintenance for ${machineId}`);
  return res.rows[0].code;
}

async function canApprove(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const res = await query<{ ok: boolean }>(
    "SELECT r.can_manage_work_orders AS ok FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1",
    [userId],
  );
  return Boolean(res.rows[0]?.ok);
}

async function logEvent(e: {
  machineId: string;
  workOrderId?: number | null;
  /** The plan (unit × round of this machine) the event is about. */
  plan?: { unitId: number; route: string } | null;
  action: string;
  from?: string | null;
  to?: string | null;
  reason?: string | null;
  userId: string | null;
}): Promise<void> {
  await query(
    `INSERT INTO maintenance_events (machine_id, work_order_id, unit_id, route_id, action, from_state, to_state, reason, actor_user_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [e.machineId, e.workOrderId ?? null, e.plan?.unitId ?? null, e.plan?.route ?? null, e.action, e.from ?? null, e.to ?? null, e.reason ?? null, e.userId],
  );
}

/* ------------------------------------------------------------ plans */

/** A plan as the checklist defines it, with its stored key (machine × unit × round). */
type PlanBase = Omit<PmsPlan, "state" | "activatedAt" | "approvedBy" | "approvedAt"> & { unitId: number };

async function buildPlans(machineId: string): Promise<PlanBase[]> {
  const code = await machineCode(machineId);
  const [vocab, unitRows] = await Promise.all([
    getVocabulary(),
    query<{ id: number; code: string; kind: ChecklistKind }>(
      `SELECT u.id, u.code, d.kind FROM machine_maintenance_units mu
         JOIN maintenance_units u ON u.id = mu.unit_id
         JOIN maintenance_documents d ON d.id = u.document_id
        WHERE mu.machine_id = $1`,
      [machineId],
    ),
  ]);
  const routeOf = new Map(vocab.routes.map((r) => [r.id, r]));
  const unitIdOf = new Map(unitRows.rows.map((u) => [`${u.kind}|${u.code}`, Number(u.id)]));
  const out: PlanBase[] = [];
  for (const kind of ["equipment", "sensor"] as ChecklistKind[]) {
    const { units } = await machineChecklist(machineId, kind);
    for (const unit of units) {
      const unitId = unitIdOf.get(`${kind}|${unit.code}`);
      if (unitId === undefined) throw new PmsInputError(`Section ${unit.code} is not linked to ${machineId}`);
      const byRoute = new Map<string, { sections: Set<string>; tasks: PlanTask[] }>();
      for (const gr of unit.groups)
        for (const t of gr.tasks) {
          const route = t.route;
          let b = byRoute.get(route);
          if (!b) byRoute.set(route, (b = { sections: new Set(), tasks: [] }));
          b.sections.add(gr.num);
          b.tasks.push({ id: t.id, section: gr.num, sectionTitle: gr.title, component: t.component, tag: t.tag, owner: t.owner, mode: t.mode, scope: t.scope });
        }
      for (const [route, b] of byRoute) {
        const verifyOnly = b.tasks.every((t) => t.scope === "VERIFY");
        const defaultState: PlanState = route === "site" || unit.conditional || verifyOnly ? "Site verify" : "Provisional";
        const r = routeOf.get(route);
        if (!r) throw new PmsInputError(`Round ${route} is not defined`);
        out.push({
          id: planId(code, kind, unit.code, r.planCode),
          machineId,
          kind,
          unitId,
          unitCode: unit.code,
          unitTitle: unit.title,
          route,
          routeLabel: r.label,
          intervalHours: r.intervalHours,
          trigger: r.trigger,
          sections: [...b.sections],
          tasks: b.tasks,
          defaultState,
          conditional: Boolean(unit.conditional),
        });
      }
    }
  }
  return out;
}

/** The machine's plans with their stored state; `unitId` is the stored key next to the route. */
async function plansWithKeys(machineId: string): Promise<Array<PmsPlan & { unitId: number }>> {
  const base = await buildPlans(machineId);
  // First read starts each plan's schedule; existing rows keep theirs.
  await query(
    `INSERT INTO maintenance_plan_states (machine_id, unit_id, route_id, state)
     SELECT $1, unit_id, route_id, state FROM unnest($2::int[], $3::text[], $4::text[]) AS t(unit_id, route_id, state)
     ON CONFLICT (machine_id, unit_id, route_id) DO NOTHING`,
    [machineId, base.map((p) => p.unitId), base.map((p) => p.route), base.map((p) => p.defaultState)],
  );
  const res = await query(
    `SELECT ps.*, u.full_name AS approved_by_name FROM maintenance_plan_states ps
       LEFT JOIN users u ON u.id = ps.approved_by_user_id
      WHERE ps.machine_id = $1`,
    [machineId],
  );
  const rows = new Map(res.rows.map((r) => [`${Number(r.unit_id)}|${String(r.route_id)}`, r]));
  return base.map((p) => {
    const r = rows.get(`${p.unitId}|${p.route}`);
    return {
      ...p,
      state: (r?.state as PlanState) ?? p.defaultState,
      activatedAt: iso(r?.activated_at) ?? new Date().toISOString(),
      approvedBy: (r?.approved_by_name as string) ?? null,
      approvedAt: iso(r?.approved_at),
    };
  });
}

async function plansFor(machineId: string): Promise<PmsPlan[]> {
  return (await plansWithKeys(machineId)).map(({ unitId: _unitId, ...p }) => (void _unitId, p));
}

/** Changes a plan's state. Approval needs approval rights; any change is audited. */
export async function setPlanState(input: Record<string, unknown>, userId: string | null): Promise<PmsPlan> {
  const machineId = text(input.machineId, 64) ?? "";
  const id = text(input.planId, 48) ?? "";
  const state = input.state as PlanState;
  const reason = text(input.reason, 1000);
  if (!PLAN_STATES.includes(state)) throw new PmsInputError("Unknown plan state");
  await ensureTables();
  // A plan code is unique within one machine; the stored key is machine × unit × round.
  const plans = await plansWithKeys(machineId);
  const keyed = plans.find((p) => p.id === id);
  if (!keyed) throw new PmsInputError(`${id} is not a plan of ${machineId}`);
  const { unitId, ...plan } = keyed;
  if (plan.state === state) return plan;
  if (state === "Approved" && !(await canApprove(userId))) throw new PmsPermissionError("Your role cannot approve maintenance plans");
  if ((state === "Retired" || state === "Site verify") && !reason) throw new PmsInputError("Record the reason");
  const restart = (state === "Provisional" || state === "Approved") && !(plan.state === "Provisional" || plan.state === "Approved");
  await query(
    `UPDATE maintenance_plan_states
        SET state = $4::varchar,
            approved_by_user_id = CASE WHEN $4::varchar = 'Approved' THEN $5::varchar ELSE NULL END,
            approved_at = CASE WHEN $4::varchar = 'Approved' THEN NOW() ELSE NULL END,
            activated_at = CASE WHEN $6::boolean THEN NOW() ELSE activated_at END,
            updated_at = NOW()
      WHERE machine_id = $1 AND unit_id = $2 AND route_id = $3`,
    [machineId, unitId, plan.route, state, userId, restart],
  );
  await logEvent({ machineId, plan: { unitId, route: plan.route }, action: "plan-state", from: plan.state, to: state, reason, userId });
  return (await plansFor(machineId)).find((p) => p.id === id)!;
}

/* ------------------------------------------------------------ work orders */

function readinessOf(v: unknown): Readiness {
  const r = emptyReadiness();
  if (v && typeof v === "object") {
    for (const k of READINESS_KEYS) {
      const item = (v as Record<string, { state?: string; note?: string | null }>)[k];
      if (item && ["pending", "confirmed", "blocked", "na"].includes(item.state ?? "")) r[k] = { state: item.state as ReadinessState, note: item.note ?? null };
    }
  }
  return r;
}

async function workOrdersFor(machineId: string): Promise<PmsWorkOrder[]> {
  const [wos, meta, sources, jobs, checks] = await Promise.all([
    listWorkOrders(machineId),
    query(
      `SELECT s.* FROM maintenance_wo_stages s JOIN work_orders wo ON wo.id = s.work_order_id WHERE wo.machine_id = $1`,
      [machineId],
    ),
    query<{ work_order_id: number; task_id: string }>(
      "SELECT work_order_id, task_id FROM maintenance_records WHERE machine_id = $1 AND work_order_id IS NOT NULL",
      [machineId],
    ),
    query<{ work_order_id: number; type_id: MaintenanceTypeId; component_id: string | null }>(
      "SELECT j.work_order_id, j.type_id, j.component_id FROM maintenance_job_sources j JOIN work_orders wo ON wo.id = j.work_order_id WHERE wo.machine_id = $1",
      [machineId],
    ),
    query<{ work_order_id: number; id: number }>(
      "SELECT ac.work_order_id, ac.id FROM alert_checks ac JOIN work_orders wo ON wo.id = ac.work_order_id WHERE wo.machine_id = $1",
      [machineId],
    ),
  ]);
  const byId = new Map(meta.rows.map((r) => [Number(r.work_order_id), r]));
  const fromTask = new Map(sources.rows.map((r) => [Number(r.work_order_id), String(r.task_id)]));
  const jobOf = new Map(jobs.rows.map((r) => [Number(r.work_order_id), r]));
  const checkOf = new Map(checks.rows.map((r) => [Number(r.work_order_id), Number(r.id)]));
  return wos.map((w) => {
    const m = byId.get(w.id);
    // A status changed outside planned maintenance (Diagnosis, the ops loop) wins over a stale stage.
    const saved = m && isStage(m.stage) ? (m.stage as WoStage) : null;
    const stage = saved && statusForStage(saved) === w.status ? saved : stageForStatus(w.status);
    const task = fromTask.get(w.id) ?? null;
    const job = jobOf.get(w.id);
    const checkId = checkOf.get(w.id) ?? null;
    return {
      id: w.id,
      machineId: w.machineId,
      ruleId: w.ruleId,
      title: w.title,
      component: w.component,
      priority: w.priority,
      status: w.status,
      actionKind: w.actionKind,
      assignee: w.assignee,
      notes: w.notes,
      simTime: w.simTime,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
      stage,
      resumeStage: m && isStage(m.resume_stage) ? (m.resume_stage as WoStage) : null,
      workMode: (m?.work_mode as WorkMode) ?? null,
      plannedStart: iso(m?.planned_start),
      estimateHours: m?.estimate_hours === null || m?.estimate_hours === undefined ? null : Number(m.estimate_hours),
      asFound: (m?.as_found as string) ?? null,
      asLeft: (m?.as_left as string) ?? null,
      readiness: readinessOf(m?.readiness),
      source: w.ruleId ? { kind: "finding", ref: w.ruleId } : task ? { kind: "inspection", ref: task } : { kind: "manual", ref: null },
      // Recorded type first; an inspection defect is preventive, a check or a sensor finding predictive.
      maintenanceType: job?.type_id ?? (task ? "preventive" : checkId !== null || w.ruleId ? "predictive" : null),
      partId: job?.component_id ?? null,
      checkId,
    };
  });
}

async function oneWorkOrder(id: number): Promise<PmsWorkOrder> {
  const res = await query<{ machine_id: string }>("SELECT machine_id FROM work_orders WHERE id = $1", [id]);
  const machineId = res.rows[0]?.machine_id;
  if (!machineId) throw new PmsInputError("Work order not found");
  const wo = (await workOrdersFor(machineId)).find((w) => w.id === id);
  if (!wo) throw new PmsInputError("Work order not found");
  return wo;
}

async function saveMeta(wo: PmsWorkOrder): Promise<void> {
  await query(
    `INSERT INTO maintenance_wo_stages (work_order_id, stage, resume_stage, work_mode, planned_start, estimate_hours, as_found, as_left, readiness)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (work_order_id) DO UPDATE SET
       stage = EXCLUDED.stage, resume_stage = EXCLUDED.resume_stage, work_mode = EXCLUDED.work_mode,
       planned_start = EXCLUDED.planned_start, estimate_hours = EXCLUDED.estimate_hours,
       as_found = EXCLUDED.as_found, as_left = EXCLUDED.as_left, readiness = EXCLUDED.readiness, updated_at = NOW()`,
    [wo.id, wo.stage, wo.resumeStage, wo.workMode, wo.plannedStart, wo.estimateHours, wo.asFound, wo.asLeft, JSON.stringify(wo.readiness)],
  );
}

/**
 * Proposes a work request (report §7). A finding that already has an open
 * request updates it instead of creating a duplicate (PMS-07).
 */
export async function proposeRequest(input: Record<string, unknown>, userId: string | null): Promise<PmsWorkOrder> {
  const machineId = text(input.machineId, 64) ?? "";
  await machineCode(machineId);
  const ruleId = text(input.ruleId, 64);
  const title = text(input.title, 255);
  if (!title) throw new PmsInputError("Describe the work requested");
  await ensureTables();
  if (ruleId) {
    const open = (await workOrdersFor(machineId)).find((w) => w.ruleId === ruleId && isOpenStage(w.stage) && w.status !== "done" && w.status !== "cancelled");
    if (open) {
      await logEvent({ machineId, workOrderId: open.id, action: "finding", reason: "Finding still active; linked to the open request", userId });
      return open;
    }
  }
  const priority = await resolvePriority(input.priority);
  const wo = await createWorkOrder({
    machineId,
    ruleId,
    title,
    component: text(input.component, 255),
    priority,
    actionKind: input.actionKind === "repair" ? "repair" : "mitigate",
    createdByUserId: userId,
    notes: text(input.notes, 4000),
    simTime: typeof input.simTime === "number" ? input.simTime : null,
  });
  const workMode: WorkMode | null = input.workMode === "Isolate" || input.workMode === "Run" ? input.workMode : null;
  // A job an engineer plans with a date goes straight to planning when they may approve work; otherwise it is reviewed first.
  const startAt = typeof input.plannedStart === "string" && input.plannedStart ? Date.parse(input.plannedStart) : NaN;
  const plannedStart = Number.isFinite(startAt) ? new Date(startAt).toISOString() : null;
  const hours = Number(input.estimateHours);
  const estimateHours = input.estimateHours === null || input.estimateHours === undefined || input.estimateHours === "" || !Number.isFinite(hours) || hours <= 0 ? null : Math.min(hours, 2000);
  const stage: WoStage = plannedStart && (await canApprove(userId)) ? "planning" : "awaiting_review";
  await query(
    `INSERT INTO maintenance_wo_stages (work_order_id, stage, work_mode, planned_start, estimate_hours, readiness) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (work_order_id) DO NOTHING`,
    [wo.id, stage, workMode, plannedStart, estimateHours, JSON.stringify(emptyReadiness())],
  );
  const type = input.type === "preventive" || input.type === "predictive" || input.type === "proactive" ? input.type : null;
  if (type)
    await query(
      `INSERT INTO maintenance_job_sources (work_order_id, type_id, component_id, subassembly_ref_id) VALUES ($1, $2, $3, $4)
       ON CONFLICT (work_order_id) DO NOTHING`,
      [wo.id, type, text(input.componentId, 32), text(input.subassemblyRefId, 64)],
    );
  await logEvent({
    machineId,
    workOrderId: wo.id,
    action: "create",
    to: stage,
    reason: ruleId ? `From finding ${ruleId}` : plannedStart ? "Planned by an engineer" : "Manual request",
    userId,
  });
  return oneWorkOrder(wo.id);
}

/** Moves a work order through the lifecycle; every change is validated and audited. */
export async function transitionWorkOrder(id: number, input: Record<string, unknown>, userId: string | null): Promise<PmsWorkOrder> {
  if (!Number.isInteger(id)) throw new PmsInputError("Invalid work order id");
  await ensureTables();
  const wo = await oneWorkOrder(id);
  const to = input.to;
  if (!isStage(to)) throw new PmsInputError("Unknown stage");
  const reason = text(input.reason, 1000) ?? "";
  const t = transitionsFrom(wo).find((x) => x.to === to);
  const blocker = transitionBlocker(wo, to, reason);
  if (blocker) throw new PmsInputError(blocker);
  if (t?.approval && !(await canApprove(userId))) {
    await logEvent({ machineId: wo.machineId, workOrderId: id, action: "denied", from: wo.stage, to, reason: "No approval rights", userId });
    throw new PmsPermissionError("Your role cannot approve, release or close work orders");
  }
  const next: PmsWorkOrder = {
    ...wo,
    stage: to,
    resumeStage: PAUSED.includes(to) ? (PAUSED.includes(wo.stage) ? wo.resumeStage : wo.stage) : null,
  };
  await saveMeta(next);
  const status = statusForStage(to);
  if (status !== wo.status) await query("UPDATE work_orders SET status = $2, updated_at = NOW() WHERE id = $1", [id, status]);
  await logEvent({ machineId: wo.machineId, workOrderId: id, action: "transition", from: wo.stage, to, reason: reason || null, userId });
  return oneWorkOrder(id);
}

/** Planning details: readiness, work mode, window, estimate, as-found / as-left. */
export async function updateWorkOrderDetails(id: number, input: Record<string, unknown>, userId: string | null): Promise<PmsWorkOrder> {
  if (!Number.isInteger(id)) throw new PmsInputError("Invalid work order id");
  await ensureTables();
  const wo = await oneWorkOrder(id);
  if (!isOpenStage(wo.stage)) throw new PmsInputError("A closed work order cannot be changed");
  const next: PmsWorkOrder = { ...wo, readiness: { ...wo.readiness } };
  const changed: string[] = [];
  if (input.readiness && typeof input.readiness === "object") {
    const patch = readinessOf({ ...wo.readiness, ...(input.readiness as object) });
    for (const k of READINESS_KEYS)
      if (patch[k].state !== wo.readiness[k].state || patch[k].note !== wo.readiness[k].note) {
        next.readiness[k] = patch[k];
        changed.push(`${k}: ${patch[k].state}`);
      }
    // Readiness lost after Ready sends the job back to planning (PMS-12).
    if (["ready", "scheduled"].includes(wo.stage) && READINESS_KEYS.some((k) => next.readiness[k].state === "blocked" || next.readiness[k].state === "pending")) {
      next.stage = "planning";
      changed.push("stage: planning (readiness lost)");
    }
  }
  if (input.workMode !== undefined) {
    next.workMode = input.workMode === "Run" || input.workMode === "Isolate" ? input.workMode : null;
    changed.push(`work mode: ${next.workMode ?? "unset"}`);
  }
  if (input.plannedStart !== undefined) {
    const t = typeof input.plannedStart === "string" && input.plannedStart ? Date.parse(input.plannedStart) : NaN;
    next.plannedStart = Number.isFinite(t) ? new Date(t).toISOString() : null;
    // Times are formatted in the plant's zone on the client; the audit line only names the change.
    changed.push(next.plannedStart ? "planned start set" : "planned start cleared");
    if (!next.plannedStart && wo.stage === "scheduled") next.stage = "ready";
  }
  if (input.estimateHours !== undefined) {
    const h = Number(input.estimateHours);
    next.estimateHours = input.estimateHours === null || input.estimateHours === "" || !Number.isFinite(h) || h <= 0 ? null : Math.min(h, 2000);
    changed.push(`estimate: ${next.estimateHours ?? "unset"} h`);
  }
  if (input.asFound !== undefined) {
    next.asFound = text(input.asFound, 4000);
    changed.push("as-found recorded");
  }
  if (input.asLeft !== undefined) {
    next.asLeft = text(input.asLeft, 4000);
    changed.push("as-left recorded");
  }
  if (input.priority !== undefined && input.priority !== wo.priority && (await isPriority(input.priority))) {
    await query("UPDATE work_orders SET priority = $2, updated_at = NOW() WHERE id = $1", [id, input.priority]);
    changed.push(`priority: ${input.priority}`);
  }
  // The owner field shows the assigned user's name; only a changed text replaces that reference.
  const owner = input.assignee === undefined ? undefined : text(input.assignee, 128);
  if (owner !== undefined && owner !== wo.assignee) {
    await query("UPDATE work_orders SET assignee = $2, assignee_user_id = NULL, updated_at = NOW() WHERE id = $1", [id, owner]);
    changed.push(`owner: ${owner ?? "unset"}`);
  }
  if (!changed.length) return wo;
  await saveMeta(next);
  const status = statusForStage(next.stage);
  if (status !== wo.status) await query("UPDATE work_orders SET status = $2, updated_at = NOW() WHERE id = $1", [id, status]);
  await logEvent({
    machineId: wo.machineId,
    workOrderId: id,
    action: input.readiness ? "readiness" : "details",
    from: next.stage !== wo.stage ? wo.stage : null,
    to: next.stage !== wo.stage ? next.stage : null,
    reason: changed.join(" · "),
    userId,
  });
  return oneWorkOrder(id);
}

/* ------------------------------------------------------------ snapshot */

export async function getPms(machineId: string, userId: string | null, approveKnown?: boolean): Promise<PmsSnapshot> {
  await machineCode(machineId);
  await ensureTables();
  const [plans, workOrders, records, events, approve] = await Promise.all([
    plansFor(machineId),
    workOrdersFor(machineId),
    query(`${RECORD_SELECT} WHERE mr.machine_id = $1 ORDER BY mr.recorded_at DESC, mr.id DESC`, [machineId]),
    query(
      `SELECT e.*, u.full_name AS actor_name, m.code AS machine_code, mu.code AS unit_code, d.kind AS unit_kind, r.plan_code
         FROM maintenance_events e
         JOIN machines m ON m.id = e.machine_id
         LEFT JOIN users u ON u.id = e.actor_user_id
         LEFT JOIN maintenance_units mu ON mu.id = e.unit_id
         LEFT JOIN maintenance_documents d ON d.id = mu.document_id
         LEFT JOIN maintenance_routes r ON r.id = e.route_id
        WHERE e.machine_id = $1 ORDER BY e.at DESC, e.id DESC LIMIT 400`,
      [machineId],
    ),
    approveKnown ?? canApprove(userId),
  ]);
  return {
    machineId,
    documents: await documentsFor(machineId),
    plans,
    workOrders,
    records: records.rows.map(mapRecord),
    events: events.rows.map(
      (r: Row): PmsEvent => ({
        id: Number(r.id),
        machineId: String(r.machine_id),
        workOrderId: r.work_order_id === null ? null : Number(r.work_order_id),
        planId: r.unit_code && r.plan_code ? planId(String(r.machine_code), r.unit_kind as ChecklistKind, String(r.unit_code), String(r.plan_code)) : null,
        action: String(r.action),
        from: (r.from_state as string) ?? null,
        to: (r.to_state as string) ?? null,
        reason: (r.reason as string) ?? null,
        actor: (r.actor_name as string) ?? null,
        at: iso(r.at)!,
      }),
    ),
    canApprove: approve,
  };
}

/** Every machine with planned maintenance in the signed-in user's plant scope, for the Maintenance workspace. */
export async function getPmsLine(userId: string | null): Promise<PmsLine> {
  await ensureTables();
  const approve = await canApprove(userId);
  const all = await maintenanceMachineIds();
  let targetIds = all;
  const allPlants = userId
    ? Boolean((await query<{ all_plants: boolean }>("SELECT r.all_plants FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1", [userId])).rows[0]?.all_plants)
    : false;
  // An all-plants role (super administrator) sees every machine.
  if (userId && !allPlants) {
    const scoped = await query<{ id: string }>(
      `SELECT m.id FROM machines m
         JOIN user_plant_access upa ON upa.plant_id = m.plant_id
        WHERE upa.user_id = $1`,
      [userId],
    );
    const allowed = new Set(scoped.rows.map((r) => String(r.id)));
    // Only the machines of the user's plants: an account with none sees none.
    targetIds = all.filter((id) => allowed.has(id));
  }
  const snapshots = await Promise.all(targetIds.map((id) => getPms(id, userId, approve)));
  return { snapshots, canApprove: approve };
}
