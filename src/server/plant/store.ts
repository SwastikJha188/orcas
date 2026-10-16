/**
 * Storage for the always-on plant (see ./runner): its health record, its
 * latest saved state, and the lease that lets exactly one server run it.
 */
import pool from "@/server/db";
import { HEALTH_STEP_MS } from "@/lib/health-recorder";

/** Health samples older than this are pruned. */
export const SAMPLE_KEEP_MS = 24 * 60 * 60_000;

const g = globalThis as typeof globalThis & { __ultronPlantTables?: Promise<void> };

/** Creates the plant tables once per process. */
export function ensurePlantTables(): Promise<void> {
  g.__ultronPlantTables ??= pool
    .query(
      `CREATE TABLE IF NOT EXISTS plant_health_samples (
         machine_id VARCHAR(64) NOT NULL,
         t TIMESTAMPTZ NOT NULL,
         health REAL NOT NULL,
         PRIMARY KEY (machine_id, t)
       );
       CREATE INDEX IF NOT EXISTS idx_plant_health_samples_t ON plant_health_samples(t);
       CREATE TABLE IF NOT EXISTS plant_state (
         id VARCHAR(32) PRIMARY KEY,
         wall_ms BIGINT NOT NULL,
         body BYTEA NOT NULL,
         updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
       );
       CREATE TABLE IF NOT EXISTS plant_runner_lease (
         id VARCHAR(32) PRIMARY KEY,
         holder VARCHAR(128) NOT NULL,
         expires_at TIMESTAMPTZ NOT NULL
       );`,
    )
    .then(() => undefined)
    .catch((err) => {
      g.__ultronPlantTables = undefined;
      throw err;
    });
  return g.__ultronPlantTables;
}

/** Takes or renews the runner lease for `holder`; true while it holds it. */
export async function holdLease(holder: string, ttlMs: number): Promise<boolean> {
  const res = await pool.query(
    `INSERT INTO plant_runner_lease (id, holder, expires_at) VALUES ('plant', $1, NOW() + ($2 || ' milliseconds')::interval)
     ON CONFLICT (id) DO UPDATE SET holder = EXCLUDED.holder, expires_at = EXCLUDED.expires_at
     WHERE plant_runner_lease.holder = EXCLUDED.holder OR plant_runner_lease.expires_at < NOW()
     RETURNING holder`,
    [holder, String(ttlMs)],
  );
  return res.rowCount === 1;
}

export type HealthRow = { machineId: string; t: number; health: number };

/** Upserts completed health buckets. */
export async function writeHealth(rows: HealthRow[]): Promise<void> {
  for (let i = 0; i < rows.length; i += 2000) {
    const chunk = rows.slice(i, i + 2000);
    await pool.query(
      `INSERT INTO plant_health_samples (machine_id, t, health)
       SELECT * FROM unnest($1::varchar[], $2::timestamptz[], $3::real[])
       ON CONFLICT (machine_id, t) DO UPDATE SET health = EXCLUDED.health`,
      [chunk.map((r) => r.machineId), chunk.map((r) => new Date(r.t).toISOString()), chunk.map((r) => r.health)],
    );
  }
}

export async function pruneHealth(): Promise<void> {
  await pool.query("DELETE FROM plant_health_samples WHERE t < NOW() - ($1 || ' milliseconds')::interval", [String(SAMPLE_KEEP_MS)]);
}

/** Each machine's buckets from `from` (epoch ms): `v[i]` is the bucket at `t0 + i · step`, null where none was recorded. */
export async function readHealth(from: number): Promise<{ step: number; series: Record<string, { t0: number; v: Array<number | null> }> }> {
  const res = await pool.query<{ machine_id: string; ms: string; health: number }>(
    `SELECT machine_id, (EXTRACT(EPOCH FROM t) * 1000)::bigint AS ms, health
       FROM plant_health_samples WHERE t >= $1 ORDER BY machine_id, t`,
    [new Date(from).toISOString()],
  );
  const series: Record<string, { t0: number; v: Array<number | null> }> = {};
  for (const r of res.rows) {
    const t = Number(r.ms);
    const s = (series[r.machine_id] ??= { t0: t, v: [] });
    const i = (t - s.t0) / HEALTH_STEP_MS;
    while (s.v.length < i) s.v.push(null);
    s.v[i] = Math.round(r.health * 10) / 10;
  }
  return { step: HEALTH_STEP_MS, series };
}

/** Saves the plant: `body` is the gzipped `/api/plant/state` response, taken at `wallMs`. */
export async function saveState(wallMs: number, body: Buffer): Promise<void> {
  await pool.query(
    `INSERT INTO plant_state (id, wall_ms, body, updated_at) VALUES ('fleet', $1, $2, NOW())
     ON CONFLICT (id) DO UPDATE SET wall_ms = EXCLUDED.wall_ms, body = EXCLUDED.body, updated_at = NOW()`,
    [wallMs, body],
  );
}

/** When the saved plant was taken (epoch ms), or null when none is saved. */
export async function stateWallMs(): Promise<number | null> {
  const res = await pool.query<{ wall_ms: string }>("SELECT wall_ms FROM plant_state WHERE id = 'fleet'");
  return res.rows[0] ? Number(res.rows[0].wall_ms) : null;
}

export async function loadState(): Promise<{ wallMs: number; body: Buffer } | null> {
  const res = await pool.query<{ wall_ms: string; body: Buffer }>("SELECT wall_ms, body FROM plant_state WHERE id = 'fleet'");
  const row = res.rows[0];
  return row ? { wallMs: Number(row.wall_ms), body: row.body } : null;
}
