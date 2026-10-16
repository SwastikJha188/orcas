/**
 * Machine health on the real clock.
 *
 * The live engines step one simulated minute per second at 1×, so a frame's
 * `healthHistory` (one sample per simulated minute) covers seconds of real
 * time, not hours. Health-over-time charts read this recorder instead: every
 * tick the fleet hands it each live machine's health and the wall-clock time,
 * averaged into fixed HEALTH_STEP_MS buckets and kept for HEALTH_KEEP_MS.
 *
 * The history survives a reload (localStorage, per browser), and the server's
 * always-on plant (src/server/plant) records the same buckets while no page
 * is open; `mergeHealth` folds those in. Minutes nobody recorded draw as gaps.
 * Pure TypeScript; the storage calls are guarded so it also runs headless.
 */

export const HEALTH_STEP_MS = 10_000;
export const HEALTH_KEEP_MS = 6 * 60 * 60_000;
const KEEP_STEPS = HEALTH_KEEP_MS / HEALTH_STEP_MS;
const STORAGE_KEY = "ultron.health-history.v1";
const SAVE_EVERY_MS = 30_000;

/** One machine's buckets: `v[i]` is the mean health from `t0 + i · step` (null: not recorded). */
interface Track {
  t0: number;
  v: Array<number | null>;
  /** Running bucket (start ms, sum, count); folded into `v` when the next bucket starts. */
  cur: { start: number; sum: number; n: number } | null;
}

export interface HealthPoint {
  /** Bucket start, epoch ms. */
  t: number;
  /** Mean health in the bucket, null where nothing was recorded. */
  v: number | null;
}

const tracks = new Map<string, Track>();
let loaded = false;
let lastSave = 0;

const bucketOf = (ms: number) => Math.floor(ms / HEALTH_STEP_MS) * HEALTH_STEP_MS;

function load(): void {
  if (loaded) return;
  loaded = true;
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return;
    const saved = JSON.parse(raw) as Record<string, { t0: number; v: Array<number | null> }>;
    for (const [id, tr] of Object.entries(saved)) {
      if (typeof tr?.t0 === "number" && Array.isArray(tr.v)) tracks.set(id, { t0: tr.t0, v: tr.v, cur: null });
    }
  } catch {
    /* storage unavailable or corrupt: start a fresh history */
  }
}

function save(now: number): void {
  lastSave = now;
  try {
    const out: Record<string, { t0: number; v: Array<number | null> }> = {};
    for (const [id, tr] of tracks) out[id] = { t0: tr.t0, v: tr.v };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
  } catch {
    /* storage unavailable or full: the history stays in memory */
  }
}

/** Fold the running bucket into the grid, filling any skipped buckets with gaps, and drop what is older than the keep window. */
function fold(tr: Track): void {
  const c = tr.cur;
  if (!c) return;
  const i = (c.start - tr.t0) / HEALTH_STEP_MS;
  while (tr.v.length < i) tr.v.push(null);
  tr.v[i] = Math.round((c.sum / c.n) * 10) / 10;
  tr.cur = null;
  const extra = tr.v.length - KEEP_STEPS;
  if (extra > 0) {
    tr.v.splice(0, extra);
    tr.t0 += extra * HEALTH_STEP_MS;
  }
}

/** Record each machine's health at `now` (epoch ms). Call once per live tick. */
export function recordHealth(values: Record<string, number>, now = Date.now()): void {
  load();
  const b = bucketOf(now);
  for (const [id, value] of Object.entries(values)) {
    if (!Number.isFinite(value)) continue;
    let tr = tracks.get(id);
    // A history older than the keep window is useless: start over at this bucket.
    if (tr && b - (tr.t0 + tr.v.length * HEALTH_STEP_MS) > HEALTH_KEEP_MS) tr = undefined;
    if (!tr) {
      tr = { t0: b, v: [], cur: null };
      tracks.set(id, tr);
    }
    if (tr.cur && tr.cur.start !== b) fold(tr);
    if (b < tr.t0 + tr.v.length * HEALTH_STEP_MS) continue; // clock went backwards: ignore
    tr.cur ??= { start: b, sum: 0, n: 0 };
    tr.cur.sum += value;
    tr.cur.n += 1;
  }
  if (now - lastSave >= SAVE_EVERY_MS) save(now);
}

