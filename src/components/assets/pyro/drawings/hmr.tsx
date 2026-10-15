"use client";

/**
 * HMR-01 — clinker hammer crusher at the cooler discharge (D11, left).
 * Crusher motor, flexible coupling with the rotor speed pickup, drive-end and
 * non-drive-end rotor bearing blocks, crusher casing with the hammer rotor
 * and grate bars, clinker inlet from the cooler and discharge to the pan
 * conveyor below the floor.
 */

import React from "react";
import { Bolt, Coupling, GroundLine, MX, MachineLabel, Motor, PAINT } from "@/components/assets/machine-kit/machine-kit";
import type { PyroDrawing } from "../pyro-drawing-types";

const W = 1000;
const H = 446;
const OX = 70;
const SY = 250; // shaft centre line
const BED = 340; // bed-plate top
const GROUND = 420;

const MOTOR = { x: 120, y: 195, w: 190, h: 110 };
const CPL = { x: 330, w: 30, h: 52 };
const DE = 385;
const NDE = 715;
const ROTOR = { cx: 550, cy: SY };

function BearingBlock({ cx }: { cx: number }) {
  return (
    <g aria-hidden="true">
      <path d={`M ${cx - 14} ${SY + 26} H ${cx + 14} L ${cx + 22} ${BED} H ${cx - 22} Z`} {...PAINT.body} />
      <rect x={cx - 17} y={SY - 32} width={34} height={64} rx={7} {...PAINT.raised} />
      <line x1={cx - 15} x2={cx + 15} y1={SY} y2={SY} stroke={MX.fine} strokeWidth={MX.wFine} />
      <Bolt x={cx - 10} y={SY - 24} r={1.8} />
      <Bolt x={cx + 10} y={SY - 24} r={1.8} />
      <Bolt x={cx - 16} y={BED - 6} r={1.8} />
      <Bolt x={cx + 16} y={BED - 6} r={1.8} />
    </g>
  );
}

