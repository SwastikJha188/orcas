/**
 * Sheet P-0 — PHC-01 · Preheater — Overview.
 *
 * Composition of stage-overview PDF page 2, left → right: the bucket
 * elevator (casing, head and head drive) with its meal chute into the C2 → C1
 * riser; the six-stage cyclone tower (C1 top right … C6 bottom left) on its
 * two-column steel structure, hot gas rising stage to stage (red dashed),
 * meal falling stage to stage (gold); the calciner with burner flame,
 * coal-feed pipe, tertiary-air duct and damper, meal split gate; the kiln
 * inlet box; the exit-gas duct from C1 with gas analyser and ID fan inlet
 * damper; the ID fan (volute, NDE / DE bearings, coupling, motor, speed
 * encoder) on its steel table; duct to the baghouse (pulse controller, three
 * hopper compartments, dust screw and airlock); the stack fan and the stack.
 */
import React from "react";
import { Bolt, CornerBolts, Coupling, GroundLine, MX, MachineLabel, Motor, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { MirrorX, Pipe, Tube } from "../../drawings/fkp-parts";
import type { LineSheetArt } from "../types";
import { Beam, FanCasing, PlummerBlock, StageCyclone, type StageGeom, stageDims } from "./parts-p";

type Pt = [number, number];

const W = 1654;
const H = 774;
const GROUND = 695;

/** Flat flow colours for strokes (gradient paints need a real bounding box). */
const MEAL = "var(--mx-material)";

/* ---------------------------------------------------------------- tower */
const LX = 370;
const RX = 563;
const COLS = [290, 649];
const STAGES: StageGeom[] = [0, 1, 2, 3, 4, 5].map((i) => ({ cx: i % 2 ? LX : RX, top: 71.5 + i * 77.5, inlet: i % 2 ? 1 : -1, w: 99, cyl: 33, cone: 38.5, ow: 35, k: 1 }));
const FLOORS = [147.5, 225, 302.5, 380, 457.5, 535];
const DUCT = 15;
const LANE_R = 480; // up-leg of a left-column stage's outlet duct
const LANE_L = 452; // up-leg of a right-column stage's outlet duct

/** Outlet duct of stage n (2 … 6) into stage n − 1, as centreline points. */
function stageDuct(n: number): Pt[] {
  const a = STAGES[n - 1];
  const b = STAGES[n - 2];
  const left = a.cx === LX;
  const lane = left ? LANE_R : LANE_L;
  const y0 = a.top - 9;
  const yIn = b.top + 21;
  const xIn = left ? b.cx - 49.5 - 2 : b.cx + 49.5 + 2;
  return [
    [a.cx, a.top - 4],
    [a.cx, y0],
    [lane, y0],
    [lane, yIn],
    [xIn, yIn],
  ];
}

/* ---------------------------------------------------------------- calciner + kiln inlet */
const CAL = { x0: 519, x1: 607.5, top: 490, cylBot: 615, coneBot: 635, neck: 18 };
const CAL_CX = 563;
const RISER_Y = 511;
const INLET = { x: 475.5, y: 648, w: 183.5, h: 47 };
const COAL_Y = 563.5;
const TA_Y = 602;

/* ---------------------------------------------------------------- exit gas + ID fan */
const EXIT_Y = 60;
const EXIT_X = 811;
const EXIT_D = 20;
const FAN = { cx: 892.5, cy: 237, r: 62.5, outTop: 163 };
const TABLE = { x0: 817.5, x1: 1170, y: 306 };
const SHAFT_Y = 238;
const NDE = 968;
const DE = 1021;
const BH_Y = 106; // ID fan → baghouse duct
const BH_IN_X = 1249;
const FAN_OUT_X = 918;

/* ---------------------------------------------------------------- baghouse + stack */
const BAG = { x0: 1232, x1: 1452.5, top: 158, plenum: 211, body: 419, hop: 492.5 };
const BAG_OUT_X = 1530;
const SF = { cx: 1448.5, cy: 633, r: 40 };
const STACK = { x: 1592.5, w: 13, top: 52 };

/* ---------------------------------------------------------------- flow marks */
function GasLine({ pts }: { pts: Pt[] }) {
  return <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={MX.gas} strokeWidth={1.7} strokeDasharray="6 4" strokeLinejoin="round" aria-hidden="true" />;
}

/** Filled flow arrowhead at (x, y) pointing `dir` (r right, l left, u up, d down). */
function Head({ x, y, dir, fill, s = 7 }: { x: number; y: number; dir: "r" | "l" | "u" | "d"; fill: string; s?: number }) {
  const a = { r: 0, d: 90, l: 180, u: 270 }[dir];
  return <path d={`M ${x + s} ${y} L ${x - s * 0.7} ${y - s * 0.75} L ${x - s * 0.7} ${y + s * 0.75} Z`} fill={fill} transform={`rotate(${a} ${x} ${y})`} aria-hidden="true" />;
}

/** Meal stream: thin gold bars along orthogonal points (rects, so the paint has a bounding box). */
function MealLine({ pts, w = 2.2 }: { pts: Pt[]; w?: number }) {
  return (
    <g aria-hidden="true">
      {pts.slice(0, -1).map(([ax, ay], i) => {
        const [bx, by] = pts[i + 1];
        return <rect key={i} x={Math.min(ax, bx) - w / 2} y={Math.min(ay, by) - w / 2} width={Math.abs(bx - ax) + w} height={Math.abs(by - ay) + w} fill={MEAL} />;
      })}
    </g>
  );
}

/** Damper in a duct: frame across the run with the blade on the diagonal. */
function Damper({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={3} {...PAINT.body} />
      <rect x={x + 3} y={y + 3} width={w - 6} height={h - 6} rx={2} {...PAINT.recess} />
      <line x1={x + 6} y1={y + h - 6} x2={x + w - 6} y2={y + 6} stroke={MEAL} strokeWidth={2.2} strokeLinecap="round" />
      <circle cx={x + w / 2} cy={y + h / 2} r={1.8} {...PAINT.shaft} />
    </g>
  );
}

/** Small transmitter housing (instrument body behind a pad, or a point without one). */
function Transmitter({ x, y, w = 22, h = 22 }: { x: number; y: number; w?: number; h?: number }) {
  return <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={4} {...PAINT.raised} aria-hidden="true" />;
}

/** Impulse / signal line (hairline). */
function Tap({ pts, dashed = false }: { pts: Pt[]; dashed?: boolean }) {
  return <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={MX.label} strokeWidth={0.9} strokeDasharray={dashed ? "3 2.5" : undefined} aria-hidden="true" />;
}

/* ---------------------------------------------------------------- bucket elevator */
function Elevator() {
  const slots: React.ReactNode[] = [];
  for (let i = 0, y = 174; y < GROUND - 14; i++, y += 19.5) {
    slots.push(<rect key={y} x={i % 2 ? 165 : 150} y={y} width={9} height={5.5} rx={1.5} {...PAINT.recess} />);
  }
  return (
    <g>
      {/* casing */}
      <rect x={139} y={150} width={46} height={GROUND - 150} rx={4} {...PAINT.cylinderV} />
      <line x1={162} x2={162} y1={160} y2={GROUND - 4} {...PAINT.hair} />
      {slots}
      {/* head with pulley */}
      <rect x={117.5} y={92.5} width={88.5} height={65} rx={10} {...PAINT.body} />
      <rect x={122} y={97} width={79.5} height={56} rx={7} fill="none" stroke={MX.fine} strokeWidth={0.9} />
      <circle cx={162.5} cy={125} r={23.5} {...PAINT.raised} />
      <circle cx={162.5} cy={125} r={14} fill="none" stroke={MX.fine} strokeWidth={1} />
      <circle cx={162.5} cy={125} r={6} {...PAINT.shaft} />
      {/* head drive motor on the head */}
      <rect x={140} y={86} width={50} height={7} rx={1.5} {...PAINT.body} />
      <MirrorX about={166}>
        <Motor x={138} y={64.5} w={52} h={22} terminalBox={false} />
      </MirrorX>
      <rect x={156} y={58.5} width={22} height={6.5} rx={2} {...PAINT.raised} />
      <rect x={196} y={74} width={16} height={4} rx={1} {...PAINT.shaft} />
      {/* discharge chute to the C2 → C1 riser */}
      <path d="M 202 115 L 486 131 L 486 139 L 202 134 Z" {...PAINT.body} />
      <path d="M 207.5 125 L 474 133.5" stroke={MEAL} strokeWidth={2.2} strokeLinecap="round" fill="none" />
      <path d="M 347 129.2 L 334 123.8 L 334.3 134.8 Z" fill={MX.material} />
    </g>
  );
}

/* ---------------------------------------------------------------- tower */
function Structure() {
  return (
    <g>
      {FLOORS.map((y) => (
        <Beam key={y} x1={COLS[0] + 4} x2={COLS[1] - 4} y={y - 1.5} h={3} />
      ))}
      <rect x={COLS[0] - 4} y={68} width={8} height={GROUND - 68} rx={1.5} {...PAINT.body} />
      <line x1={COLS[0]} x2={COLS[0]} y1={72} y2={GROUND - 4} {...PAINT.hair} />
      <rect x={COLS[1] - 4} y={68} width={8} height={INLET.y - 68} rx={1.5} {...PAINT.body} />
      <line x1={COLS[1]} x2={COLS[1]} y1={72} y2={INLET.y - 4} {...PAINT.hair} />
      <rect x={COLS[1] - 4} y={GROUND - 6} width={8} height={6} rx={1} {...PAINT.raised} />
    </g>
  );
}

function TowerGas() {
  const arrows: Array<[number, number, "r" | "l" | "u" | "d"]> = [];
  for (let n = 2; n <= 6; n++) {
    const p = stageDuct(n);
    const left = STAGES[n - 1].cx === LX;
    arrows.push([(p[1][0] + p[2][0]) / 2, p[1][1], left ? "r" : "l"]);
    arrows.push([p[2][0], (p[2][1] + p[3][1]) / 2, "u"]);
    arrows.push([(p[3][0] + p[4][0]) / 2, p[3][1], left ? "r" : "l"]);
  }
  return (
    <g>
      {[2, 3, 4, 5, 6].map((n) => (
        <GasLine key={n} pts={stageDuct(n)} />
      ))}
      <GasLine pts={[[CAL.x0, RISER_Y], [LANE_L, RISER_Y], [LANE_L, STAGES[5].top + 21], [LX + 51.5, STAGES[5].top + 21]]} />
      {arrows.map(([x, y, d], i) => (
        <Head key={i} x={x} y={y} dir={d} fill={MX.gas} />
      ))}
      <Head x={485} y={RISER_Y} dir="l" fill={MX.gas} />
      <Head x={LANE_L} y={496} dir="u" fill={MX.gas} />
      <Head x={436} y={STAGES[5].top + 21} dir="l" fill={MX.gas} />
    </g>
  );
}

function TowerDucts() {
  return (
    <g>
      <Pipe pts={[[CAL.x0 + 2, RISER_Y], [LANE_L, RISER_Y], [LANE_L, STAGES[5].top + 21], [LX + 51.5, STAGES[5].top + 21]]} d={DUCT} />
      {[6, 5, 4, 3, 2].map((n) => (
        <Pipe key={n} pts={stageDuct(n)} d={DUCT} />
      ))}
    </g>
  );
}

function TowerMeal() {
  const drops: Array<[number, number, number]> = STAGES.slice(0, 4).map((g, i) => {
    const y0 = stageDims(g).yO + 6;
    const y1 = STAGES[i + 2].top - 9 - DUCT / 2 - 1;
    return [g.cx, y0, y1];
  });
  const c5 = stageDims(STAGES[4]).yO + 6;
  const c6 = stageDims(STAGES[5]).yO + 6;
  return (
    <g>
      {drops.map(([x, y0, y1], i) => (
        <g key={i}>
          <MealLine pts={[[x, y0], [x, y1]]} />
          <Head x={x} y={y1 - 9} dir="d" fill={MX.material} s={7.5} />
        </g>
      ))}
      {/* C5 → meal split gate → calciner; split leg to the kiln inlet */}
      <MealLine pts={[[RX, c5], [RX, CAL.top - 2]]} />
      <rect x={RX - 9} y={471} width={18} height={12} rx={2} {...PAINT.body} />
      <line x1={RX - 5} x2={RX + 5} y1={477} y2={477} stroke={MX.edge} strokeWidth={1.4} />
      <rect x={RX + 9} y={474.5} width={10} height={5} rx={1} {...PAINT.shaft} />
      <rect x={RX + 19} y={470} width={14} height={14} rx={3} {...PAINT.raised} />
      <polyline points={`${RX - 9},477 511,477 511,${INLET.y - 1}`} fill="none" stroke={MEAL} strokeWidth={2} strokeDasharray="5 3.5" />
      {/* C6 → hot meal to the kiln inlet */}
      <MealLine pts={[[LX, c6], [LX, 668], [INLET.x, 668]]} />
      <Head x={LX} y={604} dir="d" fill={MX.material} s={8} />
      <Head x={424} y={668} dir="r" fill={MX.material} s={8} />
      {/* hot meal temperature thermowell */}
      <rect x={LX - 13} y={627} width={26} height={13} rx={3} {...PAINT.raised} />
    </g>
  );
}

/** Draft / cone-pressure transmitters: impulse line from the vessel wall to the instrument. */
function TowerInstruments() {
  const drafts: Array<[number, number, number]> = [
    [626.5, 95, RX + 49.5],
    [306, 172.5, LX - 49.5],
    [626.5, 250, RX + 49.5],
    [306, 327.5, LX - 49.5],
    [626.5, 404.8, RX + 49.5],
    [306, 482.2, LX - 49.5],
  ];
  return (
    <g>
      {drafts.map(([x, y, wall]) => (
        <g key={y}>
          <Tap pts={[[wall, y], [x, y]]} />
          <Transmitter x={x} y={y} w={20} h={20} />
        </g>
      ))}
    </g>
  );
}

/* ---------------------------------------------------------------- calciner + kiln inlet */
function Calciner() {
  const { x0, x1, top, cylBot, coneBot, neck } = CAL;
  const r = 14;
  const shell = `M ${x0} ${cylBot} L ${x0} ${top + r} Q ${x0} ${top} ${x0 + r} ${top} L ${x1 - r} ${top} Q ${x1} ${top} ${x1} ${top + r} L ${x1} ${cylBot} Z`;
  return (
    <g>
      {/* coal-feed pipe with flow meter; burner lance */}
      <rect x={x1 - 2} y={COAL_Y - 6.5} width={810 - x1 + 2} height={13} rx={2} {...PAINT.cylinder} />
      <path d={`M 810 ${COAL_Y} H 612`} stroke={MEAL} strokeWidth={2.2} fill="none" />
      <Head x={706} y={COAL_Y} dir="l" fill={MX.material} s={8} />
      <rect x={721.5} y={551} width={43.5} height={25} rx={5} {...PAINT.body} />
      <rect x={728} y={556} width={30.5} height={15} rx={3} {...PAINT.recess} />
      <line x1={x1 - 22} y1={569} x2={x1 + 2} y2={COAL_Y} stroke={MX.metal} strokeWidth={2.4} strokeLinecap="round" />
      {/* tertiary-air duct with taps and damper */}
      <rect x={x1 - 2} y={TA_Y - 8} width={810 - x1 + 2} height={16} rx={2} {...PAINT.cylinder} />
      <path d={`M 810 ${TA_Y} H 612`} stroke={MX.air} strokeWidth={2} fill="none" />
      <Head x={715} y={TA_Y} dir="l" fill={MX.air} s={8} />
      {[642, 703.5].map((x) => (
        <g key={x}>
          <rect x={x - 3} y={TA_Y - 14} width={6} height={6} {...PAINT.shaft} />
          <rect x={x - 8} y={TA_Y - 24} width={16} height={11} rx={3} {...PAINT.raised} />
        </g>
      ))}
      <Damper x={756.5} y={589} w={23.5} h={26} />
      <rect x={765} y={581} width={6} height={8} {...PAINT.shaft} />
      {/* vessel */}
      <path d={`M ${x0} ${cylBot} L ${CAL_CX - neck} ${coneBot} L ${CAL_CX + neck} ${coneBot} L ${x1} ${cylBot} Z`} {...PAINT.cylinderV} />
      <path d={shell} {...PAINT.cylinderV} />
      <line x1={x0 + 6} x2={x0 + 6} y1={top + 12} y2={cylBot - 4} {...PAINT.hair} />
      <line x1={x1 - 6} x2={x1 - 6} y1={top + 12} y2={cylBot - 4} {...PAINT.hair} />
      {[530, 590].map((y) => (
        <line key={y} x1={x0 + 1} x2={x1 - 1} y1={y} y2={y} stroke={MX.fine} strokeWidth={1.1} />
      ))}
      <rect x={x0 - 3} y={cylBot - 2.5} width={x1 - x0 + 6} height={5} rx={1.5} {...PAINT.raised} />
      <rect x={CAL_CX - neck} y={coneBot} width={neck * 2} height={INLET.y - coneBot} rx={1.5} {...PAINT.body} />
      {/* burner flame */}
      <ellipse cx={CAL_CX} cy={575} rx={24} ry={21} fill={MX.heat} />
      <ellipse cx={CAL_CX - 1} cy={576} rx={15} ry={13} fill={MX.heat} />
      <ellipse cx={CAL_CX - 2} cy={577} rx={8} ry={7} fill={MX.heat} />
      {/* gas up through the calciner */}
      <GasLine pts={[[CAL_CX, INLET.y + 38], [CAL_CX, top + 30]]} />
      <Head x={CAL_CX} y={INLET.y + 26} dir="u" fill={MX.gas} s={8} />
      <Head x={CAL_CX} y={576} dir="u" fill={MX.gas} s={8} />
      <MachineLabel x={CAL_CX} y={509} size={8} tone="ink">
        CALCINER
      </MachineLabel>
      {/* calciner outlet: draft tap; O₂ / CO analyser on a sample line */}
      <rect x={472} y={RISER_Y + 7.5} width={6} height={5} {...PAINT.shaft} />
      <Tap pts={[[467.5, RISER_Y + 8], [467.5, 560]]} dashed />
      <rect x={427.5} y={560} width={76.5} height={30} rx={5} {...PAINT.body} />
      {[447, 480.5].map((x) => (
        <g key={x}>
          <rect x={x - 11} y={564.5} width={22} height={21} rx={3} {...PAINT.recess} />
          <circle cx={x} cy={575} r={5} fill="none" stroke={MX.fine} strokeWidth={1} />
        </g>
      ))}
    </g>
  );
}

function KilnInlet() {
  const { x, y, w, h } = INLET;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} {...PAINT.body} />
      <rect x={x + 5} y={y + 5} width={w - 10} height={h - 10} rx={4} {...PAINT.recess} />
      <rect x={x + 5} y={y + 5} width={w - 10} height={h - 10} rx={4} fill={MX.heat} opacity={0.35} />
      <CornerBolts x={x} y={y} w={w} h={h} inset={3.5} r={1.2} />
      <MachineLabel x={527.5} y={679} size={8} tone="ink">
        KILN INLET
      </MachineLabel>
      {/* meal to the kiln, kiln gas in */}
      <MealLine pts={[[x + w, 669], [810, 669]]} />
      <Head x={738} y={669} dir="r" fill={MX.material} s={8} />
      <GasLine pts={[[810, 688], [x + w + 4, 688]]} />
      <Head x={735} y={688} dir="l" fill={MX.gas} s={8} />
    </g>
  );
}

