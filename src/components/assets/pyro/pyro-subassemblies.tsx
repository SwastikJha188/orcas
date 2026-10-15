"use client";

/**
 * Dedicated, self-contained ULTRON machine-kit sub-assembly schematics
 * (720 × 310 VIEW_W × VIEW_H coordinate space) for every machine part across
 * the Pyro Line (PYR-FED-01 … PYR-CCT-01) and the Concentrator / Hydromet
 * fleet (CRUSH-01, CONV-04, SAG-01, BALL-02, BALL-03, PUMP-104, HP-PUMP-01,
 * AGIT-01, PMP-101, BLOW-03).
 *
 * Each sub-assembly is drawn as a complete, uncropped engineering schematic on
 * its own ground/support datum with closed housings, flanges, couplings and
 * accurately placed measurement pad coordinates.
 */

import React from "react";
import {
  Bolt,
  CornerBolts,
  Coupling,
  Fan,
  GearWheel,
  GroundLine,
  Housing,
  MX,
  MachineLabel,
  Motor,
  PAINT,
} from "../machine-kit/machine-kit";
import {
  AirSlide,
  Brace,
  Cabinet,
  Cyclone,
  type CycloneGeom,
  Handrail,
  Ladder,
  MealPipe,
  MirrorX,
  PedestalBearing,
  Pipe as FkpPipe,
  Steel,
  Tube,
  Volute,
} from "./drawings/fkp-parts";
import {
  FanSet,
  Flange,
  FlowArrow,
  Pipe as ClkPipe,
  Silo,
  Transmitter,
  fanGeom,
  type FanSpec,
} from "./drawings/clk-parts";
import { Brick, EncoderCap, FlowTag, Gearbox, LoadCell, Plinth, Radar, WallSwitch } from "./sheets/sa-parts";
import { GearEdge, Link, OilLine, Pillow, Refractory, RollerEnd, ShaftCoupling, Shell, SideMotor, SprayNozzle, TyreBand } from "./sheets/sb-parts";
import { Compartment, CoolerFrame, GrateCasing, Lumps } from "./sheets/sc-parts";

export type PadMap = Record<string, [number, number]>;

export interface SubAssemblyDrawingDef {
  Art: React.ComponentType;
  pads: PadMap;
}

const G_Y = 278;

/* ==========================================================================
   1. PYR-FED-01 (FSL-01) · Feed Silo & Aeration
   ========================================================================== */

function FslSiloArt() {
  const sl = 230;
  const sr = 430;
  const scx = 330;
  const sTop = 52;
  const sBot = 172;
  const sOut = 232;
  const legs = [244, 410];
  return (
    <g>
      <GroundLine x1={90} x2={630} y={G_Y} />
      <Ladder x={208} y1={46} y2={G_Y} w={10} />
      {legs.map((x) => (
        <Steel key={x} x={x} y={sBot} w={8} h={G_Y - sBot} />
      ))}
      <Brace x1={legs[0] + 8} y1={210} x2={legs[1]} y2={G_Y - 4} />
      <Plinth x={224} y={G_Y - 8} w={212} h={8} />

      {/* aeration supply line into cone fluidising pads */}
      <FkpPipe pts={[[135, 206], [282, 206]]} d={8} flanges={[[190, 206]]} />
      <FlowTag x1={115} y1={206} x2={132} y2={206} label="AERATION AIR" lx={150} ly={192} />

      {/* cone */}
      <path d={`M ${sl} ${sBot} L ${sr} ${sBot} L ${scx + 16} ${sOut} L ${scx - 16} ${sOut} Z`} {...PAINT.cylinderV} />
      <line x1={sl + 28} y1={sBot + 4} x2={scx - 6} y2={sOut - 4} {...PAINT.hair} />
      <line x1={sr - 28} y1={sBot + 4} x2={scx + 6} y2={sOut - 4} {...PAINT.hair} />
      <Steel x={legs[0] - 4} y={202} w={legs[1] - legs[0] + 16} h={6} />

      {/* cylindrical shell with ring seams & cutaway material window */}
      <rect x={sl} y={sTop} width={sr - sl} height={sBot - sTop} rx={3} {...PAINT.cylinderV} />
      {[76, 100, 124, 148].map((y) => (
        <line key={y} x1={sl + 2} x2={sr - 2} y1={y} y2={y} stroke={MX.fine} strokeWidth={1} />
      ))}
      <rect x={sl + 26} y={96} width={sr - sl - 52} height={64} rx={4} {...PAINT.recess} />
      <path d={`M ${sl + 30} 116 Q ${scx} 108 ${sr - 30} 118 L ${sr - 30} 156 L ${sl + 30} 156 Z`} fill={MX.material} opacity={0.85} />
      <rect x={sl - 4} y={sBot - 4} width={sr - sl + 8} height={8} rx={2} {...PAINT.raised} />

      {/* conical roof, handrail, level radar */}
      <path d={`M ${sl - 4} ${sTop + 1} L ${scx} 34 L ${sr + 4} ${sTop + 1} Z`} {...PAINT.raised} />
      <Handrail x1={sl + 2} x2={sr - 2} y={sTop - 1} h={12} step={16} />
      <Radar x={scx} y={34} h={14} />

      {/* bottom extraction gate & actuator */}
      <rect x={scx - 20} y={sOut} width={40} height={5} rx={1.5} {...PAINT.raised} />
      <rect x={308} y={237} width={44} height={26} rx={4} {...PAINT.body} />
      <CornerBolts x={308} y={237} w={44} h={26} inset={4} r={1.3} />
      <rect x={352} y={241} width={30} height={18} rx={3} {...PAINT.raised} />
      <rect x={358} y={246} width={10} height={8} rx={1.5} {...PAINT.recess} />
      <AirSlide x1={336} y1={263} x2={520} y2={273} d={12} />
      <FlowTag x1={528} y1={273} x2={578} y2={273} label="TO FEED BIN" lx={554} ly={258} />

      <MachineLabel x={scx} y={142} tone="ink">RAW-MEAL FEED SILO</MachineLabel>
      <MachineLabel x={436} y={246} anchor="start" size={7.5}>EXTRACTION GATE</MachineLabel>
    </g>
  );
}

function FslAerationArt() {
  const cx = 398;
  const cy = 208;
  const r = 34;
  return (
    <g>
      <GroundLine x1={80} x2={640} y={G_Y} />
      {/* upper-left: silo cone fluidising ring manifold & 4 sector valve boxes */}
      <Housing x={108} y={36} w={236} h={64} rx={6} bolts={false} />
      <CornerBolts x={108} y={36} w={236} h={64} inset={6} r={1.4} />
      {[134, 182, 230, 278].map((sx, i) => (
        <g key={sx}>
          <rect x={sx} y={48} width={34} height={24} rx={3} {...PAINT.recess} />
          <circle cx={sx + 17} cy={60} r={4} {...PAINT.shaft} />
          <MachineLabel x={sx + 17} y={84} size={6.5}>{`S${i + 1}`}</MachineLabel>
        </g>
      ))}
      <FkpPipe pts={[[344, 78], [cx - r + 7, 78]]} d={12} flanges={[[356, 78]]} />
      <MachineLabel x={226} y={26} size={7.5}>SILO FLUIDISING SECTOR MANIFOLD</MachineLabel>

      {/* control cabinet */}
      <Plinth x={108} y={G_Y - 8} w={92} h={8} />
      <Cabinet x={116} y={136} w={76} h={134} louvres />
      <line x1={192} y1={254} x2={236} y2={254} stroke={MX.edge} strokeWidth={2.2} />
      <MachineLabel x={154} y={124} size={7.5}>CONTROL CABINET</MachineLabel>

      {/* blower skid: plinth, motor, coupling, volute */}
      <Plinth x={228} y={G_Y - 12} w={236} h={12} />
      <rect x={252} y={256} width={16} height={10} {...PAINT.body} />
      <rect x={320} y={256} width={16} height={10} {...PAINT.body} />
      <Motor x={238} y={182} w={104} h={76} />
      <rect x={342} y={cy - 5} width={56} height={10} {...PAINT.shaft} />
      <Coupling x={352} y={cy - 14} w={18} h={28} />
      <path d={`M ${cx - 26} ${cy + 18} L ${cx + 26} ${cy + 18} L ${cx + 32} 266 L ${cx - 32} 266 Z`} {...PAINT.body} />
      <Volute cx={cx} cy={cy} r={r} outH={14} dir={-1} rotor />

      {/* aeration header pipe + pressure transmitter + manifold branches */}
      <FkpPipe pts={[[cx - r + 7, cy - r - 12], [cx - r + 7, 78], [585, 78]]} d={14} flanges={[[cx - r + 7, 138], [460, 78], [545, 78]]} />
      <Transmitter x={498} y={71} dir="up" len={14} />
      {[520, 560].map((bx) => (
        <FkpPipe key={bx} pts={[[bx, 85], [bx, 180]]} d={8} />
      ))}
      <Housing x={492} y={180} w={116} h={86} rx={6} />
      <MachineLabel x={550} y={226} size={7}>OPEN AIRSLIDE BOX</MachineLabel>
      <FlowTag x1={592} y1={78} x2={636} y2={78} label="TO SILO CONE PADS" lx={575} ly={54} />

      <MachineLabel x={290} y={295} size={7.5}>BLOWER MOTOR</MachineLabel>
      <MachineLabel x={cx + 8} y={295} size={7.5}>AERATION BLOWER</MachineLabel>
      <MachineLabel x={498} y={32} size={7.5}>AERATION HEADER</MachineLabel>
    </g>
  );
}

/* ==========================================================================
   2. PYR-FED-01 (KFS-01) · Kiln Feed Bin, Dosing & Bucket Elevator
   ========================================================================== */

function KfsBinArt() {
  const bl = 230;
  const br = 470;
  const bcx = 350;
  const bTop = 58;
  const bRib = 162;
  const bOut = 244;
  const legs = [248, 452];
  return (
    <g>
      <GroundLine x1={80} x2={640} y={G_Y} />
      {/* left: silo extraction airslide & feed gate */}
      <Housing x={96} y={64} w={104} h={198} rx={6} />
      <AirSlide x1={124} y1={42} x2={256} y2={48} d={14} />
      <MachineLabel x={148} y={164} size={7}>FEED TOWER</MachineLabel>

      {/* weigh frame & load cells */}
      {legs.map((x) => (
        <Steel key={x} x={x} y={bRib} w={9} h={256 - bRib} />
      ))}
      <Brace x1={legs[0] + 9} y1={174} x2={legs[1]} y2={252} />
      <rect x={legs[0] - 10} y={254} width={legs[1] - legs[0] + 29} height={6} rx={2} {...PAINT.body} />
      {legs.map((x) => (
        <g key={`lc-${x}`}>
          <LoadCell x={x + 4.5} y={260} w={22} />
          <Plinth x={x - 14} y={271} w={37} h={7} bolts={false} />
        </g>
      ))}

      {/* mass-flow cone */}
      <path d={`M ${bl} ${bRib} L ${br} ${bRib} L ${bcx + 16} ${bOut} L ${bcx - 16} ${bOut} Z`} {...PAINT.cylinderV} />
      <line x1={bl + 28} y1={bRib + 4} x2={bcx - 6} y2={bOut - 4} {...PAINT.hair} />
      <line x1={br - 28} y1={bRib + 4} x2={bcx + 6} y2={bOut - 4} {...PAINT.hair} />
      <Steel x={legs[0] - 4} y={198} w={legs[1] - legs[0] + 17} h={6} />
      <rect x={bcx - 20} y={bOut} width={40} height={6} rx={1.5} {...PAINT.raised} />

      {/* ribbed upper shell & brass meal fill */}
      <rect x={bl} y={bTop} width={br - bl} height={bRib - bTop} rx={3} {...PAINT.cylinderV} />
      {[74, 90, 106, 122, 138, 152].map((y) => (
        <line key={y} x1={bl + 2} x2={br - 2} y1={y} y2={y} stroke={MX.fine} strokeWidth={1} />
      ))}
      <rect x={bl + 30} y={92} width={br - bl - 60} height={54} rx={4} {...PAINT.recess} />
      <path d={`M ${bl + 34} 110 Q ${bcx} 102 ${br - 34} 112 L ${br - 34} 142 L ${bl + 34} 142 Z`} fill={MX.material} opacity={0.85} />
      <rect x={bl - 4} y={bRib - 4} width={br - bl + 8} height={7} rx={2} {...PAINT.raised} />

      {/* roof, feed chute, radar & level switches */}
      <rect x={bl - 5} y={bTop - 6} width={br - bl + 10} height={7} rx={2} {...PAINT.raised} />
      <rect x={256} y={34} width={34} height={18} rx={2} {...PAINT.body} />
      <Radar x={bcx} y={bTop - 6} h={15} />
      <WallSwitch x={br} y={84} dir={1} />
      <WallSwitch x={428} y={204} dir={1} />

      {/* right: gravimetric weigh-controller cabinet */}
      <Plinth x={516} y={G_Y - 8} w={108} h={8} />
      <Cabinet x={524} y={116} w={92} h={154} louvres />
      <MachineLabel x={570} y={104} size={7}>WEIGH CONTROLLER</MachineLabel>

      <MachineLabel x={bcx} y={124} tone="ink">KILN FEED WEIGH BIN</MachineLabel>
      <MachineLabel x={198} y={266} anchor="end" size={7.5}>LOAD CELLS</MachineLabel>
      <MachineLabel x={516} y={87} anchor="start" size={7}>HIGH LEVEL</MachineLabel>
      <MachineLabel x={464} y={207} anchor="start" size={7}>LOW LEVEL</MachineLabel>
    </g>
  );
}

