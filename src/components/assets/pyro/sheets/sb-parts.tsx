/**
 * Shared parts for the KLN-01 diagram sheets D04–D07 (main drive, girth gear,
 * support stations, shell / inlet / outlet). Every shape paints through the
 * ULTRON machine kit (MX / PAINT) so it follows the light and dark themes.
 *
 * Sheets are laid out from their PDF page (ULTRON_Pyro_Line_Machine_Diagrams,
 * rasterised 1639 px wide): `pdfMap` turns page pixels into drawing units, so
 * every part and pad keeps the place it has on the page.
 */
import React from "react";
import { Bolt, MX, PAINT } from "../../machine-kit/machine-kit";

export type Pt = [number, number];

/** Flat brass for thin oil / lubricant lines (stroke gradients need a real bounding box). */
export const BRASS = "var(--mx-material)";

/** Page-pixel → drawing-unit mapping for one sheet. */
export function pdfMap(x0: number, y0: number, k: number) {
  const X = (x: number) => +((x - x0) * k).toFixed(1);
  const Y = (y: number) => +((y - y0) * k).toFixed(1);
  const L = (v: number) => +(v * k).toFixed(1);
  const P = (x: number, y: number): Pt => [X(x), Y(y)];
  /** Rectangle from page corners (x0, y0) – (x1, y1). */
  const B = (ax: number, ay: number, bx: number, by: number) => ({ x: X(ax), y: Y(ay), width: L(bx - ax), height: L(by - ay) });
  /** Same rectangle as part props ({ x, y, w, h }). */
  const R = (ax: number, ay: number, bx: number, by: number) => ({ x: X(ax), y: Y(ay), w: L(bx - ax), h: L(by - ay) });
  return { X, Y, L, P, B, R };
}

/** Oil line along a polyline: steel tube with a brass core. */
export function OilLine({ pts, w = 5 }: { pts: Pt[]; w?: number }) {
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"} ${x} ${y}`).join(" ");
  return (
    <g aria-hidden="true" fill="none" strokeLinejoin="round" strokeLinecap="round">
      <path d={d} stroke={MX.edge} strokeWidth={w} />
      <path d={d} stroke={MX.metal} strokeWidth={w - 1.6} />
      <path d={d} stroke={BRASS} strokeWidth={Math.max(1.2, w * 0.36)} />
    </g>
  );
}

/** Dashed mechanical / signal link (hairline). */
export function Link({ pts, dash = "5 4" }: { pts: Pt[]; dash?: string }) {
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"} ${x} ${y}`).join(" ");
  return <path d={d} fill="none" stroke={MX.label} strokeWidth={1.2} strokeDasharray={dash} opacity={0.8} aria-hidden="true" />;
}

/** Induction motor in side elevation: NDE fan cowl left, finned frame, DE end shield right, terminal box on top. */
export function SideMotor({ x, y, w, h, flip = false }: { x: number; y: number; w: number; h: number; flip?: boolean }) {
  const cw = w * 0.2;
  const dw = w * 0.13;
  const fins = Math.max(5, Math.round(h / 7));
  const body = (
    <g aria-hidden="true">
      {/* NDE fan cowl with slots */}
      <rect x={x - cw + 3} y={y + h * 0.07} width={cw} height={h * 0.86} rx={Math.min(12, cw * 0.4)} {...PAINT.body} />
      {[0.3, 0.5, 0.7].map((f) => (
        <line key={f} x1={x - cw + 3 + cw * f} x2={x - cw + 3 + cw * f} y1={y + h * 0.2} y2={y + h * 0.8} {...PAINT.detail} />
      ))}
      {/* DE end shield and shaft stub */}
      <rect x={x + w - 3} y={y + h * 0.1} width={dw} height={h * 0.8} rx={4} {...PAINT.body} />
      {/* finned frame */}
      <rect x={x} y={y} width={w} height={h} rx={Math.min(14, h * 0.16)} {...PAINT.body} />
      {Array.from({ length: fins }).map((_, i) => {
        const fy = y + ((i + 1) * h) / (fins + 1);
        return <line key={i} x1={x + 6} x2={x + w - 6} y1={fy} y2={fy} stroke={MX.fine} strokeWidth={MX.wFine} />;
      })}
      {/* terminal box */}
      <rect x={x + w * 0.35} y={y - h * 0.2} width={w * 0.28} height={h * 0.22} rx={3} {...PAINT.raised} />
      <line x1={x + w * 0.35 + 3} x2={x + w * 0.63 - 3} y1={y - h * 0.09} y2={y - h * 0.09} {...PAINT.hair} />
    </g>
  );
  return flip ? <g transform={`translate(${2 * x + w} 0) scale(-1 1)`}>{body}</g> : body;
}

