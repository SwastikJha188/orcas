/**
 * Trends page model (pure TypeScript, no React).
 *
 * Builds trend channels from the DB catalogue, stored `trend_records` and the
 * live engine frame (kiln-seal fleet or pyro line); derives window series,
 * statistics, excursions (periods outside the signal limits or outside the
 * reference model ±3σ band) and one chronological event log. Signal, system
 * and rule definitions come from the frame's `PlantDefs` (`frame.defs`, or
 * `defsFor(machineId)` without a frame). Only stored or simulated samples are
 * ever plotted; nothing here invents values.
 */
import type { OperatingEvent } from "./assets-data";
import type { CatalogSensorView, MachineCatalog } from "./use-machine-catalog";
import type { MachineHistory, TrendRecordMetric } from "./use-machine-history";
import type { TrendSample } from "./sensor-trend-graph";
import { formatDuration, simMinuteMs, simTimeMs, type SimFrame } from "@/lib/kiln-sim/engine";
import { EQUATION_BY_TARGET, type Equation } from "@/lib/kiln-sim/relationships";
import { limitBand } from "@/lib/kiln-sim/signals";
import type { DefSignal, PlantDefs } from "@/lib/plant-defs";
import { zoneOffsetMs, zonedParts } from "@/lib/time";
import { displayName } from "@/lib/display-name";

/* ==========================================================================
   Time
   ========================================================================== */

export const SEC = 1000;
export const MIN = 60 * SEC;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

export type TimeWindow = "live" | "1h" | "8h" | "24h" | "7d";

const WINDOW_MS: Record<TimeWindow, number> = { live: 2 * MIN, "1h": HOUR, "8h": 8 * HOUR, "24h": DAY, "7d": 7 * DAY };
const STORED_WINDOWS: TimeWindow[] = ["1h", "8h", "24h", "7d"];
const STORED_LABEL: Record<TimeWindow, string> = { live: "Live", "1h": "1 h", "8h": "8 h", "24h": "24 h", "7d": "7 d" };

/**
 * Live-engine windows in simulated minutes. The engine keeps 6 h of one-minute
 * samples (D5 Table 8.2: time series at 1 min); on screen a simulated minute
 * lasts `simMinuteMs()` of local time, so windows are labelled by the real
 * time they cover.
 */
const SIM_WINDOW_MIN: Partial<Record<TimeWindow, number>> = { live: 60, "1h": 180, "8h": 360 };

export interface WindowItem {
  id: TimeWindow;
  label: string;
}

export function windowItems(live: boolean): WindowItem[] {
  if (live) {
    return (Object.entries(SIM_WINDOW_MIN) as Array<[TimeWindow, number]>).map(([id, min]) => ({
      id,
      label: id === "live" ? "Live" : formatDuration(min),
    }));
  }
  return STORED_WINDOWS.map((id) => ({ id, label: STORED_LABEL[id] }));
}

/** What the window covers, for headings and units ("1m 00s" on a live machine, "8 h" stored). */
export function windowLabel(win: TimeWindow, live: boolean): string {
  if (live) return formatDuration(SIM_WINDOW_MIN[win] ?? SIM_WINDOW_MIN.live!);
  return STORED_LABEL[win];
}

export function windowSpan(win: TimeWindow, live: boolean): number {
  return live ? (SIM_WINDOW_MIN[win] ?? SIM_WINDOW_MIN.live!) * simMinuteMs() : WINDOW_MS[win];
}

/* ==========================================================================
   Limits & zones
   ========================================================================== */

export type Zone = "normal" | "warning" | "alarm";
export type Tone = "good" | "warn" | "bad" | "idle" | "info";

/** Warning / alarm limits; any side may be absent. `abs`: limits apply to |value|. */
export interface Limits {
  warnHi?: number;
  alarmHi?: number;
  warnLo?: number;
  alarmLo?: number;
  abs?: boolean;
}

export const ZONE_TONE: Record<Zone, Tone> = { normal: "good", warning: "warn", alarm: "bad" };
export const ZONE_LABEL: Record<Zone, string> = { normal: "Normal", warning: "Alert", alarm: "Critical" };
const ZONE_RANK: Record<Zone, number> = { normal: 0, warning: 1, alarm: 2 };
export const worst = (a: Zone, b: Zone): Zone => (ZONE_RANK[a] >= ZONE_RANK[b] ? a : b);
export const zoneRank = (z: Zone) => ZONE_RANK[z];
export const reportedZone = (s: string): Zone => (s === "Critical" ? "alarm" : s === "Alert" ? "warning" : "normal");

export function zoneOf(v: number, L: Limits | undefined): Zone {
  if (!L || !Number.isFinite(v)) return "normal";
  const x = L.abs ? Math.abs(v) : v;
  if ((L.alarmHi !== undefined && x >= L.alarmHi) || (L.alarmLo !== undefined && x <= L.alarmLo)) return "alarm";
  if ((L.warnHi !== undefined && x >= L.warnHi) || (L.warnLo !== undefined && x <= L.warnLo)) return "warning";
  return "normal";
}

