/**
 * Layout → 2D machine-kit sheet. Every item type is drawn from the kit parts
 * (parts-2d / machine-kit) with its house detail, so a spec-made drawing reads
 * like the hand-drawn pyro sheets: graphite bodies, bolts, flanges, one floor
 * line, orthogonal pipes with flow arrows, instruments on the outlines,
 * upper-case labels under the floor.
 */
import React from "react";
import type { LineSheetArt } from "@/components/assets/pyro/line-sheets/types";
import { Bolt, CornerBolts, Coupling, GroundLine, Housing, MachineLabel, MX, PAINT } from "../machine-kit";
import {
  Baghouse, Baseplate, BoltLine, BucketElevator, Cabinet, Chamber, Column, Conveyor, Cyclone, Drum, ElectricMotor, FanSet, Flange,
  Frame, GasCylinder, Gearbox, HeatExchanger, Hopper, HorizontalVessel, Louvres, MEDIUM, Panel, Plinth, PumpSet, Stack, Tank, Valve,
} from "../parts-2d";
import { LABEL_SIZE } from "./layout";
import type { Box, LaidItem, LaidLink, Layout, Medium, Pt, Trace } from "./types";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const mirrorX = (b: Box) => `translate(${Math.round(2 * (b.x + b.w / 2) * 100) / 100} 0) scale(-1 1)`;

/* ------------------------------------------------------------------ */
/* Composite parts the kit does not have                               */
/* ------------------------------------------------------------------ */

/** Power unit / induction generator: louvred housing on feet, lifting eye, display, cable glands. */
function Generator({ x, y, w, h }: Box) {
  const feet = Math.max(6, h * 0.1);
  const bh = h - feet;
  return (
    <g>
      {[0.12, 0.72].map((f) => (
        <path key={f} d={`M ${x + w * f} ${y + h} l ${w * 0.04} ${-feet} h ${w * 0.08} l ${w * 0.04} ${feet} Z`} {...PAINT.body} />
      ))}
      <rect x={x + w * 0.45} y={y - Math.min(14, h * 0.08)} width={w * 0.1} height={Math.min(16, h * 0.1)} rx={4} {...PAINT.raised} />
      <circle cx={x + w * 0.5} cy={y - Math.min(14, h * 0.08) + Math.min(8, h * 0.05)} r={Math.min(3.5, w * 0.02)} {...PAINT.recess} />
      <rect x={x} y={y} width={w} height={bh} rx={7} {...PAINT.body} />
      <rect x={x + 5} y={y + 5} width={w - 10} height={bh - 10} rx={5} {...PAINT.hair} />
      {Array.from({ length: Math.max(3, Math.round(bh / 14)) }).map((_, i, a) => (
        <line key={i} x1={x + w * 0.14} x2={x + w * 0.86} y1={y + bh * 0.16 + (i * bh * 0.4) / a.length} y2={y + bh * 0.16 + (i * bh * 0.4) / a.length} {...PAINT.hair} />
      ))}
      <rect x={x + w * 0.38} y={y + bh * 0.62} width={w * 0.24} height={bh * 0.18} rx={2.5} {...PAINT.recess} />
      {[0.32, 0.62].map((f) => (
        <g key={f}>
          <rect x={x - 6} y={y + bh * f - 5} width={6} height={10} rx={1.5} {...PAINT.raised} />
          <rect x={x + w} y={y + bh * f - 5} width={6} height={10} rx={1.5} {...PAINT.raised} />
        </g>
      ))}
      <CornerBolts x={x} y={y} w={w} h={bh} inset={8} r={1.3} />
    </g>
  );
}

/** Vacuum pump set: motor, coupling guard and a finned pump body with inlet flange, on a skid. */
function VacuumPump({ x, y, w, h, motor = "right" }: Box & { motor?: "left" | "right" }) {
  const skid = Math.max(8, h * 0.13);
  const top = y;
  const bodyH = h - skid;
  const pw = w * 0.4;
  const art = (
    <g>
      <Baseplate x={x} y={y + h - skid} w={w} h={skid} />
      {/* pump body (left in the unmirrored drawing) */}
      <rect x={x + w * 0.05} y={top + bodyH * 0.08} width={pw} height={bodyH * 0.92} rx={10} {...PAINT.body} />
      {Array.from({ length: 6 }).map((_, i) => (
        <line key={i} x1={x + w * 0.05 + pw * 0.2} x2={x + w * 0.05 + pw * 0.8} y1={top + bodyH * (0.22 + i * 0.11)} y2={top + bodyH * (0.22 + i * 0.11)} {...PAINT.hair} />
      ))}
      <rect x={x + w * 0.05 + pw * 0.3} y={top + bodyH * 0.42} width={pw * 0.4} height={bodyH * 0.16} rx={2} {...PAINT.recess} />
      <rect x={x} y={top + bodyH * 0.3} width={w * 0.06} height={bodyH * 0.3} rx={2} {...PAINT.raised} />
      <Flange x={x + 2} y={top + bodyH * 0.45} d={bodyH * 0.24} />
      <rect x={x + w * 0.05 + pw * 0.4} y={top} width={pw * 0.2} height={bodyH * 0.1} rx={1.5} {...PAINT.raised} />
      <Coupling x={x + w * 0.47} y={top + bodyH * 0.38} w={w * 0.06} h={bodyH * 0.3} />
      <ElectricMotor x={x + w * 0.54} y={top + bodyH * 0.12} w={w * 0.46} h={bodyH * 0.88} shaft="left" />
    </g>
  );
  return motor === "right" ? art : <g transform={mirrorX({ x, y, w, h })}>{art}</g>;
}

/** Pneumatic / hydraulic cylinder: end caps, barrel with tie rods, ports, rod and rod end. */
function Actuator({ x, y, w, h, horizontal = false }: Box & { horizontal?: boolean }) {
  if (horizontal) {
    return (
      <g transform={`rotate(-90 ${x + w / 2} ${y + h / 2})`}>
        <Actuator x={x + w / 2 - h / 2} y={y + h / 2 - w / 2} w={h} h={w} />
      </g>
    );
  }
  const bw = w * 0.82;
  const bx = x + (w - bw) / 2;
  const capH = Math.max(5, h * 0.06);
  const barrelH = h * 0.56;
  const rod = Math.max(4, w * 0.22);
  return (
    <g>
      <rect x={x + w / 2 - rod / 2} y={y + capH * 2 + barrelH - 4} width={rod} height={h - (capH * 2 + barrelH) + 4} rx={1.5} {...PAINT.shaft} />
      <rect x={x + w / 2 - rod * 0.9} y={y + h - capH} width={rod * 1.8} height={capH} rx={1.5} {...PAINT.raised} />
      <rect x={bx} y={y + capH} width={bw} height={barrelH} rx={3} {...PAINT.cylinderV} />
      {[0.12, 0.88].map((f) => (
        <line key={f} x1={bx + bw * f} x2={bx + bw * f} y1={y + capH} y2={y + capH + barrelH} stroke={MX.metal} strokeWidth={1.2} />
      ))}
      <rect x={x} y={y} width={w} height={capH * 1.4} rx={2} {...PAINT.raised} />
      <rect x={x} y={y + capH + barrelH - capH * 0.4} width={w} height={capH * 1.4} rx={2} {...PAINT.raised} />
      <rect x={x + w / 2 - w * 0.12} y={y - capH} width={w * 0.24} height={capH} rx={1.5} {...PAINT.shaft} />
      <rect x={x + w} y={y + capH * 2} width={w * 0.14} height={capH} rx={1} {...PAINT.raised} />
      <rect x={x + w} y={y + capH + barrelH - capH * 1.6} width={w * 0.14} height={capH} rx={1} {...PAINT.raised} />
      <Bolt x={x + 4} y={y + capH * 0.7} r={1} />
      <Bolt x={x + w - 4} y={y + capH * 0.7} r={1} />
    </g>
  );
}

