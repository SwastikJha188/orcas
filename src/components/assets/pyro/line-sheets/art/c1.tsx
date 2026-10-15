/**
 * Sheet C-1 — CLR-01 · Clinker cooler — Grate and compartments.
 * Hot clinker leaves the kiln nose inside the hood, lands on the inclined
 * static inlet grate and travels right on the reciprocating grate. Under the
 * grate six air compartments (static-pressure tap, inspection door,
 * riddlings hopper) are each fed by their own cooling fan through a round
 * duct with louvre damper and bellows.
 */
import React from "react";
import { Bolt, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { FlowArrow } from "../../drawings/clk-parts";
import type { LineSheetArt } from "../types";
import { Bellows, CentrifugalFan, CoolerCasing, LouvreDamper, Lumps, VDuct } from "./parts-c";

const W = 824;
const H = 704;

const CASE = { x: 53, y: 150.5, w: 743, h: 199.5 };
const GRATE = 338;
const COMP = { x: 59, y: 360.5, w: 119, h: 127.5, pitch: 123 };
const DUCT_W = 25;
const FAN = { r: 25, top: 595, cy: 625, base: 650 };
const GROUND = 660;

const cx0 = (i: number) => COMP.x + i * COMP.pitch;

function Art() {
  return (
    <g>
      <GroundLine x1={22} x2={802} y={GROUND} />

      {/* ---------------- cooler casing, bed and grate ---------------- */}
      <CoolerCasing x={CASE.x} y={CASE.y} w={CASE.w} h={CASE.h} grate={GRATE} bedL={284} bedR={312} hot={300} doors={[214, 640, 742]} />
      {/* static inclined inlet grate under the kiln outlet */}
      <path d={`M 63 312 L 63 ${GRATE + 7} L 142 ${GRATE + 7} Z`} {...PAINT.recess} />
      {Array.from({ length: 8 }).map((_, i) => {
        const x = 64 + i * 10;
        const y = 312 + (i * 10 * 26) / 79;
        return <rect key={i} x={x} y={y} width={9} height={5} rx={1} transform={`rotate(18 ${x} ${y})`} {...PAINT.raised} />;
      })}
      {/* hot recuperated air back to the kiln */}
      <FlowArrow x1={330} y1={252} x2={240} y2={230} />
      <FlowArrow x1={250} y1={266} x2={160} y2={240} />
      <FlowArrow x1={168} y1={226} x2={118} y2={180} />
      <MachineLabel x={264} y={184} anchor="start" size={9}>CLINKER BED — TRAVELS TOWARD THE DISCHARGE →</MachineLabel>

      {/* ---------------- kiln hood with the kiln nose and burner lance ---------------- */}
      <rect x={30.5} y={45.5} width={120.5} height={113} rx={10} {...PAINT.body} />
      <rect x={36.5} y={51.5} width={108.5} height={101} rx={6} fill="none" stroke={MX.fine} strokeWidth={1} />
      <rect x={48} y={56} width={88} height={112} rx={4} {...PAINT.recess} />
      <rect x={62} y={148} width={74} height={22} {...PAINT.recess} stroke="none" />
      {/* refractory lining on the hood roof */}
      <rect x={49} y={57} width={86} height={7} fill={MX.flatRaised} opacity={0.55} />
      {Array.from({ length: 6 }).map((_, i) => (
        <line key={i} x1={56 + i * 14} x2={56 + i * 14} y1={57} y2={64} {...PAINT.hair} />
      ))}
      {/* kiln shell nose through the hood wall, outlet seal */}
      <rect x={2} y={64} width={44} height={76} rx={2} {...PAINT.cylinder} />
      <rect x={26} y={57} width={10} height={90} rx={2} {...PAINT.raised} />
      {[64, 78, 92, 106, 120, 134].map((y) => (
        <line key={y} x1={27.5} x2={34.5} y1={y} y2={y} {...PAINT.hair} />
      ))}
      <ellipse cx={66} cy={108} rx={20} ry={30} fill={MX.heat} />
      <rect x={44} y={70} width={5} height={64} rx={1.5} fill={MX.material} opacity={0.75} />
      <Lumps pts={[[56, 128], [64, 140], [58, 152], [70, 160], [62, 168], [76, 150], [82, 166]]} r={2.4} />
      {/* main burner lance through the hood front wall */}
      <rect x={52} y={89} width={146} height={7} rx={2} {...PAINT.shaft} />
      <rect x={145} y={84} width={9} height={17} rx={1.5} {...PAINT.raised} />
      <rect x={186} y={80} width={20} height={25} rx={4} {...PAINT.raised} />
      <Bolt x={196} y={86} r={1.5} />
      <Bolt x={196} y={99} r={1.5} />
      <rect x={192} y={105} width={8} height={45.5} rx={1.5} {...PAINT.body} />
      <MachineLabel x={60.5} y={38.1} anchor="start" size={8.2}>KILN HOOD</MachineLabel>

      {/* ---------------- under-grate compartments, ducts, fans ---------------- */}
      {Array.from({ length: 6 }).map((_, i) => {
        const x = cx0(i);
        const mid = x + COMP.w / 2;
        const dX = x + 22;
        const pad: [number, number] = [x + 97.5, 420.5];
        const fcx = dX + DUCT_W;
        return (
          <g key={i}>
            {/* compartment */}
            <rect x={x} y={COMP.y} width={COMP.w} height={COMP.h} rx={7} {...PAINT.body} />
            <rect x={x + 5} y={COMP.y + 5} width={COMP.w - 10} height={COMP.h - 10} rx={4} fill="none" stroke={MX.fine} strokeWidth={1} />
            <rect x={x - 1} y={COMP.y - 3} width={COMP.w + 2} height={5} rx={1.5} {...PAINT.raised} />
            {[x + 10, x + COMP.w - 10].map((bx) => (
              <Bolt key={bx} x={bx} y={COMP.y + 11} r={1.7} />
            ))}
            {/* air up through the grate */}
            {[0, 1, 2].map((k) => (
              <FlowArrow key={k} x1={x + 22 + k * 22} y1={410} x2={x + 22 + k * 22} y2={376} />
            ))}
            {/* inspection door */}
            <rect x={x + 9} y={424} width={30} height={26} rx={3} {...PAINT.raised} />
            <rect x={x + 13} y={428} width={22} height={18} rx={2} {...PAINT.recess} />
            <rect x={x + 39} y={433} width={4} height={8} rx={1} {...PAINT.shaft} />
            {/* static-pressure tap: nozzle through the wall and transmitter */}
            <rect x={pad[0]} y={pad[1] - 2} width={x + COMP.w - pad[0]} height={4} {...PAINT.shaft} />
            <rect x={pad[0] - 8} y={pad[1] - 7} width={16} height={14} rx={3.5} {...PAINT.raised} />
            <MachineLabel x={mid} y={471.5} size={7.5}>{`COMPARTMENT ${i + 1}`}</MachineLabel>

            {/* riddlings hopper with flap valve */}
            <path d={`M ${x + 82} ${COMP.y + COMP.h} H ${x + 112} L ${x + 102} 503 H ${x + 92} Z`} {...PAINT.body} />
            <rect x={x + 88} y={503} width={18} height={14} rx={3} {...PAINT.raised} />
            <line x1={x + 88} x2={x + 106} y1={510} y2={510} {...PAINT.hair} />
            <circle cx={x + 109} cy={507} r={2.4} {...PAINT.shaft} />

            {/* supply duct and cooling fan */}
            <VDuct x={dX} w={DUCT_W} y1={COMP.y + COMP.h} y2={FAN.top} />
            <LouvreDamper x={dX} w={DUCT_W} y={548} h={30} side={-1} />
            <Bellows x={dX} w={DUCT_W} y={506} h={14} />
            <CentrifugalFan cx={fcx} cy={FAN.cy} r={FAN.r} top={FAN.top} outlet="left" base={FAN.base} bx={fcx + 29} bw={7} bh={22} mx={fcx + 36} mw={30} mh={22} />
            <rect x={fcx - FAN.r - 8} y={FAN.base + 5} width={FAN.r + 36 + 30 * 1.14 + 16} height={GROUND - FAN.base - 5} rx={1} {...PAINT.body} />
            <MachineLabel x={mid - 1} y={678} size={7.5}>{`FAN ${i + 1}`}</MachineLabel>
          </g>
        );
      })}
      <MachineLabel x={155.5} y={539} size={8.2}>HOT ZONE</MachineLabel>
      <MachineLabel x={155.5} y={551} size={8.2}>FANS 1–3 (C-2)</MachineLabel>
      <MachineLabel x={524.5} y={545} size={8.2}>FANS 4–6 (C-3)</MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 29. */
const pads: LineSheetArt["pads"] = {
  "PRS-CLR-01": [156.5, 420.5],
  "PRS-CLR-02": [279.5, 420.5],
  "PRS-CLR-03": [402.5, 420.5],
  "PRS-CLR-04": [525.5, 420.5],
  "PRS-CLR-05": [648.5, 420.5],
  "PRS-CLR-06": [771.5, 420.5],
};

/** Tag chip centre per point, as on PDF page 29, lifted 40 / 44.5 into the gas space so the clinker bed stays visible. */
const chips: NonNullable<LineSheetArt["chips"]> = {
  "PRS-CLR-01": [100.5, 268],
  "PRS-CLR-02": [223.5, 286],
  "PRS-CLR-03": [346.5, 268],
  "PRS-CLR-04": [469.5, 286],
  "PRS-CLR-05": [592.5, 268],
  "PRS-CLR-06": [715.5, 286],
};

export const sheet: LineSheetArt = { id: "C-1", ready: true, width: W, height: H, Art, pads, chips };
