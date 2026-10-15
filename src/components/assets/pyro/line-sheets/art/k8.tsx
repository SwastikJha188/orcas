/**
 * Sheet K-8 — KLN-01 · Rotary kiln — Shell and scanner.
 *
 * Composed as PDF page 21: the zone ruler (inlet 0–15 m, transition 15–40 m,
 * burning 40–66 m, outlet 66–74 m, ticked every 5 m) over the full shell with
 * its girth gear and three tyres on their roller stations, the burning-zone
 * heat inside the shell; in front, the stand-off shell scanner on its pole
 * with the scanned sectors fanning up to the shell and the shadow ("no view")
 * behind each tyre; at the right the handheld pyrometer of the manual check
 * aimed at the shell.
 */
import React from "react";
import { Bolt, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { GearEdge } from "../../sheets/sb-parts";
import type { LineSheetArt } from "../types";
import { KilnShell, Pier, RollerPair, Tyre, type Pt } from "./parts-kb";

const W = 824;
const H = 704;

const SHELL = { x: 31, y: 180.5, w: 765, h: 112.5 };
const SHELL_BOT = SHELL.y + SHELL.h;
const TYRES = [144.5, 434, 651];
const UPPER_FLOOR = 420.5;
const GROUND = 645.5;
/** Shell metre → sheet x (74 m over the shell). */
const M = (m: number) => +(32 + m * 10.3).toFixed(1);
const ZONES: Array<[number, number, string]> = [
  [0, 15, "INLET 0–15 m"],
  [15, 40, "TRANSITION 15–40 m"],
  [40, 66, "BURNING 40–66 m"],
  [66, 74, "OUTLET 66–74"],
];
const HEAD: Pt = [413, 497];
/** Shell spans the scanner sees (between the tyre shadows). */
const SECTORS: Array<[number, number]> = [
  [40, 128],
  [162, 420],
  [450, 636],
  [668, 788],
];

function ZoneRuler() {
  const ticks: number[] = [];
  for (let m = 5; m < 74; m += 5) ticks.push(m);
  return (
    <g>
      {ZONES.map(([a, b, label]) => (
        <g key={label}>
          <rect x={M(a) + 1} y={143} width={M(b) - M(a) - 2} height={22.5} rx={3} {...PAINT.recess} />
          <MachineLabel x={(M(a) + M(b)) / 2} y={157} size={7.9}>
            {label}
          </MachineLabel>
        </g>
      ))}
      <line x1={M(0)} x2={M(74)} y1={170} y2={170} {...PAINT.hair} />
      {ticks.map((m) => (
        <line key={m} x1={M(m)} x2={M(m)} y1={167} y2={170} {...PAINT.hair} />
      ))}
      {[0, 15, 40, 66, 74].map((m) => (
        <line key={m} x1={M(m)} x2={M(m)} y1={165} y2={173} stroke={MX.fine} strokeWidth={1} />
      ))}
    </g>
  );
}

function ScanFan() {
  const [hx, hy] = HEAD;
  return (
    <g aria-hidden="true">
      {SECTORS.map(([a, b]) => (
        <g key={a}>
          <path d={`M ${hx} ${hy} L ${a} ${SHELL_BOT} H ${b} Z`} fill={MX.fine} opacity={0.07} />
          <line x1={hx} y1={hy} x2={a} y2={SHELL_BOT} {...PAINT.hair} strokeDasharray="4 3" />
          <line x1={hx} y1={hy} x2={b} y2={SHELL_BOT} {...PAINT.hair} strokeDasharray="4 3" />
        </g>
      ))}
    </g>
  );
}

function KilnAndStations() {
  return (
    <g>
      <line x1={22.5} x2={803.5} y1={UPPER_FLOOR} y2={UPPER_FLOOR} stroke={MX.fine} strokeWidth={MX.w} />
      {TYRES.map((cx) => (
        <g key={cx}>
          <Pier cx={cx} top={389} bottom={UPPER_FLOOR} wTop={104} wBot={119} />
          <RollerPair cx={cx} cy={353} r={20} gap={57} frameY={377} frameW={129} frameH={12} />
        </g>
      ))}
      <KilnShell x={SHELL.x} y={SHELL.y} w={SHELL.w} h={SHELL.h} seam={54.6} />
      {/* burning-zone heat seen through the shell */}
      {[
        [124, 40, 0.1],
        [96, 31, 0.14],
        [66, 22, 0.2],
        [36, 12, 0.26],
      ].map(([rx, ry, o]) => (
        <ellipse key={rx} cx={606} cy={237} rx={rx} ry={ry} fill={MX.material} opacity={o} />
      ))}
      <GearEdge x={197.5} y={155} w={18} h={163} n={24} />
      {TYRES.map((cx) => (
        <Tyre key={cx} cx={cx} y={171.5} w={23} h={130.5} shellTop={SHELL.y} shellBot={SHELL_BOT} />
      ))}
    </g>
  );
}

function Scanner() {
  return (
    <g>
      {/* pole, junction box, base plate */}
      <rect x={409} y={528} width={8} height={GROUND - 535} {...PAINT.shaft} />
      <rect x={405} y={600} width={16} height={18} rx={2.5} {...PAINT.raised} />
      <line x1={408} x2={418} y1={609} y2={609} {...PAINT.hair} />
      <rect x={400} y={GROUND - 12} width={26} height={5} rx={1.2} {...PAINT.raised} />
      <rect x={390.5} y={GROUND - 7} width={45} height={7} rx={1.5} {...PAINT.body} />
      <Bolt x={395.5} y={GROUND - 3.5} r={1.2} />
      <Bolt x={430.5} y={GROUND - 3.5} r={1.2} />
      {/* head: sun hood, scan window, purge-air and cable glands */}
      <rect x={371} y={489.5} width={84} height={6} rx={2} {...PAINT.raised} />
      <rect x={375.5} y={495.5} width={75} height={33} rx={6} {...PAINT.body} />
      <rect x={380} y={500} width={66} height={24} rx={4} fill="none" stroke={MX.fine} strokeWidth={0.8} />
      <rect x={399} y={496} width={28} height={4} rx={1} {...PAINT.recess} />
      <rect x={450.5} y={503} width={7} height={6} rx={1.2} {...PAINT.shaft} />
      <rect x={450.5} y={514} width={7} height={6} rx={1.2} {...PAINT.shaft} />
      <rect x={404} y={528} width={18} height={5} rx={1.2} {...PAINT.raised} />
      <Bolt x={381.5} y={524} r={1.1} />
      <Bolt x={444.5} y={524} r={1.1} />
    </g>
  );
}

function Handheld() {
  // barrel axis from the pad toward the shell between stations 2 and 3
  const a = (Math.atan2(294 - 474.5, 482 - 632) * 180) / Math.PI;
  return (
    <g aria-hidden="true">
      <line x1={622} y1={457} x2={482} y2={294} {...PAINT.hair} strokeDasharray="2 3" opacity={0.9} />
      <path d="M 625 480 H 640 L 642 508 Q 642 511 639 511 H 629 Q 626 511 626 508 Z" {...PAINT.raised} />
      <path d="M 626 486 Q 619 490 620 498" fill="none" stroke={MX.edge} strokeWidth={1.2} />
      <g transform={`rotate(${a.toFixed(1)} 632 474.5)`}>
        <rect x={620} y={467} width={34} height={15} rx={5} {...PAINT.body} />
        <rect x={651} y={469.5} width={6} height={10} rx={1.5} {...PAINT.recess} />
      </g>
    </g>
  );
}

function Art() {
  return (
    <g>
      <ZoneRuler />
      <ScanFan />
      <KilnAndStations />
      <Scanner />
      <Handheld />
      <GroundLine x1={22.5} x2={803.5} y={GROUND} />

      <MachineLabel x={206.5} y={133} size={6.8}>GIRTH GEAR</MachineLabel>
      {TYRES.map((cx) => (
        <MachineLabel key={cx} x={cx} y={318} size={6.8}>NO VIEW</MachineLabel>
      ))}
      <MachineLabel x={368} y={516} anchor="end" size={9}>SHELL SCANNER (STAND-OFF)</MachineLabel>
      <MachineLabel x={588.5} y={530} anchor="start" size={8.2}>HANDHELD CHECK</MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 21. */
const pads: LineSheetArt["pads"] = {
  "STS-KLN-08": [413, 512],
  "MAN-KLN-01": [632, 474.5],
};

/** Tag chip centre per point, as on PDF page 21. */
const chips: NonNullable<LineSheetArt["chips"]> = {
  "STS-KLN-08": [498.5, 557],
  "MAN-KLN-01": [710, 557],
};

export const sheet: LineSheetArt = { id: "K-8", ready: true, width: W, height: H, Art, pads, chips };
