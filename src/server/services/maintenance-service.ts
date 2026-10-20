import { query } from "@/server/db";
import { ensureMigrations } from "@/server/db/migrate";
import { createWorkOrder, resolvePriority } from "@/server/services/ops-service";
import {
  INSPECTION_RESULTS,
  type ChecklistDocument,
  type ChecklistKind,
  type ChecklistTask,
  type ChecklistUnit,
  type InspectionResult,
  type MaintenanceChecklist,
  type MaintenanceRecord,
  type MaintenanceVocabulary,
  type RemovedChecklistItem,
} from "@/types/maintenance";

/*
 * Machine maintenance checklists, read from the database (migration 014):
 * documents → units → sections → tasks → steps, the vocabulary of rounds,
 * intervals, owners, modes and scopes, and which units each machine is built
 * from. Site-added items and removals are per machine.
 */

export class MaintenanceInputError extends Error {}

const isKind = (v: unknown): v is ChecklistKind => v === "equipment" || v === "sensor";

/** Rounds, intervals and codes (maintenance_routes, _frequencies, _owners, _modes, _scopes). */
export async function getVocabulary(): Promise<MaintenanceVocabulary> {
  const [routes, kindRoutes, freqs, owners, modes, scopes, groups] = await Promise.all([
    query<{ id: string; label: string; interval_hours: number | null; plan_code: string; trigger_label: string; preventive_group_id: string | null }>(
      "SELECT id, label, interval_hours, plan_code, trigger_label, preventive_group_id FROM maintenance_routes ORDER BY sort_order",
    ),
    query<{ kind: ChecklistKind; route_id: string; addable: boolean }>("SELECT kind, route_id, addable FROM maintenance_kind_routes ORDER BY kind, sort_order"),
    query<{ code: string; route_id: string; label: string; canonical: boolean }>("SELECT code, route_id, label, canonical FROM maintenance_frequencies ORDER BY code"),
    query<{ code: string; label: string }>("SELECT code, label FROM maintenance_owners ORDER BY code"),
    query<{ code: string; label: string }>("SELECT code, label FROM maintenance_modes ORDER BY code"),
    query<{ code: string; label: string }>("SELECT code, label FROM maintenance_scopes ORDER BY code"),
    query<{ id: string; label: string }>("SELECT id, label FROM maintenance_preventive_groups ORDER BY sort_order"),
  ]);
  const byKind: MaintenanceVocabulary["kindRoutes"] = { equipment: [], sensor: [] };
  for (const r of kindRoutes.rows) byKind[r.kind].push({ routeId: r.route_id, addable: r.addable });
  return {
    routes: routes.rows.map((r) => ({ id: r.id, label: r.label, intervalHours: r.interval_hours === null ? null : Number(r.interval_hours), planCode: r.plan_code, trigger: r.trigger_label })),
    kindRoutes: byKind,
    frequencies: freqs.rows.map((f) => ({ code: f.code, routeId: f.route_id, label: f.label, canonical: f.canonical })),
    owners: Object.fromEntries(owners.rows.map((o) => [o.code, o.label])),
    modes: Object.fromEntries(modes.rows.map((o) => [o.code, o.label])),
    scopes: Object.fromEntries(scopes.rows.map((o) => [o.code, o.label])),
    preventiveGroups: groups.rows.map((g) => ({ id: g.id, label: g.label, routes: routes.rows.filter((r) => r.preventive_group_id === g.id).map((r) => r.id) })),
  };
}

/** The document each checklist kind of a machine follows. */
export async function documentsFor(machineId: string): Promise<Record<ChecklistKind, ChecklistDocument>> {
  const res = await query<{ kind: ChecklistKind; number: string; revision: string; title: string; issued: string; status: string }>(
    `SELECT md.kind, d.number, d.revision, d.title, d.issued, d.status
       FROM machine_maintenance_documents md JOIN maintenance_documents d ON d.id = md.document_id
      WHERE md.machine_id = $1`,
    [machineId],
  );
  const out = {} as Record<ChecklistKind, ChecklistDocument>;
  for (const r of res.rows) out[r.kind] = { kind: r.kind, number: r.number, revision: r.revision, title: r.title, issued: r.issued, status: r.status };
  if (!out.equipment || !out.sensor) throw new MaintenanceInputError(`No maintenance checklist for ${machineId}`);
  return out;
}

