/**
 * Sheet P-0 — PHC-01 · Preheater — Overview.
 *
 * Composition of PDF page 8: the six-stage cyclone tower (C1 top right → C6
 * bottom left) on its two-column steel structure with floors; raw meal into
 * the C2 → C1 duct; meal drops through flap valves stage to stage; kiln riser
 * from the kiln inlet chamber into C6; hot meal from C6 to the kiln inlet.
 * Right: preheater exit duct with gas-analyser probe and ID fan inlet damper,
 * the ID fan (volute, NDE / DE plummer blocks, coupling, VFD motor with
 * encoder) on its elevated table foundation, fan outlet to GCT / raw mill /
 * stack.
 */
import React from "react";
import { Bolt, Coupling, CornerBolts, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Handrail, MealPipe, Pipe } from "../../drawings/fkp-parts";
import { SideMotor } from "../../sheets/sb-parts";
import type { LineSheetArt } from "../types";
import { Arrow, BasePlate, Beam, FanCasing, FlapValve, Gusset, PlummerBlock, StageCyclone, type StageGeom, stageDims } from "./parts-p";

const W = 1144.5;
const H = 479;
const GROUND = 458;

/* ---------------------------------------------------------------- tower */
const LX = 465.5;
const RX = 570;
const S = 0.643; // P-1 → P-0 spacing scale
const DD = 11;
const LANE_R = 523.5;
const LANE_L = 512;
const COLS = [408.5, 626];
const STAGES: StageGeom[] = [0, 1, 2, 3, 4, 5].map((i) => ({ cx: i % 2 ? LX : RX, top: 27 + i * 67.5, inlet: i % 2 ? 1 : -1, w: 70, cyl: 30, cone: 36, ow: 22, k: 0.72 }));
const RISER_Y = 379;
const MEAL_Y = 449;
const CH = { x: 645.5, y: 392.5, w: 67, h: 59.5 };

/* ---------------------------------------------------------------- exit gas + ID fan */
const EXIT_Y = 17;
const ED = 14;
const DOWN_X = 737;
const DAMPER_Y = 121;
const FAN = { cx: 795.5, cy: 247, r: 50 };
const DECK = 300;
const NDE = 870.5;
const DE = 915;
const MOTOR = { x: 960, y: 215.5, w: 107, h: 63 };
const OUT_X = 822;
const OUT_Y = 31;

function stageDuct(i: number): [number, number][] {
  const a = STAGES[i - 1];
  const b = STAGES[i - 2];
  const w = stageDims(b).w;
  const lane = a.cx === LX ? LANE_R : LANE_L;
  const inX = b.inlet > 0 ? b.cx + w / 2 + 4 : b.cx - w / 2 - 4;
  return [
    [a.cx, a.top - 1],
    [a.cx, a.top - 12 * S],
    [lane, a.top - 12 * S],
    [lane, b.top + 22.5 * S],
    [inX, b.top + 22.5 * S],
  ];
}

function Tower() {
  const floors = STAGES.map((g) => stageDims(g).yJ + 4).sort((a, b) => a - b);
  return (
    <g>
      {COLS.map((x, i) => (
        <g key={x}>
          <rect x={x - 3} y={i ? 26 : 16} width={6} height={GROUND - (i ? 26 : 16)} rx={1.2} fill={MX.body} stroke={MX.edge} strokeWidth={MX.wFine} />
          <BasePlate x={x} y={GROUND} w={16} />
        </g>
      ))}
      {floors.map((y) => (
        <g key={y}>
          <Handrail x1={COLS[0] + 4} x2={COLS[1] - 4} y={y} h={7} step={13.5} />
          <Beam x1={COLS[0] + 3} x2={COLS[1] - 3} y={y} h={4} />
          <Gusset x={COLS[0] + 3} y={y + 4} s={1} size={6} />
          <Gusset x={COLS[1] - 3} y={y + 4} s={-1} size={6} />
        </g>
      ))}
    </g>
  );
}

function TowerDucts() {
  return (
    <g>
      <Pipe pts={[[684, CH.y + 2], [684, RISER_Y], [LX + 39, RISER_Y]]} d={13} flanges={[[600, RISER_Y], [510, RISER_Y]]} />
      {[6, 5, 4, 3, 2].map((i) => (
        <Pipe key={i} pts={stageDuct(i)} d={DD} />
      ))}
    </g>
  );
}

function TowerMeal() {
  const drops = STAGES.map((g, i) => {
    const y0 = stageDims(g).yOut;
    const y1 = i === 5 ? MEAL_Y : i === 4 ? RISER_Y - 8 : STAGES[i + 2].top - 12 * S - DD / 2 - 1;
    return [g.cx, y0, y1] as const;
  });
  return (
    <g>
      {drops.map(([x, y0, y1], i) => (
        <MealPipe key={i} pts={i === 5 ? [[x, y0], [x, y1], [CH.x + 1, y1]] : [[x, y0], [x, y1]]} d={5} />
      ))}
      {drops.slice(0, 4).map(([x, y0], i) => (
        <FlapValve key={i} x={x} y={y0 + 16} s={x === LX ? -1 : 1} k={0.62} />
      ))}
      {/* raw meal into the C2 → C1 duct up-leg */}
      <MealPipe pts={[[352, 75], [LANE_R - DD / 2 - 1, 75]]} d={5} />
      <rect x={LANE_R - DD / 2 - 4} y={70} width={4} height={10} rx={1} {...PAINT.raised} />
    </g>
  );
}

