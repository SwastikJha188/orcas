/**
 * Sheet K-0 — KLN-01 · Rotary kiln — Overview (design Kiln Rev02).
 *
 * Drawn in the design's 2000 × 1125 frame, left → right: the kiln inlet chamber with its riser, the meal chute
 * and the inlet seal, the gas analyser over it; the tertiary air duct overhead with its damper, from the hood
 * back to the calciner; the kiln shell on three tyres and roller pairs, the MIN / MAX scanner markers, the
 * girth gear and the drive line under it (spray skid, auxiliary drive and brake, pinion, gearbox, main motor,
 * gearbox lube skid, VFD), the hydraulic thrust roller at station 2, the shell scanner, the shell cooling
 * fans, the cooling shroud with its fan; the kiln hood with the pyrometer, the burner and the clinker drop
 * to the cooler. Readout blocks stand round the drawing (`readouts`).
 */
import React from "react";
import { Bolt, Fan, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import type { LineSheetArt, SheetReadout } from "../types";
import { Core, FanSet, Head, Line, Tap } from "./parts-d";

const W = 2000;
const H = 1125;
const GROUND = 709;

const KILN = { x: 562, y: 468, w: 777, h: 60 };
/** Tyre centre of stations 1–3. */
const STATIONS = [643.5, 1068.5, 1253];
const GAS_Y = 480;
const FEED_Y = 519;
const FLOW_END = 1281;
/** Spray circuits 1–6: their rings under the spray skid. */
const SPRAYS = [730, 738.6, 747.2, 755.8, 764.4, 773];
/** Main motor winding rings (the first is ours). */
const WINDINGS = [955, 964.4, 973.8, 983.2, 992.6, 1002];

/** Hot refractory face: pale panel washed with heat. */
function HotFace({ x, y, w, h, rx = 4 }: { x: number; y: number; w: number; h: number; rx?: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={rx} fill={MX.flatRaised} stroke={MX.edge} strokeWidth={MX.w} />
      <rect x={x} y={y} width={w} height={h} rx={rx} fill={MX.heat} opacity={0.24} />
    </g>
  );
}

function InletChamber() {
  return (
    <g>
      {/* riser to the calciner */}
      <rect x={490} y={341} width={25} height={61} rx={3} {...PAINT.cylinderV} />
      {/* chamber: casing, hot face, meal heap */}
      <rect x={456} y={401} width={99} height={192} rx={7} {...PAINT.body} />
      <HotFace x={464} y={410} w={84} h={176} rx={5} />
      <path d="M 466 570 L 502 560 L 546 567 V 584 H 466 Z" fill={MX.material} stroke={MX.edge} strokeWidth={MX.wFine} />
      {/* inlet seal segments */}
      {Array.from({ length: 7 }).map((_, i) => (
        <rect key={i} x={555} y={462 + i * 10.5} width={8} height={8} rx={1.5} {...PAINT.body} />
      ))}
      {/* gas sample probe and its line up to the analyser */}
      <line x1={548} y1={442} x2={594} y2={365} stroke={MX.label} strokeWidth={1.1} />
      <rect x={540} y={441} width={11} height={9} rx={2} {...PAINT.raised} />
      {/* meal chute from the preheater, bevelled into the chamber roof */}
      <Line pts={[[538.5, 288], [538.5, 390]]} color={MX.material} w={11} heads={[[538.5, 346, "down"]]} />
      <path d="M 533 388 H 544 V 391 L 533 401 Z" {...PAINT.body} />
      {/* gas analyser: O₂, CO, NOₓ cells */}
      <rect x={563} y={332} width={81} height={33} rx={5} {...PAINT.body} />
      {[568, 592, 616].map((x) => (
        <rect key={x} x={x} y={337} width={21} height={17} rx={2} fill={MX.metal} stroke={MX.edge} strokeWidth={MX.w} />
      ))}
    </g>
  );
}

function TertiaryDuct() {
  return (
    <g>
      <Line
        pts={[[1378, 365], [1378, 328], [482, 328], [482, 290]]}
        color={MX.air}
        w={13}
        heads={[[1378, 349, "up"], [1145, 328, "left"], [657, 328, "left"], [482, 303, "up"]]}
      />
      {/* damper */}
      <rect x={905.5} y={321} width={15.5} height={17} rx={2} {...PAINT.body} />
      <line x1={908.5} y1={335} x2={918} y2={324} stroke={MX.material} strokeWidth={2} strokeLinecap="round" />
      {/* off-take on the hood roof */}
      <rect x={1367} y={365} width={22} height={12} rx={3} {...PAINT.body} />
    </g>
  );
}

function Station({ cx }: { cx: number }) {
  return (
    <g>
      {/* roller pairs: left (far) roller, right (near) roller below it */}
      <rect x={cx - 22} y={540} width={44} height={14} rx={7} {...PAINT.cylinder} />
      <rect x={cx - 31} y={537} width={9} height={19} rx={2} {...PAINT.body} />
      <rect x={cx + 22} y={537} width={9} height={19} rx={2} {...PAINT.body} />
      <rect x={cx - 18} y={559} width={44} height={14} rx={7} {...PAINT.cylinder} />
      <rect x={cx - 27} y={556} width={9} height={19} rx={2} {...PAINT.body} />
      <rect x={cx + 26} y={556} width={9} height={19} rx={2} {...PAINT.body} />
    </g>
  );
}

function Shell() {
  const flameId = `${React.useId().replace(/:/g, "")}-flame`;
  const clipId = `${flameId}-clip`;
  const { x, y, w, h } = KILN;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={7} {...PAINT.cylinder} />
      {Array.from({ length: 13 }).map((_, i) => (
        <line key={i} x1={x + 55 * (i + 1)} x2={x + 55 * (i + 1)} y1={y + 3} y2={y + h - 3} stroke={MX.fine} strokeWidth={0.9} opacity={0.45} />
      ))}
      <defs>
        <radialGradient id={flameId} cx="0.3" cy="0.5" r="0.75">
          <stop offset="0" stopColor="var(--mx-material-hi)" stopOpacity={1} />
          <stop offset="0.4" stopColor="var(--mx-material)" stopOpacity={0.85} />
          <stop offset="1" stopColor="var(--mx-material-deep)" stopOpacity={0.1} />
        </radialGradient>
        <clipPath id={clipId}>
          <rect x={x} y={y} width={w} height={h} rx={7} />
        </clipPath>
      </defs>
      <ellipse cx={1292} cy={498} rx={47} ry={18} fill={`url(#${flameId})`} clipPath={`url(#${clipId})`} />
      <rect x={x} y={y} width={w} height={h} rx={7} fill="none" stroke={MX.edge} strokeWidth={MX.w} />
      {/* cooling shroud (cow shell) round the outlet */}
      <rect x={1307.5} y={458} width={31.5} height={79} rx={3} fill="none" stroke={MX.air} strokeWidth={1.4} />
    </g>
  );
}

