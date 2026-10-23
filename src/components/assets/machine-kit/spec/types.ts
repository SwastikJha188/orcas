/**
 * Diagram spec: the small JSON a model writes from a machine image (skill
 * machine-diagram-2d). It names what is in the picture, roughly where, and
 * what connects to what; `layoutSpec` turns it into a tidy, routed, labelled
 * layout, and `layoutSheet` / `layoutModel` draw that layout in 2D and 3D.
 *
 * Positions are grid units of the source image: x 0 = left edge … 100 = right
 * edge, y 0 = top … 100 = bottom, whatever the image's shape.
 */

export type ItemType =
  | "cabinet"
  | "generator"
  | "motor"
  | "gearbox"
  | "drive"
  | "pump"
  | "vacuum-pump"
  | "fan"
  | "compressor"
  | "tank"
  | "silo"
  | "hopper"
  | "horizontal-tank"
  | "cyclone"
  | "stack"
  | "gas-cylinder"
  | "chamber"
  | "drum"
  | "conveyor"
  | "bucket-elevator"
  | "filter"
  | "heat-exchanger"
  | "cooling-unit"
  | "actuator"
  | "valve"
  | "hydraulic-unit"
  | "crusher"
  | "mixer"
  | "press"
  | "extruder"
  | "burner"
  | "screen"
  | "frame"
  | "rotary-valve"
  | "block"
  | "cylinder"
  | "table"
  | "fixture"
  | "workpiece"
  | "tool"
  | "wheel"
  | "cone"
  | "pile"
  | "machine";

export type Medium = "material" | "hot-gas" | "gas" | "air" | "water" | "steam" | "oil" | "vacuum" | "power" | "signal";

export type Side = "top" | "bottom" | "left" | "right";

/** [left, top, right, bottom] in grid units. */
export type GridBox = [number, number, number, number];

export interface SpecItem {
  /** Short unique name, e.g. "pump", "melt_chamber". */
  id: string;
  type: ItemType | string;
  box: GridBox | number[] | Record<string, number>;
  /** Name printed under / beside it, upper case ("VACUUM PUMP"). */
  label?: string;
  /** Id of the item it stands or is mounted on (actuator on a chamber, chamber on a chamber). */
  on?: string;
  options?: ItemOptions;
}

export interface ItemOptions {
  /** chamber / tank / drum: glow inside. */
  heat?: boolean;
  /** chamber: what is inside. */
  contents?: "crucible-coil" | "crucible" | "flask" | "bed" | "parts" | "none";
  /** tank / silo: contents level 0–1 shown in a window. */
  level?: number;
  /** cabinet: number of doors; screen (HMI); pilot lamps. */
  doors?: number;
  screen?: boolean;
  lamps?: number;
  /** pump / fan / motor / drive / extruder: side the motor sits or the shaft leaves. */
  motor?: "left" | "right";
  /** fan: side the outlet duct leaves. */
  outlet?: "left" | "right";
  /** cyclone: side of the inlet duct. */
  inlet?: "left" | "right";
  /** conveyor kind; slope from left to right ("up" = rises to the right). */
  kind?: "belt" | "screw" | "chain" | "slide" | "shell" | "plate";
  slope?: "flat" | "up" | "down";
  /** tank top / bottom. */
  top?: "dome" | "cone" | "flat";
  bottom?: "flat" | "cone" | "dish";
  /** Stands on legs / a stand above the floor (keeps its height in the image). */
  elevated?: boolean;
  /** actuator: horizontal instead of vertical. */
  horizontal?: boolean;
  /** valve item: kind. */
  valve?: ValveKind;
  /** Shape parts (block, cylinder, cone, tool, fixture): turned by this many degrees, clockwise. */
  angle?: number;
  /** Shape parts: paint — "raised" (cover, plate), "recess" (opening, window, screen), "material" (product), "body" (default). */
  tone?: "body" | "raised" | "recess" | "material";
  /** cone: which end is narrow. */
  narrow?: "top" | "bottom" | "left" | "right";
}

/**
 * A machine drawn from its own picture (any machine without a finished catalog part): its areas and
 * edge lines vectorized from the image by scripts/diagram-lab/vectorize.py. Paths are in units of
 * 0..1000 across the group's box (x) and 0..1000 down it (y).
 */
export interface TracedArt {
  regions: Array<{ tone: "body" | "raised" | "recess" | "material" | "shaft"; d: string }>;
  ink: string[];
  silhouette: string[];
  aspect: number;
}

/** One traced machine: the items it is made of, its area in the image and on the sheet. */
export interface TracedGroup {
  key: string;
  ids: string[];
  /** Area in the image, grid units [l, t, r, b]. */
  src: [number, number, number, number];
  /** Area on the sheet. */
  box: Box;
  /** Its parts in the image (grid units) with their tone hints, for the vectorizer. */
  parts?: Array<{ box: [number, number, number, number]; tone: string }>;
  /** Filled in by draw.mjs from the image; without it the parts are drawn as shapes. */
  art?: TracedArt;
}