/** Distance past the nearest warning limit (> 0 = outside), for picking an excursion's peak. */
function exceedance(v: number, L: Limits): number {
  const x = L.abs ? Math.abs(v) : v;
  let e = -Infinity;
  const hi = L.warnHi ?? L.alarmHi;
  const lo = L.warnLo ?? L.alarmLo;
  if (hi !== undefined) e = Math.max(e, x - hi);
  if (lo !== undefined) e = Math.max(e, lo - x);
  return e;
}

/** Every limit line to draw: value + tone. `abs` limits are mirrored below zero. */
export function limitLines(L: Limits | undefined): Array<{ v: number; tone: "warn" | "bad"; side: "hi" | "lo" }> {
  if (!L) return [];
  const out: Array<{ v: number; tone: "warn" | "bad"; side: "hi" | "lo" }> = [];
  if (L.warnHi !== undefined) out.push({ v: L.warnHi, tone: "warn", side: "hi" });
  if (L.alarmHi !== undefined) out.push({ v: L.alarmHi, tone: "bad", side: "hi" });
  if (L.warnLo !== undefined) out.push({ v: L.warnLo, tone: "warn", side: "lo" });
  if (L.alarmLo !== undefined) out.push({ v: L.alarmLo, tone: "bad", side: "lo" });
  if (L.abs) {
    if (L.warnHi !== undefined) out.push({ v: -L.warnHi, tone: "warn", side: "lo" });
    if (L.alarmHi !== undefined) out.push({ v: -L.alarmHi, tone: "bad", side: "lo" });
  }
  return out;
}

/** Shaded zone bands [from, to, tone] for a value domain [lo, hi]. */
export function limitBands(L: Limits | undefined, lo: number, hi: number): Array<[number, number, "warn" | "bad"]> {
  if (!L) return [];
  const bands: Array<[number, number, "warn" | "bad"]> = [];
  const up = (warn: number | undefined, alarm: number | undefined) => {
    if (warn !== undefined) bands.push([warn, alarm ?? hi, "warn"]);
    if (alarm !== undefined) bands.push([alarm, hi, "bad"]);
  };
  const down = (warn: number | undefined, alarm: number | undefined) => {
    if (warn !== undefined) bands.push([alarm ?? lo, warn, "warn"]);
    if (alarm !== undefined) bands.push([lo, alarm, "bad"]);
  };
  up(L.warnHi, L.alarmHi);
  down(L.warnLo, L.alarmLo);
  if (L.abs) down(L.warnHi !== undefined ? -L.warnHi : undefined, L.alarmHi !== undefined ? -L.alarmHi : undefined);
  return bands;
}

/** DB warning / alarm pair → limits; both zero (or equal) means the catalogue stores none. */
function pairLimits(warn: number, alarm: number): Limits | undefined {
  if (!Number.isFinite(warn) || !Number.isFinite(alarm) || warn === alarm) return undefined;
  return alarm < warn ? { warnLo: warn, alarmLo: alarm } : { warnHi: warn, alarmHi: alarm };
}

/** Signal limit rule → limits; set-point deviation limits resolve against the live set-point (`defs.setpoints`). */
function defLimits(def: DefSignal, frame: SimFrame | null, defs: PlantDefs): Limits | undefined {
  const l = def.limit;
  if (!l) return undefined;
  switch (l.kind) {
    case "hi":
      return { warnHi: l.warn, alarmHi: l.alarm };
    case "lo":
      return { warnLo: l.warn, alarmLo: l.alarm };
    case "abs":
      return { warnHi: l.warn, alarmHi: l.alarm, abs: true };
    case "band":
      return { warnHi: l.warnHi, alarmHi: l.alarmHi, warnLo: l.warnLo, alarmLo: l.alarmLo };
    case "setpoint": {
      const key = defs.setpoints[def.tag];
      const sp = key && frame ? frame.drivers[key] * (defs.setpointShare?.[def.tag] ?? 1) : undefined;
      if (!sp) return undefined;
      return {
        warnHi: sp * (1 + l.warnPct / 100),
        alarmHi: sp * (1 + l.alarmPct / 100),
        warnLo: sp * (1 - l.warnPct / 100),
        alarmLo: sp * (1 - l.alarmPct / 100),
      };
    }
    default: {
      // Relative limits (pyro D5 Table 9.2: model ± %, baseline + K …) at the live reference model.
      const b = limitBand(l, frame?.signals[def.tag]?.model ?? null);
      return b ? { warnHi: b.warnHi, alarmHi: b.alarmHi, warnLo: b.warnLo, alarmLo: b.alarmLo } : undefined;
    }
  }
}

/* ==========================================================================
   Channels
   ========================================================================== */

/** D4 §4: health-scored systems carry condition signals; unscored systems (PRC-…) are process context. */
export type SignalClass = "condition" | "process";
export const CLASS_LABEL: Record<SignalClass, string> = { condition: "Machine health", process: "Process" };

