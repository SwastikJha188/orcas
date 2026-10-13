"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { PillButton, PillNav } from "@/components/ui";
import type { ConditionPoint, ForecastHorizon, ForecastSeries, InsightsResponse } from "@/server/services/insights-service";
import "./condition-module.css";

export interface ConditionModuleProps {
  data: InsightsResponse["prognosis"];
  onBack?: () => void;
}

/* ------------------------------------------------------------------ */
/* Configuration                                                      */
/* ------------------------------------------------------------------ */

type Zone = "Normal" | "Advisory" | "Critical";
/** "overall" or a system id from `condition.systems` (DB machine_systems / sim systems). */
type HealthKey = string;

/** Health-index zone boundaries (%). */
const ADVISORY = 85;
const CRITICAL = 70;

interface Horizon {
  id: string;
  label: string;
  hours: number;
  /** x-axis tick spacing (h) */
  step: number;
  /** tick labels in days */
  days: boolean;
}

const HORIZONS: Horizon[] = [
  { id: "8h", label: "8 h", hours: 8, step: 2, days: false },
  { id: "24h", label: "24 h", hours: 24, step: 6, days: false },
  { id: "72h", label: "72 h", hours: 72, step: 24, days: false },
  { id: "7d", label: "7 d", hours: 168, step: 24, days: true },
];

type SensorIcon = "vibration" | "temperature" | "pressure" | "current" | "flow" | "generic";

const HIST_SAMPLES = 24;
const FC_SAMPLES = 48;

/* ------------------------------------------------------------------ */
/* Model helpers                                                      */
/* ------------------------------------------------------------------ */

interface Sample {
  /** hours relative to now */
  t: number;
  v: number;
  lo95: number;
  hi95: number;
  lo80: number;
  hi80: number;
}

interface Series {
  hist: Sample[];
  fc: Sample[];
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const zoneOf = (h: number): Zone => (h < CRITICAL ? "Critical" : h < ADVISORY ? "Advisory" : "Normal");

const ZONE_RANK: Record<Zone, number> = { Normal: 0, Advisory: 1, Critical: 2 };
const worstZone = (zones: Zone[]): Zone =>
  zones.reduce<Zone>((w, z) => (ZONE_RANK[z] > ZONE_RANK[w] ? z : w), "Normal");

const valueOf = (p: ConditionPoint, key: HealthKey): number =>
  key === "overall" ? p.overall : p.systems?.[key] ?? p.overall;

/** Server health at `day`, linear between projection points, extrapolated past the last one. */
function baseAt(points: ConditionPoint[], key: HealthKey, day: number): number {
  if (day <= points[0].day) return valueOf(points[0], key);
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (day <= b.day) return valueOf(a, key) + ((day - a.day) / (b.day - a.day || 1)) * (valueOf(b, key) - valueOf(a, key));
  }
  const a = points[points.length - 2] ?? points[0];
  const b = points[points.length - 1];
  return valueOf(b, key) + ((day - b.day) / (b.day - a.day || 1)) * (valueOf(b, key) - valueOf(a, key));
}

/** Server-projected health at `hours` from now. */
function projectAt(points: ConditionPoint[], key: HealthKey, hours: number): number {
  return clamp(baseAt(points, key, hours / 24), 0, 100);
}

/** 1σ forecast uncertainty (%) growing with √t. */
const sigmaAt = (hours: number) => 0.25 + 0.55 * Math.sqrt(hours / 24);

function buildSeries(points: ConditionPoint[], key: HealthKey, hours: number): Series {
  const h0 = valueOf(points[0], key);
  const histH = hours / 2;
  // Back-cast with the early-life projection rate (the payload carries no health history).
  const nominalPerHour = (h0 - baseAt(points, key, 7)) / (7 * 24);
  const hist: Sample[] = [];
  for (let i = 0; i <= HIST_SAMPLES; i++) {
    const t = -histH + (i / HIST_SAMPLES) * histH;
    const v = clamp(h0 - nominalPerHour * t, 0, 100);
    hist.push({ t, v, lo95: v, hi95: v, lo80: v, hi80: v });
  }
  const fc: Sample[] = [];
  for (let j = 0; j <= FC_SAMPLES; j++) {
    const t = (j / FC_SAMPLES) * hours;
    const v = projectAt(points, key, t);
    const s = sigmaAt(t) * (j === 0 ? 0 : 1);
    fc.push({
      t,
      v,
      lo95: clamp(v - 1.96 * s, 0, 100),
      hi95: clamp(v + 1.96 * s, 0, 100),
      lo80: clamp(v - 1.28 * s, 0, 100),
      hi80: clamp(v + 1.28 * s, 0, 100),
    });
  }
  return { hist, fc };
}

