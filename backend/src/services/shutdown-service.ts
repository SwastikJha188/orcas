import pool, { query } from "@backend/db";
import { PmsInputError, PmsPermissionError, canApprove } from "@backend/services/pms-service";
import { hasMaintenanceChecklist, machineChecklist } from "@backend/services/maintenance-service";
import { createSapShutdownOrders, sapShutdownOrders } from "@backend/sap/service";
import { InputError, NotFoundError } from "@backend/errors";
import { PLANNING_SHUTDOWN, isActiveShutdown, isOpenShutdown, shutdownStep, shutdownStepBlocker } from "@shared/lib/shutdown";
import type {
  PartsState,
  ShutdownComparison,
  ShutdownCrew,
  ShutdownDetail,
  ShutdownEvent,
  ShutdownIsolation,
  ShutdownItem,
  ShutdownItemKind,
  ShutdownList,
  ShutdownMachine,
  ShutdownState,
  ShutdownSummary,
  ShutdownVocabulary,
} from "@shared/types/shutdown";

/*
 * Shutdowns (migration 061): one planned stop of a plant's machines.
 *
 *   plan       machines, window, the work (checklist items, work orders, part replacements), crews
 *   stop       the machines show "Maintenance" (service state) from the start of the stop until the
 *              restart is approved, so readings caused by the stop raise no new alarms
 *   work       lock-off points and blanks recorded; the work is done and found work added
 *   restart    approved only when every lock-off is released, every blank removed and every item
 *              done or moved to the next shutdown; then the readings after the restart are
 *              compared with the hours before the stop
 *
 * ULTRON records permits and lock-offs; it never says equipment is safe to work on.
 */

type Row = Record<string, unknown>;
const iso = (v: unknown) => (v === null || v === undefined ? null : new Date(v as string).toISOString());
const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
const PARTS_STATES: PartsState[] = ["pending", "confirmed", "blocked", "na"];

function instant(v: unknown, label: string): string {
  const t = typeof v === "string" && v ? Date.parse(v) : NaN;
  if (!Number.isFinite(t)) throw new PmsInputError(`Pick the ${label}`);
  return new Date(t).toISOString();
}

/** Hours as a positive number, null to clear; `undefined` when the field was not sent. */
function hoursOf(v: unknown, max: number): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const h = Number(v);
  if (!Number.isFinite(h) || h < 0) throw new PmsInputError("Enter hours as a number, like 1.5");
  return h === 0 ? null : Math.min(h, max);
}

async function logEvent(shutdownId: number, e: { action: string; from?: ShutdownState | null; to?: ShutdownState | null; reason?: string | null; userId: string | null }) {
  await query("INSERT INTO shutdown_events (shutdown_id, action, from_state, to_state, reason, actor_user_id) VALUES ($1,$2,$3,$4,$5,$6)", [
    shutdownId,
    e.action,
    e.from ?? null,
    e.to ?? null,
    e.reason ?? null,
    e.userId,
  ]);
}

/* ------------------------------------------------------------ reads */

export async function shutdownVocabulary(): Promise<ShutdownVocabulary> {
  const [states, kinds, owners] = await Promise.all([
    query<{ id: ShutdownState; label: string }>("SELECT id, label FROM shutdown_states ORDER BY sort_order"),
    query<{ id: string; label: string; is_blank: boolean }>("SELECT id, label, is_blank FROM shutdown_isolation_kinds ORDER BY sort_order"),
    query<{ code: string; label: string }>("SELECT code, label FROM maintenance_owners ORDER BY code"),
  ]);
  return {
    states: states.rows,
    isolationKinds: kinds.rows.map((k) => ({ id: k.id, label: k.label, isBlank: k.is_blank })),
    owners: owners.rows,
  };
}

const SUMMARY_SELECT = `
  SELECT s.id, s.plant_id, s.name, s.planned_start, s.planned_end, s.state_id, s.notes, u.full_name AS created_by,
         COALESCE((SELECT array_agg(sm.machine_id ORDER BY sm.machine_id) FROM shutdown_machines sm WHERE sm.shutdown_id = s.id), '{}') AS machine_ids,
         (SELECT count(*)::int FROM shutdown_items i WHERE i.shutdown_id = s.id) AS items
    FROM shutdowns s LEFT JOIN users u ON u.id = s.created_by_user_id`;

function mapSummary(r: Row): ShutdownSummary {
  return {
    id: Number(r.id),
    plantId: String(r.plant_id),
    name: String(r.name),
    plannedStart: iso(r.planned_start)!,
    plannedEnd: iso(r.planned_end)!,
    state: r.state_id as ShutdownState,
    machineIds: (r.machine_ids as string[]) ?? [],
    items: Number(r.items ?? 0),
  };
}

export async function listShutdowns(plantId: string, userId: string | null): Promise<ShutdownList> {
  const [rows, vocabulary, approve, sap] = await Promise.all([
    query(`${SUMMARY_SELECT} WHERE s.plant_id = $1 ORDER BY s.planned_start DESC, s.id DESC`, [plantId]),
    shutdownVocabulary(),
    canApprove(userId),
    query("SELECT 1 FROM sap_connections WHERE plant_id = $1 AND enabled", [plantId]),
  ]);
  return { shutdowns: rows.rows.map(mapSummary), vocabulary, canApprove: approve, sapConnected: Boolean(sap.rowCount) };
}

/** The plant a shutdown belongs to (for the access check); not found → input error. */
export async function shutdownPlant(id: number): Promise<string> {
  if (!Number.isInteger(id)) throw new PmsInputError("Invalid shutdown id");
  const res = await query<{ plant_id: string }>("SELECT plant_id FROM shutdowns WHERE id = $1", [id]);
  if (!res.rows[0]) throw new PmsInputError("Shutdown not found");
  return res.rows[0].plant_id;
}

