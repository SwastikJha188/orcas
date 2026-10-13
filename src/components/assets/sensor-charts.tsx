"use client";

import React, { useLayoutEffect, useRef, useState } from "react";
import type { DetailedSensorInfo } from "./machine-sensor-mapping-view";
import { severityTone } from "./assets-shell-ui";
import { formatScale, type GaugeScale } from "./sensor-gauge";

/* ==========================================================================
   Sensor charts for the sensor cards. The chart follows what the sensor
   measures, not one gauge for everything:
     · temperatures      → area trend (slow thermal drift against limits)
     · vibration         → columns (per-minute RMS, spikes stand out)
     · position / margin → step trend (a mechanical setpoint that moves in steps)
     · flow, pressure,
       gas analysis      → line trend
     · load % and speed  → arc gauge (share of capacity)
     · discrete signals  → state timeline
   Trends read the live per-minute history; without one, numeric sensors
   fall back to the arc gauge so a card never shows a fake series.
   ========================================================================== */

export type ChartKind = "area" | "line" | "step" | "columns" | "arc" | "state";

/** Minutes of history shown on trend charts. */
const WINDOW = 60;
const COLUMN_WINDOW = 40;

export function chartKindOf(s: DetailedSensorInfo): ChartKind {
  const unit = (s.unit || "").toLowerCase();
  const name = `${s.name} ${s.sensorType}`.toLowerCase();
  if (unit === "state") return "state";
  if (unit === "mm/s" || unit === "g" || unit === "µm" || name.includes("vibration")) return "columns";
  if (unit === "%" || unit === "rpm") return "arc";
  if (unit === "°c" || unit === "k") return "area";
  if (unit === "mm") return "step";
  return "line";
}

const KIND_LABEL: Record<ChartKind, string> = {
  area: "Temperature trend",
  line: "Trend",
  step: "Position trend",
  columns: "Vibration per minute",
  arc: "Share of scale",
  state: "State timeline",
};

function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [w, setW] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(120, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

const unitOf = (s: DetailedSensorInfo) => (s.unit && s.unit !== "state" ? ` ${s.unit}` : "");
const ago = (i: number, n: number) => (i === n - 1 ? "now" : `${n - 1 - i} min ago`);

/** The chart for one sensor card. */
export function SensorChart({
  sensor,
  scale,
  history,
}: {
  sensor: DetailedSensorInfo;
  scale: GaugeScale | null;
  history?: number[];
}) {
  let kind = chartKindOf(sensor);
  const series = history && history.length > 1 ? history : null;
  if (kind === "state") return <StateTimeline sensor={sensor} history={series} />;
  if (!scale) return null;
  if (!series) kind = "arc";
  if (kind === "arc") return <ArcGauge sensor={sensor} scale={scale} />;
  if (kind === "columns") return <ColumnTrend sensor={sensor} scale={scale} series={series!.slice(-COLUMN_WINDOW)} />;
  return <LineTrend sensor={sensor} scale={scale} series={series!.slice(-WINDOW)} kind={kind} />;
}

/* ------------------------------------------------------------ shared frame */

function ChartFrame({
  kind,
  readout,
  children,
}: {
  kind: ChartKind;
  readout: string | null;
  children: React.ReactNode;
}) {
  return (
    <span className="sc-chart">
      <span className="sc-head">
        <span>{KIND_LABEL[kind]}</span>
        <span className="ast-num">{readout ?? (kind === "arc" ? "" : `Last ${kind === "columns" ? COLUMN_WINDOW : WINDOW} min`)}</span>
      </span>
      {children}
    </span>
  );
}

const H = 84;
const PAD_T = 6;
const PAD_B = 6;
const PAD_L = 30;
const PAD_R = 8;

/** Value domain: the series plus the nearer limit, so headroom to warning is always visible. */
function domain(series: number[], scale: GaugeScale, zeroBase: boolean): [number, number] {
  let lo = Math.min(...series);
  let hi = Math.max(...series);
  if (scale.rising) hi = Math.max(hi, scale.warn);
  else lo = Math.min(lo, scale.warn);
  if (zeroBase) lo = Math.min(0, lo);
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.12;
  return [zeroBase && lo >= 0 ? 0 : lo - pad, hi + pad];
}

function Limits({ scale, y, x0, x1, lo, hi }: { scale: GaugeScale; y: (v: number) => number; x0: number; x1: number; lo: number; hi: number }) {
  const inside = (v: number) => v >= lo && v <= hi;
  // Shade the region past warning, up to the plot edge.
  const edge = scale.rising ? hi : lo;
  const zy = [y(scale.warn), y(edge)].sort((a, b) => a - b);
  return (
    <g>
      <rect className="sc-zone" x={x0} y={zy[0]} width={x1 - x0} height={Math.max(0, zy[1] - zy[0])} />
      {inside(scale.warn) && <line className="sc-limit" data-tone="warn" x1={x0} x2={x1} y1={y(scale.warn)} y2={y(scale.warn)} />}
      {inside(scale.alarm) && <line className="sc-limit" data-tone="bad" x1={x0} x2={x1} y1={y(scale.alarm)} y2={y(scale.alarm)} />}
    </g>
  );
}

function YLabels({ lo, hi, y }: { lo: number; hi: number; y: (v: number) => number }) {
  return (
    <g className="sc-axis">
      <text x={PAD_L - 6} y={y(hi) + 8} textAnchor="end">
        {formatScale(hi)}
      </text>
      <text x={PAD_L - 6} y={y(lo)} textAnchor="end">
        {formatScale(lo)}
      </text>
    </g>
  );
}

function useHover(n: number, x0: number, x1: number) {
  const [i, setI] = useState<number | null>(null);
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const t = (e.clientX - r.left - x0) / (x1 - x0);
    setI(Math.max(0, Math.min(n - 1, Math.round(t * (n - 1)))));
  };
  return { i, onMove, onLeave: () => setI(null) };
}