export type ValveKind = "gate" | "globe" | "ball" | "butterfly" | "check" | "control" | "solenoid" | "regulator";

export interface SpecLink {
  id?: string;
  from: string;
  to: string;
  medium: Medium | string;
  /** Wide duct instead of a pipe (air / hot gas). */
  duct?: boolean;
  /** Valves on the line; `at` = % of the way from `from` to `to` (default 50). */
  valves?: Array<{ kind?: ValveKind | string; at?: number; id?: string }>;
  label?: string;
  /**
   * The line as the image draws it: its corner points in grid units [x, y], first at `from`, last at
   * `to`. The drawing follows it (squared to right angles); without it the line is routed automatically.
   */
  path?: number[][];
}

export interface SpecPoint {
  tag: string;
  /** Item id, link id ("from-to" or the link's id) or valve id. Omitted → the nearest item to `pos`. */
  on?: string;
  /** Where the sensor sits in the image (grid units [x, y]). */
  pos?: [number, number] | number[];
  /** Or: the side of the item and % along it (left→right / top→bottom). */
  side?: Side | "inside";
  at?: number;
  kind?: "transmitter" | "gauge" | "switch" | "probe";
  /** What it measures, plain words. */
  text?: string;
}

export interface DiagramSpec {
  id: string;
  name: string;
  /** Source image path (draw.mjs fills width / height from it). */
  image?: string | { file?: string; width: number; height: number };
  items: SpecItem[];
  links?: SpecLink[];
  points?: SpecPoint[];
  /**
   * "plant" (default): a side view — machines stand on floors. "schematic": a
   * flow diagram / P&ID / DCS screen — machines keep the places the image
   * gives them (tidied into rows and columns), no floor.
   */
  layout?: "plant" | "schematic";
  /**
   * y (grid units) of every floor line the image draws, when it draws more
   * than one (a two-level plant). Omitted → one floor under the lowest item.
   */
  floors?: number[];
  /** 3D: a known height to scale the model ({ item, metres }). */
  scale?: { item: string; metres: number };
}

/* ------------------------------------------------------------------ */
/* Layout (output of layoutSpec, input of the renderers)               */
/* ------------------------------------------------------------------ */

export type Pt = [number, number];
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LaidItem {
  id: string;
  type: ItemType;
  box: Box;
  label?: string;
  on?: string;
  /** Spool / neck drawn between this item's bottom and its support's top. */
  neck?: Box;
  /** Legs from the box bottom down to this floor y (elevated / free items). */
  legs?: number;
  /** y of the floor it stands on (floor items). */
  floor?: number;
  /** Items of one assembly (touching in the image) share this key; they move as one in 3D. */
  group?: string;
  options: ItemOptions;
}

export interface LaidLink {
  id: string;
  from: string;
  to: string;
  medium: Medium;
  duct: boolean;
  /** Flow name from the spec ("HOT MEAL TO KILN"), written along the longest run. */
  label?: string;
  /** Where the flow name is written (centre), and whether it runs up a vertical run. */
  labelAt?: { x: number; y: number; vertical: boolean };
  pts: Pt[];
  valves: Array<{ id?: string; kind: ValveKind; at: Pt; vertical: boolean }>;
}

export interface LaidPoint {
  tag: string;
  on: string;
  mount: Pt;
  dir: Side | "up" | "down";
  kind: "transmitter" | "gauge" | "switch" | "probe";
  pad: Pt;
  callout: [number, number, "start" | "end"];
  text?: string;
}

export interface LaidLabel {
  text: string;
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  /** Written on the equipment itself (short names on vessels, as "C1" on a cyclone). */
  inside?: boolean;
  /** Callout: leader line from the label to its part (parts of one machine, named beside it). */
  leader?: Pt[];
}

export interface Layout {
  id: string;
  name: string;
  width: number;
  height: number;
  /** Lowest floor line (y). */
  ground: number;
  /** Every floor line: y and its x extent. */
  floors: Array<{ y: number; x1: number; x2: number }>;
  items: LaidItem[];
  links: LaidLink[];
  points: LaidPoint[];
  labels: LaidLabel[];
  /** Machines drawn from their own picture (see TracedGroup). */
  traced: TracedGroup[];
  /** A flow diagram (no floors): the 3D model stands every machine on the ground, the diagram's rows as depth. */
  schematic?: boolean;
  /** Metres per sheet unit (3D). */
  metresPerUnit: number;
  /** Plain-language problems found while laying out (with what to change in the spec). */
  issues: string[];
}
