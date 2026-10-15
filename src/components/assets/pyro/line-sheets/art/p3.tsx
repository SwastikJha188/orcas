/**
 * Sheet P-3 — PHC-01 · Preheater — Exit gas analysis and fan damper.
 *
 * Composition of PDF page 11: the C1 top-stage cyclone at left on its
 * platform; the preheater exit gas duct rises from the C1 vortex finder, runs
 * across the top and drops to the ID fan inlet. On the horizontal run the
 * extractive gas-sampling probe (filter head, blowback air with receiver and
 * solenoid valve) feeds the exit-gas analyser cabinet (O₂ and CO cells,
 * sample cooler and pump) through a heated sample line. On the down-leg the
 * ID fan inlet damper with its rotary actuator.
 */
import React from "react";
import { Bolt, CornerBolts, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Handrail, MealPipe, Pipe } from "../../drawings/fkp-parts";
import type { LineSheetArt } from "../types";
import { Arrow, BasePlate, Beam, Bellows, FlapValve, Gusset, StageCyclone, type StageGeom, stageDims } from "./parts-p";

const W = 824;
const H = 704;
const GROUND = 676;

const C1: StageGeom = { cx: 150.5, top: 222, inlet: -1, w: 127, cyl: 68, cone: 103, ow: 38, k: 1.3 };
const ED = 34; // exit duct
const DUCT_Y = 105;
const DOWN_X = 570.5;
const PROBE_X = 353;
const LINE_X = 375;
const CAB = { x: 300, y: 197, w: 196, h: 143 };
const DAMPER_Y = 441;

/** Small steel tube (blowback air, instrument air) along orthogonal points. */
function Tube({ pts, d = 4 }: { pts: [number, number][]; d?: number }) {
  return (
    <g aria-hidden="true">
      {pts.slice(1).map(([bx, by], i) => {
        const [ax, ay] = pts[i];
        return <rect key={i} x={Math.min(ax, bx) - d / 2} y={Math.min(ay, by) - d / 2} width={Math.abs(bx - ax) + d} height={Math.abs(by - ay) + d} rx={d / 2} fill={MX.metal} stroke={MX.edge} strokeWidth={0.8} />;
      })}
    </g>
  );
}

function CyclonePlatform() {
  const d = stageDims(C1);
  const fy = d.yJ + 6;
  return (
    <g>
      {[36, 222].map((x) => (
        <g key={x}>
          <rect x={x - 4} y={fy - 12} width={8} height={GROUND - fy + 12} rx={1.5} fill={MX.body} stroke={MX.edge} strokeWidth={MX.w} />
          <line x1={x} x2={x} y1={fy - 9} y2={GROUND - 8} stroke={MX.fine} strokeWidth={0.8} />
          <BasePlate x={x} y={GROUND} />
        </g>
      ))}
      <Handrail x1={42} x2={216} y={fy} h={11} step={17.5} />
      <Beam x1={40} x2={218} y={fy} />
      <Gusset x={40} y={fy + 6} s={1} size={12} />
      <Gusset x={218} y={fy + 6} s={-1} size={12} />
      <Beam x1={40} x2={218} y={588} h={5} />
      {/* C2 → C1 inlet duct stub (cut) */}
      <Pipe pts={[[20, C1.top + 9 + 17 * 1.3], [80, C1.top + 9 + 17 * 1.3]]} d={22} flanges={[[50, C1.top + 9 + 17 * 1.3]]} />
      <path d={`M 18 ${C1.top + 18} l 6 6 l -6 6 l 6 6 l -6 6`} fill="none" stroke={MX.label} strokeWidth={1} />
      {/* C1 meal down to the C3 → C2 duct */}
      <MealPipe pts={[[C1.cx, d.yOut], [C1.cx, 474]]} d={8} />
      <FlapValve x={C1.cx} y={d.yOut + 30} s={1} k={1.2} />
      <path d={`M ${C1.cx - 8} 470 l 4 4 l 4 -4 l 4 4 l 4 -4`} fill="none" stroke={MX.label} strokeWidth={1} />
    </g>
  );
}

function ExitDuct() {
  return (
    <g>
      <Pipe
        pts={[
          [C1.cx, C1.top - 2],
          [C1.cx, DUCT_Y],
          [DOWN_X, DUCT_Y],
          [DOWN_X, 645],
        ]}
        d={ED}
        flanges={[[C1.cx, 200], [250, DUCT_Y], [470, DUCT_Y], [DOWN_X, 285], [DOWN_X, 600], [DOWN_X, 643]]}
      />
      <Bellows x={DOWN_X} y={190} d={ED} len={16} />
      <Bellows x={C1.cx} y={172} d={ED} len={16} />
      {/* access door on the top of the horizontal run */}
      <rect x={478} y={DUCT_Y - ED / 2 - 5} width={30} height={6} rx={1.5} {...PAINT.raised} />
      <Bolt x={483} y={DUCT_Y - ED / 2 - 2} r={1.1} />
      <Bolt x={503} y={DUCT_Y - ED / 2 - 2} r={1.1} />
      {/* duct supports hung from the steel above */}
      {[250, 535].map((x) => (
        <g key={x}>
          <line x1={x} x2={x} y1={52} y2={DUCT_Y - ED / 2} stroke={MX.edge} strokeWidth={1.4} />
          <rect x={x - 7} y={DUCT_Y - ED / 2 - 3} width={14} height={4} rx={1} {...PAINT.raised} />
        </g>
      ))}
      <Beam x1={230} x2={560} y={46} h={6} />
    </g>
  );
}

