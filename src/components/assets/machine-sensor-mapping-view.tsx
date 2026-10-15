"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { AssetMachine } from "./assets-data";
import { PillButton } from "@/components/ui";
import type { KilnSimulation } from "./kiln-seals-simulation";
import type { KilnSealsSensorData } from "./kiln-seals-types";
import { useMachineCatalog, type CatalogSensorView } from "./use-machine-catalog";
import { useMachineAcquisition } from "./acquisition/use-machine-acquisition";
import { isKilnMachine, isLiveMachine, useKilnSimulationFor } from "@/providers/kiln-simulation-context";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import { formatLocalTime } from "@/lib/time";
import { simTimeMs } from "@/lib/kiln-sim/engine";
import { defsFor } from "@/lib/live-defs";
import type { MachineLivePoint } from "@/types/edge";
import type { LiveSignal } from "@/lib/kiln-sim/engine";
import type { SensorScope } from "./sensor-mapping-diagram";
import type { Tone } from "./assets-shell-ui";
import { Empty, PageHeader, Section, SectionIndex, scrollToSection, type SectionIndexItem } from "./analysis/an-ui";
import { SensorsRegister } from "./sensors-register";
import {
  SENSORS_SECTIONS,
  SensorsChain,
  SensorsSummary,
  SensorsValidity,
  type SensorCounts,
  type SensorsCtx,
} from "./sensors-sections";
import {
  d4Of,
  isCalculated,
  isManual,
  isOnOff,
  isWired,
  parseRange,
  parseSampleRate,
  qualityOf,
  roleOf,
  tagOf,
  type SensorRow,
} from "./sensors-model";
import "./assets-shell.css";
import "./analysis/analysis-page.css";
import "./sensors-page.css";
import { TRENDS_FOCUS_KEY } from "./trends-focus";
import { ManualRecords } from "./pyro/manual-records";
import { PyroMachineSpec } from "./pyro/pyro-machine-spec";
import { PYRO_MACHINE_BY_ID } from "@/lib/pyro-sim/signals";

/* ==========================================================================
   Machine › Sensors — one scrolling page.
   The instrumentation inventory and whether each sensor delivers valid data:
   what is measured, where, how it is wired, and whether the data can be
   trusted (D4 instrument list, D5 Table 9.1 signals, Table 9.2 calculated
   values, Table 9.6 sensor validation).
     01 Summary      4 KPIs: valid data, flagged, outside limits, gateway links
     02 Map          machine-kit drawing, pads coloured by validity / limits
     03 Validity     flagged sensors + D5 Table 9.6 checks (hidden without live data)
     04 Sensors      transducer allocation (table or cards); D4 coverage gaps as group lines and
                     ghost rows; calculated values (Table 9.2) in the detail panel
     05 Acquisition  sensor → card / channel → rack slot → gateway → broker
   History lives on Trends, alarms on Diagnosis, chassis hardware on Rack and
   the edge network on Devices; this page links to them.
   ========================================================================== */

export interface MachineSensorMappingViewProps {
  machine: AssetMachine;
  simulation?: KilnSimulation;
  /** Kept for the parent's wiring; navigation goes through the data context. */
  onNavigateToDiagnosis?: () => void;
  /** Kept for the parent's wiring; navigation goes through the data context. */
  onNavigateToTrends?: () => void;
}

export interface DetailedSensorInfo {
  id: string;
  name: string;
  parameter: string;
  position: string;
  component: string;
  value: string;
  unit: string;
  status: "Normal" | "Advisory" | "Critical";
  normalThreshold: string;
  warningThreshold: string;
  alarmThreshold: string;
  numericValue: number;
  warningVal: number;
  alarmVal: number;
  maxScale: number;
  measurementTime: string;
  cardId: string;
  rackId: string;
  sampleRate: string;
  sensorType: string;
  x: number;
  y: number;
  point?: string;
  subAssembly?: string;
  systemId?: string;
  subassemblyId?: string;
  modbusAddress?: string;
  source?: "New" | "Existing" | "Calculated" | "Manual";
  priority?: "Required" | "Optional-High";
  accuracy?: string;
  range?: string;
  /** Live engine reading (KLN machines): model, residual, σ, validation. */
  live?: LiveSignal;
  /** Data-quality verdict shown on the diagram cards (set by the Sensors page). */
  dataQuality?: { label: string; tone: Tone };
}

type SensorStatus = CatalogSensorView["status"];