function GirthGear() {
  return (
    <g>
      <rect x={803} y={444} width={20} height={108} rx={4} {...PAINT.cylinderV} />
      {Array.from({ length: 20 }).map((_, i) => (
        <line key={i} x1={806} x2={820} y1={449 + i * 5} y2={449 + i * 5} {...PAINT.hair} />
      ))}
      {/* the six spray nozzles at the gear face */}
      {Array.from({ length: 6 }).map((_, i) => (
        <rect key={i} x={795.5 + i * 3.8} y={522} width={3.2} height={6} rx={1.4} {...PAINT.raised} strokeWidth={0.8} />
      ))}
    </g>
  );
}

function ScannerMarkers() {
  return (
    <g>
      {[
        [721, "MIN", MX.air],
        [979.5, "MAX", MX.bad],
      ].map(([mx, t, c]) => (
        <g key={t as string}>
          <path d={`M ${(mx as number) - 7.5} 452.5 H ${(mx as number) + 7.5} L ${mx} 460.5 Z`} fill={c as string} stroke={MX.edge} strokeWidth={1} strokeLinejoin="round" />
          <text x={mx as number} y={449} fontSize={6.5} fontWeight={700} letterSpacing="0.08em" textAnchor="middle" fill={c as string}>
            {t}
          </text>
        </g>
      ))}
      <Tap x={721} y={465} />
      <Tap x={979.5} y={465} />
    </g>
  );
}

