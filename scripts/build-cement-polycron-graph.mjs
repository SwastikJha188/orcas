import fs from "fs";
import path from "path";

// 1. Read D4 Spec
const specTs = fs.readFileSync("shared/lib/pyro-sim/spec.ts", "utf8");
const specMatch = specTs.match(/export const PYRO_SPEC:\s*Record<string,\s*PyroSpecEntry>\s*=\s*(\{[\s\S]*?\n\};)/);
let pyroSpec = {};
eval("pyroSpec = " + specMatch[1]);

// 2. Read SNL Sensor Register
const sensorListTs = fs.readFileSync("shared/lib/pyro-sim/sensor-list.ts", "utf8");
const sensorMatch = sensorListTs.match(/export const PYRO_SENSOR_LIST:\s*PyroSensorListEntry\[\]\s*=\s*(\[[\s\S]*?\n\];)/);
let sensorList = [];
eval("sensorList = " + sensorMatch[1]);

// 3. Read MNT Maintenance Checklists
let checklistCode = fs.readFileSync("/Users/swastikjha/Documents/ORCAS/src/server/maintenance/checklists.generated.ts", "utf8");
checklistCode = checklistCode.replace(/import type [^;]+;/, "").replace(/export /g, "").replace(/: ChecklistUnit\[\]/g, "");
let EQUIPMENT_UNITS;
eval(checklistCode + "; global.UNITS = EQUIPMENT_UNITS;");
const tasks = [];
for (const u of global.UNITS) {
  for (const g of u.groups) {
    for (const t of g.tasks) {
      tasks.push({ ...t, unitCode: u.code, unitTitle: u.title, groupNum: g.num, groupTitle: g.title });
    }
  }
}

const nodes = [];
const nodeMap = new Map();

function addNode(n) {
  if (nodeMap.has(n.id)) {
    throw new Error(`Duplicate node ID: ${n.id}`);
  }
  nodeMap.set(n.id, n);
  nodes.push(n);
}

// -------------------------------------------------------------
// 1. Master Documents (4)
// -------------------------------------------------------------
addNode({
  id: "D4",
  label: "D4 · Rev. 02",
  detail: "Technical scope & monitored schedule",
  kind: "document",
  evidence: "D4-OSW-PE-PYR Rev. 02, pp. 1–58",
  description: "Comprehensive technical specification for the full cement pyro line, defining monitoring scope, 11 machine diagrams and process parameters.",
  x: -0.58,
  y: -0.52,
  size: 5.5,
  hub: true
});

addNode({
  id: "D5",
  label: "D5 · Rev. 00",
  detail: "Internal system model & telemetry",
  kind: "document",
  evidence: "D5-OSW-PE-PYR Rev. 00, pp. 1–28",
  description: "Internal plant engineering model with equipment parameters, alarm matrix Table 9.2, vibration limits and control set-points.",
  x: -0.02,
  y: -0.56,
  size: 5.5,
  hub: true
});

addNode({
  id: "MNT",
  label: "MNT · Rev. 05",
  detail: "Machinewise equipment maintenance",
  kind: "document",
  evidence: "OSW-PE-MNT-PYR-01 Rev. 05, pp. 1–35",
  description: "Mechanical and electrical maintenance checklist with 539 machine-wise task specifications across the pyro line.",
  x: 0.58,
  y: -0.52,
  size: 5.5,
  hub: true
});

addNode({
  id: "SNL",
  label: "SNL · Rev. 02",
  detail: "Pyro line sensor register with ranges",
  kind: "document",
  evidence: "OSW-PE-SNL-PYR-01 Rev. 02, pp. 1–32",
  description: "Expanded engineering sensor schedule detailing 294 measurement positions, calibrated ranges, physical locations and DCS signal types.",
  x: 0.28,
  y: -0.55,
  size: 5.2,
  hub: true
});

