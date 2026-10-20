/**
 * Sheet B-2 — BRN-01 · Main burner — Primary-air fan.
 *
 * Panel "PRIMARY-AIR FAN" of group image 4A (page 10, panel box 842.5 105.5 –
 * 1605.5 777.5): the centrifugal fan (outlet box and volute, impeller with
 * four curved blades) on its pedestal, the rectangular discharge duct rising
 * from the outlet and running right to the burner primary-air header; the
 * drive-end bearing on its stand, the shaft and coupling, and the fan motor
 * (terminal box, finned frame, fan cowl); all on one base frame.
 */
import React from "react";
import { Bolt, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import type { LineSheetArt } from "../types";
import { BaseRail, EndArrow, Flow, Head, RibCoupling, SideMotor, Stool } from "./parts-b2";

const W = 763;
const H = 672;
const GROUND = 594;
const BASE = { x: 91, y: 560, w: 581, h: 16.5 };

const FAN = { cx: 233, cy: 431.5, r: 114.5 };
const DUCT = { x0: 148, x1: 203.5, y0: 80, y1: 135, end: 726, bottom: 288.5 };
const SHAFT_Y = 431.5;

function Duct() {
  const { x0, x1, y0, y1, end, bottom } = DUCT;
  const r = 25;
  return (
    <g>
      <path d={`M ${x0} ${bottom} V ${y0 + r} A ${r} ${r} 0 0 1 ${x0 + r} ${y0} H ${end} V ${y1} H ${x1} V ${bottom} Z`} {...PAINT.body} />
      {/* lit inner face of the duct */}
      <path d={`M 168 ${bottom} V 128 A 12 12 0 0 1 180 116 H ${end} V 100 H 180 A 28 28 0 0 0 152 128 V ${bottom} Z`} fill={MX.raised} opacity={0.55} />
      {/* flanged joints */}
      {[400, 640].map((fx) => (
        <rect key={fx} x={fx - 2.5} y={y0 - 4} width={5} height={y1 - y0 + 8} rx={1.5} {...PAINT.raised} />
      ))}
      <rect x={x0 - 4} y={236} width={x1 - x0 + 8} height={5} rx={1.5} {...PAINT.raised} />
      <Flow pts={[[175.75, 280], [175.75, 107.5], [end, 107.5]]} color={MX.air} w={1.6} />
      <Head x={175.75} y={200} dir="up" color={MX.air} />
      <Head x={540} y={107.5} dir="right" color={MX.air} />
      <EndArrow x1={729} x2={751} y={107.5} />
    </g>
  );
}

function FanBody() {
  const { cx, cy, r } = FAN;
  const blades = [20, 110, 200, 290];
  return (
    <g>
      {/* outlet box and volute */}
      <path d={`M 118 288.5 H 233 V ${cy - r} A ${r} ${r} 0 1 1 118 ${cy} Z`} {...PAINT.body} />
      {[
        [172.5, 360],
        [305, 371.5],
        [161, 492.5],
        [305, 492.5],
      ].map(([bx, by]) => (
        <Bolt key={`${bx}-${by}`} x={bx} y={by} r={2} />
      ))}
      {/* impeller: casing ring, inlet ring, curved blades, hub */}
      <circle cx={cx} cy={cy} r={71.5} {...PAINT.recess} />
      <circle cx={cx} cy={cy} r={71.5} fill="none" stroke={MX.edge} strokeWidth={MX.w} />
      <circle cx={cx} cy={cy} r={57.5} fill={MX.flatBody} stroke={MX.edge} strokeWidth={MX.w} />
      {blades.map((a) => (
        <path
          key={a}
          d={`M ${cx} ${cy} C ${cx + 8} ${cy - 18} ${cx + 22} ${cy - 40} ${cx + 12} ${cy - 50} C ${cx + 2} ${cy - 40} ${cx - 10} ${cy - 22} ${cx} ${cy} Z`}
          fill={MX.raised}
          stroke={MX.edge}
          strokeWidth={1}
          transform={`rotate(${a} ${cx} ${cy})`}
        />
      ))}
      <circle cx={cx} cy={cy} r={12} {...PAINT.raised} />
      <circle cx={cx} cy={cy} r={4} fill={MX.deep} />
      {/* pedestal */}
      <path d="M 185 499 H 280 L 300 560 H 166 Z" {...PAINT.body} />
    </g>
  );
}

function BearingAndDrive() {
  return (
    <g>
      {/* shaft: fan → bearing → coupling */}
      <rect x={340} y={SHAFT_Y - 6.5} width={140} height={13} {...PAINT.shaft} />
      {/* DE bearing on its stand */}
      <Stool x={380} y={476.5} w={44} h={83.5} />
      <rect x={368} y={465} width={68} height={11.5} rx={2} {...PAINT.raised} />
      <rect x={375} y={404} width={54} height={61} rx={5} {...PAINT.body} />
      <rect x={380} y={409} width={44} height={51} rx={3} fill="none" stroke={MX.fine} strokeWidth={0.8} />
      <line x1={377} x2={427} y1={SHAFT_Y} y2={SHAFT_Y} stroke={MX.fine} strokeWidth={0.8} />
      {/* coupling */}
      <RibCoupling x={442} y={417.5} w={30.5} h={28.5} />
      {/* fan motor on its stool */}
      <Stool x={500} y={492.5} w={122} h={67.5} />
      <SideMotor
        x={476}
        y={377.5}
        w={170.5}
        h={108.5}
        tbox={[527, 354, 68, 26]}
        cowl={[642, 388.5, 42, 86.5]}
        win={[532, 419, 58, 27.5]}
        fins={[393.5, 409, 424.5, 440, 455.5, 471]}
        foot={[493, 484, 136, 8.5]}
      />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={30} x2={733} y={GROUND} />
      <BaseRail {...BASE} />
      <Duct />
      <FanBody />
      <BearingAndDrive />

      <MachineLabel x={745} y={72} anchor="end" size={8.5}>
        TO BURNER PRIMARY-AIR HEADER
      </MachineLabel>
      <MachineLabel x={401.5} y={500} size={8}>
        DE BEARING
      </MachineLabel>
      <MachineLabel x={232.5} y={621.5} size={8.5}>
        PRIMARY-AIR FAN
      </MachineLabel>
      <MachineLabel x={577} y={621.5} size={8.5}>
        FAN MOTOR
      </MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on group image 4A, right panel. */
const pads: LineSheetArt["pads"] = {
  "VIB-BRN-01": [401.7, 409],
  "TMP-BRN-01": [401.7, 452.3],
  "ELE-BRN-01": [563.7, 363],
  "TMP-BRN-05": [594.7, 455.5],
};

/** Plate side per point (start = plate right of the pad, end = left); stand-off slot if both sides collide. */
const callouts: LineSheetArt["callouts"] = {
  "VIB-BRN-01": [394, 382, "end"],
  "TMP-BRN-01": [394, 520, "end"],
  "ELE-BRN-01": [571, 335, "start"],
  "TMP-BRN-05": [602, 506, "start"],
};

export const sheet: LineSheetArt = { id: "B-2", ready: true, width: W, height: H, Art, pads, callouts };
