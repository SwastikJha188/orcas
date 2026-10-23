/**
 * Sheet P-0 — PHC-01 · Preheater, calciner, ID fan and main baghouse — Overview (design Preheater Rev02).
 *
 * Drawn in the design's 2000 × 1125 frame, left → right: the six-stage cyclone tower (C2 / C4 / C6 in the left
 * column, C1 / C3 / C5 in the right), hot gas rising riser to riser (red dashed), meal falling stage to stage
 * (brass) from the feed at the C2 → C1 riser; the calciner with its flame, outlet duct and gas analyser, meal
 * split gate, calciner coal line and tertiary-air duct with its damper; the kiln inlet; the exit-gas duct from
 * C1 with the exit gas analyser, the WHRS loop (inlet / outlet / bypass dampers) and the ID fan train on its base;
 * the duct over to the main baghouse (pulse controller, three compartments, hoppers, airlocks); the baghouse fan
 * and the stack. Readout blocks stand round the drawing (`readouts`).
 */
import React from "react";
import { Bolt, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import type { Pt } from "../../drawings/clk-parts";
import type { LineSheetArt } from "../types";
import { volutePath } from "./parts-c";
import { Core, Head, Line, RotaryFeeder, Tap, Tube } from "./parts-d";

const W = 2000;
const H = 1125;
const GROUND = 657;
const MEAL = MX.material;
const GAS = MX.gas;
const AIR = MX.air;

/* ---------------------------------------------------------------- tower geometry */
const LX = 581; // left column (C2, C4, C6)
const RX = 719; // right column (C1, C3, C5)
const TOP = [218, 273, 328, 383, 438, 493]; // cylinder top of C1 … C6
const cx = (n: number) => (n % 2 ? RX : LX);
const top = (n: number) => TOP[n - 1];
const LANE_R = 660; // up-leg of a left-column stage's riser into the right column
const LANE_L = 641; // up-leg of a right-column stage's riser into the left column

/** Riser from stage n (2 … 6) up into stage n − 1. */
function riser(n: number): Pt[] {
  const left = cx(n) === LX;
  const t = top(n);
  const yIn = top(n - 1) + 10;
  return left
    ? [[LX, t], [LX, t - 10], [LANE_R, t - 10], [LANE_R, yIn], [RX - 36, yIn]]
    : [[RX, t], [RX, t - 11], [LANE_L, t - 11], [LANE_L, yIn], [LX + 36, yIn]];
}

/** Cyclone: cylinder with its top flange, cone and meal spigot. */
function Cyclone({ n }: { n: number }) {
  const x = cx(n);
  const t = top(n);
  return (
    <g>
      <rect x={x - 35} y={t} width={70} height={25} rx={3} {...PAINT.cylinderV} />
      <path d={`M ${x - 35} ${t + 25} L ${x + 35} ${t + 25} L ${x + 9} ${t + 51} L ${x - 9} ${t + 51} Z`} {...PAINT.cylinderV} />
      <rect x={x - 38} y={t - 4} width={76} height={8} rx={3} {...PAINT.raised} />
      <rect x={x - 12.5} y={t + 50} width={25} height={7} rx={3} {...PAINT.raised} />
      <MachineLabel x={x} y={t + 16} size={9.5} tone="ink">
        {`C${n}`}
      </MachineLabel>
    </g>
  );
}

/** Damper in a duct: frame across the run with a brass blade on the diagonal. */
function Damper({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={2.5} {...PAINT.raised} />
      <line x1={x - w / 2 + 3} y1={y + h / 2 - 3} x2={x + w / 2 - 3} y2={y - h / 2 + 3} stroke={MEAL} strokeWidth={1.8} strokeLinecap="round" />
    </g>
  );
}

/** Instrument housing with windows (each window holds a tap). */
function Housing({ x, y, w, h, wins }: { x: number; y: number; w: number; h: number; wins: Array<[number, number, number, number]> }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={4} {...PAINT.body} />
      {wins.map(([wx, wy, ww, wh]) => (
        <rect key={wx} x={wx} y={wy} width={ww} height={wh} rx={2} {...PAINT.raised} />
      ))}
    </g>
  );
}

