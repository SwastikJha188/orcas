/**
 * Shared shapes of the KLN-01 part sheets drawn from the machine group images
 * (pages 3A / 3C): flow lines with filled heads, tone labels, the hot
 * refractory face, a flame / hot-spot glow, a dashed instrument outline and
 * the roller-station plan parts (tyre, roller with its two bearing housings,
 * oil bath). Kit paints and flow tokens only, so both themes follow.
 */
import React from "react";
import { Bolt, MX, PAINT } from "@/components/assets/machine-kit/machine-kit";

export type Pt = [number, number];

/** Filled arrowhead with its tip at (x, y), pointing along `deg` (0 = +x, 90 = +y). */
export function Head({ x, y, deg, color, s = 8 }: { x: number; y: number; deg: number; color: string; s?: number }) {
  return (
    <path
      d={`M 0 0 L ${-s} ${-s * 0.55} L ${-s} ${s * 0.55} Z`}
      transform={`translate(${x} ${y}) rotate(${deg})`}
      fill={color}
      stroke={color}
      strokeWidth={0.6}
      strokeLinejoin="round"
      aria-hidden="true"
    />
  );
}

/**
 * Flow line through `pts` (solid or dashed). Solid axis-aligned runs are drawn
 * as rects, so gradient paints (the brass material) keep a real bounding box.
 */
export function Flow({ pts, color, dash, w = 1.8, opacity }: { pts: Pt[]; color: string; dash?: string; w?: number; opacity?: number }) {
  const ortho = !dash && pts.slice(1).every(([bx, by], i) => bx === pts[i][0] || by === pts[i][1]);
  if (ortho)
    return (
      <g aria-hidden="true" opacity={opacity}>
        {pts.slice(1).map(([bx, by], i) => {
          const [ax, ay] = pts[i];
          return <rect key={i} x={Math.min(ax, bx) - w / 2} y={Math.min(ay, by) - w / 2} width={Math.abs(bx - ax) + w} height={Math.abs(by - ay) + w} fill={color} />;
        })}
      </g>
    );
  return (
    <polyline
      points={pts.map((p) => p.join(",")).join(" ")}
      fill="none"
      stroke={color}
      strokeWidth={w}
      strokeDasharray={dash}
      strokeLinejoin="round"
      strokeLinecap="round"
      opacity={opacity}
      aria-hidden="true"
    />
  );
}

/** Line with a filled head at its end (flow direction arrow). */
export function FlowArrow({ x1, y1, x2, y2, color, w = 1.6, s = 8 }: { x1: number; y1: number; x2: number; y2: number; color: string; w?: number; s?: number }) {
  const deg = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  const k = s * 0.8;
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  return (
    <g aria-hidden="true">
      <Flow pts={[[x1, y1], [x2 - ((x2 - x1) / len) * k, y2 - ((y2 - y1) / len) * k]]} color={color} w={w} />
      <Head x={x2} y={y2} deg={deg} color={color} s={s} />
    </g>
  );
}

/** Spaced upper-case note in a flow / caution colour token. */
export function ToneLabel({ x, y, color, anchor = "start", size = 7, children }: { x: number; y: number; color: string; anchor?: "start" | "middle" | "end"; size?: number; children: React.ReactNode }) {
  return (
    <text x={x} y={y} fill={color} fontSize={size} fontWeight={600} letterSpacing="0.14em" textAnchor={anchor}>
      {children}
    </text>
  );
}

/** Hot interior (refractory face): dark with a heat wash. */
export function HotFace({ x, y, w, h, rx = 4, heat = 0.3 }: { x: number; y: number; w: number; h: number; rx?: number; heat?: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={rx} fill={MX.deep} stroke={MX.edge} strokeWidth={MX.w} />
      <rect x={x} y={y} width={w} height={h} rx={rx} fill={MX.heat} opacity={heat} />
    </g>
  );
}