async function phasesOf(id: number): Promise<Partial<Record<ShutdownState, string>>> {
  const res = await query<{ to_state: ShutdownState; at: Date }>(
    `SELECT DISTINCT ON (to_state) to_state, at FROM shutdown_events
      WHERE shutdown_id = $1 AND to_state IS NOT NULL ORDER BY to_state, at DESC, id DESC`,
    [id],
  );
  return Object.fromEntries(res.rows.map((r) => [r.to_state, iso(r.at)!]));
}

/** The work items with what was done during this shutdown (since its stop began). */
async function itemsOf(id: number, since: string | null): Promise<ShutdownItem[]> {
  const res = await query(
    `SELECT i.*, ab.full_name AS added_by, mb.full_name AS moved_by,
            rec.result AS task_result, rec.recorded_at AS task_at, rec.inspector AS task_by,
            wo.status AS wo_status, wo.updated_at AS wo_at,
            pe.at AS part_at, pe.actor AS part_by
       FROM shutdown_items i
       LEFT JOIN users ab ON ab.id = i.added_by_user_id
       LEFT JOIN users mb ON mb.id = i.moved_by_user_id
       LEFT JOIN work_orders wo ON wo.id = i.work_order_id
       LEFT JOIN LATERAL (
         SELECT r.result, r.recorded_at, u.full_name AS inspector FROM maintenance_records r LEFT JOIN users u ON u.id = r.inspector_user_id
          WHERE i.kind_id = 'task' AND $2::timestamptz IS NOT NULL AND r.machine_id = i.machine_id AND r.kind = i.checklist_kind
            AND r.task_id = i.task_id AND r.recorded_at >= $2::timestamptz
          ORDER BY r.recorded_at DESC, r.id DESC LIMIT 1) rec ON TRUE
       LEFT JOIN LATERAL (
         SELECT e.at, u.full_name AS actor FROM component_service_events e LEFT JOIN users u ON u.id = e.actor_user_id
          WHERE i.kind_id = 'part' AND $2::timestamptz IS NOT NULL AND e.component_id = i.part_id AND e.action = 'replaced' AND e.at >= $2::timestamptz
          ORDER BY e.at DESC, e.id DESC LIMIT 1) pe ON TRUE
      WHERE i.shutdown_id = $1
      ORDER BY i.id`,
    [id, since],
  );
  return res.rows.map((r: Row): ShutdownItem => {
    const kind = r.kind_id as ShutdownItemKind;
    let done: ShutdownItem["done"] = null;
    if (kind === "task" && r.task_at) done = { at: iso(r.task_at)!, by: (r.task_by as string) ?? null, result: String(r.task_result) };
    if (kind === "work_order" && since && (r.wo_status === "done" || r.wo_status === "cancelled")) done = { at: iso(r.wo_at)!, by: null, result: String(r.wo_status) };
    if (kind === "part" && r.part_at) done = { at: iso(r.part_at)!, by: (r.part_by as string) ?? null, result: "replaced" };
    return {
      id: Number(r.id),
      kind,
      machineId: (r.machine_id as string) ?? null,
      checklistKind: (r.checklist_kind as ShutdownItem["checklistKind"]) ?? null,
      taskId: (r.task_id as string) ?? null,
      workOrderId: num(r.work_order_id),
      partId: (r.part_id as string) ?? null,
      estimateHours: num(r.estimate_hours),
      partsState: (r.parts_state as PartsState) ?? null,
      owner: (r.owner_code as string) ?? null,
      found: Boolean(r.found),
      moved: r.moved_at ? { reason: String(r.moved_reason), at: iso(r.moved_at)!, by: (r.moved_by as string) ?? null } : null,
      addedAt: iso(r.added_at)!,
      addedBy: (r.added_by as string) ?? null,
      done,
    };
  });
}

/** Machines with the stop and the start the readings showed (machine_state_periods). */
async function machinesOf(id: number, stoppingAt: string | null, restartAt: string | null): Promise<ShutdownMachine[]> {
  const res = await query(
    `SELECT sm.machine_id, sm.cooldown_hours,
            EXISTS (SELECT 1 FROM operating_states os JOIN operating_state_criteria c ON c.state_id = os.id WHERE os.machine_id = sm.machine_id) AS run_signal,
            (SELECT min(p.started_at) FROM machine_state_periods p JOIN operating_states os ON os.id = p.state_id
              WHERE $2::timestamptz IS NOT NULL AND p.machine_id = sm.machine_id AND NOT os.running AND (p.ended_at IS NULL OR p.ended_at > $2::timestamptz)) AS stopped_at,
            (SELECT min(p.started_at) FROM machine_state_periods p JOIN operating_states os ON os.id = p.state_id
              WHERE $3::timestamptz IS NOT NULL AND p.machine_id = sm.machine_id AND os.running AND p.started_at >= $3::timestamptz) AS started_at,
            (SELECT os.running FROM machine_state_periods p JOIN operating_states os ON os.id = p.state_id
              WHERE p.machine_id = sm.machine_id AND p.ended_at IS NULL ORDER BY p.started_at DESC LIMIT 1) AS running_now
       FROM shutdown_machines sm WHERE sm.shutdown_id = $1 ORDER BY sm.machine_id`,
    [id, stoppingAt, restartAt],
  );
  return res.rows.map((r: Row) => ({
    machineId: String(r.machine_id),
    cooldownHours: num(r.cooldown_hours),
    runSignal: Boolean(r.run_signal),
    stoppedAt: iso(r.stopped_at),
    startedAt: iso(r.started_at),
    runningNow: r.run_signal && r.running_now !== null && r.running_now !== undefined ? Boolean(r.running_now) : null,
  }));
}

