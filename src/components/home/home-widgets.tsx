"use client";

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { StatusTag } from "@/components/ui/status-tag";
import { PillButton, PillNav } from "@/components/ui";
import { healthTone, type Tone } from "@/components/assets/assets-shell-ui";
import { smoothPath } from "@/components/ui/sparkline";
import { HEALTH_STEP_MS, type HealthPoint } from "@/lib/health-recorder";
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

/* Feed motion (after the Gigaton "Recent actions" feed): a new entry opens its
   slot from zero height at the top, so the entries below glide down one place,
   while the card itself drops in from above and fades up; its status tint then
   settles over ENTER_MS. An entry that goes away closes its slot the same way. */
const ENTER_MS = 1600;
const LEAVE_MS = 420;
/** Entries arriving together open one after another, this far apart. */
const STAGGER_MS = 70;

type Phase = "enter" | "idle" | "leave";
type Shown<T> = { item: T; key: string; phase: Phase; delay: number };

/**
 * Entries with their motion phase. The first populated list draws still;
 * after that, new keys enter and removed keys linger LEAVE_MS while their
 * slot closes. Idempotent per render, so a discarded or doubled render is safe.
 */
function usePresence<T>(items: T[], keyOf: (item: T) => string): Shown<T>[] {
  const mem = useRef<{
    seeded: boolean;
    first: Map<string, number>;
    prev: Array<{ key: string; item: T }>;
    leaving: Map<string, { item: T; index: number; at: number }>;
  }>({ seeded: false, first: new Map(), prev: [], leaving: new Map() });
  const m = mem.current;
  const now = Date.now();
  const keys = items.map(keyOf);
  const present = new Set(keys);
  if (!m.seeded && items.length) {
    m.seeded = true;
    for (const k of keys) m.first.set(k, -Infinity);
  }
  for (const k of keys) {
    if (!m.first.has(k)) m.first.set(k, now);
    m.leaving.delete(k);
  }
  m.prev.forEach((p, index) => {
    if (!present.has(p.key) && !m.leaving.has(p.key)) m.leaving.set(p.key, { item: p.item, index, at: now });
  });
  for (const [k, l] of m.leaving) if (now - l.at > LEAVE_MS) m.leaving.delete(k);
  for (const k of [...m.first.keys()]) if (!present.has(k) && !m.leaving.has(k)) m.first.delete(k);
  m.prev = items.map((item, i) => ({ key: keys[i], item }));

  const batch = new Map<number, number>();
  const out: Shown<T>[] = items.map((item, i) => {
    const at = m.first.get(keys[i]) ?? -Infinity;
    if (now - at >= ENTER_MS) return { item, key: keys[i], phase: "idle", delay: 0 };
    const n = batch.get(at) ?? 0;
    batch.set(at, n + 1);
    return { item, key: keys[i], phase: "enter", delay: n * STAGGER_MS };
  });
  for (const [k, l] of [...m.leaving].sort((a, b) => a[1].index - b[1].index)) {
    out.splice(Math.min(l.index, out.length), 0, { item: l.item, key: k, phase: "leave", delay: 0 });
  }
  return out;
}

