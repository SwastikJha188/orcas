/**
 * Problem cases (migration 028): one problem on one machine followed by a
 * person from first sign to a verified repair. Stages, owner and priority,
 * possible causes and the checks that test them, maintenance requests (each
 * makes a work order), files, imported readings, history, and alarms recorded
 * by hand. All wording people read is plain (docs/plain-language.md).
 */
import pool, { invalidateReadCache, query } from "@/server/db";
import { InputError, NotFoundError } from "@/server/errors";
import { createWorkOrder } from "@/server/services/ops-service";

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/* ------------------------------------------------------------------ */

export type CaseStage = "new" | "investigating" | "waiting" | "maintenance" | "verifying" | "closed";
export type CasePriority = "unassigned" | "urgent" | "priority" | "routine";
export type RunningMode = "unknown" | "running" | "starting" | "stopping" | "stopped";
export type Assessment = "not_assessed" | "abnormal" | "investigate" | "coverage" | "recovery";
export type CheckKind = "measurement" | "inspection" | "lab" | "review" | "operating" | "history";
export type CheckResult = "supports" | "rules_out" | "unclear";
export type WorkType = "inspection" | "repair" | "monitoring";
export type CauseStatus = "not_checked" | "being_checked" | "supported" | "ruled_out" | "unclear";

export const STAGE_WORD: Record<CaseStage, string> = {
  new: "New",
  investigating: "Being investigated",
  waiting: "Waiting for checks",
  maintenance: "With maintenance",
  verifying: "Checking the fix",
  closed: "Closed",
};
export const PRIORITY_WORD: Record<CasePriority, string> = { unassigned: "Not set", urgent: "Urgent", priority: "Soon", routine: "Routine" };
export const MODE_WORD: Record<RunningMode, string> = { unknown: "Not known", running: "Running", starting: "Starting up", stopping: "Shutting down", stopped: "Stopped" };
export const ASSESSMENT_WORD: Record<Assessment, string> = {
  not_assessed: "Not looked at yet",
  abnormal: "Something is wrong",
  investigate: "Needs investigating",
  coverage: "Not enough sensors to tell",
  recovery: "Checking that the fix worked",
};
export const CHECK_WORD: Record<CheckKind, string> = {
  measurement: "Take a new measurement",
  inspection: "Look at it (visual inspection)",
  lab: "Oil or lab test",
  review: "Ask another engineer",
  operating: "Find out how it was being run",
  history: "Look at past repairs",
};
export const RESULT_WORD: Record<CheckResult, string> = { supports: "Points to this cause", rules_out: "Rules this cause out", unclear: "Not clear" };
export const WORK_WORD: Record<WorkType, string> = { inspection: "Inspect and find the cause", repair: "Repair it", monitoring: "Fix the monitoring (sensor or wiring)" };
export const CAUSE_WORD: Record<CauseStatus, string> = {
  not_checked: "Not checked yet",
  being_checked: "Being checked",
  supported: "Evidence points to it",
  ruled_out: "Ruled out",
  unclear: "Checked, not clear",
};

const STAGES = Object.keys(STAGE_WORD) as CaseStage[];
const PRIORITIES = Object.keys(PRIORITY_WORD) as CasePriority[];
const MODES = Object.keys(MODE_WORD) as RunningMode[];
const ASSESSMENTS = Object.keys(ASSESSMENT_WORD) as Assessment[];
const CHECKS = Object.keys(CHECK_WORD) as CheckKind[];
const RESULTS = Object.keys(RESULT_WORD) as CheckResult[];
const WORKS = Object.keys(WORK_WORD) as WorkType[];

/** Generic possible causes for a problem the system found (a person can add more). */
const PROBLEM_CAUSES = [
  "The fault the system describes is real",
  "A sensor is giving a wrong reading",
  "The machine is being run differently than usual (load, speed or settings changed)",
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const text = (v: unknown, max: number, label: string, required = true): string | null => {
  if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) {
    if (required) throw new InputError(`${label} is required`);
    return null;
  }
  if (typeof v !== "string") throw new InputError(`${label} must be text`);
  const t = v.trim();
  if (t.length > max) throw new InputError(`${label} is too long (at most ${max} characters)`);
  return t;
};
const oneOf = <T extends string>(v: unknown, list: readonly T[], label: string): T => {
  if (typeof v !== "string" || !list.includes(v as T)) throw new InputError(`${label} must be one of: ${list.join(", ")}`);
  return v as T;
};
const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

async function nameOf(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const r = await query<{ full_name: string }>("SELECT full_name FROM users WHERE id = $1", [userId]);
  return r.rows[0]?.full_name ?? null;
}

async function event(client: { query: typeof pool.query } | null, caseId: number, userId: string | null, line: string): Promise<void> {
  const q = client ? client.query.bind(client) : pool.query.bind(pool);
  await q("INSERT INTO case_events (case_id, user_id, text) VALUES ($1, $2, $3)", [caseId, userId, line]);
}

async function touch(caseId: number, userId: string | null): Promise<void> {
  await pool.query("UPDATE cases SET updated_at = NOW(), updated_by = $2 WHERE id = $1", [caseId, userId]);
}

function done(): void {
  invalidateReadCache(new Set(["cases", "case_measurements", "case_causes", "case_checks", "case_requests", "case_files", "case_series", "case_series_points", "case_events", "manual_alarms", "work_orders", "alarm_events"]));
}

async function caseRow(id: number): Promise<{ id: number; machine_id: string; title: string; stage: CaseStage; priority: CasePriority; subassembly_ref_id: string | null; rule_code: string | null }> {
  const r = await pool.query("SELECT id, machine_id, title, stage, priority, subassembly_ref_id, rule_code FROM cases WHERE id = $1", [id]);
  if (!r.rows[0]) throw new NotFoundError(`Case ${id} not found`);
  return { ...r.rows[0], id: Number(r.rows[0].id) };
}

/** Machine part row id from the app's part code. */
async function partRef(machineId: string, subId: string | null | undefined): Promise<string | null> {
  if (!subId) return null;
  const r = await query<{ id: string }>(
    `SELECT s.id FROM machine_subassemblies s JOIN machine_systems y ON y.id = s.machine_system_ref_id
      WHERE y.machine_id = $1 AND (s.subassembly_id = $2 OR s.id = $2) LIMIT 1`,
    [machineId, subId],
  );
  if (!r.rows[0]) throw new InputError(`${subId} is not a part of ${machineId}`);
  return r.rows[0].id;
}

/* ------------------------------------------------------------------ */
/* Read                                                                */
/* ------------------------------------------------------------------ */

export interface CaseSummary {
  id: number;
  machineId: string;
  machineName: string;
  plantId: string;
  partId: string | null;
  partName: string | null;
  title: string;
  nextAction: string | null;
  stage: CaseStage;
  stageWord: string;
  priority: CasePriority;
  priorityWord: string;
  ownerId: string | null;
  ownerName: string | null;
  origin: "manual" | "problem" | "guide";
  ruleCode: string | null;
  openChecks: number;
  workOrderId: number | null;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
}

