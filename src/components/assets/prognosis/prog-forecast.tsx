"use client";

import React, { useMemo, useRef, useState } from "react";
import { PillButton, PillNav, balancedProps, useBalancedColumns } from "@/components/ui";
import { useElementWidth } from "../analysis/an-ui";
import type { ForecastHorizon, ForecastSeries } from "@/server/services/insights-service";
import { fmt, horizonText, limitIsHigh, roundHours, seriesFor, type LimitCrossing } from "./prognosis-derive";
import { Card, DataTable, EvidenceChip, Note, tagsForMode, type Col, type ProgSectionProps } from "./prog-ui";

interface Reach {
  level: "warning" | "alarm";
  /** Hours until the interval edge reaches the limit (earliest plausible). */
  early: number;
  /** Hours until the median forecast reaches it; null = not within the horizon. */
  late: number | null;
}

interface Row {
  s: ForecastSeries;
  r: Reach | null;
}


/** When the forecast interval edge (and the median) first reach the alarm, else the warning limit. */
function reach(s: ForecastSeries, h: ForecastHorizon): Reach | null {
  const steps = s.forecast.length || h.steps || 1;
  const at = (i: number) => (h.hours * (i + 1)) / steps;
  for (const level of ["alarm", "warning"] as const) {
    const l = level === "alarm" ? s.alarm : s.warning;
    if (l === null || !Number.isFinite(l)) continue;
    const high = limitIsHigh(s, l);
    const beyond = (v: number, x: number) => (high ? v >= x : v <= x);
    const edge = high ? s.upper : s.lower;
    if (beyond(s.current, l)) return { level, early: 0, late: 0 };
    const e = edge.findIndex((v) => beyond(v, l));
    if (e < 0) continue;
    const m = s.forecast.findIndex((v) => beyond(v, l));
    return { level, early: at(e), late: m < 0 ? null : at(m) };
  }
  return null;
}

const reachText = (r: Reach) =>
  r.early === 0 ? `${r.level === "alarm" ? "Alarm" : "Warning"} now` : r.late === null
      ? `${r.level === "alarm" ? "Alarm" : "Warning"} in ≥ ${roundHours(r.early)}`
      : `${r.level === "alarm" ? "Alarm" : "Warning"} in ${roundHours(r.early)}–${roundHours(r.late)}`;

/**
 * Every forecast signal is drawn as a full chart (no paging) in a fixed
 * order; signals whose interval reaches a limit are highlighted in place. The table below
 * lists the signals inside limits with their numbers.
 */