function KilnInlet() {
  const { x, y, w, h } = CH;
  return (
    <g>
      <rect x={x + w - 2} y={405} width={731 - (x + w - 2)} height={33} rx={2} {...PAINT.cylinder} />
      <path d="M 731 403 l -3 6 l 3 6 l -3 6 l 3 6 l -3 6 l 3 6" fill="none" stroke={MX.label} strokeWidth={1} />
      <rect x={x + w} y={401} width={7} height={41} rx={2} {...PAINT.body} />
      <rect x={x} y={y} width={w} height={h} rx={5} {...PAINT.body} />
      <rect x={x + 6} y={y + 6} width={w - 12} height={h - 12} rx={3} {...PAINT.recess} />
      <path d={`M ${x + 7} ${y + h - 7} Q ${x + 30} ${y + h - 22} ${x + w - 7} ${y + h - 18} L ${x + w - 7} ${y + h - 7} Z`} {...PAINT.material} />
      <CornerBolts x={x} y={y} w={w} h={h} inset={3.5} r={1.2} />
      <rect x={x + 4} y={y + h} width={w - 8} height={GROUND - y - h} rx={1} {...PAINT.body} />
    </g>
  );
}

function ExitGas() {
  return (
    <g>
      <Pipe
        pts={[
          [RX, 26],
          [RX, EXIT_Y],
          [DOWN_X, EXIT_Y],
          [DOWN_X, FAN.cy],
          [FAN.cx - FAN.r + 4, FAN.cy],
        ]}
        d={ED}
        flanges={[[DOWN_X, 70], [DOWN_X, 180], [680, EXIT_Y]]}
      />
      {/* gas probe + heated sample line to the analyser */}
      <rect x={DOWN_X + ED / 2 - 1} y={49} width={6} height={9} rx={1.2} {...PAINT.raised} />
      <line x1={DOWN_X + ED / 2 + 5} y1={53.5} x2={755} y2={60} stroke={MX.label} strokeWidth={0.8} strokeDasharray="2.5 2" />
      <rect x={755} y={42} width={53} height={41} rx={5} {...PAINT.body} />
      <rect x={758.5} y={45.5} width={46} height={34} rx={3} fill="none" stroke={MX.fine} strokeWidth={0.8} />
      <rect x={763} y={47} width={20} height={16} rx={2} {...PAINT.recess} />
      <rect x={787} y={47} width={20} height={16} rx={2} {...PAINT.recess} />
      {[70, 74, 78].map((ly) => (
        <line key={ly} x1={764} x2={800} y1={ly} y2={ly} {...PAINT.hair} />
      ))}
      {/* inlet damper + actuator */}
      <rect x={720} y={DAMPER_Y - 9} width={30} height={18} rx={2.5} {...PAINT.body} />
      <rect x={724} y={DAMPER_Y - 6} width={22} height={12} rx={1.5} {...PAINT.recess} />
      <line x1={725} y1={DAMPER_Y + 5} x2={745} y2={DAMPER_Y - 5} stroke={MX.metal} strokeWidth={2.2} strokeLinecap="round" />
      <circle cx={DOWN_X - 2} cy={DAMPER_Y} r={2} {...PAINT.shaft} />
      <rect x={750} y={DAMPER_Y - 1.5} width={4} height={3} {...PAINT.shaft} />
      <rect x={753} y={DAMPER_Y - 8} width={30} height={16} rx={3} {...PAINT.body} />
      <rect x={783} y={DAMPER_Y - 6} width={6} height={12} rx={2} {...PAINT.raised} />
    </g>
  );
}

