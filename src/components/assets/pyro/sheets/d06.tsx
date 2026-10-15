/**
 * D06 — KLN-01 support stations, tyres and thrust.
 *
 * Composition of PDF page 6. Top: the kiln (inlet → hood) on its three roller
 * stations, girth gear between station 1 and 2, the hydraulic thrust roller
 * on the downhill side of station 2, tyre-migration pickups on each tyre.
 * Below, four panels: STATION 1 / STATION 2 (THRUST) / STATION 3 — each the
 * tyre with its left and right support rollers, bearings A / B and the two
 * oil baths — and THRUST SYSTEM (thrust roller, LVDT, travel-limit switch,
 * hydraulic unit).
 */
import React from "react";
import { Bolt, MX, MachineLabel, PAINT } from "../../machine-kit/machine-kit";
import type { PyroSheetDrawing, SheetCalloutAnchor } from "./sheet-types";
import { GearEdge, Plinth, RollerEnd, Shell, TyreBand, pdfMap, type Pt } from "./sb-parts";

const { X, Y, L, P, B, R } = pdfMap(38, 175, 0.59);
const W = 918;
const H = 566;

/* ---------------- top band: kiln on three stations (page px) ---------------- */
const TYRES = [275, 760, 1221];
const ROLL_DX = 33;
const ROLL_Y = 336;

function KilnElevation() {
  return (
    <g>
      {TYRES.map((cx, i) => (
        <g key={cx}>
          <Plinth {...R(cx - 65, 357, cx + 66, 372)} bolts={3} />
          <RollerEnd cx={X(cx - ROLL_DX)} cy={Y(ROLL_Y)} r={L(21)} />
          <RollerEnd cx={X(cx + ROLL_DX)} cy={Y(ROLL_Y)} r={L(21)} />
          {i === 1 && (
            <g>
              {/* hydraulic thrust roller against the downhill face of tyre 2 */}
              <rect {...B(806, 334, 826, 357)} rx={2} {...PAINT.body} />
              <circle cx={X(812)} cy={Y(326)} r={L(12)} {...PAINT.raised} />
              <circle cx={X(812)} cy={Y(326)} r={L(4.5)} {...PAINT.recess} />
            </g>
          )}
        </g>
      ))}
      <rect {...B(88, 188, 166, 333)} rx={8} {...PAINT.body} />
      <rect {...B(94, 196, 160, 325)} rx={5} fill="none" stroke={MX.fine} strokeWidth={1} />
      <Shell {...R(165, 210, 1486, 312)} seam={L(110)} />
      <GearEdge {...R(373, 197, 405, 323)} n={13} />
      {TYRES.map((cx) => (
        <TyreBand key={cx} {...{ cx: X(cx), y: Y(198), w: L(44), h: L(124) }} />
      ))}
      <rect {...B(1485, 195, 1562, 326)} rx={8} {...PAINT.body} />
      <rect {...B(1491, 202, 1556, 319)} rx={5} fill="none" stroke={MX.fine} strokeWidth={1} />
      <line x1={X(150)} x2={X(1500)} y1={Y(261)} y2={Y(261)} {...PAINT.hair} strokeDasharray="14 4 2 4" opacity={0.6} />

      <MachineLabel x={X(127)} y={Y(350)} size={7}>INLET</MachineLabel>
      <MachineLabel x={X(1523)} y={Y(350)} size={7}>HOOD</MachineLabel>
      {TYRES.map((cx, i) => (
        <MachineLabel key={cx} x={X(cx)} y={Y(392)} size={7}>{`STATION ${i + 1}`}</MachineLabel>
      ))}
    </g>
  );
}

