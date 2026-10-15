"use client";

/**
 * D10 — CLR-01 grate cooler, compartments 4–6, grate drive / HPU, clinker
 * discharge and vent. The grate bed continues from D09 over compartments
 * 4–6 (smaller cooling fans). At the outlet end the clinker drops down the
 * discharge chute to the crusher, watched by the IR pyrometer. The cooler
 * exhaust leaves the hood top, runs over to the vent fan (to dedusting). The
 * moving grate is driven by a hydraulic cylinder fed from the HPU below.
 */

import React from "react";
import { Bolt, GroundLine, Housing, MX, MachineLabel, Motor, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { FanSet, Flange, Pipe, fanGeom, type FanSpec } from "../drawings/clk-parts";
import type { PyroSheetDrawing, SheetCalloutAnchor } from "./sheet-types";
import { Compartment, CoolerFrame, GrateCasing, Lumps } from "./sc-parts";

const W = 880;
const H = 560;
const GROUND = 538;

const CASE = { x: 4, y: 81, w: 588, h: 114 };
const COMP_Y = 200;
const COMP_H = 66;
const SLOT = 197;
const FLOOR = 401;
const slotX = (i: number) => 6 + i * SLOT;
const tap = (i: number): [number, number] => [slotX(i) + 72, 230];

const FANS: FanSpec[] = [0, 1, 2].map((i) => ({
  cx: slotX(i) + 104,
  cy: FLOOR - 8 - 4 - 26,
  r: 26,
  motorW: 30,
  motorH: 26,
  ductTop: COMP_Y + COMP_H,
  baseY: FLOOR - 8,
}));
const FG = FANS.map(fanGeom);

/* Vent fan: exhaust duct comes down into its volute; motor to the right. */
const VENT: FanSpec = { cx: 745, cy: 314, r: 36, motorW: 46, motorH: 32, ductTop: 262, baseY: 354 };
const VG = fanGeom(VENT);
const DUCT_X = (VG.duct[0] + VG.duct[1]) / 2;
const RISE_X = 529;
const TOP_Y = 28;
const DECK = 362;

/* Grate drive cylinder and HPU. */
const CYL = { x: 608, top: 296, bot: 372 };
const HPU = { x: 596, y: 474, w: 140, h: 52 };
const PB = { x: HPU.x + 78, y: HPU.y - 26, w: 40, h: 22 };

/* Discharge chute and IR pyrometer. */
const IR: [number, number] = [664, 120];
const AIM: [number, number] = [636, 198];

function Art() {
  const irA = (Math.atan2(AIM[1] - IR[1], AIM[0] - IR[0]) * 180) / Math.PI;
  return (
    <g>
      <GroundLine x1={560} x2={876} y={GROUND} />

      {/* ---------------- support frame and basement floor ---------------- */}
      <CoolerFrame x1={CASE.x + 4} x2={CASE.x + CASE.w - 6} top={CASE.y + CASE.h} floor={FLOOR} floorX1={0} floorX2={634} />

      {/* ---------------- cooler exhaust duct → vent fan ---------------- */}
      <Pipe pts={[[RISE_X, CASE.y + 4], [RISE_X, TOP_Y], [DUCT_X, TOP_Y], [DUCT_X, VENT.ductTop + 2]]} w={22} />
      <Flange x={RISE_X} y={62} w={22} vertical />
      <Flange x={DUCT_X} y={146} w={22} vertical />
      {/* butterfly damper on the top run */}
      <rect x={688} y={TOP_Y - 15} width={6} height={30} rx={1.5} {...PAINT.raised} />
      <rect x={687} y={TOP_Y - 21} width={8} height={6} rx={1.5} {...PAINT.body} />
      {/* exhaust thermocouple pocket */}
      <rect x={DUCT_X + 10} y={106} width={10} height={4} {...PAINT.shaft} />
      <MachineLabel x={602} y={12} size={7.5}>COOLER EXHAUST → DEDUSTING</MachineLabel>

      {/* ---------------- cooler casing, clinker bed, grate ---------------- */}
      <GrateCasing x={CASE.x} y={CASE.y} w={CASE.w} h={CASE.h} bedL={150} bedR={160} label="GRATE BED (CONTINUED) →" />
      {/* hood opening for the exhaust rise */}
      <rect x={RISE_X - 16} y={CASE.y - 4} width={32} height={8} rx={2} {...PAINT.raised} />

      {/* ---------------- compartments 4–6 and cooling fans ---------------- */}
      {FANS.map((f, i) => {
        const g = FG[i];
        return (
          <g key={i}>
            <Compartment x={slotX(i)} y={COMP_Y} w={SLOT - 9} h={COMP_H} n={i + 4} tap={tap(i)} />
            <FanSet {...f} />
            <Flange x={(g.duct[0] + g.duct[1]) / 2} y={COMP_Y + COMP_H + 10} w={g.duct[1] - g.duct[0]} vertical />
            <MachineLabel x={f.cx + 24} y={FLOOR + 24} size={7.5}>{`FAN ${i + 4}`}</MachineLabel>
          </g>
        );
      })}

      {/* ---------------- clinker discharge chute → crusher ---------------- */}
      <path d={`M 590 112 L 642 112 L 670 214 L 618 214 Z`} {...PAINT.body} />
      <path d={`M 596 120 L 636 120 L 660 210 L 626 210 Z`} {...PAINT.recess} />
      <Lumps pts={[[612, 140], [622, 156], [616, 170], [632, 178], [628, 194], [640, 202], [646, 188]]} r={2.6} />
      {/* breaker grid at the throat */}
      <rect x={612} y={214} width={62} height={24} rx={4} {...PAINT.body} />
      <rect x={617} y={218} width={52} height={16} rx={2} {...PAINT.recess} />
      {Array.from({ length: 12 }).map((_, i) => (
        <circle key={i} cx={622 + (i % 6) * 8.4} cy={222.5 + Math.floor(i / 6) * 7} r={2.6} fill={MX.material} />
      ))}
      <MachineLabel x={645} y={251} size={7}>DISCHARGE</MachineLabel>
      <MachineLabel x={645} y={261} size={7}>→ CRUSHER</MachineLabel>

      {/* ---------------- IR pyrometer on its bracket from the duct ---------------- */}
      <rect x={IR[0] + 8} y={IR[1] - 2} width={DUCT_X - 11 - IR[0] - 8} height={4} {...PAINT.shaft} />
      <rect x={DUCT_X - 14} y={IR[1] - 7} width={4} height={14} rx={1} {...PAINT.raised} />
      <g transform={`rotate(${irA} ${IR[0]} ${IR[1]})`}>
        <rect x={IR[0] - 14} y={IR[1] - 7} width={28} height={14} rx={4} {...PAINT.raised} />
        <rect x={IR[0] + 14} y={IR[1] - 4} width={5} height={8} rx={1.5} {...PAINT.recess} />
      </g>
      <line x1={IR[0] + 18 * Math.cos((irA * Math.PI) / 180)} y1={IR[1] + 18 * Math.sin((irA * Math.PI) / 180)} x2={AIM[0]} y2={AIM[1]} stroke={MX.label} strokeWidth={1} strokeDasharray="3 3" />

      {/* ---------------- grate drive: link, hydraulic cylinder ---------------- */}
      <rect x={582} y={186} width={14} height={12} rx={2} {...PAINT.raised} />
      <line x1={589} y1={192} x2={CYL.x} y2={CYL.top} stroke={MX.edge} strokeWidth={6} strokeLinecap="round" />
      <line x1={589} y1={192} x2={CYL.x} y2={CYL.top} stroke={MX.metal} strokeWidth={4} strokeLinecap="round" />
      <circle cx={589} cy={192} r={3.5} {...PAINT.shaft} />
      <rect x={CYL.x - 3} y={CYL.top} width={6} height={22} {...PAINT.shaft} />
      <circle cx={CYL.x} cy={CYL.top} r={5} {...PAINT.raised} />
      <rect x={CYL.x - 9} y={CYL.top + 18} width={18} height={CYL.bot - CYL.top - 18} rx={4} {...PAINT.cylinderV} />
      <rect x={CYL.x - 11} y={CYL.top + 16} width={22} height={6} rx={2} {...PAINT.raised} />
      <rect x={CYL.x - 11} y={CYL.bot - 6} width={22} height={6} rx={2} {...PAINT.raised} />
      {/* trunnion pedestal */}
      <path d={`M ${CYL.x - 8} ${CYL.bot} H ${CYL.x + 8} L ${CYL.x + 14} ${CYL.bot + 16} H ${CYL.x - 14} Z`} {...PAINT.body} />
      <rect x={CYL.x - 22} y={CYL.bot + 16} width={44} height={6} rx={2} {...PAINT.body} />
      {/* hydraulic hoses to the HPU */}
      <path d={`M ${CYL.x + 9} ${CYL.top + 26} H ${PB.x + 10} V ${PB.y}`} fill="none" stroke={MX.edge} strokeWidth={2.4} strokeLinejoin="round" />
      <path d={`M ${CYL.x + 9} ${CYL.bot - 12} H ${PB.x + 20} V ${PB.y}`} fill="none" stroke={MX.edge} strokeWidth={2.4} strokeLinejoin="round" />

      {/* ---------------- HPU: tank, motor-pump, pressure block ---------------- */}
      <Housing x={HPU.x} y={HPU.y} w={HPU.w} h={HPU.h} rx={6} bolts={false} />
      <rect x={HPU.x + 14} y={HPU.y + 16} width={44} height={20} rx={2} {...PAINT.recess} />
      <rect x={HPU.x + 16} y={HPU.y + 24} width={40} height={10} rx={1} fill={MX.material} />
      <rect x={HPU.x - 8} y={HPU.y + HPU.h} width={HPU.w + 16} height={GROUND - HPU.y - HPU.h} rx={2} {...PAINT.body} />
      <Motor x={HPU.x + 14} y={HPU.y - 24} w={44} h={22} terminalBox={false} />
      <rect x={HPU.x + 62} y={HPU.y - 16} width={14} height={14} rx={3} {...PAINT.raised} />
      <rect x={PB.x} y={PB.y} width={PB.w} height={PB.h} rx={4} {...PAINT.raised} />
      {[0, 1, 2].map((k) => (
        <rect key={k} x={PB.x + 6 + k * 11} y={PB.y + 6} width={6} height={10} rx={1.5} {...PAINT.recess} />
      ))}
      {/* oil return line into the tank */}
      <path d={`M ${PB.x + PB.w} ${PB.y + 11} H ${HPU.x + HPU.w - 10} V ${HPU.y + 6}`} fill="none" stroke={MX.edge} strokeWidth={2.4} strokeLinejoin="round" />
      <rect x={HPU.x + HPU.w - 15} y={HPU.y + 4} width={10} height={6} rx={1.5} {...PAINT.raised} />
      <MachineLabel x={HPU.x + HPU.w / 2} y={H - 4} size={7.5}>GRATE DRIVE / HPU</MachineLabel>

      {/* ---------------- vent fan on its platform ---------------- */}
      <rect x={758} y={DECK + 8} width={8} height={GROUND - DECK - 8} rx={1.5} {...PAINT.body} />
      <rect x={858} y={DECK + 8} width={8} height={GROUND - DECK - 8} rx={1.5} {...PAINT.body} />
      <line x1={766} y1={DECK + 34} x2={858} y2={DECK + 110} stroke={MX.edge} strokeWidth={1.3} />
      <line x1={858} y1={DECK + 34} x2={766} y2={DECK + 110} stroke={MX.edge} strokeWidth={1.3} />
      <line x1={766} y1={DECK + 34} x2={858} y2={DECK + 34} stroke={MX.edge} strokeWidth={1.3} />
      <rect x={702} y={DECK} width={172} height={8} rx={2} {...PAINT.body} />
      <Bolt x={709} y={DECK + 4} r={1.6} />
      <Bolt x={866} y={DECK + 4} r={1.6} />
      <FanSet {...VENT} />
      <MachineLabel x={812} y={DECK + 22} size={7.5}>VENT FAN</MachineLabel>
    </g>
  );
}

const pads: Record<string, [number, number]> = {};
FG.forEach((g, i) => {
  const n = i + 4;
  pads[`PRS-CLR-0${n}`] = tap(i);
  pads[`TMP-CLR-0${n}`] = g.bearing;
  pads[`ELE-CLR-0${n}`] = g.terminal;
});
Object.assign(pads, {
  "TMP-CLR-08": IR,
  "TMP-CLR-09": [DUCT_X, 108],
  "VIB-CLR-07": VG.bearingBot,
  "TMP-CLR-10": VG.bearingTop,
  "ELE-CLR-07": VG.terminal,
  "SPD-CLR-01": [CYL.x, CYL.top + 34],
  "PRS-CLR-07": [PB.x + PB.w / 2, PB.y + 11],
  "TMP-CLR-07": [HPU.x + HPU.w - 10, HPU.y + 24],
});

/** Callout boxes as on PDF page 10, next to their feature: top-left corner and width (drawing units). */
const callouts: Record<string, SheetCalloutAnchor> = {
  "PRS-CLR-04": [96.7, 202.1, 83.1],
  "TMP-CLR-04": [-4.9, 284.6, 83.1],
  "ELE-CLR-04": [5.5, 452.7, 75.1],
  "PRS-CLR-05": [293, 202.1, 85.5],
  "TMP-CLR-05": [192.4, 284.6, 83.4],
  "ELE-CLR-05": [202.8, 452.7, 73.9],
  "PRS-CLR-06": [490.1, 202.1, 84],
  "TMP-CLR-06": [394.4, 284.5, 84.3],
  "ELE-CLR-06": [400.1, 451.3, 73.9],
  "TMP-CLR-08": [606, 48, 104],
  "TMP-CLR-09": [745.1, 51.3, 93.4],
  "VIB-CLR-07": [748, 452, 100],
  "TMP-CLR-10": [800, 170, 80],
  "ELE-CLR-07": [800, 226, 80],
  "SPD-CLR-01": [618, 266, 82],
  "PRS-CLR-07": [482, 470, 100],
  "TMP-CLR-07": [482, 528, 100],
};

export const sheet: PyroSheetDrawing = { sheet: "D10", width: W, height: H, Art, pads, callouts };