/** Cooling unit: radiator / chiller block with fan and louvres beside its circulation pump, on one skid. */
function CoolingUnit({ x, y, w, h, motor = "right" }: Box & { motor?: "left" | "right" }) {
  const skid = Math.max(8, h * 0.1);
  const bw = w * 0.4;
  const art = (
    <g>
      <Baseplate x={x} y={y + h - skid} w={w} h={skid} />
      <rect x={x + 4} y={y} width={bw} height={h - skid} rx={6} {...PAINT.body} />
      <Louvres x={x + 4 + bw * 0.14} y={y + (h - skid) * 0.12} w={bw * 0.72} h={(h - skid) * 0.6} step={6} />
      <rect x={x + 4 + bw * 0.2} y={y - Math.min(12, h * 0.08)} width={bw * 0.6} height={Math.min(12, h * 0.08)} rx={2} {...PAINT.raised} />
      <CornerBolts x={x + 4} y={y} w={bw} h={h - skid} inset={6} r={1.2} />
      <PumpSet x={x + bw + 14} y={y + (h - skid) * 0.32} w={w - bw - 14} h={(h - skid) * 0.68 + skid} motor="right" />
    </g>
  );
  return motor === "right" ? art : <g transform={mirrorX({ x, y, w, h })}>{art}</g>;
}

/** Compressor: air receiver below, finned compressor block, belt guard and motor on top. */
function Compressor({ x, y, w, h }: Box) {
  const rh = h * 0.5;
  return (
    <g>
      <HorizontalVessel x={x} y={y + h - rh} w={w} h={rh} />
      <rect x={x + w * 0.1} y={y + h * 0.12} width={w * 0.36} height={h * 0.34} rx={6} {...PAINT.body} />
      {Array.from({ length: 5 }).map((_, i) => (
        <line key={i} x1={x + w * 0.13} x2={x + w * 0.43} y1={y + h * (0.17 + i * 0.06)} y2={y + h * (0.17 + i * 0.06)} stroke={MX.fine} strokeWidth={1} />
      ))}
      <rect x={x + w * 0.2} y={y} width={w * 0.16} height={h * 0.12} rx={2} {...PAINT.raised} />
      <rect x={x + w * 0.46} y={y + h * 0.2} width={w * 0.1} height={h * 0.26} rx={3} {...PAINT.raised} />
      <ElectricMotor x={x + w * 0.58} y={y + h * 0.2} w={w * 0.34} h={h * 0.3} shaft="left" />
    </g>
  );
}

/** Motor + coupling + gearbox on one baseplate. */
function DriveTrain({ x, y, w, h, motor = "left" }: Box & { motor?: "left" | "right" }) {
  const bp = Math.max(8, h * 0.1);
  const art = (
    <g>
      <Baseplate x={x} y={y + h - bp} w={w} h={bp} />
      <ElectricMotor x={x} y={y + h * 0.3} w={w * 0.42} h={h * 0.7 - bp} shaft="right" />
      <Coupling x={x + w * 0.43} y={y + h * 0.42} w={w * 0.06} h={h * 0.22} />
      <Gearbox x={x + w * 0.52} y={y} w={w * 0.44} h={h - bp} input="left" />
    </g>
  );
  return motor === "left" ? art : <g transform={mirrorX({ x, y, w, h })}>{art}</g>;
}

/** Hydraulic / lube unit: reservoir with sight glass, motor-pump on the lid, return filter and gauge. */
function HydraulicUnit({ x, y, w, h }: Box) {
  const ty = y + h * 0.42;
  return (
    <g>
      <rect x={x + w * 0.1} y={y + h - 6} width={w * 0.12} height={6} rx={1} {...PAINT.body} />
      <rect x={x + w * 0.78} y={y + h - 6} width={w * 0.12} height={6} rx={1} {...PAINT.body} />
      <rect x={x} y={ty} width={w} height={y + h - 6 - ty} rx={6} {...PAINT.body} />
      <Panel x={x + w * 0.08} y={ty + (y + h - ty) * 0.18} w={w * 0.34} h={(y + h - ty) * 0.5} />
      <rect x={x + w * 0.6} y={ty + (y + h - ty) * 0.2} width={w * 0.08} height={(y + h - ty) * 0.5} rx={2} {...PAINT.recess} />
      <rect x={x + w * 0.6 + 2} y={ty + (y + h - ty) * 0.42} width={w * 0.08 - 4} height={(y + h - ty) * 0.26} rx={1.5} {...PAINT.material} />
      <ElectricMotor x={x + w * 0.06} y={y + h * 0.1} w={w * 0.48} h={h * 0.32} shaft="right" />
      <rect x={x + w * 0.56} y={y + h * 0.22} width={w * 0.14} height={h * 0.2} rx={3} {...PAINT.raised} />
      <rect x={x + w * 0.78} y={y + h * 0.12} width={w * 0.12} height={h * 0.3} rx={w * 0.05} {...PAINT.cylinderV} />
      <circle cx={x + w * 0.84} cy={y + h * 0.06} r={Math.min(7, w * 0.05)} {...PAINT.raised} />
      <circle cx={x + w * 0.84} cy={y + h * 0.06} r={Math.min(4.5, w * 0.032)} {...PAINT.recess} />
    </g>
  );
}

/** Crusher: feed hopper, housing with rotor behind an inspection door, motor and belt guard beside. */
function Crusher({ x, y, w, h }: Box) {
  const hw = w * 0.62;
  const hopH = h * 0.26;
  const by = y + hopH;
  const bh = h - hopH - 10;
  return (
    <g>
      <Plinth x={x} y={y + h - 10} w={w} h={10} />
      <Hopper x={x + hw * 0.1} y={y} w={hw * 0.8} h={hopH + 6} />
      <rect x={x} y={by} width={hw} height={bh} rx={8} {...PAINT.body} />
      <circle cx={x + hw / 2} cy={by + bh * 0.48} r={Math.min(hw, bh) * 0.3} {...PAINT.raised} />
      <circle cx={x + hw / 2} cy={by + bh * 0.48} r={Math.min(hw, bh) * 0.2} {...PAINT.recess} />
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2;
        const R = Math.min(hw, bh) * 0.2;
        return <line key={i} x1={x + hw / 2} y1={by + bh * 0.48} x2={x + hw / 2 + Math.cos(a) * R} y2={by + bh * 0.48 + Math.sin(a) * R} stroke={MX.metal} strokeWidth={1.6} />;
      })}
      <circle cx={x + hw / 2} cy={by + bh * 0.48} r={Math.min(hw, bh) * 0.05} {...PAINT.shaft} />
      <CornerBolts x={x} y={by} w={hw} h={bh} inset={7} r={1.3} />
      <rect x={x + hw - 4} y={by + bh * 0.3} width={w * 0.1} height={bh * 0.36} rx={4} {...PAINT.raised} />
      <ElectricMotor x={x + hw + w * 0.06} y={y + h - 10 - bh * 0.45} w={w - hw - w * 0.06} h={bh * 0.45} shaft="left" />
    </g>
  );
}

