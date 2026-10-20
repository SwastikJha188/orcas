/**
 * Monitoring service: measurements, readings, features, findings,
 * investigations, events, references, operating states and the health index,
 * read from and written to the monitoring core (migrations 001–007).
 */
import pool, { query } from "@/server/db";
import { InputError, NotFoundError } from "@/server/errors";
import { latestReadings, readBuckets, readSeries, writeReadings, type QualityCode, type ReadingIn, type TimeSource } from "@/server/monitoring/readings";
import { loadSettings, setting } from "@/server/monitoring/settings";
import type {
  DataAssessment,
  FeaturesDto,
  FindingDto,
  HealthModelDto,
  MachineConditionDto,
  MachineEventDto,
  MeasurementDto,
  MeasurementLimitDto,
  ReadingBucketDto,
  ReadingPointDto,
  ReferenceSetDto,
  SeverityId,
  SimulationDto,
  WorkOrderPriorityDto,
} from "@/types/monitoring";

const n = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
const iso = (v: Date | string | null | undefined): string | null => (v ? new Date(v).toISOString() : null);
const RANK: Record<SeverityId, number> = { Normal: 0, Alert: 1, Critical: 2 };

async function assertMachine(machineId: string): Promise<void> {
  const res = await query("SELECT 1 FROM machines WHERE id = $1", [machineId]);
  if (!res.rowCount) throw new NotFoundError(`Machine ${machineId} does not exist`);
}

/* ------------------------------------------------------------------ */
/* Health model and bands                                              */
/* ------------------------------------------------------------------ */

export async function listHealthModels(): Promise<HealthModelDto[]> {
  const res = await query<{ id: string; name: string; description: string; key: string | null; value: number | null; pdesc: string | null }>(
    `SELECT h.id, h.name, h.description, p.key, p.value, p.description AS pdesc
       FROM health_models h LEFT JOIN health_model_parameters p ON p.model_id = h.id ORDER BY h.id, p.key`,
  );
  const out = new Map<string, HealthModelDto>();
  for (const r of res.rows) {
    const m = out.get(r.id) ?? { id: r.id, name: r.name, description: r.description, parameters: [], bands: [] };
    if (r.key) m.parameters.push({ key: r.key, value: Number(r.value), description: r.pdesc ?? "" });
    out.set(r.id, m);
  }
  for (const m of out.values()) {
    const p = (k: string) => m.parameters.find((x) => x.key === k)?.value ?? null;
    m.bands = [
      { severity: "Critical", below: p("band_critical") },
      { severity: "Alert", below: p("band_advisory") },
      { severity: "Normal", below: null },
    ];
  }
  return [...out.values()];
}

/** Status a score maps to under a model's bands. */
export function bandStatus(score: number, bands: HealthModelDto["bands"]): SeverityId {
  const crit = bands.find((b) => b.severity === "Critical")?.below;
  const adv = bands.find((b) => b.severity === "Alert")?.below;
  if (crit !== null && crit !== undefined && score < crit) return "Critical";
  if (adv !== null && adv !== undefined && score < adv) return "Alert";
  return "Normal";
}

/* ------------------------------------------------------------------ */
/* Measurements                                                        */
/* ------------------------------------------------------------------ */

const MEASUREMENT_SQL = `
  SELECT c.*, m.instrument_type_id, it.name AS instrument, m.sensor_type, m.acquisition_rate_hz, m.band_lo_hz, m.band_hi_hz, m.window_s,
         m.accuracy, m.priority, m.install_status, m.standard, m.acquisition_text, m.range_text, m.normal_text,
         q.name AS quantity_name, p.diagram_x, p.diagram_y,
         a.rack AS acq_rack, a.card AS acq_card, a.address AS acq_address,
         l.kind_id, lk.name AS kind_name, lk.relative, l.direction, l.warn_value, l.alarm_value, l.warn_lo, l.warn_hi, l.alarm_lo, l.alarm_hi,
         l.warn_pct, l.alarm_pct, l.collapse_pct, l.ratio, l.rise, l.split, pm.tag AS pair_tag, dm.tag AS drive_tag, l.drive_on,
         l.reference_value, l.abs_warn_lo, l.abs_warn_hi, l.abs_alarm_lo, l.abs_alarm_hi, l.rate_per_hour, l.rate_of, l.rate_window,
         l.raise_samples, l.clear_samples, l.basis_normal, l.basis_warning, l.basis_alarm, l.source AS limit_source, l.note AS limit_note,
         l.approval, au.full_name AS approved_by, l.approved_at
    FROM v_measurement_context c
    JOIN measurements m ON m.id = c.measurement_id
    JOIN quantities q ON q.id = m.quantity_id
    JOIN measurement_points p ON p.id = m.point_id
    LEFT JOIN instrument_types it ON it.id = m.instrument_type_id
    LEFT JOIN measurement_acquisition a ON a.measurement_id = m.id
    LEFT JOIN measurement_limits l ON l.measurement_id = m.id
    LEFT JOIN limit_kinds lk ON lk.id = l.kind_id
    LEFT JOIN measurements pm ON pm.id = l.pair_measurement_id
    LEFT JOIN measurements dm ON dm.id = l.drive_measurement_id
    LEFT JOIN users au ON au.id = l.approved_by_user_id`;

function limitDto(r: Record<string, unknown>): MeasurementLimitDto | null {
  if (!r.kind_id) return null;
  return {
    kind: String(r.kind_id),
    kindName: String(r.kind_name),
    relative: Boolean(r.relative),
    direction: (r.direction as MeasurementLimitDto["direction"]) ?? null,
    warnValue: n(r.warn_value),
    alarmValue: n(r.alarm_value),
    warnLo: n(r.warn_lo),
    warnHi: n(r.warn_hi),
    alarmLo: n(r.alarm_lo),
    alarmHi: n(r.alarm_hi),
    warnPct: n(r.warn_pct),
    alarmPct: n(r.alarm_pct),
    collapsePct: n(r.collapse_pct),
    ratio: n(r.ratio),
    rise: n(r.rise),
    split: n(r.split),
    pairTag: (r.pair_tag as string) ?? null,
    driveTag: (r.drive_tag as string) ?? null,
    driveOn: n(r.drive_on),
    referenceValue: n(r.reference_value),
    absWarnLo: n(r.abs_warn_lo),
    absWarnHi: n(r.abs_warn_hi),
    absAlarmLo: n(r.abs_alarm_lo),
    absAlarmHi: n(r.abs_alarm_hi),
    ratePerHour: n(r.rate_per_hour),
    rateOf: (r.rate_of as MeasurementLimitDto["rateOf"]) ?? null,
    rateWindow: n(r.rate_window),
    raiseSamples: Number(r.raise_samples),
    clearSamples: Number(r.clear_samples),
    basisNormal: (r.basis_normal as string) ?? null,
    basisWarning: (r.basis_warning as string) ?? null,
    basisAlarm: (r.basis_alarm as string) ?? null,
    source: (r.limit_source as string) ?? null,
    note: (r.limit_note as string) ?? null,
    approval: r.approval as MeasurementLimitDto["approval"],
    approvedBy: (r.approved_by as string) ?? null,
    approvedAt: iso(r.approved_at as Date | null),
  };
}

