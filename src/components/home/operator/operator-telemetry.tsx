"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loading, Skel } from "@/components/ui";
import { formatClock } from "@shared/lib/kiln-sim/engine";
import type { HomeAlert } from "../home-widgets";
import type { Tone } from "@/components/assets/assets-shell-ui";
import { displayName, nameIds } from "@/lib/display-name";
import { defsFor } from "@/lib/live-defs";

export type TimedSample = { t: number; value: number };

export interface OperatorSignal {
  tag: string;
  name: string;
  display: string;
  unit: string;
  tone: Tone;
  available: boolean;
  isState: boolean;
  normalBand: string;
  samples: TimedSample[];
  modelSamples: TimedSample[];
}

export function rateFromSamples(samples: TimedSample[], minutes: number) {
  const current = samples.at(-1);
  if (!current || samples.length < 2) return null;
  const target = current.t - minutes;
  let baseline: TimedSample | null = null;
  for (let i = samples.length - 2; i >= 0; i--) {
    if (samples[i].t <= target) { baseline = samples[i]; break; }
  }
  if (!baseline || current.t <= baseline.t) return null;
  return { baseline, current, delta: current.value - baseline.value, elapsed: current.t - baseline.t,
    perMinute: (current.value - baseline.value) / (current.t - baseline.t) };
}