/* ---------------- panels (drawing units) ---------------- */
/* Each panel holds its callouts as on the PDF page: two rows above the rollers (bearings A / B, then the left oil bath), two below. */
const PT = 140;
const PB = 560;
const LR = PT + 158; // left roller axis
const RR = PT + 280; // right roller axis
const PANELS = [
  { x0: X(45), x1: X(450), title: "STATION 1" },
  { x0: X(463), x1: X(868), title: "STATION 2 (THRUST)" },
  { x0: X(880), x1: X(1287), title: "STATION 3" },
] as const;
const TH = { x0: X(1298), x1: X(1586) };

/* positions inside a station panel, relative to its left edge (from the page: A 80, tyre 203, oil 155, B 326 px) */
const REL_A = L(80);
const REL_B = L(326);
const REL_T = L(203);
const REL_OIL = L(155);

function PanelFrame({ x0, x1, title }: { x0: number; x1: number; title: string }) {
  return (
    <g>
      <rect x={x0} y={PT} width={x1 - x0} height={PB - PT} rx={10} fill="none" stroke={MX.fine} strokeWidth={1} />
      <MachineLabel x={x0 + 10} y={PT + 17} anchor="start" size={8} tone="ink">
        {title}
      </MachineLabel>
    </g>
  );
}

function OilBath({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g aria-hidden="true">
      <rect x={cx - 17} y={cy - 6.5} width={34} height={13} rx={2.5} {...PAINT.body} />
      <rect x={cx - 13} y={cy - 3.5} width={26} height={7} rx={1.5} {...PAINT.recess} />
      <rect x={cx - 12} y={cy - 0.5} width={24} height={3.5} rx={1} {...PAINT.material} />
    </g>
  );
}

function RollerPlan({ x0, y }: { x0: number; y: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x0 + REL_A} y={y - 10} width={REL_B - REL_A} height={20} rx={3} {...PAINT.shaft} strokeWidth={MX.w} />
      {[REL_A, REL_B].map((rx) => (
        <g key={rx}>
          <rect x={x0 + rx - 11} y={y - 15.5} width={22} height={31} rx={4} {...PAINT.raised} />
          <line x1={x0 + rx - 9} x2={x0 + rx + 9} y1={y} y2={y} {...PAINT.hair} />
          <Bolt x={x0 + rx - 6} y={y - 11} r={1.3} />
          <Bolt x={x0 + rx + 6} y={y + 11} r={1.3} />
        </g>
      ))}
    </g>
  );
}

function StationPanel({ x0, x1, title, n }: { x0: number; x1: number; title: string; n: number }) {
  const tx = x0 + REL_T;
  return (
    <g>
      <PanelFrame x0={x0} x1={x1} title={title} />
      <rect x={tx - 14} y={LR - 34} width={28} height={RR - LR + 68} rx={5} {...PAINT.cylinderV} />
      <line x1={tx - 10} x2={tx - 10} y1={LR - 30} y2={RR + 30} {...PAINT.hair} />
      <line x1={tx + 10} x2={tx + 10} y1={LR - 30} y2={RR + 30} {...PAINT.hair} />
      <RollerPlan x0={x0} y={LR} />
      <RollerPlan x0={x0} y={RR} />
      <OilBath cx={x0 + REL_OIL} cy={LR - 22} />
      <OilBath cx={x0 + REL_OIL} cy={RR + 22} />
      <MachineLabel x={tx + 18} y={LR - 22} anchor="start" size={6.5}>{`TYRE ${n}`}</MachineLabel>
      <MachineLabel x={x0 + REL_A + 12} y={LR + 24} anchor="start" size={5.5}>LEFT ROLLER</MachineLabel>
      <MachineLabel x={x0 + REL_A + 12} y={RR - 18} anchor="start" size={5.5}>RIGHT ROLLER</MachineLabel>
      {[LR + 28, RR - 23].map((y) => (
        <g key={y}>
          <MachineLabel x={x0 + REL_A} y={y} size={7} tone="ink">A</MachineLabel>
          <MachineLabel x={x0 + REL_B} y={y} size={7} tone="ink">B</MachineLabel>
        </g>
      ))}
    </g>
  );
}

