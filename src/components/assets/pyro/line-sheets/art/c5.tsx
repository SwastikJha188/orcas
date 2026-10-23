/**
 * Sheet C-5 — CLR-01 · Clinker cooler — Discharge, vent air, ESP and vent fan
 * (group-images PDF page 12 "5A", panel DISCHARGE, EXHAUST AND VENT FAN).
 *
 * The end of the grate drops the clinker down the discharge chute to the
 * crusher, watched by the IR pyrometer. Excess cooler air leaves through the
 * middle-vent duct (thermocouple in the duct roof), through the WHRS and the
 * ESP (dust removal, inlet / outlet pressure taps) on its top run (Rev 02),
 * down to the vent fan: volute, bearing housing, motor on the base rail, out
 * to the stack; part of the air returns to the cooler (return-air line).
 */
import { Bolt, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import type { LineSheetArt } from "../types";
import { volutePath } from "./parts-c";

/** Panel box on the page (page units): x 1106.5…1612, y 91…540. */
const W = 506;
const H = 449;
const GROUND = 414;
const FAN = { cx: 399.2, cy: 209.2, r: 44.5, top: 153.7 };

/** Filled flow arrowhead with its tip at (x, y), pointing along `deg` (90 = down). */
function Head({ x, y, deg, c, s = 4 }: { x: number; y: number; deg: number; c: string; s?: number }) {
  return <path d={`M ${x} ${y} l ${-s * 1.5} ${-s * 0.62} v ${s * 1.24} Z`} fill={c} transform={`rotate(${deg} ${x} ${y})`} />;
}

function ExhaustDuct() {
  return (
    <g>
      {/* inverted-U duct: outer wall, dark lining band, inner wall */}
      <path d="M 153.5 95 V 51.5 Q 153.5 43.5 161.5 43.5 H 402 Q 410 43.5 410 51.5 V 160" fill="none" stroke={MX.edge} strokeWidth={MX.w} />
      <path d="M 165 95 V 58 Q 165 55 168 55 H 395.5 Q 398.5 55 398.5 58 V 158" fill="none" stroke={MX.deep} strokeWidth={7.5} />
      <path d="M 174.5 95 V 65 H 389 V 156" fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      <MachineLabel x={215} y={45.5} size={4.6}>
        MIDDLE VENT
      </MachineLabel>
      {/* exhaust gas thermocouple from the duct roof */}
      <rect x={274} y={63} width={1.8} height={14} {...PAINT.shaft} />
      <circle cx={274.7} cy={80} r={5} {...PAINT.raised} />
      {/* WHRS, then the ESP on the duct's top run */}
      <rect x={285} y={34} width={40} height={40} rx={4} {...PAINT.body} />
      {[44, 54, 64].map((y) => (
        <line key={y} x1={289} x2={321} y1={y} y2={y} stroke={MX.fine} strokeWidth={0.8} />
      ))}
      <rect x={347} y={31} width={48} height={46} rx={4} {...PAINT.body} />
      {[357, 366, 375, 384].map((x) => (
        <line key={x} x1={x} x2={x} y1={36} y2={72} stroke={MX.fine} strokeWidth={0.8} />
      ))}
      <MachineLabel x={305} y={29} size={4.6}>
        WHRS
      </MachineLabel>
      <MachineLabel x={371} y={26} size={4.6}>
        ESP
      </MachineLabel>
    </g>
  );
}

function GrateEnd() {
  const ix = 26;
  const ir = 227;
  const surf = (x: number) => 179 - 6 * Math.sin(((x - ix) / (ir - ix)) * Math.PI * 0.9) + 2;
  const top = Array.from({ length: 25 }, (_, i) => {
    const x = ix + ((ir - ix) * i) / 24;
    return `${i ? "L" : "M"} ${x.toFixed(1)} ${surf(x).toFixed(1)}`;
  }).join(" ");
  return (
    <g>
      <rect x={22.5} y={94} width={208} height={113.5} rx={5} {...PAINT.body} />
      <path d={`${top} L ${ir} 200 L ${ix} 200 Z`} fill={MX.material} opacity={0.3} />
      <path d={top} fill="none" stroke={MX.material} strokeWidth={0.8} opacity={0.5} />
      <rect x={25} y={200} width={203} height={4.5} rx={1} {...PAINT.raised} />
      {Array.from({ length: 32 }).map((_, i) => (
        <line key={i} x1={29 + i * 6.25} x2={29 + i * 6.25} y1={200.6} y2={203.9} {...PAINT.hair} />
      ))}
      <MachineLabel x={119.5} y={107.5} size={5}>
        END OF GRATE
      </MachineLabel>
    </g>
  );
}

function Discharge() {
  return (
    <g>
      {/* falling clinker stream below the chute, on to the crusher */}
      <path d="M 247 271.5 H 280 L 284 360 H 240 Z" fill={MX.material} opacity={0.3} />
      <path d="M 230.5 156 H 276.5 L 292.5 271.5 H 239.5 Z" {...PAINT.body} />
      <rect x={260.6} y={365} width={1.8} height={36} fill={MX.material} />
      <Head x={261.5} y={406} deg={90} c={MX.material} />
      <MachineLabel x={270.5} y={404.5} size={4.6} anchor="start">
        TO CRUSHER
      </MachineLabel>
      {/* IR pyrometer and its sightline into the chute */}
      <line x1={301} y1={202.5} x2={265} y2={254} stroke={MX.air} strokeWidth={0.8} strokeDasharray="2.5 2" />
      <rect x={301} y={191} width={27.5} height={19} rx={3} {...PAINT.raised} />
      <MachineLabel x={315} y={187} size={4.6}>
        IR PYROMETER
      </MachineLabel>
    </g>
  );
}

function VentFan() {
  const { cx, cy, r, top } = FAN;
  const v = volutePath(cx, cy, r, top, -1);
  return (
    <g>
      {/* base rail */}
      <rect x={346} y={262.5} width={142} height={6.5} rx={2} {...PAINT.body} />
      <path d={`M ${cx - 12} ${cy + r - 4} H ${cx + 12} L ${cx + 16} 262.5 H ${cx - 16} Z`} {...PAINT.body} />
      {/* volute (outlet up on the right, into the exhaust duct) */}
      <path d={v.d} {...PAINT.body} />
      {[
        [-26, -16],
        [26, -21],
        [-26, 20],
      ].map(([dx, dy], i) => (
        <Bolt key={i} x={cx + dx} y={cy + dy} r={1.4} />
      ))}
      <circle cx={cx} cy={cy} r={28} {...PAINT.raised} />
      <circle cx={cx} cy={cy} r={21} {...PAINT.recess} />
      {[0, 90, 180, 270].map((a) => (
        <path
          key={a}
          d={`M ${cx + 3} ${cy - 2} C ${cx + 6} ${cy - 11} ${cx + 3} ${cy - 17} ${cx + 1} ${cy - 19} C ${cx - 2} ${cy - 14} ${cx - 3} ${cy - 7} ${cx - 1.5} ${cy - 3} Z`}
          fill={MX.flatRaised}
          stroke={MX.edge}
          strokeWidth={0.8}
          transform={`rotate(${a + 12} ${cx} ${cy})`}
        />
      ))}
      <circle cx={cx} cy={cy} r={5} {...PAINT.shaft} />
      {/* shaft through the bearing housing to the motor */}
      <rect x={cx} y={cy - 2} width={500 - cx} height={4} rx={1} {...PAINT.shaft} />
      <rect x={448} y={190} width={18} height={36} rx={3} {...PAINT.raised} />
      <rect x={452} y={226} width={10} height={36.5} {...PAINT.body} />
      {/* motor seen end-on: frame, terminal box, feet */}
      <rect x={470} y={188.7} width={23} height={42.3} rx={6} {...PAINT.body} />
      <rect x={478} y={203} width={7.5} height={13} rx={1.5} {...PAINT.recess} />
      <rect x={472} y={231} width={19} height={31.5} rx={1.5} {...PAINT.body} />
      <MachineLabel x={408} y={279} size={4.6}>
        VENT FAN → STACK
      </MachineLabel>
      {/* return air (recirculated) from the vent fan back under the cooler */}
      <path d="M 362 269 V 330 H 120 V 210" fill="none" stroke={MX.air} strokeWidth={1.4} strokeDasharray="4 3" strokeLinejoin="round" />
      <Head x={120} y={209} deg={-90} c={MX.air} />
      <MachineLabel x={124} y={346} size={4.6} anchor="start">
        RETURN AIR (RECIRCULATED)
      </MachineLabel>
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={22.5} x2={484} y={GROUND} />
      <ExhaustDuct />
      <GrateEnd />
      <Discharge />
      <VentFan />
    </g>
  );
}

/**
 * Pads as on the panel. The vent-fan points sit one per lane (motor top,
 * bearing top, motor, bearing bottom) so every plate runs left over the
 * volute. Vent-air points along the duct: before the WHRS, between WHRS and
 * ESP, the ESP inlet / outlet taps and its ΔP; return-air temperature on its line.
 */
const pads: LineSheetArt["pads"] = {
  "TMP-CLR-09": [274.7, 80],
  "TMP-CLR-24": [336, 55],
  "PRS-CLR-21": [352.5, 54],
  "PRS-CLR-22": [389.5, 54],
  "PRS-CLR-20": [371, 54],
  "VIB-CLR-07": [456.7, 197.8],
  "TMP-CLR-10": [456.7, 219.5],
  "TMP-CLR-23": [485.3, 208.5],
  "ELE-CLR-07": [479, 183],
  "TMP-CLR-25": [200, 330],
  "TMP-CLR-08": [315, 200.5],
};
const callouts: NonNullable<LineSheetArt["callouts"]> = {
  "TMP-CLR-09": [266, 92, "end"],
  "TMP-CLR-24": [336, 100, "middle"],
  "PRS-CLR-21": [340, 16, "end"],
  "PRS-CLR-22": [402, 16, "start"],
  "PRS-CLR-20": [371, 120, "middle"],
  "VIB-CLR-07": [450, 197.8, "end"],
  "TMP-CLR-10": [450, 219.5, "end"],
  "TMP-CLR-23": [478, 208.5, "end"],
  "ELE-CLR-07": [472, 183, "end"],
  "TMP-CLR-25": [180, 312, "middle"],
  "TMP-CLR-08": [308, 200.5, "end"],
};

export const sheet: LineSheetArt = { id: "C-5", ready: true, width: W, height: H, Art, pads, callouts };