/** Meal stream (brass core only) with heads. */
function Meal({ pts, heads = [], dash }: { pts: Pt[]; heads?: Array<[number, number, "left" | "right" | "up" | "down"]>; dash?: number }) {
  return (
    <g aria-hidden="true">
      <Core pts={pts} color={MEAL} w={2} dash={dash} />
      {heads.map(([x, y, d], i) => (
        <Head key={i} x={x} y={y} dir={d} color={MEAL} s={1.05} />
      ))}
    </g>
  );
}

/** Motor seen from the side: finned frame, terminal box, dark window, end cowl on `cowl` side. */
function SideMotor({ x, y, w, h, cowl }: { x: number; y: number; w: number; h: number; cowl: 1 | -1 }) {
  const fins = Math.max(4, Math.round(h / 8));
  const cw = w * 0.22;
  return (
    <g aria-hidden="true">
      <rect x={cowl > 0 ? x + w - 2 : x - cw + 2} y={y + h * 0.1} width={cw} height={h * 0.8} rx={Math.min(8, cw / 2)} {...PAINT.body} />
      <rect x={x} y={y} width={w} height={h} rx={Math.min(8, h * 0.18)} {...PAINT.body} />
      {Array.from({ length: fins }).map((_, i) => {
        const fy = y + ((i + 1) * h) / (fins + 1);
        return <line key={i} x1={x + w * 0.08} x2={x + w * 0.92} y1={fy} y2={fy} stroke={MX.fine} strokeWidth={0.7} />;
      })}
      <rect x={x + w * 0.33} y={y + h * 0.38} width={w * 0.34} height={h * 0.26} rx={2} fill={MX.edge} stroke={MX.edge} strokeWidth={1} />
      <rect x={x + w * 0.29} y={y - h * 0.22} width={w * 0.42} height={h * 0.24} rx={3} {...PAINT.body} />
      <rect x={x + w * 0.1} y={y + h} width={w * 0.8} height={h * 0.1} rx={1.5} {...PAINT.body} />
    </g>
  );
}

/** Fan volute (outlet up on the right of the impeller) with the dark impeller face. */
function Volute({ cx: x, cy: y, r, outTop, face, bolts, blades = 3 }: { cx: number; cy: number; r: number; outTop: number; face: number; bolts: number; blades?: number }) {
  const v = volutePath(x, y, r, outTop, -1);
  return (
    <g aria-hidden="true">
      <path d={v.d} {...PAINT.body} />
      <circle cx={x} cy={y} r={face} fill={MX.edge} stroke={MX.edge} strokeWidth={MX.w} />
      <circle cx={x} cy={y} r={face * 0.8} fill="none" stroke={MX.metalHi} strokeWidth={1.3} />
      {Array.from({ length: blades }, (_, i) => -90 + (i * 360) / blades).map((a) => {
        const t = (a * Math.PI) / 180;
        const rb = face * 0.36;
        return <ellipse key={a} cx={x + Math.cos(t) * rb} cy={y + Math.sin(t) * rb} rx={rb} ry={rb * 0.5} transform={`rotate(${a} ${x + Math.cos(t) * rb} ${y + Math.sin(t) * rb})`} fill={MX.raised} stroke={MX.fine} strokeWidth={0.7} />;
      })}
      <circle cx={x} cy={y} r={face * 0.14} {...PAINT.shaft} />
      {[45, 135, 225, 315].map((a) => (
        <Bolt key={a} x={x + Math.cos((a * Math.PI) / 180) * bolts} y={y + Math.sin((a * Math.PI) / 180) * bolts} r={Math.max(1, r * 0.05)} />
      ))}
    </g>
  );
}