function KfsDosingArt() {
  return (
    <g>
      <GroundLine x1={80} x2={640} y={G_Y} />
      {/* weigh bin cone stub + motorized dosing gate */}
      <path d="M 146 36 L 222 36 L 204 82 L 164 82 Z" {...PAINT.cylinderV} />
      <rect x={160} y={80} width={48} height={6} rx={1.5} {...PAINT.raised} />
      <rect x={156} y={86} width={56} height={42} rx={5} {...PAINT.body} />
      <CornerBolts x={156} y={86} w={56} h={42} inset={5} r={1.4} />
      {/* gate position actuator */}
      <rect x={112} y={94} width={44} height={26} rx={4} {...PAINT.cylinder} />
      <rect x={98} y={100} width={16} height={14} rx={2} {...PAINT.raised} />
      <rect x={166} y={128} width={36} height={14} rx={2} {...PAINT.body} />
      <MachineLabel x={184} y={70} size={7.5}>DOSING GATE</MachineLabel>

      {/* upper-center: airslide blower skid on mezzanine platform */}
      <Plinth x={252} y={102} w={164} h={6} bolts={false} />
      <Motor x={262} y={56} w={68} h={46} terminalBox={false} />
      <circle cx={376} cy={78} r={22} {...PAINT.body} />
      <Fan cx={376} cy={78} r={15} />
      <FkpPipe pts={[[376, 100], [376, 162]]} d={8} />
      <MachineLabel x={334} y={42} size={7}>AIRSLIDE BLOWER</MachineLabel>

      {/* inclined fluidised air slide + aeration chamber tap + support bents */}
      <Steel x={224} y={156} w={8} h={G_Y - 156} />
      <Steel x={372} y={176} w={8} h={G_Y - 176} />
      <Brace x1={232} y1={182} x2={372} y2={G_Y - 4} />
      <AirSlide x1={184} y1={144} x2={438} y2={178} d={20} />
      <rect x={306} y={170} width={8} height={18} {...PAINT.shaft} />
      <rect x={296} y={186} width={28} height={12} rx={3} {...PAINT.raised} />
      <MachineLabel x={312} y={136} size={7.5}>FLUIDISED AIR SLIDE</MachineLabel>

      {/* solid-flow meter (SFM) on structural legs */}
      <Steel x={456} y={226} w={8} h={G_Y - 226} />
      <Steel x={544} y={226} w={8} h={G_Y - 226} />
      <Plinth x={442} y={G_Y - 8} w={124} h={8} />
      <rect x={438} y={136} width={132} height={90} rx={8} {...PAINT.body} />
      <rect x={448} y={146} width={112} height={70} rx={5} {...PAINT.recess} />
      <path d="M 462 158 L 510 198 L 538 198" fill="none" stroke={MX.material} strokeWidth={5} strokeLinecap="round" />
      <line x1={504} y1={154} x2={486} y2={198} stroke={MX.edge} strokeWidth={2.5} />
      <CornerBolts x={438} y={136} w={132} h={90} inset={7} r={1.6} />
      {/* interface pressure tap on top right of SFM */}
      <Transmitter x={548} y={136} dir="up" len={14} />
      <MachineLabel x={504} y={176} tone="ink">SOLID-FLOW METER</MachineLabel>

      {/* outlet chute to bucket elevator boot */}
      <Tube x1={570} y1={196} x2={628} y2={228} d={16} paint={PAINT.body} />
      <FlowTag x1={585} y1={246} x2={632} y2={246} label="TO ELEVATOR" lx={608} ly={264} />
    </g>
  );
}

function KfsElevatorArt() {
  const el = 198;
  const er = 266;
  const ecx = 232;
  const eTop = 76;
  const eBoot = 228;
  const headCy = 58;
  return (
    <g>
      <GroundLine x1={80} x2={640} y={G_Y} />

      {/* feed chute into elevator boot */}
      <Tube x1={124} y1={216} x2={192} y2={244} d={15} paint={PAINT.body} />
      <FlowTag x1={108} y1={202} x2={146} y2={218} label="FROM SFM" lx={128} ly={192} />

      {/* elevator casing with flanged sections & ascending/descending buckets */}
      <rect x={el} y={eTop} width={er - el} height={eBoot - eTop} rx={2} {...PAINT.cylinderV} />
      <rect x={ecx - 22} y={eTop + 6} width={16} height={eBoot - eTop - 12} rx={2} {...PAINT.recess} />
      <rect x={ecx + 6} y={eTop + 6} width={16} height={eBoot - eTop - 12} rx={2} {...PAINT.recess} />
      {Array.from({ length: 11 }).map((_, i) => {
        const y = eTop + 10 + i * 12.5;
        return (
          <g key={i}>
            <path d={`M ${ecx - 20} ${y} h 12 l -2 6 h -8 Z`} fill={MX.flatRaised} stroke={MX.edge} strokeWidth={0.7} />
            <rect x={ecx - 19} y={y + 0.8} width={10} height={2.4} rx={0.8} fill={MX.material} />
            <path d={`M ${ecx + 8} ${y + 6} h 12 l -2 -6 h -8 Z`} fill={MX.flatRaised} stroke={MX.edge} strokeWidth={0.7} />
          </g>
        );
      })}
      {[114, 152, 190].map((y) => (
        <rect key={y} x={el - 4} y={y - 2} width={er - el + 8} height={4.5} rx={1.2} {...PAINT.raised} />
      ))}

      {/* elevator boot & tail pulley */}
      <rect x={186} y={eBoot} width={92} height={42} rx={6} {...PAINT.body} />
      <CornerBolts x={186} y={eBoot} w={92} h={42} inset={6} r={1.5} />
      <circle cx={ecx} cy={249} r={13} {...PAINT.raised} />
      <circle cx={ecx} cy={249} r={4} {...PAINT.shaft} />
      <Plinth x={176} y={270} w={112} h={8} />

      {/* head discharge spout toward preheater */}
      <Tube x1={192} y1={66} x2={122} y2={104} d={15} paint={PAINT.cylinder} />
      <FlowTag x1={154} y1={116} x2={106} y2={116} label="TO PREHEATER" lx={130} ly={134} />

      {/* elevator head hood & head pulley */}
      <rect x={186} y={28} width={92} height={54} rx={10} {...PAINT.body} />
      <rect x={192} y={34} width={80} height={42} rx={6} fill="none" stroke={MX.fine} strokeWidth={1} />
      <circle cx={ecx} cy={headCy} r={17} fill="none" stroke={MX.fine} strokeWidth={1.3} />
      <circle cx={ecx} cy={headCy} r={10} {...PAINT.raised} />
      <circle cx={ecx} cy={headCy} r={3.5} {...PAINT.shaft} />

      {/* structural head-drive platform supported to ground + VFD & tensioning bay */}
      <Steel x={302} y={96} w={8} h={G_Y - 96} />
      <Steel x={582} y={96} w={8} h={G_Y - 96} />
      <Brace x1={310} y1={116} x2={430} y2={G_Y - 8} />
      <Steel x={310} y={186} w={272} h={6} />
      <Plinth x={286} y={88} w={322} h={8} />
      <Plinth x={290} y={G_Y - 8} w={314} h={8} />
      <Cabinet x={446} y={132} w={118} h={138} louvres />
      <MachineLabel x={505} y={204} size={7}>ELEVATOR VFD MCC</MachineLabel>

      {/* head shaft, pillow-block bearing, coupling, bevel-helical gearbox, drive motor */}
      <rect x={ecx} y={headCy - 4} width={268} height={8} {...PAINT.shaft} />
      <Pillow x={304} y={40} w={36} h={48} />
      <Coupling x={352} y={44} w={18} h={28} />
      <Gearbox x={378} y={30} w={88} h={58} />
      <Coupling x={474} y={46} w={16} h={24} />
      <MirrorX about={545}>
        <Motor x={496} y={32} w={98} h={56} />
      </MirrorX>

      <MachineLabel x={ecx} y={295} size={7.5}>ELEVATOR BOOT &amp; CASING</MachineLabel>
      <MachineLabel x={322} y={112} size={7}>HEAD BEARING</MachineLabel>
      <MachineLabel x={422} y={112} size={7}>GEARBOX</MachineLabel>
      <MachineLabel x={545} y={112} size={7}>HEAD DRIVE MOTOR</MachineLabel>
    </g>
  );
}

/* ==========================================================================
   3. PYR-PHC-01 · Six-Stage Preheater, Riser, Exit Gas & ID Fan
   ========================================================================== */

function PhcThreeStageBay({
  stages,
  topLabel,
  botLabel,
  conesPurged = false,
}: {
  stages: [string, string, string];
  topLabel: string;
  botLabel: string;
  conesPurged?: boolean;
}) {
  const c1: CycloneGeom = { cx: 195, top: 64, w: 84, cyl: 66, cone: 72, inlet: -1 };
  const c2: CycloneGeom = { cx: 365, top: 74, w: 84, cyl: 66, cone: 72, inlet: 1 };
  const c3: CycloneGeom = { cx: 535, top: 84, w: 84, cyl: 66, cone: 72, inlet: -1 };
  const list = [c1, c2, c3];
  const outY = (c: CycloneGeom) => c.top + c.cyl + c.cone + 9;
  return (
    <g>
      <GroundLine x1={80} x2={640} y={G_Y} />
      {/* structural preheater frame */}
      {[110, 280, 450, 620].map((x) => (
        <Steel key={x} x={x - 4} y={28} w={8} h={G_Y - 28} />
      ))}
      {[140, 232].map((y) => (
        <g key={y}>
          <Handrail x1={114} x2={616} y={y} h={9} step={18} />
          <rect x={106} y={y} width={518} height={5} rx={1.5} {...PAINT.body} />
        </g>
      ))}

      {/* interconnecting gas risers */}
      <FkpPipe pts={[[195, 64], [195, 36], [125, 36]]} d={15} flanges={[[155, 36]]} />
      <FkpPipe pts={[[365, 74], [365, 48], [250, 48], [250, 86], [237, 86]]} d={14} />
      <FkpPipe pts={[[535, 84], [535, 58], [420, 58], [420, 96], [407, 96]]} d={14} />
      <FkpPipe pts={[[605, 108], [577, 108]]} d={14} />

      {/* meal drop pipes */}
      {list.map((c, i) => (
        <MealPipe key={i} pts={[[c.cx, outY(c)], [c.cx, 266]]} d={7} />
      ))}

      {/* cyclones */}
      {list.map((c, i) => (
        <Cyclone key={stages[i]} c={c} label={stages[i]} />
      ))}

      {/* purged cone pressure nozzles for C4–C6 */}
      {conesPurged &&
        list.map((c, i) => (
          <g key={`tap-${i}`}>
            <rect x={c.cx - 26} y={c.top + c.cyl + 42} width={14} height={4} {...PAINT.shaft} />
            <rect x={c.cx - 34} y={c.top + c.cyl + 38} width={10} height={12} rx={2} {...PAINT.raised} />
          </g>
        ))}

      <MachineLabel x={98} y={39} anchor="end" size={7.5}>{topLabel}</MachineLabel>
      <MachineLabel x={612} y={111} anchor="start" size={7.5}>{botLabel}</MachineLabel>
    </g>
  );
}

