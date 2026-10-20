/**
 * Sheet K-3 — KLN-01 · Rotary kiln — Auxiliary drive and brake.
 *
 * Drawn as the "AUXILIARY DRIVE AND BRAKE" panel of the machine-group images
 * (page 8, panel box 842.5, 105.5 – 1605.5, 777): the main gearbox on its
 * bedplate, the overrunning clutch on the input shaft, the brake disc with its
 * caliper and pad-wear switch, the auxiliary reducer and auxiliary motor on a
 * steel table, and the auxiliary drive PLC / MCC cabinet with its control link.
 */
import React from "react";
import { GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import type { LineSheetArt } from "../types";
import { Bedplate, Column } from "./parts-ka";
import { GearboxFace, ShaftRun, TefcSide } from "./parts-k3";

const W = 763;
const H = 671.5;
const GROUND = 566.5;
const SHAFT_Y = 330;

function MainGearbox() {
  return (
    <g>
      <Bedplate x={57.5} y={385.5} w={162.5} h={10} bolts={4} />
      <GearboxFace box={[64, 249, 149, 129]} cover={[79, 198, 8]} small={[104.5, 320, 23.5, 7.5]} big={[156.5, 303, 39, 12]} screws />
    </g>
  );
}

function ClutchAndBrake() {
  return (
    <g>
      <ShaftRun x1={213} x2={420} cy={SHAFT_Y} d={12} />
      {/* overrunning clutch */}
      <rect x={260} y={308.5} width={47.5} height={44} rx={5} {...PAINT.raised} />
      <rect x={260} y={308.5} width={47.5} height={44} rx={5} fill={MX.material} opacity={0.22} stroke="none" />
      <line x1={283.75} x2={283.75} y1={311} y2={350} {...PAINT.hair} />
      {/* brake disc */}
      <circle cx={354.5} cy={SHAFT_Y} r={42.5} {...PAINT.cylinderV} />
      <circle cx={354.5} cy={SHAFT_Y} r={34} {...PAINT.hair} opacity={0.5} />
      <circle cx={354.5} cy={SHAFT_Y} r={10} fill={MX.deep} stroke={MX.edge} strokeWidth={MX.w} />
      {/* caliper on the disc rim with the pad-wear switch */}
      <rect x={334} y={277.5} width={41} height={28.5} rx={3} {...PAINT.body} />
      <rect x={342.5} y={285} width={25} height={13.5} rx={2} {...PAINT.raised} />
    </g>
  );
}

function AuxDrive() {
  return (
    <g>
      {/* steel table */}
      <Column x={408.75} y1={386} y2={GROUND} w={13.5} />
      <Column x={672} y1={386} y2={GROUND} w={14} />
      <rect x={388} y={377.5} width={304} height={8.5} rx={2} {...PAINT.raised} />
      {/* auxiliary reducer and coupling shaft to the motor */}
      <ShaftRun x1={490} x2={515} cy={SHAFT_Y} d={12} />
      <rect x={415.5} y={299} width={81.5} height={62.5} rx={6} {...PAINT.body} />
      <rect x={421} y={304.5} width={70.5} height={51.5} rx={4} {...PAINT.hair} opacity={0.5} />
      {/* auxiliary motor, fan cowl at the right-hand NDE end */}
      <TefcSide
        body={[509.5, 291, 148.5, 80]}
        cowl={[653, 299, 38, 63]}
        tb={[554, 274, 59, 17]}
        win={[558, 321, 51, 20.5]}
        feet={[524, 369, 119, 8.5]}
        fins={[302, 313, 324, 335, 346.5, 358]}
      />
      {/* auxiliary drive PLC / MCC cabinet on its stand, control link down to the motor */}
      <path d={`M 655.5 251 V 290`} fill="none" stroke={MX.label} strokeWidth={1.2} strokeDasharray="4 3" opacity={0.8} />
      <rect x={598.5} y={242.5} width={113} height={8.5} rx={2} {...PAINT.raised} />
      <rect x={604} y={107.5} width={102} height={135} rx={5} {...PAINT.body} />
      <rect x={608.5} y={112} width={93} height={126} rx={3} {...PAINT.hair} />
      <rect x={624.5} y={126.5} width={61} height={16} rx={2} fill={MX.deep} stroke={MX.edge} strokeWidth={MX.w} />
      <rect x={690.5} y={164} width={5} height={17} rx={2} fill={MX.edge} />
      {[191, 201.5, 212.5].map((y) => (
        <line key={y} x1={629.5} x2={680.5} y1={y} y2={y} stroke={MX.fine} strokeWidth={1} />
      ))}
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={30} x2={733} y={GROUND} />
      <MainGearbox />
      <ClutchAndBrake />
      <AuxDrive />

      <MachineLabel x={655} y={94.2} size={8.2}>AUX DRIVE PLC / MCC</MachineLabel>
      <MachineLabel x={138.5} y={418.5} size={8.6}>MAIN GEARBOX</MachineLabel>
      <MachineLabel x={283.5} y={418.5} size={8.6}>OVERRUNNING CLUTCH</MachineLabel>
      <MachineLabel x={327.5} y={472.5} size={8.6}>BRAKE DISC AND CALIPER</MachineLabel>
      <MachineLabel x={469} y={418.5} size={8.6}>AUX REDUCER</MachineLabel>
      <MachineLabel x={597.5} y={438.5} size={8.6}>AUXILIARY MOTOR</MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units = page units − panel corner), at the panel's pads. */
const pads: LineSheetArt["pads"] = {
  "STS-KLN-11": [655, 133],
  "LIM-KLN-01": [354.5, 292],
};

/** Plate side per point: status along the cabinet display, brake-pad wear along the caliper. */
const callouts: LineSheetArt["callouts"] = {
  "STS-KLN-11": [645, 133, "end"],
  "LIM-KLN-01": [364.5, 292, "start"],
};

export const sheet: LineSheetArt = { id: "K-3", ready: true, width: W, height: H, Art, pads, callouts };
