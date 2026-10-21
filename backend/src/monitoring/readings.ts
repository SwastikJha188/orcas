/**
 * Readings: the measured history (Purpose steps 1–5).
 *
 * A reading keeps its acquisition time apart from the time the server
 * received it, and its quality. Values outside the measurement's configured
 * range are stored as received and flagged OVERRANGE / UNDERRANGE. A missing
 * measurement is never written as zero: no reading is stored at all, and the
 * evaluation reports the measurement as stale or missing.
 */
import pool, { query } from "@backend/db";
import { setting } from "./settings";

export type QualityCode = "GOOD" | "UNCERTAIN" | "STALE" | "MISSING" | "OVERRANGE" | "UNDERRANGE" | "CLIPPED" | "BAD";
export type TimeSource = "device" | "gateway" | "server";

export interface ReadingIn {
  measurementId: string;
  acquiredAt: number;
  value: number | null;
  state: string | null;
  quality: QualityCode;
  timeSource: TimeSource;
}

/** Stores readings in one round trip per 5 000 rows; duplicates (same measurement and time) are ignored. */
export async function writeReadings(rows: ReadingIn[]): Promise<number> {
  let written = 0;
  for (let i = 0; i < rows.length; i += 5000) {
    const chunk = rows.slice(i, i + 5000);
    const res = await pool.query(
      `INSERT INTO readings (measurement_id, acquired_at, received_at, time_source, value, state, quality_id)
       SELECT x.m, x.at, NOW(), x.ts, x.v, x.s,
              CASE
                WHEN x.q IN ('GOOD', 'UNCERTAIN') AND x.v IS NOT NULL AND m.range_hi IS NOT NULL AND x.v > m.range_hi THEN 'OVERRANGE'
                WHEN x.q IN ('GOOD', 'UNCERTAIN') AND x.v IS NOT NULL AND m.range_lo IS NOT NULL AND x.v < m.range_lo THEN 'UNDERRANGE'
                ELSE x.q
              END
         FROM unnest($1::varchar[], $2::timestamptz[], $3::varchar[], $4::float8[], $5::varchar[], $6::varchar[]) AS x(m, at, ts, v, s, q)
         JOIN measurements m ON m.id = x.m
       ON CONFLICT (measurement_id, acquired_at) DO NOTHING`,
      [
        chunk.map((r) => r.measurementId),
        chunk.map((r) => new Date(r.acquiredAt).toISOString()),
        chunk.map((r) => r.timeSource),
        chunk.map((r) => (r.value === null || !Number.isFinite(r.value) ? null : r.value)),
        chunk.map((r) => r.state),
        chunk.map((r) => r.quality),
      ],
    );
    written += res.rowCount ?? 0;
  }
  return written;
}

/**
 * Summarises raw readings older than `readings.raw_keep_h` into hourly rows,
 * removes them, and drops hourly rows older than `readings.hourly_keep_d`.
 */
export async function rollupAndPrune(): Promise<{ summarised: number; removed: number }> {
  const rawKeepH = await setting("readings.raw_keep_h");
  const hourlyKeepD = await setting("readings.hourly_keep_d");
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const cutoff = (await c.query<{ cutoff: Date }>("SELECT date_trunc('hour', NOW() - make_interval(hours => $1::int)) AS cutoff", [Math.round(rawKeepH)])).rows[0].cutoff;
    const sum = await c.query(
      `INSERT INTO reading_hourly (measurement_id, hour_start, sample_count, good_count, v_min, v_max, v_sum, v_sum_sq, v_first, v_last)
       SELECT r.measurement_id, date_trunc('hour', r.acquired_at),
              COUNT(*), COUNT(*) FILTER (WHERE q.usable),
              MIN(r.value) FILTER (WHERE q.usable), MAX(r.value) FILTER (WHERE q.usable),
              SUM(r.value) FILTER (WHERE q.usable), SUM(r.value * r.value) FILTER (WHERE q.usable),
              (ARRAY_AGG(r.value ORDER BY r.acquired_at) FILTER (WHERE q.usable AND r.value IS NOT NULL))[1],
              (ARRAY_AGG(r.value ORDER BY r.acquired_at DESC) FILTER (WHERE q.usable AND r.value IS NOT NULL))[1]
         FROM readings r JOIN quality_codes q ON q.id = r.quality_id
        WHERE r.acquired_at < $1
        GROUP BY 1, 2
       ON CONFLICT (measurement_id, hour_start) DO UPDATE SET
         sample_count = reading_hourly.sample_count + EXCLUDED.sample_count,
         good_count = reading_hourly.good_count + EXCLUDED.good_count,
         v_min = LEAST(reading_hourly.v_min, EXCLUDED.v_min),
         v_max = GREATEST(reading_hourly.v_max, EXCLUDED.v_max),
         v_sum = COALESCE(reading_hourly.v_sum, 0) + COALESCE(EXCLUDED.v_sum, 0),
         v_sum_sq = COALESCE(reading_hourly.v_sum_sq, 0) + COALESCE(EXCLUDED.v_sum_sq, 0),
         v_first = COALESCE(reading_hourly.v_first, EXCLUDED.v_first),
         v_last = COALESCE(EXCLUDED.v_last, reading_hourly.v_last)`,
      [cutoff],
    );
    const del = await c.query("DELETE FROM readings WHERE acquired_at < $1", [cutoff]);
    await c.query("DELETE FROM reading_hourly WHERE hour_start < NOW() - make_interval(days => $1::int)", [Math.round(hourlyKeepD)]);
    await c.query("COMMIT");
    return { summarised: sum.rowCount ?? 0, removed: del.rowCount ?? 0 };
  } catch (err) {
    await c.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    c.release();
  }
}

