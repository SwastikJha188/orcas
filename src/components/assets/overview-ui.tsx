"use client";

/*
 * Overview-only pieces (prefix pg-ov-). Section and SectionIndex come from
 * the Analysis page so the Overview reads as its sibling.
 */

import React from "react";
import type { Tone } from "./assets-shell-ui";
import type { OvOperatingRow } from "./overview-digest";

const fmtN = (v: number, decimals: number) =>
  v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/**
 * Value against its normal band and limits on one horizontal scale:
 * quiet track, normal band, warning / alarm ticks, reference-model mark
 * (hollow) and the live value (filled, status colour).
 */
export function RangeBar({ row, tone }: { row: OvOperatingRow; tone: Tone }) {
  const pts = [
    row.normal.lo,
    row.normal.hi,
    row.warn.lo,
    row.warn.hi,
    row.alarm.lo,
    row.alarm.hi,
    row.value,
    row.model,
  ].filter((v): v is number => v !== null && Number.isFinite(v));
  if (row.value === null || pts.length < 2) return <span className="pg-ov-range is-empty" aria-hidden="true" />;
  let lo = Math.min(...pts);
  let hi = Math.max(...pts);
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.08;
  lo -= pad;
  hi += pad;
  const pos = (v: number) => `${Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100))}%`;
  const nLo = row.normal.lo ?? lo;
  const nHi = row.normal.hi ?? hi;
  const ticks: { v: number; kind: "warn" | "alarm" }[] = [];
  for (const v of [row.warn.lo, row.warn.hi]) if (v !== null) ticks.push({ v, kind: "warn" });
  for (const v of [row.alarm.lo, row.alarm.hi]) if (v !== null) ticks.push({ v, kind: "alarm" });
  const label = `${fmtN(row.value, row.decimals)} ${row.unit}; normal range ${row.normalBand}${row.model !== null ? `; expected ${fmtN(row.model, row.decimals)}` : ""}`;
  return (
    <span className="pg-ov-range" role="img" aria-label={label}>
      <span className="pg-ov-range-track" />
      <span className="pg-ov-range-band" style={{ left: pos(nLo), width: `calc(${pos(nHi)} - ${pos(nLo)})` }} />
      {ticks.map((t, i) => (
        <span key={i} className="pg-ov-range-tick" data-tone={t.kind === "alarm" ? "bad" : "warn"} style={{ left: pos(t.v) }} />
      ))}
      {row.model !== null && <span className="pg-ov-range-ref" style={{ left: pos(row.model) }} />}
      <span className="pg-ov-range-val" data-tone={tone} style={{ left: pos(row.value) }} />
    </span>
  );
}
