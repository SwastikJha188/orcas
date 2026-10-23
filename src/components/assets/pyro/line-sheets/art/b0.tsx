/**
 * Sheet B-0 — BRN-01 · Main burner and coal firing — Overview (design Burner_Coal Rev02).
 *
 * Drawn in the design's 2000 × 1125 frame, left → right: the kiln outlet cut away round the flame; the kiln hood
 * with its lining, the flame camera on the roof and secondary air rising from the cooler; the multi-channel
 * burner pipe to its manifold, the axial and swirl air lines from the primary-air header down to the
 * primary-air fan; the fine-coal bin (CO analyser, nitrogen bottles, aeration blower on the cone) over the kiln
 * and calciner coal feeders; the kiln coal line back to the manifold, carried by the coal conveying blower; the
 * calciner coal line rising to the calciner. Readout blocks stand round the drawing (`readouts`).
 */
import React from "react";
import { MX, MachineLabel, PAINT, GroundLine } from "@/components/assets/machine-kit/machine-kit";
import type { LineSheetArt } from "../types";
import { Bottles, FanSet, Head, InstrumentBox, Line, RotaryFeeder } from "./parts-d";

const W = 2000;
const H = 1125;
const GROUND = 674;

const KILN = { x: 337, y: 391, w: 221, h: 86 };
const HOOD = { x: 558, y: 292, w: 65, h: 270 };
const MAN = { x: 822, y: 405, w: 67, h: 57 };
const BIN = { x: 1137, y: 278, w: 114, h: 135 };
const COAL = MX.material;
const AIR = MX.air;

function KilnAndHood() {
  const { x, y, w, h } = KILN;
  const flameId = `${React.useId().replace(/:/g, "")}-flame`;
  const clipId = `${flameId}-clip`;
  return (
    <g>
      {/* kiln outlet, cut away round the flame, with its tyre */}
      <rect x={x} y={y} width={w} height={h} rx={6} {...PAINT.cylinder} />
      {Array.from({ length: 9 }).map((_, i) => (
        <line key={i} x1={x + 16 + i * 24} x2={x + 16 + i * 24} y1={y + 5} y2={y + h - 5} stroke={MX.fine} strokeWidth={0.7} opacity={0.6} />
      ))}
      <defs>
        <radialGradient id={flameId} cx="0.35" cy="0.5" r="0.7">
          <stop offset="0" stopColor="var(--mx-material-hi)" stopOpacity={1} />
          <stop offset="0.45" stopColor="var(--mx-material)" stopOpacity={0.9} />
          <stop offset="1" stopColor="var(--mx-material-deep)" stopOpacity={0.15} />
        </radialGradient>
        <clipPath id={clipId}>
          <rect x={x} y={y} width={w} height={h} rx={6} />
        </clipPath>
      </defs>
      <ellipse cx={490} cy={434} rx={78} ry={29} fill={`url(#${flameId})`} clipPath={`url(#${clipId})`} />
      <rect x={x} y={y} width={w} height={h} rx={6} fill="none" stroke={MX.edge} strokeWidth={MX.w} />
      <rect x={399} y={383} width={17} height={102} rx={4} {...PAINT.raised} />

      {/* hood with its lining */}
      <rect x={HOOD.x} y={HOOD.y} width={HOOD.w} height={HOOD.h} rx={6} {...PAINT.body} />
      <rect x={562} y={300} width={8} height={255} rx={3} fill={MX.deep} stroke={MX.edge} strokeWidth={1} />
      <rect x={562} y={300} width={8} height={255} rx={3} fill={MX.heat} opacity={0.35} />

      {/* flame camera on the roof, sight line into the flame */}
      <rect x={578} y={270} width={22} height={18} rx={3} {...PAINT.raised} />
      <line x1={589} y1={288} x2={500} y2={414} stroke={MX.label} strokeWidth={1} strokeDasharray="4 3" />

      {/* cooler throat under the hood; secondary air rising into it */}
      <rect x={563} y={566} width={55} height={28} rx={4} {...PAINT.body} />
      {[574, 607].map((lx) => (
        <line key={lx} x1={lx} x2={lx} y1={569} y2={591} stroke={MX.fine} strokeWidth={0.8} />
      ))}
      <rect x={589.2} y={485} width={1.6} height={170} fill={AIR} />
      <Head x={590} y={510} dir="up" color={AIR} s={0.9} />
      <Head x={590} y={596} dir="up" color={AIR} s={0.9} />
    </g>
  );
}

