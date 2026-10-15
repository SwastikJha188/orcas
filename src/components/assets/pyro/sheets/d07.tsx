/**
 * D07 — KLN-01 kiln shell, inlet and outlet.
 *
 * Composition of PDF page 7: at left the riser to C6 / preheater over the
 * refractory-lined kiln inlet chamber, with the gas-sample probe at the inlet
 * seal and the analyser cabinet above; the shell on three roller stations with
 * the girth gear; the stand-off shell scanner beneath the shell and the
 * handheld scan point; at the outlet the cooling shroud (cow shell) with the
 * sector plates fed by the outlet cooling fan, the outlet seal, and the kiln
 * hood with the burning-zone pyrometer on its roof and the burner pipe.
 */
import React from "react";
import { Bolt, CornerBolts, MX, MachineLabel, PAINT } from "../../machine-kit/machine-kit";
import { Pipe } from "../drawings/clk-parts";
import type { PyroSheetDrawing, SheetCalloutAnchor } from "./sheet-types";
import { GearEdge, Plinth, Refractory, RollerEnd, Shell, SideMotor, TyreBand, pdfMap } from "./sb-parts";

const { X, Y, L, P, B, R } = pdfMap(62, 128, 0.575);
const W = 895;
const H = 560;

const SHELL_TOP = 517;
const SHELL_BOT = 705;
const TYRES = [418, 836, 1166];
/** Gas-sample probe at the inlet seal and the sample line up to the analyser (page px). */
const PROBE: [number, number] = [249, 516];
const SAMPLE_BEND: [number, number] = [352, 440];

function Inlet() {
  const ch = B(67, 474, 252, 759);
  return (
    <g>
      {/* riser to C6 / preheater */}
      <rect {...B(126, 160, 204, 478)} rx={3} {...PAINT.cylinderV} />
      {[200, 300, 400].map((y) => (
        <line key={y} x1={X(126)} x2={X(204)} y1={Y(y)} y2={Y(y)} {...PAINT.hair} />
      ))}
      {/* inlet chamber, refractory lined */}
      <rect {...B(78, 759, 92, 790)} rx={2} {...PAINT.body} />
      <rect {...B(228, 759, 242, 790)} rx={2} {...PAINT.body} />
      <rect {...ch} rx={10} {...PAINT.body} />
      <Refractory {...R(80, 487, 240, 746)} course={7} brick={14} />
      <CornerBolts x={ch.x} y={ch.y} w={ch.width} h={ch.height} inset={8} />
      {/* inlet seal */}
      <rect {...B(244, 505, 264, 716)} rx={3} {...PAINT.raised} />
      {/* gas-sample probe into the inlet seal */}
      <rect {...B(238, 507, 262, 525)} rx={3} {...PAINT.raised} />
      <rect {...B(222, 512, 240, 520)} {...PAINT.shaft} />
      <path
        d={`M ${X(PROBE[0])} ${Y(PROBE[1])} L ${X(SAMPLE_BEND[0])} ${Y(SAMPLE_BEND[1])} L ${X(SAMPLE_BEND[0])} ${Y(320)}`}
        fill="none"
        stroke={MX.label}
        strokeWidth={1.3}
        strokeDasharray="2.5 2.5"
      />
      {/* analyser cabinet */}
      <rect {...B(287, 221, 417, 319)} rx={7} {...PAINT.body} />
      <rect {...B(293, 227, 411, 313)} rx={4} fill="none" stroke={MX.fine} strokeWidth={1} />
      <rect {...B(303, 286, 343, 306)} rx={2} {...PAINT.recess} />
      <rect {...B(350, 286, 398, 306)} rx={2} {...PAINT.recess} />
      <Bolt x={X(300)} y={Y(234)} r={1.4} />
      <Bolt x={X(404)} y={Y(234)} r={1.4} />
    </g>
  );
}

