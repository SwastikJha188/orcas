"use client";

import React from "react";
import type { DetailedSensorInfo } from "./machine-sensor-mapping-view";
import { severityTone } from "./assets-shell-ui";

/* ==========================================================================
   Sensor limit gauges. A reading drawn against its own warning and alarm
   limits: horizontal bar for diagram callouts (cards use sensor-charts). Handles rising limits (alarm above warning) and falling limits
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
}

function niceStep(span: number, count: number): number {
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / mag;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
}

export function gaugeScale(s: DetailedSensorInfo): GaugeScale | null {
  if (s.unit === "state") return null;
  const value = parseFloat(s.value);
  const warn = Number(s.warningVal);
  const alarm = Number(s.alarmVal);
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

/** Warning / alarm limits as one short line: "Warn ≥ 4.5 · Alarm ≥ 7.1 mm/s". */
export function GaugeLimits({ scale, unit }: { scale: GaugeScale; unit: string }) {
  const op = scale.rising ? "≥" : "≤";
  return (
    <span className="sg-limits ast-num">
      <span data-tone="warn">
        <i aria-hidden="true" />
        Warn {op} {formatScale(scale.warn)}
      </span>
      <span data-tone="bad">
        <i aria-hidden="true" />
        Alarm {op} {formatScale(scale.alarm)}
        {unit && unit !== "state" ? ` ${unit}` : ""}
      </span>
    </span>
  );
}

/** Zones as [from, to, tone] on the scale, ordered bottom → top. */
function zones(g: GaugeScale): Array<[number, number, "warn" | "bad"]> {
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
  return (
    <span
      className="sg-bar"
      data-tone={tone}
      role="img"
      aria-label={`${sensor.value} ${sensor.unit}; warning ${scale.warn}, alarm ${scale.alarm}`}
    >
      {zones(scale).map(([a, b, z]) => (
        <span key={z} className="sg-bar-zone" data-tone={z} style={{ left: pct(a), width: `${(scale.at(b) - scale.at(a)) * 100}%` }} />
      ))}
      <span className="sg-bar-fill" style={{ width: pct(scale.value) }} />
      <span className="sg-bar-mark" style={{ left: pct(scale.value) }} />
    </span>
  );
}
