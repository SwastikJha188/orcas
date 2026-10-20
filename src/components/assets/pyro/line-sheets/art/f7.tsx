/**
 * Sheet F-7 — KFS-01 · Kiln feed — Bucket elevator.
 *
 * Panel "BUCKET ELEVATOR" of the machine group images, page 3 (panel box
 * 842.5, 105.5 → 1605.5, 777.5 in page units): the boot with its tail pulley
 * fed by the common air slide (boot level switch), the casing with belt and
 * buckets (inspection door, belt-sway switches), the head with the head
 * pulley and the discharge spout to the preheater, and the head drive on the
 * right: head-shaft bearing, gearbox, coupling and motor.
 *
 * Units: page units of the group-image page minus the panel origin.
 */
import React from "react";
import { CornerBolts, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { AirSlide } from "../../drawings/fkp-parts";
import type { LineSheetArt } from "../types";
import { FlowArrow, Instr, SideMotor } from "./parts-f2";

const W = 763;
const H = 672;
const GROUND = 635;

function Casing() {
  const buckets: React.ReactNode[] = [];
  for (let y = 192.5; y < 565; y += 31) buckets.push(<rect key={`l${y}`} x={339} y={y} width={10} height={6} rx={1.5} fill={MX.flatRaised} stroke={MX.edge} strokeWidth={0.8} />);
  for (let y = 207.5; y < 565; y += 31) buckets.push(<rect key={`r${y}`} x={354} y={y} width={10} height={6} rx={1.5} fill={MX.flatRaised} stroke={MX.edge} strokeWidth={0.8} />);
  return (
    <g>
      <rect x={321} y={171.5} width={60.5} height={403.5} rx={2} {...PAINT.cylinderV} />
      <rect x={336.5} y={174} width={30} height={398} rx={2} {...PAINT.recess} />
      <line x1={351.5} x2={351.5} y1={176} y2={570} stroke={MX.fine} strokeWidth={0.8} />
      {buckets}
      {/* inspection door (right), belt-sway switch (left) */}
      <rect x={381.5} y={229} width={17} height={18.5} rx={3} {...PAINT.body} />
      <Instr x={312.5} y={238.3} w={13} h={15} />
      <MachineLabel x={178.5} y={226.5} size={7}>
        BELT-SWAY SWITCHES
      </MachineLabel>
      <line x1={385} y1={459} x2={436.5} y2={457} {...PAINT.hair} />
      <MachineLabel x={443} y={460} anchor="start" size={7.5}>
        CASING WITH BELT AND BUCKETS
      </MachineLabel>
    </g>
  );
}

function Boot() {
  return (
    <g>
      <MachineLabel x={210.5} y={539.5} size={7.5}>
        FROM SFM A + B VIA COMMON AIR SLIDE
      </MachineLabel>
      <AirSlide x1={91} y1={560} x2={301} y2={599} d={15} />
      <rect x={300.5} y={575} width={101.5} height={49} rx={8} {...PAINT.body} />
      <circle cx={351} cy={598.5} r={17.5} {...PAINT.raised} />
      <circle cx={351} cy={598.5} r={5} {...PAINT.shaft} />
      {/* boot level switch at the inlet */}
      <Instr x={292} y={599.5} w={13} h={13} />
      <MachineLabel x={351} y={655} size={7.5}>
        BUCKET ELEVATOR (BOOT)
      </MachineLabel>
    </g>
  );
}

function Head() {
  return (
    <g>
      {/* discharge spout to the preheater */}
      <path d="M 296 122.5 L 206 175 L 206 205 L 296 150 Z" {...PAINT.body} />
      <FlowArrow x1={203} y1={195.5} x2={154} y2={195.5} head={8} />
      <MachineLabel x={229.5} y={168} size={7.5}>
        TO PREHEATER (C1 / C2 DUCT)
      </MachineLabel>
      {/* head shaft to the bearing */}
      <rect x={380} y={126} width={66} height={7} {...PAINT.shaft} />
      <rect x={294} y={91.5} width={115} height={80} rx={10} {...PAINT.body} />
      <circle cx={351} cy={129.5} r={28.5} {...PAINT.raised} />
      <circle cx={351} cy={129.5} r={20} fill="none" stroke={MX.fine} strokeWidth={1} />
      <circle cx={351} cy={129.5} r={6} {...PAINT.shaft} />
      {/* head-shaft bearing */}
      <rect x={409} y={113} width={23.5} height={33} rx={4} {...PAINT.raised} />
      <line x1={411} x2={430.5} y1={129.5} y2={129.5} {...PAINT.hair} />
    </g>
  );
}

function Drive() {
  return (
    <g>
      {/* gearbox */}
      <rect x={459} y={91.5} width={75} height={8} rx={2.5} {...PAINT.raised} />
      <rect x={449} y={98.5} width={95} height={66.5} rx={5} {...PAINT.body} />
      <CornerBolts x={449} y={98.5} w={95} h={66.5} inset={5.5} r={1.5} />
      <circle cx={507.5} cy={127.5} r={20} {...PAINT.raised} />
      <circle cx={507.5} cy={127.5} r={5.5} {...PAINT.shaft} />
      <circle cx={475} cy={135} r={11.5} {...PAINT.raised} />
      <circle cx={475} cy={135} r={4} {...PAINT.shaft} />
      {/* coupling and motor */}
      <rect x={544} y={124.5} width={14.5} height={11} rx={2} {...PAINT.body} />
      <SideMotor x={560} y={102.5} w={129} h={56.5} shaft="l" box={0.49} />
      <MachineLabel x={495.5} y={188} size={7.5}>
        HEAD GEARBOX
      </MachineLabel>
      <MachineLabel x={635} y={188} size={7.5}>
        HEAD MOTOR
      </MachineLabel>
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={30} x2={733.5} y={GROUND} />
      <Casing />
      <Boot />
      <Head />
      <Drive />
    </g>
  );
}

/** Pad centre per point: PDF pad centres; the winding RTD a little lower on the motor so its plate clears the bearing's. */
const pads: LineSheetArt["pads"] = {
  "SPD-KFS-01": [351, 129],
  "TMP-KFS-01": [420, 129],
  "VIB-KFS-01": [496.3, 99.5],
  "ELE-KFS-01": [622.5, 95.5],
  "TMP-KFS-02": [649.5, 153],
  "LIM-KFS-01": [312.5, 238.3],
  "LEV-KFS-04": [290.3, 599.5],
};

/** Head speed over the spout, bearing over the gearbox, vibration back over the head, motor points along the motor. */
const callouts: LineSheetArt["callouts"] = {
  "SPD-KFS-01": [336, 129, "end"],
  "TMP-KFS-01": [435, 129, "start"],
  "VIB-KFS-01": [480, 99.5, "end"],
  "ELE-KFS-01": [637, 95.5, "start"],
  "TMP-KFS-02": [634, 153, "end"],
  "LIM-KFS-01": [297, 238.3, "end"],
  "LEV-KFS-04": [275, 599.5, "end"],
};

export const sheet: LineSheetArt = { id: "F-7", ready: true, width: W, height: H, Art, pads, callouts };
