"use client";

import React, { useMemo, useState } from "react";
import { PillButton } from "@/components/ui";
import { MX, MachineDefs, PAINT, kitStyle, useKitId } from "@/components/assets/machine-kit/machine-kit";
import type { AssetMachine, HierarchyNode } from "../assets-data";
import type { AssetsSubPage } from "../assets-view";
import { IconChevron, IconClose, StatusTag, machineTone, type Tone } from "../assets-shell-ui";
import { MachineSchematic, type SchematicDot } from "../machine-schematic";
import {
  type MachineLookup,
  averageHealth,
  isFolder,
  landingSubPage,
  machineCondition,
  rollupTone,
  subtreeMachines,
} from "../hierarchy/hierarchy-model";
import {
  PLANT_MODELS,
  buildPlantScene,
  type TwinCallout,
} from "@/components/home/twin/plant-twin-model";
import { useKilnFleet } from "@/providers/kiln-simulation-context";
import { VPC_MACHINE_ID } from "@shared/lib/vpc-sim/signals";
import { focusSensorOn } from "../sensor-focus";
import { lineSheetsForMachine } from "./line-sheets";
import { LineSheet, lineSheetCaption, lineSheetHeading } from "./line-sheets/line-sheet";

const W = 1100;
const H = 480;

const toneLabel = (t: Tone) => (t === "bad" ? "Critical" : t === "warn" ? "Alert" : t === "idle" ? "Standby" : "Normal");
const toneColor = (t: Tone) =>
  t === "bad"
    ? "var(--status-danger)"
    : t === "warn"
      ? "var(--status-warning)"
      : t === "good"
        ? "var(--status-success)"
        : "var(--text-muted)";

/**
 * Maps 3D yard coordinates (b.x, b.z) from `buildPlantScene(plant)` into 2D
 * canvas coordinates matching the camera angle in the homepage Digital Twin:
 * Power House on the upper-right, the 3 Casting Cell Bays stepped diagonally
 * down the centre, and Gateway House on the lower-left, with orthogonal dashed
 * Power (grey) and Network (green) runs connecting them.
 */
function projectYard(x3d: number, z3d: number): [number, number] {
  // In the 3D twin camera (VIEW_DIR = [1.2, 0.7, 0.5]):
  //   - Areas sit at z = 0 with x = -22, 0, +22 (stepping down-right in screen space)
  //   - Power house sits at x = 0, z = -24 (upper-right in screen space)
  //   - Gateway house sits at x = +17, z = +22 (lower-left in screen space)
  const cx = 530 + x3d * 4.2 - z3d * 10.5;
  const cy = 248 + x3d * 4.4 + z3d * 2.8;
  return [cx, cy];
}

/** 2D architectural CAD drawing of a Utility Building / Casting Bay on its raised plinth. */
function UtilityBuilding2D({
  x,
  y,
  scale = 1,
  rimColor,
  selected,
}: {
  x: number;
  y: number;
  scale?: number;
  rimColor: string;
  selected: boolean;
}) {
  const bw = 112 * scale;
  const bh = 68 * scale;
  const px = x - bw / 2;
  const py = y - bh / 2;
  const pad = 10 * scale;

  return (
    <g>
      {/* Plinth slab & status rim (matching the 3D twin's raised plinth with coloured rim) */}
      <rect
        x={px - pad}
        y={py - pad}
        width={bw + pad * 2}
        height={bh + pad * 2}
        rx={3}
        fill="var(--bg-surface-elevated)"
        stroke={selected ? "var(--signal-blue)" : rimColor}
        strokeWidth={selected ? 2.4 : 1.8}
      />
      <rect
        x={px - pad + 3}
        y={py - pad + 3}
        width={bw + (pad - 3) * 2}
        height={bh + (pad - 3) * 2}
        rx={2}
        fill="none"
        stroke={MX.fine}
        strokeWidth={0.7}
      />

      {/* Building outer walls */}
      <rect x={px} y={py} width={bw} height={bh} rx={2} {...PAINT.body} />
      {/* Roof parapet inner frame */}
      <rect x={px + 5} y={py + 5} width={bw - 10} height={bh - 10} rx={1.5} {...PAINT.raised} />
      {/* Roof structural ribs */}
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1={px + 5}
          y1={py + bh * f}
          x2={px + bw - 5}
          y2={py + bh * f}
          stroke={MX.fine}
          strokeWidth={0.8}
        />
      ))}

      {/* Rooftop HVAC / extraction unit & vent stack (matching the GLB model details) */}
      <rect x={px + bw - 32 * scale} y={py + 10 * scale} width={20 * scale} height={16 * scale} rx={2} {...PAINT.body} />
      <circle cx={px + bw - 22 * scale} cy={py + 18 * scale} r={5 * scale} {...PAINT.recess} />
      <circle cx={px + bw - 22 * scale} cy={py + 18 * scale} r={1.8 * scale} {...PAINT.shaft} />
      <circle cx={px + 18 * scale} cy={py + 14 * scale} r={4 * scale} {...PAINT.body} />
      <circle cx={px + 18 * scale} cy={py + 14 * scale} r={2 * scale} {...PAINT.recess} />

      {/* Front facade window band & side electrical box */}
      <rect x={px + 10 * scale} y={py + bh - 12 * scale} width={bw * 0.58} height={6 * scale} rx={1} {...PAINT.recess} />
      <rect x={px + bw - 18 * scale} y={py + bh - 13 * scale} width={10 * scale} height={7 * scale} rx={1} {...PAINT.body} />
    </g>
  );
}

