/**
 * Sheet C-2 — CLR-01 · Clinker cooler — Cooling fans 1–3 (hot zone).
 * Under the compartment plenum (C-1), each compartment is fed by its own
 * centrifugal cooling fan: round supply duct with louvre damper, expansion
 * bellows and outlet transition; spiral volute with inlet ring and impeller,
 * split bearing, coupling guard and motor on a stool; the three fan sets
 * stand on a steel deck. The same art serves C-3 (fans 4–6).
 */
import React from "react";
import { Bolt, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import type { LineSheetArt } from "../types";
import { Bellows, CentrifugalFan, Column, DuctFlange, LouvreDamper, VDuct } from "./parts-c";

const W = 824;
const H = 704;

const BAY = 247.5;
const HDR = { x: 30.5, y: 30.5, w: 765.5, h: 67.5 };
const DUCT = { x: 57.5, w: 27.5 };
const FAN = { cx: 113, cy: 450.5, r: 68, top: 366, base: 525.5 };
const DECK = 535.5;
const GROUND = 660;

/** Fan bays for fans first..first+2 (C-2: 1, C-3: 4). */
export function FanBays({ first, labelX }: { first: number; labelX: number }) {
  return (
    <g>
      <GroundLine x1={22} x2={802} y={GROUND} />

      {/* ---------------- compartment plenum above ---------------- */}
      <rect x={HDR.x} y={HDR.y} width={HDR.w} height={HDR.h} rx={10} {...PAINT.body} />
      <rect x={HDR.x + 6} y={HDR.y + 6} width={HDR.w - 12} height={HDR.h - 12} rx={6} fill="none" stroke={MX.fine} strokeWidth={1} />
      {Array.from({ length: 16 }).map((_, i) => {
        const x = HDR.x + 24 + i * 48;
        return <line key={i} x1={x} x2={x} y1={HDR.y + 10} y2={HDR.y + HDR.h - 10} {...PAINT.hair} />;
      })}
      {[1, 2].map((k) => (
        <g key={k}>
          <rect x={HDR.x + k * BAY - 4} y={HDR.y + 2} width={8} height={HDR.h - 4} {...PAINT.raised} />
          <Bolt x={HDR.x + k * BAY} y={HDR.y + 12} r={1.6} />
          <Bolt x={HDR.x + k * BAY} y={HDR.y + HDR.h - 12} r={1.6} />
        </g>
      ))}
      <Bolt x={HDR.x + 10} y={HDR.y + 10} />
      <Bolt x={HDR.x + HDR.w - 10} y={HDR.y + 10} />
      <MachineLabel x={412} y={21.6} size={8.2}>COMPARTMENTS ABOVE (C-1)</MachineLabel>

      {[0, 1, 2].map((i) => {
        const dx = i * BAY;
        const dX = DUCT.x + dx;
        const fcx = FAN.cx + dx;
        return (
          <g key={i}>
            {/* riddlings hopper and double flap valve under the plenum */}
            <path d={`M ${150 + dx} ${HDR.y + HDR.h} H ${196 + dx} L ${181 + dx} ${124} H ${165 + dx} Z`} {...PAINT.body} />
            <rect x={161 + dx} y={124} width={24} height={22} rx={3} {...PAINT.raised} />
            <line x1={161 + dx} x2={185 + dx} y1={135} y2={135} stroke={MX.fine} strokeWidth={1} />
            <rect x={185 + dx} y={127} width={9} height={4} rx={1} {...PAINT.shaft} />
            <rect x={185 + dx} y={138} width={9} height={4} rx={1} {...PAINT.shaft} />
            <circle cx={196 + dx} cy={129} r={3} {...PAINT.raised} />
            <circle cx={196 + dx} cy={140} r={3} {...PAINT.raised} />
            <rect x={165 + dx} y={146} width={16} height={8} rx={1.5} {...PAINT.body} />

            {/* supply duct: damper, bellows, transition to the fan outlet */}
            <VDuct x={dX} w={DUCT.w} y1={HDR.y + HDR.h} y2={330} />
            <LouvreDamper x={dX} w={DUCT.w} y={176} h={40} />
            <Bellows x={dX} w={DUCT.w} y={286} h={22} />
            <path d={`M ${dX} 330 H ${dX + DUCT.w} L ${fcx} ${FAN.top} H ${fcx - FAN.r} Z`} {...PAINT.body} />
            <line x1={dX + 3} x2={fcx - FAN.r + 4} y1={333} y2={FAN.top - 3} {...PAINT.hair} />
            <DuctFlange x={dX} w={DUCT.w} y={330} />
            <MachineLabel x={dX + DUCT.w + 7} y={134} anchor="start" size={7.5}>{`COMP. ${first + i}`}</MachineLabel>

            {/* cooling fan set */}
            <CentrifugalFan cx={fcx} cy={FAN.cy} r={FAN.r} top={FAN.top} outlet="left" base={FAN.base} bx={191.5 + dx} bw={20} bh={60} mx={211 + dx} mw={52} mh={64} />
            <MachineLabel x={labelX + dx} y={576.6} size={8.2}>{`COOLING FAN ${first + i}`}</MachineLabel>
          </g>
        );
      })}

      {/* ---------------- steel fan deck ---------------- */}
      <rect x={24} y={DECK} width={776} height={9} rx={2} {...PAINT.body} />
      <line x1={28} x2={796} y1={DECK + 4.5} y2={DECK + 4.5} {...PAINT.hair} />
      {[36, 278.5, 526, 788].map((x) => (
        <Column key={x} x={x} y1={DECK + 9} y2={GROUND} />
      ))}
      {[
        [36, 278.5],
        [278.5, 526],
        [526, 788],
      ].map(([a, b]) => (
        <g key={a}>
          <line x1={a + 5} x2={b - 5} y1={600} y2={600} stroke={MX.edge} strokeWidth={1.4} />
          <line x1={a + 5} x2={b - 5} y1={600} y2={GROUND - 5} stroke={MX.edge} strokeWidth={1.2} />
          <line x1={b - 5} x2={a + 5} y1={600} y2={GROUND - 5} stroke={MX.edge} strokeWidth={1.2} />
          <circle cx={(a + b) / 2} cy={(600 + GROUND - 5) / 2} r={2.2} {...PAINT.raised} />
        </g>
      ))}
    </g>
  );
}

function Art() {
  return <FanBays first={1} labelX={157.5} />;
}

/** Pad centre per point (sheet units), as on PDF page 30. */
const pads: LineSheetArt["pads"] = {
  "VIB-CLR-01": [191.5, 431.5],
  "TMP-CLR-01": [191.5, 461.5],
  "ELE-CLR-01": [236.5, 405.5],
  "VIB-CLR-02": [439, 431.5],
  "TMP-CLR-02": [439, 461.5],
  "ELE-CLR-02": [484, 405.5],
  "VIB-CLR-03": [686.5, 431.5],
  "TMP-CLR-03": [686.5, 461.5],
  "ELE-CLR-03": [731.5, 405.5],
};

/** Tag chip centre per point, as on PDF page 30 (motor-current chips moved 35 down, off the pedestals, under the deck). */
const chips: NonNullable<LineSheetArt["chips"]> = {
  "VIB-CLR-01": [143, 297],
  "TMP-CLR-01": [240, 379.5],
  "ELE-CLR-01": [195.5, 553],
  "VIB-CLR-02": [390.5, 297],
  "TMP-CLR-02": [487.5, 379.5],
  "ELE-CLR-02": [443, 553],
  "VIB-CLR-03": [638, 297],
  "TMP-CLR-03": [735, 379.5],
  "ELE-CLR-03": [690.5, 553],
};

export const sheet: LineSheetArt = { id: "C-2", ready: true, width: W, height: H, Art, pads, chips };