export interface Channel {
  id: string;
  name: string;
  unit: string;
  component: string;
  rate: string;
  /** Catalogue system id, or TREND_GROUP for stored records with no mapped sensor. */
  group: string;
  subassembly: string;
  cls: SignalClass;
  value: number;
  /** Reference value: the live engine's reference model, else DB default baseline / record baseline. */
  baseline: number | null;
  /** Normal scatter around the reference model (σ, D5 §9.4). Null when the model has no σ. */
  sigma: number | null;
  limits?: Limits;
  decimals: number;
  reported: Zone;
  record?: TrendRecordMetric;
  /** True when the live engine keeps a rolling history for this tag. */
  live: boolean;
  /** Manual record tag (laboratory, handheld): plotted only at its dated record times, never as a live series. */
  manualRecords?: boolean;
  calculated: boolean;
  /** Live engine extras. */
  z: number | null;
  slopePerHour: number | null;
  timeToLimit: string | null;
  /** Sensor-validation verdict (live machines): Good / Suspect / Invalid; null without a live engine. */
  quality: string | null;
  /** Why validation flagged the signal, when it did. */
  qualityNote: string | null;
}

export interface StateChannel {
  id: string;
  name: string;
  component: string;
  group: string;
  display: string;
  status: CatalogSensorView["status"];
  normal: string | null;
  /** Off-normal tone when the state is not the healthy one. */
  offTone: "warn" | "bad";
  /** 1 = healthy state, 0 = off-normal, one per simulated minute (live machines only). */
  live: boolean;
}

export const TREND_GROUP = "__trend_records";

const normKey = (s: string) => s.trim().toUpperCase().replace(/[_\s]+/g, "-");
const isStateUnit = (unit: string) => unit.trim().toLowerCase() === "state";
const decimalsFor = (v: number) => (Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2);

export function classOf(systemId: string, systemName: string, defs?: PlantDefs | null): SignalClass {
  // Kiln-fleet members share one set of defs and keep the D4 prefix (DRV-KLN-02, PRC-KLN-03 …).
  const sys = defs?.systems.find((s) => s.id === systemId) ?? defs?.systems.find((s) => systemId.slice(0, 4) === s.id.slice(0, 4));
  if (sys) return sys.scored ? "condition" : "process";
  return /process/i.test(systemName) ? "process" : "condition";
}

/** `defs`: the plant definitions of the machine (defaults to `frame.defs`); null for machines without a live engine. */
export function buildChannels(
  catalog: MachineCatalog,
  history: MachineHistory,
  frame: SimFrame | null,
  defs: PlantDefs | null = frame?.defs ?? null
): { channels: Channel[]; states: StateChannel[] } {
  const recByTag = new Map(history.records.map((r) => [normKey(r.key), r]));
  const sysName = new Map(catalog.systems.map((s) => [s.systemId, s.name]));
  const used = new Set<string>();
  const channels: Channel[] = [];
  const states: StateChannel[] = [];

  for (const cs of catalog.sensors) {
    const group = cs.systemId || cs.subassemblyId || "";
    const def = defs?.signalByTag[cs.tag];
    const liveHist = Boolean(frame?.history[cs.tag]?.length);
    if (isStateUnit(cs.unit) || def?.type === "state") {
      states.push({
        id: cs.tag,
        name: cs.name,
        component: cs.subAssembly || cs.component,
        group,
        display: cs.live?.display ?? cs.value,
        status: cs.status,
        normal: def?.states?.normal ?? null,
        offTone: def?.states?.alarm?.length ? "bad" : "warn",
        live: liveHist && Boolean(def),
      });
      continue;
    }
    const record = recByTag.get(normKey(cs.tag));
    if (record) used.add(record.key);
    const recBaseline = record && Number.isFinite(record.baseline) ? record.baseline : null;
    const value = cs.numericValue;
    const live = cs.live;
    const liveDef = frame && def ? def : null;
    const manual = def?.origin === "manual" && Boolean(frame?.records?.some((r) => r.tag === cs.tag));
    channels.push({
      id: cs.tag,
      name: cs.name,
      unit: cs.unit,
      component: cs.component || cs.subAssembly,
      rate: cs.sampleRate,
      group,
      subassembly: cs.subAssembly || cs.subassemblyId,
      cls: classOf(group, sysName.get(group) ?? "", defs),
      value,
      baseline: live?.model ?? history.baselines[cs.tag] ?? recBaseline,
      sigma: liveDef && liveDef.sigma > 0 ? liveDef.sigma : null,
      limits: (liveDef && defs ? defLimits(liveDef, frame, defs) : undefined) ?? pairLimits(cs.warningVal, cs.alarmVal) ?? (record ? pairLimits(record.advisoryLimit, record.criticalLimit) : undefined),
      decimals: def?.decimals ?? decimalsFor(value),
      reported: reportedZone(cs.status),
      record,
      live: liveHist,
      ...(manual ? { manualRecords: true } : {}),
      calculated: Boolean(def?.calculated) || /^CAL-/.test(cs.tag),
      z: live?.z ?? null,
      slopePerHour: live?.slopePerHour ?? null,
      timeToLimit: live?.timeToLimit ?? null,
      quality: live?.quality ?? null,
      qualityNote: live?.qualityNote ?? null,
    });
  }

  for (const r of history.records) {
    const last = r.points[r.points.length - 1]?.value;
    if (used.has(r.key) || last === undefined) continue;
    const limits = pairLimits(r.advisoryLimit, r.criticalLimit);
    channels.push({
      id: r.key,
      name: r.label,
      unit: r.unit,
      component: "Saved trend record",
      rate: "Trend record",
      group: TREND_GROUP,
      subassembly: "",
      cls: "condition",
      value: last,
      baseline: Number.isFinite(r.baseline) ? r.baseline : null,
      sigma: null,
      limits,
      decimals: decimalsFor(last),
      reported: zoneOf(last, limits),
      record: r,
      live: false,
      calculated: false,
      z: null,
      slopePerHour: null,
      timeToLimit: null,
      quality: null,
      qualityNote: null,
    });
  }
  return { channels, states };
}

