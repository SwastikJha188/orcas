/**
 * Sheet B-4 — BRN-01 · Main burner — Coal conveying blower and line.
 * Composed as PDF page 27: Roots (positive-displacement) blower with inlet
 * filter-silencer and two counter-rotating lobe rotors, discharge riser with
 * silencer, non-return valve and safety relief valve, coupling and blower
 * motor on a common base frame; the coal conveying line with the kiln coal
 * feeder's rotary airlock dropping coal in, line pressure transmitter, and the
 * coal + conveying-air stream on to the burner.
 */
import React from "react";
import { Bolt, Coupling, CornerBolts, GroundLine, MX, MachineLabel, Motor, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Flange, FlowArrow, Pipe, Transmitter } from "../../drawings/clk-parts";
import type { LineSheetArt } from "../types";
import { BaseFrame, CoalPipe } from "./parts-b";

const W = 824;
const H = 704;
const GROUND = 630;
const BASE_Y = 593;

const BLW = { x: 120, y: 420, w: 196, h: 173 };
const ROT = { y: 507, l: 188, r: 256, rad: 47 };
const MOT = { x: 390, y: 450, w: 177, h: 113 };
const RISER_X = 212;
const LINE_Y = 225;
const DROP_X = 466;

/** Two-lobe rotor (peanut) at (cx, cy), rotated `a` degrees. */
function Rotor({ cx, cy, a }: { cx: number; cy: number; a: number }) {
  return (
    <g transform={`rotate(${a} ${cx} ${cy})`}>
      <ellipse cx={cx - 17} cy={cy} rx={20} ry={13} {...PAINT.raised} />
      <ellipse cx={cx + 17} cy={cy} rx={20} ry={13} {...PAINT.raised} />
      <rect x={cx - 14} y={cy - 8} width={28} height={16} fill={MX.raised} />
      <circle cx={cx} cy={cy} r={6} {...PAINT.shaft} />
      <circle cx={cx} cy={cy} r={2} fill={MX.deep} />
    </g>
  );
}

function Blower() {
  const { x, y, w, h } = BLW;
  const mx = (ROT.l + ROT.r) / 2;
  const dy = Math.sqrt(ROT.rad ** 2 - ((ROT.r - ROT.l) / 2) ** 2);
  const lobes = `M ${mx} ${ROT.y - dy} A ${ROT.rad} ${ROT.rad} 0 1 0 ${mx} ${ROT.y + dy} A ${ROT.rad} ${ROT.rad} 0 1 0 ${mx} ${ROT.y - dy} Z`;
  return (
    <g>
      {/* inlet filter-silencer on the suction side */}
      <rect x={104} y={452} width={18} height={18} rx={2} {...PAINT.body} />
      <rect x={66} y={424} width={40} height={74} rx={8} {...PAINT.cylinderV} />
      <rect x={62} y={418} width={48} height={9} rx={3} {...PAINT.raised} />
      {[440, 452, 464, 476, 488].map((ly) => (
        <line key={ly} x1={72} x2={100} y1={ly} y2={ly} stroke={MX.fine} strokeWidth={0.8} />
      ))}
      {/* casing */}
      <rect x={x} y={y} width={w} height={h} rx={14} {...PAINT.body} />
      <rect x={x + 7} y={y + 7} width={w - 14} height={h - 14} rx={9} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      <path d={lobes} {...PAINT.recess} />
      <Rotor cx={ROT.l} cy={ROT.y} a={0} />
      <Rotor cx={ROT.r} cy={ROT.y} a={90} />
      {Array.from({ length: 12 }).map((_, i) => (
        <Bolt key={i} x={x + 18 + i * ((w - 36) / 11)} y={y + h - 10} r={1.3} />
      ))}
      <CornerBolts x={x} y={y} w={w} h={h} inset={11} r={1.8} />
      {/* outlet flange, accelerometer stud on the headplate, oil sight glass */}
      <rect x={RISER_X - 17} y={y - 4} width={34} height={8} rx={2} {...PAINT.raised} />
      <rect x={220} y={430} width={11} height={11} rx={2} {...PAINT.shaft} />
      <circle cx={x + w - 22} cy={y + h - 28} r={5} {...PAINT.recess} />
      <circle cx={x + w - 22} cy={y + h - 27} r={2.5} fill={MX.material} opacity={0.7} />
      {/* drive shaft */}
      <rect x={x + w} y={ROT.y - 5} width={352 - x - w} height={10} rx={2} {...PAINT.shaft} />
    </g>
  );
}

