/**
 * Sheet K-3 — KLN-01 · Rotary kiln — Auxiliary drive and brake.
 *
 * Composition of PDF page 16: the main gearbox (from K-2) at left, its
 * auxiliary input shaft through the overrunning (sprag) clutch to the brake
 * disc with its caliper and pad-wear switch, the auxiliary reducer and the
 * auxiliary motor on a braced steel table, and the auxiliary-drive PLC / MCC
 * cabinet above the motor with its control cable.
 */
import React from "react";
import { Bolt, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Brace, Cabinet } from "../../drawings/fkp-parts";
import { Gearbox } from "../../sheets/sa-parts";
import { Link, SideMotor } from "../../sheets/sb-parts";
import type { LineSheetArt } from "../types";
import { Bedplate, Column, GearboxSide, Pier } from "./parts-ka";

const W = 824;
const H = 704;
const GROUND = 600;
const AXIS = 338;

function MainGearbox() {
  return (
    <g>
      <Pier x={60} y={410} w={166} h={GROUND - 410} bolts={2} />
      <Bedplate x={53} y={399} w={180} h={11} />
      <rect x={70} y={388} width={146} height={11} rx={2} {...PAINT.body} />
      <GearboxSide x={60} y={248} w={166} h={142} ig={[45, 78, 26]} og={[103, 60, 43]} />
    </g>
  );
}

function ClutchAndBrake() {
  const cx = 383;
  return (
    <g>
      {/* auxiliary input shaft */}
      <rect x={226} y={AXIS - 6} width={226} height={12} rx={2} {...PAINT.shaft} />
      {/* overrunning (sprag) clutch: flanged housing, bolt ring, cage */}
      <rect x={278} y={314} width={52} height={48} rx={6} {...PAINT.body} />
      <rect x={274} y={318} width={6} height={40} rx={2} {...PAINT.raised} />
      <rect x={328} y={318} width={6} height={40} rx={2} {...PAINT.raised} />
      <rect x={288} y={322} width={32} height={32} rx={3} {...PAINT.recess} />
      {[292, 298, 304, 310, 316].map((x) => (
        <line key={x} x1={x} x2={x + 2} y1={325} y2={351} stroke={MX.fine} strokeWidth={1.2} />
      ))}
      <Bolt x={277} y={324} r={1.2} />
      <Bolt x={277} y={352} r={1.2} />
      <Bolt x={331} y={324} r={1.2} />
      <Bolt x={331} y={352} r={1.2} />
      {/* brake disc (face-on) with vents and friction ring */}
      <circle cx={cx} cy={AXIS} r={46} {...PAINT.cylinderV} />
      <circle cx={cx} cy={AXIS} r={38} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      <circle cx={cx} cy={AXIS} r={30} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <circle key={i} cx={cx + Math.cos(a) * 34} cy={AXIS + Math.sin(a) * 34} r={1.6} {...PAINT.recess} />;
      })}
      <circle cx={cx} cy={AXIS} r={18} {...PAINT.raised} />
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2 + 0.5;
        return <Bolt key={i} x={cx + Math.cos(a) * 13} y={AXIS + Math.sin(a) * 13} r={1.3} />;
      })}
      <circle cx={cx} cy={AXIS} r={8} {...PAINT.recess} />
      {/* caliper over the disc rim: body, pad, wear switch, hydraulic line */}
      <rect x={358} y={279} width={50} height={34} rx={5} {...PAINT.body} />
      <rect x={364} y={306} width={38} height={8} rx={1.5} {...PAINT.raised} />
      <rect x={372} y={286} width={22} height={18} rx={3} {...PAINT.recess} />
      <Bolt x={363} y={284} r={1.3} />
      <Bolt x={403} y={284} r={1.3} />
      <path d="M 408 290 H 420 V 262" {...PAINT.detail} strokeWidth={1.6} />
      <rect x={414} y={254} width={12} height={9} rx={2} {...PAINT.raised} />
    </g>
  );
}

function AuxTable() {
  return (
    <g>
      <Brace x1={450} y1={472} x2={728} y2={584} />
      <line x1={450} x2={728} y1={472} y2={472} stroke={MX.edge} strokeWidth={1.4} />
      <Column x={443} y1={399} y2={GROUND} w={14} />
      <Column x={735} y1={399} y2={GROUND} w={14} />
      <rect x={421} y={390} width={337} height={10} rx={2} {...PAINT.raised} />
      <Bolt x={430} y={395} r={1.4} />
      <Bolt x={749} y={395} r={1.4} />
    </g>
  );
}

function AuxDrive() {
  return (
    <g>
      {/* reducer on its feet */}
      <rect x={458} y={372} width={76} height={18} rx={2} {...PAINT.body} />
      <Bolt x={466} y={381} r={1.4} />
      <Bolt x={526} y={381} r={1.4} />
      <Gearbox x={451} y={303} w={89} h={69} />
      {/* motor shaft and coupling into the reducer */}
      <rect x={538} y={AXIS - 5} width={18} height={10} rx={2} {...PAINT.shaft} />
      <rect x={541} y={AXIS - 9} width={10} height={18} rx={2} {...PAINT.raised} />
      {/* auxiliary motor: DE to the reducer, fan cowl right */}
      <Bedplate x={566} y={381} w={150} h={9} bolts={3} />
      <SideMotor x={573} y={294} w={157} h={87} flip />
      <rect x={630} y={326} width={46} height={24} rx={3} {...PAINT.recess} />
      {/* PLC / MCC cabinet with plinth and control cable to the motor */}
      <Link pts={[[717, 249], [717, 264], [652, 264], [652, 277]]} dash="4 3" />
      <Cabinet x={661} y={90} w={112} h={150} />
      <rect x={683} y={111} width={67} height={18} rx={2} {...PAINT.recess} />
      <rect x={655} y={240} width={124} height={9} rx={2} {...PAINT.raised} />
      <Bolt x={662} y={244.5} r={1.4} />
      <Bolt x={772} y={244.5} r={1.4} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={22} x2={803} y={GROUND} />
      <MainGearbox />
      <AuxTable />
      <ClutchAndBrake />
      <AuxDrive />

      <MachineLabel x={142} y={433.7} size={9}>MAIN GEARBOX (K-2)</MachineLabel>
      <MachineLabel x={242} y={434} anchor="start" size={8.2}>OVERRUNNING CLUTCH</MachineLabel>
      <MachineLabel x={282.5} y={494} anchor="start" size={8.2}>BRAKE DISC AND CALIPER</MachineLabel>
      <MachineLabel x={472.5} y={434} anchor="start" size={8.2}>AUX REDUCER</MachineLabel>
      <MachineLabel x={602} y={456.5} anchor="start" size={8.2}>AUXILIARY MOTOR</MachineLabel>
      <MachineLabel x={722} y={74} size={8.2}>AUX DRIVE PLC / MCC</MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 16. */
const pads: LineSheetArt["pads"] = {
  "STS-KLN-11": [716.5, 119],
  "LIM-KLN-01": [383, 295],
};

/** Tag chip centre per point, as on PDF page 16. */
const chips: NonNullable<LineSheetArt["chips"]> = {
  "STS-KLN-11": [630.5, 81.5],
  "LIM-KLN-01": [446, 213],
};

export const sheet: LineSheetArt = { id: "K-3", ready: true, width: W, height: H, Art, pads, chips };
