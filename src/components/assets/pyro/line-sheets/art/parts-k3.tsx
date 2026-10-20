/**
 * Shared parts for the KLN-01 drive-train part sheets K-2 … K-5 (page 8 of the
 * machine-group images, "3B · Kiln drive train and lubrication"): the gearbox
 * face with its two gear rings, the TEFC motor in side elevation, oil runs and
 * flow arrowheads. Everything paints through the machine kit (MX / PAINT).
 */
import React from "react";
import { Bolt, MX, PAINT } from "@/components/assets/machine-kit/machine-kit";

export type Pt = [number, number];
export type Rect = [number, number, number, number];

/** Flat material colour: a gradient paint does not render on straight strokes (zero-height bbox). */
export const GOLD = "var(--mx-material)";

/**
 * Main / auxiliary gearbox seen face-on: bolted housing with an inspection
 * cover on top, the input pinion and output wheel rings with their hubs, and
 * optional corner screws. Gears are `[cx, cy, r, hubR]` in sheet units.
 */
export function GearboxFace({
  box,
  cover,
  small,
  big,
  screws = false,
}: {
  box: Rect;
  /** [x0, x1, height] of the inspection cover on the top face. */
  cover?: [number, number, number];
  small: [number, number, number, number];
  big: [number, number, number, number];
  screws?: boolean;
}) {
  const [x, y, w, h] = box;
  return (
    <g aria-hidden="true">
      {cover && <rect x={cover[0]} y={y - cover[2]} width={cover[1] - cover[0]} height={cover[2] + 3} rx={2} {...PAINT.raised} />}
      <rect x={x} y={y} width={w} height={h} rx={7} {...PAINT.body} />
      <rect x={x + 5} y={y + 5} width={w - 10} height={h - 10} rx={4} {...PAINT.hair} opacity={0.5} />
      {screws &&
        [
          [x + 9, y + 10],
          [x + w - 9, y + 10],
          [x + 9, y + h - 10],
          [x + w - 9, y + h - 10],
        ].map(([bx, by]) => <circle key={`${bx}-${by}`} cx={bx} cy={by} r={2.2} fill="none" stroke={MX.edge} strokeWidth={1} />)}
      {[big, small].map(([cx, cy, r, hub]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r={r} {...PAINT.raised} />
          <circle cx={cx} cy={cy} r={r - 3.5} {...PAINT.hair} opacity={0.6} />
          <circle cx={cx} cy={cy} r={hub} fill={MX.deep} stroke={MX.edge} strokeWidth={MX.w} />
        </g>
      ))}
    </g>
  );
}

/**
 * TEFC motor in side elevation as drawn on the sheet: finned frame, rounded fan
 * cowl at the NDE end, terminal box on top, rating-plate window and feet. All
 * rects are `[x, y, w, h]`; `fins` are the y of the frame's fin lines.
 */
export function TefcSide({
  body,
  cowl,
  tb,
  win,
  feet,
  fins,
}: {
  body: Rect;
  cowl: Rect;
  tb: Rect;
  win: Rect;
  feet: Rect;
  fins: number[];
}) {
  const [x, y, w, h] = body;
  return (
    <g aria-hidden="true">
      <rect x={feet[0]} y={feet[1]} width={feet[2]} height={feet[3]} rx={1.5} {...PAINT.raised} />
      <rect x={cowl[0]} y={cowl[1]} width={cowl[2]} height={cowl[3]} rx={Math.min(cowl[2], cowl[3]) * 0.38} {...PAINT.body} />
      <rect x={tb[0]} y={tb[1]} width={tb[2]} height={tb[3] + 4} rx={3} {...PAINT.raised} />
      <rect x={x} y={y} width={w} height={h} rx={Math.min(11, h * 0.14)} {...PAINT.body} />
      {fins.map((fy) =>
        fy > win[1] - 2 && fy < win[1] + win[3] + 2 ? (
          <g key={fy}>
            <line x1={x + 8} x2={win[0] - 4} y1={fy} y2={fy} stroke={MX.fine} strokeWidth={MX.wFine} />
            <line x1={win[0] + win[2] + 4} x2={x + w - 8} y1={fy} y2={fy} stroke={MX.fine} strokeWidth={MX.wFine} />
          </g>
        ) : (
          <line key={fy} x1={x + 8} x2={x + w - 8} y1={fy} y2={fy} stroke={MX.fine} strokeWidth={MX.wFine} />
        ),
      )}
      <rect x={win[0]} y={win[1]} width={win[2]} height={win[3]} rx={2} fill={MX.deep} stroke={MX.edge} strokeWidth={MX.w} />
    </g>
  );
}

