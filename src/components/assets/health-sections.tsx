"use client";

/**
 * Machine › Health · sections. One card per section, heading inside the card,
 * tables flush. Monochrome by default: status colour only on items that are
 * actually in Advisory / Critical.
 */

import React, { useMemo, useState } from "react";
import { PillNav } from "@/components/ui";
import { formatDuration, simTimeMs, type SimFrame } from "@/lib/kiln-sim/engine";
import type { Severity } from "@/lib/kiln-sim/signals";
import { formatLocalTime } from "@/lib/time";
import { useIndustrialData } from "@/providers/industrial-data-context";
import type { AssetsSubPage } from "./assets-view";
import type { Tone } from "./assets-shell-ui";
import { focusSensorOn } from "./sensor-focus";
import { PYRO_DEMO_LIMIT } from "./sensors-model";
import { conditionTone, validityTone, type Condition } from "@/components/ui/status";
import {
  BAND_ADVISORY,
  BAND_CRITICAL,
  HEALTH_SECTIONS,
  bandOf,
  trendEvents,
  signed,
  type Contribution,
  type HealthModel,
  type IndicatorRow,
  type SubNode,
  type SystemNode,
} from "./health-derive";

export interface HealthSectionProps {
  model: HealthModel;
  frame: SimFrame | null;
  /** Machine score from liveMachineStatus (the one machine-health source). */
  score: number;
  /** Machine condition from liveMachineStatus via toCondition (the header's word). */
  condition: Condition;
  timeZone?: string;
  go: (sub: AssetsSubPage) => void;
  /** Δ per sub-assembly / system over the page-open window (kiln only). */
  subDelta: Record<string, number>;
  windowMin: number;
}

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

/** Tone only when not healthy — a healthy page stays grey. */
export const alarmTone = (s: Severity | string): Tone | undefined => (s === "Critical" ? "bad" : s === "Advisory" ? "warn" : undefined);
export const scoreTone = (v: number | null): Tone | undefined => (v === null ? undefined : alarmTone(bandOf(v) === "Healthy" ? "Normal" : bandOf(v)));

/** A signal's severity against its limits as a limit-state word (Normal / Warning / Alarm). */
const limitWord = (s: Severity | string): "Normal" | "Warning" | "Alarm" => (s === "Critical" ? "Alarm" : s === "Advisory" ? "Warning" : "Normal");

/** Limit state: dot + word, ink text; dot coloured only in Warning / Alarm. */
function LimitText({ status }: { status: Severity | string }) {
  const tone = alarmTone(status);
  return (
    <span className="pg-health-status" data-tone={tone}>
      {tone && <span className="ast-chip-dot" aria-hidden="true" />}
      {limitWord(status)}
    </span>
  );
}

/** One card per section: heading (1–3 words) + optional controls, body flush. */
export function HSection({
  id,
  title,
  note,
  right,
  flush = false,
  children,
}: {
  id: string;
  title: string;
  /** Short muted label next to the heading (units, legend). */
  note?: React.ReactNode;
  right?: React.ReactNode;
  flush?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="ast-card pg-analysis-section pg-health-card" aria-labelledby={`${id}-t`}>
      <header className="pg-analysis-section-head pg-health-card-head">
        <h3 id={`${id}-t`} className="pg-analysis-section-title">
          {title}
        </h3>
        {note && <span className="pg-health-card-note">{note}</span>}
        {right && <div className="pg-health-card-right">{right}</div>}
      </header>
      <div className={`pg-analysis-section-body${flush ? " pg-health-flush" : ""}`}>{children}</div>
    </section>
  );
}

/** 0–100 bar with 60 / 85 ticks; grey unless the value is in a warning band. */
export function HealthBar({ value }: { value: number | null }) {
  if (value === null) return <span className="pg-health-bar" aria-hidden="true" />;
  return (
    <span className="pg-health-bar" data-tone={scoreTone(value)} role="img" aria-label={`${value} of 100, ${bandOf(value)}`}>
      <i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      <b style={{ left: `${BAND_CRITICAL}%` }} />
      <b style={{ left: `${BAND_ADVISORY}%` }} />
    </span>
  );
}

