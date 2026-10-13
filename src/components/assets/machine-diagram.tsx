"use client";

import React, { useMemo, useState } from "react";
import { AssetMachine } from "./assets-data";
import { PillButton } from "@/components/ui";
import type { KilnSimulation } from "./kiln-seals-simulation";
import { useKilnSimulationFor } from "@/providers/kiln-simulation-context";
import { formatClock } from "@/lib/kiln-sim/engine";
import { HealthTrendCard } from "@/components/home/home-widgets";
import { useMachineCatalog } from "./use-machine-catalog";
import { buildDetailedSensors, hotspotSensors } from "./machine-sensor-mapping-view";
import { MachineSchematic, type SchematicDot } from "./machine-schematic";
import {
  StatusTag,
  healthTone,
  severityTone,
  type Tone,
} from "./assets-shell-ui";
import "./assets-shell.css";

export interface MachineDiagramProps {
  machine: AssetMachine;
  onNavigateToDiagnosis?: () => void;
  simulation?: KilnSimulation;
}

/**
 * The Overview's numbers for one machine: mapped sensors as schematic dots,
 * subsystems (DB systems when live, else seeded parts) and their roll-up.
 * Shared with the Home machine twin so both always agree.
 */
export function useMachineOverview(
  machine: AssetMachine,
  sensorData?: KilnSimulation["sensorData"]
) {
  // Simulation only overlays LIVE values (kiln machines); components / sensors / mapping come from the DB catalog.
  const kiln = useKilnSimulationFor(machine.id);
  const frame = kiln?.frame ?? null;

  const catalog = useMachineCatalog(machine);

  // Same builder as the Sensor Mapping page → identical rows/values.
  const sensors = useMemo(() => {
    const db = buildDetailedSensors(catalog.sensors, sensorData);
    return db.length > 0 ? db : hotspotSensors(machine);
  }, [catalog.sensors, sensorData, machine]);

  // DB systems when live; otherwise the machine's DB-seeded parts.
  const systems = useMemo(() => {
    if (catalog.isLive && catalog.systems.length > 0) {
      return catalog.systems.map((s) => ({
        id: s.systemId,
        name: s.shortName || s.name,
        health: s.health,
        status: s.status,
        sensorCount: s.sensorCount,
        bbox: s.bbox,
      }));
    }
    return machine.parts.map((p) => ({ id: p.id, name: p.name, health: p.health, status: p.status, sensorCount: 0, bbox: p.bbox }));
  }, [catalog.isLive, catalog.systems, machine.parts]);

  const systemByTag = useMemo(() => new Map(catalog.sensors.map((s) => [s.tag, s.systemId])), [catalog.sensors]);

  const dots = useMemo<SchematicDot[]>(
    () =>
      sensors.map((s) => ({
        tag: s.parameter || s.id,
        name: s.name,
        value: String(s.value ?? ""),
        unit: s.unit || "",
        status: s.status,
        x: s.x,
        y: s.y,
        systemId: systemByTag.get(s.parameter || s.id),
      })),
    [sensors, systemByTag]
  );

  // Overall health = mean of DB systems; condition = worst system status.
  const overall = systems.length
    ? Math.round(systems.reduce((n, s) => n + s.health, 0) / systems.length)
    : machine.health;
  const worst = systems.some((s) => s.status === "Critical")
    ? "Critical"
    : systems.some((s) => s.status === "Advisory")
      ? "Advisory"
      : "Normal";
  const conditionLabel = worst === "Normal" ? "Healthy" : worst;

  const counts = useMemo(() => {
    const c = { Normal: 0, Advisory: 0, Critical: 0 };
    for (const s of sensors) c[s.status] += 1;
    return c;
  }, [sensors]);

  return { catalog, frame, sensors, systems, dots, overall, worst, conditionLabel, counts };
}