/** Slot attributes for an entry in its motion phase; a leaving entry is inert. */
function slotProps(phase: Phase, delay: number) {
  return {
    className: "ph-feed-slot",
    "data-phase": phase === "idle" ? undefined : phase,
    style: delay ? ({ "--enter-delay": `${delay}ms` } as React.CSSProperties) : undefined,
    ...(phase === "leave" ? { inert: true, "aria-hidden": true } : {}),
  };
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
  const shownAlerts = usePresence(alerts, (a) => a.id);
  const shownActivity = usePresence(activity, (e) => e.id);
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
          {shownAlerts.map(({ item: a, phase, delay }) => {
            const expanded = open === a.id && phase !== "leave";
            const tone: Tone = a.cleared ? "idle" : a.level === "danger" ? "bad" : "warn";
            return (
              <li key={a.id} {...slotProps(phase, delay)}>
                <div className="ph-alert" data-tone={tone} data-cleared={a.cleared ? "" : undefined}>
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
                </div>
              </li>
            );
          })}
          </ul>
          {shownActivity.length > 0 && (
            <>
              <h3 className="ph-feed-label">Recent activity</h3>
              <ul className="ph-feed">
                {shownActivity.map(({ item: e, phase, delay }) => (
                  <li key={e.id} {...slotProps(phase, delay)}>
                    <div className="ph-alert ph-activity" data-tone={e.tone}>
                      <div className="ph-alert-row">
                        <span className="ph-alert-top">
                          <span className="ph-alert-age ast-num">{e.clock}</span>
                          <span className="ph-alert-machine">{e.machine}</span>
                          <span className="ph-level">{e.tag}</span>
                        </span>
                        <span className="ph-alert-finding">{e.title}</span>
                        {e.detail && <span className="ph-alert-reading">{e.detail}</span>}
                      </div>
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

/** Most points drawn: longer windows average neighbouring buckets. */
const MAX_POINTS = 360;
/** A jump between recorded buckets larger than this is a gap (page closed or hidden). */
const GAP_MS = 3 * HEALTH_STEP_MS;

const clockOf = (ms: number, seconds = false) =>
  new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", ...(seconds ? { second: "2-digit" } : {}) });

/** Average runs of `k` buckets so the line keeps at most MAX_POINTS points; gaps stay gaps. */
function thin(points: HealthPoint[]): Array<{ t: number; v: number }> {
  const valid = points.filter((p): p is { t: number; v: number } => p.v !== null);
  const k = Math.ceil(valid.length / MAX_POINTS);
  if (k <= 1) return valid;
  const out: Array<{ t: number; v: number }> = [];
  for (let i = 0; i < valid.length; i += k) {
    const run = valid.slice(i, i + k);
    // Never average across a gap: cut the run where it breaks.
    const cut = run.findIndex((p, j) => j > 0 && p.t - run[j - 1].t > GAP_MS);
    const part = cut > 0 ? run.slice(0, cut) : run;
    out.push({ t: part[part.length - 1].t, v: part.reduce((n, p) => n + p.v, 0) / part.length });
    if (cut > 0) out.push(...run.slice(cut).map((p) => ({ t: p.t, v: p.v })));
  }
  return out;
}

export function HealthTrendCard({
  track,
  height,
}: {
  /** Recorded health on the real clock from `from` (epoch ms) to now (`@/lib/health-recorder`). */
  track: (from: number) => HealthPoint[];
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

  // The window is real time: 1 h means the last 60 minutes on the wall clock.
  const windowMs = Number(period) * 60_000;
  const now = Date.now();
  const from = now - windowMs;
  const points = thin(track(from));
  const spanLabel = formatSpan(Number(period));
  const first = points[0] ?? null;
  const latest = points.length ? points[points.length - 1].v : null;
  const delta = points.length >= 2 ? Math.round(points[points.length - 1].v - points[0].v) : null;
  const tone: Tone = latest === null ? "idle" : levelTone(latest);
  // The window reaches back before the recording started (page opened recently, or closed for a while).
  const partial = first !== null && first.t - from > GAP_MS;
  // The change is measured over what was recorded, not the whole window.
  const deltaSpan = partial && first ? formatSpan((points[points.length - 1].t - first.t) / 60_000) : spanLabel;

  const [ref, size] = useSize<HTMLDivElement>(320, height ?? 120);
  const gradId = useSvgId("ph-trend-area");
  const width = size.width;
  const h = height ?? Math.max(80, size.height);
  const padL = 30;
  const padR = 0;
  const padT = 6;
  const padB = 22;
  const plotH = h - padT - padB;
  const plotW = width - padL - padR;
  const y = (v: number) => padT + ((AXIS_HI - Math.max(AXIS_LO, Math.min(AXIS_HI, v))) / (AXIS_HI - AXIS_LO)) * plotH;
  const x = (t: number) => padL + Math.max(0, Math.min(1, (t - from) / windowMs)) * plotW;
  const pts = points.map((p) => ({ x: x(p.t), y: y(p.v) }));
  // One path per recorded stretch: a gap in the recording is a gap in the line.
  const segments: Array<Array<{ x: number; y: number }>> = [];
  points.forEach((p, i) => {
    if (i === 0 || p.t - points[i - 1].t > GAP_MS) segments.push([]);
    segments[segments.length - 1].push(pts[i]);
  });
  const lines = segments.map((seg) => (seg.length >= 2 ? smoothPath(seg) : `M ${seg[0].x} ${seg[0].y} l 0.01 0`));
  const areas = segments.map((seg, i) => (seg.length >= 2 ? `${lines[i]} L ${seg[seg.length - 1].x} ${padT + plotH} L ${seg[0].x} ${padT + plotH} Z` : ""));
  const [hover, setHover] = useState<number | null>(null);
  const hi = hover !== null && hover < points.length ? hover : null;
  const hp = hi !== null ? pts[hi] : null;

  return (
    <section className="ast-card ph-card ph-trend" aria-label="Health over time">
      <div className="ast-card-head ph-card-head">
        <div className="ph-head-text">
          <h2 className="ast-card-title">Health over time</h2>
          <span className="ph-sub">
            {partial && first ? `Condition score · last ${spanLabel} · recorded since ${clockOf(first.t)}` : `Condition score · last ${spanLabel}`}
          </span>
        </div>
        <div className="ph-head-stack">
          {delta !== null && (
            <span className="ph-move ast-num">
              <b data-tone={delta > 0 ? "good" : delta < 0 ? "bad" : undefined}>{delta === 0 ? "±0" : `${delta > 0 ? "+" : "−"}${Math.abs(delta)}`}</b>{" "}
              {delta === 0 ? `steady over ${deltaSpan}` : `over ${deltaSpan}`}
            </span>
          )}
          <PillNav items={PERIODS} activeId={period} onChange={choose} className="ph-head-nav" />
        </div>
      </div>
      <div ref={ref} className="ph-chart ph-chart-fill" style={height ? { height, flex: "none" } : undefined}>
        {points.length < 2 ? (
          <span className="ph-sub">Recording health on the plant clock — the trend draws after the first {HEALTH_STEP_MS / 1000} s.</span>
        ) : (
          <svg
            width={width}
            height={h}
            role="img"
            aria-label={`Plant health over the last ${spanLabel}, now ${Math.round(latest ?? 0)} of 100`}
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const px = ((e.clientX - r.left) / Math.max(1, r.width)) * width;
              // Nearest recorded point to the pointer.
              let best = 0;
              for (let i = 1; i < pts.length; i++) if (Math.abs(pts[i].x - px) < Math.abs(pts[best].x - px)) best = i;
              setHover(best);
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
            {areas.map((d, i) => d && <path key={`a${i}`} d={d} fill={`url(#${gradId})`} />)}
            {lines.map((d, i) => (
              <path key={`l${i}`} className="ph-line" data-tone={tone} d={d} />
            ))}
            <text className="ph-axis" x={padL} y={h - 4}>
              {spanLabel} ago
            </text>
            <text className="ph-axis" x={width - padR} y={h - 4} textAnchor="end">
              now
            </text>
            {hp && hi !== null && (
              <g>
                <line className="ph-cross" x1={hp.x} x2={hp.x} y1={padT} y2={padT + plotH} />
                <circle className="ph-dot" data-tone={tone} cx={hp.x} cy={hp.y} r={3.5} />
                <text className="ph-tip" x={Math.min(Math.max(hp.x, padL + 40), width - 50)} y={padT + 12} textAnchor="middle">
                  {points[hi].v.toFixed(1)} · {clockOf(points[hi].t, true)}
                </text>
              </g>
            )}
          </svg>
        )}
      </div>
    </section>
  );
}