/**
 * Merge buckets recorded elsewhere (the server's always-on plant) into the
 * tracks: where both hold a bucket the server's wins, since it recorded the
 * same plant without the page's pauses; this page's running bucket is kept.
 */
export function mergeHealth(series: Record<string, { t0: number; v: Array<number | null> }>, step: number): void {
  if (step !== HEALTH_STEP_MS) return;
  load();
  for (const [id, s] of Object.entries(series)) {
    if (!s.v.length || s.t0 % HEALTH_STEP_MS !== 0) continue;
    const tr = tracks.get(id);
    const t0 = tr ? Math.min(tr.t0, s.t0) : s.t0;
    const end = Math.max(tr ? tr.t0 + tr.v.length * HEALTH_STEP_MS : 0, s.t0 + s.v.length * HEALTH_STEP_MS);
    // Never past this page's running bucket: it folds in when its bucket closes.
    const stop = tr?.cur ? Math.min(end, tr.cur.start) : end;
    const v: Array<number | null> = new Array(Math.max(0, (stop - t0) / HEALTH_STEP_MS)).fill(null);
    if (tr) tr.v.forEach((x, i) => (v[(tr.t0 - t0) / HEALTH_STEP_MS + i] = x));
    s.v.forEach((x, i) => {
      const k = (s.t0 - t0) / HEALTH_STEP_MS + i;
      if (x !== null && k < v.length) v[k] = x;
    });
    const merged: Track = { t0, v, cur: tr?.cur ?? null };
    const extra = merged.v.length - KEEP_STEPS;
    if (extra > 0) {
      merged.v.splice(0, extra);
      merged.t0 += extra * HEALTH_STEP_MS;
    }
    tracks.set(id, merged);
  }
  save(Date.now());
}

/** Persist now (e.g. on `pagehide`). */
export function flushHealth(): void {
  if (loaded) save(Date.now());
}

/** Buckets of one machine from `from` (epoch ms) to now, the running bucket last. */
export function healthTrack(id: string, from: number): HealthPoint[] {
  load();
  const tr = tracks.get(id);
  if (!tr) return [];
  const out: HealthPoint[] = [];
  const start = Math.max(0, Math.ceil((from - tr.t0) / HEALTH_STEP_MS));
  for (let i = start; i < tr.v.length; i++) out.push({ t: tr.t0 + i * HEALTH_STEP_MS, v: tr.v[i] ?? null });
  const c = tr.cur;
  if (c && c.start >= from) {
    const i = (c.start - tr.t0) / HEALTH_STEP_MS;
    for (let k = tr.v.length; k < i; k++) if (tr.t0 + k * HEALTH_STEP_MS >= from) out.push({ t: tr.t0 + k * HEALTH_STEP_MS, v: null });
    out.push({ t: c.start, v: Math.round((c.sum / c.n) * 10) / 10 });
  }
  return out;
}

/**
 * Buckets combined across machines (e.g. a plant's mean): `combine` gets the
 * recorded values of one bucket, keyed by machine id; a bucket where any
 * machine has no value is a gap.
 */
export function combinedTrack(ids: string[], from: number, combine: (values: Record<string, number>) => number): HealthPoint[] {
  if (!ids.length) return [];
  const per = ids.map((id) => new Map(healthTrack(id, from).map((p) => [p.t, p.v])));
  const times = [...new Set(per.flatMap((m) => [...m.keys()]))].sort((a, b) => a - b);
  return times.map((t) => {
    const values: Record<string, number> = {};
    for (let k = 0; k < ids.length; k++) {
      const v = per[k].get(t);
      if (v === null || v === undefined) return { t, v: null };
      values[ids[k]] = v;
    }
    return { t, v: Math.round(combine(values) * 10) / 10 };
  });
}
