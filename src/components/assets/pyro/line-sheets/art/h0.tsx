/**
 * Sheet H-0 — HMR-01 + CSL-01 · Crusher and clinker transport — Overview.
 * Composed as page 6 of the pyro stage-overview pack (1654 × 774): crusher
 * motor and coupling into the clinker hammer crusher between its rotor DE /
 * NDE bearing blocks, clinker fed from above and discharged along the floor
 * to the deep-pan conveyor tail; the inclined conveyor up to its head drive;
 * discharge into the clinker silo with the roof baghouse, level sensor and
 * dust fan.
 */
import React from "react";
import { Bolt, GearWheel, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Handrail, Pipe, Volute } from "../../drawings/fkp-parts";
import type { LineSheetArt } from "../types";
import { BearingBlock, Head, Stream } from "./parts-h2";

const W = 1654;
const H = 774;

const GROUND = 713;
const LABEL_Y = 735;

const TAIL: [number, number] = [772.5, 699];
const HEAD: [number, number] = [1158.5, 302];
const along = (t: number): [number, number] => [TAIL[0] + (HEAD[0] - TAIL[0]) * t, TAIL[1] + (HEAD[1] - TAIL[1]) * t];

/** Side-elevation TEFC motor: fan cowl left, finned frame, terminal box, rating plate, base. */
function SideMotor({ x, y, w, h, cowl, tb, fins }: { x: number; y: number; w: number; h: number; cowl: number; tb: [number, number, number]; fins: number }) {
  const [tx, tw, th] = tb;
  return (
    <g aria-hidden="true">
      <rect x={x - cowl} y={y + h * 0.11} width={cowl + 10} height={h * 0.78} rx={Math.min(14, cowl * 0.4)} {...PAINT.body} />
      <rect x={tx} y={y - th} width={tw} height={th + 4} rx={3} {...PAINT.body} />
      <rect x={x} y={y} width={w} height={h} rx={Math.min(18, h * 0.16)} {...PAINT.body} />
      {Array.from({ length: fins }).map((_, i) => {
        const fy = y + ((i + 1) * h) / (fins + 1);
        return <line key={i} x1={x + w * 0.07} x2={x + w * 0.93} y1={fy} y2={fy} {...PAINT.hair} />;
      })}
      <rect x={x + w * 0.11} y={y + h} width={w * 0.81} height={Math.max(4, h * 0.07)} rx={1.5} {...PAINT.raised} />
    </g>
  );
}

