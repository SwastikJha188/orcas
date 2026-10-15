/**
 * Sheet D08 — BRN-01 · Main kiln burner, combustion air & coal firing (single burner).
 *
 * Composition of PDF page 8: kiln hot end with the flame (left), the kiln
 * outlet hood with refractory, roof flame camera and secondary air rising
 * from the clinker cooler below; the multi-channel burner lance on its
 * carriage to the burner manifold (swirl / axial air taps); primary-air header
 * down to the primary-air fan (bottom centre); the fine-coal bin with roof
 * radar, wall thermometer and CO analyser (top right), kiln coal feeder, coal
 * conveying line back to the burner, and the coal conveying blower (bottom
 * right).
 */
import React from "react";
import { Bolt, Coupling, CornerBolts, Fan, Housing, MX, MachineLabel, Motor, PAINT } from "../../machine-kit/machine-kit";
import { FanSet, Flange, FlowArrow, Pipe, Silo, Transmitter, fanGeom, type FanSpec } from "../drawings/clk-parts";
import type { PyroSheetDrawing, SheetCalloutAnchor } from "./sheet-types";
import { Plinth, Radar, sheetMap } from "./sa-parts";

const W = 880;
const H = 570;
const { X, Y, P, PTS, R, B } = sheetMap(0.563, 38, 105);

const LANCE_Y = Y(458);

/* ---------------------------------------------------------------- kiln, hood, cooler */
function KilnAndHood() {
  const hood = B(408, 220, 615, 725);
  return (
    <g>
      {/* kiln hot end, cut away to show the flame */}
      <rect {...R(45, 330, 368, 585)} rx={6} {...PAINT.cylinder} />
      <rect {...R(58, 346, 366, 569)} rx={4} {...PAINT.recess} />
      <path d={`M ${X(60)} ${Y(552)} Q ${X(200)} ${Y(530)} ${X(364)} ${Y(540)} L ${X(364)} ${Y(567)} L ${X(60)} ${Y(567)} Z`} {...PAINT.material} opacity={0.7} />
      <ellipse cx={X(232)} cy={LANCE_Y} rx={X(390) - X(232)} ry={Y(540) - Y(458)} fill={MX.heat} />
      <ellipse cx={X(320)} cy={LANCE_Y} rx={X(370) - X(320) + 14} ry={9} fill={MX.material} opacity={0.5} />
      {[120, 200, 280].map((px) => (
        <line key={px} x1={X(px)} x2={X(px)} y1={Y(332)} y2={Y(344)} stroke={MX.fine} strokeWidth={MX.wFine} />
      ))}
      {/* outlet seal / nose ring */}
      <rect {...R(366, 318, 392, 597)} rx={4} {...PAINT.cylinderV} />

      {/* kiln outlet hood with refractory lining on the kiln side */}
      <Housing x={hood.x} y={hood.y} w={hood.w} h={hood.h} rx={8} bolts={false} />
      <rect {...R(410, 240, 430, 705)} rx={1.5} {...PAINT.recess} />
      {Array.from({ length: Math.floor((Y(705) - Y(240)) / 6) }).map((_, i) => (
        <line key={i} x1={X(411)} x2={X(429)} y1={Y(240) + 6 * (i + 1)} y2={Y(240) + 6 * (i + 1)} stroke={MX.fine} strokeWidth={0.6} />
      ))}
      <Bolt x={hood.x + hood.w - 8} y={hood.y + 8} />
      <Bolt x={hood.x + hood.w - 8} y={hood.y + hood.h - 8} />
      {/* flame camera on the hood roof, sight line into the kiln */}
      <rect x={X(512) - 3} y={Y(198)} width={6} height={Y(222) - Y(198)} {...PAINT.shaft} />
      <rect {...R(485, 165, 540, 200)} rx={4} {...PAINT.raised} />
      <circle cx={X(498)} cy={Y(182)} r={4} {...PAINT.recess} />
      <line x1={X(512)} y1={Y(206)} x2={X(368)} y2={Y(438)} stroke={MX.fine} strokeWidth={1} strokeDasharray="3 3" />
      {/* secondary-air thermocouple port in the hood floor */}
      <rect x={X(522) - 2.5} y={Y(708)} width={5} height={Y(726) - Y(708)} {...PAINT.shaft} />

      {/* clinker cooler and secondary air rising into the hood */}
      <rect {...R(408, 773, 615, 835)} rx={6} {...PAINT.body} />
      <rect {...R(415, 780, 608, 828)} rx={4} fill="none" stroke={MX.fine} strokeWidth={1} />
      <MachineLabel x={X(511)} y={Y(808)} size={7.5}>
        CLINKER COOLER
      </MachineLabel>
      {[473, 550].map((px) => (
        <FlowArrow key={px} x1={X(px)} y1={Y(770)} x2={X(px)} y2={Y(733)} />
      ))}
    </g>
  );
}

