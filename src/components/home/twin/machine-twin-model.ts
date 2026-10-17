import type { AssetMachine } from "@/components/assets/assets-data";

/* ==========================================================================
   3D machine twin — scene model. Pure data, no three.js.

   Every machine is built from primitives laid out in the same drawing space as
   its 2D schematic (1000 × 372, y down, see machine-schematic.tsx), so the DB
   sensor coordinates (x, y in % of that space) land on the 3D part they
   measure, and a subsystem's DB bbox picks out the primitives it owns.
   z is depth toward the viewer in the same units; 0 is the machine centre line.
   ========================================================================== */

export type MachineFinish = "body" | "raised" | "metal" | "material" | "heat" | "deep";

export type MachinePrim =
  | {
      kind: "box";
      /** 2D rect in drawing units (y down). */
      x: number;
      y: number;
      w: number;
      h: number;
      /** Depth, drawing units. */
      d: number;
      z?: number;
      finish: MachineFinish;
    }
  | {
      kind: "cyl";
      /** Axis the cylinder runs along. */
      axis: "x" | "y" | "z";
      /** Centre in drawing units (y down). */
      cx: number;
      cy: number;
      z?: number;
      /** Radius at the start / end of the axis (frustum when different). */
      r: number;
      r2?: number;
      len: number;
      /** Slope of an x-axis cylinder, drawing units of y per unit of x (y down). */
      slope?: number;
      finish: MachineFinish;
    };

/** Drawing units → metres. 1000 units ≈ 40 m. */
export const UNIT = 0.04;

export interface MachineModel {
  prims: MachinePrim[];
  /** Drawing y of the floor. */
  ground: number;
}

const box = (x: number, y: number, w: number, h: number, d: number, finish: MachineFinish = "body", z = 0): MachinePrim => ({
  kind: "box",
  x,
  y,
  w,
  h,
  d,
  z,
  finish,
});

const cylX = (x0: number, x1: number, cy: number, r: number, finish: MachineFinish = "metal", z = 0, r2?: number): MachinePrim => ({
  kind: "cyl",
  axis: "x",
  cx: (x0 + x1) / 2,
  cy,
  r,
  r2,
  len: x1 - x0,
  z,
  finish,
});

const cylY = (cx: number, y0: number, y1: number, r: number, finish: MachineFinish = "metal", z = 0, r2?: number): MachinePrim => ({
  kind: "cyl",
  axis: "y",
  cx,
  cy: (y0 + y1) / 2,
  r,
  r2,
  len: y1 - y0,
  z,
  finish,
});

const cylZ = (cx: number, cy: number, r: number, len: number, finish: MachineFinish = "body", z = 0): MachinePrim => ({
  kind: "cyl",
  axis: "z",
  cx,
  cy,
  r,
  len,
  z,
  finish,
});

/* Rotary kiln: inlet chamber, sloped shell on three stations, drive, scanner,
   outlet seal and firing hood (mirrors KilnLines). */