function Riser() {
  return (
    <g>
      <Pipe pts={[[RISER_X, BLW.y], [RISER_X, LINE_Y], [DROP_X, LINE_Y]]} w={22} />
      <CoalPipe pts={[[DROP_X, LINE_Y], [798, LINE_Y]]} w={22} />
      {/* discharge silencer */}
      <rect x={RISER_X - 22} y={328} width={44} height={66} rx={8} {...PAINT.cylinderV} />
      <rect x={RISER_X - 25} y={324} width={50} height={7} rx={2} {...PAINT.raised} />
      <rect x={RISER_X - 25} y={391} width={50} height={7} rx={2} {...PAINT.raised} />
      {[344, 361, 378].map((y) => (
        <line key={y} x1={RISER_X - 20} x2={RISER_X + 20} y1={y} y2={y} stroke={MX.fine} strokeWidth={0.8} />
      ))}
      {/* non-return valve */}
      <rect x={RISER_X - 15} y={292} width={30} height={20} rx={4} {...PAINT.raised} />
      <path d={`M ${RISER_X - 6} 307 L ${RISER_X} 297 L ${RISER_X + 6} 307`} fill="none" stroke={MX.edge} strokeWidth={1.4} strokeLinejoin="round" />
      {/* safety relief valve on a side branch */}
      <rect x={RISER_X + 11} y={264} width={14} height={7} {...PAINT.shaft} />
      <rect x={RISER_X + 24} y={258} width={14} height={19} rx={3} {...PAINT.raised} />
      <rect x={RISER_X + 27} y={240} width={8} height={18} rx={2} {...PAINT.body} />
      {[244, 249, 254].map((y) => (
        <line key={y} x1={RISER_X + 27} x2={RISER_X + 35} y1={y} y2={y + 2} stroke={MX.fine} strokeWidth={0.8} />
      ))}
      <Flange x={RISER_X} y={280} w={22} vertical />
      {[330, 560, 740].map((x) => (
        <Flange key={x} x={x} y={LINE_Y} w={22} />
      ))}
      {/* pipe supports */}
      {[400, 660].map((x) => (
        <rect key={x} x={x - 10} y={LINE_Y + 11} width={20} height={6} rx={1.5} {...PAINT.body} />
      ))}
      <Transmitter x={645.5} y={LINE_Y - 11} dir="up" len={34} />
      <rect x={638} y={LINE_Y - 15} width={15} height={5} rx={1.5} {...PAINT.raised} />
      <FlowArrow x1={800} y1={LINE_Y} x2={821} y2={LINE_Y} />
    </g>
  );
}

function Feeder() {
  return (
    <g>
      {/* feeder discharge housing */}
      <rect x={420} y={128} width={91} height={52} rx={8} {...PAINT.body} />
      <rect x={432} y={138} width={67} height={24} rx={3} {...PAINT.recess} />
      <path d="M 436 160 Q 466 150 495 158 L 495 160 Z" {...PAINT.material} opacity={0.8} />
      <CornerBolts x={420} y={128} w={91} h={52} inset={5} r={1.3} />
      {/* rotary airlock into the line */}
      <rect x={DROP_X - 8} y={180} width={16} height={6} {...PAINT.body} />
      <rect x={DROP_X - 16} y={186} width={32} height={20} rx={4} {...PAINT.raised} />
      <circle cx={DROP_X} cy={196} r={7} {...PAINT.recess} />
      {[0, 60, 120].map((a) => (
        <line key={a} x1={DROP_X - 7} y1={196} x2={DROP_X + 7} y2={196} stroke={MX.edge} strokeWidth={1.1} transform={`rotate(${a} ${DROP_X} 196)`} />
      ))}
      <rect x={DROP_X + 16} y={192} width={12} height={8} rx={1.5} {...PAINT.shaft} />
      <rect x={DROP_X - 6} y={206} width={12} height={9} {...PAINT.body} />
    </g>
  );
}

