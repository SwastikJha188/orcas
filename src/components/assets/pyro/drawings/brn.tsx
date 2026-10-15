"use client";

/**
 * BRN-01 — main kiln burner, combustion air and coal firing (D08).
 * Kiln hot end with flame, outlet hood with flame camera, multi-channel
 * burner on its carriage, burner manifold, primary-air fan and header,
 * secondary air rising from the clinker cooler, fine-coal bin with CO
 * analyser, kiln coal feeder, coal conveying line and Roots blower.
 */

import React from "react";
import { Bolt, Coupling, GroundLine, Housing, MX, MachineLabel, Motor, PAINT } from "@/components/assets/machine-kit/machine-kit";
import type { PyroDrawing } from "../pyro-drawing-types";
import { FanSet, Flange, FlowArrow, Pipe, RootsBlower, Silo, Transmitter, fanGeom, type FanSpec } from "./clk-parts";

const W = 1000;
const H = 600;
const GROUND = 572;

/* Primary-air fan */
const PA: FanSpec = { cx: 400, cy: 512, r: 44, motorW: 80, motorH: 50, ductTop: 446, baseY: 560 };
const pa = fanGeom(PA);
const PA_DUCT_X = (pa.duct[0] + pa.duct[1]) / 2;

/* Burner */
const LANCE_Y = 270;
const MANI = { x: 500, y: 236, w: 62, h: 66 };
const HEADER_Y = 404;

/* Fine-coal bin */
const BIN = { x: 640, w: 120, roof: 104, cyl: 240, cone: 310 };
const FEEDER = { x: 668, y: 336, w: 64, h: 40 };
const COAL_Y = 470;

/* Roots blower set */
const BLW = { x: 900, y: 500, w: 62, h: 60 };
const BMOTOR = { x: 806, y: 508, w: 66, h: 44 };