/** Current operating state per machine (open state period). */
async function currentStates(machineIds: string[]): Promise<Map<string, { id: number; code: string; name: string; running: boolean; since: string }>> {
  const res = await query<{ machine_id: string; id: number; code: string; name: string; running: boolean; started_at: Date }>(
    `SELECT p.machine_id, s.id, s.code, s.name, s.running, p.started_at
       FROM machine_state_periods p JOIN operating_states s ON s.id = p.state_id
      WHERE p.ended_at IS NULL AND p.machine_id = ANY($1)`,
    [machineIds],
  );
  return new Map(res.rows.map((r) => [r.machine_id, { id: r.id, code: r.code, name: r.name, running: r.running, since: r.started_at.toISOString() }]));
}

/** Accepted reference values that apply to each machine's current state. */
async function currentReferences(machineIds: string[]): Promise<Map<string, { setId: number; setName: string; expected: number | null; lo: number | null; hi: number | null }>> {
  const res = await query<{ measurement_id: string; id: number; name: string; expected: number | null; lo: number | null; hi: number | null }>(
    `SELECT DISTINCT ON (v.measurement_id) v.measurement_id, s.id, s.name, v.expected, v.lo, v.hi
       FROM reference_sets s
       JOIN reference_values v ON v.reference_set_id = s.id
       LEFT JOIN machine_state_periods p ON p.machine_id = s.machine_id AND p.ended_at IS NULL
      WHERE s.status = 'accepted' AND s.machine_id = ANY($1) AND (s.state_id IS NULL OR s.state_id = p.state_id)
      ORDER BY v.measurement_id, (s.state_id IS NULL)`,
    [machineIds],
  );
  return new Map(res.rows.map((r) => [r.measurement_id, { setId: r.id, setName: r.name, expected: n(r.expected), lo: n(r.lo), hi: n(r.hi) }]));
}

export async function listMeasurements(filter: { machineId?: string; plantId?: string; ids?: string[] }): Promise<MeasurementDto[]> {
  if (filter.machineId) await assertMachine(filter.machineId);
  const res = await query<Record<string, unknown>>(
    `${MEASUREMENT_SQL}
      WHERE ($1::varchar IS NULL OR c.machine_id = $1) AND ($2::varchar IS NULL OR c.plant_id = $2) AND ($3::varchar[] IS NULL OR c.measurement_id = ANY($3))
      ORDER BY c.machine_id, c.sort_order, c.tag`,
    [filter.machineId ?? null, filter.plantId ?? null, filter.ids ?? null],
  );
  if (!res.rows.length) return [];
  const machineIds = [...new Set(res.rows.map((r) => String(r.machine_id)))];
  const ids = res.rows.map((r) => String(r.measurement_id));
  const [states, latest, refs, open, settings] = await Promise.all([
    query<{ measurement_id: string; state: string; severity_id: SeverityId }>("SELECT measurement_id, state, severity_id FROM measurement_states WHERE measurement_id = ANY($1) ORDER BY sort_order", [ids]),
    latestReadings({ measurementIds: ids }),
    currentReferences(machineIds),
    query<{ measurement_id: string; severity_id: SeverityId }>(
      "SELECT measurement_id, severity_id FROM findings WHERE cleared_at IS NULL AND finding_type_id = 'limit_exceeded' AND measurement_id = ANY($1)",
      [ids],
    ),
    loadSettings(),
  ]);
  const statesBy = new Map<string, Array<{ state: string; severity: SeverityId }>>();
  for (const s of states.rows) (statesBy.get(s.measurement_id) ?? statesBy.set(s.measurement_id, []).get(s.measurement_id)!).push({ state: s.state, severity: s.severity_id });
  const sevBy = new Map<string, SeverityId>();
  for (const f of open.rows) if (RANK[f.severity_id] > RANK[sevBy.get(f.measurement_id) ?? "Normal"]) sevBy.set(f.measurement_id, f.severity_id);
  const publishS = settings.get("readings.publish_period_s") ?? null;
  const staleFactor = settings.get("readings.stale_factor") ?? null;
  const now = Date.now();
  return res.rows.map((r) => {
    const id = String(r.measurement_id);
    const l = latest.get(id);
    const period = Math.max(n(r.publish_period_s) ?? 0, publishS ?? 0);
    const staleAfter = n(r.stale_after_s) ?? (staleFactor !== null && period ? period * staleFactor : null);
    const ageS = l ? Math.max(0, Math.round((now - Date.parse(l.acquiredAt)) / 1000)) : null;
    const usable = l ? l.quality === "GOOD" || l.quality === "UNCERTAIN" : false;
    const assessment: DataAssessment = !l ? "missing" : staleAfter !== null && ageS! > staleAfter ? "stale" : !usable ? "unreliable" : "valid";
    return {
      id,
      tag: String(r.tag),
      name: String(r.name),
      machineId: String(r.machine_id),
      plantId: String(r.plant_id),
      system: { id: String(r.system_id), code: String(r.system_code), name: String(r.system_name) },
      subassembly: { id: String(r.subassembly_id), code: String(r.subassembly_code), name: String(r.subassembly_name) },
      point: { id: Number(r.point_id), code: String(r.point_code), location: (r.point_location as string) ?? null, x: n(r.diagram_x), y: n(r.diagram_y) },
      quantity: { id: String(r.quantity_id), name: String(r.quantity_name) },
      unit: (r.unit as string) ?? null,
      statistic: String(r.statistic_id),
      direction: String(r.direction_id),
      origin: r.origin_id as MeasurementDto["origin"],
      valueKind: r.value_kind as MeasurementDto["valueKind"],
      instrument: (r.instrument as string) ?? null,
      sensorType: (r.sensor_type as string) ?? null,
      decimals: Number(r.decimals),
      acquisitionRateHz: n(r.acquisition_rate_hz),
      publishPeriodS: n(r.publish_period_s),
      staleAfterS: staleAfter,
      bandLoHz: n(r.band_lo_hz),
      bandHiHz: n(r.band_hi_hz),
      windowS: n(r.window_s),
      rangeLo: n(r.range_lo),
      rangeHi: n(r.range_hi),
      accuracy: (r.accuracy as string) ?? null,
      noiseSigma: n(r.noise_sigma),
      priority: (r.priority as string) ?? null,
      installStatus: (r.install_status as string) ?? null,
      standard: (r.standard as string) ?? null,
      acquisitionText: (r.acquisition_text as string) ?? null,
      rangeText: (r.range_text as string) ?? null,
      normalText: (r.normal_text as string) ?? null,
      acquisition: r.acq_rack ? { rack: String(r.acq_rack), card: String(r.acq_card), address: (r.acq_address as string) ?? null } : null,
      states: statesBy.get(id) ?? [],
      limit: limitDto(r),
      reference: refs.get(id) ?? null,
      latest: l ? { ...l, ageS: ageS! } : null,
      assessment,
      severity: sevBy.get(id) ?? "Normal",
      sortOrder: Number(r.sort_order),
    };
  });
}

