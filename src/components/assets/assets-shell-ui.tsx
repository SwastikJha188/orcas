"use client";

import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { smoothPath } from "./diagnosis/shared";

/* ==========================================================================
   Shared primitives for the Assets shell (directory, header, overview,
   sensor mapping). Token-only colour via data-tone → --tone (assets-shell.css).
   ========================================================================== */

export type Tone = "good" | "warn" | "bad" | "idle" | "info";

export function severityTone(status: string): Tone {
  if (status === "Critical" || status === "Alarm" || status === "Trip") return "bad";
  if (status === "Advisory" || status === "Warning" || status === "Alert") return "warn";
  return "good";
}

export function machineTone(status: string): Tone {
  if (status === "Advisory") return "warn";
  if (status === "Critical") return "bad";
  if (status === "Standby" || status === "Maintenance") return "idle";
  return "good";
}

export function healthTone(health: number): Tone {
  if (health >= 90) return "good";
  if (health >= 75) return "warn";
  return "bad";
}

/** Status chip: coloured dot carries state, label stays in text ink. */
export function StatusTag({ tone, label, className = "" }: { tone: Tone; label: string; className?: string }) {
  return (
    <span className={`ast-chip ${className}`.trim()} data-tone={tone}>
      <span className="ast-chip-dot" aria-hidden="true" />
      {label}
    </span>
  );
}

/** Quantised instrument meter — discrete ticks, fill carries state. */
export function Ticks({
  value,
  max = 100,
  tone,
  ticks = 20,
  label,
}: {
  value: number;
  max?: number;
  tone: Tone;
  ticks?: number;
  label?: string;
}) {
  const filled = Math.max(0, Math.min(ticks, Math.round((value / (max || 1)) * ticks)));
  return (
    <span
      className="ast-ticks"
      data-tone={tone}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {Array.from({ length: ticks }, (_, i) => (
        <i key={i} className={i < filled ? "on" : undefined} />
      ))}
    </span>
  );
}

