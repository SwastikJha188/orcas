/**
 * Sheet K-7 — KLN-01 · Rotary kiln — Axial thrust system.
 *
 * Composed as PDF page 20: the shell with tyre 2 on its support roller and
 * pier (station 2); the hydraulic thrust roller on the downhill face of the
 * tyre, pushed by a double-acting cylinder on a steel bracket frame; the LVDT
 * on the cylinder reading the kiln's axial position; the uphill / downhill
 * travel-limit switches tripped by a dog bar on the roller yoke; and the
 * hydraulic power unit (valve manifold with pressure transmitter, accumulator,
 * oil tank with sight glass, motor-pump set) with its two lines to the
 * cylinder ports.
 */
import React from "react";
import { Bolt, CornerBolts, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { OilLine, SideMotor } from "../../sheets/sb-parts";
import type { LineSheetArt } from "../types";
import { Arrow, KilnShell, Pier, RollerEnd, Tyre } from "./parts-kb";

const W = 824;
const H = 704;

const SHELL = { x: 31, y: 113.5, w: 569.5, h: 127 };
const TYRE_CX = 332.25;
const GROUND = 645.5;
/* cylinder, rod, LVDT (sheet units) */
const CYL = { x: 391.5, y: 215, w: 164, h: 27.5 };
const CYL_CY = CYL.y + CYL.h / 2;
const BEAM_Y = 270;

function StationTwo() {
  return (
    <g>
      <Pier cx={TYRE_CX} top={353} bottom={GROUND} wTop={105.5} wBot={138.5} />
      <RollerEnd cx={TYRE_CX} cy={309.5} r={33} base={345} />
      <rect x={TYRE_CX - 50} y={345} width={100} height={8} rx={2} {...PAINT.raised} />
      {[-38, -14, 14, 38].map((dx) => (
        <Bolt key={dx} x={TYRE_CX + dx} y={349.5} r={1.3} />
      ))}
      <KilnShell x={SHELL.x} y={SHELL.y} w={SHELL.w} h={SHELL.h} seam={40.5} />
      <Tyre cx={TYRE_CX} y={89} w={48.5} h={175.5} shellTop={SHELL.y} shellBot={SHELL.y + SHELL.h} />
    </g>
  );
}

function ThrustUnit() {
  return (
    <g>
      {/* bracket frame: beam on a pedestal (pier side) and a column to the floor */}
      <rect x={370} y={BEAM_Y + 10} width={16} height={65} rx={1.5} {...PAINT.body} />
      <rect x={548} y={BEAM_Y + 10} width={12} height={GROUND - BEAM_Y - 18} rx={1.5} {...PAINT.body} />
      <rect x={540} y={GROUND - 8} width={28} height={8} rx={1.5} {...PAINT.raised} />
      <Bolt x={545} y={GROUND - 4} r={1.3} />
      <Bolt x={563} y={GROUND - 4} r={1.3} />
      <line x1={386} y1={BEAM_Y + 30} x2={548} y2={BEAM_Y + 120} stroke={MX.fine} strokeWidth={2.2} />
      <rect x={366} y={BEAM_Y} width={200} height={10} rx={2} {...PAINT.raised} />
      <line x1={369} x2={563} y1={BEAM_Y + 5} y2={BEAM_Y + 5} {...PAINT.hair} />
      {/* cylinder feet */}
      {[408, 538].map((fx) => (
        <g key={fx}>
          <rect x={fx - 7} y={CYL.y + CYL.h - 2} width={14} height={BEAM_Y - CYL.y - CYL.h + 2} rx={1.5} {...PAINT.body} />
          <Bolt x={fx} y={BEAM_Y - 3.5} r={1.1} />
        </g>
      ))}
      {/* thrust roller in its yoke, on the end of the piston rod */}
      <rect x={383} y={CYL_CY - 5.5} width={12} height={11} rx={2} {...PAINT.shaft} />
      <rect x={378} y={203} width={12} height={51} rx={2.5} {...PAINT.raised} />
      <rect x={357.5} y={197.5} width={24} height={62.5} rx={6} {...PAINT.shaft} strokeWidth={MX.w} />
      <line x1={361} x2={378} y1={228.75} y2={228.75} {...PAINT.hair} />
      <circle cx={384} cy={228.75} r={3.2} {...PAINT.recess} />
      {/* dog bar for the travel-limit switches */}
      <rect x={384} y={252} width={6} height={9} rx={1} {...PAINT.raised} />
      <rect x={384} y={258} width={140} height={4} rx={1.2} {...PAINT.shaft} />
      <rect x={520} y={253} width={5} height={9} rx={1} {...PAINT.raised} />
      {/* cylinder: end caps, tie rods, ports */}
      <rect x={CYL.x} y={CYL.y} width={CYL.w} height={CYL.h} rx={4} {...PAINT.cylinder} />
      {[CYL.y + 4, CYL.y + CYL.h - 4].map((ty) => (
        <line key={ty} x1={CYL.x + 10} x2={CYL.x + CYL.w - 10} y1={ty} y2={ty} {...PAINT.hair} />
      ))}
      <rect x={CYL.x - 2} y={CYL.y - 3} width={12} height={CYL.h + 6} rx={2} {...PAINT.raised} />
      <rect x={CYL.x + CYL.w - 10} y={CYL.y - 3} width={12} height={CYL.h + 6} rx={2} {...PAINT.raised} />
      {[CYL.y + 1, CYL.y + CYL.h - 1].map((by) => (
        <g key={by}>
          <Bolt x={CYL.x + 4} y={by} r={1} />
          <Bolt x={CYL.x + CYL.w - 4} y={by} r={1} />
        </g>
      ))}
      {/* LVDT: body on two brackets, core rod to the yoke */}
      <rect x={393} y={194.5} width={40} height={3} rx={1} {...PAINT.shaft} />
      <rect x={389} y={191.5} width={6} height={13} rx={1.5} {...PAINT.raised} />
      {[440, 512].map((bx) => (
        <rect key={bx} x={bx - 2.5} y={201} width={5} height={CYL.y - 201} {...PAINT.body} />
      ))}
      <rect x={430} y={189.5} width={93} height={12.5} rx={4} {...PAINT.cylinder} />
      <rect x={519} y={192} width={8} height={7.5} rx={1.5} {...PAINT.raised} />
      {/* travel-limit switches on the beam */}
      {[414, 542.5].map((sx) => (
        <g key={sx}>
          <rect x={sx - 8.5} y={BEAM_Y - 18} width={17} height={18} rx={2.5} {...PAINT.raised} />
          <rect x={sx - 5} y={BEAM_Y - 14} width={10} height={6} rx={1} {...PAINT.recess} />
        </g>
      ))}
    </g>
  );
}

function PowerUnit() {
  const tank = { x: 570.5, y: 451, w: 180, h: 134.5 };
  return (
    <g>
      {/* skid feet */}
      {[572, 737].map((fx) => (
        <g key={fx}>
          <rect x={fx} y={tank.y + tank.h} width={12} height={GROUND - tank.y - tank.h} rx={1.5} {...PAINT.body} />
          <Bolt x={fx + 6} y={GROUND - 5} r={1.3} />
        </g>
      ))}
      {/* accumulator and filler-breather on the tank lid */}
      <rect x={598} y={414} width={20} height={38} rx={10} {...PAINT.cylinderV} />
      <rect x={604} y={408} width={8} height={7} rx={1.5} {...PAINT.raised} />
      <rect x={634} y={442} width={14} height={10} rx={2} {...PAINT.raised} />
      <rect x={tank.x} y={tank.y} width={tank.w} height={tank.h} rx={10} {...PAINT.body} />
      <rect x={tank.x + 5} y={tank.y + 5} width={tank.w - 10} height={tank.h - 10} rx={6} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      <CornerBolts x={tank.x} y={tank.y} w={tank.w} h={tank.h} inset={10} r={1.8} />
      {/* oil sight window, return filter */}
      <rect x={585.5} y={465.5} width={67.5} height={45} rx={4} {...PAINT.recess} />
      <rect x={588} y={478} width={62.5} height={30} rx={2.5} {...PAINT.material} />
      {[472, 486, 500].map((ty) => (
        <line key={ty} x1={655} x2={659} y1={ty} y2={ty} {...PAINT.hair} />
      ))}
      <rect x={668} y={468} width={22} height={36} rx={4} {...PAINT.raised} />
      <rect x={666} y={464} width={26} height={6} rx={1.5} {...PAINT.body} />
      {/* motor and pump */}
      <SideMotor x={606} y={530} w={90} h={44} />
      <rect x={705} y={538} width={12} height={28} rx={3} {...PAINT.raised} />
      <rect x={717} y={542} width={20} height={20} rx={3} {...PAINT.body} />
      <rect x={591} y={576} width={150} height={5} rx={1.5} {...PAINT.raised} />
      {/* valve manifold with solenoid coils */}
      <rect x={668} y={420.5} width={67.5} height={33} rx={4} {...PAINT.raised} />
      <line x1={671} x2={732} y1={437} y2={437} {...PAINT.hair} />
      <rect x={715} y={424} width={16} height={11} rx={2} {...PAINT.body} />
      <rect x={715} y={439} width={16} height={11} rx={2} {...PAINT.body} />
      <Bolt x={673} y={425.5} r={1.1} />
      <Bolt x={673} y={448.5} r={1.1} />
    </g>
  );
}

function Lines() {
  return (
    <g>
      <OilLine pts={[[CYL.x + CYL.w + 1, 225.5], [702, 225.5], [702, 421]]} w={4.5} />
      <OilLine pts={[[465.5, CYL.y + CYL.h], [465.5, 390], [679, 390], [679, 421]]} w={4.5} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <StationTwo />
      <ThrustUnit />
      <PowerUnit />
      <Lines />
      <GroundLine x1={22.5} x2={803.5} y={GROUND} />

      <Arrow x1={177} y1={83.5} x2={111} y2={83.5} />
      <Arrow x1={177} y1={83.5} x2={243} y2={83.5} />
      <MachineLabel x={84.5} y={69.6} anchor="start" size={8.2}>KILN FLOATS UPHILL ↔ DOWNHILL</MachineLabel>
      <MachineLabel x={332.25} y={79.7} size={9}>TYRE 2</MachineLabel>
      <MachineLabel x={332.25} y={666} size={9}>STATION 2</MachineLabel>
      <MachineLabel x={374} y={186.6} anchor="start" size={8.2}>THRUST ROLLER</MachineLabel>
      <MachineLabel x={464.5} y={177.6} size={8.2}>LVDT</MachineLabel>
      <MachineLabel x={588} y={613.7} anchor="start" size={9}>HYDRAULIC POWER UNIT</MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 20. */
const pads: LineSheetArt["pads"] = {
  "POS-KLN-01": [465.5, 195.5],
  "POS-KLN-02": [542.5, 259],
  "PRS-KLN-07": [701.5, 437],
};

/** Tag chip centre per point, as on PDF page 20. */
const chips: NonNullable<LineSheetArt["chips"]> = {
  "POS-KLN-01": [543.5, 135.5],
  "POS-KLN-02": [621, 289.5],
  "PRS-KLN-07": [660.5, 332],
};

export const sheet: LineSheetArt = { id: "K-7", ready: true, width: W, height: H, Art, pads, chips };
