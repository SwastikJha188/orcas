"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import type { FailureRisk, InsightsResponse, Severity } from "@/server/services/insights-service";
import { PillButton, PillNav } from "@/components/ui";
import { TickMeter } from "@/components/assets/insights-ui";
import { smoothPath } from "@/components/assets/diagnosis/shared";
import "./risk-module.css";

type PrognosisData = InsightsResponse["prognosis"];

export interface RiskModuleProps {
  data: PrognosisData;
  onBack?: () => void;
}

/* ------------------------------------------------------------------ */
/* Model constants                                                    */
/* ------------------------------------------------------------------ */

type PeriodId = "24h" | "7d" | "30d";

const PERIODS: Array<{ id: PeriodId; label: string; hours: number }> = [
  { id: "24h", label: "24 h", hours: 24 },
  { id: "7d", label: "7 d", hours: 168 },
  { id: "30d", label: "30 d", hours: 720 },
];

/** Action threshold — probability at which a mode requires intervention. */
const THRESHOLD = 50;
/** Advisory band lower bound. */
const WARN = 20;

/** Weibull shape parameter by severity — wear-out accelerates for critical modes. */
const SHAPE: Record<Severity, number> = { Critical: 2.0, Advisory: 1.5, Normal: 1.2 };

const ZONE_LABEL: Record<Severity, string> = { Critical: "High", Advisory: "Elevated", Normal: "Low" };
/** Zone → CSS modifier; the colour itself lives in risk-module.css (`--z`). */
const Z: Record<Severity, "bad" | "warn" | "good"> = { Critical: "bad", Advisory: "warn", Normal: "good" };

interface Contributor {
  tag: string;
  name: string;
  share: number;
}

interface ModeModel {
  risk: FailureRisk;
  shape: number;
  scale: number; // Weibull η in hours
  p: Record<PeriodId, number>; // %
  t50: number; // hours to 50 % probability
  contributors: Contributor[];
}

/* ------------------------------------------------------------------ */
/* Pure helpers                                                       */
/* ------------------------------------------------------------------ */

function zoneOf(p: number): Severity {
  if (p >= THRESHOLD) return "Critical";
  if (p >= WARN) return "Advisory";
  return "Normal";
}

function cdf(t: number, scale: number, shape: number): number {
  return (1 - Math.exp(-Math.pow(Math.max(0, t) / scale, shape))) * 100;
}

function windowHours(window: string): number {
  const m = /([\d.]+)\s*(h|d)/i.exec(window);
  if (!m) return 720;
  const v = Number(m[1]);
  return m[2].toLowerCase() === "h" ? v : v * 24;
}

function fmtPct(p: number): string {
  if (p > 0 && p < 0.1) return "<0.1 %";
  return `${p < 10 ? p.toFixed(1) : Math.round(p)} %`;
}

function fmtDuration(h: number): string {
  if (!Number.isFinite(h)) return "—";
  if (h < 48) return `${Math.max(1, Math.round(h))} h`;
  const d = h / 24;
  if (d > 365) return ">365 d";
  return `${Math.round(d)} d`;
}

function buildModel(risk: FailureRisk, data: PrognosisData): ModeModel {
  const shape = SHAPE[risk.severity] ?? 1.5;
  const pw = Math.min(0.99, Math.max(0.01, risk.probability / 100));
  const w = windowHours(risk.window);
  const scale = w / Math.pow(-Math.log(1 - pw), 1 / shape);
  const p = {} as Record<PeriodId, number>;
  for (const per of PERIODS) p[per.id] = cdf(per.hours, scale, shape);
  const t50 = scale * Math.pow(Math.LN2, 1 / shape);

  return { risk, shape, scale, p, t50, contributors: buildContributors(risk, data) };
}

function sensorName(tag: string, data: PrognosisData): string {
  const a = data.anomalies?.find((x) => x.tag === tag);
  if (a) return a.name;
  const f = data.forecasts?.[tag];
  const first = f ? Object.values(f)[0] : undefined;
  return first?.name ?? tag;
}

