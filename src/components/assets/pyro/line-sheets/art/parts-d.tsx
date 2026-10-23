/**
 * Parts of the designed operator sheets (2000 × 1125 design frame, Rev02+ layouts): a fan set on its base
 * (volute, coupling, finned motor), a process line (tube with a coloured core and heads along it), a rotary
 * feeder, gas bottles and an instrument box. Kit paints only.
 */
import React from "react";
import { Bolt, Fan, MX, PAINT } from "@/components/assets/machine-kit/machine-kit";
import type { Pt } from "../../drawings/clk-parts";
import { volutePath } from "./parts-c";

export type Dir = "left" | "right" | "up" | "down";

/** Filled flow head, tip at (x, y). */
export function Head({ x, y, dir, color, s = 1 }: { x: number; y: number; dir: Dir; color: string; s?: number }) {
  const l = 11 * s;
  const h = 6 * s;
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

/** Core stream along an orthogonal polyline, as rects so gradient paints keep a real bounding box. */
export function Core({ pts, color, w = 1.8, dash }: { pts: Pt[]; color: string; w?: number; dash?: number }) {
  const out: React.ReactNode[] = [];
  pts.slice(1).forEach(([bx, by], i) => {
    const [ax, ay] = pts[i];
    if (!dash) {
      out.push(<rect key={i} x={Math.min(ax, bx) - w / 2} y={Math.min(ay, by) - w / 2} width={Math.abs(bx - ax) + w} height={Math.abs(by - ay) + w} fill={color} />);
      return;
    }
    const len = Math.hypot(bx - ax, by - ay);
    const ux = (bx - ax) / len;
    const uy = (by - ay) / len;
    for (let s = 0; s < len; s += dash * 1.7) {
      const e = Math.min(len, s + dash);
      const x0 = ax + ux * s;
      const y0 = ay + uy * s;
      const x1 = ax + ux * e;
      const y1 = ay + uy * e;
      out.push(<rect key={`${i}-${s}`} x={Math.min(x0, x1) - w / 2} y={Math.min(y0, y1) - w / 2} width={Math.abs(x1 - x0) + w} height={Math.abs(y1 - y0) + w} fill={color} />);
    }
  });
  return <g aria-hidden="true">{out}</g>;
}

/** Light process tube along a polyline (edge, pale bore). */
export function Tube({ pts, w = 9 }: { pts: Pt[]; w?: number }) {
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"} ${x} ${y}`).join(" ");
  return (
    <g aria-hidden="true" fill="none" strokeLinejoin="round">
      <path d={d} stroke={MX.edge} strokeWidth={w} />
      <path d={d} stroke={MX.flatRaised} strokeWidth={Math.max(1, w - 2.6)} />
    </g>
  );
}

/**
 * Process line: a tube with the medium's coloured core and flow heads at the given points (each [x, y, dir]).
 * `w` is the tube width; the core runs on its axis.
 */
export function Line({ pts, color, w = 9, core = 1.8, heads = [], dash }: { pts: Pt[]; color: string; w?: number; core?: number; heads?: Array<[number, number, Dir]>; dash?: number }) {
  return (
    <g aria-hidden="true">
      <Tube pts={pts} w={w} />
      <Core pts={pts} color={color} w={core} dash={dash} />
      {heads.map(([x, y, dir], i) => (
        <Head key={i} x={x} y={y} dir={dir} color={color} s={Math.max(0.6, w / 11)} />
      ))}
    </g>
  );
}

/**
 * Fan set on a base: volute (outlet up, on the side away from the motor), dark impeller face, coupling and a
 * finned motor with its terminal box. (cx, cy) is the impeller centre, r the volute radius; the motor sits to
 * the right (`side` -1: to the left).
 */
export function FanSet({ cx, cy, r, side = 1, base = true }: { cx: number; cy: number; r: number; side?: 1 | -1; base?: boolean }) {
  const s = side;
  const v = volutePath(cx, cy, r, cy - r * 1.35, s);
  const mw = r * 3.3;
  const mh = r * 1.75;
  const m0 = cx + s * r * 1.45;
  const mx = s > 0 ? m0 : m0 - mw;
  const my = cy - mh / 2;
  const fins = Math.max(3, Math.round(mh / 5));
  const baseL = Math.min(cx - r * 1.2, mx - r * 0.5);
  const baseR = Math.max(cx + r * 1.2, mx + mw + r * 0.5);
  const baseY = cy + r * 1.25;
  return (
    <g aria-hidden="true">
      {base && (
        <g>
          <rect x={baseL} y={baseY} width={baseR - baseL} height={Math.max(3, r * 0.3)} rx={1.5} {...PAINT.body} />
          <rect x={mx + mw * 0.12} y={cy + mh / 2} width={mw * 0.76} height={baseY - cy - mh / 2} {...PAINT.body} />
        </g>
      )}
      {/* coupling */}
      <rect x={s > 0 ? cx + r * 0.9 : cx - r * 1.5} y={cy - r * 0.32} width={r * 0.6} height={r * 0.64} rx={1.5} {...PAINT.raised} />
      {/* motor: frame, fins, terminal window, terminal box, end cowl and shaft stub */}
      <rect x={mx} y={my} width={mw} height={mh} rx={Math.min(6, mh * 0.2)} {...PAINT.body} />
      {Array.from({ length: fins }).map((_, i) => {
        const fy = my + ((i + 1) * mh) / (fins + 1);
        return <line key={i} x1={mx + mw * 0.08} x2={mx + mw * 0.92} y1={fy} y2={fy} stroke={MX.fine} strokeWidth={0.7} />;
      })}
      <rect x={mx + mw * 0.36} y={my + mh * 0.34} width={mw * 0.28} height={mh * 0.32} rx={2} {...PAINT.recess} />
      <rect x={mx + mw * 0.3} y={my - mh * 0.22} width={mw * 0.4} height={mh * 0.22} rx={2} {...PAINT.body} />
      <rect x={s > 0 ? mx + mw : mx - mw * 0.16} y={cy - mh * 0.08} width={mw * 0.16} height={mh * 0.16} {...PAINT.shaft} />
      {/* volute with the impeller */}
      <path d={v.d} {...PAINT.body} />
      <circle cx={cx} cy={cy} r={r * 0.78} {...PAINT.recess} />
      <Fan cx={cx} cy={cy} r={r * 0.68} />
      {[45, 135, 225, 315].map((a) => (
        <Bolt key={a} x={cx + Math.cos((a * Math.PI) / 180) * r * 0.9} y={cy + Math.sin((a * Math.PI) / 180) * r * 0.9} r={Math.max(0.8, r * 0.07)} />
      ))}
    </g>
  );
}

/** Rotary feeder: square body with the rotor seen end-on. */
export function RotaryFeeder({ cx, cy, s = 30 }: { cx: number; cy: number; s?: number }) {
  const r = s * 0.3;
  return (
    <g aria-hidden="true">
      <rect x={cx - s / 2} y={cy - s / 2} width={s} height={s} rx={s * 0.14} {...PAINT.body} />
      <circle cx={cx} cy={cy} r={r} {...PAINT.raised} />
      <circle cx={cx} cy={cy} r={r * 0.45} fill="none" stroke={MX.edge} strokeWidth={0.9} />
      <line x1={cx - r * 1.25} x2={cx + r * 1.25} y1={cy} y2={cy} stroke={MX.edge} strokeWidth={0.9} />
      <line x1={cx} x2={cx} y1={cy - r * 1.25} y2={cy + r * 1.25} stroke={MX.edge} strokeWidth={0.9} />
    </g>
  );
}

/** Instrument / analyser box with its window. */
export function InstrumentBox({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={Math.min(5, h * 0.2)} {...PAINT.body} />
      <rect x={x + w * 0.16} y={y + h * 0.26} width={w * 0.68} height={h * 0.48} rx={2} {...PAINT.raised} />
    </g>
  );
}

/** Gas bottles (nitrogen purge rack). */
export function Bottles({ x, y, w, h, n = 2, gap = 3 }: { x: number; y: number; w: number; h: number; n?: number; gap?: number }) {
  return (
    <g aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => (
        <rect key={i} x={x + i * (w + gap)} y={y} width={w} height={h} rx={w * 0.4} fill={MX.air} stroke={MX.edge} strokeWidth={MX.w} />
      ))}
    </g>
  );
}

/** Instrument tap on equipment (a ring with a dot), drawn where the design shows one without a mapped sensor. */
export function Tap({ x, y, r = 4.5 }: { x: number; y: number; r?: number }) {
  return (
    <g aria-hidden="true">
      <circle cx={x} cy={y} r={r} fill={MX.padPanel} stroke={MX.edge} strokeWidth={1.2} />
      <circle cx={x} cy={y} r={r * 0.38} fill={MX.edge} />
    </g>
  );
}
