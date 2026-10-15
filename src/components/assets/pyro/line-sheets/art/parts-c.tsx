/**
 * Group C (CLR-01 grate clinker cooler) parts for the line-sheet drawings:
 * the cooler casing with refractory, clinker bed and reciprocating grate, the
 * centrifugal cooling / vent fan set (spiral volute, inlet ring and impeller,
 * split bearing, coupling guard, motor on its stool, base frame), round air
 * ducts with flanges, louvre dampers and bellows, the hydraulic cylinder and
 * hydraulic hoses. Everything paints through the ULTRON machine kit.
 */
import React from "react";
import { Bolt, MX, Motor, PAINT } from "@/components/assets/machine-kit/machine-kit";

export type Pt = [number, number];

/* ------------------------------------------------------------------ */
/* Cooler casing: housing, refractory roof, gas space, bed, grate      */
/* ------------------------------------------------------------------ */

export function CoolerCasing({
  x,
  y,
  w,
  h,
  grate,
  bedL,
  bedR,
  hot = 0,
  doors = [],
  carriage = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Top of the grate plates (y). */
  grate: number;
  /** Bed surface y at the left / right end. */
  bedL: number;
  bedR: number;
  /** Width of the glowing hot zone from the left end (0: none). */
  hot?: number;
  /** x of inspection doors in the side wall above the bed. */
  doors?: number[];
  /** Moving-frame carriage with support rollers under the grate. */
  carriage?: boolean;
}) {
  const ix = x + 9;
  const iw = w - 18;
  const top = y + 9;
  const surf = (px: number) => {
    const t = (px - ix) / iw;
    return bedL + (bedR - bedL) * (1 - (1 - t) * (1 - t));
  };
  const steps = 30;
  const sp = Array.from({ length: steps + 1 }, (_, i) => {
    const px = ix + 1 + ((iw - 2) * i) / steps;
    return `${i ? "L" : "M"} ${px.toFixed(1)} ${surf(px).toFixed(1)}`;
  }).join(" ");
  const nod: Pt[] = [];
  for (let px = ix + 6; px < ix + iw - 4; px += 9) {
    for (let py = grate - 4; py > surf(px) + 3; py -= 6.5) nod.push([px + (Math.round(py / 6.5) % 2 ? 4.5 : 0), py]);
  }
  const plates = Math.floor((iw - 2) / 10);
  const ribs = Math.floor(w / 46);
  const clip = `bed${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const bedPath = `${sp} L ${ix + iw - 1} ${grate} L ${ix + 1} ${grate} Z`;
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={10} {...PAINT.body} />
      {/* outer skin stiffeners */}
      {Array.from({ length: ribs }).map((_, i) => {
        const rx = x + 23 + i * 46;
        return <line key={i} x1={rx} x2={rx} y1={y + 2} y2={top} {...PAINT.hair} />;
      })}
      <rect x={ix} y={top} width={iw} height={grate - top + 8} rx={5} {...PAINT.recess} />
      {/* refractory lining under the roof */}
      <rect x={ix + 1} y={top + 1} width={iw - 2} height={8} fill={MX.flatRaised} opacity={0.55} />
      {Array.from({ length: Math.floor(iw / 14) }).map((_, i) => (
        <line key={i} x1={ix + 7 + i * 14} x2={ix + 7 + i * 14} y1={top + 1 + (i % 2) * 4} y2={top + 5 + (i % 2) * 4} {...PAINT.hair} />
      ))}
      <line x1={ix + 1} x2={ix + iw - 1} y1={top + 5} y2={top + 5} {...PAINT.hair} />
      <line x1={ix + 1} x2={ix + iw - 1} y1={top + 9} y2={top + 9} stroke={MX.fine} strokeWidth={1} />
      {/* inspection doors */}
      {doors.map((dx) => (
        <g key={dx}>
          <rect x={dx - 9} y={top + 16} width={18} height={14} rx={2} {...PAINT.raised} />
          <rect x={dx - 6} y={top + 19} width={12} height={8} rx={1.5} {...PAINT.recess} />
          <rect x={dx + 9} y={top + 20} width={3} height={6} rx={1} {...PAINT.shaft} />
        </g>
      ))}
      {/* clinker bed */}
      <clipPath id={clip}>
        <path d={bedPath} />
      </clipPath>
      <path d={bedPath} fill={MX.material} opacity={0.85} />
      {hot > 0 && (
        <g clipPath={`url(#${clip})`}>
          <ellipse cx={ix + hot * 0.55} cy={grate - (grate - bedL) * 0.45} rx={hot * 0.6} ry={(grate - bedL) * 0.9} fill={MX.heat} transform={`translate(${2 * (ix + hot * 0.55)} 0) scale(-1 1)`} />
        </g>
      )}
      {nod.map(([px, py], i) => (
        <circle key={i} cx={px} cy={py} r={1.2} fill={MX.deep} opacity={0.3} />
      ))}
      <path d={sp} fill="none" stroke={MX.material} strokeWidth={1.2} />
      {/* grate plates: fixed and moving rows alternate */}
      {Array.from({ length: plates }).map((_, i) => (
        <rect key={i} x={ix + 1.5 + i * 10} y={grate + (i % 2 ? 1.5 : 0)} width={8.6} height={5} rx={1} {...PAINT.raised} />
      ))}
      <line x1={ix + 1} x2={ix + iw - 1} y1={grate + 7} y2={grate + 7} stroke={MX.edge} strokeWidth={1.2} />
      {carriage && (
        <g>
          {Array.from({ length: Math.floor(iw / 70) }).map((_, i) => {
            const cx = ix + 35 + i * 70;
            return (
              <g key={i}>
                <circle cx={cx} cy={grate + 12} r={4} {...PAINT.shaft} />
                <circle cx={cx} cy={grate + 12} r={1.4} fill={MX.deep} />
              </g>
            );
          })}
          <line x1={ix + 4} x2={ix + iw - 4} y1={grate + 16.5} y2={grate + 16.5} stroke={MX.metal} strokeWidth={1.6} />
        </g>
      )}
      <Bolt x={x + 9} y={y + h - 9} r={2} />
      <Bolt x={x + w - 9} y={y + h - 9} r={2} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Centrifugal fan set                                                 */