/** Steel base frame / plinth with anchor bolts. */
export function Plinth({ x, y, w, h, bolts = 2 }: { x: number; y: number; w: number; h: number; bolts?: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={2.5} {...PAINT.body} />
      <line x1={x + 3} x2={x + w - 3} y1={y + 3} y2={y + 3} {...PAINT.hair} />
      {Array.from({ length: bolts }).map((_, i) => (
        <Bolt key={i} x={x + 8 + (i * (w - 16)) / Math.max(1, bolts - 1)} y={y + h / 2 + 1} r={1.7} />
      ))}
    </g>
  );
}

/** Pillow-block bearing housing (split cap, bolts). */
export function Pillow({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={Math.min(6, w * 0.18)} {...PAINT.body} />
      <line x1={x + 2} x2={x + w - 2} y1={y + h * 0.48} y2={y + h * 0.48} {...PAINT.detail} />
      <Bolt x={x + 5} y={y + h * 0.48 - 6} r={1.6} />
      <Bolt x={x + w - 5} y={y + h * 0.48 - 6} r={1.6} />
      <Bolt x={x + 5} y={y + h - 6} r={1.6} />
      <Bolt x={x + w - 5} y={y + h - 6} r={1.6} />
    </g>
  );
}

/** Horizontal shaft coupling: two hubs with a gap. */
export function ShaftCoupling({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={3} {...PAINT.raised} />
      <line x1={x + w / 2} x2={x + w / 2} y1={y + 2} y2={y + h - 2} stroke={MX.edge} strokeWidth={1.4} />
      <Bolt x={x + w * 0.25} y={y + 5} r={1.3} />
      <Bolt x={x + w * 0.75} y={y + h - 5} r={1.3} />
    </g>
  );
}

/** Edge-on gear (axis horizontal): toothed band seen from the side, teeth as ridges. */
export function GearEdge({ x, y, w, h, n }: { x: number; y: number; w: number; h: number; n: number }) {
  const step = h / n;
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={3} {...PAINT.shaft} strokeWidth={MX.w} />
      {Array.from({ length: n }).map((_, i) => (
        <rect key={i} x={x - 2} y={y + i * step + step * 0.22} width={w + 4} height={step * 0.5} rx={1} fill={MX.raised} stroke={MX.edge} strokeWidth={0.7} />
      ))}
    </g>
  );
}

/** Pinion / roller face seen from the side (axis horizontal): metal drum with axial tooth lines. */
export function ToothedDrum({ x, y, w, h, n }: { x: number; y: number; w: number; h: number; n: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={4} {...PAINT.shaft} strokeWidth={MX.w} />
      {Array.from({ length: n }).map((_, i) => {
        const lx = x + ((i + 1) * w) / (n + 1);
        return <line key={i} x1={lx} x2={lx} y1={y + 2} y2={y + h - 2} stroke={MX.edge} strokeWidth={0.8} opacity={0.8} />;
      })}
    </g>
  );
}

/** Horizontal kiln shell segment with ring seams. */
export function Shell({ x, y, w, h, seam }: { x: number; y: number; w: number; h: number; seam: number }) {
  const seams: number[] = [];
  for (let sx = x + seam; sx < x + w - 4; sx += seam) seams.push(sx);
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={3} {...PAINT.cylinder} />
      {seams.map((sx) => (
        <line key={sx} x1={sx} x2={sx} y1={y + 2} y2={y + h - 2} {...PAINT.hair} />
      ))}
    </g>
  );
}

