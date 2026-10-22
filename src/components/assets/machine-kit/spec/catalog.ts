/**
 * Item types a diagram spec may use: what each is, the words that map to it,
 * how it stands, its sensible proportions and where lines may connect. The
 * skill's catalog table (.claude/skills/machine-diagram-2d/SKILL.md) lists the
 * same types; keep both in step.
 */
import type { ItemType, Medium, Side } from "./types";

export interface TypeInfo {
  /** Plain name. */
  name: string;
  /** Words in an image or a model's answer that mean this type. */
  aliases: string[];
  /** Stands on the floor unless mounted on another item. */
  floor: boolean;
  /** Allowed width / height range of its box. */
  aspect: [number, number];
  /** Sides lines may leave from (floor items never use the bottom). */
  ports: Side[];
  /** Typical overall height in metres (3D scale guess). */
  metres: number;
  /** Depth as a share of width (3D). */
  depth: number;
  /** Can hold another item on top. */
  support: boolean;
  /** Draws contents / a sensor inside (inside mounts allowed). */
  hollow?: boolean;
}

const all: Side[] = ["top", "left", "right", "bottom"];
const sidesTop: Side[] = ["top", "left", "right"];

export const CATALOG: Record<ItemType, TypeInfo> = {
  cabinet: { name: "Control cabinet", aliases: ["control cabinet", "control panel", "panel", "mcc", "plc", "vfd", "drive panel", "electrical cabinet", "switchboard", "hmi", "control box", "enclosure"], floor: true, aspect: [0.3, 1.8], ports: sidesTop, metres: 2.0, depth: 0.5, support: true },
  generator: { name: "Generator / power unit", aliases: ["generator", "induction generator", "power supply", "power unit", "transformer", "rectifier", "inverter", "ups", "converter", "power pack"], floor: true, aspect: [0.8, 2.4], ports: sidesTop, metres: 1.4, depth: 0.7, support: true },
  motor: { name: "Electric motor", aliases: ["motor", "electric motor", "drive motor"], floor: true, aspect: [1.1, 2.4], ports: sidesTop, metres: 0.6, depth: 0.7, support: false },
  gearbox: { name: "Gearbox", aliases: ["gearbox", "gear box", "reducer", "gear reducer", "gear unit"], floor: true, aspect: [0.8, 1.8], ports: sidesTop, metres: 0.8, depth: 0.8, support: false },
  drive: { name: "Motor + gearbox drive", aliases: ["drive", "drive unit", "motor gearbox", "geared motor", "main drive"], floor: true, aspect: [1.6, 4], ports: sidesTop, metres: 0.9, depth: 0.6, support: false },
  pump: { name: "Pump with motor", aliases: ["pump", "centrifugal pump", "water pump", "feed pump", "circulation pump", "pump set"], floor: true, aspect: [1.4, 3.6], ports: sidesTop, metres: 0.8, depth: 0.5, support: false },
  "vacuum-pump": { name: "Vacuum pump with motor", aliases: ["vacuum pump", "vacuum unit", "rotary vane pump", "roots pump", "blower pump"], floor: true, aspect: [1.4, 3.6], ports: sidesTop, metres: 0.9, depth: 0.5, support: false },
  fan: { name: "Fan with motor", aliases: ["fan", "blower", "id fan", "fd fan", "exhaust fan", "centrifugal fan", "ventilator"], floor: true, aspect: [1.2, 2.8], ports: sidesTop, metres: 1.6, depth: 0.5, support: false },
  compressor: { name: "Compressor", aliases: ["compressor", "air compressor", "screw compressor"], floor: true, aspect: [1.0, 2.6], ports: sidesTop, metres: 1.4, depth: 0.6, support: false },
  tank: { name: "Tank / vessel", aliases: ["tank", "vessel", "reactor", "receiver", "column", "water tank", "storage tank", "accumulator"], floor: true, aspect: [0.2, 1.4], ports: all, metres: 4, depth: 1, support: true, hollow: true },
  silo: { name: "Silo / bin", aliases: ["silo", "bin", "bunker", "feed silo", "storage silo"], floor: true, aspect: [0.2, 1.0], ports: all, metres: 12, depth: 1, support: true, hollow: true },
  hopper: { name: "Hopper / chute", aliases: ["hopper", "chute", "funnel", "feed hopper"], floor: false, aspect: [0.6, 2.5], ports: ["top", "bottom", "left", "right"], metres: 1.5, depth: 1, support: false },
  "horizontal-tank": { name: "Horizontal tank", aliases: ["horizontal tank", "horizontal vessel", "drum tank", "boiler", "autoclave", "air receiver"], floor: true, aspect: [1.5, 5], ports: all, metres: 2, depth: 0.4, support: true, hollow: true },
  cyclone: { name: "Cyclone", aliases: ["cyclone", "separator", "cyclone separator"], floor: false, aspect: [0.3, 0.8], ports: ["top", "bottom", "left", "right"], metres: 5, depth: 1, support: false },
  stack: { name: "Stack / chimney", aliases: ["stack", "chimney", "exhaust stack", "flue"], floor: true, aspect: [0.05, 0.4], ports: ["left", "right"], metres: 25, depth: 1, support: false },
  "gas-cylinder": { name: "Gas cylinder", aliases: ["gas cylinder", "gas bottle", "gas supply", "cylinder bottle", "argon", "nitrogen bottle", "oxygen bottle"], floor: true, aspect: [0.15, 0.45], ports: ["top"], metres: 1.5, depth: 1, support: false },
  chamber: { name: "Process chamber / furnace", aliases: ["chamber", "furnace", "oven", "vacuum chamber", "melting chamber", "flask chamber", "kiln box", "autoclave chamber", "casting chamber", "heater"], floor: true, aspect: [0.4, 2.5], ports: all, metres: 1.8, depth: 0.9, support: true, hollow: true },
  drum: { name: "Rotary drum / kiln / mill", aliases: ["drum", "rotary kiln", "kiln", "dryer", "ball mill", "mill", "rotary drum", "cooler drum", "trommel"], floor: true, aspect: [2, 12], ports: all, metres: 4, depth: 0.5, support: false, hollow: true },
  conveyor: { name: "Conveyor", aliases: ["conveyor", "belt conveyor", "screw conveyor", "auger", "air slide", "drag chain", "belt"], floor: false, aspect: [2.5, 60], ports: ["left", "right", "top"], metres: 1, depth: 0.1, support: false },
  "bucket-elevator": { name: "Bucket elevator", aliases: ["bucket elevator", "elevator"], floor: true, aspect: [0.06, 0.4], ports: ["top", "left", "right"], metres: 20, depth: 1, support: false },
  filter: { name: "Bag filter / dust collector", aliases: ["filter", "bag filter", "baghouse", "dust collector", "esp", "precipitator", "scrubber"], floor: true, aspect: [0.5, 1.6], ports: sidesTop, metres: 8, depth: 1, support: false },
  "heat-exchanger": { name: "Heat exchanger", aliases: ["heat exchanger", "exchanger", "condenser", "plate heat exchanger", "intercooler"], floor: true, aspect: [1.2, 4], ports: all, metres: 1.2, depth: 0.4, support: false },
  "cooling-unit": { name: "Cooling unit / chiller", aliases: ["cooling unit", "chiller", "cooling pump", "cooling loop", "cooling skid", "radiator", "cooling tower", "dry cooler"], floor: true, aspect: [1.1, 3.4], ports: sidesTop, metres: 1.4, depth: 0.6, support: false },
  actuator: { name: "Actuator / cylinder", aliases: ["actuator", "cylinder actuator", "pneumatic cylinder", "hydraulic cylinder", "sealing rod actuator", "ram", "piston", "linear actuator"], floor: false, aspect: [0.12, 0.7], ports: ["left", "right", "top"], metres: 0.8, depth: 1, support: false },
  valve: { name: "Valve (on a line)", aliases: ["valve", "solenoid valve", "control valve", "gate valve", "ball valve", "regulator", "check valve", "damper"], floor: false, aspect: [0.5, 2], ports: ["left", "right"], metres: 0.3, depth: 1, support: false },
  "hydraulic-unit": { name: "Hydraulic / lube unit", aliases: ["hydraulic unit", "hpu", "hydraulic power unit", "lube unit", "lubrication unit", "oil skid", "grease unit"], floor: true, aspect: [0.9, 2.4], ports: sidesTop, metres: 1.3, depth: 0.6, support: false },
  crusher: { name: "Crusher", aliases: ["crusher", "jaw crusher", "hammer crusher", "breaker", "shredder", "grinder"], floor: true, aspect: [0.6, 1.8], ports: all, metres: 3, depth: 0.9, support: false },
  mixer: { name: "Mixer", aliases: ["mixer", "blender", "agitator tank", "kneader"], floor: true, aspect: [0.6, 2.2], ports: all, metres: 2.4, depth: 0.8, support: false, hollow: true },
  press: { name: "Press", aliases: ["press", "hydraulic press", "stamping press", "forging press"], floor: true, aspect: [0.4, 1.4], ports: sidesTop, metres: 4, depth: 0.7, support: false },
  extruder: { name: "Extruder", aliases: ["extruder", "injection unit", "screw barrel", "injection moulding"], floor: true, aspect: [2, 7], ports: all, metres: 1.6, depth: 0.4, support: false },
  burner: { name: "Burner", aliases: ["burner", "main burner", "torch", "combustor"], floor: false, aspect: [1.5, 6], ports: ["left", "right", "top"], metres: 0.6, depth: 0.4, support: false },
  screen: { name: "Vibrating screen", aliases: ["screen", "vibrating screen", "sieve", "classifier", "separator screen"], floor: true, aspect: [1.2, 4], ports: all, metres: 1.8, depth: 0.6, support: false },
  frame: { name: "Steel structure", aliases: ["frame", "structure", "tower", "rack", "support frame", "mezzanine", "platform", "skid"], floor: true, aspect: [0.1, 10], ports: [], metres: 6, depth: 1, support: true },
  "rotary-valve": { name: "Rotary valve / airlock", aliases: ["rotary valve", "rotary airlock", "airlock", "rotary feeder", "star valve", "cellular wheel", "flap valve", "double flap"], floor: false, aspect: [0.6, 1.6], ports: ["top", "bottom", "left", "right"], metres: 0.8, depth: 1, support: false },
  block: { name: "Machine part (solid block)", aliases: ["block", "body", "base", "bed", "arm", "beam", "c frame", "crossbar", "housing", "structure part", "bracket", "plate"], floor: true, aspect: [0.05, 20], ports: all, metres: 1, depth: 0.6, support: true },
  cylinder: { name: "Round part (spindle, roll, shaft housing)", aliases: ["cylinder", "spindle", "spindle head", "roll", "roller", "shaft", "quill", "sleeve", "round housing", "drum end"], floor: false, aspect: [0.1, 10], ports: all, metres: 0.5, depth: 1, support: true },
  table: { name: "Machine table / work bed", aliases: ["table", "work table", "worktable", "bed plate", "slide table"], floor: true, aspect: [0.8, 20], ports: all, metres: 0.9, depth: 0.6, support: true },
  fixture: { name: "Clamp / vise / fixture", aliases: ["fixture", "clamp", "vise", "vice", "chuck", "jig", "holder"], floor: false, aspect: [0.3, 8], ports: all, metres: 0.2, depth: 0.8, support: true },
  workpiece: { name: "Workpiece / product", aliases: ["workpiece", "work piece", "part", "product", "blank", "billet", "casting", "mould", "mold"], floor: false, aspect: [0.1, 10], ports: all, metres: 0.2, depth: 0.8, support: false, hollow: true },
  tool: { name: "Cutting tool / nozzle", aliases: ["tool", "cutting tool", "cutter", "drill", "bit", "milling cutter", "nozzle", "electrode", "blade", "punch"], floor: false, aspect: [0.1, 10], ports: ["top", "left", "right"], metres: 0.15, depth: 1, support: false },
  wheel: { name: "Round face (wheel, pulley, flywheel, roller end, dial)", aliases: ["wheel", "pulley", "flywheel", "sheave", "roller end", "dial", "disc", "gear wheel", "sprocket", "drum face", "handwheel"], floor: false, aspect: [0.6, 1.6], ports: all, metres: 0.6, depth: 0.3, support: true },
  cone: { name: "Tapered part (cone, funnel, nozzle, transition)", aliases: ["cone", "taper", "tapered", "funnel part", "nozzle cone", "transition", "reducer piece", "frustum"], floor: false, aspect: [0.15, 6], ports: all, metres: 0.8, depth: 1, support: true },
  pile: { name: "Loose material heap", aliases: ["pile", "stockpile", "stock pile", "heap", "material pile", "spill", "mound"], floor: true, aspect: [1, 6], ports: ["top", "left", "right"], metres: 4, depth: 1, support: false },
  machine: { name: "Other machine", aliases: ["machine", "unit", "equipment", "device", "module", "station", "robot", "cnc", "packer"], floor: true, aspect: [0.25, 4], ports: all, metres: 1.8, depth: 0.7, support: true },
};