/** Seals-simulation value for a kiln tag (display string), or null when the tag has none. */
function sealsReading(tag: string, d: KilnSealsSensorData): string | null {
  const signed = (v: number, digits: number) => (v > 0 ? `+${v.toFixed(digits)}` : v.toFixed(digits));
  switch (tag) {
    case "GAS-KLN-01": return d.gasO2.toFixed(2);
    case "TMP-KLN-13": return `${d.inletGasTemp}`;
    case "PRS-KLN-01": return d.inletDraft.toFixed(2);
    case "CAL-KLN-06": return signed(d.falseAirIndex, 2);
    case "CAL-KLN-07": return d.sealOverlapMargin.toFixed(1);
    case "POS-KLN-01": return signed(d.lvdtPosition, 1);
    case "POS-KLN-02": return d.travelLimitSwitch;
    case "PRS-KLN-03": return signed(d.hoodPressure, 2);
    case "STS-KLN-10": return d.outletFanStatus;
    case "CAL-KLN-03": return `${d.shellMaxTemp}`;
    case "STS-KLN-08": return d.scannerCoverage.toFixed(1);
    case "GAS-KLN-02": return `${d.gasCO}`;
    case "FLO-KLN-01": return `${d.kilnFeed}`;
    case "FLO-KLN-02": return d.kilnFuel.toFixed(2);
    case "SPD-KLN-01": return d.kilnSpeed.toFixed(2);
    case "STS-KLN-06": return d.gasAnalyserStatus;
    default: return null;
  }
}

/**
 * State of a reading against the sensor's DB limits (`mapped_signals.warning_val`
 * / `alarm_val`). Alarm above warning = high limit, below = low limit; a "±" nominal
 * band compares the magnitude. Discrete states compare with the DB nominal band.
 * Returns null when the DB holds no limits for the sensor.
 */
function statusFromDbLimits(s: CatalogSensorView, display: string): SensorStatus | null {
  const warn = Number(s.warningVal);
  const alarm = Number(s.alarmVal);
  if (!Number.isFinite(warn) || !Number.isFinite(alarm) || (warn === 0 && alarm === 0)) return null;
  const raw = display.trim();
  if (!/^[+-]?\d+(\.\d+)?$/.test(raw)) {
    const nominal = s.nominalBand.trim().toUpperCase();
    return raw.toUpperCase() === nominal ? "Normal" : "Critical";
  }
  const v = s.nominalBand.trim().startsWith("±") ? Math.abs(Number(raw)) : Number(raw);
  if (alarm >= warn) return v >= alarm ? "Critical" : v >= warn ? "Advisory" : "Normal";
  return v <= alarm ? "Critical" : v <= warn ? "Advisory" : "Normal";
}

/**
 * Builds DetailedSensorInfo from the DB-backed canonical catalog
 * (`mapped_signals`) — the single source of truth. Live-machine rows already
 * carry the engine value and state (`s.live`); without it, the optional seals
 * simulation overlays the value and the state is judged on the DB limits.
 * The seals overlay is kiln-fleet only: pyro machines reuse some KLN tag
 * names (PYR-KLN-01), so it is skipped when `machineId` is not a kiln.
 */
export function buildDetailedSensors(
  catalogSensors: CatalogSensorView[],
  sensorData?: KilnSealsSensorData,
  machineId?: string
): DetailedSensorInfo[] {
  const seals = sensorData && (!machineId || isKilnMachine(machineId)) ? sensorData : undefined;
  return catalogSensors.map((s) => {
    const tag = s.tag;
    let displayValue = s.value;
    let liveStatus = s.status;

    const overlay = !s.live && seals ? sealsReading(tag, seals) : null;
    if (overlay !== null) {
      displayValue = overlay;
      liveStatus = statusFromDbLimits(s, overlay) ?? s.status;
    }

    const num = parseFloat(displayValue) || 0;

    return {
      id: s.id,
      name: s.name,
      parameter: s.tag,
      position: `${s.component} · Physical Instrument Location`,
      component: s.component,
      value: displayValue,
      unit: s.unit,
      status: liveStatus,
      normalThreshold: s.normalThreshold,
      warningThreshold: s.warningThreshold,
      alarmThreshold: s.alarmThreshold,
      numericValue: num,
      warningVal: s.warningVal,
      alarmVal: s.alarmVal,
      maxScale: s.maxScale,
      measurementTime: s.live ? "Live" : overlay !== null ? "Simulated" : "",
      cardId: s.cardId,
      rackId: s.rackId,
      sampleRate: s.sampleRate,
      sensorType: s.sensorType,
      x: s.x ?? 0,
      y: s.y ?? 0,
      point: s.point,
      subAssembly: s.subAssembly,
      systemId: s.systemId,
      subassemblyId: s.subassemblyId,
      modbusAddress: s.modbusAddress,
      source: s.source as DetailedSensorInfo["source"],
      priority: s.priority as DetailedSensorInfo["priority"],
      accuracy: s.accuracy,
      range: s.rangeVal,
      live: s.live,
    };
  });
}

