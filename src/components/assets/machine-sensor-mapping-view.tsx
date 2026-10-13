"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AssetMachine } from "./assets-data";
import { PillButton, PillNav, Table, type Column } from "@/components/ui";
import type { KilnSimulation } from "./kiln-seals-simulation";
import type { KilnSealsSensorData, SealTimeSeriesPoint } from "./kiln-seals-types";
import { useMachineCatalog, type CatalogSensorView } from "./use-machine-catalog";
import { MachineSchematic, type SchematicDot } from "./machine-schematic";
import { SensorMappingDiagram, sensorAlarmLoad } from "./sensor-mapping-diagram";
import { GaugeLimits, gaugeScale } from "./sensor-gauge";
import { SensorChart } from "./sensor-charts";
import {
  IconClose,
  IconMore,
  IconSensor,
  SearchPill,
  Spark,
  StatusTag,
  Ticks,
  severityTone,
} from "./assets-shell-ui";
import "./assets-shell.css";

export interface MachineSensorMappingViewProps {
  machine: AssetMachine;
  simulation?: KilnSimulation;
  onNavigateToDiagnosis?: () => void;
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
  modbusAddress?: string;
  source?: "New" | "Existing" | "Calculated";
  priority?: "Required" | "Optional-High";
  accuracy?: string;
  range?: string;
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
 * (`mapped_signals`) — the single source of truth. KLN-01 rows already carry
 * the live engine value and state (`s.live`); without it, the optional seals
 * simulation overlays the value and the state is judged on the DB limits.
 */
export function buildDetailedSensors(
  catalogSensors: CatalogSensorView[],
  sensorData?: KilnSealsSensorData
): DetailedSensorInfo[] {
  return catalogSensors.map((s) => {
    const tag = s.tag;
    let displayValue = s.value;
    let liveStatus = s.status;

    const overlay = !s.live && sensorData ? sealsReading(tag, sensorData) : null;
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
      modbusAddress: s.modbusAddress,
      source: s.source as DetailedSensorInfo["source"],
      priority: s.priority as DetailedSensorInfo["priority"],
      accuracy: s.accuracy,
      range: s.rangeVal,
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
    normalThreshold: "Nominal",
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

/* ------------------------------------------------------------ helpers */

/** Normalises free-text DB sample rates to samples per second. */
function parseSampleRate(raw: string): { sps: number | null; label: string } {
  const s = (raw || "").trim();
  if (!s) return { sps: null, label: "—" };
  let m = s.match(/([\d.]+)\s*(k)?\s*(S\/s|Hz)\b/i);
  if (m) return finalize(parseFloat(m[1]) * (m[2] ? 1000 : 1));
  m = s.match(/([\d.]+)\s*ms\b/i);
  if (m) return finalize(1000 / parseFloat(m[1]));
  if (/rev\/s/i.test(s)) return finalize(1);
  m = s.match(/([\d.]+)\s*s\b/);
  if (m) return finalize(1 / parseFloat(m[1]));
  if (/change/i.test(s)) return { sps: null, label: "On change" };
  if (/model|internal|derived/i.test(s)) return { sps: null, label: "Derived" };
  return { sps: null, label: "—" };
}

function finalize(sps: number) {
  return { sps, label: formatSps(sps) };
}

function formatSps(sps: number): string {
  if (sps >= 1000) return `${+(sps / 1000).toFixed(1)} kS/s`;
  if (sps >= 1) return `${+sps.toFixed(1)} S/s`;
  return `${+sps.toFixed(2)} S/s`;
}

function slotOf(cardId: string): { slot: string; module: string } {
  const m = cardId.match(/^(.*?)\s*\((Slot\s*\d+)\)/i);
  if (m) return { slot: m[2], module: m[1] };
  return { slot: cardId || "—", module: "" };
}

const alarmLoad = sensorAlarmLoad;

const tagOf = (s: DetailedSensorInfo) => s.parameter || s.id;

/** Kiln tags with a live simulation series. */
const LIVE_SERIES: Record<string, keyof SealTimeSeriesPoint> = {
  "GAS-KLN-01": "gasO2",
  "TMP-KLN-13": "inletGasTemp",
  "PRS-KLN-01": "inletDraft",
  "PRS-KLN-03": "hoodPressure",
  "POS-KLN-01": "lvdtPosition",
  "CAL-KLN-07": "sealOverlap",
  "CAL-KLN-06": "falseAirIndex",
  "CAL-KLN-03": "shellMaxTemp",
  "FLO-KLN-01": "kilnFeed",
  "FLO-KLN-02": "kilnFuel",
  "SPD-KLN-01": "kilnSpeed",
};

type StatusKey = "Normal" | "Advisory" | "Critical";
const STATUS_KEYS: StatusKey[] = ["Normal", "Advisory", "Critical"];

type ListView = "table" | "cards";
const LIST_VIEWS = [
  { id: "table", label: "Table" },
  { id: "cards", label: "Cards" },
];

/* ------------------------------------------------------------ view */

export function MachineSensorMappingView({
  machine,
  simulation,
  onNavigateToDiagnosis,
  onNavigateToTrends,
}: MachineSensorMappingViewProps) {
  // Canonical DB catalog — same rows as Diagnosis / Health / Trends.
  const catalog = useMachineCatalog(machine);

  const [systemFilter, setSystemFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusKey | null>(null);
  const [query, setQuery] = useState("");
  const [listView, setListView] = useState<ListView>("table");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [menuTag, setMenuTag] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  useEffect(() => {
    setSystemFilter("all");
    setSelectedTag(null);
  }, [machine.id]);

  const sensors = useMemo(() => {
    const db = buildDetailedSensors(catalog.sensors, simulation?.sensorData);
    return db.length > 0 ? db : hotspotSensors(machine);
  }, [catalog.sensors, simulation?.sensorData, machine]);

  const systemByTag = useMemo(() => new Map(catalog.sensors.map((s) => [s.tag, s.systemId])), [catalog.sensors]);

  const systemTabs = useMemo(() => {
    const tabs = [{ id: "all", label: `All ${sensors.length}` }];
    for (const sys of catalog.systems) {
      const n = sensors.filter((s) => systemByTag.get(tagOf(s)) === sys.systemId).length;
      tabs.push({ id: sys.systemId, label: `${sys.shortName || sys.name} ${n}` });
    }
    return tabs;
  }, [catalog.systems, sensors, systemByTag]);

  const statusCounts = useMemo(() => {
    const c: Record<StatusKey, number> = { Normal: 0, Advisory: 0, Critical: 0 };
    for (const s of sensors) c[s.status] += 1;
    return c;
  }, [sensors]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sensors.filter((s) => {
      if (systemFilter !== "all" && systemByTag.get(tagOf(s)) !== systemFilter) return false;
      if (statusFilter && s.status !== statusFilter) return false;
      if (!q) return true;
      return [tagOf(s), s.name, s.sensorType, s.cardId, s.modbusAddress ?? "", s.component].some((v) =>
        v.toLowerCase().includes(q)
      );
    });
  }, [sensors, systemFilter, statusFilter, query, systemByTag]);

  const selected = selectedTag ? sensors.find((s) => tagOf(s) === selectedTag) ?? null : null;

  // Close the row menu on outside click / Escape.
  useEffect(() => {
    if (!menuTag) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest?.("[data-row-menu]")) setMenuTag(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuTag(null);
    const onScroll = () => setMenuTag(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [menuTag]);

  const hasActions = Boolean(onNavigateToTrends || onNavigateToDiagnosis);

  const columns: Column<DetailedSensorInfo>[] = [
    {
      key: "sensor",
      header: "Sensor ID",
      render: (s) => (
        <button
          type="button"
          className="ast-row-btn"
          aria-pressed={selectedTag === tagOf(s)}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedTag(selectedTag === tagOf(s) ? null : tagOf(s));
          }}
        >
          <span className="ast-badge" data-tone={severityTone(s.status)}>
            <IconSensor size={15} />
          </span>
          <span className="ast-cell-stack">
            <span className="ast-cell-title ast-num">{tagOf(s)}</span>
            <span className="ast-cell-sub" title={s.name}>
              {s.name}
            </span>
          </span>
        </button>
      ),
    },
    {
      key: "instrument",
      header: "Instrument",
      render: (s) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-text" title={s.sensorType}>
            {s.sensorType || "—"}
          </span>
          {s.accuracy && <span className="ast-cell-sub">{s.accuracy}</span>}
        </span>
      ),
    },
    {
      key: "slot",
      header: "Rack slot",
      render: (s) => {
        const { slot, module } = slotOf(s.cardId);
        return (
          <span className="ast-cell-stack">
            <span className="ast-num">{slot}</span>
            {module && <span className="ast-cell-sub">{module}</span>}
          </span>
        );
      },
    },
    {
      key: "register",
      header: "Modbus reg.",
      render: (s) => <span className="ast-num">{s.modbusAddress || "—"}</span>,
    },
    {
      key: "rate",
      header: "Sampling",
      render: (s) => {
        const r = parseSampleRate(s.sampleRate);
        return (
          <span className={r.sps === null ? "ast-muted" : "ast-num"} title={s.sampleRate}>
            {r.label}
          </span>
        );
      },
    },
    {
      key: "reading",
      header: "Reading · alarm load",
      render: (s) => {
        const load = alarmLoad(s);
        return (
          <span className="ast-sm-reading">
            <span className="ast-reading-val">
              {s.value}
              <span className="ast-unit">{s.unit}</span>
            </span>
            {load !== null && (
              <span className="ast-health-cell" title={`${load} % of alarm limit ${s.alarmVal} ${s.unit}`}>
                <Ticks value={Math.min(load, 100)} tone={severityTone(s.status)} ticks={14} />
                <span className="ast-caption ast-num">{load} %</span>
              </span>
            )}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (s) => <StatusTag tone={severityTone(s.status)} label={s.status} />,
    },
  ];

  if (hasActions) {
    columns.push({
      key: "actions",
      header: "",
      width: "48px",
      render: (s) => {
        const tag = tagOf(s);
        const open = menuTag === tag;
        return (
          <span className="ast-trail" data-row-menu>
            <button
              type="button"
              className="ast-icon-btn"
              aria-label={`Actions for ${tag}`}
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={(e) => {
                e.stopPropagation();
                const r = e.currentTarget.getBoundingClientRect();
                setMenuPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
                setMenuTag(open ? null : tag);
              }}
            >
              <IconMore />
            </button>
            {/* Portaled: the frosted card's backdrop-filter would otherwise trap position: fixed. */}
            {open && createPortal(
              <span
                className="ast-menu ast-menu--fixed"
                data-row-menu
                role="menu"
                style={{ top: menuPos.top, right: menuPos.right }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setSelectedTag(tag);
                    setMenuTag(null);
                  }}
                >
                  Show details
                </button>
                {onNavigateToTrends && (
                  <button type="button" role="menuitem" onClick={onNavigateToTrends}>
                    Open in Trends
                  </button>
                )}
                {onNavigateToDiagnosis && (
                  <button type="button" role="menuitem" onClick={onNavigateToDiagnosis}>
                    Open in Diagnosis
                  </button>
                )}
              </span>,
              document.body,
            )}
          </span>
        );
      },
    });
  }

  return (
    <div className="ast-root">
      <SensorMappingDiagram machine={machine} catalog={catalog} sensors={sensors} />

      <div className="ast-toolbar">
        {systemTabs.length > 1 ? (
          <PillNav items={systemTabs} activeId={systemFilter} onChange={setSystemFilter} wrap />
        ) : (
          <span />
        )}
        <div className="ast-toolbar-group">
          <PillNav items={LIST_VIEWS} activeId={listView} onChange={(id) => setListView(id as ListView)} />
          <div className="ast-toolbar-group" role="group" aria-label="Filter by status">
            {STATUS_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                className="ast-filter"
                data-tone={severityTone(k)}
                aria-pressed={statusFilter === k}
                onClick={() => setStatusFilter(statusFilter === k ? null : k)}
              >
                <span className="ast-chip-dot" aria-hidden="true" />
                {k} <b>{statusCounts[k]}</b>
              </button>
            ))}
          </div>
          <SearchPill value={query} onChange={setQuery} placeholder="Search tag, instrument, slot" label="Search sensors" />
        </div>
      </div>

      <div className={`ast-sm ${selected ? "has-panel" : ""}`}>
        {listView === "cards" ? (
          filtered.length === 0 ? (
            <div className="ast-card ast-empty">
              {catalog.isLoading && sensors.length === 0 ? "Loading sensor catalog…" : "No sensors match the current filters."}
            </div>
          ) : (
            <section className="ast-smc-grid" aria-label="Sensor cards">
              {filtered.map((s) => (
                <SensorCard
                  key={tagOf(s)}
                  sensor={s}
                  history={simulation?.frame.history[tagOf(s)]}
                  selected={selectedTag === tagOf(s)}
                  onSelect={() => setSelectedTag(selectedTag === tagOf(s) ? null : tagOf(s))}
                />
              ))}
            </section>
          )
        ) : (
        <section className="ast-card ast-sm-table" aria-label="Sensor allocation matrix">
          {filtered.length === 0 ? (
            <div className="ast-empty">
              {catalog.isLoading && sensors.length === 0 ? "Loading sensor catalog…" : "No sensors match the current filters."}
            </div>
          ) : (
            <Table
              className="ast-table"
              columns={columns}
              data={filtered}
              keyExtractor={tagOf}
              selectedId={selectedTag ?? undefined}
              onRowClick={(s) => setSelectedTag(selectedTag === tagOf(s) ? null : tagOf(s))}
            />
          )}
        </section>
        )}

        {selected && (
          <SensorPanel
            sensor={selected}
            machine={machine}
            sensors={sensors}
            timeSeries={simulation?.timeSeries}
            onClose={() => setSelectedTag(null)}
            onNavigateToTrends={onNavigateToTrends}
            onNavigateToDiagnosis={onNavigateToDiagnosis}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ card view */

/** One sensor as a card: reading on a limit gauge, then only the specs we have. */
function SensorCard({
  sensor,
  history,
  selected,
  onSelect,
}: {
  sensor: DetailedSensorInfo;
  /** Live per-minute history, oldest first, when the machine is simulated. */
  history?: number[];
  selected: boolean;
  onSelect: () => void;
}) {
  const tag = tagOf(sensor);
  const tone = severityTone(sensor.status);
  const load = alarmLoad(sensor);
  const scale = gaugeScale(sensor);
  const { slot, module } = slotOf(sensor.cardId);
  const rate = parseSampleRate(sensor.sampleRate);
  const rows = (
    [
      ["Instrument", sensor.sensorType],
      ["Rack slot", sensor.cardId ? (module ? `${module} · ${slot}` : slot) : "", true],
      ["Modbus reg.", sensor.modbusAddress, true],
      ["Sampling", rate.sps === null && rate.label === "—" ? "" : rate.label, true],
    ] as Array<[string, string | undefined, boolean?]>
  ).filter(([, v]) => v && v !== "—");
  const unit = sensor.unit && sensor.unit !== "state" ? sensor.unit : "";

  return (
    <button
      type="button"
      className="ast-card ast-smc"
      aria-pressed={selected}
      aria-label={`${tag} ${sensor.name}: ${sensor.value} ${sensor.unit}, ${sensor.status}`}
      onClick={onSelect}
    >
      <span className="ast-smc-top">
        <span className="ast-badge" data-tone={tone}>
          <IconSensor size={15} />
        </span>
        <span className="ast-cell-stack">
          <span className="ast-cell-title ast-num">{tag}</span>
          <span className="ast-cell-sub" title={sensor.name}>
            {sensor.name}
          </span>
        </span>
        <StatusTag tone={tone} label={sensor.status} />
      </span>

      {scale ? (
        <span className="ast-smc-body">
          <span className="ast-smc-read">
            <span className="ast-smc-value ast-num">
              {sensor.value}
              {unit && <span className="ast-unit">{unit}</span>}
            </span>
            <span className="ast-smc-aside">
              {load !== null && <span className="ast-smc-sub ast-num">{load} % of alarm limit</span>}
              <span className="ast-smc-sub">{sensor.subAssembly || sensor.component}</span>
            </span>
          </span>
          <SensorChart sensor={sensor} scale={scale} history={history} />
          <GaugeLimits scale={scale} unit={unit} />
        </span>
      ) : (
        <span className="ast-smc-body">
          <span className="ast-smc-read">
            <span className="ast-smc-value ast-num ast-smc-state-value">{sensor.value}</span>
            <span className="ast-smc-aside">
              <span className="ast-smc-sub">Discrete signal</span>
              <span className="ast-smc-sub">{sensor.subAssembly || sensor.component}</span>
            </span>
          </span>
          <SensorChart sensor={sensor} scale={null} history={history} />
        </span>
      )}

      {rows.length > 0 && (
        <span className="ast-smc-dl">
          {rows.map(([k, v, num]) => (
            <span key={k} className="ast-smc-row">
              <span className="ast-smc-k">{k}</span>
              <span className={`ast-smc-v ${num ? "ast-num" : ""}`} title={v}>
                {v}
              </span>
            </span>
          ))}
        </span>
      )}
    </button>
  );
}

/* ------------------------------------------------------------ side panel */

function SensorPanel({
  sensor,
  machine,
  sensors,
  timeSeries,
  onClose,
  onNavigateToTrends,
  onNavigateToDiagnosis,
}: {
  sensor: DetailedSensorInfo;
  machine: AssetMachine;
  sensors: DetailedSensorInfo[];
  timeSeries?: SealTimeSeriesPoint[];
  onClose: () => void;
  onNavigateToTrends?: () => void;
  onNavigateToDiagnosis?: () => void;
}) {
  const tag = tagOf(sensor);
  const tone = severityTone(sensor.status);

  const series = useMemo(() => {
    const key = LIVE_SERIES[tag];
    if (!key || !timeSeries) return null;
    const pts = timeSeries.filter((p) => typeof p[key] === "number");
    if (pts.length < 2) return null;
    return { values: pts.map((p) => p[key] as number), labels: pts.map((p) => p.time) };
  }, [tag, timeSeries]);

  const scale = useMemo(() => {
    const { warningVal: w, alarmVal: a, numericValue: v } = sensor;
    if (!(w > 0) || !(a > w) || !(v >= 0)) return null;
    const max = Math.max(sensor.maxScale || 0, a * 1.15, v);
    return { w, a, max, pos: Math.min(100, (v / max) * 100) };
  }, [sensor]);

  const dots = useMemo<SchematicDot[]>(
    () =>
      sensors.map((s) => ({
        tag: tagOf(s),
        name: s.name,
        value: s.value,
        unit: s.unit,
        status: s.status,
        x: s.x,
        y: s.y,
      })),
    [sensors]
  );

  const { slot, module } = slotOf(sensor.cardId);
  const rate = parseSampleRate(sensor.sampleRate);
  const rows: Array<[string, string]> = [
    ["Instrument", sensor.sensorType || "—"],
    ["Accuracy", sensor.accuracy || "—"],
    ["Range", sensor.range || "—"],
    ["Rack", sensor.rackId ? sensor.rackId.split(" (")[0] : "—"],
    ["Slot", module ? `${slot} · ${module}` : slot],
    ["Modbus register", sensor.modbusAddress || "—"],
    ["Sampling", rate.label],
    ["Location", sensor.subAssembly || sensor.component || "—"],
  ];

  return (
    <aside className="ast-card ast-panel" aria-label={`${tag} details`}>
      <div className="ast-panel-head">
        <div>
          <h3 className="ast-panel-tag ast-num">{tag}</h3>
          <div className="ast-panel-name">{sensor.name}</div>
        </div>
        <button type="button" className="ast-icon-btn" aria-label="Close sensor details" onClick={onClose}>
          <IconClose />
        </button>
      </div>

      <div className="ast-panel-value">
        <strong className="ast-num">
          {sensor.value}
          <span className="ast-unit">{sensor.unit}</span>
        </strong>
        <StatusTag tone={tone} label={sensor.status} />
      </div>

      {series && (
        <Spark
          values={series.values}
          labels={series.labels}
          unit={sensor.unit}
          digits={2}
          tone={sensor.status === "Normal" ? "info" : tone}
          height={56}
          ariaLabel={`${tag} live trend`}
        />
      )}

      {scale && (
        <div>
          <div
            className="ast-scale"
            role="img"
            aria-label={`${sensor.value} ${sensor.unit}; warning ${scale.w} ${sensor.unit}; alarm ${scale.a} ${sensor.unit}`}
          >
            <div className="ast-scale-track">
              <span data-tone="good" style={{ flexGrow: scale.w }} />
              <span data-tone="warn" style={{ flexGrow: scale.a - scale.w }} />
              <span data-tone="bad" style={{ flexGrow: scale.max - scale.a }} />
            </div>
            <span className="ast-scale-mark" style={{ left: `${scale.pos}%` }} />
          </div>
          <div className="ast-scale-legend">
            <span>0 {sensor.unit}</span>
            <span>Warn {scale.w} {sensor.unit}</span>
            <span>Alarm {scale.a} {sensor.unit}</span>
          </div>
        </div>
      )}

      <dl className="ast-dl">
        {rows.map(([k, v]) => (
          <React.Fragment key={k}>
            <dt>{k}</dt>
            <dd title={v}>{v}</dd>
          </React.Fragment>
        ))}
      </dl>

      {(sensor.x > 0 || sensor.y > 0) && (
        <div className="ast-panel-sch">
          <div className="ast-panel-sub">Location on machine</div>
          <MachineSchematic
            diagramType={machine.diagramType}
            dots={dots}
            selectedTag={tag}
            compact
            label={`${tag} position on ${machine.name}`}
          />
        </div>
      )}

      {(onNavigateToTrends || onNavigateToDiagnosis) && (
        <div className="ast-panel-actions">
          {onNavigateToTrends && (
            <PillButton variant="secondary" onClick={onNavigateToTrends}>
              Open in Trends
            </PillButton>
          )}
          {onNavigateToDiagnosis && (
            <PillButton variant="primary" onClick={onNavigateToDiagnosis}>
              Open in Diagnosis
            </PillButton>
          )}
        </div>
      )}
    </aside>
  );
}
