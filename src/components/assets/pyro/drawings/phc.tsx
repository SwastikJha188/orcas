/**
 * D02 + D03 — PHC-01 six-stage preheater, exit gas and ID fan in one drawing.
 *
 * Tower (left): C1 top right → C6 bottom left in two staggered columns on a
 * steel structure with platforms. Gas rises kiln inlet → riser → C6 → C5 → …
 * → C1 through the central duct lane; meal from each stage drops into the
 * duct feeding the stage below (brass meal pipes), C6 meal to the kiln inlet.
 * Right: preheater exit duct with the gas analyser, ID fan inlet damper,
 * centrifugal ID fan with NDE / DE bearing pedestals, coupling, VFD motor and
 * shaft encoder, fan outlet to the GCT / raw mill / stack.
 */
import React from "react";
import { Bolt, Coupling, CornerBolts, GroundLine, Housing, MX, MachineLabel, Motor, PAINT } from "../../machine-kit/machine-kit";
import type { PyroDrawing } from "../pyro-drawing-types";
import { Cyclone, type CycloneGeom, cycloneOutletY, Handrail, MealPipe, MirrorX, PedestalBearing, Pipe, Steel, Tube, Volute } from "./fkp-parts";

const W = 1000;
const H = 640;
const GROUND = 616;

/* ---------------------------------------------------------------- tower */
const LX = 150; // left column (C2, C4, C6)
const RX = 300; // right column (C1, C3, C5)
const LANE = 225; // central duct lane
const DD = 18; // stage duct diameter
const COL = [70, 380]; // structure columns (left edge)

const cyc = (cx: number, top: number, inlet: 1 | -1, big = false): CycloneGeom => ({ cx, top, w: big ? 104 : 88, cyl: big ? 52 : 44, cone: big ? 56 : 50, inlet });
const C1 = cyc(RX, 56, -1, true);
const C2 = cyc(LX, 120, 1);
const C3 = cyc(RX, 208, -1);
const C4 = cyc(LX, 262, 1);
const C5 = cyc(RX, 346, -1);
const C6 = cyc(LX, 458, 1);
const STAGES = [C1, C2, C3, C4, C5, C6];

const stub = (c: CycloneGeom) => c.top - 14; // gas outlet duct run above the roof
const inletY = (c: CycloneGeom) => c.top + 14;
const sideX = (c: CycloneGeom, s: 1 | -1) => c.cx + (s * c.w) / 2;
const coneAt = (c: CycloneGeom, f: number, s: 1 | -1) => {
  const ow = Math.max(14, c.w * 0.2);
  const half = c.w / 2 - (c.w / 2 - ow / 2) * f;
  return [c.cx + s * half, c.top + c.cyl + c.cone * f] as [number, number];
};

const RISER_Y = 474;
const RISER_X = 400;
const RD = 26;

/** Gas duct from stage `from` up to stage `to` through the central lane. */
function stageDuct(from: CycloneGeom, to: CycloneGeom): [number, number][] {
  const toSide = (to.cx < LANE ? 1 : -1) as 1 | -1;
  return [
    [from.cx, from.top],
    [from.cx, stub(from)],
    [LANE, stub(from)],
    [LANE, inletY(to)],
    [sideX(to, toSide), inletY(to)],
  ];
}

function Structure() {
  const levels = [C1, C3, C5, C2, C4, C6].map((c) => c.top + c.cyl).sort((a, b) => a - b);
  return (
    <g>
      {COL.map((x) => (
        <g key={x}>
          <Steel x={x} y={44} w={10} h={GROUND - 54} />
          <rect x={x - 7} y={GROUND - 10} width={24} height={10} rx={2} {...PAINT.body} />
          <Bolt x={x - 1} y={GROUND - 5} r={1.5} />
          <Bolt x={x + 11} y={GROUND - 5} r={1.5} />
        </g>
      ))}
      <Steel x={COL[0] - 4} y={40} w={COL[1] - COL[0] + 18} h={6} />
      {levels.map((y) => (
        <g key={y}>
          <Handrail x1={COL[0] + 10} x2={COL[1]} y={y} h={10} step={19} />
          <rect x={COL[0] - 4} y={y} width={COL[1] - COL[0] + 18} height={6} rx={1.5} {...PAINT.body} />
        </g>
      ))}
    </g>
  );
}