function buildContributors(risk: FailureRisk, data: PrognosisData): Contributor[] {
  const weights = new Map<string, number>();
  const add = (tag: string, w: number) => weights.set(tag, (weights.get(tag) ?? 0) + w);
  const comp = risk.component.toLowerCase();

  for (const a of data.anomalies ?? []) {
    if (a.tag === risk.id) add(a.tag, a.score + 0.4);
    else {
      const ac = a.component.toLowerCase();
      if (ac === comp || ac.includes(comp) || comp.includes(ac)) add(a.tag, a.score);
    }
  }
  for (const link of data.influences?.[risk.id] ?? []) add(link.tag, Math.abs(link.coefficient) * 0.6);

  // Only payload evidence (anomalies on the component, measured couplings); no filler.

  const top = [...weights.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const total = top.reduce((s, [, w]) => s + w, 0) || 1;
  return top.map(([tag, w]) => ({ tag, name: sensorName(tag, data), share: (w / total) * 100 }));
}

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                        */
/* ------------------------------------------------------------------ */

function ZoneChip({ zone, suffix }: { zone: Severity; suffix?: string }) {
  return (
    <span className={`risk-chip z-${Z[zone]}`}>
      <span className="risk-chip-dot" aria-hidden="true" />
      {ZONE_LABEL[zone]}
      {suffix ? ` ${suffix}` : ""}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Hazard curve — cumulative failure probability over the horizon     */
/* ------------------------------------------------------------------ */

const CW = 560;
const CH = 230;
const PAD = { l: 40, r: 14, t: 12, b: 30 };
const PW = CW - PAD.l - PAD.r;
const PH = CH - PAD.t - PAD.b;
const yOf = (p: number) => PAD.t + (1 - Math.min(100, p) / 100) * PH;

function axisTicks(period: { id: PeriodId; hours: number }): Array<{ h: number; label: string }> {
  if (period.id === "24h") return [0, 6, 12, 18, 24].map((h) => ({ h, label: `${h} h` }));
  if (period.id === "7d") return [0, 1, 2, 3, 4, 5, 6, 7].map((d) => ({ h: d * 24, label: `${d} d` }));
  return [0, 5, 10, 15, 20, 25, 30].map((d) => ({ h: d * 24, label: `${d} d` }));
}

function HazardCurve({ mode, period }: { mode: ModeModel; period: (typeof PERIODS)[number] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverH, setHoverH] = useState<number | null>(null);
  const xOf = useCallback((h: number) => PAD.l + (h / period.hours) * PW, [period.hours]);

  const { line, area, end, cross } = useMemo(() => {
    const n = 48;
    const pts = Array.from({ length: n + 1 }, (_, i) => {
      const h = (i / n) * period.hours;
      return { x: xOf(h), y: yOf(cdf(h, mode.scale, mode.shape)) };
    });
    const l = smoothPath(pts);
    const base = yOf(0).toFixed(1);
    return {
      line: l,
      area: `${l} L ${xOf(period.hours).toFixed(1)} ${base} L ${PAD.l} ${base} Z`,
      end: cdf(period.hours, mode.scale, mode.shape),
      cross: mode.t50 <= period.hours ? mode.t50 : null,
    };
  }, [mode, period.hours, xOf]);

  const zone = zoneOf(end);
  const ticks = axisTicks(period);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * CW;
    const h = ((x - PAD.l) / PW) * period.hours;
    setHoverH(h < 0 || h > period.hours ? null : h);
  };

  const hp = hoverH !== null ? cdf(hoverH, mode.scale, mode.shape) : null;
  const tipLeft = hoverH !== null ? (xOf(hoverH) / CW) * 100 : 0;

  return (
    <div className="risk-curve-wrap">
      <svg
        ref={svgRef}
        className={`risk-curve z-${Z[zone]}`}
        viewBox={`0 0 ${CW} ${CH}`}
        role="img"
        aria-label={`Cumulative failure probability for ${mode.risk.fault} over ${period.label}: ${fmtPct(end)} at end of period, threshold ${THRESHOLD} %`}
        onMouseMove={onMove}
        onMouseLeave={() => setHoverH(null)}
      >
        {/* Zone bands */}
        <rect className="risk-band risk-band--bad" x={PAD.l} y={yOf(100)} width={PW} height={yOf(THRESHOLD) - yOf(100)} />
        <rect className="risk-band risk-band--warn" x={PAD.l} y={yOf(THRESHOLD)} width={PW} height={yOf(WARN) - yOf(THRESHOLD)} />

        {/* Grid + y axis */}
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line className="risk-grid" x1={PAD.l} x2={CW - PAD.r} y1={yOf(v)} y2={yOf(v)} />
            <text className="risk-axis" x={PAD.l - 6} y={yOf(v) + 3.5} textAnchor="end">
              {v} %
            </text>
          </g>
        ))}

        {/* x axis */}
        {ticks.map((t) => (
          <text key={t.h} className="risk-axis" x={xOf(t.h)} y={CH - 10} textAnchor={t.h === 0 ? "start" : t.h === period.hours ? "end" : "middle"}>
            {t.label}
          </text>
        ))}

        {/* Threshold */}
        <line className="risk-threshold" x1={PAD.l} x2={CW - PAD.r} y1={yOf(THRESHOLD)} y2={yOf(THRESHOLD)} />

        {/* Curve */}
        <path d={area} className="risk-curve-area" />
        <path d={line} className="risk-z-stroke risk-curve-line" vectorEffect="non-scaling-stroke" />

        {/* Threshold crossing */}
        {cross !== null && (
          <g>
            <line className="risk-cross" x1={xOf(cross)} x2={xOf(cross)} y1={yOf(THRESHOLD)} y2={yOf(0)} />
            <circle cx={xOf(cross)} cy={yOf(THRESHOLD)} r="4" className="risk-dot z-bad" />
          </g>
        )}

        {/* End marker */}
        <circle cx={xOf(period.hours)} cy={yOf(end)} r="4" className="risk-dot" />

        {/* Crosshair */}
        {hoverH !== null && hp !== null && (
          <g pointerEvents="none">
            <line className="risk-crosshair" x1={xOf(hoverH)} x2={xOf(hoverH)} y1={PAD.t} y2={yOf(0)} />
            <circle cx={xOf(hoverH)} cy={yOf(hp)} r="4" className={`risk-dot z-${Z[zoneOf(hp)]}`} />
          </g>
        )}
      </svg>
      {hoverH !== null && hp !== null && (
        <div className="risk-tip risk-tip--curve" style={{ left: `${tipLeft}%` }} aria-hidden="true">
          <span className="risk-tip-k">t = {fmtDuration(hoverH)}</span>
          <span className="risk-tip-v">{fmtPct(hp)}</span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Module                                                             */
/* ------------------------------------------------------------------ */

export function RiskModule({ data, onBack }: RiskModuleProps) {
  const [periodId, setPeriodId] = useState<PeriodId>("7d");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const barRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const period = PERIODS.find((p) => p.id === periodId) ?? PERIODS[1];

  const modes = useMemo(() => (data?.risks ?? []).map((r) => buildModel(r, data)), [data]);
  const ranked = useMemo(() => [...modes].sort((a, b) => b.p[periodId] - a.p[periodId]), [modes, periodId]);
  const selected = ranked.find((m) => m.risk.id === selectedId) ?? ranked[0] ?? null;

  const kpis = useMemo(() => {
    const top = ranked[0] ?? null;
    const earliest = modes.reduce<ModeModel | null>((best, m) => (!best || m.t50 < best.t50 ? m : best), null);
    return { top, earliest };
  }, [ranked, modes]);

  const overall = kpis.top ? zoneOf(kpis.top.p[periodId]) : "Normal";

  const onBarKey = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    const next = e.key === "ArrowDown" || e.key === "ArrowRight" ? idx + 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? idx - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const clamped = Math.max(0, Math.min(ranked.length - 1, next));
    setSelectedId(ranked[clamped].risk.id);
    barRefs.current[clamped]?.focus();
  };

  const onRowKey = (e: React.KeyboardEvent<HTMLTableRowElement>, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSelectedId(id);
    }
  };

  return (
    <div className="risk-root">
      {/* 1 · Header */}
      <header className="risk-head">
        <div className="risk-head-l">
          {onBack && (
            <PillButton
              variant="secondary"
              className="risk-back"
              onClick={onBack}
              aria-label="Back to assets"
              icon={
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              }
            >
              Back
            </PillButton>
          )}
          <h2 className="risk-title">Failure risk</h2>
          <ZoneChip zone={overall} suffix="risk" />
          {kpis.earliest && (
            <span className="risk-head-fig" title={kpis.earliest.risk.fault}>
              Earliest failure <strong>{fmtDuration(kpis.earliest.t50)}</strong> · {kpis.earliest.risk.fault}
            </span>
          )}
        </div>
        <PillNav
          className="risk-period"
          items={PERIODS.map((p) => ({ id: p.id, label: p.label }))}
          activeId={periodId}
          onChange={(id) => setPeriodId(id as PeriodId)}
        />
      </header>

      {ranked.length === 0 ? (
        <section className="risk-card risk-empty" role="status">
          <ZoneChip zone="Normal" />
          <span>No active failure modes</span>
        </section>
      ) : (
        <>
          {/* 3 · Primary visual */}
          <section className="risk-primary">
            <div className="risk-card risk-ranked">
              <div className="risk-card-head">
                <h3 className="risk-h3">Failure modes · P({period.label})</h3>
                <span className="risk-legend">
                  <i className="risk-legend-thr" aria-hidden="true" />
                  Threshold {THRESHOLD} %
                </span>
              </div>

              <div className="risk-bars" role="radiogroup" aria-label={`Failure modes ranked by probability within ${period.label}`}>
                {ranked.map((m, idx) => {
                  const p = m.p[periodId];
                  const z = zoneOf(p);
                  const isSel = selected?.risk.id === m.risk.id;
                  return (
                    <button
                      key={m.risk.id}
                      ref={(el) => {
                        barRefs.current[idx] = el;
                      }}
                      type="button"
                      role="radio"
                      aria-checked={isSel}
                      tabIndex={isSel ? 0 : -1}
                      aria-label={`${m.risk.fault}, ${m.risk.component}: ${fmtPct(p)} within ${period.label}, ${ZONE_LABEL[z]} risk`}
                      className={`risk-bar-row z-${Z[z]}${isSel ? " is-selected" : ""}`}
                      onClick={() => setSelectedId(m.risk.id)}
                      onKeyDown={(e) => onBarKey(e, idx)}
                    >
                      <span className="risk-bar-name">
                        <span className="risk-bar-fault">{m.risk.fault}</span>
                        <span className="risk-bar-comp">{m.risk.component}</span>
                      </span>
                      <span className="risk-bar-track">
                        <span className="risk-bar-band" aria-hidden="true" />
                        <span className="risk-bar-fill" style={{ width: `${Math.max(0.6, p)}%` }} />
                        <span className="risk-bar-thr" aria-hidden="true" />
                      </span>
                      <span className="risk-bar-val">{fmtPct(p)}</span>
                      <span className="risk-tip risk-tip--bar" aria-hidden="true">
                        {PERIODS.map((per) => (
                          <span key={per.id} className="risk-tip-pair">
                            <span className="risk-tip-k">{per.label}</span>
                            <span className="risk-tip-v">{fmtPct(m.p[per.id])}</span>
                          </span>
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="risk-bar-axis" aria-hidden="true">
                <span />
                <span className="risk-bar-axis-scale">
                  {[0, 25, 50, 75, 100].map((v) => (
                    <span key={v} style={{ left: `${v}%` }}>
                      {v} %
                    </span>
                  ))}
                </span>
                <span />
              </div>
            </div>

            {selected && (
              <div className="risk-card risk-detail" aria-live="polite">
                <div className="risk-card-head">
                  <div className="risk-detail-id">
                    <h3 className="risk-h3">{selected.risk.fault}</h3>
                    <span className="risk-detail-meta">
                      {selected.risk.component} · {selected.risk.priority} · act {selected.risk.window}
                    </span>
                  </div>
                  <ZoneChip zone={zoneOf(selected.p[periodId])} />
                </div>

                <HazardCurve mode={selected} period={period} />

                <div className="risk-contrib">
                  <span className="risk-sublabel">Contributing sensors</span>
                  {selected.contributors.length === 0 && (
                    <p className="risk-detail-meta">No contributing sensor recorded for this mode.</p>
                  )}
                  <ul className="risk-contrib-list">
                    {selected.contributors.map((c) => (
                      <li key={c.tag} className="risk-contrib-row">
                        <span className="risk-contrib-tag">{c.tag}</span>
                        <span className="risk-contrib-name">{c.name}</span>
                        <TickMeter value={c.share} max={100} ticks={20} color="var(--page-fg)" className="risk-contrib-meter" />
                        <span className="risk-contrib-val">{Math.round(c.share)} %</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>

          {/* 4 · Register */}
          <section className="risk-card risk-register">
            <div className="risk-card-head">
              <h3 className="risk-h3">Risk register</h3>
            </div>
            <div className="risk-table-scroll">
              <table className="risk-table">
                <thead>
                  <tr>
                    <th scope="col">Failure mode</th>
                    <th scope="col">Component</th>
                    <th scope="col" className="num">P(24 h)</th>
                    <th scope="col" className="num">P(7 d)</th>
                    <th scope="col" className="num">P(30 d)</th>
                    <th scope="col">Act within</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((m) => {
                    const isSel = selected?.risk.id === m.risk.id;
                    const z = zoneOf(m.p[periodId]);
                    return (
                      <tr
                        key={m.risk.id}
                        className={isSel ? "is-selected" : undefined}
                        tabIndex={0}
                        aria-selected={isSel}
                        onClick={() => setSelectedId(m.risk.id)}
                        onKeyDown={(e) => onRowKey(e, m.risk.id)}
                      >
                        <td>
                          <span className="risk-mode-cell">
                            <span className={`risk-badge z-${Z[m.risk.severity]}`} aria-hidden="true">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 3l9 16H3z" />
                                <path d="M12 10v4M12 17h.01" />
                              </svg>
                            </span>
                            <span className="risk-mode-name">{m.risk.fault}</span>
                          </span>
                        </td>
                        <td className="muted">{m.risk.component}</td>
                        {PERIODS.map((per) => (
                          <td key={per.id} className={`num${per.id === periodId ? " is-active" : ""}`}>
                            {fmtPct(m.p[per.id])}
                          </td>
                        ))}
                        <td className="muted">{m.risk.window}</td>
                        <td>
                          <ZoneChip zone={z} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
