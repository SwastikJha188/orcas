/**
 * Shared parts for the KLN-01 line sheets K-0 … K-4 (inlet, gear train,
 * auxiliary drive, gearbox lubrication). Every shape paints through the ULTRON
 * machine kit (MX / PAINT), so it follows the light and dark themes.
 */
import React from "react";
import { Bolt, CornerBolts, MX, PAINT } from "@/components/assets/machine-kit/machine-kit";

export type Pt = [number, number];

/** Steel column / leg with a base plate and two anchor bolts; `y2` is the ground. */
export function Column({ x, y1, y2, w = 16 }: { x: number; y1: number; y2: number; w?: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x - w / 2} y={y1} width={w} height={y2 - y1 - 5} rx={1.5} {...PAINT.cylinderV} />
      <rect x={x - w / 2 - 7} y={y2 - 6} width={w + 14} height={6} rx={1.5} {...PAINT.raised} />
      <Bolt x={x - w / 2 - 3.5} y={y2 - 3} r={1.3} />
      <Bolt x={x + w / 2 + 3.5} y={y2 - 3} r={1.3} />
    </g>
  );
}

/** Concrete pier / foundation block with a grout bed, chamfered top corners and anchor bolts. */
export function Pier({ x, y, w, h, bolts = 2 }: { x: number; y: number; w: number; h: number; bolts?: number }) {
  return (
    <g aria-hidden="true">
      <path d={`M ${x + 4} ${y} H ${x + w - 4} L ${x + w} ${y + 4} V ${y + h} H ${x} V ${y + 4} Z`} {...PAINT.body} />
      <line x1={x + 4} x2={x + w - 4} y1={y + 6} y2={y + 6} {...PAINT.hair} />
      {Array.from({ length: bolts }).map((_, i) => (
        <Bolt key={i} x={x + 10 + (i * (w - 20)) / Math.max(1, bolts - 1)} y={y + 13} r={1.6} />
      ))}
    </g>
  );
}

/** Thermocouple / RTD: terminal head, process flange and sheath running along +x (dir 1) or −x (dir −1). */
export function ThermoProbe({ x, y, len, dir = 1, head = 12 }: { x: number; y: number; len: number; dir?: 1 | -1; head?: number }) {
  const sx = dir > 0 ? x : x - len;
  return (
    <g aria-hidden="true">
      <rect x={sx} y={y - 2} width={len} height={4} rx={1.5} {...PAINT.shaft} />
      <rect x={x - (dir > 0 ? 0 : 4)} y={y - 6} width={4} height={12} rx={1} {...PAINT.raised} />
      <rect x={dir > 0 ? x - head : x} y={y - head / 2} width={head} height={head} rx={head / 2.6} {...PAINT.body} />
      <circle cx={dir > 0 ? x - head / 2 : x + head / 2} cy={y} r={head * 0.18} {...PAINT.recess} />
    </g>
  );
}

/**
 * Main gearbox in side elevation, as on the K-sheets: bolted housing with an
 * inspection cover on top, split line, cooling ribs, input pinion and output
 * wheel bearing covers, breather, oil sight glass and drain plug.
 * `ig` / `og` are the input / output gear centres and radii relative to the box.
 */
export function GearboxSide({
  x,
  y,
  w,
  h,
  ig,
  og,
  cover = true,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  /** [cx, cy, r] of the input (small) gear, relative to the housing. */
  ig: [number, number, number];
  /** [cx, cy, r] of the output (large) gear, relative to the housing. */
  og: [number, number, number];
  cover?: boolean;
}) {
  const ribs = Math.max(3, Math.round(w / 34));
  const split = y + h * 0.5;
  const ring = (cx: number, cy: number, r: number, key: string) => (
    <g key={key}>
      <circle cx={cx} cy={cy} r={r} {...PAINT.raised} />
      <circle cx={cx} cy={cy} r={r * 0.82} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2 + 0.2;
        return <Bolt key={i} x={cx + Math.cos(a) * r * 0.91} y={cy + Math.sin(a) * r * 0.91} r={Math.max(1, r * 0.04)} />;
      })}
      <circle cx={cx} cy={cy} r={r * 0.38} {...PAINT.body} />
      <circle cx={cx} cy={cy} r={r * 0.24} {...PAINT.recess} />
    </g>
  );
  return (
    <g aria-hidden="true">
      {cover && (
        <>
          <rect x={x + w * 0.1} y={y - 11} width={w * 0.8} height={13} rx={3} {...PAINT.raised} />
          {Array.from({ length: 6 }).map((_, i) => (
            <Bolt key={i} x={x + w * 0.13 + (i * w * 0.74) / 5} y={y - 5} r={1.2} />
          ))}
          {/* breather */}
          <rect x={x + w * 0.62} y={y - 21} width={8} height={10} rx={1.5} {...PAINT.shaft} />
          <rect x={x + w * 0.62 - 3} y={y - 25} width={14} height={5} rx={2} {...PAINT.raised} />
        </>
      )}
      <rect x={x} y={y} width={w} height={h} rx={10} {...PAINT.body} />
      <rect x={x + 6} y={y + 6} width={w - 12} height={h - 12} rx={6} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      {Array.from({ length: ribs }).map((_, i) => {
        const rx = x + ((i + 1) * w) / (ribs + 1);
        return <line key={i} x1={rx} x2={rx} y1={y + 10} y2={y + h - 10} stroke={MX.fine} strokeWidth={1.2} opacity={0.5} />;
      })}
      <line x1={x + 2} x2={x + w - 2} y1={split} y2={split} stroke={MX.edge} strokeWidth={1.4} />
      {Array.from({ length: 7 }).map((_, i) => (
        <Bolt key={i} x={x + 14 + (i * (w - 28)) / 6} y={split - 4} r={1.2} />
      ))}
      <CornerBolts x={x} y={y} w={w} h={h} inset={10} r={2} />
      {ring(x + og[0], y + og[1], og[2], "o")}
      {ring(x + ig[0], y + ig[1], ig[2], "i")}
      {/* oil sight glass and drain plug */}
      <rect x={x + w - 22} y={y + h * 0.66} width={10} height={16} rx={2} {...PAINT.recess} />
      <rect x={x + w - 20} y={y + h * 0.66 + 8} width={6} height={6} rx={1} {...PAINT.material} />
      <rect x={x + 18} y={y + h - 4} width={10} height={7} rx={1.5} {...PAINT.shaft} />
    </g>
  );
}

/** Steel skid / bedplate with an inset rail and anchor bolts. */
export function Bedplate({ x, y, w, h = 10, bolts = 4 }: { x: number; y: number; w: number; h?: number; bolts?: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={2} {...PAINT.raised} />
      <line x1={x + 3} x2={x + w - 3} y1={y + h - 3} y2={y + h - 3} {...PAINT.hair} />
      {Array.from({ length: bolts }).map((_, i) => (
        <Bolt key={i} x={x + 8 + (i * (w - 16)) / Math.max(1, bolts - 1)} y={y + h / 2 - 0.5} r={1.4} />
      ))}
    </g>
  );
}

/** Flange pair across a pipe run (vertical = flange plate horizontal). */
export function PipeFlange({ x, y, d, vertical = false }: { x: number; y: number; d: number; vertical?: boolean }) {
  const l = d + 6;
  return vertical ? (
    <rect x={x - l / 2} y={y - 2.5} width={l} height={5} rx={1.2} {...PAINT.raised} aria-hidden="true" />
  ) : (
    <rect x={x - 2.5} y={y - l / 2} width={5} height={l} rx={1.2} {...PAINT.raised} aria-hidden="true" />
  );
}
