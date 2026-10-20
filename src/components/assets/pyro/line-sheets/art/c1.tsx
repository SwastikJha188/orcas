/**
 * Sheet C-1 — CLR-01 · Clinker cooler — Grate and compartments (group-images
 * PDF page 12 "5A", panel GRATE AND COMPARTMENTS).
 *
 * The kiln hood over the cooler inlet with the tertiary-air off-take, the
 * cooler casing with its clinker bed travelling toward the discharge over the
 * reciprocating grate, cooling air rising through the grate, six under-grate
 * compartments (pressure tap top right, hopper thermocouple low left) and the
 * cooling-fan risers down to the ground.
 */
import React from "react";
import { GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import type { LineSheetArt } from "../types";

/** Panel box on the page (page units): x 41.5…547.5, y 91…540. */
const W = 506;
const H = 449;
const GROUND = 414;

const CASE = { x: 40, y: 112, w: 440, h: 118 };
const GRATE = 222.5;
/** Compartment 1; 2 … 6 repeat at the pitch. */
const COMP = { x: 44, y: 236, w: 70, h: 75.5, pitch: 72.7 };
/** Pressure tap (top right) and hopper thermocouple (low left) in compartment 1. */
const TAP = { x: 101.5, y: 271.5 };
const HOP = { x: 57.7, y: 291 };
/** Pressure taps alternate a few units about the panel's tap row, so each pressure plate has its own lane. */
const tapY = (i: number) => TAP.y + (i % 2 ? 4.5 : -5);


const cx0 = (i: number) => COMP.x + i * COMP.pitch;

/** Filled flow arrowhead with its tip at (x, y), pointing along `deg` (0 = right, -90 = up). */
function Head({ x, y, deg, c, s = 5 }: { x: number; y: number; deg: number; c: string; s?: number }) {
  return <path d={`M ${x} ${y} l ${-s * 1.5} ${-s * 0.62} v ${s * 1.24} Z`} fill={c} transform={`rotate(${deg} ${x} ${y})`} />;
}

/** Small instrument body behind a pad. */
function Instrument({ x, y, r = 5 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} {...PAINT.raised} />
      <circle cx={x} cy={y} r={r * 0.45} {...PAINT.shaft} />
    </g>
  );
}

function KilnHood() {
  return (
    <g>
      <rect x={26.5} y={49.5} width={72} height={66.5} rx={5} {...PAINT.body} />
      {/* kiln nose glowing through the hood wall */}
      <rect x={27.5} y={56} width={9.5} height={54} rx={3} fill={MX.heat} fillOpacity={0.55} stroke={MX.edge} strokeWidth={0.8} />
      <MachineLabel x={62.5} y={46.5} size={5}>
        KILN HOOD
      </MachineLabel>
      {/* tertiary air off-take to the calciner */}
      <rect x={141.6} y={82} width={1.8} height={30} fill={MX.air} />
      <Head x={142.5} y={77.5} deg={-90} c={MX.air} s={4} />
      <text x={147} y={82} fill={MX.air} fontSize={5} fontWeight={600} letterSpacing="0.1em">
        TERTIARY AIR → CALCINER
      </text>
    </g>
  );
}