/* ------------------------------------------------------------------ */

export interface FanSetSpec {
  cx: number;
  cy: number;
  /** Largest volute radius (at the outlet wall). */
  r: number;
  /** Outlet top (y). */
  top: number;
  /** Outlet side: the outlet wall is tangent to the volute on that side. */
  outlet: "left" | "right";
  /** Base-frame top (y). */
  base: number;
  /** Bearing centre x, width, height. */
  bx: number;
  bw: number;
  bh: number;
  /** Motor frame left x, width, height (shaft line = cy, fan cowl to the right). */
  mx: number;
  mw: number;
  mh: number;
}

/** Spiral volute silhouette. */
export function volutePath(cx: number, cy: number, r: number, top: number, s: 1 | -1, k = 1) {
  const r0 = r * 0.9;
  const pts: string[] = [];
  for (let a = -90; a <= 180; a += 7.5) {
    const rr = (r0 + ((r - r0) * (a + 90)) / 270) * k;
    const t = (a * Math.PI) / 180;
    pts.push(`L ${(cx + s * rr * Math.cos(t)).toFixed(2)} ${(cy + rr * Math.sin(t)).toFixed(2)}`);
  }
  return { r0, d: `M ${cx} ${top} L ${cx} ${(cy - r0 * k).toFixed(2)} ${pts.join(" ")} L ${cx - s * r * k} ${top} Z`, open: `M ${cx} ${(cy - r0 * k).toFixed(2)} ${pts.join(" ")} L ${cx - s * r * k} ${top}` };
}