/** Status text: dot + colour only when not Normal. */
export function StatusText({ status }: { status: Severity | string }) {
  const tone = alarmTone(status);
  return (
    <span className="pg-health-status" data-tone={tone}>
      {tone && <span className="ast-chip-dot" aria-hidden="true" />}
      {status}
    </span>
  );
}

/** Monospace sensor tag that opens Trends focused on it. */
function TagLink({ tag, tone }: { tag: string; tone?: Tone }) {
  const { setActiveSubPage } = useIndustrialData();
  return (
    <button
      type="button"
      className="pg-health-tag"
      data-tone={tone}
      onClick={() => {
        focusSensorOn("trends", tag);
        setActiveSubPage("trends");
      }}
      title={`Trend ${tag}`}
    >
      {tone && <span className="ast-chip-dot" aria-hidden="true" />}
      {tag}
    </button>
  );
}

const sigmaText = (z: number | null) => (z === null ? "—" : `${signed(z, 1)}σ`);
const zTone = (z: number | null): Tone | undefined => (z === null ? undefined : Math.abs(z) >= 6 ? "bad" : Math.abs(z) >= 3 ? "warn" : undefined);

function fmtPts(v: number): string {
  return v >= 10 || Number.isInteger(v) ? String(Math.round(v)) : v.toFixed(1);
}

function Delta({ v }: { v: number | null | undefined }) {
  if (v === null || v === undefined) return <span className="ast-muted">—</span>;
  return (
    <span className="ast-num pg-health-delta" data-dir={v < 0 ? "down" : v > 0 ? "up" : "flat"}>
      {v === 0 ? "0" : signed(v)}
    </span>
  );
}

/* ================================================================== */
/* Breakdown — machine → system → sub-assembly in one table             */
/* ================================================================== */

type SortMode = "system" | "lowest";