/* thrust panel geometry (page x → X(), page y → panel rows) */
const TY = (y: number) => +(LR + (y - 673) * 0.85).toFixed(1);
const TP = (x: number, y: number): Pt => [X(x), TY(y)];

function ThrustPanel() {
  return (
    <g>
      <PanelFrame x0={TH.x0} x1={TH.x1} title="THRUST SYSTEM" />
      {/* tyre 2 (edge-on) with the thrust roller on its downhill face */}
      <rect x={X(1321)} y={TY(640)} width={L(44)} height={TY(850) - TY(640)} rx={5} {...PAINT.cylinderV} />
      {/* hydraulic line from the power unit to the cylinder */}
      <path d={`M ${X(1464)} ${TY(828)} V ${TY(750)}`} stroke={MX.edge} strokeWidth={2.4} fill="none" />
      {/* cylinder rod and rod-end limit switch */}
      <rect x={X(1404)} y={TY(728)} width={X(1531) - X(1404)} height={TY(749) - TY(728)} rx={3} {...PAINT.shaft} />
      <rect x={X(1432)} y={TY(724)} width={X(1500) - X(1432)} height={TY(753) - TY(724)} rx={4} {...PAINT.cylinder} />
      <circle cx={X(1532)} cy={TY(738)} r={7} {...PAINT.raised} />
      <circle cx={X(1532)} cy={TY(738)} r={2.4} {...PAINT.recess} />
      {/* LVDT on its bracket above the cylinder */}
      <rect x={X(1442)} y={TY(702)} width={X(1507) - X(1442)} height={7} rx={2} {...PAINT.body} />
      <line x1={X(1500)} x2={X(1500)} y1={TY(702) + 7} y2={TY(724)} {...PAINT.detail} />
      {/* thrust roller */}
      <circle cx={X(1388)} cy={TY(738)} r={L(21)} {...PAINT.raised} />
      <circle cx={X(1388)} cy={TY(738)} r={L(13)} fill="none" stroke={MX.fine} strokeWidth={1} />
      <circle cx={X(1388)} cy={TY(738)} r={L(5)} {...PAINT.recess} />
      {/* hydraulic power unit */}
      <rect x={X(1420)} y={TY(828)} width={X(1563) - X(1420)} height={58} rx={7} {...PAINT.body} />
      <rect x={X(1420) + 5} y={TY(828) + 5} width={X(1563) - X(1420) - 10} height={48} rx={4} fill="none" stroke={MX.fine} strokeWidth={1} />
      <rect x={X(1430)} y={TY(828) + 30} width={L(40)} height={17} rx={2} {...PAINT.recess} />
      <rect x={X(1432)} y={TY(828) + 38} width={L(36)} height={8} rx={1} {...PAINT.material} opacity={0.85} />
      <Bolt x={X(1420) + 9} y={TY(828) + 9} r={1.5} />
      <Bolt x={X(1563) - 9} y={TY(828) + 9} r={1.5} />

      <MachineLabel x={X(1436)} y={TY(702) + 6} anchor="end" size={6.5}>LVDT</MachineLabel>
      <MachineLabel x={X(1490)} y={TY(828) + 72} size={6.5}>HYDRAULIC UNIT</MachineLabel>
    </g>
  );
}

function Art() {
  return (
    <g>
      <KilnElevation />
      {PANELS.map((p, i) => (
        <StationPanel key={p.title} x0={p.x0} x1={p.x1} title={p.title} n={i + 1} />
      ))}
      <ThrustPanel />
    </g>
  );
}

function stationPads(i: number, tmp: [string, string, string, string], lev: [string, string]): Record<string, Pt> {
  const x0 = PANELS[i].x0;
  return {
    [tmp[0]]: [x0 + REL_A, LR],
    [tmp[1]]: [x0 + REL_B, LR],
    [lev[0]]: [x0 + REL_OIL, LR - 22],
    [lev[1]]: [x0 + REL_OIL, RR + 22],
    [tmp[2]]: [x0 + REL_A, RR],
    [tmp[3]]: [x0 + REL_B, RR],
  };
}