function ShellAndStations() {
  return (
    <g>
      {[0, 1, 2].map((i) => {
        const cx = [418, 836, 1166][i];
        return (
          <g key={cx}>
            <rect {...B(cx - 66, 785, cx + 66, 830)} rx={3} {...PAINT.body} />
            <Bolt x={X(cx - 56)} y={Y(820)} r={1.7} />
            <Bolt x={X(cx + 56)} y={Y(820)} r={1.7} />
            <Plinth {...R(cx - 77, 766, cx + 77, 786)} bolts={2} />
            <RollerEnd cx={X(cx - 38)} cy={Y(739)} r={L(28)} />
            <RollerEnd cx={X(cx + 38)} cy={Y(739)} r={L(28)} />
          </g>
        );
      })}
      <Shell {...R(252, SHELL_TOP, 1296, SHELL_BOT)} seam={L(88)} />
      {/* burning zone toward the outlet */}
      <rect {...B(1192, 528, 1294, 694)} rx={6} fill={MX.heat} opacity={0.75} />
      <GearEdge {...R(570, 498, 607, 724)} n={22} />
      {TYRES.map((cx) => (
        <TyreBand key={cx} cx={X(cx)} y={Y(506)} w={L(48)} h={L(210)} />
      ))}
    </g>
  );
}

function Scanner() {
  const head: [number, number] = [708, 878];
  return (
    <g>
      {[330, 612, 945, 1105].map((tx) => (
        <line key={tx} x1={X(head[0])} y1={Y(head[1])} x2={X(tx)} y2={Y(SHELL_BOT + 2)} {...PAINT.hair} strokeDasharray="3 4" opacity={0.9} />
      ))}
      <rect {...B(702, 910, 714, 1060)} {...PAINT.shaft} />
      <rect {...B(660, 1057, 757, 1069)} rx={2} {...PAINT.body} />
      <rect {...B(674, 869, 743, 913)} rx={6} {...PAINT.body} />
      <rect {...B(694, 862, 722, 872)} rx={2} {...PAINT.recess} />
    </g>
  );
}

function Handheld() {
  return (
    <g aria-hidden="true">
      {/* handheld pyrometer gun pointed at the shell */}
      <path d={`M ${X(944)} ${Y(846)} L ${X(962)} ${Y(846)} L ${X(956)} ${Y(876)} L ${X(940)} ${Y(876)} Z`} {...PAINT.body} />
      <rect {...B(926, 828, 990, 849)} rx={L(9)} {...PAINT.raised} />
      <rect {...B(988, 831, 996, 846)} rx={2} {...PAINT.recess} />
    </g>
  );
}

