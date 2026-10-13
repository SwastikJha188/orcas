"use client";

import React, { useState, useMemo } from "react";
import { KilnSealsSensorData, SealSubAssembly } from "./kiln-seals-types";
import { useKilnDiagramPalette, neutralStops } from "./kiln-diagram-theme";
import { MX } from "./machine-kit/machine-kit";
import { KilnSubAssemblyDiagram, DiagramPin } from "./kiln-component-diagrams";
import { KILN_SUB_ASSEMBLIES } from "./component-health-view";
import { PillButton, PillNav } from "@/components/ui";

export interface DbDiagramSystem {
  systemId: string;
  name: string;
  shortName: string;
  health: number;
  status: "Normal" | "Advisory" | "Critical";
  bbox: { x: number; y: number; width: number; height: number };
  sensorCount: number;
}

export interface DbDiagramSensor {
  tag: string;
  name: string;
  unit: string;
  value: string;
  status: "Normal" | "Advisory" | "Critical";
  x: number | null;
  y: number | null;
  systemId: string;
  component: string;
  instrument: string;
  modbusAddress: string;
}

export interface KilnSealsDiagramsProps {
  sensorData: KilnSealsSensorData;
  subAssemblyView?: SealSubAssembly;
  onChangeSubAssemblyView?: (view: SealSubAssembly) => void;
  selectedSensorTag: string | null;
  onSelectSensorTag: (tag: string | null) => void;
  /** DB systems (4 for KLN-01) — subsystem health and channel inventory. */
  dbSystems?: DbDiagramSystem[];
  /** DB sensors (46 for KLN-01) — green mapping dots positioned from DB x/y. */
  dbSensors?: DbDiagramSensor[];
  /** Schematic title — pass the DB machine name/model so no text is hardcoded. */
  title?: string;
  subtitle?: string;
  activeViewMode?: "schematic" | "components";
  onChangeViewMode?: (mode: "schematic" | "components") => void;
  selectedSubAssemblyId?: string;
  onSelectSubAssembly?: (subAssemblyId: string) => void;
}

// Subassembly mapping for quick navigation
const SUBASSEMBLY_TABS = [
  { id: "main-motor", label: "Main Motor (630 kW)" },
  { id: "gearbox", label: "3-Stage Gearbox (35.5:1)" },
  { id: "pinion-gear", label: "Pinion & Girth Gear" },
  { id: "lubrication", label: "800L Lube Skid" },
  { id: "auxiliary-drive", label: "Auxiliary Drive" },
  { id: "station-1", label: "Station 1 (11m)" },
  { id: "station-2", label: "Station 2 & Thrust (39m)" },
  { id: "station-3", label: "Station 3 (60m)" },
  { id: "thrust", label: "Hydraulic Thrust" },
  { id: "shell-refractory", label: "Shell & Refractory" },
  { id: "inlet-seal", label: "Inlet Seal" },
  { id: "outlet-seal", label: "Outlet Seal" },
  { id: "kiln-inlet", label: "Inlet Chamber & O₂/CO" },
  { id: "feed-fuel", label: "Raw Meal & Fuel Feed" },
  { id: "burner-hood", label: "Burner Hood & Clinker" },
];

