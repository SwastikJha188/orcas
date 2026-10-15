/**
 * Parts shared by the BRN-01 (main burner) line sheets B-0 … B-4: coal pipe
 * with the brass coal stream, butterfly valve, instrument tap boss,
 * handwheel, flanged base frame, rounded duct elbow. Kit paints only.
 */
import React from "react";
import { Bolt, MX, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Pipe, type Pt } from "../../drawings/clk-parts";

/**
 * Pneumatic coal line: metal pipe with a dashed brass coal stream on its axis.
 * Dashes are rects (not a stroke) so the brass gradient has a real bounding box
 * on straight runs.
 */
export function CoalPipe({ pts, w = 14 }: { pts: Pt[]; w?: number }) {
  const t = Math.max(2, w * 0.24);
  const dash = w * 0.55;
  const step = dash + w * 0.35;
  const marks: React.ReactNode[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const len = Math.hypot(bx - ax, by - ay);
    const ux = (bx - ax) / len;
    const uy = (by - ay) / len;
    for (let s = 2; s + dash <= len - 1; s += step) {
      const x = ax + ux * s;
      const y = ay + uy * s;
      const horiz = Math.abs(ux) > Math.abs(uy);
      marks.push(
        <rect
          key={`${i}-${s}`}
          x={horiz ? Math.min(x, x + ux * dash) : x - t / 2}
          y={horiz ? y - t / 2 : Math.min(y, y + uy * dash)}
          width={horiz ? dash : t}
          height={horiz ? t : dash}
          rx={t / 2}
          {...PAINT.material}
        />,
      );
    }
  }
  return (
    <g aria-hidden="true">
      <Pipe pts={pts} w={w} />
      {marks}
    </g>
  );
}

/** Butterfly valve on a pipe run: wafer body, disc and lever handle. */
export function ButterflyValve({ x, y, w, vertical = false }: { x: number; y: number; w: number; vertical?: boolean }) {
  const t = 9;
  const l = w + 8;
  return (
    <g aria-hidden="true" transform={vertical ? `rotate(90 ${x} ${y})` : undefined}>
      <rect x={x - t / 2} y={y - l / 2} width={t} height={l} rx={2} {...PAINT.raised} />
      <line x1={x - 2} y1={y + l / 2 - 4} x2={x + 2} y2={y - l / 2 + 4} stroke={MX.edge} strokeWidth={1.2} />
      <rect x={x - 1.5} y={y - l / 2 - 7} width={3} height={7} {...PAINT.shaft} />
      <rect x={x - 1} y={y - l / 2 - 9} width={16} height={3.2} rx={1.4} {...PAINT.shaft} />
      <circle cx={x} cy={y - l / 2 - 7.4} r={2.2} fill={MX.deep} stroke={MX.fine} strokeWidth={0.8} />
    </g>
  );
}

/** Welded instrument tap boss on a pipe wall. */
export function TapBoss({ x, y, s = 9 }: { x: number; y: number; s?: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x - s / 2} y={y - s / 2} width={s} height={s} rx={2} {...PAINT.raised} />
      <circle cx={x} cy={y} r={s * 0.22} fill={MX.deep} />
    </g>
  );
}

/** Handwheel seen edge-on on a vertical spindle face (x = wheel plane). */
export function HandwheelEdge({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g aria-hidden="true">
      <ellipse cx={x} cy={y} rx={4} ry={r} {...PAINT.raised} />
      <ellipse cx={x} cy={y} rx={1.6} ry={r - 3} fill="none" stroke={MX.fine} strokeWidth={0.8} />
      <rect x={x - 1.5} y={y - r - 2} width={3} height={4} rx={1} {...PAINT.shaft} />
      <circle cx={x + 4} cy={y - r * 0.55} r={2} {...PAINT.shaft} />
    </g>
  );
}

/** Fabricated steel base frame (channel with anchor bolts) on a concrete plinth down to `ground`. */
export function BaseFrame({ x, y, w, h = 14, ground, bolts = 6 }: { x: number; y: number; w: number; h?: number; ground: number; bolts?: number }) {
  return (
    <g aria-hidden="true">
      {ground > y + h + 2 && <rect x={x + 10} y={y + h} width={w - 20} height={ground - y - h} rx={1.5} fill={MX.flatBody} stroke={MX.fine} strokeWidth={MX.wFine} />}
      <rect x={x} y={y} width={w} height={h} rx={2} {...PAINT.body} />
      <line x1={x + 4} x2={x + w - 4} y1={y + 3.5} y2={y + 3.5} stroke={MX.fine} strokeWidth={0.8} />
      {Array.from({ length: bolts }).map((_, i) => (
        <Bolt key={i} x={x + 12 + (i * (w - 24)) / Math.max(1, bolts - 1)} y={y + h * 0.62} r={1.7} />
      ))}
    </g>
  );
}

/**
 * Rounded rectangular duct: vertical leg up from (x, y0) to the bend, then
 * horizontal to x1 at `yh`. `d` is the duct depth; `rc` the centre-line radius.
 */
export function DuctElbow({ x, y0, yh, x1, d, rc }: { x: number; y0: number; yh: number; x1: number; d: number; rc: number }) {
  const h = d / 2;
  const ro = rc + h;
  const ri = Math.max(1, rc - h);
  const cx = x + rc;
  const cy = yh + rc;
  const elbow = `M ${x - h} ${cy} A ${ro} ${ro} 0 0 1 ${cx} ${yh - h} L ${cx} ${yh + h} A ${ri} ${ri} 0 0 0 ${x + h} ${cy} Z`;
  return (
    <g aria-hidden="true">
      <rect x={x - h} y={cy} width={d} height={y0 - cy} {...PAINT.cylinderV} />
      <rect x={cx} y={yh - h} width={x1 - cx} height={d} {...PAINT.cylinder} />
      <path d={elbow} {...PAINT.body} />
      <path d={`M ${x} ${cy} A ${rc} ${rc} 0 0 1 ${cx} ${yh}`} fill="none" stroke={MX.fine} strokeWidth={0.8} strokeDasharray="4 3" />
      <rect x={x - h - 4} y={cy - 2.5} width={d + 8} height={5} rx={1.5} {...PAINT.raised} />
      <rect x={cx - 2.5} y={yh - h - 4} width={5} height={d + 8} rx={1.5} {...PAINT.raised} />
    </g>
  );
}

/** Duct flange across a straight run with a bolt at each end. */
export function DuctFlange({ x, y, d, vertical = false }: { x: number; y: number; d: number; vertical?: boolean }) {
  const l = d + 8;
  return vertical ? (
    <g aria-hidden="true">
      <rect x={x - l / 2} y={y - 2.5} width={l} height={5} rx={1.5} {...PAINT.raised} />
    </g>
  ) : (
    <g aria-hidden="true">
      <rect x={x - 2.5} y={y - l / 2} width={5} height={l} rx={1.5} {...PAINT.raised} />
      <Bolt x={x} y={y - l / 2 + 2.5} r={1.1} />
      <Bolt x={x} y={y + l / 2 - 2.5} r={1.1} />
    </g>
  );
}
