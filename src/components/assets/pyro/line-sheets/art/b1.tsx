/**
 * Sheet B-1 — BRN-01 · Main burner — Burner and air streams.
 *
 * Panel "BURNER AND AIR STREAMS" of group image 4A (page 10, panel box
 * 48.5 105.5 – 811.5 777.5): the flame camera above the kiln hood with its
 * dashed sight line into the flame; the kiln hood with its inner lining and
 * the secondary-air thermocouple in the floor, secondary air rising from the
 * cooler; the multi-channel burner in longitudinal section (axial jet air,
 * swirl air, coal + conveying air, centre pipe) into the burner manifold; the
 * primary-air header from the fan splitting into the swirl and axial lines
 * down into the manifold; the coal + conveying-air line from the blower into
 * the manifold bottom.
 */
import React from "react";
import { CornerBolts, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Pipe } from "../../drawings/clk-parts";
import type { LineSheetArt } from "../types";
import { Flow, Head, ToneLabel } from "./parts-b2";

const W = 763;
const H = 672;
const GROUND = 621;

const HOOD = { x: 37.5, y: 148.5, w: 169, h: 405 };
const FLAME = { cx: 52, cy: 317.5, rx: 52, ry: 27 };
const BURNER = { x: 118, y: 256, w: 405, h: 122.5 };
const MAN = { x: 523, y: 243, w: 102, h: 148.5 };
/** Primary-air header (from the fan) and its swirl / axial branches, centre lines. */
const HDR_X = 659;
const HDR_Y = 121;
const SPLIT_Y = 192;
const SWIRL_X = 591;
const AX_Y = 229;
const AX_X = 617;
/** Coal + conveying-air line into the manifold bottom. */
const COAL_X = 574;
const COAL_Y = 446;
const EDGE = 728;

/** Burner channel bands, top to bottom: [y, h, kind]. */
const BANDS: Array<[number, number, "axial" | "swirl" | "coal" | "centre"]> = [
  [261.5, 15, "axial"],
  [278.5, 13.5, "swirl"],
  [294, 13, "coal"],
  [310.5, 13.5, "centre"],
  [327.5, 13, "coal"],
  [342.5, 13, "swirl"],
  [357.5, 15, "axial"],
];