/* ---------------------------------------------------------------- exit gas + ID fan */
function ExitGas() {
  return (
    <g>
      <Pipe pts={[[RX, STAGES[0].top - 3], [RX, EXIT_Y], [EXIT_X, EXIT_Y], [EXIT_X, 166]]} d={EXIT_D} flanges={[[EXIT_X, 140]]} />
      <Tube x1={EXIT_X} y1={162} x2={835} y2={196} d={EXIT_D} paint={PAINT.cylinderV} />
      <GasLine pts={[[RX, 68], [RX, EXIT_Y], [EXIT_X, EXIT_Y], [EXIT_X, 165], [829, 192]]} />
      <Head x={688} y={EXIT_Y} dir="r" fill={MX.gas} s={8} />
      {/* gas analyser on a heated sample line from the exit duct */}
      <Tap pts={[[711, EXIT_Y + 10], [711, 84]]} dashed />
      <rect x={669} y={84} width={100} height={41} rx={6} {...PAINT.body} />
      {[687, 718.8, 751].map((x) => (
        <rect key={x} x={x - 11} y={89.5} width={22} height={22} rx={3} {...PAINT.recess} />
      ))}
      <line x1={735} x2={735} y1={90} y2={119} {...PAINT.hair} />
      {/* ID fan inlet damper and its actuator */}
      <Damper x={791.5} y={105} w={39} h={25} />
      <rect x={830.5} y={115.5} width={7} height={5} {...PAINT.shaft} />
      <rect x={837} y={107} width={24} height={22} rx={4} {...PAINT.raised} />
    </g>
  );
}