function IdFan() {
  const outTop = 186;
  const motorCy = MOTOR.y + MOTOR.h / 2;
  return (
    <g>
      {/* elevated table foundation: deck on piers (labels sit in the open bays) */}
      {[[738, 22], [893, 22], [1077, 17]].map(([px, pw]) => (
        <g key={px}>
          <rect x={px} y={DECK + 10} width={pw} height={GROUND - DECK - 10} rx={2} {...PAINT.body} />
          <line x1={px + 3} x2={px + 3} y1={DECK + 14} y2={GROUND - 4} {...PAINT.hair} />
        </g>
      ))}
      <rect x={735} y={DECK} width={359} height={12} rx={2.5} {...PAINT.body} />
      <line x1={738} x2={1091} y1={DECK + 4} y2={DECK + 4} {...PAINT.hair} />
      {[748, 830, 960, 1080].map((bx) => (
        <Bolt key={bx} x={bx} y={DECK + 8} r={1.3} />
      ))}
      {/* fan outlet: transition and duct to GCT / raw mill / stack */}
      <path d={`M ${FAN.cx} ${outTop} L ${OUT_X - ED / 2 - 2} ${outTop - 18} L ${OUT_X + ED / 2 + 2} ${outTop - 18} L ${FAN.cx + FAN.r} ${outTop} Z`} {...PAINT.body} />
      <Pipe pts={[[OUT_X, outTop - 18], [OUT_X, OUT_Y], [973, OUT_Y]]} d={ED} flanges={[[OUT_X, 120], [900, OUT_Y]]} />
      <FanCasing cx={FAN.cx} cy={FAN.cy} r={FAN.r} outTop={outTop} baseY={DECK} />
      {/* shaft line, bearings on pedestals, coupling, motor, encoder */}
      <rect x={FAN.cx} y={FAN.cy - 3} width={MOTOR.x - FAN.cx} height={6} rx={1.5} {...PAINT.shaft} />
      {[NDE, DE].map((x) => (
        <g key={x}>
          <path d={`M ${x - 16} 276 H ${x + 16} L ${x + 19} ${DECK} H ${x - 19} Z`} {...PAINT.body} />
          <PlummerBlock cx={x} cy={FAN.cy} top={229} bottom={269} w={28} shaft={6} />
        </g>
      ))}
      <Coupling x={937} y={FAN.cy - 8} w={20} h={16} />
      <rect x={968} y={MOTOR.y + MOTOR.h - 2} width={MOTOR.w - 16} height={DECK - MOTOR.y - MOTOR.h + 2} rx={2} {...PAINT.body} />
      <SideMotor x={MOTOR.x} y={MOTOR.y} w={MOTOR.w} h={MOTOR.h} flip />
      <rect x={1093} y={motorCy - 7} width={6} height={14} rx={2} {...PAINT.raised} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={14} x2={1130} y={GROUND} />
      <Tower />
      <TowerDucts />
      <KilnInlet />
      {STAGES.map((g, i) => (
        <StageCyclone key={i} g={g} label={`C${i + 1}`} labelSize={11.2} port={false} />
      ))}
      <TowerMeal />
      <IdFan />
      <ExitGas />
      <Arrow x1={975} y1={OUT_Y} x2={1004} y2={OUT_Y} />
      <Arrow x1={330} y1={75} x2={349} y2={75} />
      <MachineLabel x={271} y={62.1} size={8.2} anchor="start">RAW MEAL</MachineLabel>
      <MachineLabel x={781.5} y={95} size={7.5}>ANALYSER</MachineLabel>
      <MachineLabel x={1008} y={32} size={7.5} anchor="start">TO GCT / RAW MILL / STACK</MachineLabel>
      <MachineLabel x={794.5} y={323} size={8.2}>ID FAN</MachineLabel>
      <MachineLabel x={1019.5} y={323} size={8.2}>ID FAN MOTOR (VFD)</MachineLabel>
      <MachineLabel x={372.5} y={473} size={8.2} anchor="start">SIX-STAGE CYCLONE TOWER · C1 TOP → C6 BOTTOM</MachineLabel>
      <MachineLabel x={680} y={473} size={8.2}>KILN INLET</MachineLabel>
      <MachineLabel x={757} y={473} size={8.2}>KILN</MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 8. */
const pads: LineSheetArt["pads"] = {
  "POS-PHC-01": [768.5, 121],
  "GAS-PHC-01": [773, 55],
  "GAS-PHC-02": [797, 55],
  "VIB-PHC-02": [870.5, 237.5],
  "TMP-PHC-10": [870.5, 260],
  "VIB-PHC-01": [915.5, 237.5],
  "TMP-PHC-09": [915.5, 260],
  "ELE-PHC-01": [1013.5, 211],
  "SPD-PHC-01": [1084, 248],
  "TMP-PHC-01": [570.5, 21.5],
  "TMP-PHC-02": [465.5, 89],
  "TMP-PHC-03": [570.5, 156.5],
  "TMP-PHC-04": [465.5, 224],
  "TMP-PHC-05": [570.5, 291.5],
  "TMP-PHC-06": [465.5, 359],
  "PRS-PHC-01": [660.5, 17],
  "PRS-PHC-02": [431.5, 114.5],
  "PRS-PHC-03": [604, 182],
  "PRS-PHC-04": [431.5, 249.5],
  "PRS-PHC-05": [604, 317],
  "PRS-PHC-06": [540.5, 379],
  "PRS-PHC-07": [480.5, 284],
  "PRS-PHC-08": [591.5, 351.5],
  "PRS-PHC-09": [486.5, 419],
  "TMP-PHC-07": [555.5, 449],
  "TMP-PHC-08": [634, 379],
};

export const sheet: LineSheetArt = { id: "P-0", ready: true, width: W, height: H, Art, pads };
