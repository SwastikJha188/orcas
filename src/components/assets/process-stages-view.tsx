"use client";

import React, { useMemo, useState } from "react";
import { AssetMachine } from "./assets-data";
import type { MachineProcessStage, ProcessIOItem } from "./process-data";
import { useMachineProcesses } from "./use-machine-processes";
import { useKilnSimulationFor } from "@/providers/kiln-simulation-context";
import { linkProcessStages, liveProcessStages, liveSignalStrings, type StageLink } from "./kiln-live-overlay";
import { useMachineCatalog, type MachineCatalog } from "./use-machine-catalog";
import type { SimFrame } from "@/lib/kiln-sim/engine";
import { KilnProcessStageDiagram } from "./kiln-process-diagrams";
import { DiagramPin } from "./kiln-component-diagrams";
import {
  BandMeter,
  KpiTile,
  STATE_VAR,
  ScoreMeter,
  SensorBadge,
  SigmaMeter,
  SigmaStrip,
  StateTag,
  formatSigma,
  parseNumber,
  parseSigma,
  scoreState,
} from "./component-health-view";
import "./diagnosis/health.css";

export interface ProcessStagesViewProps {
  machine: AssetMachine;
}

export interface ProcessPinDetail extends DiagramPin {
  modelValue?: string;
  residual?: string;
  rangeBand?: string;
  subsystem?: string;
  notes?: string;
  /** False when the stage drawing has no position for this sensor (table only). */
  drawn?: boolean;
}

type PinGeometry = [tag: string, x: number, y: number, calloutX: number, calloutY: number, anchor: "left" | "right", subsystem: string];

/**
 * Drawing-space positions of measurement pads on the KLN-01 process-stage
 * schematics (kiln-process-diagrams.tsx), keyed by DB stage id and sensor tag.
 * Geometry only: which sensors a stage has, their names, values, bands and
 * status come from the DB (`process_stages` + catalog) and the live frame.
 */
