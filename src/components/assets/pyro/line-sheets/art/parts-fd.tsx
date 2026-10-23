/**
 * Parts of the designed feed sheet (F-0, 2000 × 1125 design frame): a sloped air slide (light tube with the meal
 * core, flange ticks and an optional flow head), a dashed air line, a solid-flow meter with its transmitter, a
 * rotary airlock with its drive and the elevator head-drive motor. Kit paints only.
 */
import React from "react";
import { MX, PAINT } from "@/components/assets/machine-kit/machine-kit";
import type { Pt } from "../../drawings/clk-parts";
import { Head } from "./parts-d";

/** Sloped air slide from (x1, y1) to (x2, y2): tube `d` wide, meal core on its axis, a flange every `step`. */
export function Slide({ x1, y1, x2, y2, d = 8, step = 50, head, core = true }: { x1: number; y1: number; x2: number; y2: number; d?: number; step?: number; head?: number; core?: boolean }) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const a = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  const ticks: React.ReactNode[] = [];
  for (let s = step; s < len - step / 3; s += step) ticks.push(<line key={s} x1={s} x2={s} y1={-d / 2} y2={d / 2} stroke={MX.fine} strokeWidth={0.9} />);
  return (
    <g transform={`translate(${x1} ${y1}) rotate(${a})`} aria-hidden="true">
      <rect x={0} y={-d / 2} width={len} height={d} rx={1.5} fill={MX.flatRaised} stroke={MX.edge} strokeWidth={MX.w} strokeLinejoin="round" />
      {core && <rect x={3} y={-1.4} width={len - 6} height={2.8} rx={1} {...PAINT.material} />}
      {ticks}
      {head !== undefined && <Head x={head * len} y={0} dir="right" color={MX.material} s={0.8} />}
    </g>
  );
}

/** Dashed conveying-air line along a polyline. */
export function AirLine({ pts }: { pts: Pt[] }) {
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"} ${x} ${y}`).join(" ");
  return <path d={d} fill="none" stroke={MX.air} strokeWidth={1.6} strokeDasharray="5 3" strokeLinejoin="round" aria-hidden="true" />;
}

/** Solid-flow meter: housing (x, y, 60 × 41) with its sight window and impact plate; transmitter on `side`. */
export function FlowMeter({ x, y, side }: { x: number; y: number; side: 1 | -1 }) {
  const tx = side < 0 ? x - 20 : x + 62;
  return (
    <g aria-hidden="true">
      <rect x={side < 0 ? x - 3 : x + 60} y={y + 11} width={3} height={6} {...PAINT.shaft} />
      <rect x={tx} y={y + 6} width={18} height={17} rx={3} {...PAINT.body} />
      <rect x={x} y={y} width={60} height={41} rx={5} {...PAINT.body} />
      <rect x={x + 9.5} y={y + 8.5} width={40.5} height={21.5} rx={3} {...PAINT.raised} />
      <line x1={x + 15} y1={y + 14} x2={x + 43} y2={y + 28} stroke={MX.edge} strokeWidth={2.2} strokeLinecap="round" />
    </g>
  );
}

/** Rotary airlock: casing centred on (cx, cy) with its rotor, drive box to the right. */
export function Airlock({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g aria-hidden="true">
      <rect x={cx + 14.5} y={cy - 6} width={16.5} height={12} rx={3} {...PAINT.body} />
      <rect x={cx - 15} y={cy - 13} width={30} height={26} rx={5} {...PAINT.body} />
      <circle cx={cx} cy={cy} r={8} {...PAINT.raised} />
      <circle cx={cx} cy={cy} r={3.6} fill="none" stroke={MX.edge} strokeWidth={1.1} />
      <circle cx={cx} cy={cy} r={1.3} fill={MX.edge} />
      {[
        [-8, 0, -4.5, 0],
        [4.5, 0, 8, 0],
        [0, -8, 0, -4.5],
        [0, 4.5, 0, 8],
      ].map(([a, b, c, d], i) => (
        <line key={i} x1={cx + a} y1={cy + b} x2={cx + c} y2={cy + d} stroke={MX.edge} strokeWidth={1} />
      ))}
    </g>
  );
}

/** Finned drive motor lying left → right (end cowl left, shaft right), with its terminal box and dark nameplate. */
export function DriveMotor({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const fins = [0.17, 0.3, 0.7, 0.83];
  return (
    <g aria-hidden="true">
      <rect x={x + w * 0.1} y={y + h} width={w * 0.8} height={h * 0.14} rx={1.5} {...PAINT.body} />
      <rect x={x - w * 0.19} y={y + h * 0.08} width={w * 0.21} height={h * 0.84} rx={6} {...PAINT.body} />
      <rect x={x} y={y} width={w} height={h} rx={7} {...PAINT.body} />
      {fins.map((f) => (
        <line key={f} x1={x + w * 0.08} x2={x + w * 0.92} y1={y + h * f} y2={y + h * f} stroke={MX.fine} strokeWidth={0.9} />
      ))}
      <line x1={x + w * 0.08} x2={x + w * 0.33} y1={y + h * 0.5} y2={y + h * 0.5} stroke={MX.fine} strokeWidth={0.9} />
      <line x1={x + w * 0.67} x2={x + w * 0.92} y1={y + h * 0.5} y2={y + h * 0.5} stroke={MX.fine} strokeWidth={0.9} />
      <rect x={x + w * 0.335} y={y + h * 0.375} width={w * 0.33} height={h * 0.225} rx={2} fill={MX.deep} stroke={MX.edge} strokeWidth={1.2} />
      <rect x={x + w * 0.305} y={y - h * 0.22} width={w * 0.395} height={h * 0.25} rx={4} {...PAINT.body} />
    </g>
  );
}
