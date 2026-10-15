/**
 * D04–D07 — KLN-01 rotary kiln and its auxiliaries in one elevation.
 *
 * Upper band (side elevation): kiln inlet chamber with riser, meal chute and
 * the inlet gas analyser; the shell with three riding tyres on their roller
 * stations; the girth gear and pinion with the main drive train laid out
 * under the shell (encoder → VFD main motor → coupling → main gearbox →
 * coupling → pinion on its bearings); the hydraulic thrust roller with LVDT,
 * travel-limit switches and HPU at station 2; the stand-off shell scanner;
 * the cooling shroud with sector plates and its outlet cooling fan; the kiln
 * hood with the burning-zone pyrometer and the burner pipe.
 *
 * Lower band: station 1–3 roller plan views (D06 panels: left / right roller,
 * bearings A / B, oil baths, tyre), the auxiliary drive with brake and clutch,
 * the gearbox lubrication skid (tank, pumps, cooler, filter, sample port) and
 * the girth-gear spray unit with its controller and 6-circuit metering divider.
 */
import React from "react";
import { Bolt, Coupling, CornerBolts, Fan, Feet, GroundLine, MX, MachineLabel, Motor, PAINT, Shaft } from "../../machine-kit/machine-kit";
import type { PyroDrawing } from "../pyro-drawing-types";

const W = 1200;
const H = 436;

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

const FLOOR = 272;
const YC = 124; // kiln axis
const R = 34; // shell radius
const SX0 = 146; // shell inlet end
const SX1 = 1040; // shell outlet end
const TYRE_R = 42;
const ST = [196, 760, 940] as const; // support stations (tyres)
const G = 590; // girth gear
const GR = 56; // girth gear radius
const ROLL_Y = YC + TYRE_R + 13; // support roller centre (elevation)
const PIN_Y = YC + GR + 15; // pinion axis
const MOTOR_Y = 216; // main motor / gearbox input axis

// lower band
const B_GROUND = 416;
const PLAN_CY = 364;
const PLAN_CX = [102, 760, 960] as const;

/* ------------------------------------------------------------------ */
/* Small parts                                                         */
/* ------------------------------------------------------------------ */

/** Orthogonal pipe with an oil core (brass only inside the pipe). */
function OilPipe({ pts, w = 5, core = true }: { pts: Array<[number, number]>; w?: number; core?: boolean }) {
  const segs: React.ReactNode[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const x = Math.min(x1, x2) - w / 2;
    const y = Math.min(y1, y2) - w / 2;
    const sw = Math.abs(x2 - x1) + w;
    const sh = Math.abs(y2 - y1) + w;
    segs.push(<rect key={`p${i}`} x={x} y={y} width={sw} height={sh} rx={w / 2} fill={MX.metal} stroke={MX.edge} strokeWidth={0.8} />);
  }
  if (core) {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      const c = 1.6;
      segs.push(
        <rect
          key={`c${i}`}
          x={Math.min(x1, x2) - c / 2}
          y={Math.min(y1, y2) - c / 2}
          width={Math.abs(x2 - x1) + c}
          height={Math.abs(y2 - y1) + c}
          {...PAINT.material}
        />,
      );
    }
  }
  return <g aria-hidden="true">{segs}</g>;
}

/** Hairline bundle (spray circuits, sample line). */
function Bundle({ pts, n = 1, gap = 2, dashed = false }: { pts: Array<[number, number]>; n?: number; gap?: number; dashed?: boolean }) {
  const lines: React.ReactNode[] = [];
  for (let k = 0; k < n; k++) {
    const o = (k - (n - 1) / 2) * gap;
    const d = pts.map(([x, y], i) => `${i ? "L" : "M"} ${x + o} ${y + o}`).join(" ");
    lines.push(<path key={k} d={d} {...PAINT.detail} strokeDasharray={dashed ? "3 3" : undefined} />);
  }
  return <g aria-hidden="true">{lines}</g>;
}

/** Edge-on gear face: tooth lines parallel to the axis, denser toward the rim. */
function ToothLines({ x1, x2, cy, r, n }: { x1: number; x2: number; cy: number; r: number; n: number }) {
  return (
    <g aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => {
        const y = cy + r * Math.cos(((i + 0.5) / n) * Math.PI);
        return <line key={i} x1={x1} x2={x2} y1={y} y2={y} stroke={MX.edge} strokeWidth={0.7} />;
      })}
    </g>
  );
}