/** Riding tyre on the shell (side elevation). */
export function TyreBand({ cx, y, w, h }: { cx: number; y: number; w: number; h: number }) {
  return (
    <g aria-hidden="true">
      <rect x={cx - w / 2} y={y} width={w} height={h} rx={4} {...PAINT.cylinderV} />
      <line x1={cx - w / 2 + 3} x2={cx - w / 2 + 3} y1={y + 4} y2={y + h - 4} {...PAINT.hair} />
      <line x1={cx + w / 2 - 3} x2={cx + w / 2 - 3} y1={y + 4} y2={y + h - 4} {...PAINT.hair} />
    </g>
  );
}

/** Support roller seen end-on (side elevation of a station). */
export function RollerEnd({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g aria-hidden="true">
      <circle cx={cx} cy={cy} r={r} {...PAINT.shaft} strokeWidth={MX.w} />
      <circle cx={cx} cy={cy} r={r * 0.62} fill="none" stroke={MX.edge} strokeWidth={0.8} opacity={0.6} />
      <circle cx={cx} cy={cy} r={r * 0.28} {...PAINT.recess} />
    </g>
  );
}

/** Roller station in side elevation: two rollers end-on, bearing frame and concrete pier. */
export function StationElevation({ cx, cy, r, gap, base, pierW, pierH }: { cx: number; cy: number; r: number; gap: number; base: number; pierW: number; pierH: number }) {
  return (
    <g aria-hidden="true">
      <path d={`M ${cx - pierW / 2 + 4} ${base} H ${cx + pierW / 2 - 4} L ${cx + pierW / 2} ${base + pierH} H ${cx - pierW / 2} Z`} {...PAINT.body} />
      <Bolt x={cx - pierW / 2 + 9} y={base + pierH - 6} r={1.8} />
      <Bolt x={cx + pierW / 2 - 9} y={base + pierH - 6} r={1.8} />
      <rect x={cx - gap / 2 - r - 6} y={base - 7} width={gap + 2 * r + 12} height={9} rx={2.5} {...PAINT.raised} />
      <RollerEnd cx={cx - gap / 2} cy={cy} r={r} />
      <RollerEnd cx={cx + gap / 2} cy={cy} r={r} />
    </g>
  );
}

/** Refractory lining: recess panel with a brick course pattern (no colour). */
export function Refractory({ x, y, w, h, course = 9, brick = 18 }: { x: number; y: number; w: number; h: number; course?: number; brick?: number }) {
  const rows = Math.floor(h / course);
  const lines: React.ReactNode[] = [];
  for (let i = 1; i < rows; i++) lines.push(<line key={`h${i}`} x1={x + 1} x2={x + w - 1} y1={y + i * course} y2={y + i * course} {...PAINT.hair} opacity={0.55} />);
  for (let i = 0; i < rows; i++) {
    const off = i % 2 ? brick / 2 : 0;
    for (let bx = x + off + brick; bx < x + w - 2; bx += brick)
      lines.push(<line key={`v${i}-${bx}`} x1={bx} x2={bx} y1={y + i * course} y2={y + (i + 1) * course} {...PAINT.hair} opacity={0.4} />);
  }
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={3} {...PAINT.recess} />
      {lines}
    </g>
  );
}

/** Spray nozzle hanging from a header, with its fan of lubricant (hairline). */
export function SprayNozzle({ x, y, h, spread }: { x: number; y: number; h: number; spread: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x - 3.5} y={y} width={7} height={9} rx={1.5} {...PAINT.raised} />
      <path d={`M ${x} ${y + 9} L ${x - spread} ${y + 9 + h} H ${x + spread} Z`} fill={MX.fine} opacity={0.35} />
      <path d={`M ${x} ${y + 9} L ${x - spread} ${y + 9 + h} M ${x} ${y + 9} L ${x + spread} ${y + 9 + h}`} {...PAINT.hair} />
    </g>
  );
}
