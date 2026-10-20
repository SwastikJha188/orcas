/**
 * Shared shapes of the feed-system part sheets F-1 … F-7 (drawn from the
 * machine group images): material arrows, instrument heads, side-view motors,
 * load cells, solid-flow meters, dust-collector fans. Kit paints only, so
 * every shape follows the light and dark themes.
 */
import React from "react";
import { Bolt, Fan, MX, PAINT } from "@/components/assets/machine-kit/machine-kit";

/**
 * Gold material-flow arrow (process material). The shaft is a rotated rect,
 * not a stroked line: the kit's gradient paints need a non-degenerate box.
 */
export function FlowArrow({ x1, y1, x2, y2, head = 8, w = 2 }: { x1: number; y1: number; x2: number; y2: number; head?: number; w?: number }) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const len = Math.max(0, Math.hypot(x2 - x1, y2 - y1) - head * 0.6);
  const p = (o: number): [number, number] => [x2 - head * Math.cos(a + o), y2 - head * Math.sin(a + o)];
  const [l, r] = [p(-0.45), p(0.45)];
  return (
    <g aria-hidden="true">
      <rect x={x1} y={y1 - w / 2} width={len} height={w} rx={w / 2} transform={`rotate(${(a * 180) / Math.PI} ${x1} ${y1})`} {...PAINT.material} />
      <path d={`M ${l[0]} ${l[1]} L ${x2} ${y2} L ${r[0]} ${r[1]} Z`} fill={MX.material} stroke={MX.material} strokeWidth={1} strokeLinejoin="round" />
    </g>
  );
}

/** Dashed gold meal line (air-slide bed seen from above) from (x1, y1) to (x2, y2), drawn as dash rects. */
export function MealDashes({ x1, y1, x2, y2, dash = 4, gap = 3, w = 1.6 }: { x1: number; y1: number; x2: number; y2: number; dash?: number; gap?: number; w?: number }) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const deg = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  const dashes: React.ReactNode[] = [];
  for (let s = 0; s < len - 0.5; s += dash + gap) dashes.push(<rect key={s} x={x1 + s} y={y1 - w / 2} width={Math.min(dash, len - s)} height={w} {...PAINT.material} />);
  return (
    <g aria-hidden="true" transform={`rotate(${deg} ${x1} ${y1})`}>
      {dashes}
    </g>
  );
}

/** Neutral direction arrow (hairline with a filled head), e.g. "to atmosphere". */
export function PlainArrow({ x1, y1, x2, y2, head = 7 }: { x1: number; y1: number; x2: number; y2: number; head?: number }) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const p = (o: number): [number, number] => [x2 - head * Math.cos(a + o), y2 - head * Math.sin(a + o)];
  const [l, r] = [p(-0.42), p(0.42)];
  return (
    <g aria-hidden="true">
      <line x1={x1} y1={y1} x2={x2 - head * 0.6 * Math.cos(a)} y2={y2 - head * 0.6 * Math.sin(a)} stroke={MX.label} strokeWidth={1.3} />
      <path d={`M ${l[0]} ${l[1]} L ${x2} ${y2} L ${r[0]} ${r[1]} Z`} fill={MX.label} stroke={MX.label} strokeWidth={1} strokeLinejoin="round" />
    </g>
  );
}

/** Small instrument head (switch / transmitter body) centred on (x, y). */
export function Instr({ x, y, w = 14, h = 14 }: { x: number; y: number; w?: number; h?: number }) {
  return <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={Math.min(3, h / 3)} {...PAINT.body} />;
}

/**
 * Side-view induction motor as drawn on the group images: rounded frame with
 * cooling fins, name plate, terminal box on top, fan cowl at one end and the
 * shaft stub at the other (`shaft` side), feet below.
 */
