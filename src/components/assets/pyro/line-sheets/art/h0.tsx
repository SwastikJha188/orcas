/**
 * Sheet H-0 — HMR-01 + CSL-01 · Crusher and clinker transport — Overview (design Crusher_Conveyor_Silo).
 *
 * Drawn in the design's 2000 × 1125 frame, left → right: the crusher motor (NDE / DE end shields) with its MCC
 * below, coupled to the hammer crusher between its rotor DE / NDE bearing blocks (speed pick-up on the NDE stub),
 * clinker falling in down the chute from the cooler and out of the hopper onto the deep-pan conveyor; the conveyor
 * running flat from its tail and rising to the head pulley, driven by the head drive (drive MCC, motor, gearbox);
 * the discharge chute into the clinker silo, the silo baghouse on its roof with the clean-air duct to the dust fan
 * (fan MCC below), the filter ΔP and the level sensor. Readout blocks stand along the top (`readouts`).
 */
import React from "react";
import { GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import type { LineSheetArt } from "../types";
import { volutePath } from "./parts-c";
import { Head, Line, Tap } from "./parts-d";

const W = 2000;
const H = 1125;
const GROUND = 978;
const CLK = MX.material;
const AIR = MX.air;

type Box = [number, number, number, number];

/** Wide-tracked sheet label, as the design prints them. */
function Lbl({ x, y, size = 10.5, children }: { x: number; y: number; size?: number; children: React.ReactNode }) {
  return (
    <text x={x} y={y} fill={MX.label} fontSize={size} fontWeight={600} letterSpacing="0.24em" textAnchor="middle">
      {children}
    </text>
  );
}

const R = (b: Box, rx: number, paint: React.SVGProps<SVGRectElement>) => <rect x={b[0]} y={b[1]} width={b[2]} height={b[3]} rx={rx} {...paint} />;

/**
 * Side-elevation motor as the design draws it: finned frame with a dark terminal window, terminal box, base,
 * optional NDE / DE end shields (with their bearing taps), DE end bell and shaft stubs. Absolute boxes.
 */
function BlockMotor({
  frame,
  tb,
  win,
  base,
  bell,
  nde,
  de,
  shafts,
  fins,
  taps = [],
}: {
  frame: Box;
  tb: Box;
  win: Box;
  base: Box;
  bell: Box;
  nde?: Box;
  de?: Box;
  shafts: Box[];
  fins: number;
  taps?: Array<[number, number]>;
}) {
  const [fx, fy, fw, fh] = frame;
  return (
    <g aria-hidden="true">
      {shafts.map((s, i) => (
        <React.Fragment key={i}>{R(s, 1.5, PAINT.shaft)}</React.Fragment>
      ))}
      {R(base, 2, PAINT.body)}
      {R(tb, 4, PAINT.body)}
      {R(bell, Math.min(bell[2], bell[3]) * 0.4, PAINT.body)}
      {R(frame, Math.min(14, fh * 0.17), PAINT.body)}
      {Array.from({ length: fins }).map((_, i) => {
        const y = fy + ((i + 1) * fh) / (fins + 1);
        return <line key={i} x1={fx + fw * 0.07} x2={fx + fw * 0.93} y1={y} y2={y} stroke={MX.fine} strokeWidth={1.4} />;
      })}
      {R(win, Math.min(4, win[3] * 0.3), { fill: MX.edge, stroke: MX.edge, strokeWidth: 1.5 })}
      {nde && R(nde, 3, PAINT.raised)}
      {de && R(de, 3, PAINT.raised)}
      {taps.map(([x, y]) => (
        <Tap key={`${x}-${y}`} x={x} y={y} r={5} />
      ))}
    </g>
  );
}

/** Motor control cabinet with the socket its current reading sits on. */
function Mcc({ box, at }: { box: Box; at: [number, number] }) {
  return (
    <g aria-hidden="true">
      {R(box, 4, PAINT.body)}
      <rect x={at[0] - 7} y={at[1] - 7} width={14} height={14} rx={3} {...PAINT.raised} />
    </g>
  );
}

/** Pan of the conveyor strand: pan body with its clinker load, at (x, y) (bottom-left of the pan, local frame). */
function Pan({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M ${x + 5} ${y - 16} L ${x + 11} ${y - 26} L ${x + 26} ${y - 26} L ${x + 33} ${y - 16} Z`} fill={CLK} stroke={MX.edge} strokeWidth={1.3} strokeLinejoin="round" />
      <rect x={x} y={y - 16} width={37.5} height={16} rx={3.5} {...PAINT.raised} />
    </g>
  );
}

function CrusherMotor() {
  return (
    <g>
      <BlockMotor
        frame={[130, 528, 144, 86]}
        tb={[172, 509, 59, 22]}
        win={[176, 561, 50, 22]}
        base={[143, 614, 117, 9]}
        bell={[262, 537, 32, 68]}
        nde={[118, 536, 23, 71]}
        de={[290, 536, 21, 71]}
        shafts={[
          [110, 564, 10, 13],
          [309, 564, 15, 13],
        ]}
        fins={6}
        taps={[]}
      />
      {/* coupling to the rotor shaft */}
      <rect x={321} y={558} width={18} height={27} rx={3} {...PAINT.body} />
      {[326, 330.5, 335].map((x) => (
        <line key={x} x1={x} x2={x} y1={562} y2={581} stroke={MX.edge} strokeWidth={1.4} />
      ))}
      {/* supply cable to the MCC */}
      <line x1={215} y1={623} x2={202} y2={672} stroke={MX.fine} strokeWidth={1.3} strokeDasharray="5 4" />
      <Mcc box={[144, 672, 115, 50]} at={[193, 697]} />
    </g>
  );
}

function HammerCrusher() {
  const cx = 460;
  const cy = 562;
  const hammers: Array<[number, number]> = [
    [433.6, 517],
    [486, 517],
    [407.7, 562],
    [512, 562],
    [433.6, 607],
    [486, 607],
  ];
  return (
    <g>
      {/* chute from the cooler, clinker falling in */}
      <rect x={435.5} y={317} width={42.5} height={106} rx={3} {...PAINT.cylinderV} />
      <rect x={454.8} y={326} width={2.4} height={92} fill={CLK} />
      <Head x={456} y={383} dir="down" color={CLK} s={1.6} />

      {/* housing, inner liner panel */}
      <path d="M 397 423 H 522 L 551 451 V 672 H 368.6 V 451 Z" {...PAINT.body} />
      <rect x={388} y={451} width={143} height={203} rx={5} fill={MX.flatRaised} stroke={MX.edge} strokeWidth={MX.w} />
      {/* hopper under the housing */}
      <path d="M 378.6 672 H 541 L 512 710 H 407 Z" {...PAINT.cylinderV} />

      {/* rotor with its hammers */}
      <circle cx={cx} cy={cy} r={69.5} fill={MX.cylinderV} stroke={MX.fine} strokeWidth={2} />
      {hammers.map(([hx, hy]) => (
        <line key={`s${hx}-${hy}`} x1={cx} y1={cy} x2={hx} y2={hy} stroke={MX.edge} strokeWidth={2.2} />
      ))}
      {hammers.map(([hx, hy]) => (
        <rect key={`h${hx}-${hy}`} x={hx - 7.75} y={hy - 7.75} width={15.5} height={15.5} rx={3} {...PAINT.raised} />
      ))}
      <circle cx={cx} cy={cy} r={11} fill="none" stroke={MX.edge} strokeWidth={1.8} />

      {/* rotor DE / NDE bearing blocks, NDE shaft stub with the speed pick-up */}
      <rect x={339} y={533} width={29.6} height={58} rx={4} {...PAINT.raised} />
      <rect x={551} y={533} width={28} height={58} rx={4} {...PAINT.raised} />
      <rect x={579} y={557} width={29} height={10} rx={1.5} {...PAINT.shaft} />
      <rect x={608} y={553} width={18} height={18} rx={3} {...PAINT.raised} />
    </g>
  );
}

/** Incline of the strand: from A, at the given angle. */
const A: [number, number] = [775, 739.5];
const ANG = -31;
const cosA = Math.cos((ANG * Math.PI) / 180);
const sinA = Math.sin((ANG * Math.PI) / 180);
const onIncline = (u: number, v = 0): [number, number] => [A[0] + u * cosA + v * sinA, A[1] + u * sinA - v * cosA];

function DeepPanConveyor() {
  const flatPans = Array.from({ length: 9 }, (_, i) => 409 + 42 * i);
  const tiltPans = Array.from({ length: 11 }, (_, i) => 18 + 48.2 * i);
  const flatRollers = Array.from({ length: 12 }, (_, i) => 406.5 + 30.37 * i);
  const ret0: [number, number] = [800, 779];
  const ret1: [number, number] = [1262.5, 491];
  const rl = Math.hypot(ret1[0] - ret0[0], ret1[1] - ret0[1]);
  const incRollers = Array.from({ length: 12 }, (_, i) => 9.5 + 43.4 * i).filter((s) => s < rl - 20);
  const top1 = onIncline(533);
  const [m0, m1] = [onIncline(60, 18), onIncline(470, 18)];
  const tip = onIncline(292, 13);
  const mLen = Math.hypot(m1[0] - m0[0], m1[1] - m0[1]);
  return (
    <g>
      {/* strands: carrying line under the pans, return strand with its rollers */}
      <path d={`M 382.5 739.5 H ${A[0]} L ${top1[0]} ${top1[1]}`} fill="none" stroke={MX.fine} strokeWidth={2.4} strokeLinejoin="round" />
      <path d={`M 382.5 779 H ${ret0[0]} L ${ret1[0]} ${ret1[1]}`} fill="none" stroke={MX.fine} strokeWidth={2.4} strokeLinejoin="round" />
      {flatRollers.map((x) => (
        <circle key={x} cx={x} cy={779} r={3.6} fill={MX.fine} stroke={MX.fine} strokeWidth={1} />
      ))}
      {incRollers.map((s) => (
        <circle
          key={s}
          cx={ret0[0] + ((ret1[0] - ret0[0]) * s) / rl}
          cy={ret0[1] + ((ret1[1] - ret0[1]) * s) / rl}
          r={3.6}
          fill={MX.fine}
          stroke={MX.fine}
          strokeWidth={1}
        />
      ))}

      {/* tail pulley (chain speed on its shaft) and head pulley */}
      <circle cx={382.5} cy={758.5} r={19} {...PAINT.raised} />
      <circle cx={1254} cy={466} r={25} {...PAINT.cylinderV} />
      <circle cx={1254} cy={466} r={7} fill="none" stroke={MX.edge} strokeWidth={1.6} />

      {/* pans along the flat run, then up the incline */}
      {flatPans.map((x) => (
        <Pan key={x} x={x} y={737.5} />
      ))}
      {tiltPans.map((u) => {
        const [px, py] = onIncline(u - 18.75, 2);
        return (
          <g key={u} transform={`translate(${px} ${py}) rotate(${ANG})`}>
            <Pan x={0} y={0} />
          </g>
        );
      })}

      {/* clinker flow along the conveyor */}
      <rect x={435} y={705.3} width={289} height={2.4} fill={CLK} />
      <Head x={589} y={706.5} dir="right" color={CLK} s={1.5} />
      <rect x={m0[0]} y={m0[1] - 1.2} width={mLen} height={2.4} fill={CLK} transform={`rotate(${ANG} ${m0[0]} ${m0[1]})`} />
      <g transform={`translate(${tip[0]} ${tip[1]}) rotate(${ANG})`}>
        <Head x={0} y={0} dir="right" color={CLK} s={1.4} />
      </g>
    </g>
  );
}

function HeadDrive() {
  return (
    <g>
      {/* drive MCC and its cable to the motor */}
      <line x1={968} y1={381} x2={993} y2={381} stroke={MX.fine} strokeWidth={1.3} strokeDasharray="5 4" />
      <Mcc box={[876, 358, 92, 45]} at={[923, 381]} />

      {/* chain / drive arm from the gearbox down to the head pulley */}
      <line x1={1217} y1={404} x2={1243} y2={447} stroke={MX.fine} strokeWidth={5.5} strokeLinecap="round" />

      <BlockMotor
        frame={[1012, 351, 102, 58]}
        tb={[1042, 338, 42, 16]}
        win={[1045, 373, 36, 15]}
        base={[1020, 409, 85, 8]}
        bell={[1110, 356, 20, 48]}
        nde={[1003, 354, 16, 52]}
        de={[1127, 355, 16, 51]}
        shafts={[
          [993, 376, 12, 9],
          [1141, 376, 16, 9],
        ]}
        fins={5}
        taps={[]}
      />

      {/* gearbox: casing, lid, corner bolts, gear pair */}
      <rect x={1162} y={339} width={53} height={15} rx={3} {...PAINT.body} />
      <rect x={1155} y={352} width={69} height={56} rx={5} {...PAINT.body} />
      {[
        [1159, 357],
        [1220, 357],
        [1159, 403],
        [1220, 403],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={2.6} fill={MX.edge} />
      ))}
      <circle cx={1196} cy={372} r={18} {...PAINT.raised} />
      <circle cx={1196} cy={372} r={6.5} fill="none" stroke={MX.fine} strokeWidth={1.5} />
      <circle cx={1172} cy={383} r={10} {...PAINT.raised} />
      <circle cx={1172} cy={383} r={3.5} fill="none" stroke={MX.fine} strokeWidth={1.5} />
    </g>
  );
}

function DustFan() {
  const cx = 1608;
  const cy = 441;
  const v = volutePath(cx, cy, 27.5, 411, 1);
  return (
    <g>
      {/* clean air out of the fan */}
      <rect x={1606.8} y={384} width={2.5} height={28} fill={AIR} />
      <Head x={1608} y={372.5} dir="up" color={AIR} s={1.15} />
      <BlockMotor
        frame={[1645, 426, 50, 30]}
        tb={[1660, 419, 21, 9]}
        win={[1661, 438, 17, 8]}
        base={[1650, 456, 40, 8]}
        bell={[1635, 430, 13, 24]}
        shafts={[[1693, 439.5, 19, 4.5]]}
        fins={4}
      />
      <path d={v.d} {...PAINT.body} />
      <circle cx={cx} cy={cy} r={18} {...PAINT.raised} />
      <circle cx={cx} cy={cy} r={14.5} fill={MX.edge} stroke={MX.edge} strokeWidth={1} />
      {[45, 135, 225, 315].map((a) => (
        <path
          key={a}
          d={`M ${cx} ${cy} q ${3} ${-9} ${10} ${-4}`}
          fill={MX.flatRaised}
          stroke={MX.fine}
          strokeWidth={0.8}
          transform={`rotate(${a} ${cx} ${cy})`}
        />
      ))}
      <circle cx={cx} cy={cy} r={2.6} {...PAINT.shaft} />
      {[45, 135, 225, 315].map((a) => (
        <circle key={`b${a}`} cx={cx + Math.cos((a * Math.PI) / 180) * 22.5} cy={cy + Math.sin((a * Math.PI) / 180) * 22.5} r={2.3} fill={MX.edge} />
      ))}
      <Mcc box={[1624, 499.5, 70, 41.5]} at={[1659, 521]} />
    </g>
  );
}

function SiloAndBaghouse() {
  return (
    <g>
      {/* silo shell, cone, outlet */}
      <path d="M 1326 863 H 1567 L 1481 959 H 1412.5 Z" {...PAINT.cylinderV} />
      <rect x={1422.5} y={959} width={47.5} height={12} rx={2} {...PAINT.raised} />
      <rect x={1326} y={529} width={241} height={334} rx={8} {...PAINT.cylinderV} />
      {/* level window with the clinker heap */}
      <rect x={1356} y={586} width={181.5} height={219} rx={6} fill={MX.flatRaised} stroke={MX.fine} strokeWidth={1.6} />
      <path d="M 1360.6 748.8 L 1446.9 729.4 L 1532.5 748.8 V 805.6 H 1360.6 Z" fill={CLK} stroke={MX.edge} strokeWidth={1.3} strokeLinejoin="round" />
      <MachineLabel x={1446} y={768} size={10.5} tone="ink">
        CLINKER SILO
      </MachineLabel>

      {/* level sensor on the roof, its beam into the silo */}
      <line x1={1539} y1={529} x2={1528} y2={585} stroke={MX.fine} strokeWidth={1.2} strokeDasharray="5 4" />
      <rect x={1532} y={507} width={15} height={22} rx={2} {...PAINT.body} />

      {/* discharge chute from the head pulley into the silo roof */}
      <path d="M 1262 452 L 1299 439 L 1375 517 L 1356 526 Z" {...PAINT.cylinderV} />
      <rect x={1276.5} y={456.8} width={Math.hypot(1355 - 1278, 521 - 458)} height={2.4} fill={CLK} transform={`rotate(${(Math.atan2(521 - 458, 1355 - 1278) * 180) / Math.PI} 1278 458)`} />
      <g transform={`translate(1325 495) rotate(${(Math.atan2(521 - 458, 1355 - 1278) * 180) / Math.PI})`}>
        <Head x={0} y={0} dir="right" color={CLK} s={1.5} />
      </g>

      {/* baghouse on its pedestal, filter bags, inlet tap */}
      <rect x={1411} y={511} width={14} height={18} rx={1.5} {...PAINT.body} />
      <rect x={1356} y={420.5} width={125} height={92.5} rx={6} {...PAINT.body} />
      {[1373, 1394, 1415, 1436.5, 1457].map((x) => (
        <rect key={x} x={x} y={439} width={11.5} height={58} rx={5.75} {...PAINT.raised} />
      ))}

      {/* clean-air duct to the dust fan, outlet tap, ΔP across the bags */}
      <Line pts={[[1481, 443], [1590, 443]]} color={AIR} w={14} core={2} heads={[[1539, 443, "right"]]} />
      <rect x={1535 - 8.3} y={470.5 - 8.3} width={16.6} height={16.6} fill={MX.padPanel} stroke={MX.edge} strokeWidth={1.5} transform="rotate(45 1535 470.5)" />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={90} x2={1700} y={GROUND} />
      <DeepPanConveyor />
      <HammerCrusher />
      <CrusherMotor />
      <HeadDrive />
      <SiloAndBaghouse />
      <DustFan />

      <Lbl x={129} y={522} size={8.5}>NDE</Lbl>
      <Lbl x={299} y={522} size={8.5}>DE</Lbl>
      <Lbl x={354} y={521} size={8.5}>DE</Lbl>
      <Lbl x={565} y={521} size={8.5}>NDE</Lbl>
      <Lbl x={214} y={643}>CRUSHER MOTOR</Lbl>
      <Lbl x={202} y={739} size={8.5}>MOTOR MCC</Lbl>
      <Lbl x={456} y={308} size={9}>FROM COOLER</Lbl>
      <Lbl x={502} y={818} size={10}>HAMMER CRUSHER · HMR-01</Lbl>
      <Lbl x={1010} y={797} size={10}>DEEP-PAN CONVEYOR</Lbl>
      <Lbl x={922} y={349} size={8.5}>DRIVE MCC</Lbl>
      <Lbl x={1106} y={333} size={10}>HEAD DRIVE</Lbl>
      <Lbl x={1010} y={423} size={8.5}>NDE</Lbl>
      <Lbl x={1135} y={423} size={8.5}>DE</Lbl>
      <Lbl x={1306} y={423} size={8.5}>DISCHARGE CHUTE</Lbl>
      <Lbl x={1417} y={414} size={9}>SILO BAGHOUSE</Lbl>
      <Lbl x={1662} y={404} size={8.5}>DUST FAN</Lbl>
      <Lbl x={1536} y={500} size={8.5}>ΔP</Lbl>
      <Lbl x={1660} y={557} size={8.5}>MCC</Lbl>
      <Lbl x={1446} y={998} size={10}>CLINKER SILO</Lbl>
    </g>
  );
}

const pads: LineSheetArt["pads"] = {
  // crusher motor: NDE (left) and DE (right) bearing housings — vibration high, temperature low; winding on the terminal box, current at the MCC
  "VIB-HMR-03": [300, 548],
  "VIB-HMR-04": [130, 548],
  "TMP-HMR-04": [300, 596],
  "TMP-HMR-05": [130, 596],
  "TMP-HMR-03": [213, 538],
  "ELE-HMR-01": [193, 697],
  // hammer crusher: outlet temperature at the discharge, rotor bearings, zero-speed switch on the NDE shaft
  "TMP-HMR-06": [527.5, 694.5],
  "VIB-HMR-01": [353.6, 542],
  "VIB-HMR-02": [564.5, 542],
  "TMP-HMR-01": [353.6, 580],
  "TMP-HMR-02": [564.5, 580],
  "SPD-HMR-01": [617, 562],
  // deep-pan conveyor: strand temperature, head-drive motor NDE / DE, gearbox, MCC, tail zero-speed switch
  "TMP-CSL-01": [971.7, 614],
  "VIB-CSL-01": [1135, 363],
  "VIB-CSL-03": [1011, 363],
  "VIB-CSL-02": [1188, 381],
  "TMP-CSL-03": [1135, 396],
  "TMP-CSL-04": [1011, 396],
  "TMP-CSL-02": [1074, 352],
  "ELE-CSL-01": [923, 381],
  "SPD-CSL-01": [382.5, 758.5],
  // clinker silo and its baghouse: inlet / outlet taps, ΔP, dust-fan MCC
  "LEV-CSL-01": [1539, 504],
  "PRS-CSL-02": [1364, 498],
  "PRS-CSL-03": [1508, 443],
  "PRS-CSL-01": [1535, 470.5],
  "ELE-CSL-02": [1659, 521],
};

/** Box height for n rows, as the design spaces them. */
const bh = (n: number) => 42 + 25 * n;

const readouts: LineSheetArt["readouts"] = {
  frame: [0, 0, W, H],
  blocks: [
    {
      title: "Crusher motor",
      box: [13, 13, 262, bh(6)],
      leader: [213, 509],
      rows: [
        ["VIB-HMR-03", "VIBRATION DE"],
        ["VIB-HMR-04", "VIBRATION NDE"],
        ["TMP-HMR-04", "BEARING TEMP. DE"],
        ["TMP-HMR-05", "BEARING TEMP. NDE"],
        ["TMP-HMR-03", "WINDING TEMP."],
        ["ELE-HMR-01", "MOTOR CURRENT"],
      ],
    },
    {
      title: "Hammer rotor & bearings",
      box: [331, 13, 308, bh(6)],
      leader: [460, 317],
      rows: [
        ["TMP-HMR-06", "CRUSHER OUTLET TEMP."],
        ["VIB-HMR-01", "VIBRATION DE"],
        ["VIB-HMR-02", "VIBRATION NDE"],
        ["TMP-HMR-01", "BEARING TEMP. DE"],
        ["TMP-HMR-02", "BEARING TEMP. NDE"],
        ["SPD-HMR-01", "ZERO-SPEED SWITCH"],
      ],
    },
    {
      title: "Conveyor motor & head drive",
      box: [650, 13, 338, bh(9)],
      leader: [1074, 380],
      rows: [
        ["TMP-CSL-01", "CONVEYOR TEMP."],
        ["VIB-CSL-01", "VIBRATION DE"],
        ["VIB-CSL-03", "VIBRATION NDE"],
        ["VIB-CSL-02", "GEARBOX VIBRATION"],
        ["TMP-CSL-03", "BEARING TEMP. DE"],
        ["TMP-CSL-04", "BEARING TEMP. NDE"],
        ["TMP-CSL-02", "WINDING TEMP."],
        ["ELE-CSL-01", "MOTOR CURRENT"],
        ["SPD-CSL-01", "ZERO-SPEED SWITCH"],
      ],
    },
    { title: "Clinker silo", box: [1000, 13, 197, bh(1)], leader: [1539, 497], rows: [["LEV-CSL-01", "SILO LEVEL"]] },
    {
      title: "Silo dust collection",
      box: [1625, 13, 325, bh(4)],
      leader: [1412, 468],
      rows: [
        ["PRS-CSL-02", "INLET PRESSURE"],
        ["PRS-CSL-03", "OUTLET PRESSURE"],
        ["PRS-CSL-01", "ΔP (CALCULATED)"],
        ["ELE-CSL-02", "DUST FAN MOTOR CURRENT"],
      ],
    },
  ],
};

export const sheet: LineSheetArt = { id: "H-0", ready: true, width: W, height: H, Art, pads, readouts };
