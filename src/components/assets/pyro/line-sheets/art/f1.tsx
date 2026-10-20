/**
 * Sheet F-1 — FSL-01 · Feed silo — Silo bottom: six air slides and outlet gates.
 *
 * Panel "SILO BOTTOM: SIX AIR SLIDES AND OUTLET GATES" of the machine group
 * images, page 1 (panel box 42, 91.5 → 547.5, 540 in page units). Left: the
 * silo and the kiln feed bin in elevation (caged ladder, roof with handrail
 * and radar, meal window, cone with the six slide streams to the gate row,
 * collecting hopper, chute, bin on its braced legs). Right: plan view of the
 * silo bottom with the six radial air slides, their outlet gates around the
 * central collecting cone.
 *
 * Units: page units of the group-image page minus the panel origin.
 */
import React from "react";
import { GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Ladder } from "../../drawings/fkp-parts";
import type { LineSheetArt } from "../types";
import { ConeRoof, Leg, RadarLevel, Vessel } from "./parts-f";
import { FlowArrow, MealDashes } from "./parts-f2";

const W = 505.5;
const H = 448.5;
const GROUND = 413;

/** Plan view centre and radius of the silo bottom. */
const PX = 336.5;
const PY = 169.5;

function Elevation() {
  const gates = [88.5, 104.5, 120.5, 136.5, 152.5, 168.5];
  return (
    <g>
      <Ladder x={47} y1={76} y2={GROUND} w={6} />
      {/* silo legs and the bin legs with V-bracing */}
      <Leg x={70} y1={181} y2={GROUND} w={5} />
      <Leg x={182.5} y1={181} y2={GROUND} w={5} />
      {[
        [96, 340, 129, 404],
        [162.5, 340, 129, 404],
      ].map(([a, b, c, d]) => (
        <line key={a} x1={a} y1={b} x2={c} y2={d} {...PAINT.hair} />
      ))}
      <Leg x={93.5} y1={333} y2={GROUND} w={5} />
      <Leg x={160} y1={333} y2={GROUND} w={5} />

      {/* silo: roof, radar, shell with the meal window, cone */}
      <ConeRoof x0={61.5} x1={195} y={89} peak={75} rail={12} step={14} />
      <RadarLevel x={128.2} roof={77} headY={57.3} s={0.62} />
      <Vessel x0={61.5} x1={195} top={89} ring={175} coneBot={235} outW={98.5} seams={[106, 158]} win={[82.5, 109, 92.5, 43.5]} level={127.5} flangeH={6.5} bolts={14} />
      <MachineLabel x={128.5} y={141} size={5.6} tone="ink">
        RAW-MEAL FEED SILO
      </MachineLabel>
      {/* one meal stream per air slide down the cone to its gate */}
      {gates.map((gx, i) => (
        <line key={gx} x1={66 + i * 25} y1={184} x2={gx} y2={234} stroke={MX.material} strokeWidth={1.1} opacity={0.8} />
      ))}
      {/* outlet gate row */}
      {gates.map((gx) => (
        <g key={gx}>
          <rect x={gx - 6} y={236.5} width={12} height={8} rx={1.5} {...PAINT.body} />
          <rect x={gx - 3.5} y={239.7} width={7} height={1.6} {...PAINT.material} />
        </g>
      ))}

      {/* collecting hopper, chute into the bin */}
      <path d="M 80 248 L 178.5 248 L 136.5 270 L 121.5 270 Z" {...PAINT.cylinderV} />
      <rect x={78} y={245.5} width={102.5} height={4} rx={1.2} {...PAINT.raised} />
      <rect x={121.5} y={270} width={15} height={17.5} rx={1.5} {...PAINT.body} />
      <FlowArrow x1={129} y1={272} x2={129} y2={285} head={5} w={1.4} />

      {/* kiln feed bin */}
      <path d="M 95 334 L 162.5 334 L 132.5 357.5 L 125.5 357.5 Z" {...PAINT.cylinderV} />
      <rect x={89} y={292.5} width={79.5} height={35.5} rx={1.5} {...PAINT.cylinderV} />
      {[300, 306].map((y) => (
        <line key={y} x1={91} x2={166.5} y1={y} y2={y} stroke={MX.fine} strokeWidth={0.8} />
      ))}
      <line x1={91} x2={166.5} y1={322} y2={322} stroke={MX.fine} strokeWidth={0.8} />
      <rect x={86} y={288.5} width={85.5} height={4.5} rx={1.2} {...PAINT.raised} />
      <rect x={85} y={328} width={87.5} height={6} rx={1.5} {...PAINT.raised} />
      <MachineLabel x={128.5} y={316} size={4.6} tone="ink">
        KILN FEED BIN
      </MachineLabel>
      <MachineLabel x={129} y={428} size={5.4}>
        SILO + KILN FEED BIN (ELEVATION)
      </MachineLabel>
    </g>
  );
}

