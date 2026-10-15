/**
 * Sheet H-3 — CSL-01 · Clinker transport — Clinker silo and baghouse.
 * Composed as PDF page 37: the steel clinker silo on legs (cut-away with the
 * clinker heap, roof rail, caged ladder, cone with slide gate), the inlet
 * chute from the pan conveyor, the roof baghouse (clean / dirty plenums,
 * pulse-jet header, bag cells) with its DP transmitter, the level radar, and
 * the dust fan set on its stand, ducted from the clean plenum.
 */
import React from "react";
import { Bolt, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { FanSet } from "../../drawings/clk-parts";
import { Brace, Ladder, Pipe } from "../../drawings/fkp-parts";
import { Radar } from "../../sheets/sa-parts";
import { Lumps } from "../../sheets/sc-parts";
import type { LineSheetArt } from "../types";
import { Column, Pier } from "./parts-h";

const W = 824;
const H = 704;

const GROUND = 660.5;
const S = { x: 188, r: 533.5, roof: 248.5, peak: 218.5, cyl: 491, cone: 615.5 };
const SCX = 360.5;
const roofY = (x: number) => S.peak + (Math.abs(x - SCX) * (S.roof - S.peak)) / (x < SCX ? SCX - 180 : 537 - SCX);
const BAG = { x: 300.5, y: 83.5, w: 165, h: 126.5 };
const RADAR_X = 495.5;
const FAN = { cx: 660.5, cy: 188, r: 40, motorW: 50, motorH: 44, ductTop: 131, baseY: 222 };

function SiloBody() {
  const win = { x: 240, y: 302.5, w: 241.5, h: 123.5 };
  const surf = `M ${win.x + 5} 364 Q ${win.x + 60} 346 ${win.x + 120} 352 T ${win.x + win.w - 5} 362`;
  return (
    <g aria-hidden="true">
      {/* legs and bracing */}
      {[212.5, 508.5].map((lx) => (
        <Column key={lx} x={lx} y1={496} y2={GROUND} w={10} />
      ))}
      <line x1={218} x2={503} y1={603.5} y2={603.5} stroke={MX.fine} strokeWidth={2} />
      <path d="M 218 603.5 L 360.5 655 L 503 603.5" fill="none" stroke={MX.fine} strokeWidth={2} />
      {/* cone, outlet, slide gate */}
      <path d={`M 195 501.5 H 526.5 L 398.5 ${S.cone} H 322.5 Z`} {...PAINT.cylinderV} />
      <line x1={270} y1={505} x2={340} y2={S.cone - 3} {...PAINT.hair} />
      <line x1={451} y1={505} x2={381} y2={S.cone - 3} {...PAINT.hair} />
      <rect x={342} y={546} width={36} height={22} rx={3} {...PAINT.raised} />
      <rect x={347} y={551} width={26} height={12} rx={2} {...PAINT.recess} />
      <rect x={330} y={S.cone} width={61} height={12} rx={2} {...PAINT.body} />
      <rect x={322} y={S.cone + 12} width={77} height={9} rx={2} {...PAINT.raised} />
      <rect x={399} y={S.cone + 14} width={22} height={5} rx={1.5} {...PAINT.shaft} />
      <circle cx={424} cy={S.cone + 16.5} r={6} fill="none" stroke={MX.edge} strokeWidth={1.6} />
      <rect x={336} y={S.cone + 21} width={49} height={12} rx={2} {...PAINT.body} />
      {/* shell with ring stiffeners and the cut-away */}
      <rect x={S.x} y={S.roof} width={S.r - S.x} height={S.cyl - S.roof} rx={4} {...PAINT.cylinderV} />
      {[297.5, 346.5, 396.5, 445.5].map((ry) => (
        <g key={ry}>
          <line x1={S.x + 3} x2={win.x - 3} y1={ry} y2={ry} {...PAINT.detail} />
          <line x1={win.x + win.w + 3} x2={S.r - 3} y1={ry} y2={ry} {...PAINT.detail} />
        </g>
      ))}
      <line x1={S.x + 3} x2={S.r - 3} y1={276} y2={276} {...PAINT.detail} />
      <line x1={S.x + 3} x2={S.r - 3} y1={468} y2={468} {...PAINT.detail} />
      <rect x={win.x} y={win.y} width={win.w} height={win.h} rx={8} {...PAINT.recess} />
      <path d={`${surf} L ${win.x + win.w - 5} ${win.y + win.h - 5} L ${win.x + 5} ${win.y + win.h - 5} Z`} fill={MX.material} opacity={0.82} />
      <path d={surf} fill="none" stroke={MX.material} strokeWidth={1.2} />
      <Lumps pts={[[262, 312], [258, 330], [266, 344]]} r={2.8} />
      <rect x={182} y={491} width={357.5} height={10.5} rx={3} {...PAINT.raised} />
      {Array.from({ length: 12 }).map((_, i) => (
        <Bolt key={i} x={192 + i * 30.7} y={496.25} r={1.4} />
      ))}
      {/* roof */}
      <path d={`M 180 ${S.roof} L ${SCX} ${S.peak} L 537 ${S.roof} Z`} {...PAINT.raised} />
      {[230, 290, 430, 490].map((rx) => (
        <line key={rx} x1={rx} x2={rx} y1={roofY(rx) + 2} y2={S.roof - 1} {...PAINT.hair} />
      ))}
      {/* pressure / vacuum relief valve */}
      <rect x={213} y={roofY(220) - 10} width={14} height={8} rx={2} {...PAINT.raised} />
      <rect x={210} y={roofY(220) - 14} width={20} height={5} rx={2} {...PAINT.body} />
    </g>
  );
}

function Baghouse() {
  const { x, y, w, h } = BAG;
  const bags = (bx: number) =>
    Array.from({ length: 3 }).map((_, i) => <rect key={`${bx}-${i}`} x={bx + 3 + i * 10} y={160} width={6} height={42} rx={3} {...PAINT.hair} />);
  return (
    <g aria-hidden="true">
      {/* hopper and legs onto the roof */}
      <path d={`M ${x + 14} ${y + h} H ${x + w - 14} L ${x + w - 44} ${roofY(x + w - 44)} H ${x + 44} Z`} {...PAINT.body} />
      {[x + 8, x + w - 8].map((lx) => (
        <rect key={lx} x={lx - 3} y={y + h} width={6} height={roofY(lx) - y - h} rx={1} {...PAINT.body} />
      ))}
      <rect x={x} y={y} width={w} height={h} rx={9} {...PAINT.body} />
      <rect x={x + 5} y={y + 5} width={w - 10} height={h - 10} rx={6} {...PAINT.hair} />
      {/* tube sheet */}
      <line x1={x + 3} x2={x + w - 3} y1={150} y2={150} stroke={MX.fine} strokeWidth={1.2} strokeDasharray="5 3" />
      {/* bag cells behind inspection windows */}
      <rect x={x + 9} y={156} width={34} height={50} rx={3} {...PAINT.recess} />
      <rect x={x + w - 43} y={156} width={34} height={50} rx={3} {...PAINT.recess} />
      {bags(x + 9)}
      {bags(x + w - 43)}
      {/* access door on the clean plenum */}
      <rect x={x + 12} y={96} width={26} height={40} rx={3} {...PAINT.raised} />
      <line x1={x + 17} x2={x + 33} y1={128} y2={128} stroke={MX.edge} strokeWidth={2} strokeLinecap="round" />
      {[x + 8, x + w - 8].map((bx) => [y + 8, y + h - 8].map((by) => <Bolt key={`${bx}-${by}`} x={bx} y={by} r={1.6} />))}
      {/* pulse-jet header with diaphragm valves */}
      <rect x={x + 8} y={y - 10} width={112} height={6} rx={3} {...PAINT.shaft} />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={x + 14 + i * 22} y={y - 6} width={9} height={7} rx={1.5} {...PAINT.raised} />
      ))}
      <MachineLabel x={382.5} y={119} size={7.5}>CLEAN PLENUM</MachineLabel>
      <MachineLabel x={382.5} y={186.5} size={7.5}>DIRTY PLENUM</MachineLabel>
      <MachineLabel x={381.75} y={68.7} size={8.2}>BAGHOUSE</MachineLabel>
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={22} x2={804} y={GROUND} />

      {/* ---------------- dust fan stand ---------------- */}
      <Brace x1={630} y1={300} x2={782} y2={GROUND - 20} />
      <line x1={630} x2={782} y1={300} y2={300} stroke={MX.fine} strokeWidth={2.2} />
      <Column x={626} y1={232} y2={GROUND} w={9} />
      <Column x={786} y1={232} y2={GROUND} w={9} />
      <Pier x={610} y={FAN.baseY + 8} w={188} h={8} bolts={4} />

      <SiloBody />
      <Ladder x={166} y1={226} y2={491} w={12} cageFrom={470} side={-1} />
      {/* roof rail posts follow the roof slope */}
      {Array.from({ length: 12 }).map((_, i) => {
        const px = 194 + i * 30;
        return <line key={i} x1={px} x2={px} y1={229} y2={roofY(px)} stroke={MX.edge} strokeWidth={1} />;
      })}
      <line x1={194} x2={524} y1={229} y2={229} stroke={MX.edge} strokeWidth={1.4} />
      <line x1={194} x2={524} y1={237} y2={237} stroke={MX.fine} strokeWidth={1} />
      <MachineLabel x={359.3} y={389.3} size={13.5} tone="ink">CLINKER SILO</MachineLabel>

      {/* ---------------- inlet chute from the pan conveyor ---------------- */}
      <g transform={`rotate(${(Math.atan2(52, 228) * 180) / Math.PI} 40 136)`}>
        <rect x={40} y={127} width={238} height={18} rx={2} {...PAINT.body} />
        <rect x={44} y={130} width={226} height={9} rx={1.5} {...PAINT.recess} />
        <rect x={46} y={134} width={222} height={4.5} rx={1} fill={MX.material} />
        {[100, 170, 240].map((fx) => (
          <rect key={fx} x={fx} y={125} width={4} height={22} rx={1} {...PAINT.raised} />
        ))}
      </g>
      <rect x={256} y={182} width={24} height={roofY(268) - 182} rx={2} {...PAINT.body} />
      <rect x={261} y={188} width={14} height={roofY(268) - 192} rx={1.5} {...PAINT.recess} />
      <Lumps pts={[[268, 198], [267, 214]]} r={2.6} />
      <rect x={251} y={roofY(268) - 6} width={34} height={6} rx={1.5} {...PAINT.raised} />
      <MachineLabel x={53} y={118.7} anchor="start" size={9}>FROM PAN CONVEYOR (H-2)</MachineLabel>

      {/* ---------------- level radar ---------------- */}
      <Radar x={RADAR_X} y={roofY(RADAR_X)} h={36} />

      {/* ---------------- baghouse and DP transmitter ---------------- */}
      <Baghouse />
      <path d={`M 465.5 113 H 511 V 126 M 465.5 188 H 511 V 176`} fill="none" stroke={MX.edge} strokeWidth={2.4} strokeLinecap="round" />
      <path d={`M 465.5 113 H 511 V 126 M 465.5 188 H 511 V 176`} fill="none" stroke={MX.metal} strokeWidth={1} strokeLinecap="round" />
      <rect x={494} y={126} width={33} height={50} rx={5} {...PAINT.raised} />
      <rect x={498} y={130} width={25} height={42} rx={3} {...PAINT.hair} />
      <rect x={527} y={146} width={6} height={9} rx={1.5} {...PAINT.shaft} />

      {/* ---------------- clean-gas duct and dust fan ---------------- */}
      <Pipe pts={[[439, 84], [439, 45.5], [633, 45.5], [633, 131]]} d={18} flanges={[[439, 72], [540, 45.5], [633, 110]]} />
      <FanSet {...FAN} />
      <MachineLabel x={674.5} y={269.1} size={8.2}>DUST FAN</MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 37. */
const pads: LineSheetArt["pads"] = {
  "LEV-CSL-01": [495.5, 206],
  "PRS-CSL-01": [510.5, 150.5],
  "ELE-CSL-02": [762, 161],
};

/** Tag chip centre per point, as on PDF page 37. */
const chips: NonNullable<LineSheetArt["chips"]> = {
  "LEV-CSL-01": [568, 238],
  "PRS-CSL-01": [580, 135.5],
  "ELE-CSL-02": [694.5, 54.5],
};

export const sheet: LineSheetArt = { id: "H-3", ready: true, width: W, height: H, Art, pads, chips };