export const channelZone = (c: Channel) => worst(zoneOf(c.value, c.limits), c.reported);
export const hasHistory = (c: Channel) => c.live || Boolean(c.record) || Boolean(c.manualRecords);

/* ==========================================================================
   Series — only stored or simulated samples
   ========================================================================== */

/** Latest instant at (or strictly before) `ref` whose plant clock reads `minutes`. */
function clockBefore(minutes: number, ref: number, strict: boolean, timeZone?: string): number {
  const offset = zoneOffsetMs(ref, timeZone);
  const local = ref + offset;
  let t = local - (((local % DAY) + DAY) % DAY) + minutes * MIN - offset;
  while (strict ? t >= ref : t > ref) t -= DAY;
  return t;
}

/**
 * `trend_records.points` carry clock labels ("08:00", …, "Now") read as plant
 * wall-clock time. Anchor the newest point at the latest matching clock before
 * `now` and walk backwards, so recorded order and spacing are preserved.
 */
function recordSamples(rec: TrendRecordMetric, now: number, skipNow: boolean, timeZone?: string): TrendSample[] {
  const b = Number.isFinite(rec.baseline) ? rec.baseline : undefined;
  const out: TrendSample[] = [];
  let next = now;
  let first = true;
  for (let i = rec.points.length - 1; i >= 0; i--) {
    const p = rec.points[i];
    const label = p.time.trim().toLowerCase();
    // Readings from the database carry their acquisition time (ISO 8601).
    if (/^\d{4}-\d{2}-\d{2}t/.test(label)) {
      const t = Date.parse(p.time);
      if (Number.isFinite(t)) {
        out.push({ t, v: p.value, b });
        next = t;
        first = false;
      }
      continue;
    }
    if (label === "now") {
      if (first && !skipNow) out.push({ t: now, v: p.value, b });
      continue;
    }
    const rel = label.match(/^-(\d+(?:\.\d+)?)\s*(h|m)$/);
    if (rel) {
      const t = now - Number(rel[1]) * (rel[2] === "h" ? HOUR : MIN);
      out.push({ t, v: p.value, b });
      next = t;
      first = false;
      continue;
    }
    const m = label.match(/^(\d{1,2}):(\d{2})/);
    if (!m) continue;
    const t = clockBefore(Number(m[1]) * 60 + Number(m[2]), next, !first || out.length > 0, timeZone);
    out.push({ t, v: p.value, b });
    next = t;
    first = false;
  }
  return out.reverse();
}

/**
 * History for the window. Live machine: the engine's rolling minute history with
 * its reference-model history, preceded by older stored trend-record points.
 * Other machines: stored trend-record points only. No record → no samples.
 */
export function channelSeries(ch: Channel, span: number, now: number, frame: SimFrame | null, timeZone?: string): TrendSample[] {
  if (!now) return [];
  const from = now - span;
  // Manual records (D4 Table 6.4) are dated records: one point per record, never a per-minute series.
  if (frame && ch.manualRecords) {
    const step = simMinuteMs();
    return (frame.records ?? [])
      .filter((r) => r.tag === ch.id)
      .map((r) => ({ t: now - (frame.t - r.t) * step, v: r.value }))
      .filter((p) => p.t >= from && p.t <= now)
      .sort((a, b) => a.t - b.t);
  }
  const hist = frame?.history[ch.id];
  if (frame && hist && hist.length > 0) {
    const model = frame.modelHistory[ch.id];
    const step = simMinuteMs();
    const n = Math.min(hist.length, Math.max(2, Math.round(span / step) + 1));
    const real: TrendSample[] = new Array(n);
    for (let k = 0, i = hist.length - n; i < hist.length; i++, k++) {
      real[k] = { t: now - (hist.length - 1 - i) * step, v: hist[i], b: model?.[i] ?? ch.baseline ?? undefined };
    }
    if (!ch.record) return real;
    const older = recordSamples(ch.record, now, true, timeZone).filter((s) => s.t >= from && s.t < real[0].t);
    return older.length ? [...older, ...real] : real;
  }
  if (!ch.record) return [];
  return recordSamples(ch.record, now, false, timeZone).filter((s) => s.t >= from);
}

export interface QualitySpan {
  start: number;
  end: number;
  quality: "Suspect" | "Invalid";
}