/** Pillow-block bearing housing (split cap, bolts). */
function Pillow({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={4} {...PAINT.body} />
      <line x1={x + 2} x2={x + w - 2} y1={y + h * 0.42} y2={y + h * 0.42} {...PAINT.detail} />
      <Bolt x={x + 5} y={y + h * 0.42 - 5} r={1.6} />
      <Bolt x={x + w - 5} y={y + h * 0.42 - 5} r={1.6} />
      <Bolt x={x + 5} y={y + h - 5} r={1.6} />
      <Bolt x={x + w - 5} y={y + h - 5} r={1.6} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Upper band: kiln elevation                                          */
/* ------------------------------------------------------------------ */

function InletChamber() {
  return (
    <g>
      {/* riser duct (gas up to C6) and meal chute from the lowest cyclone */}
      <rect x={34} y={-4} width={56} height={60} rx={3} {...PAINT.cylinderV} />
      <line x1={34} x2={90} y1={20} y2={20} {...PAINT.detail} />
      <rect x={100} y={-4} width={18} height={60} rx={3} {...PAINT.cylinderV} />
      <rect x={105} y={-4} width={8} height={58} rx={1.5} {...PAINT.material} opacity={0.85} />
      <line x1={100} x2={118} y1={24} y2={24} {...PAINT.detail} />

      {/* chamber on legs */}
      <rect x={30} y={244} width={10} height={FLOOR - 244} rx={2} {...PAINT.body} />
      <rect x={116} y={244} width={10} height={FLOOR - 244} rx={2} {...PAINT.body} />
      <rect x={22} y={52} width={112} height={196} rx={10} {...PAINT.body} />
      <rect x={28} y={58} width={100} height={184} rx={6} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      {/* refractory-lined gas space, meal heap sliding into the kiln */}
      <rect x={36} y={70} width={84} height={162} rx={4} {...PAINT.recess} />
      {Array.from({ length: 9 }).map((_, i) => (
        <line key={i} x1={36} x2={120} y1={86 + i * 16} y2={86 + i * 16} {...PAINT.hair} opacity={0.5} />
      ))}
      <path d="M 37 231 L 37 214 Q 76 200 119 196 L 119 231 Z" {...PAINT.material} opacity={0.85} />
      <CornerBolts x={22} y={52} w={112} h={196} inset={11} />

      {/* inlet seal (lamella) between chamber and shell */}
      <rect x={130} y={YC - R - 8} width={18} height={2 * R + 16} rx={4} {...PAINT.body} />
      {Array.from({ length: 7 }).map((_, i) => (
        <line key={i} x1={132} y1={YC - R - 2 + i * 12} x2={146} y2={YC - R + 3 + i * 12} {...PAINT.hair} />
      ))}

      {/* gas sampling probe through the chamber roof */}
      <rect x={121} y={38} width={12} height={16} rx={2} {...PAINT.raised} />
      <rect x={125} y={54} width={4} height={30} rx={1} {...PAINT.shaft} />

      {/* analyser cabinet on its bracket platform */}
      <rect x={134} y={62} width={166} height={5} rx={1.5} {...PAINT.body} />
      <line x1={150} y1={67} x2={136} y2={80} stroke={MX.edge} strokeWidth={MX.w} />
      <rect x={156} y={14} width={136} height={48} rx={7} {...PAINT.body} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={166 + i * 26} y={24} width={22} height={22} rx={3} {...PAINT.recess} />
      ))}
      <rect x={252} y={22} width={30} height={26} rx={3} {...PAINT.recess} />
      <line x1={258} x2={276} y1={42} y2={42} {...PAINT.hair} />
      <Bundle pts={[[133, 44], [156, 44]]} dashed />
      <MachineLabel x={177} y={57} size={6}>O₂</MachineLabel>
      <MachineLabel x={203} y={57} size={6}>CO</MachineLabel>
      <MachineLabel x={229} y={57} size={6}>NOₓ</MachineLabel>
      <MachineLabel x={224} y={78} size={7}>GAS ANALYSER</MachineLabel>
    </g>
  );
}

function Shell() {
  const seams = [];
  for (let x = SX0 + 40; x < SX1 - 10; x += 48) seams.push(x);
  return (
    <g>
      <rect x={SX0} y={YC - R} width={SX1 - SX0} height={2 * R} rx={3} {...PAINT.cylinder} />
      {seams.map((x) => (
        <line key={x} x1={x} x2={x} y1={YC - R + 2} y2={YC + R - 2} {...PAINT.hair} />
      ))}
      {/* burning zone toward the outlet */}
      <rect x={890} y={YC - R + 5} width={SX1 - 890} height={2 * R - 10} rx={4} fill={MX.heat} opacity={0.5} />
      <line x1={SX0 - 10} x2={SX1 + 12} y1={YC} y2={YC} {...PAINT.hair} strokeDasharray="14 4 2 4" opacity={0.7} />
    </g>
  );
}