function BurnerAndAir() {
  return (
    <g>
      {/* primary-air header from the fan, axial and swirl lines up into the manifold */}
      <Line pts={[[819, 594], [819, 537], [868, 537]]} color={AIR} w={9} heads={[[819, 572, "up"]]} />
      <Line pts={[[840, 537], [840, 462]]} color={AIR} w={9} heads={[[840, 505, "up"]]} />
      <Line pts={[[868, 537], [868, 462]]} color={AIR} w={9} heads={[[868, 505, "up"]]} />

      {/* multi-channel burner pipe through the hood, coal on its axis */}
      <rect x={535} y={427} width={MAN.x - 535} height={14} rx={2} {...PAINT.cylinder} />
      <rect x={540} y={433.2} width={MAN.x - 540} height={1.6} fill={COAL} />
      <Head x={672} y={434} dir="left" color={COAL} />
      <rect x={533} y={422} width={8} height={24} rx={2} {...PAINT.raised} />

      {/* burner manifold */}
      <rect x={MAN.x} y={MAN.y} width={MAN.w} height={MAN.h} rx={6} {...PAINT.body} />
      <rect x={MAN.x + 6} y={MAN.y + 8} width={MAN.w - 12} height={MAN.h - 15} rx={4} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      <MachineLabel x={MAN.x + MAN.w / 2} y={MAN.y + 31} size={6} tone="ink">
        MANIFOLD
      </MachineLabel>
    </g>
  );
}

function CoalBin() {
  const { x, y, w, h } = BIN;
  const cone = `M ${x} ${y + h} L ${x + w} ${y + h} L ${x + w - 19} 476 L ${x + 19} 476 Z`;
  return (
    <g>
      {/* roof with the level radar */}
      <path d={`M ${x + 8} 265 L ${x + w - 8} 265 L ${x + w} ${y} L ${x} ${y} Z`} {...PAINT.raised} />
      <rect x={1188} y={255} width={13} height={11} rx={2} {...PAINT.raised} />
      {/* shell with the FINE COAL window */}
      <rect x={x} y={y} width={w} height={h} rx={5} {...PAINT.cylinderV} />
      <rect x={1149} y={307} width={91} height={84} rx={5} fill={MX.padPanel} stroke={MX.fine} strokeWidth={MX.wFine} opacity={0.75} />
      <rect x={1151} y={356} width={86} height={35} rx={3} fill={MX.deep} stroke={MX.edge} strokeWidth={1} />
      <rect x={1151} y={356} width={86} height={35} rx={3} fill={MX.material} opacity={0.35} />
      <MachineLabel x={1194} y={349} size={6.5} tone="ink">
        FINE COAL
      </MachineLabel>
      {/* cone and outlet flange */}
      <path d={cone} {...PAINT.cylinderV} />
      <rect x={1148} y={476} width={92} height={10} rx={2} {...PAINT.raised} />
      {/* feeder stalks */}
      {[1173, 1215].map((fx) => (
        <rect key={fx} x={fx - 2} y={486} width={4} height={12} fill={COAL} />
      ))}
      <RotaryFeeder cx={1173} cy={513} />
      <RotaryFeeder cx={1215} cy={513} />

      {/* CO analyser on its sample line */}
      <line x1={1251} y1={328} x2={1279} y2={328} stroke={MX.label} strokeWidth={1} strokeDasharray="4 3" />
      <InstrumentBox x={1279} y={314} w={43} h={28} />

      {/* nitrogen purge bottles on their line */}
      <path d="M 1251 389 H 1282 V 398" fill="none" stroke={AIR} strokeWidth={1.4} strokeDasharray="4 3" />
      <Bottles x={1279} y={398} w={15} h={36} />
      <text x={1295.5} y={446} fontSize={7} fontWeight={600} textAnchor="middle" fill={AIR}>
        N₂
      </text>

      {/* aeration blower blowing into the cone */}
      <path d="M 1076 452 V 441 H 1143 L 1160 450" fill="none" stroke={MX.edge} strokeWidth={4} strokeLinejoin="round" />
      <path d="M 1076 452 V 441 H 1143 L 1160 450" fill="none" stroke={AIR} strokeWidth={1.6} strokeLinejoin="round" />
      <Head x={1112} y={441} dir="right" color={AIR} s={0.7} />
      <FanSet cx={1077} cy={458} r={8} base={false} />
    </g>
  );
}