function PhcUpperArt() {
  return <PhcThreeStageBay stages={["C1", "C2", "C3"]} topLabel="← TO ID FAN" botLabel="← FROM C4" />;
}

function PhcLowerArt() {
  return <PhcThreeStageBay stages={["C4", "C5", "C6"]} topLabel="← TO C3" botLabel="← RISER" conesPurged />;
}

function PhcRiserArt() {
  const c6: CycloneGeom = { cx: 225, top: 44, w: 92, cyl: 68, cone: 74, inlet: 1 };
  return (
    <g>
      <GroundLine x1={80} x2={640} y={G_Y} />
      {/* structural columns & platform */}
      <Steel x={140} y={32} w={8} h={G_Y - 32} />
      <Steel x={310} y={32} w={8} h={G_Y - 32} />
      <Handrail x1={148} x2={310} y={196} h={9} step={16} />
      <rect x={136} y={196} width={186} height={6} rx={1.5} {...PAINT.body} />

      {/* kiln riser duct: kiln inlet chamber → C6 tangential inlet */}
      <FkpPipe pts={[[475, 162], [475, 68], [271, 68]]} d={24} flanges={[[475, 118], [375, 68]]} />
      <FlowArrow x1={475} y1={146} x2={475} y2={92} />

      {/* C6 bottom stage cyclone & hot meal chute to kiln inlet */}
      <Cyclone c={c6} label="C6" />
      <MealPipe pts={[[225, 195], [225, 228], [412, 228]]} d={9} />

      {/* refractory-lined kiln inlet chamber & rotating kiln shell */}
      <path d="M 536 184 L 636 196 L 636 258 L 536 250 Z" {...PAINT.cylinder} />
      <rect x={528} y={176} width={10} height={80} rx={2.5} {...PAINT.raised} />
      <rect x={410} y={156} width={120} height={114} rx={7} {...PAINT.body} />
      <Brick x={418} y={164} w={104} h={98} row={7} course={14} />
      <Plinth x={402} y={270} w={136} h={8} />

      <MachineLabel x={375} y={48} size={7.5}>KILN RISER DUCT</MachineLabel>
      <MachineLabel x={318} y={246} size={7.5}>C6 HOT MEAL CHUTE</MachineLabel>
      <MachineLabel x={470} y={216} tone="ink">KILN INLET</MachineLabel>
      <MachineLabel x={590} y={226} size={7.5}>KILN SHELL →</MachineLabel>
    </g>
  );
}

function PhcExitGasArt() {
  return (
    <g>
      <GroundLine x1={80} x2={640} y={G_Y} />
      {/* C1 cyclone upper hood & vortex finder */}
      <rect x={120} y={118} width={110} height={152} rx={3} {...PAINT.cylinderV} />
      <rect x={115} y={114} width={120} height={7} rx={2} {...PAINT.raised} />
      <rect x={115} y={264} width={120} height={14} rx={2} {...PAINT.body} />
      <MachineLabel x={175} y={196} tone="ink">C1 TOP STAGE</MachineLabel>

      {/* overhead preheater exit-gas duct */}
      <FkpPipe pts={[[175, 114], [175, 64], [585, 64], [585, 264]]} d={28} flanges={[[250, 64], [485, 64], [585, 148]]} />
      <FlowTag x1={520} y1={64} x2={560} y2={64} label="EXIT GAS TO ID FAN" lx={420} ly={36} />

      {/* heated extractive sample probe & sample line */}
      <rect x={346} y={32} width={8} height={20} rx={1.5} {...PAINT.shaft} />
      <rect x={340} y={26} width={20} height={8} rx={2} {...PAINT.raised} />
      <line x1={350} y1={80} x2={350} y2={138} stroke={MX.fine} strokeWidth={1.4} strokeDasharray="4 3" />

      {/* extractive gas analyser cabinet (O2 / CO) */}
      <Plinth x={276} y={262} w={188} h={16} />
      <rect x={286} y={138} width={168} height={124} rx={7} {...PAINT.body} />
      <rect x={294} y={146} width={152} height={108} rx={4} fill="none" stroke={MX.fine} strokeWidth={1} />
      <CornerBolts x={286} y={138} w={168} h={124} inset={7} r={1.6} />
      <rect x={306} y={162} width={56} height={32} rx={3} {...PAINT.recess} />
      <rect x={378} y={162} width={56} height={32} rx={3} {...PAINT.recess} />
      <MachineLabel x={334} y={182} size={7.5} tone="ink">O₂ CELL</MachineLabel>
      <MachineLabel x={406} y={182} size={7.5} tone="ink">CO CELL</MachineLabel>
      <MachineLabel x={370} y={232} size={7.5}>EXTRACTIVE GAS ANALYSER</MachineLabel>
    </g>
  );
}

function PhcIdFanArt() {
  const fx = 245;
  const fy = 184;
  const fr = 64;
  return (
    <g>
      <GroundLine x1={70} x2={650} y={G_Y} />
      {/* inlet gas downcomer + louvre damper + actuator */}
      <FkpPipe pts={[[138, 28], [138, 184], [185, 184]]} d={26} flanges={[[138, 64], [138, 134]]} />
      <rect x={121} y={82} width={34} height={32} rx={3} {...PAINT.raised} />
      <line x1={126} y1={106} x2={150} y2={90} stroke={MX.edge} strokeWidth={2.2} />
      <circle cx={138} cy={98} r={3.5} {...PAINT.shaft} />
      <rect x={155} y={88} width={32} height={20} rx={3} {...PAINT.body} />

      {/* foundation & machinery skid */}
      <Plinth x={170} y={262} w={466} h={16} />
      <rect x={330} y={224} width={296} height={38} rx={3} {...PAINT.body} />
      <CornerBolts x={330} y={224} w={296} h={38} inset={7} r={1.6} />

      {/* ID fan volute & stack outlet */}
      <path d={`M ${fx - 42} ${fy + 40} L ${fx + 42} ${fy + 40} L ${fx + 56} 262 L ${fx - 56} 262 Z`} {...PAINT.body} />
      <FkpPipe pts={[[fx + 28, fy - fr - 10], [fx + 28, 36], [355, 36]]} d={24} flanges={[[fx + 28, 82]]} />
      <Volute cx={fx} cy={fy} r={fr} outH={16} dir={1} rotor />
      <FlowTag x1={362} y1={36} x2={408} y2={36} label="TO BAGHOUSE / STACK" lx={425} ly={52} />

      {/* shaft, NDE & DE pedestal bearings, coupling, VFD motor, encoder */}
      <rect x={fx} y={fy - 4.5} width={235} height={9} rx={2} {...PAINT.shaft} />
      <PedestalBearing x={355} y={fy} w={30} base={224} />
      <PedestalBearing x={418} y={fy} w={30} base={224} />
      <Coupling x={450} y={fy - 12} w={24} h={24} />
      <MirrorX about={542}>
        <Motor x={484} y={132} w={116} h={92} />
      </MirrorX>
      <rect x={600} y={fy - 3} width={14} height={6} {...PAINT.shaft} />
      <EncoderCap x={612} cy={fy} w={22} h={46} />

      <MachineLabel x={138} y={222} size={7}>INLET DAMPER</MachineLabel>
      <MachineLabel x={fx} y={294} size={7.5}>PREHEATER ID FAN</MachineLabel>
      <MachineLabel x={355} y={142} size={7}>NDE</MachineLabel>
      <MachineLabel x={418} y={142} size={7}>DE</MachineLabel>
      <MachineLabel x={542} y={294} size={7.5}>VFD MOTOR (1,850 kW)</MachineLabel>
    </g>
  );
}

/* ==========================================================================
   4. PYR-BRN-01 · Multi-Channel Burner, PA Fan, Coal Bin & Coal Feeder
   ========================================================================== */

function BrnBurnerArt() {
  const lanceY = 136;
  return (
    <g>
      <GroundLine x1={70} x2={650} y={G_Y} />
      {/* kiln hot end with flame core */}
      <rect x={80} y={72} width={200} height={128} rx={5} {...PAINT.cylinder} />
      <rect x={90} y={82} width={188} height={108} rx={4} {...PAINT.recess} />
      <path d="M 92 174 Q 180 162 276 168 L 276 188 L 92 188 Z" fill={MX.material} opacity={0.75} />
      <ellipse cx={186} cy={lanceY} rx={82} ry={34} fill={MX.heat} />
      <ellipse cx={230} cy={lanceY} rx={36} ry={12} fill={MX.material} opacity={0.55} />
      <rect x={280} y={66} width={16} height={140} rx={3} {...PAINT.cylinderV} />

      {/* kiln outlet hood with refractory lining & secondary air throat */}
      <Housing x={296} y={48} w={128} h={176} rx={8} bolts={false} />
      <Brick x={298} y={56} w={16} h={160} row={6} course={12} />
      <CornerBolts x={296} y={48} w={128} h={176} inset={8} r={1.6} />
      <rect x={310} y={224} width={100} height={54} rx={5} {...PAINT.body} />
      <FlowArrow x1={340} y1={268} x2={340} y2={232} />
      <FlowArrow x1={388} y1={268} x2={388} y2={232} />
      <rect x={361} y={210} width={6} height={16} {...PAINT.shaft} />

      {/* roof flame camera */}
      <rect x={361} y={36} width={6} height={14} {...PAINT.shaft} />
      <rect x={342} y={20} width={44} height={18} rx={4} {...PAINT.raised} />
      <circle cx={354} cy={29} r={4} {...PAINT.recess} />
      <line x1={364} y1={48} x2={220} y2={130} stroke={MX.fine} strokeWidth={1} strokeDasharray="4 3" />

      {/* multi-channel burner lance, carriage & manifold */}
      <rect x={424} y={164} width={120} height={8} rx={2} {...PAINT.raised} />
      <Steel x={440} y={172} w={8} h={G_Y - 172} />
      <Steel x={526} y={172} w={8} h={G_Y - 172} />
      <rect x={312} y={lanceY - 8} width={226} height={16} rx={4} {...PAINT.shaft} />
      <Flange x={526} y={lanceY} w={18} />
      <Housing x={538} y={102} w={86} h={68} rx={8} panel={[12, 16, 62, 14]} />
      <Transmitter x={562} y={102} dir="up" len={16} />
      <Transmitter x={598} y={102} dir="up" len={16} />

      <MachineLabel x={180} y={218} size={7.5}>KILN BURNING ZONE</MachineLabel>
      <MachineLabel x={360} y={192} size={7.5}>OUTLET HOOD</MachineLabel>
      <MachineLabel x={360} y={294} size={7.5}>SECONDARY AIR FROM COOLER</MachineLabel>
      <MachineLabel x={581} y={192} size={7.5}>BURNER MANIFOLD</MachineLabel>
    </g>
  );
}

