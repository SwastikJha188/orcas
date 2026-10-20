/**
 * Sheet B-0 — BRN-01 · Main burner — Overview.
 *
 * Composition of the stage-overview PDF page 4, left → right: the kiln cut
 * away along the burning zone with the flame; the kiln hood with its inner
 * lining, the flame camera on the roof (dashed sight line into the flame) and
 * the cooler below it blowing secondary air up into the hood; the
 * multi-channel burner pipe through the hood to the burner manifold, with the
 * swirl- and axial-air lines looping over the manifold down to the
 * primary-air header; the primary-air fan (volute, bearing, motor) on its
 * base frame; the fine-coal bin (roof rail, FINE COAL window, cone, legs) with
 * the CO analyser on its sample line, the kiln coal feeder under the bin, the
 * coal line from the feeder through the coal conveying blower back up to the
 * manifold, and the coal conveying (Roots) blower set.
 */
import React from "react";
import { Bolt, CornerBolts, Fan, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Pipe } from "../../drawings/clk-parts";
import type { LineSheetArt } from "../types";
import { TapBoss } from "./parts-b";

const W = 1654;
const H = 774;
const GROUND = 713;

const KILN = { x: 80, y: 337.5, w: 385, h: 172.5 };
const FLAME = { cx: 332, cy: 424, rx: 160, ry: 56 };
const HOOD = { x: 466, y: 215, w: 193, h: 427.5 };
const BURNER = { x: 486.5, y: 410, h: 27 };
const MAN = { x: 963.5, y: 384, w: 102.5, h: 91 };
const FAN = { cx: 852.5, cy: 662.5 };
const HDR_Y = 540.5;
const COAL_Y = 621.5;
const RISER_X = 1217.5;
const MAN_LINE_Y = 440;
const DROP_X = 1329;

type Dir = "left" | "right" | "up" | "down";

/** Filled flow arrowhead, tip at (x, y). */
function Head({ x, y, dir, color, s = 1 }: { x: number; y: number; dir: Dir; color: string; s?: number }) {
  const l = 16 * s;
  const h = 8.5 * s;
  const d =
    dir === "left"
      ? `M ${x} ${y} L ${x + l} ${y - h} L ${x + l} ${y + h} Z`
      : dir === "right"
        ? `M ${x} ${y} L ${x - l} ${y - h} L ${x - l} ${y + h} Z`
        : dir === "up"
          ? `M ${x} ${y} L ${x - h} ${y + l} L ${x + h} ${y + l} Z`
          : `M ${x} ${y} L ${x - h} ${y - l} L ${x + h} ${y - l} Z`;
  return <path d={d} fill={color} aria-hidden="true" />;
}

/**
 * Flow line along an orthogonal polyline, as rects (not a stroke) so gradient
 * paints such as the brass material get a real bounding box on straight runs.
 */
function Flow({ pts, color, w = 2 }: { pts: Array<[number, number]>; color: string; w?: number }) {
  return (
    <g aria-hidden="true">
      {pts.slice(1).map(([bx, by], i) => {
        const [ax, ay] = pts[i];
        const x = Math.min(ax, bx) - w / 2;
        const y = Math.min(ay, by) - w / 2;
        return <rect key={i} x={x} y={y} width={Math.abs(bx - ax) + w} height={Math.abs(by - ay) + w} fill={color} />;
      })}
    </g>
  );
}