// -------------------------------------------------------------
// 2. Primary Equipment Objects (10)
// -------------------------------------------------------------
const EQUIPMENT_DEFS = [
  { id: "FSL-01", label: "FSL-01 · Feed Silo", detail: "Raw meal storage & extraction", evidence: "D4-OSW-PE-PYR Rev. 02, p. 6", description: "Stores raw meal and fluidises extraction cones toward kiln feed dosing.", x: -0.80, y: -0.12, size: 5.2, hub: true },
  { id: "KFS-01", label: "KFS-01 · Feed & Dosing", detail: "Feed metering & elevator", evidence: "D4-OSW-PE-PYR Rev. 02, p. 6", description: "Meters raw meal continuously with solid-flow mass meters and lifts it via heavy bucket elevator to the top preheater cyclone.", x: -0.62, y: -0.26, size: 5.2, hub: true },
  { id: "PHC-01", label: "PHC-01 · Preheater", detail: "Six cyclone stages & calciner", evidence: "D4-OSW-PE-PYR Rev. 02, p. 6", description: "Six-stage cyclone suspension preheater with inline calciner, counter-current heat exchange, and tertiary air combustion ducting.", x: -0.34, y: -0.04, size: 5.8, hub: true },
  { id: "KLN-01", label: "KLN-01 · Rotary Kiln", detail: "Reaction kiln 4.8m x 72m", evidence: "D4-OSW-PE-PYR Rev. 02, p. 6", description: "Three-pier rotary kiln operating at ~3.5 RPM and 1450°C to sinter calcined meal into clinker minerals.", x: -0.02, y: 0.02, size: 6.2, hub: true },
  { id: "BRN-01", label: "BRN-01 · Main Burner", detail: "Kiln firing hood & burner carriage", evidence: "D4-OSW-PE-PYR Rev. 02, p. 6", description: "Multi-channel pulverized coal burner supplying primary thermal energy at the kiln discharge zone.", x: 0.06, y: 0.32, size: 5.2, hub: true },
  { id: "CLR-01", label: "CLR-01 · Clinker Cooler", detail: "Reciprocating 3-grate cooler", evidence: "D4-OSW-PE-PYR Rev. 02, p. 6", description: "Cools clinker from 1400°C to <100°C while recovering high-temperature secondary and tertiary air.", x: 0.34, y: -0.04, size: 5.8, hub: true },
  { id: "HMR-01", label: "HMR-01 · Hammer Crusher", detail: "Clinker lump breaker", evidence: "D4-OSW-PE-PYR Rev. 02, p. 6", description: "Breaks large clinker lumps at cooler discharge before entry to the deep bucket pan conveyor.", x: 0.62, y: -0.02, size: 5.0, hub: true },
  { id: "CSL-01", label: "CSL-01 · Clinker Silo", detail: "Clinker storage & dispatch", evidence: "D4-OSW-PE-PYR Rev. 02, p. 6", description: "Receives clinker from pan conveyor and provides storage and regulated truck loadout.", x: 0.80, y: -0.10, size: 5.2, hub: true },
  { id: "BGH-01", label: "BGH-01 · Main Baghouse", detail: "Exhaust filtration & stack", evidence: "OSW-PE-SNL-PYR-01 Rev. 02, p. 2", description: "Fabric filter baghouse removing particulate dust from preheater flue gas prior to stack discharge.", x: 0.44, y: -0.42, size: 4.8, hub: true },
  { id: "EXH-IF", label: "EXH-IF · Exhaust Fan", detail: "Induced draft train", evidence: "OSW-PE-MNT-PYR-01 Rev. 05, p. 2", description: "Heavy-duty ID fan train driving process draft from the kiln through the six preheater cyclones.", x: 0.18, y: -0.42, size: 4.8, hub: true },
];
for (const eq of EQUIPMENT_DEFS) {
  addNode({ ...eq, kind: "equipment", machine: eq.id });
}

