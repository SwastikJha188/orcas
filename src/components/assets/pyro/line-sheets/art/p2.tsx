/**
 * Sheet P-2 — PHC-01 · Preheater — Lower cones, riser and meal to kiln.
 *
 * Composition of PDF page 10: the lower stages C4 (left, top), C5 (right) and
 * C6 (left, bottom) hung from cantilever floors on two columns. Kiln gas rises
 * from the kiln inlet chamber through the riser into C6, then C6 → C5 → C4 and
 * on to C3. Meal from C3 drops into the C5 → C4 duct, C4 meal into the C6 → C5
 * duct, C5 meal into the riser; C6 hot meal runs to the kiln inlet chamber.
 * Each lower cone has a purged pressure tap fed from the purge-air header
 * (needle valve and rotameter per branch) at left.
 */
import React from "react";
import { Bolt, CornerBolts, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Handrail, MealPipe, Pipe } from "../../drawings/fkp-parts";
import type { LineSheetArt } from "../types";
import { Arrow, BasePlate, Beam, Bellows, FlapValve, Gusset, StageCyclone, type StageGeom, conePoint, stageDims } from "./parts-p";

const W = 824;
const H = 704;
const GROUND = 676;

const DIM = { w: 113.5, cyl: 54, cone: 74, ow: 35, k: 1.17 };
const C4: StageGeom = { cx: 225.75, top: 87, inlet: 1, ...DIM };
const C5: StageGeom = { cx: 420.5, top: 222, inlet: -1, ...DIM };
const C6: StageGeom = { cx: 225.75, top: 357, inlet: 1, ...DIM };
const DD = 19;
const RISER_X = 645.75;
const RISER_Y = 389;
const MEAL_Y = 518;
const COL_L = 150;
const COL_R = 500;
const HEADER_X = 76;
const CH = { x: 571, y: 451, w: 149, h: 194 }; // kiln inlet chamber

/** Purged cone taps (pad positions, on the right-hand cone wall). */
const TAPS: [number, number][] = [conePoint(C4, 0.5, 1), conePoint(C5, 0.5, 1), conePoint(C6, 0.5, 1)];

function Structure() {
  const floor = (g: StageGeom) => stageDims(g).yJ + 6;
  return (
    <g>
      {[COL_L, COL_R].map((x) => {
        const top = floor(x === COL_L ? C4 : C5) - 12;
        return (
        <g key={x}>
          <rect x={x - 4} y={top} width={8} height={GROUND - top} rx={1.5} fill={MX.body} stroke={MX.edge} strokeWidth={MX.w} />
          <line x1={x} x2={x} y1={top + 3} y2={GROUND - 8} stroke={MX.fine} strokeWidth={0.8} />
          <BasePlate x={x} y={GROUND} />
        </g>
        );
      })}
      {/* cantilever floors under the cyclone support lugs */}
      {[C4, C6].map((g) => (
        <g key={g.top}>
          <Handrail x1={COL_L + 6} x2={300} y={floor(g)} h={11} step={18} />
          <Beam x1={COL_L + 4} x2={304} y={floor(g)} />
          <Gusset x={COL_L + 4} y={floor(g) + 6} s={1} size={12} />
        </g>
      ))}
      <Handrail x1={350} x2={COL_R - 6} y={floor(C5)} h={11} step={18} />
      <Beam x1={346} x2={COL_R - 4} y={floor(C5)} />
      <Gusset x={COL_R - 4} y={floor(C5) + 6} s={-1} size={12} />
    </g>
  );
}

function PurgeAir() {
  const rows = TAPS.map(([, y]) => y);
  return (
    <g>
      {/* header from the instrument-air supply */}
      <rect x={HEADER_X - 2} y={132} width={4} height={rows[2] - 132 + 2} rx={1.5} {...PAINT.shaft} />
      <rect x={HEADER_X - 6} y={130} width={12} height={5} rx={1.5} {...PAINT.raised} />
      {TAPS.map(([x, y], i) => (
        <g key={i}>
          {/* branch tubing to the tap (passes behind the cyclone) */}
          <rect x={HEADER_X} y={y - 1.5} width={x - HEADER_X} height={3} rx={1.5} {...PAINT.shaft} />
          {/* needle valve */}
          <path d={`M ${HEADER_X + 10} ${y - 4} l 8 8 v -8 l -8 8 Z`} fill={MX.flatRaised} stroke={MX.edge} strokeWidth={0.9} strokeLinejoin="round" />
          <line x1={HEADER_X + 14} x2={HEADER_X + 14} y1={y} y2={y - 8} stroke={MX.edge} strokeWidth={1.2} />
          <rect x={HEADER_X + 10} y={y - 10} width={8} height={2.5} rx={1} {...PAINT.raised} />
          {/* rotameter: glass tube with float */}
          <rect x={HEADER_X + 26} y={y - 13} width={14} height={26} rx={2.5} {...PAINT.body} />
          <rect x={HEADER_X + 30} y={y - 9} width={6} height={18} rx={2} {...PAINT.recess} />
          <rect x={HEADER_X + 30.5} y={y - 1 - i * 2} width={5} height={3} rx={1} {...PAINT.shaft} />
        </g>
      ))}
    </g>
  );
}

