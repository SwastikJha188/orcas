"use client";

import React, { useCallback, useMemo, useState } from "react";
import { PillButton, PillNav } from "@/components/ui";
import type { InsightsResponse, RulItem, Severity } from "@/server/services/insights-service";
import "./rul-module.css";

export interface RulModuleProps {
  data?: InsightsResponse["prognosis"];
  onBack?: () => void;
  machineId?: string;
  componentId?: string;
}

/* ------------------------------------------------------------------ */
/* Model constants                                                    */
/* ------------------------------------------------------------------ */

type Unit = "d" | "h";

/** Health index at which a component is considered at end of life. */
const EOL_HEALTH = 25;
/** Next planned maintenance stop, days from now. */
const NEXT_PM_D = 30;
/** Components under this many days count toward the "under 30 d" KPI. */
const SHORT_HORIZON_D = 30;
/** Timeline axis cap — anything beyond is drawn with an overflow cap. */
const TIMELINE_CAP_D = 730;

const UNIT_ITEMS = [
  { id: "d", label: "Days" },
  { id: "h", label: "Hours" },
];

interface LifeRow {
  id: string;
  name: string;
  health: number;
  /** Point estimate (P50), operating hours. */
  hours: number;
  p10: number;
  p90: number;
  confidence: number;
  status: Severity;
  /** Current degradation rate, health % per day (positive = losing health). */
  rate: number;
  /** Health history samples, oldest → newest. */
  history: number[];
}

/* ------------------------------------------------------------------ */
/* Pure helpers                                                       */
/* ------------------------------------------------------------------ */

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const TONE_CLASS: Record<Severity, string> = { Critical: "is-bad", Advisory: "is-warn", Normal: "is-good" };

/** Accelerating wear curve: health at t days given end-of-life at T days. */
function wear(h0: number, t: number, T: number): number {
  const u = t / Math.max(T, 0.01);
  return h0 - (h0 - EOL_HEALTH) * (0.6 * u + 0.4 * u * u);
}

function startHealth(health: number): number {
  return Math.max(health, EOL_HEALTH + 4);
}

/** Back-cast of the wear curve (the payload carries no health history). */
function historyFor(h0: number, T: number, n = 24): number[] {
  const span = 0.6 * T;
  return Array.from({ length: n }, (_, i) => {
    const t = -span + (span * i) / (n - 1);
    return clamp(wear(h0, t, T), 0, 100);
  });
}

function toRow(base: Omit<LifeRow, "rate" | "history">): LifeRow {
  const T = base.hours / 24;
  const h0 = startHealth(base.health);
  return {
    ...base,
    rate: ((h0 - EOL_HEALTH) * 0.6) / Math.max(T, 0.01),
    history: historyFor(h0, T),
  };
}

function fromRulItem(item: RulItem): LifeRow {
  const spread = clamp(((100 - item.confidence) / 100) * 2 + 0.06, 0.08, 0.5);
  return toRow({
    id: item.id,
    name: item.name,
    health: item.health,
    hours: item.hours,
    p10: Math.round(item.hours * (1 - spread)),
    p90: Math.round(item.hours * (1 + spread * 1.25)),
    confidence: item.confidence,
    status: item.status,
  });
}

function niceStep(raw: number): number {
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-9))));
  const n = raw / mag;
  const f = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return f * mag;
}