/** Average of each analog reading in the window before the stop and the window after the restart began. */
async function comparisonOf(machineIds: string[], stoppingAt: string | null, restartAt: string | null, windowH: number): Promise<ShutdownComparison[]> {
  if (!stoppingAt || !restartAt || !machineIds.length) return [];
  const res = await query(
    `WITH m AS (
       SELECT measurement_id, machine_id, tag, name, unit, decimals, range_lo, range_hi, sort_order
         FROM v_measurement_context WHERE machine_id = ANY($1::varchar[]) AND value_kind = 'analog' AND origin_id <> 'manual'),
     w AS (SELECT $2::timestamptz AS stop_at, $3::timestamptz AS start_at, make_interval(secs => $4::float8 * 3600) AS win),
     before_raw AS (
       SELECT r.measurement_id, avg(r.value) AS v FROM readings r, w
        WHERE r.measurement_id IN (SELECT measurement_id FROM m) AND r.acquired_at >= w.stop_at - w.win AND r.acquired_at < w.stop_at
          AND r.quality_id = 'GOOD' AND r.value IS NOT NULL GROUP BY 1),
     before_hourly AS (
       SELECT h.measurement_id, sum(h.v_sum) / NULLIF(sum(h.good_count), 0) AS v FROM reading_hourly h, w
        WHERE h.measurement_id IN (SELECT measurement_id FROM m) AND h.hour_start >= w.stop_at - w.win AND h.hour_start + interval '1 hour' <= w.stop_at GROUP BY 1),
     after_raw AS (
       SELECT r.measurement_id, avg(r.value) AS v FROM readings r, w
        WHERE r.measurement_id IN (SELECT measurement_id FROM m) AND r.acquired_at >= w.start_at AND r.acquired_at < w.start_at + w.win
          AND r.quality_id = 'GOOD' AND r.value IS NOT NULL GROUP BY 1)
     SELECT m.*, COALESCE(br.v, bh.v) AS before, ar.v AS after
       FROM m LEFT JOIN before_raw br USING (measurement_id) LEFT JOIN before_hourly bh USING (measurement_id) LEFT JOIN after_raw ar USING (measurement_id)
      WHERE COALESCE(br.v, bh.v) IS NOT NULL OR ar.v IS NOT NULL
      ORDER BY m.machine_id, m.sort_order, m.tag`,
    [machineIds, stoppingAt, restartAt, windowH],
  );
  return res.rows.map((r: Row) => ({
    measurementId: String(r.measurement_id),
    machineId: String(r.machine_id),
    tag: String(r.tag),
    name: String(r.name),
    unit: (r.unit as string) ?? "",
    decimals: num(r.decimals),
    rangeLo: num(r.range_lo),
    rangeHi: num(r.range_hi),
    before: num(r.before),
    after: num(r.after),
  }));
}

export async function getShutdown(id: number, opts: { comparison?: boolean } = {}): Promise<ShutdownDetail> {
  const res = await query(`${SUMMARY_SELECT} WHERE s.id = $1`, [id]);
  const row = res.rows[0];
  if (!row) throw new PmsInputError("Shutdown not found");
  const summary = mapSummary(row);
  const phases = await phasesOf(id);
  // Work counts from the latest start of the stop; a restart in progress compares from its approval.
  const stoppingAt = isActiveShutdown(summary.state) || summary.state === "closed" ? (phases.stopping ?? null) : null;
  const restartAt = summary.state === "restarting" || summary.state === "closed" ? (phases.restarting ?? null) : null;
  const setting = await query<{ value: number }>("SELECT value FROM system_settings WHERE key = 'shutdown.compare_window_h'");
  const compareWindowH = Number(setting.rows[0]?.value);
  if (!Number.isFinite(compareWindowH) || compareWindowH <= 0) throw new Error('system setting "shutdown.compare_window_h" is not configured');
  const [machines, work, crews, isolations, events, comparison, sapOrders] = await Promise.all([
    machinesOf(id, stoppingAt, restartAt),
    itemsOf(id, stoppingAt),
    query("SELECT owner_code, people, hours_per_day FROM shutdown_crews WHERE shutdown_id = $1 ORDER BY owner_code", [id]),
    query(
      `SELECT x.*, ib.full_name AS isolated_by, rb.full_name AS released_by FROM shutdown_isolations x
         LEFT JOIN users ib ON ib.id = x.isolated_by_user_id LEFT JOIN users rb ON rb.id = x.released_by_user_id
        WHERE x.shutdown_id = $1 ORDER BY x.machine_id, x.id`,
      [id],
    ),
    query(
      `SELECT e.*, u.full_name AS actor FROM shutdown_events e LEFT JOIN users u ON u.id = e.actor_user_id
        WHERE e.shutdown_id = $1 ORDER BY e.at DESC, e.id DESC LIMIT 200`,
      [id],
    ),
    opts.comparison === false ? [] : comparisonOf(summary.machineIds, stoppingAt, restartAt, compareWindowH),
    sapOrdersOf(id, summary.plantId, summary.machineIds),
  ]);
  return {
    ...summary,
    notes: (row.notes as string) ?? null,
    createdBy: (row.created_by as string) ?? null,
    machines,
    work,
    crews: crews.rows.map((r: Row): ShutdownCrew => ({ owner: String(r.owner_code), people: Number(r.people), hoursPerDay: Number(r.hours_per_day) })),
    isolations: isolations.rows.map(
      (r: Row): ShutdownIsolation => ({
        id: Number(r.id),
        machineId: String(r.machine_id),
        kind: String(r.kind_id),
        point: String(r.point),
        permitRef: (r.permit_ref as string) ?? null,
        isolatedAt: iso(r.isolated_at),
        isolatedBy: (r.isolated_by as string) ?? null,
        releasedAt: iso(r.released_at),
        releasedBy: (r.released_by as string) ?? null,
      }),
    ),
    events: events.rows.map(
      (r: Row): ShutdownEvent => ({
        id: Number(r.id),
        action: String(r.action),
        from: (r.from_state as ShutdownState) ?? null,
        to: (r.to_state as ShutdownState) ?? null,
        reason: (r.reason as string) ?? null,
        actor: (r.actor as string) ?? null,
        at: iso(r.at)!,
      }),
    ),
    phases,
    compareWindowH,
    comparison,
    sapOrders,
  };
}

