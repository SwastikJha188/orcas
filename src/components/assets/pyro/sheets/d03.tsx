/**
 * Sheet D03 — PHC-01 · Preheater exit, gas analysis & ID fan.
 *
 * Composition of PDF page 3: the C1 cyclone (top stage) on its support frame
 * at the left; the preheater exit gas duct rising from C1, across the top
 * with the analyser sample probe (O2 / CO) and its analyser cabinet below,
 * then down through the ID fan inlet damper into the fan; the ID fan volute
 * with its outlet duct rising and turning "TO GCT / RAW MILL / STACK"; the fan
 * shaft through the NDE and DE bearing pedestals, coupling, VFD motor and
 * shaft encoder on the motor skid and common foundation.
 */
import React from "react";
import { CornerBolts, Coupling, MX, MachineLabel, Motor, PAINT } from "../../machine-kit/machine-kit";
import { Brace, MirrorX, PedestalBearing, Pipe, Steel, Volute } from "../drawings/fkp-parts";
import type { PyroSheetDrawing, SheetCalloutAnchor } from "./sheet-types";
import { EncoderCap, sheetMap } from "./sa-parts";

const W = 880;
const H = 525;
const { X, Y, P, PTS, R, B } = sheetMap(0.65, 175, 120);

/* ---------------------------------------------------------------- C1 cyclone */
function Cyclone1() {
  const cx = X(275);
  const l = X(190);
  const r = X(360);
  const top = Y(277);
  const band = Y(395);
  const outY = Y(545);
  const oh = 13;
  return (
    <g>
      {/* support frame */}
      <Steel x={X(185)} y={Y(548)} w={7} h={Y(702) - Y(548)} />
      <Steel x={X(360)} y={Y(548)} w={7} h={Y(702) - Y(548)} />
      <Brace x1={X(185) + 7} y1={Y(556)} x2={X(360)} y2={Y(698)} />
      <rect {...R(180, 546, 370, 556)} rx={1.5} {...PAINT.body} />
      <rect {...R(176, 698, 374, 706)} rx={1.5} {...PAINT.body} />
      {/* cone */}
      <path d={`M ${l} ${band} L ${r} ${band} L ${cx + oh} ${outY} L ${cx - oh} ${outY} Z`} {...PAINT.cylinderV} />
      <line x1={l + 24} y1={band + 3} x2={cx - 4} y2={outY - 3} {...PAINT.hair} />
      <line x1={r - 24} y1={band + 3} x2={cx + 4} y2={outY - 3} {...PAINT.hair} />
      {/* cylinder */}
      <rect x={l} y={top} width={r - l} height={band - top} rx={2} {...PAINT.cylinderV} />
      <line x1={l + 2} x2={r - 2} y1={Y(340)} y2={Y(340)} stroke={MX.fine} strokeWidth={1} />
      <rect x={l - 4} y={band - 3} width={r - l + 8} height={6} rx={2} {...PAINT.raised} />
      <rect x={l - 4} y={top - 4} width={r - l + 8} height={6} rx={2} {...PAINT.raised} />
      <rect x={cx - oh - 3} y={outY - 2} width={2 * oh + 6} height={6} rx={1.5} {...PAINT.raised} />
      <text x={cx} y={Y(343)} fill="var(--dx-ink-2)" fontSize={11} fontWeight={600} letterSpacing="0.08em" textAnchor="middle" dominantBaseline="middle">
        C1
      </text>
    </g>
  );
}

/* ---------------------------------------------------------------- exit gas duct, analyser, damper */
const DUCT_D = 27;

