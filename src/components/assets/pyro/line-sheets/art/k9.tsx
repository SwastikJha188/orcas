/**
 * Sheet K-9 — KLN-01 · Rotary kiln — Outlet and hood.
 *
 * Panel "OUTLET AND HOOD" of group image 3A (page 7, panel box 1106.5 91 –
 * 1612.5 540): the kiln shell outlet end on tyre 3 / station 3 with the flame
 * inside, the cow shell (cooling shroud) round the outlet fed by the outlet
 * cooling fan below, the outlet seal ring, the kiln hood with its lining, the
 * burner pipe through the hood, the burning-zone pyrometer on the hood roof
 * with its sight line into the flame, secondary air rising into the hood and
 * clinker falling to the cooler.
 */
import React from "react";
import { Bolt, CornerBolts, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Volute } from "../../drawings/fkp-parts";
import type { LineSheetArt } from "../types";
import { ThermoProbe } from "./parts-ka";
import { KilnShell, Pier, RollerPair, Tyre } from "./parts-kb";
import { DashBox, Flow, FlowArrow, Glow, HotFace, ToneLabel, Transmitter } from "./parts-k2";

const W = 506;
const H = 449;
const GROUND = 414;

const SHELL = { x: 22.5, y: 169, w: 292.5, h: 80 };
const HOOD = { x: 315, y: 81, w: 142, h: 305.5 };
const COW = { x: 217, y: 155, w: 94, h: 109 };
const FAN = { cx: 270, cy: 347, r: 24 };

function OutletEnd() {
  return (
    <g>
      <Pier cx={93.5} top={293} bottom={GROUND} wTop={59.5} wBot={71} />
      <RollerPair cx={93.25} cy={272.5} r={11.5} gap={33.5} frameY={285.5} frameW={76.5} frameH={7.5} />
      <KilnShell x={SHELL.x} y={SHELL.y} w={SHELL.w} h={SHELL.h} seam={30.5} />
      <Glow cx={290} cy={209} rx={110} ry={30} core={0.55} />
      <Glow cx={287.5} cy={209} rx={50} ry={15} core={1} />
      <Tyre cx={93} y={164} w={18} h={91} shellTop={SHELL.y} shellBot={SHELL.y + SHELL.h} />
      {/* outlet seal ring */}
      <rect x={297} y={175.5} width={11} height={68} rx={2.5} {...PAINT.raised} />
      <rect x={297} y={175.5} width={11} height={68} rx={2.5} fill={MX.heat} opacity={0.45} />
    </g>
  );
}

function CoolingFan() {
  return (
    <g>
      {/* supply duct up into the cow shell, temperature tap on it */}
      <rect x={248} y={COW.y + COW.h} width={10} height={FAN.cy - FAN.r - 2 - COW.y - COW.h} {...PAINT.cylinderV} />
      <rect x={244.5} y={COW.y + COW.h} width={17} height={4} rx={1.2} {...PAINT.raised} />
      <rect x={217.5} y={378} width={88.5} height={6.5} rx={1.5} {...PAINT.raised} />
      <Bolt x={223} y={381.2} r={1.2} />
      <Bolt x={300} y={381.2} r={1.2} />
      <Volute cx={FAN.cx} cy={FAN.cy} r={FAN.r} outH={2} dir={-1} />
      {/* fan motor */}
      <rect x={296} y={339} width={8} height={7} {...PAINT.shaft} />
      <rect x={303} y={330} width={14} height={30} rx={4} {...PAINT.body} />
      {[336, 341, 346, 351, 355].map((y) => (
        <line key={y} x1={305.5} x2={314.5} y1={y} y2={y} {...PAINT.hair} />
      ))}
      <rect x={300} y={360} width={18} height={18} rx={1.5} fill={MX.flatBody} stroke={MX.fine} strokeWidth={MX.wFine} />
    </g>
  );
}

function Hood() {
  return (
    <g>
      <rect x={HOOD.x} y={HOOD.y} width={HOOD.w} height={HOOD.h} rx={8} {...PAINT.body} />
      <HotFace x={HOOD.x} y={90} w={15} h={288} rx={4} heat={0.5} />
      <CornerBolts x={HOOD.x} y={HOOD.y} w={HOOD.w} h={HOOD.h} inset={7} r={1.4} />
      {/* burner pipe through the hood */}
      <rect x={331} y={203.5} width={164} height={12.5} rx={2} {...PAINT.cylinder} />
      <rect x={HOOD.x + HOOD.w - 3} y={199} width={7} height={21.5} rx={1.5} {...PAINT.raised} />
      {/* burning-zone pyrometer on the hood roof, sight line into the flame */}
      <rect x={372} y={62.5} width={28} height={18.5} rx={3} {...PAINT.body} />
      <rect x={372} y={62.5} width={28} height={18.5} rx={3} fill={MX.air} opacity={0.35} />
      <Flow pts={[[380, 81], [257.5, 200]]} color={MX.air} dash="4 3" w={1} opacity={0.85} />
      {/* hood thermocouple and pressure tap through the right wall */}
      <ThermoProbe x={HOOD.x + HOOD.w + 12} y={134} len={28} dir={-1} head={10} />
      <rect x={441.5} y={305.5} width={25} height={3} {...PAINT.shaft} />
      <Transmitter x={472} y={307} w={11} h={14} />
      {/* secondary air up into the hood, clinker down to the cooler */}
      <FlowArrow x1={355} y1={405} x2={355} y2={372} color={MX.air} />
      <FlowArrow x1={390.5} y1={369} x2={390.5} y2={405} color={MX.material} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={22.5} x2={484} y={GROUND} />
      <OutletEnd />
      <CoolingFan />
      <Hood />
      <DashBox x={COW.x} y={COW.y} w={COW.w} h={COW.h} color={MX.air} rx={6} />

      <ToneLabel x={243} y={277} color={MX.air} anchor="end" size={6}>
        COW SHELL (COOLING SHROUD)
      </ToneLabel>
      <MachineLabel x={266} y={396} size={6}>
        OUTLET COOLING FAN
      </MachineLabel>
      <MachineLabel x={385.5} y={342} size={6.5} tone="ink">
        KILN HOOD
      </MachineLabel>
      <MachineLabel x={466} y={197} size={6}>
        BURNER
      </MachineLabel>
      <ToneLabel x={349} y={404} color={MX.air} anchor="end" size={6}>
        SECONDARY AIR
      </ToneLabel>
      <ToneLabel x={398} y={404} color={MX.material} size={6}>
        CLINKER TO COOLER
      </ToneLabel>
      <MachineLabel x={93} y={426} size={6}>
        TYRE 3 / STATION 3
      </MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on group image 3A, right panel. */
const pads: LineSheetArt["pads"] = {
  "TMP-KLN-25": [252.5, 289],
  "TMP-KLN-26": [275, 154.5],
  "TMP-KLN-14": [386, 71.5],
  "TMP-KLN-27": [441.5, 134],
  "PRS-KLN-03": [441.5, 307],
};

/** Plate side per point (end = plate left of the pad, along the shell or across the hood). */
const callouts: LineSheetArt["callouts"] = {
  "TMP-KLN-25": [240, 289, "end"],
  "TMP-KLN-26": [263, 154.5, "end"],
  "TMP-KLN-14": [374, 71.5, "end"],
  "TMP-KLN-27": [429, 134, "end"],
  "PRS-KLN-03": [429, 307, "end"],
};

export const sheet: LineSheetArt = { id: "K-9", ready: true, width: W, height: H, Art, pads, callouts };
