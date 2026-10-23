/**
 * Sheet F-5 — KFS-01 · Kiln feed — Bin discharge: blower, air slides A / B and gates A / B.
 *
 * Panel "BIN DISCHARGE: BLOWER, AIR SLIDES A / B AND GATES A / B" of the
 * machine group images, page 2 (panel box 842.5, 105.5 → 1605.5, 777.5 in
 * page units): the kiln feed bin in plan with its outlet, discharge gates A
 * and B at the heads of air slides A and B down to SFM A / SFM B, the
 * air-slide air header at the bin bottom (split between slides A and B, one
 * pressure transmitter each), and the air lines from the slide A blower
 * (motor + volute on a skid) and the smaller slide B blower beside it.
 *
 * Units: page units of the group-image page minus the panel origin.
 */
import React from "react";
import { Bolt, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Pipe } from "../../drawings/fkp-parts";
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
      {/* air-slide air header across the bin bottom, split between slides A and B, one transmitter each */}
      <rect x={294} y={305.5} width={175} height={9.5} rx={1.5} {...PAINT.cylinder} />
      <rect x={391.5} y={302.5} width={3} height={15.5} rx={1} {...PAINT.raised} />
      <rect x={348.75} y={289} width={26.5} height={21} rx={3} {...PAINT.body} />
      <rect x={411.75} y={289} width={26.5} height={21} rx={3} {...PAINT.body} />
      <DischargeLine x={280.3} name="SFM A" />
      <DischargeLine x={482.7} name="SFM B" />
      <MachineLabel x={227.5} y={249} size={7.5}>
        AIR SLIDE A
      </MachineLabel>
      <MachineLabel x={534} y={249} size={7.5}>
        AIR SLIDE B
      </MachineLabel>
    </g>
  );
}

function Blower() {
  return (
    <g>
      {/* air lines: blower A up into the slide A half of the header, blower B into the slide B end */}
      <Pipe
        pts={[
          [335, 315],
          [335, 465],
          [156, 465],
          [156, 474],
        ]}
        d={9}
      />
      <Pipe
        pts={[
          [586, 500],
          [586, 450],
          [540, 450],
          [540, 310.25],
          [469, 310.25],
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
        SLIDE A BLOWER
      </MachineLabel>
      {/* slide B blower on its own skid */}
      <rect x={560} y={556} width={150} height={8} rx={2} {...PAINT.body} />
      <ScrollFan cx={594} cy={528} r={26} outTop={500} outW={25} />
      <SideMotor x={629} y={516} w={72} h={30} shaft="l" box={0.6} />
      <MachineLabel x={635} y={594} size={7.5}>
        SLIDE B BLOWER
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
  "PRS-KFS-01": [362, 299.5],
  "PRS-KFS-03": [425, 299.5],
  "ELE-KFS-04": [280.3, 499.5],
  "ELE-KFS-05": [672.2, 510],
};

/** Gates run outward, slide A pressure under the header, slide B pressure right of slide B, blower currents along their motors. */
const callouts: LineSheetArt["callouts"] = {
  "POS-KFS-01": [265, 182, "end"],
  "POS-KFS-02": [498, 182, "start"],
  "PRS-KFS-01": [362, 345, "middle"],
  "PRS-KFS-03": [515, 285, "start"],
  "ELE-KFS-04": [295, 499.5, "start"],
  "ELE-KFS-05": [660, 480, "middle"],
};

export const sheet: LineSheetArt = { id: "F-5", ready: true, width: W, height: H, Art, pads, callouts };
