/**
 * D04 — KLN-01 rotary kiln main drive, gearbox lubrication and auxiliary drive.
 *
 * Composition of PDF page 4: VFD main motor (left) → coupling → main gearbox →
 * coupling → pinion between its bearings under the girth gear, with the kiln
 * shell at top right. Below the gearbox the gearbox lubrication skid (oil tank,
 * cooler, duty / standby pumps, filter, sample port) with its return and supply
 * lines; at bottom right the auxiliary drive (motor, brake, clutch) linked to
 * the main drive train.
 */
import React from "react";
import { Bolt, CornerBolts, Fan, MX, MachineLabel, PAINT } from "../../machine-kit/machine-kit";
import type { PyroSheetDrawing, SheetCalloutAnchor } from "./sheet-types";
import { GearEdge, Link, OilLine, Pillow, Plinth, Shell, ShaftCoupling, SideMotor, ToothedDrum, pdfMap } from "./sb-parts";


const { X, Y, L, P, B, R } = pdfMap(80, 85, 0.578);
const W = 884;
const H = 588;

function MainMotor() {
  const b = B(150, 485, 410, 630);
  return (
    <g>
      <rect {...B(127, 622, 438, 640)} rx={2} {...PAINT.raised} />
      <Plinth {...R(88, 640, 485, 670)} bolts={4} />
      <SideMotor x={b.x} y={b.y} w={b.width} h={b.height} />
      {/* NDE encoder on the shaft extension */}
      <rect {...B(92, 545, 104, 566)} rx={2} {...PAINT.raised} />
      {/* shaft to the gearbox */}
      <rect {...B(445, 543, 585, 567)} rx={3} {...PAINT.shaft} />
      <ShaftCoupling {...R(510, 528, 552, 582)} />
    </g>
  );
}

function MainGearbox() {
  const body = B(583, 440, 890, 660);
  const ribs: number[] = [];
  for (let x = 640; x < 880; x += 35) ribs.push(x);
  return (
    <g>
      <Plinth {...R(572, 668, 912, 700)} bolts={5} />
      <rect {...B(588, 658, 900, 670)} rx={2} {...PAINT.raised} />
      <rect {...B(608, 413, 866, 446)} rx={6} {...PAINT.raised} />
      <rect {...body} rx={10} {...PAINT.body} />
      {ribs.map((x) => (
        <line key={x} x1={X(x)} x2={X(x)} y1={Y(452)} y2={Y(650)} stroke={MX.fine} strokeWidth={1.4} />
      ))}
      {Array.from({ length: 10 }).map((_, i) => (
        <g key={i}>
          <Bolt x={X(598 + i * 31)} y={Y(451)} r={1.5} />
          <Bolt x={X(598 + i * 31)} y={Y(650)} r={1.5} />
        </g>
      ))}
      {/* bearing covers: input (large) and output (small) shafts */}
      <circle cx={X(676)} cy={Y(562)} r={L(57)} {...PAINT.raised} />
      <circle cx={X(676)} cy={Y(562)} r={L(44)} fill="none" stroke={MX.fine} strokeWidth={1} />
      <circle cx={X(676)} cy={Y(562)} r={L(21)} {...PAINT.recess} />
      <circle cx={X(793)} cy={Y(568)} r={L(40)} {...PAINT.raised} />
      <circle cx={X(793)} cy={Y(568)} r={L(30)} fill="none" stroke={MX.fine} strokeWidth={1} />
      <circle cx={X(793)} cy={Y(568)} r={L(14)} {...PAINT.recess} />
      {/* breather */}
      <rect {...B(728, 400, 746, 414)} rx={2} {...PAINT.body} />
    </g>
  );
}

function PinionAndGirth() {
  return (
    <g>
      {/* kiln shell and girth gear (edge-on) */}
      <Shell {...R(1316, 165, 1608, 450)} seam={L(30)} />
      <rect {...B(1300, 150, 1322, 465)} rx={3} {...PAINT.body} />
      <GearEdge {...R(1264, 118, 1314, 497)} n={30} />
      {/* output shaft, coupling, pinion between its bearings */}
      <rect {...B(890, 543, 1180, 567)} rx={3} {...PAINT.shaft} />
      <ShaftCoupling {...R(986, 528, 1028, 582)} />
      <rect {...B(1162, 627, 1410, 639)} rx={2} {...PAINT.raised} />
      <Plinth {...R(1155, 639, 1418, 667)} bolts={4} />
      <rect {...B(1228, 541, 1352, 569)} rx={3} {...PAINT.shaft} />
      <ToothedDrum {...R(1230, 517, 1350, 597)} n={13} />
      <Pillow {...R(1178, 498, 1228, 627)} />
      <Pillow {...R(1352, 498, 1400, 627)} />
    </g>
  );
}

