/**
 * Sheet K-0 — KLN-01 · Rotary kiln — Overview.
 *
 * Composition of PDF page 13. Top: the kiln in elevation — riser and inlet
 * chamber with the gas analyser, inlet seal, shell on three tyres and roller
 * stations, girth gear with pinion, main gearbox and main motor, hydraulic
 * thrust roller with its LVDT and power unit, the stand-off shell scanner,
 * the burning zone, cow shell with the outlet cooling fan, outlet seal, kiln
 * hood with the burner and the roof pyrometer. Bottom: inset panels for the
 * three roller stations in plan, the gearbox lube skid, the auxiliary drive
 * and the girth-gear spray lubrication unit.
 */
import React from "react";
import { Bolt, CornerBolts, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Volute } from "../../drawings/fkp-parts";
import { EncoderCap } from "../../sheets/sa-parts";
import { GearEdge, Link, OilLine, Pillow, Refractory, Shell, SideMotor, StationElevation, ToothedDrum, TyreBand } from "../../sheets/sb-parts";
import type { LineSheetArt } from "../types";
import { GearboxSide, Pier, ThermoProbe } from "./parts-ka";

const W = 1144.5;
const H = 479;
const GROUND = 297;
const SHELL = { x: 132, y: 113, w: 812, h: 60 };
const TYRES = [248.5, 556.5, 787.5];
const ROLLER_Y = 201.5;
/** Inset panels below the elevation: [x0, x1]. */
const PANELS: [number, number][] = [[16, 232], [241, 420], [428, 525], [533, 675], [683, 900], [911, 1129]];
/** Left bearing centre of each station plan. */
const PLANS = [40, 707.5, 935.5];

function Inlet() {
  return (
    <g>
      {/* riser to C6 */}
      <rect x={53} y={4} width={45} height={50} rx={3} {...PAINT.cylinderV} />
      <rect x={51} y={16} width={49} height={4} rx={1.5} {...PAINT.raised} />
      {/* chamber: casing, lining, hot gas space, meal heap */}
      <rect x={30} y={52} width={98} height={241} rx={8} {...PAINT.body} />
      <Refractory x={35} y={57} w={88} h={231} course={6} brick={12} />
      <rect x={41} y={63} width={77} height={220} rx={3} fill={MX.deep} stroke={MX.fine} strokeWidth={MX.wFine} />
      <rect x={41} y={63} width={77} height={220} rx={3} fill={MX.heat} opacity={0.3} />
      <path d="M 42 282 Q 70 258 98 257 Q 110 257 117 262 V 282 Z" {...PAINT.material} />
      <CornerBolts x={30} y={52} w={98} h={241} inset={3} r={1.2} />
      <ThermoProbe x={30} y={113} len={46} head={9} />
      <ThermoProbe x={30} y={240.5} len={46} head={9} />
      {/* gas-sample probe and line to the analyser */}
      <rect x={110} y={80} width={20} height={4} rx={1.5} {...PAINT.shaft} />
      <Link pts={[[130, 82], [151, 52]]} dash="3 3" />
      {/* inlet seal */}
      <rect x={122} y={105} width={11} height={75} rx={3} {...PAINT.raised} />
      {[115, 125, 135, 145, 155, 165].map((y) => (
        <line key={y} x1={124} x2={131} y1={y} y2={y} {...PAINT.hair} />
      ))}
    </g>
  );
}

function Analyser() {
  return (
    <g>
      <rect x={151} y={13} width={134} height={43} rx={6} {...PAINT.body} />
      <rect x={155} y={17} width={126} height={35} rx={4} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      {[160, 188, 216].map((x) => (
        <g key={x}>
          <rect x={x} y={19} width={22} height={20} rx={2} {...PAINT.raised} />
          <rect x={x + 2.5} y={21.5} width={17} height={15} rx={1.5} {...PAINT.recess} />
        </g>
      ))}
      <rect x={250} y={19} width={21} height={20} rx={3} {...PAINT.raised} />
      <rect x={252.5} y={21.5} width={16} height={15} rx={2} {...PAINT.recess} />
    </g>
  );
}