/* ------------------------------------------------------------ line / area / step */

function LineTrend({
  sensor,
  scale,
  series,
  kind,
}: {
  sensor: DetailedSensorInfo;
  scale: GaugeScale;
  series: number[];
  kind: "area" | "line" | "step";
}) {
  const [ref, W] = useWidth<HTMLSpanElement>(300);
  const n = series.length;
  const [lo, hi] = domain(series, scale, false);
  const x0 = PAD_L;
  const x1 = W - PAD_R;
  const x = (i: number) => x0 + (i / (n - 1)) * (x1 - x0);
  const y = (v: number) => PAD_T + (1 - (v - lo) / (hi - lo)) * (H - PAD_T - PAD_B);
  const hover = useHover(n, x0, x1);

  let d = `M ${x(0)} ${y(series[0])}`;
  for (let i = 1; i < n; i++) {
    d += kind === "step" ? ` H ${x(i)} V ${y(series[i])}` : ` L ${x(i)} ${y(series[i])}`;
  }
  const area = `${d} V ${H - PAD_B} H ${x0} Z`;
  const last = series[n - 1];
  const hi_ = hover.i;

  return (
    <ChartFrame
      kind={kind}
      readout={hi_ === null ? null : `${ago(hi_, n)} · ${formatScale(series[hi_])}${unitOf(sensor)}`}
    >
      <span ref={ref} className="sc-plot">
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          data-tone={severityTone(sensor.status)}
          role="img"
          aria-label={`${KIND_LABEL[kind]} of ${sensor.name}, last ${n} minutes: ${formatScale(Math.min(...series))} to ${formatScale(Math.max(...series))}${unitOf(sensor)}, now ${sensor.value}${unitOf(sensor)}`}
          onMouseMove={hover.onMove}
          onMouseLeave={hover.onLeave}
        >
          <line className="sc-base" x1={x0} x2={x1} y1={H - PAD_B} y2={H - PAD_B} />
          <Limits scale={scale} y={y} x0={x0} x1={x1} lo={lo} hi={hi} />
          <YLabels lo={lo} hi={hi} y={y} />
          {kind === "area" && <path className="sc-area" d={area} />}
          <path className="sc-line" d={d} />
          {hi_ !== null && (
            <g>
              <line className="sc-cross" x1={x(hi_)} x2={x(hi_)} y1={PAD_T} y2={H - PAD_B} />
              <circle className="sc-dot" cx={x(hi_)} cy={y(series[hi_])} r={4} />
            </g>
          )}
          <circle className="sc-now" cx={x(n - 1)} cy={y(last)} r={4} />
        </svg>
      </span>
    </ChartFrame>
  );
}