/* ---------------------------------------------------------------- tower, feed and meal */
function Tower() {
  const gasHeads = (n: number): Array<[number, number, "left" | "right" | "up" | "down"]> => {
    const p = riser(n);
    const left = cx(n) === LX;
    return [
      [left ? 630 : 676, p[1][1], left ? "right" : "left"],
      [p[2][0], (p[2][1] + p[3][1]) / 2 - 5, "up"],
      [left ? 677 : 623, p[3][1], left ? "right" : "left"],
    ];
  };
  return (
    <g>
      {[2, 3, 4, 5, 6].map((n) => (
        <Line key={n} pts={riser(n)} color={GAS} w={12} dash={6} heads={gasHeads(n)} />
      ))}
      {/* meal falling stage to stage: C1 → C3 → C5, C2 → C4 → C6 */}
      <Meal pts={[[659, 188], [659, 222]]} heads={[[659, 231, "down"]]} />
      {[1, 2, 3, 4].map((n) => {
        const x = cx(n);
        const y0 = top(n) + 57;
        const y1 = top(n + 2) - 15;
        return <Meal key={n} pts={[[x, y0], [x, y1]]} heads={[[x, y0 + 28, "down"]]} />;
      })}
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <Cyclone key={n} n={n} />
      ))}
    </g>
  );
}

/* ---------------------------------------------------------------- calciner, kiln inlet, coal, tertiary air */
function Calciner() {
  const flameId = `${React.useId().replace(/:/g, "")}-flame`;
  return (
    <g>
      {/* C6 meal to the kiln inlet, past the hot-meal tap */}
      <Meal pts={[[LX, 550], [LX, 640], [652, 640]]} heads={[[LX, 600, "down"], [625, 640, "right"]]} />
      {/* meal split: C5 → gate → calciner, and the split share to the kiln riser (dashed) */}
      <Meal pts={[[RX, 496], [RX, 520]]} />
      <Meal pts={[[712, 502], [682, 502], [682, 622]]} dash={5} />

      {/* calciner outlet duct into C6, gas sample line down to the analyser */}
      <line x1={650} y1={533} x2={650} y2={561} stroke={GAS} strokeWidth={1} strokeDasharray="3 2.5" />
      <Line
        pts={[[690, 526], [LANE_L, 526], [LANE_L, 501], [LX + 36, 501]]}
        color={GAS}
        w={13}
        dash={6}
        heads={[[663, 526, "left"], [LANE_L, 513, "up"], [624, 501, "left"]]}
      />

      {/* calciner coal line and tertiary-air duct from the right */}
      <Line pts={[[943, 564], [748, 564]]} color={MEAL} w={8} heads={[[849, 564, "left"]]} />
      <Line pts={[[943, 591], [748, 591]]} color={AIR} w={12} />
      <rect x={881.5} y={555} width={31.5} height={18} rx={4} {...PAINT.raised} />
      <Damper x={846} y={591} w={16} h={18} />
      <Head x={844} y={591} dir="left" color={AIR} s={1.05} />

      {/* body, cone, neck and top cap */}
      <rect x={688} y={512.5} width={62.5} height={86.5} rx={8} {...PAINT.cylinderV} />
      <line x1={690} x2={748} y1={536} y2={536} stroke={MX.fine} strokeWidth={0.8} />
      <path d="M 688 599 L 750.5 599 L 730 616 L 708 616 Z" {...PAINT.cylinderV} />
      <rect x={707.5} y={615.5} width={22.5} height={9} rx={2} {...PAINT.raised} />
      <rect x={694} y={506} width={50} height={8} rx={3} {...PAINT.raised} />
      <rect x={712} y={497} width={13} height={9} rx={2} {...PAINT.raised} />
      <MachineLabel x={RX} y={527} size={6} tone="ink">
        CALCINER
      </MachineLabel>
      <defs>
        <radialGradient id={flameId} cx="0.4" cy="0.5" r="0.65">
          <stop offset="0" stopColor="var(--mx-material-hi)" stopOpacity={1} />
          <stop offset="0.5" stopColor="var(--mx-material)" stopOpacity={0.85} />
          <stop offset="1" stopColor="var(--mx-material-deep)" stopOpacity={0.1} />
        </radialGradient>
      </defs>
      <ellipse cx={724} cy={572.5} rx={16} ry={13} fill={`url(#${flameId})`} />

      {/* kiln inlet */}
      <rect x={656.5} y={624} width={130.5} height={33} rx={6} {...PAINT.body} />
      <rect x={656.5} y={624} width={130.5} height={33} rx={6} fill={MX.heat} opacity={0.3} />
      <MachineLabel x={693} y={645.5} size={6} tone="ink">
        KILN INLET
      </MachineLabel>
      {/* hot gas up through the kiln inlet and calciner */}
      <Core pts={[[RX, 652], [RX, 545]]} color={GAS} w={1.8} dash={6} />
      <Head x={RX} y={631} dir="up" color={GAS} />
      <Head x={RX} y={566} dir="up" color={GAS} />
      {/* kiln feed out to the kiln, kiln gas in */}
      <Meal pts={[[787, 638.5], [894, 638.5]]} heads={[[848, 638.5, "right"]]} />
      <Core pts={[[894, 652], [791, 652]]} color={GAS} w={1.8} dash={6} />
      <Head x={835} y={652} dir="left" color={GAS} />

      {/* calciner gas analyser */}
      <Housing x={622.8} y={561} w={54.7} h={22.4} wins={[[627.5, 565.3, 18, 13.5], [651.5, 565.3, 18, 13.5]]} />
    </g>
  );
}

