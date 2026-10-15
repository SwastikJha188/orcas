/**
 * Sheet F-5 — KFS-01 · Kiln feed — Bucket elevator.
 *
 * Composition of PDF page 7: the feed chute from the solid-flow meter (F-4)
 * into the boot with its tail pulley and screw take-ups; the flanged casing
 * with the belt and buckets (meal in the up-leg); the head hood with head
 * pulley, shaft-end speed sensor, inspection door and the discharge spout to
 * the preheater; the head drive on its bracket platform — plummer-block
 * bearing, head gearbox (split line, inspection cover, gear train), coupling
 * and the head motor with terminal box and fan cowl.
 */
import React from "react";
import { Bolt, CornerBolts, Coupling, GearWheel, GroundLine, MX, MachineLabel, Motor, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { MirrorX, PedestalBearing, Tube } from "../../drawings/fkp-parts";
import type { LineSheetArt } from "../types";
import { Arrow, BoltRow, ElevatorCasing } from "./parts-f";

const W = 824;
const H = 704;

const GROUND = 675;
const CX = 380;
const HEAD_Y = 115;

function Boot() {
  return (
    <g>
      {/* inlet chute from the solid-flow meter */}
      <Tube x1={113} y1={594} x2={326} y2={627} d={17} />
      <rect x={110.5} y={583} width={5} height={22} rx={1.2} transform="rotate(8.9 113 594)" {...PAINT.raised} />
      <rect x={203} y={596} width={5} height={22} rx={1.2} transform="rotate(8.9 205 608)" {...PAINT.raised} />
      <rect x={316} y={664} width={127} height={11} rx={2} {...PAINT.body} />
      <Bolt x={324} y={669.5} r={1.4} />
      <Bolt x={435} y={669.5} r={1.4} />
      <rect x={323} y={610} width={113} height={54} rx={8} {...PAINT.body} />
      <rect x={329} y={616} width={101} height={42} rx={5} fill="none" stroke={MX.fine} strokeWidth={1} />
      <CornerBolts x={323} y={610} w={113} h={54} inset={6} r={1.4} />
      {/* tail pulley and screw take-ups */}
      <circle cx={CX} cy={635} r={20} {...PAINT.recess} />
      <circle cx={CX} cy={635} r={14} {...PAINT.raised} />
      {[0, 60, 120, 180, 240, 300].map((d) => (
        <line key={d} x1={CX} y1={635} x2={CX + Math.cos((d * Math.PI) / 180) * 13} y2={635 + Math.sin((d * Math.PI) / 180) * 13} {...PAINT.hair} />
      ))}
      <circle cx={CX} cy={635} r={4.5} {...PAINT.shaft} />
      {[332, 428].map((x) => (
        <g key={x}>
          <rect x={x - 2} y={604} width={4} height={26} {...PAINT.shaft} />
          <rect x={x - 5} y={600} width={10} height={5} rx={1.5} {...PAINT.raised} />
        </g>
      ))}
      <rect x={405} y={646} width={22} height={12} rx={2} {...PAINT.raised} />
    </g>
  );
}

function Head() {
  return (
    <g>
      {/* discharge spout to the preheater */}
      <path d="M 318 104 L 218 170 L 218 197 L 318 140 Z" {...PAINT.body} />
      <line x1={312} y1={118} x2={226} y2={176} {...PAINT.hair} />
      <rect x={213} y={166} width={6} height={35} rx={1.5} {...PAINT.raised} />
      <Arrow x1={212} y1={188} x2={160} y2={188} />
      {/* hood */}
      <rect x={315} y={72} width={128} height={89} rx={14} {...PAINT.body} />
      <rect x={321} y={78} width={116} height={77} rx={10} fill="none" stroke={MX.fine} strokeWidth={1} />
      <rect x={309} y={155} width={140} height={7} rx={2} {...PAINT.raised} />
      <BoltRow x1={316} x2={442} y={158.5} n={9} r={1} />
      <CornerBolts x={315} y={72} w={128} h={89} inset={11} r={1.6} />
      {/* head pulley with belt wrap, shaft end and speed sensor */}
      <circle cx={CX} cy={HEAD_Y} r={35} fill="none" stroke={MX.metal} strokeWidth={1.4} />
      <circle cx={CX} cy={HEAD_Y} r={31.5} {...PAINT.raised} />
      <circle cx={CX} cy={HEAD_Y} r={25} fill="none" stroke={MX.fine} strokeWidth={1} />
      {[30, 90, 150, 210, 270, 330].map((d) => (
        <line key={d} x1={CX + Math.cos((d * Math.PI) / 180) * 12} y1={HEAD_Y + Math.sin((d * Math.PI) / 180) * 12} x2={CX + Math.cos((d * Math.PI) / 180) * 24} y2={HEAD_Y + Math.sin((d * Math.PI) / 180) * 24} {...PAINT.hair} />
      ))}
      <circle cx={CX} cy={HEAD_Y} r={12} {...PAINT.shaft} />
      <circle cx={CX} cy={HEAD_Y} r={7} {...PAINT.body} />
      <rect x={428} y={88} width={10} height={20} rx={2} {...PAINT.recess} />
    </g>
  );
}

function Drive() {
  return (
    <g>
      {/* drive platform on a bracket off the casing */}
      <rect x={440} y={153} width={352} height={8} rx={2} {...PAINT.body} />
      <line x1={444} x2={788} y1={157} y2={157} {...PAINT.hair} />
      <path d="M 413 161 H 440 V 168 L 413 230 Z" {...PAINT.raised} />
      <line x1={480} y1={161} x2={413} y2={290} stroke={MX.fine} strokeWidth={2.4} strokeLinecap="round" />
      <rect x={410} y={285} width={8} height={12} rx={1.5} {...PAINT.raised} />
      {/* head shaft → bearing → gearbox */}
      <rect x={410} y={HEAD_Y - 5.5} width={80} height={11} rx={2} {...PAINT.shaft} />
      <PedestalBearing x={455.5} y={HEAD_Y} w={30} base={153} />
      {/* gearbox: casing, split line, inspection cover, gear train, foot */}
      <rect x={493} y={147} width={94} height={6} rx={1.5} {...PAINT.raised} />
      <rect x={487} y={84} width={106} height={66} rx={7} {...PAINT.body} />
      <line x1={490} x2={590} y1={112} y2={112} stroke={MX.fine} strokeWidth={1} />
      <rect x={499} y={74} width={84} height={12} rx={3} {...PAINT.raised} />
      <BoltRow x1={504} x2={578} y={80} n={6} r={1} />
      <GearWheel cx={516} cy={124} r={11} teeth={12} />
      <GearWheel cx={553} cy={116} r={19} teeth={18} hub={6} />
      <CornerBolts x={487} y={84} w={106} h={66} inset={6} r={1.4} />
      <rect x={590} y={HEAD_Y - 4} width={10} height={8} {...PAINT.shaft} />
      <Coupling x={595} y={HEAD_Y - 10} w={15} h={20} />
      {/* head motor, shaft toward the gearbox, fan cowl to the right */}
      <rect x={622} y={147} width={120} height={7} rx={1.5} {...PAINT.body} />
      <MirrorX about={681.5}>
        <Motor x={609} y={84} w={145} h={64} />
      </MirrorX>
      <rect x={656} y={71} width={51} height={13} rx={3} fill="none" stroke={MX.fine} strokeWidth={1} />
      <rect x={772} y={92} width={16} height={48} rx={7} {...PAINT.body} />
      {[102, 110, 118, 126].map((y) => (
        <line key={y} x1={775} x2={785} y1={y} y2={y} {...PAINT.hair} />
      ))}
      <CornerBolts x={609} y={84} w={145} h={64} inset={7} r={1.4} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={22} x2={804} y={GROUND} />
      <ElevatorCasing x0={346} x1={413} y1={160} y2={611} pitch={34.5} section={90} />
      <Boot />
      <Head />
      <Drive />
      <line x1={416} y1={480} x2={473} y2={477} stroke={MX.fine} strokeWidth={1} />
      <MachineLabel x={150.5} y={216.3} anchor="start" size={9.8}>
        TO PREHEATER (C1 / C2 DUCT)
      </MachineLabel>
      <MachineLabel x={113} y={568.8} anchor="start" size={9.8}>
        FROM SOLID-FLOW METER (F-4)
      </MachineLabel>
      <MachineLabel x={295.5} y={696.3} anchor="start" size={9.8}>
        BUCKET ELEVATOR (BOOT)
      </MachineLabel>
      <MachineLabel x={495.5} y={178.7} anchor="start" size={9}>
        HEAD GEARBOX
      </MachineLabel>
      <MachineLabel x={656} y={178.7} anchor="start" size={9}>
        HEAD MOTOR
      </MachineLabel>
      <MachineLabel x={480.5} y={478.7} anchor="start" size={9}>
        CASING WITH BELT AND BUCKETS
      </MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 7. */
const pads: LineSheetArt["pads"] = {
  "TMP-KFS-01": [455.5, 114.5],
  "VIB-KFS-01": [540.5, 81.5],
  "ELE-KFS-01": [680.5, 77],
  "SPD-KFS-01": [379, 114.5],
};

/** Tag chip centre per point, as on PDF page 7. */
const chips: NonNullable<LineSheetArt["chips"]> = {
  "TMP-KFS-01": [414.5, 30.5],
  "VIB-KFS-01": [603.5, 35],
  "ELE-KFS-01": [766.5, 39.5],
  "SPD-KFS-01": [285.5, 47],
};

export const sheet: LineSheetArt = { id: "F-5", ready: true, width: W, height: H, Art, pads, chips };
