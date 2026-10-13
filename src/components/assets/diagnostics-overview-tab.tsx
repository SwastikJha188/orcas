"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { AssetMachine, DiagnosisRecord } from "./assets-data";
import { PillButton, PillNav } from "@/components/ui";
import type { SensorFailureReason } from "./diagnostics-pdf-data";
import { useMachineCatalog } from "./use-machine-catalog";
import { useKilnSimulationFor } from "@/providers/kiln-simulation-context";
import { RULE_BY_ID } from "@/lib/kiln-sim/rules";
import { DiagnosisRecordCard } from "./diagnosis/diagnosis-record-card";
import "./diagnosis/overview-tab.css";

export interface DiagnosticsOverviewTabProps {
  machine: AssetMachine;
  onNavigateToSensors?: () => void;
  onNavigateToTrends?: (metricKey?: string) => void;
  onNavigateToComponentHealth?: () => void;
}

type StatusFilterMode = "all_sensors" | "danger_only" | "alert_only";
type Severity = "Normal" | "Alert" | "Danger";
export type Tone = "good" | "warn" | "bad" | "neutral";

interface DisplaySensorItem {
  tag: string;
  point: string;
  name: string;
  subAssemblyTag: string;
  subAssemblyName: string;
  component: string;
  sensorType: string;
  unit: string;
  currentValue: number | string;
  nominalBand: string;
  warningAlertLimit: number | string;
  alarmDangerLimit: number | string;
  warningAlertLabel: string;
  alarmDangerLabel: string;
  standard: string;
  severity: Severity;
  deviationText?: string;
  reasons: SensorFailureReason[];
  isCalculated?: boolean;
  /** Residual against the reference model, in σ (live engine only). */
  z?: number | null;
  quality?: "Good" | "Suspect" | "Invalid";
  timeToLimit?: string | null;
}

interface FaultMode {
  id: string;
  code: string;
  name: string;
  expected: Severity;
  /** Share of the mode's signature sensors currently in excursion, 0–100 %. */
  score: number;
  signature: string[];
}

type SensorKind = "vib" | "temp" | "press" | "elec" | "speed" | "gas" | "other";

/* ISO 10816-3 velocity zone boundaries, mm/s RMS */
const ISO_B = 2.8;
const ISO_C = 4.5;
const ISO_D = 7.1;
/* Deviation bands against the reference model, σ */
const Z_WATCH = 2;
const Z_ALERT = 3;

const MODE_LIMIT = 8;