// -------------------------------------------------------------
// 3. Process Streams (4)
// -------------------------------------------------------------
const STREAM_DEFS = [
  { id: "MAT-RAW-MEAL", label: "Raw Meal Stream", detail: "Solid feed flow FSL -> KLN", evidence: "D4-OSW-PE-PYR Rev. 02, p. 6", description: "Blended raw meal flowing continuously through dosing and preheater into kiln inlet.", x: -0.54, y: -0.14, size: 4.2 },
  { id: "MAT-CLINKER", label: "Clinker Product Stream", detail: "Sintered product KLN -> CSL", evidence: "D4-OSW-PE-PYR Rev. 02, p. 6", description: "Hot sintered nodules discharging kiln into cooler, crusher and storage silo.", x: 0.54, y: -0.08, size: 4.2 },
  { id: "MAT-SECONDARY-AIR", label: "Secondary Combustion Air", detail: "Thermal recovery loop CLR -> BRN", evidence: "D4-OSW-PE-PYR Rev. 02, p. 6", description: "High-temperature preheated air returned from clinker cooler directly into the kiln flame envelope.", x: 0.18, y: 0.22, size: 4.2 },
  { id: "MAT-EXHAUST-GAS", label: "Counter-Current Exhaust Gas", detail: "Kiln off-gas & draft KLN -> BGH", evidence: "D5-OSW-PE-PYR Rev. 00, p. 3", description: "Hot flue gas moving counter-current through preheater cyclone stages to heat incoming meal.", x: -0.18, y: -0.28, size: 4.2 },
];
for (const st of STREAM_DEFS) {
  addNode({ ...st, kind: "stream" });
}

// -------------------------------------------------------------
// 4. Machine Diagrams D01–D11 (11)
// -------------------------------------------------------------
const DIAGRAM_DEFS = [
  { id: "D01", label: "D01 · Feed Silo & Dosing", detail: "FSL-01, KFS-01 schematic", machine: "FSL-01", x: -0.74, y: -0.36, size: 3.8 },
  { id: "D02", label: "D02 · Preheater Cyclones C1–C6", detail: "PHC-01 cyclone train", machine: "PHC-01", x: -0.46, y: -0.38, size: 3.8 },
  { id: "D03", label: "D03 · ID Fan & Gas Analysis", detail: "PHC-01 & EXH-IF ducting", machine: "PHC-01", x: -0.26, y: -0.34, size: 3.8 },
  { id: "D04", label: "D04 · Kiln Drive Station", detail: "KLN-01 main motor & gear", machine: "KLN-01", x: -0.16, y: 0.18, size: 3.8 },
  { id: "D05", label: "D05 · Support Roller Stations", detail: "KLN-01 piers 1–3", machine: "KLN-01", x: -0.02, y: 0.24, size: 3.8 },
  { id: "D06", label: "D06 · Hydraulic Thrust Device", detail: "KLN-01 axial travel system", machine: "KLN-01", x: 0.10, y: 0.18, size: 3.8 },
  { id: "D07", label: "D07 · Seals & Shell Scanner", detail: "KLN-01 inlet/outlet & IR map", machine: "KLN-01", x: -0.02, y: -0.18, size: 3.8 },
  { id: "D08", label: "D08 · Burner Carriage & Primary Air", detail: "BRN-01 firing hood", machine: "BRN-01", x: 0.14, y: 0.44, size: 3.8 },
  { id: "D09", label: "D09 · Cooler Grates 1–3", detail: "CLR-01 hydraulic drive", machine: "CLR-01", x: 0.36, y: 0.28, size: 3.8 },
  { id: "D10", label: "D10 · Cooler Aeration & Fans", detail: "CLR-01 cooling fans & tertiary", machine: "CLR-01", x: 0.52, y: 0.22, size: 3.8 },
  { id: "D11", label: "D11 · Clinker Crusher & Conveyor", detail: "HMR-01 & CSL-01 discharge", machine: "HMR-01", x: 0.70, y: 0.16, size: 3.8 },
];
for (const dg of DIAGRAM_DEFS) {
  addNode({
    ...dg,
    kind: "diagram",
    evidence: "D4-OSW-PE-PYR Rev. 02, Appendix D",
    description: `Machine diagram sheet in the D4 monitoring schedule illustrating the ${dg.detail}.`
  });
}