/**
 * Spans where the engine marked the signal Suspect or Invalid (`frame.qualityHistory`:
 * 0 Good, 1 Suspect, 2 Invalid, aligned with `history`), in the same time base as
 * `channelSeries`. Empty without a per-sample quality history.
 */
export function qualitySpans(tag: string, span: number, now: number, frame: SimFrame | null): QualitySpan[] {
  const q = frame?.qualityHistory?.[tag];
  if (!frame || !q?.length || !now) return [];
  const step = simMinuteMs();
  const from = now - span;
  const at = (i: number) => now - (q.length - 1 - i) * step;
  const out: QualitySpan[] = [];
  let a = -1;
  let worstQ = 0;
  for (let i = 0; i <= q.length; i++) {
    const v = i < q.length ? q[i] : 0;
    if (v > 0) {
      if (a < 0) {
        a = i;
        worstQ = v;
      } else worstQ = Math.max(worstQ, v);
    } else if (a >= 0) {
      // A sample covers the minute up to the next one.
      const start = at(a) - step / 2;
      const end = Math.min(now, at(i - 1) + step / 2);
      if (end >= from) out.push({ start: Math.max(from, start), end, quality: worstQ >= 2 ? "Invalid" : "Suspect" });
      a = -1;
    }
  }
  return out;
}

/** State history (1 healthy / 0 off-normal), one per simulated minute, inside the window. */
export function stateSeries(tag: string, span: number, now: number, frame: SimFrame | null): Array<{ t: number; ok: boolean }> {
  const hist = frame?.history[tag];
  if (!frame || !hist?.length || !now) return [];
  const step = simMinuteMs();
  const n = Math.min(hist.length, Math.max(2, Math.round(span / step) + 1));
  const out: Array<{ t: number; ok: boolean }> = [];
  for (let i = hist.length - n; i < hist.length; i++) out.push({ t: now - (hist.length - 1 - i) * step, ok: hist[i] >= 0.5 });
  return out;
}

