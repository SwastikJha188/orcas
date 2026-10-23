/**
 * Sheet P-1 — PHC-01 · Cyclone stages: gas temperature and draft. Group
 * images page 2A, left panel (page box 41.5, 91 → 547.5, 540.5): the six
 * stage cyclones in two columns on the tower steel (C1, C3, C5 right; C2, C4,
 * C6 left), each stage's outlet duct climbing to the stage above, meal
 * falling stage to stage, raw meal from the elevator into the C2 → C1 duct,
 * kiln gas from the riser into C6 and the exit duct from C1 to the ID fan.
 */
import React from "react";
import { GroundLine, MX, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Pipe } from "../../drawings/fkp-parts";
import type { LineSheetArt } from "../types";
import { Beam, StageCyclone, type StageGeom, stageDims } from "./parts-p";
import { Caps, FlowArrow, MealLine } from "./parts-p2";

type Pt = [number, number];

const W = 506;
const H = 449.5;
const GROUND = 422.5;
const RX = 293;
const LX = 195.5;
const D = 10;
/** Roof top of stage n (1 … 6). */
const T = (n: number) => 43.5 + (n - 1) * 62.3;
export const STAGES: StageGeom[] = [1, 2, 3, 4, 5, 6].map((n) => ({ cx: n % 2 ? RX : LX, top: T(n), inlet: n % 2 ? -1 : 1, w: 58, cyl: 27, cone: 29.5, ow: 18, k: 0.6 }));
const HALF = 29;

/** Outlet duct of stage n (2 … 6) up into stage n − 1. */
function stageDuct(n: number): Pt[] {
  const left = n % 2 === 0;
  const y = T(n) - (left ? 8.3 : 8.5);
  const lane = left ? 249 : 240;
  const yIn = T(n - 1) + 13.5;
  const xIn = left ? RX - HALF : LX + HALF;
  return [
    [left ? LX : RX, T(n) + 1],
    [left ? LX : RX, y],
    [lane, y],
    [lane, yIn],
    [xIn, yIn],
  ];
}

function Steel() {
  return (
    <g>
      {[93.5, 156, 218.5, 281, 343.5].map((y) => (
        <Beam key={y} x1={157.5} x2={334.5} y={y - 1.25} h={2.5} />
      ))}
      <rect x={153.5} y={32} width={4} height={GROUND - 32} rx={1} {...PAINT.body} />
      <rect x={334.5} y={41.5} width={5.5} height={GROUND - 41.5} rx={1} {...PAINT.body} />
      <line x1={337.25} x2={337.25} y1={44} y2={GROUND - 2} {...PAINT.hair} />
    </g>
  );
}

/** The six-stage tower (also the drawing of sheet P-2, which carries the cone points). */
export function TowerArt() {
  return (
    <g>
      <GroundLine x1={22.5} x2={482.5} y={GROUND} />
      <Steel />
      {/* raw meal from the elevator into the C2 → C1 duct */}
      <Pipe pts={[[111, 97.5], [192, 97.5]]} d={5.5} elbows={false} />
      <MealLine pts={[[112, 97.5], [188, 97.5]]} w={1.6} />
      <FlowArrow x1={75} y1={98.5} x2={110} y2={98.5} color="var(--mx-material)" w={1.6} s={4.5} />
      {/* exit duct to the ID fan, kiln riser into C6, stage ducts */}
      <Pipe pts={[[RX, T(1) + 1], [RX, 35], [479, 35]]} d={D} />
      <FlowArrow x1={481} y1={35} x2={495} y2={35} color={MX.label} w={1.2} s={4} />
      <Pipe pts={[[367, GROUND], [367, 368], [LX + HALF - 1, 368]]} d={D} />
      {[2, 3, 4, 5, 6].map((n) => (
        <Pipe key={n} pts={stageDuct(n)} d={D} />
      ))}
      {STAGES.map((g, i) => (
        <StageCyclone key={i} g={g} label={`C${i + 1}`} labelSize={6.5} port={false} blaster={false} />
      ))}
      {/* meal falling stage to stage; C5 meal to the calciner, C6 meal to the kiln inlet */}
      {[1, 2, 3, 4].map((n) => {
        const g = STAGES[n - 1];
        return <MealLine key={n} pts={[[g.cx, stageDims(g).yOut], [g.cx, T(n + 2) - 5]]} />;
      })}
      <MealLine pts={[[RX, stageDims(STAGES[4]).yOut], [RX, 362]]} />
      <MealLine pts={[[LX, stageDims(STAGES[5]).yOut], [LX, GROUND - 1]]} />
      {/* kiln gas up the riser */}
      <FlowArrow x1={377.5} y1={412.5} x2={377.5} y2={377.5} color={MX.gas} w={1.4} s={4.5} />
      <Caps x={76} y={90}>RAW MEAL FROM ELEVATOR</Caps>
      <Caps x={492} y={52} anchor="end">
        TO ID FAN
      </Caps>
      <Caps x={384} y={410} color={MX.gas}>
        KILN GAS FROM RISER
      </Caps>
      <Caps x={158} y={433} anchor="middle">
        C6 MEAL TO KILN INLET
      </Caps>
    </g>
  );
}

/** Pad centre per point, at the group-image pads: gas temperature on each stage's outlet, draft on its cylinder wall. */
const pads: LineSheetArt["pads"] = {
  "TMP-PHC-01": [293, 40],
  "PRS-PHC-01": [322.7, 63],
  "TMP-PHC-02": [195.3, 102.2],
  "PRS-PHC-02": [165.7, 125.2],
  "TMP-PHC-03": [293, 164.2],
  "PRS-PHC-03": [322.7, 187.2],
  "TMP-PHC-04": [195.5, 226.2],
  "PRS-PHC-04": [165.7, 249.2],
  "TMP-PHC-05": [293, 288.5],
  "PRS-PHC-05": [322.7, 311.5],
  "TMP-PHC-06": [195.5, 350.5],
  "PRS-PHC-06": [165.7, 373.8],
};

/** Gas temperatures run along their outlet duct, drafts away from the tower. */
const callouts: LineSheetArt["callouts"] = {
  "TMP-PHC-01": [266, 18.2, "start"],
  "PRS-PHC-01": [339.5, 63.8, "start"],
  "TMP-PHC-02": [205, 81.5, "start"],
  "PRS-PHC-02": [148.5, 124.8, "end"],
  "TMP-PHC-03": [266, 142.5, "start"],
  "PRS-PHC-03": [347, 188, "start"],
  "TMP-PHC-04": [205, 205.8, "start"],
  "PRS-PHC-04": [148.5, 249, "end"],
  "TMP-PHC-05": [266, 266.8, "start"],
  "PRS-PHC-05": [347, 312.5, "start"],
  "TMP-PHC-06": [205, 330, "start"],
  "PRS-PHC-06": [148.5, 373.2, "end"],
};

export const sheet: LineSheetArt = { id: "P-1", ready: true, width: W, height: H, Art: TowerArt, pads, callouts };