export function CentrifugalFan(f: FanSetSpec) {
  const { cx, cy, r, top, base, bx, bw, bh, mx, mw, mh } = f;
  const s: 1 | -1 = f.outlet === "left" ? 1 : -1;
  const v = volutePath(cx, cy, r, top, s);
  const inner = volutePath(cx, cy, r, top + 4, s, 0.9);
  const k = r / 68;
  const br = Math.max(1, 1.9 * k);
  const oL = Math.min(cx, cx - s * r);
  const oR = Math.max(cx, cx - s * r);
  const shH = Math.max(3.5, r * 0.1);
  const bt = Math.max(5, 9 * k);
  const left = Math.min(cx - r, oL) - 5;
  const right = mx + mw * 1.14 + 5;
  const motorBot = cy + mh / 2;
  const blades = 10;
  const bolts: Pt[] = [];
  for (let a = -75; a <= 170; a += 24) {
    const rr = v.r0 + ((r - v.r0) * (a + 90)) / 270 - 5.5 * k - 1;
    const t = (a * Math.PI) / 180;
    bolts.push([cx + s * rr * Math.cos(t), cy + rr * Math.sin(t)]);
  }
  return (
    <g aria-hidden="true">
      {/* base frame with anchor bolts and grout line */}
      <rect x={left} y={base} width={right - left} height={bt} rx={2} {...PAINT.body} />
      <line x1={left + 3} x2={right - 3} y1={base + bt * 0.5} y2={base + bt * 0.5} {...PAINT.hair} />
      {Array.from({ length: Math.max(2, Math.round((right - left) / 38)) + 1 }).map((_, i, a) => (
        <Bolt key={i} x={left + 5 + ((right - left - 10) * i) / (a.length - 1)} y={base + bt / 2} r={Math.max(1, 1.5 * k + 0.3)} />
      ))}
      {/* volute saddle */}
      <path d={`M ${cx - r * 0.5} ${cy + r * 0.55} H ${cx + r * 0.5} L ${cx + r * 0.78} ${base} H ${cx - r * 0.78} Z`} {...PAINT.body} />
      {/* bearing pedestal */}
      <path d={`M ${bx - bw / 2 + 1} ${cy + bh * 0.3} H ${bx + bw / 2 - 1} L ${bx + bw / 2 + 3 * k + 1} ${base} H ${bx - bw / 2 - 3 * k - 1} Z`} {...PAINT.body} />
      {/* motor stool and feet */}
      <rect x={mx + mw * 0.06} y={motorBot + 3} width={mw * 0.88} height={base - motorBot - 3} rx={2} {...PAINT.body} />
      {base - motorBot > 14 && <rect x={mx + mw * 0.06 + 4} y={motorBot + 7} width={mw * 0.88 - 8} height={base - motorBot - 11} rx={1.5} fill="none" stroke={MX.fine} strokeWidth={0.8} />}
      {[0.12, 0.7].map((t) => (
        <g key={t}>
          <rect x={mx + mw * t} y={motorBot - 2} width={mw * 0.18} height={5} rx={1} {...PAINT.raised} />
          <Bolt x={mx + mw * (t + 0.09)} y={motorBot + 0.5} r={Math.max(0.9, 1.2 * k)} />
        </g>
      ))}
      {/* shaft line */}
      <rect x={cx} y={cy - shH / 2} width={mx - cx} height={shH} rx={1} {...PAINT.shaft} />
      {/* volute casing */}
      <path d={v.d} {...PAINT.body} />
      <path d={inner.open} fill="none" stroke={MX.fine} strokeWidth={0.8} />
      {bolts.map(([px, py], i) => (
        <Bolt key={i} x={px} y={py} r={br} />
      ))}
      {/* outlet flange */}
      <rect x={oL - 3 * k - 1} y={top - 2.5} width={oR - oL + 6 * k + 2} height={5} rx={1.2} {...PAINT.raised} />
      {r > 40 && (
        <g>
          {/* inspection door in the outlet throat, drain plug at the bottom */}
          <rect x={(oL + oR) / 2 - 10 * k} y={top + 10 * k} width={20 * k} height={16 * k} rx={2} {...PAINT.raised} />
          <rect x={(oL + oR) / 2 - 7 * k} y={top + 13 * k} width={14 * k} height={10 * k} rx={1.5} {...PAINT.recess} />
          <rect x={cx - 3} y={cy + r * 0.97} width={6} height={4} rx={1} {...PAINT.shaft} />
        </g>
      )}
      {/* inlet ring, inlet cone and impeller */}
      <circle cx={cx} cy={cy} r={r * 0.52} {...PAINT.raised} />
      {Array.from({ length: 8 }).map((_, i) => {
        const t = (i / 8) * Math.PI * 2 + 0.2;
        return <Bolt key={i} x={cx + Math.cos(t) * r * 0.47} y={cy + Math.sin(t) * r * 0.47} r={Math.max(0.8, 1.4 * k)} />;
      })}
      <circle cx={cx} cy={cy} r={r * 0.41} {...PAINT.recess} />
      {Array.from({ length: blades }).map((_, i) => {
        const t = (i / blades) * Math.PI * 2;
        const a1 = r * 0.13;
        const a2 = r * 0.38;
        const p1: Pt = [cx + Math.cos(t) * a1, cy + Math.sin(t) * a1];
        const p2: Pt = [cx + Math.cos(t - s * 0.75) * a2, cy + Math.sin(t - s * 0.75) * a2];
        const c: Pt = [cx + Math.cos(t - s * 0.2) * r * 0.3, cy + Math.sin(t - s * 0.2) * r * 0.3];
        return <path key={i} d={`M ${p1[0]} ${p1[1]} Q ${c[0]} ${c[1]} ${p2[0]} ${p2[1]}`} fill="none" stroke={MX.metal} strokeWidth={Math.max(1, 2.4 * k)} strokeLinecap="round" />;
      })}
      <circle cx={cx} cy={cy} r={r * 0.13} {...PAINT.shaft} />
      <circle cx={cx} cy={cy} r={Math.max(1.2, r * 0.045)} fill={MX.deep} />
      {/* inlet vane control lever */}
      {r > 30 && (
        <g>
          <line x1={cx + s * r * 0.36} y1={cy - r * 0.36} x2={cx + s * r * 0.6} y2={cy - r * 0.6} stroke={MX.edge} strokeWidth={2.4 * k + 0.6} strokeLinecap="round" />
          <circle cx={cx + s * r * 0.6} cy={cy - r * 0.6} r={2.4 * k + 0.6} {...PAINT.shaft} />
        </g>
      )}
      {/* split bearing housing */}
      <rect x={bx - bw / 2} y={cy - bh / 2} width={bw} height={bh} rx={3} {...PAINT.raised} />
      <line x1={bx - bw / 2 + 1.5} x2={bx + bw / 2 - 1.5} y1={cy} y2={cy} stroke={MX.fine} strokeWidth={1} />
      <rect x={bx - bw / 2 - 1.5} y={cy - shH / 2 - 1} width={bw + 3} height={shH + 2} rx={1} fill="none" stroke={MX.fine} strokeWidth={0.8} />
      {bh > 30 && (
        <g>
          <Bolt x={bx - bw / 2 + 3.5} y={cy - 5} r={1.2} />
          <Bolt x={bx + bw / 2 - 3.5} y={cy - 5} r={1.2} />
          <Bolt x={bx - bw / 2 + 3.5} y={cy + 5} r={1.2} />
          <Bolt x={bx + bw / 2 - 3.5} y={cy + 5} r={1.2} />
          <rect x={bx - 1.5} y={cy - bh / 2 - 4} width={3} height={4} {...PAINT.shaft} />
        </g>
      )}
      {/* coupling guard (mesh) */}
      {mx - (bx + bw / 2) > 5 && (
        <g>
          <rect x={bx + bw / 2 + 1} y={cy - mh * 0.24} width={mx - bx - bw / 2 - 2} height={mh * 0.48} rx={2} {...PAINT.body} />
          <rect x={bx + bw / 2 + 2.5} y={cy - mh * 0.24 + 2.5} width={mx - bx - bw / 2 - 5} height={mh * 0.48 - 5} rx={1} {...PAINT.recess} />
          {Array.from({ length: Math.floor((mh * 0.48 - 5) / 4) }).map((_, i) => (
            <line key={i} x1={bx + bw / 2 + 2.5} x2={mx - 2.5} y1={cy - mh * 0.24 + 4.5 + i * 4} y2={cy - mh * 0.24 + 4.5 + i * 4} {...PAINT.hair} />
          ))}
        </g>
      )}
      {/* motor, fan cowl to the right */}
      <g transform={`translate(${2 * (mx + mw / 2)} 0) scale(-1 1)`}>
        <Motor x={mx} y={cy - mh / 2} w={mw} h={mh} />
      </g>
      {/* lifting eye, cable gland and conduit */}
      <circle cx={mx + mw * 0.16} cy={cy - mh / 2 - 2.6 * k - 1} r={2.4 * k + 0.6} fill="none" stroke={MX.edge} strokeWidth={1.2} />
      <rect x={mx + mw * 0.68} y={cy - mh / 2 - mh * 0.15} width={mw * 0.07} height={mh * 0.08} rx={1} {...PAINT.shaft} />
      {mh > 34 && <path d={`M ${mx + mw * 0.75} ${cy - mh / 2 - mh * 0.11} H ${mx + mw * 0.98} V ${cy}`} fill="none" stroke={MX.fine} strokeWidth={1.4} strokeLinejoin="round" />}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Round air ducts                                                     */
/* ------------------------------------------------------------------ */

/** Vertical round duct between y1 and y2 with flanges at both ends. */
export function VDuct({ x, w, y1, y2, flanges = true }: { x: number; w: number; y1: number; y2: number; flanges?: boolean }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y1} width={w} height={y2 - y1} {...PAINT.cylinderV} />
      {flanges && (
        <g>
          <DuctFlange x={x} w={w} y={y1 + 2} />
          <DuctFlange x={x} w={w} y={y2 - 2} />
        </g>
      )}
    </g>
  );
}