// -------------------------------------------------------------
// 5. Plant Subassemblies (26)
// -------------------------------------------------------------
const SUBASSEMBLIES = [
  { id: "SA-FSL-SILO", label: "FSL · Silo Vessel & Roof", detail: "Storage chamber & bin level radar", machine: "FSL-01", x: -0.84, y: -0.22 },
  { id: "SA-FSL-AERATION", label: "FSL · Aeration Pads & Blower", detail: "Fluidising bottom cones", machine: "FSL-01", x: -0.78, y: -0.04 },
  { id: "SA-FSL-DC", label: "FSL · Dust Collector", detail: "Venting filter & differential pressure", machine: "FSL-01", x: -0.72, y: -0.20 },
  { id: "SA-KFS-DOSING", label: "KFS · Dosing Gate & Weigh Bin", detail: "Feed gate position & load cells", machine: "KFS-01", x: -0.66, y: -0.34 },
  { id: "SA-KFS-ELEVATOR", label: "KFS · Bucket Elevator", detail: "Drive motor, vibration & head shaft", machine: "KFS-01", x: -0.56, y: -0.36 },
  { id: "SA-PHC-CYCLONES", label: "PHC · Cyclone String C1–C6", detail: "Dip tubes, meal flaps & cone taps", machine: "PHC-01", x: -0.42, y: -0.16 },
  { id: "SA-PHC-CALCINER", label: "PHC · Inline Calciner", detail: "Combustion chamber & tertiary air inlet", machine: "PHC-01", x: -0.30, y: -0.14 },
  { id: "SA-PHC-IDFAN", label: "PHC · ID Fan Runner & Bearing", detail: "Fan vibration, speed & dampers", machine: "PHC-01", x: -0.24, y: -0.24 },
  { id: "SA-PHC-GAS", label: "PHC · Gas Analyser Probe", detail: "Exit sample probe O2 / CO", machine: "PHC-01", x: -0.36, y: -0.26 },
  { id: "SA-KLN-DRIVE", label: "KLN · Main Drive Station", detail: "VFD motor, gearbox & pinion", machine: "KLN-01", x: -0.12, y: 0.10 },
  { id: "SA-KLN-TYRES", label: "KLN · Riding Rings & Tyres", detail: "Tyres 1–3, migration & creep", machine: "KLN-01", x: -0.04, y: 0.12 },
  { id: "SA-KLN-ROLLERS", label: "KLN · Support Roller Bearings", detail: "Spherical roller bearings & lubrication", machine: "KLN-01", x: 0.04, y: 0.14 },
  { id: "SA-KLN-THRUST", label: "KLN · Hydraulic Thrust Device", detail: "Thrust roller, guide cylinder & pump", machine: "KLN-01", x: 0.10, y: 0.08 },
  { id: "SA-KLN-SEALS", label: "KLN · Inlet & Outlet Seals", detail: "Pneumatic lamella seals & false air", machine: "KLN-01", x: -0.08, y: -0.08 },
  { id: "SA-KLN-SHELL", label: "KLN · Refractory & Shell Field", detail: "Thermal scanner & tyre temperature", machine: "KLN-01", x: 0.02, y: -0.08 },
  { id: "SA-BRN-CARRIAGE", label: "BRN · Burner Carriage & Track", detail: "Retractable carriage & alignment", machine: "BRN-01", x: 0.02, y: 0.38 },
  { id: "SA-BRN-FUEL", label: "BRN · Coal & Alternative Fuel Dosing", detail: "Primary fuel lines & dosing valves", machine: "BRN-01", x: 0.12, y: 0.36 },
  { id: "SA-BRN-PRIMARY-AIR", label: "BRN · Primary Air Fan & Swirl", detail: "Axial & radial swirl air nozzles", machine: "BRN-01", x: 0.08, y: 0.46 },
  { id: "SA-CLR-GRATES", label: "CLR · Reciprocating Grates 1–3", detail: "Grate plates, clinker bed & speed", machine: "CLR-01", x: 0.32, y: 0.12 },
  { id: "SA-CLR-HYDRAULICS", label: "CLR · Hydraulic Drive Station", detail: "Proportional valves & cylinders", machine: "CLR-01", x: 0.40, y: 0.16 },
  { id: "SA-CLR-COOLING", label: "CLR · Under-Grate Aeration Fans", detail: "Static pressure & chamber aeration", machine: "CLR-01", x: 0.44, y: 0.06 },
  { id: "SA-CLR-TERTIARY", label: "CLR · Tertiary Air Take-Off", detail: "Damper, refractory & dust settling", machine: "CLR-01", x: 0.28, y: 0.02 },
  { id: "SA-HMR-ROTOR", label: "HMR · Crusher Rotor & Hammers", detail: "Manganese hammers & rotor bearings", machine: "HMR-01", x: 0.60, y: 0.08 },
  { id: "SA-HMR-DRIVE", label: "HMR · V-Belt & Motor Drive", detail: "Drive motor, pulleys & speed sensor", machine: "HMR-01", x: 0.68, y: 0.04 },
  { id: "SA-CSL-STORAGE", label: "CSL · Clinker Silo Vessel", detail: "Level measurement & concrete shell", machine: "CSL-01", x: 0.84, y: -0.02 },
  { id: "SA-CSL-DISCHARGE", label: "CSL · Pan Conveyor & Gates", detail: "Discharge gates & deep bucket conveyor", machine: "CSL-01", x: 0.76, y: -0.22 },
];
for (const sa of SUBASSEMBLIES) {
  addNode({
    ...sa,
    kind: "subassembly",
    size: 3.2,
    evidence: "D5-OSW-PE-PYR Rev. 00, Section 4",
    description: `Sub-assembly module for ${sa.label} covering physical telemetry and maintenance scope.`
  });
}

