/**
 * Parts for the F group of the pyro-line diagram pack (FSL-01 feed silo,
 * KFS-01 kiln feed): vessels with cut-away windows, steel legs, roof radar,
 * slide gates, flow arrows, bucket-elevator casing. Kit paints only, so every
 * part follows the light and dark themes; sizes are in sheet units and every
 * part scales its detail from its own geometry (used on detail and overview).
 */
import React from "react";
import { Bolt, MX, PAINT } from "@/components/assets/machine-kit/machine-kit";

export type Pt = [number, number];

/** Evenly spaced bolts along a horizontal flange. */
export function BoltRow({ x1, x2, y, n, r = 1.3 }: { x1: number; x2: number; y: number; n: number; r?: number }) {
  return (
    <g aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => (
        <Bolt key={i} x={x1 + ((x2 - x1) * i) / Math.max(1, n - 1)} y={y} r={r} />
      ))}
    </g>
  );
}

/** Steel column with a top gusset, base plate and anchor bolts; `y2` is the ground. */
export function Leg({ x, y1, y2, w = 7 }: { x: number; y1: number; y2: number; w?: number }) {
  const bp = w * 1.6;
  return (
    <g aria-hidden="true">
      <rect x={x} y={y1} width={w} height={y2 - y1} rx={1.2} {...PAINT.body} />
      <line x1={x + w / 2} x2={x + w / 2} y1={y1 + 3} y2={y2 - 6} {...PAINT.hair} />
      <rect x={x + w / 2 - bp} y={y2 - 4} width={bp * 2} height={4} rx={1} {...PAINT.raised} />
      {w >= 6 && (
        <>
          <Bolt x={x + w / 2 - bp + 2.5} y={y2 - 2} r={1} />
          <Bolt x={x + w / 2 + bp - 2.5} y={y2 - 2} r={1} />
        </>
      )}
    </g>
  );
}

/** Hairline steel bracing between points (V, X or ties). */
export function Bracing({ lines, w = 2 }: { lines: [number, number, number, number][]; w?: number }) {
  return (
    <g aria-hidden="true">
      {lines.map(([a, b, c, d], i) => (
        <line key={i} x1={a} y1={b} x2={c} y2={d} stroke={MX.fine} strokeWidth={w} strokeLinecap="round" />
      ))}
    </g>
  );
}

/**
 * Vertical vessel (silo / bin): cylindrical shell with ring seams and staggered
 * plate seams, ring-beam flange, conical hopper, optional cut-away window
 * showing the material bed (`level` = bed surface y).
 */
