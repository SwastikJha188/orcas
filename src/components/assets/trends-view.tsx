"use client";

import React, { useMemo, useState, useSyncExternalStore } from "react";
import type { AssetMachine, OperatingEvent } from "./assets-data";
import type { KilnSimulation } from "./kiln-seals-simulation";
import { formatDuration, simMinuteMs, simTimeMs, type SimFrame } from "@/lib/kiln-sim/engine";
import { useKilnSimulationFor } from "@/providers/kiln-simulation-context";
import { useMachineCatalog, type CatalogSensorView } from "./use-machine-catalog";
import { useMachineHistory, type TrendRecordMetric } from "./use-machine-history";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import { zoneOffsetMs } from "@/lib/time";
import {
  LimitMode,
  Tone,
  TrendChart,
  TrendLimits,
  TrendMarker,
  TrendSample,
  TrendTimeZoneContext,
  fmtNum,
  fmtValue,
} from "./sensor-trend-graph";
import "./diagnosis/trends.css";

export interface TrendsViewProps {
  machine: AssetMachine;
  simulation?: KilnSimulation;
  onNavigateToSensors?: () => void;
  onNavigateToDiagnosis?: () => void;
}

/* ==========================================================================
   Model
   ========================================================================== */

type Zone = "normal" | "warning" | "alarm";
type TimeWindow = "live" | "1h" | "8h" | "24h" | "7d";
type Layout = "focus" | "grid";
type EventFilter = "all" | "maintenance" | "telemetry" | "alarm";

interface Channel {
  id: string;
  name: string;
  unit: string;
  component: string;
  rate: string;
  /** Catalogue group (DB system id), or TREND_GROUP for trend records with no mapped sensor. */
  group: string;
  value: number;
  /** DB `default_baseline` (or the live reference model on KLN-01); null when none is stored. */
  baseline: number | null;
  /** DB warning / alarm limits; undefined when the catalogue stores none. */
  limits?: TrendLimits;
  decimals: number;
  /** Catalogue-reported state, merged with the limit-derived zone. */
  reported: Zone;
  /** Stored `trend_records` history for this channel, if any. */
  record?: TrendRecordMetric;
}

interface StateRow {
  id: string;
  name: string;
  component: string;
  group: string;
  display: string;
  status: CatalogSensorView["status"];
}

const TREND_GROUP = "__trend_records";

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** Live window matches the simulation's rolling buffer (41 samples × 3 s). */
const WINDOW_MS: Record<TimeWindow, number> = { live: 2 * MIN, "1h": HOUR, "8h": 8 * HOUR, "24h": DAY, "7d": 7 * DAY };
const WINDOW_ITEMS: Array<{ id: TimeWindow; label: string }> = [
  { id: "live", label: "Live" },
  { id: "1h", label: "1h" },
  { id: "8h", label: "8h" },
  { id: "24h", label: "24h" },
  { id: "7d", label: "7d" },
];
const LAYOUT_ITEMS: Array<{ id: Layout; label: string }> = [
  { id: "focus", label: "Focus" },
  { id: "grid", label: "Grid" },
];

const ZONE_TONE: Record<Zone, Tone> = { normal: "good", warning: "warn", alarm: "bad" };
const ZONE_LABEL: Record<Zone, string> = { normal: "Normal", warning: "Warning", alarm: "Alarm" };
const ZONE_RANK: Record<Zone, number> = { normal: 0, warning: 1, alarm: 2 };

const modeOf = (warn: number, alarm: number): LimitMode => (alarm < warn ? "low" : "high");

function zoneOf(v: number, limits: TrendLimits | undefined): Zone {
  if (!limits) return "normal";
  const { warn, alarm, mode } = limits;
  if (mode === "low") return v <= alarm ? "alarm" : v <= warn ? "warning" : "normal";
  const x = mode === "abs" ? Math.abs(v) : v;
  return x >= alarm ? "alarm" : x >= warn ? "warning" : "normal";
}

const worst = (a: Zone, b: Zone): Zone => (ZONE_RANK[a] >= ZONE_RANK[b] ? a : b);
const reportedZone = (s: string): Zone => (s === "Critical" ? "alarm" : s === "Advisory" ? "warning" : "normal");
const decimalsFor = (v: number) => (Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2);

