/**
 * Sheet F-3 — KFS-01 · Kiln feed — Feed bin and dosing.
 *
 * Composition of PDF page 5: the inlet air slide from the feed silo (F-1)
 * through a flexible bellows into the flat-roofed kiln feed bin (weigh bin);
 * radar on the roof, high-level fork switch on the shell, low-level switch on
 * the cone; bin cut-away with the meal bed; the bin on two legs (of four)
 * standing on compression load cells; dosing gate with positioner; bellows
 * into the outlet air slide to the solid-flow meter (F-4), its air-box
 * pressure tap, support post and blower-air connection.
 */
import React from "react";
import { Bolt, GroundLine, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { AirSlide, Pipe } from "../../drawings/fkp-parts";
import type { LineSheetArt } from "../types";
import { Arrow, BoltRow, Bracing, RadarLevel, SlideGate, Vessel } from "./parts-f";

const W = 824;
const H = 704;

const GROUND = 660;
const BX0 = 248;
const BX1 = 549;
const TOP = 169;
const RING = 348;
const CONE_BOT = 481;
/** Outlet slide centre line. */
const S1: [number, number] = [372, 533];
const S2: [number, number] = [788, 588];
const slideY = (x: number) => S1[1] + ((S2[1] - S1[1]) * (x - S1[0])) / (S2[0] - S1[0]);

/** Flexible bellows (rubber compensator) between two flanges. */
function Bellows({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const n = Math.max(3, Math.round(h / 4));
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={2} {...PAINT.body} />
      {Array.from({ length: n - 1 }).map((_, i) => (
        <line key={i} x1={x + 1.5} x2={x + w - 1.5} y1={y + ((i + 1) * h) / n} y2={y + ((i + 1) * h) / n} {...PAINT.hair} />
      ))}
    </g>
  );
}

/** Point level switch: wall nozzle, stem and head housing centred at (hx, y). */
function LevelSwitch({ wallX, hx, y }: { wallX: number; hx: number; y: number }) {
  return (
    <g aria-hidden="true">
      <rect x={wallX - 2} y={y - 6} width={5} height={12} rx={1} {...PAINT.raised} />
      <rect x={wallX + 2} y={y - 2.5} width={hx - wallX - 6} height={5} {...PAINT.shaft} />
      <rect x={hx - 10} y={y - 10} width={20} height={20} rx={5} {...PAINT.body} />
      <line x1={hx - 7} x2={hx + 7} y1={y + 5} y2={y + 5} {...PAINT.hair} />
    </g>
  );
}

/** Compression load cell under a leg: top plate at y, cell, base and anchor plate to the ground. */
function LoadCellStack({ x, y }: { x: number; y: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x - 12} y={y} width={24} height={5} rx={1.2} {...PAINT.raised} />
      <rect x={x - 8} y={y + 5} width={16} height={15} rx={3} {...PAINT.body} />
      <rect x={x - 5} y={y + 8} width={10} height={9} rx={1.5} {...PAINT.recess} />
      <rect x={x - 13} y={y + 20} width={26} height={5} rx={1.2} {...PAINT.raised} />
      <rect x={x - 16} y={y + 25} width={32} height={GROUND - y - 25} rx={1} {...PAINT.body} />
      <Bolt x={x - 10} y={y + 22.5} r={1} />
      <Bolt x={x + 10} y={y + 22.5} r={1} />
    </g>
  );
}

function Bin() {
  const legs = [266, 523];
  return (
    <g>
      {/* weigh frame: legs, ties, bracing, load cells */}
      {legs.map((x) => (
        <g key={x}>
          <rect x={x} y={RING + 6} width={8} height={630 - RING - 6} rx={1.2} {...PAINT.body} />
          <line x1={x + 4} x2={x + 4} y1={RING + 10} y2={624} {...PAINT.hair} />
          <LoadCellStack x={x + 4} y={630} />
        </g>
      ))}
      <Bracing
        lines={[
          [274, 470, 523, 470],
          [274, 578, 523, 624],
          [274, 624, 523, 578],
        ]}
      />
      {legs.map((x) => (
        <path key={`g${x}`} d={x < 398 ? `M ${x + 8} 358 h 12 L ${x + 8} 376 Z` : `M ${x} 358 h -12 L ${x} 376 Z`} {...PAINT.raised} />
      ))}

      <Vessel x0={BX0} x1={BX1} top={TOP} ring={RING} coneBot={CONE_BOT} outW={50} seams={[203, 241, 278, 316]} win={[293, 207, 210, 93]} level={249} flangeH={10} bolts={16} />

      {/* flat roof with bolted rim, inspection hatch, vent nozzle */}
      <rect x={BX0 - 6} y={TOP - 10} width={BX1 - BX0 + 12} height={10} rx={2.5} {...PAINT.raised} />
      <BoltRow x1={BX0} x2={BX1} y={TOP - 5} n={16} r={1.1} />
      <rect x={320} y={146} width={34} height={13} rx={3} {...PAINT.body} />
      <rect x={316} y={143} width={42} height={5} rx={1.5} {...PAINT.raised} />
      <rect x={494} y={136} width={18} height={23} rx={2} {...PAINT.cylinderV} />
      <rect x={490} y={132} width={26} height={5} rx={1.5} {...PAINT.raised} />
      <RadarLevel x={398} roof={159} headY={125} />

      {/* level switches */}
      <LevelSwitch wallX={BX1} hx={570.5} y={200.5} />
      <LevelSwitch wallX={459} hx={474.5} y={444.5} />

      <MachineLabel x={397} y={272.1} size={12} tone="ink">
        KILN FEED BIN
      </MachineLabel>
    </g>
  );
}