export const ITEM_TYPES = Object.keys(CATALOG) as ItemType[];

const words = (s: string) => s.toLowerCase().replace(/[_-]+/g, " ").replace(/[^a-z0-9 ]+/g, "").replace(/\s+/g, " ").trim();

/** Best type for a model's word ("Vacuum Pump", "control_panel", "pumpset"); null when nothing is close. */
export function matchType(raw: string): ItemType | null {
  const w = words(raw);
  if (!w) return null;
  if ((ITEM_TYPES as string[]).includes(w.replace(/ /g, "-"))) return w.replace(/ /g, "-") as ItemType;
  let best: { t: ItemType; score: number } | null = null;
  for (const t of ITEM_TYPES) {
    for (const a of [t.replace(/-/g, " "), ...CATALOG[t].aliases]) {
      const score = w === a ? 100 : w.replace(/ /g, "") === a.replace(/ /g, "") ? 95 : w.includes(a) ? 50 + a.length : a.includes(w) && w.length >= 4 ? 30 + w.length : 0;
      if (score && (!best || score > best.score)) best = { t, score };
    }
  }
  return best?.t ?? null;
}

export const MEDIA: Medium[] = ["material", "hot-gas", "gas", "air", "water", "steam", "oil", "vacuum", "power", "signal"];

