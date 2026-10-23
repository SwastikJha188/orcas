/**
 * Sheet H-2 — CSL-01 · Clinker transport — Deep-pan conveyor.
 * Drawn as the "DEEP-PAN CONVEYOR" panel of the machine-group images (page 14,
 * panel box 574, 91.5 – 1080, 540.5): the inclined pan conveyor from the tail
 * shaft (fed from the crusher) up to the head drum on its three support
 * columns, and the head drive (motor over the reducer) discharging to the
 * clinker silo. Rev 02 adds the casing temperature, the motor's DE / NDE
 * bearing vibration and temperature and the reducer (head-drive gearbox)
 * vibration; the tail-shaft speed is a zero-speed switch.
 */
import React from "react";
import { Bolt, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import type { LineSheetArt } from "../types";
import { Column } from "./parts-h";
import { FlowArrow, TefcMotor } from "./parts-h2";

const W = 506;
const H = 449;

const GROUND = 413;
const TAIL: [number, number] = [71, 394.5];
const HEAD: [number, number] = [416.5, 118.5];
const ANG = (Math.atan2(HEAD[1] - TAIL[1], HEAD[0] - TAIL[0]) * 180) / Math.PI;
const LEN = Math.hypot(HEAD[0] - TAIL[0], HEAD[1] - TAIL[1]);

/** Conveyor casing from tail to head with the clinker-laden pans (gold dashes) along the strand. */
function Conveyor() {
  const d = 26;
  const dashes = Math.floor((LEN - 30) / 22);
  return (
    <g transform={`translate(${TAIL[0]} ${TAIL[1]}) rotate(${ANG})`} aria-hidden="true">
      <rect x={-8} y={-d / 2} width={LEN + 8} height={d} rx={d / 2} {...PAINT.body} />
      <line x1={10} x2={LEN - 12} y1={-d / 2 + 3.5} y2={-d / 2 + 3.5} {...PAINT.hair} />
      <line x1={10} x2={LEN - 12} y1={d / 2 - 3.5} y2={d / 2 - 3.5} stroke={MX.fine} strokeWidth={0.8} strokeDasharray="4 3" />
      {Array.from({ length: dashes }).map((_, i) => (
        <rect key={i} x={20 + i * 22} y={-2.4} width={11} height={4.8} rx={1.6} fill={MX.material} />
      ))}
    </g>
  );
}

function Drums() {
  return (
    <g aria-hidden="true">
      {/* tail shaft */}
      <circle cx={TAIL[0]} cy={TAIL[1]} r={13.5} {...PAINT.raised} />
      <circle cx={TAIL[0]} cy={TAIL[1]} r={10} {...PAINT.hair} />
      {/* head drum and its shaft into the reducer */}
      <rect x={HEAD[0]} y={HEAD[1] - 2.5} width={19} height={5} rx={1} {...PAINT.shaft} />
      <circle cx={HEAD[0]} cy={HEAD[1]} r={15} {...PAINT.cylinder} />
      <circle cx={HEAD[0]} cy={HEAD[1]} r={4} {...PAINT.shaft} />
    </g>
  );
}

function HeadDrive() {
  return (
    <g aria-hidden="true">
      {/* reducer */}
      <rect x={435} y={94} width={49} height={40} rx={4} {...PAINT.body} />
      <rect x={438} y={97} width={43} height={34} rx={3} {...PAINT.hair} />
      {[
        [438.5, 97.5],
        [480.5, 97.5],
        [438.5, 130.5],
        [480.5, 130.5],
      ].map(([bx, by]) => (
        <Bolt key={`${bx}-${by}`} x={bx} y={by} r={1.2} />
      ))}
      <circle cx={448} cy={116} r={6.25} fill="none" stroke={MX.edge} strokeWidth={1} />
      <circle cx={448} cy={116} r={2} {...PAINT.shaft} />
      <circle cx={465} cy={110.5} r={12.5} fill="none" stroke={MX.edge} strokeWidth={1} />
      <circle cx={465} cy={110.5} r={4.5} {...PAINT.shaft} />
      {/* motor stool and motor */}
      <rect x={443} y={89} width={4} height={5} {...PAINT.raised} />
      <rect x={470} y={89} width={4} height={5} {...PAINT.raised} />
      <TefcMotor x={412.5} y={53.75} w={67.5} h={31.25} cowl={12.5} tb={[432.5, 27, 8]} fins={4} win={[434.5, 66, 15.5, 8]} />
      <rect x={480} y={67.5} width={7.5} height={4} rx={1} {...PAINT.shaft} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={22.5} x2={484} y={GROUND} />
      {/* support columns under the casing */}
      {[
        [155.5, 336],
        [257.5, 254],
        [355, 176],
      ].map(([x, top]) => (
        <Column key={x} x={x} y1={top} y2={GROUND} w={5} />
      ))}
      <Conveyor />
      <Drums />
      <HeadDrive />

      {/* discharge from the head to the clinker silo */}
      <FlowArrow x1={430} y1={137.5} x2={470} y2={170} w={1.6} s={7} />

      <MachineLabel x={452.5} y={148} size={6.5}>HEAD DRIVE</MachineLabel>
      <MachineLabel x={451.5} y={183.5} size={6.5}>TO CLINKER SILO</MachineLabel>
      <MachineLabel x={217.5} y={219} size={6.5}>DEEP-PAN CONVEYOR</MachineLabel>
      <MachineLabel x={71} y={374.5} size={6.5}>TAIL SHAFT</MachineLabel>
      <MachineLabel x={78.5} y={423} size={6.5}>FROM CRUSHER</MachineLabel>
    </g>
  );
}

/**
 * Pad centre per point (sheet units = page units − panel corner), as in the
 * panel: motor DE (shaft end, right) and NDE (cowl end, left) bearing
 * vibration high and temperature low, winding in the motor window, current on
 * the terminal box, gearbox vibration on the reducer; casing temperature on the
 * strand; the zero-speed switch on the tail shaft.
 */
const pads: LineSheetArt["pads"] = {
  "TMP-CSL-01": [278.3, 228.9],
  "VIB-CSL-01": [474, 62],
  "VIB-CSL-03": [419, 62],
  "VIB-CSL-02": [459.2, 125],
  "TMP-CSL-03": [474, 78],
  "TMP-CSL-04": [419, 78],
  "TMP-CSL-02": [446.5, 70],
  "ELE-CSL-01": [439.2, 50],
  "SPD-CSL-01": [71, 394.5],
};

/** Plate side / stand-off slot per point: motor plates stack left of the head drive, the gearbox plate under it, casing and tail-shaft plates along the strand. */
const callouts: LineSheetArt["callouts"] = {
  "TMP-CSL-01": [300, 262, "start"],
  "VIB-CSL-01": [385, 96, "end"],
  "VIB-CSL-03": [385, 42, "end"],
  "VIB-CSL-02": [440, 205, "middle"],
  "TMP-CSL-03": [385, 114, "end"],
  "TMP-CSL-04": [385, 60, "end"],
  "TMP-CSL-02": [385, 78, "end"],
  "ELE-CSL-01": [385, 24, "end"],
  "SPD-CSL-01": [86, 394.5, "start"],
};

export const sheet: LineSheetArt = { id: "H-2", ready: true, width: W, height: H, Art, pads, callouts };
