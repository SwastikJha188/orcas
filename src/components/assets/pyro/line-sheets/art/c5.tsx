/**
 * Sheet C-5 — CLR-01 · Clinker cooler — Discharge, exhaust and vent fan.
 * At the end of the grate the cooled clinker tips through the end-wall
 * opening into the discharge chute (wear liners, IR pyrometer looking in
 * through a sight port) and on down the transfer chute to the crusher.
 * Excess air leaves the casing roof through the cooler exhaust duct
 * (thermocouple, expansion joint, damper) into the inlet of the vent fan,
 * which discharges to dedusting; the fan stands on a steel platform.
 */
import React from "react";
import { Bolt, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { FlowArrow } from "../../drawings/clk-parts";
import type { LineSheetArt } from "../types";
import { CentrifugalFan, Column, CoolerCasing, GasDuct, GasFlange, Lumps } from "./parts-c";

const W = 824;
const H = 704;

const CASE = { x: 23, y: 120.5, w: 352.5, h: 192.5 };
const GRATE = 296;
const DW = 36;
const LEG_L = 263;
const RUN = 64;
const LEG_R = 618;
const FAN = { cx: 660.5, cy: 315.5, r: 75 };
const DECK = 415.5;
const GROUND = 660;
const IR = { x: 495.5, y: 285.5, w: 45, h: 30 };

function Art() {
  return (
    <g>
      <GroundLine x1={22} x2={802} y={GROUND} />

      {/* ---------------- cooler exhaust duct (into the vent-fan inlet) ---------------- */}
      <GasDuct pts={[[LEG_L, CASE.y + 2], [LEG_L, RUN], [LEG_R, RUN], [LEG_R, 300]]} w={DW} />
      <GasFlange x={LEG_L} y={104} w={DW} vertical />
      <GasFlange x={330} y={RUN} w={DW} />
      <GasFlange x={560} y={RUN} w={DW} />
      <GasFlange x={LEG_R} y={140} w={DW} vertical />
      <GasFlange x={LEG_R} y={226} w={DW} vertical />
      {/* expansion joint on the top run */}
      <rect x={372} y={RUN - DW / 2 - 2} width={22} height={DW + 4} rx={2} fill={MX.flatBody} stroke={MX.edge} strokeWidth={1.2} />
      {[376, 380, 384, 388].map((x) => (
        <line key={x} x1={x} x2={x} y1={RUN - DW / 2} y2={RUN + DW / 2} {...PAINT.hair} />
      ))}
      {/* butterfly damper with actuator on the down leg */}
      <rect x={LEG_R - DW / 2 - 1} y={170} width={DW + 2} height={30} rx={2} {...PAINT.body} />
      <line x1={LEG_R - 13} y1={192} x2={LEG_R + 13} y2={178} stroke={MX.metal} strokeWidth={2.4} strokeLinecap="round" />
      <circle cx={LEG_R} cy={185} r={2.6} {...PAINT.shaft} />
      <rect x={LEG_R + DW / 2} y={183} width={8} height={4} {...PAINT.shaft} />
      <rect x={LEG_R + DW / 2 + 7} y={175} width={15} height={20} rx={3} {...PAINT.raised} />
      <rect x={LEG_R + DW / 2 + 10} y={179} width={9} height={8} rx={1.5} {...PAINT.recess} />
      {/* exhaust thermocouple from under the top run */}
      <rect x={448.5} y={RUN + DW / 2 - 1} width={4} height={10} {...PAINT.shaft} />
      <rect x={444} y={91} width={13} height={11} rx={3} {...PAINT.raised} />
      <MachineLabel x={449.5} y={36.6} size={8.2}>COOLER EXHAUST DUCT</MachineLabel>

      {/* ---------------- end of the grate ---------------- */}
      <CoolerCasing x={CASE.x} y={CASE.y} w={CASE.w} h={CASE.h} grate={GRATE} bedL={254} bedR={267} doors={[100]} />
      <rect x={LEG_L - DW / 2 - 6} y={CASE.y - 4} width={DW + 12} height={8} rx={2} {...PAINT.raised} />
      <Bolt x={LEG_L - DW / 2 - 2} y={CASE.y} r={1.3} />
      <Bolt x={LEG_L + DW / 2 + 2} y={CASE.y} r={1.3} />
      <MachineLabel x={148.5} y={150} anchor="start" size={8.2}>END OF GRATE</MachineLabel>

      {/* ---------------- discharge chute with wear liners ---------------- */}
      <path d="M 375.5 225.5 L 451 225.5 L 481 421 L 390.5 421 Z" {...PAINT.body} />
      <path d="M 384 235 L 443 235 L 470 412 L 398 412 Z" {...PAINT.recess} />
      {/* end-wall opening from the grate into the chute */}
      <rect x={360} y={240} width={30} height={GRATE + 7 - 240} {...PAINT.recess} stroke="none" />
      {[260, 300, 340, 380].map((y) => (
        <g key={y}>
          <Bolt x={381 + ((y - 225.5) * 15) / 195.5} y={y} r={1.4} />
          <Bolt x={457 + ((y - 225.5) * 30) / 195.5} y={y} r={1.4} />
        </g>
      ))}
      <Lumps pts={[[364, 262], [372, 270], [380, 266], [386, 282], [394, 300], [404, 318], [398, 334], [414, 350], [408, 370], [424, 384], [418, 400], [436, 404], [428, 392]]} r={2.6} />
      <rect x={386} y={418} width={98} height={6} rx={1.5} {...PAINT.raised} />

      {/* transfer chute down to the crusher */}
      <rect x={395} y={424} width={70} height={142} rx={3} {...PAINT.body} />
      <rect x={403} y={432} width={54} height={126} rx={2} {...PAINT.recess} />
      <Lumps pts={[[418, 444], [432, 456], [424, 474], [440, 490], [430, 508], [446, 522], [436, 540], [422, 528]]} r={2.6} />
      {[440, 480, 520].map((y) => (
        <g key={y}>
          <Bolt x={399} y={y} r={1.3} />
          <Bolt x={461} y={y} r={1.3} />
        </g>
      ))}
      <rect x={390} y={563} width={80} height={6} rx={1.5} {...PAINT.raised} />
      <FlowArrow x1={430} y1={574} x2={430} y2={628} />
      <MachineLabel x={443} y={643.7} anchor="start" size={9}>TO CRUSHER (H-1)</MachineLabel>

      {/* ---------------- IR pyrometer on its bracket, sight port ---------------- */}
      <rect x={462} y={296} width={34} height={4} {...PAINT.shaft} />
      <rect x={459} y={304} width={9} height={12} rx={2} transform="rotate(-8 463 310)" {...PAINT.raised} />
      <rect x={IR.x} y={IR.y} width={IR.w} height={IR.h} rx={5} {...PAINT.raised} />
      <rect x={IR.x + 5} y={IR.y + 5} width={IR.w - 10} height={IR.h - 10} rx={3} fill="none" stroke={MX.fine} strokeWidth={0.8} />
      <rect x={IR.x - 9} y={IR.y + 18} width={11} height={9} rx={2} transform={`rotate(35 ${IR.x} ${IR.y + 22})`} {...PAINT.body} />
      <path d={`M ${IR.x + IR.w} ${IR.y + 9} H ${IR.x + IR.w + 12} V ${IR.y + 44}`} fill="none" stroke={MX.fine} strokeWidth={1.4} strokeLinejoin="round" />
      <line x1={IR.x - 6} y1={IR.y + 28} x2={436} y2={392} stroke={MX.label} strokeWidth={1} strokeDasharray="3 3" />
      <MachineLabel x={477.5} y={276.6} anchor="start" size={8.2}>IR PYROMETER</MachineLabel>

      {/* ---------------- vent fan on its platform ---------------- */}
      <CentrifugalFan cx={FAN.cx} cy={FAN.cy} r={FAN.r} top={232} outlet="right" base={405.5} bx={758} bw={22} bh={66} mx={777} mw={36} mh={64} />
      <rect x={566} y={DECK} width={256} height={9} rx={2} {...PAINT.body} />
      <line x1={570} x2={818} y1={DECK + 4.5} y2={DECK + 4.5} {...PAINT.hair} />
      {[578, 808].map((x) => (
        <Column key={x} x={x} y1={DECK + 9} y2={GROUND} />
      ))}
      <line x1={583} x2={803} y1={472} y2={472} stroke={MX.edge} strokeWidth={1.4} />
      <line x1={583} x2={803} y1={472} y2={GROUND - 5} stroke={MX.edge} strokeWidth={1.2} />
      <line x1={803} x2={583} y1={472} y2={GROUND - 5} stroke={MX.edge} strokeWidth={1.2} />
      <circle cx={693} cy={(472 + GROUND - 5) / 2} r={2.2} {...PAINT.raised} />
      <MachineLabel x={603.5} y={433.7} anchor="start" size={9}>VENT FAN → DEDUSTING</MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 33. */
const pads: LineSheetArt["pads"] = {
  "TMP-CLR-08": [518, 300.5],
  "TMP-CLR-09": [450.5, 96.5],
  "VIB-CLR-07": [758, 296],
  "TMP-CLR-10": [758, 330.5],
  "ELE-CLR-07": [795.5, 270.5],
};

/** Tag chip centre per point, as on PDF page 33 (discharge chip moved off the chute flange to the free bay right of it). */
const chips: NonNullable<LineSheetArt["chips"]> = {
  "TMP-CLR-08": [528, 424],
  "TMP-CLR-09": [513.5, 141.5],
  "VIB-CLR-07": [694.5, 213.5],
  "TMP-CLR-10": [679.5, 450.5],
  "ELE-CLR-07": [754.5, 158],
};

export const sheet: LineSheetArt = { id: "C-5", ready: true, width: W, height: H, Art, pads, chips };