function Art() {
  return (
    <g>
      <GroundLine x1={8} x2={992} y={GROUND} />

      {/* ---------------- kiln hot end ---------------- */}
      <rect x={10} y={196} width={170} height={148} rx={4} {...PAINT.cylinder} />
      <rect x={22} y={212} width={150} height={116} rx={6} {...PAINT.recess} />
      {/* clinker bed */}
      <path d="M 24 312 Q 90 300 170 306 L 170 326 L 24 326 Z" fill={MX.material} opacity={0.75} />
      {/* flame: hot envelope and brass core toward the burner tip */}
      <ellipse cx={92} cy={LANCE_Y} rx={80} ry={40} fill={MX.heat} />
      <ellipse cx={128} cy={LANCE_Y} rx={34} ry={13} fill={MX.material} opacity={0.55} />
      {[48, 96, 144].map((sx) => (
        <line key={sx} x1={sx} x2={sx} y1={198} y2={210} stroke={MX.fine} strokeWidth={MX.wFine} />
      ))}
      {/* outlet seal / nose ring */}
      <rect x={178} y={184} width={14} height={172} rx={4} {...PAINT.cylinderV} />

      {/* ---------------- kiln outlet hood ---------------- */}
      <Housing x={192} y={138} w={122} h={308} rx={10} bolts={false} />
      {/* refractory lining on the kiln-side wall */}
      <rect x={200} y={150} width={14} height={284} rx={2} {...PAINT.recess} />
      {Array.from({ length: 23 }).map((_, i) => (
        <line key={i} x1={200} x2={214} y1={160 + i * 12} y2={160 + i * 12} stroke={MX.fine} strokeWidth={0.8} />
      ))}
      {/* inspection doors */}
      {[196, 300].map((dy) => (
        <g key={dy}>
          <rect x={262} y={dy} width={36} height={52} rx={4} {...PAINT.raised} />
          <rect x={268} y={dy + 8} width={24} height={14} rx={2} {...PAINT.recess} />
          <line x1={294} x2={294} y1={dy + 30} y2={dy + 44} stroke={MX.edge} strokeWidth={1.6} strokeLinecap="round" />
        </g>
      ))}
      <Bolt x={302} y={150} />
      <Bolt x={302} y={434} />
      {/* flame camera on the hood roof, sight line into the kiln */}
      <rect x={236} y={128} width={8} height={12} {...PAINT.shaft} />
      <rect x={224} y={110} width={36} height={22} rx={5} {...PAINT.raised} />
      <circle cx={230} cy={121} r={4.5} {...PAINT.recess} />
      <line x1={226} y1={130} x2={140} y2={252} stroke={MX.fine} strokeWidth={1} strokeDasharray="3 3" />
      {/* secondary-air thermocouple */}
      <Transmitter x={314} y={404} dir="right" len={8} />
      {/* secondary air from the cooler */}
      <Housing x={192} y={478} w={122} h={48} rx={8} bolts={false} />
      <MachineLabel x={253} y={506} size={7.5}>CLINKER COOLER</MachineLabel>
      {[228, 278].map((ax) => (
        <FlowArrow key={ax} x1={ax} y1={474} x2={ax} y2={450} />
      ))}
      <MachineLabel x={184} y={468} anchor="end" size={7}>SECONDARY AIR →</MachineLabel>
      <MachineLabel x={95} y={366}>KILN HOT END</MachineLabel>
      <MachineLabel x={268} y={102} anchor="start" size={7.5}>FLAME CAMERA</MachineLabel>

      {/* ---------------- burner carriage platform ---------------- */}
      <rect x={314} y={306} width={300} height={8} rx={2} {...PAINT.body} />
      {Array.from({ length: 11 }).map((_, i) => (
        <line key={i} x1={330 + i * 26} x2={330 + i * 26} y1={290} y2={306} stroke={MX.fine} strokeWidth={1} />
      ))}
      <line x1={316} x2={612} y1={290} y2={290} stroke={MX.edge} strokeWidth={1.4} />
      <rect x={606} y={314} width={9} height={GROUND - 314} rx={1.5} {...PAINT.body} />
      <path d="M 314 314 L 340 314 L 314 338 Z" {...PAINT.body} />
      {/* carriage */}
      <rect x={378} y={281} width={92} height={14} rx={3} {...PAINT.raised} />
      {[392, 456].map((wx) => (
        <g key={wx}>
          <circle cx={wx} cy={299} r={6} {...PAINT.shaft} stroke={MX.edge} strokeWidth={1.2} />
          <circle cx={wx} cy={299} r={1.8} fill={MX.deep} />
        </g>
      ))}
      <MachineLabel x={424} y={330} size={7.5}>BURNER CARRIAGE</MachineLabel>

      {/* ---------------- multi-channel burner lance ---------------- */}
      <rect x={150} y={LANCE_Y - 8} width={MANI.x - 150} height={16} rx={3} {...PAINT.shaft} />
      <rect x={142} y={LANCE_Y - 10} width={14} height={20} rx={3} {...PAINT.raised} />
      <line x1={326} x2={326} y1={LANCE_Y - 9} y2={LANCE_Y + 9} stroke={MX.edge} strokeWidth={1} />
      <Flange x={488} y={LANCE_Y} w={16} />
      <MachineLabel x={410} y={252} size={7.5}>MULTI-CHANNEL BURNER</MachineLabel>

      {/* ---------------- primary air: header and fan ---------------- */}
      <Pipe pts={[[MANI.x + 30, MANI.y + MANI.h], [MANI.x + 30, HEADER_Y], [PA_DUCT_X, HEADER_Y], [PA_DUCT_X, PA.ductTop + 2]]} w={16} />
      <Flange x={PA_DUCT_X} y={PA.ductTop + 4} w={pa.duct[1] - pa.duct[0]} vertical />
      <FanSet {...PA} />
      <MachineLabel x={470} y={592}>PRIMARY-AIR FAN</MachineLabel>

      {/* ---------------- burner manifold (axial / swirl / coal channels) ---------------- */}
      <Housing x={MANI.x} y={MANI.y} w={MANI.w} h={MANI.h} rx={8} panel={[12, 24, 38, 18]} />
      <Transmitter x={516} y={MANI.y} dir="up" len={12} />
      <Transmitter x={546} y={MANI.y} dir="up" len={12} />

      {/* ---------------- coal conveying line ---------------- */}
      <Pipe pts={[[MANI.x + MANI.w, LANCE_Y], [588, LANCE_Y], [588, COAL_Y], [BLW.x + BLW.w / 2, COAL_Y], [BLW.x + BLW.w / 2, BLW.y]]} w={14} />
      <Flange x={720} y={COAL_Y} w={14} />
      <Flange x={588} y={380} w={14} vertical />
      <MachineLabel x={836} y={460} size={7}>← COAL TO BURNER</MachineLabel>

      {/* ---------------- fine-coal bin ---------------- */}
      <Silo x={BIN.x} w={BIN.w} roofY={BIN.roof} cylBottom={BIN.cyl} coneBottom={BIN.cone} outletW={26} legBottom={GROUND} braceFrom={490} />
      {/* level radar on the roof */}
      <rect x={697} y={84} width={6} height={14} {...PAINT.shaft} />
      <rect x={690} y={74} width={20} height={12} rx={3} {...PAINT.raised} />
      {/* bin temperature thermowell */}
      <Transmitter x={BIN.x} y={214} dir="left" len={8} />
      <MachineLabel x={634} y={232} anchor="end" size={7.5}>FINE-COAL BIN</MachineLabel>
      {/* CO analyser on its bracket, sample line to the bin roof */}
      <rect x={612} y={146} width={28} height={5} {...PAINT.shaft} />
      <rect x={560} y={118} width={54} height={40} rx={6} {...PAINT.body} />
      <rect x={567} y={125} width={26} height={14} rx={2} {...PAINT.recess} />
      <circle cx={603} cy={132} r={3} {...PAINT.raised} />
      <path d="M 587 118 L 587 102 L 652 102" fill="none" stroke={MX.fine} strokeWidth={1.2} strokeDasharray="3 2" />
      <MachineLabel x={587} y={172} size={7}>CO ANALYSER</MachineLabel>

      {/* ---------------- kiln coal feeder ---------------- */}
      <rect x={693} y={FEEDER.y + FEEDER.h} width={14} height={COAL_Y - FEEDER.y - FEEDER.h - 6} {...PAINT.shaft} />
      <Housing x={FEEDER.x} y={FEEDER.y} w={FEEDER.w} h={FEEDER.h} rx={7} bolts={false} />
      <circle cx={700} cy={FEEDER.y + 20} r={13} {...PAINT.recess} />
      {[0, 60, 120].map((a) => (
        <line key={a} x1={700} y1={FEEDER.y + 8} x2={700} y2={FEEDER.y + 32} stroke={MX.edge} strokeWidth={1.4} transform={`rotate(${a} 700 ${FEEDER.y + 20})`} />
      ))}
      <circle cx={700} cy={FEEDER.y + 20} r={3} {...PAINT.shaft} />
      <MachineLabel x={766} y={360} anchor="start" size={7.5}>KILN COAL FEEDER</MachineLabel>

      {/* ---------------- coal conveying (Roots) blower and motor ---------------- */}
      <rect x={BMOTOR.x - 16} y={560} width={BLW.x + BLW.w - BMOTOR.x + 24} height={8} rx={2} {...PAINT.body} />
      {[BMOTOR.x + 10, BMOTOR.x + BMOTOR.w - 22].map((fx) => (
        <rect key={fx} x={fx} y={BMOTOR.y + BMOTOR.h - 2} width={12} height={560 - BMOTOR.y - BMOTOR.h + 2} rx={1.5} {...PAINT.body} />
      ))}
      <Motor x={BMOTOR.x} y={BMOTOR.y} w={BMOTOR.w} h={BMOTOR.h} />
      <rect x={BMOTOR.x + BMOTOR.w} y={528} width={BLW.x - BMOTOR.x - BMOTOR.w} height={6} {...PAINT.shaft} />
      <Coupling x={877} y={521} w={13} h={20} />
      <RootsBlower x={BLW.x} y={BLW.y} w={BLW.w} h={BLW.h} />
      <MachineLabel x={884} y={592}>COAL CONVEYING BLOWER</MachineLabel>
    </g>
  );
}