/* ------------------------------------------------------------ columns */

function ColumnTrend({ sensor, scale, series }: { sensor: DetailedSensorInfo; scale: GaugeScale; series: number[] }) {
  const [ref, W] = useWidth<HTMLSpanElement>(300);
  const n = series.length;
  const [lo, hi] = domain(series, scale, true);
  const x0 = PAD_L;
  const x1 = W - PAD_R;
  const slot = (x1 - x0) / n;
  const bw = Math.max(2, slot - 2);
  const y = (v: number) => PAD_T + (1 - (v - lo) / (hi - lo)) * (H - PAD_T - PAD_B);
  const hover = useHover(n, x0 + slot / 2, x1 - slot / 2);
  const toneOf = (v: number) =>
    scale.rising ? (v >= scale.alarm ? "bad" : v >= scale.warn ? "warn" : undefined) : undefined;

  return (
    <ChartFrame
      kind="columns"
      readout={hover.i === null ? null : `${ago(hover.i, n)} · ${formatScale(series[hover.i])}${unitOf(sensor)}`}
    >
      <span ref={ref} className="sc-plot">
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`${sensor.name} per minute, last ${n} minutes: peak ${formatScale(Math.max(...series))}${unitOf(sensor)}, now ${sensor.value}${unitOf(sensor)}`}
          onMouseMove={hover.onMove}
          onMouseLeave={hover.onLeave}
        >
          <Limits scale={scale} y={y} x0={x0} x1={x1} lo={lo} hi={hi} />
          <YLabels lo={lo} hi={hi} y={y} />
          {series.map((v, i) => {
            const top = y(v);
            const h = Math.max(1, y(lo) - top);
            const r = Math.min(2, bw / 2, h / 2);
            const left = x0 + i * slot + (slot - bw) / 2;
            // Rounded top, square foot on the baseline.
            const path = `M ${left} ${top + h} V ${top + r} Q ${left} ${top} ${left + r} ${top} H ${left + bw - r} Q ${left + bw} ${top} ${left + bw} ${top + r} V ${top + h} Z`;
            return (
              <path
                key={i}
                className={`sc-col${i === n - 1 ? " is-now" : ""}${hover.i === i ? " is-hover" : ""}`}
                data-tone={toneOf(v)}
                d={path}
              />
            );
          })}
          <line className="sc-base" x1={x0} x2={x1} y1={H - PAD_B} y2={H - PAD_B} />
        </svg>
      </span>
    </ChartFrame>
  );
}

/* ------------------------------------------------------------ arc gauge */

const ARC_W = 168;
const ARC_H = 92;
const CX = ARC_W / 2;
const CY = 82;
const R = 66;

function polar(t: number, r = R) {
  const a = Math.PI * (1 - t);
  return { x: CX + r * Math.cos(a), y: CY - r * Math.sin(a) };
}

function arc(t0: number, t1: number, r = R) {
  const a = polar(t0, r);
  const b = polar(t1, r);
  return `M ${a.x} ${a.y} A ${r} ${r} 0 0 1 ${b.x} ${b.y}`;
}