function PlanView() {
  const slides = [1, 2, 3, 4, 5, 6].map((n) => {
    const a = ((-60 + (n - 1) * 60) * Math.PI) / 180;
    return { n, a, deg: -60 + (n - 1) * 60 };
  });
  return (
    <g>
      <MachineLabel x={PX} y={65.5} size={5.4}>
        PLAN VIEW OF THE SILO BOTTOM
      </MachineLabel>
      <circle cx={PX} cy={PY} r={91} {...PAINT.body} />
      <circle cx={PX} cy={PY} r={86} fill="none" stroke={MX.fine} strokeWidth={0.8} />
      {slides.map(({ n, a, deg }) => {
        const sx = PX + Math.cos(a) * 69;
        const sy = PY + Math.sin(a) * 69;
        const gx = PX + Math.cos(a) * 42;
        const gy = PY + Math.sin(a) * 42;
        return (
          <g key={n}>
            {/* air slide (radial), dashed meal line, number */}
            <g transform={`rotate(${deg} ${sx} ${sy})`}>
              <rect x={sx - 17.5} y={sy - 5.5} width={35} height={11} rx={1.5} fill={MX.deep} stroke={MX.edge} strokeWidth={1.2} />
              <MealDashes x1={sx - 13} y1={sy} x2={sx + 13} y2={sy} dash={3.5} gap={2} />
            </g>
            <MachineLabel x={sx} y={sy + 2} size={4.6}>
              {String(n)}
            </MachineLabel>
            {/* outlet gate at the slide's inner end */}
            <g transform={`rotate(${deg} ${gx} ${gy})`}>
              <rect x={gx - 6} y={gy - 7} width={12} height={14} rx={2} {...PAINT.body} />
              <rect x={gx - 1.2} y={gy - 4.5} width={2.4} height={9} {...PAINT.material} />
            </g>
          </g>
        );
      })}
      {/* central collecting cone */}
      <circle cx={PX} cy={PY} r={18} {...PAINT.raised} />
      <circle cx={PX} cy={PY} r={12} fill="none" stroke={MX.fine} strokeWidth={0.8} />
      <MachineLabel x={PX} y={PY + 1.6} size={3.6}>
        COLLECT
      </MachineLabel>
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={22.5} x2={482.5} y={GROUND} />
      <Elevation />
      <PlanView />
    </g>
  );
}

/** Pad centre per point: PDF pad centres (radar head, and each gate's limit-switch head in the plan view). */
const pads: LineSheetArt["pads"] = {
  "LEV-FSL-01": [128.2, 57.3],
  "POS-FSL-01": [357.8, 133],
  "POS-FSL-02": [378.5, 169],
  "POS-FSL-03": [357.8, 205],
  "POS-FSL-04": [316, 205],
  "POS-FSL-05": [295, 169],
  "POS-FSL-06": [316, 133],
};

/** Plates run outward from the plan view: gates 1–3 to the right, 4–6 to the left, as the PDF chips. */
const callouts: LineSheetArt["callouts"] = {
  "LEV-FSL-01": [145, 57.3, "start"],
  "POS-FSL-01": [372, 133, "start"],
  "POS-FSL-02": [393, 169, "start"],
  "POS-FSL-03": [372, 205, "start"],
  "POS-FSL-04": [300, 205, "end"],
  "POS-FSL-05": [280, 169, "end"],
  "POS-FSL-06": [300, 133, "end"],
};

export const sheet: LineSheetArt = { id: "F-1", ready: true, width: W, height: H, Art, pads, callouts };