/** Hours until projected health first falls below `level`; 0 if already below, null if beyond the projection. */
function hoursUntil(points: ConditionPoint[], key: HealthKey, level: number): number | null {
  const lastH = points[points.length - 1].day * 24;
  if (valueOf(points[0], key) < level) return 0;
  let prevT = 0;
  let prevV = valueOf(points[0], key);
  for (let t = 1; t <= lastH; t += 1) {
    const v = projectAt(points, key, t);
    if (v < level) return prevT + ((prevV - level) / (prevV - v || 1)) * (t - prevT);
    prevT = t;
    prevV = v;
  }
  return null;
}

function crossingInSeries(fc: Sample[], level: number): number | null {
  for (let i = 1; i < fc.length; i++) {
    const a = fc[i - 1];
    const b = fc[i];
    if (a.v >= level && b.v < level) return a.t + ((a.v - level) / (a.v - b.v)) * (b.t - a.t);
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Formatting                                                         */
/* ------------------------------------------------------------------ */

const signed = (v: number, digits: number) => {
  const r = Number(v.toFixed(digits));
  if (r === 0) return (0).toFixed(digits);
  return `${r > 0 ? "+" : "−"}${Math.abs(r).toFixed(digits)}`;
};

function formatDuration(hours: number | null, beyondDays: number): { value: string; unit: string } {
  if (hours === null || !Number.isFinite(hours)) return { value: `> ${beyondDays}`, unit: "d" };
  if (hours <= 0) return { value: "0", unit: "h" };
  if (hours < 72) return { value: hours.toFixed(hours < 10 ? 1 : 0), unit: "h" };
  return { value: (hours / 24).toFixed(hours < 240 ? 1 : 0), unit: "d" };
}

function formatTick(t: number, days: boolean): string {
  if (Math.abs(t) < 1e-6) return "Now";
  const sign = t > 0 ? "+" : "−";
  return days ? `${sign}${Math.abs(t) / 24} d` : `${sign}${Math.abs(t)} h`;
}

const zoneClass = (z: Zone) => (z === "Critical" ? "is-bad" : z === "Advisory" ? "is-warn" : "is-good");

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                        */
/* ------------------------------------------------------------------ */

function ZoneChip({ zone }: { zone: Zone }) {
  return (
    <span className={`cond-chip ${zoneClass(zone)}`}>
      <i aria-hidden="true" />
      {zone}
    </span>
  );
}

function KpiTile({
  label,
  value,
  unit,
  zone,
  note,
}: {
  label: string;
  value: string;
  unit: string;
  zone?: Zone;
  note?: string;
}) {
  return (
    <div className="cond-card cond-kpi">
      <div className="cond-kpi-top">
        <span className="cond-kpi-label">{label}</span>
        {zone && <ZoneChip zone={zone} />}
      </div>
      <div className="cond-kpi-value">
        {value}
        <span className="cond-unit">{unit}</span>
      </div>
      {note && <span className="cond-kpi-note">{note}</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Primary chart                                                      */
/* ------------------------------------------------------------------ */

const CH = 300;
const PAD = { l: 44, r: 92, t: 22, b: 30 };

function TrajectoryChart({
  series,
  horizon,
  yMin,
}: {
  series: Series;
  horizon: Horizon;
  yMin: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(760);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const histH = horizon.hours / 2;
  const plotW = Math.max(120, width - PAD.l - PAD.r);
  const plotH = CH - PAD.t - PAD.b;

  const geo = useMemo(() => {
    const x = (t: number) => PAD.l + ((t + histH) / (horizon.hours + histH)) * plotW;
    const y = (v: number) => PAD.t + (1 - (v - yMin) / (100 - yMin)) * plotH;
    const line = (pts: Sample[]) =>
      pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)}`).join("");
    const band = (pts: Sample[], lo: "lo95" | "lo80", hi: "hi95" | "hi80") =>
      `${pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)} ${y(p[hi]).toFixed(1)}`).join("")}` +
      `${[...pts].reverse().map((p) => `L${x(p.t).toFixed(1)} ${y(p[lo]).toFixed(1)}`).join("")}Z`;

    const ticksX: number[] = [];
    for (let t = Math.ceil(-histH / horizon.step) * horizon.step; t <= horizon.hours + 1e-6; t += horizon.step) {
      ticksX.push(t);
    }
    const ticksY: number[] = [];
    for (let v = yMin; v <= 100; v += 10) ticksY.push(v);

    const crossings = [
      { level: ADVISORY, zone: "Advisory" as Zone, t: crossingInSeries(series.fc, ADVISORY) },
      { level: CRITICAL, zone: "Critical" as Zone, t: crossingInSeries(series.fc, CRITICAL) },
    ].filter((c): c is { level: number; zone: Zone; t: number } => c.t !== null);

    return {
      x,
      y,
      hist: line(series.hist),
      fc: line(series.fc),
      band95: band(series.fc, "lo95", "hi95"),
      band80: band(series.fc, "lo80", "hi80"),
      ticksX,
      ticksY,
      crossings,
    };
  }, [series, horizon, histH, plotW, plotH, yMin]);

  const samples = useMemo(() => [...series.hist, ...series.fc.slice(1)], [series]);
  const end = series.fc[series.fc.length - 1];
  const sel = active !== null ? samples[active] : null;

  const pick = (clientX: number, el: SVGSVGElement) => {
    const rect = el.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * width;
    let best = 0;
    let bestD = Infinity;
    samples.forEach((s, i) => {
      const d = Math.abs(geo.x(s.t) - px);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setActive(best);
  };

  const onKey = (e: React.KeyboardEvent<SVGSVGElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const nowIdx = series.hist.length - 1;
    setActive((i) => clamp((i ?? nowIdx) + (e.key === "ArrowRight" ? 1 : -1), 0, samples.length - 1));
  };

  const fmtT = (t: number) => {
    if (Math.abs(t) < 1e-6) return "Now";
    const abs = Math.abs(t);
    const v = horizon.days ? `${(abs / 24).toFixed(1)} d` : `${abs.toFixed(abs < 10 ? 1 : 0)} h`;
    return `${t > 0 ? "+" : "−"}${v}`;
  };

  const xNow = geo.x(0);
  const label = `Overall health trajectory: ${series.hist[series.hist.length - 1].v.toFixed(1)} % now, ${end.v.toFixed(
    1,
  )} % forecast at +${horizon.label} (95 % interval ${end.lo95.toFixed(1)}–${end.hi95.toFixed(1)} %).`;

  return (
    <div className="cond-chart" ref={wrapRef}>
      <svg
        className="cond-chart-svg"
        viewBox={`0 0 ${width} ${CH}`}
        width={width}
        height={CH}
        role="img"
        aria-label={label}
        tabIndex={0}
        onPointerMove={(e) => pick(e.clientX, e.currentTarget)}
        onPointerLeave={() => setActive(null)}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
      >
        {/* zone bands */}
        <rect
          className="cond-zone cond-zone--warn"
          x={PAD.l}
          y={geo.y(ADVISORY)}
          width={plotW}
          height={geo.y(CRITICAL) - geo.y(ADVISORY)}
        />
        <rect
          className="cond-zone cond-zone--bad"
          x={PAD.l}
          y={geo.y(CRITICAL)}
          width={plotW}
          height={geo.y(yMin) - geo.y(CRITICAL)}
        />

        {/* grid + y axis */}
        {geo.ticksY.map((v) => (
          <g key={v}>
            <line className="cond-grid" x1={PAD.l} x2={PAD.l + plotW} y1={geo.y(v)} y2={geo.y(v)} />
            <text className="cond-axis" x={PAD.l - 8} y={geo.y(v) + 3.5} textAnchor="end">
              {v} %
            </text>
          </g>
        ))}

        {/* thresholds */}
        {[
          { v: ADVISORY, cls: "warn", text: "Advisory" },
          { v: CRITICAL, cls: "bad", text: "Critical" },
        ].map((th) => (
          <g key={th.v}>
            <line className={`cond-threshold ${th.cls}`} x1={PAD.l} x2={PAD.l + plotW} y1={geo.y(th.v)} y2={geo.y(th.v)} />
            <text className="cond-axis" x={PAD.l + plotW + 8} y={geo.y(th.v) + 3.5}>
              {th.text} {th.v} %
            </text>
          </g>
        ))}

        {/* x axis */}
        {geo.ticksX.map((t) => (
          <text key={t} className="cond-axis" x={geo.x(t)} y={CH - 8} textAnchor="middle">
            {formatTick(t, horizon.days)}
          </text>
        ))}
        <line className="cond-baseline" x1={PAD.l} x2={PAD.l + plotW} y1={PAD.t + plotH} y2={PAD.t + plotH} />

        {/* confidence fan */}
        <path className="cond-fan" d={geo.band95} />
        <path className="cond-fan" d={geo.band80} />

        {/* now marker */}
        <line className="cond-now" x1={xNow} x2={xNow} y1={PAD.t - 6} y2={PAD.t + plotH} />
        <text className="cond-axis cond-axis--strong" x={xNow} y={PAD.t - 10} textAnchor="middle">
          Now
        </text>

        {/* series */}
        <path className="cond-line" d={geo.hist} />
        <path className="cond-line cond-line--fc" d={geo.fc} />

        {/* threshold crossings */}
        {geo.crossings.map((c) => (
          <g key={c.level}>
            <circle className={`cond-cross ${zoneClass(c.zone)}`} cx={geo.x(c.t)} cy={geo.y(c.level)} r={4.5} />
            <text className="cond-axis cond-axis--strong" x={geo.x(c.t)} y={geo.y(c.level) - 10} textAnchor="middle">
              {fmtT(c.t)}
            </text>
          </g>
        ))}

        {/* end point + direct label */}
        <circle className="cond-end" cx={geo.x(end.t)} cy={geo.y(end.v)} r={4} />
        <circle className="cond-end cond-end--now" cx={xNow} cy={geo.y(series.fc[0].v)} r={4} />
        <text className="cond-endlabel" x={geo.x(end.t) + 8} y={geo.y(end.v) - 8}>
          {end.v.toFixed(1)} %
        </text>

        {/* hover crosshair */}
        {sel && (
          <g pointerEvents="none">
            <line className="cond-cursor" x1={geo.x(sel.t)} x2={geo.x(sel.t)} y1={PAD.t} y2={PAD.t + plotH} />
            <circle className="cond-end" cx={geo.x(sel.t)} cy={geo.y(sel.v)} r={4} />
          </g>
        )}
      </svg>

      {sel && (
        <div
          className="cond-tip"
          style={{
            left: clamp(geo.x(sel.t), 70, width - 70),
            top: Math.max(4, geo.y(sel.hi95) - 64),
          }}
          aria-hidden="true"
        >
          <strong>{sel.v.toFixed(1)} %</strong>
          <span>{fmtT(sel.t)}</span>
          {sel.t > 0 && (
            <span>
              95 % {sel.lo95.toFixed(1)}–{sel.hi95.toFixed(1)} %
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Subsystem small multiple                                           */
/* ------------------------------------------------------------------ */

const SPARK_W = 240;
const SPARK_H = 44;

function SubsystemTile({
  name,
  series,
  domain,
  horizonLabel,
}: {
  name: string;
  series: Series;
  domain: [number, number];
  horizonLabel: string;
}) {
  const now = series.fc[0].v;
  const at = series.fc[series.fc.length - 1].v;
  const zone = zoneOf(at);

  const paths = useMemo(() => {
    const t0 = series.hist[0].t;
    const t1 = series.fc[series.fc.length - 1].t;
    const x = (t: number) => ((t - t0) / (t1 - t0 || 1)) * SPARK_W;
    const y = (v: number) => 2 + (1 - (v - domain[0]) / (domain[1] - domain[0] || 1)) * (SPARK_H - 4);
    const line = (pts: Sample[]) => pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)}`).join("");
    const band =
      series.fc.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)} ${y(p.hi95).toFixed(1)}`).join("") +
      [...series.fc].reverse().map((p) => `L${x(p.t).toFixed(1)} ${y(p.lo95).toFixed(1)}`).join("") +
      "Z";
    return { hist: line(series.hist), fc: line(series.fc), band, xNow: x(0) };
  }, [series, domain]);

  const delta = at - now;

  return (
    <div className="cond-card cond-sub">
      <div className="cond-sub-top">
        <span className="cond-sub-name">{name}</span>
        <ZoneChip zone={zone} />
      </div>
      <svg
        className="cond-spark"
        viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${name}: ${now.toFixed(1)} % now, ${at.toFixed(1)} % at +${horizonLabel}`}
      >
        <path className="cond-fan" d={paths.band} />
        <line className="cond-now" x1={paths.xNow} x2={paths.xNow} y1={0} y2={SPARK_H} vectorEffect="non-scaling-stroke" />
        <path className="cond-line cond-line--thin" d={paths.hist} vectorEffect="non-scaling-stroke" />
        <path className="cond-line cond-line--thin cond-line--fc" d={paths.fc} vectorEffect="non-scaling-stroke" />
      </svg>
      <dl className="cond-sub-vals">
        <div>
          <dt>Now</dt>
          <dd>
            {now.toFixed(1)}
            <span className="cond-unit">%</span>
          </dd>
        </div>
        <div>
          <dt>+{horizonLabel}</dt>
          <dd>
            {at.toFixed(1)}
            <span className="cond-unit">%</span>
          </dd>
        </div>
        <div>
          <dt>Δ</dt>
          <dd>
            {signed(delta, 2)}
            <span className="cond-unit">%</span>
          </dd>
        </div>
      </dl>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Indicator table                                                    */
/* ------------------------------------------------------------------ */

const ICON_PATHS: Record<SensorIcon, React.ReactNode> = {
  vibration: <path d="M2 12h3l3-9 4 18 3-9h7" />,
  temperature: <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />,
  pressure: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 13l4-4" />
    </>
  ),
  current: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  flow: <path d="M3 8c3-2 6 2 9 0s6-2 9 0M3 16c3-2 6 2 9 0s6-2 9 0" />,
  generic: <circle cx="12" cy="12" r="7" />,
};

function iconFor(tag: string): SensorIcon {
  const prefix = tag.split("-")[0]?.toUpperCase() ?? "";
  if (prefix.startsWith("VIB") || prefix === "ACC") return "vibration";
  if (prefix.startsWith("TMP") || prefix.startsWith("TEMP") || prefix === "RTD") return "temperature";
  if (prefix.startsWith("PRS") || prefix.startsWith("PRE")) return "pressure";
  if (prefix.startsWith("ELE") || prefix.startsWith("CUR") || prefix === "AMP") return "current";
  if (prefix.startsWith("FLO") || prefix.startsWith("FLW")) return "flow";
  return "generic";
}

const digitsFor = (v: number) => (Math.abs(v) < 10 ? 2 : Math.abs(v) < 1000 ? 1 : 0);

interface SensorRow {
  tag: string;
  name: string;
  unit: string;
  digits: number;
  icon: SensorIcon;
  now: number;
  at: number;
  /** 95 % half-width at the selected horizon */
  spread: number;
  warning: number | null;
  alarm: number | null;
  zone: Zone;
  nextLimit: number | null;
  nextIn: number | null;
}

interface HorizonSample {
  hours: number;
  predicted: number;
  spread: number;
}

const endSpread = (s: ForecastSeries) => {
  const i = s.forecast.length - 1;
  return i >= 0 && s.upper[i] !== undefined ? Math.max(0, s.upper[i] - s.forecast[i]) : 0;
};

/**
 * Value at the page horizon from the server's horizon set (1h/6h/24h/7d/30d).
 * Exact match when the server has it (24 h, 7 d); otherwise linear interpolation in hours
 * between the bracketing server horizons (8 h ← 6h/24h, 72 h ← 24h/7d).
 */
function sampleAt(samples: HorizonSample[], hours: number): HorizonSample | null {
  if (samples.length === 0) return null;
  if (hours <= samples[0].hours) return samples[0];
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1];
    const b = samples[i];
    if (hours <= b.hours) {
      const f = (hours - a.hours) / (b.hours - a.hours || 1);
      return { hours, predicted: a.predicted + f * (b.predicted - a.predicted), spread: a.spread + f * (b.spread - a.spread) };
    }
  }
  return samples[samples.length - 1];
}

/** First crossing of `limit` (hours from now) in the server forecast; null when it is not crossed. */
function firstCrossing(series: ForecastSeries, horizonHours: number, limit: number, rising: boolean): number | null {
  const n = series.forecast.length;
  let prevT = 0;
  let prevV = series.current;
  for (let j = 0; j < n; j++) {
    const t = ((j + 1) / n) * horizonHours;
    const v = series.forecast[j];
    if (rising ? v >= limit : v <= limit) return prevT + ((limit - prevV) / (v - prevV || 1)) * (t - prevT);
    prevT = t;
    prevV = v;
  }
  return null;
}

function buildSensorRows(
  forecasts: InsightsResponse["prognosis"]["forecasts"],
  horizons: ForecastHorizon[],
  hours: number,
): SensorRow[] {
  const byId = new Map(horizons.map((h) => [h.id, h]));
  return Object.entries(forecasts ?? {}).flatMap(([tag, perHorizon]) => {
    const entries = Object.entries(perHorizon ?? {})
      .map(([id, series]) => ({ h: byId.get(id), series }))
      .filter((e): e is { h: ForecastHorizon; series: ForecastSeries } => !!e.h && !!e.series)
      .sort((a, b) => a.h.hours - b.h.hours);
    if (entries.length === 0) return [];
    const ref = entries[0].series;
    const now = Number(ref.current);
    const sample = sampleAt(
      entries.map((e) => ({ hours: e.h.hours, predicted: Number(e.series.predicted), spread: endSpread(e.series) })),
      hours,
    );
    if (!sample || !Number.isFinite(now)) return [];

    const { warning, alarm } = ref;
    // Falling-is-bad when the alarm sits below the warning (e.g. hydraulic pressure), or a lone limit sits below now.
    const lone = warning ?? alarm;
    const rising = warning !== null && alarm !== null ? alarm >= warning : lone === null || lone >= now;
    const beyond = (lim: number | null) => lim !== null && (rising ? now >= lim : now <= lim);
    const nextLimit = beyond(alarm) ? null : !beyond(warning) && warning !== null ? warning : alarm;

    let nextIn: number | null = null;
    if (nextLimit !== null) {
      const longest = entries[entries.length - 1];
      nextIn = firstCrossing(longest.series, longest.h.hours, nextLimit, rising);
    }

    return [
      {
        tag,
        name: ref.name || tag,
        unit: ref.unit,
        digits: digitsFor(now),
        icon: iconFor(tag),
        now,
        at: sample.predicted,
        spread: sample.spread,
        warning,
        alarm,
        zone: ref.status,
        nextLimit,
        nextIn,
      },
    ];
  });
}

const RB_W = 120;
const RB_H = 16;

function RangeBar({ row }: { row: SensorRow }) {
  const { at, spread, now, warning, alarm, unit, digits } = row;
  const limits = [warning, alarm].filter((v): v is number => v !== null);
  const vals = [now, at - spread, at + spread, ...limits];
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const pad = (hi - lo) * 0.08 || Math.abs(now) * 0.05 || 1;
  const x = (v: number) => 4 + ((v - (lo - pad)) / (hi - lo + 2 * pad)) * (RB_W - 8);
  const mid = RB_H / 2;
  const limitText = [
    warning !== null ? `warning ${warning} ${unit}` : null,
    alarm !== null ? `alarm ${alarm} ${unit}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <svg
      className="cond-range"
      viewBox={`0 0 ${RB_W} ${RB_H}`}
      width={RB_W}
      height={RB_H}
      role="img"
      aria-label={`Now ${now.toFixed(digits)} ${unit}, forecast ${at.toFixed(digits)} ± ${spread.toFixed(digits)} ${unit}${
        limitText ? `, ${limitText}` : ""
      }`}
    >
      <line className="cond-range-track" x1={4} x2={RB_W - 4} y1={mid} y2={mid} />
      <rect className="cond-range-band" x={x(at - spread)} y={mid - 3} width={Math.max(2, x(at + spread) - x(at - spread))} height={6} rx={3} />
      {warning !== null && <line className="cond-range-lim warn" x1={x(warning)} x2={x(warning)} y1={2} y2={RB_H - 2} />}
      {alarm !== null && <line className="cond-range-lim bad" x1={x(alarm)} x2={x(alarm)} y1={2} y2={RB_H - 2} />}
      <circle className="cond-range-now" cx={x(now)} cy={mid} r={3} />
      <circle className={`cond-range-at ${zoneClass(row.zone)}`} cx={x(at)} cy={mid} r={3.5} />
    </svg>
  );
}

function SensorTable({ rows, horizonLabel }: { rows: SensorRow[]; horizonLabel: string }) {
  return (
    <div className="cond-table-wrap">
      <table className="cond-table">
        <thead>
          <tr>
            <th scope="col">Indicator</th>
            <th scope="col" className="num">Now</th>
            <th scope="col" className="num">+{horizonLabel}</th>
            <th scope="col" className="num">Δ</th>
            <th scope="col">Position vs limits</th>
            <th scope="col" className="num">Next limit</th>
            <th scope="col" className="num">Reached in</th>
            <th scope="col">Zone</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            // Next limit / reached-in only when the server forecast actually crosses a defined limit.
            const crosses = row.nextLimit !== null && row.nextIn !== null;
            const eta = crosses ? formatDuration(row.nextIn, 30) : null;
            return (
              <tr key={row.tag}>
                <td>
                  <div className="cond-ind">
                    <span className={`cond-ind-badge ${zoneClass(row.zone)}`} aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        {ICON_PATHS[row.icon]}
                      </svg>
                    </span>
                    <span className="cond-ind-text">
                      <span className="cond-ind-name">{row.name}</span>
                      <span className="cond-ind-tag">{row.tag}</span>
                    </span>
                  </div>
                </td>
                <td className="num">
                  {row.now.toFixed(row.digits)}
                  <span className="cond-unit">{row.unit}</span>
                </td>
                <td className="num">
                  <span className="cond-strong">{row.at.toFixed(row.digits)}</span>
                  <span className="cond-unit">{row.unit}</span>
                  <span className="cond-sub-line">± {row.spread.toFixed(row.digits)} {row.unit}</span>
                </td>
                <td className="num">
                  {signed(row.at - row.now, row.digits)}
                  <span className="cond-unit">{row.unit}</span>
                </td>
                <td>
                  <RangeBar row={row} />
                </td>
                <td className="num">
                  {crosses ? (
                    <>
                      {row.nextLimit}
                      <span className="cond-unit">{row.unit}</span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="num">
                  {eta ? (
                    <>
                      {eta.value}
                      <span className="cond-unit">{eta.unit}</span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  <ZoneChip zone={row.zone} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Module                                                             */
/* ------------------------------------------------------------------ */

export function ConditionModule({ data, onBack }: ConditionModuleProps) {
  const [horizonId, setHorizonId] = useState("24h");

  const horizon = HORIZONS.find((h) => h.id === horizonId) ?? HORIZONS[1];

  const points = useMemo(
    () => [...(data.condition?.points ?? [])].sort((a, b) => a.day - b.day),
    [data.condition?.points],
  );
  const hasData = points.length > 0;
  const systems = data.condition?.systems;

  const model = useMemo(() => {
    if (!hasData) return null;
    const overall = buildSeries(points, "overall", horizon.hours);
    const subs = (systems ?? [])
      .filter((s) => typeof points[0].systems?.[s.id] === "number")
      .map((s) => ({ key: s.id, name: s.name, series: buildSeries(points, s.id, horizon.hours) }));

    const lowest = Math.min(...overall.fc.map((p) => p.lo95), ...overall.hist.map((p) => p.v));
    const yMin = Math.min(60, Math.floor((lowest - 5) / 10) * 10);

    const subVals = subs.flatMap((s) => [...s.series.hist.map((p) => p.v), ...s.series.fc.flatMap((p) => [p.lo95, p.hi95])]);
    let dLo = subVals.length ? Math.min(...subVals) : 0;
    let dHi = subVals.length ? Math.max(...subVals) : 100;
    if (dHi - dLo < 4) {
      const mid = (dHi + dLo) / 2;
      dLo = mid - 2;
      dHi = mid + 2;
    }

    const lastDay = points[points.length - 1].day;
    return {
      overall,
      subs,
      yMin,
      subDomain: [dLo, dHi] as [number, number],
      now: overall.fc[0].v,
      at: overall.fc[overall.fc.length - 1].v,
      toAdvisory: formatDuration(hoursUntil(points, "overall", ADVISORY), lastDay),
      toCritical: formatDuration(hoursUntil(points, "overall", CRITICAL), lastDay),
    };
  }, [hasData, points, systems, horizon.hours]);

  const sensorRows = useMemo(
    () => buildSensorRows(data.forecasts, data.horizons ?? [], horizon.hours),
    [data.forecasts, data.horizons, horizon.hours],
  );

  const status: Zone = model ? worstZone([zoneOf(model.at), ...model.subs.map((s) => zoneOf(s.series.fc[s.series.fc.length - 1].v))]) : "Normal";

  return (
    <div className="cond-root" aria-label="Future condition">
      <header className="cond-head">
        <div className="cond-head-title">
          {onBack && (
            <PillButton
              variant="secondary"
              className="cond-back"
              onClick={onBack}
              aria-label="Back to assets"
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              }
            >
              Assets
            </PillButton>
          )}
          <h2>Future condition</h2>
          {model && <ZoneChip zone={status} />}
        </div>
        <div className="cond-head-controls">
          <PillNav
            className="cond-nav"
            items={HORIZONS.map((h) => ({ id: h.id, label: h.label }))}
            activeId={horizonId}
            onChange={setHorizonId}
            style={{ padding: 0 }}
          />
        </div>
      </header>

      {!model ? (
        <div className="cond-card cond-empty" role="status">
          No condition projection available for this machine.
        </div>
      ) : (
        <>
          <section className="cond-kpis" aria-label="Condition forecast summary">
            <KpiTile label={`Health at +${horizon.label}`} value={model.at.toFixed(1)} unit="%" zone={zoneOf(model.at)} />
            <KpiTile label="To advisory zone" value={model.toAdvisory.value} unit={model.toAdvisory.unit} note={`< ${ADVISORY} %`} />
            <KpiTile label="To critical zone" value={model.toCritical.value} unit={model.toCritical.unit} note={`< ${CRITICAL} %`} />
          </section>

          <section className="cond-main">
            <div className="cond-card cond-chart-card">
              <div className="cond-card-head">
                <h3>Overall health trajectory</h3>
                <ul className="cond-legend" aria-label="Legend">
                  <li>
                    <i className="cond-key-line" aria-hidden="true" />
                    History
                  </li>
                  <li>
                    <i className="cond-key-line cond-key-line--fc" aria-hidden="true" />
                    Forecast
                  </li>
                  <li>
                    <i className="cond-key-fan" aria-hidden="true" />
                    80 / 95 % interval
                  </li>
                </ul>
              </div>
              <TrajectoryChart series={model.overall} horizon={horizon} yMin={model.yMin} />
            </div>

            <div className="cond-subs" aria-label="System forecasts">
              {model.subs.length === 0 && (
                <p className="cond-muted cond-table-empty">No systems registered for this machine.</p>
              )}
              {model.subs.map((s) => (
                <SubsystemTile
                  key={s.key}
                  name={s.name}
                  series={s.series}
                  domain={model.subDomain}
                  horizonLabel={horizon.label}
                />
              ))}
            </div>
          </section>

          <section className="cond-card cond-table-card" aria-label="Indicator forecasts">
            <div className="cond-card-head">
              <h3>Condition indicators</h3>
              <span className="cond-muted">± 95 % interval</span>
            </div>
            {sensorRows.length > 0 ? (
              <SensorTable rows={sensorRows} horizonLabel={horizon.label} />
            ) : (
              <p className="cond-muted cond-table-empty">No sensor forecasts for this machine.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default ConditionModule;
