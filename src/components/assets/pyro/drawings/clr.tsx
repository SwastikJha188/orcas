"use client";

/**
 * CLR-01 — reciprocating grate cooler (D09 + D10 in one drawing).
 * Hot clinker from the kiln falls on the grate at the left and travels right
 * over six under-grate air compartments, each fed by its own cooling fan.
 * At the right: hydraulic grate drive with its power unit, clinker discharge
 * to the hammer crusher with the IR pyrometer, cooler exhaust duct to
 * dedusting and the vent fan.
 */

import React from "react";
import { Bolt, CornerBolts, GroundLine, Housing, MX, MachineLabel, Motor, PAINT } from "@/components/assets/machine-kit/machine-kit";
import type { PyroDrawing } from "../pyro-drawing-types";
import { FanSet, Flange, Pipe, Transmitter, fanGeom, type FanSpec } from "./clk-parts";

const W = 1210;
const H = 480;
const GROUND = 450;

const CASE = { x: 40, y: 92, w: 920, h: 158 };
const COMP_Y = 254;
const COMP_H = 68;
const SLOT = 150;

const slotX = (i: number) => CASE.x + i * SLOT;

/* Six cooling fans under compartments 1–6 (1–3 larger, hot zone). */
const FANS: FanSpec[] = Array.from({ length: 6 }, (_, i) => {
  const r = i < 3 ? 30 : 26;
  return {
    cx: slotX(i) + 14 + r,
    cy: 440 - 4 - r,
    r,
    motorW: i < 3 ? 46 : 40,
    motorH: i < 3 ? 32 : 28,
    ductTop: COMP_Y + COMP_H,
    baseY: 440,
  };
});
const FG = FANS.map(fanGeom);

/* Compartment pressure taps. */
const tap = (i: number): [number, number] => [slotX(i) + 118, 284];

/* Vent fan on its platform, motor to the right. */
const VENT: FanSpec = { cx: 1085, cy: 202, r: 34, motorW: 46, motorH: 32, ductTop: 122, baseY: 240 };
const VG = fanGeom(VENT);
const VENT_DUCT_X = (VG.duct[0] + VG.duct[1]) / 2;
const EXH_X = 892;

/* Grate drive: lever, horizontal cylinder, power unit under the vent platform. */
const LEVER_X = 950;
const CYL_Y = 382;
const HPU = { x: 1080, y: 404, w: 100, h: 36 };

