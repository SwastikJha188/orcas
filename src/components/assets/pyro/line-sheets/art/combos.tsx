/**
 * Combined sheets — two or three stage overviews drawn as one, laid out as the combined designs
 * (Preheater_Kiln_Burner_Combined, Cooler_Crusher_Silo_Combined; 2000 × 1125 frame):
 *
 *   PYR-PKB  the preheater tower and calciner (top left) over the rotary kiln, its inlet chamber under the
 *            calciner; the burner's manifold and primary-air fan on the kiln hood (right);
 *   PYR-PK   the same without the burner;
 *   PYR-CC   the grate cooler (left) with the crusher, deep-pan conveyor and clinker silo below right;
 *            clinker from the cooler's transfer chute down to the crusher.
 *
 * Each stage is its own drawing at a scale and offset, cropped to the equipment the design shows; points keep
 * their stage pads (moved with the stage) unless the crop hides them. Readout blocks stand where the design
 * puts them and take their readings and labels from the stage sheets' blocks. The operator may move each stage
 * (its machine); connections between stages follow (arrange.ts).
 */
import React, { useId } from "react";
import { MX, MachineLabel } from "@/components/assets/machine-kit/machine-kit";
import type { ArrangePiece, LineSheetArt, PieceOffsets, SheetReadout } from "../types";
import { arrangeable, clampOffset, movedFlow, movedLabel } from "../arrange";
import { Line, type Dir } from "./parts-d";
import { sheet as p0 } from "./p0";
import { sheet as k0 } from "./k0";
import { sheet as b0 } from "./b0";
import { sheet as c0 } from "./c0";
import { sheet as h0 } from "./h0";

type Pt = [number, number];
type Box = [number, number, number, number];

const W = 2000;
const H = 1125;

interface Placement {
  /** Machine the stage draws (the piece the operator moves). */
  machine: string;
  art: LineSheetArt;
  s: number;
  tx: number;
  ty: number;
  /** Visible outline of the stage drawing (stage units); the whole stage when absent. */
  clip?: Pt[];
  /** Points whose own place is cropped away: a place on a stage of the sheet (index, stage units). */
  moved?: Record<string, [number, Pt]>;
}

/** A connection from one stage to another (indices into the sheet's stages), drawn as a process line. */
interface Flow {
  kind: "material" | "gas" | "air";
  pts: Pt[];
  /** Segments carrying a flow head at their middle. */
  arrows: number[];
  from: number;
  to: number;
  w?: number;
}

interface FlowText {
  x: number;
  y: number;
  text: string;
  anchor?: "start" | "middle" | "end";
  from: number;
  to: number;
}

/**
 * A readout block of the combined design: its title and box, and the stage blocks it takes its rows from
 * (stage index, stage block title, optional filter on the tags), plus rows of its own.
 */
interface DesignBlock {
  title: string;
  box: Box;
  from: Array<[number, string, ((tag: string) => boolean)?]>;
  rows?: Array<[string, string]>;
  /** Leader end on a stage (index, stage units); else the first source block's leader. */
  leader?: [number, Pt];
}

/** Readings on the preheater + kiln designs: about two dozen blocks round the drawing, at this share of the chosen size. */
const COMBO_SCALE = 0.72;

const at = (p: Placement, [x, y]: Pt): Pt => [+(p.tx + x * p.s).toFixed(1), +(p.ty + y * p.s).toFixed(1)];

