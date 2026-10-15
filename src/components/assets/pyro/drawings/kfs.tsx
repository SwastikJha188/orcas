/**
 * D01 (right) — KFS-01 kiln feed and dosing: weigh bin on load cells with roof
 * radar and high / low level switches, dosing gate with position actuator,
 * aerated air slide with its blower and air-box header, solid-flow meter, and
 * the bucket elevator to the preheater with its head drive (bearing, gearbox,
 * motor, head-shaft speed pickup).
 */
import React from "react";
import { Bolt, Coupling, CornerBolts, GroundLine, MX, MachineLabel, Motor, PAINT } from "../../machine-kit/machine-kit";
import type { PyroDrawing } from "../pyro-drawing-types";
import { AirSlide, Brace, Handrail, MirrorX, Pipe, Steel, Tube } from "./fkp-parts";

const W = 1000;
const H = 600;
const GROUND = 572;

// weigh bin
const BX = 330;
const BR = 85;
const EAVE = 180;
const APEX = 168;
const SHELL_BOT = 318;
const OUT_Y = 398;
const OUT_HALF = 16;
const roofY = (x: number) => APEX + ((EAVE - APEX) * Math.abs(x - BX)) / (BR + 4);
const coneX = (y: number, side: 1 | -1) => BX + side * (BR - ((BR - OUT_HALF) * (y - SHELL_BOT)) / (OUT_Y - SHELL_BOT));

// elevator
const EX = 772;
const HEAD_Y = 74; // head shaft centre

function FeedBin() {
  const cols = [BX - BR - 22, BX + BR + 10];
  return (
    <g>
      {/* weigh frame: columns, top beams, bracing (behind the bin) */}
      {cols.map((x) => (
        <g key={x}>
          <Steel x={x} y={318} w={12} h={GROUND - 328} />
          <rect x={x - 6} y={GROUND - 10} width={24} height={10} rx={2} {...PAINT.body} />
          <Bolt x={x} y={GROUND - 5} r={1.6} />
          <Bolt x={x + 12} y={GROUND - 5} r={1.6} />
        </g>
      ))}
      <Steel x={cols[0] - 4} y={318} w={cols[1] - cols[0] + 20} h={8} />
      <Steel x={cols[0] + 12} y={500} w={cols[1] - cols[0] - 12} h={6} />
      <Brace x1={cols[0] + 12} y1={506} x2={cols[1]} y2={GROUND - 10} />

      {/* hopper cone */}
      <path d={`M ${BX - BR} ${SHELL_BOT} L ${BX + BR} ${SHELL_BOT} L ${BX + OUT_HALF} ${OUT_Y} L ${BX - OUT_HALF} ${OUT_Y} Z`} {...PAINT.cylinderV} />
      {[0.35, 0.7].map((f) => {
        const y = SHELL_BOT + (OUT_Y - SHELL_BOT) * f;
        return <line key={f} x1={coneX(y, -1) + 5} x2={coneX(y, 1) - 5} y1={y} y2={y} stroke={MX.fine} strokeWidth={1} />;
      })}
      {/* shell */}
      <rect x={BX - BR} y={EAVE} width={2 * BR} height={SHELL_BOT - EAVE} rx={2} {...PAINT.cylinderV} />
      {[214, 248, 282].map((y) => (
        <line key={y} x1={BX - BR + 2} x2={BX + BR - 2} y1={y} y2={y} stroke={MX.fine} strokeWidth={1} />
      ))}
      {/* inventory cut-away */}
      <rect x={BX - BR + 16} y={192} width={18} height={118} rx={3} {...PAINT.recess} />
      <rect x={BX - BR + 19} y={192 + 118 * 0.42} width={12} height={118 * 0.58 - 3} rx={1.5} {...PAINT.material} />

      {/* weighing lugs on load cells */}
      {[-1, 1].map((s) => {
        const lx = s < 0 ? BX - BR - 14 : BX + BR;
        return (
          <g key={s}>
            <rect x={lx} y={292} width={14} height={14} rx={2} {...PAINT.raised} />
            <rect x={lx - 2} y={306} width={18} height={12} rx={2} {...PAINT.body} />
            <rect x={lx + 2} y={309} width={10} height={6} rx={1} {...PAINT.recess} />
          </g>
        );
      })}

      {/* roof, handrail, inlet, radar nozzle */}
      <path d={`M ${BX - BR - 4} ${EAVE} L ${BX} ${APEX} L ${BX + BR + 4} ${EAVE} Z`} {...PAINT.raised} />
      <Handrail x1={BX - BR - 2} x2={BX + BR + 2} y={EAVE} h={12} step={17} />
      <rect x={BX - 54} y={140} width={22} height={roofY(BX - 43) - 140} rx={2} {...PAINT.body} />
      <rect x={BX + 32} y={roofY(BX + 40) - 6} width={16} height={6} rx={1.5} {...PAINT.raised} />
      <path d={`M ${BX + 34} ${roofY(BX + 40) - 6} L ${BX + 46} ${roofY(BX + 40) - 6} L ${BX + 44} ${roofY(BX + 40) - 22} L ${BX + 36} ${roofY(BX + 40) - 22} Z`} {...PAINT.body} />
      <rect x={BX + 31} y={roofY(BX + 40) - 28} width={18} height={8} rx={2} {...PAINT.raised} />

      {/* high (sidewall) and low (cone) level switches */}
      <rect x={BX + BR} y={202} width={14} height={10} rx={2} {...PAINT.raised} />
      <rect x={BX + BR + 14} y={199} width={10} height={16} rx={2} {...PAINT.body} />
      <rect x={coneX(352, 1) - 2} y={347} width={14} height={10} rx={2} {...PAINT.raised} />
      <rect x={coneX(352, 1) + 12} y={344} width={10} height={16} rx={2} {...PAINT.body} />

      {/* flexible connector + dosing gate with positioner */}
      <rect x={BX - OUT_HALF - 6} y={OUT_Y} width={2 * OUT_HALF + 12} height={6} rx={1.5} {...PAINT.raised} />
      <rect x={BX - 14} y={OUT_Y + 6} width={28} height={6} rx={1} {...PAINT.recess} />
      <rect x={BX - 26} y={OUT_Y + 12} width={52} height={20} rx={3} {...PAINT.body} />
      <CornerBolts x={BX - 26} y={OUT_Y + 12} w={52} h={20} inset={5} r={1.5} />
      <rect x={BX + 26} y={OUT_Y + 16} width={34} height={12} rx={3} {...PAINT.cylinder} />
      <rect x={BX + 60} y={OUT_Y + 20} width={6} height={4} {...PAINT.shaft} />
      <rect x={BX + 64} y={OUT_Y + 9} width={22} height={26} rx={3} {...PAINT.body} />
      <rect x={BX + 68} y={OUT_Y + 13} width={14} height={7} rx={1.5} {...PAINT.recess} />
      <rect x={BX - 12} y={OUT_Y + 32} width={24} height={10} rx={2} {...PAINT.body} />
    </g>
  );
}

