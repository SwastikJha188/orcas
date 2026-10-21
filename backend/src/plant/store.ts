/**
 * Storage for the always-on plant (see ./runner): its health record, its
 * latest saved state, and the lease that lets exactly one server run it.
 */
import pool from "@backend/db";
import { HEALTH_STEP_MS } from "@shared/lib/health-recorder";
import { ensureMigrations } from "@backend/db/migrate";
import { setting } from "@backend/monitoring/settings";

/** The plant tables are created by the schema migrations (001, 005, 007); this waits for them. */
export function ensurePlantTables(): Promise<void> {
  return ensureMigrations().then(() => undefined);
}

/**
 * Takes or renews the runner lease for `holder`; true while it holds it. A
 * runner of a newer `version` takes the lease from an older one at once.
 */
export async function holdLease(holder: string, ttlMs: number, version: number): Promise<boolean> {
  const res = await pool.query(
    `INSERT INTO plant_runner_lease (id, holder, expires_at, version) VALUES ('plant', $1, NOW() + ($2 || ' milliseconds')::interval, $3)
     ON CONFLICT (id) DO UPDATE SET holder = EXCLUDED.holder, expires_at = EXCLUDED.expires_at, version = EXCLUDED.version
     WHERE plant_runner_lease.holder = EXCLUDED.holder OR plant_runner_lease.expires_at < NOW() OR plant_runner_lease.version < EXCLUDED.version
     RETURNING holder`,
    [holder, String(ttlMs), version],
  );
  return res.rowCount === 1;
}

/** Frees the lease `holder` holds, so a standing-by server can take it at once. */
export async function releaseLease(holder: string): Promise<void> {
  await pool.query(`UPDATE plant_runner_lease SET expires_at = NOW() - INTERVAL '1 second' WHERE id = 'plant' AND holder = $1`, [holder]);
}

/**
 * The Machine Health Index the server evaluation stored (machine_health_scores)
 * since `from` (epoch ms), on the page recorder's bucket grid: `v[i]` is the
 * bucket at `t0 + i · step`. A score holds until the next evaluation; a gap
 * longer than two evaluation periods stays null (no evaluation ran).
 */
export async function readHealth(from: number): Promise<{ step: number; series: Record<string, { t0: number; v: Array<number | null> }> }> {
  const periodMs = (await setting("evaluation.period_s")) * 1000;
  const res = await pool.query<{ machine_id: string; ms: string; score: number }>(
    `SELECT machine_id, (EXTRACT(EPOCH FROM scored_at) * 1000)::bigint AS ms, score
       FROM machine_health_scores WHERE scored_at >= $1 ORDER BY machine_id, scored_at`,
    [new Date(from).toISOString()],
  );
  const step = HEALTH_STEP_MS;
  const series: Record<string, { t0: number; v: Array<number | null> }> = {};
  const last: Record<string, { t: number; score: number }> = {};
  for (const r of res.rows) {
    const t = Math.floor(Number(r.ms) / step) * step;
    const s = (series[r.machine_id] ??= { t0: t, v: [] });
    const prev = last[r.machine_id];
    const i = (t - s.t0) / step;
    while (s.v.length < i) {
      const bucketT = s.t0 + s.v.length * step;
      s.v.push(prev && bucketT - prev.t <= 2 * periodMs ? prev.score : null);
    }
    s.v[i] = Math.round(Number(r.score) * 10) / 10;
    last[r.machine_id] = { t, score: s.v[i]! };
  }
  return { step, series };
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
