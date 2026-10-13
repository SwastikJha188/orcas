"use client";

import React, { useState } from "react";
import type { AssetMachine } from "./assets-data";
import { severityTone } from "./assets-shell-ui";
import {
  Bolt,
  CornerBolts,
  Coupling,
  Fan,
  GroundLine,
  Housing,
  MX,
  MachineDefs,
  MachinePad,
  Motor as KitMotor,
  PAINT,
  kitStyle,
  useKitId,
} from "./machine-kit/machine-kit";

/* ==========================================================================
   Monoline machine schematic. Neutral bodies + var(--diagram-stroke) lines,
   sensor dots colour-coded by state. Coordinate space: 1000 × 372, sensor
   positions are DB percentages (x, y ∈ 0–100) mapped 1:1 onto that space —
   the same space the DB part/system bounding boxes use.
   ========================================================================== */

export interface SchematicDot {
  tag: string;
  name: string;
  value: string;
  unit: string;
  status: "Normal" | "Advisory" | "Critical";
  x: number;
  y: number;
  systemId?: string;
}

const W = 1000;
const H = 372;
/** Drawing space of every schematic; sensor x/y are % of it. */
export const SCHEMATIC_W = W;
export const SCHEMATIC_H = H;
const px = (p: number) => (p / 100) * W;
const py = (p: number) => (p / 100) * H;

export function MachineSchematic({
  diagramType,
  dots,
  selectedTag,
  onSelect,
  focusSystemId,
  compact = false,
  label,
}: {
  diagramType: AssetMachine["diagramType"];
  dots: SchematicDot[];
  selectedTag?: string | null;
  onSelect?: (tag: string | null) => void;
  /** Dims every dot outside this system (hover on a subsystem row). */
  focusSystemId?: string | null;
  compact?: boolean;
  label: string;
}) {
  const [hoverTag, setHoverTag] = useState<string | null>(null);
  const kitId = useKitId();
  const interactive = Boolean(onSelect) && !compact;
  const placed = dots.filter((d) => d.x > 0 || d.y > 0);
  const labelTag = hoverTag ?? (interactive ? selectedTag : null);
  const labelDot = labelTag ? placed.find((d) => d.tag === labelTag) : undefined;
  const r = compact ? 7 : 6;

  return (
    <svg
      className={`ast-sch ${compact ? "ast-sch--compact" : ""}`}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={label}
      preserveAspectRatio="xMidYMid meet"
      style={kitStyle(kitId)}
    >
      <MachineDefs id={kitId} />
      <MachineLines type={diagramType} />

      <g>
        {placed.map((d) => {
          const isSel = d.tag === selectedTag;
          const isHover = d.tag === hoverTag;
          const dim =
            (focusSystemId && d.systemId !== focusSystemId) || (compact && selectedTag && !isSel);
          const cx = px(d.x);
          const cy = py(d.y);
          return (
            <g
              key={d.tag}
              className={`ast-sch-dot ${dim ? "is-dim" : ""}`}
              data-pad={d.tag}
              data-tone={severityTone(d.status)}
              transform={`translate(${cx} ${cy})`}
              {...(interactive
                ? {
                    tabIndex: 0,
                    role: "button",
                    "aria-label": `${d.tag} ${d.name}: ${d.value} ${d.unit}, ${d.status}`,
                    "aria-pressed": isSel,
                    onClick: () => onSelect?.(isSel ? null : d.tag),
                    onKeyDown: (e: React.KeyboardEvent) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect?.(isSel ? null : d.tag);
                      }
                    },
                    onMouseEnter: () => setHoverTag(d.tag),
                    onMouseLeave: () => setHoverTag(null),
                    onFocus: () => setHoverTag(d.tag),
                    onBlur: () => setHoverTag(null),
                  }
                : {})}
            >
              {interactive && <circle className="ast-sch-hit" r={14} />}
              {(isSel || isHover) && <circle className="ast-sch-sel" r={r + 5} />}
              <MachinePad x={0} y={0} status={d.status} scale={(isSel && compact ? r + 2 : r) / 5} className="ast-sch-pin" />
            </g>
          );
        })}
      </g>

      {labelDot && !compact && <DotLabel dot={labelDot} r={r} />}
    </svg>
  );
}

