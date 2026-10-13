"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AssetMachine } from "./assets-data";
import { PillButton } from "@/components/ui";
import { KilnSubAssemblyDiagram, DiagramPin } from "./kiln-component-diagrams";
import "./diagnosis/health.css";
import { isKilnMachine, useKilnSimulationFor } from "@/providers/kiln-simulation-context";
import {
  linkProcessStages,
  liveDrivers,
  liveProcessStages,
  liveSignalStrings,
  ruleFailureStatus,
} from "./kiln-live-overlay";
import { KILN_EXTRA_SUB_ASSEMBLIES } from "./kiln-subassembly-specs";
import { RULES, type RuleDef } from "@/lib/kiln-sim/rules";
import type { SimFrame } from "@/lib/kiln-sim/engine";
import { useMachineCatalog, type CatalogSensorView, type MachineCatalog } from "./use-machine-catalog";
import { useMachineProcesses } from "./use-machine-processes";

const RULE_BY_ID = new Map(RULES.map((r) => [r.id, r]));
const MAX_RULE_TAGS = 4;

export interface ComponentHealthViewProps {
  machine: AssetMachine;
  onNavigateToSensors?: () => void;
  onNavigateToTrends?: (metricKey?: string) => void;
}

export interface SubAssemblySpec {
  id: string;
  machineTag: string;
  machineName: string;
  name: string;
  shortName: string;
  health: number;
  status: "Normal" | "Advisory" | "Critical";
  criticality: "A" | "Context";
  makeModel: string;
  rating: string;
  speed: string;
  gearRatio: string;
  bearings: string;
  lubrication: string;
  environment: string;
  upstreamDrivers: Array<{ label: string; value: string }>;
  failureModes: Array<{
    mode: string;
    cause: string;
    symptom: string;
    rule: string;
    status: "Clear" | "Alert" | "Active";
  }>;
  pins: DiagramPin[];
  signals: Array<{
    tag: string;
    param: string;
    measured: string;
    model: string;
    residual: string;
    sigma: string;
    unit: string;
    normal: string;
    warning: string;
    alarm: string;
    status: "Normal" | "Advisory" | "Critical";
    valNum: number;
    warnNum: number;
    alarmNum: number;
    /** False when the DB holds no numeric warning / alarm limits for the signal. */
    hasLimits?: boolean;
  }>;
}

/* =========================================================================
   KILN PRIMARY SUB-ASSEMBLIES (Kiln Pyroprocessing Unit KLN-01)
   Static D5 enrichment only: drawing pin geometry, descriptive spec text and
   upstream-driver labels, keyed by DB sub-assembly id. Which components
   exist, their health, sensors, limits and failure modes come from the DB
   catalog (`useMachineCatalog`); the numbers below are never rendered.
   ========================================================================= */
