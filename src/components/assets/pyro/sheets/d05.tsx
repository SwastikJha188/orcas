/**
 * D05 — KLN-01 pinion, girth gear and spray lubrication.
 *
 * Composition of PDF page 5: kiln shell across the top with the girth gear
 * (168 T) ring below it and the pinion (24 T) between its bearings meshing at
 * the bottom of the ring. The spray header with six nozzles sits above the
 * mesh; at left the spray unit (controller + lubricant drum) feeds the
 * six-circuit metering divider, whose six circuits run up and across to the
 * nozzles.
 */
import React from "react";
import { Bolt, CornerBolts, MX, MachineLabel, PAINT } from "../../machine-kit/machine-kit";
import type { PyroSheetDrawing, SheetCalloutAnchor } from "./sheet-types";
import { OilLine, Pillow, Plinth, Shell, SprayNozzle, pdfMap } from "./sb-parts";

const { X, Y, L, P, B, R } = pdfMap(88, 80, 0.58);
const W = 884;
const H = 476;

/* girth gear ring (page px): centre, outer / inner radius, cut line */
const GC: [number, number] = [1110, 705];
const G_RO = 471;
const G_RI = 427;
const G_CUT = 582;

const NOZZLES = [792, 903, 1012, 1211, 1321, 1431];
/** Divider sections (page px), pitch widened slightly so the six pads stay ≥ 18 units apart. */
const COLS = [413, 446, 479, 512, 545, 578];
const DIV_TOP = 638;
const PAD_Y = 758;

function polar(r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [X(GC[0] + r * Math.sin(a)), Y(GC[1] - r * Math.cos(a))];
}

function GirthGear() {
  const cosO = (GC[1] - G_CUT) / G_RO;
  const cosI = (GC[1] - G_CUT) / G_RI;
  const tO = (Math.acos(cosO) * 180) / Math.PI;
  const tI = (Math.acos(cosI) * 180) / Math.PI;
  const ro = L(G_RO);
  const ri = L(G_RI);
  const [ox1, oy1] = polar(G_RO, -tO);
  const [ox2, oy2] = polar(G_RO, tO);
  const [ix2, iy2] = polar(G_RI, tI);
  const [ix1, iy1] = polar(G_RI, -tI);
  const band = `M ${ox1} ${oy1} A ${ro} ${ro} 0 0 1 ${ox2} ${oy2} L ${ix2} ${iy2} A ${ri} ${ri} 0 0 0 ${ix1} ${iy1} Z`;
  const pitch = 360 / 168;
  const teeth: React.ReactNode[] = [];
  const cx = X(GC[0]);
  const cy = Y(GC[1]);
  const tw = ((2 * Math.PI * ro) / 168) * 0.52;
  for (let a = -tO + pitch / 2; a < tO - pitch / 3; a += pitch) {
    teeth.push(
      <rect key={a.toFixed(2)} x={cx - tw / 2} y={cy - ro - 7} width={tw} height={8} rx={0.8} fill={MX.raised} stroke={MX.edge} strokeWidth={0.7} transform={`rotate(${a.toFixed(2)} ${cx} ${cy})`} />,
    );
  }
  return (
    <g aria-hidden="true">
      {teeth}
      <path d={band} fill={MX.cylinderV} stroke={MX.edge} strokeWidth={MX.w} strokeLinejoin="round" />
      <path d={`M ${polar(G_RO - 14, -tO + 1).join(" ")} A ${ro - L(14)} ${ro - L(14)} 0 0 1 ${polar(G_RO - 14, tO - 1).join(" ")}`} {...PAINT.hair} />
    </g>
  );
}

function Pinion() {
  const c = P(1110, 674);
  const r = L(76);
  const teeth = 24;
  return (
    <g>
      <rect {...B(910, 762, 1312, 772)} rx={2} {...PAINT.raised} />
      <Plinth {...R(903, 772, 1321, 800)} bolts={5} />
      {/* shaft through the pinion into both bearings */}
      <rect {...B(985, 661, 1240, 687)} rx={3} {...PAINT.shaft} />
      {Array.from({ length: teeth }).map((_, i) => (
        <rect
          key={i}
          x={c[0] - 3.4}
          y={c[1] - r - 7}
          width={6.8}
          height={9}
          rx={1}
          fill={MX.raised}
          stroke={MX.edge}
          strokeWidth={0.7}
          transform={`rotate(${(i * 360) / teeth + 7.5} ${c[0]} ${c[1]})`}
        />
      ))}
      <circle cx={c[0]} cy={c[1]} r={r} {...PAINT.shaft} strokeWidth={MX.w} />
      <circle cx={c[0]} cy={c[1]} r={r * 0.7} fill="none" stroke={MX.edge} strokeWidth={0.8} opacity={0.6} />
      <circle cx={c[0]} cy={c[1]} r={r * 0.24} {...PAINT.recess} />
      <Pillow {...R(925, 617, 990, 740)} />
      <Pillow {...R(1233, 617, 1299, 740)} />
    </g>
  );
}

