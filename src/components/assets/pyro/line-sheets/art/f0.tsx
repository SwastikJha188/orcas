/**
 * Sheet F-0 — FSL-01 + KFS-01 · Feed system — stage overview (PYR-FED-01).
 *
 * Composition of the stage-overview PDF page 1, left → right: control cabinet;
 * two aeration blowers (motor + volute) on a skid with the header rising up and
 * over into the silo cone; the feed silo on its structure with caged ladder,
 * roof, roof dust collector and its fan, the six extraction gates under the
 * cone discharging through a collecting hopper into the kiln feed bin (bin
 * filter + fan, three load cells on the support beam);
 * bin outlet gates A / B and air slides down to SFM A (left) and SFM B
 * (right); the slide blower with its air line; the common air slide along the
 * ground to the bucket-elevator boot; the elevator casing, head with discharge
 * spout toward the preheater, and the head drive (bearing, coupling, gearbox,
 * motor) on its platform.
 *
 * Units: PDF page rendered 1654 × 774.
 */
import React from "react";
import { Bolt, Fan, GroundLine, MX, MachineLabel, Motor, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { AirSlide, Cabinet, Ladder, Pipe, Volute } from "../../drawings/fkp-parts";
import type { LineSheetArt } from "../types";
import { ConeRoof, Vessel } from "./parts-f";
import { FlowArrow } from "./parts-f2";

const W = 1654;
const H = 774;
const GROUND = 695;

/* ------------------------------------------------------------------ */
/* Local helpers                                                       */
/* ------------------------------------------------------------------ */

/** Gold material-flow arrow (process material). */
const MaterialArrow = FlowArrow;

/** Small instrument head (switch / transmitter body) centred on (x, y). */
function Instr({ x, y, w = 12, h = 12 }: { x: number; y: number; w?: number; h?: number }) {
  return <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={Math.min(3, h / 3)} {...PAINT.body} />;
}

/** Solid-flow meter: housing with a sight window and impact plate; transmitter on `side`. */
function FlowMeter({ x, y, side }: { x: number; y: number; side: 1 | -1 }) {
  const tx = side < 0 ? x - 25 : x + 75;
  return (
    <g aria-hidden="true">
      {/* transmitter and its stub */}
      <rect x={side < 0 ? x - 4 : x + 70} y={y + 17} width={4} height={6} {...PAINT.shaft} />
      <rect x={tx} y={y + 8} width={22} height={20} rx={3} {...PAINT.body} />
      <rect x={tx + 4} y={y + 12} width={14} height={8} rx={1.5} {...PAINT.recess} />
      {/* pressure tap on top with its transmitter head */}
      <rect x={x + 33} y={y - 6} width={4} height={7} {...PAINT.shaft} />
      <Instr x={x + 35} y={y - 9} w={13} h={10} />
      <rect x={x} y={y} width={70} height={50} rx={6} {...PAINT.body} />
      <rect x={x + 9} y={y + 9} width={52} height={32} rx={3} {...PAINT.recess} />
      <line x1={x + 17} y1={y + 17} x2={x + 51} y2={y + 34} stroke={MX.metal} strokeWidth={2.4} strokeLinecap="round" />
      {/* feed drop to the common air slide */}
      <rect x={x + 33.5} y={y + 50} width={3} height={21} {...PAINT.material} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Equipment                                                           */
/* ------------------------------------------------------------------ */

function CabinetAndBlowers() {
  return (
    <g>
      {/* control cabinet on its plinth */}
      <rect x={54} y={685} width={68} height={10} rx={2} {...PAINT.body} />
      <Cabinet x={61} y={562} w={55} h={123} />
      {/* blower skid */}
      <rect x={117} y={682} width={311} height={9} rx={2} {...PAINT.body} />
      {[124, 270, 421].map((x) => (
        <Bolt key={x} x={x} y={686.5} r={1.3} />
      ))}
      {/* header: both volute outlets up, across, riser to the silo */}
      <Pipe
        pts={[
          [229, 628],
          [229, 597],
          [380, 597],
          [380, 628],
        ]}
        d={9}
      />
      {/* blower 1 */}
      <rect x={138} y={676} width={60} height={6} rx={1} {...PAINT.raised} />
      <Motor x={131} y={636} w={74} h={42} />
      <Volute cx={245} cy={659} r={23} outH={8} dir={-1} />
      <rect x={232} y={681} width={30} height={2} {...PAINT.raised} />
      {/* blower 2 */}
      <rect x={290} y={676} width={60} height={6} rx={1} {...PAINT.raised} />
      <Motor x={283} y={636} w={74} h={42} />
      <Volute cx={396} cy={659} r={23} outH={8} dir={-1} />
    </g>
  );
}

function FeedSilo() {
  const gates = [571.8, 601.8, 631.8, 661.5, 691.5, 721.5];
  return (
    <g>
      {/* structure: ladder and the two columns down to the ground */}
      <Ladder x={504} y1={112} y2={GROUND} w={17} />
      {[542, 734].map((x) => (
        <g key={x}>
          <rect x={x} y={286} width={8} height={GROUND - 286} rx={1.2} {...PAINT.body} />
          <line x1={x + 4} x2={x + 4} y1={292} y2={GROUND - 6} {...PAINT.hair} />
          <rect x={x - 5} y={GROUND - 4} width={18} height={4} rx={1} {...PAINT.raised} />
        </g>
      ))}
      {/* roof: rail behind, roof plate, radar nozzle, dust collector + fan */}
      <ConeRoof x0={527.5} x1={757.5} y={122} peak={104} rail={20} step={22} />
      <rect x={585} y={96} width={8} height={15} rx={1.5} {...PAINT.shaft} />
      <rect x={580} y={90} width={18} height={9} rx={2.5} {...PAINT.body} />
      <rect x={792} y={52} width={10} height={50} rx={2} {...PAINT.body} />
      <rect x={714} y={86} width={14} height={8} {...PAINT.shaft} />
      <circle cx={739} cy={90} r={13} {...PAINT.body} />
      <circle cx={739} cy={90} r={8} fill="none" stroke={MX.fine} strokeWidth={1} />
      <rect x={750} y={86} width={4} height={8} {...PAINT.shaft} />
      <rect x={753} y={81} width={36} height={18} rx={3} {...PAINT.body} />
      <rect x={760} y={85.5} width={22} height={9} rx={1.5} {...PAINT.recess} />
      <rect x={789} y={86} width={4} height={8} {...PAINT.shaft} />
      <rect x={642} y={76} width={75} height={33} rx={3} {...PAINT.body} />
      {[660, 679.5, 699].map((x) => (
        <line key={x} x1={x} x2={x} y1={80} y2={105} {...PAINT.hair} />
      ))}
      <rect x={644} y={69} width={71} height={9} rx={2.5} {...PAINT.raised} />
      {/* shell, ring beam, cone to the gate row */}
      <Vessel
        x0={527.5}
        x1={757.5}
        top={122}
        ring={276}
        coneBot={366}
        outW={170}
        seams={[150, 180, 248]}
        win={[563, 158, 158, 78]}
        level={192}
        flangeH={12}
        bolts={18}
      />
      <MachineLabel x={642} y={218} size={13} tone="ink">
        FEED SILO
      </MachineLabel>
      {/* material streams in the cone, one per extraction gate */}
      {gates.map((gx, i) => (
        <line key={gx} x1={548 + i * 38} y1={291} x2={gx} y2={362} stroke={MX.material} strokeWidth={1.6} opacity={0.75} />
      ))}
      {/* six extraction gates with their limit switches */}
      {gates.map((gx) => (
        <g key={gx}>
          <rect x={gx - 10} y={365} width={20} height={11} rx={2} {...PAINT.body} />
          <rect x={gx - 6} y={369.5} width={12} height={2.5} {...PAINT.material} />
          <rect x={gx - 1.5} y={376} width={3} height={6} {...PAINT.shaft} />
          <Instr x={gx} y={389} w={13} h={13} />
        </g>
      ))}
    </g>
  );
}

function KilnFeedBin() {
  return (
    <g>
      {/* collecting hopper under the gates and the inlet chute */}
      <path d="M 555 405 L 735 405 L 653 435 L 617 435 Z" {...PAINT.cylinderV} />
      <rect x={553} y={402} width={184} height={5} rx={1.5} {...PAINT.raised} />
      <rect x={630} y={435} width={25} height={21} rx={2} {...PAINT.body} />
      <MaterialArrow x1={642.5} y1={438} x2={642.5} y2={453} head={7} />
      {/* bin dust filter and fan */}
      <rect x={711} y={437} width={9} height={6} {...PAINT.shaft} />
      <circle cx={727.5} cy={440} r={7.5} {...PAINT.body} />
      <circle cx={727.5} cy={440} r={4} fill="none" stroke={MX.fine} strokeWidth={1} />
      {/* fan motor */}
      <rect x={735} y={437.5} width={3} height={5} {...PAINT.shaft} />
      <rect x={737.5} y={432} width={19} height={16} rx={3} {...PAINT.body} />
      <rect x={738.5} y={428} width={7} height={4.5} rx={1} {...PAINT.raised} />
      <rect x={672} y={430} width={40} height={27} rx={2.5} {...PAINT.body} />
      <rect x={670} y={426} width={44} height={6} rx={2} {...PAINT.raised} />
      {[685, 699].map((x) => (
        <line key={x} x1={x} x2={x} y1={434} y2={453} {...PAINT.hair} />
      ))}
      {/* bin: roof flange, shell, support beam with three load cells, cone */}
      <path d="M 582 523 L 705 523 L 663 562 L 626 562 Z" {...PAINT.cylinderV} />
      <rect x={572} y={463} width={140} height={47} rx={2} {...PAINT.cylinderV} />
      {[471, 478].map((y) => (
        <line key={y} x1={574} x2={710} y1={y} y2={y} stroke={MX.fine} strokeWidth={1} />
      ))}
      <rect x={567} y={456} width={155} height={8} rx={2} {...PAINT.raised} />
      <MachineLabel x={642} y={475} size={8} tone="ink">
        KILN FEED BIN
      </MachineLabel>
      <rect x={576} y={508} width={132} height={6} rx={1.5} {...PAINT.raised} />
      {[590, 643.5, 697].map((x) => (
        <path key={x} d={`M ${x - 8} 515 L ${x} 503 L ${x + 8} 515 Z`} fill={MX.air} stroke={MX.edge} strokeWidth={0.8} strokeLinejoin="round" opacity={0.85} />
      ))}
      <rect x={540} y={515} width={204} height={9} rx={1.5} {...PAINT.body} />
      {/* outlet gates A / B */}
      {[622, 652].map((x) => (
        <g key={x}>
          <rect x={x} y={561} width={16} height={11} rx={2} {...PAINT.body} />
          <rect x={x + 3.5} y={565.5} width={9} height={2.5} {...PAINT.material} />
        </g>
      ))}
      {/* chute supports to the ground (behind) */}
      <line x1={627} y1={574} x2={643} y2={690} {...PAINT.hair} />
      <line x1={662} y1={574} x2={643} y2={690} {...PAINT.hair} />
      {/* air slides from the gates to SFM A / SFM B, P1 tap at their junction */}
      <AirSlide x1={625} y1={578} x2={512} y2={606} d={9} />
      <AirSlide x1={663} y1={578} x2={787} y2={606} d={9} />
      <Instr x={644} y={588} w={12} h={12} />
    </g>
  );
}

function SlideBlower() {
  return (
    <g>
      {/* air line (dashed) from the slide blower to the slide air boxes */}
      <path
        d="M 457 508 V 500 H 527 V 592 H 634 M 527 522 H 695"
        fill="none"
        stroke={MX.air}
        strokeWidth={1.6}
        strokeDasharray="5 3"
        strokeLinejoin="round"
      />
      <rect x={437} y={537} width={95} height={9} rx={2} {...PAINT.raised} />
      <circle cx={457} cy={522} r={14} {...PAINT.body} />
      <Fan cx={457} cy={522} r={9} />
      <rect x={470} y={519} width={10} height={6} {...PAINT.shaft} />
      <Motor x={484} y={510} w={38} h={26} />
    </g>
  );
}

function SolidFlowMeters() {
  return (
    <g>
      <FlowMeter x={440} y={602} side={-1} />
      <FlowMeter x={789} y={602} side={1} />
      {/* common air slide along the ground into the elevator boot */}
      <AirSlide x1={451} y1={676} x2={1161} y2={688} d={10} />
      {/* air-box pressure tap on the common slide */}
      <rect x={992.5} y={684} width={3} height={8} {...PAINT.shaft} />
      <Instr x={994} y={681.2} w={12} h={11} />
    </g>
  );
}

function Elevator() {
  const buckets: React.ReactNode[] = [];
  for (let y = 182, i = 0; y < 620; y += 17.5, i++) {
    const left = i % 2 === 0;
    buckets.push(<rect key={y} x={left ? 1198.5 : 1210} y={y} width={11} height={6} rx={1.5} fill={MX.flatRaised} stroke={MX.edge} strokeWidth={0.8} />);
  }
  return (
    <g>
      {/* casing */}
      <rect x={1184} y={168} width={52} height={462} rx={2} {...PAINT.cylinderV} />
      <rect x={1196} y={176} width={28} height={446} rx={2} {...PAINT.recess} />
      <line x1={1204.5} x2={1204.5} y1={178} y2={620} stroke={MX.fine} strokeWidth={1} />
      <line x1={1215.5} x2={1215.5} y1={178} y2={620} stroke={MX.fine} strokeWidth={1} />
      {buckets}
      {[267, 408, 549].map((y) => (
        <g key={y}>
          <rect x={1179} y={y - 2.5} width={62} height={5} rx={1.5} {...PAINT.raised} />
          <Bolt x={1182} y={y} r={0.9} />
          <Bolt x={1238} y={y} r={0.9} />
        </g>
      ))}
      {/* inspection door (left) and belt sway switch (right) */}
      <rect x={1171} y={220} width={13} height={20} rx={2} {...PAINT.body} />
      <Instr x={1242} y={230} w={11} h={13} />
      {/* boot with tail pulley and boot level switch */}
      <rect x={1151} y={652} width={10} height={15} rx={2} {...PAINT.body} />
      <rect x={1160} y={626} width={100} height={69} rx={7} {...PAINT.body} />
      <circle cx={1210} cy={660} r={23} {...PAINT.raised} />
      <circle cx={1210} cy={660} r={7} {...PAINT.shaft} />
      {/* discharge spout toward the preheater */}
      <path d="M 1160 126 L 1072 182 L 1072 202 L 1160 150 Z" {...PAINT.body} />
      <rect x={1068} y={179} width={6} height={26} rx={1.5} {...PAINT.raised} />
      <MaterialArrow x1={1062} y1={198} x2={1012} y2={228} head={10} />
      {/* head with head pulley */}
      <rect x={1156} y={105} width={108} height={67} rx={10} {...PAINT.body} />
      <circle cx={1210} cy={138} r={27} {...PAINT.raised} />
      <circle cx={1210} cy={138} r={19} fill="none" stroke={MX.fine} strokeWidth={1} />
      <circle cx={1210} cy={138} r={8} {...PAINT.shaft} />
    </g>
  );
}

function HeadDrive() {
  return (
    <g>
      {/* platform */}
      <rect x={1264} y={169} width={286} height={8} rx={1.5} {...PAINT.body} />
      <rect x={1237} y={134.5} width={45} height={7} {...PAINT.shaft} />
      {/* head-shaft bearing */}
      <path d="M 1276 150 H 1292 L 1296 169 H 1272 Z" {...PAINT.body} />
      <rect x={1274} y={121} width={20} height={34} rx={4} {...PAINT.raised} />
      <line x1={1276} x2={1292} y1={138} y2={138} {...PAINT.hair} />
      {/* low-speed coupling */}
      <rect x={1295} y={129} width={20} height={18} rx={3} {...PAINT.body} />
      {[1300, 1305, 1310].map((x) => (
        <line key={x} x1={x} x2={x} y1={132} y2={144} {...PAINT.hair} />
      ))}
      {/* gearbox */}
      <rect x={1340} y={102} width={48} height={10} rx={2.5} {...PAINT.raised} />
      <rect x={1320} y={110} width={75} height={57} rx={5} {...PAINT.body} />
      <rect x={1325} y={115} width={65} height={47} rx={3} fill="none" stroke={MX.fine} strokeWidth={1} />
      {[
        [1325, 115],
        [1390, 115],
        [1325, 162],
        [1390, 162],
      ].map(([x, y]) => (
        <Bolt key={`${x}${y}`} x={x} y={y} r={1.4} />
      ))}
      <circle cx={1340} cy={145} r={8} {...PAINT.raised} />
      <circle cx={1340} cy={145} r={3} {...PAINT.shaft} />
      <circle cx={1367} cy={136} r={15} {...PAINT.raised} />
      <circle cx={1367} cy={136} r={10} fill="none" stroke={MX.fine} strokeWidth={1} />
      <circle cx={1367} cy={136} r={4.5} {...PAINT.shaft} />
      {/* high-speed shaft and coupling */}
      <rect x={1395} y={135} width={22} height={6} {...PAINT.shaft} />
      <rect x={1414} y={130} width={19} height={17} rx={3} {...PAINT.body} />
      {[1420, 1426].map((x) => (
        <line key={x} x1={x} x2={x} y1={133} y2={144} {...PAINT.hair} />
      ))}
      {/* motor (shaft to the left, fan cowl right) */}
      <rect x={1445} y={164} width={95} height={6} rx={1.5} {...PAINT.raised} />
      <rect x={1550} y={120} width={32} height={40} rx={8} {...PAINT.body} />
      <rect x={1470} y={102} width={45} height={14} rx={4} {...PAINT.body} />
      <rect x={1434} y={115} width={118} height={50} rx={8} {...PAINT.body} />
      {[125, 135, 145, 155].map((y) => (
        <line key={y} x1={1446} x2={1540} y1={y} y2={y} stroke={MX.fine} strokeWidth={1} />
      ))}
      <rect x={1473} y={133} width={40} height={12} rx={2} {...PAINT.recess} />
    </g>
  );
}

function Labels() {
  const bottom: [number, string][] = [
    [88.5, "CABINET"],
    [273, "AERATION BLOWERS"],
    [475, "SFM A"],
    [642, "FEED SILO + KILN FEED BIN"],
    [823, "SFM B"],
    [993, "COMMON AIR SLIDE"],
    [1209, "BUCKET ELEVATOR"],
  ];
  return (
    <g>
      {bottom.map(([x, t]) => (
        <MachineLabel key={t} x={x} y={724} size={10}>
          {t}
        </MachineLabel>
      ))}
      <MachineLabel x={1442.5} y={194} size={9.5}>
        HEAD DRIVE
      </MachineLabel>
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={54} x2={1604} y={GROUND} />
      <FeedSilo />
      {/* aeration riser from the header up and over into the silo cone */}
      <Pipe
        pts={[
          [316, 597],
          [316, 334],
          [548, 334],
        ]}
        d={12}
        flanges={[
          [316, 466],
          [470, 334],
        ]}
      />
      <CabinetAndBlowers />
      <KilnFeedBin />
      <SlideBlower />
      <SolidFlowMeters />
      <Elevator />
      <HeadDrive />
      <Labels />
    </g>
  );
}

/** Pad centre per point (sheet units): PDF pad centres; the three load cells, the SFM pressure heads and the two cabinet indicators sit on their drawn instruments. */
const pads: LineSheetArt["pads"] = {
  // feed silo: radar, roof dust collector + fan, six outlet gates (1 → 6, left → right)
  "LEV-FSL-01": [589.2, 86.2],
  "PRS-FSL-02": [679.2, 91.5],
  "ELE-FSL-02": [770.8, 90.5],
  "POS-FSL-01": [571.8, 390.8],
  "POS-FSL-02": [601.8, 390.8],
  "POS-FSL-03": [631.8, 390.8],
  "POS-FSL-04": [661.5, 390.8],
  "POS-FSL-05": [691.5, 390.8],
  "POS-FSL-06": [721.5, 390.8],
  // aeration: cabinet, blowers, header
  "STS-FSL-02": [88.8, 570],
  "STS-FSL-03": [88.8, 601],
  "ELE-FSL-01": [167.2, 631.8],
  "TMP-FSL-01": [186.5, 670.5],
  "PRS-FSL-01": [316.8, 404.8],
  // kiln feed bin: bin filter + fan, three load cells
  "PRS-KFS-05": [692.5, 442],
  "ELE-KFS-03": [741.5, 429.5],
  "WGT-KFS-01": [590, 509],
  "WGT-KFS-02": [643.5, 509],
  "WGT-KFS-03": [697, 509],
  "WGT-KFS-AVG": [643.5, 509],
  // bin discharge: gates A / B, P1, slide blower
  "POS-KFS-01": [617.5, 554.5],
  "POS-KFS-02": [670.5, 554.5],
  "PRS-KFS-01": [644, 588],
  "STS-KFS-01": [441.5, 496.5],
  "ELE-KFS-02": [496, 505],
  // solid-flow meters and the common air slide
  "PRS-KFS-02": [475, 593],
  "FLO-KFS-01": [426.8, 618.8],
  "PRS-KFS-06": [823.5, 593],
  "FLO-KFS-02": [875.5, 618.8],
  "PRS-KFS-04": [994, 681.2],
  // bucket elevator
  "LEV-KFS-04": [1145.5, 659.2],
  "LIM-KFS-01": [1242.2, 229.8],
  "SPD-KFS-01": [1209.8, 139],
  "TMP-KFS-01": [1283.5, 139],
  "VIB-KFS-01": [1357.5, 114.2],
  "ELE-KFS-01": [1497.2, 109.2],
  "TMP-KFS-02": [1516.5, 151.5],
};

/**
 * Value-block slots. Plates run along the equipment on the anchored side; the
 * gate row, the centre load cell and the silo filter stand off at these slots.
 */
const callouts: LineSheetArt["callouts"] = {
  "LEV-FSL-01": [560, 86, "end"],
  "PRS-FSL-02": [679, 58, "middle"],
  "ELE-FSL-02": [800, 90.5, "start"],
  "POS-FSL-01": [550, 391, "end"],
  "POS-FSL-02": [608, 358, "end"],
  "POS-FSL-03": [638, 330, "end"],
  "POS-FSL-04": [655, 330, "start"],
  "POS-FSL-05": [685, 358, "start"],
  "POS-FSL-06": [740, 391, "start"],
  "STS-FSL-02": [105, 570, "start"],
  "STS-FSL-03": [105, 601, "start"],
  "ELE-FSL-01": [185, 632, "start"],
  "TMP-FSL-01": [200, 670.5, "start"],
  "PRS-FSL-01": [300, 405, "end"],
  "PRS-KFS-05": [670, 442, "end"],
  "ELE-KFS-03": [760, 429.5, "start"],
  "WGT-KFS-01": [570, 509, "end"],
  "WGT-KFS-02": [643.5, 489, "middle"],
  "WGT-KFS-03": [715, 509, "start"],
  "WGT-KFS-AVG": [643.5, 489, "middle"],
  "POS-KFS-01": [600, 554.5, "end"],
  "POS-KFS-02": [690, 554.5, "start"],
  "PRS-KFS-01": [660, 588, "start"],
  "STS-KFS-01": [420, 496.5, "end"],
  "ELE-KFS-02": [520, 470, "middle"],
  "PRS-KFS-02": [490, 593, "start"],
  "FLO-KFS-01": [445, 619, "start"],
  "PRS-KFS-06": [840, 593, "start"],
  "FLO-KFS-02": [890, 619, "start"],
  "PRS-KFS-04": [975, 681, "end"],
  "LEV-KFS-04": [1130, 659, "end"],
  "LIM-KFS-01": [1260, 230, "start"],
  "SPD-KFS-01": [1180, 139, "end"],
  "TMP-KFS-01": [1300, 139, "start"],
  "VIB-KFS-01": [1330, 114, "end"],
  "ELE-KFS-01": [1520, 109, "start"],
  "TMP-KFS-02": [1540, 151.5, "start"],
};

/** The mimic shows the three load cells as one block: their mean, on the centre cell. */
const averages: LineSheetArt["averages"] = {
  "WGT-KFS-AVG": { tags: ["WGT-KFS-01", "WGT-KFS-02", "WGT-KFS-03"], label: "BIN CELLS AVG" },
};

export const sheet: LineSheetArt = { id: "F-0", ready: true, width: W, height: H, Art, pads, callouts, averages };
