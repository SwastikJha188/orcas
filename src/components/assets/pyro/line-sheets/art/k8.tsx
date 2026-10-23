/**
 * Sheet K-8 — KLN-01 · Rotary kiln — Shell and scanner.
 *
 * Panel "SHELL AND SCANNER" of group image 3A (page 7, panel box 574 91 –
 * 1080 540): the kiln shell on its three tyres and roller stations with the
 * girth gear, the scanner zone bands (inlet, transition, burning, outlet) over
 * it and the burning-zone hot spot, the two shell cooling fans blowing onto
 * the burning zone, the stand-off shell scanner on its post with its sight
 * lines (no view behind the tyres), and the handheld IR check point. The
 * fan status pad sits on the fan starter box above the fans (PDF: between them). The
 * scanner reading (shell maximum and its position) sits on the scanner.
 */
import React from "react";
import { Fan, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import type { LineSheetArt } from "../types";
import { KilnShell, Pier, RollerPair, Tyre } from "./parts-kb";
import { Flow, FlowArrow, Glow } from "./parts-k2";

const W = 506;
const H = 449;
const GROUND = 271.5;
const GROUND2 = 404;

const SHELL = { x: 26.5, y: 129, w: 452.5, h: 67.5 };
const TYRES = [94.25, 265.25, 393.75];
const GG = { x: 125.5, y: 114.5, w: 10.5, h: 97 };
const SCAN = { x: 231, y: 316, w: 44, h: 19.5 };
const FANS = [293.5, 346.5];
/** Zone bands over the shell: [x0, x1, label, tone]. */
const ZONES: Array<[number, number, string, "air" | "plain" | "heat"]> = [
  [27.5, 118, "INLET 0–15 m", "air"],
  [119, 271, "TRANSITION 15–40 m", "plain"],
  [272, 429, "BURNING 40–66 m", "heat"],
  [431, 478, "OUTLET 66–74", "plain"],
];

function Zones() {
  return (
    <g>
      {ZONES.map(([x0, x1, t, tone]) => (
        <g key={t}>
          <rect x={x0} y={107.5} width={x1 - x0} height={13.5} rx={2.5} fill={MX.deep} stroke={MX.fine} strokeWidth={0.8} />
          {tone !== "plain" && <rect x={x0} y={107.5} width={x1 - x0} height={13.5} rx={2.5} fill={tone === "air" ? MX.air : MX.heat} opacity={tone === "air" ? 0.22 : 0.35} />}
          <MachineLabel x={(x0 + x1) / 2} y={116.8} size={5.5} tone="ink">
            {t}
          </MachineLabel>
        </g>
      ))}
    </g>
  );
}

function ShellAndStations() {
  const top = SHELL.y;
  const bot = SHELL.y + SHELL.h;
  return (
    <g>
      {TYRES.map((cx) => (
        <g key={cx}>
          <Pier cx={cx} top={253} bottom={GROUND} wTop={63.5} wBot={71.5} />
          <RollerPair cx={cx} cy={231.5} r={11.5} gap={33.5} frameY={245.5} frameW={76.5} frameH={7.5} />
        </g>
      ))}
      <KilnShell x={SHELL.x} y={SHELL.y} w={SHELL.w} h={SHELL.h} seam={32.5} />
      <Glow cx={370} cy={161} rx={72} ry={24} core={0.85} />
      {TYRES.map((cx) => (
        <Tyre key={cx} cx={cx} y={124} w={13.5} h={77.5} shellTop={top} shellBot={bot} />
      ))}
      {/* girth gear */}
      <rect x={GG.x} y={GG.y} width={GG.w} height={GG.h} rx={2} {...PAINT.raised} />
      {Array.from({ length: 22 }).map((_, i) => (
        <line key={i} x1={GG.x + 1.5} x2={GG.x + GG.w - 1.5} y1={GG.y + 4 + i * 4.1} y2={GG.y + 4 + i * 4.1} stroke={MX.edge} strokeWidth={0.7} />
      ))}
    </g>
  );
}

function CoolingFans() {
  return (
    <g>
      {FANS.map((cx) => (
        <g key={cx}>
          <path d={`M ${cx - 12.5} 92.5 V 71 Q ${cx - 12.5} 65 ${cx - 6.5} 65 H ${cx + 6} Q ${cx + 12.5} 65 ${cx + 12.5} 72 V 92.5 Z`} {...PAINT.body} />
          <Fan cx={cx + 0.5} cy={79.5} r={8.5} />
          <FlowArrow x1={cx} y1={94} x2={cx} y2={106} color={MX.air} w={1.4} s={6} />
        </g>
      ))}
      {/* fan starter / status box above the fans, wired to both */}
      <polyline points={`${FANS[0]},65 ${FANS[0]},56 ${FANS[1]},56 ${FANS[1]},65`} fill="none" stroke={MX.fine} strokeWidth={1.1} />
      <rect x={309} y={36} width={21} height={20} rx={3.5} {...PAINT.body} />
    </g>
  );
}

function Scanner() {
  const lens: [number, number] = [253.5, 321];
  const targets: Array<[number, number]> = [
    [44, 196.5],
    [130.5, 211.5],
    [195, 196.5],
    [318.5, 196.5],
    [400, 196.5],
    [470, 196.5],
  ];
  return (
    <g>
      {targets.map(([x, y]) => (
        <Flow key={x} pts={[lens, [x, y]]} color={MX.air} dash="3 3" w={0.9} opacity={0.75} />
      ))}
      <rect x={251.5} y={SCAN.y + SCAN.h} width={4} height={GROUND2 - 1.5 - SCAN.y - SCAN.h} {...PAINT.shaft} />
      <rect x={240} y={GROUND2 - 2} width={26} height={4.5} rx={1.2} {...PAINT.raised} />
      <rect x={SCAN.x} y={SCAN.y} width={SCAN.w} height={SCAN.h} rx={4} {...PAINT.body} />
      <rect x={SCAN.x + 3.5} y={SCAN.y + 3.5} width={SCAN.w - 7} height={SCAN.h - 7} rx={2.5} fill="none" stroke={MX.fine} strokeWidth={0.8} />
    </g>
  );
}

function Handheld() {
  return (
    <g>
      <rect x={376} y={307.5} width={12} height={20} rx={3} fill={MX.flatBody} stroke={MX.label} strokeWidth={1.1} strokeDasharray="2.5 2" />
      <line x1={388} y1={312.5} x2={404} y2={302.5} stroke={MX.label} strokeWidth={1.8} strokeLinecap="round" />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={22.5} x2={484} y={GROUND} />
      <GroundLine x1={22.5} x2={484} y={GROUND2} />
      <Scanner />
      <ShellAndStations />
      <Zones />
      <CoolingFans />
      <Handheld />

      <MachineLabel x={319.5} y={27} size={6}>
        SHELL COOLING FANS (BURNING ZONE)
      </MachineLabel>
      <MachineLabel x={130.75} y={104} size={5.5}>
        GG
      </MachineLabel>
      {TYRES.map((cx) => (
        <MachineLabel key={cx} x={cx} y={212} size={5.5}>
          NO VIEW
        </MachineLabel>
      ))}
      <MachineLabel x={252.5} y={306} size={6}>
        SHELL SCANNER (STAND-OFF)
      </MachineLabel>
      <MachineLabel x={388} y={341} size={6}>
        HANDHELD CHECK
      </MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on group image 3A, middle panel. */
const pads: LineSheetArt["pads"] = {
  "STS-KLN-08": [253.5, 325.5],
  "STS-KLN-13": [319.5, 46],
  "MAN-KLN-01": [382.5, 303.5],
};

/** Plate side per point (start = plate right of the pad, end = left). */
const callouts: LineSheetArt["callouts"] = {
  "STS-KLN-08": [241, 325.5, "end"],
  "STS-KLN-13": [332, 46, "start"],
  "MAN-KLN-01": [395, 303.5, "start"],
};

export const sheet: LineSheetArt = { id: "K-8", ready: true, width: W, height: H, Art, pads, callouts };