// air slide from the gate to the solid-flow meter
const AS = { x1: BX - 14, y1: OUT_Y + 50, x2: 612, y2: 492 };
const asY = (x: number) => AS.y1 + ((AS.y2 - AS.y1) * (x - AS.x1)) / (AS.x2 - AS.x1);

function DosingLine() {
  const fanX = 530;
  const boxY = asY(fanX) + 9;
  return (
    <g>
      {/* air-slide blower and air-box header */}
      <rect x={fanX - 22} y={GROUND - 12} width={44} height={12} rx={2} {...PAINT.body} />
      <Pipe pts={[[fanX, GROUND - 40], [fanX, boxY]]} d={10} flanges={[[fanX, boxY + 12]]} />
      <rect x={fanX - 18} y={GROUND - 48} width={36} height={36} rx={6} {...PAINT.body} />
      <circle cx={fanX} cy={GROUND - 30} r={13} {...PAINT.recess} />
      {[0, 90, 180, 270].map((a) => (
        <path key={a} d={`M ${fanX} ${GROUND - 30} q 2.5 -7 8 -3`} fill={MX.raised} stroke={MX.edge} strokeWidth={0.8} transform={`rotate(${a} ${fanX} ${GROUND - 30})`} />
      ))}
      <circle cx={fanX} cy={GROUND - 30} r={2.5} {...PAINT.shaft} />

      <AirSlide {...AS} d={18} />

      {/* drop chute + solid-flow meter */}
      <rect x={604} y={486} width={18} height={18} rx={2} {...PAINT.body} />
      <rect x={598} y={502} width={30} height={6} rx={1.5} {...PAINT.raised} />
      <rect x={592} y={508} width={82} height={40} rx={6} {...PAINT.body} />
      <rect x={598} y={514} width={70} height={28} rx={3} fill="none" stroke={MX.fine} strokeWidth={1} />
      <rect x={632} y={518} width={28} height={12} rx={2} {...PAINT.recess} />
      <CornerBolts x={592} y={508} w={82} h={40} inset={6} r={1.5} />
      <rect x={604} y={GROUND - 24} width={60} height={24} rx={2} {...PAINT.body} />
      <rect x={624} y={548} width={20} height={GROUND - 548 - 24} {...PAINT.body} />
      {/* outlet chute to the elevator boot */}
      <Tube x1={668} y1={540} x2={EX - 38} y2={556} d={14} paint={PAINT.body} />
    </g>
  );
}

