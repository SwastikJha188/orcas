"use client";

import React, { useMemo, useState } from "react";
import { TONE } from "./insights-ui";
import { PillNav } from "@/components/ui";
import type {
  FailureRisk,
  ForecastSeries,
  InsightsResponse,
  RulItem,
  Severity,
} from "@/server/services/insights-service";
import "./prognosis/overview.css";

type PrognosisData = InsightsResponse["prognosis"];

export type PrognosisPage = "overview" | "forecast" | "relationships" | "condition" | "risk" | "rul" | "anomalies";

/* ------------------------------------------------------------------ */
/* Derivation helpers                                                 */
/* ------------------------------------------------------------------ */

const SEVERITY_RANK: Record<Severity, number> = { Normal: 0, Advisory: 1, Critical: 2 };

function worst(list: Severity[]): Severity {
  return list.reduce<Severity>((acc, s) => (SEVERITY_RANK[s] > SEVERITY_RANK[acc] ? s : acc), "Normal");
}

function healthStatus(pct: number): Severity {
  return pct >= 85 ? "Normal" : pct >= 70 ? "Advisory" : "Critical";
}

/** Parse a risk window such as "< 72 h" / "< 30 d" into hours. */
function windowHours(window: string): number | null {
  const m = /([\d.]+)\s*(mo|h|d|w)/i.exec(window);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  const factor = unit === "h" ? 1 : unit === "d" ? 24 : unit === "w" ? 168 : 720;
  return n * factor;
}

/** Hours rendered as h below 72 h, otherwise d. */
function duration(hours: number): { value: string; unit: string } {
  if (hours < 72) return { value: Math.round(hours).toLocaleString(), unit: "h" };
  return { value: Math.round(hours / 24).toLocaleString(), unit: "d" };
}

function durationText(hours: number): string {
  const d = duration(hours);
  return `${d.value} ${d.unit}`;
}

/* ------------------------------------------------------------------ */
/* Primitives                                                         */
/* ------------------------------------------------------------------ */

type IconName = "forecast" | "relationships" | "condition" | "risk" | "rul" | "anomalies";

function ModuleIcon({ name }: { name: IconName }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "forecast":
      return (
        <svg {...common}>
          <path d="M1.5 11.5 L5 8 L8 9.5 L10.5 6" />
          <path d="M10.5 6 L14.5 3.5" strokeDasharray="1.6 1.6" />
          <path d="M1.5 14.5 H14.5" />
        </svg>
      );
    case "relationships":
      return (
        <svg {...common}>
          <circle cx="4" cy="4" r="2" />
          <circle cx="12" cy="5" r="2" />
          <circle cx="7" cy="12" r="2" />
          <path d="M5.8 4.3 L10 4.8 M5 5.8 L6.3 10.1 M10.9 6.7 L8.3 10.4" />
        </svg>
      );
    case "condition":
      return (
        <svg {...common}>
          <path d="M1.5 3.5 C5 4 8 6 14.5 12.5" />
          <path d="M1.5 1.5 V14.5 H14.5" />
        </svg>
      );
    case "risk":
      return (
        <svg {...common}>
          <path d="M8 1.8 L14.6 13.6 H1.4 Z" />
          <path d="M8 6.2 V9.4" />
          <path d="M8 11.6 V11.7" />
        </svg>
      );
    case "rul":
      return (
        <svg {...common}>
          <circle cx="8" cy="8.5" r="6" />
          <path d="M8 5 V8.5 L10.4 10" />
          <path d="M6.5 1.5 H9.5" />
        </svg>
      );
    case "anomalies":
      return (
        <svg {...common}>
          <path d="M1.5 9 H4.5 L6 4 L8.5 13 L10 7.5 H14.5" />
        </svg>
      );
  }
}

function StatusMark({ status }: { status: Severity }) {
  return (
    <span className="pgo-status">
      <span className="pgo-status-dot" style={{ background: TONE[status] }} aria-hidden="true" />
      {status}
    </span>
  );
}

