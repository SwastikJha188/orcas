"use client";

import React, { useMemo, useState } from "react";
import { PillButton, PillNav } from "@/components/ui";
import { StatusChip, TickMeter, TONE } from "../insights-ui";
import type { AnomalyItem, ForecastSeries, InsightsResponse, Severity } from "@/server/services/insights-service";
import { formatDuration, parseDuration } from "@/lib/kiln-sim/engine";
import "./anomaly-module.css";

type PrognosisData = InsightsResponse["prognosis"];

export interface AnomalyModuleProps {
  data: PrognosisData;
  onBack?: () => void;
}

/* ------------------------------------------------------------------ */
/* Model — payload only                                               */
/* ------------------------------------------------------------------ */

type SeverityFilter = "all" | "Critical" | "Advisory";
type EventStatus = "Open" | "Acknowledged";

interface AnomalyEvent {
  id: string;
  tag: string;
  name: string;
  component: string;
  score: number;
  severity: Severity;
  /** Deviation text exactly as reported by the model. */
  deviation: string;
  /** Minutes since onset, when the payload records it; null otherwise. */
  ago: number | null;
  /** Onset text when it is not a duration (e.g. "sensor validation"). */
  onsetNote: string | null;
  /** Payload flags the deviation as matching no known fault pattern. */
  unknownPattern: boolean;
}

const ALERT = 0.35;
const CRITICAL = 0.7;

/** Parses "12m ago", "1h 05m ago", "3 d ago"; anything else is not a recorded onset. */
/** Simulated minutes since onset, from a "12m 05s ago" style label. */
function parseOnset(onset: string): number | null {
  return parseDuration(onset.replace(/\s*ago\s*$/, ""));
}

const fmtDuration = formatDuration;

function toEvents(anomalies: AnomalyItem[]): AnomalyEvent[] {
  return anomalies.map((a) => {
    const ago = parseOnset(a.onset ?? "");
    const note = ago === null && a.onset && a.onset.trim() !== "—" ? a.onset : null;
    return {
      id: a.tag,
      tag: a.tag,
      name: a.name,
      component: a.component,
      score: a.score,
      severity: a.severity,
      deviation: a.deviation,
      ago,
      onsetNote: note,
      unknownPattern: /no known pattern/i.test(a.deviation),
    };
  });
}

const onsetText = (e: AnomalyEvent) => (e.ago !== null ? `−${fmtDuration(e.ago)}` : e.onsetNote ?? "Not recorded");

/* ------------------------------------------------------------------ */
/* Icons                                                              */
/* ------------------------------------------------------------------ */

function WaveIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12h4l2-6 4 12 3-9 2 3h5" />
    </svg>
  );
}

const KPI_ICONS: Record<string, React.ReactNode> = {
  novel: <path d="M12 3v3m0 12v3M3 12h3m12 0h3M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />,
  mtta: <path d="M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
};

/* ------------------------------------------------------------------ */
/* Score ranking (current scores, one bar per sensor)                 */
/* ------------------------------------------------------------------ */

const SR = { w: 720, row: 26, l: 112, r: 52, t: 8, b: 24 };

