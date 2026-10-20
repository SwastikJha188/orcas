/**
 * Sheet P-5 — PHC-01 / BRN-01 · Calciner, calciner firing and tertiary air.
 * Group images page 2B, left panel (page box 48.5, 105.5 → 811.5, 777.5):
 * the calciner vessel with its burner flame over the kiln inlet chamber, the
 * gooseneck outlet duct to C6 (draft and temperature), the calciner outlet
 * analyser (O₂ / CO) on a sample line, hot meal from C5 through the meal split
 * gate (split leg to the kiln riser), calciner coal from the fine-coal bin
 * through its flowmeter, and the tertiary-air duct from the cooler with its
 * pressure and temperature taps and damper.
 */
import React from "react";
import { GroundLine, MX, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Pipe } from "../../drawings/fkp-parts";
import type { LineSheetArt } from "../types";
import { Analyser, Caps, Damper, FlowArrow, FlowLine, InstrumentBox, KilnInlet, MEAL, MealLine, Tap } from "./parts-p2";

const W = 763;
const H = 672;
const GROUND = 634;
const CAL = { x0: 280.5, x1: 375, top: 161.5, bot: 492.5 };
const CX = 327.75;
const TA_Y = 405;
const COAL_Y = 458;
const MEAL_Y = 344;

function Calciner() {
  const { x0, x1, top, bot } = CAL;
  return (
    <g>
      <path d={`M 287.5 ${bot} L 369 ${bot} L 388.5 540 L 267.5 540 Z`} {...PAINT.cylinderV} />
      <rect x={x0} y={top} width={x1 - x0} height={bot - top} rx={8} {...PAINT.cylinderV} />
      <line x1={x0 + 6} x2={x0 + 6} y1={top + 10} y2={bot - 8} {...PAINT.hair} />
      <line x1={x1 - 6} x2={x1 - 6} y1={top + 10} y2={bot - 8} {...PAINT.hair} />
      <rect x={x0 - 3} y={bot - 2.5} width={x1 - x0 + 6} height={5} rx={1.5} {...PAINT.raised} />
      {/* burner flame */}
      <ellipse cx={326} cy={431.5} rx={36} ry={47} fill={MX.heat} />
      <ellipse cx={322} cy={433} rx={24} ry={32} fill={MX.heat} />
      <ellipse cx={318} cy={435} rx={12} ry={17} fill={MX.heat} />
      <text x={CX} y={310} fill="var(--dx-ink-2)" fontSize={10} fontWeight={600} letterSpacing="0.16em" textAnchor="middle">
        CALCINER
      </text>
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={30} x2={733} y={GROUND} />
      {/* gooseneck: calciner outlet to C6 */}
      <Pipe pts={[[328, CAL.top + 4], [328, 108], [146, 108], [146, 229]]} d={29} />
      <FlowArrow x1={145} y1={249} x2={145} y2={285} color={MX.gas} w={1.4} s={5.5} />
      {/* calciner coal from the fine-coal bin through the flowmeter */}
      <Pipe pts={[[51, COAL_Y], [CAL.x0 + 2, COAL_Y]]} d={11.5} elbows={false} />
      <MealLine pts={[[52, COAL_Y], [CAL.x0, COAL_Y]]} w={1.4} />
      <InstrumentBox x={111.5} y={442.5} w={61} h={32.5} rx={4} />
      {/* tertiary air from the cooler: pressure and temperature taps, damper with actuator */}
      <Pipe pts={[[CAL.x1 - 2, TA_Y], [726, TA_Y]]} d={33} elbows={false} />
      <rect x={CAL.x1} y={TA_Y - 5} width={351} height={10} fill={MX.deep} opacity={0.4} />
      {[442.3, 523.3].map((x) => (
        <rect key={x} x={x - 9} y={TA_Y - 9} width={18} height={18} rx={4} {...PAINT.raised} />
      ))}
      <Damper x={591} y={384} w={27} h={41} />
      <rect x={618} y={TA_Y - 2.5} width={3} height={5} {...PAINT.shaft} />
      <InstrumentBox x={620} y={391} w={48} h={28} rx={4} />
      <FlowArrow x1={726} y1={364.5} x2={684} y2={364.5} color={MX.air} w={1.4} s={5.5} />
      <KilnInlet x={233.5} y={540} w={189} h={81} kiln={[422.5, 560, 148.5, 55]} />
      <Calciner />
      {/* hot meal from C5 through the meal split gate; split leg to the kiln riser */}
      <MealLine pts={[[90, MEAL_Y], [CAL.x0 + 2, MEAL_Y]]} w={2.5} />
      <FlowLine pts={[[253.5, 354], [253.5, 492.5]]} color={MEAL} w={1.6} dash="5 3.5" />
      <InstrumentBox x={233.5} y={334} w={40.5} h={20} rx={3} />
      {/* calciner outlet analyser on its sample line */}
      <Tap pts={[[CAL.x1, 209], [442.5, 209]]} dashed />
      <Analyser x={442.5} y={182} w={115} h={61.5} cells={[473.5, 524.75]} cy={206.5} cw={41} ch={27} />
      <Caps x={159} y={270} size={8} color={MX.gas} spacing="0.2em">
        TO C6 CYCLONE
      </Caps>
      <Caps x={499} y={260} size={7.5} anchor="middle" spacing="0.24em">
        CALCINER OUTLET ANALYSER
      </Caps>
      <Caps x={91.5} y={331} size={7.5} color={MEAL} spacing="0.22em">
        HOT MEAL FROM C5
      </Caps>
      <Caps x={210} y={519} size={7} anchor="middle" color={MEAL} spacing="0.24em">
        TO KILN RISER
      </Caps>
      <Caps x={51} y={437} size={7} color={MEAL} spacing="0.2em">
        CALCINER COAL FROM FINE-COAL BIN
      </Caps>
      <Caps x={725} y={351} size={7.5} anchor="end" color={MX.air} spacing="0.2em">
        TERTIARY AIR FROM COOLER
      </Caps>
      <Caps x={380} y={478} size={6.5} spacing="0.24em">
        CALCINER BURNER
      </Caps>
      <Caps x={496} y={553} size={7} anchor="middle" spacing="0.24em">
        ROTARY KILN
      </Caps>
      <Caps x={327.5} y={631} size={7} anchor="middle" spacing="0.24em">
        KILN INLET CHAMBER
      </Caps>
    </g>
  );
}

