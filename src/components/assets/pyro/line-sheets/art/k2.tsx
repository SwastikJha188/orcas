/**
 * Sheet K-2 — KLN-01 · Rotary kiln — Gear train: motor, gearbox, pinion and girth gear.
 *
 * Composition of PDF page 15, left to right on their concrete piers: the VFD
 * main motor (NDE encoder, fan cowl, finned frame, terminal box, winding RTD
 * box), coupling, the main gearbox, the output coupling and the pinion shaft
 * between its two bearings, meshing with the girth gear on the kiln shell.
 */
import React from "react";
import { Bolt, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { EncoderCap } from "../../sheets/sa-parts";
import { GearEdge, Pillow, Shell, ShaftCoupling, SideMotor, ToothedDrum } from "../../sheets/sb-parts";
import type { LineSheetArt } from "../types";
import { Bedplate, GearboxSide, Pier } from "./parts-ka";

const W = 824;
const H = 704;
const GROUND = 585;

function MainMotor() {
  return (
    <g>
      <Pier x={45} y={410} w={218} h={GROUND - 410} bolts={3} />
      <Bedplate x={31} y={400} w={247} />
      {/* feet */}
      <rect x={100} y={388} width={152} height={12} rx={2} {...PAINT.body} />
      <Bolt x={110} y={394} r={1.5} />
      <Bolt x={242} y={394} r={1.5} />
      {/* NDE speed encoder on the shaft extension */}
      <rect x={42} y={334} width={8} height={8} {...PAINT.shaft} />
      <EncoderCap x={28} cy={338} w={16} h={34} />
      <SideMotor x={88} y={285} w={168} h={106} />
      {/* winding RTD terminal box */}
      <rect x={144} y={325} width={64} height={28} rx={3} {...PAINT.raised} />
      <rect x={149} y={330} width={54} height={18} rx={2} {...PAINT.recess} />
      {/* power cable gland on the terminal box */}
      <rect x={193} y={270} width={9} height={8} rx={1.5} {...PAINT.shaft} />
      {/* lifting eyes */}
      <circle cx={110} cy={281} r={4} fill="none" stroke={MX.edge} strokeWidth={1.6} />
      <circle cx={232} cy={281} r={4} fill="none" stroke={MX.edge} strokeWidth={1.6} />
      {/* shaft and input coupling */}
      <rect x={276} y={332} width={42} height={12} rx={2} {...PAINT.shaft} />
      <ShaftCoupling x={286} y={324} w={28} h={28} />
    </g>
  );
}

function MainGearbox() {
  return (
    <g>
      <Pier x={316} y={410} w={164} h={GROUND - 410} bolts={2} />
      <Bedplate x={308} y={400} w={180} />
      <rect x={326} y={388} width={144} height={12} rx={2} {...PAINT.body} />
      <GearboxSide x={316} y={248} w={164} h={142} ig={[44, 78, 26]} og={[102, 60, 43]} />
    </g>
  );
}

function PinionAndGirth() {
  return (
    <g>
      {/* kiln shell and girth gear on its spring plates (edge-on) */}
      <Shell x={541} y={76} w={290} h={164} seam={36} />
      {[90, 120, 196, 226].map((y) => (
        <rect key={y} x={622} y={y} width={47} height={6} rx={1.5} {...PAINT.raised} />
      ))}
      <rect x={627} y={70} width={37} height={176} rx={3} {...PAINT.body} />
      <GearEdge x={631} y={50} w={29} h={216} n={36} />
      {/* output shaft and coupling */}
      <rect x={480} y={297} width={76} height={13} rx={2} {...PAINT.shaft} />
      <ShaftCoupling x={502} y={291} w={29} h={25} />
      {/* pinion between its bearings */}
      <Pier x={556} y={348} w={180} h={GROUND - 348} bolts={3} />
      <Bedplate x={548} y={338} w={195} />
      <rect x={596} y={296} width={154} height={15} rx={2} {...PAINT.shaft} />
      <rect x={744} y={299} width={8} height={9} rx={1.5} {...PAINT.raised} />
      <ToothedDrum x={615} y={277} w={60} h={52} n={11} />
      <Pillow x={556} y={270} w={44} h={68} />
      <Pillow x={691} y={270} w={44} h={68} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={22} x2={803} y={GROUND} />
      <PinionAndGirth />
      <MainGearbox />
      <MainMotor />

      <MachineLabel x={644.5} y={21.2} size={9}>GIRTH GEAR</MachineLabel>
      <MachineLabel x={749.5} y={66.2} size={9}>KILN SHELL</MachineLabel>
      <MachineLabel x={296} y={366} size={6.2}>COUPLING</MachineLabel>
      <MachineLabel x={516} y={284} size={7.5}>COUPLING</MachineLabel>
      <MachineLabel x={756} y={284} anchor="start" size={8.2}>PINION</MachineLabel>
      <MachineLabel x={149.5} y={606.2} size={9}>MAIN MOTOR (VFD)</MachineLabel>
      <MachineLabel x={397} y={606.2} size={9}>MAIN GEARBOX</MachineLabel>
      <MachineLabel x={645} y={606.2} size={9}>PINION SHAFT, BEARINGS AND PINION</MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 15. */
const pads: LineSheetArt["pads"] = {
  "TMP-KLN-20": [68, 315.5],
  "SPD-KLN-01": [38.5, 338],
  "TMP-KLN-21": [173, 339.5],
  "ELE-KLN-01": [176, 268],
  "VIB-KLN-01": [259, 303.5],
  "TMP-KLN-19": [259, 371],
  "VIB-KLN-02": [330.5, 263],
  "TMP-KLN-22": [330.5, 375.5],
  "VIB-KLN-03": [465.5, 263],
  "TMP-KLN-23": [465.5, 375.5],
  "VIB-KLN-04": [578, 288.5],
};

/** Tag chip centre per point, as on PDF page 15. */
const chips: NonNullable<LineSheetArt["chips"]> = {
  "TMP-KLN-20": [108.5, 188],
  "SPD-KLN-01": [79.5, 420.5],
  "TMP-KLN-21": [221, 459.5],
  "ELE-KLN-01": [224, 156],
  "VIB-KLN-01": [322.5, 221],
  "TMP-KLN-19": [307.5, 465.5],
  "VIB-KLN-02": [393.5, 158],
  "TMP-KLN-22": [401, 485],
  "VIB-KLN-03": [394.5, 120.5],
  "TMP-KLN-23": [543.5, 515],
  "VIB-KLN-04": [618.5, 176],
};

export const sheet: LineSheetArt = { id: "K-2", ready: true, width: W, height: H, Art, pads, chips };