const MEDIUM_WORDS: Array<[Medium, string[]]> = [
  ["signal", ["signal", "control", "data", "comms", "communication", "network", "instrument", "dashed", "sensor", "io", "plc"]],
  ["power", ["power", "electric", "electrical", "cable", "busbar", "bus bar", "current", "induction", "supply cable", "rf", "lead"]],
  ["vacuum", ["vacuum", "suction line", "evacuation"]],
  ["hot-gas", ["hot gas", "hotgas", "flue", "exhaust", "kiln gas", "combustion gas", "off gas", "fume"]],
  ["water", ["water", "cooling", "coolant", "chilled", "return", "hot water", "glycol"]],
  ["steam", ["steam", "condensate"]],
  ["oil", ["oil", "hydraulic", "lube", "lubricant", "grease", "fuel oil"]],
  ["air", ["air", "compressed air", "instrument air", "ventilation", "tertiary air"]],
  ["gas", ["gas", "argon", "nitrogen", "inert", "oxygen", "natural gas", "lpg", "helium", "co2", "shielding"]],
  ["material", ["material", "product", "meal", "powder", "clinker", "coal", "feed", "melt", "metal", "slurry", "solids", "ore", "grain", "pellets", "flow"]],
];

/** Medium for a model's word ("cooling water", "Argon"). */
export function matchMedium(raw: string): Medium | null {
  const w = words(raw);
  if ((MEDIA as string[]).includes(w.replace(/ /g, "-"))) return w.replace(/ /g, "-") as Medium;
  for (const [m, list] of MEDIUM_WORDS) if (list.some((a) => w === a || w.includes(a))) return m;
  return null;
}
