/**
 * Sheet K-4 — KLN-01 · Rotary kiln — Gearbox lubrication system.
 *
 * Drawn as the "GEARBOX LUBRICATION SYSTEM" panel of the machine-group images
 * (page 8, panel box 48.5, 821 – 811.5, 1492): oil tank with its low-level
 * switch and sample cock, duty / standby pumps, filter with its differential
 * pressure cell, oil cooler, the supply riser (pressure, flow switch) into the
 * main gearbox and the return to the tank past the oil thermometer.
 */
import React from "react";
import { GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Volute } from "../../drawings/fkp-parts";
import type { LineSheetArt } from "../types";
import { FlowHead, FlowText, GearboxFace, OilRun } from "./parts-k3";

const W = 763;
const H = 671.5;
const GROUND = 620;
const OIL_Y = 546;

function Gearbox() {
  return <GearboxFace box={[428.5, 87, 190, 135.5]} cover={[448, 599, 8]} small={[479.5, 161, 25, 8.5]} big={[546, 143.5, 40.5, 12.5]} screws />;
}

function Tank() {
  return (
    <g>
      <rect x={71} y={560} width={209.5} height={9} rx={2} {...PAINT.raised} />
      <rect x={64} y={404} width={223.5} height={156} rx={6} {...PAINT.body} />
      <rect x={75} y={431.5} width={201.5} height={119} rx={3} {...PAINT.material} />
      <rect x={75} y={431.5} width={201.5} height={119} rx={3} fill="none" stroke={MX.edge} strokeWidth={MX.w} />
      {/* low-level switch on the tank wall */}
      <rect x={287.5} y={456.5} width={10} height={4} rx={1} {...PAINT.shaft} />
      {/* sample cock under the tank */}
      <rect x={82.5} y={569} width={4} height={8} {...PAINT.shaft} />
      {/* oil thermometer pocket on the return line */}
      <rect x={213} y={348.5} width={21} height={3.5} rx={1} {...PAINT.shaft} />
    </g>
  );
}

function PumpsFilterCooler() {
  return (
    <g>
      <rect x={307} y={566.5} width={162.5} height={9.5} rx={2} {...PAINT.raised} />
      {/* tank → duty / standby pumps → filter */}
      <OilRun pts={[[287.5, OIL_Y], [330, OIL_Y]]} />
      <OilRun pts={[[365, OIL_Y], [404, OIL_Y]]} />
      <OilRun pts={[[440, OIL_Y], [496.5, OIL_Y], [496.5, 505]]} />
      <Volute cx={347.5} cy={534} r={21} outH={2} dir={-1} />
      <Volute cx={422} cy={534} r={21} outH={2} dir={-1} />
      {/* filter → differential-pressure cell → cooler */}
      <OilRun pts={[[496, 404], [496, 384], [543, 384], [543, 434]]} />
      <rect x={476} y={404} width={41} height={101} rx={12} {...PAINT.cylinderV} />
      <line x1={518} x2={530.5} y1={418} y2={418} {...PAINT.detail} />
      <line x1={518} x2={530.5} y1={491.5} y2={491.5} {...PAINT.detail} />
      <rect x={528.5} y={434} width={23.5} height={43.5} rx={3} {...PAINT.raised} />
      <rect x={550} y={404} width={122} height={75} rx={5} {...PAINT.body} />
      {Array.from({ length: 12 }).map((_, i) => {
        const lx = 563 + i * 8.9;
        return <line key={i} x1={lx} x2={lx} y1={410} y2={473} stroke={MX.fine} strokeWidth={0.9} />;
      })}
    </g>
  );
}

function Lines() {
  return (
    <g>
      {/* supply: cooler → riser → gearbox */}
      <OilRun pts={[[672, 437.5], [692, 437.5], [692, 155], [644, 155]]} />
      <FlowHead x={613} y={155} dir="left" len={32.5} half={16.25} />
      {/* return: gearbox → tank */}
      <OilRun pts={[[483, 222.5], [483, 309], [213, 309], [213, 377]]} />
      <FlowHead x={213} y={407.5} dir="down" len={32.5} half={16.25} />
      <FlowText x={686.5} y={128} size={8}>SUPPLY</FlowText>
      <FlowText x={347.5} y={303.5} size={8}>RETURN</FlowText>
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={30} x2={733} y={GROUND} />
      <Lines />
      <Gearbox />
      <Tank />
      <PumpsFilterCooler />

      <MachineLabel x={523} y={249.5} size={8.6}>MAIN GEARBOX</MachineLabel>
      <MachineLabel x={175} y={421.5} size={8.6}>OIL TANK</MachineLabel>
      <MachineLabel x={490} y={398} anchor="end" size={8}>FILTER</MachineLabel>
      <MachineLabel x={610.5} y={492.5} size={8.6}>OIL COOLER</MachineLabel>
      <MachineLabel x={384.5} y={593.5} size={8.2}>DUTY / STANDBY PUMPS</MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units = page units − panel corner), at the panel's pads. */
const pads: LineSheetArt["pads"] = {
  "TMP-KLN-15": [212.7, 350.2],
  "LEV-KLN-01": [305.5, 458.5],
  "LAB-KLN-01": [84.5, 586.5],
  "PRS-KLN-05": [540, 455.8],
  "PRS-KLN-04": [692, 309.8],
  "FLO-KLN-05": [692, 229],
};

/** Plate side per point, as the panel's label chips (filter ΔP runs along the cooler). */
const callouts: LineSheetArt["callouts"] = {
  "TMP-KLN-15": [202.7, 350.2, "end"],
  "LEV-KLN-01": [315.5, 458.5, "start"],
  "LAB-KLN-01": [94.5, 586.5, "start"],
  "PRS-KLN-05": [550, 455.8, "start"],
  "PRS-KLN-04": [682, 309.8, "end"],
  "FLO-KLN-05": [682, 229, "end"],
};

export const sheet: LineSheetArt = { id: "K-4", ready: true, width: W, height: H, Art, pads, callouts };