function SprayHeader() {
  return (
    <g>
      <rect {...B(705, 511, 1519, 524)} rx={3} {...PAINT.shaft} />
      <rect {...B(700, 506, 712, 529)} rx={2} {...PAINT.raised} />
      <rect {...B(1512, 506, 1524, 529)} rx={2} {...PAINT.raised} />
      {NOZZLES.map((x) => (
        <SprayNozzle key={x} x={X(x)} y={Y(524)} h={L(48)} spread={L(26)} />
      ))}
    </g>
  );
}

function SprayUnit() {
  const cab = B(100, 573, 285, 857);
  return (
    <g>
      <rect {...B(92, 857, 293, 868)} rx={2} {...PAINT.raised} />
      <rect {...cab} rx={10} {...PAINT.body} />
      <rect x={cab.x + 5} y={cab.y + 5} width={cab.width - 10} height={cab.height - 10} rx={6} fill="none" stroke={MX.fine} strokeWidth={1} />
      <CornerBolts x={cab.x} y={cab.y} w={cab.width} h={cab.height} inset={9} />
      {/* controller display */}
      <rect {...B(127, 594, 258, 645)} rx={4} {...PAINT.recess} />
      <MachineLabel x={X(220)} y={Y(613)} size={5.2} tone="ink">
        CONTROLLER
      </MachineLabel>
      {[224, 238].map((x) => (
        <circle key={x} cx={X(x)} cy={Y(632)} r={2} fill={MX.edge} />
      ))}
      <line x1={X(140)} x2={X(170)} y1={Y(630)} y2={Y(630)} {...PAINT.hair} />
      {/* lubricant drum */}
      <rect {...B(121, 660, 264, 828)} rx={5} {...PAINT.recess} />
      <rect {...B(126, 676, 259, 823)} rx={3} {...PAINT.material} opacity={0.9} />
      {[700, 760].map((y) => (
        <line key={y} x1={X(126)} x2={X(259)} y1={Y(y)} y2={Y(y)} stroke={MX.edge} strokeWidth={0.8} opacity={0.5} />
      ))}
    </g>
  );
}

function MeteringDivider() {
  const lineY = (i: number) => 594 - i * 8.8;
  return (
    <g>
      {/* supply from the pump unit */}
      <OilLine pts={[P(285, 705), P(397, 705)]} w={5} />
      {/* six circuits: divider section → up → across → nozzle */}
      {COLS.map((cx, i) => (
        <OilLine key={cx} pts={[P(cx, DIV_TOP + 2), P(cx, lineY(i)), P(NOZZLES[i], lineY(i)), P(NOZZLES[i], 534)]} w={3} />
      ))}
      <rect {...B(397, 638, 593, 772)} rx={8} {...PAINT.body} />
      <rect {...B(401, 642, 589, 768)} rx={5} fill="none" stroke={MX.fine} strokeWidth={1} />
      {COLS.map((cx) => (
        <rect key={cx} x={X(cx - 11)} y={Y(658)} width={L(22)} height={L(102)} rx={L(10)} {...PAINT.shaft} strokeWidth={MX.w} />
      ))}
      <Bolt x={X(408)} y={Y(649)} r={1.5} />
      <Bolt x={X(582)} y={Y(649)} r={1.5} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <Shell {...R(617, 110, 1607, 276)} seam={L(82.5)} />
      <GirthGear />
      <Pinion />
      <SprayHeader />
      <SprayUnit />
      <MeteringDivider />

      <MachineLabel x={X(1385)} y={Y(100)} size={7.5}>KILN SHELL</MachineLabel>
      <MachineLabel x={X(1110)} y={Y(330)} size={7.5}>GIRTH GEAR (168 T)</MachineLabel>
      <MachineLabel x={X(1110)} y={Y(822)} size={7.5}>PINION (24 T)</MachineLabel>
      <MachineLabel x={X(495)} y={Y(800)} size={7.5}>METERING DIVIDER</MachineLabel>
      <MachineLabel x={X(100)} y={Y(892)} size={7.5} anchor="start">SPRAY UNIT / LUBRICANT DRUM</MachineLabel>
    </g>
  );
}

/** Callout boxes as on PDF page 5, next to their feature: top-left corner and width (drawing units). */
const callouts: Record<string, SheetCalloutAnchor> = {
  "STS-KLN-05": [-20, 152.8, 114.9],
  "PRX-KLN-01": [-20, 509.9, 119.8],
  "PRX-KLN-02": [134, 509.9, 119.8],
  "PRX-KLN-03": [289, 509.9, 118.1],
  "PRX-KLN-04": [444, 509.9, 118.1],
  "PRX-KLN-05": [599, 509.9, 119.8],
  "PRX-KLN-06": [754, 509.9, 118.1],
};

export const sheet: PyroSheetDrawing = {
  sheet: "D05",
  width: W,
  height: H,
  Art,
  callouts,
  pads: {
    "STS-KLN-05": P(160, 620),
    "PRX-KLN-01": P(COLS[0], PAD_Y),
    "PRX-KLN-02": P(COLS[1], PAD_Y),
    "PRX-KLN-03": P(COLS[2], PAD_Y),
    "PRX-KLN-04": P(COLS[3], PAD_Y),
    "PRX-KLN-05": P(COLS[4], PAD_Y),
    "PRX-KLN-06": P(COLS[5], PAD_Y),
  },
};
