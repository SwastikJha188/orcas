/**
 * Sheet K-9 — KLN-01 · Rotary kiln — Outlet and hood.
 *
 * Composed as PDF page 22: the outlet end of the shell on tyre 3 / station 3
 * with the flame burning back from the burner tip; the cow shell (cooling
 * shroud, shown cut away) with its top and bottom air plenums around the
 * shell end, fed by the outlet cooling fan (volute, impeller, motor on a base
 * plate) through a flanged duct; the lamellar sector-plate seal (in section)
 * between shell and hood; the refractory-lined kiln hood with the burner pipe,
 * the burning-zone pyrometer on its roof sighting into the kiln, the hood
 * temperature and pressure tappings, clinker falling to the cooler throat and
 * secondary air rising from it.
 */
import React from "react";
import { Bolt, CornerBolts, Fan, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Refractory, SideMotor } from "../../sheets/sb-parts";
import type { LineSheetArt } from "../types";
import { Arrow, BoltFlange, KilnShell, Pier, RollerPair, Tyre } from "./parts-kb";

const W = 824;
const H = 704;

const SHELL = { x: 23.5, y: 248, w: 479.5, h: 135.5 };
const AXIS = SHELL.y + SHELL.h / 2;
const GROUND = 660;
const HOOD = { x: 518.5, y: 98, w: 240, h: 517.5 };
/* outlet cooling fan */
const FAN = { cx: 440, cy: 547, r: 37 };
const DUCT_X = 413;

function KilnEnd() {
  return (
    <g>
      <Pier cx={143} top={456.5} bottom={GROUND} wTop={101.5} wBot={120} />
      <RollerPair cx={143} cy={420} r={20} gap={57} frameY={444} frameW={129.5} frameH={12.5} />
      <KilnShell x={SHELL.x} y={SHELL.y} w={SHELL.w} h={SHELL.h} seam={68.5} />
      <Tyre cx={143.25} y={239} w={30.5} h={153.5} shellTop={SHELL.y} shellBot={SHELL.y + SHELL.h} />
    </g>
  );
}

/** Flame from the burner tip back into the burning zone (brass, soft layers). */
function Flame() {
  const layers: Array<[number, number, number, number]> = [
    [400, 150, 44, 0.1],
    [430, 118, 36, 0.14],
    [458, 88, 28, 0.2],
    [480, 62, 21, 0.3],
    [496, 40, 13, 0.42],
  ];
  return (
    <g aria-hidden="true">
      {layers.map(([cx, rx, ry, o]) => (
        <ellipse key={cx} cx={cx} cy={AXIS} rx={rx} ry={ry} fill={MX.material} opacity={o} />
      ))}
    </g>
  );
}

function CowShell() {
  const x0 = 353;
  const x1 = 511;
  const plenum = (y: number) => (
    <g>
      <rect x={x0} y={y} width={x1 - x0 - 8} height={21} rx={5} {...PAINT.body} />
      {Array.from({ length: 9 }).map((_, i) => (
        <rect key={i} x={x0 + 10 + i * 15.5} y={y + (y < AXIS ? 15 : 2)} width={9} height={4} rx={1} {...PAINT.recess} />
      ))}
      <Bolt x={x0 + 5} y={y + 10.5} r={1.2} />
      <Bolt x={x1 - 13} y={y + 10.5} r={1.2} />
    </g>
  );
  return (
    <g>
      {/* shroud outline, cut away over the shell */}
      <rect x={x0} y={223} width={x1 - x0} height={185.5} rx={10} fill="none" stroke={MX.edge} strokeWidth={1.2} strokeDasharray="7 4" />
      {plenum(223)}
      {plenum(387.5)}
      {/* surface thermometer boss on the top plenum */}
      <rect x={444} y={216} width={13} height={8} rx={1.5} {...PAINT.raised} />
    </g>
  );
}

