/**
 * Sheet H-3 — CSL-01 · Clinker transport — Clinker silo and baghouse.
 * Drawn as the "CLINKER SILO AND BAGHOUSE" panel of the machine-group images
 * (page 14, panel box 1106.5, 91.5 – 1612.5, 540.5): the inlet chute from the
 * pan conveyor, the clinker silo on its legs with the roof radar, the roof
 * baghouse (clean / dirty plenum) with its ΔP transmitter, and the clean-air
 * duct over to the dust fan and its motor.
 */
import React from "react";
import { Bolt, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Handrail, Pipe, Tube, Volute } from "../../drawings/fkp-parts";
import type { LineSheetArt } from "../types";
import { TefcMotor } from "./parts-h2";

const W = 506;
const H = 449;

const GROUND = 413;

function Silo() {
  const cx = 221.5;
  const win = { x: 150.5, y: 201.5, w: 143, h: 72.5 };
  return (
    <g aria-hidden="true">
      {/* legs and bracing */}
      {[134.5, 308.5].map((lx) => (
        <g key={lx}>
          <rect x={lx - 2.5} y={319} width={5} height={GROUND - 319} rx={1} {...PAINT.body} />
          <rect x={lx - 6} y={GROUND - 3.5} width={12} height={3.5} rx={1} {...PAINT.raised} />
        </g>
      ))}
      <path d={`M 137 380 L ${cx} 410 L 306 380`} fill="none" stroke={MX.fine} strokeWidth={1.2} />
      {/* cone and outlet */}
      <path d="M 124 319 H 320 L 245 386.5 H 199 Z" {...PAINT.cylinderV} />
      {/* shell */}
      <rect x={120} y={169} width={204} height={145} rx={2} {...PAINT.cylinderV} />
      {[198, 286].map((by) => (
        <line key={by} x1={122} x2={322} y1={by} y2={by} {...PAINT.detail} />
      ))}
      {[257].map((by) => (
        <g key={by}>
          <line x1={122} x2={win.x - 2} y1={by} y2={by} {...PAINT.detail} />
          <line x1={win.x + win.w + 2} x2={322} y1={by} y2={by} {...PAINT.detail} />
        </g>
      ))}
      {/* ring beam */}
      <rect x={116} y={312.5} width={211.5} height={6.5} rx={1.5} {...PAINT.raised} />
      {/* level window */}
      <rect x={win.x} y={win.y} width={win.w} height={win.h} rx={4} {...PAINT.recess} />
      <path
        d={`M ${win.x + 3} 237 Q ${cx} 230 ${win.x + win.w - 3} 237 V ${win.y + win.h - 3} H ${win.x + 3} Z`}
        fill={MX.material}
        opacity={0.55}
      />
      <MachineLabel x={cx} y={255.5} size={8.5} tone="ink">
        CLINKER SILO
      </MachineLabel>
      {/* roof with handrail */}
      <Handrail x1={122.5} x2={322.5} y={167.5} h={10} step={20} />
      <path d={`M 116 169.5 L ${cx} 151 L 329 169.5 V 172 H 116 Z`} {...PAINT.raised} />
    </g>
  );
}

function Baghouse() {
  return (
    <g aria-hidden="true">
      {/* clean-air duct from the clean plenum over to the dust fan */}
      <Pipe pts={[[235, 72], [235, 48], [381, 48], [381, 98]]} d={10} />
      <rect x={186} y={71.5} width={98} height={79.5} rx={6} {...PAINT.body} />
      <line x1={189} x2={281} y1={111} y2={111} stroke={MX.fine} strokeWidth={1} strokeDasharray="4 3" />
      {[196, 274].map((bx) => (
        <g key={bx}>
          <Bolt x={bx} y={78} r={1.2} />
          <Bolt x={bx} y={144.5} r={1.2} />
        </g>
      ))}
      <MachineLabel x={235} y={81.5} size={5.5}>CLEAN PLENUM</MachineLabel>
      <MachineLabel x={235} y={126} size={5.5}>DIRTY PLENUM</MachineLabel>
      <MachineLabel x={226} y={64.5} size={6.5} anchor="end">BAGHOUSE</MachineLabel>

      {/* ΔP transmitter with its clean / dirty plenum impulse lines */}
      <path d="M 284 90 H 295 V 104 H 301.5" fill="none" stroke={MX.fine} strokeWidth={1} />
      <path d="M 284 131 H 295 V 118 H 301.5" fill="none" stroke={MX.fine} strokeWidth={1} />
      <rect x={301.5} y={84} width={18.5} height={41} rx={2.5} {...PAINT.raised} />
      <rect x={304.5} y={104} width={12.5} height={17} rx={1.5} {...PAINT.hair} />

      {/* roof radar: nozzle on the roof, antenna head */}
      <rect x={298.5} y={148} width={7.5} height={11} rx={1} {...PAINT.body} />
      <rect x={294} y={134.5} width={15} height={14} rx={3} {...PAINT.raised} />
    </g>
  );
}

function DustFan() {
  return (
    <g aria-hidden="true">
      <Volute cx={398} cy={133} r={27} outH={6} dir={-1} />
      <rect x={425} y={131} width={10} height={5} rx={1} {...PAINT.shaft} />
      <TefcMotor x={434} y={119} w={41} h={33.5} cowl={12.5} tb={[447, 16, 6.5]} fins={4} win={[444, 131, 17.5, 9]} flip />
      <MachineLabel x={407.5} y={183.5} size={6.5}>DUST FAN</MachineLabel>
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={22.5} x2={484} y={GROUND} />
      {/* inlet chute from the pan conveyor head */}
      <Tube x1={35} y1={102.5} x2={165} y2={133.5} d={9} />
      <line x1={36} y1={102.5} x2={164} y2={133.5} {...PAINT.hair} />
      <MachineLabel x={40} y={94.5} anchor="start" size={6.5}>FROM PAN CONVEYOR</MachineLabel>
      <Silo />
      <Baghouse />
      <DustFan />
    </g>
  );
}

/**
 * Pad centre per point (sheet units = page units − panel corner), as in the
 * panel; the ΔP pad sits on the transmitter head, at the printed chip row, so
 * its plate row clears the dust-fan plate.
 */
const pads: LineSheetArt["pads"] = {
  "PRS-CSL-01": [310.5, 93.5],
  "LEV-CSL-01": [301.5, 142.3],
  "ELE-CSL-02": [457, 116.5],
};

/** Plate side / stand-off slot per point: every plate runs left over the baghouse, fan and silo roof. */
const callouts: LineSheetArt["callouts"] = {
  "PRS-CSL-01": [290, 93.5, "end"],
  "LEV-CSL-01": [285, 142.3, "end"],
  "ELE-CSL-02": [440, 96.3, "end"],
};

export const sheet: LineSheetArt = { id: "H-3", ready: true, width: W, height: H, Art, pads, callouts };
