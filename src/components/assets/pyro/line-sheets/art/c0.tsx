/**
 * Sheet C-0 — CLR-01 · Clinker cooler — Overview (design Cooler Rev02).
 *
 * Drawn in the design's 2000 × 1125 frame: the kiln outlet with the flame, the hood with secondary air back to the
 * kiln and clinker falling onto the grate; the tertiary-air duct off the cooler roof to the calciner; the grate
 * cooler casing with grate sections 1–3 (3 if fitted), the clinker bed and the shuttling grate; six under-grate
 * zones with their hoppers, each fed by a cooling fan through its riser (fresh air plus recirculated hot vent air at
 * each fan intake); the middle vent through the WHRS / AQC boiler and the ESP to the vent exhaust fan, its
 * outlet to the stack and back round as recirculated air; the transfer chute to the crusher; grate drives 1–3
 * below. Readout blocks stand round the drawing (`readouts`).
 */
import React from "react";
import { MX, MachineLabel, Motor, PAINT } from "@/components/assets/machine-kit/machine-kit";
import type { LineSheetArt } from "../types";
import { FanSet, Head, Line } from "./parts-d";

const W = 2000;
const H = 1125;

/** Zone / cooling-fan pitch along the grate. */
const P = 119.2;
const CASE = { x: 356, y: 404, w: 742, h: 93 };
const GRATE = 474;
/** Zone 1 box; zones 2 … 6 repeat at the pitch. */
const ZONE = { x: 368, y: 500, w: 112, h: 31 };
/** Cooling fan 1 impeller centre and volute radius. */
const FAN = { cx: 400, cy: 629, r: 15 };
/** Riser x (fan outlet up to the zone) and the recirculated hot-air header y. */
const RISE = 394;
const ZIN = 464;
const RECIRC = 697;
/** Vent exhaust fan. */
const VENT = { cx: 1045, cy: 312, r: 21 };
/** Drive pitch (drive 1 at 0). */
const DP = 250;

const AIR = MX.air;
const GAS = MX.gas;
const CLK = MX.material;

function KilnAndHood() {
  const flameId = `${React.useId().replace(/:/g, "")}-c0flame`;
  const a = (Math.atan2(404 - 346, 349 - 281) * 180) / Math.PI;
  return (
    <g>
      {/* kiln outlet with the flame */}
      <rect x={173} y={329} width={124} height={58} rx={8} {...PAINT.cylinder} />
      {Array.from({ length: 8 }).map((_, i) => (
        <line key={i} x1={186 + i * 13} x2={186 + i * 13} y1={334} y2={382} stroke={MX.fine} strokeWidth={0.7} opacity={0.6} />
      ))}
      <defs>
        <radialGradient id={flameId} cx="0.4" cy="0.5" r="0.6">
          <stop offset="0" stopColor="var(--mx-material-hi)" stopOpacity={1} />
          <stop offset="0.5" stopColor="var(--mx-material)" stopOpacity={0.85} />
          <stop offset="1" stopColor="var(--mx-material-deep)" stopOpacity={0.15} />
        </radialGradient>
      </defs>
      <ellipse cx={252} cy={357} rx={40} ry={15} fill={`url(#${flameId})`} />
      <rect x={173} y={329} width={124} height={58} rx={8} fill="none" stroke={MX.edge} strokeWidth={MX.w} />

      {/* hood with its lining */}
      <rect x={298} y={304} width={58} height={134} rx={6} {...PAINT.body} />
      <rect x={303} y={312} width={7} height={118} rx={3} fill={MX.deep} stroke={MX.edge} strokeWidth={1} />
      <rect x={303} y={312} width={7} height={118} rx={3} fill={MX.heat} opacity={0.25} />

      {/* secondary air from the cooler back into the kiln */}
      <rect x={205} y={369.2} width={203} height={1.6} fill={AIR} />
      <Head x={302} y={370} dir="left" color={AIR} />

      {/* clinker falling from the kiln onto the grate */}
      <rect x={281} y={345.2} width={Math.hypot(68, 58)} height={1.8} fill={CLK} transform={`rotate(${a} 281 346)`} />
      <path d="M 321 381 l -15 -6.5 v 13 Z" fill={CLK} transform={`rotate(${a} 321 381)`} />
    </g>
  );
}

