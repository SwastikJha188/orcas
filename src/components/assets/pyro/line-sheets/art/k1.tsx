/**
 * Sheet K-1 — KLN-01 · Rotary kiln — Inlet: seal, chamber and gas analysis.
 *
 * Composition of PDF page 14: the riser to C6 rising from the refractory-lined
 * kiln inlet chamber (on steel legs) with the hot-meal chute and its flap valve,
 * the inlet seal between the chamber and the kiln shell feed end, the gas-sample
 * probe at the throat with its heated sample line up to the extractive gas
 * analyser cabinet (O2 / CO / NOx modules, status, sample conditioning).
 */
import React from "react";
import { Bolt, CornerBolts, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Brace } from "../../drawings/fkp-parts";
import { FlowTag } from "../../sheets/sa-parts";
import { Link, OilLine, Refractory, Shell } from "../../sheets/sb-parts";
import type { LineSheetArt } from "../types";
import { Column, PipeFlange, ThermoProbe } from "./parts-ka";

const W = 824;
const H = 704;
const GROUND = 660;

/** Inlet chamber casing and the kiln shell (sheet units). */
const CH = { x: 61, y: 218, w: 224, h: 352 };
const SHELL = { x: 316, y: 330, w: 520, h: 128 };

function Riser() {
  return (
    <g>
      <rect x={113} y={22} width={98} height={196} rx={4} {...PAINT.cylinderV} />
      {/* stiffener rings and the expansion joint above the chamber */}
      {[58, 104].map((y) => (
        <rect key={y} x={110} y={y} width={104} height={6} rx={2} {...PAINT.raised} />
      ))}
      <rect x={109} y={160} width={106} height={7} rx={2} {...PAINT.raised} />
      {[172, 178, 184, 190, 196].map((y) => (
        <line key={y} x1={114} x2={210} y1={y} y2={y} stroke={MX.edge} strokeWidth={1.2} />
      ))}
      <rect x={109} y={201} width={106} height={7} rx={2} {...PAINT.raised} />
      {/* refractory edge seen through an inspection door */}
      <rect x={130} y={72} width={22} height={26} rx={2} {...PAINT.recess} />
      <Bolt x={134} y={76} r={1.2} />
      <Bolt x={148} y={94} r={1.2} />
      <rect x={107} y={212} width={110} height={8} rx={2} {...PAINT.raised} />
    </g>
  );
}

function MealChute() {
  return (
    <g>
      <OilLine pts={[[248, 22], [248, 150], [262, 214]]} w={10} />
      <PipeFlange x={248} y={44} d={10} vertical />
      <PipeFlange x={248} y={142} d={10} vertical />
      {/* pendulum flap valve with lever and counterweight */}
      <rect x={240} y={84} width={16} height={30} rx={3} {...PAINT.body} />
      <circle cx={248} cy={99} r={3} {...PAINT.shaft} />
      <line x1={248} y1={99} x2={232} y2={88} stroke={MX.edge} strokeWidth={2} strokeLinecap="round" />
      <rect x={224} y={82} width={10} height={10} rx={2} {...PAINT.raised} />
    </g>
  );
}

function Chamber() {
  const { x, y, w, h } = CH;
  return (
    <g>
      {/* legs with bracing */}
      <Brace x1={92} y1={586} x2={255} y2={644} />
      <Column x={84} y1={y + h} y2={GROUND} w={16} />
      <Column x={262} y1={y + h} y2={GROUND} w={16} />
      <rect x={x + 8} y={y + h - 4} width={w - 16} height={10} rx={2} {...PAINT.raised} />
      {/* casing, refractory lining, hot gas space, meal heap */}
      <rect x={x} y={y} width={w} height={h} rx={10} {...PAINT.body} />
      <Refractory x={x + 8} y={y + 8} w={w - 16} h={h - 16} course={9} brick={18} />
      <rect x={x + 20} y={y + 20} width={w - 40} height={h - 40} rx={4} fill={MX.deep} stroke={MX.fine} strokeWidth={MX.wFine} />
      <rect x={x + 20} y={y + 20} width={w - 40} height={h - 40} rx={4} fill={MX.heat} opacity={0.32} />
      <path d={`M ${x + 21} ${y + h - 21} Q ${x + 80} ${y + h - 64} ${x + 150} ${y + h - 62} Q ${x + 190} ${y + h - 60} ${x + w - 21} ${y + h - 46} V ${y + h - 21} Z`} {...PAINT.material} />
      <CornerBolts x={x} y={y} w={w} h={h} inset={4} r={1.6} />
      {/* throat into the kiln */}
      <rect x={x + w - 22} y={SHELL.y + 8} width={22} height={SHELL.h - 16} rx={2} fill={MX.deep} stroke={MX.fine} strokeWidth={MX.wFine} />
      {/* air blaster on the left wall */}
      <rect x={14} y={384} width={30} height={40} rx={8} {...PAINT.cylinderV} />
      <rect x={44} y={400} width={18} height={8} rx={1.5} {...PAINT.shaft} />
      <rect x={24} y={378} width={10} height={7} rx={1.5} {...PAINT.raised} />
    </g>
  );
}

