"use client";

import React, { useMemo } from "react";
import { RestLine, Table, useFold, type Column } from "@/components/ui";
import type { ForecastSeries } from "@backend/services/insights-service";
import type { PlantDefs } from "@shared/lib/plant-defs";
import { fmt, limitIsHigh, roundHours, type PrognosisData } from "./prognosis-derive";
import { displayName } from "@/lib/display-name";

/* ==========================================================================
   Prognosis · Signal forecasts: every forecast sensor, the ones whose forecast
   reaches the alarm limit on top (soonest first), the rest in fixed definition
   order. Reading now, the last 6 h and the next 30 d in one trace (forecast
   with its interval), the 30 d value, the alarm limit and when the forecast
   reaches it. Red only where the median forecast reaches the alarm limit.
   ========================================================================== */

/** The forecast horizon the table shows (longest the engine forecasts). */
const HORIZON = "30d";

export interface SignalForecastRow {
  tag: string;
  name: string;
  where: string;
  unit: string;
  s: ForecastSeries;
  /** Hours until the interval edge / the median forecast reach the alarm limit; null = not within 30 d. */
  alarmEarly: number | null;
  alarmLate: number | null;
}

function crossing(s: ForecastSeries, hours: number, values: number[]): number | null {
  const l = s.alarm;
  if (l === null || !Number.isFinite(l)) return null;
  const high = limitIsHigh(s, l);
  const beyond = (v: number) => (high ? v >= l : v <= l);
  if (beyond(s.current)) return 0;
  const i = values.findIndex(beyond);
  return i < 0 ? null : (hours * (i + 1)) / (values.length || 1);
}

export function signalForecastRows(data: PrognosisData, defs: PlantDefs | null): SignalForecastRow[] {
  const h = data.horizons.find((x) => x.id === HORIZON) ?? data.horizons[data.horizons.length - 1];
  if (!h) return [];
  // Fixed order: sub-assembly, then the machine's signal definitions; tags the definitions do not list follow by tag.
  const subAt = new Map((defs?.subassemblies ?? []).map((sa, i) => [sa.id, i]));
  const n = defs?.signals.length ?? 0;
  const idx = new Map((defs?.signals ?? []).map((d, i) => [d.tag, (subAt.get(d.sub) ?? n) * (n + 1) + i]));
  const at = (t: string) => idx.get(t) ?? Number.MAX_SAFE_INTEGER;
  return Object.keys(data.forecasts)
    .map((tag) => ({ tag, s: data.forecasts[tag]?.[h.id] }))
    // A steady forecast (no trend found, confidence 0) is still a forecast: the reading stays where it is.
    .filter((x): x is { tag: string; s: ForecastSeries } => !!x.s && x.s.confidence !== null)
    .sort((a, b) => at(a.tag) - at(b.tag) || a.tag.localeCompare(b.tag))
    .map(({ tag, s }) => {
      const high = s.alarm !== null && limitIsHigh(s, s.alarm);
      return {
        tag,
        name: displayName(s.name),
        where: data.locations[tag]?.subassembly ?? "",
        unit: s.unit,
        s,
        alarmEarly: crossing(s, h.hours, high ? s.upper : s.lower),
        alarmLate: crossing(s, h.hours, s.forecast),
      };
    });
}

/** The forecast reaches the alarm limit within the horizon (the rows shown red). */
export const reachesAlarm = (r: SignalForecastRow) => r.alarmLate !== null;

/** Alarm rows first, soonest (already past) on top; other rows keep their order. */
export function alarmFirst(rows: SignalForecastRow[]): SignalForecastRow[] {
  const at = (r: SignalForecastRow) => (reachesAlarm(r) ? (r.alarmLate as number) : Number.POSITIVE_INFINITY);
  return rows.map((r, i) => ({ r, i })).sort((a, b) => at(a.r) - at(b.r) || a.i - b.i).map((x) => x.r);
}

const unitOf = (u: string) => (u && u !== "state" ? u : "");