/* ---------------------------------------------------------------- burner, carriage, manifold */
function Burner() {
  const m = B(948, 410, 1050, 505);
  return (
    <g>
      {/* carriage rail and carriage */}
      <rect {...R(615, 486, 836, 498)} rx={3} {...PAINT.raised} />
      {[638, 815].map((px) => (
        <g key={px}>
          <circle cx={X(px)} cy={Y(508)} r={5.5} {...PAINT.shaft} stroke={MX.edge} strokeWidth={1.2} />
          <circle cx={X(px)} cy={Y(508)} r={1.6} fill={MX.deep} />
        </g>
      ))}
      {/* multi-channel burner lance */}
      <rect x={X(440)} y={LANCE_Y - 6.5} width={m.x - X(440)} height={13} rx={4} {...PAINT.shaft} />
      <rect x={X(440) - 4} y={LANCE_Y - 8} width={8} height={16} rx={2.5} {...PAINT.raised} />
      <Flange x={X(930)} y={LANCE_Y} w={13} />
      {/* manifold with swirl / axial air test-port transmitters */}
      <Housing x={m.x} y={m.y} w={m.w} h={m.h} rx={8} panel={[12, 20, m.w - 24, 12]} />
      <Transmitter x={X(976)} y={m.y} dir="up" len={Y(410) - Y(392) - 4} />
      <Transmitter x={X(1017)} y={m.y} dir="up" len={Y(410) - Y(392) - 4} />
    </g>
  );
}

/* ---------------------------------------------------------------- primary-air fan */
const PA: FanSpec = { cx: X(705), cy: Y(925), r: 42, motorW: 70, motorH: 50, ductTop: Y(830), baseY: Y(1025) };
const pa = fanGeom(PA);

function PrimaryAir() {
  const duct = (pa.duct[0] + pa.duct[1]) / 2;
  return (
    <g>
      <Pipe pts={[...PTS([[998, 505], [998, 685]]), [duct, Y(685)], [duct, PA.ductTop + 2]]} w={15} />
      <Flange x={duct} y={PA.ductTop + 4} w={pa.duct[1] - pa.duct[0]} vertical />
      <Flange x={X(998)} y={Y(600)} w={15} vertical />
      <Plinth x={X(575)} y={Y(1033)} w={X(1010) - X(575)} h={Y(1062) - Y(1033)} />
      <FanSet {...PA} />
    </g>
  );
}

/* ---------------------------------------------------------------- fine-coal bin, feeder, coal line, blower */
const BIN = { x: X(1320), w: X(1508) - X(1320), roof: Y(168), cyl: Y(300), cone: Y(405) };
const BIN_PEAK = BIN.roof - BIN.w * 0.07;
const BLOWER = { cx: X(1495), cy: Y(985), r: 21 };
const BMOTOR = { x: X(1298), y: Y(958), w: X(1415) - X(1298), h: Y(1022) - Y(958) };