/** 2D architectural CAD drawing of the Electrical / Power House with transformer yard. */
function PowerHouse2D({
  x,
  y,
  rimColor,
  selected,
}: {
  x: number;
  y: number;
  rimColor: string;
  selected: boolean;
}) {
  const bw = 138;
  const bh = 74;
  const px = x - bw / 2;
  const py = y - bh / 2;
  const pad = 10;

  return (
    <g>
      {/* Plinth slab */}
      <rect
        x={px - pad}
        y={py - pad}
        width={bw + pad * 2}
        height={bh + pad * 2}
        rx={3}
        fill="var(--bg-surface-elevated)"
        stroke={selected ? "var(--signal-blue)" : rimColor}
        strokeWidth={selected ? 2.4 : 1.6}
      />
      <rect
        x={px - pad + 3}
        y={py - pad + 3}
        width={bw + (pad - 3) * 2}
        height={bh + (pad - 3) * 2}
        rx={2}
        fill="none"
        stroke={MX.fine}
        strokeWidth={0.7}
      />

      {/* Main switchgear building (left 65%) */}
      <rect x={px} y={py} width={88} height={bh} rx={2} {...PAINT.body} />
      <rect x={px + 5} y={py + 5} width={78} height={bh - 10} rx={1.5} {...PAINT.raised} />
      {[0.33, 0.66].map((f) => (
        <line key={f} x1={px + 5} y1={py + bh * f} x2={px + 83} y2={py + bh * f} stroke={MX.fine} strokeWidth={0.8} />
      ))}
      <rect x={px + 12} y={py + 12} width={22} height={14} rx={2} {...PAINT.body} />
      <rect x={px + 46} y={py + 12} width={22} height={14} rx={2} {...PAINT.body} />

      {/* Outdoor step-down transformer yard & fenced enclosure (right 35%, matching GLB) */}
      <rect x={px + 92} y={py + 8} width={44} height={bh - 16} rx={2} fill="none" stroke={MX.edge} strokeWidth={1.1} strokeDasharray="3 2" />
      <rect x={px + 98} y={py + 16} width={32} height={42} rx={2} {...PAINT.body} />
      <rect x={px + 102} y={py + 20} width={24} height={34} rx={1.5} {...PAINT.recess} />
      {/* Transformer bushings / insulators */}
      <circle cx={px + 108} cy={py + 28} r={3.2} {...PAINT.raised} />
      <circle cx={px + 114} cy={py + 28} r={3.2} {...PAINT.raised} />
      <circle cx={px + 120} cy={py + 28} r={3.2} {...PAINT.raised} />
      <circle cx={px + 108} cy={py + 44} r={3.2} {...PAINT.raised} />
      <circle cx={px + 114} cy={py + 44} r={3.2} {...PAINT.raised} />
      <circle cx={px + 120} cy={py + 44} r={3.2} {...PAINT.raised} />
    </g>
  );
}