function BrnPaFanArt() {
  const spec: FanSpec = { cx: 455, cy: 196, r: 52, motorW: 96, motorH: 68, ductTop: 72, baseY: 262 };
  const fg = fanGeom(spec);
  const ductX = (fg.duct[0] + fg.duct[1]) / 2;
  return (
    <g>
      <GroundLine x1={80} x2={640} y={G_Y} />
      <Plinth x={180} y={262} w={370} h={16} />
      {/* overhead intake filter-silencer & VFD cabinet */}
      <Housing x={160} y={28} w={118} h={72} rx={6} />
      {[0, 1, 2, 3].map((k) => (
        <line key={k} x1={174 + k * 24} x2={174 + k * 24} y1={40} y2={88} stroke={MX.fine} strokeWidth={1.2} />
      ))}
      <ClkPipe pts={[[219, 100], [219, 118], [265, 118], [265, 144]]} w={16} />
      <MachineLabel x={219} y={20} size={7}>INTAKE FILTER SILENCER</MachineLabel>

      {/* reverse horizontal orientation: motor on left, bearing in center, volute on right */}
      <g transform="translate(720, 0) scale(-1, 1)">
        <FanSet {...spec} />
      </g>
      {/* primary air supply header */}
      <ClkPipe pts={[[720 - ductX, 74], [720 - ductX, 52], [585, 52]]} w={18} />
      <Flange x={720 - ductX} y={76} w={fg.duct[1] - fg.duct[0]} vertical />
      <Transmitter x={475} y={43} dir="up" len={14} />
      <FlowTag x1={592} y1={52} x2={636} y2={52} label="TO BURNER MANIFOLD" lx={570} ly={28} />

      <MachineLabel x={720 - fg.terminal[0]} y={294} size={7.5}>PA FAN MOTOR</MachineLabel>
      <MachineLabel x={720 - fg.bearing[0]} y={294} size={7.5}>BEARING PEDESTAL</MachineLabel>
      <MachineLabel x={720 - spec.cx} y={294} size={7.5}>PRIMARY-AIR FAN</MachineLabel>
    </g>
  );
}

function BrnCoalBinArt() {
  const bx = 310;
  const bw = 190;
  const roof = 58;
  const peak = roof - bw * 0.07;
  return (
    <g>
      <GroundLine x1={80} x2={640} y={G_Y} />
      {/* CO / CO2 analyser cabinet & N2 inerting rack */}
      <Plinth x={132} y={264} w={132} h={14} />
      <Housing x={144} y={32} w={108} h={54} rx={6} />
      <MachineLabel x={198} y={62} size={6.5} tone="ink">N₂ INERTING RACK</MachineLabel>
      <OilLine pts={[[252, 58], [bx, 68]]} w={4} />
      <rect x={144} y={96} width={108} height={168} rx={7} {...PAINT.body} />
      <rect x={152} y={104} width={92} height={152} rx={4} fill="none" stroke={MX.fine} strokeWidth={1} />
      <CornerBolts x={144} y={96} w={108} h={168} inset={7} r={1.5} />
      <rect x={162} y={118} width={72} height={32} rx={3} {...PAINT.recess} />
      <line x1={252} y1={116} x2={bx} y2={82} stroke={MX.fine} strokeWidth={1.4} strokeDasharray="4 3" />
      <MachineLabel x={184} y={138} size={7} tone="ink">CO / CO₂</MachineLabel>
      <MachineLabel x={198} y={226} size={7.5}>GAS ANALYSER</MachineLabel>

      {/* fine-coal bin with radar & sidewall temperature RTD */}
      <Silo x={bx} w={bw} roofY={roof} cylBottom={176} coneBottom={242} outletW={22} legBottom={G_Y} braceFrom={226} fill={115} />
      <Radar x={bx + bw / 2} y={peak} h={15} />
      <Transmitter x={bx} y={136} dir="left" len={12} />
      <Plinth x={bx - 16} y={G_Y - 8} w={bw + 32} h={8} />

      <MachineLabel x={bx + bw / 2} y={142} tone="ink">FINE-COAL BIN</MachineLabel>
    </g>
  );
}

function BrnCoalFeedArt() {
  const bCx = 548;
  const bCy = 212;
  const bR = 34;
  return (
    <g>
      <GroundLine x1={80} x2={640} y={G_Y} />
      {/* coal bin cone stub → rotor weighfeeder → rotary airlock → conveying line */}
      <path d="M 184 26 L 244 26 L 226 52 L 202 52 Z" {...PAINT.cylinderV} />
      <rect x={156} y={52} width={116} height={64} rx={7} {...PAINT.body} />
      <CornerBolts x={156} y={52} w={116} h={64} inset={6} r={1.5} />
      <circle cx={214} cy={84} r={18} {...PAINT.recess} />
      {[0, 60, 120].map((a) => (
        <line key={a} x1={214} y1={68} x2={214} y2={100} stroke={MX.edge} strokeWidth={1.5} transform={`rotate(${a} 214 84)`} />
      ))}
      <circle cx={214} cy={84} r={4} {...PAINT.shaft} />
      <rect x={204} y={116} width={20} height={38} {...PAINT.shaft} />

      {/* upper-right gravimetric dosing controller & intake silencer */}
      <Housing x={368} y={32} w={214} h={84} rx={7} />
      <rect x={384} y={48} width={86} height={52} rx={4} {...PAINT.recess} />
      <rect x={484} y={48} width={82} height={52} rx={4} {...PAINT.recess} />
      <MachineLabel x={427} y={76} size={6.5} tone="ink">PFISTER CONTROLLER</MachineLabel>
      <MachineLabel x={525} y={76} size={6.5} tone="ink">INTAKE SILENCER</MachineLabel>
      <ClkPipe pts={[[548, 116], [548, 178]]} w={10} />

      {/* pneumatic coal conveying line */}
      <ClkPipe pts={[[105, 160], [548, 160], [548, 178]]} w={14} />
      <Flange x={275} y={160} w={14} />
      <Flange x={465} y={160} w={14} />
      <Transmitter x={318} y={153} dir="up" len={14} />
      <FlowTag x1={142} y1={160} x2={96} y2={160} label="COAL TO BURNER" lx={132} ly={184} />

      {/* Roots coal conveying blower skid */}
      <Plinth x={352} y={262} w={256} h={16} />
      <Motor x={368} y={178} w={106} h={80} />
      <rect x={474} y={bCy - 4} width={44} height={8} {...PAINT.shaft} />
      <Coupling x={484} y={bCy - 12} w={18} h={24} />
      <path d={`M ${bCx - 22} ${bCy + 16} L ${bCx + 22} ${bCy + 16} L ${bCx + 28} 262 L ${bCx - 28} 262 Z`} {...PAINT.body} />
      <circle cx={bCx} cy={bCy} r={bR} {...PAINT.body} />
      <Fan cx={bCx} cy={bCy} r={bR * 0.72} />

      <MachineLabel x={214} y={42} size={7.5}>ROTOR WEIGHFEEDER</MachineLabel>
      <MachineLabel x={421} y={294} size={7.5}>BLOWER MOTOR</MachineLabel>
      <MachineLabel x={bCx} y={294} size={7.5}>ROOTS CONVEYING BLOWER</MachineLabel>
    </g>
  );
}

/* ==========================================================================
   5. PYR-CLR-01 · Grate Cooler Compartments, Fans, Drive, Discharge & Vent
   ========================================================================== */

function ClrCompartmentsArt({ start, hot }: { start: 1 | 4; hot: boolean }) {
  const slot = 186;
  const x0 = 84;
  return (
    <g>
      <CoolerFrame x1={76} x2={644} top={166} floor={270} floorX1={64} floorX2={656} />
      <GrateCasing
        x={72}
        y={56}
        w={576}
        h={110}
        bedL={hot ? 110 : 122}
        bedR={hot ? 126 : 132}
        hot={hot}
        label={hot ? "HOT RECUPERATION ZONE · CLINKER TRAVELS →" : "MAIN COOLING ZONE · CLINKER TRAVELS →"}
      />
      {hot && (
        <g>
          <path d="M 76 14 L 154 14 L 172 66 L 94 66 Z" {...PAINT.body} />
          <path d="M 84 18 L 146 18 L 162 64 L 102 64 Z" {...PAINT.recess} />
          <ellipse cx={124} cy={42} rx={26} ry={16} fill={MX.heat} />
          <Lumps pts={[[112, 28], [128, 36], [118, 48], [136, 48]]} r={2.5} />
        </g>
      )}
      {[0, 1, 2].map((i) => {
        const sx = x0 + i * slot;
        const tap: [number, number] = [sx + 88, 212];
        return (
          <g key={i}>
            <Compartment x={sx} y={172} w={slot - 8} h={76} n={start + i} tap={tap} />
            <rect x={sx + 74} y={248} width={30} height={22} rx={2} {...PAINT.cylinderV} />
          </g>
        );
      })}
    </g>
  );
}

function ClrFansArt({ start }: { start: 1 | 4 }) {
  const slot = 192;
  const specs: FanSpec[] = [0, 1, 2].map((i) => ({
    cx: 132 + i * slot,
    cy: 204,
    r: 34,
    motorW: 48,
    motorH: 36,
    ductTop: 76,
    baseY: 258,
  }));
  return (
    <g>
      <GroundLine x1={64} x2={656} y={G_Y} />
      {/* under-grate air distribution plenum above the three fans */}
      <Housing x={68} y={28} w={584} h={48} rx={6} bolts={false} />
      <CornerBolts x={68} y={28} w={584} h={48} inset={7} r={1.6} />
      <MachineLabel x={360} y={56} size={7.5}>{`UNDER-GRATE COMPARTMENTS ${start}–${start + 2} AIR HEADER`}</MachineLabel>

      {specs.map((f, i) => {
        const g = fanGeom(f);
        return (
          <g key={i}>
            <Plinth x={f.cx - 46} y={258} w={172} h={16} />
            <FanSet {...f} />
            <Flange x={(g.duct[0] + g.duct[1]) / 2} y={88} w={g.duct[1] - g.duct[0]} vertical />
            <MachineLabel x={f.cx + 38} y={294} size={7.5}>{`COOLING FAN ${start + i}`}</MachineLabel>
          </g>
        );
      })}
    </g>
  );
}