function KilnAndHood() {
  const { x, y, w, h } = KILN;
  const { cx, cy, rx, ry } = FLAME;
  const right = x + w;
  const dy = ry * Math.sqrt(1 - ((right - cx) / rx) ** 2);
  const flameId = `${React.useId().replace(/:/g, "")}-flame`;
  const flame = `M ${right} ${cy - dy} A ${rx} ${ry} 0 1 0 ${right} ${cy + dy} Z`;
  return (
    <g>
      {/* kiln shell, cut away along the burning zone, with the flame */}
      <rect x={x} y={y} width={w} height={h} rx={7} {...PAINT.cylinder} />
      {Array.from({ length: 13 }).map((_, i) => (
        <line key={i} x1={x + 27.5 * (i + 1)} x2={x + 27.5 * (i + 1)} y1={y + 6} y2={y + h - 6} stroke={MX.fine} strokeWidth={1} opacity={0.8} />
      ))}
      <defs>
        <radialGradient id={flameId} cx="0.3" cy="0.5" r="0.8">
          <stop offset="0" stopColor="var(--mx-material-hi)" stopOpacity={1} />
          <stop offset="0.4" stopColor="var(--mx-material)" stopOpacity={0.95} />
          <stop offset="0.8" stopColor="var(--mx-material-deep)" stopOpacity={0.7} />
          <stop offset="1" stopColor="var(--mx-material-deep)" stopOpacity={0.35} />
        </radialGradient>
      </defs>
      <path d={flame} fill={`url(#${flameId})`} />
      <rect x={x} y={y} width={w} height={h} rx={7} fill="none" stroke={MX.edge} strokeWidth={MX.w} />

      {/* kiln hood with its inner lining */}
      <rect x={HOOD.x} y={HOOD.y} width={HOOD.w} height={HOOD.h} rx={10} {...PAINT.body} />
      <rect x={HOOD.x + 1.5} y={235} width={25} height={387.5} rx={4} fill={MX.deep} stroke={MX.edge} strokeWidth={MX.w} />
      <rect x={HOOD.x + 1.5} y={235} width={25} height={387.5} rx={4} fill={MX.heat} opacity={0.3} />

      {/* flame camera on the hood roof, sight line into the flame */}
      <rect x={549} y={209} width={13} height={8} rx={1.5} {...PAINT.shaft} />
      <rect x={526.5} y={174} width={57.5} height={37.5} rx={6} {...PAINT.raised} />
      <circle cx={555.5} cy={193} r={11} {...PAINT.recess} />
      <line x1={555.5} y1={211.5} x2={415} y2={397.5} stroke={MX.air} strokeWidth={1.2} strokeDasharray="4 3" />

      {/* secondary-air thermocouple through the hood floor */}
      <rect x={542.5} y={589} width={11} height={30} rx={3} {...PAINT.body} />

      {/* cooler and secondary air rising into the hood */}
      <rect x={496} y={662.5} width={143} height={47.5} rx={7} {...PAINT.body} />
      <rect x={503} y={669.5} width={129} height={33.5} rx={4} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      <Flow pts={[[537.5, 704], [537.5, 625]]} color={MX.air} />
      <Head x={537.5} y={661} dir="up" color={MX.air} />
      <Head x={537.5} y={624} dir="up" color={MX.air} s={0.8} />
      <Flow pts={[[527, 660], [527, 626]]} color={MX.air} w={1.6} />
      <Head x={527} y={624} dir="up" color={MX.air} s={0.8} />
      <Flow pts={[[603.5, 704], [603.5, 634]]} color={MX.air} />
      <Head x={603.5} y={655} dir="up" color={MX.air} />
      <Head x={603.5} y={632} dir="up" color={MX.air} s={0.8} />
      <Flow pts={[[609, 652], [609, 634]]} color={MX.air} w={1.6} />
    </g>
  );
}

function BurnerAndAir() {
  const { x, y, h } = BURNER;
  const len = MAN.x - x;
  return (
    <g>
      {/* swirl and axial air lines over the manifold, down into the primary-air header */}
      <Pipe pts={[[994, MAN.y + 4], [994, 336], [1106, 336], [1106, HDR_Y - 8]]} w={11} />
      <Pipe pts={[[1034, MAN.y + 4], [1034, 357.5], [1137.5, 357.5], [1137.5, HDR_Y - 8]]} w={11} />

      {/* primary-air header: fan outlet → header → air lines */}
      <Pipe pts={[[FAN.cx, 612], [FAN.cx, HDR_Y], [1147.5, HDR_Y], [1147.5, 521]]} w={21} />
      <rect x={FAN.cx - 14} y={590} width={28} height={5} rx={1.5} {...PAINT.raised} />
      <rect x={1060} y={HDR_Y - 14} width={5} height={28} rx={1.5} {...PAINT.raised} />

      {/* multi-channel burner pipe through the hood */}
      <rect x={x} y={y} width={len} height={h} rx={2} {...PAINT.cylinder} />
      <rect x={x + 4} y={y + 11} width={len - 8} height={6} fill={MX.deep} />
      <line x1={x + 4} x2={x + len - 4} y1={y + 20.5} y2={y + 20.5} stroke={MX.fine} strokeWidth={0.8} />
      <rect x={x - 3} y={y - 4} width={7} height={h + 8} rx={2} {...PAINT.raised} />
      <rect x={HOOD.x + HOOD.w - 3} y={y - 5} width={7} height={h + 10} rx={2} {...PAINT.raised} />

      {/* burner manifold */}
      <rect x={MAN.x} y={MAN.y} width={MAN.w} height={MAN.h} rx={12} {...PAINT.body} />
      <rect x={MAN.x + 7} y={MAN.y + 7} width={MAN.w - 14} height={MAN.h - 14} rx={7} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      <CornerBolts x={MAN.x} y={MAN.y} w={MAN.w} h={MAN.h} inset={12} r={1.8} />
    </g>
  );
}