/** Machines that have maintenance checklists, in their unit order. */
export async function maintenanceMachineIds(): Promise<string[]> {
  const res = await query<{ machine_id: string }>("SELECT DISTINCT machine_id FROM machine_maintenance_documents ORDER BY machine_id");
  return res.rows.map((r) => r.machine_id);
}

export async function hasMaintenanceChecklist(machineId: string): Promise<boolean> {
  const res = await query("SELECT 1 FROM machine_maintenance_documents WHERE machine_id = $1 LIMIT 1", [machineId]);
  return Boolean(res.rowCount);
}

interface UnitRow {
  id: number;
  code: string;
  title: string;
  conditional: boolean;
}

/** The document sections of a machine's checklist of one kind, assembled from the database. */
async function documentUnits(machineId: string, kind: ChecklistKind): Promise<Array<ChecklistUnit & { groupIds: Map<string, number> }>> {
  const units = await query<UnitRow>(
    `SELECT u.id, u.code, u.title, u.conditional
       FROM machine_maintenance_units mu
       JOIN maintenance_units u ON u.id = mu.unit_id
       JOIN maintenance_documents d ON d.id = u.document_id
      WHERE mu.machine_id = $1 AND d.kind = $2
      ORDER BY mu.sort_order`,
    [machineId, kind],
  );
  if (!units.rowCount) throw new MaintenanceInputError(`No maintenance checklist for ${machineId}`);
  const unitIds = units.rows.map((u) => u.id);
  const [groups, tasks, steps] = await Promise.all([
    query<{ id: number; unit_id: number; num: string; title: string }>("SELECT id, unit_id, num, title FROM maintenance_groups WHERE unit_id = ANY($1) ORDER BY sort_order", [unitIds]),
    query<Record<string, unknown>>(
      `SELECT t.id, t.group_id, t.code, t.tag, t.component, t.priority, t.pass_text, t.frequency, t.owner, t.mode, t.scope,
              f.route_id, f.label AS interval_label, r.interval_hours, o.label AS owner_label, mo.label AS mode_label, sc.label AS scope_label
         FROM maintenance_tasks t
         JOIN maintenance_groups g ON g.id = t.group_id
         JOIN maintenance_frequencies f ON f.code = t.frequency
         JOIN maintenance_routes r ON r.id = f.route_id
         JOIN maintenance_owners o ON o.code = t.owner
         JOIN maintenance_modes mo ON mo.code = t.mode
         JOIN maintenance_scopes sc ON sc.code = t.scope
        WHERE g.unit_id = ANY($1)
        ORDER BY t.sort_order`,
      [unitIds],
    ),
    query<{ task_id: number; label: string | null; text: string }>(
      `SELECT s.task_id, s.label, s.text FROM maintenance_task_steps s
         JOIN maintenance_tasks t ON t.id = s.task_id JOIN maintenance_groups g ON g.id = t.group_id
        WHERE g.unit_id = ANY($1) ORDER BY s.task_id, s.step_no`,
      [unitIds],
    ),
  ]);
  const stepsBy = new Map<number, ChecklistTask["check"]>();
  for (const st of steps.rows) (stepsBy.get(st.task_id) ?? stepsBy.set(st.task_id, []).get(st.task_id)!).push({ label: st.label, text: st.text });
  return units.rows.map((u) => {
    const gs = groups.rows.filter((g) => g.unit_id === u.id);
    return {
      code: u.code,
      title: u.title,
      ...(u.conditional ? { conditional: true } : {}),
      groupIds: new Map(gs.map((g) => [g.num, g.id])),
      groups: gs.map((g) => ({
        num: g.num,
        title: g.title,
        tasks: tasks.rows
          .filter((t) => Number(t.group_id) === g.id)
          .map((t) => ({
            id: String(t.code),
            ...(t.tag ? { tag: String(t.tag) } : {}),
            component: String(t.component),
            ...(t.priority ? { priority: String(t.priority) } : {}),
            check: stepsBy.get(Number(t.id)) ?? [],
            pass: String(t.pass_text),
            freq: String(t.frequency),
            route: String(t.route_id),
            intervalHours: t.interval_hours === null ? null : Number(t.interval_hours),
            interval: String(t.interval_label),
            owner: String(t.owner),
            ownerLabel: String(t.owner_label),
            mode: String(t.mode),
            modeLabel: String(t.mode_label),
            scope: String(t.scope),
            scopeLabel: String(t.scope_label),
          })),
      })),
    };
  });
}

