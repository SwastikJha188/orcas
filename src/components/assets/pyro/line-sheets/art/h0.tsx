/**
 * Sheet H-0 — HMR-01 + CSL-01 · Crusher and clinker transport — Overview.
 * Composed as PDF page 34: crusher motor, coupling and the hammer crusher
 * between its rotor bearing blocks on the crusher base frame; the inclined
 * deep-pan conveyor from the tail to the head drive on its trestles; the
 * clinker silo with its roof baghouse, level radar and dust fan.
 */
import React from "react";
import { Bolt, Coupling, GearWheel, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Ladder, Pipe, Volute } from "../../drawings/fkp-parts";
import { Radar } from "../../sheets/sa-parts";
import { Plinth } from "../../sheets/sb-parts";
import { Lumps } from "../../sheets/sc-parts";
import type { LineSheetArt } from "../types";
import { BearingHousing, Column, DriveMotor, PanConveyor } from "./parts-h";

const W = 1144.5;
const H = 479;

const GROUND = 458;
const BASE = 440;
const SY = 374;
const ROT = { cx: 368, cy: SY, r: 44 };

const TAIL: [number, number] = [534.5, 447.5];
const HEAD: [number, number] = [819, 154.5];
const SLOPE = (HEAD[1] - TAIL[1]) / (HEAD[0] - TAIL[0]);
const ANG = (Math.atan2(HEAD[1] - TAIL[1], HEAD[0] - TAIL[0]) * 180) / Math.PI;
const HALF = 8.5 / Math.cos((ANG * Math.PI) / 180);
const beltY = (x: number) => TAIL[1] + (x - TAIL[0]) * SLOPE;

const SCX = 967.5;
const roofY = (x: number) => 172 + Math.abs(x - SCX) * (16 / 91.5);

function Crusher() {
  const { cx, cy, r } = ROT;
  return (
    <g aria-hidden="true">
      {/* feed chute from the cooler */}
      <rect x={357} y={30} width={22} height={108} rx={2} {...PAINT.cylinderV} />
      <rect x={362} y={30} width={12} height={104} rx={1.5} {...PAINT.recess} />
      <Lumps pts={[[368, 50], [367, 78], [369, 106]]} r={2.4} />
      <rect x={353} y={86} width={30} height={5} rx={1.5} {...PAINT.raised} />
      {/* hopper and body */}
      <path d="M 331 143 H 405 L 435.7 180 V 421 H 300.5 V 180 Z" {...PAINT.body} />
      <path d="M 335 148 H 401 L 430 183 V 416 H 306 V 183 Z" {...PAINT.hair} />
      <rect x={326} y={137} width={84} height={7} rx={2} {...PAINT.raised} />
      <rect x={296} y={177} width={144} height={6} rx={2} {...PAINT.raised} />
      {[304, 324, 412, 432].map((bx) => (
        <Bolt key={bx} x={bx} y={180} r={1.2} />
      ))}
      {/* feed throat */}
      <path d={`M 350 146 H 386 L 392 ${cy - r} H 344 Z`} {...PAINT.recess} />
      <Lumps pts={[[362, 170], [374, 196], [360, 226], [376, 256], [364, 290]]} r={2.6} />
      {/* inspection door */}
      <rect x={403} y={200} width={22} height={34} rx={2.5} {...PAINT.raised} />
      <rect x={407} y={205} width={14} height={14} rx={1.5} {...PAINT.recess} />
      {/* rotor housing and cut-away */}
      <circle cx={cx} cy={cy} r={r + 7} {...PAINT.body} />
      <circle cx={cx} cy={cy} r={r} {...PAINT.recess} />
      {Array.from({ length: 9 }).map((_, i) => {
        const a = ((30 + i * 15) * Math.PI) / 180;
        return <line key={i} x1={cx + Math.cos(a) * (r - 6)} y1={cy + Math.sin(a) * (r - 6)} x2={cx + Math.cos(a) * (r - 1)} y2={cy + Math.sin(a) * (r - 1)} stroke={MX.metal} strokeWidth={2.4} strokeLinecap="round" />;
      })}
      {Array.from({ length: 6 }).map((_, i) => (
        <rect key={i} x={cx - 6} y={cy - r + 4} width={12} height={16} rx={2} {...PAINT.shaft} transform={`rotate(${i * 60} ${cx} ${cy})`} />
      ))}
      <circle cx={cx} cy={cy} r={25} {...PAINT.raised} />
      <circle cx={cx} cy={cy} r={19} {...PAINT.hair} />
      <circle cx={cx} cy={cy} r={9} {...PAINT.shaft} />
      <circle cx={cx} cy={cy} r={2.6} fill={MX.deep} />
      {/* discharge through the base frame */}
      <rect x={346} y={421} width={44} height={22} rx={2} {...PAINT.body} />
      <rect x={351} y={421} width={34} height={20} rx={1.5} {...PAINT.recess} />
      <Lumps pts={[[360, 430], [374, 436]]} r={2.4} />
    </g>
  );
}

