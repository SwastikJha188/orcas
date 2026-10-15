import { query } from "@/server/db";
import { EQUIPMENT_UNITS, SENSOR_UNITS } from "@/server/maintenance/checklists.generated";
import { createWorkOrder } from "@/server/services/ops-service";
import { ADDABLE_ROUTES, freqOf, type RouteId } from "@/lib/maintenance";
import {
  INSPECTION_RESULTS,
  type ChecklistDocument,
  type ChecklistKind,
  type ChecklistTask,
  type ChecklistUnit,
  type InspectionResult,
  type MaintenanceChecklist,
  type MaintenanceRecord,
  type RemovedChecklistItem,
} from "@/types/maintenance";

/*
 * Machine maintenance checklists for the pyro line.
 * Each machine gets the general hardware checks (GEN, instantiated per
 * machine, §1.2) plus the sections of the units it is built from. The main
 * exhaust gas treatment (EXH-IF) follows the preheater ID fan it serves.
 */

export class MaintenanceInputError extends Error {}

const DOCUMENTS: Record<ChecklistKind, ChecklistDocument> = {
  equipment: {
    kind: "equipment",
    number: "OSW-PE-MNT-PYR-01",
    revision: "Rev. 05",
    title: "Pyro-Line Machine & Equipment Maintenance Checklist",
    issued: "15 Oct 2026",
    status: "Design review – not issued for maintenance",
  },
  sensor: {
    kind: "sensor",
    number: "OSW-PE-SMT-PYR-01",
    revision: "Rev. 04",
    title: "Pyro-Line Sensor & Instrument Maintenance Checklist",
    issued: "15 Oct 2026",
    status: "Design review – not issued for maintenance",
  },
};

const MACHINE_UNITS: Record<string, { equipment: string[]; sensor: string[] }> = {
  "PYR-FED-01": { equipment: ["GEN", "FSL-01", "KFS-01"], sensor: ["FSL-01", "KFS-01"] },
  "PYR-PHC-01": { equipment: ["GEN", "PHC-01", "EXH-IF"], sensor: ["PHC-01", "EXH-IF"] },
  "PYR-KLN-01": { equipment: ["GEN", "KLN-01"], sensor: ["KLN-01"] },
  "PYR-BRN-01": { equipment: ["GEN", "BRN-01"], sensor: ["BRN-01"] },
  "PYR-CLR-01": { equipment: ["GEN", "CLR-01"], sensor: ["CLR-01"] },
  "PYR-CCT-01": { equipment: ["GEN", "HMR-01", "CSL-01"], sensor: ["HMR-01", "CSL-01"] },
};

export const hasMaintenanceChecklist = (machineId: string) => machineId in MACHINE_UNITS;

const isKind = (v: unknown): v is ChecklistKind => v === "equipment" || v === "sensor";

function documentUnits(machineId: string, kind: ChecklistKind): ChecklistUnit[] {
  const codes = MACHINE_UNITS[machineId]?.[kind];
  if (!codes) throw new MaintenanceInputError(`No maintenance checklist for ${machineId}`);
  const all = kind === "equipment" ? EQUIPMENT_UNITS : SENSOR_UNITS;
  return codes.map((c) => all.find((u) => u.code === c)).filter((u): u is ChecklistUnit => Boolean(u));
}

function findTask(units: ChecklistUnit[], taskId: string): ChecklistTask | null {
  for (const u of units) for (const g of u.groups) for (const t of g.tasks) if (t.id === taskId) return t;
  return null;
}

/* ------------------------------------------------------------ storage */

const g = globalThis as typeof globalThis & { __ultronMaintenanceReady?: Promise<void> };

const TABLES: Record<string, string[]> = {
  maintenance_records: [
    `CREATE TABLE IF NOT EXISTS maintenance_records (
      id SERIAL PRIMARY KEY,
      machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
      kind VARCHAR(16) NOT NULL CHECK (kind IN ('equipment', 'sensor')),
      task_id VARCHAR(32) NOT NULL,
      result VARCHAR(8) NOT NULL CHECK (result IN ('Pass', 'Defect', 'NA', 'Hold')),
      note TEXT,
      inspector_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
      work_order_id INTEGER REFERENCES work_orders(id) ON DELETE SET NULL,
      recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )`,
    "CREATE INDEX IF NOT EXISTS idx_maintenance_records_machine ON maintenance_records(machine_id, kind, recorded_at DESC)",
  ],
  maintenance_custom_tasks: [
    `CREATE TABLE IF NOT EXISTS maintenance_custom_tasks (
      id SERIAL PRIMARY KEY,
      machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
      kind VARCHAR(16) NOT NULL CHECK (kind IN ('equipment', 'sensor')),
      unit_code VARCHAR(16) NOT NULL,
      group_num VARCHAR(16) NOT NULL,
      route VARCHAR(16) NOT NULL,
      component VARCHAR(200) NOT NULL,
      check_text TEXT NOT NULL,
      pass_text TEXT,
      created_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )`,
    "CREATE INDEX IF NOT EXISTS idx_maintenance_custom_tasks_machine ON maintenance_custom_tasks(machine_id, kind)",
  ],
  maintenance_removed_tasks: [
    `CREATE TABLE IF NOT EXISTS maintenance_removed_tasks (
      machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
      kind VARCHAR(16) NOT NULL CHECK (kind IN ('equipment', 'sensor')),
      task_id VARCHAR(32) NOT NULL,
      removed_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
      removed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      PRIMARY KEY (machine_id, kind, task_id)
    )`,
  ],
};