function DotLabel({ dot, r }: { dot: SchematicDot; r: number }) {
  const text = `${dot.tag}  ${dot.value} ${dot.unit}`.trim();
  const w = text.length * 8.2 + 22;
  const h = 28;
  const cx = px(dot.x);
  const cy = py(dot.y);
  const x = Math.min(Math.max(cx - w / 2, 4), W - w - 4);
  const above = cy - r - 10 - h > 2;
  const y = above ? cy - r - 10 - h : cy + r + 10;
  return (
    <g className="ast-sch-label" pointerEvents="none">
      <rect x={x} y={y} width={w} height={h} rx={8} />
      <text x={x + 11} y={y + 19}>
        {text}
      </text>
    </g>
  );
}

/* ------------------------------------------------------------ drawings */
/*
 * Drawn with the ULTRON machine kit (TSE style): graphite gradient bodies,
 * one mid-grey rim, bolts and feet, brushed-metal shafts and rollers, brass
 * for process material only. Geometry matches the DB sensor coordinates
 * (x, y in % of 1000 × 372), so every pad sits on the part it measures.
 */

function MachineLines({ type }: { type: AssetMachine["diagramType"] }) {
  switch (type) {
    case "kiln":
      return <KilnLines />;
    case "mill":
      return <MillLines />;
    case "crusher":
      return <CrusherLines />;
    case "blower":
      return <BlowerLines />;
    default:
      return <PumpLines />;
  }
}

const GROUND_Y = 340;

function Ground({ x1 = 20, x2 = 980 }: { x1?: number; x2?: number }) {
  return <GroundLine x1={x1} x2={x2} y={GROUND_Y} />;
}