function Chevron() {
  return (
    <svg className="pgo-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M4.5 2.5 L8 6 L4.5 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Mini visuals (module cards)                                        */
/* ------------------------------------------------------------------ */

const VW = 200;
const VH = 56;

type Pt = [number, number];

function toPath(pts: Pt[]): string {
  return pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
}

function EndDot({ xPct, yPct, color }: { xPct: number; yPct: number; color: string }) {
  return <span className="pgo-enddot" style={{ left: `${xPct}%`, top: `${yPct}%`, background: color }} aria-hidden="true" />;
}

function MiniCondition({ points }: { points: PrognosisData["condition"]["points"] }) {
  if (points.length < 2) return <div className="pgo-viz pgo-viz--empty" />;
  const maxDay = points[points.length - 1].day || 1;
  const lo = Math.min(60, ...points.map((p) => p.overall));
  const hi = 100;
  const y = (v: number) => VH - 4 - ((v - lo) / (hi - lo)) * (VH - 8);
  const x = (d: number) => (d / maxDay) * VW;
  const d = toPath(points.map((p): Pt => [x(p.day), y(p.overall)]));
  const last = points[points.length - 1];
  const tone = TONE[healthStatus(last.overall)];
  return (
    <div
      className="pgo-viz"
      role="img"
      aria-label={`Overall health ${points[0].overall.toFixed(1)} % now, ${last.overall.toFixed(1)} % at ${last.day} d`}
    >
      <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" className="pgo-svg" aria-hidden="true">
        {[85, 70].filter((t) => t > lo).map((t) => (
          <line key={t} x1="0" x2={VW} y1={y(t)} y2={y(t)} className="pgo-grid" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={`${d} L ${VW} ${VH} L 0 ${VH} Z`} fill={tone} fillOpacity="0.1" />
        <path d={d} fill="none" stroke={tone} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <EndDot xPct={100} yPct={(y(last.overall) / VH) * 100} color={tone} />
    </div>
  );
}

/** Overall health at `day`, interpolated between projection points. */
function healthAt(points: PrognosisData["condition"]["points"], day: number): number {
  if (!points.length) return 100;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    if (day <= p1.day) {
      const f = (day - p0.day) / (p1.day - p0.day || 1);
      return p0.overall + f * (p1.overall - p0.overall);
    }
  }
  return points[points.length - 1].overall;
}

/** Projection cut at `day`, ending exactly on it. */
function pointsUntil(points: PrognosisData["condition"]["points"], day: number): PrognosisData["condition"]["points"] {
  const inside = points.filter((p) => p.day < day);
  const last = points.find((p) => p.day === day);
  return [...inside, last ?? { ...points[points.length - 1], day, overall: healthAt(points, day) }];
}

/** "24h" → "24 h". */
const horizonText = (id: string) => id.replace(/^(\d+)([a-z]+)$/i, "$1 $2");

/** Items as labelled rows (name · bar · value), so every bar says what it is. */
function LabelRows({
  rows,
  label,
  empty,
}: {
  rows: { id: string; name: string; fill: number; text: string; status: Severity }[];
  label: string;
  empty: string;
}) {
  if (rows.length === 0) return <div className="pgo-viz pgo-rows-empty">{empty}</div>;
  return (
    <div className={`pgo-viz pgo-rows${rows.length > 3 ? " pgo-rows--all" : ""}`} role="img" aria-label={label}>
      {rows.map((r) => (
        <span key={r.id} className="pgo-row">
          <span className="pgo-row-name" title={r.name}>{r.name}</span>
          <span className="pgo-bar-track">
            <span className="pgo-bar" style={{ width: `${Math.max(2, Math.min(100, r.fill))}%`, background: TONE[r.status] }} />
          </span>
          <span className="pgo-row-val">{r.text}</span>
        </span>
      ))}
    </div>
  );
}

/** Horizons the Failure risk and Remaining life cards can be read over. */
const RISK_HORIZONS = [
  { id: "7d", label: "7 d", hours: 168 },
  { id: "30d", label: "30 d", hours: 720 },
  { id: "90d", label: "90 d", hours: 2160 },
  { id: "180d", label: "180 d", hours: 4320 },
];
const CONDITION_RANGES = [
  { id: "7d", label: "7 d", days: 7 },
  { id: "30d", label: "30 d", days: 30 },
  { id: "90d", label: "90 d", days: 90 },
  { id: "180d", label: "180 d", days: 180 },
];
const LIFE_HORIZONS = [
  { id: "30d", label: "30 d", hours: 720 },
  { id: "90d", label: "90 d", hours: 2160 },
  { id: "180d", label: "180 d", hours: 4320 },
  { id: "1y", label: "1 y", hours: 8760 },
];

function MiniColumns({ values, tone, label, floor = 1 }: { values: number[]; tone: string; label: string; floor?: number }) {
  // `floor`: the smallest full-scale value, so a few stray counts never draw full-height bars.
  const max = Math.max(floor, ...values);
  return (
    <div className="pgo-viz pgo-viz--cols" role="img" aria-label={label}>
      {values.map((v, i) => (
        <span key={i} className="pgo-col-slot">
          <span
            className="pgo-col"
            style={{ height: v > 0 ? `${Math.max(8, (v / max) * 100)}%` : "2px", background: v > 0 ? tone : undefined }}
          />
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Horizon rail                                                       */
/* ------------------------------------------------------------------ */

interface RailEvent {
  key: string;
  hours: number;
  status: Severity;
  lines: string[];
}

const RAIL_TICKS: { h: number; label: string }[] = [
  { h: 1, label: "1 h" },
  { h: 24, label: "24 h" },
  { h: 168, label: "7 d" },
  { h: 720, label: "30 d" },
  { h: 2160, label: "90 d" },
  { h: 4320, label: "180 d" },
  { h: 8760, label: "1 y" },
];

function groupEvents(items: { hours: number; status: Severity; line: string }[]): RailEvent[] {
  const map = new Map<number, RailEvent>();
  for (const it of items) {
    const k = Math.round(it.hours);
    const ex = map.get(k);
    if (ex) {
      ex.lines.push(it.line);
      ex.status = worst([ex.status, it.status]);
    } else {
      map.set(k, { key: String(k), hours: it.hours, status: it.status, lines: [it.line] });
    }
  }
  return [...map.values()].sort((a, b) => a.hours - b.hours);
}

function HorizonRail({
  risks,
  rul,
  crossing,
}: {
  risks: FailureRisk[];
  rul: RulItem[];
  crossing: { hours: number; label: string } | null;
}) {
  const [hover, setHover] = useState<{ lane: number; ev: RailEvent } | null>(null);

  const lanes = useMemo(() => {
    const riskEvents = groupEvents(
      risks.flatMap((r) => {
        const h = windowHours(r.window);
        return h === null ? [] : [{ hours: h, status: r.severity, line: `${r.fault} · ${Math.round(r.probability)} %` }];
      })
    );
    const rulEvents = groupEvents(
      rul.map((r) => ({ hours: r.hours, status: r.status, line: `${r.name} · ${durationText(r.hours)}` }))
    );
    const out: { label: string; events: RailEvent[] }[] = [
      { label: "Failure risk", events: riskEvents },
      { label: "End of life", events: rulEvents },
    ];
    if (crossing) {
      out.push({
        label: "Health",
        events: [{ key: "x", hours: crossing.hours, status: "Advisory", lines: [crossing.label] }],
      });
    }
    return out;
  }, [risks, rul, crossing]);

  const maxEvent = Math.max(4320, ...lanes.flatMap((l) => l.events.map((e) => e.hours)));
  const maxH = maxEvent * 1.25;
  const pos = (h: number) => (Math.log10(Math.max(1, h)) / Math.log10(maxH)) * 100;
  const ticks = RAIL_TICKS.filter((t) => t.h <= maxH);

  const summary = lanes
    .map((l) => `${l.label}: ${l.events.length ? l.events.map((e) => durationText(e.hours)).join(", ") : "none"}`)
    .join("; ");

  return (
    <section className="pgo-rail" aria-labelledby="pgo-rail-title">
      <header className="pgo-rail-head">
        <h3 id="pgo-rail-title" className="pgo-rail-title">Predicted events</h3>
        <span className="pgo-rail-scale">log time · from now</span>
      </header>
      <div className="pgo-rail-body" role="img" aria-label={`Predicted event horizon. ${summary}`}>
        {lanes.map((lane, li) => (
          <div key={lane.label} className="pgo-lane">
            <span className="pgo-lane-label">{lane.label}</span>
            <div className="pgo-lane-track">
              {ticks.map((t) => (
                <span key={t.h} className="pgo-lane-grid" style={{ left: `${pos(t.h)}%` }} />
              ))}
              {lane.events.map((ev) => (
                <span
                  key={ev.key}
                  className="pgo-event"
                  style={{ left: `${pos(ev.hours)}%`, background: TONE[ev.status] }}
                  onMouseEnter={() => setHover({ lane: li, ev })}
                  onMouseLeave={() => setHover(null)}
                >
                  {ev.lines.length > 1 && <span className="pgo-event-count">{ev.lines.length}</span>}
                </span>
              ))}
              {hover && hover.lane === li && (
                <span
                  className={`pgo-tip${pos(hover.ev.hours) > 70 ? " pgo-tip--left" : ""}`}
                  style={{ left: `${pos(hover.ev.hours)}%` }}
                >
                  <strong>{durationText(hover.ev.hours)}</strong>
                  {hover.ev.lines.map((line, i) => (
                    <span key={i}>{line}</span>
                  ))}
                </span>
              )}
            </div>
          </div>
        ))}
        <div className="pgo-lane pgo-lane--axis" aria-hidden="true">
          <span className="pgo-lane-label" />
          <div className="pgo-axis">
            {ticks.map((t) => (
              <span key={t.h} className="pgo-axis-tick" style={{ left: `${pos(t.h)}%` }}>
                {t.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Overview                                                           */
/* ------------------------------------------------------------------ */

interface ModuleTile {
  id: Exclude<PrognosisPage, "overview">;
  icon: IconName;
  title: string;
  status: Severity | null;
  value: string;
  unit: string;
  context: string;
  visual: React.ReactNode;
  /** Optional control (e.g. a timeframe) shown in the card head; clicks on it do not open the module. */
  control?: React.ReactNode;
  /** Optional machine / component switch shown beside the figure. */
  scope?: { mode: Scope; onToggle: () => void };
}

type Scope = "machine" | "component";

export function PrognosisOverview({
  data,
  onOpen,
}: {
  data: PrognosisData;
  onOpen: (page: PrognosisPage) => void;
  onBack?: () => void;
}) {
  const [riskH, setRiskH] = useState("30d");
  const [lifeH, setLifeH] = useState("180d");
  const [riskScope, setRiskScope] = useState<Scope>("machine");
  const [lifeScope, setLifeScope] = useState<Scope>("machine");
  const [condH, setCondH] = useState("180d");
  const [fcH, setFcH] = useState("24h");
  const [fcView, setFcView] = useState("cards");
  const fcHorizons = data.horizons.length ? data.horizons : [{ id: "24h", label: "24H", hours: 24, steps: 24 }];
  const fcHorizon = fcHorizons.find((h) => h.id === fcH) ?? fcHorizons[0];
  // Every forecast sensor (all numeric DB sensors), not only the heat-map set.
  const series = Object.keys(data.forecasts)
    .map((t) => data.forecasts[t]?.[fcHorizon.id])
    .filter((s): s is ForecastSeries => Boolean(s));

  // Every DB sensor has a location; the ones without a forecast are on/off signals.
  const totalSensors = Math.max(series.length, Object.keys(data.locations ?? {}).length);
  const noTrend = totalSensors - series.length;
  const coverage = noTrend > 0 ? `${series.length} of ${totalSensors} sensors forecast · ${noTrend} on/off signals have no trend` : `all ${totalSensors} sensors forecast`;
  const points = data.condition.points;
  const condRange = CONDITION_RANGES.find((r) => r.id === condH) ?? CONDITION_RANGES[3];
  const condPoints = points.length ? pointsUntil(points, condRange.days) : points;
  const projected = healthAt(points, condRange.days);

  // First horizon where overall health crosses below the 85 % advisory line
  let crossing: { hours: number; label: string } | null = null;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    if (p0.overall >= 85 && p1.overall < 85) {
      const f = (p0.overall - 85) / (p0.overall - p1.overall || 1);
      const day = p0.day + f * (p1.day - p0.day);
      crossing = { hours: Math.max(1, day * 24), label: `Overall health < 85 % · ${durationText(day * 24)}` };
      break;
    }
  }

  // A mode below this chance is background risk, not something to act on.
  const RISK_FLOOR = 20;

  // Chance of failure within the chosen horizon. Each mode's probability holds
  // over its own window; a constant hazard spreads it over time:
  // P(T) = 1 − (1 − p)^(T / window). Modes without a window use 30 d.
  const riskHorizon = RISK_HORIZONS.find((h) => h.id === riskH) ?? RISK_HORIZONS[1];
  const riskIn = data.risks
    .map((r) => {
      const p = Math.min(0.99, Math.max(0, r.probability / 100));
      const w = windowHours(r.window) ?? 720;
      return { r, p: (1 - Math.pow(1 - p, riskHorizon.hours / w)) * 100 };
    })
    .sort((a, b) => b.p - a.p);
  const riskTop = riskIn[0] ?? null;
  // Machine level: the machine fails if any mode fails, P = 1 − Π(1 − pᵢ).
  const machineRisk = riskIn.length ? (1 - riskIn.reduce((acc, { p }) => acc * (1 - p / 100), 1)) * 100 : null;
  const machineRiskStatus: Severity =
    machineRisk !== null && machineRisk >= RISK_FLOOR
      ? worst(riskIn.filter(({ p }) => p >= RISK_FLOOR).map(({ r }) => r.severity).concat(riskTop ? [riskTop.r.severity] : []))
      : "Normal";
  const pctText = (p: number) => `${p < 10 ? p.toFixed(1) : Math.round(p)} %`;
  // Component level: every sub-assembly, combining the modes that touch it.
  const riskByComponent = [
    ...riskIn
      .reduce((map, { r, p }) => {
        for (const name of r.component.split(", ")) {
          const ex = map.get(name);
          const sev = p >= RISK_FLOOR ? r.severity : "Normal";
          map.set(name, ex ? { name, q: ex.q * (1 - p / 100), status: worst([ex.status, sev]) } : { name, q: 1 - p / 100, status: sev });
        }
        return map;
      }, new Map<string, { name: string; q: number; status: Severity }>())
      .values(),
  ]
    .map((c) => ({ name: c.name, p: (1 - c.q) * 100, status: c.status }))
    .sort((a, b) => b.p - a.p);
  const lifeHorizon = LIFE_HORIZONS.find((h) => h.id === lifeH) ?? LIFE_HORIZONS[2];
  const dueIn = data.rul.filter((r) => r.hours <= lifeHorizon.hours);
  // The machine runs until its first component needs work.
  const minRul = data.rul.reduce<RulItem | null>((m, r) => (m === null || r.hours < m.hours ? r : m), null);
  const criticalAnoms = data.anomalies.filter((a) => a.severity === "Critical").length;
  const anomalyStatus: Severity = criticalAnoms > 0 ? "Critical" : data.anomalies.length > 0 ? "Advisory" : "Normal";


  const modules: ModuleTile[] = [
    {
      id: "condition",
      icon: "condition",
      title: "Future condition",
      status: healthStatus(projected),
      value: projected.toFixed(1),
      unit: "%",
      context:
        crossing && crossing.hours <= condRange.days * 24
          ? `Projected overall health in ${condRange.label} · ${crossing.label}`
          : `Projected overall health in ${condRange.label} · stays above 85 %`,
      control: (
        <PillNav className="pgo-tf" items={CONDITION_RANGES.map((r) => ({ id: r.id, label: r.label }))} activeId={condH} onChange={setCondH} />
      ),
      visual: <MiniCondition points={condPoints} />,
    },
    {
      id: "risk",
      icon: "risk",
      title: "Failure risk",
      status: riskScope === "machine" ? machineRiskStatus : riskByComponent[0]?.status ?? "Normal",
      value:
        riskScope === "machine"
          ? String(Math.round(machineRisk ?? 0))
          : String(Math.round(riskByComponent[0]?.p ?? 0)),
      unit: "%",
      context: !riskByComponent.length
        ? `No failure mode scored`
        : riskScope === "machine"
          ? `Chance the machine fails within ${riskHorizon.label} · ${riskIn.length} failure modes · most likely: ${riskByComponent[0].name}`
          : `Chance of failure within ${riskHorizon.label} · ${riskByComponent.length} components · most likely: ${riskByComponent[0].name}`,
      scope: { mode: riskScope, onToggle: () => setRiskScope((s) => (s === "machine" ? "component" : "machine")) },
      control: (
        <PillNav className="pgo-tf" items={RISK_HORIZONS.map((h) => ({ id: h.id, label: h.label }))} activeId={riskH} onChange={setRiskH} />
      ),
      visual: (
        <LabelRows
          rows={
            riskScope === "machine"
              ? machineRisk === null
                ? []
                : [{ id: "machine", name: "Entire machine", fill: machineRisk, text: pctText(machineRisk), status: machineRiskStatus }]
              : riskByComponent.map((c) => ({ id: c.name, name: c.name, fill: c.p, text: pctText(c.p), status: c.status }))
          }
          label={
            riskScope === "machine"
              ? `Chance the machine fails within ${riskHorizon.label}`
              : `Components by chance of failure within ${riskHorizon.label}`
          }
          empty="No failure mode scored"
        />
      ),
    },
    {
      id: "rul",
      icon: "rul",
      title: "Remaining life",
      status: dueIn.length ? worst(dueIn.map((r) => r.status)) : data.rul.length ? "Normal" : null,
      value: lifeScope === "machine" ? (minRul ? durationText(minRul.hours) : "—") : String(dueIn.length),
      unit: lifeScope === "machine" ? "" : dueIn.length === 1 ? "component" : "components",
      context: !minRul
        ? "No components ranked"
        : lifeScope === "machine"
          ? `Machine life until first work · limited by ${minRul.name} · ${dueIn.length} due within ${lifeHorizon.label}`
          : `Projected to need work within ${lifeHorizon.label} · of ${data.rul.length} components · shortest: ${minRul.name} ${durationText(minRul.hours)}`,
      scope: { mode: lifeScope, onToggle: () => setLifeScope((s) => (s === "machine" ? "component" : "machine")) },
      control: (
        <PillNav className="pgo-tf" items={LIFE_HORIZONS.map((h) => ({ id: h.id, label: h.label }))} activeId={lifeH} onChange={setLifeH} />
      ),
      visual: (
        <LabelRows
          rows={(lifeScope === "machine" ? (minRul ? [{ ...minRul, id: "machine", name: "Entire machine" }] : []) : data.rul).map((r) => ({
            id: r.id,
            name: r.name,
            // Bar = life left as a share of the chosen horizon; full = lasts beyond it.
            fill: Math.min(1, r.hours / lifeHorizon.hours) * 100,
            text: durationText(r.hours),
            status: r.hours <= lifeHorizon.hours ? r.status : "Normal",
          }))}
          label={
            lifeScope === "machine"
              ? `Machine remaining life against a ${lifeHorizon.label} horizon`
              : `Projected remaining life of every component against a ${lifeHorizon.label} horizon`
          }
          empty="No components ranked"
        />
      ),
    },
    {
      id: "anomalies",
      icon: "anomalies",
      title: "Anomalies",
      status: anomalyStatus,
      value: String(data.anomalies.length),
      unit: data.anomalies.length === 1 ? "signal" : "signals",
      context: `Off-model now · ${criticalAnoms} critical${data.anomalyTimeline.length ? " · bars: last 6 h" : ""}`,
      visual: <MiniColumns values={data.anomalyTimeline} floor={30} tone={TONE[anomalyStatus]} label="Signal-minutes sustained beyond 3σ from the reference model, in 15-minute buckets over the last 6 h" />,
    },
  ];

  return (
    <div className="pgo-page">
      <section className="pgo-modules" aria-label="Prognosis modules">
        {modules.map((m) => (
          <article key={m.id} className="pgo-module">
            <span className="pgo-module-top">
              <span className="pgo-icon">
                <ModuleIcon name={m.icon} />
              </span>
              {m.control && <span className="pgo-module-control">{m.control}</span>}
              <span className="pgo-module-meta">
                {m.status && <StatusMark status={m.status} />}
                <Chevron />
              </span>
            </span>
            {m.visual}
            <span className="pgo-module-figure-row">
              <span className="pgo-module-figure">
                <span className="pgo-module-value">
                  {m.value}
                  {m.unit && <span className="pgo-unit">{m.unit}</span>}
                </span>
                <span className="pgo-module-context">{m.context}</span>
              </span>
              {m.scope && (
                <button
                  type="button"
                  className="btn-pill btn-pill-secondary pgo-scope"
                  onClick={m.scope.onToggle}
                  aria-pressed={m.scope.mode === "component"}
                >
                  {m.scope.mode === "machine" ? "Component wise" : "Entire machine"}
                </button>
              )}
            </span>
            {/* Stretched over the card: the whole card opens the module; the control sits above it. */}
            <button
              type="button"
              className="pgo-module-title pgo-module-open"
              onClick={() => onOpen(m.id)}
              aria-label={`Open ${m.title}: ${m.value}${m.unit ? ` ${m.unit}` : ""}, ${m.context}`}
            >
              {m.title}
            </button>
          </article>
        ))}
      </section>

      {series.length > 0 && (
        <section className="pgo-sensors" aria-labelledby="pgo-sensors-title">
          <header className="pgo-sensors-head">
            <h2 id="pgo-sensors-title" className="pgo-rail-title">
              Sensor forecast · {horizonText(fcHorizon.id)} <span className="pgo-rail-sub">· {coverage}</span>
            </h2>
            <span className="pgo-sensors-controls">
              <PillNav className="pgo-tf" items={fcHorizons.map((h) => ({ id: h.id, label: horizonText(h.id) }))} activeId={fcHorizon.id} onChange={setFcH} />
              <PillNav
                className="pgo-tf"
                items={[
                  { id: "table", label: "Table" },
                  { id: "cards", label: "Cards" },
                ]}
                activeId={fcView}
                onChange={setFcView}
              />
            </span>
          </header>
          {fcView === "table" ? (
            <table className="pgo-table">
              <thead>
                <tr>
                  <th scope="col">Sensor</th>
                  <th scope="col" className="pgo-num">Now</th>
                  <th scope="col" className="pgo-num">Predicted in {horizonText(fcHorizon.id)}</th>
                  <th scope="col" className="pgo-num">Change</th>
                  <th scope="col" className="pgo-num">Confidence</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {series.map((s) => (
                  <tr key={s.tag}>
                    <td>
                      <span className="pgo-tag">{s.tag}</span>
                      <span className="pgo-tag-name">{s.name}</span>
                    </td>
                    <td className="pgo-num">
                      {s.current.toFixed(1)}
                      <span className="pgo-unit">{s.unit}</span>
                    </td>
                    <td className="pgo-num">
                      {s.predicted.toFixed(1)}
                      <span className="pgo-unit">{s.unit}</span>
                    </td>
                    <td className="pgo-num">
                      {s.deltaPct > 0 ? "+" : ""}
                      {s.deltaPct.toFixed(1)} %
                    </td>
                    <td className="pgo-num">{s.confidence.toFixed(0)} %</td>
                    <td>
                      <StatusMark status={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <ul className="pgo-fc-grid">
              {series.map((s) => (
                <li key={s.tag} className="pgo-fc-tile">
                  <span className="pgo-fc-top">
                    <span className="pgo-tag">{s.tag}</span>
                    <StatusMark status={s.status} />
                  </span>
                  <span className="pgo-fc-name">{s.name}</span>
                  <span className="pgo-fc-values">
                    <span>
                      <span className="pgo-fc-label">Now</span>
                      <span className="pgo-fc-value">
                        {s.current.toFixed(1)}
                        <span className="pgo-unit">{s.unit}</span>
                      </span>
                    </span>
                    <span>
                      <span className="pgo-fc-label">In {horizonText(fcHorizon.id)}</span>
                      <span className="pgo-fc-value">
                        {s.predicted.toFixed(1)}
                        <span className="pgo-unit">{s.unit}</span>
                      </span>
                    </span>
                  </span>
                  <span className="pgo-fc-foot">
                    {s.deltaPct > 0 ? "+" : ""}
                    {s.deltaPct.toFixed(1)} % change · {s.confidence.toFixed(0)} % confidence
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <HorizonRail risks={data.risks} rul={data.rul} crossing={crossing} />
    </div>
  );
}
