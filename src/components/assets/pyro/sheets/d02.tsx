/**
 * Sheet D02 — PHC-01 · Six-stage preheater tower (no calciner firing).
 *
 * Composition of PDF page 2: two staggered cyclone columns inside a steel
 * structure with grating platforms — C2 / C4 / C6 on the left, C1 / C3 / C5
 * on the right. Gas rises kiln inlet → riser → C6 → C5 → … → C1 → "TO ID
 * FAN", each stage's outlet duct climbing to the tangential inlet of the
 * stage above; meal falls the other way, each cone dropping (brass) into the
 * duct that feeds the stage below, C6 to the kiln inlet. Raw meal enters the
 * C2 → C1 duct. Kiln inlet chamber (refractory) and kiln shell bottom right.
 */
import React from "react";
import { MX, MachineLabel, PAINT } from "../../machine-kit/machine-kit";
import { Cyclone, type CycloneGeom, Handrail, MealPipe, Pipe, Steel } from "../drawings/fkp-parts";
import type { PyroSheetDrawing, SheetCalloutAnchor } from "./sheet-types";
import { Brick, FlowTag, type Pt, sheetMap } from "./sa-parts";

const W = 870;
const H = 620;
const M = sheetMap(0.85, 326.5, 90, 0.6);
const { X, Y, P, PTS } = M;
const DD = 15; // stage duct diameter

/** Cyclone from its page geometry: centre x, cylinder top / bottom, cone outlet bottom, width. */
function cyc(cx: number, top: number, cylBot: number, coneBot: number, w: number, inlet: 1 | -1): CycloneGeom {
  const t = Y(top);
  const cb = Y(cylBot);
  return { cx: X(cx), top: t, w: w * M.k, cyl: cb - t, cone: Y(coneBot) - cb - 9, inlet };
}

const C1 = cyc(858, 160, 265, 380, 135, -1);
const C2 = cyc(682, 297, 385, 487, 125, 1);
const C3 = cyc(880, 437, 525, 634, 125, -1);
const C4 = cyc(682, 580, 670, 772, 125, 1);
const C5 = cyc(880, 722, 815, 913, 125, -1);
const C6 = cyc(682, 865, 955, 1052, 125, 1);
const STAGES = [C1, C2, C3, C4, C5, C6];
const outlet = (c: CycloneGeom) => c.top + c.cyl + c.cone + 9;

/** Gas ducts (page coordinates): stage outlet up, across, up, into the next stage's inlet. */
const DUCTS: Pt[][] = [
  // C2 → C1
  [[682, 297], [682, 237], [775, 237], [775, 207], [792, 207]],
  // C3 → C2
  [[880, 437], [880, 403], [768, 403], [768, 330], [752, 330]],
  // C4 → C3
  [[682, 580], [682, 550], [795, 550], [795, 473], [812, 473]],
  // C5 → C4
  [[880, 722], [880, 690], [770, 690], [770, 615], [752, 615]],
  // C6 → C5
  [[682, 865], [682, 836], [800, 836], [800, 755], [812, 755]],
];

const DECKS = [272, 417, 560, 703, 846, 990];

function Structure() {
  const xl = X(602);
  const xr = X(968);
  return (
    <g>
      {[xl, xr].map((x) => (
        <g key={x}>
          <Steel x={x - 5} y={Y(132)} w={10} h={Y(1100) - Y(132)} />
          <rect x={x - 9} y={Y(1100) - 6} width={18} height={6} rx={1.5} {...PAINT.raised} />
        </g>
      ))}
      {DECKS.map((py) => (
        <g key={py}>
          <Handrail x1={xl + 5} x2={xr - 5} y={Y(py)} h={10} step={16} />
          <rect x={xl - 4} y={Y(py)} width={xr - xl + 8} height={5} rx={1.5} {...PAINT.body} />
        </g>
      ))}
      {/* diagonal knee braces between the columns and the cyclone supports */}
      {[
        [610, 280, 655, 297],
        [790, 345, 962, 412],
        [610, 565, 650, 580],
        [790, 630, 962, 698],
        [610, 850, 650, 865],
        [790, 915, 962, 985],
      ].map(([a, b, c, d], i) => (
        <line key={i} x1={X(a)} y1={Y(b)} x2={X(c)} y2={Y(d)} stroke={MX.fine} strokeWidth={2.2} strokeLinecap="round" />
      ))}
    </g>
  );
}

function KilnInlet() {
  const box = { x: X(970), y: Y(970), w: X(1133) - X(970), h: Y(1088) - Y(970) };
  return (
    <g>
      {/* kiln shell (inlet end), sloping down toward the burner */}
      <path d={`M ${X(1128)} ${Y(1000)} L ${X(1320)} ${Y(1030)} L ${X(1320)} ${Y(1092)} L ${X(1128)} ${Y(1086)} Z`} {...PAINT.cylinder} />
      <rect x={X(1320) - 3} y={Y(1028)} width={6} height={Y(1094) - Y(1028)} rx={2} {...PAINT.raised} />
      {/* inlet seal ring */}
      <rect x={X(1133)} y={Y(992)} width={9} height={Y(1092) - Y(992)} rx={2.5} {...PAINT.raised} />
      {/* inlet chamber with refractory lining */}
      <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={6} {...PAINT.body} />
      <Brick x={box.x + 7} y={box.y + 7} w={box.w - 14} h={box.h - 14} row={6} course={13} />
      <rect x={box.x + 30} y={box.y + box.h / 2 - 8} width={box.w - 60} height={14} rx={2} fill={MX.deep} opacity={0.85} />
      <MachineLabel x={box.x + box.w / 2} y={box.y + box.h / 2 + 2.5} size={7.5} tone="ink">
        KILN INLET
      </MachineLabel>
    </g>
  );
}

