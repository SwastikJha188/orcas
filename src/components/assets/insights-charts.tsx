"use client";

import React from "react";
import { TONE } from "./insights-ui";
import type {
  AnomalyItem,
  ConditionPoint,
  FailureRisk,
  FaultClass,
  ForecastSeries,
  RulItem,
} from "@/server/services/insights-service";

/* ------------------------------------------------------------------ */
/* Numeric formatting + tick helpers — Bloomberg-style tabular readouts */
/* ------------------------------------------------------------------ */

function fmt(v: number): string {
  const a = Math.abs(v);
  if (a >= 10000) return `${(v / 1000).toFixed(1)}k`;
  if (a >= 100) return v.toFixed(1);
  if (a >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

function tickValues(lo: number, hi: number, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i <= n; i++) out.push(lo + ((hi - lo) * i) / n);
  return out;
}

/* ------------------------------------------------------------------ */
/* Forecast chart — measured history + prediction cone                */
/* Right-hand value axis, last-value tag, threshold rails.            */
/* ------------------------------------------------------------------ */

export function ForecastChart({ series }: { series: ForecastSeries }) {
  const W = 860;
  const H = 264;
  const padT = 18;
  const padB = 34;
  const padL = 12;
  const padR = 74;
  const plotR = W - padR;

  const all = [
    ...series.history,
    ...series.forecast,
    ...series.lower,
    ...series.upper,
    ...(series.warning !== null ? [series.warning] : []),
    ...(series.alarm !== null ? [series.alarm] : []),
  ];
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  const span = hi - lo || 1;
  lo -= span * 0.08;
  hi += span * 0.12;

  const total = series.history.length + series.forecast.length;
  const x = (i: number) => padL + (i / (total - 1 || 1)) * (plotR - padL);
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);

  const hLen = series.history.length;
  const histPts = series.history.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const fStart = hLen - 1;
  const forePts = [
    `${x(fStart).toFixed(1)},${y(series.history[hLen - 1]).toFixed(1)}`,
    ...series.forecast.map((v, j) => `${x(hLen + j).toFixed(1)},${y(v).toFixed(1)}`),
  ];

  const bandTop = series.upper.map((v, j) => `${x(hLen + j).toFixed(1)},${y(v).toFixed(1)}`);
  const bandBottom = series.lower
    .map((v, j) => `${x(hLen + j).toFixed(1)},${y(v).toFixed(1)}`)
    .reverse();
  const bandPoly = [...bandTop, ...bandBottom].join(" ");

  const nowX = x(fStart);
  const lastVal = series.forecast[series.forecast.length - 1];
  const lastY = y(lastVal);
  // ULTRON data rule: measured is solid in the health tone, predicted is blue.
  const color = TONE[series.status];
  const predictedColor = "var(--signal-blue)";
  const gid = `${series.tag}-${series.horizonLabel}`.replace(/[^a-zA-Z0-9-]/g, "");

  const ticks = tickValues(lo, hi, 5);
  const nearestTick = ticks.reduce(
    (best, t) => (Math.abs(t - lastVal) < Math.abs(best - lastVal) ? t : best),
    ticks[0]
  );

  const vGrid = 6;
  const vx = (k: number) => padL + (k / vGrid) * (plotR - padL);

  return (
    <svg
      className="ins-forecast"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`${series.name} forecast`}>
      <defs>
        <linearGradient id={`fg-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={predictedColor} stopOpacity="0.24" />
          <stop offset="100%" stopColor={predictedColor} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`hg-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.20" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* time gridlines */}
      {Array.from({ length: vGrid + 1 }).map((_, k) => (
        <line
          key={`v${k}`}
          x1={vx(k)}
          x2={vx(k)}
          y1={padT}
          y2={H - padB}
          className="ins-grid-line ins-grid-line--v"
        />
      ))}

      {/* value gridlines + right-hand ticks */}
      {ticks.map((t, i) => (
        <g key={`h${i}`}>
          <line x1={padL} x2={plotR} y1={y(t)} y2={y(t)} className="ins-grid-line" />
          {t !== nearestTick && (
            <text x={plotR + 8} y={y(t) + 3} className="ins-axis-val dx-mono" textAnchor="start">
              {fmt(t)}
            </text>
          )}
        </g>
      ))}

      {/* threshold rails (labels anchored left, inside plot) */}
      {series.warning !== null && series.warning >= lo && series.warning <= hi && (
        <g>
          <line x1={padL} x2={plotR} y1={y(series.warning)} y2={y(series.warning)} className="ins-thr ins-thr--warn" />
          <text x={padL + 4} y={y(series.warning) - 4} className="ins-thr-label ins-thr-label--warn">
            WARN {fmt(series.warning)}
          </text>
        </g>
      )}
      {series.alarm !== null && series.alarm >= lo && series.alarm <= hi && (
        <g>
          <line x1={padL} x2={plotR} y1={y(series.alarm)} y2={y(series.alarm)} className="ins-thr ins-thr--bad" />
          <text x={padL + 4} y={y(series.alarm) - 4} className="ins-thr-label ins-thr-label--bad">
            TRIP {fmt(series.alarm)}
          </text>
        </g>
      )}

      <polygon points={bandPoly} fill={`url(#fg-${gid})`} />
      <polygon points={bandPoly} className="ins-band-edge" stroke={predictedColor} />

      <polygon
        points={`${histPts.join(" ")} ${x(fStart).toFixed(1)},${(H - padB).toFixed(1)} ${x(0).toFixed(1)},${(H - padB).toFixed(1)}`}
        fill={`url(#hg-${gid})`}
        className="ins-hist-area"
      />

      {/* NOW crosshair */}
      <line x1={nowX} x2={nowX} y1={padT} y2={H - padB} className="ins-now" />
      <text x={nowX} y={padT - 4} className="ins-now-label" textAnchor="middle">
        NOW
      </text>

      <polyline points={histPts.join(" ")} className="ins-hist" stroke={color} />
      <polyline points={forePts.join(" ")} className="ins-fore" stroke={predictedColor} />
      <circle cx={x(fStart)} cy={y(series.history[hLen - 1])} r="3.2" fill="var(--card-bg)" stroke={color} strokeWidth="2" />
      <circle cx={x(total - 1)} cy={lastY} r="3.6" fill={predictedColor} className="ins-fore-end" />

      {/* last-value leader + tag on the value axis (predicted endpoint) */}
      <line x1={x(total - 1)} x2={plotR + 2} y1={lastY} y2={lastY} className="ins-leader" stroke={predictedColor} />
      <rect x={plotR + 2} y={lastY - 8.5} width={padR - 6} height={17} rx="3" fill={predictedColor} className="ins-last-tag" />
      <text x={plotR + 2 + (padR - 6) / 2} y={lastY + 3.5} className="ins-last-val" textAnchor="middle">
        {fmt(lastVal)}
      </text>

      {/* axis captions */}
      <text x={padL} y={H - 10} className="ins-axis-cap" textAnchor="start">
        MEASURED
      </text>
      <text x={plotR} y={H - 10} className="ins-axis-cap" textAnchor="end">
        {series.horizonLabel}
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Condition projection chart                                         */
/* Left value grid, right-hand end-of-series value tags.              */
/* ------------------------------------------------------------------ */

export function ConditionChart({ points, markerDay }: { points: ConditionPoint[]; markerDay: number }) {
  const W = 860;
  const H = 244;
  const padT = 18;
  const padB = 32;
  const padL = 40;
  const padR = 60;
  const plotR = W - padR;

  // Overall plus one dashed line per system in the projection (DB machine_systems).
  const series = [
    { key: "overall", label: "Overall", values: points.map((d) => d.overall), color: "var(--signal-blue)", dash: false, w: 2.4 },
    ...Object.keys(points[0]?.systems ?? {}).map((id) => ({
      key: id,
      label: id,
      values: points.map((d) => d.systems[id] ?? d.overall),
      color: "var(--dx-ink-2)",
      dash: true,
      w: 1.5,
    })),
  ];

  const days = points.map((d) => d.day);
  const allVals = series.flatMap((s) => s.values);
  const lo = Math.min(...allVals, 55);
  const hi = 100;
  const x = (i: number) => padL + (i / (days.length - 1 || 1)) * (plotR - padL);
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);

  const markerIdx = Math.max(0, days.findIndex((d) => d >= markerDay));

  return (
    <svg className="ins-condition" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Condition projection">
      {[100, 90, 80, 70, 60].map((v) => (
        <g key={v}>
          <line x1={padL} x2={plotR} y1={y(v)} y2={y(v)} className="ins-grid-line" />
          <text x={padL - 8} y={y(v) + 3} className="ins-axis-val dx-mono" textAnchor="end">
            {v}
          </text>
        </g>
      ))}

      {markerIdx >= 0 && (
        <line x1={x(markerIdx)} x2={x(markerIdx)} y1={padT} y2={H - padB} className="ins-marker" />
      )}

      {series.map((s) => (
        <polyline
          key={s.key}
          points={s.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")}
          fill="none"
          stroke={s.color}
          strokeWidth={s.w}
          strokeDasharray={s.dash ? "5 5" : undefined}
          strokeLinecap="round"
          opacity={s.key === "overall" ? 1 : 0.85}
        />
      ))}

      {/* end-of-series value tags on the right axis */}
      {series.map((s) => {
        const v = s.values[s.values.length - 1];
        const yy = y(v);
        return (
          <g key={`tag-${s.key}`}>
            <line x1={x(days.length - 1)} x2={plotR + 2} y1={yy} y2={yy} className="ins-leader" stroke={s.color} />
            <rect x={plotR + 3} y={yy - 7.5} width={padR - 7} height={15} rx="3" fill={s.color} className="ins-last-tag" />
            <text x={plotR + 3 + (padR - 7) / 2} y={yy + 3} className="ins-last-val" textAnchor="middle">
              {v.toFixed(0)}
            </text>
          </g>
        );
      })}

      {days.map((d, i) => (
        <text key={d} x={x(i)} y={H - 9} className="ins-axis-val dx-mono" textAnchor="middle">
          {d === 0 ? "NOW" : `${d}D`}
        </text>
      ))}
    </svg>
  );
}

/* ================================================================== */
/* Extended chart suite — full-page Prognosis & Analysis surfaces      */
/* ================================================================== */

function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p0 = { x: cx + r * Math.cos(a0), y: cy + r * Math.sin(a0) };
  const p1 = { x: cx + r * Math.cos(a1), y: cy + r * Math.sin(a1) };
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
}

/** Semi-circular instrument gauge — probability, health or risk score. */
export function GaugeArc({
  value,
  max = 100,
  label,
  unit = "%",
  tone,
  caption,
  size = 1,
}: {
  value: number;
  max?: number;
  label?: string;
  unit?: string;
  tone?: string;
  caption?: string;
  size?: number;
}) {
  const W = 240 * size;
  const H = 140 * size;
  const cx = W / 2;
  const cy = H - 12 * size;
  const r = 96 * size;
  const sw = 14 * size;
  const frac = Math.max(0, Math.min(1, value / (max || 1)));
  const color = tone ?? TONE.Normal;
  const a1 = Math.PI + Math.PI * frac;
  const ticks = Array.from({ length: 11 });
  return (
    <svg
      className="ins-gauge"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`${label ?? "gauge"} ${value}${unit}`}
    >
      <path d={arcPath(cx, cy, r, Math.PI, 2 * Math.PI)} className="ins-gauge-track" strokeWidth={sw} />
      {ticks.map((_, i) => {
        const a = Math.PI + (Math.PI * i) / (ticks.length - 1);
        const x0 = cx + (r - sw / 2 - 5) * Math.cos(a);
        const y0 = cy + (r - sw / 2 - 5) * Math.sin(a);
        const x1 = cx + (r - sw / 2 - 11) * Math.cos(a);
        const y1 = cy + (r - sw / 2 - 11) * Math.sin(a);
        return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} className="ins-gauge-tick" strokeWidth={1.4} />;
      })}
      {frac > 0.001 && (
        <path
          d={arcPath(cx, cy, r, Math.PI, a1)}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
          className="ins-gauge-prog"
        />
      )}
      <text x={cx} y={cy - 30 * size} className="ins-gauge-value" textAnchor="middle" style={{ fill: color }}>
        {Math.round(value)}
        <tspan className="ins-gauge-unit">{unit}</tspan>
      </text>
      {label && (
        <text x={cx} y={cy - 10 * size} className="ins-gauge-label" textAnchor="middle">
          {label}
        </text>
      )}
      {caption && (
        <text x={cx} y={cy + 12 * size} className="ins-gauge-cap" textAnchor="middle">
          {caption}
        </text>
      )}
    </svg>
  );
}

