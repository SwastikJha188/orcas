"use client";

/**
 * Shared parts for the clinker-side pyro drawings (BRN-01, CLR-01, HMR-01,
 * CSL-01): pipes and ducts, centrifugal fan sets, steel silos, Roots blower.
 * Everything paints through the ULTRON machine kit (MX / PAINT), so the parts
 * follow light and dark themes. Geometry helpers return the anchor points the
 * drawings use for their pads, so pads stay on the part they measure.
 */

import React from "react";
import { Bolt, Coupling, MX, Motor, PAINT } from "@/components/assets/machine-kit/machine-kit";

export type Pt = [number, number];

/* ------------------------------------------------------------------ */
/* Pipes and ducts                                                     */
/* ------------------------------------------------------------------ */

/** Brushed-metal pipe or duct along a polyline (rim, body, soft centre highlight). */
export function Pipe({ pts, w = 12 }: { pts: Pt[]; w?: number }) {
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"} ${x} ${y}`).join(" ");
  return (
    <g aria-hidden="true" fill="none" strokeLinejoin="round">
      <path d={d} stroke={MX.edge} strokeWidth={w} />
      <path d={d} stroke={MX.metal} strokeWidth={w - 3} />
      <path d={d} stroke={MX.metalHi} strokeWidth={Math.max(1, w * 0.16)} opacity={0.45} />
    </g>
  );
}

/** Pipe flange across a straight run. */
export function Flange({ x, y, w, vertical = false }: { x: number; y: number; w: number; vertical?: boolean }) {
  const t = 5;
  const l = w + 7;
  return vertical ? (
    <rect x={x - l / 2} y={y - t / 2} width={l} height={t} rx={1.2} {...PAINT.raised} aria-hidden="true" />
  ) : (
    <rect x={x - t / 2} y={y - l / 2} width={t} height={l} rx={1.2} {...PAINT.raised} aria-hidden="true" />
  );
}

/** Thin flow arrow (hairline with a small head), for air / material direction. */
export function FlowArrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = 5;
  const p1: Pt = [x2 - h * Math.cos(a - 0.45), y2 - h * Math.sin(a - 0.45)];
  const p2: Pt = [x2 - h * Math.cos(a + 0.45), y2 - h * Math.sin(a + 0.45)];
  return (
    <g aria-hidden="true">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={MX.label} strokeWidth={1} />
      <path d={`M ${p1[0]} ${p1[1]} L ${x2} ${y2} L ${p2[0]} ${p2[1]}`} fill="none" stroke={MX.label} strokeWidth={1} strokeLinejoin="round" />
    </g>
  );
}