function Art() {
  return (
    <g>
      <GroundLine x1={8} x2={1202} y={GROUND} />

      {/* ---------------- exhaust duct to dedusting ---------------- */}
      <Pipe pts={[[EXH_X, CASE.y + 2], [EXH_X, 52], [VENT_DUCT_X, 52], [VENT_DUCT_X, VENT.ductTop + 2]]} w={24} />
      <Flange x={EXH_X} y={74} w={24} vertical />
      <Flange x={VENT_DUCT_X} y={110} w={24} vertical />
      <MachineLabel x={980} y={32} size={7.5}>COOLER EXHAUST → DEDUSTING</MachineLabel>

      {/* ---------------- inlet chute from the kiln ---------------- */}
      <path d="M 22 18 L 116 18 L 140 96 L 42 96 Z" {...PAINT.body} />
      <path d="M 34 28 L 106 28 L 126 92 L 50 92 Z" {...PAINT.recess} />
      <ellipse cx={84} cy={70} rx={24} ry={18} fill={MX.heat} />
      {[[66, 44], [80, 58], [72, 74], [92, 66], [98, 84], [84, 86], [62, 82]].map(([px, py], i) => (
        <circle key={i} cx={px} cy={py} r={3} fill={MX.material} />
      ))}
      <MachineLabel x={150} y={34} anchor="start" size={7.5}>HOT CLINKER FROM KILN</MachineLabel>

      {/* ---------------- cooler casing, clinker bed, grate ---------------- */}
      <rect x={CASE.x - 4} y={CASE.y + CASE.h} width={8} height={GROUND - CASE.y - CASE.h} rx={1.5} {...PAINT.body} />
      <Housing x={CASE.x} y={CASE.y} w={CASE.w} h={CASE.h} rx={10} bolts={false} />
      <CornerBolts x={CASE.x} y={CASE.y} w={CASE.w} h={30} inset={10} />
      <rect x={54} y={122} width={892} height={118} rx={5} {...PAINT.recess} />
      <path d="M 56 236 L 56 160 Q 260 166 520 192 Q 760 210 944 216 L 944 236 Z" fill={MX.material} opacity={0.8} />
      <ellipse cx={200} cy={196} rx={142} ry={40} fill={MX.heat} transform="translate(400 0) scale(-1 1)" />
      {[0, 1, 2].map((k) => (
        <path key={k} d={`M 60 ${178 + k * 18} Q 400 ${196 + k * 13} 940 ${220 + k * 5}`} {...PAINT.hair} opacity={0.6} />
      ))}
      {Array.from({ length: 74 }).map((_, i) => (
        <rect key={i} x={56 + i * 12} y={237} width={10} height={7} rx={1.2} {...PAINT.raised} />
      ))}
      <MachineLabel x={500} y={112} size={7.5}>GRATE BED · CLINKER TRAVELS →</MachineLabel>

      {/* ---------------- compartments 1–6 with cooling fans ---------------- */}
      {FANS.map((f, i) => {
        const x0 = slotX(i);
        const g = FG[i];
        return (
          <g key={i}>
            <Housing x={x0 + 2} y={COMP_Y} w={SLOT - 4} h={COMP_H} rx={6} bolts={false} />
            <MachineLabel x={x0 + 14} y={COMP_Y + 56} anchor="start" size={7}>{`COMPARTMENT ${i + 1}`}</MachineLabel>
            <rect x={tap(i)[0] - 7} y={tap(i)[1] - 6} width={14} height={12} rx={3} {...PAINT.raised} />
            <FanSet {...f} />
            <Flange x={(g.duct[0] + g.duct[1]) / 2} y={COMP_Y + COMP_H + 8} w={g.duct[1] - g.duct[0]} vertical />
            <MachineLabel x={f.cx + 30} y={468} size={7.5}>{`FAN ${i + 1}`}</MachineLabel>
          </g>
        );
      })}

      {/* ---------------- clinker discharge to the crusher ---------------- */}
      <path d="M 958 176 L 1034 176 L 1016 318 L 978 318 Z" {...PAINT.body} />
      <path d="M 966 184 L 1024 184 L 1009 312 L 985 312 Z" {...PAINT.recess} />
      {Array.from({ length: 9 }).map((_, i) => (
        <circle key={i} cx={990 + ((i * 7) % 15)} cy={198 + i * 12} r={2.6} fill={MX.material} />
      ))}
      <MachineLabel x={997} y={336} size={7}>↓ TO CRUSHER</MachineLabel>
      {/* IR pyrometer on its bracket above the discharge throat */}
      <rect x={960} y={138} width={18} height={4} {...PAINT.shaft} />
      <rect x={976} y={130} width={28} height={18} rx={4} {...PAINT.raised} />
      <circle cx={998} cy={145} r={2.8} {...PAINT.recess} />
      <line x1={996} y1={148} x2={996} y2={262} stroke={MX.fine} strokeWidth={1} strokeDasharray="3 3" />

      {/* ---------------- grate drive: lever, cylinder, HPU ---------------- */}
      <rect x={LEVER_X - 3} y={250} width={6} height={CYL_Y - 246} rx={2} {...PAINT.shaft} />
      <circle cx={LEVER_X} cy={252} r={5} {...PAINT.raised} />
      <circle cx={LEVER_X} cy={CYL_Y} r={5} {...PAINT.raised} />
      <rect x={LEVER_X} y={CYL_Y - 3} width={30} height={6} {...PAINT.shaft} />
      <rect x={978} y={CYL_Y - 9} width={58} height={18} rx={4} {...PAINT.cylinder} />
      <line x1={1000} x2={1000} y1={CYL_Y - 8} y2={CYL_Y + 8} stroke={MX.fine} strokeWidth={1} />
      <rect x={1036} y={CYL_Y - 5} width={10} height={10} rx={2} {...PAINT.raised} />
      <rect x={1046} y={CYL_Y - 14} width={10} height={GROUND - CYL_Y + 14} rx={1.5} {...PAINT.body} />
      {/* hydraulic hoses */}
      <path d={`M 1146 ${HPU.y - 22} L 1146 360 L 1016 360 L 1016 ${CYL_Y - 9}`} fill="none" stroke={MX.edge} strokeWidth={2.6} strokeLinejoin="round" />
      <path d={`M 1152 ${HPU.y - 22} L 1152 354 L 1026 354 L 1026 ${CYL_Y - 9}`} fill="none" stroke={MX.edge} strokeWidth={2.6} strokeLinejoin="round" />
      {/* power unit: tank with sight glass, motor-pump, pressure transmitter */}
      <Housing x={HPU.x} y={HPU.y} w={HPU.w} h={HPU.h} rx={6} bolts={false} />
      <rect x={HPU.x + 12} y={HPU.y + 10} width={34} height={16} rx={2} {...PAINT.recess} />
      <rect x={HPU.x + 14} y={HPU.y + 17} width={30} height={7} rx={1} fill={MX.material} />
      <Motor x={HPU.x + 12} y={HPU.y - 24} w={38} h={22} terminalBox={false} />
      <rect x={HPU.x + 56} y={HPU.y - 26} width={22} height={24} rx={4} {...PAINT.raised} />
      <Transmitter x={HPU.x + 86} y={HPU.y - 14} dir="right" len={6} />
      <rect x={HPU.x - 6} y={HPU.y + HPU.h} width={HPU.w + 12} height={6} rx={2} {...PAINT.body} />
      <MachineLabel x={1130} y={468} size={7.5}>GRATE DRIVE / HPU</MachineLabel>

      {/* ---------------- vent fan on its platform ---------------- */}
      <rect x={1062} y={256} width={8} height={GROUND - 256} rx={1.5} {...PAINT.body} />
      <rect x={1192} y={256} width={8} height={GROUND - 256} rx={1.5} {...PAINT.body} />
      <line x1={1070} y1={262} x2={1192} y2={330} stroke={MX.edge} strokeWidth={1.3} />
      <line x1={1192} y1={262} x2={1070} y2={330} stroke={MX.edge} strokeWidth={1.3} />
      <rect x={1040} y={248} width={166} height={8} rx={2} {...PAINT.body} />
      <Bolt x={1048} y={252} r={1.6} />
      <FanSet {...VENT} />
      <MachineLabel x={1132} y={276} size={7.5}>VENT FAN</MachineLabel>
    </g>
  );
}