export async function getMeasurement(id: string): Promise<MeasurementDto> {
  const [m] = await listMeasurements({ ids: [id] });
  if (!m) throw new NotFoundError(`Measurement ${id} does not exist`);
  return m;
}

/* ------------------------------------------------------------------ */
/* Readings and features                                               */
/* ------------------------------------------------------------------ */

export async function measurementReadings(id: string, from: Date, to: Date, bucketS: number | null): Promise<ReadingPointDto[] | ReadingBucketDto[]> {
  const exists = await query("SELECT 1 FROM measurements WHERE id = $1", [id]);
  if (!exists.rowCount) throw new NotFoundError(`Measurement ${id} does not exist`);
  if (from >= to) throw new InputError("`from` must be before `to`");
  return bucketS && bucketS > 0 ? readBuckets(id, from, to, bucketS) : readSeries(id, from, to);
}

/** Window features (Purpose step 6) calculated from the stored usable readings. */
export async function measurementFeatures(id: string, from: Date, to: Date): Promise<FeaturesDto> {
  if (from >= to) throw new InputError("`from` must be before `to`");
  const res = await pool.query<Record<string, unknown>>(
    `WITH w AS (
       SELECT r.acquired_at, r.value, q.usable FROM readings r JOIN quality_codes q ON q.id = r.quality_id
        WHERE r.measurement_id = $1 AND r.acquired_at BETWEEN $2 AND $3
     ), u AS (SELECT * FROM w WHERE usable AND value IS NOT NULL)
     SELECT (SELECT COUNT(*) FROM w) AS samples, COUNT(*) AS usable,
            MIN(value) AS min, MAX(value) AS max, AVG(value) AS mean, STDDEV_SAMP(value) AS sd,
            SQRT(AVG(value * value)) AS rms, MAX(ABS(value)) AS peak,
            (ARRAY_AGG(value ORDER BY acquired_at))[1] AS first,
            (ARRAY_AGG(value ORDER BY acquired_at DESC))[1] AS latest,
            regr_slope(value, extract(epoch FROM acquired_at)) * 3600 AS rate
       FROM u`,
    [id, from, to],
  );
  const exists = await query("SELECT 1 FROM measurements WHERE id = $1", [id]);
  if (!exists.rowCount) throw new NotFoundError(`Measurement ${id} does not exist`);
  const r = res.rows[0];
  const first = n(r.first);
  const latest = n(r.latest);
  const rms = n(r.rms);
  const peak = n(r.peak);
  const min = n(r.min);
  const max = n(r.max);
  return {
    measurementId: id,
    from: from.toISOString(),
    to: to.toISOString(),
    samples: Number(r.samples),
    usable: Number(r.usable),
    latest,
    first,
    min,
    max,
    mean: n(r.mean),
    stdDev: n(r.sd),
    rms,
    peak,
    peakToPeak: min !== null && max !== null ? max - min : null,
    crestFactor: rms && peak !== null ? peak / rms : null,
    change: first !== null && latest !== null ? latest - first : null,
    changePct: first !== null && latest !== null && first !== 0 ? ((latest - first) / Math.abs(first)) * 100 : null,
    ratePerHour: n(r.rate),
  };
}

/**
 * Stores readings sent by a gateway, a laboratory or a person. A measurement
 * is named by id, or by machine and tag. The acquisition time is required for
 * device-timed readings; without one the receipt time is used and marked so.
 */
export async function ingestReadings(
  rows: Array<{ measurementId?: string; machineId?: string; tag?: string; acquiredAt?: string | number; value?: number | null; state?: string | null; quality?: string }>,
): Promise<{ accepted: number; written: number; rejected: Array<{ index: number; reason: string }> }> {
  if (!Array.isArray(rows) || !rows.length) throw new InputError("Send a non-empty array of readings");
  if (rows.length > 10_000) throw new InputError("At most 10 000 readings per request");
  const pairs = rows.filter((r) => !r.measurementId && r.machineId && r.tag).map((r) => `${r.machineId}|${r.tag}`);
  const lookup = new Map<string, string>();
  if (pairs.length) {
    const res = await query<{ machine_id: string; tag: string; measurement_id: string }>(
      "SELECT machine_id, tag, measurement_id FROM v_measurement_context WHERE (machine_id || '|' || tag) = ANY($1)",
      [[...new Set(pairs)]],
    );
    for (const r of res.rows) lookup.set(`${r.machine_id}|${r.tag}`, r.measurement_id);
  }
  const codes = new Set((await query<{ id: string }>("SELECT id FROM quality_codes")).rows.map((q) => q.id));
  const rejected: Array<{ index: number; reason: string }> = [];
  const out: ReadingIn[] = [];
  const now = Date.now();
  rows.forEach((r, index) => {
    const id = r.measurementId ?? lookup.get(`${r.machineId}|${r.tag}`);
    if (!id) return void rejected.push({ index, reason: "unknown measurement" });
    const quality = (r.quality ?? "GOOD").toUpperCase();
    if (!codes.has(quality)) return void rejected.push({ index, reason: `unknown quality ${quality}` });
    const hasValue = typeof r.value === "number" && Number.isFinite(r.value);
    const hasState = typeof r.state === "string" && r.state.length > 0;
    if (hasValue === hasState && quality !== "MISSING") return void rejected.push({ index, reason: "send exactly one of value or state" });
    let t = now;
    let timeSource: TimeSource = "server";
    if (r.acquiredAt !== undefined) {
      t = typeof r.acquiredAt === "number" ? r.acquiredAt : Date.parse(r.acquiredAt);
      if (!Number.isFinite(t)) return void rejected.push({ index, reason: "invalid acquiredAt" });
      if (t > now + 5 * 60_000) return void rejected.push({ index, reason: "acquiredAt is in the future" });
      timeSource = "device";
    }
    out.push({ measurementId: id, acquiredAt: t, value: hasValue ? r.value! : null, state: hasState ? r.state! : null, quality: quality as QualityCode, timeSource });
  });
  const written = out.length ? await writeReadings(out) : 0;
  return { accepted: out.length, written, rejected };
}