function ExitGas() {
  const dx = X(682);
  const dy = Y(400);
  return (
    <g>
      <Pipe pts={PTS([[275, 280], [275, 195], [682, 195], [682, 700]])} d={DUCT_D} flanges={[P(380, 195), P(600, 195), P(682, 300), P(682, 362), P(682, 438)]} />
      {/* analyser sample probe on the duct crown and the heated sample line */}
      <rect x={X(472) - 3} y={Y(195) - DUCT_D / 2 - 14} width={6} height={16} rx={1.5} {...PAINT.shaft} />
      <rect x={X(472) - 6} y={Y(195) - DUCT_D / 2 - 18} width={12} height={6} rx={2} {...PAINT.raised} />
      <line x1={X(488)} y1={Y(195) + DUCT_D / 2 + 2} x2={X(488)} y2={Y(277)} stroke={MX.fine} strokeWidth={1.2} strokeDasharray="3 2" />
      {/* analyser cabinet */}
      <rect {...R(440, 277, 560, 362)} rx={5} {...PAINT.body} />
      <rect {...R(447, 284, 553, 355)} rx={3} fill="none" stroke={MX.fine} strokeWidth={1} />
      <CornerBolts {...B(440, 277, 560, 362)} inset={5} r={1.3} />
      <MachineLabel x={X(500)} y={Y(324)} size={7} tone="ink">
        ANALYSER
      </MachineLabel>
      {/* ID fan inlet damper: louvre housing, blade, actuator */}
      <rect x={dx - DUCT_D / 2 - 4} y={dy - 15} width={DUCT_D + 8} height={30} rx={3} {...PAINT.raised} />
      <line x1={dx - DUCT_D / 2 + 1} y1={dy + 8} x2={dx + DUCT_D / 2 - 1} y2={dy - 8} stroke={MX.edge} strokeWidth={2} strokeLinecap="round" />
      <circle cx={dx} cy={dy} r={3} {...PAINT.shaft} />
      <rect x={dx + DUCT_D / 2 + 4} y={dy - 2} width={6} height={4} {...PAINT.shaft} />
      <rect {...R(706, 388, 746, 412)} rx={3} {...PAINT.body} />
      <rect x={X(712)} y={Y(394)} width={X(732) - X(712)} height={6} rx={1.5} {...PAINT.recess} />
    </g>
  );
}

/* ---------------------------------------------------------------- ID fan, bearings, motor */
const FX = X(836);
const FY = Y(682);
const FR = 97;
const OUT_TOP = Y(478);