/** Coupling with its three grip lines. */
function GripCoupling({ x, y, w = 12, h = 16 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={3} {...PAINT.body} />
      {[0.27, 0.5, 0.73].map((f) => (
        <line key={f} x1={x + w * f} x2={x + w * f} y1={y + 3} y2={y + h - 3} stroke={MX.edge} strokeWidth={1.1} />
      ))}
    </g>
  );
}

function DriveLine() {
  return (
    <g>
      {/* pinion bearing block, pinion, coupling to the gearbox */}
      <rect x={793} y={556.5} width={9.5} height={12.5} rx={2} {...PAINT.body} />
      <circle cx={819} cy={569} r={9.5} {...PAINT.cylinderV} />
      <rect x={824} y={556.5} width={10} height={13.5} rx={2} {...PAINT.body} />
      <rect x={834} y={561} width={12} height={5} {...PAINT.shaft} />
      <GripCoupling x={845} y={555} />

      {/* main gearbox on its stand */}
      <rect x={886} y={585} width={3.5} height={21} {...PAINT.body} />
      <rect x={878} y={605.5} width={19.5} height={12} rx={2} {...PAINT.body} />
      <rect x={864} y={534.5} width={47} height={10} rx={2.5} {...PAINT.body} />
      <rect x={858} y={543} width={59} height={42} rx={5} {...PAINT.body} />
      <circle cx={894.4} cy={560.6} r={12.5} {...PAINT.raised} />
      <circle cx={894.4} cy={560.6} r={4} {...PAINT.shaft} />
      <circle cx={873.8} cy={566} r={7} {...PAINT.raised} />
      <circle cx={873.8} cy={566} r={2.5} {...PAINT.shaft} />
      {[
        [862, 547],
        [913.4, 547],
        [862, 581.6],
        [913.4, 581.6],
      ].map(([bx, by]) => (
        <Bolt key={`${bx}-${by}`} x={bx} y={by} r={1.9} />
      ))}

      {/* coupling to the main motor */}
      <rect x={917} y={561} width={9} height={4} {...PAINT.shaft} />
      <GripCoupling x={925.5} y={555} />

      {/* main motor: frame with fins, winding taps, terminal box, cooling fan box, NDE cap, base */}
      <rect x={944.7} y={584} width={58} height={5} rx={1.5} {...PAINT.body} />
      <rect x={1010} y={547} width={19} height={34} rx={7} {...PAINT.body} />
      <rect x={940} y={543} width={70} height={41} rx={5} {...PAINT.body} />
      {[549, 554, 572, 577].map((fy) => (
        <line key={fy} x1={945} x2={1005} y1={fy} y2={fy} stroke={MX.fine} strokeWidth={0.8} />
      ))}
      <rect x={960} y={559} width={28} height={8} rx={3} fill={MX.deep} stroke={MX.edge} strokeWidth={1} />
      <rect x={960} y={534} width={27} height={10} rx={4} {...PAINT.body} />
      <rect x={999} y={532} width={23} height={12} rx={3} {...PAINT.body} />
      <rect x={1006} y={534} width={9} height={7.5} rx={1.5} {...PAINT.recess} />

      {/* VFD and its cable to the motor */}
      <line x1={1013} y1={584} x2={1058} y2={603} stroke={MX.label} strokeWidth={1} strokeDasharray="4 3" />
      <rect x={1048} y={603} width={29.5} height={46} rx={4} {...PAINT.body} />
      <rect x={1052.5} y={608} width={21} height={11} rx={2} {...PAINT.raised} />

      {/* gearbox lube oil down to the skid */}
      <line x1={914.7} y1={585} x2={914.7} y2={653} stroke={MX.material} strokeWidth={1.6} strokeDasharray="4 3" />
      {/* spray lubricant up to the girth gear nozzles */}
      <line x1={756} y1={596} x2={793} y2={525} stroke={MX.material} strokeWidth={1.6} strokeDasharray="4 3" />
    </g>
  );
}