function Art() {
  return (
    <g>
      <Structure />
      {/* exit gas: C1 outlet → TO ID FAN */}
      <Pipe pts={PTS([[858, 160], [858, 118], [1110, 118]])} d={17} flanges={[P(990, 118)]} />
      {/* stage gas ducts */}
      {DUCTS.map((d, i) => (
        <Pipe key={i} pts={PTS(d)} d={DD} />
      ))}
      {/* riser duct: kiln inlet → C6 */}
      <Pipe pts={PTS([[1058, 972], [1058, 952], [765, 952], [765, 895], [752, 895]])} d={18} />
      <KilnInlet />
      {/* cyclones */}
      {STAGES.map((c, i) => (
        <Cyclone key={i} c={c} label={`C${i + 1}`} />
      ))}
      {/* meal: each cone into the duct feeding the stage below; C6 to the kiln inlet */}
      <MealPipe pts={[[C1.cx, outlet(C1)], [C1.cx, Y(403) - DD / 2]]} d={6} />
      <MealPipe pts={[[C2.cx, outlet(C2)], [C2.cx, Y(550) - DD / 2]]} d={6} />
      <MealPipe pts={[[C3.cx, outlet(C3)], [C3.cx, Y(690) - DD / 2]]} d={6} />
      <MealPipe pts={[[C4.cx, outlet(C4)], [C4.cx, Y(836) - DD / 2]]} d={6} />
      <MealPipe pts={[[C5.cx, outlet(C5)], [C5.cx, Y(952) - 9]]} d={6} />
      <MealPipe pts={[[C6.cx, outlet(C6)], P(682, 1090), [X(972), Y(1090)]]} d={7} />
      {/* raw meal feed into the C2 → C1 duct */}
      <MealPipe pts={[P(485, 193), P(735, 193), [X(735), Y(237) - DD / 2]]} d={7} />
      <rect x={X(485) - 4} y={Y(193) - 6} width={5} height={12} rx={1.5} {...PAINT.raised} />
      <FlowTag x1={X(365)} y1={Y(206)} x2={X(465)} y2={Y(206)} label="RAW MEAL FEED" lx={X(413)} ly={Y(184)} />
      <MachineLabel x={X(1118)} y={Y(121)} anchor="start" size={7.5}>
        TO ID FAN →
      </MachineLabel>
      <MachineLabel x={X(1230)} y={Y(1104)} size={7.5}>
        ROTARY KILN →
      </MachineLabel>
    </g>
  );
}

/** Callout boxes as on PDF page 2, next to their feature: top-left corner and width (drawing units). */
const callouts: Record<string, SheetCalloutAnchor> = {
  "TMP-PHC-01": [726, 30, 164],
  "PRS-PHC-01": [726, -8, 164],
  "TMP-PHC-02": [-20, 87, 170],
  "PRS-PHC-02": [-20, 128, 170],
  "TMP-PHC-03": [720, 182, 170],
  "PRS-PHC-03": [720, 220, 170],
  "TMP-PHC-04": [-20, 260, 170],
  "PRS-PHC-04": [-20, 300, 170],
  "PRS-PHC-07": [-20, 371, 170],
  "TMP-PHC-05": [720, 352, 170],
  "PRS-PHC-05": [720, 390, 170],
  "PRS-PHC-08": [720, 450, 170],
  "TMP-PHC-06": [-20, 432, 170],
  "PRS-PHC-06": [-20, 486, 170],
  "PRS-PHC-09": [-20, 539, 170],
  "TMP-PHC-08": [720, 490, 170],
  "TMP-PHC-07": [540, 612, 160],
};

export const sheet: PyroSheetDrawing = {
  sheet: "D02",
  width: W,
  height: H,
  Art,
  callouts,
  pads: {
    // C1 / preheater exit
    "TMP-PHC-01": [C1.cx, (Y(118) + 8.5 + C1.top - 3) / 2],
    // top gas duct pressure tap (D4 location), on the exit duct as in the PHC drawing
    "PRS-PHC-01": P(930, 118),
    // C2 / C3
    "TMP-PHC-02": P(682, 262),
    "PRS-PHC-02": P(621, 330),
    "TMP-PHC-03": P(880, 420),
    "PRS-PHC-03": P(940, 473),
    // C4 / C5
    "TMP-PHC-04": P(682, 550),
    "PRS-PHC-04": P(621, 616),
    "PRS-PHC-07": P(664, 735),
    "TMP-PHC-05": P(880, 703),
    "PRS-PHC-05": P(940, 759),
    "PRS-PHC-08": P(897, 878),
    // C6 / riser / kiln inlet
    "TMP-PHC-06": P(682, 836),
    // lowest stage / riser static tap (D4 location): riser duct at the C6 inlet, as in the PHC drawing
    "PRS-PHC-06": P(765, 926),
    "PRS-PHC-09": P(664, 1015),
    "TMP-PHC-08": P(1058, 966),
    "TMP-PHC-07": P(945, 1090),
  },
};
