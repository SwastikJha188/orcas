"use client";

import React from "react";
import "./kiln-diagrams.css";
import { displayName } from "@/lib/display-name";

/* ==========================================================================
   KLN-01 diagrams — overview + 15 sub-assemblies (D5-OSW-PE-KLN Rev. 01).

   Style: graphite line-art on a dark canvas, spaced uppercase part labels,
   no boxes. Colour only appears on measurement points and status dots.
   Every drawing owns its measurement points, so geometry and P-numbers can
   never drift apart. Sub-assembly canvas: 800 × 380. Overview: 1200 × 440.
   ========================================================================== */

export type KilnStatus = "normal" | "warning" | "alarm" | "invalid";

export interface KilnReading {
  value: string;
  unit?: string;
  status: KilnStatus;
}

export type KilnSubAssemblyId =
  | "main-motor"
  | "gearbox"
  | "pinion-gear"
  | "lubrication"
  | "auxiliary-drive"
  | "station-1"
  | "station-2"
  | "station-3"
  | "thrust"
  | "shell-refractory"
  | "inlet-seal"
  | "outlet-seal"
  | "kiln-inlet"
  | "feed-fuel"
  | "burner-hood";

export type KilnMachineTag = "DRV-KLN-01" | "SUP-KLN-01" | "SHL-KLN-01" | "PRC-KLN-01";

export interface KilnPoint {
  p: string;
  tag: string;
  name: string;
  /** Point on the drawing. */
  x: number;
  y: number;
  /** Which label column the reading sits in, and at what height. */
  side: "l" | "r";
  ly: number;
}

export interface KilnSubAssembly {
  id: KilnSubAssemblyId;
  name: string;
  machine: KilnMachineTag;
  points: KilnPoint[];
}

const SUB_W = 800;
const SUB_H = 380;
const COL_L = 176;
const COL_R = 624;

/* ------------------------------------------------------------------ */
/* Measurement points (D5 §5.x.2 — P-numbers per sub-assembly)        */
/* ------------------------------------------------------------------ */

const pt = (p: string, tag: string, name: string, x: number, y: number, side: "l" | "r", ly: number): KilnPoint => ({
  p,
  tag,
  name,
  x,
  y,
  side,
  ly,
});

export const KILN_SUB_ASSEMBLIES: KilnSubAssembly[] = [
  {
    id: "main-motor",
    name: "Main motor",
    machine: "DRV-KLN-01",
    points: [
      pt("P1", "TMP-KLN-20", "NDE bearing temperature", 250, 218, "l", 150),
      pt("P2", "TMP-KLN-21", "Winding temperature", 322, 236, "l", 262),
      pt("P3", "ELE-KLN-01", "Drive torque", 516, 74, "r", 60),
      pt("P4", "VIB-KLN-01", "DE vibration", 511, 172, "r", 140),
      pt("P5", "TMP-KLN-19", "DE bearing temperature", 511, 238, "r", 222),
      pt("P6", "SPD-KLN-01", "Kiln speed", 548, 218, "r", 302),
    ],
  },
  {
    id: "gearbox",
    name: "Gearbox",
    machine: "DRV-KLN-01",
    points: [
      pt("P1", "VIB-KLN-02", "Input vibration", 296, 178, "l", 120),
      pt("P2", "TMP-KLN-22", "Input bearing temperature", 296, 214, "l", 262),
      pt("P3", "VIB-KLN-03", "Output vibration", 512, 168, "r", 120),
      pt("P4", "TMP-KLN-23", "Output bearing temperature", 512, 224, "r", 262),
    ],
  },
  {
    id: "pinion-gear",
    name: "Pinion & girth gear",
    machine: "DRV-KLN-01",
    points: [
      pt("P1", "STS-KLN-05", "Girth-gear spray", 214, 214, "l", 172),
      pt("P2", "VIB-KLN-04", "Pinion vibration", 448, 252, "r", 246),
      pt("P3", "SPD-KLN-01", "Kiln speed", 600, 111, "r", 110),
    ],
  },
  {
    id: "lubrication",
    name: "Lubrication",
    machine: "DRV-KLN-01",
    points: [
      pt("P1", "TMP-KLN-15", "Gearbox oil temperature", 610, 120, "r", 100),
      pt("P2", "LEV-KLN-01", "Oil level switch", 200, 222, "l", 210),
      pt("P3", "FLO-KLN-05", "Oil flow switch", 610, 182, "r", 180),
      pt("P4", "PRS-KLN-04", "Gearbox oil pressure", 484, 226, "r", 268),
    ],
  },
  {
    id: "auxiliary-drive",
    name: "Auxiliary drive",
    machine: "DRV-KLN-01",
    points: [pt("P1", "STS-KLN-11", "Auxiliary drive status", 256, 196, "l", 150)],
  },
  ...([1, 2, 3] as const).map((n): KilnSubAssembly => {
    const t = (i: number) => `TMP-KLN-${String((n - 1) * 4 + i).padStart(2, "0")}`;
    return {
      id: `station-${n}` as KilnSubAssemblyId,
      name: `Station ${n}`,
      machine: "SUP-KLN-01",
      points: [
        pt("P1", t(1), "Left roller · bearing A", 302, 98, "l", 98),
        pt("P2", t(3), "Right roller · bearing A", 302, 282, "l", 282),
        pt("P3", t(2), "Left roller · bearing B", 498, 98, "r", 98),
        pt("P4", t(4), "Right roller · bearing B", 498, 282, "r", 282),
      ],
    };
  }),
  {
    id: "thrust",
    name: "Thrust",
    machine: "SUP-KLN-01",
    points: [
      pt("P1", "POS-KLN-01", "Axial position (LVDT)", 470, 127, "r", 96),
      pt("P2", "PRS-KLN-07", "Thrust hydraulic pressure", 548, 252, "r", 252),
      pt("P3", "POS-KLN-02", "Travel limit switches", 397, 171, "l", 196),
    ],
  },
  {
    id: "shell-refractory",
    name: "Shell & refractory",
    machine: "SHL-KLN-01",
    points: [
      pt("P1", "CAL-KLN-03", "Shell maximum", 287, 169, "l", 150),
      pt("P2", "STS-KLN-08", "Scanner coverage", 594, 52, "r", 52),
    ],
  },
  {
    id: "inlet-seal",
    name: "Inlet seal",
    machine: "SHL-KLN-01",
    points: [
      pt("P1", "GAS-KLN-01", "Inlet O₂", 280, 150, "l", 130),
      pt("P2", "TMP-KLN-13", "Inlet gas temperature", 262, 230, "l", 250),
      pt("P3", "CAL-KLN-06", "False-air index", 344, 100, "r", 64),
      pt("P4", "CAL-KLN-07", "Seal overlap margin", 344, 260, "r", 306),
    ],
  },
  {
    id: "outlet-seal",
    name: "Outlet seal",
    machine: "SHL-KLN-01",
    points: [
      pt("P1", "CAL-KLN-07", "Seal overlap margin", 495, 100, "l", 70),
      pt("P2", "STS-KLN-10", "Seal cooling fan", 402, 318, "l", 300),
      pt("P3", "PRS-KLN-03", "Hood pressure", 590, 58, "r", 58),
    ],
  },
  {
    id: "kiln-inlet",
    name: "Kiln inlet",
    machine: "PRC-KLN-01",
    points: [
      pt("P1", "STS-KLN-06", "Gas analyser status", 236, 336, "l", 336),
      pt("P2", "GAS-KLN-01", "Inlet O₂", 246, 199, "l", 180),
      pt("P3", "GAS-KLN-02", "Inlet CO", 268, 199, "l", 236),
      pt("P4", "TMP-KLN-13", "Inlet gas temperature", 303, 254, "l", 286),
      pt("P5", "PRS-KLN-01", "Inlet draft", 336, 128, "r", 110),
    ],
  },
  {
    id: "feed-fuel",
    name: "Feed & fuel",
    machine: "PRC-KLN-01",
    points: [
      pt("P1", "FLO-KLN-01", "Kiln feed", 226, 200, "l", 200),
      pt("P2", "FLO-KLN-02", "Kiln burner fuel", 514, 190, "r", 190),
    ],
  },
  {
    id: "burner-hood",
    name: "Burner & hood",
    machine: "PRC-KLN-01",
    points: [
      pt("P1", "TMP-KLN-14", "Burning-zone temperature", 570, 34, "r", 50),
      pt("P2", "PRS-KLN-03", "Hood pressure", 470, 34, "l", 60),
    ],
  },
];