const KILN_CORE_SUB_ASSEMBLIES: SubAssemblySpec[] = [
  // 1. MAIN MOTOR
  {
    id: "main-motor",
    machineTag: "DRV-KLN-01",
    machineName: "Drive Train",
    name: "Main Drive Motor (630 kW VFD Induction)",
    shortName: "Main Motor",
    health: 98,
    status: "Normal",
    criticality: "A",
    makeModel: "IEC 6-Pole Induction Motor IP55 (Siemens Flender)",
    rating: "630 kW, 690 V, VFD-fed Inverter Duty",
    speed: "745–1,120 rpm (Motor) · 3.80 rpm (Kiln)",
    gearRatio: "Direct coupling to gearbox input shaft",
    bearings: "Drive End: NU 228 + 6228 C3 · Non-Drive End: 6228 C3",
    lubrication: "High-temperature synthetic grease (interval 1,500 h)",
    environment: "5–45 °C ambient dust; radiant heat from kiln shell",
    upstreamDrivers: [
      { label: "Kiln Feed Rate", value: "330.0 t/h" },
      { label: "Kiln Operating Speed", value: "3.80 rpm" },
      { label: "Drive Torque Load", value: "62.1%" },
    ],
    failureModes: [
      { mode: "Motor bearing wear", cause: "Fatigue, grease degradation", symptom: "DE vibration × model ↑, bearing temperature ↑", rule: "R-DRV-01", status: "Clear" },
      { mode: "Coupling misalignment", cause: "Thermal growth, foundation settling", symptom: "Vibration ↑ on both coupling sides together", rule: "R-DRV-06", status: "Clear" },
      { mode: "Drive overload / mechanical drag", cause: "Shell rubbing, internal dam friction", symptom: "Torque ↑ with winding and oil following", rule: "R-DRV-08", status: "Clear" },
    ],
    pins: [
      { id: "P1", tag: "TMP-KLN-20", label: "Motor NDE Bearing Temp", value: "60.5", unit: "°C", status: "Normal", x: 216, y: 171, calloutX: 160, calloutY: 140, anchor: "right" },
      { id: "P2", tag: "TMP-KLN-21", label: "Motor Winding Temp", value: "100.0", unit: "°C", status: "Normal", x: 280, y: 152, calloutX: 160, calloutY: 215, anchor: "right" },
      { id: "P3", tag: "ELE-KLN-01", label: "Drive Torque / Current", value: "62.1", unit: "%", status: "Normal", x: 405, y: 52, calloutX: 520, calloutY: 52, anchor: "left" },
      { id: "P4", tag: "VIB-KLN-01", label: "Motor DE Vibration RMS", value: "1.60", unit: "mm/s", status: "Normal", x: 464, y: 151, calloutX: 520, calloutY: 125, anchor: "left" },
      { id: "P5", tag: "TMP-KLN-19", label: "Motor DE Bearing Temp", value: "65.0", unit: "°C", status: "Normal", x: 464, y: 191, calloutX: 520, calloutY: 195, anchor: "left" },
      { id: "P6", tag: "SPD-KLN-01", label: "Kiln Rotational Speed", value: "3.80", unit: "rpm", status: "Normal", x: 535, y: 172, calloutX: 520, calloutY: 265, anchor: "left" },
    ],
    signals: [
      { tag: "VIB-KLN-01", param: "Motor drive-end vibration (RMS)", measured: "1.60 mm/s", model: "1.52 mm/s", residual: "+0.08 mm/s", sigma: "+0.1 σ", unit: "mm/s", normal: "0.5–2.5", warning: "4.5", alarm: "7.1", status: "Normal", valNum: 1.6, warnNum: 4.5, alarmNum: 7.1 },
      { tag: "TMP-KLN-21", param: "Motor stator winding temperature", measured: "100.0 °C", model: "99.4 °C", residual: "+0.6 K", sigma: "+0.7 σ", unit: "°C", normal: "70–110", warning: "130", alarm: "140", status: "Normal", valNum: 100, warnNum: 130, alarmNum: 140 },
      { tag: "ELE-KLN-01", param: "Kiln drive torque / motor current", measured: "62.1 %", model: "62.0 %", residual: "+0.1 %", sigma: "+0.0 σ", unit: "%", normal: "45–75", warning: "90", alarm: "105", status: "Normal", valNum: 62.1, warnNum: 90, alarmNum: 105 },
      { tag: "SPD-KLN-01", param: "Kiln rotational speed", measured: "3.80 rpm", model: "3.80 rpm", residual: "0.00 rpm", sigma: "0.0 σ", unit: "rpm", normal: "3.0–4.5", warning: "< 2.9 / > 4.6", alarm: "< 2.5 / > 4.8", status: "Normal", valNum: 3.8, warnNum: 4.6, alarmNum: 4.8 },
      { tag: "TMP-KLN-19", param: "Motor DE bearing temperature", measured: "65.0 °C", model: "64.8 °C", residual: "+0.2 K", sigma: "+0.3 σ", unit: "°C", normal: "50–75", warning: "85", alarm: "95", status: "Normal", valNum: 65, warnNum: 85, alarmNum: 95 },
      { tag: "TMP-KLN-20", param: "Motor NDE bearing temperature", measured: "60.5 °C", model: "60.2 °C", residual: "+0.3 K", sigma: "+0.3 σ", unit: "°C", normal: "45–70", warning: "85", alarm: "95", status: "Normal", valNum: 60.5, warnNum: 85, alarmNum: 95 },
    ],
  },

  // 2. MAIN GEARBOX
  {
    id: "gearbox",
    machineTag: "DRV-KLN-01",
    machineName: "Drive Train",
    name: "Main Gearbox (3-Stage Helical · 35.5 : 1)",
    shortName: "Main Gearbox",
    health: 97,
    status: "Normal",
    criticality: "A",
    makeModel: "Siemens Flender KMPP 3-Stage Helical Reducer",
    rating: "Nominal power 950 kW; service factor 1.85",
    speed: "Input 944 rpm → Intermediate 152 rpm → Output 26.6 rpm",
    gearRatio: "35.5 : 1 total mechanical reduction",
    bearings: "Heavy-duty spherical roller & cylindrical roller bearings",
    lubrication: "Forced circulating oil ISO VG 320 with thermostatic control",
    environment: "Drive house; enclosed casing; forced oil cooling circuit",
    upstreamDrivers: [
      { label: "Motor Input Speed", value: "944 rpm" },
      { label: "Drive Torque Load", value: "62.1%" },
      { label: "Gearbox Oil Temp", value: "59.8 °C" },
    ],
    failureModes: [
      { mode: "Gearbox bearing wear", cause: "Fatigue, contaminated lube oil", symptom: "Input/output vibration ↑ with bearing temperature", rule: "R-DRV-01", status: "Clear" },
      { mode: "Gear teeth spalling / pitting", cause: "High contact stress, lubricant breakdown", symptom: "Meshing vibration harmonics rise with temperature", rule: "R-DRV-02", status: "Clear" },
      { mode: "Oil cooling loss", cause: "Fouled heat exchanger, water loss", symptom: "Oil temp ↑ at normal torque; pressure dip consistent", rule: "R-DRV-07", status: "Clear" },
    ],
    pins: [
      { id: "P1", tag: "VIB-KLN-02", label: "Gearbox Input Vibration", value: "1.85", unit: "mm/s", status: "Normal", x: 265, y: 160, calloutX: 160, calloutY: 85, anchor: "right" },
      { id: "P2", tag: "TMP-KLN-22", label: "Gearbox Input Bearing Temp", value: "69.9", unit: "°C", status: "Normal", x: 265, y: 195, calloutX: 160, calloutY: 175, anchor: "right" },
      { id: "P3", tag: "VIB-KLN-03", label: "Gearbox Output Vibration", value: "1.51", unit: "mm/s", status: "Normal", x: 430, y: 170, calloutX: 520, calloutY: 95, anchor: "left" },
      { id: "P4", tag: "TMP-KLN-23", label: "Gearbox Output Bearing Temp", value: "67.7", unit: "°C", status: "Normal", x: 430, y: 205, calloutX: 520, calloutY: 185, anchor: "left" },
    ],
    signals: [
      { tag: "VIB-KLN-02", param: "Gearbox input vibration (RMS)", measured: "1.85 mm/s", model: "1.80 mm/s", residual: "+0.05 mm/s", sigma: "+0.1 σ", unit: "mm/s", normal: "0.5–2.5", warning: "4.5", alarm: "7.1", status: "Normal", valNum: 1.85, warnNum: 4.5, alarmNum: 7.1 },
      { tag: "VIB-KLN-03", param: "Gearbox output vibration (RMS)", measured: "1.51 mm/s", model: "1.48 mm/s", residual: "+0.03 mm/s", sigma: "+0.1 σ", unit: "mm/s", normal: "0.5–2.5", warning: "4.5", alarm: "7.1", status: "Normal", valNum: 1.51, warnNum: 4.5, alarmNum: 7.1 },
      { tag: "TMP-KLN-22", param: "Gearbox input bearing temp", measured: "69.9 °C", model: "69.5 °C", residual: "+0.4 K", sigma: "+0.3 σ", unit: "°C", normal: "55–80", warning: "90", alarm: "100", status: "Normal", valNum: 69.9, warnNum: 90, alarmNum: 100 },
      { tag: "TMP-KLN-23", param: "Gearbox output bearing temp", measured: "67.7 °C", model: "67.4 °C", residual: "+0.3 K", sigma: "+0.3 σ", unit: "°C", normal: "55–80", warning: "90", alarm: "100", status: "Normal", valNum: 67.7, warnNum: 90, alarmNum: 100 },
    ],
  },

  // 3. HYDRAULIC THRUST STATION
  {
    id: "thrust",
    machineTag: "SUP-KLN-01",
    machineName: "Support & Thrust",
    name: "Thrust Station (Hydraulic Cylinder & LVDT Float)",
    shortName: "Thrust Station",
    health: 96,
    status: "Normal",
    criticality: "A",
    makeModel: "Hydraulic Thrust Roller with Integrated LVDT Cylinder & HPU",
    rating: "HPU 7.5 kW; normal operating pressure 40–120 bar; ±50 mm stroke",
    speed: "Controlled axial oscillation cycle (4–6 h period for full stroke)",
    gearRatio: "—",
    bearings: "Heavy-duty spherical roller thrust guide bearings",
    lubrication: "Hydraulic fluid ISO VG 46; continuous filtration",
    environment: "Station 2 pier; protected hydraulic cabinet; 3.5% downhill slope",
    upstreamDrivers: [
      { label: "Kiln Feed Rate", value: "330.0 t/h" },
      { label: "Downhill Gravity Component", value: "W·sin(3.5°)" },
      { label: "Hydraulic Pressure", value: "90.0 bar" },
    ],
    failureModes: [
      { mode: "Thrust hydraulic system fault", cause: "HPU pump failure, relief valve stick, oil leak", symptom: "Pressure collapse, downhill drift, limit switch hit", rule: "R-SUP-03", status: "Clear" },
      { mode: "Kiln not floating / near travel limit", cause: "Thrust control logic fault, excessive roller skew", symptom: "LVDT beyond ±22 mm or < 3 mm movement in 6 h", rule: "R-SUP-04", status: "Clear" },
    ],
    pins: [
      { id: "P1", tag: "POS-KLN-01", label: "Kiln Axial Float (LVDT)", value: "-3.1", unit: "mm", status: "Normal", x: 420, y: 135, calloutX: 520, calloutY: 85, anchor: "left" },
      { id: "P2", tag: "PRS-KLN-07", label: "Thrust Hydraulic Pressure", value: "90.0", unit: "bar", status: "Normal", x: 430, y: 205, calloutX: 520, calloutY: 175, anchor: "left" },
      { id: "P3", tag: "POS-KLN-02", label: "Travel Limit Switches", value: "CLEAR", unit: "state", status: "Normal", x: 204, y: 268, calloutX: 160, calloutY: 175, anchor: "right" },
    ],
    signals: [
      { tag: "POS-KLN-01", param: "Kiln axial position (LVDT on cylinder)", measured: "-3.1 mm", model: "-3.0 mm", residual: "-0.1 mm", sigma: "-0.0 σ", unit: "mm", normal: "± 20", warning: "± 30", alarm: "± 40", status: "Normal", valNum: -3.1, warnNum: 30, alarmNum: 40 },
      { tag: "PRS-KLN-07", param: "Thrust hydraulic pressure", measured: "90.0 bar", model: "86.0 bar", residual: "+4.0 bar", sigma: "+0.1 σ", unit: "bar", normal: "40–120", warning: "< 30 / > 150", alarm: "< 20 / > 180", status: "Normal", valNum: 90, warnNum: 150, alarmNum: 180 },
      { tag: "POS-KLN-02", param: "Thrust travel limit switches", measured: "CLEAR", model: "CLEAR", residual: "0", sigma: "0.0 σ", unit: "state", normal: "CLEAR", warning: "—", alarm: "LIMIT", status: "Normal", valNum: 1, warnNum: 0, alarmNum: 0 },
    ],
  },

  // 4. SHELL SCANNER & REFRACTORY
  {
    id: "shell-refractory",
    machineTag: "SHL-KLN-01",
    machineName: "Shell, Refractory & Seals",
    name: "Shell Scanner (Rotary Shell & IR Thermography)",
    shortName: "Shell Scanner",
    health: 98,
    status: "Normal",
    criticality: "A",
    makeModel: "Welded Steel Shell Ø4.8 m × 74 m + 200 mm Alumina/Magnesite Brick",
    rating: "Operating shell surface 250–330 °C; peak hot spot limit 380 °C",
    speed: "3.80 rpm rotational speed",
    gearRatio: "—",
    bearings: "Supported on 3 riding tyres (11 m, 39 m, 60 m)",
    lubrication: "Graphite lubrication bars on tyre bore inner diameters",
    environment: "Shell exterior 200–350 °C; interior combustion zone up to 1,450 °C",
    upstreamDrivers: [
      { label: "Burning Zone Temp", value: "1,448 °C" },
      { label: "Coal Fuel Rate", value: "10.57 t/h" },
      { label: "Kiln Feed Rate", value: "330.0 t/h" },
    ],
    failureModes: [
      { mode: "Refractory loss / casing hot spot", cause: "Thermal spalling, clinker chemical attack", symptom: "Local shell maximum above profile, fast rise", rule: "R-SHL-01", status: "Clear" },
      { mode: "Ring / coating build-up", cause: "Sulfur/alkali recirculation cycles", symptom: "Cold band 29–37 m + torque above model", rule: "R-SHL-02", status: "Clear" },
    ],
    pins: [
      { id: "P1", tag: "CAL-KLN-03", label: "Shell Maximum Temp", value: "327", unit: "°C", status: "Normal", x: 360, y: 220, calloutX: 160, calloutY: 85, anchor: "right" },
      { id: "P2", tag: "STS-KLN-08", label: "Scanner Area Coverage", value: "95.9", unit: "%", status: "Normal", x: 330, y: 27, calloutX: 520, calloutY: 85, anchor: "left" },
    ],
    signals: [
      { tag: "STS-KLN-08", param: "Shell scanner area coverage", measured: "95.9 %", model: "98.0 %", residual: "-2.1 %", sigma: "-0.2 σ", unit: "%", normal: "≥ 95 %", warning: "coverage < 90 %", alarm: "coverage < 80 %", status: "Normal", valNum: 95.9, warnNum: 90, alarmNum: 80 },
      { tag: "CAL-KLN-03", param: "Shell maximum temperature", measured: "327 °C", model: "323 °C", residual: "+4 K", sigma: "+0.4 σ", unit: "°C", normal: "250–330", warning: "380 or > 20 K/h", alarm: "420", status: "Normal", valNum: 327, warnNum: 380, alarmNum: 420 },
    ],
  },
];