/** Fallback rows from the machine's DB-seeded hotspots (pre-catalog / non-kiln). */
export function hotspotSensors(machine: AssetMachine): DetailedSensorInfo[] {
  return machine.hotspots.map((h) => ({
    id: h.id,
    name: h.label,
    parameter: h.parameter,
    position: h.component,
    component: h.component,
    value: h.value,
    unit: h.unit,
    status: h.status,
    normalThreshold: "Normal",
    warningThreshold: "Warning",
    alarmThreshold: "Alarm",
    numericValue: parseFloat(h.value) || 0,
    warningVal: 0,
    alarmVal: 0,
    maxScale: 100,
    measurementTime: "",
    cardId: "",
    rackId: "",
    sampleRate: "",
    sensorType: "",
    x: h.x,
    y: h.y,
    subAssembly: "",
    modbusAddress: "",
  }));
}


/* ------------------------------------------------------------ links */

const DEVICES_SECTION_KEY = "ultron.devices.section";
const DEVICES_SELECTED_KEY = "ultron.devices.selected";
/** Cross-page link contract: a sensor tag to select when this page opens. */
export const SENSORS_FOCUS_KEY = "ultron.sensors.focus";
/** sessionStorage key another page can set to open Sensors at a section id. */
export const SENSORS_SECTION_KEY = "ultron.sensors.section";

const issue = (t: Tone): Tone | undefined => (t === "warn" || t === "bad" ? t : undefined);

/* ------------------------------------------------------------ view */