export function DuctFlange({ x, w, y }: { x: number; w: number; y: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x - 3} y={y - 2.5} width={w + 6} height={5} rx={1.2} {...PAINT.raised} />
      <circle cx={x - 0.5} cy={y} r={0.9} fill={MX.deep} />
      <circle cx={x + w + 0.5} cy={y} r={0.9} fill={MX.deep} />
    </g>
  );
}

/** Louvre damper section in a vertical duct, actuator to the side. */
export function LouvreDamper({ x, w, y, h, side = 1 }: { x: number; w: number; y: number; h: number; side?: 1 | -1 }) {
  const ax = side > 0 ? x + w + 3 : x - 3 - 14;
  return (
    <g aria-hidden="true">
      <rect x={x - 2} y={y} width={w + 4} height={h} rx={2} {...PAINT.body} />
      <DuctFlange x={x} w={w} y={y + 1} />
      <DuctFlange x={x} w={w} y={y + h - 1} />
      {Array.from({ length: 3 }).map((_, i) => {
        const yy = y + ((i + 1) * h) / 4;
        return <line key={i} x1={x + 2} x2={x + w - 2} y1={yy - 2.5} y2={yy + 2.5} stroke={MX.metal} strokeWidth={1.6} strokeLinecap="round" />;
      })}
      <line x1={side > 0 ? x + w + 2 : x - 2} x2={side > 0 ? ax + 4 : ax + 10} y1={y + h / 2} y2={y + h / 2} stroke={MX.edge} strokeWidth={2} />
      <rect x={ax} y={y + h / 2 - 8} width={14} height={16} rx={3} {...PAINT.raised} />
      <rect x={ax + 3} y={y + h / 2 - 4} width={8} height={8} rx={1.5} {...PAINT.recess} />
    </g>
  );
}

