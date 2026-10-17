import { query } from "@/server/db";
import { createWorkOrder, listWorkOrders } from "@/server/services/ops-service";
import {
  MAINTENANCE_MACHINE_IDS,
  RECORD_SELECT,
  documentsFor,
  ensureTables as ensureChecklistTables,
  hasMaintenanceChecklist,
  machineChecklist,
  mapRecord,
} from "@/server/services/maintenance-service";
import { routeOf } from "@/lib/maintenance";
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
} from "@/lib/pms";
import { PYRO_MACHINE_BY_ID } from "@/lib/pyro-sim/signals";
import { VPC_MACHINE_BY_ID } from "@/lib/vpc-sim/signals";
import type { ChecklistKind } from "@/types/maintenance";
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
} from "@/types/pms";

/*
 * Planned maintenance for the pyro-line machines (OSW-SW-PMS-PYR-01 Rev.00).
 *
 *   maintenance_plan_states  one row per plan: state, schedule start, approval
 *   maintenance_wo_stages    PMS layer on work_orders: stage, readiness, as-found / as-left
 *   maintenance_events       audit trail: who changed what, from → to, and why
 *
 * Plans are derived from the checklist documents (unit × route); the work
 * orders stay in `work_orders`, so Diagnosis and the ops loop see the same jobs.
 */

export class PmsInputError extends Error {}
export class PmsPermissionError extends Error {}

/* ------------------------------------------------------------ storage */

const g = globalThis as typeof globalThis & { __ultronPmsReady?: Promise<void> };

const TABLES: Record<string, string[]> = {
  maintenance_plan_states: [
    `CREATE TABLE IF NOT EXISTS maintenance_plan_states (
      plan_id VARCHAR(48) PRIMARY KEY,
      machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
      state VARCHAR(16) NOT NULL CHECK (state IN ('Provisional', 'Approved', 'Site verify', 'Retired')),
      activated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      approved_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
      approved_at TIMESTAMP WITH TIME ZONE,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )`,
    "CREATE INDEX IF NOT EXISTS idx_maintenance_plan_states_machine ON maintenance_plan_states(machine_id)",
  ],
  maintenance_wo_stages: [
    `CREATE TABLE IF NOT EXISTS maintenance_wo_stages (
      work_order_id INTEGER PRIMARY KEY REFERENCES work_orders(id) ON DELETE CASCADE,
      stage VARCHAR(24) NOT NULL,
      resume_stage VARCHAR(24),
      work_mode VARCHAR(8) CHECK (work_mode IN ('Run', 'Isolate')),
      planned_start TIMESTAMP WITH TIME ZONE,
      estimate_hours DOUBLE PRECISION,
      as_found TEXT,
      as_left TEXT,
      readiness JSONB,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )`,
  ],
  maintenance_events: [
    `CREATE TABLE IF NOT EXISTS maintenance_events (
      id SERIAL PRIMARY KEY,
      machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
      work_order_id INTEGER REFERENCES work_orders(id) ON DELETE SET NULL,
      plan_id VARCHAR(48),
      action VARCHAR(24) NOT NULL,
      from_state VARCHAR(32),
      to_state VARCHAR(32),
      reason TEXT,
      actor_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
      at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )`,
    "CREATE INDEX IF NOT EXISTS idx_maintenance_events_machine ON maintenance_events(machine_id, at DESC)",
  ],
};

function ensureTables(): Promise<void> {
  if (!g.__ultronPmsReady) {
    g.__ultronPmsReady = (async () => {
      await ensureChecklistTables();
      // DDL retires the whole read cache, so only run it for tables that are missing.
      const names = Object.keys(TABLES);
      const res = await query<{ n: string; t: string | null }>("SELECT n, to_regclass('public.' || n)::text AS t FROM unnest($1::text[]) AS n", [names]);
      const present = new Set(res.rows.filter((r) => r.t).map((r) => r.n));
      for (const name of names) {
        if (present.has(name)) continue;
        for (const ddl of TABLES[name]) await query(ddl);
      }
    })().catch((err) => {
      g.__ultronPmsReady = undefined;
      throw err;
    });
  }
  return g.__ultronPmsReady;
}

type Row = Record<string, unknown>;
const iso = (v: unknown) => (v === null || v === undefined ? null : new Date(v as string).toISOString());
const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