function Tower() {
  return (
    <g>
      <Structure />
      {STAGES.map((c, i) => (
        <Cyclone key={i} c={c} label={`C${i + 1}`} />
      ))}
      {/* stage gas ducts: C6→C5→C4→C3→C2→C1 */}
      {[
        [C2, C1],
        [C3, C2],
        [C4, C3],
        [C5, C4],
        [C6, C5],
      ].map(([a, b], i) => (
        <Pipe key={i} pts={stageDuct(a, b)} d={DD} />
      ))}
      {/* meal pipes: each stage drops into the duct feeding the stage below */}
      <MealPipe pts={[[C1.cx, cycloneOutletY(C1)], [C1.cx, stub(C3) - DD / 2 - 2]]} />
      <MealPipe pts={[[C2.cx, cycloneOutletY(C2)], [C2.cx, stub(C4) - DD / 2 - 2]]} />
      <MealPipe pts={[[C3.cx, cycloneOutletY(C3)], [C3.cx, stub(C5) - DD / 2 - 2]]} />
      <MealPipe pts={[[C4.cx, cycloneOutletY(C4)], [C4.cx, stub(C6) - DD / 2 - 2]]} />
      <MealPipe pts={[[C5.cx, cycloneOutletY(C5)], [C5.cx, RISER_Y - RD / 2 - 2]]} />
      {/* raw meal feed into the C2 → C1 duct */}
      <MealPipe pts={[[16, 88], [LANE - DD / 2 - 2, 88]]} d={8} />
      <rect x={LANE - DD / 2 - 6} y={82} width={5} height={12} rx={1} {...PAINT.raised} />
    </g>
  );
}

function KilnInlet() {
  return (
    <g>
      {/* kiln shell stub, sloping down toward the burner */}
      <Tube x1={446} y1={566} x2={572} y2={575} d={52} />
      {[488, 530].map((x) => (
        <line key={x} x1={x} x2={x + 0.6} y1={566 + ((x - 446) * 9) / 126 - 24} y2={566 + ((x - 446) * 9) / 126 + 24} stroke={MX.fine} strokeWidth={1} />
      ))}
      <rect x={452} y={534} width={12} height={66} rx={3} {...PAINT.body} />
      {Array.from({ length: 5 }).map((_, i) => (
        <line key={i} x1={454} y1={540 + i * 12} x2={462} y2={544 + i * 12} stroke={MX.fine} strokeWidth={1} />
      ))}
      {/* inlet chamber with refractory window and meal bed */}
      <Housing x={350} y={520} w={102} h={84} rx={8} bolts={false} />
      <rect x={362} y={532} width={78} height={60} rx={3} {...PAINT.recess} />
      <path d="M 364 590 Q 392 572 438 584 L 438 590 Z" {...PAINT.material} />
      <CornerBolts x={350} y={520} w={102} h={84} inset={6} r={1.6} />
      <rect x={344} y={604} width={114} height={12} rx={2} {...PAINT.body} />
      {/* riser duct: kiln inlet → C6 */}
      <Pipe
        pts={[
          [RISER_X, 520],
          [RISER_X, RISER_Y],
          [sideX(C6, 1), RISER_Y],
        ]}
        d={RD}
        flanges={[[RISER_X, 508], [262, RISER_Y]]}
      />
      {/* hot meal from C6 to the kiln inlet */}
      <MealPipe pts={[[C6.cx, cycloneOutletY(C6)], [C6.cx, 592], [350, 592]]} d={8} />
    </g>
  );
}

/* ---------------------------------------------------------------- exit gas + ID fan */
const EXIT_Y = 26;
const ED = 26;
const DOWN_X = 630;
const DAMPER_Y = 350;
const FAN = { cx: 680, cy: 500, r: 74 };
const SHAFT_Y = FAN.cy;
const NDE_X = 782;
const DE_X = 836;
const MOTOR = { x: 886, w: 68, h: 70 };

