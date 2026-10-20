/**
 * Sheet PYR-0 — PYRO LINE · Cement plant — Feed silo to clinker silo.
 *
 * The whole line composed from the six stage overviews (F-0 … H-0), each
 * placed at its own scale as on the user's line layout (2000 × 1125 units):
 * feed system and preheater with the main baghouse on top, the main burner
 * and the clinker transport in the middle, the rotary kiln and the grate
 * cooler at the bottom. Process flows join the stages: hot meal to the kiln
 * and kiln gas back to the calciner, coal to the burner, tertiary air from the
 * cooler to the calciner, clinker from the cooler to the crusher.
 *
 * No pads: the viewer shows a health dot per sub-assembly, placed on that
 * sub-assembly's central measuring point of its stage drawing.
 */
import React, { useId } from "react";
import { MX } from "@/components/assets/machine-kit/machine-kit";
import { PYRO_SIGNALS, PYRO_SUBASSEMBLIES } from "@/lib/pyro-sim/signals";
import type { LineSheetArt } from "../types";
import { sheet as f0 } from "./f0";
import { sheet as p0 } from "./p0";
import { sheet as k0 } from "./k0";
import { sheet as b0 } from "./b0";
import { sheet as c0 } from "./c0";
import { sheet as h0 } from "./h0";

type Pt = [number, number];

const W = 2000;
const H = 1125;

/**
 * Where each stage sits on the line: scale, offset (line units) and the part
 * of the stage drawing shown (stage units; pieces another stage already draws
 * are left out, e.g. the kiln hood on the cooler stage).
 */
interface Placement {
  machine: string;
  art: LineSheetArt;
  s: number;
  tx: number;
  ty: number;
  /** Visible outline of the stage drawing (stage units). */
  clip: Pt[];
}

const STAGES: Placement[] = [
  // Feed system without its bucket elevator and the arrow to the preheater (the preheater stage draws the elevator).
  { machine: "PYR-FED-01", art: f0, s: 0.645, tx: 0, ty: -2.8, clip: [[0, 0], [990, 0], [990, 400], [1165, 400], [1165, 774], [0, 774]] },
  { machine: "PYR-PHC-01", art: p0, s: 0.655, tx: 690.3, ty: -8.1, clip: [[0, 0], [1654, 0], [1654, 774], [0, 774]] },
  // Kiln without its inlet chamber and gas analyser (the hot-meal / kiln-gas flow arrives there from the preheater).
  { machine: "PYR-KLN-01", art: k0, s: 0.615, tx: 8, ty: 649.4, clip: [[500, 0], [1654, 0], [1654, 774], [0, 774], [0, 515], [185, 515], [185, 175], [500, 175]] },
  // Burner without the kiln, hood and cooler it shares with the kiln and cooler stages.
  { machine: "PYR-BRN-01", art: b0, s: 0.34, tx: 749, ty: 448, clip: [[930, 80], [1654, 80], [1654, 774], [930, 774]] },
  // Cooler without the kiln hood.
  { machine: "PYR-CLR-01", art: c0, s: 0.635, tx: 891.7, ty: 644.8, clip: [[215, 0], [1654, 0], [1654, 774], [215, 774]] },
  { machine: "PYR-CCT-01", art: h0, s: 0.33, tx: 1398, ty: 460.3, clip: [[0, 0], [1654, 0], [1654, 774], [0, 774]] },
];

const toLine = (p: Placement, [x, y]: Pt): Pt => [+(p.tx + x * p.s).toFixed(1), +(p.ty + y * p.s).toFixed(1)];

/** Process flow line: material (solid brass), hot gas (dashed) or air (dashed), with direction arrows. */
function FlowLine({ pts, kind, arrows = [] }: { pts: Pt[]; kind: "material" | "gas" | "air"; arrows?: number[] }) {
  const color = kind === "material" ? "var(--mx-material)" : kind === "gas" ? MX.gas : MX.air;
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"} ${x} ${y}`).join(" ");
  return (
    <g>
      <path d={d} fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" strokeDasharray={kind === "material" ? undefined : "7 5"} />
      {arrows.map((seg) => {
        const [a, b] = [pts[seg], pts[seg + 1]];
        const mx = (a[0] + b[0]) / 2;
        const my = (a[1] + b[1]) / 2;
        const ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
        return <path key={seg} d="M 7 0 L -6 -6 L -6 6 Z" fill={color} transform={`translate(${mx} ${my}) rotate(${ang})`} />;
      })}
    </g>
  );
}

