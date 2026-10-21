import { query } from "@backend/db";
import { serviceUsedUnits } from "@shared/lib/pyro-sim/service-life";
import { LINE_ID } from "@backend/services/simulation-service";
import { proposeRequest, PmsInputError } from "@backend/services/pms-service";
import { syncAlertChecks } from "@backend/monitoring/alert-checks";
import { maintenanceMachineIds } from "@backend/services/maintenance-service";
import { getMachineInsights } from "@backend/services/insights-service";
import type { Scope } from "@backend/services/access-service";
import type { AlertCheck, ServicePartRecord, TrendLife } from "@shared/types/maintenance-types";

/*
 * Maintenance by type (migration 040).
 *
 *   alert_checks              one "go and check" task per alarm finding, issued
 *                             automatically (server evaluation, and on read);
 *                             the result is recorded by the person who checked
 *   component_service_lives   part life against the machine's running-hours
 *                             counter; a replacement starts the life again
 *   component_service_events  replacements and corrections, who and when
 */

const iso = (v: unknown) => (v === null || v === undefined ? null : new Date(v as string).toISOString());
const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

/* ------------------------------------------------------------ alert checks */

const CHECK_SELECT = `
  SELECT ac.id, ac.finding_id, f.machine_id, f.finding_type_id, f.severity_id, sv.check_priority_id AS priority,
         f.opened_at, p.response_minutes, f.summary, f.observed_value, f.limit_value,
         EXISTS (SELECT 1 FROM findings o WHERE o.cleared_at IS NULL AND o.machine_id = f.machine_id AND o.finding_type_id = f.finding_type_id
                  AND COALESCE(o.rule_id, 0) = COALESCE(f.rule_id, 0) AND COALESCE(o.measurement_id, '') = COALESCE(f.measurement_id, '')) AS alarm_active,
         r.code AS rule_code, r.name AS rule_name, r.plain_title, r.plain_what, r.plain_todo, r.action, r.cause, r.consequence,
         mc.tag AS m_tag, mc.name AS m_name, mc.unit AS m_unit, mc.subassembly_name AS m_sub,
         (SELECT array_agg(sa.name ORDER BY sa.sort_order) FROM rule_subassemblies rs JOIN machine_subassemblies sa ON sa.id = rs.subassembly_id WHERE rs.rule_id = f.rule_id) AS rule_subs,
         (SELECT array_agg(m.tag ORDER BY ri.sort_order) FROM rule_inputs ri JOIN measurements m ON m.id = ri.measurement_id WHERE ri.rule_id = f.rule_id) AS rule_tags,
         (SELECT array_agg(m.name ORDER BY ri.sort_order) FROM rule_inputs ri JOIN measurements m ON m.id = ri.measurement_id WHERE ri.rule_id = f.rule_id) AS rule_tag_names,
         ac.result, ac.note, u.full_name AS checked_by, ac.checked_at, ac.work_order_id
    FROM alert_checks ac
    JOIN findings f ON f.id = ac.finding_id
    JOIN severities sv ON sv.id = f.severity_id
    LEFT JOIN work_order_priorities p ON p.id = sv.check_priority_id
    LEFT JOIN rules r ON r.id = f.rule_id
    LEFT JOIN v_measurement_context mc ON mc.measurement_id = f.measurement_id
    LEFT JOIN users u ON u.id = ac.checked_by_user_id`;

function mapCheck(r: Record<string, unknown>): AlertCheck {
  const raised = new Date(r.opened_at as string);
  const resp = num(r.response_minutes);
  const pattern = r.finding_type_id === "rule_pattern";
  return {
    id: Number(r.id),
    findingId: Number(r.finding_id),
    machineId: String(r.machine_id),
    kind: pattern ? "pattern" : "limit",
    severity: r.severity_id === "Critical" ? "Critical" : "Alert",
    priority: String(r.priority ?? ""),
    raisedAt: raised.toISOString(),
    dueAt: resp === null ? null : new Date(raised.getTime() + resp * 60_000).toISOString(),
    alarmActive: Boolean(r.alarm_active),
    title: pattern ? String(r.plain_title || r.rule_name || r.rule_code) : String(r.m_name ?? r.m_tag ?? "Measurement"),
    // A rule's plain explanation when it has one; the engine's own summary otherwise.
    summary: String((pattern && (r.plain_what as string)) || r.summary || ""),
    todo: pattern ? ((r.plain_todo as string) || (r.action as string) || null) : null,
    cause: pattern ? ((r.cause as string) ?? null) : null,
    consequence: pattern ? ((r.consequence as string) ?? null) : null,
    ruleCode: (r.rule_code as string) ?? null,
    measurement: r.m_tag
      ? { tag: String(r.m_tag), name: String(r.m_name ?? r.m_tag), unit: String(r.m_unit ?? ""), observed: num(r.observed_value), limit: num(r.limit_value) }
      : null,
    places: pattern ? ((r.rule_subs as string[] | null) ?? []) : r.m_sub ? [String(r.m_sub)] : [],
    tags: pattern ? ((r.rule_tags as string[] | null) ?? []) : r.m_tag ? [String(r.m_tag)] : [],
    readings: pattern ? ((r.rule_tag_names as string[] | null) ?? []) : r.m_name ? [String(r.m_name)] : [],
    result: r.result === "fine" || r.result === "problem" ? r.result : null,
    note: (r.note as string) ?? null,
    checkedBy: (r.checked_by as string) ?? null,
    checkedAt: iso(r.checked_at),
    workOrderId: r.work_order_id === null || r.work_order_id === undefined ? null : Number(r.work_order_id),
  };
}

