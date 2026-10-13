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
    assignee: (r.assignee as string) ?? null,
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
    acknowledgedBy: (r.acknowledged_by as string) ?? null,
    simTime: r.sim_time === null || r.sim_time === undefined ? null : Number(r.sim_time),
  };
}

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export async function listWorkOrders(machineId?: string | null): Promise<WorkOrder[]> {
  const res = machineId
    ? await query("SELECT * FROM work_orders WHERE machine_id = $1 ORDER BY created_at DESC, id DESC", [machineId])
    : await query("SELECT * FROM work_orders ORDER BY created_at DESC, id DESC");
  return res.rows.map(mapWorkOrder);
}

export async function createWorkOrder(input: Record<string, unknown>): Promise<WorkOrder> {
  const machineId = str(input.machineId, 64);
  const title = str(input.title, 255);
  if (!machineId || !title) throw new OpsInputError("machineId and title are required");
  const kind = KINDS.includes(input.actionKind as WorkOrderKind) ? (input.actionKind as WorkOrderKind) : "mitigate";
  const priority = ["P1", "P2", "P3", "P4"].includes(input.priority as string) ? (input.priority as string) : "P3";
  const res = await query(
    `INSERT INTO work_orders (machine_id, rule_id, title, component, priority, action_kind, due_label, assignee, notes, sim_time)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [machineId, str(input.ruleId, 64), title, str(input.component, 255), priority, kind, str(input.dueLabel, 64), str(input.assignee, 128), str(input.notes, 4000), num(input.simTime)],
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
  if (patch.assignee !== undefined) {
    params.push(str(patch.assignee, 128));
    sets.push(`assignee = $${params.length}`);
  }
  if (sets.length === 0) throw new OpsInputError("Nothing to update");
  params.push(id);
  const res = await query(`UPDATE work_orders SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`, params);
  return res.rows[0] ? mapWorkOrder(res.rows[0]) : null;
}

export async function listAcks(machineId?: string | null): Promise<AlertAck[]> {
  const res = machineId
    ? await query("SELECT * FROM alert_acks WHERE machine_id = $1", [machineId])
    : await query("SELECT * FROM alert_acks");
  return res.rows.map(mapAck);
}

export async function acknowledgeAlert(input: Record<string, unknown>): Promise<AlertAck> {
  const ruleId = str(input.ruleId, 64);
  const machineId = str(input.machineId, 64);
  if (!ruleId || !machineId) throw new OpsInputError("ruleId and machineId are required");
  const res = await query(
    `INSERT INTO alert_acks (rule_id, machine_id, acknowledged_by, sim_time) VALUES ($1,$2,$3,$4)
     ON CONFLICT (machine_id, rule_id) DO UPDATE SET acknowledged_at = NOW(), acknowledged_by = EXCLUDED.acknowledged_by, sim_time = EXCLUDED.sim_time
     RETURNING *`,
    [ruleId, machineId, str(input.by, 128), num(input.simTime)],
  );
  return mapAck(res.rows[0]);
}

/** Alert acknowledgements are cleared when the rule returns to QUIET so a recurrence alerts again. */
export async function clearAck(machineId: string, ruleId: string): Promise<void> {
  await query("DELETE FROM alert_acks WHERE machine_id = $1 AND rule_id = $2", [machineId, ruleId]);
}