/** All 15 D5 sub-assembly windows, in D5 §5 order. */
const KILN_WINDOW_ORDER = [
  "main-motor", "gearbox", "pinion-gear", "lubrication", "auxiliary-drive",
  "station-1", "station-2", "station-3", "thrust",
  "shell-refractory", "inlet-seal", "outlet-seal",
  "kiln-inlet", "feed-fuel", "burner-hood",
];
export const KILN_SUB_ASSEMBLIES: SubAssemblySpec[] = [...KILN_CORE_SUB_ASSEMBLIES, ...KILN_EXTRA_SUB_ASSEMBLIES].sort(
  (a, b) => KILN_WINDOW_ORDER.indexOf(a.id) - KILN_WINDOW_ORDER.indexOf(b.id),
);

/* =========================================================================
   HEALTH READOUT PRIMITIVES (shared with process-stages-view)
   Colour encodes state only; text always wears text tokens.
   ========================================================================= */

export type HealthState = "Normal" | "Advisory" | "Critical";

export const STATE_VAR: Record<HealthState, string> = {
  Normal: "var(--status-success)",
  Advisory: "var(--status-warning)",
  Critical: "var(--status-danger)",
};

/** Health score bands: ≥ 80 normal, 60–79 advisory, < 60 critical. */
export function scoreState(score: number): HealthState {
  if (score >= 80) return "Normal";
  if (score >= 60) return "Advisory";
  return "Critical";
}

