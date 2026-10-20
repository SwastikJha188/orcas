/**
 * Sheet C-4 — CLR-01 · Clinker cooler — Grate drive hydraulic unit
 * (group-images PDF page 12 "5A", panel GRATE DRIVE HYDRAULIC UNIT).
 *
 * The moving grate frame with its clinker bed, driven through a link by the
 * hydraulic cylinder (stroke sensor on the barrel). Oil lines run down to the
 * grate drive hydraulic power unit: oil tank, motor-pump and pressure block.
 * Beside it the cooler grease lubrication pumps.
 */
import { Bolt, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import type { LineSheetArt } from "../types";

/** Panel box on the page (page units): x 574…1080, y 91…540. */
const W = 506;
const H = 449;
const GROUND = 414;

type Pt = [number, number];

/** Hydraulic oil line along a polyline (oil = process material). */
function OilLine({ pts }: { pts: Pt[] }) {
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"} ${x} ${y}`).join(" ");
  return <path d={d} fill="none" stroke={MX.material} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />;
}

function GrateFrame() {
  const ix = 31;
  const ir = 475;
  const surf = (x: number) => {
    const t = (x - ix) / (ir - ix);
    return 127.5 - 7.5 * Math.sin(Math.min(1, t * 1.7) * Math.PI * 0.5) + 9 * Math.max(0, t - 0.4) / 0.6;
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
      <MachineLabel x={253} y={63.5} size={5}>
        MOVING GRATE FRAME
      </MachineLabel>
    </g>
  );
}

function Cylinder() {
  return (
    <g>
      {/* link from the rod end up to the moving frame */}
      <line x1={364} y1={180} x2={391.5} y2={151} stroke={MX.edge} strokeWidth={3.4} strokeLinecap="round" />
      <line x1={364} y1={180} x2={391.5} y2={151} stroke={MX.metal} strokeWidth={1.8} strokeLinecap="round" />
      {/* rod, barrel, rod-end clevis */}
      <rect x={275} y={174.5} width={72} height={10} rx={2} {...PAINT.shaft} />
      <rect x={142} y={169.5} width={133.5} height={20.5} rx={4} {...PAINT.cylinder} />
      <line x1={147} x2={270} y1={171.5} y2={171.5} stroke={MX.fine} strokeWidth={0.8} />
      <rect x={346} y={165} width={18} height={29} rx={3} {...PAINT.raised} />
      <Bolt x={355} y={179.5} r={2} />
      {/* stroke position sensor on the barrel */}
      <rect x={155.5} y={155.5} width={26.5} height={8} rx={2} {...PAINT.raised} />
      <rect x={167} y={163.5} width={3} height={6} {...PAINT.shaft} />
      <MachineLabel x={209} y={165} size={5}>
        HYDRAULIC CYLINDER
      </MachineLabel>
    </g>
  );
}

function PowerUnit() {
  return (
    <g>
      {/* pressure line to the pressure block, return line to the tank */}
      <OilLine pts={[[208.5, 190], [208.5, 223], [324.5, 223], [324.5, 298]]} />
      <OilLine pts={[[257.5, 190], [257.5, 236.5], [143, 236.5], [143, 289]]} />
      <rect x={80} y={271.5} width={275} height={115} rx={6} {...PAINT.body} />
      <MachineLabel x={142} y={285} size={5}>
        OIL TANK
      </MachineLabel>
      {/* oil tank */}
      <rect x={93} y={289} width={98} height={76} rx={3} {...PAINT.raised} />
      <rect x={95.5} y={291.5} width={93} height={71} rx={2} fill={MX.material} opacity={0.85} />
      {/* electric motor driving the pump (fan cowl left) */}
      <rect x={209} y={311} width={16} height={32} rx={7} {...PAINT.body} />
      <rect x={223} y={306} width={74.5} height={39} rx={7} {...PAINT.body} />
      {[313, 320, 327, 334, 341].map((y) => (
        <line key={y} x1={228} x2={292} y1={y} y2={y} {...PAINT.hair} />
      ))}
      <rect x={245} y={298.5} width={30} height={8} rx={2} {...PAINT.raised} />
      <rect x={246} y={321} width={15} height={7} rx={1.5} {...PAINT.recess} />
      <rect x={297.5} y={322} width={6} height={6} rx={1} {...PAINT.shaft} />
      <rect x={230.5} y={345} width={60} height={4.5} rx={1.2} {...PAINT.body} />
      {/* pressure block */}
      <rect x={302} y={298} width={44} height={25} rx={2.5} {...PAINT.raised} />
      <MachineLabel x={324} y={295} size={5}>
        PRESSURE BLOCK
      </MachineLabel>
      <MachineLabel x={217} y={400.5} size={5}>
        GRATE DRIVE HYDRAULIC POWER UNIT
      </MachineLabel>
    </g>
  );
}

function GreaseLube() {
  return (
    <g>
      <rect x={381.5} y={316} width={89} height={62} rx={5} {...PAINT.body} />
      <rect x={390} y={325} width={31.5} height={42.5} rx={3} {...PAINT.raised} />
      <rect x={392} y={327} width={27.5} height={38.5} rx={2} fill={MX.material} opacity={0.85} />
      <circle cx={439} cy={333.5} r={7} {...PAINT.raised} />
      <circle cx={439} cy={356} r={7} {...PAINT.raised} />
      <circle cx={454.2} cy={344.2} r={5} {...PAINT.raised} />
      <MachineLabel x={426} y={307} size={4.6}>
        COOLER GREASE LUBRICATION PUMPS
      </MachineLabel>
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={22.5} x2={484} y={GROUND} />
      <GrateFrame />
      <Cylinder />
      <PowerUnit />
      <GreaseLube />
    </g>
  );
}

/** Pads as on the panel; plates run along the equipment they sit on. */
const pads: LineSheetArt["pads"] = {
  "SPD-CLR-01": [168.5, 159.2],
  "PRS-CLR-07": [323.8, 310.8],
  "TMP-CLR-07": [111, 333.8],
  "STS-CLR-01": [454.2, 344.2],
};
const callouts: NonNullable<LineSheetArt["callouts"]> = {
  "SPD-CLR-01": [176, 159.2, "end"],
  "PRS-CLR-07": [316, 310.8, "end"],
  "TMP-CLR-07": [118, 333.8, "start"],
  "STS-CLR-01": [446, 344.2, "end"],
};

export const sheet: LineSheetArt = { id: "C-4", ready: true, width: W, height: H, Art, pads, callouts };
