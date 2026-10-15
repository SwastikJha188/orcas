/**
 * Shared parts for the KLN-01 line sheets K-5 … K-9 (spray lubrication,
 * roller stations, thrust, shell scanner, outlet and hood). Built from the
 * ULTRON machine kit only (MX / PAINT), so every shape follows both themes.
 * Coordinates are sheet units.
 */
import React from "react";
import { Bolt, MX, PAINT } from "@/components/assets/machine-kit/machine-kit";

export type Pt = [number, number];

/** Rows of a cylinder seen side-on: `n` lines spaced by equal angle, so they crowd toward the silhouette. */
export function cosRows(y0: number, y1: number, n: number): number[] {
  const c = (y0 + y1) / 2;
  const r = (y1 - y0) / 2;
  const out: number[] = [];
  for (let i = 1; i < n; i++) out.push(+(c - r * Math.cos((i / n) * Math.PI)).toFixed(2));
  return out;
}

/** Horizontal kiln shell run: rolled plate with ring seams, longitudinal weld and the kiln axis. */
export function KilnShell({ x, y, w, h, seam, axis = true }: { x: number; y: number; w: number; h: number; seam: number; axis?: boolean }) {
  const seams: number[] = [];
  for (let sx = x + seam; sx < x + w - 6; sx += seam) seams.push(+sx.toFixed(1));
  const cy = y + h / 2;
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={4} {...PAINT.cylinder} />
      {seams.map((sx) => (
        <line key={sx} x1={sx} x2={sx} y1={y + 2} y2={y + h - 2} {...PAINT.hair} />
      ))}
      <line x1={x + 3} x2={x + w - 3} y1={y + h * 0.14} y2={y + h * 0.14} {...PAINT.hair} opacity={0.45} />
      {axis && <line x1={x - 10} x2={x + w + 6} y1={cy} y2={cy} {...PAINT.hair} strokeDasharray="16 4 2 4" opacity={0.55} />}
    </g>
  );
}

/** Riding tyre in side elevation, with the stop blocks that hold it on the shell. */
export function Tyre({ cx, y, w, h, shellTop, shellBot }: { cx: number; y: number; w: number; h: number; shellTop: number; shellBot: number }) {
  const bw = Math.max(5, w * 0.28);
  return (
    <g aria-hidden="true">
      {[cx - w / 2 - bw, cx + w / 2].map((bx) => (
        <g key={bx}>
          <rect x={bx} y={shellTop - 3} width={bw} height={6} rx={1.2} {...PAINT.raised} />
          <rect x={bx} y={shellBot - 3} width={bw} height={6} rx={1.2} {...PAINT.raised} />
        </g>
      ))}
      <rect x={cx - w / 2} y={y} width={w} height={h} rx={Math.min(5, w * 0.25)} {...PAINT.cylinderV} />
      <line x1={cx - w / 2 + 2.5} x2={cx - w / 2 + 2.5} y1={y + 4} y2={y + h - 4} {...PAINT.hair} />
      <line x1={cx + w / 2 - 2.5} x2={cx + w / 2 - 2.5} y1={y + 4} y2={y + h - 4} {...PAINT.hair} />
    </g>
  );
}

/** Concrete pier: tapered block, grout pad, anchor bolts. */
export function Pier({ cx, top, bottom, wTop, wBot }: { cx: number; top: number; bottom: number; wTop: number; wBot: number }) {
  const d = `M ${cx - wTop / 2} ${top} H ${cx + wTop / 2} L ${cx + wBot / 2} ${bottom} H ${cx - wBot / 2} Z`;
  const inset = 5;
  const k = (wBot - wTop) / 2 / (bottom - top);
  const di = `M ${cx - wTop / 2 + inset} ${top + inset} H ${cx + wTop / 2 - inset} L ${cx + wBot / 2 - inset - k * inset} ${bottom - inset} H ${cx - wBot / 2 + inset + k * inset} Z`;
  return (
    <g aria-hidden="true">
      <path d={d} {...PAINT.body} />
      {bottom - top > 26 && <path d={di} fill="none" stroke={MX.fine} strokeWidth={0.8} />}
      <Bolt x={cx - wBot / 2 + 10} y={bottom - 7} r={1.8} />
      <Bolt x={cx + wBot / 2 - 10} y={bottom - 7} r={1.8} />
    </g>
  );
}