/** Ranked probability lollipops with advisory/danger threshold rails. */
export function RiskRankChart({
  risks,
  warnAt = 25,
  dangerAt = 50,
}: {
  risks: FailureRisk[];
  warnAt?: number;
  dangerAt?: number;
}) {
  const W = 880;
  const padL = 210;
  const padR = 54;
  const padT = 26;
  const rowH = 46;
  const H = padT + risks.length * rowH + 26;
  const plotR = W - padR;
  const x = (v: number) => padL + (Math.max(0, Math.min(100, v)) / 100) * (plotR - padL);
  const wobble = (id: string) => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    return 3 + (Math.abs(h) % 6);
  };
  return (
    <svg className="ins-rank" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Failure risk ranking">
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={x(v)} x2={x(v)} y1={padT - 8} y2={H - 18} className="ins-grid-line ins-grid-line--v" />
          <text x={x(v)} y={H - 6} className="ins-axis-val dx-mono" textAnchor="middle">
            {v}%
          </text>
        </g>
      ))}
      <line x1={x(warnAt)} x2={x(warnAt)} y1={padT - 8} y2={H - 18} className="ins-thr ins-thr--warn" />
      <line x1={x(dangerAt)} x2={x(dangerAt)} y1={padT - 8} y2={H - 18} className="ins-thr ins-thr--bad" />
      {risks.map((r, i) => {
        const cy = padT + i * rowH + rowH / 2;
        const color = TONE[r.severity];
        const unc = wobble(r.id);
        return (
          <g key={r.id}>
            <text x={padL - 14} y={cy - 3} className="ins-rank-name" textAnchor="end">
              {r.fault.length > 26 ? `${r.fault.slice(0, 25)}…` : r.fault}
            </text>
            <text x={padL - 14} y={cy + 11} className="ins-rank-sub" textAnchor="end">
              {r.component}
            </text>
            <line x1={padL} x2={plotR} y1={cy} y2={cy} className="ins-rank-rail" />
            <line x1={x(r.probability - unc)} x2={x(r.probability + unc)} y1={cy} y2={cy} stroke={color} strokeWidth={1.4} opacity={0.5} />
            <rect x={x(0)} y={cy - 5} width={Math.max(0, x(r.probability) - x(0))} height={10} rx={5} fill={color} opacity={0.9} />
            <circle cx={x(r.probability)} cy={cy} r={5.4} fill="var(--card-bg)" stroke={color} strokeWidth={2.4} />
            <text x={x(r.probability) + 12} y={cy + 4} className="ins-rank-val dx-mono" style={{ fill: color }}>
              {Math.round(r.probability)}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Remaining-life timeline — each component's horizon to its end-of-life marker. */
export function RulTimelineChart({ items }: { items: RulItem[] }) {
  const maxH = Math.max(...items.map((x) => x.hours), 1) * 1.12;
  const W = 880;
  const padL = 190;
  const padR = 70;
  const padT = 30;
  const rowH = 42;
  const H = padT + items.length * rowH + 24;
  const plotR = W - padR;
  const x = (h: number) => padL + (h / maxH) * (plotR - padL);
  const stops = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxH * f));
  return (
    <svg className="ins-rultl" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Remaining useful life timeline">
      {stops.map((h, i) => (
        <g key={i}>
          <line x1={x(h)} x2={x(h)} y1={padT - 10} y2={H - 18} className="ins-grid-line ins-grid-line--v" />
          <text x={x(h)} y={H - 5} className="ins-axis-val dx-mono" textAnchor="middle">
            {Math.round(h / 24)}d
          </text>
        </g>
      ))}
      {items.map((r, i) => {
        const cy = padT + i * rowH + rowH / 2;
        const color = TONE[r.status];
        const endX = x(r.hours);
        return (
          <g key={r.id}>
            <text x={padL - 14} y={cy - 2} className="ins-rank-name" textAnchor="end">
              {r.name.length > 24 ? `${r.name.slice(0, 23)}…` : r.name}
            </text>
            <text x={padL - 14} y={cy + 11} className="ins-rank-sub" textAnchor="end">
              health {r.health}%
            </text>
            <rect x={padL} y={cy - 6} width={plotR - padL} height={12} rx={6} className="ins-rultl-track" />
            <rect x={padL} y={cy - 6} width={Math.max(2, endX - padL)} height={12} rx={6} fill={color} opacity={0.82} />
            <line x1={endX} x2={endX} y1={cy - 12} y2={cy + 12} stroke={color} strokeWidth={2.2} />
            <circle cx={endX} cy={cy} r={3.4} fill="var(--card-bg)" stroke={color} strokeWidth={2} />
            <text x={endX + 10} y={cy + 4} className="ins-rank-val dx-mono" style={{ fill: color }}>
              {r.hours.toLocaleString()}h
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Anomaly scatter — abnormality score against deviation from the model reference. */
export function AnomalyScatterChart({ anomalies }: { anomalies: AnomalyItem[] }) {
  const W = 880;
  const H = 300;
  const padL = 54;
  const padB = 40;
  const padT = 22;
  const padR = 22;
  const plotR = W - padR;
  const plotB = H - padB;
  const xs = anomalies.map((a) => Math.abs(parseFloat(a.deviation)) || a.score * 100);
  const xMax = Math.max(10, ...xs) * 1.15;
  const x = (v: number) => padL + (v / xMax) * (plotR - padL);
  const y = (v: number) => padT + (1 - v / 100) * (plotB - padT);
  return (
    <svg className="ins-anomplot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Anomaly score versus deviation">
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={padL} x2={plotR} y1={y(v)} y2={y(v)} className="ins-grid-line" />
          <text x={padL - 8} y={y(v) + 3} className="ins-axis-val dx-mono" textAnchor="end">
            {v}
          </text>
        </g>
      ))}
      <line x1={padL} x2={plotR} y1={y(50)} y2={y(50)} className="ins-thr ins-thr--warn" />
      <line x1={padL} x2={plotR} y1={y(75)} y2={y(75)} className="ins-thr ins-thr--bad" />
      {anomalies.map((a, i) => {
        const color = TONE[a.severity];
        const cx = x(xs[i]);
        const cy = y(a.score * 100);
        return (
          <g key={a.tag}>
            <circle cx={cx} cy={cy} r={9 + a.score * 10} fill={color} opacity={0.18} />
            <circle cx={cx} cy={cy} r={5.4} fill={color} stroke="var(--card-bg)" strokeWidth={1.6} />
            <text x={cx} y={cy - 12} className="ins-scatter-tag" textAnchor="middle">
              {a.tag}
            </text>
          </g>
        );
      })}
      <text x={(padL + plotR) / 2} y={H - 8} className="ins-axis-cap" textAnchor="middle">
        DEVIATION VS MODEL REFERENCE
      </text>
      <text x={16} y={H / 2} className="ins-axis-cap" textAnchor="middle" transform={`rotate(-90 16 ${H / 2})`}>
        ANOMALY SCORE
      </text>
    </svg>
  );
}

/** SHAP-style contribution waterfall — how each feature moved the output. */
export function WaterfallChart({
  items,
  base,
  final,
  unit = "",
  height = 300,
}: {
  items: Array<{ label: string; tag: string; value: number }>;
  base: number;
  final: number;
  unit?: string;
  height?: number;
}) {
  const W = 880;
  const padTop = 22;
  const padBottom = 40;
  const padLeft = 16;
  const padRight = 16;
  const H = height;
  const plotW = W - padLeft - padRight;
  const steps = items.length + 2;
  const colW = plotW / steps;
  const values = [base, ...items.reduce<number[]>((acc, it) => [...acc, (acc[acc.length - 1] ?? base) + it.value], []), final];
  const lo = Math.min(...values, base, final) - 6;
  const hi = Math.max(...values, base, final) + 6;
  const y = (v: number) => padTop + (1 - (v - lo) / (hi - lo || 1)) * (H - padTop - padBottom);
  const bars: React.ReactNode[] = [];
  bars.push(
    <g key="base">
      <rect x={padLeft + 2} y={y(base)} width={colW - 8} height={Math.max(1, y(lo) - y(base))} className="ins-wf-base" rx={3} />
      <text x={padLeft + colW / 2} y={y(base) - 6} className="ins-wf-val dx-mono" textAnchor="middle">
        {base.toFixed(0)}{unit}
      </text>
      <text x={padLeft + colW / 2} y={H - 14} className="ins-axis-val dx-mono" textAnchor="middle">
        BASE
      </text>
    </g>
  );
  let running = base;
  items.forEach((it, i) => {
    const start = running;
    running += it.value;
    const cx = padLeft + (i + 1) * colW + colW / 2;
    const yTop = y(Math.max(start, running));
    const barH = Math.max(2, Math.abs(y(start) - y(running)));
    const color = it.value >= 0 ? "var(--status-danger)" : "var(--status-success)";
    bars.push(
      <g key={it.tag}>
        <line x1={padLeft + (i + 1) * colW - 2} x2={cx - (colW - 8) / 2} y1={y(start)} y2={y(start)} className="ins-wf-conn" />
        <rect x={cx - (colW - 10) / 2} y={yTop} width={colW - 10} height={barH} fill={color} opacity={0.9} rx={3} />
        <text x={cx} y={yTop - 5} className="ins-wf-val dx-mono" textAnchor="middle" style={{ fill: color }}>
          {it.value >= 0 ? "+" : ""}{it.value.toFixed(0)}
        </text>
        <text x={cx} y={H - 14} className="ins-wf-lbl" textAnchor="middle">
          {it.tag.length > 11 ? `${it.tag.slice(0, 10)}…` : it.tag}
        </text>
      </g>
    );
  });
  const lastCx = padLeft + (items.length + 1) * colW + colW / 2;
  bars.push(
    <g key="final">
      <rect x={lastCx - (colW - 8) / 2} y={y(final)} width={colW - 8} height={Math.max(1, y(lo) - y(final))} className="ins-wf-final" rx={3} />
      <text x={lastCx} y={y(final) - 6} className="ins-wf-val dx-mono" textAnchor="middle">
        {final.toFixed(0)}{unit}
      </text>
      <text x={lastCx} y={H - 14} className="ins-axis-val dx-mono" textAnchor="middle">
        OUTPUT
      </text>
    </g>
  );
  return (
    <svg className="ins-waterfall" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Feature contribution waterfall">
      {bars}
    </svg>
  );
}

/** Ranked horizontal probability bars for fault classification. */
export function FaultBarChart({ faults }: { faults: FaultClass[] }) {
  const W = 880;
  const padL = 20;
  const padR = 60;
  const padT = 20;
  const rowH = 40;
  const H = padT + faults.length * rowH + 10;
  const plotR = W - padR;
  const x = (v: number) => padL + (Math.max(0, Math.min(100, v)) / 100) * (plotR - padL);
  return (
    <svg className="ins-faultbar" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Fault class probabilities">
      <line x1={x(50)} x2={x(50)} y1={padT - 6} y2={H - 8} className="ins-thr ins-thr--warn" />
      <line x1={x(80)} x2={x(80)} y1={padT - 6} y2={H - 8} className="ins-thr ins-thr--bad" />
      {faults.map((f, i) => {
        const cy = padT + i * rowH + rowH / 2;
        const color = TONE[f.severity];
        return (
          <g key={f.id}>
            <text x={padL} y={cy - 2} className="ins-rank-name">
              {f.label.length > 44 ? `${f.label.slice(0, 43)}…` : f.label}
            </text>
            <text x={padL} y={cy + 12} className="ins-rank-sub">
              {f.band}
            </text>
            <rect x={padL} y={cy + 16} width={plotR - padL} height={7} rx={3.5} className="ins-rultl-track" />
            <rect x={padL} y={cy + 16} width={Math.max(2, x(f.probability) - padL)} height={7} rx={3.5} fill={color} />
            <text x={plotR + 6} y={cy + 4} className="ins-rank-val dx-mono" style={{ fill: color }}>
              {Math.round(f.probability)}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Small-multiples of every key sensor's measured→predicted trajectory. */
export function ForecastSmallMultiples({
  series,
  activeTag,
  onSelect,
}: {
  series: ForecastSeries[];
  activeTag?: string;
  onSelect?: (tag: string) => void;
}) {
  return (
    <div className="ins-multi">
      {series.map((s) => {
        const W = 240;
        const H = 96;
        const pad = 10;
        const all = [...s.history, ...s.forecast, ...s.upper, ...s.lower];
        const lo = Math.min(...all);
        const hi = Math.max(...all);
        const span = hi - lo || 1;
        const total = s.history.length + s.forecast.length;
        const x = (i: number) => pad + (i / (total - 1 || 1)) * (W - pad * 2);
        const y = (v: number) => pad + (1 - (v - lo) / span) * (H - pad * 2);
        const hLen = s.history.length;
        const fore = [
          `${x(hLen - 1).toFixed(1)},${y(s.history[hLen - 1] ?? s.current).toFixed(1)}`,
          ...s.forecast.map((v, j) => `${x(hLen + j).toFixed(1)},${y(v).toFixed(1)}`),
        ].join(" ");
        const hist = s.history.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
        const color = TONE[s.status];
        return (
          <button
            key={s.tag}
            type="button"
            className={`ins-multi-cell ${activeTag === s.tag ? "is-active" : ""}`}
            onClick={() => onSelect?.(s.tag)}
          >
            <div className="ins-multi-head">
              <span className="ins-multi-tag">{s.tag}</span>
              <span className={`ins-multi-delta ${s.deltaPct >= 0 ? "up" : "down"}`}>
                {s.deltaPct >= 0 ? "+" : ""}
                {s.deltaPct.toFixed(1)}%
              </span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="ins-multi-svg">
              <polyline points={hist} fill="none" stroke={color} strokeWidth={1.8} vectorEffect="non-scaling-stroke" />
              <polyline points={fore} fill="none" stroke="var(--signal-blue)" strokeWidth={1.6} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="ins-multi-foot">
              <span>{s.current.toFixed(1)}</span>
              <span className="ins-multi-arrow">→</span>
              <span style={{ color: "var(--signal-blue)" }}>{s.predicted.toFixed(1)}</span>
              <span className="ins-multi-unit">{s.unit}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Degradation Progression Curve Chart (PDF 2, p1-2)                   */
/* Shows multi-week progression, wear stage bands, load compensation.  */
/* ------------------------------------------------------------------ */

export function DegradationCurveChart({
  days = 60,
  currentLdi = 62,
  componentName = "Bearing B-101",
}: {
  days?: number;
  currentLdi?: number;
  componentName?: string;
}) {
  const W = 860;
  const H = 260;
  const padT = 24;
  const padB = 34;
  const padL = 46;
  const padR = 80;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  // Generate 8 weekly data points simulating progressive deterioration under comparable load
  const points = [
    { week: 0, ldi: 94, rawVib: 1.8, temp: 58, load: 70 },
    { week: 1, ldi: 91, rawVib: 1.9, temp: 59, load: 71 },
    { week: 2, ldi: 87, rawVib: 2.1, temp: 61, load: 69 },
    { week: 3, ldi: 82, rawVib: 2.3, temp: 63, load: 70 },
    { week: 4, ldi: 76, rawVib: 2.6, temp: 66, load: 70 },
    { week: 5, ldi: 71, rawVib: 2.9, temp: 68, load: 72 },
    { week: 6, ldi: 65, rawVib: 3.3, temp: 71, load: 70 },
    { week: 7, ldi: currentLdi, rawVib: 3.5, temp: 72, load: 70 },
  ];

  const x = (i: number) => padL + (i / (points.length - 1)) * plotW;
  const y = (val: number) => padT + (1 - (val - 20) / 80) * plotH;

  const ldiPts = points.map((p, i) => `${x(i).toFixed(1)},${y(p.ldi).toFixed(1)}`).join(" ");

  // Stage boundaries on 0-100 scale: Healthy (85), Early Wear (70), Progressive (50), Severe (25)
  const stages = [
    { label: "Healthy (>85%)", val: 85, color: "color-mix(in srgb, var(--status-success) 15%, transparent)", stroke: "var(--status-success)" },
    { label: "Early Wear (70–84%)", val: 70, color: "color-mix(in srgb, var(--signal-blue) 12%, transparent)", stroke: "var(--signal-blue)" },
    { label: "Progressive (50–69%)", val: 50, color: "color-mix(in srgb, var(--status-warning) 12%, transparent)", stroke: "var(--status-warning)" },
    { label: "Severe (<50%)", val: 25, color: "color-mix(in srgb, var(--status-danger) 12%, transparent)", stroke: "var(--status-danger)" },
  ];

  const lastPt = points[points.length - 1];
  const lastX = x(points.length - 1);
  const lastY = y(lastPt.ldi);

  return (
    <svg className="ins-condition" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Degradation trajectory chart">
      <defs>
        <linearGradient id="deg-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--status-warning)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--status-warning)" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Stage background zones */}
      <rect x={padL} y={y(100)} width={plotW} height={y(85) - y(100)} fill="var(--status-success)" fillOpacity={0.05} />
      <rect x={padL} y={y(85)} width={plotW} height={y(70) - y(85)} fill="var(--signal-blue)" fillOpacity={0.04} />
      <rect x={padL} y={y(70)} width={plotW} height={y(50) - y(70)} fill="var(--status-warning)" fillOpacity={0.06} />
      <rect x={padL} y={y(50)} width={plotW} height={y(20) - y(50)} fill="var(--status-danger)" fillOpacity={0.06} />

      {/* Gridlines */}
      {[100, 85, 70, 50, 30].map((v) => (
        <g key={v}>
          <line x1={padL} x2={padL + plotW} y1={y(v)} y2={y(v)} stroke="var(--dx-line)" strokeDasharray={v === 70 || v === 50 ? "4 4" : undefined} />
          <text x={padL - 8} y={y(v) + 3} className="ins-axis-val dx-mono" textAnchor="end">
            {v}%
          </text>
        </g>
      ))}

      {/* Shaded Area under Curve */}
      <polygon
        points={`${ldiPts} ${lastX.toFixed(1)},${(padT + plotH).toFixed(1)} ${padL},${(padT + plotH).toFixed(1)}`}
        fill="url(#deg-grad)"
      />

      {/* Trajectory Polyline */}
      <polyline points={ldiPts} fill="none" stroke="var(--status-warning)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />

      {/* Historical dots */}
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.ldi)} r="3.2" fill="var(--card-bg)" stroke="var(--status-warning)" strokeWidth="2" />
      ))}

      {/* Current point highlight */}
      <circle cx={lastX} cy={lastY} r="6" fill="var(--status-warning)" />
      <circle cx={lastX} cy={lastY} r="10" fill="none" stroke="var(--status-warning)" strokeWidth="1.5" opacity="0.6">
        <animate attributeName="r" values="6;14;6" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0;0.8" dur="2.4s" repeatCount="indefinite" />
      </circle>

      {/* Current LDI Tag */}
      <rect x={lastX + 6} y={lastY - 11} width={62} height={20} rx="4" fill="var(--status-warning)" />
      <text x={lastX + 37} y={lastY + 3} fill="var(--on-status-fg)" fontWeight="600" fontSize="11" textAnchor="middle" fontFamily="var(--font-ui)">
        {lastPt.ldi}% LDI
      </text>

      {/* Time X-axis */}
      {points.map((p, i) => (
        <text key={i} x={x(i)} y={H - 12} className="ins-axis-val dx-mono" textAnchor="middle">
          {i === 0 ? "-7 Wks" : i === points.length - 1 ? "NOW" : `-W${7 - i}`}
        </text>
      ))}

      {/* Stage labels on right axis */}
      <text x={padL + plotW + 8} y={y(92)} fill="var(--status-success)" fontSize="10" fontWeight="500">
        Stage II Healthy
      </text>
      <text x={padL + plotW + 8} y={y(77)} fill="var(--signal-blue)" fontSize="10" fontWeight="500">
        Stage III Early Wear
      </text>
      <text x={padL + plotW + 8} y={y(59)} fill="var(--status-warning)" fontSize="10" fontWeight="600">
        Stage IV Deterioration
      </text>
      <text x={padL + plotW + 8} y={y(35)} fill="var(--status-danger)" fontSize="10" fontWeight="500">
        Stage V Severe
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Multivariate Anomaly Manifold Chart (PDF 3, p3-5)                  */
/* Shows normal correlation cluster vs joint outlier beacon.          */
/* ------------------------------------------------------------------ */

export function MultivariateManifoldChart() {
  const W = 860;
  const H = 260;
  const padT = 24;
  const padB = 34;
  const padL = 60;
  const padR = 30;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  // Normal cluster center: Flow = 95-105 m3/h, Motor Current = 14-16 A
  const cx = padL + plotW * 0.42;
  const cy = padT + plotH * 0.62;

  // Current anomalous point: Flow = 70 m3/h, Motor Current = 18 A
  const anomX = padL + plotW * 0.82;
  const anomY = padT + plotH * 0.22;

  return (
    <svg className="ins-condition" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Multivariate anomaly manifold">
      <defs>
        <radialGradient id="normal-ellipse-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--status-success)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--status-success)" stopOpacity="0.02" />
        </radialGradient>
      </defs>

      {/* Gridlines */}
      {[0.2, 0.4, 0.6, 0.8].map((f) => (
        <g key={f}>
          <line x1={padL} x2={padL + plotW} y1={padT + f * plotH} y2={padT + f * plotH} stroke="var(--dx-line)" />
          <line x1={padL + f * plotW} x2={padL + f * plotW} y1={padT} y2={padT + plotH} stroke="var(--dx-line)" />
        </g>
      ))}

      {/* Normal Learned Manifold Ellipses (2-sigma and 3-sigma) */}
      <ellipse cx={cx} cy={cy} rx={plotW * 0.24} ry={plotH * 0.28} transform={`rotate(-22 ${cx} ${cy})`} fill="url(#normal-ellipse-grad)" stroke="var(--status-success)" strokeWidth="1.2" strokeDasharray="3 3" />
      <ellipse cx={cx} cy={cy} rx={plotW * 0.15} ry={plotH * 0.18} transform={`rotate(-22 ${cx} ${cy})`} fill="none" stroke="var(--status-success)" strokeWidth="1.8" />

      {/* Simulated historical normal points */}
      {[
        [-20, 10], [15, -15], [30, 5], [-10, -25], [5, 20], [-35, 5],
        [25, 25], [-15, -10], [10, -5], [-25, 18], [0, 0], [40, -10],
      ].map(([dx, dy], i) => (
        <circle key={i} cx={cx + dx * 1.8} cy={cy + dy * 1.4} r="2.5" fill="var(--status-success)" opacity="0.65" />
      ))}

      <text x={cx} y={cy + 4} fill="var(--status-success)" fontSize="11" fontWeight="500" textAnchor="middle">
        Learned Normal Operating Envelope (99.7% density)
      </text>

      {/* Single-variable 1D threshold bands (dashed white) showing that individually each variable is in permitted range */}
      <line x1={padL} x2={padL + plotW} y1={padT + plotH * 0.12} y2={padT + plotH * 0.12} stroke="var(--dx-ink)" strokeOpacity={0.2} strokeDasharray="4 4" />
      <text x={padL + 6} y={padT + plotH * 0.12 - 4} fill="var(--text-muted)" fontSize="9">
        Motor Current Trip Limit (22 A)
      </text>

      {/* Anomalous Observation Beacon */}
      <line x1={cx} x2={anomX} y1={cy} y2={anomY} stroke="var(--status-danger)" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.7" />
      <circle cx={anomX} cy={anomY} r="7" fill="var(--status-danger)" />
      <circle cx={anomX} cy={anomY} r="14" fill="none" stroke="var(--status-danger)" strokeWidth="1.5">
        <animate attributeName="r" values="7;18;7" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.9;0;0.9" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* Callout box on anomalous observation */}
      <rect x={anomX - 170} y={anomY - 42} width={160} height={36} rx="6" fill="var(--card-bg)" stroke="var(--status-danger)" strokeWidth="1.2" />
      <text x={anomX - 90} y={anomY - 26} fill="var(--dx-ink)" fontSize="10" fontWeight="600" textAnchor="middle">
        UNKNOWN MULTIVARIATE ANOMALY
      </text>
      <text x={anomX - 90} y={anomY - 12} fill="var(--status-danger)" fontSize="9" textAnchor="middle">
        Joint Mahalanobis Distance: 4.8σ
      </text>

      {/* Axis Titles */}
      <text x={padL + plotW / 2} y={H - 8} className="ins-axis-cap" textAnchor="middle">
        WATER FLOW RATE (m³/h) →
      </text>
      <text x={18} y={padT + plotH / 2} className="ins-axis-cap" textAnchor="middle" transform={`rotate(-90 18 ${padT + plotH / 2})`}>
        MOTOR CURRENT (A) →
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Cumulative Failure Survival & Risk Curve (PDF 2, p3-4)              */
/* Visualizes failure probability progression over operating hours.   */
/* ------------------------------------------------------------------ */

export function SurvivalRiskCurve({
  horizonHours = 72,
  currentRisk = 12.4,
}: {
  horizonHours?: number;
  currentRisk?: number;
}) {
  const W = 860;
  const H = 250;
  const padT = 24;
  const padB = 34;
  const padL = 50;
  const padR = 70;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  // Hours: 0 to 180
  const hours = [0, 12, 24, 36, 48, 60, 72, 96, 120, 144, 168, 180];
  // Risk curve (increasing failure probability)
  const riskPts = [
    { h: 0, r: 0.8 },
    { h: 12, r: 1.6 },
    { h: 24, r: 2.8 },
    { h: 36, r: 4.5 },
    { h: 48, r: 6.9 },
    { h: 60, r: 9.4 },
    { h: 72, r: currentRisk },
    { h: 96, r: 19.5 },
    { h: 120, r: 29.2 },
    { h: 144, r: 41.0 },
    { h: 168, r: 54.5 },
    { h: 180, r: 62.0 },
  ];

  // Baseline fleet normal curve (2.1% at 72h)
  const basePts = riskPts.map((p) => ({ h: p.h, r: (p.h / 72) * 2.1 }));

  const x = (h: number) => padL + (h / 180) * plotW;
  const y = (r: number) => padT + (1 - r / 70) * plotH;

  const polyPts = riskPts.map((p) => `${x(p.h).toFixed(1)},${y(p.r).toFixed(1)}`).join(" ");
  const basePoly = basePts.map((p) => `${x(p.h).toFixed(1)},${y(p.r).toFixed(1)}`).join(" ");

  const horizonX = x(horizonHours);
  const horizonY = y(currentRisk);

  return (
    <svg className="ins-condition" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Cumulative failure risk curve">
      <defs>
        <linearGradient id="risk-curve-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--status-danger)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--status-danger)" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Shaded horizon evaluation zone (0 to 72h) */}
      <rect x={padL} y={padT} width={horizonX - padL} height={plotH} fill="var(--status-danger)" fillOpacity={0.06} />

      {/* Gridlines */}
      {[0, 15, 30, 45, 60].map((v) => (
        <g key={v}>
          <line x1={padL} x2={padL + plotW} y1={y(v)} y2={y(v)} stroke="var(--dx-line)" />
          <text x={padL - 8} y={y(v) + 3} className="ins-axis-val dx-mono" textAnchor="end">
            {v}%
          </text>
        </g>
      ))}

      {/* Fleet Baseline Normal Curve (dashed gray) */}
      <polyline points={basePoly} fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeDasharray="4 4" />
      <text x={padL + plotW - 12} y={y(basePts[basePts.length - 1].r) - 6} fill="var(--text-muted)" fontSize="10" textAnchor="end">
        Fleet Reference Baseline (2.1% at 72h)
      </text>

      {/* Shaded Area under Risk Curve up to horizon */}
      <polygon
        points={`${polyPts} ${x(180).toFixed(1)},${(padT + plotH).toFixed(1)} ${padL},${(padT + plotH).toFixed(1)}`}
        fill="url(#risk-curve-grad)"
      />

      {/* Main Failure Risk Trajectory */}
      <polyline points={polyPts} fill="none" stroke="var(--status-danger)" strokeWidth="2.8" strokeLinecap="round" />

      {/* Horizon evaluation line */}
      <line x1={horizonX} x2={horizonX} y1={padT} y2={padT + plotH} stroke="var(--status-danger)" strokeWidth="1.5" strokeDasharray="3 3" />
      <text x={horizonX} y={padT - 6} fill="var(--status-danger)" fontSize="11" fontWeight="600" textAnchor="middle">
        Horizon: {horizonHours}h
      </text>

      {/* Current horizon risk point */}
      <circle cx={horizonX} cy={horizonY} r="6" fill="var(--status-danger)" />
      <rect x={horizonX + 8} y={horizonY - 12} width={74} height={22} rx="4" fill="var(--status-danger)" />
      <text x={horizonX + 45} y={horizonY + 3} fill="var(--on-status-fg)" fontWeight="700" fontSize="11" textAnchor="middle">
        {currentRisk}% RISK
      </text>

      {/* X-axis ticks */}
      {hours.map((h) => (
        <text key={h} x={x(h)} y={H - 10} className="ins-axis-val dx-mono" textAnchor="middle">
          {h}h
        </text>
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* RUL Prognostic Curve & Uncertainty Bell Curve (PDF 2, p4-6)        */
/* Dual view: degradation trajectory to EOL + 95% CI probability bell */
/* ------------------------------------------------------------------ */

export function RulBellCurveChart({
  estimatedHours = 120,
  ciLow = 84,
  ciHigh = 156,
}: {
  estimatedHours?: number;
  ciLow?: number;
  ciHigh?: number;
}) {
  const W = 860;
  const H = 250;
  const padT = 24;
  const padB = 34;
  const padL = 50;
  const padR = 60;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  // Bell curve around estimatedHours (120) with range 40h to 200h
  const minH = 40;
  const maxH = 200;
  const mean = estimatedHours;
  const sigma = (ciHigh - ciLow) / 3.92; // 95% CI is approx ±1.96 sigma

  const steps = 48;
  const bellPts: Array<{ x: number; y: number; h: number }> = [];

  for (let i = 0; i <= steps; i++) {
    const h = minH + (i / steps) * (maxH - minH);
    const z = (h - mean) / sigma;
    const density = Math.exp(-0.5 * z * z);
    const px = padL + (i / steps) * plotW;
    const py = padT + (1 - density) * (plotH - 20) + 10;
    bellPts.push({ x: px, y: py, h });
  }

  const bellPoly = bellPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  // Shaded region between ciLow and ciHigh
  const shadedPts = bellPts.filter((p) => p.h >= ciLow && p.h <= ciHigh);
  const shadedPoly = [
    `${shadedPts[0]?.x.toFixed(1)},${(padT + plotH).toFixed(1)}`,
    ...shadedPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`),
    `${shadedPts[shadedPts.length - 1]?.x.toFixed(1)},${(padT + plotH).toFixed(1)}`,
  ].join(" ");

  const meanX = padL + ((mean - minH) / (maxH - minH)) * plotW;
  const lowX = padL + ((ciLow - minH) / (maxH - minH)) * plotW;
  const highX = padL + ((ciHigh - minH) / (maxH - minH)) * plotW;

  return (
    <svg className="ins-condition" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="RUL probability density bell curve">
      <defs>
        <linearGradient id="bell-ci-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--signal-blue)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="var(--signal-blue)" stopOpacity="0.04" />
        </linearGradient>
      </defs>

      {/* Gridlines */}
      <line x1={padL} x2={padL + plotW} y1={padT + plotH} y2={padT + plotH} stroke="var(--dx-ink)" strokeOpacity={0.12} />

      {/* Shaded 95% Confidence Interval */}
      {shadedPts.length > 0 && <polygon points={shadedPoly} fill="url(#bell-ci-grad)" />}

      {/* Bell Curve Outline */}
      <polyline points={bellPoly} fill="none" stroke="var(--signal-blue)" strokeWidth="2.5" strokeLinecap="round" />

      {/* Center Mean Vertical Axis */}
      <line x1={meanX} x2={meanX} y1={padT} y2={padT + plotH} stroke="var(--signal-blue)" strokeWidth="2" strokeDasharray="4 3" />
      <circle cx={meanX} cy={padT + 10} r="5" fill="var(--signal-blue)" />

      {/* Mean RUL Badge */}
      <rect x={meanX - 55} y={padT - 18} width={110} height={20} rx="4" fill="var(--signal-blue)" />
      <text x={meanX} y={padT - 4} fill="var(--on-status-fg)" fontWeight="700" fontSize="11" textAnchor="middle">
        {mean}h RUL (p50)
      </text>

      {/* CI Interval Bounds */}
      <line x1={lowX} x2={lowX} y1={padT + 25} y2={padT + plotH} stroke="var(--dx-ink)" strokeOpacity={0.25} strokeDasharray="3 3" />
      <line x1={highX} x2={highX} y1={padT + 25} y2={padT + plotH} stroke="var(--dx-ink)" strokeOpacity={0.25} strokeDasharray="3 3" />

      <text x={lowX} y={padT + plotH - 8} fill="var(--text-muted)" fontSize="10" textAnchor="middle" className="dx-mono">
        p10: {ciLow}h
      </text>
      <text x={highX} y={padT + plotH - 8} fill="var(--text-muted)" fontSize="10" textAnchor="middle" className="dx-mono">
        p90: {ciHigh}h
      </text>

      {/* Horizontal interval bracket */}
      <line x1={lowX} x2={highX} y1={padT + plotH - 24} y2={padT + plotH - 24} stroke="var(--signal-blue)" strokeWidth="1.5" />
      <text x={meanX} y={padT + plotH - 30} fill="var(--signal-blue)" fontSize="10" fontWeight="600" textAnchor="middle">
        95% Prediction Interval: [{ciLow}h – {ciHigh}h]
      </text>

      {/* X-axis labels */}
      {[50, 75, 100, 125, 150, 175, 200].map((h) => (
        <text key={h} x={padL + ((h - minH) / (maxH - minH)) * plotW} y={H - 10} className="ins-axis-val dx-mono" textAnchor="middle">
          {h}h
        </text>
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Prescriptive Maintenance Window Scheduler Timeline (PDF 2, p6-7)   */
/* ------------------------------------------------------------------ */

export function MaintenanceWindowTimeline({
  windowTime = "Tomorrow 14:00 – 18:00 UTC",
  duration = "3.5 hours",
}: {
  windowTime?: string;
  duration?: string;
}) {
  const W = 860;
  const H = 140;
  const padL = 40;
  const padR = 40;
  const plotW = W - padL - padR;

  return (
    <svg className="ins-condition" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Maintenance opportunity window">
      {/* Base timeline rail */}
      <line x1={padL} x2={padL + plotW} y1={60} y2={60} stroke="var(--dx-ink)" strokeOpacity={0.12} strokeWidth="4" strokeLinecap="round" />

      {/* Past/Current time marker */}
      <circle cx={padL + 40} cy={60} r="7" fill="var(--status-success)" />
      <text x={padL + 40} y={40} fill="var(--status-success)" fontSize="11" fontWeight="600" textAnchor="middle">
        NOW (Operating)
      </text>

      {/* Recommended Window Bracket (Tomorrow afternoon) */}
      <rect x={padL + plotW * 0.32} y={44} width={plotW * 0.22} height={32} rx="8" fill="var(--status-success)" fillOpacity={0.18} stroke="var(--status-success)" strokeWidth="1.8" />
      <text x={padL + plotW * 0.43} y={34} fill="var(--status-success)" fontSize="11" fontWeight="700" textAnchor="middle">
        RECOMMENDED WINDOW ({windowTime})
      </text>
      <text x={padL + plotW * 0.43} y={64} fill="var(--dx-ink)" fontSize="10" fontWeight="600" textAnchor="middle">
        Cell B Changeover · {duration}
      </text>

      {/* 72h Failure Risk Threshold */}
      <line x1={padL + plotW * 0.65} x2={padL + plotW * 0.65} y1={42} y2={78} stroke="var(--status-warning)" strokeWidth="2" strokeDasharray="3 3" />
      <text x={padL + plotW * 0.65} y={34} fill="var(--status-warning)" fontSize="10" fontWeight="600" textAnchor="middle">
        +72h Risk Horizon (12.4% risk)
      </text>

      {/* 120h RUL Functional Failure Limit */}
      <circle cx={padL + plotW * 0.92} cy={60} r="7" fill="var(--status-danger)" />
      <text x={padL + plotW * 0.92} y={34} fill="var(--status-danger)" fontSize="11" fontWeight="700" textAnchor="middle">
        +120h RUL Limit
      </text>
      <text x={padL + plotW * 0.92} y={96} fill="var(--status-danger)" fontSize="9" textAnchor="middle">
        Unplanned Trip Boundary
      </text>

      {/* Consequence of delay zone */}
      <line x1={padL + plotW * 0.54} x2={padL + plotW * 0.92} y1={85} y2={85} stroke="var(--status-danger)" strokeWidth="1.2" strokeDasharray="4 4" />
      <text x={padL + plotW * 0.73} y={102} fill="var(--status-danger)" fontSize="10" textAnchor="middle">
        Delay Zone: $45,000/hr outage risk
      </text>
    </svg>
  );
}