function Drive() {
  return (
    <g>
      <Coupling x={352} y={492} w={31} h={30} />
      <rect x={348} y={484} width={39} height={46} rx={6} fill="none" stroke={MX.fine} strokeWidth={1} strokeDasharray="3 2" />
      {/* motor feet */}
      <rect x={404} y={MOT.y + MOT.h - 2} width={150} height={8} rx={2} {...PAINT.raised} />
      {[414, 528].map((fx) => (
        <g key={fx}>
          <rect x={fx} y={MOT.y + MOT.h + 6} width={16} height={BASE_Y - MOT.y - MOT.h - 6} rx={1.5} {...PAINT.body} />
          <Bolt x={fx + 8} y={MOT.y + MOT.h + 2} r={1.5} />
        </g>
      ))}
      <g transform={`translate(${2 * (MOT.x + MOT.w / 2)} 0) scale(-1 1)`}>
        <Motor x={MOT.x} y={MOT.y} w={MOT.w} h={MOT.h} terminalBox={false} />
      </g>
      {/* terminal box with cable gland, lifting eye */}
      <rect x={462} y={423} width={68} height={28} rx={5} {...PAINT.body} />
      <rect x={468} y={429} width={56} height={16} rx={3} fill="none" stroke={MX.fine} strokeWidth={0.8} />
      <rect x={530} y={432} width={9} height={8} rx={1.5} {...PAINT.shaft} />
      <circle cx={420} cy={MOT.y - 3} r={4} fill="none" stroke={MX.edge} strokeWidth={2} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={22} x2={804} y={GROUND} />
      {[96, 330, 590].map((x) => (
        <rect key={x} x={x} y={BASE_Y + 18} width={20} height={GROUND - BASE_Y - 18} rx={1} fill={MX.flatBody} stroke={MX.fine} strokeWidth={MX.wFine} />
      ))}
      <BaseFrame x={90} y={BASE_Y} w={526} h={18} ground={BASE_Y + 18} bolts={7} />
      <Riser />
      <Feeder />
      <Blower />
      <Drive />

      <MachineLabel x={217} y={621.2} size={9}>
        ROOTS BLOWER
      </MachineLabel>
      <MachineLabel x={494} y={621.2} size={9}>
        BLOWER MOTOR
      </MachineLabel>
      <MachineLabel x={464.5} y={119} size={8.2}>
        FROM KILN COAL FEEDER (B-3)
      </MachineLabel>
      <MachineLabel x={796} y={206} anchor="end" size={8.2}>
        COAL + CONVEYING AIR
      </MachineLabel>
      <MachineLabel x={816} y={253.7} anchor="end" size={9}>
        TO BURNER (B-1)
      </MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 27. */
const pads: LineSheetArt["pads"] = {
  "PRS-BRN-04": [645.5, 170],
  "VIB-BRN-02": [225.5, 435.5],
  "ELE-BRN-02": [495.5, 437],
};

/** Tag chip centre per point, as on PDF page 27. */
const chips: NonNullable<LineSheetArt["chips"]> = {
  "PRS-BRN-04": [708.5, 125],
  "VIB-BRN-02": [147, 338],
  "ELE-BRN-02": [558.5, 330.5],
};

export const sheet: LineSheetArt = { id: "B-4", ready: true, width: W, height: H, Art, pads, chips };
