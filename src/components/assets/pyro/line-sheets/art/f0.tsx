/**
 * Sheet F-0 — FSL-01 + KFS-01 · Feed silo and kiln feed system — Overview (design Feed Rev02, PYR-FED-01).
 *
 * Drawn in the design's 2000 × 1125 frame, left → right: the silo aeration blower with its header and the
 * aeration manifold into the silo cone, the purge-sequence panel; the feed silo (level radar, roof dust collector
 * with fan and stack, FEED SILO window) over the six motorised outlet gates (manual / pneumatic / motor), the
 * collecting hopper, the bin dust collector and the kiln feed bin on three load cells; bin gates A / B with air
 * slides down to SFM A / SFM B, each slide with its blower; the common air slide along the ground to the bucket
 * elevator boot; the elevator casing up to the head, its drive (motor, gearbox, coupling, NDE bearing) and the
 * spout to the preheater-top air slide with two airlocks in series. Readout blocks stand round it (`readouts`);
 * every instrument ring of the design carries its pad (Rev 02 register).
 */
import React from "react";
import { Bolt, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import type { LineSheetArt } from "../types";
import { FanSet, Head } from "./parts-d";
import { AirLine, Airlock, DriveMotor, FlowMeter, Slide } from "./parts-fd";

const W = 2000;
const H = 1125;
const GROUND = 790.5;
const MEAL = MX.material;
const GATES = [820, 845, 870, 894.6, 919, 944];

function Pipe({ d }: { d: string }) {
  return <path d={d} fill="none" stroke={MX.edge} strokeWidth={2.8} strokeLinejoin="round" strokeLinecap="round" aria-hidden="true" />;
}

function SiloAeration() {
  // aeration manifold into the cone: one nozzle per level, each to the cone wall
  const coneX = (y: number) => 786 + (y - 453.7) * 0.379;
  const nozzles = [455, 464.5, 474, 483.5, 493, 502.5];
  return (
    <g>
      <Pipe d="M 615.7 481 V 473 H 754" />
      <Pipe d="M 754 455 V 502.5" />
      {nozzles.map((y) => (
        <Pipe key={y} d={`M 754 ${y} H ${coneX(y) + 5}`} />
      ))}
      <FanSet cx={615.7} cy={492} r={8.6} />
      {/* purge-sequence panel */}
      <rect x={557} y={579.4} width={34.4} height={29.2} rx={4} {...PAINT.body} />
    </g>
  );
}

function FeedSilo() {
  return (
    <g>
      {/* roof: rail and posts, gable line */}
      <line x1={788} x2={972} y1={297} y2={297} stroke={MX.edge} strokeWidth={1.4} />
      {[788, 806, 824, 860, 878, 950, 970].map((x) => (
        <line key={x} x1={x} x2={x} y1={297} y2={x < 885 ? 317 - ((x - 777) * 18) / 108 : 300 + ((x - 885) * 17) / 95} stroke={MX.edge} strokeWidth={1.2} />
      ))}
      <path d="M 777 317.5 L 885 299 L 980 317.5" fill="none" stroke={MX.edge} strokeWidth={2.4} strokeLinejoin="round" />

      {/* level radar */}
      <rect x={829.5} y={292} width={10} height={12} rx={2.5} {...PAINT.body} />
      <rect x={833} y={304} width={3} height={5} {...PAINT.shaft} />

      {/* roof dust collector, its fan, motor and stack */}
      <rect x={878.6} y={272} width={60.8} height={31.7} rx={3} {...PAINT.body} />
      <rect x={878.6} y={272} width={60.8} height={7} rx={2.5} {...PAINT.raised} />
      {[890, 903, 916, 927].map((x) => (
        <line key={x} x1={x} x2={x} y1={282} y2={300} {...PAINT.hair} />
      ))}
      <rect x={939} y={285.5} width={9} height={6} {...PAINT.shaft} />
      <circle cx={958.6} cy={288.6} r={11.4} {...PAINT.body} />
      <rect x={969.5} y={285.5} width={2} height={6} {...PAINT.shaft} />
      <rect x={970} y={282} width={29} height={15} rx={3.5} {...PAINT.body} />
      <rect x={1002} y={258} width={9} height={38} rx={2.5} {...PAINT.cylinderV} />

      {/* shell with bands and the FEED SILO window */}
      <rect x={783} y={317.5} width={190} height={126} rx={3} {...PAINT.cylinderV} />
      {[343, 421.5].map((y) => (
        <line key={y} x1={786} x2={970} y1={y} y2={y} stroke={MX.edge} strokeWidth={1.3} />
      ))}
      {[369, 396].map((y) => (
        <g key={y}>
          <line x1={786} x2={810} y1={y} y2={y} stroke={MX.edge} strokeWidth={1.3} />
          <line x1={946} x2={970} y1={y} y2={y} stroke={MX.edge} strokeWidth={1.3} />
        </g>
      ))}
      <rect x={813} y={346} width={132} height={65} rx={6} fill={MX.padPanel} stroke={MX.fine} strokeWidth={1.4} />
      <path d="M 816.6 375 Q 878.6 366.5 940.6 375 V 406.6 H 816.6 Z" fill={MEAL} />
      <MachineLabel x={878.6} y={393.5} size={10.5} tone="ink">
        FEED SILO
      </MachineLabel>

      {/* ring beam and cone, meal streaming to the gates */}
      <path d="M 786 453.7 L 971 453.7 L 948.6 513.4 L 808.6 513.4 Z" {...PAINT.cylinderV} />
      {[794, 826, 857, 889, 920, 951].map((x, i) => (
        <line key={x} x1={x} y1={455} x2={GATES[i]} y2={513} stroke={MEAL} strokeWidth={1.4} />
      ))}
      <rect x={778} y={443.4} width={201} height={10.3} rx={3} {...PAINT.raised} />

      {/* six motorised outlet gates: manual / pneumatic / motor */}
      {GATES.map((x) => (
        <g key={x}>
          {[
            [515, MX.fine],
            [525.2, MX.air],
            [535.4, MEAL],
          ].map(([y, c]) => (
            <g key={y as number}>
              <rect x={x - 7.5} y={y as number} width={15} height={8.4} rx={2} {...PAINT.raised} />
              <rect x={x - 4.5} y={(y as number) + 3.6} width={9} height={1.3} fill={c as string} />
            </g>
          ))}
          <rect x={x - 1} y={544} width={2} height={4.5} {...PAINT.shaft} />
        </g>
      ))}
      {[
        [521.5, "MAN"],
        [531.8, "PNEU"],
        [542, "MOT"],
      ].map(([y, t]) => (
        <MachineLabel key={t} x={809.5} y={y as number} size={5} tone="ink" anchor="end">
          {t}
        </MachineLabel>
      ))}
    </g>
  );
}

function KilnFeedBin() {
  return (
    <g>
      {/* collecting hopper and chute into the bin */}
      <path d="M 806 563 L 950.6 563 L 901.4 583.7 L 855.7 583.7 Z" {...PAINT.cylinderV} />
      <rect x={867.7} y={583.7} width={21} height={16.3} rx={2.5} {...PAINT.body} />
      <rect x={877.4} y={586.5} width={1.6} height={4} fill={MEAL} />
      <Head x={878.2} y={597.5} dir="down" color={MEAL} s={0.65} />

      {/* bin dust collector and fan */}
      <rect x={937} y={584} width={7} height={5} {...PAINT.shaft} />
      <circle cx={950} cy={586.6} r={6.3} {...PAINT.body} />
      <rect x={903} y={577} width={34} height={21.6} rx={3} {...PAINT.body} />
      <rect x={903} y={574.3} width={34} height={5} rx={2.2} {...PAINT.raised} />
      {[911.6, 917, 923, 928.6].map((x) => (
        <line key={x} x1={x} x2={x} y1={582} y2={596} {...PAINT.hair} />
      ))}

      {/* bin: flange, shell, load cells on the support beam, cone */}
      <path d="M 832 653.7 L 927.5 653.7 L 905.6 675 L 854 675 Z" {...PAINT.cylinderV} />
      <rect x={821} y={607.8} width={117} height={34.2} rx={2} {...PAINT.cylinderV} />
      {[614, 621.5, 637.5].map((y) => (
        <line key={y} x1={824} x2={935} y1={y} y2={y} stroke={MX.edge} strokeWidth={1.2} />
      ))}
      <MachineLabel x={879.7} y={632.5} size={7.2} tone="ink">
        KILN FEED BIN
      </MachineLabel>
      <rect x={816.6} y={601.6} width={125.9} height={6.2} rx={2} {...PAINT.raised} />
      {[835.3, 879.7, 922.8].map((x) => (
        <path key={x} d={`M ${x - 9.5} 647 L ${x} 637 L ${x + 9.5} 647 Z`} fill={MX.air} stroke={MX.edge} strokeWidth={1} strokeLinejoin="round" />
      ))}
      <rect x={812.5} y={647} width={134.5} height={6.7} rx={2} {...PAINT.raised} />

      {/* outlet gates A / B */}
      {[861, 885].map((x) => (
        <g key={x}>
          <rect x={x} y={680} width={14} height={9} rx={2} {...PAINT.raised} />
          <rect x={x + 3} y={684} width={8} height={1.4} fill={MEAL} />
        </g>
      ))}
    </g>
  );
}

function BinDischarge() {
  return (
    <g>
      {/* slide blowers and their air into slides A / B */}
      <AirLine pts={[[716.6, 641], [716.6, 634], [768.75, 634], [768.75, 712]]} />
      <AirLine pts={[[1052.5, 641], [1052.5, 634.5], [991.5, 634.5], [991.5, 712]]} />
      <FanSet cx={716.6} cy={651.6} r={8.5} />
      <FanSet cx={1052.5} cy={652} r={8.5} />

      {/* air slides A / B from the gates to the solid-flow meters */}
      <Slide x1={866} y1={699} x2={755} y2={718} d={7} step={40} />
      <Slide x1={893} y1={699} x2={1004} y2={718} d={7} step={40} />

      {/* solid-flow meters, meal drops to the common slide */}
      <rect x={738.6} y={758} width={2.8} height={13} {...PAINT.material} />
      <rect x={1026.6} y={758} width={2.8} height={15.5} {...PAINT.material} />
      <FlowMeter x={710} y={718} side={-1} />
      <FlowMeter x={1000.8} y={718} side={1} />

      {/* common air slide to the elevator boot, its blower and air line */}
      <Slide x1={717} y1={775} x2={1308} y2={786.5} d={8} step={120} />
      <AirLine pts={[[1220.5, 729], [1220.5, 721.5], [1250, 721.5], [1250, 782]]} />
      <FanSet cx={1222.5} cy={738} r={8} />
    </g>
  );
}

function Elevator() {
  const buckets: React.ReactNode[] = [];
  for (let y = 396, i = 0; y < 726; y += 15.5, i++) {
    buckets.push(<rect key={y} x={i % 2 ? 1349.5 : 1339.5} y={y} width={8} height={5} rx={1.2} {...PAINT.raised} strokeWidth={0.9} />);
  }
  return (
    <g>
      {/* casing with the bucket belt and the meal rising */}
      <rect x={1326.4} y={385} width={44.6} height={350} rx={2} {...PAINT.cylinderV} />
      <rect x={1334} y={390} width={29.6} height={340} rx={2} fill="none" stroke={MX.fine} strokeWidth={0.9} />
      <rect x={1346.9} y={392} width={1.6} height={340} fill={MEAL} />
      {buckets}
      {/* belt sway switch */}
      <rect x={1371} y={419} width={9.5} height={16} rx={2.5} {...PAINT.body} />

      {/* boot with the tail pulley, zero-speed probe and boot level switch */}
      <rect x={1290.5} y={754} width={16} height={14.5} rx={3} {...PAINT.body} />
      <rect x={1307} y={733} width={83} height={58} rx={7} {...PAINT.body} />
      <circle cx={1348} cy={761.8} r={19} {...PAINT.raised} />
      <circle cx={1348} cy={761.8} r={6.5} fill={MX.deep} stroke={MX.fine} strokeWidth={1} />

      {/* head: neck, housing, pulley and shaft */}
      <rect x={1326} y={378} width={44} height={9.5} rx={1.5} {...PAINT.body} />
      {[1335, 1348, 1361].map((x) => (
        <line key={x} x1={x} x2={x} y1={380} y2={386} {...PAINT.hair} />
      ))}
      <path d="M 1390 344 L 1400 340 L 1428 380 L 1428 391 L 1418 391 L 1390 362 Z" {...PAINT.body} />
      <rect x={1303} y={323} width={90} height={56} rx={9} {...PAINT.body} />
      <circle cx={1350} cy={351.7} r={23.3} {...PAINT.raised} />
      <rect x={1298} y={347.8} width={52} height={7.6} {...PAINT.shaft} />
      <rect x={1393} y={347.8} width={7} height={7.6} {...PAINT.shaft} />
      <circle cx={1350} cy={351.7} r={5.2} {...PAINT.shaft} />
      <rect x={1399} y={341.7} width={16} height={20} rx={3} {...PAINT.body} />
    </g>
  );
}

function HeadDrive() {
  return (
    <g>
      <rect x={1199} y={349} width={16} height={7} {...PAINT.shaft} />
      <rect x={1269} y={349} width={14} height={7} {...PAINT.shaft} />
      <DriveMotor x={1112.7} y={332.7} w={86.3} h={40} />
      {/* gearbox */}
      <rect x={1219} y={323} width={44} height={11} rx={3} {...PAINT.body} />
      <rect x={1214} y={331.7} width={56} height={42.3} rx={5} {...PAINT.body} />
      {[
        [1217.5, 336],
        [1266, 336],
        [1217.5, 370],
        [1266, 370],
      ].map(([x, y]) => (
        <Bolt key={`${x}-${y}`} x={x} y={y} r={1.6} />
      ))}
      <circle cx={1228.3} cy={354.3} r={6.7} {...PAINT.raised} />
      <circle cx={1228.3} cy={354.3} r={2.3} fill="none" stroke={MX.edge} strokeWidth={1} />
      <circle cx={1248.3} cy={349.3} r={12.7} {...PAINT.raised} />
      <circle cx={1248.3} cy={349.3} r={4} fill="none" stroke={MX.edge} strokeWidth={1} />
      {/* coupling bearing */}
      <rect x={1278} y={345} width={5} height={12} rx={1} {...PAINT.raised} />
      <rect x={1281.7} y={341.7} width={16.3} height={20} rx={3} {...PAINT.body} />
    </g>
  );
}

function PreheaterTop() {
  return (
    <g>
      <AirLine pts={[[1468.3, 447], [1468.3, 437.3], [1512.7, 437.3], [1512.7, 406]]} />
      <Slide x1={1416} y1={393} x2={1572} y2={412.5} d={8} step={45} head={0.5} />
      <FanSet cx={1468.3} cy={455} r={8} />
      {/* meal down through two airlocks in series */}
      <rect x={1540.9} y={410} width={1.6} height={104} fill={MEAL} />
      <Head x={1541.7} y={526} dir="down" color={MEAL} s={1} />
      <Airlock cx={1541.7} cy={435.5} />
      <Airlock cx={1541.7} cy={476.2} />
      <MachineLabel x={1573} y={438} size={6.2} tone="ink" anchor="start">
        AIRLOCK 1
      </MachineLabel>
      <MachineLabel x={1573} y={479} size={6.2} tone="ink" anchor="start">
        AIRLOCK 2
      </MachineLabel>
      <MachineLabel x={1497.6} y={369.5} size={8.5}>
        AIR SLIDE
      </MachineLabel>
      <MachineLabel x={1541.7} y={544} size={8.5}>
        TO PREHEATER · 2 AIRLOCKS IN SERIES
      </MachineLabel>
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={390} x2={1675} y={GROUND} />
      <SiloAeration />
      <FeedSilo />
      <KilnFeedBin />
      <BinDischarge />
      <Elevator />
      <HeadDrive />
      <PreheaterTop />
      {[
        [615.5, "SILO AERATION BLOWER"],
        [739, "SFM A"],
        [878, "FEED SILO + KILN FEED BIN"],
        [1027, "SFM B"],
        [1177, "COMMON AIR SLIDE"],
        [1348, "BUCKET ELEVATOR"],
      ].map(([x, t]) => (
        <MachineLabel key={t} x={x as number} y={814} size={9}>
          {t}
        </MachineLabel>
      ))}
    </g>
  );
}

const pads: LineSheetArt["pads"] = {
  // feed silo: level radar, six motorised outlet gates (1 → 6, left → right)
  "LEV-FSL-01": [834.5, 286],
  "POS-FSL-01": [GATES[0], 553],
  "POS-FSL-02": [GATES[1], 553],
  "POS-FSL-03": [GATES[2], 553],
  "POS-FSL-04": [GATES[3], 553],
  "POS-FSL-05": [GATES[4], 553],
  "POS-FSL-06": [GATES[5], 553],
  // silo aeration: header, blower motor, purge-sequence panel
  "PRS-FSL-01": [695.7, 473],
  "ELE-FSL-01": [634, 484.3],
  "TMP-FSL-01": [648, 494],
  "STS-FSL-03": [574.3, 594],
  // roof dust collector: inlet / outlet taps, ΔP, fan motor
  "PRS-FSL-03": [881, 296],
  "PRS-FSL-04": [942, 279],
  "PRS-FSL-02": [908.6, 290],
  "ELE-FSL-02": [984.6, 290],
  // kiln feed bin: three load cells, bin weight on the cone; bin dust collector inlet / outlet taps, ΔP, fan
  "WGT-KFS-02": [835.3, 643],
  "WGT-KFS-03": [879.7, 643],
  "WGT-KFS-04": [922.8, 643],
  "WGT-KFS-01": [879.7, 662],
  "PRS-KFS-08": [904.6, 593.7],
  "PRS-KFS-09": [936.6, 577.7],
  "PRS-KFS-05": [919.4, 587],
  "ELE-KFS-03": [960.6, 577.4],
  // gates A / B, slide air taps and slide blowers A / B
  "POS-KFS-01": [858, 675],
  "POS-KFS-02": [901.6, 675],
  "PRS-KFS-01": [768.75, 669],
  "PRS-KFS-03": [991.5, 669.5],
  "ELE-KFS-04": [735.6, 644],
  "ELE-KFS-05": [1072, 644],
  // solid-flow meters and the common air slide with its blower
  "FLO-KFS-01": [699, 732],
  "FLO-KFS-02": [1072, 732],
  "PRS-KFS-02": [739.6, 719.6],
  "PRS-KFS-06": [1028, 720],
  "PRS-KFS-04": [1250, 747],
  "ELE-KFS-06": [1240, 732],
  // bucket elevator: boot level, belt sway, boot zero-speed; head drive DE (coupling bearing) / NDE bearing, motor
  "LEV-KFS-04": [1295.5, 761],
  "LIM-KFS-01": [1376, 426.5],
  "SPD-KFS-01": [1348, 761.8],
  "VIB-KFS-01": [1290, 336.7],
  "VIB-KFS-04": [1406.7, 337.7],
  "TMP-KFS-01": [1290, 366],
  "TMP-KFS-03": [1407, 366],
  "TMP-KFS-02": [1162.7, 363],
  "ELE-KFS-01": [1148.7, 328.7],
  // preheater-top air slide: air tap, blower motor, two airlocks
  "PRS-KFS-07": [1512.7, 427.3],
  "ELE-KFS-07": [1488, 447],
  "SPD-KFS-02": [1541.7, 435.5],
  "SPD-KFS-03": [1541.7, 476.2],
};

const readouts: LineSheetArt["readouts"] = {
  frame: [0, 0, W, H],
  blocks: [
    { title: "Feed silo", box: [490, 146, 181, 66], leader: [828, 284], rows: [["LEV-FSL-01", "SILO LEVEL"]] },
    {
      title: "Silo dust collector",
      box: [729, 102, 288, 142],
      leader: [929, 272],
      rows: [
        ["PRS-FSL-03", "INLET PRESSURE"],
        ["PRS-FSL-04", "OUTLET PRESSURE"],
        ["PRS-FSL-02", "FILTER ΔP"],
        ["ELE-FSL-02", "FAN MOTOR CURRENT"],
      ],
    },
    {
      title: "Silo aeration blower",
      box: [31, 250, 291, 117],
      leader: [606, 486],
      rows: [
        ["PRS-FSL-01", "HEADER AIR PRESSURE"],
        ["STS-FSL-03", "PURGE SEQUENCE"],
        ["ELE-FSL-01", "BLOWER MOTOR CURRENT"],
        ["TMP-FSL-01", "MOTOR WINDING TEMP."],
      ],
    },
    {
      title: "Motorised outlet gates 1 – 6",
      box: [31, 490, 300, 191],
      leader: [815, 553],
      rows: [
        ["POS-FSL-01", "GATE 1 OPENING"],
        ["POS-FSL-02", "GATE 2 OPENING"],
        ["POS-FSL-03", "GATE 3 OPENING"],
        ["POS-FSL-04", "GATE 4 OPENING"],
        ["POS-FSL-05", "GATE 5 OPENING"],
        ["POS-FSL-06", "GATE 6 OPENING"],
      ],
    },
    {
      title: "Head drive",
      box: [1083, 42, 279, 191],
      leader: [1185, 333],
      rows: [
        ["VIB-KFS-01", "VIBRATION DE"],
        ["VIB-KFS-04", "VIBRATION NDE"],
        ["TMP-KFS-01", "BEARING TEMP. DE"],
        ["TMP-KFS-03", "BEARING TEMP. NDE"],
        ["TMP-KFS-02", "MOTOR WINDING TEMP."],
        ["ELE-KFS-01", "MOTOR CURRENT"],
      ],
    },
    {
      title: "Preheater-top slide & airlocks",
      box: [1583, 240, 362, 141],
      leader: [1572, 404],
      rows: [
        ["PRS-KFS-07", "SLIDE AIR PRESSURE"],
        ["SPD-KFS-02", "AIRLOCK 1 ZERO-SPEED"],
        ["SPD-KFS-03", "AIRLOCK 2 ZERO-SPEED"],
        ["ELE-KFS-07", "SLIDE BLOWER CURRENT"],
      ],
    },
    {
      title: "Bin dust collector",
      box: [1083, 388, 287, 141],
      leader: [962, 577],
      rows: [
        ["PRS-KFS-08", "INLET PRESSURE"],
        ["PRS-KFS-09", "OUTLET PRESSURE"],
        ["PRS-KFS-05", "FILTER ΔP"],
        ["ELE-KFS-03", "FAN MOTOR CURRENT"],
      ],
    },
    {
      title: "Kiln feed bin",
      box: [1083, 550, 296, 141],
      leader: [925, 662],
      rows: [
        ["WGT-KFS-01", "BIN WEIGHT (3 LOAD CELLS)"],
        ["WGT-KFS-02", "LOAD CELL 1"],
        ["WGT-KFS-03", "LOAD CELL 2"],
        ["WGT-KFS-04", "LOAD CELL 3"],
      ],
    },
    {
      title: "Bucket elevator",
      box: [1417, 667, 258, 116],
      leader: [1390, 739],
      rows: [
        ["LEV-KFS-04", "BOOT LEVEL"],
        ["LIM-KFS-01", "BELT SWAY"],
        ["SPD-KFS-01", "ZERO-SPEED SWITCH"],
      ],
    },
    {
      title: "Line A · slide A + SFM A",
      box: [240, 886, 315, 166],
      leader: [735, 740],
      rows: [
        ["POS-KFS-01", "GATE A"],
        ["PRS-KFS-01", "SLIDE A AIR PRESSURE"],
        ["FLO-KFS-01", "SFM A FEED"],
        ["PRS-KFS-02", "P2 · SFM A PRESSURE"],
        ["ELE-KFS-04", "SLIDE A BLOWER CURRENT"],
      ],
    },
    {
      title: "Line B · slide B + SFM B",
      box: [615, 886, 352, 166],
      leader: [1024, 740],
      rows: [
        ["POS-KFS-02", "GATE B"],
        ["PRS-KFS-03", "SLIDE B AIR PRESSURE"],
        ["FLO-KFS-02", "SFM B FEED"],
        ["PRS-KFS-06", "P3 · SFM B PRESSURE"],
        ["ELE-KFS-05", "SLIDE B BLOWER CURRENT"],
      ],
    },
    {
      title: "Common air slide",
      box: [1031, 906, 300, 92],
      leader: [1250, 783],
      rows: [
        ["PRS-KFS-04", "AIR PRESSURE"],
        ["ELE-KFS-06", "BLOWER MOTOR CURRENT"],
      ],
    },
  ],
};

export const sheet: LineSheetArt = { id: "F-0", ready: true, width: W, height: H, Art, pads, readouts };