/** Flexible / pin coupling: hub block with grooves across the shaft. */
export function GroovedCoupling({ x, y, w, h, n = 3 }: { x: number; y: number; w: number; h: number; n?: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={3} {...PAINT.raised} />
      {Array.from({ length: n }).map((_, i) => {
        const gx = x + ((i + 1) * w) / (n + 1);
        return <line key={i} x1={gx} x2={gx} y1={y + 3} y2={y + h - 3} stroke={MX.edge} strokeWidth={1} />;
      })}
    </g>
  );
}

/** Horizontal shaft run with a polished highlight. */
export function ShaftRun({ x1, x2, cy, d }: { x1: number; x2: number; cy: number; d: number }) {
  return <rect x={x1} y={cy - d / 2} width={x2 - x1} height={d} rx={Math.min(3, d / 3)} {...PAINT.shaft} strokeWidth={MX.w} aria-hidden="true" />;
}

/** Pillow-block bearing seen from the side: block with its split line and four cap bolts. */
export function BearingBlock({ x, y, w, h, split }: { x: number; y: number; w: number; h: number; split: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={5} {...PAINT.body} />
      <line x1={x + 2} x2={x + w - 2} y1={split} y2={split} {...PAINT.detail} />
      {[x + 6, x + w - 6].map((bx) => (
        <g key={bx}>
          <Bolt x={bx} y={y + 7} r={1.4} />
          <Bolt x={bx} y={y + h - 7} r={1.4} />
        </g>
      ))}
    </g>
  );
}

/** Oil run along a polyline (lube oil / grease), flat material colour. */
export function OilRun({ pts, w = 4 }: { pts: Pt[]; w?: number }) {
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"} ${x} ${y}`).join(" ");
  return <path d={d} fill="none" stroke={GOLD} strokeWidth={w} strokeLinejoin="round" strokeLinecap="butt" aria-hidden="true" />;
}

/** Filled flow arrowhead, tip at (x, y), pointing along `dir`. */
export function FlowHead({ x, y, dir, len, half }: { x: number; y: number; dir: "down" | "left" | "right" | "up"; len: number; half: number }) {
  const pts: Pt[] =
    dir === "down"
      ? [[x - half, y - len], [x + half, y - len], [x, y]]
      : dir === "up"
        ? [[x - half, y + len], [x + half, y + len], [x, y]]
        : dir === "left"
          ? [[x + len, y - half], [x + len, y + half], [x, y]]
          : [[x - len, y - half], [x - len, y + half], [x, y]];
  return <path d={`M ${pts.map((p) => p.join(" ")).join(" L ")} Z`} fill={GOLD} opacity={0.85} stroke="none" aria-hidden="true" />;
}

/** Flow name in the flow's colour ("SUPPLY", "RETURN"). */
export function FlowText({ x, y, children, anchor = "middle", size = 7.5 }: { x: number; y: number; children: React.ReactNode; anchor?: "start" | "middle" | "end"; size?: number }) {
  return (
    <text x={x} y={y} fill={GOLD} fontSize={size} fontWeight={600} letterSpacing="0.1em" textAnchor={anchor}>
      {children}
    </text>
  );
}