/** Support roller seen end-on, with its bearing housing in front on the base frame. */
export function RollerEnd({ cx, cy, r, base }: { cx: number; cy: number; r: number; base: number }) {
  const bw = r * 1.15;
  const top = cy - r * 0.42;
  return (
    <g aria-hidden="true">
      <circle cx={cx} cy={cy} r={r} {...PAINT.shaft} strokeWidth={MX.w} />
      <circle cx={cx} cy={cy} r={r * 0.82} fill="none" stroke={MX.edge} strokeWidth={0.7} opacity={0.6} />
      <path d={`M ${cx - bw / 2} ${base} V ${top + 4} Q ${cx - bw / 2} ${top} ${cx - bw / 2 + 4} ${top} H ${cx + bw / 2 - 4} Q ${cx + bw / 2} ${top} ${cx + bw / 2} ${top + 4} V ${base} Z`} {...PAINT.raised} />
      <line x1={cx - bw / 2 + 1.5} x2={cx + bw / 2 - 1.5} y1={cy} y2={cy} {...PAINT.hair} />
      <circle cx={cx} cy={cy} r={r * 0.24} {...PAINT.recess} />
      <Bolt x={cx - bw / 2 + 3.2} y={base - 3.5} r={1.2} />
      <Bolt x={cx + bw / 2 - 3.2} y={base - 3.5} r={1.2} />
    </g>
  );
}

/** Roller station in side elevation: base frame with two rollers end-on (no pier). */
export function RollerPair({ cx, cy, r, gap, frameY, frameW, frameH = 10 }: { cx: number; cy: number; r: number; gap: number; frameY: number; frameW: number; frameH?: number }) {
  return (
    <g aria-hidden="true">
      <RollerEnd cx={cx - gap / 2} cy={cy} r={r} base={frameY} />
      <RollerEnd cx={cx + gap / 2} cy={cy} r={r} base={frameY} />
      <rect x={cx - frameW / 2} y={frameY} width={frameW} height={frameH} rx={2.5} {...PAINT.raised} />
      <line x1={cx - frameW / 2 + 3} x2={cx + frameW / 2 - 3} y1={frameY + 3} y2={frameY + 3} {...PAINT.hair} />
      {[-0.42, -0.14, 0.14, 0.42].map((f) => (
        <Bolt key={f} x={cx + f * frameW} y={frameY + frameH / 2 + 1} r={1.3} />
      ))}
    </g>
  );
}

/** Orthogonal steel pipe (or duct) with a shaded body, run along `pts`; elbows as raised blocks. */
export function Duct({ pts, d }: { pts: Pt[]; d: number }) {
  const segs: React.ReactNode[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    if (ay === by) segs.push(<rect key={i} x={Math.min(ax, bx)} y={ay - d / 2} width={Math.abs(bx - ax)} height={d} {...PAINT.cylinder} />);
    else segs.push(<rect key={i} x={ax - d / 2} y={Math.min(ay, by)} width={d} height={Math.abs(by - ay)} {...PAINT.cylinderV} />);
  }
  return (
    <g aria-hidden="true">
      {segs}
      {pts.slice(1, -1).map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x - d / 2 - 1.5} y={y - d / 2 - 1.5} width={d + 3} height={d + 3} rx={d * 0.3} {...PAINT.raised} />
      ))}
    </g>
  );
}

/** Bolted flange across a vertical run (`vertical`) or a horizontal one. */
export function BoltFlange({ x, y, w, vertical = true }: { x: number; y: number; w: number; vertical?: boolean }) {
  return vertical ? (
    <g aria-hidden="true">
      <rect x={x - w / 2 - 3} y={y - 2.5} width={w + 6} height={5} rx={1.2} {...PAINT.raised} />
      <circle cx={x - w / 2 - 0.5} cy={y} r={0.9} fill={MX.deep} />
      <circle cx={x + w / 2 + 0.5} cy={y} r={0.9} fill={MX.deep} />
    </g>
  ) : (
    <g aria-hidden="true">
      <rect x={x - 2.5} y={y - w / 2 - 3} width={5} height={w + 6} rx={1.2} {...PAINT.raised} />
      <circle cx={x} cy={y - w / 2 - 0.5} r={0.9} fill={MX.deep} />
      <circle cx={x} cy={y + w / 2 + 0.5} r={0.9} fill={MX.deep} />
    </g>
  );
}

/** Neutral flow arrow (hairline with a filled head). */
export function Arrow({ x1, y1, x2, y2, head = 6 }: { x1: number; y1: number; x2: number; y2: number; head?: number }) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const p = (s: number): Pt => [x2 - head * Math.cos(a + s), y2 - head * Math.sin(a + s)];
  const [l, r] = [p(-0.45), p(0.45)];
  return (
    <g aria-hidden="true">
      <line x1={x1} y1={y1} x2={x2 - Math.cos(a) * head * 0.6} y2={y2 - Math.sin(a) * head * 0.6} stroke={MX.label} strokeWidth={1.3} />
      <path d={`M ${l[0]} ${l[1]} L ${x2} ${y2} L ${r[0]} ${r[1]} Z`} fill={MX.label} stroke={MX.label} strokeWidth={0.8} strokeLinejoin="round" />
    </g>
  );
}
