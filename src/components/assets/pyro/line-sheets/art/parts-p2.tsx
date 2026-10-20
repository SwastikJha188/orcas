/**
 * Shared shapes of the preheater part sheets P-1 … P-5, G-1, G-2 (drawn from
 * the ULTRON pyro-line machine group images, pages 2A–2C): flow lines and
 * arrowheads, small-caps labels in flow colours, dampers, instrument boxes,
 * the kiln inlet chamber and the fan / bearing / motor train shared by the ID
 * fan (P-4) and the baghouse fan (G-2). Machine-kit paints only.
 */
import React from "react";
import { Bolt, Coupling, CornerBolts, GroundLine, MX, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Pipe } from "../../drawings/fkp-parts";
import { FanCasing } from "./parts-p";

export type Pt = [number, number];

/** Flat flow colours for strokes and thin bars (gradient paints need a real bounding box). */
export const MEAL = "var(--mx-material)";
export const FLOW = { meal: MEAL, gas: MX.gas, air: MX.air, neutral: MX.label } as const;

/** Filled arrowhead at (x, y) pointing `dir`. */
export function Head({ x, y, dir, fill, s = 5 }: { x: number; y: number; dir: "r" | "l" | "u" | "d"; fill: string; s?: number }) {
  const a = { r: 0, d: 90, l: 180, u: 270 }[dir];
  return <path d={`M ${x + s} ${y} L ${x - s * 0.7} ${y - s * 0.75} L ${x - s * 0.7} ${y + s * 0.75} Z`} fill={fill} transform={`rotate(${a} ${x} ${y})`} aria-hidden="true" />;
}

/** Orthogonal flow line (stroke), optionally dashed. */
export function FlowLine({ pts, color, w = 1.6, dash }: { pts: Pt[]; color: string; w?: number; dash?: string }) {
  return <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={color} strokeWidth={w} strokeDasharray={dash} strokeLinejoin="round" aria-hidden="true" />;
}

/** Flow arrow: straight line from (x1, y1) to (x2, y2) with a head at the end. */
export function FlowArrow({ x1, y1, x2, y2, color, w = 1.6, s = 5 }: { x1: number; y1: number; x2: number; y2: number; color: string; w?: number; s?: number }) {
  const dir = x2 > x1 ? "r" : x2 < x1 ? "l" : y2 > y1 ? "d" : "u";
  const bx = dir === "r" ? x2 - s * 0.6 : dir === "l" ? x2 + s * 0.6 : x2;
  const by = dir === "d" ? y2 - s * 0.6 : dir === "u" ? y2 + s * 0.6 : y2;
  return (
    <g aria-hidden="true">
      <line x1={x1} y1={y1} x2={bx} y2={by} stroke={color} strokeWidth={w} />
      <Head x={x2 - (dir === "r" ? s : dir === "l" ? -s : 0)} y={y2 - (dir === "d" ? s : dir === "u" ? -s : 0)} dir={dir} fill={color} s={s} />
    </g>
  );
}

/** Material stream as thin bars along orthogonal points (rects, so the paint has a bounding box). */
export function MealLine({ pts, w = 2 }: { pts: Pt[]; w?: number }) {
  return (
    <g aria-hidden="true">
      {pts.slice(0, -1).map(([ax, ay], i) => {
        const [bx, by] = pts[i + 1];
        return <rect key={i} x={Math.min(ax, bx) - w / 2} y={Math.min(ay, by) - w / 2} width={Math.abs(bx - ax) + w} height={Math.abs(by - ay) + w} fill={MEAL} />;
      })}
    </g>
  );
}

/** Small-caps technical label; `color` for the PDF's flow-coloured captions. */
export function Caps({
  x,
  y,
  children,
  size = 6,
  anchor = "start",
  color = MX.label,
  spacing = "0.2em",
}: {
  x: number;
  y: number;
  children: React.ReactNode;
  size?: number;
  anchor?: "start" | "middle" | "end";
  color?: string;
  spacing?: string;
}) {
  return (
    <text x={x} y={y} fill={color} fontSize={size} fontWeight={600} letterSpacing={spacing} textAnchor={anchor} aria-hidden="true">
      {children}
    </text>
  );
}

