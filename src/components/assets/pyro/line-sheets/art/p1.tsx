/**
 * Sheet P-1 — PHC-01 · Preheater — Cyclone stages: gas temperature and draft.
 *
 * Composition of PDF page 9: six stage cyclones in two staggered columns on a
 * two-column steel tower (C1, C3, C5 right; C2, C4, C6 left). Gas rises from
 * the kiln riser into C6 and up stage by stage through the cross-over ducts to
 * C1 and out to the ID fan; meal drops from each cyclone (flap valve) into the
 * duct feeding the stage below; raw meal enters the C2 → C1 duct, C6 meal
 * leaves for the kiln inlet.
 */
import React from "react";
import { GroundLine, MX, MachineLabel } from "@/components/assets/machine-kit/machine-kit";
import { Handrail, Ladder, MealPipe, Pipe } from "../../drawings/fkp-parts";
import type { LineSheetArt } from "../types";
import { Arrow, BasePlate, Beam, Bellows, FlapValve, Gusset, StageCyclone, type StageGeom, stageDims } from "./parts-p";

const W = 824;
const H = 704;
const GROUND = 676;

const LX = 315.5; // left column cyclones (C2, C4, C6)
const RX = 480.5; // right column cyclones (C1, C3, C5)
const COLS = [248, 554]; // tower columns (centre)
const DD = 17; // stage duct diameter
const LANE_R = 406; // up-leg of ducts from left-column stages
const LANE_L = 390; // up-leg of ducts from right-column stages

const STAGES: StageGeom[] = [0, 1, 2, 3, 4, 5].map((i) => ({ cx: i % 2 ? LX : RX, top: 34.5 + i * 105, inlet: i % 2 ? 1 : -1 }));

/** Gas duct from stage i (1-based C number) up into stage i - 1. */
function stageDuct(i: number): [number, number][] {
  const a = STAGES[i - 1];
  const b = STAGES[i - 2];
  const w = stageDims(b).w;
  const lane = a.cx === LX ? LANE_R : LANE_L;
  const inX = b.inlet > 0 ? b.cx + w / 2 + 6 : b.cx - w / 2 - 6;
  return [
    [a.cx, a.top - 2],
    [a.cx, a.top - 12],
    [lane, a.top - 12],
    [lane, b.top + 22.5],
    [inX, b.top + 22.5],
  ];
}

const floorY = (g: StageGeom) => stageDims(g).yJ + 6;

function Tower() {
  const floors = STAGES.map(floorY).sort((a, b) => a - b);
  return (
    <g>
      {COLS.map((x, i) => (
        <g key={x}>
          <rect x={x - 4} y={i ? 30 : 16} width={8} height={GROUND - (i ? 30 : 16)} rx={1.5} fill={MX.body} stroke={MX.edge} strokeWidth={MX.w} />
          <line x1={x} x2={x} y1={(i ? 30 : 16) + 3} y2={GROUND - 8} stroke={MX.fine} strokeWidth={0.8} />
          <BasePlate x={x} y={GROUND} />
        </g>
      ))}
      {floors.map((y) => (
        <g key={y}>
          <Handrail x1={COLS[0] + 6} x2={COLS[1] - 6} y={y} h={11} step={18.5} />
          <Beam x1={COLS[0] + 4} x2={COLS[1] - 4} y={y} />
          <Gusset x={COLS[0] + 4} y={y + 6} s={1} />
          <Gusset x={COLS[1] - 4} y={y + 6} s={-1} />
        </g>
      ))}
      {/* access ladder up the right-hand column */}
      <Ladder x={COLS[1] + 5} y1={floors[0]} y2={GROUND - 6} w={9} />
    </g>
  );
}