function SectorSeal() {
  const stack = (y0: number, y1: number) => (
    <g>
      <rect x={486} y={y0} width={21} height={y1 - y0} rx={3} {...PAINT.recess} />
      {Array.from({ length: Math.floor((y1 - y0) / 5) }).map((_, i) => (
        <rect key={i} x={488} y={y0 + 2 + i * 5} width={17} height={4} rx={0.8} fill={MX.raised} stroke={MX.edge} strokeWidth={0.6} />
      ))}
    </g>
  );
  return (
    <g>
      {stack(258.5, 290)}
      {stack(341.5, 372.5)}
      <rect x={505} y={252} width={14} height={127} rx={3} {...PAINT.body} />
    </g>
  );
}

function CoolingFan() {
  const { cx, cy, r } = FAN;
  const ow = 20;
  const yj = cy - Math.sqrt(r * r - (r - ow) * (r - ow));
  const top = 490;
  return (
    <g>
      {/* duct from the fan to the bottom plenum */}
      <rect x={DUCT_X - 9.25} y={408.5} width={18.5} height={top - 408.5} {...PAINT.cylinderV} />
      <BoltFlange x={DUCT_X} y={413} w={18.5} />
      <BoltFlange x={DUCT_X} y={486} w={18.5} />
      {/* base plate, pedestals, motor */}
      <rect x={353} y={600} width={150} height={11} rx={2} {...PAINT.body} />
      {[360, 380, 420, 460, 496].map((bx) => (
        <Bolt key={bx} x={bx} y={605.5} r={1.3} />
      ))}
      <path d={`M ${cx - r * 0.6} ${cy + r * 0.6} H ${cx + r * 0.6} L ${cx + r * 0.75} 600 H ${cx - r * 0.75} Z`} {...PAINT.body} />
      <rect x={cx} y={cy - 3} width={48} height={6} rx={1.5} {...PAINT.shaft} />
      <rect x={480} y={538} width={8} height={18} rx={2} {...PAINT.raised} />
      <SideMotor x={490} y={533} w={26} h={28} flip />
      <rect x={490} y={561} width={24} height={39} rx={1.5} {...PAINT.body} />
      {/* volute */}
      <path d={`M ${cx - r} ${top} L ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx - r + ow} ${yj.toFixed(1)} L ${cx - r + ow} ${top} Z`} {...PAINT.body} />
      <circle cx={cx} cy={cy} r={r * 0.8} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2 + 0.4;
        return <Bolt key={i} x={cx + Math.cos(a) * r * 0.9} y={cy + Math.sin(a) * r * 0.9} r={1.3} />;
      })}
      <Fan cx={cx} cy={cy} r={r * 0.62} />
    </g>
  );
}