function IdFan() {
  const legs = [829.5, 1158];
  return (
    <g>
      {/* steel table */}
      <rect x={legs[0] - 4} y={TABLE.y + 10} width={8} height={539 - TABLE.y - 10} rx={1.5} {...PAINT.body} />
      <rect x={819} y={537} width={25} height={6} rx={1.5} {...PAINT.raised} />
      <rect x={legs[1] - 4} y={TABLE.y + 10} width={8} height={GROUND - TABLE.y - 10} rx={1.5} {...PAINT.body} />
      <line x1={legs[1]} x2={legs[1]} y1={TABLE.y + 14} y2={GROUND - 4} {...PAINT.hair} />
      <rect x={TABLE.x0} y={TABLE.y} width={TABLE.x1 - TABLE.x0} height={11.5} rx={2} {...PAINT.body} />
      <line x1={TABLE.x0 + 3} x2={TABLE.x1 - 3} y1={TABLE.y + 4} y2={TABLE.y + 4} {...PAINT.hair} />
      {/* fan outlet duct to the baghouse */}
      <Pipe pts={[[FAN_OUT_X, FAN.outTop - 3], [FAN_OUT_X, BH_Y], [BH_IN_X, BH_Y], [BH_IN_X, BAG.top + 1]]} d={19} flanges={[[FAN_OUT_X, 140], [1200, BH_Y]]} />
      <GasLine pts={[[FAN_OUT_X, FAN.outTop - 4], [FAN_OUT_X, BH_Y], [BH_IN_X, BH_Y], [BH_IN_X, BAG.top]]} />
      <Head x={FAN_OUT_X} y={138} dir="u" fill={MX.gas} s={8} />
      <Head x={1040} y={BH_Y} dir="r" fill={MX.gas} s={8} />
      <Head x={BH_IN_X} y={134} dir="d" fill={MX.gas} s={8} />
      {/* baghouse inlet draft / temperature taps */}
      {[1091, 1170].map((x) => (
        <rect key={x} x={x - 3} y={BH_Y + 9} width={6} height={6} {...PAINT.shaft} />
      ))}
      <FanCasing cx={FAN.cx} cy={FAN.cy} r={FAN.r} outTop={FAN.outTop} baseY={TABLE.y} />
      {/* shaft, bearings on pedestals, coupling, motor, encoder */}
      <rect x={FAN.cx} y={SHAFT_Y - 4} width={1080 - FAN.cx} height={8} rx={2} {...PAINT.shaft} />
      {[NDE, DE].map((x) => (
        <g key={x}>
          <path d={`M ${x - 18} 268 H ${x + 18} L ${x + 22} ${TABLE.y} H ${x - 22} Z`} {...PAINT.body} />
          <PlummerBlock cx={x} cy={SHAFT_Y} top={213} bottom={262} w={33} shaft={8} />
        </g>
      ))}
      <Coupling x={1047.5} y={SHAFT_Y - 10} w={25} h={20} />
      <rect x={1085} y={272.5} width={92} height={TABLE.y - 272.5} rx={2} {...PAINT.body} />
      <MirrorX about={1131}>
        <Motor x={1077} y={200} w={108} h={74} terminalBox={false} />
      </MirrorX>
      <rect x={1107.5} y={183} width={60} height={18} rx={4} {...PAINT.body} />
      <rect x={1185} y={210} width={30} height={55} rx={13} {...PAINT.body} />
      <rect x={1190} y={215} width={20} height={45} rx={9} fill="none" stroke={MX.fine} strokeWidth={0.9} />
    </g>
  );
}