/** Soft radial glow (flame, shell hot spot) in the material tones. */
export function Glow({ cx, cy, rx, ry, core = 1 }: { cx: number; cy: number; rx: number; ry: number; core?: number }) {
  const id = `${React.useId().replace(/:/g, "")}-glow`;
  return (
    <g aria-hidden="true">
      <defs>
        <radialGradient id={id} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--mx-material-hi)" stopOpacity={core} />
          <stop offset="0.45" stopColor="var(--mx-material)" stopOpacity={0.75 * core} />
          <stop offset="0.8" stopColor="var(--mx-material-deep)" stopOpacity={0.3 * core} />
          <stop offset="1" stopColor="var(--mx-material-deep)" stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${id})`} />
    </g>
  );
}

/** Dashed outline (cooling shroud, inset frame). */
export function DashBox({ x, y, w, h, color = MX.fine, rx = 5, dash = "5 4", w2 = 1.2 }: { x: number; y: number; w: number; h: number; color?: string; rx?: number; dash?: string; w2?: number }) {
  return <rect x={x} y={y} width={w} height={h} rx={rx} fill="none" stroke={color} strokeWidth={w2} strokeDasharray={dash} aria-hidden="true" />;
}

/** Small instrument head / transmitter box with a process connection towards `dir`. */
export function Transmitter({ x, y, w = 12, h = 12, stem = 0, dir = "down" }: { x: number; y: number; w?: number; h?: number; stem?: number; dir?: "up" | "down" | "left" | "right" }) {
  const s =
    dir === "down"
      ? { x: x - 1.5, y: y + h / 2, width: 3, height: stem }
      : dir === "up"
        ? { x: x - 1.5, y: y - h / 2 - stem, width: 3, height: stem }
        : dir === "left"
          ? { x: x - w / 2 - stem, y: y - 1.5, width: stem, height: 3 }
          : { x: x + w / 2, y: y - 1.5, width: stem, height: 3 };
  return (
    <g aria-hidden="true">
      {stem > 0 && <rect {...s} {...PAINT.shaft} />}
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={2.5} {...PAINT.body} />
      <circle cx={x} cy={y} r={Math.min(w, h) * 0.2} {...PAINT.recess} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Roller station in plan (looking down)                               */
/* ------------------------------------------------------------------ */

/** Riding tyre seen from above: a long vertical band across both rollers. */
export function TyrePlan({ cx, y1, y2, w }: { cx: number; y1: number; y2: number; w: number }) {
  return (
    <g aria-hidden="true">
      <rect x={cx - w / 2} y={y1} width={w} height={y2 - y1} rx={5} {...PAINT.cylinderV} />
      <line x1={cx - w / 2 + 3} x2={cx - w / 2 + 3} y1={y1 + 5} y2={y2 - 5} {...PAINT.hair} />
      <line x1={cx + w / 2 - 3} x2={cx + w / 2 - 3} y1={y1 + 5} y2={y2 - 5} {...PAINT.hair} />
    </g>
  );
}

/** Bearing housing seen from above, bolted down, with its RTD pocket. */
export function HousingPlan({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={4} {...PAINT.body} />
      <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} rx={2.5} fill="none" stroke={MX.fine} strokeWidth={0.8} />
      <Bolt x={x + 4.5} y={y + 4.5} r={1.2} />
      <Bolt x={x + w - 4.5} y={y + 4.5} r={1.2} />
      <Bolt x={x + 4.5} y={y + h - 4.5} r={1.2} />
      <Bolt x={x + w - 4.5} y={y + h - 4.5} r={1.2} />
    </g>
  );
}

/** Support roller seen from above: shaft body between its two bearing housings. */
export function RollerPlan({ x1, x2, cy, d, hw, hh }: { x1: number; x2: number; cy: number; d: number; hw: number; hh: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x1} y={cy - d / 2} width={x2 - x1} height={d} rx={3} {...PAINT.cylinder} />
      {[0.25, 0.75].map((f) => (
        <line key={f} x1={x1 + (x2 - x1) * f} x2={x1 + (x2 - x1) * f} y1={cy - d / 2 + 2} y2={cy + d / 2 - 2} {...PAINT.hair} opacity={0.5} />
      ))}
      <HousingPlan x={x1 - hw} y={cy - hh / 2} w={hw} h={hh} />
      <HousingPlan x={x2} y={cy - hh / 2} w={hw} h={hh} />
    </g>
  );
}

/** Oil bath under a roller, drawn as its brass level window bar. */
export function OilBath({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={3} fill={MX.material} stroke={MX.edge} strokeWidth={MX.wFine} />
      <line x1={x + 3} x2={x + w - 3} y1={y + h * 0.35} y2={y + h * 0.35} stroke={MX.edge} strokeWidth={0.6} opacity={0.5} />
    </g>
  );
}