export const KILN_MACHINES: Array<{ tag: KilnMachineTag; name: string; context?: boolean }> = [
  { tag: "DRV-KLN-01", name: "Drive train" },
  { tag: "SUP-KLN-01", name: "Support & thrust" },
  { tag: "SHL-KLN-01", name: "Shell, refractory & seals" },
  { tag: "PRC-KLN-01", name: "Process context", context: true },
];

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

/** Round computed geometry so server and client render identical attributes. */
const f = (v: number) => Math.round(v * 100) / 100;

const STATUS_FILL: Record<KilnStatus, string> = {
  normal: "var(--status-success)",
  warning: "var(--status-warning)",
  alarm: "var(--status-danger)",
  invalid: "var(--text-muted)",
};

function Bolt({ x, y, r = 2.6 }: { x: number; y: number; r?: number }) {
  return <circle className="kd-bolt" cx={x} cy={y} r={r} />;
}

function Lbl({
  x,
  y,
  children,
  a = "middle",
  cls = "kd-label",
}: {
  x: number;
  y: number;
  children: React.ReactNode;
  a?: "start" | "middle" | "end";
  cls?: string;
}) {
  return (
    <text className={cls} x={x} y={y} textAnchor={a}>
      {children}
    </text>
  );
}

/** Polyline with an open chevron head. */
function Arrow({ pts, dashed = false }: { pts: Array<[number, number]>; dashed?: boolean }) {
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"} ${x} ${y}`).join(" ");
  const [x1, y1] = pts[pts.length - 2];
  const [x2, y2] = pts[pts.length - 1];
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = 6;
  const head = `M ${f(x2 - h * Math.cos(a - 0.5))} ${f(y2 - h * Math.sin(a - 0.5))} L ${x2} ${y2} L ${f(x2 - h * Math.cos(a + 0.5))} ${f(y2 - h * Math.sin(a + 0.5))}`;
  return (
    <g>
      <path className={`kd-flow${dashed ? " kd-dash" : ""}`} d={d} />
      <path className="kd-flow" d={head} />
    </g>
  );
}

function Gear({ cx, cy, r, teeth, hub, depth = 5 }: { cx: number; cy: number; r: number; teeth: number; hub: number; depth?: number }) {
  return (
    <g>
      {Array.from({ length: teeth }).map((_, i) => {
        const a = (i / teeth) * Math.PI * 2;
        return (
          <line
            key={i}
            className="kd-stroke"
            x1={f(cx + r * Math.cos(a))}
            y1={f(cy + r * Math.sin(a))}
            x2={f(cx + (r + depth) * Math.cos(a))}
            y2={f(cy + (r + depth) * Math.sin(a))}
          />
        );
      })}
      <circle className="kd-raised" cx={cx} cy={cy} r={r} />
      <circle className="kd-hair" cx={cx} cy={cy} r={r * 0.72} />
      <circle className="kd-inset" cx={cx} cy={cy} r={hub} />
    </g>
  );
}

/** Lamella seal: frame with overlapping angled spring plates. */
function Lamella({ x, y, w, h, flip = false }: { x: number; y: number; w: number; h: number; flip?: boolean }) {
  const n = Math.floor(w / 7);
  return (
    <g>
      <rect className="kd-raised" x={x} y={y} width={w} height={h} rx={2} />
      {Array.from({ length: n }).map((_, i) => {
        const px = x + 4 + i * 7;
        return <line key={i} className="kd-line" x1={px} y1={flip ? y + h : y} x2={px + 5} y2={flip ? y : y + h} />;
      })}
    </g>
  );
}

