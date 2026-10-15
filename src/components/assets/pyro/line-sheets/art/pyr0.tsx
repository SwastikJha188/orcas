/**
 * Sheet PYR-0 — PYRO LINE · Cement plant — Feed silo to clinker silo.
 * Composed as PDF page 1, left to right on one ground line: FSL-01 feed silo,
 * KFS-01 kiln feed bin and bucket elevator, PHC-01 six-stage preheater tower
 * with the ID fan, KLN-01 rotary kiln (inlet chamber, tyres, girth-gear drive,
 * hot-gas flow, flame), the hood with the BRN-01 main burner, CLR-01 grate
 * cooler, HMR-01 crusher and CSL-01 pan conveyor and clinker silo. No pads;
 * the viewer prints each machine's code and name under its link rectangle.
 */
import React from "react";
import { Bolt, GearWheel, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { FanSet, RootsBlower, Silo } from "../../drawings/clk-parts";
import { AirSlide, Cyclone, MealPipe, Pipe, Steel, type CycloneGeom } from "../../drawings/fkp-parts";
import { GearEdge, RollerEnd, Shell, TyreBand } from "../../sheets/sb-parts";
import { Lumps } from "../../sheets/sc-parts";
import type { LineSheetArt } from "../types";
import { Column, DriveMotor, Flow, PanConveyor } from "./parts-h";

const W = 1144.5;
const H = 479;
const GROUND = 450.5;

type Pt = [number, number];

/* ---------------- preheater ---------------- */
const TOWER = { x1: 303.4, x2: 432, top: 26 };
const CYC: Array<CycloneGeom & { name: string }> = [
  { name: "C1", cx: 391, top: 46, w: 38, cyl: 23, cone: 21.5, inlet: -1 },
  { name: "C2", cx: 338, top: 94, w: 40, cyl: 23, cone: 21.5, inlet: 1 },
  { name: "C3", cx: 391, top: 142, w: 40, cyl: 23, cone: 21.5, inlet: -1 },
  { name: "C4", cx: 338, top: 190, w: 40, cyl: 23, cone: 21.5, inlet: 1 },
  { name: "C5", cx: 391, top: 238, w: 40, cyl: 23, cone: 21.5, inlet: -1 },
  { name: "C6", cx: 338, top: 286, w: 40, cyl: 23, cone: 21.5, inlet: 1 },
];
/** Gas duct from each lower cyclone's vortex finder up to the next stage's inlet. */
const GAS: Pt[][] = [
  [[338, 91], [338, 70], [364, 70], [364, 60]],
  [[391, 139], [391, 126], [366, 126], [366, 109]],
  [[338, 187], [338, 166], [364, 166], [364, 157]],
  [[391, 235], [391, 222], [366, 222], [366, 205]],
  [[338, 283], [338, 262], [364, 262], [364, 253]],
];
/** Meal from each cyclone outlet down into the gas duct of the stage below. */
const MEAL: Pt[][] = [
  [[391, 100], [391, 124]],
  [[338, 148], [338, 164]],
  [[391, 196], [391, 220]],
  [[338, 244], [338, 260]],
  [[391, 292], [391, 293]],
  [[338, 340], [338, 352], [421, 352]],
];
const FAN = { cx: 518, cy: 139, r: 26, motorW: 48, motorH: 30, ductTop: 104, baseY: 167 };

/* ---------------- kiln ---------------- */
const K = { x: 452, y: 352, w: 344, h: 37 };
const TYRES = [500, 640, 725];
const GIRTH = 570;

function FeedSilo() {
  return (
    <g aria-hidden="true">
      <Silo x={23} w={98} roofY={113} cylBottom={236} coneBottom={286} outletW={16} legBottom={GROUND} braceFrom={300} ladder={false} />
      <rect x={43} y={140} width={58} height={64} rx={5} {...PAINT.recess} />
      <path d="M 46 170 Q 60 162 72 164 T 98 169 V 201 H 46 Z" fill={MX.material} opacity={0.85} />
      {/* rotary feeder and air slide to the kiln feed bin */}
      <rect x={64} y={296} width={16} height={9} rx={2} {...PAINT.raised} />
      <AirSlide x1={76} y1={305} x2={152} y2={312} d={7} />
    </g>
  );
}

function KilnFeed() {
  const buckets: number[] = [];
  for (let y = 96; y < 404; y += 11) buckets.push(y);
  return (
    <g aria-hidden="true">
      <Silo x={142} w={56} roofY={310} cylBottom={333} coneBottom={355} outletW={10} legBottom={GROUND} braceFrom={380} rail={false} ladder={false} />
      <AirSlide x1={168} y1={367} x2={214} y2={419} d={6} />
      {/* bucket elevator: boot, casing, head with drive */}
      <rect x={212} y={413} width={33} height={37} rx={4} {...PAINT.body} />
      <circle cx={228.5} cy={432} r={8} {...PAINT.raised} />
      <circle cx={228.5} cy={432} r={3} {...PAINT.shaft} />
      <rect x={219} y={86} width={19} height={328} rx={2} {...PAINT.body} />
      <rect x={222.5} y={92} width={12} height={318} rx={1.5} {...PAINT.recess} />
      {buckets.map((y) => (
        <rect key={y} x={224.5} y={y} width={4} height={4} rx={1} fill={MX.material} />
      ))}
      <line x1={231.5} x2={231.5} y1={94} y2={408} stroke={MX.fine} strokeWidth={0.8} strokeDasharray="3 3" />
      {[150, 250, 350].map((y) => (
        <rect key={y} x={217} y={y} width={23} height={4} rx={1} {...PAINT.raised} />
      ))}
      <rect x={210} y={66} width={37} height={23} rx={8} {...PAINT.body} />
      <circle cx={228.5} cy={77.5} r={7} {...PAINT.raised} />
      <circle cx={228.5} cy={77.5} r={2.6} {...PAINT.shaft} />
      <DriveMotor x={216} y={52} w={22} h={11} footY={66} plate={false} />
      <AirSlide x1={247} y1={78} x2={334} y2={78} d={7} />
    </g>
  );
}

function Preheater() {
  return (
    <g aria-hidden="true">
      {/* tower steel and platforms */}
      {[TOWER.x1, TOWER.x2].map((x) => (
        <Column key={x} x={x} y1={TOWER.top} y2={GROUND} w={6} />
      ))}
      <Steel x={TOWER.x1 - 3} y={TOWER.top - 2} w={TOWER.x2 - TOWER.x1 + 6} h={4} />
      {[87.6, 135.7, 183, 232, 279, 327.5].map((y) => (
        <Steel key={y} x={TOWER.x1 + 3} y={y - 1.5} w={TOWER.x2 - TOWER.x1 - 6} h={3} />
      ))}
      {/* riser from the kiln inlet chamber to C6 */}
      <Pipe pts={[[446, 331], [446, 296], [370, 296]]} d={10} />
      {GAS.map((pts, i) => (
        <Pipe key={i} pts={pts} d={8} />
      ))}
      {/* ID fan on its bracket off the tower */}
      <rect x={TOWER.x2} y={FAN.baseY + 7} width={60} height={5} rx={1.5} {...PAINT.body} />
      <line x1={TOWER.x2 + 3} y1={232} x2={488} y2={FAN.baseY + 12} stroke={MX.fine} strokeWidth={2.4} />
      <Pipe pts={[[391, 44], [391, 30], [500, 30], [500, FAN.ductTop]]} d={10} flanges={[[450, 30]]} />
      <FanSet {...FAN} />
      <Pipe pts={[[531, 114], [531, 23], [647, 23]]} d={10} flanges={[[600, 23]]} />
      {CYC.map((c) => (
        <Cyclone key={c.name} c={c} />
      ))}
      {MEAL.map((pts, i) => (
        <MealPipe key={i} pts={pts} d={5} />
      ))}
      {CYC.map((c) => (
        <MachineLabel key={c.name} x={c.cx} y={c.top + 11.5} size={11.2} tone="ink">
          {c.name}
        </MachineLabel>
      ))}
    </g>
  );
}

function Kiln() {
  return (
    <g aria-hidden="true">
      {/* inlet chamber */}
      <rect x={421} y={331} width={37} height={110} rx={5} {...PAINT.body} />
      <rect x={425} y={335} width={29} height={102} rx={3} {...PAINT.hair} />
      <rect x={417} y={441} width={45} height={9} rx={2} {...PAINT.raised} />
      {/* support stations: roller, bearings, pier */}
      {TYRES.map((tx) => (
        <g key={tx}>
          <path d={`M ${tx - 12} 418 H ${tx + 12} L ${tx + 16} ${GROUND} H ${tx - 16} Z`} {...PAINT.body} />
          <rect x={tx - 17} y={413} width={34} height={8} rx={2} {...PAINT.raised} />
          <Bolt x={tx - 12} y={GROUND - 5} r={1.4} />
          <Bolt x={tx + 12} y={GROUND - 5} r={1.4} />
          <RollerEnd cx={tx} cy={409} r={10.5} />
        </g>
      ))}
      {/* girth-gear drive: pinion, reducer, motor */}
      <rect x={544} y={440} width={80} height={10} rx={2} {...PAINT.body} />
      <rect x={548} y={414} width={32} height={26} rx={4} {...PAINT.body} />
      <line x1={549} x2={579} y1={426} y2={426} stroke={MX.edge} strokeWidth={1} />
      <GearWheel cx={GIRTH} cy={413} r={6} teeth={9} hub={2.4} />
      <DriveMotor x={586} y={419} w={32} h={17} footY={440} flip plate={false} />
      {/* shell, tyres, girth gear */}
      <Shell x={K.x} y={K.y} w={K.w} h={K.h} seam={42} />
      <rect x={452} y={349} width={8} height={43} rx={2} {...PAINT.raised} />
      {TYRES.map((tx) => (
        <TyreBand key={tx} cx={tx} y={344} w={12} h={53} />
      ))}
      <GearEdge x={GIRTH - 6} y={331} w={12} h={78} n={13} />
      {/* outlet cut-away with the flame */}
      <rect x={744} y={358} width={48} height={25} rx={3} {...PAINT.recess} />
      <ellipse cx={772} cy={369} rx={24} ry={8} fill={MX.heat} />
      <ellipse cx={782} cy={369} rx={10} ry={3.6} fill={MX.material} opacity={0.9} />
      <path d="M 746 381 Q 768 376 790 380 V 382 H 746 Z" fill={MX.material} opacity={0.8} />
      <Flow x1={439.5} y1={428} x2={439.5} y2={338} />
      <MachineLabel x={416} y={389} anchor="end" size={7.5}>HOT GAS</MachineLabel>
      <MachineLabel x={752} y={342} anchor="start" size={6.8}>FLAME</MachineLabel>
    </g>
  );
}

function HoodBurner() {
  return (
    <g aria-hidden="true">
      {/* burner platform and its columns */}
      <Column x={848} y1={292} y2={404} w={5} />
      <Column x={951} y1={292} y2={404} w={5} />
      <rect x={844} y={288} width={112} height={5} rx={1.5} {...PAINT.raised} />
      {/* coal dosing bin with rotary feeder */}
      <Silo x={860} w={40} roofY={214} cylBottom={250} coneBottom={268} outletW={8} legBottom={288} rail={false} ladder={false} />
      <rect x={873} y={276} width={14} height={9} rx={2} {...PAINT.raised} />
      {/* primary-air blower */}
      <RootsBlower x={910} y={256} w={30} h={30} />
      <DriveMotor x={914} y={236} w={22} h={12} footY={256} plate={false} />
      {/* coal line and primary-air duct down to the lance trolley */}
      <Pipe pts={[[873, 280], [856, 280], [856, 366], [874, 366]]} d={5} />
      <Pipe pts={[[940, 280], [946, 280], [946, 371], [922, 371]]} d={6} />
      {/* lance trolley on its rail */}
      <rect x={862} y={381} width={86} height={4} rx={1} {...PAINT.body} />
      <rect x={870} y={360} width={52} height={19} rx={4} {...PAINT.body} />
      <rect x={876} y={364} width={20} height={9} rx={1.5} {...PAINT.recess} />
      <circle cx={880} cy={380} r={2.4} {...PAINT.shaft} />
      <circle cx={912} cy={380} r={2.4} {...PAINT.shaft} />
      <rect x={826} y={367} width={46} height={6} rx={1.5} {...PAINT.shaft} />
      {/* hood */}
      <rect x={796} y={308} width={42} height={98} rx={6} {...PAINT.body} />
      <rect x={801} y={313} width={32} height={88} rx={4} {...PAINT.hair} />
      <rect x={788} y={349} width={10} height={43} rx={2} {...PAINT.raised} />
      <MachineLabel x={817} y={302} size={7.5}>HOOD</MachineLabel>
      <Flow x1={862} y1={403} x2={862} y2={385} />
      <MachineLabel x={871} y={393.5} anchor="start" size={6.8}>SECONDARY AIR</MachineLabel>
    </g>
  );
}

function CoolerCrusher() {
  return (
    <g aria-hidden="true">
      {/* grate cooler casing with the clinker bed */}
      <rect x={814} y={404} width={154} height={42} rx={7} {...PAINT.body} />
      <rect x={820} y={410} width={142} height={26} rx={4} {...PAINT.recess} />
      <path d="M 822 422 Q 860 425 900 429 T 960 431 V 434 H 822 Z" fill={MX.material} opacity={0.85} />
      {Array.from({ length: 12 }).map((_, i) => (
        <rect key={i} x={822 + i * 11.6} y={436} width={10} height={4} rx={1} {...PAINT.raised} />
      ))}
      {[820, 900, 960].map((fx) => (
        <rect key={fx} x={fx - 4} y={446} width={8} height={GROUND - 446} rx={1} {...PAINT.body} />
      ))}
      {/* hammer crusher */}
      <rect x={966} y={414} width={12} height={7} rx={1.5} {...PAINT.body} />
      <rect x={976} y={414} width={32} height={33} rx={5} {...PAINT.body} />
      <circle cx={992} cy={431} r={11} {...PAINT.recess} />
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <rect key={a} x={990.5} y={421.5} width={3} height={6} rx={0.8} {...PAINT.shaft} transform={`rotate(${a} 992 431)`} />
      ))}
      <circle cx={992} cy={431} r={3.4} {...PAINT.shaft} />
      <rect x={973} y={446} width={38} height={4.5} rx={1} {...PAINT.raised} />
    </g>
  );
}

