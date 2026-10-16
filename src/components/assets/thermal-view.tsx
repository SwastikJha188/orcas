"use client";

/**
 * Machine sub-page · Thermal (any live machine with a kiln shell scanner
 * profile: `frame.defs.hasShell` — the KLN fleet and the pyro line's PYR-KLN-01).
 * Is the kiln shell thermally safe — where are the hot spots, and is the
 * refractory / coating changing?
 *
 * Header (status, hottest point, margin, scanner, last scan) → KPI strip →
 * scroll-spy index → five sections, one card each:
 *   Shell     SHL-KLN-01 scanner map to scale under the machine-kit kiln, axial profile on the same metre axis
 *   Zones     per zone max / mean / model / deviation / area ≥ alert / lining estimate (R-SHL-01 / R-SHL-02 logic);
 *             with an engine scan history (pyro line), change since the last validated scan and the last shift
 *   Hot spots ranked R-SHL-01 regions → circumferential plot and trend of the selected section
 *   Rules     `defs.thermalRules` states (kiln fleet: R-SHL-01, R-SHL-02, R-DQ-01) → Diagnosis
 *   Scanner   STS-KLN-08 coverage, data validity, handheld record (if any), map timing → Sensors
 *
 * Self-contained: takes only `machine`, reads its own live plant through
 * `useKilnSimulationFor`. The map's hottest cell is exactly CAL-KLN-03.
 */

import React, { useMemo, useState } from "react";
import { rowActivate } from "@/components/ui/row-activate";
import { PillButton, PillNav } from "@/components/ui";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { useKilnSimulationFor, useLiveMachineStatus, useLivePlantStarting } from "@/providers/kiln-simulation-context";
import { conditionTone, toCondition, validityTone } from "@/components/ui/status";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import { formatLocalTime } from "@/lib/time";
import { formatDuration, simTimeMs, type RuleState, type SimFrame } from "@/lib/kiln-sim/engine";
import type { Severity } from "@/lib/kiln-sim/signals";
import {
  SHELL_ALERT,
  SHELL_DA,
  SHELL_DANGER,
  SHELL_DIA,
  SHELL_DZ,
  SHELL_LAST_GOOD_MAX_AGE,
  SHELL_LEN,
  SHELL_NA,
  SHELL_NORMAL_COVERAGE,
  SHELL_TYRES,
  SHELL_ZONES,
  buildShellMap,
  shellZoneAt,
  type ShellMap,
} from "@/lib/kiln-sim/shell-map";
import type { AssetMachine } from "./assets-data";
import type { AssetsSubPage } from "./assets-view";
import type { Tone } from "./assets-shell-ui";
import { StatusTag } from "@/components/ui/status-tag";
import { focusSensorOn } from "./sensor-focus";
import { TrendChart, TrendTimeZoneContext, type TrendSample } from "./sensor-trend-graph";
import type { KilnSimulation } from "./kiln-seals-simulation";
import { Empty, KpiStrip, PageHeader, Section, SectionIndex, type KpiItem, type SectionIndexItem } from "./analysis/an-ui";
import { DataTable, Num, PROG_SECTION_KEY, type Col } from "./prognosis/prog-ui";
import { ANALYSIS_ANCHOR_KEY } from "./analysis/analysis-page";
import { DIAGNOSIS_SECTION_KEY } from "./diagnosis-view";
import { HeatScale, PolarChart, ProfileChart, ShellMapFigure, heatRange, type LastGood } from "./thermal-map";
import {
  COLD_BAND,
  HOT_DELTA,
  RATE_WARN,
  SEV_TONE,
  ZONE_DELTA,
  coverageTone,
  findHotSpots,
  fmt0,
  fmt1,
  hiddenBreakdown,
  ruleStage,
  signed,
  tempTone,
  thermalLimits,
  worst,
  zoneEstimates,
  zoneScanDeltas,
  type HotSpot,
  type ScanComparison,
  type ZoneEstimate,
} from "./thermal-derive";
import "./analysis/analysis-page.css";
import "./thermal-view.css";

/** sessionStorage key another page can set to open Thermal at a section id. */
export const THERMAL_SECTION_KEY = "ultron.thermal.section";

const IDS = {
  shell: "thm-shell",
  zones: "thm-zones",
  spots: "thm-spots",
  rules: "thm-rules",
  scanner: "thm-scanner",
} as const;

/** Trend window, simulated minutes. */
const TREND_MIN = 180;
const SHELL_AREA = Math.PI * SHELL_DIA * SHELL_LEN;
const STATUS_LABEL: Record<Tone, string> = { good: "Normal", warn: "Warning", bad: "Alarm", idle: "No view", info: "Confirming" };

/** Monochrome by default: status colour only for warning / alarm. */
const quiet = (t: Tone): Tone => (t === "warn" || t === "bad" ? t : "idle");
const alarmTone = (t: Tone): Tone | undefined => (t === "warn" || t === "bad" ? t : undefined);

/* ------------------------------------------------------------------ */
/* Entry                                                               */
/* ------------------------------------------------------------------ */

export interface ThermalViewProps {
  machine: AssetMachine;
}

export function ThermalView({ machine }: ThermalViewProps) {
  const simulation = useKilnSimulationFor(machine.id);
  const starting = useLivePlantStarting();
  if (!simulation || !simulation.frame.defs.hasShell) {
    return (
      <div className="ast-root pg-analysis thm-root" aria-label="Thermal">
        <header className="pg-analysis-head">
          <div className="pg-analysis-head-main">
            <h2 className="pg-analysis-title">Thermal</h2>
          </div>
        </header>
        <section className="ast-card">
          {starting ? (
            <Empty title="Starting the live plant…" />
          ) : (
            <Empty title="No shell scanner on this machine">Thermal needs a live kiln shell scanner profile and its shell maximum.</Empty>
          )}
        </section>
      </div>
    );
  }
  return <ThermalPage machine={machine} simulation={simulation} />;
}

/* ------------------------------------------------------------------ */
/* Section history of the scanner map, kept from the page opening.     */
/* The kiln-seal engine keeps history for scalar tags only (CAL-KLN-03),*/
/* so other sections' trends start when the page opens. The pyro line  */
/* also keeps one scanner map per scan (`frame.shellScans`).           */
/* ------------------------------------------------------------------ */

interface ProfileSample {
  t: number;
  colMax: Array<number | null>;
}

