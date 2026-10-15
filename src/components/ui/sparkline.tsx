"use client";

import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Tone } from "./status";

/** Catmull-Rom → cubic Bézier path through the points (smooth, passes through every point). */
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

/**
 * Responsive sparkline with hover crosshair + value readout.
 * Measures its own width so markers stay round (no aspect stretching).
 */
export function Sparkline({
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
    const update = () => setWidth(Math.max(40, el.offsetWidth)) /* layout px; rects are zoomed on TV */;
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