function kiln(): MachineModel {
  const G = 340;
  const x0 = 182;
  const x1 = 850;
  const top = (x: number) => 96 + ((x - x0) * 16) / (x1 - x0);
  const axisY = (x: number) => top(x) + 32;
  const slope = 16 / (x1 - x0);
  const stations = [295, 545, 795];
  const p: MachinePrim[] = [];

  // inlet chamber, feed pipe, legs, seal
  p.push(box(40, 40, 120, 180, 130));
  p.push(cylY(67, 6, 42, 15, "metal"));
  p.push(box(58, 100, 84, 98, 4, "deep", 66));
  for (const lx of [50, 142]) for (const lz of [-55, 55]) p.push(box(lx, 218, 10, G - 218, 10, "body", lz));
  p.push(box(160, 84, 22, 90, 104, "raised"));
  p.push(box(186, 178, 9, G - 178, 9));

  // stations: base, pier, rollers either side of the tyre
  for (const sx of stations) {
    p.push(box(sx - 48, 308, 96, G - 308, 120));
    p.push(box(sx - 32, 196, 64, 112, 96));
    for (const rz of [-30, 30]) p.push(cylX(sx - 16, sx + 16, axisY(sx) + 32 + 14, 13, "metal", rz));
  }
  // hydraulic thrust roller cylinder
  p.push(cylY(580, 236, 328, 10, "metal", 46));

  // shell, burning zone, tyres, girth gear
  p.push({ kind: "cyl", axis: "x", cx: (x0 + x1) / 2, cy: axisY((x0 + x1) / 2), r: 32, len: x1 - x0, slope, finish: "metal" });
  p.push({ kind: "cyl", axis: "x", cx: 770, cy: axisY(770), r: 32.6, len: 160, slope, finish: "heat" });
  for (const sx of stations) p.push(cylX(sx - 12, sx + 12, axisY(sx), 38, "raised"));
  p.push(cylX(384, 396, axisY(390), 44, "raised"));
  p.push(box(380, 74, 22, 12, 18));

  // drive: plinth, lube skid, gearbox, pinion, upright motor
  p.push(box(334, 302, 136, G - 302, 110));
  p.push(box(346, 240, 112, 62, 90, "raised"));
  p.push(box(352, 274, 40, 22, 4, "material", 46));
  p.push(box(356, 166, 84, 60, 80));
  p.push(cylY(398, 150, 168, 4, "metal"));
  p.push(cylY(463, 128, 220, 24, "body"));

  // shell scanner
  p.push(box(617, 18, 6, G - 18, 6, "metal", -90));
  p.push(box(620, 56, 36, 6, 6, "metal", -90));
  p.push(box(656, 48, 30, 22, 22, "body", -90));

  // outlet seal, cooling fan
  p.push(box(850, 106, 16, 76, 104, "raised"));
  p.push(box(856, 182, 8, 85, 8));
  p.push(cylZ(860, 283, 16, 12, "metal", 10));

  // firing hood, legs, chute, burner lance, stack
  p.push(box(866, 40, 100, 200, 140));
  for (const lx of [872, 952]) for (const lz of [-60, 60]) p.push(box(lx, 240, 10, G - 240, 10, "body", lz));
  p.push(box(896, 240, 40, 60, 40, "material"));
  p.push(cylX(870, 996, 150, 4.5, "metal"));
  p.push(cylY(940, 14, 42, 4, "metal"));

  return { prims: p, ground: G };
}

function mill(): MachineModel {
  const G = 340;
  return {
    ground: G,
    prims: [
      box(84, 110, 136, 160, 130),
      cylX(220, 260, 190, 6, "metal"),
      box(260, 120, 125, 140, 120),
      cylX(385, 420, 190, 6, "metal"),
      box(420, 200, 40, 96, 90),
      box(770, 200, 40, 96, 90),
      cylX(460, 500, 185, 35, "body", 0, 115),
      cylX(500, 730, 185, 115, "metal"),
      cylX(636, 646, 185, 123, "raised"),
      cylX(730, 770, 185, 115, "body", 0, 35),
      box(402, 296, 426, G - 296, 260),
    ],
  };
}

function crusher(): MachineModel {
  const G = 340;
  return {
    ground: G,
    prims: [
      box(380, 40, 240, 26, 240, "raised"),
      cylY(500, 66, 250, 200, "body", 0, 120),
      cylY(500, 30, 286, 4, "metal"),
      box(330, 250, 170, 36, 160),
      box(500, 250, 120, 36, 160),
      box(160, 226, 100, 60, 70),
      cylX(260, 330, 255, 6, "metal"),
      box(470, 286, 60, G - 286, 90),
    ],
  };
}

function pump(): MachineModel {
  const G = 290;
  return {
    ground: G,
    prims: [
      box(100, 265, 780, G - 265, 170),
      box(120, 115, 175, 150, 130),
      cylX(296, 330, 190, 18, "raised"),
      box(330, 140, 185, 100, 100),
      cylX(515, 545, 190, 6, "metal"),
      cylZ(630, 180, 90, 90, "body"),
      cylZ(630, 180, 30, 96, "metal"),
      cylX(690, 880, 130, 30, "metal"),
      box(874, 92, 14, 76, 76, "raised"),
    ],
  };
}

