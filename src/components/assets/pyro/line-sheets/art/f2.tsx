/**
 * Sheet F-2 — FSL-01 · Feed silo — Aeration blowers, header and purge sequence.
 *
 * Panel "AERATION BLOWERS, HEADER AND PURGE SEQUENCE" of the machine group
 * images, page 1 (panel box 574, 91.5 → 1080, 540 in page units): the PLC
 * control cabinet (duty / standby display, purge-step lamp), the blower motor
 * coupled to the aeration blower (duty / standby pair, one drawn) on a common
 * skid, the riser to the aeration header with its pressure transmitter and the
 * six drops to the silo air slides 1 – 6.
 *
 * Units: page units of the group-image page minus the panel origin.
 */
import React from "react";
import { Bolt, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Cabinet, Pipe } from "../../drawings/fkp-parts";
import type { LineSheetArt } from "../types";
import { ScrollFan, SideMotor } from "./parts-f2";

const W = 506;
const H = 448.5;
const GROUND = 397.5;

function CabinetPlc() {
  return (
    <g>
      <rect x={36} y={390} width={83} height={6.5} rx={1.5} {...PAINT.raised} />
      <Cabinet x={40} y={258} w={75.5} h={132} />
      {/* purge-step lamp */}
      <circle cx={77.8} cy={333.3} r={6} {...PAINT.raised} />
      <MachineLabel x={78} y={247} size={5.4}>
        CONTROL CABINET (PLC)
      </MachineLabel>
      {/* control cable to the blower motor */}
      <line x1={115.5} y1={342.5} x2={140} y2={342.5} stroke={MX.edge} strokeWidth={1.3} />
    </g>
  );
}

function MotorAndBlower() {
  return (
    <g>
      {/* common skid */}
      <rect x={137.5} y={386} width={284} height={10.5} rx={2} {...PAINT.body} />
      {[146, 280, 414].map((x) => (
        <Bolt key={x} x={x} y={391.2} r={1.2} />
      ))}
      <SideMotor x={165} y={306} w={119} h={75} shaft="r" />
      {/* coupling */}
      <rect x={294} y={334.5} width={17} height={16} rx={3} {...PAINT.body} />
      {[299, 303, 307].map((x) => (
        <line key={x} x1={x} x2={x} y1={337} y2={348} {...PAINT.hair} />
      ))}
      <rect x={311} y={340} width={8} height={5} {...PAINT.shaft} />
      {/* blower: scroll with the outlet rising on the left, pedestal */}
      <ScrollFan cx={363.5} cy={342} r={47} outTop={280} outW={49} />
      <path d="M 336 359 H 391 L 400 395 H 327 Z" {...PAINT.raised} />
      <Bolt x={333} y={390} r={1.2} />
      <Bolt x={394} y={390} r={1.2} />
      <MachineLabel x={213} y={415.5} size={5.4}>
        BLOWER MOTOR
      </MachineLabel>
      <MachineLabel x={364} y={415.5} size={5.4}>
        AERATION BLOWER (DUTY / STANDBY)
      </MachineLabel>
    </g>
  );
}

function Header() {
  const drops = [369, 388.5, 408, 428, 447.5, 467];
  return (
    <g>
      {/* riser and header */}
      <Pipe
        pts={[
          [339, 283],
          [339, 155],
          [482, 155],
        ]}
        d={12}
        flanges={[[339, 220]]}
      />
      {/* six drops to the silo air slides */}
      {drops.map((x, i) => (
        <g key={x}>
          <rect x={x - 2.5} y={161} width={5} height={44} rx={1} {...PAINT.cylinderV} />
          <MachineLabel x={x} y={215} size={4.8}>
            {String(i + 1)}
          </MachineLabel>
        </g>
      ))}
      {/* header pressure transmitter */}
      <rect x={349} y={137} width={3.5} height={12} {...PAINT.shaft} />
      <rect x={344} y={127} width={13.5} height={12} rx={3} {...PAINT.body} />
      <MachineLabel x={408} y={142.5} size={5.4}>
        AERATION HEADER
      </MachineLabel>
      <MachineLabel x={418} y={229.5} size={5.4}>
        TO SILO AIR SLIDES 1 – 6
      </MachineLabel>
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={22.5} x2={482.5} y={GROUND} />
      <Header />
      <MotorAndBlower />
      <CabinetPlc />
    </g>
  );
}

/** Pad centre per point: PDF pad centres (duty / standby a little higher on the display so its plate clears the motor terminal box). */
const pads: LineSheetArt["pads"] = {
  "STS-FSL-02": [77.8, 276],
  "STS-FSL-03": [77.8, 333.3],
  "ELE-FSL-01": [224.5, 300],
  "TMP-FSL-01": [248, 360.7],
  "PRS-FSL-01": [350.5, 127.3],
};

/** Plates run right along the cabinet door and the motor; the header pressure runs left above the riser. */
const callouts: LineSheetArt["callouts"] = {
  "STS-FSL-02": [95, 276, "start"],
  "STS-FSL-03": [95, 333.3, "start"],
  "ELE-FSL-01": [240, 300, "start"],
  "TMP-FSL-01": [265, 360.7, "start"],
  "PRS-FSL-01": [335, 127.3, "end"],
};

export const sheet: LineSheetArt = { id: "F-2", ready: true, width: W, height: H, Art, pads, callouts };
