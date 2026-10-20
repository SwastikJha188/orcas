/**
 * Current condition read from the evaluation's output: the latest Machine
 * Health Index per machine and per component, mapped to a status through the
 * machine's health-model bands, and the severity of open findings per
 * measurement. Nothing here is stored next to the definitions; it is always
 * the latest evaluated value.
 */
import { query } from "@/server/db";
import type { SeverityId } from "@/types/monitoring";

export interface HealthNow {
  score: number;
  status: SeverityId;
  at: string;
}

interface Bands {
  advisory: number | null;
  critical: number | null;
}

async function bandsByMachine(): Promise<Map<string, Bands>> {
  const res = await query<{ machine_id: string; key: string; value: number }>(
    `SELECT m.id AS machine_id, p.key, p.value
       FROM machines m JOIN health_model_parameters p ON p.model_id = m.health_model_id
      WHERE p.key IN ('band_advisory', 'band_critical')`,
  );
  const out = new Map<string, Bands>();
  for (const r of res.rows) {
    const b = out.get(r.machine_id) ?? { advisory: null, critical: null };
    if (r.key === "band_advisory") b.advisory = Number(r.value);
    else b.critical = Number(r.value);
    out.set(r.machine_id, b);
  }
  return out;
}

export function statusOf(score: number, b: Bands | undefined): SeverityId {
  if (b?.critical !== null && b?.critical !== undefined && score < b.critical) return "Critical";
  if (b?.advisory !== null && b?.advisory !== undefined && score < b.advisory) return "Alert";
  return "Normal";
}

/** Latest health score per machine that has one. */
export async function machineHealthNow(machineIds?: string[]): Promise<Map<string, HealthNow>> {
  const [res, bands] = await Promise.all([
    query<{ machine_id: string; score: number; scored_at: Date }>(
      `SELECT DISTINCT ON (machine_id) machine_id, score, scored_at FROM machine_health_scores
        WHERE ($1::varchar[] IS NULL OR machine_id = ANY($1)) AND scored_at > NOW() - interval '1 day'
        ORDER BY machine_id, scored_at DESC`,
      [machineIds ?? null],
    ),
    bandsByMachine(),
  ]);
  return new Map(res.rows.map((r) => [r.machine_id, { score: Number(r.score), status: statusOf(Number(r.score), bands.get(r.machine_id)), at: r.scored_at.toISOString() }]));
}

/** Latest health score per component (sub-assembly id) of the given machines. */
export async function subassemblyHealthNow(machineIds?: string[]): Promise<Map<string, HealthNow>> {
  const [res, bands] = await Promise.all([
    query<{ subassembly_id: string; machine_id: string; score: number; scored_at: Date }>(
      `SELECT DISTINCT ON (h.subassembly_id) h.subassembly_id, sy.machine_id, h.score, h.scored_at
         FROM subassembly_health_scores h
         JOIN machine_subassemblies sa ON sa.id = h.subassembly_id
         JOIN machine_systems sy ON sy.id = sa.machine_system_ref_id
        WHERE ($1::varchar[] IS NULL OR sy.machine_id = ANY($1)) AND h.scored_at > NOW() - interval '1 day'
        ORDER BY h.subassembly_id, h.scored_at DESC`,
      [machineIds ?? null],
    ),
    bandsByMachine(),
  ]);
  return new Map(res.rows.map((r) => [r.subassembly_id, { score: Number(r.score), status: statusOf(Number(r.score), bands.get(r.machine_id)), at: r.scored_at.toISOString() }]));
}

/** Worst open limit / deviation finding severity per measurement. */
export async function measurementSeverityNow(machineIds?: string[]): Promise<Map<string, SeverityId>> {
  const res = await query<{ measurement_id: string; severity_id: SeverityId }>(
    `SELECT f.measurement_id, f.severity_id FROM findings f
      WHERE f.cleared_at IS NULL AND f.measurement_id IS NOT NULL
        AND f.finding_type_id IN ('limit_exceeded', 'behaviour_deviation', 'sustained_change', 'process_requirement')
        AND ($1::varchar[] IS NULL OR f.machine_id = ANY($1))`,
    [machineIds ?? null],
  );
  const rank: Record<SeverityId, number> = { Normal: 0, Alert: 1, Critical: 2 };
  const out = new Map<string, SeverityId>();
  for (const r of res.rows) if (rank[r.severity_id] > rank[out.get(r.measurement_id) ?? "Normal"]) out.set(r.measurement_id, r.severity_id);
  return out;
}

/** Share of usable readings per measurement over the last `hours` (null when none were received). */
export async function dataQualityNow(machineIds: string[] | undefined, hours: number): Promise<Map<string, { usablePct: number; samples: number }>> {
  const res = await query<{ measurement_id: string; n: string; good: string }>(
    `SELECT r.measurement_id, COUNT(*) AS n, COUNT(*) FILTER (WHERE q.usable) AS good
       FROM readings r
       JOIN quality_codes q ON q.id = r.quality_id
       JOIN v_measurement_context c ON c.measurement_id = r.measurement_id
      WHERE r.acquired_at > NOW() - make_interval(secs => $2) AND ($1::varchar[] IS NULL OR c.machine_id = ANY($1))
      GROUP BY r.measurement_id`,
    [machineIds ?? null, hours * 3600],
  );
  return new Map(res.rows.map((r) => [r.measurement_id, { usablePct: Math.round((Number(r.good) / Number(r.n)) * 100), samples: Number(r.n) }]));
}