function signed(value: number, digits = 2) {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(digits)}`;
}

function clock(t: number) { return formatClock(t).clock; }

export function OperatorSensorRail({ signals, selectedTag, onSelect, windowMin }: {
  signals: OperatorSignal[];
  selectedTag: string | null;
  onSelect: (tag: string) => void;
  windowMin: number;
  scopeKey: string;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? signals.filter((s) => `${s.tag} ${s.name}`.toLowerCase().includes(q)) : signals;
  }, [signals, query]);

  return <aside className="opc-sensor-rail" aria-label="All sensors in scope">
    <div className="opc-rail-head"><strong>Sensors</strong><span className="ast-num">{filtered.length}/{signals.length}</span></div>
    <input className="opc-sensor-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find sensor by name" aria-label="Find sensor" />
    <div className="opc-sensor-list">
      {filtered.map((sig) => {
        const rate = sig.isState ? null : rateFromSamples(sig.samples, windowMin);
        return <button type="button" key={sig.tag} className="opc-sensor-row" data-selected={selectedTag === sig.tag || undefined}
          onClick={() => onSelect(sig.tag)} aria-label={`${sig.name}: ${sig.display}${sig.available && sig.unit ? ` ${sig.unit}` : ""}`}>
          <span className="ph-unit-dot" data-tone={sig.tone} aria-hidden="true" />
          <span className="opc-sensor-ident"><span className="opc-sensor-tag" title={`${sig.tag} · ${sig.name}`}>{displayName(sig.name)}</span><span className="opc-sensor-name ast-num">Band {sig.normalBand}</span></span>
          <span className="opc-sensor-measure"><strong className="ast-num">{sig.display}{sig.available && sig.unit ? ` ${sig.unit}` : ""}</strong>
            <small className="ast-num">{rate ? `${signed(rate.perMinute)} ${sig.unit}/min` : sig.isState ? "State" : "Rate —"}</small></span>
        </button>;
      })}
      {filtered.length === 0 && <div className="opc-rail-empty">No matching sensors</div>}
    </div>
  </aside>;
}

const WINDOWS = [5, 15, 60, 240] as const;

export function OperatorTrendPanel({ signal, windowMin, onWindowChange, expanded, onLocate, onClose }: {
  signal: OperatorSignal | null;
  windowMin: number;
  onWindowChange: (minutes: number) => void;
  expanded?: boolean;
  onLocate?: (tag: string) => void;
  onClose?: () => void;
}) {
  const [baselineIndex, setBaselineIndex] = useState(0);
  useEffect(() => setBaselineIndex(0), [signal?.tag, windowMin]);
  const all = useMemo(() => signal?.samples ?? [], [signal?.samples]);
  const last = all.at(-1);
  const visible = useMemo(() => last ? all.filter((p) => p.t >= last.t - windowMin) : [], [all, last, windowMin]);
  const baseline = visible[Math.min(baselineIndex, Math.max(0, visible.length - 2))];
  const elapsed = last && baseline ? last.t - baseline.t : 0;
  const delta = last && baseline ? last.value - baseline.value : null;
  const rate = elapsed > 0 && delta !== null && !signal?.isState ? delta / elapsed : null;
  const models = useMemo(() => (signal?.modelSamples ?? []).filter((p) => visible.length && p.t >= visible[0].t && p.t <= last!.t), [signal?.modelSamples, visible, last]);
  const chart = useMemo(() => {
    if (visible.length < 2) return null;
    const values = [...visible, ...models].map((p) => p.value);
    const lo = Math.min(...values); const hi = Math.max(...values);
    const pad = Math.max((hi - lo) * 0.12, Math.abs(hi) * 0.005, 0.01);
    const min = lo - pad; const max = hi + pad;
    const start = visible[0].t; const span = Math.max(1, last!.t - start);
    const x = (t: number) => 56 + (t - start) / span * 828;
    const y = (v: number) => 164 - (v - min) / (max - min) * 140;
    const path = (pts: TimedSample[]) => pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
    const areaPath = `${path(visible)} L${x(last!.t).toFixed(1)},164 L${x(visible[0].t).toFixed(1)},164 Z`;
    return { min, max, x, y, path, areaPath };
  }, [visible, models, last]);

  return <section className="opc-trend-panel" data-expanded={expanded || undefined} aria-label="Selected sensor trend and rate of change">
    <div className="opc-trend-head">
      <div className="opc-trend-title">
        <strong title={signal ? `${signal.tag} · ${signal.name}` : undefined}>{signal ? displayName(signal.name) : "Select a sensor to inspect its history"}</strong>
      </div>
      <div className="opc-trend-actions">
        {onLocate && signal && <button type="button" className="opc-mini-pill" onClick={() => onLocate(signal.tag)}>Locate on machine</button>}
        {WINDOWS.map((m) => <button type="button" key={m} className="opc-mini-pill" data-active={windowMin === m || undefined}
          onClick={() => onWindowChange(m)}>{m < 60 ? `${m}m` : `${m / 60}h`}</button>)}
        {onClose && (
          <button type="button" className="opc-trend-close" onClick={onClose} aria-label="Close trend popup">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5" />
            </svg>
          </button>
        )}
      </div>
    </div>
    {signal && chart && last ? <>
      <div className="opc-trend-plot">
        <svg viewBox="0 0 900 186" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${signal.name} history from ${clock(visible[0].t)} to ${clock(last.t)}`}>
          {[0, 1, 2, 3, 4].map((i) => { const value = chart.max - (chart.max - chart.min) * i / 4; const y = 24 + i * 35;
            return <g key={i}><line x1="56" x2="884" y1={y} y2={y} className="opc-chart-grid" /><text x="48" y={y + 3} textAnchor="end" className="opc-chart-axis">{value.toFixed(1)}</text></g>; })}
          {[0, 1, 2, 3, 4].map((i) => { const t = visible[0].t + (last.t - visible[0].t) * i / 4; const x = 56 + i * 207;
            return <text key={i} x={x} y="181" textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"} className="opc-chart-axis">{clock(t)}</text>; })}
          <path d={chart.areaPath} fill="currentColor" opacity="0.06" />
          {models.length > 1 && <path d={chart.path(models)} className="opc-chart-model" />}
          <path d={chart.path(visible)} className="opc-chart-series" />
          {baseline && <><line x1={chart.x(baseline.t)} x2={chart.x(baseline.t)} y1="24" y2="164" className="opc-chart-cursor" />
            <circle cx={chart.x(baseline.t)} cy={chart.y(baseline.value)} r="4.5" className="opc-chart-point" /></>}
          <circle cx={chart.x(last.t)} cy={chart.y(last.value)} r="4.5" className="opc-chart-point" />
        </svg>
      </div>
      <input className="opc-trend-scrub" type="range" min={0} max={Math.max(0, visible.length - 2)} value={Math.min(baselineIndex, Math.max(0, visible.length - 2))}
        onChange={(e) => setBaselineIndex(Number(e.target.value))} aria-label="Choose earlier reading for rate of change" />
      <div className="opc-trend-stats ast-num">
        <div><span>Earlier · {baseline ? clock(baseline.t) : "—"}</span><strong>{baseline ? `${baseline.value.toFixed(2)} ${signal.unit}` : "—"}</strong></div>
        <div><span>Current · {clock(last.t)}</span><strong>{signal.display}{signal.unit ? ` ${signal.unit}` : ""}</strong></div>
        <div><span>Change · {elapsed} min</span><strong>{delta !== null ? `${signed(delta)} ${signal.unit}` : "—"}</strong></div>
        <div><span>Rate of change</span><strong>{rate !== null ? `${signed(rate)} ${signal.unit}/min` : "—"}</strong></div>
      </div>
      <div className="opc-trend-note"><span>Normal band: {signal.normalBand}</span><span>Solid measured · dashed model</span></div>
    </> : <div className="opc-trend-no-data">{signal ? "Timed history is unavailable for this sensor." : "Choose any sensor from the left rail or cards below."}</div>}
  </section>;
}

export function OperatorAlarmRail({
  alerts,
  onDiagnose,
  embedded,
}: {
  alerts: HomeAlert[];
  onDiagnose: (machineId: string) => void;
  scopeKey: string;
  embedded?: boolean;
}) {
  const uniqueAlerts = useMemo(() => {
    const seen = new Set<string>();
    return alerts.filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
  }, [alerts]);
  const Tag = embedded ? "div" : "aside";
  return <Tag className={embedded ? "opc-alarm-rail-inner" : "opc-alarm-rail"} aria-label="Active alarms">
    <div className="opc-rail-head"><strong>Alarms</strong><span className="opc-alarm-count ast-num">{uniqueAlerts.length}</span></div>
    <div className="opc-alarm-list" data-embedded={embedded || undefined}>{uniqueAlerts.length ? uniqueAlerts.map((a, idx) => {
      const cleanMachine = (a.machine || a.machineId).replace(/\s*\([A-Z0-9-]+\)\s*$/, "");
      const cleanFinding = a.finding.replace(/\s*\([A-Z0-9-]+\)/g, "");
      return <article className="opc-alarm-rail-card" data-tone={a.level === "danger" ? "bad" : "warn"} key={`${a.id}::${idx}`}>
        <div className="opc-alarm-rail-meta"><span className="ph-unit-dot" data-tone={a.level === "danger" ? "bad" : "warn"} /><span className="opc-alarm-rail-machine" title={cleanMachine}>{cleanMachine}</span><span className="opc-alarm-rail-age">{a.age ?? "Active"}</span></div>
        <strong title={a.finding}>{nameIds(cleanFinding, defsFor(a.machineId))}</strong><p className="ast-num" title={a.reading}>{nameIds(a.reading, defsFor(a.machineId))}</p><button type="button" onClick={() => onDiagnose(a.machineId)}>Open diagnosis ›</button>
      </article>;
    }) : <div className="opc-rail-empty">No active findings or limit alarms</div>}</div>
  </Tag>;
}

/* ==========================================================================
   Latched alarm list (operator sidebar)
   ========================================================================== */

/** One alarm point in the latched list: shown from the first time it is raised, active or cleared. */
export interface LatchedAlarm extends HomeAlert {
  active: boolean;
  /** Plant clock the alarm last cleared at (null while active). */
  clearedAt: string | null;
}

const LATCH_MAX = 200;
const latchStores = new Map<string, Map<string, LatchedAlarm>>();
const latchKey = (scope: string) => `ultron.operator.alarms.${scope}`;

function latchStore(scope: string): Map<string, LatchedAlarm> {
  let m = latchStores.get(scope);
  if (m) return m;
  m = new Map();
  try {
    const raw = sessionStorage.getItem(latchKey(scope));
    if (raw) for (const a of JSON.parse(raw) as LatchedAlarm[]) m.set(a.id, a);
  } catch { /* no storage: starts empty */ }
  latchStores.set(scope, m);
  return m;
}

/**
 * Every alarm the plant raised since this tab opened, one row per alarm
 * point (newest raise first): active while it is in `current`, cleared (with
 * its clear time) once it leaves it. A cleared alarm that comes back is
 * active again and moves to the top. Nothing is dropped except the oldest
 * cleared rows beyond 200. `ready` false (frames not loaded yet) never clears.
 */
export function useLatchedAlarms(scope: string, current: HomeAlert[], clock: string | null, ready: boolean): LatchedAlarm[] {
  return useMemo(() => {
    const store = latchStore(scope);
    const now = new Set<string>();
    for (const a of current) {
      if (a.cleared) continue;
      now.add(a.id);
      // An occurrence keeps the raise time it was first seen with (rows never reorder while active); a re-raise starts a new one.
      const prev = store.get(a.id);
      const keep = prev?.active ? { raised: prev.raised, t: prev.t, age: prev.age } : {};
      store.set(a.id, { ...a, ...keep, active: true, clearedAt: null });
    }
    if (ready) {
      for (const [id, a] of store) if (a.active && !now.has(id)) store.set(id, { ...a, active: false, clearedAt: clock ?? "—" });
    }
    let list = [...store.values()].sort((a, b) => (b.t ?? -Infinity) - (a.t ?? -Infinity));
    if (list.length > LATCH_MAX) {
      const keep = new Set(list.filter((a) => a.active).map((a) => a.id));
      for (const a of list) if (keep.size < LATCH_MAX) keep.add(a.id);
      list = list.filter((a) => keep.has(a.id));
      for (const id of [...store.keys()]) if (!keep.has(id)) store.delete(id);
    }
    try {
      sessionStorage.setItem(latchKey(scope), JSON.stringify(list));
    } catch { /* not persisted */ }
    return list;
  }, [scope, current, clock, ready]);
}

/* ==========================================================================
   Alarm panel: an overlay on the drawing, opened and closed from the toolbar
   ========================================================================== */

const PANEL_KEY = "ultron.operator.alarmPanel";
export const ALARM_PANEL_ID = "opc-alarm-panel";

/** Whether the Alarms overlay is open. Open until the operator closes it; the choice is kept in this browser. */
export function useAlarmPanel() {
  const [open, setOpenState] = useState(true);
  useEffect(() => {
    try {
      if (localStorage.getItem(PANEL_KEY) === "closed") setOpenState(false);
    } catch {
      /* storage unavailable: open */
    }
  }, []);
  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
    try {
      localStorage.setItem(PANEL_KEY, next ? "open" : "closed");
    } catch {
      /* storage unavailable */
    }
  }, []);
  return { open, setOpen };
}

