/**
 * Sheet K-5 — KLN-01 · Rotary kiln — Pinion and girth-gear spray lubrication.
 *
 * Composed as PDF page 18: the kiln shell across the top with the girth gear
 * seen on its face width (spring plates welded to the shell either side);
 * the spray-nozzle beam under the gear with six nozzles spraying the mesh;
 * the pinion between its two bearings on the shaft from the gearbox; at the
 * lower left the spray unit (controller over the lubricant drum and barrel
 * pump) feeding the six-section metering divider through a filter, and the
 * six delivery circuits rising behind the pinion to the nozzles.
 */
import React from "react";
import { Bolt, CornerBolts, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { OilLine, Pillow } from "../../sheets/sb-parts";
import type { LineSheetArt } from "../types";
import { KilnShell, cosRows } from "./parts-kb";

const W = 824;
const H = 704;

/* girth gear (face width) and the mesh */
const GEAR = { x: 338.5, y: 15, w: 150, h: 256.5 };
const NOZZLES = [353, 377, 401, 425, 449, 473];
const BEAM_Y = 280;
/* pinion, shaft and bearings */
const PIN = { x: 353.5, y: 300, w: 119.5, h: 68.5 };
const SHAFT = { x: 188, y: 326.5, w: 443, h: 15.5 };
const BEARINGS = [285.5, 495.5];
/* metering divider sections: x of each section = its delivery pad */
const COLS = [260.5, 289, 317.5, 346, 374.5, 403];
const DIV = { x: 241, y: 481, w: 187.5, h: 82.5 };

function GirthGear() {
  const { x, y, w, h } = GEAR;
  const rows = cosRows(y, y + h, 64);
  const spring = cosRows(52.5, 203.5, 7);
  return (
    <g>
      {/* tangential spring plates welded to the shell either side of the gear */}
      {spring.map((sy) => (
        <g key={sy}>
          <rect x={x - 20} y={sy - 3} width={21} height={6} rx={1.2} {...PAINT.raised} />
          <rect x={x + w - 1} y={sy - 3} width={21} height={6} rx={1.2} {...PAINT.raised} />
          <Bolt x={x - 14} y={sy} r={1} />
          <Bolt x={x + w + 14} y={sy} r={1} />
        </g>
      ))}
      <rect x={x} y={y} width={w} height={h} rx={6} {...PAINT.cylinder} />
      {/* tooth tips across the face width */}
      {rows.map((ry, i) => (
        <line key={ry} x1={x + 5} x2={x + w - 5} y1={ry} y2={ry} stroke={i % 2 ? MX.fine : MX.edge} strokeWidth={i % 2 ? 0.6 : 0.9} opacity={0.85} />
      ))}
      {/* rim shoulders */}
      <line x1={x + 4} x2={x + 4} y1={y + 6} y2={y + h - 6} {...PAINT.detail} />
      <line x1={x + w - 4} x2={x + w - 4} y1={y + 6} y2={y + h - 6} {...PAINT.detail} />
      {/* split joint of the two gear halves */}
      <line x1={x} x2={x + w} y1={y + h / 2} y2={y + h / 2} stroke={MX.edge} strokeWidth={1.4} />
      {[x + 14, x + w - 14].map((bx) => (
        <rect key={bx} x={bx - 5} y={y + h / 2 - 4} width={10} height={8} rx={1.5} {...PAINT.raised} />
      ))}
    </g>
  );
}

function NozzleBeam() {
  return (
    <g>
      {/* lubricant mist into the mesh */}
      {NOZZLES.map((nx) => (
        <path key={nx} d={`M ${nx} ${BEAM_Y - 8} L ${nx - 10} ${GEAR.y + GEAR.h - 16} H ${nx + 10} Z`} fill={MX.material} opacity={0.32} />
      ))}
      <rect x={GEAR.x - 4} y={BEAM_Y - 3} width={GEAR.w + 8} height={7} rx={2} {...PAINT.shaft} />
      {[GEAR.x - 8, GEAR.x + GEAR.w + 2].map((bx) => (
        <g key={bx}>
          <rect x={bx} y={BEAM_Y - 6} width={6} height={13} rx={1.5} {...PAINT.raised} />
          <Bolt x={bx + 3} y={BEAM_Y + 0.5} r={1} />
        </g>
      ))}
      {NOZZLES.map((nx) => (
        <g key={nx}>
          <rect x={nx - 3.5} y={BEAM_Y - 10} width={7} height={8} rx={1.5} {...PAINT.raised} />
          <rect x={nx - 1.5} y={BEAM_Y - 12.5} width={3} height={3} rx={0.8} {...PAINT.recess} />
        </g>
      ))}
    </g>
  );
}

function Circuits() {
  return (
    <g>
      {/* supply from the spray unit, through the filter, into the divider */}
      <OilLine pts={[[180.5, 525.5], [DIV.x, 525.5]]} w={5} />
      {/* six circuits: divider section → up → across → nozzle (no crossings: first section runs highest) */}
      {COLS.map((cx, i) => {
        const y = 420.5 + i * 6;
        return <OilLine key={cx} pts={[[cx, DIV.y - 2], [cx, y], [NOZZLES[i], y], [NOZZLES[i], BEAM_Y + 4]]} w={3} />;
      })}
    </g>
  );
}

function PinionDrive() {
  const rows = cosRows(PIN.y, PIN.y + PIN.h, 22);
  return (
    <g>
      <rect {...{ x: SHAFT.x, y: SHAFT.y, width: SHAFT.w, height: SHAFT.h }} rx={3} {...PAINT.shaft} />
      {/* shaft shoulders and the half coupling to the gearbox */}
      <rect x={250} y={324} width={16} height={21} rx={3} {...PAINT.raised} />
      <line x1={258} x2={258} y1={326} y2={343} stroke={MX.edge} strokeWidth={1.2} />
      <Bolt x={254} y={328.5} r={1.1} />
      <Bolt x={262} y={340.5} r={1.1} />
      <rect x={SHAFT.x + SHAFT.w - 6} y={SHAFT.y + 2} width={6} height={SHAFT.h - 4} rx={1.5} {...PAINT.raised} />
      {/* pinion */}
      <rect x={PIN.x} y={PIN.y} width={PIN.w} height={PIN.h} rx={5} {...PAINT.shaft} strokeWidth={MX.w} />
      {rows.map((ry, i) => (
        <line key={ry} x1={PIN.x + 3} x2={PIN.x + PIN.w - 3} y1={ry} y2={ry} stroke={MX.edge} strokeWidth={i % 2 ? 0.6 : 0.9} opacity={0.75} />
      ))}
      <rect x={PIN.x - 6} y={SHAFT.y - 4} width={6} height={SHAFT.h + 8} rx={1.5} {...PAINT.raised} />
      <rect x={PIN.x + PIN.w} y={SHAFT.y - 4} width={6} height={SHAFT.h + 8} rx={1.5} {...PAINT.raised} />
      {/* bearings: labyrinth seals, housings, grease nipples, sole plates */}
      {BEARINGS.map((bx) => (
        <g key={bx}>
          <rect x={bx - 5} y={SHAFT.y - 6} width={55} height={SHAFT.h + 12} rx={2} {...PAINT.raised} />
          <Pillow x={bx} y={294.5} w={45} h={78} />
          <rect x={bx + 19} y={289} width={7} height={6} rx={1} {...PAINT.shaft} />
          <circle cx={bx + 22.5} cy={334} r={8} fill="none" stroke={MX.fine} strokeWidth={0.9} />
          <rect x={bx - 6} y={372.5} width={57} height={8} rx={2} {...PAINT.body} />
          <Bolt x={bx} y={376.5} r={1.4} />
          <Bolt x={bx + 45} y={376.5} r={1.4} />
        </g>
      ))}
    </g>
  );
}

function SprayUnit() {
  const cab = { x: 46, y: 421, w: 134.5, h: 194.5 };
  return (
    <g>
      {/* solenoid valve block and air inlet on the roof */}
      <rect x={120} y={412} width={34} height={10} rx={2} {...PAINT.raised} />
      <rect x={128} y={406} width={8} height={7} rx={1.5} {...PAINT.body} />
      <rect x={140} y={406} width={8} height={7} rx={1.5} {...PAINT.body} />
      <rect x={64} y={414} width={14} height={8} rx={1.5} {...PAINT.shaft} />
      <rect x={cab.x - 6} y={cab.y + cab.h} width={cab.w + 12} height={8} rx={2} {...PAINT.body} />
      <Bolt x={cab.x + 4} y={cab.y + cab.h + 4} r={1.4} />
      <Bolt x={cab.x + cab.w - 4} y={cab.y + cab.h + 4} r={1.4} />
      <rect x={cab.x} y={cab.y} width={cab.w} height={cab.h} rx={10} {...PAINT.body} />
      <rect x={cab.x + 5} y={cab.y + 5} width={cab.w - 10} height={cab.h - 10} rx={6} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      <CornerBolts x={cab.x} y={cab.y} w={cab.w} h={cab.h} inset={9} r={2} />
      {/* controller: display, keypad, status lamps */}
      <rect x={58} y={435.5} width={110.5} height={42} rx={4} {...PAINT.recess} />
      {[444, 452, 460].map((ly) => (
        <line key={ly} x1={65} x2={92} y1={ly} y2={ly} {...PAINT.hair} />
      ))}
      {[0, 1, 2, 3].map((k) => (
        <rect key={k} x={65 + (k % 2) * 14} y={464 + Math.floor(k / 2) * 0} width={11} height={6} rx={1.2} fill={MX.raised} stroke={MX.edge} strokeWidth={0.6} />
      ))}
      {[136, 146, 156].map((lx) => (
        <circle key={lx} cx={lx} cy={448} r={2.2} fill={MX.raised} stroke={MX.edge} strokeWidth={0.7} />
      ))}
      <rect x={133} y={459} width={27} height={10} rx={1.5} fill={MX.raised} stroke={MX.edge} strokeWidth={0.7} />
      {/* lubricant drum with barrel pump */}
      <rect x={58} y={492.5} width={110.5} height={113} rx={5} {...PAINT.recess} />
      <rect x={67} y={514} width={92} height={86} rx={5} {...PAINT.material} />
      <rect x={67} y={514} width={92} height={86} rx={5} fill="none" stroke={MX.edge} strokeWidth={MX.w} />
      {[536, 578].map((hy) => (
        <rect key={hy} x={65} y={hy - 2} width={96} height={4} rx={1.5} {...PAINT.shaft} />
      ))}
      <rect x={64} y={509} width={98} height={6} rx={2} {...PAINT.shaft} />
      <rect x={104} y={498} width={18} height={12} rx={2.5} {...PAINT.raised} />
      <line x1={108} x2={118} y1={504} y2={504} {...PAINT.hair} />
      <rect x={122} y={501} width={20} height={4} rx={1} {...PAINT.shaft} />
      <rect x={140} y={500} width={6} height={6} rx={1} {...PAINT.raised} />
      {/* outlet bulkhead fitting */}
      <rect x={176} y={519} width={8} height={13} rx={1.5} {...PAINT.raised} />
    </g>
  );
}

function FilterAndDivider() {
  const { x, y, w, h } = DIV;
  return (
    <g>
      {/* in-line filter */}
      <rect x={203} y={515} width={16} height={22} rx={3} {...PAINT.body} />
      <rect x={201} y={512} width={20} height={5} rx={1.5} {...PAINT.raised} />
      <line x1={205} x2={217} y1={527} y2={527} {...PAINT.hair} />
      {/* divider block */}
      <rect x={x} y={y} width={w} height={h} rx={8} {...PAINT.body} />
      <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} rx={5} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      <rect x={x - 5} y={517} width={7} height={17} rx={1.5} {...PAINT.raised} />
      {COLS.map((cx) => (
        <g key={cx}>
          <rect x={cx - 4} y={y - 5} width={8} height={6} rx={1.2} {...PAINT.raised} />
          <rect x={cx - 10} y={y + 9} width={20} height={58} rx={9} {...PAINT.shaft} strokeWidth={MX.w} />
          <line x1={cx - 6} x2={cx + 6} y1={y + 38} y2={y + 38} {...PAINT.hair} />
          {/* cycle-indicator proximity sensor at the section foot */}
          <rect x={cx - 7} y={y + 70} width={14} height={14} rx={3} {...PAINT.raised} />
        </g>
      ))}
      {COLS.slice(0, -1).map((cx) => (
        <g key={cx}>
          <Bolt x={cx + 14.25} y={y + 12} r={1.3} />
          <Bolt x={cx + 14.25} y={y + 62} r={1.3} />
        </g>
      ))}
    </g>
  );
}

