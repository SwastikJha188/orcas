/**
 * Parts for the P group (PHC-01 six-stage preheater) line sheets P-0 … P-4.
 * Built only from the ULTRON machine kit paints (MX / PAINT), so every shape
 * has light and dark values and picks up the drawing's gradients.
 */
import React from "react";
import { Bolt, MX, PAINT } from "@/components/assets/machine-kit/machine-kit";

/** Stage cyclone proportions (sheet units, as the PDF's P-1 / P-2 cyclones). */
export interface StageGeom {
  cx: number;
  /** Top of the roof plate. */
  top: number;
  /** Side the tangential gas inlet scroll is on. */
  inlet: 1 | -1;
  /** Scale on the P-1 proportions (P-2 draws its cyclones larger). */
  k?: number;
  /** Explicit cylinder / cone heights (default 46 k / 50 k). */
  cyl?: number;
  cone?: number;
  /** Explicit cylinder width / outlet width. */
  w?: number;
  ow?: number;
}

export const stageDims = (g: StageGeom) => {
  const k = g.k ?? 1;
  const w = g.w ?? 97 * k;
  const roof = 7 * k;
  const cyl = g.cyl ?? 46 * k;
  const cone = g.cone ?? 50 * k;
  const ow = g.ow ?? 31 * k;
  return { k, w, roof, cyl, cone, ow, yJ: g.top + roof + cyl, yO: g.top + roof + cyl + cone, yOut: g.top + roof + cyl + cone + 6 * k };
};

/** Point on the cone wall at fraction f (0 = cylinder joint, 1 = outlet) on side s. */
export function conePoint(g: StageGeom, f: number, s: 1 | -1): [number, number] {
  const d = stageDims(g);
  const half = d.w / 2 - (d.w / 2 - d.ow / 2) * f;
  return [g.cx + s * half, d.yJ + d.cone * f];
}

/**
 * Preheater stage cyclone: roof plate and vortex-finder collar, refractory-
 * lined cylinder with stiffener rings and tangential inlet scroll, support
 * lugs, cone flange, poke door, air blaster, outlet flange and meal flap valve.
 */