/* ------------------------------------------------------------------ */
/* Limits                                                              */
/* ------------------------------------------------------------------ */

const LIMIT_FIELDS: Record<string, string> = {
  warnValue: "warn_value",
  alarmValue: "alarm_value",
  warnLo: "warn_lo",
  warnHi: "warn_hi",
  alarmLo: "alarm_lo",
  alarmHi: "alarm_hi",
  warnPct: "warn_pct",
  alarmPct: "alarm_pct",
  collapsePct: "collapse_pct",
  ratio: "ratio",
  rise: "rise",
  split: "split",
  driveOn: "drive_on",
  referenceValue: "reference_value",
  absWarnLo: "abs_warn_lo",
  absWarnHi: "abs_warn_hi",
  absAlarmLo: "abs_alarm_lo",
  absAlarmHi: "abs_alarm_hi",
  ratePerHour: "rate_per_hour",
  rateWindow: "rate_window",
  raiseSamples: "raise_samples",
  clearSamples: "clear_samples",
};
const LIMIT_TEXT: Record<string, string> = { basisNormal: "basis_normal", basisWarning: "basis_warning", basisAlarm: "basis_alarm", source: "source", note: "note" };

/**
 * Changes a measurement's limit. Approval records who approved it and when;
 * any change returns a provisional limit to provisional unless it is approved
 * in the same request. A measurement-setting event is recorded.
 */
export async function updateMeasurementLimit(
  measurementId: string,
  patch: Record<string, unknown>,
  userId: string | null,
): Promise<MeasurementDto> {
  const m = await getMeasurement(measurementId);
  const sets: string[] = [];
  const vals: unknown[] = [measurementId];
  const push = (col: string, v: unknown) => {
    vals.push(v);
    sets.push(`${col} = $${vals.length}`);
  };
  if (patch.kind !== undefined) {
    const kinds = new Set((await query<{ id: string }>("SELECT id FROM limit_kinds")).rows.map((k) => k.id));
    if (!kinds.has(String(patch.kind))) throw new InputError(`Unknown limit kind ${String(patch.kind)}`);
    push("kind_id", String(patch.kind));
  }
  if (patch.direction !== undefined) {
    if (patch.direction !== null && !["hi", "lo", "both"].includes(String(patch.direction))) throw new InputError("direction must be hi, lo or both");
    push("direction", patch.direction);
  }
  for (const [k, col] of Object.entries(LIMIT_FIELDS)) {
    if (patch[k] === undefined) continue;
    const v = patch[k];
    if (v !== null && (typeof v !== "number" || !Number.isFinite(v))) throw new InputError(`${k} must be a number or null`);
    if ((k === "raiseSamples" || k === "clearSamples") && (v === null || (v as number) < 1)) throw new InputError(`${k} must be at least 1`);
    push(col, v);
  }
  for (const [k, col] of Object.entries(LIMIT_TEXT)) if (patch[k] !== undefined) push(col, patch[k] === null ? null : String(patch[k]));
  if (patch.approval !== undefined) {
    if (patch.approval !== "approved" && patch.approval !== "provisional") throw new InputError("approval must be approved or provisional");
    push("approval", patch.approval);
    push("approved_by_user_id", patch.approval === "approved" ? userId : null);
    sets.push(patch.approval === "approved" ? "approved_at = NOW()" : "approved_at = NULL");
  } else if (sets.length) {
    sets.push("approval = 'provisional'", "approved_by_user_id = NULL", "approved_at = NULL");
  }
  if (!sets.length) throw new InputError("Nothing to change");
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    if (!m.limit) {
      if (patch.kind === undefined) throw new InputError("A new limit needs a kind");
      await c.query("INSERT INTO measurement_limits (measurement_id, kind_id) VALUES ($1, $2)", [measurementId, String(patch.kind)]);
    }
    await c.query(`UPDATE measurement_limits SET ${sets.join(", ")}, updated_at = NOW() WHERE measurement_id = $1`, vals);
    await c.query(
      `INSERT INTO machine_events (machine_id, event_type_id, occurred_at, severity_id, measurement_id, title, description, source, actor_user_id)
       VALUES ($1, 'measurement_change', NOW(), 'Normal', $2, $3, $4, 'Limit editor', $5)`,
      [m.machineId, measurementId, `Limit changed: ${m.tag}`, `Changed: ${Object.keys(patch).join(", ")}`, userId],
    );
    await c.query("COMMIT");
  } catch (err) {
    await c.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    c.release();
  }
  return getMeasurement(measurementId);
}

/* ------------------------------------------------------------------ */
/* Machine condition and health                                        */
/* ------------------------------------------------------------------ */