/** Each machine's SAP order for the shutdown; with a SAP connection, a machine without SAP equipment shows as not mapped. */
async function sapOrdersOf(id: number, plantId: string, machineIds: string[]): Promise<ShutdownDetail["sapOrders"]> {
  const [orders, unmapped] = await Promise.all([
    sapShutdownOrders(id),
    query<{ id: string }>(
      `SELECT m.id FROM machines m
        WHERE m.id = ANY($1::varchar[]) AND EXISTS (SELECT 1 FROM sap_connections c WHERE c.plant_id = $2 AND c.enabled)
          AND NOT EXISTS (SELECT 1 FROM sap_equipment_records s WHERE s.machine_id = m.id AND s.sap_equipment_id IS NOT NULL)`,
      [machineIds, plantId],
    ),
  ]);
  const have = new Set(orders.map((o) => o.machineId));
  const at = new Date().toISOString();
  return [...orders, ...unmapped.rows.filter((r) => !have.has(r.id)).map((r) => ({ machineId: r.id, state: "not_mapped", order: null, error: "Map this machine to its SAP equipment first (SAP › Equipment mapping).", at }))];
}

/** Closed shutdowns of the plant, newest first, for the report in History (no reading comparison). */
export async function shutdownReports(plantId: string): Promise<ShutdownDetail[]> {
  const res = await query<{ id: number }>("SELECT id FROM shutdowns WHERE plant_id = $1 AND state_id = 'closed' ORDER BY planned_start DESC, id DESC LIMIT 24", [plantId]);
  return Promise.all(res.rows.map((r) => getShutdown(Number(r.id), { comparison: false })));
}

/* ------------------------------------------------------------ plan */

async function stateOf(id: number): Promise<ShutdownState> {
  const res = await query<{ state_id: ShutdownState }>("SELECT state_id FROM shutdowns WHERE id = $1", [id]);
  if (!res.rows[0]) throw new PmsInputError("Shutdown not found");
  return res.rows[0].state_id;
}

/** The given machines, each of the plant and with maintenance checklists. */
async function plantMachines(plantId: string, v: unknown): Promise<string[]> {
  const ids = Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && x.length > 0))] : [];
  if (!ids.length) throw new PmsInputError("Pick the machines that stop");
  const res = await query<{ id: string }>("SELECT id FROM machines WHERE plant_id = $1 AND id = ANY($2::varchar[])", [plantId, ids]);
  const known = new Set(res.rows.map((r) => r.id));
  for (const m of ids) {
    if (!known.has(m)) throw new PmsInputError(`${m} is not a machine of this plant`);
    if (!(await hasMaintenanceChecklist(m))) throw new PmsInputError(`${m} has no maintenance checklists`);
  }
  return ids;
}

export interface ItemInput {
  kind: ShutdownItemKind;
  machineId?: string;
  checklistKind?: "equipment" | "sensor";
  taskId?: string;
  workOrderId?: number;
  partId?: string;
  estimateHours?: number | null;
  owner?: string | null;
}

/** A trade code from the input: null when not given; an unknown code is an input error. */
async function ownerOf(v: unknown): Promise<string | null> {
  const code = text(v, 16);
  if (!code) return null;
  if (!(await query("SELECT 1 FROM maintenance_owners WHERE code = $1", [code])).rowCount) throw new PmsInputError("Unknown trade");
  return code;
}

/** Adds work items; ones already in the shutdown are skipped. Returns how many were added. */
async function insertItems(id: number, list: unknown, found: boolean, userId: string | null): Promise<number> {
  if (!Array.isArray(list) || !list.length) return 0;
  const machines = new Set((await query<{ machine_id: string }>("SELECT machine_id FROM shutdown_machines WHERE shutdown_id = $1", [id])).rows.map((r) => r.machine_id));
  const woIds = list.filter((x) => x?.kind === "work_order").map((x) => Number(x.workOrderId));
  const partIds = list.filter((x) => x?.kind === "part").map((x) => String(x.partId));
  const [wos, parts] = await Promise.all([
    woIds.length ? query<{ id: number; machine_id: string }>("SELECT id, machine_id FROM work_orders WHERE id = ANY($1::int[])", [woIds]) : null,
    partIds.length ? query<{ id: string; machine_id: string }>("SELECT id, machine_id FROM component_service_lives WHERE id = ANY($1::varchar[])", [partIds]) : null,
  ]);
  const woMachine = new Map((wos?.rows ?? []).map((r) => [Number(r.id), r.machine_id]));
  const partMachine = new Map((parts?.rows ?? []).map((r) => [r.id, r.machine_id]));
  const rows: Row[] = [];
  for (const raw of list.slice(0, 2000) as ItemInput[]) {
    const hours = hoursOf(raw.estimateHours, 2000) ?? null;
    if (raw.kind === "task") {
      const machineId = text(raw.machineId, 64);
      const taskId = text(raw.taskId, 32);
      if (!machineId || !machines.has(machineId) || !taskId || (raw.checklistKind !== "equipment" && raw.checklistKind !== "sensor")) throw new PmsInputError("A checklist item needs its machine, checklist and item");
      rows.push({ kind_id: "task", machine_id: machineId, checklist_kind: raw.checklistKind, task_id: taskId, work_order_id: null, part_id: null, estimate_hours: hours, parts_state: null, owner_code: null });
    } else if (raw.kind === "work_order") {
      const wo = Number(raw.workOrderId);
      const m = woMachine.get(wo);
      if (!m || !machines.has(m)) throw new PmsInputError(`Work order ${raw.workOrderId} is not on a machine of this shutdown`);
      rows.push({ kind_id: "work_order", machine_id: null, checklist_kind: null, task_id: null, work_order_id: wo, part_id: null, estimate_hours: null, parts_state: null, owner_code: await ownerOf(raw.owner) });
    } else if (raw.kind === "part") {
      const m = partMachine.get(String(raw.partId));
      if (!m || !machines.has(m)) throw new PmsInputError(`Part ${raw.partId} is not on a machine of this shutdown`);
      rows.push({ kind_id: "part", machine_id: null, checklist_kind: null, task_id: null, work_order_id: null, part_id: String(raw.partId), estimate_hours: hours, parts_state: "pending", owner_code: await ownerOf(raw.owner) });
    } else throw new PmsInputError("Unknown kind of work");
  }
  const r = await query(
    `INSERT INTO shutdown_items (shutdown_id, kind_id, machine_id, checklist_kind, task_id, work_order_id, part_id, estimate_hours, parts_state, owner_code, found, added_by_user_id)
     SELECT $2, x.kind_id, x.machine_id, x.checklist_kind, x.task_id, x.work_order_id, x.part_id, x.estimate_hours, x.parts_state, x.owner_code, $3, $4
       FROM jsonb_to_recordset($1::jsonb) AS x(kind_id varchar, machine_id varchar, checklist_kind varchar, task_id varchar, work_order_id int, part_id varchar, estimate_hours numeric, parts_state varchar, owner_code varchar)
     ON CONFLICT DO NOTHING`,
    [JSON.stringify(rows), id, found, userId],
  );
  return r.rowCount ?? 0;
}