function IdFan() {
  const outL = FX + FR * 0.18;
  const outR = FX + FR * 1.12;
  const ductX = X(1001);
  const dd = 27;
  return (
    <g>
      {/* foundation slab and motor skid */}
      <rect {...R(705, 858, 1518, 902)} rx={2} {...PAINT.body} />
      <rect {...R(968, 752, 1518, 858)} rx={2} {...PAINT.body} />
      <CornerBolts {...B(968, 752, 1518, 858)} inset={8} r={1.8} />
      {/* fan casing pedestal */}
      <path d={`M ${FX - FR * 0.62} ${FY + FR * 0.62} L ${FX + FR * 0.62} ${FY + FR * 0.62} L ${FX + FR * 0.86} ${Y(858)} L ${FX - FR * 0.86} ${Y(858)} Z`} {...PAINT.body} />
      {/* outlet duct up and across to the GCT / raw mill / stack */}
      <Pipe pts={[[ductX, OUT_TOP - 16], ...PTS([[1001, 165], [1165, 165]])]} d={dd} flanges={[P(1001, 330)]} />
      <path d={`M ${outL} ${OUT_TOP} L ${ductX - dd / 2} ${OUT_TOP - 18} L ${ductX + dd / 2} ${OUT_TOP - 18} L ${outR} ${OUT_TOP} Z`} {...PAINT.body} />
      {/* volute, impeller ring, hub, inlet cone */}
      <Volute cx={FX} cy={FY} r={FR} outH={FY - FR - OUT_TOP} dir={1} rotor={false} />
      <circle cx={FX} cy={FY} r={FR * 0.6} fill="none" stroke={MX.edge} strokeWidth={1.6} />
      <circle cx={FX} cy={FY} r={FR * 0.22} {...PAINT.raised} />
      <path
        d={`M ${X(722)} ${Y(672)} L ${X(758)} ${Y(642)} L ${X(772)} ${Y(664)} L ${X(736)} ${Y(694)} Z`}
        {...PAINT.raised}
      />
      <line x1={X(731)} y1={Y(665)} x2={X(763)} y2={Y(651)} stroke={MX.fine} strokeWidth={1} />
      <line x1={X(737)} y1={Y(676)} x2={X(768)} y2={Y(661)} stroke={MX.fine} strokeWidth={1} />
      {/* shaft: hub → NDE → DE → coupling */}
      <rect x={FX} y={FY - 4.5} width={X(1180) - FX} height={9} rx={2} {...PAINT.shaft} />
      <circle cx={FX} cy={FY} r={FR * 0.09} {...PAINT.shaft} />
      <PedestalBearing x={X(1034)} y={FY} w={34} base={Y(752)} />
      <PedestalBearing x={X(1133)} y={FY} w={34} base={Y(752)} />
      <Coupling x={X(1172)} y={FY - 11} w={X(1207) - X(1172)} h={22} />
      {/* VFD motor (shaft toward the fan) on its feet, encoder on the NDE */}
      <rect x={X(1235)} y={Y(740)} width={12} height={Y(752) - Y(740)} {...PAINT.body} />
      <rect x={X(1378)} y={Y(740)} width={12} height={Y(752) - Y(740)} {...PAINT.body} />
      <MirrorX about={(X(1218) + X(1410)) / 2}>
        <Motor x={X(1218)} y={Y(640)} w={X(1410) - X(1218)} h={Y(742) - Y(640)} />
      </MirrorX>
      <rect x={X(1418)} y={FY - 3} width={X(1442) - X(1418)} height={6} {...PAINT.shaft} />
      <EncoderCap x={X(1440)} cy={FY} w={X(1480) - X(1440)} h={Y(735) - Y(648)} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <Cyclone1 />
      <ExitGas />
      <IdFan />
      <MachineLabel x={X(460)} y={Y(254)} size={7.5}>
        PREHEATER EXIT GAS DUCT
      </MachineLabel>
      <MachineLabel x={X(1177)} y={Y(170)} anchor="start" size={7.5}>
        TO GCT / RAW MILL / STACK →
      </MachineLabel>
      <MachineLabel x={X(275)} y={Y(745)}>C1 CYCLONE (TOP STAGE)</MachineLabel>
      <MachineLabel x={FX} y={Y(918)}>ID FAN</MachineLabel>
      <MachineLabel x={X(1340)} y={Y(918)}>ID FAN MOTOR (VFD)</MachineLabel>
    </g>
  );
}

/** Callout boxes as on PDF page 3, next to their feature: top-left corner and width (drawing units). */
const callouts: Record<string, SheetCalloutAnchor> = {
  "GAS-PHC-01": [122.9, -21.2, 120.2],
  "GAS-PHC-02": [272.6, 92.8, 120.2],
  "POS-PHC-01": [378, 146, 109.3],
  "VIB-PHC-02": [290, 552, 86.8],
  "TMP-PHC-10": [448, 552, 118],
  "VIB-PHC-01": [776, 552, 112],
  "TMP-PHC-09": [640, 552, 118],
  "ELE-PHC-01": [711.3, 222.3, 107.9],
  "SPD-PHC-01": [740.1, 140.3, 91.4],
};

export const sheet: PyroSheetDrawing = {
  sheet: "D03",
  width: W,
  height: H,
  Art,
  callouts,
  pads: {
    // preheater exit gas analysis
    "GAS-PHC-01": P(488, 205),
    "GAS-PHC-02": P(530, 205),
    // ID fan inlet damper
    "POS-PHC-01": P(682, 400),
    // ID fan bearings (NDE, DE)
    "VIB-PHC-02": P(1034, 670),
    "TMP-PHC-10": P(1034, 716),
    "VIB-PHC-01": P(1133, 670),
    "TMP-PHC-09": P(1133, 716),
    // ID fan motor
    "ELE-PHC-01": [(X(1218) + X(1410)) / 2, Y(640) - (Y(742) - Y(640)) * 0.12],
    "SPD-PHC-01": [X(1460), Y(682)],
  },
};
