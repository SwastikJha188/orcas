/**
 * Sheet F-4 — KFS-01 · Kiln feed — Kiln feed bin, load cells and bin dust collector.
 *
 * Panel "KILN FEED BIN, LOAD CELLS AND BIN DUST COLLECTOR" of the machine
 * group images, page 2 (panel box 48.5, 105.5 → 811.5, 777.5 in page units):
 * inlet hopper and chute from the silo, the bin dust collector with its fan
 * and motor, the kiln feed bin (meal window) on three load cells on the
 * support beam and legs, the bin cone down to discharge gates A / B. The bin
 * has no level sensor: inventory is the sum of the three load cells.
 *
 * Units: page units of the group-image page minus the panel origin.
 */
import React from "react";
import { Bolt, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import type { LineSheetArt } from "../types";
import { Leg } from "./parts-f";
import { FlowArrow, Instr, LoadCell, SideMotor } from "./parts-f2";

const W = 763;
const H = 672;
const GROUND = 621.5;
const CELLS = [165, 300.5, 435.5];

function Inlet() {
  return (
    <g>
      <MachineLabel x={77.5} y={74} size={8}>
        FROM SILO
      </MachineLabel>
      <path d="M 212.5 53.5 H 389 L 327.5 107.5 H 272.5 Z" {...PAINT.body} />
      <rect x={286.5} y={107.5} width={27.5} height={47.5} rx={2} {...PAINT.body} />
      <FlowArrow x1={300.5} y1={127.5} x2={300.5} y2={170} head={7} />
    </g>
  );
}

function DustCollector() {
  return (
    <g>
      <MachineLabel x={384.5} y={102} size={7.5}>
        BIN DUST COLLECTOR
      </MachineLabel>
      <rect x={347.5} y={125.5} width={75} height={47.5} rx={2.5} {...PAINT.body} />
      {[362, 408].map((x) => (
        <line key={x} x1={x} x2={x} y1={130} y2={168} stroke={MX.fine} strokeWidth={1} />
      ))}
      <rect x={347.5} y={114.5} width={75} height={11} rx={2.5} {...PAINT.raised} />
      <Instr x={385} y={148.3} w={17} h={17} />
      {/* duct, fan, motor */}
      <rect x={422.5} y={139} width={20} height={5} {...PAINT.cylinder} />
      <circle cx={462.5} cy={141.5} r={21} {...PAINT.body} />
      <circle cx={462.5} cy={141.5} r={14} fill="none" stroke={MX.fine} strokeWidth={1} />
      <SideMotor x={489} y={127.5} w={66} h={31.5} shaft="l" box={0.56} />
      <MachineLabel x={509} y={180} size={7.5}>
        DUST-COLLECTOR FAN
      </MachineLabel>
    </g>
  );
}

function Bin() {
  return (
    <g>
      {/* shell, roof flange, courses, meal window */}
      <rect x={179} y={186} width={243.5} height={147} rx={2} {...PAINT.cylinderV} />
      {[213, 244, 275, 306].map((y) => (
        <line key={y} x1={181} x2={420.5} y1={y} y2={y} stroke={MX.fine} strokeWidth={1} />
      ))}
      <rect x={215.5} y={216.5} width={170} height={77.5} rx={5} {...PAINT.recess} />
      <path d="M 219.5 253 Q 300.5 247 381.5 255 V 290 H 219.5 Z" {...PAINT.material} />
      <rect x={213} y={214} width={175} height={82.5} rx={6} fill="none" stroke={MX.edge} strokeWidth={1} />
      <MachineLabel x={300.5} y={273} size={10.5} tone="ink">
        KILN FEED BIN
      </MachineLabel>
      <rect x={173.5} y={176.5} width={254} height={9.5} rx={2} {...PAINT.raised} />
      {/* support beam on two legs, three load cells */}
      <Leg x={109} y1={359} y2={GROUND} w={5.5} />
      <Leg x={487.5} y1={359} y2={GROUND} w={5.5} />
      <path d="M 200 359 H 400 L 327.5 439 H 272.5 Z" {...PAINT.cylinderV} />
      <rect x={98.5} y={344} width={405} height={15} rx={2} {...PAINT.raised} />
      {[110, 492].map((x) => (
        <Bolt key={x} x={x} y={351.5} r={1.4} />
      ))}
      {CELLS.map((x) => (
        <LoadCell key={x} x={x} y={331} s={1.05} />
      ))}
      {/* the three load cells sum to the bin weight */}
      <line x1={165} x2={436.5} y1={364.5} y2={364.5} stroke={MX.air} strokeWidth={1.1} strokeDasharray="4 3" />
      <FlowArrow x1={300.5} y1={460} x2={300.5} y2={514} head={7} />
      <MachineLabel x={300.5} y={418} size={7.5}>
        SUPPORT BEAM · THREE LOAD CELLS
      </MachineLabel>
      <MachineLabel x={321} y={499} anchor="start" size={7.5}>
        TO DISCHARGE GATES A / B
      </MachineLabel>
      <MachineLabel x={300.5} y={643} size={7.5}>
        NO LEVEL SENSOR · INVENTORY FROM THE THREE LOAD CELLS
      </MachineLabel>
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={30} x2={733.5} y={GROUND} />
      <Inlet />
      <DustCollector />
      <Bin />
    </g>
  );
}

/** Pad centre per point: one pad per load cell on its bracket, the bin weight (sum of the cells) on the support beam beside them; bin filter inlet / outlet taps, ΔP transmitter and fan as in the PDF. */
const pads: LineSheetArt["pads"] = {
  "WGT-KFS-02": [165, 329],
  "WGT-KFS-03": [300.5, 329],
  "WGT-KFS-04": [435.5, 329],
  "WGT-KFS-01": [466, 351.5],
  "PRS-KFS-08": [347.5, 160],
  "PRS-KFS-09": [432.5, 141.5],
  "PRS-KFS-05": [385, 148.3],
  "ELE-KFS-03": [526, 123.7],
};

/** Outer load cells run outward along the beam, the centre one right, bin weight right under the beam; filter inlet and ΔP left of the chute, outlet under the fan, fan current along the motor. */
const callouts: LineSheetArt["callouts"] = {
  "WGT-KFS-02": [150, 329, "end"],
  "WGT-KFS-03": [315, 329, "start"],
  "WGT-KFS-04": [450, 329, "start"],
  "WGT-KFS-01": [470, 378, "start"],
  "PRS-KFS-08": [270, 160, "end"],
  "PRS-KFS-09": [445, 200, "start"],
  "PRS-KFS-05": [270, 128, "end"],
  "ELE-KFS-03": [540, 123.7, "start"],
};

export const sheet: LineSheetArt = { id: "F-4", ready: true, width: W, height: H, Art, pads, callouts };
