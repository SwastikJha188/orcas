/**
 * Sheet F-6 — KFS-01 · Kiln feed — Solid-flow meters A / B and common air slide.
 *
 * Panel "SOLID-FLOW METERS A / B AND COMMON AIR SLIDE" of the machine group
 * images, page 3 (panel box 48.5, 105.5 → 811.5, 777.5 in page units): air
 * slides A and B arriving at solid-flow meters A and B (inlet cap, housing
 * with sight window and impact plate, outlet cone), each with its pressure
 * tap transmitter (P2 / P3) on the left and flow transmitter on the right; both meters drop onto the
 * common air slide to the bucket-elevator boot, with its blower, the
 * air-slide air inlet and the slide pressure tap.
 *
 * Units: page units of the group-image page minus the panel origin, shifted
 * right by OX so the pressure plates running left from the P taps stay on the
 * sheet.
 */
import React from "react";
import { GroundLine, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { AirSlide } from "../../drawings/fkp-parts";
import type { LineSheetArt } from "../types";
import { Instr, PlainArrow, ScrollFan, SideMotor, SolidFlowMeter } from "./parts-f2";

/** Room on the left for SFM A's pressure plate. */
const OX = 140;
const W = 763 + OX;
const H = 672;
const GROUND = 621.5;

/** One meter station; `dx` = offset of meter B from meter A. */
function Meter({ dx, name, from }: { dx: number; name: string; from: string }) {
  return (
    <g transform={`translate(${dx} 0)`}>
      <MachineLabel x={50.5} y={114.5} anchor="start" size={7.5}>
        {from}
      </MachineLabel>
      <AirSlide x1={51} y1={134} x2={128} y2={166} d={12} />
      {/* feed drop to the common slide */}
      <rect x={164.3} y={390} width={2.6} height={104} {...PAINT.material} />
      <SolidFlowMeter x={104.5} y={187.5} w={122} h={169} />
      {/* P tap transmitter (left side, opposite the flow transmitter) */}
      <rect x={84.5} y={293.5} width={20} height={3} {...PAINT.shaft} />
      <rect x={67} y={283.5} width={17.5} height={23} rx={3} {...PAINT.body} />
      {/* flow transmitter */}
      <rect x={226.5} y={247.5} width={20} height={3} {...PAINT.shaft} />
      <rect x={246.5} y={229.5} width={61} height={40.5} rx={4} {...PAINT.body} />
      <rect x={254.5} y={238.5} width={45} height={13} rx={2} {...PAINT.recess} />
      <MachineLabel x={165.5} y={432} size={8}>
        {name}
      </MachineLabel>
    </g>
  );
}

function CommonSlide() {
  return (
    <g>
      {/* air-slide air inlet into the air box from its blower */}
      <rect x={559} y={540} width={9.5} height={47} rx={1} {...PAINT.cylinderV} />
      <ScrollFan cx={575} cy={601} r={13} outTop={585} outW={12} />
      <SideMotor x={596} y={593} w={34} h={17} shaft="l" box={0.5} />
      {/* pressure tap */}
      <rect x={616.3} y={548} width={3} height={22} {...PAINT.shaft} />
      <AirSlide x1={118.5} y1={507.5} x2={712.5} y2={555} d={15} />
      <Instr x={617.7} y={575.3} w={15} h={15} />
      <MachineLabel x={653} y={477} size={7.5}>
        TO BUCKET ELEVATOR BOOT
      </MachineLabel>
      <PlainArrow x1={685} y1={493} x2={734} y2={493} />
      <MachineLabel x={563.5} y={634.5} size={7.5}>
        AIR-SLIDE BLOWER
      </MachineLabel>
      <MachineLabel x={388} y={654.5} size={7.5}>
        COMMON AIR SLIDE: SFM A + SFM B → BUCKET ELEVATOR
      </MachineLabel>
    </g>
  );
}

function Art() {
  return (
    <g transform={`translate(${OX} 0)`}>
      <GroundLine x1={30 - OX} x2={733.5} y={GROUND} />
      <Meter dx={0} name="SFM A" from="FROM AIR SLIDE A" />
      <Meter dx={310.5} name="SFM B" from="FROM AIR SLIDE B" />
      <CommonSlide />
    </g>
  );
}

/** Pad centre per point: PDF pad centres (pressure taps moved to the meters' left side). */
const pads: LineSheetArt["pads"] = shift({
  "PRS-KFS-02": [75.8, 295],
  "FLO-KFS-01": [276.7, 245],
  "PRS-KFS-06": [386.3, 295],
  "FLO-KFS-02": [587.5, 245],
  "PRS-KFS-04": [617.7, 575.3],
  "ELE-KFS-06": [613, 591],
});

/** Pressure plates run left from the P taps, flow plates right from the flow transmitters; the slide pressure runs along the common slide's air box. */
const callouts: LineSheetArt["callouts"] = shift({
  "PRS-KFS-02": [61, 295, "end"],
  "FLO-KFS-01": [292, 245, "start"],
  "PRS-KFS-06": [371.5, 295, "end"],
  "FLO-KFS-02": [602, 245, "start"],
  "PRS-KFS-04": [632, 575.3, "start"],
  "ELE-KFS-06": [640, 604, "start"],
});

/** Moves authored panel coordinates onto the widened sheet. */
function shift<T extends [number, ...unknown[]]>(m: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(m).map(([k, [x, ...rest]]) => [k, [x + OX, ...rest] as T]));
}

export const sheet: LineSheetArt = { id: "F-6", ready: true, width: W, height: H, Art, pads, callouts };
