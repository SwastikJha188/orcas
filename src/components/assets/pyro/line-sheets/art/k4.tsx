/**
 * Sheet K-4 — KLN-01 · Rotary kiln — Gearbox lubrication system.
 *
 * Composition of PDF page 17: the main gearbox at top right, its sump return
 * line (with the oil temperature element) down to the oil tank (cut-away with
 * the oil charge, heater, level switch and the sample cock under it), the
 * duty / standby pumps on their skid, the filter with its differential
 * pressure switch, the oil cooler, and the supply line with its flow switch
 * and pressure transmitter back up to the gearbox.
 */
import React from "react";
import { Bolt, CornerBolts, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Volute } from "../../drawings/fkp-parts";
import { FlowTag } from "../../sheets/sa-parts";
import { OilLine } from "../../sheets/sb-parts";
import type { LineSheetArt } from "../types";
import { Bedplate, GearboxSide, PipeFlange, type Pt } from "./parts-ka";

const W = 824;
const H = 704;
const GROUND = 660;
const LINE = 7;

/** Bow-tie gate valve on a run (vertical run when `v`). */
function Valve({ x, y, v = false }: { x: number; y: number; v?: boolean }) {
  return (
    <g transform={v ? `rotate(90 ${x} ${y})` : undefined}>
      <path d={`M ${x - 7} ${y - 6} L ${x + 7} ${y + 6} V ${y - 6} L ${x - 7} ${y + 6} Z`} {...PAINT.raised} />
      <line x1={x} y1={y} x2={x} y2={y - 11} stroke={MX.edge} strokeWidth={1.4} />
      <rect x={x - 5} y={y - 14} width={10} height={4} rx={1.5} {...PAINT.raised} />
    </g>
  );
}

function OilTank() {
  return (
    <g>
      {/* skid and feet */}
      <rect x={68} y={593} width={233} height={11} rx={2} {...PAINT.raised} />
      {[110, 289].map((x) => (
        <g key={x}>
          <rect x={x - 9} y={604} width={18} height={GROUND - 604} rx={1.5} {...PAINT.body} />
          <Bolt x={x} y={GROUND - 6} r={1.5} />
        </g>
      ))}
      {/* tank shell with a cut-away of the oil charge */}
      <rect x={61} y={421} width={247} height={172} rx={10} {...PAINT.body} />
      <CornerBolts x={61} y={421} w={247} h={172} inset={7} r={1.8} />
      <rect x={73} y={451} width={223} height={132} rx={5} {...PAINT.recess} />
      <rect x={76} y={466} width={217} height={114} rx={3} {...PAINT.material} />
      <line x1={76} x2={293} y1={466} y2={466} stroke={MX.edge} strokeWidth={1} strokeDasharray="4 3" />
      {/* immersion heater and suction strainer */}
      <path d="M 90 470 V 560 Q 90 568 98 568 H 128 Q 136 568 136 560 V 500" fill="none" stroke={MX.edge} strokeWidth={2} opacity={0.75} />
      <rect x={84} y={455} width={12} height={10} rx={2} {...PAINT.raised} />
      <rect x={262} y={552} width={22} height={18} rx={3} fill="none" stroke={MX.edge} strokeWidth={1.2} strokeDasharray="2 2" />
      {/* filler / breather and manhole on the roof */}
      <rect x={250} y={411} width={20} height={10} rx={2} {...PAINT.raised} />
      <rect x={255} y={403} width={10} height={9} rx={2} {...PAINT.shaft} />
      <rect x={100} y={415} width={40} height={6} rx={2} {...PAINT.raised} />
      {/* low-level switch on the side wall */}
      <rect x={308} y={477.5} width={14} height={6} rx={1.5} {...PAINT.shaft} />
      {/* sample cock under the tank */}
      <rect x={80} y={593} width={6} height={18} {...PAINT.shaft} />
      <rect x={76} y={606} width={14} height={7} rx={2} {...PAINT.raised} />
    </g>
  );
}

function Pumps() {
  return (
    <g>
      <Bedplate x={331} y={600} w={180} h={11} bolts={4} />
      {[376, 458].map((cx) => (
        <g key={cx}>
          <rect x={cx - 18} y={588} width={36} height={12} rx={2} {...PAINT.body} />
          <Volute cx={cx} cy={566} r={22} outH={6} dir={-1} />
        </g>
      ))}
      {/* skid legs */}
      {[345, 497].map((x) => (
        <rect key={x} x={x - 6} y={611} width={12} height={GROUND - 611} rx={1.5} {...PAINT.body} />
      ))}
    </g>
  );
}

