"use client";

import React from "react";
import type { DetailedSensorInfo } from "./machine-sensor-mapping-view";
import { severityTone } from "./assets-shell-ui";
import { isRelativeLimit, resolveLimit, type LimitRule } from "@/lib/kiln-sim/signals";

/* ==========================================================================
   Sensor limit gauges. A reading drawn against its own warning and alarm
   limits: horizontal bar for diagram callouts and the sensor detail panel. Handles rising limits (alarm above warning) and falling limits
   (alarm below warning, e.g. seal margin, oil pressure). Discrete (state)
   signals have no scale and return null.
   ========================================================================== */

export interface GaugeScale {
  min: number;
  max: number;
  warn: number;
  alarm: number;
  /** Alarm sits above warning (higher is worse). */
  rising: boolean;
  value: number;
  /** 0–1 position of a value on the scale. */
  at: (v: number) => number;
  ticks: number[];
  /** Two-sided limits (band / |x|): both sides, from the engine definition. */
  band?: TwoSided;
}

/** Both sides of a two-sided limit; a side without a value is undefined. */
export interface TwoSided {
  warnLo?: number;
  alarmLo?: number;
  warnHi?: number;
  alarmHi?: number;
}

/**
 * The low and high sides of a band or |x| limit (engine definition). Null for
 * one-sided and set-point limits, which the DB warning / alarm pair already carries.
 * Relative limits (pyro D5 Table 9.2: model ± %, baseline + K …) are resolved at
 * `ref`, the live reference model (else their design-point reference).
 */
export function twoSided(raw: LimitRule | null | undefined, ref?: number | null): TwoSided | null {
  const limit = isRelativeLimit(raw) ? resolveLimit(raw, ref) : raw;
  if (!limit) return null;
  if (limit.kind === "abs") return { warnLo: -limit.warn, alarmLo: -limit.alarm, warnHi: limit.warn, alarmHi: limit.alarm };
  if (limit.kind !== "band") return null;
  const lo = limit.warnLo !== undefined || limit.alarmLo !== undefined;
  const hi = limit.warnHi !== undefined || limit.alarmHi !== undefined;
  return lo && hi ? { warnLo: limit.warnLo, alarmLo: limit.alarmLo, warnHi: limit.warnHi, alarmHi: limit.alarmHi } : null;
}

/** Limit values of a two-sided limit, low → high. */
export function twoSidedValues(b: TwoSided): number[] {
  return [b.alarmLo, b.warnLo, b.warnHi, b.alarmHi].filter((v): v is number => v !== undefined && Number.isFinite(v));
}

/** "≤ 30 / ≥ 85": the warning or alarm side pair of a two-sided limit. */
export function twoSidedText(lo: number | undefined, hi: number | undefined): string {
  return [lo !== undefined ? `≤ ${lo}` : null, hi !== undefined ? `≥ ${hi}` : null].filter(Boolean).join(" / ") || "—";
}

/**
 * Reading as % of the way from the band centre to the limit on its side
 * (alarm, else warning). Null without a limit on that side.
 */
export function twoSidedLoad(value: number, b: TwoSided): { load: number; limit: number; kind: "alarm" | "warning"; side: "low" | "high" } | null {
  const vals = twoSidedValues(b);
  if (!Number.isFinite(value) || vals.length < 2) return null;
  const inner = [b.warnLo ?? b.alarmLo, b.warnHi ?? b.alarmHi];
  const centre = inner[0] !== undefined && inner[1] !== undefined ? (inner[0] + inner[1]) / 2 : (vals[0] + vals[vals.length - 1]) / 2;
  const high = value >= centre;
  const limit = high ? (b.alarmHi ?? b.warnHi) : (b.alarmLo ?? b.warnLo);
  if (limit === undefined || limit === centre) return null;
  const kind = (high ? b.alarmHi : b.alarmLo) !== undefined ? "alarm" : "warning";
  const load = Math.max(0, Math.round(((value - centre) / (limit - centre)) * 100));
  return { load, limit, kind, side: high ? "high" : "low" };
}

function niceStep(span: number, count: number): number {
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / mag;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
}

/**
 * Scale for a reading against its limits. Pass the engine's `limit` (live
 * machines: `defs.signalByTag[tag].limit`) so band and |x| limits keep both
 * sides; without it the DB warning / alarm pair is used (one side only).
 */
