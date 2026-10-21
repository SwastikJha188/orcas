/**
 * Limit engine: readings for machines without a dedicated model.
 *
 * Machines registered in `machine_simulations` with engine "limits" publish
 * a reading for every analog measurement each publish period. Everything a
 * reading is made from comes from the database: the measurement's approved
 * normal range (`measurement_limits.basis_normal`, e.g. "55 – 72 °C"), its
 * Alert and Trip limits, its instrument range and noise. Nothing here lists
 * machines, tags or numbers of its own.
 *
 * The value at any minute is a function of the time, the machine's seed and
 * the measurement alone (no saved state), so the history a new machine needs
 * is filled by computing the minutes it missed:
 *
 *   value = normal middle + slow swings (a day and a few hours) + noise
 *           + drift, while this sensor's turn of the machine's cycle runs
 *
 * One analog sensor per machine at a time drifts: over the first part of its
 * turn it moves from normal toward its limit, holds there, and is then
 * "repaired" back to normal; the next turn picks the next sensor. The demo
 * profile sets how far a drift goes: healthy stays inside the normal range,
 * advisory reaches Alert, critical goes past Trip. That gives the evaluation
 * alarms, trends and remaining-life estimates to work with on every machine.
 */
import { query } from "@backend/db";
import type { ReadingIn } from "@backend/monitoring/readings";

export interface LimitSensor {
  machineId: string;
  measurementId: string;
  tag: string;
  profile: "healthy" | "advisory" | "critical";
  seed: number;
  /** Position of the sensor among its machine's analog sensors (its turn in the cycle). */
  slot: number;
  /** Number of analog sensors on the machine. */
  of: number;
  normalLo: number;
  normalHi: number;
  warn: number | null;
  alarm: number | null;
  /** Low-side limit: a fault moves the reading down. */
  low: boolean;
  rangeLo: number | null;
  rangeHi: number | null;
  sigma: number;
  decimals: number;
}

const TTL_MS = 60_000;
const HOUR = 3_600_000;
/** One sensor's turn: drifting, holding at its peak, then repaired. */
const TURN_MS = 10 * HOUR;
const DRIFT_MS = 6 * HOUR;
const HOLD_MS = 2 * HOUR;

const g = globalThis as typeof globalThis & { __ultronLimitSensors?: { at: number; rows: LimitSensor[] } };

const num = (v: unknown): number | null => (v === null || v === undefined || v === "" ? null : Number(v));

