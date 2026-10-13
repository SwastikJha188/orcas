"use client";

import React from "react";
import {
  DiagramPin,
  DiagramCanvas,
  DiagramPinLayer,
  FlameOutline,
  Flow,
  Gear,
  Ground,
  Label,
  Lamella,
  LinearScale,
  P,
} from "./kiln-component-diagrams";
import { CornerBolts, Fan, MX, Motor } from "./machine-kit/machine-kit";

export interface ProcessStageSvgProps {
  stageId: string;
  pins: DiagramPin[];
  selectedPinId?: string | null;
  onSelectPin?: (pin: DiagramPin) => void;
  className?: string;
  ariaLabel?: string;
}

/* Stage 1 · Raw meal infeed & draft induction (0 m) */
function InfeedStage() {
  return (
    <g transform="translate(50, 15)">
      <Ground x1={90} x2={530} y={250} />

      <rect x={180} y={25} width={90} height={150} rx={6} {...P.cylinderV} />
      <Flow points={[[210, 160], [210, 62]]} dashed />
      <Flow points={[[240, 160], [240, 62]]} dashed />
      <Label x={225} y={46}>RISER</Label>

      <path d="M 360 30 L 265 130" stroke={MX.material} strokeWidth={9} strokeLinecap="round" fill="none" />
      <Label x={368} y={26} anchor="start">MEAL FROM C5</Label>

      <rect x={155} y={145} width={145} height={105} rx={8} {...P.body} />
      <rect x={165} y={155} width={125} height={85} rx={4} {...P.recess} />
      <rect x={290} y={165} width={220} height={75} rx={4} {...P.cylinder} />
      <line x1={290} y1={202} x2={518} y2={202} {...P.hair} strokeDasharray="10 3 2 3" />
      <Label x={420} y={194} tone="ink">KILN SHELL</Label>

      <Lamella x={280} y={155} w={22} h={95} plates={8} />
      <Label x={291} y={266} size={7.5}>INLET SEAL</Label>

      <rect x={95} y={70} width={65} height={48} rx={6} {...P.body} />
      <Label x={127} y={92} size={7.5} tone="ink">ANALYSER</Label>
      <Label x={127} y={104} size={7}>O₂ / CO</Label>
      <line x1={160} y1={94} x2={182} y2={94} {...P.detail} />
    </g>
  );
}

/* Stage 2 · Drive train & girth gear transmission */
function DriveStage() {
  return (
    <g transform="translate(50, 15)">
      <Ground x1={90} x2={530} y={240} />

      <path d="M 120 70 Q 310 90 500 70 L 500 90 Q 310 110 120 90 Z" {...P.cylinder} />
      <rect x={290} y={65} width={40} height={50} rx={3} {...P.raised} />
      <Label x={310} y={56}>GIRTH GEAR 168 T</Label>

      <Gear cx={310} cy={150} r={28} teeth={24} hub={9} />
      <Label x={310} y={196}>PINION 24 T</Label>

      <rect x={180} y={140} width={100} height={95} rx={10} {...P.body} />
      <CornerBolts x={180} y={140} w={100} h={95} inset={9} r={2} />
      <Label x={230} y={160} tone="ink">GEARBOX</Label>
      <Label x={230} y={172} size={7.5}>35.5 : 1</Label>
      <circle cx={210} cy={210} r={13} {...P.detail} />
      <circle cx={250} cy={208} r={17} {...P.detail} />

      <Motor x={100} y={168} w={62} h={60} terminalBox={false} />
      <Label x={131} y={162} tone="ink">MOTOR · 630 kW</Label>
      <rect x={165} y={192} width={15} height={8} rx={2} {...P.shaft} />

      <rect x={360} y={115} width={85} height={22} rx={5} {...P.body} />
      <Label x={402} y={129} size={7.5}>SPRAY LUBE</Label>
      <path d="M 360 126 L 344 138 M 360 126 L 346 146" {...P.hair} />

      <Label x={310} y={272} size={8}>GMF = 168 × 3.80 rpm / 60 = 10.64 Hz</Label>
    </g>
  );
}

