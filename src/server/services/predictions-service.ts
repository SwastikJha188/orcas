import { randomUUID } from "crypto";
import { query } from "@/server/db";

/* AssetIQ prediction ledger. Rows are written when the AI predicts an event
   and resolved when the simulated plant shows what actually happened. */

export type PredictionKind = "signal" | "rule";
export type PredictionLevel = "warning" | "alarm" | "confirm";
export type PredictionStatus = "pending" | "confirmed" | "missed" | "void";

export interface Prediction {
  id: string;
  machineId: string;
  runId: string;
  episodeKey: string;
  kind: PredictionKind;
  subject: string;
  label: string;
  predictedEvent: string;
  targetLevel: PredictionLevel;
  confidence: number;
  createdT: number;
  createdClock: string | null;
  predictedT: number;
  expiresT: number;
  status: PredictionStatus;
  outcomeT: number | null;
  outcomeClock: string | null;
  leadMinutes: number | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface PredictionStats {
  made: number;
  pending: number;
  confirmed: number;
  missed: number;
  /** confirmed / (confirmed + missed), as a percentage; null until something resolves. */
  precision: number | null;
  /** Mean lead time of confirmed predictions, minutes. */
  meanLeadMinutes: number | null;
}

export interface NewPrediction {
  machineId: string;
  runId: string;
  episodeKey: string;
  kind: PredictionKind;
  subject: string;
  label: string;
  predictedEvent: string;
  targetLevel: PredictionLevel;
  confidence: number;
  createdT: number;
  createdClock?: string | null;
  predictedT: number;
  expiresT: number;
}

export class PredictionInputError extends Error {}

type Row = Record<string, unknown>;

const toPrediction = (r: Row): Prediction => ({
  id: String(r.id),
  machineId: String(r.machine_id),
  runId: String(r.run_id),
  episodeKey: String(r.episode_key),
  kind: r.kind as PredictionKind,
  subject: String(r.subject),
  label: String(r.label),
  predictedEvent: String(r.predicted_event),
  targetLevel: r.target_level as PredictionLevel,
  confidence: Number(r.confidence),
  createdT: Number(r.created_t),
  createdClock: (r.created_clock as string | null) ?? null,
  predictedT: Number(r.predicted_t),
  expiresT: Number(r.expires_t),
  status: r.status as PredictionStatus,
  outcomeT: r.outcome_t === null ? null : Number(r.outcome_t),
  outcomeClock: (r.outcome_clock as string | null) ?? null,
  leadMinutes: r.lead_minutes === null ? null : Number(r.lead_minutes),
  createdAt: new Date(r.created_at as string).toISOString(),
  resolvedAt: r.resolved_at ? new Date(r.resolved_at as string).toISOString() : null,
});

export async function listPredictions(machineId: string, limit = 200): Promise<Prediction[]> {
  const res = await query(
    `SELECT * FROM ai_predictions WHERE machine_id = $1 AND status <> 'void'
     ORDER BY created_at DESC, created_t DESC LIMIT $2`,
    [machineId, Math.min(Math.max(limit, 1), 500)],
  );
  return res.rows.map(toPrediction);
}

export async function predictionStats(machineId: string): Promise<PredictionStats> {
  const res = await query(
    `SELECT
       COUNT(*) FILTER (WHERE status <> 'void')::int AS made,
       COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
       COUNT(*) FILTER (WHERE status = 'confirmed')::int AS confirmed,
       COUNT(*) FILTER (WHERE status = 'missed')::int AS missed,
       AVG(lead_minutes) FILTER (WHERE status = 'confirmed') AS mean_lead
     FROM ai_predictions WHERE machine_id = $1`,
    [machineId],
  );
  const r = res.rows[0] as Row;
  const confirmed = Number(r.confirmed);
  const missed = Number(r.missed);
  return {
    made: Number(r.made),
    pending: Number(r.pending),
    confirmed,
    missed,
    precision: confirmed + missed > 0 ? Math.round((confirmed / (confirmed + missed)) * 1000) / 10 : null,
    meanLeadMinutes: r.mean_lead === null ? null : Math.round(Number(r.mean_lead)),
  };
}

export function parseNewPrediction(body: unknown): NewPrediction {
  const b = (body ?? {}) as Record<string, unknown>;
  const str = (k: string, max = 255) => {
    const v = b[k];
    if (typeof v !== "string" || !v || v.length > max) throw new PredictionInputError(`${k} is required`);
    return v;
  };
  const int = (k: string) => {
    const v = b[k];
    if (typeof v !== "number" || !Number.isFinite(v)) throw new PredictionInputError(`${k} must be a number`);
    return Math.round(v);
  };
  const kind = str("kind", 16);
  const targetLevel = str("targetLevel", 16);
  if (kind !== "signal" && kind !== "rule") throw new PredictionInputError("kind must be signal or rule");
  if (!["warning", "alarm", "confirm"].includes(targetLevel)) throw new PredictionInputError("invalid targetLevel");
  return {
    machineId: str("machineId", 64),
    runId: str("runId", 64),
    episodeKey: str("episodeKey", 160),
    kind,
    subject: str("subject", 64),
    label: str("label"),
    predictedEvent: str("predictedEvent", 1000),
    targetLevel: targetLevel as PredictionLevel,
    confidence: Math.min(100, Math.max(0, int("confidence"))),
    createdT: int("createdT"),
    createdClock: typeof b.createdClock === "string" ? b.createdClock.slice(0, 16) : null,
    predictedT: int("predictedT"),
    expiresT: int("expiresT"),
  };
}

/** Idempotent per (run, episode): a repeat POST returns the existing row. */
export async function createPrediction(p: NewPrediction): Promise<Prediction> {
  const res = await query(
    `INSERT INTO ai_predictions
       (id, machine_id, run_id, episode_key, kind, subject, label, predicted_event, target_level,
        confidence, created_t, created_clock, predicted_t, expires_t)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (run_id, episode_key) DO UPDATE SET id = ai_predictions.id
     RETURNING *`,
    [
      randomUUID(), p.machineId, p.runId, p.episodeKey, p.kind, p.subject, p.label, p.predictedEvent,
      p.targetLevel, p.confidence, p.createdT, p.createdClock ?? null, p.predictedT, p.expiresT,
    ],
  );
  return toPrediction(res.rows[0] as Row);
}

export interface PredictionOutcome {
  status: "confirmed" | "missed" | "void";
  outcomeT?: number;
  outcomeClock?: string;
}

export function parseOutcome(body: unknown): PredictionOutcome {
  const b = (body ?? {}) as Record<string, unknown>;
  const status = b.status;
  if (status !== "confirmed" && status !== "missed" && status !== "void") {
    throw new PredictionInputError("status must be confirmed, missed or void");
  }
  const outcomeT = typeof b.outcomeT === "number" && Number.isFinite(b.outcomeT) ? Math.round(b.outcomeT) : undefined;
  if (status === "confirmed" && outcomeT === undefined) throw new PredictionInputError("outcomeT is required");
  return { status, outcomeT, outcomeClock: typeof b.outcomeClock === "string" ? b.outcomeClock.slice(0, 16) : undefined };
}

/** Resolves a pending prediction; resolved rows are never rewritten. */
export async function resolvePrediction(id: string, o: PredictionOutcome): Promise<Prediction | null> {
  const res = await query(
    `UPDATE ai_predictions SET
       status = $2::varchar,
       outcome_t = $3::int,
       outcome_clock = $4::varchar,
       lead_minutes = CASE WHEN $2::varchar = 'confirmed' THEN GREATEST($3::int - created_t, 0) ELSE NULL END,
       resolved_at = NOW()
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [id, o.status, o.outcomeT ?? null, o.outcomeClock ?? null],
  );
  if (res.rows[0]) return toPrediction(res.rows[0] as Row);
  const cur = await query(`SELECT * FROM ai_predictions WHERE id = $1`, [id]);
  return cur.rows[0] ? toPrediction(cur.rows[0] as Row) : null;
}

/** A restarted simulation restarts its clock: older runs' open predictions can no longer resolve. */
export async function voidOtherRuns(machineId: string, keepRunId: string): Promise<number> {
  const res = await query(
    `UPDATE ai_predictions SET status = 'void', resolved_at = NOW()
     WHERE machine_id = $1 AND run_id <> $2 AND status = 'pending'`,
    [machineId, keepRunId],
  );
  return res.rowCount ?? 0;
}