/** Brick-lined strip (refractory) drawn as staggered joints. */
function Brick({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const rows = Math.floor(h / 10);
  return (
    <g>
      <rect className="kd-body" x={x} y={y} width={w} height={h} />
      {Array.from({ length: rows }).map((_, i) => (
        <g key={i}>
          <line className="kd-hair" x1={x} x2={x + w} y1={y + (i + 1) * 10} y2={y + (i + 1) * 10} />
          <line className="kd-hair" x1={x + (i % 2 ? w * 0.3 : w * 0.7)} x2={x + (i % 2 ? w * 0.3 : w * 0.7)} y1={y + i * 10} y2={y + (i + 1) * 10} />
        </g>
      ))}
    </g>
  );
}

function Flame({ x0, x1, cy, h }: { x0: number; x1: number; cy: number; h: number }) {
  const mid = (x0 + x1) / 2;
  return (
    <g>
      <path
        className="kd-line"
        d={`M ${x1} ${cy} C ${mid} ${cy - h}, ${x0 + 24} ${cy - h * 0.7}, ${x0} ${cy} C ${x0 + 24} ${cy + h * 0.7}, ${mid} ${cy + h}, ${x1} ${cy} Z`}
      />
      <path
        className="kd-hair"
        d={`M ${x1} ${cy} C ${mid + 10} ${cy - h * 0.45}, ${mid - 20} ${cy - h * 0.35}, ${mid - 30} ${cy} C ${mid - 20} ${cy + h * 0.35}, ${mid + 10} ${cy + h * 0.45}, ${x1} ${cy} Z`}
      />
    </g>
  );
}

/** Horizontal cooling fins inside a housing. */
function Fins({ x1, x2, y1, y2, step = 12 }: { x1: number; x2: number; y1: number; y2: number; step?: number }) {
  const lines: React.ReactNode[] = [];
  for (let y = y1; y <= y2; y += step) lines.push(<line key={y} className="kd-hair" x1={x1} x2={x2} y1={y} y2={y} />);
  return <g>{lines}</g>;
}

function CentreLine({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  return <line className="kd-hair kd-centre" x1={x1} x2={x2} y1={y} y2={y} />;
}

/* ------------------------------------------------------------------ */
/* Measurement point + borderless reading                              */
/* ------------------------------------------------------------------ */

function PointMark({
  point,
  reading,
  selected,
  onSelect,
}: {
  point: KilnPoint;
  reading?: KilnReading;
  selected: boolean;
  onSelect?: (tag: string) => void;
}) {
  const left = point.side === "l";
  const edge = left ? COL_L : COL_R;
  const elbow = left ? edge + 10 : edge - 10;
  const tx = left ? edge - 4 : edge + 4;
  const anchor = left ? "end" : "start";
  const fill = reading ? STATUS_FILL[reading.status] : "var(--kd-stroke)";
  const interactive = Boolean(onSelect);
  const unit = reading?.unit && reading.unit !== "state" ? reading.unit : "";

  return (
    <g
      className={`kd-point${selected ? " is-selected" : ""}`}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? selected : undefined}
      aria-label={`${point.name} (${point.tag})${reading ? `: ${reading.value} ${unit}, ${reading.status}` : ""}`}
      onClick={() => onSelect?.(point.tag)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(point.tag);
        }
      }}
    >
      <title>{`${point.p} · ${point.tag} · ${point.name}`}</title>
      <path className="kd-leader" d={`M ${point.x} ${point.y} L ${elbow} ${point.ly} L ${edge} ${point.ly}`} />
      <circle className="kd-point-hit" cx={point.x} cy={point.y} r={12} />
      <circle className="kd-point-ring" cx={point.x} cy={point.y} r={8.5} />
      <circle cx={point.x} cy={point.y} r={4.5} fill={fill} className="kd-point-dot" />

      <text className="kd-read-name" x={tx} y={point.ly - 4} textAnchor={anchor}>
        {displayName(point.name)}
      </text>
      <text className="kd-read-line" x={tx} y={point.ly + 12} textAnchor={anchor}>
        {reading && (
          <>
            <tspan className="kd-read-value">{reading.value}</tspan>
            {unit && <tspan className="kd-read-unit" dx={3}>{unit}</tspan>}
          </>
        )}
        <tspan className="kd-read-tag" dx={reading ? 8 : 0}>
          {point.p}
        </tspan>
      </text>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-assembly drawings                                               */
/* ------------------------------------------------------------------ */

function MainMotor() {
  return (
    <g>
      {/* VFD cabinet + cable */}
      <rect className="kd-body" x={420} y={52} width={96} height={44} rx={4} />
      <rect className="kd-inset" x={432} y={62} width={52} height={14} rx={2} />
      <Bolt x={500} y={69} r={3.5} />
      <Bolt x={500} y={84} r={2} />
      <path className="kd-line kd-dash" d="M 468 96 L 468 112 L 412 112 L 412 128" />
      <Lbl x={468} y={42}>VFD</Lbl>

      {/* Base + feet */}
      <rect className="kd-body" x={236} y={292} width={330} height={14} rx={2} />
      <Bolt x={252} y={299} />
      <Bolt x={550} y={299} />
      <rect className="kd-body" x={290} y={272} width={44} height={20} rx={2} />
      <rect className="kd-body" x={452} y={272} width={44} height={20} rx={2} />
      <Bolt x={312} y={282} />
      <Bolt x={474} y={282} />

      {/* NDE fan cowl */}
      <rect className="kd-raised" x={232} y={168} width={36} height={100} rx={6} />
      {[184, 196, 208, 220, 232, 244].map((y) => (
        <line key={y} className="kd-line" x1={242} x2={258} y1={y} y2={y} />
      ))}

      {/* Stator housing */}
      <rect className="kd-body" x={268} y={152} width={232} height={124} rx={14} />
      <Fins x1={282} x2={486} y1={168} y2={262} step={11} />
      <rect className="kd-inset" x={364} y={198} width={56} height={28} rx={2} />
      <Bolt x={372} y={204} r={1.6} />
      <Bolt x={412} y={220} r={1.6} />

      {/* Terminal box */}
      <rect className="kd-raised" x={384} y={128} width={56} height={24} rx={3} />
      <Bolt x={394} y={140} />
      <Bolt x={430} y={140} />

      {/* DE end shield, shaft, coupling */}
      <rect className="kd-raised" x={500} y={168} width={22} height={100} rx={5} />
      <Bolt x={511} y={182} />
      <Bolt x={511} y={254} />
      <rect className="kd-body" x={522} y={210} width={52} height={16} />
      <CentreLine x1={512} x2={612} y={218} />
      <rect className="kd-raised" x={574} y={194} width={26} height={48} rx={4} />
      <line className="kd-line" x1={587} x2={587} y1={194} y2={242} />

      <Lbl x={250} y={158}>NDE</Lbl>
      <Lbl x={511} y={158}>DE</Lbl>
      <Lbl x={587} y={258}>COUPLING</Lbl>
      <Lbl x={400} y={334}>MAIN MOTOR · 630 kW · 690 V · 6-POLE</Lbl>
    </g>
  );
}

function Gearbox() {
  const bearings: Array<[number, number]> = [
    [296, 18],
    [380, 22],
    [452, 24],
    [512, 28],
  ];
  return (
    <g>
      <rect className="kd-body" x={240} y={302} width={320} height={10} rx={2} />
      <rect className="kd-body" x={262} y={288} width={60} height={14} rx={2} />
      <rect className="kd-body" x={478} y={288} width={60} height={14} rx={2} />

      <rect className="kd-body" x={250} y={120} width={300} height={168} rx={10} />
      <rect className="kd-raised" x={340} y={108} width={90} height={12} rx={2} />
      <rect className="kd-raised" x={468} y={98} width={12} height={22} rx={2} />
      <rect className="kd-raised" x={244} y={192} width={312} height={8} rx={2} />
      {[268, 340, 416, 486, 540].map((x) => (
        <Bolt key={x} x={x} y={196} r={2} />
      ))}

      {bearings.map(([x, r]) => (
        <g key={x}>
          <circle className="kd-raised" cx={x} cy={196} r={r} />
          <circle className="kd-hair" cx={x} cy={196} r={r * 0.68} />
          <circle className="kd-inset" cx={x} cy={196} r={r * 0.36} />
        </g>
      ))}

      <rect className="kd-body" x={208} y={189} width={42} height={14} />
      <rect className="kd-body" x={550} y={184} width={56} height={24} />
      <CentreLine x1={200} x2={612} y={196} />

      <circle className="kd-inset" cx={300} cy={262} r={6} />
      <Bolt x={530} y={278} />

      <Lbl x={229} y={224}>INPUT</Lbl>
      <Lbl x={578} y={226}>OUTPUT</Lbl>
      <Lbl x={300} y={282}>SIGHT GLASS</Lbl>
      <Lbl x={400} y={336}>GEARBOX · 3-STAGE HELICAL · 35.5 : 1 · ISO VG 320</Lbl>
    </g>
  );
}

function PinionGirthGear() {
  // Girth gear: circle centred far above the canvas so only the bottom arc shows.
  const cx = 400;
  const cy = -560;
  const arc = (r: number) => {
    const half = Math.asin(240 / r);
    const a0 = Math.PI / 2 + half;
    const a1 = Math.PI / 2 - half;
    return `M ${f(cx + r * Math.cos(a0))} ${f(cy + r * Math.sin(a0))} A ${r} ${r} 0 0 0 ${f(cx + r * Math.cos(a1))} ${f(cy + r * Math.sin(a1))}`;
  };
  const band = (r0: number, r1: number) => {
    const h0 = Math.asin(230 / r1);
    const h1 = Math.asin(230 / r0);
    const p = (r: number, a: number) => `${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`;
    return `M ${p(r1, Math.PI / 2 + h0)} A ${r1} ${r1} 0 0 0 ${p(r1, Math.PI / 2 - h0)} L ${p(r0, Math.PI / 2 - h1)} A ${r0} ${r0} 0 0 1 ${p(r0, Math.PI / 2 + h1)} Z`;
  };
  const teeth: React.ReactNode[] = [];
  const step = (2 * Math.PI) / 168;
  for (let a = Math.PI / 2 - 0.32; a <= Math.PI / 2 + 0.32; a += step) {
    teeth.push(
      <line key={a} className="kd-stroke" x1={f(cx + 700 * Math.cos(a))} y1={f(cy + 700 * Math.sin(a))} x2={f(cx + 711 * Math.cos(a))} y2={f(cy + 711 * Math.sin(a))} />,
    );
  }
  const plates: React.ReactNode[] = [];
  for (let a = Math.PI / 2 - 0.3; a <= Math.PI / 2 + 0.3; a += 0.06) {
    plates.push(
      <line key={a} className="kd-line" x1={f(cx + 642 * Math.cos(a))} y1={f(cy + 642 * Math.sin(a))} x2={f(cx + 672 * Math.cos(a))} y2={f(cy + 672 * Math.sin(a))} />,
    );
  }

  return (
    <g>
      <path className="kd-line" d={arc(640)} />
      <path className="kd-hair" d={arc(610)} />
      {plates}
      {teeth}
      <path className="kd-raised" d={band(672, 700)} />

      {/* Pinion on its bearing pedestal */}
      <rect className="kd-body" x={340} y={236} width={120} height={42} rx={4} />
      <Bolt x={352} y={268} />
      <Bolt x={448} y={268} />
      <rect className="kd-body" x={316} y={278} width={168} height={12} rx={2} />
      <Gear cx={400} cy={196} r={40} teeth={24} hub={13} depth={7} />

      {/* Spray unit + nozzle */}
      <rect className="kd-body" x={190} y={198} width={48} height={36} rx={3} />
      <rect className="kd-inset" x={198} y={206} width={22} height={8} rx={1} />
      <path className="kd-line" d="M 238 210 L 300 210 L 334 172" />
      <path className="kd-raised" d="M 330 168 L 342 166 L 338 178 Z" />
      {[0, 1, 2].map((i) => (
        <line key={i} className="kd-hair kd-dash" x1={340} y1={170} x2={362 + i * 12} y2={150 - i * 2} />
      ))}

      <Lbl x={400} y={60}>KILN SHELL · Ø 4.8 m</Lbl>
      <Lbl x={214} y={250}>SPRAY UNIT</Lbl>
      <Lbl x={300} y={152}>GIRTH GEAR · 168 T</Lbl>
      <Lbl x={400} y={310}>PINION · 24 T</Lbl>
      <Lbl x={400} y={336}>GMF = 168 × 3.80 rpm / 60 = 10.64 Hz</Lbl>
    </g>
  );
}

function Lubrication() {
  return (
    <g>
      {/* Gearbox (consumer) */}
      <rect className="kd-body" x={470} y={50} width={120} height={56} rx={6} />
      <rect className="kd-raised" x={466} y={74} width={128} height={6} rx={2} />
      <Lbl x={530} y={40}>GEARBOX</Lbl>

      {/* Tank */}
      <rect className="kd-body" x={200} y={200} width={130} height={100} rx={4} />
      <rect className="kd-inset" x={201} y={222} width={128} height={77} />
      <line className="kd-line kd-dash" x1={204} x2={326} y1={222} y2={222} />
      <Lbl x={265} y={322}>OIL TANK · 800 L</Lbl>

      {/* Duty + standby pumps */}
      <circle className="kd-raised" cx={375} cy={272} r={15} />
      <circle className="kd-inset" cx={375} cy={272} r={5} />
      <circle className="kd-raised kd-dash" cx={375} cy={226} r={15} />
      <circle className="kd-inset" cx={375} cy={226} r={5} />
      <Lbl x={375} y={302}>DUTY</Lbl>
      <Lbl x={375} y={202}>STANDBY</Lbl>

      {/* Filter */}
      <rect className="kd-body" x={440} y={200} width={30} height={52} rx={4} />
      <line className="kd-line" x1={440} x2={470} y1={226} y2={226} />
      {[208, 216, 234, 242].map((y) => (
        <line key={y} className="kd-hair" x1={446} x2={464} y1={y} y2={y} />
      ))}
      <Lbl x={455} y={270}>FILTER</Lbl>

      {/* Cooler */}
      <rect className="kd-body" x={500} y={190} width={48} height={72} rx={4} />
      {[508, 516, 524, 532, 540].map((x) => (
        <line key={x} className="kd-hair" x1={x} x2={x} y1={196} y2={256} />
      ))}
      <Lbl x={524} y={280}>COOLER</Lbl>

      {/* Pipework */}
      <Arrow pts={[[330, 272], [360, 272]]} />
      <path className="kd-line kd-dash" d="M 330 236 L 344 236 L 344 226 L 360 226" />
      <path className="kd-flow" d="M 390 272 L 410 272 L 410 226 M 390 226 L 410 226" />
      <Arrow pts={[[410, 226], [440, 226]]} />
      <Arrow pts={[[470, 226], [500, 226]]} />
      <Arrow pts={[[548, 226], [610, 226], [610, 78], [594, 78]]} />
      <Arrow pts={[[500, 106], [500, 140], [265, 140], [265, 198]]} dashed />
      <Lbl x={380} y={132}>RETURN</Lbl>
    </g>
  );
}

function AuxiliaryDrive() {
  return (
    <g>
      <Lbl x={400} y={56}>TURNS THE KILN AT ≈ 0.1 rpm WHEN THE MAIN DRIVE IS STOPPED</Lbl>

      <rect className="kd-body" x={196} y={288} width={210} height={12} rx={2} />

      {/* Aux motor */}
      <rect className="kd-raised" x={196} y={206} width={14} height={60} rx={4} />
      <rect className="kd-body" x={210} y={196} width={92} height={80} rx={9} />
      <Fins x1={220} x2={292} y1={208} y2={264} step={10} />
      <Bolt x={226} y={282} />
      <Bolt x={286} y={282} />

      {/* Brake */}
      <rect className="kd-body" x={302} y={230} width={14} height={12} />
      <rect className="kd-raised" x={316} y={204} width={22} height={64} rx={3} />
      <line className="kd-line" x1={327} x2={327} y1={204} y2={268} />

      {/* Overrunning clutch */}
      <rect className="kd-body" x={338} y={230} width={14} height={12} />
      <rect className="kd-raised" x={352} y={196} width={40} height={80} rx={6} />
      <circle className="kd-inset" cx={372} cy={236} r={13} />
      <circle className="kd-hair" cx={372} cy={236} r={7} />
      <rect className="kd-body" x={392} y={230} width={28} height={12} />

      {/* Main gearbox (aux input side) */}
      <rect className="kd-body" x={420} y={110} width={170} height={200} rx={10} />
      <rect className="kd-raised" x={414} y={204} width={182} height={8} rx={2} />
      <circle className="kd-raised" cx={450} cy={236} r={16} />
      <circle className="kd-inset" cx={450} cy={236} r={6} />
      <circle className="kd-raised" cx={540} cy={208} r={30} />
      <circle className="kd-inset" cx={540} cy={208} r={11} />
      <CentreLine x1={190} x2={470} y={236} />

      <Lbl x={256} y={318}>AUX MOTOR</Lbl>
      <Lbl x={327} y={194}>BRAKE</Lbl>
      <Lbl x={372} y={294}>CLUTCH</Lbl>
      <Lbl x={505} y={334}>MAIN GEARBOX · AUX INPUT</Lbl>
    </g>
  );
}

function SupportStation({ n }: { n: 1 | 2 | 3 }) {
  const at = n === 1 ? "11 m" : n === 2 ? "39 m" : "60 m";
  const roller = (y: number, top: boolean) => (
    <g>
      <line className="kd-line" x1={300} x2={500} y1={y} y2={y} />
      <rect className="kd-raised" x={340} y={y - 14} width={120} height={28} rx={4} />
      {[352, 364, 436, 448].map((x) => (
        <line key={x} className="kd-hair" x1={x} x2={x} y1={y - 14} y2={y + 14} />
      ))}
      {[286, 482].map((x) => (
        <g key={x}>
          <rect className="kd-body" x={x} y={y - 22} width={32} height={44} rx={3} />
          <circle className="kd-inset" cx={x + 16} cy={y} r={6} />
          <Bolt x={x + 6} y={top ? y - 16 : y + 16} r={1.8} />
          <Bolt x={x + 26} y={top ? y - 16 : y + 16} r={1.8} />
        </g>
      ))}
      <Lbl x={302} y={top ? y - 30 : y + 40}>A</Lbl>
      <Lbl x={498} y={top ? y - 30 : y + 40}>B</Lbl>
    </g>
  );

  return (
    <g>
      {/* Shell in plan with break lines at both ends */}
      <rect className="kd-body" x={150} y={164} width={500} height={52} />
      <path className="kd-line" d="M 150 164 l 6 13 l -6 13 l 6 13 l -6 13" />
      <path className="kd-line" d="M 650 164 l -6 13 l 6 13 l -6 13 l 6 13" />
      <CentreLine x1={140} x2={660} y={190} />

      {/* Tyre */}
      <rect className="kd-raised" x={380} y={116} width={40} height={148} rx={3} />
      <line className="kd-hair" x1={387} x2={387} y1={116} y2={264} />
      <line className="kd-hair" x1={413} x2={413} y1={116} y2={264} />

      {n === 2 && (
        <g>
          <circle className="kd-raised" cx={438} cy={140} r={12} />
          <circle className="kd-inset" cx={438} cy={140} r={4} />
          <Lbl x={456} y={144} a="start">THRUST ROLLER</Lbl>
        </g>
      )}

      {roller(98, true)}
      {roller(282, false)}

      <Lbl x={400} y={68}>LEFT ROLLER</Lbl>
      <Lbl x={400} y={318}>RIGHT ROLLER</Lbl>
      <Lbl x={210} y={194}>SHELL</Lbl>
      <Arrow pts={[[236, 348], [196, 348]]} />
      <Lbl x={242} y={351} a="start">INLET</Lbl>
      <Arrow pts={[[564, 348], [604, 348]]} />
      <Lbl x={558} y={351} a="end">OUTLET</Lbl>
      <Lbl x={400} y={351}>TYRE {n} · {at}</Lbl>
    </g>
  );
}

function Thrust() {
  return (
    <g>
      {/* Shell (sloped), tyre 2 */}
      <g transform="rotate(-2 400 70)">
        <rect className="kd-body" x={150} y={40} width={440} height={60} />
        <path className="kd-line" d="M 590 40 l -6 12 l 6 12 l -6 12 l 6 12 l -6 12" />
        <CentreLine x1={140} x2={600} y={70} />
        <rect className="kd-raised" x={330} y={24} width={34} height={92} rx={3} />
      </g>

      {/* Support roller under the tyre */}
      <circle className="kd-body" cx={346} cy={140} r={20} />
      <circle className="kd-inset" cx={346} cy={140} r={6} />
      <rect className="kd-body" x={310} y={160} width={72} height={28} rx={3} />
      <Bolt x={320} y={180} />
      <Bolt x={372} y={180} />

      {/* Thrust roller + hydraulic cylinder + LVDT + limit switches */}
      <rect className="kd-raised" x={366} y={104} width={22} height={50} rx={4} />
      <rect className="kd-body" x={388} y={142} width={14} height={10} />
      <rect className="kd-body" x={402} y={136} width={120} height={22} rx={4} />
      <line className="kd-line" x1={430} x2={430} y1={136} y2={158} />
      <circle className="kd-raised" cx={530} cy={147} r={8} />
      <rect className="kd-raised" x={420} y={122} width={100} height={10} rx={2} />
      <rect className="kd-inset" x={392} y={166} width={10} height={10} rx={1} />
      <rect className="kd-inset" x={506} y={166} width={10} height={10} rx={1} />

      {/* HPU */}
      <rect className="kd-body" x={440} y={230} width={120} height={64} rx={4} />
      <circle className="kd-raised" cx={472} cy={262} r={14} />
      <circle className="kd-inset" cx={472} cy={262} r={5} />
      <circle className="kd-inset" cx={548} cy={252} r={7} />
      <Fins x1={500} x2={532} y1={244} y2={284} step={8} />
      <path className="kd-line" d="M 520 230 L 520 200 L 500 200 L 500 158" />

      <Lbl x={240} y={74}>SHELL · SLOPE 3.5 %</Lbl>
      <Lbl x={394} y={114} a="start">THRUST ROLLER</Lbl>
      <Lbl x={540} y={131} a="start">LVDT</Lbl>
      <Lbl x={454} y={192}>LIMIT SWITCHES</Lbl>
      <Lbl x={346} y={206}>TYRE 2 · ROLLER</Lbl>
      <Lbl x={500} y={312}>HPU · 7.5 kW · 40–120 bar</Lbl>
    </g>
  );
}

/** Axial travel scale drawn under the thrust diagram. */
function AxialScale({ value }: { value?: number }) {
  const x0 = 200;
  const w = 210;
  const y = 300;
  const sx = (v: number) => x0 + ((Math.max(-50, Math.min(50, v)) + 50) / 100) * w;
  return (
    <g>
      <line className="kd-line" x1={x0} x2={x0 + w} y1={y} y2={y} />
      <line x1={sx(-50)} x2={sx(-40)} y1={y + 3} y2={y + 3} stroke="var(--status-danger)" strokeWidth={2} opacity={0.6} />
      <line x1={sx(-40)} x2={sx(-30)} y1={y + 3} y2={y + 3} stroke="var(--status-warning)" strokeWidth={2} opacity={0.6} />
      <line x1={sx(30)} x2={sx(40)} y1={y + 3} y2={y + 3} stroke="var(--status-warning)" strokeWidth={2} opacity={0.6} />
      <line x1={sx(40)} x2={sx(50)} y1={y + 3} y2={y + 3} stroke="var(--status-danger)" strokeWidth={2} opacity={0.6} />
      {[-50, -25, 0, 25, 50].map((t) => (
        <g key={t}>
          <line className="kd-line" x1={sx(t)} x2={sx(t)} y1={y - 4} y2={y} />
          <text className="kd-tick" x={sx(t)} y={y + 16} textAnchor="middle">
            {t > 0 ? `+${t}` : t}
          </text>
        </g>
      ))}
      {value !== undefined && <path d={`M ${sx(value)} ${y - 2} l -4 -7 h 8 Z`} fill="var(--kd-ink)" />}
      <Lbl x={x0 + w / 2} y={y + 36}>AXIAL TRAVEL · mm</Lbl>
    </g>
  );
}

function ShellRefractory() {
  const c = { x: 400, y: 210 };
  const joints: React.ReactNode[] = [];
  for (let a = 0; a < 360; a += 12) {
    const r = (a * Math.PI) / 180;
    joints.push(
      <line key={a} className="kd-hair" x1={f(c.x + 90 * Math.cos(r))} y1={f(c.y + 90 * Math.sin(r))} x2={f(c.x + 112 * Math.cos(r))} y2={f(c.y + 112 * Math.sin(r))} />,
    );
  }
  const at = (r: number, deg: number) => [f(c.x + r * Math.cos((deg * Math.PI) / 180)), f(c.y + r * Math.sin((deg * Math.PI) / 180))] as const;
  const [ax, ay] = at(134, -150);
  const [bx, by] = at(134, -115);
  return (
    <g>
      <circle className="kd-raised" cx={c.x} cy={c.y} r={120} />
      <circle className="kd-body" cx={c.x} cy={c.y} r={112} />
      {joints}
      <circle className="kd-line kd-dash" cx={c.x} cy={c.y} r={90} />
      <circle className="kd-inset" cx={c.x} cy={c.y} r={80} />
      <CentreLine x1={300} x2={500} y={c.y} />
      <line className="kd-hair kd-centre" x1={c.x} x2={c.x} y1={110} y2={310} />

      {/* Rotation */}
      <path className="kd-flow" d={`M ${ax} ${ay} A 134 134 0 0 1 ${bx} ${by}`} />
      <Arrow pts={[[bx - 4, by - 2], [bx, by]]} />
      <Lbl x={ax - 6} y={ay - 8} a="end">3.8 rpm</Lbl>

      {/* Scanner */}
      <rect className="kd-raised" x={540} y={40} width={54} height={24} rx={3} />
      <circle className="kd-inset" cx={552} cy={52} r={5} />
      <line className="kd-hair kd-dash" x1={552} y1={64} x2={at(121, -64)[0]} y2={at(121, -64)[1]} />
      <line className="kd-hair kd-dash" x1={552} y1={64} x2={at(121, -18)[0]} y2={at(121, -18)[1]} />
      <Lbl x={567} y={30}>IR SCANNER</Lbl>

      {/* Ring callouts (bottom right) */}
      {(
        [
          [120, "STEEL SHELL · 25–40 mm", 284],
          [101, "REFRACTORY · ≈ 200 mm", 304],
          [85, "COATING", 324],
        ] as const
      ).map(([r, text, y]) => {
        const [px, py] = at(r, 40);
        return (
          <g key={text}>
            <path className="kd-hair" d={`M ${px} ${py} L ${540} ${y} L ${552} ${y}`} />
            <circle className="kd-bolt" cx={px} cy={py} r={1.8} />
            <Lbl x={558} y={y + 3} a="start">
              {text}
            </Lbl>
          </g>
        );
      })}
      <Lbl x={400} y={358}>SECTION THROUGH THE SHELL · BURNING ZONE 40–66 m</Lbl>
    </g>
  );
}

function InletSeal() {
  return (
    <g>
      {/* Inlet housing (fixed) */}
      <rect className="kd-body" x={200} y={70} width={120} height={220} rx={4} />
      <Brick x={306} y={90} w={14} h={180} />
      <polygon className="kd-raised" points="220,290 300,290 282,330 238,330" />
      {/* Gas probe + thermocouple */}
      <rect className="kd-raised" x={180} y={146} width={100} height={8} rx={2} />
      <rect className="kd-raised" x={180} y={227} width={82} height={6} rx={2} />

      {/* Rotating shell */}
      <rect className="kd-raised" x={352} y={110} width={258} height={140} />
      <path className="kd-line" d="M 610 110 l -6 14 l 6 14 l -6 14 l 6 14 l -6 14 l 6 14 l -6 14 l 6 14 l -6 14 l 6 14" />
      <CentreLine x1={340} x2={620} y={180} />

      {/* Lamella seal top + bottom */}
      <Lamella x={318} y={92} w={50} h={16} />
      <Lamella x={318} y={252} w={50} h={16} flip />

      <Arrow pts={[[392, 60], [352, 92]]} dashed />
      <Arrow pts={[[392, 300], [352, 268]]} dashed />
      <Lbl x={398} y={58} a="start">FALSE AIR</Lbl>

      <Lbl x={260} y={58}>INLET HOUSING · FIXED</Lbl>
      <Lbl x={260} y={348}>SPILLAGE</Lbl>
      <Lbl x={480} y={184}>ROTATING SHELL</Lbl>
      <Lbl x={480} y={330}>LAMELLA SEAL</Lbl>
    </g>
  );
}

function OutletSeal() {
  return (
    <g>
      {/* Rotating shell */}
      <rect className="kd-raised" x={180} y={110} width={300} height={140} />
      <path className="kd-line" d="M 180 110 l 6 14 l -6 14 l 6 14 l -6 14 l 6 14 l -6 14 l 6 14 l -6 14 l 6 14 l -6 14" />
      <CentreLine x1={170} x2={600} y={180} />

      <Lamella x={470} y={92} w={50} h={16} />
      <Lamella x={470} y={252} w={50} h={16} flip />

      {/* Hood (fixed) */}
      <rect className="kd-body" x={510} y={58} width={110} height={250} rx={4} />
      <Brick x={510} y={76} w={12} h={214} />
      <rect className="kd-raised" x={540} y={172} width={80} height={16} rx={2} />
      <line className="kd-line" x1={590} x2={590} y1={58} y2={44} />
      <circle className="kd-bolt" cx={590} cy={42} r={3} />

      {/* Seal cooling fan */}
      <circle className="kd-raised" cx={420} cy={318} r={18} />
      {[0, 90, 180, 270].map((d) => {
        const r = ((d + 30) * Math.PI) / 180;
        return <line key={d} className="kd-line" x1={420} y1={318} x2={f(420 + 13 * Math.cos(r))} y2={f(318 + 13 * Math.sin(r))} />;
      })}
      <circle className="kd-inset" cx={420} cy={318} r={4} />
      <Arrow pts={[[436, 306], [480, 274]]} dashed />

      <Lbl x={330} y={184}>ROTATING SHELL</Lbl>
      <Lbl x={565} y={330}>KILN HOOD · FIXED</Lbl>
      <Lbl x={420} y={354}>SEAL COOLING FAN</Lbl>
      <Lbl x={580} y={204}>BURNER</Lbl>
    </g>
  );
}

function KilnInlet() {
  return (
    <g>
      {/* Riser */}
      <rect className="kd-body" x={245} y={30} width={80} height={120} />
      <Arrow pts={[[285, 130], [285, 50]]} dashed />
      <Lbl x={285} y={22}>RISER · TO CALCINER</Lbl>

      {/* Meal chute from C5 */}
      <polygon className="kd-raised" points="420,34 434,46 342,156 328,144" />
      <Lbl x={440} y={40} a="start">MEAL FROM C5</Lbl>

      {/* Inlet chamber + kiln shell */}
      <rect className="kd-body" x={220} y={150} width={130} height={150} rx={4} />
      <Brick x={226} y={156} w={10} h={138} />
      <rect className="kd-raised" x={358} y={170} width={252} height={100} />
      <path className="kd-line" d="M 610 170 l -6 12.5 l 6 12.5 l -6 12.5 l 6 12.5 l -6 12.5 l 6 12.5 l -6 12.5 l 6 12.5" />
      <CentreLine x1={340} x2={620} y={220} />
      <Lamella x={348} y={162} w={14} h={10} />
      <Lamella x={348} y={268} w={14} h={10} flip />

      {/* Gas probe, sample line, analyser */}
      <rect className="kd-raised" x={196} y={196} width={78} height={6} rx={2} />
      <path className="kd-line kd-dash" d="M 200 202 L 200 336 L 236 336" />
      <rect className="kd-raised" x={236} y={322} width={72} height={28} rx={3} />
      <rect className="kd-inset" x={246} y={330} width={30} height={10} rx={1} />

      {/* Thermocouple + draft tap */}
      <rect className="kd-raised" x={300} y={254} width={6} height={50} rx={2} />
      <line className="kd-line" x1={336} x2={336} y1={150} y2={130} />
      <circle className="kd-bolt" cx={336} cy={128} r={3} />

      <Lbl x={484} y={224}>KILN SHELL</Lbl>
      <Lbl x={272} y={364}>GAS ANALYSER</Lbl>
      <Lbl x={285} y={318} a="middle">INLET CHAMBER</Lbl>
    </g>
  );
}

function FeedFuel() {
  const bin = (x: number, y: number, label: string) => (
    <g>
      <polygon className="kd-body" points={`${x},${y} ${x + 100},${y} ${x + 100},${y + 50} ${x + 70},${y + 90} ${x + 30},${y + 90} ${x},${y + 50}`} />
      <line className="kd-line kd-dash" x1={x + 4} x2={x + 96} y1={y + 22} y2={y + 22} />
      <rect className="kd-raised" x={x + 36} y={y + 90} width={28} height={18} rx={2} />
      <circle className="kd-inset" cx={x + 50} cy={y + 99} r={5} />
      <rect className="kd-raised" x={x + 26} y={y + 120} width={48} height={40} rx={3} />
      <line className="kd-line" x1={x + 34} y1={y + 128} x2={x + 66} y2={y + 152} />
      <line className="kd-line" x1={x + 50} x2={x + 50} y1={y + 108} y2={y + 120} />
      <Lbl x={x + 50} y={y - 10}>{label}</Lbl>
      <Lbl x={x + 86} y={y + 144} a="start">SFM</Lbl>
    </g>
  );
  return (
    <g>
      {bin(200, 60, "KILN FEED BIN")}
      {bin(440, 50, "KILN COAL BIN")}
      <Arrow pts={[[250, 220], [250, 262], [400, 262]]} />
      <Lbl x={406} y={265} a="start">TO PREHEATER · KILN</Lbl>
      <Arrow pts={[[490, 210], [490, 300], [600, 300]]} />
      <Lbl x={594} y={290} a="end">TO BURNER</Lbl>
      <Lbl x={400} y={350}>WITNESSES · FEED: TORQUE, O₂ · FUEL: BURNING ZONE, INLET TEMPERATURE</Lbl>
    </g>
  );
}

function BurnerHood() {
  return (
    <g>
      {/* Kiln outlet end */}
      <rect className="kd-raised" x={190} y={110} width={250} height={140} />
      <path className="kd-line" d="M 190 110 l 6 14 l -6 14 l 6 14 l -6 14 l 6 14 l -6 14 l 6 14 l -6 14 l 6 14 l -6 14" />
      <rect className="kd-inset" x={196} y={122} width={244} height={116} />
      <Flame x0={226} x1={380} cy={180} h={42} />

      {/* Hood + burner pipe */}
      <rect className="kd-body" x={440} y={50} width={140} height={270} rx={4} />
      <Brick x={440} y={70} w={12} h={230} />
      <rect className="kd-raised" x={380} y={172} width={230} height={16} rx={2} />
      <line className="kd-hair" x1={380} x2={610} y1={180} y2={180} />

      {/* Pyrometer + sight line, pressure tap */}
      <rect className="kd-raised" x={520} y={24} width={50} height={20} rx={3} />
      <circle className="kd-inset" cx={530} cy={34} r={4} />
      <line className="kd-hair kd-dash" x1={530} y1={44} x2={300} y2={176} />
      <line className="kd-line" x1={470} x2={470} y1={50} y2={38} />
      <circle className="kd-bolt" cx={470} cy={34} r={3} />

      <Arrow pts={[[510, 320], [510, 352]]} />
      <Lbl x={516} y={364} a="start">TO COOLER</Lbl>
      <Lbl x={300} y={272}>BURNING ZONE</Lbl>
      <Lbl x={515} y={208}>MULTI-CHANNEL BURNER</Lbl>
      <Lbl x={545} y={16}>PYROMETER</Lbl>
    </g>
  );
}

function renderDrawing(id: KilnSubAssemblyId, readings?: Record<string, KilnReading>) {
  switch (id) {
    case "main-motor":
      return <MainMotor />;
    case "gearbox":
      return <Gearbox />;
    case "pinion-gear":
      return <PinionGirthGear />;
    case "lubrication":
      return <Lubrication />;
    case "auxiliary-drive":
      return <AuxiliaryDrive />;
    case "station-1":
      return <SupportStation n={1} />;
    case "station-2":
      return <SupportStation n={2} />;
    case "station-3":
      return <SupportStation n={3} />;
    case "thrust": {
      const v = Number(readings?.["POS-KLN-01"]?.value);
      return (
        <>
          <Thrust />
          <AxialScale value={Number.isFinite(v) ? v : undefined} />
        </>
      );
    }
    case "shell-refractory":
      return <ShellRefractory />;
    case "inlet-seal":
      return <InletSeal />;
    case "outlet-seal":
      return <OutletSeal />;
    case "kiln-inlet":
      return <KilnInlet />;
    case "feed-fuel":
      return <FeedFuel />;
    case "burner-hood":
      return <BurnerHood />;
  }
}

export function KilnSubAssemblyDiagram({
  id,
  readings,
  selectedTag,
  onSelectTag,
  className,
}: {
  id: KilnSubAssemblyId;
  readings?: Record<string, KilnReading>;
  selectedTag?: string | null;
  onSelectTag?: (tag: string) => void;
  className?: string;
}) {
  const sub = KILN_SUB_ASSEMBLIES.find((s) => s.id === id);
  if (!sub) return null;
  return (
    <div className={`kd-canvas ${className ?? ""}`.trim()}>
      <svg
        className="kd-svg"
        viewBox={`0 0 ${SUB_W} ${SUB_H}`}
        role={onSelectTag ? "group" : "img"}
        aria-label={`${sub.name} (${sub.machine}) with ${sub.points.length} sensors`}
      >
        {renderDrawing(id, readings)}
        {sub.points.map((p) => (
          <PointMark
            key={p.p}
            point={p}
            reading={readings?.[p.tag]}
            selected={selectedTag === p.tag}
            onSelect={onSelectTag}
          />
        ))}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Overview: KLN-01 elevation with all 15 sub-assemblies               */
/* ------------------------------------------------------------------ */

const OV_W = 1200;
const OV_H = 440;
const SHELL_X0 = 180;
const SHELL_X1 = 1040;
const mx = (m: number) => SHELL_X0 + (m / 74) * (SHELL_X1 - SHELL_X0);

function Region({
  id,
  label,
  lx,
  ly,
  a = "middle",
  status,
  selected,
  onSelect,
  children,
}: {
  id: KilnSubAssemblyId;
  label: string;
  lx: number;
  ly: number;
  a?: "start" | "middle" | "end";
  status?: KilnStatus;
  selected: boolean;
  onSelect?: (id: KilnSubAssemblyId) => void;
  children: React.ReactNode;
}) {
  const interactive = Boolean(onSelect);
  return (
    <g
      className={`kd-region${selected ? " is-selected" : ""}${interactive ? " is-interactive" : ""}`}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? selected : undefined}
      aria-label={`${label}${status ? `, ${status}` : ""}`}
      onClick={() => onSelect?.(id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(id);
        }
      }}
    >
      {children}
      <text className="kd-region-label" x={lx} y={ly} textAnchor={a}>
        {status && (
          <tspan fill={STATUS_FILL[status]} className="kd-region-dot">
            ●{" "}
          </tspan>
        )}
        {label}
      </text>
    </g>
  );
}

function StationOverview({ m }: { m: number }) {
  const c = mx(m);
  return (
    <g>
      <rect className="kd-raised" x={c - 12} y={134} width={24} height={102} rx={3} />
      <circle className="kd-body" cx={c} cy={252} r={16} />
      <circle className="kd-inset" cx={c} cy={252} r={5} />
      <rect className="kd-body" x={c - 40} y={262} width={80} height={22} rx={3} />
      <Bolt x={c - 30} y={273} r={2} />
      <Bolt x={c + 30} y={273} r={2} />
      <polygon className="kd-pier" points={`${c - 44},284 ${c + 44},284 ${c + 52},398 ${c - 52},398`} />
    </g>
  );
}

export function KilnOverviewDiagram({
  status,
  selected,
  onSelect,
  className,
}: {
  status?: Partial<Record<KilnSubAssemblyId, KilnStatus>>;
  selected?: KilnSubAssemblyId | null;
  onSelect?: (id: KilnSubAssemblyId) => void;
  className?: string;
}) {
  const r = (id: KilnSubAssemblyId) => ({ id, status: status?.[id], selected: selected === id, onSelect });
  const t1 = mx(11);
  const gg = mx(17);
  const t2 = mx(39);
  const t3 = mx(60);

  const seams: React.ReactNode[] = [];
  for (let m = 6; m < 74; m += 6) {
    seams.push(<line key={m} className="kd-hair" x1={mx(m)} x2={mx(m)} y1={150} y2={220} />);
  }

  return (
    <div className={`kd-canvas ${className ?? ""}`.trim()}>
      <svg className="kd-svg" viewBox={`0 0 ${OV_W} ${OV_H}`} role={onSelect ? "group" : "img"} aria-label="Rotary kiln KLN-01 with its 15 monitored sub-assemblies">
        {/* Zone ruler */}
        {(
          [
            [0, 15, "INLET · 0–15 m"],
            [15, 40, "TRANSITION · 15–40 m"],
            [40, 66, "BURNING · 40–66 m"],
            [66, 74, "OUTLET"],
          ] as const
        ).map(([a, b, text]) => (
          <g key={text}>
            <line className="kd-hair" x1={mx(a)} x2={mx(a)} y1={64} y2={80} />
            <Lbl x={(mx(a) + mx(b)) / 2} y={76} cls="kd-heading">
              {text}
            </Lbl>
          </g>
        ))}
        <line className="kd-hair" x1={mx(74)} x2={mx(74)} y1={64} y2={80} />

        <line className="kd-hair" x1={60} x2={1180} y1={398} y2={398} />

        {/* Shell */}
        <Region {...r("shell-refractory")} label="SHELL & REFRACTORY" lx={mx(28)} ly={189}>
          <rect className="kd-body" x={SHELL_X0} y={150} width={SHELL_X1 - SHELL_X0} height={70} />
          {seams}
          <rect className="kd-raised" x={mx(32.5)} y={30} width={40} height={18} rx={3} />
          <circle className="kd-inset" cx={mx(32.5) + 10} cy={39} r={3.5} />
          <line className="kd-hair kd-dash" x1={mx(32.5) + 10} y1={48} x2={mx(14)} y2={150} />
          <line className="kd-hair kd-dash" x1={mx(32.5) + 10} y1={48} x2={mx(66)} y2={150} />
          <Lbl x={mx(32.5) + 50} y={43} a="start">SHELL SCANNER</Lbl>
        </Region>

        {/* Inlet */}
        <Region {...r("kiln-inlet")} label="KILN INLET" lx={140} ly={350}>
          <rect className="kd-body" x={122} y={40} width={44} height={86} />
          <rect className="kd-body" x={104} y={120} width={72} height={180} rx={3} />
          <polygon className="kd-raised" points="122,300 158,300 150,330 130,330" />
          <rect className="kd-raised" x={80} y={204} width={36} height={5} rx={2} />
          <Lbl x={144} y={30}>TO CALCINER</Lbl>
        </Region>

        <Region {...r("feed-fuel")} label="FEED & FUEL" lx={232} ly={104} a="start">
          <polygon className="kd-raised" points="222,96 232,104 174,150 166,142" />
          <Arrow pts={[[1188, 166], [1160, 166]]} />
          <Lbl x={1188} y={156} a="end">COAL</Lbl>
        </Region>

        <Region {...r("inlet-seal")} label="INLET SEAL" lx={200} ly={246} a="start">
          <Lamella x={174} y={142} w={14} h={10} />
          <Lamella x={174} y={218} w={14} h={10} flip />
          <rect className="kd-raised" x={176} y={150} width={10} height={70} rx={2} />
        </Region>

        {/* Support */}
        <Region {...r("station-1")} label="STATION 1" lx={t1} ly={420}>
          <StationOverview m={11} />
        </Region>
        <Region {...r("station-2")} label="STATION 2" lx={t2} ly={420}>
          <StationOverview m={39} />
        </Region>
        <Region {...r("station-3")} label="STATION 3" lx={t3} ly={420}>
          <StationOverview m={60} />
        </Region>
        <Region {...r("thrust")} label="THRUST" lx={t2 + 66} ly={240} a="start">
          <rect className="kd-raised" x={t2 + 18} y={244} width={12} height={20} rx={2} />
          <rect className="kd-body" x={t2 + 30} y={248} width={44} height={12} rx={3} />
          <rect className="kd-raised" x={t2 + 40} y={243} width={26} height={5} rx={1} />
        </Region>

        {/* Drive train */}
        <Region {...r("pinion-gear")} label="GIRTH GEAR" lx={gg} ly={124}>
          <rect className="kd-raised" x={gg - 10} y={130} width={20} height={110} rx={2} />
          {[134, 140, 146, 224, 230, 236].map((y) => (
            <line key={y} className="kd-line" x1={gg - 10} x2={gg + 10} y1={y} y2={y} />
          ))}
          <circle className="kd-body" cx={gg} cy={256} r={14} />
          <circle className="kd-inset" cx={gg} cy={256} r={5} />
        </Region>
        <Region {...r("gearbox")} label="GEARBOX" lx={gg + 48} ly={342}>
          <line className="kd-line" x1={gg + 14} x2={gg + 22} y1={256} y2={256} />
          <rect className="kd-body" x={gg + 22} y={236} width={70} height={76} rx={6} />
          <rect className="kd-raised" x={gg + 19} y={272} width={76} height={5} rx={1} />
          <circle className="kd-inset" cx={gg + 40} cy={256} r={7} />
        </Region>
        <Region {...r("main-motor")} label="MAIN MOTOR" lx={gg + 138} ly={342}>
          <line className="kd-line" x1={gg + 92} x2={gg + 106} y1={290} y2={290} />
          <rect className="kd-body" x={gg + 106} y={264} width={64} height={48} rx={7} />
          <Fins x1={gg + 114} x2={gg + 162} y1={274} y2={304} step={8} />
        </Region>
        <Region {...r("auxiliary-drive")} label="AUX" lx={gg + 190} ly={272}>
          <rect className="kd-raised" x={gg + 170} y={284} width={6} height={12} />
          <rect className="kd-body" x={gg + 176} y={278} width={28} height={34} rx={4} />
        </Region>
        <rect className="kd-body" x={gg + 16} y={312} width={196} height={10} rx={2} />
        <Region {...r("lubrication")} label="LUBRICATION" lx={gg + 56} ly={392}>
          <rect className="kd-body" x={gg + 30} y={344} width={52} height={32} rx={3} />
          <line className="kd-line kd-dash" x1={gg + 34} x2={gg + 78} y1={352} y2={352} />
          <path className="kd-line kd-dash" d={`M ${gg + 56} 344 L ${gg + 56} 322`} />
        </Region>

        {/* Outlet */}
        <Region {...r("outlet-seal")} label="OUTLET SEAL" lx={1012} ly={258} a="end">
          <Lamella x={SHELL_X1 - 6} y={142} w={14} h={10} />
          <Lamella x={SHELL_X1 - 6} y={218} w={14} h={10} flip />
          <rect className="kd-raised" x={SHELL_X1 - 4} y={150} width={10} height={70} rx={2} />
          <circle className="kd-raised" cx={1014} cy={300} r={13} />
          <circle className="kd-inset" cx={1014} cy={300} r={4} />
          <line className="kd-hair kd-dash" x1={1024} y1={290} x2={1040} y2={232} />
        </Region>
        <Region {...r("burner-hood")} label="BURNER & HOOD" lx={1084} ly={376}>
          <rect className="kd-body" x={1046} y={100} width={76} height={232} rx={3} />
          <rect className="kd-raised" x={1010} y={178} width={150} height={12} rx={2} />
          <rect className="kd-raised" x={1070} y={80} width={34} height={16} rx={2} />
          <line className="kd-hair kd-dash" x1={1074} y1={96} x2={mx(56)} y2={185} />
          <Arrow pts={[[1084, 332], [1084, 356]]} />
          <Lbl x={1087} y={72}>PYROMETER</Lbl>
        </Region>
      </svg>
    </div>
  );
}