const pads: Record<string, [number, number]> = {};
FANS.forEach((_, i) => {
  const n = i + 1;
  const g = FG[i];
  pads[`PRS-CLR-0${n}`] = tap(i);
  if (i < 3) {
    pads[`TMP-CLR-0${n}`] = g.bearingTop;
    pads[`VIB-CLR-0${n}`] = g.bearingBot;
  } else {
    pads[`TMP-CLR-0${n}`] = g.bearing;
  }
  pads[`ELE-CLR-0${n}`] = g.terminal;
});
Object.assign(pads, {
  "SPD-CLR-01": [1007, CYL_Y],
  "PRS-CLR-07": [HPU.x + 92, HPU.y - 14],
  "TMP-CLR-07": [HPU.x + 72, HPU.y + 20],
  "TMP-CLR-08": [990, 139],
  "TMP-CLR-09": [VENT_DUCT_X, 90],
  "TMP-CLR-10": VG.bearingTop,
  "VIB-CLR-07": VG.bearingBot,
  "ELE-CLR-07": VG.terminal,
});

export const drawing: PyroDrawing = {
  machineId: "PYR-CLR-01",
  width: W,
  height: H,
  Art,
  pads,
  windows: {
    "clr-hot": [30, 96, 470, 232],
    "clr-cold": [480, 96, 480, 236],
    "clr-fans13": [30, 296, 470, 184],
    "clr-fans46": [484, 296, 466, 184],
    "clr-drive": [900, 300, 310, 150],
    "clr-discharge": [830, 110, 380, 170],
    "clr-vent": [790, 40, 420, 205],
  },
};