/** Toolbar button that opens and closes the Alarms overlay; always there on the overview, with the open-alarm count. */
export function AlarmPanelToggle({ open, onToggle, alarms }: { open: boolean; onToggle: () => void; alarms: LatchedAlarm[] }) {
  const active = alarms.filter((a) => a.active);
  const tone = active.some((a) => a.level === "danger") ? "bad" : active.length ? "warn" : undefined;
  const said = `${active.length} open alarm${active.length === 1 ? "" : "s"}`;
  return (
    <div className="opc-zoom-group opc-alarm-toggle" role="group" aria-label="Alarms panel">
      <button
        type="button"
        className="opc-zoom-btn"
        onClick={onToggle}
        aria-pressed={open}
        aria-controls={ALARM_PANEL_ID}
        aria-label={`${open ? "Hide" : "Show"} alarms, ${said}`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
          <path d="M10 21h4" />
        </svg>
        <span className="opc-alarm-toggle-label">Alarms</span>
        <span className="opc-alarm-toggle-count ast-num" data-tone={tone}>{active.length}</span>
      </button>
    </div>
  );
}

/** Operator alarm panel: the latched alarm list. Active alarms red, cleared ones in normal text; a row opens its machine's Diagnosis. */
export function OperatorAlarmLog({
  alarms,
  loading = false,
  onDiagnose,
  onClose,
}: {
  alarms: LatchedAlarm[];
  /** The plant's alarms are still on their way (live frames or the server's list): never read as "none". */
  loading?: boolean;
  onDiagnose: (machineId: string) => void;
  /** Shown as an overlay: closes the panel (Esc inside it does the same). */
  onClose?: () => void;
}) {
  const [openOnly, setOpenOnly] = useState(false);
  const active = alarms.filter((a) => a.active).length;
  const waiting = loading && alarms.length === 0;
  const shown = openOnly ? alarms.filter((a) => a.active) : alarms;
  return (
    <aside
      id={onClose ? ALARM_PANEL_ID : undefined}
      className={`opc-alarm-rail opc-alarm-log${onClose ? " opc-alarm-overlay" : ""}`}
      aria-label="Alarms"
      onKeyDown={onClose ? (e) => e.key === "Escape" && (e.stopPropagation(), onClose()) : undefined}
    >
      <div className="opc-rail-head">
        <strong>Alarms</strong>
        <span className="opc-al-counts">
          <span data-active={active > 0 || undefined}><b className="ast-num">{waiting ? <Skel width="1ch" /> : active}</b> open</span>
          <span><b className="ast-num">{waiting ? <Skel width="1ch" /> : alarms.length - active}</b> fixed</span>
          <button type="button" className="opc-al-filter" aria-pressed={openOnly} onClick={() => setOpenOnly((v) => !v)}>
            Open only
          </button>
          {onClose && (
            <button type="button" className="opc-al-close" onClick={onClose} aria-label="Hide alarms">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
        </span>
      </div>
      <ol className="opc-al-list">
        {shown.length ? (
          shown.map((a) => {
            const machine = (a.machine || a.machineId).replace(/\s*\([A-Z0-9-]+\)\s*$/, "");
            const defs = defsFor(a.machineId);
            return (
              <li key={a.id} className="opc-al-row" data-active={a.active || undefined} data-level={a.active ? (a.level === "danger" ? "critical" : "alert") : undefined}>
                {/* The row reads in everyday words (docs/plain-language.md); the engineering detail is on the machine's Diagnosis. */}
                <button type="button" onClick={() => onDiagnose(a.machineId)}>
                  {/* Event-log columns: when + state on the left, what happened on the right. */}
                  <span className="opc-al-when">
                    <span className="ast-num">{a.raised ?? "—"}</span>
                    <span className="opc-al-state">
                      <span className="opc-al-dot" aria-hidden="true" />
                      {a.active ? (a.level === "danger" ? "Critical" : "Alert") : "Fixed"}
                    </span>
                    {!a.active && <span className="ast-num">{a.clearedAt ?? "—"}</span>}
                  </span>
                  <span className="opc-al-body">
                    <strong>{a.plainTitle ?? nameIds(a.finding.replace(/\s*\([A-Z0-9-]+\)/g, ""), defs)}</strong>
                    <span className="opc-al-machine">{a.where ? `${a.where} · ${machine}` : machine}</span>
                    <span className="opc-al-reading">{a.plainWhat ?? nameIds(a.reading, defs)}</span>
                    {a.active && a.plainTodo && (
                      <span className="opc-al-todo">
                        <span>What to do</span> {a.plainTodo}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })
        ) : (
          <li className="opc-rail-empty">
            {waiting ? <Loading label="Loading the alarms…" rows={3} inline /> : openOnly && alarms.length ? "No open alarms" : "No problems found since this page was opened"}
          </li>
        )}
      </ol>
    </aside>
  );
}
