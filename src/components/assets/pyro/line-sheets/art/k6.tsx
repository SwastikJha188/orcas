/**
 * Sheet K-6 — KLN-01 · Rotary kiln — Roller stations and tyres.
 *
 * Composed as PDF page 19. Top band: the kiln shell (inlet seal left, outlet
 * seal right) on its three roller stations, the girth gear between station 1
 * and 2, the hydraulic thrust roller on the downhill face of tyre 2, and a
 * tyre-migration pickup hung over each tyre. Below, one plan (looking down)
 * per station: the tyre across the kiln axis, the left and right support
 * rollers on their journals, bearing housings A / B with hold-down feet and
 * skew-adjusting jack screws, and the roller oil-bath trough with its level
 * gauge beside each roller.
 */
import React from "react";
import { Bolt, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { GearEdge } from "../../sheets/sb-parts";
import type { LineSheetArt } from "../types";
import { KilnShell, Pier, RollerPair, Tyre } from "./parts-kb";

const W = 824;
const H = 704;

/* ---------------- top band: side elevation ---------------- */
const SHELL = { x: 45.5, y: 69.5, w: 735.5, h: 50 };
const TYRES = [154.5, 432.5, 641.5];
const TYRE_Y = 60.5;
const TYRE_H = 68;
const GROUND = 188;

function MigrationPickup({ cx }: { cx: number }) {
  return (
    <g aria-hidden="true">
      <rect x={cx - 10} y={26} width={20} height={5} rx={1.5} {...PAINT.raised} />
      <Bolt x={cx - 6} y={28.5} r={0.9} />
      <Bolt x={cx + 6} y={28.5} r={0.9} />
      <rect x={cx - 2} y={31} width={4} height={18} {...PAINT.shaft} />
      <rect x={cx - 7} y={48} width={14} height={13} rx={3} {...PAINT.raised} />
      <rect x={cx + 7} y={51} width={5} height={4} rx={1} {...PAINT.body} />
    </g>
  );
}

function Elevation() {
  return (
    <g>
      {TYRES.map((cx) => (
        <g key={cx}>
          <Pier cx={cx} top={159.5} bottom={GROUND} wTop={62} wBot={76} />
          <RollerPair cx={cx} cy={143.5} r={12.5} gap={33} frameY={150} frameW={72} frameH={9.5} />
        </g>
      ))}
      {/* inlet and outlet seals */}
      <rect x={36} y={63} width={11} height={63} rx={3} {...PAINT.body} />
      <rect x={779} y={63} width={11} height={63} rx={3} {...PAINT.body} />
      <KilnShell x={SHELL.x} y={SHELL.y} w={SHELL.w} h={SHELL.h} seam={52.5} />
      <GearEdge x={207.5} y={44} w={14} h={101} n={16} />
      {TYRES.map((cx) => (
        <Tyre key={cx} cx={cx} y={TYRE_Y} w={18} h={TYRE_H} shellTop={SHELL.y} shellBot={SHELL.y + SHELL.h} />
      ))}
      {/* hydraulic thrust roller on the downhill face of tyre 2 */}
      <rect x={461} y={124} width={6} height={26} rx={1} {...PAINT.body} />
      <rect x={449} y={116} width={22} height={8} rx={2} {...PAINT.cylinder} />
      <rect x={441.5} y={110} width={8} height={20} rx={2.5} {...PAINT.shaft} />
      {TYRES.map((cx) => (
        <MigrationPickup key={cx} cx={cx} />
      ))}
      <GroundLine x1={30} x2={796} y={GROUND} />
    </g>
  );
}

/* ---------------- station plans (panel 1 coordinates; panels 2, 3 shifted) ---------------- */
const PANEL_DX = [0, 262.5, 525];
const ROLLERS = [371.5, 544]; // left, right roller axis
const BRG_A = 51.5;
const BRG_B = 249.75;
const AXIS_Y = 457.5;

function Bearing({ cx, cy, side }: { cx: number; cy: number; side: -1 | 1 }) {
  const w = 34;
  const h = 48.5;
  return (
    <g aria-hidden="true">
      {/* hold-down feet */}
      <rect x={cx - w / 2 - 2} y={cy - h / 2 - 5} width={w + 4} height={h + 10} rx={3} {...PAINT.body} />
      {[-1, 1].map((sy) => (
        <g key={sy}>
          <Bolt x={cx - w / 2 + 3} y={cy + sy * (h / 2 + 1)} r={1.2} />
          <Bolt x={cx + w / 2 - 3} y={cy + sy * (h / 2 + 1)} r={1.2} />
        </g>
      ))}
      {/* skew-adjusting jack screw on the outer face */}
      <rect x={side < 0 ? cx - w / 2 - 9 : cx + w / 2 + 2} y={cy - 2} width={7} height={4} {...PAINT.shaft} />
      <rect x={side < 0 ? cx - w / 2 - 6 : cx + w / 2 + 2} y={cy - 6} width={4} height={12} rx={1} {...PAINT.raised} />
      {/* housing cap */}
      <rect x={cx - w / 2} y={cy - h / 2 + 3} width={w} height={h - 6} rx={5} {...PAINT.raised} />
      <rect x={cx - w / 2 + 3} y={cy - h / 2 + 6} width={w - 6} height={h - 12} rx={3.5} fill="none" stroke={MX.fine} strokeWidth={0.8} />
      <Bolt x={cx - w / 2 + 6} y={cy - h / 2 + 9} r={1.3} />
      <Bolt x={cx + w / 2 - 6} y={cy - h / 2 + 9} r={1.3} />
      <Bolt x={cx - w / 2 + 6} y={cy + h / 2 - 9} r={1.3} />
      <Bolt x={cx + w / 2 - 6} y={cy + h / 2 - 9} r={1.3} />
    </g>
  );
}

function RollerPlan({ cy }: { cy: number }) {
  return (
    <g aria-hidden="true">
      {/* journals and barrel */}
      <rect x={66} y={cy - 9} width={170} height={18} rx={2} {...PAINT.shaft} />
      <rect x={78} y={cy - 18} width={145} height={36} rx={4} {...PAINT.shaft} strokeWidth={MX.w} />
      <line x1={83} x2={83} y1={cy - 16} y2={cy + 16} {...PAINT.hair} />
      <line x1={218} x2={218} y1={cy - 16} y2={cy + 16} {...PAINT.hair} />
      <Bearing cx={BRG_A} cy={cy} side={-1} />
      <Bearing cx={BRG_B} cy={cy} side={1} />
    </g>
  );
}

/** Roller oil-bath trough with its level gauge (pad sits on the gauge). */
function OilBath({ cy }: { cy: number }) {
  return (
    <g aria-hidden="true">
      <rect x={73} y={cy - 8} width={72} height={16} rx={3} {...PAINT.body} />
      <rect x={78} y={cy - 4.5} width={62} height={9} rx={2} {...PAINT.recess} />
      <rect x={79} y={cy - 1.5} width={60} height={5.5} rx={1.5} {...PAINT.material} />
      <Bolt x={76.5} y={cy} r={1} />
      <Bolt x={141.5} y={cy} r={1} />
    </g>
  );
}

function StationPlan({ dx, n }: { dx: number; n: number }) {
  return (
    <g transform={dx ? `translate(${dx} 0)` : undefined}>
      <rect x={23.5} y={226} width={254.5} height={457} rx={12} fill="none" stroke={MX.fine} strokeWidth={0.9} strokeDasharray="5 4" />
      <line x1={30} x2={271} y1={AXIS_Y} y2={AXIS_Y} {...PAINT.hair} strokeDasharray="14 4 2 4" opacity={0.7} />
      {/* tyre across the kiln axis, with its stop blocks */}
      <rect x={132.5} y={262.5} width={36} height={397.5} rx={6} {...PAINT.cylinder} />
      <line x1={136} x2={136} y1={268} y2={655} {...PAINT.hair} />
      <line x1={165} x2={165} y1={268} y2={655} {...PAINT.hair} />
      <RollerPlan cy={ROLLERS[0]} />
      <RollerPlan cy={ROLLERS[1]} />
      <OilBath cy={340.25} />
      <OilBath cy={575.75} />

      <MachineLabel x={33.5} y={243.6} anchor="start" size={8.2}>{`STATION ${n} · PLAN (LOOKING DOWN)`}</MachineLabel>
      <MachineLabel x={176} y={342} anchor="start" size={7.5}>LEFT ROLLER</MachineLabel>
      <MachineLabel x={172.5} y={582} anchor="start" size={7.5}>RIGHT ROLLER</MachineLabel>
      <MachineLabel x={BRG_A} y={410.5} size={9}>A</MachineLabel>
      <MachineLabel x={BRG_B} y={410.5} size={9}>B</MachineLabel>
      <MachineLabel x={BRG_A} y={513} size={9}>A</MachineLabel>
      <MachineLabel x={BRG_B} y={513} size={9}>B</MachineLabel>
      <MachineLabel x={150.5} y={678.5} size={7.5}>{`TYRE ${n}`}</MachineLabel>
    </g>
  );
}

function Art() {
  return (
    <g>
      <Elevation />
      {PANEL_DX.map((dx, i) => (
        <StationPlan key={dx} dx={dx} n={i + 1} />
      ))}
      {TYRES.map((cx, i) => (
        <MachineLabel key={cx} x={cx} y={203} size={8.2}>{`STATION ${i + 1}`}</MachineLabel>
      ))}
      <MachineLabel x={188.5} y={212} anchor="start" size={7.5}>GIRTH GEAR</MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 19. */
const pads: LineSheetArt["pads"] = {
  "MIG-KLN-01": [154.5, 56],
  "MIG-KLN-02": [432.5, 56],
  "MIG-KLN-03": [641.5, 56],
  "TMP-KLN-01": [51.5, 371.5],
  "TMP-KLN-02": [249.5, 371.5],
  "LEV-KLN-02": [109, 340],
  "TMP-KLN-03": [51.5, 544],
  "TMP-KLN-04": [249.5, 544],
  "LEV-KLN-03": [109, 575.5],
  "TMP-KLN-05": [314, 371.5],
  "TMP-KLN-06": [512, 371.5],
  "LEV-KLN-04": [371.5, 340],
  "TMP-KLN-07": [314, 544],
  "TMP-KLN-08": [512, 544],
  "LEV-KLN-05": [371.5, 575.5],
  "TMP-KLN-09": [576.5, 371.5],
  "TMP-KLN-10": [774.5, 371.5],
  "LEV-KLN-06": [634, 340],
  "TMP-KLN-11": [576.5, 544],
  "TMP-KLN-12": [774.5, 544],
  "LEV-KLN-07": [634, 575.5],
};

/** Tag chip centre per point, as on PDF page 19. */
const chips: NonNullable<LineSheetArt["chips"]> = {
  "MIG-KLN-01": [221, 21.5],
  "MIG-KLN-02": [499, 21.5],
  "MIG-KLN-03": [707.5, 21.5],
  "TMP-KLN-01": [92, 288],
  "TMP-KLN-02": [208.5, 288],
  "LEV-KLN-02": [60.5, 312],
  "TMP-KLN-03": [92, 636],
  "TMP-KLN-04": [208.5, 636],
  "LEV-KLN-03": [60.5, 613.5],
  "TMP-KLN-05": [354.5, 288],
  "TMP-KLN-06": [471, 288],
  "LEV-KLN-04": [323, 312],
  "TMP-KLN-07": [354.5, 636],
  "TMP-KLN-08": [471, 636],
  "LEV-KLN-05": [323, 613.5],
  "TMP-KLN-09": [617, 288],
  "TMP-KLN-10": [733.5, 288],
  "LEV-KLN-06": [585.5, 312],
  "TMP-KLN-11": [617, 636],
  "TMP-KLN-12": [733.5, 636],
  "LEV-KLN-07": [585.5, 613.5],
};

export const sheet: LineSheetArt = { id: "K-6", ready: true, width: W, height: H, Art, pads, chips };