function findTask(units: ChecklistUnit[], taskId: string): ChecklistTask | null {
  for (const u of units) for (const g of u.groups) for (const t of g.tasks) if (t.id === taskId) return t;
  return null;
}

/** Kept for callers that awaited table creation; the tables come from the migrations now. */
export function ensureTables(): Promise<void> {
  return ensureMigrations().then(() => undefined);
}

type Row = Record<string, unknown>;

export function mapRecord(r: Row): MaintenanceRecord {
  return {
    id: Number(r.id),
    machineId: String(r.machine_id),
    kind: r.kind as ChecklistKind,
    taskId: String(r.task_id),
    result: r.result as InspectionResult,
    note: (r.note as string) ?? null,
    inspector: (r.inspector_name as string) ?? null,
    workOrderId: r.work_order_id === null || r.work_order_id === undefined ? null : Number(r.work_order_id),
    recordedAt: new Date(r.recorded_at as string).toISOString(),
  };
}

export const RECORD_SELECT = `SELECT mr.*, u.full_name AS inspector_name
                  FROM maintenance_records mr
                  LEFT JOIN users u ON u.id = mr.inspector_user_id`;

const customId = (id: unknown) => `U-${Number(id)}`;

/**
 * The machine's checklist as it stands: the document's sections, plus the
 * items added on site for this machine, minus the items taken off it.
 */
export async function machineChecklist(machineId: string, kind: ChecklistKind): Promise<{ units: ChecklistUnit[]; removed: RemovedChecklistItem[] }> {
  const base = await documentUnits(machineId, kind);
  const [custom, removedRows] = await Promise.all([
    query(
      `SELECT ct.*, u.full_name AS created_by_name, g.num AS group_num, mu.code AS unit_code,
              f.code AS freq, f.label AS interval_label, r.interval_hours
         FROM maintenance_custom_tasks ct
         JOIN maintenance_groups g ON g.id = ct.group_id
         JOIN maintenance_units mu ON mu.id = g.unit_id
         JOIN maintenance_routes r ON r.id = ct.route_id
         LEFT JOIN maintenance_frequencies f ON f.route_id = ct.route_id AND f.canonical
         LEFT JOIN users u ON u.id = ct.created_by_user_id
        WHERE ct.machine_id = $1 AND ct.kind = $2 ORDER BY ct.id`,
      [machineId, kind],
    ),
    query(
      `SELECT rt.*, u.full_name AS removed_by_name FROM maintenance_removed_tasks rt
         LEFT JOIN users u ON u.id = rt.removed_by_user_id
        WHERE rt.machine_id = $1 AND rt.kind = $2 ORDER BY rt.removed_at DESC`,
      [machineId, kind],
    ),
  ]);
  const removedAt = new Map(removedRows.rows.map((r) => [String(r.task_id), r]));

  // Copy the shared document sections so this machine's additions never leak into them.
  const units: ChecklistUnit[] = base.map(({ groupIds: _ids, ...u }) => (void _ids, { ...u, groups: u.groups.map((gr) => ({ ...gr, tasks: [...gr.tasks] })) }));
  for (const r of custom.rows) {
    const unit = units.find((u) => u.code === r.unit_code);
    const group = unit?.groups.find((gr) => gr.num === r.group_num);
    if (!group) continue;
    group.tasks.push({
      id: customId(r.id),
      component: String(r.component),
      check: [{ label: null, text: String(r.check_text) }],
      pass: (r.pass_text as string) || "",
      freq: (r.freq as string) ?? "",
      route: String(r.route_id),
      intervalHours: r.interval_hours === null ? null : Number(r.interval_hours),
      interval: (r.interval_label as string) ?? "",
      owner: "",
      ownerLabel: "",
      mode: "",
      modeLabel: "",
      scope: "",
      scopeLabel: "",
      added: { by: (r.created_by_name as string) ?? null, at: new Date(r.created_at as string).toISOString() },
    });
  }

  const removed: RemovedChecklistItem[] = [];
  for (const u of units)
    for (const gr of u.groups) {
      gr.tasks = gr.tasks.filter((t) => {
        const r = removedAt.get(t.id);
        if (!r) return true;
        removed.push({
          taskId: t.id,
          component: t.component,
          text: (t.check.find((s) => s.label !== "Location") ?? t.check[0])?.text ?? "",
          where: `${u.code === "GEN" ? "General" : u.code} · ${gr.title}`,
          removedBy: (r.removed_by_name as string) ?? null,
          removedAt: new Date(r.removed_at as string).toISOString(),
        });
        return false;
      });
    }
  removed.sort((a, b) => b.removedAt.localeCompare(a.removedAt));
  return { units, removed };
}