export function HealthBreakdown(p: HealthSectionProps) {
  const { model } = p;
  const [sort, setSort] = useState<SortMode>("system");
  const live = model.basis === "live";
  const sysDelta = (sy: SystemNode): number | null => {
    if (!p.frame || !sy.scored) return null;
    const h = p.frame.healthHistory[sy.id as keyof SimFrame["healthHistory"]];
    const n = Math.min(h.length, Math.round(p.windowMin) + 1);
    return n > 1 ? h[h.length - 1] - h[h.length - n] : null;
  };
  const machineDelta = (() => {
    if (!p.frame) return null;
    const h = p.frame.healthHistory.overall;
    const n = Math.min(h.length, Math.round(p.windowMin) + 1);
    return n > 1 ? h[h.length - 1] - h[h.length - n] : null;
  })();
  const cols = live ? 8 : 6;
  const lowest = [...model.subs].sort((a, b) => (a.health ?? 101) - (b.health ?? 101));

  return (
    <HSection
      id={HEALTH_SECTIONS.breakdown}
      title="Breakdown"
      note={live ? (p.windowMin > 0 ? `Δ over ${formatDuration(p.windowMin)}` : undefined) : "Stored scores"}
      flush
      right={
        <PillNav
          items={[
            { id: "system", label: "By system" },
            { id: "lowest", label: "Lowest first" },
          ]}
          activeId={sort}
          onChange={(id) => setSort(id as SortMode)}
        />
      }
    >
      <div className="ui-table-container ast-table">
        <table className="ui-table pg-health-table">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Health</th>
              {live && <th className="pg-health-num">Δ</th>}
              {live && <th className="pg-health-num">Lost</th>}
              <th>Leading signal</th>
              <th className="pg-health-num">Signals</th>
              <th className="pg-health-num">Findings</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {live && model.rollup && (
              <tr className="pg-health-row-machine">
                <td>
                  <span className="pg-health-name">Machine</span>
                </td>
                <td>
                  <ScoreCell value={p.score} />
                </td>
                <td className="pg-health-num">
                  <Delta v={machineDelta} />
                </td>
                <td />
                <td colSpan={3} />
                <td>
                  <span className="pg-health-status" data-tone={conditionTone(p.condition) === "good" ? undefined : conditionTone(p.condition)}>
                    {conditionTone(p.condition) !== "good" && <span className="ast-chip-dot" aria-hidden="true" />}
                    {p.condition}
                  </span>
                </td>
              </tr>
            )}
            {sort === "lowest"
              ? lowest.map((s) => <SubRow key={s.id} s={s} p={p} live={live} showSystem />)
              : model.systems.map((sy) => (
                  <React.Fragment key={sy.id}>
                    <tr className="pg-health-row-system">
                      <td>
                        <span className="pg-health-name">{sy.name}</span>
                        <span className="pg-health-id ast-num">{sy.id}</span>
                      </td>
                      <td>{sy.scored ? <ScoreCell value={sy.health} /> : <span className="ast-muted">Not scored</span>}</td>
                      {live && (
                        <td className="pg-health-num">
                          <Delta v={sysDelta(sy)} />
                        </td>
                      )}
                      {live && <td />}
                      <td colSpan={cols - (live ? 5 : 3)} />
                      <td>{sy.scored ? <StatusText status={sy.status} /> : <LimitText status={sy.status} />}</td>
                    </tr>
                    {sy.subs.map((s) => (
                      <SubRow key={s.id} s={s} p={p} live={live} />
                    ))}
                  </React.Fragment>
                ))}
          </tbody>
        </table>
      </div>
    </HSection>
  );
}

function ScoreCell({ value }: { value: number | null }) {
  return (
    <span className="pg-health-score-cell">
      <HealthBar value={value} />
      <span className="ast-num pg-health-strong">{value ?? "—"}</span>
    </span>
  );
}

function SubRow({ s, p, live, showSystem = false }: { s: SubNode; p: HealthSectionProps; live: boolean; showSystem?: boolean }) {
  const d = p.subDelta[s.id];
  const w = s.worst;
  return (
    <tr>
      <td>
        <span className="pg-health-indent">
          <span className="pg-health-sub">{s.name}</span>
          {showSystem && <span className="pg-health-id">{s.systemName}</span>}
        </span>
      </td>
      <td>{s.scored ? <ScoreCell value={s.health} /> : <span className="ast-muted">—</span>}</td>
      {live && (
        <td className="pg-health-num">
          <Delta v={s.scored && p.windowMin > 0 ? d : null} />
        </td>
      )}
      {live && (
        <td className="pg-health-num ast-num">{s.penalty !== null && s.penalty > 0 ? `−${fmtPts(s.penalty)}` : <span className="ast-muted">0</span>}</td>
      )}
      <td>
        {w ? (
          <span className="pg-health-lead">
            <TagLink tag={w.tag} tone={w.z !== null ? zTone(w.z) : alarmTone(w.status)} />
            <span className="ast-num ast-muted">{w.z !== null ? sigmaText(w.z) : w.value}</span>
          </span>
        ) : (
          <span className="ast-muted">—</span>
        )}
      </td>
      <td className="pg-health-num">
        <button type="button" className="pg-health-link ast-num" onClick={() => p.go("sensors")} aria-label={`${s.sensors} signals on ${s.name}, open Sensors`}>
          {s.sensors}
        </button>
      </td>
      <td className="pg-health-num">
        {s.findingsActive + s.findingsPending === 0 ? (
          <span className="ast-muted">0</span>
        ) : (
          <button type="button" className="pg-health-link ast-num" onClick={() => p.go("diagnosis")} aria-label={`${s.findingsActive} active findings on ${s.name}, Diagnosis`}>
            {s.findingsActive}
            {s.findingsPending > 0 && <span className="ast-muted"> +{s.findingsPending}</span>}
          </button>
        )}
      </td>
      <td>{s.scored ? <StatusText status={s.status} /> : <LimitText status={s.status} />}</td>
    </tr>
  );
}