function SpraySkid() {
  return (
    <g>
      <rect x={728} y={595.5} width={46} height={37.5} rx={4} {...PAINT.body} />
      <rect x={734} y={601} width={17.5} height={24} rx={3} {...PAINT.recess} />
      <rect x={735.5} y={602.5} width={14.5} height={21} rx={2} fill={MX.material} opacity={0.85} />
    </g>
  );
}

function AuxDrive() {
  return (
    <g>
      <rect x={811} y={624} width={37} height={5} rx={1.5} {...PAINT.body} />
      <rect x={799} y={604} width={10} height={17} rx={4} {...PAINT.body} />
      <rect x={806} y={601} width={46} height={23} rx={5} {...PAINT.body} />
      {[605.5, 609, 616, 619.5].map((fy) => (
        <line key={fy} x1={810} x2={848} y1={fy} y2={fy} stroke={MX.fine} strokeWidth={0.8} />
      ))}
      <rect x={822} y={610} width={15} height={5} rx={2.5} fill={MX.deep} stroke={MX.edge} strokeWidth={1} />
      <rect x={820} y={595.5} width={19} height={6.5} rx={3} {...PAINT.body} />
      {/* brake */}
      <rect x={852} y={610.5} width={4} height={3} {...PAINT.shaft} />
      <rect x={858} y={619} width={9} height={8.5} rx={2} {...PAINT.body} />
      <circle cx={862.5} cy={612} r={9.4} {...PAINT.raised} />
    </g>
  );
}

function LubeSkid() {
  return (
    <g>
      <rect x={850} y={653} width={88} height={48} rx={5} {...PAINT.body} />
      {/* oil tank */}
      <rect x={855} y={660.5} width={32.5} height={33.5} rx={3} {...PAINT.recess} />
      <rect x={856.5} y={662} width={29.5} height={30.5} rx={2} fill={MX.material} opacity={0.85} />
      {/* pump */}
      <rect x={893} y={674} width={13} height={14} rx={3} {...PAINT.body} />
      <Fan cx={899.5} cy={681} r={5} />
      {/* filter, cooler */}
      <rect x={909} y={661} width={11} height={19} rx={3} {...PAINT.body} />
      <rect x={923.4} y={660.5} width={11} height={28.5} rx={3} {...PAINT.body} />
      {[667, 672, 677, 682].map((ly) => (
        <line key={ly} x1={925.5} x2={932.5} y1={ly} y2={ly} {...PAINT.hair} />
      ))}
    </g>
  );
}

function ThrustAndScanner() {
  return (
    <g>
      {/* hydraulic thrust roller under station 2 */}
      <rect x={1143.5} y={564} width={2.5} height={19} {...PAINT.body} />
      <rect x={1136} y={582} width={18} height={10} rx={2} {...PAINT.body} />
      <rect x={1113} y={552} width={28} height={9} rx={2} {...PAINT.cylinder} />
      <rect x={1096} y={546} width={17} height={22} rx={3} {...PAINT.body} />
      <rect x={1140.6} y={549} width={8.4} height={15} rx={2} {...PAINT.body} />

      {/* shell scanner on its stand, sight lines to the shell */}
      {[
        [1098, 528],
        [1251, 537],
      ].map(([tx, ty]) => (
        <line key={tx} x1={1180} y1={619} x2={tx} y2={ty} stroke={MX.air} strokeWidth={1.2} strokeDasharray="5 4" />
      ))}
      <path d="M 1173 634 L 1180.5 681 L 1188 634" fill="none" stroke={MX.edge} strokeWidth={MX.w} strokeLinejoin="round" />
      <rect x={1169} y={618.5} width={23} height={15.5} rx={3} {...PAINT.body} />
    </g>
  );
}

function ShellFans() {
  return (
    <g>
      <rect x={1206} y={428.8} width={28} height={2.6} rx={1} {...PAINT.shaft} />
      {[1152.8, 1195].map((cx) => (
        <g key={cx}>
          <FanSet cx={cx} cy={430} r={7.5} base={false} />
          <Core pts={[[cx, 443], [cx, 457]]} color={MX.air} w={1.6} />
          <Head x={cx} y={466} dir="down" color={MX.air} s={0.85} />
        </g>
      ))}
    </g>
  );
}