/** Open checks, and those raised or checked in the last 30 days, for the machines given. */
export async function listAlertChecks(machineIds: string[]): Promise<AlertCheck[]> {
  if (!machineIds.length) return [];
  await syncAlertChecks();
  const res = await query<Record<string, unknown>>(
    `${CHECK_SELECT}
      WHERE f.machine_id = ANY($1)
        AND (ac.result IS NULL OR ac.checked_at > NOW() - interval '30 days' OR f.opened_at > NOW() - interval '30 days')
      ORDER BY (ac.result IS NULL) DESC, f.opened_at DESC`,
    [machineIds],
  );
  return res.rows.map(mapCheck);
}

async function oneCheck(id: number): Promise<AlertCheck> {
  const res = await query<Record<string, unknown>>(`${CHECK_SELECT} WHERE ac.id = $1`, [id]);
  if (!res.rows[0]) throw new PmsInputError("Check not found");
  return mapCheck(res.rows[0]);
}

/** The machine a check belongs to (access checks). */
export async function alertCheckMachine(id: number): Promise<string | null> {
  const res = await query<{ machine_id: string }>("SELECT f.machine_id FROM alert_checks ac JOIN findings f ON f.id = ac.finding_id WHERE ac.id = $1", [id]);
  return res.rows[0]?.machine_id ?? null;
}

/**
 * Records what the check found. "fine": nothing wrong on site (a note is kept
 * if given). "problem": what was found is required and a repair request is
 * raised (or the open one for the same rule is linked). `result: null` takes a
 * "fine" back.
 */
export async function recordAlertCheck(id: number, input: Record<string, unknown>, userId: string): Promise<AlertCheck> {
  if (!Number.isInteger(id)) throw new PmsInputError("Invalid check id");
  const check = await oneCheck(id);
  const note = text(input.note, 4000);
  if (input.result === null) {
    if (check.result !== "fine") throw new PmsInputError(check.result === "problem" ? "A check that raised a repair request cannot be taken back" : "Nothing recorded yet");
    await query("UPDATE alert_checks SET result = NULL, note = NULL, checked_by_user_id = NULL, checked_at = NULL WHERE id = $1", [id]);
    return oneCheck(id);
  }
  if (input.result !== "fine" && input.result !== "problem") throw new PmsInputError("Say what the check found");
  if (check.result) throw new PmsInputError("This check is already recorded");
  let workOrderId: number | null = null;
  if (input.result === "problem") {
    if (!note) throw new PmsInputError("Describe what was found");
    const wo = await proposeRequest(
      {
        machineId: check.machineId,
        ruleId: check.ruleCode,
        title: text(input.title, 255) ?? `Repair: ${check.title}`,
        component: check.places.join(", ") || null,
        priority: check.priority,
        notes: `Found on the check: ${note}\nAlarm: ${check.summary}`,
        actionKind: "repair",
        type: "predictive",
      },
      userId,
    );
    workOrderId = wo.id;
  }
  await query(
    "UPDATE alert_checks SET result = $2, note = $3, checked_by_user_id = $4, checked_at = NOW(), work_order_id = $5 WHERE id = $1",
    [id, input.result, note, userId, workOrderId],
  );
  return oneCheck(id);
}

/* ------------------------------------------------------------ part service lives */

