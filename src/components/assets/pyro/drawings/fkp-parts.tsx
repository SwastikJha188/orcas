/**
 * Shared parts for the feed / kiln-feed / preheater drawings (FSL-01, KFS-01,
 * PHC-01). Built only from the ULTRON machine kit paints, so every shape has
 * light and dark values and picks up the drawing's gradients.
 */
import React from "react";
import { Bolt, Fan, MX, PAINT } from "../../machine-kit/machine-kit";

type Pt = [number, number];
type Paint = Record<string, unknown>;

/** Straight round tube between two points, shaded across its diameter. */
export function Tube({ x1, y1, x2, y2, d, paint = PAINT.cylinder }: { x1: number; y1: number; x2: number; y2: number; d: number; paint?: Paint }) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const a = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  return <rect x={x1} y={y1 - d / 2} width={len} height={d} rx={Math.min(3, d / 4)} transform={`rotate(${a} ${x1} ${y1})`} {...paint} aria-hidden="true" />;
}

/** Orthogonal duct / pipe through `pts`, with box elbows at the bends. */
export function Pipe({ pts, d, elbows = true, flanges = [] }: { pts: Pt[]; d: number; elbows?: boolean; flanges?: Pt[] }) {
  const segs: React.ReactNode[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const extA = i > 0 ? d / 2 : 0;
    const extB = i < pts.length - 2 ? d / 2 : 0;
    if (ay === by) {
      const x0 = Math.min(ax, bx) - (ax < bx ? extA : extB);
      const x1 = Math.max(ax, bx) + (ax < bx ? extB : extA);
      segs.push(<rect key={i} x={x0} y={ay - d / 2} width={x1 - x0} height={d} rx={1.5} {...PAINT.cylinder} />);
    } else {
      const y0 = Math.min(ay, by) - (ay < by ? extA : extB);
      const y1 = Math.max(ay, by) + (ay < by ? extB : extA);
      segs.push(<rect key={i} x={ax - d / 2} y={y0} width={d} height={y1 - y0} rx={1.5} {...PAINT.cylinderV} />);
    }
  }
  return (
    <g aria-hidden="true">
      {segs}
      {elbows &&
        pts.slice(1, -1).map(([x, y], i) => <rect key={`e${i}`} x={x - d / 2 - 2} y={y - d / 2 - 2} width={d + 4} height={d + 4} rx={Math.min(6, d * 0.3)} {...PAINT.raised} />)}
      {flanges.map(([x, y], i) => {
        // Flange across the run: decide the run direction from the neighbouring segment.
        const horizontal = pts.some((p, k) => k < pts.length - 1 && p[1] === y && pts[k + 1][1] === y && Math.min(p[0], pts[k + 1][0]) <= x && x <= Math.max(p[0], pts[k + 1][0]));
        return horizontal ? (
          <rect key={`f${i}`} x={x - 2.5} y={y - d / 2 - 3} width={5} height={d + 6} rx={1.5} {...PAINT.raised} />
        ) : (
          <rect key={`f${i}`} x={x - d / 2 - 3} y={y - 2.5} width={d + 6} height={5} rx={1.5} {...PAINT.raised} />
        );
      })}
    </g>
  );
}

/**
 * Meal / material pipe along orthogonal points: thin steel pipe with the brass
 * meal stream inside. Built from rects (not strokes) so the kit gradients have
 * a real bounding box on straight runs.
 */
export function MealPipe({ pts, d = 7 }: { pts: Pt[]; d?: number }) {
  const shell: React.ReactNode[] = [];
  const core: React.ReactNode[] = [];
  const c = Math.max(2.5, d * 0.5);
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const x0 = Math.min(ax, bx);
    const y0 = Math.min(ay, by);
    const w = Math.abs(bx - ax);
    const h = Math.abs(by - ay);
    shell.push(<rect key={i} x={x0 - d / 2} y={y0 - d / 2} width={w + d} height={h + d} rx={d / 2} fill={MX.metal} stroke={MX.edge} strokeWidth={1} />);
    core.push(<rect key={i} x={x0 - c / 2} y={y0 - c / 2} width={w + c} height={h + c} rx={c / 2} {...PAINT.material} />);
  }
  return (
    <g aria-hidden="true">
      {shell}
      {core}
    </g>
  );
}

