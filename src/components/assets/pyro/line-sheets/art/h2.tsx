/**
 * Sheet H-2 — CSL-01 · Clinker transport — Deep-pan conveyor.
 * Composed as PDF page 36: the inclined deep-pan conveyor from the tail shaft
 * (feed chute from the crusher, screw take-up) up to the head, on three
 * trestle columns with a walkway rail; the head drive (motor on a
 * shaft-mounted reducer, belt guard, torque arm) and the head discharge chute
 * to the clinker silo.
 */
import React from "react";
import { Bolt, GearWheel, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Lumps } from "../../sheets/sc-parts";
import type { LineSheetArt } from "../types";
import { Column, DriveMotor, Flow, PanConveyor, Pier } from "./parts-h";

const W = 824;
const H = 704;

const GROUND = 660.5;
const TAIL: [number, number] = [105.5, 629];
const HEAD: [number, number] = [690.5, 164];
const D = 32;
const SLOPE = (HEAD[1] - TAIL[1]) / (HEAD[0] - TAIL[0]);
const LEN = Math.hypot(HEAD[0] - TAIL[0], HEAD[1] - TAIL[1]);
const ANG = (Math.atan2(HEAD[1] - TAIL[1], HEAD[0] - TAIL[0]) * 180) / Math.PI;
const HALF = D / 2 / Math.cos((ANG * Math.PI) / 180);
const beltY = (x: number) => TAIL[1] + (x - TAIL[0]) * SLOPE;
const GB = { x: 720, y: 120, w: 84, h: 69 };

/** Walkway handrail along the incline (rotated frame). */
function InclineRail() {
  const posts: number[] = [];
  for (let s = 130; s < LEN - 60; s += 34) posts.push(s);
  const y0 = -D / 2 - 3;
  return (
    <g transform={`translate(${TAIL[0]} ${TAIL[1]}) rotate(${ANG})`} aria-hidden="true">
      {posts.map((s) => (
        <line key={s} x1={s} x2={s} y1={y0} y2={y0 - 16} stroke={MX.edge} strokeWidth={1} />
      ))}
      <line x1={posts[0]} x2={posts[posts.length - 1]} y1={y0 - 16} y2={y0 - 16} stroke={MX.edge} strokeWidth={1.4} />
      <line x1={posts[0]} x2={posts[posts.length - 1]} y1={y0 - 8} y2={y0 - 8} stroke={MX.fine} strokeWidth={1} />
    </g>
  );
}