/** Pad centre per point, at the group-image pads. */
const pads: LineSheetArt["pads"] = {
  "PRS-PHC-10": [233, 107.5],
  "TMP-PHC-08": [327.5, 171],
  "GAS-PHC-03": [473.3, 206.3],
  "GAS-PHC-04": [524.7, 206.3],
  "POS-PHC-02": [253.3, 344.3],
  "PRS-BRN-05": [442.3, 405],
  "TMP-BRN-03": [523.3, 405],
  "POS-BRN-01": [644, 405],
  "FLO-BRN-02": [141.7, 459],
};

/** Plates along the gooseneck, meal and coal lines and the tertiary-air duct; analyser cells split left / right. */
const callouts: LineSheetArt["callouts"] = {
  "PRS-PHC-10": [181, 135.5, "end"],
  "TMP-PHC-08": [285, 170.7, "end"],
  "GAS-PHC-03": [502, 170.7, "end"],
  "GAS-PHC-04": [568.5, 206, "start"],
  "POS-PHC-02": [290.5, 317.5, "end"],
  "PRS-BRN-05": [493.5, 432, "end"],
  "TMP-BRN-03": [477.5, 379.3, "start"],
  "POS-BRN-01": [598, 432, "start"],
  "FLO-BRN-02": [96, 485, "start"],
};

export const sheet: LineSheetArt = { id: "P-5", ready: true, width: W, height: H, Art, pads, callouts };
