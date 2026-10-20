/**
 * Vacuum investment casting cell: machine-kit drawing from a vacuum casting cell schematic (diagram-skill sample).
 * Left to right: control cabinet, induction generator, vacuum pump + motor, then the upper
 * melting chamber (induction coil, crucible, stopper actuator) stacked on the lower investment
 * flask chamber; gas / pressure supply and cooling-water connections on the right.
 */
import React from "react";
import type { LineSheetArt } from "@/components/assets/pyro/line-sheets/types";
import { GroundLine, Housing, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import {
  Baseplate, BoltLine, Cabinet, Chamber, ElectricMotor, Flow, GasCylinder, Instrument, instrumentHead, Pipe, Valve, type Pt,
} from "@/components/assets/machine-kit/parts-2d";

/* ---------------------------------------------------------------- layout (sheet units) */

const W = 1600;
const H = 1100;

/*
 * Source image 1154 x 877 px. Drawing area in source px: x 60..1120, y 12..768.
 * Sheet: x' = 84 + (x - 60) K, y' = 40 + (y - 12) K, uniform scale K so circles stay round.
 */
const K = 1.35;
const X = (v: number) => 84 + (v - 60) * K;
const Y = (v: number) => 40 + (v - 12) * K;
const GROUND = Y(738);

/** Part box from source px (x, y top-left, w, h). */
const box = (x: number, y: number, w: number, h: number) => ({ x: X(x), y: Y(y), w: w * K, h: h * K });
/** SVG rect props from source px. */
const rect = (x: number, y: number, w: number, h: number) => ({ x: X(x), y: Y(y), width: w * K, height: h * K });
/** Point from source px. */
const at = (x: number, y: number): Pt => [X(x), Y(y)];

// Floor-standing items: bottom edge = GROUND (y 738 source px).
const CAB = box(60, 500, 120, 238); // control cabinet (PLC / HMI)
const GEN = box(470, 600, 130, 138); // induction generator (power electronics)
const PUMP = box(210, 652, 150, 78); // vacuum pump body
const MOTOR = box(360, 652, 80, 78); // pump drive motor
const PUMP_BASE = box(200, 730, 240, 8);
const LC = box(606, 424, 188, 306); // lower investment flask chamber
const LC_BASE = box(596, 730, 208, 8);

// Stacked on the lower chamber through the stopper flange.
const UC = box(600, 78, 198, 328); // upper melting chamber
const ACT = box(677, 30, 40, 44); // stopper actuator on the lid

// Gas bottle on the right, on the floor of its own bay.
const GAS = box(1064, 185, 32, 77);

/* Measurement points: printed tags only, mounted on the item they measure. */
const POINTS: Array<{ tag: string; at: Pt; dir: "up" | "down" | "left" | "right"; kind: "transmitter" | "gauge" | "switch" | "probe"; side: "start" | "end" }> = [
  { tag: "S1", at: at(677, 60), dir: "left", kind: "switch", side: "end" }, // stopper rod state, on actuator
  { tag: "P1", at: at(798, 130), dir: "right", kind: "gauge", side: "start" }, // upper chamber pressure
  { tag: "T1", at: at(728, 250), dir: "right", kind: "probe", side: "start" }, // melt temperature, crucible wall
  { tag: "S2", at: at(794, 444), dir: "right", kind: "switch", side: "start" }, // pouring stopper closure
  { tag: "P2", at: at(794, 515), dir: "right", kind: "gauge", side: "start" }, // flask pressure
  { tag: "T2", at: at(1000, 400), dir: "right", kind: "probe", side: "start" }, // cooling-water return
  { tag: "T3", at: at(900, 372), dir: "up", kind: "probe", side: "start" }, // cooling-water return, upstream
  { tag: "F1", at: at(960, 330), dir: "up", kind: "transmitter", side: "start" }, // cooling-water flow
  { tag: "P3", at: at(960, 222), dir: "up", kind: "gauge", side: "start" }, // gas supply pressure
  { tag: "E1", at: at(520, 600), dir: "up", kind: "transmitter", side: "start" }, // electrical power
  { tag: "V1", at: at(240, 652), dir: "up", kind: "transmitter", side: "start" }, // pump vibration
  { tag: "T4", at: at(330, 652), dir: "up", kind: "probe", side: "start" }, // pump temperature
  { tag: "V2", at: at(640, 738), dir: "down", kind: "transmitter", side: "start" }, // optional flask vibration
];

/* ---------------------------------------------------------------- art */

function Art() {
  return (
    <g>
      <GroundLine x1={40} x2={W - 40} y={GROUND} />
      <Baseplate {...LC_BASE} />
      <Baseplate {...PUMP_BASE} />

      {/* 2. pipes behind equipment (ends tuck under the bodies) */}
      <Pipe pts={[at(285, 652), at(285, 163), at(600, 163)]} d={10} />
      <Pipe pts={[at(285, 560), at(606, 560)]} d={8} />
      <Pipe pts={[at(1120, 330), at(798, 330)]} d={8} />
      <Pipe pts={[at(798, 372), at(1000, 372), at(1000, 448), at(1120, 448)]} d={8} />
      <Pipe pts={[at(1064, 222), at(880, 222), at(880, 298), at(798, 298)]} d={8} />

      {/* 3. large equipment */}
      <Cabinet {...CAB} doors={1} screen lamps={2} />
      <Cabinet {...GEN} doors={1} />
      <Housing {...PUMP} rx={8} />
      <ElectricMotor {...MOTOR} shaft="left" />

      <Chamber {...UC} heat />
      <rect {...rect(677, 30, 40, 44)} rx={3} {...PAINT.cylinderV} />
      <rect {...rect(672, 26, 50, 6)} rx={2} {...PAINT.raised} />
      <rect {...rect(694, 78, 6, 254)} {...PAINT.shaft} />
      <rect {...rect(689, 330, 16, 76)} rx={3} {...PAINT.cylinderV} />
      <rect {...rect(596, 406, 206, 8)} rx={2} {...PAINT.raised} />
      <rect {...rect(596, 414, 206, 6)} rx={2} {...PAINT.raised} />
      <BoltLine x1={X(606)} y1={Y(410)} x2={X(792)} y2={Y(410)} count={8} />

      {/* induction coil: two columns of turns on both sides of the crucible */}
      {Array.from({ length: 13 }).map((_, i) => (
        <g key={i}>
          <rect {...rect(640, 150 + i * 14, 12, 7)} rx={3} {...PAINT.raised} />
          <rect {...rect(748, 150 + i * 14, 12, 7)} rx={3} {...PAINT.raised} />
        </g>
      ))}
      <rect {...rect(672, 200, 56, 126)} rx={4} {...PAINT.cylinderV} />
      <rect {...rect(668, 196, 64, 6)} rx={2} {...PAINT.raised} />
      <rect {...rect(678, 255, 44, 63)} rx={3} {...PAINT.material} />

      <Chamber {...LC} />
      <rect {...rect(649, 513, 95, 160)} rx={4} {...PAINT.raised} />
      <line x1={X(697)} y1={Y(530)} x2={X(697)} y2={Y(665)} {...PAINT.hair} />
      {Array.from({ length: 6 }).map((_, i) => {
        const y = 545 + i * 22;
        return (
          <g key={i}>
            <line x1={X(697)} y1={Y(y)} x2={X(659)} y2={Y(y - 16)} {...PAINT.hair} />
            <line x1={X(697)} y1={Y(y)} x2={X(735)} y2={Y(y - 16)} {...PAINT.hair} />
          </g>
        );
      })}
      <rect {...rect(636, 673, 118, 11)} rx={2} {...PAINT.raised} />
      <rect {...rect(651, 684, 88, 16)} rx={2} {...PAINT.raised} />

      <GasCylinder {...GAS} />

      {/* 4. pipes in front: the power cable enters the upper chamber */}
      <Pipe pts={[at(560, 600), at(560, 240), at(640, 240)]} d={6} flanges={false} />

      {/* 5. valves */}
      <Valve x={X(450)} y={Y(163)} size={18} kind="gate" />
      <Valve x={X(460)} y={Y(560)} size={16} kind="gate" />
      <Valve x={X(910)} y={Y(222)} size={16} kind="globe" />

      {/* 6. process flows and signals */}
      <Flow pts={[at(285, 250), at(285, 300)]} medium="air" />
      <Flow pts={[at(850, 298), at(810, 298)]} medium="gas" />
      <Flow pts={[at(1100, 330), at(1060, 330)]} medium="water" />
      <Flow pts={[at(1040, 448), at(1090, 448)]} medium="water" />
      <Flow pts={[at(120, 500), at(120, 215), at(600, 215)]} medium="signal" arrow={false} />
      <Flow pts={[at(180, 630), at(470, 630)]} medium="signal" arrow={false} />

      {/* 7. instruments */}
      {POINTS.map((p) => (
        <Instrument key={p.tag} x={p.at[0]} y={p.at[1]} dir={p.dir} kind={p.kind} />
      ))}

      {/* 8. equipment labels */}
      <MachineLabel x={CAB.x + CAB.w / 2} y={GROUND + 20} size={10}>CONTROL CABINET</MachineLabel>
      <MachineLabel x={GEN.x + GEN.w / 2} y={GROUND + 20} size={10}>INDUCTION GENERATOR</MachineLabel>
      <MachineLabel x={PUMP.x + (PUMP.w + MOTOR.w) / 2} y={GROUND + 20} size={10}>VACUUM PUMP + MOTOR</MachineLabel>
      <MachineLabel x={LC.x + LC.w / 2 + 80} y={GROUND + 20} size={10}>LOWER FLASK CHAMBER</MachineLabel>
      <MachineLabel x={UC.x - 10} y={UC.y - 8} size={10} anchor="end">UPPER MELTING CHAMBER</MachineLabel>
      <MachineLabel x={ACT.x + ACT.w / 2} y={ACT.y - 10} size={10}>STOPPER ACTUATOR</MachineLabel>
      <MachineLabel x={GAS.x + GAS.w / 2 - 60} y={GAS.y - 10} size={10}>GAS / PRESSURE SUPPLY</MachineLabel>
    </g>
  );
}

/* ---------------------------------------------------------------- pads and value plates */

const pads: Record<string, [number, number]> = {};
const callouts: NonNullable<LineSheetArt["callouts"]> = {};
for (const p of POINTS) {
  const head = instrumentHead(p.at[0], p.at[1], p.dir);
  pads[p.tag] = head;
  callouts[p.tag] = [head[0] + (p.side === "start" ? 14 : -14), head[1], p.side];
}

export const sheet: LineSheetArt = {
  id: "vacuum-casting-cell",
  width: W,
  height: H,
  ready: true,
  Art,
  pads,
  callouts,
};