export function StageCyclone({ g, label, blaster, port = true, labelSize }: { g: StageGeom; label?: string; blaster?: 1 | -1 | false; port?: boolean; labelSize?: number }) {
  const { cx, top, inlet } = g;
  const d = stageDims(g);
  const { k, w, roof, cyl, cone, ow, yJ, yO } = d;
  const yC = top + roof;
  const coneD = `M ${cx - w / 2} ${yJ} L ${cx + w / 2} ${yJ} L ${cx + ow / 2} ${yO} L ${cx - ow / 2} ${yO} Z`;
  const sx = inlet > 0 ? cx + w / 2 - 2 : cx - w / 2 - 10 * k;
  const bs = blaster === false ? inlet : (blaster ?? inlet);
  const [bx, by] = conePoint(g, 0.42, bs);
  const [dx, dy] = conePoint(g, 0.3, (-bs) as 1 | -1);
  return (
    <g aria-hidden="true">
      {/* cone with refractory hairline and poke door */}
      <path d={coneD} {...PAINT.cylinderV} />
      <path d={`M ${cx - w / 2 + 6 * k} ${yJ + 3} L ${cx - ow / 2 + 3 * k} ${yO - 3} M ${cx + w / 2 - 6 * k} ${yJ + 3} L ${cx + ow / 2 - 3 * k} ${yO - 3}`} {...PAINT.hair} />
      <rect x={cx - 7 * k} y={yJ + cone * 0.34} width={14 * k} height={8 * k} rx={1.5} {...PAINT.recess} />
      <Bolt x={cx - 4.5 * k} y={yJ + cone * 0.34 + 4 * k} r={1} />
      <Bolt x={cx + 4.5 * k} y={yJ + cone * 0.34 + 4 * k} r={1} />
      {/* air blaster on the inlet side of the cone */}
      {blaster !== false && (
        <g>
          <rect x={bs > 0 ? bx - 1 : bx - 7 * k} y={by - 1.6 * k} width={8 * k} height={3.2 * k} {...PAINT.shaft} />
          <rect x={bs > 0 ? bx + 6 * k : bx - 17 * k} y={by - 8 * k} width={11 * k} height={16 * k} rx={4 * k} {...PAINT.cylinderV} />
          <rect x={bs > 0 ? bx + 8.5 * k : bx - 14.5 * k} y={by - 11 * k} width={6 * k} height={3.5 * k} rx={1} {...PAINT.raised} />
        </g>
      )}
      {/* sampling / cleaning port on the far side of the cone */}
      {port && <rect x={bs > 0 ? dx - 5 * k : dx} y={dy - 2.5 * k} width={5 * k} height={5 * k} rx={1} {...PAINT.raised} />}
      {/* cylinder */}
      <rect x={cx - w / 2} y={yC} width={w} height={cyl} rx={2} {...PAINT.cylinderV} />
      <line x1={cx - w / 2 + 5 * k} x2={cx - w / 2 + 5 * k} y1={yC + 3} y2={yJ - 3} {...PAINT.hair} />
      <line x1={cx + w / 2 - 5 * k} x2={cx + w / 2 - 5 * k} y1={yC + 3} y2={yJ - 3} {...PAINT.hair} />
      {[0.36, 0.72].map((f) => (
        <line key={f} x1={cx - w / 2 + 1} x2={cx + w / 2 - 1} y1={yC + cyl * f} y2={yC + cyl * f} stroke={MX.fine} strokeWidth={1.2} />
      ))}
      {/* tangential inlet scroll */}
      <rect x={sx} y={yC + 4 * k} width={12 * k} height={26 * k} rx={3} {...PAINT.body} />
      <line x1={inlet > 0 ? sx + 9 * k : sx + 3 * k} x2={inlet > 0 ? sx + 9 * k : sx + 3 * k} y1={yC + 6 * k} y2={yC + 28 * k} {...PAINT.hair} />
      {/* support lugs on the cylinder */}
      {[-1, 1].map((s) => (
        <path
          key={s}
          d={`M ${cx + (s * w) / 2} ${yJ - 9 * k} l ${s * 6 * k} ${3 * k} v ${6 * k} h ${-s * 6 * k} Z`}
          {...PAINT.raised}
          strokeWidth={1}
        />
      ))}
      {/* roof plate and vortex-finder collar */}
      <rect x={cx - w / 2 - 3.5 * k} y={top} width={w + 7 * k} height={roof} rx={2} {...PAINT.raised} />
      <rect x={cx - 13 * k} y={top - 5 * k} width={26 * k} height={5 * k} rx={1.5} {...PAINT.raised} />
      {[-1, 1].map((s) => (
        <Bolt key={s} x={cx + s * (w / 2 - 4 * k)} y={top + roof / 2} r={1.2} />
      ))}
      {/* cone flange */}
      <rect x={cx - w / 2 - 4 * k} y={yJ - 2.5 * k} width={w + 8 * k} height={5 * k} rx={1.5} {...PAINT.raised} />
      {/* outlet flange and meal flap valve with counterweight */}
      <rect x={cx - ow / 2 - 1.5 * k} y={yO} width={ow + 3 * k} height={6 * k} rx={1.5} {...PAINT.raised} />
      {label && (
        <text x={cx} y={yC + cyl * 0.55} fill="var(--dx-ink-2)" fontSize={labelSize ?? 11.2 * Math.min(1.15, k)} fontWeight={600} letterSpacing="0.08em" textAnchor="middle">
          {label}
        </text>
      )}
    </g>
  );
}

/** Pendulum flap valve on a vertical meal pipe at (x, y): housing, spindle, lever and counterweight. */
export function FlapValve({ x, y, s = 1, k = 1, horizontal = false }: { x: number; y: number; s?: 1 | -1; k?: number; horizontal?: boolean }) {
  return (
    <g aria-hidden="true" transform={horizontal ? `rotate(90 ${x} ${y})` : undefined}>
      <rect x={x - 7 * k} y={y - 8 * k} width={14 * k} height={16 * k} rx={2.5} {...PAINT.body} />
      <line x1={x - 5 * k} x2={x + 5 * k} y1={y - 8 * k} y2={y - 8 * k} stroke={MX.edge} strokeWidth={2} />
      <line x1={x - 5 * k} x2={x + 5 * k} y1={y + 8 * k} y2={y + 8 * k} stroke={MX.edge} strokeWidth={2} />
      <circle cx={x} cy={y} r={2 * k} {...PAINT.shaft} />
      <line x1={x} y1={y} x2={x + s * 13 * k} y2={y - 5 * k} stroke={MX.edge} strokeWidth={1.4} />
      <circle cx={x + s * 14 * k} cy={y - 5.5 * k} r={3 * k} {...PAINT.shaft} />
    </g>
  );
}