function ClrDriveArt() {
  return (
    <g>
      <GroundLine x1={70} x2={650} y={G_Y} />
      {/* movable grate drive frame & under-grate support columns */}
      <Steel x={108} y={162} w={10} h={G_Y - 162} />
      <Steel x={200} y={162} w={10} h={G_Y - 162} />
      <Brace x1={118} y1={170} x2={200} y2={G_Y - 8} />
      <Plinth x={92} y={G_Y - 10} w={132} h={10} />
      <Housing x={92} y={54} w={132} h={108} rx={8} />
      <rect x={106} y={76} width={104} height={64} rx={4} {...PAINT.recess} />
      <rect x={112} y={96} width={92} height={28} rx={2} fill={MX.material} opacity={0.85} />
      <MachineLabel x={158} y={44} size={7.5}>MOVABLE GRATE FRAME</MachineLabel>

      {/* hydraulic grate drive cylinder on pedestal */}
      <rect x={224} y={102} width={46} height={12} rx={2} {...PAINT.shaft} />
      <circle cx={224} cy={108} r={6} {...PAINT.raised} />
      <rect x={264} y={90} width={104} height={36} rx={6} {...PAINT.cylinder} />
      <rect x={260} y={86} width={10} height={44} rx={2} {...PAINT.raised} />
      <rect x={362} y={86} width={10} height={44} rx={2} {...PAINT.raised} />
      <rect x={286} y={72} width={60} height={14} rx={3} {...PAINT.body} />
      <Steel x={306} y={126} w={12} h={G_Y - 126} />
      <Plinth x={276} y={G_Y - 10} w={72} h={10} />
      <MachineLabel x={316} y={64} size={7}>STROKE SENSOR</MachineLabel>

      {/* high-pressure hydraulic lines to HPU + upper accumulator rack */}
      <Housing x={426} y={36} w={184} h={56} rx={6} />
      {[0, 1, 2].map((k) => (
        <rect key={k} x={450 + k * 52} y={46} width={32} height={36} rx={8} {...PAINT.cylinderV} />
      ))}
      <MachineLabel x={518} y={26} size={7}>N₂ BLADDER ACCUMULATORS</MachineLabel>
      <OilLine pts={[[340, 126], [340, 162], [442, 162]]} w={5} />
      <OilLine pts={[[284, 126], [284, 184], [442, 184]]} w={5} />

      {/* Hydraulic Power Unit (HPU) */}
      <Plinth x={416} y={G_Y - 12} w={204} h={12} />
      <Housing x={426} y={148} w={184} h={118} rx={8} />
      <rect x={442} y={182} width={88} height={68} rx={4} {...PAINT.recess} />
      <rect x={446} y={198} width={80} height={48} rx={2} fill={MX.material} opacity={0.9} />
      <Motor x={542} y={184} w={54} h={42} terminalBox={false} />
      {/* valve manifold block on top of HPU */}
      <rect x={442} y={118} width={68} height={30} rx={4} {...PAINT.raised} />
      {[0, 1, 2].map((k) => (
        <rect key={k} x={452 + k * 18} y={126} width={10} height={14} rx={2} {...PAINT.recess} />
      ))}

      <MachineLabel x={476} y={108} size={7.5}>VALVE MANIFOLD</MachineLabel>
      <MachineLabel x={518} y={294} size={7.5}>HYDRAULIC POWER UNIT (HPU)</MachineLabel>
    </g>
  );
}

function ClrDischargeArt() {
  return (
    <g>
      <GroundLine x1={70} x2={650} y={G_Y} />
      {/* grate cooler outlet section */}
      <GrateCasing x={88} y={64} w={256} h={110} bedL={124} bedR={132} label="GRATE COOLER OUTLET →" />
      <Steel x={104} y={174} w={10} h={G_Y - 174} />
      <Steel x={320} y={174} w={10} h={G_Y - 174} />

      {/* refractory-lined clinker discharge chute & grizzly breaker bars */}
      <path d="M 340 92 L 430 92 L 474 232 L 378 232 Z" {...PAINT.body} />
      <path d="M 350 100 L 420 100 L 460 226 L 390 226 Z" {...PAINT.recess} />
      <Lumps pts={[[378, 126], [396, 146], [388, 168], [412, 182], [404, 204], [428, 212]]} r={3.2} />
      <rect x={372} y={232} width={110} height={32} rx={5} {...PAINT.body} />
      <rect x={380} y={238} width={94} height={20} rx={3} {...PAINT.recess} />
      {Array.from({ length: 8 }).map((_, i) => (
        <circle key={i} cx={390 + i * 11} cy={248} r={3.2} fill={MX.material} />
      ))}

      {/* optical IR pyrometer on mounting stand aimed at falling clinker */}
      <Steel x={568} y={118} w={8} h={G_Y - 118} />
      <Plinth x={544} y={G_Y - 8} w={56} h={8} />
      <rect x={528} y={108} width={48} height={6} {...PAINT.shaft} />
      <g transform="rotate(24 522 108)">
        <rect x={496} y={96} width={52} height={24} rx={5} {...PAINT.raised} />
        <rect x={488} y={102} width={10} height={12} rx={2} {...PAINT.recess} />
      </g>
      <line x1={488} y1={122} x2={406} y2={166} stroke={MX.label} strokeWidth={1.2} strokeDasharray="4 3" />

      <MachineLabel x={427} y={288} size={7.5}>DISCHARGE THROAT → CRUSHER</MachineLabel>
      <MachineLabel x={535} y={80} size={7.5}>OPTICAL IR PYROMETER</MachineLabel>
    </g>
  );
}

function ClrVentArt() {
  const vent: FanSpec = { cx: 392, cy: 174, r: 46, motorW: 78, motorH: 54, ductTop: 94, baseY: 232 };
  const vg = fanGeom(vent);
  const ductX = (vg.duct[0] + vg.duct[1]) / 2;
  return (
    <g>
      <GroundLine x1={70} x2={650} y={G_Y} />
      {/* cooler hood exhaust riser, drop-out settling chamber & overhead duct */}
      <Housing x={96} y={176} w={116} h={94} rx={6} />
      <MachineLabel x={154} y={226} size={7.5}>COOLER HOOD</MachineLabel>
      <Housing x={226} y={96} w={84} h={174} rx={6} />
      <rect x={238} y={112} width={60} height={120} rx={3} {...PAINT.recess} />
      <MachineLabel x={268} y={172} size={6.5} tone="ink">DUST TRAP</MachineLabel>
      <ClkPipe pts={[[154, 176], [154, 52], [ductX, 52], [ductX, 96]]} w={24} />
      <Flange x={154} y={120} w={24} vertical />
      <Flange x={ductX} y={76} w={24} vertical />
      <rect x={224} y={34} width={8} height={36} rx={2} {...PAINT.raised} />
      <Transmitter x={288} y={40} dir="up" len={14} />

      {/* vent fan platform & fan set */}
      <Steel x={338} y={240} w={8} h={G_Y - 240} />
      <Steel x={604} y={240} w={8} h={G_Y - 240} />
      <Brace x1={346} y1={244} x2={604} y2={G_Y - 4} />
      <Plinth x={324} y={232} w={302} h={10} />
      <FanSet {...vent} />
      <MachineLabel x={288} y={22} size={7.5}>COOLER EXHAUST DUCT</MachineLabel>
      <MachineLabel x={475} y={260} size={7.5}>COOLER VENT FAN &amp; MOTOR</MachineLabel>
    </g>
  );
}

/* ==========================================================================
   6. PYR-CCT-01 (HMR-01 + CSL-01) · Hammer Crusher, Pan Conveyor & Clinker Silo
   ========================================================================== */

function HmrMotorArt() {
  const sy = 166;
  return (
    <g>
      <GroundLine x1={80} x2={640} y={G_Y} />
      <Plinth x={116} y={252} w={488} h={18} />
      <rect x={136} y={236} width={310} height={16} rx={2} {...PAINT.raised} />

      {/* crusher drive motor */}
      <rect x={176} y={224} width={28} height={12} {...PAINT.body} />
      <rect x={346} y={224} width={28} height={12} {...PAINT.body} />
      <Motor x={156} y={96} w={224} h={132} />

      {/* drive shaft, pin-bush coupling & crusher DE bearing pedestal */}
      <rect x={380} y={sy - 7} width={186} height={14} rx={2} {...PAINT.shaft} />
      <Coupling x={432} y={sy - 26} w={34} h={52} />
      <Pillow x={526} y={sy - 34} w={48} h={86} />

      <MachineLabel x={268} y={292} size={7.5}>CRUSHER DRIVE MOTOR (160 kW)</MachineLabel>
      <MachineLabel x={449} y={214} size={7.5}>PIN-BUSH COUPLING</MachineLabel>
      <MachineLabel x={550} y={118} size={7.5}>TO CRUSHER ROTOR</MachineLabel>
    </g>
  );
}

function HmrRotorArt() {
  const sy = 166;
  const rotCx = 360;
  const rotR = 52;
  const nde = 232;
  const de = 488;
  return (
    <g>
      <GroundLine x1={80} x2={640} y={G_Y} />
      <Plinth x={116} y={252} w={488} h={18} />
      <rect x={136} y={236} width={448} height={16} rx={2} {...PAINT.raised} />

      {/* input shaft & rotor speed pickup */}
      <rect x={128} y={sy - 6} width={400} height={12} rx={2} {...PAINT.shaft} />
      <rect x={164} y={sy - 14} width={16} height={28} rx={2} {...PAINT.raised} />
      <rect x={169} y={sy + 14} width={6} height={18} {...PAINT.shaft} />
      <rect x={162} y={sy + 32} width={20} height={10} rx={2} {...PAINT.body} />

      {/* top clinker feed chute & octagonal crusher casing */}
      <rect x={338} y={24} width={44} height={54} rx={3} {...PAINT.cylinderV} />
      <rect x={346} y={28} width={28} height={46} rx={2} {...PAINT.recess} />
      <Lumps pts={[[356, 38], [364, 52], [358, 66]]} r={2.8} />
      <path d="M 272 236 L 272 128 L 314 78 L 406 78 L 448 128 L 448 236 Z" {...PAINT.body} />
      <path d="M 282 228 L 282 132 L 320 86 L 400 86 L 438 132 L 438 228 Z" fill="none" stroke={MX.fine} strokeWidth={1} />

      {/* hammer rotor & swing hammers */}
      <circle cx={rotCx} cy={sy} r={rotR + 6} {...PAINT.recess} />
      <circle cx={rotCx} cy={sy} r={rotR} {...PAINT.raised} />
      {Array.from({ length: 6 }).map((_, i) => {
        const a = ((i * 60) * Math.PI) / 180;
        const hx = rotCx + Math.cos(a) * rotR * 0.64;
        const hy = sy + Math.sin(a) * rotR * 0.64;
        return <rect key={i} x={hx - 7} y={hy - 5.5} width={14} height={11} rx={2} {...PAINT.body} />;
      })}
      <circle cx={rotCx} cy={sy} r={11} {...PAINT.shaft} />

      {/* NDE & DE rotor bearing blocks */}
      <Pillow x={nde - 20} y={sy - 32} w={40} h={82} />
      <Pillow x={de - 20} y={sy - 32} w={40} h={82} />

      <MachineLabel x={172} y={224} size={7}>SPEED PICKUP</MachineLabel>
      <MachineLabel x={nde} y={118} size={7.5}>NDE BEARING</MachineLabel>
      <MachineLabel x={de} y={118} size={7.5}>DE BEARING</MachineLabel>
      <MachineLabel x={rotCx} y={292} size={7.5}>CLINKER HAMMER CRUSHER</MachineLabel>
    </g>
  );
}

function CslConveyorArt() {
  const tail: [number, number] = [156, 224];
  const head: [number, number] = [488, 114];
  const len = Math.hypot(head[0] - tail[0], head[1] - tail[1]);
  const ang = (Math.atan2(head[1] - tail[1], head[0] - tail[0]) * 180) / Math.PI;
  return (
    <g>
      <GroundLine x1={70} x2={650} y={G_Y} />
      {/* trestle bents */}
      <Steel x={266} y={196} w={8} h={G_Y - 196} />
      <Steel x={386} y={156} w={8} h={G_Y - 156} />
      <Brace x1={274} y1={204} x2={386} y2={G_Y - 4} />
      {/* tail stand & loading chute */}
      <path d={`M ${tail[0] - 18} ${G_Y} L ${tail[0] - 8} ${tail[1] + 12} L ${tail[0] + 8} ${tail[1] + 12} L ${tail[0] + 18} ${G_Y} Z`} {...PAINT.body} />
      <path d="M 122 146 L 168 146 L 164 196 L 130 196 Z" {...PAINT.body} />
      <Lumps pts={[[142, 162], [150, 178]]} r={2.5} />

      {/* inclined deep-pan apron conveyor */}
      <g transform={`translate(${tail[0]} ${tail[1]}) rotate(${ang})`}>
        <rect x={-20} y={-15} width={len + 40} height={30} rx={14} {...PAINT.body} />
        <rect x={-8} y={-10} width={len + 16} height={10} rx={2} {...PAINT.recess} />
        {Array.from({ length: Math.floor(len / 24) }).map((_, i) => (
          <rect key={i} x={8 + i * 24} y={-9} width={15} height={7} rx={1.5} fill={MX.material} />
        ))}
        {[0, len].map((sx) => (
          <g key={sx}>
            <circle cx={sx} cy={0} r={12} {...PAINT.raised} />
            <circle cx={sx} cy={0} r={4.5} {...PAINT.shaft} />
          </g>
        ))}
      </g>

      {/* head drive platform: motor, coupling, reducer, chain guard */}
      <Steel x={378} y={92} w={7} h={64} />
      <Plinth x={358} y={86} w={178} h={7} bolts={false} />
      <path d={`M 502 82 L ${head[0] + 12} ${head[1] - 4} L ${head[0] - 4} ${head[1] + 8} L 486 86 Z`} {...PAINT.body} />
      <Motor x={368} y={40} w={76} h={46} />
      <Coupling x={450} y={53} w={14} h={20} />
      <Housing x={470} y={34} w={54} h={52} rx={6} bolts={false} />
      <GearWheel cx={488} cy={62} r={10} teeth={10} />
      <circle cx={508} cy={66} r={5} {...PAINT.shaft} />

      {/* head discharge chute to clinker silo */}
      <Tube x1={head[0] + 10} y1={head[1] + 2} x2={590} y2={156} d={16} paint={PAINT.body} />
      <FlowTag x1={556} y1={174} x2={608} y2={174} label="TO CLINKER SILO" lx={582} ly={192} />

      <MachineLabel x={tail[0]} y={258} size={7.5}>TAIL SHAFT</MachineLabel>
      <MachineLabel x={446} y={24} size={7.5}>HEAD DRIVE &amp; REDUCER</MachineLabel>
      <MachineLabel x={330} y={294} size={7.5}>INCLINED DEEP-PAN CONVEYOR</MachineLabel>
    </g>
  );
}