function Cooler() {
  const ix = CASE.x + 5;
  const ir = CASE.x + CASE.w - 5;
  // bed surface: thin at the inlet, deepest a third along, thinning to the discharge
  const surf = (x: number) => {
    const t = (x - ix) / (ir - ix);
    return 201.5 - 6.5 * Math.sin(Math.min(1, t * 1.6) * Math.PI * 0.5) + 8 * Math.max(0, t - 0.35) / 0.65;
  };
  const top = Array.from({ length: 41 }, (_, i) => {
    const x = ix + ((ir - ix) * i) / 40;
    return `${i ? "L" : "M"} ${x.toFixed(1)} ${surf(x).toFixed(1)}`;
  }).join(" ");
  const plates = Math.floor((ir - ix - 2) / 6.25);
  return (
    <g>
      <rect x={CASE.x} y={CASE.y} width={CASE.w} height={CASE.h} rx={5} {...PAINT.body} />
      {/* clinker bed on the grate */}
      <path d={`${top} L ${ir} ${GRATE} L ${ix} ${GRATE} Z`} fill={MX.material} opacity={0.3} />
      <path d={top} fill="none" stroke={MX.material} strokeWidth={0.8} opacity={0.5} />
      <MachineLabel x={257.5} y={125.5} size={5}>
        CLINKER BED — TRAVELS TOWARD THE DISCHARGE →
      </MachineLabel>
      {/* reciprocating grate plates */}
      <rect x={43} y={GRATE} width={434.5} height={4} rx={1} {...PAINT.raised} />
      {Array.from({ length: plates }).map((_, i) => (
        <line key={i} x1={ix + 3 + i * 6.25} x2={ix + 3 + i * 6.25} y1={GRATE + 0.6} y2={GRATE + 3.4} {...PAINT.hair} />
      ))}
      {/* cooling air up through the grate */}
      {Array.from({ length: 16 }).map((_, i) => (
        <Head key={i} x={62.5 + i * 26.6} y={231} deg={-90} c={MX.air} s={3.3} />
      ))}
      <rect x={115.4} y={233} width={1.2} height={22} fill={MX.air} />
    </g>
  );
}

function Compartment({ i }: { i: number }) {
  const x = cx0(i);
  const o = i * COMP.pitch;
  const dx = x + COMP.w / 2;
  const ty = tapY(i);
  const hx = HOP.x + o;
  return (
    <g>
      {/* fan riser duct from the ground up to the compartment */}
      <rect x={dx - 7.5} y={COMP.y + COMP.h} width={15} height={GROUND - COMP.y - COMP.h} {...PAINT.body} />
      <rect x={dx - 2.6} y={COMP.y + COMP.h} width={5.2} height={GROUND - COMP.y - COMP.h} {...PAINT.recess} />
      <rect x={x} y={COMP.y} width={COMP.w} height={COMP.h} rx={4} {...PAINT.body} />
      {/* pressure tap with its impulse line to the wall; hopper thermocouple */}
      <line x1={TAP.x + o} x2={x + COMP.w} y1={ty} y2={ty} stroke={MX.fine} strokeWidth={1} />
      <Instrument x={TAP.x + o} y={ty} />
      <line x1={x} x2={hx} y1={HOP.y} y2={HOP.y} stroke={MX.fine} strokeWidth={1} />
      <Instrument x={hx} y={HOP.y} />
      <MachineLabel x={dx} y={304} size={4.4}>{`COMPARTMENT ${i + 1}`}</MachineLabel>
      <MachineLabel x={dx} y={425} size={4.4}>{`FAN ${i + 1}`}</MachineLabel>
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={22.5} x2={484} y={GROUND} />
      <KilnHood />
      <Cooler />
      {Array.from({ length: 6 }).map((_, i) => (
        <Compartment key={i} i={i} />
      ))}
      <text x={142} y={380} fill={MX.material} fontSize={5} fontWeight={600} letterSpacing="0.1em" textAnchor="middle">
        HOT ZONE: FANS 1–3
      </text>
      <MachineLabel x={363.5} y={380} size={5}>
        FANS 4–6
      </MachineLabel>
    </g>
  );
}

/**
 * Pads as on the panel. Each compartment repeats one pattern: the pressure
 * plate runs left along the top of the compartment (taps alternate a few
 * units up and down so neighbouring plates do not touch), the hopper plate
 * right along its bottom. Stand-off slots (used only if a reading is too wide for
 * the pitch) sit in two aligned rows under the compartments.
 */
const pads: LineSheetArt["pads"] = {};
const callouts: NonNullable<LineSheetArt["callouts"]> = {};
for (let i = 0; i < 6; i++) {
  const o = i * COMP.pitch;
  const n = `0${i + 1}`;
  pads[`PRS-CLR-${n}`] = [TAP.x + o, tapY(i)];
  pads[`TMP-CLR-${11 + i}`] = [HOP.x + o, HOP.y];
  callouts[`PRS-CLR-${n}`] = [TAP.x + o + 4, 336, "end"];
  callouts[`TMP-CLR-${11 + i}`] = [HOP.x + o - 4, 323, "start"];
}

export const sheet: LineSheetArt = { id: "C-1", ready: true, width: W, height: H, Art, pads, callouts };