/** Fabric / metal expansion bellows in a vertical duct. */
export function Bellows({ x, w, y, h }: { x: number; w: number; y: number; h: number }) {
  const n = Math.max(3, Math.round(h / 4));
  const d = Array.from({ length: n + 1 }, (_, i) => `${i ? "L" : "M"} ${x - (i % 2 ? 3 : 0)} ${y + (h * i) / n}`).join(" ");
  const d2 = Array.from({ length: n + 1 }, (_, i) => `${i ? "L" : "M"} ${x + w + (i % 2 ? 3 : 0)} ${y + (h * i) / n}`).join(" ");
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} fill={MX.flatBody} />
      {Array.from({ length: n - 1 }).map((_, i) => (
        <line key={i} x1={x} x2={x + w} y1={y + (h * (i + 1)) / n} y2={y + (h * (i + 1)) / n} {...PAINT.hair} />
      ))}
      <path d={d} fill="none" stroke={MX.edge} strokeWidth={1.2} strokeLinejoin="round" />
      <path d={d2} fill="none" stroke={MX.edge} strokeWidth={1.2} strokeLinejoin="round" />
      <DuctFlange x={x} w={w} y={y} />
      <DuctFlange x={x} w={w} y={y + h} />
    </g>
  );
}

/** Large gas duct along a polyline (steel duct with soft shading). */
export function GasDuct({ pts, w }: { pts: Pt[]; w: number }) {
  const d = pts.map(([px, py], i) => `${i ? "L" : "M"} ${px} ${py}`).join(" ");
  return (
    <g aria-hidden="true" fill="none" strokeLinejoin="round">
      <path d={d} stroke={MX.edge} strokeWidth={w} />
      <path d={d} stroke={MX.flatBody} strokeWidth={w - 3} />
      <path d={d} stroke={MX.flatRaised} strokeWidth={w * 0.3} opacity={0.7} />
      <path d={d} stroke={MX.fine} strokeWidth={0.8} strokeDasharray="10 5 2 5" opacity={0.6} />
    </g>
  );
}