export function ProgForecast({ data, analysis, mode }: ProgSectionProps) {
  const [allRows, setAllRows] = useState(false);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [hid, setHid] = useState(() => (data.horizons.some((h) => h.id === "24h") ? "24h" : (data.horizons[0]?.id ?? "")));
  const horizon = data.horizons.find((h) => h.id === hid) ?? data.horizons[0];
  const focus = useMemo(() => tagsForMode(mode, analysis, data), [mode, analysis, data]);

  const rows = useMemo<Row[]>(() => {
    if (!horizon) return [];
    return seriesFor(data, horizon.id)
      .filter((s) => s.confidence > 0)
      .map((s) => ({ s, r: reach(s, horizon) }))
      // Fixed order (catalog order): a chart never moves when its alert state changes.
      .map((x, i) => ({ ...x, i }))
      .sort((a, b) => a.s.tag.localeCompare(b.s.tag) || a.i - b.i);
  }, [data, horizon]);
  const total = horizon ? seriesFor(data, horizon.id).length : 0;
  // Up to three charts a row, rows evened out; a short last row widens to the full width.
  const cols = useBalancedColumns(gridRef, rows.length, { min: 380, max: 3, phoneCols: 1 });
  const bal = balancedProps(cols);
  if (!horizon || !rows.length) return null;

  const rest = rows.filter((r) => !r.r);

  const columns: Col<Row>[] = [
    { key: "tag", header: "Tag", render: ({ s }) => <EvidenceChip tag={s.tag} /> },
    {
      key: "name",
      header: "Signal",
      render: ({ s }) => (
        <span className="ast-cell-text pg-prog-clip" title={s.name}>
          {s.name}
        </span>
      ),
    },
    { key: "now", header: "Now", align: "right", render: ({ s }) => <Val v={s.current} unit={s.unit} /> },
    { key: "pred", header: `+${horizonText(horizon.id)}`, align: "right", render: ({ s }) => <Val v={s.predicted} unit={s.unit} strong /> },
    { key: "warn", header: "Warning", align: "right", render: ({ s }) => <span className="ast-num ast-muted">{fmt(s.warning)}</span> },
    { key: "alarm", header: "Alarm", align: "right", render: ({ s }) => <span className="ast-num ast-muted">{fmt(s.alarm)}</span> },
    {
      key: "ttl",
      header: "Time to limit",
      align: "right",
      render: ({ r }) =>
        r ? (
          <span className="pg-prog-dot ast-num" data-tone={r.level === "alarm" ? "bad" : "warn"}>
            <span className="ast-chip-dot" aria-hidden="true" />
            {reachText(r)}
          </span>
        ) : (
          <span className="ast-muted">&gt; {horizonText(horizon.id)}</span>
        ),
    },
    { key: "conf", header: "Conf. %", align: "right", render: ({ s }) => <span className="ast-num ast-muted">{s.confidence.toFixed(0)}</span> },
  ];

  return (
    <Card label="Signal forecasts" toolbar={<PillNav items={data.horizons.map((h) => ({ id: h.id, label: horizonText(h.id) }))} activeId={horizon.id} onChange={setHid} arrows />}>
      <div ref={gridRef} className={`pg-prog-forecasts ${bal.className}`.trim()} style={bal.style} role="list" aria-label="Signal forecasts">
        {rows.map(({ s, r }) => {
          const tone = r ? (r.level === "alarm" ? "bad" : "warn") : undefined;
          return (
            <figure key={s.tag} role="listitem" data-tone={tone} className={`pg-prog-multiple ${focus.includes(s.tag) ? "is-focus" : ""}`}>
              <figcaption>
                <EvidenceChip tag={s.tag} />
                <span className="ast-muted pg-prog-clip">{s.name}</span>
                {r ? (
                  <span className="pg-prog-dot ast-num" data-tone={tone}>
                    <span className="ast-chip-dot" aria-hidden="true" />
                    {reachText(r)}
                  </span>
                ) : (
                  <span className="pg-prog-dot ast-num ast-muted">&gt; {horizonText(horizon.id)}</span>
                )}
              </figcaption>
              <div className="pg-prog-chart-scroll">
                <ForecastChart s={s} h={horizon} c={r ? { level: r.level, hours: r.early } : null} />
              </div>
            </figure>
          );
        })}
      </div>
      {rest.length > 0 && (
        <DataTable
          columns={columns}
          data={allRows ? rest : rest.slice(0, 8)}
          rowKey={(x) => x.s.tag}
          label="Signals inside limits"
        />
      )}
      {rest.length > 8 && (
        <div className="pg-prog-more">
          <span className="ast-muted ast-num">{allRows ? `${rest.length} signals inside limits` : `8 of ${rest.length} signals inside limits`}</span>
          <PillButton variant="secondary" onClick={() => setAllRows((v) => !v)}>
            {allRows ? "Show fewer" : "Show all"}
          </PillButton>
        </div>
      )}
      {total > rows.length && <Note>{total - rows.length} stored series have no forecast.</Note>}
    </Card>
  );
}