export async function listServiceParts(machineIds: string[]): Promise<ServicePartRecord[]> {
  if (!machineIds.length) return [];
  const [parts, events] = await Promise.all([
    query<Record<string, unknown>>(
      `SELECT c.*, sa.subassembly_id AS sub, sa.name AS sub_name
         FROM component_service_lives c LEFT JOIN machine_subassemblies sa ON sa.id = c.subassembly_ref_id
        WHERE c.machine_id = ANY($1) ORDER BY c.machine_id, c.sort_order, c.name`,
      [machineIds],
    ),
    query<Record<string, unknown>>(
      `SELECT e.*, u.full_name AS actor FROM component_service_events e
         JOIN component_service_lives c ON c.id = e.component_id
         LEFT JOIN users u ON u.id = e.actor_user_id
        WHERE c.machine_id = ANY($1) ORDER BY e.at DESC, e.id DESC`,
      [machineIds],
    ),
  ]);
  return parts.rows.map((r) => ({
    id: String(r.id),
    machineId: String(r.machine_id),
    subassemblyRefId: (r.subassembly_ref_id as string) ?? null,
    sub: (r.sub as string) ?? null,
    subName: (r.sub_name as string) ?? null,
    name: String(r.name),
    basis: r.basis === "d" ? "d" : "h",
    life: Number(r.life),
    dueShare: Number(r.due_share),
    used: Number(r.used),
    counterH: Number(r.counter_h),
    installed: (r.installed as string) ?? null,
    duty: (r.duty as string) ?? null,
    recordSource: (r.record_source as string) ?? null,
    events: events.rows
      .filter((e) => e.component_id === r.id)
      .map((e) => ({
        id: Number(e.id),
        action: e.action === "corrected" ? "corrected" : "replaced",
        usedBefore: num(e.used_before),
        at: iso(e.at)!,
        actor: (e.actor as string) ?? null,
        workOrderId: e.work_order_id === null ? null : Number(e.work_order_id),
        note: (e.note as string) ?? null,
      })),
  }));
}

export async function servicePartMachine(id: string): Promise<string | null> {
  const res = await query<{ machine_id: string }>("SELECT machine_id FROM component_service_lives WHERE id = $1", [id]);
  return res.rows[0]?.machine_id ?? null;
}

/**
 * Records a replacement: the life starts again at the machine's running-hours
 * counter now (sent by the page, which reads the plant clock). The engines
 * re-read their configuration, so the service-due advisory clears.
 */
export async function replaceServicePart(id: string, input: Record<string, unknown>, userId: string): Promise<void> {
  const counterH = Number(input.counterH);
  if (!Number.isFinite(counterH) || counterH < 0) throw new PmsInputError("The machine's running hours are not known yet; try again in a moment");
  const res = await query<{ machine_id: string; name: string; basis: "h" | "d"; used: string; counter_h: string }>(
    "SELECT machine_id, name, basis, used, counter_h FROM component_service_lives WHERE id = $1",
    [id],
  );
  const row = res.rows[0];
  if (!row) throw new PmsInputError("Part not found");
  const usedBefore = serviceUsedUnits({ basis: row.basis, used: Number(row.used), counterH: Number(row.counter_h) }, counterH);
  const workOrderId = Number.isInteger(input.workOrderId) ? Number(input.workOrderId) : null;
  const note = text(input.note, 2000);
  const installed = typeof input.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : new Date().toISOString().slice(0, 10);
  await query(
    `INSERT INTO component_service_events (component_id, action, used_before, counter_h, actor_user_id, work_order_id, note)
     VALUES ($1, 'replaced', $2, $3, $4, $5, $6)`,
    [id, Math.round(usedBefore * 10) / 10, counterH, userId, workOrderId, note],
  );
  await query("UPDATE component_service_lives SET used = 0, counter_h = $2, installed = $3 WHERE id = $1", [id, counterH, installed]);
  await query(
    `INSERT INTO maintenance_events (machine_id, work_order_id, action, to_state, reason, actor_user_id)
     VALUES ($1, $2, 'part-replaced', $3, $4, $5)`,
    [row.machine_id, workOrderId, row.name, note, userId],
  );
  // One configuration step: the plant runner and the pages re-read the engine configuration.
  await query("UPDATE simulation_settings SET version = version + 1 WHERE id = $1", [LINE_ID]);
}

/* ------------------------------------------------------------ scope */

/** Machines with planned maintenance the request may see. */
export async function maintenanceMachinesIn(scope: Scope): Promise<string[]> {
  const all = await maintenanceMachineIds();
  return scope.all ? all : all.filter((id) => scope.machines.has(id));
}

/** Time left until a reading reaches its alarm limit, per sub-assembly, for every machine given (server insights). */
export async function listTrendLives(machineIds: string[]): Promise<TrendLife[]> {
  const all = await Promise.all(machineIds.map((id) => getMachineInsights(id).then((d) => ({ id, d })).catch(() => null)));
  const out: TrendLife[] = [];
  for (const x of all) {
    if (!x) continue;
    for (const r of x.d.prognosis.rul) {
      if (r.hours === null) continue;
      out.push({ machineId: x.id, id: r.id, name: r.name, hours: r.hours, confidence: r.confidence, driver: r.driver ?? null, status: r.status });
    }
  }
  return out.sort((a, b) => a.hours - b.hours);
}