function ScoreRanking({
  events,
  selectedId,
  onSelect,
}: {
  events: AnomalyEvent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const rows = useMemo(() => [...events].sort((a, b) => b.score - a.score), [events]);
  const pw = SR.w - SR.l - SR.r;
  const h = SR.t + Math.max(1, rows.length) * SR.row + SR.b;
  const x = (s: number) => SR.l + Math.max(0, Math.min(1, s)) * pw;

  if (rows.length === 0) return <div className="anom-empty">No sensor is deviating from its model.</div>;

  return (
    <svg viewBox={`0 0 ${SR.w} ${h}`} className="anom-svg" role="group" aria-label={`Current anomaly score for ${rows.length} sensors`}>
      {[0, 0.25, 0.5, 0.75, 1].map((v) => (
        <g key={v}>
          <line x1={x(v)} x2={x(v)} y1={SR.t} y2={h - SR.b} className="anom-grid" />
          <text x={x(v)} y={h - 8} textAnchor="middle" className="anom-axis">
            {v.toFixed(2)}
          </text>
        </g>
      ))}
      <line x1={x(ALERT)} x2={x(ALERT)} y1={SR.t} y2={h - SR.b} className="anom-thr warn" />
      <line x1={x(CRITICAL)} x2={x(CRITICAL)} y1={SR.t} y2={h - SR.b} className="anom-thr bad" />
      {rows.map((e, i) => {
        const y = SR.t + i * SR.row;
        const sel = e.id === selectedId;
        return (
          <g
            key={e.id}
            role="button"
            tabIndex={0}
            aria-pressed={sel}
            aria-label={`${e.tag}, score ${e.score.toFixed(2)}`}
            className="anom-mark"
            onClick={() => onSelect(e.id)}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" || ev.key === " ") {
                ev.preventDefault();
                onSelect(e.id);
              }
            }}
          >
            <rect x={0} y={y} width={SR.w} height={SR.row} className="anom-hit" />
            <text x={SR.l - 10} y={y + SR.row / 2 + 3.5} textAnchor="end" className={`anom-axis${sel ? " strong" : ""}`}>
              {e.tag}
            </text>
            <rect x={SR.l} y={y + 7} width={pw} height={SR.row - 14} rx={3} className="anom-rank-track" />
            <rect
              x={SR.l}
              y={y + 7}
              width={Math.max(2, x(e.score) - SR.l)}
              height={SR.row - 14}
              rx={3}
              fill={TONE[e.severity]}
              className={sel ? "anom-rank-bar is-sel" : "anom-rank-bar"}
            />
            <text x={SR.w - SR.r + 8} y={y + SR.row / 2 + 3.5} className="anom-axis strong">
              {e.score.toFixed(2)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Activity (payload anomalyTimeline buckets, oldest → now)           */
/* ------------------------------------------------------------------ */

function Activity({ values }: { values: number[] }) {
  if (values.length === 0) {
    return <div className="anom-empty">Anomaly activity history is not recorded for this machine.</div>;
  }
  const max = Math.max(1, ...values);
  const W = 260;
  const H = 90;
  const bw = W / values.length;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="anom-svg" role="img" aria-label={`Anomaly activity in ${values.length} buckets, peak ${max}`}>
        <line x1={0} x2={W} y1={H - 0.5} y2={H - 0.5} className="anom-grid" />
        {values.map((v, i) => {
          const bh = v > 0 ? Math.max(2, (v / max) * (H - 6)) : 0;
          return <rect key={i} x={i * bw + 1} y={H - bh} width={Math.max(1, bw - 2)} height={bh} rx={1.5} className="anom-act-bar" />;
        })}
      </svg>
      <div className="anom-heat-foot">
        <span>earlier</span>
        <span className="anom-heat-read">samples beyond model band · peak {max}</span>
        <span>now</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Measured history vs limits                                         */
/* ------------------------------------------------------------------ */

const DV = { w: 320, h: 150, l: 46, r: 8, t: 10, b: 22 };

function HistoryChart({ series, severity }: { series: ForecastSeries | undefined; severity: Severity }) {
  const hist = series?.history ?? [];
  if (!series || hist.length < 2) {
    return <div className="anom-empty">No measured history for this sensor.</div>;
  }
  const limits = [series.warning, series.alarm].filter((v): v is number => v !== null && Number.isFinite(v));
  const lo0 = Math.min(...hist);
  const hi0 = Math.max(...hist);
  // Keep limits in frame only when they are near the data, so the trace stays readable.
  const near = limits.filter((l) => Math.abs(l - (lo0 + hi0) / 2) <= Math.max(hi0 - lo0, Math.abs(hi0) * 0.1) * 3);
  const lo = Math.min(lo0, ...near);
  const hi = Math.max(hi0, ...near);
  const pad = (hi - lo) * 0.1 || Math.abs(hi) * 0.02 || 1;
  const y0 = lo - pad;
  const y1 = hi + pad;
  const pw = DV.w - DV.l - DV.r;
  const ph = DV.h - DV.t - DV.b;
  const x = (i: number) => DV.l + (i / (hist.length - 1)) * pw;
  const y = (v: number) => DV.t + (1 - (v - y0) / (y1 - y0)) * ph;
  const line = hist.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const digits = Math.abs(hi) >= 100 ? 0 : Math.abs(hi) >= 10 ? 1 : 2;
  const last = hist[hist.length - 1];
  return (
    <svg
      viewBox={`0 0 ${DV.w} ${DV.h}`}
      className="anom-svg"
      role="img"
      aria-label={`${series.tag} measured history, ${hist.length} samples, latest ${last.toFixed(digits)} ${series.unit}`}
    >
      {series.warning !== null && near.includes(series.warning) && (
        <line x1={DV.l} x2={DV.w - DV.r} y1={y(series.warning)} y2={y(series.warning)} className="anom-thr warn" />
      )}
      {series.alarm !== null && near.includes(series.alarm) && (
        <line x1={DV.l} x2={DV.w - DV.r} y1={y(series.alarm)} y2={y(series.alarm)} className="anom-thr bad" />
      )}
      <path d={line} className="anom-trace" />
      <circle cx={x(hist.length - 1)} cy={y(last)} r={3.5} fill={TONE[severity]} />
      <text x={DV.l - 6} y={y(hi0) + 3.5} textAnchor="end" className="anom-axis">
        {hi0.toFixed(digits)}
      </text>
      {Math.abs(y(lo0) - y(hi0)) > 12 && (
        <text x={DV.l - 6} y={y(lo0) + 3.5} textAnchor="end" className="anom-axis">
          {lo0.toFixed(digits)}
        </text>
      )}
      <text x={DV.l} y={DV.h - 6} className="anom-axis">
        oldest
      </text>
      <text x={DV.w - DV.r} y={DV.h - 6} textAnchor="end" className="anom-axis">
        now
      </text>
      <text x={DV.l + 4} y={DV.t + 9} className="anom-axis">
        {series.unit}
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Module                                                             */
/* ------------------------------------------------------------------ */

export function AnomalyModule({ data, onBack }: AnomalyModuleProps) {
  const [sev, setSev] = useState<SeverityFilter>("all");
  // Acknowledgement is local to this view; it is not persisted.
  const [acked, setAcked] = useState<Record<string, true>>({});

  const allEvents = useMemo(() => toEvents(data.anomalies ?? []), [data.anomalies]);
  const [selectedId, setSelectedId] = useState<string | null>(() => allEvents[0]?.id ?? null);

  const visible = useMemo(() => (sev === "all" ? allEvents : allEvents.filter((e) => e.severity === sev)), [allEvents, sev]);

  const statusOf = (e: AnomalyEvent): EventStatus => (e.id in acked ? "Acknowledged" : "Open");

  const kpi = useMemo(() => {
    const timed = allEvents.filter((e) => e.ago !== null);
    const longest = timed.reduce<AnomalyEvent | null>((m, e) => (!m || (e.ago ?? 0) > (m.ago ?? 0) ? e : m), null);
    return {
      active: allEvents.length,
      critical: allEvents.filter((e) => e.severity === "Critical").length,
      open: allEvents.filter((e) => !(e.id in acked)).length,
      unknown: allEvents.filter((e) => e.unknownPattern).length,
      longest,
    };
  }, [allEvents, acked]);

  const sevItems = useMemo(() => {
    const c = allEvents.filter((e) => e.severity === "Critical").length;
    const a = allEvents.filter((e) => e.severity === "Advisory").length;
    return [
      { id: "all", label: `All ${allEvents.length}` },
      { id: "Critical", label: `Critical ${c}` },
      { id: "Advisory", label: `Advisory ${a}` },
    ];
  }, [allEvents]);

  const selected = allEvents.find((e) => e.id === selectedId) ?? null;

  const detail = useMemo(() => {
    if (!selected) return null;
    const byH = data.forecasts?.[selected.tag];
    const series = byH?.["24h"] ?? (byH ? Object.values(byH)[0] : undefined);
    // Co-located anomalies: same component / sub-assembly in the payload, weighted by their own score.
    const loc = data.locations?.[selected.tag];
    const sameGroup = (a: AnomalyItem) => {
      if (a.tag === selected.tag) return true;
      if (a.component && a.component === selected.component) return true;
      const la = data.locations?.[a.tag];
      return !!(loc && la && loc.subassemblyId && la.subassemblyId === loc.subassemblyId);
    };
    const peers = (data.anomalies ?? []).filter(sameGroup).sort((a, b) => b.score - a.score).slice(0, 5);
    const sum = peers.reduce((s, p) => s + p.score, 0) || 1;
    return {
      series,
      location: loc?.subassembly || selected.component,
      contributors: peers.map((p) => ({ tag: p.tag, severity: p.severity, pct: (p.score / sum) * 100 })),
    };
  }, [selected, data.forecasts, data.anomalies, data.locations]);

  const acknowledge = (e: AnomalyEvent) => setAcked((prev) => ({ ...prev, [e.id]: true }));

  const tableRows = useMemo(() => [...visible].sort((a, b) => b.score - a.score), [visible]);

  const kpis = [
    {
      key: "novel",
      label: "No known pattern",
      value: String(kpi.unknown),
      unit: "",
      meta: `of ${kpi.active} deviating sensors`,
    },
    {
      key: "mtta",
      label: "Longest open",
      value: kpi.longest?.ago != null ? fmtDuration(kpi.longest.ago) : "—",
      unit: "",
      meta: `${kpi.longest ? kpi.longest.tag : kpi.active ? "Onset not recorded" : "None open"} · ${kpi.open} unacknowledged`,
    },
  ];

  return (
    <div className="anom-root">
      <header className="anom-head">
        <div className="anom-head-left">
          {onBack && (
            <button type="button" className="anom-back" onClick={onBack} aria-label="Back to assets">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          )}
          <h2 className="anom-title">Anomalies</h2>
          <span className={`dx-chip ${kpi.critical ? "bad" : kpi.active ? "warn" : "good"}`}>
            <span className="dx-dot" />
            {kpi.active} active
          </span>
        </div>
        <PillNav items={sevItems} activeId={sev} onChange={(id) => setSev(id as SeverityFilter)} className="anom-pills" />
      </header>

      <section className="anom-kpis" aria-label="Anomaly summary">
        {kpis.map((k) => (
          <div key={k.key} className="anom-card anom-kpi">
            <div className="anom-kpi-top">
              <span className="anom-kpi-icon">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {KPI_ICONS[k.key]}
                </svg>
              </span>
              <span className="anom-kpi-label">{k.label}</span>
            </div>
            <div className="anom-kpi-value">
              {k.value}
              {k.unit && <span className="anom-unit">{k.unit}</span>}
            </div>
            <div className="anom-kpi-meta">{k.meta}</div>
          </div>
        ))}
      </section>

      <div className={`anom-main${selected ? " has-panel" : ""}`}>
        <section className="anom-card anom-viz-card" aria-label="Anomaly scores">
          <div className="anom-card-head">
            <h3 className="anom-h3">Current scores</h3>
            <div className="anom-legend" aria-hidden="true">
              <span><i className="anom-key bad" />Critical ≥ {CRITICAL.toFixed(2)}</span>
              <span><i className="anom-key warn" />Alert ≥ {ALERT.toFixed(2)}</span>
            </div>
          </div>
          <div className="anom-viz">
            <ScoreRanking events={visible} selectedId={selectedId} onSelect={setSelectedId} />
            <div className="anom-viz-side">
              <h4 className="anom-h4">Activity</h4>
              <Activity values={data.anomalyTimeline ?? []} />
            </div>
          </div>
        </section>

        {selected && detail && (
          <aside className="anom-card anom-panel" aria-label={`${selected.tag} detail`}>
            <div className="anom-panel-head">
              <div className="anom-panel-id">
                <span className="anom-panel-tag">{selected.tag}</span>
                <span className="anom-panel-name">{selected.name}</span>
              </div>
              <button type="button" className="anom-close" onClick={() => setSelectedId(null)} aria-label="Close detail">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <div className="anom-panel-chips">
              <StatusChip status={selected.severity} />
              {selected.unknownPattern && <span className="dx-chip">No known pattern</span>}
              <span className="dx-chip">{statusOf(selected)}</span>
            </div>

            <dl className="anom-stats">
              <div><dt>Score</dt><dd>{selected.score.toFixed(2)}</dd></div>
              <div><dt>Deviation</dt><dd>{selected.deviation || "—"}</dd></div>
              <div><dt>Onset</dt><dd>{onsetText(selected)}</dd></div>
              <div><dt>Location</dt><dd>{detail.location || "—"}</dd></div>
            </dl>

            <div className="anom-panel-sec">
              <h4 className="anom-h4">Measured history vs limits</h4>
              <HistoryChart series={detail.series} severity={selected.severity} />
            </div>

            <div className="anom-panel-sec">
              <h4 className="anom-h4">Anomalies on the same component</h4>
              <ul className="anom-contrib">
                {detail.contributors.map((c) => (
                  <li key={c.tag}>
                    <span className="anom-contrib-tag">{c.tag}</span>
                    <TickMeter value={c.pct} max={100} ticks={20} color={TONE[c.severity]} />
                    <span className="anom-contrib-val">{c.pct.toFixed(0)} %</span>
                  </li>
                ))}
              </ul>
            </div>

            {statusOf(selected) === "Open" && (
              <PillButton variant="secondary" className="anom-panel-ack" onClick={() => acknowledge(selected)}>
                Acknowledge
              </PillButton>
            )}
          </aside>
        )}
      </div>

      <section className="anom-card anom-table-card" aria-label="Anomalies">
        <div className="anom-card-head">
          <h3 className="anom-h3">Deviating sensors</h3>
          <span className="anom-count">{tableRows.length}</span>
        </div>
        <div className="anom-table-wrap">
          <table className="anom-table">
            <thead>
              <tr>
                <th scope="col">Onset</th>
                <th scope="col">Sensor</th>
                <th scope="col" className="num">Score</th>
                <th scope="col">Deviation</th>
                <th scope="col">Status</th>
                <th scope="col" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {tableRows.map((e) => {
                const status = statusOf(e);
                const sevCls = e.severity === "Critical" ? "bad" : "warn";
                return (
                  <tr
                    key={e.id}
                    tabIndex={0}
                    aria-selected={e.id === selectedId}
                    className={e.id === selectedId ? "selected" : undefined}
                    onClick={() => setSelectedId(e.id)}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter" || ev.key === " ") {
                        ev.preventDefault();
                        setSelectedId(e.id);
                      }
                    }}
                  >
                    <td className="muted">{onsetText(e)}</td>
                    <td>
                      <div className="anom-sensor">
                        <span className={`anom-badge ${sevCls}`}>
                          <WaveIcon />
                        </span>
                        <span className="anom-sensor-txt">
                          <span className="anom-sensor-tag">{e.tag}</span>
                          <span className="anom-sensor-sub">{e.component}</span>
                        </span>
                      </div>
                    </td>
                    <td className="num">
                      <span className="anom-score">
                        <i className={`anom-key ${sevCls}`} aria-hidden="true" />
                        {e.score.toFixed(2)}
                      </span>
                    </td>
                    <td className="muted">{e.deviation || "—"}</td>
                    <td>
                      <span className={`anom-status ${status.toLowerCase()}`}>{status}</span>
                    </td>
                    <td className="anom-act">
                      {status === "Open" && (
                        <PillButton
                          variant="secondary"
                          className="anom-ack"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            acknowledge(e);
                          }}
                          aria-label={`Acknowledge ${e.tag}`}
                        >
                          Acknowledge
                        </PillButton>
                      )}
                    </td>
                  </tr>
                );
              })}
              {tableRows.length === 0 && (
                <tr className="anom-empty-row">
                  <td colSpan={6}>No sensor is deviating from its model.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