/** Press: two side columns, crown with cylinder, ram and die, bed on a foundation. */
function Press({ x, y, w, h }: Box) {
  const col = w * 0.16;
  const crown = h * 0.2;
  const bed = h * 0.18;
  return (
    <g>
      <Plinth x={x - 6} y={y + h - 12} w={w + 12} h={12} />
      <rect x={x} y={y + crown - 4} width={col} height={h - crown - 8} rx={4} {...PAINT.body} />
      <rect x={x + w - col} y={y + crown - 4} width={col} height={h - crown - 8} rx={4} {...PAINT.body} />
      <Housing x={x - 4} y={y} w={w + 8} h={crown} rx={6} />
      <rect x={x + w * 0.42} y={y + crown} width={w * 0.16} height={h * 0.2} rx={2} {...PAINT.shaft} />
      <rect x={x + col + 6} y={y + crown + h * 0.2} width={w - 2 * col - 12} height={h * 0.1} rx={3} {...PAINT.raised} />
      <rect x={x + col + 2} y={y + h - 12 - bed} width={w - 2 * col - 4} height={bed} rx={3} {...PAINT.body} />
      <rect x={x + col + 10} y={y + h - 12 - bed - 6} width={w - 2 * col - 20} height={8} rx={2} {...PAINT.recess} />
      <BoltLine x1={x + col + 8} y1={y + h - 12 - bed / 2} x2={x + w - col - 8} y2={y + h - 12 - bed / 2} count={4} r={1.3} />
    </g>
  );
}

/** Extruder: motor, gearbox, heated barrel with bands, feed hopper and die. */
function Extruder({ x, y, w, h, motor = "left" }: Box & { motor?: "left" | "right" }) {
  const base = 10;
  const by = y + h * 0.42;
  const bh = h * 0.22;
  const art = (
    <g>
      <Baseplate x={x} y={y + h - base} w={w} h={base} />
      <ElectricMotor x={x} y={y + h * 0.42} w={w * 0.18} h={h * 0.58 - base} shaft="right" />
      <Gearbox x={x + w * 0.2} y={y + h * 0.3} w={w * 0.16} h={h * 0.7 - base} input="left" />
      <rect x={x + w * 0.38} y={by} width={w * 0.54} height={bh} rx={bh * 0.3} {...PAINT.cylinder} />
      {Array.from({ length: 6 }).map((_, i) => (
        <rect key={i} x={x + w * 0.42 + i * w * 0.08} y={by - 3} width={w * 0.04} height={bh + 6} rx={2} {...PAINT.raised} />
      ))}
      <rect x={x + w * 0.92} y={by - bh * 0.15} width={w * 0.06} height={bh * 1.3} rx={3} {...PAINT.raised} />
      <Hopper x={x + w * 0.4} y={y} w={w * 0.12} h={by - y + 2} />
      {[0.5, 0.8].map((f) => (
        <rect key={f} x={x + w * f} y={by + bh} width={w * 0.04} height={y + h - base - by - bh} rx={1.5} {...PAINT.body} />
      ))}
    </g>
  );
  return motor === "left" ? art : <g transform={mirrorX({ x, y, w, h })}>{art}</g>;
}

/** Burner: flanged burner pipe with air / fuel stubs and the nozzle tip (flame when heat). */
function Burner({ x, y, w, h, heat }: Box & { heat?: boolean }) {
  const d = Math.min(h * 0.5, 26);
  const c = y + h / 2;
  return (
    <g>
      <rect x={x} y={c - d / 2} width={w * 0.86} height={d} rx={d * 0.3} {...PAINT.cylinder} />
      <path d={`M ${x + w * 0.86} ${c - d / 2} L ${x + w} ${c - d * 0.25} V ${c + d * 0.25} L ${x + w * 0.86} ${c + d / 2} Z`} {...PAINT.raised} />
      {[0.08, 0.4, 0.7].map((f) => (
        <Flange key={f} x={x + w * f} y={c} d={d} />
      ))}
      <rect x={x + w * 0.16} y={y} width={d * 0.5} height={c - d / 2 - y} {...PAINT.cylinderV} />
      <rect x={x + w * 0.5} y={y + h * 0.1} width={d * 0.4} height={c - d / 2 - y - h * 0.1} {...PAINT.cylinderV} />
      {heat && <ellipse cx={x + w + d * 1.2} cy={c} rx={d * 1.4} ry={d * 0.5} fill={MX.heat} opacity={0.85} />}
    </g>
  );
}

/** Vibrating screen: inclined deck box on springs with its vibrator motor. */
function Screen({ x, y, w, h }: Box) {
  const deckTop = y + h * 0.15;
  const deckBot = y + h * 0.55;
  return (
    <g>
      {[0.12, 0.82].map((f) => (
        <g key={f}>
          <rect x={x + w * f} y={y + h - h * 0.2} width={w * 0.08} height={h * 0.2} rx={2} {...PAINT.body} />
          {Array.from({ length: 4 }).map((_, i) => (
            <line key={i} x1={x + w * f} x2={x + w * (f + 0.08)} y1={y + h * 0.68 + i * h * 0.03} y2={y + h * 0.7 + i * h * 0.03} stroke={MX.metal} strokeWidth={1.2} />
          ))}
        </g>
      ))}
      <path d={`M ${x} ${deckTop} L ${x + w} ${deckBot - h * 0.15} L ${x + w} ${deckBot + h * 0.1} L ${x} ${deckBot - h * 0.05} Z`} {...PAINT.body} />
      <line x1={x + 6} y1={deckTop + h * 0.12} x2={x + w - 6} y2={deckBot - h * 0.02} stroke={MX.metal} strokeWidth={1.4} strokeDasharray="5 3" />
      <path d={`M ${x + w * 0.1} ${deckTop + h * 0.08} Q ${x + w * 0.4} ${deckTop + h * 0.02} ${x + w * 0.7} ${deckTop + h * 0.2} L ${x + w * 0.7} ${deckTop + h * 0.24} L ${x + w * 0.1} ${deckTop + h * 0.12} Z`} {...PAINT.material} />
      <ElectricMotor x={x + w * 0.38} y={y} w={w * 0.24} h={h * 0.2} />
    </g>
  );
}

/** Generic machine body (housing, door, louvres) with its motor when it has one. */
function GenericMachine({ x, y, w, h, motor, standing = true }: Box & { motor?: "left" | "right"; standing?: boolean }) {
  const mw = motor ? Math.min(w * 0.3, h * 0.9) : 0;
  const bx = motor === "left" ? x + mw + 6 : x;
  const bw = w - (motor ? mw + 6 : 0);
  // A part of an assembly (not on the floor) is a plain body; a free-standing machine gets its plinth, door and louvres.
  if (!standing && !motor) return <Block x={x} y={y} w={w} h={h} />;
  const ph = standing ? 10 : 0;
  return (
    <g>
      {standing && <Plinth x={bx - 4} y={y + h - 10} w={bw + 8} h={10} />}
      <Housing x={bx} y={y} w={bw} h={h - ph} panel={[bw * 0.12, (h - ph) * 0.14, bw * 0.4, (h - ph) * 0.28]} />
      {bw > 50 && h > 50 && <Louvres x={bx + bw * 0.58} y={y + (h - ph) * 0.56} w={bw * 0.3} h={(h - ph) * 0.26} />}
      {motor && <ElectricMotor x={motor === "left" ? x : x + w - mw} y={y + h - 10 - mw * 0.62} w={mw} h={mw * 0.62} shaft={motor === "left" ? "right" : "left"} />}
    </g>
  );
}

