/**
 * D01 (left) — FSL-01 raw-meal feed silo and extraction: silo on its steel
 * support frame, roof radar, bottom outlet gate with actuator / limit-switch
 * box, aeration header to the cone pads, duty / standby aeration blowers with
 * their control cabinet, and the discharge air slide to the kiln feed bin.
 */
import React from "react";
import { Bolt, Coupling, CornerBolts, Feet, GroundLine, MX, MachineLabel, Motor, PAINT } from "../../machine-kit/machine-kit";
import type { PyroDrawing } from "../pyro-drawing-types";
import { AirSlide, Brace, Cabinet, Handrail, Ladder, Pipe, Steel, Volute } from "./fkp-parts";

const W = 1000;
const H = 480;
const GROUND = 458;

// silo
const CX = 640;
const R = 130; // shell half-width
const EAVE = 82;
const APEX = 62;
const SHELL_BOT = 300;
const OUT_Y = 380;
const OUT_HALF = 18;

const roofY = (x: number) => APEX + ((EAVE - APEX) * Math.abs(x - CX)) / (R + 4);

function Silo() {
  const legs = [CX - R + 8, CX + R - 20];
  return (
    <g>
      {/* support frame (behind the hopper) */}
      {legs.map((x) => (
        <g key={x}>
          <Steel x={x} y={306} w={12} h={GROUND - 316} />
          <rect x={x - 6} y={GROUND - 10} width={24} height={10} rx={2} {...PAINT.body} />
          <Bolt x={x} y={GROUND - 5} r={1.6} />
          <Bolt x={x + 12} y={GROUND - 5} r={1.6} />
        </g>
      ))}
      <Brace x1={legs[0] + 12} y1={346} x2={legs[1]} y2={410} />
      <Steel x={legs[0] + 12} y={340} w={legs[1] - legs[0] - 12} h={6} />
      <Steel x={legs[0] + 12} y={410} w={legs[1] - legs[0] - 12} h={6} />

      {/* hopper cone with aeration pads */}
      <path d={`M ${CX - R} ${SHELL_BOT} L ${CX + R} ${SHELL_BOT} L ${CX + OUT_HALF} ${OUT_Y} L ${CX - OUT_HALF} ${OUT_Y} Z`} {...PAINT.cylinderV} />
      {[0.3, 0.55, 0.8].map((f) => {
        const y = SHELL_BOT + (OUT_Y - SHELL_BOT) * f;
        const half = R - (R - OUT_HALF) * f;
        return <line key={f} x1={CX - half + 6} x2={CX + half - 6} y1={y} y2={y} stroke={MX.fine} strokeWidth={1} />;
      })}

      {/* shell */}
      <rect x={CX - R} y={EAVE} width={2 * R} height={SHELL_BOT - EAVE} rx={2} {...PAINT.cylinderV} />
      {[124, 166, 208, 250].map((y) => (
        <line key={y} x1={CX - R + 2} x2={CX + R - 2} y1={y} y2={y} stroke={MX.fine} strokeWidth={1} />
      ))}
      {/* inventory cut-away */}
      <rect x={CX - R + 22} y={96} width={22} height={192} rx={3} {...PAINT.recess} />
      <rect x={CX - R + 25} y={96 + 192 * 0.38} width={16} height={192 * 0.62 - 3} rx={1.5} {...PAINT.material} />
      {/* support ring beam */}
      <rect x={CX - R - 8} y={SHELL_BOT - 5} width={2 * R + 16} height={10} rx={2} {...PAINT.raised} />

      {/* conical roof, handrail, vent filter, radar nozzle */}
      <path d={`M ${CX - R - 4} ${EAVE} L ${CX} ${APEX} L ${CX + R + 4} ${EAVE} Z`} {...PAINT.raised} />
      <Handrail x1={CX - R - 2} x2={CX + R + 2} y={EAVE} h={13} step={18} />
      <rect x={CX - 18} y={40} width={36} height={22} rx={3} {...PAINT.body} />
      <rect x={CX - 22} y={34} width={44} height={7} rx={2} {...PAINT.raised} />
      <rect x={CX - 10} y={46} width={20} height={9} rx={1.5} {...PAINT.recess} />
      <rect x={714} y={roofY(722) - 6} width={16} height={6} rx={1.5} {...PAINT.raised} />
      <path d={`M 716 ${roofY(722) - 6} L 728 ${roofY(722) - 6} L 726 ${roofY(722) - 24} L 718 ${roofY(722) - 24} Z`} {...PAINT.body} />
      <rect x={713} y={roofY(722) - 30} width={18} height={8} rx={2} {...PAINT.raised} />

      {/* access ladder with cage, right side */}
      <Ladder x={CX + R + 10} y1={EAVE - 12} y2={GROUND} w={12} cageFrom={250} side={1} />

      {/* bottom outlet gate, pneumatic actuator, limit-switch box */}
      <rect x={CX - OUT_HALF - 6} y={OUT_Y} width={2 * OUT_HALF + 12} height={6} rx={1.5} {...PAINT.raised} />
      <rect x={CX - 30} y={OUT_Y + 6} width={60} height={22} rx={3} {...PAINT.body} />
      <CornerBolts x={CX - 30} y={OUT_Y + 6} w={60} h={22} inset={5} r={1.6} />
      <rect x={CX + 30} y={OUT_Y + 11} width={34} height={12} rx={3} {...PAINT.cylinder} />
      <rect x={CX + 64} y={OUT_Y + 15} width={8} height={4} {...PAINT.shaft} />
      <rect x={CX + 70} y={OUT_Y + 3} width={24} height={28} rx={3} {...PAINT.body} />
      <rect x={CX + 75} y={OUT_Y + 8} width={14} height={7} rx={1.5} {...PAINT.recess} />
    </g>
  );
}

