/**
 * Sheet B-3 — BRN-01 · Main burner — Fine-coal bin and kiln coal feeder.
 * Composed as PDF page 26: fine-coal bin on four legs (roof handrail,
 * explosion-relief vent, level radar, cut-away showing the coal bed, wall
 * thermometer, manway, cone aeration nozzles, slide gate), the CO / CO2
 * analyser on its stand with sample probe, filter and line from the bin, the
 * kiln coal weigh feeder on load cells with its drive, and the coal drop to
 * the conveying line.
 */
import React from "react";
import { Bolt, CornerBolts, GroundLine, MX, MachineLabel, Motor, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Flange, FlowArrow, Transmitter } from "../../drawings/clk-parts";
import { Handrail, Ladder } from "../../drawings/fkp-parts";
import { LoadCell, Radar } from "../../sheets/sa-parts";
import type { LineSheetArt } from "../types";
import { CoalPipe } from "./parts-b";

const W = 824;
const H = 704;
const GROUND = 660;

const BIN = { x: 226, w: 285, roof: 135, cyl: 348, cone: 480, outlet: 62 };
const CX = BIN.x + BIN.w / 2;
const PEAK = 110;
const FEED = { x: 323, y: 495, w: 90, h: 53 };
const LINE_Y = 593;
const AN = { x: 585, y: 180, w: 151, h: 98 };
const LEGS = [246.5, 489.5];

function Bin() {
  const { x, w, roof, cyl, cone, outlet } = BIN;
  return (
    <g>
      {/* legs, ties and knee braces */}
      {LEGS.map((lx) => (
        <g key={lx}>
          <rect x={lx - 5} y={cyl + 4} width={10} height={GROUND - cyl - 10} rx={1.5} {...PAINT.body} />
          <rect x={lx - 11} y={GROUND - 7} width={22} height={7} rx={1.5} {...PAINT.raised} />
          <Bolt x={lx - 6} y={GROUND - 3.5} r={1.3} />
          <Bolt x={lx + 6} y={GROUND - 3.5} r={1.3} />
        </g>
      ))}
      <rect x={LEGS[0] + 5} y={470} width={LEGS[1] - LEGS[0] - 10} height={6} rx={1.5} {...PAINT.body} />
      <rect x={LEGS[0] + 5} y={640} width={LEGS[1] - LEGS[0] - 10} height={6} rx={1.5} {...PAINT.body} />
      <line x1={LEGS[0] + 5} y1={420} x2={x + 62} y2={cyl + 12} stroke={MX.edge} strokeWidth={2.2} />
      <line x1={LEGS[1] - 5} y1={420} x2={x + w - 62} y2={cyl + 12} stroke={MX.edge} strokeWidth={2.2} />

      {/* cone with aeration nozzles, outlet flange, slide gate */}
      <path d={`M ${x - 4} ${cyl + 10} L ${x + w + 4} ${cyl + 10} L ${CX + outlet / 2} ${cone} L ${CX - outlet / 2} ${cone} Z`} {...PAINT.cylinderV} />
      <line x1={x + 70} y1={cyl + 14} x2={CX - outlet / 4} y2={cone - 3} {...PAINT.hair} />
      <line x1={x + w - 70} y1={cyl + 14} x2={CX + outlet / 4} y2={cone - 3} {...PAINT.hair} />
      {[[300, 420], [436, 420], [334, 455], [403, 455]].map(([nx, ny]) => (
        <g key={`${nx}${ny}`}>
          <rect x={nx - 4} y={ny - 4} width={8} height={8} rx={2} {...PAINT.raised} />
          <circle cx={nx} cy={ny} r={1.5} fill={MX.deep} />
        </g>
      ))}
      <rect x={CX - outlet / 2 - 6} y={cone - 2} width={outlet + 12} height={6} rx={1.5} {...PAINT.raised} />
      <rect x={CX - 22} y={cone + 4} width={44} height={9} rx={2} {...PAINT.body} />
      <rect x={CX + 22} y={cone + 6} width={30} height={5} rx={1.5} {...PAINT.shaft} />
      <rect x={CX + 50} y={cone + 3} width={10} height={11} rx={2} {...PAINT.raised} />

      {/* shell, rings, cut-away with the coal bed */}
      <rect x={x} y={roof} width={w} height={cyl - roof} rx={4} {...PAINT.cylinderV} />
      {[178, 222, 266, 310].map((ry) => (
        <line key={ry} x1={x + 2} x2={x + w - 2} y1={ry} y2={ry} stroke={MX.fine} strokeWidth={MX.wFine} />
      ))}
      <rect x={x - 7} y={cyl - 2} width={w + 14} height={12} rx={3} {...PAINT.raised} />
      {Array.from({ length: 9 }).map((_, i) => (
        <Bolt key={i} x={x + 2 + i * ((w - 4) / 8)} y={cyl + 4} r={1.3} />
      ))}
      <rect x={269} y={183} width={199} height={109} rx={6} {...PAINT.recess} />
      <path d="M 273 268 Q 368 258 464 266 L 464 288 L 273 288 Z" {...PAINT.material} opacity={0.85} />
      {Array.from({ length: 14 }).map((_, i) => (
        <circle key={i} cx={282 + i * 13.5} cy={275 + ((i * 7) % 10)} r={1.1} fill={MX.deep} opacity={0.45} />
      ))}
      {/* radar beam cone into the bin */}
      <path d={`M ${CX} 186 L ${CX - 26} 264 M ${CX} 186 L ${CX + 26} 264`} fill="none" stroke={MX.fine} strokeWidth={0.8} strokeDasharray="3 3" />
      {/* manway and wall thermometer */}
      <rect x={479} y={296} width={24} height={40} rx={5} {...PAINT.raised} />
      <CornerBolts x={479} y={296} w={24} h={40} inset={4} r={1.1} />
      <Transmitter x={x} y={248} dir="left" len={42.5} />

      {/* roof, handrail, explosion-relief vent, radar */}
      <path d={`M ${x - 10} ${roof + 1} L ${CX} ${PEAK} L ${x + w + 10} ${roof + 1} Z`} {...PAINT.raised} />
      <Handrail x1={x + 4} x2={x + w - 4} y={roof - 2} h={20} step={28} />
      <rect x={258} y={108} width={34} height={22} rx={2} {...PAINT.body} />
      <rect x={254} y={102} width={42} height={7} rx={2} {...PAINT.raised} />
      <line x1={262} x2={288} y1={105.5} y2={105.5} stroke={MX.fine} strokeWidth={0.8} strokeDasharray="2 2" />
      <Radar x={CX} y={PEAK + 1} h={34} />
      {/* access ladder on the right of the shell */}
      <Ladder x={517} y1={PEAK + 8} y2={cyl - 4} w={11} />
    </g>
  );
}

