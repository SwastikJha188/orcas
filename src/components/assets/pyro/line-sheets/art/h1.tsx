/**
 * Sheet H-1 — HMR-01 · Clinker crusher — Hammer crusher and motor.
 * Drawn as the "HAMMER CRUSHER AND MOTOR" panel of the machine-group images
 * (page 14, panel box 42, 91.5 – 547.5, 540.5): crusher motor and coupling on
 * the left, the hammer crusher (feed chute from the cooler, hopper, hammer
 * rotor cut-away) between its DE and NDE rotor bearing blocks, speed pickup on
 * the NDE shaft end, common base frame, discharge down to the pan conveyor.
 */
import React from "react";
import { Bolt, Coupling, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import type { LineSheetArt } from "../types";
import { BearingBlock, FlowArrow, Lumps, TefcMotor } from "./parts-h2";

const W = 505.5;
const H = 449;

const GROUND = 404;
const LABEL_Y = 421;
const SY = 306.5; // rotor / motor shaft centre line
const ROT = { cx: 292.5, cy: 271.5, r: 62.5 };
const FRAME = { y: 377.5, h: 11.5 };

function Motor() {
  return (
    <g aria-hidden="true">
      {/* feet down to the base frame */}
      {[78, 148].map((fx) => (
        <g key={fx}>
          <path d={`M ${fx} 347 H ${fx + 16} L ${fx + 19} ${FRAME.y} H ${fx - 3} Z`} {...PAINT.body} />
          <Bolt x={fx + 8} y={FRAME.y - 4} r={1.3} />
        </g>
      ))}
      <TefcMotor x={58.5} y={271} w={119} h={73} cowl={24} tb={[94, 47.5, 16]} fins={6} win={[97.5, 298, 40.5, 18]} />
      {/* lifting eye */}
      <path d="M 156 271 v -5 a 3.5 3.5 0 0 1 7 0 v 5" fill="none" stroke={MX.edge} strokeWidth={1.2} />
      {/* motor shaft, coupling, crusher shaft */}
      <rect x={177.5} y={SY - 4} width={39} height={8} rx={1.5} {...PAINT.shaft} />
      <Coupling x={185} y={SY - 8.5} w={22.5} h={17} />
    </g>
  );
}

function Crusher() {
  const { cx, cy, r } = ROT;
  const hammers = Array.from({ length: 8 }).map((_, i) => {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    return [cx + Math.cos(a) * 44.5, cy + Math.sin(a) * 44.5] as [number, number];
  });
  return (
    <g aria-hidden="true">
      {/* feed chute from the cooler */}
      <rect x={278.5} y={40} width={28.5} height={71} rx={1.5} {...PAINT.cylinderV} />
      <rect x={289} y={40} width={9} height={71} rx={1} {...PAINT.recess} />
      <Lumps pts={[[293.5, 56], [292.5, 78], [294, 98]]} r={2.4} />
      <MachineLabel x={302} y={50} anchor="start" size={6.5}>CLINKER FROM COOLER</MachineLabel>

      {/* skirt down to the base frame */}
      <rect x={262} y={368.5} width={61} height={FRAME.y - 368.5} rx={1} {...PAINT.body} />
      {/* hopper and housing */}
      <path d="M 270.5 124.5 H 311.5 L 332.5 159 V 368.5 H 252.5 V 159 Z" {...PAINT.body} />
      <path d="M 273 128.5 H 309 L 328.5 160.5 V 364.5 H 256.5 V 160.5 Z" {...PAINT.hair} />
      <line x1={254} x2={331} y1={159} y2={159} stroke={MX.fine} strokeWidth={1} />
      {[262, 323].map((bx) => (
        <Bolt key={bx} x={bx} y={164} r={1.3} />
      ))}

      {/* hammer rotor cut-away */}
      <circle cx={cx} cy={cy} r={r} {...PAINT.body} />
      <circle cx={cx} cy={cy} r={r - 4.5} {...PAINT.hair} />
      {hammers.map(([hx, hy]) => (
        <g key={`${hx}-${hy}`}>
          <rect x={hx - 7} y={hy - 7} width={14} height={14} rx={2.5} {...PAINT.raised} />
          <line x1={hx - 3.5} x2={hx + 3.5} y1={hy} y2={hy} {...PAINT.hair} />
        </g>
      ))}
      <circle cx={cx} cy={cy} r={13.5} {...PAINT.raised} />
      <circle cx={cx} cy={cy} r={5} {...PAINT.shaft} />

      {/* rotor shaft through the bearing blocks, NDE stub to the speed pickup */}
      <rect x={368.5} y={SY - 4} width={31} height={8} rx={1.5} {...PAINT.shaft} />
      {/* bearing pedestals and blocks */}
      {[216.5, 332.5].map((bx) => (
        <rect key={`p${bx}`} x={bx + 6} y={337} width={24} height={FRAME.y - 337} rx={1} {...PAINT.body} />
      ))}
      <BearingBlock x={216.5} y={274} w={36} h={65} split={SY} />
      <BearingBlock x={332.5} y={274} w={36} h={65} split={SY} />
      <MachineLabel x={350.5} y={348} size={6.5}>NDE</MachineLabel>

      {/* speed pickup on the NDE shaft end */}
      <rect x={398.5} y={298} width={14.5} height={17} rx={2.5} {...PAINT.raised} />
      <rect x={413} y={SY - 2} width={6} height={4} rx={1} {...PAINT.shaft} />

      {/* discharge to the pan conveyor */}
      <FlowArrow x1={292.5} y1={372} x2={292.5} y2={401} w={1.8} s={8} />
      <MachineLabel x={302} y={401} anchor="start" size={6.5}>TO PAN CONVEYOR</MachineLabel>
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={22.5} x2={482.5} y={GROUND} />
      {/* base frame */}
      <rect x={26} y={FRAME.y} width={453} height={FRAME.h} rx={3} {...PAINT.body} />
      <line x1={30} x2={475} y1={FRAME.y + 3.5} y2={FRAME.y + 3.5} {...PAINT.hair} />
      {[40, 130, 210, 380, 465].map((bx) => (
        <Bolt key={bx} x={bx} y={FRAME.y + 7.5} r={1.4} />
      ))}
      {[34, 452].map((px) => (
        <rect key={px} x={px} y={FRAME.y + FRAME.h} width={20} height={GROUND - FRAME.y - FRAME.h} rx={1} {...PAINT.raised} />
      ))}
      <Motor />
      <Crusher />
      <MachineLabel x={106.5} y={LABEL_Y} size={6.5}>CRUSHER MOTOR</MachineLabel>
      <MachineLabel x={292.5} y={LABEL_Y} size={6.5}>HAMMER ROTOR (CUTAWAY)</MachineLabel>
    </g>
  );
}

/**
 * Pad centre per point (sheet units = page units − panel corner), as in the
 * panel. The bearing-block pads sit a few units further apart than printed
 * (blocks drawn a little taller) so the vibration / speed-and-winding /
 * temperature plate rows clear each other.
 */
const pads: LineSheetArt["pads"] = {
  "ELE-HMR-01": [107, 255.5],
  "TMP-HMR-03": [106.2, 306.5],
  "VIB-HMR-01": [234.8, 283.5],
  "TMP-HMR-01": [234.8, 329.5],
  "VIB-HMR-02": [350.2, 283.5],
  "TMP-HMR-02": [350.2, 329.5],
  "SPD-HMR-01": [405.5, 306.5],
};

/** Plate side / stand-off slot per point, from the panel's label chips. */
const callouts: LineSheetArt["callouts"] = {
  "ELE-HMR-01": [107.5, 233.3, "middle"],
  "TMP-HMR-03": [65, 362.5, "start"],
  "VIB-HMR-01": [210, 268, "end"],
  "TMP-HMR-01": [210, 346, "end"],
  "VIB-HMR-02": [366.5, 289, "start"],
  "SPD-HMR-01": [422.5, 306.7, "start"],
  "TMP-HMR-02": [366.5, 324.5, "start"],
};

export const sheet: LineSheetArt = { id: "H-1", ready: true, width: W, height: H, Art, pads, callouts };
