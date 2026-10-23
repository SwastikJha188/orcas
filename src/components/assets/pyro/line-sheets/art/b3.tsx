/**
 * Sheet B-3 — BRN-01 · Main burner — Fine-coal bin and kiln coal feeder.
 *
 * Panel "FINE-COAL BIN AND KILN COAL FEEDER" of group image 4B (page 11, panel
 * box 48.5 105.5 – 811.5 777.5): the fine-coal bin (roof rail, level radar on
 * the roof, shell with the FINE-COAL BIN window, skirt ring, cone) on its four
 * legs with cross bracing; the wall thermometer on the left; the CO / CO₂
 * analyser on its dashed sample line on the right; the kiln coal (weigh)
 * feeder under the cone and the coal line from the feeder to the conveying
 * line; the nitrogen purge line into the bin and the bin aeration blower with
 * its air line to the cone (Rev 02); the hazardous-area note under the ground line.
 */
import React from "react";
import { GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Pipe } from "../../drawings/clk-parts";
import type { LineSheetArt } from "../types";
import { EndArrow, Flow, Head, ToneLabel } from "./parts-b2";
import { FanSet } from "./parts-d";
import { AirLine } from "./parts-fd";

const W = 763;
const H = 672;
const GROUND = 621;

const SHELL = { x: 213, y: 148.5, w: 256.5, h: 191.5 };
const WIN = { x: 251, y: 191, w: 180, h: 98 };
const FEEDER = { x: 300, y: 472.5, w: 82.5, h: 47.5 };
const DROP_X = 341;
const LINE_Y = 560;
const EDGE = 726;

function Bin() {
  const posts = [216.5, 241.5, 266.5, 291.5, 316.5, 341, 366, 391, 416, 441, 465.5];
  return (
    <g>
      {/* legs (double tubes) and cross bracing */}
      {[227.5, 446.5].map((lx) => (
        <g key={lx}>
          <rect x={lx} y={350} width={7.5} height={GROUND - 350} {...PAINT.cylinderV} />
          <rect x={lx - 3} y={GROUND - 4} width={13.5} height={4} rx={1} {...PAINT.raised} />
        </g>
      ))}
      <line x1={235} y1={447.5} x2={341} y2={615} {...PAINT.detail} />
      <line x1={446.5} y1={447.5} x2={341} y2={615} {...PAINT.detail} />

      {/* cone and skirt ring */}
      <path d="M 218 350 H 464 L 369 459 H 314 Z" {...PAINT.cylinderV} />
      <rect x={207} y={340} width={268} height={10} rx={3} {...PAINT.raised} />

      {/* shell, ring seams, window with the coal bed */}
      <rect x={SHELL.x} y={SHELL.y} width={SHELL.w} height={SHELL.h} {...PAINT.cylinderV} />
      {[187.5, 226.5, 266, 305].map((ry) => (
        <line key={ry} x1={SHELL.x + 2} x2={SHELL.x + SHELL.w - 2} y1={ry} y2={ry} stroke={MX.fine} strokeWidth={0.8} />
      ))}
      <rect x={WIN.x} y={WIN.y} width={WIN.w} height={WIN.h} rx={6} {...PAINT.recess} />
      <rect x={WIN.x} y={WIN.y} width={WIN.w} height={WIN.h} rx={6} fill="none" stroke={MX.edge} strokeWidth={MX.w} />
      <path d={`M 255 236 Q 341 226 427 236 V 285 H 255 Z`} fill={MX.material} opacity={0.32} />

      {/* roof and roof rail */}
      <line x1={216.5} x2={465.5} y1={131} y2={131} stroke={MX.edge} strokeWidth={1.2} />
      {posts.map((px) => (
        <line key={px} x1={px} x2={px} y1={131} y2={148.5} stroke={MX.edge} strokeWidth={1} />
      ))}
      <path d="M 205.5 148.5 L 341 125 L 476.5 148.5 Z" {...PAINT.raised} />

      {/* level radar on the roof */}
      <rect x={339} y={110} width={4} height={16} {...PAINT.shaft} />
      <rect x={331} y={96} width={20} height={16} rx={3} {...PAINT.body} />

      {/* nitrogen purge line with its valve into the bin shell */}
      <AirLine pts={[[64, 175], [SHELL.x, 175]]} />
      <rect x={150} y={168} width={15} height={14} rx={2.5} {...PAINT.raised} />
      {/* bin aeration blower and its air line into the cone */}
      <AirLine pts={[[120, 416], [120, 395], [257.5, 395]]} />
      <FanSet cx={120} cy={430} r={10} />

      {/* wall thermometer */}
      <rect x={182} y={248} width={31} height={3.5} {...PAINT.shaft} />
      <rect x={209} y={244} width={6} height={12} rx={1.5} {...PAINT.raised} />

      {/* CO / CO₂ analyser on its sample line */}
      <line x1={469.5} y1={229.5} x2={536.5} y2={229.5} stroke={MX.fine} strokeWidth={1.2} strokeDasharray="4 3" />
      <rect x={536.5} y={189} width={135.5} height={87.5} rx={7} {...PAINT.body} />
      <rect x={550} y={203.5} width={109} height={38.5} rx={3} {...PAINT.recess} />
      <rect x={550} y={203.5} width={109} height={38.5} rx={3} fill="none" stroke={MX.edge} strokeWidth={MX.w} />
    </g>
  );
}

