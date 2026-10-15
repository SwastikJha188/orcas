/**
 * Shared helpers for the D01 / D02 / D03 / D08 diagram sheets.
 *
 * Each sheet is laid out in the coordinates of its PDF page (110 dpi render of
 * ULTRON_Pyro_Line_Machine_Diagrams.pdf) and mapped into sheet units with
 * `sheetMap`, so every part and pad keeps the page's composition. Sizes and
 * stroke widths stay in sheet units (kit strokes are absolute).
 */
import React from "react";
import { Bolt, MX, MachineLabel, PAINT } from "../../machine-kit/machine-kit";

export type Pt = [number, number];

/** PDF-page pixel → sheet unit mapping (`k` horizontal, `ky` vertical scale). */
export function sheetMap(k: number, ox: number, oy: number, ky = k) {
  const r = (v: number) => Math.round(v * 100) / 100;
  const X = (px: number) => r((px - ox) * k);
  const Y = (py: number) => r((py - oy) * ky);
  const P = (px: number, py: number): Pt => [X(px), Y(py)];
  const PTS = (pts: Pt[]): Pt[] => pts.map(([a, b]) => P(a, b));
  /** Rectangle between two page corners, as rect props. */
  const R = (x0: number, y0: number, x1: number, y1: number) => ({ x: X(x0), y: Y(y0), width: r(X(x1) - X(x0)), height: r(Y(y1) - Y(y0)) });
  /** Same box as x / y / w / h (CornerBolts, Housing…). */
  const B = (x0: number, y0: number, x1: number, y1: number) => ({ x: X(x0), y: Y(y0), w: r(X(x1) - X(x0)), h: r(Y(y1) - Y(y0)) });
  return { X, Y, P, PTS, R, B, k, ky };
}

/** Non-contact radar level transmitter on a roof nozzle; `y` is the roof surface. */
export function Radar({ x, y, h = 14 }: { x: number; y: number; h?: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x - 7} y={y - 4} width={14} height={4} rx={1} {...PAINT.raised} />
      <path d={`M ${x - 5} ${y - 4} L ${x + 5} ${y - 4} L ${x + 3.5} ${y - h + 4} L ${x - 3.5} ${y - h + 4} Z`} {...PAINT.body} />
      <rect x={x - 7} y={y - h - 2} width={14} height={7} rx={2.5} {...PAINT.raised} />
    </g>
  );
}

/** Vibrating-fork / point level switch through a wall: `dir` points away from the vessel. */
export function WallSwitch({ x, y, dir = 1 }: { x: number; y: number; dir?: 1 | -1 }) {
  const x0 = dir > 0 ? x : x - 14;
  return (
    <g aria-hidden="true">
      <rect x={x0} y={y - 3} width={14} height={6} rx={1} {...PAINT.shaft} />
      <rect x={dir > 0 ? x + 8 : x - 18} y={y - 7} width={10} height={14} rx={2.5} {...PAINT.raised} />
    </g>
  );
}

/** Refractory brick lining inside a recess. */
export function Brick({ x, y, w, h, row = 6, course = 14 }: { x: number; y: number; w: number; h: number; row?: number; course?: number }) {
  const lines: React.ReactNode[] = [];
  let i = 0;
  for (let yy = y + row; yy < y + h - 1; yy += row, i++) {
    lines.push(<line key={`h${yy}`} x1={x + 1} x2={x + w - 1} y1={yy} y2={yy} stroke={MX.fine} strokeWidth={0.6} />);
  }
  i = 0;
  for (let yy = y; yy < y + h - 1; yy += row, i++) {
    for (let xx = x + (i % 2 ? course / 2 : course); xx < x + w - 1; xx += course) {
      lines.push(<line key={`v${yy}-${xx}`} x1={xx} x2={xx} y1={yy} y2={Math.min(y + h, yy + row)} stroke={MX.fine} strokeWidth={0.6} />);
    }
  }
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={2} {...PAINT.recess} />
      {lines}
    </g>
  );
}

/** Labelled flow direction: hairline arrow plus a small upper-case label. */
export function FlowTag({
  x1,
  y1,
  x2,
  y2,
  label,
  lx,
  ly,
  anchor = "middle",
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
  lx?: number;
  ly?: number;
  anchor?: "start" | "middle" | "end";
}) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = 6;
  const p1: Pt = [x2 - h * Math.cos(a - 0.5), y2 - h * Math.sin(a - 0.5)];
  const p2: Pt = [x2 - h * Math.cos(a + 0.5), y2 - h * Math.sin(a + 0.5)];
  return (
    <g aria-hidden="true">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={MX.label} strokeWidth={1.2} />
      <path d={`M ${p1[0]} ${p1[1]} L ${x2} ${y2} L ${p2[0]} ${p2[1]} Z`} fill={MX.label} stroke={MX.label} strokeWidth={1} strokeLinejoin="round" />
      {label && (
        <MachineLabel x={lx ?? (x1 + x2) / 2} y={ly ?? y1 + 12} anchor={anchor} size={7.5}>
          {label}
        </MachineLabel>
      )}
    </g>
  );
}

/** Load cell under a weigh-frame leg. */
export function LoadCell({ x, y, w = 16 }: { x: number; y: number; w?: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x - w / 2} y={y} width={w} height={7} rx={1.5} {...PAINT.raised} />
      <rect x={x - w / 2 + 3} y={y + 2} width={w - 6} height={3} rx={1} {...PAINT.recess} />
      <rect x={x - w / 2 - 3} y={y + 7} width={w + 6} height={4} rx={1} {...PAINT.body} />
    </g>
  );
}

/** Flat steel plinth / foundation block with anchor bolts. */
export function Plinth({ x, y, w, h, bolts = true }: { x: number; y: number; w: number; h: number; bolts?: boolean }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={2} {...PAINT.body} />
      {bolts && h >= 10 && (
        <>
          <Bolt x={x + 7} y={y + h / 2} r={1.6} />
          <Bolt x={x + w - 7} y={y + h / 2} r={1.6} />
        </>
      )}
    </g>
  );
}

/** Small gearbox seen from the side with two gear outlines and bolted rim. */
export function Gearbox({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const r1 = h * 0.24;
  const r2 = h * 0.17;
  const cy = y + h * 0.55;
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={5} {...PAINT.body} />
      <rect x={x + w * 0.2} y={y - 4} width={w * 0.6} height={5} rx={1.5} {...PAINT.raised} />
      <circle cx={x + w * 0.36} cy={cy} r={r1} {...PAINT.raised} />
      <circle cx={x + w * 0.36} cy={cy} r={r1 * 0.35} {...PAINT.shaft} />
      <circle cx={x + w * 0.7} cy={cy} r={r2} {...PAINT.raised} />
      <circle cx={x + w * 0.7} cy={cy} r={r2 * 0.4} {...PAINT.shaft} />
      {Array.from({ length: 6 }).map((_, i) => (
        <Bolt key={i} x={x + 5 + (i * (w - 10)) / 5} y={y + h - 4} r={1.2} />
      ))}
    </g>
  );
}

/** Shaft encoder / speed pickup cap on a motor's non-drive end (finned cowl). */
export function EncoderCap({ x, cy, w = 16, h = 36 }: { x: number; cy: number; w?: number; h?: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={cy - h / 2} width={w} height={h} rx={w / 2} {...PAINT.body} />
      {[0.3, 0.5, 0.7].map((f) => (
        <line key={f} x1={x + w * f} x2={x + w * f} y1={cy - h / 2 + 5} y2={cy + h / 2 - 5} stroke={MX.fine} strokeWidth={1} />
      ))}
    </g>
  );
}