export function Vessel({
  x0,
  x1,
  top,
  ring,
  coneBot,
  outW,
  seams,
  win,
  level,
  flangeH = 9,
  bolts = 14,
}: {
  x0: number;
  x1: number;
  top: number;
  ring: number;
  coneBot: number;
  outW: number;
  seams: number[];
  win?: [number, number, number, number];
  level?: number;
  flangeH?: number;
  bolts?: number;
}) {
  const cx = (x0 + x1) / 2;
  const w = x1 - x0;
  const courses = [top, ...seams, ring];
  const plate: React.ReactNode[] = [];
  for (let i = 0; i < courses.length - 1; i++) {
    const n = 4;
    for (let k = 1; k < n; k++) {
      const px = x0 + (w * (k - (i % 2 ? 0.5 : 0))) / n;
      if (px > x0 + 4 && px < x1 - 4) plate.push(<line key={`${i}-${k}`} x1={px} x2={px} y1={courses[i] + 1.5} y2={courses[i + 1] - 1.5} {...PAINT.hair} />);
    }
  }
  const ct = ring + flangeH;
  return (
    <g aria-hidden="true">
      {/* hopper cone */}
      <path d={`M ${x0 + 4} ${ct} L ${x1 - 4} ${ct} L ${cx + outW / 2} ${coneBot} L ${cx - outW / 2} ${coneBot} Z`} {...PAINT.cylinderV} />
      <line x1={x0 + w * 0.3} y1={ct + 2} x2={cx - outW * 0.2} y2={coneBot - 2} {...PAINT.hair} />
      <line x1={x1 - w * 0.3} y1={ct + 2} x2={cx + outW * 0.2} y2={coneBot - 2} {...PAINT.hair} />
      <rect x={cx - outW / 2 - 3} y={coneBot - 3} width={outW + 6} height={4} rx={1.2} {...PAINT.raised} />
      {/* shell */}
      <rect x={x0} y={top} width={w} height={ring - top} rx={2} {...PAINT.cylinderV} />
      {seams.map((y) => (
        <line key={y} x1={x0 + 1.5} x2={x1 - 1.5} y1={y} y2={y} stroke={MX.fine} strokeWidth={1} />
      ))}
      {plate}
      {win && (
        <g>
          <rect x={win[0]} y={win[1]} width={win[2]} height={win[3]} rx={Math.min(7, win[3] * 0.08)} {...PAINT.recess} />
          {level !== undefined && (
            <path
              d={`M ${win[0] + 4} ${level + win[3] * 0.025} Q ${win[0] + win[2] / 2} ${level - win[3] * 0.06} ${win[0] + win[2] - 4} ${level + win[3] * 0.035} V ${win[1] + win[3] - 4} H ${win[0] + 4} Z`}
              {...PAINT.material}
            />
          )}
          <rect x={win[0] - 2.5} y={win[1] - 2.5} width={win[2] + 5} height={win[3] + 5} rx={Math.min(8, win[3] * 0.09)} fill="none" stroke={MX.edge} strokeWidth={1} />
        </g>
      )}
      {/* ring-beam flange with bolts */}
      <rect x={x0 - 6} y={ring} width={w + 12} height={flangeH} rx={2.5} {...PAINT.raised} />
      {flangeH >= 7 && <BoltRow x1={x0 + 2} x2={x1 - 2} y={ring + flangeH / 2} n={bolts} r={1.1} />}
    </g>
  );
}

/** Conical roof with perimeter handrail (behind) and a centre roof plate. */
export function ConeRoof({ x0, x1, y, peak, rail = 18, step = 22 }: { x0: number; x1: number; y: number; peak: number; rail?: number; step?: number }) {
  const cx = (x0 + x1) / 2;
  const posts: React.ReactNode[] = [];
  const n = Math.round((x1 - x0 - 24) / step);
  for (let i = 0; i <= n; i++) {
    const px = x0 + 12 + ((x1 - x0 - 24) * i) / n;
    posts.push(<line key={i} x1={px} x2={px} y1={y} y2={y - rail} stroke={MX.edge} strokeWidth={1.1} />);
  }
  return (
    <g aria-hidden="true">
      {posts}
      <line x1={x0 + 12} x2={x1 - 12} y1={y - rail} y2={y - rail} stroke={MX.edge} strokeWidth={1.5} />
      <line x1={x0 + 12} x2={x1 - 12} y1={y - rail / 2} y2={y - rail / 2} stroke={MX.fine} strokeWidth={1} />
      <path d={`M ${x0 - 8} ${y} L ${cx} ${peak} L ${x1 + 8} ${y} Z`} {...PAINT.raised} />
      <line x1={x0 - 2} x2={x1 + 2} y1={y - 2.5} y2={y - 2.5} {...PAINT.hair} />
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={cx + (x0 - cx) * f} y1={peak + (y - peak) * f} x2={cx + (x1 - cx) * f} y2={peak + (y - peak) * f} {...PAINT.hair} opacity={0.7} />
      ))}
    </g>
  );
}

/** Non-contact radar level transmitter: roof nozzle flange, horn neck, head housing centred on (x, headY). */
export function RadarLevel({ x, roof, headY, s = 1 }: { x: number; roof: number; headY: number; s?: number }) {
  const hw = 22 * s;
  const hh = 18 * s;
  return (
    <g aria-hidden="true">
      <rect x={x - 10 * s} y={roof - 4 * s} width={20 * s} height={4 * s} rx={1} {...PAINT.raised} />
      <rect x={x - 3 * s} y={headY + hh / 2 - 1} width={6 * s} height={roof - 4 * s - (headY + hh / 2) + 1} {...PAINT.shaft} />
      <rect x={x - 6 * s} y={headY + hh / 2 - 1} width={12 * s} height={3 * s} rx={1} {...PAINT.raised} />
      <rect x={x - hw / 2} y={headY - hh / 2} width={hw} height={hh} rx={5 * s} {...PAINT.body} />
      <line x1={x - hw / 2 + 2} x2={x + hw / 2 - 2} y1={headY + hh * 0.18} y2={headY + hh * 0.18} {...PAINT.hair} />
      <rect x={x + hw / 2} y={headY - 2.5 * s} width={4 * s} height={5 * s} rx={1} {...PAINT.shaft} />
    </g>
  );
}

