"use client";

/**
 * CSL-01 — deep-pan conveyor and clinker silo (D11, right).
 * Crushed clinker drops on the tail of an inclined deep-pan conveyor, climbs
 * to the head drive (motor + reducer on the head platform) and discharges
 * into the clinker silo. The silo carries a level radar, a roof baghouse and
 * its dust-collector fan.
 */

import React from "react";
import { Bolt, Coupling, Fan, GearWheel, GroundLine, Housing, MX, MachineLabel, Motor, PAINT } from "@/components/assets/machine-kit/machine-kit";
import type { PyroDrawing } from "../pyro-drawing-types";
import { Pipe, Silo } from "./clk-parts";

const W = 1000;
const H = 560;
const GROUND = 540;

const TAIL: [number, number] = [100, 420];
const HEAD: [number, number] = [640, 150];
const LEN = Math.hypot(HEAD[0] - TAIL[0], HEAD[1] - TAIL[1]);
const ANG = (Math.atan2(HEAD[1] - TAIL[1], HEAD[0] - TAIL[0]) * 180) / Math.PI;
/** Conveyor centre-line y at drawing x. */
const beltY = (x: number) => TAIL[1] + ((x - TAIL[0]) * (HEAD[1] - TAIL[1])) / (HEAD[0] - TAIL[0]);
const HALF = 22 / Math.cos((ANG * Math.PI) / 180);

const SILO = { x: 700, w: 240, roof: 190, cyl: 440, cone: 495 };
const MOTOR = { x: 470, y: 67, w: 70, h: 36 };
const RED = { x: 562, y: 60, w: 54, h: 50 };
const BAG = { x: 772, y: 80, w: 80, h: 96 };
const DFAN = { cx: 880, cy: 104, r: 16 };
const DMOTOR = { x: 906, y: 92, w: 40, h: 24 };
const RADAR_X = 752;

function Conveyor() {
  const pans = Math.floor(LEN / 16);
  return (
    <g transform={`translate(${TAIL[0]} ${TAIL[1]}) rotate(${ANG})`} aria-hidden="true">
      <rect x={-24} y={-22} width={LEN + 48} height={44} rx={22} {...PAINT.body} />
      <rect x={-12} y={-17} width={LEN + 24} height={16} rx={4} {...PAINT.recess} />
      <rect x={4} y={-15} width={LEN - 8} height={9} rx={2} fill={MX.material} opacity={0.9} />
      {Array.from({ length: pans }).map((_, i) => (
        <line key={i} x1={8 + i * 16} x2={8 + i * 16} y1={-17} y2={-1} stroke={MX.fine} strokeWidth={1} />
      ))}
      <line x1={0} x2={LEN} y1={9} y2={9} stroke={MX.fine} strokeWidth={1.2} strokeDasharray="6 3" />
      {[0, LEN].map((sx) => (
        <g key={sx}>
          <circle cx={sx} cy={0} r={15} {...PAINT.raised} />
          <circle cx={sx} cy={0} r={10} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
          <circle cx={sx} cy={0} r={5} {...PAINT.shaft} />
        </g>
      ))}
    </g>
  );
}