/* ---------------------------------------------------------------- baghouse, stack fan, stack */
function Baghouse() {
  const { x0, x1, top, plenum, body, hop } = BAG;
  const cw = (x1 - x0) / 3;
  const bottoms = [1268.5, 1341.5, 1415];
  return (
    <g>
      {/* pulse controller */}
      <rect x={1277.5} y={89} width={72} height={10} rx={2} {...PAINT.body} />
      <rect x={1285} y={52.5} width={56} height={37} rx={6} {...PAINT.body} />
      <rect x={1292} y={58} width={34} height={6} rx={2} {...PAINT.recess} />
      <circle cx={1312.5} cy={72} r={7} {...PAINT.raised} />
      <circle cx={1334} cy={72} r={2.5} {...PAINT.shaft} />
      {/* hoppers, dust drops, screw conveyor, airlock */}
      {bottoms.map((bx, i) => (
        <g key={bx}>
          <path d={`M ${x0 + i * cw} ${body} L ${x0 + (i + 1) * cw} ${body} L ${bx + 12} ${hop} L ${bx - 12} ${hop} Z`} {...PAINT.cylinderV} />
          <MealLine pts={[[bx, hop + 1], [bx, 527]]} />
        </g>
      ))}
      <rect x={1240} y={527.5} width={212.5} height={16.5} rx={4} {...PAINT.cylinder} />
      <circle cx={1225} cy={536} r={11} {...PAINT.raised} />
      <circle cx={1225} cy={536} r={4} {...PAINT.shaft} />
      <rect x={1182.5} y={527.5} width={30} height={17} rx={4} {...PAINT.body} />
      <rect x={1212} y={533.5} width={3} height={5} {...PAINT.shaft} />
      <MealLine pts={[[1225, 548], [1225, 598]]} />
      <Head x={1225} y={576} dir="d" fill={MX.material} s={8} />
      {/* dust hopper level switch */}
      <rect x={1312} y={487} width={24} height={20} rx={4} {...PAINT.raised} />
      {/* casing: plenum and three compartments */}
      <rect x={x0} y={plenum} width={x1 - x0} height={body - plenum} rx={4} {...PAINT.body} />
      {[1, 2].map((i) => (
        <line key={i} x1={x0 + i * cw} x2={x0 + i * cw} y1={plenum} y2={body} stroke={MX.edge} strokeWidth={1.4} />
      ))}
      {[0, 1, 2].map((i) =>
        [0.18, 0.36, 0.54, 0.72].map((f) => (
          <line key={`${i}-${f}`} x1={x0 + i * cw + cw * (f + 0.06)} x2={x0 + i * cw + cw * (f + 0.06)} y1={plenum + 20} y2={body - 18} {...PAINT.hair} />
        )),
      )}
      <rect x={x0} y={top} width={x1 - x0} height={plenum - top} rx={5} {...PAINT.body} />
      <line x1={x0 + 4} x2={x1 - 4} y1={plenum - 4} y2={plenum - 4} {...PAINT.hair} />
      {/* bag ΔP transmitter on its impulse lines */}
      <Tap pts={[[x1, 185], [1478.5, 185], [1478.5, 405], [x1, 405]]} />
      <Transmitter x={1479} y={294} w={26} h={25} />
      <circle cx={1479} cy={294} r={6} fill="none" stroke={MX.fine} strokeWidth={1} />
    </g>
  );
}