/** Rotary valve / airlock: square body with flanges, rotor vanes behind a window, geared motor on the side. */
function RotaryValve({ x, y, w, h }: Box) {
  const fl = Math.max(4, h * 0.1);
  const r = Math.min(w, h - 2 * fl) * 0.36;
  const c = { x: x + w * 0.42, y: y + h / 2 };
  return (
    <g>
      <rect x={x} y={y} width={w * 0.84} height={fl} rx={1.5} {...PAINT.raised} />
      <rect x={x} y={y + h - fl} width={w * 0.84} height={fl} rx={1.5} {...PAINT.raised} />
      <rect x={x + w * 0.06} y={y + fl} width={w * 0.72} height={h - 2 * fl} rx={4} {...PAINT.body} />
      <circle cx={c.x} cy={c.y} r={r} {...PAINT.recess} />
      {Array.from({ length: 6 }).map((_, i) => {
        const t = (i / 6) * Math.PI * 2;
        return <line key={i} x1={c.x} y1={c.y} x2={c.x + Math.cos(t) * r * 0.92} y2={c.y + Math.sin(t) * r * 0.92} stroke={MX.metal} strokeWidth={1.4} />;
      })}
      <circle cx={c.x} cy={c.y} r={r * 0.2} {...PAINT.shaft} />
      <rect x={x + w * 0.78} y={c.y - h * 0.14} width={w * 0.22} height={h * 0.28} rx={3} {...PAINT.raised} />
      <BoltLine x1={x + 3} y1={y + fl / 2} x2={x + w * 0.84 - 3} y2={y + fl / 2} count={4} r={1} />
    </g>
  );
}

/** Solid machine part (frame member, column, base, arm): graphite body, inner line, bolts. */
function Block({ x, y, w, h }: Box) {
  const rx = Math.min(6, w * 0.08, h * 0.08);
  const long = w > h * 3 || h > w * 3;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={rx} {...PAINT.body} />
      {w > 20 && h > 20 && <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} rx={Math.max(1, rx - 2)} {...PAINT.hair} />}
      {w > 24 && h > 24 && <CornerBolts x={x} y={y} w={w} h={h} inset={8} r={1.4} />}
      {long && (w > h ? <BoltLine x1={x + 16} y1={y + h / 2} x2={x + w - 16} y2={y + h / 2} count={Math.max(3, Math.round(w / 60))} r={1.2} /> : <BoltLine x1={x + w / 2} y1={y + 16} x2={x + w / 2} y2={y + h - 16} count={Math.max(3, Math.round(h / 60))} r={1.2} />)}
    </g>
  );
}

/** Round part seen from the side (spindle, roll, shaft housing): turned shell with end flanges and a seam. Upright unless `horizontal` (or far wider than tall). */
function RoundPart({ x, y, w, h, horizontal }: Box & { horizontal?: boolean }) {
  const vertical = !horizontal && w < h * 3;
  if (vertical) {
    const f = Math.min(8, h * 0.08);
    return (
      <g>
        <rect x={x + 2} y={y} width={w - 4} height={h} rx={3} {...PAINT.cylinderV} />
        <rect x={x} y={y} width={w} height={f} rx={1.5} {...PAINT.raised} />
        <rect x={x} y={y + h - f} width={w} height={f} rx={1.5} {...PAINT.raised} />
        {h > 50 && <line x1={x + 4} x2={x + w - 4} y1={y + h / 2} y2={y + h / 2} {...PAINT.hair} />}
        {w > 30 && <BoltLine x1={x + 5} y1={y + f / 2} x2={x + w - 5} y2={y + f / 2} count={Math.max(3, Math.round(w / 14))} r={1} />}
      </g>
    );
  }
  const f = Math.min(8, w * 0.08);
  return (
    <g>
      <rect x={x} y={y + 2} width={w} height={h - 4} rx={3} {...PAINT.cylinder} />
      <rect x={x} y={y} width={f} height={h} rx={1.5} {...PAINT.raised} />
      <rect x={x + w - f} y={y} width={f} height={h} rx={1.5} {...PAINT.raised} />
      {w > 50 && <line x1={x + w / 2} x2={x + w / 2} y1={y + 4} y2={y + h - 4} {...PAINT.hair} />}
    </g>
  );
}

/** Machine table / work bed: body with a top plate and T-slots. */
function WorkTable({ x, y, w, h }: Box) {
  const top = Math.min(10, h * 0.25);
  return (
    <g>
      <rect x={x} y={y + top - 1} width={w} height={h - top + 1} rx={4} {...PAINT.body} />
      <rect x={x - 3} y={y} width={w + 6} height={top} rx={2} {...PAINT.raised} />
      {Array.from({ length: Math.max(2, Math.round(w / 40)) }).map((_, i, a) => (
        <rect key={i} x={x + ((i + 0.5) * w) / a.length - 2.5} y={y + 1.5} width={5} height={top - 3} rx={1} {...PAINT.recess} />
      ))}
      {h - top > 22 && <rect x={x + 6} y={y + top + 5} width={w - 12} height={h - top - 11} rx={3} {...PAINT.hair} />}
      <BoltLine x1={x + 10} y1={y + h - 6} x2={x + w - 10} y2={y + h - 6} count={Math.max(2, Math.round(w / 50))} r={1.2} />
    </g>
  );
}

/** Clamp / vise / fixture: raised jaws on a base, with the clamping screw. */
function Fixture({ x, y, w, h }: Box) {
  const jaw = w * 0.16;
  return (
    <g>
      <rect x={x} y={y + h * 0.45} width={w} height={h * 0.55} rx={3} {...PAINT.raised} />
      <rect x={x} y={y} width={jaw} height={h} rx={2} {...PAINT.body} />
      <rect x={x + w - jaw} y={y} width={jaw} height={h} rx={2} {...PAINT.body} />
      <rect x={x + jaw + 3} y={y + h * 0.5} width={w - 2 * jaw - 6} height={h * 0.18} rx={1.5} {...PAINT.recess} />
      <rect x={x + w} y={y + h * 0.3} width={Math.min(14, w * 0.12)} height={h * 0.12} rx={1} {...PAINT.shaft} />
      <Bolt x={x + jaw / 2} y={y + h * 0.82} r={1.3} />
      <Bolt x={x + w - jaw / 2} y={y + h * 0.82} r={1.3} />
    </g>
  );
}

/** Workpiece / product: the process material in brass, with a fine edge. */
function Workpiece({ x, y, w, h }: Box) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={2} {...PAINT.material} />
      <rect x={x} y={y} width={w} height={h} rx={2} {...PAINT.outline} />
      <line x1={x + 3} x2={x + w - 3} y1={y + Math.min(5, h * 0.2)} y2={y + Math.min(5, h * 0.2)} {...PAINT.hair} />
    </g>
  );
}

/** Cutting tool / nozzle: shank and a toothed head at the working end (bottom, or right when `horizontal`). */
function Tool({ x, y, w, h, horizontal }: Box & { horizontal?: boolean }) {
  if (horizontal) {
    return (
      <g>
        <rect x={x} y={y + h * 0.3} width={w * 0.6} height={h * 0.4} rx={1.5} {...PAINT.shaft} />
        <rect x={x + w * 0.6} y={y} width={w * 0.4} height={h} rx={2} {...PAINT.raised} />
        {Array.from({ length: 5 }).map((_, i) => (
          <line key={i} x1={x + w * 0.6} x2={x + w} y1={y + ((i + 0.5) * h) / 5} y2={y + ((i + 0.5) * h) / 5} {...PAINT.hair} />
        ))}
      </g>
    );
  }
  // A flat cutter (wider than tall) is all head with a short stub; a long tool is mostly shank.
  const head = w > h ? h * 0.8 : Math.max(h * 0.35, Math.min(h, 10));
  return (
    <g>
      <rect x={x + w * 0.3} y={y} width={w * 0.4} height={h - head + 1} rx={1.5} {...PAINT.shaft} />
      <rect x={x} y={y + h - head} width={w} height={head} rx={2} {...PAINT.raised} />
      {Array.from({ length: Math.max(3, Math.round(w / 6)) }).map((_, i, a) => (
        <line key={i} x1={x + ((i + 0.5) * w) / a.length} x2={x + ((i + 0.5) * w) / a.length} y1={y + h - head + 1} y2={y + h - 1} {...PAINT.hair} />
      ))}
    </g>
  );
}