function inside(poly: Pt[] | undefined, [x, y]: Pt): boolean {
  if (!poly) return true;
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

const COLOR = { material: MX.material, gas: MX.gas, air: MX.air };

function headDir([ax, ay]: Pt, [bx, by]: Pt): Dir {
  return Math.abs(bx - ax) >= Math.abs(by - ay) ? (bx > ax ? "right" : "left") : by > ay ? "down" : "up";
}

function FlowLine({ pts, kind, arrows, w = 10 }: Pick<Flow, "pts" | "kind" | "arrows" | "w">) {
  const heads = arrows.filter((k) => k < pts.length - 1).map((k): [number, number, Dir] => [(pts[k][0] + pts[k + 1][0]) / 2, (pts[k][1] + pts[k + 1][1]) / 2, headDir(pts[k], pts[k + 1])]);
  return <Line pts={pts} color={COLOR[kind]} w={w} heads={heads} dash={kind === "gas" ? 6 : undefined} />;
}

function compose(id: string, base: Placement[], baseFlows: Flow[], baseLabels: FlowText[], design: DesignBlock[], scale: number): LineSheetArt {
  return arrangeable(id, (asked) => {
    const wholeBox = (p: Placement): Box => [p.tx, p.ty, p.art.width * p.s, p.art.height * p.s];
    const off: PieceOffsets = {};
    for (const p of base) if (asked[p.machine]) off[p.machine] = clampOffset(asked, p.machine, wholeBox(p));
    const shift = (i: number): [number, number] => off[base[i].machine] ?? [0, 0];
    const stages = base.map((p, i) => ({ ...p, tx: p.tx + shift(i)[0], ty: p.ty + shift(i)[1] }));
    const flows = baseFlows.map((f) => ({ ...f, ...movedFlow(f.pts, f.arrows, shift(f.from), shift(f.to)) }));
    const labels = baseLabels.map((l) => {
      const [x, y] = movedLabel(l.x, l.y, shift(l.from), shift(l.to));
      return { ...l, x, y };
    });
    // A point's pad: its own place on the first stage that shows it, else the place the sheet moved it to.
    const pads: LineSheetArt["pads"] = {};
    for (const p of stages) {
      for (const [tag, xy] of Object.entries(p.art.pads)) {
        if (pads[tag]) continue;
        const move = p.moved?.[tag];
        if (move) pads[tag] = at(stages[move[0]], move[1]);
        else if (inside(p.clip, xy)) pads[tag] = at(p, xy);
      }
    }
    for (const p of stages) for (const [tag, [i, xy]] of Object.entries(p.moved ?? {})) pads[tag] ??= at(stages[i], xy);
    const blocks: SheetReadout[] = design.map((d) => {
      const rows: Array<[string, string]> = [];
      let leader: Pt | undefined = d.leader ? at(stages[d.leader[0]], d.leader[1]) : undefined;
      for (const [i, title, keep] of d.from) {
        const src = stages[i].art.readouts?.blocks.find((b) => b.title === title);
        if (!src) continue;
        rows.push(...src.rows.filter(([t]) => !keep || keep(t)));
        if (!leader && src.leader) leader = at(stages[i], src.leader);
      }
      rows.push(...(d.rows ?? []));
      return { title: d.title, box: d.box, leader, rows };
    });
    const width = Math.max(W, ...stages.map((p) => p.tx + p.art.width * p.s));
    const height = Math.max(H, ...stages.map((p) => p.ty + p.art.height * p.s));
    // The visible part of each stage (its clip, else the whole stage), where the operator grabs it.
    const pieces: ArrangePiece[] = stages.map((p) => {
      const xs = p.clip?.map(([x]) => x) ?? [0, p.art.width];
      const ys = p.clip?.map(([, y]) => y) ?? [0, p.art.height];
      const [x0, y0] = at(p, [Math.min(...xs), Math.min(...ys)]);
      const [x1, y1] = at(p, [Math.max(...xs), Math.max(...ys)]);
      return { id: p.machine, box: [x0, y0, +(x1 - x0).toFixed(1), +(y1 - y0).toFixed(1)] };
    });

    function Art() {
      const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
      return (
        <g>
          <defs>
            {stages.map((p, i) =>
              p.clip ? (
                <clipPath key={i} id={`${id}-${uid}-${i}`}>
                  <polygon points={p.clip.map(([x, y]) => `${x},${y}`).join(" ")} />
                </clipPath>
              ) : null,
            )}
          </defs>
          {stages.map((p, i) => {
            const StageArt = p.art.Art;
            return (
              <g key={i} transform={`translate(${p.tx} ${p.ty}) scale(${p.s})`}>
                <g clipPath={p.clip ? `url(#${id}-${uid}-${i})` : undefined}>
                  <StageArt />
                </g>
              </g>
            );
          })}
          {flows.map((f, i) => (
            <FlowLine key={i} pts={f.pts} kind={f.kind} arrows={f.arrows} w={f.w} />
          ))}
          {labels.map((l, i) => (
            <MachineLabel key={i} x={l.x} y={l.y} anchor={l.anchor ?? "start"} size={8}>
              {l.text}
            </MachineLabel>
          ))}
        </g>
      );
    }

    return {
      art: { ready: true, width, height, Art, pads, readouts: { frame: [0, 0, W, H], blocks, scale } },
      pieces,
    };
  });
}

/* ------------------------------------------------------------------------------------------------ preheater + kiln */

/** Preheater tower, its exit duct and the calciner (no kiln inlet, WHRS, ID fan or baghouse). */
const PRE: Placement = {
  machine: "PYR-PHC-01",
  art: p0,
  s: 1,
  tx: -201,
  ty: -100,
  clip: [[515, 120], [872, 120], [872, 252], [760, 252], [760, 622], [515, 622]],
  // The WHRS dampers, the gas temperature after the WHRS and the ID fan damper along the exit duct they sit on
  // (the WHRS loop is cropped); calciner coal where its line meets the calciner.
  moved: {
    "POS-PHC-03": [0, [781, 206]],
    "POS-PHC-05": [0, [803, 206]],
    "POS-PHC-04": [0, [825, 206]],
    "TMP-PHC-31": [0, [842, 206]],
    "POS-PHC-01": [0, [858, 205]],
    "FLO-BRN-02": [0, [754, 564]],
  },
};

/** Kiln with its inlet chamber under the calciner (riser, meal chute and tertiary up-leg left to the preheater). */
const KILN: Placement = {
  machine: "PYR-KLN-01",
  art: k0,
  s: 1,
  tx: 13,
  ty: 143,
  clip: [[0, 0], [W, 0], [W, H], [0, H], [0, 400], [560, 400], [560, 0]],
  moved: { "TMP-PHC-07": [0, [581, 604]] },
};

/** Hot meal down from C6 into the chamber, kiln gas up from the chamber into the calciner, tertiary air in. */
const PK_FLOWS: Flow[] = [
  { kind: "material", pts: [[380, 522], [380, 590], [469, 590]], arrows: [0, 1], from: 0, to: 1, w: 9 },
  { kind: "gas", pts: [[518, 544], [518, 523]], arrows: [], from: 1, to: 0, w: 14 },
];
const PK_LABELS: FlowText[] = [{ x: 676, y: 72, text: "GAS OUT → WHRS · ID FAN · BAGHOUSE", from: 0, to: 0 }];

const cyclone = (n: number, box: Box): DesignBlock => ({ title: `Cyclone C${n}`, box, from: [[0, `Cyclone C${n}`]] });
const tyre = (t: string) => t.startsWith("MIG-") || ["TMP-KLN-28", "TMP-KLN-29", "TMP-KLN-30"].includes(t);
const station = (n: number) => `Station ${n} · Tyre & rollers`;

/** The preheater and kiln blocks of the combined design (stage 0 preheater, 1 kiln). */
const PK_DESIGN: DesignBlock[] = [
  { title: "Preheater feed inlet", box: [250, 92, 138, 32], from: [[0, "Preheater feed inlet"]] },
  {
    title: "Preheater gas out",
    box: [700, 104, 122, 58],
    from: [],
    leader: [0, [756.5, 206]],
    // The design's three gas-out readings, then the WHRS and ID fan dampers whose loop the crop leaves out.
    rows: [
      ["TMP-PHC-30", "GAS OUT TEMP."],
      ["GAS-PHC-01", "GAS OUT O₂"],
      ["GAS-PHC-02", "GAS OUT CO"],
      ["TMP-PHC-31", "GAS TEMP. AFTER WHRS"],
      ["POS-PHC-03", "WHRS INLET DAMPER"],
      ["POS-PHC-04", "WHRS OUTLET DAMPER"],
      ["POS-PHC-05", "MAIN-LINE BYPASS DAMPER"],
      ["POS-PHC-01", "ID FAN DAMPER"],
    ],
  },
  cyclone(1, [598, 262, 143, 70]),
  cyclone(3, [598, 339, 143, 70]),
  cyclone(5, [598, 416, 143, 70]),
  cyclone(2, [210, 283, 142, 70]),
  cyclone(4, [210, 387, 142, 70]),
  cyclone(6, [210, 491, 142, 70]),
  { title: "Calciner", box: [605, 538, 165, 92], from: [[0, "Calciner"]] },
  { title: "Kiln inlet", box: [210, 616, 145, 107], from: [[1, "Kiln inlet"]] },
  { title: "Tertiary air duct", box: [886, 382, 149, 80], from: [[1, "Tertiary air duct"]] },
  { title: "Tyre 1", box: [773, 545, 122, 42], from: [[1, station(1), tyre]] },
  { title: "Tyre 2", box: [1075, 534, 126, 42], from: [[1, station(2), tyre]] },
  { title: "Tyre 3", box: [1407, 523, 122, 42], from: [[1, station(3), tyre]] },
  { title: "Rollers 1", box: [511, 882, 124, 70], from: [[1, station(1), (t) => !tyre(t)]] },
  { title: "Girth-gear spray", box: [673, 882, 124, 107], from: [[1, "Girth-gear spray"]] },
  { title: "Gearbox lubrication", box: [673, 997, 132, 92], from: [[1, "Gearbox lubrication"]] },
  { title: "Auxiliary drive & brake", box: [834, 882, 130, 40], from: [[1, "Auxiliary drive & brake"]] },
  { title: "Gearbox & pinion", box: [834, 940, 130, 77], from: [[1, "Gearbox & pinion"]] },
  { title: "Main motor", box: [1006, 882, 131, 195], from: [[1, "Main motor"]] },
  { title: "Rollers 2", box: [1183, 882, 155, 70], from: [[1, station(2), (t) => !tyre(t)]] },
  { title: "Axial thrust", box: [1183, 960, 155, 82], from: [[1, "Axial thrust"]] },
  { title: "Shell & scanner", box: [1356, 882, 152, 92], from: [[1, "Shell & scanner"]] },
  { title: "Rollers 3", box: [1521, 882, 124, 70], from: [[1, station(3), (t) => !tyre(t)]] },
];

export const pk = compose(
  "PYR-PK",
  [PRE, KILN],
  PK_FLOWS,
  PK_LABELS,
  [...PK_DESIGN, { title: "Kiln outlet & hood", box: [1736, 397, 160, 107], from: [[1, "Outlet & hood"]] }],
  COMBO_SCALE,
);

/* ------------------------------------------------------------------------------ preheater + kiln + burner */

/**
 * Burner manifold, axial / swirl lines and primary-air fan on the kiln's burner pipe (hood face right of the
 * kiln hood). The flame camera and secondary air move onto the kiln stage's hood; the kiln coal and coal line
 * readings onto the coal line into the manifold.
 */
const BURNER: Placement = {
  machine: "PYR-BRN-01",
  art: b0,
  s: 0.8,
  tx: 847.4,
  ty: 293.8,
  clip: [[795, 395], [945, 395], [945, 662], [795, 662]],
  moved: {
    "CAM-BRN-01": [1, [1400, 384]],
    "TMP-BRN-02": [1, [1394, 670]],
    "FLO-BRN-01": [2, [905, 435]],
    "PRS-BRN-04": [2, [930, 435]],
  },
};

export const pkb = compose(
  "PYR-PKB",
  [PRE, KILN, BURNER],
  PK_FLOWS,
  [...PK_LABELS, { x: 1612, y: 618, text: "FROM COAL FEEDER", anchor: "middle", from: 2, to: 2 }],
  [
    ...PK_DESIGN,
    { title: "Kiln outlet & hood", box: [1736, 397, 160, 107], from: [[1, "Outlet & hood"], [2, "Kiln hood & flame"]] },
    { title: "Burner", box: [1736, 523, 134, 63], from: [[2, "Multi-channel burner"]], rows: [["FLO-BRN-01", "KILN COAL"]] },
    { title: "Primary-air fan", box: [1736, 616, 138, 80], from: [[2, "Primary-air fan"]] },
  ],
  COMBO_SCALE,
);

/* --------------------------------------------------------------------------------- grate cooler + clinker */

/** Cooler, its transfer chute's "to crusher" box cropped (the clinker line takes over there). */
const COOLER: Placement = {
  machine: "PYR-CLR-01",
  art: c0,
  s: 0.71,
  tx: -78.3,
  ty: 150.2,
  clip: [[0, 0], [W, 0], [W, H], [1170, H], [1170, 556], [1075, 556], [1075, H], [0, H]],
};
const CRUSHER: Placement = { machine: "PYR-CCT-01", art: h0, s: 0.445, tx: 650.2, ty: 483.9 };

const fan = (n: number, x: number): DesignBlock => ({ title: `Cooling fan ${n} + motor`, box: [x, 935, 220, 125], from: [[0, `Cooling fan ${n} + motor`]] });

export const cc = compose(
  "PYR-CC",
  [COOLER, CRUSHER],
  [{ kind: "material", pts: [[715.5, 545], [715.5, 600], [853.5, 600], [853.5, 625]], arrows: [0, 1, 2], from: 0, to: 1, w: 9 }],
  [{ x: 730, y: 592, text: "CLINKER TO CRUSHER", from: 0, to: 1 }],
  [
    { title: "Grate 1 · drive motor", box: [9, 9, 220, 107], from: [[0, "Grate 1 · drive motor"]] },
    { title: "Grate 2 · drive motor", box: [267, 9, 220, 107], from: [[0, "Grate 2 · drive motor"]] },
    { title: "Grate 3 · drive motor · if fitted", box: [525, 9, 288, 107], from: [[0, "Grate 3 · drive motor · if fitted"]] },
    { title: "Vent exhaust fan", box: [828, 9, 209, 107], from: [[0, "Vent exhaust fan"]] },
    { title: "ESP · dust removal", box: [1051, 9, 209, 88], from: [[0, "ESP · dust removal"]] },
    { title: "Vent & clinker temperatures", box: [1274, 9, 233, 107], from: [[0, "Vent & clinker temperatures"]] },
    { title: "Undergrate pressure · zones 1 – 6", box: [1521, 9, 288, 144], from: [[0, "Undergrate pressure · zones 1 – 6"]] },
    { title: "Crusher motor", box: [1617, 188, 197, 143], from: [[1, "Crusher motor"]] },
    { title: "Hammer rotor & bearings", box: [1617, 341, 231, 143], from: [[1, "Hammer rotor & bearings"]] },
    { title: "Conveyor motor & head drive", box: [1617, 494, 254, 200], from: [[1, "Conveyor motor & head drive"]] },
    { title: "Clinker silo", box: [1617, 706, 148, 50], from: [[1, "Clinker silo"]] },
    { title: "Silo dust collection", box: [1617, 766, 244, 106], from: [[1, "Silo dust collection"]] },
    ...[9, 275, 541, 806, 1072, 1338].map((x, i) => fan(i + 1, x)),
  ],
  0.85,
);