export async function machineCondition(machineId: string): Promise<MachineConditionDto> {
  await assertMachine(machineId);
  const [states, health, subs, findings, measurements, models] = await Promise.all([
    currentStates([machineId]),
    query<{ score: number; scored_at: Date; model: string | null }>(
      `SELECT s.score, s.scored_at, m.health_model_id AS model FROM machines m
         LEFT JOIN LATERAL (SELECT score, scored_at FROM machine_health_scores WHERE machine_id = m.id ORDER BY scored_at DESC LIMIT 1) s ON TRUE
        WHERE m.id = $1`,
      [machineId],
    ),
    query<{ id: string; code: string; name: string; system: string; score: number | null }>(
      `SELECT sa.id, sa.subassembly_id AS code, sa.name, sy.name AS system, hs.score
         FROM machine_subassemblies sa
         JOIN machine_systems sy ON sy.id = sa.machine_system_ref_id
         LEFT JOIN LATERAL (SELECT score FROM subassembly_health_scores WHERE subassembly_id = sa.id ORDER BY scored_at DESC LIMIT 1) hs ON TRUE
        WHERE sy.machine_id = $1
        ORDER BY sy.sort_order, sa.sort_order`,
      [machineId],
    ),
    query<{ severity_id: SeverityId; acked: boolean }>(
      `SELECT f.severity_id, (a.finding_id IS NOT NULL) AS acked FROM findings f LEFT JOIN finding_acknowledgements a ON a.finding_id = f.id
        WHERE f.machine_id = $1 AND f.cleared_at IS NULL`,
      [machineId],
    ),
    listMeasurements({ machineId }),
    listHealthModels(),
  ]);
  const h = health.rows[0];
  const model = models.find((x) => x.id === h?.model);
  const assess = (a: DataAssessment) => measurements.filter((m) => m.origin !== "manual" && m.assessment === a).length;
  const last = measurements.map((m) => m.latest?.acquiredAt).filter(Boolean).sort().at(-1) ?? null;
  return {
    machineId,
    operatingState: states.get(machineId) ?? null,
    health: h && h.score !== null && h.scored_at && model ? { score: Number(h.score), status: bandStatus(Number(h.score), model.bands), at: h.scored_at.toISOString(), model: model.id } : null,
    subassemblies: subs.rows.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      system: s.system,
      score: n(s.score),
      status: s.score !== null && model ? bandStatus(Number(s.score), model.bands) : null,
    })),
    findings: {
      open: findings.rows.length,
      critical: findings.rows.filter((f) => f.severity_id === "Critical").length,
      advisory: findings.rows.filter((f) => f.severity_id === "Alert").length,
      unacknowledged: findings.rows.filter((f) => !f.acked && f.severity_id !== "Normal").length,
    },
    data: {
      measurements: measurements.filter((m) => m.origin !== "manual").length,
      valid: assess("valid"),
      stale: assess("stale"),
      missing: assess("missing"),
      unreliable: assess("unreliable"),
      lastReadingAt: last,
    },
  };
}

export async function machineHealthHistory(machineId: string, from: Date): Promise<Array<{ t: string; score: number }>> {
  await assertMachine(machineId);
  const res = await pool.query<{ scored_at: Date; score: number }>(
    "SELECT scored_at, score FROM machine_health_scores WHERE machine_id = $1 AND scored_at >= $2 ORDER BY scored_at",
    [machineId, from],
  );
  return res.rows.map((r) => ({ t: r.scored_at.toISOString(), score: Number(r.score) }));
}

/* ------------------------------------------------------------------ */
/* Findings and investigations                                         */
/* ------------------------------------------------------------------ */

export async function listFindings(filter: { machineId?: string; plantId?: string; status?: "open" | "cleared" | "all"; since?: Date | null; limit?: number; ids?: number[] }): Promise<FindingDto[]> {
  const res = await query<Record<string, unknown>>(
    `SELECT f.*, ft.name AS type_name, m.tag, m.name AS m_name, u.symbol AS unit,
            r.code AS rule_code, r.name AS rule_name, r.category_id AS rule_category, r.action AS rule_action,
            r.plain_title AS rule_plain_title, r.plain_what AS rule_plain_what, r.plain_todo AS rule_plain_todo,
            os.name AS state_name, rs.name AS ref_name,
            a.acknowledged_at, a.note AS ack_note, au.full_name AS ack_by
       FROM findings f
       JOIN finding_types ft ON ft.id = f.finding_type_id
       JOIN machines mc ON mc.id = f.machine_id
       LEFT JOIN measurements m ON m.id = f.measurement_id
       LEFT JOIN units u ON u.id = m.unit_id
       LEFT JOIN rules r ON r.id = f.rule_id
       LEFT JOIN operating_states os ON os.id = f.state_id
       LEFT JOIN reference_sets rs ON rs.id = f.reference_set_id
       LEFT JOIN finding_acknowledgements a ON a.finding_id = f.id
       LEFT JOIN users au ON au.id = a.user_id
      WHERE ($1::varchar IS NULL OR f.machine_id = $1)
        AND ($2::varchar IS NULL OR mc.plant_id = $2)
        AND ($3 = 'all' OR ($3 = 'open' AND f.cleared_at IS NULL) OR ($3 = 'cleared' AND f.cleared_at IS NOT NULL))
        AND ($4::timestamptz IS NULL OR COALESCE(f.cleared_at, 'infinity') >= $4)
        AND ($6::bigint[] IS NULL OR f.id = ANY($6))
      ORDER BY (f.cleared_at IS NULL) DESC, f.opened_at DESC
      LIMIT $5`,
    [filter.machineId ?? null, filter.plantId ?? null, filter.status ?? "open", filter.since ?? null, Math.min(filter.limit ?? 200, 1000), filter.ids ?? null],
  );
  const ids = res.rows.map((r) => Number(r.id));
  const entries = ids.length
    ? await query<{ id: number; finding_id: number; kind: string; body: string; work_order_id: number | null; recorded_at: Date; by: string | null }>(
        `SELECT e.id, e.finding_id, e.kind, e.body, e.work_order_id, e.recorded_at, u.full_name AS by
           FROM investigation_entries e LEFT JOIN users u ON u.id = e.recorded_by_user_id
          WHERE e.finding_id = ANY($1) ORDER BY e.recorded_at`,
        [ids],
      )
    : { rows: [] };
  const byFinding = new Map<number, FindingDto["entries"]>();
  for (const e of entries.rows) {
    (byFinding.get(Number(e.finding_id)) ?? byFinding.set(Number(e.finding_id), []).get(Number(e.finding_id))!).push({
      id: Number(e.id),
      kind: e.kind,
      body: e.body,
      by: e.by,
      at: e.recorded_at.toISOString(),
      workOrderId: e.work_order_id,
    });
  }
  return res.rows.map((r) => ({
    id: Number(r.id),
    machineId: String(r.machine_id),
    type: String(r.finding_type_id),
    typeName: String(r.type_name),
    severity: r.severity_id as SeverityId,
    measurement: r.measurement_id ? { id: String(r.measurement_id), tag: String(r.tag), name: String(r.m_name), unit: (r.unit as string) ?? null } : null,
    rule: r.rule_id
      ? {
          id: Number(r.rule_id),
          code: String(r.rule_code),
          name: String(r.rule_name),
          category: String(r.rule_category),
          action: String(r.rule_action),
          plainTitle: r.rule_plain_title == null ? null : String(r.rule_plain_title),
          plainWhat: r.rule_plain_what == null ? null : String(r.rule_plain_what),
          plainTodo: r.rule_plain_todo == null ? null : String(r.rule_plain_todo),
        }
      : null,
    operatingState: (r.state_name as string) ?? null,
    reference: (r.ref_name as string) ?? null,
    observed: n(r.observed_value),
    expected: n(r.expected_value),
    expectedLo: n(r.expected_lo),
    expectedHi: n(r.expected_hi),
    limitValue: n(r.limit_value),
    change: n(r.change_value),
    changeWindowS: n(r.change_window_s),
    dataAssessment: r.data_assessment as DataAssessment,
    causeStatus: r.cause_status as FindingDto["causeStatus"],
    summary: String(r.summary),
    openedAt: iso(r.opened_at as Date)!,
    lastEvaluatedAt: iso(r.last_evaluated_at as Date)!,
    clearedAt: iso(r.cleared_at as Date | null),
    acknowledgement: r.acknowledged_at ? { by: (r.ack_by as string) ?? null, at: iso(r.acknowledged_at as Date)!, note: (r.ack_note as string) ?? null } : null,
    entries: byFinding.get(Number(r.id)) ?? [],
  }));
}