/** Guard rail: top and knee rails with posts. */
export function Handrail({ x1, x2, y, h = 12, step = 16 }: { x1: number; x2: number; y: number; h?: number; step?: number }) {
  const posts: React.ReactNode[] = [];
  const n = Math.max(1, Math.round((x2 - x1) / step));
  for (let i = 0; i <= n; i++) {
    const x = x1 + ((x2 - x1) * i) / n;
    posts.push(<line key={i} x1={x} y1={y} x2={x} y2={y - h} stroke={MX.edge} strokeWidth={1} />);
  }
  return (
    <g aria-hidden="true">
      {posts}
      <line x1={x1} y1={y - h} x2={x2} y2={y - h} stroke={MX.edge} strokeWidth={1.4} />
      <line x1={x1} y1={y - h / 2} x2={x2} y2={y - h / 2} stroke={MX.fine} strokeWidth={1} />
    </g>
  );
}

/** Caged access ladder. `side` is where the cage hoops bulge. */
export function Ladder({ x, y1, y2, w = 12, cageFrom, side = 1 }: { x: number; y1: number; y2: number; w?: number; cageFrom?: number; side?: 1 | -1 }) {
  const rungs: React.ReactNode[] = [];
  for (let y = y1 + 6; y < y2; y += 8) rungs.push(<line key={y} x1={x} y1={y} x2={x + w} y2={y} stroke={MX.fine} strokeWidth={1} />);
  const hoops: React.ReactNode[] = [];
  if (cageFrom !== undefined) {
    for (let y = y1 + 4; y <= cageFrom; y += 14) {
      const ox = side > 0 ? x + w : x;
      hoops.push(<path key={`h${y}`} d={`M ${ox} ${y} q ${side * 9} 0 ${side * 9} 7 t ${-side * 9} 7`} fill="none" stroke={MX.fine} strokeWidth={1} />);
    }
  }
  return (
    <g aria-hidden="true">
      {rungs}
      {hoops}
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={MX.edge} strokeWidth={1.5} />
      <line x1={x + w} y1={y1} x2={x + w} y2={y2} stroke={MX.edge} strokeWidth={1.5} />
    </g>
  );
}