function useProfileHistory(t: number, colMax: Array<number | null>): ProfileSample[] {
  const [hist, setHist] = useState<{ t: number; buf: ProfileSample[] }>({ t: Number.NaN, buf: [] });
  if (hist.t !== t) {
    // Derived-state update during render (React's "store information from previous renders").
    setHist((h) => (h.t === t ? h : { t, buf: [...h.buf.filter((s) => s.t < t).slice(-(TREND_MIN - 1)), { t, colMax }] }));
  }
  return hist.buf;
}

/** Least-squares rate, K per simulated hour, of (t in sim minutes, v). */
function ratePerHour(pts: Array<{ t: number; v: number }>, n = 20): number | null {
  const p = pts.slice(-n);
  if (p.length < 5) return null;
  const xm = p.reduce((a, b) => a + b.t, 0) / p.length;
  const ym = p.reduce((a, b) => a + b.v, 0) / p.length;
  let num = 0;
  let den = 0;
  for (const q of p) {
    num += (q.t - xm) * (q.v - ym);
    den += (q.t - xm) ** 2;
  }
  return den ? (num / den) * 60 : null;
}

/** Simulated hours as a duration label (formatDuration handles wall-clock mode). */
function fmtHours(h: number): string {
  if (!Number.isFinite(h) || h <= 0) return "—";
  return formatDuration(h * 60);
}

interface SpotRow extends HotSpot {
  rate: number | null;
  /** Rate derived on this page from the section history (not the engine's CAL-KLN-03 slope). */
  rateDerived: boolean;
  persistence: string;
  ttl: string | null;
}

