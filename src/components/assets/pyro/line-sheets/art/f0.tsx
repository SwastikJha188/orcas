/**
 * Sheet F-0 — FSL-01 + KFS-01 · Feed system — Overview.
 *
 * Composition of PDF page 2, left → right: blower control cabinet; the
 * aeration blower set (motor, coupling, volute) on its skid with the riser
 * and header into the feed silo's cone; the raw-meal feed silo on its legs
 * with roof rail, radar, caged ladder and cut-away; extraction gate and air
 * slide down to the kiln feed bin (weigh bin) on load cells, with its radar,
 * level switches and dosing gate; air slide to the solid-flow meter with its
 * pressure tap and flow transmitter; pipe into the bucket-elevator boot; the
 * elevator casing, head with discharge spout to the preheater, and the head
 * drive (bearing, gearbox, motor) on its platform.
 */
import React from "react";
import { Bolt, Coupling, Fan, GearWheel, GroundLine, MX, MachineLabel, Motor, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { AirSlide, Cabinet, Ladder, MirrorX, PedestalBearing, Pipe } from "../../drawings/fkp-parts";
import type { LineSheetArt } from "../types";
import { Arrow, Bracing, ConeRoof, ElevatorCasing, Leg, RadarLevel, SlideGate, Vessel } from "./parts-f";

const W = 1144.5;
const H = 479;
const GROUND = 450;

function Aeration() {
  const voluteD = "M 226 366 H 256 V 375 A 30 30 0 0 1 256 435 A 30 30 0 0 1 226 405 Z";
  return (
    <g>
      {/* control cabinet and conduit to the motor */}
      <rect x={25} y={440} width={59} height={10} rx={2} {...PAINT.body} />
      <Cabinet x={30} y={354} w={49} h={86} />
      <rect x={38} y={364} width={33} height={14} rx={2} {...PAINT.recess} />
      <path d="M 79 392 H 92 V 372 H 150 V 380" fill="none" stroke={MX.edge} strokeWidth={3} strokeLinejoin="round" />
      <path d="M 79 392 H 92 V 372 H 150 V 380" fill="none" stroke={MX.metal} strokeWidth={1.2} strokeLinejoin="round" />
      {/* blower skid, motor, coupling, volute on its pedestal */}
      <rect x={90} y={441} width={218} height={9} rx={2} {...PAINT.body} />
      {[98, 300].map((x) => (
        <Bolt key={x} x={x} y={445.5} r={1.2} />
      ))}
      <rect x={124} y={436} width={70} height={5} rx={1} {...PAINT.body} />
      <Motor x={114} y={392} w={89} h={46} />
      <Coupling x={212} y={407} w={12} h={16} />
      <path d="M 238 425 H 274 L 282 441 H 230 Z" {...PAINT.body} />
      <path d={voluteD} {...PAINT.body} />
      <Fan cx={256} cy={405} r={21} />
      <circle cx={256} cy={405} r={25} fill="none" stroke={MX.fine} strokeWidth={1} />
      {/* riser → header into the silo cone aeration ring */}
      <Pipe
        pts={[
          [239.5, 366],
          [239.5, 240],
          [321, 240],
        ]}
        d={10}
        flanges={[
          [239.5, 340],
          [300, 240],
        ]}
      />
      <rect x={231} y={363} width={17} height={4} rx={1} {...PAINT.raised} />
      {/* header pressure transmitter */}
      <rect x={244} y={306.5} width={6} height={3} {...PAINT.shaft} />
      <rect x={232} y={300} width={14} height={16} rx={4} {...PAINT.body} />
    </g>
  );
}

function FeedSilo() {
  return (
    <g>
      <Ladder x={264} y1={53} y2={GROUND} w={12} />
      <Leg x={294} y1={205} y2={GROUND} w={7} />
      <Leg x={411} y1={205} y2={GROUND} w={7} />
      <Bracing
        lines={[
          [301, 258, 356, 444],
          [411, 258, 356, 444],
          [301, 258, 411, 258],
        ]}
        w={1.6}
      />
      <ConeRoof x0={285} x1={428} y={68} peak={55} rail={14} step={20} />
      <RadarLevel x={356.5} roof={55.5} headY={39} s={0.6} />
      <Vessel x0={285} x1={428} top={68} ring={199} coneBot={264} outW={30} seams={[101, 133, 166]} win={[307, 98, 99, 67]} level={125} flangeH={8} bolts={10} />
      <rect x={316} y={236} width={81} height={8} rx={3} {...PAINT.cylinder} />
      <MachineLabel x={355.6} y={144.7} size={9} tone="ink">
        FEED SILO
      </MachineLabel>
      <SlideGate body={[341, 264, 32, 19]} act={[376, 267, 21, 16]} cap={[386.5, 275]} capR={6} />
      <rect x={349} y={283} width={16} height={8} rx={1.5} {...PAINT.body} />
      <AirSlide x1={346} y1={295} x2={527} y2={313} d={11} />
    </g>
  );
}

function FeedBin() {
  return (
    <g>
      {[523, 601].map((x) => (
        <g key={x}>
          <rect x={x} y={354} width={8} height={78} rx={1.2} {...PAINT.body} />
          <rect x={x - 4} y={432} width={16} height={3.5} rx={1} {...PAINT.raised} />
          <rect x={x - 1} y={435} width={10} height={8} rx={2} {...PAINT.body} />
          <rect x={x - 5} y={443} width={18} height={7} rx={1} {...PAINT.raised} />
        </g>
      ))}
      <Bracing
        lines={[
          [531, 396, 601, 428],
          [531, 428, 601, 396],
        ]}
        w={1.6}
      />
      <Vessel x0={519} x1={614} top={317} ring={348} coneBot={388} outW={24} seams={[327, 338]} flangeH={7} bolts={8} />
      <rect x={514} y={310} width={105} height={7} rx={2} {...PAINT.raised} />
      <RadarLevel x={566.5} roof={310} headY={298} s={0.6} />
      {/* high-level switch (shell) and low-level switch (cone) */}
      <rect x={614} y={324} width={4} height={4} {...PAINT.shaft} />
      <rect x={617} y={320} width={10} height={12} rx={3} {...PAINT.body} />
      <rect x={590} y={373.5} width={4} height={4} {...PAINT.shaft} />
      <rect x={593} y={369.5} width={9} height={12} rx={3} {...PAINT.body} />
      <SlideGate body={[553, 388, 27, 16]} act={[582, 389.5, 18, 13]} cap={[591, 396]} capR={5.5} />
      <rect x={559} y={404} width={14} height={7} rx={1.5} {...PAINT.body} />
      <AirSlide x1={553} y1={413} x2={699} y2={433} d={11} />
      <rect x={636} y={429} width={4} height={6} {...PAINT.shaft} />
      <rect x={682} y={439} width={6} height={11} rx={1} {...PAINT.body} />
    </g>
  );
}

function FlowMeter() {
  return (
    <g>
      {[702, 748].map((x) => (
        <rect key={x} x={x} y={444} width={6} height={6} {...PAINT.body} />
      ))}
      <rect x={697} y={409} width={60} height={37} rx={6} {...PAINT.body} />
      <rect x={705} y={414} width={34} height={26} rx={3} {...PAINT.recess} />
      <line x1={712} y1={419} x2={731} y2={434} stroke={MX.metal} strokeWidth={2} strokeLinecap="round" />
      {/* body pressure tap and flow transmitter */}
      <rect x={720} y={403} width={4} height={6} {...PAINT.shaft} />
      <rect x={714} y={396} width={16} height={9} rx={3} {...PAINT.body} />
      <rect x={757} y={417} width={4} height={5} {...PAINT.shaft} />
      <rect x={760} y={410} width={20} height={19} rx={3} {...PAINT.body} />
      <rect x={763} y={414} width={14} height={8} rx={1.5} {...PAINT.recess} />
      {/* outlet pipe to the elevator boot */}
      <Pipe pts={[[757, 438.5], [811, 438.5]]} d={8} elbows={false} flanges={[[784, 438.5]]} />
    </g>
  );
}

function Elevator() {
  return (
    <g>
      <ElevatorCasing x0={825} x1={863} y1={79} y2={406} pitch={20} section={65} />
      <rect x={810} y={405} width={68} height={41} rx={6} {...PAINT.body} />
      <circle cx={844} cy={425} r={11} {...PAINT.raised} />
      <circle cx={844} cy={425} r={3.5} {...PAINT.shaft} />
      <rect x={806} y={446} width={76} height={4} rx={1} {...PAINT.body} />
      {/* discharge spout and head */}
      <path d="M 808 52 L 750 88 L 750 101 L 808 69 Z" {...PAINT.body} />
      <rect x={746} y={85} width={5} height={19} rx={1.2} {...PAINT.raised} />
      <rect x={806} y={35} width={76} height={45} rx={9} {...PAINT.body} />
      <rect x={810} y={39} width={68} height={37} rx={6} fill="none" stroke={MX.fine} strokeWidth={1} />
      <circle cx={844} cy={57.5} r={18} {...PAINT.raised} />
      <circle cx={844} cy={57.5} r={7} {...PAINT.shaft} />
      {/* head drive on its platform */}
      <rect x={880} y={76} width={172} height={5} rx={1.5} {...PAINT.body} />
      <rect x={863} y={57.5 - 3} width={36} height={6} {...PAINT.shaft} />
      <PedestalBearing x={887} y={57.5} w={14} base={76} />
      <rect x={897} y={39} width={46} height={36} rx={5} {...PAINT.body} />
      <rect x={902} y={33} width={36} height={7} rx={2} {...PAINT.raised} />
      <line x1={899} x2={941} y1={53} y2={53} {...PAINT.hair} />
      <GearWheel cx={909} cy={63} r={6} teeth={10} />
      <GearWheel cx={927} cy={59} r={9} teeth={14} />
      <rect x={943} y={55} width={7} height={5} {...PAINT.shaft} />
      <MirrorX about={989.5}>
        <Motor x={949} y={41} w={81} h={35} />
      </MirrorX>
      <rect x={1041} y={46} width={10} height={25} rx={4} {...PAINT.body} />
    </g>
  );
}

function Labels() {
  const bottom: [number, string][] = [
    [1, "CONTROL CABINET"],
    [151, "AERATION BLOWER"],
    [329, "FEED SILO"],
    [492.5, "KILN FEED BIN (WEIGH BIN)"],
    [673.5, "SOLID-FLOW METER"],
    [792.5, "BUCKET ELEVATOR"],
  ];
  return (
    <g>
      {bottom.map(([x, t]) => (
        <MachineLabel key={t} x={x} y={470.1} anchor="start" size={8.2}>
          {t}
        </MachineLabel>
      ))}
      <MachineLabel x={420.5} y={258.6} anchor="start" size={8.2}>
        EXTRACTION GATE
      </MachineLabel>
      <MachineLabel x={432.5} y={290} anchor="start" size={7.5}>
        AIR SLIDE
      </MachineLabel>
      <MachineLabel x={612.5} y={447.5} anchor="start" size={7.5}>
        AIR SLIDE
      </MachineLabel>
      <MachineLabel x={520} y={410.1} anchor="end" size={8.2}>
        DOSING GATE
      </MachineLabel>
      <MachineLabel x={638} y={138.6} anchor="start" size={8.2}>
        TO PREHEATER
      </MachineLabel>
      <MachineLabel x={965} y={92.1} anchor="start" size={8.2}>
        HEAD DRIVE
      </MachineLabel>
      <Arrow x1={741} y1={101} x2={698} y2={124} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={0} x2={1130} y={GROUND} />
      <FeedSilo />
      <Aeration />
      <FeedBin />
      <FlowMeter />
      <Elevator />
      <Labels />
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 2; identified from the detail sheets F-1 … F-5. */
const pads: LineSheetArt["pads"] = {
  "STS-FSL-02": [54.5, 371],
  "ELE-FSL-01": [158.5, 384.5],
  "PRS-FSL-01": [239, 308],
  "LEV-FSL-01": [356.5, 38],
  "STS-FSL-01": [386.5, 275],
  "LEV-KFS-01": [566.5, 297.5],
  "LEV-KFS-02": [622, 326],
  "LEV-KFS-03": [597.5, 375.5],
  "WGT-KFS-01": [527.5, 435.5],
  "POS-KFS-01": [590, 395.5],
  "PRS-KFS-01": [638, 425],
  "FLO-KFS-01": [769, 419.5],
  "PRS-KFS-02": [722, 402],
  "TMP-KFS-01": [887, 57.5],
  "VIB-KFS-01": [920, 39.5],
  "ELE-KFS-01": [990.5, 33.5],
  "SPD-KFS-01": [844, 57.5],
};

export const sheet: LineSheetArt = { id: "F-0", ready: true, width: W, height: H, Art, pads };