/** Past 6 h (left third) and next 30 d (right two thirds): trace, forecast interval, alarm limit. */
function ForecastTrace({ row }: { row: SignalForecastRow }) {
  const { s } = row;
  const W = 180;
  const H = 30;
  const split = W * 0.34;
  const vals = [...s.history, ...s.forecast, ...s.lower, ...s.upper].filter(Number.isFinite);
  if (vals.length < 2) return <span className="ast-muted">—</span>;
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  const span = hi - lo || Math.abs(hi) || 1;
  // Draw the alarm limit only when it is near the trace (else it would flatten it).
  const limit = s.alarm !== null && s.alarm >= lo - span && s.alarm <= hi + span ? s.alarm : null;
  if (limit !== null) {
    lo = Math.min(lo, limit);
    hi = Math.max(hi, limit);
  }
  const pad = (hi - lo) * 0.1 || 1;
  const y = (v: number) => H - 2 - ((v - (lo - pad)) / (hi - lo + 2 * pad)) * (H - 4);
  const xh = (i: number) => (s.history.length > 1 ? (i / (s.history.length - 1)) * split : split);
  const xf = (i: number) => split + ((i + 1) / s.forecast.length) * (W - split);
  const past = s.history.map((v, i) => `${i ? "L" : "M"}${xh(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const start = `M${split.toFixed(1)},${y(s.current).toFixed(1)}`;
  const fut = start + s.forecast.map((v, i) => `L${xf(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const band =
    `M${split.toFixed(1)},${y(s.current).toFixed(1)}` +
    s.upper.map((v, i) => `L${xf(i).toFixed(1)},${y(v).toFixed(1)}`).join("") +
    [...s.lower].reverse().map((v, j) => `L${xf(s.lower.length - 1 - j).toFixed(1)},${y(v).toFixed(1)}`).join("") +
    "Z";
  const reaches = reachesAlarm(row);
  return (
    <svg
      className="pg-sf-trace"
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`${row.name}: last 6 hours and forecast for the next 30 days; expected ${fmt(s.predicted)} ${unitOf(row.unit)} in 30 days`}
    >
      <path d={band} className="pg-sf-band" />
      {limit !== null && <line x1="0" x2={W} y1={y(limit)} y2={y(limit)} className="pg-sf-limit" />}
      <line x1={split} x2={split} y1="0" y2={H} className="pg-sf-now" />
      <path d={past} className="pg-sf-past" />
      <path d={fut} className="pg-sf-fut" data-alarm={reaches || undefined} />
    </svg>
  );
}

export function alarmText(r: SignalForecastRow): string {
  if (r.alarmEarly === null && r.alarmLate === null) return "Not in the next 30 days";
  if (r.alarmEarly === 0 || r.alarmLate === 0) return "Already past it";
  if (r.alarmLate === null) return `Possibly after ${roundHours(r.alarmEarly as number)}`;
  return r.alarmEarly !== null && r.alarmEarly < r.alarmLate
    ? `In ${roundHours(r.alarmEarly)} – ${roundHours(r.alarmLate)}`
    : `In ${roundHours(r.alarmLate)}`;
}

export function SignalForecastTable({
  rows,
  onOpenTrend,
}: {
  rows: SignalForecastRow[];
  onOpenTrend: (tag: string) => void;
}) {
  const cols = useMemo<Column<SignalForecastRow>[]>(
    () => [
      {
        key: "sensor",
        header: "Sensor",
        width: "220px",
        render: (r) => {
          const hit = reachesAlarm(r);
          return (
            <span className="ast-cell-stack pg-sf-sensor" data-alarm={hit || undefined}>
              <button type="button" className="ast-cell-title pg-dx-tag" onClick={() => onOpenTrend(r.tag)} title={`Open the trend chart for this sensor (${r.tag})`}>
                {r.name} <span aria-hidden="true">↗</span>
              </button>
            </span>
          );
        },
      },
      { key: "where", header: "Where", width: "160px", render: (r) => <span className="ast-cell-text">{r.where || "—"}</span> },
      {
        key: "now",
        header: "Now",
        width: "110px",
        render: (r) => (
          <span className="ast-num pg-sf-val">
            {fmt(r.s.current)}
            {unitOf(r.unit) && <span className="ast-unit"> {unitOf(r.unit)}</span>}
          </span>
        ),
      },
      { key: "trace", header: "Last 6 h, then next 30 days", width: "200px", render: (r) => <ForecastTrace row={r} /> },
      {
        key: "f30",
        header: "Expected in 30 days",
        width: "150px",
        render: (r) => {
          const n = r.s.forecast.length - 1;
          return (
            <span className="ast-cell-stack ast-num">
              <span className="pg-sf-val">
                {fmt(r.s.predicted)}
                {unitOf(r.unit) && <span className="ast-unit"> {unitOf(r.unit)}</span>}
              </span>
              {n >= 0 && (
                <span className="ast-cell-sub">
                  likely {fmt(r.s.lower[n])} – {fmt(r.s.upper[n])}
                </span>
              )}
            </span>
          );
        },
      },
      {
        key: "limit",
        header: "Alarm limit",
        width: "110px",
        render: (r) => <span className="ast-num ast-muted">{r.s.alarm !== null ? fmt(r.s.alarm) : "—"}</span>,
      },
      {
        key: "reach",
        header: "Reaches alarm limit",
        render: (r) => {
          const hit = reachesAlarm(r);
          return (
            <span className="ast-num pg-sf-reach" data-alarm={hit || undefined}>
              {alarmText(r)}
            </span>
          );
        },
      },
    ],
    [onOpenTrend],
  );
  const sorted = useMemo(() => alarmFirst(rows), [rows]);
  // Readings that stay clear of the alarm limit for 30 days, even at the edge of their range, fold into one line.
  const fold = useFold(sorted, (r) => r.alarmEarly === null && r.alarmLate === null);
  return (
    <>
      {fold.shown.length > 0 && <Table className="pg-sf-table" columns={cols} data={fold.shown} keyExtractor={(r) => r.tag} />}
      <RestLine rest={fold.rest} shown={fold.shown.length} noun="sensor" note="clear of their alarm limit for the next 30 days" open={fold.open} onToggle={fold.toggle} />
    </>
  );
}