function Tyre({ x }: { x: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x - 11} y={YC - TYRE_R} width={22} height={2 * TYRE_R} rx={4} {...PAINT.cylinderV} />
      <line x1={x - 11} x2={x + 11} y1={YC - R + 2} y2={YC - R + 2} {...PAINT.detail} />
      <line x1={x - 11} x2={x + 11} y1={YC + R - 2} y2={YC + R - 2} {...PAINT.detail} />
    </g>
  );
}

function SupportStation({ x }: { x: number }) {
  return (
    <g aria-hidden="true">
      {/* pier */}
      <path d={`M ${x - 34} 202 H ${x + 34} L ${x + 42} ${FLOOR} H ${x - 42} Z`} {...PAINT.body} />
      <line x1={x - 30} x2={x + 30} y1={222} y2={222} {...PAINT.detail} />
      <Bolt x={x - 30} y={FLOOR - 7} r={2} />
      <Bolt x={x + 30} y={FLOOR - 7} r={2} />
      {/* roller frame with the two bearing housings */}
      <rect x={x - 38} y={188} width={76} height={16} rx={3} {...PAINT.raised} />
      {[x - 17, x + 17].map((rx) => (
        <g key={rx}>
          <circle cx={rx} cy={ROLL_Y} r={13} {...PAINT.shaft} strokeWidth={MX.w} />
          <circle cx={rx} cy={ROLL_Y} r={4.5} {...PAINT.recess} />
        </g>
      ))}
    </g>
  );
}

function GirthAndPinion() {
  const pinR = 14;
  return (
    <g>
      {/* girth gear (edge-on) on its spring-plate flange */}
      <rect x={G - 16} y={YC - R - 6} width={32} height={2 * R + 12} rx={3} {...PAINT.body} />
      <rect x={G - 12} y={YC - GR} width={24} height={2 * GR} rx={3} {...PAINT.raised} />
      <ToothLines x1={G - 12} x2={G + 12} cy={YC} r={GR} n={30} />

      {/* pinion between its two bearings */}
      <Shaft x={516} y={PIN_Y - 4} w={124} h={8} />
      <rect x={G - 18} y={PIN_Y - pinR} width={36} height={2 * pinR} rx={3} {...PAINT.shaft} strokeWidth={MX.w} />
      <ToothLines x1={G - 18} x2={G + 18} cy={PIN_Y} r={pinR} n={9} />
      <Pillow x={546} y={PIN_Y - 13} w={22} h={40} />
      <Pillow x={612} y={PIN_Y - 13} w={22} h={40} />
      {/* sole plate and foundation */}
      <rect x={538} y={PIN_Y + 27} width={104} height={8} rx={2} {...PAINT.raised} />
      <path d={`M 544 ${PIN_Y + 35} H 636 L 642 ${FLOOR} H 538 Z`} {...PAINT.body} />
      {/* spray nozzle header under the mesh */}
      <rect x={G - 14} y={PIN_Y + 18} width={28} height={6} rx={2} {...PAINT.body} />
      {[-9, -5.5, -2, 2, 5.5, 9].map((o) => (
        <path key={o} d={`M ${G + o - 1.4} ${PIN_Y + 18} L ${G + o} ${PIN_Y + 15} L ${G + o + 1.4} ${PIN_Y + 18} Z`} fill={MX.edge} />
      ))}
      <Coupling x={518} y={PIN_Y - 12} w={22} h={24} />
    </g>
  );
}