export function gaugeScale(s: DetailedSensorInfo, limit?: LimitRule | null, ref: number | null | undefined = s.live?.model): GaugeScale | null {
  if (s.unit === "state") return null;
  const value = parseFloat(s.value);
  const band = twoSided(limit, ref);
  if (band && Number.isFinite(value)) {
    const vals = twoSidedValues(band);
    const span = vals[vals.length - 1] - vals[0] || Math.abs(vals[0]) || 1;
    const lo = Math.min(value, vals[0] - span * 0.15);
    const hi = Math.max(value, vals[vals.length - 1] + span * 0.15);
    const step = niceStep(hi - lo || 1, 4);
    const min = Math.floor(lo / step) * step;
    const max = Math.ceil(hi / step) * step;
    if (max > min) {
      const ticks: number[] = [];
      for (let t = min; t <= max + step / 2; t += step) ticks.push(+t.toFixed(6));
      const warn = band.warnHi ?? band.alarmHi ?? 0;
      const alarm = band.alarmHi ?? band.warnHi ?? 0;
      return { min, max, warn, alarm, rising: true, value, at: (v) => Math.min(1, Math.max(0, (v - min) / (max - min))), ticks, band };
    }
  }
  // One-sided relative limits move with the reference model: draw them at the live reference, not the stored design-point pair.
  const live = isRelativeLimit(limit) ? resolveLimit(limit, ref) : null;
  const pair = live && (live.kind === "hi" || live.kind === "lo") ? live : null;
  const warn = pair ? pair.warn : Number(s.warningVal);
  const alarm = pair ? pair.alarm : Number(s.alarmVal);
  const top = Number(s.maxScale);
  if (![value, warn, alarm].every(Number.isFinite) || warn === alarm) return null;

  const rising = alarm > warn;
  const lo = Math.min(0, value, warn, alarm);
  const hi = Math.max(Number.isFinite(top) ? top : 0, value, warn, alarm);
  const step = niceStep(hi - lo || 1, 4);
  const min = Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step;
  if (!(max > min)) return null;

  const ticks: number[] = [];
  for (let t = min; t <= max + step / 2; t += step) ticks.push(+t.toFixed(6));

  return {
    min,
    max,
    warn,
    alarm,
    rising,
    value,
    at: (v) => Math.min(1, Math.max(0, (v - min) / (max - min))),
    ticks,
  };
}

export function formatScale(v: number): string {
  const a = Math.abs(v);
  if (a >= 1000) return `${+(v / 1000).toFixed(a >= 10000 ? 0 : 1)}k`;
  if (a >= 100 || Number.isInteger(v)) return `${Math.round(v)}`;
  return `${+v.toFixed(a >= 10 ? 1 : 2)}`;
}

/** Zones as [from, to, tone] on the scale, ordered bottom → top. */
function zones(g: GaugeScale): Array<[number, number, "warn" | "bad"]> {
  const b = g.band;
  if (b) {
    const out: Array<[number, number, "warn" | "bad"]> = [];
    if (b.alarmLo !== undefined) out.push([g.min, b.alarmLo, "bad"]);
    if (b.warnLo !== undefined) out.push([b.alarmLo ?? g.min, b.warnLo, "warn"]);
    if (b.warnHi !== undefined) out.push([b.warnHi, b.alarmHi ?? g.max, "warn"]);
    if (b.alarmHi !== undefined) out.push([b.alarmHi, g.max, "bad"]);
    return out.filter(([a, z]) => z > a);
  }
  return g.rising
    ? [
        [g.warn, g.alarm, "warn"],
        [g.alarm, g.max, "bad"],
      ]
    : [
        [g.min, g.alarm, "bad"],
        [g.alarm, g.warn, "warn"],
      ];
}

/* ------------------------------------------------------------ horizontal bar */

export function LimitBar({ sensor, scale }: { sensor: DetailedSensorInfo; scale: GaugeScale }) {
  const tone = severityTone(sensor.status);
  const pct = (v: number) => `${scale.at(v) * 100}%`;
  const b = scale.band;
  const limits = b
    ? `warning ${twoSidedText(b.warnLo, b.warnHi)}, alarm ${twoSidedText(b.alarmLo, b.alarmHi)}`
    : `warning ${scale.warn}, alarm ${scale.alarm}`;
  // Band zones sit at both ends: round only the end each one touches.
  const radius = (a: number, z: number) =>
    `${a <= scale.min ? "var(--corner-pill)" : "0"} ${z >= scale.max ? "var(--corner-pill)" : "0"} ${z >= scale.max ? "var(--corner-pill)" : "0"} ${a <= scale.min ? "var(--corner-pill)" : "0"}`;
  return (
    <span className="sg-bar" data-tone={tone} role="img" aria-label={`${sensor.value} ${sensor.unit}; ${limits}`}>
      {zones(scale).map(([a, z, t], i) => (
        <span
          key={`${t}-${i}`}
          className="sg-bar-zone"
          data-tone={t}
          style={{ left: pct(a), width: `${(scale.at(z) - scale.at(a)) * 100}%`, ...(b ? { borderRadius: radius(a, z) } : null) }}
        />
      ))}
      <span className="sg-bar-fill" style={{ width: pct(scale.value) }} />
      <span className="sg-bar-mark" style={{ left: pct(scale.value) }} />
    </span>
  );
}
