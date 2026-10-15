/**
 * Sheet F-1 — FSL-01 · Feed silo — Silo and extraction gate.
 *
 * Composition of PDF page 3: the raw-meal feed silo on four steel legs (two
 * seen) with V-bracing, conical roof with handrail, radar level transmitter,
 * bin-vent filter and relief valve; shell cut-away showing the meal bed; caged
 * ladder on the left; aeration air header from sheet F-2 into the cone's
 * aeration ring and pads; extraction slide gate with actuator and limit-switch
 * cap; air slide out to the kiln feed bin (F-3).
 */
import React from "react";
import { Bolt, CornerBolts, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { AirSlide, Ladder, Pipe } from "../../drawings/fkp-parts";
import type { LineSheetArt } from "../types";
import { Arrow, BoltRow, Bracing, ButterflyValve, ConeRoof, InChevrons, Leg, RadarLevel, SlideGate, Vessel } from "./parts-f";

const W = 824;
const H = 704;

const GROUND = 660;
const SX0 = 218;
const SX1 = 578;
const SCX = 398;
const TOP = 188;
const RING = 424;
const CONE_BOT = 570;
const OUT_W = 44;
const AIR_Y = 525;
/** Left cone edge at height y. */
const coneL = (y: number) => SX0 + 4 + ((SCX - OUT_W / 2 - SX0 - 4) * (y - RING - 9)) / (CONE_BOT - RING - 9);

function Structure() {
  return (
    <g>
      {/* caged access ladder up to the roof landing */}
      <Ladder x={188} y1={143} y2={GROUND} w={12} cageFrom={420} side={-1} />
      <rect x={184} y={168} width={40} height={4} rx={1} {...PAINT.raised} />
      <line x1={184} x2={184} y1={168} y2={150} stroke={MX.edge} strokeWidth={1.1} />
      <line x1={184} x2={204} y1={150} y2={150} stroke={MX.edge} strokeWidth={1.3} />
      {/* legs and bracing behind the cone */}
      <Leg x={240} y1={430} y2={GROUND} w={8} />
      <Leg x={549} y1={430} y2={GROUND} w={8} />
      <Bracing
        lines={[
          [248, 557, SCX, 652],
          [549, 557, SCX, 652],
          [248, 470, 549, 470],
        ]}
      />
      {[248, 549].map((x) => (
        <path key={x} d={x < SCX ? `M ${x} 434 h 10 L ${x} 452 Z` : `M ${x} 434 h -10 L ${x} 452 Z`} {...PAINT.raised} />
      ))}
    </g>
  );
}

function Silo() {
  return (
    <g>
      {/* roof equipment behind the handrail line: bin-vent filter, relief valve */}
      <rect x={268} y={138} width={34} height={36} rx={4} {...PAINT.body} />
      {[146, 154, 162].map((y) => (
        <line key={y} x1={272} x2={298} y1={y} y2={y} {...PAINT.hair} />
      ))}
      <rect x={264} y={133} width={42} height={6} rx={2} {...PAINT.raised} />
      <rect x={276} y={124} width={18} height={10} rx={3} {...PAINT.raised} />
      <rect x={512} y={160} width={14} height={14} rx={3} {...PAINT.body} />
      <rect x={509} y={156} width={20} height={5} rx={2} {...PAINT.raised} />

      <ConeRoof x0={SX0} x1={SX1} y={TOP} peak={156} rail={20} step={24} />
      <RadarLevel x={SCX} roof={157} headY={121} />

      <Vessel x0={SX0} x1={SX1} top={TOP} ring={RING} coneBot={CONE_BOT} outW={OUT_W} seams={[236, 284, 332, 380]} win={[272, 241, 252, 119]} level={290} flangeH={10} bolts={20} />

      {/* shell manway, lower right */}
      <rect x={532} y={382} width={30} height={32} rx={5} {...PAINT.raised} />
      <rect x={537} y={387} width={20} height={22} rx={3} fill="none" stroke={MX.fine} strokeWidth={1} />
      <CornerBolts x={532} y={382} w={30} h={32} inset={3.5} r={1.1} />
      <rect x={526} y={392} width={6} height={12} rx={1.5} {...PAINT.shaft} />

      {/* aeration ring main and fluidising pads on the cone */}
      <rect x={coneL(AIR_Y) - 2} y={AIR_Y - 5} width={2 * (SCX - coneL(AIR_Y)) + 4} height={10} rx={4} {...PAINT.cylinder} />
      {[0.25, 0.5, 0.75].map((f) => {
        const x = coneL(AIR_Y) + f * 2 * (SCX - coneL(AIR_Y));
        return (
          <g key={f}>
            <rect x={x - 1.5} y={AIR_Y + 5} width={3} height={12} {...PAINT.shaft} />
            <rect x={x - 8} y={AIR_Y + 16} width={16} height={6} rx={2} {...PAINT.raised} />
          </g>
        );
      })}
      {[478, 500].map((y) => {
        const half = SCX - coneL(y) - 14;
        return (
          <g key={y}>
            {[-1, 1].map((s) => (
              <rect key={s} x={SCX + s * half * 0.6 - 7} y={y - 2.5} width={14} height={5} rx={2} {...PAINT.recess} />
            ))}
          </g>
        );
      })}

      <MachineLabel x={397} y={325} size={13.5} tone="ink">
        RAW-MEAL FEED SILO
      </MachineLabel>
    </g>
  );
}

function AerationAir() {
  return (
    <g>
      <Pipe pts={[[40, AIR_Y], [coneL(AIR_Y) + 2, AIR_Y]]} d={15} elbows={false} flanges={[[120, AIR_Y], [coneL(AIR_Y) - 6, AIR_Y]]} />
      <ButterflyValve x={262} y={AIR_Y} d={15} />
      {[120, coneL(AIR_Y) - 6].map((x) => (
        <g key={x}>
          <Bolt x={x} y={AIR_Y - 9} r={0.9} />
          <Bolt x={x} y={AIR_Y + 9} r={0.9} />
        </g>
      ))}
      <InChevrons x={22} y={AIR_Y} />
      <MachineLabel x={18} y={501.3} anchor="start" size={9.8}>
        AERATION AIR (SHEET F-2)
      </MachineLabel>
    </g>
  );
}

function GateAndSlide() {
  return (
    <g>
      {/* gate outlet spout into the air slide */}
      <rect x={385} y={616} width={26} height={12} rx={2} {...PAINT.body} />
      <AirSlide x1={378} y1={632} x2={784} y2={646} d={17} />
      <rect x={781} y={634} width={6} height={22} rx={1.5} transform="rotate(2 784 646)" {...PAINT.raised} />
      {/* slide supports and air-box connection */}
      {[612, 732].map((x) => (
        <g key={x}>
          <rect x={x - 3} y={648} width={6} height={GROUND - 648} {...PAINT.body} />
          <rect x={x - 7} y={GROUND - 3} width={14} height={3} rx={1} {...PAINT.raised} />
        </g>
      ))}
      <SlideGate body={[359, 571, 78, 47]} act={[440, 578, 55, 34]} cap={[477.5, 595]} capR={10} />
      <BoltRow x1={364} x2={432} y={573.5} n={7} r={1} />
      <Arrow x1={750} y1={600} x2={797} y2={600} />
      <MachineLabel x={596.5} y={583.8} anchor="start" size={9.8}>
        TO KILN FEED BIN (F-3)
      </MachineLabel>
      <MachineLabel x={615.5} y={606.3} anchor="start" size={9.8}>
        AIR SLIDE
      </MachineLabel>
      <MachineLabel x={339.5} y={682.8} anchor="start" size={9.8}>
        EXTRACTION GATE
      </MachineLabel>
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={22} x2={804} y={GROUND} />
      <Structure />
      <Silo />
      <AerationAir />
      <GateAndSlide />
      <MachineLabel x={173} y={134} anchor="start" size={8.2}>
        LADDER
      </MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 3. */
const pads: LineSheetArt["pads"] = {
  "LEV-FSL-01": [398, 120.5],
  "STS-FSL-01": [477.5, 595],
};

/** Tag chip centre per point, as on PDF page 3. */
const chips: NonNullable<LineSheetArt["chips"]> = {
  "LEV-FSL-01": [468.5, 90.5],
  "STS-FSL-01": [555.5, 558],
};

export const sheet: LineSheetArt = { id: "F-1", ready: true, width: W, height: H, Art, pads, chips };