function ShellAndStations() {
  return (
    <g>
      {TYRES.map((cx) => (
        <g key={cx}>
          {[-28.5, 28.5].map((dx) => (
            <rect key={dx} x={cx + dx - 13} y={206} width={26} height={25} rx={3} {...PAINT.body} />
          ))}
          <StationElevation cx={cx} cy={ROLLER_Y} r={20} gap={57} base={237} pierW={110} pierH={GROUND - 237} />
        </g>
      ))}
      <Shell x={SHELL.x} y={SHELL.y} w={SHELL.w} h={SHELL.h} seam={50} />
      {/* burning zone */}
      <ellipse cx={866} cy={143} rx={74} ry={20} fill={MX.heat} />
      <ellipse cx={906} cy={143} rx={30} ry={9} {...PAINT.material} opacity={0.85} />
      {TYRES.map((cx) => (
        <TyreBand key={cx} cx={cx} y={104} w={15} h={78} />
      ))}
      {/* girth gear with its spring plates, spray header at the mesh */}
      <rect x={302} y={110} width={25} height={4} rx={1} {...PAINT.raised} />
      <rect x={302} y={172} width={25} height={4} rx={1} {...PAINT.raised} />
      <GearEdge x={307} y={87} w={15} h={112} n={22} />
      <rect x={323} y={176} width={8} height={14} rx={2} {...PAINT.raised} />
    </g>
  );
}

function MainDrive() {
  return (
    <g>
      {/* pinion between gear and gearbox */}
      <Pier x={300} y={226} w={31} h={GROUND - 226} bolts={1} />
      <rect x={296} y={210} width={48} height={7} rx={2} {...PAINT.shaft} />
      <ToothedDrum x={303} y={198} w={24} h={12} n={6} />
      <Pillow x={302} y={203} w={27} h={23} />
      {/* main gearbox */}
      <Pier x={340} y={249} w={67} h={GROUND - 249} bolts={2} />
      <rect x={337} y={245} width={73} height={5} rx={1.5} {...PAINT.raised} />
      <GearboxSide x={340} y={197} w={67} h={48} ig={[18, 27, 9]} og={[41, 21, 15]} />
      {/* main motor, DE to the gearbox, encoder on the NDE */}
      <rect x={407} y={220} width={24} height={6} rx={1.5} {...PAINT.shaft} />
      <rect x={415} y={216} width={8} height={14} rx={2} {...PAINT.raised} />
      <Pier x={425} y={243} w={68} h={GROUND - 243} bolts={2} />
      <rect x={422} y={239} width={74} height={5} rx={1.5} {...PAINT.raised} />
      <SideMotor x={435} y={207} w={46} h={32} flip />
      <EncoderCap x={490} cy={223} w={7} h={14} />
    </g>
  );
}

function ThrustAndScanner() {
  const head: [number, number] = [698.5, 212];
  return (
    <g>
      {/* scanner sight lines to the shell */}
      {[525, 615, 751, 841].map((tx) => (
        <line key={tx} x1={head[0]} y1={head[1]} x2={tx} y2={SHELL.y + SHELL.h + 1} {...PAINT.hair} strokeDasharray="3 3" />
      ))}
      {/* hydraulic thrust roller, LVDT and travel-limit switch on the station-2 bed */}
      <rect x={611} y={230} width={74} height={7} rx={2} {...PAINT.raised} />
      <rect x={615} y={213} width={19} height={18} rx={3} {...PAINT.raised} />
      <circle cx={624.5} cy={210} r={6} {...PAINT.shaft} />
      <rect x={634} y={218} width={8} height={4} {...PAINT.shaft} />
      <rect x={642} y={215} width={22} height={9} rx={2} {...PAINT.body} />
      <rect x={664} y={218} width={8} height={3} {...PAINT.shaft} />
      <rect x={670} y={223} width={10} height={8} rx={1.5} {...PAINT.body} />
      {/* hydraulic power unit: tank, motor-pump, hose */}
      <rect x={622} y={247} width={60} height={45} rx={4} {...PAINT.body} />
      <rect x={627} y={268} width={50} height={20} rx={2} {...PAINT.recess} />
      <rect x={629} y={275} width={46} height={11} rx={1.5} {...PAINT.material} opacity={0.85} />
      <rect x={662} y={250} width={16} height={12} rx={3} {...PAINT.raised} />
      <path d="M 630 247 V 240 H 620 V 237" {...PAINT.detail} strokeWidth={1.4} />
      <rect x={618} y={292} width={68} height={5} rx={1.5} {...PAINT.raised} />
      {/* stand-off shell scanner on its post */}
      <rect x={695} y={224} width={7} height={68} rx={1.5} {...PAINT.shaft} />
      <rect x={686} y={291} width={25} height={6} rx={1.5} {...PAINT.raised} />
      <rect x={680} y={204} width={37} height={20} rx={5} {...PAINT.body} />
      <rect x={692} y={200} width={13} height={5} rx={1.5} {...PAINT.recess} />
      {/* handheld scan point on the station-3 pier */}
      <rect x={737} y={236} width={12} height={9} rx={2} {...PAINT.raised} />
    </g>
  );
}

