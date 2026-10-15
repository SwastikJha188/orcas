"use client";

import React, { useState } from "react";
import { DIAGRAM as D, diagramStateColor } from "./kiln-diagram-theme";
import { CornerBolts, Fan, GearWheel, MX, MachinePad, MachineSvg, PAINT } from "./machine-kit/machine-kit";
import { SUBASSEMBLY_DRAWINGS } from "./pyro/pyro-subassemblies";
import "./diagnosis/health.css";

export interface DiagramPin {
  id: string; // e.g. "P1"
  tag: string; // e.g. "TMP-KLN-20"
  label: string;
  value: string;
  unit: string;
  status: "Normal" | "Advisory" | "Critical";
  x: number; // SVG coordinate
  y: number;
  calloutX?: number; // Leader line destination
  calloutY?: number;
  anchor?: "left" | "right" | "top" | "bottom";
}

interface ComponentSvgProps {
  machineId?: string;
  subAssemblyId: string;
  pins: DiagramPin[];
  selectedPinId?: string | null;
  onSelectPin?: (pin: DiagramPin) => void;
  className?: string;
  ariaLabel?: string;
}

/* ------------------------------------------------------------------ */
/* Monoline primitives                                                 */
/* ------------------------------------------------------------------ */

export const VIEW_W = 720;
export const VIEW_H = 310;

/**
 * Shape presets — the ULTRON machine-drawing kit (TSE style). Gradients come
 * from the enclosing `MachineSvg`, so every schematic below inherits them.
 */
export const P = PAINT;

export function Label({
  x,
  y,
  children,
  anchor = "middle",
  tone = "muted",
  size = 8.5,
  rotate,
}: {
  x: number;
  y: number;
  children: React.ReactNode;
  anchor?: "start" | "middle" | "end";
  tone?: "muted" | "ink";
  size?: number;
  rotate?: number;
}) {
  return (
    <text
      x={x}
      y={y}
      fill={tone === "ink" ? D.ink2 : MX.label}
      fontSize={size}
      fontWeight={600}
      letterSpacing="0.1em"
      textAnchor={anchor}
      transform={rotate !== undefined ? `rotate(${rotate}, ${x}, ${y})` : undefined}
    >
      {children}
    </text>
  );
}

