"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { PillButton, PillNav } from "@/components/ui";
import type { ForecastHorizon, ForecastSeries, InsightsResponse, Severity } from "@/server/services/insights-service";
import "./forecast-module.css";

export type PrognosisData = InsightsResponse["prognosis"];

export interface ForecastModuleProps {
  data: PrognosisData;
  onBack?: () => void;
}

/* ------------------------------------------------------------------ */
/* Formatting + helpers                                               */
/* ------------------------------------------------------------------ */

const DEFAULT_HORIZON = "24h";

const TONE: Record<Severity, string> = {
  Critical: "var(--status-danger)",
  Advisory: "var(--status-warning)",
  Normal: "var(--status-success)",
};
const TONE_CLASS: Record<Severity, string> = { Critical: "bad", Advisory: "warn", Normal: "good" };

function decimals(v: number): number {
  return Math.abs(v) >= 10 ? 1 : 2;
}
function num(v: number, d = decimals(v)): string {
  return v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function signed(v: number, d = decimals(v)): string {
  return `${v >= 0 ? "+" : "−"}${num(Math.abs(v), d)}`;
}
function withUnit(v: number, unit: string, d?: number): string {
  return unit ? `${num(v, d)} ${unit}` : num(v, d);
}
function duration(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${num(hours, 1)} h`;
  return `${num(hours / 24, 1)} d`;
}
function relTime(t: number, spanHours: number): string {
  if (Math.abs(t) < 1e-9) return "Now";
  const sign = t > 0 ? "+" : "−";
  const a = Math.abs(t);
  if (spanHours >= 72) return `${sign}${num(a / 24, a / 24 < 10 && a % 24 !== 0 ? 1 : 0)} d`;
  if (a < 1) return `${sign}${Math.round(a * 60)} min`;
  return `${sign}${num(a, a % 1 === 0 ? 0 : 1)} h`;
}

function niceTicks(min: number, max: number, count = 5) {
  const raw = (max - min || Math.abs(max) || 1) / (count - 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.max(Math.ceil(max / step) * step, lo + step);
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step * 1e-6; v += step) ticks.push(Number(v.toFixed(10)));
  const d = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;
  return { lo, hi, ticks, d };
}

/** A limit is "high" when it sits above the warning (or, without a warning, above the current value). */
function isHighLimit(s: ForecastSeries, limit: number): boolean {
  return s.warning !== null && s.alarm !== null && s.warning !== s.alarm ? s.alarm > s.warning : limit >= s.current;
}

/** Hours until the forecast crosses the alarm. 0 = already beyond, null = no alarm or no crossing. */
function timeToTrip(s: ForecastSeries, hours: number): number | null {
  if (s.alarm === null) return null;
  const alarm = s.alarm;
  const high = isHighLimit(s, alarm);
  const beyond = (v: number) => (high ? v >= alarm : v <= alarm);
  if (beyond(s.current)) return 0;
  const n = s.forecast.length;
  let prevT = 0;
  let prevV = s.current;
  for (let j = 0; j < n; j++) {
    const t = (hours * (j + 1)) / n;
    const v = s.forecast[j];
    if (beyond(v)) {
      const f = (alarm - prevV) / (v - prevV || 1);
      return prevT + f * (t - prevT);
    }
    prevT = t;
    prevV = v;
  }
  return null;
}

type Kind = "vibration" | "temperature" | "pressure" | "current" | "flow" | "speed" | "generic";

function kindOf(s: ForecastSeries): Kind {
  const u = s.unit.toLowerCase();
  const t = s.tag.toUpperCase();
  if (t.startsWith("VIB") || u === "mm/s" || u === "g" || u === "µm") return "vibration";
  if (t.startsWith("TMP") || u.includes("°")) return "temperature";
  if (t.startsWith("PRS") || u === "bar" || u === "kpa" || u === "psi") return "pressure";
  if (u === "rpm") return "speed";
  if (u === "a" || t.startsWith("ELE")) return "current";
  if (u.includes("/h") || t.startsWith("FLO")) return "flow";
  return "generic";
}

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                        */
/* ------------------------------------------------------------------ */

function Chip({ status, children }: { status: Severity; children?: React.ReactNode }) {
  return (
    <span className={`fcm-chip ${TONE_CLASS[status]}`}>
      <span className="fcm-chip-dot" aria-hidden="true" />
      {children ?? status}
    </span>
  );
}

const ICON_PATHS: Record<Kind, React.ReactNode> = {
  flow: <path d="M12 3.5l5 5a7 7 0 1 1-10 0z" />,
  current: <path d="M13 2.5L4.5 13.5H12l-1 8 8.5-11H12z" />,
  vibration: <path d="M2 12h3.5l2.5-7 4 14 3-9 1.5 2H22" />,
  pressure: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 13l4-4" />
    </>
  ),
  temperature: <path d="M14 14.76V4.5a2 2 0 0 0-4 0v10.26a4.5 4.5 0 1 0 4 0z" />,
  speed: (
    <>
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 4v4h-4" />
    </>
  ),
  generic: <path d="M3 17l5-6 4 3 5-7 4 4" />,
};

function SensorBadge({ kind, status }: { kind: Kind; status: Severity }) {
  return (
    <span className={`fcm-badge ${TONE_CLASS[status]}`} aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {ICON_PATHS[kind]}
      </svg>
    </span>
  );
}

/** Linear position gauge: current marker, predicted tick, warning/trip zones (only for limits that exist). */
function RangeGauge({ s }: { s: ForecastSeries }) {
  const limits = [s.warning, s.alarm].filter((v): v is number => v !== null);
  const vals = [s.current, s.predicted, ...limits];
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = (max - min) * 0.12 || Math.abs(max) * 0.1 || 1;
  const lo = min - pad;
  const hi = max + pad;
  const pct = (v: number) => ((v - lo) / (hi - lo)) * 100;
  const zone = (from: number, high: boolean) =>
    high ? { left: `${pct(from)}%`, width: `${100 - pct(from)}%` } : { left: "0%", width: `${pct(from)}%` };
  return (
    <span className="fcm-gauge" aria-hidden="true">
      {s.warning !== null && <i className="fcm-gauge-zone warn" style={zone(s.warning, isHighLimit(s, s.warning))} />}
      {s.alarm !== null && <i className="fcm-gauge-zone bad" style={zone(s.alarm, isHighLimit(s, s.alarm))} />}
      <i className="fcm-gauge-exp" style={{ left: `${pct(s.predicted)}%` }} />
      <i className="fcm-gauge-act" style={{ left: `${pct(s.current)}%` }} />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Point model shared by chart + sparkline                            */
/* ------------------------------------------------------------------ */

interface Pt {
  /** 0..1 horizontal position */
  f: number;
  kind: "hist" | "now" | "fore";
  v: number;
  lo: number;
  hi: number;
  /** hours from now (forecast only) */
  t: number;
}

const HIST_FRAC = 0.4;

function buildPoints(s: ForecastSeries, hours: number): Pt[] {
  const pts: Pt[] = [];
  const hn = s.history.length;
  s.history.forEach((v, k) => pts.push({ f: (k / Math.max(1, hn)) * HIST_FRAC, kind: "hist", v, lo: v, hi: v, t: NaN }));
  pts.push({ f: HIST_FRAC, kind: "now", v: s.current, lo: s.current, hi: s.current, t: 0 });
  const fn = s.forecast.length;
  s.forecast.forEach((v, j) =>
    pts.push({
      f: HIST_FRAC + ((j + 1) / fn) * (1 - HIST_FRAC),
      kind: "fore",
      v,
      lo: s.lower[j] ?? v,
      hi: s.upper[j] ?? v,
      t: (hours * (j + 1)) / fn,
    })
  );
  return pts;
}

function MiniTrend({ s, hours }: { s: ForecastSeries; hours: number }) {
  const W = 112;
  const H = 28;
  const pts = buildPoints(s, hours);
  const vals = pts.flatMap((p) => [p.v, p.lo, p.hi]);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const x = (p: Pt) => (p.f * W).toFixed(1);
  const y = (v: number) => (H - 2 - ((v - lo) / (hi - lo || 1)) * (H - 4)).toFixed(1);
  const nowI = pts.findIndex((p) => p.kind === "now");
  const line = (arr: Pt[]) => arr.map((p, i) => `${i ? "L" : "M"}${x(p)} ${y(p.v)}`).join(" ");
  const fore = pts.slice(nowI);
  const band = `${fore.map((p, i) => `${i ? "L" : "M"}${x(p)} ${y(p.hi)}`).join(" ")} ${[...fore]
    .reverse()
    .map((p) => `L${x(p)} ${y(p.lo)}`)
    .join(" ")} Z`;
  return (
    <svg className="fcm-mini" viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
      <path d={band} className="fcm-band" />
      <path d={line(fore)} className="fcm-line-exp" strokeWidth="1.2" />
      <path d={line(pts.slice(0, nowI + 1))} className="fcm-line-act" strokeWidth="1.5" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Primary chart                                                      */
/* ------------------------------------------------------------------ */

const CH = 300;
const PAD = { t: 26, r: 100, b: 30, l: 52 };

function BehaviourChart({ s, horizon }: { s: ForecastSeries; horizon: ForecastHorizon }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(880);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(360, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const g = useMemo(() => {
    const pts = buildPoints(s, horizon.hours);
    const nowI = pts.findIndex((p) => p.kind === "now");
    const plotW = width - PAD.l - PAD.r;
    const plotH = CH - PAD.t - PAD.b;
    const x = (f: number) => PAD.l + f * plotW;
    // Data-led y domain (min span 10 % of the current value); limits join it only when near the data.
    const core = pts.flatMap((p) => [p.v, p.lo, p.hi]);
    let cMin = Math.min(...core);
    let cMax = Math.max(...core);
    const minSpan = Math.abs(s.current) * 0.1 || 1;
    if (cMax - cMin < minSpan) {
      const mid = (cMax + cMin) / 2;
      cMin = mid - minSpan / 2;
      cMax = mid + minSpan / 2;
    }
    const reach = (cMax - cMin) * 1.5;
    const defs = [
      { key: "warn" as const, label: "Warn", value: s.warning },
      { key: "bad" as const, label: "Trip", value: s.alarm },
    ].filter((l): l is { key: "warn" | "bad"; label: string; value: number } => l.value !== null);
    const inView = (v: number) => v >= cMin - reach && v <= cMax + reach;
    const vals = [cMin, cMax, ...defs.filter((l) => inView(l.value)).map((l) => l.value)];
    const vMin = Math.min(...vals);
    const vMax = Math.max(...vals);
    const vPad = (vMax - vMin) * 0.06;
    const yt = niceTicks(vMin - vPad, vMax + vPad);
    const y = (v: number) => PAD.t + (1 - (v - yt.lo) / (yt.hi - yt.lo)) * plotH;
    const xy = (p: Pt, v = p.v) => `${x(p.f).toFixed(1)} ${y(v).toFixed(1)}`;
    const path = (arr: Pt[]) => arr.map((p, i) => `${i ? "L" : "M"}${xy(p)}`).join(" ");
    const fore = pts.slice(nowI);
    const band = `${fore.map((p, i) => `${i ? "L" : "M"}${xy(p, p.hi)}`).join(" ")} ${[...fore]
      .reverse()
      .map((p) => `L${xy(p, p.lo)}`)
      .join(" ")} Z`;

    // Limit marks: in-view limits draw a line; off-scale limits get an arrowed label at the plot edge.
    const marks = defs.map((l) => {
      const visible = inView(l.value);
      const above = l.value > cMax;
      return { ...l, visible, lineY: visible ? y(l.value) : null, labelY: visible ? y(l.value) : above ? PAD.t + 4 : CH - PAD.b - 4, above };
    });
    marks.sort((a, b) => a.labelY - b.labelY);
    for (let i = 1; i < marks.length; i++) {
      if (marks[i].labelY - marks[i - 1].labelY < 13) marks[i].labelY = marks[i - 1].labelY + 13;
    }
    if (marks.length && marks[marks.length - 1].labelY > CH - PAD.b) {
      const shift = marks[marks.length - 1].labelY - (CH - PAD.b);
      marks.forEach((m) => (m.labelY -= shift));
    }
    const xTicks = [0.5, 1].map((k) => ({ f: HIST_FRAC + k * (1 - HIST_FRAC), t: horizon.hours * k }));
    return {
      pts, nowI, x, y, plotW, yt, band, xTicks,
      actD: path(pts.slice(0, nowI + 1)),
      expD: path(fore),
      nowX: x(HIST_FRAC),
      marks,
    };
  }, [width, s, horizon]);

  const pickIndex = (clientX: number, rect: DOMRect) => {
    const px = ((clientX - rect.left) / rect.width) * width;
    let best = 0;
    let bestD = Infinity;
    g.pts.forEach((p, i) => {
      const d = Math.abs(g.x(p.f) - px);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const step = e.key === "ArrowLeft" ? -1 : 1;
    setHover((h) => Math.max(0, Math.min(g.pts.length - 1, (h ?? g.nowI) + step)));
  };

  const hp = hover !== null ? g.pts[hover] : null;
  const hx = hp ? g.x(hp.f) : 0;
  const flip = hx > width * 0.62;
  const histCount = s.history.length;

  return (
    <div
      ref={wrapRef}
      className="fcm-chart"
      role="group"
      tabIndex={0}
      onKeyDown={onKey}
      onBlur={() => setHover(null)}
      aria-label={`${s.name}: now ${withUnit(s.current, s.unit)}, expected ${withUnit(s.predicted, s.unit)} at ${relTime(horizon.hours, horizon.hours)}. Use arrow keys to inspect points.`}
    >
      <svg
        width={width}
        height={CH}
        viewBox={`0 0 ${width} ${CH}`}
        role="img"
        aria-label={`${s.name} measured history and expected path to ${relTime(horizon.hours, horizon.hours)}`}
        onPointerMove={(e) => setHover(pickIndex(e.clientX, e.currentTarget.getBoundingClientRect()))}
        onPointerLeave={() => setHover(null)}
      >
        {g.yt.ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={PAD.l + g.plotW} y1={g.y(v)} y2={g.y(v)} className="fcm-grid" />
            <text x={PAD.l - 8} y={g.y(v) + 3.5} textAnchor="end" className="fcm-axis">
              {num(v, g.yt.d)}
            </text>
          </g>
        ))}
        <text x={PAD.l - 8} y={PAD.t - 12} textAnchor="end" className="fcm-axis fcm-axis-unit">
          {s.unit}
        </text>

        <text x={PAD.l} y={CH - 10} className="fcm-axis">
          History · {histCount} samples
        </text>
        {g.xTicks.map((tk) => (
          <text key={tk.f} x={g.x(tk.f)} y={CH - 10} textAnchor={tk.f >= 1 ? "end" : "middle"} className="fcm-axis">
            {relTime(tk.t, horizon.hours)}
          </text>
        ))}

        <path d={g.band} className="fcm-band" />

        {g.marks.map((m) => (
          <g key={m.key}>
            {m.lineY !== null && (
              <line x1={PAD.l} x2={PAD.l + g.plotW} y1={m.lineY} y2={m.lineY} className={`fcm-thr ${m.key}`} />
            )}
            <text x={PAD.l + g.plotW + 8} y={m.labelY + 3.5} className="fcm-axis">
              {m.label} {withUnit(m.value, s.unit)}
              {!m.visible && (m.above ? " \u2191" : " \u2193")}
            </text>
          </g>
        ))}

        <path d={g.expD} className="fcm-line-exp" strokeWidth="1.5" />
        <path d={g.actD} className="fcm-line-act" strokeWidth="2" />

        <line x1={g.nowX} x2={g.nowX} y1={PAD.t - 6} y2={CH - PAD.b} className="fcm-now" />
        <text x={g.nowX} y={PAD.t - 12} textAnchor="middle" className="fcm-axis fcm-axis-strong">
          Now
        </text>
        <circle cx={g.nowX} cy={g.y(s.current)} r="4" className="fcm-pt" />

        {hp && (
          <g pointerEvents="none">
            <line x1={hx} x2={hx} y1={PAD.t} y2={CH - PAD.b} className="fcm-cross" />
            <circle cx={hx} cy={g.y(hp.v)} r="3.5" className={`fcm-pt ${hp.kind === "fore" ? "exp" : ""}`} />
          </g>
        )}
      </svg>

      {hp && (
        <div
          className="fcm-tip"
          style={{ left: hx, top: PAD.t, transform: flip ? "translateX(calc(-100% - 12px))" : "translateX(12px)" }}
          role="status"
        >
          <span className="fcm-tip-time">
            {hp.kind === "hist" ? `Sample ${(hover ?? 0) + 1} of ${histCount}` : relTime(hp.t, horizon.hours)}
          </span>
          <span className="fcm-tip-row">
            <i className={`fcm-key ${hp.kind === "fore" ? "exp" : "act"}`} />
            {hp.kind === "fore" ? "Expected" : "Actual"} <b>{withUnit(hp.v, s.unit)}</b>
          </span>
          {hp.kind === "fore" && (
            <span className="fcm-tip-row">
              <i className="fcm-key band" />
              Band <b>{num(hp.lo)}–{withUnit(hp.hi, s.unit)}</b>
            </span>
          )}
          {hp.kind !== "now" && (
            <span className="fcm-tip-row">
              <i className="fcm-key none" />
              vs now <b>{signed(((hp.v - s.current) / (s.current || 1)) * 100, 1)}&thinsp;%</b>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Module                                                             */
/* ------------------------------------------------------------------ */

const KEY_TABS = 6;

export function ForecastModule({ data, onBack }: ForecastModuleProps) {
  const horizons = data?.horizons ?? [];
  const forecasts = useMemo(() => data?.forecasts ?? {}, [data]);
  const tags = useMemo(() => Object.keys(forecasts), [forecasts]);
  // Same total as the Sensors tab: every DB sensor has a location.
  const totalSensors = Math.max(tags.length, Object.keys(data?.locations ?? {}).length);

  const [tagState, setTag] = useState<string>("");
  const [horizonId, setHorizonId] = useState<string>(DEFAULT_HORIZON);

  const horizon = horizons.find((h) => h.id === horizonId) ?? horizons.find((h) => h.id === DEFAULT_HORIZON) ?? horizons[0];
  const rows = useMemo(
    () => (horizon ? tags.map((t) => forecasts[t]?.[horizon.id]).filter((x): x is ForecastSeries => Boolean(x)) : []),
    [tags, forecasts, horizon]
  );

  const titleBlock = (
    <>
      {onBack && (
        <PillButton
          variant="secondary"
          className="fcm-back"
          onClick={onBack}
          aria-label="Back to overview"
          title="Back to overview"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          }
        />
      )}
      <h2 className="fcm-title">Sensor behaviour</h2>
    </>
  );

  if (!horizon || rows.length === 0) {
    return (
      <div className="fcm-root">
        <header className="fcm-head">
          <div className="fcm-head-left">{titleBlock}</div>
        </header>
        <section className="fcm-card fcm-empty">No forecast series for this machine.</section>
      </div>
    );
  }

  const s = rows.find((x) => x.tag === tagState) ?? rows[0];
  // Quick tabs for the key sensors (listed first); every sensor is in the table below.
  const navRows = rows.slice(0, KEY_TABS).concat(rows.indexOf(s) >= KEY_TABS ? [s] : []);
  const ttt = timeToTrip(s, horizon.hours);
  const counts = rows.reduce(
    (acc, x) => ({ ...acc, [x.status]: acc[x.status] + 1 }),
    { Critical: 0, Advisory: 0, Normal: 0 } as Record<Severity, number>
  );
  const overall: Severity = counts.Critical ? "Critical" : counts.Advisory ? "Advisory" : "Normal";
  const worst = rows.reduce((a, b) => (Math.abs(b.deltaPct) > Math.abs(a.deltaPct) ? b : a));
  const speed = rows.find((x) => x.unit.toLowerCase() === "rpm");
  const devScale = Math.max(...rows.map((x) => Math.abs(x.deltaPct)), 0.1);
  const bandHalf = ((s.upper[s.upper.length - 1] ?? s.predicted) - (s.lower[s.lower.length - 1] ?? s.predicted)) / 2;
  const horizonEnd = relTime(horizon.hours, horizon.hours);
  const limitsText = [
    s.warning !== null ? `Warn ${withUnit(s.warning, s.unit)}` : null,
    s.alarm !== null ? `Trip ${withUnit(s.alarm, s.unit)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="fcm-root">
      {/* Tier 1 — header + KPI strip */}
      <header className="fcm-head">
        <div className="fcm-head-left">
          {titleBlock}
          <Chip status={overall}>
            {counts.Critical} critical · {counts.Advisory} advisory
          </Chip>
          <dl className="fcm-figs">
            {speed && (
              <div>
                <dt>Speed</dt>
                <dd>{withUnit(speed.current, speed.unit, 0)}</dd>
              </div>
            )}
            <div>
              <dt>Max change</dt>
              <dd>
                {signed(worst.deltaPct, 1)}&thinsp;% <span className="fcm-muted">{worst.tag}</span>
              </dd>
            </div>
          </dl>
        </div>
        <PillNav className="fcm-nav" items={navRows.map((x) => ({ id: x.tag, label: x.tag }))} activeId={s.tag} onChange={setTag} />
      </header>

      <section className="fcm-kpis" aria-label={`${s.name} key figures`}>
        <div className="fcm-kpi">
          <div className="fcm-kpi-top">
            <span className="fcm-kpi-label">Deviation</span>
            <Chip status={s.status} />
          </div>
          <span className="fcm-kpi-val">
            {signed(s.deltaPct, 1)}
            <small>%</small>
          </span>
          <span className="fcm-kpi-sub">
            Expected {num(s.predicted)}&thinsp;{s.unit} ±{withUnit(bandHalf, s.unit)} at {horizonEnd} · {s.trend}
          </span>
        </div>

        <div className="fcm-kpi">
          <span className="fcm-kpi-label">Actual</span>
          <span className="fcm-kpi-val">
            {num(s.current)}
            <small>{s.unit}</small>
          </span>
          {limitsText && <RangeGauge s={s} />}
          <span className="fcm-kpi-sub">{limitsText || "No limits configured"}</span>
        </div>

        <div className="fcm-kpi">
          <span className="fcm-kpi-label">Time to trip</span>
          <span className="fcm-kpi-val">{ttt === 0 ? "Exceeded" : ttt === null ? "—" : duration(ttt)}</span>
          <span className="fcm-kpi-sub">
            {s.alarm === null ? "No trip limit" : ttt === null ? `Not within ${horizon.label}` : `Trip ${withUnit(s.alarm, s.unit)}`}
          </span>
        </div>
      </section>

      {/* Tier 2 — measured vs expected */}
      <section className="fcm-card">
        <header className="fcm-card-head">
          <div className="fcm-card-title">
            <h3>{s.name}</h3>
            <span className="fcm-muted">{s.tag}</span>
          </div>
          <PillNav
            className="fcm-tools"
            items={horizons.map((h) => ({ id: h.id, label: h.label }))}
            activeId={horizon.id}
            onChange={setHorizonId}
          />
        </header>

        <ul className="fcm-legend" aria-label="Legend">
          <li><i className="fcm-key act" />Actual</li>
          <li><i className="fcm-key exp" />Expected</li>
          <li><i className="fcm-key band" />Confidence band</li>
          {s.warning !== null && <li><i className="fcm-key thr warn" />Warn</li>}
          {s.alarm !== null && <li><i className="fcm-key thr bad" />Trip</li>}
        </ul>

        <BehaviourChart s={s} horizon={horizon} />
      </section>

      {/* Tier 3 — all sensors */}
      <section className="fcm-card">
        <header className="fcm-card-head">
          <div className="fcm-card-title">
            <h3>Sensors</h3>
            <span className="fcm-muted">
              {rows.length}
              {totalSensors > rows.length ? ` of ${totalSensors} · ${totalSensors - rows.length} on/off signals have no trend` : ""}
            </span>
          </div>
        </header>
        <div className="fcm-table-wrap">
          <table className="fcm-table">
            <thead>
              <tr>
                <th>Sensor</th>
                <th>Trend</th>
                <th className="num">Actual</th>
                <th className="num">Expected {horizonEnd}</th>
                <th>Deviation</th>
                <th className="num">Confidence</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => {
                const active = x.tag === s.tag;
                const w = Math.min(50, (Math.abs(x.deltaPct) / devScale) * 50);
                return (
                  <tr
                    key={x.tag}
                    className={active ? "is-active" : undefined}
                    tabIndex={0}
                    aria-selected={active}
                    onClick={() => setTag(x.tag)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setTag(x.tag);
                      }
                    }}
                  >
                    <td>
                      <div className="fcm-sensor">
                        <SensorBadge kind={kindOf(x)} status={x.status} />
                        <div>
                          <span className="fcm-sensor-name">{x.name}</span>
                          <span className="fcm-muted">
                            {x.tag} · {x.trend}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <MiniTrend s={x} hours={horizon.hours} />
                    </td>
                    <td className="num strong">{withUnit(x.current, x.unit)}</td>
                    <td className="num">{withUnit(x.predicted, x.unit)}</td>
                    <td>
                      <div className="fcm-dev">
                        <span className="fcm-dev-bar" aria-hidden="true">
                          <i
                            style={{
                              left: x.deltaPct < 0 ? `${50 - w}%` : "50%",
                              width: `${w}%`,
                              background: TONE[x.status],
                            }}
                          />
                        </span>
                        <span className="fcm-dev-val">{signed(x.deltaPct, 1)}&thinsp;%</span>
                      </div>
                    </td>
                    <td className="num">{num(x.confidence, 1)}&thinsp;%</td>
                    <td>
                      <Chip status={x.status} />
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