function Art() {
  const hammers = 6;
  return (
    <g transform={`translate(${OX} 0)`}>
      <GroundLine x1={40} x2={420} y={GROUND} />
      <GroundLine x1={680} x2={880} y={GROUND} />

      {/* ---------------- foundation and bed plate ---------------- */}
      <rect x={70} y={BED + 12} width={350} height={GROUND - BED - 12} rx={3} {...PAINT.body} />
      <rect x={680} y={BED + 12} width={90} height={GROUND - BED - 12} rx={3} {...PAINT.body} />
      <rect x={80} y={BED} width={690} height={12} rx={2} {...PAINT.raised} />
      {[100, 260, 420, 680, 750].map((bx) => (
        <Bolt key={bx} x={bx} y={BED + 6} r={1.8} />
      ))}

      {/* ---------------- discharge hopper to the pan conveyor ---------------- */}
      <path d="M 440 352 L 660 352 L 592 410 L 508 410 Z" {...PAINT.body} />
      <path d="M 456 356 L 644 356 L 586 404 L 514 404 Z" {...PAINT.recess} />
      {[[520, 372], [548, 386], [574, 370], [560, 398], [534, 396]].map(([px, py], i) => (
        <rect key={i} x={px - 3.5} y={py - 3} width={7} height={6} rx={1.5} fill={MX.material} transform={`rotate(${i * 27} ${px} ${py})`} />
      ))}
      <MachineLabel x={550} y={436} size={7.5}>↓ TO PAN CONVEYOR</MachineLabel>

      {/* ---------------- crusher motor ---------------- */}
      {[0.18, 0.82].map((f) => (
        <rect key={f} x={MOTOR.x + MOTOR.w * f - 14} y={MOTOR.y + MOTOR.h - 4} width={28} height={BED - MOTOR.y - MOTOR.h + 4} rx={2} {...PAINT.body} />
      ))}
      <Motor x={MOTOR.x} y={MOTOR.y} w={MOTOR.w} h={MOTOR.h} />
      <MachineLabel x={MOTOR.x + MOTOR.w / 2} y={GROUND + 18} size={7.5}>CRUSHER MOTOR</MachineLabel>

      {/* ---------------- drive shaft, coupling, speed pickup ---------------- */}
      <rect x={MOTOR.x + MOTOR.w} y={SY - 6} width={NDE + 34 - MOTOR.x - MOTOR.w} height={12} rx={2} {...PAINT.shaft} />
      <Coupling x={CPL.x} y={SY - CPL.h / 2} w={CPL.w} h={CPL.h} />
      <rect x={CPL.x + CPL.w / 2 - 3} y={196} width={6} height={SY - CPL.h / 2 - 196} {...PAINT.shaft} />
      <rect x={CPL.x + CPL.w / 2 - 8} y={186} width={16} height={12} rx={3} {...PAINT.raised} />
      <path d={`M ${CPL.x + CPL.w / 2 + 8} 192 H ${DE - 10} V ${SY - 32}`} fill="none" stroke={MX.edge} strokeWidth={2} />

      {/* ---------------- rotor bearing blocks ---------------- */}
      <BearingBlock cx={DE} />
      <BearingBlock cx={NDE} />
      <MachineLabel x={DE} y={176} size={7}>NDE</MachineLabel>
      <MachineLabel x={NDE} y={176} size={7}>DE</MachineLabel>

      {/* ---------------- crusher casing ---------------- */}
      <rect x={530} y={8} width={40} height={84} rx={3} {...PAINT.cylinderV} />
      <rect x={541} y={14} width={18} height={74} rx={2} {...PAINT.recess} />
      {[24, 40, 56, 72].map((py, i) => (
        <rect key={py} x={545 + (i % 2) * 5} y={py} width={7} height={6} rx={1.5} fill={MX.material} />
      ))}
      <rect x={516} y={88} width={68} height={24} rx={4} {...PAINT.body} />
      <path d={`M 418 ${BED} L 418 180 L 478 110 L 622 110 L 682 180 L 682 ${BED} Z`} {...PAINT.body} />
      <path d={`M 426 ${BED - 8} L 426 183 L 482 118 L 618 118 L 674 183 L 674 ${BED - 8} Z`} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      {/* split flange */}
      <rect x={412} y={176} width={276} height={9} rx={2} {...PAINT.raised} />
      {Array.from({ length: 8 }).map((_, i) => (
        <Bolt key={i} x={428 + i * 35} y={180.5} r={1.8} />
      ))}
      {/* feed throat and crushing chamber */}
      <path d="M 522 118 L 578 118 L 584 176 L 516 176 Z" {...PAINT.recess} />
      {[[536, 140], [560, 134], [548, 160], [570, 158]].map(([px, py], i) => (
        <rect key={i} x={px - 4} y={py - 3.5} width={8} height={7} rx={1.5} fill={MX.material} transform={`rotate(${i * 35} ${px} ${py})`} />
      ))}
      <circle cx={ROTOR.cx} cy={ROTOR.cy} r={66} {...PAINT.recess} />
      {/* grate bars under the rotor */}
      {Array.from({ length: 9 }).map((_, i) => {
        const a = ((25 + i * 16.25) * Math.PI) / 180;
        return (
          <line
            key={i}
            x1={ROTOR.cx + Math.cos(a) * 58}
            y1={ROTOR.cy + Math.sin(a) * 58}
            x2={ROTOR.cx + Math.cos(a) * 66}
            y2={ROTOR.cy + Math.sin(a) * 66}
            stroke={MX.edge}
            strokeWidth={3}
            strokeLinecap="round"
          />
        );
      })}
      {/* hammer rotor */}
      {Array.from({ length: hammers }).map((_, i) => {
        const a = (i * 360) / hammers + 15;
        return (
          <g key={i} transform={`rotate(${a} ${ROTOR.cx} ${ROTOR.cy})`}>
            <rect x={ROTOR.cx - 5} y={ROTOR.cy - 56} width={10} height={20} rx={2} {...PAINT.shaft} />
          </g>
        );
      })}
      <circle cx={ROTOR.cx} cy={ROTOR.cy} r={40} {...PAINT.raised} />
      <circle cx={ROTOR.cx} cy={ROTOR.cy} r={30} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      {Array.from({ length: hammers }).map((_, i) => {
        const a = (((i * 360) / hammers + 15 - 90) * Math.PI) / 180;
        return <Bolt key={i} x={ROTOR.cx + Math.cos(a) * 34} y={ROTOR.cy + Math.sin(a) * 34} r={2.6} />;
      })}
      <circle cx={ROTOR.cx} cy={ROTOR.cy} r={12} {...PAINT.shaft} />
      <circle cx={ROTOR.cx} cy={ROTOR.cy} r={4} fill={MX.deep} />
      {/* inspection door on the casing */}
      <rect x={624} y={276} width={40} height={48} rx={4} {...PAINT.raised} />
      <rect x={630} y={284} width={28} height={12} rx={2} {...PAINT.recess} />

      <MachineLabel x={596} y={40} anchor="start" size={7.5}>CLINKER FROM COOLER ↓</MachineLabel>
      <MachineLabel x={700} y={120} anchor="start" size={7.5}>HAMMER CRUSHER</MachineLabel>
    </g>
  );
}

const at = (x: number, y: number): [number, number] => [x + OX, y];

export const drawing: PyroDrawing = {
  machineId: "PYR-HMR-01",
  width: W,
  height: H,
  Art,
  pads: {
    "ELE-HMR-01": at(MOTOR.x + MOTOR.w / 2, MOTOR.y - MOTOR.h * 0.12),
    "TMP-HMR-03": at(MOTOR.x + 34, MOTOR.y + 28),
    "SPD-HMR-01": at(CPL.x + CPL.w / 2, 192),
    // Rotor "DE" / "NDE" bearing points as the D11 PDF sheet places them:
    // the DE pair on the far bearing block, the NDE pair on the motor-side block.
    "VIB-HMR-01": at(NDE, SY - 16),
    "TMP-HMR-01": at(NDE, SY + 16),
    "VIB-HMR-02": at(DE, SY - 16),
    "TMP-HMR-02": at(DE, SY + 16),
  },
  windows: {
    "hmr-motor": [110, 150, 440, 200],
    "hmr-rotor": [OX + 290, 96, 520, 250],
  },
};