/** Fabric / metal expansion joint across a duct (vertical run if `vertical`). */
export function Bellows({ x, y, d, vertical = true, len = 12 }: { x: number; y: number; d: number; vertical?: boolean; len?: number }) {
  const ribs = [0.2, 0.5, 0.8];
  return vertical ? (
    <g aria-hidden="true">
      <rect x={x - d / 2 - 2} y={y - len / 2} width={d + 4} height={len} rx={2} {...PAINT.raised} />
      {ribs.map((f) => (
        <line key={f} x1={x - d / 2 - 1} x2={x + d / 2 + 1} y1={y - len / 2 + len * f} y2={y - len / 2 + len * f} stroke={MX.fine} strokeWidth={1} />
      ))}
    </g>
  ) : (
    <g aria-hidden="true">
      <rect x={x - len / 2} y={y - d / 2 - 2} width={len} height={d + 4} rx={2} {...PAINT.raised} />
      {ribs.map((f) => (
        <line key={f} y1={y - d / 2 - 1} y2={y + d / 2 + 1} x1={x - len / 2 + len * f} x2={x - len / 2 + len * f} stroke={MX.fine} strokeWidth={1} />
      ))}
    </g>
  );
}

/** I-beam floor / platform beam with a top flange hairline. */
export function Beam({ x1, x2, y, h = 6 }: { x1: number; x2: number; y: number; h?: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x1} y={y} width={x2 - x1} height={h} rx={1.2} {...PAINT.body} />
      <line x1={x1 + 2} x2={x2 - 2} y1={y + h / 2} y2={y + h / 2} {...PAINT.hair} />
    </g>
  );
}

/** Column base plate with anchor bolts on the foundation line. */
export function BasePlate({ x, y, w = 22 }: { x: number; y: number; w?: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x - w / 2} y={y - 6} width={w} height={6} rx={1.5} {...PAINT.raised} />
      <Bolt x={x - w / 2 + 4} y={y - 3} r={1.4} />
      <Bolt x={x + w / 2 - 4} y={y - 3} r={1.4} />
    </g>
  );
}

/** Gusset (knee brace) in the corner of a column and a beam; `s` = which side of the column. */
export function Gusset({ x, y, s, size = 9 }: { x: number; y: number; s: 1 | -1; size?: number }) {
  return <path d={`M ${x} ${y} h ${s * size} L ${x} ${y + size} Z`} fill={MX.flatRaised} stroke={MX.edge} strokeWidth={0.8} aria-hidden="true" />;
}

/** Neutral flow arrow (hairline with a filled head). */
export function Arrow({ x1, y1, x2, y2, head = 6 }: { x1: number; y1: number; x2: number; y2: number; head?: number }) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const p = (da: number): string => `${x2 - head * Math.cos(a + da)} ${y2 - head * Math.sin(a + da)}`;
  return (
    <g aria-hidden="true">
      <line x1={x1} y1={y1} x2={x2 - head * 0.6 * Math.cos(a)} y2={y2 - head * 0.6 * Math.sin(a)} stroke={MX.label} strokeWidth={1.2} />
      <path d={`M ${p(-0.42)} L ${x2} ${y2} L ${p(0.42)} Z`} fill={MX.label} />
    </g>
  );
}

/**
 * Centrifugal fan casing (volute) seen from the drive side: scroll around the
 * impeller with the outlet rising on the right (x cx … cx + r) to `outTop`.
 * Inner hairline, perimeter bolts, inlet ring, backward-curved impeller,
 * hub, inspection door, drain and casing feet down to `baseY`.
 */