function MainDrive() {
  return (
    <g>
      {/* encoder on the NDE shaft extension */}
      <rect x={252} y={MOTOR_Y - 3} width={8} height={6} {...PAINT.shaft} />
      <rect x={244} y={MOTOR_Y - 8} width={10} height={16} rx={2.5} {...PAINT.raised} />
      {/* VFD main motor */}
      <Motor x={270} y={188} w={96} h={56} />
      <Feet x={270} y={244} w={96} />
      <Shaft x={378} y={MOTOR_Y - 4} w={24} h={8} />
      <Coupling x={374} y={MOTOR_Y - 14} w={20} h={28} />

      {/* main gearbox */}
      <rect x={386} y={252} width={134} height={FLOOR - 252} rx={2} {...PAINT.body} />
      <Bolt x={394} y={262} r={1.8} />
      <Bolt x={512} y={262} r={1.8} />
      <rect x={396} y={168} width={114} height={84} rx={9} {...PAINT.body} />
      <rect x={392} y={162} width={122} height={10} rx={3} {...PAINT.raised} />
      {Array.from({ length: 6 }).map((_, i) => (
        <Bolt key={i} x={400 + i * 21} y={167} r={1.5} />
      ))}
      <rect x={444} y={154} width={10} height={8} rx={1.5} {...PAINT.raised} />
      {Array.from({ length: 9 }).map((_, i) => (
        <line key={i} x1={404 + i * 12.5} x2={404 + i * 12.5} y1={178} y2={244} {...PAINT.hair} opacity={0.6} />
      ))}
      <circle cx={426} cy={MOTOR_Y} r={15} {...PAINT.raised} />
      <circle cx={426} cy={MOTOR_Y} r={5} {...PAINT.recess} />
      <circle cx={474} cy={PIN_Y + 2} r={26} {...PAINT.raised} />
      <circle cx={474} cy={PIN_Y + 2} r={8} {...PAINT.recess} />
      <rect x={498} y={234} width={8} height={10} rx={1.5} {...PAINT.recess} />
      <Shaft x={508} y={PIN_Y - 4} w={12} h={8} />
    </g>
  );
}

function Thrust() {
  const x = ST[1] + 13; // downhill face of tyre 2
  return (
    <g>
      {/* thrust roller bearing on the downhill face of tyre 2 */}
      <rect x={x} y={128} width={13} height={34} rx={3} {...PAINT.cylinderV} />
      <rect x={x - 2} y={160} width={20} height={12} rx={2} {...PAINT.body} />
      {/* sliding carriage, piston rod, hydraulic cylinder, rear clevis */}
      <rect x={x + 1} y={172} width={34} height={14} rx={2.5} {...PAINT.raised} />
      <rect x={x + 35} y={176} width={10} height={6} {...PAINT.shaft} />
      <rect x={x + 43} y={171} width={30} height={16} rx={4} {...PAINT.cylinder} />
      <rect x={x + 73} y={166} width={7} height={26} rx={1.5} {...PAINT.body} />
      {/* LVDT on the cylinder, rod to the carriage */}
      <line x1={x + 25} x2={x + 47} y1={164} y2={164} stroke={MX.metal} strokeWidth={1.4} />
      <rect x={x + 23} y={161} width={4} height={11} rx={1} {...PAINT.body} />
      <rect x={x + 45} y={159} width={26} height={10} rx={2} {...PAINT.body} />
      {/* frame with the two travel-limit switches */}
      <rect x={x + 29} y={192} width={52} height={8} rx={2} {...PAINT.raised} />
      <rect x={x + 33} y={198} width={11} height={10} rx={2} {...PAINT.body} />
      <rect x={x + 64} y={198} width={11} height={10} rx={2} {...PAINT.body} />
      <rect x={x + 49} y={200} width={10} height={30} {...PAINT.body} />
      {/* hydraulic power unit */}
      <rect x={x + 31} y={228} width={46} height={FLOOR - 228} rx={5} {...PAINT.body} />
      <rect x={x + 37} y={244} width={20} height={20} rx={2} {...PAINT.recess} />
      <rect x={x + 39} y={252} width={16} height={11} rx={1} {...PAINT.material} opacity={0.85} />
      <circle cx={x + 68} cy={238} r={4} {...PAINT.recess} />
      <path d={`M ${x + 75} 228 V 214 H ${x + 87} V 180 H ${x + 80}`} {...PAINT.detail} />
    </g>
  );
}

const SCAN_X = 878;

function Scanner() {
  const ly = 190;
  return (
    <g>
      {[620, 720, 820, 920, 1010].map((tx) => (
        <line key={tx} x1={SCAN_X} y1={ly} x2={tx} y2={YC + R + 1} {...PAINT.hair} strokeDasharray="3 4" opacity={0.7} />
      ))}
      <rect x={SCAN_X - 3} y={208} width={6} height={FLOOR - 212} {...PAINT.shaft} />
      <rect x={SCAN_X - 14} y={FLOOR - 6} width={28} height={6} rx={1.5} {...PAINT.body} />
      <rect x={SCAN_X - 18} y={190} width={36} height={20} rx={5} {...PAINT.body} />
      <rect x={SCAN_X - 8} y={186} width={16} height={6} rx={2} {...PAINT.recess} />
    </g>
  );
}

const FAN_X = 1010;
const HOOD_X = 1050;
const HOOD_W = 98;