function FlowLabel({ x, y, children, kind, anchor = "start" }: { x: number; y: number; children: React.ReactNode; kind: "material" | "air"; anchor?: "start" | "middle" | "end" }) {
  return (
    <text x={x} y={y} fontSize={11} fontWeight={600} letterSpacing="0.1em" textAnchor={anchor} fill={kind === "material" ? "var(--mx-material)" : MX.air}>
      {children}
    </text>
  );
}

/** The flows between the stages, in line units. */
function Flows() {
  return (
    <g>
      {/* Hot meal from the preheater to the kiln inlet (brass), kiln gas back up to the calciner (dashed). */}
      <FlowLine kind="material" pts={[[1058, 445], [1058, 476], [20, 476], [20, 832], [125, 832]]} arrows={[1, 3]} />
      <FlowLine kind="gas" pts={[[125, 822], [30, 822], [30, 486], [1066, 486], [1066, 446]]} arrows={[1, 2]} />
      <FlowLabel x={208} y={498} kind="material">
        HOT MEAL TO KILN · KILN GAS TO CALCINER
      </FlowLabel>
      {/* Fine coal from the burner manifold down to the main burner in the kiln hood. */}
      <FlowLine kind="material" pts={[[1068, 588], [998, 588], [998, 826], [962, 826]]} arrows={[1, 2]} />
      <FlowLabel x={988} y={631} kind="material" anchor="end">
        COAL TO BURNER
      </FlowLabel>
      {/* Tertiary air from the cooler hood end up to the calciner. */}
      <FlowLine kind="air" pts={[[1066, 748], [1066, 720], [1390, 720], [1390, 385], [1292, 385]]} arrows={[1, 2, 3]} />
      <FlowLabel x={1400} y={716} kind="air">
        TERTIARY AIR
      </FlowLabel>
      {/* Clinker from the cooler discharge round to the crusher feed chute. */}
      <FlowLine kind="material" pts={[[1706, 1100], [1706, 1118], [1986, 1118], [1986, 480], [1572, 480], [1572, 508]]} arrows={[2, 3]} />
      <FlowLabel x={1978} y={1108} kind="material" anchor="end">
        CLINKER TO CRUSHER
      </FlowLabel>
    </g>
  );
}

function Art() {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <g>
      <defs>
        {STAGES.map((p, i) => (
          <clipPath key={p.machine} id={`pyr0-${uid}-${i}`}>
            <polygon points={p.clip.map(([x, y]) => `${x},${y}`).join(" ")} />
          </clipPath>
        ))}
      </defs>
      {STAGES.map((p, i) => {
        const StageArt = p.art.Art;
        return (
          <g key={p.machine} transform={`translate(${p.tx} ${p.ty}) scale(${p.s})`}>
            <g clipPath={`url(#pyr0-${uid}-${i})`}>
              <StageArt />
            </g>
          </g>
        );
      })}
      <Flows />
    </g>
  );
}

/** No sensor pads on the line sheet: it shows sub-assembly health; each machine's points are on its own sheets. */
const pads: LineSheetArt["pads"] = {};