/* Stage 3 · 3-pier roller support & hydraulic thrust float */
function SupportStage() {
  return (
    <g transform="translate(50, 15)">
      <Ground x1={90} x2={530} y={240} />

      <line x1={100} y1={120} x2={520} y2={140} {...P.hair} strokeDasharray="10 3 2 3" />
      <Label x={310} y={104}>SHELL AXIS · SLOPE 3.5 %</Label>

      <rect x={250} y={110} width={35} height={100} rx={4} {...P.cylinderV} />
      <Label x={267} y={160} rotate={-90} tone="ink">TYRE 2 · 39 m</Label>

      <circle cx={225} cy={170} r={24} {...P.body} />
      <circle cx={225} cy={170} r={17} {...P.hair} />
      <circle cx={225} cy={170} r={7} {...P.recess} />
      <Label x={225} y={206} size={7.5}>ROLLER</Label>

      <circle cx={305} cy={160} r={20} {...P.body} />
      <circle cx={305} cy={160} r={6} {...P.recess} />
      <Label x={305} y={132} size={7.5}>THRUST</Label>

      <rect x={350} y={148} width={85} height={24} rx={6} {...P.cylinder} />
      <rect x={325} y={155} width={25} height={10} rx={2} {...P.shaft} />
      <Label x={392} y={163} size={7.5}>CYLINDER</Label>
      <rect x={375} y={134} width={30} height={12} rx={2} {...P.body} />
      <Label x={390} y={143} size={7}>LVDT</Label>

      <rect x={360} y={195} width={70} height={40} rx={7} {...P.body} />
      <CornerBolts x={360} y={195} w={70} h={40} inset={7} r={1.8} />
      <Label x={395} y={219} size={7.5}>HPU 7.5 kW</Label>
      <line x1={395} y1={195} x2={395} y2={172} {...P.detail} />

      <LinearScale
        x={180}
        y={272}
        w={240}
        min={-25}
        max={25}
        value={-3.1}
        ticks={[-20, -10, 0, 10, 20]}
        warnAbs={20}
        alarmAbs={22}
        unit="mm"
      />
    </g>
  );
}

/* Stage 4 · Rotary shell clinkering & IR scanner (40–66 m) */
function ClinkeringStage() {
  return (
    <g transform="translate(50, 15)">
      <polygon points="100,105 520,120 520,195 100,180" {...P.cylinder} />

      <g transform="translate(240, 118)">
        <rect x={0} y={0} width={230} height={70} rx={4} {...P.recess} />
        <path d="M 4 66 Q 115 40 226 66 Z" fill={MX.material} opacity={0.85} />
        {Array.from({ length: 15 }).map((_, i) => (
          <g key={i}>
            <rect x={i * 15 + 1} y={1} width={13} height={7} {...P.hair} />
            <rect x={i * 15 + 1} y={62} width={13} height={7} {...P.hair} />
          </g>
        ))}
        <path d="M 0 54 Q 115 50 230 54" {...P.detail} />
        <FlameOutline x0={70} x1={225} cy={33} h={18} />
        <Label x={115} y={-6} size={8}>BURNING ZONE</Label>
      </g>

      <line x1={120} y1={45} x2={500} y2={45} {...P.detail} />
      <g transform="translate(140, 32)">
        <rect x={0} y={0} width={45} height={20} rx={5} {...P.body} />
        <Label x={22} y={13} size={7} tone="ink">IR SCAN</Label>
        <path d="M 22 20 L -10 72 M 22 20 L 56 75" {...P.hair} strokeDasharray="4 3" />
      </g>

      <Label x={310} y={232} size={8}>SHELL BAND 250–330 °C · HOT-SPOT LIMIT 380 °C</Label>
    </g>
  );
}