function niceTicks(min: number, max: number, count = 5): number[] {
  const step = niceStep((max - min) / count);
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-6; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

const NUM = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const NUM1 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

/** Format a duration given in hours in the active unit (no unit suffix). */
function fmtNum(hours: number, unit: Unit): string {
  if (unit === "h") return NUM.format(Math.round(hours));
  const d = hours / 24;
  return Math.abs(d) < 10 ? NUM1.format(d) : NUM.format(Math.round(d));
}

function fmt(hours: number, unit: Unit): string {
  return `${fmtNum(hours, unit)} ${unit}`;
}

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                        */
/* ------------------------------------------------------------------ */

function StatusTag({ status }: { status: Severity }) {
  return (
    <span className={`rul-status ${TONE_CLASS[status]}`}>
      <span className="rul-status-dot" aria-hidden="true" />
      {status}
    </span>
  );
}

const ICONS = {
  part: <path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Zm0 6a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" />,
};

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

function TrendSpark({ values }: { values: number[] }) {
  const W = 64;
  const H = 18;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const d = values
    .map((v, i) => `${i ? "L" : "M"}${((i / (values.length - 1)) * W).toFixed(1)} ${(2 + (1 - (v - lo) / span) * (H - 4)).toFixed(1)}`)
    .join(" ");
  return (
    <svg className="rul-spark" viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* RUL timeline (Gantt)                                               */
/* ------------------------------------------------------------------ */

function RulTimeline({
  rows,
  unit,
  selectedId,
  onSelect,
}: {
  rows: LifeRow[];
  unit: Unit;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const k = unit === "h" ? 1 : 24;

  const axis = useMemo(() => {
    const maxH = Math.min(Math.max(...rows.map((r) => r.p90), NEXT_PM_D * 24) * 1.04, TIMELINE_CAP_D * 24);
    const ticks = niceTicks(0, maxH / k, 5);
    const step = ticks.length > 1 ? ticks[1] - ticks[0] : maxH / k;
    let maxV = ticks[ticks.length - 1];
    if (maxV < maxH / k) {
      maxV += step;
      ticks.push(maxV);
    }
    return { ticks, maxH: maxV * k };
  }, [rows, k]);

  const pct = (hours: number) => `${clamp((hours / axis.maxH) * 100, 0, 100)}%`;
  const pmPct = pct(NEXT_PM_D * 24);

  return (
    <div className="rul-gantt">
      <div className="rul-gantt-plot">
        <div className="rul-gantt-overlay" aria-hidden="true">
          {axis.ticks.map((t) => (
            <span key={t} className="rul-gantt-grid" style={{ left: pct(t * k) }} />
          ))}
          <span className="rul-gantt-pm" style={{ left: pmPct }}>
            <span className="rul-gantt-pm-label">PM {fmt(NEXT_PM_D * 24, unit)}</span>
          </span>
        </div>

        <div className="rul-gantt-rows" role="group" aria-label="Remaining useful life by component">
          {rows.map((r) => {
            const selected = r.id === selectedId;
            const overflow = r.p90 > axis.maxH;
            return (
              <button
                key={r.id}
                type="button"
                className={`rul-gantt-row ${TONE_CLASS[r.status]} ${selected ? "is-selected" : ""}`}
                aria-pressed={selected}
                aria-label={`${r.name}: RUL ${fmt(r.hours, unit)}, P10 ${fmt(r.p10, unit)}, P90 ${fmt(r.p90, unit)}, ${r.status}`}
                onClick={() => onSelect(r.id)}
              >
                <span className="rul-gantt-name">{r.name}</span>
                <span className="rul-gantt-track">
                  <span className="rul-gantt-bar" style={{ width: pct(r.hours) }} />
                  <span
                    className={`rul-gantt-ci ${overflow ? "is-open" : ""}`}
                    style={{ left: pct(r.p10), width: `calc(${pct(r.p90)} - ${pct(r.p10)})` }}
                  />
                  <span className="rul-gantt-pt" style={{ left: pct(r.hours) }} />
                </span>
                <span className="rul-gantt-val">{fmt(r.hours, unit)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rul-gantt-axis" aria-hidden="true">
        {axis.ticks.map((t, i) => (
          <span
            key={t}
            className={`rul-gantt-tick ${i === 0 ? "is-first" : ""} ${i === axis.ticks.length - 1 ? "is-last" : ""}`}
            style={{ left: pct(t * k) }}
          >
            {fmt(t * k, unit)}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Degradation curve                                                  */
/* ------------------------------------------------------------------ */

const DW = 480;
const DH = 240;
const DM = { l: 38, r: 14, t: 14, b: 26 };
const PW = DW - DM.l - DM.r;
const PH = DH - DM.t - DM.b;

function DegradationChart({ row, unit }: { row: LifeRow; unit: Unit }) {
  const [hoverT, setHoverT] = useState<number | null>(null);
  const k = unit === "h" ? 24 : 1; // days → display unit

  const g = useMemo(() => {
    const T = row.hours / 24;
    const T10 = row.p10 / 24;
    const T90 = row.p90 / 24;
    const h0 = startHealth(row.health);
    const xMin = -0.6 * T;
    const xMax = Math.max(T90, Math.min(NEXT_PM_D, T90 * 1.5)) * 1.06;
    const x = (t: number) => DM.l + ((t - xMin) / (xMax - xMin)) * PW;
    const y = (h: number) => DM.t + (1 - clamp(h, 0, 100) / 100) * PH;
    const pt = (t: number, h: number) => `${x(t).toFixed(1)} ${y(h).toFixed(1)}`;

    const n = row.history.length;
    const hist = row.history.map((h, i) => `${i ? "L" : "M"}${pt(xMin + (-xMin * i) / (n - 1), h)}`).join(" ");

    const N = 40;
    const proj = Array.from({ length: N + 1 }, (_, i) => {
      const t = (T * i) / N;
      return `${i ? "L" : "M"}${pt(t, wear(h0, t, T))}`;
    }).join(" ");

    const upper = Array.from({ length: N + 1 }, (_, i) => (T90 * i) / N).map((t) => pt(t, wear(h0, t, T90)));
    const lower = Array.from({ length: N + 1 }, (_, i) => (T90 * (N - i)) / N).map((t) =>
      pt(t, Math.max(wear(h0, t, T10), EOL_HEALTH)),
    );
    const fan = `M${upper.join(" L")} L${lower.join(" L")} Z`;

    const xTicks = niceTicks(xMin * k, xMax * k, 5).map((v) => ({ v, px: x(v / k) }));
    return { T, T10, T90, h0, xMin, xMax, x, y, hist, proj, fan, xTicks };
  }, [row, k]);

  const onMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const vx = ((e.clientX - rect.left) / rect.width) * DW;
      const t = g.xMin + ((vx - DM.l) / PW) * (g.xMax - g.xMin);
      setHoverT(clamp(t, g.xMin, g.xMax));
    },
    [g],
  );

  const hover = useMemo(() => {
    if (hoverT === null) return null;
    const p50 = clamp(wear(g.h0, hoverT, g.T), 0, 100);
    const p10 = clamp(wear(g.h0, hoverT, g.T10), 0, 100);
    const p90 = clamp(wear(g.h0, hoverT, g.T90), 0, 100);
    const px = g.x(hoverT);
    const flip = px > DM.l + PW * 0.6;
    const tLabel = Math.abs(hoverT) < 0.05 ? "Now" : `${hoverT > 0 ? "+" : "−"}${fmt(Math.abs(hoverT) * 24, unit)}`;
    const hLabel = hoverT > 0 ? `${p50.toFixed(0)} % (${p10.toFixed(0)}–${p90.toFixed(0)} %)` : `${p50.toFixed(0)} %`;
    return { px, py: g.y(p50), flip, tLabel, hLabel };
  }, [hoverT, g, unit]);

  const pmVisible = NEXT_PM_D <= g.xMax;
  const label = `Health of ${row.name} versus time. Now ${row.health.toFixed(0)} %, projected to reach end-of-life ${EOL_HEALTH} % in ${fmt(row.hours, unit)} (P10 ${fmt(row.p10, unit)}, P90 ${fmt(row.p90, unit)}).`;

  return (
    <svg
      className={`rul-deg-svg ${TONE_CLASS[row.status]}`}
      viewBox={`0 0 ${DW} ${DH}`}
      role="img"
      aria-label={label}
      onPointerMove={onMove}
      onPointerLeave={() => setHoverT(null)}
    >
      {[0, 25, 50, 75, 100].map((h) => (
        <g key={h}>
          <line className="rul-grid" x1={DM.l} x2={DM.l + PW} y1={g.y(h)} y2={g.y(h)} />
          <text className="rul-tick" x={DM.l - 6} y={g.y(h) + 3.5} textAnchor="end">
            {h} %
          </text>
        </g>
      ))}
      {g.xTicks.map(({ v, px }) => (
        <text key={v} className="rul-tick" x={px} y={DH - 8} textAnchor="middle">
          {v === 0 ? "Now" : `${v > 0 ? "+" : "−"}${NUM.format(Math.abs(v))} ${unit}`}
        </text>
      ))}

      <path className="rul-deg-fan" d={g.fan} />
      <line className="rul-deg-now" x1={g.x(0)} x2={g.x(0)} y1={DM.t} y2={DM.t + PH} />
      {pmVisible && (
        <g>
          <line className="rul-deg-pm" x1={g.x(NEXT_PM_D)} x2={g.x(NEXT_PM_D)} y1={DM.t} y2={DM.t + PH} />
          <text className="rul-tick" x={g.x(NEXT_PM_D) + 4} y={DM.t + 10}>
            PM
          </text>
        </g>
      )}
      <line className="rul-deg-eol" x1={DM.l} x2={DM.l + PW} y1={g.y(EOL_HEALTH)} y2={g.y(EOL_HEALTH)} />
      <text className="rul-tick" x={DM.l + PW} y={g.y(EOL_HEALTH) - 5} textAnchor="end">
        EoL {EOL_HEALTH} %
      </text>

      <path className="rul-deg-hist" d={g.hist} />
      <path className="rul-deg-proj" d={g.proj} />
      <circle className="rul-deg-now-pt" cx={g.x(0)} cy={g.y(g.h0)} r={4} />
      <circle className="rul-deg-eol-pt" cx={g.x(g.T)} cy={g.y(EOL_HEALTH)} r={5} />

      {hover && (
        <g className="rul-deg-hover" pointerEvents="none">
          <line x1={hover.px} x2={hover.px} y1={DM.t} y2={DM.t + PH} />
          <circle cx={hover.px} cy={hover.py} r={4} />
          <text x={hover.flip ? hover.px - 8 : hover.px + 8} y={DM.t + 12} textAnchor={hover.flip ? "end" : "start"}>
            <tspan className="rul-deg-hover-t">{hover.tLabel}</tspan>
            <tspan x={hover.flip ? hover.px - 8 : hover.px + 8} dy={14}>
              {hover.hLabel}
            </tspan>
          </text>
        </g>
      )}

      <rect className="rul-deg-hit" x={DM.l} y={DM.t} width={PW} height={PH} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Module                                                             */
/* ------------------------------------------------------------------ */

export function RulModule({ data, onBack }: RulModuleProps) {
  const [unit, setUnit] = useState<Unit>("d");

  const rows = useMemo<LifeRow[]>(() => {
    return (data?.rul ?? []).map(fromRulItem).sort((a, b) => a.hours - b.hours);
  }, [data]);

  const [selectedId, setSelectedId] = useState<string>(() => rows[0]?.id ?? "");
  const selected = rows.find((r) => r.id === selectedId) ?? rows[0];

  const kpi = useMemo(
    () => ({ min: rows[0], short: rows.filter((r) => r.hours / 24 < SHORT_HORIZON_D).length }),
    [rows],
  );

  if (!selected) {
    return (
      <div className="rul-page">
        <header className="rul-head">
          <div className="rul-head-left">
            {onBack && (
              <PillButton variant="secondary" className="rul-back" onClick={onBack} aria-label="Back to assets">
                Assets
              </PillButton>
            )}
            <h2 className="rul-title">Remaining useful life</h2>
          </div>
        </header>
        <section className="rul-panel rul-empty" role="status">
          No sub-assemblies are registered for this machine, so there is no remaining-life estimate.
        </section>
      </div>
    );
  }

  const pmMargin = selected.p10 - NEXT_PM_D * 24;
  const shortLabel = unit === "d" ? `Under ${SHORT_HORIZON_D} d` : `Under ${NUM.format(SHORT_HORIZON_D * 24)} h`;

  return (
    <div className="rul-page">
      <header className="rul-head">
        <div className="rul-head-left">
          {onBack && (
            <PillButton
              variant="secondary"
              className="rul-back"
              onClick={onBack}
              aria-label="Back to assets"
              icon={
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              }
            >
              Assets
            </PillButton>
          )}
          <h2 className="rul-title">Remaining useful life</h2>
          <span className={`rul-chip ${TONE_CLASS[kpi.min.status]}`}>
            <span className="rul-status-dot" aria-hidden="true" />
            Min <strong>{fmt(kpi.min.hours, unit)}</strong> · {kpi.min.name}
          </span>
          {kpi.short > 0 && (
            <span className={`rul-chip ${TONE_CLASS.Critical}`}>
              <span className="rul-status-dot" aria-hidden="true" />
              <strong>{kpi.short}</strong> {shortLabel.toLowerCase()}
            </span>
          )}
        </div>
        <PillNav items={UNIT_ITEMS} activeId={unit} onChange={(id) => setUnit(id as Unit)} className="rul-unit-nav" />
      </header>

      <section className="rul-main">
        <div className="rul-panel rul-panel--timeline">
          <div className="rul-panel-head">
            <h3 className="rul-panel-title">RUL timeline</h3>
            <div className="rul-legend" aria-hidden="true">
              <span><i className="rul-key rul-key--bar" />P50</span>
              <span><i className="rul-key rul-key--ci" />P10–P90</span>
              <span><i className="rul-key rul-key--pm" />Next PM</span>
            </div>
          </div>
          <RulTimeline rows={rows} unit={unit} selectedId={selected.id} onSelect={setSelectedId} />
        </div>

        <div className="rul-panel rul-panel--curve">
          <div className="rul-panel-head">
            <h3 className="rul-panel-title" title={selected.name}>{selected.name}</h3>
            <StatusTag status={selected.status} />
          </div>
          <dl className="rul-facts">
            <div>
              <dt>Health</dt>
              <dd>{selected.health.toFixed(0)} %</dd>
            </div>
            <div>
              <dt>Rate</dt>
              <dd>−{selected.rate.toFixed(2)} %/d</dd>
            </div>
            <div>
              <dt>P10–P90</dt>
              <dd>
                {fmtNum(selected.p10, unit)}–{fmt(selected.p90, unit)}
              </dd>
            </div>
            <div className={pmMargin < 0 ? "is-bad" : ""}>
              <dt>P10 vs PM</dt>
              <dd className="rul-facts-tone">
                {pmMargin >= 0 ? "+" : "−"}
                {fmt(Math.abs(pmMargin), unit)}
              </dd>
            </div>
          </dl>
          <DegradationChart row={selected} unit={unit} />
          <div className="rul-legend rul-legend--foot" aria-hidden="true">
            <span><i className="rul-key rul-key--hist" />History</span>
            <span><i className="rul-key rul-key--proj" />Projection</span>
            <span><i className="rul-key rul-key--fan" />P10–P90</span>
            <span><i className="rul-key rul-key--eol" />End of life</span>
          </div>
        </div>
      </section>

      <section className="rul-panel rul-panel--table">
        <div className="rul-panel-head">
          <h3 className="rul-panel-title">Components</h3>
        </div>
        <div className="rul-table-wrap">
          <table className="rul-table">
            <thead>
              <tr>
                <th scope="col">Component</th>
                <th scope="col" className="is-num">RUL</th>
                <th scope="col" className="is-num">P10–P90</th>
                <th scope="col">Confidence</th>
                <th scope="col">Trend</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isSel = r.id === selected.id;
                return (
                  <tr key={r.id} className={isSel ? "is-selected" : ""} onClick={() => setSelectedId(r.id)}>
                    <td>
                      <button type="button" className="rul-t-name" aria-pressed={isSel} onClick={() => setSelectedId(r.id)}>
                        <span className={`rul-t-badge ${TONE_CLASS[r.status]}`}>
                          <Icon name="part" />
                        </span>
                        <span className="rul-t-text">
                          <span className="rul-t-title">{r.name}</span>
                          <span className="rul-t-sub">Health {r.health.toFixed(0)} %</span>
                        </span>
                      </button>
                    </td>
                    <td className="is-num rul-t-strong">{fmt(r.hours, unit)}</td>
                    <td className="is-num">
                      {fmtNum(r.p10, unit)}–{fmt(r.p90, unit)}
                    </td>
                    <td>
                      <span className="rul-conf">
                        <span className="rul-conf-track" aria-hidden="true">
                          <span className="rul-conf-fill" style={{ width: `${r.confidence}%` }} />
                        </span>
                        <span className="is-num">{r.confidence.toFixed(0)} %</span>
                      </span>
                    </td>
                    <td>
                      <span className="rul-trend">
                        <TrendSpark values={r.history} />
                        <span className="is-num">−{r.rate.toFixed(2)} %/d</span>
                      </span>
                    </td>
                    <td>
                      <StatusTag status={r.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