function CoalLines() {
  return (
    <g>
      {/* kiln coal: feeder → coal line → manifold */}
      <Line pts={[[1193, 580], [946, 580], [946, 435], [889, 435]]} color={COAL} w={11} heads={[[1062, 580, "left"], [946, 508, "up"], [903, 435, "left"]]} />
      <Line pts={[[1173, 528], [1173, 576]]} color={COAL} w={11} heads={[[1173, 557, "down"]]} />
      {/* conveying air from the blower into the coal line */}
      <Line pts={[[1250, 617], [1193, 617], [1193, 586]]} color={AIR} w={9} heads={[[1218, 617, "left"], [1193, 602, "up"]]} />
      {/* calciner coal: feeder → riser to the calciner burner */}
      <Line pts={[[1215, 528], [1215, 552], [1398, 552], [1398, 230]]} color={COAL} w={9} heads={[[1215, 542, "down"], [1307, 552, "right"], [1398, 392, "up"]]} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={330} x2={1430} y={GROUND} />
      <CoalLines />
      <KilnAndHood />
      <BurnerAndAir />
      <CoalBin />
      <FanSet cx={819} cy={618} r={20} />
      <FanSet cx={1265} cy={617} r={15} />

      <MachineLabel x={588} y={263} size={8}>
        FLAME CAMERA
      </MachineLabel>
      <MachineLabel x={719} y={416} size={8}>
        MULTI-CHANNEL BURNER
      </MachineLabel>
      <MachineLabel x={839} y={522} size={7}>
        AXIAL
      </MachineLabel>
      <MachineLabel x={879} y={522} size={7}>
        SWIRL
      </MachineLabel>
      <MachineLabel x={590} y={664} size={8}>
        SECONDARY AIR FROM COOLER
      </MachineLabel>
      <MachineLabel x={1097} y={481} size={8}>
        AERATION BLOWER
      </MachineLabel>
      <MachineLabel x={1153} y={516} anchor="end" size={7}>
        KILN FEEDER
      </MachineLabel>
      <MachineLabel x={1236} y={500} anchor="start" size={7}>
        CALCINER FEEDER
      </MachineLabel>
      <MachineLabel x={1398} y={218} size={8}>
        TO CALCINER
      </MachineLabel>
      <MachineLabel x={1293} y={668} size={8}>
        COAL CONVEYING BLOWER
      </MachineLabel>
      {[
        [447, "KILN OUTLET"],
        [590, "KILN HOOD"],
        [851, "PRIMARY-AIR FAN"],
        [1194, "FINE-COAL BIN & FEEDERS"],
      ].map(([x, t]) => (
        <MachineLabel key={t} x={x as number} y={697} size={8}>
          {t}
        </MachineLabel>
      ))}
    </g>
  );
}

const pads: LineSheetArt["pads"] = {
  "CAM-BRN-01": [589, 279],
  "TMP-BRN-02": [590, 618],
  "PRS-BRN-03": [840, 491],
  "PRS-BRN-02": [868, 491],
  "PRS-BRN-01": [819, 559],
  "VIB-BRN-01": [829, 600],
  "TMP-BRN-01": [806, 638],
  "ELE-BRN-01": [897, 598],
  "TMP-BRN-05": [883, 620],
  "LEV-BRN-01": [1194, 260],
  "TMP-BRN-04": [1135, 368],
  "GAS-BRN-01": [1300, 328],
  "FLO-BRN-01": [1173, 513],
  "STS-BRN-02": [1269, 389],
  "STS-BRN-01": [1077, 458],
  "ELE-BRN-03": [1094, 452],
  "FLO-BRN-02": [1215, 513],
  "PRS-BRN-04": [1003, 580],
  "VIB-BRN-02": [1272, 604],
  "TMP-BRN-06": [1316, 618],
  "ELE-BRN-02": [1328, 603],
};

const readouts: LineSheetArt["readouts"] = {
  frame: [0, 0, W, H],
  blocks: [
    { title: "Kiln hood & flame", box: [21, 209, 269, 91], leader: [578, 279], rows: [["CAM-BRN-01", "FLAME CAMERA"], ["TMP-BRN-02", "SECONDARY AIR TEMP."]] },
    {
      title: "Multi-channel burner",
      box: [21, 375, 276, 117],
      leader: [337, 434],
      rows: [["PRS-BRN-03", "AXIAL AIR PRESSURE"], ["PRS-BRN-02", "SWIRL AIR PRESSURE"], ["PRS-BRN-04", "COAL LINE PRESSURE"]],
    },
    {
      title: "Primary-air fan",
      box: [344, 719, 278, 166],
      leader: [804, 632],
      rows: [["PRS-BRN-01", "PA HEADER PRESSURE"], ["VIB-BRN-01", "VIBRATION"], ["TMP-BRN-01", "BEARING TEMP."], ["TMP-BRN-05", "MOTOR WINDING TEMP."], ["ELE-BRN-01", "MOTOR CURRENT"]],
    },
    { title: "Fine-coal bin", box: [1459, 17, 236, 141], leader: [1252, 330], rows: [["LEV-BRN-01", "COAL BIN LEVEL"], ["TMP-BRN-04", "COAL BIN TEMP."], ["GAS-BRN-01", "COAL BIN CO"], ["STS-BRN-02", "NITROGEN PURGING"]] },
    { title: "Coal-bin aeration blower", box: [1458, 223, 298, 91], leader: [1118, 452], rows: [["STS-BRN-01", "BLOWER STATUS"], ["ELE-BRN-03", "BLOWER MOTOR CURRENT"]] },
    { title: "Kiln coal feeder", box: [1459, 344, 354, 91], leader: [1188, 506], rows: [["FLO-BRN-01", "KILN COAL"]] },
    { title: "Calciner coal feeder", box: [1459, 465, 284, 66], leader: [1230, 513], rows: [["FLO-BRN-02", "CALCINER COAL"]] },
    {
      title: "Coal conveying blower",
      box: [1459, 563, 292, 116],
      leader: [1352, 618],
      rows: [["VIB-BRN-02", "VIBRATION"], ["TMP-BRN-06", "MOTOR WINDING TEMP."], ["ELE-BRN-02", "MOTOR CURRENT"]],
    },
  ],
};

export const sheet: LineSheetArt = { id: "B-0", ready: true, width: W, height: H, Art, pads, readouts };
