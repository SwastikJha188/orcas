"use client";

import React, { useMemo } from "react";
import { Tile, TileGrid } from "@/components/ui";
import { toCondition } from "@/components/ui/status";
import { formatRulHours, logPos, rangeText, roundHours, SEVERITY_RANK, type RulRow } from "./prognosis-derive";
import { buildRecs, type Rec } from "./prog-maintenance";
import { TimeTicks, toneFor, type ProgSectionProps } from "./prog-ui";

const MAX_H = 8760 * 1.1;
/** Labelled ticks on the small per-card horizon bar (all ticks are drawn). */
const LABELS = [
  { h: 1, label: "1 h" },
  { h: 24, label: "24 h" },
  { h: 720, label: "30 d" },
  { h: 8760, label: "1 y" },
];

const quiet = (t: ReturnType<typeof toneFor>) => (t === "warn" || t === "bad" ? t : undefined);

/** "23–25 h" → value "23–25", unit "h"; mixed units stay one value ("5 h – 2 d"). */
function intervalParts(lo: number, hi: number): { value: string; unit?: string } {
  const [va, ua] = formatRulHours(lo).split(" ");
  const [vb, ub] = formatRulHours(hi).split(" ");
  return ua && ua === ub ? { value: `${va}–${vb}`, unit: ua } : { value: rangeText(lo, hi) };
}

/** Remaining life: one card per sub-assembly, governing (worst, soonest) first, each with the same fixed 1 h – 1 y horizon bar. */
export function ProgRul({ data, analysis, rows }: ProgSectionProps) {
  const sorted = useMemo(() => [...rows].sort((a, b) => SEVERITY_RANK[b.status] - SEVERITY_RANK[a.status] || a.band.lo - b.band.lo), [rows]);
  const recs = useMemo(() => buildRecs(data, analysis, rows), [data, analysis, rows]);
  const recFor = (r: RulRow): Rec | undefined => recs.find((x) => x.component.toLowerCase().includes(r.name.toLowerCase()));

  return (
    <TileGrid label="Remaining useful life per sub-assembly" min={280} compact>
      {sorted.map((r) => {
        const tone = quiet(toneFor(r.status));
        const rec = recFor(r);
        const iv = intervalParts(r.band.lo, r.band.hi);
        return (
          <Tile
            key={r.id}
            className="pg-prog-rtile"
            title={r.name}
            status={{ label: toCondition(r.status), tone }}
            value={iv.value}
            unit={iv.unit}
            tone={tone}
            meter={<HorizonBar row={r} tone={tone} />}
            facts={[
              { label: "Health", value: `${r.health.toFixed(0)} %` },
              { label: "Estimate", value: roundHours(r.hours) },
              { label: "Basis", value: r.basis === "finding" ? "Rule time-to-limit" : "Health trend" },
            ]}
            foot={rec ? <span title={`${rec.title} · ${rec.priority} · ${rec.window}`}>{rec.title}</span> : undefined}
          />
        );
      })}
    </TileGrid>
  );
}

/** Interval band + point estimate on the fixed log scale shared by every card. */
function HorizonBar({ row, tone }: { row: RulRow; tone?: "warn" | "bad" }) {
  const lo = logPos(row.band.lo, MAX_H);
  const hi = logPos(row.band.hi, MAX_H);
  return (
    <div className="pg-prog-hbar" role="img" aria-label={`Remaining life ${rangeText(row.band.lo, row.band.hi)} on a 1 hour to 1 year scale`}>
      <span className="pg-prog-cell-track pg-prog-hbar-track" data-tone={tone}>
        <TimeTicks maxH={MAX_H} />
        <span className="pg-prog-rul-band" style={{ left: `${lo}%`, width: `${Math.max(0.8, hi - lo)}%` }} />
        <span className="pg-prog-rul-mark" style={{ left: `${logPos(row.hours, MAX_H)}%` }} />
      </span>
      <span className="pg-prog-hbar-scale" aria-hidden="true">
        {LABELS.map((t) => (
          <span key={t.h} style={{ left: `${logPos(t.h, MAX_H)}%` }}>
            {t.label}
          </span>
        ))}
      </span>
    </div>
  );
}
