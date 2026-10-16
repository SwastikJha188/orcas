"use client";

import React, { useLayoutEffect, useRef, useState } from "react";
import { smoothPath } from "@/components/ui/sparkline";
import { formatScale, gaugeScale, twoSidedValues, zones, type GaugeScale } from "./sensor-gauge";
import { isoBounds } from "./diagnosis-model";
import { fmt, isOnOff, parseRange, tagOf, unitText, type SensorRow } from "./sensors-model";

/* ==========================================================================
   Sensor card charts. Each measurement type gets the graph that reads it
   best: drive current as load columns, pressure on a dial, speed on a
   tachometer with its deviation from reference, temperature as a
   thermometer with its trend, vibration over the ISO 10816-3 zones, level
   and inventory in a vessel, flow against its set point, position on its
   travel, analysers as stepped samples and on/off signals as a state
   timeline. Limits are drawn as tone zones; the ink stays neutral until
   the reading leaves its limits.
   ========================================================================== */

export type ChartKind =
  | "state"
  | "load"
  | "pressure"
  | "speed"
  | "temperature"
  | "vibration"
  | "level"
  | "flow"
  | "position"
  | "analyser"
  | "trend";

/** Graph type for a sensor: tag family first (ELE-, PRS- …), unit as fallback. */
export function chartKind(s: SensorRow): ChartKind {
  if (isOnOff(s)) return "state";
  const family = tagOf(s).split("-")[0];
  const u = (s.unit || "").toLowerCase();
  if (family === "ELE" || u === "a" || u === "kw") return "load";
  if (family === "PRS" || /bar$|pa$/.test(u)) return "pressure";
  if (family === "SPD" || u === "rpm") return "speed";
  if (family === "VIB" || u.startsWith("mm/s")) return "vibration";
  if (family === "TMP" || u === "°c") return "temperature";
  if (family === "LEV" || family === "WGT") return "level";
  if (family === "FLO" || u === "t/h") return "flow";
  if (family === "POS") return "position";
  if (family === "GAS" || /vol%|ppm/.test(u)) return "analyser";
  return "trend";
}

const WINDOW = 60;
const H = 56;

type Zone = [number, number, "warn" | "bad"];

interface Data {
  s: SensorRow;
  kind: ChartKind;
  vals: number[];
  model: number[] | null;
  value: number;
  g: GaugeScale | null;
  unit: string;
  span: string;
  W: number;
}

/* ------------------------------------------------------------ helpers */

const finite = (v: number[]) => v.filter(Number.isFinite);
const last = (v: number[]) => v[v.length - 1];

/** Limit values a trend should keep in view (both sides of a band). */
function limitValues(g: GaugeScale | null): number[] {
  if (!g) return [];
  return g.band ? twoSidedValues(g.band) : [g.warn, g.alarm];
}

/** Data range padded; limits close to the data are pulled into view, far ones stay off-chart. */
function trendDomain(vals: number[], extra: number[] = []): [number, number] {
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  const span = hi - lo || Math.abs(hi) * 0.05 || 1;
  for (const e of extra) {
    if (Number.isFinite(e) && e >= lo - span * 1.5 && e <= hi + span * 1.5) {
      lo = Math.min(lo, e);
      hi = Math.max(hi, e);
    }
  }
  const pad = (hi - lo || span) * 0.14;
  return [lo - pad, hi + pad];
}

/** Gauge domain: limit scale, else instrument range, else the data. Travel and inventory read on the instrument range first. */
function gaugeDomain(d: Data, rangeFirst = false): [number, number] {
  const r = parseRange(d.s.range);
  if (rangeFirst && r) return [r.lo, r.hi];
  if (d.g) return [d.g.min, d.g.max];
  if (r) return [r.lo, r.hi];
  const fallbackPct = rangeFirst;
  if (fallbackPct && d.unit === "%") return [0, 100];
  const hi = Math.max(...d.vals, d.value);
  return [Math.min(0, ...d.vals), hi > 0 ? hi * 1.25 : 1];
}

const lin = (lo: number, hi: number, a: number, b: number) => (v: number) => a + ((v - lo) / (hi - lo || 1)) * (b - a);
const clamp01 = (f: number) => Math.min(1, Math.max(0, f));

function xs(n: number, x0: number, x1: number) {
  return (i: number) => x0 + (n <= 1 ? 0 : (i / (n - 1)) * (x1 - x0));
}