function Tertiary() {
  return <Line pts={[[398, 404], [398, 273], [622, 273]]} color={AIR} w={14} heads={[[398, 336, "up"], [513, 273, "right"]]} />;
}

function Cooler() {
  const clip = `${React.useId().replace(/:/g, "")}-c0bed`;
  const bed = "M 364 472 L 490 446 L 690 451 L 745 465 L 1082 468 L 1082 474 L 364 474 Z";
  const plates = Math.floor((1083 - 366) / 12);
  return (
    <g>
      <rect x={CASE.x} y={CASE.y} width={CASE.w} height={CASE.h} rx={8} {...PAINT.body} />
      {/* grate section 3 (if fitted) */}
      <rect x={865} y={411} width={217} height={80} rx={6} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      {/* clinker bed */}
      <clipPath id={clip}>
        <path d={bed} />
      </clipPath>
      <path d={bed} fill={CLK} opacity={0.75} stroke={MX.edge} strokeWidth={1} strokeLinejoin="round" />
      <rect x={380} y={464.2} width={697} height={1.6} fill={CLK} clipPath={`url(#${clip})`} />
      {/* grate plates: sections 1–2 fitted, section 3 light */}
      {Array.from({ length: plates }).map((_, i) => {
        const px = 367 + i * 12;
        const s3 = px >= 865;
        return <rect key={i} x={px} y={GRATE} width={10} height={8} rx={1.5} fill={s3 ? MX.padPanel : MX.fine} stroke={MX.edge} strokeWidth={0.8} />;
      })}
      {/* grate shuttle */}
      {[397, 655, 898].map((sx) => (
        <g key={sx}>
          <line x1={sx + 4} x2={sx + 40} y1={485} y2={485} stroke={MX.label} strokeWidth={1.4} />
          <Head x={sx} y={485} dir="left" color={MX.label} s={0.65} />
          <Head x={sx + 44} y={485} dir="right" color={MX.label} s={0.65} />
        </g>
      ))}
      {[
        [493, "GRATE SECTION 1"],
        [743, "GRATE SECTION 2"],
        [972, "GRATE SECTION 3 · IF FITTED"],
      ].map(([x, t]) => (
        <MachineLabel key={t} x={x as number} y={422} size={8}>
          {t}
        </MachineLabel>
      ))}
    </g>
  );
}

function Zone({ i }: { i: number }) {
  const o = i * P;
  const x = ZONE.x + o;
  const c = 424 + o;
  return (
    <g>
      {/* hopper under the zone */}
      <path d={`M ${c - 38} 531 L ${c + 38} 531 L ${c + 14} 565 L ${c - 14} 565 Z`} {...PAINT.cylinderV} />
      <rect x={c - 9} y={565} width={18} height={8} rx={1.5} {...PAINT.raised} />
      <rect x={x} y={ZONE.y} width={ZONE.w} height={ZONE.h} rx={4} {...PAINT.body} />
      <MachineLabel x={x + 54} y={511} size={7.5}>{`ZONE ${i + 1}`}</MachineLabel>
    </g>
  );
}

function CoolingFan({ i }: { i: number }) {
  const o = i * P;
  const cx = FAN.cx + o;
  return (
    <g>
      {/* hot vent air up from the header into the fan intake */}
      <Line pts={[[cx - 2, RECIRC], [cx - 2, FAN.cy + FAN.r + 2]]} color={GAS} w={11} dash={4} heads={[[cx - 2, 656, "up"]]} />
      {/* fresh air through the intake filter */}
      <rect x={cx - 47} y={672.2} width={38} height={1.6} fill={AIR} />
      <Head x={cx - 26} y={673} dir="right" color={AIR} s={0.8} />
      <Head x={cx - 8} y={673} dir="right" color={AIR} s={0.8} />
      <rect x={cx - 26} y={666} width={11} height={14} rx={2.5} {...PAINT.raised} />
      {/* riser from the fan outlet to the zone */}
      <Line pts={[[RISE + o, FAN.cy - FAN.r * 1.35 + 1], [RISE + o, 587], [ZIN + o, 587], [ZIN + o, 531]]} color={AIR} w={9} heads={[[438 + o, 587, "right"], [ZIN + o, 559, "up"]]} />
      <FanSet cx={cx} cy={FAN.cy} r={FAN.r} base={false} />
      {/* motor stool */}
      <rect x={cx + FAN.r * 1.45 + FAN.r * 0.4} y={FAN.cy + FAN.r * 0.875} width={FAN.r * 2.5} height={4} rx={1} {...PAINT.body} />
      <MachineLabel x={432 + o} y={668} size={7.5}>{`FAN ${i + 1}`}</MachineLabel>
    </g>
  );
}