function CoalFiring() {
  return (
    <g>
      {/* coal conveying line: blower → feeder drop → burner manifold */}
      <Pipe pts={PTS([[1050, 458], [1120, 458], [1120, 595], [1400, 595], [1400, 660], [1495, 660], [1495, 952]])} w={13} />
      <Flange x={X(1120)} y={Y(530)} w={13} vertical />
      <Flange x={X(1495)} y={Y(800)} w={13} vertical />

      {/* fine-coal bin */}
      <Silo x={BIN.x} w={BIN.w} roofY={BIN.roof} cylBottom={BIN.cyl} coneBottom={BIN.cone} outletW={16} legBottom={Y(455)} braceFrom={Y(410)} ladder={false} />
      <Radar x={X(1413)} y={BIN_PEAK} h={12} />
      <Transmitter x={BIN.x} y={Y(275)} dir="left" len={7} />
      {/* CO analyser with sample line to the bin roof space */}
      <rect {...R(1210, 190, 1275, 232)} rx={5} {...PAINT.body} />
      <rect {...R(1218, 198, 1252, 214)} rx={2} {...PAINT.recess} />
      <circle cx={X(1262)} cy={Y(206)} r={2.6} {...PAINT.raised} />
      <line x1={X(1276)} y1={Y(211)} x2={BIN.x - 1} y2={Y(211)} stroke={MX.fine} strokeWidth={1.2} strokeDasharray="3 2" />

      {/* kiln coal feeder (rotor weighfeeder) under the bin, drop into the line */}
      <rect x={X(1413) - 4} y={BIN.cone + 10} width={8} height={Y(485) - BIN.cone - 10} {...PAINT.shaft} />
      <rect x={X(1413) - 5} y={Y(535)} width={10} height={Y(595) - Y(535) - 6} {...PAINT.shaft} />
      <rect {...R(1366, 485, 1440, 537)} rx={6} {...PAINT.body} />
      <circle cx={X(1403)} cy={Y(511)} r={9} {...PAINT.recess} />
      {[0, 60, 120].map((a) => (
        <line key={a} x1={X(1403)} y1={Y(511) - 8} x2={X(1403)} y2={Y(511) + 8} stroke={MX.edge} strokeWidth={1.3} transform={`rotate(${a} ${X(1403)} ${Y(511)})`} />
      ))}
      <circle cx={X(1403)} cy={Y(511)} r={2.2} {...PAINT.shaft} />
      <CornerBolts {...B(1366, 485, 1440, 537)} inset={4.5} r={1.2} />

      {/* coal conveying blower set */}
      <Plinth x={X(1265)} y={Y(1036)} w={X(1595) - X(1265)} h={Y(1066) - Y(1036)} />
      {[0.18, 0.78].map((f) => (
        <rect key={f} x={BMOTOR.x + BMOTOR.w * f - 5} y={BMOTOR.y + BMOTOR.h - 2} width={10} height={Y(1036) - BMOTOR.y - BMOTOR.h + 2} rx={1.5} {...PAINT.body} />
      ))}
      <Motor x={BMOTOR.x} y={BMOTOR.y} w={BMOTOR.w} h={BMOTOR.h} />
      <rect x={BMOTOR.x + BMOTOR.w} y={BLOWER.cy - 2.5} width={BLOWER.cx - BMOTOR.x - BMOTOR.w} height={5} {...PAINT.shaft} />
      <Coupling x={X(1430)} y={BLOWER.cy - 8} w={9} h={16} />
      <path d={`M ${BLOWER.cx - 15} ${BLOWER.cy + 10} L ${BLOWER.cx + 15} ${BLOWER.cy + 10} L ${BLOWER.cx + 19} ${Y(1036)} L ${BLOWER.cx - 19} ${Y(1036)} Z`} {...PAINT.body} />
      <circle cx={BLOWER.cx} cy={BLOWER.cy} r={BLOWER.r} {...PAINT.body} />
      <Fan cx={BLOWER.cx} cy={BLOWER.cy} r={BLOWER.r * 0.72} />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2 + 0.4;
        return <Bolt key={i} x={BLOWER.cx + Math.cos(a) * BLOWER.r * 0.87} y={BLOWER.cy + Math.sin(a) * BLOWER.r * 0.87} r={1.2} />;
      })}
    </g>
  );
}