/**
 * Slide gate under a hopper outlet: bolted gate body, slide housing and an
 * actuator block (`act`) with a round limit-switch / positioner cap at `cap`.
 */
export function SlideGate({
  body,
  act,
  cap,
  capR = 9,
}: {
  body: [number, number, number, number];
  act: [number, number, number, number];
  cap: Pt;
  capR?: number;
}) {
  const [x, y, w, h] = body;
  const [ax, ay, aw, ah] = act;
  const small = h < 30;
  return (
    <g aria-hidden="true">
      {/* actuator rod into the gate */}
      <rect x={x + w - 2} y={ay + ah / 2 - 2.5} width={ax - x - w + 4} height={5} {...PAINT.shaft} />
      <rect x={x} y={y} width={w} height={h} rx={small ? 3 : 5} {...PAINT.body} />
      <rect x={x + 4} y={y + h * 0.42} width={w - 8} height={h * 0.16} rx={1.2} {...PAINT.recess} />
      <line x1={x + 3} x2={x + w - 3} y1={y + 3} y2={y + 3} {...PAINT.hair} />
      {[0.12, 0.88].map((fx) =>
        [0.2, 0.8].map((fy) => <Bolt key={`${fx}${fy}`} x={x + w * fx} y={y + h * fy} r={small ? 1.1 : 1.8} />),
      )}
      <rect x={ax} y={ay} width={aw} height={ah} rx={small ? 2.5 : 4} {...PAINT.body} />
      <rect x={ax + aw * 0.1} y={ay + ah * 0.18} width={aw * 0.24} height={ah * 0.64} rx={1.5} {...PAINT.recess} />
      <circle cx={cap[0]} cy={cap[1]} r={capR} {...PAINT.raised} />
      <circle cx={cap[0]} cy={cap[1]} r={capR * 0.62} fill="none" stroke={MX.fine} strokeWidth={1} />
    </g>
  );
}

/** Neutral flow arrow: hairline with a filled head. */
export function Arrow({ x1, y1, x2, y2, head = 7 }: { x1: number; y1: number; x2: number; y2: number; head?: number }) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const p = (d: number, o: number): Pt => [x2 - head * Math.cos(a + o) * d, y2 - head * Math.sin(a + o) * d];
  const [l, r] = [p(1, -0.42), p(1, 0.42)];
  return (
    <g aria-hidden="true">
      <line x1={x1} y1={y1} x2={x2 - head * 0.6 * Math.cos(a)} y2={y2 - head * 0.6 * Math.sin(a)} stroke={MX.label} strokeWidth={1.3} />
      <path d={`M ${l[0]} ${l[1]} L ${x2} ${y2} L ${r[0]} ${r[1]} Z`} fill={MX.label} stroke={MX.label} strokeWidth={1} strokeLinejoin="round" />
    </g>
  );
}

