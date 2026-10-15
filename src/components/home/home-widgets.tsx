"use client";

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { StatusTag } from "@/components/ui/status-tag";
import { PillButton, PillNav } from "@/components/ui";
import { healthTone, type Tone } from "@/components/assets/assets-shell-ui";
import { smoothPath } from "@/components/ui/sparkline";
import type { Distribution } from "@/components/assets/hierarchy/hierarchy-model";
import { useKilnOps } from "@/providers/kiln-ops-context";
import { conditionTone, worstCondition, type Condition } from "@/components/ui/status";
import "@/components/assets/assets-shell.css";
import "./plant-home.css";

/* ==========================================================================
   Home widgets (ported from ULTRON plant/overview/*):
   PlantHealthGauge · AlertsFeed · HealthTrendCard
   ========================================================================== */

export const HEALTH_TARGET = 90;

/** Width and height of an element, tracked with a ResizeObserver. */
function useSize<T extends HTMLElement>(fallbackW = 320, fallbackH = 0) {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: fallbackW, height: fallbackH });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      // Layout px (offset*), not getBoundingClientRect: under the TV `body { zoom }` rects are zoomed.
      const next = { width: Math.max(80, el.offsetWidth), height: el.offsetHeight };
      setSize((cur) => (cur.width === next.width && cur.height === next.height ? cur : next));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