export function MachineSensorMappingView({ machine, simulation: simProp }: MachineSensorMappingViewProps) {
  // Canonical DB catalog with the live overlay — same rows as Diagnosis / Health / Trends.
  const catalog = useMachineCatalog(machine);
  const simFor = useKilnSimulationFor(machine.id);
  const simulation = simProp ?? simFor;
  const frame = simulation?.frame ?? null;
  const acquisition = useMachineAcquisition(machine.id);
  const { setActiveSubPage, setActiveTab } = useIndustrialData();
  const tz = useSiteTimeZone({ machineId: machine.id });
  const hasSpec = isLiveMachine(machine.id);
  // The machine's own catalog (kiln fleet or pyro line); null for machines without a live engine.
  const defs = frame?.defs ?? defsFor(machine.id);

  const [scope, setScope] = useState<SensorScope | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  // Pyro line: the D4 machine specification and its manual records. The diagram sheets live on the Overview.
  const pyroSpec = Boolean(PYRO_MACHINE_BY_ID[machine.id]);
  const [focusNonce, setFocusNonce] = useState(0);

  useEffect(() => {
    setScope(null);
    setSelectedTag(null);
  }, [machine.id]);

  const pointByTag = useMemo(() => {
    const m = new Map<string, MachineLivePoint>();
    for (const p of acquisition.data?.points ?? []) m.set(p.signalTag ?? p.tag, p);
    return m;
  }, [acquisition.data]);

  const rows = useMemo<SensorRow[]>(() => {
    const db = buildDetailedSensors(catalog.sensors, undefined, machine.id);
    const base = db.length > 0 ? db : catalog.isLoading ? [] : hotspotSensors(machine);
    return base.map((s) => {
      const tag = tagOf(s);
      const livePoint = pointByTag.get(tag);
      const q = qualityOf(s, livePoint);
      const spec = hasSpec && defs ? defs.signalByTag[tag] : undefined;
      const d4 = d4Of(defs, tag);
      const range = parseRange(s.range);
      const num = parseFloat(s.value);
      const outOfRange = Boolean(range && !isOnOff(s) && Number.isFinite(num) && (num < range.lo || num > range.hi) && q.quality !== "No live feed");
      return { ...s, q, livePoint, spec, d4, role: roleOf(s, spec, defs, d4), outOfRange, dataQuality: { label: q.quality, tone: q.tone } };
    });
  }, [catalog.sensors, catalog.isLoading, machine, pointByTag, hasSpec, defs]);

  /* ---- counts (reconcile to the DB total, name every subset) ---- */
  const counts = useMemo<SensorCounts>(() => {
    const total = rows.length;
    const calculated = rows.filter(isCalculated).length;
    const manual = rows.filter((r) => !isCalculated(r) && isManual(r)).length;
    const onOff = rows.filter(isOnOff).length;
    const q = { valid: 0, attention: 0, nolive: 0, suspect: 0, invalid: 0, stale: 0, nodata: 0 };
    for (const r of rows) {
      if (r.q.quality === "Valid") q.valid += 1;
      else if (r.q.quality === "No live feed") q.nolive += 1;
      else q.attention += 1;
      if (r.q.quality === "Suspect") q.suspect += 1;
      if (r.q.quality === "Invalid") q.invalid += 1;
      if (r.q.quality === "Stale") q.stale += 1;
      if (r.q.quality === "No data") q.nodata += 1;
    }
    const status = { Normal: 0, Advisory: 0, Critical: 0 };
    for (const r of rows) status[r.status] += 1;
    const wiredRows = rows.filter(isWired);
    const cards = new Set(wiredRows.map((r) => r.cardId).filter(Boolean)).size;
    const racks = new Set(wiredRows.map((r) => r.rackId).filter(Boolean)).size;
    const linked = wiredRows.filter((r) => r.livePoint).length;
    const rates = rows.map((r) => parseSampleRate(r.sampleRate).sps).filter((v): v is number => v !== null);
    return {
      total,
      wired: total - calculated - manual,
      calculated,
      manual,
      numeric: total - onOff,
      onOff,
      q,
      status,
      cards,
      racks,
      linked,
      minRate: rates.length ? Math.min(...rates) : null,
      maxRate: rates.length ? Math.max(...rates) : null,
      outOfRange: rows.filter((r) => r.outOfRange).length,
    };
  }, [rows]);

  /* ---- navigation (context API only) ---- */
  const goTrends = useCallback(
    (tag?: string | null) => {
      if (tag) {
        try {
          sessionStorage.setItem(TRENDS_FOCUS_KEY, tag);
        } catch {
          /* storage unavailable */
        }
      }
      setActiveSubPage("trends");
    },
    [setActiveSubPage]
  );
  const goRack = useCallback(() => setActiveSubPage("rack"), [setActiveSubPage]);
  const goDevices = useCallback(
    (point?: MachineLivePoint) => {
      try {
        sessionStorage.setItem(DEVICES_SECTION_KEY, "hierarchy");
        if (point) sessionStorage.setItem(DEVICES_SELECTED_KEY, `card:${point.source.id}/${point.card}`);
      } catch {
        /* storage unavailable */
      }
      setActiveTab("devices");
    },
    [setActiveTab]
  );

  // Cross-page focus: another page writes a tag to `ultron.sensors.focus` and opens Sensors.
  useEffect(() => {
    if (catalog.isLoading || rows.length === 0) return;
    let tag: string | null = null;
    try {
      tag = sessionStorage.getItem(SENSORS_FOCUS_KEY);
      if (tag) sessionStorage.removeItem(SENSORS_FOCUS_KEY);
    } catch {
      return;
    }
    if (!tag || !rows.some((r) => tagOf(r) === tag)) return;
    setScope(null);
    setFocusNonce((n) => n + 1);
    setSelectedTag(tag);
    const focusTag = tag;
    // Not cancelled on re-render: live ticks re-run this effect, but the key is already consumed.
    window.setTimeout(() => {
      const el = document.querySelector(`[data-sensor-tag="${CSS.escape(focusTag)}"]`);
      el?.closest("tr")?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 120);
  }, [catalog.isLoading, rows]);

  const select = useCallback((tag: string | null) => setSelectedTag(tag), []);

  /* ---- last sample, in the site's time zone ---- */
  const lastSample = useMemo(() => {
    if (frame) return { text: formatLocalTime(simTimeMs(frame.t), { seconds: true, zone: true, timeZone: tz.timeZone }), sim: true };
    let latest = 0;
    for (const p of acquisition.data?.points ?? []) {
      const t = p.live.updatedAt ? Date.parse(p.live.updatedAt) : NaN;
      if (Number.isFinite(t) && t > latest) latest = t;
    }
    return latest ? { text: formatLocalTime(latest, { date: true, seconds: true, zone: true, timeZone: tz.timeZone }), sim: false } : null;
  }, [frame, acquisition.data, tz.timeZone]);

  const ctx: SensorsCtx = {
    machine,
    rows,
    counts,
    frame,
    acquisition: acquisition.data,
    history: acquisition.history,
    hasSpec,
    defs,
    timeZone: tz.timeZone,
    selectedTag,
    select,
    focusNonce,
    goTrends,
    goRack,
    goDevices,
    goSection: scrollToSection,
  };

  const loading = catalog.isLoading && rows.length === 0;
  const validTone: Tone =
    counts.q.invalid + counts.q.nodata > 0 ? "bad" : counts.q.attention > 0 ? "warn" : counts.q.valid > 0 ? "good" : "idle";
  const feed = frame ? "engine validation" : acquisition.data?.points.some((p) => p.live.updatedAt) ? "gateway MQTT" : "stored DB values";

  const countLine = !catalog.isLive && rows.length > 0
    ? `Sensor catalog unavailable · ${counts.total} hotspot points stored for ${machine.name}`
    : `${counts.total} · ${counts.wired} wired + ${counts.calculated} calc.${counts.manual ? ` + ${counts.manual} manual` : ""}`;

  const hasValidity = counts.q.nolive < counts.total;
  const index: SectionIndexItem[] = [
    ...(pyroSpec ? [{ id: "sensors-spec", label: "Specification" }] : []),
    ...(hasValidity ? [{ id: SENSORS_SECTIONS.validity, label: "Validity", tone: issue(validTone) }] : []),
    { id: SENSORS_SECTIONS.register, label: "Sensors" },
    { id: SENSORS_SECTIONS.chain, label: "Acquisition", tone: counts.wired && counts.linked < counts.wired ? ("warn" as Tone) : undefined },
  ];


  return (
    <div className="ast-root pg-frame pg-sensors" aria-label="Sensors">
      <PageHeader
        title="Sensors"
        status={rows.length ? { label: counts.q.attention ? `${counts.q.attention} flagged` : "Normal", tone: issue(validTone) } : null}
        meta={[
          { label: "Sensors", value: loading ? "Loading…" : rows.length ? countLine : "none recorded" },
          rows.length > 0 && { label: "Source", value: feed },
          {
            label: "Last sample",
            value: lastSample ? `${lastSample.text}${lastSample.sim ? " · sim." : ""}` : "no live sample",
          },
        ]}
        actions={
          <PillButton variant="secondary" onClick={() => goDevices(rows.find((r) => tagOf(r) === selectedTag)?.livePoint)}>
            Open in Devices
          </PillButton>
        }
      />

      {loading ? (
        <section className="ast-card" role="status" aria-live="polite">
          <Empty title="Loading sensor catalog…" />
        </section>
      ) : rows.length === 0 ? (
        <section className="ast-card">
          <Empty title={`No sensors recorded for ${machine.name}.`}>Map gateway channels to this machine in Devices.</Empty>
        </section>
      ) : (
        <>
          <SensorsSummary ctx={ctx} />
          <SectionIndex items={index} label="Sensors sections" pendingKey={SENSORS_SECTION_KEY} />
          <div className="pg-frame-body pg-sensors-body">

            {pyroSpec && (
              <Section id="sensors-spec" index={1} title="Specification">
                <PyroMachineSpec machineId={machine.id} t={frame?.t} />
                {frame?.records && frame.records.length > 0 && <ManualRecords records={frame.records} timeZone={tz.timeZone} />}
              </Section>
            )}

            {hasValidity && (
              <Section id={SENSORS_SECTIONS.validity} index={pyroSpec ? 2 : 1} title="Validity">
                <SensorsValidity ctx={ctx} />
              </Section>
            )}

            <Section id={SENSORS_SECTIONS.register} index={(hasValidity ? 2 : 1) + (pyroSpec ? 1 : 0)} title="Sensors">
              <SensorsRegister ctx={ctx} scope={scope} onClearScope={() => setScope(null)} />
            </Section>

            <Section id={SENSORS_SECTIONS.chain} index={(hasValidity ? 3 : 2) + (pyroSpec ? 1 : 0)} title="Acquisition">
              <SensorsChain ctx={ctx} />
            </Section>
          </div>
        </>
      )}
    </div>
  );
}
