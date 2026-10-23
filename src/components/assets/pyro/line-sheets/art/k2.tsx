/**
 * Sheet K-2 — KLN-01 · Rotary kiln — Gear train: motor, gearbox, pinion and girth gear.
 *
 * Drawn as the "GEAR TRAIN: MOTOR, GEARBOX, PINION AND GIRTH GEAR" panel of
 * the machine-group images (page 8, panel box 48.5, 105.5 – 811.5, 777): the
 * VFD main motor with its drive-health box (six stator winding RTDs, cooling
 * fan under the NDE cowl), the flexible coupling, the main
 * gearbox, the output coupling and the pinion shaft between its two bearing
 * blocks, meshing with the girth gear on the kiln shell; each on its pier.
 */
import React from "react";
import { GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import type { LineSheetArt } from "../types";
import { Bedplate, Pier } from "./parts-ka";
import { BearingBlock, GearboxFace, GroovedCoupling, ShaftRun, TefcSide } from "./parts-k3";

const W = 763;
const H = 671.5;
const GROUND = 553;
const LABEL_Y = 572.5;

function MainMotor() {
  return (
    <g>
      <Pier x={51} y={395.5} w={195.5} h={GROUND - 395.5} bolts={3} />
      <Bedplate x={37} y={385.5} w={223} h={10} bolts={5} />
      <TefcSide
        body={[82.5, 283, 171.5, 95]}
        cowl={[50, 292.5, 38, 75.5]}
        tb={[134, 261, 68.5, 22]}
        win={[139, 318.5, 58.5, 25]}
        feet={[100, 375.5, 136.5, 10]}
        fins={[297, 306.5, 316, 325.5, 335, 344.5, 354, 363.5]}
      />
      {/* DE shaft stub and the flexible coupling to the gearbox */}
      <ShaftRun x1={252} x2={296} cy={330.5} d={12} />
      <GroovedCoupling x={265} y={319.5} w={27.5} h={22.5} />
      {/* main-drive health / cooling-fan status box (drive panel flags) */}
      <rect x={63.5} y={238} width={41.5} height={20} rx={3} {...PAINT.raised} />
      <rect x={70} y={242} width={28.5} height={12} rx={2} {...PAINT.recess} />
    </g>
  );
}

function MainGearbox() {
  return (
    <g>
      <Pier x={295} y={395.5} w={147.5} h={GROUND - 395.5} bolts={2} />
      <Bedplate x={287} y={385.5} w={162} h={10} bolts={4} />
      <rect x={302} y={377} width={133} height={8.5} rx={1.5} {...PAINT.raised} />
      <GearboxFace box={[294, 249.5, 148.5, 127.5]} cover={[309, 427.5, 8.5]} small={[334, 319.5, 23.5, 7.5]} big={[385.5, 302.5, 39, 12]} />
    </g>
  );
}

function PinionAndGirth() {
  return (
    <g>
      {/* kiln shell and the girth gear on it (edge-on, teeth as ridges) */}
      <rect x={496.5} y={94} width={256.5} height={148.5} rx={7} {...PAINT.cylinder} />
      <rect x={577.5} y={71} width={27} height={195} rx={4} {...PAINT.cylinderV} />
      {Array.from({ length: 44 }).map((_, i) => {
        const ty = 76 + i * 4.3;
        return <line key={i} x1={580} x2={602} y1={ty} y2={ty} stroke={MX.edge} strokeWidth={0.7} opacity={0.75} />;
      })}

      {/* pinion pier and bedplate */}
      <Pier x={510} y={340} w={162} h={GROUND - 340} bolts={3} />
      <Bedplate x={503} y={330.5} w={176} h={9.5} bolts={4} />
      {/* gearbox output shaft, coupling, pinion shaft through both bearings */}
      <ShaftRun x1={442.5} x2={512} cy={299.5} d={10} />
      <GroovedCoupling x={461.5} y={288} w={27.5} h={22.5} />
      <ShaftRun x1={548} x2={685.5} cy={299.25} d={12.5} />
      {/* pinion */}
      <rect x={564} y={274.5} width={54} height={48} rx={4} {...PAINT.shaft} strokeWidth={MX.w} />
      {Array.from({ length: 9 }).map((_, i) => {
        const lx = 568 + i * 5.75;
        return <line key={i} x1={lx} x2={lx} y1={277} y2={320} stroke={MX.edge} strokeWidth={0.8} opacity={0.8} />;
      })}
      <BearingBlock x={510.5} y={270.5} w={40} h={61.5} split={299.5} />
      <BearingBlock x={631.5} y={269.5} w={40} h={61} split={299.5} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={30.5} x2={733.5} y={GROUND} />
      <PinionAndGirth />
      <MainGearbox />
      <MainMotor />

      <MachineLabel x={590.5} y={46.7} size={8.2}>GIRTH GEAR</MachineLabel>
      <MachineLabel x={685.5} y={87.2} size={8.2}>KILN SHELL</MachineLabel>
      <MachineLabel x={278.5} y={317} size={7.2}>COUPLING</MachineLabel>
      <MachineLabel x={475} y={283} size={7.2}>COUPLING</MachineLabel>
      <MachineLabel x={689} y={321} anchor="start" size={7.8}>PINION</MachineLabel>
      <MachineLabel x={145.5} y={LABEL_Y} size={8.6}>MAIN MOTOR (VFD)</MachineLabel>
      <MachineLabel x={367.5} y={LABEL_Y} size={8.6}>MAIN GEARBOX</MachineLabel>
      <MachineLabel x={590.5} y={LABEL_Y} size={8.6}>PINION SHAFT, BEARINGS AND PINION</MachineLabel>
    </g>
  );
}

/**
 * Pad centre per point (sheet units = page units − panel corner), at the
 * panel's pads: NDE bearing (vibration, temperature) and the cooling fan on
 * the NDE cowl, the six winding RTDs in two rows across the stator, DE points
 * on the drive end; gearbox and pinion as in the panel.
 */
const WINDING_X = [118, 150, 182];
const WINDING_Y = [312, 352];
const pads: LineSheetArt["pads"] = {
  "VIB-KLN-01": [243.3, 299.5],
  "VIB-KLN-05": [69, 303],
  "TMP-KLN-19": [243, 360],
  "TMP-KLN-20": [69, 322],
  ...Object.fromEntries([41, 42, 43, 44, 45, 46].map((n, i) => [`TMP-KLN-${n}`, [WINDING_X[i % 3], WINDING_Y[Math.floor(i / 3)]] as [number, number]])),
  "STS-KLN-14": [69, 352],
  "STS-KLN-12": [84.5, 248],
  "ELE-KLN-01": [168, 267.5],
  "SPD-KLN-01": [44.5, 330.3],
  "VIB-KLN-02": [307.3, 262.7],
  "VIB-KLN-03": [428.7, 262.7],
  "VIB-KLN-04": [530, 285.7],
  "TMP-KLN-22": [307, 364],
  "TMP-KLN-23": [428.5, 364],
};

/**
 * Plate side per point; the NDE-end plates stack above the motor, the winding RTDs and the DE bearing
 * temperature stack on the motor pier; the gearbox input-side pair (VIB-KLN-02 above, TMP-KLN-22 below)
 * stands off over / under the gearbox, as in the panel.
 */
const callouts: LineSheetArt["callouts"] = {
  "VIB-KLN-01": [253, 299.5, "start"],
  "VIB-KLN-05": [30, 150, "start"],
  "TMP-KLN-19": [148, 408, "middle"],
  "TMP-KLN-20": [30, 168, "start"],
  ...Object.fromEntries([41, 42, 43, 44, 45, 46].map((n, i) => [`TMP-KLN-${n}`, [148, 426 + i * 18, "middle"] as [number, number, "middle"]])),
  "STS-KLN-14": [30, 186, "start"],
  "STS-KLN-12": [95, 248, "start"],
  "ELE-KLN-01": [178, 267.5, "start"],
  "SPD-KLN-01": [30, 204, "start"],
  "VIB-KLN-02": [307.3, 226, "middle"],
  "VIB-KLN-03": [438, 262.7, "start"],
  "VIB-KLN-04": [540, 285.7, "start"],
  "TMP-KLN-22": [307, 420, "middle"],
  "TMP-KLN-23": [438, 364, "start"],
};

export const sheet: LineSheetArt = { id: "K-2", ready: true, width: W, height: H, Art, pads, callouts };
