/**
 * Sheet PYR-0 — PYRO LINE · Cement plant — Feed silo to clinker silo (design Main_Overview Rev03).
 *
 * The whole line composed from the six stage overviews (F-0 … H-0), each piece placed at its own scale on the
 * 2000 × 1125 line: the feed system top left with the meal line down to the preheater top; the preheater
 * tower and calciner on the left over the rotary kiln, the exit gas up and across to the WHRS, ID fan and main
 * baghouse (top middle); the coal firing system top right with the calciner coal duct and the coal + primary
 * air line down to the burner manifold on the kiln hood; the grate cooler beside the hood and the crusher,
 * deep-pan conveyor and clinker silo bottom right, clinker down the transfer chute to the crusher.
 *
 * A machine may be drawn as several pieces (the preheater tower and its gas route; the coal system and the
 * burner end). No pads: the viewer shows a health dot per sub-assembly, placed on that sub-assembly's central
 * measuring point of its stage drawing.
 */
import React, { useId } from "react";
import { MX, MachineLabel } from "@/components/assets/machine-kit/machine-kit";
import { PYRO_SIGNALS, PYRO_SUBASSEMBLIES } from "@shared/lib/pyro-sim/signals";
import type { ArrangePiece, LineSheetArt, PieceOffsets } from "../types";
import { arrangeable, clampOffset, movedFlow, movedLabel } from "../arrange";
import { Line, type Dir } from "./parts-d";
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
 * One piece of a stage on the line: its machine, scale, offset (line units) and the part of the stage drawing
 * shown (stage units).
 */
interface Placement {
  machine: string;
  art: LineSheetArt;
  s: number;
  tx: number;
  ty: number;
  /** Visible outline of the stage drawing (stage units). */
  clip: Pt[];
  /** The equipment drawn in the piece ([x0, y0, x1, y1], stage units): its click area on the line. */
  area: [number, number, number, number];
}

const ALL: Pt[] = [[0, 0], [W, 0], [W, H], [0, H]];

const STAGES: Placement[] = [
  { machine: "PYR-FED-01", art: f0, s: 0.62, tx: -209, ty: -136.4, area: [590, 240, 1690, 820], clip: ALL },
  // Preheater tower, exit duct and calciner (left), over the kiln inlet.
  { machine: "PYR-PHC-01", art: p0, s: 0.745, tx: -308.9, ty: 262.4, area: [515, 120, 872, 622], clip: [[515, 175], [872, 175], [872, 252], [760, 252], [760, 622], [515, 622]] },
  // WHRS, ID fan, main baghouse, baghouse fan and stack (top middle).
  { machine: "PYR-PHC-01", art: p0, s: 0.75, tx: 304.2, ty: -111.2, area: [780, 120, 1480, 660], clip: [[780, 120], [1480, 120], [1480, 700], [950, 700], [950, 520], [780, 520]] },
  // Kiln, its inlet chamber under the calciner (riser, chute and tertiary up-leg left to the preheater piece).
  { machine: "PYR-KLN-01", art: k0, s: 0.75, tx: -152, ty: 426.5, area: [440, 280, 1500, 715], clip: [[0, 0], [W, 0], [W, H], [0, H], [0, 400], [560, 400], [560, 0]] },
  // Coal firing system: fine-coal bin, feeders, aeration and conveying blowers, calciner coal riser (top right).
  { machine: "PYR-BRN-01", art: b0, s: 0.665, tx: 770.6, ty: -112.9, area: [1060, 200, 1440, 690], clip: [[1060, 226], [1440, 226], [1440, 690], [1060, 690]] },
  // Burner end: manifold, axial / swirl lines and primary-air fan on the kiln hood.
  { machine: "PYR-BRN-01", art: b0, s: 0.52, tx: 535.6, ty: 574.6, area: [795, 395, 945, 662], clip: [[795, 395], [936, 395], [936, 662], [795, 662]] },
  // Cooler without the kiln outlet and hood (the kiln piece draws them) and its "to crusher" box.
  { machine: "PYR-CLR-01", art: c0, s: 0.415, tx: 965.7, ty: 670.7, area: [345, 230, 1240, 820], clip: [[620, 0], [W, 0], [W, H], [1170, H], [1170, 556], [1075, 556], [1075, H], [354, H], [354, 398], [620, 398]] },
  { machine: "PYR-CCT-01", art: h0, s: 0.26, tx: 1388.8, ty: 864.5, area: [90, 280, 1720, 1000], clip: ALL },
];

const toLine = (p: Placement, [x, y]: Pt): Pt => [+(p.tx + x * p.s).toFixed(1), +(p.ty + y * p.s).toFixed(1)];