function Feeder() {
  const { x, y, w, h } = FEED;
  return (
    <g>
      {/* support beam between the legs, load cells */}
      <rect x={LEGS[0] + 5} y={y + h + 10} width={LEGS[1] - LEGS[0] - 10} height={7} rx={1.5} {...PAINT.body} />
      <LoadCell x={x + 14} y={y + h - 1} />
      <LoadCell x={x + w - 14} y={y + h - 1} />
      {/* inlet chute from the slide gate */}
      <rect x={CX - 9} y={BIN.cone + 13} width={18} height={y - BIN.cone - 11} rx={1.5} {...PAINT.body} />
      {/* rotor weigh feeder housing */}
      <rect x={x} y={y} width={w} height={h} rx={7} {...PAINT.body} />
      <rect x={x + 15} y={y + 12} width={60} height={29} rx={3} {...PAINT.recess} />
      <circle cx={x + 45} cy={y + 26.5} r={12} fill="none" stroke={MX.fine} strokeWidth={1} />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return <line key={i} x1={x + 45} y1={y + 26.5} x2={x + 45 + Math.cos(a) * 12} y2={y + 26.5 + Math.sin(a) * 12} stroke={MX.edge} strokeWidth={1.1} />;
      })}
      <path d={`M ${x + 34} ${y + 33} A 12 12 0 0 0 ${x + 56} ${y + 33} Z`} {...PAINT.material} opacity={0.85} />
      <circle cx={x + 45} cy={y + 26.5} r={3} {...PAINT.shaft} />
      <CornerBolts x={x} y={y} w={w} h={h} inset={5} r={1.3} />
      {/* drive: geared motor on the left */}
      <rect x={x - 12} y={y + 22} width={12} height={10} {...PAINT.shaft} />
      <Motor x={x - 64} y={y + 10} w={42} h={34} terminalBox={false} />
      {/* drop to the conveying line */}
      <rect x={x + 37} y={y + h} width={16} height={8} rx={1.5} {...PAINT.raised} />
    </g>
  );
}

