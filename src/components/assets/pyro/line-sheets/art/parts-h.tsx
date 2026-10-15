/**
 * Parts for the H sheets (HMR-01 hammer crusher, CSL-01 pan conveyor and
 * clinker silo) and the PYR-0 line overview. Machine kit paints only.
 */
import React from "react";
import { Bolt, MX, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { SideMotor } from "../../sheets/sb-parts";

export type Pt = [number, number];

/**
 * TEFC induction motor in side elevation (fan cowl left, shaft right unless
 * `flip`): finned frame, terminal box with cable gland, lifting eye, rating
 * plate, two bolted feet down to `footY`, and a shaft stub of `shaft` length.
 */
export function DriveMotor({
  x,
  y,
  w,
  h,
  footY,
  flip = false,
  shaft = 0,
  plate = true,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  footY?: number;
  flip?: boolean;
  shaft?: number;
  plate?: boolean;
}) {
  const fw = Math.max(10, w * 0.16);
  const tbx = x + w * 0.35;
  const tbw = w * 0.28;
  const tby = y - h * 0.2;
  const body = (
    <g aria-hidden="true">
      {footY !== undefined &&
        [0.14, 0.86].map((f) => (
          <g key={f}>
            <path d={`M ${x + w * f - fw / 2 + 2} ${y + h - 6} H ${x + w * f + fw / 2 - 2} L ${x + w * f + fw / 2 + 3} ${footY} H ${x + w * f - fw / 2 - 3} Z`} {...PAINT.body} />
            <Bolt x={x + w * f} y={footY - 4} r={Math.min(1.8, fw * 0.12)} />
          </g>
        ))}
      {shaft > 0 && <rect x={x + w + w * 0.1} y={y + h * 0.44} width={shaft} height={h * 0.12} rx={1.5} {...PAINT.shaft} />}
      <SideMotor x={x} y={y} w={w} h={h} />
      {/* lifting eye */}
      <path d={`M ${x + w * 0.76} ${y + 1} v ${-h * 0.08} a ${h * 0.06} ${h * 0.06} 0 0 1 ${h * 0.12} 0 v ${h * 0.08}`} fill="none" stroke={MX.edge} strokeWidth={1.4} />
      {/* cable gland on the terminal box */}
      <rect x={tbx + tbw} y={tby + h * 0.06} width={h * 0.07 + 2} height={h * 0.09} rx={1} {...PAINT.shaft} />
      <Bolt x={tbx + 4} y={tby + 4} r={1.1} />
      <Bolt x={tbx + tbw - 4} y={tby + 4} r={1.1} />
      {plate && <rect x={x + w * 0.66} y={y + h * 0.62} width={w * 0.16} height={h * 0.16} rx={1.5} {...PAINT.recess} />}
    </g>
  );
  return flip ? <g transform={`translate(${2 * x + w} 0) scale(-1 1)`}>{body}</g> : body;
}

/** Split pillow-block bearing housing with cap bolts and a grease nipple. */
export function BearingHousing({ x, y, w, h, split }: { x: number; y: number; w: number; h: number; split: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={Math.min(8, w * 0.15)} {...PAINT.raised} />
      <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} rx={Math.min(5, w * 0.1)} {...PAINT.hair} />
      <line x1={x + 2} x2={x + w - 2} y1={split} y2={split} stroke={MX.edge} strokeWidth={1.2} />
      {[x + 7, x + w - 7].map((bx) => (
        <g key={bx}>
          <Bolt x={bx} y={split - 6} r={1.8} />
          <Bolt x={bx} y={split + 6} r={1.8} />
        </g>
      ))}
      <rect x={x + w / 2 - 2} y={y - 6} width={4} height={6} {...PAINT.shaft} />
      <circle cx={x + w / 2} cy={y - 7} r={2.2} {...PAINT.shaft} />
    </g>
  );
}

/** Neutral flow arrow (hairline with a filled head). */
export function Flow({ x1, y1, x2, y2, head = 6 }: { x1: number; y1: number; x2: number; y2: number; head?: number }) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const p1: Pt = [x2 - head * Math.cos(a - 0.45), y2 - head * Math.sin(a - 0.45)];
  const p2: Pt = [x2 - head * Math.cos(a + 0.45), y2 - head * Math.sin(a + 0.45)];
  return (
    <g aria-hidden="true">
      <line x1={x1} y1={y1} x2={x2 - Math.cos(a) * head * 0.6} y2={y2 - Math.sin(a) * head * 0.6} stroke={MX.label} strokeWidth={1.2} />
      <path d={`M ${p1[0]} ${p1[1]} L ${x2} ${y2} L ${p2[0]} ${p2[1]} Z`} fill={MX.label} stroke={MX.label} strokeWidth={0.8} strokeLinejoin="round" />
    </g>
  );
}