/** SVG-safe id for gradients defined inside one widget. */
function useSvgId(prefix: string) {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

/* ---------------------------------------------------------------- gauge */

/* ULTRON PlantHealthScoreCard: a 240° segmented panel meter, open at the
   bottom, lit up to the reading. Inner graduations every 10, the ends and
   midpoint labelled outside, a pointer at the target. */
const G_W = 256;
// Centre is 12px lower than ULTRON's so the "50" mark above the arc stays inside the viewBox.
const G_H = 178;
const G_CX = G_W / 2;
const G_CY = 114;
const G_R = 80;
const G_SWEEP = 240;
const G_START = 210;
const G_SEGMENTS = 48;

/** Rounded to 0.01: Node and the browser disagree in the last digits of
 *  sin/cos, which would otherwise fail hydration of the SSR'd gauge paths. */
const r2 = (v: number) => Math.round(v * 100) / 100;

/** A point at fraction `t` of the sweep (0 = left foot, 1 = right foot), at radius `r`. */
function gaugeAt(t: number, r: number) {
  const a = ((G_START - G_SWEEP * t) * Math.PI) / 180;
  return { x: r2(G_CX + r * Math.cos(a)), y: r2(G_CY - r * Math.sin(a)) };
}

function gaugeArc(from: number, to: number, r: number) {
  const a = gaugeAt(from, r);
  const b = gaugeAt(to, r);
  const large = (to - from) * G_SWEEP > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`;
}

/** Truthful condition summary for a distribution: the count of the worst condition ("1 critical", "2 advisory") or "Normal". */
export function conditionSummary(dist: Distribution): { tone: Tone; label: string } {
  const list: Condition[] = [];
  if (dist.critical > 0) list.push("Critical");
  if (dist.atRisk > 0) list.push("Advisory");
  if (dist.healthy > 0) list.push("Normal");
  if (dist.offline > 0) list.push("Standby");
  const worst = worstCondition(list);
  const tone = conditionTone(worst);
  if (worst === "Critical") return { tone, label: `${dist.critical} critical` };
  if (worst === "Advisory") return { tone, label: `${dist.atRisk} advisory` };
  return { tone, label: worst };
}

export function PlantHealthGauge({
  score,
  dist,
  title = "Plant health",
}: {
  score: number | null;
  dist: Distribution;
  /** Card title; the machine twin reuses the gauge as "Machine health". */
  title?: string;
}) {
  const value = Math.max(0, Math.min(100, score ?? 0));
  const tone: Tone = score === null ? "idle" : healthTone(value);
  const chip = conditionSummary(dist);
  const gap = 0.006;
  const t = HEALTH_TARGET / 100;
  const tip = gaugeAt(t, G_R + 9);
  const tl = gaugeAt(t - 0.018, G_R + 17);
  const tr = gaugeAt(t + 0.018, G_R + 17);

  return (
    <section className="ast-card ph-card ph-gauge" aria-label={title}>
      <div className="ast-card-head ph-card-head">
        <h2 className="ast-card-title">{title}</h2>
        <StatusTag tone={chip.tone} label={chip.label} />
      </div>
      <div className="ph-gauge-meter">
        <svg viewBox={`0 0 ${G_W} ${G_H}`} className="ph-gauge-svg" data-tone={tone} role="img" aria-label={`${title} ${score ?? "unknown"} of 100, target ${HEALTH_TARGET}`}>
          {Array.from({ length: G_SEGMENTS }, (_, i) => {
            const mid = ((i + 0.5) / G_SEGMENTS) * 100;
            return (
              <path
                key={i}
                className={score !== null && mid <= value ? "ph-seg on" : "ph-seg"}
                d={gaugeArc(i / G_SEGMENTS + gap, (i + 1) / G_SEGMENTS - gap, G_R)}
              />
            );
          })}
          {Array.from({ length: 11 }, (_, i) => {
            const a = gaugeAt(i / 10, G_R - 12);
            const b = gaugeAt(i / 10, G_R - (i % 5 === 0 ? 20 : 16));
            return <line key={`g${i}`} className={i % 5 === 0 ? "ph-grad major" : "ph-grad"} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
          })}
          <path className="ph-target" d={`M ${tip.x} ${tip.y} L ${tl.x} ${tl.y} L ${tr.x} ${tr.y} Z`} />
          {[0, 50, 100].map((mark) => {
            const p = gaugeAt(mark / 100, G_R + 24);
            return (
              <text key={mark} className="ph-gauge-tick" x={p.x} y={p.y + 3.5} textAnchor="middle">
                {mark}
              </text>
            );
          })}
        </svg>
        <div className="ph-gauge-read" style={{ top: `${((G_CY - 30) / G_H) * 100}%` }}>
          <span className="ph-gauge-value ast-num">
            {score ?? "—"}
            <span className="ph-gauge-of">/100</span>
          </span>
          <span className="ph-gauge-target ast-num">TARGET {HEALTH_TARGET}</span>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- alerts */

export interface HomeAlert {
  id: string;
  level: "danger" | "alert";
  machine: string;
  machineId: string;
  finding: string;
  reading: string;
  recommendation: string;
  /** Age text ("12 min ago") or null for stored conditions with no onset. */
  age: string | null;
  raised: string | null;
  cleared?: string | null;
  /** Simulated minute raised; sorts newest first. */
  t: number | null;
  /** Where a stored alert comes from (e.g. "operating_events · DCS log"); null for live rules. */
  origin?: string | null;
}

/** One entry of the live plant activity stream (rules raised and cleared, crew actions, signal quality). */
export interface HomeActivity {
  id: string;
  clock: string;
  /** Short machine label shown beside the time ("KLN-02"). */
  machine: string;
  machineId: string;
  tag: string;
  tone: Tone;
  title: string;
  detail: string;
}

export function AlertsFeed({
  alerts,
  activity = [],
  onOpen,
  loading = false,
  error = null,
}: {
  alerts: HomeAlert[];
  /** Live activity, newest first; keeps the card moving between alerts. */
  activity?: HomeActivity[];
  onOpen: (machineId: string) => void;
  /** Stored alert sources still loading. */
  loading?: boolean;
  /** Stored alert sources failed; shown instead of claiming "no alerts". */
  error?: string | null;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const ops = useKilnOps();
  const active = alerts.filter((a) => !a.cleared);
  const danger = active.filter((a) => a.level === "danger").length;
  return (
    <section className="ast-card ph-card ph-alerts" aria-label="Alerts">
      <div className="ast-card-head ph-card-head">
        <h2 className="ast-card-title">
          Alerts
          {activity.length > 0 && (
            <span className="ph-live" title="Live from the plant simulation">
              <i aria-hidden="true" />
              Live
            </span>
          )}
        </h2>
        <span className="ast-caption ast-num">
          {active.length} active · {danger} critical
        </span>
      </div>
      {error && (
        <div className="ast-empty" role="alert">
          <strong>Stored alerts unavailable. Retry.</strong>
        </div>
      )}
      {alerts.length === 0 && activity.length === 0 ? (
        error ? null : loading ? (
          <div className="ast-empty" role="status" aria-live="polite">
            <strong>Loading alerts…</strong>
          </div>
        ) : (
          <div className="ast-empty">
            <strong>No active alerts.</strong>
          </div>
        )
      ) : (
        <div className="ph-alert-list">
          {alerts.length === 0 && (
            <div className="ph-feed-quiet ast-caption">No active alerts.</div>
          )}
          <ul className="ph-feed">
          {alerts.map((a) => {
            const expanded = open === a.id;
            const tone: Tone = a.cleared ? "idle" : a.level === "danger" ? "bad" : "warn";
            return (
              <li key={a.id} className="ph-alert" data-tone={tone} data-cleared={a.cleared ? "" : undefined}>
                <button type="button" className="ph-alert-row" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : a.id)}>
                  <span className="ph-alert-top">
                    <span className="ph-alert-age ast-num">{a.age ?? "on record"}</span>
                    <span className="ph-alert-machine">{a.machine}</span>
                    <span className="ph-level">{a.cleared ? "CLEARED" : a.level === "danger" ? "CRITICAL" : "ADVISORY"}</span>
                  </span>
                  <span className="ph-alert-finding">{a.finding}</span>
                  <span className="ph-alert-reading ast-num">{a.reading}</span>
                </button>
                {expanded && (
                  <div className="ph-alert-more">
                    <p>{a.recommendation}</p>
                    <span className="ast-caption ast-num">
                      {a.raised ? `Raised ${a.raised}` : "On record"}
                      {a.origin ? ` · ${a.origin}` : ""}
                      {a.cleared ? ` · cleared ${a.cleared}` : ""} · {a.machineId}
                    </span>
                    <div className="ph-alert-actions">
                      {(() => {
                        // Live findings of the plant's primary machine (id "<machine>:<ruleId>") can be acted on.
                        const ruleId = !a.cleared && a.machineId === ops.machineId && a.id.split(":").length === 2 ? a.id.split(":")[1] : null;
                        const live = ruleId ? ops.alerts.find((x) => x.ruleId === ruleId) : null;
                        if (!live) return null;
                        return (
                          <>
                            {!live.acknowledged && (
                              <PillButton variant="secondary" onClick={() => void ops.acknowledge(live.ruleId)}>
                                Acknowledge
                              </PillButton>
                            )}
                            {live.workOrderId === null ? (
                              <PillButton variant="primary" onClick={() => void ops.createWorkOrder(live.ruleId)}>
                                Create work order
                              </PillButton>
                            ) : (
                              <span className="ast-caption ast-num">WO-{live.workOrderId} raised</span>
                            )}
                          </>
                        );
                      })()}
                      <PillButton variant="secondary" onClick={() => onOpen(a.machineId)}>
                        Open diagnosis
                      </PillButton>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
          </ul>
          {activity.length > 0 && (
            <>
              <h3 className="ph-feed-label">Recent activity</h3>
              <ul className="ph-feed">
                {activity.map((e) => (
                  <li key={e.id} className="ph-alert ph-activity" data-tone={e.tone}>
                    <div className="ph-alert-row">
                      <span className="ph-alert-top">
                        <span className="ph-alert-age ast-num">{e.clock}</span>
                        <span className="ph-alert-machine">{e.machine}</span>
                        <span className="ph-level">{e.tag}</span>
                      </span>
                      <span className="ph-alert-finding">{e.title}</span>
                      {e.detail && <span className="ph-alert-reading">{e.detail}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- trend */

/* ULTRON PlantTrendCard: the same card as the machine's health history — a
   spline on a fixed 40–100 axis over dashed gridlines, the score's own bands
   behind it (danger < 55, alert 55–60), coloured by the level it sits in. */
const PERIODS = [
  { id: "60", label: "1h", minutes: 60 },
  { id: "180", label: "3h", minutes: 180 },
  { id: "360", label: "6h", minutes: 360 },
];
const PERIOD_KEY = "ultron.plant_trend.period";
const AXIS_LO = 40;
const AXIS_HI = 100;
const DANGER_BELOW = 55;
const ALERT_BELOW = 60;

function levelTone(v: number): Tone {
  return v < DANGER_BELOW ? "bad" : v < ALERT_BELOW ? "warn" : "good";
}

function formatSpan(minutes: number) {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`;
  const h = minutes / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)} h`;
}

export function HealthTrendCard({
  series,
  labels,
  height,
}: {
  /** One sample a minute, oldest first. */
  series: number[];
  labels: string[];
  /** Fixed plot height in px; without it the plot fills the card. */
  height?: number;
}) {
  const [period, setPeriod] = useState("360");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PERIOD_KEY);
      if (saved && PERIODS.some((p) => p.id === saved)) setPeriod(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);
  const choose = (id: string) => {
    setPeriod(id);
    try {
      localStorage.setItem(PERIOD_KEY, id);
    } catch {
      /* storage unavailable */
    }
  };

  const n = Number(period);
  const values = series.slice(-n);
  const times = labels.slice(-n);
  const spanMin = Math.max(0, values.length - 1);
  const spanLabel = formatSpan(spanMin);
  const delta = values.length >= 2 ? Math.round(values[values.length - 1] - values[0]) : null;
  const latest = values.length ? values[values.length - 1] : null;
  const tone: Tone = latest === null ? "idle" : levelTone(latest);

  const [ref, size] = useSize<HTMLDivElement>(320, height ?? 120);
  const gradId = useSvgId("ph-trend-area");
  const width = size.width;
  const h = height ?? Math.max(80, size.height);
  const padL = 30;
  const padR = 0;
  const padT = 6;
  const padB = 22;
  const plotH = h - padT - padB;
  const y = (v: number) => padT + ((AXIS_HI - Math.max(AXIS_LO, Math.min(AXIS_HI, v))) / (AXIS_HI - AXIS_LO)) * plotH;
  const x = (i: number) => padL + (i / Math.max(1, values.length - 1)) * (width - padL - padR);
  const pts = values.map((v, i) => ({ x: x(i), y: y(v) }));
  const line = pts.length >= 2 ? smoothPath(pts) : "";
  const area = line ? `${line} L ${pts[pts.length - 1].x} ${padT + plotH} L ${pts[0].x} ${padT + plotH} Z` : "";
  const [hover, setHover] = useState<number | null>(null);
  const hp = hover !== null ? pts[hover] : null;

  return (
    <section className="ast-card ph-card ph-trend" aria-label="Health over time">
      <div className="ast-card-head ph-card-head">
        <div className="ph-head-text">
          <h2 className="ast-card-title">Health over time</h2>
          <span className="ph-sub">{spanMin > 0 ? `Condition score · last ${spanLabel}` : "Condition score"}</span>
        </div>
        <div className="ph-head-stack">
          {delta !== null && (
            <span className="ph-move ast-num">
              <b data-tone={delta > 0 ? "good" : delta < 0 ? "bad" : undefined}>{delta === 0 ? "±0" : `${delta > 0 ? "+" : "−"}${Math.abs(delta)}`}</b>{" "}
              {delta === 0 ? `steady over ${spanLabel}` : `over ${spanLabel}`}
            </span>
          )}
          <PillNav items={PERIODS} activeId={period} onChange={choose} className="ph-head-nav" />
        </div>
      </div>
      <div ref={ref} className="ph-chart ph-chart-fill" style={height ? { height, flex: "none" } : undefined}>
        {values.length < 2 ? (
          <span className="ph-sub">Collecting samples — the trend draws once there are two.</span>
        ) : (
          <svg
            width={width}
            height={h}
            role="img"
            aria-label={`Plant health over the last ${spanLabel}, now ${Math.round(latest ?? 0)} of 100`}
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const rel = (e.clientX - r.left - padL) / Math.max(1, r.width - padL - padR);
              setHover(Math.max(0, Math.min(values.length - 1, Math.round(rel * (values.length - 1)))));
            }}
            onMouseLeave={() => setHover(null)}
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1" data-tone={tone}>
                <stop offset="0" className="ph-stop" stopOpacity={0.35} />
                <stop offset="1" className="ph-stop" stopOpacity={0} />
              </linearGradient>
            </defs>
            <rect className="ph-band" data-tone="bad" x={padL} width={width - padL - padR} y={y(DANGER_BELOW)} height={y(AXIS_LO) - y(DANGER_BELOW)} />
            <rect className="ph-band" data-tone="warn" x={padL} width={width - padL - padR} y={y(ALERT_BELOW)} height={y(DANGER_BELOW) - y(ALERT_BELOW)} />
            {[40, 60, 80, 100].map((v) => (
              <g key={v}>
                <line className="ph-grid dashed" x1={padL} x2={width - padR} y1={y(v)} y2={y(v)} />
                <text className="ph-axis" x={0} y={y(v) + 3}>
                  {v}
                </text>
              </g>
            ))}
            <path d={area} fill={`url(#${gradId})`} />
            <path className="ph-line" data-tone={tone} d={line} />
            <text className="ph-axis" x={padL} y={h - 4}>
              {spanLabel} ago
            </text>
            <text className="ph-axis" x={width - padR} y={h - 4} textAnchor="end">
              now
            </text>
            {hp && hover !== null && (
              <g>
                <line className="ph-cross" x1={hp.x} x2={hp.x} y1={padT} y2={padT + plotH} />
                <circle className="ph-dot" data-tone={tone} cx={hp.x} cy={hp.y} r={3.5} />
                <text className="ph-tip" x={Math.min(Math.max(hp.x, padL + 40), width - 50)} y={padT + 12} textAnchor="middle">
                  {values[hover].toFixed(1)} · {times[hover]}
                </text>
              </g>
            )}
          </svg>
        )}
      </div>
    </section>
  );
}