function FeederAndLine() {
  const { x, y, w, h } = FEEDER;
  return (
    <g>
      {/* feeder outlet to the conveying line */}
      <Pipe pts={[[DROP_X, y + h - 2], [DROP_X, LINE_Y], [EDGE, LINE_Y]]} w={12.5} />
      <rect x={640} y={LINE_Y - 10} width={5} height={20} rx={1.5} {...PAINT.raised} />
      {/* cone outlet into the feeder */}
      <rect x={334} y={457} width={14} height={17} {...PAINT.shaft} />
      {/* weigh feeder */}
      <rect x={x} y={y} width={w} height={h} rx={5} {...PAINT.body} />
      <rect x={314} y={483} width={55} height={26} rx={3} {...PAINT.recess} />
      <rect x={314} y={483} width={55} height={26} rx={3} fill="none" stroke={MX.edge} strokeWidth={MX.w} />
      {/* coal: feeder → conveying line */}
      <Flow pts={[[DROP_X, 521], [DROP_X, LINE_Y], [EDGE, LINE_Y]]} color={MX.material} w={2} />
      <Head x={DROP_X} y={548} dir="down" color={MX.material} />
      <Head x={560} y={LINE_Y} dir="right" color={MX.material} />
      <EndArrow x1={729} x2={751} y={LINE_Y} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={30} x2={733} y={GROUND} />
      <Bin />
      <FeederAndLine />

      <MachineLabel x={341} y={262} size={10} tone="ink">
        FINE-COAL BIN
      </MachineLabel>
      <MachineLabel x={66} y={195} anchor="start" size={7.5}>
        N₂ PURGE
      </MachineLabel>
      <MachineLabel x={135} y={459} size={7.5}>
        BIN AERATION BLOWER
      </MachineLabel>
      <MachineLabel x={604} y={294} size={8.5}>
        CO / CO₂ ANALYSER
      </MachineLabel>
      <MachineLabel x={331} y={541} anchor="end" size={8}>
        KILN COAL FEEDER (WEIGH)
      </MachineLabel>
      <MachineLabel x={745} y={547.5} anchor="end" size={8.5}>
        TO CONVEYING LINE
      </MachineLabel>
      <ToneLabel x={64.5} y={641.5} color={MX.material} size={8}>
        HAZARDOUS AREA: COAL DUST — EX EQUIPMENT (CONFIRM WITH EHS)
      </ToneLabel>
    </g>
  );
}

/**
 * Pad centre per point (sheet units), as on group image 4B, left panel.
 */
const pads: LineSheetArt["pads"] = {
  "LEV-BRN-01": [341, 88.7],
  "TMP-BRN-04": [174.7, 249.5],
  "GAS-BRN-01": [604.3, 222.5],
  "FLO-BRN-01": [381.3, 496],
  "STS-BRN-02": [157.5, 175],
  "STS-BRN-01": [120, 430],
  "ELE-BRN-03": [151, 419.5],
};

/** Plate side per point (start = plate right of the pad, end = left); stand-off slot if both sides collide. */
const callouts: LineSheetArt["callouts"] = {
  "LEV-BRN-01": [349, 62, "start"],
  "TMP-BRN-04": [167, 222, "end"],
  "GAS-BRN-01": [612, 170, "start"],
  "FLO-BRN-01": [389, 470, "start"],
  "STS-BRN-02": [157.5, 150, "middle"],
  "STS-BRN-01": [125, 477, "middle"],
  "ELE-BRN-03": [125, 495, "middle"],
};

export const sheet: LineSheetArt = { id: "B-3", ready: true, width: W, height: H, Art, pads, callouts };