function Ducts() {
  const inR = (g: StageGeom) => g.cx + stageDims(g).w / 2 + 6;
  const inL = (g: StageGeom) => g.cx - stageDims(g).w / 2 - 6;
  return (
    <g>
      {/* C4 gas outlet → C3 */}
      <Pipe pts={[[C4.cx, C4.top - 2], [C4.cx, 68], [481, 68]]} d={DD} flanges={[[330, 68], [440, 68]]} />
      <Bellows x={385} y={68} d={DD} vertical={false} />
      {/* C5 → C4 */}
      <Pipe pts={[[C5.cx, C5.top - 2], [C5.cx, 211], [315.5, 211], [315.5, 113], [inR(C4), 113]]} d={DD} flanges={[[315.5, 140], [370, 211]]} />
      <Bellows x={315.5} y={170} d={DD} />
      {/* C6 → C5 */}
      <Pipe pts={[[C6.cx, C6.top - 2], [C6.cx, 345], [353, 345], [353, 248], [inL(C5), 248]]} d={DD} flanges={[[353, 272], [300, 345]]} />
      <Bellows x={353} y={305} d={DD} />
      {/* kiln riser: inlet chamber → C6 */}
      <Pipe pts={[[RISER_X, CH.y + 2], [RISER_X, RISER_Y], [inR(C6), RISER_Y]]} d={22} flanges={[[RISER_X, 440], [430, RISER_Y], [560, RISER_Y]]} />
      <Bellows x={500} y={RISER_Y} d={22} vertical={false} len={14} />
    </g>
  );
}

function Meal() {
  const out = (g: StageGeom) => stageDims(g).yOut;
  return (
    <g>
      {/* meal from C3 into the C5 → C4 duct */}
      <MealPipe pts={[[C5.cx, 160], [C5.cx, 211 - DD / 2 - 1]]} d={8} />
      {/* C4 meal into the C6 → C5 duct */}
      <MealPipe pts={[[C4.cx, out(C4)], [C4.cx, 345 - DD / 2 - 1]]} d={8} />
      <FlapValve x={C4.cx} y={out(C4) + 34} s={-1} k={1.15} />
      {/* C5 meal into the riser */}
      <MealPipe pts={[[C5.cx, out(C5)], [C5.cx, RISER_Y - 12]]} d={8} />
      {/* C6 hot meal to the kiln inlet chamber */}
      <MealPipe pts={[[C6.cx, out(C6)], [C6.cx, MEAL_Y], [CH.x + 2, MEAL_Y]]} d={9} />
      <rect x={C6.cx - 8} y={MEAL_Y - 8} width={16} height={16} rx={3} {...PAINT.raised} />
      <rect x={CH.x - 12} y={MEAL_Y - 9} width={10} height={18} rx={2} {...PAINT.raised} />
      {[380, 540].map((x) => (
        <rect key={x} x={x - 2.5} y={MEAL_Y - 7} width={5} height={14} rx={1.2} {...PAINT.raised} />
      ))}
    </g>
  );
}