function PrimaryAirFan() {
  const { cx, cy } = FAN;
  const volute = `M 811 610 H 864 V 624 A 38 38 0 0 1 ${cx + 38} ${cy} A 40 40 0 0 1 ${cx} ${cy + 40} A 41.5 41.5 0 0 1 811 ${cy} Z`;
  return (
    <g>
      {/* base frame */}
      <rect x={750} y={701} width={326} height={10.5} rx={3} {...PAINT.body} />
      {[762, 1064].map((bx) => (
        <Bolt key={bx} x={bx} y={706} r={1.6} />
      ))}
      {/* volute with impeller */}
      <path d={volute} {...PAINT.body} />
      <circle cx={cx} cy={cy} r={22.5} {...PAINT.raised} />
      <circle cx={cx} cy={cy} r={18} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      <Fan cx={cx} cy={cy} r={15} />
      {[130, 50, 230, 310].map((deg) => {
        const a = (deg * Math.PI) / 180;
        return <Bolt key={deg} x={cx + Math.cos(a) * 31} y={cy - Math.sin(a) * 31} r={2} />;
      })}
      {/* bearing and shaft to the motor */}
      <rect x={890} y={655} width={36} height={7} {...PAINT.shaft} />
      <rect x={885} y={648} width={28} height={21} rx={6} {...PAINT.raised} />
      {/* motor: frame, fins, terminal box, fan cowl, feet */}
      <rect x={935} y={690} width={89} height={11} rx={2} {...PAINT.body} />
      <rect x={1033} y={634} width={31} height={51} rx={10} {...PAINT.body} />
      <rect x={922.5} y={627.5} width={112.5} height={65} rx={12} {...PAINT.body} />
      {[637, 646, 655, 664, 673, 682].map((fy) => (
        <line key={fy} x1={931} x2={1027} y1={fy} y2={fy} stroke={MX.fine} strokeWidth={MX.wFine} />
      ))}
      <rect x={960} y={651.5} width={37.5} height={17} rx={4} {...PAINT.recess} />
      <rect x={956} y={610} width={46.5} height={18.5} rx={6} {...PAINT.body} />
      {/* winding RTD terminal (TMP-BRN-05) */}
      <TapBoss x={1000} y={673.5} s={9} />
    </g>
  );
}

function CoalBin() {
  const rail = Array.from({ length: 14 }).map((_, i) => 1254 + i * 10.8);
  return (
    <g>
      {/* roof rail and level radar nozzle */}
      {rail.map((px) => (
        <line key={px} x1={px} x2={px} y1={158} y2={180} stroke={MX.edge} strokeWidth={1.3} />
      ))}
      <line x1={1254} x2={1395} y1={158} y2={158} stroke={MX.edge} strokeWidth={1.6} />
      <rect x={1316} y={158} width={17} height={14} rx={2} {...PAINT.raised} />
      {/* legs, cone, outlet chute */}
      {[1257.5, 1381].map((lx) => (
        <g key={lx}>
          <rect x={lx} y={322} width={11.5} height={168} rx={1.5} {...PAINT.body} />
          <rect x={lx - 3} y={487} width={17.5} height={5} rx={1.5} {...PAINT.raised} />
        </g>
      ))}
      <line x1={1268.5} y1={382.5} x2={1324} y2={478} stroke={MX.fine} strokeWidth={1.2} />
      <line x1={1381} y1={382.5} x2={1326} y2={478} stroke={MX.fine} strokeWidth={1.2} />
      <rect x={1320} y={386} width={10} height={106} {...PAINT.shaft} />
      <path d="M 1256 324 L 1395 324 L 1350 388.5 L 1300 388.5 Z" {...PAINT.cylinderV} />
      {/* shell with the FINE COAL window */}
      <rect x={1248.5} y={185} width={152.5} height={127} rx={4} {...PAINT.cylinderV} />
      {[211, 290].map((ry) => (
        <line key={ry} x1={1251} x2={1398.5} y1={ry} y2={ry} stroke={MX.fine} strokeWidth={MX.wFine} />
      ))}
      {[237.5, 264].map((ry) => (
        <g key={ry}>
          <line x1={1251} x2={1268} y1={ry} y2={ry} stroke={MX.fine} strokeWidth={MX.wFine} />
          <line x1={1382} x2={1398.5} y1={ry} y2={ry} stroke={MX.fine} strokeWidth={MX.wFine} />
        </g>
      ))}
      <rect x={1271.5} y={214} width={107} height={65} rx={8} {...PAINT.recess} />
      <path d="M 1274.5 276 V 251 Q 1325 239 1375.5 251 V 276 Z" fill={MX.material} opacity={0.3} />
      <rect x={1240} y={311} width={169} height={14} rx={5} {...PAINT.raised} />
      {/* roof */}
      <path d="M 1236 187 L 1324.5 169 L 1413 187 Z" {...PAINT.raised} />
      {/* wall thermometer */}
      <rect x={1236} y={262.5} width={14} height={7} rx={1.5} {...PAINT.shaft} />

      {/* CO analyser on its sample line */}
      <line x1={1401} y1={236} x2={1431} y2={229} stroke={MX.fine} strokeWidth={1.4} strokeDasharray="4 3" />
      <rect x={1431} y={205} width={72} height={46.5} rx={6} {...PAINT.body} />
      <rect x={1438} y={211.5} width={58} height={33.5} rx={4} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />

      {/* kiln coal feeder */}
      <rect x={1294} y={491.5} width={61} height={45} rx={8} {...PAINT.body} />
      <rect x={1300} y={498} width={22} height={32} rx={3} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
    </g>
  );
}

