/**
 * Sheet P-4 — PHC-01 · Preheater — ID fan and motor.
 *
 * Composition of PDF page 12: the centrifugal ID fan casing (volute) at left
 * with its inlet duct from the preheater exit and the outlet transition rising
 * to the duct to the GCT / raw mill / stack; the fan shaft runs through the
 * NDE and DE plummer blocks and a guarded coupling to the VFD motor (finned
 * frame, terminal box, fan cowl with speed encoder). Everything stands on a
 * concrete foundation block with a raised plinth for the bearings and motor.
 */
import React from "react";
import { Bolt, Coupling, CornerBolts, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Pipe } from "../../drawings/fkp-parts";
import { SideMotor } from "../../sheets/sb-parts";
import type { LineSheetArt } from "../types";
import { Arrow, Bellows, FanCasing, PlummerBlock } from "./parts-p";

const W = 824;
const H = 704;
const GROUND = 646;

const FAN = { cx: 248, cy: 390, r: 135, outTop: 221.5 };
const SLAB = 533;
const PLINTH = 441;
const NDE = 443;
const DE = 533;
const MOTOR = { x: 632, y: 330, w: 149, h: 120 };
const OUT_X = 315.5;
const OUT_D = 47;
const OUT_Y = 60.5;
const IN_Y = 323;

function Foundation() {
  return (
    <g>
      {/* foundation block, slab and raised plinth under bearings + motor */}
      <rect x={105} y={555} width={713} height={GROUND - 555} rx={3} {...PAINT.body} />
      <rect x={112} y={561} width={699} height={GROUND - 567} rx={2} {...PAINT.hair} />
      <rect x={98} y={SLAB} width={724} height={22} rx={3} {...PAINT.raised} />
      <rect x={398} y={PLINTH} width={420} height={SLAB - PLINTH} rx={3} {...PAINT.body} />
      <rect x={404} y={PLINTH + 6} width={408} height={SLAB - PLINTH - 12} rx={2} {...PAINT.hair} />
      <CornerBolts x={105} y={555} w={713} h={GROUND - 555} inset={10} r={2} />
      {[150, 360, 600, 780].map((x) => (
        <Bolt key={x} x={x} y={SLAB + 11} r={1.8} />
      ))}
    </g>
  );
}

function Ducts() {
  const tw = FAN.r; // outlet box width
  return (
    <g>
      {/* inlet duct from the preheater exit */}
      <Pipe pts={[[31, IN_Y], [140, IN_Y]]} d={48} flanges={[[34, IN_Y], [70, IN_Y]]} />
      <Bellows x={100} y={IN_Y} d={48} vertical={false} len={16} />
      {/* outlet transition and duct to GCT / raw mill / stack */}
      <path
        d={`M ${FAN.cx} ${FAN.outTop - 5} L ${OUT_X - OUT_D / 2} ${FAN.outTop - 42} L ${OUT_X + OUT_D / 2} ${FAN.outTop - 42} L ${FAN.cx + tw} ${FAN.outTop - 5} Z`}
        {...PAINT.body}
      />
      <line x1={FAN.cx + 20} x2={FAN.cx + tw - 20} y1={FAN.outTop - 22} y2={FAN.outTop - 22} {...PAINT.hair} />
      <Pipe pts={[[OUT_X, FAN.outTop - 42], [OUT_X, OUT_Y], [795, OUT_Y]]} d={OUT_D} flanges={[[OUT_X, 176], [OUT_X, 120], [520, OUT_Y], [700, OUT_Y]]} />
      <Bellows x={OUT_X} y={150} d={OUT_D} len={18} />
      <Bellows x={610} y={OUT_Y} d={OUT_D} vertical={false} len={18} />
      {/* access door on the outlet duct */}
      <rect x={430} y={OUT_Y + OUT_D / 2 - 1} width={34} height={6} rx={1.5} {...PAINT.raised} />
      <Bolt x={436} y={OUT_Y + OUT_D / 2 + 2} r={1.2} />
      <Bolt x={458} y={OUT_Y + OUT_D / 2 + 2} r={1.2} />
    </g>
  );
}