/** Engineering ground symbol: datum line with 45° hatching underneath. */
export function Ground({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  const hatches: React.ReactNode[] = [];
  for (let x = x1 + 6; x <= x2; x += 14) {
    hatches.push(<line key={x} x1={x} y1={y} x2={x - 7} y2={y + 7} {...P.hair} />);
  }
  return (
    <g aria-hidden="true">
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={D.detail} strokeWidth={D.w} />
      {hatches}
    </g>
  );
}

/** Flow arrow: straight polyline with an open chevron head. */
export function Flow({ points, dashed = false }: { points: Array<[number, number]>; dashed?: boolean }) {
  if (points.length < 2) return null;
  const d = points.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
  const [x1, y1] = points[points.length - 2];
  const [x2, y2] = points[points.length - 1];
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = 6;
  const head = `M ${x2 - h * Math.cos(a - 0.45)} ${y2 - h * Math.sin(a - 0.45)} L ${x2} ${y2} L ${x2 - h * Math.cos(a + 0.45)} ${y2 - h * Math.sin(a + 0.45)}`;
  return (
    <g aria-hidden="true">
      <path d={d} {...P.detail} strokeDasharray={dashed ? "4 3" : undefined} strokeLinejoin="round" />
      <path d={head} {...P.detail} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

/** Gear wheel (kit): teeth, web, metal hub. */
export function Gear({ cx, cy, r, teeth, hub }: { cx: number; cy: number; r: number; teeth: number; hub?: number }) {
  return <GearWheel cx={cx} cy={cy} r={r} teeth={teeth} hub={hub} />;
}

/** Lamella seal: frame with overlapping spring-plate strokes. */
export function Lamella({ x, y, w, h, plates }: { x: number; y: number; w: number; h: number; plates: number }) {
  const step = h / (plates + 0.5);
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={3} {...P.body} />
      {Array.from({ length: plates }).map((_, i) => (
        <line key={i} x1={x} y1={y + 6 + i * step} x2={x + w} y2={y + 11 + i * step} {...P.detail} />
      ))}
    </g>
  );
}

/** Flame envelope drawn as an outline only. */
export function FlameOutline({ x0, x1, cy, h }: { x0: number; x1: number; cy: number; h: number }) {
  const mid = (x0 + x1) / 2;
  return (
    <g aria-hidden="true">
      <path
        d={`M ${x1} ${cy} C ${mid} ${cy - h}, ${x0 + 20} ${cy - h * 0.7}, ${x0} ${cy} C ${x0 + 20} ${cy + h * 0.7}, ${mid} ${cy + h}, ${x1} ${cy} Z`}
        fill={MX.heat}
        stroke="none"
      />
      <path
        d={`M ${x1} ${cy} C ${mid + 10} ${cy - h * 0.4}, ${mid - 10} ${cy - h * 0.3}, ${mid - 20} ${cy} C ${mid - 10} ${cy + h * 0.3}, ${mid + 10} ${cy + h * 0.4}, ${x1} ${cy} Z`}
        {...P.hair}
      />
    </g>
  );
}

/** Linear scale with a state-coloured position marker. */
export function LinearScale({
  x,
  y,
  w,
  min,
  max,
  value,
  ticks,
  warnAbs,
  alarmAbs,
  unit,
  status = "Normal",
}: {
  x: number;
  y: number;
  w: number;
  min: number;
  max: number;
  value: number;
  ticks: number[];
  warnAbs?: number;
  alarmAbs?: number;
  unit: string;
  status?: DiagramPin["status"];
}) {
  const sx = (v: number) => x + ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * w;
  const zone = (from: number, to: number, color: string, key: string) => (
    <line key={key} x1={sx(from)} x2={sx(to)} y1={y + 3} y2={y + 3} stroke={color} strokeWidth={2} opacity={0.6} />
  );
  return (
    <g aria-hidden="true">
      <line x1={x} y1={y} x2={x + w} y2={y} stroke={D.detail} strokeWidth={D.w} />
      {alarmAbs !== undefined && zone(min, -alarmAbs, D.bad, "a-")}
      {alarmAbs !== undefined && zone(alarmAbs, max, D.bad, "a+")}
      {warnAbs !== undefined && alarmAbs !== undefined && zone(-alarmAbs, -warnAbs, D.warn, "w-")}
      {warnAbs !== undefined && alarmAbs !== undefined && zone(warnAbs, alarmAbs, D.warn, "w+")}
      {ticks.map((t) => (
        <g key={t}>
          <line x1={sx(t)} x2={sx(t)} y1={y - 4} y2={y} stroke={D.detail} strokeWidth={D.wFine} />
          <text x={sx(t)} y={y + 14} fill={D.muted} fontSize={8} textAnchor="middle">
            {t > 0 ? `+${t}` : t}
          </text>
        </g>
      ))}
      <path d={`M ${sx(value)} ${y - 2} l -4 -7 h 8 Z`} fill={diagramStateColor(status)} />
      <text x={x + w + 8} y={y + 3} fill={D.muted} fontSize={8}>
        {unit}
      </text>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Pins & callouts                                                     */
/* ------------------------------------------------------------------ */

const CALLOUT_W = 140;
const CALLOUT_H = 30;

export function DiagramPinLayer({
  pins,
  selectedPinId,
  onSelectPin,
}: {
  pins: DiagramPin[];
  selectedPinId?: string | null;
  onSelectPin?: (pin: DiagramPin) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <g>
      {pins.map((pin) => {
        const selected = selectedPinId === pin.tag || selectedPinId === pin.id;
        const hot = selected || hovered === pin.tag;
        const color = diagramStateColor(pin.status);
        const hasCallout = pin.calloutX !== undefined;
        const callX = pin.calloutX ?? pin.x;
        const callY = pin.calloutY ?? pin.y;
        const toLeft = pin.anchor === "right";
        const boxX = toLeft ? callX - CALLOUT_W : callX;
        const textX = toLeft ? boxX + 10 : callX + 13;
        const barX = toLeft ? callX - 6 : callX + 3.5;
        const interactive = Boolean(onSelectPin);

        return (
          <g
            key={pin.id + pin.tag}
            className="dxh-pin"
            data-pad={pin.tag}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-pressed={interactive ? selected : undefined}
            aria-label={`${pin.tag} ${pin.label}: ${pin.value} ${pin.unit}, ${pin.status}`}
            style={{ cursor: interactive ? "pointer" : "default", outline: "none" }}
            onClick={() => onSelectPin?.(pin)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectPin?.(pin);
              }
            }}
            onMouseEnter={() => setHovered(pin.tag)}
            onMouseLeave={() => setHovered(null)}
          >
            <title>{`${pin.tag} · ${pin.label}`}</title>
            {hasCallout && (
              <path
                d={`M ${pin.x} ${pin.y} L ${callX} ${callY}`}
                fill="none"
                stroke={hot ? D.ink2 : D.hair}
                strokeWidth={D.wFine}
              />
            )}

            <circle cx={pin.x} cy={pin.y} r={14} fill="transparent" data-pad-center={pin.tag} />
            <circle
              className="dxh-pin-ring"
              cx={pin.x}
              cy={pin.y}
              r={11}
              fill="none"
              stroke={D.ink}
              strokeWidth={1.2}
              opacity={selected ? 1 : 0}
            />
            <MachinePad x={pin.x} y={pin.y} status={pin.status} selected={hot && !selected} />

            {!hasCallout && hot && (() => {
              const badgeText = `${pin.id || pin.tag} · ${pin.value} ${pin.unit !== "state" ? pin.unit : ""}`.trim();
              const pillW = Math.max(36, badgeText.length * 4.8 + 12);
              const placeLeft = pin.x > 520;
              const bx = placeLeft ? pin.x - 10 - pillW : pin.x + 10;
              const by = pin.y - 8;
              return (
                <g pointerEvents="none">
                  <rect
                    x={bx}
                    y={by}
                    width={pillW}
                    height={16}
                    rx={4}
                    fill={D.surface}
                    stroke={color}
                    strokeWidth={1}
                  />
                  <text
                    x={bx + pillW / 2}
                    y={by + 10.8}
                    textAnchor="middle"
                    fill={D.ink}
                    fontSize={7}
                    fontWeight={600}
                    letterSpacing="0.04em"
                  >
                    {badgeText}
                  </text>
                </g>
              );
            })()}

            {hasCallout && (
              <g>
                <rect
                  x={boxX}
                  y={callY - CALLOUT_H / 2}
                  width={CALLOUT_W}
                  height={CALLOUT_H}
                  rx={6}
                  fill={D.surface}
                  stroke={hot ? MX.edge : D.line}
                  strokeWidth={1}
                />
                <rect x={barX} y={callY - 9} width={2.5} height={18} rx={1.25} fill={color} />
                <text x={textX} y={callY - 3} fill={D.muted} fontSize={8} letterSpacing="0.04em">
                  {pin.id} · {pin.tag}
                </text>
                <text x={textX} y={callY + 10} fill={D.ink} fontSize={11} fontWeight={600}>
                  {pin.value}
                  {pin.unit && pin.unit !== "state" && (
                    <tspan fill={D.muted} fontSize={8.5} fontWeight={400} dx={3}>
                      {pin.unit}
                    </tspan>
                  )}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}

/** Shared schematic frame: kit canvas (quiet grid) + machine drawing. */
export function DiagramCanvas({
  children,
  className,
  ariaLabel,
  interactive,
}: {
  children: React.ReactNode;
  className?: string;
  ariaLabel: string;
  interactive: boolean;
}) {
  return (
    <div className={`dxh-schematic mx-canvas ${className ?? ""}`.trim()} style={{ position: "relative", width: "100%" }}>
      <MachineSvg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} label={ariaLabel} interactive={interactive}>
        {children}
      </MachineSvg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-assembly schematics                                             */
/* ------------------------------------------------------------------ */

function MotorSchematic() {
  return (
    <g transform="translate(40, 20)">
      <Ground x1={120} x2={500} y={240} />
      <rect x={140} y={222} width={340} height={18} rx={3} {...P.body} />
      <CornerBolts x={140} y={222} w={340} h={18} inset={9} r={2} />

      {/* Stator housing + cooling fins */}
      <rect x={190} y={80} width={220} height={142} rx={14} {...P.body} />
      <rect x={196} y={86} width={208} height={130} rx={10} {...P.hair} />
      <CornerBolts x={190} y={80} w={220} h={142} inset={12} />
      {Array.from({ length: 9 }).map((_, i) => (
        <line key={i} x1={212 + i * 20} y1={80} x2={212 + i * 20} y2={66} {...P.detail} />
      ))}
      <line x1={208} y1={66} x2={376} y2={66} {...P.detail} />

      {/* Winding section */}
      <rect x={230} y={112} width={140} height={78} rx={5} {...P.recess} />
      {Array.from({ length: 6 }).map((_, i) => (
        <rect key={i} x={240 + i * 22} y={120} width={14} height={62} rx={3} {...P.detail} />
      ))}
      <Label x={300} y={204}>STATOR</Label>

      {/* End bells */}
      <rect x={160} y={105} width={32} height={92} rx={4} {...P.raised} />
      <circle cx={176} cy={151} r={11} {...P.body} />
      <circle cx={176} cy={151} r={4} {...P.recess} />
      <Label x={176} y={92}>NDE</Label>
      <rect x={408} y={105} width={32} height={92} rx={4} {...P.raised} />
      <circle cx={424} cy={151} r={11} {...P.body} />
      <circle cx={424} cy={151} r={4} {...P.recess} />
      <Label x={424} y={92}>DE</Label>

      {/* Shaft + coupling */}
      <rect x={440} y={143} width={55} height={16} rx={2} {...P.shaft} />
      <line x1={440} y1={151} x2={517} y2={151} {...P.hair} strokeDasharray="6 3" />
      <rect x={495} y={132} width={22} height={38} rx={3} {...P.raised} />
      <Label x={506} y={184}>COUPLING</Label>

      {/* Terminal box / VFD */}
      <rect x={330} y={32} width={70} height={34} rx={5} {...P.body} />
      <rect x={336} y={36} width={58} height={14} rx={2} {...P.recess} />
      <Label x={365} y={47} tone="ink">VFD</Label>
      <Label x={365} y={59} size={7.5}>630 kW · 690 V</Label>
      <line x1={365} y1={66} x2={365} y2={80} {...P.detail} />
    </g>
  );
}

function GearboxSchematic() {
  return (
    <g transform="translate(50, 20)">
      <Ground x1={110} x2={510} y={240} />
      <rect x={140} y={70} width={340} height={170} rx={14} {...P.body} />
      <rect x={146} y={76} width={328} height={158} rx={10} {...P.hair} />
      <CornerBolts x={140} y={70} w={340} h={170} inset={13} />
      <rect x={250} y={56} width={120} height={16} rx={4} {...P.body} />
      <rect x={175} y={95} width={270} height={122} rx={8} {...P.recess} />

      <Gear cx={215} cy={140} r={24} teeth={14} hub={7} />
      <Gear cx={280} cy={155} r={38} teeth={20} hub={12} />
      <Gear cx={380} cy={150} r={50} teeth={26} hub={16} />

      <rect x={90} y={133} width={55} height={16} rx={2} {...P.shaft} />
      <Label x={110} y={124}>INPUT</Label>
      <rect x={475} y={142} width={55} height={20} rx={2} {...P.shaft} />
      <Label x={505} y={134}>OUTPUT</Label>

      <Label x={310} y={232}>3-STAGE HELICAL · 35.5 : 1</Label>
      <Label x={310} y={262} size={8}>944 rpm → 26.6 rpm · ISO VG 320</Label>
    </g>
  );
}

function PinionGirthSchematic() {
  return (
    <g transform="translate(50, 20)">
      <path d="M 100 90 Q 310 110 520 90 L 520 70 Q 310 90 100 70 Z" {...P.cylinder} />
      <Label x={310} y={60}>KILN SHELL · 3.80 rpm</Label>
      <path d="M 120 115 Q 310 135 500 115 L 500 135 Q 310 155 120 135 Z" {...P.raised} />
      {Array.from({ length: 22 }).map((_, i) => (
        <line
          key={i}
          x1={135 + i * 16}
          y1={124 + Math.sin(i * 0.3) * 4}
          x2={135 + i * 16}
          y2={132 + Math.sin(i * 0.3) * 4}
          {...P.detail}
        />
      ))}
      <Label x={110} y={112} anchor="start">GIRTH GEAR 168 T</Label>

      <Gear cx={310} cy={188} r={38} teeth={24} hub={12} />
      <Label x={310} y={248}>PINION 24 T</Label>

      <rect x={180} y={182} width={260} height={10} rx={2} {...P.shaft} />
      <rect x={235} y={172} width={28} height={60} rx={5} {...P.body} />
      <rect x={357} y={172} width={28} height={60} rx={5} {...P.body} />
      <CornerBolts x={235} y={172} w={28} h={60} inset={6} r={1.8} />
      <CornerBolts x={357} y={172} w={28} h={60} inset={6} r={1.8} />

      <rect x={250} y={140} width={120} height={6} rx={2} {...P.raised} />
      {[280, 310, 340].map((cx) => (
        <path key={cx} d={`M ${cx} 146 l -6 9 M ${cx} 146 l 6 9`} {...P.hair} />
      ))}

      <Ground x1={180} x2={440} y={256} />
      <Label x={310} y={282} size={8}>GMF = 168 × 3.80 rpm / 60 = 10.64 Hz</Label>
    </g>
  );
}

function LubricationSchematic() {
  return (
    <g transform="translate(50, 20)">
      <Ground x1={100} x2={520} y={240} />
      <rect x={120} y={110} width={120} height={130} rx={8} {...P.body} />
      <rect x={126} y={146} width={108} height={88} rx={4} fill={MX.material} opacity={0.9} />
      <line x1={124} y1={145} x2={236} y2={145} {...P.detail} strokeDasharray="4 3" />
      <Label x={180} y={200} tone="ink">OIL TANK 800 L</Label>
      <Label x={180} y={214} size={8}>ISO VG 320</Label>
      {/* sample drain port on oil tank */}
      <rect x={174} y={240} width={12} height={8} rx={2} {...P.raised} />
      <Label x={180} y={260} size={7}>SAMPLE PORT</Label>

      <circle cx={280} cy={165} r={20} {...P.body} />
      <circle cx={280} cy={165} r={14} {...P.hair} />
      <circle cx={280} cy={165} r={6} {...P.recess} />
      <Label x={280} y={199}>P1</Label>
      <circle cx={280} cy={220} r={14} {...P.body} strokeDasharray="3 2" />
      <Label x={280} y={250} size={7.5}>P2 STANDBY</Label>

      <rect x={340} y={140} width={34} height={60} rx={4} {...P.body} />
      <line x1={340} y1={170} x2={374} y2={170} {...P.detail} />
      {/* differential pressure bridge above duplex filter */}
      <path d="M 346 140 V 126 H 368 V 140" fill="none" stroke={D.detail} strokeWidth={1.1} />
      <circle cx={357} cy={126} r={5} {...P.raised} />
      <Label x={357} y={215}>FILTER</Label>

      <rect x={410} y={135} width={48} height={70} rx={6} {...P.body} />
      {Array.from({ length: 6 }).map((_, i) => (
        <line key={i} x1={418 + i * 6} y1={141} x2={418 + i * 6} y2={199} {...P.hair} />
      ))}
      <Label x={434} y={220}>COOLER</Label>

      <Flow points={[[240, 180], [258, 180]]} />
      <Flow points={[[300, 165], [340, 165]]} />
      <Flow points={[[374, 165], [410, 165]]} />
      <Flow points={[[458, 165], [500, 165], [500, 70], [462, 70]]} />

      <rect x={400} y={55} width={100} height={30} rx={6} {...P.body} />
      <CornerBolts x={400} y={55} w={100} h={30} inset={6} r={1.8} />
      <Label x={450} y={74} tone="ink">GEARBOX</Label>
    </g>
  );
}

function AuxDriveSchematic() {
  return (
    <g transform="translate(60, 30)">
      <Ground x1={100} x2={520} y={220} />
      <rect x={130} y={125} width={75} height={75} rx={10} {...P.body} />
      {[0, 1, 2, 3].map((i) => (
        <line key={i} x1={138} x2={197} y1={137 + i * 16} y2={137 + i * 16} {...P.hair} />
      ))}
      <Label x={167} y={160} tone="ink">AUX MOTOR</Label>
      <Label x={167} y={174} size={7.5}>15 kW</Label>

      <rect x={215} y={138} width={30} height={50} rx={3} {...P.body} />
      <rect x={222} y={128} width={16} height={10} rx={2} {...P.raised} />
      <Label x={230} y={203} size={7.5}>BRAKE</Label>

      <rect x={255} y={130} width={38} height={65} rx={4} {...P.raised} />
      <circle cx={274} cy={162} r={11} {...P.recess} />
      <Label x={274} y={210} size={7.5}>CLUTCH</Label>

      <rect x={330} y={80} width={150} height={140} rx={12} {...P.body} />
      <CornerBolts x={330} y={80} w={150} h={140} inset={12} />
      <Label x={405} y={130} tone="ink">MAIN GEARBOX</Label>
      <Label x={405} y={144} size={7.5}>AUX INPUT</Label>
      <rect x={293} y={157} width={37} height={12} rx={2} {...P.shaft} />

      <Label x={300} y={60} size={8}>BARRING 0.1 rpm DURING STOP</Label>
    </g>
  );
}

function SupportStationSchematic({ station }: { station: 1 | 2 | 3 }) {
  const tyreDistance = station === 1 ? "11 m" : station === 2 ? "39 m" : "60 m";
  const roller = (ty: number, name: string) => (
    <g transform={`translate(220, ${ty})`}>
      <rect x={30} y={15} width={100} height={34} rx={8} {...P.cylinder} />
      <Label x={80} y={35} tone="ink">{name}</Label>
      <rect x={10} y={10} width={24} height={44} rx={4} {...P.body} />
      <circle cx={22} cy={32} r={4} {...P.recess} />
      <Label x={22} y={23} size={7}>A</Label>
      <rect x={126} y={10} width={24} height={44} rx={4} {...P.body} />
      <circle cx={138} cy={32} r={4} {...P.recess} />
      <Label x={138} y={23} size={7}>B</Label>
    </g>
  );

  return (
    <g transform="translate(50, 15)">
      <rect x={100} y={115} width={420} height={70} rx={6} {...P.cylinder} />
      <line x1={92} y1={150} x2={528} y2={150} {...P.hair} strokeDasharray="10 3 2 3" />
      <Label x={150} y={145} anchor="start">SHELL · TYRE {station} AT {tyreDistance}</Label>
      <rect x={290} y={105} width={40} height={90} rx={4} {...P.cylinderV} />
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1={296} x2={324} y1={118 + i * 16} y2={118 + i * 16} {...P.hair} />
      ))}

      {roller(40, "LEFT ROLLER")}
      {roller(210, "RIGHT ROLLER")}

      {station === 2 && (
        <g>
          <circle cx={350} cy={150} r={14} {...P.raised} />
          <circle cx={350} cy={150} r={5} {...P.recess} />
          <Label x={370} y={153} anchor="start">THRUST ROLLER</Label>
        </g>
      )}

      <Flow points={[[190, 284], [150, 284]]} />
      <Label x={196} y={287} anchor="start" size={8}>INLET (A)</Label>
      <Flow points={[[430, 284], [470, 284]]} />
      <Label x={424} y={287} anchor="end" size={8}>OUTLET (B)</Label>
      <Label x={310} y={20} size={8}>A–B PAIR SPLIT LIMIT &lt; 10 K</Label>
    </g>
  );
}

function ThrustSchematic() {
  return (
    <g transform="translate(60, 20)">
      <line x1={80} y1={90} x2={480} y2={120} {...P.hair} strokeDasharray="10 3 2 3" />
      <Label x={280} y={78}>SHELL AXIS · SLOPE 3.5 %</Label>

      <rect x={230} y={90} width={35} height={110} rx={4} {...P.cylinderV} />
      <Label x={247} y={150} rotate={-90} tone="ink">TYRE 2</Label>

      <circle cx={285} cy={145} r={22} {...P.body} />
      <circle cx={285} cy={145} r={7} {...P.recess} />
      <rect x={277} y={110} width={16} height={10} rx={2} {...P.body} />
      <Label x={285} y={118} size={7}>U</Label>
      <rect x={277} y={170} width={16} height={10} rx={2} {...P.body} />
      <Label x={285} y={178} size={7}>L</Label>

      <rect x={330} y={132} width={90} height={26} rx={6} {...P.cylinder} />
      <rect x={307} y={140} width={23} height={10} rx={2} {...P.shaft} />
      <Label x={375} y={148}>CYLINDER</Label>
      <rect x={360} y={116} width={30} height={12} rx={2} {...P.body} />
      <Label x={375} y={125} size={7}>LVDT</Label>

      <rect x={330} y={180} width={80} height={55} rx={8} {...P.body} />
      <CornerBolts x={330} y={180} w={80} h={55} inset={8} r={1.8} />
      <circle cx={370} cy={203} r={9} {...P.recess} />
      <Label x={370} y={228} size={7.5}>HPU 7.5 kW</Label>
      <line x1={370} y1={180} x2={370} y2={158} {...P.detail} />

      {/* travel limit switches (POS-KLN-02) */}
      <line x1={120} y1={247} x2={262} y2={247} stroke={MX.fine} strokeWidth={MX.w} />
      <rect x={136} y={240} width={14} height={14} rx={3} {...P.body} />
      <rect x={236} y={240} width={14} height={14} rx={3} {...P.body} />
      <Label x={143} y={235} size={7}>L</Label>
      <Label x={243} y={235} size={7}>U</Label>
      <LinearScale
        x={160}
        y={268}
        w={260}
        min={-50}
        max={50}
        value={-3.1}
        ticks={[-50, -25, 0, 25, 50]}
        warnAbs={30}
        alarmAbs={40}
        unit="mm"
      />
    </g>
  );
}

function ShellRefractorySchematic() {
  return (
    <g transform="translate(60, 20)">
      <path d="M 200 220 A 100 100 0 0 1 400 220 Z" fill={MX.heat} />
      <path d="M 120 220 A 180 180 0 0 1 480 220 L 450 220 A 150 150 0 0 0 150 220 Z" {...P.shaft} stroke={MX.edge} strokeWidth={MX.w} />
      <path d="M 150 220 A 150 150 0 0 1 450 220 L 420 220 A 120 120 0 0 0 180 220 Z" {...P.body} />
      {Array.from({ length: 14 }).map((_, i) => {
        const ang = Math.PI - (i / 13) * Math.PI;
        return (
          <line
            key={i}
            x1={300 + 150 * Math.cos(ang)}
            y1={220 - 150 * Math.sin(ang)}
            x2={300 + 120 * Math.cos(ang)}
            y2={220 - 120 * Math.sin(ang)}
            {...P.hair}
          />
        );
      })}
      <path d="M 180 220 A 120 120 0 0 1 420 220 L 400 220 A 100 100 0 0 0 200 220 Z" fill={MX.material} stroke={MX.fine} strokeWidth={MX.wFine} opacity={0.85} />
      <line x1={100} y1={220} x2={500} y2={220} {...P.detail} />

      <Label x={300} y={240} size={8}>SHELL 25–40 mm · BRICK 200 mm · COATING</Label>

      {/* handheld IR pyrometer target point on left shell arc */}
      <rect x={82} y={114} width={44} height={20} rx={4} {...P.raised} />
      <line x1={126} y1={124} x2={166} y2={124} {...P.hair} strokeDasharray="3 3" />
      <Label x={104} y={106} size={7}>SPOT PYRO</Label>

      <g transform="translate(270, 15)">
        <rect x={0} y={0} width={60} height={22} rx={5} {...P.body} />
        <rect x={22} y={16} width={16} height={6} rx={1.5} {...P.recess} />
        <Label x={30} y={13} size={7.5} tone="ink">IR SCAN</Label>
        <path d="M 30 22 L 160 112 M 30 22 L 300 112" {...P.hair} strokeDasharray="4 3" />
      </g>
    </g>
  );
}

function InletSealSchematic() {
  return (
    <g transform="translate(60, 20)">
      <rect x={100} y={60} width={110} height={200} rx={8} {...P.body} />
      <CornerBolts x={100} y={60} w={110} h={200} inset={10} />
      <Label x={155} y={100} tone="ink">INLET HOUSING</Label>
      <polygon points="110,240 190,240 165,275 135,275" {...P.recess} />
      <polygon points="128,258 172,258 165,275 135,275" fill={MX.material} />
      <Label x={150} y={290} size={7.5}>SPILLAGE</Label>

      <rect x={235} y={90} width={270} height={140} rx={4} {...P.cylinder} />
      <line x1={235} y1={160} x2={505} y2={160} {...P.hair} strokeDasharray="10 3 2 3" />
      <Label x={370} y={150} tone="ink">KILN SHELL · 3.80 rpm</Label>

      <Lamella x={205} y={80} w={30} h={160} plates={12} />
      <Flow points={[[210, 46], [210, 76]]} dashed />
      <Label x={218} y={50} anchor="start">FALSE AIR</Label>

      <circle cx={155} cy={155} r={4} {...P.recess} />
      <Label x={155} y={172} size={7.5}>O₂ / CO</Label>
      <circle cx={155} cy={195} r={4} {...P.recess} />
      <Label x={155} y={212} size={7.5}>TC</Label>
    </g>
  );
}

function OutletSealSchematic() {
  return (
    <g transform="translate(60, 20)">
      <rect x={100} y={90} width={260} height={140} rx={4} {...P.cylinder} />
      <ellipse cx={330} cy={160} rx={60} ry={52} fill={MX.heat} />
      <line x1={100} y1={160} x2={360} y2={160} {...P.hair} strokeDasharray="10 3 2 3" />
      <Label x={220} y={150} tone="ink">KILN SHELL · 74 m</Label>

      <Lamella x={350} y={80} w={30} h={160} plates={12} />

      <rect x={380} y={50} width={130} height={210} rx={8} {...P.body} />
      <CornerBolts x={380} y={50} w={130} h={210} inset={10} />
      <Label x={445} y={80} tone="ink">HOOD</Label>
      <rect x={420} y={145} width={80} height={24} rx={3} {...P.shaft} />
      <Label x={460} y={186}>BURNER</Label>

      <g transform="translate(320, 245)">
        <Fan cx={20} cy={20} r={16} />
        <Flow points={[[36, 14], [45, 8], [45, -14]]} />
        <Label x={60} y={24} anchor="start">SEAL COOLING FAN</Label>
      </g>
    </g>
  );
}

function KilnInletSchematic() {
  return (
    <g transform="translate(60, 20)">
      <rect x={160} y={20} width={80} height={150} rx={6} {...P.cylinderV} />
      <Flow points={[[200, 160], [200, 50]]} dashed />
      <Label x={200} y={40}>RISER</Label>

      <path d="M 330 35 L 235 120" stroke={MX.material} strokeWidth={9} strokeLinecap="round" fill="none" />
      <Label x={322} y={26} anchor="start">MEAL FROM C5</Label>

      <rect x={140} y={140} width={130} height={110} rx={8} {...P.body} />
      <rect x={150} y={150} width={110} height={90} rx={4} {...P.recess} />
      <rect x={270} y={160} width={220} height={80} rx={4} {...P.cylinder} />
      <Label x={380} y={204} tone="ink">KILN SHELL</Label>

      <rect x={90} y={65} width={55} height={45} rx={6} {...P.body} />
      <Label x={117} y={85} size={7.5} tone="ink">ANALYSER</Label>
      <Label x={117} y={98} size={7}>O₂ / CO</Label>
      <line x1={145} y1={88} x2={165} y2={88} {...P.detail} />
    </g>
  );
}

function FeedFuelSchematic() {
  return (
    <g transform="translate(60, 20)">
      <polygon points="120,30 220,30 195,100 145,100" {...P.body} />
      <polygon points="128,52 212,52 195,98 145,98" fill={MX.material} />
      <Label x={170} y={56} tone="ink">FEED BIN</Label>
      <rect x={150} y={110} width={40} height={30} rx={5} {...P.body} />
      <Label x={170} y={129} size={7.5}>SFM-01</Label>
      <Flow points={[[170, 140], [170, 190], [250, 190]]} />
      <Label x={256} y={193} anchor="start" size={8}>PREHEATER</Label>

      <polygon points="360,60 440,60 420,115 380,115" {...P.body} />
      <polygon points="367,78 433,78 420,113 380,113" fill={MX.deep} opacity={0.9} />
      <Label x={400} y={82} tone="ink">COAL BIN</Label>
      <rect x={380} y={125} width={40} height={30} rx={5} {...P.body} />
      <Label x={400} y={144} size={7.5}>SFM-02</Label>
      <Flow points={[[400, 155], [400, 220], [480, 220]]} />
      <Label x={486} y={223} anchor="start" size={8}>BURNER</Label>

      <Label x={300} y={268} size={8}>WITNESS: TORQUE 329 t/h · O₂ 331 t/h · MODEL 330 t/h</Label>
    </g>
  );
}

function BurnerHoodSchematic() {
  return (
    <g transform="translate(60, 20)">
      <rect x={360} y={50} width={140} height={200} rx={8} {...P.body} />
      <CornerBolts x={360} y={50} w={140} h={200} inset={10} />
      <Label x={430} y={74} tone="ink">HOOD</Label>
      <rect x={120} y={90} width={240} height={130} rx={4} {...P.cylinder} />
      <rect x={300} y={145} width={180} height={24} rx={3} {...P.shaft} />
      <Label x={420} y={186}>MULTI-CHANNEL BURNER</Label>
      <FlameOutline x0={130} x1={300} cy={157} h={32} />

      <g transform="translate(370, 20)">
        <rect x={0} y={0} width={60} height={20} rx={5} {...P.body} />
        <Label x={30} y={13} size={7.5} tone="ink">PYRO</Label>
        <path d="M 30 20 L 30 50 L -150 137" {...P.hair} strokeDasharray="4 3" />
      </g>
      <circle cx={430} cy={115} r={4} {...P.recess} />
      <Label x={442} y={118} anchor="start" size={7.5}>DRAFT</Label>
    </g>
  );
}

/** Pad coordinates for PYR-KLN-01 sub-assemblies that share the standalone kiln schematics. */
const KILN_PYRO_PADS: Record<string, Record<string, [number, number]>> = {
  "kln-motor": {
    "TMP-KLN-20": [216, 171],
    "TMP-KLN-21": [280, 152],
    "ELE-KLN-01": [405, 52],
    "VIB-KLN-01": [464, 151],
    "TMP-KLN-19": [464, 191],
    "SPD-KLN-01": [535, 172],
  },
  "kln-gearbox": {
    "VIB-KLN-02": [265, 160],
    "TMP-KLN-22": [265, 195],
    "VIB-KLN-03": [430, 170],
    "TMP-KLN-23": [430, 205],
  },
  "kln-lube": {
    "LEV-KLN-01": [230, 166],
    "LAB-KLN-01": [230, 264],
    "TMP-KLN-15": [330, 185],
    "PRS-KLN-05": [407, 146],
    "PRS-KLN-04": [530, 185],
    "FLO-KLN-05": [550, 130],
  },
  "kln-aux": {
    "LIM-KLN-01": [290, 162],
    "STS-KLN-11": [334, 192],
  },
  "kln-thrust": {
    "POS-KLN-02": [204, 268],
    "POS-KLN-01": [420, 135],
    "PRS-KLN-07": [430, 205],
  },
  "kln-shell": {
    "MAN-KLN-01": [164, 144],
    "STS-KLN-08": [330, 27],
    "CAL-KLN-03": [360, 220],
  },
};

export function subAssemblyPadMap(machineId: string | undefined, subAssemblyId: string): Record<string, [number, number]> | null {
  const key = machineId ? `${machineId}:${subAssemblyId}` : subAssemblyId;
  return (
    SUBASSEMBLY_DRAWINGS[key]?.pads ??
    SUBASSEMBLY_DRAWINGS[subAssemblyId]?.pads ??
    KILN_PYRO_PADS[subAssemblyId] ??
    null
  );
}

function renderSubAssembly(subAssemblyId: string, machineId?: string) {
  const key = machineId ? `${machineId}:${subAssemblyId}` : subAssemblyId;
  const custom = SUBASSEMBLY_DRAWINGS[key] ?? SUBASSEMBLY_DRAWINGS[subAssemblyId];
  if (custom) {
    const Art = custom.Art;
    return <Art />;
  }
  switch (subAssemblyId) {
    case "main-motor":
    case "kln-motor":
    case "P1-drv":
    case "motor-m101":
    case "motor":
      return <MotorSchematic />;
    case "gearbox":
    case "kln-gearbox":
    case "P2-drv":
    case "impeller":
      return <GearboxSchematic />;
    case "pinion-gear":
    case "P3-drv":
      return <PinionGirthSchematic />;
    case "lubrication":
    case "kln-lube":
    case "P4-drv":
      return <LubricationSchematic />;
    case "auxiliary-drive":
    case "kln-aux":
    case "P5-drv":
      return <AuxDriveSchematic />;
    case "station-2":
    case "P2-sup":
      return <SupportStationSchematic station={2} />;
    case "station-3":
    case "P4-sup":
      return <SupportStationSchematic station={3} />;
    case "station-1":
    case "P1-sup":
    case "bearing-b101":
    case "bearing":
      return <SupportStationSchematic station={1} />;
    case "thrust":
    case "kln-thrust":
    case "P3-sup":
      return <ThrustSchematic />;
    case "shell-refractory":
    case "kln-shell":
    case "P3-shl":
      return <ShellRefractorySchematic />;
    case "inlet-seal":
    case "P1-shl":
      return <InletSealSchematic />;
    case "outlet-seal":
    case "P2-shl":
    case "discharge":
      return <OutletSealSchematic />;
    case "kiln-inlet":
    case "P1-prc":
      return <KilnInletSchematic />;
    case "feed-fuel":
    case "P2-prc":
      return <FeedFuelSchematic />;
    case "burner-hood":
    case "P3-prc":
    default:
      return <BurnerHoodSchematic />;
  }
}

/** The equipment art of a component drawing alone (720 × 310 drawing units), for hosts that frame it themselves. */
export function KilnSubAssemblyArt({ machineId, subAssemblyId }: { machineId?: string; subAssemblyId: string }) {
  return <>{renderSubAssembly(subAssemblyId, machineId)}</>;
}

export function KilnSubAssemblyDiagram({
  machineId,
  subAssemblyId,
  pins,
  selectedPinId,
  onSelectPin,
  className,
  ariaLabel,
}: ComponentSvgProps) {
  return (
    <DiagramCanvas
      className={className}
      ariaLabel={ariaLabel ?? `Schematic of ${subAssemblyId} with ${pins.length} measurement points`}
      interactive={Boolean(onSelectPin)}
    >
      {renderSubAssembly(subAssemblyId, machineId)}
      <DiagramPinLayer pins={pins} selectedPinId={selectedPinId} onSelectPin={onSelectPin} />
    </DiagramCanvas>
  );
}