/** Steel column / beam. */
export function Steel({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return <rect x={x} y={y} width={w} height={h} rx={1.5} {...PAINT.body} aria-hidden="true" />;
}

/** Cross bracing between two points (hairline steel). */
export function Brace({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <g aria-hidden="true">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={MX.fine} strokeWidth={2.2} />
      <line x1={x1} y1={y2} x2={x2} y2={y1} stroke={MX.fine} strokeWidth={2.2} />
    </g>
  );
}

/**
 * Centrifugal fan / blower volute seen from the drive side. Outlet rises from
 * the right-hand side (`dir = 1`) or the left (`dir = -1`).
 */
export function Volute({ cx, cy, r, outH, dir = 1, rotor = true }: { cx: number; cy: number; r: number; outH: number; dir?: 1 | -1; rotor?: boolean }) {
  const s = dir;
  const r1 = r * 0.92;
  const r2 = r * 1.02;
  const r3 = r * 1.12;
  const outW = r3 - r * 0.18;
  const d = [
    `M ${cx + s * r * 0.18} ${cy - r1}`,
    `A ${r1} ${r1} 0 0 ${s > 0 ? 0 : 1} ${cx - s * r1} ${cy}`,
    `A ${(r1 + r2) / 2} ${(r1 + r2) / 2} 0 0 ${s > 0 ? 0 : 1} ${cx} ${cy + r2}`,
    `A ${(r2 + r3) / 2} ${(r2 + r3) / 2} 0 0 ${s > 0 ? 0 : 1} ${cx + s * r3} ${cy}`,
    `L ${cx + s * r3} ${cy - r - outH}`,
    `L ${cx + s * r * 0.18} ${cy - r - outH}`,
    "Z",
  ].join(" ");
  return (
    <g aria-hidden="true">
      <path d={d} {...PAINT.body} />
      <rect x={Math.min(cx + s * r * 0.18, cx + s * r3) - 3} y={cy - r - outH - 5} width={outW + 6} height={6} rx={1.5} {...PAINT.raised} />
      {rotor ? (
        <Fan cx={cx} cy={cy} r={r * 0.62} />
      ) : (
        <>
          <circle cx={cx} cy={cy} r={r * 0.62} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
          <circle cx={cx} cy={cy} r={r * 0.3} {...PAINT.raised} />
          <circle cx={cx} cy={cy} r={r * 0.12} {...PAINT.shaft} />
        </>
      )}
      {[200, 250, 300, 340].map((deg) => {
        const a = ((s > 0 ? deg : 180 - deg) * Math.PI) / 180;
        const rr = r * 0.98;
        return <Bolt key={deg} x={cx + Math.cos(a) * rr * 0.93} y={cy - Math.sin(a) * rr * 0.93} r={1.6} />;
      })}
    </g>
  );
}

/** Plummer-block bearing on a pedestal; shaft centre at (x, y). */
export function PedestalBearing({ x, y, w = 34, base }: { x: number; y: number; w?: number; base: number }) {
  const capH = w * 0.62;
  return (
    <g aria-hidden="true">
      <path d={`M ${x - w * 0.42} ${y + capH * 0.35} H ${x + w * 0.42} L ${x + w * 0.5} ${base} H ${x - w * 0.5} Z`} {...PAINT.body} />
      <rect x={x - w / 2} y={y - capH / 2} width={w} height={capH} rx={w * 0.22} {...PAINT.raised} />
      <line x1={x - w / 2 + 2} x2={x + w / 2 - 2} y1={y} y2={y} stroke={MX.fine} strokeWidth={1} />
      <Bolt x={x - w / 2 + 5} y={y - capH / 2 + 5} r={1.6} />
      <Bolt x={x + w / 2 - 5} y={y - capH / 2 + 5} r={1.6} />
      <Bolt x={x - w * 0.36} y={base - 4} r={1.6} />
      <Bolt x={x + w * 0.36} y={base - 4} r={1.6} />
    </g>
  );
}

/** Mirror a group about the vertical line x = `about`. */
export function MirrorX({ about, children }: { about: number; children: React.ReactNode }) {
  return <g transform={`translate(${2 * about} 0) scale(-1 1)`}>{children}</g>;
}

/**
 * Air slide (aerated gravity conveyor) from (x1, y1) to (x2, y2): material
 * channel on top with a brass bed, porous cloth, air box below.
 */
export function AirSlide({ x1, y1, x2, y2, d = 18, bed = true }: { x1: number; y1: number; x2: number; y2: number; d?: number; bed?: boolean }) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const a = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  const top = d * 0.55;
  const flanges: React.ReactNode[] = [];
  for (let s = 40; s < len - 20; s += 60) flanges.push(<line key={s} x1={s} y1={-d / 2} x2={s} y2={d / 2} stroke={MX.fine} strokeWidth={1} />);
  return (
    <g transform={`translate(${x1} ${y1}) rotate(${a})`} aria-hidden="true">
      <rect x={0} y={-d / 2} width={len} height={d} rx={2} {...PAINT.body} />
      <rect x={3} y={-d / 2 + 2.5} width={len - 6} height={top - 4} rx={1.5} {...PAINT.recess} />
      {bed && <rect x={4} y={-d / 2 + top - 4.5} width={len - 8} height={3} rx={1} {...PAINT.material} />}
      <line x1={2} x2={len - 2} y1={-d / 2 + top} y2={-d / 2 + top} stroke={MX.fine} strokeWidth={1} strokeDasharray="3 2" />
      {flanges}
    </g>
  );
}