function LubeSkid() {
  const skid = B(573, 848, 922, 1035);
  return (
    <g>
      {/* return from the gearbox sump to the tank, supply from the filter to the gearbox */}
      <OilLine pts={[P(682, 668), P(660, 728), P(660, 850)]} />
      <OilLine pts={[P(898, 925), P(948, 925), P(948, 760), P(848, 760), P(848, 668)]} />

      <rect {...skid} rx={10} {...PAINT.body} />
      <rect x={skid.x + 5} y={skid.y + 5} width={skid.width - 10} height={skid.height - 10} rx={6} fill="none" stroke={MX.fine} strokeWidth={1} />
      <CornerBolts x={skid.x} y={skid.y} w={skid.width} h={skid.height} inset={9} />
      {/* oil tank with sight window */}
      <rect {...B(595, 890, 726, 1012)} rx={5} {...PAINT.recess} />
      <rect {...B(600, 912, 721, 1007)} rx={3} {...PAINT.material} opacity={0.9} />
      <line x1={X(600)} x2={X(721)} y1={Y(912)} y2={Y(912)} stroke={MX.edge} strokeWidth={1} strokeDasharray="3 2" />
      {/* sample port on the tank drain */}
      <rect {...B(586, 1012, 600, 1024)} rx={1.5} {...PAINT.shaft} />
      {/* cooler */}
      <rect {...B(764, 878, 838, 927)} rx={5} {...PAINT.raised} />
      {Array.from({ length: 8 }).map((_, i) => (
        <line key={i} x1={X(774 + i * 8)} x2={X(774 + i * 8)} y1={Y(886)} y2={Y(919)} {...PAINT.hair} />
      ))}
      {/* duty / standby pumps */}
      <Fan cx={X(771)} cy={Y(982)} r={L(25)} />
      <Fan cx={X(827)} cy={Y(982)} r={L(20)} />
      {/* duplex filter */}
      <rect {...B(856, 880, 904, 892)} rx={2} {...PAINT.raised} />
      <rect {...B(860, 890, 900, 965)} rx={7} {...PAINT.cylinderV} />
      <line x1={X(860)} x2={X(900)} y1={Y(930)} y2={Y(930)} {...PAINT.detail} />
    </g>
  );
}

