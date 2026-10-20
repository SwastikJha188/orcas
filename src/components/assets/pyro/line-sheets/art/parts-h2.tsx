/**
 * Parts for the H sheets drawn from the stage-overview and machine-group PDFs
 * (H-0 … H-3): flow bands and arrowheads, side-elevation TEFC motor, rotor
 * bearing block, ΔP transmitter. Machine kit paints only.
 */
import React from "react";
import { Bolt, MX, PAINT } from "@/components/assets/machine-kit/machine-kit";

/** Thin flow stroke as a filled band (gradient paints need a real bounding box). */
export function Stream({ x1, y1, x2, y2, w = 2.2, fill = MX.material }: { x1: number; y1: number; x2: number; y2: number; w?: number; fill?: string }) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const a = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  return <rect x={x1} y={y1 - w / 2} width={len} height={w} rx={w / 2} fill={fill} transform={`rotate(${a} ${x1} ${y1})`} aria-hidden="true" />;
}

/** Filled flow arrowhead at (x, y) pointing along `deg`. */
export function Head({ x, y, deg, s = 11, fill = MX.material }: { x: number; y: number; deg: number; s?: number; fill?: string }) {
  return <path d={`M ${s * 0.6} 0 L ${-s * 0.6} ${-s * 0.5} L ${-s * 0.6} ${s * 0.5} Z`} fill={fill} transform={`translate(${x} ${y}) rotate(${deg})`} aria-hidden="true" />;
}

/** Flow arrow: band from (x1, y1) to (x2, y2) with its head at the end. */
export function FlowArrow({ x1, y1, x2, y2, w = 2, s = 9, fill = MX.material }: { x1: number; y1: number; x2: number; y2: number; w?: number; s?: number; fill?: string }) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const deg = (a * 180) / Math.PI;
  const bx = x2 - Math.cos(a) * s * 0.6;
  const by = y2 - Math.sin(a) * s * 0.6;
  return (
    <g aria-hidden="true">
      <Stream x1={x1} y1={y1} x2={bx} y2={by} w={w} fill={fill} />
      <Head x={bx} y={by} deg={deg} s={s} fill={fill} />
    </g>
  );
}

/**
 * Side-elevation TEFC motor: fan cowl on the left (right when `flip`), finned
 * frame, terminal box [x, w, h] on top, recessed rating window, base strip.
 */
export function TefcMotor({
  x,
  y,
  w,
  h,
  cowl,
  tb,
  fins,
  win,
  flip = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  cowl: number;
  tb: [number, number, number];
  fins: number;
  /** Rating / terminal window [x, y, w, h]. */
  win?: [number, number, number, number];
  flip?: boolean;
}) {
  const [tx, tw, th] = tb;
  const body = (
    <g aria-hidden="true">
      <rect x={x - cowl} y={y + h * 0.1} width={cowl + 10} height={h * 0.8} rx={Math.min(12, cowl * 0.45)} {...PAINT.body} />
      <rect x={tx} y={y - th} width={tw} height={th + 4} rx={2.5} {...PAINT.body} />
      <rect x={x} y={y} width={w} height={h} rx={Math.min(14, h * 0.16)} {...PAINT.body} />
      {Array.from({ length: fins }).map((_, i) => {
        const fy = y + ((i + 1) * h) / (fins + 1);
        return <line key={i} x1={x + w * 0.06} x2={x + w * 0.94} y1={fy} y2={fy} {...PAINT.hair} />;
      })}
      {win && <rect x={win[0]} y={win[1]} width={win[2]} height={win[3]} rx={2} {...PAINT.recess} />}
      <rect x={x + w * 0.1} y={y + h} width={w * 0.8} height={Math.max(3, h * 0.05)} rx={1.2} {...PAINT.raised} />
    </g>
  );
  return flip ? <g transform={`translate(${2 * x + w} 0) scale(-1 1)`}>{body}</g> : body;
}

/** Rotor bearing block (split pillow block seen end-on), split line at `split`. */
export function BearingBlock({ x, y, w, h, split }: { x: number; y: number; w: number; h: number; split?: number }) {
  const sy = split ?? y + h / 2;
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={5} {...PAINT.raised} />
      <rect x={x + 3.5} y={y + 3.5} width={w - 7} height={h - 7} rx={3} {...PAINT.hair} />
      <line x1={x + 2} x2={x + w - 2} y1={sy} y2={sy} stroke={MX.edge} strokeWidth={1} />
      {[x + 5.5, x + w - 5.5].map((bx) => (
        <g key={bx}>
          <Bolt x={bx} y={sy - 5} r={1.3} />
          <Bolt x={bx} y={sy + 5} r={1.3} />
        </g>
      ))}
    </g>
  );
}

/** Clinker lumps (small irregular stones) at the given points. */
export function Lumps({ pts, r = 2.6 }: { pts: Array<[number, number]>; r?: number }) {
  return (
    <g aria-hidden="true">
      {pts.map(([x, y], i) => (
        <path
          key={i}
          d={`M ${x - r} ${y} L ${x - r * 0.4} ${y - r * 0.9} L ${x + r * 0.7} ${y - r * 0.7} L ${x + r} ${y + r * 0.2} L ${x + r * 0.2} ${y + r * 0.9} L ${x - r * 0.8} ${y + r * 0.6} Z`}
          fill={MX.material}
          stroke={MX.edge}
          strokeWidth={0.5}
          transform={`rotate(${(i * 47) % 360} ${x} ${y})`}
        />
      ))}
    </g>
  );
}
