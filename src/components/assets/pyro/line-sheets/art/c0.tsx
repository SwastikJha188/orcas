/**
 * Sheet C-0 — CLR-01 · Clinker cooler — Overview (stage-overview PDF page 5).
 *
 * Left → right: the kiln hood with the kiln nose and the secondary-air rise,
 * the tertiary-air off-take over the cooler inlet; the long grate-cooler
 * casing with its clinker bed (glowing at the inlet), the clinker travel
 * arrows and the reciprocating grate; six under-grate compartments, each fed
 * through its riser duct by a cooling fan (volute, bearing, motor on a base
 * rail); the cooler exhaust duct over to the vent fan; the clinker discharge
 * chute with its IR pyrometer; the grate drive rod down to the hydraulic
 * power unit and the grease-lube unit.
 */
import React from "react";
import { Bolt, Fan, GroundLine, MX, MachineLabel, Motor, PAINT } from "@/components/assets/machine-kit/machine-kit";
import type { LineSheetArt } from "../types";
import { volutePath } from "./parts-c";

const W = 1654;
const H = 774;
const GROUND = 712.5;

/** Compartment / fan pitch along the grate. */
const P = 177.8;
const CASE = { x: 161.5, y: 246, w: 1077.5, h: 198.5 };
const GRATE = 427.5;
const COMP = { x: 169.5, y: 451, w: 171, h: 73 };
/** Cooling fan 1; fans 2 … 6 repeat at the pitch. */
const FAN = { cx: 240.2, cy: 632, r: 34, top: 590, duct: 226, bx: 270.8, mx: 281, mw: 59, mh: 34, rail: 669 };
const VENT = { cx: 1410, cy: 418.5, r: 49, top: 357.5 };

/** Hopper thermocouple pad height: low in the compartment hopper, clear of the pressure-tap row. */
const HOPPER_Y = 505;
/**
 * Stand-off rows under the fans (rail to ground, then below the ground line):
 * winding nearest, bearing next, vibration last, so no leader crosses a block.
 */
const ROW = [690, 721, 752];

type Pt = [number, number];

/** Filled flow arrowhead with its tip at (x, y), pointing along `deg` (0 = right, 90 = down). */
function Head({ x, y, deg, c, s = 9 }: { x: number; y: number; deg: number; c: string; s?: number }) {
  return <path d={`M ${x} ${y} l ${-s * 1.5} ${-s * 0.62} v ${s * 1.24} Z`} fill={c} transform={`rotate(${deg} ${x} ${y})`} />;
}

/** Flow line as filled segments (a stroked straight line has a zero-area box, so gradient paints would not show). */
function Flow({ pts, c, w = 2 }: { pts: Pt[]; c: string; w?: number }) {
  return (
    <g>
      {pts.slice(1).map(([x2, y2], i) => {
        const [x1, y1] = pts[i];
        const len = Math.hypot(x2 - x1, y2 - y1);
        const deg = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
        return <rect key={i} x={x1 - w / 2} y={y1 - w / 2} width={len + w} height={w} rx={w / 2} fill={c} transform={`rotate(${deg} ${x1} ${y1})`} />;
      })}
    </g>
  );
}

/** Hollow duct drawn as its two walls with a light fill (closed polygon). */
function Duct({ d }: { d: string }) {
  return <path d={d} fill={MX.flatBody} fillOpacity={0.55} stroke={MX.edge} strokeWidth={MX.w} strokeLinejoin="round" />;
}

/** Small instrument body (transmitter / RTD head) behind a pad or standing alone. */
function Instrument({ x, y, r = 7 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} {...PAINT.raised} />
      <circle cx={x} cy={y} r={r * 0.45} {...PAINT.shaft} />
    </g>
  );
}