function KilnInlet() {
  const { x, y, w, h } = CH;
  const ky = 559.5;
  const kd = 67;
  return (
    <g>
      {/* rotary kiln shell entering the chamber */}
      <rect x={x + w - 4} y={ky - kd / 2} width={822 - (x + w - 4)} height={kd} rx={3} {...PAINT.cylinder} />
      {[760, 800].map((sx) => (
        <line key={sx} x1={sx} x2={sx} y1={ky - kd / 2 + 2} y2={ky + kd / 2 - 2} stroke={MX.fine} strokeWidth={1} />
      ))}
      {/* inlet seal: lamella ring and seal housing */}
      <rect x={x + w} y={ky - kd / 2 - 8} width={14} height={kd + 16} rx={3} {...PAINT.body} />
      {Array.from({ length: 6 }).map((_, i) => (
        <line key={i} x1={x + w + 2} x2={x + w + 12} y1={ky - kd / 2 - 4 + i * 15} y2={ky - kd / 2 + 2 + i * 15} stroke={MX.fine} strokeWidth={1} />
      ))}
      {/* support piers (clear of the label between them) */}
      <rect x={x + 1} y={y + h - 6} width={9} height={GROUND - (y + h - 6)} rx={1.5} {...PAINT.body} />
      <rect x={x + w - 10} y={y + h - 6} width={9} height={GROUND - (y + h - 6)} rx={1.5} {...PAINT.body} />
      <BasePlate x={x + 5.5} y={GROUND} w={18} />
      <BasePlate x={x + w - 5.5} y={GROUND} w={18} />
      {/* chamber: steel casing, refractory lining, meal bed */}
      <rect x={x} y={y} width={w} height={h} rx={8} {...PAINT.body} />
      <rect x={x + 7} y={y + 7} width={w - 14} height={h - 14} rx={4} fill="none" stroke={MX.fine} strokeWidth={1} />
      <rect x={x + 14} y={y + 16} width={w - 28} height={h - 34} rx={4} {...PAINT.recess} />
      {Array.from({ length: 5 }).map((_, i) => (
        <line key={i} x1={x + 14} x2={x + w - 14} y1={y + 46 + i * 28} y2={y + 46 + i * 28} {...PAINT.hair} opacity={0.6} />
      ))}
      <path d={`M ${x + 15} ${y + h - 19} Q ${x + 60} ${y + h - 46} ${x + w - 15} ${y + h - 36} L ${x + w - 15} ${y + h - 19} Z`} {...PAINT.material} />
      {/* kiln mouth: shell end and nose ring seen through the chamber */}
      <rect x={x + w - 26} y={ky - kd / 2 + 4} width={12} height={kd - 8} rx={2} {...PAINT.cylinderV} />
      <rect x={x + w - 30} y={ky - kd / 2 + 2} width={5} height={kd - 4} rx={1.5} {...PAINT.raised} />
      <CornerBolts x={x} y={y} w={w} h={h} inset={6} r={1.6} />
      {/* meal chute flange and inspection door */}
      <rect x={x + w * 0.62} y={y + 26} width={30} height={18} rx={2} {...PAINT.raised} />
      <Bolt x={x + w * 0.62 + 5} y={y + 35} r={1.3} />
      <Bolt x={x + w * 0.62 + 25} y={y + 35} r={1.3} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={22} x2={803} y={GROUND} />
      <Structure />
      <PurgeAir />
      <Ducts />
      <KilnInlet />
      <StageCyclone g={C4} label="C4" blaster={false} port={false} />
      <StageCyclone g={C5} label="C5" blaster={false} port={false} />
      <StageCyclone g={C6} label="C6" blaster={false} port={false} />
      {/* purged tap nozzles on the cones */}
      {TAPS.map(([x, y]) => (
        <rect key={y} x={x - 2} y={y - 4} width={9} height={8} rx={1.5} {...PAINT.raised} />
      ))}
      <Meal />
      <Arrow x1={483} y1={68} x2={527} y2={68} />
      <Arrow x1={679} y1={446} x2={679} y2={400} />
      <MachineLabel x={533} y={69.2} size={9} anchor="start">TO C3 (P-1)</MachineLabel>
      <MachineLabel x={428} y={176} size={8.2} anchor="start">MEAL FROM C3</MachineLabel>
      <MachineLabel x={68} y={126.6} size={8.2} anchor="start">PURGE AIR</MachineLabel>
      <MachineLabel x={615.5} y={374} size={8.2} anchor="start">KILN RISER</MachineLabel>
      <MachineLabel x={733} y={516.6} size={8.2} anchor="start">ROTARY KILN</MachineLabel>
      <MachineLabel x={583} y={662.7} size={9} anchor="start">KILN INLET CHAMBER</MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 10. */
const pads: LineSheetArt["pads"] = {
  "PRS-PHC-07": [261.5, 185],
  "PRS-PHC-08": [456.5, 320],
  "PRS-PHC-09": [261.5, 455],
  "TMP-PHC-08": [645.5, 420.5],
  "TMP-PHC-07": [488, 518],
};

/** Tag chip centre per point, as on PDF page 10. */
const chips: NonNullable<LineSheetArt["chips"]> = {
  "PRS-PHC-07": [372, 138],
  "PRS-PHC-08": [542, 314],
  "PRS-PHC-09": [354.5, 428],
  "TMP-PHC-08": [723.5, 390.5],
  "TMP-PHC-07": [409.5, 560],
};

export const sheet: LineSheetArt = { id: "P-2", ready: true, width: W, height: H, Art, pads, chips };