function FilterAndCooler() {
  return (
    <g>
      {/* duplex filter: head, bowl, drain */}
      <rect x={514} y={419} width={53} height={10} rx={2} {...PAINT.raised} />
      <rect x={518} y={427} width={45} height={106} rx={10} {...PAINT.cylinderV} />
      <line x1={520} x2={561} y1={480} y2={480} {...PAINT.detail} />
      <rect x={535} y={533} width={10} height={6} rx={1.5} {...PAINT.shaft} />
      {/* differential-pressure switch across the element */}
      <path d="M 563 437 H 584 V 453 M 563 520 H 584 V 502" {...PAINT.detail} strokeWidth={1.4} />
      <rect x={577} y={453} width={25} height={49} rx={4} {...PAINT.body} />
      <rect x={581} y={459} width={17} height={12} rx={2} {...PAINT.recess} />
      {/* plate oil cooler (air-blast) with fins and fan cowl */}
      <rect x={608} y={421} width={128} height={82} rx={6} {...PAINT.body} />
      <rect x={614} y={427} width={116} height={70} rx={3} {...PAINT.recess} />
      {Array.from({ length: 14 }).map((_, i) => (
        <line key={i} x1={620 + i * 8} x2={620 + i * 8} y1={430} y2={494} stroke={MX.fine} strokeWidth={1} />
      ))}
      <CornerBolts x={608} y={421} w={128} h={82} inset={4} r={1.5} />
      <rect x={612} y={503} width={8} height={10} rx={1} {...PAINT.body} />
      <rect x={724} y={503} width={8} height={10} rx={1} {...PAINT.body} />
    </g>
  );
}

const RETURN: Pt[] = [[525, 218], [525, 315], [225, 315], [225, 420]];
const SUCTION: Pt[] = [[308, 578], [354, 578]];
const CROSS: Pt[] = [[398, 578], [436, 578]];
const DISCHARGE: Pt[] = [[480, 578], [540, 578], [540, 539]];
const FILTER_OUT: Pt[] = [[540, 419], [540, 398], [620, 398], [620, 421]];
const SUPPLY: Pt[] = [[736, 457], [758, 457], [758, 143], [676, 143]];

function Lines() {
  return (
    <g>
      {[RETURN, SUCTION, CROSS, DISCHARGE, FILTER_OUT, SUPPLY].map((pts, i) => (
        <OilLine key={i} pts={pts} w={LINE} />
      ))}
      <PipeFlange x={525} y={224} d={LINE} vertical />
      <PipeFlange x={225} y={414} d={LINE} vertical />
      <PipeFlange x={682} y={143} d={LINE} />
      <PipeFlange x={742} y={457} d={LINE} />
      {/* temperature element on the return */}
      <rect x={228} y={358} width={20} height={5} rx={1.5} {...PAINT.shaft} />
      <rect x={246} y={354} width={12} height={13} rx={4} {...PAINT.body} />
      <Valve x={330} y={578} />
      <Valve x={498} y={578} />
      <Valve x={758} y={380} v />
      {/* flow switch body and pressure transmitter on the supply riser */}
      <rect x={750} y={211} width={16} height={29} rx={3} {...PAINT.raised} />
      <rect x={761} y={312} width={18} height={7} rx={1.5} {...PAINT.shaft} />
      <rect x={777} y={305} width={16} height={21} rx={4} {...PAINT.body} />
      <FlowTag x1={470} y1={327} x2={440} y2={327} />
      <FlowTag x1={720} y1={128} x2={694} y2={128} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={22} x2={803} y={GROUND} />
      <Lines />
      <GearboxSide x={466} y={68} w={210} h={150} ig={[56, 82, 27]} og={[130, 63, 45]} />
      <OilTank />
      <Pumps />
      <FilterAndCooler />

      <MachineLabel x={532} y={246.2} anchor="start" size={9}>MAIN GEARBOX</MachineLabel>
      <MachineLabel x={183} y={437.7} size={9}>OIL TANK</MachineLabel>
      <MachineLabel x={416} y={629.7} size={8.2}>DUTY / STANDBY PUMPS</MachineLabel>
      <MachineLabel x={510} y={411.6} anchor="end" size={8.2}>FILTER</MachineLabel>
      <MachineLabel x={667} y={516.6} size={8.2}>OIL COOLER</MachineLabel>
      <MachineLabel x={752} y={111.6} size={8.2}>SUPPLY</MachineLabel>
      <MachineLabel x={375} y={306.6} size={8.2}>RETURN</MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 17. */
const pads: LineSheetArt["pads"] = {
  "TMP-KLN-15": [225.5, 360.5],
  "LEV-KLN-01": [329, 480.5],
  "LAB-KLN-01": [83, 623],
  "PRS-KLN-05": [589, 477.5],
  "PRS-KLN-04": [758, 315.5],
  "FLO-KLN-05": [758, 225.5],
};

/** Tag chip centre per point, as on PDF page 17. */
const chips: NonNullable<LineSheetArt["chips"]> = {
  "TMP-KLN-15": [162, 318.5],
  "LEV-KLN-01": [392, 450.5],
  "LAB-KLN-01": [146, 638],
  "PRS-KLN-05": [645, 567.5],
  "PRS-KLN-04": [687, 345.5],
  "FLO-KLN-05": [687, 218],
};

export const sheet: LineSheetArt = { id: "K-4", ready: true, width: W, height: H, Art, pads, chips };