function linePath(vals: number[], x: (i: number) => number, y: (v: number) => number, step = false): string {
  const pts = vals.map((v, i) => ({ x: x(i), y: y(v) }));
  if (!step) return smoothPath(pts);
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) d += ` H ${pts[i].x.toFixed(1)} V ${pts[i].y.toFixed(1)}`;
  return d;
}

/** Horizontal tone bands for the limit zones inside a vertical domain. */
function ZoneBands({ g, y, x0, x1, lo, hi }: { g: GaugeScale | null; y: (v: number) => number; x0: number; x1: number; lo: number; hi: number }) {
  if (!g) return null;
  return (
    <>
      {zones(g).map(([a, z, t]: Zone, i) => {
        const za = Math.max(a === g.min ? -Infinity : a, lo);
        const zz = Math.min(z === g.max ? Infinity : z, hi);
        if (!(zz > za)) return null;
        return <rect key={i} className="stc-zone" data-z={t} x={x0} width={x1 - x0} y={y(zz)} height={y(za) - y(zz)} />;
      })}
      {limitValues(g)
        .filter((v) => v > lo && v < hi)
        .map((v, i) => (
          <line key={`l${i}`} className="stc-limit" x1={x0} x2={x1} y1={y(v)} y2={y(v)} />
        ))}
    </>
  );
}

/** Trend line with optional reference model, limit zones and a live dot. */
function Trend({ d, x0, x1, step = false, area = true }: { d: Data; x0: number; x1: number; step?: boolean; area?: boolean }) {
  const extra = [...limitValues(d.g), ...(d.model ? finite(d.model) : [])];
  const [lo, hi] = trendDomain(d.vals, extra);
  const y = lin(lo, hi, H - 3, 3);
  const x = xs(d.vals.length, x0, x1);
  const line = linePath(d.vals, x, y, step);
  return (
    <>
      <ZoneBands g={d.g} y={y} x0={x0} x1={x1} lo={lo} hi={hi} />
      {area && <path className="stc-area" d={`${line} L ${x1} ${H} L ${x0} ${H} Z`} />}
      {d.model && d.model.length === d.vals.length && <path className="stc-model" d={linePath(d.model, x, y, step)} />}
      <path className="stc-line" d={line} />
      <circle className="stc-dot" cx={x(d.vals.length - 1)} cy={y(last(d.vals))} r={2.6} />
    </>
  );
}

/* ------------------------------------------------------------ per type */

/** Drive current: one load column per sample against the limits. */
function LoadColumns({ d: full }: { d: Data }) {
  const d = { ...full, vals: full.vals.slice(-30) };
  const n = d.vals.length;
  const top = Math.max(d.g?.max ?? 0, ...d.vals) * 1.05 || 1;
  const y = lin(0, top, H - 1, 2);
  const slot = d.W / n;
  const bw = Math.max(1.2, slot - (slot > 4 ? 1.6 : 0.6));
  const toneOf = (v: number) => {
    if (!d.g || d.g.band) return undefined;
    const r = d.g.rising;
    if (r ? v >= d.g.alarm : v <= d.g.alarm) return "bad";
    if (r ? v >= d.g.warn : v <= d.g.warn) return "warn";
    return undefined;
  };
  return (
    <>
      <ZoneBands g={d.g} y={y} x0={0} x1={d.W} lo={0} hi={top} />
      {d.vals.map((v, i) => (
        <rect
          key={i}
          className="stc-col"
          data-z={toneOf(v)}
          data-now={i === n - 1 || undefined}
          x={i * slot + (slot - bw) / 2}
          y={y(Math.max(0, v))}
          width={bw}
          height={Math.max(1, y(0) - y(Math.max(0, v)))}
          rx={Math.min(1.5, bw / 2)}
        />
      ))}
      <line className="stc-base" x1={0} x2={d.W} y1={H - 0.5} y2={H - 0.5} />
    </>
  );
}