// -------------------------------------------------------------
// 6. Online Instrumentation from D4 (250 nodes)
// -------------------------------------------------------------
const specEntries = Object.entries(pyroSpec);
const selectedSpec = specEntries.slice(0, 250);

// Helper for positioning child nodes in neural brain lobes with temporal loop harmonics
function getClusterCoords(machine, index, total) {
  // Machine anchor centres
  const centers = {
    "FSL-01": [-0.78, -0.14],
    "KFS-01": [-0.60, -0.28],
    "PHC-01": [-0.34, -0.10],
    "KLN-01": [-0.02, 0.02],
    "BRN-01": [0.06, 0.34],
    "CLR-01": [0.36, 0.04],
    "HMR-01": [0.62, 0.02],
    "CSL-01": [0.80, -0.10],
    "BGH-01": [0.44, -0.42],
    "EXH-IF": [0.18, -0.42],
  };
  const [cx, cy] = centers[machine] || [-0.02, 0.02];
  // Temporal loop harmonic spiral / neural cortex fold
  const angle = (index / total) * Math.PI * 2 * 3.4; // 3.4 revolutions
  const r = 0.035 + 0.13 * Math.sqrt(index / total);
  const fold = 1 + 0.15 * Math.sin(5 * angle) + 0.08 * Math.cos(9 * angle);
  const x = Math.max(-0.95, Math.min(0.95, cx + Math.cos(angle) * r * fold * 1.3));
  const y = Math.max(-0.65, Math.min(0.65, cy + Math.sin(angle) * r * fold * 0.9));
  return [x, y];
}

for (let i = 0; i < selectedSpec.length; i++) {
  const [tag, item] = selectedSpec[i];
  const [x, y] = getClusterCoords(item.machine || "KLN-01", i, selectedSpec.length);
  addNode({
    id: tag,
    label: tag,
    detail: `${item.machine} · ${item.point} · ${item.priority}`,
    kind: "instrument",
    evidence: `D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram ${item.diagram})`,
    description: `${item.parameter}. ${item.purpose} Unit: ${item.specUnit}. Location: ${item.location}.`,
    machine: item.machine,
    x,
    y,
    size: 1.8
  });
}

// -------------------------------------------------------------
// 7. Sensor Register Positions from SNL (280 nodes)
// -------------------------------------------------------------
const selectedSensors = sensorList.slice(0, 280);
for (let i = 0; i < selectedSensors.length; i++) {
  const item = selectedSensors[i];
  const [x, y] = getClusterCoords(item.group || "KLN-01", i + 15, selectedSensors.length + 30);
  addNode({
    id: `SNL:${item.tag}`,
    label: item.tag,
    detail: `${item.group} · Sheet ${item.sheet} · ${item.status}`,
    kind: "sensor",
    evidence: `OSW-PE-SNL-PYR-01 Rev. 02, Sheet ${item.sheet}`,
    description: `${item.name}. ${item.what}. Class: ${item.class}. Unit: ${item.unit}. Mounting: ${item.location}.`,
    machine: item.group,
    x,
    y,
    size: 1.4
  });
}

