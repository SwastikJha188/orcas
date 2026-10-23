/**
 * Sheet G-1 — BGH-01 · Bags, hoppers, inlet and stack. Group images page 2C,
 * left panel (page box 48.5, 105.5 → 811.5, 777.5): inlet duct from the ID fan
 * (temperature and draft), pulse-cleaning air header and controller, clean-gas
 * plenum over three filter-bag compartments, bag ΔP transmitter on its
 * impulse lines, three dust hoppers each with a level switch and a rotary
 * airlock (zero-speed), dust discharge conveyor and airlock, outlet duct to the
 * baghouse fan (outlet pressure) and the stack CEMS (dust, SOx, NOx, CO, CO₂).
 */
import React from "react";
import { GroundLine, MX, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Pipe } from "../../drawings/fkp-parts";
import type { LineSheetArt } from "../types";
import { Caps, FlowArrow, InstrumentBox, MealLine, Tap } from "./parts-p2";

const W = 763;
const H = 672;
const GROUND = 634;
const BAG = { x0: 165.5, x1: 544, top: 128, plenum: 188.5, body: 423, hop: 506.5 };
const CW = (BAG.x1 - BAG.x0) / 3;
const OUTLETS: Array<[number, number]> = [
  [213.5, 245],
  [339, 370],
  [464.5, 496.5],
];

function Baghouse() {
  const { x0, x1, top, plenum, body, hop } = BAG;
  return (
    <g>
      {OUTLETS.map(([a, b], i) => (
        <g key={a}>
          <path d={`M ${x0 + i * CW} ${body} L ${x0 + (i + 1) * CW} ${body} L ${b} ${hop} L ${a} ${hop} Z`} {...PAINT.cylinderV} />
          <MealLine pts={[[(a + b) / 2, hop + 1], [(a + b) / 2, 546]]} w={1.8} />
        </g>
      ))}
      <rect x={x0} y={plenum} width={x1 - x0} height={body - plenum} rx={3} {...PAINT.body} />
      {[1, 2].map((i) => (
        <line key={i} x1={x0 + i * CW} x2={x0 + i * CW} y1={plenum} y2={body} stroke={MX.edge} strokeWidth={1.4} />
      ))}
      {[0, 1, 2].map((i) =>
        [21, 42, 63, 84, 105].map((dx) => <line key={`${i}-${dx}`} x1={x0 + i * CW + dx} x2={x0 + i * CW + dx} y1={211} y2={400} {...PAINT.hair} />),
      )}
      <rect x={x0} y={top} width={x1 - x0} height={plenum - top} rx={4} {...PAINT.body} />
      <line x1={x0 + 4} x2={x1 - 4} y1={plenum - 4} y2={plenum - 4} {...PAINT.hair} />
    </g>
  );
}