function OutletAndHood() {
  return (
    <g>
      {/* shroud cooling air: fan up to the shroud */}
      <Core pts={[[1323, 537], [1323, 571]]} color={MX.air} w={1.6} />
      <FanSet cx={1323} cy={580} r={9} base={false} />

      {/* kiln hood with its lining */}
      <rect x={1346} y={377} width={66} height={242} rx={5} {...PAINT.body} />
      <HotFace x={1350} y={384} w={8} h={228} rx={3} />

      {/* clinker dropping to the cooler */}
      <line x1={1359} y1={540} x2={1366} y2={616} stroke={MX.material} strokeWidth={1.8} />
      <Head x={1362.5} y={580} dir="down" color={MX.material} s={1} />

      {/* secondary air from the cooler */}
      <Core pts={[[1394, 694], [1394, 625]]} color={MX.air} w={1.6} />
      <Head x={1394} y={653} dir="up" color={MX.air} s={1.1} />

      {/* burner pipe through the hood wall */}
      <Line pts={[[1486, 498], [1411, 498]]} color={MX.material} w={10} heads={[[1446, 498, "left"]]} />
      <rect x={1458} y={489.5} width={14} height={17} rx={3} {...PAINT.body} />
    </g>
  );
}

function Flows() {
  return (
    <g>
      {/* hot gas: burning zone → inlet chamber → riser */}
      <Core pts={[[FLOW_END, GAS_Y], [502, GAS_Y], [502, 290]]} color={MX.gas} w={1.8} dash={6} />
      {[
        [1095, GAS_Y, "left"],
        [740, GAS_Y, "left"],
        [529, GAS_Y, "left"],
        [502, 404, "up"],
        [502, 310, "up"],
      ].map(([x, y, d]) => (
        <Head key={`${x}-${y}`} x={x as number} y={y as number} dir={d as "left" | "up"} color={MX.gas} s={1.15} />
      ))}
      {/* material: inlet → burning zone */}
      <Core pts={[[566, FEED_Y], [FLOW_END, FEED_Y]]} color={MX.material} w={2} />
      <Head x={749} y={FEED_Y} dir="right" color={MX.material} s={1.15} />
      <Head x={1104} y={FEED_Y} dir="right" color={MX.material} s={1.15} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={430} x2={1500} y={GROUND} />
      <TertiaryDuct />
      <InletChamber />
      {STATIONS.map((cx) => (
        <Station key={cx} cx={cx} />
      ))}
      <SpraySkid />
      <AuxDrive />
      <LubeSkid />
      <DriveLine />
      <ThrustAndScanner />
      <OutletAndHood />
      <Shell />
      {STATIONS.map((cx) => (
        <g key={cx}>
          <rect x={cx - 8.5} y={456} width={17} height={80} rx={8} {...PAINT.cylinderV} />
          {[464, 526].map((y) => (
            <g key={y}>
              <rect x={cx - 11.5} y={y} width={5} height={5} rx={1} {...PAINT.raised} />
              <rect x={cx + 6.5} y={y} width={5} height={5} rx={1} {...PAINT.raised} />
            </g>
          ))}
        </g>
      ))}
      <GirthGear />
      <ShellFans />
      <ScannerMarkers />
      <Flows />
      {/* burning-zone pyrometer sight line from the hood roof */}
      <line x1={1378} y1={377} x2={1290} y2={498} stroke={MX.label} strokeWidth={1.2} strokeDasharray="5 4" />

      <MachineLabel x={692} y={321} size={8}>
        TERTIARY AIR DUCT → CALCINER
      </MachineLabel>
      {STATIONS.map((cx, i) => (
        <MachineLabel key={cx} x={cx} y={439} size={7}>
          {`STATION ${i + 1}`}
        </MachineLabel>
      ))}
      <MachineLabel x={1174} y={406} size={7.5}>
        SHELL FANS
      </MachineLabel>
      <MachineLabel x={1482} y={482} size={7}>
        BURNER
      </MachineLabel>
      <MachineLabel x={749} y={667} size={7}>
        SPRAY
      </MachineLabel>
      <MachineLabel x={824} y={639} size={6.5}>
        AUX DRIVE
      </MachineLabel>
      <MachineLabel x={1117} y={605} size={7}>
        THRUST
      </MachineLabel>
      <MachineLabel x={1062} y={660} size={6.5}>
        VFD
      </MachineLabel>
      <MachineLabel x={894} y={708} size={6.5}>
        GEARBOX LUBE SKID
      </MachineLabel>
      <MachineLabel x={1393} y={705} size={8}>
        FROM COOLER
      </MachineLabel>
      {[
        [505, "KILN INLET"],
        [912, "DRIVE LINE"],
        [1180, "SCANNER"],
        [1378, "KILN HOOD"],
      ].map(([x, t]) => (
        <MachineLabel key={t} x={x as number} y={730} size={8}>
          {t}
        </MachineLabel>
      ))}
    </g>
  );
}