function SealAndShell() {
  const s = SHELL;
  const plates: React.ReactNode[] = [];
  for (let yy = s.y + 4; yy < s.y + s.h - 6; yy += 11) plates.push(<rect key={yy} x={s.x + 2} y={yy} width={24} height={9} rx={1.5} {...PAINT.raised} />);
  return (
    <g>
      <Shell x={s.x} y={s.y} w={s.w} h={s.h} seam={36.5} />
      {/* cut-away: lining and meal bed at the feed end */}
      <rect x={364} y={s.y + 14} width={112} height={s.h - 28} rx={4} {...PAINT.recess} />
      <Refractory x={368} y={s.y + 18} w={104} h={14} course={7} brick={14} />
      <Refractory x={368} y={s.y + s.h - 32} w={104} h={14} course={7} brick={14} />
      <path d={`M 370 ${s.y + s.h - 33} Q 420 ${s.y + s.h - 52} 470 ${s.y + s.h - 40} V ${s.y + s.h - 33} Z`} {...PAINT.material} />
      {/* lamella seal plates on the shell */}
      {plates}
      {/* stationary seal housing on the chamber */}
      <rect x={286} y={308} width={30} height={165} rx={4} {...PAINT.body} />
      {Array.from({ length: 10 }).map((_, i) => (
        <line key={i} x1={289} x2={313} y1={322 + i * 15} y2={322 + i * 15} {...PAINT.detail} />
      ))}
      <Bolt x={301} y={314} r={1.6} />
      <Bolt x={301} y={467} r={1.6} />
      {/* wire-rope tensioner and counterweight */}
      <line x1={316} y1={466} x2={346} y2={466} stroke={MX.edge} strokeWidth={1.2} />
      <circle cx={346} cy={466} r={5} {...PAINT.shaft} />
      <line x1={351} y1={466} x2={351} y2={480} stroke={MX.edge} strokeWidth={1.2} />
      <rect x={345} y={480} width={12} height={14} rx={2} {...PAINT.raised} />
    </g>
  );
}

function Probe() {
  return (
    <g>
      {/* water-cooled probe through the chamber wall at the throat */}
      <rect x={236} y={245} width={124} height={6} rx={2} {...PAINT.shaft} />
      <rect x={283} y={238} width={6} height={20} rx={1.5} {...PAINT.raised} />
      <rect x={360} y={238} width={34} height={20} rx={4} {...PAINT.body} />
      <rect x={366} y={243} width={14} height={10} rx={1.5} {...PAINT.recess} />
      <Bolt x={388} y={248} r={1.4} />
      {/* heated sample line to the analyser */}
      <Link pts={[[394, 248], [452, 188]]} dash="4 3" />
    </g>
  );
}

