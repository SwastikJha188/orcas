/**
 * Sheet B-2 — BRN-01 · Main burner — Primary-air fan.
 * Composed as PDF page 25: centrifugal fan volute (outlet rising on the left,
 * transition piece, rectangular duct with expansion joint, damper and flanged
 * joints to the burner primary-air header), the drive-end bearing on its
 * stand, shaft and guarded coupling, the fan motor, all on one fabricated
 * base frame and concrete plinth.
 */
import React from "react";
import { Bolt, Coupling, CornerBolts, GroundLine, MX, MachineLabel, Motor, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { FlowArrow } from "../../drawings/clk-parts";
import { Volute } from "../../drawings/fkp-parts";
import type { LineSheetArt } from "../types";
import { BaseFrame, DuctElbow, DuctFlange } from "./parts-b";

const W = 824;
const H = 704;
const GROUND = 630;
const BASE_Y = 593;

const FAN = { cx: 248, cy: 450, r: 118 };
const DUCT = { x: 184, y: 90, d: 50, rc: 50 };
const BRG = { x: 405, y: 420, w: 61, h: 68 };
const MOT = { x: 518, y: 392, w: 189, h: 118 };
const SHAFT_Y = 450;

function Duct() {
  const top = DUCT.y - DUCT.d / 2;
  return (
    <g>
      {/* transition piece from the volute outlet to the duct */}
      <path d={`M 112 291 L 232 291 L ${DUCT.x + DUCT.d / 2} 262 L ${DUCT.x - DUCT.d / 2} 262 Z`} {...PAINT.body} />
      <line x1={140} y1={286} x2={DUCT.x - DUCT.d / 2 + 4} y2={266} {...PAINT.hair} />
      <line x1={206} y1={286} x2={DUCT.x + DUCT.d / 2 - 4} y2={266} {...PAINT.hair} />
      <DuctElbow x={DUCT.x} y0={262} yh={DUCT.y} x1={798} d={DUCT.d} rc={DUCT.rc} />
      <DuctFlange x={DUCT.x} y={262} d={DUCT.d} vertical />
      <DuctFlange x={DUCT.x} y={200} d={DUCT.d} vertical />
      {/* expansion joint (bellows) on the vertical leg */}
      <rect x={DUCT.x - DUCT.d / 2 - 3} y={214} width={DUCT.d + 6} height={30} rx={3} {...PAINT.raised} />
      {[219, 224, 229, 234, 239].map((y) => (
        <line key={y} x1={DUCT.x - DUCT.d / 2 - 1} x2={DUCT.x + DUCT.d / 2 + 1} y1={y} y2={y} stroke={MX.fine} strokeWidth={1} />
      ))}
      {/* flanged joints along the horizontal run */}
      {[330, 600, 760].map((x) => (
        <DuctFlange key={x} x={x} y={DUCT.y} d={DUCT.d} />
      ))}
      {/* isolating damper with actuator */}
      <rect x={440} y={top - 4} width={44} height={DUCT.d + 8} rx={3} {...PAINT.raised} />
      <line x1={448} y1={DUCT.y + 16} x2={476} y2={DUCT.y - 16} stroke={MX.edge} strokeWidth={1.6} />
      <circle cx={462} cy={DUCT.y} r={3} {...PAINT.shaft} />
      <rect x={458} y={top - 14} width={8} height={10} {...PAINT.shaft} />
      <rect x={446} y={top - 32} width={32} height={18} rx={4} {...PAINT.body} />
      <rect x={452} y={top - 27} width={14} height={8} rx={1.5} {...PAINT.recess} />
      <CornerBolts x={440} y={top - 4} w={44} h={DUCT.d + 8} inset={4} r={1.2} />
      {/* duct supports */}
      {[540, 700].map((x) => (
        <rect key={x} x={x - 14} y={DUCT.y + DUCT.d / 2} width={28} height={6} rx={1.5} {...PAINT.body} />
      ))}
      <FlowArrow x1={800} y1={DUCT.y} x2={820} y2={DUCT.y} />
    </g>
  );
}

function FanBody() {
  const { cx, cy, r } = FAN;
  return (
    <g>
      {/* volute pedestal */}
      <path d={`M ${cx - 70} ${cy + 84} L ${cx + 70} ${cy + 84} L ${cx + 76} ${BASE_Y} L ${cx - 76} ${BASE_Y} Z`} {...PAINT.body} />
      <rect x={cx - 52} y={cy + 100} width={104} height={30} rx={3} {...PAINT.recess} />
      <Volute cx={cx} cy={cy} r={r} outH={41} dir={-1} />
      {/* casing bolt ring, inlet cone ring */}
      {Array.from({ length: 16 }).map((_, i) => {
        const a = (i / 16) * Math.PI * 2 + 0.2;
        return <Bolt key={i} x={cx + Math.cos(a) * r * 0.8} y={cy + Math.sin(a) * r * 0.8} r={1.5} />;
      })}
      <circle cx={cx} cy={cy} r={r * 0.71} fill="none" stroke={MX.edge} strokeWidth={1.4} />
      {/* casing drain and inspection door */}
      <rect x={cx - 5} y={cy + r + 4} width={10} height={8} rx={1.5} {...PAINT.shaft} />
      <rect x={cx + 76} y={cy - 92} width={30} height={22} rx={4} transform={`rotate(38 ${cx + 91} ${cy - 81})`} {...PAINT.raised} />
      {/* shaft line, bearing to coupling to motor */}
      <rect x={cx + r * 0.9} y={SHAFT_Y - 5} width={MOT.x - cx - r * 0.9} height={10} rx={2} {...PAINT.shaft} />
      <rect x={366} y={SHAFT_Y - 9} width={10} height={18} rx={2} {...PAINT.raised} />
    </g>
  );
}

function Bearing() {
  const { x, y, w, h } = BRG;
  return (
    <g>
      {/* bearing stand: legs, base plate, tie */}
      {[x - 10, x + w + 4].map((lx) => (
        <rect key={lx} x={lx} y={y + h + 12} width={7} height={BASE_Y - y - h - 12} rx={1.5} {...PAINT.body} />
      ))}
      <rect x={x - 13} y={y + h} width={w + 26} height={12} rx={2} {...PAINT.body} />
      <rect x={x - 10} y={548} width={w + 21} height={5} rx={1.5} {...PAINT.body} />
      <Bolt x={x - 6} y={y + h + 6} r={1.6} />
      <Bolt x={x + w + 7} y={y + h + 6} r={1.6} />
      {/* plummer block */}
      <rect x={x} y={y} width={w} height={h} rx={8} {...PAINT.raised} />
      <line x1={x + 2} x2={x + w - 2} y1={SHAFT_Y} y2={SHAFT_Y} stroke={MX.edge} strokeWidth={1.2} />
      <rect x={x + 6} y={y + 6} width={w - 12} height={h - 12} rx={5} fill="none" stroke={MX.fine} strokeWidth={0.8} />
      <Bolt x={x + 7} y={SHAFT_Y - 7} r={1.8} />
      <Bolt x={x + w - 7} y={SHAFT_Y - 7} r={1.8} />
      <Bolt x={x + 7} y={SHAFT_Y + 7} r={1.8} />
      <Bolt x={x + w - 7} y={SHAFT_Y + 7} r={1.8} />
      {/* grease nipple and vibration-sensor stud on the cap, RTD pocket below */}
      <rect x={x + w - 14} y={y - 7} width={4} height={7} {...PAINT.shaft} />
      <rect x={x + w / 2 - 6} y={y - 3} width={12} height={5} rx={1.5} {...PAINT.shaft} />
      <rect x={x + w / 2 - 7} y={473 - 6} width={14} height={12} rx={3} {...PAINT.recess} />
    </g>
  );
}

function Drive() {
  return (
    <g>
      {/* motor sub-base and feet */}
      <rect x={550} y={MOT.y + MOT.h + 6} width={MOT.w - 48} height={BASE_Y - MOT.y - MOT.h - 6} rx={2} {...PAINT.body} />
      <rect x={538} y={MOT.y + MOT.h - 2} width={150} height={9} rx={2} {...PAINT.raised} />
      {[548, 676].map((fx) => (
        <Bolt key={fx} x={fx} y={MOT.y + MOT.h + 3} r={1.6} />
      ))}
      <g transform={`translate(${2 * (MOT.x + MOT.w / 2)} 0) scale(-1 1)`}>
        <Motor x={MOT.x} y={MOT.y} w={MOT.w} h={MOT.h} />
      </g>
      {/* coupling and its guard */}
      <Coupling x={481} y={434} w={34} h={32} />
      <rect x={476} y={424} width={42} height={52} rx={6} fill="none" stroke={MX.fine} strokeWidth={1} strokeDasharray="3 2" />
      <rect x={566} y={540} width={MOT.w - 80} height={36} rx={3} {...PAINT.recess} />
      {/* terminal-box gland and lifting eyes */}
      <rect x={648} y={372} width={10} height={6} rx={1.5} {...PAINT.shaft} />
      {[548, 676].map((ex) => (
        <circle key={ex} cx={ex} cy={MOT.y - 3} r={4} fill="none" stroke={MX.edge} strokeWidth={2} />
      ))}
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={22} x2={804} y={GROUND} />
      <BaseFrame x={90} y={BASE_Y} w={646} h={18} ground={GROUND} bolts={9} />
      <Duct />
      <FanBody />
      <Bearing />
      <Drive />

      <MachineLabel x={816} y={58.7} anchor="end" size={9}>
        TO BURNER PRIMARY-AIR HEADER (B-1)
      </MachineLabel>
      <MachineLabel x={247} y={658.7} size={9}>
        PRIMARY-AIR FAN
      </MachineLabel>
      <MachineLabel x={434.5} y={524} size={8.2}>
        DE BEARING
      </MachineLabel>
      <MachineLabel x={629.5} y={658.7} size={9}>
        FAN MOTOR
      </MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 25. */
const pads: LineSheetArt["pads"] = {
  "VIB-BRN-01": [435.5, 425],
  "TMP-BRN-01": [435.5, 473],
  "ELE-BRN-01": [612.5, 374],
};

/** Tag chip centre per point, as on PDF page 25. */
const chips: NonNullable<LineSheetArt["chips"]> = {
  "VIB-BRN-01": [357, 297.5],
  "TMP-BRN-01": [513, 562],
  "ELE-BRN-01": [678.5, 291.5],
};

export const sheet: LineSheetArt = { id: "B-2", ready: true, width: W, height: H, Art, pads, chips };
