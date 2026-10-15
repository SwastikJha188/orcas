/**
 * Sheet C-0 — CLR-01 · Clinker cooler — Overview.
 * Kiln hood with the kiln nose and secondary air at the left; the grate
 * cooler casing with its clinker bed over six under-grate compartments,
 * each fed by its own cooling fan; at the outlet end the discharge chute
 * with the IR pyrometer, the grate-drive cylinder with its hydraulic power
 * unit below, and the cooler exhaust duct into the vent fan.
 */
import React from "react";
import { Bolt, GroundLine, Motor, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { FlowArrow } from "../../drawings/clk-parts";
import type { LineSheetArt } from "../types";
import { CentrifugalFan, Column, CoolerCasing, DuctFlange, GasDuct, GasFlange, HydCylinder, Lumps, OilHose, VDuct } from "./parts-c";

const W = 1144.5;
const H = 479;

const GROUND = 460;
const CASE = { x: 84, y: 114, w: 797.5, h: 146.5 };
const PITCH = 131.2;
const COMP = { x: 89, y: 265.5, w: 127, h: 54.5 };
const FAN = { cx: 142, cy: 399, r: 24, top: 369, base: 426.5 };
const VENT = { cx: 1009, cy: 241.5, r: 36 };
const HPU = { x: 889.5, y: 392, w: 112.5, h: 60.5 };
const CYL_Y = 330;

function Art() {
  return (
    <g>
      <GroundLine x1={15} x2={1136} y={GROUND} />

      {/* ---------------- cooler exhaust duct into the vent fan ---------------- */}
      <GasDuct pts={[[754, CASE.y + 2], [754, 45.3], [969, 45.3], [969, 216], [998, 216]]} w={18} />
      <GasFlange x={754} y={84} w={18} vertical />
      <GasFlange x={969} y={120} w={18} vertical />
      <MachineLabel x={831} y={32} anchor="start" size={7.5}>COOLER EXHAUST</MachineLabel>

      {/* ---------------- kiln hood ---------------- */}
      <rect x={30.5} y={15.5} width={113.5} height={97.5} rx={9} {...PAINT.body} />
      <rect x={44} y={22} width={92} height={96} rx={4} {...PAINT.recess} />
      <rect x={92} y={108} width={44} height={22} {...PAINT.recess} stroke="none" />
      <rect x={2} y={32} width={36} height={64} rx={2} {...PAINT.cylinder} />
      <rect x={25} y={26} width={9} height={76} rx={2} {...PAINT.raised} />
      <ellipse cx={62} cy={70} rx={18} ry={26} fill={MX.heat} />
      <rect x={40} y={40} width={4} height={50} rx={1.5} fill={MX.material} opacity={0.75} />
      <Lumps pts={[[52, 92], [60, 102], [70, 110], [62, 116], [78, 120]]} r={2.1} />
      <FlowArrow x1={129} y1={113} x2={129} y2={76} />
      <MachineLabel x={57.5} y={11} anchor="start" size={7.5}>KILN HOOD</MachineLabel>
      <MachineLabel x={157} y={89.4} anchor="start" size={6.8}>SECONDARY AIR</MachineLabel>

      {/* ---------------- grate cooler casing ---------------- */}
      <CoolerCasing x={CASE.x} y={CASE.y} w={CASE.w} h={CASE.h} grate={240} bedL={204} bedR={218} hot={250} doors={[150, 690]} />
      <rect x={92} y={110} width={44} height={22} {...PAINT.recess} stroke="none" />
      <rect x={745} y={CASE.y - 3.5} width={18} height={7} rx={2} {...PAINT.raised} />
      <MachineLabel x={375} y={141} anchor="start" size={8.2}>GRATE COOLER — CLINKER TRAVELS →</MachineLabel>

      {/* ---------------- compartments, ducts, cooling fans ---------------- */}
      {Array.from({ length: 6 }).map((_, i) => {
        const x = COMP.x + i * PITCH;
        const fcx = FAN.cx + i * PITCH;
        return (
          <g key={i}>
            <rect x={x} y={COMP.y} width={COMP.w} height={COMP.h} rx={6} {...PAINT.body} />
            <rect x={x + 4} y={COMP.y + 4} width={COMP.w - 8} height={COMP.h - 8} rx={3} fill="none" stroke={MX.fine} strokeWidth={0.8} />
            <rect x={x - 1} y={COMP.y - 2.5} width={COMP.w + 2} height={4} rx={1.2} {...PAINT.raised} />
            <FlowArrow x1={x + 14} y1={296} x2={x + 14} y2={275} />
            <FlowArrow x1={x + 28} y1={296} x2={x + 28} y2={275} />
            <rect x={x + 105} y={283.5} width={COMP.w - 105} height={4} {...PAINT.shaft} />
            <rect x={x + 98} y={279.5} width={14} height={12} rx={3} {...PAINT.raised} />
            <MachineLabel x={x + 63} y={308.2} size={7.1}>{`COMP. ${i + 1}`}</MachineLabel>

            <VDuct x={fcx - 17} w={13} y1={COMP.y + COMP.h} y2={358} />
            <rect x={fcx - 19} y={334} width={17} height={12} rx={2} {...PAINT.body} />
            <line x1={fcx - 16} x2={fcx - 5} y1={343} y2={337} stroke={MX.metal} strokeWidth={1.4} />
            <path d={`M ${fcx - 17} 358 H ${fcx - 4} L ${fcx} ${FAN.top} H ${fcx - FAN.r} Z`} {...PAINT.body} />
            <DuctFlange x={fcx - 17} w={13} y={358} />
            <CentrifugalFan cx={fcx} cy={FAN.cy} r={FAN.r} top={FAN.top} outlet="left" base={FAN.base} bx={fcx + 24} bw={8} bh={26} mx={fcx + 38} mw={34} mh={28} />
            <rect x={fcx - 32} y={FAN.base + 5} width={118} height={GROUND - FAN.base - 5} rx={2} {...PAINT.body} />
            <line x1={fcx - 28} x2={fcx + 82} y1={GROUND - 9} y2={GROUND - 9} {...PAINT.hair} />
          </g>
        );
      })}

      {/* ---------------- discharge chute and IR pyrometer ---------------- */}
      <path d="M 882.5 188 L 926 188 L 946 316 L 890 316 Z" {...PAINT.body} />
      <path d="M 889 196 L 920 196 L 937 309 L 896 309 Z" {...PAINT.recess} />
      <rect x={876} y={196} width={14} height={50} {...PAINT.recess} stroke="none" />
      <Lumps pts={[[884, 214], [893, 222], [898, 240], [906, 258], [902, 276], [914, 290], [922, 300]]} r={2.2} />
      <rect x={929} y={210} width={17} height={14} rx={3} {...PAINT.raised} />
      <line x1={929} y1={222} x2={910} y2={290} stroke={MX.label} strokeWidth={0.9} strokeDasharray="2.5 2.5" />
      <FlowArrow x1={918} y1={320} x2={918} y2={355} />
      <MachineLabel x={975.5} y={329} anchor="start" size={7.5}>TO CRUSHER</MachineLabel>

      {/* ---------------- grate drive: lever, cylinder, stroke sensor ---------------- */}
      <rect x={875.5} y={CASE.y + CASE.h - 4} width={5} height={CYL_Y - CASE.y - CASE.h + 8} rx={1.5} {...PAINT.shaft} />
      <circle cx={878} cy={CYL_Y + 1} r={3.4} {...PAINT.raised} />
      <path d={`M 804 ${COMP.y + COMP.h} H 818 V ${CYL_Y - 4} L 812 ${CYL_Y + 6} H 806 Z`} {...PAINT.body} />
      <HydCylinder x1={815} x2={858} y={CYL_Y - 6} h={13} rodX={876} rodH={5} />
      <rect x={858} y={COMP.y + COMP.h} width={4} height={4} {...PAINT.shaft} />
      <rect x={860} y={318} width={6} height={9} rx={1.2} {...PAINT.shaft} />
      <OilHose pts={[[822, CYL_Y + 10], [822, 352], [900, 352], [900, HPU.y]]} w={4} />
      <OilHose pts={[[851, CYL_Y + 10], [851, 358], [906, 358], [906, HPU.y]]} w={4} />

      {/* ---------------- hydraulic power unit ---------------- */}
      <rect x={HPU.x} y={HPU.y} width={HPU.w} height={HPU.h} rx={8} {...PAINT.body} />
      <rect x={HPU.x + 4} y={HPU.y + 4} width={HPU.w - 8} height={HPU.h - 8} rx={5} fill="none" stroke={MX.fine} strokeWidth={0.8} />
      <rect x={900} y={404} width={45} height={30} rx={3} {...PAINT.raised} />
      <rect x={903} y={407} width={39} height={24} rx={2} {...PAINT.recess} />
      <rect x={904} y={413} width={37} height={17} rx={1.5} fill={MX.material} opacity={0.9} />
      <Motor x={956} y={420} w={30} h={18} terminalBox={false} />
      <rect x={964} y={398} width={24} height={15} rx={3} {...PAINT.raised} />
      <rect x={968} y={413} width={4} height={7} {...PAINT.shaft} />
      {[900, 990].map((x) => (
        <rect key={x} x={x} y={HPU.y + HPU.h} width={8} height={GROUND - HPU.y - HPU.h} rx={1} {...PAINT.body} />
      ))}
      <MachineLabel x={940.7} y={473} size={7.5}>GRATE DRIVE HPU</MachineLabel>

      {/* ---------------- vent fan on its platform ---------------- */}
      <CentrifugalFan cx={VENT.cx} cy={VENT.cy} r={VENT.r} top={200} outlet="right" base={280.6} bx={1050} bw={9} bh={42} mx={1066} mw={51} mh={40} />
      {[1040, 1128].map((x) => (
        <Column key={x} x={x} y1={286} y2={GROUND} w={7} />
      ))}
      <line x1={1044} x2={1124} y1={336} y2={336} stroke={MX.edge} strokeWidth={1.2} />
      <line x1={1044} x2={1124} y1={336} y2={GROUND - 4} stroke={MX.edge} strokeWidth={1} />
      <line x1={1124} x2={1044} y1={336} y2={GROUND - 4} stroke={MX.edge} strokeWidth={1} />
      <Bolt x={1084} y={(336 + GROUND - 4) / 2} r={1.6} />
      <MachineLabel x={1084} y={298.5} size={7.5}>VENT FAN</MachineLabel>
      <MachineLabel x={1084} y={309} size={7.5}>→ DEDUSTING</MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 28. */
const pads: LineSheetArt["pads"] = {
  "PRS-CLR-01": [194, 285.5],
  "VIB-CLR-01": [141.5, 398],
  "TMP-CLR-01": [164, 405.5],
  "ELE-CLR-01": [194.5, 380],
  "PRS-CLR-02": [325, 285.5],
  "VIB-CLR-02": [272.5, 398],
  "TMP-CLR-02": [295, 405.5],
  "ELE-CLR-02": [326, 380],
  "PRS-CLR-03": [456.5, 285.5],
  "VIB-CLR-03": [404, 398],
  "TMP-CLR-03": [426.5, 405.5],
  "ELE-CLR-03": [457, 380],
  "PRS-CLR-04": [587.5, 285.5],
  "TMP-CLR-04": [557.5, 405.5],
  "ELE-CLR-04": [588.5, 380],
  "PRS-CLR-05": [719, 285.5],
  "TMP-CLR-05": [689, 405.5],
  "ELE-CLR-05": [719.5, 380],
  "PRS-CLR-06": [850, 285.5],
  "TMP-CLR-06": [820, 405.5],
  "ELE-CLR-06": [851, 380],
  "TMP-CLR-08": [937, 217],
  "PRS-CLR-07": [975.5, 405.5],
  "TMP-CLR-07": [918.5, 417.5],
  "SPD-CLR-01": [863, 323],
  "TMP-CLR-09": [863, 45.5],
  "VIB-CLR-07": [1047.5, 240.5],
  "TMP-CLR-10": [1047.5, 260],
  "ELE-CLR-07": [1091.5, 216.5],
};

export const sheet: LineSheetArt = { id: "C-0", ready: true, width: W, height: H, Art, pads };