const STAGE_PIN_GEOMETRY: Record<string, PinGeometry[]> = {
  "kln01-s1": [
    ["FLO-KLN-01", 340, 55, 160, 45, "right", "Cyclone C5 Downcomer Feed Chute (0m)"],
    ["GAS-KLN-01", 127, 94, 160, 110, "right", "High-Temp Extraction Probe Cabinet"],
    ["TMP-KLN-13", 200, 185, 160, 175, "right", "Kiln Inlet Riser Duct & Thermocouple TC-13"],
    ["PRS-KLN-01", 200, 215, 160, 240, "right", "Stationary Inlet Housing Draft Tap"],
    ["STS-KLN-06", 290, 200, 540, 120, "left", "Inlet Lamella Spring Plates (0m)"],
    ["GAS-KLN-02", 235, 80, 540, 190, "left", "Optical Gas Analyser Sample Loop"],
  ],
  "kln01-s2": [
    ["ELE-KLN-01", 130, 175, 160, 95, "right", "630 kW VFD Induction Motor Stator"],
    ["SPD-KLN-01", 165, 195, 160, 165, "right", "Pinion Shaft Speed Encoder"],
    ["VIB-KLN-01", 155, 220, 160, 235, "right", "Motor Drive-End Bearing Housing (NU 228)"],
    ["VIB-KLN-04", 310, 150, 540, 95, "left", "24-Tooth Pinion Shaft Bearing Pedestal"],
    ["STS-KLN-05", 400, 125, 540, 165, "left", "Automatic Open-Gear Grease Spray Skid"],
  ],
  "kln01-s3": [
    ["TMP-KLN-05", 225, 170, 160, 110, "right", "Station 2 Pier (39m) Left Babbitt Journal"],
    ["CAL-KLN-07", 267, 165, 160, 180, "right", "Tyre 2 Retaining Blocks & End-Stops"],
    ["TMP-KLN-01", 140, 190, 160, 245, "right", "Station 1 Support Pier (14m) Babbitt Bearings"],
    ["POS-KLN-01", 390, 136, 540, 90, "left", "Hydraulic Thrust Roller LVDT Linear Position Sensor"],
    ["PRS-KLN-07", 395, 215, 540, 160, "left", "Thrust Cylinder HPU Manifold (7.5 kW)"],
    ["TMP-KLN-09", 480, 190, 540, 230, "left", "Station 3 Support Pier (61m) Babbitt Bearings"],
  ],
  "kln01-s4": [
    ["CAL-KLN-03", 240, 130, 160, 85, "right", "Rotary Shell (40–66m) Burning Zone Section"],
    ["STS-KLN-08", 165, 40, 160, 155, "right", "Overhead Optical Infrared Line-Scanner Track"],
    ["FLO-KLN-01", 120, 145, 160, 225, "right", "Cascading Meal Bed in Shell Interior"],
    ["TMP-KLN-14", 380, 155, 540, 85, "left", "Two-Colour Pyrometer Sightglass through Hood"],
    ["FLO-KLN-02", 420, 155, 540, 155, "left", "Schenck Gravimetric Coal Feeder SFM-02"],
    ["PRS-KLN-03", 470, 175, 540, 225, "left", "Grate Cooler Recuperated Air Throat (via PRS-KLN-03 hood tap)"],
  ],
  "kln01-s5": [
    ["STS-KLN-10", 310, 260, 160, 105, "right", "Outlet Lamella Seal External Cooling Fan (74m)"],
    ["CAL-KLN-07", 337, 165, 160, 175, "right", "Discharge Seal Overlapping Spring Plate Band"],
    ["CAL-KLN-03", 260, 140, 160, 245, "right", "Kiln Shell Nose Ring Castable Refractory (via CAL-KLN-03)"],
    ["PRS-KLN-03", 475, 115, 540, 105, "left", "Kiln Discharge Hood Chamber Draft Tap"],
    ["TMP-KLN-14", 405, 230, 540, 175, "left", "Grate Cooler Inlet Throat Chute (via TMP-KLN-14)"],
    ["FLO-KLN-01", 420, 155, 540, 245, "left", "Total Kiln Pyroprocessing Line Output (via FLO-KLN-01)"],
  ],
  "kln01-s6": [
    ["FLO-KLN-02", 150, 115, 160, 105, "right", "Schenck Gravimetric Feeder SFM-02"],
    ["PRS-KLN-01", 220, 170, 160, 175, "right", "Roots Blower Primary Air Header (via PRS-KLN-01 draft model)"],
    ["TMP-KLN-14", 230, 165, 540, 105, "left", "Multi-Channel Burner Lance Tip"],
    ["PRS-KLN-03", 450, 115, 540, 175, "left", "Discharge Hood Draft Tap"],
  ],
};

/* =========================================================================
   Helpers
   ========================================================================= */

/** Normal band from strings like "280–350 t/h", "-2.5 to -5.0 mbar", "< 1,000 ppm", "> 95.0 %". */
function parseBand(raw: string | undefined): [number, number] | null {
  if (!raw) return null;
  const nums = (raw.replace(/,/g, "").match(/[-+]?\d+(?:\.\d+)?/g) ?? []).map(Number);
  if (nums.length === 0) return null;
  if (/^\s*</.test(raw)) return [0, nums[0]];
  if (/^\s*>/.test(raw)) return [nums[0], /%/.test(raw) ? 100 : nums[0] * 1.25];
  if (nums.length >= 2) return [Math.min(nums[0], nums[1]), Math.max(nums[0], nums[1])];
  return null;
}

/** Residual text without its "(x σ)" suffix. */
function residualText(raw: string | undefined): string {
  if (!raw) return "—";
  return raw.replace(/\s*\([^)]*σ\)\s*$/, "").trim() || raw;
}