/** Pressure: 180° dial with limit arcs and needle, trend beside it. */
function PressureDial({ d }: { d: Data }) {
  const r = H - 16;
  const cx = r + 4;
  const cy = H - 12;
  const [lo, hi] = gaugeDomain(d);
  const f = (v: number) => clamp01((v - lo) / (hi - lo || 1));
  const pt = (t: number, rr = r) => {
    const a = Math.PI * (1 - t);
    return { x: cx + rr * Math.cos(a), y: cy - rr * Math.sin(a) };
  };
  const arc = (a: number, b: number) => {
    const p = pt(a);
    const q = pt(b);
    return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)} A ${r} ${r} 0 0 1 ${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
  };
  const needle = pt(f(d.value), r - 6);
  const dialW = cx * 2;
  return (
    <>
      <path className="stc-track" d={arc(0, 1)} />
      {d.g &&
        zones(d.g).map(([a, z, t]: Zone, i) =>
          f(z) > f(a) ? <path key={i} className="stc-arc" data-z={t} d={arc(f(a), f(z))} /> : null
        )}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const a = pt(t, r - 8);
        const b = pt(t, r - 5);
        return <line key={t} className="stc-tick" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
      })}
      <line className="stc-needle" x1={cx} y1={cy} x2={needle.x} y2={needle.y} />
      <circle className="stc-hub" cx={cx} cy={cy} r={3.2} />
      <text className="stc-label" x={cx - r} y={H} textAnchor="middle">
        {formatScale(lo)}
      </text>
      <text className="stc-label" x={cx + r} y={H} textAnchor="middle">
        {formatScale(hi)}
      </text>
      <Trend d={d} x0={dialW + 10} x1={d.W} />
    </>
  );
}

/** Speed: 240° tachometer with reference mark, deviation-from-reference bars beside it. */
function Tachometer({ d }: { d: Data }) {
  const r = H / 2 - 4;
  const cx = r + 4;
  const cy = H / 2 + 2;
  const [lo, hi] = gaugeDomain(d);
  const f = (v: number) => clamp01((v - lo) / (hi - lo || 1));
  const ang = (t: number) => ((210 - 240 * t) * Math.PI) / 180;
  const pt = (t: number, rr = r) => ({ x: cx + rr * Math.cos(ang(t)), y: cy - rr * Math.sin(ang(t)) });
  const arc = (a: number, b: number) => {
    const p = pt(a);
    const q = pt(b);
    return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)} A ${r} ${r} 0 ${(b - a) * 240 > 180 ? 1 : 0} 1 ${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
  };
  const ref = d.model ? last(d.model) : null;
  const res = d.model && d.model.length === d.vals.length ? d.vals.map((v, i) => v - d.model![i]) : null;
  const x0 = cx * 2 + 12;
  const mid = H / 2;
  const amp = res ? Math.max(...res.map(Math.abs), (d.s.spec?.sigma ?? 0) * 3, Math.abs(ref ?? 1) * 0.002) : 0;
  const bx = x0 + 30;
  const slot = res ? (d.W - bx) / res.length : 0;
  return (
    <>
      <path className="stc-track" d={arc(0, 1)} />
      {f(d.value) > 0.005 && <path className="stc-fill" d={arc(0, f(d.value))} />}
      {Array.from({ length: 9 }, (_, i) => {
        const a = pt(i / 8, r - 6);
        const b = pt(i / 8, r - (i % 2 ? 4 : 2.5) - 6);
        return <line key={i} className="stc-tick" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
      })}
      {ref !== null && Number.isFinite(ref) && (() => {
        const a = pt(f(ref), r + 3);
        const b = pt(f(ref), r - 3);
        return <line className="stc-ref" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
      })()}
      {res ? (
        <>
          <line className="stc-base" x1={bx} x2={d.W} y1={mid} y2={mid} />
          {res.map((v, i) => {
            const h = (Math.abs(v) / (amp || 1)) * (mid - 3);
            return (
              <rect
                key={i}
                className="stc-col"
                data-now={i === res.length - 1 || undefined}
                x={bx + i * slot + slot * 0.15}
                width={Math.max(1, slot * 0.7)}
                y={v >= 0 ? mid - h : mid}
                height={Math.max(0.6, h)}
              />
            );
          })}
          <text className="stc-label" x={x0} y={9}>
            +{fmt(amp)}
          </text>
          <text className="stc-label" x={x0} y={mid + 3}>
            0
          </text>
          <text className="stc-label" x={x0} y={H - 2}>
            −{fmt(amp)}
          </text>
        </>
      ) : (
        <Trend d={d} x0={x0} x1={d.W} />
      )}
    </>
  );
}

