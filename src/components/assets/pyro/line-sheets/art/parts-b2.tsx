/**
 * Parts of the BRN-01 part sheets B-1 … B-4 as drawn on the machine group
 * images (pages 4A / 4B): flow lines with filled heads, the side-view motor
 * of the fan and blower drives, a flexible coupling with its shaft stubs, a
 * fabricated stool, and the coloured caps note. Kit paints and flow tokens only.
 */
import React from "react";
import { Bolt, MX, PAINT } from "@/components/assets/machine-kit/machine-kit";

export type Dir = "left" | "right" | "up" | "down";

/** Filled flow arrowhead, tip at (x, y). */
export function Head({ x, y, dir, color, s = 1 }: { x: number; y: number; dir: Dir; color: string; s?: number }) {
  const l = 11 * s;
  const h = 5.5 * s;
  const d =
    dir === "left"
      ? `M ${x} ${y} L ${x + l} ${y - h} L ${x + l} ${y + h} Z`
      : dir === "right"
        ? `M ${x} ${y} L ${x - l} ${y - h} L ${x - l} ${y + h} Z`
        : dir === "up"
          ? `M ${x} ${y} L ${x - h} ${y + l} L ${x + h} ${y + l} Z`
          : `M ${x} ${y} L ${x - h} ${y - l} L ${x + h} ${y - l} Z`;
  return <path d={d} fill={color} aria-hidden="true" />;
}

/**
 * Flow line along an orthogonal polyline, as rects (not a stroke) so gradient
 * paints such as the brass material get a real bounding box on straight runs.
 */
export function Flow({ pts, color, w = 1.8 }: { pts: Array<[number, number]>; color: string; w?: number }) {
  return (
    <g aria-hidden="true">
      {pts.slice(1).map(([bx, by], i) => {
        const [ax, ay] = pts[i];
        return (
          <rect
            key={i}
            x={Math.min(ax, bx) - w / 2}
            y={Math.min(ay, by) - w / 2}
            width={Math.abs(bx - ax) + w}
            height={Math.abs(by - ay) + w}
            fill={color}
          />
        );
      })}
    </g>
  );
}

/** Grey end-of-line arrow ("to burner"), hairline with an open head. */
export function EndArrow({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  return (
    <g aria-hidden="true">
      <line x1={x1} x2={x2} y1={y} y2={y} stroke={MX.label} strokeWidth={1.2} />
      <path d={`M ${x2 - 9} ${y - 5} L ${x2} ${y} L ${x2 - 9} ${y + 5} Z`} fill={MX.label} />
    </g>
  );
}

/**
 * Side-view induction motor as on the group images, shaft end on the left:
 * finned frame, recessed rating window, terminal box on top, fan cowl on the
 * right, foot strip below. `win` is the window [x, y, w, h].
 */
export function SideMotor({
  x,
  y,
  w,
  h,
  tbox,
  cowl,
  win,
  fins,
  foot,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  tbox: [number, number, number, number];
  cowl: [number, number, number, number];
  win: [number, number, number, number];
  fins: number[];
  foot: [number, number, number, number];
}) {
  return (
    <g aria-hidden="true">
      <rect x={foot[0]} y={foot[1]} width={foot[2]} height={foot[3]} rx={1.5} {...PAINT.raised} />
      <rect x={cowl[0]} y={cowl[1]} width={cowl[2]} height={cowl[3]} rx={Math.min(16, cowl[2] / 2)} {...PAINT.body} />
      {[0.3, 0.5, 0.7].map((f) => (
        <line key={f} x1={cowl[0] + 6} x2={cowl[0] + cowl[2] - 5} y1={cowl[1] + cowl[3] * f} y2={cowl[1] + cowl[3] * f} {...PAINT.hair} />
      ))}
      <rect x={x} y={y} width={w} height={h} rx={14} {...PAINT.body} />
      {fins.map((fy) => (
        <line key={fy} x1={x + 13} x2={x + w - 13} y1={fy} y2={fy} stroke={MX.fine} strokeWidth={MX.wFine} />
      ))}
      <rect x={win[0]} y={win[1]} width={win[2]} height={win[3]} rx={2.5} {...PAINT.recess} />
      <rect x={tbox[0]} y={tbox[1]} width={tbox[2]} height={tbox[3]} rx={3} {...PAINT.body} />
      <rect x={tbox[0] + 5} y={tbox[1] + 4} width={tbox[2] - 10} height={tbox[3] - 8} rx={2} fill="none" stroke={MX.fine} strokeWidth={0.8} />
    </g>
  );
}

/** Flexible coupling with ribbed hubs, between two shaft stubs. */
export function RibCoupling({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={3} {...PAINT.raised} />
      {[0.22, 0.4, 0.58].map((f) => (
        <line key={f} x1={x + w * f} x2={x + w * f} y1={y + 3} y2={y + h - 3} stroke={MX.fine} strokeWidth={1} />
      ))}
    </g>
  );
}

/** Fabricated stool lifting a machine to its shaft height, on the base frame. */
export function Stool({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={1.5} fill={MX.flatBody} stroke={MX.fine} strokeWidth={MX.wFine} />
      <line x1={x + 4} x2={x + w - 4} y1={y + 4} y2={y + 4} {...PAINT.hair} />
      <Bolt x={x + 7} y={y + h - 5} r={1.4} />
      <Bolt x={x + w - 7} y={y + h - 5} r={1.4} />
    </g>
  );
}

/** Long flat base frame of a drive train, bolted at the ends. */
export function BaseRail({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={2.5} {...PAINT.body} />
      <line x1={x + 4} x2={x + w - 4} y1={y + 3.5} y2={y + 3.5} {...PAINT.hair} />
      {[x + 10, x + w - 10].map((bx) => (
        <Bolt key={bx} x={bx} y={y + h / 2 + 1.5} r={1.6} />
      ))}
    </g>
  );
}

/** Spaced upper-case note in a flow / caution colour token. */
export function ToneLabel({ x, y, color, anchor = "start", size = 8.5, children }: { x: number; y: number; color: string; anchor?: "start" | "middle" | "end"; size?: number; children: React.ReactNode }) {
  return (
    <text x={x} y={y} fill={color} fontSize={size} fontWeight={600} letterSpacing="0.14em" textAnchor={anchor}>
      {children}
    </text>
  );
}