function KilnHood() {
  return (
    <g>
      <rect x={90} y={113.5} width={152} height={132.5} rx={10} {...PAINT.body} />
      {/* hot zone in front of the kiln nose */}
      <ellipse cx={165} cy={225} rx={64} ry={22} fill={MX.heat} opacity={0.95} />
      {/* kiln nose ring */}
      <rect x={90} y={123.5} width={21} height={112.5} rx={5} fill={MX.heat} fillOpacity={0.5} stroke={MX.edge} strokeWidth={MX.w} />
      <line x1={100.5} x2={100.5} y1={130} y2={229} {...PAINT.hair} />
      {/* secondary air rising from the cooler into the hood */}
      <Flow pts={[[222, 246], [222, 192]]} c={MX.air} />
      <Head x={222} y={198} deg={-90} c={MX.air} />
      <Head x={222} y={214} deg={-90} c={MX.air} />
      {/* tertiary-air off-take */}
      <Duct d="M 378 246 V 172.5 H 293.5 V 156.5 H 385 Q 391 156.5 391 162.5 V 246 Z" />
      <Flow pts={[[385, 246], [385, 164.5], [270, 164.5]]} c={MX.air} />
      <Head x={385} y={196} deg={-90} c={MX.air} />
      <Head x={322} y={164.5} deg={180} c={MX.air} />
      <Head x={265} y={164.5} deg={180} c={MX.air} s={7} />
      <MachineLabel x={165.5} y={106} size={10.5}>
        KILN HOOD
      </MachineLabel>
    </g>
  );
}

function Cooler() {
  const ix = CASE.x + 9.5;
  const ir = CASE.x + CASE.w - 8;
  // bed surface: higher in the middle, thinner at the inlet and the outlet
  const surf = (x: number) => {
    const t = (x - ix) / (ir - ix);
    return 378 - 22 * Math.sin(Math.min(1, t * 1.25) * Math.PI * 0.5) + 10 * Math.max(0, t - 0.8) / 0.2;
  };
  const top = Array.from({ length: 41 }, (_, i) => {
    const x = ix + ((ir - ix) * i) / 40;
    return `${i ? "L" : "M"} ${x.toFixed(1)} ${surf(x).toFixed(1)}`;
  }).join(" ");
  const bed = `${top} L ${ir} ${GRATE} L ${ix} ${GRATE} Z`;
  const clip = `c0bed${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const plates = Math.floor((ir - ix - 4) / 12);
  return (
    <g>
      <rect x={CASE.x} y={CASE.y} width={CASE.w} height={CASE.h} rx={10} {...PAINT.body} />
      {/* clinker bed with the glowing inlet zone */}
      <clipPath id={clip}>
        <path d={bed} />
      </clipPath>
      <path d={bed} fill={MX.material} opacity={0.3} />
      <g clipPath={`url(#${clip})`}>
        <ellipse cx={360} cy={404} rx={210} ry={32} fill={MX.heat} opacity={0.8} />
        <ellipse cx={340} cy={406} rx={100} ry={18} fill={MX.heat} opacity={0.75} />
      </g>
      <path d={top} fill="none" stroke={MX.material} strokeWidth={1} opacity={0.45} />
      {/* clinker from the kiln down the inlet step, then along the grate */}
      <Flow pts={[[202.5, 256.5], [283.5, 399]]} c={MX.material} w={2.6} />
      <Head x={244} y={329} deg={60.4} c={MX.material} s={10} />
      <Flow pts={[[292, 410], [1218, 410]]} c={MX.material} w={2.6} />
      <Head x={535} y={410} deg={0} c={MX.material} s={10} />
      <Head x={998} y={410} deg={0} c={MX.material} s={10} />
      {/* reciprocating grate */}
      <rect x={167} y={GRATE} width={1065} height={8.5} rx={2} {...PAINT.raised} />
      {Array.from({ length: plates }).map((_, i) => (
        <line key={i} x1={173 + i * 12} x2={173 + i * 12} y1={GRATE + 1.5} y2={GRATE + 7} {...PAINT.hair} />
      ))}
      {/* cooling air up through the grate from each compartment */}
      {Array.from({ length: 6 }).map((_, i) => (
        <Flow key={i} pts={[[260.5 + i * P, COMP.y], [260.5 + i * P, 416]]} c={MX.air} w={1.8} />
      ))}
    </g>
  );
}