/** Temperature: thermometer filled to the reading with limit marks, trend beside it. */
function Thermometer({ d }: { d: Data }) {
  const [lo, hi] = d.g ? [d.g.min, d.g.max] : trendDomain(d.vals);
  const top = 3;
  const bulbR = 6.5;
  const cx = 10;
  const bottom = H - bulbR * 2 + 1;
  const y = lin(lo, hi, bottom, top + 2);
  const fy = Math.min(bottom, Math.max(top + 2, y(d.value)));
  return (
    <>
      <rect className="stc-tube" x={cx - 4} y={top} width={8} height={H - top - bulbR} rx={4} />
      <rect className="stc-fill-solid" x={cx - 2} y={fy} width={4} height={H - bulbR - fy} rx={2} />
      <circle className="stc-fill-solid" cx={cx} cy={H - bulbR - 0.5} r={bulbR - 1} />
      {limitValues(d.g)
        .filter((v) => v > lo && v < hi)
        .map((v, i) => (
          <line key={i} className="stc-limit stc-limit--mark" data-z={d.g && (v === d.g.alarm || v === d.g.band?.alarmHi || v === d.g.band?.alarmLo) ? "bad" : "warn"} x1={cx + 6} x2={cx + 10} y1={y(v)} y2={y(v)} />
        ))}
      <Trend d={d} x0={cx + 18} x1={d.W} />
    </>
  );
}

/** Vibration: trend over the ISO 10816-3 zones A–D. */
function IsoZones({ d }: { d: Data }) {
  const b = isoBounds({ warn: d.g ? d.g.warn : Number.isFinite(d.s.warningVal) ? d.s.warningVal : null, alarm: d.g ? d.g.alarm : Number.isFinite(d.s.alarmVal) ? d.s.alarmVal : null });
  const hi = Math.max(b.cd * 1.2, ...d.vals.map((v) => v * 1.1));
  const y = lin(0, hi, H - 1, 1);
  const x1 = d.W - 12;
  const x = xs(d.vals.length, 0, x1);
  const bands: Array<[string, number, number, string | undefined]> = [
    ...(b.ab !== null ? [["A", 0, b.ab, "a"] as [string, number, number, string]] : []),
    ["B", b.ab ?? 0, b.bc, "b"],
    ["C", b.bc, b.cd, "warn"],
    ["D", b.cd, hi, "bad"],
  ];
  const line = linePath(d.vals, x, y);
  return (
    <>
      {bands.map(([k, a, z, t]) => (
        <g key={k}>
          <rect className="stc-iso" data-z={t} x={0} width={x1} y={y(z)} height={y(a) - y(z)} />
          <text className="stc-label stc-label--zone" x={d.W - 2} y={(y(a) + y(z)) / 2 + 3} textAnchor="end">
            {k}
          </text>
        </g>
      ))}
      <path className="stc-line" d={line} />
      <circle className="stc-dot" cx={x(d.vals.length - 1)} cy={y(last(d.vals))} r={2.6} />
    </>
  );
}

/** Level / weight: vessel filled to the reading with its limits, trend beside it. */
function Vessel({ d }: { d: Data }) {
  const [lo, hi] = gaugeDomain(d, true);
  const vw = 30;
  const shoulder = H - 14;
  const shape = `M 2 6 Q 2 2 6 2 L ${vw - 4} 2 Q ${vw} 2 ${vw} 6 L ${vw} ${shoulder} L ${vw / 2 + 4} ${H - 2} L ${vw / 2 - 2} ${H - 2} L 2 ${shoulder} Z`;
  const y = lin(lo, hi, H - 2, 2);
  const fy = Math.min(H - 2, Math.max(2, y(d.value)));
  const id = `stc-v-${tagOf(d.s).replace(/[^A-Za-z0-9]/g, "")}`;
  return (
    <>
      <clipPath id={id}>
        <path d={shape} />
      </clipPath>
      <rect className="stc-fill-soft" x={0} y={fy} width={vw + 2} height={H - fy} clipPath={`url(#${id})`} />
      <line className="stc-surface" x1={2} x2={vw} y1={fy} y2={fy} clipPath={`url(#${id})`} />
      <path className="stc-vessel" d={shape} />
      {limitValues(d.g)
        .filter((v) => v > lo && v < hi)
        .map((v, i) => (
          <line key={i} className="stc-limit" x1={vw + 2} x2={vw + 6} y1={y(v)} y2={y(v)} />
        ))}
      <Trend d={d} x0={vw + 14} x1={d.W} />
    </>
  );
}

