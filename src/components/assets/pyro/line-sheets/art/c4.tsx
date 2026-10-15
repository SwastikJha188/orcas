/**
 * Sheet C-4 — CLR-01 · Clinker cooler — Grate drive hydraulic unit.
 * The moving grate frame (on its carriage rollers) is pushed by a tie-rod
 * hydraulic cylinder hung from the cooler structure on a trunnion bracket;
 * a proximity switch counts the strokes off a target plate on the frame.
 * The hydraulic power unit below: oil tank with cut-away and thermowell,
 * electric motor, bell housing and gear pump, pressure block with
 * directional valves and gauge, accumulator, all on one skid.
 */
import React from "react";
import { Bolt, GroundLine, Motor, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import type { LineSheetArt } from "../types";
import { CoolerCasing, Fitting, HydCylinder, OilHose } from "./parts-c";

const W = 824;
const H = 704;

const CYL = { x1: 225.5, x2: 450.5, y: 248, h: 35 };
const CY = CYL.y + CYL.h / 2;
const CAP_PORT = 232.5;
const HEAD_PORT = 443.5;
const SKID = { x: 120.5, y: 420.5, w: 465, h: 195 };
const TANK = { x: 143.5, y: 451, w: 165, h: 127.5 };
const MOT = { x: 356, y: 480.5, w: 125, h: 68 };
const PB = { x: 495.5, y: 465.5, w: 75.5, h: 42.5 };
const GROUND = 660;

function Art() {
  const mcy = MOT.y + MOT.h / 2;
  return (
    <g>
      <GroundLine x1={22} x2={802} y={GROUND} />

      {/* ---------------- moving grate frame ---------------- */}
      <CoolerCasing x={30.5} y={45.5} w={765.5} h={177} grate={190} bedL={160} bedR={174} doors={[150, 690]} carriage />
      <MachineLabel x={412.4} y={80} size={9}>MOVING GRATE FRAME</MachineLabel>
      {/* stroke-counter target plate on the frame */}
      <rect x={256} y={221} width={30} height={5} rx={1.2} {...PAINT.shaft} />

      {/* ---------------- drive linkage ---------------- */}
      <rect x={636} y={214} width={20} height={24} rx={3} {...PAINT.raised} />
      <Bolt x={641} y={218} r={1.4} />
      <Bolt x={651} y={218} r={1.4} />
      <line x1={646} y1={229} x2={590} y2={CY} stroke={MX.edge} strokeWidth={9} strokeLinecap="round" />
      <line x1={646} y1={229} x2={590} y2={CY} stroke={MX.metal} strokeWidth={6.5} strokeLinecap="round" />
      <circle cx={646} cy={229} r={4.5} {...PAINT.shaft} />
      <circle cx={646} cy={229} r={1.6} fill={MX.deep} />

      {/* ---------------- trunnion bracket and cylinder ---------------- */}
      <path d={`M 196 222.5 H 230 V 238 L 222 ${CY + 10} H 204 L 196 238 Z`} {...PAINT.body} />
      <Bolt x={202} y={228} r={1.5} />
      <Bolt x={224} y={228} r={1.5} />
      <HydCylinder x1={CYL.x1} x2={CYL.x2} y={CYL.y} h={CYL.h} rodX={574} rodH={15} />
      <circle cx={213} cy={CY} r={6.5} {...PAINT.raised} />
      <circle cx={213} cy={CY} r={2.6} {...PAINT.shaft} />
      {/* rod-end clevis */}
      <rect x={570.5} y={247} width={30.5} height={37} rx={5} {...PAINT.raised} />
      <line x1={575} x2={597} y1={CY} y2={CY} {...PAINT.hair} />
      <circle cx={590} cy={CY} r={5} {...PAINT.shaft} />
      <circle cx={590} cy={CY} r={1.8} fill={MX.deep} />
      {/* proximity stroke sensor on its arm */}
      <rect x={230} y={236.5} width={36} height={4} {...PAINT.shaft} />
      <rect x={265.5} y={227} width={10} height={20} rx={2} {...PAINT.shaft} />
      <rect x={263.5} y={233} width={14} height={3} rx={1} {...PAINT.raised} />
      <rect x={263.5} y={240} width={14} height={3} rx={1} {...PAINT.raised} />
      <path d="M 270.5 247 Q 270.5 255 262 255" fill="none" stroke={MX.fine} strokeWidth={1.4} />
      <MachineLabel x={302} y={239} anchor="start" size={8.2}>HYDRAULIC CYLINDER</MachineLabel>

      {/* ---------------- hoses: cylinder ports to the pressure block ---------------- */}
      <OilHose pts={[[CAP_PORT, CYL.y + CYL.h + 7], [CAP_PORT, 360], [515, 360], [515, PB.y]]} />
      <OilHose pts={[[HEAD_PORT, CYL.y + CYL.h + 7], [HEAD_PORT, 338], [551, 338], [551, PB.y]]} />
      <Fitting x={CAP_PORT} y={CYL.y + CYL.h + 6} />
      <Fitting x={HEAD_PORT} y={CYL.y + CYL.h + 6} />
      <Fitting x={515} y={PB.y - 3} />
      <Fitting x={551} y={PB.y - 3} />

      {/* ---------------- power-unit skid ---------------- */}
      <rect x={SKID.x} y={SKID.y} width={SKID.w} height={SKID.h} rx={12} {...PAINT.body} />
      <rect x={SKID.x + 6} y={SKID.y + 6} width={SKID.w - 12} height={SKID.h - 12} rx={8} fill="none" stroke={MX.fine} strokeWidth={1} />
      {[172, 566].map((x) => (
        <g key={x}>
          <rect x={x - 10} y={SKID.y + SKID.h - 2} width={20} height={GROUND - SKID.y - SKID.h - 2} rx={1.5} {...PAINT.body} />
          <rect x={x - 15} y={GROUND - 6} width={30} height={6} rx={1.5} {...PAINT.raised} />
          <Bolt x={x - 11} y={GROUND - 3} r={1.2} />
          <Bolt x={x + 11} y={GROUND - 3} r={1.2} />
        </g>
      ))}
      <rect x={SKID.x + 8} y={598} width={SKID.w - 16} height={10} rx={2} {...PAINT.raised} />
      {Array.from({ length: 9 }).map((_, i) => (
        <Bolt key={i} x={SKID.x + 22 + i * 52.5} y={603} r={1.4} />
      ))}

      {/* suction line tank → pump (behind the motor feet) */}
      <OilHose pts={[[TANK.x + TANK.w, 566], [330, 566], [330, 590], [520, 590], [520, 530]]} w={6} />

      {/* oil tank */}
      <rect x={TANK.x} y={TANK.y} width={TANK.w} height={TANK.h} rx={7} {...PAINT.body} />
      <rect x={TANK.x - 2} y={TANK.y - 3} width={TANK.w + 4} height={6} rx={2} {...PAINT.raised} />
      {Array.from({ length: 7 }).map((_, i) => (
        <Bolt key={i} x={TANK.x + 8 + i * 24.8} y={TANK.y} r={1.2} />
      ))}
      <rect x={152} y={468} width={148} height={102} rx={4} {...PAINT.recess} />
      <rect x={154} y={490} width={144} height={78} rx={2.5} fill={MX.material} opacity={0.9} />
      <line x1={154} x2={298} y1={490} y2={490} stroke={MX.material} strokeWidth={1.4} />
      {[0, 1, 2].map((k) => (
        <path key={k} d={`M ${170 + k * 44} ${506 + k * 14} q 10 -4 20 0 t 20 0`} {...PAINT.hair} opacity={0.6} />
      ))}
      {/* thermowell with RTD head */}
      <rect x={TANK.x - 10} y={518} width={11} height={15} rx={3} {...PAINT.raised} />
      <rect x={TANK.x} y={523.5} width={30} height={4} rx={1.5} {...PAINT.shaft} />
      {/* filler-breather, return filter, drain valve, feet */}
      <rect x={230} y={441} width={16} height={10} rx={2} {...PAINT.raised} />
      <path d="M 232 441 Q 238 433 244 441 Z" {...PAINT.shaft} />
      <rect x={268} y={433} width={24} height={18} rx={4} {...PAINT.cylinderV} />
      <rect x={265} y={431} width={30} height={5} rx={1.5} {...PAINT.raised} />
      <rect x={292} y={TANK.y + TANK.h - 10} width={14} height={6} rx={1.5} {...PAINT.shaft} />
      <circle cx={306} cy={TANK.y + TANK.h - 7} r={3.4} {...PAINT.raised} />
      {[TANK.x + 20, TANK.x + TANK.w - 34].map((x) => (
        <rect key={x} x={x} y={TANK.y + TANK.h} width={14} height={598 - TANK.y - TANK.h} rx={1.5} {...PAINT.body} />
      ))}
      <MachineLabel x={152} y={441.6} anchor="start" size={8.2}>OIL TANK</MachineLabel>

      {/* motor on its feet, bell housing and gear pump */}
      {[372, 448].map((x) => (
        <g key={x}>
          <rect x={x} y={MOT.y + MOT.h - 2} width={16} height={598 - MOT.y - MOT.h + 2} rx={1.5} {...PAINT.body} />
          <Bolt x={x + 8} y={MOT.y + MOT.h + 4} r={1.3} />
        </g>
      ))}
      <Motor x={MOT.x} y={MOT.y} w={MOT.w} h={MOT.h} />
      <rect x={366} y={MOT.y - 4} width={6} height={4} rx={1} {...PAINT.shaft} />
      <path d={`M 481 ${mcy - 20} L 499 ${mcy - 14} V ${mcy + 14} L 481 ${mcy + 20} Z`} {...PAINT.body} />
      <rect x={499} y={500} width={34} height={30} rx={4} {...PAINT.raised} />
      <rect x={504} y={506} width={24} height={18} rx={2} {...PAINT.recess} />
      <circle cx={512} cy={515} r={5} fill="none" stroke={MX.metal} strokeWidth={1.4} />
      <circle cx={521} cy={515} r={5} fill="none" stroke={MX.metal} strokeWidth={1.4} />

      {/* accumulator */}
      <rect x={553} y={PB.y + PB.h} width={6} height={8} {...PAINT.shaft} />
      <rect x={545} y={515} width={22} height={74} rx={11} {...PAINT.cylinderV} />
      <rect x={548} y={584} width={16} height={8} rx={2} {...PAINT.raised} />

      {/* pressure block: two directional valves, transmitter, gauge */}
      <rect x={PB.x} y={PB.y} width={PB.w} height={PB.h} rx={5} {...PAINT.raised} />
      {[PB.x + 5, PB.x + PB.w - 23].map((x) => (
        <g key={x}>
          <rect x={x} y={PB.y + 6} width={18} height={30} rx={2.5} {...PAINT.body} />
          <rect x={x + 3} y={PB.y + 9} width={12} height={10} rx={1.5} {...PAINT.recess} />
          <line x1={x + 3} x2={x + 15} y1={PB.y + 28} y2={PB.y + 28} {...PAINT.hair} />
        </g>
      ))}
      <rect x={PB.x + 30} y={PB.y + 13} width={16} height={16} rx={4} {...PAINT.body} />
      <rect x={PB.x + PB.w} y={483} width={6} height={6} {...PAINT.shaft} />
      <circle cx={PB.x + PB.w + 13} cy={486} r={8} {...PAINT.raised} />
      <circle cx={PB.x + PB.w + 13} cy={486} r={5.5} {...PAINT.recess} />
      <line x1={PB.x + PB.w + 13} y1={486} x2={PB.x + PB.w + 16} y2={482} stroke={MX.metal} strokeWidth={1.2} strokeLinecap="round" />
      <MachineLabel x={508} y={458} anchor="end" size={8.2}>PRESSURE BLOCK</MachineLabel>

      <MachineLabel x={351.9} y={636.4} size={9}>GRATE DRIVE HYDRAULIC POWER UNIT</MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 32. */
const pads: LineSheetArt["pads"] = {
  "SPD-CLR-01": [270.5, 230.5],
  "PRS-CLR-07": [533, 486.5],
  "TMP-CLR-07": [173, 525.5],
};

/** Tag chip centre per point, as on PDF page 32 (stroke chip lifted 31 off the clinker bed). */
const chips: NonNullable<LineSheetArt["chips"]> = {
  "SPD-CLR-01": [207, 140],
  "PRS-CLR-07": [626, 441.5],
  "TMP-CLR-07": [109.5, 638],
};

export const sheet: LineSheetArt = { id: "C-4", ready: true, width: W, height: H, Art, pads, chips };