function Art() {
  return (
    <g>
      <PrimaryAir />
      <KilnAndHood />
      <CoalFiring />
      <Burner />
      <MachineLabel x={X(512)} y={Y(152)} size={7.5}>
        FLAME CAMERA
      </MachineLabel>
      <MachineLabel x={X(212)} y={Y(615)}>KILN HOT END</MachineLabel>
      <MachineLabel x={X(522)} y={Y(600)} size={7.5}>
        KILN OUTLET HOOD
      </MachineLabel>
      <MachineLabel x={X(686)} y={Y(758)} anchor="start" size={7.5}>
        SECONDARY AIR
      </MachineLabel>
      <MachineLabel x={X(745)} y={Y(436)} size={7.5}>
        MULTI-CHANNEL BURNER
      </MachineLabel>
      <MachineLabel x={X(726)} y={Y(538)} size={7}>
        BURNER CARRIAGE
      </MachineLabel>
      <MachineLabel x={X(998)} y={Y(360)} size={7}>
        BURNER MANIFOLD
      </MachineLabel>
      <MachineLabel x={X(858)} y={Y(658)} size={7}>
        PRIMARY AIR HEADER
      </MachineLabel>
      <MachineLabel x={X(1260)} y={Y(628)} size={7}>
        COAL TO BURNER
      </MachineLabel>
      <MachineLabel x={X(1243)} y={Y(170)} size={7}>
        CO ANALYSER
      </MachineLabel>
      <MachineLabel x={X(1352)} y={Y(556)} anchor="end" size={7}>
        KILN COAL FEEDER
      </MachineLabel>
      <MachineLabel x={X(790)} y={Y(1094)}>PRIMARY-AIR FAN</MachineLabel>
      <MachineLabel x={X(1430)} y={Y(1094)}>COAL CONVEYING BLOWER</MachineLabel>
    </g>
  );
}

/** Callout boxes as on PDF page 8, next to their feature: top-left corner and width (drawing units). */
const callouts: Record<string, SheetCalloutAnchor> = {
  "CAM-BRN-01": [64.9, 13, 79.6],
  "PRS-BRN-01": [361, 50, 110],
  "PRS-BRN-02": [361, 112, 97],
  "TMP-BRN-02": [1.6, 378.8, 86.2],
  "PRS-BRN-03": [349.7, 252.5, 112],
  "VIB-BRN-01": [163.3, 436.5, 97],
  "TMP-BRN-01": [151.6, 491.8, 117.3],
  "ELE-BRN-01": [558.5, 416.4, 95.8],
  "LEV-BRN-01": [488, -36, 150],
  "TMP-BRN-04": [488, 52, 150],
  "GAS-BRN-01": [488, 4, 150],
  "FLO-BRN-01": [629.8, 207.5, 76.8],
  "PRS-BRN-04": [615.5, 312, 117.3],
  "VIB-BRN-02": [745, 366.9, 76.8],
  "ELE-BRN-02": [612.2, 474.7, 84.9],
};

export const sheet: PyroSheetDrawing = {
  sheet: "D08",
  width: W,
  height: H,
  Art,
  callouts,
  pads: {
    // burner & combustion air
    "CAM-BRN-01": P(512, 202),
    "PRS-BRN-01": P(976, 390),
    "PRS-BRN-02": P(1017, 390),
    "TMP-BRN-02": P(522, 712),
    // primary-air fan
    "PRS-BRN-03": P(836, 685),
    "VIB-BRN-01": pa.hub,
    "TMP-BRN-01": pa.bearing,
    "ELE-BRN-01": pa.terminal,
    // fine-coal bin
    "LEV-BRN-01": [X(1413), BIN_PEAK - 12],
    "TMP-BRN-04": [BIN.x - 11, Y(275)],
    "GAS-BRN-01": P(1243, 190),
    // coal feeder, conveying line, blower
    "FLO-BRN-01": P(1366, 511),
    "PRS-BRN-04": P(1265, 595),
    "VIB-BRN-02": [BLOWER.cx, BLOWER.cy],
    "ELE-BRN-02": [BMOTOR.x + BMOTOR.w / 2, BMOTOR.y - BMOTOR.h * 0.12],
  },
};