function Blowers() {
  const sets = [
    { motor: 104, fan: 226 },
    { motor: 274, fan: 396 },
  ];
  return (
    <g>
      {/* blower skid */}
      <rect x={92} y={GROUND - 12} width={344} height={12} rx={2} {...PAINT.body} />
      {sets.map(({ motor, fan }) => (
        <g key={fan}>
          <Feet x={motor} y={GROUND - 30} w={60} plinth={false} />
          <Motor x={motor} y={400} w={60} h={40} />
          <Coupling x={motor + 66} y={412} w={14} h={16} />
          <rect x={motor + 80} y={417} width={fan - motor - 80} height={6} {...PAINT.shaft} />
          <rect x={fan - 34} y={GROUND - 26} width={60} height={14} rx={2} {...PAINT.body} />
          <Volute cx={fan} cy={420} r={26} outH={20} dir={1} />
          {/* non-return valve on the discharge */}
          <rect x={fan + 1} y={364} width={30} height={10} rx={2} {...PAINT.raised} />
        </g>
      ))}
      {/* aeration header: both discharges → header → riser → cone pads */}
      <Pipe
        pts={[
          [242, 366],
          [242, 356],
          [470, 356],
          [470, 330],
          [CX - 92, 330],
        ]}
        d={12}
        flanges={[[330, 356]]}
      />
      <rect x={406} y={352} width={8} height={14} rx={1.5} {...PAINT.cylinderV} />
      {/* aeration ring main around the cone with drops to the pads */}
      <rect x={CX - 96} y={322} width={8} height={16} rx={2} {...PAINT.raised} />
      <rect x={CX - 88} y={327.5} width={176} height={5} rx={2} {...PAINT.shaft} />
      {[-64, -32, 0, 32, 64].map((dx) => (
        <rect key={dx} x={CX + dx - 3} y={332} width={6} height={Math.max(4, 14 - Math.abs(dx) / 8)} rx={1} {...PAINT.raised} />
      ))}
      <Cabinet x={30} y={364} w={44} h={GROUND - 364} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={20} x2={980} y={GROUND} />
      {/* fill line from blending: air slide into the roof inlet */}
      <AirSlide x1={250} y1={30} x2={CX - 50} y2={52} d={14} />
      <rect x={CX - 56} y={50} width={20} height={roofY(CX - 46) - 50} rx={2} {...PAINT.body} />
      <Silo />
      <AirSlide x1={CX - 10} y1={OUT_Y + 36} x2={996} y2={OUT_Y + 58} d={16} />
      <rect x={CX - 14} y={OUT_Y + 26} width={28} height={10} rx={2} {...PAINT.body} />
      <Blowers />
      <MachineLabel x={CX} y={GROUND + 16}>RAW-MEAL FEED SILO</MachineLabel>
      <MachineLabel x={250} y={GROUND + 16}>AERATION BLOWERS · DUTY / STANDBY</MachineLabel>
      <MachineLabel x={254} y={16} anchor="start">
        FROM BLENDING / RAW MILL →
      </MachineLabel>
      <MachineLabel x={992} y={OUT_Y + 28} anchor="end">
        TO KILN FEED BIN →
      </MachineLabel>
    </g>
  );
}

export const drawing: PyroDrawing = {
  machineId: "PYR-FSL-01",
  width: W,
  height: H,
  Art,
  pads: {
    "LEV-FSL-01": [722, roofY(722) - 26],
    "STS-FSL-01": [CX + 82, OUT_Y + 22],
    "PRS-FSL-01": [470, 343],
    "ELE-FSL-01": [134, 395],
    "STS-FSL-02": [52, 398],
  },
  windows: {
    "fsl-silo": [190, 26, 810, 400],
    "fsl-aeration": [10, 270, 540, 210],
  },
};