function Val({ v, unit, strong = false }: { v: number; unit: string; strong?: boolean }) {
  return (
    <span className={`ast-num ${strong ? "pg-prog-strong" : ""}`}>
      {fmt(v)}
      <span className="ast-unit">{unit}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */

const W = 560;
const H = 170;
const PAD = { l: 44, r: 72, t: 10, b: 20 };

/** Drawn at its rendered width (text keeps one size however wide the chart is). */
function ForecastChart(props: { s: ForecastSeries; h: ForecastHorizon; c: LimitCrossing | null }) {
  const [ref, width] = useElementWidth<HTMLDivElement>(W);
  return (
    <div ref={ref} className="pg-prog-chart-box">
      <ForecastSvg {...props} W={Math.max(320, Math.round(width))} />
    </div>
  );
}

function ForecastSvg({ s, h, c, W }: { s: ForecastSeries; h: ForecastHorizon; c: LimitCrossing | null; W: number }) {
  const hist = s.history.length ? s.history : [s.current];
  const fc = s.forecast;
  const values = [...hist, ...fc, ...s.lower, ...s.upper];
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  const span = hi - lo || Math.abs(hi) * 0.05 || 1;
  for (const l of [s.warning, s.alarm]) {
    if (l === null || !Number.isFinite(l)) continue;
    if (l > hi && l - hi < span * 2.5) hi = l;
    if (l < lo && lo - l < span * 2.5) lo = l;
  }
  const pad = (hi - lo || 1) * 0.08;
  lo -= pad;
  hi += pad;
  const plotH = H - PAD.t - PAD.b;
  const split = PAD.l + (W - PAD.l - PAD.r) * 0.45;
  const right = W - PAD.r;
  const y = (v: number) => PAD.t + plotH - ((v - lo) / (hi - lo)) * plotH;
  const xh = (i: number) => PAD.l + (hist.length > 1 ? (i / (hist.length - 1)) * (split - PAD.l) : split - PAD.l);
  const xf = (i: number) => split + ((i + 1) / fc.length) * (right - split);
  const line = (pts: [number, number][]) => pts.map(([x, v], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y(v).toFixed(1)}`).join("");
  const start: [number, number] = [split, s.current];
  const inFrame = (v: number | null): v is number => v !== null && Number.isFinite(v) && v >= lo && v <= hi;
  const high = s.warning !== null && Number.isFinite(s.warning) ? limitIsHigh(s, s.warning) : true;
  const crossX = c ? split + (Math.max(0, c.hours) / h.hours) * (right - split) : null;
  const ticks = [lo + pad, (lo + hi) / 2, hi - pad];

  // Faint band between warning and alarm (or beyond the warning when there is no alarm).
  let band: { y0: number; y1: number } | null = null;
  if (inFrame(s.warning)) {
    const sameSide = s.alarm === null || !Number.isFinite(s.alarm) || limitIsHigh(s, s.alarm) === high;
    const far = inFrame(s.alarm) && sameSide ? s.alarm : high ? hi : lo;
    band = { y0: Math.min(y(s.warning), y(far)), y1: Math.max(y(s.warning), y(far)) };
  }

  // Direct labels at the right edge, spread so they never overlap.
  const labels: { id: string; y: number; text: string; tone?: "warn" | "bad"; main?: boolean }[] = [
    { id: "v", y: y(s.predicted), text: `${fmt(s.predicted)} ${s.unit}`, main: true },
    ...(inFrame(s.warning) ? [{ id: "w", y: y(s.warning), text: `Warning ${fmt(s.warning)}`, tone: "warn" as const }] : []),
    ...(inFrame(s.alarm) ? [{ id: "a", y: y(s.alarm), text: `Alarm ${fmt(s.alarm)}`, tone: "bad" as const }] : []),
  ].sort((a, b) => a.y - b.y);
  for (let i = 1; i < labels.length; i++) if (labels[i].y - labels[i - 1].y < 13) labels[i].y = labels[i - 1].y + 13;

  return (
    <svg className="pg-prog-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${s.tag} ${fmt(s.current)} ${s.unit} now, ${fmt(s.predicted)} ${s.unit} in ${horizonText(h.id)}`}>
      {ticks.map((v) => (
        <g key={v}>
          <line className="pg-prog-grid" x1={PAD.l} x2={right} y1={y(v)} y2={y(v)} />
          <text className="pg-prog-axis" x={PAD.l - 8} y={y(v) + 4} textAnchor="end">
            {fmt(v)}
          </text>
        </g>
      ))}
      {band && <rect className="pg-prog-limband" x={PAD.l} width={right - PAD.l} y={band.y0} height={band.y1 - band.y0} />}
      {inFrame(s.warning) && (
        <g data-tone="warn">
          <line className="pg-prog-lim" x1={PAD.l} x2={right} y1={y(s.warning)} y2={y(s.warning)} />
        </g>
      )}
      {inFrame(s.alarm) && (
        <g data-tone="bad">
          <line className="pg-prog-lim" x1={PAD.l} x2={right} y1={y(s.alarm)} y2={y(s.alarm)} />
        </g>
      )}
      <path className="pg-prog-bound" d={line([start, ...s.upper.map((v, i) => [xf(i), v] as [number, number])])} />
      <path className="pg-prog-bound" d={line([start, ...s.lower.map((v, i) => [xf(i), v] as [number, number])])} />
      <path className="pg-prog-hist" d={line(hist.map((v, i) => [xh(i), v]))} />
      <path className="pg-prog-fcline" d={line([start, ...fc.map((v, i) => [xf(i), v] as [number, number])])} />
      <line className="pg-prog-now" x1={split} x2={split} y1={PAD.t} y2={PAD.t + plotH} />
      {crossX !== null && (
        <line className="pg-prog-cross" data-tone={c!.level === "alarm" ? "bad" : "warn"} x1={crossX} x2={crossX} y1={PAD.t} y2={PAD.t + plotH} />
      )}
      {labels.map((l) => (
        <g key={l.id} data-tone={l.tone}>
          <text className={`pg-prog-dlabel ${l.main ? "is-main" : ""}`} x={right + 6} y={l.y + 4}>
            {l.text}
          </text>
        </g>
      ))}
      <text className="pg-prog-axis" x={PAD.l} y={H - 4}>
        measured
      </text>
      <text className="pg-prog-axis" x={split} y={H - 4} textAnchor="middle">
        now
      </text>
      <text className="pg-prog-axis" x={right} y={H - 4} textAnchor="end">
        +{horizonText(h.id)}
      </text>
    </svg>
  );
}