const SUMMARY_SQL = `
  SELECT c.id, c.machine_id, m.name AS machine_name, m.plant_id, s.subassembly_id AS part_id, s.name AS part_name, c.title, c.next_action,
         c.stage, c.priority, c.owner_user_id, o.full_name AS owner_name, c.origin, c.rule_code, c.created_at, c.updated_at,
         COALESCE(u.full_name, cu.full_name) AS updated_by,
         (SELECT COUNT(*) FROM case_checks k WHERE k.case_id = c.id AND k.status = 'open')::int AS open_checks,
         (SELECT r.work_order_id FROM case_requests r WHERE r.case_id = c.id ORDER BY r.id DESC LIMIT 1) AS work_order_id
    FROM cases c
    JOIN machines m ON m.id = c.machine_id
    LEFT JOIN machine_subassemblies s ON s.id = c.subassembly_ref_id
    LEFT JOIN users o ON o.id = c.owner_user_id
    LEFT JOIN users u ON u.id = c.updated_by
    LEFT JOIN users cu ON cu.id = c.created_by`;

function mapSummary(r: Record<string, unknown>): CaseSummary {
  const stage = r.stage as CaseStage;
  const priority = r.priority as CasePriority;
  return {
    id: Number(r.id),
    machineId: String(r.machine_id),
    machineName: String(r.machine_name),
    plantId: String(r.plant_id),
    partId: (r.part_id as string) ?? null,
    partName: (r.part_name as string) ?? null,
    title: String(r.title),
    nextAction: (r.next_action as string) ?? null,
    stage,
    stageWord: STAGE_WORD[stage],
    priority,
    priorityWord: PRIORITY_WORD[priority],
    ownerId: (r.owner_user_id as string) ?? null,
    ownerName: (r.owner_name as string) ?? null,
    origin: r.origin as CaseSummary["origin"],
    ruleCode: (r.rule_code as string) ?? null,
    openChecks: Number(r.open_checks ?? 0),
    workOrderId: r.work_order_id === null || r.work_order_id === undefined ? null : Number(r.work_order_id),
    createdAt: (r.created_at as Date).toISOString(),
    updatedAt: (r.updated_at as Date).toISOString(),
    updatedBy: (r.updated_by as string) ?? null,
  };
}

export async function listCases(filter: { plantId?: string | null; machineId?: string | null; ruleCode?: string | null; limit?: number } = {}): Promise<{
  cases: CaseSummary[];
  counts: { open: number; waiting: number; maintenance: number; verifying: number; closed: number };
}> {
  const res = await pool.query(
    `${SUMMARY_SQL}
      WHERE ($1::varchar IS NULL OR m.plant_id = $1) AND ($2::varchar IS NULL OR c.machine_id = $2) AND ($3::varchar IS NULL OR c.rule_code = $3)
      ORDER BY (c.stage = 'closed'), CASE c.priority WHEN 'urgent' THEN 0 WHEN 'priority' THEN 1 WHEN 'routine' THEN 2 ELSE 3 END, c.updated_at DESC
      LIMIT $4`,
    [filter.plantId ?? null, filter.machineId ?? null, filter.ruleCode ?? null, Math.min(filter.limit ?? 200, 500)],
  );
  const cases = res.rows.map(mapSummary);
  return {
    cases,
    counts: {
      open: cases.filter((c) => c.stage !== "closed").length,
      waiting: cases.filter((c) => c.stage === "waiting").length,
      maintenance: cases.filter((c) => c.stage === "maintenance").length,
      verifying: cases.filter((c) => c.stage === "verifying").length,
      closed: cases.filter((c) => c.stage === "closed").length,
    },
  };
}

export interface CaseReading {
  measurementId: string;
  tag: string;
  name: string;
  unit: string;
  value: number | null;
  state: string | null;
  at: string | null;
  quality: string | null;
  normal: string | null;
  /** Where the reading comes from, in plain words. */
  source: string;
  /** True when normal values for comparing are stored. */
  hasReference: boolean;
  expected: number | null;
  history: Array<{ t: string; v: number }>;
}

export interface CaseCause {
  id: number;
  text: string;
  status: CauseStatus;
  statusWord: string;
  checks: number;
}

export interface CaseCheck {
  id: number;
  causeId: number | null;
  causeText: string | null;
  kind: CheckKind;
  kindWord: string;
  detail: string;
  assignee: string | null;
  status: "open" | "done" | "cancelled";
  result: CheckResult | null;
  resultWord: string | null;
  resultNote: string | null;
  createdBy: string | null;
  createdAt: string;
  doneBy: string | null;
  doneAt: string | null;
}

