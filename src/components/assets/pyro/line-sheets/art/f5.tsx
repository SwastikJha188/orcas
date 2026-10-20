/**
 * Sheet F-5 — KFS-01 · Kiln feed — Bin discharge: blower, air slides A / B and gates A / B.
 *
 * Panel "BIN DISCHARGE: BLOWER, AIR SLIDES A / B AND GATES A / B" of the
 * machine group images, page 2 (panel box 842.5, 105.5 → 1605.5, 777.5 in
 * page units): the kiln feed bin in plan with its outlet, discharge gates A
 * and B at the heads of air slides A and B down to SFM A / SFM B, the
 * air-slide air connection at the bin bottom with the P1 transmitter, the air
 * line from the single air-slide blower (motor + volute on a skid) and the
 * blower starter cabinet.
 *
 * Units: page units of the group-image page minus the panel origin.
 */
import React from "react";
import { Bolt, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Cabinet, Pipe } from "../../drawings/fkp-parts";
import type { LineSheetArt } from "../types";
import { MealDashes, ScrollFan, SideMotor } from "./parts-f2";

const W = 763;
const H = 672;
const GROUND = 621.5;

/** Gate + air slide + flow meter of one discharge line; `x` = slide centre line. */
function DischargeLine({ x, name }: { x: number; name: string }) {
  return (
    <g>
      <rect x={x - 13.75} y={194.5} width={27.5} height={169.5} rx={2} {...PAINT.body} />
      <MealDashes x1={x} y1={203} x2={x} y2={356} />
      {/* discharge gate (limit switches) at the slide head */}
      <rect x={x - 18} y={169.5} width={36} height={25} rx={3} {...PAINT.raised} />
      <rect x={x - 13} y={174} width={26} height={16} rx={2} fill="none" stroke={MX.fine} strokeWidth={1} />
      {/* solid-flow meter at the slide foot */}
      <rect x={x - 40.5} y={364} width={81} height={61.5} rx={5} {...PAINT.body} />
      <MachineLabel x={x} y={399} size={7.5}>
        {name}
      </MachineLabel>
    </g>
  );
}

function BinPlan() {
  return (
    <g>
      <MachineLabel x={381} y={69} size={7.5}>
        KILN FEED BIN (PLAN)
      </MachineLabel>
      <circle cx={381} cy={181} r={94} {...PAINT.body} />
      <circle cx={381} cy={181} r={41} {...PAINT.recess} />
      <MachineLabel x={381} y={186} size={6}>
        BIN OUTLET
      </MachineLabel>
      {/* air-slide air header across the bin bottom, P1 transmitter */}
      <rect x={294} y={305.5} width={175} height={9.5} rx={1.5} {...PAINT.cylinder} />
      <rect x={388.5} y={289} width={26.5} height={21} rx={3} {...PAINT.body} />
      <DischargeLine x={280.3} name="SFM A" />
      <DischargeLine x={482.7} name="SFM B" />
      <MachineLabel x={227.5} y={249} size={7.5}>
        AIR SLIDE A
      </MachineLabel>
      <MachineLabel x={534} y={249} size={7.5}>
        AIR SLIDE B
      </MachineLabel>
      <MachineLabel x={442.5} y={331} anchor="start" size={7}>
        P1 · BIN BOTTOM
      </MachineLabel>
    </g>
  );
}

function Blower() {
  return (
    <g>
      {/* air line: blower outlet up and across to the bin-bottom header */}
      <Pipe
        pts={[
          [381.5, 315],
          [381.5, 465],
          [156, 465],
          [156, 474],
        ]}
        d={9}
      />
      <rect x={104} y={560} width={285} height={10} rx={2} {...PAINT.body} />
      {[112, 246, 381].map((x) => (
        <Bolt key={x} x={x} y={565} r={1.3} />
      ))}
      <ScrollFan cx={166} cy={520} r={40} outTop={472} outW={38} />
      <SideMotor x={213.5} y={504} w={112.5} h={46} shaft="l" box={0.6} />
      <MachineLabel x={219} y={594} size={7.5}>
        AIR-SLIDE BLOWER (ONE BLOWER SERVES A AND B)
      </MachineLabel>
      {/* blower starter */}
      <rect x={585} y={587.5} width={92.5} height={7.5} rx={1.5} {...PAINT.raised} />
      <Cabinet x={590} y={472} w={82.5} h={115.5} />
      <MachineLabel x={631} y={608} size={7.5}>
        BLOWER STARTER
      </MachineLabel>
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={30} x2={733.5} y={GROUND} />
      <BinPlan />
      <Blower />
    </g>
  );
}

/** Pad centre per point: PDF pad centres. */
const pads: LineSheetArt["pads"] = {
  "POS-KFS-01": [280.3, 182],
  "POS-KFS-02": [482.7, 182],
  "PRS-KFS-01": [401.7, 299.5],
  "STS-KFS-01": [631.3, 499.3],
  "ELE-KFS-02": [280.3, 499.5],
};

/** Gates run outward, P1 along the air header, blower current along the motor, starter status back over the cabinet. */
const callouts: LineSheetArt["callouts"] = {
  "POS-KFS-01": [265, 182, "end"],
  "POS-KFS-02": [498, 182, "start"],
  "PRS-KFS-01": [416, 299.5, "start"],
  "STS-KFS-01": [615, 499.3, "end"],
  "ELE-KFS-02": [295, 499.5, "start"],
};

export const sheet: LineSheetArt = { id: "F-5", ready: true, width: W, height: H, Art, pads, callouts };
