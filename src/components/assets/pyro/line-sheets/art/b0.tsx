/**
 * Sheet B-0 — BRN-01 · Main burner — Overview.
 * Composed as PDF page 23: kiln burning zone with the flame on its roller
 * station, the outlet hood with roof flame camera and secondary air rising
 * from the cooler, the multi-channel burner on its carriage to the burner
 * manifold, swirl / axial branches over the primary-air header down to the
 * primary-air fan set; the fine-coal bin on its platform with level radar,
 * wall thermometer and CO analyser, the kiln coal feeder dropping into the
 * coal line, and the coal conveying (Roots) blower set.
 */
import React from "react";
import { Bolt, Coupling, CornerBolts, GroundLine, Housing, MX, MachineLabel, Motor, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Flange, FlowArrow, Pipe, RootsBlower, Silo } from "../../drawings/clk-parts";
import { PedestalBearing, Volute } from "../../drawings/fkp-parts";
import { Brick, Radar } from "../../sheets/sa-parts";
import type { LineSheetArt } from "../types";
import { BaseFrame, ButterflyValve, CoalPipe, TapBoss } from "./parts-b";

const W = 1144.5;
const H = 479;
const GROUND = 458;

const KILN = { x: 23, y: 180, w: 285, h: 128 };
const LANCE_Y = 244;
const MAN = { x: 675, y: 215, w: 75, h: 67 };
const HDR_Y = 330;
const FAN = { cx: 593, cy: 420, r: 27 };
const DUCT_X = 574;
const BIN = { x: 885, w: 114, roof: 69, cyl: 162, cone: 218 };
const BIN_CX = BIN.x + BIN.w / 2;
const FEED = { x: 916, y: 302, w: 50, h: 26 };
const COAL_X = 862;
const LINE_Y = 397;

function KilnAndHood() {
  const { x, y, w, h } = KILN;
  return (
    <g>
      {/* roller station under the tyre */}
      <rect x={118} y={y + h + 14} width={70} height={GROUND - y - h - 14} rx={2} {...PAINT.body} />
      <rect x={112} y={y + h + 10} width={82} height={8} rx={2} {...PAINT.raised} />
      {[134, 172].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={y + h + 4} r={9} {...PAINT.raised} />
          <circle cx={cx} cy={y + h + 4} r={3} {...PAINT.shaft} />
        </g>
      ))}
      <Bolt x={126} y={GROUND - 8} r={1.4} />
      <Bolt x={180} y={GROUND - 8} r={1.4} />
      {/* kiln shell, cut away along the burning zone */}
      <rect x={x} y={y} width={w} height={h} rx={6} {...PAINT.cylinder} />
      <rect x={x + 8} y={y + 12} width={w - 8} height={h - 24} rx={4} {...PAINT.recess} />
      <path d={`M ${x + 10} ${y + h - 16} Q ${x + 150} ${y + h - 32} ${x + w} ${y + h - 26} L ${x + w} ${y + h - 13} L ${x + 10} ${y + h - 13} Z`} {...PAINT.material} opacity={0.7} />
      {Array.from({ length: 12 }).map((_, i) => (
        <line key={i} x1={x + 20 + i * 22} x2={x + 20 + i * 22} y1={y + 2} y2={y + 10} stroke={MX.fine} strokeWidth={0.8} />
      ))}
      {/* tyre (riding ring) */}
      <rect x={146} y={y - 5} width={16} height={11} rx={2} {...PAINT.cylinderV} />
      <rect x={146} y={y + h - 6} width={16} height={11} rx={2} {...PAINT.cylinderV} />
      <ellipse cx={200} cy={LANCE_Y} rx={112} ry={42} fill={MX.heat} />
      <ellipse cx={248} cy={LANCE_Y} rx={60} ry={16} fill={MX.material} opacity={0.5} />
      {/* nose ring */}
      <rect x={302} y={y - 10} width={10} height={h + 20} rx={3} {...PAINT.cylinderV} />

      {/* outlet hood */}
      <Housing x={308} y={90} w={143} h={315} rx={10} bolts={false} />
      <Brick x={314} y={98} w={14} h={299} row={8} course={7} />
      <rect x={398} y={120} width={42} height={52} rx={4} {...PAINT.raised} />
      <rect x={404} y={128} width={30} height={14} rx={2} {...PAINT.recess} />
      <CornerBolts x={398} y={120} w={42} h={52} inset={4} r={1.1} />
      <rect x={398} y={300} width={42} height={52} rx={4} {...PAINT.raised} />
      <rect x={404} y={308} width={30} height={14} rx={2} {...PAINT.recess} />
      <CornerBolts x={398} y={300} w={42} h={52} inset={4} r={1.1} />
      {/* flame camera on the roof, sight line */}
      <rect x={369} y={86} width={10} height={6} rx={1.5} {...PAINT.raised} />
      <rect x={353} y={60} width={42} height={28} rx={5} {...PAINT.body} />
      <circle cx={374} cy={74} r={7} {...PAINT.recess} />
      <rect x={358} y={56} width={32} height={5} rx={1.5} {...PAINT.raised} />
      <line x1={372} y1={92} x2={275} y2={226} stroke={MX.fine} strokeWidth={1} strokeDasharray="3 3" />
      {/* secondary-air thermocouple */}
      <rect x={366.5} y={390} width={4} height={22} {...PAINT.shaft} />
      <rect x={362} y={410} width={13} height={7} rx={2} {...PAINT.raised} />
      {/* cooler and secondary air */}
      <rect x={330} y={421} width={105} height={34} rx={6} {...PAINT.body} />
      <rect x={336} y={427} width={93} height={22} rx={3} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      {[349, 418].map((ax) => (
        <FlowArrow key={ax} x1={ax} y1={419} x2={ax} y2={407} />
      ))}
    </g>
  );
}