function ArcGauge({ sensor, scale }: { sensor: DetailedSensorInfo; scale: GaugeScale }) {
  const tone = severityTone(sensor.status);
  const t = scale.at(scale.value);
  const zones: Array<[number, number, "warn" | "bad"]> = scale.rising
    ? [
        [scale.at(scale.warn), scale.at(scale.alarm), "warn"],
        [scale.at(scale.alarm), 1, "bad"],
      ]
    : [
        [0, scale.at(scale.alarm), "bad"],
        [scale.at(scale.alarm), scale.at(scale.warn), "warn"],
      ];
  const tip = polar(t, R + 8);
  const base = polar(t, R - 8);

  return (
    <ChartFrame kind="arc" readout={`${formatScale(scale.min)}–${formatScale(scale.max)}${unitOf(sensor)}`}>
      <span className="sc-plot sc-plot--arc">
        <svg
          className="sc-arc"
          data-tone={tone}
          width={ARC_W}
          height={ARC_H}
          viewBox={`0 0 ${ARC_W} ${ARC_H}`}
          role="img"
          aria-label={`${sensor.value}${unitOf(sensor)} on a ${formatScale(scale.min)} to ${formatScale(scale.max)} scale; warning ${scale.warn}, alarm ${scale.alarm}`}
        >
          <path className="sc-arc-track" d={arc(0, 1)} />
          {zones.map(([a, b, z]) => (
            <path key={z} className="sc-arc-zone" data-tone={z} d={arc(a, b, R + 9)} />
          ))}
          {t > 0.005 && <path className="sc-arc-fill" d={arc(0, t)} />}
          <line className="sc-arc-needle" x1={base.x} y1={base.y} x2={tip.x} y2={tip.y} />
          <g className="sc-axis">
            <text x={CX - R} y={CY + 10} textAnchor="middle">
              {formatScale(scale.min)}
            </text>
            <text x={CX + R} y={CY + 10} textAnchor="middle">
              {formatScale(scale.max)}
            </text>
          </g>
        </svg>
      </span>
    </ChartFrame>
  );
}

/* ------------------------------------------------------------ state timeline */

function StateTimeline({ sensor, history }: { sensor: DetailedSensorInfo; history: number[] | null }) {
  const [ref, W] = useWidth<HTMLSpanElement>(300);
  const [hover, setHover] = useState<number | null>(null);
  // 1 = normal state, 0 = off-normal. Without a history only the current state is known.
  const series = (history ?? [sensor.status === "Normal" ? 1 : 0]).slice(-WINDOW);
  const n = series.length;
  const runs: Array<{ from: number; to: number; ok: boolean }> = [];
  series.forEach((v, i) => {
    const ok = v >= 0.5;
    const prev = runs[runs.length - 1];
    if (prev && prev.ok === ok) prev.to = i;
    else runs.push({ from: i, to: i, ok });
  });
  const okShare = Math.round((series.filter((v) => v >= 0.5).length / n) * 100);
  const changes = runs.length - 1;
  const bar = 18;
  const x = (i: number) => (i / n) * W;
  const run = hover === null ? null : runs[hover];

  return (
    <ChartFrame
      kind="state"
      readout={
        run
          ? `${run.ok ? "Normal" : "Off-normal"} · ${run.to - run.from + 1} min`
          : history
            ? `${okShare} % normal · ${changes} change${changes === 1 ? "" : "s"}`
            : "Current state"
      }
    >
      <span ref={ref} className="sc-plot">
        <svg
          width={W}
          height={bar + 16}
          viewBox={`0 0 ${W} ${bar + 16}`}
          role="img"
          aria-label={`${sensor.name}: ${okShare} % of the last ${n} minutes in normal state, ${changes} state changes`}
          onMouseLeave={() => setHover(null)}
        >
          {runs.map((r, i) => (
            <rect
              key={i}
              className={`sc-run${hover === i ? " is-hover" : ""}`}
              data-tone={r.ok ? "good" : "bad"}
              x={x(r.from) + (i ? 1 : 0)}
              y={0}
              width={Math.max(2, x(r.to + 1) - x(r.from) - (i ? 1 : 0))}
              height={bar}
              rx={4}
              onMouseEnter={() => setHover(i)}
            />
          ))}
          {history && (
            <g className="sc-axis">
              <text x={0} y={bar + 13}>
                {n} min ago
              </text>
              <text x={W} y={bar + 13} textAnchor="end">
                now
              </text>
            </g>
          )}
        </svg>
      </span>
    </ChartFrame>
  );
}