function Silo() {
  const win = { x: 910, y: 220, w: 115, h: 76 };
  const surf = `M ${win.x + 4} 266 Q ${win.x + 40} 254 ${win.x + 70} 258 T ${win.x + win.w - 4} 264`;
  return (
    <g aria-hidden="true">
      {[899, 1036].map((lx) => (
        <Column key={lx} x={lx} y1={340} y2={GROUND} w={7} />
      ))}
      <line x1={903} x2={1032} y1={410} y2={410} stroke={MX.fine} strokeWidth={1.6} />
      <path d="M 903 410 L 967.5 452 L 1032 410" fill="none" stroke={MX.fine} strokeWidth={1.6} />
      <path d="M 884.5 343 H 1050.5 L 990 405 H 945 Z" {...PAINT.cylinderV} />
      <rect x={950} y={405} width={35} height={8} rx={1.5} {...PAINT.body} />
      <rect x={946} y={413} width={43} height={6} rx={1.5} {...PAINT.raised} />
      <rect x={884.5} y={189} width={166} height={144} rx={3} {...PAINT.cylinderV} />
      {[205, 312].map((ry) => (
        <line key={ry} x1={887} x2={1048} y1={ry} y2={ry} {...PAINT.detail} />
      ))}
      {[240, 276].map((ry) => (
        <g key={ry}>
          <line x1={887} x2={win.x - 2} y1={ry} y2={ry} {...PAINT.detail} />
          <line x1={win.x + win.w + 2} x2={1048} y1={ry} y2={ry} {...PAINT.detail} />
        </g>
      ))}
      <rect x={win.x} y={win.y} width={win.w} height={win.h} rx={6} {...PAINT.recess} />
      <path d={`${surf} L ${win.x + win.w - 4} ${win.y + win.h - 4} L ${win.x + 4} ${win.y + win.h - 4} Z`} fill={MX.material} opacity={0.82} />
      <path d={surf} fill="none" stroke={MX.material} strokeWidth={1} />
      <rect x={879} y={333} width={177} height={10.5} rx={2.5} {...PAINT.raised} />
      {Array.from({ length: 8 }).map((_, i) => (
        <Bolt key={i} x={888 + i * 22.7} y={338.25} r={1.2} />
      ))}
      {/* roof and rail */}
      <path d={`M 876 188.5 L ${SCX} 172 L 1059 188.5 Z`} {...PAINT.raised} />
      {Array.from({ length: 9 }).map((_, i) => {
        const px = 892 + i * 19.5;
        return <line key={i} x1={px} x2={px} y1={169} y2={roofY(px)} stroke={MX.edge} strokeWidth={0.9} />;
      })}
      <line x1={892} x2={1048} y1={169} y2={169} stroke={MX.edge} strokeWidth={1.2} />
      <MachineLabel x={966.6} y={273.2} size={9} tone="ink">CLINKER SILO</MachineLabel>
    </g>
  );
}