function ClinkerSilo() {
  return (
    <g aria-hidden="true">
      <Silo x={1064} w={62} roofY={262} cylBottom={352} coneBottom={388} outletW={10} legBottom={GROUND} braceFrom={410} fill={300} />
      {/* roof baghouse and dust fan */}
      <rect x={1082} y={236} width={28} height={22} rx={3} {...PAINT.body} />
      <line x1={1084} x2={1108} y1={246} y2={246} stroke={MX.fine} strokeWidth={0.8} strokeDasharray="3 2" />
      <rect x={1088} y={229} width={8} height={7} rx={1.5} {...PAINT.raised} />
      {/* pan conveyor from the crusher to the silo roof */}
      <PanConveyor x1={1018} y1={442} x2={1070} y2={262} d={9} sprocket={4.5} />
      <Lumps pts={[[1010, 444]]} r={2} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={14} x2={1132} y={GROUND} />
      <FeedSilo />
      <KilnFeed />
      <Preheater />
      <Kiln />
      <HoodBurner />
      <CoolerCrusher />
      <ClinkerSilo />
      <Flow x1={651} y1={23} x2={675.5} y2={23} />
      <MachineLabel x={679.5} y={24.5} anchor="start" size={7.5}>TO GCT / RAW MILL / STACK</MachineLabel>
      <MachineLabel x={569.3} y={113} size={7.5}>ID FAN</MachineLabel>
    </g>
  );
}

/** No pads on the line sheet. */
const pads: LineSheetArt["pads"] = {};

/** Clickable machine regions; the viewer prints code · points and the name under each. */
const links: NonNullable<LineSheetArt["links"]> = {
  // Feed system: feed silo (FSL-01) + kiln feed bin and elevator (KFS-01), one machine.
  "PYR-FED-01": [18, 48, 232, 402],
  "PYR-PHC-01": [296, 14, 142, 436],
  "PYR-KLN-01": [446, 318, 350, 132],
  "PYR-BRN-01": [850, 196, 104, 96],
  "PYR-CLR-01": [812, 402, 158, 48],
  // Crusher and clinker transport: hammer crusher (HMR-01) + pan conveyor and silo (CSL-01), one machine.
  "PYR-CCT-01": [972, 226, 168, 224],
};

export const sheet: LineSheetArt = { id: "PYR-0", ready: true, width: W, height: H, Art, pads, links };