/* ---------------------------------------------------------------- exit gas, WHRS, ID fan */
function ExitAndFan() {
  return (
    <g>
      {/* C1 exit duct over to the bypass leg and into the fan inlet */}
      <Tube pts={[[RX, 218], [RX, 206], [894, 206], [894, 305], [904, 324]]} w={13} />
      <Core pts={[[RX, 216], [RX, 206], [894, 206], [894, 305]]} color={GAS} w={1.8} dash={6} />
      <line x1={894} y1={305} x2={902} y2={320} stroke={GAS} strokeWidth={1.8} strokeDasharray="6 4.2" />
      <Head x={811} y={206} dir="right" color={GAS} s={1.1} />
      {/* WHRS loop */}
      <Line pts={[[782, 206], [782, 294.5], [796, 294.5]]} color={GAS} w={12} dash={6} />
      <Line pts={[[870, 294.5], [894, 294.5]]} color={GAS} w={12} dash={6} />
      <rect x={795.5} y={271.5} width={75} height={50} rx={5} {...PAINT.body} />
      {[281, 290, 299, 308, 316].map((y) => (
        <line key={y} x1={802} x2={864} y1={y} y2={y} stroke={MX.label} strokeWidth={1.1} />
      ))}
      <MachineLabel x={833} y={331} size={6.5} tone="ink">
        WHRS
      </MachineLabel>
      <Damper x={782} y={251.5} w={15} h={17} />
      <Damper x={894} y={251.5} w={15} h={17} />
      <Damper x={882} y={295} w={18} h={15} />
      <Head x={782} y={258} dir="down" color={GAS} s={1.05} />
      <Head x={894} y={258} dir="down" color={GAS} s={1.05} />
      <Head x={889} y={295} dir="right" color={GAS} s={1.05} />

      {/* exit gas analyser */}
      <Housing x={793.8} y={223.8} w={60.2} h={28.8} wins={[[798.8, 228.2, 17, 14], [821, 228.2, 17, 14]]} />

      {/* fan outlet up and over to the baghouse */}
      <Line pts={[[971.5, 280], [971.5, 238], [1206, 238], [1206, 277]]} color={GAS} w={14} dash={6} heads={[[971.5, 256, "up"], [1090, 238, "right"], [1206, 264, "down"]]} />

      {/* ID fan train on its base: volute, two bearings, coupling, motor */}
      <rect x={906.5} y={378} width={250} height={6.5} rx={2} {...PAINT.body} />
      <rect x={950} y={329} width={114} height={6.5} rx={2} {...PAINT.shaft} />
      {[1006, 1044].map((bx) => (
        <g key={bx}>
          <rect x={bx - 16.5} y={348} width={33} height={8} rx={2} {...PAINT.body} />
          <rect x={bx - 12.5} y={316.8} width={25} height={31.5} rx={4} {...PAINT.body} />
        </g>
      ))}
      <rect x={1062.5} y={324} width={16} height={15} rx={2} {...PAINT.raised} />
      <line x1={1068} x2={1068} y1={326} y2={337} stroke={MX.edge} strokeWidth={1} />
      <line x1={1073} x2={1073} y1={326} y2={337} stroke={MX.edge} strokeWidth={1} />
      <SideMotor x={1081.5} y={305.5} w={78.5} h={51.5} cowl={1} />
      <Volute cx={950} cy={332} r={43} outTop={278.5} face={27} bolts={34} />
    </g>
  );
}