function CoalLine() {
  return (
    <g>
      {/* blower → riser → manifold, feeder drop into the line */}
      <Pipe pts={[[1424, COAL_Y], [RISER_X, COAL_Y], [RISER_X, MAN_LINE_Y], [MAN.x + MAN.w - 2, MAN_LINE_Y]]} w={18} />
      <Pipe pts={[[DROP_X, 534], [DROP_X, COAL_Y - 6]]} w={12} />
      <rect x={RISER_X - 14} y={592} width={28} height={5} rx={1.5} {...PAINT.raised} />
      <rect x={1180} y={MAN_LINE_Y - 14} width={5} height={28} rx={1.5} {...PAINT.raised} />
      <TapBoss x={RISER_X} y={520} s={10} />
    </g>
  );
}

function Blower() {
  return (
    <g>
      <rect x={1370} y={700} width={204} height={11} rx={3} {...PAINT.body} />
      {[1382, 1562].map((bx) => (
        <Bolt key={bx} x={bx} y={705.5} r={1.6} />
      ))}
      {/* Roots blower on its stand */}
      <path d="M 1432 660 H 1482 L 1488 700 H 1426 Z" {...PAINT.body} />
      <rect x={1421.5} y={601.5} width={71} height={61} rx={10} {...PAINT.body} />
      <circle cx={1456.5} cy={632} r={19} {...PAINT.raised} />
      <circle cx={1456.5} cy={632} r={13} {...PAINT.recess} />
      <CornerBolts x={1421.5} y={601.5} w={71} h={61} inset={7} r={1.6} />
      <rect x={1484} y={641.5} width={20} height={6.5} {...PAINT.shaft} />
      {/* motor */}
      <path d="M 1512 676 H 1566 L 1570 700 H 1508 Z" {...PAINT.body} />
      <rect x={1507.5} y={667} width={61.5} height={10} rx={2} {...PAINT.body} />
      <rect x={1569} y={626} width={23.5} height={38} rx={8} {...PAINT.body} />
      <rect x={1502.5} y={620} width={68.5} height={50} rx={10} {...PAINT.body} />
      {[629, 638, 647, 656].map((fy) => (
        <line key={fy} x1={1509} x2={1565} y1={fy} y2={fy} stroke={MX.fine} strokeWidth={MX.wFine} />
      ))}
      <rect x={1525} y={639} width={23.5} height={12.5} rx={3} {...PAINT.recess} />
      <rect x={1526} y={609.5} width={41.5} height={13} rx={4} {...PAINT.body} />
      {/* winding RTD terminal (TMP-BRN-06) */}
      <TapBoss x={1549.8} y={655.2} s={8} />
    </g>
  );
}

