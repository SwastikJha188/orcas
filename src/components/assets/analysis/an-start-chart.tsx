"use client";

import React from "react";
import { formatDuration, type SimFrame } from "@/lib/kiln-sim/engine";
import { Z_ANOMALY, type ChainNode } from "./an-derive";

const W = 1120;
const H = 200;
const PAD = { l: 40, r: 190, t: 10, b: 22 };

/**
 * Where it started, as a graph: per part, the largest "times usual" gap of its
 * off-expected sensors over the recent window (calc. from history vs model),
 * the alert line at Z_ANOMALY, and a dot where each part first crossed it.
 * The part that went off first is drawn bold; the rest thin.
 */
export function StartChart({ frame, chain }: { frame: SimFrame; chain: ChainNode[] }) {
  const n = frame.times.length;
  if (!chain.length || n < 2) return null;
  const oldest = Math.max(...chain.map((c) => c.minutesAgo));
  const span = Math.min(frame.t - frame.times[0], Math.max(60, Math.ceil(oldest * 1.3)));
  let i0 = 0;
  while (i0 < n - 1 && frame.times[i0] < frame.t - span) i0++;
  const times = frame.times.slice(i0);

  const lines = chain.map((c) => {
    const defs = c.tags.map((t) => frame.defs.signalByTag[t]).filter(Boolean);
    const vals = times.map((_, k) => {
      let m = NaN;
      for (const d of defs) {
        const h = frame.history[d.tag]?.[i0 + k];
        const e = frame.modelHistory[d.tag]?.[i0 + k];
        const z = Math.abs((h - e) / (d.sigma || 1));
        if (Number.isFinite(z) && !(z <= m)) m = z;
      }
      return m;
    });
    return { ...c, vals };
  });

  const peak = Math.max(Z_ANOMALY * 2, ...lines.flatMap((l) => l.vals.filter(Number.isFinite)));
  const top = Math.ceil(peak / 2) * 2;
  const x = (t: number) => PAD.l + (1 - (frame.t - t) / span) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - Math.min(v, top) / top) * (H - PAD.t - PAD.b);
  const path = (vals: number[]) => {
    let d = "";
    let pen = false;
    vals.forEach((v, k) => {
      if (!Number.isFinite(v)) return void (pen = false);
      d += `${pen ? "L" : "M"}${x(times[k]).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };

  const labels = lines
    .map((l, idx) => ({ id: l.id, name: l.name, ago: l.minutesAgo, first: idx === 0, y: y(l.vals.at(-1) ?? 0) }))
    .sort((a, b) => a.y - b.y);
  for (let k = 1; k < labels.length; k++) if (labels[k].y - labels[k - 1].y < 13) labels[k].y = labels[k - 1].y + 13;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => frame.t - span * (1 - f));

  return (
    <div className="pg-prog-chart-scroll pg-an-start-chart">
      <svg
        className="pg-prog-chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`How far each part has been off expected over the last ${formatDuration(span)}: ${lines
          .map((l) => `${l.name} off since ${l.minutesAgo > 0 ? `${formatDuration(l.minutesAgo)} ago` : "now"}`)
          .join("; ")}`}
      >
        {[0, top / 2, top].map((v) => (
          <g key={v}>
            <line className="pg-prog-grid" x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} />
            <text className="pg-prog-axis" x={PAD.l - 8} y={y(v) + 4} textAnchor="end">
              {`${v}×`}
            </text>
          </g>
        ))}
        <rect className="pg-prog-limband" x={PAD.l} width={W - PAD.r - PAD.l} y={y(top)} height={Math.max(0, y(Z_ANOMALY) - y(top))} />
        <g data-tone="bad">
          <line className="pg-prog-lim" x1={PAD.l} x2={W - PAD.r} y1={y(Z_ANOMALY)} y2={y(Z_ANOMALY)} />
        </g>
        <text className="pg-prog-axis" x={PAD.l + 6} y={y(Z_ANOMALY) - 5}>
          {`Off expected above ${Z_ANOMALY}× usual`}
        </text>
        {ticks.map((t, k) => (
          <text key={k} className="pg-prog-axis" x={x(t)} y={H - 4} textAnchor={k === 0 ? "start" : k === ticks.length - 1 ? "end" : "middle"}>
            {k === ticks.length - 1 ? "now" : `${formatDuration(frame.t - t)} ago`}
          </text>
        ))}
        {lines
          .map((l, idx) => ({ l, first: idx === 0 }))
          .reverse()
          .map(({ l, first }) => (
            <path key={l.id} className={first ? "pg-prog-overall" : "pg-prog-sysline"} d={path(l.vals)} />
          ))}
        {lines.map((l, idx) => {
          const t = frame.t - l.minutesAgo;
          return <circle key={l.id} className={`pg-an-start-dot${idx === 0 ? " is-first" : ""}`} cx={x(Math.max(t, frame.t - span))} cy={y(Z_ANOMALY)} r={idx === 0 ? 4 : 3} />;
        })}
        {labels.map((l) => (
          <text key={l.id} className={`pg-prog-dlabel${l.first ? " is-main" : ""}`} x={W - PAD.r + 8} y={l.y + 4}>
            {l.name.length > 18 ? `${l.name.slice(0, 17)}…` : l.name} · {l.ago > 0 ? `${formatDuration(l.ago)} ago` : "now"}
          </text>
        ))}
      </svg>
    </div>
  );
}