function CrusherLine() {
  const rot = { cx: 547.5, cy: 540, r: 71.5 };
  const hammers: Array<[number, number]> = [
    [522.5, 498],
    [571.5, 498],
    [498.5, 540],
    [596.5, 540],
    [522.5, 582.5],
    [571.5, 582.5],
  ];
  return (
    <g aria-hidden="true">
      {/* floor bed carrying the crusher discharge to the conveyor tail */}
      <rect x={90} y={694} width={710} height={15} rx={3} {...PAINT.body} />
      <line x1={96} x2={794} y1={698.5} y2={698.5} {...PAINT.hair} />

      {/* crusher motor, shaft and coupling */}
      <SideMotor x={150} y={540} w={204} h={112} cowl={39} tb={[211, 81.5, 24]} fins={6} />
      <rect x={217.5} y={582.5} width={69} height={30} rx={3} {...PAINT.recess} />
      <rect x={354} y={591} width={60} height={16.5} rx={2} {...PAINT.shaft} />
      <rect x={372.5} y={586} width={30} height={29} rx={3} {...PAINT.body} />
      <line x1={387.5} x2={387.5} y1={588} y2={613} stroke={MX.edge} strokeWidth={1} />
      {[379, 396].map((bx) => (
        <rect key={bx} x={bx - 2} y={589} width={4} height={23} rx={1} {...PAINT.recess} />
      ))}

      {/* feed chute from the cooler, clinker falling in */}
      <rect x={512} y={134} width={30} height={122} rx={2} {...PAINT.body} />
      <rect x={517} y={137} width={20} height={116} rx={1.5} {...PAINT.recess} />
      <rect x={508} y={250} width={38} height={6} rx={1.5} {...PAINT.raised} />
      <Stream x1={527} y1={82} x2={527} y2={246} w={2.4} />
      <Head x={527} y={166} deg={90} s={14} />

      {/* hammer crusher housing */}
      <rect x={515} y={256} width={24} height={34} {...PAINT.body} />
      <path d="M 496 286 H 599 L 639.5 336 V 662 H 455 V 336 Z" {...PAINT.body} />
      <path d="M 499.5 291 H 595.5 L 634.5 338 V 657 H 460 V 338 Z" {...PAINT.hair} />
      <line x1={457} x2={637.5} y1={338} y2={338} stroke={MX.fine} strokeWidth={1} />
      {/* rotor disc with hammers */}
      <circle cx={rot.cx} cy={rot.cy} r={rot.r} fill="none" stroke={MX.edge} strokeWidth={1.6} />
      <circle cx={rot.cx} cy={rot.cy} r={rot.r - 5} {...PAINT.hair} />
      {hammers.map(([hx, hy]) => (
        <g key={`${hx}-${hy}`}>
          <rect x={hx - 9} y={hy - 9} width={18} height={18} rx={3.5} {...PAINT.raised} />
          <rect x={hx - 5} y={hy - 5} width={10} height={10} rx={2} {...PAINT.hair} />
        </g>
      ))}
      <circle cx={rot.cx} cy={rot.cy} r={11} {...PAINT.raised} />
      <circle cx={rot.cx} cy={rot.cy} r={4.5} {...PAINT.shaft} />

      {/* rotor shaft through the DE / NDE bearing blocks, speed pick-up at the NDE stub */}
      <rect x={414} y={596} width={41} height={11} rx={2} {...PAINT.shaft} />
      <rect x={639.5} y={596} width={85.5} height={11} rx={2} {...PAINT.shaft} />
      <BearingBlock x={414} y={560} w={41} h={84} split={601.5} />
      <BearingBlock x={640} y={560} w={39} h={84} split={601.5} />
      <rect x={706} y={590} width={24} height={23} rx={4} {...PAINT.body} />
      <rect x={724} y={597} width={10} height={9} rx={1.5} {...PAINT.raised} />

      {/* discharge to the floor bed */}
      <rect x={526} y={662} width={43} height={10} rx={1.5} {...PAINT.body} />
      <Stream x1={546} y1={683} x2={765} y2={697} w={2.2} />
      <Head x={656} y={690} deg={3.6} s={15} />

      <MachineLabel x={231.5} y={LABEL_Y} size={11.5}>CRUSHER MOTOR</MachineLabel>
      <MachineLabel x={547} y={LABEL_Y} size={11.5}>CLINKER HAMMER CRUSHER</MachineLabel>
    </g>
  );
}

/** Inclined deep-pan conveyor casing, tail to head: clinker stream over the pan strand, return strand, sprockets. */
function DeepPan() {
  const len = Math.hypot(HEAD[0] - TAIL[0], HEAD[1] - TAIL[1]);
  const a = (Math.atan2(HEAD[1] - TAIL[1], HEAD[0] - TAIL[0]) * 180) / Math.PI;
  const d = 24;
  const pans = Math.floor((len - 30) / 34);
  return (
    <g transform={`translate(${TAIL[0]} ${TAIL[1]}) rotate(${a})`} aria-hidden="true">
      <rect x={-12} y={-d / 2} width={len + 24} height={d} rx={d / 2} {...PAINT.body} />
      <line x1={4} x2={len - 4} y1={-d / 2 + 4} y2={-d / 2 + 4} {...PAINT.hair} />
      <line x1={4} x2={len - 4} y1={d / 2 - 4} y2={d / 2 - 4} stroke={MX.fine} strokeWidth={0.8} strokeDasharray="5 3" />
      {/* pans riding under the clinker stream */}
      {Array.from({ length: pans }).map((_, i) => (
        <rect key={i} x={24 + i * 34} y={1} width={11} height={6} rx={1.5} fill={MX.material} opacity={0.5} stroke={MX.edge} strokeWidth={0.6} />
      ))}
      <rect x={8} y={-2.2} width={len - 16} height={2.4} rx={1.2} fill={MX.material} />
      {[0, len].map((sx) => (
        <g key={sx}>
          <circle cx={sx} cy={0} r={13} {...PAINT.raised} />
          <circle cx={sx} cy={0} r={8.5} {...PAINT.hair} />
          <circle cx={sx} cy={0} r={4} {...PAINT.shaft} />
        </g>
      ))}
    </g>
  );
}