/** Damper frame across a duct with the blade on the diagonal. */
export function Damper({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={2.5} {...PAINT.body} />
      <rect x={x + 2.5} y={y + 2.5} width={w - 5} height={h - 5} rx={1.5} {...PAINT.recess} />
      <line x1={x + w * 0.2} y1={y + h - 4} x2={x + w * 0.8} y2={y + 4} stroke={MEAL} strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}

/** Instrument housing (raised box) with an optional recessed window. */
export function InstrumentBox({ x, y, w, h, rx = 3, window = true }: { x: number; y: number; w: number; h: number; rx?: number; window?: boolean }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={rx} {...PAINT.raised} />
      {window && <rect x={x + 2.5} y={y + 2.5} width={w - 5} height={h - 5} rx={Math.max(1, rx - 1.5)} {...PAINT.recess} />}
    </g>
  );
}

/** Impulse / signal line (hairline), dashed for sample and purge lines. */
export function Tap({ pts, dashed = false, color = MX.label }: { pts: Pt[]; dashed?: boolean; color?: string }) {
  return <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={color} strokeWidth={0.9} strokeDasharray={dashed ? "3 2.5" : undefined} aria-hidden="true" />;
}

/** Gas analyser cabinet with measuring-cell windows (centres `cells`, cell size `cw` × `ch`). */
export function Analyser({ x, y, w, h, cells, cy, cw, ch }: { x: number; y: number; w: number; h: number; cells: number[]; cy: number; cw: number; ch: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={4} {...PAINT.body} />
      <rect x={x + 3} y={y + 3} width={w - 6} height={h - 6} rx={3} fill="none" stroke={MX.fine} strokeWidth={0.8} />
      {cells.map((cx) => (
        <rect key={cx} x={cx - cw / 2} y={cy - ch / 2} width={cw} height={ch} rx={2.5} {...PAINT.recess} />
      ))}
    </g>
  );
}

/** Refractory-lined kiln inlet chamber (glowing interior) and the rotary-kiln stub on its right. */
export function KilnInlet({ x, y, w, h, kiln }: { x: number; y: number; w: number; h: number; kiln: [number, number, number, number] }) {
  const [kx, ky, kw, kh] = kiln;
  return (
    <g aria-hidden="true">
      <rect x={kx - 4} y={ky} width={kw + 4} height={kh} rx={Math.min(8, kh * 0.18)} {...PAINT.cylinder} />
      <line x1={kx + 4} x2={kx + kw - 6} y1={ky + kh * 0.24} y2={ky + kh * 0.24} {...PAINT.hair} />
      <line x1={kx + 4} x2={kx + kw - 6} y1={ky + kh * 0.76} y2={ky + kh * 0.76} {...PAINT.hair} />
      <rect x={x} y={y} width={w} height={h} rx={5} {...PAINT.body} />
      <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} rx={3.5} {...PAINT.recess} />
      <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} rx={3.5} fill={MX.heat} opacity={0.3} />
      <CornerBolts x={x} y={y} w={w} h={h} inset={3} r={1.1} />
    </g>
  );
}

/** Pipe through a wall: short orthogonal duct (kit Pipe) re-exported for sheet files. */
export { Pipe };

/**
 * Fan train of the ID fan (P-4) and the baghouse fan (G-2), as drawn on group
 * images 2B / 2C: inlet duct stub, volute with impeller, outlet duct rising
 * and running right, overhung shaft on two pedestal bearings, coupling, motor
 * (drive end left) with terminal box and encoder cowl, on a concrete plinth.
 * Sheet units of the 763 × 672 panels.
 */
