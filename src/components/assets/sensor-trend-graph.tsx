"use client";

import React, { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { zoneOffsetMs, zonedParts } from "@/lib/time";
import "./diagnosis/trends.css";

/**
 * Time zone the chart's clock labels are drawn in: the plant's, provided by the
 * page that knows the machine (`useSiteTimeZone`). Undefined = the viewer's zone.
 */
export const TrendTimeZoneContext = createContext<string | undefined>(undefined);

/* ==========================================================================
   Types
   ========================================================================== */

export type LimitMode = "high" | "low" | "abs";
export type Tone = "good" | "warn" | "bad";

export interface TrendSample {
  /** Epoch milliseconds. */
  t: number;
  /** Measured value. */
  v: number;
  /** Baseline / reference model value. */
  b?: number;
}

export interface TrendLimits {
  warn: number;
  alarm: number;
  /** high: above is bad · low: below is bad · abs: |value| above is bad. */
  mode: LimitMode;
}

export interface TrendMarker {
  t: number;
  tone: Tone;
  label: string;
}

export interface TrendChartProps {
  samples: TrendSample[];
  timeDomain: [number, number];
  unit: string;
  limits?: TrendLimits;
  variant?: "focus" | "mini";
  height?: number;
  markers?: TrendMarker[];
  decimals?: number;
  ariaLabel: string;
  /** IANA zone for clock labels; defaults to TrendTimeZoneContext, then the viewer's zone. */
  timeZone?: string;
}

/* Legacy wrapper types (kept for API stability). */
export interface TrendDataPoint {
  time: string;
  measured: number;
  model?: number;
  secondary?: number;
}

export interface StatCardItem {
  label: string;
  value: string;
  subtext: string;
  status: "Normal" | "Warning" | "Alarm";
}

export interface SensorTabItem {
  id: string;
  label: string;
  tag?: string;
  unit?: string;
  status?: "Normal" | "Warning" | "Alarm" | "Advisory" | "Critical";
}

export interface SensorTrendGraphProps {
  title?: string;
  subtitle?: string;
  tabs?: SensorTabItem[];
  activeTabId?: string;
  onTabChange?: (id: string) => void;
  points: TrendDataPoint[];
  currentMeasured: number;
  currentModel?: number;
  currentSecondary?: number;
  primaryLabel: string;
  modelLabel?: string;
  secondaryLabel?: string;
  unit: string;
  warningLimit?: { value: number; label: string };
  alarmLimit?: { value: number; label: string };
  minVal?: number;
  maxVal?: number;
  statCards?: StatCardItem[];
  isLive?: boolean;
  timeRangePills?: string[];
  activeTimeRange?: string;
  onTimeRangeChange?: (range: string) => void;
  extraControls?: React.ReactNode;
}

/* ==========================================================================
   Formatting & scale helpers
   ========================================================================== */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const TIME_STEPS = [5 * SEC, 10 * SEC, 15 * SEC, 30 * SEC, MIN, 2 * MIN, 5 * MIN, 10 * MIN, 15 * MIN, 30 * MIN, HOUR, 2 * HOUR, 3 * HOUR, 6 * HOUR, 12 * HOUR, DAY, 2 * DAY];

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Fixed-decimal number with a true minus sign. */
export function fmtNum(v: number, decimals = 2): string {
  const s = Math.abs(v).toFixed(decimals);
  return v < 0 && Number(s) !== 0 ? `−${s}` : s;
}

export function fmtValue(v: number, unit: string, decimals = 2): string {
  return `${fmtNum(v, decimals)} ${unit}`;
}

export function fmtClock(t: number, seconds = false, timeZone?: string): string {
  const d = zonedParts(t, timeZone);
  return `${pad2(d.hour)}:${pad2(d.minute)}${seconds ? `:${pad2(d.second)}` : ""}`;
}

export function fmtStamp(t: number, timeZone?: string): string {
  const d = zonedParts(t, timeZone);
  return `${d.day} ${MONTHS[d.month]} ${fmtClock(t, true, timeZone)}`;
}

function fmtTick(t: number, step: number, timeZone?: string): string {
  if (step < MIN) return fmtClock(t, true, timeZone);
  if (step < DAY) return fmtClock(t, false, timeZone);
  const d = zonedParts(t, timeZone);
  return `${d.day} ${MONTHS[d.month]}`;
}

function niceStep(range: number, count: number): number {
  const raw = Math.max(range, 1e-9) / Math.max(1, count);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return nice * mag;
}

function decimalsFor(step: number): number {
  if (step >= 1) return 0;
  return Math.min(3, Math.ceil(-Math.log10(step) - 1e-9));
}

function timeTicks(t0: number, t1: number, target: number, timeZone?: string): { ticks: number[]; step: number } {
  const span = Math.max(1, t1 - t0);
  const step = TIME_STEPS.find((s) => span / s <= target) ?? TIME_STEPS[TIME_STEPS.length - 1];
  // Ticks land on round wall-clock times in the chart's zone (07:00, not 07:30 for IST).
  const offset = zoneOffsetMs(t0, timeZone);
  const first = Math.ceil((t0 + offset) / step) * step - offset;
  const ticks: number[] = [];
  for (let t = first; t <= t1 + 1; t += step) ticks.push(t);
  return { ticks, step };
}

/** Value domain covering data, baseline, and the ISO limit envelope. */
function valueDomain(samples: TrendSample[], limits?: TrendLimits): { lo: number; hi: number; step: number } {
  let lo = Infinity;
  let hi = -Infinity;
  for (const s of samples) {
    lo = Math.min(lo, s.v, s.b ?? s.v);
    hi = Math.max(hi, s.v, s.b ?? s.v);
  }
  if (limits) {
    const lims = limits.mode === "abs" ? [limits.warn, limits.alarm, -limits.warn, -limits.alarm] : [limits.warn, limits.alarm];
    for (const l of lims) {
      lo = Math.min(lo, l);
      hi = Math.max(hi, l);
    }
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { lo: 0, hi: 1, step: 0.25 };
  const span = Math.max(hi - lo, Math.abs(hi) * 0.05, 1e-3);
  lo -= span * 0.08;
  hi += span * 0.08;
  const step = niceStep(hi - lo, 4);
  return { lo: Math.floor(lo / step) * step, hi: Math.ceil(hi / step) * step, step };
}

/** Index of the sample nearest to time t (samples sorted by t). */
function nearestIndex(samples: TrendSample[], t: number): number {
  let lo = 0;
  let hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].t < t) lo = mid;
    else hi = mid;
  }
  return Math.abs(samples[lo].t - t) <= Math.abs(samples[hi].t - t) ? lo : hi;
}