function StackFan() {
  return (
    <g>
      {/* baghouse outlet duct down to the stack fan */}
      <Pipe pts={[[BAG.x1 - 1, 172.5], [BAG_OUT_X, 172.5], [BAG_OUT_X, 560], [1462, 560], [1462, 592]]} d={20} />
      <GasLine pts={[[BAG.x1, 172.5], [BAG_OUT_X, 172.5], [BAG_OUT_X, 560], [1462, 560], [1462, 590]]} />
      <Head x={1494} y={172.5} dir="r" fill={MX.gas} s={8} />
      <Head x={BAG_OUT_X} y={372} dir="d" fill={MX.gas} s={8} />
      <Head x={1497} y={560} dir="l" fill={MX.gas} s={8} />
      {/* stack-fan inlet hood */}
      <path d="M 1380 573 H 1428 V 590" fill="none" stroke={MX.edge} strokeWidth={1.4} />
      <path d="M 1380 580 H 1421 V 590" fill="none" stroke={MX.fine} strokeWidth={1} />
      {/* base frame */}
      <rect x={1372.5} y={675} width={211.5} height={10} rx={2} {...PAINT.body} />
      {[1380, 1576].map((x) => (
        <rect key={x} x={x - 3} y={685} width={6} height={GROUND - 685} {...PAINT.body} />
      ))}
      <FanCasing cx={SF.cx} cy={SF.cy} r={SF.r} outTop={593} baseY={675} />
      <rect x={SF.cx} y={SF.cy - 3} width={1512 - SF.cx} height={6} rx={1.5} {...PAINT.shaft} />
      <rect x={1494} y={SF.cy - 10} width={12} height={20} rx={3} {...PAINT.raised} />
      <rect x={1514} y={655} width={60} height={20} rx={2} {...PAINT.body} />
      <MirrorX about={1544}>
        <Motor x={1510} y={610} w={68} h={46} terminalBox={false} />
      </MirrorX>
      <rect x={1527} y={598} width={32} height={12} rx={3} {...PAINT.body} />
      <rect x={1575} y={622} width={15} height={22} rx={6} {...PAINT.body} />
    </g>
  );
}