function Art() {
  return (
    <g>
      <KilnShell x={31} y={52.5} w={781} h={151} seam={78} />
      <GirthGear />
      <Circuits />
      <PinionDrive />
      <NozzleBeam />
      <SprayUnit />
      <FilterAndDivider />
      <GroundLine x1={22.5} x2={803.5} y={675} />

      <MachineLabel x={702} y={43.7} anchor="start" size={9}>KILN SHELL</MachineLabel>
      <MachineLabel x={340.5} y={9.6} anchor="start" size={8.2}>GIRTH GEAR (FACE WIDTH)</MachineLabel>
      <MachineLabel x={556} y={384} anchor="start" size={8.2}>PINION</MachineLabel>
      <MachineLabel x={170} y={320.5} anchor="start" size={7.5}>FROM GEARBOX (K-2)</MachineLabel>
      <MachineLabel x={26.5} y={636.6} anchor="start" size={8.2}>SPRAY UNIT / LUBRICANT DRUM</MachineLabel>
      <MachineLabel x={282.5} y={580} anchor="start" size={8.2}>METERING DIVIDER</MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 18. */
const pads: LineSheetArt["pads"] = {
  "STS-KLN-05": [113, 456.5],
  "PRX-KLN-01": [260.5, 558.5],
  "PRX-KLN-02": [289, 558.5],
  "PRX-KLN-03": [317.5, 558.5],
  "PRX-KLN-04": [346, 558.5],
  "PRX-KLN-05": [374.5, 558.5],
  "PRX-KLN-06": [403, 558.5],
};

/** Tag chip centre per point, as on PDF page 18. */
const chips: NonNullable<LineSheetArt["chips"]> = {
  "STS-KLN-05": [176, 389],
  "PRX-KLN-01": [513.5, 450.5],
  "PRX-KLN-02": [513.5, 483.5],
  "PRX-KLN-03": [513.5, 516.5],
  "PRX-KLN-04": [513.5, 549.5],
  "PRX-KLN-05": [513.5, 582.5],
  "PRX-KLN-06": [513.5, 615.5],
};

export const sheet: LineSheetArt = { id: "K-5", ready: true, width: W, height: H, Art, pads, chips };