const inside = (p: Placement, [x, y]: Pt) => {
  // Point in the stage's visible outline (even-odd ray cast).
  let hit = false;
  for (let i = 0, j = p.clip.length - 1; i < p.clip.length; j = i++) {
    const [xi, yi] = p.clip[i];
    const [xj, yj] = p.clip[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
};

/**
 * Health dot of each sub-assembly: on the measuring point nearest the middle of
 * its points on the stage drawing that shows them (the calciner firing of the
 * burner group sits on the preheater stage).
 */
/** Sub-assemblies whose own drawing is cropped from the line: a place on what is shown (stage units). */
const PART_AT: Record<string, [string, Pt]> = {
  // Kiln inlet chamber and gas analysis: on the shell's inlet end, where the hot meal arrives.
  "kln-inlet": ["PYR-KLN-01", [214, 250]],
};

const parts: NonNullable<LineSheetArt["parts"]> = Object.fromEntries(
  PYRO_SUBASSEMBLIES.flatMap((sub) => {
    const fixed = PART_AT[sub.id];
    const fixedStage = fixed && STAGES.find((p) => p.machine === fixed[0]);
    if (fixedStage) return [[sub.id, { machine: sub.machine, at: toLine(fixedStage, fixed[1]) }]];
    const tags = PYRO_SIGNALS.filter((s) => s.sub === sub.id && s.origin !== "manual").map((s) => s.tag);
    const own = STAGES.filter((x) => x.machine === sub.machine);
    const order = [...own.map((p) => ({ p, strict: true })), ...STAGES.filter((x) => x.machine !== sub.machine).map((p) => ({ p, strict: true })), ...own.map((p) => ({ p, strict: false }))];
    // Points in the visible part first; a sub-assembly whose drawing is cropped away (kiln inlet chamber) keeps its own points.
    for (const { p, strict } of order) {
      const pts = tags.map((t) => p.art.pads[t]).filter((xy): xy is Pt => Boolean(xy) && (!strict || inside(p, xy)));
      if (!pts.length) continue;
      const cx = pts.reduce((a, q) => a + q[0], 0) / pts.length;
      const cy = pts.reduce((a, q) => a + q[1], 0) / pts.length;
      const best = pts.reduce((a, q) => (Math.hypot(q[0] - cx, q[1] - cy) < Math.hypot(a[0] - cx, a[1] - cy) ? q : a));
      return [[sub.id, { machine: sub.machine, at: toLine(p, best) }]];
    }
    return [];
  }),
);

/**
 * Area of each sub-assembly's equipment, tinted by its health: the box around
 * its measuring points on the stage drawing (plus a margin), on the line.
 */
const REGION_MARGIN = 34;
const partRegions: NonNullable<LineSheetArt["partRegions"]> = Object.fromEntries(
  PYRO_SUBASSEMBLIES.flatMap((sub) => {
    const fixed = PART_AT[sub.id];
    if (fixed) {
      const p = STAGES.find((x) => x.machine === fixed[0])!;
      const [x0, y0] = toLine(p, [fixed[1][0] - 40, fixed[1][1] - 60]);
      const [x1, y1] = toLine(p, [fixed[1][0] + 40, fixed[1][1] + 60]);
      return [[sub.id, { machine: sub.machine, box: [x0, y0, x1 - x0, y1 - y0] as [number, number, number, number] }]];
    }
    const tags = PYRO_SIGNALS.filter((s) => s.sub === sub.id && s.origin !== "manual").map((s) => s.tag);
    for (const p of [...STAGES.filter((x) => x.machine === sub.machine), ...STAGES.filter((x) => x.machine !== sub.machine)]) {
      const pts = tags.map((t) => p.art.pads[t]).filter((xy): xy is Pt => Boolean(xy) && inside(p, xy));
      if (!pts.length) continue;
      const xs = pts.map((q) => q[0]);
      const ys = pts.map((q) => q[1]);
      const [x0, y0] = toLine(p, [Math.min(...xs) - REGION_MARGIN, Math.min(...ys) - REGION_MARGIN]);
      const [x1, y1] = toLine(p, [Math.max(...xs) + REGION_MARGIN, Math.max(...ys) + REGION_MARGIN]);
      return [[sub.id, { machine: sub.machine, box: [x0, y0, +(x1 - x0).toFixed(1), +(y1 - y0).toFixed(1)] as [number, number, number, number] }]];
    }
    return [];
  }),
);

/** Clickable machine regions: each stage's block on the line. */
const box = (p: Placement): [number, number, number, number] => {
  const xs = p.clip.map(([x]) => x);
  const ys = p.clip.map(([, y]) => y);
  const [x0, y0] = toLine(p, [Math.min(...xs), Math.min(...ys)]);
  const [x1, y1] = toLine(p, [Math.max(...xs), Math.max(...ys)]);
  return [x0, y0, +(x1 - x0).toFixed(1), +(y1 - y0).toFixed(1)];
};
const links: NonNullable<LineSheetArt["links"]> = Object.fromEntries(STAGES.map((p) => [p.machine, box(p)]));

// No condition wash (`shades`): health shows as the sub-assembly dots.
export const sheet: LineSheetArt = { id: "PYR-0", ready: true, width: W, height: H, Art, pads, links, parts, partRegions };