function VentTrain() {
  return (
    <g>
      {/* middle vent off the cooler roof to the WHRS */}
      <Line pts={[[689, 404], [689, 313], [741, 313]]} color={GAS} w={14} dash={5} heads={[[689, 352, "up"], [722, 313, "right"]]} />
      {/* WHRS → ESP → vent fan */}
      <Line pts={[[826, 312], [874, 312]]} color={GAS} w={14} dash={5} heads={[[856, 312, "right"]]} />
      <Line pts={[[983, 312], [1022, 312]]} color={GAS} w={14} dash={4} heads={[[996, 312, "right"]]} />

      {/* WHRS / AQC boiler with its tube bank and hopper */}
      <path d="M 750 361 L 819 361 L 800 384 L 767 384 Z" {...PAINT.cylinderV} />
      <rect x={740} y={262} width={86} height={99} rx={6} {...PAINT.body} />
      {[274, 289, 304, 319, 334, 350].map((ty) => (
        <line key={ty} x1={748} x2={818} y1={ty} y2={ty} stroke={MX.edge} strokeWidth={1.1} />
      ))}

      {/* ESP with its collecting plates and two dust hoppers */}
      {[0, 55].map((dx) => (
        <path key={dx} d={`M ${876 + dx} 355 L ${924 + dx} 355 L ${910 + dx} 382 L ${889 + dx} 382 Z`} {...PAINT.cylinderV} />
      ))}
      <rect x={873} y={267} width={110} height={88} rx={6} {...PAINT.body} />
      {[887, 908, 928, 948, 968].map((px) => (
        <line key={px} x1={px} x2={px} y1={280} y2={344} stroke={MX.fine} strokeWidth={1} />
      ))}

      {/* vent exhaust fan */}
      <FanSet cx={VENT.cx} cy={VENT.cy} r={VENT.r} base={false} />

      {/* fan outlet: up, over and down the side, back along under the fans as recirculated hot air */}
      <Line
        pts={[[1033, VENT.cy - VENT.r * 1.35 + 1], [1033, 262], [1206, 262], [1206, RECIRC], [FAN.cx - 8, RECIRC]]}
        color={GAS}
        w={12}
        dash={5}
        heads={[[1126, 262, "right"], [1206, 481, "down"], [808, RECIRC, "left"]]}
      />
      {/* stack / split (if fitted) */}
      <line x1={1206} x2={1206} y1={256} y2={206} stroke={MX.label} strokeWidth={2.4} strokeDasharray="5 4" />
      <Head x={1206} y={194} dir="up" color={MX.label} s={0.9} />
    </g>
  );
}

function Chute() {
  return (
    <g>
      <path d="M 1090 420 L 1132 420 L 1131 554 L 1106 554 Z" {...PAINT.cylinderV} />
      <rect x={1115.2} y={445} width={1.6} height={100} fill={CLK} />
      <Head x={1116} y={506} dir="down" color={CLK} s={1.1} />
      <rect x={1082} y={560} width={79} height={24} rx={4} fill="none" stroke={MX.label} strokeWidth={1.1} strokeDasharray="4 3" />
      <MachineLabel x={1121.5} y={575} size={7.5}>
        TO CRUSHER
      </MachineLabel>
    </g>
  );
}