/** An item drawn from its own silhouette (traced in the image): graphite body, inner edges as fine detail, plinth when it stands on the floor. */
function TracedBody({ b, trace, standing, id }: { b: Box; trace: Trace; standing: boolean; id: string }) {
  const X = (u: number) => Math.round((b.x + u * b.w) * 10) / 10;
  const Y = (v: number) => Math.round((b.y + v * b.h) * 10) / 10;
  const P = ([u, v]: Pt) => `${X(u)} ${Y(v)}`;
  const ring = (pts: Pt[]) => `M ${pts.map(P).join(" L ")} Z`;
  const outline = [trace.outline, ...(trace.holes ?? [])].map(ring).join(" ");
  const clip = `trace-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const regions = trace.regions ?? [];
  const circles = trace.circles ?? [];
  // The machine's own make-up in house paints: graphite body, its lighter parts as raised plates, darker parts as recesses,
  // round parts as hubs, long seams as hairlines; generic panel detail only when the image gave none.
  return (
    <g>
      {standing && <Plinth x={b.x - 4} y={b.y + b.h - 6} w={b.w + 8} h={8} />}
      <clipPath id={clip}>
        <path d={outline} fillRule="evenodd" />
      </clipPath>
      <path d={outline} fillRule="evenodd" {...PAINT.body} />
      <g clipPath={`url(#${clip})`}>
        {regions.map((r, i) => (
          <path key={`r${i}`} d={ring(r.poly)} {...(r.tone === "recess" ? PAINT.recess : PAINT.raised)} />
        ))}
        {!regions.length && b.w > 60 && b.h > 60 && <Panel x={b.x + b.w * 0.14} y={b.y + b.h * 0.2} w={b.w * 0.34} h={b.h * 0.3} />}
        {trace.lines.filter((l) => l.length <= 3).slice(0, 12).map((l, i) => (
          <path key={`l${i}`} d={`M ${l.map(P).join(" L ")}`} {...PAINT.hair} />
        ))}
        {circles.map(([u, v, r], i) => (
          <g key={`c${i}`}>
            <circle cx={X(u)} cy={Y(v)} r={Math.round(r * b.w * 10) / 10} {...PAINT.raised} />
            <circle cx={X(u)} cy={Y(v)} r={Math.round(r * b.w * 4) / 10} {...PAINT.shaft} />
          </g>
        ))}
      </g>
      <path d={outline} fillRule="evenodd" fill="none" stroke={MX.edge} strokeWidth={MX.w} strokeLinejoin="round" />
    </g>
  );
}

/** Round face seen end-on (wheel, pulley, flywheel, roller, dial): rim, web, spokes, hub. */
function Wheel({ x, y, w, h }: Box) {
  const r = Math.min(w, h) / 2;
  const c = { x: x + w / 2, y: y + h / 2 };
  const spokes = r > 30 ? 6 : 4;
  return (
    <g>
      <circle cx={c.x} cy={c.y} r={r} {...PAINT.raised} />
      <circle cx={c.x} cy={c.y} r={r * 0.78} {...PAINT.body} />
      {Array.from({ length: spokes }).map((_, i) => {
        const t = (i / spokes) * Math.PI * 2;
        return <line key={i} x1={c.x + Math.cos(t) * r * 0.24} y1={c.y + Math.sin(t) * r * 0.24} x2={c.x + Math.cos(t) * r * 0.74} y2={c.y + Math.sin(t) * r * 0.74} stroke={MX.metal} strokeWidth={Math.max(1.2, r * 0.07)} strokeLinecap="round" />;
      })}
      <circle cx={c.x} cy={c.y} r={r * 0.22} {...PAINT.raised} />
      <circle cx={c.x} cy={c.y} r={r * 0.09} {...PAINT.shaft} />
    </g>
  );
}

/** Tapered part (cone, funnel, nozzle, duct transition): trapezoid narrow at one end, flanged wide end. */
function Cone({ x, y, w, h, narrow = "bottom" }: Box & { narrow?: "top" | "bottom" | "left" | "right" }) {
  const v = narrow === "top" || narrow === "bottom";
  const k = 0.32;
  const d =
    narrow === "bottom"
      ? `M ${x} ${y} H ${x + w} L ${x + w * (0.5 + k / 2)} ${y + h} H ${x + w * (0.5 - k / 2)} Z`
      : narrow === "top"
        ? `M ${x + w * (0.5 - k / 2)} ${y} H ${x + w * (0.5 + k / 2)} L ${x + w} ${y + h} H ${x} Z`
        : narrow === "right"
          ? `M ${x} ${y} L ${x + w} ${y + h * (0.5 - k / 2)} V ${y + h * (0.5 + k / 2)} L ${x} ${y + h} Z`
          : `M ${x + w} ${y} L ${x} ${y + h * (0.5 - k / 2)} V ${y + h * (0.5 + k / 2)} L ${x + w} ${y + h} Z`;
  const fl = Math.min(7, (v ? h : w) * 0.12);
  return (
    <g>
      <path d={d} {...(v ? PAINT.cylinderV : PAINT.cylinder)} />
      {narrow === "bottom" && <rect x={x - 3} y={y} width={w + 6} height={fl} rx={1.5} {...PAINT.raised} />}
      {narrow === "top" && <rect x={x - 3} y={y + h - fl} width={w + 6} height={fl} rx={1.5} {...PAINT.raised} />}
      {narrow === "right" && <rect x={x} y={y - 3} width={fl} height={h + 6} rx={1.5} {...PAINT.raised} />}
      {narrow === "left" && <rect x={x + w - fl} y={y - 3} width={fl} height={h + 6} rx={1.5} {...PAINT.raised} />}
    </g>
  );
}

/** A shape part painted in a given tone (raised cover, recessed opening / screen, product). */
function TonedBlock({ b, tone, standing }: { b: Box; tone: "raised" | "recess" | "material"; standing?: boolean }) {
  const rx = Math.min(5, b.w * 0.08, b.h * 0.08);
  // Loose material lying on the floor (stockpile, heap) is a mound, not a block.
  if (tone === "material" && standing && b.w > b.h * 1.2)
    return <path d={`M ${b.x} ${b.y + b.h} Q ${b.x + b.w * 0.25} ${b.y + b.h * 0.35} ${b.x + b.w / 2} ${b.y} Q ${b.x + b.w * 0.75} ${b.y + b.h * 0.35} ${b.x + b.w} ${b.y + b.h} Z`} {...PAINT.material} stroke={MX.edge} strokeWidth={1} />;
  if (tone === "material") return <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={rx} {...PAINT.material} stroke={MX.edge} strokeWidth={1} />;
  return <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={rx} {...(tone === "recess" ? PAINT.recess : PAINT.raised)} />;
}