/* Stage 5 · Discharge hood & outlet seal cooling (74 m) */
function DischargeStage() {
  return (
    <g transform="translate(50, 15)">
      <rect x={90} y={105} width={250} height={120} rx={4} {...P.cylinder} />
      <ellipse cx={310} cy={165} rx={60} ry={46} fill={MX.heat} />
      <line x1={90} y1={165} x2={340} y2={165} {...P.hair} strokeDasharray="10 3 2 3" />
      <Label x={200} y={156} tone="ink">KILN SHELL · 74 m</Label>

      <rect x={340} y={60} width={160} height={185} rx={8} {...P.body} />
      <CornerBolts x={340} y={60} w={160} h={185} inset={10} />
      <Label x={420} y={84} tone="ink">HOOD</Label>

      <Lamella x={325} y={95} w={24} h={140} plates={10} />

      <g transform="translate(290, 240)">
        <Fan cx={20} cy={20} r={16} />
        <Flow points={[[34, 14], [42, 6], [42, -22]]} />
        <Label x={-2} y={24} anchor="end" size={8}>SEAL FAN</Label>
      </g>

      <polygon points="360,200 450,200 430,262 380,262" {...P.recess} />
      <polygon points="372,236 438,236 430,262 380,262" fill={MX.material} />
      <Flow points={[[405, 206], [405, 256]]} />
      <Label x={405} y={278} size={7.5}>TO COOLER</Label>

      <rect x={380} y={145} width={110} height={20} rx={3} {...P.shaft} />
      <Label x={435} y={182} size={7.5}>BURNER</Label>
    </g>
  );
}

/* Stage 6 · Pulverised coal line & multi-channel burner */
function BurnerStage() {
  return (
    <g transform="translate(50, 15)">
      <polygon points="110,35 190,35 170,95 130,95" {...P.body} />
      <polygon points="117,55 183,55 170,93 130,93" fill={MX.deep} opacity={0.9} />
      <Label x={150} y={58} tone="ink">COAL BIN</Label>
      <rect x={130} y={105} width={40} height={25} rx={5} {...P.body} />
      <Label x={150} y={121} size={7.5}>SFM-02</Label>
      <Flow points={[[150, 130], [150, 172], [290, 172]]} />

      <rect x={360} y={60} width={150} height={185} rx={8} {...P.body} />
      <CornerBolts x={360} y={60} w={150} h={185} inset={10} />
      <rect x={190} y={110} width={170} height={110} rx={4} {...P.cylinder} />
      <rect x={290} y={160} width={180} height={22} rx={3} {...P.shaft} />
      <Label x={410} y={198}>MULTI-CHANNEL BURNER</Label>
      <FlameOutline x0={168} x1={290} cy={170} h={24} />

      <g transform="translate(380, 25)">
        <rect x={0} y={0} width={55} height={20} rx={5} {...P.body} />
        <Label x={27} y={13} size={7} tone="ink">PYRO</Label>
        <path d="M 27 20 L 27 60" {...P.hair} strokeDasharray="4 3" />
      </g>

      <Label x={300} y={272} size={8}>WITNESS: TORQUE 329 t/h · O₂ 331 t/h · MODEL 330 t/h</Label>
    </g>
  );
}

function renderStage(stageId: string) {
  switch (stageId) {
    case "kln01-s1":
      return <InfeedStage />;
    case "kln01-s2":
    case "drvkln-s1":
      return <DriveStage />;
    case "kln01-s3":
    case "supkln-s1":
      return <SupportStage />;
    case "kln01-s4":
    case "shlkln-s1":
      return <ClinkeringStage />;
    case "kln01-s5":
    case "shlkln-s2":
      return <DischargeStage />;
    case "kln01-s6":
    case "prckln-s1":
    default:
      return <BurnerStage />;
  }
}

export function KilnProcessStageDiagram({
  stageId,
  pins,
  selectedPinId,
  onSelectPin,
  className,
  ariaLabel,
}: ProcessStageSvgProps) {
  return (
    <DiagramCanvas
      className={className}
      ariaLabel={ariaLabel ?? `Process stage schematic with ${pins.length} measurement points`}
      interactive={Boolean(onSelectPin)}
    >
      {renderStage(stageId)}
      <DiagramPinLayer pins={pins} selectedPinId={selectedPinId} onSelectPin={onSelectPin} />
    </DiagramCanvas>
  );
}