function BurnerAndAir() {
  return (
    <g>
      {/* primary-air header and branches */}
      <Pipe pts={[[DUCT_X, FAN.cy - FAN.r - 12], [DUCT_X, HDR_Y], [804, HDR_Y], [804, 194], [724, 194], [724, MAN.y + 2]]} w={9} />
      <Pipe pts={[[781, HDR_Y], [781, 178], [696, 178], [696, MAN.y + 2]]} w={9} />
      <Flange x={DUCT_X} y={360} w={9} vertical />
      <Flange x={720} y={HDR_Y} w={9} />
      <ButterflyValve x={781} y={268} w={9} vertical />
      <ButterflyValve x={804} y={290} w={9} vertical />
      {/* coal line: blower → feeder drop → burner manifold */}
      <Pipe pts={[[1013, LINE_Y], [BIN_CX, LINE_Y]]} w={10} />
      <CoalPipe pts={[[BIN_CX, LINE_Y], [COAL_X, LINE_Y], [COAL_X, 305], [712, 305], [712, MAN.y + MAN.h]]} w={10} />
      <Flange x={COAL_X} y={340} w={10} vertical />
      <Flange x={900} y={LINE_Y} w={10} />

      {/* burner carriage and lance */}
      <rect x={458} y={262} width={210} height={4} rx={1.5} {...PAINT.body} />
      {[500, 620].map((cx) => (
        <g key={cx}>
          <rect x={cx - 14} y={253} width={28} height={4} rx={1} {...PAINT.raised} />
          <circle cx={cx - 7} cy={259} r={2.6} {...PAINT.shaft} />
          <circle cx={cx + 7} cy={259} r={2.6} {...PAINT.shaft} />
        </g>
      ))}
      <rect x={316} y={LANCE_Y - 8} width={MAN.x - 316} height={16} rx={3} {...PAINT.cylinder} />
      <rect x={322} y={LANCE_Y - 1.5} width={MAN.x - 330} height={3} {...PAINT.material} opacity={0.7} />
      <rect x={311} y={LANCE_Y - 10} width={8} height={20} rx={2} {...PAINT.raised} />
      <rect x={446} y={LANCE_Y - 12} width={10} height={24} rx={2} {...PAINT.raised} />
      <Flange x={MAN.x - 4} y={LANCE_Y} w={16} />
      {/* manifold */}
      <Housing x={MAN.x} y={MAN.y} w={MAN.w} h={MAN.h} rx={8} panel={[12, 22, MAN.w - 24, 12]} />
    </g>
  );
}

function PrimaryAirFan() {
  const { cx, cy, r } = FAN;
  return (
    <g>
      <BaseFrame x={518} y={449} w={240} h={8} ground={457} bolts={6} />
      <path d={`M ${cx - 16} ${cy + 18} L ${cx + 16} ${cy + 18} L ${cx + 20} 449 L ${cx - 20} 449 Z`} {...PAINT.body} />
      <rect x={cx} y={cy - 3} width={652 - cx} height={6} rx={1.5} {...PAINT.shaft} />
      <Volute cx={cx} cy={cy} r={r} outH={8} dir={-1} />
      <PedestalBearing x={627} y={cy} w={18} base={449} />
      <Coupling x={639} y={cy - 7} w={10} h={14} />
      {[662, 712].map((fx) => (
        <rect key={fx} x={fx} y={441} width={8} height={8} rx={1} {...PAINT.body} />
      ))}
      <g transform={`translate(${2 * 689.5} 0) scale(-1 1)`}>
        <Motor x={652} y={397} w={75} h={44} />
      </g>
    </g>
  );
}

