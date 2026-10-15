/**
 * Sheet H-1 — HMR-01 · Clinker crusher — Hammer crusher and motor.
 * Composed as PDF page 35: crusher motor with coupling on the left, the hammer
 * crusher (feed chute, hopper, cut-away of the hammer rotor and grate) between
 * its DE and NDE rotor bearing blocks, the speed pickup on the shaft end, all
 * on a common base frame over the foundation piers.
 */
import React from "react";
import { Bolt, Coupling, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Lumps } from "../../sheets/sc-parts";
import { Plinth } from "../../sheets/sb-parts";
import type { LineSheetArt } from "../types";
import { BearingHousing, DriveMotor, Flow, Pier } from "./parts-h";

const W = 824;
const H = 704;

const SY = 480; // shaft centre line
const BASE = 600; // base-frame top
const GROUND = 645.5;
const ROT = { cx: 480.5, cy: 420.5 };
const DE = { x: 353, w: 60 };
const NDE = { x: 548.5, w: 60 };
const BLOCK_Y = 443;
const BLOCK_H = 78;

function Rotor() {
  const { cx, cy } = ROT;
  const hammers = 8;
  const rad = (d: number) => (d * Math.PI) / 180;
  return (
    <g aria-hidden="true">
      {/* crushing chamber cut-away */}
      <circle cx={cx} cy={cy} r={99} {...PAINT.recess} />
      {/* breaker plate (upper right) */}
      <path
        d={`M ${cx + 96 * Math.cos(rad(-62))} ${cy + 96 * Math.sin(rad(-62))} A 96 96 0 0 1 ${cx + 96 * Math.cos(rad(-8))} ${cy + 96 * Math.sin(rad(-8))}`}
        fill="none"
        stroke={MX.edge}
        strokeWidth={6}
        strokeLinecap="round"
      />
      {/* grate bars (lower arc) */}
      {Array.from({ length: 13 }).map((_, i) => {
        const a = rad(28 + i * 10);
        return (
          <line
            key={i}
            x1={cx + Math.cos(a) * 88}
            y1={cy + Math.sin(a) * 88}
            x2={cx + Math.cos(a) * 98}
            y2={cy + Math.sin(a) * 98}
            stroke={MX.metal}
            strokeWidth={4}
            strokeLinecap="round"
          />
        );
      })}
      <path d={`M ${cx + 86 * Math.cos(rad(26))} ${cy + 86 * Math.sin(rad(26))} A 86 86 0 0 1 ${cx + 86 * Math.cos(rad(154))} ${cy + 86 * Math.sin(rad(154))}`} {...PAINT.hair} />
      {/* clinker in the chamber and on the grate */}
      <Lumps pts={[[456, 336], [474, 328], [500, 340], [446, 352], [522, 352], [416, 470], [440, 494], [522, 494], [546, 470], [468, 506], [494, 508]]} r={3.2} />
      {/* hammers on their pins */}
      {Array.from({ length: hammers }).map((_, i) => {
        const a = (i * 360) / hammers;
        return (
          <g key={i} transform={`rotate(${a} ${cx} ${cy})`}>
            <rect x={cx - 11} y={cy - 86} width={22} height={34} rx={4} {...PAINT.shaft} />
            <line x1={cx - 7} x2={cx + 7} y1={cy - 80} y2={cy - 80} stroke={MX.edge} strokeWidth={0.8} />
            <circle cx={cx} cy={cy - 58} r={3} fill={MX.deep} stroke={MX.fine} strokeWidth={0.8} />
          </g>
        );
      })}
      {/* rotor discs and hub */}
      <circle cx={cx} cy={cy} r={56} {...PAINT.raised} />
      <circle cx={cx} cy={cy} r={47} {...PAINT.hair} />
      {Array.from({ length: hammers }).map((_, i) => {
        const a = rad((i * 360) / hammers + 22.5);
        return <circle key={i} cx={cx + Math.cos(a) * 36} cy={cy + Math.sin(a) * 36} r={5} {...PAINT.recess} />;
      })}
      <circle cx={cx} cy={cy} r={23} {...PAINT.shaft} />
      <circle cx={cx} cy={cy} r={14} fill="none" stroke={MX.edge} strokeWidth={1} />
      <rect x={cx - 3} y={cy - 25} width={6} height={6} rx={1} fill={MX.deep} />
      <circle cx={cx} cy={cy} r={5} fill={MX.deep} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={22} x2={804} y={GROUND} />

      {/* ---------------- foundation piers and base frame ---------------- */}
      {[[45, 65], [190, 70], [345, 95], [625, 75], [735, 55]].map(([x, w]) => (
        <Pier key={x} x={x} y={BASE + 18.5} w={w} h={GROUND - BASE - 18.5} />
      ))}
      <rect x={30.5} y={BASE} width={765} height={18.5} rx={3} {...PAINT.body} />
      <line x1={34} x2={792} y1={BASE + 4} y2={BASE + 4} {...PAINT.hair} />
      {[48, 120, 210, 250, 370, 420, 640, 690, 750, 780].map((bx) => (
        <Bolt key={bx} x={bx} y={BASE + 11} r={1.8} />
      ))}

      {/* ---------------- discharge to the pan conveyor ---------------- */}
      <rect x={452} y={580} width={57} height={42} rx={3} {...PAINT.body} />
      <rect x={459} y={584} width={43} height={38} rx={2} {...PAINT.recess} />
      <Lumps pts={[[470, 596], [490, 604], [478, 614], [468, 627]]} r={3} />
      <Flow x1={480} y1={624} x2={480} y2={643} />
      <MachineLabel x={495.5} y={636.6} anchor="start" size={8.2}>TO PAN CONVEYOR</MachineLabel>

      {/* ---------------- crusher motor ---------------- */}
      <Plinth x={78} y={576} w={190} h={24} bolts={4} />
      <DriveMotor x={88} y={420} w={182} h={120} footY={576} shaft={24} />
      {/* winding RTD terminal plate */}
      <rect x={146} y={466} width={72} height={30} rx={3} {...PAINT.recess} />
      <line x1={186} x2={210} y1={474} y2={474} {...PAINT.hair} />
      <line x1={186} x2={210} y1={481} y2={481} {...PAINT.hair} />
      <line x1={186} x2={204} y1={488} y2={488} {...PAINT.hair} />
      <MachineLabel x={114.5} y={666.2} anchor="start" size={9}>CRUSHER MOTOR</MachineLabel>

      {/* ---------------- shaft line and coupling ---------------- */}
      <rect x={300} y={SY - 7} width={360} height={14} rx={2} {...PAINT.shaft} />
      <Coupling x={300} y={SY - 19} w={36} h={38} />
      {[306, 330].map((bx) => (
        <g key={bx}>
          <Bolt x={bx} y={SY - 13} r={1.4} />
          <Bolt x={bx} y={SY + 13} r={1.4} />
        </g>
      ))}

      {/* ---------------- speed trigger wheel and pickup ---------------- */}
      <rect x={628} y={SY - 18} width={10} height={36} rx={2} {...PAINT.raised} />
      {[-12, -4, 4, 12].map((dy) => (
        <line key={dy} x1={629} x2={637} y1={SY + dy} y2={SY + dy} stroke={MX.edge} strokeWidth={0.8} />
      ))}
      <rect x={606} y={SY + 20} width={72} height={6} rx={1.5} {...PAINT.body} />
      <rect x={667} y={SY + 13} width={9} height={10} rx={1} {...PAINT.body} />
      <Bolt x={613} y={SY + 23.5} r={1.3} />
      <rect x={660} y={SY - 15} width={24} height={30} rx={4} {...PAINT.raised} />
      <rect x={654} y={SY - 4} width={7} height={8} rx={1} {...PAINT.shaft} />
      <rect x={684} y={SY - 3} width={6} height={6} rx={1} {...PAINT.shaft} />

      {/* ---------------- crusher casing ---------------- */}
      {/* feed chute from the cooler (C-5) */}
      <rect x={464} y={31} width={33} height={138} rx={2} {...PAINT.cylinderV} />
      <rect x={471} y={31} width={19} height={132} rx={1.5} {...PAINT.recess} />
      <Lumps pts={[[480, 52], [478, 82], [483, 112], [479, 142]]} r={3.2} />
      <rect x={455} y={88} width={51} height={6} rx={1.5} {...PAINT.raised} />
      <MachineLabel x={503} y={43.7} anchor="start" size={9}>CLINKER FROM COOLER (C-5)</MachineLabel>
      {/* hopper and body */}
      <path d="M 450 173 L 511 173 L 548.5 226 L 548.5 585 L 413 585 L 413 226 Z" {...PAINT.body} />
      <path d="M 455 180 L 506 180 L 541 229 L 541 578 L 420 578 L 420 229 Z" {...PAINT.hair} />
      <rect x={444} y={166} width={73} height={9} rx={2} {...PAINT.raised} />
      {[450, 466, 494, 510].map((bx) => (
        <Bolt key={bx} x={bx} y={170.5} r={1.5} />
      ))}
      {/* hopper flange and lifting lugs */}
      <rect x={408} y={224} width={145} height={8} rx={2} {...PAINT.raised} />
      {[418, 438, 458, 502, 522, 543].map((bx) => (
        <Bolt key={bx} x={bx} y={228} r={1.4} />
      ))}
      {[420, 530].map((lx) => (
        <path key={lx} d={`M ${lx} 224 v -9 a 5 5 0 0 1 10 0 v 9`} fill="none" stroke={MX.edge} strokeWidth={1.6} />
      ))}
      {/* inspection door */}
      <rect x={508} y={244} width={30} height={46} rx={3} {...PAINT.raised} />
      <rect x={513} y={250} width={20} height={20} rx={2} {...PAINT.recess} />
      <line x1={515} x2={531} y1={280} y2={280} stroke={MX.edge} strokeWidth={2} strokeLinecap="round" />
      {/* feed throat into the chamber */}
      <path d="M 458 180 L 503 180 L 516 300 L 445 300 Z" {...PAINT.recess} />
      <Lumps pts={[[470, 200], [490, 214], [478, 236], [496, 258], [466, 272]]} r={3.2} />
      {/* rotor housing with the cut-away */}
      <circle cx={ROT.cx} cy={ROT.cy} r={108} {...PAINT.body} />
      {Array.from({ length: 16 }).map((_, i) => {
        const a = (i / 16) * Math.PI * 2 + 0.2;
        return <Bolt key={i} x={ROT.cx + Math.cos(a) * 103.5} y={ROT.cy + Math.sin(a) * 103.5} r={1.5} />;
      })}
      <Rotor />
      {/* discharge neck */}
      <line x1={420} x2={541} y1={545} y2={545} {...PAINT.hair} />

      {/* ---------------- rotor bearing blocks ---------------- */}
      {[DE, NDE].map((b, i) => (
        <g key={b.x}>
          {/* bracket to the casing */}
          <path d={i === 0 ? `M 395 ${BLOCK_Y + BLOCK_H} H 413 V 566 Z` : `M 548.5 ${BLOCK_Y + BLOCK_H} H 566.5 L 548.5 566 Z`} {...PAINT.body} />
          <BearingHousing x={b.x} y={BLOCK_Y} w={b.w} h={BLOCK_H} split={SY} />
        </g>
      ))}
      <MachineLabel x={383} y={539.1} size={8.2}>DE</MachineLabel>
      <MachineLabel x={578} y={539.1} size={8.2}>NDE</MachineLabel>
      <MachineLabel x={397.5} y={666.2} anchor="start" size={9}>HAMMER ROTOR (CUTAWAY)</MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 35. */
const pads: LineSheetArt["pads"] = {
  "TMP-HMR-03": [165.5, 480.5],
  "ELE-HMR-01": [167, 402],
  "VIB-HMR-01": [383, 450.5],
  "TMP-HMR-01": [383, 510.5],
  "VIB-HMR-02": [578, 450.5],
  "TMP-HMR-02": [578, 510.5],
  "SPD-HMR-01": [671.5, 480.5],
};

/** Tag chip centre per point, as on PDF page 35. */
const chips: NonNullable<LineSheetArt["chips"]> = {
  "TMP-HMR-03": [87, 353],
  "ELE-HMR-01": [222.5, 297],
  "VIB-HMR-01": [312, 300.5],
  "TMP-HMR-01": [304.5, 593],
  "VIB-HMR-02": [641, 300.5],
  "TMP-HMR-02": [656, 593],
  "SPD-HMR-01": [735, 435.5],
};

export const sheet: LineSheetArt = { id: "H-1", ready: true, width: W, height: H, Art, pads, chips };