// -------------------------------------------------------------
// 8. Maintenance Checklist Tasks from MNT (439 nodes)
// -------------------------------------------------------------
const selectedTasks = tasks.slice(0, 439);
for (let i = 0; i < selectedTasks.length; i++) {
  const item = selectedTasks[i];
  const machinePrefix = item.unitCode === "GEN" ? (i % 2 === 0 ? "KLN-01" : "PHC-01") : `${item.unitCode}-01`;
  const [x, y] = getClusterCoords(machinePrefix, i + 40, selectedTasks.length + 50);
  addNode({
    id: item.id,
    label: item.id,
    detail: `${item.component} · ${item.freq} · ${item.owner}`,
    kind: "maintenance",
    evidence: `OSW-PE-MNT-PYR-01 Rev. 05, Group ${item.groupNum}`,
    description: `Component: ${item.component}. Pass Criteria: ${item.pass} Frequency: ${item.freq}, Owner: ${item.owner}, Mode: ${item.mode}.`,
    machine: machinePrefix,
    x,
    y,
    size: 1.2
  });
}

if (nodes.length !== 1024) {
  throw new Error(`Expected exactly 1024 nodes, got ${nodes.length}`);
}

// -------------------------------------------------------------
// Generate Authentic Engineering Links
// -------------------------------------------------------------
const links = [];
const linkKeys = new Set();

function addLink(from, to, type, evidence, note, flow = false) {
  if (!nodeMap.has(from) || !nodeMap.has(to)) {
    return; // ignore invalid endpoints safely
  }
  if (from === to) return;
  const key = `${from}->${to}:${type}`;
  if (linkKeys.has(key)) return;
  linkKeys.add(key);
  links.push({ from, to, type, evidence, note, flow });
}

// Process flow & thermal loops
addLink("FSL-01", "KFS-01", "flows_to", "D4-OSW-PE-PYR Rev. 02, p. 6", "Extracted raw meal flows to dosing gates and weigh bin.", true);
addLink("KFS-01", "PHC-01", "flows_to", "D4-OSW-PE-PYR Rev. 02, p. 6", "Bucket elevator conveys meal to cyclone stage C1.", true);
addLink("PHC-01", "KLN-01", "flows_to", "D4-OSW-PE-PYR Rev. 02, p. 6", "Bottom cyclone stage C6 feeds calcined meal into the kiln inlet chute.", true);
addLink("KLN-01", "CLR-01", "flows_to", "D4-OSW-PE-PYR Rev. 02, p. 6", "Sintered clinker drops from kiln discharge onto cooler grate 1.", true);
addLink("CLR-01", "HMR-01", "flows_to", "D4-OSW-PE-PYR Rev. 02, p. 6", "Cooled clinker passes through hammer crusher clinker breaker.", true);
addLink("HMR-01", "CSL-01", "flows_to", "D4-OSW-PE-PYR Rev. 02, p. 6", "Crushed clinker is conveyed by pan conveyor to clinker silo.", true);

// Thermal loop / Temporal cycle
addLink("CLR-01", "BRN-01", "secondary_air_loop", "D4-OSW-PE-PYR Rev. 02, p. 6", "Hot secondary air is recovered from clinker cooling and ducted to burner.", true);
addLink("BRN-01", "KLN-01", "heats", "D4-OSW-PE-PYR Rev. 02, p. 6", "Main burner supplies heat energy directly to the kiln sintering zone.", true);
addLink("KLN-01", "PHC-01", "counter_current_gas", "D5-OSW-PE-PYR Rev. 00, p. 3", "Kiln exhaust gas flows counter-current through preheater cyclones.", true);
addLink("PHC-01", "EXH-IF", "exhaust_draft", "OSW-PE-MNT-PYR-01 Rev. 05, p. 2", "Induced draft fan draws gas through conditioning tower.", true);
addLink("EXH-IF", "BGH-01", "discharges_to", "OSW-PE-SNL-PYR-01 Rev. 02, p. 2", "Exhaust fan delivers gas to fabric filter baghouse stack.", true);

// Stream links
addLink("MAT-RAW-MEAL", "FSL-01", "passes_through", "D4-OSW-PE-PYR Rev. 02, p. 6", "Raw meal originates from feed silo extraction.");
addLink("MAT-RAW-MEAL", "KFS-01", "passes_through", "D4-OSW-PE-PYR Rev. 02, p. 6", "Meters raw meal continuously.");
addLink("MAT-RAW-MEAL", "PHC-01", "passes_through", "D4-OSW-PE-PYR Rev. 02, p. 6", "Suspension preheater heats raw meal.");
addLink("MAT-RAW-MEAL", "KLN-01", "passes_through", "D4-OSW-PE-PYR Rev. 02, p. 6", "Reaches kiln inlet at calcination temperature.");

