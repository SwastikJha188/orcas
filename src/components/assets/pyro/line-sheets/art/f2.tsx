/**
 * Sheet F-2 — FSL-01 · Feed silo — Aeration blower and header.
 *
 * Composition of PDF page 4: blower control cabinet (duty / standby run
 * feedback) on its plinth, conduit to the motor terminal box; the duty blower
 * set on a common skid — TEFC motor with fan cowl, coupling, centrifugal
 * blower volute on its pedestal; the riser with check valve and isolation
 * valve, the standby blower's tie-in, and the aeration header with pressure
 * transmitter and the two drops to the silo cone pads.
 */
import React from "react";
import { Bolt, CornerBolts, Coupling, Fan, GroundLine, MX, MachineLabel, Motor, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Pipe } from "../../drawings/fkp-parts";
import type { LineSheetArt } from "../types";
import { Arrow, BoltRow, ButterflyValve, CheckValve } from "./parts-f";

const W = 824;
const H = 704;

const GROUND = 634;
const BX = 600;
const BY = 540;
const BR = 84;
const RISER = 559;
const HDR = 225;

function ControlCabinet() {
  const [x, y, w, h] = [53, 398, 127, 224];
  return (
    <g>
      <rect x={47} y={622} width={139} height={10} rx={2} {...PAINT.body} />
      <Bolt x={55} y={627} r={1.3} />
      <Bolt x={178} y={627} r={1.3} />
      <rect x={x - 3} y={y - 5} width={w + 6} height={7} rx={2} {...PAINT.raised} />
      <rect x={x} y={y} width={w} height={h} rx={6} {...PAINT.body} />
      <rect x={x + 7} y={y + 7} width={w - 14} height={h - 14} rx={4} fill="none" stroke={MX.fine} strokeWidth={1} />
      {/* run-status display, lamps and duty / standby selector */}
      <rect x={78} y={429} width={77} height={27} rx={3} {...PAINT.recess} />
      {[86, 101, 116].map((cx) => (
        <circle key={cx} cx={cx} cy={477} r={4.2} {...PAINT.raised} />
      ))}
      {[136, 150].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={477} r={5.5} {...PAINT.body} />
          <rect x={cx - 1.2} y={472.5} width={2.4} height={9} rx={1} {...PAINT.shaft} transform={`rotate(${cx === 136 ? -35 : 35} ${cx} 477)`} />
        </g>
      ))}
      <line x1={78} x2={155} y1={492} y2={492} {...PAINT.hair} />
      {/* door handle, hinges, louvres, cable glands */}
      <rect x={163} y={492} width={5} height={28} rx={2} {...PAINT.shaft} />
      {[420, 600].map((hy) => (
        <rect key={hy} x={x - 2} y={hy} width={4} height={12} rx={1} {...PAINT.raised} />
      ))}
      {[537, 546, 555, 564, 573].map((ly) => (
        <line key={ly} x1={85} x2={149} y1={ly} y2={ly} stroke={MX.fine} strokeWidth={1.2} />
      ))}
      <rect x={82} y={530} width={70} height={50} rx={3} fill="none" stroke={MX.fine} strokeWidth={0.8} />
      {[0, 1].map((i) => (
        <rect key={i} x={x + w} y={462 + i * 12} width={7} height={7} rx={1.5} {...PAINT.raised} />
      ))}
      {/* conduit to the motor terminal box */}
      <path d={`M ${x + w + 7} 465.5 H 206 V 440 H 340 V 452`} fill="none" stroke={MX.edge} strokeWidth={4} strokeLinejoin="round" />
      <path d={`M ${x + w + 7} 465.5 H 206 V 440 H 340 V 452`} fill="none" stroke={MX.metal} strokeWidth={1.6} strokeLinejoin="round" />
      {[230, 290].map((cx) => (
        <rect key={cx} x={cx - 2} y={435} width={4} height={10} rx={1} {...PAINT.raised} />
      ))}
    </g>
  );
}