function AuxDrive() {
  const m = B(1135, 930, 1245, 1012);
  return (
    <g>
      {/* mechanical link to the main drive train */}
      <Link pts={[P(903, 700), P(903, 803), P(1438, 803), P(1438, 940)]} />
      <rect {...B(1192, 1010, 1470, 1020)} rx={2} {...PAINT.raised} />
      <Plinth {...R(1185, 1020, 1475, 1050)} bolts={4} />
      <SideMotor x={m.x} y={m.y} w={m.width} h={m.height} />
      <rect {...B(1258, 963, 1280, 980)} rx={2} {...PAINT.shaft} />
      {/* brake drum with caliper */}
      <rect {...B(1278, 946, 1342, 1003)} rx={5} {...PAINT.raised} />
      <rect {...B(1290, 954, 1330, 995)} rx={3} {...PAINT.recess} />
      <rect {...B(1300, 940, 1320, 950)} rx={1.5} {...PAINT.body} />
      {/* clutch */}
      <rect {...B(1348, 946, 1404, 1003)} rx={5} {...PAINT.body} />
      {[1362, 1376, 1390].map((x) => (
        <line key={x} x1={X(x)} x2={X(x)} y1={Y(952)} y2={Y(997)} {...PAINT.detail} />
      ))}
      {/* output reducer to the main drive */}
      <rect {...B(1410, 938, 1470, 1008)} rx={6} {...PAINT.body} />
      <Bolt x={X(1420)} y={Y(948)} r={1.5} />
      <Bolt x={X(1460)} y={Y(998)} r={1.5} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <AuxDrive />
      <LubeSkid />
      <MainMotor />
      <MainGearbox />
      <PinionAndGirth />

      <MachineLabel x={X(1288)} y={Y(108)} size={7.5}>GIRTH GEAR</MachineLabel>
      <MachineLabel x={X(1462)} y={Y(152)} size={7.5}>KILN SHELL</MachineLabel>
      <MachineLabel x={X(285)} y={Y(705)} size={7.5}>MAIN MOTOR (VFD)</MachineLabel>
      <MachineLabel x={X(736)} y={Y(728)} size={7.5}>MAIN GEARBOX</MachineLabel>
      <MachineLabel x={X(1288)} y={Y(694)} size={7.5}>PINION &amp; BEARINGS</MachineLabel>
      <MachineLabel x={X(748)} y={Y(1062)} size={7.5}>GEARBOX LUBRICATION SKID</MachineLabel>
      <MachineLabel x={X(1330)} y={Y(1078)} size={7.5}>AUXILIARY DRIVE / BRAKE</MachineLabel>
      <MachineLabel x={X(660)} y={Y(882)} size={6}>OIL TANK</MachineLabel>
      <MachineLabel x={X(801)} y={Y(870)} size={6}>COOLER</MachineLabel>
      <MachineLabel x={X(880)} y={Y(872)} size={6}>FILTER</MachineLabel>
      <MachineLabel x={X(1310)} y={Y(930)} size={6}>BRAKE</MachineLabel>
      <MachineLabel x={X(1376)} y={Y(930)} size={6}>CLUTCH</MachineLabel>
    </g>
  );
}

/** Callout boxes as on PDF page 4, next to their feature: top-left corner and width (drawing units). */
const callouts: Record<string, SheetCalloutAnchor> = {
  "TMP-KLN-21": [-25, 10, 100],
  "ELE-KLN-01": [85, 10, 110],
  "TMP-KLN-20": [-25, 72, 100],
  "SPD-KLN-01": [-25, 385, 100],
  "TMP-KLN-19": [150, 385, 110],
  "VIB-KLN-01": [205, 140, 88],
  "TMP-KLN-22": [190, 72, 104],
  "VIB-KLN-02": [262, 10, 100],
  "VIB-KLN-03": [380, 10, 100],
  "TMP-KLN-23": [446, 72, 108],
  "VIB-KLN-04": [566, 72, 94],
  "TMP-KLN-15": [170, 448, 112],
  "LEV-KLN-01": [170, 505, 112],
  "LAB-KLN-01": [150, 568, 150],
  "PRS-KLN-04": [513.1, 368.6, 79],
  "FLO-KLN-05": [512.9, 439.2, 79],
  "PRS-KLN-05": [513.3, 529.9, 130.5],
  "STS-KLN-11": [692.2, 385.4, 98.2],
  "LIM-KLN-01": [781, 562.6, 88.6],
};

export const sheet: PyroSheetDrawing = {
  sheet: "D04",
  width: W,
  height: H,
  Art,
  callouts,
  pads: {
    // main motor
    "TMP-KLN-21": P(264, 556),
    "ELE-KLN-01": P(278, 470),
    "TMP-KLN-20": P(123, 535),
    "SPD-KLN-01": P(98, 590),
    "TMP-KLN-19": P(430, 590),
    "VIB-KLN-01": P(430, 524),
    // main gearbox
    "TMP-KLN-22": P(616, 473),
    "VIB-KLN-02": P(664, 430),
    "VIB-KLN-03": P(832, 430),
    "TMP-KLN-23": P(869, 473),
    // pinion
    "VIB-KLN-04": P(1203, 520),
    // lubrication skid
    "TMP-KLN-15": P(640, 940),
    "LEV-KLN-01": P(640, 990),
    "LAB-KLN-01": P(593, 1018),
    "PRS-KLN-04": P(948, 790),
    "FLO-KLN-05": P(948, 868),
    "PRS-KLN-05": P(880, 948),
    // auxiliary drive
    "STS-KLN-11": P(1190, 925),
    "LIM-KLN-01": P(1310, 975),
  },
};