const COLOR = { material: MX.material, gas: MX.gas, air: MX.air };
const headDir = ([ax, ay]: Pt, [bx, by]: Pt): Dir => (Math.abs(bx - ax) >= Math.abs(by - ay) ? (bx > ax ? "right" : "left") : by > ay ? "down" : "up");

/** Process line between stages: a tube with the medium's core (gas dashed) and flow heads on the given segments. */
function FlowLine({ pts, kind, arrows = [] }: { pts: Pt[]; kind: "material" | "gas" | "air"; arrows?: number[] }) {
  const heads = arrows.filter((k) => k < pts.length - 1).map((k): [number, number, Dir] => [(pts[k][0] + pts[k + 1][0]) / 2, (pts[k][1] + pts[k + 1][1]) / 2, headDir(pts[k], pts[k + 1])]);
  return <Line pts={pts} color={COLOR[kind]} w={7} core={1.5} heads={heads} dash={kind === "gas" ? 5 : undefined} />;
}

/**
 * The flows between the stages, in line units, each from one machine's stage to another's (they follow
 * the machines when the operator moves them; see arrange.ts).
 */
interface Flow {
  kind: "material" | "gas" | "air";
  pts: Pt[];
  arrows: number[];
  from: string;
  to: string;
}
interface Label {
  x: number;
  y: number;
  text: string;
  anchor?: "start" | "middle" | "end";
  from: string;
  to: string;
}
const FLOWS: Flow[] = [
  // Meal from the airlocks down and across to the preheater top.
  { kind: "material", pts: [[746, 190], [746, 385], [181, 385], [181, 393]], arrows: [0, 1], from: "PYR-FED-01", to: "PYR-PHC-01" },
  // Exit gas from the C1 duct across and up to the WHRS.
  { kind: "gas", pts: [[341, 411], [868, 411], [868, 39], [889, 39]], arrows: [0, 1], from: "PYR-PHC-01", to: "PYR-PHC-01" },
  // Hot meal from C6 down into the kiln inlet chamber.
  { kind: "material", pts: [[123.9, 725], [123.9, 800], [190, 800]], arrows: [0, 1], from: "PYR-PHC-01", to: "PYR-KLN-01" },
  // Calciner coal from the coal system's riser round to the calciner burner.
  { kind: "material", pts: [[1700, 42], [1700, 12], [1415, 12], [1415, 645], [248, 645], [248, 680]], arrows: [2, 3], from: "PYR-BRN-01", to: "PYR-PHC-01" },
  // Kiln coal and conveying air down to the burner manifold.
  { kind: "material", pts: [[1475, 273], [1430, 273], [1430, 738], [1010, 738], [1010, 800], [998, 800]], arrows: [1, 2], from: "PYR-BRN-01", to: "PYR-BRN-01" },
  // Clinker from the cooler's transfer chute to the crusher.
  { kind: "material", pts: [[1430, 905], [1430, 925], [1507, 925], [1507, 947]], arrows: [1, 2], from: "PYR-CLR-01", to: "PYR-CCT-01" },
];
const LABELS: Label[] = [
  { x: 568, y: 379, text: "MEAL TO PREHEATER TOP", anchor: "middle", from: "PYR-FED-01", to: "PYR-PHC-01" },
  { x: 608, y: 404, text: "PREHEATER GAS → WHRS · ID FAN · BAGHOUSE", anchor: "middle", from: "PYR-PHC-01", to: "PYR-PHC-01" },
  { x: 1500, y: 26, text: "COAL FIRING SYSTEM", anchor: "middle", from: "PYR-BRN-01", to: "PYR-BRN-01" },
  { x: 895, y: 639, text: "COAL DUCT → CALCINER BURNER", anchor: "middle", from: "PYR-BRN-01", to: "PYR-PHC-01" },
  { x: 1160, y: 732, text: "COAL + PA → KILN BURNER", anchor: "middle", from: "PYR-BRN-01", to: "PYR-BRN-01" },
];