function CslSiloArt() {
  const sx = 236;
  const sw = 228;
  const roof = 114;
  return (
    <g>
      <GroundLine x1={70} x2={650} y={G_Y} />
      {/* clinker storage silo */}
      <Silo x={sx} w={sw} roofY={roof} cylBottom={232} coneBottom={264} outletW={36} legBottom={G_Y} braceFrom={250} fill={162} />
      {/* roof feed chute & radar */}
      <Tube x1={178} y1={78} x2={256} y2={112} d={14} paint={PAINT.body} />
      <Radar x={295} y={roof - 6} h={16} />

      {/* roof pulse-jet baghouse & differential pressure transmitter */}
      <path d="M 358 98 H 436 L 422 110 H 372 Z" {...PAINT.body} />
      <Housing x={354} y={32} w={86} h={66} rx={5} bolts={false} />
      {Array.from({ length: 5 }).map((_, i) => (
        <line key={i} x1={369 + i * 14} x2={369 + i * 14} y1={42} y2={90} stroke={MX.fine} strokeWidth={1} />
      ))}
      <rect x={336} y={48} width={16} height={16} rx={3} {...PAINT.raised} />

      {/* dust collector fan & motor on roof platform */}
      <Plinth x={462} y={88} w={118} h={6} bolts={false} />
      <ClkPipe pts={[[440, 62], [548, 62]]} w={10} />
      <Motor x={470} y={50} w={54} h={38} />
      <circle cx={552} cy={66} r={20} {...PAINT.raised} />
      <Fan cx={552} cy={66} r={14} />

      <MachineLabel x={397} y={20} size={7.5}>ROOF BAGHOUSE</MachineLabel>
      <MachineLabel x={526} y={36} size={7.5}>DUST FAN</MachineLabel>
      <MachineLabel x={sx + sw / 2} y={294} size={7.5}>CLINKER STORAGE SILO</MachineLabel>
    </g>
  );
}

/* ==========================================================================
   7. PYR-KLN-01 & KLN-01 Shared Enhanced Sub-Assemblies
   ========================================================================== */

export function KilnGirthSprayArt() {
  const cols = [238, 258, 278, 298, 318, 338];
  const nozzles = [390, 425, 460, 510, 545, 580];
  return (
    <g>
      <GroundLine x1={80} x2={640} y={G_Y} />
      {/* upper-left compressed air receiver & pneumatic solenoid manifold */}
      <Housing x={102} y={24} w={116} h={74} rx={7} />
      <rect x={114} y={38} width={92} height={44} rx={12} {...PAINT.cylinder} />
      <MachineLabel x={160} y={63} size={6.5} tone="ink">AIR RECEIVER (6 BAR)</MachineLabel>
      <Housing x={228} y={24} w={122} h={74} rx={7} />
      <rect x={240} y={38} width={98} height={22} rx={3} {...PAINT.recess} />
      <rect x={240} y={64} width={98} height={22} rx={3} {...PAINT.recess} />
      <MachineLabel x={289} y={52} size={6} tone="ink">AIR FRL &amp; SOLENOIDS</MachineLabel>
      <MachineLabel x={289} y={78} size={6} tone="ink">PNEUMATIC PUMP</MachineLabel>
      <ClkPipe pts={[[218, 56], [228, 56]]} w={8} />
      <OilLine pts={[[151, 98], [151, 116]]} w={4} />
      <OilLine pts={[[289, 98], [289, 166]]} w={4} />
      <OilLine pts={[[350, 56], [372, 56], [372, 142], [378, 142]]} w={4} />

      {/* spray controller cabinet & lubricant drum */}
      <Plinth x={96} y={G_Y - 8} w={110} h={8} />
      <Housing x={102} y={116} w={98} h={154} rx={8} />
      <rect x={114} y={128} width={74} height={28} rx={3} {...PAINT.recess} />
      <rect x={114} y={166} width={74} height={90} rx={4} {...PAINT.recess} />
      <rect x={118} y={178} width={66} height={74} rx={2} fill={MX.material} opacity={0.9} />
      <MachineLabel x={140} y={145} size={6} tone="ink">CONTROLLER</MachineLabel>
      <MachineLabel x={151} y={292} size={7}>SPRAY UNIT</MachineLabel>

      {/* 6-circuit progressive metering divider */}
      <OilLine pts={[[200, 196], [226, 196]]} w={4} />
      {cols.map((cx, i) => (
        <OilLine key={cx} pts={[[cx, 166], [cx, 134 - i * 4], [nozzles[i], 134 - i * 4], [nozzles[i], 144]]} w={2.6} />
      ))}
      <rect x={226} y={166} width={124} height={68} rx={6} {...PAINT.body} />
      <Steel x={244} y={234} w={8} h={G_Y - 234} />
      <Steel x={324} y={234} w={8} h={G_Y - 234} />
      {cols.map((cx) => (
        <rect key={cx} x={cx - 6} y={176} width={12} height={48} rx={5} {...PAINT.shaft} />
      ))}
      <MachineLabel x={288} y={250} size={7}>METERING DIVIDER</MachineLabel>

      {/* kiln shell, girth gear arc & spray header */}
      <Shell x={360} y={24} w={250} h={64} seam={48} />
      <path d="M 380 88 Q 485 118 590 88 L 590 108 Q 485 138 380 108 Z" {...PAINT.raised} />
      <rect x={378} y={138} width={214} height={8} rx={2} {...PAINT.shaft} />
      {nozzles.map((nx) => (
        <SprayNozzle key={nx} x={nx} y={146} h={22} spread={12} />
      ))}

      {/* 24-tooth pinion & split pillow-block bearings */}
      <Plinth x={378} y={G_Y - 12} w={214} h={12} />
      <rect x={392} y={210} width={186} height={14} rx={2} {...PAINT.shaft} />
      <GearWheel cx={485} cy={216} r={38} teeth={24} hub={12} />
      <Pillow x={402} y={186} w={34} h={80} />
      <Pillow x={534} y={186} w={34} h={80} />

      <MachineLabel x={485} y={56} tone="ink">KILN SHELL &amp; GIRTH GEAR (168 T)</MachineLabel>
      <MachineLabel x={485} y={292} size={7.5}>PINION (24 T) &amp; BEARINGS</MachineLabel>
    </g>
  );
}

export function KilnStationFullArt({ station }: { station: 1 | 2 | 3 }) {
  const dist = station === 1 ? "11 m" : station === 2 ? "39 m" : "60 m";
  const roller = (y: number, name: string) => (
    <g>
      <rect x={230} y={y - 14} width={220} height={28} rx={5} {...PAINT.cylinder} />
      <MachineLabel x={340} y={y + 3} tone="ink" size={7.5}>{name}</MachineLabel>
      {[216, 442].map((bx, i) => (
        <g key={bx}>
          <Pillow x={bx} y={y - 22} w={32} h={44} />
          <MachineLabel x={bx + 16} y={y - 28} size={7} tone="ink">{i === 0 ? "A" : "B"}</MachineLabel>
        </g>
      ))}
    </g>
  );
  return (
    <g>
      {/* kiln shell & riding tyre with tyre-slip pickup */}
      <Shell x={140} y={124} w={420} h={62} seam={70} />
      <TyreBand cx={340} y={110} w={46} h={90} />
      <rect x={332} y={88} width={16} height={18} rx={3} {...PAINT.raised} />
      <MachineLabel x={225} y={158} tone="ink">{`KILN SHELL · TYRE ${station} (${dist})`}</MachineLabel>

      {/* left & right support rollers + oil baths */}
      {roller(62, "LEFT SUPPORT ROLLER")}
      {roller(248, "RIGHT SUPPORT ROLLER")}
      {[102, 208].map((oy, i) => (
        <g key={oy}>
          <rect x={268} y={oy - 8} width={44} height={16} rx={3} {...PAINT.body} />
          <rect x={273} y={oy - 4} width={34} height={8} rx={1.5} fill={MX.material} />
          <MachineLabel x={260} y={oy + 3} anchor="end" size={6.5}>{i === 0 ? "LEFT OIL BATH" : "RIGHT OIL BATH"}</MachineLabel>
        </g>
      ))}
    </g>
  );
}

export function KilnInletFullArt() {
  return (
    <g>
      <GroundLine x1={80} x2={640} y={G_Y} />
      {/* riser duct & C6 meal pipe */}
      <rect x={180} y={24} width={64} height={116} rx={4} {...PAINT.cylinderV} />
      <FlowArrow x1={212} y1={124} x2={212} y2={48} />
      <MealPipe pts={[[310, 34], [244, 118]]} d={9} />

      {/* refractory-lined inlet chamber & lamella seal */}
      <Steel x={156} y={246} w={10} h={G_Y - 246} />
      <Steel x={260} y={246} w={10} h={G_Y - 246} />
      <rect x={146} y={132} width={132} height={116} rx={8} {...PAINT.body} />
      <Refractory x={154} y={140} w={116} h={100} course={7} brick={14} />
      <CornerBolts x={146} y={132} w={132} h={116} inset={7} r={1.5} />

      {/* inlet lamella seal & rotating kiln shell */}
      <rect x={278} y={144} width={26} height={92} rx={3} {...PAINT.raised} />
      <Shell x={304} y={150} w={276} h={80} seam={68} />
      <MachineLabel x={442} y={194} tone="ink">KILN SHELL</MachineLabel>

      {/* sample probe & extractive gas analyser cabinet */}
      <rect x={282} y={134} width={18} height={12} rx={2} {...PAINT.raised} />
      <line x1={291} y1={134} x2={380} y2={92} stroke={MX.label} strokeWidth={1.3} strokeDasharray="3 3" />
      <Housing x={356} y={32} w={116} h={60} rx={6} />
      <MachineLabel x={414} y={50} size={7.5} tone="ink">GAS ANALYSER</MachineLabel>
      <MachineLabel x={212} y={292} size={7.5}>KILN INLET &amp; SEAL</MachineLabel>
    </g>
  );
}

