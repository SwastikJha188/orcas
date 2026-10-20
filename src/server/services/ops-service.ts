import { query } from "@/server/db";
import type { AlarmOccurrence } from "@/lib/alarm-journal";

export type WorkOrderStatus = "open" | "in_progress" | "done" | "cancelled";
export type WorkOrderKind = "mitigate" | "repair";

export interface WorkOrder {
  id: number;
  machineId: string;
  ruleId: string | null;
  title: string;
  component: string | null;
  priority: string;
  status: WorkOrderStatus;
  actionKind: WorkOrderKind;
  dueLabel: string | null;
  assignee: string | null;
  assigneeUserId?: string | null;
  createdByUserId?: string | null;
  notes: string | null;
  simTime: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AlertAck {
  ruleId: string;
  machineId: string;
  acknowledgedAt: string;
  acknowledgedBy: string | null;
  acknowledgedByUserId?: string | null;
  simTime: number | null;
}

export class OpsInputError extends Error {}

const STATUSES: WorkOrderStatus[] = ["open", "in_progress", "done", "cancelled"];
const KINDS: WorkOrderKind[] = ["mitigate", "repair"];

type Row = Record<string, unknown>;

function mapWorkOrder(r: Row): WorkOrder {
  return {
    id: Number(r.id),
    machineId: String(r.machine_id),
    ruleId: (r.rule_id as string) ?? null,
    title: String(r.title),
    component: (r.component as string) ?? null,
    priority: String(r.priority),
    status: r.status as WorkOrderStatus,
    actionKind: r.action_kind as WorkOrderKind,
    dueLabel: (r.due_label as string) ?? null,
    assignee: (r.assignee_name as string) ?? (r.assignee as string) ?? null,
    assigneeUserId: (r.assignee_user_id as string) ?? null,
    createdByUserId: (r.created_by_user_id as string) ?? null,
    notes: (r.notes as string) ?? null,
    simTime: r.sim_time === null || r.sim_time === undefined ? null : Number(r.sim_time),
    createdAt: new Date(r.created_at as string).toISOString(),
    updatedAt: new Date(r.updated_at as string).toISOString(),
  };
}

function mapAck(r: Row): AlertAck {
  return {
    ruleId: String(r.rule_id),
    machineId: String(r.machine_id),
    acknowledgedAt: new Date(r.acknowledged_at as string).toISOString(),
    acknowledgedBy: (r.ack_user_name as string) ?? (r.acknowledged_by as string) ?? null,
    acknowledgedByUserId: (r.acknowledged_by_user_id as string) ?? null,
    simTime: r.sim_time === null || r.sim_time === undefined ? null : Number(r.sim_time),
  };
}

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export async function listWorkOrders(machineId?: string | null, plantId?: string | null): Promise<WorkOrder[]> {
  if (machineId) {
    const res = await query(
      `SELECT wo.*, u.full_name AS assignee_name
         FROM work_orders wo
         LEFT JOIN users u ON u.id = wo.assignee_user_id
        WHERE wo.machine_id = $1
        ORDER BY wo.created_at DESC, wo.id DESC`,
      [machineId],
    );
    return res.rows.map(mapWorkOrder);
  }
  if (plantId) {
    const res = await query(
      `SELECT wo.*, u.full_name AS assignee_name
         FROM work_orders wo
         LEFT JOIN users u ON u.id = wo.assignee_user_id
         JOIN hierarchy_nodes hn ON hn.machine_id = wo.machine_id AND hn.plant_id = $1
        ORDER BY wo.created_at DESC, wo.id DESC`,
      [plantId],
    );
    return res.rows.map(mapWorkOrder);
  }
  const res = await query(
    `SELECT wo.*, u.full_name AS assignee_name
       FROM work_orders wo
       LEFT JOIN users u ON u.id = wo.assignee_user_id
      ORDER BY wo.created_at DESC, wo.id DESC`,
  );
  return res.rows.map(mapWorkOrder);
}

/**
 * A valid work-order priority id: the requested one when it exists in
 * work_order_priorities, else the table's default for new work orders or for
 * inspection defects.
 */
export async function resolvePriority(requested: unknown, use: "new" | "defect" = "new"): Promise<string> {
  const rows = (await query<{ id: string; default_new: boolean; default_defect: boolean }>("SELECT id, default_new, default_defect FROM work_order_priorities")).rows;
  if (typeof requested === "string" && rows.some((r) => r.id === requested)) return requested;
  const fallback = rows.find((r) => (use === "defect" ? r.default_defect : r.default_new));
  if (!fallback) throw new OpsInputError(`No default work-order priority for ${use === "defect" ? "defects" : "new work orders"} is configured`);
  return fallback.id;
}

/** True when the id is a configured work-order priority. */
export async function isPriority(id: unknown): Promise<boolean> {
  if (typeof id !== "string") return false;
  return Boolean((await query("SELECT 1 FROM work_order_priorities WHERE id = $1", [id])).rowCount);
}

export async function createWorkOrder(input: Record<string, unknown>): Promise<WorkOrder> {
  const machineId = str(input.machineId, 64);
  const title = str(input.title, 255);
  if (!machineId || !title) throw new OpsInputError("machineId and title are required");
  const kind = KINDS.includes(input.actionKind as WorkOrderKind) ? (input.actionKind as WorkOrderKind) : "mitigate";
  const priority = await resolvePriority(input.priority);
  const assigneeUserId = str(input.assigneeUserId, 64);
  const createdByUserId = str(input.createdByUserId, 64);
  // A named user is referenced, never copied; the text label is only for a crew that is not a user.
  const assigneeLabel = assigneeUserId ? null : str(input.assignee, 128);

  const res = await query(
    `INSERT INTO work_orders (
       machine_id, rule_id, title, component, priority, action_kind,
       due_label, assignee_user_id, assignee, created_by_user_id, notes, sim_time
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [
      machineId,
      str(input.ruleId, 64),
      title,
      str(input.component, 255),
      priority,
      kind,
      str(input.dueLabel, 64),
      assigneeUserId,
      assigneeLabel,
      createdByUserId,
      str(input.notes, 4000),
      num(input.simTime),
    ],
  );
  return mapWorkOrder(res.rows[0]);
}

export async function updateWorkOrder(id: number, patch: Record<string, unknown>): Promise<WorkOrder | null> {
  if (!Number.isInteger(id)) throw new OpsInputError("Invalid work order id");
  const sets: string[] = [];
  const params: unknown[] = [];
  if (patch.status !== undefined) {
    if (!STATUSES.includes(patch.status as WorkOrderStatus)) throw new OpsInputError("Invalid status");
    params.push(patch.status);
    sets.push(`status = $${params.length}`);
  }
  if (patch.notes !== undefined) {
    params.push(str(patch.notes, 4000));
    sets.push(`notes = $${params.length}`);
  }
  if (patch.assigneeUserId !== undefined) {
    const uid = str(patch.assigneeUserId, 64);
    params.push(uid);
    sets.push(`assignee_user_id = $${params.length}`);
    if (uid && patch.assignee === undefined) {
      const uRes = await query("SELECT full_name FROM users WHERE id = $1", [uid]);
      if (uRes.rows[0]?.full_name) {
        params.push(String(uRes.rows[0].full_name));
        sets.push(`assignee = $${params.length}`);
      }
    }
  }
  if (patch.assignee !== undefined) {
    params.push(str(patch.assignee, 128));
    sets.push(`assignee = $${params.length}`);
  }
  if (patch.priority !== undefined && (await isPriority(patch.priority))) {
    params.push(patch.priority);
    sets.push(`priority = $${params.length}`);
  }
  if (sets.length === 0) throw new OpsInputError("Nothing to update");
  params.push(id);
  const res = await query(
    `UPDATE work_orders SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
    params,
  );
  return res.rows[0] ? mapWorkOrder(res.rows[0]) : null;
}

export async function deleteWorkOrder(id: number): Promise<boolean> {
  if (!Number.isInteger(id)) throw new OpsInputError("Invalid work order id");
  const res = await query("DELETE FROM work_orders WHERE id = $1", [id]);
  return (res.rowCount ?? 0) > 0;
}

export async function listAcks(machineId?: string | null): Promise<AlertAck[]> {
  const res = machineId
    ? await query(
        `SELECT aa.*, u.full_name AS ack_user_name
           FROM alert_acks aa
           LEFT JOIN users u ON u.id = aa.acknowledged_by_user_id
          WHERE aa.machine_id = $1`,
        [machineId],
      )
    : await query(
        `SELECT aa.*, u.full_name AS ack_user_name
           FROM alert_acks aa
           LEFT JOIN users u ON u.id = aa.acknowledged_by_user_id`,
      );
  return res.rows.map(mapAck);
}

export async function acknowledgeAlert(input: Record<string, unknown>): Promise<AlertAck> {
  const ruleId = str(input.ruleId, 64);
  const machineId = str(input.machineId, 64);
  if (!ruleId || !machineId) throw new OpsInputError("ruleId and machineId are required");
  const userId = str(input.userId, 64);
  // A user is referenced by id (the name comes through the join); the text is for an actor that is not a user.
  const ackBy = userId ? null : str(input.by, 128);
  const res = await query(
    `INSERT INTO alert_acks (rule_id, machine_id, acknowledged_by_user_id, acknowledged_by, sim_time)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (machine_id, rule_id) DO UPDATE SET
       acknowledged_at = NOW(),
       acknowledged_by_user_id = EXCLUDED.acknowledged_by_user_id,
       acknowledged_by = EXCLUDED.acknowledged_by,
       sim_time = EXCLUDED.sim_time
     RETURNING *`,
    [ruleId, machineId, userId, ackBy, num(input.simTime)],
  );
  // Acknowledging the alarm point acknowledges every occurrence still waiting, active or cleared.
  await query(
    `UPDATE alarm_events
        SET acked_at = COALESCE($3::timestamptz, NOW()), acked_sim_t = $4, acked_by_user_id = $5, acked_by = $6
      WHERE machine_id = $1 AND rule_id = $2 AND acked_at IS NULL`,
    [machineId, ruleId, isoTime(input.at), num(input.simTime), userId, ackBy],
  ).catch((err: { code?: string }) => {
    // 42P01: a server started before alarm_events existed; its next start creates the table.
    if (err?.code !== "42P01") throw err;
  });
  return mapAck(res.rows[0]);
}

/* ------------------------------ Alarm journal ------------------------------ */

function mapOccurrence(r: Row): AlarmOccurrence {
  const iso = (v: unknown) => (v === null || v === undefined ? null : new Date(v as string).toISOString());
  const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return {
    id: Number(r.id),
    machineId: String(r.machine_id),
    ruleId: String(r.rule_id),
    raisedAt: new Date(r.raised_at as string).toISOString(),
    raisedSimT: n(r.raised_sim_t),
    clearedAt: iso(r.cleared_at),
    clearedSimT: n(r.cleared_sim_t),
    ackedAt: iso(r.acked_at),
    ackedSimT: n(r.acked_sim_t),
    ackedBy: (r.ack_user_name as string) ?? (r.acked_by as string) ?? null,
    triggerTag: (r.trigger_tag as string) ?? null,
    triggerValue: n(r.trigger_value),
  };
}

const isoTime = (v: unknown) => (typeof v === "string" && Number.isFinite(Date.parse(v)) ? new Date(v).toISOString() : null);

/** Occurrences that still matter on a live page: uncleared, or cleared but not acknowledged. */
export async function listAlarmJournal(machineIds: string[]): Promise<AlarmOccurrence[]> {
  if (machineIds.length === 0) return [];
  const res = await query(
    `SELECT ae.*, u.full_name AS ack_user_name
       FROM alarm_events ae
       LEFT JOIN users u ON u.id = ae.acked_by_user_id
      WHERE ae.machine_id = ANY($1::text[]) AND (ae.cleared_at IS NULL OR ae.acked_at IS NULL)
      ORDER BY ae.raised_at DESC, ae.id DESC
      LIMIT 500`,
    [machineIds],
  );
  return res.rows.map(mapOccurrence);
}

/** Alarm log: a machine's occurrences, newest first, whatever their state. */
export async function listAlarmLog(machineId: string, limit = 200): Promise<AlarmOccurrence[]> {
  const res = await query(
    `SELECT ae.*, u.full_name AS ack_user_name
       FROM alarm_events ae
       LEFT JOIN users u ON u.id = ae.acked_by_user_id
      WHERE ae.machine_id = $1
      ORDER BY ae.raised_at DESC, ae.id DESC
      LIMIT $2`,
    [machineId, Math.max(1, Math.min(1000, Math.trunc(limit) || 200))],
  ).catch((err: { code?: string }) => {
    // 42P01: alarm_events not created yet (see acknowledgeAlert); nothing logged.
    if (err?.code === "42P01") return { rows: [] as Row[] };
    throw err;
  });
  return res.rows.map(mapOccurrence);
}

/**
 * Bring a machine's journal in line with the alarms raised now: raise an
 * occurrence for each raised rule without an open one, clear every open one
 * whose rule is no longer raised. Idempotent, so every page (and a reload)
 * can send it. Returns the machine's journal.
 */
export async function syncAlarmJournal(input: Record<string, unknown>): Promise<AlarmOccurrence[]> {
  const machineId = str(input.machineId, 64);
  const at = isoTime(input.at);
  if (!machineId || !at || !Array.isArray(input.raised)) throw new OpsInputError("machineId, at and raised are required");
  const raised = (input.raised as Record<string, unknown>[])
    .map((a) => ({
      rule_id: str(a?.ruleId, 64),
      raised_at: isoTime(a?.raisedAt),
      raised_sim_t: num(a?.raisedSimT),
      trigger_tag: str(a?.triggerTag, 64),
      trigger_value: num(a?.triggerValue),
    }))
    .filter((a) => a.rule_id && a.raised_at);
  await query(
    `WITH incoming AS (
       SELECT * FROM jsonb_to_recordset($2::jsonb)
         AS x(rule_id text, raised_at timestamptz, raised_sim_t double precision, trigger_tag text, trigger_value double precision)
     ),
     closed AS (
       UPDATE alarm_events ae SET cleared_at = $3::timestamptz, cleared_sim_t = $4
        WHERE ae.machine_id = $1 AND ae.cleared_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM incoming i WHERE i.rule_id = ae.rule_id)
       RETURNING ae.id
     )
     INSERT INTO alarm_events (machine_id, rule_id, raised_at, raised_sim_t, trigger_tag, trigger_value)
     SELECT $1, i.rule_id, i.raised_at, i.raised_sim_t, i.trigger_tag, i.trigger_value FROM incoming i
     ON CONFLICT (machine_id, rule_id) WHERE cleared_at IS NULL DO NOTHING`,
    [machineId, JSON.stringify(raised), at, num(input.simTime)],
  );
  return listAlarmJournal([machineId]);
}