export async function createShutdown(input: Record<string, unknown>, userId: string | null): Promise<ShutdownDetail> {
  const plantId = text(input.plantId, 64);
  const name = text(input.name, 160);
  if (!plantId) throw new PmsInputError("plantId is required");
  if (!name) throw new PmsInputError("Name the shutdown");
  const start = instant(input.plannedStart, "start of the shutdown");
  const end = instant(input.plannedEnd, "end of the shutdown");
  if (Date.parse(end) <= Date.parse(start)) throw new PmsInputError("The end must be after the start");
  const machineIds = await plantMachines(plantId, input.machineIds);
  const res = await query<{ id: number }>(
    "INSERT INTO shutdowns (plant_id, name, planned_start, planned_end, notes, created_by_user_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
    [plantId, name, start, end, text(input.notes, 4000), userId],
  );
  const id = Number(res.rows[0].id);
  await query("INSERT INTO shutdown_machines (shutdown_id, machine_id) SELECT $1, unnest($2::varchar[])", [id, machineIds]);
  const added = await insertItems(id, input.items, false, userId);
  await logEvent(id, { action: "create", to: "draft", reason: `${machineIds.length} machines · ${added} work items`, userId });
  return getShutdown(id);
}

export async function updateShutdown(id: number, input: Record<string, unknown>, userId: string | null): Promise<ShutdownDetail> {
  const state = await stateOf(id);
  if (!isOpenShutdown(state)) throw new PmsInputError("A closed shutdown cannot be changed");
  const changed: string[] = [];
  const cur = (await query<{ plant_id: string; planned_start: Date; planned_end: Date }>("SELECT plant_id, planned_start, planned_end FROM shutdowns WHERE id = $1", [id])).rows[0];
  if (input.name !== undefined) {
    const name = text(input.name, 160);
    if (!name) throw new PmsInputError("Name the shutdown");
    await query("UPDATE shutdowns SET name = $2, updated_at = NOW() WHERE id = $1", [id, name]);
    changed.push("name");
  }
  if (input.plannedStart !== undefined || input.plannedEnd !== undefined) {
    const start = input.plannedStart !== undefined ? instant(input.plannedStart, "start of the shutdown") : cur.planned_start.toISOString();
    const end = input.plannedEnd !== undefined ? instant(input.plannedEnd, "end of the shutdown") : cur.planned_end.toISOString();
    if (Date.parse(end) <= Date.parse(start)) throw new PmsInputError("The end must be after the start");
    await query("UPDATE shutdowns SET planned_start = $2, planned_end = $3, updated_at = NOW() WHERE id = $1", [id, start, end]);
    changed.push("window");
  }
  if (input.notes !== undefined) {
    await query("UPDATE shutdowns SET notes = $2, updated_at = NOW() WHERE id = $1", [id, text(input.notes, 4000)]);
    changed.push("notes");
  }
  if (input.machineIds !== undefined) {
    if (!PLANNING_SHUTDOWN.includes(state)) throw new PmsInputError("Machines can only change while the shutdown is being planned");
    const ids = await plantMachines(cur.plant_id, input.machineIds);
    // Work orders and parts of a dropped machine leave with it (checklist items cascade).
    await query(
      `DELETE FROM shutdown_items i WHERE i.shutdown_id = $1 AND (
         (i.kind_id = 'work_order' AND (SELECT machine_id FROM work_orders WHERE id = i.work_order_id) <> ALL($2::varchar[]))
         OR (i.kind_id = 'part' AND (SELECT machine_id FROM component_service_lives WHERE id = i.part_id) <> ALL($2::varchar[])))`,
      [id, ids],
    );
    await query("DELETE FROM shutdown_machines WHERE shutdown_id = $1 AND machine_id <> ALL($2::varchar[])", [id, ids]);
    await query("INSERT INTO shutdown_machines (shutdown_id, machine_id) SELECT $1, unnest($2::varchar[]) ON CONFLICT DO NOTHING", [id, ids]);
    changed.push(`machines: ${ids.length}`);
  }
  if (input.cooldown && typeof input.cooldown === "object") {
    for (const [machineId, v] of Object.entries(input.cooldown as Record<string, unknown>)) {
      const h = hoursOf(v, 2000);
      if (h === undefined) continue;
      await query("UPDATE shutdown_machines SET cooldown_hours = $3 WHERE shutdown_id = $1 AND machine_id = $2", [id, machineId, h]);
      changed.push(`cool-down ${machineId}: ${h ?? "not known"}`);
    }
  }
  if (changed.length) await logEvent(id, { action: "details", reason: changed.join(" · "), userId });
  return getShutdown(id);
}