export function KilnOutletFullArt() {
  return (
    <g>
      <GroundLine x1={80} x2={640} y={G_Y} />
      {/* kiln shell hot end, cow shell shroud & sector plates */}
      <Shell x={110} y={96} w={260} h={112} seam={64} />
      <ellipse cx={330} cy={152} rx={54} ry={40} fill={MX.heat} />
      <rect x={296} y={84} width={86} height={136} rx={8} fill="none" stroke={MX.label} strokeWidth={1.3} strokeDasharray="5 4" />
      <Refractory x={368} y={92} w={18} h={120} course={6} brick={12} />

      {/* outlet seal cooling fan & duct */}
      <ClkPipe pts={[[286, 250], [344, 250], [344, 218]]} w={14} />
      <SideMotor x={198} y={232} w={56} h={36} />
      <circle cx={280} cy={250} r={22} {...PAINT.body} />
      <Fan cx={280} cy={250} r={16} />

      {/* kiln firing hood, roof pyrometer & burner lance */}
      <Housing x={386} y={52} w={156} h={198} rx={10} />
      <Refractory x={390} y={60} w={18} h={182} course={6} brick={12} />
      <rect x={464} y={144} width={144} height={16} rx={3} {...PAINT.shaft} />
      <rect x={472} y={28} width={34} height={24} rx={4} {...PAINT.raised} />
      <line x1={489} y1={52} x2={346} y2={148} stroke={MX.label} strokeWidth={1.1} strokeDasharray="4 3" />

      <MachineLabel x={220} y={152} tone="ink">KILN HOT END</MachineLabel>
      <MachineLabel x={338} y={74} size={7}>COW SHELL &amp; SECTOR PLATES</MachineLabel>
      <MachineLabel x={464} y={268} size={7.5}>KILN FIRING HOOD</MachineLabel>
      <MachineLabel x={256} y={292} size={7}>OUTLET COOLING FAN</MachineLabel>
    </g>
  );
}

/* ==========================================================================
   8. Fleet Sub-Assemblies (Crusher, Conveyor, Mills, Pumps, Agitator, Blower)
   ========================================================================== */

function CrushSpiderArt() {
  return (
    <g>
      <GroundLine x1={100} x2={620} y={G_Y} />
      <path d="M 180 124 H 540 L 510 264 H 210 Z" {...PAINT.body} />
      <path d="M 206 134 H 514 L 490 254 H 230 Z" {...PAINT.recess} />
      <rect x={156} y={92} width={408} height={34} rx={8} {...PAINT.raised} />
      <Housing x={312} y={56} w={96} h={92} rx={8} />
      <rect x={346} y={148} width={28} height={116} rx={3} {...PAINT.shaft} />
      <OilLine pts={[[210, 76], [312, 76]]} w={5} />
      <Transmitter x={260} y={68} dir="up" len={14} />
      <MachineLabel x={360} y={42} size={7.5}>SPIDER CAP &amp; UPPER BUSHING</MachineLabel>
    </g>
  );
}

function CrushChamberArt() {
  return (
    <g>
      <GroundLine x1={100} x2={620} y={G_Y} />
      <path d="M 190 48 H 530 L 470 256 H 250 Z" {...PAINT.body} />
      <path d="M 214 58 H 506 L 452 246 H 268 Z" fill={MX.material} opacity={0.75} />
      <path d="M 360 66 L 298 228 H 422 Z" {...PAINT.raised} />
      <rect x={352} y={36} width={16} height={232} rx={2} {...PAINT.shaft} />
      <MachineLabel x={360} y={292} size={7.5}>MAIN SHAFT &amp; CONCAVE CRUSHING CHAMBER</MachineLabel>
    </g>
  );
}

function CrushDriveArt() {
  return (
    <g>
      <GroundLine x1={90} x2={630} y={G_Y} />
      <Plinth x={120} y={252} w={480} h={18} />
      <Motor x={140} y={128} w={156} h={116} />
      <rect x={296} y={180} width={210} height={14} rx={2} {...PAINT.shaft} />
      <Coupling x={312} y={168} w={22} h={38} />
      <Housing x={354} y={142} w={164} h={96} rx={8} />
      <GearWheel cx={496} cy={186} r={28} teeth={16} />
      <MachineLabel x={218} y={292} size={7.5}>MV DRIVE MOTOR (1,000 kW)</MachineLabel>
      <MachineLabel x={436} y={292} size={7.5}>COUNTERSHAFT &amp; PINION</MachineLabel>
    </g>
  );
}

function CrushHydrosetArt() {
  return (
    <g>
      <GroundLine x1={120} x2={600} y={G_Y} />
      <Housing x={240} y={44} w={240} h={110} rx={8} />
      <rect x={348} y={36} width={24} height={156} rx={3} {...PAINT.shaft} />
      <rect x={296} y={154} width={128} height={106} rx={8} {...PAINT.cylinderV} />
      <rect x={312} y={196} width={96} height={52} rx={4} fill={MX.material} opacity={0.85} />
      <OilLine pts={[[424, 212], [516, 212]]} w={5} />
      <Transmitter x={476} y={204} dir="up" len={14} />
      <MachineLabel x={360} y={292} size={7.5}>HYDROSET CYLINDER &amp; ECCENTRIC</MachineLabel>
    </g>
  );
}

function MillTrunnionArt({ side }: { side: "FEED" | "DISCHARGE" }) {
  return (
    <g>
      <GroundLine x1={100} x2={620} y={G_Y} />
      <Plinth x={180} y={248} w={360} h={22} />
      <Shell x={side === "FEED" ? 390 : 130} y={64} w={200} h={156} seam={66} />
      <rect x={256} y={106} width={208} height={72} rx={6} {...PAINT.shaft} />
      <Pillow x={304} y={96} w={112} h={152} />
      <MachineLabel x={360} y={292} size={7.5}>{`${side} HYDROSTATIC TRUNNION BEARING`}</MachineLabel>
    </g>
  );
}

function MillShellArt() {
  return (
    <g>
      <GroundLine x1={90} x2={630} y={G_Y} />
      <Plinth x={140} y={252} w={440} h={18} />
      <path d="M 220 56 L 176 124 V 188 L 220 248 Z" {...PAINT.body} />
      <path d="M 500 56 L 544 124 V 188 L 500 248 Z" {...PAINT.body} />
      <rect x={220} y={56} width={280} height={192} rx={6} {...PAINT.cylinder} />
      <rect x={236} y={176} width={248} height={58} rx={4} fill={MX.material} opacity={0.8} />
      <GearEdge x={372} y={44} w={24} h={216} n={22} />
      <MachineLabel x={360} y={292} size={7.5}>ROTATING MILL SHELL &amp; GIRTH GEAR</MachineLabel>
    </g>
  );
}

function PumpVoluteArt() {
  return (
    <g>
      <GroundLine x1={90} x2={630} y={G_Y} />
      <Plinth x={140} y={252} w={420} h={18} />
      <rect x={140} y={158} width={180} height={18} rx={2} {...PAINT.shaft} />
      <Housing x={220} y={118} w={96} h={98} rx={8} />
      <rect x={410} y={48} width={140} height={42} rx={5} {...PAINT.cylinder} />
      <circle cx={400} cy={166} r={82} {...PAINT.body} />
      <circle cx={400} cy={166} r={56} fill="none" stroke={MX.fine} />
      <circle cx={400} cy={166} r={28} {...PAINT.shaft} />
      <MachineLabel x={268} y={238} size={7}>GLAND SEAL</MachineLabel>
      <MachineLabel x={400} y={292} size={7.5}>SLURRY VOLUTE &amp; DISCHARGE</MachineLabel>
    </g>
  );
}

function AgitSealShaftArt() {
  return (
    <g>
      <GroundLine x1={100} x2={620} y={G_Y} />
      <Housing x={180} y={136} w={360} h={134} rx={10} />
      <rect x={196} y={176} width={328} height={82} rx={6} fill={MX.material} opacity={0.75} />
      <Housing x={312} y={56} w={96} h={80} rx={6} />
      <rect x={232} y={68} width={52} height={56} rx={5} {...PAINT.raised} />
      <OilLine pts={[[284, 84], [312, 84]]} w={4} />
      <rect x={352} y={32} width={16} height={206} rx={2} {...PAINT.shaft} />
      <path d="M 288 226 L 352 216 L 352 232 Z M 432 226 L 368 216 L 368 232 Z" {...PAINT.raised} />
      <MachineLabel x={258} y={56} size={7}>BARRIER POT</MachineLabel>
      <MachineLabel x={360} y={292} size={7.5}>MECHANICAL SEAL &amp; IMPELLER SHAFT</MachineLabel>
    </g>
  );
}

/* ==========================================================================
   Registry of Pyro & Fleet Sub-Assembly Drawings + Pad Coordinates
   ========================================================================== */

