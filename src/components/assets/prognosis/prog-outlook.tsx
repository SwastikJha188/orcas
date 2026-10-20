"use client";

import React from "react";
import type { HealthBands } from "@/lib/reference-data";
import { fmt, healthStatus, type PrognosisData } from "./prognosis-derive";
import { toneFor } from "./prog-ui";

const statusTone = (s: ReturnType<typeof healthStatus>) => (s === null ? undefined : toneFor(s));

type Points = PrognosisData["condition"]["points"];

const W = 1120;
const H = 200;
const PAD = { l: 40, r: 170, t: 10, b: 22 };

/**
 * Health outlook: projected machine health (bold) and system health (thin)
 * from now to the last projection day, with the health-model bands (DB) that
 * every health score on Diagnosis uses (none drawn while they load). Systems are drawn in tone only when their
 * end point falls below a band.
 */
export function HealthOutlook({ data, bands }: { data: PrognosisData; bands: HealthBands | null }) {
  const { systems, points } = data.condition;
  if (points.length < 2) return null;
  const last = points[points.length - 1].day || 1;
  const all = points.flatMap((p) => [p.overall, ...Object.values(p.systems)]);
  const lo = Math.max(0, Math.floor((Math.min(...(bands ? [bands.critical] : []), ...all) - 5) / 10) * 10);
  const x = (d: number) => PAD.l + (d / last) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - lo) / (100 - lo)) * (H - PAD.t - PAD.b);
  const path = (pick: (p: Points[number]) => number | undefined) =>
    points
      .filter((p) => Number.isFinite(pick(p) ?? NaN))
      .map((p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)},${y(pick(p)!).toFixed(1)}`)
      .join("");
  const end = points[points.length - 1];

  const labels = [{ id: "overall", name: "Machine", v: end.overall }, ...systems.map((s) => ({ id: s.id, name: s.name, v: end.systems[s.id] }))]
    .filter((l) => Number.isFinite(l.v))
    .sort((a, b) => b.v - a.v)
    .map((l) => ({ ...l, y: y(l.v) }));
  for (let i = 1; i < labels.length; i++) if (labels[i].y - labels[i - 1].y < 13) labels[i].y = labels[i - 1].y + 13;
  const xTicks = points.filter((p, i) => i === 0 || x(p.day) - x(points[i - 1].day) >= 40);

  return (
    <div className="pg-prog-chart-scroll">
      <svg
        className="pg-prog-chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Expected health score out of 100 in ${end.day} days: ${labels.map((l) => `${l.name} ${fmt(l.v)}`).join("; ")}`}
      >
        {[lo, (lo + 100) / 2, 100].map((v) => (
          <g key={v}>
            <line className="pg-prog-grid" x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} />
            <text className="pg-prog-axis" x={PAD.l - 8} y={y(v) + 4} textAnchor="end">
              {Math.round(v)}
            </text>
          </g>
        ))}
        {bands && (
          <>
            <rect className="pg-prog-limband" x={PAD.l} width={W - PAD.r - PAD.l} y={y(bands.critical)} height={Math.max(0, y(lo) - y(bands.critical))} />
            <g data-tone="warn">
              <line className="pg-prog-lim" x1={PAD.l} x2={W - PAD.r} y1={y(bands.advisory)} y2={y(bands.advisory)} />
            </g>
            <g data-tone="bad">
              <line className="pg-prog-lim" x1={PAD.l} x2={W - PAD.r} y1={y(bands.critical)} y2={y(bands.critical)} />
            </g>
          </>
        )}
        {xTicks.map((p) => (
          <text key={p.day} className="pg-prog-axis" x={x(p.day)} y={H - 4} textAnchor={p.day === 0 ? "start" : "middle"}>
            {p.day === 0 ? "today" : `${p.day} d`}
          </text>
        ))}
        {systems.map((s) => (
          <path key={s.id} className="pg-prog-sysline" data-tone={statusTone(healthStatus(end.systems[s.id] ?? 100, bands))} d={path((p) => p.systems[s.id])} />
        ))}
        <path className="pg-prog-overall" d={path((p) => p.overall)} />
        {labels.map((l) => (
          <text key={l.id} className={`pg-prog-dlabel ${l.id === "overall" ? "is-main" : ""}`} x={W - PAD.r + 8} y={l.y + 4}>
            {l.name.length > 18 ? `${l.name.slice(0, 17)}…` : l.name} {fmt(l.v)}
          </text>
        ))}
      </svg>
    </div>
  );
}