function blower(): MachineModel {
  const G = 290;
  return {
    ground: G,
    prims: [
      box(100, 265, 780, G - 265, 170),
      box(120, 115, 175, 150, 130),
      cylX(295, 560, 190, 6, "metal"),
      box(330, 150, 185, 80, 90),
      cylZ(630, 175, 95, 110, "body"),
      cylZ(630, 175, 40, 116, "metal"),
      box(700, 60, 140, 50, 90, "metal"),
    ],
  };
}

/** The 3D models; every catalog diagram type is drawn as one of them (kiln and VPC are built models, see machine-twin-canvas). */
export type TwinKind = "mill" | "crusher" | "pump" | "blower" | "kiln" | "vpc-casting";

const NATIVE: readonly string[] = ["mill", "crusher", "pump", "blower", "kiln"];

/** Pyro-line & VPC diagram types → 3D twin model. */
const PYRO_TWIN: Record<string, TwinKind> = {
  "pyro-kiln": "kiln",
  "clinker-transport": "crusher",
  "kiln-burner": "blower", // primary-air fan and coal line
  "grate-cooler": "blower", // cooling-air fans
  preheater: "blower", // cyclone string on the ID fan
  "feed-system": "blower", // aeration blowers, feed-elevator drive
  "vpc-casting": "vpc-casting",
};

export function twinKind(type: string | null | undefined): TwinKind {
  if (type && NATIVE.includes(type)) return type as TwinKind;
  return (type && PYRO_TWIN[type]) || "pump";
}

/**
 * True when the catalog's sensor x / y and system bboxes are % of another
 * drawing (the pyro line's own drawings), not of this model's 1000 × 372 space.
 */
export function usesForeignSpace(type: string | null | undefined): boolean {
  return !(type && NATIVE.includes(type));
}

/** Extent of a model in drawing units: x range of its parts, top of its parts to the floor. */
export function modelExtent(model: MachineModel): { x0: number; x1: number; y0: number; y1: number } {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  for (const p of model.prims) {
    const [a, b] = p.kind === "box" ? [p.x, p.x + p.w] : p.axis === "x" ? [p.cx - p.len / 2, p.cx + p.len / 2] : [p.cx - p.r, p.cx + p.r];
    const top = p.kind === "box" ? p.y : p.axis === "y" ? p.cy - p.len / 2 : p.cy - Math.max(p.r, p.r2 ?? 0);
    x0 = Math.min(x0, a);
    x1 = Math.max(x1, b);
    y0 = Math.min(y0, top);
  }
  if (!Number.isFinite(x0)) return { x0: 0, x1: 1000, y0: 0, y1: model.ground };
  return { x0, x1, y0, y1: model.ground };
}

export function buildMachineModel(type: AssetMachine["diagramType"]): MachineModel {
  switch (twinKind(type)) {
    case "kiln":
      return kiln();
    case "mill":
      return mill();
    case "crusher":
      return crusher();
    case "blower":
      return blower();
    default:
      return pump();
  }
}

/** A primitive's centre in drawing space, for subsystem ownership. */
export function primCentre(p: MachinePrim): { x: number; y: number } {
  return p.kind === "box" ? { x: p.x + p.w / 2, y: p.y + p.h / 2 } : { x: p.cx, y: p.cy };
}

type Box2 = { x: number; y: number; width: number; height: number };

/**
 * The subsystem that owns a primitive: the smallest DB bbox containing its
 * centre. Primitives outside every bbox are structure (null).
 */
export function ownerOf(p: MachinePrim, systems: Array<{ id: string; bbox?: Box2 }>): string | null {
  const c = primCentre(p);
  let best: { id: string; area: number } | null = null;
  for (const s of systems) {
    const b = s.bbox;
    if (!b || c.x < b.x || c.x > b.x + b.width || c.y < b.y || c.y > b.y + b.height) continue;
    const area = b.width * b.height;
    if (!best || area < best.area) best = { id: s.id, area };
  }
  return best?.id ?? null;
}