function Elevator() {
  const cw = 60;
  const top = 104;
  const boot = 512;
  const joints: number[] = [];
  for (let y = top + 40; y < boot - 10; y += 46) joints.push(y);
  const buckets: number[] = [];
  for (let y = top + 16; y < boot - 8; y += 15) buckets.push(y);
  return (
    <g>
      {/* casing with flanged sections and inspection strips (up / down legs) */}
      <rect x={EX - cw / 2} y={top} width={cw} height={boot - top} rx={3} {...PAINT.cylinderV} />
      <rect x={EX - 24} y={top + 8} width={20} height={boot - top - 16} rx={2} {...PAINT.recess} />
      <rect x={EX + 4} y={top + 8} width={20} height={boot - top - 16} rx={2} {...PAINT.recess} />
      {buckets.map((y) => (
        <g key={y}>
          <path d={`M ${EX - 22} ${y} h 16 l -2 7 h -12 Z`} fill={MX.flatRaised} stroke={MX.edge} strokeWidth={0.7} />
          <rect x={EX - 20.5} y={y + 0.8} width={13} height={3} rx={1} fill={MX.material} />
          <path d={`M ${EX + 6} ${y + 6} h 16 l -2 -7 h -12 Z`} fill={MX.flatRaised} stroke={MX.edge} strokeWidth={0.7} />
        </g>
      ))}
      {joints.map((y) => (
        <rect key={y} x={EX - cw / 2 - 4} y={y - 2.5} width={cw + 8} height={5} rx={1.5} {...PAINT.raised} />
      ))}
      {/* boot with tail-pulley take-up and inlet */}
      <rect x={EX - 46} y={boot} width={92} height={GROUND - boot - 10} rx={6} {...PAINT.body} />
      <circle cx={EX} cy={boot + 26} r={14} fill="none" stroke={MX.fine} strokeWidth={1} />
      <circle cx={EX} cy={boot + 26} r={4} {...PAINT.shaft} />
      <rect x={EX + 30} y={boot + 12} width={10} height={28} rx={2} {...PAINT.recess} />
      <rect x={EX - 54} y={GROUND - 10} width={108} height={10} rx={2} {...PAINT.body} />
      <CornerBolts x={EX - 46} y={boot} w={92} h={GROUND - boot - 10} inset={7} r={1.6} />

      {/* head platform */}
      <rect x={EX - 66} y={top - 2} width={282} height={8} rx={2} {...PAINT.body} />
      <path d={`M ${EX + 40} ${top + 6} L ${EX + 40} ${top + 20} L ${EX + 70} ${top + 6} Z`} {...PAINT.body} />
      <path d={`M ${EX + 40} ${top + 6} h -10 l 10 10 Z`} {...PAINT.body} />

      {/* discharge spout toward the preheater (behind the hood) */}
      <Tube x1={EX - 30} y1={HEAD_Y + 18} x2={630} y2={HEAD_Y + 52} d={14} paint={PAINT.body} />

      {/* head hood */}
      <path d={`M ${EX - 44} ${top - 2} V ${HEAD_Y - 6} A 44 40 0 0 1 ${EX + 44} ${HEAD_Y - 6} V ${top - 2} Z`} {...PAINT.body} />
      <path d={`M ${EX - 36} ${top - 8} V ${HEAD_Y - 4} A 36 32 0 0 1 ${EX + 36} ${HEAD_Y - 4} V ${top - 8} Z`} fill="none" stroke={MX.fine} strokeWidth={1} />
      <circle cx={EX} cy={HEAD_Y} r={22} fill="none" stroke={MX.fine} strokeWidth={1} />
      {/* head shaft through the hood to the drive */}
      <rect x={EX - 52} y={HEAD_Y - 4} width={112} height={8} rx={2} {...PAINT.shaft} />
      <circle cx={EX} cy={HEAD_Y} r={8} {...PAINT.raised} />
      {/* NDE speed pickup on the head shaft */}
      <rect x={EX - 64} y={HEAD_Y - 9} width={12} height={18} rx={3} {...PAINT.body} />
      <rect x={EX - 72} y={HEAD_Y - 3} width={8} height={6} rx={1} {...PAINT.recess} />

      {/* drive-end bearing block */}
      <rect x={EX + 60} y={HEAD_Y - 14} width={24} height={28} rx={6} {...PAINT.raised} />
      <rect x={EX + 56} y={HEAD_Y + 14} width={32} height={top - 2 - HEAD_Y - 14} rx={2} {...PAINT.body} />
      <Bolt x={EX + 66} y={HEAD_Y - 8} r={1.5} />
      <Bolt x={EX + 78} y={HEAD_Y - 8} r={1.5} />
      {/* gearbox, coupling, motor (shaft toward the gearbox) */}
      <rect x={EX + 84} y={HEAD_Y - 3} width={8} height={6} {...PAINT.shaft} />
      <rect x={EX + 92} y={HEAD_Y - 26} width={52} height={52} rx={8} {...PAINT.body} />
      <rect x={EX + 98} y={HEAD_Y - 20} width={40} height={40} rx={5} fill="none" stroke={MX.fine} strokeWidth={1} />
      <CornerBolts x={EX + 92} y={HEAD_Y - 26} w={52} h={52} inset={7} r={1.6} />
      <rect x={EX + 108} y={HEAD_Y + 26} width={22} height={top - 2 - HEAD_Y - 26} rx={2} {...PAINT.body} />
      <Coupling x={EX + 146} y={HEAD_Y - 8} w={14} h={16} />
      <MirrorX about={EX + 184}>
        <Motor x={EX + 162} y={HEAD_Y - 18} w={44} h={36} />
      </MirrorX>
      <rect x={EX + 160} y={HEAD_Y + 18} width={46} height={top - 2 - HEAD_Y - 18} rx={2} {...PAINT.body} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={60} x2={990} y={GROUND} />
      {/* feed from the silo air slide */}
      <AirSlide x1={20} y1={112} x2={BX - 40} y2={142} d={16} />
      <FeedBin />
      <DosingLine />
      <Elevator />
      <MachineLabel x={24} y={98} anchor="start">
        FROM FEED SILO →
      </MachineLabel>
      <MachineLabel x={BX} y={GROUND + 16}>KILN FEED BIN · WEIGH BIN</MachineLabel>
      <MachineLabel x={634} y={GROUND + 16}>SOLID-FLOW METER</MachineLabel>
      <MachineLabel x={EX} y={GROUND + 16}>BUCKET ELEVATOR</MachineLabel>
      <MachineLabel x={622} y={HEAD_Y + 72} anchor="end">
        ← TO PREHEATER
      </MachineLabel>
    </g>
  );
}

export const drawing: PyroDrawing = {
  machineId: "PYR-KFS-01",
  width: W,
  height: H,
  Art,
  pads: {
    "LEV-KFS-01": [BX + 40, roofY(BX + 40) - 24],
    "LEV-KFS-02": [BX + BR + 19, 207],
    "LEV-KFS-03": [coneX(352, 1) + 17, 352],
    "WGT-KFS-01": [BX - BR - 7, 312],
    "POS-KFS-01": [BX + 75, OUT_Y + 26],
    "PRS-KFS-01": [530, asY(530) + 30],
    "FLO-KFS-01": [646, 524],
    "PRS-KFS-02": [613, 492],
    "ELE-KFS-01": [EX + 184, HEAD_Y - 22],
    "VIB-KFS-01": [EX + 118, HEAD_Y - 2],
    "TMP-KFS-01": [EX + 72, HEAD_Y + 2],
    "SPD-KFS-01": [EX - 58, HEAD_Y],
  },
  windows: {
    "kfs-bin": [20, 124, 640, 276],
    "kfs-dosing": [270, 380, 480, 200],
    "kfs-elevator": [680, 10, 310, 128],
  },
};