function Stack() {
  const { x, w, top } = STACK;
  return (
    <g>
      <rect x={x} y={top} width={w} height={GROUND - top} rx={3} {...PAINT.cylinderV} />
      <rect x={x - 2} y={top - 2} width={w + 4} height={5} rx={1.5} {...PAINT.raised} />
      <GasLine pts={[[x + w / 2, 562], [x + w / 2, top + 16]]} />
      <Head x={x + w / 2} y={318} dir="u" fill={MX.gas} s={7} />
      {/* dust CEMS on the stack */}
      <rect x={1587} y={239} width={6} height={6} {...PAINT.shaft} />
      <rect x={1554} y={228} width={33} height={29} rx={4} {...PAINT.raised} />
      <circle cx={1570} cy={242} r={6} fill="none" stroke={MX.fine} strokeWidth={1} />
    </g>
  );
}

function Labels() {
  const bottom: Array<[number, string]> = [
    [161, "BUCKET ELEVATOR"],
    [466, "PREHEATER + CALCINER"],
    [984, "ID FAN"],
    [1341, "BAGHOUSE"],
    [1598, "STACK"],
  ];
  return (
    <g>
      {bottom.map(([x, t]) => (
        <MachineLabel key={t} x={x} y={725} size={10.5}>
          {t}
        </MachineLabel>
      ))}
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={50} x2={1610} y={GROUND} />
      <Structure />
      <Elevator />
      <TowerDucts />
      <TowerGas />
      {STAGES.map((g, i) => (
        <StageCyclone key={i} g={g} label={`C${i + 1}`} labelSize={13} port={false} blaster={false} />
      ))}
      <TowerMeal />
      <TowerInstruments />
      <KilnInlet />
      <Calciner />
      <ExitGas />
      <IdFan />
      <Baghouse />
      <StackFan />
      <Stack />
      <Labels />
      <Bolt x={COLS[0] - 6} y={GROUND - 3} r={1.3} />
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 2. */
const pads: LineSheetArt["pads"] = {
  "TMP-PHC-01": [563, 74],
  "TMP-PHC-02": [369.5, 151.5],
  "TMP-PHC-03": [563, 228.8],
  "TMP-PHC-04": [369.5, 306.2],
  "TMP-PHC-05": [563, 383.8],
  "TMP-PHC-06": [369.5, 461],
  "PRS-PHC-01": [626.5, 95],
  "PRS-PHC-02": [306, 172.5],
  "PRS-PHC-03": [626.5, 250],
  "PRS-PHC-04": [306, 327.5],
  "PRS-PHC-05": [626.5, 404.8],
  "PRS-PHC-06": [306, 482.2],
  "PRS-PHC-07": [341.5, 371.5],
  "PRS-PHC-08": [591, 449],
  "PRS-PHC-09": [341.5, 526.5],
  "TMP-PHC-07": [369.5, 633.5],
  "TMP-PHC-08": [501.5, 510.5],
  "GAS-PHC-01": [687, 100.5],
  "GAS-PHC-02": [718.8, 100.5],
  "CAL-PHC-01": [751, 100.5],
  "POS-PHC-01": [848, 118],
  "VIB-PHC-01": [1020.5, 225.2],
  "TMP-PHC-09": [1020.5, 251.8],
  "VIB-PHC-02": [967.5, 251.8],
  "TMP-PHC-10": [967.5, 225.2],
  "ELE-PHC-01": [1139.2, 193.5],
  "SPD-PHC-01": [1201.8, 237.5],
  "TMP-PHC-11": [1150.5, 252.5],
  // calciner outlet, meal split, calciner firing and tertiary air
  "PRS-PHC-10": [475, 510.5],
  "GAS-PHC-03": [447, 574.5],
  "GAS-PHC-04": [480.5, 574.5],
  "POS-PHC-02": [586, 477],
  "FLO-BRN-02": [743.5, 563.2],
  "PRS-BRN-05": [642.2, 602],
  "TMP-BRN-03": [703.8, 602],
  "POS-BRN-01": [767.8, 602],
  // main baghouse BGH-01, its fan and the stack CEMS
  "TMP-BGH-02": [1091, 105.5],
  "PRS-BGH-02": [1170, 105.5],
  "STS-BGH-01": [1312.5, 70.5],
  "PRS-BGH-01": [1479, 294],
  "LEV-BGH-01": [1324, 497.2],
  "ELE-BGH-02": [1196.5, 536],
  "GAS-BGH-01": [1569.5, 242],
  "ELE-BGH-01": [1537.8, 603.8],
  "VIB-BGH-01": [1487, 625],
  "TMP-BGH-01": [1487, 647.8],
  "TMP-BGH-03": [1541.2, 644.2],
  "SPD-BGH-01": [1580, 633.5],
};

/** Value-block slot per point, from the PDF label chips; re-flowed where live blocks are wider. */
const callouts: LineSheetArt["callouts"] = {
  "TMP-PHC-01": [563.5, 14, "middle"],
  "PRS-PHC-01": [627.8, 37, "middle"],
  "GAS-PHC-02": [672, 14, "start"],
  "CAL-PHC-01": [745, 37, "start"],
  "GAS-PHC-01": [800, 168, "end"],
  "TMP-PHC-02": [370, 109.2, "middle"],
  "PRS-PHC-02": [281.5, 172.8, "end"],
  "TMP-PHC-03": [563.5, 197.5, "middle"],
  "PRS-PHC-03": [662.5, 281, "start"],
  "TMP-PHC-04": [370, 274.8, "middle"],
  "PRS-PHC-04": [281.5, 327.5, "end"],
  "TMP-PHC-05": [563.5, 352.2, "middle"],
  "PRS-PHC-05": [662.5, 405, "start"],
  "PRS-PHC-07": [342, 401.5, "middle"],
  "TMP-PHC-06": [370, 429.8, "middle"],
  "PRS-PHC-08": [662.5, 450.8, "start"],
  "TMP-PHC-08": [497, 468.5, "middle"],
  "PRS-PHC-06": [281.5, 482.5, "end"],
  "PRS-PHC-09": [342, 556.5, "middle"],
  "TMP-PHC-07": [345, 634, "end"],
  "POS-PHC-01": [835, 86, "start"],
  "TMP-PHC-10": [990, 140, "end"],
  "VIB-PHC-01": [1000, 140, "start"],
  "ELE-PHC-01": [1139, 165, "middle"],
  "VIB-PHC-02": [990, 338, "end"],
  "TMP-PHC-09": [985, 340, "start"],
  "SPD-PHC-01": [1225, 362, "end"],
  "TMP-PHC-11": [1172, 340, "start"],
  "PRS-PHC-10": [475, 542.5, "end"],
  "GAS-PHC-03": [448.2, 605.8, "end"],
  "GAS-PHC-04": [479.8, 634, "start"],
  "POS-PHC-02": [609.5, 479, "start"],
  "FLO-BRN-02": [744.8, 531.8, "start"],
  "PRS-BRN-05": [643.8, 732.5, "middle"],
  "TMP-BRN-03": [723.8, 634, "middle"],
  "POS-BRN-01": [803, 602.2, "start"],
  "TMP-BGH-02": [1091.8, 137.5, "end"],
  "PRS-BGH-02": [1169, 74.2, "start"],
  "STS-BGH-01": [1313, 42.5, "end"],
  "GAS-BGH-01": [1547, 243, "end"],
  "PRS-BGH-01": [1480, 324, "end"],
  "LEV-BGH-01": [1300.5, 496.5, "end"],
  "ELE-BGH-02": [1149, 535.2, "end"],
  "ELE-BGH-01": [1537.5, 574, "end"],
  "VIB-BGH-01": [1399, 627, "end"],
  "TMP-BGH-01": [1399, 648, "end"],
  "TMP-BGH-03": [1541, 743, "middle"],
  "SPD-BGH-01": [1579.5, 711.2, "middle"],
};

export const sheet: LineSheetArt = { id: "P-0", ready: true, width: W, height: H, Art, pads, callouts };