function Compartment({ i }: { i: number }) {
  const o = i * P;
  const x = COMP.x + o;
  return (
    <g>
      <rect x={x} y={COMP.y} width={COMP.w} height={COMP.h} rx={5} {...PAINT.body} />
      {/* pressure tapping (top right) and hopper thermocouple (low left, in the hopper) */}
      <rect x={309.5 + o} y={COMP.y} width={4} height={20} {...PAINT.shaft} />
      <Instrument x={311.5 + o} y={479.8} />
      <rect x={COMP.x + o} y={HOPPER_Y - 2} width={195.5 - COMP.x} height={4} {...PAINT.shaft} />
      <Instrument x={195.5 + o} y={HOPPER_Y} />
      <MachineLabel x={255 + o} y={465} size={9.5}>{`COMP. ${i + 1}`}</MachineLabel>
    </g>
  );
}

function CoolingFan({ i }: { i: number }) {
  const o = i * P;
  const cx = FAN.cx + o;
  const { cy, r, top } = FAN;
  const v = volutePath(cx, cy, r, top, 1);
  const inner = volutePath(cx, cy, r, top + 4, 1, 0.88);
  const dx = FAN.duct + o;
  const mx = FAN.mx + o;
  const mTop = cy - FAN.mh / 2;
  return (
    <g>
      {/* riser duct from the fan to the compartment */}
      <rect x={dx - 8.5} y={COMP.y + COMP.h} width={17} height={top - COMP.y - COMP.h + 2} fill={MX.flatBody} fillOpacity={0.55} stroke={MX.edge} strokeWidth={MX.w} />
      <rect x={dx - 11.5} y={COMP.y + COMP.h} width={23} height={4.5} rx={1} {...PAINT.raised} />
      <Flow pts={[[dx, top], [dx, COMP.y + COMP.h + 4]]} c={MX.air} w={1.8} />
      <Head x={dx} y={551} deg={-90} c={MX.air} s={8} />
      {/* base rail */}
      <rect x={200 + o} y={FAN.rail} width={174} height={7.5} rx={2} {...PAINT.body} />
      {/* volute saddle, bearing pedestal, motor feet */}
      <path d={`M ${cx - 14} ${cy + r - 6} H ${cx + 14} L ${cx + 18} ${FAN.rail} H ${cx - 18} Z`} {...PAINT.body} />
      <rect x={FAN.bx - 7 + o} y={cy + 8} width={14} height={FAN.rail - cy - 8} rx={1.5} {...PAINT.body} />
      <rect x={mx + 6} y={cy + FAN.mh / 2} width={FAN.mw - 12} height={FAN.rail - cy - FAN.mh / 2} rx={1.5} {...PAINT.body} />
      {/* volute casing, inlet ring and impeller */}
      <path d={v.d} {...PAINT.body} />
      <path d={inner.open} fill="none" stroke={MX.fine} strokeWidth={0.8} />
      <rect x={cx - r - 3} y={top - 2.5} width={r + 6} height={5} rx={1.2} {...PAINT.raised} />
      {[
        [-0.72, -0.62],
        [0.78, -0.6],
        [-0.74, 0.66],
        [0.8, 0.62],
      ].map(([a, b], k) => (
        <Bolt key={k} x={cx + a * r} y={cy + b * r} r={1.9} />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.6} {...PAINT.raised} />
      <circle cx={cx} cy={cy} r={r * 0.5} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      <Fan cx={cx} cy={cy} r={r * 0.42} />
      {/* shaft, split bearing and motor (terminal box up, cowl to the right) */}
      <rect x={cx} y={cy - 2} width={mx - cx} height={4} rx={1} {...PAINT.shaft} />
      <rect x={FAN.bx - 7 + o} y={cy - 10} width={14} height={20} rx={3} {...PAINT.raised} />
      <line x1={FAN.bx - 5 + o} x2={FAN.bx + 5 + o} y1={cy} y2={cy} stroke={MX.fine} strokeWidth={1} />
      <g transform={`translate(${2 * (mx + FAN.mw / 2)} 0) scale(-1 1)`}>
        <Motor x={mx} y={mTop} w={FAN.mw} h={FAN.mh} terminalBox={false} />
      </g>
      <rect x={302 + o} y={mTop - 9.5} width={21} height={10} rx={2.5} {...PAINT.body} />
      {/* winding RTD terminal on the frame */}
      <circle cx={317.5 + o} cy={636} r={4} {...PAINT.raised} />
    </g>
  );
}

function Exhaust() {
  return (
    <g>
      <Duct d="M 1055 246 V 150.5 Q 1055 142.5 1063 142.5 H 1416 Q 1424 142.5 1424 150.5 V 360 H 1399 V 167.5 H 1077 V 246 Z" />
      <Flow pts={[[1066, 246], [1066, 155], [1411, 155], [1411, 362]]} c={MX.air} />
      <Head x={1066} y={190} deg={-90} c={MX.air} s={10} />
      <Head x={1249} y={155} deg={0} c={MX.air} s={10} />
      <Head x={1411} y={264} deg={90} c={MX.air} s={10} />
      {/* exhaust gas thermocouple head on the duct roof */}
      <rect x={1214.5} y={136} width={6} height={8} {...PAINT.shaft} />
      <Instrument x={1217.5} y={154} r={6} />
      <MachineLabel x={1237} y={135} size={10.5}>
        COOLER EXHAUST
      </MachineLabel>
    </g>
  );
}

function VentFan() {
  const { cx, cy, r, top } = VENT;
  const v = volutePath(cx, cy, r, top, -1);
  const inner = volutePath(cx, cy, r, top + 5, -1, 0.9);
  return (
    <g>
      <rect x={1370} y={471.5} width={214} height={9.5} rx={2} {...PAINT.body} />
      <path d={`M ${cx - 20} ${cy + r - 8} H ${cx + 20} L ${cx + 26} 471.5 H ${cx - 26} Z`} {...PAINT.body} />
      <rect x={1461} y={440} width={18} height={31.5} rx={1.5} {...PAINT.body} />
      <rect x={1506} y={452} width={60} height={19.5} rx={1.5} {...PAINT.body} />
      <path d={v.d} {...PAINT.body} />
      <path d={inner.open} fill="none" stroke={MX.fine} strokeWidth={0.8} />
      <rect x={cx - 3} y={top - 2.5} width={r + 6} height={5} rx={1.2} {...PAINT.raised} />
      {[
        [-0.74, -0.62],
        [0.74, -0.62],
        [-0.74, 0.62],
        [0.74, 0.62],
      ].map(([a, b], k) => (
        <Bolt key={k} x={cx + a * r * 0.92} y={cy + b * r * 0.92} r={2.2} />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.62} {...PAINT.raised} />
      <circle cx={cx} cy={cy} r={r * 0.52} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      <Fan cx={cx} cy={cy} r={r * 0.44} />
      {/* shaft, bearing housing, coupling, motor */}
      <rect x={cx} y={cy - 2.5} width={1497 - cx} height={5} rx={1} {...PAINT.shaft} />
      <rect x={1458} y={392} width={22} height={53} rx={4} {...PAINT.raised} />
      <line x1={1460} x2={1478} y1={cy} y2={cy} stroke={MX.fine} strokeWidth={1} />
      {/* bearing RTD boss on the pedestal */}
      <Instrument x={1469} y={458} r={6} />
      <rect x={1482} y={410} width={14} height={18} rx={3} {...PAINT.body} />
      <g transform={`translate(${2 * (1497.5 + 38.25)} 0) scale(-1 1)`}>
        <Motor x={1497.5} y={394} w={76.5} h={58.5} terminalBox={false} />
      </g>
      <rect x={1517} y={381} width={33} height={13.5} rx={3} {...PAINT.body} />
      {/* conduit up to the motor junction box (current transducer) */}
      <rect x={1526} y={372} width={4} height={10} {...PAINT.shaft} />
      <rect x={1518} y={359} width={20} height={16} rx={3} {...PAINT.raised} />
      {/* winding RTD terminal */}
      <circle cx={1549.8} cy={428} r={5} {...PAINT.raised} />
      <MachineLabel x={1502} y={496} size={10.5}>
        VENT FAN
      </MachineLabel>
    </g>
  );
}

function Discharge() {
  const a = Math.atan2(621 - 443, 1278 - 1166) * (180 / Math.PI);
  return (
    <g>
      {/* discharge chute with the clinker falling to the crusher */}
      <path d="M 1239 347.5 H 1299 L 1324 520 H 1250 Z" {...PAINT.body} />
      <Flow pts={[[1284, 428], [1284, 524]]} c={MX.material} w={2.6} />
      <Head x={1284} y={508} deg={90} c={MX.material} s={10} />
      {/* IR pyrometer looking into the chute */}
      <line x1={1310} y1={354} x2={1284} y2={404} stroke={MX.label} strokeWidth={0.9} strokeDasharray="2.5 2.5" />
      <rect x={1304.5} y={331} width={27} height={24} rx={4} {...PAINT.raised} />
      <rect x={1316} y={355} width={4} height={8} {...PAINT.shaft} />
      {/* grate drive rod down to the HPU, with the stroke sensor */}
      <line x1={1166} y1={443} x2={1278} y2={621} stroke={MX.edge} strokeWidth={4.5} strokeLinecap="round" />
      <line x1={1166} y1={443} x2={1278} y2={621} stroke={MX.metal} strokeWidth={2} strokeLinecap="round" />
      <rect x={1197} y={524.5} width={46} height={12} rx={3} {...PAINT.raised} transform={`rotate(${a} 1220 530.5)`} />
    </g>
  );
}

function Hpu() {
  return (
    <g>
      {[1262, 1378].map((x) => (
        <rect key={x} x={x} y={702.5} width={10} height={GROUND - 702.5} rx={1} {...PAINT.body} />
      ))}
      <rect x={1249} y={621.5} width={152} height={81} rx={8} {...PAINT.body} />
      <rect x={1253.5} y={626} width={143} height={72} rx={5} fill="none" stroke={MX.fine} strokeWidth={0.8} />
      {/* oil reservoir window */}
      <rect x={1258.5} y={633.5} width={69} height={49.5} rx={4} {...PAINT.raised} />
      <rect x={1262.5} y={637.5} width={61} height={41.5} rx={3} fill={MX.material} opacity={0.9} />
      {/* pressure gauge */}
      <circle cx={1370.2} cy={633} r={11} {...PAINT.raised} />
      <circle cx={1370.2} cy={633} r={7.5} {...PAINT.recess} />
      <MachineLabel x={1323} y={736} size={10.5}>
        GRATE DRIVE HPU
      </MachineLabel>
    </g>
  );
}

function GreaseLube() {
  return (
    <g>
      <rect x={1431} y={621.5} width={92.5} height={61} rx={6} {...PAINT.body} />
      <rect x={1440} y={631.5} width={36.5} height={25} rx={3} {...PAINT.raised} />
      <rect x={1442.5} y={634} width={31.5} height={20} rx={2} fill={MX.material} opacity={0.85} />
      {/* grease-lube pumps (status from the DCS) */}
      <circle cx={1496.2} cy={657} r={10} {...PAINT.raised} />
      <circle cx={1496.2} cy={657} r={4.5} {...PAINT.shaft} />
      <MachineLabel x={1477.5} y={703} size={10.5}>
        GREASE LUBE
      </MachineLabel>
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={70} x2={1581} y={GROUND} />
      <Exhaust />
      <KilnHood />
      <Cooler />
      {Array.from({ length: 6 }).map((_, i) => (
        <g key={i}>
          <Compartment i={i} />
          <CoolingFan i={i} />
        </g>
      ))}
      <Discharge />
      <VentFan />
      <Hpu />
      <GreaseLube />
    </g>
  );
}



/**
 * Pad centre per point (sheet units), as on PDF page 5. Each compartment and
 * each fan repeats one pattern: pressure plate left over the compartment,
 * hopper plate right; fan current plate right along the motor top; winding,
 * bearing and vibration stand off in rows under the base rail. The vent-fan
 * points sit one per row so each plate runs left over the volute.
 */
const pads: LineSheetArt["pads"] = {};
const callouts: NonNullable<LineSheetArt["callouts"]> = {};
for (let i = 0; i < 6; i++) {
  const n = `0${i + 1}`;
  const o = i * P;
  pads[`PRS-CLR-${n}`] = [311.5 + o, 479.8];
  pads[`TMP-CLR-${11 + i}`] = [195.5 + o, HOPPER_Y];
  pads[`ELE-CLR-${n}`] = [312.5 + o, 607.5];
  pads[`TMP-CLR-${n}`] = [270.8 + o, 642.2];
  pads[`TMP-CLR-${17 + i}`] = [317.5 + o, 636];
  // Stand-off slots (small screens): pressures in two staggered rows over the bed, hoppers under their compartment.
  callouts[`PRS-CLR-${n}`] = [399 + o, i % 2 ? 382 : 412, "end"];
  callouts[`TMP-CLR-${11 + i}`] = [182 + o, 548, "start"];
  callouts[`ELE-CLR-${n}`] = [305 + o, 607.5, "start"];
  callouts[`TMP-CLR-${n}`] = [262 + o, ROW[1], "start"];
  callouts[`TMP-CLR-${17 + i}`] = [276 + o, ROW[0], "start"];
  if (i < 3) {
    pads[`VIB-CLR-${n}`] = [240.2 + o, 632.2];
    callouts[`VIB-CLR-${n}`] = [240.2 + o, ROW[2], "middle"];
  }
}

Object.assign(pads, {
  "SPD-CLR-01": [1217.8, 530.2],
  "PRS-CLR-07": [1370.2, 633],
  "TMP-CLR-07": [1293, 662],
  "STS-CLR-01": [1496.2, 657],
  "TMP-CLR-08": [1318.2, 343],
  "TMP-CLR-09": [1217.5, 154],
  "VIB-CLR-07": [1469, 398],
  "TMP-CLR-10": [1469, 458],
  "ELE-CLR-07": [1527.8, 368],
  "TMP-CLR-23": [1549.8, 428],
} satisfies LineSheetArt["pads"]);
Object.assign(callouts, {
  "SPD-CLR-01": [1232, 530.2, "start"],
  "TMP-CLR-07": [1300, 662, "start"],
  "PRS-CLR-07": [1378, 633, "start"],
  "STS-CLR-01": [1504, 657, "start"],
  "TMP-CLR-08": [1310, 343, "end"],
  "TMP-CLR-09": [1210, 154, "end"],
  "ELE-CLR-07": [1527, 335, "middle"],
  "VIB-CLR-07": [1468, 305, "middle"],
  "TMP-CLR-10": [1540, 500, "end"],
  "TMP-CLR-23": [1645, 560, "end"],
} satisfies NonNullable<LineSheetArt["callouts"]>);

export const sheet: LineSheetArt = { id: "C-0", ready: true, width: W, height: H, Art, pads, callouts };