export interface SeriesPoint {
  t: string;
  value: number | null;
  state: string | null;
  quality: string;
}

export interface SeriesBucket {
  t: string;
  n: number;
  good: number;
  min: number | null;
  max: number | null;
  mean: number | null;
}

/** Raw readings of one measurement in [from, to], oldest first (at most `limit`). */
export async function readSeries(measurementId: string, from: Date, to: Date, limit = 5000): Promise<SeriesPoint[]> {
  const res = await pool.query<{ t: Date; value: number | null; state: string | null; quality_id: string }>(
    `SELECT acquired_at AS t, value, state, quality_id FROM readings
      WHERE measurement_id = $1 AND acquired_at BETWEEN $2 AND $3
      ORDER BY acquired_at LIMIT $4`,
    [measurementId, from, to, limit],
  );
  return res.rows.map((r) => ({ t: r.t.toISOString(), value: r.value === null ? null : Number(r.value), state: r.state, quality: r.quality_id }));
}

/**
 * Bucketed summary of one measurement over [from, to]: raw readings where
 * they are kept, hourly summaries before that. Only usable readings count.
 */
export async function readBuckets(measurementId: string, from: Date, to: Date, bucketS: number): Promise<SeriesBucket[]> {
  const res = await pool.query<{ t: Date; n: string; good: string; min: number | null; max: number | null; mean: number | null }>(
    `WITH raw AS (
       SELECT to_timestamp(floor(extract(epoch FROM r.acquired_at) / $4) * $4) AS t,
              COUNT(*) AS n, COUNT(*) FILTER (WHERE q.usable) AS good,
              MIN(r.value) FILTER (WHERE q.usable) AS min, MAX(r.value) FILTER (WHERE q.usable) AS max,
              SUM(r.value) FILTER (WHERE q.usable) AS sum
         FROM readings r JOIN quality_codes q ON q.id = r.quality_id
        WHERE r.measurement_id = $1 AND r.acquired_at BETWEEN $2 AND $3
        GROUP BY 1
     ), hourly AS (
       SELECT to_timestamp(floor(extract(epoch FROM h.hour_start) / GREATEST($4, 3600)) * GREATEST($4, 3600)) AS t,
              SUM(h.sample_count) AS n, SUM(h.good_count) AS good, MIN(h.v_min) AS min, MAX(h.v_max) AS max, SUM(h.v_sum) AS sum
         FROM reading_hourly h
        WHERE h.measurement_id = $1 AND h.hour_start BETWEEN $2 AND $3
          AND h.hour_start < COALESCE((SELECT MIN(acquired_at) FROM readings WHERE measurement_id = $1), 'infinity')
        GROUP BY 1
     )
     SELECT t, n, good, min, max, CASE WHEN good > 0 THEN sum / good END AS mean FROM (SELECT * FROM hourly UNION ALL SELECT * FROM raw) u
      ORDER BY t`,
    [measurementId, from, to, Math.max(1, Math.round(bucketS))],
  );
  return res.rows.map((r) => ({
    t: r.t.toISOString(),
    n: Number(r.n),
    good: Number(r.good),
    min: r.min === null ? null : Number(r.min),
    max: r.max === null ? null : Number(r.max),
    mean: r.mean === null ? null : Number(r.mean),
  }));
}

export interface LatestReading {
  measurementId: string;
  acquiredAt: string;
  receivedAt: string;
  timeSource: TimeSource;
  value: number | null;
  state: string | null;
  quality: string;
}

/** Latest reading of every measurement of a machine (or of the given measurements). */
export async function latestReadings(opts: { machineId?: string; measurementIds?: string[] }): Promise<Map<string, LatestReading>> {
  const res = await query<{ measurement_id: string; acquired_at: Date; received_at: Date; time_source: TimeSource; value: number | null; state: string | null; quality_id: string }>(
    // One primary-key probe per measurement; DISTINCT ON over readings reads every row of the window.
    `SELECT c.measurement_id, r.acquired_at, r.received_at, r.time_source, r.value, r.state, r.quality_id
       FROM v_measurement_context c
      CROSS JOIN LATERAL (
            SELECT * FROM readings r
             WHERE r.measurement_id = c.measurement_id AND r.acquired_at > NOW() - interval '7 days'
             ORDER BY r.acquired_at DESC LIMIT 1) r
      WHERE ($1::varchar IS NULL OR c.machine_id = $1) AND ($2::varchar[] IS NULL OR c.measurement_id = ANY($2))`,
    [opts.machineId ?? null, opts.measurementIds ?? null],
  );
  return new Map(
    res.rows.map((r) => [
      r.measurement_id,
      {
        measurementId: r.measurement_id,
        acquiredAt: r.acquired_at.toISOString(),
        receivedAt: r.received_at.toISOString(),
        timeSource: r.time_source,
        value: r.value === null ? null : Number(r.value),
        state: r.state,
        quality: r.quality_id,
      },
    ]),
  );
}