function Analyser() {
  const cells = [439, 503, 567];
  return (
    <g>
      {/* mounting lugs */}
      <rect x={431} y={70} width={20} height={8} rx={2} {...PAINT.raised} />
      <rect x={645} y={70} width={20} height={8} rx={2} {...PAINT.raised} />
      <rect x={421} y={76} width={254} height={112} rx={9} {...PAINT.body} />
      <rect x={427} y={82} width={242} height={100} rx={6} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      {cells.map((cx) => (
        <g key={cx}>
          <rect x={cx} y={94} width={48} height={37} rx={3} {...PAINT.raised} />
          <rect x={cx + 4} y={98} width={40} height={29} rx={2} {...PAINT.recess} />
        </g>
      ))}
      <rect x={632} y={97} width={30} height={30} rx={4} {...PAINT.raised} />
      <rect x={636} y={101} width={22} height={22} rx={3} {...PAINT.recess} />
      {/* sample conditioning: chiller, pump, filters, tubing */}
      <rect x={437} y={152} width={226} height={26} rx={3} {...PAINT.recess} />
      <rect x={442} y={156} width={40} height={18} rx={2} {...PAINT.raised} />
      {[449, 457, 465, 473].map((x) => (
        <line key={x} x1={x} x2={x} y1={159} y2={171} {...PAINT.hair} />
      ))}
      <circle cx={506} cy={165} r={8} {...PAINT.raised} />
      <circle cx={506} cy={165} r={3} {...PAINT.shaft} />
      {[530, 546].map((x) => (
        <rect key={x} x={x} y={155} width={10} height={20} rx={4} {...PAINT.cylinderV} />
      ))}
      <path d="M 482 165 H 498 M 514 165 H 530 M 540 165 H 546 M 556 165 H 600" {...PAINT.detail} />
      {[604, 616, 628, 640, 652].map((x) => (
        <line key={x} x1={x} x2={x + 6} y1={170} y2={158} {...PAINT.hair} />
      ))}
      {/* air conditioner on the side, cable glands under */}
      <rect x={675} y={96} width={14} height={70} rx={3} {...PAINT.raised} />
      {[106, 116, 126, 136, 146, 156].map((y) => (
        <line key={y} x1={678} x2={686} y1={y} y2={y} {...PAINT.hair} />
      ))}
      {[640, 652, 664].map((x) => (
        <rect key={x} x={x} y={188} width={6} height={5} rx={1} {...PAINT.shaft} />
      ))}
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={22} x2={803} y={GROUND} />
      <Riser />
      <SealAndShell />
      <Chamber />
      <MealChute />
      <Probe />
      <Analyser />
      {/* inlet gas temperature and draft taps through the left wall */}
      <ThermoProbe x={52} y={300.5} len={60} />
      <rect x={44} y={477.5} width={52} height={6} rx={2} {...PAINT.shaft} />
      <rect x={24} y={466} width={20} height={26} rx={4} {...PAINT.body} />
      <rect x={28} y={471} width={12} height={8} rx={1.5} {...PAINT.recess} />
      <rect x={29} y={492} width={10} height={6} rx={1.5} {...PAINT.raised} />

      <FlowTag x1={87} y1={210} x2={87} y2={50} />
      <FlowTag x1={300} y1={268} x2={300} y2={304} />
      <FlowTag x1={300} y1={520} x2={300} y2={478} />

      <MachineLabel x={111} y={14} anchor="start" size={9}>RISER → C6 (P-2)</MachineLabel>
      <MachineLabel x={29} y={126.6} anchor="start" size={8.2}>KILN GAS</MachineLabel>
      <MachineLabel x={262} y={103.7} anchor="start" size={9}>HOT MEAL FROM C6</MachineLabel>
      <MachineLabel x={463} y={146} size={9}>O₂</MachineLabel>
      <MachineLabel x={527} y={146} size={9}>CO</MachineLabel>
      <MachineLabel x={591} y={146} size={9}>NOx</MachineLabel>
      <MachineLabel x={547} y={201.2} size={9}>EXTRACTIVE GAS ANALYSER</MachineLabel>
      <MachineLabel x={366} y={234} anchor="start" size={8.2}>PROBE</MachineLabel>
      <MachineLabel x={322} y={298.7} anchor="start" size={9}>INLET SEAL</MachineLabel>
      <MachineLabel x={353} y={524} anchor="start" size={8.2}>FALSE AIR IN AT A WORN SEAL</MachineLabel>
      <MachineLabel x={569.5} y={396.2} size={9}>KILN SHELL (FEED END)</MachineLabel>
      <MachineLabel x={110.5} y={677.7} anchor="start" size={9}>KILN INLET CHAMBER</MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 14. */
const pads: LineSheetArt["pads"] = {
  "GAS-KLN-01": [463, 112],
  "GAS-KLN-02": [527, 112],
  "GAS-KLN-03": [590.5, 112],
  "STS-KLN-06": [647, 111.5],
  "TMP-KLN-13": [113, 300.5],
  "PRS-KLN-01": [96.5, 480.5],
};

/** Tag chip centre per point, as on PDF page 14. */
const chips: NonNullable<LineSheetArt["chips"]> = {
  "GAS-KLN-01": [407, 30],
  "GAS-KLN-02": [478.5, 52.5],
  "GAS-KLN-03": [639, 30],
  "STS-KLN-06": [710, 66.5],
  "TMP-KLN-13": [191, 255.5],
  "PRS-KLN-01": [182, 503],
};

export const sheet: LineSheetArt = { id: "K-1", ready: true, width: W, height: H, Art, pads, chips };