export function FanTrain() {
  const fan = { cx: 232.5, cy: 377.5, r: 122, outTop: 226 };
  const shaftY = 378;
  const bearings = [408.5, 489.5];
  return (
    <g>
      <GroundLine x1={30} x2={745} y={607.5} />
      {/* plinth and base slab */}
      <rect x={104.5} y={526.5} width={642} height={81} rx={3} {...PAINT.body} />
      <rect x={110} y={532} width={631} height={70} rx={2} fill="none" stroke={MX.fine} strokeWidth={0.8} />
      <rect x={98} y={506} width={655} height={20.5} rx={3} {...PAINT.raised} />
      {/* inlet duct stub */}
      <rect x={37.5} y={296} width={73.5} height={42.5} rx={2} {...PAINT.cylinder} />
      <rect x={37.5} y={312} width={73.5} height={10.5} fill={MX.deep} opacity={0.55} />
      {/* outlet duct */}
      <Pipe pts={[[294, fan.outTop + 2], [294, 81], [726, 81]]} d={43} />
      <rect x={300} y={76} width={426} height={10} fill={MX.deep} opacity={0.4} />
      <rect x={289} y={87} width={10} height={fan.outTop - 87} fill={MX.deep} opacity={0.4} />
      <FanCasing cx={fan.cx} cy={fan.cy} r={fan.r} outTop={fan.outTop} baseY={506} />
      {/* shaft */}
      <rect x={fan.cx} y={shaftY - 5.5} width={565 - fan.cx} height={11} rx={2.5} {...PAINT.shaft} />
      {/* pedestal bearings */}
      {bearings.map((x) => (
        <g key={x}>
          <rect x={x - 30} y={411} width={60} height={10} rx={2} {...PAINT.raised} />
          <Bolt x={x - 24} y={416} r={1.5} />
          <Bolt x={x + 24} y={416} r={1.5} />
          <rect x={x - 23} y={344} width={46} height={67} rx={5} {...PAINT.body} />
          <rect x={x - 19.5} y={347.5} width={39} height={60} rx={3.5} fill="none" stroke={MX.fine} strokeWidth={0.8} />
          <rect x={x - 25} y={shaftY - 7.5} width={50} height={15} rx={2.5} {...PAINT.raised} />
          <line x1={x - 22} x2={x + 22} y1={shaftY} y2={shaftY} stroke={MX.edge} strokeWidth={1.1} />
          <rect x={x - 3} y={340} width={6} height={4.5} rx={1} {...PAINT.shaft} />
        </g>
      ))}
      {/* coupling and stub shaft */}
      <Coupling x={530} y={364} w={30} h={27.5} />
      {[537, 544, 551].map((x) => (
        <line key={x} x1={x} x2={x} y1={366} y2={389} stroke={MX.fine} strokeWidth={0.8} />
      ))}
      {/* motor, drive end left */}
      <rect x={585} y={432} width={113.5} height={6.5} rx={1.5} {...PAINT.raised} />
      <rect x={598} y={438.5} width={88} height={67.5} rx={2} {...PAINT.body} />
      <rect x={570.5} y={324} width={142} height={108.5} rx={18} {...PAINT.body} />
      {[340, 356, 370.5, 386, 401.5, 416].map((y) => (
        <line key={y} x1={582} x2={701} y1={y} y2={y} stroke={MX.fine} strokeWidth={0.9} />
      ))}
      <rect x={617.5} y={365} width={48.5} height={28.5} rx={2.5} {...PAINT.recess} />
      <rect x={613} y={300} width={57} height={26} rx={4} {...PAINT.body} />
      <rect x={617} y={304} width={49} height={18} rx={3} fill="none" stroke={MX.fine} strokeWidth={0.8} />
      {/* encoder / fan cowl at the non-drive end */}
      <rect x={712.5} y={334} width={32.5} height={87.5} rx={16} {...PAINT.body} />
      <rect x={716.5} y={340} width={24.5} height={75.5} rx={12} fill="none" stroke={MX.fine} strokeWidth={0.8} />
    </g>
  );
}
