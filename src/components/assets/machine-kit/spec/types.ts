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
  /** Draw this item from its silhouette traced in the image (always on for "machine"). */
  trace?: boolean;
  /** Shape parts (block, cylinder, cone, tool, fixture): turned by this many degrees, clockwise. */
  angle?: number;
  /** Shape parts: paint — "raised" (cover, plate), "recess" (opening, window, screen), "material" (product), "body" (default). */
  tone?: "body" | "raised" | "recess" | "material";
  /** cone: which end is narrow. */
  narrow?: "top" | "bottom" | "left" | "right";
}

/** Silhouette traced from the image (box-relative 0–1): outline polygon and inner edge polylines. */
export interface Trace {
  outline: Pt[];
  /** Open pockets inside the outline (a C-frame's throat). */
  holes?: Pt[][];
  lines: Pt[][];
  /** Distinct regions inside it: darker = recessed opening, lighter = raised plate. */
  regions?: Array<{ tone: "recess" | "raised"; poly: Pt[] }>;
  /** Round features [u, v, radius as a share of the box width]. */
  circles?: Array<[number, number, number]>;
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
  options: ItemOptions;
  /** Its own silhouette from the image (items without a catalog part). */
  trace?: Trace;
}

export interface LaidLink {
  id: string;
  from: string;
  to: string;
  medium: Medium;
  duct: boolean;
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
  /** Metres per sheet unit (3D). */
  metresPerUnit: number;
  /** Plain-language problems found while laying out (with what to change in the spec). */
  issues: string[];
}