export function SideMotor({ x, y, w, h, shaft = "l", box = 0.5 }: { x: number; y: number; w: number; h: number; shaft?: "l" | "r"; box?: number }) {
  const cw = h * 0.33;
  const cowlX = shaft === "l" ? x + w - 2 : x - cw + 2;
  const shX = shaft === "l" ? x - h * 0.22 : x + w;
  const fins: React.ReactNode[] = [];
  const n = Math.max(3, Math.round(h / 10));
  for (let i = 1; i <= n; i++) {
    const fy = y + (h * i) / (n + 1);
    fins.push(<line key={i} x1={x + w * 0.08} x2={x + w * 0.92} y1={fy} y2={fy} stroke={MX.fine} strokeWidth={1} />);
  }
  const tbW = w * 0.38;
  const tbX = x + w * box - tbW / 2;
  return (
    <g aria-hidden="true">
      <rect x={shX} y={y + h * 0.43} width={h * 0.22} height={h * 0.14} {...PAINT.shaft} />
      <rect x={x + w * 0.1} y={y + h} width={w * 0.8} height={Math.max(3, h * 0.09)} rx={1.5} {...PAINT.raised} />
      <rect x={cowlX} y={y + h * 0.11} width={cw} height={h * 0.78} rx={Math.min(8, cw * 0.4)} {...PAINT.body} />
      <rect x={x} y={y} width={w} height={h} rx={Math.min(10, h * 0.16)} {...PAINT.body} />
      {fins}
      <rect x={x + w * 0.33} y={y + h * 0.38} width={w * 0.34} height={h * 0.24} rx={2} {...PAINT.recess} />
      <rect x={tbX} y={y - h * 0.2} width={tbW} height={h * 0.2 + 1} rx={3} {...PAINT.raised} />
    </g>
  );
}

/** Load cell under a bin lug: bracket block with the (blue) load-cell wedge below. */
export function LoadCell({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  // (x, y) = wedge apex; wedge base sits on the beam at y + 13 s.
  return (
    <g aria-hidden="true">
      <rect x={x - 11 * s} y={y - 6 * s} width={22 * s} height={12 * s} rx={2 * s} {...PAINT.raised} />
      <path d={`M ${x - 10 * s} ${y + 13 * s} L ${x} ${y} L ${x + 10 * s} ${y + 13 * s} Z`} fill={MX.air} stroke={MX.edge} strokeWidth={0.8} strokeLinejoin="round" opacity={0.9} />
    </g>
  );
}

/**
 * Solid-flow meter elevation: inlet cap, housing with a sight window and the
 * inclined impact plate, outlet cone. `x, y` = housing top-left.
 */
export function SolidFlowMeter({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const capW = w * 0.66;
  const capH = h * 0.19;
  const wx = x + (w - capW) / 2;
  const coneH = h * 0.21;
  return (
    <g aria-hidden="true">
      <path d={`M ${wx} ${y + h} H ${wx + capW} L ${wx + capW * 0.76} ${y + h + coneH} H ${wx + capW * 0.24} Z`} {...PAINT.cylinderV} />
      <rect x={wx} y={y - capH} width={capW} height={capH + 4} rx={6} {...PAINT.raised} />
      <rect x={x} y={y} width={w} height={h} rx={10} {...PAINT.body} />
      <rect x={wx} y={y + h * 0.125} width={capW} height={h * 0.72} rx={4} {...PAINT.recess} />
      <line x1={wx + capW * 0.17} y1={y + h * 0.24} x2={wx + capW * 0.84} y2={y + h * 0.61} stroke={MX.metal} strokeWidth={2.6} strokeLinecap="round" />
    </g>
  );
}

/** Dust-collector / blower fan: Volute-like scroll with the outlet rising on the left, impeller inside. */
export function ScrollFan({ cx, cy, r, outTop, outW }: { cx: number; cy: number; r: number; outTop: number; outW: number }) {
  // Scroll: outlet on the left from outTop down, round on the right.
  const xl = cx - r * 1.02;
  const d = [
    `M ${xl} ${outTop}`,
    `H ${xl + outW}`,
    `L ${xl + outW} ${cy - r * 1.05}`,
    `A ${r * 1.08} ${r * 1.08} 0 1 1 ${cx - r * 0.2} ${cy + r * 1.08}`,
    `Q ${xl} ${cy + r * 1.0} ${xl} ${cy + r * 0.2}`,
    "Z",
  ].join(" ");
  return (
    <g aria-hidden="true">
      <path d={d} {...PAINT.body} />
      <circle cx={cx} cy={cy} r={r * 0.62} fill="none" stroke={MX.edge} strokeWidth={1.2} />
      <Fan cx={cx} cy={cy} r={r * 0.5} />
      {[40, 140, 220, 320].map((deg) => {
        const a = (deg * Math.PI) / 180;
        return <Bolt key={deg} x={cx + Math.cos(a) * r * 0.86} y={cy + Math.sin(a) * r * 0.86} r={1.4} />;
      })}
    </g>
  );
}