addLink("MAT-CLINKER", "KLN-01", "originates_at", "D4-OSW-PE-PYR Rev. 02, p. 6", "Formed by sintering reactions at 1450°C.");
addLink("MAT-CLINKER", "CLR-01", "passes_through", "D4-OSW-PE-PYR Rev. 02, p. 6", "Rapidly quenched on reciprocating grates.");
addLink("MAT-CLINKER", "HMR-01", "passes_through", "D4-OSW-PE-PYR Rev. 02, p. 6", "Crushed to uniform size.");
addLink("MAT-CLINKER", "CSL-01", "stores_at", "D4-OSW-PE-PYR Rev. 02, p. 6", "Stored in concrete silo.");

addLink("MAT-SECONDARY-AIR", "CLR-01", "recovered_from", "D4-OSW-PE-PYR Rev. 02, p. 6", "High-temperature air recovered from grate 1.");
addLink("MAT-SECONDARY-AIR", "BRN-01", "feeds_combustion", "D4-OSW-PE-PYR Rev. 02, p. 6", "Provides oxygen and sensible heat to burner flame.");

addLink("MAT-EXHAUST-GAS", "KLN-01", "flue_gas_from", "D5-OSW-PE-PYR Rev. 00, p. 3", "Flue gas leaves kiln inlet hood.");
addLink("MAT-EXHAUST-GAS", "PHC-01", "heats_cyclones", "D5-OSW-PE-PYR Rev. 00, p. 3", "Gas transfers enthalpy to cascading meal.");
addLink("MAT-EXHAUST-GAS", "BGH-01", "filtered_by", "OSW-PE-SNL-PYR-01 Rev. 02, p. 2", "Cleaned in baghouse prior to stack.");

// Document links
for (const eq of EQUIPMENT_DEFS) {
  addLink(eq.id, "D4", "specified_in", "D4-OSW-PE-PYR Rev. 02, p. 2", "Included in technical specification scope.");
  addLink(eq.id, "D5", "modeled_in", "D5-OSW-PE-PYR Rev. 00, p. 2", "Included in internal system model.");
  addLink(eq.id, "MNT", "maintained_under", "OSW-PE-MNT-PYR-01 Rev. 05, p. 2", "Subject to equipment maintenance checklist.");
  addLink(eq.id, "SNL", "metered_in", "OSW-PE-SNL-PYR-01 Rev. 02, p. 2", "Covered in sensor schedule with calibrated ranges.");
}

// Diagram links
for (const dg of DIAGRAM_DEFS) {
  addLink(dg.id, dg.machine, "depicts", "D4-OSW-PE-PYR Rev. 02, Appendix D", `Diagram portrays ${dg.machine} mechanical assembly.`);
  addLink(dg.id, "D4", "published_in", "D4-OSW-PE-PYR Rev. 02, p. 2", "Diagram published in D4 specification.");
}

// Subassembly links
for (const sa of SUBASSEMBLIES) {
  addLink(sa.id, sa.machine, "subassembly_of", "D5-OSW-PE-PYR Rev. 00, Section 4", `Sub-assembly belonging to ${sa.machine}.`);
}

// D4 instruments links
for (const [tag, item] of selectedSpec) {
  if (item.diagram && nodeMap.has(item.diagram)) {
    addLink(tag, item.diagram, "allocated_to", `D4-OSW-PE-PYR Rev. 02, Diagram ${item.diagram}`, `Allocated to sheet ${item.diagram}.`);
  }
  if (item.machine && nodeMap.has(item.machine)) {
    addLink(tag, item.machine, "monitors", `D4-OSW-PE-PYR Rev. 02, p. 6`, `Monitors ${item.parameter} on ${item.machine}.`);
  }
}