function machineCode(machineId: string): string {
  const m = PYRO_MACHINE_BY_ID[machineId] ?? VPC_MACHINE_BY_ID[machineId];
  if (!m || !hasMaintenanceChecklist(machineId)) throw new PmsInputError(`No planned maintenance for ${machineId}`);
  return m.code;
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
  planId?: string | null;
  action: string;
  from?: string | null;
  to?: string | null;
  reason?: string | null;
  userId: string | null;
}): Promise<void> {
  await query(
    `INSERT INTO maintenance_events (machine_id, work_order_id, plan_id, action, from_state, to_state, reason, actor_user_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [e.machineId, e.workOrderId ?? null, e.planId ?? null, e.action, e.from ?? null, e.to ?? null, e.reason ?? null, e.userId],
  );
}

/* ------------------------------------------------------------ plans */

type PlanBase = Omit<PmsPlan, "state" | "activatedAt" | "approvedBy" | "approvedAt">;

async function buildPlans(machineId: string): Promise<PlanBase[]> {
  const code = machineCode(machineId);
  const out: PlanBase[] = [];
  for (const kind of ["equipment", "sensor"] as ChecklistKind[]) {
    const { units } = await machineChecklist(machineId, kind);
    for (const unit of units) {
      const byRoute = new Map<string, { sections: Set<string>; tasks: PlanTask[] }>();
      for (const gr of unit.groups)
        for (const t of gr.tasks) {
          const route = routeOf(t);
          let b = byRoute.get(route);
          if (!b) byRoute.set(route, (b = { sections: new Set(), tasks: [] }));
          b.sections.add(gr.num);
          b.tasks.push({ id: t.id, section: gr.num, sectionTitle: gr.title, component: t.component, tag: t.tag, owner: t.owner, mode: t.mode, scope: t.scope });
        }
      for (const [route, b] of byRoute) {
        const verifyOnly = b.tasks.every((t) => t.scope === "VERIFY");
        const defaultState: PlanState = route === "site" || unit.conditional || verifyOnly ? "Site verify" : "Provisional";
        out.push({
          id: planId(code, kind, unit.code, route as Parameters<typeof planId>[3]),
          machineId,
          kind,
          unitCode: unit.code,
          unitTitle: unit.title,
          route,
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

async function plansFor(machineId: string): Promise<PmsPlan[]> {
  const base = await buildPlans(machineId);
  // First read starts each plan's schedule; existing rows keep theirs.
  await query(
    `INSERT INTO maintenance_plan_states (plan_id, machine_id, state)
     SELECT id, $1, state FROM unnest($2::text[], $3::text[]) AS t(id, state)
     ON CONFLICT (plan_id) DO NOTHING`,
    [machineId, base.map((p) => p.id), base.map((p) => p.defaultState)],
  );
  const res = await query(
    `SELECT ps.*, u.full_name AS approved_by_name FROM maintenance_plan_states ps
       LEFT JOIN users u ON u.id = ps.approved_by_user_id
      WHERE ps.machine_id = $1`,
    [machineId],
  );
  const rows = new Map(res.rows.map((r) => [String(r.plan_id), r]));
  return base.map((p) => {
    const r = rows.get(p.id);
    return {
      ...p,
      state: (r?.state as PlanState) ?? p.defaultState,
      activatedAt: iso(r?.activated_at) ?? new Date().toISOString(),
      approvedBy: (r?.approved_by_name as string) ?? null,
      approvedAt: iso(r?.approved_at),
    };
  });
}

/** Changes a plan's state. Approval needs approval rights; any change is audited. */
export async function setPlanState(input: Record<string, unknown>, userId: string | null): Promise<PmsPlan> {
  const machineId = text(input.machineId, 64) ?? "";
  const id = text(input.planId, 48) ?? "";
  const state = input.state as PlanState;
  const reason = text(input.reason, 1000);
  if (!PLAN_STATES.includes(state)) throw new PmsInputError("Unknown plan state");
  await ensureTables();
  const plans = await plansFor(machineId);
  const plan = plans.find((p) => p.id === id);
  if (!plan) throw new PmsInputError(`${id} is not a plan of ${machineId}`);
  if (plan.state === state) return plan;
  if (state === "Approved" && !(await canApprove(userId))) throw new PmsPermissionError("Your role cannot approve maintenance plans");
  if ((state === "Retired" || state === "Site verify") && !reason) throw new PmsInputError("Record the reason");
  const restart = (state === "Provisional" || state === "Approved") && !(plan.state === "Provisional" || plan.state === "Approved");
  await query(
    `UPDATE maintenance_plan_states
        SET state = $2::varchar,
            approved_by_user_id = CASE WHEN $2::varchar = 'Approved' THEN $3::varchar ELSE NULL END,
            approved_at = CASE WHEN $2::varchar = 'Approved' THEN NOW() ELSE NULL END,
            activated_at = CASE WHEN $4::boolean THEN NOW() ELSE activated_at END,
            updated_at = NOW()
      WHERE plan_id = $1`,
    [id, state, userId, restart],
  );
  await logEvent({ machineId, planId: id, action: "plan-state", from: plan.state, to: state, reason, userId });
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
  const [wos, meta, sources] = await Promise.all([
    listWorkOrders(machineId),
    query(
      `SELECT s.* FROM maintenance_wo_stages s JOIN work_orders wo ON wo.id = s.work_order_id WHERE wo.machine_id = $1`,
      [machineId],
    ),
    query<{ work_order_id: number; task_id: string }>(
      "SELECT work_order_id, task_id FROM maintenance_records WHERE machine_id = $1 AND work_order_id IS NOT NULL",
      [machineId],
    ),
  ]);
  const byId = new Map(meta.rows.map((r) => [Number(r.work_order_id), r]));
  const fromTask = new Map(sources.rows.map((r) => [Number(r.work_order_id), String(r.task_id)]));
  return wos.map((w) => {
    const m = byId.get(w.id);
    // A status changed outside planned maintenance (Diagnosis, the ops loop) wins over a stale stage.
    const saved = m && isStage(m.stage) ? (m.stage as WoStage) : null;
    const stage = saved && statusForStage(saved) === w.status ? saved : stageForStatus(w.status);
    const task = fromTask.get(w.id) ?? null;
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
  machineCode(machineId);
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
  const priority = ["P1", "P2", "P3", "P4"].includes(input.priority as string) ? (input.priority as string) : "P3";
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
  await query(
    `INSERT INTO maintenance_wo_stages (work_order_id, stage, work_mode, readiness) VALUES ($1, 'awaiting_review', $2, $3)
     ON CONFLICT (work_order_id) DO NOTHING`,
    [wo.id, workMode, JSON.stringify(emptyReadiness())],
  );
  await logEvent({ machineId, workOrderId: wo.id, action: "create", to: "awaiting_review", reason: ruleId ? `From finding ${ruleId}` : "Manual request", userId });
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
  if (input.priority !== undefined && ["P1", "P2", "P3", "P4"].includes(input.priority as string) && input.priority !== wo.priority) {
    await query("UPDATE work_orders SET priority = $2, updated_at = NOW() WHERE id = $1", [id, input.priority]);
    changed.push(`priority: ${input.priority}`);
  }
  if (input.assignee !== undefined) {
    await query("UPDATE work_orders SET assignee = $2, updated_at = NOW() WHERE id = $1", [id, text(input.assignee, 128)]);
    changed.push(`owner: ${text(input.assignee, 128) ?? "unset"}`);
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
  machineCode(machineId);
  await ensureTables();
  const [plans, workOrders, records, events, approve] = await Promise.all([
    plansFor(machineId),
    workOrdersFor(machineId),
    query(`${RECORD_SELECT} WHERE mr.machine_id = $1 ORDER BY mr.recorded_at DESC, mr.id DESC`, [machineId]),
    query(
      `SELECT e.*, u.full_name AS actor_name FROM maintenance_events e
         LEFT JOIN users u ON u.id = e.actor_user_id
        WHERE e.machine_id = $1 ORDER BY e.at DESC, e.id DESC LIMIT 400`,
      [machineId],
    ),
    approveKnown ?? canApprove(userId),
  ]);
  return {
    machineId,
    documents: documentsFor(machineId),
    plans,
    workOrders,
    records: records.rows.map(mapRecord),
    events: events.rows.map(
      (r: Row): PmsEvent => ({
        id: Number(r.id),
        machineId: String(r.machine_id),
        workOrderId: r.work_order_id === null ? null : Number(r.work_order_id),
        planId: (r.plan_id as string) ?? null,
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
  let targetIds = MAINTENANCE_MACHINE_IDS;
  if (userId) {
    const scoped = await query<{ id: string }>(
      `SELECT m.id FROM machines m
         JOIN user_plant_access upa ON upa.plant_id = m.plant_id
        WHERE upa.user_id = $1`,
      [userId],
    );
    const allowed = new Set(scoped.rows.map((r) => String(r.id)));
    const filtered = MAINTENANCE_MACHINE_IDS.filter((id) => allowed.has(id));
    if (filtered.length > 0) targetIds = filtered;
  }
  const snapshots = await Promise.all(targetIds.map((id) => getPms(id, userId, approve)));
  return { snapshots, canApprove: approve };
}
