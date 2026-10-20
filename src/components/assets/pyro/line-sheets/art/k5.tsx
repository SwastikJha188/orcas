/**
 * Sheet K-5 — KLN-01 · Rotary kiln — Pinion and girth-gear spray lubrication.
 *
 * Drawn as the "PINION AND GIRTH-GEAR SPRAY LUBRICATION" panel of the
 * machine-group images (page 8, panel box 842.5, 821 – 1605.5, 1492): the
 * kiln shell with the girth gear across its face width, the six spray nozzles
 * on their header at the mesh, the pinion on its shaft from the gearbox
 * between two bearing blocks, the spray unit (controller over the lubricant
 * drum) feeding the metering divider, and the six delivery circuits from the
 * divider up to the nozzles.
 */
import React from "react";
import { GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import type { LineSheetArt } from "../types";
import { GOLD, OilRun, ShaftRun } from "./parts-k3";

const W = 763;
const H = 671.5;
const GROUND = 634;
/** Spray nozzles across the girth-gear face (x). */
const NOZZLES = [327.5, 349, 370.5, 392, 413.75, 435];
/** Metering-divider elements / outlets (x). */
const OUTLETS = [244.3, 270, 295.7, 321.4, 347.1, 372.8];
/** Height of each circuit's cross-over run (y). */
const RUNS = [431.7, 426, 420.7, 415.3, 410, 404.3];
const DIV_TOP = 458.5;

function ShellAndGirthGear() {
  return (
    <g>
      <rect x={37.5} y={74} width={715.5} height={134.5} rx={6} {...PAINT.cylinder} />
      <rect x={314} y={40} width={135} height={229} rx={4} {...PAINT.cylinderV} />
      {Array.from({ length: 36 }).map((_, i) => {
        const ty = 46 + i * 6.05;
        return <line key={i} x1={318} x2={445} y1={ty} y2={ty} stroke={MX.fine} strokeWidth={0.9} opacity={0.75} />;
      })}
      {/* spray fans onto the gear face */}
      {NOZZLES.map((x) => (
        <path key={x} d={`M ${x - 8.75} 256 H ${x + 8.75} L ${x + 2} 272.5 H ${x - 2} Z`} fill={MX.metalHi} opacity={0.35} stroke="none" />
      ))}
    </g>
  );
}

function SprayHeaderAndPinion() {
  return (
    <g>
      {/* nozzle header */}
      <rect x={313.75} y={276} width={135} height={8.5} rx={1.5} {...PAINT.raised} />
      <line x1={313.75} x2={448.75} y1={280.25} y2={280.25} {...PAINT.hair} />
      {NOZZLES.map((x) => (
        <rect key={x} x={x - 4.5} y={273.5} width={9} height={9.5} rx={1.5} fill={MX.deep} stroke={MX.edge} strokeWidth={1.2} />
      ))}
      {/* shaft from the gearbox, pinion between its bearing blocks */}
      <ShaftRun x1={179} x2={578} cy={327} d={14} />
      <rect x={327.5} y={296.5} width={107.5} height={61.25} rx={4} {...PAINT.body} />
      {Array.from({ length: 21 }).map((_, i) => {
        const lx = 332 + i * 4.95;
        return <line key={i} x1={lx} x2={lx} y1={299} y2={355} stroke={MX.fine} strokeWidth={0.8} opacity={0.7} />;
      })}
      <ShaftRun x1={327.5} x2={435} cy={327} d={14} />
      {[266.5, 455.5].map((x) => (
        <g key={x}>
          <rect x={x} y={290.5} width={41.5} height={71} rx={6} {...PAINT.body} />
          <line x1={x + 4} x2={x + 37.5} y1={327} y2={327} {...PAINT.hair} />
        </g>
      ))}
    </g>
  );
}

function SprayUnitAndDivider() {
  return (
    <g>
      {/* spray unit: controller over the lubricant drum */}
      <OilRun pts={[[172.5, 499], [227.5, 499]]} w={3.5} />
      <rect x={50.5} y={404} width={122} height={176} rx={8} {...PAINT.body} />
      <rect x={61} y={417.5} width={101} height={39} rx={3} fill={MX.deep} stroke={MX.edge} strokeWidth={MX.w} />
      <rect x={61} y={469} width={101} height={102} rx={3} {...PAINT.material} />
      <rect x={61} y={469} width={101} height={102} rx={3} fill="none" stroke={MX.edge} strokeWidth={MX.w} />
      {/* six delivery circuits: divider outlet → cross-over → nozzle */}
      <g fill="none" stroke={GOLD} strokeWidth={1.5} strokeLinejoin="round">
        {OUTLETS.map((x, i) => (
          <path key={x} d={`M ${x} ${DIV_TOP} V ${RUNS[i]} H ${NOZZLES[i]} V 283`} />
        ))}
      </g>
      {/* metering divider */}
      <rect x={225.8} y={DIV_TOP} width={170} height={75} rx={6} {...PAINT.body} />
      {OUTLETS.map((x) => (
        <rect key={x} x={x - 8.7} y={466} width={17.4} height={58} rx={3} {...PAINT.cylinderV} />
      ))}
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={30} x2={733} y={GROUND} />
      <ShellAndGirthGear />
      <SprayHeaderAndPinion />
      <SprayUnitAndDivider />

      <MachineLabel x={380.5} y={36} size={8.2}>GIRTH GEAR (FACE WIDTH)</MachineLabel>
      <MachineLabel x={671.5} y={67} size={8.6}>KILN SHELL</MachineLabel>
      <MachineLabel x={213.5} y={317} size={8}>FROM GEARBOX</MachineLabel>
      <MachineLabel x={381} y={374.5} size={8.2}>PINION</MachineLabel>
      <MachineLabel x={310} y={603} size={8.2}>METERING DIVIDER</MachineLabel>
      <MachineLabel x={111} y={601} size={8.2}>SPRAY UNIT / LUBRICANT DRUM</MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units = page units − panel corner): controller display, divider outlets 1–6. */
const pads: LineSheetArt["pads"] = {
  "STS-KLN-05": [111.3, 437],
  "PRX-KLN-01": [244.3, 528.8],
  "PRX-KLN-02": [270, 528.8],
  "PRX-KLN-03": [295.7, 528.8],
  "PRX-KLN-04": [321.4, 528.8],
  "PRX-KLN-05": [347.1, 528.8],
  "PRX-KLN-06": [372.8, 528.8],
};

/**
 * Plate side / stand-off slot per point. The outer circuits (1, 6) run their
 * plates out along the row; circuits 2–5 stand off under the divider in two
 * aligned columns (2, 3 left; 5, 4 right) so no leader crosses another.
 */
const callouts: LineSheetArt["callouts"] = {
  "STS-KLN-05": [121.3, 437, "start"],
  "PRX-KLN-01": [234.3, 528.8, "end"],
  "PRX-KLN-02": [236, 556, "end"],
  "PRX-KLN-03": [236, 579, "end"],
  "PRX-KLN-04": [381, 579, "start"],
  "PRX-KLN-05": [381, 556, "start"],
  "PRX-KLN-06": [382.8, 528.8, "start"],
};

export const sheet: LineSheetArt = { id: "K-5", ready: true, width: W, height: H, Art, pads, callouts };