function artFor(stages: Placement[], off: PieceOffsets): React.ComponentType {
  const at = (id: string): [number, number] => off[id] ?? [0, 0];
  const flows = FLOWS.map((f) => ({ ...f, ...movedFlow(f.pts, f.arrows, at(f.from), at(f.to)) }));
  const labels = LABELS.map((l) => {
    const [x, y] = movedLabel(l.x, l.y, at(l.from), at(l.to));
    return { ...l, x, y };
  });
  return function Art() {
    const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
    return (
      <g>
        <defs>
          {stages.map((p, i) => (
            <clipPath key={i} id={`pyr0-${uid}-${i}`}>
              <polygon points={p.clip.map(([x, y]) => `${x},${y}`).join(" ")} />
            </clipPath>
          ))}
        </defs>
        {stages.map((p, i) => {
          const StageArt = p.art.Art;
          return (
            <g key={i} transform={`translate(${p.tx} ${p.ty}) scale(${p.s})`}>
              <g clipPath={`url(#pyr0-${uid}-${i})`}>
                <StageArt />
              </g>
            </g>
          );
        })}
        <g>
          {flows.map((f, i) => (
            <FlowLine key={i} kind={f.kind} pts={f.pts} arrows={f.arrows} />
          ))}
          {labels.map((l, i) => (
            <MachineLabel key={i} x={l.x} y={l.y} anchor={l.anchor ?? "start"} size={7.5}>
              {l.text}
            </MachineLabel>
          ))}
        </g>
      </g>
    );
  };
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
  "kln-inlet": ["PYR-KLN-01", [505, 497]],
};

const partsFor = (stages: Placement[]): NonNullable<LineSheetArt["parts"]> => Object.fromEntries(
  PYRO_SUBASSEMBLIES.flatMap((sub) => {
    const fixed = PART_AT[sub.id];
    const fixedStage = fixed && stages.find((p) => p.machine === fixed[0]);
    if (fixedStage) return [[sub.id, { machine: sub.machine, at: toLine(fixedStage, fixed[1]) }]];
    const tags = PYRO_SIGNALS.filter((s) => s.sub === sub.id && s.origin !== "manual").map((s) => s.tag);
    const own = stages.filter((x) => x.machine === sub.machine);
    const order = [...own.map((p) => ({ p, strict: true })), ...stages.filter((x) => x.machine !== sub.machine).map((p) => ({ p, strict: true })), ...own.map((p) => ({ p, strict: false }))];
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
const partRegionsFor = (stages: Placement[]): NonNullable<LineSheetArt["partRegions"]> => Object.fromEntries(
  PYRO_SUBASSEMBLIES.flatMap((sub) => {
    const fixed = PART_AT[sub.id];
    if (fixed) {
      const p = stages.find((x) => x.machine === fixed[0])!;
      const [x0, y0] = toLine(p, [fixed[1][0] - 40, fixed[1][1] - 60]);
      const [x1, y1] = toLine(p, [fixed[1][0] + 40, fixed[1][1] + 60]);
      return [[sub.id, { machine: sub.machine, box: [x0, y0, x1 - x0, y1 - y0] as [number, number, number, number] }]];
    }
    const tags = PYRO_SIGNALS.filter((s) => s.sub === sub.id && s.origin !== "manual").map((s) => s.tag);
    for (const p of [...stages.filter((x) => x.machine === sub.machine), ...stages.filter((x) => x.machine !== sub.machine)]) {
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

/** Clickable machine regions: each piece's equipment on the line. */
const box = (p: Placement): [number, number, number, number] => {
  const [x0, y0] = toLine(p, [p.area[0], p.area[1]]);
  const [x1, y1] = toLine(p, [p.area[2], p.area[3]]);
  return [x0, y0, +(x1 - x0).toFixed(1), +(y1 - y0).toFixed(1)];
};

/** The line with each machine's stage moved by the operator's offset (kept on the sheet's top-left side). */
export const sheet: LineSheetArt = arrangeable("PYR-0", (asked) => {
  const off: PieceOffsets = {};
  for (const p of STAGES) if (asked[p.machine] && !off[p.machine]) off[p.machine] = clampOffset(asked, p.machine, box(p));
  const stages = STAGES.map((p) => (off[p.machine] ? { ...p, tx: p.tx + off[p.machine][0], ty: p.ty + off[p.machine][1] } : p));
  // A machine's main piece (its first) is its link and arrange handle; every piece is clickable.
  const links: NonNullable<LineSheetArt["links"]> = {};
  const areas: NonNullable<LineSheetArt["areas"]> = {};
  for (const p of stages) {
    links[p.machine] ??= box(p);
    (areas[p.machine] ??= []).push(box(p));
  }
  const pieces: ArrangePiece[] = Object.entries(links).map(([id, b]) => ({ id, box: b }));
  // A machine moved past the sheet's right or bottom edge grows the sheet.
  const moved = pieces.filter((p) => off[p.id]);
  const width = Math.max(W, ...moved.map((p) => p.box[0] + p.box[2] + 16));
  const height = Math.max(H, ...moved.map((p) => p.box[1] + p.box[3] + 16));
  // No condition wash (`shades`): health shows as the sub-assembly dots.
  return {
    art: { ready: true, width, height, Art: artFor(stages, off), pads, links, areas, parts: partsFor(stages), partRegions: partRegionsFor(stages) },
    pieces,
  };
});
