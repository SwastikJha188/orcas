/**
 * Sheet C-4 — CLR-01 · Clinker cooler — Grate drives 1–3 (Rev 02: the grate
 * is motor-driven; the hydraulic unit of Rev 01 is gone).
 *
 * The moving grate frame with its clinker bed in three grate sections, each
 * driven by its own drive on a plinth below: motor, coupling shaft, gearbox,
 * output shaft and crank wheel, with the connecting rod up to the grate.
 * Drive 3 is fitted only where the cooler has a third grate.
 */
import { Bolt, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import type { LineSheetArt } from "../types";
import { DriveMotor } from "./parts-fd";

/** Panel box on the page (page units): x 574…1080, y 91…540. */
const W = 506;
const H = 449;
const GROUND = 414;
/** Drive pitch (drive 1 at 0) and the drive centre line. */
const DP = 150;
const CY = 310;
/** Grate section width along the frame. */
const SEC = 453 / 3;

function GrateFrame() {
  const ix = 31;
  const ir = 475;
  const surf = (x: number) => {
    const t = (x - ix) / (ir - ix);
    return 127.5 - 7.5 * Math.sin(Math.min(1, t * 1.7) * Math.PI * 0.5) + (9 * Math.max(0, t - 0.4)) / 0.6;
  };
  const top = Array.from({ length: 41 }, (_, i) => {
    const x = ix + ((ir - ix) * i) / 40;
    return `${i ? "L" : "M"} ${x.toFixed(1)} ${surf(x).toFixed(1)}`;
  }).join(" ");
  return (
    <g>
      <rect x={26.5} y={49.5} width={453} height={104.5} rx={5} {...PAINT.body} />
      <path d={`${top} L ${ir} 147 L ${ix} 147 Z`} fill={MX.material} opacity={0.3} />
      <path d={top} fill="none" stroke={MX.material} strokeWidth={0.8} opacity={0.5} />
      <rect x={29.5} y={147} width={447} height={4} rx={1} {...PAINT.raised} />
      {Array.from({ length: 71 }).map((_, i) => (
        <line key={i} x1={33 + i * 6.25} x2={33 + i * 6.25} y1={147.6} y2={150.4} {...PAINT.hair} />
      ))}
      {[1, 2].map((i) => (
        <line key={i} x1={26.5 + i * SEC} x2={26.5 + i * SEC} y1={52} y2={151} stroke={MX.edge} strokeWidth={1.2} strokeDasharray="4 3" />
      ))}
      {["GRATE 1", "GRATE 2", "GRATE 3 · IF FITTED"].map((t, i) => (
        <MachineLabel key={t} x={26.5 + SEC * (i + 0.5)} y={63.5} size={5}>
          {t}
        </MachineLabel>
      ))}
    </g>
  );
}

function Drive({ k }: { k: number }) {
  const o = k * DP;
  return (
    <g>
      {/* plinth and base plate */}
      <rect x={42 + o} y={340} width={136} height={GROUND - 340} rx={3} {...PAINT.body} />
      <rect x={37 + o} y={334} width={146} height={6} rx={1.5} {...PAINT.raised} />
      {/* connecting rod from the crank pin up to the grate frame */}
      <line x1={165 + o} y1={CY - 9} x2={165 + o} y2={151} stroke={MX.edge} strokeWidth={3.4} strokeLinecap="round" />
      <line x1={165 + o} y1={CY - 9} x2={165 + o} y2={151} stroke={MX.metal} strokeWidth={1.8} strokeLinecap="round" />
      {/* motor, coupling shaft, gearbox, output shaft, crank wheel */}
      <DriveMotor x={50 + o} y={CY - 17} w={42} h={34} />
      <rect x={92 + o} y={CY - 2.5} width={10} height={5} {...PAINT.shaft} />
      <rect x={104 + o} y={CY - 27} width={30} height={6} rx={2} {...PAINT.body} />
      <rect x={102 + o} y={CY - 22} width={36} height={44} rx={4} {...PAINT.body} />
      <circle cx={112 + o} cy={CY + 8} r={5.5} {...PAINT.raised} />
      <circle cx={125 + o} cy={CY - 2} r={8} {...PAINT.raised} />
      {[
        [105.5, CY - 18.5],
        [134.5, CY - 18.5],
        [105.5, CY + 18.5],
        [134.5, CY + 18.5],
      ].map(([bx, by]) => (
        <Bolt key={bx * 1000 + by} x={bx + o} y={by} r={1.4} />
      ))}
      <rect x={138 + o} y={CY - 2.5} width={14} height={5} {...PAINT.shaft} />
      <circle cx={165 + o} cy={CY} r={13} {...PAINT.cylinder} />
      <circle cx={165 + o} cy={CY} r={4} fill="none" stroke={MX.edge} strokeWidth={1.2} />
      <circle cx={165 + o} cy={CY - 9} r={2.2} fill={MX.edge} />
      <MachineLabel x={110 + o} y={430} size={5}>
        {k === 2 ? "GRATE DRIVE 3 · IF FITTED" : `GRATE DRIVE ${k + 1}`}
      </MachineLabel>
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={22.5} x2={484} y={GROUND} />
      <GrateFrame />
      {[0, 1, 2].map((k) => (
        <Drive key={k} k={k} />
      ))}
    </g>
  );
}

/**
 * One pattern per drive: motor current on the terminal box, motor vibration at its drive end, bearing temperature on
 * the gearbox output side, stroke rate on the crank wheel. Current and bearing plates stand above the drive, vibration
 * and stroke rate on its plinth.
 */
const pads: LineSheetArt["pads"] = {};
const callouts: NonNullable<LineSheetArt["callouts"]> = {};
for (let k = 0; k < 3; k++) {
  const o = k * DP;
  const n = k + 1;
  pads[`SPD-CLR-1${n}`] = [165 + o, CY];
  pads[`VIB-CLR-1${n}`] = [86 + o, CY + 5];
  pads[`TMP-CLR-3${n}`] = [131 + o, CY + 12];
  pads[`ELE-CLR-1${n}`] = [71 + o, CY - 20.5];
  callouts[`ELE-CLR-1${n}`] = [108 + o, 228, "middle"];
  callouts[`TMP-CLR-3${n}`] = [108 + o, 250, "middle"];
  callouts[`VIB-CLR-1${n}`] = [110 + o, 360, "middle"];
  callouts[`SPD-CLR-1${n}`] = [110 + o, 382, "middle"];
}

export const sheet: LineSheetArt = { id: "C-4", ready: true, width: W, height: H, Art, pads, callouts };
