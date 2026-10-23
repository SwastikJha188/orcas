/**
 * Sheet F-3 — FSL-01 · Feed silo — Silo dust collector and fan.
 *
 * Panel "SILO DUST COLLECTOR AND FAN" of the machine group images, page 1
 * (panel box 1106.5, 91.5 → 1612, 540 in page units): the bag filter on the
 * silo roof (clean-gas plenum, filter bags, hopper), pulse-cleaning air line,
 * ΔP transmitter on its impulse lines between dirty and clean side, the
 * clean-gas duct to the dust-collector fan with its stack to atmosphere, and
 * the fan motor on the common base.
 *
 * Units: page units of the group-image page minus the panel origin.
 */
import React from "react";
import { GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import type { LineSheetArt } from "../types";
import { Instr, PlainArrow, ScrollFan, SideMotor } from "./parts-f2";

const W = 505.5;
const H = 448.5;
const GROUND = 413;

function Filter() {
  const bags = [131.5, 148, 164.5, 181, 197.5, 214];
  return (
    <g>
      {/* silo roof slab */}
      <rect x={35} y={360} width={435} height={17.5} rx={2} {...PAINT.cylinder} />
      <MachineLabel x={252.5} y={391} size={5.4}>
        SILO ROOF
      </MachineLabel>
      {/* pulse-cleaning air header */}
      <rect x={45} y={109} width={195} height={5} rx={1} {...PAINT.cylinder} />
      <MachineLabel x={49} y={106} anchor="start" size={5}>
        PULSE-CLEANING AIR
      </MachineLabel>
      {/* hopper, filter body with bags, clean-gas plenum */}
      <path d="M 115.5 320 H 231 L 196 359 H 150 Z" {...PAINT.cylinderV} />
      <rect x={115.5} y={173.5} width={115.5} height={147} rx={4} {...PAINT.cylinderV} />
      {bags.map((x) => (
        <line key={x} x1={x} x2={x} y1={182.5} y2={306} stroke={MX.fine} strokeWidth={1} />
      ))}
      <rect x={115.5} y={133.5} width={115.5} height={39} rx={4} {...PAINT.body} />
      <MachineLabel x={173} y={125} size={5}>
        CLEAN-GAS PLENUM
      </MachineLabel>
      <MachineLabel x={173} y={253} size={5}>
        FILTER BAGS
      </MachineLabel>
      {/* ΔP impulse lines: clean plenum and dirty side to the transmitter */}
      <path d="M 231 156 H 257 V 289 H 231" fill="none" stroke={MX.edge} strokeWidth={1.2} />
      <Instr x={261.7} y={224.5} w={26} h={22} />
    </g>
  );
}

function FanAndMotor() {
  return (
    <g>
      {/* clean-gas duct from the plenum to the fan inlet */}
      <rect x={231} y={140} width={93} height={10} rx={1} {...PAINT.cylinder} />
      {/* stack to atmosphere */}
      <rect x={348.5} y={60} width={13} height={74} rx={1} {...PAINT.cylinderV} />
      <PlainArrow x1={355} y1={58} x2={355} y2={47} head={6} />
      <MachineLabel x={364} y={54} anchor="start" size={5}>
        TO ATMOSPHERE
      </MachineLabel>
      {/* base */}
      <rect x={319} y={209} width={133.5} height={6} rx={1.5} {...PAINT.raised} />
      <ScrollFan cx={355} cy={169} r={34} outTop={126} outW={30} />
      {/* shaft into the motor */}
      <rect x={386} y={166.5} width={10} height={5} {...PAINT.shaft} />
      <SideMotor x={395} y={151} w={63} h={36} shaft="l" box={0.58} />
      <MachineLabel x={355} y={227} size={5}>
        DUST-COLLECTOR FAN
      </MachineLabel>
      <MachineLabel x={432.5} y={227} size={5}>
        FAN MOTOR
      </MachineLabel>
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={22.5} x2={482.5} y={GROUND} />
      <FanAndMotor />
      <Filter />
    </g>
  );
}

/** Pad centre per point: inlet (dirty side) and outlet (clean plenum) taps on the impulse lines, ΔP transmitter, fan-motor terminal box. */
const pads: LineSheetArt["pads"] = {
  "PRS-FSL-03": [244, 289],
  "PRS-FSL-04": [244, 156],
  "PRS-FSL-02": [261.7, 224.5],
  "ELE-FSL-02": [432.3, 147.5],
};

const callouts: LineSheetArt["callouts"] = {
  "PRS-FSL-03": [262, 289, "start"],
  "PRS-FSL-04": [262, 128, "start"],
  "PRS-FSL-02": [245, 224.5, "end"],
  "ELE-FSL-02": [415, 147.5, "end"],
};

export const sheet: LineSheetArt = { id: "F-3", ready: true, width: W, height: H, Art, pads, callouts };