/* ---------------------------------------------------------------- baghouse, baghouse fan, stack */
function Baghouse() {
  const comps = [1194, 1246, 1298];
  return (
    <g>
      {/* outlet duct down to the baghouse fan */}
      <Line
        pts={[[1348, 285.7], [1406.7, 285.7], [1406.7, 563.3], [1361, 563.3], [1361, 580]]}
        color={GAS}
        w={14}
        dash={6}
        heads={[[1377, 285.7, "right"], [1406.7, 425, "down"], [1372, 563.3, "left"], [1361, 578, "down"]]}
      />
      {/* pulse controller and the two pressure boxes */}
      <rect x={1231} y={206} width={40.7} height={20.7} rx={3} {...PAINT.raised} />
      <rect x={1414.3} y={307.3} width={28.4} height={18.7} rx={3} {...PAINT.raised} />
      <rect x={1414.3} y={357.3} width={28.4} height={18.7} rx={3} {...PAINT.raised} />
      <Tap x={1428.5} y={366.7} r={3.8} />

      {/* compartments with bags, plenum on top */}
      <rect x={1194} y={314} width={156} height={146.7} rx={4} {...PAINT.body} />
      {comps.slice(1).map((x) => (
        <line key={x} x1={x} x2={x} y1={314} y2={460.7} stroke={MX.edge} strokeWidth={MX.w} />
      ))}
      {comps.map((c) =>
        [8.3, 17, 25.7, 34.4, 43.1].map((dx) => <line key={c + dx} x1={c + dx} x2={c + dx} y1={328} y2={447} stroke={MX.fine} strokeWidth={1} />),
      )}
      <rect x={1194} y={275.7} width={156} height={38.3} rx={5} {...PAINT.raised} />

      {/* hoppers, airlocks and dust discharge */}
      {comps.map((c, i) => {
        const m = c + 26;
        return (
          <g key={c}>
            <path d={`M ${c} 460.7 L ${c + 52} 460.7 L ${m + 7} 513.3 L ${m - 7} 513.3 Z`} {...PAINT.cylinderV} />
            <rect x={m + 3.3} y={481.6} width={8.7} height={8.7} rx={2} {...PAINT.raised} />
            <rect x={m - 3} y={513} width={6} height={4} fill={MX.edge} />
            <rect x={m + 13} y={522.3} width={13.3} height={8.4} rx={2.5} {...PAINT.raised} />
            <RotaryFeeder cx={m - 0.5} cy={527} s={26} />
            <Meal pts={[[m - 0.5, 541], [m - 0.5, 556]]} heads={[[m - 0.5, 566, "down"]]} />
          </g>
        );
      })}

      {/* baghouse fan: inlet stub on the left, volute, motor, base */}
      <rect x={1293.3} y={643.3} width={151} height={6.7} rx={2} {...PAINT.body} />
      <Tube pts={[[1300, 576], [1328, 576], [1328, 590]]} w={9} />
      <rect x={1380} y={599.3} width={13.3} height={25.7} rx={5} {...PAINT.body} />
      <SideMotor x={1393} y={596.7} w={50} h={30} cowl={-1} />
      <Volute cx={1350} cy={613.3} r={31.7} outTop={576.7} face={20} bolts={25} blades={4} />

      {/* stack with the gas rising */}
      <rect x={1450} y={201.7} width={8.7} height={GROUND - 201.7} rx={3} {...PAINT.cylinderV} />
      <Core pts={[[1454.3, 563], [1454.3, 216]]} color={GAS} w={1.8} dash={6} />
      <Head x={1454.3} y={386} dir="up" color={GAS} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={505} x2={1470} y={GROUND} />
      <Tower />
      <Calciner />
      <ExitAndFan />
      <Baghouse />
      {/* riser into C6 from the calciner outlet sits over the tower meal line */}


      <MachineLabel x={659} y={183} size={7}>
        MEAL FROM AIRLOCKS
      </MachineLabel>
      <MachineLabel x={843.5} y={614} size={7.5}>
        TERTIARY AIR DUCT
      </MachineLabel>
      {[
        [649, "PREHEATER + CALCINER"],
        [1018, "ID FAN"],
        [1271, "MAIN BAGHOUSE"],
        [1368, "BAGHOUSE FAN"],
        [1442, "STACK"],
      ].map(([x, t]) => (
        <MachineLabel key={t} x={x as number} y={677} size={7}>
          {t}
        </MachineLabel>
      ))}
    </g>
  );
}