function Inlet() {
  return (
    <g>
      <AirSlide x1={46} y1={121} x2={252} y2={148} d={15} />
      <rect x={44} y={112} width={5} height={18} rx={1.2} transform="rotate(7.5 46 121)" {...PAINT.raised} />
      <path d="M 244 138 L 266 141 L 266 147 L 244 147 Z" {...PAINT.body} />
      <Bellows x={252} y={147} w={16} h={12} />
      <MachineLabel x={53} y={96.3} anchor="start" size={9.8}>
        FROM FEED SILO (F-1)
      </MachineLabel>
    </g>
  );
}

function Dosing() {
  const tapX = 615.5;
  const postX = 661;
  const airX = 705;
  return (
    <g>
      <SlideGate body={[367, 482, 63, 34]} act={[432, 486, 44, 26]} cap={[454, 499]} capR={9} />
      <Bellows x={385} y={516} w={26} h={12} />
      <AirSlide x1={S1[0]} y1={S1[1]} x2={S2[0]} y2={S2[1]} d={18} />
      <rect x={S2[0] - 3} y={S2[1] - 12} width={6} height={24} rx={1.5} transform={`rotate(7.5 ${S2[0]} ${S2[1]})`} {...PAINT.raised} />
      {/* support post */}
      <rect x={postX - 5} y={slideY(postX) + 6} width={10} height={GROUND - slideY(postX) - 6} rx={1.5} {...PAINT.body} />
      <rect x={postX - 10} y={GROUND - 4} width={20} height={4} rx={1} {...PAINT.raised} />
      <rect x={postX - 9} y={slideY(postX) + 5} width={18} height={5} rx={1.5} {...PAINT.raised} />
      {/* aeration-chamber pressure tap below the cloth: root valve, stem, transmitter head */}
      <rect x={tapX - 2.5} y={slideY(tapX) + 6} width={5} height={586 - slideY(tapX) - 6} {...PAINT.shaft} />
      <rect x={tapX - 6} y={577} width={12} height={5} rx={1.5} {...PAINT.raised} />
      <rect x={tapX - 11} y={585} width={22} height={22} rx={6} {...PAINT.body} />
      <circle cx={tapX} cy={596} r={7.5} {...PAINT.recess} />
      {/* air-slide blower air into the air box */}
      <Pipe pts={[[airX, slideY(airX) + 6], [airX, GROUND]]} d={11} elbows={false} flanges={[[airX, 612]]} />
      <rect x={airX - 9} y={slideY(airX) + 3} width={18} height={6} rx={1.5} {...PAINT.raised} />
      <Arrow x1={airX + 16} y1={652} x2={airX + 16} y2={618} head={6} />
      <Arrow x1={750} y1={518} x2={805} y2={518} />
      <MachineLabel x={362} y={501.3} anchor="end" size={9.8}>
        DOSING GATE
      </MachineLabel>
      <MachineLabel x={614} y={499.8} anchor="start" size={9.8}>
        TO SOLID-FLOW METER (F-4)
      </MachineLabel>
      <MachineLabel x={594.5} y={523.7} anchor="start" size={9}>
        AIR SLIDE
      </MachineLabel>
      <MachineLabel x={593.5} y={678.2} anchor="start" size={9}>
        AIR-SLIDE BLOWER AIR
      </MachineLabel>
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={22} x2={804} y={GROUND} />
      <Inlet />
      <Bin />
      <Dosing />
      <MachineLabel x={397} y={682.7} size={9}>
        LOAD CELLS UNDER THE BIN SUPPORTS
      </MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 5. */
const pads: LineSheetArt["pads"] = {
  "LEV-KFS-01": [398, 125],
  "LEV-KFS-02": [570.5, 200.5],
  "LEV-KFS-03": [474.5, 444.5],
  "WGT-KFS-01": [269.5, 638],
  "POS-KFS-01": [454, 499],
  "PRS-KFS-01": [615.5, 596],
};

/** Tag chip centre per point, as on PDF page 5. */
const chips: NonNullable<LineSheetArt["chips"]> = {
  "LEV-KFS-01": [468.5, 98],
  "LEV-KFS-02": [633.5, 180],
  "LEV-KFS-03": [545, 459.5],
  "WGT-KFS-01": [206, 608],
  "POS-KFS-01": [532.5, 526.5],
  "PRS-KFS-01": [578, 628],
};

export const sheet: LineSheetArt = { id: "F-3", ready: true, width: W, height: H, Art, pads, chips };