/** "55 – 72 °C (Nominal)" → [55, 72]; "≥ 98 % (Nominal)" → [98, null]; "≤ 3 bar" → [null, 3]. */
export function parseNormal(text: string | null): [number | null, number | null] {
  if (!text) return [null, null];
  const nums = [...text.replace(/,/g, "").matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
  if (/[≥>]/.test(text) && nums.length) return [nums[0], null];
  if (/[≤<]/.test(text) && nums.length) return [null, nums[0]];
  if (nums.length >= 2) return [Math.min(nums[0], nums[1]), Math.max(nums[0], nums[1])];
  return nums.length ? [nums[0], nums[0]] : [null, null];
}

export async function loadLimitSensors(force = false): Promise<LimitSensor[]> {
  const hit = g.__ultronLimitSensors;
  if (!force && hit && Date.now() - hit.at < TTL_MS) return hit.rows;
  const res = await query<Record<string, unknown>>(
    `SELECT s.machine_id, s.seed, s.profile, c.measurement_id, c.tag, c.decimals, c.range_lo, c.range_hi, c.noise_sigma,
            l.kind_id, l.warn_value, l.alarm_value, l.basis_normal
       FROM machine_simulations s
       JOIN v_measurement_context c ON c.machine_id = s.machine_id
       LEFT JOIN measurement_limits l ON l.measurement_id = c.measurement_id
      WHERE s.enabled AND s.engine_id = 'limits' AND c.value_kind = 'analog' AND c.origin_id <> 'manual'
      ORDER BY s.machine_id, c.sort_order, c.tag`,
  );
  const rows: LimitSensor[] = [];
  const count = new Map<string, number>();
  for (const r of res.rows) count.set(String(r.machine_id), (count.get(String(r.machine_id)) ?? 0) + 1);
  const seen = new Map<string, number>();
  for (const r of res.rows) {
    const machineId = String(r.machine_id);
    const warn = num(r.warn_value);
    const alarm = num(r.alarm_value);
    const low = r.kind_id === "lo" || (warn !== null && alarm !== null && alarm < warn);
    const rangeLo = num(r.range_lo);
    const rangeHi = num(r.range_hi);
    let [lo, hi] = parseNormal((r.basis_normal as string) ?? null);
    // An open-ended normal range ("≥ 98 %") closes at the instrument range or halfway to the limit.
    if (lo !== null && hi === null) hi = rangeHi ?? (warn !== null ? lo + Math.abs(lo - warn) : lo);
    if (hi !== null && lo === null) lo = rangeLo ?? (warn !== null ? hi - Math.abs(warn - hi) : hi);
    // No stated normal range: below a high Alert limit (above a low one), else the instrument range.
    if (lo === null || hi === null) {
      if (warn !== null) [lo, hi] = low ? [warn * 1.1, warn * 1.3] : [warn * 0.5, warn * 0.8];
      else if (rangeLo !== null && rangeHi !== null) [lo, hi] = [rangeLo + 0.4 * (rangeHi - rangeLo), rangeLo + 0.6 * (rangeHi - rangeLo)];
      else continue;
    }
    const span = Math.max(hi - lo, Math.abs(hi) * 0.02, 1e-6);
    const slot = seen.get(machineId) ?? 0;
    seen.set(machineId, slot + 1);
    const profile = r.profile === "healthy" || r.profile === "critical" ? r.profile : "advisory";
    rows.push({
      machineId,
      measurementId: String(r.measurement_id),
      tag: String(r.tag),
      profile,
      seed: Number(r.seed ?? 1),
      slot,
      of: count.get(machineId) ?? 1,
      normalLo: lo,
      normalHi: hi,
      warn,
      alarm,
      low,
      rangeLo,
      rangeHi,
      sigma: num(r.noise_sigma) ?? span * 0.06,
      decimals: Number(r.decimals ?? 2),
    });
  }
  g.__ultronLimitSensors = { at: Date.now(), rows };
  return rows;
}

/** Deterministic 0..1 from integers (mulberry32 step). */
function rand(a: number, b: number): number {
  let t = (a ^ Math.imul(b, 0x9e3779b1)) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Standard normal from two uniforms (Box–Muller). */
function gauss(a: number, b: number): number {
  const u = Math.max(rand(a, b), 1e-9);
  const v = rand(a ^ 0x5bd1e995, b + 7);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const tagHash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** How far the machine's drifting sensor has gone at `t`: 0 normal … 1 at its peak. */
function driftAt(s: LimitSensor, t: number): number {
  // Each machine's cycle starts at its own offset; the turn moves to the next sensor every TURN_MS.
  const offset = (s.seed % 97) * (TURN_MS / 97);
  const k = Math.floor((t + offset) / TURN_MS);
  if (((k % s.of) + s.of) % s.of !== s.slot) return 0;
  const into = (t + offset) - k * TURN_MS;
  if (into < DRIFT_MS) return into / DRIFT_MS;
  if (into < DRIFT_MS + HOLD_MS) return 1;
  return 0;
}

/** Where a drift ends for the sensor's profile. */
function peakOf(s: LimitSensor): number {
  const edge = s.low ? s.normalLo : s.normalHi;
  const dir = s.low ? -1 : 1;
  if (s.profile === "healthy" || s.warn === null) return edge + dir * 0.4 * (s.normalHi - s.normalLo);
  if (s.profile === "critical" && s.alarm !== null) return s.alarm + dir * 0.06 * Math.abs(s.alarm - s.warn);
  return s.alarm !== null ? s.warn + 0.5 * (s.alarm - s.warn) : s.warn + dir * 0.05 * Math.abs(s.warn);
}

export function limitValue(s: LimitSensor, t: number): number {
  const h = tagHash(s.tag) ^ s.seed;
  const mid = (s.normalLo + s.normalHi) / 2;
  const half = (s.normalHi - s.normalLo) / 2;
  const phase = (h % 1000) / 1000;
  const swing = 0.35 * half * Math.sin(2 * Math.PI * (t / (24 * HOUR) + phase)) + 0.15 * half * Math.sin(2 * Math.PI * (t / (3.7 * HOUR) + phase * 3));
  const minute = Math.floor(t / 60_000);
  const noise = s.sigma * gauss(h, minute);
  const d = driftAt(s, t);
  // Smooth start and end of the drift, so the trend looks like wear, not a step.
  const ease = d * d * (3 - 2 * d);
  let v = mid + swing + noise + ease * (peakOf(s) - mid);
  if (s.rangeLo !== null) v = Math.max(s.rangeLo, v);
  if (s.rangeHi !== null) v = Math.min(s.rangeHi, v);
  const f = 10 ** Math.min(Math.max(s.decimals, 0), 6);
  return Math.round(v * f) / f;
}

/** What the limit-engine gateways publish for the minute stamped `acquiredAt`. */
export function sampleLimitSensors(sensors: LimitSensor[], acquiredAt: number): ReadingIn[] {
  return sensors.map((s) => ({ measurementId: s.measurementId, acquiredAt, value: limitValue(s, acquiredAt), state: null, quality: "GOOD" as const, timeSource: "device" as const }));
}

/**
 * Readings a limit-engine machine missed (new to the engine, or the server was
 * down): every publish period from its last stored reading, at most `keepMs`
 * back, up to `untilMs`.
 */
export async function backfillLimitSensors(sensors: LimitSensor[], publishMs: number, keepMs: number, untilMs: number): Promise<ReadingIn[]> {
  if (!sensors.length || publishMs <= 0) return [];
  const last = await query<{ measurement_id: string; at: Date | null }>(
    "SELECT measurement_id, MAX(acquired_at) AS at FROM readings WHERE measurement_id = ANY($1) GROUP BY measurement_id",
    [sensors.map((s) => s.measurementId)],
  );
  const lastBy = new Map(last.rows.map((r) => [r.measurement_id, r.at ? r.at.getTime() : 0]));
  const out: ReadingIn[] = [];
  const floor = untilMs - keepMs;
  for (const s of sensors) {
    const from = Math.max(lastBy.get(s.measurementId) ?? 0, floor);
    for (let t = Math.ceil((from + 1) / publishMs) * publishMs; t <= untilMs; t += publishMs) {
      out.push({ measurementId: s.measurementId, acquiredAt: t, value: limitValue(s, t), state: null, quality: "GOOD", timeSource: "device" });
    }
  }
  return out;
}
