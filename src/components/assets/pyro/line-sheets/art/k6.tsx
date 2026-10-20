/**
 * Sheet K-6 — KLN-01 · Rotary kiln — Roller stations and tyres.
 *
 * Panel "ROLLER STATIONS AND TYRES" of group image 3C (page 9, panel box
 * 48.5 105.5 – 811.5 777.5). Top: the shell in elevation on its three tyres,
 * each tyre with its migration pickup and temperature, the roller pairs on
 * their piers and the girth gear. Below: each station in plan (looking down),
 * the tyre across the left and right support rollers, every roller with its
 * bearing housings A and B and its oil bath.
 *
 * Every station repeats one pattern so the 18 station readings stay regular:
 * left roller — oil bath above, bearing A pad high on its housing (plate runs
 * right along the roller), bearing B pad low on its housing (plate runs left);
 * right roller — bearing A high, bearing B low, oil bath below.
 */
import React from "react";
import { GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import type { LineSheetArt } from "../types";
import { KilnShell, Pier, RollerPair, Tyre } from "./parts-kb";
import { DashBox, OilBath, RollerPlan, TyrePlan } from "./parts-k2";

const W = 763;
const H = 672;
const GROUND = 195;

/** Tyre centres in elevation. */
const TYRES = [149, 399.3, 587];
const SHELL = { x: 51, y: 89, w: 661.5, h: 44.5 };
/** Station plan offsets (station 1 at 0). */
const DX = [0, 236.3, 472.6];

/** Station-plan geometry for station 1 (others shifted by DX). */
const PLAN = {
  frame: { x: 31, y: 230, w: 229, h: 411 },
  tyre: { cx: 145.25, y1: 263.5, y2: 621, w: 32.5 },
  /** Roller body between the housings, housing size. */
  roller: { x1: 71, x2: 220, d: 32.5, hw: 30, hh: 50 },
  left: { cy: 361, bath: 322, a: 348, b: 374 },
  right: { cy: 516, bath: 555, a: 503, b: 529 },
  bath: { x: 77.5, w: 61.5, h: 11 },
  /** Pad x: bearing A, bearing B, oil bath. */
  padA: 56,
  padB: 235,
  padBath: 108.3,
};

const TAGS = [
  /** [L brg A, L brg B, L bath, R brg A, R brg B, R bath] per station. */
  ["TMP-KLN-01", "TMP-KLN-02", "LEV-KLN-02", "TMP-KLN-03", "TMP-KLN-04", "LEV-KLN-03"],
  ["TMP-KLN-05", "TMP-KLN-06", "LEV-KLN-04", "TMP-KLN-07", "TMP-KLN-08", "LEV-KLN-05"],
  ["TMP-KLN-09", "TMP-KLN-10", "LEV-KLN-06", "TMP-KLN-11", "TMP-KLN-12", "LEV-KLN-07"],
];
const TYRE_TAGS = [
  ["MIG-KLN-01", "TMP-KLN-28"],
  ["MIG-KLN-02", "TMP-KLN-29"],
  ["MIG-KLN-03", "TMP-KLN-30"],
];
/** Tyre pads: migration pickup above the tyre, tyre temperature on the tyre face. */
const MIG_Y = 76.5;
const TT_Y = 113;

function Elevation() {
  return (
    <g>
      {TYRES.map((cx) => (
        <g key={cx}>
          <Pier cx={cx} top={171} bottom={GROUND} wTop={54} wBot={67} />
          <RollerPair cx={cx} cy={155} r={11} gap={30} frameY={165} frameW={62} frameH={6} />
        </g>
      ))}
      <KilnShell x={SHELL.x} y={SHELL.y} w={SHELL.w} h={SHELL.h} seam={48.5} />
      {TYRES.map((cx) => (
        <g key={cx}>
          <Tyre cx={cx} y={81} w={16} h={60.5} shellTop={SHELL.y} shellBot={SHELL.y + SHELL.h} />
          {/* migration pickup on its protected bracket above the tyre */}
          <line x1={cx - 3.5} x2={cx - 3.5} y1={54} y2={81} stroke={MX.fine} strokeWidth={1.1} />
          <line x1={cx + 3.5} x2={cx + 3.5} y1={54} y2={81} stroke={MX.fine} strokeWidth={1.1} />
          <rect x={cx - 8} y={50} width={16} height={5} rx={1.5} {...PAINT.raised} />
          <rect x={cx - 7} y={69} width={14} height={15} rx={3} {...PAINT.body} />
        </g>
      ))}
      {/* girth gear */}
      <rect x={196.5} y={66} width={12.5} height={90.5} rx={2.5} {...PAINT.raised} />
      {Array.from({ length: 21 }).map((_, i) => (
        <line key={i} x1={198} x2={207.5} y1={70 + i * 4.1} y2={70 + i * 4.1} stroke={MX.edge} strokeWidth={0.7} />
      ))}
      <GroundLine x1={36.5} x2={726} y={GROUND} />
      {TYRES.map((cx, i) => (
        <MachineLabel key={cx} x={cx} y={210} size={8}>
          {`STATION ${i + 1}`}
        </MachineLabel>
      ))}
      <MachineLabel x={208} y={218.5} size={6}>
        GIRTH GEAR
      </MachineLabel>
    </g>
  );
}

function StationPlan({ i }: { i: number }) {
  const dx = DX[i];
  const { frame, tyre, roller, left, right, bath } = PLAN;
  return (
    <g transform={`translate(${dx} 0)`}>
      <DashBox x={frame.x} y={frame.y} w={frame.w} h={frame.h} rx={6} />
      <line x1={frame.x + 6} x2={frame.x + frame.w - 6} y1={439} y2={439} stroke={MX.fine} strokeWidth={0.8} strokeDasharray="6 5" />
      <TyrePlan cx={tyre.cx} y1={tyre.y1} y2={tyre.y2} w={tyre.w} />
      {[left, right].map((r) => (
        <g key={r.cy}>
          <RollerPlan x1={roller.x1} x2={roller.x2} cy={r.cy} d={roller.d} hw={roller.hw} hh={roller.hh} />
          <OilBath x={bath.x} y={r.bath - bath.h / 2} w={bath.w} h={bath.h} />
        </g>
      ))}
      <MachineLabel x={frame.x + 9} y={frame.y + 16} anchor="start" size={7.5}>
        {`STATION ${i + 1} · PLAN (LOOKING DOWN)`}
      </MachineLabel>
      <MachineLabel x={176} y={404} anchor="start" size={6.5}>
        LEFT ROLLER
      </MachineLabel>
      <MachineLabel x={176} y={481} anchor="start" size={6.5}>
        RIGHT ROLLER
      </MachineLabel>
      <MachineLabel x={tyre.cx} y={634} size={6.5}>
        {`TYRE ${i + 1}`}
      </MachineLabel>
    </g>
  );
}

function Art() {
  return (
    <g>
      <Elevation />
      {DX.map((_, i) => (
        <StationPlan key={i} i={i} />
      ))}
    </g>
  );
}

const pads: LineSheetArt["pads"] = {};
const callouts: LineSheetArt["callouts"] = {};
TYRE_TAGS.forEach(([mig, tt], i) => {
  const x = TYRES[i];
  pads[mig] = [x, MIG_Y];
  pads[tt] = [x, TT_Y];
  callouts[mig] = [x + 12, MIG_Y, "start"];
  callouts[tt] = [x + 12, TT_Y, "start"];
});
TAGS.forEach(([la, lb, lbath, ra, rb, rbath], i) => {
  const dx = DX[i];
  const { padA, padB, padBath, left, right } = PLAN;
  const put = (tag: string, x: number, y: number, side: "start" | "end") => {
    pads[tag] = [x + dx, y];
    callouts[tag] = [x + dx + (side === "start" ? 12 : -12), y, side];
  };
  put(lbath, padBath, left.bath, "start");
  put(la, padA, left.a, "start");
  put(lb, padB, left.b, "end");
  put(ra, padA, right.a, "start");
  put(rb, padB, right.b, "end");
  put(rbath, padBath, right.bath, "start");
});

export const sheet: LineSheetArt = { id: "K-6", ready: true, width: W, height: H, Art, pads, callouts };