function ExitGas() {
  return (
    <g>
      <Pipe
        pts={[
          [RX, C1.top],
          [RX, EXIT_Y],
          [DOWN_X, EXIT_Y],
          [DOWN_X, 470],
        ]}
        d={ED}
        flanges={[[420, EXIT_Y], [560, EXIT_Y], [DOWN_X, 200], [DOWN_X, DAMPER_Y - 16], [DOWN_X, DAMPER_Y + 16]]}
      />
      {/* analyser: sample probe flange, heated line, cabinet */}
      <rect x={476} y={EXIT_Y + ED / 2 - 1} width={14} height={6} rx={1.5} {...PAINT.raised} />
      <line x1={483} y1={EXIT_Y + ED / 2 + 5} x2={483} y2={62} stroke={MX.edge} strokeWidth={1.4} />
      <rect x={446} y={62} width={80} height={50} rx={5} {...PAINT.body} />
      <rect x={456} y={70} width={40} height={18} rx={2} {...PAINT.recess} />
      {[94, 100, 106].map((y) => (
        <line key={y} x1={456} x2={496} y1={y} y2={y} stroke={MX.fine} strokeWidth={1} />
      ))}
      <rect x={504} y={70} width={14} height={34} rx={2} fill="none" stroke={MX.fine} strokeWidth={1} />
      <CornerBolts x={446} y={62} w={80} h={50} inset={5} r={1.4} />
      {/* ID fan inlet damper: louvre housing + actuator and lever */}
      <rect x={DOWN_X - ED / 2 - 5} y={DAMPER_Y - 12} width={ED + 10} height={24} rx={3} {...PAINT.raised} />
      <line x1={DOWN_X - ED / 2} y1={DAMPER_Y + 6} x2={DOWN_X + ED / 2} y2={DAMPER_Y - 6} stroke={MX.edge} strokeWidth={1.6} />
      <circle cx={DOWN_X} cy={DAMPER_Y} r={3} {...PAINT.shaft} />
      <line x1={DOWN_X} y1={DAMPER_Y} x2={DOWN_X - 30} y2={DAMPER_Y - 6} stroke={MX.edge} strokeWidth={1.6} />
      <rect x={DOWN_X - 58} y={DAMPER_Y - 15} width={26} height={30} rx={4} {...PAINT.body} />
      <rect x={DOWN_X - 53} y={DAMPER_Y - 10} width={16} height={7} rx={1.5} {...PAINT.recess} />
    </g>
  );
}

function IdFan() {
  const outX0 = FAN.cx + FAN.r * 0.18;
  const outX1 = FAN.cx + FAN.r * 1.12;
  const outTop = FAN.cy - FAN.r - 30;
  const OUT_Y = 170;
  const OD = 34;
  const ox = (outX0 + outX1) / 2;
  const motorY = SHAFT_Y - MOTOR.h / 2;
  return (
    <g>
      {/* foundations */}
      <rect x={596} y={576} width={176} height={GROUND - 576} rx={2} {...PAINT.body} />
      <rect x={756} y={548} width={236} height={GROUND - 548} rx={2} {...PAINT.body} />
      <CornerBolts x={756} y={548} w={236} h={GROUND - 548} inset={8} r={1.8} />
      {/* fan outlet transition and duct */}
      <path d={`M ${outX0} ${outTop} L ${ox - OD / 2} ${outTop - 24} L ${ox + OD / 2} ${outTop - 24} L ${outX1} ${outTop} Z`} {...PAINT.body} />
      <Pipe
        pts={[
          [ox, outTop - 24],
          [ox, OUT_Y],
          [W, OUT_Y],
        ]}
        d={OD}
        flanges={[[ox, 300], [880, OUT_Y]]}
      />
      {/* volute + rotor */}
      <Volute cx={FAN.cx} cy={FAN.cy} r={FAN.r} outH={30} dir={1} rotor={false} />
      {/* casing split flange and inspection door */}
      <line x1={FAN.cx - FAN.r * 0.92} x2={FAN.cx - FAN.r * 0.62} y1={FAN.cy} y2={FAN.cy} stroke={MX.fine} strokeWidth={1.4} />
      <line x1={FAN.cx + FAN.r * 0.62} x2={FAN.cx + FAN.r * 1.12} y1={FAN.cy} y2={FAN.cy} stroke={MX.fine} strokeWidth={1.4} />
      <rect x={FAN.cx - 18} y={FAN.cy + FAN.r * 0.7} width={36} height={12} rx={2} {...PAINT.recess} />
      {/* shaft, bearings, coupling, motor, encoder */}
      <rect x={FAN.cx} y={SHAFT_Y - 5} width={MOTOR.x - FAN.cx - 20} height={10} rx={2} {...PAINT.shaft} />
      <circle cx={FAN.cx} cy={FAN.cy} r={FAN.r * 0.12} {...PAINT.shaft} />
      <PedestalBearing x={NDE_X} y={SHAFT_Y} w={36} base={548} />
      <PedestalBearing x={DE_X} y={SHAFT_Y} w={36} base={548} />
      <Coupling x={MOTOR.x - 26} y={SHAFT_Y - 11} w={18} h={22} />
      <MirrorX about={MOTOR.x + MOTOR.w / 2}>
        <Motor x={MOTOR.x} y={motorY} w={MOTOR.w} h={MOTOR.h} />
      </MirrorX>
      <rect x={MOTOR.x + 6} y={motorY + MOTOR.h} width={MOTOR.w - 12} height={548 - motorY - MOTOR.h} rx={2} {...PAINT.body} />
      <rect x={MOTOR.x + MOTOR.w + 8} y={SHAFT_Y - 3} width={6} height={6} {...PAINT.shaft} />
      <rect x={MOTOR.x + MOTOR.w + 13} y={SHAFT_Y - 12} width={10} height={24} rx={3} {...PAINT.raised} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={20} x2={990} y={GROUND} />
      <IdFan />
      <ExitGas />
      <Tower />
      <KilnInlet />
      <MachineLabel x={18} y={76} anchor="start">
        RAW MEAL FEED →
      </MachineLabel>
      <MachineLabel x={486} y={126}>EXIT-GAS ANALYSER</MachineLabel>
      <MachineLabel x={994} y={OUT_LABEL_Y} anchor="end">
        TO GCT / RAW MILL / STACK →
      </MachineLabel>
      <MachineLabel x={226} y={GROUND + 16}>SIX-STAGE PREHEATER</MachineLabel>
      <MachineLabel x={402} y={GROUND + 16}>KILN INLET</MachineLabel>
      <MachineLabel x={530} y={GROUND + 16}>ROTARY KILN →</MachineLabel>
      <MachineLabel x={FAN.cx} y={GROUND + 16}>ID FAN</MachineLabel>
      <MachineLabel x={880} y={GROUND + 16}>ID FAN MOTOR · VFD</MachineLabel>
    </g>
  );
}