/** Double chevron "flow in" mark at the start of a line (pointing right). */
export function InChevrons({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const t = (ox: number) => `M ${x + ox} ${y - 5 * s} L ${x + ox + 8 * s} ${y} L ${x + ox} ${y + 5 * s} Z`;
  return (
    <g aria-hidden="true" fill={MX.label} stroke={MX.label} strokeWidth={0.8} strokeLinejoin="round">
      <path d={t(0)} />
      <path d={t(8 * s)} />
    </g>
  );
}

/** Lever-operated butterfly valve on a horizontal pipe (diameter d) at x. */
export function ButterflyValve({ x, y, d, vertical = false }: { x: number; y: number; d: number; vertical?: boolean }) {
  const t = vertical ? `rotate(90 ${x} ${y})` : undefined;
  return (
    <g aria-hidden="true" transform={t}>
      <rect x={x - 6} y={y - d / 2 - 3} width={12} height={d + 6} rx={2} {...PAINT.raised} />
      <line x1={x - 6} x2={x + 6} y1={y} y2={y} {...PAINT.hair} />
      <rect x={x - 1.5} y={y - d / 2 - 11} width={3} height={8} {...PAINT.shaft} />
      <rect x={x - 1.5} y={y - d / 2 - 13} width={16} height={3.5} rx={1.5} {...PAINT.shaft} />
      <Bolt x={x - 3} y={y - d / 2 - 0.5} r={1} />
      <Bolt x={x + 3} y={y + d / 2 + 0.5} r={1} />
    </g>
  );
}

/** Swing check valve body on a pipe (flow left → right when horizontal). */
export function CheckValve({ x, y, d, vertical = false }: { x: number; y: number; d: number; vertical?: boolean }) {
  const t = vertical ? `rotate(-90 ${x} ${y})` : undefined;
  return (
    <g aria-hidden="true" transform={t}>
      <rect x={x - 11} y={y - d / 2 - 4} width={22} height={d + 8} rx={4} {...PAINT.body} />
      <rect x={x - 14} y={y - d / 2 - 2} width={3.5} height={d + 4} rx={1} {...PAINT.raised} />
      <rect x={x + 10.5} y={y - d / 2 - 2} width={3.5} height={d + 4} rx={1} {...PAINT.raised} />
      <path d={`M ${x - 5} ${y - d / 2 + 1} L ${x + 4} ${y + d / 2 - 2}`} stroke={MX.metal} strokeWidth={2} strokeLinecap="round" />
      <circle cx={x - 5} cy={y - d / 2 + 1} r={1.6} {...PAINT.shaft} />
    </g>
  );
}

/**
 * Bucket-elevator casing between y1 and y2: flanged sections, up-leg and
 * down-leg windows with belt and buckets (material in the up-leg).
 */
export function ElevatorCasing({ x0, x1, y1, y2, pitch = 34.5, section = 90, upLeft = true }: { x0: number; x1: number; y1: number; y2: number; pitch?: number; section?: number; upLeft?: boolean }) {
  const w = x1 - x0;
  const lw = w * 0.24;
  const lx = x0 + w * 0.22;
  const rx = x1 - w * 0.22 - lw;
  const buckets: React.ReactNode[] = [];
  for (let y = y1 + 10, i = 0; y < y2 - 10; y += pitch / 2, i++) {
    const left = i % 2 === 0;
    const bx = left ? lx + 2 : rx + 2;
    const bw = lw - 4;
    const bh = Math.min(7, pitch * 0.22);
    const up = left === upLeft;
    buckets.push(
      <g key={y}>
        <path d={`M ${bx} ${y} h ${bw} l ${-bw * 0.12} ${bh} h ${-bw * 0.76} Z`} fill={MX.flatRaised} stroke={MX.edge} strokeWidth={0.8} strokeLinejoin="round" />
        {up && <rect x={bx + 1.5} y={y + 0.8} width={bw - 3} height={bh * 0.38} rx={0.8} {...PAINT.material} />}
      </g>,
    );
  }
  const flanges: number[] = [];
  for (let y = y1 + section; y < y2 - 20; y += section) flanges.push(y);
  return (
    <g aria-hidden="true">
      <rect x={x0} y={y1} width={w} height={y2 - y1} rx={2} {...PAINT.cylinderV} />
      <rect x={lx} y={y1 + 4} width={lw} height={y2 - y1 - 8} rx={2} {...PAINT.recess} />
      <rect x={rx} y={y1 + 4} width={lw} height={y2 - y1 - 8} rx={2} {...PAINT.recess} />
      <line x1={lx + 1} x2={lx + 1} y1={y1 + 5} y2={y2 - 5} stroke={MX.metal} strokeWidth={1.2} />
      <line x1={rx + lw - 1} x2={rx + lw - 1} y1={y1 + 5} y2={y2 - 5} stroke={MX.metal} strokeWidth={1.2} />
      {buckets}
      {flanges.map((y) => (
        <g key={y}>
          <rect x={x0 - 4} y={y - 2.5} width={w + 8} height={5} rx={1.5} {...PAINT.raised} />
          <Bolt x={x0 - 1} y={y} r={0.9} />
          <Bolt x={x1 + 1} y={y} r={0.9} />
        </g>
      ))}
    </g>
  );
}