function Conveyor() {
  const ang = (Math.atan2(HEAD[1] - TAIL[1], HEAD[0] - TAIL[0]) * 180) / Math.PI;
  const arrows = [0.3, 0.72];
  return (
    <g aria-hidden="true">
      <DeepPan />
      {arrows.map((t) => {
        const [ax, ay] = along(t);
        return <Head key={t} x={ax} y={ay - 1} deg={ang} s={15} />;
      })}
      {/* head discharge into the silo roof */}
      <Stream x1={1166} y1={297} x2={1269} y2={330} w={2} />
      <Stream x1={1166} y1={303} x2={1267} y2={336} w={2} />
      <Head x={1218} y={314} deg={18} s={16} />

      {/* head drive: motor, coupling, reducer and chain guard down to the head sprocket */}
      <path d="M 1104 262 L 1146 300 L 1156 291 L 1116 258 Z" fill="none" stroke={MX.fine} strokeWidth={1} strokeDasharray="4 3" />
      <SideMotor x={979} y={222.5} w={77} h={42.5} cowl={15} tb={[995, 37.5, 10]} fins={4} />
      <rect x={1002.5} y={238.5} width={27.5} height={9} rx={2} {...PAINT.recess} />
      <rect x={1056} y={240} width={15} height={7.5} rx={1.5} {...PAINT.shaft} />
      <rect x={1072.5} y={202.5} width={57.5} height={10} rx={3} {...PAINT.raised} />
      <rect x={1065} y={210} width={72.5} height={56} rx={6} {...PAINT.body} />
      <rect x={1069} y={214} width={64.5} height={48} rx={4} {...PAINT.hair} />
      {[
        [1070, 215],
        [1132.5, 215],
        [1070, 261],
        [1132.5, 261],
      ].map(([bx, by]) => (
        <Bolt key={`${bx}-${by}`} x={bx} y={by} r={1.6} />
      ))}
      <circle cx={1085} cy={243.5} r={6.5} {...PAINT.raised} />
      <circle cx={1085} cy={243.5} r={2.5} {...PAINT.shaft} />
      <GearWheel cx={1110} cy={236} r={13} teeth={12} hub={4.5} />

      <MachineLabel x={1050} y={292} size={11.5}>HEAD DRIVE</MachineLabel>
      <MachineLabel x={943} y={520} size={11.5}>DEEP-PAN CONVEYOR</MachineLabel>
      <MachineLabel x={861} y={LABEL_Y} size={11.5}>TAIL</MachineLabel>
    </g>
  );
}

function Silo() {
  const cx = 1360;
  const win = { x: 1281.5, y: 392.5, w: 157, h: 101.5 };
  return (
    <g aria-hidden="true">
      {/* legs and bracing */}
      {[1267, 1454.5].map((lx) => (
        <g key={lx}>
          <rect x={lx - 5.5} y={556} width={11} height={GROUND - 556} rx={1.5} {...PAINT.body} />
          <line x1={lx} x2={lx} y1={560} y2={GROUND - 3} {...PAINT.hair} />
          <rect x={lx - 10} y={GROUND - 5} width={20} height={5} rx={1.5} {...PAINT.raised} />
        </g>
      ))}
      <path d={`M 1272.5 632.5 L ${cx} 705 L 1449 632.5`} fill="none" stroke={MX.fine} strokeWidth={1.6} />
      {/* cone and outlet */}
      <path d="M 1260 558 H 1462.5 L 1387.5 641.5 H 1335 Z" {...PAINT.cylinderV} />
      <rect x={1340} y={641.5} width={42.5} height={7} rx={1.5} {...PAINT.raised} />
      {/* ring beam */}
      <rect x={1240} y={544} width={241} height={15} rx={3} {...PAINT.raised} />
      {/* shell */}
      <rect x={1249} y={347.5} width={223.5} height={196.5} rx={3} {...PAINT.cylinderV} />
      {[387.5, 510].map((by) => (
        <line key={by} x1={1252} x2={1469.5} y1={by} y2={by} {...PAINT.detail} />
      ))}
      {[429, 470].map((by) => (
        <g key={by}>
          <line x1={1252} x2={win.x - 3} y1={by} y2={by} {...PAINT.detail} />
          <line x1={win.x + win.w + 3} x2={1469.5} y1={by} y2={by} {...PAINT.detail} />
        </g>
      ))}
      {/* level window */}
      <rect x={win.x} y={win.y} width={win.w} height={win.h} rx={6} {...PAINT.recess} />
      <path
        d={`M ${win.x + 5} 447 Q ${win.x + 50} 441 ${cx} 441.5 T ${win.x + win.w - 5} 447 V ${win.y + win.h - 5} H ${win.x + 5} Z`}
        fill={MX.material}
        opacity={0.55}
      />
      <MachineLabel x={cx} y={466} size={13} tone="ink">
        CLINKER SILO
      </MachineLabel>
      {/* roof with handrail */}
      <Handrail x1={1257} x2={1463} y={338} h={14} step={21} />
      <path d={`M 1237.5 346 L ${cx} 327.5 L 1482.5 346 V 350 H 1237.5 Z`} {...PAINT.raised} />
      {/* roof inlet from the conveyor head */}
      <rect x={1262} y={326} width={18} height={14} rx={2} {...PAINT.body} />

      {/* baghouse, clean-air riser to the dust fan, return duct */}
      <rect x={1330} y={326} width={60} height={8} rx={1.5} {...PAINT.body} />
      <rect x={1309} y={246} width={112.5} height={80} rx={6} {...PAINT.body} />
      <rect x={1313.5} y={250.5} width={103.5} height={71} rx={4} {...PAINT.hair} />
      {[1322, 1334, 1396, 1408].map((bx) => (
        <rect key={bx} x={bx - 3} y={262} width={6} height={50} rx={3} {...PAINT.hair} />
      ))}
      <Pipe pts={[[1421.5, 275], [1497, 275], [1497, 236]]} d={8} />
      <line x1={cx} x2={cx} y1={246} y2={205} stroke={MX.air} strokeWidth={2} />
      <line x1={cx} x2={1490} y1={205} y2={205} stroke={MX.air} strokeWidth={2} />
      <Head x={cx} y={226} deg={-90} s={15} fill={MX.air} />
      <Head x={1428} y={205} deg={0} s={15} fill={MX.air} />
      <Volute cx={1514} cy={207} r={18} outH={4} dir={-1} rotor={false} />
      <MachineLabel x={1352} y={240} anchor="end" size={11.5}>
        BAGHOUSE
      </MachineLabel>

      {/* level sensor nozzle on the roof */}
      <rect x={1451} y={322} width={15} height={22} rx={2} {...PAINT.body} />
      <rect x={1448} y={334} width={21} height={5} rx={1.5} {...PAINT.raised} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={70} x2={1581} y={GROUND} />
      <CrusherLine />
      <Conveyor />
      <Silo />
    </g>
  );
}

