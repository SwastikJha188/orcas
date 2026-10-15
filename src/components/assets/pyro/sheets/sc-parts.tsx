"use client";

/**
 * Shared parts for the clinker-cooler and clinker-handling sheets D09–D11:
 * the grate-cooler casing with its clinker bed and grate plates, the
 * under-grate air compartments, the cooler support frame and the IR
 * pyrometer. Everything paints through the ULTRON machine kit (MX / PAINT).
 */

import React from "react";
import { Bolt, CornerBolts, Housing, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";

/**
 * Grate-cooler casing seen from the side: hood housing, cut-away showing the
 * clinker bed on the grate, and the row of grate plates under the bed.
 * `bedL` / `bedR` are the bed surface heights (y) at the inlet and outlet end.
 */
export function GrateCasing({
  x,
  y,
  w,
  h,
  bedL,
  bedR,
  hot = false,
  label,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  bedL: number;
  bedR: number;
  /** Glowing hot zone at the inlet end (D09). */
  hot?: boolean;
  label: string;
}) {
  const ix = x + 10;
  const iw = w - 20;
  const top = y + 22;
  const bottom = y + h - 14;
  /** Bed surface: steep cooling-down near the inlet, near flat further on. */
  const surf = (px: number) => {
    const t = (px - ix) / iw;
    return bedL + (bedR - bedL) * (1 - (1 - t) * (1 - t) * 0.35 - 0.65 * (1 - t));
  };
  const steps = 24;
  const surfPath = Array.from({ length: steps + 1 }, (_, i) => {
    const px = ix + 2 + ((iw - 4) * i) / steps;
    return `${i ? "L" : "M"} ${px.toFixed(1)} ${surf(px).toFixed(1)}`;
  }).join(" ");
  const nodules: Array<[number, number]> = [];
  for (let px = ix + 8; px < ix + iw - 6; px += 11) {
    for (let py = bottom - 5; py > surf(px) + 4; py -= 8) nodules.push([px + ((py / 8) % 2 ? 5.5 : 0), py]);
  }
  const plates = Math.floor((iw - 4) / 11);
  return (
    <g aria-hidden="true">
      <Housing x={x} y={y} w={w} h={h} rx={10} bolts={false} />
      <CornerBolts x={x} y={y} w={w} h={20} inset={9} r={2} />
      <rect x={ix} y={top} width={iw} height={bottom - top} rx={5} {...PAINT.recess} />
      <path d={`${surfPath} L ${ix + iw - 2} ${bottom} L ${ix + 2} ${bottom} Z`} fill={MX.material} opacity={0.82} />
      {nodules.map(([px, py], i) => (
        <circle key={i} cx={px} cy={py} r={1.3} fill={MX.deep} opacity={0.35} />
      ))}
      <path d={surfPath} fill="none" stroke={MX.material} strokeWidth={1.2} />
      {hot && <ellipse cx={ix + 104} cy={surf(ix + 60) + 10} rx={100} ry={26} fill={MX.heat} opacity={0.9} transform={`translate(${2 * (ix + 104)} 0) scale(-1 1)`} />}
      {/* grate plates */}
      {Array.from({ length: plates }).map((_, i) => (
        <rect key={i} x={ix + 2 + i * 11} y={bottom} width={9.5} height={7} rx={1.2} {...PAINT.raised} />
      ))}
      <line x1={ix} x2={ix + iw} y1={bottom + 7.5} y2={bottom + 7.5} stroke={MX.edge} strokeWidth={1} />
      <MachineLabel x={x + w / 2} y={y + 15} size={7.5}>{label}</MachineLabel>
    </g>
  );
}

/** Under-grate air compartment with its static-pressure tap nozzle. */
export function Compartment({ x, y, w, h, n, tap }: { x: number; y: number; w: number; h: number; n: number; tap: [number, number] }) {
  return (
    <g aria-hidden="true">
      <Housing x={x} y={y} w={w} h={h} rx={6} bolts={false} />
      <Bolt x={x + 10} y={y + 10} r={1.8} />
      <Bolt x={x + w - 10} y={y + 10} r={1.8} />
      {/* impulse-line nozzle */}
      <rect x={tap[0] - 1.5} y={y + 6} width={3} height={tap[1] - y - 12} {...PAINT.shaft} />
      <rect x={tap[0] - 8} y={tap[1] - 7} width={16} height={14} rx={3.5} {...PAINT.raised} />
      <MachineLabel x={x + 12} y={y + h - 10} anchor="start" size={7}>{`COMPARTMENT ${n}`}</MachineLabel>
    </g>
  );
}

/** Cooler support frame: end columns from the casing down to the basement floor. */
export function CoolerFrame({ x1, x2, top, floor, floorX1, floorX2 }: { x1: number; x2: number; top: number; floor: number; floorX1: number; floorX2: number }) {
  return (
    <g aria-hidden="true">
      {[x1, x2].map((cx) => (
        <rect key={cx} x={cx - 4} y={top} width={8} height={floor - top} rx={1.5} {...PAINT.body} />
      ))}
      <rect x={floorX1} y={floor} width={floorX2 - floorX1} height={9} rx={2} {...PAINT.body} />
      {Array.from({ length: Math.floor((floorX2 - floorX1 - 20) / 60) + 1 }).map((_, i) => (
        <Bolt key={i} x={floorX1 + 10 + i * 60} y={floor + 4.5} r={1.5} />
      ))}
    </g>
  );
}

/** Process material falling through a chute: a few clinker lumps. */
export function Lumps({ pts, r = 2.8 }: { pts: Array<[number, number]>; r?: number }) {
  return (
    <g aria-hidden="true">
      {pts.map(([px, py], i) => (
        <rect key={i} x={px - r} y={py - r * 0.85} width={r * 2} height={r * 1.7} rx={r * 0.45} fill={MX.material} transform={`rotate(${(i * 37) % 90} ${px} ${py})`} />
      ))}
    </g>
  );
}