function ensureTables(): Promise<void> {
  if (!g.__ultronMaintenanceReady) {
    g.__ultronMaintenanceReady = (async () => {
      // DDL retires the whole read cache, so only run it for tables that are missing.
      const names = Object.keys(TABLES);
      const res = await query<{ n: string; t: string | null }>("SELECT n, to_regclass('public.' || n)::text AS t FROM unnest($1::text[]) AS n", [names]);
      const present = new Set(res.rows.filter((r) => r.t).map((r) => r.n));
      for (const name of names) {
        if (present.has(name)) continue;
        for (const ddl of TABLES[name]) await query(ddl);
      }
    })().catch((err) => {
      g.__ultronMaintenanceReady = undefined;
      throw err;
    });
  }
  return g.__ultronMaintenanceReady;
}

type Row = Record<string, unknown>;

function mapRecord(r: Row): MaintenanceRecord {
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

const SELECT = `SELECT mr.*, u.full_name AS inspector_name
                  FROM maintenance_records mr
                  LEFT JOIN users u ON u.id = mr.inspector_user_id`;

const customId = (id: unknown) => `U-${Number(id)}`;

/**
 * The machine's checklist as it stands: the document's sections, plus the
 * items added on site for this machine, minus the items taken off it.
 */
async function machineChecklist(machineId: string, kind: ChecklistKind): Promise<{ units: ChecklistUnit[]; removed: RemovedChecklistItem[] }> {
  const base = documentUnits(machineId, kind);
  await ensureTables();
  const [custom, removedRows] = await Promise.all([
    query(
      `SELECT ct.*, u.full_name AS created_by_name FROM maintenance_custom_tasks ct
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
  const units: ChecklistUnit[] = base.map((u) => ({ ...u, groups: u.groups.map((gr) => ({ ...gr, tasks: [...gr.tasks] })) }));
  for (const r of custom.rows) {
    const unit = units.find((u) => u.code === r.unit_code);
    const group = unit?.groups.find((gr) => gr.num === r.group_num);
    if (!group) continue;
    group.tasks.push({
      id: customId(r.id),
      component: String(r.component),
      check: [{ label: null, text: String(r.check_text) }],
      pass: (r.pass_text as string) || "",
      freq: freqOf(r.route as RouteId),
      owner: "",
      mode: "",
      scope: "",
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
  const res = await query(`${SELECT} WHERE mr.machine_id = $1 AND mr.kind = $2 ORDER BY mr.recorded_at DESC, mr.id DESC`, [machineId, k]);
  return { machineId, document: DOCUMENTS[k], units, records: res.rows.map(mapRecord), removed };
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
      priority: "P2",
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
  const res = await query(`${SELECT} WHERE mr.id = $1`, [ins.rows[0].id]);
  return mapRecord(res.rows[0]);
}

/**
 * Takes back a Pass / NA tick (the inspector unticked it). Defects and holds
 * stay on record: a defect has opened a work order, and both are cleared by a
 * later result, not erased.
 */
export async function undoInspection(recordId: number): Promise<void> {
  if (!Number.isInteger(recordId) || recordId <= 0) throw new MaintenanceInputError("recordId is required");
  await ensureTables();
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
  const route = text(input.route, 16) as RouteId;
  if (!ADDABLE_ROUTES[kind].includes(route)) throw new MaintenanceInputError("Pick a round for the item");
  const component = text(input.component, 200);
  const check = text(input.check, 2000);
  const pass = text(input.pass, 2000) || null;
  if (!check) throw new MaintenanceInputError("Describe what to check");
  if (!component) throw new MaintenanceInputError("Name the equipment or component");
  const unitCode = text(input.unitCode, 16);
  const groupNum = text(input.groupNum, 16);
  const unit = documentUnits(machineId, kind).find((u) => u.code === unitCode);
  if (!unit?.groups.some((gr) => gr.num === groupNum)) throw new MaintenanceInputError("Pick the section the item belongs to");

  await ensureTables();
  const ins = await query<{ id: number }>(
    `INSERT INTO maintenance_custom_tasks (machine_id, kind, unit_code, group_num, route, component, check_text, pass_text, created_by_user_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [machineId, kind, unitCode, groupNum, route, component, check, pass, userId],
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
  documentUnits(machineId, kind);
  await ensureTables();
  await query("DELETE FROM maintenance_removed_tasks WHERE machine_id = $1 AND kind = $2 AND task_id = $3", [machineId, kind, taskId]);
}