function Outlet() {
  return (
    <g>
      {/* cow shell (cooling shroud): top and bottom plates with sector ribs */}
      {[101, 173].map((y) => (
        <g key={y}>
          <rect x={877} y={y} width={60} height={12} rx={3} {...PAINT.raised} />
          {[887, 897, 907, 917, 927].map((x) => (
            <line key={x} x1={x} x2={x} y1={y + 2} y2={y + 10} {...PAINT.hair} />
          ))}
        </g>
      ))}
      <line x1={877} x2={877} y1={113} y2={173} stroke={MX.fine} strokeWidth={1} strokeDasharray="3 3" />
      {/* outlet cooling fan and duct up to the shroud */}
      <rect x={888} y={185} width={13} height={66} rx={1.5} {...PAINT.cylinderV} />
      <rect x={885} y={196} width={19} height={4} rx={1} {...PAINT.raised} />
      <rect x={884} y={284} width={42} height={7} rx={1.5} {...PAINT.raised} />
      <Volute cx={904} cy={268} r={15} outH={4} dir={-1} />
      {/* outlet seal */}
      <rect x={933} y={114} width={9} height={58} rx={2} {...PAINT.raised} />
      {/* kiln hood */}
      <rect x={942} y={45} width={128} height={251} rx={8} {...PAINT.body} />
      <rect x={968} y={51} width={96} height={239} rx={5} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      <Refractory x={947} y={56} w={17} h={230} course={6} brick={9} />
      <CornerBolts x={942} y={45} w={128} h={251} inset={6} r={1.5} />
      <rect x={1004} y={232} width={34} height={30} rx={3} {...PAINT.raised} />
      <rect x={1009} y={237} width={24} height={20} rx={2} {...PAINT.recess} />
      <ThermoProbe x={1078} y={75.5} len={28} dir={-1} head={9} />
      <rect x={1050} y={192.5} width={28} height={6} rx={2} {...PAINT.shaft} />
      <rect x={1076} y={186} width={10} height={19} rx={3} {...PAINT.body} />
      {/* burner pipe through the hood */}
      <rect x={953} y={138} width={192} height={10} rx={2} {...PAINT.shaft} />
      {[1076, 1120].map((x) => (
        <rect key={x} x={x} y={134} width={5} height={18} rx={1.5} {...PAINT.raised} />
      ))}
      {/* roof pyrometer and its sight line into the burning zone */}
      <Link pts={[[1004, 44], [890, 140]]} dash="3 3" />
      <rect x={998} y={26} width={26} height={18} rx={4} {...PAINT.raised} />
      <rect x={1003} y={30} width={16} height={10} rx={2} {...PAINT.recess} />
      <rect x={1000} y={43} width={22} height={3} rx={1} {...PAINT.body} />
    </g>
  );
}

