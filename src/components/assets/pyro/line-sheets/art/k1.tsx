/**
 * Sheet K-1 — KLN-01 · Rotary kiln — Inlet: seal, chamber and gas analysis.
 *
 * Panel "INLET: SEAL, CHAMBER AND GAS ANALYSIS" of group image 3A (page 7,
 * panel box 41.5 91 – 547.5 540): the riser to C6 above the refractory-lined
 * kiln inlet chamber on its legs, kiln gas rising, the hot-meal chute from C6,
 * the gas-sample probe at the throat with its sample line to the extractive
 * gas analyser (O₂ / CO / NOx cells and the status cell, stacked so each
 * reading runs along its own row), the inlet seal with false air drawn in at a
 * worn seal, and the kiln shell feed end. The inlet false-air index
 * (CAL-KLN-06, gateway calculation) sits on the seal.
 */
import React from "react";
import { Bolt, CornerBolts, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import type { LineSheetArt } from "../types";
import { Column, ThermoProbe } from "./parts-ka";
import { KilnShell } from "./parts-kb";
import { Flow, FlowArrow, HotFace, ToneLabel, Transmitter } from "./parts-k2";

const W = 506;
const H = 449;
const GROUND = 414;

const RISER = { x: 75.5, y: 41, w: 58, h: 110.5 };
const CH = { x: 45, y: 151.5, w: 133, h: 208.5 };
const SEAL = { x: 178, y: 205, w: 17, h: 97.5 };
const SHELL = { x: 195, y: 218.5, w: 302.5, h: 75.5 };
/** Gas analyser cabinet and its four cell rows (O₂, CO, NOx, status). */
const AN = { x: 258, y: 36, w: 182, h: 106 };
const ROWS = [52, 76, 100, 124];
const CELL_X = 278;

function RiserAndChute() {
  return (
    <g>
      <rect x={RISER.x} y={RISER.y} width={RISER.w} height={RISER.h} rx={5} {...PAINT.cylinderV} />
      {[72, 110].map((y) => (
        <rect key={y} x={RISER.x - 2.5} y={y} width={RISER.w + 5} height={4.5} rx={1.5} {...PAINT.raised} />
      ))}
      <rect x={RISER.x - 3} y={RISER.y + RISER.h - 7} width={RISER.w + 6} height={7} rx={2} {...PAINT.raised} />
      {/* kiln gas up the riser */}
      <FlowArrow x1={60.5} y1={148} x2={60.5} y2={52} color={MX.gas} />
      {/* hot meal chute from C6 into the chamber */}
      <polyline points="155,41 155,113 165,146" fill="none" stroke={MX.edge} strokeWidth={8} strokeLinejoin="round" />
      <polyline points="155,41 155,113 165,146" fill="none" stroke={MX.material} strokeWidth={4.5} strokeLinejoin="round" />
      <rect x={149} y={101} width={12} height={4} rx={1.2} {...PAINT.raised} />
    </g>
  );
}

function Chamber() {
  return (
    <g>
      <Column x={58.5} y1={CH.y + CH.h} y2={GROUND} w={10} />
      <Column x={164.5} y1={CH.y + CH.h} y2={GROUND} w={10} />
      <rect x={CH.x} y={CH.y} width={CH.w} height={CH.h} rx={7} {...PAINT.body} />
      <HotFace x={52} y={158.5} w={119} h={195} rx={4} heat={0.4} />
      {/* meal bed on the chamber floor */}
      <path d="M 53.5 352.5 Q 112 316 169.5 330 L 169.5 352.5 Z" fill={MX.material} opacity={0.85} />
      <CornerBolts x={CH.x} y={CH.y} w={CH.w} h={CH.h} inset={3.5} r={1.2} />

      {/* inlet gas thermocouple through the left wall */}
      <ThermoProbe x={45} y={200.5} len={30} dir={1} head={11} />
      {/* draft tap and transmitter */}
      <rect x={36} y={305.5} width={30} height={3} {...PAINT.shaft} />
      <Transmitter x={30} y={307} w={11} h={14} />

      {/* gas-sample probe at the throat, sample line up to the analyser */}
      <rect x={178} y={168} width={62.5} height={3.5} rx={1} {...PAINT.shaft} />
      <rect x={176} y={164} width={5} height={11} rx={1.2} {...PAINT.raised} />
      <Flow pts={[[240.5, 169.5], [AN.x + 12, AN.y + AN.h]]} color={MX.label} dash="4 3" w={1} opacity={0.8} />
    </g>
  );
}

function Analyser() {
  return (
    <g>
      <rect x={AN.x} y={AN.y} width={AN.w} height={AN.h} rx={7} {...PAINT.body} />
      <rect x={AN.x + 5} y={AN.y + 5} width={AN.w - 10} height={AN.h - 10} rx={5} fill="none" stroke={MX.fine} strokeWidth={0.8} />
      <CornerBolts x={AN.x} y={AN.y} w={AN.w} h={AN.h} inset={9} r={1.3} />
      {ROWS.map((y, i) => (
        <g key={y}>
          {i > 0 && <line x1={AN.x + 10} x2={AN.x + AN.w - 10} y1={y - 12} y2={y - 12} {...PAINT.hair} opacity={0.6} />}
          <rect x={CELL_X - 11} y={y - 9} width={22} height={18} rx={3} {...PAINT.recess} />
        </g>
      ))}
      {/* sample conditioning: cooler and pump on the cabinet side */}
      <rect x={AN.x + AN.w} y={58} width={7} height={62} rx={2} {...PAINT.raised} />
      <Bolt x={AN.x + AN.w + 3.5} y={66} r={1.2} />
      <Bolt x={AN.x + AN.w + 3.5} y={112} r={1.2} />
    </g>
  );
}

function SealAndShell() {
  const { x, y, w, h } = SEAL;
  return (
    <g>
      <KilnShell x={SHELL.x} y={SHELL.y} w={SHELL.w} h={SHELL.h} seam={21.5} axis={false} />
      <rect x={x} y={y} width={w} height={h} rx={3} {...PAINT.raised} />
      {Array.from({ length: 7 }).map((_, i) => (
        <line key={i} x1={x + 2.5} x2={x + w - 2.5} y1={y + 12 + i * 12.2} y2={y + 12 + i * 12.2} stroke={MX.edge} strokeWidth={0.8} />
      ))}
      {/* false air drawn in at a worn seal */}
      <FlowArrow x1={186.5} y1={187.5} x2={186.5} y2={204} color={MX.label} w={1.2} s={6} />
      <FlowArrow x1={186.5} y1={329} x2={186.5} y2={304} color={MX.label} w={1.2} s={6} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={22.5} x2={484} y={GROUND} />
      <RiserAndChute />
      <SealAndShell />
      <Chamber />
      <Analyser />

      <MachineLabel x={104.5} y={34} size={7}>
        RISER → C6
      </MachineLabel>
      <ToneLabel x={54} y={99} color={MX.gas} anchor="end" size={6.5}>
        KILN GAS
      </ToneLabel>
      <ToneLabel x={163} y={86} color={MX.material} size={6.5}>
        HOT MEAL FROM C6
      </ToneLabel>
      <MachineLabel x={212} y={162} size={6.5}>
        PROBE
      </MachineLabel>
      <MachineLabel x={AN.x + AN.w / 2} y={AN.y + AN.h + 11} size={6.5}>
        EXTRACTIVE GAS ANALYSER
      </MachineLabel>
      <MachineLabel x={200} y={198} anchor="start" size={6.5}>
        INLET SEAL
      </MachineLabel>
      <MachineLabel x={420} y={259} size={6.5} tone="ink">
        KILN SHELL (FEED END)
      </MachineLabel>
      <MachineLabel x={267} y={334} size={6.5}>
        FALSE AIR IN AT A WORN SEAL
      </MachineLabel>
      <MachineLabel x={111} y={426} size={7}>
        KILN INLET CHAMBER
      </MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units); chamber pads as on group image 3A, analyser cells stacked. */
const pads: LineSheetArt["pads"] = {
  "GAS-KLN-01": [CELL_X, ROWS[0]],
  "GAS-KLN-02": [CELL_X, ROWS[1]],
  "GAS-KLN-03": [CELL_X, ROWS[2]],
  "STS-KLN-06": [CELL_X, ROWS[3]],
  "TMP-KLN-13": [75.5, 200.5],
  "PRS-KLN-01": [66, 307],
  "CAL-KLN-06": [186.5, 255],
};

/** Plate side per point: every plate runs right, along its analyser row or across the chamber / shell. */
const callouts: LineSheetArt["callouts"] = {
  "GAS-KLN-01": [CELL_X + 12, ROWS[0], "start"],
  "GAS-KLN-02": [CELL_X + 12, ROWS[1], "start"],
  "GAS-KLN-03": [CELL_X + 12, ROWS[2], "start"],
  "STS-KLN-06": [CELL_X + 12, ROWS[3], "start"],
  "TMP-KLN-13": [87, 200.5, "start"],
  "PRS-KLN-01": [78, 307, "start"],
  "CAL-KLN-06": [198, 255, "start"],
};

export const sheet: LineSheetArt = { id: "K-1", ready: true, width: W, height: H, Art, pads, callouts };
