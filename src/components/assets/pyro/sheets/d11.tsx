"use client";

/**
 * D11 — HMR-01 clinker hammer crusher + CSL-01 deep-pan conveyor and clinker
 * silo. Left: crusher motor, coupling with the rotor speed pickup and the
 * hammer crusher (clinker from the cooler enters at the top) between its two
 * rotor bearing blocks, on the crusher floor. Crushed clinker drops on the
 * tail of the inclined deep-pan conveyor, which climbs to its head drive and
 * discharges into the clinker silo; the silo roof carries the level radar
 * and the baghouse with its dust-collector fan.
 */

import React from "react";
import { Bolt, Coupling, GearWheel, GroundLine, Housing, MX, MachineLabel, Motor, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Pipe, Silo } from "../drawings/clk-parts";
import type { PyroSheetDrawing, SheetCalloutAnchor } from "./sheet-types";
import { Lumps } from "./sc-parts";

const W = 880;
const H = 560;
const GROUND = 532;

/* ---------------- crusher line ---------------- */
const SY = 256; // shaft centre line
const SLAB = 340; // crusher floor top
const BED = 324; // bed-plate top
const MOTOR = { x: 36, y: 218, w: 126, h: 76 };
const CPL = { x: 186, w: 22, h: 40 };
const SPD_X = 226;
const DE = 250;
const NDE = 414;
const ROT = { cx: 332, cy: SY, r: 40 };

/* ---------------- deep-pan conveyor ---------------- */
const TAIL: [number, number] = [452, 414];
const HEAD: [number, number] = [650, 196];
const LEN = Math.hypot(HEAD[0] - TAIL[0], HEAD[1] - TAIL[1]);
const ANG = (Math.atan2(HEAD[1] - TAIL[1], HEAD[0] - TAIL[0]) * 180) / Math.PI;
const beltY = (x: number) => TAIL[1] + ((x - TAIL[0]) * (HEAD[1] - TAIL[1])) / (HEAD[0] - TAIL[0]);
const HALF = 12 / Math.cos((ANG * Math.PI) / 180);
const DMOT = { x: 548, y: 150, w: 50, h: 30 };
const RED = { x: 606, y: 138, w: 38, h: 38 };

/* ---------------- clinker silo ---------------- */
const SILO = { x: 686, w: 148, roof: 214, cyl: 392, cone: 452 };
const RADAR_X = 734;
const BAG = { x: 752, y: 106, w: 70, h: 80 };
const DFAN = { cx: 858, cy: 80, r: 13 };
const FMOT = { x: 810, y: 70, w: 30, h: 20 };

function BearingBlock({ cx }: { cx: number }) {
  return (
    <g aria-hidden="true">
      <path d={`M ${cx - 9} ${SY + 22} H ${cx + 9} L ${cx + 14} ${BED} H ${cx - 14} Z`} {...PAINT.body} />
      <rect x={cx - 12} y={SY - 26} width={24} height={52} rx={6} {...PAINT.raised} />
      <line x1={cx - 10} x2={cx + 10} y1={SY} y2={SY} stroke={MX.fine} strokeWidth={MX.wFine} />
      <Bolt x={cx - 10} y={BED - 5} r={1.6} />
      <Bolt x={cx + 10} y={BED - 5} r={1.6} />
    </g>
  );
}