function Analyser() {
  const { x, y, w, h } = AN;
  return (
    <g>
      {/* stand */}
      <rect x={x + 2} y={y + h - 4} width={8} height={GROUND - y - h - 2} rx={1.5} {...PAINT.body} />
      <rect x={x - 5} y={GROUND - 6} width={22} height={6} rx={1.5} {...PAINT.raised} />
      <Bolt x={x} y={GROUND - 3} r={1.2} />
      <Bolt x={x + 12} y={GROUND - 3} r={1.2} />
      <line x1={x + 10} y1={y + h + 34} x2={x + 22} y2={y + h} stroke={MX.edge} strokeWidth={2.2} />
      {/* sample probe in the bin wall, filter, sample line */}
      <rect x={BIN.x + BIN.w} y={222} width={10} height={8} {...PAINT.shaft} />
      <rect x={530} y={216} width={16} height={20} rx={3} {...PAINT.raised} />
      <path d={`M 546 226 L ${x} 226`} fill="none" stroke={MX.fine} strokeWidth={1.2} strokeDasharray="5 3" />
      {/* cabinet: window, keypad, gland plate, sample pump */}
      <rect x={x} y={y} width={w} height={h} rx={10} {...PAINT.body} />
      <rect x={x + 6} y={y + 6} width={w - 12} height={h - 12} rx={6} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      <rect x={600} y={197} width={121} height={42} rx={4} {...PAINT.recess} />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={612 + i * 14} y={248} width={10} height={7} rx={1.5} {...PAINT.raised} />
      ))}
      <rect x={680} y={246} width={36} height={18} rx={3} {...PAINT.raised} />
      <circle cx={698} cy={255} r={5} {...PAINT.shaft} />
      {[606, 620, 634].map((gx) => (
        <rect key={gx} x={gx} y={y + h} width={7} height={6} rx={1} {...PAINT.shaft} />
      ))}
      <CornerBolts x={x} y={y} w={w} h={h} inset={6} r={1.4} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={22} x2={804} y={GROUND} />
      <Analyser />
      <Bin />
      <CoalPipe pts={[[368, FEED.y + FEED.h + 6], [368, LINE_Y], [798, LINE_Y]]} w={14} />
      <Flange x={368} y={575} w={14} vertical />
      <Flange x={560} y={LINE_Y} w={14} />
      <FlowArrow x1={800} y1={LINE_Y} x2={821} y2={LINE_Y} />
      <Feeder />

      <MachineLabel x={367} y={259.6} size={12} tone="ink">
        FINE-COAL BIN
      </MachineLabel>
      <MachineLabel x={660} y={294.6} size={8.2}>
        CO / CO₂ ANALYSER
      </MachineLabel>
      <MachineLabel x={368} y={622} size={8.2}>
        KILN COAL FEEDER (WEIGH)
      </MachineLabel>
      <MachineLabel x={816} y={576.2} anchor="end" size={9}>
        TO CONVEYING LINE (B-4)
      </MachineLabel>
      <MachineLabel x={60.5} y={681.6} anchor="start" size={8.2}>
        HAZARDOUS AREA: COAL DUST — EX EQUIPMENT (CONFIRM WITH EHS)
      </MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 26. */
const pads: LineSheetArt["pads"] = {
  "LEV-BRN-01": [368.5, 75],
  "TMP-BRN-04": [183.5, 248],
  "GAS-BRN-01": [660.5, 218],
  "FLO-BRN-01": [413, 521.5],
};

/** Tag chip centre per point, as on PDF page 26. */
const chips: NonNullable<LineSheetArt["chips"]> = {
  "LEV-BRN-01": [438.5, 39.5],
  "TMP-BRN-04": [120, 203],
  "GAS-BRN-01": [716, 135.5],
  "FLO-BRN-01": [560, 520],
};

export const sheet: LineSheetArt = { id: "B-3", ready: true, width: W, height: H, Art, pads, chips };