function Flows() {
  return (
    <g>
      {/* coal: blower → riser → manifold → burner tip; feeder drop */}
      <Flow pts={[[1421, COAL_Y], [RISER_X, COAL_Y], [RISER_X, MAN_LINE_Y], [MAN.x + MAN.w, MAN_LINE_Y]]} color={MX.material} w={2.6} />
      <Flow pts={[[DROP_X, 537], [DROP_X, COAL_Y]]} color={MX.material} w={2.6} />
      <Flow pts={[[MAN.x, 414.5], [500, 414.5]]} color={MX.material} w={2.6} />
      <Head x={DROP_X} y={576} dir="down" color={MX.material} />
      <Head x={1314} y={COAL_Y} dir="left" color={MX.material} />
      <Head x={RISER_X} y={524} dir="up" color={MX.material} s={0.85} />
      <Head x={1138} y={MAN_LINE_Y} dir="left" color={MX.material} />
      <Head x={850} y={414.5} dir="left" color={MX.material} />
      <Head x={622} y={414.5} dir="left" color={MX.material} />
      {/* primary air: fan outlet → header → air lines */}
      <Flow pts={[[FAN.cx, 606], [FAN.cx, HDR_Y], [1147.5, HDR_Y], [1147.5, 482]]} color={MX.air} />
      <Head x={FAN.cx} y={565} dir="up" color={MX.air} />
      <Head x={1013} y={HDR_Y} dir="right" color={MX.air} />
      <Head x={1147.5} y={493} dir="up" color={MX.air} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={70} x2={1584} y={GROUND} />
      <KilnAndHood />
      <BurnerAndAir />
      <PrimaryAirFan />
      <CoalBin />
      <CoalLine />
      <Blower />
      <Flows />

      <MachineLabel x={62} y={333} anchor="start" size={11}>
        KILN
      </MachineLabel>
      <MachineLabel x={555.5} y={165} size={11}>
        FLAME CAMERA
      </MachineLabel>
      <MachineLabel x={655} y={245} anchor="end" size={11}>
        KILN HOOD
      </MachineLabel>
      <MachineLabel x={662} y={405} anchor="start" size={10.5}>
        MULTI-CHANNEL BURNER
      </MachineLabel>
      <MachineLabel x={1014.5} y={497.5} size={10.5}>
        BURNER MANIFOLD
      </MachineLabel>
      <MachineLabel x={567.5} y={694} size={10.5}>
        COOLER
      </MachineLabel>
      <MachineLabel x={1325} y={262} size={10.5} tone="ink">
        FINE COAL
      </MachineLabel>
      <MachineLabel x={1467} y={270.5} size={9.5}>
        CO ANALYSER
      </MachineLabel>
      <MachineLabel x={1341} y={566} anchor="start" size={10}>
        KILN COAL FEEDER
      </MachineLabel>
      <MachineLabel x={912.5} y={736.5} size={11}>
        PRIMARY-AIR FAN
      </MachineLabel>
      <MachineLabel x={1491} y={736.5} size={11}>
        COAL CONVEYING BLOWER
      </MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 4. */
const pads: LineSheetArt["pads"] = {
  "CAM-BRN-01": [555.5, 193],
  "TMP-BRN-02": [548.2, 621.8],
  "PRS-BRN-01": [1106, 398.2],
  "PRS-BRN-02": [1137.5, 424],
  "PRS-BRN-03": [964, 540.5],
  "VIB-BRN-01": [852.5, 662.5],
  "TMP-BRN-01": [899, 658.5],
  "ELE-BRN-01": [979, 617.8],
  "TMP-BRN-05": [1000.2, 673.5],
  "LEV-BRN-01": [1324.5, 152.2],
  "GAS-BRN-01": [1466.8, 228.2],
  "TMP-BRN-04": [1248.2, 266],
  "FLO-BRN-01": [1355, 514],
  "CAL-BRN-01": [1310, 514],
  "PRS-BRN-04": [1217.5, 520],
  "VIB-BRN-02": [1456.5, 632],
  "ELE-BRN-02": [1543, 613.5],
  "TMP-BRN-06": [1549.8, 655.2],
};

/** Value-block slot per point, laid out like the PDF's label chips. */
const callouts: LineSheetArt["callouts"] = {
  "CAM-BRN-01": [592, 194, "start"],
  "TMP-BRN-02": [574.5, 623, "start"],
  "PRS-BRN-01": [1141, 398, "start"],
  "PRS-BRN-02": [1162, 421, "start"],
  "PRS-BRN-03": [965, 511, "middle"],
  "TMP-BRN-01": [884, 693, "end"],
  "ELE-BRN-01": [980, 588, "middle"],
  "VIB-BRN-01": [800, 662.5, "end"],
  "LEV-BRN-01": [1325, 120, "middle"],
  "GAS-BRN-01": [1418, 183, "start"],
  "TMP-BRN-04": [1221.5, 268, "end"],
  "FLO-BRN-01": [1380, 514, "start"],
  "CAL-BRN-01": [1380, 540, "start"],
  "PRS-BRN-04": [1203, 566, "end"],
  "VIB-BRN-02": [1457.5, 590, "middle"],
  "ELE-BRN-02": [1543.8, 563, "middle"],
  "TMP-BRN-05": [1067, 672.5, "start"],
  "TMP-BRN-06": [1549.2, 686.8, "middle"],
};

export const sheet: LineSheetArt = { id: "B-0", ready: true, width: W, height: H, Art, pads, callouts };