export function VpcPlantOverview({
  node: plant,
  lookup,
  onSelectNode,
  onOpenMachine,
}: {
  node: HierarchyNode;
  lookup: MachineLookup;
  onSelectNode: (node: HierarchyNode) => void;
  onOpenMachine: (machineId: string, subPage: AssetsSubPage) => void;
}) {
  const kitId = useKitId();
  const scene = useMemo(() => buildPlantScene(plant), [plant]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const areasById = useMemo(
    () => new Map((plant.children ?? []).filter(isFolder).map((a) => [a.id, a])),
    [plant],
  );

  const callouts = useMemo(() => {
    const out: Record<string, TwinCallout> = {};
    for (const b of scene.buildings) {
      const area = b.areaId ? areasById.get(b.areaId) : undefined;
      if (!area) continue;
      const machines = subtreeMachines(area);
      const tone = rollupTone(area, lookup);
      out[b.id] = {
        tone,
        status: toneLabel(tone),
        health: averageHealth(machines, lookup),
        machines: machines.length,
        running: machines.filter((m) => machineTone(machineCondition(m, lookup).status) !== "idle").length,
        alerts: machines.filter((m) => {
          const t = machineTone(machineCondition(m, lookup).status);
          return t === "bad" || t === "warn";
        }).length,
        telemetry: machines.some((m) => machineCondition(m, lookup).isLive) ? "LIVE" : machines.length ? "RECORD" : "—",
      };
    }
    return out;
  }, [scene, areasById, lookup]);

  const byId = useMemo(
    () => new Map(scene.buildings.map((b) => [b.id, { b, pt: projectYard(b.x, b.z) }])),
    [scene.buildings],
  );

  const selected = scene.buildings.find((b) => b.id === selectedId) ?? null;
  const selectedArea = selected?.areaId ? areasById.get(selected.areaId) : undefined;
  const selectedCallout = selected ? callouts[selected.id] : undefined;

  return (
    <section className="ast-card" aria-label="Plant map" style={{ position: "relative" }}>
      <div className="mx-canvas" style={{ position: "relative", padding: 0, overflow: "hidden", borderRadius: "var(--corner-card)" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          role="group"
          aria-label={`${plant.name} 2D digital twin map`}
          style={{ display: "block", ...kitStyle(kitId) }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedId(null);
          }}
        >
          <MachineDefs id={kitId} />
          <defs>
            <pattern id={`${kitId}-yard-grid`} width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M 28 0 L 0 0 0 28" fill="none" stroke={MX.fine} strokeWidth="0.55" opacity="0.55" />
            </pattern>
            <pattern id={`${kitId}-yard-major`} width="140" height="140" patternUnits="userSpaceOnUse">
              <rect width="140" height="140" fill={`url(#${kitId}-yard-grid)`} />
              <path d="M 140 0 L 0 0 0 140" fill="none" stroke={MX.edge} strokeWidth="0.75" opacity="0.4" />
            </pattern>
          </defs>

          {/* Ground grid matching the homepage twin */}
          <rect
            x={0}
            y={0}
            width={W}
            height={H}
            fill={`url(#${kitId}-yard-major)`}
            onClick={() => setSelectedId(null)}
          />

          {/* Orthogonal Power & Network connection lines across the yard floor */}
          <g aria-hidden="true">
            {scene.connections.map((c) => {
              const a = byId.get(c.from)?.b;
              const b = byId.get(c.to)?.b;
              if (!a || !b) return null;
              const isNet = c.kind === "network";
              // Orthogonal route in yard space (out along Z, across along X, into building)
              const off = isNet ? 1.2 : -1.2;
              const midZ = (a.z + b.z) / 2;
              const p0 = projectYard(a.x + off, a.z);
              const p1 = projectYard(a.x + off, midZ);
              const p2 = projectYard(b.x + off, midZ);
              const p3 = projectYard(b.x + off, b.z);
              const d = `M ${p0[0].toFixed(1)} ${p0[1].toFixed(1)} L ${p1[0].toFixed(1)} ${p1[1].toFixed(1)} L ${p2[0].toFixed(1)} ${p2[1].toFixed(1)} L ${p3[0].toFixed(1)} ${p3[1].toFixed(1)}`;
              return (
                <path
                  key={c.id}
                  d={d}
                  fill="none"
                  stroke={isNet ? "var(--status-success)" : "var(--text-muted)"}
                  strokeWidth={1.8}
                  strokeDasharray={isNet ? "6 5" : "10 6"}
                  opacity={0.85}
                />
              );
            })}
          </g>

          {/* Buildings and their callout cards */}
          {scene.buildings.map((b) => {
            const entry = byId.get(b.id);
            if (!entry) return null;
            const [bx, by] = entry.pt;
            const callout = callouts[b.id];
            const tone: Tone = b.areaId && callout ? callout.tone : "idle";
            const rim = b.areaId ? toneColor(tone) : "var(--border-subtle)";
            const isSel = selectedId === b.id;

            // Callout card positioned directly above the building plinth, matching the homepage twin
            const cardW = b.areaId ? 236 : 204;
            const cardH = 54;
            const cardX = bx - cardW / 2;
            const cardY = by - (b.model === "power-house" ? 104 : 96);

            const handleClick = (e: React.MouseEvent) => {
              e.stopPropagation();
              setSelectedId((prev) => (prev === b.id ? null : b.id));
            };

            const handleDoubleClick = (e: React.MouseEvent) => {
              e.stopPropagation();
              if (b.areaId) {
                const area = areasById.get(b.areaId);
                if (area) onSelectNode(area);
              }
            };

            return (
              <g
                key={b.id}
                role="button"
                tabIndex={0}
                aria-label={
                  b.areaId && callout
                    ? `${b.name}, ${callout.status}, ${callout.health ?? "—"}/100`
                    : `${b.name}, Site infrastructure`
                }
                style={{ cursor: "pointer" }}
                onClick={handleClick}
                onDoubleClick={handleDoubleClick}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedId((prev) => (prev === b.id ? null : b.id));
                  }
                }}
              >
                {b.model === "power-house" ? (
                  <PowerHouse2D x={bx} y={by} rimColor={rim} selected={isSel} />
                ) : (
                  <UtilityBuilding2D
                    x={bx}
                    y={by}
                    scale={b.areaId ? 1 : 0.86}
                    rimColor={rim}
                    selected={isSel}
                  />
                )}

                {/* Leader line from building roof to floating callout card */}
                <line
                  x1={bx}
                  y1={by - 34}
                  x2={bx}
                  y2={cardY + cardH}
                  stroke={isSel ? "var(--signal-blue)" : MX.fine}
                  strokeWidth={1}
                />

                {/* Callout card matching `.ph-twin-label` from the homepage twin */}
                <g transform={`translate(${cardX}, ${cardY})`}>
                  <rect
                    x={0}
                    y={0}
                    width={cardW}
                    height={cardH}
                    rx={6}
                    fill="var(--card-bg)"
                    stroke={isSel ? "var(--signal-blue)" : "var(--border-subtle)"}
                    strokeWidth={isSel ? 1.6 : 1}
                  />
                  {/* Status dot */}
                  <circle cx={14} cy={18} r={4} fill={toneColor(tone)} />
                  {/* Building / Area name */}
                  <text
                    x={25}
                    y={21.5}
                    fontFamily="var(--font-sans, system-ui, sans-serif)"
                    fontSize={12}
                    fontWeight={600}
                    fill="var(--dx-ink)"
                  >
                    {b.name}
                  </text>
                  {/* Second row: status + health/100 or Site infrastructure */}
                  {b.areaId && callout ? (
                    <>
                      <text
                        x={25}
                        y={40}
                        fontFamily="var(--font-mono, monospace)"
                        fontSize={12}
                        fontWeight={500}
                        fill={toneColor(tone)}
                      >
                        {callout.status}
                      </text>
                      {callout.health !== null && (
                        <text
                          x={cardW - 14}
                          y={40}
                          textAnchor="end"
                          fontFamily="var(--font-mono, monospace)"
                          fontSize={12}
                          fontWeight={700}
                          fill="var(--dx-ink)"
                          style={{ fontFeatureSettings: '"tnum"' }}
                        >
                          {callout.health}/100
                        </text>
                      )}
                    </>
                  ) : (
                    <text
                      x={25}
                      y={40}
                      fontFamily="var(--font-mono, monospace)"
                      fontSize={11.5}
                      fill="var(--text-muted)"
                    >
                      Site infrastructure
                    </text>
                  )}
                </g>
              </g>
            );
          })}
        </svg>

        {/* Legend matching `.ph-twin-legend` */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "6px 14px",
            padding: "8px 14px",
            borderTop: "1px solid var(--border-subtle)",
            background: "var(--card-bg)",
            fontSize: "var(--fs-xs, 12px)",
            color: "var(--text-muted)",
          }}
          aria-label="Legend"
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <i style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--status-success)", display: "inline-block" }} />
            Normal
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <i style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--status-warning)", display: "inline-block" }} />
            Alert
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <i style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--status-danger)", display: "inline-block" }} />
            Critical
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <b style={{ width: 14, height: 0, borderTop: "2px dashed var(--text-muted)", display: "inline-block" }} />
            Power
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <b style={{ width: 14, height: 0, borderTop: "2px dashed var(--status-success)", display: "inline-block" }} />
            Network
          </span>
        </div>

        {/* Details of the clicked building: a side panel of the map card (one surface, a hairline
            between), not a second card floating on it (Common region). */}
        {selected && (
          <aside className="vpo-inspector" aria-label={`${selected.name} details`}>
            <div className="vpo-inspector-head">
              <div>
                <div className="vpo-inspector-title">{selected.name}</div>
                <div className="ast-caption">
                  {selectedArea ? "Area" : "Site infrastructure"} · {PLANT_MODELS[selected.model].name}
                </div>
              </div>
              <button
                type="button"
                className="ast-icon-btn"
                onClick={() => setSelectedId(null)}
                aria-label="Close details"
              >
                <IconClose />
              </button>
            </div>
            {selectedArea && selectedCallout ? (
              <>
                <div>
                  <StatusTag tone={selectedCallout.tone} label={selectedCallout.status} />
                </div>
                <dl className="vpo-inspector-facts">
                  <dt>Health</dt>
                  <dd className="ast-num">
                    {selectedCallout.health ?? "—"}
                    <span className="ast-unit">/100</span>
                  </dd>
                  <dt>Machines</dt>
                  <dd className="ast-num">{selectedCallout.machines}</dd>
                  <dt>Running</dt>
                  <dd className="ast-num">{selectedCallout.running}</dd>
                </dl>
                {/* Plain rows divided by hairlines: no boxes inside the panel. */}
                <div className="vpo-inspector-rows">
                  {subtreeMachines(selectedArea).map((m) => {
                    const c = machineCondition(m, lookup);
                    const mTone = machineTone(c.status);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        className="vpo-inspector-row"
                        onClick={() => m.machineId && onOpenMachine(m.machineId, landingSubPage(mTone))}
                      >
                        <span className="vpo-inspector-row-name">
                          <i aria-hidden="true" style={{ background: toneColor(mTone) }} />
                          <span>{m.name}</span>
                        </span>
                        <span className="ast-num vpo-inspector-row-val">
                          {c.health ?? "—"}
                          <IconChevron size={10} />
                        </span>
                      </button>
                    );
                  })}
                </div>
                <PillButton variant="secondary" onClick={() => onSelectNode(selectedArea)}>
                  Open {selectedArea.name}
                </PillButton>
              </>
            ) : (
              <p className="ast-caption vpo-inspector-note">
                Shared site service. Every area draws power from the electrical house and reports through the gateway house; neither carries monitored machines.
              </p>
            )}
          </aside>
        )}
      </div>
    </section>
  );
}

