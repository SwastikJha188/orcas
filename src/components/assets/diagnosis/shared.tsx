"use client";

import React, { useEffect, useState } from "react";

/** Semantic diagnosis tokens (globals.css `--dx-*`), theme-aware in light and dark. */
export const DX = {
  good: "var(--dx-good)",
  warn: "var(--dx-warn)",
  bad: "var(--dx-bad)",
  blue: "var(--dx-blue)",
  muted: "var(--text-muted)",
};

export type DxStatus = "Normal" | "Advisory" | "Critical";

export function statusColor(status: string): string {
  if (status === "Critical" || status === "Trip" || status === "Alarm") return DX.bad;
  if (status === "Advisory" || status === "Warning" || status === "Alert") return DX.warn;
  return DX.good;
}

export function statusChipClass(status: string): string {
  if (status === "Critical" || status === "Trip" || status === "Alarm") return "bad";
  if (status === "Advisory" || status === "Warning" || status === "Alert") return "warn";
  return "good";
}

/** Shared clock that ticks on an interval. Deterministic start (0) keeps SSR/CSR in sync. */
export function useLiveTick(intervalMs = 1500): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return tick;
}

/** Deterministic pseudo-noise in [-1, 1]. */
export function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

export function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h % 1000);
}

/** Catmull-Rom → cubic Bézier smooth path. */
export function smoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export interface SegmentItem {
  id: string;
  label: string;
  count?: number;
}

export function Segmented({
  items,
  value,
  onChange,
  size = "md",
  ariaLabel,
}: {
  items: SegmentItem[];
  value: string;
  onChange: (id: string) => void;
  size?: "md" | "sm";
  ariaLabel?: string;
}) {
  return (
    <div className={`dx-segment ${size === "sm" ? "sm" : ""}`} role="tablist" aria-label={ariaLabel}>
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          role="tab"
          aria-selected={value === it.id}
          className={value === it.id ? "active" : ""}
          onClick={() => onChange(it.id)}
        >
          {it.label}
          {typeof it.count === "number" && it.count > 0 && <span className="dx-count">{it.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Ring({
  value,
  size = 72,
  stroke = 8,
  color = DX.good,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: React.ReactNode;
  /** @deprecated No-op: ULTRON does not use glow; colour alone carries status. */
  glow?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--dx-track)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
          style={{
            transition: "stroke-dashoffset 0.8s cubic-bezier(.33,1,.68,1)",
          }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
}

export function Sparkline({
  values,
  width = 120,
  height = 36,
  color = DX.blue,
  fill = true,
  limit,
  domain,
  id,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  limit?: number;
  domain?: [number, number];
  id: string;
}) {
  if (values.length < 2) return null;
  const lo = domain ? domain[0] : Math.min(...values);
  const hi = domain ? domain[1] : Math.max(...values);
  const range = hi - lo || 1;
  const pad = 3;
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * width,
    y: height - pad - ((v - lo) / range) * (height - pad * 2),
  }));
  const d = smoothPath(pts);
  const last = pts[pts.length - 1];
  const limitY = typeof limit === "number" ? height - pad - ((limit - lo) / range) * (height - pad * 2) : null;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: "visible", display: "block" }}>
      <defs>
        <linearGradient id={`spk-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {limitY !== null && limitY >= 0 && limitY <= height && (
        <line x1="0" x2={width} y1={limitY} y2={limitY} stroke={DX.warn} strokeOpacity="0.55" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
      )}
      {fill && <path d={`${d} L ${width} ${height} L 0 ${height} Z`} fill={`url(#spk-${id})`} />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last.x} cy={last.y} r="2.6" fill="var(--dx-ink)" stroke={color} strokeWidth="1.4" />
    </svg>
  );
}

export function CardHead({
  eyebrow,
  title,
  right,
}: {
  eyebrow: string;
  title: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="dx-card-head">
      <div style={{ minWidth: 0 }}>
        <span className="dx-eyebrow">{eyebrow}</span>
        <h3 className="dx-title">{title}</h3>
      </div>
      {right && <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>{right}</div>}
    </div>
  );
}