const OUT_LABEL_Y = 140;

const coneTap = (c: CycloneGeom, s: 1 | -1) => coneAt(c, 0.5, s);

export const drawing: PyroDrawing = {
  machineId: "PYR-PHC-01",
  width: W,
  height: H,
  Art,
  pads: {
    // C1 / exit duct
    "TMP-PHC-01": [340, EXIT_Y],
    "PRS-PHC-01": [378, EXIT_Y],
    // C2 – C3
    "TMP-PHC-02": [188, stub(C2)],
    "PRS-PHC-02": [sideX(C2, -1), C2.top + 24],
    "TMP-PHC-03": [262, stub(C3)],
    "PRS-PHC-03": [sideX(C3, 1), C3.top + 24],
    // C4 – C6 (stage outlet TC, stage draft, purged cone tap)
    "TMP-PHC-04": [188, stub(C4)],
    "PRS-PHC-04": [sideX(C4, -1), C4.top + 24],
    "PRS-PHC-07": coneTap(C4, -1),
    "TMP-PHC-05": [262, stub(C5)],
    "PRS-PHC-05": [sideX(C5, 1), C5.top + 24],
    "PRS-PHC-08": coneTap(C5, 1),
    "TMP-PHC-06": [188, stub(C6)],
    "PRS-PHC-06": [232, RISER_Y],
    "PRS-PHC-09": coneTap(C6, -1),
    // riser + hot meal
    "TMP-PHC-08": [RISER_X, 504],
    "TMP-PHC-07": [318, 592],
    // exit gas analyser
    "GAS-PHC-01": [470, EXIT_Y],
    "GAS-PHC-02": [496, EXIT_Y],
    // ID fan
    "POS-PHC-01": [DOWN_X - 45, DAMPER_Y + 6],
    "VIB-PHC-02": [NDE_X, SHAFT_Y - 14],
    "TMP-PHC-10": [NDE_X, SHAFT_Y + 26],
    "VIB-PHC-01": [DE_X, SHAFT_Y - 14],
    "TMP-PHC-09": [DE_X, SHAFT_Y + 26],
    "ELE-PHC-01": [MOTOR.x + MOTOR.w / 2, SHAFT_Y - MOTOR.h / 2 - 8],
    "SPD-PHC-01": [MOTOR.x + MOTOR.w + 18, SHAFT_Y],
  },
  windows: {
    "phc-upper": [40, 0, 560, 260],
    "phc-lower": [0, 222, 680, 330],
    "phc-riser": [190, 430, 420, 186],
    "phc-exitgas": [360, 0, 300, 132],
    "phc-idfan": [412, 326, 588, 290],
  },
};