/** Muted footnote-style provenance suffix. */
function Est({ children = "est." }: { children?: string }) {
  return <span className="thm-est">{children}</span>;
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function ThermalPage({ machine, simulation }: { machine: AssetMachine; simulation: KilnSimulation }) {
  const { setActiveSubPage } = useIndustrialData();
  const { timeZone } = useSiteTimeZone({ machineId: machine.id });
  // One machine condition everywhere (same source as every other machine page).
  const machineCondition = toCondition(useLiveMachineStatus(machine.id, { health: machine.health, status: machine.status }).status);
  const { frame } = simulation;
  const { defs } = frame;
  // Pyro line: shell-temperature deviation only (D4 ENGINEERING LIMITATION 3); thresholds and derived values per D5
  // Tables 5.4.7a / 9.2 / 9.5, from the engine's thermal-map processing (`frame.shellThermal`).
  const pyro = defs.plant === "pyro";
  const lim = thermalLimits(pyro);
  const th = frame.shellThermal ?? null;
  // Map shown: live, or one of the maps kept around a finding (D5 Table 9.5: map snapshot attached to each finding).
  const [snapKey, setSnapKey] = useState("live");
  const [snapT, setSnapT] = useState<number | null>(null);
  const snapEntry = th && snapKey !== "live" ? (th.findingMaps.find((f) => `${f.ruleId}@${f.since}` === snapKey) ?? null) : null;
  const snapMap = snapEntry
    ? (snapEntry.maps.find((x) => x.t === snapT) ?? snapEntry.maps.reduce((a, b) => (Math.abs(b.t - snapEntry.since) < Math.abs(a.t - snapEntry.since) ? b : a), snapEntry.maps[0]) ?? null)
    : null;
  const live = snapMap === null;
  const shellMax = frame.signals["CAL-KLN-03"];
  const coverageSig = frame.signals["STS-KLN-08"];
  const torque = frame.signals["ELE-KLN-01"];
  const speed = defs.speedTag ? frame.signals[defs.speedTag] : undefined;
  const shellSystem = defs.signalByTag["CAL-KLN-03"]?.system ?? "";
  // Thermal rules of this machine: the first is its hot-spot / refractory rule.
  const ruleIds = defs.thermalRules;
  const hotRuleId = ruleIds[0] ?? null;
  // Handheld scan of the shell, recorded by hand (manual record), if the machine has one.
  const manualDef = defs.signals.find((d) => d.origin === "manual" && d.sub === defs.signalByTag["CAL-KLN-03"]?.sub) ?? null;

  const map = useMemo(
    () =>
      snapMap
        ? buildShellMap(snapMap.profile, snapMap.model, snapMap.coverage, snapMap.t, snapMap.local)
        : buildShellMap(frame.shellProfile, frame.shellModel, coverageSig?.value ?? SHELL_NORMAL_COVERAGE, frame.t, th?.local ?? null),
    [snapMap, frame.shellProfile, frame.shellModel, coverageSig?.value, frame.t, th?.local],
  );
  // Map colours span the coolest to hottest visible cell; the legend shows the same range.
  const range = useMemo(() => heatRange(map), [map]);
  const bandFrom = live && th?.coldBand ? th.coldBand.from : lim.coldBand.from;
  const bandTo = live && th?.coldBand ? th.coldBand.to : lim.coldBand.to;
  const coldSpan = useMemo(() => ({ from: bandFrom, to: bandTo }), [bandFrom, bandTo]);
  const lastGood = useMemo<LastGood | null>(
    () => (th && live ? { v: th.lastGood, at: th.lastGoodAt, t: frame.t, maxAge: SHELL_LAST_GOOD_MAX_AGE } : null),
    [th, live, frame.t],
  );
  const spots = useMemo(() => findHotSpots(map), [map]);
  const estimates = useMemo(
    () => zoneEstimates(map, spots, { coldBandResidual: frame.coldBandResidual, torqueZ: torque?.z ?? null, deviationOnly: pyro, coldBandSpan: coldSpan }),
    [map, spots, frame.coldBandResidual, torque?.z, pyro, coldSpan],
  );
  const hidden = useMemo(() => hiddenBreakdown(map, SHELL_TYRES.map((t) => t.z)), [map]);
  const history = useProfileHistory(frame.t, map.colMax);
  // Zone change against the previous validated scan and the last shift (engine scan history, when kept).
  const scanCmp = useMemo(() => (frame.shellScans ? zoneScanDeltas(frame.shellScans, SHELL_ZONES) : null), [frame.shellScans]);

  const status: Severity = shellMax?.status ?? "Normal";
  const coverage = coverageSig?.value ?? map.coverage;
  const covTone = worst(coverageTone(coverage, lim.coverage), SEV_TONE[coverageSig?.status ?? "Normal"]);
  const slope = shellMax?.slopePerHour ?? null;
  const ttl = shellMax?.timeToLimit && shellMax.timeToLimit !== "—" ? shellMax.timeToLimit : null;
  const hotZone = shellZoneAt(map.maxZ);
  const modelAtMax = map.model[map.maxI];
  const aboveModel = map.max - modelAtMax;
  const margin = SHELL_ALERT - map.max;
  const maxTone = worst(SEV_TONE[status], tempTone(map.max));

  const rulesById = useMemo(() => new Map(frame.rules.map((r) => [r.id, r])), [frame.rules]);
  const shellRule = (hotRuleId && rulesById.get(hotRuleId)) || null;
  const thermalRules = useMemo(() => {
    // Pyro line: every rule that reads the shell map or the scanner is listed, quiet or not.
    const shellInputs = pyro ? defs.rules.filter((d) => !ruleIds.includes(d.id) && d.inputs.some((tg) => tg === "CAL-KLN-03" || tg === "STS-KLN-08")).map((d) => d.id) : [];
    const ids = [...ruleIds, ...shellInputs];
    const base = ids.map((id) => rulesById.get(id)).filter((r): r is RuleState => Boolean(r));
    const shellTags = new Set(["CAL-KLN-03", "STS-KLN-08", ...(manualDef ? [manualDef.tag] : [])]);
    const extra = frame.rules.filter((r) => !ids.includes(r.id) && r.status !== "QUIET" && r.tags.some((t) => shellTags.has(t)));
    return [...base, ...extra];
  }, [frame.rules, rulesById, ruleIds, manualDef, pyro, defs.rules]);
  const openRules = thermalRules.filter((r) => r.status !== "QUIET");

  /* Hot-spot rows with persistence and growth (hottest: engine; others: page history). */
  const spotRows: SpotRow[] = useMemo(
    () =>
      spots.map((s) => {
        const series = history
          .map((h) => ({ t: h.t, v: h.colMax[s.peakI] }))
          .filter((p): p is { t: number; v: number } => p.v != null);
        const isMax = s.peakI === map.maxI;
        const engineRate = isMax && slope !== null;
        const rate = engineRate ? slope : ratePerHour(series);
        let run = 0;
        for (let n = series.length - 1; n >= 0 && series[n].v - s.model >= HOT_DELTA; n--) run++;
        let persistence: string;
        if (isMax && shellRule?.status === "ACTIVE" && shellRule.since != null) persistence = fmtHours((frame.t - shellRule.since) / 60);
        else if (s.delta < HOT_DELTA) persistence = "—";
        else if (series.length < 2) persistence = "collecting";
        else if (run >= series.length) persistence = `≥ ${fmtHours(run / 60)}`;
        else persistence = fmtHours(run / 60);
        const ttlSpot = isMax && ttl ? ttl : rate !== null && rate > 0.5 && s.peak < SHELL_ALERT ? fmtHours((SHELL_ALERT - s.peak) / rate) : null;
        return { ...s, rate, rateDerived: rate !== null && !engineRate, persistence, ttl: ttlSpot };
      }),
    [spots, history, map.maxI, slope, shellRule, frame.t, ttl],
  );
  const realSpots = spotRows.filter((s) => s.delta >= HOT_DELTA || s.peak >= SHELL_ALERT);

  /* Selected section: a chosen hot spot, a clicked section, or the hottest section. */
  const [selSpotId, setSelSpotId] = useState<string | null>(null);
  const [manualI, setManualI] = useState<number | null>(null);
  const selSpot = spotRows.find((s) => s.id === selSpotId) ?? null;
  const selI = selSpot ? selSpot.peakI : (manualI ?? map.maxI);
  const selZ = selI * SHELL_DZ;
  const selRow = selSpot ?? spotRows.find((s) => s.peakI === selI) ?? null;

  const selTrend = useMemo<{ samples: TrendSample[]; source: string }>(() => {
    if (selI === map.maxI) {
      const h = frame.history["CAL-KLN-03"] ?? [];
      const mh = frame.modelHistory["CAL-KLN-03"] ?? [];
      const n = Math.min(h.length, TREND_MIN);
      const out: TrendSample[] = [];
      for (let i = h.length - n; i < h.length; i++) out.push({ t: simTimeMs(frame.t - (h.length - 1 - i)), v: h[i], b: mh[i] });
      return { samples: out, source: "CAL-KLN-03 · shell max" };
    }
    const m = map.model[selI];
    const out: TrendSample[] = [];
    // Engine scan history (one map per scan), when kept: covers the hours before the page opened.
    const scans = frame.shellScans?.filter((s) => s.t > frame.t - TREND_MIN) ?? [];
    if (scans.length > 1) {
      for (const s of scans) {
        const v = s.profile[selI];
        if (Number.isFinite(v)) out.push({ t: simTimeMs(s.t), v, b: m });
      }
      return { samples: out, source: `${selZ.toFixed(1)} m · scanner maps, one per scan` };
    }
    for (const s of history) {
      const v = s.colMax[selI];
      if (v != null) out.push({ t: simTimeMs(s.t), v, b: m });
    }
    return { samples: out, source: `${selZ.toFixed(1)} m · since page opened` };
  }, [selI, map.maxI, map.model, frame.history, frame.modelHistory, frame.shellScans, frame.t, history, selZ]);

  /* Overall state. */
  const rateTone: Tone = slope !== null && slope > lim.rateWarn ? "warn" : "good";
  // D5 Table 5.4.7a: time to the danger limit, with a range from the rate's uncertainty (± 25 %).
  const toDanger = live && pyro && slope !== null && slope > 0.5 && map.max < SHELL_DANGER ? (SHELL_DANGER - map.max) / slope : null;
  const dangerText = toDanger === null ? null : `${fmtHours(toDanger)} (${fmtHours(toDanger / 1.25)}–${fmtHours(toDanger / 0.8)})`;
  const area1h = live && th?.areaAboveAlert1h != null ? map.hotArea - th.areaAboveAlert1h : null;
  const offZones = estimates.filter((e) => e.kind !== "normal" && e.kind !== "no-view");
  const lastScan = formatLocalTime(simTimeMs(frame.t), { seconds: false, timeZone });

  /* Navigation. */
  const go = (sub: AssetsSubPage) => setActiveSubPage(sub);
  const goAt = (sub: AssetsSubPage, key: string, id: string) => {
    try {
      sessionStorage.setItem(key, id);
    } catch {
      /* storage unavailable: the page opens at the top */
    }
    go(sub);
  };
  const openTrend = (tag: string) => {
    focusSensorOn("trends", tag);
    go("trends");
  };
  const openDiagnosis = () => goAt("diagnosis", DIAGNOSIS_SECTION_KEY, "dx-diagnosis");

  const ruleTone = openRules.length ? worst(...openRules.map((r) => (r.status === "ACTIVE" ? SEV_TONE[r.severity] : "good"))) : "good";
  const index: SectionIndexItem[] = [
    { id: IDS.shell, label: "Shell", tone: alarmTone(maxTone) },
    { id: IDS.zones, label: "Zones", tone: alarmTone(offZones.length ? worst(...offZones.map((e) => e.tone)) : "good") },
    { id: IDS.spots, label: realSpots.length ? "Hot spots" : "Hottest section", tone: alarmTone(realSpots.length ? worst(...realSpots.map((s) => s.tone)) : "good") },
    { id: IDS.rules, label: "Rules", tone: alarmTone(ruleTone) },
    { id: IDS.scanner, label: "Scanner", tone: alarmTone(covTone) },
  ];

  const kpis: KpiItem[] = [
    {
      label: "Shell max",
      value: fmt0(map.max),
      unit: "°C",
      tone: alarmTone(maxTone),
      bar: <LimitTrack min={150} max={Math.max(480, Math.ceil((map.max + 20) / 20) * 20)} value={map.max} warn={SHELL_ALERT} bad={SHELL_DANGER} />,
      foot: `${margin >= 0 ? `${fmt0(margin)} K to` : `${fmt0(-margin)} K over`} ${SHELL_ALERT} °C warning${pyro ? " (demo limit)" : ""}${dangerText ? ` · ${SHELL_DANGER} °C in ${dangerText}` : ""}`,
    },
    {
      label: "Above model",
      value: signed(aboveModel),
      unit: "K",
      tone: alarmTone(worst(aboveModel >= lim.hotDelta ? "warn" : "good", rateTone)),
      bar: (
        <LimitTrack
          min={0}
          max={Math.max(pyro ? 100 : 60, Math.ceil((Math.abs(aboveModel) + 10) / 20) * 20)}
          value={Math.max(0, aboveModel)}
          warn={lim.hotDelta}
          bad={pyro ? 2 * lim.hotDelta : 40}
        />
      ),
      foot: `${slope === null ? "—" : `${signed(slope, 1)} K/h`}${ttl ? ` · warning in ${ttl} est.` : ""}`,
    },
    {
      label: `Area ≥ ${SHELL_ALERT} °C`,
      value: map.hotArea.toFixed(1),
      unit: "m²",
      tone: alarmTone(map.hotArea > 2 ? "bad" : map.hotArea > 0 ? "warn" : "good"),
      bar: <LimitTrack min={0} max={Math.max(5, Math.ceil(map.hotArea + 1))} value={map.hotArea} warn={0.01} bad={2} />,
      foot: `of ${SHELL_AREA.toFixed(0)} m² shell${area1h !== null ? ` · ${signed(area1h, 1)} m² in 1 h` : ""}`,
    },
    {
      label: "Scanner coverage",
      value: fmt1(coverage),
      unit: "%",
      tone: alarmTone(covTone),
      bar: <LimitTrack min={70} max={100} value={coverage} warn={lim.coverage.warn} bad={lim.coverage.alarm} low />,
      foot: `${hidden.tyres.toFixed(1)} % behind tyres`,
    },
  ];

  return (
    <div className="ast-root pg-frame pg-analysis thm-root" aria-label="Thermal">
      <PageHeader
        title="Thermal"
        status={{ label: machineCondition, tone: conditionTone(machineCondition) }}
        meta={[
          { label: "Hottest", value: `${map.maxZ.toFixed(1)} m · ${map.maxAngle}° · ${hotZone}${live ? "" : " (kept map)"}` },
          { label: "Scanner", value: `STS-KLN-08 · ${coverageSig?.quality ?? "—"}` },
          { label: "Last scan", value: lastScan },
        ]}
        actions={
          <PillButton variant="secondary" onClick={() => openTrend("CAL-KLN-03")}>
            Trend CAL-KLN-03
          </PillButton>
        }
      />

      <KpiStrip page items={kpis} label="Shell thermal indicators" />

      <SectionIndex items={index} label="Thermal sections" pendingKey={THERMAL_SECTION_KEY} />

      <div className="pg-frame-body pg-analysis-body">
        {/* ===================== Shell: map + axial profile ===================== */}
        <Section
          id={IDS.shell}
          title="Shell"
          right={
            <span className="thm-legend">
              <span>
                <i className="thm-key thm-key-mask" />
                No view
              </span>
              <span>
                <i className="thm-key thm-key-spot" />
                Hot spot
              </span>
              <span>
                <i className="thm-key thm-key-box" />≥ {SHELL_ALERT} °C
              </span>
              <span>
                <i className="thm-key thm-key-cold" />
                Cold band
              </span>
            </span>
          }
        >
          <div className="thm-card" aria-label="Shell scanner map and axial profile">
            {th && th.findingMaps.length > 0 && (
              <div className="thm-card-head thm-snap">
                <PillNav
                  ariaLabel="Map shown: live or kept around a finding"
                  activeId={snapEntry ? snapKey : "live"}
                  onChange={(id) => {
                    setSnapKey(id);
                    setSnapT(null);
                  }}
                  items={[
                    { id: "live", label: "Live" },
                    ...th.findingMaps.map((f) => ({ id: `${f.ruleId}@${f.since}`, label: `${f.ruleId} · ${formatLocalTime(simTimeMs(f.since), { seconds: false, timeZone })}` })),
                  ]}
                />
                {snapEntry && snapMap && (
                  <PillNav
                    ariaLabel="Kept map time relative to the finding"
                    activeId={String(snapMap.t)}
                    onChange={(id) => setSnapT(Number(id))}
                    items={snapEntry.maps.map((x) => ({ id: String(x.t), label: x.t === snapEntry.since ? "0" : `${x.t > snapEntry.since ? "+" : "−"}${Math.abs(x.t - snapEntry.since)} min` }))}
                  />
                )}
              </div>
            )}
            <div className="thm-card-head">
              <span className="thm-meta">
                {shellSystem ? `${shellSystem} · ` : ""}
                {SHELL_LEN} m × 360° · {SHELL_DZ} m × {SHELL_DA}°
                {pyro ? " · 148 cells × 72 (149 section nodes) · engine map (D5 Table 9.5)" : ""}
                {snapEntry && snapMap ? ` · kept map ${formatLocalTime(simTimeMs(snapMap.t), { seconds: false, timeZone })} for ${snapEntry.ruleId}` : ""}
              </span>
              <span className="thm-meta">
                Section <strong className="ast-num thm-ink">{selZ.toFixed(1)} m</strong>
                {(manualI !== null || selSpotId) && (
                  <button
                    type="button"
                    className="thm-link"
                    onClick={() => {
                      setManualI(null);
                      setSelSpotId(null);
                    }}
                  >
                    Follow hottest
                  </button>
                )}
              </span>
            </div>
            <ShellMapFigure
              map={map}
              range={range}
              status={status}
              spots={realSpots}
              selI={selI}
              selSpot={selSpot?.id ?? null}
              onSelect={(i) => {
                setSelSpotId(null);
                setManualI(i);
              }}
              coldBand={coldSpan}
              lastGood={lastGood}
              handheld={live ? (th?.handheld?.points ?? null) : null}
            />
            <div className="thm-axis-pad">
              <HeatScale range={range} />
            </div>
            <div className="thm-divider" />
            <div className="thm-card-head">
              <span className="thm-meta">Axial profile</span>
              <span className="thm-legend">
                <span>
                  <i className="thm-key thm-key-line" />
                  Section max
                </span>
                <span>
                  <i className="thm-key thm-key-mean" />
                  Mean
                </span>
                <span>
                  <i className="thm-key thm-key-model" />
                  Model
                </span>
              </span>
            </div>
            <ProfileChart map={map} selI={selI} spots={realSpots} coldBand={coldSpan} />
          </div>
        </Section>

        {/* ===================== Zones (with lining estimate) ===================== */}
        <Section
          id={IDS.zones}
          title="Zones"
          right={
            <span className="thm-actions">
              <PillButton variant="secondary" className="pg-analysis-link" onClick={() => goAt("analysis", ANALYSIS_ANCHOR_KEY, "an-diagnosis")}>
                Root cause
              </PillButton>
              <PillButton variant="secondary" className="pg-analysis-link" onClick={() => goAt("prognosis", PROG_SECTION_KEY, "prog-forecast")}>
                Forecast
              </PillButton>
            </span>
          }
        >
          <div className="thm-card" aria-label="Zones">
            <ZoneTable estimates={estimates} hotZone={hotZone} torqueZ={torque?.z ?? null} pyro={pyro} scanCmp={scanCmp} />
          </div>
        </Section>

        {/* ===================== Hot spots / hottest section ===================== */}
        <Section id={IDS.spots} title={realSpots.length ? "Hot spots" : "Hottest section"}>
          <div className="thm-card" aria-label="Hot spots">
            <div className={realSpots.length ? "thm-spots" : "thm-spots is-single"}>
              {realSpots.length > 0 && (
                <div className="thm-spots-table">
                  <SpotTable
                    rows={realSpots}
                    rateWarn={lim.rateWarn}
                    selected={selRow?.id ?? null}
                    onSelect={(id) => {
                      setManualI(null);
                      setSelSpotId(id);
                    }}
                  />
                </div>
              )}
              <div className="thm-spots-detail">
                <div className="thm-detail-polar">
                  <span className="thm-meta">
                    <strong className="ast-num thm-ink">{selZ.toFixed(1)} m</strong> · {shellZoneAt(selZ)}
                  </span>
                  <PolarChart map={map} i={selI} />
                </div>
                <SectionFacts map={map} i={selI} spot={selRow} engineRate={selI === map.maxI && live ? slope : null} />
                <div className="thm-detail-trend">
                  <span className="thm-meta">{selTrend.source}</span>
                  {selTrend.samples.length > 1 ? (
                    <TrendTimeZoneContext.Provider value={timeZone}>
                      <TrendChart
                        samples={selTrend.samples}
                        timeDomain={[selTrend.samples[0].t, selTrend.samples[selTrend.samples.length - 1].t]}
                        unit="°C"
                        limits={{ warn: SHELL_ALERT, alarm: SHELL_DANGER, mode: "high" }}
                        decimals={0}
                        height={190}
                        ariaLabel={`Section temperature in °C, measured and model, with warning ${SHELL_ALERT} and alarm ${SHELL_DANGER} °C`}
                      />
                    </TrendTimeZoneContext.Provider>
                  ) : (
                    <span className="thm-meta">Collecting section history…</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ===================== Rules ===================== */}
        <Section
          id={IDS.rules}
          title="Rules"
          right={
            <PillButton variant="secondary" className="pg-analysis-link" onClick={openDiagnosis}>
              Rule evidence
            </PillButton>
          }
        >
          <div className="thm-card" aria-label="Thermal rules">
            <RuleTable rules={thermalRules} now={frame.t} />
          </div>
        </Section>

        {/* ===================== Scanner ===================== */}
        <Section
          id={IDS.scanner}
          title="Scanner"
          right={
            <PillButton
              variant="secondary"
              className="pg-analysis-link"
              onClick={() => {
                focusSensorOn("sensors", "STS-KLN-08");
                go("sensors");
              }}
            >
              STS-KLN-08
            </PillButton>
          }
        >
          <ScannerHealth
            frame={frame}
            limits={lim}
            coverage={coverage}
            covTone={covTone}
            hidden={hidden}
            lastScan={lastScan}
            speedRpm={speed?.value ?? null}
            speedTag={defs.speedTag}
            manualTag={manualDef?.tag ?? null}
            timeZone={timeZone}
          />
        </Section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* KPI tile with a limit track                                         */
/* ------------------------------------------------------------------ */

interface BarSpec {
  min: number;
  max: number;
  value: number;
  warn: number;
  bad: number;
  /** Low-is-bad scale (coverage). */
  low?: boolean;
}

/** Value on a track with alert / alarm marks. */
function LimitTrack({ min, max, value, warn, bad, low }: BarSpec) {
  const W = 200;
  const x = (v: number) => 2 + Math.max(0, Math.min(1, (v - min) / (max - min))) * (W - 4);
  const tone: Tone = low ? (value <= bad ? "bad" : value <= warn ? "warn" : "good") : value >= bad ? "bad" : value >= warn ? "warn" : "good";
  return (
    <svg className="thm-bar" viewBox={`0 0 ${W} 10`} preserveAspectRatio="none" aria-hidden="true">
      <rect x="2" y="4" width={W - 4} height="2" className="thm-bar-track" />
      <rect x={x(warn) - 0.75} y="1" width="1.5" height="8" className="thm-bar-mark" />
      <rect x={x(bad) - 0.75} y="1" width="1.5" height="8" className="thm-bar-mark" />
      <rect x={x(value) - 1.5} y="0" width="3" height="10" className="thm-bar-value" data-tone={alarmTone(tone)} />
    </svg>
  );
}

function Cell({ title, sub }: { title: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <span className="ast-cell-stack">
      <span className="ast-cell-title">{title}</span>
      {sub && <span className="ast-cell-sub">{sub}</span>}
    </span>
  );
}

/** Numeric cell coloured only in warning / alarm. */
function ToneNum({ tone, value, unit, strong }: { tone?: Tone; value: string; unit?: string; strong?: boolean }) {
  const t = tone ? alarmTone(tone) : undefined;
  return (
    <span className="thm-tone-text" data-tone={t}>
      <Num value={value} unit={unit} strong={strong} />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Zones                                                               */
/* ------------------------------------------------------------------ */

function ZoneTable({
  estimates,
  hotZone,
  torqueZ,
  pyro,
  scanCmp,
}: {
  estimates: ZoneEstimate[];
  hotZone: string;
  torqueZ: number | null;
  pyro: boolean;
  scanCmp: ScanComparison | null;
}) {
  const scanCols: Col<ZoneEstimate>[] = scanCmp
    ? [
        {
          key: "dscan",
          header: "Δ scan K",
          align: "right",
          render: (e) => {
            const d = scanCmp.byZone.get(e.zone.name)?.scan ?? null;
            return <ToneNum tone={d !== null && Math.abs(d) >= HOT_DELTA ? "warn" : undefined} value={signed(d)} />;
          },
        },
        {
          key: "dshift",
          header: "Δ shift K",
          align: "right",
          render: (e) => {
            const d = scanCmp.byZone.get(e.zone.name)?.shift ?? null;
            return <ToneNum tone={d !== null && Math.abs(d) >= ZONE_DELTA ? "warn" : undefined} value={signed(d)} />;
          },
        },
      ]
    : [];
  const cols: Col<ZoneEstimate>[] = [
    {
      key: "zone",
      header: "Zone",
      render: (e) => <Cell title={e.zone.name === hotZone ? <>{e.zone.name} <span className="thm-flag">hottest</span></> : e.zone.name} sub={`${e.zone.from}–${e.zone.to} m`} />,
    },
    { key: "max", header: "Max °C", align: "right", render: (e) => <ToneNum tone={Number.isFinite(e.zone.max) ? tempTone(e.zone.max) : undefined} value={fmt0(e.zone.max)} strong /> },
    { key: "mean", header: "Mean °C", align: "right", render: (e) => <Num value={fmt0(e.zone.mean)} /> },
    { key: "model", header: "Model °C", align: "right", render: (e) => <Num value={fmt0(e.zone.model)} /> },
    { key: "dev", header: "Δ mean K", align: "right", render: (e) => <ToneNum tone={Math.abs(e.meanDelta) > ZONE_DELTA ? "warn" : undefined} value={signed(e.meanDelta)} /> },
    { key: "dmax", header: "Δ max K", align: "right", render: (e) => <ToneNum tone={e.maxDelta >= HOT_DELTA ? "warn" : undefined} value={signed(e.maxDelta)} /> },
    ...scanCols,
    { key: "above", header: `≥ ${SHELL_ALERT} °C %`, align: "right", render: (e) => <Num value={e.zone.pAbove.toFixed(1)} /> },
    { key: "spots", header: "Hot spots", align: "right", render: (e) => <Num value={String(e.spots.filter((s) => s.delta >= HOT_DELTA).length)} /> },
    {
      key: "lining",
      header: pyro ? "Shell-temperature deviation" : "Lining / coating",
      render: (e) => (
        <Cell
          title={
            <span className="thm-tone-text" data-tone={alarmTone(e.tone)}>
              {e.label} {!pyro && e.kind !== "normal" && e.kind !== "no-view" && <Est />}
            </span>
          }
          sub={e.coldBand !== null ? `Cold band ${COLD_BAND.from}–${COLD_BAND.to} m ${signed(e.coldBand)} K · torque ${signed(torqueZ, 1)}σ` : undefined}
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (e) => {
        const t: Tone = Number.isFinite(e.zone.max) ? worst(tempTone(e.zone.max), e.tone === "idle" ? "good" : e.tone) : "idle";
        return <StatusTag tone={quiet(t)} label={Number.isFinite(e.zone.max) ? STATUS_LABEL[t] : "No view"} />;
      },
    },
  ];
  return <DataTable columns={cols} data={estimates} rowKey={(e) => e.zone.name} label="Kiln zones against the model" />;
}

/* ------------------------------------------------------------------ */
/* Hot spots                                                           */
/* ------------------------------------------------------------------ */

function SpotTable({
  rows,
  selected,
  onSelect,
  rateWarn = RATE_WARN,
  illustrativeAngle = false,
}: {
  rows: SpotRow[];
  selected: string | null;
  onSelect: (id: string) => void;
  /** Warning rate of rise, K/h. */
  rateWarn?: number;
  /** The angle is synthesised from the axial profile. */
  illustrativeAngle?: boolean;
}) {
  return (
    <div className="ui-table-container ast-table">
      <table className="ui-table" aria-label="Hot spots, hottest first">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">{illustrativeAngle ? "Position (angle illus.)" : "Position"}</th>
            <th scope="col" className="thm-r">
              Peak °C
            </th>
            <th scope="col" className="thm-r">
              Δ model K
            </th>
            <th scope="col" className="thm-r">
              Area m²
            </th>
            <th scope="col" className="thm-r">
              Rate K/h
            </th>
            <th scope="col" className="thm-r">
              Persists
            </th>
            <th scope="col" className="thm-r">
              To warning
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr
              key={s.id}
              className={`is-clickable ${selected === s.id ? "active" : ""}`}
              {...rowActivate(() => onSelect(s.id), selected === s.id)}
            >
              <td>
                <span className="ast-num thm-rank">{s.rank}</span>
              </td>
              <td>
                <Cell title={<span className="ast-num">{`${s.peakZ.toFixed(1)} m · ${s.peakA}°`}</span>} sub={s.zone} />
              </td>
              <td className="thm-r">
                <ToneNum tone={tempTone(s.peak)} value={fmt0(s.peak)} strong />
              </td>
              <td className="thm-r">
                <Num value={signed(s.delta)} />
              </td>
              <td className="thm-r">
                <Num value={s.area.toFixed(2)} />
              </td>
              <td className="thm-r">
                {s.rate === null ? <span className="ast-muted">—</span> : <ToneNum tone={s.rate > rateWarn ? "warn" : undefined} value={signed(s.rate, 1)} />}
              </td>
              <td className="thm-r">
                <span className="ast-num">{s.persistence}</span>
              </td>
              <td className="thm-r">
                {s.ttl ? (
                  <span className="ast-num">
                    {s.ttl} <Est />
                  </span>
                ) : (
                  <span className="ast-muted">{s.peak >= SHELL_ALERT ? "at warning" : "—"}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionFacts({
  map,
  i,
  spot,
  engineRate,
  illustrativeAngle = false,
}: {
  map: ShellMap;
  i: number;
  spot: SpotRow | null;
  engineRate: number | null;
  illustrativeAngle?: boolean;
}) {
  const rate = spot?.rate ?? engineRate;
  const derived = spot ? spot.rateDerived : false;
  const top = map.colMax[i];
  const mean = map.colMean[i];
  const model = map.model[i];
  let hotK = -1;
  for (let k = 0; k < SHELL_NA; k++) {
    const j = i * SHELL_NA + k;
    if (!map.mask[j] && (hotK < 0 || map.temp[j] > map.temp[i * SHELL_NA + hotK])) hotK = k;
  }
  const rows: Array<[string, React.ReactNode]> = [
    ["Max", <ToneNum key="m" tone={top == null ? undefined : tempTone(top)} value={fmt0(top)} unit="°C" strong />],
    [
      "At",
      <span key="a">
        <Num value={hotK >= 0 ? String(hotK * SHELL_DA) : "—"} unit="°" />
        {illustrativeAngle && <Est>illus.</Est>}
      </span>,
    ],
    ["Mean", <Num key="n" value={fmt0(mean)} unit="°C" />],
    ["Model", <Num key="o" value={fmt0(model)} unit="°C" />],
    ["Δ model", <Num key="d" value={top == null ? "—" : signed(top - model)} unit="K" />],
    [
      "Rate",
      rate == null ? (
        <span key="r" className="ast-muted">—</span>
      ) : (
        <span key="r">
          <Num value={signed(rate, 1)} unit="K/h" />
          {derived && <Est>calc.</Est>}
        </span>
      ),
    ],
  ];
  return (
    <dl className="thm-dl">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------------------------------------------ */
/* Rules                                                               */
/* ------------------------------------------------------------------ */

function RuleTable({ rules, now }: { rules: RuleState[]; now: number }) {
  if (!rules.length) return <span className="thm-meta">No shell or scanner rule in the library for this machine.</span>;
  const cols: Col<RuleState>[] = [
    { key: "id", header: "Rule", width: "96px", render: (r) => <span className="ast-num thm-ink">{r.id}</span> },
    { key: "name", header: "Name", render: (r) => <Cell title={r.name} sub={r.logic} /> },
    {
      key: "state",
      header: "State",
      render: (r) => {
        const s = ruleStage(r);
        return <StatusTag tone={quiet(s.stage === "Active" ? s.tone : s.stage === "Confirming" ? "warn" : "idle")} label={s.stage === "Active" ? r.severity : s.stage} />;
      },
    },
    {
      key: "count",
      header: "Persistence",
      align: "right",
      render: (r) => {
        const s = ruleStage(r);
        if (s.stage === "Confirming") return <span className="ast-num">{`${r.persistence}/${r.threshold}`}</span>;
        if (s.stage === "Clearing") return <span className="ast-num">{`${r.clean}/4 clean`}</span>;
        return <span className="ast-muted">—</span>;
      },
    },
    {
      key: "since",
      header: "Since",
      align: "right",
      render: (r) => (r.status === "ACTIVE" && r.since != null ? <Num value={fmtHours((now - r.since) / 60)} /> : <span className="ast-muted">—</span>),
    },
    {
      key: "ev",
      header: "Evidence",
      render: (r) => <span className="ast-cell-text thm-wrap">{r.status === "QUIET" ? "—" : r.evidence || "—"}</span>,
    },
  ];
  return <DataTable columns={cols} data={rules} rowKey={(r) => r.id} label="Shell and scanner rules" />;
}

/* ------------------------------------------------------------------ */
/* Scanner                                                             */
/* ------------------------------------------------------------------ */

function ScannerHealth({
  frame,
  limits,
  coverage,
  covTone,
  hidden,
  lastScan,
  speedRpm,
  speedTag,
  manualTag,
  timeZone,
}: {
  frame: SimFrame;
  limits: ReturnType<typeof thermalLimits>;
  coverage: number;
  covTone: Tone;
  hidden: { tyres: number; other: number };
  lastScan: string;
  speedRpm: number | null;
  speedTag: string | null;
  manualTag: string | null;
  timeZone: string | undefined;
}) {
  const cov = frame.signals["STS-KLN-08"];
  const cal = frame.signals["CAL-KLN-03"];
  const man = manualTag ? frame.signals[manualTag] : undefined;
  const manDef = manualTag ? frame.defs.signalByTag[manualTag] : undefined;
  const covDef = frame.defs.signalByTag["STS-KLN-08"];
  // Latest matched handheld record (newest first), D4 Table 6.4 fields.
  const rec = manualTag ? (frame.records?.find((r) => r.tag === manualTag) ?? null) : null;
  const recField = (rx: RegExp) => rec?.fields.find((f) => rx.test(f.label))?.value ?? null;
  const recDate = rec ? formatLocalTime(simTimeMs(rec.t), { date: true, seconds: false, timeZone }) : null;
  const qTone = (q: string | undefined): Tone => (!q || q === "Good" ? "good" : validityTone(q));
  const trend = useMemo<TrendSample[]>(() => {
    const h = frame.history["STS-KLN-08"] ?? [];
    const n = Math.min(h.length, TREND_MIN);
    const out: TrendSample[] = [];
    for (let i = h.length - n; i < h.length; i++) out.push({ t: simTimeMs(frame.t - (h.length - 1 - i)), v: h[i], b: SHELL_NORMAL_COVERAGE });
    return out;
  }, [frame.history, frame.t]);
  const rev = speedRpm && speedRpm > 0 ? 60 / speedRpm : null;

  const rows: Array<{ k: string; v: React.ReactNode; note?: string }> = [
    {
      k: "Coverage",
      v: <ToneNum tone={covTone} value={fmt1(coverage)} unit="%" strong />,
      note: `≥ ${limits.coverage.normal} % ${frame.defs.plant === "pyro" ? "target" : "normal"} · < ${limits.coverage.warn} warning · < ${limits.coverage.alarm} alarm${frame.defs.plant === "pyro" ? " · D5 Tables 5.4.7a / 9.2" : ""}`,
    },
    { k: "Behind tyres", v: <Num value={hidden.tyres.toFixed(1)} unit="%" />, note: "T1 11 m · T2 39 m · T3 60 m" },
    { k: "Other obstruction", v: <ToneNum tone={hidden.other > 0.5 ? "warn" : undefined} value={hidden.other.toFixed(1)} unit="%" />, note: hidden.other > 0.5 ? "lens fouling / dust" : undefined },
    { k: "CAL-KLN-03", v: <span className="thm-tone-text" data-tone={alarmTone(qTone(cal?.quality))}>{cal?.quality ?? "—"}</span>, note: cal?.qualityNote ?? undefined },
    { k: "STS-KLN-08", v: <span className="thm-tone-text" data-tone={alarmTone(qTone(cov?.quality))}>{cov?.quality ?? "—"}</span>, note: cov?.qualityNote ?? undefined },
    ...(rec
      ? [
          {
            k: "Handheld scan",
            v: <Num value={String(rec.value)} unit={rec.unit} strong />,
            note: `${rec.tag} · ${recDate} · ${rec.review.toLowerCase()} · ${rec.by}`,
          },
          {
            k: "Matched zone",
            v: <span className="ast-num">{recField(/station|metre|angle/i) ?? rec.where}</span>,
            note: [recField(/emissivity/i) ? `emissivity ${recField(/emissivity/i)}` : "", rec.method].filter(Boolean).join(" · "),
          },
          {
            k: "Scanner, same zone",
            v: <span className="ast-num">{recField(/scanner/i) ?? "—"}</span>,
            note: recField(/difference/i) ? `handheld − scanner ${recField(/difference/i)}` : undefined,
          },
        ]
      : man && manDef
      ? [
          {
            k: "Handheld scan",
            v: <ToneNum tone={SEV_TONE[man.status]} value={man.display} unit={manDef.unit} />,
            note: `${manDef.tag} · ${manDef.name} · manual record`,
          },
        ]
      : []),
    ...(speedTag ? [{ k: "Revolution", v: <Num value={rev === null ? "—" : rev.toFixed(1)} unit="s" />, note: `${speedTag} ${fmt1(speedRpm)} rpm` }] : []),
    { k: "Last map", v: <span className="ast-num">{lastScan}</span>, note: "map 10 min · values 1 min" },
    ...(frame.defs.plant === "pyro"
      ? [{ k: "Scan rate / resolution", v: <span className="ast-num">2–5 s · 0.5 m × 5°</span>, note: "scan per revolution; 148 × 72 cells; values 1 min; full map 10 min; maps kept ± 1 h around findings (D5 Tables 5.4.7a / 9.1 / 9.5)" }]
      : covDef?.scanResolution
        ? [{ k: "Scan rate / resolution", v: <span>Pending D5</span>, note: covDef.scanResolution }]
        : []),
    ...(frame.shellThermal?.handheld
      ? frame.shellThermal.handheld.points.map((p) => ({
          k: `Handheld ${p.m} m · ${p.angle}°`,
          v: (
            <ToneNum
              tone={p.gap !== null && Math.abs(p.gap) > 25 ? "warn" : undefined}
              value={p.gap === null ? "no view" : signed(p.gap)}
              unit={p.gap === null ? undefined : "K"}
            />
          ),
          note: `handheld ${p.hand.toFixed(0)} °C · scanner ${p.scan === null ? "no view" : `${p.scan.toFixed(0)} °C`} · round ${formatLocalTime(simTimeMs(frame.shellThermal!.handheld!.at), { seconds: false, timeZone })} · > 25 K = clean the window (SW-KLN-03)`,
        }))
      : []),
    frame.defs.plant === "kiln"
      ? { k: "Instrument", v: <span className="ast-num">0–600 °C · ±2 %</span>, note: "line scan 2–5 s · OPC UA" }
      : { k: "Instrument", v: <span>{covDef?.instrument ?? "—"}</span> },
  ];

  return (
    <div className="thm-card" aria-label="Scanner">
      <div className="thm-scanner">
        <dl className="thm-dl thm-dl-rows">
          {rows.map((r) => (
            <div key={r.k}>
              <dt>{r.k}</dt>
              <dd>{r.v}</dd>
              <span className="thm-dl-note">{r.note ?? ""}</span>
            </div>
          ))}
        </dl>
        <div className="thm-scanner-trend">
          <span className="thm-meta">STS-KLN-08 · coverage</span>
          {trend.length > 1 ? (
            <TrendTimeZoneContext.Provider value={timeZone}>
              <TrendChart
                samples={trend}
                timeDomain={[trend[0].t, trend[trend.length - 1].t]}
                unit="%"
                limits={{ warn: limits.coverage.warn, alarm: limits.coverage.alarm, mode: "low" }}
                decimals={1}
                height={200}
                ariaLabel={`Scanner coverage in %, with warning ${limits.coverage.warn} and alarm ${limits.coverage.alarm} %`}
              />
            </TrendTimeZoneContext.Provider>
          ) : (
            <span className="thm-meta">Collecting coverage history…</span>
          )}
        </div>
      </div>
    </div>
  );
}