function Probe() {
  const yb = DUCT_Y + ED / 2;
  return (
    <g>
      {/* blowback air: supply → receiver → solenoid valve → probe head */}
      <Tube pts={[[46, 150], [PROBE_X - 6, 150], [PROBE_X - 6, yb + 22]]} />
      <rect x={236} y={140} width={46} height={20} rx={10} {...PAINT.cylinder} />
      <rect x={250} y={136} width={6} height={4} rx={1} {...PAINT.raised} />
      <rect x={300} y={143} width={14} height={14} rx={2} {...PAINT.body} />
      <rect x={302.5} y={135} width={9} height={8} rx={2} {...PAINT.raised} />
      <line x1={304} x2={310} y1={150} y2={150} {...PAINT.hair} />
      {/* probe mounting flange through the duct wall */}
      <rect x={PROBE_X - 5} y={DUCT_Y - ED / 2 - 2} width={10} height={ED + 4} rx={2} {...PAINT.raised} />
      <line x1={PROBE_X} x2={PROBE_X} y1={DUCT_Y - ED / 2 + 2} y2={yb - 2} stroke={MX.fine} strokeWidth={1} strokeDasharray="2 2" />
      {/* heated filter head */}
      <rect x={PROBE_X - 10} y={yb + 2} width={22} height={26} rx={4} {...PAINT.body} />
      <rect x={PROBE_X - 6} y={yb + 7} width={14} height={8} rx={1.5} {...PAINT.recess} />
      <Bolt x={PROBE_X - 6} y={yb + 22} r={1.2} />
      <Bolt x={PROBE_X + 8} y={yb + 22} r={1.2} />
      {/* heated sample line to the analyser (trace-heated, insulated) */}
      <rect x={PROBE_X + 12} y={yb + 13} width={LINE_X - PROBE_X - 9} height={6} rx={3} {...PAINT.body} />
      <rect x={LINE_X - 3} y={yb + 13} width={6} height={CAB.y - yb - 13} rx={3} {...PAINT.body} />
      <line x1={LINE_X} x2={LINE_X} y1={yb + 18} y2={CAB.y - 2} stroke={MX.label} strokeWidth={0.8} strokeDasharray="3 2.5" />
      <rect x={LINE_X - 6} y={CAB.y - 6} width={12} height={6} rx={1.5} {...PAINT.raised} />
    </g>
  );
}

function Analyser() {
  const { x, y, w, h } = CAB;
  return (
    <g>
      {/* stand */}
      {[330, 470].map((lx) => (
        <g key={lx}>
          <rect x={lx - 3.5} y={y + h} width={7} height={GROUND - y - h} rx={1.5} {...PAINT.body} />
          <BasePlate x={lx} y={GROUND} w={18} />
        </g>
      ))}
      <rect x={326} y={560} width={148} height={5} rx={1.2} {...PAINT.body} />
      {/* cabinet */}
      <rect x={x} y={y} width={w} height={h} rx={10} {...PAINT.body} />
      <rect x={x + 6} y={y + 6} width={w - 12} height={h - 12} rx={6} fill="none" stroke={MX.fine} strokeWidth={1} />
      <CornerBolts x={x} y={y} w={w} h={h} inset={10} r={1.8} />
      {/* O₂ and CO measuring cells */}
      <rect x={317} y={216} width={60} height={36} rx={3} {...PAINT.recess} />
      <rect x={392} y={216} width={60} height={36} rx={3} {...PAINT.recess} />
      {/* sample conditioning: cooler, pump, filter and rotameter */}
      <rect x={317} y={276} width={44} height={44} rx={3} {...PAINT.raised} />
      {[284, 292, 300, 308].map((fy) => (
        <line key={fy} x1={322} x2={356} y1={fy} y2={fy} {...PAINT.hair} />
      ))}
      <circle cx={386} cy={298} r={13} {...PAINT.raised} />
      <circle cx={386} cy={298} r={7} {...PAINT.recess} />
      <circle cx={386} cy={298} r={2.5} {...PAINT.shaft} />
      <rect x={410} y={278} width={12} height={40} rx={4} {...PAINT.cylinderV} />
      <rect x={430} y={278} width={14} height={40} rx={2.5} {...PAINT.body} />
      <rect x={434} y={282} width={6} height={32} rx={2} {...PAINT.recess} />
      <rect x={434.5} y={296} width={5} height={3} rx={1} {...PAINT.shaft} />
      {/* door hinge, latch, louvres, cable glands */}
      <rect x={x + w - 14} y={y + 50} width={4} height={30} rx={1.5} fill={MX.edge} />
      {[462, 470, 478].map((ly) => (
        <line key={ly} x1={ly} x2={ly} y1={276} y2={318} {...PAINT.hair} />
      ))}
      {[340, 360, 440, 460].map((gx) => (
        <rect key={gx} x={gx - 3} y={y + h} width={6} height={5} rx={1} {...PAINT.raised} />
      ))}
      <MachineLabel x={347} y={262} size={8} tone="ink">
        O₂
      </MachineLabel>
      <MachineLabel x={422} y={262} size={8} tone="ink">
        CO
      </MachineLabel>
    </g>
  );
}