/* ------------------------------------------------------------ API */

export async function getChecklist(machineId: string, kind: unknown): Promise<MaintenanceChecklist> {
  const k: ChecklistKind = isKind(kind) ? kind : "equipment";
  const { units, removed } = await machineChecklist(machineId, k);
  const res = await query(`${RECORD_SELECT} WHERE mr.machine_id = $1 AND mr.kind = $2 ORDER BY mr.recorded_at DESC, mr.id DESC`, [machineId, k]);
  return { machineId, document: (await documentsFor(machineId))[k], units, records: res.rows.map(mapRecord), removed };
}

/**
 * Records one inspection. A defect opens a repair work order carrying the
 * as-found observation; defects and holds need that observation.
 */
export async function recordInspection(input: Record<string, unknown>, userId: string | null): Promise<MaintenanceRecord> {
  const machineId = typeof input.machineId === "string" ? input.machineId : "";
  const kind = input.kind;
  const taskId = typeof input.taskId === "string" ? input.taskId.trim() : "";
  const result = input.result as InspectionResult;
  const note = typeof input.note === "string" && input.note.trim() ? input.note.trim().slice(0, 2000) : null;
  if (!isKind(kind)) throw new MaintenanceInputError("kind must be equipment or sensor");
  if (!INSPECTION_RESULTS.includes(result)) throw new MaintenanceInputError("result must be Pass, Defect, NA or Hold");
  const task = findTask((await machineChecklist(machineId, kind)).units, taskId);
  if (!task) throw new MaintenanceInputError(`Task ${taskId} is not on the ${machineId} checklist`);
  if ((result === "Defect" || result === "Hold") && !note) throw new MaintenanceInputError("Record the as-found observation");

  let workOrderId: number | null = null;
  if (result === "Defect") {
    const wo = await createWorkOrder({
      machineId,
      title: `${task.id} defect · ${task.tag ? `${task.tag} ` : ""}${task.component}`,
      component: task.component,
      priority: await resolvePriority(undefined, "defect"),
      actionKind: "repair",
      createdByUserId: userId,
      notes: `As found: ${note}${task.pass ? `\nPass condition: ${task.pass}` : ""}`,
    });
    workOrderId = wo.id;
  }
  const ins = await query<{ id: number }>(
    `INSERT INTO maintenance_records (machine_id, kind, task_id, result, note, inspector_user_id, work_order_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [machineId, kind, task.id, result, note, userId, workOrderId],
  );
  const res = await query(`${RECORD_SELECT} WHERE mr.id = $1`, [ins.rows[0].id]);
  return mapRecord(res.rows[0]);
}

/**
 * Takes back a Pass / NA tick (the inspector unticked it). Defects and holds
 * stay on record: a defect has opened a work order, and both are cleared by a
 * later result, not erased.
 */
export async function undoInspection(recordId: number): Promise<void> {
  if (!Number.isInteger(recordId) || recordId <= 0) throw new MaintenanceInputError("recordId is required");
  const res = await query<{ result: string }>("SELECT result FROM maintenance_records WHERE id = $1", [recordId]);
  const row = res.rows[0];
  if (!row) throw new MaintenanceInputError("That result no longer exists");
  if (row.result !== "Pass" && row.result !== "NA") throw new MaintenanceInputError("Defects and holds are cleared by a new result, not undone");
  await query("DELETE FROM maintenance_records WHERE id = $1", [recordId]);
}

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Adds a site item to one section of this machine's checklist. */
export async function addChecklistItem(input: Record<string, unknown>, userId: string | null): Promise<ChecklistTask> {
  const machineId = text(input.machineId, 64);
  const kind = input.kind;
  if (!isKind(kind)) throw new MaintenanceInputError("kind must be equipment or sensor");
  const route = text(input.route, 16);
  const addable = await query("SELECT 1 FROM maintenance_kind_routes WHERE kind = $1 AND route_id = $2 AND addable", [kind, route]);
  if (!addable.rowCount) throw new MaintenanceInputError("Pick a round for the item");
  const component = text(input.component, 200);
  const check = text(input.check, 2000);
  const pass = text(input.pass, 2000) || null;
  if (!check) throw new MaintenanceInputError("Describe what to check");
  if (!component) throw new MaintenanceInputError("Name the equipment or component");
  const unitCode = text(input.unitCode, 16);
  const groupNum = text(input.groupNum, 16);
  const unit = (await documentUnits(machineId, kind)).find((u) => u.code === unitCode);
  const groupId = unit?.groupIds.get(groupNum);
  if (!groupId) throw new MaintenanceInputError("Pick the section the item belongs to");

  const ins = await query<{ id: number }>(
    `INSERT INTO maintenance_custom_tasks (machine_id, kind, group_id, route_id, component, check_text, pass_text, created_by_user_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [machineId, kind, groupId, route, component, check, pass, userId],
  );
  const id = customId(ins.rows[0].id);
  const task = findTask((await machineChecklist(machineId, kind)).units, id);
  if (!task) throw new MaintenanceInputError("The item was saved but could not be read back");
  return task;
}

/**
 * Takes an item off this machine's checklist. Nothing is erased: its results
 * stay on record and the item can be put back.
 */
export async function removeChecklistItem(input: Record<string, unknown>, userId: string | null): Promise<void> {
  const machineId = text(input.machineId, 64);
  const kind = input.kind;
  const taskId = text(input.taskId, 32);
  if (!isKind(kind)) throw new MaintenanceInputError("kind must be equipment or sensor");
  if (!findTask((await machineChecklist(machineId, kind)).units, taskId)) throw new MaintenanceInputError(`${taskId} is not on the ${machineId} checklist`);
  await query(
    `INSERT INTO maintenance_removed_tasks (machine_id, kind, task_id, removed_by_user_id) VALUES ($1,$2,$3,$4)
     ON CONFLICT (machine_id, kind, task_id) DO NOTHING`,
    [machineId, kind, taskId, userId],
  );
}

/** Puts a removed item back on this machine's checklist. */
export async function restoreChecklistItem(input: Record<string, unknown>): Promise<void> {
  const machineId = text(input.machineId, 64);
  const kind = input.kind;
  const taskId = text(input.taskId, 32);
  if (!isKind(kind)) throw new MaintenanceInputError("kind must be equipment or sensor");
  await documentUnits(machineId, kind);
  await query("DELETE FROM maintenance_removed_tasks WHERE machine_id = $1 AND kind = $2 AND task_id = $3", [machineId, kind, taskId]);
}