/** Closed sloping chute with clinker running down it. */
function Chute({ from, to, w }: { from: [number, number]; to: [number, number]; w: number }) {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const a = (Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI;
  return (
    <g transform={`translate(${from[0]} ${from[1]}) rotate(${a})`} aria-hidden="true">
      <rect x={0} y={-w / 2} width={len} height={w} rx={3} {...PAINT.body} />
      <rect x={4} y={-w / 2 + 3} width={len - 8} height={w - 6} rx={2} {...PAINT.recess} />
      <rect x={6} y={1} width={len - 12} height={w / 2 - 5} rx={1.5} fill={MX.material} />
      <rect x={len - 4} y={-w / 2 - 2} width={6} height={w + 4} rx={1.5} {...PAINT.raised} />
    </g>
  );
}

function Conveyor() {
  const pans = Math.floor(LEN / 12);
  return (
    <g transform={`translate(${TAIL[0]} ${TAIL[1]}) rotate(${ANG})`} aria-hidden="true">
      <rect x={-16} y={-12} width={LEN + 32} height={24} rx={12} {...PAINT.body} />
      <rect x={-6} y={-8} width={LEN + 12} height={8} rx={2} {...PAINT.recess} />
      {Array.from({ length: Math.floor(LEN / 22) }).map((_, i) => (
        <rect key={i} x={6 + i * 22} y={-7} width={13} height={6} rx={1.5} fill={MX.material} />
      ))}
      {Array.from({ length: pans }).map((_, i) => (
        <line key={i} x1={4 + i * 12} x2={4 + i * 12} y1={-8} y2={0} stroke={MX.fine} strokeWidth={0.8} />
      ))}
      <line x1={0} x2={LEN} y1={5} y2={5} stroke={MX.fine} strokeWidth={1} strokeDasharray="5 3" />
      {[0, LEN].map((sx) => (
        <g key={sx}>
          <circle cx={sx} cy={0} r={10} {...PAINT.raised} />
          <circle cx={sx} cy={0} r={4} {...PAINT.shaft} />
        </g>
      ))}
    </g>
  );
}

function Art() {
  const hammers = 6;
  return (
    <g>
      <GroundLine x1={0} x2={880} y={GROUND} />

      {/* ================= crusher floor ================= */}
      {[14, 200, 300, 422].map((cx) => (
        <g key={cx}>
          <rect x={cx - 5} y={SLAB + 12} width={10} height={GROUND - SLAB - 12} rx={1.5} {...PAINT.body} />
          <rect x={cx - 10} y={GROUND - 5} width={20} height={6} rx={1.5} {...PAINT.raised} />
        </g>
      ))}
      <rect x={0} y={SLAB} width={430} height={12} rx={2} {...PAINT.body} />
      {[30, 120, 230, 400].map((bx) => (
        <Bolt key={bx} x={bx} y={SLAB + 6} r={1.6} />
      ))}

      {/* discharge chute: crusher outlet → conveyor tail */}
      <path d={`M 312 ${SLAB + 12} L 366 ${SLAB + 12} L 366 ${SLAB + 22} L ${TAIL[0] + 26} ${TAIL[1] - 22} L ${TAIL[0] + 6} ${TAIL[1] - 10} L 336 ${SLAB + 34} L 312 ${SLAB + 22} Z`} {...PAINT.body} />
      <path d={`M 320 ${SLAB + 15} L 358 ${SLAB + 15} L 358 ${SLAB + 24} L ${TAIL[0] + 18} ${TAIL[1] - 20} L ${TAIL[0] + 8} ${TAIL[1] - 14} L 338 ${SLAB + 28} L 320 ${SLAB + 20} Z`} {...PAINT.recess} />
      <Lumps pts={[[340, 358], [362, 370], [384, 378], [406, 386], [428, 393]]} r={2.4} />

      {/* ================= deep-pan conveyor ================= */}
      {[534, 600].map((tx) => (
        <g key={tx}>
          <rect x={tx - 4} y={beltY(tx) + HALF - 2} width={8} height={GROUND - beltY(tx) - HALF + 2} rx={1.5} {...PAINT.body} />
          <rect x={tx - 10} y={GROUND - 5} width={20} height={6} rx={1.5} {...PAINT.raised} />
        </g>
      ))}
      <line x1={538} y1={beltY(534) + HALF + 26} x2={596} y2={GROUND - 8} stroke={MX.fine} strokeWidth={1.2} />
      {/* tail stand */}
      <path d={`M ${TAIL[0] - 12} ${GROUND} L ${TAIL[0] - 6} ${TAIL[1] + 10} L ${TAIL[0] + 6} ${TAIL[1] + 10} L ${TAIL[0] + 12} ${GROUND} Z`} {...PAINT.body} />
      <Conveyor />
      <MachineLabel x={TAIL[0] + 18} y={TAIL[1] + 30} anchor="start" size={7}>TAIL SHAFT</MachineLabel>
      <MachineLabel x={516 + 24 * Math.sin((ANG * Math.PI) / 180)} y={beltY(516) - 24 * Math.cos((ANG * Math.PI) / 180)} size={7.5} rotate={ANG}>DEEP-PAN CONVEYOR</MachineLabel>

      {/* head drive: platform, motor, coupling, reducer, chain guard to head sprocket */}
      <rect x={556} y={DMOT.y + DMOT.h + 6} width={6} height={beltY(559) - HALF - DMOT.y - DMOT.h - 4} {...PAINT.body} />
      <rect x={538} y={DMOT.y + DMOT.h} width={112} height={6} rx={1.5} {...PAINT.body} />
      <path d={`M ${RED.x + 22} ${RED.y + RED.h - 6} L ${HEAD[0] + 10} ${HEAD[1] - 4} L ${HEAD[0] - 4} ${HEAD[1] + 8} L ${RED.x + 10} ${RED.y + RED.h} Z`} {...PAINT.body} />
      <Motor x={DMOT.x} y={DMOT.y} w={DMOT.w} h={DMOT.h} />
      <Coupling x={DMOT.x + DMOT.w + 6} y={DMOT.y + DMOT.h / 2 - 7} w={9} h={14} />
      <Housing x={RED.x} y={RED.y} w={RED.w} h={RED.h} rx={6} bolts={false} />
      <GearWheel cx={RED.x + 14} cy={RED.y + 21} r={8} teeth={10} />
      <circle cx={RED.x + 28} cy={RED.y + 25} r={4.5} {...PAINT.shaft} />
      <MachineLabel x={DMOT.x + 46} y={DMOT.y - 20} size={7}>HEAD DRIVE</MachineLabel>

      {/* head discharge chute into the silo roof */}
      <Chute from={[HEAD[0] + 4, HEAD[1] - 6]} to={[712, SILO.roof - 4]} w={14} />

      {/* ================= clinker silo ================= */}
      <Silo x={SILO.x} w={SILO.w} roofY={SILO.roof} cylBottom={SILO.cyl} coneBottom={SILO.cone} outletW={30} legBottom={GROUND} braceFrom={470} fill={300} />
      <MachineLabel x={SILO.x + SILO.w / 2} y={H - 8} size={7.5}>CLINKER SILO</MachineLabel>
      {/* level radar */}
      <rect x={RADAR_X - 2.5} y={SILO.roof - 18} width={5} height={14} {...PAINT.shaft} />
      <rect x={RADAR_X - 9} y={SILO.roof - 32} width={18} height={14} rx={3} {...PAINT.raised} />

      {/* baghouse: hopper, bag cells, clean-gas plenum, pulse header */}
      <path d={`M ${BAG.x + 4} ${BAG.y + BAG.h} H ${BAG.x + BAG.w - 4} L ${BAG.x + BAG.w - 18} ${SILO.roof - 8} H ${BAG.x + 18} Z`} {...PAINT.body} />
      <Housing x={BAG.x} y={BAG.y} w={BAG.w} h={BAG.h} rx={5} bolts={false} />
      {Array.from({ length: 5 }).map((_, i) => (
        <line key={i} x1={BAG.x + 15 + i * 10} x2={BAG.x + 15 + i * 10} y1={BAG.y + 14} y2={BAG.y + BAG.h - 10} stroke={MX.fine} strokeWidth={MX.wFine} />
      ))}
      <rect x={BAG.x - 3} y={BAG.y - 10} width={BAG.w + 6} height={11} rx={3} {...PAINT.raised} />
      {/* DP transmitter across dirty / clean plenums */}
      <rect x={BAG.x - 16} y={BAG.y + 2} width={14} height={12} rx={3} {...PAINT.raised} />
      <path d={`M ${BAG.x - 2} ${BAG.y + 5} H ${BAG.x + 2} M ${BAG.x - 2} ${BAG.y + 11} H ${BAG.x + 2}`} stroke={MX.edge} strokeWidth={1.4} />
      <MachineLabel x={BAG.x - 22} y={BAG.y + 46} anchor="end" size={7}>BAGHOUSE</MachineLabel>

      {/* dust-collector fan and motor on the baghouse roof */}
      <Pipe pts={[[BAG.x + BAG.w, BAG.y + 34], [DFAN.cx, BAG.y + 34], [DFAN.cx, DFAN.cy + DFAN.r]]} w={9} />
      <rect x={FMOT.x - 4} y={FMOT.y + FMOT.h} width={FMOT.w + 8} height={BAG.y - 10 - FMOT.y - FMOT.h} rx={1.5} {...PAINT.body} />
      <Motor x={FMOT.x} y={FMOT.y} w={FMOT.w} h={FMOT.h} />
      <rect x={DFAN.cx - 9} y={DFAN.cy - DFAN.r - 3} width={18} height={2 * DFAN.r + 6} rx={4} {...PAINT.body} />
      <circle cx={DFAN.cx} cy={DFAN.cy} r={DFAN.r} {...PAINT.raised} />
      <circle cx={DFAN.cx} cy={DFAN.cy} r={DFAN.r * 0.72} {...PAINT.recess} />
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <line key={a} x1={DFAN.cx} y1={DFAN.cy} x2={DFAN.cx + Math.cos((a * Math.PI) / 180) * DFAN.r * 0.66} y2={DFAN.cy + Math.sin((a * Math.PI) / 180) * DFAN.r * 0.66} stroke={MX.edge} strokeWidth={1.2} />
      ))}
      <circle cx={DFAN.cx} cy={DFAN.cy} r={2.4} {...PAINT.shaft} />

      {/* ================= crusher line ================= */}
      {/* bed plates */}
      <rect x={16} y={BED} width={204} height={SLAB - BED} rx={2} {...PAINT.raised} />
      <rect x={232} y={BED} width={196} height={SLAB - BED} rx={2} {...PAINT.raised} />
      {[30, 206, 246, 414].map((bx) => (
        <Bolt key={bx} x={bx} y={BED + 8} r={1.6} />
      ))}
      {/* crusher motor */}
      {[0.2, 0.8].map((f) => (
        <rect key={f} x={MOTOR.x + MOTOR.w * f - 12} y={MOTOR.y + MOTOR.h - 4} width={24} height={BED - MOTOR.y - MOTOR.h + 4} rx={2} {...PAINT.body} />
      ))}
      <Motor x={MOTOR.x} y={MOTOR.y} w={MOTOR.w} h={MOTOR.h} />
      <MachineLabel x={MOTOR.x + MOTOR.w / 2 - 8} y={SLAB + 30} size={7.5}>CRUSHER MOTOR</MachineLabel>

      {/* drive shaft, coupling, speed wheel + pickup */}
      <rect x={MOTOR.x + MOTOR.w} y={SY - 5} width={NDE + 16 - MOTOR.x - MOTOR.w} height={10} rx={2} {...PAINT.shaft} />
      <Coupling x={CPL.x} y={SY - CPL.h / 2} w={CPL.w} h={CPL.h} />
      <rect x={SPD_X - 6} y={SY - 10} width={12} height={20} rx={2} {...PAINT.raised} />
      <rect x={SPD_X - 2} y={SY + 10} width={4} height={14} {...PAINT.shaft} />
      <rect x={SPD_X - 6} y={SY + 24} width={12} height={8} rx={2} {...PAINT.body} />

      {/* crusher casing, feed inlet and rotor */}
      <rect x={321} y={70} width={22} height={64} rx={3} {...PAINT.cylinderV} />
      <rect x={327} y={76} width={10} height={54} rx={2} {...PAINT.recess} />
      <Lumps pts={[[332, 88], [331, 104], [333, 120]]} r={2.4} />
      <rect x={293} y={130} width={78} height={30} rx={4} {...PAINT.body} />
      <rect x={300} y={137} width={64} height={16} rx={2} {...PAINT.recess} />
      <path d={`M 262 ${BED} L 262 202 L 300 160 L 364 160 L 402 202 L 402 ${BED} Z`} {...PAINT.body} />
      <path d={`M 270 ${BED - 7} L 270 205 L 304 168 L 360 168 L 394 205 L 394 ${BED - 7} Z`} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      <circle cx={ROT.cx} cy={ROT.cy} r={ROT.r + 4} {...PAINT.recess} />
      <circle cx={ROT.cx} cy={ROT.cy} r={ROT.r} {...PAINT.raised} />
      <circle cx={ROT.cx} cy={ROT.cy} r={ROT.r * 0.8} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      {Array.from({ length: hammers }).map((_, i) => {
        const a = ((i * 360) / hammers) * (Math.PI / 180);
        const hx = ROT.cx + Math.cos(a) * ROT.r * 0.6;
        const hy = ROT.cy + Math.sin(a) * ROT.r * 0.6;
        return <rect key={i} x={hx - 5.5} y={hy - 4.5} width={11} height={9} rx={2} {...PAINT.body} />;
      })}
      <circle cx={ROT.cx} cy={ROT.cy} r={8} {...PAINT.shaft} />
      <circle cx={ROT.cx} cy={ROT.cy} r={2.6} fill={MX.deep} />
      <BearingBlock cx={DE} />
      <BearingBlock cx={NDE} />
      <MachineLabel x={ROT.cx - 82} y={SLAB + 30} size={7.5}>HAMMER CRUSHER</MachineLabel>
      {/* beside the feed chute, so the callouts above the drive line keep the space over the crusher */}
      <MachineLabel x={350} y={88} anchor="start" size={7.5}>CLINKER FROM COOLER ↓</MachineLabel>
    </g>
  );
}