/** Pad centre per point, on the instrument rings of the design. */
const pads: LineSheetArt["pads"] = {
  // kiln inlet and gas analyser
  "TMP-PHC-07": [538.5, 372],
  "TMP-KLN-13": [502, 454],
  "PRS-KLN-01": [502, 546],
  "GAS-KLN-01": [578.5, 345.5],
  "GAS-KLN-02": [602.5, 345.5],
  "GAS-KLN-03": [626.5, 345.5],
  "STS-KLN-06": [545.5, 445.5],
  // tertiary air duct
  "TMP-BRN-03": [983.5, 329.5],
  "PRS-BRN-05": [1018.5, 329.5],
  "POS-BRN-01": [913.5, 314],
  "TMP-BRN-07": [842, 329.5],
  "PRS-BRN-06": [806, 329.5],
  // stations: tyre migration on top, tyre temperature below; L roller above, R roller below
  "MIG-KLN-01": [643.5, 458],
  "TMP-KLN-28": [643.5, 533.5],
  "TMP-KLN-01": [617, 546.5],
  "TMP-KLN-02": [670, 546.5],
  "TMP-KLN-03": [621.5, 565.5],
  "TMP-KLN-04": [674.5, 565.5],
  "MIG-KLN-02": [1068.5, 458],
  "TMP-KLN-29": [1068.5, 533.5],
  "TMP-KLN-05": [1042, 546.5],
  "TMP-KLN-06": [1095, 546.5],
  "TMP-KLN-07": [1046.5, 565.5],
  "TMP-KLN-08": [1099.5, 565.5],
  "MIG-KLN-03": [1253, 458],
  "TMP-KLN-30": [1253, 533.5],
  "TMP-KLN-09": [1226.5, 546.5],
  "TMP-KLN-10": [1279.5, 546.5],
  "TMP-KLN-11": [1231, 565.5],
  "TMP-KLN-12": [1284, 565.5],
  // main motor
  "VIB-KLN-01": [942.5, 546],
  "TMP-KLN-19": [942.5, 579],
  "TMP-KLN-20": [1017.5, 579],
  "VIB-KLN-05": [1017.5, 546],
  ...Object.fromEntries(WINDINGS.map((wx, i) => [`TMP-KLN-4${i + 1}`, [wx, 563] as [number, number]])),
  "STS-KLN-14": [1011, 537.5],
  "ELE-KLN-01": [971, 534],
  "SPD-KLN-01": [813, 546],
  "STS-KLN-12": [1063, 628.5],
  // gearbox and pinion
  "VIB-KLN-03": [869.7, 543],
  "TMP-KLN-23": [869.7, 582],
  "VIB-KLN-02": [905, 543],
  "TMP-KLN-22": [905, 582],
  "VIB-KLN-04": [798, 555],
  // gearbox lube skid
  "TMP-KLN-15": [869.7, 670.5],
  "LEV-KLN-01": [869.7, 688],
  "LAB-KLN-01": [860, 695],
  "PRS-KLN-04": [899.5, 670],
  "PRS-KLN-05": [914, 684],
  "FLO-KLN-05": [928.8, 649.5],
  // girth-gear spray
  "STS-KLN-05": [764, 610],
  "PRX-KLN-01": [SPRAYS[0], 638.5],
  "PRX-KLN-02": [SPRAYS[1], 638.5],
  "PRX-KLN-03": [SPRAYS[2], 638.5],
  "PRX-KLN-04": [SPRAYS[3], 638.5],
  "PRX-KLN-05": [SPRAYS[4], 638.5],
  "PRX-KLN-06": [SPRAYS[5], 638.5],
  // auxiliary drive and brake
  "STS-KLN-11": [825, 597],
  "LIM-KLN-01": [862.5, 612],
  // axial thrust
  "POS-KLN-01": [1087, 534],
  "PRS-KLN-07": [1126.5, 556.5],
  "POS-KLN-02": [1145, 587],
  // shell and scanner
  "STS-KLN-08": [1180.5, 626],
  "MAN-KLN-01": [1198.5, 646],
  "STS-KLN-13": [1175, 419],
  // outlet and hood
  "TMP-KLN-26": [1323, 453],
  "TMP-KLN-25": [1323, 555],
  "TMP-KLN-14": [1378, 371],
  "TMP-KLN-27": [1400, 419],
  "PRS-KLN-03": [1400, 458],
};

