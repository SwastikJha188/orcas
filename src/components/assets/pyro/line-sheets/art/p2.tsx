/**
 * Sheet P-2 — PHC-01 · Lower cones, riser and meal to kiln. Group images
 * page 2A, middle panel (page box 574, 91 → 1080, 540.5): cyclones C4, C5
 * and C6 with their gas ducts (C4 to C3, C5 to C4, C6 to C5), the kiln riser
 * from the kiln inlet chamber into C6, purge air to the three cone pressure
 * taps, meal from C3 into C5 and hot meal from C6 to the kiln inlet.
 */
import React from "react";
import { GroundLine, MX } from "@/components/assets/machine-kit/machine-kit";
import { Pipe } from "../../drawings/fkp-parts";
import type { LineSheetArt } from "../types";
import { StageCyclone, type StageGeom } from "./parts-p";
import { Caps, FlowArrow, FlowLine, KilnInlet, MEAL, MealLine } from "./parts-p2";

const W = 506;
const H = 449.5;
const GROUND = 422.5;
const D = 10;
const C4: StageGeom = { cx: 142, top: 74, inlet: 1, w: 66.5, cyl: 31, cone: 43, ow: 18, k: 0.7 };
const C5: StageGeom = { cx: 257.5, top: 154, inlet: -1, w: 66.5, cyl: 31, cone: 41, ow: 18, k: 0.7 };
const C6: StageGeom = { cx: 142, top: 233, inlet: 1, w: 66.5, cyl: 31, cone: 43.5, ow: 18, k: 0.7 };
const HALF = 33.25;
const PURGE_X = 53.5;

function Art() {
  return (
    <g>
      <GroundLine x1={22.5} x2={484} y={GROUND} />
      {/* gas ducts: C4 to C3, C5 to C4, C6 to C5, kiln riser into C6 */}
      <Pipe pts={[[C4.cx, C4.top + 1], [C4.cx, 63], [292, 63]]} d={D} />
      <FlowArrow x1={295} y1={63} x2={320} y2={63} color={MX.label} w={1.2} s={4} />
      <Pipe pts={[[C5.cx, C5.top + 1], [C5.cx, 148.5], [196, 148.5], [196, 90], [C4.cx + HALF - 1, 90]]} d={D} />
      <Pipe pts={[[C6.cx, C6.top + 1], [C6.cx, 227], [217.5, 227], [217.5, 169], [C5.cx - HALF + 1, 169]]} d={D} />
      <Pipe pts={[[391, 291], [391, 250], [C6.cx + HALF - 1, 250]]} d={14} />
      {/* purge air to the cone pressure taps */}
      <FlowLine pts={[[PURGE_X, 102.5], [PURGE_X, 305]]} color={MX.air} w={0.9} dash="3 2.5" />
      {[
        [132.5, 156],
        [212, 271.5],
        [292, 156],
      ].map(([y, x]) => (
        <FlowLine key={y} pts={[[PURGE_X, y], [x, y]]} color={MX.air} w={0.9} dash="3 2.5" />
      ))}
      <StageCyclone g={C4} label="C4" labelSize={7} port={false} blaster={false} />
      <StageCyclone g={C5} label="C5" labelSize={7} port={false} blaster={false} />
      <StageCyclone g={C6} label="C6" labelSize={7} port={false} blaster={false} />
      {/* meal: from C3 into C5, C4 to C6, C5 to the riser, C6 to the kiln inlet */}
      <MealLine pts={[[C5.cx, 112], [C5.cx, 143]]} />
      <MealLine pts={[[C4.cx, 157.5], [C4.cx, 227]]} />
      <MealLine pts={[[C5.cx, 235.5], [C5.cx, 249]]} />
      <MealLine pts={[[C6.cx, 317], [C6.cx, 329], [346, 329]]} />
      <KilnInlet x={346} y={289.5} w={89} h={114.5} kiln={[435, 334, 57.5, 39.5]} />
      <FlowArrow x1={411} y1={306} x2={411} y2={253} color={MX.gas} w={1.4} s={4.5} />
      <Caps x={324} y={65.5}>TO C3</Caps>
      <Caps x={49} y={98} color={MX.air}>
        PURGE AIR
      </Caps>
      <Caps x={262} y={118} color={MEAL}>
        MEAL FROM C3
      </Caps>
      <Caps x={391} y={240} anchor="middle">
        KILN RISER → CALCINER
      </Caps>
      <Caps x={464} y={329.5} anchor="middle">
        ROTARY KILN
      </Caps>
      <Caps x={390.5} y={416} anchor="middle">
        KILN INLET CHAMBER
      </Caps>
    </g>
  );
}

/** Pad centre per point, at the group-image pads: purged taps on the cone walls, hot meal on the chute to the kiln. */
const pads: LineSheetArt["pads"] = {
  "PRS-PHC-07": [163, 132.2],
  "PRS-PHC-08": [278.5, 212.2],
  "PRS-PHC-09": [163, 292],
  "TMP-PHC-07": [297.5, 329.2],
};

/** Cone pressures run off the cone away from the purge line; hot meal runs back along its chute. */
const callouts: LineSheetArt["callouts"] = {
  "PRS-PHC-07": [128.5, 162.8, "start"],
  "PRS-PHC-08": [296, 213.5, "start"],
  "PRS-PHC-09": [182, 292, "start"],
  "TMP-PHC-07": [290, 350.5, "end"],
};

export const sheet: LineSheetArt = { id: "P-2", ready: true, width: W, height: H, Art, pads, callouts };