/** Riser rings: pressure (upper) and temperature (lower) on the up-leg into stage n. */
const riserPads = (n: number): Record<string, [number, number]> => {
  const x = n % 2 ? LANE_R : LANE_L;
  const y = n === 6 ? 508 : top(n) + 22;
  return { [`PRS-PHC-0${n}`]: [x, y], [`TMP-PHC-0${n}`]: [x, y + 14] };
};

/** Cone rings of stage n: pressure on the left, temperature on the right of the cone. */
const conePads = (n: number): Record<string, [number, number]> => ({
  [`PRS-PHC-1${n}`]: [cx(n) - 13.5, top(n) + 37],
  [`TMP-PHC-2${n}`]: [cx(n) + 14, top(n) + 37],
});
/** Hopper n (0 … 2) of the baghouse: level box and rotary airlock centre. */
const hopperX = (i: number) => 1194 + i * 52 + 26;

const pads: LineSheetArt["pads"] = {
  ...riserPads(1),
  ...riserPads(2),
  ...riserPads(3),
  ...riserPads(4),
  ...riserPads(5),
  ...riserPads(6),
  ...conePads(1),
  ...conePads(2),
  ...conePads(3),
  ...conePads(4),
  ...conePads(5),
  ...conePads(6),
  "TMP-PHC-07": [LX, 613.7],
  "FLO-KFS-01": [659, 196],
  "FLO-KFS-02": [659, 210],
  "GAS-PHC-01": [807.2, 235.1],
  "GAS-PHC-02": [829.5, 235.1],
  // exit gas: temperature before the WHRS, WHRS inlet / outlet dampers, main-line bypass, temperature after the WHRS
  "TMP-PHC-30": [756.5, 206],
  "POS-PHC-03": [782, 266.5],
  "POS-PHC-04": [882, 282.5],
  "POS-PHC-05": [894, 266.5],
  "TMP-PHC-31": [894, 312],
  "POS-PHC-01": [913, 306],
  "VIB-PHC-02": [1006, 323.2],
  "TMP-PHC-10": [1006, 342],
  "VIB-PHC-01": [1044, 323.2],
  "TMP-PHC-09": [1044, 342],
  "ELE-PHC-01": [1128, 301],
  "TMP-PHC-11": [1135.7, 343],
  "SPD-PHC-01": [1172, 333],
  "TMP-PHC-08": [675.3, 526],
  "PRS-PHC-10": [659.7, 526],
  "GAS-PHC-03": [636.5, 572],
  "GAS-PHC-04": [660.5, 572],
  "POS-PHC-02": [734.7, 502],
  "FLO-BRN-02": [896.6, 564],
  // tertiary air (flowing right → left): before the damper on the cooler side, after it on the calciner side
  "POS-BRN-01": [845.7, 576.3],
  "PRS-BRN-05": [881.4, 591.4],
  "TMP-BRN-03": [906.3, 591.4],
  "PRS-BRN-06": [806.3, 591.4],
  "TMP-BRN-07": [781.7, 591.4],
  // baghouse: inlet (fan outlet duct), outlet duct, ΔP box, pulse controller, hoppers 1–3 (level, airlock)
  "STS-BGH-01": [1251.3, 216.3],
  "PRS-BGH-02": [1093.6, 238.2],
  "TMP-BGH-02": [1150, 238.2],
  "PRS-BGH-03": [1378, 285.7],
  "PRS-BGH-01": [1428.5, 316.7],
  "LEV-BGH-01": [hopperX(0) + 7.7, 486],
  "LEV-BGH-02": [hopperX(1) + 7.7, 486],
  "LEV-BGH-03": [hopperX(2) + 7.7, 486],
  "SPD-BGH-02": [hopperX(0) - 0.5, 527],
  "SPD-BGH-03": [hopperX(1) - 0.5, 527],
  "SPD-BGH-04": [hopperX(2) - 0.5, 527],
  // stack CEMS up the stack: SOx, NOx, CO, CO₂, dust
  "GAS-BGH-02": [1454.3, 410],
  "GAS-BGH-03": [1454.3, 425],
  "GAS-BGH-04": [1454.3, 440],
  "GAS-BGH-05": [1454.3, 455],
  "GAS-BGH-01": [1454.3, 470],
  "VIB-BGH-01": [1375, 607.7],
  "TMP-BGH-01": [1375, 623.3],
  "ELE-BGH-01": [1416.7, 592.3],
  "TMP-BGH-03": [1417.3, 621],
  "SPD-BGH-01": [1442.3, 613.3],
};