function StationPlan({ bx }: { bx: number }) {
  const rows: [number, number][] = [
    [361, 342.5],
    [442, 457.5],
  ];
  return (
    <g>
      {/* sole plates under each roller */}
      {rows.map(([y]) => (
        <rect key={`s${y}`} x={bx - 6} y={y - 18} width={183} height={36} rx={4} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} strokeDasharray="3 3" />
      ))}
      {rows.map(([y, bath]) => (
        <g key={y}>
          <rect x={bx + 8} y={y - 5} width={155} height={10} rx={2} {...PAINT.shaft} />
          <rect x={bx + 46} y={y - 11} width={79} height={22} rx={4} {...PAINT.cylinder} />
          {/* oil-bath sight */}
          <rect x={bx + 27.5} y={bath - 5} width={46} height={10} rx={3} {...PAINT.body} />
          <rect x={bx + 30} y={bath - 3} width={41} height={6} rx={2} {...PAINT.material} />
          {[0, 171].map((dx) => (
            <g key={dx}>
              <rect x={bx + dx - 11.5} y={y - 13.5} width={23} height={27} rx={4} {...PAINT.body} />
              <line x1={bx + dx - 9} x2={bx + dx + 9} y1={y} y2={y} {...PAINT.hair} />
              <Bolt x={bx + dx - 7} y={y - 9.5} r={1.1} />
              <Bolt x={bx + dx + 7} y={y + 9.5} r={1.1} />
            </g>
          ))}
        </g>
      ))}
      {/* tyre over both rollers */}
      <rect x={bx + 74} y={335} width={21} height={132} rx={4} {...PAINT.cylinderV} />
      <line x1={bx + 77} x2={bx + 77} y1={339} y2={463} {...PAINT.hair} />
      <line x1={bx + 92} x2={bx + 92} y1={339} y2={463} {...PAINT.hair} />
      <MachineLabel x={bx} y={470} size={7.5}>A</MachineLabel>
      <MachineLabel x={bx + 171} y={470} size={7.5}>B</MachineLabel>
    </g>
  );
}

function LubeSkid() {
  return (
    <g>
      {/* return and supply lines to the main gearbox */}
      <OilLine pts={[[352.5, 245], [352.5, 352], [292, 352], [292, 387]]} w={4} />
      <OilLine pts={[[372, 245], [372, 342]]} w={4} />
      <OilLine pts={[[334, 452], [342, 452]]} w={4} />
      <OilLine pts={[[389, 452], [397, 452], [397, 412]]} w={4} />
      <OilLine pts={[[397, 366], [397, 361]]} w={4} />
      {/* oil tank */}
      <rect x={250} y={387} width={84} height={73} rx={5} {...PAINT.body} />
      <rect x={256} y={409} width={72} height={46} rx={3} {...PAINT.recess} />
      <rect x={258} y={415} width={68} height={38} rx={2} {...PAINT.material} />
      <rect x={256} y={460} width={72} height={4} rx={1} {...PAINT.raised} />
      <rect x={300} y={383} width={10} height={4} rx={1} {...PAINT.raised} />
      {/* duty / standby pumps */}
      {[354, 379].map((cx) => (
        <Volute key={cx} cx={cx} cy={449} r={9.5} outH={3} dir={-1} />
      ))}
      <rect x={340} y={461} width={52} height={4} rx={1} {...PAINT.raised} />
      {/* filter and cooler / header */}
      <rect x={390} y={366} width={14} height={46} rx={7} {...PAINT.cylinderV} />
      <rect x={358} y={342} width={45} height={19} rx={4} {...PAINT.body} />
      {[366, 372, 378, 384, 390, 396].map((x) => (
        <line key={x} x1={x} x2={x} y1={345} y2={358} {...PAINT.hair} />
      ))}
    </g>
  );
}

function AuxDrive() {
  return (
    <g>
      <Link pts={[[407, 236], [413, 236], [413, 333], [449.5, 333], [449.5, 390]]} dash="3 3" />
      <rect x={446} y={399} width={20} height={6} rx={1.5} {...PAINT.shaft} />
      {/* brake disc edge-on with caliper */}
      <rect x={445} y={390} width={9} height={26} rx={2} {...PAINT.cylinderV} />
      <rect x={442} y={386} width={15} height={7} rx={2} {...PAINT.raised} />
      <rect x={463} y={416} width={42} height={6} rx={1.5} {...PAINT.raised} />
      <SideMotor x={465} y={390} w={38} h={26} flip />
    </g>
  );
}

