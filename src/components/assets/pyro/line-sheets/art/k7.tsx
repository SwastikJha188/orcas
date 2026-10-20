/**
 * Sheet K-7 — KLN-01 · Rotary kiln — Axial thrust system.
 *
 * Panel "AXIAL THRUST SYSTEM" of group image 3C (page 9, panel box 842.5
 * 105.5 – 1605.5 777.5): the kiln shell floating uphill / downhill on tyre 2,
 * the support roller end-on on the station 2 pier, the hydraulic thrust
 * roller against the tyre flank driven by its actuator with the LVDT
 * (axial position) and the travel-limit switch, the two hydraulic lines down
 * to the valve block with the thrust pressure transmitter, and the hydraulic
 * power unit (oil tank and motor-pump) below.
 */
import React from "react";
import { Bolt, CornerBolts, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import type { LineSheetArt } from "../types";
import { Arrow, KilnShell, Pier, Tyre } from "./parts-kb";
import { Flow } from "./parts-k2";

const W = 763;
const H = 672;
const GROUND = 607;

const SHELL = { x: 37.5, y: 128.5, w: 512.5, h: 114.5 };
const TYRE = { cx: 308.5, y: 106, w: 43, h: 158 };
const ROLLER = { cx: 308.5, cy: 305, r: 30 };
const ACT = { x: 361.5, y: 220, w: 148.5, h: 24 };
const VB = { x: 611, y: 405, w: 60.5, h: 29 };
const HPU = { x: 523.5, y: 432, w: 161.5, h: 121.5 };

function KilnAndStation() {
  return (
    <g>
      <Pier cx={308.75} top={344} bottom={GROUND} wTop={95} wBot={123.5} />
      <circle cx={ROLLER.cx} cy={ROLLER.cy} r={ROLLER.r} {...PAINT.shaft} strokeWidth={MX.w} />
      <circle cx={ROLLER.cx} cy={ROLLER.cy} r={ROLLER.r * 0.8} fill="none" stroke={MX.edge} strokeWidth={0.8} opacity={0.6} />
      <circle cx={ROLLER.cx} cy={ROLLER.cy} r={ROLLER.r * 0.4} {...PAINT.raised} />
      <circle cx={ROLLER.cx} cy={ROLLER.cy} r={6.5} {...PAINT.recess} />
      <KilnShell x={SHELL.x} y={SHELL.y} w={SHELL.w} h={SHELL.h} seam={36.6} />
      <Tyre cx={TYRE.cx} y={TYRE.y} w={TYRE.w} h={TYRE.h} shellTop={SHELL.y} shellBot={SHELL.y + SHELL.h} />
      {/* kiln float: uphill ↔ downhill */}
      <Arrow x1={170} y1={101} x2={110} y2={101} head={9} />
      <Arrow x1={168} y1={101} x2={228.5} y2={101} head={9} />
    </g>
  );
}

function Thrust() {
  return (
    <g>
      {/* hydraulic lines: actuator ends → valve block */}
      <Flow pts={[[ACT.x + ACT.w, 229], [641.5, 229], [641.5, VB.y]]} color={MX.material} w={3} />
      <Flow pts={[[428.5, ACT.y + ACT.h], [428.5, 377.5], [621.5, 377.5], [621.5, VB.y]]} color={MX.material} w={3} />

      {/* thrust roller against the tyre flank, on its clevis */}
      <rect x={347.5} y={226.5} width={14} height={10.5} rx={1.5} {...PAINT.shaft} />
      <rect x={332} y={203.5} width={29.5} height={57} rx={5} {...PAINT.raised} />
      <rect x={332} y={203.5} width={29.5} height={57} rx={5} fill={MX.material} opacity={0.22} />
      <line x1={346.75} x2={346.75} y1={208} y2={256} {...PAINT.hair} />

      {/* hydraulic actuator */}
      <rect x={ACT.x} y={ACT.y} width={ACT.w} height={ACT.h} rx={4} {...PAINT.cylinder} />
      <rect x={ACT.x + 4} y={ACT.y - 2} width={6} height={ACT.h + 4} rx={1.5} {...PAINT.raised} />
      <rect x={ACT.x + ACT.w - 10} y={ACT.y - 2} width={6} height={ACT.h + 4} rx={1.5} {...PAINT.raised} />
      <Bolt x={ACT.x + 7} y={ACT.y + 5} r={1.1} />
      <Bolt x={ACT.x + ACT.w - 7} y={ACT.y + ACT.h - 5} r={1.1} />

      {/* LVDT along the actuator, linked to the rod */}
      <rect x={426.5} y={207.5} width={4} height={12.5} {...PAINT.shaft} />
      <rect x={378.5} y={196.5} width={102} height={11} rx={2.5} {...PAINT.body} />
      <rect x={378.5} y={196.5} width={102} height={11} rx={2.5} fill={MX.air} opacity={0.55} />

      {/* travel-limit cam under the actuator and the limit switch */}
      <rect x={375} y={252.5} width={15} height={15} rx={2} fill="none" stroke={MX.fine} strokeWidth={MX.w} />
      <rect x={496.5} y={ACT.y + ACT.h} width={4} height={6} {...PAINT.shaft} />
      <rect x={487} y={249.5} width={23} height={21} rx={4} {...PAINT.body} />

      {/* valve block with the pressure transmitter */}
      <rect x={VB.x} y={VB.y} width={VB.w} height={VB.h} rx={4} {...PAINT.body} />
      <CornerBolts x={VB.x} y={VB.y} w={VB.w} h={VB.h} inset={4.5} r={1.1} />
    </g>
  );
}

function PowerUnit() {
  const { x, y, w, h } = HPU;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} {...PAINT.body} />
      <rect x={x + 5} y={y + 5} width={w - 10} height={h - 10} rx={5} fill="none" stroke={MX.fine} strokeWidth={0.8} />
      {/* oil tank level window */}
      <rect x={536.5} y={445} width={61} height={41} rx={2.5} fill={MX.material} stroke={MX.edge} strokeWidth={MX.w} />
      {/* motor-pump */}
      <rect x={564} y={542.5} width={68.5} height={6} rx={1.5} {...PAINT.raised} />
      <rect x={539} y={506} width={20} height={33} rx={6} {...PAINT.body} />
      <rect x={556} y={502} width={85} height={40.5} rx={8} {...PAINT.body} />
      {[510, 515, 520, 525, 530, 535].map((fy) => (
        <line key={fy} x1={563} x2={634} y1={fy} y2={fy} stroke={MX.fine} strokeWidth={0.8} />
      ))}
      <rect x={584} y={517.5} width={29} height={10} rx={2.5} {...PAINT.recess} />
      <rect x={581} y={493} width={34} height={9} rx={2.5} {...PAINT.raised} />
      <rect x={641} y={519} width={12} height={7} rx={1.5} {...PAINT.shaft} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={30} x2={733} y={GROUND} />
      <KilnAndStation />
      <Thrust />
      <PowerUnit />

      <MachineLabel x={168.5} y={90} size={7}>
        KILN FLOATS UPHILL ↔ DOWNHILL
      </MachineLabel>
      <MachineLabel x={308.5} y={99.5} size={8}>
        TYRE 2
      </MachineLabel>
      <MachineLabel x={428.5} y={190.5} size={6.5}>
        LVDT
      </MachineLabel>
      <MachineLabel x={404} y={190.5} anchor="end" size={6.5}>
        THRUST ROLLER
      </MachineLabel>
      <MachineLabel x={604} y={580} size={7.5}>
        HYDRAULIC POWER UNIT
      </MachineLabel>
      <MachineLabel x={308} y={628} size={7.5}>
        STATION 2
      </MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on group image 3C, right panel. */
const pads: LineSheetArt["pads"] = {
  "POS-KLN-01": [428.5, 202],
  "POS-KLN-02": [498.5, 260],
  "PRS-KLN-07": [641.5, 420],
};

/** Plate side per point: LVDT and limit switch run right along the shell, thrust pressure left over the valve block. */
const callouts: LineSheetArt["callouts"] = {
  "POS-KLN-01": [441, 202, "start"],
  "POS-KLN-02": [511, 260, "start"],
  "PRS-KLN-07": [629, 420, "end"],
};

export const sheet: LineSheetArt = { id: "K-7", ready: true, width: W, height: H, Art, pads, callouts };