/** |σ| bands: < 2 normal, 2–3 advisory, ≥ 3 critical. */
export function sigmaState(sigma: number): HealthState {
  const a = Math.abs(sigma);
  if (a >= 3) return "Critical";
  if (a >= 2) return "Advisory";
  return "Normal";
}

export function parseNumber(raw: string | number | undefined): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (!raw) return null;
  const m = raw.replace(/,/g, "").match(/[-+]?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

/** Signed σ from strings like "+2.8 σ" or "-0.01 vol% (0.1 σ)". */
export function parseSigma(input: string | undefined): number | null {
  if (!input) return null;
  const raw = input.replace(/−/g, "-"); // live labels use the typographic minus
  const m = raw.match(/([-+]?\d+(?:\.\d+)?)\s*σ/);
  if (!m) return null;
  let v = Number(m[1]);
  if (!/^[-+]/.test(m[1]) && raw.trim().startsWith("-")) v = -v;
  return v;
}

export function formatSigma(v: number): string {
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)} σ`;
}

export function StateTag({ status, label }: { status: HealthState; label?: string }) {
  return (
    <span className="dxh-state">
      <i style={{ background: STATE_VAR[status] }} aria-hidden="true" />
      {label ?? status}
    </span>
  );
}

export function KpiTile({
  label,
  value,
  unit,
  viz,
  foot,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  viz?: React.ReactNode;
  foot?: React.ReactNode;
}) {
  return (
    <div className="dxh-tile">
      <span className="dxh-tile-label">{label}</span>
      <span className="dxh-tile-value">
        {value}
        {unit && <span className="dxh-unit">{unit}</span>}
      </span>
      <div style={{ height: 10, display: "flex", alignItems: "center" }}>{viz}</div>
      <div className="dxh-tile-foot">{foot}</div>
    </div>
  );
}

/** Score meter 0–100: fill carries severity, ticks mark the 60 / 80 thresholds. */
export function ScoreMeter({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(100, value));
  const color = STATE_VAR[scoreState(v)];
  return (
    <svg className="dxh-strip" viewBox="0 0 100 10" preserveAspectRatio="none" role="img" aria-label={label}>
      <rect x={0} y={3.5} width={100} height={3} rx={1.5} fill="var(--dx-track)" />
      <rect x={0} y={3.5} width={v} height={3} rx={1.5} fill={color} />
      {[60, 80].map((t) => (
        <line key={t} x1={t} x2={t} y1={0} y2={10} stroke="var(--text-muted)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

/** One segment per item, coloured by its state. */
export function SegBar({ states, label }: { states: HealthState[]; label: string }) {
  return (
    <div className="dxh-segbar" role="img" aria-label={label}>
      {states.map((s, i) => (
        <i key={i} style={{ background: STATE_VAR[s] }} />
      ))}
    </div>
  );
}

/** Quantised instrument scale (discrete ticks). */
export function Ticks({ value, max = 100, state, count = 20 }: { value: number; max?: number; state: HealthState; count?: number }) {
  const filled = Math.max(0, Math.min(count, Math.round((value / (max || 1)) * count)));
  return (
    <span className="dxh-ticks" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <i key={i} style={i < filled ? { background: STATE_VAR[state] } : undefined} />
      ))}
    </span>
  );
}

/** Diverging residual meter, ±4 σ, guides at ±2 σ and ±3 σ. */
export function SigmaMeter({ sigma, width = 76 }: { sigma: number; width?: number }) {
  const half = width / 2;
  const scale = half / 4;
  const clamped = Math.max(-4, Math.min(4, sigma));
  const x = half + clamped * scale;
  const color = STATE_VAR[sigmaState(sigma)];
  return (
    <span className="dxh-meter">
      <svg width={width} height={14} viewBox={`0 0 ${width} 14`} role="img" aria-label={`Residual ${formatSigma(sigma)}`}>
        <rect x={0} y={6} width={width} height={2} rx={1} fill="var(--dx-track)" />
        {[-3, -2, 2, 3].map((g) => (
          <line key={g} x1={half + g * scale} x2={half + g * scale} y1={3} y2={11} stroke="var(--dx-stroke-soft)" strokeWidth={1} />
        ))}
        <rect x={Math.min(half, x)} y={4} width={Math.max(1.5, Math.abs(x - half))} height={6} rx={1} fill={color} />
        <line x1={half} x2={half} y1={1} y2={13} stroke="var(--text-muted)" strokeWidth={1} />
      </svg>
      <span>{formatSigma(sigma)}</span>
    </span>
  );
}

/** Max-|σ| strip for KPI tiles (0–4 σ). */
export function SigmaStrip({ sigma }: { sigma: number }) {
  const a = Math.min(4, Math.abs(sigma));
  return (
    <svg className="dxh-strip" viewBox="0 0 100 10" preserveAspectRatio="none" role="img" aria-label={`Largest residual ${formatSigma(sigma)} on a 0 to 4 sigma scale`}>
      <rect x={0} y={3.5} width={100} height={3} rx={1.5} fill="var(--dx-track)" />
      <rect x={0} y={3.5} width={(a / 4) * 100} height={3} rx={1.5} fill={STATE_VAR[sigmaState(sigma)]} />
      {[50, 75].map((t) => (
        <line key={t} x1={t} x2={t} y1={0} y2={10} stroke="var(--text-muted)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

/** Value against warning/alarm limits. Handles high-is-bad and low-is-bad limits. */
export function LimitMeter({
  value,
  warn,
  alarm,
  state,
  width = 110,
}: {
  value: number;
  warn: number;
  alarm: number;
  state: HealthState;
  width?: number;
}) {
  const lowIsBad = warn > alarm;
  let lo: number;
  let hi: number;
  if (lowIsBad) {
    const span = warn - alarm || Math.abs(warn) * 0.1 || 1;
    lo = alarm - span;
    hi = Math.max(value, warn + 2 * span);
  } else {
    // Negative high-is-bad limits (e.g. draft −1.5 / −0.5 mbar) need a scale below zero.
    lo = Math.min(0, value, warn);
    const top = Math.max(value, alarm);
    hi = top + Math.max(Math.abs(top - lo) * 0.15, 1e-6);
  }
  const sx = (v: number) => ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * width;
  const warnZone = lowIsBad ? [sx(alarm), sx(warn)] : [sx(warn), sx(alarm)];
  const badZone = lowIsBad ? [0, sx(alarm)] : [sx(alarm), width];
  const x = sx(value);
  return (
    <svg width={width} height={14} viewBox={`0 0 ${width} 14`} role="img" aria-label={`Value ${value} against warning ${warn} and alarm ${alarm}`}>
      <rect x={0} y={6} width={width} height={2} rx={1} fill="var(--dx-track)" />
      <rect x={warnZone[0]} y={6} width={Math.max(0, warnZone[1] - warnZone[0])} height={2} fill="var(--status-warning)" opacity={0.6} />
      <rect x={badZone[0]} y={6} width={Math.max(0, badZone[1] - badZone[0])} height={2} fill="var(--status-danger)" opacity={0.6} />
      <rect x={Math.max(0, Math.min(width - 2.5, x - 1.25))} y={1} width={2.5} height={12} rx={1} fill={STATE_VAR[state]} />
    </svg>
  );
}

/** Value against a normal operating band (band shaded neutral, marker carries state). */
export function BandMeter({
  value,
  lo,
  hi,
  state,
  width = 110,
}: {
  value: number;
  lo: number;
  hi: number;
  state: HealthState;
  width?: number;
}) {
  const span = hi - lo || Math.abs(hi) * 0.2 || 1;
  const min = Math.min(lo - span * 0.3, value);
  const max = Math.max(hi + span * 0.3, value);
  const sx = (v: number) => ((v - min) / (max - min)) * width;
  const x = sx(value);
  return (
    <svg width={width} height={14} viewBox={`0 0 ${width} 14`} role="img" aria-label={`Value ${value} within band ${lo} to ${hi}`}>
      <rect x={0} y={6} width={width} height={2} rx={1} fill="var(--dx-track)" />
      <rect x={sx(lo)} y={4} width={Math.max(1, sx(hi) - sx(lo))} height={6} rx={1.5} fill="var(--dx-stroke-soft)" />
      <rect x={Math.max(0, Math.min(width - 2.5, x - 1.25))} y={1} width={2.5} height={12} rx={1} fill={STATE_VAR[state]} />
    </svg>
  );
}

/** Sensor-type glyph inside a rounded badge; outline coloured by state. */
export function SensorBadge({ tag, state }: { tag: string; state: HealthState }) {
  const kind = tag.split("-")[0];
  let d: string;
  switch (kind) {
    case "VIB":
    case "ACC":
      d = "M1.5 8h2l1.5-4 2 8 2-8 2 8 1.5-4h2";
      break;
    case "TMP":
      d = "M6.5 9.8V3.5a1.5 1.5 0 0 1 3 0v6.3a3 3 0 1 1-3 0Z";
      break;
    case "PRS":
    case "NPSH":
    case "EFF":
      d = "M2.5 11a5.5 5.5 0 1 1 11 0M8 11l3-3.5";
      break;
    case "FLO":
      d = "M2 6h10l-2.5-2.5M14 10H4l2.5 2.5";
      break;
    case "ELE":
      d = "M9 1.5 4 9h4l-1 5.5L12 7H8Z";
      break;
    case "SPD":
      d = "M13 8a5 5 0 1 1-1.6-3.7M13 2v3h-3";
      break;
    case "POS":
    case "CAL":
      d = "M2 11.5 11.5 2 14 4.5 4.5 14ZM5 8.5l1.5 1.5M7.5 6l1.5 1.5M10 3.5l1.5 1.5";
      break;
    case "GAS":
      d = "M4.5 12.5a3 3 0 0 1 .3-6 4 4 0 0 1 7.6 1.2 2.4 2.4 0 0 1-.4 4.8Z";
      break;
    case "OIL":
      d = "M8 2S3.5 7.3 3.5 10a4.5 4.5 0 0 0 9 0C12.5 7.3 8 2 8 2Z";
      break;
    case "STS":
      d = "M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2ZM5.5 8l1.8 1.8 3.2-3.3";
      break;
    default:
      d = "M8 3a5 5 0 1 0 0 10A5 5 0 0 0 8 3Zm0 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z";
  }
  return (
    <span className="dxh-badge" aria-hidden="true">
      <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke={STATE_VAR[state]} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
      </svg>
    </span>
  );
}

/* =========================================================================
   VIEW
   ========================================================================= */

const FM_STATE: Record<"Clear" | "Alert" | "Active", HealthState> = {
  Clear: "Normal",
  Alert: "Advisory",
  Active: "Critical",
};

interface RankRow {
  key: string;
  name: string;
  role: string;
  score: number;
  subId: string;
}

interface ProcessRow {
  key: string;
  name: string;
  score: number;
  metric: string;
  tag: string;
}

/** Static D5 enrichment (pin geometry, spec text, driver labels) keyed by DB sub-assembly id. */
const KILN_SPEC_BY_ID = new Map(KILN_SUB_ASSEMBLIES.map((s) => [s.id, s]));

/** DB threshold placeholders the catalog hook substitutes for NULL columns. */
const LIMIT_PLACEHOLDERS = new Set(["", "—", "Nominal", "Warning", "Alarm"]);

/** "4.5 mm/s (ISO 20816-3 Alert)" → "4.5 mm/s"; placeholders → "—". */
function limitText(raw: string | undefined): string {
  const t = (raw ?? "").trim();
  if (LIMIT_PLACEHOLDERS.has(t)) return "—";
  return t.replace(/\s*\([^)]*\)\s*$/, "").trim() || t;
}

function toScore(v: number | string): number {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

const STATUS_RANK: Record<HealthState, number> = { Normal: 0, Advisory: 1, Critical: 2 };

/** One signal-table row from a DB catalog sensor (live values already overlaid by the hook). */
function catalogSignal(s: CatalogSensorView, frame: SimFrame | null): SubAssemblySpec["signals"][number] {
  const isState = s.unit === "state";
  const live = frame ? liveSignalStrings(s.tag, frame) : null;
  const normal = limitText(s.normalThreshold);
  return {
    tag: s.tag,
    param: s.name,
    measured: `${s.value}${isState || !s.unit ? "" : ` ${s.unit}`}`,
    model: live?.model ?? "—",
    residual: live?.residual ?? "—",
    sigma: live?.sigma ?? "—",
    unit: s.unit,
    normal: normal === "—" ? limitText(s.nominalBand) : normal,
    warning: limitText(s.warningThreshold),
    alarm: limitText(s.alarmThreshold),
    status: s.status,
    valNum: s.numericValue,
    warnNum: s.warningVal,
    alarmNum: s.alarmVal,
    hasLimits: !isState && !(s.warningVal === 0 && s.alarmVal === 0),
  };
}

/**
 * Component rows built from the DB catalog: every sub-assembly the DB holds,
 * its health/status (live for KLN-01), its mapped sensors with DB limits, and
 * failure modes from the sensors' DB rule reasons. The static kiln specs only
 * add drawing pin geometry, descriptive text and live upstream drivers.
 */
function buildAssemblies(catalog: MachineCatalog, frame: SimFrame | null, kiln: boolean): SubAssemblySpec[] {
  const systemName = new Map(catalog.systems.map((s) => [s.systemId, s.name]));
  const byTag = new Map(catalog.sensors.map((s) => [s.tag, s]));
  return catalog.subassemblies.map((sa) => {
    const id = sa.subassemblyId;
    let sensors = catalog.sensors.filter((s) => s.subassemblyId === id);
    if (sensors.length === 0) {
      sensors = (sa.sensorTags ?? []).map((t) => byTag.get(t)).filter((s): s is CatalogSensorView => Boolean(s));
    }
    const spec = kiln ? KILN_SPEC_BY_ID.get(id) : undefined;

    const pins: DiagramPin[] = [];
    if (spec) {
      for (const geo of spec.pins) {
        const s = sensors.find((x) => x.tag === geo.tag);
        if (!s) continue;
        pins.push({ ...geo, id: s.point || geo.id, label: s.name, value: s.value, unit: s.unit, status: s.status });
      }
    }

    const modes = new Map<string, SubAssemblySpec["failureModes"][number] & { worst: HealthState }>();
    for (const s of sensors) {
      for (const r of s.reasons) {
        if (!r.ruleId) continue;
        const prev = modes.get(r.ruleId);
        if (prev) {
          if (STATUS_RANK[s.status] > STATUS_RANK[prev.worst]) prev.worst = s.status;
          continue;
        }
        modes.set(r.ruleId, {
          mode: r.ruleName,
          cause: r.primaryCause,
          symptom: r.symptomSignature,
          rule: r.ruleId,
          status: "Clear",
          worst: s.status,
        });
      }
    }
    const failureModes = [...modes.values()].map(({ worst, ...fm }) => ({
      ...fm,
      status: frame
        ? ruleFailureStatus(frame, fm.rule)
        : worst === "Critical"
          ? ("Active" as const)
          : worst === "Advisory"
            ? ("Alert" as const)
            : ("Clear" as const),
    }));

    return {
      id,
      machineTag: sa.systemId,
      machineName: systemName.get(sa.systemId) ?? sa.systemId,
      name: sa.name,
      shortName: sa.shortName || sa.name,
      health: toScore(sa.health),
      status: sa.status,
      criticality: sa.criticality === "Context" ? "Context" : "A",
      makeModel: spec?.makeModel ?? "",
      rating: spec?.rating ?? "",
      speed: spec?.speed ?? "",
      gearRatio: spec?.gearRatio ?? "",
      bearings: spec?.bearings ?? "",
      lubrication: spec?.lubrication ?? "",
      environment: spec?.environment ?? "",
      upstreamDrivers: spec && frame ? liveDrivers(spec.upstreamDrivers, frame) : [],
      failureModes,
      pins,
      signals: sensors.map((s) => catalogSignal(s, frame)),
    };
  });
}

export function ComponentHealthView({ machine, onNavigateToSensors }: ComponentHealthViewProps) {
  const isKiln = isKilnMachine(machine.id);
  const simulation = useKilnSimulationFor(isKiln ? machine.id : null);
  const frame = simulation?.frame ?? null;
  const catalog = useMachineCatalog(machine);
  const { stages: storedStages } = useMachineProcesses(machine);

  const activeAssemblies = useMemo(() => buildAssemblies(catalog, frame, isKiln), [catalog, frame, isKiln]);

  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);

  // A different machine starts from its own lowest component.
  useEffect(() => {
    setSelectedRowKey(null);
    setSelectedPinId(null);
  }, [machine.id]);

  /** Process rows from the DB `process_stages`, with live stage health for KLN-01. */
  const processRows: ProcessRow[] = useMemo(() => {
    const links = linkProcessStages(storedStages, catalog);
    const stages = frame ? liveProcessStages(storedStages, frame, links) : storedStages;
    return stages
      .map((st) => {
        const p = st.parameters[0];
        return {
          key: st.id,
          name: st.name,
          score: toScore(st.health),
          metric: p ? `${p.label} · ${p.value}${p.unit ? ` ${p.unit}` : ""}` : st.role,
          tag: st.healthNotes,
        };
      })
      .sort((a, b) => a.score - b.score);
  }, [storedStages, catalog, frame]);

  /** Ranked component rows (worst first). */
  const rankRows: RankRow[] = useMemo(
    () =>
      activeAssemblies
        .map((a) => ({ key: a.id, name: a.shortName, role: a.machineName, score: a.health, subId: a.id }))
        .sort((a, b) => a.score - b.score),
    [activeAssemblies],
  );

  // Pin the first pick (lowest at load) so live re-ranking never swaps the open component.
  useEffect(() => {
    if (selectedRowKey === null && rankRows.length > 0) setSelectedRowKey(rankRows[0].key);
  }, [selectedRowKey, rankRows]);

  const allSignals = useMemo(
    () =>
      activeAssemblies.flatMap((a) =>
        a.signals.flatMap((s) => {
          const sigmaNum = parseSigma(s.sigma);
          return sigmaNum === null ? [] : [{ ...s, sigmaNum }];
        }),
      ),
    [activeAssemblies],
  );

  if (catalog.isLoading) {
    return (
      <div className="dxh-root">
        <div className="dxh-empty" role="status" aria-live="polite">
          Loading components…
        </div>
      </div>
    );
  }

  if (rankRows.length === 0) {
    return (
      <div className="dxh-root">
        <div className="dxh-empty" role="status">
          No components are recorded in the database for this machine.
        </div>
      </div>
    );
  }

  const selectedRow = rankRows.find((r) => r.key === selectedRowKey) ?? rankRows[0];
  const activeSubAssembly = activeAssemblies.find((a) => a.id === selectedRow?.subId) ?? activeAssemblies[0];
  const hasDrawing = isKiln && KILN_SPEC_BY_ID.has(activeSubAssembly.id);

  const topSignal = allSignals.reduce<(typeof allSignals)[number] | null>(
    (best, s) => (!best || Math.abs(s.sigmaNum) > Math.abs(best.sigmaNum) ? s : best),
    null,
  );

  const allModes = activeAssemblies.flatMap((a) => a.failureModes);
  const activeCount = allModes.filter((m) => m.status === "Active").length;
  const alertCount = allModes.filter((m) => m.status === "Alert").length;

  const machineScore: number | null = frame ? frame.overall : typeof machine.health === "number" ? machine.health : null;
  const machineState = machineScore !== null ? scoreState(machineScore) : null;
  const machineStatus = frame
    ? frame.condition === "Healthy"
      ? "Healthy"
      : "Attention required"
    : machineState === null
      ? "No health record"
      : machineState === "Normal"
        ? "Healthy"
        : "Attention required";

  const selectRow = (row: RankRow) => {
    setSelectedRowKey(row.key);
    setSelectedPinId(null);
  };

  const togglePin = (tag: string) => setSelectedPinId((prev) => (prev === tag ? null : tag));

  const specs = [
    ["Make / model", activeSubAssembly.makeModel],
    ["Rating", activeSubAssembly.rating],
    ["Speed", activeSubAssembly.speed],
    ["Reduction", activeSubAssembly.gearRatio],
    ["Bearings", activeSubAssembly.bearings],
    ["Lubrication", activeSubAssembly.lubrication],
    ["Environment", activeSubAssembly.environment],
  ].filter(([, v]) => v && v !== "—");

  const fmActive = activeSubAssembly.failureModes.filter((m) => m.status === "Active").length;
  const fmAlert = activeSubAssembly.failureModes.filter((m) => m.status === "Alert").length;

  return (
    <div className="dxh-root">
      {/* Tier 1 · KPI strip */}
      <section className="dxh-kpis" style={{ "--dxh-kpi-count": 3 } as React.CSSProperties} aria-label="Health summary">
        <KpiTile
          label="Machine health"
          value={machineScore ?? "—"}
          unit={machineScore !== null ? "%" : undefined}
          viz={machineScore !== null && <ScoreMeter value={machineScore} label={`Machine health ${machineScore} %`} />}
          foot={machineState ? <StateTag status={machineState} label={machineStatus} /> : <span>{machineStatus}</span>}
        />
        <KpiTile
          label="Failure modes flagged"
          value={activeCount + alertCount}
          unit={`/ ${allModes.length}`}
          viz={<SegBar states={allModes.map((m) => FM_STATE[m.status])} label={`${activeCount} active, ${alertCount} alert`} />}
          foot={<span>{`${activeCount} active · ${alertCount} alert`}</span>}
        />
        <KpiTile
          label="Largest residual"
          value={topSignal ? formatSigma(topSignal.sigmaNum).replace(" σ", "") : "—"}
          unit="σ"
          viz={topSignal && <SigmaStrip sigma={topSignal.sigmaNum} />}
          foot={topSignal ? <span>{topSignal.tag}</span> : <span>No model residuals</span>}
        />
      </section>

      {/* Tier 2 · Schematic + ranked health */}
      <section className="dxh-grid">
        <div className="dxh-card dxh-span-7">
          <header className="dxh-card-head">
            <div>
              <h3 className="dxh-card-title">{activeSubAssembly.name}</h3>
              <span className="dxh-meta">{activeSubAssembly.machineTag}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <StateTag status={activeSubAssembly.status} label={`${activeSubAssembly.health} %`} />
              {onNavigateToSensors && (
                <PillButton variant="secondary" onClick={onNavigateToSensors}>
                  Sensor mapping
                </PillButton>
              )}
            </div>
          </header>

          {hasDrawing ? (
            <KilnSubAssemblyDiagram
              subAssemblyId={activeSubAssembly.id}
              pins={activeSubAssembly.pins}
              selectedPinId={selectedPinId}
              onSelectPin={(pin) => togglePin(pin.tag)}
              ariaLabel={`${activeSubAssembly.name} schematic with ${activeSubAssembly.pins.length} measurement points`}
            />
          ) : (
            <div className="dxh-empty" role="status">
              {`No schematic drawing for this component · ${activeSubAssembly.signals.length} mapped sensor${activeSubAssembly.signals.length === 1 ? "" : "s"} listed below`}
            </div>
          )}

          {activeSubAssembly.upstreamDrivers.length > 0 && (
            <div className="dxh-readouts">
              {activeSubAssembly.upstreamDrivers.map((d) => (
                <div className="dxh-readout" key={d.label} title={`${d.label}: ${d.value}`}>
                  <span>{d.label}</span>
                  <strong>{d.value}</strong>
                </div>
              ))}
            </div>
          )}

          {specs.length > 0 && (
            <details className="dxh-details">
              <summary>
                <svg width={10} height={10} viewBox="0 0 10 10" aria-hidden="true">
                  <path d="M3 1.5 6.5 5 3 8.5" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Specifications
              </summary>
              <dl className="dxh-kv">
                {specs.map(([k, v]) => (
                  <React.Fragment key={k}>
                    <dt>{k}</dt>
                    <dd style={{ whiteSpace: "normal" }}>{v}</dd>
                  </React.Fragment>
                ))}
              </dl>
            </details>
          )}
        </div>

        <div className="dxh-card dxh-span-5 dxh-fit-card">
          <header className="dxh-card-head">
            <div>
              <h3 className="dxh-card-title">Health ranking</h3>
              <span className="dxh-meta">{`${rankRows.length} components · lowest first`}</span>
            </div>
          </header>

          <div className="dxh-fit-scroll">

          <div className="dxh-rank" role="group" aria-label="Components">
            <span className="dxh-group-label">Components</span>
            {rankRows.map((row) => {
              const state = scoreState(row.score);
              const selected = row.key === selectedRow?.key;
              return (
                <button
                  key={row.key}
                  type="button"
                  className="dxh-row-btn"
                  aria-pressed={selected}
                  onClick={() => selectRow(row)}
                >
                  <span className="dxh-row-name">
                    <strong>{row.name}</strong>
                    <span>{row.role}</span>
                  </span>
                  <Ticks value={row.score} state={state} />
                  <span className="dxh-row-score">{row.score} %</span>
                </button>
              );
            })}
          </div>

          <hr className="dxh-divider" />

          <div className="dxh-rank" role="group" aria-label="Processes">
            <span className="dxh-group-label">Processes</span>
            {processRows.length === 0 && <span className="dxh-meta">No process stages in the database.</span>}
            {processRows.map((p) => (
              <div key={p.key} className="dxh-row-btn" title={p.tag}>
                <span className="dxh-row-name">
                  <strong>{p.name}</strong>
                  <span>{p.metric}</span>
                </span>
                <Ticks value={p.score} state={scoreState(p.score)} />
                <span className="dxh-row-score">{p.score} %</span>
              </div>
            ))}
          </div>
          </div>
        </div>
      </section>

      {/* Tier 3 · Signals + failure modes */}
      <section className="dxh-grid dxh-grid-tall">
        <div className="dxh-card dxh-span-8">
          <header className="dxh-card-head">
            <div>
              <h3 className="dxh-card-title">Signals</h3>
              <span className="dxh-meta">{`${activeSubAssembly.shortName} · ${activeSubAssembly.signals.length}`}</span>
            </div>
          </header>
          <div className="dxh-table-wrap">
            <table className="dxh-table">
              <thead>
                <tr>
                  <th>Signal</th>
                  <th>Measured</th>
                  <th>Residual</th>
                  <th>Limits</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {activeSubAssembly.signals.map((sig) => {
                  const sigma = parseSigma(sig.sigma);
                  const isState = sig.unit === "state";
                  const absolute = sig.normal.trim().startsWith("±");
                  const selected = selectedPinId === sig.tag;
                  return (
                    <tr
                      key={sig.tag}
                      tabIndex={0}
                      aria-selected={selected}
                      onClick={() => togglePin(sig.tag)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          togglePin(sig.tag);
                        }
                      }}
                    >
                      <td>
                        <div className="dxh-cell-item">
                          <SensorBadge tag={sig.tag} state={sig.status} />
                          <div>
                            <strong>{sig.tag}</strong>
                            <span title={sig.param}>{sig.param}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="dxh-cell-stack">
                          <strong>{sig.measured}</strong>
                          <span>{`model ${sig.model}`}</span>
                        </div>
                      </td>
                      <td>
                        <div className="dxh-cell-stack">
                          {sigma !== null ? <SigmaMeter sigma={sigma} /> : <strong>{sig.residual}</strong>}
                          {sigma !== null && <span>{sig.residual}</span>}
                        </div>
                      </td>
                      <td>
                        <div className="dxh-cell-stack">
                          {isState || sig.hasLimits === false ? (
                            <strong title={sig.normal}>{sig.normal}</strong>
                          ) : (
                            <LimitMeter
                              value={absolute ? Math.abs(sig.valNum) : sig.valNum}
                              warn={sig.warnNum}
                              alarm={sig.alarmNum}
                              state={sig.status}
                              width={96}
                            />
                          )}
                          <span title={`Warning ${sig.warning} · Alarm ${sig.alarm}`}>
                            {sig.warning === "—" && sig.alarm === "—" ? "No limits in DB" : `W ${sig.warning} · A ${sig.alarm}`}
                          </span>
                        </div>
                      </td>
                      <td>
                        <StateTag status={sig.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dxh-card dxh-span-4 dxh-fit-card">
          <header className="dxh-card-head">
            <div>
              <h3 className="dxh-card-title">Failure modes</h3>
              <span className="dxh-meta">{`${fmActive} active · ${fmAlert} alert`}</span>
            </div>
          </header>
          <div className="dxh-fit-scroll">
          <div className="dxh-fm">
            {activeSubAssembly.failureModes.map((fm) => {
              const rules = fm.rule
                .split("/")
                .map((id) => RULE_BY_ID.get(id.trim()))
                .filter((r): r is RuleDef => Boolean(r));
              return (
                <div key={fm.rule + fm.mode} className="dxh-fm-row" title={`Cause: ${fm.cause}`}>
                  <div>
                    <span className="dxh-fm-rule">{fm.rule}</span>
                    <strong>{fm.mode}</strong>
                  </div>
                  <StateTag status={FM_STATE[fm.status]} label={fm.status} />
                  <small>{fm.symptom}</small>
                  {rules.length > 0 && (
                    <div className="dxh-fm-trigger">
                      {rules.map((r, i) => (
                        <div key={r.id} className="dxh-fm-cond">
                          {i === 0 && <span className="dxh-fm-trigger-label">Activates when</span>}
                          {rules.length > 1 && <span className="dxh-fm-rule">{r.id}</span>}
                          <span>{r.logic}</span>
                          <span className="dxh-fm-tags">
                            {r.inputs.slice(0, MAX_RULE_TAGS).map((t) => (
                              <code key={t}>{t}</code>
                            ))}
                            {r.inputs.length > MAX_RULE_TAGS && (
                              <code title={r.inputs.slice(MAX_RULE_TAGS).join(", ")}>
                                +{r.inputs.length - MAX_RULE_TAGS}
                              </code>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {activeSubAssembly.failureModes.length === 0 && (
              <span className="dxh-meta">No failure modes are recorded in the database for this component.</span>
            )}
          </div>
          {isKiln && activeSubAssembly.failureModes.length > 0 && (
            <p className="dxh-fm-note">
              A rule raises its mode after 2–4 consecutive breaching samples (1 when critical) and clears after 4 clean
              samples.
            </p>
          )}
          </div>
        </div>
      </section>
    </div>
  );
}