/** DB warning / alarm pair → chart limits; both zero (or equal) means the catalogue stores no limits. */
function limitsOf(warn: number, alarm: number): TrendLimits | undefined {
  if (!Number.isFinite(warn) || !Number.isFinite(alarm) || warn === alarm) return undefined;
  return { warn, alarm, mode: modeOf(warn, alarm) };
}

/** Trend-record keys (`vib_rms`) and catalogue tags (`VIB-RMS`) compared on one spelling. */
const normKey = (s: string) => s.trim().toUpperCase().replace(/[_\s]+/g, "-");

const isState = (unit: string) => unit.trim().toLowerCase() === "state";

/* --------------------------------------------------------------------------
   Series — only stored or simulated samples, never invented ones
   -------------------------------------------------------------------------- */

/** Latest instant at (or strictly before) `ref` whose plant clock reads `minutes`. */
function clockBefore(minutes: number, ref: number, strict: boolean, timeZone?: string): number {
  // Stored clock labels are plant wall-clock time, so they are read in the plant's zone.
  const offset = zoneOffsetMs(ref, timeZone);
  const local = ref + offset;
  let t = local - (((local % DAY) + DAY) % DAY) + minutes * MIN - offset;
  while (strict ? t >= ref : t > ref) t -= DAY;
  return t;
}

/**
 * `trend_records.points` carry clock labels ("08:00", …, "Now"). Anchor the
 * newest point at the latest matching clock before `now` ("Now" = now) and walk
 * backwards, so recorded order and spacing are preserved.
 */