function CoalSide() {
  return (
    <g>
      {/* platform and its columns */}
      {[873, 999].map((x) => (
        <g key={x}>
          <rect x={x} y={298} width={6} height={GROUND - 298 - 4} rx={1} {...PAINT.body} />
          <rect x={x - 4} y={GROUND - 5} width={14} height={5} rx={1} {...PAINT.raised} />
        </g>
      ))}
      <rect x={866} y={290} width={146} height={8} rx={1.5} {...PAINT.body} />
      {/* fine-coal bin */}
      <Silo x={BIN.x} w={BIN.w} roofY={BIN.roof} cylBottom={BIN.cyl} coneBottom={BIN.cone} outletW={16} legBottom={291} braceFrom={240} ladder={false} />
      <rect x={902} y={89} width={78} height={48} rx={4} {...PAINT.recess} />
      <path d="M 905 127 Q 941 122 977 126 L 977 134 L 905 134 Z" {...PAINT.material} opacity={0.85} />
      <Radar x={BIN_CX + 0.5} y={BIN.roof - BIN.w * 0.07} h={16} />
      <rect x={880} y={124} width={6} height={8} rx={1} {...PAINT.raised} />
      {/* CO analyser and sample line */}
      <line x1={BIN.x + BIN.w + 2} y1={103} x2={1019} y2={103} stroke={MX.fine} strokeWidth={1.1} strokeDasharray="4 3" />
      <rect x={1019} y={83} width={53} height={34} rx={5} {...PAINT.body} />
      <rect x={1026} y={89} width={40} height={20} rx={2.5} {...PAINT.recess} />
      {/* chute and kiln coal feeder */}
      <rect x={BIN_CX - 5} y={BIN.cone + 10} width={10} height={FEED.y - BIN.cone - 10} {...PAINT.shaft} />
      <rect x={FEED.x} y={FEED.y} width={FEED.w} height={FEED.h} rx={5} {...PAINT.body} />
      <rect x={FEED.x + 7} y={FEED.y + 6} width={28} height={14} rx={2} {...PAINT.recess} />
      <rect x={BIN_CX - 5} y={FEED.y + FEED.h} width={10} height={LINE_Y - FEED.y - FEED.h - 5} {...PAINT.shaft} />

      {/* coal conveying blower set */}
      <BaseFrame x={1003} y={448} w={135} h={8} ground={456} bolts={5} />
      <rect x={1065} y={396} width={13} height={5} {...PAINT.shaft} />
      <RootsBlower x={1013} y={375} w={52} h={46} />
      <rect x={1020} y={421} width={38} height={27} rx={2} {...PAINT.body} />
      {[1084, 1116].map((fx) => (
        <rect key={fx} x={fx} y={425} width={7} height={23} rx={1} {...PAINT.body} />
      ))}
      <g transform={`translate(${2 * 1103} 0) scale(-1 1)`}>
        <Motor x={1078} y={389} w={50} h={36} />
      </g>
      <TapBoss x={COAL_X} y={315.5} s={8} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={10} x2={1135} y={GROUND} />
      <KilnAndHood />
      <PrimaryAirFan />
      <BurnerAndAir />
      <CoalSide />

      <MachineLabel x={149.4} y={173} size={8.2}>
        KILN (BURNING ZONE)
      </MachineLabel>
      <MachineLabel x={419.8} y={111.6} size={8.2}>
        KILN HOOD
      </MachineLabel>
      <MachineLabel x={382.5} y={440} size={7.5}>
        COOLER
      </MachineLabel>
      <MachineLabel x={458} y={441.5} anchor="start" size={7.5}>
        SECONDARY AIR
      </MachineLabel>
      <MachineLabel x={373.2} y={51.5} size={7.5}>
        FLAME CAMERA
      </MachineLabel>
      <MachineLabel x={704} y={297.5} anchor="end" size={7.5}>
        BURNER MANIFOLD
      </MachineLabel>
      <MachineLabel x={460} y={233} anchor="start" size={7.5}>
        MULTI-CHANNEL BURNER
      </MachineLabel>
      <MachineLabel x={833} y={182} anchor="start" size={7.5}>
        SWIRL
      </MachineLabel>
      <MachineLabel x={833} y={201.5} anchor="start" size={7.5}>
        AXIAL
      </MachineLabel>
      <MachineLabel x={637} y={473} size={7.5}>
        PRIMARY-AIR FAN
      </MachineLabel>
      <MachineLabel x={941} y={123} size={8.2} tone="ink">
        FINE COAL
      </MachineLabel>
      <MachineLabel x={1045.6} y={130} size={6.8}>
        CO ANALYSER
      </MachineLabel>
      <MachineLabel x={936} y={418} size={7.5}>
        KILN COAL FEEDER
      </MachineLabel>
      <MachineLabel x={1064.5} y={473} size={7.5}>
        COAL CONVEYING BLOWER
      </MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 23. */
const pads: LineSheetArt["pads"] = {
  "TMP-BRN-02": [368.5, 390.5],
  "CAM-BRN-01": [374, 74],
  "PRS-BRN-01": [780.5, 225.5],
  "PRS-BRN-02": [803, 248],
  "PRS-BRN-03": [675.5, 330.5],
  "VIB-BRN-01": [593, 420.5],
  "TMP-BRN-01": [627.5, 417.5],
  "ELE-BRN-01": [686.5, 387.5],
  "LEV-BRN-01": [941.5, 44],
  "TMP-BRN-04": [885.5, 128],
  "GAS-BRN-01": [1046.5, 100],
  "FLO-BRN-01": [964, 311],
  "PRS-BRN-04": [863, 315.5],
  "VIB-BRN-02": [1039, 398],
  "ELE-BRN-02": [1103, 384.5],
};

export const sheet: LineSheetArt = { id: "B-0", ready: true, width: W, height: H, Art, pads };