/** Callout boxes as on PDF page 11, next to their feature: top-left corner and width (drawing units). */
const callouts: Record<string, SheetCalloutAnchor> = {
  "ELE-HMR-01": [76, 112, 84],
  "TMP-HMR-03": [-25, 112, 92],
  "SPD-HMR-01": [168, 112, 79],
  "VIB-HMR-01": [440, 180, 84],
  "TMP-HMR-01": [440, 238, 84],
  "VIB-HMR-02": [230, 40, 85],
  "TMP-HMR-02": [60, 400, 110],
  "SPD-CSL-01": [325, 425, 95],
  "ELE-CSL-01": [520, 70, 95],
  "VIB-CSL-01": [600, 10, 100],
  "LEV-CSL-01": [755, 240, 79],
  "PRS-CSL-01": [706, 10, 80],
  "ELE-CSL-02": [795, 0, 85],
};

export const sheet: PyroSheetDrawing = {
  sheet: "D11",
  width: W,
  height: H,
  Art,
  callouts,
  pads: {
    "ELE-HMR-01": [MOTOR.x + MOTOR.w / 2, MOTOR.y - MOTOR.h * 0.12],
    "TMP-HMR-03": [MOTOR.x + MOTOR.w / 2, MOTOR.y + 22],
    "SPD-HMR-01": [SPD_X, SY],
    // Rotor "DE" / "NDE" bearing points placed exactly as the D11 PDF sheet shows them:
    // the DE pair on the far bearing block, the NDE pair on the motor-side block.
    "VIB-HMR-01": [NDE, SY - 12],
    "TMP-HMR-01": [NDE, SY + 12],
    "VIB-HMR-02": [DE, SY - 12],
    "TMP-HMR-02": [DE, SY + 12],
    "SPD-CSL-01": TAIL,
    "ELE-CSL-01": [DMOT.x + DMOT.w / 2, DMOT.y - DMOT.h * 0.12],
    "VIB-CSL-01": [RED.x + RED.w / 2, RED.y + 8],
    "LEV-CSL-01": [RADAR_X, SILO.roof - 25],
    "PRS-CSL-01": [BAG.x - 9, BAG.y + 8],
    "ELE-CSL-02": [FMOT.x + FMOT.w / 2, FMOT.y - FMOT.h * 0.12],
  },
};