function Art() {
  const cols = [620, 720];
  const under = (x: number) => beltY(x) + HALF;
  return (
    <g>
      <GroundLine x1={18} x2={1128} y={GROUND} />

      {/* ================= crusher line ================= */}
      {[[36, 50], [200, 50], [330, 70], [450, 54]].map(([x, w]) => (
        <rect key={x} x={x} y={BASE + 10} width={w} height={GROUND - BASE - 10} rx={1.5} {...PAINT.body} />
      ))}
      <rect x={30} y={BASE} width={480} height={10} rx={2} {...PAINT.raised} />
      {[44, 120, 214, 300, 420, 494].map((bx) => (
        <Bolt key={bx} x={bx} y={BASE + 5} r={1.4} />
      ))}
      <Plinth x={66} y={428} w={164} h={12} bolts={4} />
      <DriveMotor x={76} y={330} w={146} h={82} footY={428} shaft={14} />
      <rect x={98} y={359} width={54} height={25} rx={2.5} {...PAINT.recess} />
      <line x1={126} x2={146} y1={366} y2={366} {...PAINT.hair} />
      <line x1={126} x2={146} y1={372} y2={372} {...PAINT.hair} />
      <rect x={236} y={SY - 5} width={262} height={10} rx={2} {...PAINT.shaft} />
      <Coupling x={239} y={SY - 13} w={23} h={26} />
      <Crusher />
      {[270, 435.7].map((bx) => (
        <g key={bx}>
          <path d={bx < 300 ? `M 290 398 H 300.5 V 420 Z` : `M 435.7 398 H 446 L 435.7 420 Z`} {...PAINT.body} />
          <BearingHousing x={bx} y={351} w={30.5} h={47} split={SY} />
        </g>
      ))}
      {/* speed pickup on the shaft end */}
      <rect x={478} y={SY - 11} width={6} height={22} rx={1.5} {...PAINT.raised} />
      <rect x={486} y={SY - 10} width={16} height={20} rx={3} {...PAINT.raised} />
      <rect x={466} y={SY + 13} width={40} height={4} rx={1} {...PAINT.body} />
      <rect x={490} y={SY + 9} width={6} height={6} rx={1} {...PAINT.body} />
      <MachineLabel x={90.5} y={473} anchor="start" size={7.5}>CRUSHER MOTOR</MachineLabel>
      <MachineLabel x={296} y={473} anchor="start" size={7.5}>CLINKER HAMMER CRUSHER</MachineLabel>
      <MachineLabel x={292} y={21.5} anchor="start" size={7.5}>CLINKER FROM COOLER</MachineLabel>

      {/* ================= deep-pan conveyor ================= */}
      <line x1={cols[0] + 3} y1={under(cols[0]) + 10} x2={cols[1] - 3} y2={GROUND - 16} stroke={MX.fine} strokeWidth={1.6} />
      <line x1={cols[0] + 3} y1={GROUND - 16} x2={cols[1] - 3} y2={under(cols[0]) + 10} stroke={MX.fine} strokeWidth={1.6} />
      <line x1={cols[1] + 3} y1={under(cols[1]) + 30} x2={795 - 3} y2={GROUND - 16} stroke={MX.fine} strokeWidth={1.6} />
      <line x1={cols[1] + 3} y1={GROUND - 16} x2={795 - 3} y2={under(cols[1]) + 30} stroke={MX.fine} strokeWidth={1.6} />
      {cols.map((cx) => (
        <Column key={cx} x={cx} y1={under(cx) - 4} y2={GROUND} w={6} />
      ))}
      <Column x={795} y1={132} y2={GROUND} w={7} />
      {/* tail feed hopper */}
      <path d={`M 516 414 H 552 L 546 ${beltY(546)} L 524 ${beltY(524)} Z`} {...PAINT.body} />
      <path d={`M 521 418 H 547 L 543 ${beltY(543) - 6} L 527 ${beltY(527) - 6} Z`} {...PAINT.recess} />
      <PanConveyor x1={TAIL[0]} y1={TAIL[1]} x2={HEAD[0]} y2={HEAD[1]} d={17} sprocket={10} doors={[0.35, 0.7]} />
      <MachineLabel x={588.5} y={473} anchor="start" size={7.5}>TAIL</MachineLabel>
      <MachineLabel x={650} y={314} anchor="end" size={7.5}>DEEP-PAN CONVEYOR</MachineLabel>

      {/* head drive: platform, motor, coupling, reducer, chain guard to the head */}
      <rect x={664} y={129} width={144} height={6} rx={1.5} {...PAINT.raised} />
      <path d="M 804 112 L 826 150 L 815 158 L 793 121 Z" {...PAINT.body} />
      <DriveMotor x={682} y={98} w={58} h={30} footY={129} shaft={6} plate={false} />
      <Coupling x={744} y={106} w={8} h={14} />
      <rect x={752} y={84} width={52} height={45} rx={5} {...PAINT.body} />
      <rect x={755.5} y={87.5} width={45} height={38} rx={3} {...PAINT.hair} />
      <line x1={753} x2={803} y1={113} y2={113} stroke={MX.edge} strokeWidth={1} />
      <GearWheel cx={785} cy={104} r={10} teeth={10} hub={3.5} />
      <circle cx={764} cy={113} r={5} {...PAINT.shaft} />
      <MachineLabel x={742} y={77} size={7.5}>HEAD DRIVE</MachineLabel>
      {/* head discharge chute into the silo roof */}
      <g transform={`rotate(${(Math.atan2(26, 86) * 180) / Math.PI} 822 158)`}>
        <rect x={822} y={152} width={92} height={12} rx={2} {...PAINT.body} />
        <rect x={826} y={155} width={84} height={6} rx={1.5} {...PAINT.recess} />
        <rect x={828} y={158} width={80} height={3} rx={1} fill={MX.material} />
      </g>
      <rect x={898} y={180} width={14} height={roofY(905) - 180} rx={1.5} {...PAINT.body} />

      {/* ================= clinker silo ================= */}
      <Ladder x={868} y1={166} y2={333} w={8} />
      <Silo />
      <Radar x={1040.5} y={roofY(1040.5)} h={22} />
      {/* baghouse */}
      <path d={`M 940 172 H 1003 L 990 ${roofY(990)} H 953 Z`} {...PAINT.body} />
      <rect x={930} y={113} width={83} height={59} rx={6} {...PAINT.body} />
      <rect x={934} y={117} width={75} height={51} rx={4} {...PAINT.hair} />
      <line x1={932} x2={1011} y1={150} y2={150} stroke={MX.fine} strokeWidth={1} strokeDasharray="4 2.5" />
      {[938, 946, 990, 998].map((bx) => (
        <rect key={bx} x={bx} y={153} width={5} height={15} rx={2.5} {...PAINT.hair} />
      ))}
      <rect x={933} y={119} width={14} height={22} rx={2} {...PAINT.raised} />
      <MachineLabel x={970.9} y={105.5} size={7.5}>BAGHOUSE</MachineLabel>
      {/* clean-gas duct, dust fan and motor on a bracket off the silo */}
      <Pipe pts={[[1013, 128], [1040, 128], [1040, 99]]} d={7} />
      <path d="M 1094 103 L 1100 103 L 1053 196 L 1050.5 190 Z" {...PAINT.body} />
      <rect x={1051} y={103} width={4} height={roofY(1053) - 103} {...PAINT.body} />
      <rect x={1046} y={99} width={56} height={5} rx={1.5} {...PAINT.raised} />
      <rect x={1028} y={50} width={10} height={20} rx={1.5} {...PAINT.cylinderV} />
      <Volute cx={1040} cy={84} r={13} outH={6} dir={-1} rotor={false} />
      <rect x={1055} y={81} width={7} height={6} rx={1} {...PAINT.shaft} />
      <DriveMotor x={1062} y={73} w={34} h={22} footY={99} flip plate={false} />
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 34. */
const pads: LineSheetArt["pads"] = {
  "TMP-HMR-03": [113, 371],
  "ELE-HMR-01": [135, 318],
  "VIB-HMR-01": [285.5, 360.5],
  "TMP-HMR-01": [285.5, 387.5],
  "VIB-HMR-02": [450.5, 360.5],
  "TMP-HMR-02": [450.5, 387.5],
  "SPD-HMR-01": [494, 375.5],
  "SPD-CSL-01": [534.5, 447.5],
  "VIB-CSL-01": [776.5, 92],
  "ELE-CSL-01": [709, 91],
  "PRS-CSL-01": [971.5, 143],
  "ELE-CSL-02": [1080.5, 84],
  "LEV-CSL-01": [1040.5, 166],
};

export const sheet: LineSheetArt = { id: "H-0", ready: true, width: W, height: H, Art, pads };