function Damper() {
  const x0 = DOWN_X - ED / 2;
  const y0 = DAMPER_Y - 21;
  return (
    <g>
      {/* damper casing with flanges */}
      <rect x={x0 - 10} y={y0} width={ED + 20} height={42} rx={4} {...PAINT.body} />
      <rect x={x0 - 4} y={y0 + 5} width={ED + 8} height={32} rx={2} {...PAINT.recess} />
      <line x1={x0 - 1} y1={y0 + 34} x2={x0 + ED + 1} y2={y0 + 8} stroke={MX.metal} strokeWidth={3.2} strokeLinecap="round" />
      <circle cx={DOWN_X} cy={DAMPER_Y} r={3.4} {...PAINT.shaft} />
      {[x0 - 5, x0 + ED + 5].map((bx) => (
        <g key={bx}>
          <Bolt x={bx} y={y0 + 5} r={1.3} />
          <Bolt x={bx} y={y0 + 37} r={1.3} />
        </g>
      ))}
      {/* spindle through the bearing to the actuator */}
      <rect x={x0 + ED + 10} y={DAMPER_Y - 2.5} width={14} height={5} {...PAINT.shaft} />
      {/* rotary actuator: gearbox, motor, handwheel, position indicator */}
      <rect x={600} y={425} width={68} height={33} rx={5} {...PAINT.body} />
      <rect x={605} y={430} width={58} height={23} rx={3} fill="none" stroke={MX.fine} strokeWidth={1} />
      <rect x={668} y={429} width={18} height={25} rx={6} {...PAINT.cylinder} />
      {[673, 678, 683].map((fx) => (
        <line key={fx} x1={fx} x2={fx} y1={432} y2={451} {...PAINT.hair} />
      ))}
      <rect x={618} y={418} width={6} height={7} {...PAINT.shaft} />
      <rect x={606} y={414} width={30} height={5} rx={2.5} {...PAINT.raised} />
      <rect x={648} y={458} width={14} height={7} rx={1.5} {...PAINT.raised} />
      <Bolt x={605} y={454} r={1.2} />
      <Bolt x={663} y={454} r={1.2} />
      {/* bracket to the duct */}
      <path d={`M ${DOWN_X + ED / 2} 470 L 612 470 L 612 458`} fill="none" stroke={MX.edge} strokeWidth={2} strokeLinejoin="round" />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={22} x2={803} y={GROUND} />
      <CyclonePlatform />
      <ExitDuct />
      <StageCyclone g={C1} label="C1" />
      <Probe />
      <Analyser />
      <Damper />
      <Arrow x1={DOWN_X} y1={650} x2={DOWN_X} y2={674} />
      <MachineLabel x={128} y={141.6} size={8.2} anchor="end">BLOWBACK AIR</MachineLabel>
      <MachineLabel x={272} y={81.2} size={9} anchor="start">PREHEATER EXIT GAS DUCT</MachineLabel>
      <MachineLabel x={337.5} y={357.2} size={9} anchor="start">EXIT-GAS ANALYSER</MachineLabel>
      <MachineLabel x={596} y={486.6} size={8.2} anchor="start">DAMPER ACTUATOR</MachineLabel>
      <MachineLabel x={74} y={523.7} size={9} anchor="start">C1 CYCLONE (TOP STAGE)</MachineLabel>
      <MachineLabel x={585.5} y={672.2} size={9} anchor="start">TO ID FAN INLET (P-4)</MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 11. */
const pads: LineSheetArt["pads"] = {
  "GAS-PHC-01": [347, 234.5],
  "GAS-PHC-02": [422, 234.5],
  "POS-PHC-01": [634, 441.5],
};

/** Tag chip centre per point, as on PDF page 11 (chips nudged clear of the cabinet and duct). */
const chips: NonNullable<LineSheetArt["chips"]> = {
  "GAS-PHC-01": [264, 317],
  "GAS-PHC-02": [516, 360],
  "POS-PHC-01": [712.5, 396.5],
};

export const sheet: LineSheetArt = { id: "P-3", ready: true, width: W, height: H, Art, pads, chips };