/** Circular health gauge. No glow — track + arc only. */
export function HealthRing({
  value,
  size = 40,
  stroke = 4,
  tone,
  children,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: Tone;
  children?: React.ReactNode;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <span
      className="ast-ring"
      data-tone={tone ?? healthTone(v)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `Health ${Math.round(v)} %`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="ast-ring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
        <circle
          className="ast-ring-arc"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {children && <span className="ast-ring-center">{children}</span>}
    </span>
  );
}

/** Stacked segment bar with a 2px surface gap between segments. */
export function SegmentBar({
  segments,
  label,
}: {
  segments: Array<{ id: string; value: number; tone: Tone }>;
  label: string;
}) {
  const total = segments.reduce((n, s) => n + s.value, 0) || 1;
  return (
    <span className="ast-seg" role="img" aria-label={label}>
      {segments
        .filter((s) => s.value > 0)
        .map((s) => (
          <span key={s.id} data-tone={s.tone} style={{ flexGrow: s.value / total }} />
        ))}
    </span>
  );
}

/**
 * Responsive sparkline with hover crosshair + value readout.
 * Measures its own width so markers stay round (no aspect stretching).
 */
export function Spark({
  values,
  labels,
  unit,
  height = 40,
  tone = "info",
  digits = 1,
  ariaLabel,
}: {
  values: number[];
  labels?: string[];
  unit: string;
  height?: number;
  tone?: Tone;
  digits?: number;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(200);
  const [hover, setHover] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.max(40, Math.round(el.getBoundingClientRect().width)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const geo = useMemo(() => {
    if (values.length < 2) return null;
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const span = hi - lo || Math.abs(hi) * 0.02 || 1;
    const padY = 5;
    const padX = 4;
    const pts = values.map((v, i) => ({
      x: padX + (i / (values.length - 1)) * (width - padX * 2),
      y: padY + (1 - (v - (lo - (hi === lo ? span / 2 : 0))) / span) * (height - padY * 2),
    }));
    const line = smoothPath(pts);
    const area = `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${height} L ${pts[0].x.toFixed(1)} ${height} Z`;
    return { pts, line, area };
  }, [values, width, height]);

  if (!geo) return <div ref={ref} className="ast-spark" style={{ height }} aria-hidden="true" />;

  const idx = hover ?? geo.pts.length - 1;
  const p = geo.pts[idx];

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left) / Math.max(1, rect.width);
    setHover(Math.max(0, Math.min(geo.pts.length - 1, Math.round(rel * (geo.pts.length - 1)))));
  };

  return (
    <div ref={ref} className="ast-spark" data-tone={tone} style={{ height }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={ariaLabel}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <path className="ast-spark-area" d={geo.area} />
        <path className="ast-spark-line" d={geo.line} />
        {hover !== null && <line className="ast-spark-cross" x1={p.x} x2={p.x} y1={0} y2={height} />}
        <circle className="ast-spark-dot" cx={p.x} cy={p.y} r={3.5} />
      </svg>
      {hover !== null && (
        <span
          className="ast-spark-tip"
          style={{ left: Math.min(Math.max(p.x, 40), width - 40) }}
          aria-hidden="true"
        >
          {values[idx].toFixed(digits)} {unit}
          {labels?.[idx] ? <em>{labels[idx]}</em> : null}
        </span>
      )}
    </div>
  );
}

/** Pill search field. */
export function SearchPill({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <label className="ast-search">
      <IconSearch />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/* ---------------------------------------------------------------- icons */

type IconProps = { size?: number };

const svgBase = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export function IconMachine({ size = 16 }: IconProps) {
  return (
    <svg {...svgBase(size)}>
      <rect x="3" y="7" width="13" height="10" rx="2" />
      <path d="M16 10h3l2 2v0l-2 2h-3" />
      <path d="M6 17v2M13 17v2" />
    </svg>
  );
}

export function IconArea({ size = 16 }: IconProps) {
  return (
    <svg {...svgBase(size)}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function IconSensor({ size = 16 }: IconProps) {
  return (
    <svg {...svgBase(size)}>
      <circle cx="12" cy="12" r="2.5" />
      <path d="M7.5 7.5a6.4 6.4 0 0 0 0 9M16.5 7.5a6.4 6.4 0 0 1 0 9" />
    </svg>
  );
}

export function IconPulse({ size = 16 }: IconProps) {
  return (
    <svg {...svgBase(size)}>
      <path d="M3 12h4l2-5 4 10 2-5h6" />
    </svg>
  );
}

export function IconAlert({ size = 16 }: IconProps) {
  return (
    <svg {...svgBase(size)}>
      <path d="M12 4 3 20h18L12 4Z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  );
}

export function IconSearch({ size = 14 }: IconProps) {
  return (
    <svg {...svgBase(size)} strokeWidth={2}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4.2-4.2" />
    </svg>
  );
}

export function IconChevron({ size = 12, dir = "right" }: IconProps & { dir?: "right" | "down" | "left" }) {
  const d = dir === "down" ? "m6 9 6 6 6-6" : dir === "left" ? "m15 6-6 6 6 6" : "m9 6 6 6-6 6";
  return (
    <svg {...svgBase(size)} strokeWidth={2.2}>
      <path d={d} />
    </svg>
  );
}

export function IconBack({ size = 14 }: IconProps) {
  return (
    <svg {...svgBase(size)} strokeWidth={2}>
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </svg>
  );
}

export function IconMore({ size = 16 }: IconProps) {
  return (
    <svg {...svgBase(size)} strokeWidth={2.4}>
      <path d="M6 12h.01M12 12h.01M18 12h.01" />
    </svg>
  );
}

export function IconClose({ size = 14 }: IconProps) {
  return (
    <svg {...svgBase(size)} strokeWidth={2}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function IconGrid({ size = 14 }: IconProps) {
  return (
    <svg {...svgBase(size)}>
      <rect x="4" y="4" width="6" height="6" rx="1.2" />
      <rect x="14" y="4" width="6" height="6" rx="1.2" />
      <rect x="4" y="14" width="6" height="6" rx="1.2" />
      <rect x="14" y="14" width="6" height="6" rx="1.2" />
    </svg>
  );
}