/** Tracks an element's content width. */
export function useElementWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0]?.contentRect.width ?? 0);
      setWidth((prev) => (prev === w ? prev : w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/* ==========================================================================
   TrendChart — single-axis time series with ISO zone bands
   ========================================================================== */

const LAYOUT = {
  focus: { l: 52, r: 92, t: 22, b: 28, yTicks: 5, xTicks: 7 },
  mini: { l: 40, r: 10, t: 16, b: 22, yTicks: 3, xTicks: 3 },
};

export function TrendChart({
  samples,
  timeDomain,
  unit,
  limits,
  variant = "focus",
  height = variant === "focus" ? 320 : 128,
  markers,
  decimals = 2,
  ariaLabel,
  timeZone: timeZoneProp,
}: TrendChartProps) {
  const contextZone = useContext(TrendTimeZoneContext);
  const timeZone = timeZoneProp ?? contextZone;
  const [wrapRef, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const clipId = `dxt-clip-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const L = LAYOUT[variant];
  const focus = variant === "focus";

  const geo = useMemo(() => {
    if (width <= 0 || samples.length < 2) return null;
    const plotW = Math.max(10, width - L.l - L.r);
    const plotH = Math.max(10, height - L.t - L.b);
    const t0 = timeDomain[0];
    const t1 = Math.max(timeDomain[1], samples[samples.length - 1].t);
    const dom = valueDomain(samples, limits);
    const x = (t: number) => L.l + ((t - t0) / Math.max(1, t1 - t0)) * plotW;
    const y = (v: number) => L.t + plotH - ((Math.max(dom.lo, Math.min(dom.hi, v)) - dom.lo) / (dom.hi - dom.lo)) * plotH;

    let line = "";
    let base = "";
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const px = x(s.t).toFixed(1);
      line += `${i ? "L" : "M"}${px} ${y(s.v).toFixed(1)}`;
      if (s.b !== undefined) base += `${base ? "L" : "M"}${px} ${y(s.b).toFixed(1)}`;
    }
    const bottom = (L.t + plotH).toFixed(1);
    const area = `${line}L${x(samples[samples.length - 1].t).toFixed(1)} ${bottom}L${x(samples[0].t).toFixed(1)} ${bottom}Z`;

    const yTicks: number[] = [];
    for (let v = dom.lo; v <= dom.hi + dom.step * 0.5; v += dom.step) yTicks.push(+v.toFixed(6));
    const yDec = decimalsFor(dom.step);
    const xt = timeTicks(t0, t1, L.xTicks, timeZone);

    // ISO bands: [from, to, tone]
    const bands: Array<[number, number, "warn" | "bad"]> = [];
    if (limits) {
      const { warn, alarm, mode } = limits;
      if (mode === "high") bands.push([warn, alarm, "warn"], [alarm, dom.hi, "bad"]);
      else if (mode === "low") bands.push([alarm, warn, "warn"], [dom.lo, alarm, "bad"]);
      else bands.push([warn, alarm, "warn"], [alarm, dom.hi, "bad"], [-alarm, -warn, "warn"], [dom.lo, -alarm, "bad"]);
    }

    return { plotW, plotH, x, y, line, base, area, yTicks, yDec, xt, bands, dom, t0, t1 };
  }, [width, height, samples, timeDomain, limits, L, timeZone]);

  const onMove = useCallback(
    (e: React.PointerEvent<SVGRectElement>) => {
      if (!geo) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const frac = (e.clientX - rect.left) / Math.max(1, rect.width);
      setHover(nearestIndex(samples, geo.t0 + frac * (geo.t1 - geo.t0)));
    },
    [geo, samples]
  );

  const onKey = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!samples.length) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const dir = e.key === "ArrowLeft" ? -1 : 1;
        setHover((h) => Math.max(0, Math.min(samples.length - 1, (h ?? samples.length - 1) + dir)));
      } else if (e.key === "Escape") {
        setHover(null);
      }
    },
    [samples.length]
  );

  const hi = hover !== null && hover < samples.length ? hover : null;
  const hs = hi !== null ? samples[hi] : null;
  const last = samples[samples.length - 1];

  let tooltip: React.ReactNode = null;
  if (geo && hs) {
    const px = geo.x(hs.t);
    const flip = px > width - 170;
    tooltip = (
      <div
        className="dxt-tip"
        style={{ left: flip ? undefined : px + 12, right: flip ? width - px + 12 : undefined, top: L.t + 4 }}
        aria-hidden="true"
      >
        <span className="dxt-tip-time">{fmtStamp(hs.t, timeZone)}</span>
        <span className="dxt-tip-row">
          <i className="dxt-key dxt-key--line" />
          <strong>{fmtValue(hs.v, unit, decimals)}</strong>
        </span>
        {hs.b !== undefined && (
          <span className="dxt-tip-row">
            <i className="dxt-key dxt-key--base" />
            <span>{fmtValue(hs.b, unit, decimals)}</span>
            <span className="dxt-tip-delta">
              {hs.v - hs.b >= 0 ? "+" : ""}
              {fmtValue(hs.v - hs.b, unit, decimals)}
            </span>
          </span>
        )}
      </div>
    );
  }

  // Right-gutter readout + limit labels (focus only), de-collided against the readout.
  const readoutY = geo && last ? geo.y(last.v) : 0;
  const limitLabels: Array<{ y: number; text: string; tone: "warn" | "bad" }> = [];
  if (geo && focus && limits) {
    const push = (v: number, text: string, tone: "warn" | "bad") => {
      if (v < geo.dom.lo || v > geo.dom.hi) return;
      const y = geo.y(v);
      if (Math.abs(y - readoutY) < 16 || limitLabels.some((l) => Math.abs(l.y - y) < 14)) return;
      limitLabels.push({ y, text, tone });
    };
    push(limits.warn, fmtValue(limits.warn, unit, decimals), "warn");
    push(limits.alarm, fmtValue(limits.alarm, unit, decimals), "bad");
    if (limits.mode === "abs") {
      push(-limits.warn, fmtValue(-limits.warn, unit, decimals), "warn");
      push(-limits.alarm, fmtValue(-limits.alarm, unit, decimals), "bad");
    }
  }

  return (
    <div
      ref={wrapRef}
      className={`dxt-chart dxt-chart--${variant}`}
      style={{ height }}
      tabIndex={focus ? 0 : undefined}
      onKeyDown={focus ? onKey : undefined}
      onBlur={focus ? () => setHover(null) : undefined}
      aria-label={focus ? `${ariaLabel}. Arrow keys step through samples.` : undefined}
    >
      {geo && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel} className="dxt-svg">
          {/* zone bands */}
          {geo.bands.map(([a, b, tone], i) => {
            const y1 = geo.y(Math.max(a, b));
            const y2 = geo.y(Math.min(a, b));
            if (y2 - y1 < 0.5) return null;
            return <rect key={i} className={`dxt-band dxt-band--${tone}`} x={L.l} y={y1} width={geo.plotW} height={y2 - y1} />;
          })}

          {/* grid + y axis */}
          {geo.yTicks.map((v) => {
            const y = geo.y(v);
            return (
              <g key={v}>
                <line className="dxt-gridline" x1={L.l} x2={L.l + geo.plotW} y1={y} y2={y} />
                <line className="dxt-axis" x1={L.l - 4} x2={L.l} y1={y} y2={y} />
                <text className="dxt-tick" x={L.l - 7} y={y} textAnchor="end" dominantBaseline="middle">
                  {fmtNum(v, geo.yDec)}
                </text>
              </g>
            );
          })}
          <text className="dxt-axis-unit" x={L.l - 7} y={L.t - 8} textAnchor="end">
            {unit}
          </text>

          {/* x axis */}
          <line className="dxt-axis" x1={L.l} x2={L.l + geo.plotW} y1={L.t + geo.plotH} y2={L.t + geo.plotH} />
          {geo.xt.ticks.map((t) => {
            const x = geo.x(t);
            if (x < L.l - 0.5 || x > L.l + geo.plotW + 0.5) return null;
            return (
              <g key={t}>
                <line className="dxt-axis" x1={x} x2={x} y1={L.t + geo.plotH} y2={L.t + geo.plotH + 4} />
                <text className="dxt-tick" x={x} y={L.t + geo.plotH + 15} textAnchor="middle">
                  {fmtTick(t, geo.xt.step, timeZone)}
                </text>
              </g>
            );
          })}

          {/* limit lines */}
          {limits &&
            (limits.mode === "abs" ? [limits.warn, limits.alarm, -limits.warn, -limits.alarm] : [limits.warn, limits.alarm]).map((v, i) =>
              v >= geo.dom.lo && v <= geo.dom.hi ? (
                <line
                  key={i}
                  className={`dxt-limit dxt-limit--${Math.abs(v) === Math.abs(limits.warn) ? "warn" : "bad"}`}
                  x1={L.l}
                  x2={L.l + geo.plotW}
                  y1={geo.y(v)}
                  y2={geo.y(v)}
                />
              ) : null
            )}

          {/* series (clipped to the plot so out-of-window samples never bleed into the axes) */}
          <defs>
            <clipPath id={clipId}>
              <rect x={L.l} y={L.t - 4} width={geo.plotW} height={geo.plotH + 8} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clipId})`}>
            <path className="dxt-area" d={geo.area} />
            {geo.base && <path className="dxt-base" d={geo.base} />}
            <path className={`dxt-line ${focus ? "" : "dxt-line--mini"}`} d={geo.line} />
          </g>
          {last && <circle className="dxt-end" cx={geo.x(last.t)} cy={readoutY} r={focus ? 4 : 3} />}

          {/* event markers */}
          {focus &&
            markers?.map((m, i) => {
              const x = geo.x(m.t);
              if (x < L.l || x > L.l + geo.plotW) return null;
              return (
                <g key={i} className="dxt-marker">
                  <line className="dxt-marker-rule" x1={x} x2={x} y1={L.t} y2={L.t + geo.plotH} />
                  <circle className={`dxt-marker-dot dxt-tone--${m.tone}`} cx={x} cy={L.t + geo.plotH} r={4} />
                  <title>{m.label}</title>
                </g>
              );
            })}

          {/* right gutter: limit labels + live readout */}
          {focus &&
            limitLabels.map((l, i) => (
              <g key={i}>
                <line className={`dxt-limit-key dxt-tone--${l.tone}`} x1={L.l + geo.plotW + 6} x2={L.l + geo.plotW + 12} y1={l.y} y2={l.y} />
                <text className="dxt-tick" x={L.l + geo.plotW + 15} y={l.y} dominantBaseline="middle">
                  {l.text}
                </text>
              </g>
            ))}
          {focus && last && (
            <g>
              <rect className="dxt-readout-bg" x={L.l + geo.plotW + 4} y={readoutY - 10} width={L.r - 6} height={20} rx={4} />
              <text className="dxt-readout" x={L.l + geo.plotW + 4 + (L.r - 6) / 2} y={readoutY} textAnchor="middle" dominantBaseline="central">
                {fmtValue(last.v, unit, decimals)}
              </text>
            </g>
          )}

          {/* hover layer */}
          {hs && (
            <g pointerEvents="none">
              <line className="dxt-cross" x1={geo.x(hs.t)} x2={geo.x(hs.t)} y1={L.t} y2={L.t + geo.plotH} />
              {hs.b !== undefined && <circle className="dxt-cross-base" cx={geo.x(hs.t)} cy={geo.y(hs.b)} r={3} />}
              <circle className="dxt-end" cx={geo.x(hs.t)} cy={geo.y(hs.v)} r={4} />
            </g>
          )}
          <rect
            x={L.l}
            y={L.t}
            width={geo.plotW}
            height={geo.plotH}
            fill="transparent"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
      )}
      {tooltip}
      {focus && (
        <span className="dxt-sr" aria-live="polite">
          {hs ? `${fmtStamp(hs.t, timeZone)}: ${fmtValue(hs.v, unit, decimals)}` : ""}
        </span>
      )}
    </div>
  );
}