/* ================================================================== */
/* Trend                                                               */
/* ================================================================== */

export function HealthTrend(p: HealthSectionProps) {
  const [focus, setFocus] = useState("overall");
  const frame = p.frame as SimFrame;
  const items = [
    { id: "overall", label: "Machine" },
    ...frame.defs.systems.filter((s) => s.scored && frame.healthHistory[s.id]).map((s) => ({ id: s.id, label: s.name })),
  ];
  return (
    <HSection
      id={HEALTH_SECTIONS.trend}
      title="Trend"
      note="● rule confirmed ○ cleared"
      right={<PillNav items={items} activeId={focus} onChange={setFocus} arrows />}
    >
      <HealthTrendChart frame={frame} focus={focus} timeZone={p.timeZone} />
    </HSection>
  );
}

const CW = 1000;
const CH = 220;

function HealthTrendChart({ frame, focus, timeZone }: { frame: SimFrame; focus: string; timeZone?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const series = useMemo(
    () => [
      { id: "overall", name: "Machine", values: frame.healthHistory.overall },
      ...frame.defs.systems
        .filter((s) => s.scored && frame.healthHistory[s.id])
        .map((s) => ({ id: s.id, name: s.name, values: frame.healthHistory[s.id] })),
    ],
    [frame.healthHistory, frame.defs],
  );
  const events = useMemo(() => trendEvents(frame), [frame]);
  const n = frame.healthHistory.overall.length;
  const min = Math.min(...series.flatMap((s) => s.values));
  // Evenly spaced "nice" ticks from 100 down to a floor aligned to the step.
  const floor0 = Math.max(0, Math.min(BAND_CRITICAL - 5, min - 5));
  const step = [5, 10, 20, 25, 50].find((st) => (100 - Math.floor(floor0 / st) * st) / st <= 5) ?? 50;
  const lo = Math.floor(floor0 / step) * step;
  const hi = 100;
  const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * CW);
  const y = (v: number) => CH - ((v - lo) / (hi - lo)) * CH;
  const pctY = (v: number) => `${((hi - v) / (hi - lo)) * 100}%`;
  const pctX = (i: number) => `${(i / Math.max(1, n - 1)) * 100}%`;
  const path = (vals: number[]) => vals.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const offset = frame.times.length - n;
  const time = (i: number) => {
    const t = frame.times[offset + i];
    return t === undefined ? "" : formatLocalTime(simTimeMs(t), { seconds: false, timeZone });
  };
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * (n - 1)));
  const yTicks = Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => hi - i * step);
  const ordered = [...series].sort((a, b) => (a.id === focus ? 1 : 0) - (b.id === focus ? 1 : 0));
  const focused = series.find((s) => s.id === focus) ?? series[0];
  const last = focused.values[focused.values.length - 1];
  const near = Math.max(1, Math.round(n / 120));
  const hoverEvents = hover === null ? [] : events.filter((e) => Math.abs(e.index - hover) <= near);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    setHover(Math.round(f * (n - 1)));
  };

  return (
    <div className="pg-health-chart">
      <div className="pg-health-chart-y" aria-hidden="true">
        {yTicks.map((v) => (
          <span key={v} style={{ top: pctY(v) }}>
            {v}
          </span>
        ))}
      </div>
      <div
        className="pg-health-chart-plot"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label={`${focused.name} health ${last} of 100 over ${n} samples; ${events.length} rule events; limits ${BAND_ADVISORY} and ${BAND_CRITICAL}`}
      >
        <svg viewBox={`0 0 ${CW} ${CH}`} preserveAspectRatio="none" className="pg-health-chart-svg">
          <rect x={0} y={y(BAND_ADVISORY)} width={CW} height={y(lo) - y(BAND_ADVISORY)} className="pg-health-limitband" />
          {[100, lo].map((v) => (
            <line key={v} x1={0} x2={CW} y1={y(v)} y2={y(v)} className="pg-health-grid" vectorEffect="non-scaling-stroke" />
          ))}
          {[BAND_ADVISORY, BAND_CRITICAL].map((v) => (
            <line key={v} x1={0} x2={CW} y1={y(v)} y2={y(v)} className="pg-health-limit" vectorEffect="non-scaling-stroke" />
          ))}
          {ordered.map((s) => (
            <path key={s.id} d={path(s.values)} className={`pg-health-line ${s.id === focus ? "is-focus" : ""}`} vectorEffect="non-scaling-stroke" />
          ))}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={0} y2={CH} className="pg-health-cursor" vectorEffect="non-scaling-stroke" />}
        </svg>
        {events.map((e, i) => (
          <span
            key={i}
            className={`pg-health-ev ${e.raised ? "" : "is-clear"}`}
            data-tone={e.raised ? alarmTone(e.severity) : undefined}
            style={{ left: pctX(e.index) }}
            title={`${time(e.index)} · ${e.title}`}
            aria-hidden="true"
          />
        ))}
        <span className="pg-health-chart-last ast-num" style={{ top: pctY(last) }} data-tone={scoreTone(last)}>
          {last}
        </span>
        {hover !== null && (
          <div className="pg-health-chart-tip" style={{ left: pctX(hover) }} data-side={hover > n / 2 ? "left" : "right"}>
            <strong>{time(hover)}</strong>
            {series.map((s) => (
              <span key={s.id} data-on={s.id === focus || undefined}>
                <i>{s.name}</i>
                {s.values[hover]}
              </span>
            ))}
            {hoverEvents.map((e, k) => (
              <em key={k}>{e.title}</em>
            ))}
          </div>
        )}
      </div>
      <div className="pg-health-chart-x" aria-hidden="true">
        {ticks.map((i, k) => (
          <span key={k} style={{ left: pctX(i) }} data-edge={k === 0 ? "start" : k === ticks.length - 1 ? "end" : undefined}>
            {time(i)}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/* Indicators                                                          */
/* ================================================================== */

export function ConditionIndicators(p: HealthSectionProps) {
  const { model } = p;
  const live = model.basis === "live";
  const pyro = p.frame?.defs.plant === "pyro";
  const off = model.indicators.filter(
    (r) => r.status !== "Normal" || (r.z !== null && Math.abs(r.z) >= 3.0) || (r.quality !== null && r.quality !== "Good"),
  );
  const systems = model.systems.filter((s) => model.indicators.some((r) => r.systemId === s.id));
  const items = [
    ...systems.map((s) => ({ id: s.id, label: s.name })),
    ...(live || off.length > 0 ? [{ id: "off", label: off.length > 0 ? `Off model ${off.length}` : "Off model" }] : []),
  ];
  const [filter, setFilter] = useState<string | null>(null);
  const active = filter && items.some((i) => i.id === filter) ? filter : (items[0]?.id ?? "");
  const rows = active === "off" ? off : model.indicators.filter((r) => r.systemId === active);

  return (
    <HSection
      id={HEALTH_SECTIONS.indicators}
      title="Indicators"
      note={live ? "vs reference model" : "Stored readings"}
      flush
      right={items.length > 1 ? <PillNav items={items} activeId={active} onChange={setFilter} arrows /> : undefined}
    >
      <div className="ui-table-container ast-table">
        <table className="ui-table pg-health-table">
          <thead>
            <tr>
              <th>Tag</th>
              <th>Signal</th>
              <th className="pg-health-num">Value</th>
              {live && <th className="pg-health-num">Model</th>}
              {live && <th className="pg-health-num">Residual</th>}
              {live && <th>Deviation</th>}
              <th className="pg-health-num" title={pyro ? PYRO_DEMO_LIMIT : undefined}>
                Warning / alarm{pyro ? " (provisional)" : ""}
              </th>
              {live ? <th className="pg-health-num">Lost</th> : <th>Status</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <IndicatorTr key={r.tag} r={r} live={live} />
            ))}
          </tbody>
        </table>
      </div>
    </HSection>
  );
}

function IndicatorTr({ r, live }: { r: IndicatorRow; live: boolean }) {
  const excluded = r.quality !== null && r.quality !== "Good";
  return (
    <tr className={excluded ? "is-excluded" : undefined}>
      <td>
        <TagLink tag={r.tag} tone={excluded ? validityTone(r.quality ?? "") : r.z !== null ? zTone(r.z) : alarmTone(r.status)} />
      </td>
      <td className="pg-health-signal" title={`${r.name} · ${r.subName}`}>
        {r.name}
        <span className="pg-health-id">{r.subName}</span>
      </td>
      <td className="pg-health-num">
        <span className="ast-num pg-health-strong" data-tone={alarmTone(r.limitSeverity)}>
          {r.value}
        </span>
        {r.unit && <span className="ast-unit">{r.unit}</span>}
      </td>
      {live && <td className="pg-health-num ast-num ast-muted">{r.model ?? "—"}</td>}
      {live && <td className="pg-health-num ast-num">{r.residual ?? "—"}</td>}
      {live && (
        <td>
          <SigmaStrip z={excluded ? null : r.z} />
        </td>
      )}
      <td className="pg-health-num ast-num ast-muted" title={r.limitNote ? `Limit now: ${r.limitNote}` : undefined}>
        {r.limits}
      </td>
      {live ? (
        <td className="pg-health-num ast-num">
          {excluded ? (
            <span className="pg-health-status" data-tone={validityTone(r.quality ?? "")}>
              <span className="ast-chip-dot" aria-hidden="true" />
              {r.quality}
            </span>
          ) : r.points === null ? (
            <span className="ast-muted" title="Process context is not scored">—</span>
          ) : r.points > 0 ? (
            `−${fmtPts(r.points)}`
          ) : (
            <span className="ast-muted">0</span>
          )}
        </td>
      ) : (
        <td>
          <LimitText status={r.status} />
        </td>
      )}
    </tr>
  );
}

function SigmaStrip({ z }: { z: number | null }) {
  if (z === null) return <span className="ast-muted">—</span>;
  const c = Math.max(-6, Math.min(6, z));
  return (
    <span className="pg-health-sigma" data-tone={zTone(z)} role="img" aria-label={`${sigmaText(z)} from model`}>
      <span className="pg-health-sigma-track">
        <span className="pg-health-sigma-band" />
        <span className="pg-health-sigma-mid" />
        <span className="pg-health-sigma-dot" style={{ left: `${((c + 6) / 12) * 100}%` }} />
      </span>
      <span className="ast-num pg-health-sigma-val">{sigmaText(z)}</span>
    </span>
  );
}

/* ================================================================== */
/* Deductions — what subtracts points, plus input data quality          */
/* ================================================================== */

interface DriverGroup {
  key: string;
  kind: Contribution["kind"];
  source: string;
  detail: string;
  severity: Severity;
  perSub: number;
  subs: string[];
  tag?: string;
}

export function topDrivers(list: Contribution[] | null): DriverGroup[] {
  if (!list) return [];
  const map = new Map<string, DriverGroup>();
  for (const c of list) {
    const key = c.kind === "rule" ? `rule:${c.rule?.id}` : c.id;
    const g = map.get(key);
    if (g) {
      g.perSub = Math.max(g.perSub, c.points);
      g.subs.push(c.subName);
    } else {
      map.set(key, {
        key,
        kind: c.kind,
        source: c.kind === "rule" ? c.label : (c.tag ?? c.label),
        detail: c.detail,
        severity: c.severity,
        perSub: c.points,
        subs: [c.subName],
        tag: c.kind === "rule" ? undefined : c.tag,
      });
    }
  }
  return [...map.values()];
}

export function HealthDeductions(p: HealthSectionProps) {
  const { model } = p;
  const groups = useMemo(() => topDrivers(model.contributions), [model.contributions]);
  const q = model.quality;
  return (
    <HSection
      id={HEALTH_SECTIONS.drivers}
      title="Deductions"
      note="pts"
      flush
    >
      <div className="ui-table-container ast-table">
        <table className="ui-table pg-health-table">
          <thead>
            <tr>
              <th>Source</th>
              <th>Type</th>
              <th>Sub-assembly</th>
              <th>Evidence</th>
              <th className="pg-health-num">Lost</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.key}>
                <td>
                  {g.tag ? (
                    <TagLink tag={g.tag} tone={alarmTone(g.severity)} />
                  ) : (
                    <button type="button" className="pg-health-link pg-health-rule" data-tone={alarmTone(g.severity)} onClick={() => p.go("diagnosis")} title="Diagnosis">
                      {alarmTone(g.severity) && <span className="ast-chip-dot" aria-hidden="true" />}
                      {g.source}
                    </button>
                  )}
                </td>
                <td className="ast-muted">{g.kind}</td>
                <td className="pg-health-wrap">{g.subs.join(", ")}</td>
                <td className="pg-health-wrap ast-muted">{g.detail}</td>
                <td className="pg-health-num ast-num pg-health-strong">
                  −{fmtPts(g.perSub)}
                  {g.subs.length > 1 && <span className="ast-unit">× {g.subs.length}</span>}
                </td>
              </tr>
            ))}
            {q?.rows.map((r) => (
              <tr key={`dq:${r.tag}`} className="is-excluded">
                <td>
                  <TagLink tag={r.tag} />
                </td>
                <td className="ast-muted">Excluded</td>
                <td className="pg-health-wrap">{r.subName}</td>
                <td className="pg-health-wrap ast-muted">{`${r.quality} · ${r.qualityNote ?? "failed validation"}`}</td>
                <td className="pg-health-num ast-num ast-muted">0</td>
              </tr>
            ))}
            {groups.length === 0 && !q?.rows.length && (
              <tr>
                <td colSpan={5} className="ast-muted">
                  No deductions.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {q && (
        <dl className="pg-health-dq" aria-label="Input data quality">
          <div>
            <dt>Valid</dt>
            <dd className="ast-num">
              {q.valid}
              <span className="ast-unit">/ {q.total}</span>
            </dd>
          </div>
          <div>
            <dt>Suspect</dt>
            <dd className="ast-num" data-tone={q.suspect ? "warn" : undefined}>
              {q.suspect}
            </dd>
          </div>
          <div>
            <dt>Invalid</dt>
            <dd className="ast-num" data-tone={q.invalid ? "bad" : undefined}>
              {q.invalid}
            </dd>
          </div>
          <div>
            <dt>Held</dt>
            <dd className="ast-num">{q.held}</dd>
          </div>
          <div>
            <dt>Scored inputs used</dt>
            <dd className="ast-num">
              {q.scoredTotal - q.excludedScored}
              <span className="ast-unit">/ {q.scoredTotal}</span>
            </dd>
          </div>
          {q.dqRules.length > 0 && (
            <div>
              <dt>Data-quality rules</dt>
              <dd className="ast-num" data-tone="warn">
                {q.dqRules.map((r) => r.id).join(", ")}
              </dd>
            </div>
          )}
        </dl>
      )}
    </HSection>
  );
}
