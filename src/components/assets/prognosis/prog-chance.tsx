"use client";

import React from "react";
import { failureChance, FAILURE_HORIZONS, formatRulInterval } from "./prognosis-derive";

/** Column header shared by Prognosis (RUL table) and Diagnosis (sensor table). */
export const FAILURE_CHANCE_HEADER = `Chance of failure in ${FAILURE_HORIZONS.map((h) => h.label).join(" · ")}`;

/** Horizon labels spelled out for tooltips and screen readers. */
const SPOKEN: Record<string, string> = { "7d": "7 days", "1mo": "1 month", "6mo": "6 months" };

/**
 * Chance the remaining life runs out within 7 d / 1 mo / 6 mo, from one
 * Prognosis RUL interval. Same numbers on Prognosis and Diagnosis; with
 * `onOpen` the cell is a link to the other page.
 */
export function FailureChance({
  band,
  name,
  onOpen,
  openLabel,
}: {
  band: { lo: number; hi: number } | null;
  /** Sub-assembly the estimate is for (tooltip and accessible name). */
  name: string;
  onOpen?: () => void;
  openLabel?: string;
}) {
  if (!band) return <span className="ast-muted">—</span>;
  const values = FAILURE_HORIZONS.map((h) => ({ h, pct: failureChance(band, h.hours) }));
  const title = `${name}: likely ${formatRulInterval(band.lo, band.hi)} left before it needs repair. Chance it fails ${values
    .map((v) => `within ${SPOKEN[v.h.id] ?? v.h.label}: ${v.pct} %`)
    .join(", ")}.`;
  const body = (
    <span className="pg-chance ast-num" aria-hidden="true">
      {values.map((v) => (
        <span key={v.h.id} data-zero={v.pct === 0 || undefined} data-high={v.pct >= 50 || undefined}>
          {v.pct}%
        </span>
      ))}
    </span>
  );
  if (!onOpen) {
    return (
      <span title={title} role="img" aria-label={title}>
        {body}
      </span>
    );
  }
  return (
    <button
      type="button"
      className="pg-chance-link"
      title={`${title} ${openLabel ?? ""}`.trim()}
      aria-label={`${title} ${openLabel ?? ""}`.trim()}
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
    >
      {body}
    </button>
  );
}