function PulseController() {
  return (
    <g>
      <rect x={585.5} y={148.5} width={85} height={7.5} rx={2} {...PAINT.raised} />
      <rect x={590.5} y={87.5} width={75} height={61} rx={5} {...PAINT.body} />
      <rect x={596} y={93} width={64} height={50.5} rx={3.5} fill="none" stroke={MX.fine} strokeWidth={0.8} />
      <rect x={605} y={96} width={45} height={7.5} rx={2} {...PAINT.recess} />
      <rect x={654.5} y={112.5} width={4.5} height={8.5} rx={1} {...PAINT.shaft} />
      {[129.5, 134.5].map((y) => (
        <line key={y} x1={609} x2={647.5} y1={y} y2={y} stroke={MX.fine} strokeWidth={0.9} />
      ))}
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={30} x2={733} y={GROUND} />
      {/* pulse-cleaning air header */}
      <Pipe pts={[[BAG.x0, 101], [BAG.x1, 101]]} d={7} elbows={false} />
      {/* inlet from the ID fan, outlet to the baghouse fan */}
      <Pipe pts={[[31, 188.5], [BAG.x0 + 2, 188.5]]} d={33} elbows={false} />
      <rect x={31} y={183.5} width={134.5} height={10} fill={MX.deep} opacity={0.45} />
      <Pipe pts={[[BAG.x1 - 2, 216], [726, 216]]} d={30} elbows={false} />
      <rect x={BAG.x1} y={211.5} width={182} height={9} fill={MX.deep} opacity={0.45} />
      <FlowArrow x1={725} y1={248.5} x2={747.5} y2={248.5} color={MX.label} w={1.3} s={4.5} />
      {/* bag ΔP transmitter on dirty / clean side impulse lines */}
      <Tap pts={[[BAG.x1, 161.5], [591, 161.5], [591, 249]]} />
      <Tap pts={[[591, 284], [591, 377.5], [BAG.x1, 377.5]]} />
      <InstrumentBox x={577.5} y={249} w={41} h={35} rx={4} />
      <Baghouse />
      <PulseController />
      {/* level switch on each hopper, rotary airlock under each hopper outlet */}
      {[0, 1, 2].map((i) => (
        <InstrumentBox key={i} x={361 + (i - 1) * CW} y={491.5} w={30} h={19.5} rx={3} />
      ))}
      {OUTLETS.map(([a, b]) => (
        <g key={a}>
          <circle cx={(a + b) / 2} cy={526} r={8.5} {...PAINT.raised} />
          <circle cx={(a + b) / 2} cy={526} r={3.5} fill="none" stroke={MX.edge} strokeWidth={1} />
        </g>
      ))}
      {/* dust discharge conveyor and airlock with its motor */}
      <rect x={185.5} y={546.5} width={338} height={21} rx={4} {...PAINT.cylinder} />
      <circle cx={550} cy={557} r={16.5} {...PAINT.raised} />
      <circle cx={550} cy={557} r={10} fill="none" stroke={MX.fine} strokeWidth={0.9} />
      <InstrumentBox x={568} y={548.5} w={40.5} h={17.5} rx={3} />
      {/* stack dust CEMS */}
      <InstrumentBox x={645} y={432} w={74.5} h={58} rx={4} />
      <Caps x={37.5} y={161} size={7.5} color={MX.gas} spacing="0.2em">
        FROM ID FAN
      </Caps>
      <Caps x={172.5} y={91} size={7} spacing="0.24em">
        PULSE-CLEANING AIR HEADER
      </Caps>
      <Caps x={354.5} y={121} size={7} anchor="middle" spacing="0.24em">
        CLEAN-GAS PLENUM
      </Caps>
      <Caps x={354.5} y={310} size={7} anchor="middle" spacing="0.24em">
        FILTER BAGS
      </Caps>
      <Caps x={627.5} y={171.5} size={7} anchor="middle" spacing="0.24em">
        PULSE CONTROLLER
      </Caps>
      <Caps x={624} y={263} size={6.5} spacing="0.2em">
        TO BAGHOUSE FAN → STACK
      </Caps>
      <Caps x={674} y={303} size={7} anchor="middle" spacing="0.24em">
        ΔP ACROSS BAGS
      </Caps>
      <Caps x={681.5} y={425} size={6.5} anchor="middle" spacing="0.2em">
        STACK CEMS (READ-ONLY)
      </Caps>
      <Caps x={354.5} y={587} size={7} anchor="middle" spacing="0.24em">
        DUST DISCHARGE CONVEYOR + AIRLOCK
      </Caps>
    </g>
  );
}

/** Pad centre per point, at the group-image pads; hoppers 1–3 left → right (level switch, then airlock under it), CEMS species on its box. */
const pads: LineSheetArt["pads"] = {
  "PRS-BGH-02": [125, 188.5],
  "PRS-BGH-03": [660, 216],
  "PRS-BGH-01": [597.5, 266.5],
  "TMP-BGH-02": [71, 188.5],
  "STS-BGH-01": [628, 107.5],
  "LEV-BGH-01": [376 - CW, 501.5],
  "LEV-BGH-02": [376, 501.5],
  "LEV-BGH-03": [376 + CW, 501.5],
  "SPD-BGH-02": [(OUTLETS[0][0] + OUTLETS[0][1]) / 2, 526],
  "SPD-BGH-03": [(OUTLETS[1][0] + OUTLETS[1][1]) / 2, 526],
  "SPD-BGH-04": [(OUTLETS[2][0] + OUTLETS[2][1]) / 2, 526],
  "GAS-BGH-01": [657.5, 447],
  "GAS-BGH-02": [682, 447],
  "GAS-BGH-03": [706.5, 447],
  "GAS-BGH-04": [669.8, 474],
  "GAS-BGH-05": [694.3, 474],
};

/** Inlet points under the inlet duct, outlet pressure over the outlet duct, controller back over its header, ΔP over the bags, hopper plates in the gaps between the hoppers, CEMS plates stacked above its box. */
const callouts: LineSheetArt["callouts"] = {
  "PRS-BGH-02": [58, 238.5, "start"],
  "PRS-BGH-03": [700, 192, "middle"],
  "PRS-BGH-01": [580.5, 294, "end"],
  "TMP-BGH-02": [22.5, 215, "start"],
  "STS-BGH-01": [586, 79.5, "end"],
  "LEV-BGH-01": [200, 490, "end"],
  "LEV-BGH-02": [372, 485, "start"],
  "LEV-BGH-03": [515, 490, "start"],
  "SPD-BGH-02": [200, 526, "end"],
  "SPD-BGH-03": [372, 528, "start"],
  "SPD-BGH-04": [500, 528, "start"],
  "GAS-BGH-01": [640, 330, "start"],
  "GAS-BGH-02": [640, 348, "start"],
  "GAS-BGH-03": [640, 366, "start"],
  "GAS-BGH-04": [640, 384, "start"],
  "GAS-BGH-05": [640, 402, "start"],
};

export const sheet: LineSheetArt = { id: "G-1", ready: true, width: W, height: H, Art, pads, callouts };