function CameraAndHood() {
  const { cx, cy, rx, ry } = FLAME;
  const flameId = `${React.useId().replace(/:/g, "")}-flame`;
  return (
    <g>
      {/* flame camera with its purged sight port; dashed sight line into the flame */}
      <rect x={100} y={83} width={16} height={6} rx={1.5} {...PAINT.shaft} />
      <rect x={84} y={54} width={48} height={29.5} rx={4} {...PAINT.body} />
      <rect x={88.5} y={58.5} width={39} height={20.5} rx={3} fill="none" stroke={MX.fine} strokeWidth={0.8} />
      <line x1={108} y1={89} x2={57.5} y2={300} stroke={MX.air} strokeWidth={1} strokeDasharray="4 3" />

      {/* kiln hood with its inner lining */}
      <rect x={HOOD.x} y={HOOD.y} width={HOOD.w} height={HOOD.h} rx={8} {...PAINT.body} />
      <rect x={38.5} y={161.5} width={20} height={378.5} rx={4} fill={MX.deep} stroke={MX.edge} strokeWidth={MX.w} />
      <rect x={38.5} y={161.5} width={20} height={378.5} rx={4} fill={MX.heat} opacity={0.3} />

      {/* flame out of the burner tip */}
      <defs>
        <radialGradient id={flameId} cx="0.35" cy="0.5" r="0.7">
          <stop offset="0" stopColor="var(--mx-material-hi)" stopOpacity={1} />
          <stop offset="0.45" stopColor="var(--mx-material)" stopOpacity={0.9} />
          <stop offset="0.8" stopColor="var(--mx-material-deep)" stopOpacity={0.55} />
          <stop offset="1" stopColor="var(--mx-material-deep)" stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${flameId})`} />

      {/* secondary-air thermocouple through the hood floor */}
      <rect x={83.5} y={536} width={2} height={18} {...PAINT.shaft} />

      {/* secondary air rising from the cooler */}
      {[121.5, 165.5].map((ax) => (
        <g key={ax}>
          <Flow pts={[[ax, 608], [ax, 568]]} color={MX.air} w={1.6} />
          <Head x={ax} y={558} dir="up" color={MX.air} />
        </g>
      ))}
    </g>
  );
}

function Burner() {
  const { x, y, w, h } = BURNER;
  const fill = (k: (typeof BANDS)[number][2]) =>
    k === "axial" ? { fill: MX.air, opacity: 0.3 } : k === "swirl" ? { fill: MX.air, opacity: 0.62 } : k === "coal" ? { fill: MX.material, opacity: 0.5 } : null;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={4} {...PAINT.body} />
      {BANDS.map(([by, bh, k]) => {
        const f = fill(k);
        return (
          <g key={by}>
            <rect x={x + 2} y={by} width={w - 4} height={bh} fill={MX.deep} stroke={MX.fine} strokeWidth={0.8} />
            {f && <rect x={x + 2} y={by} width={w - 4} height={bh} {...f} />}
          </g>
        );
      })}
      {/* tip ring and hood wall collar */}
      <rect x={x - 3} y={y - 3} width={6} height={h + 6} rx={2} {...PAINT.raised} />
      <rect x={HOOD.x + HOOD.w - 3} y={y - 5} width={7} height={h + 10} rx={2} {...PAINT.raised} />

      <MachineLabel x={330} y={271.5} size={7} tone="ink">
        AXIAL (JET) AIR
      </MachineLabel>
      <MachineLabel x={330} y={287.8} size={7} tone="ink">
        SWIRL (HELICAL) AIR
      </MachineLabel>
      <MachineLabel x={330} y={303} size={7} tone="ink">
        COAL + CONVEYING AIR
      </MachineLabel>
      <MachineLabel x={330} y={319.6} size={6}>
        CENTRE PIPE
      </MachineLabel>
    </g>
  );
}

function ManifoldAndLines() {
  return (
    <g>
      {/* swirl and axial lines from the header down into the manifold */}
      <Pipe pts={[[HDR_X, SPLIT_Y - 6], [HDR_X, SPLIT_Y], [SWIRL_X, SPLIT_Y], [SWIRL_X, MAN.y + 2]]} w={9} />
      <Pipe pts={[[HDR_X, SPLIT_Y], [HDR_X, AX_Y], [AX_X, AX_Y], [AX_X, MAN.y + 2]]} w={9} />
      {/* primary-air header from the fan, pressure tap on its riser */}
      <Pipe pts={[[EDGE, HDR_Y], [HDR_X, HDR_Y], [HDR_X, SPLIT_Y + 4]]} w={15} />
      <rect x={HDR_X + 7} y={147} width={12} height={3} {...PAINT.shaft} />
      <rect x={HDR_X - 11} y={SPLIT_Y - 1} width={22} height={5} rx={1.5} {...PAINT.raised} />
      <rect x={700} y={HDR_Y - 11} width={5} height={22} rx={1.5} {...PAINT.raised} />
      {/* coal + conveying-air line from the blower into the manifold bottom */}
      <Pipe pts={[[EDGE, COAL_Y], [COAL_X, COAL_Y], [COAL_X, MAN.y + MAN.h - 2]]} w={12} />
      <rect x={700} y={COAL_Y - 10} width={5} height={20} rx={1.5} {...PAINT.raised} />

      {/* burner manifold */}
      <rect x={MAN.x} y={MAN.y} width={MAN.w} height={MAN.h} rx={8} {...PAINT.body} />
      <rect x={MAN.x + 6} y={MAN.y + 6} width={MAN.w - 12} height={MAN.h - 12} rx={5} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      <CornerBolts x={MAN.x} y={MAN.y} w={MAN.w} h={MAN.h} inset={11} r={1.6} />
      <MachineLabel x={MAN.x + MAN.w / 2} y={314} size={7.5}>
        BURNER
      </MachineLabel>
      <MachineLabel x={MAN.x + MAN.w / 2} y={326} size={7.5}>
        MANIFOLD
      </MachineLabel>
    </g>
  );
}

function Flows() {
  return (
    <g>
      {/* primary air: header → swirl / axial lines → manifold */}
      <Flow pts={[[EDGE, HDR_Y], [HDR_X, HDR_Y], [HDR_X, AX_Y], [AX_X, AX_Y], [AX_X, MAN.y]]} color={MX.air} w={1.6} />
      <Flow pts={[[HDR_X, SPLIT_Y], [SWIRL_X, SPLIT_Y], [SWIRL_X, MAN.y]]} color={MX.air} w={1.6} />
      <Head x={HDR_X + 18} y={HDR_Y} dir="left" color={MX.air} />
      <Head x={HDR_X} y={176} dir="down" color={MX.air} />
      <Head x={SWIRL_X + 30} y={SPLIT_Y} dir="left" color={MX.air} />
      {/* coal + conveying air: blower line → manifold → burner coal channel */}
      <Flow pts={[[EDGE, COAL_Y], [COAL_X, COAL_Y], [COAL_X, MAN.y + MAN.h]]} color={MX.material} w={2} />
      <Head x={650} y={COAL_Y} dir="left" color={MX.material} />
      <Head x={COAL_X} y={410} dir="up" color={MX.material} />
      <Head x={460} y={300.5} dir="left" color={MX.material} s={0.8} />
      <Head x={460} y={334} dir="left" color={MX.material} s={0.8} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={30} x2={733} y={GROUND} />
      <CameraAndHood />
      <ManifoldAndLines />
      <Burner />
      <Flows />

      <MachineLabel x={145.5} y={101} anchor="start" size={8.5}>
        FLAME CAMERA (PURGED SIGHT PORT)
      </MachineLabel>
      <MachineLabel x={94} y={142} anchor="start" size={8.5}>
        KILN HOOD
      </MachineLabel>
      <MachineLabel x={483} y={110.5} anchor="start" size={8.5}>
        FROM PRIMARY-AIR FAN
      </MachineLabel>
      <MachineLabel x={561} y={182.5} size={8}>
        SWIRL
      </MachineLabel>
      <MachineLabel x={668} y={251} anchor="start" size={8}>
        AXIAL
      </MachineLabel>
      <MachineLabel x={320.5} y={405.5} size={8.5}>
        MULTI-CHANNEL BURNER (LONGITUDINAL SECTION)
      </MachineLabel>
      <MachineLabel x={726} y={432.5} anchor="end" size={8.5}>
        COAL + CONVEYING AIR FROM BLOWER
      </MachineLabel>
      <ToneLabel x={179.5} y={601.5} color={MX.air} size={8.5}>
        SECONDARY AIR FROM COOLER
      </ToneLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on group image 4A, left panel. */
const pads: LineSheetArt["pads"] = {
  "CAM-BRN-01": [108, 68.5],
  "PRS-BRN-03": [685.3, 148.3],
  "PRS-BRN-01": [590.7, 222.5],
  "PRS-BRN-02": [638, 229.3],
  "TMP-BRN-02": [84.5, 528],
};

/** Plate side per point (start = plate right of the pad, end = left); stand-off slot if both sides collide. */
const callouts: LineSheetArt["callouts"] = {
  "CAM-BRN-01": [100, 40, "start"],
  "PRS-BRN-03": [692, 118, "end"],
  "PRS-BRN-01": [583, 200, "end"],
  "PRS-BRN-02": [646, 262, "start"],
  "TMP-BRN-02": [96, 500, "start"],
};

export const sheet: LineSheetArt = { id: "B-1", ready: true, width: W, height: H, Art, pads, callouts };