function BlowerSet() {
  const voluteD = `M 516 435 H ${BX} V 456 A ${BR} ${BR} 0 0 1 ${BX} ${BY + BR} A ${BR} ${BR} 0 0 1 516 ${BY} Z`;
  return (
    <g>
      {/* common skid with anchor bolts */}
      <rect x={218} y={611} width={480} height={21} rx={3} {...PAINT.body} />
      <line x1={222} x2={694} y1={617} y2={617} {...PAINT.hair} />
      <BoltRow x1={228} x2={688} y={625} n={9} r={1.5} />
      {/* motor: fan cowl with grille, frame, feet */}
      <rect x={226} y={492} width={42} height={103} rx={18} {...PAINT.body} />
      {[506, 518, 530, 542, 554, 566, 578].map((gy) => (
        <line key={gy} x1={232} x2={262} y1={gy} y2={gy} {...PAINT.hair} />
      ))}
      <rect x={282} y={600} width={166} height={11} rx={2} {...PAINT.body} />
      <Motor x={264} y={481} w={201} h={126} />
      <CornerBolts x={264} y={481} w={201} h={126} inset={9} r={1.6} />
      <rect x={334} y={457} width={62} height={20} rx={3} fill="none" stroke={MX.fine} strokeWidth={1} />
      <Coupling x={482} y={527} w={28} h={32} />
      {/* blower: pedestal, volute, inlet eye with impeller */}
      <path d={`M 562 570 H 640 L 660 628 H 541 Z`} {...PAINT.body} />
      <path d={voluteD} {...PAINT.body} />
      <path d={`M 522 441 H ${BX - 6}`} {...PAINT.hair} />
      <circle cx={BX} cy={BY} r={60} fill="none" stroke={MX.fine} strokeWidth={1.2} />
      <circle cx={BX} cy={BY} r={54} {...PAINT.raised} />
      <Fan cx={BX} cy={BY} r={44} />
      {[30, 75, 120, 165, 210, 255, 300, 345].map((d) => {
        const a = (d * Math.PI) / 180;
        return <Bolt key={d} x={BX + Math.cos(a) * 57} y={BY + Math.sin(a) * 57} r={1.3} />;
      })}
      {[
        [556, 487],
        [653, 497],
        [548, 584],
        [653, 584],
      ].map(([x, y]) => (
        <Bolt key={`${x}${y}`} x={x} y={y} r={2} />
      ))}
      <rect x={550} y={605} width={102} height={6} rx={1.5} {...PAINT.raised} />
      <Bolt x={556} y={621} r={1.6} />
      <Bolt x={646} y={621} r={1.6} />
      {/* outlet flange */}
      <rect x={RISER - 16} y={431} width={32} height={6} rx={1.5} {...PAINT.raised} />
    </g>
  );
}

function Header() {
  return (
    <g>
      {/* standby blower tie-in */}
      <Pipe pts={[[420, 300], [RISER, 300]]} d={14} elbows={false} flanges={[[440, 300]]} />
      <CheckValve x={494} y={300} d={14} />
      <MachineLabel x={420} y={286} anchor="start" size={7.5}>
        FROM STANDBY BLOWER
      </MachineLabel>
      {/* riser and header */}
      <Pipe
        pts={[
          [RISER, 437],
          [RISER, HDR],
          [795, HDR],
        ]}
        d={21}
        flanges={[
          [RISER, 338],
          [675, HDR],
          [795, HDR],
        ]}
      />
      <rect x={RISER - 14} y={293} width={28} height={14} rx={3} {...PAINT.raised} />
      <CheckValve x={RISER} y={385} d={21} vertical />
      <ButterflyValve x={RISER} y={262} d={21} vertical />
      {/* pressure transmitter on the header: root valve, impulse stem, head */}
      <rect x={643} y={190} width={5} height={24} {...PAINT.shaft} />
      <rect x={638} y={199} width={15} height={8} rx={2} {...PAINT.raised} />
      <rect x={634.5} y={166.5} width={22} height={22} rx={6} {...PAINT.body} />
      <circle cx={645.5} cy={177.5} r={7.5} {...PAINT.recess} />
      {/* drops to the silo cone pads */}
      {[745, 785].map((x) => (
        <g key={x}>
          <Pipe pts={[[x, HDR + 9], [x, 318]]} d={12} elbows={false} flanges={[[x, 248]]} />
          <ButterflyValve x={x} y={282} d={12} vertical />
          <rect x={x - 9} y={316} width={18} height={5} rx={1.5} {...PAINT.raised} />
          <Arrow x1={x} y1={326} x2={x} y2={344} head={6} />
        </g>
      ))}
      <Arrow x1={800} y1={HDR} x2={821} y2={HDR} head={6} />
      <MachineLabel x={693.5} y={195.3} anchor="start" size={9.8}>
        TO SILO CONE PADS
      </MachineLabel>
      <MachineLabel x={617.5} y={261.3} anchor="start" size={9.8}>
        AERATION HEADER
      </MachineLabel>
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={22} x2={804} y={GROUND} />
      <Header />
      <BlowerSet />
      <ControlCabinet />
      <MachineLabel x={29.5} y={377.3} anchor="start" size={9.8}>
        BLOWER CONTROL CABINET
      </MachineLabel>
      <MachineLabel x={295} y={662.3} anchor="start" size={9.8}>
        BLOWER MOTOR
      </MachineLabel>
      <MachineLabel x={517} y={662.3} anchor="start" size={9.8}>
        AERATION BLOWER (DUTY)
      </MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 4. */
const pads: LineSheetArt["pads"] = {
  "STS-FSL-02": [116.5, 447.5],
  "ELE-FSL-01": [365, 467],
  "PRS-FSL-01": [645.5, 177.5],
};

/** Tag chip centre per point, as on PDF page 4. */
const chips: NonNullable<LineSheetArt["chips"]> = {
  "STS-FSL-02": [187.5, 387.5],
  "ELE-FSL-01": [443, 399.5],
  "PRS-FSL-01": [708.5, 132.5],
};

export const sheet: LineSheetArt = { id: "F-2", ready: true, width: W, height: H, Art, pads, chips };
