"use client";

import React, { useCallback, useRef, useState } from "react";
import { fmtMin } from "@/lib/kiln-sim/test-lab";

/**
 * Primary visual of the Simulation page: live machine health across the
 * running scenario, with the scenario start, the D5 Table 9.8 documented
 * detection time and each finding the analysis layer confirmed. X axis is
 * plant minutes since the scenario started.
 */

export interface ResponseMarker {
  id: string;
  /** Text by the marker (the rule name); the ID stays in the tooltip. */
  label?: string;
  /** Plant minutes after scenario start. */
  at: number;
  tone: "good" | "warn" | "bad" | "info";
  expected: boolean;
}

interface Props {
  /** Simulated minute per history sample, oldest first. */
  times: number[];
  /** Overall machine health, %, aligned with `times`. */
  health: number[];
  /** Simulated minute the scenario started. */
  start: number;
  /** D5 documented detection, plant minutes after start (null when the scenario must stay quiet). */
  documented: number | null;
  markers: ResponseMarker[];
}

/** Drawing width tracks the rendered width so axis text stays at its CSS size on every screen. */
const W_DEFAULT = 820;
const H = 230;
const PAD = { l: 40, r: 16, t: 26, b: 28 };

export function SimulationResponseChart({ times, health, start, documented, markers }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const [W, setW] = useState(W_DEFAULT);
  const observer = useRef<ResizeObserver | null>(null);
  const measure = useCallback((el: HTMLDivElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!el || typeof ResizeObserver === "undefined") return;
    observer.current = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w > 0) setW(Math.max(300, w));
    });
    observer.current.observe(el);
  }, []);

  if (times.length < 2 || health.length < 2) {
    return <div className="ast-empty">Collecting history. The response appears after the first few minutes.</div>;
  }

  // Window: 20 min of lead-in before the scenario start when the history holds it.
  const first = Math.max(times[0], start - 20);
  const idx0 = Math.max(0, times.findIndex((t) => t >= first));
  const ts = times.slice(idx0);
  const hs = health.slice(idx0, idx0 + ts.length);
  const rel = ts.map((t) => t - start);
  const now = rel[rel.length - 1];
  const x0 = rel[0];
  // Keep the documented detection in view while the scenario is still short of it.
  const x1 = Math.max(now, documented !== null && documented > now ? documented + 10 : now, x0 + 10);
  const lo = Math.min(...hs);
  const yMin = Math.max(0, Math.min(60, Math.floor((lo - 5) / 10) * 10));
  const yMax = 100;

  const sx = (m: number) => PAD.l + ((m - x0) / (x1 - x0)) * (W - PAD.l - PAD.r);
  const sy = (v: number) => PAD.t + (1 - (v - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b);
  const line = hs.map((v, i) => `${i ? "L" : "M"}${sx(rel[i]).toFixed(1)},${sy(v).toFixed(1)}`).join(" ");
  const area = `${line} L${sx(now).toFixed(1)},${sy(yMin)} L${sx(rel[0]).toFixed(1)},${sy(yMin)} Z`;

  const span = x1 - x0;
  const maxTicks = W < 520 ? 4 : W > 1200 ? 10 : 7;
  const step = [10, 15, 30, 60, 120, 240].find((s) => span / s <= maxTicks) ?? 480;
  const xTicks: number[] = [];
  for (let m = Math.ceil(x0 / step) * step; m <= x1; m += step) xTicks.push(m);
  const yTicks = [yMin, (yMin + yMax) / 2, yMax];

  const healthAt = (m: number) => {
    let best = 0;
    for (let i = 0; i < rel.length; i++) if (Math.abs(rel[i] - m) < Math.abs(rel[best] - m)) best = i;
    return hs[best];
  };

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * (W - PAD.l - PAD.r);
    const m = x0 + (px / (W - PAD.l - PAD.r)) * span;
    let best = 0;
    for (let i = 0; i < rel.length; i++) if (Math.abs(rel[i] - m) < Math.abs(rel[best] - m)) best = i;
    setHover(best);
  };

  const label = (m: number) => (m < 0 ? `−${fmtMin(-m)}` : `+${fmtMin(m)}`);
  const hx = hover !== null ? sx(rel[hover]) : 0;

  // Marker labels: stagger colliding labels into rows, flip below the dot near the
  // top edge (where the Start / D5 labels sit) and keep them inside the plot.
  const placed = markers
    .filter((mk) => mk.at >= x0 && mk.at <= x1)
    .map((mk) => {
      const text = `${mk.label ?? mk.id}${mk.expected ? "" : " · unexpected"}`;
      return { mk, text, cx: sx(mk.at), cy: sy(healthAt(mk.at)), w: text.length * 6.6 };
    })
    .sort((a, b) => a.cx - b.cx);
  const rowEnds: number[] = [];
  const markerLabels = placed.map((p) => {
    const tx = Math.min(Math.max(p.cx, PAD.l + p.w / 2), W - PAD.r - p.w / 2);
    let row = rowEnds.findIndex((end) => end < tx - p.w / 2 - 4);
    if (row === -1) row = rowEnds.length;
    rowEnds[row] = tx + p.w / 2;
    const above = p.cy - 9 - row * 13;
    if (above >= PAD.t + 4) return { ...p, tx, ty: above };
    // Below the dot, beside the drop line so the text never sits on it.
    const right = p.cx + 8 + p.w <= W - PAD.r;
    return { ...p, tx: right ? p.cx + 8 + p.w / 2 : p.cx - 8 - p.w / 2, ty: p.cy + 17 + row * 13 };
  });

  return (
    <div className="sim-chart" ref={measure}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={`Machine health ${Math.round(hs[hs.length - 1])} % at ${label(now)} plant time into the scenario`}
      >
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={sy(v)} y2={sy(v)} className="sim-grid-line" />
            <text x={PAD.l - 8} y={sy(v) + 4} textAnchor="end" className="sim-axis">
              {v}
            </text>
          </g>
        ))}
        <text x={0} y={12} className="sim-axis">
          Machine health (%)
        </text>
        {xTicks.map((m) => (
          <text key={m} x={sx(m)} y={H - 8} textAnchor="middle" className="sim-axis">
            {m === 0 ? "0" : label(m)}
          </text>
        ))}

        {/* Scenario start */}
        {x0 <= 0 && (
          <g>
            <line x1={sx(0)} x2={sx(0)} y1={PAD.t - 6} y2={H - PAD.b} className="sim-mark-line" />
            <text x={sx(0) + 4} y={PAD.t - 10} className="sim-mark-text">
              Start
            </text>
          </g>
        )}
        {/* D5 documented detection */}
        {documented !== null && (
          <g>
            <line x1={sx(documented)} x2={sx(documented)} y1={PAD.t - 6} y2={H - PAD.b} className="sim-mark-line" data-dashed />
            <text
              x={sx(documented) > W - 100 ? sx(documented) - 4 : sx(documented) + 4}
              y={PAD.t - 10}
              textAnchor={sx(documented) > W - 100 ? "end" : "start"}
              className="sim-mark-text"
            >
              Due {label(documented)}
            </text>
          </g>
        )}

        <path d={area} className="sim-area" />
        <path d={line} className="sim-line" />
        <circle cx={sx(now)} cy={sy(hs[hs.length - 1])} r={3.5} className="sim-now" />

        {markerLabels.map(({ mk, text, cx, cy, tx, ty }) => (
          <g key={`${mk.id}-${mk.at}`} data-tone={mk.tone} className="sim-marker">
            <line x1={cx} x2={cx} y1={cy} y2={H - PAD.b} />
            <circle cx={cx} cy={cy} r={4.5} />
            <title>{mk.id}</title>
            <text x={tx} y={ty} textAnchor="middle">
              {text}
            </text>
          </g>
        ))}

        {hover !== null && (
          <g className="sim-cross" pointerEvents="none">
            <line x1={hx} x2={hx} y1={PAD.t} y2={H - PAD.b} />
            <circle cx={hx} cy={sy(hs[hover])} r={3.5} />
            <text x={Math.min(hx + 8, W - 120)} y={PAD.t + 12}>
              {label(rel[hover])} · {hs[hover].toFixed(1)} %
            </text>
          </g>
        )}
        <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} className="sim-base-line" />
        <rect
          x={PAD.l}
          y={PAD.t}
          width={W - PAD.l - PAD.r}
          height={H - PAD.t - PAD.b}
          fill="transparent"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        />
      </svg>
      <div className="ast-caption sim-chart-x">Plant time since scenario start</div>
    </div>
  );
}