function SprayLube() {
  const outlets = [608, 618.5, 629, 639.5, 650, 660.5];
  return (
    <g>
      <Link pts={[[331, 183], [335.5, 183], [335.5, 308], [636.5, 308], [636.5, 405]]} dash="4 3" />
      {/* controller over the lubricant drum */}
      <rect x={545} y={354} width={45} height={100} rx={5} {...PAINT.body} />
      <rect x={550} y={359} width={35} height={13} rx={2} {...PAINT.recess} />
      <rect x={550} y={392} width={35} height={58} rx={3} {...PAINT.recess} />
      <rect x={552} y={398} width={31} height={50} rx={2} {...PAINT.material} />
      <line x1={545} x2={590} y1={380} y2={380} {...PAINT.detail} />
      <OilLine pts={[[590, 420.5], [600, 420.5]]} w={4} />
      {/* six-circuit divider block */}
      <rect x={600} y={405} width={68.5} height={31} rx={4} {...PAINT.body} />
      <rect x={604} y={409} width={60.5} height={9} rx={2} {...PAINT.recess} />
      {outlets.map((x) => (
        <rect key={x} x={x - 2} y={434} width={4} height={6} {...PAINT.shaft} />
      ))}
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={14} x2={1131} y={GROUND} />
      {PANELS.map(([x0, x1]) => (
        <rect key={x0} x={x0} y={310} width={x1 - x0} height={164} rx={8} fill="none" stroke={MX.fine} strokeWidth={0.8} strokeDasharray="4 4" opacity={0.8} />
      ))}
      <ShellAndStations />
      <Inlet />
      <Analyser />
      <ThrustAndScanner />
      <Outlet />
      <MainDrive />
      <LubeSkid />
      <AuxDrive />
      <SprayLube />
      {PLANS.map((bx) => (
        <StationPlan key={bx} bx={bx} />
      ))}

      <MachineLabel x={75.5} y={43} size={6.8}>RISER</MachineLabel>
      <MachineLabel x={171} y={47.4} size={6.8}>O₂</MachineLabel>
      <MachineLabel x={199} y={47.4} size={6.8}>CO</MachineLabel>
      <MachineLabel x={227.5} y={47.4} size={6.8}>NOx</MachineLabel>
      <MachineLabel x={218} y={67} size={6.8}>GAS ANALYSER</MachineLabel>
      <MachineLabel x={314} y={79} size={6.8}>GIRTH GEAR</MachineLabel>
      <MachineLabel x={880.5} y={92.4} anchor="start" size={6.8}>COW SHELL</MachineLabel>
      <MachineLabel x={1091.5} y={134.4} anchor="start" size={6.8}>BURNER</MachineLabel>
      <MachineLabel x={79} y={306.9} size={6.8}>KILN INLET</MachineLabel>
      <MachineLabel x={418} y={305.4} anchor="start" size={6.8}>MAIN DRIVE</MachineLabel>
      <MachineLabel x={652} y={305.4} size={6.8}>THRUST</MachineLabel>
      <MachineLabel x={700} y={305.4} size={6.8}>SCANNER</MachineLabel>
      <MachineLabel x={903} y={305.4} size={6.8}>OUTLET FAN</MachineLabel>
      <MachineLabel x={1005} y={305.4} size={6.8}>KILN HOOD</MachineLabel>
      <MachineLabel x={24.5} y={322.8} anchor="start" size={7.9}>STATION 1 · PLAN</MachineLabel>
      <MachineLabel x={249.5} y={322.8} anchor="start" size={7.9}>GEARBOX LUBE SKID</MachineLabel>
      <MachineLabel x={437} y={322.8} anchor="start" size={7.9}>AUX DRIVE</MachineLabel>
      <MachineLabel x={542} y={322.8} anchor="start" size={7.9}>SPRAY LUBE</MachineLabel>
      <MachineLabel x={692} y={322.8} anchor="start" size={7.9}>STATION 2 · PLAN</MachineLabel>
      <MachineLabel x={920} y={322.8} anchor="start" size={7.9}>STATION 3 · PLAN</MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 13. */
const pads: LineSheetArt["pads"] = {
  // inlet (K-1)
  "GAS-KLN-01": [170.5, 29],
  "GAS-KLN-02": [199, 29],
  "GAS-KLN-03": [227.5, 29],
  "STS-KLN-06": [260.5, 29],
  "TMP-KLN-13": [79, 113],
  "PRS-KLN-01": [79, 240.5],
  // tyres (K-6)
  "MIG-KLN-01": [248.5, 99.5],
  "MIG-KLN-02": [555, 99.5],
  "MIG-KLN-03": [785, 99.5],
  // gear train (K-2)
  "VIB-KLN-04": [315.5, 213.5],
  "VIB-KLN-02": [350, 204.5],
  "TMP-KLN-22": [350, 234.5],
  "VIB-KLN-03": [396.5, 204.5],
  "TMP-KLN-23": [396.5, 234.5],
  "VIB-KLN-01": [435.5, 213.5],
  "TMP-KLN-19": [435.5, 233],
  "TMP-KLN-21": [459.5, 224],
  "ELE-KLN-01": [459.5, 201.5],
  "TMP-KLN-20": [485, 213.5],
  "SPD-KLN-01": [485, 233],
  // thrust (K-7), shell scanner (K-8), outlet and hood (K-9)
  "POS-KLN-01": [651, 219.5],
  "POS-KLN-02": [675, 227],
  "PRS-KLN-07": [652.5, 260],
  "STS-KLN-08": [698.5, 215],
  "MAN-KLN-01": [743, 240.5],
  "TMP-KLN-25": [896, 218],
  "TMP-KLN-26": [909.5, 101],
  "TMP-KLN-14": [1010.5, 35],
  "TMP-KLN-27": [1050.5, 75.5],
  "PRS-KLN-03": [1050.5, 195.5],
  // station 1 plan (K-6)
  "TMP-KLN-01": [40, 360.5],
  "TMP-KLN-02": [211, 360.5],
  "LEV-KLN-02": [90.5, 342.5],
  "TMP-KLN-03": [40, 441.5],
  "TMP-KLN-04": [211, 441.5],
  "LEV-KLN-03": [90.5, 458],
  // gearbox lube skid (K-4), aux drive (K-3)
  "TMP-KLN-15": [270.5, 398],
  "LEV-KLN-01": [323, 443],
  "LAB-KLN-01": [263, 450.5],
  "PRS-KLN-05": [397, 390.5],
  "PRS-KLN-04": [371.5, 330.5],
  "FLO-KLN-05": [371.5, 308],
  "STS-KLN-11": [485.5, 384.5],
  "LIM-KLN-01": [449.5, 403],
  // spray lube (K-5)
  "STS-KLN-05": [565, 365.5],
  "PRX-KLN-01": [608, 444.5],
  "PRX-KLN-02": [618.5, 444.5],
  "PRX-KLN-03": [629, 444.5],
  "PRX-KLN-04": [639.5, 444.5],
  "PRX-KLN-05": [650, 444.5],
  "PRX-KLN-06": [660.5, 444.5],
  // station 2 plan (K-6)
  "TMP-KLN-05": [707.5, 360.5],
  "TMP-KLN-06": [878.5, 360.5],
  "LEV-KLN-04": [758, 342.5],
  "TMP-KLN-07": [707.5, 441.5],
  "TMP-KLN-08": [878.5, 441.5],
  "LEV-KLN-05": [758, 458],
  // station 3 plan (K-6)
  "TMP-KLN-09": [935.5, 360.5],
  "TMP-KLN-10": [1106.5, 360.5],
  "LEV-KLN-06": [986, 342.5],
  "TMP-KLN-11": [935.5, 441.5],
  "TMP-KLN-12": [1106.5, 441.5],
  "LEV-KLN-07": [986, 458],
};

export const sheet: LineSheetArt = { id: "K-0", ready: true, width: W, height: H, Art, pads };