/** Instrument stub on a wall: short stem and a transmitter head. */
export function Transmitter({ x, y, dir = "up", len = 10 }: { x: number; y: number; dir?: "up" | "down" | "left" | "right"; len?: number }) {
  const v = dir === "up" || dir === "down";
  const s = dir === "up" || dir === "left" ? -1 : 1;
  const hx = v ? x : x + s * len;
  const hy = v ? y + s * len : y;
  return (
    <g aria-hidden="true">
      {v ? (
        <rect x={x - 2} y={Math.min(y, hy)} width={4} height={len} {...PAINT.shaft} />
      ) : (
        <rect x={Math.min(x, hx)} y={y - 2} width={len} height={4} {...PAINT.shaft} />
      )}
      <rect x={hx - 6} y={hy - 5} width={12} height={10} rx={2.5} {...PAINT.raised} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Centrifugal fan set: volute, bearing pedestal, coupling, motor      */
/* ------------------------------------------------------------------ */

export interface FanSpec {
  cx: number;
  cy: number;
  r: number;
  /** 1: motor to the right of the volute; -1: mirrored, motor to the left. */
  dir?: 1 | -1;
  motorW: number;
  motorH: number;
  /** Top of the outlet duct stub that leaves the volute upward. */
  ductTop: number;
  /** Top of the common base plate. */
  baseY: number;
}

export function fanGeom({ cx, cy, r, dir = 1, motorW, motorH, ductTop, baseY }: FanSpec) {
  const X = (x: number) => (dir > 0 ? x : 2 * cx - x);
  const bw = Math.max(12, r * 0.42);
  const bh = Math.max(36, r * 0.95);
  const bx = cx + r * 0.92 + bw / 2;
  const cw = Math.max(9, r * 0.3);
  const ch = Math.max(16, r * 0.58);
  const cpx = bx + bw / 2 + 4 + cw / 2;
  const mx = cpx + cw / 2 + motorW * 0.14;
  const ow = r * 0.62;
  return {
    X,
    bw,
    bh,
    bx,
    cw,
    ch,
    cpx,
    mx,
    ow,
    ductTop,
    baseY,
    /** Outlet duct span (drawing x, left→right). */
    duct: [Math.min(X(cx - r), X(cx - r + ow)), Math.max(X(cx - r), X(cx - r + ow))] as Pt,
    bearing: [X(bx), cy] as Pt,
    bearingTop: [X(bx), cy - 10] as Pt,
    bearingBot: [X(bx), cy + 10] as Pt,
    terminal: [X(mx + motorW / 2), cy - motorH / 2 - motorH * 0.12] as Pt,
    motorBody: [X(mx + motorW / 2), cy] as Pt,
    hub: [X(cx), cy] as Pt,
    extent: [Math.min(X(cx - r - 6), X(mx + motorW * 1.04 + 6)), Math.max(X(cx - r - 6), X(mx + motorW * 1.04 + 6))] as Pt,
  };
}

/** Volute silhouette: circle plus the tangential outlet rising on the left. */
function volutePath(cx: number, cy: number, r: number, ow: number, top: number) {
  const xr = cx - r + ow;
  const yj = cy - Math.sqrt(r * r - (r - ow) * (r - ow));
  return `M ${cx - r} ${top} L ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${xr} ${yj} L ${xr} ${top} Z`;
}

export function FanSet(spec: FanSpec) {
  const { cx, cy, r, dir = 1, motorW, motorH, ductTop, baseY } = spec;
  const g = fanGeom(spec);
  const right = g.mx + motorW * 1.03;
  const left = cx - r - 4;
  const bolts = 10;
  return (
    <g aria-hidden="true" transform={dir < 0 ? `translate(${2 * cx} 0) scale(-1 1)` : undefined}>
      {/* base plate */}
      <rect x={left} y={baseY} width={right - left + 4} height={8} rx={2} {...PAINT.body} />
      {/* volute pedestal */}
      <path d={`M ${cx - r * 0.55} ${cy + r * 0.6} L ${cx + r * 0.55} ${cy + r * 0.6} L ${cx + r * 0.72} ${baseY} L ${cx - r * 0.72} ${baseY} Z`} {...PAINT.body} />
      {/* bearing pedestal */}
      <path d={`M ${g.bx - g.bw / 2 + 2} ${cy + g.bh / 2} H ${g.bx + g.bw / 2 - 2} L ${g.bx + g.bw / 2 + 2} ${baseY} H ${g.bx - g.bw / 2 - 2} Z`} {...PAINT.body} />
      {/* motor feet */}
      {[0.2, 0.8].map((f) => (
        <rect key={f} x={g.mx + motorW * f - 6} y={cy + motorH / 2 - 2} width={12} height={baseY - cy - motorH / 2 + 2} rx={1.5} {...PAINT.body} />
      ))}
      {/* shaft line */}
      <rect x={cx} y={cy - Math.max(2.5, r * 0.08)} width={g.mx - cx} height={Math.max(5, r * 0.16)} rx={1.5} {...PAINT.shaft} />
      {/* volute */}
      <path d={volutePath(cx, cy, r, g.ow, ductTop)} {...PAINT.body} />
      <line x1={cx - r} x2={cx - r + g.ow} y1={ductTop + 5} y2={ductTop + 5} stroke={MX.fine} strokeWidth={MX.wFine} />
      <circle cx={cx} cy={cy} r={r * 0.7} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      {Array.from({ length: bolts }).map((_, i) => {
        const a = (i / bolts) * Math.PI * 2 + 0.3;
        return <Bolt key={i} x={cx + Math.cos(a) * r * 0.86} y={cy + Math.sin(a) * r * 0.86} r={Math.max(1.3, r * 0.045)} />;
      })}
      <circle cx={cx} cy={cy} r={r * 0.34} {...PAINT.raised} />
      <circle cx={cx} cy={cy} r={r * 0.14} {...PAINT.shaft} />
      {/* bearing housing */}
      <rect x={g.bx - g.bw / 2} y={cy - g.bh / 2} width={g.bw} height={g.bh} rx={3} {...PAINT.raised} />
      <line x1={g.bx - g.bw / 2 + 2} x2={g.bx + g.bw / 2 - 2} y1={cy} y2={cy} stroke={MX.fine} strokeWidth={MX.wFine} />
      <Bolt x={g.bx} y={cy - g.bh / 2 + 4} r={1.4} />
      <Bolt x={g.bx} y={cy + g.bh / 2 - 4} r={1.4} />
      <Coupling x={g.cpx - g.cw / 2} y={cy - g.ch / 2} w={g.cw} h={g.ch} />
      {/* motor, mirrored so its shaft faces the fan */}
      <g transform={`translate(${2 * (g.mx + motorW / 2)} 0) scale(-1 1)`}>
        <Motor x={g.mx} y={cy - motorH / 2} w={motorW} h={motorH} />
      </g>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Steel silo / bin on legs                                            */
/* ------------------------------------------------------------------ */

export function Silo({
  x,
  w,
  roofY,
  cylBottom,
  coneBottom,
  outletW,
  legBottom,
  braceFrom,
  fill,
  rail = true,
  ladder = true,
}: {
  x: number;
  w: number;
  roofY: number;
  cylBottom: number;
  coneBottom: number;
  outletW: number;
  legBottom: number;
  /** Cross-bracing between the legs from this y down to legBottom. */
  braceFrom?: number;
  /** Material level (y) shown in a cut-away window; omit for a closed shell. */
  fill?: number;
  rail?: boolean;
  ladder?: boolean;
}) {
  const cx = x + w / 2;
  const peak = roofY - w * 0.07;
  const legs = [x + 6, x + w - 6];
  const rings = 4;
  const ringStep = (cylBottom - roofY) / (rings + 1);
  return (
    <g aria-hidden="true">
      {/* legs and bracing */}
      {legs.map((lx) => (
        <rect key={lx} x={lx - 4} y={cylBottom - 12} width={8} height={legBottom - cylBottom + 12} rx={1.5} {...PAINT.body} />
      ))}
      {braceFrom !== undefined && (
        <g>
          <line x1={legs[0] + 4} y1={braceFrom} x2={legs[1] - 4} y2={legBottom - 4} stroke={MX.edge} strokeWidth={1.4} />
          <line x1={legs[1] - 4} y1={braceFrom} x2={legs[0] + 4} y2={legBottom - 4} stroke={MX.edge} strokeWidth={1.4} />
          <line x1={legs[0] + 4} y1={braceFrom} x2={legs[1] - 4} y2={braceFrom} stroke={MX.edge} strokeWidth={1.4} />
        </g>
      )}
      {legs.map((lx) => (
        <rect key={`f${lx}`} x={lx - 9} y={legBottom - 4} width={18} height={6} rx={1.5} {...PAINT.raised} />
      ))}
      {/* cone and outlet */}
      <path d={`M ${x} ${cylBottom} L ${x + w} ${cylBottom} L ${cx + outletW / 2} ${coneBottom} L ${cx - outletW / 2} ${coneBottom} Z`} {...PAINT.cylinderV} />
      <line x1={x + w * 0.25} y1={cylBottom + 2} x2={cx - outletW / 4} y2={coneBottom - 2} stroke={MX.fine} strokeWidth={MX.wFine} />
      <line x1={x + w * 0.75} y1={cylBottom + 2} x2={cx + outletW / 4} y2={coneBottom - 2} stroke={MX.fine} strokeWidth={MX.wFine} />
      {/* shell */}
      <rect x={x} y={roofY} width={w} height={cylBottom - roofY} rx={4} {...PAINT.cylinderV} />
      {Array.from({ length: rings }).map((_, i) => (
        <line key={i} x1={x + 2} x2={x + w - 2} y1={roofY + ringStep * (i + 1)} y2={roofY + ringStep * (i + 1)} stroke={MX.fine} strokeWidth={MX.wFine} />
      ))}
      <rect x={x - 3} y={cylBottom - 6} width={w + 6} height={8} rx={2} {...PAINT.raised} />
      {fill !== undefined && (
        <g>
          <rect x={x + w * 0.16} y={roofY + 16} width={w * 0.2} height={cylBottom - roofY - 30} rx={3} {...PAINT.recess} />
          <rect x={x + w * 0.16 + 3} y={fill} width={w * 0.2 - 6} height={cylBottom - 17 - fill} rx={1.5} fill={MX.material} opacity={0.85} />
        </g>
      )}
      {/* roof */}
      <path d={`M ${x - 4} ${roofY + 1} L ${cx} ${peak} L ${x + w + 4} ${roofY + 1} Z`} {...PAINT.raised} />
      {rail && (
        <g>
          {Array.from({ length: 6 }).map((_, i) => {
            const px = x + 2 + (i * (w - 4)) / 5;
            return <line key={i} x1={px} x2={px} y1={peak - 16} y2={roofY - (Math.abs(px - cx) < w / 2 ? (w / 2 - Math.abs(px - cx)) * 0.14 : 0)} stroke={MX.edge} strokeWidth={1.2} />;
          })}
          <line x1={x + 2} x2={x + w - 2} y1={peak - 16} y2={peak - 16} stroke={MX.edge} strokeWidth={1.4} />
          <line x1={x + 2} x2={x + w - 2} y1={peak - 9} y2={peak - 9} stroke={MX.fine} strokeWidth={1} />
        </g>
      )}
      {ladder && (
        <g>
          <line x1={x + w + 6} x2={x + w + 6} y1={peak - 16} y2={cylBottom - 6} stroke={MX.edge} strokeWidth={1.2} />
          <line x1={x + w + 13} x2={x + w + 13} y1={peak - 16} y2={cylBottom - 6} stroke={MX.edge} strokeWidth={1.2} />
          {Array.from({ length: Math.floor((cylBottom - peak) / 9) }).map((_, i) => (
            <line key={i} x1={x + w + 6} x2={x + w + 13} y1={peak - 10 + i * 9} y2={peak - 10 + i * 9} stroke={MX.fine} strokeWidth={1} />
          ))}
        </g>
      )}
      <rect x={cx - outletW / 2 + 2} y={coneBottom} width={outletW - 4} height={10} rx={1.5} {...PAINT.body} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Roots (positive-displacement) blower                                */
/* ------------------------------------------------------------------ */

export function RootsBlower({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const cx = x + w / 2;
  const lobe = (cy: number, horizontal: boolean) => {
    const a = horizontal ? w * 0.3 : h * 0.15;
    const b = horizontal ? h * 0.11 : w * 0.2;
    return horizontal ? (
      <g>
        <ellipse cx={cx - a * 0.45} cy={cy} rx={a * 0.55} ry={b} {...PAINT.raised} />
        <ellipse cx={cx + a * 0.45} cy={cy} rx={a * 0.55} ry={b} {...PAINT.raised} />
        <circle cx={cx} cy={cy} r={2.6} {...PAINT.shaft} />
      </g>
    ) : (
      <g>
        <ellipse cx={cx} cy={cy - a * 0.45} rx={b} ry={a * 0.55} {...PAINT.raised} />
        <ellipse cx={cx} cy={cy + a * 0.45} rx={b} ry={a * 0.55} {...PAINT.raised} />
        <circle cx={cx} cy={cy} r={2.6} {...PAINT.shaft} />
      </g>
    );
  };
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={9} {...PAINT.body} />
      <rect x={x + 5} y={y + 5} width={w - 10} height={h - 10} rx={6} {...PAINT.recess} />
      {lobe(y + h * 0.32, true)}
      {lobe(y + h * 0.68, true)}
      <Bolt x={x + 7} y={y + 7} r={1.6} />
      <Bolt x={x + w - 7} y={y + 7} r={1.6} />
      <Bolt x={x + 7} y={y + h - 7} r={1.6} />
      <Bolt x={x + w - 7} y={y + h - 7} r={1.6} />
    </g>
  );
}