export const SUBASSEMBLY_DRAWINGS: Record<string, SubAssemblyDrawingDef> = {
  // PYR-FED-01 · feed silo (FSL-01)
  "fsl-silo": {
    Art: FslSiloArt,
    pads: {
      "LEV-FSL-01": [330, 22],
      "STS-FSL-01": [368, 250],
    },
  },
  "fsl-aeration": {
    Art: FslAerationArt,
    pads: {
      "STS-FSL-02": [154, 168],
      "ELE-FSL-01": [288, 174],
      "PRS-FSL-01": [498, 55],
    },
  },

  // PYR-FED-01 · kiln feed (KFS-01)
  "kfs-bin": {
    Art: KfsBinArt,
    pads: {
      "WGT-KFS-01": [252, 264],
      "LEV-KFS-01": [350, 36],
      "LEV-KFS-02": [486, 84],
      "LEV-KFS-03": [444, 204],
    },
  },
  "kfs-dosing": {
    Art: KfsDosingArt,
    pads: {
      "POS-KFS-01": [126, 107],
      "PRS-KFS-01": [310, 192],
      "FLO-KFS-01": [504, 196],
      "PRS-KFS-02": [548, 120],
    },
  },
  "kfs-elevator": {
    Art: KfsElevatorArt,
    pads: {
      "SPD-KFS-01": [232, 58],
      "TMP-KFS-01": [322, 58],
      "VIB-KFS-01": [422, 54],
      "ELE-KFS-01": [545, 26],
    },
  },

  // PYR-PHC-01
  "phc-upper": {
    Art: PhcUpperArt,
    pads: {
      "PRS-PHC-01": [140, 36],
      "TMP-PHC-01": [195, 48],
      "PRS-PHC-02": [312, 92],
      "TMP-PHC-02": [365, 58],
      "TMP-PHC-03": [535, 68],
      "PRS-PHC-03": [588, 108],
    },
  },
  "phc-lower": {
    Art: PhcLowerArt,
    pads: {
      "PRS-PHC-04": [142, 86],
      "PRS-PHC-07": [165, 178],
      "TMP-PHC-04": [195, 48],
      "PRS-PHC-05": [312, 96],
      "PRS-PHC-08": [335, 188],
      "TMP-PHC-05": [365, 58],
      "PRS-PHC-09": [505, 198],
      "TMP-PHC-06": [535, 68],
      "PRS-PHC-06": [588, 108],
    },
  },
  "phc-riser": {
    Art: PhcRiserArt,
    pads: {
      "TMP-PHC-07": [318, 228],
      "TMP-PHC-08": [475, 108],
    },
  },
  "phc-exitgas": {
    Art: PhcExitGasArt,
    pads: {
      "GAS-PHC-01": [334, 178],
      "GAS-PHC-02": [406, 178],
      "CAL-PHC-01": [512, 64],
    },
  },
  "phc-idfan": {
    Art: PhcIdFanArt,
    pads: {
      "POS-PHC-01": [168, 98],
      "VIB-PHC-02": [355, 168],
      "TMP-PHC-10": [355, 206],
      "VIB-PHC-01": [418, 168],
      "TMP-PHC-09": [418, 206],
      "ELE-PHC-01": [542, 120],
      "SPD-PHC-01": [623, 184],
    },
  },

  // PYR-KLN-01
  "kln-girth": {
    Art: KilnGirthSprayArt,
    pads: {
      "STS-KLN-05": [176, 142],
      "PRX-KLN-01": [238, 222],
      "PRX-KLN-02": [258, 222],
      "PRX-KLN-03": [278, 222],
      "PRX-KLN-04": [298, 222],
      "PRX-KLN-05": [318, 222],
      "PRX-KLN-06": [338, 222],
      "VIB-KLN-04": [419, 206],
      "SPD-KLN-01": [551, 206],
    },
  },
  "kln-st1": {
    Art: () => <KilnStationFullArt station={1} />,
    pads: {
      "TMP-KLN-01": [232, 62],
      "TMP-KLN-03": [232, 248],
      "LEV-KLN-02": [290, 102],
      "LEV-KLN-03": [290, 208],
      "MIG-KLN-01": [340, 96],
      "TMP-KLN-02": [458, 62],
      "TMP-KLN-04": [458, 248],
    },
  },
  "kln-st2": {
    Art: () => <KilnStationFullArt station={2} />,
    pads: {
      "TMP-KLN-05": [232, 62],
      "TMP-KLN-07": [232, 248],
      "LEV-KLN-04": [290, 102],
      "LEV-KLN-05": [290, 208],
      "MIG-KLN-02": [340, 96],
      "TMP-KLN-06": [458, 62],
      "TMP-KLN-08": [458, 248],
    },
  },
  "kln-st3": {
    Art: () => <KilnStationFullArt station={3} />,
    pads: {
      "TMP-KLN-09": [232, 62],
      "TMP-KLN-11": [232, 248],
      "LEV-KLN-06": [290, 102],
      "LEV-KLN-07": [290, 208],
      "MIG-KLN-03": [340, 96],
      "TMP-KLN-10": [458, 62],
      "TMP-KLN-12": [458, 248],
    },
  },
  "kln-inlet": {
    Art: KilnInletFullArt,
    pads: {
      "TMP-KLN-13": [196, 174],
      "PRS-KLN-01": [228, 218],
      "GAS-KLN-03": [274, 140],
      "GAS-KLN-02": [290, 140],
      "GAS-KLN-01": [306, 140],
      "CAL-KLN-06": [346, 152],
      "STS-KLN-06": [414, 74],
    },
  },
  "kln-outlet": {
    Art: KilnOutletFullArt,
    pads: {
      "STS-KLN-10": [280, 250],
      "TMP-KLN-26": [316, 94],
      "TMP-KLN-25": [344, 216],
      "CAL-KLN-07": [377, 114],
      "TMP-KLN-27": [432, 76],
      "TMP-KLN-14": [489, 40],
      "PRS-KLN-03": [522, 116],
    },
  },

  // PYR-BRN-01
  "brn-burner": {
    Art: BrnBurnerArt,
    pads: {
      "CAM-BRN-01": [364, 29],
      "TMP-BRN-02": [364, 214],
      "PRS-BRN-01": [562, 84],
      "PRS-BRN-02": [598, 84],
    },
  },
  "brn-pafan": {
    Art: BrnPaFanArt,
    pads: {
      "ELE-BRN-01": [193, 186],
      "TMP-BRN-01": [265, 196],
      "VIB-BRN-01": [316, 196],
      "PRS-BRN-03": [475, 28],
    },
  },
  "brn-coalbin": {
    Art: BrnCoalBinArt,
    pads: {
      "GAS-BRN-01": [222, 134],
      "TMP-BRN-04": [296, 136],
      "LEV-BRN-01": [405, 28],
    },
  },
  "brn-coalfeed": {
    Art: BrnCoalFeedArt,
    pads: {
      "CAL-BRN-01": [168, 84],
      "FLO-BRN-01": [214, 84],
      "PRS-BRN-04": [318, 136],
      "ELE-BRN-02": [421, 168],
      "VIB-BRN-02": [548, 212],
    },
  },

  // PYR-CLR-01
  "clr-hot": {
    Art: () => <ClrCompartmentsArt start={1} hot />,
    pads: {
      "PRS-CLR-01": [172, 212],
      "PRS-CLR-02": [358, 212],
      "PRS-CLR-03": [544, 212],
    },
  },
  "clr-cold": {
    Art: () => <ClrCompartmentsArt start={4} hot={false} />,
    pads: {
      "PRS-CLR-04": [172, 212],
      "PRS-CLR-05": [358, 212],
      "PRS-CLR-06": [544, 212],
    },
  },
  "clr-fans13": {
    Art: () => <ClrFansArt start={1} />,
    pads: {
      "VIB-CLR-01": [164, 210],
      "TMP-CLR-01": [164, 192],
      "ELE-CLR-01": [228, 196],
      "VIB-CLR-02": [356, 210],
      "TMP-CLR-02": [356, 192],
      "ELE-CLR-02": [420, 196],
      "VIB-CLR-03": [548, 210],
      "TMP-CLR-03": [548, 192],
      "ELE-CLR-03": [612, 196],
    },
  },
  "clr-fans46": {
    Art: () => <ClrFansArt start={4} />,
    pads: {
      "TMP-CLR-04": [164, 200],
      "ELE-CLR-04": [228, 196],
      "TMP-CLR-05": [356, 200],
      "ELE-CLR-05": [420, 196],
      "TMP-CLR-06": [548, 200],
      "ELE-CLR-06": [612, 196],
    },
  },
  "clr-drive": {
    Art: ClrDriveArt,
    pads: {
      "SPD-CLR-01": [316, 79],
      "PRS-CLR-07": [476, 133],
      "TMP-CLR-07": [486, 218],
    },
  },
  "clr-discharge": {
    Art: ClrDischargeArt,
    pads: {
      "TMP-CLR-08": [522, 108],
    },
  },
  "clr-vent": {
    Art: ClrVentArt,
    pads: {
      "TMP-CLR-09": [288, 26],
      "TMP-CLR-10": [436, 166],
      "VIB-CLR-07": [436, 186],
      "ELE-CLR-07": [518, 164],
    },
  },

  // PYR-CCT-01 · hammer crusher (HMR-01)
  "hmr-motor": {
    Art: HmrMotorArt,
    pads: {
      "TMP-HMR-03": [268, 162],
      "ELE-HMR-01": [312, 82],
    },
  },
  "hmr-rotor": {
    Art: HmrRotorArt,
    pads: {
      "SPD-HMR-01": [172, 166],
      "VIB-HMR-02": [232, 148],
      "TMP-HMR-02": [232, 184],
      "VIB-HMR-01": [488, 148],
      "TMP-HMR-01": [488, 184],
    },
  },

  // PYR-CCT-01 · pan conveyor and clinker silo (CSL-01)
  "csl-conveyor": {
    Art: CslConveyorArt,
    pads: {
      "SPD-CSL-01": [156, 224],
      "ELE-CSL-01": [406, 34],
      "VIB-CSL-01": [497, 52],
    },
  },
  "csl-silo": {
    Art: CslSiloArt,
    pads: {
      "LEV-CSL-01": [295, 92],
      "PRS-CSL-01": [344, 56],
      "ELE-CSL-02": [497, 44],
    },
  },

  // Fleet machines (CRUSH-01, CONV-04, SAG-01, BALL-02, BALL-03, PUMP-104, HP-PUMP-01, AGIT-01, PMP-101, BLOW-03)
  "CRUSH-01:P1": { Art: CrushSpiderArt, pads: { "SPIDER-LUBE-FLOW": [260, 54] } },
  "CRUSH-01:P2": { Art: CrushChamberArt, pads: { "SHAFT-THRUST": [360, 148] } },
  "CRUSH-01:P3": { Art: CrushDriveArt, pads: { "MOTOR-AMP": [218, 118], "COUNTERSHAFT-VIB": [436, 168] } },
  "CRUSH-01:P4": { Art: CrushHydrosetArt, pads: { "ECC-HYD-PRESS": [476, 190] } },
  "CONV-04:P2": { Art: CrushDriveArt, pads: { "PULLEY-DE-VIB": [260, 168], "GEARBOX-OIL-TEMP": [436, 186] } },
  "CONV-04:P3": { Art: CslConveyorArt, pads: { "BELT-RIP-STATUS": [330, 168] } },
  "SAG-01:P1": { Art: HmrMotorArt, pads: { "VIB-RMS-DE": [368, 166] } },
  "SAG-01:P2": { Art: CrushDriveArt, pads: { "PINION-ACC-RMS": [436, 168] } },
  "SAG-01:P3": { Art: () => <MillTrunnionArt side="FEED" />, pads: { "TRUNNION-TEMP-01": [360, 168] } },
  "SAG-01:P4": { Art: MillShellArt, pads: { "AXIAL-THRUST-MM": [384, 148] } },
  "SAG-01:P5": { Art: () => <MillTrunnionArt side="DISCHARGE" />, pads: { "TRUNNION-TEMP-02": [360, 168] } },
  "BALL-02:P1": { Art: HmrMotorArt, pads: { "VIB-RMS-DE": [368, 166] } },
  "BALL-02:P2": { Art: CrushDriveArt, pads: { "PINION-ACC-RMS": [436, 168] } },
  "BALL-02:P3": { Art: () => <MillTrunnionArt side="FEED" />, pads: { "TRUNNION-TEMP-01": [360, 168] } },
  "BALL-02:P4": { Art: MillShellArt, pads: { "GIRTH-ACOUSTIC": [384, 148] } },
  "BALL-02:P5": { Art: () => <MillTrunnionArt side="DISCHARGE" />, pads: { "TRUNNION-TEMP-02": [360, 168] } },
  "BALL-03:P1": { Art: HmrMotorArt, pads: { "VIB-RMS-DE": [368, 166] } },
  "BALL-03:P2": { Art: CrushDriveArt, pads: { "PINION-ACC-RMS": [436, 168] } },
  "BALL-03:P3": { Art: () => <MillTrunnionArt side="FEED" />, pads: { "TRUNNION-TEMP-01": [360, 168] } },
  "BALL-03:P4": { Art: MillShellArt, pads: { "SHELL-DISP": [384, 148] } },
  "BALL-03:P5": { Art: () => <MillTrunnionArt side="DISCHARGE" />, pads: { "TRUNNION-TEMP-02": [360, 168] } },
  "PUMP-104:P1": { Art: HmrMotorArt, pads: { "MOTOR-DE-TEMP": [368, 166] } },
  "PUMP-104:P2": { Art: CrushDriveArt, pads: { "PUMP-BEAR-VIB": [436, 168] } },
  "PUMP-104:P3": { Art: PumpVoluteArt, pads: { "GLAND-WATER-PRESS": [268, 156], "DISCH-PRESS": [480, 68] } },
  "HP-PUMP-01:P2": { Art: CrushDriveArt, pads: { "CRANK-VIB-RMS": [436, 168] } },
  "HP-PUMP-01:P3": { Art: PumpVoluteArt, pads: { "DIAPH-DISP": [268, 156], "INJECT-PRESS": [480, 68] } },
  "AGIT-01:P2": { Art: CrushDriveArt, pads: { "GEAR-HS-VIB": [436, 168] } },
  "AGIT-01:P3": { Art: AgitSealShaftArt, pads: { "SEAL-TEMP": [258, 96], "SHAFT-RUNOUT": [360, 118] } },
  "PMP-101:P1": { Art: HmrMotorArt, pads: { "ELE-PMP-01": [312, 82], "SPD-PMP-01": [449, 166] } },
  "PMP-101:P2": { Art: CrushDriveArt, pads: { "VIB-PMP-01": [400, 168], "TMP-PMP-01": [468, 168] } },
  "PMP-101:P4": { Art: PumpVoluteArt, pads: { "PRS-PMP-01": [400, 118], "FLO-PMP-01": [500, 68] } },
  "BLOW-03:P1": { Art: HmrMotorArt, pads: { "MOTOR-DE-VIB": [368, 166] } },
  "BLOW-03:P2": { Art: CrushDriveArt, pads: { "COUPLING-VIB": [323, 186], "BEAR-TEMP-IB": [436, 168] } },
  "BLOW-03:P3": { Art: BrnPaFanArt, pads: { "AIR-TEMP-DISCH": [475, 52] } },
};