/** Small terminal / control box with a recessed display and status lamp. */
export function Cabinet({ x, y, w, h, louvres = true }: { x: number; y: number; w: number; h: number; louvres?: boolean }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={4} {...PAINT.body} />
      <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} rx={2} fill="none" stroke={MX.fine} strokeWidth={1} />
      <rect x={x + w * 0.22} y={y + h * 0.12} width={w * 0.56} height={Math.min(16, h * 0.18)} rx={1.5} {...PAINT.recess} />
      {louvres &&
        [0.62, 0.7, 0.78].map((f) => <line key={f} x1={x + w * 0.25} x2={x + w * 0.75} y1={y + h * f} y2={y + h * f} stroke={MX.fine} strokeWidth={1} />)}
      <rect x={x + w - 8} y={y + h * 0.42} width={3} height={10} rx={1} fill={MX.edge} />
    </g>
  );
}

/** Cyclone geometry shared by the preheater drawing (outlet = bottom of flap valve). */
export interface CycloneGeom {
  cx: number;
  top: number;
  w: number;
  cyl: number;
  cone: number;
  /** Side the tangential gas inlet is on. */
  inlet: 1 | -1;
}

export const cycloneOutletY = (c: CycloneGeom) => c.top + c.cyl + c.cone + 9;

/** Preheater cyclone: roof, tangential inlet housing, cylinder, cone, flap valve. */
export function Cyclone({ c, label }: { c: CycloneGeom; label?: string }) {
  const { cx, top, w, cyl, cone, inlet } = c;
  const ow = Math.max(14, w * 0.2);
  const yJ = top + cyl;
  const yO = yJ + cone;
  const coneD = `M ${cx - w / 2} ${yJ} L ${cx + w / 2} ${yJ} L ${cx + ow / 2} ${yO} L ${cx - ow / 2} ${yO} Z`;
  // inlet housing on the gas-inlet side (spiral scroll seen from the side)
  const ix = inlet > 0 ? cx + w / 2 - 2 : cx - w / 2 - 12;
  return (
    <g aria-hidden="true">
      <path d={coneD} {...PAINT.cylinderV} />
      <rect x={cx - w / 2} y={top} width={w} height={cyl} rx={3} {...PAINT.cylinderV} />
      <rect x={ix} y={top + 3} width={14} height={cyl * 0.5} rx={3} {...PAINT.body} />
      {/* roof plate and outlet (vortex finder) collar */}
      <rect x={cx - w / 2 - 3} y={top - 3} width={w + 6} height={6} rx={2} {...PAINT.raised} />
      {/* stiffener seam + cone flange */}
      <line x1={cx - w / 2 + 3} x2={cx + w / 2 - 3} y1={top + cyl * 0.55} y2={top + cyl * 0.55} stroke={MX.fine} strokeWidth={1} />
      <rect x={cx - w / 2 - 4} y={yJ - 3} width={w + 8} height={6} rx={2} {...PAINT.raised} />
      {/* cone inspection door */}
      <rect x={cx - w * 0.08} y={yJ + cone * 0.3} width={w * 0.16} height={cone * 0.14} rx={1.5} {...PAINT.recess} />
      {/* outlet flange + flap valve with counterweight */}
      <rect x={cx - ow / 2 - 3} y={yO} width={ow + 6} height={9} rx={2} {...PAINT.raised} />
      <line x1={cx + ow / 2 + 3} y1={yO + 4.5} x2={cx + ow / 2 + 12} y2={yO - 1} stroke={MX.edge} strokeWidth={1.4} />
      <circle cx={cx + ow / 2 + 13} cy={yO - 1.5} r={2.6} {...PAINT.shaft} />
      {label && (
        <text x={cx} y={top + cyl * 0.42} fill="var(--dx-ink-2)" fontSize={11} fontWeight={600} letterSpacing="0.08em" textAnchor="middle" dominantBaseline="middle">
          {label}
        </text>
      )}
    </g>
  );
}