/** Measurement points of a stage, from the stage's DB-linked catalog sensors. */
function pinsFor(
  stageId: string,
  link: StageLink | undefined,
  catalog: MachineCatalog,
  frame: SimFrame | null,
): ProcessPinDetail[] {
  if (!link) return [];
  const geometry = new Map((STAGE_PIN_GEOMETRY[stageId] ?? []).map((g) => [g[0], g]));
  const byTag = new Map(catalog.sensors.map((s) => [s.tag, s]));
  const out: ProcessPinDetail[] = [];
  link.tags.forEach((tag, i) => {
    const s = byTag.get(tag);
    if (!s) return;
    const geo = geometry.get(tag);
    const live = frame ? liveSignalStrings(tag, frame) : null;
    out.push({
      id: s.point || `P${i + 1}`,
      tag,
      label: s.name,
      value: s.value,
      unit: s.unit === "state" ? "" : s.unit,
      status: s.status,
      x: geo?.[1] ?? 0,
      y: geo?.[2] ?? 0,
      calloutX: geo?.[3],
      calloutY: geo?.[4],
      anchor: geo?.[5],
      subsystem: geo?.[6] ?? s.subAssembly,
      modelValue: live?.model,
      residual: live ? (live.sigma === "—" ? live.residual : `${live.residual} (${live.sigma})`) : undefined,
      rangeBand: s.nominalBand && s.nominalBand !== "Nominal" ? s.nominalBand : undefined,
      drawn: Boolean(geo),
    });
  });
  return out;
}