function Ducts() {
  return (
    <g>
      {/* kiln riser → C6 */}
      <Pipe pts={[[601, GROUND + 2], [601, 583], [LX + 54.5, 583]]} d={18} flanges={[[601, 640], [520, 583], [400, 583]]} />
      <Bellows x={601} y={620} d={18} />
      {/* stage cross-over ducts C6 → C5 → … → C1 */}
      {[6, 5, 4, 3, 2].map((i) => {
        const p = stageDuct(i);
        const midY = (p[2][1] + p[3][1]) / 2;
        return (
          <g key={i}>
            <Pipe pts={p} d={DD} flanges={[[p[2][0], p[3][1] + 22]]} />
            <Bellows x={p[2][0]} y={midY + 6} d={DD} />
          </g>
        );
      })}
      {/* C1 gas outlet → ID fan */}
      <Pipe pts={[[RX, 33], [RX, 19], [796, 19]]} d={DD} flanges={[[600, 19], [700, 19]]} />
      <Bellows x={650} y={19} d={DD} vertical={false} />
    </g>
  );
}

function Meal() {
  const drops: [number, number, number][] = STAGES.map((g, i) => {
    const y0 = stageDims(g).yOut;
    const y1 = i === 5 ? GROUND + 2 : i === 4 ? 583 - 10 : STAGES[i + 2].top - 12 - DD / 2 - 1;
    return [g.cx, y0, y1];
  });
  return (
    <g>
      {drops.map(([x, y0, y1]) => (
        <MealPipe key={x + y0} pts={[[x, y0], [x, y1]]} d={7} />
      ))}
      {drops.map(([x, y0, y1], i) => (i >= 4 ? null : <FlapValve key={i} x={x} y={y0 + Math.min(30, (y1 - y0) * 0.32)} s={x === LX ? -1 : 1} />))}
      {/* raw meal from the bucket elevator into the C2 → C1 duct */}
      <MealPipe pts={[[113, 128], [LX - 11, 128]]} d={7} />
      <FlapValve x={278} y={128} s={1} horizontal />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={22} x2={803} y={GROUND} />
      <Tower />
      <Ducts />
      {STAGES.map((g, i) => (
        <StageCyclone key={i} g={g} label={`C${i + 1}`} />
      ))}
      <Meal />
      <Arrow x1={798} y1={19} x2={818} y2={19} />
      <Arrow x1={623} y1={660} x2={623} y2={600} />
      <MachineLabel x={724} y={46.7} size={9} anchor="start">TO ID FAN (P-3)</MachineLabel>
      <MachineLabel x={238} y={111.2} size={9} anchor="end">RAW MEAL FROM ELEVATOR</MachineLabel>
      <MachineLabel x={188} y={690.6} size={8.2} anchor="start">C6 MEAL TO KILN INLET (P-2)</MachineLabel>
      <MachineLabel x={634} y={651.6} size={8.2} anchor="start">KILN GAS FROM RISER (P-2)</MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 9. */
const pads: LineSheetArt["pads"] = {
  "TMP-PHC-01": [480.5, 29],
  "PRS-PHC-01": [530.5, 68],
  "TMP-PHC-02": [315.5, 134],
  "PRS-PHC-02": [265, 173],
  "TMP-PHC-03": [480.5, 239],
  "PRS-PHC-03": [530.5, 278],
  "TMP-PHC-04": [315.5, 344],
  "PRS-PHC-04": [265, 383],
  "TMP-PHC-05": [480.5, 449],
  "PRS-PHC-05": [530.5, 488],
  "TMP-PHC-06": [315.5, 554],
  "PRS-PHC-06": [265, 593],
};

/** Tag chip centre per point, as on PDF page 9. */
const chips: NonNullable<LineSheetArt["chips"]> = {
  "TMP-PHC-01": [603.5, 45],
  "PRS-PHC-01": [609, 81.5],
  "TMP-PHC-02": [192, 148],
  "PRS-PHC-02": [186.5, 186.5],
  "TMP-PHC-03": [603.5, 234.5],
  "PRS-PHC-03": [609, 291.5],
  "TMP-PHC-04": [192, 339.5],
  "PRS-PHC-04": [186.5, 396.5],
  "TMP-PHC-05": [603.5, 444.5],
  "PRS-PHC-05": [609, 501.5],
  "TMP-PHC-06": [192, 549.5],
  "PRS-PHC-06": [186.5, 606.5],
};

export const sheet: LineSheetArt = { id: "P-1", ready: true, width: W, height: H, Art, pads, chips };
