import { query } from "@backend/db";

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
  /** The priority's due wording (work_order_priorities.description). */
  dueLabel: string | null;
  /** The assigned user's name, else the crew text. */
  assignee: string | null;
  assigneeUserId?: string | null;
  createdByUserId?: string | null;
  notes: string | null;
  simTime: number | null;
  createdAt: string;
  updatedAt: string;
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
    dueLabel: (r.priority_description as string) ?? null,
    assignee: (r.assignee_name as string) ?? (r.assignee as string) ?? null,
    assigneeUserId: (r.assignee_user_id as string) ?? null,
    createdByUserId: (r.created_by_user_id as string) ?? null,
    notes: (r.notes as string) ?? null,
    simTime: r.sim_time === null || r.sim_time === undefined ? null : Number(r.sim_time),
    createdAt: new Date(r.created_at as string).toISOString(),
    updatedAt: new Date(r.updated_at as string).toISOString(),
  };
}

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Work-order columns plus the names read by reference: the assigned user and the priority's due wording. */
const WO_COLUMNS = `wo.*, u.full_name AS assignee_name, p.description AS priority_description`;
const WO_JOINS = `LEFT JOIN users u ON u.id = wo.assignee_user_id
       LEFT JOIN work_order_priorities p ON p.id = wo.priority`;

export async function listWorkOrders(machineId?: string | null, plantId?: string | null): Promise<WorkOrder[]> {
  if (machineId) {
    const res = await query(
      `SELECT ${WO_COLUMNS}
         FROM work_orders wo
       ${WO_JOINS}
        WHERE wo.machine_id = $1
        ORDER BY wo.created_at DESC, wo.id DESC`,
      [machineId],
    );
    return res.rows.map(mapWorkOrder);
  }
  if (plantId) {
    const res = await query(
      `SELECT ${WO_COLUMNS}
         FROM work_orders wo
       ${WO_JOINS}
         JOIN hierarchy_nodes hn ON hn.machine_id = wo.machine_id AND hn.plant_id = $1
        ORDER BY wo.created_at DESC, wo.id DESC`,
      [plantId],
    );
    return res.rows.map(mapWorkOrder);
  }
  const res = await query(
    `SELECT ${WO_COLUMNS}
       FROM work_orders wo
     ${WO_JOINS}
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
    `WITH wo AS (
       INSERT INTO work_orders (
         machine_id, rule_id, title, component, priority, action_kind,
         assignee_user_id, assignee, created_by_user_id, notes, sim_time
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
     )
     SELECT ${WO_COLUMNS} FROM wo ${WO_JOINS}`,
    [
      machineId,
      str(input.ruleId, 64),
      title,
      str(input.component, 255),
      priority,
      kind,
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
  // A named user is referenced (the name comes through the join); the text is only for a crew that is not a user.
  const uid = patch.assigneeUserId === undefined ? undefined : str(patch.assigneeUserId, 64);
  const crew = patch.assignee === undefined ? undefined : str(patch.assignee, 128);
  if (uid) {
    params.push(uid);
    sets.push(`assignee_user_id = $${params.length}`, "assignee = NULL");
  } else {
    if (uid === null || crew) sets.push("assignee_user_id = NULL");
    if (crew !== undefined) {
      params.push(crew);
      sets.push(`assignee = $${params.length}`);
    }
  }
  if (patch.priority !== undefined && (await isPriority(patch.priority))) {
    params.push(patch.priority);
    sets.push(`priority = $${params.length}`);
  }
  if (sets.length === 0) throw new OpsInputError("Nothing to update");
  params.push(id);
  const res = await query(
    `WITH wo AS (UPDATE work_orders SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${params.length} RETURNING *)
     SELECT ${WO_COLUMNS} FROM wo ${WO_JOINS}`,
    params,
  );
  return res.rows[0] ? mapWorkOrder(res.rows[0]) : null;
}

export async function deleteWorkOrder(id: number): Promise<boolean> {
  if (!Number.isInteger(id)) throw new OpsInputError("Invalid work order id");
  const res = await query("DELETE FROM work_orders WHERE id = $1", [id]);
  return (res.rowCount ?? 0) > 0;
}