function Drive({ k }: { k: number }) {
  const o = k * DP;
  return (
    <g>
      {/* motor, coupling shaft, gearbox, output shaft, crank wheel */}
      <Motor x={407 + o} y={727} w={38} h={33} />
      <rect x={445 + o} y={739.5} width={16} height={5} {...PAINT.shaft} />
      <rect x={462 + o} y={714} width={33} height={7} rx={2} {...PAINT.body} />
      <rect x={460 + o} y={719} width={38} height={39} rx={4} {...PAINT.body} />
      <circle cx={470 + o} cy={745} r={6} {...PAINT.raised} />
      <circle cx={470 + o} cy={745} r={2} fill={MX.edge} />
      <circle cx={483 + o} cy={737} r={8.5} {...PAINT.raised} />
      <circle cx={483 + o} cy={737} r={3} fill={MX.edge} />
      {[
        [463.5, 722.5],
        [494.5, 722.5],
        [463.5, 754.5],
        [494.5, 754.5],
      ].map(([bx, by]) => (
        <circle key={bx * 1000 + by} cx={bx + o} cy={by} r={1.8} fill={MX.edge} />
      ))}
      <rect x={498 + o} y={739} width={16} height={5} {...PAINT.shaft} />
      <circle cx={527.5 + o} cy={741.5} r={15} {...PAINT.cylinder} />
      <circle cx={527.5 + o} cy={741.5} r={5} fill="none" stroke={MX.edge} strokeWidth={1.2} />
      <MachineLabel x={468 + o + (k === 2 ? -23 : 0)} y={802} size={7.5}>{`DRIVE ${k + 1}`}</MachineLabel>
    </g>
  );
}

function Art() {
  return (
    <g>
      <Tertiary />
      <VentTrain />
      <KilnAndHood />
      <Cooler />
      {Array.from({ length: 6 }).map((_, i) => (
        <g key={i}>
          <Zone i={i} />
          <CoolingFan i={i} />
        </g>
      ))}
      <Chute />
      {[0, 1, 2].map((k) => (
        <Drive key={k} k={k} />
      ))}
      {/* drive 3 is fitted only with grate section 3 */}
      <rect x={865} y={717} width={166} height={70} rx={6} fill="none" stroke={MX.label} strokeWidth={1.1} strokeDasharray="4 3" />


      <MachineLabel x={235} y={317} size={8.5}>
        KILN OUTLET
      </MachineLabel>
      <MachineLabel x={255} y={386} size={7.5}>
        SECONDARY AIR
      </MachineLabel>
      <MachineLabel x={510} y={265} size={7.5}>
        TERTIARY AIR → CALCINER
      </MachineLabel>
      <MachineLabel x={706} y={390} size={7.5}>
        MIDDLE VENT
      </MachineLabel>
      <MachineLabel x={783} y={254} size={7.5}>
        WHRS / AQC BOILER
      </MachineLabel>
      <MachineLabel x={928} y={259} size={7.5}>
        ESP
      </MachineLabel>
      <MachineLabel x={927} y={390} size={7.5}>
        DUST HOPPERS
      </MachineLabel>
      <MachineLabel x={1089} y={342} size={7.5}>
        VENT EXHAUST FAN
      </MachineLabel>
      <MachineLabel x={1231} y={189} size={7}>
        STACK / SPLIT · IF FITTED
      </MachineLabel>
      <MachineLabel x={364} y={659} size={7}>
        FRESH AIR
      </MachineLabel>
      <MachineLabel x={789} y={712} size={7.5}>
        RECIRCULATED HOT VENT AIR → EACH COOLING-FAN INTAKE
      </MachineLabel>
    </g>
  );
}

const pads: LineSheetArt["pads"] = {};
for (let i = 0; i < 6; i++) {
  const n = `0${i + 1}`;
  const o = i * P;
  pads[`PRS-CLR-${n}`] = [456 + o, 515];
  pads[`VIB-CLR-${n}`] = [409.5 + o, 618];
  pads[`TMP-CLR-${n}`] = [388 + o, 641];
  pads[`ELE-CLR-${n}`] = [450 + o, 618];
  pads[`TMP-CLR-${17 + i}`] = [438 + o, 629];
  pads[`SPD-CLR-${n}`] = [417 + o, 646];
}
/** Grate drives 1–3: motor vibration and bearing temperature on the motor's left end, current on its terminal box, stroke rate at the crank. */
for (let k = 0; k < 3; k++) {
  const o = k * DP;
  pads[`SPD-CLR-1${k + 1}`] = [527 + o, 722];
  pads[`VIB-CLR-1${k + 1}`] = [403.5 + o, 732.5];
  pads[`TMP-CLR-3${k + 1}`] = [403.5 + o, 754];
  pads[`ELE-CLR-1${k + 1}`] = [430 + o, 729];
}
Object.assign(pads, {
  "TMP-CLR-09": [689, 354],
  "TMP-CLR-24": [836, 312],
  "PRS-CLR-21": [861, 312],
  "PRS-CLR-22": [1000, 312],
  "PRS-CLR-20": [927, 300],
  "TMP-CLR-25": [1206, 637],
  "TMP-CLR-08": [1139, 487],
  "VIB-CLR-07": [1033, 288],
  "TMP-CLR-10": [1060, 325],
  "ELE-CLR-07": [1117, 290],
  "TMP-CLR-23": [1106, 313],
} satisfies LineSheetArt["pads"]);