/* ------------------------------------------------------------ work */

export async function addShutdownItems(id: number, input: Record<string, unknown>, userId: string | null): Promise<ShutdownDetail> {
  const state = await stateOf(id);
  if (!isOpenShutdown(state) || state === "restarting") throw new PmsInputError("Work can no longer be added to this shutdown");
  // Work added once the line is stopping is work found during the shutdown.
  const found = isActiveShutdown(state);
  const added = await insertItems(id, input.items, found, userId);
  if (added) await logEvent(id, { action: found ? "found-work" : "items", reason: `${added} added`, userId });
  return getShutdown(id);
}

export async function updateShutdownItem(id: number, itemId: number, input: Record<string, unknown>, userId: string | null): Promise<ShutdownDetail> {
  const state = await stateOf(id);
  if (!isOpenShutdown(state)) throw new PmsInputError("A closed shutdown cannot be changed");
  const item = (await query<{ kind_id: ShutdownItemKind }>("SELECT kind_id FROM shutdown_items WHERE id = $1 AND shutdown_id = $2", [itemId, id])).rows[0];
  if (!item) throw new PmsInputError("Item not found");
  const changed: string[] = [];
  const hours = hoursOf(input.estimateHours, 2000);
  if (hours !== undefined) {
    if (item.kind_id === "work_order") throw new PmsInputError("Change a work order's estimate on the work order");
    await query("UPDATE shutdown_items SET estimate_hours = $2 WHERE id = $1", [itemId, hours]);
    changed.push(`estimate ${hours ?? "unset"} h`);
  }
  if (input.owner !== undefined) {
    if (item.kind_id === "task") throw new PmsInputError("A checklist item keeps the trade of its checklist");
    const owner = await ownerOf(input.owner);
    await query("UPDATE shutdown_items SET owner_code = $2 WHERE id = $1", [itemId, owner]);
    changed.push(`trade ${owner ?? "unset"}`);
  }
  if (input.partsState !== undefined) {
    if (item.kind_id !== "part" || !PARTS_STATES.includes(input.partsState as PartsState)) throw new PmsInputError("Unknown parts state");
    await query("UPDATE shutdown_items SET parts_state = $2 WHERE id = $1", [itemId, input.partsState]);
    changed.push(`part ${input.partsState}`);
  }
  if (input.move !== undefined) {
    if (state === "restarting") throw new PmsInputError("The restart is approved; the work list is final");
    if (input.move === false) {
      await query("UPDATE shutdown_items SET moved_reason = NULL, moved_at = NULL, moved_by_user_id = NULL WHERE id = $1", [itemId]);
      changed.push("back in this shutdown");
    } else {
      const reason = text(input.reason, 1000);
      if (!reason) throw new PmsInputError("Say why it moves to the next shutdown");
      await query("UPDATE shutdown_items SET moved_reason = $2, moved_at = NOW(), moved_by_user_id = $3 WHERE id = $1", [itemId, reason, userId]);
      changed.push(`moved to the next shutdown: ${reason}`);
    }
  }
  if (changed.length) await logEvent(id, { action: "item", reason: `Item ${itemId}: ${changed.join(" · ")}`, userId });
  return getShutdown(id);
}

export async function removeShutdownItem(id: number, itemId: number, userId: string | null): Promise<ShutdownDetail> {
  const state = await stateOf(id);
  if (!PLANNING_SHUTDOWN.includes(state)) throw new PmsInputError("Once the shutdown has started, move work to the next shutdown instead");
  const r = await query("DELETE FROM shutdown_items WHERE id = $1 AND shutdown_id = $2", [itemId, id]);
  if (r.rowCount) await logEvent(id, { action: "item", reason: `Item ${itemId} removed`, userId });
  return getShutdown(id);
}

export async function setShutdownCrew(id: number, input: Record<string, unknown>, userId: string | null): Promise<ShutdownDetail> {
  const state = await stateOf(id);
  if (!isOpenShutdown(state)) throw new PmsInputError("A closed shutdown cannot be changed");
  const owner = text(input.owner, 16);
  if (!owner || !(await query("SELECT 1 FROM maintenance_owners WHERE code = $1", [owner])).rowCount) throw new PmsInputError("Unknown trade");
  if (input.people === null || input.people === 0 || input.people === "") {
    await query("DELETE FROM shutdown_crews WHERE shutdown_id = $1 AND owner_code = $2", [id, owner]);
    await logEvent(id, { action: "crew", reason: `${owner}: no crew`, userId });
    return getShutdown(id);
  }
  const people = Number(input.people);
  const perDay = Number(input.hoursPerDay);
  if (!Number.isInteger(people) || people <= 0 || people > 500) throw new PmsInputError("Enter the number of people as a whole number");
  if (!Number.isFinite(perDay) || perDay <= 0 || perDay > 24) throw new PmsInputError("Hours a day must be between 1 and 24");
  await query(
    `INSERT INTO shutdown_crews (shutdown_id, owner_code, people, hours_per_day) VALUES ($1,$2,$3,$4)
     ON CONFLICT (shutdown_id, owner_code) DO UPDATE SET people = EXCLUDED.people, hours_per_day = EXCLUDED.hours_per_day`,
    [id, owner, people, perDay],
  );
  await logEvent(id, { action: "crew", reason: `${owner}: ${people} people · ${perDay} h a day`, userId });
  return getShutdown(id);
}