/* ---------------- callout boxes (as on PDF page 6) ---------------- */
/** Two bearing boxes side by side across a station panel; the oil-bath box sits inboard, clear of bearing A's leader. */
const BOX_W = 106;
const BATH_W = 130;
const ROW_TOP = PT + 25;
const ROW_BATH_TOP = PT + 75;
const ROW_BATH_BOTTOM = RR + 38;
const ROW_BOTTOM = RR + 88;

function stationCallouts(i: number, tmp: [string, string, string, string], lev: [string, string]): Record<string, SheetCalloutAnchor> {
  const x0 = PANELS[i].x0;
  return {
    [tmp[0]]: [x0 + 5, ROW_TOP, BOX_W],
    [tmp[1]]: [x0 + 127, ROW_TOP, BOX_W],
    [lev[0]]: [x0 + 58, ROW_BATH_TOP, BATH_W],
    [lev[1]]: [x0 + 58, ROW_BATH_BOTTOM, BATH_W],
    [tmp[2]]: [x0 + 5, ROW_BOTTOM, BOX_W],
    [tmp[3]]: [x0 + 127, ROW_BOTTOM, BOX_W],
  };
}

/** Callout boxes as on PDF page 6: migration above each tyre, six per station panel, three in the thrust panel (top-left corner and width, drawing units). */
const callouts: Record<string, SheetCalloutAnchor> = {
  "MIG-KLN-01": [X(TYRES[0]) + 14, -40, 100],
  "MIG-KLN-02": [X(TYRES[1]) + 14, -40, 100],
  "MIG-KLN-03": [X(TYRES[2]) + 14, -40, 100],
  ...stationCallouts(0, ["TMP-KLN-01", "TMP-KLN-02", "TMP-KLN-03", "TMP-KLN-04"], ["LEV-KLN-02", "LEV-KLN-03"]),
  ...stationCallouts(1, ["TMP-KLN-05", "TMP-KLN-06", "TMP-KLN-07", "TMP-KLN-08"], ["LEV-KLN-04", "LEV-KLN-05"]),
  ...stationCallouts(2, ["TMP-KLN-09", "TMP-KLN-10", "TMP-KLN-11", "TMP-KLN-12"], ["LEV-KLN-06", "LEV-KLN-07"]),
  // Travel-limit box on top at the right, so its leader drops clear of the LVDT box below it.
  "POS-KLN-02": [TH.x1 - 126, ROW_TOP, 120],
  "POS-KLN-01": [TH.x0 + 4, ROW_TOP + 50, 88],
  "PRS-KLN-07": [TH.x0 + 8, ROW_BOTTOM + 4, BATH_W],
};

export const sheet: PyroSheetDrawing = {
  sheet: "D06",
  width: W,
  height: H,
  Art,
  callouts,
  pads: {
    "MIG-KLN-01": P(TYRES[0], 202),
    "MIG-KLN-02": P(TYRES[1], 202),
    "MIG-KLN-03": P(TYRES[2], 202),
    ...stationPads(0, ["TMP-KLN-01", "TMP-KLN-02", "TMP-KLN-03", "TMP-KLN-04"], ["LEV-KLN-02", "LEV-KLN-03"]),
    ...stationPads(1, ["TMP-KLN-05", "TMP-KLN-06", "TMP-KLN-07", "TMP-KLN-08"], ["LEV-KLN-04", "LEV-KLN-05"]),
    ...stationPads(2, ["TMP-KLN-09", "TMP-KLN-10", "TMP-KLN-11", "TMP-KLN-12"], ["LEV-KLN-06", "LEV-KLN-07"]),
    "POS-KLN-01": TP(1475, 706),
    "POS-KLN-02": TP(1532, 738),
    "PRS-KLN-07": [X(1486), TY(828) + 20],
  },
};