async function getFinding(id: number): Promise<FindingDto> {
  const [f] = await listFindings({ ids: [id], status: "all", limit: 1 });
  if (!f) throw new NotFoundError(`Finding ${id} does not exist`);
  return f;
}

/** Acknowledgement records that someone has seen the finding; it resolves nothing. */
export async function acknowledgeFinding(id: number, userId: string | null, note: string | null): Promise<FindingDto> {
  await getFinding(id);
  await query(
    `INSERT INTO finding_acknowledgements (finding_id, user_id, note) VALUES ($1, $2, $3)
     ON CONFLICT (finding_id) DO NOTHING`,
    [id, userId, note],
  );
  return getFinding(id);
}

const ENTRY_KINDS = ["observation", "inspection", "confirmed_cause", "corrective_action", "verification", "note"] as const;

/**
 * Adds to a finding's investigation record. "confirmed_cause" marks the cause
 * confirmed; "observation" with suspected=true marks it suspected.
 */
export async function addInvestigationEntry(
  id: number,
  input: { kind?: string; body?: string; workOrderId?: number | null; suspected?: boolean },
  userId: string | null,
): Promise<FindingDto> {
  const f = await getFinding(id);
  if (!input.kind || !(ENTRY_KINDS as readonly string[]).includes(input.kind)) throw new InputError(`kind must be one of ${ENTRY_KINDS.join(", ")}`);
  const body = input.body?.trim();
  if (!body) throw new InputError("body is required");
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query(
      "INSERT INTO investigation_entries (finding_id, kind, body, work_order_id, recorded_by_user_id) VALUES ($1, $2, $3, $4, $5)",
      [id, input.kind, body, input.workOrderId ?? null, userId],
    );
    if (input.kind === "confirmed_cause") await c.query("UPDATE findings SET cause_status = 'confirmed' WHERE id = $1", [id]);
    else if (input.suspected && f.causeStatus === "not_established") await c.query("UPDATE findings SET cause_status = 'suspected' WHERE id = $1", [id]);
    if (input.kind === "inspection" || input.kind === "corrective_action" || input.kind === "verification") {
      await c.query(
        `INSERT INTO machine_events (machine_id, event_type_id, occurred_at, severity_id, measurement_id, title, description, source, actor_user_id)
         VALUES ($1, $2, NOW(), 'Normal', $3, $4, $5, 'Investigation', $6)`,
        [f.machineId, input.kind === "inspection" ? "inspection" : "maintenance", f.measurement?.id ?? null, `${input.kind.replace("_", " ")}: ${f.typeName}`, body, userId],
      );
    }
    await c.query("COMMIT");
  } catch (err) {
    await c.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    c.release();
  }
  return getFinding(id);
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

export async function listEvents(filter: { machineId?: string; plantId?: string; from?: Date | null; limit?: number }): Promise<MachineEventDto[]> {
  const res = await query<Record<string, unknown>>(
    `SELECT e.*, t.name AS type_name, t.category, m.tag, u.full_name AS actor
       FROM machine_events e
       JOIN event_types t ON t.id = e.event_type_id
       JOIN machines mc ON mc.id = e.machine_id
       LEFT JOIN measurements m ON m.id = e.measurement_id
       LEFT JOIN users u ON u.id = e.actor_user_id
      WHERE ($1::varchar IS NULL OR e.machine_id = $1) AND ($2::varchar IS NULL OR mc.plant_id = $2)
        AND ($3::timestamptz IS NULL OR e.occurred_at >= $3)
      ORDER BY e.occurred_at DESC, e.id DESC LIMIT $4`,
    [filter.machineId ?? null, filter.plantId ?? null, filter.from ?? null, Math.min(filter.limit ?? 200, 2000)],
  );
  return res.rows.map((r) => ({
    id: Number(r.id),
    machineId: String(r.machine_id),
    type: String(r.event_type_id),
    typeName: String(r.type_name),
    category: String(r.category),
    occurredAt: iso(r.occurred_at as Date)!,
    severity: r.severity_id as SeverityId,
    measurementTag: (r.tag as string) ?? null,
    title: String(r.title),
    description: (r.description as string) ?? null,
    source: String(r.source),
    actor: (r.actor as string) ?? null,
  }));
}