function Art() {
  const cols = [248, 420.5, 585.5];
  const under = (x: number) => beltY(x) + HALF;
  return (
    <g>
      <GroundLine x1={22} x2={804} y={GROUND} />

      {/* ---------------- trestle columns and bracing ---------------- */}
      {[0, 1].map((i) => {
        const a = cols[i] + 4;
        const b = cols[i + 1] - 4;
        const top = under(cols[i]) + 16;
        return (
          <g key={i}>
            <line x1={a} y1={top} x2={b} y2={GROUND - 30} stroke={MX.fine} strokeWidth={2} />
            <line x1={a} y1={GROUND - 30} x2={b} y2={top} stroke={MX.fine} strokeWidth={2} />
          </g>
        );
      })}
      <line x1={cols[0] + 4} x2={cols[2] - 4} y1={GROUND - 30} y2={GROUND - 30} stroke={MX.fine} strokeWidth={2} />
      {cols.map((cx) => (
        <g key={cx}>
          <Column x={cx} y1={under(cx) - 6} y2={GROUND} w={9} />
          <rect x={cx - 12} y={under(cx) - 8} width={24} height={7} rx={1.5} {...PAINT.raised} transform={`rotate(${ANG} ${cx} ${under(cx) - 4})`} />
        </g>
      ))}

      {/* ---------------- tail: frame and screw take-up ---------------- */}
      <Pier x={70} y={GROUND - 9} w={74} h={9} />
      <path d={`M ${TAIL[0] - 14} ${GROUND - 9} L ${TAIL[0] - 8} ${TAIL[1] + 12} H ${TAIL[0] + 26} L ${TAIL[0] + 34} ${GROUND - 9} Z`} {...PAINT.body} />
      <rect x={TAIL[0] - 50} y={TAIL[1] - 3} width={30} height={6} rx={1.5} {...PAINT.shaft} />
      <rect x={TAIL[0] - 56} y={TAIL[1] - 8} width={8} height={16} rx={1.5} {...PAINT.raised} />
      <rect x={TAIL[0] - 54} y={TAIL[1] + 8} width={4} height={GROUND - 9 - TAIL[1] - 8} {...PAINT.body} />
      {[-44, -38, -32, -26].map((s) => (
        <line key={s} x1={TAIL[0] + s} x2={TAIL[0] + s + 2} y1={TAIL[1] - 3} y2={TAIL[1] + 3} stroke={MX.edge} strokeWidth={0.8} />
      ))}

      {/* ---------------- feed chute from the crusher ---------------- */}
      <path d={`M 140 500 H 183 L 180 ${beltY(180)} L 146 ${beltY(146)} Z`} {...PAINT.body} />
      <path d={`M 147 506 H 176 L 174 ${beltY(174) - HALF - 4} L 152 ${beltY(152) - HALF - 4} Z`} {...PAINT.recess} />
      <rect x={136} y={495} width={51} height={7} rx={2} {...PAINT.raised} />
      {[142, 161.5, 181].map((bx) => (
        <Bolt key={bx} x={bx} y={498.5} r={1.3} />
      ))}
      <Lumps pts={[[158, 518], [168, 532], [156, 546], [166, 558]]} r={3} />
      {/* ---------------- conveyor ---------------- */}
      <PanConveyor x1={TAIL[0]} y1={TAIL[1]} x2={HEAD[0]} y2={HEAD[1]} d={D} sprocket={22} doors={[0.3, 0.55, 0.8]} />
      <InclineRail />
      <MachineLabel x={56} y={591.6} anchor="start" size={8.2}>TAIL SHAFT</MachineLabel>
      <MachineLabel x={289} y={328.7} anchor="start" size={9}>DEEP-PAN CONVEYOR</MachineLabel>

      <Flow x1={161.5} y1={466} x2={161.5} y2={490} />
      <MachineLabel x={75.5} y={674.1} anchor="start" size={8.2}>FROM CRUSHER (H-1)</MachineLabel>

      {/* ---------------- head casing and discharge chute ---------------- */}
      <path d="M 668 192 H 714 L 708 232 H 676 Z" {...PAINT.body} />
      <path d="M 675 196 H 707 L 703 228 H 681 Z" {...PAINT.recess} />
      <rect x={672} y={230} width={40} height={6} rx={1.5} {...PAINT.raised} />
      <Lumps pts={[[688, 204], [696, 216], [686, 224]]} r={2.8} />
      <Flow x1={692} y1={240} x2={692} y2={256} />
      <MachineLabel x={668.5} y={269.1} anchor="start" size={8.2}>TO CLINKER SILO (H-3)</MachineLabel>
      <rect x={660} y={132} width={58} height={64} rx={9} {...PAINT.body} />
      <rect x={665} y={137} width={48} height={54} rx={6} {...PAINT.hair} />
      <circle cx={HEAD[0]} cy={HEAD[1]} r={22} {...PAINT.recess} />
      <GearWheel cx={HEAD[0]} cy={HEAD[1]} r={15} teeth={11} hub={6} />
      <Bolt x={667} y={139} r={1.5} />
      <Bolt x={711} y={139} r={1.5} />
      <Bolt x={667} y={189} r={1.5} />
      <Bolt x={711} y={189} r={1.5} />
      <rect x={714} y={HEAD[1] - 5} width={10} height={10} rx={1.5} {...PAINT.shaft} />

      {/* ---------------- head drive ---------------- */}
      {/* shaft-mounted reducer */}
      <rect x={GB.x} y={GB.y} width={GB.w} height={GB.h} rx={7} {...PAINT.body} />
      <rect x={GB.x + 5} y={GB.y + 5} width={GB.w - 10} height={GB.h - 10} rx={4} {...PAINT.hair} />
      <line x1={GB.x + 2} x2={GB.x + GB.w - 2} y1={GB.y + 44} y2={GB.y + 44} stroke={MX.edge} strokeWidth={1.1} />
      <circle cx={772} cy={149} r={20.5} {...PAINT.raised} />
      <circle cx={772} cy={149} r={14} {...PAINT.hair} />
      <circle cx={772} cy={149} r={6} {...PAINT.shaft} />
      <circle cx={743} cy={HEAD[1]} r={12} {...PAINT.raised} />
      <circle cx={743} cy={HEAD[1]} r={5} {...PAINT.shaft} />
      {[GB.x + 6, GB.x + GB.w - 6].map((bx) => [GB.y + 6, GB.y + GB.h - 6].map((by) => <Bolt key={`${bx}-${by}`} x={bx} y={by} r={1.6} />))}
      {/* torque arm to the head casing */}
      <rect x={712} y={GB.y + GB.h - 5} width={24} height={6} rx={2} {...PAINT.body} />
      <Bolt x={716} y={GB.y + GB.h - 2} r={1.2} />
      {/* motor base and motor */}
      <rect x={690} y={113} width={100} height={7} rx={1.5} {...PAINT.raised} />
      <DriveMotor x={682.5} y={52.5} w={113.5} h={55} footY={113} shaft={8} />
      {/* V-belt guard: motor pulley down to the reducer input */}
      <rect x={805} y={66} width={14} height={98} rx={7} {...PAINT.body} />
      {[86, 104, 122, 140].map((gy) => (
        <line key={gy} x1={809} x2={815} y1={gy} y2={gy} {...PAINT.hair} />
      ))}
      <MachineLabel x={717.5} y={209.1} anchor="start" size={8.2}>HEAD DRIVE</MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 36. */
const pads: LineSheetArt["pads"] = {
  "SPD-CSL-01": [105.5, 629],
  "VIB-CSL-01": [761.5, 131],
  "ELE-CSL-01": [728, 47],
};

/** Tag chip centre per point, as on PDF page 36. */
const chips: NonNullable<LineSheetArt["chips"]> = {
  "SPD-CSL-01": [183.5, 606.5],
  "VIB-CSL-01": [683, 20],
  "ELE-CSL-01": [604.5, 84.5],
};

export const sheet: LineSheetArt = { id: "H-2", ready: true, width: W, height: H, Art, pads, chips };