function Hood() {
  const { x, y, w, h } = HOOD;
  const lumps: Array<[number, number, number]> = [];
  for (let i = 0; i < 22; i++) {
    const t = i / 21;
    lumps.push([+(551 + 26 * t + ((i * 7) % 5) * 2.2).toFixed(1), +(386 + 208 * t).toFixed(1), 1.8 + ((i * 5) % 3) * 0.6]);
  }
  return (
    <g>
      {/* roof pyrometer and its sight line into the burning zone */}
      <rect x={615} y={67.5} width={46} height={30.5} rx={5} {...PAINT.raised} />
      <rect x={608} y={93} width={60} height={6} rx={1.5} {...PAINT.body} />
      <rect x={x} y={y} width={w} height={h} rx={12} {...PAINT.body} />
      <rect x={x + 6} y={y + 6} width={w - 12} height={h - 12} rx={8} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      <CornerBolts x={x} y={y} w={w} h={h} inset={12} r={2} />
      <Refractory x={x} y={113} w={25.5} h={487.5} course={7} brick={13} />
      {/* stiffener ribs */}
      {[690].map((rx) => (
        <g key={rx}>
          <line x1={rx} x2={rx} y1={y + 8} y2={y + h - 8} {...PAINT.hair} />
          <line x1={rx + 4} x2={rx + 4} y1={y + 8} y2={y + h - 8} {...PAINT.hair} />
        </g>
      ))}
      {/* inspection door */}
      <rect x={620} y={150} width={56} height={70} rx={5} {...PAINT.raised} />
      <rect x={626} y={156} width={44} height={58} rx={3} fill="none" stroke={MX.fine} strokeWidth={0.8} />
      <CornerBolts x={620} y={150} w={56} h={70} inset={4} r={1.2} />
      <rect x={668} y={180} width={10} height={10} rx={2} {...PAINT.shaft} />
      {/* cooler throat with falling clinker */}
      <rect x={556} y={598} width={184} height={17.5} rx={3} {...PAINT.recess} />
      {lumps.map(([lx, ly, lr]) => (
        <circle key={`${lx}-${ly}`} cx={lx} cy={ly} r={lr} {...PAINT.material} />
      ))}
      {/* hood temperature thermowell and pressure tapping through the right wall */}
      {[188, 480.5].map((ty) => (
        <g key={ty}>
          <rect x={725} y={ty - 2} width={36} height={4} {...PAINT.shaft} />
          <rect x={758.5} y={ty - 7} width={11} height={14} rx={2.5} {...PAINT.raised} />
        </g>
      ))}
      {/* burner pipe through the hood wall */}
      <rect x={548.5} y={306} width={273.5} height={19} rx={3} {...PAINT.shaft} />
      <rect x={541} y={303} width={9} height={25} rx={2.5} {...PAINT.raised} />
      {[700, 756, 790].map((fx) => (
        <rect key={fx} x={fx - 2.5} y={301} width={5} height={29} rx={1.2} {...PAINT.raised} />
      ))}
      <line x1={622.5} y1={98} x2={422.5} y2={300} stroke={MX.label} strokeWidth={1} strokeDasharray="3 4" opacity={0.85} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <KilnEnd />
      <Flame />
      <CowShell />
      <SectorSeal />
      <CoolingFan />
      <Hood />
      <GroundLine x1={22.5} x2={803.5} y={GROUND} />
      <Arrow x1={585.5} y1={647} x2={585.5} y2={598} />
      <Arrow x1={645.5} y1={600} x2={645.5} y2={648} />

      <MachineLabel x={88.5} y={677.6} anchor="start" size={8.2}>TYRE 3 / STATION 3</MachineLabel>
      <MachineLabel x={398} y={426.6} anchor="end" size={8.2}>COW SHELL (COOLING SHROUD)</MachineLabel>
      <MachineLabel x={552} y={264} anchor="start" size={7.5}>SECTOR PLATES</MachineLabel>
      <MachineLabel x={375.5} y={629} anchor="start" size={8.2}>OUTLET COOLING FAN</MachineLabel>
      <MachineLabel x={721} y={299} anchor="start" size={8.2}>BURNER (B-1)</MachineLabel>
      <MachineLabel x={660.5} y={644} anchor="start" size={8.2}>CLINKER TO COOLER</MachineLabel>
      <MachineLabel x={490} y={644} anchor="start" size={8.2}>SECONDARY AIR</MachineLabel>
      <MachineLabel x={605} y={538.7} anchor="start" size={9}>KILN HOOD</MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 22. */
const pads: LineSheetArt["pads"] = {
  "TMP-KLN-25": [412, 450.5],
  "TMP-KLN-26": [450.5, 222.5],
  "TMP-KLN-14": [638, 83],
  "TMP-KLN-27": [731.5, 188],
  "PRS-KLN-03": [731.5, 480.5],
};

/** Tag chip centre per point, as on PDF page 22. */
const chips: NonNullable<LineSheetArt["chips"]> = {
  "TMP-KLN-25": [333.5, 488],
  "TMP-KLN-26": [387, 162.5],
  "TMP-KLN-14": [537, 30.5],
  "TMP-KLN-27": [653, 128],
  "PRS-KLN-03": [787.5, 548],
};

export const sheet: LineSheetArt = { id: "K-9", ready: true, width: W, height: H, Art, pads, chips };