/** Horizontal motor body (fins, terminal box, cowl), shaft exiting right. */
function Motor({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return <KitMotor x={x} y={y} w={w} h={h} />;
}

/** Upright motor (vertical frame, fins across), as mounted on the kiln drive. */
function UprightMotor({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const fins = Math.round(h / 11);
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={12} {...PAINT.body} />
      {Array.from({ length: fins }).map((_, i) => (
        <line key={i} x1={x + 7} x2={x + w - 7} y1={y + 10 + (i * (h - 20)) / (fins - 1)} y2={y + 10 + (i * (h - 20)) / (fins - 1)} stroke={MX.fine} strokeWidth={1} />
      ))}
      <rect x={x + w * 0.22} y={y + h * 0.4} width={w * 0.56} height={h * 0.2} rx={2} {...PAINT.recess} />
      <rect x={x + w} y={y + h * 0.12} width={10} height={h * 0.76} rx={4} {...PAINT.body} />
      <rect x={x + w * 0.2} y={y - 12} width={w * 0.6} height={12} rx={3} {...PAINT.body} />
    </g>
  );
}

/* Rotary kiln — inlet chamber, sloped shell on three stations, drive,
   scanner, outlet seal and firing hood. */
function KilnLines() {
  const x0 = 182;
  const x1 = 850;
  const top = (x: number) => 96 + ((x - x0) * 16) / (x1 - x0);
  const bot = (x: number) => top(x) + 64;
  const stations = [295, 545, 795];
  const shell = `M ${x0} ${top(x0)} L ${x1} ${top(x1)} L ${x1} ${bot(x1)} L ${x0} ${bot(x0)} Z`;
  const hotFrom = 690;
  const hotZone = `M ${hotFrom} ${top(hotFrom) + 3} L ${x1} ${top(x1) + 3} L ${x1} ${bot(x1) - 3} L ${hotFrom} ${bot(hotFrom) - 3} Z`;

  return (
    <g>
      <Ground />

      {/* inlet chamber: feed pipe with meal, housing, analyser, legs */}
      <rect x={52} y={6} width={30} height={36} rx={4} {...PAINT.cylinderV} />
      <rect x={60} y={10} width={14} height={30} rx={2} fill={MX.material} />
      {[50, 142].map((lx) => (
        <rect key={lx} x={lx} y={218} width={10} height={GROUND_Y - 218} rx={2} {...PAINT.body} />
      ))}
      <Housing x={40} y={40} w={120} h={180} rx={10} />
      <rect x={76} y={62} width={30} height={24} rx={4} {...PAINT.raised} />
      <rect x={81} y={67} width={20} height={9} rx={1.5} {...PAINT.recess} />
      <rect x={58} y={100} width={84} height={98} rx={5} {...PAINT.recess} />
      <path d="M 66 110 L 132 110 L 120 150 L 78 150 Z" fill={MX.material} opacity={0.8} />
      <line x1={58} y1={218} x2={142} y2={218} stroke={MX.fine} />

      {/* inlet seal (lamella) + support */}
      <rect x={160} y={84} width={22} height={90} rx={4} {...PAINT.body} />
      {Array.from({ length: 7 }).map((_, i) => (
        <line key={i} x1={162} y1={92 + i * 12} x2={180} y2={97 + i * 12} stroke={MX.fine} strokeWidth={1} />
      ))}
      <rect x={186} y={178} width={9} height={GROUND_Y - 178} rx={2} {...PAINT.body} />

      {/* support stations: base, pier, bearing housings, rollers */}
      {stations.map((sx) => (
        <g key={`stn-${sx}`}>
          <path d={`M ${sx - 40} 308 H ${sx + 40} L ${sx + 48} ${GROUND_Y} H ${sx - 48} Z`} {...PAINT.body} />
          <rect x={sx - 32} y={196} width={64} height={112} rx={8} {...PAINT.body} />
          <line x1={sx - 26} x2={sx + 26} y1={268} y2={268} stroke={MX.fine} />
          {[sx - 15, sx + 15].map((bx) =>
            [242, 294].map((by) => <rect key={`${bx}-${by}`} x={bx - 10} y={by - 10} width={20} height={20} rx={4} {...PAINT.raised} />),
          )}
          <Bolt x={sx - 24} y={304} r={2} />
          <Bolt x={sx + 24} y={304} r={2} />
          {[sx - 15, sx + 15].map((rx) => (
            <g key={`roll-${rx}`}>
              <circle cx={rx} cy={bot(sx) + 16} r={13} {...PAINT.shaft} stroke={MX.edge} strokeWidth={1.5} />
              <circle cx={rx} cy={bot(sx) + 16} r={4} fill={MX.deep} stroke={MX.fine} />
            </g>
          ))}
        </g>
      ))}

      {/* hydraulic thrust roller cylinder at station 2 */}
      <rect x={570} y={236} width={20} height={92} rx={5} {...PAINT.cylinderV} />
      <rect x={576} y={224} width={8} height={14} rx={1.5} {...PAINT.shaft} />
      <rect x={566} y={322} width={28} height={8} rx={2} {...PAINT.body} />

      {/* shell: metal cylinder, section seams, burning-zone heat toward the outlet */}
      <path d={shell} {...PAINT.cylinder} />
      <path d={hotZone} fill={MX.heat} opacity={0.7} />
      {Array.from({ length: 10 }).map((_, i) => {
        const sx = x0 + 34 + i * 66;
        return <line key={i} x1={sx} x2={sx} y1={top(sx) + 2} y2={bot(sx) - 2} stroke={MX.fine} strokeWidth={1} />;
      })}

      {/* riding tyres */}
      {stations.map((sx) => (
        <rect key={`tyre-${sx}`} x={sx - 12} y={top(sx) - 6} width={24} height={76} rx={4} {...PAINT.cylinderV} />
      ))}

      {/* girth gear with teeth, spray nozzle above */}
      <rect x={384} y={top(390) - 10} width={12} height={84} rx={2} {...PAINT.raised} />
      {Array.from({ length: 12 }).map((_, i) => (
        <line key={i} x1={380} x2={384} y1={top(390) - 6 + i * 7} y2={top(390) - 6 + i * 7} stroke={MX.edge} strokeWidth={1.2} />
      ))}
      <rect x={380} y={74} width={22} height={12} rx={3} {...PAINT.body} />
      <line x1={391} y1={86} x2={391} y2={top(390) - 10} stroke={MX.fine} strokeDasharray="2 2" />

      {/* drive: plinth, lube skid with oil tank, gearbox, pinion shaft, motor */}
      <path d={`M 340 302 H 464 L 470 ${GROUND_Y} H 334 Z`} {...PAINT.body} />
      <Housing x={346} y={240} w={112} h={62} rx={8} bolts={false} />
      <rect x={352} y={274} width={40} height={22} rx={3} {...PAINT.recess} />
      <rect x={354} y={283} width={36} height={11} rx={2} fill={MX.material} />
      <circle cx={420} cy={284} r={9} {...PAINT.raised} />
      <circle cx={420} cy={284} r={3} fill={MX.deep} />
      <circle cx={444} cy={284} r={7} {...PAINT.body} />
      <rect x={394} y={150} width={8} height={18} rx={1.5} {...PAINT.shaft} />
      <Housing x={356} y={166} w={84} h={60} rx={9} />
      <line x1={398} y1={172} x2={398} y2={220} stroke={MX.fine} />
      <circle cx={377} cy={196} r={12} fill="none" stroke={MX.fine} />
      <circle cx={420} cy={196} r={16} fill="none" stroke={MX.fine} />
      <UprightMotor x={440} y={128} w={46} h={92} />

      {/* shell scanner on its mast */}
      <rect x={617} y={18} width={6} height={44} rx={1.5} {...PAINT.shaft} />
      <rect x={620} y={56} width={36} height={6} rx={1.5} {...PAINT.shaft} />
      <rect x={656} y={48} width={30} height={22} rx={5} {...PAINT.body} />
      <rect x={664} y={63} width={14} height={5} rx={1.5} {...PAINT.recess} />
      <line x1={664} x2={632} y1={68} y2={top(632) - 2} stroke={MX.fine} strokeDasharray="3 3" />
      <line x1={678} x2={712} y1={68} y2={top(712) - 2} stroke={MX.fine} strokeDasharray="3 3" />

      {/* outlet seal + cooling fan with its duct */}
      <rect x={850} y={106} width={16} height={76} rx={4} {...PAINT.body} />
      {Array.from({ length: 6 }).map((_, i) => (
        <line key={i} x1={852} y1={113 + i * 11} x2={864} y2={117 + i * 11} stroke={MX.fine} />
      ))}
      <rect x={856} y={182} width={8} height={85} rx={2} {...PAINT.body} />
      <Fan cx={860} cy={283} r={16} />

      {/* firing hood, pyrometer, coal line, burner lance, clinker chute */}
      <rect x={872} y={240} width={10} height={GROUND_Y - 240} rx={2} {...PAINT.body} />
      <rect x={952} y={240} width={10} height={GROUND_Y - 240} rx={2} {...PAINT.body} />
      <path d="M 896 240 H 936 L 928 300 H 904 Z" {...PAINT.body} />
      <path d="M 902 262 H 930 L 928 298 H 904 Z" fill={MX.material} />
      <Housing x={866} y={40} w={100} h={200} rx={10} />
      <rect x={936} y={14} width={8} height={28} rx={1.5} {...PAINT.shaft} />
      <rect x={880} y={80} width={22} height={16} rx={4} {...PAINT.raised} />
      <rect x={885} y={90} width={12} height={4} rx={1} {...PAINT.recess} />
      <rect x={870} y={146} width={126} height={9} rx={3} {...PAINT.shaft} />
    </g>
  );
}

function MillLines() {
  return (
    <g>
      <Ground x1={50} x2={860} />
      <Motor x={84} y={110} w={136} h={160} />
      <rect x={220} y={184} width={40} height={12} rx={2} {...PAINT.shaft} />
      <Housing x={260} y={120} w={125} h={140} rx={12} />
      <rect x={385} y={184} width={35} height={12} rx={2} {...PAINT.shaft} />
      <rect x={420} y={200} width={40} height={96} rx={6} {...PAINT.body} />
      <rect x={770} y={200} width={40} height={96} rx={6} {...PAINT.body} />
      <path d="M 500 70 L 460 150 V 220 L 500 300 Z" {...PAINT.body} />
      <path d="M 730 70 L 770 150 V 220 L 730 300 Z" {...PAINT.body} />
      <rect x={500} y={70} width={230} height={230} rx={6} {...PAINT.cylinder} />
      <rect x={512} y={232} width={206} height={60} rx={4} fill={MX.material} opacity={0.75} />
      <rect x={640} y={62} width={10} height={246} rx={2} {...PAINT.raised} />
      <path d="M 410 296 H 820 L 828 340 H 402 Z" {...PAINT.body} />
      <CornerBolts x={410} y={296} w={410} h={44} inset={10} />
    </g>
  );
}

function CrusherLines() {
  return (
    <g>
      <Ground x1={120} x2={760} />
      <rect x={380} y={40} width={240} height={26} rx={6} {...PAINT.body} />
      <path d="M 300 66 H 700 L 620 250 H 380 Z" {...PAINT.body} />
      <path d="M 330 80 H 670 L 640 150 H 360 Z" fill={MX.material} opacity={0.75} />
      <path d="M 500 90 L 440 240 H 560 Z" {...PAINT.raised} />
      <rect x={496} y={40} width={8} height={246} rx={2} {...PAINT.shaft} />
      <Housing x={330} y={250} w={170} h={36} rx={6} bolts={false} />
      <Motor x={160} y={226} w={100} h={60} />
      <rect x={270} y={250} width={60} height={10} rx={2} {...PAINT.shaft} />
      <rect x={470} y={286} width={60} height={54} rx={6} {...PAINT.body} />
    </g>
  );
}

function PumpLines() {
  return (
    <g>
      <GroundLine x1={90} x2={900} y={290} />
      <Motor x={120} y={115} w={175} h={150} />
      <Coupling x={300} y={172} w={26} h={36} />
      <Housing x={330} y={140} w={185} h={100} rx={10} />
      <rect x={515} y={184} width={30} height={12} rx={2} {...PAINT.shaft} />
      <path d="M 690 98 H 880 V 110 H 700 Z M 700 150 H 880 V 162 H 700 Z" {...PAINT.cylinder} />
      <rect x={874} y={92} width={14} height={76} rx={3} {...PAINT.body} />
      <circle cx={630} cy={180} r={90} {...PAINT.body} />
      <circle cx={630} cy={180} r={64} fill="none" stroke={MX.fine} />
      <circle cx={630} cy={180} r={30} {...PAINT.shaft} stroke={MX.edge} strokeWidth={1.5} />
      <circle cx={630} cy={180} r={8} fill={MX.deep} />
    </g>
  );
}

function BlowerLines() {
  return (
    <g>
      <GroundLine x1={90} x2={900} y={290} />
      <Motor x={120} y={115} w={175} h={150} />
      <rect x={295} y={184} width={265} height={12} rx={2} {...PAINT.shaft} />
      <Housing x={330} y={150} w={185} h={80} rx={10} bolts={false} />
      <rect x={430} y={172} width={22} height={36} rx={4} {...PAINT.raised} />
      <rect x={700} y={60} width={140} height={50} rx={6} {...PAINT.cylinder} />
      <circle cx={630} cy={175} r={95} {...PAINT.body} />
      <Fan cx={630} cy={175} r={40} />
    </g>
  );
}