function Outlet() {
  return (
    <g>
      {/* cooling fan and its duct up to the shroud */}
      <rect x={FAN_X - 7} y={YC + R + 8} width={14} height={66} rx={2} {...PAINT.cylinderV} />
      <Fan cx={FAN_X} cy={242} r={16} />
      <rect x={FAN_X - 16} y={258} width={32} height={FLOOR - 258} rx={2} {...PAINT.body} />

      {/* cooling shroud (cow shell) with sector plates */}
      <rect x={SX1 - 60} y={YC - R - 12} width={60} height={2 * R + 24} rx={7} {...PAINT.body} />
      {[12, 24, 36, 48].map((o) => (
        <line key={o} x1={SX1 - 60 + o} x2={SX1 - 60 + o} y1={YC - R - 6} y2={YC + R + 6} {...PAINT.hair} />
      ))}
      <rect x={SX1 - 56} y={YC - 6} width={52} height={12} rx={2} {...PAINT.recess} />

      {/* outlet seal and kiln hood */}
      <rect x={SX1} y={YC - R - 4} width={10} height={2 * R + 8} rx={2} {...PAINT.raised} />
      <rect x={HOOD_X} y={46} width={HOOD_W} height={FLOOR - 46} rx={10} {...PAINT.body} />
      <rect x={HOOD_X + 6} y={52} width={HOOD_W - 12} height={FLOOR - 58} rx={6} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      <rect x={HOOD_X + 12} y={70} width={30} height={176} rx={4} {...PAINT.recess} />
      {Array.from({ length: 10 }).map((_, i) => (
        <line key={i} x1={HOOD_X + 12} x2={HOOD_X + 42} y1={84 + i * 16} y2={84 + i * 16} {...PAINT.hair} opacity={0.5} />
      ))}
      <CornerBolts x={HOOD_X} y={46} w={HOOD_W} h={FLOOR - 46} inset={12} />

      {/* burning-zone pyrometer on the hood roof, sighting into the kiln */}
      <line x1={HOOD_X + 36} y1={46} x2={SX1 - 70} y2={YC - 6} {...PAINT.hair} strokeDasharray="3 4" />
      <rect x={HOOD_X + 26} y={32} width={24} height={14} rx={3} {...PAINT.raised} />
      <rect x={HOOD_X + 30} y={36} width={8} height={6} rx={1.5} {...PAINT.recess} />

      {/* burner pipe through the hood, carriage outside */}
      <rect x={1158} y={YC + 9} width={34} height={14} rx={3} {...PAINT.body} />
      <rect x={HOOD_X + HOOD_W} y={YC + 23} width={1196 - HOOD_X - HOOD_W} height={4} rx={1} {...PAINT.shaft} />
      <rect x={SX1 - 6} y={YC - 5} width={1196 - SX1 + 6} height={10} rx={3} {...PAINT.shaft} />
      <rect x={1178} y={YC - 9} width={8} height={18} rx={2} {...PAINT.raised} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Lower band                                                          */
/* ------------------------------------------------------------------ */

/** D06 plan panel: left (top) and right (bottom) roller, bearings A / B, oil baths, tyre. */
function StationPlan({ cx, n }: { cx: number; n: number }) {
  const cy = PLAN_CY;
  const roller = (y: number) => (
    <g>
      <rect x={cx - 76} y={y - 3} width={152} height={6} rx={2} {...PAINT.shaft} />
      <rect x={cx - 26} y={y - 8} width={52} height={16} rx={3} {...PAINT.shaft} strokeWidth={MX.w} />
      {[cx - 76, cx + 76].map((bx) => (
        <g key={bx}>
          <rect x={bx - 10} y={y - 11} width={20} height={22} rx={3} {...PAINT.body} />
          <Bolt x={bx - 5} y={y - 6} r={1.4} />
          <Bolt x={bx + 5} y={y + 6} r={1.4} />
        </g>
      ))}
      {/* oil bath with sight glass */}
      <rect x={cx - 56} y={y - 9} width={20} height={18} rx={2} {...PAINT.body} />
      <rect x={cx - 53} y={y - 6} width={14} height={12} rx={1.5} {...PAINT.recess} />
      <rect x={cx - 52} y={y} width={12} height={5} {...PAINT.material} />
    </g>
  );
  return (
    <g>
      <rect x={cx - 96} y={300} width={192} height={110} rx={10} {...PAINT.hair} strokeDasharray="2 3" />
      <MachineLabel x={cx - 88} y={314} anchor="start" size={6.5}>{`STATION ${n} · PLAN`}</MachineLabel>
      {/* shell and tyre seen from above */}
      <rect x={cx - 62} y={cy - 10} width={124} height={20} rx={2} {...PAINT.cylinder} />
      <path d={`M ${cx - 62} ${cy - 10} l -3 5 l 3 5 l -3 5 l 3 5`} {...PAINT.detail} />
      <path d={`M ${cx + 62} ${cy - 10} l 3 5 l -3 5 l 3 5 l -3 5`} {...PAINT.detail} />
      <rect x={cx - 10} y={cy - 34} width={20} height={68} rx={3} {...PAINT.cylinderV} />
      {n === 2 && <rect x={cx + 11} y={cy - 7} width={8} height={14} rx={2} {...PAINT.raised} />}
      {roller(cy - 24)}
      {roller(cy + 24)}
      <MachineLabel x={cx - 76} y={cy + 3} size={6}>A</MachineLabel>
      <MachineLabel x={cx + 76} y={cy + 3} size={6}>B</MachineLabel>
    </g>
  );
}

function AuxDrive() {
  // mirrored: aux motor right, brake, clutch, output to the left
  return (
    <g>
      <rect x={212} y={B_GROUND - 10} width={116} height={10} rx={2} {...PAINT.body} />
      <g transform="translate(590 0) scale(-1 1)">
        <Motor x={272} y={352} w={46} h={38} />
        <rect x={276} y={390} width={10} height={B_GROUND - 400} {...PAINT.body} />
        <rect x={304} y={390} width={10} height={B_GROUND - 400} {...PAINT.body} />
      </g>
      <rect x={258} y={367} width={10} height={8} {...PAINT.shaft} />
      {/* brake drum with caliper */}
      <rect x={244} y={356} width={18} height={32} rx={3} {...PAINT.raised} />
      <rect x={248} y={362} width={10} height={20} rx={1.5} {...PAINT.recess} />
      <rect x={250} y={388} width={6} height={B_GROUND - 398} {...PAINT.body} />
      {/* clutch */}
      <rect x={226} y={360} width={16} height={24} rx={3} {...PAINT.body} />
      <line x1={234} x2={234} y1={362} y2={382} {...PAINT.detail} />
      <rect x={229} y={384} width={10} height={B_GROUND - 394} {...PAINT.body} />
      {/* mechanical link to the main motor NDE shaft */}
      <Bundle pts={[[234, 360], [234, 296], [248, 296], [248, MOTOR_Y + 9]]} dashed />
    </g>
  );
}

function LubeSkid() {
  return (
    <g>
      {/* return from the gearbox sump, supply to the gearbox bearings / meshes */}
      <OilPipe pts={[[410, 252], [410, 300], [384, 300], [384, 320]]} />
      <OilPipe pts={[[493, 322], [493, 252]]} />

      <rect x={340} y={B_GROUND - 12} width={200} height={12} rx={2} {...PAINT.body} />
      <Bolt x={348} y={B_GROUND - 6} r={1.6} />
      <Bolt x={532} y={B_GROUND - 6} r={1.6} />
      {/* oil tank with sight window, level switch, sample port */}
      <rect x={348} y={318} width={66} height={86} rx={7} {...PAINT.body} />
      <rect x={355} y={328} width={52} height={70} rx={4} {...PAINT.recess} />
      <rect x={357} y={350} width={48} height={46} rx={2} {...PAINT.material} opacity={0.9} />
      <line x1={355} x2={407} y1={349} y2={349} {...PAINT.detail} strokeDasharray="3 2" />
      <rect x={412} y={340} width={9} height={10} rx={2} {...PAINT.raised} />
      <rect x={341} y={394} width={8} height={6} {...PAINT.shaft} />
      <rect x={337} y={391} width={5} height={12} rx={1.5} {...PAINT.raised} />
      {/* duty / standby pumps */}
      <OilPipe pts={[[414, 392], [470, 392]]} w={4} />
      <Fan cx={436} cy={388} r={10} />
      <Fan cx={460} cy={388} r={10} />
      {/* cooler */}
      <OilPipe pts={[[448, 378], [448, 358]]} w={4} />
      <rect x={424} y={322} width={48} height={36} rx={5} {...PAINT.body} />
      <rect x={430} y={328} width={36} height={24} rx={2} {...PAINT.recess} />
      {Array.from({ length: 7 }).map((_, i) => (
        <line key={i} x1={433 + i * 5} x2={433 + i * 5} y1={330} y2={350} {...PAINT.hair} />
      ))}
      <OilPipe pts={[[472, 340], [482, 340]]} w={4} />
      {/* duplex filter */}
      <rect x={482} y={326} width={22} height={72} rx={6} {...PAINT.cylinderV} />
      <rect x={480} y={320} width={26} height={8} rx={2} {...PAINT.raised} />
      <line x1={482} x2={504} y1={356} y2={356} {...PAINT.detail} />
    </g>
  );
}

const DIV_X = 612;

function SprayUnit() {
  return (
    <g>
      {/* six spray circuits to the nozzle header under the pinion */}
      <Bundle pts={[[DIV_X + 10, 320], [DIV_X + 10, 300], [G, 290], [G, PIN_Y + 24]]} n={6} gap={2} />
      {/* lubricant drum + pump unit with controller */}
      <rect x={552} y={B_GROUND - 10} width={104} height={10} rx={2} {...PAINT.body} />
      <rect x={556} y={316} width={38} height={90} rx={5} {...PAINT.body} />
      <rect x={561} y={322} width={28} height={16} rx={2} {...PAINT.recess} />
      <rect x={561} y={344} width={28} height={56} rx={3} {...PAINT.recess} />
      <rect x={563} y={358} width={24} height={40} rx={2} {...PAINT.material} opacity={0.9} />
      <OilPipe pts={[[594, 400], [DIV_X + 10, 400], [DIV_X + 10, 396]]} w={4} />
      {/* progressive metering divider: three sections, outlets both sides */}
      <rect x={DIV_X} y={320} width={20} height={78} rx={3} {...PAINT.raised} />
      {[345, 371].map((y) => (
        <line key={y} x1={DIV_X} x2={DIV_X + 20} y1={y} y2={y} {...PAINT.detail} />
      ))}
      {[333, 358, 383].map((y) => (
        <g key={y}>
          <rect x={DIV_X - 6} y={y - 3} width={6} height={6} {...PAINT.shaft} />
          <rect x={DIV_X + 20} y={y - 3} width={6} height={6} {...PAINT.shaft} />
        </g>
      ))}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Art                                                                 */
/* ------------------------------------------------------------------ */

function Art() {
  return (
    <g>
      <GroundLine x1={10} x2={1196} y={FLOOR} />

      {/* lower band first so links pass behind foundations */}
      <SprayUnit />
      <GroundLine x1={208} x2={660} y={B_GROUND} />
      <AuxDrive />
      <LubeSkid />
      {PLAN_CX.map((cx, i) => (
        <StationPlan key={cx} cx={cx} n={i + 1} />
      ))}

      {/* upper band */}
      <InletChamber />
      {ST.map((x) => (
        <SupportStation key={x} x={x} />
      ))}
      <Shell />
      {ST.map((x) => (
        <Tyre key={x} x={x} />
      ))}
      <GirthAndPinion />
      <MainDrive />
      <OilPipe pts={[[410, 252], [410, 262]]} />
      <OilPipe pts={[[493, 252], [493, 262]]} />
      <Thrust />
      <Scanner />
      <Outlet />

      {/* labels */}
      <MachineLabel x={590} y={60} size={7}>GIRTH GEAR</MachineLabel>
      <MachineLabel x={SX1 - 30} y={70} size={7}>COOLING SHROUD</MachineLabel>
      <MachineLabel x={1174} y={110} size={7}>BURNER</MachineLabel>
      <MachineLabel x={400} y={84} size={7}>KILN SHELL</MachineLabel>
      {[
        [78, "KILN INLET"],
        [196, "STATION 1"],
        [318, "MAIN MOTOR"],
        [453, "GEARBOX"],
        [ST[1], "STATION 2"],
        [ST[1] + 66, "THRUST"],
        [SCAN_X, "SCANNER"],
        [ST[2], "STATION 3"],
        [FAN_X, "OUTLET FAN"],
        [HOOD_X + HOOD_W / 2, "KILN HOOD"],
      ].map(([x, t]) => (
        <MachineLabel key={t as string} x={x as number} y={287} size={6.5}>
          {t}
        </MachineLabel>
      ))}
      <MachineLabel x={270} y={428} size={6.5}>AUX DRIVE</MachineLabel>
      <MachineLabel x={440} y={428} size={6.5}>GEARBOX LUBE SKID</MachineLabel>
      <MachineLabel x={604} y={428} size={6.5}>SPRAY LUBE</MachineLabel>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Pads and windows                                                    */
/* ------------------------------------------------------------------ */

function stationPads(cx: number, tmp: [string, string, string, string], lev: [string, string], mig: string): Record<string, [number, number]> {
  const top = PLAN_CY - 24;
  const bot = PLAN_CY + 24;
  return {
    [tmp[0]]: [cx - 76, top],
    [tmp[1]]: [cx + 76, top],
    [tmp[2]]: [cx - 76, bot],
    [tmp[3]]: [cx + 76, bot],
    [lev[0]]: [cx - 46, top],
    [lev[1]]: [cx - 46, bot],
    [mig]: [cx, PLAN_CY],
  };
}

export const drawing: PyroDrawing = {
  machineId: "PYR-KLN-01",
  width: W,
  height: H,
  Art,
  pads: {
    // main motor
    "SPD-KLN-01": [249, MOTOR_Y],
    "TMP-KLN-20": [282, 198],
    "ELE-KLN-01": [318, 181],
    "TMP-KLN-21": [318, 216],
    "TMP-KLN-19": [356, 198],
    "VIB-KLN-01": [356, 234],
    // main gearbox
    "TMP-KLN-22": [408, MOTOR_Y],
    "VIB-KLN-02": [420, 182],
    "VIB-KLN-03": [486, 182],
    "TMP-KLN-23": [500, PIN_Y + 18],
    // lubrication skid
    "TMP-KLN-15": [376, 374],
    "LEV-KLN-01": [417, 345],
    "LAB-KLN-01": [338, 397],
    "PRS-KLN-05": [493, 376],
    "PRS-KLN-04": [493, 304],
    "FLO-KLN-05": [493, 262],
    // aux drive
    "STS-KLN-11": [295, 347],
    "LIM-KLN-01": [253, 372],
    // pinion, girth gear, spray
    "VIB-KLN-04": [557, PIN_Y + 16],
    "STS-KLN-05": [575, 330],
    "PRX-KLN-01": [DIV_X - 8, 333],
    "PRX-KLN-02": [DIV_X - 8, 358],
    "PRX-KLN-03": [DIV_X - 8, 383],
    "PRX-KLN-04": [DIV_X + 28, 333],
    "PRX-KLN-05": [DIV_X + 28, 358],
    "PRX-KLN-06": [DIV_X + 28, 383],
    // support stations
    ...stationPads(PLAN_CX[0], ["TMP-KLN-01", "TMP-KLN-02", "TMP-KLN-03", "TMP-KLN-04"], ["LEV-KLN-02", "LEV-KLN-03"], "MIG-KLN-01"),
    ...stationPads(PLAN_CX[1], ["TMP-KLN-05", "TMP-KLN-06", "TMP-KLN-07", "TMP-KLN-08"], ["LEV-KLN-04", "LEV-KLN-05"], "MIG-KLN-02"),
    ...stationPads(PLAN_CX[2], ["TMP-KLN-09", "TMP-KLN-10", "TMP-KLN-11", "TMP-KLN-12"], ["LEV-KLN-06", "LEV-KLN-07"], "MIG-KLN-03"),
    // thrust
    "POS-KLN-01": [ST[1] + 71, 164],
    "POS-KLN-02": [ST[1] + 51, 203],
    "PRS-KLN-07": [ST[1] + 60, 254],
    // inlet
    "TMP-KLN-13": [62, 100],
    "PRS-KLN-01": [62, 162],
    // O₂ / CO / NOₓ share the inlet sample probe (D07 draws the three at the probe)
    "GAS-KLN-01": [127, 46],
    "GAS-KLN-02": [127, 63],
    "GAS-KLN-03": [127, 80],
    "STS-KLN-06": [267, 35],
    // shell
    "STS-KLN-08": [SCAN_X, 200],
    "MAN-KLN-01": [966, 104],
    // outlet
    "TMP-KLN-26": [SX1 - 42, 90],
    "TMP-KLN-25": [FAN_X, 196],
    "TMP-KLN-14": [HOOD_X + 38, 39],
    "TMP-KLN-27": [HOOD_X + 78, 70],
    "PRS-KLN-03": [HOOD_X + 78, 190],
  },
  windows: {
    "kln-motor": [200, 156, 236, 112],
    "kln-gearbox": [340, 146, 250, 122],
    "kln-lube": [286, 240, 380, 182],
    "kln-aux": [196, 306, 200, 96],
    "kln-girth": [366, 180, 470, 232],
    "kln-st1": [0, 302, 216, 106],
    "kln-st2": [656, 302, 208, 104],
    "kln-st3": [856, 302, 208, 104],
    "kln-thrust": [680, 132, 310, 150],
    "kln-inlet": [0, 4, 380, 186],
    "kln-shell": [790, 72, 330, 162],
    "kln-outlet": [756, 2, 444, 222],
  },
};
