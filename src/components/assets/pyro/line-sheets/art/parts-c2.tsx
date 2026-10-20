/**
 * Group C part-sheet pieces drawn from the machine group images (PDF page 13
 * "5B"): the row of three cooling fans under "COMPARTMENTS ABOVE" shared by
 * C-2 (fans 1–3) and C-3 (fans 4–6). Each fan: riser duct up to its
 * compartment, spiral volute with inlet ring and four-blade impeller, shaft
 * stub, bearing housing, motor (terminal box on top, side box, fan cowl) on
 * the common base rail. Sheet units = page units minus the panel origin.
 */
import React from "react";
import { Bolt, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { volutePath } from "./parts-c";

/** Panel size of both fan panels (page 13: 763 × 672). */
export const FAN_SHEET = { w: 763, h: 672 };
/** Fan pitch along the row. */
export const FAN_PITCH = 222.8;
/** Fan 1 (or 4) geometry in sheet units; fans 2–3 repeat at the pitch. */
export const FAN = {
  cx: 111.5,
  cy: 431.5,
  r: 61,
  top: 356,
  duct: { x: 61, w: 25 },
  bearing: { x: 173.25, y: 408.75, w: 18.5, h: 43.75 },
  motor: { x: 182.5, y: 398, w: 68.25, h: 60.75 },
  /** Pads: motor terminal box (current), bearing top (vibration), bearing bottom, motor winding. */
  pads: { ele: [222.7, 391.5], vib: [182.3, 415], brg: [182.3, 442], wdg: [214, 443] } as Record<string, [number, number]>,
};
const RAIL = { y: 499, h: 10, x0: 37.5, x1: 712.5 };
const GROUND = 621;

function Impeller({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={38} {...PAINT.raised} />
      <circle cx={cx} cy={cy} r={30.5} {...PAINT.recess} />
      {[0, 90, 180, 270].map((a) => (
        <path
          key={a}
          d={`M ${cx + 4} ${cy - 3} C ${cx + 8} ${cy - 16} ${cx + 4} ${cy - 24} ${cx + 1} ${cy - 27} C ${cx - 3} ${cy - 20} ${cx - 4} ${cy - 10} ${cx - 2} ${cy - 4} Z`}
          fill={MX.flatRaised}
          stroke={MX.edge}
          strokeWidth={0.9}
          strokeLinejoin="round"
          transform={`rotate(${a + 12} ${cx} ${cy})`}
        />
      ))}
      <circle cx={cx} cy={cy} r={7} {...PAINT.shaft} />
    </g>
  );
}

function CoolingFan({ k, n }: { k: number; n: number }) {
  const o = k * FAN_PITCH;
  const cx = FAN.cx + o;
  const { cy, r, top } = FAN;
  const v = volutePath(cx, cy, r, top, 1);
  const b = FAN.bearing;
  const m = FAN.motor;
  return (
    <g>
      {/* riser duct up to the compartment */}
      <rect x={FAN.duct.x + o} y={115} width={FAN.duct.w} height={top - 115 + 1} {...PAINT.body} />
      <rect x={FAN.duct.x + o + 8} y={116} width={9} height={top - 116} {...PAINT.recess} />
      <MachineLabel x={74 + o} y={147.5} size={5.5}>{`COMP. ${n}`}</MachineLabel>
      {/* spiral volute, inlet ring and impeller */}
      <path d={v.d} {...PAINT.body} />
      {[
        [-32.5, -38],
        [38, -31.5],
        [-38, 32.5],
        [38, 32.5],
      ].map(([dx, dy], i) => (
        <Bolt key={i} x={cx + dx} y={cy + dy} r={1.9} />
      ))}
      <Impeller cx={cx} cy={cy} />
      {/* shaft stub, motor and bearing housing */}
      <rect x={169.5 + o} y={423.75} width={5} height={8.75} rx={1} {...PAINT.shaft} />
      <rect x={m.x + 6 + o} y={m.y + m.h} width={m.w - 12} height={6} rx={1.5} {...PAINT.body} />
      <rect x={251.5 + o} y={403.75} width={16.75} height={49.25} rx={8} {...PAINT.body} />
      <rect x={m.x + o} y={m.y} width={m.w} height={m.h} rx={7} {...PAINT.body} />
      {[408, 416, 424, 448].map((y) => (
        <line key={y} x1={m.x + 14 + o} x2={m.x + m.w - 4 + o} y1={y} y2={y} {...PAINT.hair} />
      ))}
      <rect x={204.25 + o} y={421.25} width={24.5} height={16.25} rx={2.5} {...PAINT.recess} />
      <rect x={202.5 + o} y={385} width={30} height={13.75} rx={3} {...PAINT.raised} />
      <rect x={b.x + o} y={b.y} width={b.w} height={b.h} rx={3} {...PAINT.raised} />
      <line x1={b.x + 2 + o} x2={b.x + b.w - 2 + o} y1={cy - 2.5} y2={cy - 2.5} stroke={MX.fine} strokeWidth={0.9} />
      <MachineLabel x={152 + o} y={546.5} size={5.5}>{`COOLING FAN ${n}`}</MachineLabel>
    </g>
  );
}

/** Header box, three cooling fans on the base rail and the ground. */
export function CoolingFanRow({ first }: { first: number }) {
  const seg = [RAIL.x0, 260, 483, RAIL.x1];
  return (
    <g>
      <GroundLine x1={30} x2={733.5} y={GROUND} />
      <MachineLabel x={381.5} y={47} size={6}>
        COMPARTMENTS ABOVE
      </MachineLabel>
      <rect x={37.5} y={53.5} width={688.5} height={61.5} rx={6} {...PAINT.body} />
      {seg.slice(1).map((x, i) => (
        <rect key={x} x={seg[i]} y={RAIL.y} width={x - seg[i]} height={RAIL.h} rx={2} {...PAINT.body} />
      ))}
      {[0, 1, 2].map((k) => (
        <CoolingFan key={k} k={k} n={first + k} />
      ))}
    </g>
  );
}