const FAN_X = [12, 343, 675, 1006, 1337, 1669];
const GRATE_BOX: Array<[number, number, number, number]> = [
  [12, 12, 293, 142],
  [324, 12, 294, 142],
  [637, 12, 385, 142],
];

const readouts: LineSheetArt["readouts"] = {
  frame: [0, 0, W, H],
  blocks: [
    ...GRATE_BOX.map((box, k) => ({
      title: k === 2 ? "Grate 3 · drive motor · if fitted" : `Grate ${k + 1} · drive motor`,
      box,
      leader: [430 + k * DP, 729] as [number, number],
      rows: [
        [`SPD-CLR-1${k + 1}`, "GRATE STROKE RATE *"],
        [`VIB-CLR-1${k + 1}`, "MOTOR VIBRATION"],
        [`TMP-CLR-3${k + 1}`, "BEARING TEMP."],
        [`ELE-CLR-1${k + 1}`, "MOTOR CURRENT"],
      ] as Array<[string, string]>,
    })),
    {
      title: "Vent exhaust fan",
      box: [1052, 12, 278, 142],
      leader: [1073, 300],
      rows: [
        ["VIB-CLR-07", "FAN VIBRATION"],
        ["TMP-CLR-10", "FAN BEARING TEMP."],
        ["TMP-CLR-23", "MOTOR WINDING TEMP."],
        ["ELE-CLR-07", "MOTOR CURRENT"],
      ],
    },
    {
      title: "Undergrate pressure · zones 1 – 6",
      box: [1625, 12, 376, 192],
      leader: [1052, 515],
      rows: Array.from({ length: 6 }, (_, i): [string, string] => [`PRS-CLR-0${i + 1}`, `ZONE ${i + 1} PRESSURE`]),
    },
    {
      title: "Vent & clinker temperatures",
      box: [1625, 242, 310, 141],
      leader: [689, 354],
      rows: [
        ["TMP-CLR-09", "MIDDLE VENT · BEFORE WHRS"],
        ["TMP-CLR-24", "AFTER WHRS · BEFORE ESP"],
        ["TMP-CLR-08", "CLINKER DISCHARGE"],
        ["TMP-CLR-25", "RETURN AIR (RECIRCULATED) *"],
      ],
    },
    {
      title: "ESP · dust removal",
      box: [1625, 408, 279, 117],
      leader: [960, 300],
      rows: [
        ["PRS-CLR-21", "INLET PRESSURE"],
        ["PRS-CLR-22", "OUTLET PRESSURE"],
        ["PRS-CLR-20", "ΔP (CALCULATED)"],
      ],
    },
    ...FAN_X.map((bx, i) => {
      const n = `0${i + 1}`;
      const rows: Array<[string, string]> = [
        [`VIB-CLR-${n}`, "FAN VIBRATION"],
        [`TMP-CLR-${n}`, "FAN BEARING TEMP."],
        [`TMP-CLR-${17 + i}`, "MOTOR WINDING TEMP."],
        [`ELE-CLR-${n}`, "MOTOR CURRENT"],
        [`SPD-CLR-${n}`, "FAN SPEED"],
      ];
      return {
        title: `Cooling fan ${i + 1} + motor`,
        box: [bx, 898, 293, 166] as [number, number, number, number],
        leader: [438 + i * P, 629] as [number, number],
        rows,
      };
    }),
  ],
};

export const sheet: LineSheetArt = { id: "C-0", ready: true, width: W, height: H, Art, pads, readouts };