/** Anchored base plate / pier with bolts along it. */
export function Pier({ x, y, w, h, bolts = 2 }: { x: number; y: number; w: number; h: number; bolts?: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={2} {...PAINT.body} />
      <line x1={x + 3} x2={x + w - 3} y1={y + 3} y2={y + 3} {...PAINT.hair} />
      {Array.from({ length: bolts }).map((_, i) => (
        <Bolt key={i} x={bolts === 1 ? x + w / 2 : x + 7 + (i * (w - 14)) / (bolts - 1)} y={y + h / 2 + 1} r={1.7} />
      ))}
    </g>
  );
}

/** Steel column with a bolted base plate, from `y1` down to `y2`. */
export function Column({ x, y1, y2, w = 8 }: { x: number; y1: number; y2: number; w?: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x - w / 2} y={y1} width={w} height={y2 - y1} rx={1.5} {...PAINT.body} />
      <line x1={x} x2={x} y1={y1 + 3} y2={y2 - 6} {...PAINT.hair} />
      <rect x={x - w / 2 - 6} y={y2 - 5} width={w + 12} height={5} rx={1.5} {...PAINT.raised} />
      <Bolt x={x - w / 2 - 2.5} y={y2 - 2.5} r={1.2} />
      <Bolt x={x + w / 2 + 2.5} y={y2 - 2.5} r={1.2} />
    </g>
  );
}

/**
 * Inclined deep-pan conveyor from the tail (x1, y1) to the head (x2, y2):
 * casing, upper strand of overlapping pans carrying clinker, chain rollers,
 * return strand, inspection doors, tail and head sprocket ends.
 */
export function PanConveyor({ x1, y1, x2, y2, d, sprocket, doors = [] }: { x1: number; y1: number; x2: number; y2: number; d: number; sprocket: number; doors?: number[] }) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const a = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  const pan = Math.max(6, d * 0.42);
  const pans = Math.floor((len - 4) / pan);
  const top = -d / 2;
  const roll = Math.max(1.2, d * 0.06);
  return (
    <g transform={`translate(${x1} ${y1}) rotate(${a})`} aria-hidden="true">
      <rect x={-sprocket - 4} y={top} width={len + 2 * sprocket + 8} height={d} rx={d / 2} {...PAINT.body} />
      <rect x={0} y={top + d * 0.12} width={len} height={d * 0.46} rx={2} {...PAINT.recess} />
      {/* clinker in the pans */}
      {Array.from({ length: pans }).map((_, i) => (
        <rect key={`m${i}`} x={2 + i * pan + pan * 0.12} y={top + d * 0.2} width={pan * 0.76} height={d * 0.3} rx={1.2} fill={MX.material} />
      ))}
      {/* pan lips */}
      {Array.from({ length: pans + 1 }).map((_, i) => (
        <line key={`p${i}`} x1={2 + i * pan} x2={2 + i * pan} y1={top + d * 0.14} y2={top + d * 0.56} stroke={MX.edge} strokeWidth={1} />
      ))}
      {/* chain + rollers under the upper strand */}
      <line x1={0} x2={len} y1={top + d * 0.6} y2={top + d * 0.6} stroke={MX.edge} strokeWidth={1.1} />
      {Array.from({ length: Math.floor(len / (pan * 2)) }).map((_, i) => (
        <circle key={`r${i}`} cx={pan + i * pan * 2} cy={top + d * 0.6} r={roll} {...PAINT.shaft} />
      ))}
      {/* return strand */}
      <line x1={0} x2={len} y1={top + d * 0.8} y2={top + d * 0.8} stroke={MX.fine} strokeWidth={1} strokeDasharray="5 3" />
      {doors.map((s) => (
        <g key={`d${s}`}>
          <rect x={s * len - d * 0.4} y={top + d * 0.66} width={d * 0.8} height={d * 0.26} rx={1.5} {...PAINT.raised} />
        </g>
      ))}
      {/* casing flanges */}
      {Array.from({ length: Math.floor(len / (d * 3)) }).map((_, i) => (
        <line key={`f${i}`} x1={(i + 1) * d * 3} x2={(i + 1) * d * 3} y1={top + 1} y2={top + d * 0.12} stroke={MX.fine} strokeWidth={1} />
      ))}
      {[0, len].map((sx) => (
        <g key={sx}>
          <circle cx={sx} cy={0} r={sprocket} {...PAINT.raised} />
          <circle cx={sx} cy={0} r={sprocket * 0.72} {...PAINT.hair} />
          <circle cx={sx} cy={0} r={sprocket * 0.36} {...PAINT.shaft} />
          <circle cx={sx} cy={0} r={sprocket * 0.12} fill={MX.deep} />
        </g>
      ))}
    </g>
  );
}