/** Position: travel track with the swept range and dwell ticks of the window. */
function Travel({ d }: { d: Data }) {
  const [lo, hi] = gaugeDomain(d, true);
  const pad = 6;
  const x = lin(lo, hi, pad, d.W - pad);
  const cx = (v: number) => Math.min(d.W - pad, Math.max(pad, x(v)));
  const ty = 30;
  const mn = Math.min(...d.vals);
  const mx = Math.max(...d.vals);
  return (
    <>
      <rect className="stc-tube" x={pad} y={ty - 3} width={d.W - pad * 2} height={6} rx={3} />
      {d.g &&
        zones(d.g).map(([a, z, t]: Zone, i) =>
          cx(z) > cx(a) ? <rect key={i} className="stc-zone stc-zone--track" data-z={t} x={cx(a)} width={cx(z) - cx(a)} y={ty - 3} height={6} /> : null
        )}
      <rect className="stc-fill-soft" x={cx(mn)} y={ty - 3} width={Math.max(2, cx(mx) - cx(mn))} height={6} rx={3} />
      {d.vals.map((v, i) => (
        <line key={i} className="stc-dwell" x1={cx(v)} x2={cx(v)} y1={ty - 14} y2={ty - 6} />
      ))}
      <path className="stc-pointer" d={`M ${cx(d.value)} ${ty + 4} l -4.5 7 h 9 Z`} />
      <line className="stc-needle" x1={cx(d.value)} x2={cx(d.value)} y1={ty - 16} y2={ty + 3} />
      <text className="stc-label" x={pad} y={H} textAnchor="start">
        {formatScale(lo)}
      </text>
      <text className="stc-label" x={d.W - pad} y={H} textAnchor="end">
        {formatScale(hi)}
      </text>
    </>
  );
}

/** On/off signal: state timeline of the window, off-normal spans in tone. */
function StateTimeline({ d }: { d: Data }) {
  const n = d.vals.length;
  const runs: Array<{ from: number; to: number; ok: boolean }> = [];
  d.vals.forEach((v, i) => {
    const ok = v >= 0.5;
    const r = runs[runs.length - 1];
    if (r && r.ok === ok) r.to = i + 1;
    else runs.push({ from: i, to: i + 1, ok });
  });
  const x = (i: number) => (i / n) * d.W;
  const tone = d.s.status === "Critical" ? "bad" : "warn";
  return (
    <>
      {Array.from({ length: 7 }, (_, i) => (
        <line key={i} className="stc-grid" x1={(i / 6) * d.W} x2={(i / 6) * d.W} y1={12} y2={42} />
      ))}
      {runs.map((r, i) => (
        <rect
          key={i}
          className={r.ok ? "stc-run" : "stc-run stc-run--off"}
          data-z={r.ok ? undefined : tone}
          x={x(r.from) + 0.5}
          width={Math.max(1, x(r.to) - x(r.from) - 1)}
          y={r.ok ? 18 : 14}
          height={r.ok ? 18 : 26}
          rx={3}
        />
      ))}
      <text className="stc-label" x={0} y={H} textAnchor="start">
        −{n} {d.span === "min" ? "min" : ""}
      </text>
      <text className="stc-label" x={d.W} y={H} textAnchor="end">
        now
      </text>
    </>
  );
}

/* ------------------------------------------------------------ caption */