function FlowArrow() {
  return (
    <span className="dxh-flow-arrow" aria-hidden="true">
      <svg width={18} height={10} viewBox="0 0 18 10">
        <path d="M1 5h15M12.5 1.5 16 5l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function StreamList({ items, direction }: { items: ProcessIOItem[]; direction: "in" | "out" }) {
  if (items.length === 0) return null;
  return (
    <div className="dxh-streams">
      {items.map((s, i) => (
        <div className="dxh-stream" key={`${s.name}-${i}`} title={`${s.category} · ${s.sourceOrDestination}`}>
          <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden="true">
            {direction === "in" ? (
              <path d="M1 7h9M7 3.5 10.5 7 7 10.5M13 2v10" fill="none" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M1 2v10M4 7h9M9.5 3.5 13 7l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
          <span className="dxh-stream-name">
            {s.status !== "Normal" && (
              <i
                aria-label={s.status}
                style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", marginRight: 6, background: STATE_VAR[s.status] }}
              />
            )}
            {s.name}
          </span>
          <span className="dxh-stream-rate">{s.rateOrSpec}</span>
        </div>
      ))}
    </div>
  );
}

/* =========================================================================
   VIEW
   ========================================================================= */

export function ProcessStagesView({ machine }: ProcessStagesViewProps) {
  const { stages: storedStages, isLoading, isError } = useMachineProcesses(machine);
  const simulation = useKilnSimulationFor(machine.id);
  const frame = simulation?.frame ?? null;
  const catalog = useMachineCatalog(machine);
  const links = useMemo(() => linkProcessStages(storedStages, catalog), [storedStages, catalog]);
  const stages = useMemo(
    () => (frame ? liveProcessStages(storedStages, frame, links) : storedStages),
    [storedStages, frame, links],
  );
  const [selectedStageId, setSelectedStageId] = useState<string>("");
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);

  const activeStage: MachineProcessStage | undefined = stages.find((s) => s.id === selectedStageId) ?? stages[0];

  const summary = useMemo(() => {
    const avg = stages.length ? Math.round(stages.reduce((acc, s) => acc + s.health, 0) / stages.length) : null;
    // A sensor shared by several stages counts once.
    const unique = new Map<string, ProcessPinDetail>();
    for (const s of stages) for (const p of pinsFor(s.id, links[s.id], catalog, frame)) if (!unique.has(p.tag)) unique.set(p.tag, p);
    const points = [...unique.values()];
    let top: { tag: string; sigma: number } | null = null;
    for (const p of points) {
      const sigma = parseSigma(p.residual);
      if (sigma !== null && (!top || Math.abs(sigma) > Math.abs(top.sigma))) top = { tag: p.tag, sigma };
    }
    return { avg, top };
  }, [stages, links, catalog, frame]);

  if (isLoading || catalog.isLoading) {
    return (
      <div className="dxh-root">
        <div className="dxh-empty" role="status" aria-live="polite">
          Loading process stages…
        </div>
      </div>
    );
  }

  if (isError || !activeStage) {
    return (
      <div className="dxh-root">
        <div className="dxh-empty" role="status">
          No process stages for this machine.
        </div>
      </div>
    );
  }

  const stagePins = pinsFor(activeStage.id, links[activeStage.id], catalog, frame);
  const drawnPins = stagePins.filter((p) => p.drawn);
  const processAvg = summary.avg ?? 0;
  const hasDrawing = activeStage.id in STAGE_PIN_GEOMETRY;
  const flowColumns = stages.map(() => "minmax(96px, 1fr)").join(" 22px ");

  const togglePin = (tag: string) => setSelectedPinId((prev) => (prev === tag ? null : tag));

  return (
    <div className="dxh-root">
      {/* Tier 1 · KPI strip */}
      <section className="dxh-kpis" style={{ "--dxh-kpi-count": 2 } as React.CSSProperties} aria-label="Process health summary">
        <KpiTile
          label="Process health"
          value={processAvg}
          unit="%"
          viz={<ScoreMeter value={processAvg} label={`Process health ${processAvg} %`} />}
          foot={<StateTag status={scoreState(processAvg)} />}
        />
        <KpiTile
          label="Largest residual"
          value={summary.top ? formatSigma(summary.top.sigma).replace(" σ", "") : "—"}
          unit="σ"
          viz={summary.top && <SigmaStrip sigma={summary.top.sigma} />}
          foot={summary.top && <span>{summary.top.tag}</span>}
        />
      </section>

      {/* Tier 2 · Process flow schematic + selected stage */}
      <section className="dxh-grid">
        <div className="dxh-card dxh-span-8">
          <header className="dxh-card-head">
            <div>
              <h3 className="dxh-card-title">Process flow</h3>
              <span className="dxh-meta">{`${stages.length} stages`}</span>
            </div>
          </header>

          <div className="dxh-flow" style={{ gridTemplateColumns: flowColumns }} role="group" aria-label="Process stages in flow order">
            {stages.map((stage, i) => {
              const state = stage.status ?? scoreState(stage.health);
              const selected = stage.id === activeStage.id;
              return (
                <React.Fragment key={stage.id}>
                  {i > 0 && <FlowArrow />}
                  <button
                    type="button"
                    className="dxh-node"
                    aria-pressed={selected}
                    aria-label={`Stage ${stage.stepNumber} ${stage.name}, health ${stage.health} %, ${state}`}
                    title={stage.role}
                    onClick={() => {
                      setSelectedStageId(stage.id);
                      setSelectedPinId(null);
                    }}
                  >
                    <span className="dxh-node-top">
                      <span className="dxh-num">{stage.stepNumber}</span>
                      <i style={{ width: 7, height: 7, borderRadius: "50%", background: STATE_VAR[state] }} aria-hidden="true" />
                    </span>
                    <span className="dxh-node-name">{stage.name}</span>
                    <span className="dxh-node-foot">
                      <span className="dxh-bar" aria-hidden="true">
                        <i style={{ width: `${Math.max(0, Math.min(100, stage.health))}%`, background: STATE_VAR[state] }} />
                      </span>
                      <span className="dxh-num">{stage.health} %</span>
                    </span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          {hasDrawing ? (
            <KilnProcessStageDiagram
              stageId={activeStage.id}
              pins={drawnPins}
              selectedPinId={selectedPinId}
              onSelectPin={(pin: DiagramPin) => togglePin(pin.tag)}
              ariaLabel={`${activeStage.name} schematic with ${drawnPins.length} measurement points`}
            />
          ) : (
            <div className="dxh-empty" role="status">
              {`No schematic drawing for this stage · ${stagePins.length} linked sensor${stagePins.length === 1 ? "" : "s"} listed below`}
            </div>
          )}
        </div>

        <div className="dxh-card dxh-span-4">
          <header className="dxh-card-head">
            <div>
              <h3 className="dxh-card-title">{activeStage.name}</h3>
              <span className="dxh-meta">{`Stage ${activeStage.stepNumber}`}</span>
            </div>
            <StateTag status={activeStage.status ?? scoreState(activeStage.health)} />
          </header>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="dxh-hero">
              <span className="dxh-hero-value">
                {activeStage.health}
                <span className="dxh-unit" style={{ fontSize: 16, marginLeft: 4 }}>%</span>
              </span>
              <span className="dxh-meta">{activeStage.role}</span>
            </div>
            <ScoreMeter value={activeStage.health} label={`Stage health ${activeStage.health} %`} />
            {activeStage.transformation && (
              <p className="dxh-sub" title={activeStage.transformation}>
                {activeStage.transformation}
              </p>
            )}
          </div>

          {activeStage.parameters.length > 0 && (
            <>
              <hr className="dxh-divider" />
              <dl className="dxh-kv" aria-label="Stage parameters">
                {activeStage.parameters.map((p, i) => {
                  const state = p.status ?? "Normal";
                  return (
                    <React.Fragment key={`${p.label}-${i}`}>
                      <dt title={p.label}>{p.label}</dt>
                      <dd>
                        {p.value}
                        {p.unit && <span className="dxh-unit">{p.unit}</span>}
                        <i
                          aria-label={state}
                          style={{ width: 6, height: 6, borderRadius: "50%", background: STATE_VAR[state], flexShrink: 0 }}
                        />
                      </dd>
                    </React.Fragment>
                  );
                })}
              </dl>
            </>
          )}

          {(activeStage.inputs.length > 0 || activeStage.outputs.length > 0) && (
            <>
              <hr className="dxh-divider" />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {activeStage.inputs.length > 0 && <span className="dxh-meta">{`Inputs · ${activeStage.inputs.length}`}</span>}
                <StreamList items={activeStage.inputs} direction="in" />
                {activeStage.outputs.length > 0 && <span className="dxh-meta">{`Outputs · ${activeStage.outputs.length}`}</span>}
                <StreamList items={activeStage.outputs} direction="out" />
              </div>
            </>
          )}
        </div>
      </section>

      {/* Tier 3 · Measurement points of the selected stage */}
      <section className="dxh-card">
        <header className="dxh-card-head">
          <div>
            <h3 className="dxh-card-title">Measurement points</h3>
            <span className="dxh-meta">{`${activeStage.name} · ${stagePins.length}`}</span>
          </div>
        </header>
        <div className="dxh-table-wrap">
          <table className="dxh-table">
            <thead>
              <tr>
                <th>Point</th>
                <th>Measured</th>
                <th>Model</th>
                <th>Residual</th>
                <th>Normal band</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stagePins.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <span className="dxh-meta">No catalog sensors are linked to this stage in the database.</span>
                  </td>
                </tr>
              )}
              {stagePins.map((pin) => {
                const sigma = parseSigma(pin.residual);
                const value = parseNumber(pin.value);
                const band = parseBand(pin.rangeBand);
                const selected = selectedPinId === pin.tag;
                return (
                  <tr
                    key={pin.id + pin.tag}
                    tabIndex={0}
                    aria-selected={selected}
                    title={[pin.subsystem, pin.notes].filter(Boolean).join(" — ")}
                    onClick={() => togglePin(pin.tag)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        togglePin(pin.tag);
                      }
                    }}
                  >
                    <td>
                      <div className="dxh-cell-item">
                        <SensorBadge tag={pin.tag} state={pin.status} />
                        <div>
                          <strong>{pin.tag}</strong>
                          <span>{pin.label}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="dxh-cell-stack">
                        <strong>
                          {pin.value}
                          {pin.unit && <span className="dxh-unit">{pin.unit}</span>}
                        </strong>
                      </div>
                    </td>
                    <td>
                      <div className="dxh-cell-stack">
                        <span>{pin.modelValue ?? "—"}</span>
                      </div>
                    </td>
                    <td>
                      <div className="dxh-cell-stack">
                        {sigma !== null ? <SigmaMeter sigma={sigma} /> : <strong>{residualText(pin.residual)}</strong>}
                        {sigma !== null && <span>{residualText(pin.residual)}</span>}
                      </div>
                    </td>
                    <td>
                      <div className="dxh-cell-stack">
                        {value !== null && band ? (
                          <BandMeter value={value} lo={band[0]} hi={band[1]} state={pin.status} />
                        ) : null}
                        <span>{pin.rangeBand ?? "—"}</span>
                      </div>
                    </td>
                    <td>
                      <StateTag status={pin.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
