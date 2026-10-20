/**
 * Sheet B-4 — BRN-01 · Main burner — Coal conveying blower and line.
 *
 * Panel "COAL CONVEYING BLOWER AND LINE" of group image 4B (page 11, panel
 * box 842.5 105.5 – 1605.5 777.5): the Roots blower (casing with its two
 * lobed rotors) and the blower motor coupled on one base frame; the
 * conveying line rising from the blower and running right to the burner, the
 * kiln coal feeder dropping coal into it, and the line pressure transmitter.
 */
import React from "react";
import { CornerBolts, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Pipe } from "../../drawings/clk-parts";
import type { LineSheetArt } from "../types";
import { BaseRail, EndArrow, Flow, Head, RibCoupling, SideMotor, Stool } from "./parts-b2";

const W = 763;
const H = 672;
const GROUND = 594;

const BLOWER = { x: 118, y: 405, w: 176, h: 155 };
const ROTORS: Array<[number, number]> = [
  [179, 482.5],
  [240, 482.5],
];
const LINE_X = 206;
const LINE_Y = 229.5;
const EDGE = 726;
const DROP_X = 429;
const SHAFT_Y = 482.5;

/** Two-lobe rotor seen end-on, as the lens shape of the group image. */
function Lobe({ cx, cy }: { cx: number; cy: number }) {
  return <path d={`M ${cx - 26} ${cy} Q ${cx} ${cy - 22} ${cx + 26} ${cy} Q ${cx} ${cy + 22} ${cx - 26} ${cy} Z`} {...PAINT.raised} />;
}

function LineAndFeeder() {
  return (
    <g>
      {/* conveying line: blower outlet → riser → to burner */}
      <Pipe pts={[[LINE_X, BLOWER.y + 2], [LINE_X, LINE_Y], [EDGE, LINE_Y]]} w={20} />
      {[300, 660].map((fx) => (
        <rect key={fx} x={fx - 2.5} y={LINE_Y - 14} width={5} height={28} rx={1.5} {...PAINT.raised} />
      ))}
      <rect x={LINE_X - 14} y={330} width={28} height={5} rx={1.5} {...PAINT.raised} />
      {/* kiln coal feeder and its drop into the line */}
      <rect x={DROP_X - 2.5} y={195} width={5} height={26} {...PAINT.shaft} />
      <rect x={388.5} y={141.5} width={81} height={54} rx={6} {...PAINT.body} />
      <rect x={395} y={148} width={68} height={41} rx={4} fill="none" stroke={MX.fine} strokeWidth={0.8} />
      {/* line pressure transmitter on its impulse stem */}
      <rect x={589.5} y={203} width={3} height={18} {...PAINT.shaft} />
      <rect x={581} y={187.5} width={19.5} height={16} rx={3} {...PAINT.body} />
      {/* coal + conveying air */}
      <Flow pts={[[LINE_X, BLOWER.y], [LINE_X, LINE_Y], [EDGE, LINE_Y]]} color={MX.material} w={2} />
      <Flow pts={[[DROP_X, 196], [DROP_X, LINE_Y]]} color={MX.material} w={2} />
      <Head x={LINE_X} y={300} dir="up" color={MX.material} />
      <Head x={DROP_X} y={226} dir="down" color={MX.material} s={0.8} />
      <Head x={520} y={LINE_Y} dir="right" color={MX.material} />
      <EndArrow x1={729} x2={751} y={LINE_Y} />
    </g>
  );
}

function BlowerSet() {
  const { x, y, w, h } = BLOWER;
  return (
    <g>
      {/* Roots blower casing with its rotors */}
      <rect x={x} y={y} width={w} height={h} rx={10} {...PAINT.body} />
      <CornerBolts x={x} y={y} w={w} h={h} inset={9} r={1.6} />
      {ROTORS.map(([cx, cy]) => (
        <circle key={cx} cx={cx} cy={cy} r={42.5} fill="none" stroke={MX.edge} strokeWidth={MX.w} />
      ))}
      {ROTORS.map(([cx, cy]) => (
        <Lobe key={cx} cx={cx} cy={cy} />
      ))}
      {/* shaft, coupling, motor */}
      <rect x={x + w} y={SHAFT_Y - 6.5} width={70} height={13} {...PAINT.shaft} />
      <RibCoupling x={327.5} y={469} w={27.5} h={27} />
      <Stool x={392} y={539} w={100} h={22} />
      <SideMotor
        x={361}
        y={431.5}
        w={159}
        h={102.5}
        tbox={[409, 410, 63.5, 24]}
        cowl={[516, 442, 40, 80.5]}
        win={[414, 471, 53.5, 26.5]}
        fins={[446.5, 461, 475.5, 490, 504.5, 519]}
        foot={[377.5, 532, 126.5, 7]}
      />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={30} x2={733} y={GROUND} />
      <BaseRail x={91} y={561} w={473} h={15.5} />
      <LineAndFeeder />
      <BlowerSet />

      <MachineLabel x={428.5} y={135} size={8.5}>
        FROM KILN COAL FEEDER
      </MachineLabel>
      <MachineLabel x={570} y={212} anchor="start" size={8}>
        COAL + CONVEYING AIR
      </MachineLabel>
      <MachineLabel x={745} y={257} anchor="end" size={8.5}>
        TO BURNER
      </MachineLabel>
      <MachineLabel x={206} y={588} size={8.5}>
        ROOTS BLOWER
      </MachineLabel>
      <MachineLabel x={455.5} y={588} size={8.5}>
        BLOWER MOTOR
      </MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on group image 4B, right panel. */
const pads: LineSheetArt["pads"] = {
  "PRS-BRN-04": [590.7, 179.3],
  "VIB-BRN-02": [212.7, 418.5],
  "ELE-BRN-02": [455.7, 418.5],
  "TMP-BRN-06": [472, 504.7],
};

/** Plate side per point (start = plate right of the pad, end = left); stand-off slot if both sides collide. */
const callouts: LineSheetArt["callouts"] = {
  "PRS-BRN-04": [598, 153, "start"],
  "VIB-BRN-02": [220, 386, "start"],
  "ELE-BRN-02": [463, 390, "start"],
  "TMP-BRN-06": [529, 514.5, "start"],
};

export const sheet: LineSheetArt = { id: "B-4", ready: true, width: W, height: H, Art, pads, callouts };