/**
 * Pad centre per point (sheet units), as on PDF page 6. On the crusher the
 * bearing-block pads sit at the block ends (blocks drawn a little taller than
 * printed) and the winding pad on the shaft line, so the vibration, speed /
 * winding and temperature plates run in three clear rows.
 */
const pads: LineSheetArt["pads"] = {
  "ELE-HMR-01": [227, 518],
  "TMP-HMR-03": [201.5, 601.5],
  "VIB-HMR-01": [435.5, 571.5],
  "TMP-HMR-01": [435.5, 631.5],
  "VIB-HMR-02": [659, 571.5],
  "TMP-HMR-02": [659, 631.5],
  "SPD-HMR-01": [718, 601.5],
  "SPD-CSL-01": [772.5, 699],
  "ELE-CSL-01": [1009.5, 213],
  "TMP-CSL-02": [1031.8, 252.8],
  "VIB-CSL-01": [1101, 215.2],
  "PRS-CSL-01": [1365, 286.2],
  "LEV-CSL-01": [1458.8, 316.8],
  "ELE-CSL-02": [1512.5, 205],
};

/**
 * Plate side per point (embedded plates) and stand-off slot. DE plates run
 * left over the motor, NDE and speed plates right towards the conveyor, so no
 * reading sits over the crusher housing; head-drive and silo plates run left
 * over their equipment to stay inside the frame.
 */
const callouts: LineSheetArt["callouts"] = {
  "ELE-HMR-01": [228.5, 486, "middle"],
  "TMP-HMR-03": [202, 676, "start"],
  "VIB-HMR-01": [420, 571.5, "end"],
  "TMP-HMR-01": [420, 631.5, "end"],
  "VIB-HMR-02": [683.5, 571.5, "start"],
  "SPD-HMR-01": [743, 601.5, "start"],
  "TMP-HMR-02": [683.5, 631.5, "start"],
  "SPD-CSL-01": [810, 700.8, "start"],
  "ELE-CSL-01": [1009, 183, "end"],
  "TMP-CSL-02": [1033.5, 281.8, "end"],
  "VIB-CSL-01": [1137.5, 215, "start"],
  "PRS-CSL-01": [1364, 317, "end"],
  "LEV-CSL-01": [1440, 317, "end"],
  "ELE-CSL-02": [1500, 165, "end"],
};

export const sheet: LineSheetArt = { id: "H-0", ready: true, width: W, height: H, Art, pads, callouts };