function Outlet() {
  return (
    <g>
      {/* outlet cooling fan, duct up to the sector plates */}
      <Pipe pts={[P(1155, 925), P(1155, 862), P(1233, 862), P(1233, 738)]} w={L(20)} />
      <rect {...B(1040, 980, 1116, 996)} rx={2} {...PAINT.body} />
      <SideMotor {...R(1050, 932, 1108, 980)} />
      <rect {...B(1108, 950, 1122, 960)} {...PAINT.shaft} />
      <circle cx={X(1155)} cy={Y(957)} r={L(36)} {...PAINT.body} />
      <circle cx={X(1155)} cy={Y(957)} r={L(26)} {...PAINT.recess} />
      {[0, 60, 120].map((a) => (
        <line
          key={a}
          x1={X(1155) - L(24) * Math.cos((a * Math.PI) / 180)}
          y1={Y(957) - L(24) * Math.sin((a * Math.PI) / 180)}
          x2={X(1155) + L(24) * Math.cos((a * Math.PI) / 180)}
          y2={Y(957) + L(24) * Math.sin((a * Math.PI) / 180)}
          stroke={MX.edge}
          strokeWidth={1.6}
        />
      ))}
      <circle cx={X(1155)} cy={Y(957)} r={3} {...PAINT.shaft} />

      {/* cooling shroud (cow shell) with sector plates */}
      <rect {...B(1197, 483, 1328, 737)} rx={10} fill="none" stroke={MX.label} strokeWidth={1.2} strokeDasharray="6 4" />
      {/* outlet seal */}
      <Refractory {...R(1294, 502, 1318, 719)} course={6} brick={12} />

      {/* kiln hood with refractory lining, burner pipe, pyrometer */}
      <rect {...B(1330, 331, 1549, 902)} rx={12} {...PAINT.body} />
      <rect {...B(1337, 338, 1542, 895)} rx={8} fill="none" stroke={MX.fine} strokeWidth={1} />
      <Refractory {...R(1331, 350, 1354, 881)} course={6} brick={12} />
      <CornerBolts {...R(1330, 331, 1549, 902)} inset={10} />
      <rect {...B(1430, 595, 1617, 618)} rx={3} {...PAINT.shaft} />
      <rect {...B(1585, 588, 1600, 625)} rx={2} {...PAINT.raised} />
      <line x1={X(1485)} y1={Y(329)} x2={X(1300)} y2={Y(610)} stroke={MX.label} strokeWidth={1} strokeDasharray="3 4" />
      <rect {...B(1464, 297, 1507, 331)} rx={4} {...PAINT.raised} />
      <rect {...B(1472, 306, 1486, 322)} rx={2} {...PAINT.recess} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <Scanner />
      <ShellAndStations />
      <Outlet />
      <Inlet />
      <Handheld />

      <MachineLabel x={X(69)} y={Y(148)} anchor="start" size={7.5}>RISER → C6 / PREHEATER</MachineLabel>
      <MachineLabel x={X(160)} y={Y(785)} size={7.5}>KILN INLET</MachineLabel>
      <MachineLabel x={X(352)} y={Y(272)} size={6.5}>ANALYSER</MachineLabel>
      <MachineLabel x={X(1165)} y={Y(470)} anchor="end" size={6.5}>COW SHELL (COOLING SHROUD) →</MachineLabel>
      <MachineLabel x={X(1262)} y={Y(476)} size={6}>SECTOR PLATES</MachineLabel>
      <MachineLabel x={X(1485)} y={Y(286)} size={6.5}>PYROMETER</MachineLabel>
      <MachineLabel x={X(1490)} y={Y(580)} size={6.5}>BURNER</MachineLabel>
      <MachineLabel x={X(1440)} y={Y(925)} size={7.5}>KILN HOOD</MachineLabel>
      <MachineLabel x={X(1100)} y={Y(1018)} size={6.5}>OUTLET COOLING FAN</MachineLabel>
      <MachineLabel x={X(955)} y={Y(892)} size={6.5}>HANDHELD</MachineLabel>
      <MachineLabel x={X(708)} y={Y(1090)} size={7}>SHELL SCANNER (STAND-OFF)</MachineLabel>
    </g>
  );
}

/** Callout boxes as on PDF page 7, next to their feature: top-left corner and width (drawing units). */
const callouts: Record<string, SheetCalloutAnchor> = {
  "TMP-KLN-13": [-9.4, 19.9, 91.7],
  "PRS-KLN-01": [-10.7, 406.2, 102.8],
  "GAS-KLN-01": [230, 148, 86.4],
  "GAS-KLN-02": [230, 100, 87.6],
  "GAS-KLN-03": [230, 52, 91.7],
  "STS-KLN-06": [130, -8, 98],
  "STS-KLN-08": [153.1, 454.9, 94.6],
  "MAN-KLN-01": [531.8, 529, 120.5],
  "TMP-KLN-26": [520.9, 134.8, 117.7],
  "TMP-KLN-25": [356.8, 146.1, 113.9],
  "TMP-KLN-14": [718, 10, 138],
  "TMP-KLN-27": [600, 9, 90],
  "PRS-KLN-03": [754.9, 485.4, 87.6],
};

export const sheet: PyroSheetDrawing = {
  sheet: "D07",
  width: W,
  height: H,
  Art,
  callouts,
  pads: {
    // inlet
    "TMP-KLN-13": P(132, 572),
    "PRS-KLN-01": P(198, 704),
    // the three analyser inputs share the inlet sample probe: a 3-pad cluster at the probe, as the page draws it
    "GAS-KLN-01": P(...PROBE),
    "GAS-KLN-02": [X(PROBE[0]) - 9, Y(PROBE[1])],
    "GAS-KLN-03": [X(PROBE[0]) - 18, Y(PROBE[1])],
    "STS-KLN-06": P(418, 270),
    // shell
    "STS-KLN-08": P(708, 878),
    "MAN-KLN-01": P(954, 838),
    // outlet
    "TMP-KLN-26": P(1210, 518),
    "TMP-KLN-25": P(1233, 792),
    "TMP-KLN-14": P(1485, 314),
    "TMP-KLN-27": P(1425, 348),
    "PRS-KLN-03": P(1529, 398),
  },
};