export const drawing: PyroDrawing = {
  machineId: "PYR-BRN-01",
  width: W,
  height: H,
  Art,
  pads: {
    // burner & combustion air
    "CAM-BRN-01": [244, 121],
    "PRS-BRN-01": [516, 218],
    "PRS-BRN-02": [546, 218],
    "TMP-BRN-02": [328, 404],
    // primary-air fan
    "PRS-BRN-03": [470, HEADER_Y],
    "VIB-BRN-01": pa.bearingTop,
    "TMP-BRN-01": pa.bearingBot,
    "ELE-BRN-01": pa.terminal,
    // fine-coal bin
    "TMP-BRN-04": [628, 214],
    "GAS-BRN-01": [580, 132],
    "LEV-BRN-01": [700, 80],
    // coal feeder & conveying
    "FLO-BRN-01": [718, 356],
    "PRS-BRN-04": [620, COAL_Y],
    "VIB-BRN-02": [BLW.x + BLW.w / 2, BLW.y + BLW.h / 2],
    "ELE-BRN-02": [BMOTOR.x + BMOTOR.w / 2, BMOTOR.y - BMOTOR.h * 0.12],
  },
  windows: {
    "brn-burner": [0, 92, 700, 340],
    "brn-pafan": [300, 370, 520, 230],
    "brn-coalbin": [430, 56, 560, 250],
    "brn-coalfeed": [470, 330, 530, 255],
  },
};