/** What a chamber holds: crucible with induction coil, investment flask, bed or parts. */
function ChamberContents({ b, contents, heat }: { b: Box; contents: string; heat?: boolean }) {
  const t = clamp(Math.min(b.w, b.h) * 0.08, 6, 18);
  const inner = { x: b.x + t, y: b.y + t, w: b.w - 2 * t, h: b.h - 2 * t };
  const ccx = inner.x + inner.w / 2;
  if (contents === "crucible-coil" || contents === "crucible") {
    const cw = inner.w * 0.42;
    const ch = inner.h * 0.38;
    const top = inner.y + inner.h * 0.38;
    const turns = Math.max(5, Math.round(ch / 9));
    return (
      <g>
        {heat && <ellipse cx={ccx} cy={top + ch * 0.5} rx={cw * 0.95} ry={ch * 0.75} fill={MX.heat} opacity={0.55} />}
        <path d={`M ${ccx - cw / 2} ${top} H ${ccx + cw / 2} V ${top + ch * 0.86} Q ${ccx + cw / 2} ${top + ch} ${ccx} ${top + ch} Q ${ccx - cw / 2} ${top + ch} ${ccx - cw / 2} ${top + ch * 0.86} Z`} {...PAINT.cylinderV} />
        <path d={`M ${ccx - cw / 2 + 4} ${top + ch * 0.22} H ${ccx + cw / 2 - 4} V ${top + ch * 0.82} Q ${ccx} ${top + ch - 4} ${ccx - cw / 2 + 4} ${top + ch * 0.82} Z`} {...PAINT.material} />
        <rect x={ccx - cw / 2 - 3} y={top - 4} width={cw + 6} height={6} rx={2} {...PAINT.raised} />
        <rect x={ccx - 3} y={top + ch} width={6} height={inner.y + inner.h - top - ch} {...PAINT.shaft} />
        {contents === "crucible-coil" &&
          Array.from({ length: turns }).map((_, i) => (
            <g key={i}>
              <rect x={ccx - cw / 2 - 14} y={top + 2 + (i * (ch - 4)) / turns} width={9} height={(ch - 4) / turns - 2.5} rx={2.5} {...PAINT.material} />
              <rect x={ccx + cw / 2 + 5} y={top + 2 + (i * (ch - 4)) / turns} width={9} height={(ch - 4) / turns - 2.5} rx={2.5} {...PAINT.material} />
            </g>
          ))}
      </g>
    );
  }
  if (contents === "flask") {
    const fw = inner.w * 0.46;
    const fh = inner.h * 0.5;
    const fy = inner.y + inner.h * 0.18;
    return (
      <g>
        <rect x={ccx - fw / 2} y={fy} width={fw} height={fh} rx={8} {...PAINT.raised} />
        <rect x={ccx - fw / 2 + 4} y={fy + 4} width={fw - 8} height={fh - 8} rx={6} {...PAINT.recess} />
        <line x1={ccx} x2={ccx} y1={fy + 6} y2={fy + fh - 8} stroke={MX.material} strokeWidth={3} />
        {Array.from({ length: 4 }).map((_, i) => (
          <g key={i}>
            <line x1={ccx} x2={ccx - fw * 0.22} y1={fy + fh * (0.25 + i * 0.17)} y2={fy + fh * (0.2 + i * 0.17)} stroke={MX.material} strokeWidth={2.5} strokeLinecap="round" />
            <line x1={ccx} x2={ccx + fw * 0.22} y1={fy + fh * (0.25 + i * 0.17)} y2={fy + fh * (0.2 + i * 0.17)} stroke={MX.material} strokeWidth={2.5} strokeLinecap="round" />
          </g>
        ))}
        <rect x={ccx - fw * 0.65} y={fy + fh + 4} width={fw * 1.3} height={inner.h * 0.06} rx={3} {...PAINT.raised} />
        <rect x={ccx - 6} y={fy + fh + 4 + inner.h * 0.06} width={12} height={inner.y + inner.h - (fy + fh + 4 + inner.h * 0.06)} {...PAINT.shaft} />
      </g>
    );
  }
  if (contents === "bed") {
    return <path d={`M ${inner.x + 3} ${inner.y + inner.h * 0.7} Q ${ccx} ${inner.y + inner.h * 0.6} ${inner.x + inner.w - 3} ${inner.y + inner.h * 0.72} V ${inner.y + inner.h - 3} H ${inner.x + 3} Z`} {...PAINT.material} />;
  }
  if (contents === "parts") {
    return (
      <g>
        {[0.35, 0.65, 0.92].map((f) => (
          <g key={f}>
            <rect x={inner.x + 6} y={inner.y + inner.h * f} width={inner.w - 12} height={4} rx={1} {...PAINT.raised} />
            {[0.2, 0.45, 0.7].map((g2) => (
              <rect key={g2} x={inner.x + inner.w * g2} y={inner.y + inner.h * f - inner.h * 0.1} width={inner.w * 0.14} height={inner.h * 0.1} rx={2} {...PAINT.material} />
            ))}
          </g>
        ))}
      </g>
    );
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Item → part                                                          */
/* ------------------------------------------------------------------ */

function ItemArt({ it, carried }: { it: LaidItem; carried: LaidItem[] }) {
  const angle = Number(it.options.angle ?? 0);
  // Shape parts may be turned (an arm, an inclined chute): draw upright, then rotate about the box centre.
  if (angle && ["block", "cylinder", "cone", "tool", "fixture", "workpiece"].includes(it.type)) {
    const c = { x: it.box.x + it.box.w / 2, y: it.box.y + it.box.h / 2 };
    return (
      <g transform={`rotate(${Math.round(angle * 10) / 10} ${Math.round(c.x * 10) / 10} ${Math.round(c.y * 10) / 10})`}>
        <ItemArt it={{ ...it, options: { ...it.options, angle: 0 } }} carried={carried} />
      </g>
    );
  }
  const b = it.box;
  if (it.trace && it.trace.outline.length >= 4) return <TracedBody b={b} trace={it.trace} standing={it.floor !== undefined} id={it.id} />;
  const tone = it.options.tone;
  if (tone && tone !== "body" && ["block", "cylinder", "table", "fixture"].includes(it.type)) return <TonedBlock b={b} tone={tone} standing={it.floor !== undefined} />;
  const o = it.options;
  const { x, y, w, h } = b;
  switch (it.type) {
    case "cabinet":
      return <Cabinet x={x} y={y} w={w} h={h} doors={o.doors ?? (w > h * 0.9 ? 2 : 1)} screen={o.screen ?? true} lamps={o.lamps ?? 2} />;
    case "generator":
      return <Generator {...b} />;
    case "motor":
      return <ElectricMotor {...b} shaft={o.motor === "left" ? "left" : "right"} />;
    case "gearbox":
      return <Gearbox {...b} input={o.motor === "right" ? "right" : "left"} />;
    case "drive":
      return <DriveTrain {...b} motor={o.motor === "right" ? "right" : "left"} />;
    case "pump":
      return <PumpSet {...b} motor={o.motor === "left" ? "left" : "right"} />;
    case "vacuum-pump":
      return <VacuumPump {...b} motor={o.motor === "left" ? "left" : "right"} />;
    case "fan":
      return <FanSet {...b} outlet={o.outlet === "right" ? "right" : "left"} />;
    case "compressor":
      return <Compressor {...b} />;
    case "tank":
      return <Tank {...b} top={o.top ?? "dome"} bottom={o.bottom ?? "flat"} level={o.level} legs={o.bottom === "cone" ? h * 0.22 : 0} rail={h > 260} />;
    case "silo":
      return <Tank {...b} top={o.top ?? "cone"} bottom={o.bottom ?? "cone"} level={o.level} legs={h * 0.2} rail />;
    case "hopper":
      return <Hopper {...b} />;
    case "horizontal-tank":
      return <HorizontalVessel {...b} level={o.level} />;
    case "cyclone":
      return <Cyclone {...b} inlet={o.inlet === "right" ? "right" : "left"} />;
    case "stack":
      return <Stack {...b} />;
    case "gas-cylinder":
      return <GasCylinder {...b} />;
    case "chamber": {
      const standing = it.floor !== undefined;
      const base = standing ? Math.min(14, h * 0.07) : 0;
      const cb = { x, y, w, h: h - base };
      return (
        <g>
          {standing && <Plinth x={x - 8} y={y + h - base} w={w + 16} h={base} />}
          <Chamber {...cb} heat={false} viewport />
          <ChamberContents b={cb} contents={o.contents ?? (o.heat ? "bed" : "none")} heat={o.heat} />
          {/* side flanges where lines can enter */}
          {[0.25, 0.7].map((f) => (
            <g key={f}>
              <rect x={x - 5} y={cb.y + cb.h * f - 6} width={5} height={12} rx={1.5} {...PAINT.raised} />
              <rect x={x + w} y={cb.y + cb.h * f - 6} width={5} height={12} rx={1.5} {...PAINT.raised} />
            </g>
          ))}
          {carried.length === 0 && <rect x={x + w * 0.4} y={y - 12} width={w * 0.2} height={9} rx={2} {...PAINT.raised} />}
        </g>
      );
    }
    case "drum":
      return <Drum {...b} gear={0.32} heat={o.heat ? [0.6, 0.96] : undefined} />;
    case "conveyor": {
      const kind = o.kind === "screw" || o.kind === "chain" || o.kind === "slide" ? o.kind : "belt";
      const sloped = o.slope === "up" || o.slope === "down";
      const d = sloped ? 16 : clamp(Math.min(h, w * 0.05), 10, 26);
      // A flat conveyor boxed with its support frame: belt along the top, legs down to the box bottom.
      const framed = !sloped && h > d * 2.2;
      const [y1, y2] = o.slope === "up" ? [y + h - d / 2, y + d / 2] : o.slope === "down" ? [y + d / 2, y + h - d / 2] : framed ? [y + d / 2, y + d / 2] : [y + h / 2, y + h / 2];
      return <Conveyor x1={x} y1={y1} x2={x + w} y2={y2} h={d} kind={kind} ground={it.legs ?? (framed ? y + h : undefined)} />;
    }
    case "bucket-elevator":
      return <BucketElevator {...b} drive={o.motor === "left" ? "left" : "right"} />;
    case "filter":
      return <Baghouse {...b} hoppers={clamp(Math.round((w / h) * 3), 1, 4)} />;
    case "heat-exchanger":
      return <HeatExchanger {...b} kind={o.kind === "plate" ? "plate" : "shell"} />;
    case "cooling-unit":
      return <CoolingUnit {...b} motor={o.motor === "left" ? "left" : "right"} />;
    case "actuator":
      return <Actuator {...b} horizontal={o.horizontal} />;
    case "valve":
      return <Valve x={x + w / 2} y={y + h / 2} size={clamp(Math.max(w, h), 12, 30)} kind={o.valve === "regulator" ? "control" : (o.valve ?? "solenoid")} />;
    case "hydraulic-unit":
      return <HydraulicUnit {...b} />;
    case "crusher":
      return <Crusher {...b} />;
    case "mixer":
      return w > h * 1.3 ? (
        <g>
          <HorizontalVessel x={x + w * 0.24} y={y + h * 0.3} w={w * 0.76} h={h * 0.7} />
          <DriveTrain x={x} y={y + h * 0.48} w={w * 0.24} h={h * 0.52} />
        </g>
      ) : (
        <Tank {...b} agitator bottom="dish" legs={h * 0.15} />
      );
    case "press":
      return <Press {...b} />;
    case "extruder":
      return <Extruder {...b} motor={o.motor === "right" ? "right" : "left"} />;
    case "burner":
      return <Burner {...b} heat={o.heat} />;
    case "screen":
      return <Screen {...b} />;
    case "frame": {
      if (h < w * 0.22) {
        // A low frame is a steel skid: channel rails with cross members and anchor bolts.
        const rail = Math.min(10, h * 0.45);
        return (
          <g>
            <rect x={x} y={y + h - rail} width={w} height={rail} rx={1.5} {...PAINT.raised} />
            <rect x={x} y={y} width={w} height={rail} rx={1.5} {...PAINT.raised} />
            {Array.from({ length: Math.max(2, Math.round(w / 70) + 1) }).map((_, i, a) => (
              <rect key={i} x={x + ((w - 8) * i) / (a.length - 1)} y={y + rail - 1} width={8} height={h - 2 * rail + 2} {...PAINT.body} />
            ))}
            <BoltLine x1={x + 8} y1={y + h - rail / 2} x2={x + w - 8} y2={y + h - rail / 2} count={Math.max(3, Math.round(w / 50))} r={1.2} />
          </g>
        );
      }
      const levels = [...new Set(carried.map((c) => clamp((c.box.y + c.box.h + (c.neck?.h ?? 0) - y) / h, 0, 0.92)))].sort((a, b2) => a - b2);
      return <Frame {...b} levels={levels.length ? levels.map((l) => Math.round(l * 1000) / 1000) : [0, 0.5]} bays={clamp(Math.round(w / 110), 1, 6)} />;
    }
    case "rotary-valve":
      return <RotaryValve {...b} />;
    case "block":
      return <Block {...b} />;
    case "cylinder":
      return <RoundPart {...b} horizontal={o.horizontal} />;
    case "table":
      return <WorkTable {...b} />;
    case "fixture":
      return <Fixture {...b} />;
    case "workpiece":
      return <Workpiece {...b} />;
    case "tool":
      return <Tool {...b} horizontal={o.horizontal} />;
    case "wheel":
      return <Wheel {...b} />;
    case "cone":
      return <Cone {...b} narrow={o.narrow} />;
    case "pile":
      return <path d={`M ${x} ${y + h} Q ${x + w * 0.25} ${y + h * 0.35} ${x + w / 2} ${y} Q ${x + w * 0.75} ${y + h * 0.35} ${x + w} ${y + h} Z`} {...PAINT.material} stroke={MX.edge} strokeWidth={1} />;
    default:
      return <GenericMachine {...b} motor={o.motor} standing={it.floor !== undefined} />;
  }
}

/** Neck spool between a stacked item and the one under it. */
function Neck({ b }: { b: Box }) {
  return (
    <g>
      <rect x={b.x} y={b.y} width={b.w} height={b.h} {...PAINT.cylinderV} />
      <rect x={b.x - b.w * 0.25} y={b.y} width={b.w * 1.5} height={Math.min(7, b.h * 0.25)} rx={1.5} {...PAINT.raised} />
      <rect x={b.x - b.w * 0.25} y={b.y + b.h - Math.min(7, b.h * 0.25)} width={b.w * 1.5} height={Math.min(7, b.h * 0.25)} rx={1.5} {...PAINT.raised} />
      {b.h > 40 && <rect x={b.x + b.w * 0.2} y={b.y + b.h * 0.3} width={b.w * 0.6} height={b.h * 0.4} rx={2} {...PAINT.recess} />}
      <BoltLine x1={b.x - b.w * 0.15} y1={b.y + 3} x2={b.x + b.w * 1.15} y2={b.y + 3} count={4} r={1} />
    </g>
  );
}

/** Legs (two columns with a cross brace) from an item down to its floor. */
function Legs({ b, to }: { b: Box; to: number }) {
  const y0 = b.y + b.h;
  const x1 = b.x + b.w * 0.12;
  const x2 = b.x + b.w * 0.88;
  return (
    <g>
      {to - y0 > 30 && <path d={`M ${x1} ${y0 + 6} L ${x2} ${to - 6} M ${x2} ${y0 + 6} L ${x1} ${to - 6}`} stroke={MX.fine} strokeWidth={1.4} fill="none" />}
      <Column x={x1} y1={y0 - 2} y2={to} w={clamp(b.w * 0.05, 5, 10)} />
      <Column x={x2} y1={y0 - 2} y2={to} w={clamp(b.w * 0.05, 5, 10)} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Lines                                                                */
/* ------------------------------------------------------------------ */

/**
 * How each medium is drawn, as on the hand-drawn pyro sheets: a thin hollow
 * tube (graphite rim, dark bore) carrying a coloured flow line — dashed salmon
 * for hot gas, blue for air and water, grey for gases — with filled arrowheads
 * along the run; material is a bare brass line, signals a dashed hairline.
 */
const LOOK: Record<Medium, { tube: number; core: string; coreW: number; dash?: string; heads: boolean }> = {
  material: { tube: 0, core: MEDIUM.material, coreW: 2.2, heads: true },
  "hot-gas": { tube: 15, core: MX.gas, coreW: 1.7, dash: "6 4", heads: true },
  gas: { tube: 7, core: MX.label, coreW: 1.1, heads: true },
  air: { tube: 9, core: MX.air, coreW: 1.4, heads: true },
  water: { tube: 7, core: MX.air, coreW: 1.3, heads: true },
  steam: { tube: 7, core: MX.label, coreW: 1.1, dash: "4 3", heads: true },
  oil: { tube: 5, core: MEDIUM.material, coreW: 2.6, heads: false },
  vacuum: { tube: 9, core: MX.label, coreW: 1, dash: "2 3", heads: true },
  power: { tube: 0, core: MX.metal, coreW: 1.8, heads: false },
  signal: { tube: 0, core: MX.label, coreW: 0.9, dash: "3 2.5", heads: false },
};

const polyPath = (pts: Pt[]) => pts.map(([x, y], i) => `${i ? "L" : "M"} ${Math.round(x * 100) / 100} ${Math.round(y * 100) / 100}`).join(" ");

/** Filled flow arrowhead at (x, y) pointing along (ux, uy). */
function Head({ x, y, ux, uy, fill, s = 5.5 }: { x: number; y: number; ux: number; uy: number; fill: string; s?: number }) {
  const a = (Math.atan2(uy, ux) * 180) / Math.PI;
  return <path d={`M ${s} 0 L ${-s * 0.7} ${-s * 0.75} L ${-s * 0.7} ${s * 0.75} Z`} fill={fill} transform={`translate(${Math.round(x * 100) / 100} ${Math.round(y * 100) / 100}) rotate(${Math.round(a)})`} />;
}

/** One connection: tube, flow line and arrowheads (valves are drawn over the equipment layer). */
function LinkLine({ l }: { l: LaidLink }) {
  if (l.pts.length < 2) return null;
  const look = LOOK[l.medium];
  const tube = l.duct ? Math.max(look.tube, 16) : look.tube;
  const d = polyPath(l.pts);
  const heads: React.ReactNode[] = [];
  if (look.heads) {
    const s = l.medium === "hot-gas" || l.duct ? 6.5 : 5.5;
    for (let i = 0; i < l.pts.length - 1; i++) {
      const [a, b] = [l.pts[i], l.pts[i + 1]];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L < 1) continue;
      const [ux, uy] = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
      const last = i === l.pts.length - 2;
      // One head mid-run on every run long enough to read, one just before the line enters its target.
      if (L >= 70) {
        const n = Math.max(1, Math.floor(L / 260));
        for (let k = 1; k <= n; k++) heads.push(<Head key={`${i}-${k}`} x={a[0] + ux * (L * k) / (n + 1)} y={a[1] + uy * (L * k) / (n + 1)} ux={ux} uy={uy} fill={look.core} s={s} />);
      }
      if (last && L >= 26) heads.push(<Head key={`${i}-end`} x={b[0] - ux * (s + 4)} y={b[1] - uy * (s + 4)} ux={ux} uy={uy} fill={look.core} s={s} />);
    }
  }
  const ends: React.ReactNode[] = [];
  if (tube >= 7) {
    for (const [p, q] of [[l.pts[0], l.pts[1]], [l.pts[l.pts.length - 1], l.pts[l.pts.length - 2]]] as Array<[Pt, Pt]>) {
      const horiz = Math.abs(q[0] - p[0]) >= Math.abs(q[1] - p[1]);
      const len = tube + 6;
      ends.push(horiz ? <rect key={`f${p[0]}-${p[1]}`} x={p[0] - 2.5} y={p[1] - len / 2} width={5} height={len} rx={1.2} {...PAINT.raised} /> : <rect key={`f${p[0]}-${p[1]}`} x={p[0] - len / 2} y={p[1] - 2.5} width={len} height={5} rx={1.2} {...PAINT.raised} />);
    }
  }
  return (
    <g aria-hidden="true" fill="none" strokeLinejoin="round">
      {tube > 0 && <path d={d} stroke={MX.edge} strokeWidth={tube} />}
      {tube > 0 && <path d={d} stroke={MX.deep} strokeWidth={Math.max(1, tube - 2.6)} />}
      {l.medium === "hot-gas" || l.duct ? <path d={d} stroke={MX.flatBody} strokeWidth={Math.max(1, tube - 2.6)} /> : null}
      <path d={d} stroke={look.core} strokeWidth={look.coreW} strokeDasharray={look.dash} strokeLinecap={look.dash ? "butt" : "round"} />
      {ends}
      {heads}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Sheet                                                                */
/* ------------------------------------------------------------------ */

/** The 2D sheet of a laid-out spec (what the app and the DB export use). */
export function layoutSheet(L: Layout): LineSheetArt {
  const depth = (it: LaidItem): number => (it.on ? 1 + depth(L.items.find((o) => o.id === it.on) ?? { ...it, on: undefined }) : 0);
  const order = [...L.items].filter((it) => it.type !== "frame").sort((a, b) => depth(a) - depth(b) || b.box.w * b.box.h - a.box.w * a.box.h);
  const frames = L.items.filter((it) => it.type === "frame");
  const carried = (id: string) => L.items.filter((o) => o.on === id);

  function Art() {
    return (
      <g>
        {L.floors.map((f) => (
          <GroundLine key={f.y} x1={f.x1} x2={f.x2} y={f.y} />
        ))}
        {frames.map((it) => (
          <ItemArt key={it.id} it={it} carried={carried(it.id)} />
        ))}
        {L.items.filter((it) => it.legs !== undefined && it.type !== "conveyor").map((it) => (
          <Legs key={`legs-${it.id}`} b={it.box} to={it.legs!} />
        ))}
        {L.links.map((l) => (
          <LinkLine key={`line-${l.id}`} l={l} />
        ))}
        {order.map((it) => (
          <g key={it.id}>
            {it.neck && <Neck b={it.neck} />}
            <ItemArt it={it} carried={carried(it.id)} />
          </g>
        ))}
        {L.links.flatMap((l) => l.valves.map((v, i) => <Valve key={`${l.id}-v${i}`} x={v.at[0]} y={v.at[1]} size={l.medium === "hot-gas" || l.duct ? 22 : 13} kind={v.kind === "regulator" ? "control" : v.kind} vertical={v.vertical} />))}
        {L.labels.map((lb) => (
          <MachineLabel key={`${lb.text}-${lb.x}-${lb.y}`} x={lb.x} y={lb.y} anchor={lb.anchor} size={lb.inside ? 10 : LABEL_SIZE} tone={lb.inside ? "ink" : "muted"}>
            {lb.text}
          </MachineLabel>
        ))}
      </g>
    );
  }

  return {
    id: L.id,
    ready: true,
    width: L.width,
    height: L.height,
    Art,
    pads: Object.fromEntries(L.points.map((p) => [p.tag, p.pad])),
    callouts: Object.fromEntries(L.points.map((p) => [p.tag, p.callout])),
  };
}