/* ------------------------------------------------------------ lock-off register */

export async function addIsolation(id: number, input: Record<string, unknown>, userId: string | null): Promise<ShutdownDetail> {
  const state = await stateOf(id);
  if (!isOpenShutdown(state) || state === "restarting") throw new PmsInputError("The lock-off register is closed for this shutdown");
  const machineId = text(input.machineId, 64);
  const kind = text(input.kind, 16);
  const point = text(input.point, 160);
  if (!point) throw new PmsInputError("Name the lock-off point");
  if (!machineId || !(await query("SELECT 1 FROM shutdown_machines WHERE shutdown_id = $1 AND machine_id = $2", [id, machineId])).rowCount)
    throw new PmsInputError("Pick a machine of this shutdown");
  if (!kind || !(await query("SELECT 1 FROM shutdown_isolation_kinds WHERE id = $1", [kind])).rowCount) throw new PmsInputError("Pick what kind of energy it isolates");
  await query("INSERT INTO shutdown_isolations (shutdown_id, machine_id, kind_id, point, permit_ref) VALUES ($1,$2,$3,$4,$5)", [id, machineId, kind, point, text(input.permitRef, 64)]);
  await logEvent(id, { action: "isolation", reason: `${machineId} · ${point} added`, userId });
  return getShutdown(id);
}

/** isolate · release · undo (the last step), or a permit number change. */
export async function updateIsolation(id: number, isoId: number, input: Record<string, unknown>, userId: string | null): Promise<ShutdownDetail> {
  const state = await stateOf(id);
  if (!isOpenShutdown(state)) throw new PmsInputError("A closed shutdown cannot be changed");
  const cur = (await query<{ point: string; isolated_at: Date | null; released_at: Date | null }>("SELECT point, isolated_at, released_at FROM shutdown_isolations WHERE id = $1 AND shutdown_id = $2", [isoId, id])).rows[0];
  if (!cur) throw new PmsInputError("Lock-off point not found");
  const action = input.action;
  let what: string;
  if (action === "isolate") {
    if (!isActiveShutdown(state) || state === "restarting") throw new PmsInputError("Points are locked off once the shutdown has started");
    if (cur.isolated_at) throw new PmsInputError("Already locked off");
    await query("UPDATE shutdown_isolations SET isolated_at = NOW(), isolated_by_user_id = $2, permit_ref = COALESCE($3, permit_ref) WHERE id = $1", [isoId, userId, text(input.permitRef, 64)]);
    what = "locked off";
  } else if (action === "release") {
    if (!cur.isolated_at || cur.released_at) throw new PmsInputError("Only a locked-off point can be released");
    await query("UPDATE shutdown_isolations SET released_at = NOW(), released_by_user_id = $2 WHERE id = $1", [isoId, userId]);
    what = "released";
  } else if (action === "undo") {
    if (state === "restarting") throw new PmsInputError("The restart is approved; the register is final");
    if (cur.released_at) await query("UPDATE shutdown_isolations SET released_at = NULL, released_by_user_id = NULL WHERE id = $1", [isoId]);
    else if (cur.isolated_at) await query("UPDATE shutdown_isolations SET isolated_at = NULL, isolated_by_user_id = NULL WHERE id = $1", [isoId]);
    else throw new PmsInputError("Nothing to take back");
    what = cur.released_at ? "release taken back" : "lock-off taken back";
  } else if (input.permitRef !== undefined) {
    await query("UPDATE shutdown_isolations SET permit_ref = $2 WHERE id = $1", [isoId, text(input.permitRef, 64)]);
    what = "permit changed";
  } else throw new PmsInputError("Unknown action");
  await logEvent(id, { action: "isolation", reason: `${cur.point} ${what}`, userId });
  return getShutdown(id);
}

export async function removeIsolation(id: number, isoId: number, userId: string | null): Promise<ShutdownDetail> {
  const cur = (await query<{ point: string; isolated_at: Date | null }>("SELECT point, isolated_at FROM shutdown_isolations WHERE id = $1 AND shutdown_id = $2", [isoId, id])).rows[0];
  if (!cur) throw new PmsInputError("Lock-off point not found");
  if (cur.isolated_at) throw new PmsInputError("A point that was locked off stays on the register");
  await query("DELETE FROM shutdown_isolations WHERE id = $1", [isoId]);
  await logEvent(id, { action: "isolation", reason: `${cur.point} removed`, userId });
  return getShutdown(id);
}

/* ------------------------------------------------------------ SAP */

/** States in which the work list may go to SAP: the plan is approved and the line not yet handed back. */
const SAP_STATES: ShutdownState[] = ["approved", "stopping", "in_progress"];

/**
 * Sends the open work list to SAP: one maintenance order per machine with one
 * operation per item still to do (moved and finished items stay out), dated
 * on the shutdown's planned window.
 */