export function MachineDiagram({
  machine,
  onNavigateToDiagnosis,
  simulation: externalSimulation,
}: MachineDiagramProps) {
  const [focusSystemId, setFocusSystemId] = useState<string | null>(null);
  const { catalog, frame, systems, dots, overall, worst, conditionLabel, counts } = useMachineOverview(
    machine,
    externalSimulation?.sensorData
  );

  // Machine health over time from the live engine; machines without telemetry show the empty state.
  const trend = useMemo(
    () =>
      frame
        ? { series: frame.healthHistory.overall, labels: frame.times.map((t) => formatClock(t).clock) }
        : { series: [] as number[], labels: [] as string[] },
    [frame]
  );

  return (
    <div className="ast-root">
      <div className="ast-ov">
        <section className="ast-card ast-ov-schem" aria-label="Machine schematic">
          <div className="ast-card-head">
            <div className="ast-legend" role="group" aria-label="Sensor states">
              <span data-tone="good"><i />Normal <b>{counts.Normal}</b></span>
              <span data-tone="warn"><i />Advisory <b>{counts.Advisory}</b></span>
              <span data-tone="bad"><i />Critical <b>{counts.Critical}</b></span>
            </div>
            <span className="ast-caption">
              {machine.model}
            </span>
          </div>
          <div className="ast-sch-wrap">
            <MachineSchematic
              diagramType={machine.diagramType}
              dots={dots}
              focusSystemId={focusSystemId}
              label={`${machine.name} schematic with ${dots.length} mapped sensors`}
            />
          </div>
        </section>

        <aside className="ast-card ast-hp" aria-label="Machine health">
          <div className="ast-hp-hero">
            <HealthDial value={overall} tone={worst === "Normal" ? healthTone(overall) : severityTone(worst)} />
            <div className="ast-hp-sub">
              <span className="ast-hp-label">Machine health</span>
              <StatusTag tone={severityTone(worst)} label={conditionLabel} />
            </div>
          </div>

          <div className="ast-hp-block">
            <div className="ast-hp-block-head">
              <span className="ast-hp-label">Subsystems</span>
              <span className="ast-caption ast-num">{systems.filter((s) => s.status !== "Normal").length} flagged</span>
            </div>
            <ul className="ast-sys-grid" aria-label="Subsystem health">
              {systems.map((s) => {
                const tone = s.status === "Normal" ? healthTone(s.health) : severityTone(s.status);
                return (
                  <li
                    key={s.id}
                    className="ast-sys-tile"
                    data-tone={tone}
                    data-flagged={s.status !== "Normal" || undefined}
                    onMouseEnter={() => catalog.isLive && setFocusSystemId(s.id)}
                    onMouseLeave={() => setFocusSystemId(null)}
                    aria-label={`${s.name}, ${s.health} %, ${s.status}${s.sensorCount ? `, ${s.sensorCount} sensors` : ""}`}
                  >
                    <span className="ast-sys-tile-head">
                      <span className="ast-sys-tile-name">{s.name}</span>
                      <span className="ast-chip-dot" aria-hidden="true" />
                    </span>
                    <span className="ast-sys-tile-value ast-num">
                      {s.health}
                      <span className="ast-unit">%</span>
                    </span>
                    <span className="ast-sys-tile-bar" aria-hidden="true">
                      <i style={{ width: `${Math.max(0, Math.min(100, s.health))}%` }} />
                    </span>
                    <span className="ast-sys-tile-foot ast-num">
                      <span>{s.sensorCount > 0 ? `${s.sensorCount} sensors` : "—"}</span>
                      <span className="ast-sys-tile-status">{s.status}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {onNavigateToDiagnosis && (
            <PillButton variant="primary" onClick={onNavigateToDiagnosis}>
              Open diagnosis
            </PillButton>
          )}
        </aside>
      </div>

      <HealthTrendCard series={trend.series} labels={trend.labels} height={280} />
    </div>
  );
}

/* ------------------------------------------------------------------ dial */
const DIAL = { size: 196, sweep: 240, ticks: 51, rOut: 92, rIn: 80, rZone: 72 } as const;
// Zone breakpoints mirror healthTone(): <75 bad, 75–90 warn, ≥90 good.
const DIAL_ZONES: { from: number; to: number; tone: Tone }[] = [
  { from: 0, to: 75, tone: "bad" },
  { from: 75, to: 90, tone: "warn" },
  { from: 90, to: 100, tone: "good" },
];

function dialPoint(r: number, pct: number) {
  const a = ((-DIAL.sweep / 2 + (pct / 100) * DIAL.sweep) * Math.PI) / 180;
  const c = DIAL.size / 2;
  return { x: c + r * Math.sin(a), y: c - r * Math.cos(a) };
}

function dialArc(r: number, from: number, to: number) {
  const p0 = dialPoint(r, from);
  const p1 = dialPoint(r, to);
  const large = ((to - from) / 100) * DIAL.sweep > 180 ? 1 : 0;
  return `M${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A${r} ${r} 0 ${large} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
}

/** Instrument dial: graduated tick sweep, quiet zone band, value pointer. */
function HealthDial({ value, tone }: { value: number; tone: Tone }) {
  const v = Math.max(0, Math.min(100, value));
  const tip = dialPoint(DIAL.rZone + 4, v);
  const base1 = dialPoint(DIAL.rZone - 6, v - 1.4);
  const base2 = dialPoint(DIAL.rZone - 6, v + 1.4);
  return (
    <span className="ast-dial" data-tone={tone} role="img" aria-label={`Machine health ${Math.round(v)} %`}>
      <svg width={DIAL.size} height={DIAL.size} viewBox={`0 0 ${DIAL.size} ${DIAL.size}`} aria-hidden="true">
        {Array.from({ length: DIAL.ticks }, (_, i) => {
          const pct = (i / (DIAL.ticks - 1)) * 100;
          const major = i % 10 === 0; // every 20 %
          const a = dialPoint(DIAL.rOut, pct);
          const b = dialPoint(major ? DIAL.rIn - 4 : DIAL.rIn, pct);
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className={pct <= v + 0.01 ? "ast-dial-tick on" : "ast-dial-tick"}
              data-major={major || undefined}
            />
          );
        })}
        {DIAL_ZONES.map((z) => (
          <path key={z.tone} d={dialArc(DIAL.rZone, z.from + 0.6, z.to - 0.6)} className="ast-dial-zone" data-tone={z.tone} />
        ))}
        <path
          d={`M${tip.x} ${tip.y} L${base1.x} ${base1.y} L${base2.x} ${base2.y} Z`}
          className="ast-dial-pointer"
        />
      </svg>
      <span className="ast-dial-center">
        <span className="ast-dial-value ast-num">
          {Math.round(v)}
          <span className="ast-unit">%</span>
        </span>
      </span>
      <span className="ast-dial-scale ast-num" aria-hidden="true">
        <span>0</span>
        <span>100</span>
      </span>
    </span>
  );
}