function recordSamples(rec: TrendRecordMetric, now: number, skipNow: boolean, timeZone?: string): TrendSample[] {
  const b = Number.isFinite(rec.baseline) ? rec.baseline : undefined;
  const out: TrendSample[] = [];
  let next = now;
  let first = true;
  for (let i = rec.points.length - 1; i >= 0; i--) {
    const p = rec.points[i];
    const label = p.time.trim().toLowerCase();
    if (label === "now") {
      if (first && !skipNow) out.push({ t: now, v: p.value, b });
      continue;
    }
    // Relative offsets ("-23h", "-90m") are anchored to now.
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
 * Live kiln windows in simulated minutes. The engine keeps 6 h of one-minute
 * samples; on screen a simulated minute lasts `simMinuteMs()` of local time,
 * so the windows are labelled by the real time they cover.
 */
const SIM_WINDOW_MIN: Partial<Record<TimeWindow, number>> = { live: 60, "1h": 180, "8h": 360 };
const simWindowItems = (): Array<{ id: TimeWindow; label: string }> =>
  (Object.entries(SIM_WINDOW_MIN) as Array<[TimeWindow, number]>).map(([id, min]) => ({
    id,
    label: id === "live" ? "Live" : formatDuration(min),
  }));

/**
 * History for the window. KLN-01: the engine's rolling minute history, with
 * older stored trend-record points in front of it. Other machines: stored
 * trend-record points only. No record → no samples (the panel says so).
 */
function channelSeries(ch: Channel, span: number, now: number, frame: SimFrame | null, timeZone?: string): TrendSample[] {
  if (!now) return [];
  const from = now - span;
  const hist = frame?.history[ch.id];
  if (frame && hist && hist.length > 0) {
    const model = frame.modelHistory[ch.id];
    const step = simMinuteMs();
    const n = Math.min(hist.length, Math.max(2, Math.round(span / step)));
    const real: TrendSample[] = [];
    for (let i = hist.length - n; i < hist.length; i++) {
      real.push({ t: now - (hist.length - 1 - i) * step, v: hist[i], b: model?.[i] ?? ch.baseline ?? undefined });
    }
    const older = ch.record ? recordSamples(ch.record, now, true, timeZone).filter((s) => s.t >= from && s.t < real[0].t) : [];
    return [...older, ...real];
  }
  if (!ch.record) return [];
  return recordSamples(ch.record, now, false, timeZone).filter((s) => s.t >= from);
}

interface WindowStats {
  current: number;
  peak: number;
  mean: number;
  sigma: number;
  delta: number | null;
  margin: number | null;
}

function windowStats(samples: TrendSample[], ch: Channel): WindowStats | null {
  if (samples.length < 2) return null;
  const vals = samples.map((s) => s.v);
  const n = vals.length;
  const mean = vals.reduce((a, b) => a + b, 0) / n;
  const sigma = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  const mode = ch.limits?.mode ?? "high";
  const peak = mode === "low" ? Math.min(...vals) : mode === "abs" ? Math.max(...vals.map(Math.abs)) : Math.max(...vals);
  const current = vals[n - 1];
  const warn = ch.limits?.warn;
  const margin = warn === undefined ? null : mode === "low" ? current - warn : mode === "abs" ? warn - Math.abs(current) : warn - current;
  return { current, peak, mean, sigma, delta: ch.baseline === null ? null : current - ch.baseline, margin };
}

/* --------------------------------------------------------------------------
   Shared clock (SSR-safe: server snapshot is 0, client ticks every 3 s)
   -------------------------------------------------------------------------- */

let clockNow = 0;
let clockTimer: ReturnType<typeof setInterval> | null = null;
const clockListeners = new Set<() => void>();

function subscribeClock(cb: () => void) {
  clockListeners.add(cb);
  if (!clockTimer) {
    clockNow = Date.now();
    clockTimer = setInterval(() => {
      clockNow = Date.now();
      clockListeners.forEach((l) => l());
    }, 3000);
  }
  return () => {
    clockListeners.delete(cb);
    if (clockListeners.size === 0 && clockTimer) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
  };
}

const useClock = () =>
  useSyncExternalStore(
    subscribeClock,
    () => {
      if (!clockNow) clockNow = Date.now();
      return clockNow;
    },
    () => 0
  );

/* --------------------------------------------------------------------------
   Event log
   -------------------------------------------------------------------------- */

interface LogEvent {
  id: string;
  kind: OperatingEvent["type"];
  severity: OperatingEvent["severity"];
  title: string;
  detail: string;
  source: string;
  sensor: string | null;
  value: string | null;
  daysAgo: number;
  minutes: number | null;
  /** Absolute time (ms) for live simulation events; places the chart marker exactly. */
  at?: number;
}

const SENSOR_RE = /\b[A-Z]{2,4}-[A-Z]{2,4}-\d{2}\b/;
const VALUE_RE = /([+\-−]?\d+(?:\.\d+)?)\s?(mm\/s|mbar|bar|°C|vol%|mm|t\/h|rpm|dB|Hz|kW|ns|%)/;

function parseWhen(ts: string): { daysAgo: number; minutes: number | null } {
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
  return { daysAgo, minutes };
}

function toLogEvent(e: OperatingEvent): LogEvent {
  const text = `${e.title} ${e.description}`;
  const v = e.description.match(VALUE_RE) ?? e.title.match(VALUE_RE);
  return {
    id: e.id,
    kind: e.type,
    severity: e.severity,
    title: e.title,
    detail: e.description,
    source: e.source,
    sensor: text.match(SENSOR_RE)?.[0] ?? null,
    value: v ? `${v[1].replace("-", "−")} ${v[2]}` : null,
    ...parseWhen(e.timestamp),
  };
}

function dayLabel(d: number): string {
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 14) return `${d} d ago`;
  if (d < 28) return `${Math.round(d / 7)} wk ago`;
  return `${Math.round(d / 30)} mo ago`;
}

const sortKey = (e: LogEvent) => e.daysAgo * 1440 - (e.minutes ?? 720);

/** Simulated clock → epoch ms (local time, so axis labels read the plant clock). */

function liveEvents(frame: SimFrame): LogEvent[] {
  return frame.events.map((e, i) => {
    const sensor = e.title.match(SENSOR_RE)?.[0] ?? e.detail.match(SENSOR_RE)?.[0] ?? null;
    const shown = new Date(simTimeMs(e.t));
    const minutes = shown.getHours() * 60 + shown.getMinutes();
    return {
      id: `live-${e.t}-${i}`,
      kind: e.kind === "scenario" ? "Operating Change" : e.kind === "quality" ? "Inspection" : "Telemetry Advisory",
      severity: e.severity,
      title: e.title,
      detail: e.detail,
      source: e.kind === "rule" ? "ULTRON rule engine" : e.kind === "quality" ? "Sensor validation" : e.kind === "scenario" ? "Demonstration scenario" : "PLC / DCS status",
      sensor,
      value: null,
      daysAgo: 0,
      minutes,
      at: simTimeMs(e.t),
    };
  });
}

/** The machine's `operating_events` rows (via /api/history), newest first. */
function storedEvents(rows: OperatingEvent[]): LogEvent[] {
  return rows.map(toLogEvent).sort((a, b) => sortKey(a) - sortKey(b));
}

const SEVERITY_TONE: Record<OperatingEvent["severity"], Tone> = { Normal: "good", Advisory: "warn", Critical: "bad" };

function matchesFilter(e: LogEvent, f: EventFilter): boolean {
  if (f === "all") return true;
  if (f === "maintenance") return e.kind === "Maintenance Log" || e.kind === "Inspection";
  if (f === "telemetry") return e.kind === "Telemetry Advisory" || e.kind === "Operating Change";
  return e.severity !== "Normal";
}

/* ==========================================================================
   Small UI primitives
   ========================================================================== */

interface PillItem<T extends string> {
  id: T;
  label: string;
  tone?: Tone | null;
  count?: number;
}

function Pills<T extends string>({
  items,
  value,
  onChange,
  label,
  className = "",
}: {
  items: PillItem<T>[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div className={`nav-pill-group dxt-pills ${className}`} role="tablist" aria-label={label}>
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          role="tab"
          aria-selected={it.id === value}
          className={`nav-pill ${it.id === value ? "active" : ""}`}
          onClick={() => onChange(it.id)}
        >
          {it.tone && (
            <>
              <span className={`dxt-dot dxt-tone--${it.tone}`} aria-hidden="true" />
              <span className="dxt-sr">{it.tone === "bad" ? "Alarm: " : "Warning: "}</span>
            </>
          )}
          {it.label}
          {typeof it.count === "number" && <span className="dxt-count">{it.count}</span>}
        </button>
      ))}
    </div>
  );
}