/* ==========================================================================
   SensorTrendGraph — self-contained card wrapper (legacy API)
   ========================================================================== */

/** Resolves an "HH:MM:SS" clock string to the most recent matching epoch ms at or before ref. */
export function parseClock(time: string, ref: number): number {
  const [h, m, s] = time.split(":").map((p) => Number(p) || 0);
  const d = new Date(ref);
  d.setHours(h, m, s, 0);
  const t = d.getTime();
  return t > ref + MIN ? t - DAY : t;
}

export function SensorTrendGraph({
  title = "Telemetry",
  subtitle,
  tabs,
  activeTabId,
  onTabChange,
  points,
  currentMeasured,
  primaryLabel,
  modelLabel = "Baseline",
  unit,
  warningLimit,
  alarmLimit,
  statCards,
  timeRangePills,
  activeTimeRange,
  onTimeRangeChange,
  extraControls,
}: SensorTrendGraphProps) {
  const samples = useMemo<TrendSample[]>(() => {
    const ref = Date.now();
    return points.map((p) => ({ t: parseClock(p.time, ref), v: p.measured, b: p.model }));
  }, [points]);

  const limits = useMemo<TrendLimits | undefined>(() => {
    if (!warningLimit || !alarmLimit) return undefined;
    return { warn: warningLimit.value, alarm: alarmLimit.value, mode: alarmLimit.value < warningLimit.value ? "low" : "high" };
  }, [warningLimit, alarmLimit]);

  const domain: [number, number] = samples.length ? [samples[0].t, samples[samples.length - 1].t] : [0, 1];
  const hasBase = samples.some((s) => s.b !== undefined);

  return (
    <section className="dxt-card">
      <header className="dxt-card-head">
        <div className="dxt-head-text">
          <h3 className="dxt-title">{title}</h3>
          {subtitle && <span className="dxt-meta">{subtitle}</span>}
        </div>
        <div className="dxt-head-right">
          {extraControls}
          {timeRangePills && onTimeRangeChange && (
            <div className="nav-pill-group dxt-pills" role="tablist" aria-label="Time window">
              {timeRangePills.map((r) => (
                <button key={r} type="button" role="tab" aria-selected={r === activeTimeRange} className={`nav-pill ${r === activeTimeRange ? "active" : ""}`} onClick={() => onTimeRangeChange(r)}>
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>
      {tabs && onTabChange && (
        <div className="nav-pill-group dxt-pills dxt-scroll" role="tablist" aria-label="Sensor">
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={t.id === activeTabId} className={`nav-pill ${t.id === activeTabId ? "active" : ""}`} onClick={() => onTabChange(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      )}
      <div className="dxt-legend">
        <span>
          <i className="dxt-key dxt-key--line" />
          {primaryLabel}
        </span>
        {hasBase && (
          <span>
            <i className="dxt-key dxt-key--base" />
            {modelLabel}
          </span>
        )}
        <span className="dxt-legend-value">{fmtValue(currentMeasured, unit)}</span>
      </div>
      {samples.length > 1 ? (
        <TrendChart samples={samples} timeDomain={domain} unit={unit} limits={limits} ariaLabel={`${primaryLabel} trend in ${unit}`} />
      ) : (
        <div className="dxt-empty" style={{ height: 320 }} />
      )}
      {statCards && statCards.length > 0 && (
        <dl className="dxt-stats">
          {statCards.map((s) => (
            <div key={s.label} className="dxt-stat">
              <dt>{s.label}</dt>
              <dd>{s.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