export interface CaseRequest {
  id: number;
  workType: WorkType;
  workWord: string;
  team: string;
  scope: string;
  acceptance: string;
  window: string | null;
  resources: string | null;
  workOrderId: number | null;
  workOrderStatus: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface CaseDetail extends CaseSummary {
  observation: string;
  runningMode: RunningMode;
  runningWord: string;
  runningNote: string | null;
  /** The machine's running state as recorded by the plant (machine_operating_states), if any. */
  plantRunning: { mode: string; since: string; reason: string | null } | null;
  assessment: Assessment;
  assessmentWord: string;
  assessmentNote: string | null;
  closeNote: string | null;
  closedAt: string | null;
  guide: { id: string; title: string; checks: string[] } | null;
  rule: { code: string; title: string; what: string | null; affects: string | null; todo: string | null } | null;
  readings: CaseReading[];
  series: Array<{ id: number; name: string; unit: string; uploadedBy: string | null; uploadedAt: string; points: Array<{ t: string; v: number | null; quality: string }> }>;
  progression: { label: string; tone: "good" | "warn" | "bad" | "idle"; basis: string };
  causes: CaseCause[];
  checks: CaseCheck[];
  requests: CaseRequest[];
  files: Array<{ id: number; name: string; contentType: string; size: number; uploadedBy: string | null; uploadedAt: string }>;
  events: Array<{ at: string; who: string | null; text: string }>;
  alarms: ManualAlarm[];
}

const SOURCE_WORD: Record<string, string> = { online: "Live sensor", calculated: "Worked out from other readings", manual: "Typed in by hand" };

async function readingsOf(caseId: number): Promise<CaseReading[]> {
  const ms = await pool.query(
    `SELECT c.measurement_id, c.tag, c.name, c.unit, c.origin_id, m.normal_text,
            (SELECT rv.expected FROM reference_values rv WHERE rv.measurement_id = c.measurement_id ORDER BY rv.reference_set_id DESC LIMIT 1) AS expected,
            EXISTS (SELECT 1 FROM reference_values rv WHERE rv.measurement_id = c.measurement_id) AS has_ref
       FROM case_measurements cm
       JOIN v_measurement_context c ON c.measurement_id = cm.measurement_id
       JOIN measurements m ON m.id = cm.measurement_id
      WHERE cm.case_id = $1
      ORDER BY c.sort_order, c.tag`,
    [caseId],
  );
  if (!ms.rows.length) return [];
  const ids = ms.rows.map((r) => r.measurement_id as string);
  // The last 24 hours in 5-minute averages (enough for the chart and the trend), and the latest reading itself.
  const [hist, latest] = await Promise.all([
    pool.query<{ measurement_id: string; t: Date; value: number | null }>(
      `SELECT measurement_id, date_bin('5 minutes', acquired_at, TIMESTAMPTZ '2000-01-01') AS t, AVG(value) AS value FROM readings
        WHERE measurement_id = ANY($1) AND acquired_at > NOW() - INTERVAL '24 hours' AND value IS NOT NULL
        GROUP BY 1, 2 ORDER BY 2`,
      [ids],
    ),
    pool.query<{ measurement_id: string; t: Date; value: number | null; state: string | null; quality_id: string }>(
      `SELECT DISTINCT ON (measurement_id) measurement_id, acquired_at AS t, value, state, quality_id FROM readings
        WHERE measurement_id = ANY($1) AND acquired_at > NOW() - INTERVAL '24 hours' ORDER BY measurement_id, acquired_at DESC`,
      [ids],
    ),
  ]);
  const byId = new Map<string, typeof hist.rows>();
  for (const r of hist.rows) (byId.get(r.measurement_id) ?? byId.set(r.measurement_id, []).get(r.measurement_id)!).push(r);
  const lastOf = new Map(latest.rows.map((r) => [r.measurement_id, r]));
  return ms.rows.map((r) => {
    const rows = byId.get(r.measurement_id) ?? [];
    const last = lastOf.get(r.measurement_id);
    const origin = String(r.origin_id);
    return {
      measurementId: r.measurement_id,
      tag: r.tag,
      name: r.name,
      unit: r.unit ?? "",
      value: last?.value === null || last?.value === undefined ? null : Number(last.value),
      state: last?.state ?? null,
      at: iso(last?.t),
      quality: last?.quality_id ?? null,
      normal: r.normal_text ?? null,
      source: SOURCE_WORD[origin] ?? origin,
      hasReference: Boolean(r.has_ref),
      expected: r.expected === null ? null : Number(r.expected),
      history: rows.filter((p) => p.value !== null).map((p) => ({ t: p.t.toISOString(), v: Number(p.value) })),
    };
  });
}

/**
 * Is the problem getting worse? From the last 6 hours of the case's readings: a reading moving toward its
 * alarm limit faster than its own scatter is getting worse; away from it, getting better.
 */
async function progressionOf(caseId: number, readings: CaseReading[], plantRunning: CaseDetail["plantRunning"]): Promise<CaseDetail["progression"]> {
  const since = Date.now() - 6 * 3_600_000;
  const limits = await pool.query<{ measurement_id: string; alarm_value: number | null; alarm_hi: number | null; alarm_lo: number | null; direction: string | null }>(
    `SELECT l.measurement_id, l.alarm_value, l.alarm_hi, l.alarm_lo, l.direction FROM measurement_limits l
       JOIN case_measurements cm ON cm.measurement_id = l.measurement_id WHERE cm.case_id = $1`,
    [caseId],
  );
  const limitOf = new Map(limits.rows.map((l) => [l.measurement_id, l]));
  let worse = 0;
  let better = 0;
  let used = 0;
  for (const r of readings) {
    const pts = r.history.filter((p) => Date.parse(p.t) >= since);
    if (pts.length < 10) continue;
    used++;
    const xs = pts.map((p) => (Date.parse(p.t) - since) / 3_600_000);
    const ys = pts.map((p) => p.v);
    const n = xs.length;
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    const my = ys.reduce((a, b) => a + b, 0) / n;
    let sxx = 0;
    let sxy = 0;
    for (let i = 0; i < n; i++) {
      sxx += (xs[i] - mx) ** 2;
      sxy += (xs[i] - mx) * (ys[i] - my);
    }
    if (!sxx) continue;
    const b = sxy / sxx;
    let sse = 0;
    for (let i = 0; i < n; i++) sse += (ys[i] - (my + b * (xs[i] - mx))) ** 2;
    const sd = Math.sqrt(sse / Math.max(1, n - 2));
    const span = xs[n - 1] - xs[0];
    if (Math.abs(b * span) < 2 * sd) continue; // no change beyond normal scatter
    const lim = limitOf.get(r.measurementId);
    const hi = lim?.alarm_hi ?? (lim?.direction === "lo" ? null : lim?.alarm_value) ?? null;
    const lo = lim?.alarm_lo ?? (lim?.direction === "lo" ? lim?.alarm_value : null) ?? null;
    const towards = (hi !== null && b > 0) || (lo !== null && b < 0) || (hi === null && lo === null && r.expected !== null && Math.sign(b) === Math.sign((ys[n - 1] ?? 0) - r.expected));
    if (towards) worse++;
    else better++;
  }
  const changed = plantRunning && Date.parse(plantRunning.since) >= since;
  const basis = used ? `Based on how ${used} of the case's readings moved over the last 6 hours.` : "Not enough readings in the last 6 hours to tell.";
  if (!used) return { label: "Not enough readings", tone: "idle", basis };
  if (changed) return { label: "Running conditions changed", tone: "warn", basis: `${basis} The machine changed to "${plantRunning!.mode}" in that time, so the trend may come from that.` };
  if (worse) return { label: "Getting worse", tone: "bad", basis: `${basis} ${worse} ${worse === 1 ? "is" : "are"} moving toward ${worse === 1 ? "its" : "their"} limit.` };
  if (better) return { label: "Getting better", tone: "good", basis: `${basis} ${better} ${better === 1 ? "is" : "are"} moving back toward normal.` };
  return { label: "Holding steady", tone: "idle", basis: `${basis} None is changing more than its normal scatter.` };
}

export interface ManualAlarm {
  id: number;
  machineId: string;
  machineName: string;
  caseId: number | null;
  title: string;
  severity: "alert" | "critical";
  location: string;
  observedValue: string | null;
  limitText: string | null;
  observedAt: string;
  source: string;
  recordedBy: string | null;
  recordedAt: string;
  ackedBy: string | null;
  ackedAt: string | null;
}

const ALARM_SQL = `
  SELECT a.*, m.name AS machine_name, r.full_name AS recorded_name, k.full_name AS acked_name
    FROM manual_alarms a JOIN machines m ON m.id = a.machine_id
    LEFT JOIN users r ON r.id = a.recorded_by LEFT JOIN users k ON k.id = a.acked_by`;

function mapAlarm(a: Record<string, unknown>): ManualAlarm {
  return {
    id: Number(a.id),
    machineId: String(a.machine_id),
    machineName: String(a.machine_name),
    caseId: a.case_id === null ? null : Number(a.case_id),
    title: String(a.title),
    severity: a.severity as ManualAlarm["severity"],
    location: String(a.location),
    observedValue: (a.observed_value as string) ?? null,
    limitText: (a.limit_text as string) ?? null,
    observedAt: (a.observed_at as Date).toISOString(),
    source: String(a.source),
    recordedBy: (a.recorded_name as string) ?? null,
    recordedAt: (a.recorded_at as Date).toISOString(),
    ackedBy: (a.acked_name as string) ?? null,
    ackedAt: iso(a.acked_at as Date | null),
  };
}

export async function getCase(id: number): Promise<CaseDetail> {
  const base = await pool.query(`${SUMMARY_SQL} WHERE c.id = $1`, [id]);
  if (!base.rows[0]) throw new NotFoundError(`Case ${id} not found`);
  const summary = mapSummary(base.rows[0]);
  const full = (await pool.query("SELECT * FROM cases WHERE id = $1", [id])).rows[0];
  const runRow = (await pool.query("SELECT mode, since_at, reason FROM machine_operating_states WHERE machine_id = $1", [summary.machineId])).rows[0];
  const plantRunning = runRow ? { mode: String(runRow.mode), since: (runRow.since_at as Date).toISOString(), reason: runRow.reason ?? null } : null;
  const readings = await readingsOf(id);

  const guideRow = full.guide_id ? (await pool.query("SELECT id, title FROM investigation_guides WHERE id = $1", [full.guide_id])).rows[0] : null;
  const guideChecks = guideRow ? (await pool.query("SELECT text FROM investigation_guide_items WHERE guide_id = $1 AND kind = 'check' ORDER BY sort_order", [guideRow.id])).rows.map((r) => String(r.text)) : [];
  const ruleRow = full.rule_code
    ? (await pool.query("SELECT code, name, plain_title, plain_what, plain_todo, consequence FROM rules WHERE machine_id = $1 AND code = $2", [summary.machineId, full.rule_code])).rows[0]
    : null;

  const causes = await pool.query("SELECT id, text FROM case_causes WHERE case_id = $1 ORDER BY sort_order, id", [id]);
  const checks = await pool.query(
    `SELECT k.*, cc.text AS cause_text, a.full_name AS assignee_name, cb.full_name AS created_name, db.full_name AS done_name
       FROM case_checks k LEFT JOIN case_causes cc ON cc.id = k.cause_id LEFT JOIN users a ON a.id = k.assignee_user_id
       LEFT JOIN users cb ON cb.id = k.created_by LEFT JOIN users db ON db.id = k.done_by
      WHERE k.case_id = $1 ORDER BY k.id`,
    [id],
  );
  const checkList: CaseCheck[] = checks.rows.map((k) => ({
    id: Number(k.id),
    causeId: k.cause_id === null ? null : Number(k.cause_id),
    causeText: k.cause_text ?? null,
    kind: k.kind,
    kindWord: CHECK_WORD[k.kind as CheckKind],
    detail: k.detail,
    assignee: k.assignee_name ?? k.assignee_text ?? null,
    status: k.status,
    result: k.result ?? null,
    resultWord: k.result ? RESULT_WORD[k.result as CheckResult] : null,
    resultNote: k.result_note ?? null,
    createdBy: k.created_name ?? null,
    createdAt: (k.created_at as Date).toISOString(),
    doneBy: k.done_name ?? null,
    doneAt: iso(k.done_at),
  }));
  const causeList: CaseCause[] = causes.rows.map((c) => {
    const mine = checkList.filter((k) => k.causeId === Number(c.id) && k.status !== "cancelled");
    const doneChecks = mine.filter((k) => k.status === "done");
    const status: CauseStatus = doneChecks.some((k) => k.result === "supports")
      ? "supported"
      : doneChecks.some((k) => k.result === "rules_out")
        ? "ruled_out"
        : mine.some((k) => k.status === "open")
          ? "being_checked"
          : doneChecks.length
            ? "unclear"
            : "not_checked";
    return { id: Number(c.id), text: c.text, status, statusWord: CAUSE_WORD[status], checks: mine.length };
  });

  const requests = await pool.query(
    `SELECT r.*, w.status AS wo_status, u.full_name AS created_name FROM case_requests r
       LEFT JOIN work_orders w ON w.id = r.work_order_id LEFT JOIN users u ON u.id = r.created_by
      WHERE r.case_id = $1 ORDER BY r.id`,
    [id],
  );
  const WO_WORD: Record<string, string> = { open: "Waiting to start", in_progress: "Being worked on", done: "Done", cancelled: "Cancelled" };
  const files = await pool.query(
    "SELECT f.id, f.name, f.content_type, f.size_bytes, f.uploaded_at, u.full_name FROM case_files f LEFT JOIN users u ON u.id = f.uploaded_by WHERE f.case_id = $1 ORDER BY f.id",
    [id],
  );
  const series = await pool.query("SELECT s.id, s.name, s.unit, s.uploaded_at, u.full_name FROM case_series s LEFT JOIN users u ON u.id = s.uploaded_by WHERE s.case_id = $1 ORDER BY s.id", [id]);
  const points = series.rows.length
    ? await pool.query("SELECT series_id, t, value, quality FROM case_series_points WHERE series_id = ANY($1) ORDER BY t", [series.rows.map((s) => s.id)])
    : { rows: [] as Array<{ series_id: string; t: Date; value: number | null; quality: string }> };
  const events = await pool.query("SELECT e.at, e.text, u.full_name FROM case_events e LEFT JOIN users u ON u.id = e.user_id WHERE e.case_id = $1 ORDER BY e.at DESC, e.id DESC", [id]);
  const alarms = await pool.query(`${ALARM_SQL} WHERE a.case_id = $1 ORDER BY a.observed_at DESC`, [id]);

  return {
    ...summary,
    observation: full.observation,
    runningMode: full.running_mode,
    runningWord: MODE_WORD[full.running_mode as RunningMode],
    runningNote: full.running_note ?? null,
    plantRunning,
    assessment: full.assessment,
    assessmentWord: ASSESSMENT_WORD[full.assessment as Assessment],
    assessmentNote: full.assessment_note ?? null,
    closeNote: full.close_note ?? null,
    closedAt: iso(full.closed_at),
    guide: guideRow ? { id: guideRow.id, title: guideRow.title, checks: guideChecks } : null,
    rule: ruleRow ? { code: ruleRow.code, title: ruleRow.plain_title ?? ruleRow.name, what: ruleRow.plain_what ?? null, affects: ruleRow.consequence ?? null, todo: ruleRow.plain_todo ?? null } : null,
    readings,
    series: series.rows.map((s) => ({
      id: Number(s.id),
      name: s.name,
      unit: s.unit,
      uploadedBy: s.full_name ?? null,
      uploadedAt: (s.uploaded_at as Date).toISOString(),
      points: points.rows.filter((p) => Number(p.series_id) === Number(s.id)).map((p) => ({ t: (p.t as Date).toISOString(), v: p.value === null ? null : Number(p.value), quality: p.quality })),
    })),
    progression: await progressionOf(id, readings, plantRunning),
    causes: causeList,
    checks: checkList,
    requests: requests.rows.map((r) => ({
      id: Number(r.id),
      workType: r.work_type,
      workWord: WORK_WORD[r.work_type as WorkType],
      team: r.team,
      scope: r.scope,
      acceptance: r.acceptance,
      window: r.window_text ?? null,
      resources: r.resources ?? null,
      workOrderId: r.work_order_id === null ? null : Number(r.work_order_id),
      workOrderStatus: r.wo_status ? (WO_WORD[r.wo_status] ?? r.wo_status) : null,
      createdBy: r.created_name ?? null,
      createdAt: (r.created_at as Date).toISOString(),
    })),
    files: files.rows.map((f) => ({ id: Number(f.id), name: f.name, contentType: f.content_type, size: Number(f.size_bytes), uploadedBy: f.full_name ?? null, uploadedAt: (f.uploaded_at as Date).toISOString() })),
    events: events.rows.map((e) => ({ at: (e.at as Date).toISOString(), who: e.full_name ?? null, text: e.text })),
    alarms: alarms.rows.map(mapAlarm),
  };
}

/* ------------------------------------------------------------------ */
/* Create and update                                                   */
/* ------------------------------------------------------------------ */

export async function createCase(input: Record<string, unknown>, userId: string | null): Promise<number> {
  const machineId = text(input.machineId, 64, "Machine")!;
  const exists = await query("SELECT 1 FROM machines WHERE id = $1", [machineId]);
  if (!exists.rowCount) throw new NotFoundError(`Machine ${machineId} not found`);
  const origin = input.guideId ? "guide" : input.ruleCode ? "problem" : "manual";
  const title = text(input.title, 200, "What the problem is")!;
  const observation = text(input.observation, 4000, "What was seen")!;
  const priority = input.priority === undefined ? "unassigned" : oneOf(input.priority, PRIORITIES, "Priority");
  const mode = input.runningMode === undefined ? "unknown" : oneOf(input.runningMode, MODES, "Running mode");
  const ownerId = text(input.ownerUserId, 64, "Owner", false);
  const ruleCode = text(input.ruleCode, 64, "Problem", false);
  const guideId = text(input.guideId, 48, "Guide", false);
  let subRef = await partRef(machineId, text(input.partId, 64, "Part", false));

  // Readings the case follows: the ones asked for, else the problem's inputs, the guide's readings, or the part's.
  let measurementIds: string[] = Array.isArray(input.measurementIds) ? (input.measurementIds as unknown[]).filter((x): x is string => typeof x === "string") : [];
  let causes: string[] = [];
  if (ruleCode) {
    const r = await query<{ measurement_id: string }>("SELECT ri.measurement_id FROM rules r JOIN rule_inputs ri ON ri.rule_id = r.id WHERE r.machine_id = $1 AND r.code = $2", [machineId, ruleCode]);
    if (!measurementIds.length) measurementIds = r.rows.map((x) => x.measurement_id);
    causes = PROBLEM_CAUSES;
    if (!subRef) {
      const s = await query<{ id: string }>(
        `SELECT s.id FROM rules r JOIN rule_subassemblies rs ON rs.rule_id = r.id JOIN machine_subassemblies s ON s.id = rs.subassembly_id WHERE r.machine_id = $1 AND r.code = $2 LIMIT 1`,
        [machineId, ruleCode],
      );
      subRef = s.rows[0]?.id ?? null;
    }
  }
  if (guideId) {
    const g = await query<{ subassembly_ref_id: string | null }>("SELECT subassembly_ref_id FROM investigation_guides WHERE id = $1", [guideId]);
    if (!g.rows[0]) throw new NotFoundError(`Guide ${guideId} not found`);
    subRef = subRef ?? g.rows[0].subassembly_ref_id;
    const items = await query<{ kind: string; text: string; measurement_id: string | null }>("SELECT kind, text, measurement_id FROM investigation_guide_items WHERE guide_id = $1 ORDER BY kind, sort_order", [guideId]);
    causes = items.rows.filter((i) => i.kind === "cause").map((i) => i.text);
    if (!measurementIds.length) measurementIds = items.rows.filter((i) => i.kind === "reading" && i.measurement_id).map((i) => i.measurement_id!);
  }
  if (!measurementIds.length && subRef) {
    const m = await query<{ measurement_id: string }>("SELECT measurement_id FROM v_measurement_context WHERE machine_id = $1 AND subassembly_id = $2 ORDER BY sort_order LIMIT 12", [machineId, subRef]);
    measurementIds = m.rows.map((x) => x.measurement_id);
  }
  if (!causes.length) causes = ["A real fault on the machine", "A sensor is giving a wrong reading"];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ins = await client.query(
      `INSERT INTO cases (machine_id, subassembly_ref_id, title, observation, origin, rule_code, guide_id, priority, owner_user_id, running_mode, running_note, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12) RETURNING id`,
      [machineId, subRef, title, observation, origin, ruleCode, guideId, priority, ownerId, mode, text(input.runningNote, 1000, "Running notes", false), userId],
    );
    const id = Number(ins.rows[0].id);
    for (const m of [...new Set(measurementIds)]) await client.query("INSERT INTO case_measurements (case_id, measurement_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [id, m]);
    for (const [i, c] of causes.entries()) await client.query("INSERT INTO case_causes (case_id, text, sort_order, created_by) VALUES ($1, $2, $3, $4)", [id, c, i, userId]);
    await event(client, id, userId, origin === "problem" ? "Case started from a problem the system found." : origin === "guide" ? "Case started from an investigation guide." : "Case started from something someone saw.");
    await client.query("COMMIT");
    return id;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    done();
  }
}

export async function updateCase(id: number, patch: Record<string, unknown>, userId: string | null): Promise<void> {
  const before = (await pool.query("SELECT * FROM cases WHERE id = $1", [id])).rows[0];
  if (!before) throw new NotFoundError(`Case ${id} not found`);
  const sets: string[] = [];
  const params: unknown[] = [];
  const lines: string[] = [];
  const set = (col: string, v: unknown, line: string | null) => {
    if (before[col] === v) return;
    params.push(v);
    sets.push(`${col} = $${params.length}`);
    if (line) lines.push(line);
  };
  if (patch.title !== undefined) set("title", text(patch.title, 200, "What the problem is"), "Changed what the problem is called.");
  if (patch.observation !== undefined) set("observation", text(patch.observation, 4000, "What was seen"), "Updated what was seen.");
  if (patch.priority !== undefined) {
    const p = oneOf(patch.priority, PRIORITIES, "Priority");
    set("priority", p, `Set priority to ${PRIORITY_WORD[p]}.`);
  }
  if (patch.ownerUserId !== undefined) {
    const o = text(patch.ownerUserId, 64, "Owner", false);
    set("owner_user_id", o, o ? `Gave the case to ${(await nameOf(o)) ?? o}.` : "Removed the owner.");
  }
  if (patch.partId !== undefined) set("subassembly_ref_id", await partRef(before.machine_id, text(patch.partId, 64, "Part", false)), "Changed the part.");
  if (patch.runningMode !== undefined) {
    const m = oneOf(patch.runningMode, MODES, "Running mode");
    set("running_mode", m, `Recorded the machine as ${MODE_WORD[m].toLowerCase()}.`);
  }
  if (patch.runningNote !== undefined) set("running_note", text(patch.runningNote, 1000, "Running notes", false), "Updated how the machine was being run.");
  if (patch.assessment !== undefined) {
    const a = oneOf(patch.assessment, ASSESSMENTS, "What we know");
    set("assessment", a, `What we know now: ${ASSESSMENT_WORD[a]}.`);
  }
  if (patch.assessmentNote !== undefined) set("assessment_note", text(patch.assessmentNote, 4000, "Notes", false), null);
  if (patch.nextAction !== undefined) set("next_action", text(patch.nextAction, 1000, "Next step", false), "Changed the next step.");
  if (patch.stage !== undefined) {
    const s = oneOf(patch.stage, STAGES, "Stage");
    set("stage", s, `Moved the case to "${STAGE_WORD[s]}".`);
    if (s === "closed" && before.stage !== "closed") {
      params.push(new Date());
      sets.push(`closed_at = $${params.length}`);
    }
    if (s !== "closed" && before.stage === "closed") sets.push("closed_at = NULL");
  }
  if (!sets.length) return;
  // The first change by someone moves a new case into investigation.
  if (patch.stage === undefined && before.stage === "new") sets.push("stage = 'investigating'");
  params.push(userId, id);
  await pool.query(`UPDATE cases SET ${sets.join(", ")}, updated_at = NOW(), updated_by = $${params.length - 1} WHERE id = $${params.length}`, params);
  for (const l of lines) await event(null, id, userId, l);
  done();
}

/* ------------------------------------------------------------------ */
/* Causes and checks                                                   */
/* ------------------------------------------------------------------ */

export async function addCause(caseId: number, input: Record<string, unknown>, userId: string | null): Promise<void> {
  await caseRow(caseId);
  const t = text(input.text, 500, "Possible cause")!;
  await pool.query("INSERT INTO case_causes (case_id, text, sort_order, created_by) VALUES ($1, $2, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM case_causes WHERE case_id = $1), $3)", [caseId, t, userId]);
  await event(null, caseId, userId, `Added a possible cause: ${t}`);
  await touch(caseId, userId);
  done();
}

export async function removeCause(caseId: number, causeId: number, userId: string | null): Promise<void> {
  const r = await pool.query("DELETE FROM case_causes WHERE id = $1 AND case_id = $2 RETURNING text", [causeId, caseId]);
  if (!r.rowCount) throw new NotFoundError("Possible cause not found");
  await event(null, caseId, userId, `Removed a possible cause: ${r.rows[0].text}`);
  await touch(caseId, userId);
  done();
}

export async function addCheck(caseId: number, input: Record<string, unknown>, userId: string | null): Promise<void> {
  const c = await caseRow(caseId);
  const kind = oneOf(input.kind, CHECKS, "What is needed");
  const detail = text(input.detail, 2000, "What exactly to check")!;
  const causeId = input.causeId === undefined || input.causeId === null || input.causeId === "" ? null : Number(input.causeId);
  if (causeId !== null) {
    const ok = await pool.query("SELECT 1 FROM case_causes WHERE id = $1 AND case_id = $2", [causeId, caseId]);
    if (!ok.rowCount) throw new InputError("That possible cause is not on this case");
  }
  const assigneeUserId = text(input.assigneeUserId, 64, "Person", false);
  const assigneeText = assigneeUserId ? null : text(input.assigneeText, 128, "Person or team");
  await pool.query(
    "INSERT INTO case_checks (case_id, cause_id, kind, detail, assignee_user_id, assignee_text, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    [caseId, causeId, kind, detail, assigneeUserId, assigneeText, userId],
  );
  const who = assigneeUserId ? ((await nameOf(assigneeUserId)) ?? assigneeUserId) : assigneeText;
  await event(null, caseId, userId, `Asked ${who} to: ${CHECK_WORD[kind].toLowerCase()} — ${detail}`);
  if (c.stage === "new" || c.stage === "investigating") await pool.query("UPDATE cases SET stage = 'waiting' WHERE id = $1", [caseId]);
  await touch(caseId, userId);
  done();
}

export async function finishCheck(caseId: number, checkId: number, input: Record<string, unknown>, userId: string | null): Promise<void> {
  const c = await caseRow(caseId);
  const cancel = input.cancel === true;
  const result = cancel ? null : oneOf(input.result, RESULTS, "Result");
  const note = text(input.note, 2000, "What was found", !cancel);
  const r = await pool.query(
    `UPDATE case_checks SET status = $3, result = $4, result_note = $5, done_by = $6, done_at = NOW() WHERE id = $1 AND case_id = $2 AND status = 'open' RETURNING detail`,
    [checkId, caseId, cancel ? "cancelled" : "done", result, note, userId],
  );
  if (!r.rowCount) throw new NotFoundError("Open check not found");
  await event(null, caseId, userId, cancel ? `Cancelled a check: ${r.rows[0].detail}` : `Check done (${RESULT_WORD[result!].toLowerCase()}): ${note}`);
  const open = await pool.query("SELECT 1 FROM case_checks WHERE case_id = $1 AND status = 'open' LIMIT 1", [caseId]);
  if (!open.rowCount && c.stage === "waiting") await pool.query("UPDATE cases SET stage = 'investigating' WHERE id = $1", [caseId]);
  await touch(caseId, userId);
  done();
}

/* ------------------------------------------------------------------ */
/* Maintenance, recovery, closing                                      */
/* ------------------------------------------------------------------ */

const PRIORITY_TO_WO: Record<CasePriority, string | undefined> = { urgent: "P1", priority: "P2", routine: "P3", unassigned: undefined };

export async function addRequest(caseId: number, input: Record<string, unknown>, userId: string | null): Promise<number> {
  const c = await caseRow(caseId);
  const workType = oneOf(input.workType, WORKS, "Kind of work");
  const team = text(input.team, 128, "Team")!;
  const scope = text(input.scope, 4000, "What needs doing")!;
  const acceptance = text(input.acceptance, 2000, "How we will know it is fixed")!;
  const windowText = text(input.window, 500, "When it can be done", false);
  const resources = text(input.resources, 2000, "Parts, tools and procedures", false);
  const part = c.subassembly_ref_id ? (await pool.query("SELECT name FROM machine_subassemblies WHERE id = $1", [c.subassembly_ref_id])).rows[0]?.name : null;
  const notes = [
    `From problem case ${caseId}: ${c.title}`,
    `Work: ${WORK_WORD[workType]}`,
    `What needs doing: ${scope}`,
    `How we will know it is fixed: ${acceptance}`,
    windowText ? `When: ${windowText}` : null,
    resources ? `Parts, tools and procedures: ${resources}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  const wo = await createWorkOrder({
    machineId: c.machine_id,
    ruleId: c.rule_code,
    title: `${WORK_WORD[workType]}: ${c.title}`.slice(0, 255),
    component: part ?? undefined,
    priority: PRIORITY_TO_WO[c.priority],
    actionKind: workType === "repair" ? "repair" : "mitigate",
    assignee: team,
    createdByUserId: userId,
    notes,
  });
  const ins = await pool.query(
    "INSERT INTO case_requests (case_id, work_type, team, scope, acceptance, window_text, resources, work_order_id, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id",
    [caseId, workType, team, scope, acceptance, windowText, resources, wo.id, userId],
  );
  await pool.query("UPDATE cases SET stage = 'maintenance' WHERE id = $1 AND stage <> 'closed'", [caseId]);
  await event(null, caseId, userId, `Sent to maintenance (${team}): work order ${wo.id} — ${WORK_WORD[workType].toLowerCase()}.`);
  await touch(caseId, userId);
  done();
  return Number(ins.rows[0].id);
}

export async function verifyRecovery(caseId: number, input: Record<string, unknown>, userId: string | null): Promise<void> {
  const c = await caseRow(caseId);
  if (c.stage === "closed") throw new InputError("The case is closed");
  const note = text(input.note, 2000, "Notes", false);
  await pool.query("UPDATE cases SET stage = 'verifying', assessment = 'recovery', updated_at = NOW(), updated_by = $2 WHERE id = $1", [caseId, userId]);
  await event(null, caseId, userId, `Started checking that the fix worked.${note ? ` ${note}` : ""}`);
  done();
}

export async function closeCase(caseId: number, input: Record<string, unknown>, userId: string | null): Promise<void> {
  await caseRow(caseId);
  const note = text(input.note, 4000, "Why it can be closed")!;
  await pool.query("UPDATE cases SET stage = 'closed', close_note = $2, closed_at = NOW(), updated_at = NOW(), updated_by = $3 WHERE id = $1", [caseId, note, userId]);
  await event(null, caseId, userId, `Closed the case: ${note}`);
  done();
}

export async function reopenCase(caseId: number, userId: string | null): Promise<void> {
  await pool.query("UPDATE cases SET stage = 'investigating', closed_at = NULL, close_note = NULL, updated_at = NOW(), updated_by = $2 WHERE id = $1 AND stage = 'closed'", [caseId, userId]);
  await event(null, caseId, userId, "Opened the case again.");
  done();
}

/* ------------------------------------------------------------------ */
/* Files and imported readings                                         */
/* ------------------------------------------------------------------ */

export async function addFile(caseId: number, file: { name: string; type: string; data: Buffer }, userId: string | null): Promise<void> {
  await caseRow(caseId);
  if (file.data.length > 10 * 1024 * 1024) throw new InputError("The file is larger than 10 MB");
  const name = text(file.name, 255, "File name")!;
  await pool.query("INSERT INTO case_files (case_id, name, content_type, size_bytes, data, uploaded_by) VALUES ($1,$2,$3,$4,$5,$6)", [caseId, name, file.type || "application/octet-stream", file.data.length, file.data, userId]);
  await event(null, caseId, userId, `Attached a file: ${name}`);
  await touch(caseId, userId);
  done();
}

export async function getFile(caseId: number, fileId: number): Promise<{ name: string; type: string; data: Buffer }> {
  const r = await pool.query("SELECT name, content_type, data FROM case_files WHERE id = $1 AND case_id = $2", [fileId, caseId]);
  if (!r.rows[0]) throw new NotFoundError("File not found");
  return { name: r.rows[0].name, type: r.rows[0].content_type, data: r.rows[0].data };
}

export async function removeFile(caseId: number, fileId: number, userId: string | null): Promise<void> {
  const r = await pool.query("DELETE FROM case_files WHERE id = $1 AND case_id = $2 RETURNING name", [fileId, caseId]);
  if (!r.rowCount) throw new NotFoundError("File not found");
  await event(null, caseId, userId, `Removed a file: ${r.rows[0].name}`);
  done();
}

/** CSV with a header `timestamp,value,quality`; ISO times with a time zone; quality valid / missing / invalid. */
export async function importSeries(caseId: number, input: Record<string, unknown>, userId: string | null): Promise<number> {
  await caseRow(caseId);
  const name = text(input.name, 160, "Reading name")!;
  const unit = text(input.unit, 32, "Unit")!;
  const csv = text(input.csv, 2_000_000, "CSV file")!;
  const lines = csv.split(/\r?\n/).filter((l) => l.trim() !== "");
  const head = lines.shift()?.toLowerCase().replace(/\s/g, "");
  if (head !== "timestamp,value,quality" && head !== "timestamp,value") throw new InputError('The first line must be "timestamp,value,quality"');
  if (lines.length > 5000) throw new InputError("At most 5,000 rows");
  const rows: Array<{ t: Date; v: number | null; q: string }> = [];
  for (const [i, l] of lines.entries()) {
    const [ts, val, ql] = l.split(",").map((x) => x.trim());
    const t = new Date(ts);
    if (!/[zZ]|[+-]\d\d:?\d\d$/.test(ts ?? "") || Number.isNaN(t.getTime())) throw new InputError(`Row ${i + 2}: the time needs a date, time and time zone (for example 2026-10-19T08:00:00Z)`);
    const q = (ql || (val === "" ? "missing" : "valid")).toLowerCase();
    if (!["valid", "missing", "invalid"].includes(q)) throw new InputError(`Row ${i + 2}: quality must be valid, missing or invalid`);
    const v = val === "" || val === undefined ? null : Number(val);
    if (v !== null && !Number.isFinite(v)) throw new InputError(`Row ${i + 2}: the value is not a number`);
    rows.push({ t, v, q });
  }
  if (!rows.length) throw new InputError("The file has no rows");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const s = await client.query("INSERT INTO case_series (case_id, name, unit, uploaded_by) VALUES ($1,$2,$3,$4) RETURNING id", [caseId, name, unit, userId]);
    const sid = Number(s.rows[0].id);
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const vals = chunk.map((_, j) => `($1, $${j * 3 + 2}, $${j * 3 + 3}, $${j * 3 + 4})`).join(",");
      await client.query(`INSERT INTO case_series_points (series_id, t, value, quality) VALUES ${vals} ON CONFLICT DO NOTHING`, [sid, ...chunk.flatMap((r) => [r.t, r.v, r.q])]);
    }
    await event(client, caseId, userId, `Imported ${rows.length} readings of "${name}" from a file.`);
    await client.query("UPDATE cases SET updated_at = NOW(), updated_by = $2 WHERE id = $1", [caseId, userId]);
    await client.query("COMMIT");
    return sid;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    done();
  }
}

/* ------------------------------------------------------------------ */
/* Alarms recorded by hand                                             */
/* ------------------------------------------------------------------ */

export async function addManualAlarm(input: Record<string, unknown>, userId: string | null): Promise<void> {
  const machineId = text(input.machineId, 64, "Machine")!;
  const caseId = input.caseId === undefined || input.caseId === null ? null : Number(input.caseId);
  const at = new Date(String(input.observedAt ?? ""));
  if (Number.isNaN(at.getTime())) throw new InputError("When it was seen must be a date and time");
  await pool.query(
    `INSERT INTO manual_alarms (machine_id, case_id, title, severity, location, observed_value, limit_text, observed_at, source, recorded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      machineId,
      caseId,
      text(input.title, 200, "What the alarm is"),
      oneOf(input.severity, ["alert", "critical"] as const, "How serious"),
      text(input.location, 500, "Where on the machine"),
      text(input.observedValue, 200, "What was seen", false),
      text(input.limitText, 200, "Limit", false),
      at,
      text(input.source, 1000, "Who saw it and how"),
      userId,
    ],
  );
  if (caseId) {
    await event(null, caseId, userId, `Recorded an alarm by hand: ${String(input.title)}`);
    await touch(caseId, userId);
  }
  done();
}

/* ------------------------------------------------------------------ */
/* Condition strip (header popups)                                     */
/* ------------------------------------------------------------------ */

export interface ConditionStrip {
  scope: string;
  condition: { word: "Normal" | "Alert" | "Critical" | "No data"; basis: string };
  alarms: Array<{
    key: string;
    kind: "system" | "manual";
    id: number;
    machineId: string;
    machineName: string;
    severity: "Alert" | "Critical";
    title: string;
    where: string | null;
    since: string;
    ackedBy: string | null;
    ackedAt: string | null;
    source: string;
  }>;
  data: { fresh: number; total: number; staleAfterS: number; rows: Array<{ machineName: string; name: string; at: string | null; fresh: boolean }> };
  running: Array<{ machineName: string; mode: string; since: string }>;
}

export async function conditionStrip(filter: { plantId?: string | null; machineId?: string | null }): Promise<ConditionStrip> {
  const machines = await query<{ id: string; name: string }>(
    "SELECT id, name FROM machines WHERE ($1::varchar IS NULL OR plant_id = $1) AND ($2::varchar IS NULL OR id = $2) ORDER BY name",
    [filter.plantId ?? null, filter.machineId ?? null],
  );
  const ids = machines.rows.map((m) => m.id);
  const nameOfMachine = new Map(machines.rows.map((m) => [m.id, m.name]));
  // Open findings are the evaluation's own record of what is wrong: the same list Diagnosis, Analysis,
  // Home and AssetIQ count, so every page agrees on how many problems are open.
  const sys = await pool.query(
    `SELECT f.id, f.machine_id, f.opened_at AS raised_at, fa.acknowledged_at AS acked_at, u.full_name AS acked_by, f.severity_id AS severity,
            COALESCE(r.plain_title, r.name, CASE WHEN me.name IS NOT NULL THEN me.name || ': ' || LOWER(ft.name) END, ft.name) AS title
       FROM findings f
       JOIN finding_types ft ON ft.id = f.finding_type_id
       LEFT JOIN rules r ON r.id = f.rule_id
       LEFT JOIN measurements me ON me.id = f.measurement_id
       LEFT JOIN finding_acknowledgements fa ON fa.finding_id = f.id
       LEFT JOIN users u ON u.id = fa.user_id
      WHERE f.machine_id = ANY($1) AND f.cleared_at IS NULL
      ORDER BY f.opened_at DESC LIMIT 100`,
    [ids],
  );
  const man = await pool.query(`${ALARM_SQL} WHERE a.machine_id = ANY($1) AND a.cleared_at IS NULL ORDER BY a.observed_at DESC LIMIT 50`, [ids]);
  const alarms: ConditionStrip["alarms"] = [
    ...sys.rows.map((a) => ({
      key: `s${a.id}`,
      kind: "system" as const,
      id: Number(a.id),
      machineId: a.machine_id,
      machineName: nameOfMachine.get(a.machine_id) ?? a.machine_id,
      severity: (a.severity === "Critical" ? "Critical" : "Alert") as "Alert" | "Critical",
      title: a.title,
      where: null,
      since: (a.raised_at as Date).toISOString(),
      ackedBy: a.acked_by ?? null,
      ackedAt: iso(a.acked_at),
      source: "Found by the system",
    })),
    ...man.rows.map(mapAlarm).map((a) => ({
      key: `m${a.id}`,
      kind: "manual" as const,
      id: a.id,
      machineId: a.machineId,
      machineName: a.machineName,
      severity: (a.severity === "critical" ? "Critical" : "Alert") as "Alert" | "Critical",
      title: a.title,
      where: a.location,
      since: a.observedAt,
      ackedBy: a.ackedBy,
      ackedAt: a.ackedAt,
      source: `Recorded by hand${a.recordedBy ? ` by ${a.recordedBy}` : ""}: ${a.source}`,
    })),
  ];
  const staleAfter = 180;
  const latest = await pool.query(
    `SELECT c.machine_id, c.name, (SELECT MAX(r.acquired_at) FROM readings r WHERE r.measurement_id = c.measurement_id AND r.acquired_at > NOW() - INTERVAL '1 day') AS at
       FROM v_measurement_context c WHERE c.machine_id = ANY($1) AND c.origin_id = 'online' ORDER BY c.machine_id, c.sort_order`,
    [ids],
  );
  const rows = latest.rows.map((r) => ({ machineName: nameOfMachine.get(r.machine_id) ?? r.machine_id, name: r.name, at: iso(r.at), fresh: Boolean(r.at) && Date.now() - (r.at as Date).getTime() <= staleAfter * 1000 }));
  const running = await pool.query("SELECT machine_id, mode, since_at FROM machine_operating_states WHERE machine_id = ANY($1)", [ids]);
  const worst = alarms.some((a) => a.severity === "Critical") ? "Critical" : alarms.length ? "Alert" : rows.length ? "Normal" : "No data";
  return {
    scope: filter.machineId ? (nameOfMachine.get(filter.machineId) ?? filter.machineId) : "Whole plant",
    condition: {
      word: worst,
      basis:
        worst === "No data"
          ? "No readings are coming in, so the condition cannot be judged."
          : `The most serious open alarm decides this: ${alarms.length ? `${alarms.length} open (${alarms.filter((a) => a.severity === "Critical").length} critical)` : "none open"}. It does not prove everything else is fine; it only means nothing has crossed a limit or matched a known problem.`,
    },
    alarms,
    data: { fresh: rows.filter((r) => r.fresh).length, total: rows.length, staleAfterS: staleAfter, rows: rows.slice(0, 200) },
    running: running.rows.map((r) => ({ machineName: nameOfMachine.get(r.machine_id) ?? r.machine_id, mode: r.mode, since: (r.since_at as Date).toISOString() })),
  };
}

export async function acknowledgeAlarm(kind: "system" | "manual", id: number, userId: string | null): Promise<void> {
  // A system alarm is an open finding (conditionStrip): acknowledge the finding itself.
  if (kind === "system") await pool.query("INSERT INTO finding_acknowledgements (finding_id, user_id, note) VALUES ($1, $2, $3) ON CONFLICT (finding_id) DO NOTHING", [id, userId, null]);
  else await pool.query("UPDATE manual_alarms SET acked_at = NOW(), acked_by = $2 WHERE id = $1 AND acked_at IS NULL", [id, userId]);
  done();
}

/* ------------------------------------------------------------------ */
/* Guides and maintenance requests                                     */
/* ------------------------------------------------------------------ */

export interface Guide {
  id: string;
  machineId: string;
  machineName: string;
  partId: string | null;
  partName: string | null;
  title: string;
  symptom: string;
  readings: string[];
  checks: string[];
  causes: string[];
}

export async function listGuides(filter: { plantId?: string | null; machineId?: string | null }): Promise<Guide[]> {
  const g = await query(
    `SELECT g.id, g.machine_id, m.name AS machine_name, s.subassembly_id AS part_id, s.name AS part_name, g.title, g.symptom
       FROM investigation_guides g JOIN machines m ON m.id = g.machine_id LEFT JOIN machine_subassemblies s ON s.id = g.subassembly_ref_id
      WHERE ($1::varchar IS NULL OR m.plant_id = $1) AND ($2::varchar IS NULL OR g.machine_id = $2)
      ORDER BY m.name, g.sort_order`,
    [filter.plantId ?? null, filter.machineId ?? null],
  );
  const items = g.rows.length
    ? await query<{ guide_id: string; kind: string; text: string }>("SELECT guide_id, kind, text FROM investigation_guide_items WHERE guide_id = ANY($1) ORDER BY sort_order", [g.rows.map((r) => r.id)])
    : { rows: [] as Array<{ guide_id: string; kind: string; text: string }> };
  return g.rows.map((r) => {
    const mine = items.rows.filter((i) => i.guide_id === r.id);
    return {
      id: r.id,
      machineId: r.machine_id,
      machineName: r.machine_name,
      partId: r.part_id ?? null,
      partName: r.part_name ?? null,
      title: r.title,
      symptom: r.symptom,
      readings: mine.filter((i) => i.kind === "reading").map((i) => i.text),
      checks: mine.filter((i) => i.kind === "check").map((i) => i.text),
      causes: mine.filter((i) => i.kind === "cause").map((i) => i.text),
    };
  });
}

export async function listRequests(filter: { plantId?: string | null }): Promise<Array<CaseRequest & { caseId: number; caseTitle: string; machineName: string; stageWord: string }>> {
  const r = await pool.query(
    `SELECT r.*, w.status AS wo_status, u.full_name AS created_name, c.title AS case_title, c.stage, m.name AS machine_name
       FROM case_requests r JOIN cases c ON c.id = r.case_id JOIN machines m ON m.id = c.machine_id
       LEFT JOIN work_orders w ON w.id = r.work_order_id LEFT JOIN users u ON u.id = r.created_by
      WHERE ($1::varchar IS NULL OR m.plant_id = $1) ORDER BY r.id DESC LIMIT 300`,
    [filter.plantId ?? null],
  );
  const WO_WORD: Record<string, string> = { open: "Waiting to start", in_progress: "Being worked on", done: "Done", cancelled: "Cancelled" };
  return r.rows.map((x) => ({
    id: Number(x.id),
    workType: x.work_type,
    workWord: WORK_WORD[x.work_type as WorkType],
    team: x.team,
    scope: x.scope,
    acceptance: x.acceptance,
    window: x.window_text ?? null,
    resources: x.resources ?? null,
    workOrderId: x.work_order_id === null ? null : Number(x.work_order_id),
    workOrderStatus: x.wo_status ? (WO_WORD[x.wo_status] ?? x.wo_status) : null,
    createdBy: x.created_name ?? null,
    createdAt: (x.created_at as Date).toISOString(),
    caseId: Number(x.case_id),
    caseTitle: x.case_title,
    machineName: x.machine_name,
    stageWord: STAGE_WORD[x.stage as CaseStage],
  }));
}

/** Choices the forms offer, with their plain words. */
export function caseVocabulary() {
  const pairs = <T extends string>(o: Record<T, string>) => (Object.entries(o) as Array<[T, string]>).map(([value, label]) => ({ value, label }));
  return {
    stages: pairs(STAGE_WORD),
    priorities: pairs(PRIORITY_WORD),
    modes: pairs(MODE_WORD),
    assessments: pairs(ASSESSMENT_WORD),
    checks: pairs(CHECK_WORD),
    results: pairs(RESULT_WORD),
    works: pairs(WORK_WORD),
  };
}