function ZoneChip({ zone }: { zone: Zone }) {
  return (
    <span className={`dxt-chip dxt-tone--${ZONE_TONE[zone]}`}>
      <span className="dxt-dot" />
      {ZONE_LABEL[zone]}
    </span>
  );
}

const ICON_PROPS = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function EventIcon({ kind }: { kind: OperatingEvent["type"] }) {
  if (kind === "Telemetry Advisory") return <svg {...ICON_PROPS}><polyline points="3 12 7 12 10 5 14 19 17 12 21 12" /></svg>;
  if (kind === "Maintenance Log")
    return <svg {...ICON_PROPS}><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z" /></svg>;
  if (kind === "Operating Change")
    return <svg {...ICON_PROPS}><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="17" x2="20" y2="17" /><circle cx="9" cy="7" r="2" /><circle cx="15" cy="17" r="2" /></svg>;
  return <svg {...ICON_PROPS}><rect x="5" y="4" width="14" height="17" rx="2" /><polyline points="9 13 11 15 15 11" /></svg>;
}

/* ==========================================================================
   Focus panel — one large chart with readouts
   ========================================================================== */

function FocusPanel({
  channel,
  samples,
  domain,
  markers,
  onNavigateToSensors,
}: {
  channel: Channel;
  samples: TrendSample[];
  domain: [number, number];
  markers: TrendMarker[];
  onNavigateToSensors?: () => void;
}) {
  const stats = useMemo(() => windowStats(samples, channel), [samples, channel]);
  const { unit, decimals: d } = channel;
  const zone = worst(zoneOf(stats?.current ?? channel.value, channel.limits), channel.reported);
  const signed = (v: number) => `${v >= 0 ? "+" : ""}${fmtValue(v, unit, d)}`;

  const cells: Array<[string, string]> = [];
  if (channel.baseline !== null) cells.push(["Baseline", fmtValue(channel.baseline, unit, d)]);
  if (channel.limits) {
    cells.push(["Warning", fmtValue(channel.limits.warn, unit, d)], ["Alarm", fmtValue(channel.limits.alarm, unit, d)]);
  }
  if (stats) {
    if (stats.delta !== null) cells.push(["Δ baseline", signed(stats.delta)]);
    cells.push(
      [channel.limits?.mode === "low" ? "Min" : "Peak", fmtValue(stats.peak, unit, d)],
      ["Mean", fmtValue(stats.mean, unit, d)],
      ["σ", fmtValue(stats.sigma, unit, Math.min(3, d + 1))],
    );
    if (stats.margin !== null) cells.push(["Warning margin", signed(stats.margin)]);
  }

  return (
    <section className="dxt-card dxt-focus" aria-label={`${channel.name} trend`}>
      <header className="dxt-card-head">
        <div className="dxt-head-text">
          <h3 className="dxt-title">{channel.name}</h3>
          <span className="dxt-meta">
            {channel.id} · {channel.component} · {channel.rate}
          </span>
        </div>
        <div className="dxt-head-right">
          <ZoneChip zone={zone} />
          {onNavigateToSensors && (
            <button type="button" className="dxt-icon-btn" onClick={onNavigateToSensors} aria-label="Open sensor mapping" title="Sensor mapping">
              <svg {...ICON_PROPS}><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3" /></svg>
            </button>
          )}
        </div>
      </header>

      <div className="dxt-readouts">
        <div className="dxt-hero">
          <span className="dxt-hero-value">{fmtNum(stats?.current ?? channel.value, d)}</span>
          <span className="dxt-hero-unit">{unit}</span>
        </div>
        <dl className="dxt-stats">
          {cells.map(([k, v]) => (
            <div key={k} className="dxt-stat">
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="dxt-legend" aria-hidden="true">
        <span><i className="dxt-key dxt-key--line" />Measured</span>
        {channel.baseline !== null && <span><i className="dxt-key dxt-key--base" />Baseline</span>}
        {channel.limits && <span><i className="dxt-key dxt-key--warn" />Warning zone</span>}
        {channel.limits && <span><i className="dxt-key dxt-key--bad" />Alarm zone</span>}
        {markers.length > 0 && <span><i className="dxt-key dxt-key--event" />Event</span>}
      </div>

      {samples.length > 1 ? (
        <TrendChart
          samples={samples}
          timeDomain={domain}
          unit={unit}
          limits={channel.limits}
          markers={markers}
          decimals={d}
          ariaLabel={
            channel.limits
              ? `${channel.name} in ${unit} with warning limit ${fmtValue(channel.limits.warn, unit, d)} and alarm limit ${fmtValue(channel.limits.alarm, unit, d)}`
              : `${channel.name} in ${unit}`
          }
        />
      ) : (
        <NoHistory channel={channel} height={320} />
      )}
    </section>
  );
}

/** Honest empty chart: stored history exists but not in this window, or none is recorded at all. */
function NoHistory({ channel, height }: { channel: Channel; height: number }) {
  return (
    <div
      className="dxt-meta"
      role="note"
      style={{ height, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 16px" }}
    >
      {channel.record
        ? "No stored samples in this window. Widen the time window to see the recorded history."
        : "No history recorded for this sensor. Showing the current value only."}
    </div>
  );
}

/* ==========================================================================
   Grid — equal small multiples on a shared time axis
   ========================================================================== */

function GridTile({
  channel,
  samples,
  domain,
  onFocus,
}: {
  channel: Channel;
  samples: TrendSample[];
  domain: [number, number];
  onFocus: () => void;
}) {
  const current = samples.length ? samples[samples.length - 1].v : channel.value;
  const zone = worst(zoneOf(current, channel.limits), channel.reported);
  return (
    <article className="dxt-card dxt-tile" onClick={onFocus}>
      <header className="dxt-tile-head">
        <button type="button" className="dxt-tile-name" aria-label={`Focus ${channel.name}`}>
          <span className="dxt-title dxt-ellipsis">{channel.name}</span>
          <span className="dxt-meta">{channel.id}</span>
        </button>
        <ZoneChip zone={zone} />
      </header>
      <div className="dxt-tile-value">
        <span className="dxt-mid">{fmtNum(current, channel.decimals)}</span>
        <span className="dxt-hero-unit">{channel.unit}</span>
      </div>
      {samples.length > 1 ? (
        <TrendChart
          variant="mini"
          samples={samples}
          timeDomain={domain}
          unit={channel.unit}
          limits={channel.limits}
          decimals={channel.decimals}
          ariaLabel={`${channel.name} trend in ${channel.unit}`}
        />
      ) : (
        <NoHistory channel={channel} height={128} />
      )}
    </article>
  );
}

/* ==========================================================================
   Event log — divider list with capsule row hover
   ========================================================================== */

const EVENT_FILTERS: Array<{ id: EventFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "maintenance", label: "Maintenance" },
  { id: "telemetry", label: "Telemetry" },
  { id: "alarm", label: "Alarm" },
];

function EventLog({ events, onOpen }: { events: LogEvent[]; onOpen?: () => void }) {
  const [filter, setFilter] = useState<EventFilter>("all");
  const items = EVENT_FILTERS.map((f) => ({ ...f, count: events.filter((e) => matchesFilter(e, f.id)).length }));
  const rows = events.filter((e) => matchesFilter(e, filter));

  return (
    <section className="dxt-card" aria-label="Event log">
      <header className="dxt-card-head">
        <h3 className="dxt-title">Event log</h3>
        <Pills items={items} value={filter} onChange={setFilter} label="Event type" className="dxt-pills--sm" />
      </header>
      <div className="dxt-table-wrap">
        <table className="dxt-table">
          <thead>
            <tr>
              <th scope="col">Time (UTC)</th>
              <th scope="col">Type</th>
              <th scope="col">Sensor</th>
              <th scope="col">Message</th>
              <th scope="col" className="dxt-num">Value</th>
              {onOpen && <th scope="col" aria-label="Actions" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id}>
                <td className="dxt-nowrap">
                  <span className="dxt-strong">{dayLabel(e.daysAgo)}</span>
                  {e.minutes !== null && (
                    <span className="dxt-muted dxt-num-inline">
                      {String(Math.floor(e.minutes / 60)).padStart(2, "0")}:{String(e.minutes % 60).padStart(2, "0")}
                    </span>
                  )}
                </td>
                <td>
                  <span className={`dxt-badge dxt-tone--${SEVERITY_TONE[e.severity]}`} title={`${e.kind} · ${e.severity}`}>
                    <EventIcon kind={e.kind} />
                    <span className="dxt-sr">{`${e.kind}, ${e.severity}`}</span>
                  </span>
                </td>
                <td className="dxt-nowrap dxt-mono">{e.sensor ?? <span className="dxt-muted">—</span>}</td>
                <td className="dxt-msg" title={`${e.detail} — ${e.source}`}>
                  {e.title}
                </td>
                <td className="dxt-num dxt-nowrap">{e.value ?? <span className="dxt-muted">—</span>}</td>
                {onOpen && (
                  <td className="dxt-action">
                    <button type="button" className="dxt-icon-btn" onClick={onOpen} aria-label={`Open diagnosis for ${e.title}`}>
                      <svg {...ICON_PROPS}><polyline points="9 6 15 12 9 18" /></svg>
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={onOpen ? 6 : 5} className="dxt-muted dxt-empty-row">
                  {events.length === 0 ? "No operating events recorded for this machine" : "No events of this type"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ==========================================================================
   State signals — discrete catalogue signals (unit "state") as rows, not charts
   ========================================================================== */

function StateList({ rows }: { rows: StateRow[] }) {
  return (
    <section className="dxt-card" aria-label="State signals">
      <header className="dxt-card-head">
        <h3 className="dxt-title">State signals</h3>
        <span className="dxt-meta">{rows.length}</span>
      </header>
      <div className="dxt-table-wrap">
        <table className="dxt-table">
          <thead>
            <tr>
              <th scope="col">Sensor</th>
              <th scope="col">Signal</th>
              <th scope="col">Component</th>
              <th scope="col">State</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="dxt-nowrap dxt-mono">{r.id}</td>
                <td className="dxt-msg">{r.name}</td>
                <td className="dxt-muted">{r.component || "—"}</td>
                <td className="dxt-nowrap dxt-strong">{r.display || "—"}</td>
                <td className="dxt-nowrap">
                  <ZoneChip zone={reportedZone(r.status)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ==========================================================================
   Page
   ========================================================================== */

export function TrendsView({ machine, simulation, onNavigateToSensors, onNavigateToDiagnosis }: TrendsViewProps) {
  const catalog = useMachineCatalog(machine);
  const history = useMachineHistory(machine.id);
  const { timeZone } = useSiteTimeZone({ machineId: machine.id });
  const liveSim = useKilnSimulationFor(machine.id);
  const frame = liveSim?.frame ?? simulation?.frame ?? null;
  const wallNow = useClock();
  // Live kiln: the axis runs on the simulated plant clock.
  const now = frame ? simTimeMs(frame.t) : wallNow;
  const windowItems = frame ? simWindowItems() : WINDOW_ITEMS;

  const [selectedId, setSelectedId] = useState<string>("");
  const [group, setGroup] = useState<string>("all");
  const [layout, setLayout] = useState<Layout>("focus");
  // Stored trend records span hours, so non-live machines open on the 24 h window.
  const [win, setWin] = useState<TimeWindow>(frame ? "live" : "24h");

  /** Every DB catalogue sensor: numeric ones as chart channels, `state` ones as rows. Trend records with no mapped sensor become their own channels. */
  const { channels, states } = useMemo(() => {
    const recByTag = new Map(history.records.map((r) => [normKey(r.key), r]));
    const usedRecords = new Set<string>();
    const channels: Channel[] = [];
    const states: StateRow[] = [];
    for (const cs of catalog.sensors) {
      const group = cs.systemId || cs.subassemblyId || "";
      if (isState(cs.unit)) {
        states.push({ id: cs.tag, name: cs.name, component: cs.component, group, display: cs.live?.display ?? cs.value, status: cs.status });
        continue;
      }
      const record = recByTag.get(normKey(cs.tag));
      if (record) usedRecords.add(record.key);
      const recBaseline = record && Number.isFinite(record.baseline) ? record.baseline : null;
      const value = cs.numericValue;
      channels.push({
        id: cs.tag,
        name: cs.name,
        unit: cs.unit,
        component: cs.component || cs.subAssembly,
        rate: cs.sampleRate,
        group,
        value,
        baseline: cs.live?.model ?? history.baselines[cs.tag] ?? recBaseline,
        limits: limitsOf(cs.warningVal, cs.alarmVal) ?? (record ? limitsOf(record.advisoryLimit, record.criticalLimit) : undefined),
        decimals: decimalsFor(value),
        reported: reportedZone(cs.status),
        record,
      });
    }
    for (const r of history.records) {
      const last = r.points[r.points.length - 1]?.value;
      if (usedRecords.has(r.key) || last === undefined) continue;
      const limits = limitsOf(r.advisoryLimit, r.criticalLimit);
      channels.push({
        id: r.key,
        name: r.label,
        unit: r.unit,
        component: "Stored trend record",
        rate: "Trend record",
        group: TREND_GROUP,
        value: last,
        baseline: Number.isFinite(r.baseline) ? r.baseline : null,
        limits,
        decimals: decimalsFor(last),
        reported: zoneOf(last, limits),
        record: r,
      });
    }
    return { channels, states };
  }, [catalog.sensors, history.records, history.baselines]);

  const groupItems = useMemo<PillItem<string>[]>(() => {
    const used = new Set([...channels.map((c) => c.group), ...states.map((s) => s.group)]);
    const items: PillItem<string>[] = catalog.systems
      .filter((sy) => used.has(sy.systemId))
      .map((sy) => ({ id: sy.systemId, label: sy.shortName || sy.name }));
    if (used.has(TREND_GROUP)) items.push({ id: TREND_GROUP, label: "Trend records" });
    return items.length > 1 ? [{ id: "all", label: "All" }, ...items] : [];
  }, [catalog.systems, channels, states]);

  const activeGroup = groupItems.some((g) => g.id === group) ? group : "all";
  const visible = useMemo(() => (activeGroup === "all" ? channels : channels.filter((c) => c.group === activeGroup)), [channels, activeGroup]);
  const visibleStates = useMemo(() => (activeGroup === "all" ? states : states.filter((s) => s.group === activeGroup)), [states, activeGroup]);

  const active = visible.find((c) => c.id === selectedId) ?? visible[0];
  const span = frame ? (SIM_WINDOW_MIN[win] ?? SIM_WINDOW_MIN.live!) * simMinuteMs() : WINDOW_MS[win];
  const domain = useMemo<[number, number]>(() => [now - span, now], [now, span]);

  const focusSamples = useMemo(
    () => (active && layout === "focus" ? channelSeries(active, span, now, frame, timeZone) : []),
    [active, layout, span, now, frame, timeZone]
  );

  const gridSamples = useMemo(
    () => (layout === "grid" ? visible.map((c) => channelSeries(c, span, now, frame, timeZone)) : []),
    [visible, layout, span, now, frame, timeZone]
  );

  const events = useMemo(() => {
    const stored = storedEvents(history.events);
    return frame ? [...liveEvents(frame), ...stored] : stored;
  }, [history.events, frame]);

  const markers = useMemo<TrendMarker[]>(() => {
    if (!now) return [];
    const midnightUtc = Math.floor(now / DAY) * DAY;
    return events.map((e) => ({
      t: e.at ?? midnightUtc - e.daysAgo * DAY + (e.minutes ?? 720) * MIN,
      tone: SEVERITY_TONE[e.severity],
      label: `${e.title}${e.value ? ` · ${e.value}` : ""}`,
    }));
  }, [events, now]);

  const sensorItems = useMemo<PillItem<string>[]>(
    () =>
      visible.map((c) => {
        const zone = worst(zoneOf(c.value, c.limits), c.reported);
        return { id: c.id, label: c.id, tone: zone === "normal" ? null : ZONE_TONE[zone] };
      }),
    [visible]
  );

  const loading = catalog.isLoading || !history.loaded;

  return (
    <TrendTimeZoneContext.Provider value={timeZone}>
    <div className="dxt-page">
      {groupItems.length > 0 && (
        <div className="dxt-bar">
          <Pills items={groupItems} value={activeGroup} onChange={setGroup} label="System" className="dxt-pills--sm dxt-scroll" />
        </div>
      )}
      <div className="dxt-bar">
        {layout === "focus" && active ? (
          <Pills items={sensorItems} value={active.id} onChange={setSelectedId} label="Sensor" className="dxt-pills--sm dxt-scroll" />
        ) : (
          <span />
        )}
        <div className="dxt-bar-right">
          <Pills items={windowItems} value={windowItems.some((w) => w.id === win) ? win : "live"} onChange={setWin} label="Time window" className="dxt-pills--sm" />
          <span className="dxt-bar-sep" aria-hidden="true" />
          <Pills items={LAYOUT_ITEMS} value={layout} onChange={setLayout} label="View" className="dxt-pills--sm" />
        </div>
      </div>

      {loading ? (
        <section className="dxt-card dxt-empty" style={{ height: 320 }} aria-busy="true" />
      ) : visible.length === 0 ? (
        <section className="dxt-card dxt-meta" role="note" style={{ padding: "48px 20px", textAlign: "center" }}>
          {states.length > 0
            ? "This group has only state signals; they are listed below."
            : "No sensors are mapped to this machine in the catalogue, and no trend records are stored for it."}
        </section>
      ) : layout === "focus" && active ? (
        <FocusPanel channel={active} samples={focusSamples} domain={domain} markers={markers} onNavigateToSensors={onNavigateToSensors} />
      ) : (
        <div className="dxt-grid">
          {visible.map((c, i) => (
            <GridTile
              key={c.id}
              channel={c}
              samples={gridSamples[i] ?? []}
              domain={domain}
              onFocus={() => {
                setSelectedId(c.id);
                setLayout("focus");
              }}
            />
          ))}
        </div>
      )}

      {!loading && visibleStates.length > 0 && <StateList rows={visibleStates} />}

      <EventLog events={events} onOpen={onNavigateToDiagnosis} />
    </div>
    </TrendTimeZoneContext.Provider>
  );
}