function caption(d: Data): string {
  const u = d.unit ? ` ${d.unit}` : "";
  const win = d.span === "min" ? `${d.vals.length} min` : `${d.vals.length} readings`;
  const ref = d.model ? last(d.model) : null;
  const first = d.vals[0];
  switch (d.kind) {
    case "state": {
      const on = d.vals.filter((v) => v >= 0.5).length;
      const changes = d.vals.reduce((n, v, i) => (i && (v >= 0.5) !== (d.vals[i - 1] >= 0.5) ? n + 1 : n), 0);
      return `${Math.round((on / d.vals.length) * 100)} % ${d.s.spec?.states?.normal ?? "normal"} · ${changes} change${changes === 1 ? "" : "s"} · ${win}`;
    }
    case "load": {
      const cols = d.vals.slice(-30);
      return `Peak ${fmt(Math.max(...cols))}${u} · ${cols.length} ${d.span === "min" ? "min" : "readings"}`;
    }
    case "pressure":
    case "speed":
      return ref !== null && Number.isFinite(ref) ? `Ref ${fmt(ref)}${u} · Δ ${d.value - ref >= 0 ? "+" : "−"}${fmt(Math.abs(d.value - ref))}` : `${fmt(Math.min(...d.vals))} – ${fmt(Math.max(...d.vals))}${u}`;
    case "flow":
      return ref !== null && Number.isFinite(ref) ? `Set point ${fmt(ref)}${u} · Δ ${d.value - ref >= 0 ? "+" : "−"}${fmt(Math.abs(d.value - ref))}` : `${fmt(Math.min(...d.vals))} – ${fmt(Math.max(...d.vals))}${u}`;
    case "vibration": {
      const b = isoBounds({ warn: d.g?.warn ?? null, alarm: d.g?.alarm ?? null });
      const z = d.value >= b.cd ? "D" : d.value >= b.bc ? "C" : b.ab !== null && d.value < b.ab ? "A" : "B";
      return `Zone ${z} · ISO 10816-3 · ${win}`;
    }
    case "position":
      return `Travel ${fmt(Math.min(...d.vals))} – ${fmt(Math.max(...d.vals))}${u} · ${win}`;
    case "temperature":
    case "level": {
      const delta = d.value - first;
      return `${delta >= 0 ? "+" : "−"}${fmt(Math.abs(delta))}${u} · ${win}`;
    }
    default:
      return `${fmt(Math.min(...d.vals))} – ${fmt(Math.max(...d.vals))}${u} · ${win}`;
  }
}

const KIND_LABEL: Record<ChartKind, string> = {
  state: "state timeline",
  load: "load columns",
  pressure: "pressure dial and trend",
  speed: "tachometer and deviation from reference",
  temperature: "thermometer and trend",
  vibration: "trend over ISO 10816-3 zones",
  level: "vessel level and trend",
  flow: "flow against set point",
  position: "travel position",
  analyser: "analyser samples",
  trend: "trend",
};

/* ------------------------------------------------------------ chart */

/**
 * The graph for a sensor card. `history` is the per-sample series (one value
 * per simulated minute for live machines); `span` says what a sample is.
 * Returns null without at least two samples.
 */
export function SensorTileChart({
  s,
  history,
  model,
  span,
}: {
  s: SensorRow;
  history: number[] | undefined;
  model: number[] | undefined;
  span: "min" | "reading";
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [W, setW] = useState(220);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(Math.max(80, el.offsetWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const vals = history ? finite(history.slice(-WINDOW)) : [];
  if (vals.length < 2) return null;
  const kind = chartKind(s);
  const m = model ? model.slice(-WINDOW) : null;
  const parsed = parseFloat(s.value);
  const d: Data = {
    s,
    kind,
    vals,
    model: m && m.length === vals.length && m.every(Number.isFinite) && kind !== "state" ? m : null,
    value: Number.isFinite(parsed) ? parsed : last(vals),
    g: kind === "state" ? null : gaugeScale(s, s.spec?.limit),
    unit: unitText(s),
    span: span,
    W,
  };
  const tone = s.status === "Normal" ? undefined : s.status === "Critical" ? "bad" : "warn";

  const body = (() => {
    switch (kind) {
      case "state":
        return <StateTimeline d={d} />;
      case "load":
        return <LoadColumns d={d} />;
      case "pressure":
        return <PressureDial d={d} />;
      case "speed":
        return <Tachometer d={d} />;
      case "temperature":
        return <Thermometer d={d} />;
      case "vibration":
        return <IsoZones d={d} />;
      case "level":
        return <Vessel d={d} />;
      case "flow":
        return <Trend d={d} x0={0} x1={W - 3} />;
      case "position":
        return <Travel d={d} />;
      case "analyser":
        return <Trend d={d} x0={0} x1={W - 3} step area={false} />;
      default:
        return <Trend d={d} x0={0} x1={W - 3} />;
    }
  })();

  const text = caption(d);
  return (
    <span ref={ref} className="stc" data-kind={kind} data-tone={tone}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${tagOf(s)} ${KIND_LABEL[kind]} · ${text}`}>
        {body}
      </svg>
      <span className="stc-caption ast-caption ast-num">{text}</span>
    </span>
  );
}