export function FanCasing({ cx, cy, r, outTop, baseY }: { cx: number; cy: number; r: number; outTop: number; baseY: number }) {
  const e = Math.max(3, r * 0.05);
  const ri = r - e;
  const outer = `M ${cx} ${outTop} H ${cx + r} V ${cy} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`;
  const inner = `M ${cx + e} ${outTop + e} H ${cx + ri} V ${cy} A ${ri} ${ri} 0 1 1 ${cx} ${cy - ri} H ${cx + e} Z`;
  const bolts: React.ReactNode[] = [];
  for (let a = 15; a <= 255; a += 30) {
    const t = (a * Math.PI) / 180;
    bolts.push(<Bolt key={a} x={cx + Math.cos(t) * (r - e * 2.2)} y={cy + Math.sin(t) * (r - e * 2.2)} r={Math.max(1, r * 0.018)} />);
  }
  const fw = r * 0.3;
  const blades = Array.from({ length: 10 }).map((_, i) => (
    <path
      key={i}
      d={`M ${cx + r * 0.15} ${cy} Q ${cx + r * 0.3} ${cy - r * 0.04} ${cx + r * 0.45} ${cy - r * 0.16} L ${cx + r * 0.46} ${cy - r * 0.1} Q ${cx + r * 0.3} ${cy + r * 0.02} ${cx + r * 0.15} ${cy + r * 0.035} Z`}
      fill={MX.flatRaised}
      stroke={MX.edge}
      strokeWidth={0.8}
      transform={`rotate(${i * 36} ${cx} ${cy})`}
    />
  ));
  return (
    <g aria-hidden="true">
      {[-1, 1].map((s) => (
        <g key={s}>
          <rect x={cx + s * r * 0.55 - fw / 2} y={cy + r * 0.7} width={fw} height={baseY - cy - r * 0.7} rx={2} {...PAINT.body} />
          <Bolt x={cx + s * r * 0.55 - fw / 2 + 5} y={baseY - 4} r={1.3} />
          <Bolt x={cx + s * r * 0.55 + fw / 2 - 5} y={baseY - 4} r={1.3} />
        </g>
      ))}
      <path d={outer} {...PAINT.body} />
      <path d={inner} {...PAINT.hair} />
      {bolts}
      {/* outlet flange */}
      <rect x={cx - 3} y={outTop - 5} width={r + 6} height={6} rx={1.5} {...PAINT.raised} />
      {/* inlet ring, impeller, hub */}
      <circle cx={cx} cy={cy} r={r * 0.62} {...PAINT.raised} />
      <circle cx={cx} cy={cy} r={r * 0.5} {...PAINT.recess} />
      {blades}
      <circle cx={cx} cy={cy} r={r * 0.14} {...PAINT.raised} />
      <circle cx={cx} cy={cy} r={r * 0.06} {...PAINT.shaft} />
      {[45, 135, 225, 315].map((a) => {
        const t = (a * Math.PI) / 180;
        return <Bolt key={a} x={cx + Math.cos(t) * r * 0.56} y={cy + Math.sin(t) * r * 0.56} r={Math.max(1, r * 0.016)} />;
      })}
      {/* inspection door and drain */}
      <rect x={cx - r * 0.86} y={cy + r * 0.2} width={r * 0.16} height={r * 0.22} rx={2} {...PAINT.recess} />
      <rect x={cx - r * 0.05} y={cy + r - 1} width={r * 0.1} height={r * 0.06} rx={1} {...PAINT.raised} />
    </g>
  );
}

/** Plummer-block bearing: housing with split cap at the shaft line, seals, sight glass, grease nipple and sole plate. */
export function PlummerBlock({ cx, cy, top, bottom, w, shaft = 10 }: { cx: number; cy: number; top: number; bottom: number; w: number; shaft?: number }) {
  return (
    <g aria-hidden="true">
      <rect x={cx - w / 2 - 5} y={bottom - 2} width={w + 10} height={Math.max(7, w * 0.2)} rx={2} {...PAINT.body} />
      <Bolt x={cx - w / 2} y={bottom + Math.max(7, w * 0.2) / 2 - 2} r={1.4} />
      <Bolt x={cx + w / 2} y={bottom + Math.max(7, w * 0.2) / 2 - 2} r={1.4} />
      <rect x={cx - w / 2 - 3} y={cy - shaft / 2 - 2} width={w + 6} height={shaft + 4} rx={2} {...PAINT.raised} />
      <rect x={cx - w / 2} y={top} width={w} height={bottom - top} rx={w * 0.2} {...PAINT.body} />
      <rect x={cx - w / 2 + 3} y={top + 3} width={w - 6} height={bottom - top - 6} rx={w * 0.16} {...PAINT.hair} />
      <line x1={cx - w / 2 + 1} x2={cx + w / 2 - 1} y1={cy} y2={cy} stroke={MX.edge} strokeWidth={1.2} />
      <Bolt x={cx - w / 2 + 5} y={cy - 4} r={1.4} />
      <Bolt x={cx + w / 2 - 5} y={cy - 4} r={1.4} />
      <rect x={cx - 3} y={top - 4} width={6} height={4.5} rx={1} {...PAINT.shaft} />
      <circle cx={cx + w / 2 - 6} cy={bottom - 7} r={2.4} {...PAINT.recess} />
    </g>
  );
}