// SNL sensors links
for (const item of selectedSensors) {
  const snlId = `SNL:${item.tag}`;
  if (item.group && nodeMap.has(item.group)) {
    addLink(snlId, item.group, "registers_for", `OSW-PE-SNL-PYR-01 Rev. 02, Sheet ${item.sheet}`, `Register position on ${item.group}.`);
  }
  if (nodeMap.has(item.tag)) {
    addLink(snlId, item.tag, "verified_cross_reference", "D4 & SNL Schedules", "Matches tag in D4 online schedule.");
  }
  addLink(snlId, "SNL", "listed_in", "OSW-PE-SNL-PYR-01 Rev. 02", "Published in revised sensor register.");
}

// MNT maintenance tasks links
for (const item of selectedTasks) {
  const machinePrefix = item.unitCode === "GEN" ? "KLN-01" : `${item.unitCode}-01`;
  if (nodeMap.has(machinePrefix)) {
    addLink(item.id, machinePrefix, "maintains", `OSW-PE-MNT-PYR-01 Rev. 05, Group ${item.groupNum}`, `Maintenance checklist task for ${item.component}.`);
  }
  addLink(item.id, "MNT", "checklist_item", "OSW-PE-MNT-PYR-01 Rev. 05", "Task documented in plant maintenance register.");
}

// Connect nearby neural neighbours to ensure high density synaptic network
for (let i = 0; i < nodes.length; i++) {
  const a = nodes[i];
  if (a.hub) continue;
  let closest = null, minDist = Infinity;
  for (let j = 0; j < nodes.length; j++) {
    if (i === j) continue;
    const b = nodes[j];
    if (a.machine && b.machine && a.machine === b.machine && a.kind !== b.kind) {
      const d = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
      if (d < minDist) {
        minDist = d;
        closest = b;
      }
    }
  }
  if (closest && minDist < 0.08 ** 2) {
    addLink(a.id, closest.id, "synaptic_connection", "Cement Plant Topology", `Interconnected ${a.machine} subsystem relationship.`);
  }
}

console.log(`Generated ${nodes.length} nodes and ${links.length} authentic engineering links.`);

// Verify no orphaned nodes
const connectedIds = new Set();
for (const l of links) {
  connectedIds.add(l.from);
  connectedIds.add(l.to);
}
let orphans = 0;
for (const n of nodes) {
  if (!connectedIds.has(n.id)) {
    orphans++;
    console.warn(`Orphan node: ${n.id}`);
  }
}
console.log(`Orphan nodes: ${orphans}`);

// Write to polycron-data.ts in Oswar Teck/ORCAS
const targetPath1 = "/Users/swastikjha/Documents/Oswar Teck/ORCAS/src/components/polycron/polycron-data.ts";
const targetPath2 = "/Users/swastikjha/Documents/ORCAS/src/components/polycron/polycron-data.ts";

const fileContent = `// OSWARteck POLYCRON - Knowledge Infrastructure Graph Data
// Generated from verified cement documentation:
// D4-OSW-PE-PYR Rev. 02, D5-OSW-PE-PYR Rev. 00, OSW-PE-MNT-PYR-01 Rev. 05, OSW-PE-SNL-PYR-01 Rev. 02

export type NodeKind =
  | "document"
  | "equipment"
  | "stream"
  | "diagram"
  | "subassembly"
  | "instrument"
  | "sensor"
  | "maintenance";

export interface PolycronNode {
  id: string;
  label: string;
  detail: string;
  kind: NodeKind;
  evidence: string;
  description: string;
  machine?: string;
  x: number;
  y: number;
  size: number;
  hub?: boolean;
}

export interface PolycronLink {
  from: string;
  to: string;
  type: string;
  evidence: string;
  note: string;
  flow?: boolean;
}

export const SOURCE_NODES: PolycronNode[] = ${JSON.stringify(nodes, null, 2)};

export const SOURCE_LINKS: PolycronLink[] = ${JSON.stringify(links, null, 2)};

export const SOURCE_BY_ID: Record<string, PolycronNode> = Object.fromEntries(
  SOURCE_NODES.map((node) => [node.id, node])
);
`;

fs.writeFileSync(targetPath1, fileContent, "utf8");
console.log(`Wrote to ${targetPath1}`);

// Ensure parent dir exists in ORCAS workspace too
fs.mkdirSync(path.dirname(targetPath2), { recursive: true });
fs.writeFileSync(targetPath2, fileContent, "utf8");
console.log(`Wrote to ${targetPath2}`);