/** Machine diagram card shown inside an area page for each machine in that area. */
export function VpcAreaMachineDiagram({
  machineId,
  machine,
  onOpenMachine,
}: {
  machineId: string;
  machine?: AssetMachine;
  onOpenMachine: (machineId: string, subPage: AssetsSubPage) => void;
}) {
  const fleet = useKilnFleet();
  const frame = fleet[machineId]?.frame ?? (machineId.startsWith("VPC-") ? fleet[VPC_MACHINE_ID]?.frame : null) ?? null;
  const overviewSheet = useMemo(
    () => lineSheetsForMachine(machineId).find((s) => s.kind === "overview")?.id ?? (machineId.startsWith("VPC-") ? "V-0" : null),
    // A copy of a line machine resolves its sheets once the live plant's configuration is in (its first frame).
    [machineId, frame !== null], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const dots = useMemo<SchematicDot[]>(
    () =>
      (machine?.hotspots ?? []).map((h) => {
        const live = frame?.signals[h.id];
        return {
          tag: h.id,
          name: h.label,
          value: live?.display ?? h.value,
          unit: h.unit,
          status: live?.status ?? h.status,
          x: h.x,
          y: h.y,
        };
      }),
    [machine, frame],
  );

  if (!overviewSheet && !machine) return null;

  const heading = overviewSheet
    ? lineSheetHeading(overviewSheet)
    : `${machine?.name ?? machineId} — Overview`;
  const caption = overviewSheet
    ? lineSheetCaption(overviewSheet)
    : `System overview · ${machine?.signalsCount ?? dots.length} sensors · ${machine?.type ?? "simplified layout"}`;

  return (
    <section className="ast-card" aria-label={`${machineId} schematic`}>
      <div className="ast-card-head">
        <div>
          <h2 className="ast-card-title" title={machineId}>{heading}</h2>
          <div className="ast-caption">{caption}</div>
        </div>
      </div>
      <div className="lsh-host">
        <div className="lsh lsh-overview">
          <div className="lsh-draw mx-canvas">
            {overviewSheet ? (
              <LineSheet
                sheetId={overviewSheet}
                machineId={machineId}
                frame={frame}
                drawingOnly
                onOpenMachine={(mId) => onOpenMachine(mId, "overview")}
                onSelectTag={(tag) => {
                  if (tag) focusSensorOn("sensors", tag);
                  onOpenMachine(machineId, "sensors");
                }}
              />
            ) : machine ? (
              <MachineSchematic
                diagramType={machine.diagramType}
                dots={dots}
                onSelect={(tag) => {
                  if (tag) focusSensorOn("sensors", tag);
                  onOpenMachine(machineId, "sensors");
                }}
                label={`${machine.name} schematic`}
              />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