export async function sendShutdownToSap(id: number, userId: string | null): Promise<ShutdownDetail> {
  const d = await getShutdown(id, { comparison: false });
  if (!SAP_STATES.includes(d.state)) throw new PmsInputError("The work list goes to SAP once the plan is approved, until the restart");
  if (!(await canApprove(userId))) throw new PmsPermissionError("Your role cannot send work to SAP");
  const open = d.work.filter((i) => !i.moved && !i.done);
  if (!open.length) throw new PmsInputError("No open work to send");
  // Item texts and hours from their own records (checklists per machine and kind, work orders, parts).
  const woIds = open.filter((i) => i.workOrderId !== null).map((i) => i.workOrderId!);
  const partIds = open.filter((i) => i.partId !== null).map((i) => i.partId!);
  const [wos, parts] = await Promise.all([
    query<{ id: number; machine_id: string; title: string; estimate_hours: string | null }>(
      "SELECT wo.id, wo.machine_id, wo.title, s.estimate_hours FROM work_orders wo LEFT JOIN maintenance_wo_stages s ON s.work_order_id = wo.id WHERE wo.id = ANY($1::int[])",
      [woIds],
    ),
    query<{ id: string; machine_id: string; name: string }>("SELECT id, machine_id, name FROM component_service_lives WHERE id = ANY($1::varchar[])", [partIds]),
  ]);
  const woOf = new Map(wos.rows.map((r) => [Number(r.id), r]));
  const partOf = new Map(parts.rows.map((r) => [r.id, r]));
  const tasks = new Map<string, string>();
  for (const key of new Set(open.filter((i) => i.kind === "task").map((i) => `${i.machineId}|${i.checklistKind}`))) {
    const [machineId, kind] = key.split("|");
    const { units } = await machineChecklist(machineId, kind as "equipment" | "sensor");
    for (const u of units) for (const g of u.groups) for (const t of g.tasks) tasks.set(`${key}|${t.id}`, `${t.id} ${t.tag ? `${t.tag} ` : ""}${t.component}`);
  }
  const byMachine = new Map<string, { text: string; hours: number | null }[]>();
  for (const i of open) {
    let machineId: string | undefined;
    let op: { text: string; hours: number | null } | null = null;
    if (i.kind === "task") {
      machineId = i.machineId!;
      op = { text: tasks.get(`${i.machineId}|${i.checklistKind}|${i.taskId}`) ?? i.taskId!, hours: i.estimateHours };
    } else if (i.kind === "work_order") {
      const w = woOf.get(i.workOrderId!);
      machineId = w?.machine_id;
      if (w) op = { text: w.title, hours: num(w.estimate_hours) };
    } else {
      const p = partOf.get(i.partId!);
      machineId = p?.machine_id;
      if (p) op = { text: `Replace ${p.name}`, hours: i.estimateHours };
    }
    if (!machineId || !op) continue;
    (byMachine.get(machineId) ?? byMachine.set(machineId, []).get(machineId)!).push(op);
  }
  const results = await createSapShutdownOrders(
    d.plantId,
    id,
    [...byMachine].map(([machineId, operations]) => ({ machineId, description: d.name, start: new Date(d.plannedStart), end: new Date(d.plannedEnd), operations })),
    userId,
  ).catch((error: unknown) => {
    // No connection, or switched off: the SAP module's own words, as an input error here.
    if (error instanceof InputError || error instanceof NotFoundError) throw new PmsInputError(error.message);
    throw error;
  });
  const before = new Set(d.sapOrders.filter((o) => o.state === "completed").map((o) => o.machineId));
  const created = results.filter((r) => r.state === "completed" && !before.has(r.machineId)).length;
  const failed = results.filter((r) => r.state === "failed" || r.state === "retry" || r.state === "not_mapped").length;
  await logEvent(id, { action: "sap", reason: `Work list to SAP: ${created} new ${created === 1 ? "order" : "orders"}${before.size ? ` · ${before.size} already in SAP` : ""}${failed ? ` · ${failed} not sent` : ""}`, userId });
  return getShutdown(id);
}

/* ------------------------------------------------------------ steps */

export async function transitionShutdown(id: number, input: Record<string, unknown>, userId: string | null): Promise<ShutdownDetail> {
  const d = await getShutdown(id);
  const to = input.to as ShutdownState;
  const step = shutdownStep(d.state, to);
  if (!step) throw new PmsInputError("That step is not possible now");
  const reason = text(input.reason, 2000);
  if (step.note === "required" && !reason) throw new PmsInputError(to === "restarting" ? "Write the sign-off note" : "Say why");
  if (step.approval && !(await canApprove(userId))) {
    await logEvent(id, { action: "denied", from: d.state, to, reason: "No approval rights", userId });
    throw new PmsPermissionError("Your role cannot approve shutdowns");
  }
  const blocker = shutdownStepBlocker(d, to);
  if (blocker) throw new PmsInputError(blocker);
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("UPDATE shutdowns SET state_id = $2, updated_at = NOW() WHERE id = $1", [id, to]);
    if (to === "stopping") {
      // The machines show "Maintenance" while stopped; the state they had comes back at the restart.
      await c.query(
        `UPDATE shutdown_machines sm SET restore_service_state = m.service_state FROM machines m
          WHERE sm.shutdown_id = $1 AND m.id = sm.machine_id AND sm.restore_service_state IS NULL`,
        [id],
      );
      await c.query("UPDATE machines SET service_state = 'Maintenance', updated_at = NOW() WHERE id IN (SELECT machine_id FROM shutdown_machines WHERE shutdown_id = $1)", [id]);
    }
    if ((to === "restarting" || to === "approved") && isActiveShutdown(d.state)) {
      // Given back only where nobody changed it meanwhile.
      await c.query(
        `UPDATE machines m SET service_state = sm.restore_service_state, updated_at = NOW() FROM shutdown_machines sm
          WHERE sm.shutdown_id = $1 AND m.id = sm.machine_id AND sm.restore_service_state IS NOT NULL AND m.service_state = 'Maintenance'`,
        [id],
      );
      await c.query("UPDATE shutdown_machines SET restore_service_state = NULL WHERE shutdown_id = $1", [id]);
    }
    await c.query("INSERT INTO shutdown_events (shutdown_id, action, from_state, to_state, reason, actor_user_id) VALUES ($1, 'transition', $2, $3, $4, $5)", [id, d.state, to, reason, userId]);
    await c.query("COMMIT");
  } catch (error) {
    await c.query("ROLLBACK").catch(() => {});
    if ((error as { code?: string }).code === "23505") throw new PmsInputError("Another shutdown of this plant is already under way");
    throw error;
  } finally {
    c.release();
  }
  return getShutdown(id);
}
