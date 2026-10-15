import { query } from "@/server/db";

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

export async function createWorkOrder(input: Record<string, unknown>): Promise<WorkOrder> {
  const machineId = str(input.machineId, 64);
  const title = str(input.title, 255);
  if (!machineId || !title) throw new OpsInputError("machineId and title are required");
  const kind = KINDS.includes(input.actionKind as WorkOrderKind) ? (input.actionKind as WorkOrderKind) : "mitigate";
  const priority = ["P1", "P2", "P3", "P4"].includes(input.priority as string) ? (input.priority as string) : "P3";
  const assigneeUserId = str(input.assigneeUserId, 64);
  const createdByUserId = str(input.createdByUserId, 64);
  let assigneeLabel = str(input.assignee, 128);
  if (assigneeUserId && !assigneeLabel) {
    const uRes = await query("SELECT full_name FROM users WHERE id = $1", [assigneeUserId]);
    if (uRes.rows[0]?.full_name) assigneeLabel = String(uRes.rows[0].full_name);
  }

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
  if (patch.priority !== undefined && ["P1", "P2", "P3", "P4"].includes(patch.priority as string)) {
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
  let ackBy = str(input.by, 128);
  if (userId && !ackBy) {
    const uRes = await query("SELECT full_name FROM users WHERE id = $1", [userId]);
    if (uRes.rows[0]?.full_name) ackBy = String(uRes.rows[0].full_name);
  }
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
  return mapAck(res.rows[0]);
}

/** Alert acknowledgements are cleared when the rule returns to QUIET so a recurrence alerts again. */
export async function clearAck(machineId: string, ruleId: string): Promise<void> {
  await query("DELETE FROM alert_acks WHERE machine_id = $1 AND rule_id = $2", [machineId, ruleId]);
}