const cyclone = (n: number, box: [number, number, number, number], leader: [number, number]) => ({
  title: `Cyclone C${n}`,
  box,
  leader,
  rows: [
    [`PRS-PHC-0${n}`, "RISER DUCT PRESSURE"],
    [`TMP-PHC-0${n}`, "RISER DUCT TEMP."],
    [`PRS-PHC-1${n}`, "CONE PRESSURE"],
    [`TMP-PHC-2${n}`, "CONE TEMP."],
  ] as Array<[string, string]>,
});

const readouts: LineSheetArt["readouts"] = {
  frame: [0, 0, W, H],
  blocks: [
    cyclone(1, [21, 17, 287, 141], [717, 236]),
    cyclone(2, [21, 194, 287, 141], [580, 291]),
    cyclone(3, [21, 371, 287, 141], [717, 346]),
    cyclone(4, [21, 548, 287, 141], [581, 401]),
    cyclone(5, [21, 725, 287, 142], [719, 456]),
    cyclone(6, [21, 902, 287, 142], [575, 535]),
    { title: "Preheater feed inlet", box: [344, 42, 275, 66], leader: [657, 190], rows: [["FLO-KFS-01", "SFM A FEED"], ["FLO-KFS-02", "SFM B FEED"]] },
    { title: "Exit gas analyser", box: [625, 17, 244, 91], leader: [824, 224], rows: [["GAS-PHC-01", "EXIT O₂"], ["GAS-PHC-02", "EXIT CO"]] },
    {
      title: "WHRS",
      box: [917, 17, 280, 166],
      leader: [880, 270],
      rows: [
        ["TMP-PHC-30", "GAS TEMP. BEFORE WHRS"],
        ["TMP-PHC-31", "GAS TEMP. AFTER WHRS"],
        ["POS-PHC-03", "WHRS INLET DAMPER"],
        ["POS-PHC-04", "WHRS OUTLET DAMPER"],
        ["POS-PHC-05", "MAIN-LINE BYPASS DAMPER"],
      ],
    },
    {
      title: "ID fan",
      box: [1490, 17, 285, 241],
      leader: [1079, 330],
      rows: [
        ["POS-PHC-01", "INLET DAMPER OPENING"],
        ["VIB-PHC-01", "VIBRATION DE"],
        ["VIB-PHC-02", "VIBRATION NDE"],
        ["TMP-PHC-09", "BEARING TEMP. DE"],
        ["TMP-PHC-10", "BEARING TEMP. NDE"],
        ["TMP-PHC-11", "MOTOR WINDING TEMP."],
        ["ELE-PHC-01", "MOTOR POWER"],
        ["SPD-PHC-01", "FAN SPEED"],
      ],
    },
    {
      title: "Main baghouse",
      box: [1490, 273, 309, 316],
      leader: [1350, 400],
      rows: [
        ["PRS-BGH-02", "INLET PRESSURE"],
        ["PRS-BGH-03", "OUTLET PRESSURE"],
        ["PRS-BGH-01", "ΔP (CALCULATED)"],
        ["TMP-BGH-02", "INLET TEMP."],
        ["STS-BGH-01", "PULSE CLEANING"],
        ["LEV-BGH-01", "HOPPER 1 LEVEL"],
        ["LEV-BGH-02", "HOPPER 2 LEVEL"],
        ["LEV-BGH-03", "HOPPER 3 LEVEL"],
        ["SPD-BGH-02", "AIRLOCK 1 ZERO-SPEED"],
        ["SPD-BGH-03", "AIRLOCK 2 ZERO-SPEED"],
        ["SPD-BGH-04", "AIRLOCK 3 ZERO-SPEED"],
      ],
    },
    {
      title: "Baghouse fan",
      box: [1490, 629, 278, 167],
      leader: [1443, 613],
      rows: [
        ["VIB-BGH-01", "VIBRATION"],
        ["TMP-BGH-01", "BEARING TEMP."],
        ["TMP-BGH-03", "MOTOR WINDING TEMP."],
        ["ELE-BGH-01", "MOTOR CURRENT"],
        ["SPD-BGH-01", "FAN SPEED"],
      ],
    },
    {
      title: "Stack",
      box: [1490, 813, 189, 166],
      leader: [1454, 470],
      rows: [
        ["GAS-BGH-02", "SOX"],
        ["GAS-BGH-03", "NOX"],
        ["GAS-BGH-04", "CO"],
        ["GAS-BGH-05", "CO₂"],
        ["GAS-BGH-01", "DUST"],
      ],
    },
    {
      title: "Calciner",
      box: [354, 771, 256, 191],
      leader: [722, 573],
      rows: [
        ["TMP-PHC-08", "OUTLET TEMP."],
        ["PRS-PHC-10", "OUTLET DRAFT"],
        ["GAS-PHC-03", "OUTLET O₂"],
        ["GAS-PHC-04", "OUTLET CO"],
        ["FLO-BRN-02", "CALCINER COAL"],
        ["POS-PHC-02", "MEAL SPLIT GATE"],
      ],
    },
    {
      title: "Tertiary air duct",
      box: [719, 771, 301, 166],
      leader: [845, 600],
      rows: [
        ["TMP-BRN-03", "TEMP. BEFORE DAMPER"],
        ["TMP-BRN-07", "TEMP. AFTER DAMPER"],
        ["PRS-BRN-05", "PRESSURE BEFORE DAMPER"],
        ["PRS-BRN-06", "PRESSURE AFTER DAMPER"],
        ["POS-BRN-01", "DAMPER OPENING"],
      ],
    },
    { title: "Hot meal to kiln", box: [1094, 792, 227, 66], leader: [582, 614], rows: [["TMP-PHC-07", "HOT MEAL TEMP."]] },
  ],
};

export const sheet: LineSheetArt = { id: "P-0", ready: true, width: W, height: H, Art, pads, readouts };