/** Latest `diagnosis_records` row for one machine (`/api/diagnosis`), or null when none is stored. */
function useDiagnosisRecord(machineId: string): { record: DiagnosisRecord | null; loading: boolean; failed: boolean } {
  const [state, setState] = useState<{ id: string; record: DiagnosisRecord | null; failed: boolean } | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/diagnosis?machineId=${encodeURIComponent(machineId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { data?: DiagnosisRecord[] }) => {
        if (cancelled) return;
        const rows = Array.isArray(j.data) ? j.data : [];
        setState({ id: machineId, record: rows[rows.length - 1] ?? null, failed: false });
      })
      .catch(() => {
        if (!cancelled) setState({ id: machineId, record: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [machineId]);
  const current = state?.id === machineId ? state : null;
  return { record: current?.record ?? null, loading: current === null, failed: current?.failed ?? false };
}

/** DB limits of 0 / 0 mean "not configured" in `mapped_signals`. */
function hasLimits(warningVal: number, alarmVal: number): boolean {
  return Number.isFinite(warningVal) && Number.isFinite(alarmVal) && !(warningVal === 0 && alarmVal === 0);
}

/** DB threshold text, unless it is the seed placeholder ("Warning" / "Alarm"). */
function limitLabel(text: string, val: number, unit: string, placeholder: string, configured: boolean): string {
  if (!configured) return "Not configured";
  const t = (text || "").trim();
  return t && t !== placeholder ? t : `${val} ${unit}`.trim();
}

/* ------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* ------------------------------------------------------------------------- */

function parseNumeric(val: number | string | undefined): number {
  if (typeof val === "number") return val;
  if (!val) return 0;
  const match = String(val).match(/-?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : 0;
}

/** Centre of a nominal band ("1.5 – 3.0", "−2.5 … −5.0"); `abs` for "± 20". */
function parseBand(band: string | undefined): { mid: number | null; abs: boolean } {
  const text = String(band ?? "").replace(/\u2212/g, "-").replace(/,/g, "");
  if (text.includes("±")) return { mid: null, abs: true };
  const nums = text.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  if (nums.length >= 2 && /[–…]|\.\.\.|\bto\b/.test(text)) return { mid: (nums[0] + nums[1]) / 2, abs: false };
  return { mid: null, abs: false };
}

function numericOrNull(val: number | string | undefined): number | null {
  if (typeof val === "number") return Number.isFinite(val) ? val : null;
  if (val === undefined || val === null) return null;
  const match = String(val).match(/-?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : null;
}

function sevClass(sev: Severity): "" | "is-warn" | "is-bad" {
  return sev === "Danger" ? "is-bad" : sev === "Alert" ? "is-warn" : "";
}

function sensorKind(sensorType: string, unit: string, tag: string): SensorKind {
  const st = (sensorType || "").toLowerCase();
  const u = (unit || "").toLowerCase();
  const t = (tag || "").toUpperCase();
  if (st.includes("vibrat") || u.includes("mm/s") || t.startsWith("VIB") || t.startsWith("VE-") || t.startsWith("ACC")) return "vib";
  if (st.includes("temp") || u.includes("°c") || t.startsWith("TMP") || t.startsWith("TE-")) return "temp";
  if (st.includes("press") || u.includes("bar") || t.startsWith("PRS") || t.startsWith("PT-")) return "press";
  if (u.includes("vol%") || u.includes("ppm") || t.startsWith("GAS")) return "gas";
  if (u.includes("rpm") || t.startsWith("SPD") || t.startsWith("SE-")) return "speed";
  if (u.includes("kw") || u === "a" || u.includes("%") || t.startsWith("ELE") || t.startsWith("IT-") || t.startsWith("PWR")) return "elec";
  return "other";
}

function KindIcon({ kind, size = 15 }: { kind: SensorKind; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (kind) {
    case "vib":
      return (
        <svg {...common}>
          <path d="M2 12h3l3-8 4 16 3-8h7" />
        </svg>
      );
    case "temp":
      return (
        <svg {...common}>
          <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
        </svg>
      );
    case "press":
      return (
        <svg {...common}>
          <circle cx="12" cy="13" r="8" />
          <path d="m15 10-3 3" />
          <path d="M12 3v2" />
        </svg>
      );
    case "elec":
      return (
        <svg {...common}>
          <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
        </svg>
      );
    case "speed":
      return (
        <svg {...common}>
          <path d="M4 18a9 9 0 1 1 16 0" />
          <path d="m12 14 4-5" />
        </svg>
      );
    case "gas":
      return (
        <svg {...common}>
          <path d="M9 3h6" />
          <path d="M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4a1.5 1.5 0 0 0 1.3-2L14 9V3" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <rect x="5" y="5" width="14" height="14" rx="2" />
          <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
        </svg>
      );
  }
}

function getIsoZone(sensor: DisplaySensorItem): "A" | "B" | "C" | "D" {
  if (sensor.severity === "Danger") return "D";
  if (sensor.severity === "Alert") return "C";
  const numVal = parseNumeric(sensor.currentValue);
  const isVib = sensor.unit === "mm/s" || sensor.sensorType.toLowerCase().includes("vibrat");
  if (isVib) {
    if (numVal >= ISO_D) return "D";
    if (numVal >= ISO_C) return "C";
    if (numVal >= ISO_B) return "B";
    return "A";
  }
  const warnLimit = parseNumeric(sensor.warningAlertLimit);
  if (warnLimit > 0 && numVal >= warnLimit * 0.82) return "B";
  return "A";
}

function formatValue(v: number | string): string {
  if (typeof v === "number") return Math.abs(v) >= 100 ? v.toFixed(1) : v.toFixed(2);
  return v;
}

function isNumericReading(v: number | string): boolean {
  return typeof v === "number" || /^-?\d+(\.\d+)?$/.test(String(v).trim());
}

function rowId(tag: string): string {
  return `dxo-row-${tag.replace(/[^A-Za-z0-9_-]/g, "_")}`;
}

function signatureWeight(current: Severity, expected: Severity): number {
  if (current === "Normal") return 0;
  if (current === "Danger" || current === expected) return 1;
  return 0.6; // Alert observed where the rule expects Danger
}

/* ------------------------------------------------------------------------- */
/* Visual primitives                                                          */
/* ------------------------------------------------------------------------- */

const STAT_ICONS: Record<string, React.ReactNode> = {
  health: <path d="M12 21s7-3.5 7-9.5V5l-7-2.5L5 5v6.5C5 17.5 12 21 12 21z" />,
  limit: (
    <>
      <path d="M4 20h16" />
      <path d="M4 6h16" strokeDasharray="2 3" />
      <path d="m7 16 4-4 3 2 4-5" />
    </>
  ),
  deviation: (
    <>
      <path d="M3 12h18" strokeDasharray="2 3" />
      <path d="M3 17c3 0 4-10 9-10s6 10 9 10" />
    </>
  ),
};

function StatLabel({ icon, kind, children }: { icon?: string; kind?: SensorKind; children: React.ReactNode }) {
  return (
    <span className="dxo-stat-label">
      {kind ? (
        <KindIcon kind={kind} size={14} />
      ) : icon ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {STAT_ICONS[icon]}
        </svg>
      ) : null}
      {children}
    </span>
  );
}

export interface GaugeBand {
  to: number;
  tone: Tone;
}

/** Banded linear gauge: state bands on a thin track, value marker(s) on top. */
export function BandGauge({
  min,
  max,
  bands,
  value,
  peak,
  ticks,
  ariaLabel,
}: {
  min: number;
  max: number;
  bands: GaugeBand[];
  value: number;
  peak?: number;
  ticks: Array<{ at: number; label: string }>;
  ariaLabel: string;
}) {
  const span = max - min || 1;
  const pos = (v: number) => Math.max(0, Math.min(100, ((v - min) / span) * 100));
  // Labels must not overlap. Each label's extent is estimated from its length
  // (≈3.4 % of a stat-card gauge per character) and anchoring: the first is
  // left-anchored, the last right-anchored, the rest centred. Limit ticks (the
  // middle ones) win; end labels show only where they fit.
  const CHAR = 3.4;
  const extent = (t: (typeof ticks)[number], i: number): [number, number] => {
    const p = pos(t.at);
    const w = t.label.length * CHAR + 1;
    if (i === 0) return [p, p + w];
    if (i === ticks.length - 1) return [p - w, p];
    return [p - w / 2, p + w / 2];
  };
  const kept: Array<{ t: (typeof ticks)[number]; i: number; x: [number, number] }> = [];
  const byPriority = ticks
    .map((t, i) => ({ t, i, end: i === 0 || i === ticks.length - 1 }))
    .sort((a, b) => Number(a.end) - Number(b.end));
  for (const c of byPriority) {
    const x = extent(c.t, c.i);
    if (kept.every((k) => x[1] <= k.x[0] || x[0] >= k.x[1])) kept.push({ t: c.t, i: c.i, x });
  }
  const visibleTicks = kept.sort((a, b) => a.i - b.i);
  let from = min;
  return (
    <div className="dxo-gauge" role="img" aria-label={ariaLabel}>
      <div className="dxo-gauge-track">
        {bands.map((b, i) => {
          const left = pos(from);
          const right = pos(Math.min(b.to, max));
          from = b.to;
          if (right <= left) return null;
          return (
            <span
              key={i}
              className={`dxo-gauge-band dxo-tone-${b.tone}`}
              style={{ left: `calc(${left}% + ${i === 0 ? 0 : 1}px)`, width: `calc(${right - left}% - ${i === 0 || i === bands.length - 1 ? 1 : 2}px)` }}
            />
          );
        })}
        {typeof peak === "number" && <span className="dxo-gauge-marker is-peak" style={{ left: `${pos(peak)}%` }} />}
        <span className="dxo-gauge-marker" style={{ left: `${pos(value)}%` }} />
      </div>
      {visibleTicks.map(({ t, i }) => (
        <span
          key={i}
          className={`dxo-gauge-tick ${i === 0 ? "is-first" : i === ticks.length - 1 ? "is-last" : ""}`}
          style={{ left: `${pos(t.at)}%` }}
        >
          {t.label}
        </span>
      ))}
    </div>
  );
}

/** Value against alert / alarm limits on a common scale. */
function LimitBar({ sensor }: { sensor: DisplaySensorItem }) {
  const v = isNumericReading(sensor.currentValue) ? parseNumeric(sensor.currentValue) : null;
  const w = numericOrNull(sensor.warningAlertLimit);
  const a = numericOrNull(sensor.alarmDangerLimit);
  if (v === null || w === null || a === null || (w === 0 && a === 0)) {
    return <span className="dxo-none">—</span>;
  }
  const lo = Math.min(0, v, w, a);
  const hi = Math.max(v, w, a);
  const padSpan = (hi - lo) * 0.12 || 1;
  const d0 = lo < 0 ? lo - padSpan : 0;
  const d1 = hi + padSpan;
  const W = 120;
  const x = (n: number) => 4 + ((n - d0) / (d1 - d0)) * (W - 8);
  const dotColor =
    sensor.severity === "Danger" ? "var(--status-danger)" : sensor.severity === "Alert" ? "var(--status-warning)" : "var(--dx-ink-2)";
  return (
    <svg
      className="dxo-limit-bar"
      viewBox={`0 0 ${W} 14`}
      role="img"
      aria-label={`${formatValue(v)} ${sensor.unit}; alert ${w} ${sensor.unit}; alarm ${a} ${sensor.unit}`}
    >
      <title>{`Value ${formatValue(v)} ${sensor.unit} · Alert ${w} ${sensor.unit} · Alarm ${a} ${sensor.unit}`}</title>
      <rect x="4" y="6" width={W - 8} height="2" rx="1" fill="var(--dx-track)" />
      <rect x={x(w) - 1} y="2" width="2" height="10" rx="1" fill="var(--status-warning)" />
      <rect x={x(a) - 1} y="2" width="2" height="10" rx="1" fill="var(--status-danger)" />
      <circle cx={x(v)} cy="7" r="4" fill={dotColor} stroke="var(--card-bg)" strokeWidth="2" />
    </svg>
  );
}

function Chevron({ dir = "down" }: { dir?: "down" | "right" }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {dir === "down" ? <polyline points="6 9 12 15 18 9" /> : <polyline points="9 6 15 12 9 18" />}
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3v18h18" />
      <path d="m7 15 4-4 3 3 6-6" />
    </svg>
  );
}

/* ------------------------------------------------------------------------- */
/* Page                                                                       */
/* ------------------------------------------------------------------------- */

export function DiagnosticsOverviewTab({
  machine,
  onNavigateToSensors,
  onNavigateToTrends,
  onNavigateToComponentHealth,
}: DiagnosticsOverviewTabProps) {
  const isKiln = machine.id === "KLN-01" || machine.id.includes("KLN");

  const [statusFilter, setStatusFilter] = useState<StatusFilterMode>("all_sensors");
  const [subAssemblyFilter, setSubAssemblyFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [modeFilter, setModeFilter] = useState<string | null>(null);
  const [showAllModes, setShowAllModes] = useState(false);
  const [expandedSensorTags, setExpandedSensorTags] = useState<Set<string>>(new Set());
  const [focus, setFocus] = useState<{ tag: string; n: number } | null>(null);

  const catalog = useMachineCatalog(machine);
  const simulation = useKilnSimulationFor(isKiln ? machine.id : null);
  const liveFrame = simulation?.frame ?? null;
  const diagnosis = useDiagnosisRecord(machine.id);

  /* ---------------------------- Sensor model ----------------------------
     Every row is one DB `mapped_signals` row (names, groups, limits, bands,
     reasons). KLN-01 overlays the live simulation value / state / residual;
     other machines show the stored (or MQTT-mapped) reading. */
  const allSensorsList = useMemo<DisplaySensorItem[]>(() => {
    return catalog.sensors.map((s) => {
      const live = s.live;
      const status = live ? live.status : s.status;
      const severity: Severity = status === "Critical" ? "Danger" : status === "Advisory" ? "Alert" : "Normal";
      const deviation = live
        ? live.quality !== "Good"
          ? `${live.quality}: ${live.qualityNote ?? "data quality"}`
          : live.z !== null
            ? `${live.z >= 0 ? "+" : "−"}${Math.abs(live.z).toFixed(1)}σ vs reference model${live.timeToLimit ? ` · limit in ${live.timeToLimit}` : ""}`
            : live.status === "Normal"
              ? "State normal"
              : `State ${live.display}`
        : severity !== "Normal"
          ? `State ${s.value} ${s.unit}`.trim()
          : undefined;
      const warn = Number(s.warningVal);
      const alarm = Number(s.alarmVal);
      const configured = hasLimits(warn, alarm);
      const stored: number | string = isNumericReading(s.value) ? Number(s.value) : s.value;
      return {
        tag: s.tag,
        point: s.point,
        name: s.name,
        subAssemblyTag: s.systemId,
        subAssemblyName: s.subAssembly,
        component: s.component,
        sensorType: s.sensorType,
        unit: s.unit,
        currentValue: live ? (live.value ?? live.display) : stored,
        nominalBand: s.nominalBand,
        warningAlertLimit: configured ? warn : "",
        alarmDangerLimit: configured ? alarm : "",
        warningAlertLabel: limitLabel(s.warningThreshold, warn, s.unit, "Warning", configured),
        alarmDangerLabel: limitLabel(s.alarmThreshold, alarm, s.unit, "Alarm", configured),
        standard: s.standard,
        severity,
        deviationText: deviation,
        reasons: s.reasons,
        isCalculated: s.source === "Calculated" || s.tag.startsWith("CAL-"),
        z: live?.z ?? null,
        quality: live?.quality,
        timeToLimit: live?.timeToLimit ?? null,
      };
    });
  }, [catalog.sensors]);

  const sensorByTag = useMemo(() => new Map(allSensorsList.map((s) => [s.tag, s])), [allSensorsList]);

  /* ------------------------------ Aggregates ---------------------------- */
  const totalMonitored = allSensorsList.length;
  const dangerCount = allSensorsList.filter((s) => s.severity === "Danger").length;
  const alertCount = allSensorsList.filter((s) => s.severity === "Alert").length;

  // Live engine for KLN-01; otherwise the machine's stored health index.
  const healthScore = liveFrame ? liveFrame.overall : machine.health;
  const healthTone: Tone = healthScore >= 90 ? "good" : healthScore >= 75 ? "warn" : "bad";

  // Sensor with the least headroom to its alert limit: 0 % at the centre of
  // its normal band, 100 % at the alert limit. Works for high, low, negative
  // and ± limits alike (a plain value / limit ratio does not).
  const nearestLimit = useMemo(() => {
    let best: { sensor: DisplaySensorItem; value: number; warn: number; alarm: number; ratio: number; ref: number; abs: boolean } | null = null;
    for (const s of allSensorsList) {
      if (!isNumericReading(s.currentValue)) continue;
      const v = parseNumeric(String(s.currentValue).replace(/\u2212/g, "-"));
      const w = numericOrNull(String(s.warningAlertLimit ?? "").replace(/\u2212/g, "-"));
      const a = numericOrNull(String(s.alarmDangerLimit ?? "").replace(/\u2212/g, "-"));
      if (w === null || a === null || w === a) continue;
      const band = parseBand(s.nominalBand);
      const abs = band.abs;
      const value = abs ? Math.abs(v) : v;
      const ref = band.mid ?? (abs ? 0 : a > w ? 0 : w + (w - a));
      if (w === ref) continue;
      const ratio = (value - ref) / (w - ref);
      if (!Number.isFinite(ratio)) continue;
      if (!best || ratio > best.ratio) best = { sensor: s, value, warn: w, alarm: a, ratio: Math.max(0, ratio), ref, abs };
    }
    return best;
  }, [allSensorsList]);

  // Largest residual against the live reference model.
  const largestDeviation = useMemo(() => {
    let best: DisplaySensorItem | null = null;
    for (const s of allSensorsList) {
      if (typeof s.z !== "number") continue;
      if (!best || Math.abs(s.z) > Math.abs(best.z as number)) best = s;
    }
    return best;
  }, [allSensorsList]);


  /* ----------------------------- Fault modes ---------------------------- */
  const faultModes = useMemo<FaultMode[]>(() => {
    let modes: FaultMode[];
    if (isKiln && liveFrame) {
      modes = liveFrame.rules.map((r) => ({
        id: r.id,
        code: r.id,
        name: r.name,
        expected: (r.severity === "Critical" ? "Danger" : "Alert") as FaultMode["expected"],
        score: r.status === "ACTIVE" ? r.confidence : r.status === "PENDING" ? Math.round(r.confidence * 0.5) : 0,
        signature: r.tags.length ? r.tags : RULE_BY_ID[r.id]?.inputs ?? [],
      }));
    } else {
      // DB failure-mode library: every rule linked to a sensor in
      // `mapped_signals.reasons`, scored by how many of its sensors are in excursion.
      const byRule = new Map<string, { name: string; tags: string[] }>();
      for (const s of allSensorsList) {
        for (const r of s.reasons) {
          if (!r.ruleId) continue;
          const entry = byRule.get(r.ruleId) ?? { name: r.ruleName || r.ruleId, tags: [] };
          if (!entry.tags.includes(s.tag)) entry.tags.push(s.tag);
          byRule.set(r.ruleId, entry);
        }
      }
      modes = Array.from(byRule.entries()).map(([ruleId, { name, tags }]) => {
        const sevs = tags.map((t) => sensorByTag.get(t)?.severity ?? "Normal");
        const expected: Severity = sevs.includes("Danger") ? "Danger" : "Alert";
        const hit = sevs.reduce((acc, sev) => acc + signatureWeight(sev, expected), 0);
        return {
          id: ruleId,
          code: ruleId,
          name,
          expected,
          score: Math.round((hit / tags.length) * 100),
          signature: tags,
        };
      });
    }
    return modes.sort((a, b) => b.score - a.score || a.code.localeCompare(b.code));
  }, [isKiln, allSensorsList, sensorByTag, liveFrame]);

  const activeMode = faultModes.find((m) => m.id === modeFilter) ?? null;
  const modeSignature = useMemo(() => new Set(activeMode?.signature ?? []), [activeMode]);
  const visibleModes = showAllModes ? faultModes : faultModes.slice(0, MODE_LIMIT);
  const engagedModes = faultModes.filter((m) => m.score > 0).length;

  /* ------------------------------ Register ------------------------------ */
  const filteredSensors = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return allSensorsList.filter((sensor) => {
      if (statusFilter === "danger_only" && sensor.severity !== "Danger") return false;
      if (statusFilter === "alert_only" && sensor.severity !== "Alert") return false;
      if (subAssemblyFilter !== "all" && sensor.subAssemblyTag !== subAssemblyFilter) return false;
      if (activeMode && !modeSignature.has(sensor.tag)) return false;
      if (query) {
        const hay = [sensor.tag, sensor.name, sensor.component, sensor.subAssemblyName, ...sensor.reasons.flatMap((r) => [r.primaryCause, r.ruleId, r.ruleName])]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [allSensorsList, statusFilter, subAssemblyFilter, searchQuery, activeMode, modeSignature]);

  // Exceptions first, then by tag — the register reads top-down by urgency.
  const orderedSensors = useMemo(() => {
    const rank: Record<Severity, number> = { Danger: 0, Alert: 1, Normal: 2 };
    return [...filteredSensors].sort((a, b) => rank[a.severity] - rank[b.severity]);
  }, [filteredSensors]);

  useEffect(() => {
    if (!focus) return;
    const el = document.getElementById(rowId(focus.tag));
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focus]);

  const toggleExpand = (tag: string) => {
    setExpandedSensorTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all_sensors");
    setSubAssemblyFilter("all");
    setModeFilter(null);
  };

  const focusSensor = (tag: string) => {
    resetFilters();
    setExpandedSensorTags((prev) => new Set(prev).add(tag));
    setFocus((prev) => ({ tag, n: (prev?.n ?? 0) + 1 }));
  };

  // Sub-assembly groups straight from DB `machine_systems`, with per-group counts.
  const groupOptions = catalog.systems.map((g) => {
    const n = allSensorsList.filter((s) => s.subAssemblyTag === g.systemId).length;
    return { id: g.systemId, label: `${g.shortName || g.name} · ${n}` };
  });

  // Live kiln: the scenario picker lives in the simulation bar and the
  // Sensors / Health pages are top-level tabs, so this toolbar would only
  // duplicate them.
  const showToolbar = !liveFrame && (!!onNavigateToSensors || !!onNavigateToComponentHealth);

  return (
    <div className="dxo-root">
      {/* Page scope: simulation scenario + cross-page navigation */}
      {showToolbar && (
        <div className="dxo-toolbar">
          <div className="dxo-toolbar-group" />
          <div className="dxo-toolbar-group">
            {onNavigateToSensors && (
              <PillButton variant="secondary" onClick={onNavigateToSensors} style={{ padding: "6px 14px", fontSize: "0.8rem" }}>
                Sensor mapping
              </PillButton>
            )}
            {onNavigateToComponentHealth && (
              <PillButton variant="secondary" onClick={onNavigateToComponentHealth} style={{ padding: "6px 14px", fontSize: "0.8rem" }}>
                Component health
              </PillButton>
            )}
          </div>
        </div>
      )}

      {/* ===================== Tier 1 · KPI strip ===================== */}
      <section className="dxo-kpis" aria-label="Machine condition indicators">
        <div className="dxo-card dxo-stat">
          <StatLabel icon="health">Health index</StatLabel>
          <div className="dxo-stat-value">
            <strong>{healthScore}</strong>
            <span className="dxo-unit">%</span>
          </div>
          <BandGauge
            min={0}
            max={100}
            bands={[
              { to: 75, tone: "bad" },
              { to: 90, tone: "warn" },
              { to: 100, tone: "good" },
            ]}
            value={healthScore}
            ticks={[
              { at: 0, label: "0" },
              { at: 75, label: "75" },
              { at: 90, label: "90" },
              { at: 100, label: "100 %" },
            ]}
            ariaLabel={`Health index ${healthScore} %, ${healthTone === "good" ? "normal" : healthTone === "warn" ? "advisory" : "critical"} band`}
          />
        </div>

        {nearestLimit ? (
          (() => {
            const { sensor: s, value, warn, alarm, ratio, ref, abs } = nearestLimit;
            const lower = alarm < warn;
            const tone: Tone = s.severity === "Danger" ? "bad" : s.severity === "Alert" ? "warn" : "good";
            // Scale spans the normal-band centre, both limits and the reading, padded.
            const lo0 = Math.min(ref, warn, alarm, value);
            const hi0 = Math.max(ref, warn, alarm, value);
            const pad = (hi0 - lo0) * 0.1 || 1;
            const min = abs ? 0 : lo0 - pad;
            const max = hi0 + pad;
            const bands: GaugeBand[] = lower
              ? [
                  { to: alarm, tone: "bad" },
                  { to: warn, tone: "warn" },
                  { to: max, tone: "good" },
                ]
              : [
                  { to: warn, tone: "good" },
                  { to: alarm, tone: "warn" },
                  { to: max, tone: "bad" },
                ];
            const fmtTick = (n: number) => String(Number(n.toFixed(2)));
            return (
              <button type="button" className="dxo-card dxo-stat dxo-stat-btn" onClick={() => focusSensor(s.tag)} aria-label={`Closest to limit: ${s.tag} ${s.name}, ${Math.round(ratio * 100)} % of the way from normal to its alert limit. Show in register`}>
                <StatLabel icon="limit">Closest to limit</StatLabel>
                <div className="dxo-stat-value">
                  <strong>{Math.round(ratio * 100)}</strong>
                  <span className="dxo-unit">% to alert</span>
                  <span className={`dxo-aside dxo-stat-tag dxo-tone-text-${tone}`}>{s.tag}</span>
                </div>
                <BandGauge
                  min={min}
                  max={max}
                  bands={bands}
                  value={value}
                  ticks={[
                    { at: min, label: fmtTick(min) },
                    { at: warn, label: fmtTick(warn) },
                    { at: alarm, label: fmtTick(alarm) },
                    { at: max, label: s.unit },
                  ]}
                  ariaLabel={`${s.tag} ${formatValue(value)} ${s.unit}; alert ${warn}, alarm ${alarm} ${s.unit}`}
                />
                <div className="dxo-stat-foot">
                  <span className="dxo-stat-name" title={s.name}>{s.name}</span>
                  <b>{formatValue(value)} {s.unit}</b>
                </div>
              </button>
            );
          })()
        ) : (
          <div className="dxo-card dxo-stat">
            <StatLabel icon="limit">Closest to limit</StatLabel>
            <div className="dxo-stat-value"><strong>—</strong></div>
            <div className="dxo-stat-foot">No sensors with alert limits</div>
          </div>
        )}

        {largestDeviation && typeof largestDeviation.z === "number" ? (
          (() => {
            const s = largestDeviation;
            const z = s.z as number;
            const az = Math.abs(z);
            const max = Math.max(4, Math.ceil(az + 0.5));
            return (
              <button type="button" className="dxo-card dxo-stat dxo-stat-btn" onClick={() => focusSensor(s.tag)} aria-label={`Largest deviation: ${s.tag} ${s.name}, ${z.toFixed(1)} sigma from reference model. Show in register`}>
                <StatLabel icon="deviation">Largest model deviation</StatLabel>
                <div className="dxo-stat-value">
                  <strong>{z >= 0 ? "+" : "−"}{az.toFixed(1)}</strong>
                  <span className="dxo-unit">σ</span>
                  <span className={`dxo-aside dxo-stat-tag dxo-tone-text-${az >= Z_ALERT ? "bad" : az >= Z_WATCH ? "warn" : "good"}`}>{s.tag}</span>
                </div>
                <BandGauge
                  min={0}
                  max={max}
                  bands={[
                    { to: Z_WATCH, tone: "good" },
                    { to: Z_ALERT, tone: "warn" },
                    { to: max, tone: "bad" },
                  ]}
                  value={az}
                  ticks={[
                    { at: 0, label: "0" },
                    { at: Z_WATCH, label: "2" },
                    { at: Z_ALERT, label: "3" },
                    { at: max, label: "σ" },
                  ]}
                  ariaLabel={`${s.tag} residual ${az.toFixed(1)} σ; watch 2 σ, alert 3 σ`}
                />
                <div className="dxo-stat-foot">
                  <span className="dxo-stat-name" title={s.name}>{s.name}</span>
                  {s.timeToLimit && <b>limit in {s.timeToLimit}</b>}
                </div>
              </button>
            );
          })()
        ) : (
          <div className="dxo-card dxo-stat">
            <StatLabel icon="deviation">Largest model deviation</StatLabel>
            <div className="dxo-stat-value"><strong>—</strong></div>
            <div className="dxo-stat-foot">No reference model for this machine</div>
          </div>
        )}
      </section>

      {/* ===================== Tier 2 · Condition ===================== */}
      <section className="dxo-primary" aria-label="Machine condition">
        <div className="dxo-card dxo-span-12">
          <div className="dxo-card-head">
            <h3 className="dxo-card-title">
              Fault modes <small>{engagedModes} / {faultModes.length} engaged</small>
            </h3>
            {faultModes.length > MODE_LIMIT && (
              <button type="button" className="dxo-link" aria-expanded={showAllModes} onClick={() => setShowAllModes((v) => !v)}>
                {showAllModes ? `Top ${MODE_LIMIT}` : `All ${faultModes.length}`}
              </button>
            )}
          </div>

          {faultModes.length === 0 ? (
            <div className="dxo-empty">No fault signatures defined</div>
          ) : (
            <div>
              <ul className="dxo-modes" aria-label="Fault modes ranked by signature match">
                {visibleModes.map((m) => {
                  const tone: Tone = m.score >= 50 ? (m.expected === "Danger" ? "bad" : "warn") : "neutral";
                  const isActive = modeFilter === m.id;
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        className={`dxo-mode-row ${isActive ? "is-active" : ""}`}
                        aria-pressed={isActive}
                        aria-label={`${m.code} ${m.name}: ${m.score} % signature match. ${isActive ? "Clear filter" : "Filter sensors"}`}
                        onClick={() => setModeFilter(isActive ? null : m.id)}
                      >
                        <span className="dxo-mode-code">{m.code}</span>
                        <span className="dxo-mode-name" title={m.name}>
                          {m.name}
                        </span>
                        <span className="dxo-bar-track" aria-hidden="true">
                          {m.score > 0 && <span className={`dxo-bar-fill dxo-tone-${tone}`} style={{ width: `${m.score}%` }} />}
                        </span>
                        <span className={`dxo-mode-val ${m.score === 0 ? "is-zero" : ""}`}>{m.score} %</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="dxo-mode-axis" aria-hidden="true">
                <span />
                <span />
                <span className="dxo-axis-scale">
                  <span style={{ left: "0%" }}>0</span>
                  <span style={{ left: "25%" }}>25</span>
                  <span style={{ left: "50%" }}>50</span>
                  <span style={{ left: "75%" }}>75</span>
                  <span style={{ left: "100%" }}>100</span>
                </span>
                <span className="dxo-axis-unit">match, %</span>
              </div>
            </div>
          )}
        </div>

        <DiagnosisRecordCard
          record={diagnosis.record}
          loading={diagnosis.loading}
          failed={diagnosis.failed}
          machineId={machine.id}
          frame={isKiln ? liveFrame : null}
        />
      </section>

      {/* ===================== Tier 3 · Register ===================== */}
      <section className="dxo-card dxo-table-card" aria-label="Sensor register">
        <div className="dxo-card-head">
          <h3 className="dxo-card-title">
            Register <small>{filteredSensors.length} / {totalMonitored}</small>
          </h3>
          <div className="dxo-toolbar-group">
            {activeMode && (
              <button type="button" className="dxo-filter-chip" onClick={() => setModeFilter(null)} aria-label={`Clear fault mode filter ${activeMode.code}`}>
                {activeMode.code}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
            <PillNav
              items={[
                { id: "all_sensors", label: `All ${totalMonitored}` },
                { id: "danger_only", label: `Critical ${dangerCount}` },
                { id: "alert_only", label: `Advisory ${alertCount}` },
              ]}
              activeId={statusFilter}
              onChange={(id) => setStatusFilter(id as StatusFilterMode)}
            />
            {groupOptions.length > 0 && (
              <span className="dxo-select">
                <select value={subAssemblyFilter} onChange={(e) => setSubAssemblyFilter(e.target.value)} aria-label="Filter by sub-assembly">
                  <option value="all">All sub-assemblies</option>
                  {groupOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <Chevron />
              </span>
            )}
            <span className="dxo-search">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tag, component, rule"
                aria-label="Search sensors"
              />
            </span>
          </div>
        </div>

        {allSensorsList.length === 0 ? (
          <div className="dxo-empty">
            {catalog.isLoading ? "Loading sensor catalog…" : `No sensors mapped for ${machine.id} in the catalog`}
          </div>
        ) : orderedSensors.length === 0 ? (
          <div className="dxo-empty">
            <span>No sensors match the current filters</span>
            <PillButton variant="secondary" onClick={resetFilters} style={{ padding: "6px 14px", fontSize: "0.8rem" }}>
              Reset filters
            </PillButton>
          </div>
        ) : (
          <div className="dxo-table-wrap">
            <table className="dxo-table">
              <thead>
                <tr>
                  <th scope="col">Sensor</th>
                  <th scope="col">Measurement</th>
                  <th scope="col" className="is-right">
                    Value
                  </th>
                  <th scope="col">Value vs alert / alarm</th>
                  <th scope="col">Zone</th>
                  <th scope="col">Diagnosis</th>
                  <th scope="col" className="is-right">
                    <span className="dxo-sr">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {orderedSensors.map((sensor) => {
                  const isOpen = expandedSensorTags.has(sensor.tag);
                  const zone = getIsoZone(sensor);
                  const kind = sensorKind(sensor.sensorType, sensor.unit, sensor.tag);
                  const sc = sevClass(sensor.severity);
                  const numeric = isNumericReading(sensor.currentValue);
                  const drawerId = `${rowId(sensor.tag)}-detail`;
                  return (
                    <React.Fragment key={sensor.tag}>
                      <tr
                        id={rowId(sensor.tag)}
                        className={`dxo-row ${isOpen ? "is-open" : ""} ${focus?.tag === sensor.tag ? "is-focus" : ""}`}
                        onClick={() => toggleExpand(sensor.tag)}
                      >
                        <td>
                          <div className="dxo-ident">
                            <span className={`dxo-badge ${sc}`}>
                              <KindIcon kind={kind} />
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <span className="dxo-primary-text">{sensor.tag}</span>
                              <span className="dxo-secondary-text">
                                {sensor.point ? `${sensor.point} · ` : ""}
                                {sensor.subAssemblyName}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="dxo-primary-text" style={{ fontWeight: 400 }}>
                            {sensor.name}
                          </span>
                          <span className="dxo-secondary-text">{sensor.component}</span>
                        </td>
                        <td className="is-right">
                          <span className={`dxo-readout ${sc}`}>
                            <strong>{formatValue(sensor.currentValue)}</strong>
                            {numeric && <span>{sensor.unit}</span>}
                          </span>
                        </td>
                        <td>
                          <LimitBar sensor={sensor} />
                        </td>
                        <td>
                          <span className={`dxo-zone ${zone === "C" ? "is-c" : zone === "D" ? "is-d" : ""}`} aria-label={`ISO zone ${zone}`}>
                            {zone}
                          </span>
                        </td>
                        <td>
                          {sensor.severity !== "Normal" ? (
                            <span className="dxo-rule" title={sensor.deviationText}>
                              <code>{sensor.reasons[0]?.ruleId ?? "—"}</code>
                              {sensor.deviationText || sensor.reasons[0]?.ruleName}
                            </span>
                          ) : (
                            <span className="dxo-none">—</span>
                          )}
                        </td>
                        <td className="is-right" onClick={(e) => e.stopPropagation()}>
                          <span className="dxo-actions">
                            {onNavigateToTrends && (
                              <button
                                type="button"
                                className="dxo-icon-btn"
                                aria-label={`Open trend for ${sensor.tag}`}
                                title="Trend"
                                onClick={() => onNavigateToTrends(sensor.tag)}
                              >
                                <TrendIcon />
                              </button>
                            )}
                            <button
                              type="button"
                              className="dxo-icon-btn"
                              aria-label={`${isOpen ? "Collapse" : "Expand"} diagnostics for ${sensor.tag}`}
                              aria-expanded={isOpen}
                              aria-controls={isOpen ? drawerId : undefined}
                              onClick={() => toggleExpand(sensor.tag)}
                            >
                              <Chevron />
                            </button>
                          </span>
                        </td>
                      </tr>

                      {isOpen && (
                        <tr className="dxo-drawer" id={drawerId}>
                          <td colSpan={7}>
                            <div className="dxo-drawer-grid">
                              <div>
                                <dl className="dxo-spec">
                                  <dt>Type</dt>
                                  <dd>{sensor.sensorType}</dd>
                                  <dt>Reference</dt>
                                  <dd>{sensor.nominalBand}</dd>
                                  <dt>Alert</dt>
                                  <dd>{sensor.warningAlertLabel}</dd>
                                  <dt>Alarm</dt>
                                  <dd>{sensor.alarmDangerLabel}</dd>
                                  <dt>Standard</dt>
                                  <dd>{sensor.standard}</dd>
                                  {sensor.deviationText && (
                                    <>
                                      <dt>Deviation</dt>
                                      <dd>{sensor.deviationText}</dd>
                                    </>
                                  )}
                                </dl>
                                {onNavigateToTrends && (
                                  <div className="dxo-drawer-actions" style={{ marginTop: 14 }}>
                                    <PillButton
                                      variant="primary"
                                      onClick={() => onNavigateToTrends(sensor.tag)}
                                      style={{ padding: "6px 14px", fontSize: "0.8rem" }}
                                    >
                                      Open trend
                                    </PillButton>
                                  </div>
                                )}
                              </div>

                              <div className="dxo-reasons">
                                {sensor.reasons.length === 0 ? (
                                  <span className="dxo-none">No failure modes linked</span>
                                ) : (
                                  sensor.reasons.map((r, i) => (
                                    <div className="dxo-reason" key={`${r.ruleId}-${i}`}>
                                      <h4 className="dxo-reason-head">
                                        <code>{r.ruleId}</code>
                                        {r.ruleName}
                                      </h4>
                                      <dl className="dxo-spec">
                                        <dt>Cause</dt>
                                        <dd>{r.primaryCause}</dd>
                                        <dt>Signature</dt>
                                        <dd>{r.symptomSignature}</dd>
                                        <dt>Impact</dt>
                                        <dd>{r.consequence}</dd>
                                        <dt>Action</dt>
                                        <dd>{r.prescriptiveAction}</dd>
                                        {r.crossCheckSensors && r.crossCheckSensors.length > 0 && (
                                          <>
                                            <dt>Cross-check</dt>
                                            <dd className="dxo-tags">
                                              {r.crossCheckSensors.map((t) =>
                                                sensorByTag.has(t) ? (
                                                  <button key={t} type="button" className="dxo-tag-btn" onClick={() => focusSensor(t)}>
                                                    {t}
                                                  </button>
                                                ) : (
                                                  <span key={t} className="dxo-tag-btn" style={{ cursor: "default" }}>
                                                    {t}
                                                  </span>
                                                )
                                              )}
                                            </dd>
                                          </>
                                        )}
                                      </dl>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