const station = (n: number, cx: number, x: number, w: number, t: string[]): SheetReadout => ({
  title: `Station ${n} · Tyre & rollers`,
  box: [x, 16, w, 192],
  leader: [cx, 453],
  rows: [
    [t[0], "TYRE MIGRATION"],
    [t[1], "TYRE TEMP."],
    [t[2], "L-ROLLER BEARING A"],
    [t[3], "L-ROLLER BEARING B"],
    [t[4], "R-ROLLER BEARING A"],
    [t[5], "R-ROLLER BEARING B"],
  ],
});

const readouts: LineSheetArt["readouts"] = {
  frame: [0, 0, W, H],
  blocks: [
    {
      title: "Kiln inlet",
      box: [21, 17, 292, 216],
      leader: [538, 340],
      rows: [
        ["TMP-PHC-07", "KILN INLET FEED TEMP."],
        ["TMP-KLN-13", "INLET GAS TEMP."],
        ["PRS-KLN-01", "INLET DRAFT"],
        ["GAS-KLN-01", "INLET O₂"],
        ["GAS-KLN-02", "INLET CO"],
        ["GAS-KLN-03", "INLET NOX"],
        ["STS-KLN-06", "ANALYSER STATUS"],
      ],
    },
    {
      title: "Main motor",
      box: [21, 247, 262, 392],
      leader: [940, 563],
      rows: [
        ["VIB-KLN-01", "VIBRATION DE"],
        ["VIB-KLN-05", "VIBRATION NDE"],
        ["TMP-KLN-19", "BEARING TEMP. DE"],
        ["TMP-KLN-20", "BEARING TEMP. NDE"],
        ["TMP-KLN-41", "WINDING TEMP. 1"],
        ["TMP-KLN-42", "WINDING TEMP. 2"],
        ["TMP-KLN-43", "WINDING TEMP. 3"],
        ["TMP-KLN-44", "WINDING TEMP. 4"],
        ["TMP-KLN-45", "WINDING TEMP. 5"],
        ["TMP-KLN-46", "WINDING TEMP. 6"],
        ["STS-KLN-14", "COOLING FAN"],
        ["STS-KLN-12", "DRIVE HEALTH"],
        ["ELE-KLN-01", "MOTOR TORQUE"],
        ["SPD-KLN-01", "KILN SPEED"],
      ],
    },
    {
      title: "Gearbox & pinion",
      box: [21, 687, 361, 167],
      leader: [864, 560],
      rows: [
        ["VIB-KLN-02", "VIBRATION — GEARBOX INPUT"],
        ["VIB-KLN-03", "VIBRATION — GEARBOX OUTPUT"],
        ["VIB-KLN-04", "VIBRATION — PINION BEARING"],
        ["TMP-KLN-22", "BEARING TEMP. — GEARBOX INPUT"],
        ["TMP-KLN-23", "BEARING TEMP. — GEARBOX OUTPUT"],
      ],
    },
    station(1, STATIONS[0], 396, 340, ["MIG-KLN-01", "TMP-KLN-28", "TMP-KLN-01", "TMP-KLN-02", "TMP-KLN-03", "TMP-KLN-04"]),
    station(2, STATIONS[1], 740, 344, ["MIG-KLN-02", "TMP-KLN-29", "TMP-KLN-05", "TMP-KLN-06", "TMP-KLN-07", "TMP-KLN-08"]),
    station(3, STATIONS[2], 1084, 340, ["MIG-KLN-03", "TMP-KLN-30", "TMP-KLN-09", "TMP-KLN-10", "TMP-KLN-11", "TMP-KLN-12"]),
    {
      title: "Tertiary air duct",
      box: [1500, 16, 300, 167],
      leader: [921, 322],
      rows: [
        ["TMP-BRN-03", "TEMP. BEFORE DAMPER"],
        ["TMP-BRN-07", "TEMP. AFTER DAMPER"],
        ["PRS-BRN-05", "PRESSURE BEFORE DAMPER"],
        ["PRS-BRN-06", "PRESSURE AFTER DAMPER"],
        ["POS-BRN-01", "DAMPER OPENING"],
      ],
    },
    {
      title: "Shell & scanner",
      box: [1500, 260, 312, 192],
      leader: [1188, 619],
      rows: [
        ["STS-KLN-08", "SHELL MAX TEMP."],
        ["MAN-KLN-01", "HANDHELD SCAN"],
        ["STS-KLN-13", "SHELL COOLING FANS"],
      ],
    },
    {
      title: "Axial thrust",
      box: [1500, 489, 314, 167],
      leader: [1092, 534],
      rows: [
        ["POS-KLN-01", "AXIAL POSITION"],
        ["PRS-KLN-07", "THRUST HYDRAULIC PRESSURE"],
        ["POS-KLN-02", "TRAVEL LIMITS"],
      ],
    },
    {
      title: "Outlet & hood",
      box: [1500, 693, 324, 167],
      leader: [1378, 420],
      rows: [
        ["TMP-KLN-26", "COW-SHELL TEMP."],
        ["TMP-KLN-25", "OUTLET COOLING AIR TEMP."],
        ["TMP-KLN-14", "BURNING-ZONE TEMP."],
        ["TMP-KLN-27", "HOOD TEMP."],
        ["PRS-KLN-03", "HOOD PRESSURE"],
      ],
    },
    {
      title: "Gearbox lubrication",
      box: [396, 770, 268, 192],
      leader: [851, 690],
      rows: [
        ["PRS-KLN-04", "OIL SUPPLY PRESSURE"],
        ["TMP-KLN-15", "OIL TEMP."],
        ["PRS-KLN-05", "OIL FILTER ΔP"],
        ["FLO-KLN-05", "OIL FLOW SWITCH"],
        ["LEV-KLN-01", "OIL TANK LEVEL"],
        ["LAB-KLN-01", "OIL LAB SAMPLE (FE)"],
      ],
    },
    {
      title: "Girth-gear spray",
      box: [771, 770, 245, 217],
      leader: [751, 643],
      rows: [
        ["STS-KLN-05", "SPRAY CONTROLLER"],
        ["PRX-KLN-01", "SPRAY CIRCUIT 1"],
        ["PRX-KLN-02", "SPRAY CIRCUIT 2"],
        ["PRX-KLN-03", "SPRAY CIRCUIT 3"],
        ["PRX-KLN-04", "SPRAY CIRCUIT 4"],
        ["PRX-KLN-05", "SPRAY CIRCUIT 5"],
        ["PRX-KLN-06", "SPRAY CIRCUIT 6"],
      ],
    },
    {
      title: "Auxiliary drive & brake",
      box: [1136, 770, 270, 92],
      leader: [849, 614],
      rows: [
        ["STS-KLN-11", "AUX DRIVE"],
        ["LIM-KLN-01", "BRAKE PAD WEAR"],
      ],
    },
  ],
};

export const sheet: LineSheetArt = { id: "K-0", ready: true, width: W, height: H, Art, pads, readouts };