/** Min/max-per-bucket downsampling: keeps peaks while capping points for long windows. */
export function downsample(samples: TrendSample[], max: number): TrendSample[] {
  if (samples.length <= max || max < 4) return samples;
  const buckets = Math.floor(max / 2);
  const size = samples.length / buckets;
  const out: TrendSample[] = [];
  for (let k = 0; k < buckets; k++) {
    const a = Math.floor(k * size);
    const b = Math.min(samples.length, Math.floor((k + 1) * size));
    if (b <= a) continue;
    let lo = a;
    let hi = a;
    for (let i = a + 1; i < b; i++) {
      if (samples[i].v < samples[lo].v) lo = i;
      if (samples[i].v > samples[hi].v) hi = i;
    }
    if (lo === hi) out.push(samples[lo]);
    else if (lo < hi) out.push(samples[lo], samples[hi]);
    else out.push(samples[hi], samples[lo]);
  }
  const last = samples[samples.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

/* ==========================================================================
   Window statistics
   ========================================================================== */

export interface WindowStats {
  n: number;
  first: number;
  last: number;
  min: number;
  max: number;
  mean: number;
  sd: number;
  /** last − first over the window. */
  change: number;
  /** Largest |measured − reference| in σ: model σ on a live machine (sim.), else window σ (calc.). Null without a reference. */
  peakSigma: number | null;
  sigmaBasis: "model" | "window" | null;
  /** Share of samples outside the warning limits (0–1). */
  outside: number;
}

export function windowStats(samples: TrendSample[], ch: Channel): WindowStats | null {
  const n = samples.length;
  if (n < 2) return null;
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let out = 0;
  for (const s of samples) {
    if (s.v < min) min = s.v;
    if (s.v > max) max = s.v;
    sum += s.v;
    if (zoneOf(s.v, ch.limits) !== "normal") out++;
  }
  const mean = sum / n;
  let sq = 0;
  for (const s of samples) sq += (s.v - mean) ** 2;
  const sd = Math.sqrt(sq / n);
  const sigma = ch.sigma ?? (sd > 0 ? sd : null);
  let peakSigma: number | null = null;
  if (sigma) {
    for (const s of samples) {
      if (s.b === undefined) continue;
      const z = Math.abs(s.v - s.b) / sigma;
      if (peakSigma === null || z > peakSigma) peakSigma = z;
    }
  }
  return {
    n,
    first: samples[0].v,
    last: samples[n - 1].v,
    min,
    max,
    mean,
    sd,
    change: samples[n - 1].v - samples[0].v,
    peakSigma,
    sigmaBasis: peakSigma === null ? null : ch.sigma ? "model" : "window",
    outside: out / n,
  };
}

/* ==========================================================================
   Excursions — periods outside the limits or outside the model ±3σ band
   ========================================================================== */

export type ExcursionKind = "alarm" | "warning" | "model";

export interface Excursion {
  id: string;
  tag: string;
  name: string;
  unit: string;
  decimals: number;
  kind: ExcursionKind;
  start: number;
  end: number;
  ongoing: boolean;
  samples: number;
  peak: number;
  peakAt: number;
  peakSigma: number | null;
  /** `name` is the plain title when the rule has one; `eng` the engineering name (tooltip). */
  rule: { id: string; name: string; eng: string; status: string } | null;
}

export const MODEL_K = 3;
/** D5 §9.2: findings persist 2–4 samples before they are raised; a model-band excursion needs ≥ 2. */
const MODEL_PERSIST = 2;

function ruleFor(tag: string, frame: SimFrame | null): Excursion["rule"] {
  if (!frame) return null;
  const hits = frame.rules.filter((r) => r.status !== "QUIET" && (r.tags.includes(tag) || frame.defs.ruleById[r.id]?.inputs.includes(tag)));
  const r = hits.find((x) => x.status === "ACTIVE") ?? hits[0];
  return r ? { id: r.id, name: r.plainTitle ?? r.name, eng: r.name, status: r.status } : null;
}

export function findExcursions(ch: Channel, samples: TrendSample[], frame: SimFrame | null): Excursion[] {
  if (samples.length < 2) return [];
  const out: Excursion[] = [];
  const step = samples.length > 1 ? (samples[samples.length - 1].t - samples[0].t) / (samples.length - 1) : MIN;
  const rule = ruleFor(ch.id, frame);
  const push = (kind: ExcursionKind, a: number, b: number, peakIdx: number) => {
    const ongoing = b === samples.length - 1;
    const p = samples[peakIdx];
    out.push({
      id: `${ch.id}-${kind}-${samples[a].t}`,
      tag: ch.id,
      name: ch.name,
      unit: ch.unit,
      decimals: ch.decimals,
      kind,
      start: samples[a].t,
      end: ongoing ? samples[b].t : samples[b + 1]?.t ?? samples[b].t + step,
      ongoing,
      samples: b - a + 1,
      peak: p.v,
      peakAt: p.t,
      peakSigma: ch.sigma && p.b !== undefined ? Math.abs(p.v - p.b) / ch.sigma : null,
      rule,
    });
  };

  // Limit excursions (D5 Table 9.3: absolute limits drive alarm status).
  if (ch.limits) {
    let a = -1;
    let zone: Zone = "normal";
    let peak = -1;
    let peakE = -Infinity;
    for (let i = 0; i <= samples.length; i++) {
      const z = i < samples.length ? zoneOf(samples[i].v, ch.limits) : "normal";
      if (z !== "normal") {
        if (a < 0) {
          a = i;
          zone = z;
          peak = i;
          peakE = -Infinity;
        }
        zone = worst(zone, z);
        const e = exceedance(samples[i].v, ch.limits);
        if (e > peakE) {
          peakE = e;
          peak = i;
        }
      } else if (a >= 0) {
        push(zone === "alarm" ? "alarm" : "warning", a, i - 1, peak);
        a = -1;
      }
    }
  }

  // Reference-model excursions (D5 §9.4: residual beyond ±3σ, persisting).
  if (ch.sigma) {
    const sigma = ch.sigma;
    let a = -1;
    let peak = -1;
    let peakZ = -1;
    for (let i = 0; i <= samples.length; i++) {
      const s = samples[i];
      const z = s && s.b !== undefined ? Math.abs(s.v - s.b) / sigma : 0;
      if (z > MODEL_K) {
        if (a < 0) {
          a = i;
          peakZ = -1;
        }
        if (z > peakZ) {
          peakZ = z;
          peak = i;
        }
      } else if (a >= 0) {
        if (i - a >= MODEL_PERSIST) push("model", a, i - 1, peak);
        a = -1;
      }
    }
  }
  return out;
}

/* ==========================================================================
   Event log — stored `operating_events` + live engine events
   ========================================================================== */

export type EventCat = "alarm" | "maintenance" | "operator" | "telemetry";
export const EVENT_CAT_LABEL: Record<EventCat, string> = {
  alarm: "Alarms and problems",
  maintenance: "Maintenance",
  operator: "Operator",
  telemetry: "Sensor events",
};

export interface LogEvent {
  id: string;
  cat: EventCat;
  kind: string;
  severity: OperatingEvent["severity"];
  title: string;
  detail: string;
  source: string;
  sensor: string | null;
  value: string | null;
  rule: string | null;
  at: number;
  /** False when the stored timestamp names only a day ("3 days ago"). */
  exact: boolean;
  daysAgo: number;
  live: boolean;
}

const SENSOR_RE = /\b[A-Z]{2,4}-[A-Z]{2,4}-\d{2}\b/g;
/** Rule ids: R-SHL-03 (kiln seals), R-KFS-02 / SW-KFS-01 (pyro line). */
const RULE_RE = /\b(?:R|SW)-[A-Z]{2,3}-\d{2}\b/;
const IS_RULE = /^(?:R|SW)-[A-Z]{2,3}-\d{2}$/;

/** First signal tag named in `text`: a tag of this machine if one is named, else the first tag-shaped id that is not a rule id. */
function sensorIn(text: string, defs: PlantDefs | null): string | null {
  let first: string | null = null;
  for (const m of text.matchAll(SENSOR_RE)) {
    const t = m[0];
    if (IS_RULE.test(t) || defs?.ruleById[t]) continue;
    if (!defs || defs.signalByTag[t]) return t;
    first ??= t;
  }
  return first;
}
const VALUE_RE = /([+\-−]?\d+(?:\.\d+)?)\s?(mm\/s|mbar|bar|°C|vol%|ppm|mm|t\/h|rpm|dB|Hz|kW|ns|%)/;

function parseWhen(ts: string): { daysAgo: number; minutes: number | null; utc: boolean } {
  const s = ts.toLowerCase();
  const clock = s.match(/(\d{1,2}):(\d{2})/);
  const minutes = clock ? Number(clock[1]) * 60 + Number(clock[2]) : null;
  const n = Number(s.match(/(\d+)\s*(day|week|month)/)?.[1] ?? 1);
  let daysAgo = 0;
  if (s.startsWith("today")) daysAgo = 0;
  else if (s.startsWith("yesterday")) daysAgo = 1;
  else if (s.includes("day")) daysAgo = n;
  else if (s.includes("week")) daysAgo = 7 * n;
  else if (s.includes("month")) daysAgo = 30 * n;
  return { daysAgo, minutes, utc: /\butc\b/.test(s) };
}

function dayStart(now: number, timeZone: string | undefined, utc: boolean): number {
  const offset = utc ? 0 : zoneOffsetMs(now, timeZone);
  const local = now + offset;
  return local - (((local % DAY) + DAY) % DAY) - offset;
}

function calendarDaysAgo(at: number, now: number, timeZone: string | undefined): number {
  const a = zonedParts(at, timeZone);
  const b = zonedParts(now, timeZone);
  return Math.max(0, Math.round((Date.UTC(b.year, b.month, b.day) - Date.UTC(a.year, a.month, a.day)) / DAY));
}

function storedEvent(e: OperatingEvent, now: number, timeZone: string | undefined, defs: PlantDefs | null): LogEvent {
  const text = `${e.title} ${e.description}`;
  const v = e.description.match(VALUE_RE) ?? e.title.match(VALUE_RE);
  const when = parseWhen(e.timestamp);
  // Stored timestamps are relative labels; with a parsed date, normalise to the calendar.
  const parsed = Date.parse(e.timestamp);
  const absolute = Number.isFinite(parsed) && /\d{4}-\d{2}-\d{2}/.test(e.timestamp);
  const exact = absolute || when.minutes !== null;
  const at = absolute ? parsed : dayStart(now, timeZone, when.utc) - when.daysAgo * DAY + (when.minutes ?? 720) * MIN;
  const cat: EventCat =
    e.type === "Maintenance Log" || e.type === "Inspection"
      ? "maintenance"
      : e.severity !== "Normal"
        ? "alarm"
        : e.type === "Operating Change"
          ? "operator"
          : "telemetry";
  return {
    id: e.id,
    cat,
    kind: e.type,
    severity: e.severity,
    title: e.title,
    detail: e.description,
    source: e.source,
    sensor: sensorIn(text, defs),
    value: v ? `${v[1].replace("-", "−")} ${v[2]}` : null,
    rule: text.match(RULE_RE)?.[0] ?? null,
    at,
    exact,
    daysAgo: exact ? calendarDaysAgo(at, now, timeZone) : when.daysAgo,
    live: false,
  };
}

const LIVE_KIND: Record<SimFrame["events"][number]["kind"], { cat: EventCat; kind: string; source: string }> = {
  rule: { cat: "alarm", kind: "Problem found", source: "Automatic checks" },
  limit: { cat: "alarm", kind: "Crossed a limit", source: "Limit alarms" },
  quality: { cat: "telemetry", kind: "Sensor check", source: "Automatic sensor checks" },
  state: { cat: "telemetry", kind: "Status change", source: "Plant control system" },
  scenario: { cat: "operator", kind: "Operating change", source: "Demo scenario" },
  action: { cat: "operator", kind: "Operator action", source: "Operator action" },
};

function liveEvents(frame: SimFrame, now: number, timeZone: string | undefined): LogEvent[] {
  return frame.events.map((e, i) => {
    const at = simTimeMs(e.t);
    const k = LIVE_KIND[e.kind];
    const text = `${e.title} ${e.detail}`;
    return {
      id: `live-${e.t}-${i}`,
      cat: e.kind === "action" && e.action?.kind === "repair" ? "maintenance" : k.cat,
      kind: e.action ? `${e.action.auto ? "Automatic crew" : "Operator"} · ${e.action.kind}` : k.kind,
      severity: e.severity,
      title: e.title,
      detail: e.detail,
      source: k.source,
      sensor: sensorIn(text, frame.defs),
      value: null,
      rule: e.action?.ruleId ?? text.match(RULE_RE)?.[0] ?? null,
      at,
      exact: true,
      daysAgo: calendarDaysAgo(at, now, timeZone),
      live: true,
    };
  });
}

export function buildEvents(
  history: MachineHistory,
  frame: SimFrame | null,
  now: number,
  timeZone: string | undefined,
  defs: PlantDefs | null = frame?.defs ?? null
): LogEvent[] {
  if (!now) return [];
  const stored = history.events.map((e) => storedEvent(e, now, timeZone, defs));
  const all = frame ? [...liveEvents(frame, now, timeZone), ...stored] : stored;
  return all.sort((a, b) => b.at - a.at);
}

export function dayLabel(d: number): string {
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 14) return `${d} days ago`;
  if (d < 28) return `${Math.round(d / 7)} weeks ago`;
  return `${Math.round(d / 30)} months ago`;
}

export const SEVERITY_TONE: Record<OperatingEvent["severity"], Tone> = { Normal: "idle", Alert: "warn", Critical: "bad" };

/* ==========================================================================
   Compare presets — signals that belong together
   ========================================================================== */

export interface ComparePreset {
  id: string;
  label: string;
  /** Tooltip: the rule ID or tags behind the label. */
  title?: string;
  tags: string[];
}

/** A group of tags that belong together in the machine's DB catalogue (a sub-assembly). */
export interface CatalogGroup {
  id: string;
  name: string;
  tags: string[];
}

const MAX_COMPARE = 4;

/** The D5 Table 9.5 reference-model equation for `tag`; kiln-seal fleet only (the pyro line has no published equations). */
export function referenceEquation(defs: PlantDefs | null | undefined, tag: string): Equation | undefined {
  return defs?.plant === "kiln" ? EQUATION_BY_TARGET[tag] : undefined;
}

/**
 * Relationship groups for Compare, restricted to signals with samples in the window.
 * Kiln-seal fleet: the active signal's D5 Table 9.5 model inputs, then the
 * catalogue's sub-assemblies with two or more trended signals (live only), the
 * active signal's sub-assembly first. Other live machines: the inputs of each
 * rule in `defs.rules`, rules that use the active signal first.
 */
export function comparePresets(
  defs: PlantDefs | null | undefined,
  activeId: string | undefined,
  trendIds: ReadonlySet<string>,
  live: boolean,
  groups: ReadonlyArray<CatalogGroup> = [],
): ComparePreset[] {
  const list: ComparePreset[] = [];
  if (!defs) return list;
  if (defs.plant === "kiln") {
    if (activeId && trendIds.has(activeId)) {
      const inputs = (EQUATION_BY_TARGET[activeId]?.inputs ?? []).filter((t) => trendIds.has(t));
      if (inputs.length) list.push({ id: "model", label: `${displayName(defs.signalByTag[activeId]?.name ?? activeId)} and what drives it`, title: activeId, tags: [activeId, ...inputs].slice(0, MAX_COMPARE) });
    }
    if (live) {
      const withActive: ComparePreset[] = [];
      const rest: ComparePreset[] = [];
      for (const g of groups) {
        const inputs = g.tags.filter((t) => trendIds.has(t));
        const hasActive = activeId !== undefined && inputs.includes(activeId);
        const tags = (hasActive ? [activeId, ...inputs.filter((t) => t !== activeId)] : inputs).slice(0, MAX_COMPARE);
        if (tags.length < 2) continue;
        (hasActive ? withActive : rest).push({ id: `sub-${g.id}`, label: g.name, title: tags.join(" · "), tags });
      }
      list.push(...withActive, ...rest);
    }
    return list;
  }
  const seen = new Set<string>();
  const withActive: ComparePreset[] = [];
  const rest: ComparePreset[] = [];
  for (const r of defs.rules) {
    const inputs = [...new Set(r.inputs)].filter((t) => trendIds.has(t));
    const hasActive = activeId !== undefined && inputs.includes(activeId);
    const tags = (hasActive ? [activeId, ...inputs.filter((t) => t !== activeId)] : inputs).slice(0, MAX_COMPARE);
    if (tags.length < 2) continue;
    const key = [...tags].sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    (hasActive ? withActive : rest).push({ id: r.id, label: r.plainTitle ?? r.name, title: `${r.id} · ${r.name}`, tags });
  }
  return [...withActive, ...rest];
}

/* ==========================================================================
   Formatting
   ========================================================================== */

/** Fixed decimals with a true minus sign and thousands separators. */
export function fmt(v: number | null | undefined, decimals = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const s = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return v < 0 && Number(Math.abs(v).toFixed(decimals)) !== 0 ? `−${s}` : s;
}

export const fmtSigned = (v: number, d = 2) => `${v >= 0 ? "+" : ""}${fmt(v, d)}`;

/** Duration in ms → "42 s", "3 min", "2 h 10 min", "3 d". */
export function fmtSpan(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
  return `${Math.round(h / 24)} d`;
}

/* ==========================================================================
   CSV export of exactly what is plotted
   ========================================================================== */

export function downloadCsv(filename: string, rows: Array<{ ch: Channel; samples: TrendSample[] }>, basis: string) {
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = [`# ${basis}`, "time_utc,tag,signal,unit,value,reference"];
  for (const { ch, samples } of rows) {
    for (const s of samples) {
      lines.push([new Date(s.t).toISOString(), q(ch.id), q(ch.name), q(ch.unit), String(s.v), s.b === undefined ? "" : String(s.b)].join(","));
    }
  }
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.replace(/[^\w.-]+/g, "_");
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
