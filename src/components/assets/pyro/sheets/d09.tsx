"use client";

/**
 * D09 — CLR-01 grate cooler, compartments and cooling fans 1–3 (hot zone).
 * Hot clinker from the kiln drops on the grate at the left and travels right;
 * under the grate, compartments 1–3 are each pressurised by their own
 * cooling fan (volute outlet up into the compartment, bearing pedestal,
 * coupling, motor). Measurement points: compartment static pressure, fan
 * bearing temperature + vibration, fan motor current.
 */

import React from "react";
import { MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { FanSet, Flange, fanGeom, type FanSpec } from "../drawings/clk-parts";
import type { PyroSheetDrawing, SheetCalloutAnchor } from "./sheet-types";
import { Compartment, CoolerFrame, GrateCasing, Lumps } from "./sc-parts";

const W = 880;
const H = 490;

const CASE = { x: 35, y: 81, w: 818, h: 114 };
const COMP_Y = 200;
const COMP_H = 66;
const SLOT = 271;
const FLOOR = 452;
const slotX = (i: number) => 45 + i * SLOT;
const tap = (i: number): [number, number] => [slotX(i) + 88, 230];

const FANS: FanSpec[] = [0, 1, 2].map((i) => ({
  cx: slotX(i) + 137,
  cy: 404,
  r: 36,
  motorW: 48,
  motorH: 36,
  ductTop: COMP_Y + COMP_H,
  baseY: FLOOR - 8,
}));
const FG = FANS.map(fanGeom);

function Art() {
  return (
    <g>
      {/* ---------------- support frame and basement floor ---------------- */}
      <CoolerFrame x1={CASE.x + 4} x2={CASE.x + CASE.w - 4} top={CASE.y + CASE.h} floor={FLOOR} floorX1={CASE.x - 8} floorX2={CASE.x + CASE.w + 8} />

      {/* ---------------- cooler casing, clinker bed, grate ---------------- */}
      <GrateCasing x={CASE.x} y={CASE.y} w={CASE.w} h={CASE.h} bedL={138} bedR={156} hot label="GRATE BED · CLINKER TRAVELS →" />

      {/* ---------------- inlet chute: hot clinker from the kiln ---------------- */}
      <rect x={38} y={CASE.y - 4} width={106} height={9} rx={2} {...PAINT.raised} />
      <path d="M 6 8 L 110 8 L 136 106 L 42 106 Z" {...PAINT.body} />
      <path d="M 17 16 L 101 16 L 124 104 L 52 104 Z" {...PAINT.recess} />
      <ellipse cx={80} cy={62} rx={36} ry={26} fill={MX.heat} />
      <Lumps pts={[[58, 34], [76, 42], [66, 58], [88, 56], [96, 72], [78, 74], [56, 70]]} r={2.6} />
      <MachineLabel x={124} y={20} anchor="start" size={7.5}>HOT CLINKER FROM KILN</MachineLabel>

      {/* ---------------- compartments 1–3 and their cooling fans ---------------- */}
      {FANS.map((f, i) => {
        const g = FG[i];
        return (
          <g key={i}>
            <Compartment x={slotX(i)} y={COMP_Y} w={SLOT - 9} h={COMP_H} n={i + 1} tap={tap(i)} />
            <FanSet {...f} />
            <Flange x={(g.duct[0] + g.duct[1]) / 2} y={COMP_Y + COMP_H + 10} w={g.duct[1] - g.duct[0]} vertical />
            <MachineLabel x={f.cx + 40} y={FLOOR + 26} size={7.5}>{`COOLING FAN ${i + 1}`}</MachineLabel>
          </g>
        );
      })}
    </g>
  );
}

const pads: Record<string, [number, number]> = {};
FG.forEach((g, i) => {
  const n = i + 1;
  pads[`PRS-CLR-0${n}`] = tap(i);
  pads[`TMP-CLR-0${n}`] = g.bearingTop;
  pads[`VIB-CLR-0${n}`] = g.bearingBot;
  pads[`ELE-CLR-0${n}`] = g.terminal;
});

/**
 * Callout boxes as on PDF page 9 (top-left corner and width, drawing units):
 * the pressure box inside its compartment beside the tap, the fan's three
 * boxes stacked in the free bay left of its volute. Motor current sits on top
 * so the three leaders to the bearing and terminal box do not cross.
 */
const callouts: Record<string, SheetCalloutAnchor> = {};
FG.forEach((g, i) => {
  const n = i + 1;
  const x = slotX(i) + 3;
  const w = g.extent[0] + 4 - x;
  callouts[`PRS-CLR-0${n}`] = [tap(i)[0] + 13, COMP_Y + 8, 134];
  callouts[`ELE-CLR-0${n}`] = [x, COMP_Y + COMP_H + 8, w];
  callouts[`TMP-CLR-0${n}`] = [x, COMP_Y + COMP_H + 57, w];
  callouts[`VIB-CLR-0${n}`] = [x, COMP_Y + COMP_H + 115, w];
});

export const sheet: PyroSheetDrawing = { sheet: "D09", width: W, height: H, Art, pads, callouts };