function Drive() {
  const cy = FAN.cy;
  return (
    <g>
      {/* shaft from the impeller hub to the coupling */}
      <rect x={FAN.cx} y={cy - 7} width={MOTOR.x - FAN.cx - 18} height={14} rx={3} {...PAINT.shaft} />
      {/* bearing chocks and plummer blocks */}
      {[NDE, DE].map((x) => (
        <g key={x}>
          <rect x={x - 30} y={435} width={60} height={PLINTH - 435 + 1} rx={1} {...PAINT.raised} />
          <PlummerBlock cx={x} cy={cy} top={353} bottom={427} w={52} shaft={14} />
        </g>
      ))}
      {/* coupling with guard */}
      <Coupling x={578} y={375} w={34} h={30} />
      <rect x={571} y={366} width={48} height={48} rx={4} fill="none" stroke={MX.fine} strokeWidth={1} strokeDasharray="3 2" />
      <rect x={612} y={cy - 6} width={10} height={12} {...PAINT.shaft} />
      {/* motor: sole plate, finned frame, terminal box, cowl, encoder */}
      <rect x={640} y={MOTOR.y + MOTOR.h} width={125} height={PLINTH - MOTOR.y - MOTOR.h + 1} rx={1.5} {...PAINT.raised} />
      {[652, 753].map((x) => (
        <Bolt key={x} x={x} y={MOTOR.y + MOTOR.h + 3} r={1.4} />
      ))}
      <SideMotor x={MOTOR.x} y={MOTOR.y} w={MOTOR.w} h={MOTOR.h} flip />
      <rect x={687} y={316} width={40} height={4} rx={1} fill="none" stroke={MX.fine} strokeWidth={0.8} />
      <rect x={808} y={cy - 4} width={5} height={8} {...PAINT.shaft} />
      <rect x={812} y={cy - 11} width={9} height={22} rx={3} {...PAINT.raised} />
      {/* VFD cable gland from the terminal box */}
      <rect x={727} y={318} width={8} height={6} rx={1.2} {...PAINT.raised} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={22} x2={803} y={GROUND} />
      <Foundation />
      <Ducts />
      <FanCasing cx={FAN.cx} cy={FAN.cy} r={FAN.r} outTop={FAN.outTop} baseY={SLAB} />
      <Drive />
      <Arrow x1={798} y1={OUT_Y} x2={820} y2={OUT_Y} />
      <MachineLabel x={30.5} y={280} size={9} anchor="start">FROM PREHEATER EXIT</MachineLabel>
      <MachineLabel x={30.5} y={292} size={9} anchor="start">(P-3)</MachineLabel>
      <MachineLabel x={650.5} y={28.7} size={9} anchor="start">TO GCT / RAW MILL / STACK</MachineLabel>
      <MachineLabel x={227.5} y={673.8} size={9.8} anchor="start">ID FAN</MachineLabel>
      <MachineLabel x={406.5} y={479} size={8.2} anchor="start">NDE BEARING</MachineLabel>
      <MachineLabel x={500} y={479} size={8.2} anchor="start">DE BEARING</MachineLabel>
      <MachineLabel x={651.5} y={478.7} size={9} anchor="start">ID FAN MOTOR (VFD)</MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 12. */
const pads: LineSheetArt["pads"] = {
  "VIB-PHC-02": [443, 359],
  "TMP-PHC-10": [443, 405.5],
  "VIB-PHC-01": [533, 359],
  "TMP-PHC-09": [533, 405.5],
  "ELE-PHC-01": [701.5, 316],
  "SPD-PHC-01": [801.5, 390.5],
};

/** Tag chip centre per point, as on PDF page 12 (VIB-PHC-02 nudged clear of the fan outlet). */
const chips: NonNullable<LineSheetArt["chips"]> = {
  "VIB-PHC-02": [422, 269],
  "TMP-PHC-10": [394.5, 503],
  "VIB-PHC-01": [596, 246.5],
  "TMP-PHC-09": [588.5, 503],
  "ELE-PHC-01": [757.5, 234],
  "SPD-PHC-01": [753, 503],
};

export const sheet: LineSheetArt = { id: "P-4", ready: true, width: W, height: H, Art, pads, chips };