export async function createEvent(
  machineId: string,
  input: { type?: string; occurredAt?: string; severity?: string; title?: string; description?: string | null; measurementId?: string | null; source?: string },
  userId: string | null,
): Promise<MachineEventDto> {
  await assertMachine(machineId);
  const types = new Set((await query<{ id: string }>("SELECT id FROM event_types")).rows.map((t) => t.id));
  if (!input.type || !types.has(input.type)) throw new InputError(`type must be one of ${[...types].join(", ")}`);
  if (!input.title?.trim()) throw new InputError("title is required");
  const severity = input.severity ?? "Normal";
  if (!["Normal", "Alert", "Critical"].includes(severity)) throw new InputError("severity must be Normal, Alert or Critical");
  const at = input.occurredAt ? new Date(input.occurredAt) : new Date();
  if (Number.isNaN(at.getTime())) throw new InputError("occurredAt is not a valid time");
  if (input.measurementId) {
    const ok = await query("SELECT 1 FROM v_measurement_context WHERE measurement_id = $1 AND machine_id = $2", [input.measurementId, machineId]);
    if (!ok.rowCount) throw new InputError("measurementId does not belong to this machine");
  }
  const res = await query<{ id: number }>(
    `INSERT INTO machine_events (machine_id, event_type_id, occurred_at, severity_id, measurement_id, title, description, source, actor_user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [machineId, input.type, at, severity, input.measurementId ?? null, input.title.trim().slice(0, 255), input.description ?? null, input.source?.trim() || "Operator log", userId],
  );
  const [e] = (await listEvents({ machineId, limit: 50 })).filter((x) => x.id === Number(res.rows[0].id));
  return e;
}

/* ------------------------------------------------------------------ */
/* Operating states and references                                     */
/* ------------------------------------------------------------------ */

export async function listOperatingStates(machineId: string) {
  await assertMachine(machineId);
  const res = await query<{ id: number; code: string; name: string; running: boolean; priority: number; description: string | null; measurement_id: string | null; tag: string | null; min_value: number | null; max_value: number | null }>(
    `SELECT s.id, s.code, s.name, s.running, s.priority, s.description, c.measurement_id, m.tag, c.min_value, c.max_value
       FROM operating_states s
       LEFT JOIN operating_state_criteria c ON c.state_id = s.id
       LEFT JOIN measurements m ON m.id = c.measurement_id
      WHERE s.machine_id = $1 ORDER BY s.priority, s.id`,
    [machineId],
  );
  const out: Array<{ id: number; code: string; name: string; running: boolean; priority: number; description: string | null; criteria: Array<{ measurementId: string; tag: string; min: number | null; max: number | null }> }> = [];
  for (const r of res.rows) {
    let s = out.find((x) => x.id === r.id);
    if (!s) out.push((s = { id: r.id, code: r.code, name: r.name, running: r.running, priority: r.priority, description: r.description, criteria: [] }));
    if (r.measurement_id) s.criteria.push({ measurementId: r.measurement_id, tag: r.tag!, min: n(r.min_value), max: n(r.max_value) });
  }
  const periods = await query<{ state_id: number; started_at: Date; ended_at: Date | null }>(
    "SELECT state_id, started_at, ended_at FROM machine_state_periods WHERE machine_id = $1 ORDER BY started_at DESC LIMIT 100",
    [machineId],
  );
  return { states: out, periods: periods.rows.map((p) => ({ stateId: p.state_id, startedAt: p.started_at.toISOString(), endedAt: iso(p.ended_at) })) };
}

export async function listReferenceSets(machineId: string): Promise<ReferenceSetDto[]> {
  await assertMachine(machineId);
  const res = await query<Record<string, unknown>>(
    `SELECT s.*, os.code AS state_code, os.name AS state_name, cu.full_name AS created_by, au.full_name AS accepted_by
       FROM reference_sets s
       LEFT JOIN operating_states os ON os.id = s.state_id
       LEFT JOIN users cu ON cu.id = s.created_by_user_id
       LEFT JOIN users au ON au.id = s.accepted_by_user_id
      WHERE s.machine_id = $1 ORDER BY (s.status = 'accepted') DESC, s.created_at DESC`,
    [machineId],
  );
  const ids = res.rows.map((r) => Number(r.id));
  const values = ids.length
    ? await query<{ reference_set_id: number; measurement_id: string; tag: string; expected: number | null; lo: number | null; hi: number | null; sample_count: number | null }>(
        `SELECT v.reference_set_id, v.measurement_id, m.tag, v.expected, v.lo, v.hi, v.sample_count
           FROM reference_values v JOIN measurements m ON m.id = v.measurement_id
          WHERE v.reference_set_id = ANY($1) ORDER BY m.sort_order`,
        [ids],
      )
    : { rows: [] };
  return res.rows.map((r) => ({
    id: Number(r.id),
    machineId,
    state: r.state_id ? { id: Number(r.state_id), code: String(r.state_code), name: String(r.state_name) } : null,
    name: String(r.name),
    status: r.status as ReferenceSetDto["status"],
    basis: String(r.basis),
    windowFrom: iso(r.window_from as Date | null),
    windowTo: iso(r.window_to as Date | null),
    createdBy: (r.created_by as string) ?? null,
    createdAt: iso(r.created_at as Date)!,
    acceptedBy: (r.accepted_by as string) ?? null,
    acceptedAt: iso(r.accepted_at as Date | null),
    values: values.rows
      .filter((v) => Number(v.reference_set_id) === Number(r.id))
      .map((v) => ({ measurementId: v.measurement_id, tag: v.tag, expected: n(v.expected), lo: n(v.lo), hi: n(v.hi), samples: v.sample_count })),
  }));
}

/**
 * Builds a draft reference set from stored readings: only usable readings
 * taken while the machine was in the chosen state count. Expected = mean,
 * range = mean ± k·σ (k = setting reference.derive_sigma). The draft must be
 * reviewed and accepted before the evaluation uses it — frequent behaviour is
 * not automatically healthy behaviour.
 */
export async function deriveReferenceSet(
  machineId: string,
  input: { stateId?: number; from?: string; to?: string; name?: string; basis?: string },
  userId: string | null,
): Promise<ReferenceSetDto> {
  await assertMachine(machineId);
  if (!input.stateId) throw new InputError("stateId is required");
  const state = await query("SELECT 1 FROM operating_states WHERE id = $1 AND machine_id = $2", [input.stateId, machineId]);
  if (!state.rowCount) throw new InputError("stateId is not an operating state of this machine");
  const from = input.from ? new Date(input.from) : null;
  const to = input.to ? new Date(input.to) : new Date();
  if (!from || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) throw new InputError("from / to must be a valid window");
  const k = await setting("reference.derive_sigma");
  const minSamples = await setting("reference.min_samples");
  const name = input.name?.trim() || `Baseline ${from.toISOString().slice(0, 16)} – ${to.toISOString().slice(0, 16)}`;
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const set = await c.query<{ id: number }>(
      `INSERT INTO reference_sets (machine_id, state_id, name, status, basis, window_from, window_to, created_by_user_id)
       VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7) RETURNING id`,
      [machineId, input.stateId, name, input.basis?.trim() || `Mean ± ${k} σ of usable readings in the window while the machine was in this state. Review before accepting.`, from, to, userId],
    );
    await c.query(
      `INSERT INTO reference_values (reference_set_id, measurement_id, expected, lo, hi, sample_count)
       SELECT $1, r.measurement_id, AVG(r.value), AVG(r.value) - $5 * STDDEV_SAMP(r.value), AVG(r.value) + $5 * STDDEV_SAMP(r.value), COUNT(*)
         FROM readings r
         JOIN quality_codes q ON q.id = r.quality_id AND q.usable
         JOIN v_measurement_context c ON c.measurement_id = r.measurement_id AND c.machine_id = $2 AND c.value_kind = 'analog'
         JOIN machine_state_periods p ON p.machine_id = $2 AND p.state_id = $6
              AND r.acquired_at >= p.started_at AND r.acquired_at < COALESCE(p.ended_at, 'infinity')
        WHERE r.acquired_at BETWEEN $3 AND $4 AND r.value IS NOT NULL
        GROUP BY r.measurement_id
       HAVING COUNT(*) >= $7`,
      [set.rows[0].id, machineId, from, to, k, input.stateId, minSamples],
    );
    await c.query("COMMIT");
    return (await listReferenceSets(machineId)).find((s) => s.id === set.rows[0].id)!;
  } catch (err) {
    await c.query("ROLLBACK").catch(() => {});
    if (err instanceof Error && /duplicate key/.test(err.message)) throw new InputError(`A reference set named "${name}" already exists`);
    throw err;
  } finally {
    c.release();
  }
}

/** Accepts a draft (retiring the set it replaces for the same state) or retires a set. */
export async function setReferenceStatus(setId: number, status: "accepted" | "retired", userId: string | null): Promise<ReferenceSetDto> {
  const cur = await query<{ machine_id: string; state_id: number | null; status: string }>("SELECT machine_id, state_id, status FROM reference_sets WHERE id = $1", [setId]);
  const row = cur.rows[0];
  if (!row) throw new NotFoundError(`Reference set ${setId} does not exist`);
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    if (status === "accepted") {
      const values = await c.query("SELECT 1 FROM reference_values WHERE reference_set_id = $1 LIMIT 1", [setId]);
      if (!values.rowCount) throw new InputError("A reference set without values cannot be accepted");
      await c.query(
        "UPDATE reference_sets SET status = 'retired' WHERE machine_id = $1 AND COALESCE(state_id, 0) = COALESCE($2::int, 0) AND status = 'accepted' AND id <> $3",
        [row.machine_id, row.state_id, setId],
      );
      await c.query("UPDATE reference_sets SET status = 'accepted', accepted_by_user_id = $2, accepted_at = NOW() WHERE id = $1", [setId, userId]);
    } else {
      await c.query("UPDATE reference_sets SET status = 'retired' WHERE id = $1", [setId]);
    }
    await c.query("COMMIT");
  } catch (err) {
    await c.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    c.release();
  }
  return (await listReferenceSets(row.machine_id)).find((s) => s.id === setId)!;
}

/* ------------------------------------------------------------------ */
/* Registry lookups                                                    */
/* ------------------------------------------------------------------ */

export async function listSimulations(plantIds?: string[]): Promise<SimulationDto[]> {
  const res = await query<{ machine_id: string; plant_id: string; engine_id: SimulationDto["engine"]; seed: number | null; profile: string | null; enabled: boolean }>(
    `SELECT s.machine_id, m.plant_id, s.engine_id, s.seed, s.profile, s.enabled
       FROM machine_simulations s JOIN machines m ON m.id = s.machine_id
      WHERE ($1::varchar[] IS NULL OR m.plant_id = ANY($1))
      ORDER BY m.plant_id, s.machine_id`,
    [plantIds ?? null],
  );
  return res.rows.map((r) => ({ machineId: r.machine_id, plantId: r.plant_id, engine: r.engine_id, seed: r.seed, profile: r.profile, enabled: r.enabled }));
}

export async function listWorkOrderPriorities(): Promise<WorkOrderPriorityDto[]> {
  const res = await query<{ id: string; name: string; response_minutes: number | null; description: string; default_new: boolean; default_defect: boolean }>(
    "SELECT id, name, response_minutes, description, default_new, default_defect FROM work_order_priorities ORDER BY sort_order",
  );
  return res.rows.map((r) => ({
    id: r.id,
    name: r.name,
    responseMinutes: r.response_minutes,
    description: r.description,
    defaultNew: r.default_new,
    defaultDefect: r.default_defect,
  }));
}

/* ------------------------------------------------------------------ */
/* Fleet condition                                                     */
/* ------------------------------------------------------------------ */

export interface FleetConditionRow {
  machineId: string;
  plantId: string;
  serviceState: "Operational" | "Standby" | "Maintenance";
  health: number | null;
  status: SeverityId | null;
  scoredAt: string | null;
  findings: { critical: number; advisory: number; unacknowledged: number };
}

/** Latest evaluated condition of every machine (optionally of one plant). */
/** `plantIds`: the plants to report; undefined = every plant. */
export async function fleetCondition(plantIds?: string[]): Promise<FleetConditionRow[]> {
  const machines = await query<{ id: string; plant_id: string; service_state: FleetConditionRow["serviceState"] }>(
    "SELECT id, plant_id, service_state FROM machines WHERE ($1::varchar[] IS NULL OR plant_id = ANY($1)) ORDER BY id",
    [plantIds ?? null],
  );
  const ids = machines.rows.map((m) => m.id);
  const { machineHealthNow } = await import("@/server/monitoring/condition");
  const [health, findings] = await Promise.all([
    machineHealthNow(ids),
    query<{ machine_id: string; critical: number; advisory: number; unacked: number }>(
      `SELECT f.machine_id,
              COUNT(*) FILTER (WHERE f.severity_id = 'Critical')::int AS critical,
              COUNT(*) FILTER (WHERE f.severity_id = 'Alert')::int AS advisory,
              COUNT(*) FILTER (WHERE a.finding_id IS NULL AND f.severity_id <> 'Normal')::int AS unacked
         FROM findings f LEFT JOIN finding_acknowledgements a ON a.finding_id = f.id
        WHERE f.cleared_at IS NULL AND f.machine_id = ANY($1) GROUP BY f.machine_id`,
      [ids],
    ),
  ]);
  return machines.rows.map((m) => {
    const h = health.get(m.id);
    const f = findings.rows.find((x) => x.machine_id === m.id);
    return {
      machineId: m.id,
      plantId: m.plant_id,
      serviceState: m.service_state,
      health: h ? Math.round(h.score * 10) / 10 : null,
      status: h?.status ?? null,
      scoredAt: h?.at ?? null,
      findings: { critical: f?.critical ?? 0, advisory: f?.advisory ?? 0, unacknowledged: f?.unacked ?? 0 },
    };
  });
}