export function KilnSealsDiagrams({
  sensorData,
  selectedSensorTag,
  onSelectSensorTag,
  dbSystems = [],
  dbSensors = [],
  title = "Rotary Kiln KLN-01",
  subtitle = "MECHANICAL SCHEMATIC",
  activeViewMode: externalViewMode,
  onChangeViewMode,
  selectedSubAssemblyId: externalSubAssemblyId,
  onSelectSubAssembly,
}: KilnSealsDiagramsProps) {
  void sensorData;
  const [internalViewMode, setInternalViewMode] = useState<"schematic" | "components">("schematic");
  const viewMode = externalViewMode ?? internalViewMode;
  const setViewMode = (mode: "schematic" | "components") => {
    setInternalViewMode(mode);
    onChangeViewMode?.(mode);
  };

  const [selectedSubsystem, setSelectedSubsystem] = useState<string | null>(null);
  const [hoveredSubsystem, setHoveredSubsystem] = useState<string | null>(null);
  const [hoveredSensorTag, setHoveredSensorTag] = useState<string | null>(null);

  const [internalSubAssemblyId, setInternalSubAssemblyId] = useState<string>("main-motor");
  const currentSubAssemblyId = externalSubAssemblyId ?? internalSubAssemblyId;
  const setSubAssemblyId = (id: string) => {
    setInternalSubAssemblyId(id);
    onSelectSubAssembly?.(id);
  };

  const palette = useKilnDiagramPalette();
  const neutral = neutralStops(palette.dark);
  const faintNeutral = "var(--hover-faint)";

  // DB system lookup
  const dbSystemById = useMemo(() => new Map(dbSystems.map((s) => [s.systemId, s])), [dbSystems]);
  const dbStatusColor = (status: string) =>
    status === "Critical" ? MX.bad : status === "Advisory" ? MX.warn : MX.good;

  const effectiveSystemId = selectedSubsystem ?? dbSystems[0]?.systemId ?? null;
  const selectedDbSystem = effectiveSystemId ? dbSystemById.get(effectiveSystemId) : undefined;
  const selectedDbSensors = selectedDbSystem
    ? dbSensors.filter((s) => s.systemId === selectedDbSystem.systemId)
    : [];
  const selectedNormal = selectedDbSensors.filter((s) => s.status === "Normal").length;
  const selectedAdvisory = selectedDbSensors.filter((s) => s.status === "Advisory").length;
  const selectedCritical = selectedDbSensors.filter((s) => s.status === "Critical").length;

  // Selected subassembly spec & pins for component blueprint mode
  const currentSubSpec = useMemo(
    () => KILN_SUB_ASSEMBLIES.find((s) => s.id === currentSubAssemblyId) ?? KILN_SUB_ASSEMBLIES[0],
    [currentSubAssemblyId]
  );

  // Live updated pins for current subassembly
  const currentPins: DiagramPin[] = useMemo(() => {
    if (!currentSubSpec) return [];
    return currentSubSpec.pins.map((p) => {
      const match = dbSensors.find((s) => s.tag === p.tag);
      if (match) {
        return {
          ...p,
          value: match.value,
          status: match.status,
          unit: match.unit || p.unit,
        };
      }
      return p;
    });
  }, [currentSubSpec, dbSensors]);

  // Map system id to recommended subassembly
  const handleInspectSystemBlueprint = (sysId: string) => {
    if (sysId.includes("DRV")) setSubAssemblyId("main-motor");
    else if (sysId.includes("SUP")) setSubAssemblyId("station-2");
    else if (sysId.includes("SHL")) setSubAssemblyId("shell-refractory");
    else if (sysId.includes("PRC")) setSubAssemblyId("burner-hood");
    setViewMode("components");
  };

  return (
    <div
      className="kiln-seals-canvas-container"
      style={{
        position: "relative",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {/* Top Diagram Header with View Switcher */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              padding: "4px 8px",
              borderRadius: "4px",
              background: faintNeutral,
              border: `1px solid ${palette.panelBorder}`,
              color: palette.muted,
              fontSize: "0.68rem",
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontFamily: 'var(--font-ui)',
            }}
          >
            {subtitle}
          </div>
          <span
            style={{
              fontSize: "0.88rem",
              fontWeight: 600,
              color: palette.heading,
              fontFamily: 'var(--font-ui)',
            }}
          >
            {title}
          </span>
        </div>

        {/* View Mode Switcher: Full Machine Schematic vs Component Blueprints */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <PillNav
            items={[
              { id: "schematic", label: "Full Machine Schematic" },
              { id: "components", label: "Component Blueprints (15 Subs)" },
            ]}
            activeId={viewMode}
            onChange={(id) => setViewMode(id as "schematic" | "components")}
          />
        </div>
      </div>

      {/* VIEW MODE 1: FULL MACHINE SCHEMATIC (MATCHING ULTRON INDUSTRIAL DESIGN) */}
      {viewMode === "schematic" && (
        <>
          <div
            style={{
              width: "100%",
              aspectRatio: "1024 / 394",
              minHeight: "360px",
              maxHeight: "580px",
              background: "var(--mx-canvas)",
              borderRadius: "14px",
              border: `1px solid ${palette.panelBorder}`,
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              viewBox="0 0 1024 394"
              style={{ width: "100%", height: "100%", userSelect: "none" }}
            >
              <defs>
                {/* Engineering Workspace Grid */}
                <pattern id="kiln-grid-minor" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke={palette.grid} strokeWidth="0.55" opacity="0.65" />
                </pattern>
                <pattern id="kiln-grid-major" width="150" height="150" patternUnits="userSpaceOnUse">
                  <path d="M 150 0 L 0 0 0 150" fill="none" stroke={palette.gridStrong} strokeWidth="0.9" opacity="0.75" />
                </pattern>

                {/* Dark Graphite Housing Metal Base */}
                <linearGradient id="slate-metal-body" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={neutral[1]} />
                  <stop offset="16%" stopColor={neutral[0]} />
                  <stop offset="38%" stopColor={neutral[2]} />
                  <stop offset="72%" stopColor={neutral[4]} />
                  <stop offset="100%" stopColor={neutral[6]} />
                </linearGradient>

                <linearGradient id="slate-metal-light" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={neutral[0]} />
                  <stop offset="28%" stopColor={neutral[1]} />
                  <stop offset="62%" stopColor={neutral[3]} />
                  <stop offset="100%" stopColor={neutral[5]} />
                </linearGradient>

                {/* Cylindrical Shell Gradient: lit from above with bright crown */}
                <linearGradient id="shell-cylindrical" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={neutral[3]} />
                  <stop offset="14%" stopColor={neutral[1]} />
                  <stop offset="28%" stopColor={neutral[0]} />
                  <stop offset="42%" stopColor={neutral[2]} />
                  <stop offset="70%" stopColor={neutral[4]} />
                  <stop offset="100%" stopColor={neutral[6]} />
                </linearGradient>

                {/* Riding Tyre Forged Ring Gradient */}
                <linearGradient id="tyre-metal-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={neutral[2]} />
                  <stop offset="26%" stopColor={neutral[0]} />
                  <stop offset="48%" stopColor={neutral[2]} />
                  <stop offset="80%" stopColor={neutral[5]} />
                  <stop offset="100%" stopColor={neutral[6]} />
                </linearGradient>

                {/* Girth Gear Gradient */}
                <linearGradient id="gear-metal-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={neutral[1]} />
                  <stop offset="25%" stopColor={neutral[0]} />
                  <stop offset="55%" stopColor={neutral[3]} />
                  <stop offset="100%" stopColor={neutral[6]} />
                </linearGradient>

                {/* Concrete Foundation Plinth Gradient */}
                <linearGradient id="concrete-plinth-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={neutral[3]} />
                  <stop offset="15%" stopColor={neutral[4]} />
                  <stop offset="100%" stopColor={neutral[6]} />
                </linearGradient>

                {/* Refractory Brick Lining Gradient (neutral graphite — not process material) */}
                <linearGradient id="brick-lining-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--mx-raised)" />
                  <stop offset="50%" stopColor="var(--mx-body)" />
                  <stop offset="100%" stopColor="var(--mx-body-deep)" />
                </linearGradient>

                {/* Roaring Burner Flame Radial Gradient (flame core = muted brass process heat) */}
                <radialGradient id="roaring-flame" cx="20%" cy="50%" r="80%">
                  <stop offset="0%" stopColor="var(--mx-material-hi)" stopOpacity="1" />
                  <stop offset="25%" stopColor="var(--mx-material-hi)" stopOpacity="0.95" />
                  <stop offset="60%" stopColor="var(--mx-material)" stopOpacity="0.85" />
                  <stop offset="85%" stopColor="var(--mx-material-deep)" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="var(--mx-material-deep)" stopOpacity="0" />
                </radialGradient>

                {/* Scanner Pyrometer Fan Beam Cone */}
                <linearGradient id="scanner-beam-cone" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--signal-blue)" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="var(--signal-blue)" stopOpacity="0.04" />
                </linearGradient>
              </defs>

              {/* Engineering CAD Grid */}
              <g opacity="0.35">
                <rect x="0" y="0" width="1024" height="394" fill="url(#kiln-grid-minor)" />
                <rect x="0" y="0" width="1024" height="394" fill="url(#kiln-grid-major)" />
              </g>

              {/* GROUND DATUM LINE */}
              <line
                x1="30"
                y1="350"
                x2="994"
                y2="350"
                stroke="var(--dx-ink)"
                strokeOpacity={0.18}
                strokeWidth="1.5"
                strokeDasharray="12 6 3 6"
              />

              {/* --------------------------------------------------------
                  CONCRETE PLINTHS & FOUNDATION BLOCKS
                  -------------------------------------------------------- */}
              {/* Plinth 1: Inlet Tower */}
              <rect x="48" y="305" width="94" height="45" rx="3" fill="url(#concrete-plinth-grad)" stroke={palette.edge} strokeWidth="1" />
              <line x1="48" y1="306" x2="142" y2="306" stroke={palette.fine} strokeWidth="1" />

              {/* Plinth 2: Station 1 Pier */}
              <rect x="238" y="295" width="88" height="55" rx="3" fill="url(#concrete-plinth-grad)" stroke={palette.edge} strokeWidth="1" />
              <line x1="238" y1="296" x2="326" y2="296" stroke={palette.fine} strokeWidth="1" />

              {/* Plinth 3: Drive Skid Plinth */}
              <rect x="355" y="305" width="176" height="45" rx="3" fill="url(#concrete-plinth-grad)" stroke={palette.edge} strokeWidth="1" />
              <line x1="355" y1="306" x2="531" y2="306" stroke={palette.fine} strokeWidth="1" />

              {/* Plinth 4: Station 2 (Thrust) Pier */}
              <rect x="540" y="292" width="85" height="58" rx="3" fill="url(#concrete-plinth-grad)" stroke={palette.edge} strokeWidth="1" />
              <line x1="540" y1="293" x2="625" y2="293" stroke={palette.fine} strokeWidth="1" />

              {/* Plinth 5: Station 3 Pier */}
              <rect x="775" y="290" width="85" height="60" rx="3" fill="url(#concrete-plinth-grad)" stroke={palette.edge} strokeWidth="1" />
              <line x1="775" y1="291" x2="860" y2="291" stroke={palette.fine} strokeWidth="1" />

              {/* Plinth 6: Discharge Hood Plinth */}
              <rect x="895" y="305" width="103" height="45" rx="3" fill="url(#concrete-plinth-grad)" stroke={palette.edge} strokeWidth="1" />
              <line x1="895" y1="306" x2="998" y2="306" stroke={palette.fine} strokeWidth="1" />

              {/* --------------------------------------------------------
                  1. INLET FEED TOWER, HOPPER & RISER (LEFT)
                  -------------------------------------------------------- */}
              <g className="inlet-feed-tower-assembly">
                {/* Structural Steel Frame Columns */}
                <line x1="64" y1="112" x2="64" y2="305" stroke={palette.edge} strokeWidth="3.5" />
                <line x1="102" y1="112" x2="102" y2="305" stroke={palette.edge} strokeWidth="3.5" />
                {/* Horizontal Bracing Beams */}
                <line x1="64" y1="170" x2="102" y2="170" stroke={palette.edge} strokeWidth="2" />
                <line x1="64" y1="238" x2="102" y2="238" stroke={palette.edge} strokeWidth="2" />
                {/* Cross Bracing */}
                <line x1="64" y1="170" x2="102" y2="238" stroke={palette.fine} strokeWidth="1.5" />
                <line x1="102" y1="170" x2="64" y2="238" stroke={palette.fine} strokeWidth="1.5" />
                <line x1="64" y1="238" x2="102" y2="305" stroke={palette.fine} strokeWidth="1.5" />
                <line x1="102" y1="238" x2="64" y2="305" stroke={palette.fine} strokeWidth="1.5" />

                {/* Raw Meal Feed Hopper */}
                <polygon points="50,68 84,68 76,112 56,112" fill="url(#slate-metal-body)" stroke={palette.edge} strokeWidth="1.5" />
                <rect x="48" y="65" width="38" height="5" rx="1" fill="url(#slate-metal-light)" stroke={palette.edge} strokeWidth="1" />

                {/* Slanted Feed Drop Chute into Inlet Riser */}
                <path d="M 68 112 L 102 165" stroke="url(#slate-metal-light)" strokeWidth="10" strokeLinecap="round" />
                <path d="M 68 112 L 102 165" stroke={palette.edge} strokeWidth="1.2" fill="none" />

                {/* Fixed Inlet Smoke Chamber / Riser Housing */}
                <rect x="102" y="140" width="52" height="118" rx="7" fill="url(#slate-metal-body)" stroke="var(--signal-blue)" strokeWidth="1.5" />
                <rect x="110" y="152" width="36" height="94" rx="4" fill={MX.deep} stroke={palette.fine} strokeWidth="1" />

                {/* Hot Gas Riser Draft Arrow (Orange Dashed UP) */}
                <line x1="128" y1="225" x2="128" y2="172" stroke="var(--mx-material)" strokeWidth="2" strokeDasharray="4 3" />
                <polygon points="128,166 124,175 132,175" fill="var(--mx-material)" />

                {/* Inlet Transition Flange & Seal */}
                <rect x="154" y="152" width="24" height="86" rx="3" fill="url(#slate-metal-body)" stroke="var(--signal-blue)" strokeWidth="1.5" />
                <line x1="166" y1="156" x2="166" y2="234" stroke="var(--signal-blue)" strokeWidth="1.5" strokeDasharray="3 3" />
              </g>

              {/* --------------------------------------------------------
                  2. ROTATING KILN SHELL (AUTHENTIC INCLINED SLOPE 2.4°)
                  -------------------------------------------------------- */}
              <g
                className="rotating-kiln-shell-assembly"
                transform="translate(178, 194) rotate(2.4) translate(-178, -194)"
              >
                {/* Cylindrical Shell Tube */}
                <rect
                  x="178"
                  y="156"
                  width="677"
                  height="76"
                  rx="2"
                  fill="url(#shell-cylindrical)"
                  stroke={palette.edge}
                  strokeWidth="1.5"
                />

                {/* Longitudinal Specular Reflection Lines */}
                <line x1="178" y1="166" x2="855" y2="166" stroke={MX.metalHi} strokeOpacity={0.22} strokeWidth="1.5" />
                <line x1="178" y1="170" x2="855" y2="170" stroke={MX.metalHi} strokeOpacity={0.08} strokeWidth="1" />

                {/* Circumferential Plate Welds / Segments */}
                {[246, 355, 430, 520, 620, 712, 804].map((wx) => (
                  <g key={`weld-${wx}`}>
                    <line x1={wx} y1="156" x2={wx} y2="232" stroke={palette.fine} strokeWidth="2" />
                    <line x1={wx + 1} y1="156" x2={wx + 1} y2="232" stroke={MX.metalHi} strokeOpacity={0.12} strokeWidth="1" />
                  </g>
                ))}

                {/* Riding Tyre 1 (Station 1 · 11m) */}
                <rect x="274" y="150" width="28" height="88" rx="4" fill="url(#tyre-metal-grad)" stroke={palette.edge} strokeWidth="1.5" />
                <line x1="276" y1="158" x2="300" y2="158" stroke={MX.metalHi} strokeOpacity={0.35} strokeWidth="1.2" />

                {/* Girth Gear (At ~17m) */}
                <g className="girth-gear-ring">
                  <rect x="355" y="138" width="27" height="112" rx="3" fill="url(#gear-metal-grad)" stroke={palette.edge} strokeWidth="1.5" />
                  {/* Toothed gear rim texture */}
                  {Array.from({ length: 14 }).map((_, gi) => (
                    <line key={gi} x1="354" y1={142 + gi * 7.5} x2="383" y2={142 + gi * 7.5} stroke={palette.fine} strokeWidth="1.5" />
                  ))}
                  {/* Gear clamping bolts */}
                  <circle cx="368.5" cy="180" r="2.5" fill={palette.muted} />
                  <circle cx="368.5" cy="220" r="2.5" fill={palette.muted} />
                </g>

                {/* Riding Tyre 2 (Station 2 · 39m · Thrust) */}
                <rect x="562" y="150" width="28" height="88" rx="4" fill="url(#tyre-metal-grad)" stroke={palette.edge} strokeWidth="1.5" />
                <line x1="564" y1="158" x2="588" y2="158" stroke={MX.metalHi} strokeOpacity={0.35} strokeWidth="1.2" />

                {/* BURNING ZONE CUTAWAY WINDOW & ROARING FLAME */}
                <g className="burning-zone-cutaway" transform="translate(715, 156)">
                  {/* Cutout Aperture in Shell Wall */}
                  <rect x="0" y="0" width="133" height="76" rx="3" fill={MX.deep} stroke={palette.edge} strokeWidth="1.4" />

                  {/* Refractory Brick Courses (Top & Bottom) */}
                  {Array.from({ length: 10 }).map((_, bi) => (
                    <g key={`brick-${bi}`}>
                      {/* Top brick row */}
                      <rect x={bi * 13} y="2" width="12" height="7" fill="url(#brick-lining-grad)" stroke={palette.fine} strokeWidth="0.8" />
                      <rect x={bi * 13} y="9" width="12" height="6" fill="url(#brick-lining-grad)" stroke={palette.fine} strokeWidth="0.8" />
                      {/* Bottom brick row */}
                      <rect x={bi * 13} y="59" width="12" height="6" fill="url(#brick-lining-grad)" stroke={palette.fine} strokeWidth="0.8" />
                      <rect x={bi * 13} y="65" width="12" height="7" fill="url(#brick-lining-grad)" stroke={palette.fine} strokeWidth="0.8" />
                    </g>
                  ))}

                  {/* Tumbling Hot Clinker Meal Bed */}
                  <path d="M 0 58 Q 66 55 133 58 L 133 61 L 0 61 Z" fill="var(--mx-material)" opacity="0.9" />

                  {/* Roaring Burner Flame Graphic */}
                  <path
                    d="M 125 38 C 95 24, 55 24, 20 38 C 55 52, 95 52, 125 38 Z"
                    fill="url(#roaring-flame)"
                  />
                  {/* Inner Flame Envelope */}
                  <path
                    d="M 115 38 C 90 27, 60 27, 32 38 C 60 49, 90 49, 115 38 Z"
                    fill="var(--mx-material)"
                    opacity="0.95"
                  />
                  {/* Flame Core */}
                  <ellipse cx="68" cy="38" rx="18" ry="6.5" fill="var(--mx-material-hi)" opacity="0.98" />
                </g>

                {/* Riding Tyre 3 (Station 3 · 60m) */}
                <rect x="802" y="150" width="28" height="88" rx="4" fill="url(#tyre-metal-grad)" stroke={palette.edge} strokeWidth="1.5" />
                <line x1="804" y1="158" x2="828" y2="158" stroke={MX.metalHi} strokeOpacity={0.35} strokeWidth="1.2" />
              </g>

              {/* --------------------------------------------------------
                  3. STATION 1 (PIER 1 ROLLERS & PEDESTALS)
                  -------------------------------------------------------- */}
              <g className="station-1-assembly">
                {/* Trunnion Support Rollers */}
                <rect x="258" y="235" width="25" height="32" rx="3" fill="url(#slate-metal-light)" stroke={palette.edge} strokeWidth="1.2" />
                <rect x="294" y="235" width="25" height="32" rx="3" fill="url(#slate-metal-light)" stroke={palette.edge} strokeWidth="1.2" />
                {/* Bearing Pedestals */}
                <rect x="254" y="263" width="33" height="24" rx="2" fill="var(--mx-body-deep)" stroke={palette.edge} strokeWidth="1" />
                <rect x="290" y="263" width="33" height="24" rx="2" fill="var(--mx-body-deep)" stroke={palette.edge} strokeWidth="1" />
                {/* Bedplate frame */}
                <rect x="250" y="285" width="77" height="12" rx="2" fill="var(--mx-body-deep)" stroke={palette.edge} strokeWidth="1" />
              </g>

              {/* --------------------------------------------------------
                  4. DRIVE TRAIN: GEARBOX (35.5:1), 630 kW VFD MOTOR,
                     800L LUBE SKID, AUX DRIVE
                  -------------------------------------------------------- */}
              <g className="main-drive-assembly">
                {/* Helical Speed Reducer / Gearbox */}
                <rect x="388" y="240" width="62" height="66" rx="5" fill="url(#slate-metal-body)" stroke={palette.edge} strokeWidth="1.5" />
                {/* Ratio Label */}
                <text
                  x="419"
                  y="256"
                  fill={palette.ink}
                  fontSize="9"
                  fontWeight="700"
                  fontFamily='var(--font-ui)'
                  textAnchor="middle"
                >
                  35.5 : 1
                </text>
                {/* Dashed Pitch Circles (Gear meshing) */}
                <circle cx="406" cy="278" r="16" fill="none" stroke="var(--signal-blue)" strokeWidth="1.4" strokeDasharray="3 3" />
                <circle cx="432" cy="282" r="20" fill="none" stroke="var(--signal-blue)" strokeWidth="1.4" strokeDasharray="3 3" />

                {/* Main Electric Motor (630 kW VFD) */}
                <rect x="458" y="236" width="68" height="70" rx="5" fill="url(#slate-metal-body)" stroke={palette.edge} strokeWidth="1.5" />
                <text
                  x="492"
                  y="252"
                  fill={palette.ink}
                  fontSize="9"
                  fontWeight="700"
                  fontFamily='var(--font-ui)'
                  textAnchor="middle"
                >
                  630 kW VFD
                </text>
                {/* Motor Shaft/Fan Circle */}
                <circle cx="492" cy="282" r="17" fill="none" stroke={MX.good} strokeWidth="2" />

                {/* 800L Lube Skid (Bottom Left) */}
                <rect x="362" y="306" width="94" height="42" rx="4" fill="url(#slate-metal-body)" stroke={palette.edge} strokeWidth="1.5" />
                <text
                  x="409"
                  y="321"
                  fill={palette.ink}
                  fontSize="8"
                  fontWeight="600"
                  fontFamily='var(--font-ui)'
                  textAnchor="middle"
                >
                  800L LUBE SKID
                </text>
                {/* Dual Ports/Gauges */}
                <circle cx="382" cy="334" r="5" fill="none" stroke="var(--signal-blue)" strokeWidth="1.5" />
                <circle cx="434" cy="334" r="5" fill="none" stroke="var(--signal-blue)" strokeWidth="1.5" />

                {/* Auxiliary Inching Drive (Bottom Right) */}
                <rect x="462" y="306" width="64" height="42" rx="4" fill="url(#slate-metal-body)" stroke={palette.edge} strokeWidth="1.5" />
                <text
                  x="494"
                  y="325"
                  fill={palette.ink}
                  fontSize="8"
                  fontWeight="600"
                  fontFamily='var(--font-ui)'
                  textAnchor="middle"
                >
                  AUX DRIVE
                </text>
              </g>

              {/* --------------------------------------------------------
                  5. STATION 2 (PIER 2 ROLLERS & HYDRAULIC THRUST)
                  -------------------------------------------------------- */}
              <g className="station-2-assembly">
                {/* Trunnion Support Rollers */}
                <rect x="548" y="238" width="25" height="32" rx="3" fill="url(#slate-metal-light)" stroke={palette.edge} strokeWidth="1.2" />
                <rect x="584" y="238" width="25" height="32" rx="3" fill="url(#slate-metal-light)" stroke={palette.edge} strokeWidth="1.2" />
                {/* Bearing Pedestals */}
                <rect x="544" y="266" width="33" height="24" rx="2" fill="var(--mx-body-deep)" stroke={palette.edge} strokeWidth="1" />
                <rect x="580" y="266" width="33" height="24" rx="2" fill="var(--mx-body-deep)" stroke={palette.edge} strokeWidth="1" />

                {/* Hydraulic Thrust Mechanism */}
                <rect x="618" y="236" width="18" height="34" rx="3" fill="url(#slate-metal-light)" stroke={palette.edge} strokeWidth="1.2" />
                <circle cx="627" cy="253" r="4" fill="var(--mx-body-deep)" />
                <rect x="636" y="248" width="24" height="20" rx="3" fill="var(--mx-body-deep)" stroke={palette.edge} strokeWidth="1.2" />

                {/* Axial Travel Dashed Cyan Arrow ---> */}
                <line x1="630" y1="258" x2="656" y2="258" stroke="var(--signal-blue)" strokeWidth="2" strokeDasharray="3 2" />
                <polygon points="658,258 652,255 652,261" fill="var(--signal-blue)" />
              </g>

              {/* --------------------------------------------------------
                  6. OVERHEAD SHELL TEMPERATURE SCANNER
                  -------------------------------------------------------- */}
              <g className="overhead-scanner-assembly">
                {/* Cyan Pill Badge "SCANNER" */}
                <rect x="672" y="70" width="52" height="22" rx="4" fill="url(#slate-metal-body)" stroke="var(--signal-blue)" strokeWidth="1.5" />
                <text
                  x="698"
                  y="85"
                  fill="var(--signal-blue)"
                  fontSize="9"
                  fontWeight="700"
                  fontFamily='var(--font-ui)'
                  textAnchor="middle"
                  letterSpacing="0.8"
                >
                  SCANNER
                </text>
                <circle cx="698" cy="98" r="2.5" fill="var(--signal-blue)" />

                {/* Downward Fan Beam Cone onto Shell */}
                <polygon points="698,99 634,170 756,170" fill="url(#scanner-beam-cone)" opacity="0.32" />

                {/* Dashed Cyan Scan Line along Shell Top */}
                <line x1="634" y1="169" x2="756" y2="169" stroke="var(--signal-blue)" strokeWidth="2" strokeDasharray="3 3" />
              </g>

              {/* --------------------------------------------------------
                  7. STATION 3 (PIER 3 ROLLERS & PEDESTALS)
                  -------------------------------------------------------- */}
              <g className="station-3-assembly">
                {/* Trunnion Support Rollers */}
                <rect x="788" y="242" width="25" height="32" rx="3" fill="url(#slate-metal-light)" stroke={palette.edge} strokeWidth="1.2" />
                <rect x="824" y="242" width="25" height="32" rx="3" fill="url(#slate-metal-light)" stroke={palette.edge} strokeWidth="1.2" />
                {/* Bearing Pedestals */}
                <rect x="784" y="270" width="33" height="24" rx="2" fill="var(--mx-body-deep)" stroke={palette.edge} strokeWidth="1" />
                <rect x="820" y="270" width="33" height="24" rx="2" fill="var(--mx-body-deep)" stroke={palette.edge} strokeWidth="1" />
                {/* Bedplate frame */}
                <rect x="780" y="292" width="77" height="12" rx="2" fill="var(--mx-body-deep)" stroke={palette.edge} strokeWidth="1" />
              </g>

              {/* --------------------------------------------------------
                  8. DISCHARGE FIRING HOOD, CHUTE & BURNER LANCE (RIGHT)
                  -------------------------------------------------------- */}
              <g className="discharge-hood-assembly">
                {/* Transition Seal Collar */}
                <rect x="880" y="174" width="22" height="88" rx="3" fill="url(#slate-metal-body)" stroke="var(--signal-blue)" strokeWidth="1.5" />

                {/* Horizontal Burner Pipe Lance */}
                <rect x="858" y="215" width="112" height="10" rx="2" fill="url(#slate-metal-light)" stroke={palette.edge} strokeWidth="1.2" />
                {/* Yellow/Orange Triangular Flame Nozzle Tip */}
                <polygon points="858,214 846,220 858,226" fill="var(--mx-material)" stroke="var(--mx-material-deep)" strokeWidth="1" />

                {/* Alignment Crosshair Symbol (+) */}
                <line x1="892" y1="225" x2="892" y2="280" stroke="var(--signal-blue)" strokeWidth="1.5" strokeDasharray="2 2" />
                <circle cx="892" cy="288" r="10" fill="none" stroke={MX.good} strokeWidth="1.5" />
                <line x1="884" y1="288" x2="900" y2="288" stroke={MX.good} strokeWidth="1.2" />
                <line x1="892" y1="280" x2="892" y2="296" stroke={MX.good} strokeWidth="1.2" />

                {/* Stationary Burner Hood Chamber */}
                <rect x="906" y="140" width="74" height="165" rx="8" fill="url(#slate-metal-body)" stroke={palette.edge} strokeWidth="1.5" />
                <rect x="914" y="152" width="58" height="142" rx="4" fill={MX.deep} stroke={palette.fine} strokeWidth="1" />

                {/* Bottom Tapered Clinker Funnel Chute */}
                <polygon points="916,305 970,305 956,348 930,348" fill={MX.deep} stroke={palette.edge} strokeWidth="1.2" />

                {/* Orange Status Indicator Pill [ • ] */}
                <rect x="940" y="160" width="28" height="11" rx="5" fill="none" stroke={MX.warn} strokeWidth="1.5" />
                <circle cx="954" cy="165.5" r="3" fill={MX.warn} />
              </g>

              {/* --------------------------------------------------------
                  9. DB COMPONENT HEALTH BOUNDING BOXES (Dotted Bounding Modules)
                  -------------------------------------------------------- */}
              {dbSystems.map((sys) => {
                const isSel = selectedSubsystem === sys.systemId;
                const isHov = hoveredSubsystem === sys.systemId;
                const color = dbStatusColor(sys.status);

                // Coordinate mapping from catalog space into 1024x394 canvas
                const bx = (sys.bbox.x / 1000) * 1024;
                const by = (sys.bbox.y / 372) * 394;
                const bw = (sys.bbox.width / 1000) * 1024;
                const bh = (sys.bbox.height / 372) * 394;

                const label = `${sys.shortName.toUpperCase()} · ${sys.health}%`;
                const labelW = label.length * 6.2 + 14;
                const labelX = Math.min(Math.max(bx + 6, 8), 1024 - labelW - 8);
                const labelY = Math.max(by - 22, 6);

                return (
                  <g key={`db-box-${sys.systemId}`}>
                    <rect
                      x={bx}
                      y={by}
                      width={bw}
                      height={bh}
                      rx="8"
                      fill={isSel || isHov ? MX.good : "transparent"}
                      fillOpacity={isSel || isHov ? 0.06 : undefined}
                      stroke={color}
                      strokeWidth={isSel ? "2.2" : "1.6"}
                      strokeDasharray="5 4"
                      style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                      onMouseEnter={() => setHoveredSubsystem(sys.systemId)}
                      onMouseLeave={() => setHoveredSubsystem(null)}
                      onClick={() => setSelectedSubsystem(sys.systemId)}
                    >
                      <title>{`${sys.name} — ${sys.health}% ${sys.status} · ${sys.sensorCount} sensors`}</title>
                    </rect>
                    <rect
                      x={labelX}
                      y={labelY}
                      width={labelW}
                      height={18}
                      rx={9}
                      fill="var(--workspace-bg)"
                      fillOpacity={0.92}
                      stroke={color}
                      strokeWidth="1"
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelectedSubsystem(sys.systemId)}
                    />
                    <text
                      x={labelX + 8}
                      y={labelY + 13}
                      fill={color}
                      fontSize="9"
                      fontWeight="700"
                      letterSpacing="0.8"
                      fontFamily='var(--font-ui)'
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelectedSubsystem(sys.systemId)}
                    >
                      {label}
                    </text>
                  </g>
                );
              })}

              {/* --------------------------------------------------------
                  10. CONCENTRIC GREEN SENSOR TARGET DOTS ((•))
                  Matches exact sensor coordinates from reference diagram
                  -------------------------------------------------------- */}
              {SENSOR_TARGET_COORDINATES.map((st) => {
                const isSelected = selectedSensorTag === st.tag;
                const isHovered = hoveredSensorTag === st.tag;
                const dbMatch = dbSensors.find((s) => s.tag === st.tag);
                const valStr = dbMatch ? `${dbMatch.value} ${dbMatch.unit}`.trim() : st.label;
                const status = dbMatch?.status ?? "Normal";
                const isAlert = status === "Critical" || status === "Advisory";
                const dotColor = status === "Critical" ? MX.bad : status === "Advisory" ? MX.warn : MX.good;
                const hasHalo = isSelected || isHovered || isAlert;

                return (
                  <g
                    key={`sensor-dot-${st.tag}-${st.x}-${st.y}`}
                    transform={`translate(${st.x}, ${st.y})`}
                    style={{ cursor: "pointer" }}
                    onClick={() => onSelectSensorTag(isSelected ? null : st.tag)}
                    onMouseEnter={() => setHoveredSensorTag(st.tag)}
                    onMouseLeave={() => setHoveredSensorTag(null)}
                  >
                    <title>{`${st.tag}: ${valStr}`}</title>

                    {/* Outer Glow Halo on Hover / Alert */}
                    {hasHalo && <circle cx="0" cy="0" r="11" fill={dotColor} opacity="0.22" />}

                    {/* Outer Target Ring */}
                    <circle cx="0" cy="0" r="7.5" fill="none" stroke={dotColor} strokeWidth="1.2" />

                    {/* Middle Ring */}
                    <circle
                      cx="0"
                      cy="0"
                      r="4.8"
                      fill="var(--mx-canvas)"
                      stroke={dotColor}
                      strokeWidth="1.4"
                    />

                    {/* Inner Target Center */}
                    <circle cx="0" cy="0" r="2.4" fill={dotColor} />

                    {/* TSE pad centre dot */}
                    <circle cx="0" cy="0" r="1.1" fill="var(--mx-pad-dot)" />

                    {/* Prominent Inner Ring for Central Highlight Sensor */}
                    {st.isProminent && (
                      <circle
                        cx="0"
                        cy="0"
                        r="5.6"
                        fill="none"
                        stroke={palette.ink}
                        strokeWidth="1.8"
                        opacity="0.95"
                      />
                    )}

                    {/* Outer Highlight Circle when Selected (ink, so it reads in both themes) */}
                    {isSelected && (
                      <circle cx="0" cy="0" r="10" fill="none" stroke={palette.ink} strokeWidth="1.6" opacity="0.95" />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* ==============================================================
              SELECTED DB SYSTEM DETAIL DRAWER (HUD)
              ============================================================== */}
          {selectedDbSystem && (
            <div
              style={{
                background: palette.raised,
                borderRadius: "12px",
                border: `1px solid ${palette.panelBorder}`,
                padding: "12px 18px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "14px",
              }}
            >
              {/* Identity & Health Summary */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: dbStatusColor(selectedDbSystem.status),
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div
                    style={{
                      fontSize: "0.84rem",
                      fontWeight: 600,
                      color: palette.ink,
                      letterSpacing: "0.03em",
                      fontFamily: 'var(--font-ui)',
                    }}
                  >
                    {`${selectedDbSystem.name.toUpperCase()} — ${selectedDbSystem.health}% ${selectedDbSystem.status.toUpperCase()} · ${selectedDbSystem.sensorCount} SENSORS`}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: palette.muted, marginTop: "2px" }}>
                    {`${selectedNormal} normal · ${selectedAdvisory} advisory · ${selectedCritical} critical across ${selectedDbSensors.length} mapped telemetry channels`}
                  </div>

                  {/* Channel Chips */}
                  {selectedDbSensors.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px", maxWidth: "680px" }}>
                      {selectedDbSensors.slice(0, 10).map((s) => (
                        <button
                          key={`hud-chip-${s.tag}`}
                          type="button"
                          onClick={() => onSelectSensorTag(selectedSensorTag === s.tag ? null : s.tag)}
                          title={`${s.tag} · ${s.name} · ${s.component}`}
                          style={{
                            background: selectedSensorTag === s.tag ? palette.accent : faintNeutral,
                            border: `1px solid ${palette.panelBorder}`,
                            borderRadius: "9999px",
                            padding: "3px 8px",
                            fontSize: "0.68rem",
                            fontFamily: "var(--font-ui)",
                            color: palette.ink,
                            cursor: "pointer",
                          }}
                        >
                          {s.tag} · {s.value} {s.unit}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button: Inspect Component Blueprint */}
              <PillButton
                variant="primary"
                onClick={() => handleInspectSystemBlueprint(selectedDbSystem.systemId)}
                style={{ fontSize: "0.74rem", padding: "6px 14px" }}
              >
                Inspect Component Blueprint →
              </PillButton>
            </div>
          )}
        </>
      )}

      {/* VIEW MODE 2: COMPONENT BLUEPRINTS (DETAILED SUB-ASSEMBLY SCHEMATICS) */}
      {viewMode === "components" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Subassembly Selector Tabs */}
          <div style={{ overflowX: "auto", paddingBottom: "4px" }}>
            <PillNav
              items={SUBASSEMBLY_TABS}
              activeId={currentSubAssemblyId}
              onChange={(id) => setSubAssemblyId(id)}
            />
          </div>

          {/* Subassembly Blueprint Canvas */}
          <div
            style={{
              background: "var(--mx-canvas)",
              borderRadius: "14px",
              border: `1px solid ${palette.panelBorder}`,
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
              <div>
                <span style={{ fontSize: "0.72rem", color: palette.muted, textTransform: "uppercase", fontWeight: 600 }}>
                  {currentSubSpec?.machineName} · {currentSubSpec?.machineTag}
                </span>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: palette.heading, margin: "2px 0 0 0" }}>
                  {currentSubSpec?.name}
                </h3>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    padding: "3px 8px",
                    borderRadius: "9999px",
                    fontSize: "0.70rem",
                    fontWeight: 600,
                    background: currentSubSpec?.status === "Normal"
                      ? "color-mix(in srgb, var(--status-success) 14%, transparent)"
                      : "color-mix(in srgb, var(--status-warning) 14%, transparent)",
                    color: currentSubSpec?.status === "Normal" ? MX.good : MX.warn,
                  }}
                >
                  {currentSubSpec?.health}% HEALTH · {currentSubSpec?.status.toUpperCase()}
                </span>
                <PillButton
                  variant="secondary"
                  onClick={() => setViewMode("schematic")}
                  style={{ fontSize: "0.72rem", padding: "4px 10px" }}
                >
                  ← Back to Machine
                </PillButton>
              </div>
            </div>

            {/* Detailed Component Blueprint Diagram */}
            <KilnSubAssemblyDiagram
              subAssemblyId={currentSubAssemblyId}
              pins={currentPins}
              selectedPinId={selectedSensorTag}
              onSelectPin={(pin) => onSelectSensorTag(pin.tag)}
            />

            {/* Subassembly Mechanical Specifications */}
            {currentSubSpec && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "10px",
                  padding: "12px",
                  borderRadius: "10px",
                  background: faintNeutral,
                  border: `1px solid ${palette.panelBorder}`,
                }}
              >
                <div>
                  <div style={{ fontSize: "0.68rem", color: palette.muted, textTransform: "uppercase" }}>Model / Specs</div>
                  <div style={{ fontSize: "0.78rem", color: palette.ink, fontWeight: 500 }}>{currentSubSpec.makeModel}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.68rem", color: palette.muted, textTransform: "uppercase" }}>Power / Rating</div>
                  <div style={{ fontSize: "0.78rem", color: palette.ink, fontWeight: 500 }}>{currentSubSpec.rating}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.68rem", color: palette.muted, textTransform: "uppercase" }}>Operating Speed</div>
                  <div style={{ fontSize: "0.78rem", color: palette.ink, fontWeight: 500 }}>{currentSubSpec.speed}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.68rem", color: palette.muted, textTransform: "uppercase" }}>Lubrication Circuit</div>
                  <div style={{ fontSize: "0.78rem", color: palette.ink, fontWeight: 500 }}>{currentSubSpec.lubrication}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MAPPED SIGNALS QUICK BAR AT BOTTOM */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          overflowX: "auto",
          paddingBottom: "2px",
        }}
      >
        <span
          style={{
            fontSize: "0.72rem",
            color: palette.muted,
            textTransform: "uppercase",
            fontWeight: 600,
            flexShrink: 0,
            fontFamily: 'var(--font-ui)',
          }}
        >
          Mapped Signals{dbSensors.length > 0 ? ` (${dbSensors.length} DB)` : ""}:
        </span>

        {dbSensors.map((s) => {
          const isSelected = selectedSensorTag === s.tag;
          const isAlert = s.status === "Critical";
          const isWarn = s.status === "Advisory";
          const dot = isAlert ? MX.bad : isWarn ? MX.warn : palette.accent;
          return (
            <button
              key={`quick-${s.tag}`}
              type="button"
              onClick={() => onSelectSensorTag(isSelected ? null : s.tag)}
              title={`${s.tag} — ${s.name} (${s.component})`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: isSelected ? palette.raised : faintNeutral,
                border: isSelected ? `1px solid ${palette.accent}` : `1px solid ${palette.panelBorder}`,
                borderRadius: "9999px",
                padding: "4px 10px",
                fontSize: "0.72rem",
                color: palette.ink,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: dot,
                }}
              />
              <span style={{ fontFamily: "var(--font-ui)", color: palette.muted }}>{s.tag}</span>
              <span style={{ color: isAlert ? MX.bad : palette.ink, fontWeight: 500 }}>{s.value} {s.unit}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// =========================================================================
// SENSOR TARGET COORDINATES (1024 x 394 ViewBox Coordinates)
// Matches every single concentric target marker from the reference schematic
// =========================================================================
interface SensorTargetCoordinate {
  tag: string;
  label: string;
  x: number;
  y: number;
  isProminent?: boolean;
}

const SENSOR_TARGET_COORDINATES: SensorTargetCoordinate[] = [
  // 1. INLET TOWER & HOPPER
  { tag: "FLO-KLN-01", label: "Kiln Feed Rate (330 t/h)", x: 92, y: 104 },
  { tag: "STS-KLN-06", label: "Gas Analyser Sample Port", x: 122, y: 118 },
  { tag: "TMP-KLN-13", label: "Inlet Gas Temp (1087 °C)", x: 122, y: 202 },

  // 2. INLET TRANSITION SEAL & FLANGE
  { tag: "CAL-KLN-06", label: "Inlet False-Air Probe", x: 160, y: 168 },
  { tag: "CAL-KLN-07", label: "Inlet Seal Overlap LVDT", x: 160, y: 226 },
  { tag: "GAS-KLN-01", label: "Inlet O₂ Concentration (2.58%)", x: 208, y: 134 },

  // 3. STATION 1 (PIER 1 · TYRE 1 ROLLERS & BASE)
  { tag: "TMP-KLN-01", label: "Station 1 Left A Bearing (57.8 °C)", x: 298, y: 254 },
  { tag: "TMP-KLN-02", label: "Station 1 Left B Bearing (59.4 °C)", x: 332, y: 254 },
  { tag: "TMP-KLN-03", label: "Station 1 Right A Base Temp", x: 302, y: 296 },
  { tag: "TMP-KLN-04", label: "Station 1 Right B Base Temp", x: 336, y: 296 },
  { tag: "PRS-KLN-01", label: "Station 1 Kiln Foundation Vibration", x: 216, y: 276 },

  // 4. DRIVE TRAIN & GIRTH GEAR
  { tag: "STS-KLN-05", label: "Girth Gear Spray Status (OK)", x: 390, y: 148 },
  { tag: "SPD-KLN-01", label: "Kiln Rotational Speed (3.80 rpm)", x: 410, y: 124 },
  { tag: "ELE-KLN-01", label: "Drive Torque / Current (62.1%)", x: 435, y: 148 },
  { tag: "VIB-KLN-01", label: "Main Motor Vibration RMS (1.60 mm/s)", x: 460, y: 148 },
  { tag: "VIB-KLN-04", label: "Pinion Vibration (2.33 mm/s)", x: 384, y: 262 },
  { tag: "TMP-KLN-22", label: "Gearbox Input Bearing Temp (69.9 °C)", x: 384, y: 292 },
  { tag: "VIB-KLN-02", label: "Gearbox Input Vibration (1.85 mm/s)", x: 398, y: 208 },
  { tag: "TMP-KLN-15", label: "Gearbox Lube Oil Temp (59.8 °C)", x: 398, y: 232 },
  { tag: "VIB-KLN-03", label: "Gearbox Output Vibration (1.51 mm/s)", x: 438, y: 208 },
  { tag: "TMP-KLN-23", label: "Gearbox Output Bearing Temp (67.7 °C)", x: 438, y: 232 },
  { tag: "TMP-KLN-21", label: "Motor Stator Winding Temp (100 °C)", x: 484, y: 172 },
  { tag: "TMP-KLN-19", label: "Motor DE Bearing Temp (65.0 °C)", x: 470, y: 284 },
  { tag: "TMP-KLN-20", label: "Motor NDE Bearing Temp (60.5 °C)", x: 470, y: 232 },

  // PROMINENT CENTRAL SENSOR (Target with bold white inner ring)
  { tag: "PRS-KLN-04", label: "Main Drive Central Diagnostic Point", x: 468, y: 195, isProminent: true },
  { tag: "FLO-KLN-05", label: "Gearbox Oil Flow Switch", x: 492, y: 195 },

  // 5. STATION 2 (PIER 2 · TYRE 2 & HYDRAULIC THRUST)
  { tag: "TMP-KLN-05", label: "Station 2 Left A Bearing (62.0 °C)", x: 548, y: 258 },
  { tag: "TMP-KLN-06", label: "Station 2 Left B Bearing (62.5 °C)", x: 596, y: 258 },
  { tag: "POS-KLN-01", label: "Kiln Axial Float LVDT (-3.1 mm)", x: 578, y: 275 },
  { tag: "PRS-KLN-07", label: "Thrust Cylinder Hydraulic Pressure (90 bar)", x: 596, y: 285 },
  { tag: "POS-KLN-02", label: "Thrust Mechanism Base Switch", x: 596, y: 320 },

  // 6. OVERHEAD SHELL TEMPERATURE SCANNER
  { tag: "STS-KLN-08", label: "IR Shell Scanner Unit (95.9% Coverage)", x: 682, y: 126 },
  { tag: "CAL-KLN-03", label: "Burning Zone Shell Peak Temp (327 °C)", x: 722, y: 152 },

  // 7. STATION 3 (PIER 3 · TYRE 3 ROLLERS & BASE)
  { tag: "TMP-KLN-09", label: "Station 3 Left A Bearing (59.0 °C)", x: 795, y: 260 },
  { tag: "TMP-KLN-10", label: "Station 3 Left B Bearing (58.0 °C)", x: 820, y: 260 },
  { tag: "TMP-KLN-11", label: "Station 3 Right A Base Temp", x: 795, y: 298 },
  { tag: "TMP-KLN-12", label: "Station 3 Right B Base Temp", x: 820, y: 298 },

  // 8. DISCHARGE END, HOOD & BURNER LANCE
  { tag: "STS-KLN-10", label: "Outlet Seal Cooling Fan Status", x: 892, y: 148 },
  { tag: "TMP-KLN-14", label: "Optical Pyrometer Burning Zone (1448 °C)", x: 915, y: 185 },
  { tag: "PRS-KLN-03", label: "Kiln Discharge Hood Pressure (-0.29 mbar)", x: 945, y: 128 },
  { tag: "FLO-KLN-02", label: "Burner Coal Injection Rate (10.57 t/h)", x: 892, y: 288 },
];