function Art() {
  const trestles = [240, 380, 520];
  return (
    <g>
      <GroundLine x1={20} x2={990} y={GROUND} />

      {/* ---------------- trestles and tail stand ---------------- */}
      {trestles.map((tx) => (
        <g key={tx}>
          <rect x={tx - 4} y={beltY(tx) + HALF - 4} width={8} height={GROUND - beltY(tx) - HALF + 4} rx={1.5} {...PAINT.body} />
          <rect x={tx - 10} y={GROUND - 5} width={20} height={6} rx={1.5} {...PAINT.raised} />
        </g>
      ))}
      <line x1={244} y1={beltY(240) + HALF + 30} x2={376} y2={GROUND - 8} stroke={MX.fine} strokeWidth={1.2} />
      <line x1={384} y1={beltY(380) + HALF + 30} x2={516} y2={GROUND - 8} stroke={MX.fine} strokeWidth={1.2} />
      <path d={`M 76 ${GROUND} L 84 444 L 116 444 L 124 ${GROUND} Z`} {...PAINT.body} />
      <Bolt x={92} y={GROUND - 8} r={1.8} />
      <Bolt x={108} y={GROUND - 8} r={1.8} />

      {/* ---------------- feed from the crusher ---------------- */}
      <path d="M 86 312 L 146 312 L 136 388 L 104 388 Z" {...PAINT.body} />
      <path d="M 96 318 L 136 318 L 128 382 L 110 382 Z" {...PAINT.recess} />
      {[[112, 334], [122, 352], [116, 370]].map(([px, py], i) => (
        <rect key={i} x={px - 3.5} y={py - 3} width={7} height={6} rx={1.5} fill={MX.material} transform={`rotate(${i * 30} ${px} ${py})`} />
      ))}
      <MachineLabel x={116} y={300} size={7.5}>FROM CRUSHER ↓</MachineLabel>

      {/* ---------------- deep-pan conveyor ---------------- */}
      <Conveyor />
      {/* tail speed pickup */}
      <rect x={TAIL[0] + 14} y={TAIL[1] + 18} width={14} height={5} {...PAINT.shaft} />
      <rect x={TAIL[0] + 26} y={TAIL[1] + 14} width={12} height={12} rx={3} {...PAINT.raised} />
      <MachineLabel x={TAIL[0] + 44} y={TAIL[1] + 36} anchor="start" size={7}>TAIL SHAFT</MachineLabel>
      <MachineLabel x={330} y={beltY(330) + 44} size={7.5} rotate={ANG}>DEEP-PAN CONVEYOR</MachineLabel>

      {/* ---------------- head discharge chute into the silo ---------------- */}
      <path d={`M 632 ${HEAD[1] + 2} L 668 ${HEAD[1] + 2} L 732 186 L 708 190 Z`} {...PAINT.body} />

      {/* ---------------- head drive platform ---------------- */}
      <rect x={452} y={116} width={6} height={beltY(455) - HALF - 112} {...PAINT.body} />
      <rect x={618} y={116} width={6} height={beltY(621) - HALF - 112} {...PAINT.body} />
      <rect x={440} y={108} width={196} height={8} rx={2} {...PAINT.body} />
      <Motor x={MOTOR.x} y={MOTOR.y} w={MOTOR.w} h={MOTOR.h} />
      <rect x={MOTOR.x + MOTOR.w} y={MOTOR.y + MOTOR.h / 2 - 3} width={RED.x - MOTOR.x - MOTOR.w} height={6} {...PAINT.shaft} />
      <Coupling x={544} y={MOTOR.y + MOTOR.h / 2 - 9} w={12} h={18} />
      {/* chain guard reducer → head sprocket */}
      <path d={`M ${RED.x + RED.w - 14} ${RED.y + 32} L ${HEAD[0] + 14} ${HEAD[1] - 8} L ${HEAD[0] - 2} ${HEAD[1] + 6} L ${RED.x + RED.w - 28} ${RED.y + 44} Z`} {...PAINT.body} />
      <Housing x={RED.x} y={RED.y} w={RED.w} h={RED.h} rx={8} bolts={false} />
      <GearWheel cx={RED.x + 20} cy={RED.y + 25} r={11} teeth={12} />
      <circle cx={RED.x + 40} cy={RED.y + 30} r={6} {...PAINT.shaft} />
      <MachineLabel x={540} y={44} size={7.5}>HEAD DRIVE</MachineLabel>

      {/* ---------------- clinker silo ---------------- */}
      <Silo x={SILO.x} w={SILO.w} roofY={SILO.roof} cylBottom={SILO.cyl} coneBottom={SILO.cone} outletW={40} legBottom={GROUND} braceFrom={505} fill={300} rail={false} />
      <MachineLabel x={SILO.x + SILO.w / 2} y={GROUND + 16} size={7.5}>CLINKER SILO</MachineLabel>
      {/* level radar */}
      <rect x={RADAR_X - 3} y={170} width={6} height={16} {...PAINT.shaft} />
      <rect x={RADAR_X - 10} y={156} width={20} height={14} rx={3} {...PAINT.raised} />
      {/* baghouse: clean-gas plenum, bag cells, pulse header */}
      <rect x={BAG.x - 4} y={BAG.y - 10} width={BAG.w + 8} height={12} rx={3} {...PAINT.raised} />
      <Housing x={BAG.x} y={BAG.y} w={BAG.w} h={BAG.h} rx={6} bolts={false} />
      {Array.from({ length: 6 }).map((_, i) => (
        <line key={i} x1={BAG.x + 14 + i * 10.4} x2={BAG.x + 14 + i * 10.4} y1={BAG.y + 14} y2={BAG.y + BAG.h - 14} stroke={MX.fine} strokeWidth={MX.wFine} />
      ))}
      <rect x={BAG.x + 10} y={BAG.y - 18} width={BAG.w - 20} height={6} rx={2} {...PAINT.shaft} />
      <MachineLabel x={BAG.x + BAG.w / 2} y={58} size={7}>BAGHOUSE</MachineLabel>
      {/* dust-collector fan and motor on a roof stand */}
      <Pipe pts={[[BAG.x + BAG.w, DFAN.cy], [DFAN.cx - DFAN.r, DFAN.cy]]} w={10} />
      <rect x={DFAN.cx - 3} y={64} width={6} height={DFAN.cy - DFAN.r - 62} {...PAINT.shaft} />
      <rect x={DFAN.cx - 7} y={60} width={14} height={5} rx={1.5} {...PAINT.raised} />
      <rect x={866} y={124} width={86} height={6} rx={1.5} {...PAINT.body} />
      <rect x={872} y={130} width={6} height={52} {...PAINT.body} />
      <rect x={940} y={130} width={6} height={60} {...PAINT.body} />
      <rect x={DFAN.cx - 10} y={DFAN.cy + 8} width={20} height={16} rx={2} {...PAINT.body} />
      <Fan cx={DFAN.cx} cy={DFAN.cy} r={DFAN.r} />
      <rect x={DMOTOR.x - 8} y={DFAN.cy - 2} width={10} height={4} {...PAINT.shaft} />
      {[0.25, 0.75].map((f) => (
        <rect key={f} x={DMOTOR.x + DMOTOR.w * f - 4} y={DMOTOR.y + DMOTOR.h - 2} width={8} height={124 - DMOTOR.y - DMOTOR.h + 2} rx={1} {...PAINT.body} />
      ))}
      <g transform={`translate(${2 * DMOTOR.x + DMOTOR.w} 0) scale(-1 1)`}>
        <Motor x={DMOTOR.x} y={DMOTOR.y} w={DMOTOR.w} h={DMOTOR.h} />
      </g>
    </g>
  );
}

export const drawing: PyroDrawing = {
  machineId: "PYR-CSL-01",
  width: W,
  height: H,
  Art,
  pads: {
    "SPD-CSL-01": TAIL,
    "VIB-CSL-01": [RED.x + 38, RED.y + 22],
    "ELE-CSL-01": [MOTOR.x + MOTOR.w / 2, MOTOR.y - MOTOR.h * 0.12],
    "PRS-CSL-01": [BAG.x + BAG.w / 2, BAG.y + 46],
    "ELE-CSL-02": [DMOTOR.x + DMOTOR.w / 2, DMOTOR.y - DMOTOR.h * 0.12],
    "LEV-CSL-01": [RADAR_X, 163],
  },
  windows: {
    "csl-conveyor": [0, 36, 840, 410],
    "csl-silo": [600, 46, 400, 180],
  },
};