/** Flange ring across a gas duct run (vertical: duct runs up/down). */
export function GasFlange({ x, y, w, vertical = false }: { x: number; y: number; w: number; vertical?: boolean }) {
  const l = w + 7;
  return vertical ? (
    <g aria-hidden="true">
      <rect x={x - l / 2} y={y - 3} width={l} height={6} rx={1.4} {...PAINT.raised} />
      <circle cx={x - l / 2 + 2.5} cy={y} r={1} fill={MX.deep} />
      <circle cx={x + l / 2 - 2.5} cy={y} r={1} fill={MX.deep} />
    </g>
  ) : (
    <g aria-hidden="true">
      <rect x={x - 3} y={y - l / 2} width={6} height={l} rx={1.4} {...PAINT.raised} />
      <circle cx={x} cy={y - l / 2 + 2.5} r={1} fill={MX.deep} />
      <circle cx={x} cy={y + l / 2 - 2.5} r={1} fill={MX.deep} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Hydraulics                                                          */
/* ------------------------------------------------------------------ */

/** Hydraulic oil hose / tube along a polyline (oil = process material). */
export function OilHose({ pts, w = 5 }: { pts: Pt[]; w?: number }) {
  const d = pts.map(([px, py], i) => `${i ? "L" : "M"} ${px} ${py}`).join(" ");
  return (
    <g aria-hidden="true" fill="none" strokeLinejoin="round" strokeLinecap="round">
      <path d={d} stroke={MX.edge} strokeWidth={w} />
      <path d={d} stroke={MX.material} strokeWidth={w - 2.2} />
    </g>
  );
}

/** Hose fitting (hex nut) at a port. */
export function Fitting({ x, y, vertical = true }: { x: number; y: number; vertical?: boolean }) {
  return vertical ? (
    <rect x={x - 5} y={y - 3} width={10} height={6} rx={1.2} {...PAINT.shaft} aria-hidden="true" />
  ) : (
    <rect x={x - 3} y={y - 5} width={6} height={10} rx={1.2} {...PAINT.shaft} aria-hidden="true" />
  );
}

/** Horizontal tie-rod hydraulic cylinder: cap at x1, head at x2, rod out to rodX. */
export function HydCylinder({ x1, x2, y, h, rodX, rodH }: { x1: number; x2: number; y: number; h: number; rodX: number; rodH: number }) {
  const cy = y + h / 2;
  const cap = Math.max(8, h * 0.4);
  return (
    <g aria-hidden="true">
      {/* rod */}
      <rect x={x2} y={cy - rodH / 2} width={rodX - x2} height={rodH} rx={2} {...PAINT.shaft} />
      <line x1={x2 + 4} x2={rodX - 2} y1={cy - rodH * 0.18} y2={cy - rodH * 0.18} stroke={MX.metalHi} strokeWidth={1} opacity={0.6} />
      {/* barrel */}
      <rect x={x1 + cap - 2} y={y + 3} width={x2 - x1 - 2 * cap + 4} height={h - 6} {...PAINT.cylinder} />
      {/* tie rods */}
      <line x1={x1 + 2} x2={x2 - 2} y1={y + 1.5} y2={y + 1.5} stroke={MX.metal} strokeWidth={2} />
      <line x1={x1 + 2} x2={x2 - 2} y1={y + h - 1.5} y2={y + h - 1.5} stroke={MX.metal} strokeWidth={2} />
      {/* end caps with tie-rod nuts */}
      {[x1, x2 - cap].map((ex) => (
        <g key={ex}>
          <rect x={ex} y={y - 3} width={cap} height={h + 6} rx={3} {...PAINT.raised} />
          <line x1={ex + cap / 2} x2={ex + cap / 2} y1={y + 2} y2={y + h - 2} {...PAINT.hair} />
          <rect x={ex + cap / 2 - 3} y={y - 7} width={6} height={4} rx={1} {...PAINT.shaft} />
          <rect x={ex + cap / 2 - 3} y={y + h + 3} width={6} height={4} rx={1} {...PAINT.shaft} />
        </g>
      ))}
      {/* rod gland */}
      <rect x={x2} y={cy - rodH / 2 - 3} width={6} height={rodH + 6} rx={1.5} {...PAINT.body} />
    </g>
  );
}

/** Clinker / material lumps (process material). */
export function Lumps({ pts, r = 2.4 }: { pts: Pt[]; r?: number }) {
  return (
    <g aria-hidden="true">
      {pts.map(([px, py], i) => (
        <rect key={i} x={px - r} y={py - r * 0.85} width={r * 2} height={r * 1.7} rx={r * 0.45} fill={MX.material} transform={`rotate(${(i * 37) % 90} ${px} ${py})`} />
      ))}
    </g>
  );
}

/** Steel column with a base plate, from y1 down to y2. */
export function Column({ x, y1, y2, w = 9 }: { x: number; y1: number; y2: number; w?: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x - w / 2} y={y1} width={w} height={y2 - y1} rx={1.5} {...PAINT.body} />
      <line x1={x} x2={x} y1={y1 + 3} y2={y2 - 6} {...PAINT.hair} />
      <rect x={x - w / 2 - 5} y={y2 - 4} width={w + 10} height={5} rx={1.2} {...PAINT.raised} />
      <Bolt x={x - w / 2 - 2} y={y2 - 1.5} r={1.1} />
      <Bolt x={x + w / 2 + 2} y={y2 - 1.5} r={1.1} />
    </g>
  );
}

/** Thermocouple / RTD: stem from a wall and a connection head. */
export function Thermo({ x, y, x2, y2, head = 5 }: { x: number; y: number; x2: number; y2: number; head?: number }) {
  return (
    <g aria-hidden="true">
      <line x1={x} y1={y} x2={x2} y2={y2} stroke={MX.edge} strokeWidth={3.4} strokeLinecap="round" />
      <line x1={x} y1={y} x2={x2} y2={y2} stroke={MX.metal} strokeWidth={2} strokeLinecap="round" />
      <circle cx={x2} cy={y2} r={head} {...PAINT.raised} />
    </g>
  );
}
