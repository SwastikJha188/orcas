// OSWARteck POLYCRON - Knowledge Infrastructure Graph Data
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

export const SOURCE_NODES: PolycronNode[] = [
  {
    "id": "D4",
    "label": "D4 · Rev. 02",
    "detail": "Technical scope & monitored schedule",
    "kind": "document",
    "evidence": "D4-OSW-PE-PYR Rev. 02, pp. 1–58",
    "description": "Comprehensive technical specification for the full cement pyro line, defining monitoring scope, 11 machine diagrams and process parameters.",
    "x": -0.58,
    "y": -0.52,
    "size": 5.5,
    "hub": true
  },
  {
    "id": "D5",
    "label": "D5 · Rev. 00",
    "detail": "Internal system model & telemetry",
    "kind": "document",
    "evidence": "D5-OSW-PE-PYR Rev. 00, pp. 1–28",
    "description": "Internal plant engineering model with equipment parameters, alarm matrix Table 9.2, vibration limits and control set-points.",
    "x": -0.02,
    "y": -0.56,
    "size": 5.5,
    "hub": true
  },
  {
    "id": "MNT",
    "label": "MNT · Rev. 05",
    "detail": "Machinewise equipment maintenance",
    "kind": "document",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, pp. 1–35",
    "description": "Mechanical and electrical maintenance checklist with 539 machine-wise task specifications across the pyro line.",
    "x": 0.58,
    "y": -0.52,
    "size": 5.5,
    "hub": true
  },
  {
    "id": "SNL",
    "label": "SNL · Rev. 02",
    "detail": "Pyro line sensor register with ranges",
    "kind": "document",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, pp. 1–32",
    "description": "Expanded engineering sensor schedule detailing 294 measurement positions, calibrated ranges, physical locations and DCS signal types.",
    "x": 0.28,
    "y": -0.55,
    "size": 5.2,
    "hub": true
  },
  {
    "id": "FSL-01",
    "label": "FSL-01 · Feed Silo",
    "detail": "Raw meal storage & extraction",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "description": "Stores raw meal and fluidises extraction cones toward kiln feed dosing.",
    "x": -0.8,
    "y": -0.12,
    "size": 5.2,
    "hub": true,
    "kind": "equipment",
    "machine": "FSL-01"
  },
  {
    "id": "KFS-01",
    "label": "KFS-01 · Feed & Dosing",
    "detail": "Feed metering & elevator",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "description": "Meters raw meal continuously with solid-flow mass meters and lifts it via heavy bucket elevator to the top preheater cyclone.",
    "x": -0.62,
    "y": -0.26,
    "size": 5.2,
    "hub": true,
    "kind": "equipment",
    "machine": "KFS-01"
  },
  {
    "id": "PHC-01",
    "label": "PHC-01 · Preheater",
    "detail": "Six cyclone stages & calciner",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "description": "Six-stage cyclone suspension preheater with inline calciner, counter-current heat exchange, and tertiary air combustion ducting.",
    "x": -0.34,
    "y": -0.04,
    "size": 5.8,
    "hub": true,
    "kind": "equipment",
    "machine": "PHC-01"
  },
  {
    "id": "KLN-01",
    "label": "KLN-01 · Rotary Kiln",
    "detail": "Reaction kiln 4.8m x 72m",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "description": "Three-pier rotary kiln operating at ~3.5 RPM and 1450°C to sinter calcined meal into clinker minerals.",
    "x": -0.02,
    "y": 0.02,
    "size": 6.2,
    "hub": true,
    "kind": "equipment",
    "machine": "KLN-01"
  },
  {
    "id": "BRN-01",
    "label": "BRN-01 · Main Burner",
    "detail": "Kiln firing hood & burner carriage",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "description": "Multi-channel pulverized coal burner supplying primary thermal energy at the kiln discharge zone.",
    "x": 0.06,
    "y": 0.32,
    "size": 5.2,
    "hub": true,
    "kind": "equipment",
    "machine": "BRN-01"
  },
  {
    "id": "CLR-01",
    "label": "CLR-01 · Clinker Cooler",
    "detail": "Reciprocating 3-grate cooler",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "description": "Cools clinker from 1400°C to <100°C while recovering high-temperature secondary and tertiary air.",
    "x": 0.34,
    "y": -0.04,
    "size": 5.8,
    "hub": true,
    "kind": "equipment",
    "machine": "CLR-01"
  },
  {
    "id": "HMR-01",
    "label": "HMR-01 · Hammer Crusher",
    "detail": "Clinker lump breaker",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "description": "Breaks large clinker lumps at cooler discharge before entry to the deep bucket pan conveyor.",
    "x": 0.62,
    "y": -0.02,
    "size": 5,
    "hub": true,
    "kind": "equipment",
    "machine": "HMR-01"
  },
  {
    "id": "CSL-01",
    "label": "CSL-01 · Clinker Silo",
    "detail": "Clinker storage & dispatch",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "description": "Receives clinker from pan conveyor and provides storage and regulated truck loadout.",
    "x": 0.8,
    "y": -0.1,
    "size": 5.2,
    "hub": true,
    "kind": "equipment",
    "machine": "CSL-01"
  },
  {
    "id": "BGH-01",
    "label": "BGH-01 · Main Baghouse",
    "detail": "Exhaust filtration & stack",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, p. 2",
    "description": "Fabric filter baghouse removing particulate dust from preheater flue gas prior to stack discharge.",
    "x": 0.44,
    "y": -0.42,
    "size": 4.8,
    "hub": true,
    "kind": "equipment",
    "machine": "BGH-01"
  },
  {
    "id": "EXH-IF",
    "label": "EXH-IF · Exhaust Fan",
    "detail": "Induced draft train",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, p. 2",
    "description": "Heavy-duty ID fan train driving process draft from the kiln through the six preheater cyclones.",
    "x": 0.18,
    "y": -0.42,
    "size": 4.8,
    "hub": true,
    "kind": "equipment",
    "machine": "EXH-IF"
  },
  {
    "id": "MAT-RAW-MEAL",
    "label": "Raw Meal Stream",
    "detail": "Solid feed flow FSL -> KLN",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "description": "Blended raw meal flowing continuously through dosing and preheater into kiln inlet.",
    "x": -0.54,
    "y": -0.14,
    "size": 4.2,
    "kind": "stream"
  },
  {
    "id": "MAT-CLINKER",
    "label": "Clinker Product Stream",
    "detail": "Sintered product KLN -> CSL",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "description": "Hot sintered nodules discharging kiln into cooler, crusher and storage silo.",
    "x": 0.54,
    "y": -0.08,
    "size": 4.2,
    "kind": "stream"
  },
  {
    "id": "MAT-SECONDARY-AIR",
    "label": "Secondary Combustion Air",
    "detail": "Thermal recovery loop CLR -> BRN",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "description": "High-temperature preheated air returned from clinker cooler directly into the kiln flame envelope.",
    "x": 0.18,
    "y": 0.22,
    "size": 4.2,
    "kind": "stream"
  },
  {
    "id": "MAT-EXHAUST-GAS",
    "label": "Counter-Current Exhaust Gas",
    "detail": "Kiln off-gas & draft KLN -> BGH",
    "evidence": "D5-OSW-PE-PYR Rev. 00, p. 3",
    "description": "Hot flue gas moving counter-current through preheater cyclone stages to heat incoming meal.",
    "x": -0.18,
    "y": -0.28,
    "size": 4.2,
    "kind": "stream"
  },
  {
    "id": "D01",
    "label": "D01 · Feed Silo & Dosing",
    "detail": "FSL-01, KFS-01 schematic",
    "machine": "FSL-01",
    "x": -0.74,
    "y": -0.36,
    "size": 3.8,
    "kind": "diagram",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D",
    "description": "Machine diagram sheet in the D4 monitoring schedule illustrating the FSL-01, KFS-01 schematic."
  },
  {
    "id": "D02",
    "label": "D02 · Preheater Cyclones C1–C6",
    "detail": "PHC-01 cyclone train",
    "machine": "PHC-01",
    "x": -0.46,
    "y": -0.38,
    "size": 3.8,
    "kind": "diagram",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D",
    "description": "Machine diagram sheet in the D4 monitoring schedule illustrating the PHC-01 cyclone train."
  },
  {
    "id": "D03",
    "label": "D03 · ID Fan & Gas Analysis",
    "detail": "PHC-01 & EXH-IF ducting",
    "machine": "PHC-01",
    "x": -0.26,
    "y": -0.34,
    "size": 3.8,
    "kind": "diagram",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D",
    "description": "Machine diagram sheet in the D4 monitoring schedule illustrating the PHC-01 & EXH-IF ducting."
  },
  {
    "id": "D04",
    "label": "D04 · Kiln Drive Station",
    "detail": "KLN-01 main motor & gear",
    "machine": "KLN-01",
    "x": -0.16,
    "y": 0.18,
    "size": 3.8,
    "kind": "diagram",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D",
    "description": "Machine diagram sheet in the D4 monitoring schedule illustrating the KLN-01 main motor & gear."
  },
  {
    "id": "D05",
    "label": "D05 · Support Roller Stations",
    "detail": "KLN-01 piers 1–3",
    "machine": "KLN-01",
    "x": -0.02,
    "y": 0.24,
    "size": 3.8,
    "kind": "diagram",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D",
    "description": "Machine diagram sheet in the D4 monitoring schedule illustrating the KLN-01 piers 1–3."
  },
  {
    "id": "D06",
    "label": "D06 · Hydraulic Thrust Device",
    "detail": "KLN-01 axial travel system",
    "machine": "KLN-01",
    "x": 0.1,
    "y": 0.18,
    "size": 3.8,
    "kind": "diagram",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D",
    "description": "Machine diagram sheet in the D4 monitoring schedule illustrating the KLN-01 axial travel system."
  },
  {
    "id": "D07",
    "label": "D07 · Seals & Shell Scanner",
    "detail": "KLN-01 inlet/outlet & IR map",
    "machine": "KLN-01",
    "x": -0.02,
    "y": -0.18,
    "size": 3.8,
    "kind": "diagram",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D",
    "description": "Machine diagram sheet in the D4 monitoring schedule illustrating the KLN-01 inlet/outlet & IR map."
  },
  {
    "id": "D08",
    "label": "D08 · Burner Carriage & Primary Air",
    "detail": "BRN-01 firing hood",
    "machine": "BRN-01",
    "x": 0.14,
    "y": 0.44,
    "size": 3.8,
    "kind": "diagram",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D",
    "description": "Machine diagram sheet in the D4 monitoring schedule illustrating the BRN-01 firing hood."
  },
  {
    "id": "D09",
    "label": "D09 · Cooler Grates 1–3",
    "detail": "CLR-01 hydraulic drive",
    "machine": "CLR-01",
    "x": 0.36,
    "y": 0.28,
    "size": 3.8,
    "kind": "diagram",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D",
    "description": "Machine diagram sheet in the D4 monitoring schedule illustrating the CLR-01 hydraulic drive."
  },
  {
    "id": "D10",
    "label": "D10 · Cooler Aeration & Fans",
    "detail": "CLR-01 cooling fans & tertiary",
    "machine": "CLR-01",
    "x": 0.52,
    "y": 0.22,
    "size": 3.8,
    "kind": "diagram",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D",
    "description": "Machine diagram sheet in the D4 monitoring schedule illustrating the CLR-01 cooling fans & tertiary."
  },
  {
    "id": "D11",
    "label": "D11 · Clinker Crusher & Conveyor",
    "detail": "HMR-01 & CSL-01 discharge",
    "machine": "HMR-01",
    "x": 0.7,
    "y": 0.16,
    "size": 3.8,
    "kind": "diagram",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D",
    "description": "Machine diagram sheet in the D4 monitoring schedule illustrating the HMR-01 & CSL-01 discharge."
  },
  {
    "id": "SA-FSL-SILO",
    "label": "FSL · Silo Vessel & Roof",
    "detail": "Storage chamber & bin level radar",
    "machine": "FSL-01",
    "x": -0.84,
    "y": -0.22,
    "kind": "subassembly",
    "size": 3.2,
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "description": "Sub-assembly module for FSL · Silo Vessel & Roof covering physical telemetry and maintenance scope."
  },
  {
    "id": "SA-FSL-AERATION",
    "label": "FSL · Aeration Pads & Blower",
    "detail": "Fluidising bottom cones",
    "machine": "FSL-01",
    "x": -0.78,
    "y": -0.04,
    "kind": "subassembly",
    "size": 3.2,
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "description": "Sub-assembly module for FSL · Aeration Pads & Blower covering physical telemetry and maintenance scope."
  },
  {
    "id": "SA-FSL-DC",
    "label": "FSL · Dust Collector",
    "detail": "Venting filter & differential pressure",
    "machine": "FSL-01",
    "x": -0.72,
    "y": -0.2,
    "kind": "subassembly",
    "size": 3.2,
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "description": "Sub-assembly module for FSL · Dust Collector covering physical telemetry and maintenance scope."
  },
  {
    "id": "SA-KFS-DOSING",
    "label": "KFS · Dosing Gate & Weigh Bin",
    "detail": "Feed gate position & load cells",
    "machine": "KFS-01",
    "x": -0.66,
    "y": -0.34,
    "kind": "subassembly",
    "size": 3.2,
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "description": "Sub-assembly module for KFS · Dosing Gate & Weigh Bin covering physical telemetry and maintenance scope."
  },
  {
    "id": "SA-KFS-ELEVATOR",
    "label": "KFS · Bucket Elevator",
    "detail": "Drive motor, vibration & head shaft",
    "machine": "KFS-01",
    "x": -0.56,
    "y": -0.36,
    "kind": "subassembly",
    "size": 3.2,
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "description": "Sub-assembly module for KFS · Bucket Elevator covering physical telemetry and maintenance scope."
  },
  {
    "id": "SA-PHC-CYCLONES",
    "label": "PHC · Cyclone String C1–C6",
    "detail": "Dip tubes, meal flaps & cone taps",
    "machine": "PHC-01",
    "x": -0.42,
    "y": -0.16,
    "kind": "subassembly",
    "size": 3.2,
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "description": "Sub-assembly module for PHC · Cyclone String C1–C6 covering physical telemetry and maintenance scope."
  },
  {
    "id": "SA-PHC-CALCINER",
    "label": "PHC · Inline Calciner",
    "detail": "Combustion chamber & tertiary air inlet",
    "machine": "PHC-01",
    "x": -0.3,
    "y": -0.14,
    "kind": "subassembly",
    "size": 3.2,
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "description": "Sub-assembly module for PHC · Inline Calciner covering physical telemetry and maintenance scope."
  },
  {
    "id": "SA-PHC-IDFAN",
    "label": "PHC · ID Fan Runner & Bearing",
    "detail": "Fan vibration, speed & dampers",
    "machine": "PHC-01",
    "x": -0.24,
    "y": -0.24,
    "kind": "subassembly",
    "size": 3.2,
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "description": "Sub-assembly module for PHC · ID Fan Runner & Bearing covering physical telemetry and maintenance scope."
  },
  {
    "id": "SA-PHC-GAS",
    "label": "PHC · Gas Analyser Probe",
    "detail": "Exit sample probe O2 / CO",
    "machine": "PHC-01",
    "x": -0.36,
    "y": -0.26,
    "kind": "subassembly",
    "size": 3.2,
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "description": "Sub-assembly module for PHC · Gas Analyser Probe covering physical telemetry and maintenance scope."
  },
  {
    "id": "SA-KLN-DRIVE",
    "label": "KLN · Main Drive Station",
    "detail": "VFD motor, gearbox & pinion",
    "machine": "KLN-01",
    "x": -0.12,
    "y": 0.1,
    "kind": "subassembly",
    "size": 3.2,
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "description": "Sub-assembly module for KLN · Main Drive Station covering physical telemetry and maintenance scope."
  },
  {
    "id": "SA-KLN-TYRES",
    "label": "KLN · Riding Rings & Tyres",
    "detail": "Tyres 1–3, migration & creep",
    "machine": "KLN-01",
    "x": -0.04,
    "y": 0.12,
    "kind": "subassembly",
    "size": 3.2,
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "description": "Sub-assembly module for KLN · Riding Rings & Tyres covering physical telemetry and maintenance scope."
  },
  {
    "id": "SA-KLN-ROLLERS",
    "label": "KLN · Support Roller Bearings",
    "detail": "Spherical roller bearings & lubrication",
    "machine": "KLN-01",
    "x": 0.04,
    "y": 0.14,
    "kind": "subassembly",
    "size": 3.2,
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "description": "Sub-assembly module for KLN · Support Roller Bearings covering physical telemetry and maintenance scope."
  },
  {
    "id": "SA-KLN-THRUST",
    "label": "KLN · Hydraulic Thrust Device",
    "detail": "Thrust roller, guide cylinder & pump",
    "machine": "KLN-01",
    "x": 0.1,
    "y": 0.08,
    "kind": "subassembly",
    "size": 3.2,
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "description": "Sub-assembly module for KLN · Hydraulic Thrust Device covering physical telemetry and maintenance scope."
  },
  {
    "id": "SA-KLN-SEALS",
    "label": "KLN · Inlet & Outlet Seals",
    "detail": "Pneumatic lamella seals & false air",
    "machine": "KLN-01",
    "x": -0.08,
    "y": -0.08,
    "kind": "subassembly",
    "size": 3.2,
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "description": "Sub-assembly module for KLN · Inlet & Outlet Seals covering physical telemetry and maintenance scope."
  },
  {
    "id": "SA-KLN-SHELL",
    "label": "KLN · Refractory & Shell Field",
    "detail": "Thermal scanner & tyre temperature",
    "machine": "KLN-01",
    "x": 0.02,
    "y": -0.08,
    "kind": "subassembly",
    "size": 3.2,
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "description": "Sub-assembly module for KLN · Refractory & Shell Field covering physical telemetry and maintenance scope."
  },
  {
    "id": "SA-BRN-CARRIAGE",
    "label": "BRN · Burner Carriage & Track",
    "detail": "Retractable carriage & alignment",
    "machine": "BRN-01",
    "x": 0.02,
    "y": 0.38,
    "kind": "subassembly",
    "size": 3.2,
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "description": "Sub-assembly module for BRN · Burner Carriage & Track covering physical telemetry and maintenance scope."
  },
  {
    "id": "SA-BRN-FUEL",
    "label": "BRN · Coal & Alternative Fuel Dosing",
    "detail": "Primary fuel lines & dosing valves",
    "machine": "BRN-01",
    "x": 0.12,
    "y": 0.36,
    "kind": "subassembly",
    "size": 3.2,
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "description": "Sub-assembly module for BRN · Coal & Alternative Fuel Dosing covering physical telemetry and maintenance scope."
  },
  {
    "id": "SA-BRN-PRIMARY-AIR",
    "label": "BRN · Primary Air Fan & Swirl",
    "detail": "Axial & radial swirl air nozzles",
    "machine": "BRN-01",
    "x": 0.08,
    "y": 0.46,
    "kind": "subassembly",
    "size": 3.2,
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "description": "Sub-assembly module for BRN · Primary Air Fan & Swirl covering physical telemetry and maintenance scope."
  },
  {
    "id": "SA-CLR-GRATES",
    "label": "CLR · Reciprocating Grates 1–3",
    "detail": "Grate plates, clinker bed & speed",
    "machine": "CLR-01",
    "x": 0.32,
    "y": 0.12,
    "kind": "subassembly",
    "size": 3.2,
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "description": "Sub-assembly module for CLR · Reciprocating Grates 1–3 covering physical telemetry and maintenance scope."
  },
  {
    "id": "SA-CLR-HYDRAULICS",
    "label": "CLR · Hydraulic Drive Station",
    "detail": "Proportional valves & cylinders",
    "machine": "CLR-01",
    "x": 0.4,
    "y": 0.16,
    "kind": "subassembly",
    "size": 3.2,
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "description": "Sub-assembly module for CLR · Hydraulic Drive Station covering physical telemetry and maintenance scope."
  },
  {
    "id": "SA-CLR-COOLING",
    "label": "CLR · Under-Grate Aeration Fans",
    "detail": "Static pressure & chamber aeration",
    "machine": "CLR-01",
    "x": 0.44,
    "y": 0.06,
    "kind": "subassembly",
    "size": 3.2,
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "description": "Sub-assembly module for CLR · Under-Grate Aeration Fans covering physical telemetry and maintenance scope."
  },
  {
    "id": "SA-CLR-TERTIARY",
    "label": "CLR · Tertiary Air Take-Off",
    "detail": "Damper, refractory & dust settling",
    "machine": "CLR-01",
    "x": 0.28,
    "y": 0.02,
    "kind": "subassembly",
    "size": 3.2,
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "description": "Sub-assembly module for CLR · Tertiary Air Take-Off covering physical telemetry and maintenance scope."
  },
  {
    "id": "SA-HMR-ROTOR",
    "label": "HMR · Crusher Rotor & Hammers",
    "detail": "Manganese hammers & rotor bearings",
    "machine": "HMR-01",
    "x": 0.6,
    "y": 0.08,
    "kind": "subassembly",
    "size": 3.2,
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "description": "Sub-assembly module for HMR · Crusher Rotor & Hammers covering physical telemetry and maintenance scope."
  },
  {
    "id": "SA-HMR-DRIVE",
    "label": "HMR · V-Belt & Motor Drive",
    "detail": "Drive motor, pulleys & speed sensor",
    "machine": "HMR-01",
    "x": 0.68,
    "y": 0.04,
    "kind": "subassembly",
    "size": 3.2,
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "description": "Sub-assembly module for HMR · V-Belt & Motor Drive covering physical telemetry and maintenance scope."
  },
  {
    "id": "SA-CSL-STORAGE",
    "label": "CSL · Clinker Silo Vessel",
    "detail": "Level measurement & concrete shell",
    "machine": "CSL-01",
    "x": 0.84,
    "y": -0.02,
    "kind": "subassembly",
    "size": 3.2,
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "description": "Sub-assembly module for CSL · Clinker Silo Vessel covering physical telemetry and maintenance scope."
  },
  {
    "id": "SA-CSL-DISCHARGE",
    "label": "CSL · Pan Conveyor & Gates",
    "detail": "Discharge gates & deep bucket conveyor",
    "machine": "CSL-01",
    "x": 0.76,
    "y": -0.22,
    "kind": "subassembly",
    "size": 3.2,
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "description": "Sub-assembly module for CSL · Pan Conveyor & Gates covering physical telemetry and maintenance scope."
  },
  {
    "id": "LEV-FSL-01",
    "label": "LEV-FSL-01",
    "detail": "FSL-01 · F-P01 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D01)",
    "description": "Raw-meal silo continuous level. Material inventory; high / low level and feed-continuity awareness. Unit: m/%. Location: Silo roof, selected radial position / non-contact view.",
    "machine": "FSL-01",
    "x": -0.7308600000000001,
    "y": -0.14,
    "size": 1.8
  },
  {
    "id": "PRS-FSL-01",
    "label": "PRS-FSL-01",
    "detail": "FSL-01 · F-P03 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D01)",
    "description": "Silo extraction/ aeration header pressure. Pressure trend; detect supply, restriction or process-condition deviation. Unit: Pa/mbar. Location: Fixed supply header upstream of aeration pads.",
    "machine": "FSL-01",
    "x": -0.7173185762831396,
    "y": -0.13628280235608298,
    "size": 1.8
  },
  {
    "id": "ELE-FSL-01",
    "label": "ELE-FSL-01",
    "detail": "FSL-01 · F-P07 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D01)",
    "description": "Aeration blower motor current. Drive electrical load; detect operating-load deviation with mode context. Unit: A/kW/%. Location: MCC/VFD motor feeder.",
    "machine": "FSL-01",
    "x": -0.7133531246122345,
    "y": -0.1320368476070524,
    "size": 1.8
  },
  {
    "id": "WGT-KFS-01",
    "label": "WGT-KFS-01",
    "detail": "KFS-01 · KF-P04 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D01)",
    "description": "Bin weight (calc = sum of 3 cells). Weigh-bin inventory trend; cross-check feed delivery. Unit: % cap.. Location: Weighing controller: sum of the three load cells under the kiln feed bin.",
    "machine": "KFS-01",
    "x": -0.5325029371820845,
    "y": -0.26775140550144494,
    "size": 1.8
  },
  {
    "id": "POS-KFS-01",
    "label": "POS-KFS-01",
    "detail": "KFS-01 · KF-P06 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D01)",
    "description": "Feed control valve / dosing-gate position. Position/travel feedback; detect stuck or abnormal movement. Unit: mm/%. Location: Gate actuator/position feedback.",
    "machine": "KFS-01",
    "x": -0.5326605811445266,
    "y": -0.263414175887949,
    "size": 1.8
  },
  {
    "id": "PRS-KFS-01",
    "label": "PRS-KFS-01",
    "detail": "KFS-01 · KF-P05 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D01)",
    "description": "Air-slide aeration chamber pressure. Pressure trend; detect supply, restriction or process-condition deviation. Unit: Pa/mbar. Location: Stationary air-box header BELOW cloth, accessible port.",
    "machine": "KFS-01",
    "x": -0.532691660570417,
    "y": -0.2587836718261493,
    "size": 1.8
  },
  {
    "id": "FLO-KFS-01",
    "label": "FLO-KFS-01",
    "detail": "KFS-01 · KF-P07 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D01)",
    "description": "Kiln-feed mass flow. Flow stability / delivery indication; compare with demand and downstream state. Unit: t/h. Location: Solid-flow meter throat/line downstream of valve.",
    "machine": "KFS-01",
    "x": -0.5329049547552752,
    "y": -0.25385216442836583,
    "size": 1.8
  },
  {
    "id": "PRS-KFS-02",
    "label": "PRS-KFS-02",
    "detail": "KFS-01 · KF-P08 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D01)",
    "description": "Solid-flow-meter body / pressure interface. Pressure trend; detect supply, restriction or process-condition deviation. Unit: Pa/mbar. Location: Available OEM-approved tap at SFM / conveying interface.",
    "machine": "KFS-01",
    "x": -0.5346241578783715,
    "y": -0.24915798587069754,
    "size": 1.8
  },
  {
    "id": "ELE-KFS-01",
    "label": "ELE-KFS-01",
    "detail": "KFS-01 · KF-P11 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D01)",
    "description": "Elevator motor current. Drive electrical load; detect operating-load deviation with mode context. Unit: A/kW/%. Location: Elevator MCC/VFD panel.",
    "machine": "KFS-01",
    "x": -0.5390322906884119,
    "y": -0.24561489367330344,
    "size": 1.8
  },
  {
    "id": "VIB-KFS-01",
    "label": "VIB-KFS-01",
    "detail": "KFS-01 · KF-P09 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D01)",
    "description": "Bucket elevator drive vibration. Mechanical trend: bearing, imbalance, looseness / misalignment investigation. Unit: mm/s RMS/g. Location: Drive-end bearing / gearbox housing at elevator head.",
    "machine": "KFS-01",
    "x": -0.5460931306503519,
    "y": -0.24387970998459452,
    "size": 1.8
  },
  {
    "id": "TMP-KFS-01",
    "label": "TMP-KFS-01",
    "detail": "KFS-01 · KF-P10 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D01)",
    "description": "Bucket elevator head drive bearing temperature. Bearing heating; correlate with load, lubrication and vibration. Unit: deg C. Location: Drive bearing block / existing pocket.",
    "machine": "KFS-01",
    "x": -0.5543220824786728,
    "y": -0.243672951790654,
    "size": 1.8
  },
  {
    "id": "SPD-KFS-01",
    "label": "SPD-KFS-01",
    "detail": "KFS-01 · KF-P12 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D01)",
    "description": "Zero-speed switch (boot). Actual speed/stroke; detect underspeed or command/feedback mismatch. Unit: state. Location: Elevator head / tail shaft zero-speed switch.",
    "machine": "KFS-01",
    "x": -0.5615904168060835,
    "y": -0.24359305571046552,
    "size": 1.8
  },
  {
    "id": "TMP-PHC-02",
    "label": "TMP-PHC-02",
    "detail": "PHC-01 · PH-P02 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D02)",
    "description": "C2 riser duct temperature (tag on hold). Process thermal trend; compare with operating state and neighbouring points. Unit: °C. Location: C2 outlet duct / TC pocket.",
    "machine": "PHC-01",
    "x": -0.3064265479408024,
    "y": -0.061693444338785666,
    "size": 1.8
  },
  {
    "id": "PRS-PHC-02",
    "label": "PRS-PHC-02",
    "detail": "PHC-01 · PH-P08 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D02)",
    "description": "C2 riser duct pressure (tag on hold). Draft/restriction evidence; validate tap purge and operating state. Unit: mbar. Location: C2 static-pressure tap.",
    "machine": "PHC-01",
    "x": -0.3089310641546379,
    "y": -0.05657857023112403,
    "size": 1.8
  },
  {
    "id": "TMP-PHC-04",
    "label": "TMP-PHC-04",
    "detail": "PHC-01 · PH-P04 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D02)",
    "description": "C4 riser duct temperature (tag on hold). Process thermal trend; compare with operating state and neighbouring points. Unit: °C. Location: C4 outlet duct / TC pocket.",
    "machine": "PHC-01",
    "x": -0.3106884806281636,
    "y": -0.048368015934215525,
    "size": 1.8
  },
  {
    "id": "PRS-PHC-04",
    "label": "PRS-PHC-04",
    "detail": "PHC-01 · PH-P10 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D02)",
    "description": "C4 riser duct pressure (tag on hold). Draft/restriction evidence; validate tap purge and operating state. Unit: mbar. Location: C4 static-pressure tap.",
    "machine": "PHC-01",
    "x": -0.3137479412062669,
    "y": -0.03887902083403879,
    "size": 1.8
  },
  {
    "id": "TMP-PHC-06",
    "label": "TMP-PHC-06",
    "detail": "PHC-01 · PH-P06 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D02)",
    "description": "C6 riser duct temperature (tag on hold). Process thermal trend; compare with operating state and neighbouring points. Unit: °C. Location: C6 outlet duct / TC pocket.",
    "machine": "PHC-01",
    "x": -0.31937303510419124,
    "y": -0.03082463817712222,
    "size": 1.8
  },
  {
    "id": "PRS-PHC-06",
    "label": "PRS-PHC-06",
    "detail": "PHC-01 · PH-P12 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D02)",
    "description": "C6 riser duct pressure (tag on hold). Draft/restriction evidence; validate tap purge and operating state. Unit: mbar. Location: Lowest stage/riser static tap with purge.",
    "machine": "PHC-01",
    "x": -0.3273911689622016,
    "y": -0.026445419634719525,
    "size": 1.8
  },
  {
    "id": "TMP-PHC-01",
    "label": "TMP-PHC-01",
    "detail": "PHC-01 · PH-P01 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D02)",
    "description": "C1 riser duct temperature (tag on hold). Process thermal trend; compare with operating state and neighbouring points. Unit: °C. Location: Fixed outlet duct / accessible TC pocket C1.",
    "machine": "PHC-01",
    "x": -0.3365242708477979,
    "y": -0.02637805323386637,
    "size": 1.8
  },
  {
    "id": "PRS-PHC-01",
    "label": "PRS-PHC-01",
    "detail": "PHC-01 · PH-P07 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D02)",
    "description": "C1 riser duct pressure (tag on hold). Draft/restriction evidence; validate tap purge and operating state. Unit: mbar. Location: Top gas duct pressure tap with purge.",
    "machine": "PHC-01",
    "x": -0.345383890084089,
    "y": -0.029444208399602517,
    "size": 1.8
  },
  {
    "id": "TMP-PHC-03",
    "label": "TMP-PHC-03",
    "detail": "PHC-01 · PH-P03 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D02)",
    "description": "C3 riser duct temperature (tag on hold). Process thermal trend; compare with operating state and neighbouring points. Unit: °C. Location: C3 outlet duct / TC pocket.",
    "machine": "PHC-01",
    "x": -0.35336767353771026,
    "y": -0.03347667658774815,
    "size": 1.8
  },
  {
    "id": "PRS-PHC-03",
    "label": "PRS-PHC-03",
    "detail": "PHC-01 · PH-P09 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D02)",
    "description": "C3 riser duct pressure (tag on hold). Draft/restriction evidence; validate tap purge and operating state. Unit: mbar. Location: C3 static-pressure tap.",
    "machine": "PHC-01",
    "x": -0.3608167104690923,
    "y": -0.036649134329773084,
    "size": 1.8
  },
  {
    "id": "TMP-PHC-05",
    "label": "TMP-PHC-05",
    "detail": "PHC-01 · PH-P05 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D02)",
    "description": "C5 riser duct temperature (tag on hold). Process thermal trend; compare with operating state and neighbouring points. Unit: °C. Location: C5 outlet duct / TC pocket.",
    "machine": "PHC-01",
    "x": -0.3683858627412939,
    "y": -0.03846742310774175,
    "size": 1.8
  },
  {
    "id": "PRS-PHC-05",
    "label": "PRS-PHC-05",
    "detail": "PHC-01 · PH-P11 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D02)",
    "description": "C5 riser duct pressure (tag on hold). Draft/restriction evidence; validate tap purge and operating state. Unit: mbar. Location: C5 static-pressure tap.",
    "machine": "PHC-01",
    "x": -0.376198538729997,
    "y": -0.039819636546743045,
    "size": 1.8
  },
  {
    "id": "TMP-PHC-08",
    "label": "TMP-PHC-08",
    "detail": "PHC-01 · PH-P17 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram P-5)",
    "description": "Calciner outlet temp.. Process thermal trend; compare with operating state and neighbouring points. Unit: °C. Location: Calciner outlet duct thermocouple.",
    "machine": "PHC-01",
    "x": -0.3835355390323635,
    "y": -0.04211148825536242,
    "size": 1.8
  },
  {
    "id": "TMP-PHC-07",
    "label": "TMP-PHC-07",
    "detail": "PHC-01 · PH-P16 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D02)",
    "description": "Final meal temperature to kiln. Process thermal trend; compare with operating state and neighbouring points. Unit: deg C. Location: Bottom cyclone discharge / kiln meal chute pocket.",
    "machine": "PHC-01",
    "x": -0.38939629655740843,
    "y": -0.046113463283352425,
    "size": 1.8
  },
  {
    "id": "GAS-PHC-01",
    "label": "GAS-PHC-01",
    "detail": "PHC-01 · PH-P18 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D03)",
    "description": "Preheater exit oxygen. Combustion/gas indication; verify analyser status and sample health. Unit: vol%/ppm. Location: Existing analyzer sample system at exit.",
    "machine": "PHC-01",
    "x": -0.3935603982107699,
    "y": -0.051318130514744,
    "size": 1.8
  },
  {
    "id": "GAS-PHC-02",
    "label": "GAS-PHC-02",
    "detail": "PHC-01 · PH-P19 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D03)",
    "description": "Preheater exit CO. Combustion/gas indication; verify analyser status and sample health. Unit: vol%/ppm. Location: Existing analyzer sampling point at exit.",
    "machine": "PHC-01",
    "x": -0.3972983529460055,
    "y": -0.056239914239438374,
    "size": 1.8
  },
  {
    "id": "POS-PHC-01",
    "label": "POS-PHC-01",
    "detail": "PHC-01 · PH-P26 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D03)",
    "description": "ID fan damper position. Position/travel feedback; detect stuck or abnormal movement. Unit: mm/%. Location: Damper actuator feedback.",
    "machine": "PHC-01",
    "x": -0.40302212796566006,
    "y": -0.05943881573733876,
    "size": 1.8
  },
  {
    "id": "VIB-PHC-02",
    "label": "VIB-PHC-02",
    "detail": "PHC-01 · PH-P21 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D03)",
    "description": "ID fan NDE vibration. Mechanical trend: bearing, imbalance, looseness / misalignment investigation. Unit: mm/s RMS/g. Location: ID fan opposite bearing pedestal.",
    "machine": "PHC-01",
    "x": -0.4128798664072779,
    "y": -0.06055731025052093,
    "size": 1.8
  },
  {
    "id": "TMP-PHC-10",
    "label": "TMP-PHC-10",
    "detail": "PHC-01 · PH-P23 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D03)",
    "description": "ID fan NDE bearing temperature. Bearing heating; correlate with load, lubrication and vibration. Unit: deg C. Location: NDE bearing RTD pocket/housing.",
    "machine": "PHC-01",
    "x": -0.427108450161291,
    "y": -0.060657107582500897,
    "size": 1.8
  },
  {
    "id": "VIB-PHC-01",
    "label": "VIB-PHC-01",
    "detail": "PHC-01 · PH-P20 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D03)",
    "description": "ID fan DE vibration. Mechanical trend: bearing, imbalance, looseness / misalignment investigation. Unit: mm/s RMS/g. Location: ID fan drive-end bearing pedestal.",
    "machine": "PHC-01",
    "x": -0.4432757437154457,
    "y": -0.061624222944556335,
    "size": 1.8
  },
  {
    "id": "TMP-PHC-09",
    "label": "TMP-PHC-09",
    "detail": "PHC-01 · PH-P22 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D03)",
    "description": "ID fan DE bearing temperature. Bearing heating; correlate with load, lubrication and vibration. Unit: deg C. Location: DE bearing RTD pocket/housing.",
    "machine": "PHC-01",
    "x": -0.45709133324889406,
    "y": -0.06504168490118203,
    "size": 1.8
  },
  {
    "id": "ELE-PHC-01",
    "label": "ELE-PHC-01",
    "detail": "PHC-01 · PH-P24 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D03)",
    "description": "ID fan electrical power. Drive electrical load; detect operating-load deviation with mode context. Unit: A/kW/%. Location: ID fan motor VFD/MCC.",
    "machine": "PHC-01",
    "x": -0.46448687335368355,
    "y": -0.07127718831438443,
    "size": 1.8
  },
  {
    "id": "SPD-PHC-01",
    "label": "SPD-PHC-01",
    "detail": "PHC-01 · PH-P25 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D03)",
    "description": "ID fan speed feedback. Actual speed/stroke; detect underspeed or command/feedback mismatch. Unit: rpm/%. Location: Motor VFD actual speed / shaft encoder.",
    "machine": "PHC-01",
    "x": -0.463797555494059,
    "y": -0.07936684678178653,
    "size": 1.8
  },
  {
    "id": "ELE-KLN-01",
    "label": "ELE-KLN-01",
    "detail": "KLN-01 · K-K09 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D04)",
    "description": "Main motor current / power / torque if available. Drive electrical load; detect operating-load deviation with mode context. Unit: A/kW/%. Location: Drive VFD/MCC.",
    "machine": "KLN-01",
    "x": -0.1367151353500656,
    "y": 0.0322779797798329,
    "size": 1.8
  },
  {
    "id": "TMP-KLN-20",
    "label": "TMP-KLN-20",
    "detail": "KLN-01 · K-K12 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D04)",
    "description": "Motor NDE bearing temperature. Bearing heating; correlate with load, lubrication and vibration. Unit: deg C. Location: Motor NDE RTD pocket.",
    "machine": "KLN-01",
    "x": -0.12738215102620756,
    "y": 0.02486478021823439,
    "size": 1.8
  },
  {
    "id": "SPD-KLN-01",
    "label": "SPD-KLN-01",
    "detail": "KLN-01 · K-K10 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D04)",
    "description": "Kiln speed feedback. Actual speed/stroke; detect underspeed or command/feedback mismatch. Unit: rpm/%. Location: Drive VFD / rotation pickup.",
    "machine": "KLN-01",
    "x": -0.12013473511468732,
    "y": 0.01860596947001714,
    "size": 1.8
  },
  {
    "id": "TMP-KLN-19",
    "label": "TMP-KLN-19",
    "detail": "KLN-01 · K-K11 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D04)",
    "description": "Motor DE bearing temperature. Bearing heating; correlate with load, lubrication and vibration. Unit: deg C. Location: Motor DE RTD pocket.",
    "machine": "KLN-01",
    "x": -0.11724607524944178,
    "y": 0.012866911329244363,
    "size": 1.8
  },
  {
    "id": "VIB-KLN-01",
    "label": "VIB-KLN-01",
    "detail": "KLN-01 · K-K01 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D04)",
    "description": "Motor DE vibration. Mechanical trend: bearing, imbalance, looseness / misalignment investigation. Unit: mm/s RMS/g. Location: Motor DE bearing housing.",
    "machine": "KLN-01",
    "x": -0.11801567574266494,
    "y": 0.006878749372807982,
    "size": 1.8
  },
  {
    "id": "TMP-KLN-22",
    "label": "TMP-KLN-22",
    "detail": "KLN-01 · K-K13 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D04)",
    "description": "Gearbox input bearing temperature. Bearing heating; correlate with load, lubrication and vibration. Unit: deg C. Location: Input-side bearing RTD.",
    "machine": "KLN-01",
    "x": -0.11968484740197695,
    "y": 0.00041935833961921284,
    "size": 1.8
  },
  {
    "id": "VIB-KLN-02",
    "label": "VIB-KLN-02",
    "detail": "KLN-01 · K-K02 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D04)",
    "description": "Gearbox input vibration. Mechanical trend: bearing, imbalance, looseness / misalignment investigation. Unit: mm/s RMS/g. Location: Gearbox input bearing housing.",
    "machine": "KLN-01",
    "x": -0.11949636413777681,
    "y": -0.006077847307845611,
    "size": 1.8
  },
  {
    "id": "VIB-KLN-03",
    "label": "VIB-KLN-03",
    "detail": "KLN-01 · K-K03 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D04)",
    "description": "Gearbox output vibration. Mechanical trend: bearing, imbalance, looseness / misalignment investigation. Unit: mm/s RMS/g. Location: Gearbox output bearing housing.",
    "machine": "KLN-01",
    "x": -0.11651533928684492,
    "y": -0.012059868260986397,
    "size": 1.8
  },
  {
    "id": "TMP-KLN-23",
    "label": "TMP-KLN-23",
    "detail": "KLN-01 · K-K14 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D04)",
    "description": "Gearbox output bearing temperature. Bearing heating; correlate with load, lubrication and vibration. Unit: deg C. Location: Output-side bearing RTD.",
    "machine": "KLN-01",
    "x": -0.11204264850237629,
    "y": -0.017576985847418073,
    "size": 1.8
  },
  {
    "id": "VIB-KLN-04",
    "label": "VIB-KLN-04",
    "detail": "KLN-01 · K-K04 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D04)",
    "description": "Pinion vibration. Mechanical trend: bearing, imbalance, looseness / misalignment investigation. Unit: mm/s RMS/g. Location: Pinion girth-gear side bearing block.",
    "machine": "KLN-01",
    "x": -0.10842647777229324,
    "y": -0.02354420856722386,
    "size": 1.8
  },
  {
    "id": "TMP-KLN-15",
    "label": "TMP-KLN-15",
    "detail": "KLN-01 · K-K06 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D04)",
    "description": "Gearbox oil temperature. Oil-system thermal trend; investigate cooling, load and lubrication. Unit: deg C. Location: Circulating lube oil tank/return.",
    "machine": "KLN-01",
    "x": -0.1071533426348342,
    "y": -0.031205657321763784,
    "size": 1.8
  },
  {
    "id": "PRS-KLN-04",
    "label": "PRS-KLN-04",
    "detail": "KLN-01 · K-K07 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D04)",
    "description": "Gearbox oil pressure / status. Pressure trend; detect supply, restriction or process-condition deviation. Unit: bar/kPa. Location: Gearbox oil supply header.",
    "machine": "KLN-01",
    "x": -0.10755943082409841,
    "y": -0.04107684869264727,
    "size": 1.8
  },
  {
    "id": "LEV-KLN-01",
    "label": "LEV-KLN-01",
    "detail": "KLN-01 · K-K16 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D04)",
    "description": "Gearbox oil low level. Lubricant inventory; low-level awareness before bearing or gear damage. Unit: state. Location: Gearbox oil tank level switch.",
    "machine": "KLN-01",
    "x": -0.10705151393956015,
    "y": -0.0521085292438882,
    "size": 1.8
  },
  {
    "id": "PRS-KLN-05",
    "label": "PRS-KLN-05",
    "detail": "KLN-01 · K-P01 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D04)",
    "description": "Gearbox filter differential pressure. Detect abnormal filter differential pressure and service need. Unit: kPa/bar DP. Location: Across oil filter inlet/outlet piping.",
    "machine": "KLN-01",
    "x": -0.102685743928096,
    "y": -0.0617771707440416,
    "size": 1.8
  },
  {
    "id": "FLO-KLN-05",
    "label": "FLO-KLN-05",
    "detail": "KLN-01 · K-K15 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D04)",
    "description": "Gearbox oil flow switch. Flow stability / delivery indication; compare with demand and downstream state. Unit: state. Location: Supply oil flow switch.",
    "machine": "KLN-01",
    "x": -0.09303572206380985,
    "y": -0.06724012040209086,
    "size": 1.8
  },
  {
    "id": "STS-KLN-11",
    "label": "STS-KLN-11",
    "detail": "KLN-01 · K-K17 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D04)",
    "description": "Auxiliary-drive status. Equipment/controller operating state and source data quality. Unit: state. Location: Auxiliary drive PLC/MCC.",
    "machine": "KLN-01",
    "x": -0.0791047239143445,
    "y": -0.06695656821255079,
    "size": 1.8
  },
  {
    "id": "LIM-KLN-01",
    "label": "LIM-KLN-01",
    "detail": "KLN-01 · K-P09 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D04)",
    "description": "Auxiliary drive brake lining wear limit. Brake wear-limit status; plan inspection/replacement. Unit: state. Location: Brake caliper or wear-indicator provision.",
    "machine": "KLN-01",
    "x": -0.0637034113298264,
    "y": -0.06177561217387981,
    "size": 1.8
  },
  {
    "id": "STS-KLN-05",
    "label": "STS-KLN-05",
    "detail": "KLN-01 · K-K08 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D05)",
    "description": "Girth-gear spray controller status/fault. Equipment/controller operating state and source data quality. Unit: state. Location: Open gear spray controller.",
    "machine": "KLN-01",
    "x": -0.0497511737264697,
    "y": -0.054736054661479225,
    "size": 1.8
  },
  {
    "id": "PRX-KLN-01",
    "label": "PRX-KLN-01",
    "detail": "KLN-01 · K-P03 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D05)",
    "description": "Spray circuit branch/nozzle check #1. Metering channel evidence (HOLD); NOT proof of nozzle deposition. Unit: cycle/state. Location: At OEM metering divider / delivery circuit, not unguarded spray tip.",
    "machine": "KLN-01",
    "x": -0.03865196744409845,
    "y": -0.049590432563606845,
    "size": 1.8
  },
  {
    "id": "PRX-KLN-02",
    "label": "PRX-KLN-02",
    "detail": "KLN-01 · K-P04 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D05)",
    "description": "Spray circuit branch/nozzle check #2. Metering channel evidence (HOLD); NOT proof of nozzle deposition. Unit: cycle/state. Location: At OEM metering divider / delivery circuit, not unguarded spray tip.",
    "machine": "KLN-01",
    "x": -0.029782711786771453,
    "y": -0.04887474428815371,
    "size": 1.8
  },
  {
    "id": "PRX-KLN-03",
    "label": "PRX-KLN-03",
    "detail": "KLN-01 · K-P05 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D05)",
    "description": "Spray circuit branch/nozzle check #3. Metering channel evidence (HOLD); NOT proof of nozzle deposition. Unit: cycle/state. Location: At OEM metering divider / delivery circuit, not unguarded spray tip.",
    "machine": "KLN-01",
    "x": -0.02131897280169371,
    "y": -0.05266115082640509,
    "size": 1.8
  },
  {
    "id": "PRX-KLN-04",
    "label": "PRX-KLN-04",
    "detail": "KLN-01 · K-P06 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D05)",
    "description": "Spray circuit branch/nozzle check #4. Metering channel evidence (HOLD); NOT proof of nozzle deposition. Unit: cycle/state. Location: At OEM metering divider / delivery circuit, not unguarded spray tip.",
    "machine": "KLN-01",
    "x": -0.011696895404920454,
    "y": -0.05872847366322846,
    "size": 1.8
  },
  {
    "id": "PRX-KLN-05",
    "label": "PRX-KLN-05",
    "detail": "KLN-01 · K-P07 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D05)",
    "description": "Spray circuit branch/nozzle check #5. Metering channel evidence (HOLD); NOT proof of nozzle deposition. Unit: cycle/state. Location: At OEM metering divider / delivery circuit, not unguarded spray tip.",
    "machine": "KLN-01",
    "x": -0.0006241635466993842,
    "y": -0.06400952288760385,
    "size": 1.8
  },
  {
    "id": "PRX-KLN-06",
    "label": "PRX-KLN-06",
    "detail": "KLN-01 · K-P08 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D05)",
    "description": "Spray circuit branch/nozzle check #6. Metering channel evidence (HOLD); NOT proof of nozzle deposition. Unit: cycle/state. Location: At OEM metering divider / delivery circuit, not unguarded spray tip.",
    "machine": "KLN-01",
    "x": 0.011037585976433673,
    "y": -0.06638740645321688,
    "size": 1.8
  },
  {
    "id": "MIG-KLN-01",
    "label": "MIG-KLN-01",
    "detail": "KLN-01 · K-P10 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D06)",
    "description": "Tyre 1 slip / migration. Track relative tyre-shell migration versus OEM hot baseline. Unit: mm/rev. Location: Tyre 1: reference on rotating shell + tyre, fixed protected pickup.",
    "machine": "KLN-01",
    "x": 0.02230795295327852,
    "y": -0.0657251672474002,
    "size": 1.8
  },
  {
    "id": "MIG-KLN-02",
    "label": "MIG-KLN-02",
    "detail": "KLN-01 · K-P11 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D06)",
    "description": "Tyre 2 slip / migration. Track relative tyre-shell migration versus OEM hot baseline. Unit: mm/rev. Location: Tyre 2: reference on rotating shell + tyre, fixed protected pickup.",
    "machine": "KLN-01",
    "x": 0.03312246035913423,
    "y": -0.0635427337690111,
    "size": 1.8
  },
  {
    "id": "MIG-KLN-03",
    "label": "MIG-KLN-03",
    "detail": "KLN-01 · K-P12 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D06)",
    "description": "Tyre 3 slip / migration. Track relative tyre-shell migration versus OEM hot baseline. Unit: mm/rev. Location: Tyre 3: reference on rotating shell + tyre, fixed protected pickup.",
    "machine": "KLN-01",
    "x": 0.04445074014821118,
    "y": -0.06164842046580861,
    "size": 1.8
  },
  {
    "id": "TMP-KLN-01",
    "label": "TMP-KLN-01",
    "detail": "KLN-01 · K-K18 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D06)",
    "description": "Station 1 left bearing A temperature. Bearing heating; correlate with load, lubrication and vibration. Unit: deg C. Location: Roller station 1, left shaft bearing A RTD pocket.",
    "machine": "KLN-01",
    "x": 0.05730448184061493,
    "y": -0.06069838956600809,
    "size": 1.8
  },
  {
    "id": "TMP-KLN-02",
    "label": "TMP-KLN-02",
    "detail": "KLN-01 · K-K19 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D06)",
    "description": "Station 1 left bearing B temperature. Bearing heating; correlate with load, lubrication and vibration. Unit: deg C. Location: Roller station 1, left shaft bearing B RTD pocket.",
    "machine": "KLN-01",
    "x": 0.07135958740274309,
    "y": -0.059663118207110385,
    "size": 1.8
  },
  {
    "id": "TMP-KLN-03",
    "label": "TMP-KLN-03",
    "detail": "KLN-01 · K-K20 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D06)",
    "description": "Station 1 right bearing A temperature. Bearing heating; correlate with load, lubrication and vibration. Unit: deg C. Location: Roller station 1, right shaft bearing A RTD pocket.",
    "machine": "KLN-01",
    "x": 0.08433978391144235,
    "y": -0.05653632544085549,
    "size": 1.8
  },
  {
    "id": "TMP-KLN-04",
    "label": "TMP-KLN-04",
    "detail": "KLN-01 · K-K21 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D06)",
    "description": "Station 1 right bearing B temperature. Bearing heating; correlate with load, lubrication and vibration. Unit: deg C. Location: Roller station 1, right shaft bearing B RTD pocket.",
    "machine": "KLN-01",
    "x": 0.09287762841204789,
    "y": -0.04977252468888371,
    "size": 1.8
  },
  {
    "id": "TMP-KLN-05",
    "label": "TMP-KLN-05",
    "detail": "KLN-01 · K-K22 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D06)",
    "description": "Station 2 left bearing A temperature. Bearing heating; correlate with load, lubrication and vibration. Unit: deg C. Location: Roller station 2, left shaft bearing A RTD pocket.",
    "machine": "KLN-01",
    "x": 0.09453445256040369,
    "y": -0.039457059919406456,
    "size": 1.8
  },
  {
    "id": "TMP-KLN-06",
    "label": "TMP-KLN-06",
    "detail": "KLN-01 · K-K23 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D06)",
    "description": "Station 2 left bearing B temperature. Bearing heating; correlate with load, lubrication and vibration. Unit: deg C. Location: Roller station 2, left shaft bearing B RTD pocket.",
    "machine": "KLN-01",
    "x": 0.08973399649610912,
    "y": -0.02741215489147934,
    "size": 1.8
  },
  {
    "id": "TMP-KLN-07",
    "label": "TMP-KLN-07",
    "detail": "KLN-01 · K-K24 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D06)",
    "description": "Station 2 right bearing A temperature. Bearing heating; correlate with load, lubrication and vibration. Unit: deg C. Location: Roller station 2, right shaft bearing A RTD pocket.",
    "machine": "KLN-01",
    "x": 0.08222971244658073,
    "y": -0.01617346555247696,
    "size": 1.8
  },
  {
    "id": "TMP-KLN-08",
    "label": "TMP-KLN-08",
    "detail": "KLN-01 · K-K25 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D06)",
    "description": "Station 2 right bearing B temperature. Bearing heating; correlate with load, lubrication and vibration. Unit: deg C. Location: Roller station 2, right shaft bearing B RTD pocket.",
    "machine": "KLN-01",
    "x": 0.07755154639308565,
    "y": -0.007527808001315105,
    "size": 1.8
  },
  {
    "id": "TMP-KLN-09",
    "label": "TMP-KLN-09",
    "detail": "KLN-01 · K-K26 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D06)",
    "description": "Station 3 left bearing A temperature. Bearing heating; correlate with load, lubrication and vibration. Unit: deg C. Location: Roller station 3, left shaft bearing A RTD pocket.",
    "machine": "KLN-01",
    "x": 0.08016871561784937,
    "y": -0.0015728112253666701,
    "size": 1.8
  },
  {
    "id": "TMP-KLN-10",
    "label": "TMP-KLN-10",
    "detail": "KLN-01 · K-K27 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D06)",
    "description": "Station 3 left bearing B temperature. Bearing heating; correlate with load, lubrication and vibration. Unit: deg C. Location: Roller station 3, left shaft bearing B RTD pocket.",
    "machine": "KLN-01",
    "x": 0.09101052795700385,
    "y": 0.0031251724019519603,
    "size": 1.8
  },
  {
    "id": "TMP-KLN-11",
    "label": "TMP-KLN-11",
    "detail": "KLN-01 · K-K28 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D06)",
    "description": "Station 3 right bearing A temperature. Bearing heating; correlate with load, lubrication and vibration. Unit: deg C. Location: Roller station 3, right shaft bearing A RTD pocket.",
    "machine": "KLN-01",
    "x": 0.10687264125925837,
    "y": 0.008455029749294133,
    "size": 1.8
  },
  {
    "id": "TMP-KLN-12",
    "label": "TMP-KLN-12",
    "detail": "KLN-01 · K-K29 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D06)",
    "description": "Station 3 right bearing B temperature. Bearing heating; correlate with load, lubrication and vibration. Unit: deg C. Location: Roller station 3, right shaft bearing B RTD pocket.",
    "machine": "KLN-01",
    "x": 0.12212523630921336,
    "y": 0.01554570338822905,
    "size": 1.8
  },
  {
    "id": "POS-KLN-01",
    "label": "POS-KLN-01",
    "detail": "KLN-01 · K-K31 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D06)",
    "description": "Kiln axial position. Position/travel feedback; detect stuck or abnormal movement. Unit: mm/%. Location: Hydraulic thrust LVDT / position feedback.",
    "machine": "KLN-01",
    "x": 0.13172397995037888,
    "y": 0.0242261742948984,
    "size": 1.8
  },
  {
    "id": "POS-KLN-02",
    "label": "POS-KLN-02",
    "detail": "KLN-01 · K-K32 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D06)",
    "description": "Thrust travel-limit status. Position/travel feedback; detect stuck or abnormal movement. Unit: state. Location: Thrust upper/lower limit switches.",
    "machine": "KLN-01",
    "x": 0.1337190742794926,
    "y": 0.0334440858447196,
    "size": 1.8
  },
  {
    "id": "PRS-KLN-07",
    "label": "PRS-KLN-07",
    "detail": "KLN-01 · K-K30 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D06)",
    "description": "Hydraulic thrust pressure. Pressure trend; detect supply, restriction or process-condition deviation. Unit: bar/kPa. Location: Thrust power-pack/actuator header.",
    "machine": "KLN-01",
    "x": 0.12979342772681696,
    "y": 0.04222445486884337,
    "size": 1.8
  },
  {
    "id": "TMP-KLN-13",
    "label": "TMP-KLN-13",
    "detail": "KLN-01 · K-K37 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D07)",
    "description": "Kiln-inlet gas temperature. Process thermal trend; compare with operating state and neighbouring points. Unit: deg C. Location: Inlet chamber thermocouple.",
    "machine": "KLN-01",
    "x": 0.12362560880771158,
    "y": 0.05038457309832953,
    "size": 1.8
  },
  {
    "id": "PRS-KLN-01",
    "label": "PRS-KLN-01",
    "detail": "KLN-01 · K-K38 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D07)",
    "description": "Kiln-inlet draft. Draft/restriction evidence; validate tap purge and operating state. Unit: Pa/mbar. Location: Inlet static pressure port.",
    "machine": "KLN-01",
    "x": 0.11824382267713722,
    "y": 0.058450790366516306,
    "size": 1.8
  },
  {
    "id": "GAS-KLN-01",
    "label": "GAS-KLN-01",
    "detail": "KLN-01 · K-K35 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D07)",
    "description": "Kiln inlet O₂. Combustion/gas indication; verify analyser status and sample health. Unit: vol%/ppm. Location: Kiln inlet analyzer sample system.",
    "machine": "KLN-01",
    "x": 0.11412316226015533,
    "y": 0.06687163987932919,
    "size": 1.8
  },
  {
    "id": "GAS-KLN-02",
    "label": "GAS-KLN-02",
    "detail": "KLN-01 · K-K36 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D07)",
    "description": "Kiln inlet CO. Combustion/gas indication; verify analyser status and sample health. Unit: vol%/ppm. Location: Kiln inlet analyzer sample system.",
    "machine": "KLN-01",
    "x": 0.10921213900179709,
    "y": 0.0752051338527887,
    "size": 1.8
  },
  {
    "id": "GAS-KLN-03",
    "label": "GAS-KLN-03",
    "detail": "KLN-01 · K-P26 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D07)",
    "description": "Kiln-inlet NOx. Combustion/gas indication; verify analyser status and sample health. Unit: vol%/ppm. Location: Existing kiln-inlet analyzer sample line.",
    "machine": "KLN-01",
    "x": 0.10075228997365232,
    "y": 0.08203084593031007,
    "size": 1.8
  },
  {
    "id": "STS-KLN-06",
    "label": "STS-KLN-06",
    "detail": "KLN-01 · K-K41 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D07)",
    "description": "Gas analyzer validity/status. Equipment/controller operating state and source data quality. Unit: state. Location: Analyzer sample system & controller.",
    "machine": "KLN-01",
    "x": 0.08756631472835279,
    "y": 0.0858197441984969,
    "size": 1.8
  },
  {
    "id": "STS-KLN-08",
    "label": "STS-KLN-08",
    "detail": "KLN-01 · K-K33 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D07)",
    "description": "Shell scanner: max temp. + position, min temp. + position. Equipment/controller operating state and source data quality. Unit: °C / m. Location: External shell scanner (shell maximum and its position along the kiln).",
    "machine": "KLN-01",
    "x": 0.07122012678877503,
    "y": 0.08624242692606188,
    "size": 1.8
  },
  {
    "id": "TMP-KLN-14",
    "label": "TMP-KLN-14",
    "detail": "KLN-01 · K-K39 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D07)",
    "description": "Burning-zone temperature / optical proxy. Process thermal trend; compare with operating state and neighbouring points. Unit: deg C. Location: Burning-zone camera/pyrometer.",
    "machine": "KLN-01",
    "x": 0.055268863182820746,
    "y": 0.08495924320071128,
    "size": 1.8
  },
  {
    "id": "TMP-KLN-27",
    "label": "TMP-KLN-27",
    "detail": "KLN-01 · K-P22 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D07)",
    "description": "Kiln hood gas / structural temperature. Process thermal trend; compare with operating state and neighbouring points. Unit: deg C. Location: Existing hood TC pocket - confirm measurand.",
    "machine": "KLN-01",
    "x": 0.04311037928076414,
    "y": 0.08516757009689,
    "size": 1.8
  },
  {
    "id": "PRS-KLN-03",
    "label": "PRS-KLN-03",
    "detail": "KLN-01 · K-K40 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D07)",
    "description": "Kiln hood pressure. Pressure trend; detect supply, restriction or process-condition deviation. Unit: Pa/mbar. Location: Hood static pressure port.",
    "machine": "KLN-01",
    "x": 0.03589733141043831,
    "y": 0.08997452063934971,
    "size": 1.8
  },
  {
    "id": "TMP-KLN-25",
    "label": "TMP-KLN-25",
    "detail": "KLN-01 · K-P19 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D07)",
    "description": "Outlet sector-plate cooling supply temperature. Cooling-air supply temperature to the castable sector plates; detects loss of cooling effect. Unit: deg C. Location: Stationary supply duct before sector plate system.",
    "machine": "KLN-01",
    "x": 0.03188676837173801,
    "y": 0.1004996897834488,
    "size": 1.8
  },
  {
    "id": "TMP-KLN-26",
    "label": "TMP-KLN-26",
    "detail": "KLN-01 · K-P20 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D07)",
    "description": "Outlet cooling shroud (cow shell) surface temperature. Outlet-shroud surface temperature; cooling effectiveness and local hot-spot awareness. Unit: deg C. Location: Specified shroud skin / protected bracket.",
    "machine": "KLN-01",
    "x": 0.0276107358693358,
    "y": 0.11490783394362467,
    "size": 1.8
  },
  {
    "id": "CAM-BRN-01",
    "label": "CAM-BRN-01",
    "detail": "BRN-01 · B-P01 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D08)",
    "description": "Flame-view camera / picture. Operator visual evidence; no unvalidated automatic classifier. Unit: image/video. Location: Shielded burner hood sight port.",
    "machine": "BRN-01",
    "x": 0.10003280613284823,
    "y": 0.44908027090374697,
    "size": 1.8
  },
  {
    "id": "PRS-BRN-01",
    "label": "PRS-BRN-01",
    "detail": "BRN-01 · B-P02 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D08)",
    "description": "PA header pressure. Pressure trend; detect supply, restriction or process-condition deviation. Unit: mbar. Location: Primary-air header downstream of the PA fan.",
    "machine": "BRN-01",
    "x": 0.08824627961538162,
    "y": 0.4586368362944102,
    "size": 1.8
  },
  {
    "id": "PRS-BRN-02",
    "label": "PRS-BRN-02",
    "detail": "BRN-01 · B-P03 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D08)",
    "description": "Burner swirl air pressure. Pressure trend; detect supply, restriction or process-condition deviation. Unit: mbar. Location: Burner swirl (helical) air line test port.",
    "machine": "BRN-01",
    "x": 0.07366232061437836,
    "y": 0.46115520531041054,
    "size": 1.8
  },
  {
    "id": "PRS-BRN-03",
    "label": "PRS-BRN-03",
    "detail": "BRN-01 · B-P04 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D08)",
    "description": "Burner axial air pressure. Pressure trend; detect supply, restriction or process-condition deviation. Unit: mbar. Location: Burner axial (jet) air line upstream of the tip.",
    "machine": "BRN-01",
    "x": 0.05872272974946589,
    "y": 0.4572769356918169,
    "size": 1.8
  },
  {
    "id": "PRS-BRN-04",
    "label": "PRS-BRN-04",
    "detail": "BRN-01 · B-P05 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D08)",
    "description": "Coal transport line pressure. Pressure trend; detect supply, restriction or process-condition deviation. Unit: Pa/mbar. Location: Kiln coal pneumatic delivery header.",
    "machine": "BRN-01",
    "x": 0.04517347075641641,
    "y": 0.45006334495305744,
    "size": 1.8
  },
  {
    "id": "VIB-BRN-01",
    "label": "VIB-BRN-01",
    "detail": "BRN-01 · B-P06 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D08)",
    "description": "Primary-air fan vibration. Mechanical trend: bearing, imbalance, looseness / misalignment investigation. Unit: mm/s RMS/g. Location: Fan DE bearing/pedestal.",
    "machine": "BRN-01",
    "x": 0.03315412303099724,
    "y": 0.44304678030432704,
    "size": 1.8
  },
  {
    "id": "TMP-BRN-01",
    "label": "TMP-BRN-01",
    "detail": "BRN-01 · B-P07 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D08)",
    "description": "Primary-air fan bearing temperature. Bearing heating; correlate with load, lubrication and vibration. Unit: deg C. Location: Bearing housing RTD pocket.",
    "machine": "BRN-01",
    "x": 0.021667742898162735,
    "y": 0.4382168235674194,
    "size": 1.8
  },
  {
    "id": "ELE-BRN-01",
    "label": "ELE-BRN-01",
    "detail": "BRN-01 · B-P08 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D08)",
    "description": "Primary-air fan motor current. Drive electrical load; detect operating-load deviation with mode context. Unit: A/kW/%. Location: MCC/VFD.",
    "machine": "BRN-01",
    "x": 0.009920047096208987,
    "y": 0.43517436247756663,
    "size": 1.8
  },
  {
    "id": "TMP-BRN-02",
    "label": "TMP-BRN-02",
    "detail": "BRN-01 · B-P09 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D08)",
    "description": "Secondary air temperature. Process thermal trend; compare with operating state and neighbouring points. Unit: deg C. Location: Hood / secondary air entry TC/pyrometer port.",
    "machine": "BRN-01",
    "x": -0.0016466361955211894,
    "y": 0.4318924290544412,
    "size": 1.8
  },
  {
    "id": "TMP-BRN-04",
    "label": "TMP-BRN-04",
    "detail": "BRN-01 · B-P13 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D08)",
    "description": "Fine-coal bin temperature. Coal-bin heating trend; early smouldering indication together with bin CO. Unit: deg C. Location: Existing protected sensor at designated bin level.",
    "machine": "BRN-01",
    "x": -0.01155542187022758,
    "y": 0.4264708697651087,
    "size": 1.8
  },
  {
    "id": "GAS-BRN-01",
    "label": "GAS-BRN-01",
    "detail": "BRN-01 · B-P14 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D08)",
    "description": "Coal bin CO. Combustion/gas indication; verify analyser status and sample health. Unit: ppm. Location: OEM-approved gas sampling / analyzer location.",
    "machine": "BRN-01",
    "x": -0.018680771268180102,
    "y": 0.4186548191250118,
    "size": 1.8
  },
  {
    "id": "LEV-BRN-01",
    "label": "LEV-BRN-01",
    "detail": "BRN-01 · B-P15 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D08)",
    "description": "Fine-coal bin level. Material inventory; high / low level and feed-continuity awareness. Unit: m/%. Location: Bin top radar / level measurement.",
    "machine": "BRN-01",
    "x": -0.023764805384323698,
    "y": 0.41009910029531405,
    "size": 1.8
  },
  {
    "id": "FLO-BRN-01",
    "label": "FLO-BRN-01",
    "detail": "BRN-01 · B-P16 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D08)",
    "description": "Kiln coal mass flow. Flow stability / delivery indication; compare with demand and downstream state. Unit: t/h. Location: Kiln solid-fuel dosing flowmeter.",
    "machine": "BRN-01",
    "x": -0.029753518080270616,
    "y": 0.4032399531558031,
    "size": 1.8
  },
  {
    "id": "VIB-BRN-02",
    "label": "VIB-BRN-02",
    "detail": "BRN-01 · B-P18 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D08)",
    "description": "Coal transport blower vibration. Mechanical trend: bearing, imbalance, looseness / misalignment investigation. Unit: mm/s RMS/g. Location: Roots blower bearing housing / gearbox.",
    "machine": "BRN-01",
    "x": -0.04037902245033051,
    "y": 0.39957968313349723,
    "size": 1.8
  },
  {
    "id": "ELE-BRN-02",
    "label": "ELE-BRN-02",
    "detail": "BRN-01 · B-P20 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D08)",
    "description": "Coal transport blower current. Drive electrical load; detect operating-load deviation with mode context. Unit: A/kW/%. Location: Blower MCC/VFD.",
    "machine": "BRN-01",
    "x": -0.05767665539224075,
    "y": 0.3985668995845103,
    "size": 1.8
  },
  {
    "id": "PRS-CLR-01",
    "label": "PRS-CLR-01",
    "detail": "CLR-01 · C-P01 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D09)",
    "description": "Under-grate chamber 1 static pressure. Pressure trend; detect supply, restriction or process-condition deviation. Unit: Pa/mbar. Location: Compartment 1 accessible pressure tap / impulse line.",
    "machine": "CLR-01",
    "x": 0.219968152278567,
    "y": 0.09782759188995019,
    "size": 1.8
  },
  {
    "id": "TMP-CLR-01",
    "label": "TMP-CLR-01",
    "detail": "CLR-01 · C-P13 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D09)",
    "description": "Cooling fan 1 bearing temperature. Bearing heating; correlate with load, lubrication and vibration. Unit: deg C. Location: Fan 1 bearing RTD/housing.",
    "machine": "CLR-01",
    "x": 0.19778598599670824,
    "y": 0.09457937784841511,
    "size": 1.8
  },
  {
    "id": "VIB-CLR-01",
    "label": "VIB-CLR-01",
    "detail": "CLR-01 · C-P07 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D09)",
    "description": "Cooling fan 1 vibration. Mechanical trend: bearing, imbalance, looseness / misalignment investigation. Unit: mm/s RMS/g. Location: Fan 1 bearing housing, accessible radial orientation.",
    "machine": "CLR-01",
    "x": 0.1823198711018791,
    "y": 0.08727798190075522,
    "size": 1.8
  },
  {
    "id": "ELE-CLR-01",
    "label": "ELE-CLR-01",
    "detail": "CLR-01 · C-P19 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D09)",
    "description": "Cooling fan 1 motor current. Drive electrical load; detect operating-load deviation with mode context. Unit: A/kW/%. Location: Fan 1 MCC/VFD.",
    "machine": "CLR-01",
    "x": 0.17804786918185192,
    "y": 0.0764251627677284,
    "size": 1.8
  },
  {
    "id": "PRS-CLR-02",
    "label": "PRS-CLR-02",
    "detail": "CLR-01 · C-P02 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D09)",
    "description": "Under-grate chamber 2 static pressure. Pressure trend; detect supply, restriction or process-condition deviation. Unit: Pa/mbar. Location: Compartment 2 accessible pressure tap / impulse line.",
    "machine": "CLR-01",
    "x": 0.18492369019283494,
    "y": 0.06406992453431629,
    "size": 1.8
  },
  {
    "id": "TMP-CLR-02",
    "label": "TMP-CLR-02",
    "detail": "CLR-01 · C-P14 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D09)",
    "description": "Cooling fan 2 bearing temperature. Bearing heating; correlate with load, lubrication and vibration. Unit: deg C. Location: Fan 2 bearing RTD/housing.",
    "machine": "CLR-01",
    "x": 0.1983673276064525,
    "y": 0.05242499494620294,
    "size": 1.8
  },
  {
    "id": "VIB-CLR-02",
    "label": "VIB-CLR-02",
    "detail": "CLR-01 · C-P08 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D09)",
    "description": "Cooling fan 2 vibration. Mechanical trend: bearing, imbalance, looseness / misalignment investigation. Unit: mm/s RMS/g. Location: Fan 2 bearing housing, accessible radial orientation.",
    "machine": "CLR-01",
    "x": 0.211768980457784,
    "y": 0.04257970216057534,
    "size": 1.8
  },
  {
    "id": "ELE-CLR-02",
    "label": "ELE-CLR-02",
    "detail": "CLR-01 · C-P20 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D09)",
    "description": "Cooling fan 2 motor current. Drive electrical load; detect operating-load deviation with mode context. Unit: A/kW/%. Location: Fan 2 MCC/VFD.",
    "machine": "CLR-01",
    "x": 0.220019832164867,
    "y": 0.03414746636400576,
    "size": 1.8
  },
  {
    "id": "PRS-CLR-03",
    "label": "PRS-CLR-03",
    "detail": "CLR-01 · C-P03 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D09)",
    "description": "Under-grate chamber 3 static pressure. Pressure trend; detect supply, restriction or process-condition deviation. Unit: Pa/mbar. Location: Compartment 3 accessible pressure tap / impulse line.",
    "machine": "CLR-01",
    "x": 0.22195763167244295,
    "y": 0.025969574460414306,
    "size": 1.8
  },
  {
    "id": "TMP-CLR-03",
    "label": "TMP-CLR-03",
    "detail": "CLR-01 · C-P15 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D09)",
    "description": "Cooling fan 3 bearing temperature. Bearing heating; correlate with load, lubrication and vibration. Unit: deg C. Location: Fan 3 bearing RTD/housing.",
    "machine": "CLR-01",
    "x": 0.22032695361058585,
    "y": 0.017234506272415035,
    "size": 1.8
  },
  {
    "id": "VIB-CLR-03",
    "label": "VIB-CLR-03",
    "detail": "CLR-01 · C-P09 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D09)",
    "description": "Cooling fan 3 vibration. Mechanical trend: bearing, imbalance, looseness / misalignment investigation. Unit: mm/s RMS/g. Location: Fan 3 bearing housing, accessible radial orientation.",
    "machine": "CLR-01",
    "x": 0.21944318256193993,
    "y": 0.008111926458485214,
    "size": 1.8
  },
  {
    "id": "ELE-CLR-03",
    "label": "ELE-CLR-03",
    "detail": "CLR-01 · C-P21 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D09)",
    "description": "Cooling fan 3 motor current. Drive electrical load; detect operating-load deviation with mode context. Unit: A/kW/%. Location: Fan 3 MCC/VFD.",
    "machine": "CLR-01",
    "x": 0.22218071893618244,
    "y": -0.0005791998469566531,
    "size": 1.8
  },
  {
    "id": "PRS-CLR-04",
    "label": "PRS-CLR-04",
    "detail": "CLR-01 · C-P04 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D10)",
    "description": "Under-grate chamber 4 static pressure. Pressure trend; detect supply, restriction or process-condition deviation. Unit: Pa/mbar. Location: Compartment 4 accessible pressure tap / impulse line.",
    "machine": "CLR-01",
    "x": 0.22825441705188432,
    "y": -0.008365802759830288,
    "size": 1.8
  },
  {
    "id": "TMP-CLR-04",
    "label": "TMP-CLR-04",
    "detail": "CLR-01 · C-P16 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D10)",
    "description": "Cooling fan 4 bearing temperature. Bearing heating; correlate with load, lubrication and vibration. Unit: deg C. Location: Fan 4 bearing RTD/housing.",
    "machine": "CLR-01",
    "x": 0.23482514795184214,
    "y": -0.015916771120461727,
    "size": 1.8
  },
  {
    "id": "ELE-CLR-04",
    "label": "ELE-CLR-04",
    "detail": "CLR-01 · C-P22 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D10)",
    "description": "Cooling fan 4 motor current. Drive electrical load; detect operating-load deviation with mode context. Unit: A/kW/%. Location: Fan 4 MCC/VFD.",
    "machine": "CLR-01",
    "x": 0.2388821410355036,
    "y": -0.024872762561421506,
    "size": 1.8
  },
  {
    "id": "PRS-CLR-05",
    "label": "PRS-CLR-05",
    "detail": "CLR-01 · C-P05 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D10)",
    "description": "Under-grate chamber 5 static pressure. Pressure trend; detect supply, restriction or process-condition deviation. Unit: Pa/mbar. Location: Compartment 5 accessible pressure tap / impulse line.",
    "machine": "CLR-01",
    "x": 0.23969348542965954,
    "y": -0.03665269002424066,
    "size": 1.8
  },
  {
    "id": "TMP-CLR-05",
    "label": "TMP-CLR-05",
    "detail": "CLR-01 · C-P17 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D10)",
    "description": "Cooling fan 5 bearing temperature. Bearing heating; correlate with load, lubrication and vibration. Unit: deg C. Location: Fan 5 bearing RTD/housing.",
    "machine": "CLR-01",
    "x": 0.2396298016205315,
    "y": -0.05100600162069,
    "size": 1.8
  },
  {
    "id": "ELE-CLR-05",
    "label": "ELE-CLR-05",
    "detail": "CLR-01 · C-P23 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D10)",
    "description": "Cooling fan 5 motor current. Drive electrical load; detect operating-load deviation with mode context. Unit: A/kW/%. Location: Fan 5 MCC/VFD.",
    "machine": "CLR-01",
    "x": 0.24281278486193247,
    "y": -0.06540982543218532,
    "size": 1.8
  },
  {
    "id": "PRS-CLR-06",
    "label": "PRS-CLR-06",
    "detail": "CLR-01 · C-P06 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D10)",
    "description": "Under-grate chamber 6 static pressure. Pressure trend; detect supply, restriction or process-condition deviation. Unit: Pa/mbar. Location: Compartment 6 accessible pressure tap / impulse line.",
    "machine": "CLR-01",
    "x": 0.2525218545500496,
    "y": -0.0759557014371742,
    "size": 1.8
  },
  {
    "id": "TMP-CLR-06",
    "label": "TMP-CLR-06",
    "detail": "CLR-01 · C-P18 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D10)",
    "description": "Cooling fan 6 bearing temperature. Bearing heating; correlate with load, lubrication and vibration. Unit: deg C. Location: Fan 6 bearing RTD/housing.",
    "machine": "CLR-01",
    "x": 0.26910560073109113,
    "y": -0.07939187463307767,
    "size": 1.8
  },
  {
    "id": "ELE-CLR-06",
    "label": "ELE-CLR-06",
    "detail": "CLR-01 · C-P24 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D10)",
    "description": "Cooling fan 6 motor current. Drive electrical load; detect operating-load deviation with mode context. Unit: A/kW/%. Location: Fan 6 MCC/VFD.",
    "machine": "CLR-01",
    "x": 0.2897626273584056,
    "y": -0.07513598771789523,
    "size": 1.8
  },
  {
    "id": "TMP-CLR-08",
    "label": "TMP-CLR-08",
    "detail": "CLR-01 · C-P28 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D10)",
    "description": "Discharge clinker surface temperature. Clinker discharge temperature; cooling performance and red-river awareness. Unit: deg C. Location: Protected IR sightline at discharge stream.",
    "machine": "CLR-01",
    "x": 0.31027236851802553,
    "y": -0.0659548626763933,
    "size": 1.8
  },
  {
    "id": "TMP-CLR-09",
    "label": "TMP-CLR-09",
    "detail": "CLR-01 · C-P29 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D10)",
    "description": "Cooler exhaust gas temperature. Process thermal trend; compare with operating state and neighbouring points. Unit: deg C. Location: Cooler exhaust outlet duct TC.",
    "machine": "CLR-01",
    "x": 0.3274664665870942,
    "y": -0.056757152070126556,
    "size": 1.8
  },
  {
    "id": "VIB-CLR-07",
    "label": "VIB-CLR-07",
    "detail": "CLR-01 · C-P31 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D10)",
    "description": "Cooler vent fan vibration. Mechanical trend: bearing, imbalance, looseness / misalignment investigation. Unit: mm/s RMS/g. Location: Vent fan accessible fixed bearing pedestal.",
    "machine": "CLR-01",
    "x": 0.340808680397008,
    "y": -0.05210941842615716,
    "size": 1.8
  },
  {
    "id": "TMP-CLR-10",
    "label": "TMP-CLR-10",
    "detail": "CLR-01 · C-P32 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D10)",
    "description": "Vent fan bearing temperature. Bearing heating; correlate with load, lubrication and vibration. Unit: deg C. Location: Vent fan bearing housing.",
    "machine": "CLR-01",
    "x": 0.35214980908179355,
    "y": -0.05391340306706351,
    "size": 1.8
  },
  {
    "id": "ELE-CLR-07",
    "label": "ELE-CLR-07",
    "detail": "CLR-01 · C-P33 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D10)",
    "description": "Vent fan electrical current. Drive electrical load; detect operating-load deviation with mode context. Unit: A/kW/%. Location: Vent fan MCC/VFD.",
    "machine": "CLR-01",
    "x": 0.3640189437160449,
    "y": -0.06061619105460788,
    "size": 1.8
  },
  {
    "id": "SPD-CLR-01",
    "label": "SPD-CLR-01",
    "detail": "CLR-01 · C-P26 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram C-2)",
    "description": "Fan speed (RPM) (fan 1). Cooling fans 1–6 (OSW-PE-SNL-PYR-01 Rev. 02). Unit: rpm. Location: Cooling fan 1 motor / VFD.",
    "machine": "CLR-01",
    "x": 0.3777822132036718,
    "y": -0.06838654240859837,
    "size": 1.8
  },
  {
    "id": "TMP-HMR-03",
    "label": "TMP-HMR-03",
    "detail": "HMR-01 · H-P06 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D11)",
    "description": "Crusher motor winding temperature. Motor thermal load; correlate with current, ambient and cooling. Unit: deg C. Location: Motor embedded RTD.",
    "machine": "HMR-01",
    "x": 0.6529785112299714,
    "y": -0.09347581561001991,
    "size": 1.8
  },
  {
    "id": "ELE-HMR-01",
    "label": "ELE-HMR-01",
    "detail": "HMR-01 · H-P07 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D11)",
    "description": "Crusher motor current. Drive electrical load; detect operating-load deviation with mode context. Unit: A/kW/%. Location: Motor MCC/VFD.",
    "machine": "HMR-01",
    "x": 0.6681801364894693,
    "y": -0.09427411793232714,
    "size": 1.8
  },
  {
    "id": "VIB-HMR-02",
    "label": "VIB-HMR-02",
    "detail": "HMR-01 · H-P02 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D11)",
    "description": "Clinker crusher rotor NDE vibration. Mechanical trend: bearing, imbalance, looseness / misalignment investigation. Unit: mm/s RMS/g. Location: Rotor NDE stationary bearing block.",
    "machine": "HMR-01",
    "x": 0.6825476315292941,
    "y": -0.09182495579874521,
    "size": 1.8
  },
  {
    "id": "TMP-HMR-02",
    "label": "TMP-HMR-02",
    "detail": "HMR-01 · H-P04 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D11)",
    "description": "Crusher NDE bearing temperature. Bearing heating; correlate with load, lubrication and vibration. Unit: deg C. Location: NDE bearing pocket/housing.",
    "machine": "HMR-01",
    "x": 0.6967241670037049,
    "y": -0.088597394552494,
    "size": 1.8
  },
  {
    "id": "SPD-HMR-01",
    "label": "SPD-HMR-01",
    "detail": "HMR-01 · H-P08 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D11)",
    "description": "Rotor zero-speed switch (no RPM). Actual speed/stroke; detect underspeed or command/feedback mismatch. Unit: state. Location: Crusher rotor shaft zero-speed switch.",
    "machine": "HMR-01",
    "x": 0.7122384687094352,
    "y": -0.0864448206486657,
    "size": 1.8
  },
  {
    "id": "VIB-HMR-01",
    "label": "VIB-HMR-01",
    "detail": "HMR-01 · H-P01 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D11)",
    "description": "Clinker crusher rotor DE vibration. Mechanical trend: bearing, imbalance, looseness / misalignment investigation. Unit: mm/s RMS/g. Location: Rotor DE stationary bearing block.",
    "machine": "HMR-01",
    "x": 0.7297816319768891,
    "y": -0.08516349946504052,
    "size": 1.8
  },
  {
    "id": "TMP-HMR-01",
    "label": "TMP-HMR-01",
    "detail": "HMR-01 · H-P03 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D11)",
    "description": "Crusher DE bearing temperature. Bearing heating; correlate with load, lubrication and vibration. Unit: deg C. Location: DE bearing pocket/housing.",
    "machine": "HMR-01",
    "x": 0.7477084336917081,
    "y": -0.08260171101988749,
    "size": 1.8
  },
  {
    "id": "VIB-CSL-01",
    "label": "VIB-CSL-01",
    "detail": "CSL-01 · CS-P01 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D11)",
    "description": "Pan conveyor drive vibration. Mechanical trend: bearing, imbalance, looseness / misalignment investigation. Unit: mm/s RMS/g. Location: Pan conveyor reducer/bearing frame, accessible.",
    "machine": "CSL-01",
    "x": 0.9421255048572651,
    "y": -0.19619374434455777,
    "size": 1.8
  },
  {
    "id": "ELE-CSL-01",
    "label": "ELE-CSL-01",
    "detail": "CSL-01 · CS-P03 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D11)",
    "description": "Pan conveyor motor current. Drive electrical load; detect operating-load deviation with mode context. Unit: A/kW/%. Location: Conveyor MCC/VFD.",
    "machine": "CSL-01",
    "x": 0.9488855929986244,
    "y": -0.18483531705126055,
    "size": 1.8
  },
  {
    "id": "SPD-CSL-01",
    "label": "SPD-CSL-01",
    "detail": "CSL-01 · CS-P04 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D11)",
    "description": "Zero-speed switch (tail, no RPM). Actual speed/stroke; detect underspeed or command/feedback mismatch. Unit: state. Location: Pan conveyor tail shaft zero-speed switch.",
    "machine": "CSL-01",
    "x": 0.946397712879516,
    "y": -0.1698138625654988,
    "size": 1.8
  },
  {
    "id": "PRS-CSL-01",
    "label": "PRS-CSL-01",
    "detail": "CSL-01 · CS-P07 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D11)",
    "description": "Silo baghouse ΔP (calc). Pressure trend; detect supply, restriction or process-condition deviation. Unit: mbar. Location: Calculated: PRS-CSL-02 − PRS-CSL-03.",
    "machine": "CSL-01",
    "x": 0.9373874075684652,
    "y": -0.15417309555563552,
    "size": 1.8
  },
  {
    "id": "ELE-CSL-02",
    "label": "ELE-CSL-02",
    "detail": "CSL-01 · CS-P10 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D11)",
    "description": "Dust collector fan motor current. Drive electrical load; detect operating-load deviation with mode context. Unit: A/kW/%. Location: MCC/VFD.",
    "machine": "CSL-01",
    "x": 0.928212987325859,
    "y": -0.14095404553735266,
    "size": 1.8
  },
  {
    "id": "LEV-CSL-01",
    "label": "LEV-CSL-01",
    "detail": "CSL-01 · CS-P05 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram D11)",
    "description": "Clinker silo continuous level. Material inventory; high / low level and feed-continuity awareness. Unit: m/%. Location: Top roof radar with chute avoidance.",
    "machine": "CSL-01",
    "x": 0.9258348044008212,
    "y": -0.13148755427121428,
    "size": 1.8
  },
  {
    "id": "POS-FSL-01",
    "label": "POS-FSL-01",
    "detail": "FSL-01 · F1-02 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-1)",
    "description": "Motorised gate 1 opening (manual + pneumatic gates not monitored). Silo bottom: six air slides and outlet gates (OSW-PE-SNL-PYR-01 Rev. 00). Unit: %. Location: Motorised outlet gate 1 actuator position feedback.",
    "machine": "FSL-01",
    "x": -0.6459070673551375,
    "y": -0.16483300652706642,
    "size": 1.8
  },
  {
    "id": "POS-FSL-02",
    "label": "POS-FSL-02",
    "detail": "FSL-01 · F1-03 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-1)",
    "description": "Motorised gate 2 opening (manual + pneumatic gates not monitored). Silo bottom: six air slides and outlet gates (OSW-PE-SNL-PYR-01 Rev. 00). Unit: %. Location: Motorised outlet gate 2 actuator position feedback.",
    "machine": "FSL-01",
    "x": -0.6284783365090829,
    "y": -0.15864769070059784,
    "size": 1.8
  },
  {
    "id": "POS-FSL-03",
    "label": "POS-FSL-03",
    "detail": "FSL-01 · F1-04 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-1)",
    "description": "Motorised gate 3 opening (manual + pneumatic gates not monitored). Silo bottom: six air slides and outlet gates (OSW-PE-SNL-PYR-01 Rev. 00). Unit: %. Location: Motorised outlet gate 3 actuator position feedback.",
    "machine": "FSL-01",
    "x": -0.6079184190530698,
    "y": -0.15080844592481402,
    "size": 1.8
  },
  {
    "id": "POS-FSL-04",
    "label": "POS-FSL-04",
    "detail": "FSL-01 · F1-05 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-1)",
    "description": "Motorised gate 4 opening (manual + pneumatic gates not monitored). Silo bottom: six air slides and outlet gates (OSW-PE-SNL-PYR-01 Rev. 00). Unit: %. Location: Motorised outlet gate 4 actuator position feedback.",
    "machine": "FSL-01",
    "x": -0.591578270269814,
    "y": -0.14065569769428393,
    "size": 1.8
  },
  {
    "id": "POS-FSL-05",
    "label": "POS-FSL-05",
    "detail": "FSL-01 · F1-06 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-1)",
    "description": "Motorised gate 5 opening (manual + pneumatic gates not monitored). Silo bottom: six air slides and outlet gates (OSW-PE-SNL-PYR-01 Rev. 00). Unit: %. Location: Motorised outlet gate 5 actuator position feedback.",
    "machine": "FSL-01",
    "x": -0.5842769998123367,
    "y": -0.12907884338973089,
    "size": 1.8
  },
  {
    "id": "POS-FSL-06",
    "label": "POS-FSL-06",
    "detail": "FSL-01 · F1-07 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-1)",
    "description": "Motorised gate 6 opening (manual + pneumatic gates not monitored). Silo bottom: six air slides and outlet gates (OSW-PE-SNL-PYR-01 Rev. 00). Unit: %. Location: Motorised outlet gate 6 actuator position feedback.",
    "machine": "FSL-01",
    "x": -0.5861651420021768,
    "y": -0.11753410154894159,
    "size": 1.8
  },
  {
    "id": "STS-FSL-03",
    "label": "STS-FSL-03",
    "detail": "FSL-01 · F2-02 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-2)",
    "description": "Slide purge sequence. Aeration blowers, header and purge sequence (OSW-PE-SNL-PYR-01 Rev. 00). Unit: state. Location: Silo aeration PLC / control cabinet.",
    "machine": "FSL-01",
    "x": -0.5934730715669612,
    "y": -0.1068440171311272,
    "size": 1.8
  },
  {
    "id": "TMP-FSL-01",
    "label": "TMP-FSL-01",
    "detail": "FSL-01 · F2-04 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-2)",
    "description": "Aeration blower motor winding temperature. Aeration blowers, header and purge sequence (OSW-PE-SNL-PYR-01 Rev. 00). Unit: °C. Location: Stator winding RTD (PT100) in the motor terminal box / protection relay.",
    "machine": "FSL-01",
    "x": -0.60148664619931,
    "y": -0.09673042527912346,
    "size": 1.8
  },
  {
    "id": "PRS-FSL-02",
    "label": "PRS-FSL-02",
    "detail": "FSL-01 · F3-01 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-3)",
    "description": "Silo DC filter ΔP (calc = in − out). Silo dust collector and fan (OSW-PE-SNL-PYR-01 Rev. 00). Unit: mbar. Location: Calculated: PRS-FSL-03 − PRS-FSL-04.",
    "machine": "FSL-01",
    "x": -0.6077238324602723,
    "y": -0.08641879858337885,
    "size": 1.8
  },
  {
    "id": "ELE-FSL-02",
    "label": "ELE-FSL-02",
    "detail": "FSL-01 · F3-02 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-3)",
    "description": "Silo dust-collector fan motor current. Silo dust collector and fan (OSW-PE-SNL-PYR-01 Rev. 00). Unit: A/kW/%. Location: Dust-collector fan MCC.",
    "machine": "FSL-01",
    "x": -0.6132638717886518,
    "y": -0.07578264323564056,
    "size": 1.8
  },
  {
    "id": "PRS-KFS-05",
    "label": "PRS-KFS-05",
    "detail": "KFS-01 · F4-01 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-4)",
    "description": "Bin DC filter ΔP (calc). Kiln feed bin, load cells and bin dust collector (OSW-PE-SNL-PYR-01 Rev. 00). Unit: mbar. Location: Calculated: PRS-KFS-08 − PRS-KFS-09.",
    "machine": "KFS-01",
    "x": -0.44148696469059057,
    "y": -0.20602415362735427,
    "size": 1.8
  },
  {
    "id": "ELE-KFS-03",
    "label": "ELE-KFS-03",
    "detail": "KFS-01 · F4-02 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-4)",
    "description": "Feed-bin dust-collector fan motor current. Kiln feed bin, load cells and bin dust collector (OSW-PE-SNL-PYR-01 Rev. 00). Unit: A/kW/%. Location: Dust-collector fan MCC.",
    "machine": "KFS-01",
    "x": -0.45522580606422286,
    "y": -0.19918371579898625,
    "size": 1.8
  },
  {
    "id": "WGT-KFS-02",
    "label": "WGT-KFS-02",
    "detail": "KFS-01 · F4-04 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-4)",
    "description": "Load cell 1. Kiln feed bin, load cells and bin dust collector (OSW-PE-SNL-PYR-01 Rev. 00). Unit: t. Location: First load-cell support under the kiln feed bin.",
    "machine": "KFS-01",
    "x": -0.4743489421190234,
    "y": -0.19665028099561932,
    "size": 1.8
  },
  {
    "id": "WGT-KFS-03",
    "label": "WGT-KFS-03",
    "detail": "KFS-01 · F4-05 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-4)",
    "description": "Load cell 2. Kiln feed bin, load cells and bin dust collector (OSW-PE-SNL-PYR-01 Rev. 00). Unit: t. Location: Second load-cell support under the kiln feed bin.",
    "machine": "KFS-01",
    "x": -0.49543569572121293,
    "y": -0.19768059530510795,
    "size": 1.8
  },
  {
    "id": "POS-KFS-02",
    "label": "POS-KFS-02",
    "detail": "KFS-01 · F5-02 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-5)",
    "description": "Discharge gate B open / closed. Bin discharge: blower, air slides A / B and gates A / B (OSW-PE-SNL-PYR-01 Rev. 00). Unit: state. Location: Discharge gate B limit switches.",
    "machine": "KFS-01",
    "x": -0.5137434487612516,
    "y": -0.1990977260288681,
    "size": 1.8
  },
  {
    "id": "FLO-KFS-02",
    "label": "FLO-KFS-02",
    "detail": "KFS-01 · F6-03 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-6)",
    "description": "Kiln feed mass flow, SFM B. Solid-flow meters A / B and common air slide (OSW-PE-SNL-PYR-01 Rev. 00). Unit: t/h. Location: Solid-flow meter B on air slide B.",
    "machine": "KFS-01",
    "x": -0.5261177908403745,
    "y": -0.19664965524731975,
    "size": 1.8
  },
  {
    "id": "PRS-KFS-06",
    "label": "PRS-KFS-06",
    "detail": "KFS-01 · F6-04 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-6)",
    "description": "SFM B pressure (P3). Solid-flow meters A / B and common air slide (OSW-PE-SNL-PYR-01 Rev. 00). Unit: Pa/mbar. Location: Solid-flow meter B pressure tap.",
    "machine": "KFS-01",
    "x": -0.5328965489801333,
    "y": -0.18739058454835236,
    "size": 1.8
  },
  {
    "id": "PRS-KFS-04",
    "label": "PRS-KFS-04",
    "detail": "KFS-01 · F6-05 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-6)",
    "description": "Common air slide SFM A/B → elevator pressure. Solid-flow meters A / B and common air slide (OSW-PE-SNL-PYR-01 Rev. 00). Unit: Pa/mbar. Location: Air box of the common slide to the elevator boot.",
    "machine": "KFS-01",
    "x": -0.5375839817004828,
    "y": -0.1716575855042699,
    "size": 1.8
  },
  {
    "id": "LEV-KFS-04",
    "label": "LEV-KFS-04",
    "detail": "KFS-01 · F7-01 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-7)",
    "description": "Elevator boot material build-up level. Bucket elevator (OSW-PE-SNL-PYR-01 Rev. 00). Unit: state. Location: Bucket elevator boot casing (MoM-02).",
    "machine": "KFS-01",
    "x": -0.5445907817248374,
    "y": -0.15332841846848738,
    "size": 1.8
  },
  {
    "id": "LIM-KFS-01",
    "label": "LIM-KFS-01",
    "detail": "KFS-01 · F7-02 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-7)",
    "description": "Elevator belt sway / misalignment switch. Bucket elevator (OSW-PE-SNL-PYR-01 Rev. 00). Unit: state. Location: Upper casing section, belt edges (MoM-02).",
    "machine": "KFS-01",
    "x": -0.5565964613863803,
    "y": -0.13804777868822712,
    "size": 1.8
  },
  {
    "id": "TMP-KFS-02",
    "label": "TMP-KFS-02",
    "detail": "KFS-01 · F7-07 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-7)",
    "description": "Bucket elevator head motor winding temperature. Bucket elevator (OSW-PE-SNL-PYR-01 Rev. 00). Unit: °C. Location: Stator winding RTD (PT100) in the motor terminal box / protection relay.",
    "machine": "KFS-01",
    "x": -0.5732492696192072,
    "y": -0.13037796701961393,
    "size": 1.8
  },
  {
    "id": "TMP-PHC-11",
    "label": "TMP-PHC-11",
    "detail": "PHC-01 · P4-07 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram P-4)",
    "description": "ID fan motor winding temperature. ID fan and motor (OSW-PE-SNL-PYR-01 Rev. 00). Unit: °C. Location: Stator winding RTD (PT100) in the motor terminal box / protection relay.",
    "machine": "PHC-01",
    "x": -0.33191179738494175,
    "y": 0.04846163842499637,
    "size": 1.8
  },
  {
    "id": "PRS-PHC-10",
    "label": "PRS-PHC-10",
    "detail": "PHC-01 · P5-02 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram P-5)",
    "description": "Calciner outlet draft. Calciner, calciner firing and tertiary air (OSW-PE-SNL-PYR-01 Rev. 00). Unit: Pa/mbar. Location: Calciner outlet / gooseneck static tap with purge.",
    "machine": "PHC-01",
    "x": -0.3497285278910964,
    "y": 0.040936196125650526,
    "size": 1.8
  },
  {
    "id": "GAS-PHC-03",
    "label": "GAS-PHC-03",
    "detail": "PHC-01 · P5-03 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram P-5)",
    "description": "Calciner outlet O₂. Calciner, calciner firing and tertiary air (OSW-PE-SNL-PYR-01 Rev. 00). Unit: vol%/ppm. Location: Calciner outlet analyser probe.",
    "machine": "PHC-01",
    "x": -0.36544609564297953,
    "y": 0.031469589582599794,
    "size": 1.8
  },
  {
    "id": "GAS-PHC-04",
    "label": "GAS-PHC-04",
    "detail": "PHC-01 · P5-04 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram P-5)",
    "description": "Calciner outlet CO. Calciner, calciner firing and tertiary air (OSW-PE-SNL-PYR-01 Rev. 00). Unit: vol%/ppm. Location: Calciner outlet analyser probe.",
    "machine": "PHC-01",
    "x": -0.3797279439803927,
    "y": 0.023776065228682364,
    "size": 1.8
  },
  {
    "id": "POS-PHC-02",
    "label": "POS-PHC-02",
    "detail": "PHC-01 · P5-05 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram P-5)",
    "description": "C5 meal-split gate position (calciner / riser). Calciner, calciner firing and tertiary air (OSW-PE-SNL-PYR-01 Rev. 00). Unit: %. Location: Meal splitting gate below C5.",
    "machine": "PHC-01",
    "x": -0.3939086836665506,
    "y": 0.01891813624621788,
    "size": 1.8
  },
  {
    "id": "STS-BGH-01",
    "label": "STS-BGH-01",
    "detail": "BGH-01 · G1-01 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram G-1)",
    "description": "Pulse-cleaning controller status. Bags, hoppers, inlet and stack (OSW-PE-SNL-PYR-01 Rev. 00). Unit: state. Location: Pulse controller / PLC.",
    "machine": "BGH-01",
    "x": 0.3716685794913799,
    "y": -0.30476974290568565,
    "size": 1.8
  },
  {
    "id": "TMP-BGH-02",
    "label": "TMP-BGH-02",
    "detail": "BGH-01 · G1-02 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram G-1)",
    "description": "Baghouse inlet gas temperature (bag protection). Bags, hoppers, inlet and stack (OSW-PE-SNL-PYR-01 Rev. 00). Unit: °C. Location: Baghouse inlet duct thermocouple.",
    "machine": "BGH-01",
    "x": 0.35828168653446235,
    "y": -0.3099940514015266,
    "size": 1.8
  },
  {
    "id": "PRS-BGH-02",
    "label": "PRS-BGH-02",
    "detail": "BGH-01 · G1-03 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram G-1)",
    "description": "Baghouse inlet draft. Bags, hoppers, inlet and stack (OSW-PE-SNL-PYR-01 Rev. 00). Unit: Pa/mbar. Location: Baghouse inlet duct static tap.",
    "machine": "BGH-01",
    "x": 0.3477935116044973,
    "y": -0.31828520383895803,
    "size": 1.8
  },
  {
    "id": "PRS-BGH-01",
    "label": "PRS-BGH-01",
    "detail": "BGH-01 · G1-04 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram G-1)",
    "description": "Bag ΔP (calc = in − out). Bags, hoppers, inlet and stack (OSW-PE-SNL-PYR-01 Rev. 00). Unit: mbar. Location: Calculated: PRS-BGH-02 − PRS-BGH-03.",
    "machine": "BGH-01",
    "x": 0.34066876990058786,
    "y": -0.32876858680994125,
    "size": 1.8
  },
  {
    "id": "LEV-BGH-01",
    "label": "LEV-BGH-01",
    "detail": "BGH-01 · G1-05 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram G-1)",
    "description": "Baghouse dust-hopper level. Bags, hoppers, inlet and stack (OSW-PE-SNL-PYR-01 Rev. 00). Unit: state. Location: Bottom dust-collection hopper (MoM-02).",
    "machine": "BGH-01",
    "x": 0.33463925577642734,
    "y": -0.3387161695258492,
    "size": 1.8
  },
  {
    "id": "GAS-BGH-01",
    "label": "GAS-BGH-01",
    "detail": "BGH-01 · G1-07 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram G-1)",
    "description": "Stack dust (existing CEMS, read-only). Bags, hoppers, inlet and stack (OSW-PE-SNL-PYR-01 Rev. 00). Unit: mg/Nm³. Location: Stack CEMS link.",
    "machine": "BGH-01",
    "x": 0.32532218910666666,
    "y": -0.3454456390667364,
    "size": 1.8
  },
  {
    "id": "VIB-BGH-01",
    "label": "VIB-BGH-01",
    "detail": "BGH-01 · G2-01 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram G-2)",
    "description": "Baghouse fan bearing vibration. Baghouse fan and motor (OSW-PE-SNL-PYR-01 Rev. 00). Unit: mm/s. Location: Baghouse fan bearing pedestal.",
    "machine": "BGH-01",
    "x": 0.3087668814382324,
    "y": -0.3482377738505571,
    "size": 1.8
  },
  {
    "id": "TMP-BGH-01",
    "label": "TMP-BGH-01",
    "detail": "BGH-01 · G2-02 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram G-2)",
    "description": "Baghouse fan bearing temperature. Baghouse fan and motor (OSW-PE-SNL-PYR-01 Rev. 00). Unit: °C. Location: Baghouse fan bearing RTD.",
    "machine": "BGH-01",
    "x": 0.28443578707456796,
    "y": -0.34896447707787526,
    "size": 1.8
  },
  {
    "id": "ELE-BGH-01",
    "label": "ELE-BGH-01",
    "detail": "BGH-01 · G2-03 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram G-2)",
    "description": "Baghouse fan motor current. Baghouse fan and motor (OSW-PE-SNL-PYR-01 Rev. 00). Unit: A/kW/%. Location: Baghouse fan MCC / VFD.",
    "machine": "BGH-01",
    "x": 0.25657599478059023,
    "y": -0.3510178688427854,
    "size": 1.8
  },
  {
    "id": "SPD-BGH-01",
    "label": "SPD-BGH-01",
    "detail": "BGH-01 · G2-04 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram G-2)",
    "description": "Baghouse fan speed. Baghouse fan and motor (OSW-PE-SNL-PYR-01 Rev. 00). Unit: rpm. Location: Baghouse fan VFD.",
    "machine": "BGH-01",
    "x": 0.2327791057644756,
    "y": -0.35727588237849506,
    "size": 1.8
  },
  {
    "id": "TMP-BGH-03",
    "label": "TMP-BGH-03",
    "detail": "BGH-01 · G2-05 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram G-2)",
    "description": "Baghouse fan motor winding temperature. Baghouse fan and motor (OSW-PE-SNL-PYR-01 Rev. 00). Unit: °C. Location: Stator winding RTD (PT100) in the motor terminal box / protection relay.",
    "machine": "BGH-01",
    "x": 0.22028437048485403,
    "y": -0.36845414088144235,
    "size": 1.8
  },
  {
    "id": "STS-KLN-12",
    "label": "STS-KLN-12",
    "detail": "KLN-01 · K2-07 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram K-2)",
    "description": "Main-drive health and motor cooling fans (DCS). Gear train: motor, gearbox, pinion and girth gear (OSW-PE-SNL-PYR-01 Rev. 00). Unit: state. Location: Drive panel / DCS health flags.",
    "machine": "KLN-01",
    "x": -0.23788890775433089,
    "y": 0.05711837757701181,
    "size": 1.8
  },
  {
    "id": "TMP-KLN-28",
    "label": "TMP-KLN-28",
    "detail": "KLN-01 · K6-02 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram K-6)",
    "description": "Tyre 1 temperature (DCS read-only). Roller stations and tyres (OSW-PE-SNL-PYR-01 Rev. 00). Unit: °C. Location: Tyre 1 IR / DCS TYRE TEMP.",
    "machine": "KLN-01",
    "x": -0.22463607326400062,
    "y": 0.042256043317093955,
    "size": 1.8
  },
  {
    "id": "TMP-KLN-29",
    "label": "TMP-KLN-29",
    "detail": "KLN-01 · K6-04 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram K-6)",
    "description": "Tyre 2 temperature (DCS read-only). Roller stations and tyres (OSW-PE-SNL-PYR-01 Rev. 00). Unit: °C. Location: Tyre 2 IR / DCS TYRE TEMP.",
    "machine": "KLN-01",
    "x": -0.20719601684559066,
    "y": 0.029135059527270708,
    "size": 1.8
  },
  {
    "id": "TMP-KLN-30",
    "label": "TMP-KLN-30",
    "detail": "KLN-01 · K6-06 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram K-6)",
    "description": "Tyre 3 temperature (DCS read-only). Roller stations and tyres (OSW-PE-SNL-PYR-01 Rev. 00). Unit: °C. Location: Tyre 3 IR / DCS TYRE TEMP.",
    "machine": "KLN-01",
    "x": -0.19321510762383323,
    "y": 0.018191539798101317,
    "size": 1.8
  },
  {
    "id": "STS-KLN-13",
    "label": "STS-KLN-13",
    "detail": "KLN-01 · K8-02 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram K-8)",
    "description": "Shell cooling fans status (DCS). Shell and scanner (OSW-PE-SNL-PYR-01 Rev. 00). Unit: state. Location: Shell cooling fan starters / DCS.",
    "machine": "KLN-01",
    "x": -0.1868043816439106,
    "y": 0.008351420050078202,
    "size": 1.8
  },
  {
    "id": "POS-BRN-01",
    "label": "POS-BRN-01",
    "detail": "BRN-01 · P5-06 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram P-5)",
    "description": "Tertiary-air damper position. Calciner, calciner firing and tertiary air (OSW-PE-SNL-PYR-01 Rev. 00). Unit: %. Location: Tertiary-air damper actuator feedback.",
    "machine": "BRN-01",
    "x": -0.10691907581420401,
    "y": 0.3182567305010136,
    "size": 1.8
  },
  {
    "id": "TMP-BRN-03",
    "label": "TMP-BRN-03",
    "detail": "BRN-01 · P5-07 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram P-5)",
    "description": "Tertiary-air temperature. Calciner, calciner firing and tertiary air (OSW-PE-SNL-PYR-01 Rev. 00). Unit: °C. Location: Tertiary-air duct thermocouple.",
    "machine": "BRN-01",
    "x": -0.10888894143842695,
    "y": 0.30746004479112254,
    "size": 1.8
  },
  {
    "id": "PRS-BRN-05",
    "label": "PRS-BRN-05",
    "detail": "BRN-01 · P5-08 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram P-5)",
    "description": "Tertiary-air duct pressure. Calciner, calciner firing and tertiary air (OSW-PE-SNL-PYR-01 Rev. 00). Unit: Pa/mbar. Location: Tertiary-air duct static tap.",
    "machine": "BRN-01",
    "x": -0.10793328819469067,
    "y": 0.29665182847339383,
    "size": 1.8
  },
  {
    "id": "FLO-BRN-02",
    "label": "FLO-BRN-02",
    "detail": "BRN-01 · P5-09 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram P-5)",
    "description": "Calciner coal mass flow. Calciner, calciner firing and tertiary air (OSW-PE-SNL-PYR-01 Rev. 00). Unit: t/h. Location: Calciner coal dosing feeder / flowmeter.",
    "machine": "BRN-01",
    "x": -0.10230210027004866,
    "y": 0.28678064923399854,
    "size": 1.8
  },
  {
    "id": "TMP-BRN-05",
    "label": "TMP-BRN-05",
    "detail": "BRN-01 · B2-04 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram B-2)",
    "description": "Primary-air fan motor winding temperature. Primary-air fan (OSW-PE-SNL-PYR-01 Rev. 00). Unit: °C. Location: Stator winding RTD (PT100) in the motor terminal box / protection relay.",
    "machine": "BRN-01",
    "x": -0.09405034627293324,
    "y": 0.27782836057243576,
    "size": 1.8
  },
  {
    "id": "TMP-BRN-06",
    "label": "TMP-BRN-06",
    "detail": "BRN-01 · B4-04 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram B-4)",
    "description": "Coal conveying blower motor winding temperature. Coal conveying blower and line (OSW-PE-SNL-PYR-01 Rev. 00). Unit: °C. Location: Stator winding RTD (PT100) in the motor terminal box / protection relay.",
    "machine": "BRN-01",
    "x": -0.08709865808302619,
    "y": 0.26833174901162293,
    "size": 1.8
  },
  {
    "id": "TMP-CLR-17",
    "label": "TMP-CLR-17",
    "detail": "CLR-01 · C2-04 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram C-2)",
    "description": "Cooling fan 1 motor winding temperature. Cooling fans 1–3 (hot zone) (OSW-PE-SNL-PYR-01 Rev. 00). Unit: °C. Location: Stator winding RTD (PT100) in the motor terminal box / protection relay.",
    "machine": "CLR-01",
    "x": 0.21595568789488523,
    "y": -0.04377247529022726,
    "size": 1.8
  },
  {
    "id": "TMP-CLR-18",
    "label": "TMP-CLR-18",
    "detail": "CLR-01 · C2-08 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram C-2)",
    "description": "Cooling fan 2 motor winding temperature. Cooling fans 1–3 (hot zone) (OSW-PE-SNL-PYR-01 Rev. 00). Unit: °C. Location: Stator winding RTD (PT100) in the motor terminal box / protection relay.",
    "machine": "CLR-01",
    "x": 0.21603757002308172,
    "y": -0.05941612319629217,
    "size": 1.8
  },
  {
    "id": "TMP-CLR-19",
    "label": "TMP-CLR-19",
    "detail": "CLR-01 · C2-12 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram C-2)",
    "description": "Cooling fan 3 motor winding temperature. Cooling fans 1–3 (hot zone) (OSW-PE-SNL-PYR-01 Rev. 00). Unit: °C. Location: Stator winding RTD (PT100) in the motor terminal box / protection relay.",
    "machine": "CLR-01",
    "x": 0.2173051900223556,
    "y": -0.07700003187167545,
    "size": 1.8
  },
  {
    "id": "TMP-CLR-20",
    "label": "TMP-CLR-20",
    "detail": "CLR-01 · C3-03 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram C-3)",
    "description": "Cooling fan 4 motor winding temperature. Cooling fans 4–6 (OSW-PE-SNL-PYR-01 Rev. 00). Unit: °C. Location: Stator winding RTD (PT100) in the motor terminal box / protection relay.",
    "machine": "CLR-01",
    "x": 0.22459693009609116,
    "y": -0.09249261951411702,
    "size": 1.8
  },
  {
    "id": "TMP-CLR-21",
    "label": "TMP-CLR-21",
    "detail": "CLR-01 · C3-06 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram C-3)",
    "description": "Cooling fan 5 motor winding temperature. Cooling fans 4–6 (OSW-PE-SNL-PYR-01 Rev. 00). Unit: °C. Location: Stator winding RTD (PT100) in the motor terminal box / protection relay.",
    "machine": "CLR-01",
    "x": 0.24035615074494954,
    "y": -0.10127129793223599,
    "size": 1.8
  },
  {
    "id": "TMP-CLR-22",
    "label": "TMP-CLR-22",
    "detail": "CLR-01 · C3-09 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram C-3)",
    "description": "Cooling fan 6 motor winding temperature. Cooling fans 4–6 (OSW-PE-SNL-PYR-01 Rev. 00). Unit: °C. Location: Stator winding RTD (PT100) in the motor terminal box / protection relay.",
    "machine": "CLR-01",
    "x": 0.26308095891620725,
    "y": -0.10074931404820126,
    "size": 1.8
  },
  {
    "id": "TMP-CLR-23",
    "label": "TMP-CLR-23",
    "detail": "CLR-01 · C5-06 · Optional",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram C-5)",
    "description": "Vent fan motor winding temperature. Discharge, exhaust and vent fan (OSW-PE-SNL-PYR-01 Rev. 00). Unit: °C. Location: Stator winding RTD (PT100) in the motor terminal box / protection relay.",
    "machine": "CLR-01",
    "x": 0.288269966324439,
    "y": -0.09217233618182202,
    "size": 1.8
  },
  {
    "id": "TMP-CSL-02",
    "label": "TMP-CSL-02",
    "detail": "CSL-01 · H2-04 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram H-2)",
    "description": "Pan conveyor motor winding temperature. Deep-pan conveyor (OSW-PE-SNL-PYR-01 Rev. 00). Unit: °C. Location: Stator winding RTD (PT100) in the motor terminal box / protection relay.",
    "machine": "CSL-01",
    "x": 0.7511486039571051,
    "y": -0.22035143625940562,
    "size": 1.8
  },
  {
    "id": "PRS-FSL-03",
    "label": "PRS-FSL-03",
    "detail": "FSL-01 · F3-03 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-3)",
    "description": "Silo DC inlet pressure. Silo level, gates, aeration and dust collection (OSW-PE-SNL-PYR-01 Rev. 02). Unit: mbar. Location: Silo level, gates, aeration and dust collection.",
    "machine": "FSL-01",
    "x": -0.8106763221127459,
    "y": -0.2513306314596438,
    "size": 1.8
  },
  {
    "id": "PRS-FSL-04",
    "label": "PRS-FSL-04",
    "detail": "FSL-01 · F3-04 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-3)",
    "description": "Silo DC outlet pressure. Silo level, gates, aeration and dust collection (OSW-PE-SNL-PYR-01 Rev. 02). Unit: mbar. Location: Silo level, gates, aeration and dust collection.",
    "machine": "FSL-01",
    "x": -0.7963247914908,
    "y": -0.24929042990593747,
    "size": 1.8
  },
  {
    "id": "WGT-KFS-04",
    "label": "WGT-KFS-04",
    "detail": "KFS-01 · F4-03 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-4)",
    "description": "Load cell 3. Kiln feed bin (OSW-PE-SNL-PYR-01 Rev. 02). Unit: t. Location: Kiln feed bin.",
    "machine": "KFS-01",
    "x": -0.6029101517345304,
    "y": -0.39450701183174913,
    "size": 1.8
  },
  {
    "id": "PRS-KFS-08",
    "label": "PRS-KFS-08",
    "detail": "KFS-01 · F4-06 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-4)",
    "description": "Bin DC inlet pressure. Kiln feed bin (OSW-PE-SNL-PYR-01 Rev. 02). Unit: mbar. Location: Kiln feed bin.",
    "machine": "KFS-01",
    "x": -0.5878704790428432,
    "y": -0.40355828102524277,
    "size": 1.8
  },
  {
    "id": "PRS-KFS-09",
    "label": "PRS-KFS-09",
    "detail": "KFS-01 · F4-07 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-4)",
    "description": "Bin DC outlet pressure. Kiln feed bin (OSW-PE-SNL-PYR-01 Rev. 02). Unit: mbar. Location: Kiln feed bin.",
    "machine": "KFS-01",
    "x": -0.5706314115567162,
    "y": -0.41158040458908685,
    "size": 1.8
  },
  {
    "id": "PRS-KFS-03",
    "label": "PRS-KFS-03",
    "detail": "KFS-01 · F5-01 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-5)",
    "description": "Slide B air pressure. Line A (running) and line B (standby / off) (OSW-PE-SNL-PYR-01 Rev. 02). Unit: mbar. Location: Line A (running) and line B (standby / off).",
    "machine": "KFS-01",
    "x": -0.5524931528499091,
    "y": -0.415122525229057,
    "size": 1.8
  },
  {
    "id": "ELE-KFS-04",
    "label": "ELE-KFS-04",
    "detail": "KFS-01 · F5-03 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-5)",
    "description": "Slide A blower motor current. Line A (running) and line B (standby / off) (OSW-PE-SNL-PYR-01 Rev. 02). Unit: % FLA. Location: Line A (running) and line B (standby / off).",
    "machine": "KFS-01",
    "x": -0.535033144936025,
    "y": -0.41383202740361613,
    "size": 1.8
  },
  {
    "id": "ELE-KFS-05",
    "label": "ELE-KFS-05",
    "detail": "KFS-01 · F5-06 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-5)",
    "description": "Slide B blower motor current. Line A (running) and line B (standby / off) (OSW-PE-SNL-PYR-01 Rev. 02). Unit: % FLA. Location: Line A (running) and line B (standby / off).",
    "machine": "KFS-01",
    "x": -0.5184485041766058,
    "y": -0.4100199068248661,
    "size": 1.8
  },
  {
    "id": "ELE-KFS-06",
    "label": "ELE-KFS-06",
    "detail": "KFS-01 · F6-01 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-6)",
    "description": "Common slide blower current. Common air slide (OSW-PE-SNL-PYR-01 Rev. 02). Unit: % FLA. Location: Common air slide.",
    "machine": "KFS-01",
    "x": -0.501291573595544,
    "y": -0.40655479225653257,
    "size": 1.8
  },
  {
    "id": "VIB-KFS-04",
    "label": "VIB-KFS-04",
    "detail": "KFS-01 · F7-03 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-7)",
    "description": "Head shaft vibration NDE. Bucket elevator (OSW-PE-SNL-PYR-01 Rev. 02). Unit: mm/s. Location: Bucket elevator.",
    "machine": "KFS-01",
    "x": -0.4819470178708246,
    "y": -0.4045910187624334,
    "size": 1.8
  },
  {
    "id": "TMP-KFS-03",
    "label": "TMP-KFS-03",
    "detail": "KFS-01 · F7-04 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-7)",
    "description": "Head bearing temp. NDE. Bucket elevator (OSW-PE-SNL-PYR-01 Rev. 02). Unit: °C. Location: Bucket elevator.",
    "machine": "KFS-01",
    "x": -0.4607665281395593,
    "y": -0.4026690178276048,
    "size": 1.8
  },
  {
    "id": "PRS-KFS-07",
    "label": "PRS-KFS-07",
    "detail": "KFS-01 · F7-05 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-7)",
    "description": "Preheater-top slide air pressure. Preheater-top air slide and airlocks (OSW-PE-SNL-PYR-01 Rev. 02). Unit: mbar. Location: Preheater-top air slide and airlocks.",
    "machine": "KFS-01",
    "x": -0.44109202968438044,
    "y": -0.3977437898603296,
    "size": 1.8
  },
  {
    "id": "ELE-KFS-07",
    "label": "ELE-KFS-07",
    "detail": "KFS-01 · F7-06 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-7)",
    "description": "Preheater-top slide blower current. Preheater-top air slide and airlocks (OSW-PE-SNL-PYR-01 Rev. 02). Unit: % FLA. Location: Preheater-top air slide and airlocks.",
    "machine": "KFS-01",
    "x": -0.42802836504227204,
    "y": -0.38738040208723495,
    "size": 1.8
  },
  {
    "id": "SPD-KFS-02",
    "label": "SPD-KFS-02",
    "detail": "KFS-01 · F7-08 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-7)",
    "description": "Rotary airlock 1 zero-speed (in series). Preheater-top air slide and airlocks (OSW-PE-SNL-PYR-01 Rev. 02). Unit: state. Location: Preheater-top air slide and airlocks.",
    "machine": "KFS-01",
    "x": -0.4254012506920467,
    "y": -0.37159041455732833,
    "size": 1.8
  },
  {
    "id": "SPD-KFS-03",
    "label": "SPD-KFS-03",
    "detail": "KFS-01 · F7-09 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram F-7)",
    "description": "Rotary airlock 2 zero-speed (in series). Preheater-top air slide and airlocks (OSW-PE-SNL-PYR-01 Rev. 02). Unit: state. Location: Preheater-top air slide and airlocks.",
    "machine": "KFS-01",
    "x": -0.43277254489023076,
    "y": -0.35306418186857236,
    "size": 1.8
  },
  {
    "id": "PRS-PHC-11",
    "label": "PRS-PHC-11",
    "detail": "PHC-01 · P2-01 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram P-2)",
    "description": "C1 cone pressure (tag on hold). Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C) (OSW-PE-SNL-PYR-01 Rev. 02). Unit: mbar. Location: Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C).",
    "machine": "PHC-01",
    "x": -0.18462837424391568,
    "y": -0.1556611484161501,
    "size": 1.8
  },
  {
    "id": "TMP-PHC-21",
    "label": "TMP-PHC-21",
    "detail": "PHC-01 · P2-02 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram P-2)",
    "description": "C1 cone temperature (tag on hold). Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C) (OSW-PE-SNL-PYR-01 Rev. 02). Unit: °C. Location: Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C).",
    "machine": "PHC-01",
    "x": -0.1926319610430445,
    "y": -0.1421846531665065,
    "size": 1.8
  },
  {
    "id": "PRS-PHC-12",
    "label": "PRS-PHC-12",
    "detail": "PHC-01 · P2-03 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram P-2)",
    "description": "C2 cone pressure (tag on hold). Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C) (OSW-PE-SNL-PYR-01 Rev. 02). Unit: mbar. Location: Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C).",
    "machine": "PHC-01",
    "x": -0.18987963434273178,
    "y": -0.13290449946571375,
    "size": 1.8
  },
  {
    "id": "TMP-PHC-22",
    "label": "TMP-PHC-22",
    "detail": "PHC-01 · P2-04 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram P-2)",
    "description": "C2 cone temperature (tag on hold). Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C) (OSW-PE-SNL-PYR-01 Rev. 02). Unit: °C. Location: Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C).",
    "machine": "PHC-01",
    "x": -0.17470071929420503,
    "y": -0.12573095018084984,
    "size": 1.8
  },
  {
    "id": "PRS-PHC-13",
    "label": "PRS-PHC-13",
    "detail": "PHC-01 · P2-05 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram P-2)",
    "description": "C3 cone pressure (tag on hold). Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C) (OSW-PE-SNL-PYR-01 Rev. 02). Unit: mbar. Location: Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C).",
    "machine": "PHC-01",
    "x": -0.1516721148959438,
    "y": -0.11780431855540648,
    "size": 1.8
  },
  {
    "id": "TMP-PHC-23",
    "label": "TMP-PHC-23",
    "detail": "PHC-01 · P2-06 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram P-2)",
    "description": "C3 cone temperature (tag on hold). Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C) (OSW-PE-SNL-PYR-01 Rev. 02). Unit: °C. Location: Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C).",
    "machine": "PHC-01",
    "x": -0.1291609506134457,
    "y": -0.10734321160559258,
    "size": 1.8
  },
  {
    "id": "PRS-PHC-14",
    "label": "PRS-PHC-14",
    "detail": "PHC-01 · P2-07 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram P-2)",
    "description": "C4 cone pressure (tag on hold). Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C) (OSW-PE-SNL-PYR-01 Rev. 02). Unit: mbar. Location: Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C).",
    "machine": "PHC-01",
    "x": -0.11483877773505269,
    "y": -0.09451293724871877,
    "size": 1.8
  },
  {
    "id": "TMP-PHC-24",
    "label": "TMP-PHC-24",
    "detail": "PHC-01 · P2-08 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram P-2)",
    "description": "C4 cone temperature (tag on hold). Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C) (OSW-PE-SNL-PYR-01 Rev. 02). Unit: °C. Location: Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C).",
    "machine": "PHC-01",
    "x": -0.11185496581488874,
    "y": -0.08085280026793153,
    "size": 1.8
  },
  {
    "id": "PRS-PHC-15",
    "label": "PRS-PHC-15",
    "detail": "PHC-01 · P2-09 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram P-2)",
    "description": "C5 cone pressure (tag on hold). Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C) (OSW-PE-SNL-PYR-01 Rev. 02). Unit: mbar. Location: Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C).",
    "machine": "PHC-01",
    "x": -0.11790239048522949,
    "y": -0.06785548019093565,
    "size": 1.8
  },
  {
    "id": "TMP-PHC-25",
    "label": "TMP-PHC-25",
    "detail": "PHC-01 · P2-10 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram P-2)",
    "description": "C5 cone temperature (tag on hold). Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C) (OSW-PE-SNL-PYR-01 Rev. 02). Unit: °C. Location: Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C).",
    "machine": "PHC-01",
    "x": -0.12754876386618566,
    "y": -0.05586220508402272,
    "size": 1.8
  },
  {
    "id": "PRS-PHC-16",
    "label": "PRS-PHC-16",
    "detail": "PHC-01 · P2-11 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram P-2)",
    "description": "C6 cone pressure (tag on hold). Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C) (OSW-PE-SNL-PYR-01 Rev. 02). Unit: mbar. Location: Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C).",
    "machine": "PHC-01",
    "x": -0.13615428805697125,
    "y": -0.0441250737319993,
    "size": 1.8
  },
  {
    "id": "TMP-PHC-26",
    "label": "TMP-PHC-26",
    "detail": "PHC-01 · P2-12 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram P-2)",
    "description": "C6 cone temperature (tag on hold). Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C) (OSW-PE-SNL-PYR-01 Rev. 02). Unit: °C. Location: Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C).",
    "machine": "PHC-01",
    "x": -0.14278045091447866,
    "y": -0.03193725812844689,
    "size": 1.8
  },
  {
    "id": "TMP-PHC-30",
    "label": "TMP-PHC-30",
    "detail": "PHC-01 · P3-01 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram P-3)",
    "description": "Gas out temp. (C1 top, before WHRS). Gas out, calciner, WHRS (OSW-PE-SNL-PYR-01 Rev. 02). Unit: °C. Location: Gas out, calciner, WHRS.",
    "machine": "PHC-01",
    "x": -0.15028416974417047,
    "y": -0.01985383591957257,
    "size": 1.8
  },
  {
    "id": "POS-PHC-03",
    "label": "POS-PHC-03",
    "detail": "PHC-01 · P3-02 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram P-3)",
    "description": "WHRS inlet damper. Gas out, calciner, WHRS (OSW-PE-SNL-PYR-01 Rev. 02). Unit: %. Location: Gas out, calciner, WHRS.",
    "machine": "PHC-01",
    "x": -0.16272528978920345,
    "y": -0.009886415284577635,
    "size": 1.8
  },
  {
    "id": "POS-PHC-04",
    "label": "POS-PHC-04",
    "detail": "PHC-01 · P3-03 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram P-3)",
    "description": "WHRS outlet damper. Gas out, calciner, WHRS (OSW-PE-SNL-PYR-01 Rev. 02). Unit: %. Location: Gas out, calciner, WHRS.",
    "machine": "PHC-01",
    "x": -0.18199072817905,
    "y": -0.0042893344796999106,
    "size": 1.8
  },
  {
    "id": "POS-PHC-05",
    "label": "POS-PHC-05",
    "detail": "PHC-01 · P3-04 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram P-3)",
    "description": "Main-line bypass damper. Gas out, calciner, WHRS (OSW-PE-SNL-PYR-01 Rev. 02). Unit: %. Location: Gas out, calciner, WHRS.",
    "machine": "PHC-01",
    "x": -0.20598776796586207,
    "y": -0.003657038162374629,
    "size": 1.8
  },
  {
    "id": "TMP-PHC-31",
    "label": "TMP-PHC-31",
    "detail": "PHC-01 · P3-05 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram P-3)",
    "description": "Gas temp. after WHRS (before ID fan). Gas out, calciner, WHRS (OSW-PE-SNL-PYR-01 Rev. 02). Unit: °C. Location: Gas out, calciner, WHRS.",
    "machine": "PHC-01",
    "x": -0.22962447130596383,
    "y": -0.005717559498129618,
    "size": 1.8
  },
  {
    "id": "PRS-BGH-03",
    "label": "PRS-BGH-03",
    "detail": "BGH-01 · G1-08 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram G-1)",
    "description": "Baghouse outlet pressure. Baghouse (OSW-PE-SNL-PYR-01 Rev. 02). Unit: mbar. Location: Baghouse.",
    "machine": "BGH-01",
    "x": 0.5321183348922824,
    "y": -0.3259049365399589,
    "size": 1.8
  },
  {
    "id": "LEV-BGH-02",
    "label": "LEV-BGH-02",
    "detail": "BGH-01 · G1-09 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram G-1)",
    "description": "Hopper 2 level switch. Baghouse (OSW-PE-SNL-PYR-01 Rev. 02). Unit: state. Location: Baghouse.",
    "machine": "BGH-01",
    "x": 0.5211076223560244,
    "y": -0.3196604774628221,
    "size": 1.8
  },
  {
    "id": "LEV-BGH-03",
    "label": "LEV-BGH-03",
    "detail": "BGH-01 · G1-10 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram G-1)",
    "description": "Hopper 3 level switch. Baghouse (OSW-PE-SNL-PYR-01 Rev. 02). Unit: state. Location: Baghouse.",
    "machine": "BGH-01",
    "x": 0.5150040859479379,
    "y": -0.3051892602582557,
    "size": 1.8
  },
  {
    "id": "SPD-BGH-02",
    "label": "SPD-BGH-02",
    "detail": "BGH-01 · G1-11 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram G-1)",
    "description": "Hopper 1 rotary airlock zero-speed. Baghouse (OSW-PE-SNL-PYR-01 Rev. 02). Unit: state. Location: Baghouse.",
    "machine": "BGH-01",
    "x": 0.508856075569539,
    "y": -0.2849358978637315,
    "size": 1.8
  },
  {
    "id": "SPD-BGH-03",
    "label": "SPD-BGH-03",
    "detail": "BGH-01 · G1-12 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram G-1)",
    "description": "Hopper 2 rotary airlock zero-speed. Baghouse (OSW-PE-SNL-PYR-01 Rev. 02). Unit: state. Location: Baghouse.",
    "machine": "BGH-01",
    "x": 0.49819137704693833,
    "y": -0.26471633008651635,
    "size": 1.8
  },
  {
    "id": "SPD-BGH-04",
    "label": "SPD-BGH-04",
    "detail": "BGH-01 · G1-13 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram G-1)",
    "description": "Hopper 3 rotary airlock zero-speed. Baghouse (OSW-PE-SNL-PYR-01 Rev. 02). Unit: state. Location: Baghouse.",
    "machine": "BGH-01",
    "x": 0.4815315713462637,
    "y": -0.2508660943931913,
    "size": 1.8
  },
  {
    "id": "GAS-BGH-02",
    "label": "GAS-BGH-02",
    "detail": "BGH-01 · G1-14 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram G-1)",
    "description": "Stack SOx. Stack (OSW-PE-SNL-PYR-01 Rev. 02). Unit: mg/Nm³. Location: Stack.",
    "machine": "BGH-01",
    "x": 0.46076935711496336,
    "y": -0.24702990922376705,
    "size": 1.8
  },
  {
    "id": "GAS-BGH-03",
    "label": "GAS-BGH-03",
    "detail": "BGH-01 · G1-15 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram G-1)",
    "description": "Stack NOx. Stack (OSW-PE-SNL-PYR-01 Rev. 02). Unit: mg/Nm³. Location: Stack.",
    "machine": "BGH-01",
    "x": 0.43939187025174314,
    "y": -0.25248464130565207,
    "size": 1.8
  },
  {
    "id": "GAS-BGH-04",
    "label": "GAS-BGH-04",
    "detail": "BGH-01 · G1-16 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram G-1)",
    "description": "Stack CO. Stack (OSW-PE-SNL-PYR-01 Rev. 02). Unit: mg/Nm³. Location: Stack.",
    "machine": "BGH-01",
    "x": 0.41999458713894483,
    "y": -0.2629577214452741,
    "size": 1.8
  },
  {
    "id": "GAS-BGH-05",
    "label": "GAS-BGH-05",
    "detail": "BGH-01 · G1-17 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram G-1)",
    "description": "Stack CO₂. Stack (OSW-PE-SNL-PYR-01 Rev. 02). Unit: %. Location: Stack.",
    "machine": "BGH-01",
    "x": 0.4028956806921095,
    "y": -0.27336071254842076,
    "size": 1.8
  },
  {
    "id": "VIB-KLN-05",
    "label": "VIB-KLN-05",
    "detail": "KLN-01 · K2-01 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram K-2)",
    "description": "Main motor vibration NDE. Main motor (with cooling fan) (OSW-PE-SNL-PYR-01 Rev. 02). Unit: mm/s. Location: Main motor (with cooling fan).",
    "machine": "KLN-01",
    "x": -0.07328417898590382,
    "y": 0.15930436657712427,
    "size": 1.8
  },
  {
    "id": "TMP-KLN-41",
    "label": "TMP-KLN-41",
    "detail": "KLN-01 · K2-02 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram K-2)",
    "description": "Winding temp. 1. Main motor (with cooling fan) (OSW-PE-SNL-PYR-01 Rev. 02). Unit: °C. Location: Main motor (with cooling fan).",
    "machine": "KLN-01",
    "x": -0.08974317297205434,
    "y": 0.1546438759229962,
    "size": 1.8
  },
  {
    "id": "TMP-KLN-42",
    "label": "TMP-KLN-42",
    "detail": "KLN-01 · K2-03 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram K-2)",
    "description": "Winding temp. 2. Main motor (with cooling fan) (OSW-PE-SNL-PYR-01 Rev. 02). Unit: °C. Location: Main motor (with cooling fan).",
    "machine": "KLN-01",
    "x": -0.10597180005076041,
    "y": 0.1498568979678934,
    "size": 1.8
  },
  {
    "id": "TMP-KLN-43",
    "label": "TMP-KLN-43",
    "detail": "KLN-01 · K2-04 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram K-2)",
    "description": "Winding temp. 3. Main motor (with cooling fan) (OSW-PE-SNL-PYR-01 Rev. 02). Unit: °C. Location: Main motor (with cooling fan).",
    "machine": "KLN-01",
    "x": -0.11993795594276953,
    "y": 0.14218951157216722,
    "size": 1.8
  },
  {
    "id": "TMP-KLN-44",
    "label": "TMP-KLN-44",
    "detail": "KLN-01 · K2-05 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram K-2)",
    "description": "Winding temp. 4. Main motor (with cooling fan) (OSW-PE-SNL-PYR-01 Rev. 02). Unit: °C. Location: Main motor (with cooling fan).",
    "machine": "KLN-01",
    "x": -0.12998012332098854,
    "y": 0.13113320342071152,
    "size": 1.8
  },
  {
    "id": "TMP-KLN-45",
    "label": "TMP-KLN-45",
    "detail": "KLN-01 · K2-06 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram K-2)",
    "description": "Winding temp. 5. Main motor (with cooling fan) (OSW-PE-SNL-PYR-01 Rev. 02). Unit: °C. Location: Main motor (with cooling fan).",
    "machine": "KLN-01",
    "x": -0.13697156559066698,
    "y": 0.11889634425378552,
    "size": 1.8
  },
  {
    "id": "TMP-KLN-46",
    "label": "TMP-KLN-46",
    "detail": "KLN-01 · K2-08 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram K-2)",
    "description": "Winding temp. 6. Main motor (with cooling fan) (OSW-PE-SNL-PYR-01 Rev. 02). Unit: °C. Location: Main motor (with cooling fan).",
    "machine": "KLN-01",
    "x": -0.14490110742821585,
    "y": 0.108894212677675,
    "size": 1.8
  },
  {
    "id": "STS-KLN-14",
    "label": "STS-KLN-14",
    "detail": "KLN-01 · K2-09 · Required",
    "kind": "instrument",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D (Diagram K-2)",
    "description": "Motor cooling fan. Main motor (with cooling fan) (OSW-PE-SNL-PYR-01 Rev. 02). Unit: state. Location: Main motor (with cooling fan).",
    "machine": "KLN-01",
    "x": -0.158999755690698,
    "y": 0.10334580224197204,
    "size": 1.8
  },
  {
    "id": "SNL:LEV-FSL-01",
    "label": "LEV-FSL-01",
    "detail": "FSL-01 · Sheet F-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-1",
    "description": "Silo level (radar, roof). Silo level (radar, roof). Class: ONLINE. Unit: %. Mounting: Silo roof, selected radial position / non-contact view.",
    "machine": "FSL-01",
    "x": -0.7467546530591407,
    "y": -0.10135071634166162,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-FSL-01",
    "label": "PRS-FSL-01",
    "detail": "FSL-01 · Sheet F-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-2",
    "description": "Aeration header pressure. Aeration header pressure. Class: ONLINE. Unit: mbar. Mounting: Fixed supply header upstream of aeration pads.",
    "machine": "FSL-01",
    "x": -0.7487544171109581,
    "y": -0.0972246788706324,
    "size": 1.4
  },
  {
    "id": "SNL:ELE-FSL-01",
    "label": "ELE-FSL-01",
    "detail": "FSL-01 · Sheet F-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-2",
    "description": "Aeration blower motor current. Aeration blower motor current. Class: ONLINE. Unit: % FLA. Mounting: MCC/VFD motor feeder.",
    "machine": "FSL-01",
    "x": -0.7501298951206483,
    "y": -0.09099135861526006,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-FSL-01",
    "label": "TMP-FSL-01",
    "detail": "FSL-01 · Sheet F-2 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-2",
    "description": "Aeration blower winding temp.. Aeration blower winding temp.. Class: ONLINE. Unit: °C. Mounting: Stator winding RTD (PT100) in the motor terminal box / protection relay.",
    "machine": "FSL-01",
    "x": -0.751994584152164,
    "y": -0.08346471542493196,
    "size": 1.4
  },
  {
    "id": "SNL:STS-FSL-03",
    "label": "STS-FSL-03",
    "detail": "FSL-01 · Sheet F-2 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-2",
    "description": "Slide purge sequence. Slide purge sequence. Class: ONLINE. Unit: status. Mounting: Silo aeration PLC / control cabinet.",
    "machine": "FSL-01",
    "x": -0.7552604616372178,
    "y": -0.07599329535157005,
    "size": 1.4
  },
  {
    "id": "SNL:POS-FSL-01",
    "label": "POS-FSL-01",
    "detail": "FSL-01 · Sheet F-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-1",
    "description": "Motorised gate 1 opening. Motorised gate 1 opening (manual + pneumatic gates not monitored). Class: ONLINE. Unit: %. Mounting: Motorised outlet gate 1 actuator position feedback.",
    "machine": "FSL-01",
    "x": -0.7602927021404224,
    "y": -0.07002057787824198,
    "size": 1.4
  },
  {
    "id": "SNL:POS-FSL-02",
    "label": "POS-FSL-02",
    "detail": "FSL-01 · Sheet F-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-1",
    "description": "Motorised gate 2 opening. Motorised gate 2 opening (manual + pneumatic gates not monitored). Class: ONLINE. Unit: %. Mounting: Motorised outlet gate 2 actuator position feedback.",
    "machine": "FSL-01",
    "x": -0.766823555170119,
    "y": -0.06659450316269015,
    "size": 1.4
  },
  {
    "id": "SNL:POS-FSL-03",
    "label": "POS-FSL-03",
    "detail": "FSL-01 · Sheet F-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-1",
    "description": "Motorised gate 3 opening. Motorised gate 3 opening (manual + pneumatic gates not monitored). Class: ONLINE. Unit: %. Mounting: Motorised outlet gate 3 actuator position feedback.",
    "machine": "FSL-01",
    "x": -0.7741463875490975,
    "y": -0.06602118963165673,
    "size": 1.4
  },
  {
    "id": "SNL:POS-FSL-04",
    "label": "POS-FSL-04",
    "detail": "FSL-01 · Sheet F-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-1",
    "description": "Motorised gate 4 opening. Motorised gate 4 opening (manual + pneumatic gates not monitored). Class: ONLINE. Unit: %. Mounting: Motorised outlet gate 4 actuator position feedback.",
    "machine": "FSL-01",
    "x": -0.7814796848653458,
    "y": -0.06780235484627198,
    "size": 1.4
  },
  {
    "id": "SNL:POS-FSL-05",
    "label": "POS-FSL-05",
    "detail": "FSL-01 · Sheet F-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-1",
    "description": "Motorised gate 5 opening. Motorised gate 5 opening (manual + pneumatic gates not monitored). Class: ONLINE. Unit: %. Mounting: Motorised outlet gate 5 actuator position feedback.",
    "machine": "FSL-01",
    "x": -0.7883159568187816,
    "y": -0.07087931341249967,
    "size": 1.4
  },
  {
    "id": "SNL:POS-FSL-06",
    "label": "POS-FSL-06",
    "detail": "FSL-01 · Sheet F-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-1",
    "description": "Motorised gate 6 opening. Motorised gate 6 opening (manual + pneumatic gates not monitored). Class: ONLINE. Unit: %. Mounting: Motorised outlet gate 6 actuator position feedback.",
    "machine": "FSL-01",
    "x": -0.7945871726607405,
    "y": -0.07407843802689723,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-FSL-03",
    "label": "PRS-FSL-03",
    "detail": "FSL-01 · Sheet F-3 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-3",
    "description": "Silo DC inlet pressure. Silo DC inlet pressure. Class: ONLINE. Unit: mbar. Mounting: Silo level, gates, aeration and dust collection — Silo DC inlet pressure.",
    "machine": "FSL-01",
    "x": -0.8005774341243397,
    "y": -0.0765694522315245,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-FSL-04",
    "label": "PRS-FSL-04",
    "detail": "FSL-01 · Sheet F-3 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-3",
    "description": "Silo DC outlet pressure. Silo DC outlet pressure. Class: ONLINE. Unit: mbar. Mounting: Silo level, gates, aeration and dust collection — Silo DC outlet pressure.",
    "machine": "FSL-01",
    "x": -0.8066458476703149,
    "y": -0.07814578895525369,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-FSL-02",
    "label": "PRS-FSL-02",
    "detail": "FSL-01 · Sheet F-3 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-3",
    "description": "Silo DC filter ΔP. Silo DC filter ΔP (calc = in − out). Class: CALC. Unit: mbar. Mounting: Calculated: PRS-FSL-03 − PRS-FSL-04.",
    "machine": "FSL-01",
    "x": -0.812922182036916,
    "y": -0.0792166938620852,
    "size": 1.4
  },
  {
    "id": "SNL:ELE-FSL-02",
    "label": "ELE-FSL-02",
    "detail": "FSL-01 · Sheet F-3 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-3",
    "description": "Silo DC fan motor current. Silo DC fan motor current. Class: ONLINE. Unit: % FLA. Mounting: Dust-collector fan MCC.",
    "machine": "FSL-01",
    "x": -0.8191543280808682,
    "y": -0.0805283360893657,
    "size": 1.4
  },
  {
    "id": "SNL:WGT-KFS-02",
    "label": "WGT-KFS-02",
    "detail": "KFS-01 · Sheet F-4 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-4",
    "description": "Load cell 1. Load cell 1. Class: ONLINE. Unit: t. Mounting: First load-cell support under the kiln feed bin.",
    "machine": "KFS-01",
    "x": -0.6448094830852774,
    "y": -0.222749429847798,
    "size": 1.4
  },
  {
    "id": "SNL:WGT-KFS-03",
    "label": "WGT-KFS-03",
    "detail": "KFS-01 · Sheet F-4 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-4",
    "description": "Load cell 2. Load cell 2. Class: ONLINE. Unit: t. Mounting: Second load-cell support under the kiln feed bin.",
    "machine": "KFS-01",
    "x": -0.6493962965574084,
    "y": -0.22611346328335244,
    "size": 1.4
  },
  {
    "id": "SNL:WGT-KFS-04",
    "label": "WGT-KFS-04",
    "detail": "KFS-01 · Sheet F-4 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-4",
    "description": "Load cell 3. Load cell 3. Class: ONLINE. Unit: t. Mounting: Kiln feed bin — Load cell 3.",
    "machine": "KFS-01",
    "x": -0.6528489162589642,
    "y": -0.2302799271424165,
    "size": 1.4
  },
  {
    "id": "SNL:WGT-KFS-01",
    "label": "WGT-KFS-01",
    "detail": "KFS-01 · Sheet F-4 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-4",
    "description": "Bin weight. Bin weight (calc = sum of 3 cells). Class: CALC. Unit: % cap.. Mounting: Weighing controller: sum of the three load cells under the kiln feed bin.",
    "machine": "KFS-01",
    "x": -0.6557607295731839,
    "y": -0.23447502281965044,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-KFS-08",
    "label": "PRS-KFS-08",
    "detail": "KFS-01 · Sheet F-4 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-4",
    "description": "Bin DC inlet pressure. Bin DC inlet pressure. Class: ONLINE. Unit: mbar. Mounting: Kiln feed bin — Bin DC inlet pressure.",
    "machine": "KFS-01",
    "x": -0.6593074633893496,
    "y": -0.2378446220482563,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-KFS-09",
    "label": "PRS-KFS-09",
    "detail": "KFS-01 · Sheet F-4 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-4",
    "description": "Bin DC outlet pressure. Bin DC outlet pressure. Class: ONLINE. Unit: mbar. Mounting: Kiln feed bin — Bin DC outlet pressure.",
    "machine": "KFS-01",
    "x": -0.66483814537913,
    "y": -0.23985644749230672,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-KFS-05",
    "label": "PRS-KFS-05",
    "detail": "KFS-01 · Sheet F-4 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-4",
    "description": "Bin DC filter ΔP. Bin DC filter ΔP (calc). Class: CALC. Unit: mbar. Mounting: Calculated: PRS-KFS-08 − PRS-KFS-09.",
    "machine": "KFS-01",
    "x": -0.6732766219373763,
    "y": -0.24056739433353347,
    "size": 1.4
  },
  {
    "id": "SNL:ELE-KFS-03",
    "label": "ELE-KFS-03",
    "detail": "KFS-01 · Sheet F-4 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-4",
    "description": "Bin DC fan motor current. Bin DC fan motor current. Class: ONLINE. Unit: % FLA. Mounting: Dust-collector fan MCC.",
    "machine": "KFS-01",
    "x": -0.6845880902204394,
    "y": -0.2406342917676286,
    "size": 1.4
  },
  {
    "id": "SNL:POS-KFS-01",
    "label": "POS-KFS-01",
    "detail": "KFS-01 · Sheet F-5 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-5",
    "description": "Discharge gate A. Discharge gate A. Class: ONLINE. Unit: status. Mounting: Discharge gate A limit switches.",
    "machine": "KFS-01",
    "x": -0.6975667514063552,
    "y": -0.24106299895582914,
    "size": 1.4
  },
  {
    "id": "SNL:POS-KFS-02",
    "label": "POS-KFS-02",
    "detail": "KFS-01 · Sheet F-5 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-5",
    "description": "Discharge gate B. Discharge gate B. Class: ONLINE. Unit: status. Mounting: Discharge gate B limit switches.",
    "machine": "KFS-01",
    "x": -0.7100829695022353,
    "y": -0.24280802371173454,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-KFS-01",
    "label": "PRS-KFS-01",
    "detail": "KFS-01 · Sheet F-5 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-5",
    "description": "Slide A air pressure. Slide A air pressure. Class: ONLINE. Unit: mbar. Mounting: Air-slide supply at the bin bottom, between slides A and B (sketch P1).",
    "machine": "KFS-01",
    "x": -0.7197371775328921,
    "y": -0.24639963097328038,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-KFS-03",
    "label": "PRS-KFS-03",
    "detail": "KFS-01 · Sheet F-5 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-5",
    "description": "Slide B air pressure. Slide B air pressure. Class: ONLINE. Unit: mbar. Mounting: Line A (running) and line B (standby / off) — Slide B air pressure.",
    "machine": "KFS-01",
    "x": -0.7246856937543569,
    "y": -0.2517590941872379,
    "size": 1.4
  },
  {
    "id": "SNL:ELE-KFS-04",
    "label": "ELE-KFS-04",
    "detail": "KFS-01 · Sheet F-5 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-5",
    "description": "Slide A blower motor current. Slide A blower motor current. Class: ONLINE. Unit: % FLA. Mounting: Line A (running) and line B (standby / off) — Slide A blower motor current.",
    "machine": "KFS-01",
    "x": -0.7243132515961905,
    "y": -0.2582742573396274,
    "size": 1.4
  },
  {
    "id": "SNL:ELE-KFS-05",
    "label": "ELE-KFS-05",
    "detail": "KFS-01 · Sheet F-5 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-5",
    "description": "Slide B blower motor current. Slide B blower motor current. Class: ONLINE. Unit: % FLA. Mounting: Line A (running) and line B (standby / off) — Slide B blower motor current.",
    "machine": "KFS-01",
    "x": -0.7194734366429407,
    "y": -0.2650888469840115,
    "size": 1.4
  },
  {
    "id": "SNL:FLO-KFS-01",
    "label": "FLO-KFS-01",
    "detail": "KFS-01 · Sheet F-6 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-6",
    "description": "SFM A feed rate. SFM A feed rate. Class: ONLINE. Unit: t/h. Mounting: Solid-flow meter A at the end of air slide A.",
    "machine": "KFS-01",
    "x": -0.7121868679016251,
    "y": -0.2714652239588379,
    "size": 1.4
  },
  {
    "id": "SNL:FLO-KFS-02",
    "label": "FLO-KFS-02",
    "detail": "KFS-01 · Sheet F-6 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-6",
    "description": "SFM B feed rate. SFM B feed rate. Class: ONLINE. Unit: t/h. Mounting: Solid-flow meter B on air slide B.",
    "machine": "KFS-01",
    "x": -0.7049083554909454,
    "y": -0.2770542534440208,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-KFS-02",
    "label": "PRS-KFS-02",
    "detail": "KFS-01 · Sheet F-6 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-6",
    "description": "P2 SFM A / P3 SFM B pressure (1). P2 SFM A / P3 SFM B pressure [position 1]. Class: ONLINE. Unit: mbar. Mounting: Solid-flow meter A pressure tap (sketch P2).",
    "machine": "KFS-01",
    "x": -0.6996534712431141,
    "y": -0.28195818798709804,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-KFS-06",
    "label": "PRS-KFS-06",
    "detail": "KFS-01 · Sheet F-6 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-6",
    "description": "P2 SFM A / P3 SFM B pressure (2). P2 SFM A / P3 SFM B pressure [position 2]. Class: ONLINE. Unit: mbar. Mounting: Solid-flow meter B pressure tap.",
    "machine": "KFS-01",
    "x": -0.6973333960929691,
    "y": -0.28657648256903606,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-KFS-04",
    "label": "PRS-KFS-04",
    "detail": "KFS-01 · Sheet F-6 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-6",
    "description": "Common slide air pressure. Common slide air pressure. Class: ONLINE. Unit: mbar. Mounting: Air box of the common slide to the elevator boot.",
    "machine": "KFS-01",
    "x": -0.6975576658798952,
    "y": -0.2913296719859524,
    "size": 1.4
  },
  {
    "id": "SNL:ELE-KFS-06",
    "label": "ELE-KFS-06",
    "detail": "KFS-01 · Sheet F-6 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-6",
    "description": "Common slide blower current. Common slide blower current. Class: ONLINE. Unit: % FLA. Mounting: Common air slide — Common slide blower current.",
    "machine": "KFS-01",
    "x": -0.6989651167883583,
    "y": -0.29641211759368774,
    "size": 1.4
  },
  {
    "id": "SNL:LEV-KFS-04",
    "label": "LEV-KFS-04",
    "detail": "KFS-01 · Sheet F-7 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-7",
    "description": "Boot level switch. Boot level switch. Class: ONLINE. Unit: status. Mounting: Bucket elevator boot casing (MoM-02).",
    "machine": "KFS-01",
    "x": -0.6999201196128858,
    "y": -0.3017039429227711,
    "size": 1.4
  },
  {
    "id": "SNL:LIM-KFS-01",
    "label": "LIM-KFS-01",
    "detail": "KFS-01 · Sheet F-7 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-7",
    "description": "Belt sway switch. Belt sway switch. Class: ONLINE. Unit: status. Mounting: Upper casing section, belt edges (MoM-02).",
    "machine": "KFS-01",
    "x": -0.6992610720518234,
    "y": -0.30688613970610673,
    "size": 1.4
  },
  {
    "id": "SNL:SPD-KFS-01",
    "label": "SPD-KFS-01",
    "detail": "KFS-01 · Sheet F-7 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-7",
    "description": "Zero-speed switch. Zero-speed switch (boot). Class: ONLINE. Unit: status. Mounting: Elevator head / tail shaft zero-speed switch.",
    "machine": "KFS-01",
    "x": -0.6967759293029714,
    "y": -0.3116932277590943,
    "size": 1.4
  },
  {
    "id": "SNL:VIB-KFS-01",
    "label": "VIB-KFS-01",
    "detail": "KFS-01 · Sheet F-7 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-7",
    "description": "Head shaft vibration DE. Head shaft vibration DE. Class: ONLINE. Unit: mm/s. Mounting: Drive-end bearing / gearbox housing at elevator head.",
    "machine": "KFS-01",
    "x": -0.693209164026278,
    "y": -0.3161596916159251,
    "size": 1.4
  },
  {
    "id": "SNL:VIB-KFS-04",
    "label": "VIB-KFS-04",
    "detail": "KFS-01 · Sheet F-7 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-7",
    "description": "Head shaft vibration NDE. Head shaft vibration NDE. Class: ONLINE. Unit: mm/s. Mounting: Bucket elevator — Head shaft vibration NDE.",
    "machine": "KFS-01",
    "x": -0.6898171876508766,
    "y": -0.32071019409225954,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-KFS-01",
    "label": "TMP-KFS-01",
    "detail": "KFS-01 · Sheet F-7 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-7",
    "description": "Head bearing temp. DE. Head bearing temp. DE. Class: ONLINE. Unit: °C. Mounting: Drive bearing block / existing pocket.",
    "machine": "KFS-01",
    "x": -0.6876898756111571,
    "y": -0.3260155521656388,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-KFS-03",
    "label": "TMP-KFS-03",
    "detail": "KFS-01 · Sheet F-7 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-7",
    "description": "Head bearing temp. NDE. Head bearing temp. NDE. Class: ONLINE. Unit: °C. Mounting: Bucket elevator — Head bearing temp. NDE.",
    "machine": "KFS-01",
    "x": -0.6871556370703105,
    "y": -0.332654593743452,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-KFS-02",
    "label": "TMP-KFS-02",
    "detail": "KFS-01 · Sheet F-7 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-7",
    "description": "Head motor winding temp.. Head motor winding temp.. Class: ONLINE. Unit: °C. Mounting: Stator winding RTD (PT100) in the motor terminal box / protection relay.",
    "machine": "KFS-01",
    "x": -0.687543580659683,
    "y": -0.34073005947750923,
    "size": 1.4
  },
  {
    "id": "SNL:ELE-KFS-01",
    "label": "ELE-KFS-01",
    "detail": "KFS-01 · Sheet F-7 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-7",
    "description": "Head motor current. Head motor current. Class: ONLINE. Unit: % FLA. Mounting: Elevator MCC/VFD panel.",
    "machine": "KFS-01",
    "x": -0.6874106153725812,
    "y": -0.34963042539313316,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-KFS-07",
    "label": "PRS-KFS-07",
    "detail": "KFS-01 · Sheet F-7 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-7",
    "description": "Preheater-top slide air pressure. Preheater-top slide air pressure. Class: ONLINE. Unit: mbar. Mounting: Preheater-top air slide and airlocks — Preheater-top slide air pressure.",
    "machine": "KFS-01",
    "x": -0.6851299737477585,
    "y": -0.3580827652577441,
    "size": 1.4
  },
  {
    "id": "SNL:ELE-KFS-07",
    "label": "ELE-KFS-07",
    "detail": "KFS-01 · Sheet F-7 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-7",
    "description": "Preheater-top slide blower current. Preheater-top slide blower current. Class: ONLINE. Unit: % FLA. Mounting: Preheater-top air slide and airlocks — Preheater-top slide blower current.",
    "machine": "KFS-01",
    "x": -0.6795763085822192,
    "y": -0.3645202703913289,
    "size": 1.4
  },
  {
    "id": "SNL:SPD-KFS-02",
    "label": "SPD-KFS-02",
    "detail": "KFS-01 · Sheet F-7 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-7",
    "description": "Rotary airlock 1 zero-speed. Rotary airlock 1 zero-speed (in series). Class: ONLINE. Unit: status. Mounting: Preheater-top air slide and airlocks — Rotary airlock 1 zero-speed (in series).",
    "machine": "KFS-01",
    "x": -0.6706029436832648,
    "y": -0.3676438999064907,
    "size": 1.4
  },
  {
    "id": "SNL:SPD-KFS-03",
    "label": "SPD-KFS-03",
    "detail": "KFS-01 · Sheet F-7 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-7",
    "description": "Rotary airlock 2 zero-speed. Rotary airlock 2 zero-speed (in series). Class: ONLINE. Unit: status. Mounting: Preheater-top air slide and airlocks — Rotary airlock 2 zero-speed (in series).",
    "machine": "KFS-01",
    "x": -0.6591047239143445,
    "y": -0.36695656821255085,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-PHC-01",
    "label": "PRS-PHC-01",
    "detail": "PHC-01 · Sheet P-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-1",
    "description": "C1 riser duct pressure. C1 riser duct pressure. Class: TAG HOLD. Unit: mbar. Mounting: Top gas duct pressure tap with purge.",
    "machine": "PHC-01",
    "x": -0.38664840378943405,
    "y": -0.18303965989617427,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-PHC-01",
    "label": "TMP-PHC-01",
    "detail": "PHC-01 · Sheet P-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-1",
    "description": "C1 riser duct temperature. C1 riser duct temperature. Class: TAG HOLD. Unit: °C. Mounting: Fixed outlet duct / accessible TC pocket C1.",
    "machine": "PHC-01",
    "x": -0.3748444796564784,
    "y": -0.17743500603003876,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-PHC-11",
    "label": "PRS-PHC-11",
    "detail": "PHC-01 · Sheet P-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-2",
    "description": "C1 cone pressure. C1 cone pressure. Class: TAG HOLD. Unit: mbar. Mounting: Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C) — C1 cone pressure.",
    "machine": "PHC-01",
    "x": -0.36474263764736364,
    "y": -0.17215442202403425,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-PHC-21",
    "label": "TMP-PHC-21",
    "detail": "PHC-01 · Sheet P-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-2",
    "description": "C1 cone temperature. C1 cone temperature. Class: TAG HOLD. Unit: °C. Mounting: Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C) — C1 cone temperature.",
    "machine": "PHC-01",
    "x": -0.35651030705009273,
    "y": -0.16899610075014143,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-PHC-02",
    "label": "PRS-PHC-02",
    "detail": "PHC-01 · Sheet P-1 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-1",
    "description": "C2 riser duct pressure. C2 riser duct pressure. Class: TAG HOLD. Unit: mbar. Mounting: C2 static-pressure tap.",
    "machine": "PHC-01",
    "x": -0.3495140126103913,
    "y": -0.1689335051020306,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-PHC-02",
    "label": "TMP-PHC-02",
    "detail": "PHC-01 · Sheet P-1 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-1",
    "description": "C2 riser duct temperature. C2 riser duct temperature. Class: TAG HOLD. Unit: °C. Mounting: C2 outlet duct / TC pocket.",
    "machine": "PHC-01",
    "x": -0.3427339898286474,
    "y": -0.1718181153008675,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-PHC-12",
    "label": "PRS-PHC-12",
    "detail": "PHC-01 · Sheet P-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-2",
    "description": "C2 cone pressure. C2 cone pressure. Class: TAG HOLD. Unit: mbar. Mounting: Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C) — C2 cone pressure.",
    "machine": "PHC-01",
    "x": -0.33529324674160255,
    "y": -0.17651044806290273,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-PHC-22",
    "label": "TMP-PHC-22",
    "detail": "PHC-01 · Sheet P-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-2",
    "description": "C2 cone temperature. C2 cone temperature. Class: TAG HOLD. Unit: °C. Mounting: Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C) — C2 cone temperature.",
    "machine": "PHC-01",
    "x": -0.3268420051763355,
    "y": -0.1813773973897357,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-PHC-03",
    "label": "PRS-PHC-03",
    "detail": "PHC-01 · Sheet P-1 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-1",
    "description": "C3 riser duct pressure. C3 riser duct pressure. Class: TAG HOLD. Unit: mbar. Mounting: C3 static-pressure tap.",
    "machine": "PHC-01",
    "x": -0.3176237553756719,
    "y": -0.18494375313707367,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-PHC-03",
    "label": "TMP-PHC-03",
    "detail": "PHC-01 · Sheet P-1 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-1",
    "description": "C3 riser duct temperature. C3 riser duct temperature. Class: TAG HOLD. Unit: °C. Mounting: C3 outlet duct / TC pocket.",
    "machine": "PHC-01",
    "x": -0.30821652709562525,
    "y": -0.18642654918715373,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-PHC-13",
    "label": "PRS-PHC-13",
    "detail": "PHC-01 · Sheet P-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-2",
    "description": "C3 cone pressure. C3 cone pressure. Class: TAG HOLD. Unit: mbar. Mounting: Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C) — C3 cone pressure.",
    "machine": "PHC-01",
    "x": -0.29910980954133687,
    "y": -0.18593797748983054,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-PHC-23",
    "label": "TMP-PHC-23",
    "detail": "PHC-01 · Sheet P-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-2",
    "description": "C3 cone temperature. C3 cone temperature. Class: TAG HOLD. Unit: °C. Mounting: Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C) — C3 cone temperature.",
    "machine": "PHC-01",
    "x": -0.2903615743866129,
    "y": -0.18429040004418212,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-PHC-04",
    "label": "PRS-PHC-04",
    "detail": "PHC-01 · Sheet P-1 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-1",
    "description": "C4 riser duct pressure. C4 riser duct pressure. Class: TAG HOLD. Unit: mbar. Mounting: C4 static-pressure tap.",
    "machine": "PHC-01",
    "x": -0.28153868208881977,
    "y": -0.1825102708595057,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-PHC-04",
    "label": "TMP-PHC-04",
    "detail": "PHC-01 · Sheet P-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-1",
    "description": "C4 riser duct temperature. C4 riser duct temperature. Class: TAG HOLD. Unit: °C. Mounting: C4 outlet duct / TC pocket.",
    "machine": "PHC-01",
    "x": -0.2719959845749341,
    "y": -0.18129057092603834,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-PHC-14",
    "label": "PRS-PHC-14",
    "detail": "PHC-01 · Sheet P-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-2",
    "description": "C4 cone pressure. C4 cone pressure. Class: TAG HOLD. Unit: mbar. Mounting: Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C) — C4 cone pressure.",
    "machine": "PHC-01",
    "x": -0.2613660292851784,
    "y": -0.1806306311253894,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-PHC-24",
    "label": "TMP-PHC-24",
    "detail": "PHC-01 · Sheet P-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-2",
    "description": "C4 cone temperature. C4 cone temperature. Class: TAG HOLD. Unit: °C. Mounting: Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C) — C4 cone temperature.",
    "machine": "PHC-01",
    "x": -0.2500034082054758,
    "y": -0.17982126872316162,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-PHC-05",
    "label": "PRS-PHC-05",
    "detail": "PHC-01 · Sheet P-1 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-1",
    "description": "C5 riser duct pressure. C5 riser duct pressure. Class: TAG HOLD. Unit: mbar. Mounting: C5 static-pressure tap.",
    "machine": "PHC-01",
    "x": -0.23912264882052356,
    "y": -0.17777422302889917,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-PHC-05",
    "label": "TMP-PHC-05",
    "detail": "PHC-01 · Sheet P-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-1",
    "description": "C5 riser duct temperature. C5 riser duct temperature. Class: TAG HOLD. Unit: °C. Mounting: C5 outlet duct / TC pocket.",
    "machine": "PHC-01",
    "x": -0.23049623594039437,
    "y": -0.17353981419679682,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-PHC-15",
    "label": "PRS-PHC-15",
    "detail": "PHC-01 · Sheet P-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-2",
    "description": "C5 cone pressure. C5 cone pressure. Class: TAG HOLD. Unit: mbar. Mounting: Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C) — C5 cone pressure.",
    "machine": "PHC-01",
    "x": -0.22578592907755501,
    "y": -0.1667746394547192,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-PHC-25",
    "label": "TMP-PHC-25",
    "detail": "PHC-01 · Sheet P-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-2",
    "description": "C5 cone temperature. C5 cone temperature. Class: TAG HOLD. Unit: °C. Mounting: Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C) — C5 cone temperature.",
    "machine": "PHC-01",
    "x": -0.22577111800834995,
    "y": -0.1579473346685481,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-PHC-06",
    "label": "PRS-PHC-06",
    "detail": "PHC-01 · Sheet P-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-1",
    "description": "C6 riser duct pressure. C6 riser duct pressure. Class: TAG HOLD. Unit: mbar. Mounting: Lowest stage/riser static tap with purge.",
    "machine": "PHC-01",
    "x": -0.2298200159736814,
    "y": -0.1481911858321922,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-PHC-06",
    "label": "TMP-PHC-06",
    "detail": "PHC-01 · Sheet P-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-1",
    "description": "C6 riser duct temperature. C6 riser duct temperature. Class: TAG HOLD. Unit: °C. Mounting: C6 outlet duct / TC pocket.",
    "machine": "PHC-01",
    "x": -0.2358765719951771,
    "y": -0.1388716214321043,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-PHC-16",
    "label": "PRS-PHC-16",
    "detail": "PHC-01 · Sheet P-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-2",
    "description": "C6 cone pressure. C6 cone pressure. Class: TAG HOLD. Unit: mbar. Mounting: Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C) — C6 cone pressure.",
    "machine": "PHC-01",
    "x": -0.24103145777345286,
    "y": -0.13106194246523173,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-PHC-26",
    "label": "TMP-PHC-26",
    "detail": "PHC-01 · Sheet P-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-2",
    "description": "C6 cone temperature. C6 cone temperature. Class: TAG HOLD. Unit: °C. Mounting: Cyclones C1–C6 (range: pressure −100…0 mbar, temperature 0–1200 °C) — C6 cone temperature.",
    "machine": "PHC-01",
    "x": -0.24249470263203304,
    "y": -0.12515631584113174,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-PHC-30",
    "label": "TMP-PHC-30",
    "detail": "PHC-01 · Sheet P-3 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-3",
    "description": "Gas out temp.. Gas out temp. (C1 top, before WHRS). Class: ONLINE. Unit: °C. Mounting: Gas out, calciner, WHRS — Gas out temp. (C1 top, before WHRS).",
    "machine": "PHC-01",
    "x": -0.2386011320926119,
    "y": -0.12078105863730587,
    "size": 1.4
  },
  {
    "id": "SNL:GAS-PHC-01",
    "label": "GAS-PHC-01",
    "detail": "PHC-01 · Sheet P-3 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-3",
    "description": "Gas out O₂. Gas out O₂. Class: ONLINE. Unit: %. Mounting: Existing analyzer sample system at exit.",
    "machine": "PHC-01",
    "x": -0.22944408704084368,
    "y": -0.1170270057148114,
    "size": 1.4
  },
  {
    "id": "SNL:GAS-PHC-02",
    "label": "GAS-PHC-02",
    "detail": "PHC-01 · Sheet P-3 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-3",
    "description": "Gas out CO. Gas out CO. Class: ONLINE. Unit: ppm. Mounting: Existing analyzer sampling point at exit.",
    "machine": "PHC-01",
    "x": -0.21687012303620226,
    "y": -0.11288208877793253,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-PHC-08",
    "label": "TMP-PHC-08",
    "detail": "PHC-01 · Sheet P-5 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-5",
    "description": "Calciner outlet temp.. Calciner outlet temp.. Class: ONLINE. Unit: °C. Mounting: Calciner outlet duct thermocouple.",
    "machine": "PHC-01",
    "x": -0.20382350652694067,
    "y": -0.10766006500536998,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-PHC-10",
    "label": "PRS-PHC-10",
    "detail": "PHC-01 · Sheet P-5 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-5",
    "description": "Calciner outlet draft. Calciner outlet draft. Class: ONLINE. Unit: mbar. Mounting: Calciner outlet / gooseneck static tap with purge.",
    "machine": "PHC-01",
    "x": -0.19329629032017123,
    "y": -0.10123518238058643,
    "size": 1.4
  },
  {
    "id": "SNL:GAS-PHC-03",
    "label": "GAS-PHC-03",
    "detail": "PHC-01 · Sheet P-5 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-5",
    "description": "Calciner outlet O₂. Calciner outlet O₂. Class: ONLINE. Unit: %. Mounting: Calciner outlet analyser probe.",
    "machine": "PHC-01",
    "x": -0.18730237899044824,
    "y": -0.09399415346036763,
    "size": 1.4
  },
  {
    "id": "SNL:GAS-PHC-04",
    "label": "GAS-PHC-04",
    "detail": "PHC-01 · Sheet P-5 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-5",
    "description": "Calciner outlet CO. Calciner outlet CO. Class: ONLINE. Unit: ppm. Mounting: Calciner outlet analyser probe.",
    "machine": "PHC-01",
    "x": -0.18628092572050745,
    "y": -0.08655591415528041,
    "size": 1.4
  },
  {
    "id": "SNL:POS-PHC-02",
    "label": "POS-PHC-02",
    "detail": "PHC-01 · Sheet P-5 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-5",
    "description": "Meal split gate opening. Meal split gate opening. Class: ONLINE. Unit: %. Mounting: Meal splitting gate below C5.",
    "machine": "PHC-01",
    "x": -0.18915026874070484,
    "y": -0.07941917320759959,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-PHC-07",
    "label": "TMP-PHC-07",
    "detail": "PHC-01 · Sheet P-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-2",
    "description": "Hot meal to kiln (kiln inlet feed temp.). Hot meal to kiln (kiln inlet feed temp.). Class: ONLINE. Unit: °C. Mounting: Bottom cyclone discharge / kiln meal chute pocket.",
    "machine": "PHC-01",
    "x": -0.19395773829988947,
    "y": -0.0727255653337818,
    "size": 1.4
  },
  {
    "id": "SNL:POS-PHC-03",
    "label": "POS-PHC-03",
    "detail": "PHC-01 · Sheet P-3 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-3",
    "description": "WHRS inlet damper. WHRS inlet damper. Class: ONLINE. Unit: %. Mounting: Gas out, calciner, WHRS — WHRS inlet damper.",
    "machine": "PHC-01",
    "x": -0.19882251057859054,
    "y": -0.06625982173842038,
    "size": 1.4
  },
  {
    "id": "SNL:POS-PHC-04",
    "label": "POS-PHC-04",
    "detail": "PHC-01 · Sheet P-3 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-3",
    "description": "WHRS outlet damper. WHRS outlet damper. Class: ONLINE. Unit: %. Mounting: Gas out, calciner, WHRS — WHRS outlet damper.",
    "machine": "PHC-01",
    "x": -0.2027552897368828,
    "y": -0.05968091001336699,
    "size": 1.4
  },
  {
    "id": "SNL:POS-PHC-05",
    "label": "POS-PHC-05",
    "detail": "PHC-01 · Sheet P-3 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-3",
    "description": "Main-line bypass damper. Main-line bypass damper. Class: ONLINE. Unit: %. Mounting: Gas out, calciner, WHRS — Main-line bypass damper.",
    "machine": "PHC-01",
    "x": -0.20600736946888482,
    "y": -0.05285266942347999,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-PHC-31",
    "label": "TMP-PHC-31",
    "detail": "PHC-01 · Sheet P-3 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-3",
    "description": "Gas temp. after WHRS. Gas temp. after WHRS (before ID fan). Class: ONLINE. Unit: °C. Mounting: Gas out, calciner, WHRS — Gas temp. after WHRS (before ID fan).",
    "machine": "PHC-01",
    "x": -0.20981962680543936,
    "y": -0.046082048489339,
    "size": 1.4
  },
  {
    "id": "SNL:POS-PHC-01",
    "label": "POS-PHC-01",
    "detail": "PHC-01 · Sheet P-3 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-3",
    "description": "ID fan inlet damper. ID fan inlet damper. Class: ONLINE. Unit: %. Mounting: Damper actuator feedback.",
    "machine": "PHC-01",
    "x": -0.21571102270044767,
    "y": -0.0401100667727201,
    "size": 1.4
  },
  {
    "id": "SNL:VIB-PHC-01",
    "label": "VIB-PHC-01",
    "detail": "PHC-01 · Sheet P-4 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-4",
    "description": "ID fan vibration DE. ID fan vibration DE. Class: ONLINE. Unit: mm/s. Mounting: ID fan drive-end bearing pedestal.",
    "machine": "PHC-01",
    "x": -0.22464680148982147,
    "y": -0.03582059214972666,
    "size": 1.4
  },
  {
    "id": "SNL:VIB-PHC-02",
    "label": "VIB-PHC-02",
    "detail": "PHC-01 · Sheet P-4 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-4",
    "description": "ID fan vibration NDE. ID fan vibration NDE. Class: ONLINE. Unit: mm/s. Mounting: ID fan opposite bearing pedestal.",
    "machine": "PHC-01",
    "x": -0.23647141055432191,
    "y": -0.03377923735588825,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-PHC-09",
    "label": "TMP-PHC-09",
    "detail": "PHC-01 · Sheet P-4 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-4",
    "description": "ID fan bearing temp. DE. ID fan bearing temp. DE. Class: ONLINE. Unit: °C. Mounting: DE bearing RTD pocket/housing.",
    "machine": "PHC-01",
    "x": -0.24986339563279863,
    "y": -0.03381766229000997,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-PHC-10",
    "label": "TMP-PHC-10",
    "detail": "PHC-01 · Sheet P-4 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-4",
    "description": "ID fan bearing temp. NDE. ID fan bearing temp. NDE. Class: ONLINE. Unit: °C. Mounting: NDE bearing RTD pocket/housing.",
    "machine": "PHC-01",
    "x": -0.2628295416296531,
    "y": -0.034883774890202696,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-PHC-11",
    "label": "TMP-PHC-11",
    "detail": "PHC-01 · Sheet P-4 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-4",
    "description": "ID fan motor winding temp.. ID fan motor winding temp.. Class: ONLINE. Unit: °C. Mounting: Stator winding RTD (PT100) in the motor terminal box / protection relay.",
    "machine": "PHC-01",
    "x": -0.27351280465420474,
    "y": -0.03527637991075823,
    "size": 1.4
  },
  {
    "id": "SNL:ELE-PHC-01",
    "label": "ELE-PHC-01",
    "detail": "PHC-01 · Sheet P-4 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-4",
    "description": "ID fan motor power. ID fan motor power. Class: ONLINE. Unit: % rated. Mounting: ID fan motor VFD/MCC.",
    "machine": "PHC-01",
    "x": -0.2809518685946119,
    "y": -0.03321482194049241,
    "size": 1.4
  },
  {
    "id": "SNL:SPD-PHC-01",
    "label": "SPD-PHC-01",
    "detail": "PHC-01 · Sheet P-4 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-4",
    "description": "ID fan speed. ID fan speed (VFD). Class: ONLINE. Unit: rpm. Mounting: Motor VFD actual speed / shaft encoder.",
    "machine": "PHC-01",
    "x": -0.2854585657851738,
    "y": -0.02753450569727882,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-BGH-02",
    "label": "PRS-BGH-02",
    "detail": "BGH-01 · Sheet G-1 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-1",
    "description": "Baghouse inlet pressure. Baghouse inlet pressure. Class: ONLINE. Unit: mbar. Mounting: Baghouse inlet duct static tap.",
    "machine": "BGH-01",
    "x": 0.4915434791556784,
    "y": -0.3382222917713395,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-BGH-03",
    "label": "PRS-BGH-03",
    "detail": "BGH-01 · Sheet G-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-1",
    "description": "Baghouse outlet pressure. Baghouse outlet pressure. Class: ONLINE. Unit: mbar. Mounting: Baghouse — Baghouse outlet pressure.",
    "machine": "BGH-01",
    "x": 0.48813303227963933,
    "y": -0.32655172407592126,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-BGH-01",
    "label": "PRS-BGH-01",
    "detail": "BGH-01 · Sheet G-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-1",
    "description": "Bag ΔP. Bag ΔP (calc = in − out). Class: CALC. Unit: mbar. Mounting: Calculated: PRS-BGH-02 − PRS-BGH-03.",
    "machine": "BGH-01",
    "x": 0.482675402226627,
    "y": -0.31473282433589383,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-BGH-02",
    "label": "TMP-BGH-02",
    "detail": "BGH-01 · Sheet G-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-1",
    "description": "Baghouse inlet temp.. Baghouse inlet temp.. Class: ONLINE. Unit: °C. Mounting: Baghouse inlet duct thermocouple.",
    "machine": "BGH-01",
    "x": 0.47443043316182976,
    "y": -0.30519111149031297,
    "size": 1.4
  },
  {
    "id": "SNL:STS-BGH-01",
    "label": "STS-BGH-01",
    "detail": "BGH-01 · Sheet G-1 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-1",
    "description": "Pulse-jet cleaning. Pulse-jet cleaning. Class: ONLINE. Unit: status. Mounting: Pulse controller / PLC.",
    "machine": "BGH-01",
    "x": 0.4637335264540449,
    "y": -0.29974938993338196,
    "size": 1.4
  },
  {
    "id": "SNL:LEV-BGH-01",
    "label": "LEV-BGH-01",
    "detail": "BGH-01 · Sheet G-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-1",
    "description": "Hopper 1 level switch. Hopper 1 level switch. Class: ONLINE. Unit: status. Mounting: Bottom dust-collection hopper (MoM-02).",
    "machine": "BGH-01",
    "x": 0.45170436754755944,
    "y": -0.2990330622662996,
    "size": 1.4
  },
  {
    "id": "SNL:LEV-BGH-02",
    "label": "LEV-BGH-02",
    "detail": "BGH-01 · Sheet G-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-1",
    "description": "Hopper 2 level switch. Hopper 2 level switch. Class: ONLINE. Unit: status. Mounting: Baghouse — Hopper 2 level switch.",
    "machine": "BGH-01",
    "x": 0.4396555091639551,
    "y": -0.3023320840953221,
    "size": 1.4
  },
  {
    "id": "SNL:LEV-BGH-03",
    "label": "LEV-BGH-03",
    "detail": "BGH-01 · Sheet G-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-1",
    "description": "Hopper 3 level switch. Hopper 3 level switch. Class: ONLINE. Unit: status. Mounting: Baghouse — Hopper 3 level switch.",
    "machine": "BGH-01",
    "x": 0.4285008092254796,
    "y": -0.307965739791211,
    "size": 1.4
  },
  {
    "id": "SNL:SPD-BGH-02",
    "label": "SPD-BGH-02",
    "detail": "BGH-01 · Sheet G-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-1",
    "description": "Hopper 1 rotary airlock zero-speed. Hopper 1 rotary airlock zero-speed. Class: ONLINE. Unit: status. Mounting: Baghouse — Hopper 1 rotary airlock zero-speed.",
    "machine": "BGH-01",
    "x": 0.41844436890433967,
    "y": -0.31398965077642227,
    "size": 1.4
  },
  {
    "id": "SNL:SPD-BGH-03",
    "label": "SPD-BGH-03",
    "detail": "BGH-01 · Sheet G-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-1",
    "description": "Hopper 2 rotary airlock zero-speed. Hopper 2 rotary airlock zero-speed. Class: ONLINE. Unit: status. Mounting: Baghouse — Hopper 2 rotary airlock zero-speed.",
    "machine": "BGH-01",
    "x": 0.4090770355529138,
    "y": -0.3189466468306152,
    "size": 1.4
  },
  {
    "id": "SNL:SPD-BGH-04",
    "label": "SPD-BGH-04",
    "detail": "BGH-01 · Sheet G-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-1",
    "description": "Hopper 3 rotary airlock zero-speed. Hopper 3 rotary airlock zero-speed. Class: ONLINE. Unit: status. Mounting: Baghouse — Hopper 3 rotary airlock zero-speed.",
    "machine": "BGH-01",
    "x": 0.3997964976330757,
    "y": -0.32235341296904746,
    "size": 1.4
  },
  {
    "id": "SNL:VIB-BGH-01",
    "label": "VIB-BGH-01",
    "detail": "BGH-01 · Sheet G-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-2",
    "description": "Baghouse fan vibration. Baghouse fan vibration. Class: ONLINE. Unit: mm/s. Mounting: Baghouse fan bearing pedestal.",
    "machine": "BGH-01",
    "x": 0.3903022823382248,
    "y": -0.32473636981518433,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-BGH-01",
    "label": "TMP-BGH-01",
    "detail": "BGH-01 · Sheet G-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-2",
    "description": "Baghouse fan bearing temp.. Baghouse fan bearing temp.. Class: ONLINE. Unit: °C. Mounting: Baghouse fan bearing RTD.",
    "machine": "BGH-01",
    "x": 0.3808797683499126,
    "y": -0.32722894112512346,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-BGH-03",
    "label": "TMP-BGH-03",
    "detail": "BGH-01 · Sheet G-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-2",
    "description": "Baghouse fan motor winding temp.. Baghouse fan motor winding temp.. Class: ONLINE. Unit: °C. Mounting: Stator winding RTD (PT100) in the motor terminal box / protection relay.",
    "machine": "BGH-01",
    "x": 0.3722971734926886,
    "y": -0.33093078115679747,
    "size": 1.4
  },
  {
    "id": "SNL:ELE-BGH-01",
    "label": "ELE-BGH-01",
    "detail": "BGH-01 · Sheet G-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-2",
    "description": "Baghouse fan motor current. Baghouse fan motor current. Class: ONLINE. Unit: % FLA. Mounting: Baghouse fan MCC / VFD.",
    "machine": "BGH-01",
    "x": 0.3653441572327851,
    "y": -0.33632569169826476,
    "size": 1.4
  },
  {
    "id": "SNL:SPD-BGH-01",
    "label": "SPD-BGH-01",
    "detail": "BGH-01 · Sheet G-2 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-2",
    "description": "Baghouse fan speed. Baghouse fan speed. Class: ONLINE. Unit: rpm. Mounting: Baghouse fan VFD.",
    "machine": "BGH-01",
    "x": 0.36024024106520436,
    "y": -0.34301850526343314,
    "size": 1.4
  },
  {
    "id": "SNL:GAS-BGH-01",
    "label": "GAS-BGH-01",
    "detail": "BGH-01 · Sheet G-1 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-1",
    "description": "Stack dust. Stack dust. Class: ONLINE. Unit: mg/Nm³. Mounting: Stack CEMS link.",
    "machine": "BGH-01",
    "x": 0.3562351946156763,
    "y": -0.34990089970468596,
    "size": 1.4
  },
  {
    "id": "SNL:GAS-BGH-02",
    "label": "GAS-BGH-02",
    "detail": "BGH-01 · Sheet G-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-1",
    "description": "Stack SOx. Stack SOx. Class: ONLINE. Unit: mg/Nm³. Mounting: Stack — Stack SOx.",
    "machine": "BGH-01",
    "x": 0.3516592560819456,
    "y": -0.355660793201078,
    "size": 1.4
  },
  {
    "id": "SNL:GAS-BGH-03",
    "label": "GAS-BGH-03",
    "detail": "BGH-01 · Sheet G-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-1",
    "description": "Stack NOx. Stack NOx. Class: ONLINE. Unit: mg/Nm³. Mounting: Stack — Stack NOx.",
    "machine": "BGH-01",
    "x": 0.34448069686498345,
    "y": -0.35939731678960735,
    "size": 1.4
  },
  {
    "id": "SNL:GAS-BGH-04",
    "label": "GAS-BGH-04",
    "detail": "BGH-01 · Sheet G-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-1",
    "description": "Stack CO. Stack CO. Class: ONLINE. Unit: mg/Nm³. Mounting: Stack — Stack CO.",
    "machine": "BGH-01",
    "x": 0.3331808285953203,
    "y": -0.3610604821134238,
    "size": 1.4
  },
  {
    "id": "SNL:GAS-BGH-05",
    "label": "GAS-BGH-05",
    "detail": "BGH-01 · Sheet G-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-1",
    "description": "Stack CO₂. Stack CO₂. Class: ONLINE. Unit: %. Mounting: Stack — Stack CO₂.",
    "machine": "BGH-01",
    "x": 0.3175782730120121,
    "y": -0.3615183881871453,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-KLN-13",
    "label": "TMP-KLN-13",
    "detail": "KLN-01 · Sheet K-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-1",
    "description": "Kiln inlet gas temp.. Kiln inlet gas temp.. Class: ONLINE. Unit: °C. Mounting: Inlet chamber thermocouple.",
    "machine": "KLN-01",
    "x": -0.16078525768290924,
    "y": 0.07777505664356948,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-KLN-01",
    "label": "PRS-KLN-01",
    "detail": "KLN-01 · Sheet K-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-1",
    "description": "Kiln inlet draft. Kiln inlet draft. Class: ONLINE. Unit: mbar. Mounting: Inlet static pressure port.",
    "machine": "KLN-01",
    "x": -0.1789264352656126,
    "y": 0.07536059634909971,
    "size": 1.4
  },
  {
    "id": "SNL:GAS-KLN-01",
    "label": "GAS-KLN-01",
    "detail": "KLN-01 · Sheet K-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-1",
    "description": "Inlet O₂. Inlet O₂. Class: ONLINE. Unit: %. Mounting: Kiln inlet analyzer sample system.",
    "machine": "KLN-01",
    "x": -0.19332222681633934,
    "y": 0.07034475682699405,
    "size": 1.4
  },
  {
    "id": "SNL:GAS-KLN-02",
    "label": "GAS-KLN-02",
    "detail": "KLN-01 · Sheet K-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-1",
    "description": "Inlet CO. Inlet CO. Class: ONLINE. Unit: ppm. Mounting: Kiln inlet analyzer sample system.",
    "machine": "KLN-01",
    "x": -0.20111169920471927,
    "y": 0.06271605546320833,
    "size": 1.4
  },
  {
    "id": "SNL:GAS-KLN-03",
    "label": "GAS-KLN-03",
    "detail": "KLN-01 · Sheet K-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-1",
    "description": "Inlet NOx. Inlet NOx. Class: ONLINE. Unit: ppm. Mounting: Existing kiln-inlet analyzer sample line.",
    "machine": "KLN-01",
    "x": -0.201128166024022,
    "y": 0.05328226448346761,
    "size": 1.4
  },
  {
    "id": "SNL:STS-KLN-06",
    "label": "STS-KLN-06",
    "detail": "KLN-01 · Sheet K-1 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-1",
    "description": "Inlet analyser status. Inlet analyser status. Class: ONLINE. Unit: status. Mounting: Analyzer sample system & controller.",
    "machine": "KLN-01",
    "x": -0.19433947326412732,
    "y": 0.04327773220715077,
    "size": 1.4
  },
  {
    "id": "SNL:VIB-KLN-01",
    "label": "VIB-KLN-01",
    "detail": "KLN-01 · Sheet K-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "description": "Main motor vibration DE. Main motor vibration DE. Class: ONLINE. Unit: mm/s. Mounting: Motor DE bearing housing.",
    "machine": "KLN-01",
    "x": -0.1835044469319201,
    "y": 0.03383395940428237,
    "size": 1.4
  },
  {
    "id": "SNL:VIB-KLN-05",
    "label": "VIB-KLN-05",
    "detail": "KLN-01 · Sheet K-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "description": "Main motor vibration NDE. Main motor vibration NDE. Class: ONLINE. Unit: mm/s. Mounting: Main motor (with cooling fan) — Main motor vibration NDE.",
    "machine": "KLN-01",
    "x": -0.17217179049760548,
    "y": 0.025556829986495087,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-KLN-19",
    "label": "TMP-KLN-19",
    "detail": "KLN-01 · Sheet K-2 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "description": "Main motor bearing temp. DE. Main motor bearing temp. DE. Class: ONLINE. Unit: °C. Mounting: Motor DE RTD pocket.",
    "machine": "KLN-01",
    "x": -0.16341822739462603,
    "y": 0.018389911558282884,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-KLN-20",
    "label": "TMP-KLN-20",
    "detail": "KLN-01 · Sheet K-2 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "description": "Main motor bearing temp. NDE. Main motor bearing temp. NDE. Class: ONLINE. Unit: °C. Mounting: Motor NDE RTD pocket.",
    "machine": "KLN-01",
    "x": -0.15882818521718348,
    "y": 0.011798465797097974,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-KLN-41",
    "label": "TMP-KLN-41",
    "detail": "KLN-01 · Sheet K-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "description": "Winding temp. 1. Winding temp. 1. Class: ONLINE. Unit: °C. Mounting: Main motor (with cooling fan) — Winding temp. 1.",
    "machine": "KLN-01",
    "x": -0.15811122572359856,
    "y": 0.005153843024133039,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-KLN-42",
    "label": "TMP-KLN-42",
    "detail": "KLN-01 · Sheet K-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "description": "Winding temp. 2. Winding temp. 2. Class: ONLINE. Unit: °C. Mounting: Main motor (with cooling fan) — Winding temp. 2.",
    "machine": "KLN-01",
    "x": -0.1594810747410758,
    "y": -0.0018930284667925783,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-KLN-43",
    "label": "TMP-KLN-43",
    "detail": "KLN-01 · Sheet K-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "description": "Winding temp. 3. Winding temp. 3. Class: ONLINE. Unit: °C. Mounting: Main motor (with cooling fan) — Winding temp. 3.",
    "machine": "KLN-01",
    "x": -0.16059935374328432,
    "y": -0.00924462311903336,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-KLN-44",
    "label": "TMP-KLN-44",
    "detail": "KLN-01 · Sheet K-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "description": "Winding temp. 4. Winding temp. 4. Class: ONLINE. Unit: °C. Mounting: Main motor (with cooling fan) — Winding temp. 4.",
    "machine": "KLN-01",
    "x": -0.15965663711254888,
    "y": -0.016478378878347164,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-KLN-45",
    "label": "TMP-KLN-45",
    "detail": "KLN-01 · Sheet K-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "description": "Winding temp. 5. Winding temp. 5. Class: ONLINE. Unit: °C. Mounting: Main motor (with cooling fan) — Winding temp. 5.",
    "machine": "KLN-01",
    "x": -0.15612169347648855,
    "y": -0.023184081738285154,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-KLN-46",
    "label": "TMP-KLN-46",
    "detail": "KLN-01 · Sheet K-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "description": "Winding temp. 6. Winding temp. 6. Class: ONLINE. Unit: °C. Mounting: Main motor (with cooling fan) — Winding temp. 6.",
    "machine": "KLN-01",
    "x": -0.15085171449256593,
    "y": -0.02932493598834535,
    "size": 1.4
  },
  {
    "id": "SNL:STS-KLN-14",
    "label": "STS-KLN-14",
    "detail": "KLN-01 · Sheet K-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "description": "Motor cooling fan. Motor cooling fan. Class: ONLINE. Unit: status. Mounting: Main motor (with cooling fan) — Motor cooling fan.",
    "machine": "KLN-01",
    "x": -0.1455474915151961,
    "y": -0.03540695492533816,
    "size": 1.4
  },
  {
    "id": "SNL:STS-KLN-12",
    "label": "STS-KLN-12",
    "detail": "KLN-01 · Sheet K-2 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "description": "Drive health. Drive health (VFD). Class: ONLINE. Unit: status. Mounting: Drive panel / DCS health flags.",
    "machine": "KLN-01",
    "x": -0.14182759639299422,
    "y": -0.0423291344546851,
    "size": 1.4
  },
  {
    "id": "SNL:ELE-KLN-01",
    "label": "ELE-KLN-01",
    "detail": "KLN-01 · Sheet K-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "description": "Motor torque / load. Motor torque / load. Class: ONLINE. Unit: % rated. Mounting: Drive VFD/MCC.",
    "machine": "KLN-01",
    "x": -0.14035690475827425,
    "y": -0.05094665456081619,
    "size": 1.4
  },
  {
    "id": "SNL:SPD-KLN-01",
    "label": "SPD-KLN-01",
    "detail": "KLN-01 · Sheet K-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "description": "Kiln speed. Kiln speed. Class: ONLINE. Unit: rpm. Mounting: Drive VFD / rotation pickup.",
    "machine": "KLN-01",
    "x": -0.14042871066684307,
    "y": -0.06153530886620545,
    "size": 1.4
  },
  {
    "id": "SNL:VIB-KLN-02",
    "label": "VIB-KLN-02",
    "detail": "KLN-01 · Sheet K-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "description": "Gearbox input / output vibration (1). Gearbox input / output vibration [position 1]. Class: ONLINE. Unit: mm/s. Mounting: Gearbox input bearing housing.",
    "machine": "KLN-01",
    "x": -0.14018654519643725,
    "y": -0.0734202090629368,
    "size": 1.4
  },
  {
    "id": "SNL:VIB-KLN-03",
    "label": "VIB-KLN-03",
    "detail": "KLN-01 · Sheet K-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "description": "Gearbox input / output vibration (2). Gearbox input / output vibration [position 2]. Class: ONLINE. Unit: mm/s. Mounting: Gearbox output bearing housing.",
    "machine": "KLN-01",
    "x": -0.13738044182002165,
    "y": -0.08498363559698034,
    "size": 1.4
  },
  {
    "id": "SNL:VIB-KLN-04",
    "label": "VIB-KLN-04",
    "detail": "KLN-01 · Sheet K-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "description": "Pinion bearing vibration. Pinion bearing vibration. Class: ONLINE. Unit: mm/s. Mounting: Pinion girth-gear side bearing block.",
    "machine": "KLN-01",
    "x": -0.13031464576483692,
    "y": -0.09411044359428698,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-KLN-22",
    "label": "TMP-KLN-22",
    "detail": "KLN-01 · Sheet K-2 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "description": "Gearbox input / output bearing temp. (1). Gearbox input / output bearing temp. [position 1]. Class: ONLINE. Unit: °C. Mounting: Input-side bearing RTD.",
    "machine": "KLN-01",
    "x": -0.11856485716009746,
    "y": -0.09893141263356313,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-KLN-23",
    "label": "TMP-KLN-23",
    "detail": "KLN-01 · Sheet K-2 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "description": "Gearbox input / output bearing temp. (2). Gearbox input / output bearing temp. [position 2]. Class: ONLINE. Unit: °C. Mounting: Output-side bearing RTD.",
    "machine": "KLN-01",
    "x": -0.10315474296562946,
    "y": -0.09857498247678602,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-KLN-04",
    "label": "PRS-KLN-04",
    "detail": "KLN-01 · Sheet K-4 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-4",
    "description": "Oil supply pressure. Oil supply pressure. Class: ONLINE. Unit: bar. Mounting: Gearbox oil supply header.",
    "machine": "KLN-01",
    "x": -0.08612888091396853,
    "y": -0.09360781056109717,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-KLN-15",
    "label": "TMP-KLN-15",
    "detail": "KLN-01 · Sheet K-4 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-4",
    "description": "Oil temp.. Oil temp.. Class: ONLINE. Unit: °C. Mounting: Circulating lube oil tank/return.",
    "machine": "KLN-01",
    "x": -0.06972763148197444,
    "y": -0.08595486267639331,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-KLN-05",
    "label": "PRS-KLN-05",
    "detail": "KLN-01 · Sheet K-4 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-4",
    "description": "Oil filter ΔP. Oil filter ΔP. Class: ONLINE. Unit: bar. Mounting: Across oil filter inlet/outlet piping.",
    "machine": "KLN-01",
    "x": -0.055536960938332075,
    "y": -0.07829797347234219,
    "size": 1.4
  },
  {
    "id": "SNL:FLO-KLN-05",
    "label": "FLO-KLN-05",
    "detail": "KLN-01 · Sheet K-4 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-4",
    "description": "Oil flow switch. Oil flow switch. Class: ONLINE. Unit: status. Mounting: Supply oil flow switch.",
    "machine": "KLN-01",
    "x": -0.04397999281770291,
    "y": -0.07317009383647365,
    "size": 1.4
  },
  {
    "id": "SNL:LEV-KLN-01",
    "label": "LEV-KLN-01",
    "detail": "KLN-01 · Sheet K-4 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-4",
    "description": "Oil tank level switch. Oil tank level switch. Class: ONLINE. Unit: status. Mounting: Gearbox oil tank level switch.",
    "machine": "KLN-01",
    "x": -0.034345262796096274,
    "y": -0.0720955383886324,
    "size": 1.4
  },
  {
    "id": "SNL:LAB-KLN-01",
    "label": "LAB-KLN-01",
    "detail": "KLN-01 · Sheet K-4 · MANUAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-4",
    "description": "Oil lab sample (Fe, water, viscosity). Oil lab sample (Fe, water, viscosity). Class: MANUAL. Unit: ppm Fe. Mounting: Oil sample port on the lube tank / return line.",
    "machine": "KLN-01",
    "x": -0.02529338111798196,
    "y": -0.07511429293622895,
    "size": 1.4
  },
  {
    "id": "SNL:STS-KLN-05",
    "label": "STS-KLN-05",
    "detail": "KLN-01 · Sheet K-5 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-5",
    "description": "Spray controller. Spray controller. Class: ONLINE. Unit: status. Mounting: Open gear spray controller.",
    "machine": "KLN-01",
    "x": -0.01556881157351541,
    "y": -0.08087327116789833,
    "size": 1.4
  },
  {
    "id": "SNL:PRX-KLN-01",
    "label": "PRX-KLN-01",
    "detail": "KLN-01 · Sheet K-5 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-5",
    "description": "Spray circuit 1 pulse. Spray circuit 1 pulse. Class: ONLINE. Unit: status. Mounting: At OEM metering divider / delivery circuit, not unguarded spray tip.",
    "machine": "KLN-01",
    "x": -0.004565941060421895,
    "y": -0.08723433973715077,
    "size": 1.4
  },
  {
    "id": "SNL:PRX-KLN-02",
    "label": "PRX-KLN-02",
    "detail": "KLN-01 · Sheet K-5 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-5",
    "description": "Spray circuit 2 pulse. Spray circuit 2 pulse. Class: ONLINE. Unit: status. Mounting: At OEM metering divider / delivery circuit, not unguarded spray tip.",
    "machine": "KLN-01",
    "x": 0.007508866810819012,
    "y": -0.0921376415633478,
    "size": 1.4
  },
  {
    "id": "SNL:PRX-KLN-03",
    "label": "PRX-KLN-03",
    "detail": "KLN-01 · Sheet K-5 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-5",
    "description": "Spray circuit 3 pulse. Spray circuit 3 pulse. Class: ONLINE. Unit: status. Mounting: At OEM metering divider / delivery circuit, not unguarded spray tip.",
    "machine": "KLN-01",
    "x": 0.019923466693805136,
    "y": -0.09435994846636084,
    "size": 1.4
  },
  {
    "id": "SNL:PRX-KLN-04",
    "label": "PRX-KLN-04",
    "detail": "KLN-01 · Sheet K-5 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-5",
    "description": "Spray circuit 4 pulse. Spray circuit 4 pulse. Class: ONLINE. Unit: status. Mounting: At OEM metering divider / delivery circuit, not unguarded spray tip.",
    "machine": "KLN-01",
    "x": 0.03196892066676646,
    "y": -0.0938632391535568,
    "size": 1.4
  },
  {
    "id": "SNL:PRX-KLN-05",
    "label": "PRX-KLN-05",
    "detail": "KLN-01 · Sheet K-5 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-5",
    "description": "Spray circuit 5 pulse. Spray circuit 5 pulse. Class: ONLINE. Unit: status. Mounting: At OEM metering divider / delivery circuit, not unguarded spray tip.",
    "machine": "KLN-01",
    "x": 0.04345325159027283,
    "y": -0.09161283500539097,
    "size": 1.4
  },
  {
    "id": "SNL:PRX-KLN-06",
    "label": "PRX-KLN-06",
    "detail": "KLN-01 · Sheet K-5 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-5",
    "description": "Spray circuit 6 pulse. Spray circuit 6 pulse. Class: ONLINE. Unit: status. Mounting: At OEM metering divider / delivery circuit, not unguarded spray tip.",
    "machine": "KLN-01",
    "x": 0.054852077729964435,
    "y": -0.08897568837159792,
    "size": 1.4
  },
  {
    "id": "SNL:STS-KLN-11",
    "label": "STS-KLN-11",
    "detail": "KLN-01 · Sheet K-3 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-3",
    "description": "Auxiliary drive. Auxiliary drive. Class: ONLINE. Unit: status. Mounting: Auxiliary drive PLC/MCC.",
    "machine": "KLN-01",
    "x": 0.06700783555089114,
    "y": -0.08698650972711572,
    "size": 1.4
  },
  {
    "id": "SNL:LIM-KLN-01",
    "label": "LIM-KLN-01",
    "detail": "KLN-01 · Sheet K-3 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-3",
    "description": "Brake pad wear. Brake pad wear. Class: ONLINE. Unit: status. Mounting: Brake caliper or wear-indicator provision.",
    "machine": "KLN-01",
    "x": 0.08051163669324844,
    "y": -0.08581612196850724,
    "size": 1.4
  },
  {
    "id": "SNL:MIG-KLN-01",
    "label": "MIG-KLN-01",
    "detail": "KLN-01 · Sheet K-6 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "description": "Tyre 1 migration. Tyre 1 migration. Class: ONLINE. Unit: mm/rev. Mounting: Tyre 1: reference on rotating shell + tyre, fixed protected pickup.",
    "machine": "KLN-01",
    "x": 0.09508730782629728,
    "y": -0.08467502822402706,
    "size": 1.4
  },
  {
    "id": "SNL:MIG-KLN-02",
    "label": "MIG-KLN-02",
    "detail": "KLN-01 · Sheet K-6 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "description": "Tyre 2 migration. Tyre 2 migration. Class: ONLINE. Unit: mm/rev. Mounting: Tyre 2: reference on rotating shell + tyre, fixed protected pickup.",
    "machine": "KLN-01",
    "x": 0.10933024375170249,
    "y": -0.08218361642650714,
    "size": 1.4
  },
  {
    "id": "SNL:MIG-KLN-03",
    "label": "MIG-KLN-03",
    "detail": "KLN-01 · Sheet K-6 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "description": "Tyre 3 migration. Tyre 3 migration. Class: ONLINE. Unit: mm/rev. Mounting: Tyre 3: reference on rotating shell + tyre, fixed protected pickup.",
    "machine": "KLN-01",
    "x": 0.12100945798481978,
    "y": -0.07703013948009077,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-KLN-28",
    "label": "TMP-KLN-28",
    "detail": "KLN-01 · Sheet K-6 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "description": "Tyre 1 temp.. Tyre 1 temp.. Class: ONLINE. Unit: °C. Mounting: Tyre 1 IR / DCS TYRE TEMP.",
    "machine": "KLN-01",
    "x": 0.12787967584938134,
    "y": -0.0686122120131936,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-KLN-29",
    "label": "TMP-KLN-29",
    "detail": "KLN-01 · Sheet K-6 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "description": "Tyre 2 temp.. Tyre 2 temp.. Class: ONLINE. Unit: °C. Mounting: Tyre 2 IR / DCS TYRE TEMP.",
    "machine": "KLN-01",
    "x": 0.1286909093187456,
    "y": -0.05737102947514722,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-KLN-30",
    "label": "TMP-KLN-30",
    "detail": "KLN-01 · Sheet K-6 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "description": "Tyre 3 temp.. Tyre 3 temp.. Class: ONLINE. Unit: °C. Mounting: Tyre 3 IR / DCS TYRE TEMP.",
    "machine": "KLN-01",
    "x": 0.1239501938419746,
    "y": -0.044670697233510054,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-KLN-01",
    "label": "TMP-KLN-01",
    "detail": "KLN-01 · Sheet K-6 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "description": "Station 1 roller bearings L-A. Station 1 roller bearings L-A. Class: ONLINE. Unit: °C. Mounting: Roller station 1, left shaft bearing A RTD pocket.",
    "machine": "KLN-01",
    "x": 0.11605527020349508,
    "y": -0.032280886163748246,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-KLN-02",
    "label": "TMP-KLN-02",
    "detail": "KLN-01 · Sheet K-6 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "description": "Station 1 roller bearings L-B. Station 1 roller bearings L-B. Class: ONLINE. Unit: °C. Mounting: Roller station 1, left shaft bearing B RTD pocket.",
    "machine": "KLN-01",
    "x": 0.10866548589271806,
    "y": -0.02169572330234303,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-KLN-03",
    "label": "TMP-KLN-03",
    "detail": "KLN-01 · Sheet K-6 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "description": "Station 1 roller bearings R-A. Station 1 roller bearings R-A. Class: ONLINE. Unit: °C. Mounting: Roller station 1, right shaft bearing A RTD pocket.",
    "machine": "KLN-01",
    "x": 0.1054995095172968,
    "y": -0.013587686685910528,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-KLN-04",
    "label": "TMP-KLN-04",
    "detail": "KLN-01 · Sheet K-6 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "description": "Station 1 roller bearings R-B. Station 1 roller bearings R-B. Class: ONLINE. Unit: °C. Mounting: Roller station 1, right shaft bearing B RTD pocket.",
    "machine": "KLN-01",
    "x": 0.1090104351734512,
    "y": -0.007625545240945865,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-KLN-05",
    "label": "TMP-KLN-05",
    "detail": "KLN-01 · Sheet K-6 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "description": "Station 2 roller bearings L-A. Station 2 roller bearings L-A. Class: ONLINE. Unit: °C. Mounting: Roller station 2, left shaft bearing A RTD pocket.",
    "machine": "KLN-01",
    "x": 0.11946709532051768,
    "y": -0.00271540240485826,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-KLN-06",
    "label": "TMP-KLN-06",
    "detail": "KLN-01 · Sheet K-6 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "description": "Station 2 roller bearings L-B. Station 2 roller bearings L-B. Class: ONLINE. Unit: °C. Mounting: Roller station 2, left shaft bearing B RTD pocket.",
    "machine": "KLN-01",
    "x": 0.13482398758408337,
    "y": 0.0024662349194500242,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-KLN-07",
    "label": "TMP-KLN-07",
    "detail": "KLN-01 · Sheet K-6 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "description": "Station 2 roller bearings R-A. Station 2 roller bearings R-A. Class: ONLINE. Unit: °C. Mounting: Roller station 2, right shaft bearing A RTD pocket.",
    "machine": "KLN-01",
    "x": 0.15144774611689163,
    "y": 0.00890140786753689,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-KLN-08",
    "label": "TMP-KLN-08",
    "detail": "KLN-01 · Sheet K-6 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "description": "Station 2 roller bearings R-B. Station 2 roller bearings R-B. Class: ONLINE. Unit: °C. Mounting: Roller station 2, right shaft bearing B RTD pocket.",
    "machine": "KLN-01",
    "x": 0.16541774787458957,
    "y": 0.01687726214225379,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-KLN-09",
    "label": "TMP-KLN-09",
    "detail": "KLN-01 · Sheet K-6 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "description": "Station 3 roller bearings L-A. Station 3 roller bearings L-A. Class: ONLINE. Unit: °C. Mounting: Roller station 3, left shaft bearing A RTD pocket.",
    "machine": "KLN-01",
    "x": 0.1738827855324827,
    "y": 0.02598917816386971,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-KLN-10",
    "label": "TMP-KLN-10",
    "detail": "KLN-01 · Sheet K-6 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "description": "Station 3 roller bearings L-B. Station 3 roller bearings L-B. Class: ONLINE. Unit: °C. Mounting: Roller station 3, left shaft bearing B RTD pocket.",
    "machine": "KLN-01",
    "x": 0.17593730023990684,
    "y": 0.035462976307039755,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-KLN-11",
    "label": "TMP-KLN-11",
    "detail": "KLN-01 · Sheet K-6 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "description": "Station 3 roller bearings R-A. Station 3 roller bearings R-A. Class: ONLINE. Unit: °C. Mounting: Roller station 3, right shaft bearing A RTD pocket.",
    "machine": "KLN-01",
    "x": 0.1726881752492875,
    "y": 0.04460762760549197,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-KLN-12",
    "label": "TMP-KLN-12",
    "detail": "KLN-01 · Sheet K-6 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "description": "Station 3 roller bearings R-B. Station 3 roller bearings R-B. Class: ONLINE. Unit: °C. Mounting: Roller station 3, right shaft bearing B RTD pocket.",
    "machine": "KLN-01",
    "x": 0.16652692843303893,
    "y": 0.05315598286887281,
    "size": 1.4
  },
  {
    "id": "SNL:POS-KLN-01",
    "label": "POS-KLN-01",
    "detail": "KLN-01 · Sheet K-7 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-7",
    "description": "Axial position (min / max per shift = calc). Axial position (min / max per shift = calc). Class: ONLINE¹. Unit: mm. Mounting: Hydraulic thrust LVDT / position feedback.",
    "machine": "KLN-01",
    "x": 0.15995342784606553,
    "y": 0.06131868743781596,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-KLN-07",
    "label": "PRS-KLN-07",
    "detail": "KLN-01 · Sheet K-7 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-7",
    "description": "Thrust hydraulic pressure. Thrust hydraulic pressure. Class: ONLINE. Unit: bar. Mounting: Thrust power-pack/actuator header.",
    "machine": "KLN-01",
    "x": 0.15447332090320925,
    "y": 0.0695313260738242,
    "size": 1.4
  },
  {
    "id": "SNL:POS-KLN-02",
    "label": "POS-KLN-02",
    "detail": "KLN-01 · Sheet K-7 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-7",
    "description": "Travel limit switches. Travel limit switches. Class: ONLINE. Unit: status. Mounting: Thrust upper/lower limit switches.",
    "machine": "KLN-01",
    "x": 0.1500384960847292,
    "y": 0.07804020737981114,
    "size": 1.4
  },
  {
    "id": "SNL:STS-KLN-08",
    "label": "STS-KLN-08",
    "detail": "KLN-01 · Sheet K-8 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-8",
    "description": "Shell scanner: max temp. + position, min temp. + position. Shell scanner: max temp. + position, min temp. + position. Class: ONLINE. Unit: °C / m. Mounting: External shell scanner (shell maximum and its position along the kiln).",
    "machine": "KLN-01",
    "x": 0.14524535180023215,
    "y": 0.08656551140628863,
    "size": 1.4
  },
  {
    "id": "SNL:MAN-KLN-01",
    "label": "MAN-KLN-01",
    "detail": "KLN-01 · Sheet K-8 · MANUAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-8",
    "description": "Handheld shell scan. Handheld shell scan. Class: MANUAL. Unit: °C. Mounting: Handheld IR at the same station / metre / angle as the scanner.",
    "machine": "KLN-01",
    "x": 0.13816477441107516,
    "y": 0.09425312555214221,
    "size": 1.4
  },
  {
    "id": "SNL:STS-KLN-13",
    "label": "STS-KLN-13",
    "detail": "KLN-01 · Sheet K-8 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-8",
    "description": "Shell cooling fans. Shell cooling fans. Class: ONLINE. Unit: status. Mounting: Shell cooling fan starters / DCS.",
    "machine": "KLN-01",
    "x": 0.12740202476830442,
    "y": 0.09998767505951232,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-KLN-26",
    "label": "TMP-KLN-26",
    "detail": "KLN-01 · Sheet K-9 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-9",
    "description": "Cow-shell temp.. Cow-shell temp.. Class: ONLINE. Unit: °C. Mounting: Specified shroud skin/protected bracket.",
    "machine": "KLN-01",
    "x": 0.11289429943273958,
    "y": 0.10295316589609833,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-KLN-25",
    "label": "TMP-KLN-25",
    "detail": "KLN-01 · Sheet K-9 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-9",
    "description": "Outlet cooling air temp.. Outlet cooling air temp.. Class: ONLINE. Unit: °C. Mounting: Stationary supply duct before sector plate system.",
    "machine": "KLN-01",
    "x": 0.09608439218494788,
    "y": 0.10318405332661136,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-KLN-14",
    "label": "TMP-KLN-14",
    "detail": "KLN-01 · Sheet K-9 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-9",
    "description": "Burning-zone temp.. Burning-zone temp. (pyrometer). Class: ONLINE. Unit: °C. Mounting: Burning-zone camera/pyrometer.",
    "machine": "KLN-01",
    "x": 0.07939752663675946,
    "y": 0.1018216560841254,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-KLN-27",
    "label": "TMP-KLN-27",
    "detail": "KLN-01 · Sheet K-9 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-9",
    "description": "Hood temp.. Hood temp.. Class: ONLINE. Unit: °C. Mounting: Existing hood TC pocket - confirm measurand.",
    "machine": "KLN-01",
    "x": 0.06526280329303497,
    "y": 0.10089987537911635,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-KLN-03",
    "label": "PRS-KLN-03",
    "detail": "KLN-01 · Sheet K-9 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-9",
    "description": "Hood pressure. Hood pressure. Class: ONLINE. Unit: mbar. Mounting: Hood static pressure port.",
    "machine": "KLN-01",
    "x": 0.05511976273974606,
    "y": 0.10268731593544377,
    "size": 1.4
  },
  {
    "id": "SNL:CAM-BRN-01",
    "label": "CAM-BRN-01",
    "detail": "BRN-01 · Sheet B-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-1",
    "description": "Flame camera. Flame camera. Class: ONLINE. Unit: status. Mounting: Shielded burner hood sight port.",
    "machine": "BRN-01",
    "x": 0.1288479244854137,
    "y": 0.4288208281241699,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-BRN-02",
    "label": "TMP-BRN-02",
    "detail": "BRN-01 · Sheet B-1 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-1",
    "description": "Secondary air temp.. Secondary air temp.. Class: ONLINE. Unit: °C. Mounting: Hood / secondary air entry TC/pyrometer port.",
    "machine": "BRN-01",
    "x": 0.12485893936642742,
    "y": 0.43958217232086166,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-BRN-03",
    "label": "PRS-BRN-03",
    "detail": "BRN-01 · Sheet B-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-1",
    "description": "Burner axial air pressure. Burner axial air pressure. Class: ONLINE. Unit: mbar. Mounting: Burner axial (jet) air line upstream of the tip.",
    "machine": "BRN-01",
    "x": 0.12079128806100767,
    "y": 0.4536363330470863,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-BRN-02",
    "label": "PRS-BRN-02",
    "detail": "BRN-01 · Sheet B-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-1",
    "description": "Burner swirl air pressure. Burner swirl air pressure. Class: ONLINE. Unit: mbar. Mounting: Burner swirl (helical) air line test port.",
    "machine": "BRN-01",
    "x": 0.11448402037005528,
    "y": 0.4683740148716611,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-BRN-04",
    "label": "PRS-BRN-04",
    "detail": "BRN-01 · Sheet B-4 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-4",
    "description": "Coal line pressure. Coal line pressure. Class: ONLINE. Unit: mbar. Mounting: Kiln coal pneumatic delivery header.",
    "machine": "BRN-01",
    "x": 0.10479682491271593,
    "y": 0.4807537487669896,
    "size": 1.4
  },
  {
    "id": "SNL:FLO-BRN-01",
    "label": "FLO-BRN-01",
    "detail": "BRN-01 · Sheet B-3 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-3",
    "description": "Kiln coal flow. Kiln coal flow (feeder). Class: ONLINE. Unit: t/h. Mounting: Kiln solid-fuel dosing flowmeter.",
    "machine": "BRN-01",
    "x": 0.0919335370835822,
    "y": 0.48832682211567957,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-BRN-01",
    "label": "PRS-BRN-01",
    "detail": "BRN-01 · Sheet B-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-1",
    "description": "PA header pressure. PA header pressure. Class: ONLINE. Unit: mbar. Mounting: Primary-air header downstream of the PA fan.",
    "machine": "BRN-01",
    "x": 0.07716760671478673,
    "y": 0.49004456486850434,
    "size": 1.4
  },
  {
    "id": "SNL:VIB-BRN-01",
    "label": "VIB-BRN-01",
    "detail": "BRN-01 · Sheet B-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-2",
    "description": "PA fan vibration. PA fan vibration. Class: ONLINE. Unit: mm/s. Mounting: Fan DE bearing/pedestal.",
    "machine": "BRN-01",
    "x": 0.062145039239357214,
    "y": 0.48653162016973367,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-BRN-01",
    "label": "TMP-BRN-01",
    "detail": "BRN-01 · Sheet B-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-2",
    "description": "PA fan bearing temp.. PA fan bearing temp.. Class: ONLINE. Unit: °C. Mounting: Bearing housing RTD pocket.",
    "machine": "BRN-01",
    "x": 0.04812323375936312,
    "y": 0.4797271000020302,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-BRN-05",
    "label": "TMP-BRN-05",
    "detail": "BRN-01 · Sheet B-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-2",
    "description": "PA fan motor winding temp.. PA fan motor winding temp.. Class: ONLINE. Unit: °C. Mounting: Stator winding RTD (PT100) in the motor terminal box / protection relay.",
    "machine": "BRN-01",
    "x": 0.03551021648525241,
    "y": 0.4720553454347398,
    "size": 1.4
  },
  {
    "id": "SNL:ELE-BRN-01",
    "label": "ELE-BRN-01",
    "detail": "BRN-01 · Sheet B-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-2",
    "description": "PA fan motor current. PA fan motor current. Class: ONLINE. Unit: % FLA. Mounting: MCC/VFD.",
    "machine": "BRN-01",
    "x": 0.023900199948741853,
    "y": 0.4654779666593299,
    "size": 1.4
  },
  {
    "id": "SNL:LEV-BRN-01",
    "label": "LEV-BRN-01",
    "detail": "BRN-01 · Sheet B-3 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-3",
    "description": "Coal bin level. Coal bin level. Class: ONLINE. Unit: %. Mounting: Bin top radar / level measurement.",
    "machine": "BRN-01",
    "x": 0.012543281515999968,
    "y": 0.4608176625398854,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-BRN-04",
    "label": "TMP-BRN-04",
    "detail": "BRN-01 · Sheet B-3 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-3",
    "description": "Coal bin temp.. Coal bin temp.. Class: ONLINE. Unit: °C. Mounting: Existing protected sensor at designated bin level.",
    "machine": "BRN-01",
    "x": 0.000966440677590788,
    "y": 0.45761669266999444,
    "size": 1.4
  },
  {
    "id": "SNL:GAS-BRN-01",
    "label": "GAS-BRN-01",
    "detail": "BRN-01 · Sheet B-3 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-3",
    "description": "Coal bin CO. Coal bin CO. Class: ONLINE. Unit: ppm. Mounting: OEM-approved gas sampling / analyzer location.",
    "machine": "BRN-01",
    "x": -0.010611927265789883,
    "y": 0.45455608198111364,
    "size": 1.4
  },
  {
    "id": "SNL:STS-BRN-02",
    "label": "STS-BRN-02",
    "detail": "BRN-01 · Sheet B-3 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-3",
    "description": "Nitrogen purging. Nitrogen purging. Class: ONLINE. Unit: status. Mounting: Fine-coal bin — Nitrogen purging.",
    "machine": "BRN-01",
    "x": -0.02132322581257945,
    "y": 0.4502200575015369,
    "size": 1.4
  },
  {
    "id": "SNL:STS-BRN-01",
    "label": "STS-BRN-01",
    "detail": "BRN-01 · Sheet B-3 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-3",
    "description": "Bin aeration blower. Bin aeration blower. Class: ONLINE. Unit: status. Mounting: Fine-coal bin — Bin aeration blower.",
    "machine": "BRN-01",
    "x": -0.030154572683113043,
    "y": 0.44384902211388944,
    "size": 1.4
  },
  {
    "id": "SNL:ELE-BRN-03",
    "label": "ELE-BRN-03",
    "detail": "BRN-01 · Sheet B-3 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-3",
    "description": "Aeration blower motor current. Aeration blower motor current. Class: ONLINE. Unit: % FLA. Mounting: Fine-coal bin — Aeration blower motor current.",
    "machine": "BRN-01",
    "x": -0.03667328451985513,
    "y": 0.43574313201975223,
    "size": 1.4
  },
  {
    "id": "SNL:FLO-BRN-02",
    "label": "FLO-BRN-02",
    "detail": "BRN-01 · Sheet P-5 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-5",
    "description": "Calciner coal flow. Calciner coal flow (to calciner burner). Class: ONLINE. Unit: t/h. Mounting: Calciner coal dosing feeder / flowmeter.",
    "machine": "BRN-01",
    "x": -0.04158142330015768,
    "y": 0.4271454324832805,
    "size": 1.4
  },
  {
    "id": "SNL:VIB-BRN-02",
    "label": "VIB-BRN-02",
    "detail": "BRN-01 · Sheet B-4 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-4",
    "description": "Coal blower vibration. Coal blower vibration. Class: ONLINE. Unit: mm/s. Mounting: Roots blower bearing housing / gearbox.",
    "machine": "BRN-01",
    "x": -0.0467589202904892,
    "y": 0.4196714799505885,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-BRN-06",
    "label": "TMP-BRN-06",
    "detail": "BRN-01 · Sheet B-4 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-4",
    "description": "Coal blower motor winding temp.. Coal blower motor winding temp.. Class: ONLINE. Unit: °C. Mounting: Stator winding RTD (PT100) in the motor terminal box / protection relay.",
    "machine": "BRN-01",
    "x": -0.05467781089333333,
    "y": 0.4145543609332636,
    "size": 1.4
  },
  {
    "id": "SNL:ELE-BRN-02",
    "label": "ELE-BRN-02",
    "detail": "BRN-01 · Sheet B-4 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-4",
    "description": "Coal blower motor current. Coal blower motor current. Class: ONLINE. Unit: % FLA. Mounting: Blower MCC/VFD.",
    "machine": "BRN-01",
    "x": -0.0673725706451285,
    "y": 0.41205104699197853,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-BRN-03",
    "label": "TMP-BRN-03",
    "detail": "BRN-01 · Sheet P-5 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-5",
    "description": "TAD temp. before damper. TAD temp. before damper. Class: ONLINE. Unit: °C. Mounting: Tertiary-air duct thermocouple.",
    "machine": "BRN-01",
    "x": -0.0853914526156846,
    "y": 0.4112766606144085,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-BRN-07",
    "label": "TMP-BRN-07",
    "detail": "BRN-01 · Sheet P-5 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-5",
    "description": "TAD temp. after damper. TAD temp. after damper. Class: ONLINE. Unit: °C. Mounting: Tertiary-air duct — TAD temp. after damper.",
    "machine": "BRN-01",
    "x": -0.1072126329260649,
    "y": 0.41053660523880564,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-BRN-05",
    "label": "PRS-BRN-05",
    "detail": "BRN-01 · Sheet P-5 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-5",
    "description": "TAD pressure before damper. TAD pressure before damper. Class: ONLINE. Unit: mbar. Mounting: Tertiary-air duct static tap.",
    "machine": "BRN-01",
    "x": -0.12944736808682675,
    "y": 0.4080034833425186,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-BRN-06",
    "label": "PRS-BRN-06",
    "detail": "BRN-01 · Sheet P-5 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-5",
    "description": "TAD pressure after damper. TAD pressure after damper. Class: ONLINE. Unit: mbar. Mounting: Tertiary-air duct — TAD pressure after damper.",
    "machine": "BRN-01",
    "x": -0.14783116397900975,
    "y": 0.40243697824434976,
    "size": 1.4
  },
  {
    "id": "SNL:POS-BRN-01",
    "label": "POS-BRN-01",
    "detail": "BRN-01 · Sheet P-5 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-5",
    "description": "TAD damper opening. TAD damper opening. Class: ONLINE. Unit: %. Mounting: Tertiary-air damper actuator feedback.",
    "machine": "BRN-01",
    "x": -0.1586601881489351,
    "y": 0.3936352921831275,
    "size": 1.4
  },
  {
    "id": "SNL:SPD-CLR-11",
    "label": "SPD-CLR-11",
    "detail": "CLR-01 · Sheet C-4 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-4",
    "description": "Grate 1 stroke rate. Grate 1 stroke rate. Class: COND. Unit: /min. Mounting: Grate drives 1–3 (drive 3 if fitted; no speed or run / trip status per your correction) — Grate 1 stroke rate.",
    "machine": "CLR-01",
    "x": 0.13988298550838277,
    "y": 0.082436729629743,
    "size": 1.4
  },
  {
    "id": "SNL:SPD-CLR-12",
    "label": "SPD-CLR-12",
    "detail": "CLR-01 · Sheet C-4 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-4",
    "description": "Grate 2 stroke rate. Grate 2 stroke rate. Class: COND. Unit: /min. Mounting: Grate drives 1–3 (drive 3 if fitted; no speed or run / trip status per your correction) — Grate 2 stroke rate.",
    "machine": "CLR-01",
    "x": 0.1470524078386778,
    "y": 0.07029666029506726,
    "size": 1.4
  },
  {
    "id": "SNL:SPD-CLR-13",
    "label": "SPD-CLR-13",
    "detail": "CLR-01 · Sheet C-4 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-4",
    "description": "Grate 3 stroke rate. Grate 3 stroke rate. Class: COND. Unit: /min. Mounting: Grate drives 1–3 (drive 3 if fitted; no speed or run / trip status per your correction) — Grate 3 stroke rate.",
    "machine": "CLR-01",
    "x": 0.15979926472794753,
    "y": 0.058652125485311735,
    "size": 1.4
  },
  {
    "id": "SNL:VIB-CLR-11",
    "label": "VIB-CLR-11",
    "detail": "CLR-01 · Sheet C-4 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-4",
    "description": "Grate drive motor vibration (1). Grate drive motor vibration [position 1]. Class: ONLINE. Unit: mm/s. Mounting: Grate drives 1–3 (drive 3 if fitted; no speed or run / trip status per your correction) — Grate drive motor vibration [position 1].",
    "machine": "CLR-01",
    "x": 0.17387943399872904,
    "y": 0.04836895529286459,
    "size": 1.4
  },
  {
    "id": "SNL:VIB-CLR-12",
    "label": "VIB-CLR-12",
    "detail": "CLR-01 · Sheet C-4 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-4",
    "description": "Grate drive motor vibration (2). Grate drive motor vibration [position 2]. Class: ONLINE. Unit: mm/s. Mounting: Grate drives 1–3 (drive 3 if fitted; no speed or run / trip status per your correction) — Grate drive motor vibration [position 2].",
    "machine": "CLR-01",
    "x": 0.18537002568648414,
    "y": 0.03950991828836411,
    "size": 1.4
  },
  {
    "id": "SNL:VIB-CLR-13",
    "label": "VIB-CLR-13",
    "detail": "CLR-01 · Sheet C-4 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-4",
    "description": "Grate drive motor vibration (3). Grate drive motor vibration [position 3]. Class: ONLINE. Unit: mm/s. Mounting: Grate drives 1–3 (drive 3 if fitted; no speed or run / trip status per your correction) — Grate drive motor vibration [position 3].",
    "machine": "CLR-01",
    "x": 0.19199085127565704,
    "y": 0.03149793430429112,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-CLR-31",
    "label": "TMP-CLR-31",
    "detail": "CLR-01 · Sheet C-4 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-4",
    "description": "Grate drive bearing temp. (1). Grate drive bearing temp. [position 1]. Class: ONLINE. Unit: °C. Mounting: Grate drives 1–3 (drive 3 if fitted; no speed or run / trip status per your correction) — Grate drive bearing temp. [position 1].",
    "machine": "CLR-01",
    "x": 0.1937149596278362,
    "y": 0.02355642071891578,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-CLR-32",
    "label": "TMP-CLR-32",
    "detail": "CLR-01 · Sheet C-4 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-4",
    "description": "Grate drive bearing temp. (2). Grate drive bearing temp. [position 2]. Class: ONLINE. Unit: °C. Mounting: Grate drives 1–3 (drive 3 if fitted; no speed or run / trip status per your correction) — Grate drive bearing temp. [position 2].",
    "machine": "CLR-01",
    "x": 0.19245703624701677,
    "y": 0.015181433468371044,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-CLR-33",
    "label": "TMP-CLR-33",
    "detail": "CLR-01 · Sheet C-4 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-4",
    "description": "Grate drive bearing temp. (3). Grate drive bearing temp. [position 3]. Class: ONLINE. Unit: °C. Mounting: Grate drives 1–3 (drive 3 if fitted; no speed or run / trip status per your correction) — Grate drive bearing temp. [position 3].",
    "machine": "CLR-01",
    "x": 0.19101764985339967,
    "y": 0.006397261591174062,
    "size": 1.4
  },
  {
    "id": "SNL:ELE-CLR-11",
    "label": "ELE-CLR-11",
    "detail": "CLR-01 · Sheet C-4 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-4",
    "description": "Grate drive motor current (1). Grate drive motor current [position 1]. Class: ONLINE. Unit: % FLA. Mounting: Grate drives 1–3 (drive 3 if fitted; no speed or run / trip status per your correction) — Grate drive motor current [position 1].",
    "machine": "CLR-01",
    "x": 0.19176676134446993,
    "y": -0.0023319110764296047,
    "size": 1.4
  },
  {
    "id": "SNL:ELE-CLR-12",
    "label": "ELE-CLR-12",
    "detail": "CLR-01 · Sheet C-4 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-4",
    "description": "Grate drive motor current (2). Grate drive motor current [position 2]. Class: ONLINE. Unit: % FLA. Mounting: Grate drives 1–3 (drive 3 if fitted; no speed or run / trip status per your correction) — Grate drive motor current [position 2].",
    "machine": "CLR-01",
    "x": 0.1956410020108788,
    "y": -0.01047711692476383,
    "size": 1.4
  },
  {
    "id": "SNL:ELE-CLR-13",
    "label": "ELE-CLR-13",
    "detail": "CLR-01 · Sheet C-4 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-4",
    "description": "Grate drive motor current (3). Grate drive motor current [position 3]. Class: ONLINE. Unit: % FLA. Mounting: Grate drives 1–3 (drive 3 if fitted; no speed or run / trip status per your correction) — Grate drive motor current [position 3].",
    "machine": "CLR-01",
    "x": 0.20187033655254275,
    "y": -0.017892698228341622,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-CLR-01",
    "label": "PRS-CLR-01",
    "detail": "CLR-01 · Sheet C-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-1",
    "description": "Zone 1 pressure (bed-depth control). Zone 1 pressure (bed-depth control). Class: ONLINE. Unit: mbar. Mounting: Compartment 1 accessible pressure tap / impulse line.",
    "machine": "CLR-01",
    "x": 0.2085150889430788,
    "y": -0.02507379653256591,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-CLR-02",
    "label": "PRS-CLR-02",
    "detail": "CLR-01 · Sheet C-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-1",
    "description": "Zone 2 pressure. Zone 2 pressure. Class: ONLINE. Unit: mbar. Mounting: Compartment 2 accessible pressure tap / impulse line.",
    "machine": "CLR-01",
    "x": 0.2135341616102062,
    "y": -0.03304482383884463,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-CLR-03",
    "label": "PRS-CLR-03",
    "detail": "CLR-01 · Sheet C-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-1",
    "description": "Zone 3 pressure. Zone 3 pressure. Class: ONLINE. Unit: mbar. Mounting: Compartment 3 accessible pressure tap / impulse line.",
    "machine": "CLR-01",
    "x": 0.21587850722074825,
    "y": -0.04288343645846896,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-CLR-04",
    "label": "PRS-CLR-04",
    "detail": "CLR-01 · Sheet C-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-1",
    "description": "Zone 4 pressure. Zone 4 pressure. Class: ONLINE. Unit: mbar. Mounting: Compartment 4 accessible pressure tap / impulse line.",
    "machine": "CLR-01",
    "x": 0.21610752972858027,
    "y": -0.05507893405008125,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-CLR-05",
    "label": "PRS-CLR-05",
    "detail": "CLR-01 · Sheet C-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-1",
    "description": "Zone 5 pressure. Zone 5 pressure. Class: ONLINE. Unit: mbar. Mounting: Compartment 5 accessible pressure tap / impulse line.",
    "machine": "CLR-01",
    "x": 0.21625308638235283,
    "y": -0.06903442712209823,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-CLR-06",
    "label": "PRS-CLR-06",
    "detail": "CLR-01 · Sheet C-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-1",
    "description": "Zone 6 pressure. Zone 6 pressure. Class: ONLINE. Unit: mbar. Mounting: Compartment 6 accessible pressure tap / impulse line.",
    "machine": "CLR-01",
    "x": 0.21899993090301237,
    "y": -0.08298923706120706,
    "size": 1.4
  },
  {
    "id": "SNL:VIB-CLR-01",
    "label": "VIB-CLR-01",
    "detail": "CLR-01 · Sheet C-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-2",
    "description": "Fan vibration (fan 1). Fan vibration (fan 1). Class: ONLINE. Unit: mm/s. Mounting: Fan 1 bearing housing, accessible radial orientation.",
    "machine": "CLR-01",
    "x": 0.22655652893143366,
    "y": -0.09446811914162145,
    "size": 1.4
  },
  {
    "id": "SNL:VIB-CLR-02",
    "label": "VIB-CLR-02",
    "detail": "CLR-01 · Sheet C-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-2",
    "description": "Fan vibration (fan 2). Fan vibration (fan 2). Class: ONLINE. Unit: mm/s. Mounting: Fan 2 bearing housing, accessible radial orientation.",
    "machine": "CLR-01",
    "x": 0.23972076156376027,
    "y": -0.10112851432790612,
    "size": 1.4
  },
  {
    "id": "SNL:VIB-CLR-03",
    "label": "VIB-CLR-03",
    "detail": "CLR-01 · Sheet C-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-2",
    "description": "Fan vibration (fan 3). Fan vibration (fan 3). Class: ONLINE. Unit: mm/s. Mounting: Fan 3 bearing housing, accessible radial orientation.",
    "machine": "CLR-01",
    "x": 0.2575469175542282,
    "y": -0.10168189945289921,
    "size": 1.4
  },
  {
    "id": "SNL:VIB-CLR-04",
    "label": "VIB-CLR-04",
    "detail": "CLR-01 · Sheet C-3 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-3",
    "description": "Fan vibration (fan 4). Fan vibration (fan 4). Class: ONLINE. Unit: mm/s. Mounting: Cooling fans 1–6 (each with own fresh-air intake plus recirculated vent air) — Fan vibration (fan 4).",
    "machine": "CLR-01",
    "x": 0.27774342205627733,
    "y": -0.09650268595584258,
    "size": 1.4
  },
  {
    "id": "SNL:VIB-CLR-05",
    "label": "VIB-CLR-05",
    "detail": "CLR-01 · Sheet C-3 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-3",
    "description": "Fan vibration (fan 5). Fan vibration (fan 5). Class: ONLINE. Unit: mm/s. Mounting: Cooling fans 1–6 (each with own fresh-air intake plus recirculated vent air) — Fan vibration (fan 5).",
    "machine": "CLR-01",
    "x": 0.2976042816279816,
    "y": -0.08764380830706608,
    "size": 1.4
  },
  {
    "id": "SNL:VIB-CLR-06",
    "label": "VIB-CLR-06",
    "detail": "CLR-01 · Sheet C-3 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-3",
    "description": "Fan vibration (fan 6). Fan vibration (fan 6). Class: ONLINE. Unit: mm/s. Mounting: Cooling fans 1–6 (each with own fresh-air intake plus recirculated vent air) — Fan vibration (fan 6).",
    "machine": "CLR-01",
    "x": 0.3150498083469478,
    "y": -0.0782131377636183,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-CLR-01",
    "label": "TMP-CLR-01",
    "detail": "CLR-01 · Sheet C-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-2",
    "description": "Fan bearing temp. (fan 1). Fan bearing temp. (fan 1). Class: ONLINE. Unit: °C. Mounting: Fan 1 bearing RTD/housing.",
    "machine": "CLR-01",
    "x": 0.3293236778872541,
    "y": -0.0713306314596438,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-CLR-02",
    "label": "TMP-CLR-02",
    "detail": "CLR-01 · Sheet C-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-2",
    "description": "Fan bearing temp. (fan 2). Fan bearing temp. (fan 2). Class: ONLINE. Unit: °C. Mounting: Fan 2 bearing RTD/housing.",
    "machine": "CLR-01",
    "x": 0.3410703474071815,
    "y": -0.06906728979336166,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-CLR-03",
    "label": "TMP-CLR-03",
    "detail": "CLR-01 · Sheet C-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-2",
    "description": "Fan bearing temp. (fan 3). Fan bearing temp. (fan 3). Class: ONLINE. Unit: °C. Mounting: Fan 3 bearing RTD/housing.",
    "machine": "CLR-01",
    "x": 0.3518114929062124,
    "y": -0.0717824932090867,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-CLR-04",
    "label": "TMP-CLR-04",
    "detail": "CLR-01 · Sheet C-3 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-3",
    "description": "Fan bearing temp. (fan 4). Fan bearing temp. (fan 4). Class: ONLINE. Unit: °C. Mounting: Fan 4 bearing RTD/housing.",
    "machine": "CLR-01",
    "x": 0.36311256978824646,
    "y": -0.07811618089600819,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-CLR-05",
    "label": "TMP-CLR-05",
    "detail": "CLR-01 · Sheet C-3 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-3",
    "description": "Fan bearing temp. (fan 5). Fan bearing temp. (fan 5). Class: ONLINE. Unit: °C. Mounting: Fan 5 bearing RTD/housing.",
    "machine": "CLR-01",
    "x": 0.3758547504594675,
    "y": -0.08562335300257629,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-CLR-06",
    "label": "TMP-CLR-06",
    "detail": "CLR-01 · Sheet C-3 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-3",
    "description": "Fan bearing temp. (fan 6). Fan bearing temp. (fan 6). Class: ONLINE. Unit: °C. Mounting: Fan 6 bearing RTD/housing.",
    "machine": "CLR-01",
    "x": 0.3899495455984805,
    "y": -0.09177539586145037,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-CLR-17",
    "label": "TMP-CLR-17",
    "detail": "CLR-01 · Sheet C-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-2",
    "description": "Fan motor winding temp. (fan 1). Fan motor winding temp. (fan 1). Class: ONLINE. Unit: °C. Mounting: Stator winding RTD (PT100) in the motor terminal box / protection relay.",
    "machine": "CLR-01",
    "x": 0.40459606693732125,
    "y": -0.09490854251871056,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-CLR-18",
    "label": "TMP-CLR-18",
    "detail": "CLR-01 · Sheet C-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-2",
    "description": "Fan motor winding temp. (fan 2). Fan motor winding temp. (fan 2). Class: ONLINE. Unit: °C. Mounting: Stator winding RTD (PT100) in the motor terminal box / protection relay.",
    "machine": "CLR-01",
    "x": 0.4189021218581407,
    "y": -0.09473549828306935,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-CLR-19",
    "label": "TMP-CLR-19",
    "detail": "CLR-01 · Sheet C-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-2",
    "description": "Fan motor winding temp. (fan 3). Fan motor winding temp. (fan 3). Class: ONLINE. Unit: °C. Mounting: Stator winding RTD (PT100) in the motor terminal box / protection relay.",
    "machine": "CLR-01",
    "x": 0.4325068878588114,
    "y": -0.09223443595054825,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-CLR-20",
    "label": "TMP-CLR-20",
    "detail": "CLR-01 · Sheet C-3 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-3",
    "description": "Fan motor winding temp. (fan 4). Fan motor winding temp. (fan 4). Class: ONLINE. Unit: °C. Mounting: Stator winding RTD (PT100) in the motor terminal box / protection relay.",
    "machine": "CLR-01",
    "x": 0.4458450083465685,
    "y": -0.08900210350707599,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-CLR-21",
    "label": "TMP-CLR-21",
    "detail": "CLR-01 · Sheet C-3 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-3",
    "description": "Fan motor winding temp. (fan 5). Fan motor winding temp. (fan 5). Class: ONLINE. Unit: °C. Mounting: Stator winding RTD (PT100) in the motor terminal box / protection relay.",
    "machine": "CLR-01",
    "x": 0.45987986678199,
    "y": -0.08638512548570393,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-CLR-22",
    "label": "TMP-CLR-22",
    "detail": "CLR-01 · Sheet C-3 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-3",
    "description": "Fan motor winding temp. (fan 6). Fan motor winding temp. (fan 6). Class: ONLINE. Unit: °C. Mounting: Stator winding RTD (PT100) in the motor terminal box / protection relay.",
    "machine": "CLR-01",
    "x": 0.4754169477096297,
    "y": -0.08478762233435855,
    "size": 1.4
  },
  {
    "id": "SNL:ELE-CLR-01",
    "label": "ELE-CLR-01",
    "detail": "CLR-01 · Sheet C-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-2",
    "description": "Fan motor current (fan 1). Fan motor current (fan 1). Class: ONLINE. Unit: % FLA. Mounting: Fan 1 MCC/VFD.",
    "machine": "CLR-01",
    "x": 0.4923473999630027,
    "y": -0.08346044102434272,
    "size": 1.4
  },
  {
    "id": "SNL:ELE-CLR-02",
    "label": "ELE-CLR-02",
    "detail": "CLR-01 · Sheet C-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-2",
    "description": "Fan motor current (fan 2). Fan motor current (fan 2). Class: ONLINE. Unit: % FLA. Mounting: Fan 2 MCC/VFD.",
    "machine": "CLR-01",
    "x": 0.5092454475113622,
    "y": -0.08085253849215118,
    "size": 1.4
  },
  {
    "id": "SNL:ELE-CLR-03",
    "label": "ELE-CLR-03",
    "detail": "CLR-01 · Sheet C-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-2",
    "description": "Fan motor current (fan 3). Fan motor current (fan 3). Class: ONLINE. Unit: % FLA. Mounting: Fan 3 MCC/VFD.",
    "machine": "CLR-01",
    "x": 0.5236058651807529,
    "y": -0.07535081056555931,
    "size": 1.4
  },
  {
    "id": "SNL:ELE-CLR-04",
    "label": "ELE-CLR-04",
    "detail": "CLR-01 · Sheet C-3 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-3",
    "description": "Fan motor current (fan 4). Fan motor current (fan 4). Class: ONLINE. Unit: % FLA. Mounting: Fan 4 MCC/VFD.",
    "machine": "CLR-01",
    "x": 0.5327145644968467,
    "y": -0.06606438322836367,
    "size": 1.4
  },
  {
    "id": "SNL:ELE-CLR-05",
    "label": "ELE-CLR-05",
    "detail": "CLR-01 · Sheet C-3 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-3",
    "description": "Fan motor current (fan 5). Fan motor current (fan 5). Class: ONLINE. Unit: % FLA. Mounting: Fan 5 MCC/VFD.",
    "machine": "CLR-01",
    "x": 0.5348292368450439,
    "y": -0.053296856047348275,
    "size": 1.4
  },
  {
    "id": "SNL:ELE-CLR-06",
    "label": "ELE-CLR-06",
    "detail": "CLR-01 · Sheet C-3 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-3",
    "description": "Fan motor current (fan 6). Fan motor current (fan 6). Class: ONLINE. Unit: % FLA. Mounting: Fan 6 MCC/VFD.",
    "machine": "CLR-01",
    "x": 0.5301582894252332,
    "y": -0.038497037823992324,
    "size": 1.4
  },
  {
    "id": "SNL:SPD-CLR-01",
    "label": "SPD-CLR-01",
    "detail": "CLR-01 · Sheet C-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-2",
    "description": "Fan speed (fan 1). Fan speed (RPM) (fan 1). Class: ONLINE. Unit: rpm. Mounting: Cooling fan 1 motor / VFD.",
    "machine": "CLR-01",
    "x": 0.521162699677404,
    "y": -0.023715737603463773,
    "size": 1.4
  },
  {
    "id": "SNL:SPD-CLR-02",
    "label": "SPD-CLR-02",
    "detail": "CLR-01 · Sheet C-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-2",
    "description": "Fan speed (fan 2). Fan speed (RPM) (fan 2). Class: ONLINE. Unit: rpm. Mounting: Cooling fans 1–6 (each with own fresh-air intake plus recirculated vent air) — Fan speed (RPM) (fan 2).",
    "machine": "CLR-01",
    "x": 0.5119643351330999,
    "y": -0.010814767980495833,
    "size": 1.4
  },
  {
    "id": "SNL:SPD-CLR-03",
    "label": "SPD-CLR-03",
    "detail": "CLR-01 · Sheet C-2 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-2",
    "description": "Fan speed (fan 3). Fan speed (RPM) (fan 3). Class: ONLINE. Unit: rpm. Mounting: Cooling fans 1–6 (each with own fresh-air intake plus recirculated vent air) — Fan speed (RPM) (fan 3).",
    "machine": "CLR-01",
    "x": 0.5070202400697558,
    "y": -0.0007768801566159153,
    "size": 1.4
  },
  {
    "id": "SNL:SPD-CLR-04",
    "label": "SPD-CLR-04",
    "detail": "CLR-01 · Sheet C-3 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-3",
    "description": "Fan speed (fan 4). Fan speed (RPM) (fan 4). Class: ONLINE. Unit: rpm. Mounting: Cooling fans 1–6 (each with own fresh-air intake plus recirculated vent air) — Fan speed (RPM) (fan 4).",
    "machine": "CLR-01",
    "x": 0.5095516684664082,
    "y": 0.006591040788305379,
    "size": 1.4
  },
  {
    "id": "SNL:SPD-CLR-05",
    "label": "SPD-CLR-05",
    "detail": "CLR-01 · Sheet C-3 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-3",
    "description": "Fan speed (fan 5). Fan speed (RPM) (fan 5). Class: ONLINE. Unit: rpm. Mounting: Cooling fans 1–6 (each with own fresh-air intake plus recirculated vent air) — Fan speed (RPM) (fan 5).",
    "machine": "CLR-01",
    "x": 0.520349974564011,
    "y": 0.012454453695042205,
    "size": 1.4
  },
  {
    "id": "SNL:SPD-CLR-06",
    "label": "SPD-CLR-06",
    "detail": "CLR-01 · Sheet C-3 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-3",
    "description": "Fan speed (fan 6). Fan speed (RPM) (fan 6). Class: ONLINE. Unit: rpm. Mounting: Cooling fans 1–6 (each with own fresh-air intake plus recirculated vent air) — Fan speed (RPM) (fan 6).",
    "machine": "CLR-01",
    "x": 0.5374520294078461,
    "y": 0.018366508340775085,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-CLR-09",
    "label": "TMP-CLR-09",
    "detail": "CLR-01 · Sheet C-5 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-5",
    "description": "Middle vent temp. (before WHRS). Middle vent temp. (before WHRS). Class: ONLINE. Unit: °C. Mounting: Cooler exhaust outlet duct TC.",
    "machine": "CLR-01",
    "x": 0.556833537749247,
    "y": 0.025584423045916058,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-CLR-24",
    "label": "TMP-CLR-24",
    "detail": "CLR-01 · Sheet C-5 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-5",
    "description": "After WHRS / before ESP. After WHRS / before ESP. Class: ONLINE. Unit: °C. Mounting: Vent air line: WHRS → ESP → vent exhaust fan → recirculation — After WHRS / before ESP.",
    "machine": "CLR-01",
    "x": 0.5738534603361509,
    "y": 0.03459620503915476,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-CLR-21",
    "label": "PRS-CLR-21",
    "detail": "CLR-01 · Sheet C-5 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-5",
    "description": "ESP inlet pressure. ESP inlet pressure. Class: ONLINE. Unit: mbar. Mounting: Vent air line: WHRS → ESP → vent exhaust fan → recirculation — ESP inlet pressure.",
    "machine": "CLR-01",
    "x": 0.584874604048968,
    "y": 0.045050449199428994,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-CLR-22",
    "label": "PRS-CLR-22",
    "detail": "CLR-01 · Sheet C-5 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-5",
    "description": "ESP outlet pressure. ESP outlet pressure. Class: ONLINE. Unit: mbar. Mounting: Vent air line: WHRS → ESP → vent exhaust fan → recirculation — ESP outlet pressure.",
    "machine": "CLR-01",
    "x": 0.5884179267386044,
    "y": 0.05608080736371375,
    "size": 1.4
  },
  {
    "id": "SNL:PRS-CLR-20",
    "label": "PRS-CLR-20",
    "detail": "CLR-01 · Sheet C-5 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-5",
    "description": "ESP ΔP. ESP ΔP (calc = in − out). Class: CALC. Unit: mbar. Mounting: Vent air line: WHRS → ESP → vent exhaust fan → recirculation — ESP ΔP (calc = in − out).",
    "machine": "CLR-01",
    "x": 0.5854110819949433,
    "y": 0.06682851986937458,
    "size": 1.4
  },
  {
    "id": "SNL:VIB-CLR-07",
    "label": "VIB-CLR-07",
    "detail": "CLR-01 · Sheet C-5 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-5",
    "description": "Vent exhaust fan vibration. Vent exhaust fan vibration. Class: ONLINE. Unit: mm/s. Mounting: Vent fan accessible fixed bearing pedestal.",
    "machine": "CLR-01",
    "x": 0.5784774743335765,
    "y": 0.07688068388322114,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-CLR-10",
    "label": "TMP-CLR-10",
    "detail": "CLR-01 · Sheet C-5 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-5",
    "description": "Vent exhaust fan bearing temp.. Vent exhaust fan bearing temp.. Class: ONLINE. Unit: °C. Mounting: Vent fan bearing housing.",
    "machine": "CLR-01",
    "x": 0.5706135010687501,
    "y": 0.08639805516197847,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-CLR-23",
    "label": "TMP-CLR-23",
    "detail": "CLR-01 · Sheet C-5 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-5",
    "description": "Vent exhaust fan winding temp.. Vent exhaust fan winding temp.. Class: ONLINE. Unit: °C. Mounting: Stator winding RTD (PT100) in the motor terminal box / protection relay.",
    "machine": "CLR-01",
    "x": 0.5638457119430288,
    "y": 0.0958749262680007,
    "size": 1.4
  },
  {
    "id": "SNL:ELE-CLR-07",
    "label": "ELE-CLR-07",
    "detail": "CLR-01 · Sheet C-5 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-5",
    "description": "Vent exhaust fan motor current. Vent exhaust fan motor current. Class: ONLINE. Unit: % FLA. Mounting: Vent fan MCC/VFD.",
    "machine": "CLR-01",
    "x": 0.5584434650017894,
    "y": 0.10567125260284066,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-CLR-25",
    "label": "TMP-CLR-25",
    "detail": "CLR-01 · Sheet C-5 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-5",
    "description": "Return air (recirculated) temp.. Return air (recirculated) temp.. Class: COND. Unit: °C. Mounting: Vent air line: WHRS → ESP → vent exhaust fan → recirculation — Return air (recirculated) temp..",
    "machine": "CLR-01",
    "x": 0.5529983594989971,
    "y": 0.11558537452637727,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-CLR-08",
    "label": "TMP-CLR-08",
    "detail": "CLR-01 · Sheet C-5 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-5",
    "description": "Clinker discharge temp.. Clinker discharge temp.. Class: ONLINE. Unit: °C. Mounting: Protected IR sightline at discharge stream.",
    "machine": "CLR-01",
    "x": 0.5452898667507491,
    "y": 0.12472863899876105,
    "size": 1.4
  },
  {
    "id": "SNL:VIB-HMR-03",
    "label": "VIB-HMR-03",
    "detail": "HMR-01 · Sheet H-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet H-1",
    "description": "Crusher motor vibration DE. Crusher motor vibration DE. Class: ONLINE. Unit: mm/s. Mounting: Crusher motor — Crusher motor vibration DE.",
    "machine": "HMR-01",
    "x": 0.7935117783332869,
    "y": 0.11181994932009534,
    "size": 1.4
  },
  {
    "id": "SNL:VIB-HMR-04",
    "label": "VIB-HMR-04",
    "detail": "HMR-01 · Sheet H-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet H-1",
    "description": "Crusher motor vibration NDE. Crusher motor vibration NDE. Class: ONLINE. Unit: mm/s. Mounting: Crusher motor — Crusher motor vibration NDE.",
    "machine": "HMR-01",
    "x": 0.7772870356866987,
    "y": 0.11580440365986416,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-HMR-04",
    "label": "TMP-HMR-04",
    "detail": "HMR-01 · Sheet H-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet H-1",
    "description": "Crusher motor bearing temp. DE. Crusher motor bearing temp. DE. Class: ONLINE. Unit: °C. Mounting: Crusher motor — Crusher motor bearing temp. DE.",
    "machine": "HMR-01",
    "x": 0.7580094918285041,
    "y": 0.1165182420582554,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-HMR-05",
    "label": "TMP-HMR-05",
    "detail": "HMR-01 · Sheet H-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet H-1",
    "description": "Crusher motor bearing temp. NDE. Crusher motor bearing temp. NDE. Class: ONLINE. Unit: °C. Mounting: Crusher motor — Crusher motor bearing temp. NDE.",
    "machine": "HMR-01",
    "x": 0.7383647513126183,
    "y": 0.11506376635663108,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-HMR-03",
    "label": "TMP-HMR-03",
    "detail": "HMR-01 · Sheet H-1 · OPTIONAL",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet H-1",
    "description": "Crusher motor winding temp.. Crusher motor winding temp.. Class: ONLINE. Unit: °C. Mounting: Motor embedded RTD.",
    "machine": "HMR-01",
    "x": 0.721253983161818,
    "y": 0.11365916756408785,
    "size": 1.4
  },
  {
    "id": "SNL:ELE-HMR-01",
    "label": "ELE-HMR-01",
    "detail": "HMR-01 · Sheet H-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet H-1",
    "description": "Crusher motor current. Crusher motor current. Class: ONLINE. Unit: % FLA. Mounting: Motor MCC/VFD.",
    "machine": "HMR-01",
    "x": 0.7086071983229729,
    "y": 0.11495141730300888,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-HMR-06",
    "label": "TMP-HMR-06",
    "detail": "HMR-01 · Sheet H-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet H-1",
    "description": "Crusher outlet temp.. Crusher outlet temp.. Class: ONLINE. Unit: °C. Mounting: Rotor — Crusher outlet temp..",
    "machine": "HMR-01",
    "x": 0.7006111775813136,
    "y": 0.12102831455756237,
    "size": 1.4
  },
  {
    "id": "SNL:VIB-HMR-01",
    "label": "VIB-HMR-01",
    "detail": "HMR-01 · Sheet H-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet H-1",
    "description": "Rotor bearing vibration DE. Rotor bearing vibration DE. Class: ONLINE. Unit: mm/s. Mounting: Rotor DE stationary bearing block.",
    "machine": "HMR-01",
    "x": 0.6956803690567921,
    "y": 0.13252487199699373,
    "size": 1.4
  },
  {
    "id": "SNL:VIB-HMR-02",
    "label": "VIB-HMR-02",
    "detail": "HMR-01 · Sheet H-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet H-1",
    "description": "Rotor bearing vibration NDE. Rotor bearing vibration NDE. Class: ONLINE. Unit: mm/s. Mounting: Rotor NDE stationary bearing block.",
    "machine": "HMR-01",
    "x": 0.6911612602003272,
    "y": 0.14821151354393927,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-HMR-01",
    "label": "TMP-HMR-01",
    "detail": "HMR-01 · Sheet H-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet H-1",
    "description": "Rotor bearing temp. DE. Rotor bearing temp. DE. Class: ONLINE. Unit: °C. Mounting: DE bearing pocket/housing.",
    "machine": "HMR-01",
    "x": 0.6844378927375204,
    "y": 0.165271709464963,
    "size": 1.4
  },
  {
    "id": "SNL:TMP-HMR-02",
    "label": "TMP-HMR-02",
    "detail": "HMR-01 · Sheet H-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet H-1",
    "description": "Rotor bearing temp. NDE. Rotor bearing temp. NDE. Class: ONLINE. Unit: °C. Mounting: NDE bearing pocket/housing.",
    "machine": "HMR-01",
    "x": 0.6739435528860062,
    "y": 0.180196859438344,
    "size": 1.4
  },
  {
    "id": "SNL:SPD-HMR-01",
    "label": "SPD-HMR-01",
    "detail": "HMR-01 · Sheet H-1 · REQUIRED",
    "kind": "sensor",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet H-1",
    "description": "Rotor zero-speed switch. Rotor zero-speed switch (no RPM). Class: ONLINE. Unit: status. Mounting: Crusher rotor shaft zero-speed switch.",
    "machine": "HMR-01",
    "x": 0.6596498589747382,
    "y": 0.18996583736961367,
    "size": 1.4
  },
  {
    "id": "GEN-001",
    "label": "GEN-001",
    "detail": "Asset identification / tag plates · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.1",
    "description": "Component: Asset identification / tag plates. Pass Criteria: Tags legible and traceable; correct missing or conflicting IDs. Frequency: Quarterly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01",
    "x": -0.03674277877451147,
    "y": 0.08492337945165135,
    "size": 1.2
  },
  {
    "id": "GEN-002",
    "label": "GEN-002",
    "detail": "Fixed guards / inspection barriers · Daily · OP",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.1",
    "description": "Component: Fixed guards / inspection barriers. Pass Criteria: No missing hardware, open access or exposed hazardous motion; isolate and restore before use. Frequency: Daily, Owner: OP, Mode: RUN.",
    "machine": "PHC-01",
    "x": -0.36052852252884343,
    "y": -0.03655296664291781,
    "size": 1.2
  },
  {
    "id": "GEN-003",
    "label": "GEN-003",
    "detail": "Rotating-coupling and shaft guards · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.1",
    "description": "Component: Rotating-coupling and shaft guards. Pass Criteria: No rub, damage or absent guard; stop and isolate prior to repair. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01",
    "x": -0.04434966973164327,
    "y": 0.08235175922657847,
    "size": 1.2
  },
  {
    "id": "GEN-004",
    "label": "GEN-004",
    "detail": "Equipment anchor bolts / grout · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.1",
    "description": "Component: Equipment anchor bolts / grout. Pass Criteria: No relative movement, pulled anchor or grout failure; engineer repair/torque at stop. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "PHC-01",
    "x": -0.3682592025613125,
    "y": -0.0384451942401922,
    "size": 1.2
  },
  {
    "id": "GEN-005",
    "label": "GEN-005",
    "detail": "Support frames / baseplates / brackets · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.1",
    "description": "Component: Support frames / baseplates / brackets. Pass Criteria: No structural crack, distortion or progressive settlement; engineering review on defect. Frequency: Quarterly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01",
    "x": -0.05224930958935259,
    "y": 0.08089469168425759,
    "size": 1.2
  },
  {
    "id": "GEN-006",
    "label": "GEN-006",
    "detail": "Platforms / stairs / toe plates / handrails · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.1",
    "description": "Component: Platforms / stairs / toe plates / handrails. Pass Criteria: Secure walking surfaces; barricade dangerous platforms and raise work order. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "PHC-01",
    "x": -0.3762460785598975,
    "y": -0.03982950564712729,
    "size": 1.2
  },
  {
    "id": "GEN-007",
    "label": "GEN-007",
    "detail": "Access doors / manways / sight ports · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.1",
    "description": "Component: Access doors / manways / sight ports. Pass Criteria: Closed, sealed, no leaks; internal opening only under approved shutdown permit. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01",
    "x": -0.06012248537052575,
    "y": 0.07918719766824633,
    "size": 1.2
  },
  {
    "id": "GEN-008",
    "label": "GEN-008",
    "detail": "Thermal insulation / cladding · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.1",
    "description": "Component: Thermal insulation / cladding. Pass Criteria: No new exposed hot spots or loose lagging; plan thermal repair. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "PHC-01",
    "x": -0.3837277779050085,
    "y": -0.04220151752000199,
    "size": 1.2
  },
  {
    "id": "GEN-009",
    "label": "GEN-009",
    "detail": "Equipment earthing / bonding · Quarterly · EL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.1",
    "description": "Component: Equipment earthing / bonding. Pass Criteria: Intact connections; scheduled continuity testing by qualified electrician. Frequency: Quarterly, Owner: EL, Mode: OFF.",
    "machine": "KLN-01",
    "x": -0.06692756466430053,
    "y": 0.07593893446093583,
    "size": 1.2
  },
  {
    "id": "GEN-010",
    "label": "GEN-010",
    "detail": "Emergency stops / local pull cords · Quarterly · EL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.1",
    "description": "Component: Emergency stops / local pull cords. Pass Criteria: All devices identified and operable; never defeat interlocks. Frequency: Quarterly, Owner: EL, Mode: OFF.",
    "machine": "PHC-01",
    "x": -0.3896461652352423,
    "y": -0.04636028971189767,
    "size": 1.2
  },
  {
    "id": "GEN-011",
    "label": "GEN-011",
    "detail": "LOTO points / isolators / local switches · Annually · EH",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.1",
    "description": "Component: LOTO points / isolators / local switches. Pass Criteria: Isolation map complete including pneumatic, hydraulic, thermal and gravity energy. Frequency: Annually, Owner: EH, Mode: OFF.",
    "machine": "KLN-01",
    "x": -0.07190166911812047,
    "y": 0.07102485298019798,
    "size": 1.2
  },
  {
    "id": "GEN-012",
    "label": "GEN-012",
    "detail": "Oil / coal / dust spill collection · Daily · OP",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.1",
    "description": "Component: Oil / coal / dust spill collection. Pass Criteria: No accumulated spills or secondary hazards; clean using site-approved method. Frequency: Daily, Owner: OP, Mode: RUN.",
    "machine": "PHC-01",
    "x": -0.39382497689566465,
    "y": -0.0517109077504475,
    "size": 1.2
  },
  {
    "id": "GEN-013",
    "label": "GEN-013",
    "detail": "Pipe / duct supports and sliding guides · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.1",
    "description": "Component: Pipe / duct supports and sliding guides. Pass Criteria: No broken hangers or restraint conflicts; repair to engineered setting. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01",
    "x": -0.07565678062024629,
    "y": 0.06566142696319019,
    "size": 1.2
  },
  {
    "id": "GEN-014",
    "label": "GEN-014",
    "detail": "Maintenance access / lifting lugs · Event-based · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.1",
    "description": "Component: Maintenance access / lifting lugs. Pass Criteria: Load rated and inspected; no improvised lift on duct or process pipe. Frequency: Event-based, Owner: ME, Mode: OFF.",
    "machine": "PHC-01",
    "x": -0.39772052338836084,
    "y": -0.05663857738152984,
    "size": 1.2
  },
  {
    "id": "GEN-015",
    "label": "GEN-015",
    "detail": "Fasteners / locking devices · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.1",
    "description": "Component: Fasteners / locking devices. Pass Criteria: No lost retainers, back-out or progressive loosening; use OEM torque. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01",
    "x": -0.08037411190618102,
    "y": 0.06155648214862326,
    "size": 1.2
  },
  {
    "id": "GEN-016",
    "label": "GEN-016",
    "detail": "Cable trays / conduits / glands · Monthly · EL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.1",
    "description": "Component: Cable trays / conduits / glands. Pass Criteria: No exposed conductors or damaged insulation; isolate for electrical repair. Frequency: Monthly, Owner: EL, Mode: RUN.",
    "machine": "PHC-01",
    "x": -0.40394763452992877,
    "y": -0.05967187481851484,
    "size": 1.2
  },
  {
    "id": "GEN-017",
    "label": "GEN-017",
    "detail": "Fire protection and escape access · Weekly · EH",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.1",
    "description": "Component: Fire protection and escape access. Pass Criteria: Clear and compliant with plant fire plan; notify EHS on defect. Frequency: Weekly, Owner: EH, Mode: RUN.",
    "machine": "KLN-01",
    "x": -0.08867767012846695,
    "y": 0.059653591334998715,
    "size": 1.2
  },
  {
    "id": "GEN-018",
    "label": "GEN-018",
    "detail": "Isolation valves (ball / gate / butterfly) · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.2",
    "description": "Component: Isolation valves (ball / gate / butterfly). Pass Criteria: Correct position and leak-tight; repair packing/seat after isolation. Frequency: Monthly, Owner: ME, Mode: OFF.",
    "machine": "PHC-01",
    "x": -0.41465025788673454,
    "y": -0.06059380098064344,
    "size": 1.2
  },
  {
    "id": "GEN-019",
    "label": "GEN-019",
    "detail": "Knife / slide / flap valves · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.2",
    "description": "Component: Knife / slide / flap valves. Pass Criteria: Smooth authorized travel and no material bypass; strip/adjust offline. Frequency: Monthly, Owner: ME, Mode: OFF.",
    "machine": "KLN-01",
    "x": -0.10176386226342493,
    "y": 0.05937439036573654,
    "size": 1.2
  },
  {
    "id": "GEN-020",
    "label": "GEN-020",
    "detail": "Check / non-return valves · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.2",
    "description": "Component: Check / non-return valves. Pass Criteria: No backflow or sticking; replace wear parts after isolation. Frequency: Quarterly, Owner: ME, Mode: OFF.",
    "machine": "PHC-01",
    "x": -0.4297207494763193,
    "y": -0.06070406474422438,
    "size": 1.2
  },
  {
    "id": "GEN-021",
    "label": "GEN-021",
    "detail": "Solenoid / pneumatically actuated valves · Quarterly · IN",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.2",
    "description": "Component: Solenoid / pneumatically actuated valves. Pass Criteria: Correct commanded response without uncontrolled motion; repair pilot/diaphragm. Frequency: Quarterly, Owner: IN, Mode: OFF.",
    "machine": "KLN-01",
    "x": -0.11805054721698201,
    "y": 0.05890100023592865,
    "size": 1.2
  },
  {
    "id": "GEN-022",
    "label": "GEN-022",
    "detail": "Pressure relief / safety valves · Annually · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.2",
    "description": "Component: Pressure relief / safety valves. Pass Criteria: Certified function per site code; remove from service if uncertain. Frequency: Annually, Owner: ME, Mode: OFF.",
    "machine": "PHC-01",
    "x": -0.4461641850891739,
    "y": -0.062043776068027814,
    "size": 1.2
  },
  {
    "id": "GEN-023",
    "label": "GEN-023",
    "detail": "Pressure regulator / FRL units · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.2",
    "description": "Component: Pressure regulator / FRL units. Pass Criteria: In OEM operating envelope; change filter/seal and correct air quality. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01",
    "x": -0.13343090808114152,
    "y": 0.0563018612021841,
    "size": 1.2
  },
  {
    "id": "GEN-024",
    "label": "GEN-024",
    "detail": "Manual drains / vents / bleed fittings · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.2",
    "description": "Component: Manual drains / vents / bleed fittings. Pass Criteria: Leak-free, accessible, and only opened under approved depressurizing procedure. Frequency: Monthly, Owner: ME, Mode: OFF.",
    "machine": "PHC-01",
    "x": -0.45926663671213586,
    "y": -0.06612453737270377,
    "size": 1.2
  },
  {
    "id": "GEN-025",
    "label": "GEN-025",
    "detail": "Flanged joints / pipe gaskets · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.2",
    "description": "Component: Flanged joints / pipe gaskets. Pass Criteria: No visible leakage or missing fasteners; isolated gasket/bolt replacement if defective. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01",
    "x": -0.14321946169646654,
    "y": 0.05071816200333453,
    "size": 1.2
  },
  {
    "id": "GEN-026",
    "label": "GEN-026",
    "detail": "Threaded fittings / union nuts · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.2",
    "description": "Component: Threaded fittings / union nuts. Pass Criteria: No leakage or movement; repair isolated. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "PHC-01",
    "x": -0.46503802117926923,
    "y": -0.07303705541597871,
    "size": 1.2
  },
  {
    "id": "GEN-027",
    "label": "GEN-027",
    "detail": "Flexible hoses / couplers · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.2",
    "description": "Component: Flexible hoses / couplers. Pass Criteria: No damage/leak; replace approved assembly, never patch pressure hose. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01",
    "x": -0.14471099163526857,
    "y": 0.04280762768113999,
    "size": 1.2
  },
  {
    "id": "GEN-028",
    "label": "GEN-028",
    "detail": "Expansion joints / bellows / fabric connectors · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.2",
    "description": "Component: Expansion joints / bellows / fabric connectors. Pass Criteria: No breach or restraint failure; replace with correct temperature grade. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "PHC-01",
    "x": -0.462470546192363,
    "y": -0.08152193772484469,
    "size": 1.2
  },
  {
    "id": "GEN-030",
    "label": "GEN-030",
    "detail": "Valve handles, travel indicators and asset labels · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.2",
    "description": "Component: Valve handles, travel indicators and asset labels. Pass Criteria: Mechanical OPEN/CLOSE identification matches confirmed valve position; handle and stop undamaged. Frequency: Quarterly, Owner: ME, Mode: OFF.",
    "machine": "KLN-01",
    "x": -0.13875861472726658,
    "y": 0.034188736357653536,
    "size": 1.2
  },
  {
    "id": "GEN-032",
    "label": "GEN-032",
    "detail": "Air / dust / oil pipe clamps and guides · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.2",
    "description": "Component: Air / dust / oil pipe clamps and guides. Pass Criteria: No motion against steel or heat sources; reinstate supports. Frequency: Quarterly, Owner: ME, Mode: RUN.",
    "machine": "PHC-01",
    "x": -0.45416107487394625,
    "y": -0.08989177797329834,
    "size": 1.2
  },
  {
    "id": "GEN-045",
    "label": "GEN-045",
    "detail": "Power supply / network gateway / switch / UPS · Quarterly · EL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.3",
    "description": "Component: Power supply / network gateway / switch / UPS. Pass Criteria: Edge read-only system reliable; no impact on plant control. Frequency: Quarterly, Owner: EL, Mode: OFF.",
    "machine": "KLN-01",
    "x": -0.12932049364318618,
    "y": 0.026335728311188453,
    "size": 1.2
  },
  {
    "id": "GEN-046",
    "label": "GEN-046",
    "detail": "PLCs/SIS protection boundary · Annually · EH",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.3",
    "description": "Component: PLCs/SIS protection boundary. Pass Criteria: No unauthorized control output or safety bypass. Frequency: Annually, Owner: EH, Mode: OFF.",
    "machine": "PHC-01",
    "x": -0.4448417363048079,
    "y": -0.09710735037272021,
    "size": 1.2
  },
  {
    "id": "GEN-048",
    "label": "GEN-048",
    "detail": "Master valve and flange census · Annually · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.4",
    "description": "Component: Master valve and flange census. Pass Criteria: Record each physical item and criticality in CMMS; no system-wide pass from one generic line. Frequency: Annually, Owner: ME, Mode: OFF.",
    "machine": "KLN-01",
    "x": -0.12120598494217842,
    "y": 0.019729915433484745,
    "size": 1.2
  },
  {
    "id": "GEN-049",
    "label": "GEN-049",
    "detail": "Bolting, stud material and gasket compatibility · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.4",
    "description": "Component: Bolting, stud material and gasket compatibility. Pass Criteria: Materials match OEM/P&ID and specification; replace non-conforming parts during isolation. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "PHC-01",
    "x": -0.4387072252615972,
    "y": -0.10325123381483942,
    "size": 1.2
  },
  {
    "id": "GEN-050",
    "label": "GEN-050",
    "detail": "Actuator diaphragm, solenoid- valve body and pneumatic tubing · Quarterly · IN",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.4",
    "description": "Component: Actuator diaphragm, solenoid- valve body and pneumatic tubing. Pass Criteria: Fails to design-safe state; full authorised stroke without hunting or leakage. Frequency: Quarterly, Owner: IN, Mode: OFF.",
    "machine": "KLN-01",
    "x": -0.1174213155496917,
    "y": 0.013829935997458536,
    "size": 1.2
  },
  {
    "id": "GEN-051",
    "label": "GEN-051",
    "detail": "Duct and pipe temporary blanks / spectacles · Event-based · EH",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.4",
    "description": "Component: Duct and pipe temporary blanks / spectacles. Pass Criteria: Positive isolation evidenced and re-instated before startup; no untracked blind. Frequency: Event-based, Owner: EH, Mode: OFF.",
    "machine": "PHC-01",
    "x": -0.4372120406962543,
    "y": -0.10913536266098971,
    "size": 1.2
  },
  {
    "id": "GEN-053",
    "label": "GEN-053",
    "detail": "Flexible expansion-joint restraint rods and guides · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.4",
    "description": "Component: Flexible expansion-joint restraint rods and guides. Pass Criteria: Expansion freedom within design; no bent rod or rubbing. Frequency: Quarterly, Owner: ME, Mode: OFF.",
    "machine": "KLN-01",
    "x": -0.11777209378493755,
    "y": 0.00778053028964017,
    "size": 1.2
  },
  {
    "id": "GEN-054",
    "label": "GEN-054",
    "detail": "Rotating bearings - grease drains, vents and labyrinths · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.4",
    "description": "Component: Rotating bearings - grease drains, vents and labyrinths. Pass Criteria: OEM grease volume/grade and passage integrity; replace damaged seals. Frequency: Quarterly, Owner: ME, Mode: OFF.",
    "machine": "PHC-01",
    "x": -0.4386908733306223,
    "y": -0.11544294222414983,
    "size": 1.2
  },
  {
    "id": "GEN-055",
    "label": "GEN-055",
    "detail": "Rotating fans - shaft seal and drain nipples · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.4",
    "description": "Component: Rotating fans - shaft seal and drain nipples. Pass Criteria: Leak tight and no rub; inspect bearing after OEM-safe shutdown. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01",
    "x": -0.11953641959401136,
    "y": 0.0012268958185028475,
    "size": 1.2
  },
  {
    "id": "GEN-056",
    "label": "GEN-056",
    "detail": "Service-air header drains, strainers and filters · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.4",
    "description": "Component: Service-air header drains, strainers and filters. Pass Criteria: Dry supply, pressure in approved range, no open-end leaks. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "PHC-01",
    "x": -0.43993655261355963,
    "y": -0.12213667472501932,
    "size": 1.2
  },
  {
    "id": "GEN-057",
    "label": "GEN-057",
    "detail": "Thrust/support-roller oil bath sight glasses and breathers · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.4",
    "description": "Component: Thrust/support-roller oil bath sight glasses and breathers. Pass Criteria: Clean visible level and no weep; replace defective parts during isolation. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01",
    "x": -0.11964471285145163,
    "y": -0.005443543049825982,
    "size": 1.2
  },
  {
    "id": "FSL-001",
    "label": "FSL-001",
    "detail": "Roof shell / roof stiffeners · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 3.1",
    "description": "Component: Roof shell / roof stiffeners. Pass Criteria: No progressive cracks, perforation or rust; repair under engineer-approved plan. Frequency: Quarterly, Owner: ME, Mode: RUN.",
    "machine": "FSL-01-01",
    "x": -0.11857904641869735,
    "y": -0.008616207576414903,
    "size": 1.2
  },
  {
    "id": "FSL-002",
    "label": "FSL-002",
    "detail": "Cylinder shell / cone welds · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 3.1",
    "description": "Component: Cylinder shell / cone welds. Pass Criteria: No dust paths or deformation; UT thickness where wear suspected. Frequency: Quarterly, Owner: ME, Mode: RUN.",
    "machine": "FSL-01-01",
    "x": -0.11682835086951103,
    "y": -0.01161795788261644,
    "size": 1.2
  },
  {
    "id": "FSL-003",
    "label": "FSL-003",
    "detail": "Silo support legs / braces · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 3.1",
    "description": "Component: Silo support legs / braces. Pass Criteria: No structural movement; refer distortion to structural engineer. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "FSL-01-01",
    "x": -0.11462466613913135,
    "y": -0.014472871723464006,
    "size": 1.2
  },
  {
    "id": "FSL-004",
    "label": "FSL-004",
    "detail": "Silo roof handrails / hatch / vent · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 3.1",
    "description": "Component: Silo roof handrails / hatch / vent. Pass Criteria: Guards firm; hatch sealed, vent functional per plant P&ID. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "FSL-01-01",
    "x": -0.11228842444949173,
    "y": -0.017272165926214857,
    "size": 1.2
  },
  {
    "id": "FSL-006",
    "label": "FSL-006",
    "detail": "Aeration pads / fabric tiles · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 3.1",
    "description": "Component: Aeration pads / fabric tiles. Pass Criteria: No torn, blinded or detached segments; replace damaged fabric. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "FSL-01-01",
    "x": -0.11015704256227195,
    "y": -0.020164123224588017,
    "size": 1.2
  },
  {
    "id": "FSL-007",
    "label": "FSL-007",
    "detail": "Aeration plenum / pad supports · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 3.1",
    "description": "Component: Aeration plenum / pad supports. Pass Criteria: Uniform path, no leakage/broken baffle; seal/repair. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "FSL-01-01",
    "x": -0.10851074904134167,
    "y": -0.023328210523254383,
    "size": 1.2
  },
  {
    "id": "FSL-008",
    "label": "FSL-008",
    "detail": "Aeration air header / branches · Daily · OP",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 3.1",
    "description": "Component: Aeration air header / branches. Pass Criteria: Expected pressure for running blower and no branch leaks; clear/replace offline. Frequency: Daily, Owner: OP, Mode: RUN.",
    "machine": "FSL-01-01",
    "x": -0.10750977259383906,
    "y": -0.02693744450102969,
    "size": 1.2
  },
  {
    "id": "FSL-010",
    "label": "FSL-010",
    "detail": "Extraction gate blade / seat · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 3.1",
    "description": "Component: Extraction gate blade / seat. Pass Criteria: No sticking or carry-over, close-to-command agreement. Frequency: Weekly, Owner: ME, Mode: RUN + STOP.",
    "machine": "FSL-01-01",
    "x": -0.10715473792350709,
    "y": -0.031115855013359357,
    "size": 1.2
  },
  {
    "id": "FSL-011",
    "label": "FSL-011",
    "detail": "Gate actuator / gearbox / pneumatic cylinder · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 3.1",
    "description": "Component: Gate actuator / gearbox / pneumatic cylinder. Pass Criteria: Travels correctly in authorized test, no air/oil leaks; overhaul at stop. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "FSL-01-01",
    "x": -0.1072776685459114,
    "y": -0.03589945807508081,
    "size": 1.2
  },
  {
    "id": "FSL-012",
    "label": "FSL-012",
    "detail": "Extraction discharge chute / air slide · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 3.1",
    "description": "Component: Extraction discharge chute / air slide. Pass Criteria: Continuous extraction without spill; renew liners/fabric after isolation. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "FSL-01-01",
    "x": -0.1075652249527337,
    "y": -0.04120911400115647,
    "size": 1.2
  },
  {
    "id": "FSL-013",
    "label": "FSL-013",
    "detail": "Gate and chute flange gaskets · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 3.1",
    "description": "Component: Gate and chute flange gaskets. Pass Criteria: No dust leakage; replace gaskets and corroded hardware offline. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "FSL-01-01",
    "x": -0.1076097933008882,
    "y": -0.046841948316365484,
    "size": 1.2
  },
  {
    "id": "FSL-014",
    "label": "FSL-014",
    "detail": "Silo overpressure / vacuum relief device · Annually · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 3.1",
    "description": "Component: Silo overpressure / vacuum relief device. Pass Criteria: Operable and correctly rated per silo design; service by qualified personnel. Frequency: Annually, Owner: ME, Mode: OFF.",
    "machine": "FSL-01-01",
    "x": -0.10697890232950284,
    "y": -0.05248490992171524,
    "size": 1.2
  },
  {
    "id": "FSL-015",
    "label": "FSL-015",
    "detail": "Silo roof instrument-nozzle flange and gasket · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 3.1",
    "description": "Component: Silo roof instrument-nozzle flange and gasket. Pass Criteria: Dry, sealed, secured; maintain under permitted access. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "FSL-01-01",
    "x": -0.10529012984519864,
    "y": -0.05775006972802106,
    "size": 1.2
  },
  {
    "id": "FSL-017",
    "label": "FSL-017",
    "detail": "Duty / standby availability and auto-changeover · Weekly · EL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 3.2",
    "description": "Component: Duty / standby availability and auto-changeover. Pass Criteria: No unacknowledged trip and backup available; repair control fault. Frequency: Weekly, Owner: EL, Mode: RUN.",
    "machine": "FSL-01-01",
    "x": -0.10227776251211829,
    "y": -0.06222714580419922,
    "size": 1.2
  },
  {
    "id": "FSL-018",
    "label": "FSL-018",
    "detail": "Aeration blower intake filter and silencer · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 3.2",
    "description": "Component: Aeration blower intake filter and silencer. Pass Criteria: Unblocked airflow and no damaged acoustic media; clean offline. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "FSL-01-01",
    "x": -0.09783913456095181,
    "y": -0.0655452528738031,
    "size": 1.2
  },
  {
    "id": "FSL-019",
    "label": "FSL-019",
    "detail": "Blower casing / lobes or impeller · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 3.2",
    "description": "Component: Blower casing / lobes or impeller. Pass Criteria: No rubbing or foreign matter; restore OEM clearances. Frequency: Quarterly, Owner: ME, Mode: OFF.",
    "machine": "FSL-01-01",
    "x": -0.09205245326243883,
    "y": -0.06743369640071607,
    "size": 1.2
  },
  {
    "id": "FSL-020",
    "label": "FSL-020",
    "detail": "Duty blower shaft / coupling / guard · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 3.2",
    "description": "Component: Duty blower shaft / coupling / guard. Pass Criteria: No knocking/guard contact; align and lubricate per OEM. Frequency: Monthly, Owner: ME, Mode: OFF.",
    "machine": "FSL-01-01",
    "x": -0.08516326996355512,
    "y": -0.06777122170591372,
    "size": 1.2
  },
  {
    "id": "FSL-021",
    "label": "FSL-021",
    "detail": "Duty blower bearings / shaft seals · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 3.2",
    "description": "Component: Duty blower bearings / shaft seals. Pass Criteria: Normal trend and no oil/grease loss; investigate deterioration. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "FSL-01-01",
    "x": -0.07754255562310279,
    "y": -0.06661462740743473,
    "size": 1.2
  },
  {
    "id": "FSL-022",
    "label": "FSL-022",
    "detail": "Blower relief / nonreturn / branch isolation valves · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 3.2",
    "description": "Component: Blower relief / nonreturn / branch isolation valves. Pass Criteria: Correct routing, reverse-flow prevention and certified relief settings. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "FSL-01-01",
    "x": -0.06962449594678286,
    "y": -0.06420085027454009,
    "size": 1.2
  },
  {
    "id": "FSL-023",
    "label": "FSL-023",
    "detail": "Blower intake / discharge drain points (if fitted) · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 3.2",
    "description": "Component: Blower intake / discharge drain points (if fitted). Pass Criteria: Dry supply; remove condensate and address moisture source. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "FSL-01-01",
    "x": -0.06183567367677714,
    "y": -0.06092099588221225,
    "size": 1.2
  },
  {
    "id": "FSL-024",
    "label": "FSL-024",
    "detail": "Blower motor / terminal box · Quarterly · EL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 3.2",
    "description": "Component: Blower motor / terminal box. Pass Criteria: No heat damage; clean and test insulation at outage. Frequency: Quarterly, Owner: EL, Mode: OFF.",
    "machine": "FSL-01-01",
    "x": -0.05452860861169111,
    "y": -0.05726956821729497,
    "size": 1.2
  },
  {
    "id": "FSL-025",
    "label": "FSL-025",
    "detail": "Blower starter / MCC / overload protection · Quarterly · EL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 3.2",
    "description": "Component: Blower starter / MCC / overload protection. Pass Criteria: Protection intact; test with maintenance permit, no bypass. Frequency: Quarterly, Owner: EL, Mode: OFF.",
    "machine": "FSL-01-01",
    "x": -0.04793146775440308,
    "y": -0.053776490485591716,
    "size": 1.2
  },
  {
    "id": "FSL-026",
    "label": "FSL-026",
    "detail": "Blower baseplate / anchor fasteners · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 3.2",
    "description": "Component: Blower baseplate / anchor fasteners. Pass Criteria: No movement or cracked supports; repair alignment/foundation. Frequency: Quarterly, Owner: ME, Mode: RUN.",
    "machine": "FSL-01-01",
    "x": -0.04212239754638702,
    "y": -0.05093261968050074,
    "size": 1.2
  },
  {
    "id": "FSL-027",
    "label": "FSL-027",
    "detail": "Blower discharge flexible connection · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 3.2",
    "description": "Component: Blower discharge flexible connection. Pass Criteria: No leaking air or split connector; isolate and replace. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "FSL-01-01",
    "x": -0.03703204389441114,
    "y": -0.04912075805596991,
    "size": 1.2
  },
  {
    "id": "FSL-028",
    "label": "FSL-028",
    "detail": "Feed silo roof vent filter (if fitted) · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 3.3",
    "description": "Component: Feed silo roof vent filter (if fitted). Pass Criteria: No overpressure risk or powder bypass; restore venting and service media. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "FSL-01-01",
    "x": -0.03247237486135426,
    "y": -0.04856339260532776,
    "size": 1.2
  },
  {
    "id": "FSL-029",
    "label": "FSL-029",
    "detail": "Silo vent pulse manifold / diaphragm valves (if fitted) · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 3.3",
    "description": "Component: Silo vent pulse manifold / diaphragm valves (if fitted). Pass Criteria: All pulses accounted for; no stuck-open diaphragm; isolate before opening. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "FSL-01-01",
    "x": -0.028184964810231597,
    "y": -0.049295656840871546,
    "size": 1.2
  },
  {
    "id": "FSL-030",
    "label": "FSL-030",
    "detail": "Extraction gate upstream/downstream chute flanges · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 3.3",
    "description": "Component: Extraction gate upstream/downstream chute flanges. Pass Criteria: No powder release or material hang-up; replace wear/gasket at stop. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "FSL-01-01",
    "x": -0.023898390109703516,
    "y": -0.05116777128774316,
    "size": 1.2
  },
  {
    "id": "KFS-001",
    "label": "KFS-001",
    "detail": "Feed-bin roof / shell / cone · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 4.1",
    "description": "Component: Feed-bin roof / shell / cone. Pass Criteria: No leak/crack; repair under isolated process conditions. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "KFS-01-01",
    "x": -0.019382987636081556,
    "y": -0.05387621914795536,
    "size": 1.2
  },
  {
    "id": "KFS-005",
    "label": "KFS-005",
    "detail": "Weigh-bin flex connectors · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 4.1",
    "description": "Component: Weigh-bin flex connectors. Pass Criteria: No bridging/rigid load path; repair flexible connector. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "KFS-01-01",
    "x": -0.014492183333610104,
    "y": -0.05701803396678773,
    "size": 1.2
  },
  {
    "id": "KFS-006",
    "label": "KFS-006",
    "detail": "Bin cone aeration fittings · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 4.1",
    "description": "Component: Bin cone aeration fittings. Pass Criteria: No airflow restriction or leakage; overhaul in isolated empty-bin state. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KFS-01-01",
    "x": -0.009182690693264446,
    "y": -0.06015868330368625,
    "size": 1.2
  },
  {
    "id": "KFS-007",
    "label": "KFS-007",
    "detail": "Kiln-feed dosing gate blade, seat and guides · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 4.1",
    "description": "Component: Kiln-feed dosing gate blade, seat and guides. Pass Criteria: Blade, seat and guides free of significant wear/binding; sealing and stroke against OEM mechanical limits. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KFS-01-01",
    "x": -0.0035104702390368336,
    "y": -0.06290181924701164,
    "size": 1.2
  },
  {
    "id": "KFS-008",
    "label": "KFS-008",
    "detail": "Dosing gate actuator mechanical assembly · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 4.1",
    "description": "Component: Dosing gate actuator mechanical assembly. Pass Criteria: Actuator travels without binding, air/oil leakage or failed mounts under controlled test; OEM stroke stops intact. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KFS-01-01",
    "x": 0.0023955011826846118,
    "y": -0.06494902558627322,
    "size": 1.2
  },
  {
    "id": "KFS-009",
    "label": "KFS-009",
    "detail": "Dosing valve gland / shaft seals · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 4.1",
    "description": "Component: Dosing valve gland / shaft seals. Pass Criteria: No visible dust or pneumatic leak; replace packing offline. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "KFS-01-01",
    "x": 0.008374921755793355,
    "y": -0.06613964219905312,
    "size": 1.2
  },
  {
    "id": "KFS-010",
    "label": "KFS-010",
    "detail": "Weigh-bin access doors / flange hardware · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 4.1",
    "description": "Component: Weigh-bin access doors / flange hardware. Pass Criteria: Sealed; repair offline before powder accumulates. Frequency: Quarterly, Owner: ME, Mode: RUN.",
    "machine": "KFS-01-01",
    "x": 0.014283332789370464,
    "y": -0.06646443209682244,
    "size": 1.2
  },
  {
    "id": "KFS-011",
    "label": "KFS-011",
    "detail": "Air-slide upper and lower channel · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 4.2",
    "description": "Component: Air-slide upper and lower channel. Pass Criteria: Steady feed with sealed trough; open only after isolation. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KFS-01-01",
    "x": 0.02003361941653604,
    "y": -0.06605160541169688,
    "size": 1.2
  },
  {
    "id": "KFS-012",
    "label": "KFS-012",
    "detail": "Air-slide permeable fabric · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 4.2",
    "description": "Component: Air-slide permeable fabric. Pass Criteria: Uniform aeration, no direct bypass or detached fabric. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KFS-01-01",
    "x": 0.025621885711757015,
    "y": -0.06512866674340109,
    "size": 1.2
  },
  {
    "id": "KFS-013",
    "label": "KFS-013",
    "detail": "Air-slide plenum, air distribution and seals · Daily · OP",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 4.2",
    "description": "Component: Air-slide plenum, air distribution and seals. Pass Criteria: Air-plenum enclosure and fabric interface sealed, support secure, no dust or fluidising-air leakage. Frequency: Daily, Owner: OP, Mode: RUN.",
    "machine": "KFS-01-01",
    "x": 0.031131061190162405,
    "y": -0.06396781376509292,
    "size": 1.2
  },
  {
    "id": "KFS-014",
    "label": "KFS-014",
    "detail": "Air-slide blower motor / intake · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 4.2",
    "description": "Component: Air-slide blower motor / intake. Pass Criteria: Motor operates within OEM band, no blocked intake. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KFS-01-01",
    "x": 0.03671039185922932,
    "y": -0.06282542181811067,
    "size": 1.2
  },
  {
    "id": "KFS-015",
    "label": "KFS-015",
    "detail": "Air-slide blower coupling / bearing / base · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 4.2",
    "description": "Component: Air-slide blower coupling / bearing / base. Pass Criteria: No rub, misalignment or leakage; service per OEM. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KFS-01-01",
    "x": 0.042534289799541006,
    "y": -0.061887006655874904,
    "size": 1.2
  },
  {
    "id": "KFS-016",
    "label": "KFS-016",
    "detail": "Air-slide isolation valve / nonreturn valve · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 4.2",
    "description": "Component: Air-slide isolation valve / nonreturn valve. Pass Criteria: Positive isolation during authorized test; repair leaking seat. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KFS-01-01",
    "x": 0.04874878061447781,
    "y": -0.06122782955648012,
    "size": 1.2
  },
  {
    "id": "KFS-017",
    "label": "KFS-017",
    "detail": "Air-slide flanges / flexible connectors · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 4.2",
    "description": "Component: Air-slide flanges / flexible connectors. Pass Criteria: No powder escape; renew gasket or connection. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "KFS-01-01",
    "x": 0.05541700587028159,
    "y": -0.06079624182695903,
    "size": 1.2
  },
  {
    "id": "KFS-021",
    "label": "KFS-021",
    "detail": "Feed transfer chutes / elbows / wear liners · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 4.2",
    "description": "Component: Feed transfer chutes / elbows / wear liners. Pass Criteria: No seepage or plugging; reline during isolation. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "KFS-01-01",
    "x": 0.06247620115801025,
    "y": -0.06042254028794243,
    "size": 1.2
  },
  {
    "id": "KFS-022",
    "label": "KFS-022",
    "detail": "Feed duct inspection covers / cleanouts · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 4.2",
    "description": "Component: Feed duct inspection covers / cleanouts. Pass Criteria: Sealed and accessible; only clear after energy and material isolation. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "KFS-01-01",
    "x": 0.06971700352770303,
    "y": -0.05985132876516089,
    "size": 1.2
  },
  {
    "id": "KFS-023",
    "label": "KFS-023",
    "detail": "Elevator head casing / hood / access seals · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 4.3",
    "description": "Component: Elevator head casing / hood / access seals. Pass Criteria: Leak-free, guards intact, no internal access while running. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KFS-01-01",
    "x": 0.07679206307146808,
    "y": -0.05879103598299319,
    "size": 1.2
  },
  {
    "id": "KFS-024",
    "label": "KFS-024",
    "detail": "Elevator buckets / attachment bolts · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 4.3",
    "description": "Component: Elevator buckets / attachment bolts. Pass Criteria: No missing bucket or pullout; replace damaged set. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KFS-01-01",
    "x": 0.08325542407126166,
    "y": -0.05697112305590628,
    "size": 1.2
  },
  {
    "id": "KFS-025",
    "label": "KFS-025",
    "detail": "Elevator belt or chain (OEM type) · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 4.3",
    "description": "Component: Elevator belt or chain (OEM type). Pass Criteria: Within OEM wear/elongation criteria; renew before failure. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KFS-01-01",
    "x": 0.0886280250704126,
    "y": -0.05419618548703696,
    "size": 1.2
  },
  {
    "id": "KFS-026",
    "label": "KFS-026",
    "detail": "Head sprocket/pulley and lagging · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 4.3",
    "description": "Component: Head sprocket/pulley and lagging. Pass Criteria: Within OEM wear limits; clean/replace worn components. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KFS-01-01",
    "x": 0.09247912018047048,
    "y": -0.050386840431882185,
    "size": 1.2
  },
  {
    "id": "KFS-027",
    "label": "KFS-027",
    "detail": "Boot sprocket / return pulley · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 4.3",
    "description": "Component: Boot sprocket / return pulley. Pass Criteria: No binding, damaged teeth or trapped meal. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KFS-01-01",
    "x": 0.09450955038290161,
    "y": -0.045599839785153806,
    "size": 1.2
  },
  {
    "id": "KFS-028",
    "label": "KFS-028",
    "detail": "Boot take-up / tensioning screws · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 4.3",
    "description": "Component: Boot take-up / tensioning screws. Pass Criteria: Correct tension and equal take-up travel to OEM specification. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KFS-01-01",
    "x": 0.0946214124682972,
    "y": -0.040023768787547875,
    "size": 1.2
  },
  {
    "id": "KFS-029",
    "label": "KFS-029",
    "detail": "Head-drive bearings / seals · Weekly · REL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 4.3",
    "description": "Component: Head-drive bearings / seals. Pass Criteria: Baseline vibration and temperature; correct lubrication defect. Frequency: Weekly, Owner: REL, Mode: RUN.",
    "machine": "KFS-01-01",
    "x": 0.09296015363765325,
    "y": -0.03395123429077336,
    "size": 1.2
  },
  {
    "id": "KFS-030",
    "label": "KFS-030",
    "detail": "Head gearbox / breather / oil level · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 4.3",
    "description": "Component: Head gearbox / breather / oil level. Pass Criteria: Correct grade/level and no leakage; sample/repair. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KFS-01-01",
    "x": 0.08991929871450197,
    "y": -0.02773276407082943,
    "size": 1.2
  },
  {
    "id": "KFS-031",
    "label": "KFS-031",
    "detail": "Elevator motor / MCC / VFD · Weekly · EL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 4.3",
    "description": "Component: Elevator motor / MCC / VFD. Pass Criteria: Current tracks feed and no unexplained drive faults. Frequency: Weekly, Owner: EL, Mode: RUN.",
    "machine": "KFS-01-01",
    "x": 0.08610421651006878,
    "y": -0.021720927988721977,
    "size": 1.2
  },
  {
    "id": "KFS-033",
    "label": "KFS-033",
    "detail": "Backstop / anti-runback device and torque arm · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 4.3",
    "description": "Component: Backstop / anti-runback device and torque arm. Pass Criteria: No uncontrolled reverse rotation; OEM-approved functional verification. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KFS-01-01",
    "x": 0.08225847420943921,
    "y": -0.016214854010971166,
    "size": 1.2
  },
  {
    "id": "KFS-034",
    "label": "KFS-034",
    "detail": "Elevator leg alignment / casing bolts · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 4.3",
    "description": "Component: Elevator leg alignment / casing bolts. Pass Criteria: Proper alignment; flange joints sealed. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "KFS-01-01",
    "x": 0.07916312830176239,
    "y": -0.011415059652533522,
    "size": 1.2
  },
  {
    "id": "KFS-035",
    "label": "KFS-035",
    "detail": "Elevator head discharge spout and transition chute · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 4.3",
    "description": "Component: Elevator head discharge spout and transition chute. Pass Criteria: Chute clear, liner secure and access seals leak-tight; no plugged-chute sensor calibration implied. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KFS-01-01",
    "x": 0.0775245000651049,
    "y": -0.00739642781125964,
    "size": 1.2
  },
  {
    "id": "KFS-036",
    "label": "KFS-036",
    "detail": "Elevator boot cleanout / dust extraction · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 4.3",
    "description": "Component: Elevator boot cleanout / dust extraction. Pass Criteria: No accumulation reaching moving element or inlet path. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KFS-01-01",
    "x": 0.07786858797644788,
    "y": -0.004103646009945887,
    "size": 1.2
  },
  {
    "id": "KFS-037",
    "label": "KFS-037",
    "detail": "Coupling / key / set screws / coupling guard · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 4.3",
    "description": "Component: Coupling / key / set screws / coupling guard. Pass Criteria: No fretting / loose keys; align at isolated stop. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KFS-01-01",
    "x": 0.08045973613564625,
    "y": -0.0013691829546428474,
    "size": 1.2
  },
  {
    "id": "KFS-038",
    "label": "KFS-038",
    "detail": "Bucket elevator head / boot bearing grease points · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 4.3",
    "description": "Component: Bucket elevator head / boot bearing grease points. Pass Criteria: Right lubricant applied to correct point at OEM interval. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KFS-01-01",
    "x": 0.08525752581874359,
    "y": 0.0010502902829594984,
    "size": 1.2
  },
  {
    "id": "KFS-039",
    "label": "KFS-039",
    "detail": "Weigh-bin flexible inlet/outlet boots and dust seals · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 4.4",
    "description": "Component: Weigh-bin flexible inlet/outlet boots and dust seals. Pass Criteria: Free weight measurement without side-load; no meal leakage. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "KFS-01-01",
    "x": 0.09191967366079057,
    "y": 0.003426426955122658,
    "size": 1.2
  },
  {
    "id": "KFS-040",
    "label": "KFS-040",
    "detail": "Bucket elevator head dust pickup and seal (if equipped) · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 4.4",
    "description": "Component: Bucket elevator head dust pickup and seal (if equipped). Pass Criteria: No dust release or plug; positive connection to approved dedusting system. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "KFS-01-01",
    "x": 0.09985106150018991,
    "y": 0.006009891753296529,
    "size": 1.2
  },
  {
    "id": "PHC-001",
    "label": "PHC-001",
    "detail": "C1 cyclone cylindrical/conical shell · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.1",
    "description": "Component: C1 cyclone cylindrical/conical shell. Pass Criteria: No leaks/cracks or distortion; repair in planned outage. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "PHC-01-01",
    "x": 0.10829122970742579,
    "y": 0.00898843919101896,
    "size": 1.2
  },
  {
    "id": "PHC-002",
    "label": "PHC-002",
    "detail": "C1 refractory / castable / anchors · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.1",
    "description": "Component: C1 refractory / castable / anchors. Pass Criteria: No exposed shell, loose castable or missing anchors; restore OEM lining. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "PHC-01-01",
    "x": 0.11642612036216586,
    "y": 0.012459858796383689,
    "size": 1.2
  },
  {
    "id": "PHC-003",
    "label": "PHC-003",
    "detail": "C1 vortex finder / dip tube (where fitted) · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.1",
    "description": "Component: C1 vortex finder / dip tube (where fitted). Pass Criteria: Restored profile and clearance per cyclone OEM; replace worn segments. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "PHC-01-01",
    "x": 0.12350573234220612,
    "y": 0.016424103972892623,
    "size": 1.2
  },
  {
    "id": "PHC-004",
    "label": "PHC-004",
    "detail": "C1 cyclone cone / discharge throat · Weekly · OP",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.1",
    "description": "Component: C1 cyclone cone / discharge throat. Pass Criteria: Passage clear; no unsafe manual blockage removal under hot meal. Frequency: Weekly, Owner: OP, Mode: RUN + STOP.",
    "machine": "PHC-01-01",
    "x": 0.12894839596138086,
    "y": 0.02079499766233994,
    "size": 1.2
  },
  {
    "id": "PHC-006",
    "label": "PHC-006",
    "detail": "C1 downcomer / flap or trickle valve · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.1",
    "description": "Component: C1 downcomer / flap or trickle valve. Pass Criteria: No false-air leakage or stuck flap; service isolated. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "PHC-01-01",
    "x": 0.13241477462584791,
    "y": 0.02542800036414645,
    "size": 1.2
  },
  {
    "id": "PHC-007",
    "label": "PHC-007",
    "detail": "C2 cyclone cylindrical/conical shell · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.2",
    "description": "Component: C2 cyclone cylindrical/conical shell. Pass Criteria: No leaks/cracks or distortion; repair in planned outage. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "PHC-01-01",
    "x": 0.1338400377979128,
    "y": 0.03015740613282139,
    "size": 1.2
  },
  {
    "id": "PHC-008",
    "label": "PHC-008",
    "detail": "C2 refractory / castable / anchors · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.2",
    "description": "Component: C2 refractory / castable / anchors. Pass Criteria: No exposed shell, loose castable or missing anchors; restore OEM lining. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "PHC-01-01",
    "x": 0.1334199770035847,
    "y": 0.03483461131087319,
    "size": 1.2
  },
  {
    "id": "PHC-009",
    "label": "PHC-009",
    "detail": "C2 vortex finder / dip tube (where fitted) · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.2",
    "description": "Component: C2 vortex finder / dip tube (where fitted). Pass Criteria: Restored profile and clearance per cyclone OEM; replace worn segments. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "PHC-01-01",
    "x": 0.13155484898420042,
    "y": 0.03935911106781545,
    "size": 1.2
  },
  {
    "id": "PHC-010",
    "label": "PHC-010",
    "detail": "C2 cyclone cone / discharge throat · Weekly · OP",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.2",
    "description": "Component: C2 cyclone cone / discharge throat. Pass Criteria: Passage clear; no unsafe manual blockage removal under hot meal. Frequency: Weekly, Owner: OP, Mode: RUN + STOP.",
    "machine": "PHC-01-01",
    "x": 0.12876199845794253,
    "y": 0.04369560810853644,
    "size": 1.2
  },
  {
    "id": "PHC-012",
    "label": "PHC-012",
    "detail": "C2 downcomer / flap or trickle valve · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.2",
    "description": "Component: C2 downcomer / flap or trickle valve. Pass Criteria: No false-air leakage or stuck flap; service isolated. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "PHC-01-01",
    "x": 0.12557354456041572,
    "y": 0.047873711632493224,
    "size": 1.2
  },
  {
    "id": "PHC-013",
    "label": "PHC-013",
    "detail": "C3 cyclone cylindrical/conical shell · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.3",
    "description": "Component: C3 cyclone cylindrical/conical shell. Pass Criteria: No leaks/cracks or distortion; repair in planned outage. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "PHC-01-01",
    "x": 0.12243768818099358,
    "y": 0.05197053462173562,
    "size": 1.2
  },
  {
    "id": "PHC-014",
    "label": "PHC-014",
    "detail": "C3 refractory / castable / anchors · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.3",
    "description": "Component: C3 refractory / castable / anchors. Pass Criteria: No exposed shell, loose castable or missing anchors; restore OEM lining. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "PHC-01-01",
    "x": 0.11964112867084324,
    "y": 0.05608028462702712,
    "size": 1.2
  },
  {
    "id": "PHC-015",
    "label": "PHC-015",
    "detail": "C3 vortex finder / dip tube (where fitted) · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.3",
    "description": "Component: C3 vortex finder / dip tube (where fitted). Pass Criteria: Restored profile and clearance per cyclone OEM; replace worn segments. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "PHC-01-01",
    "x": 0.11726589119235685,
    "y": 0.060277910084271746,
    "size": 1.2
  },
  {
    "id": "PHC-016",
    "label": "PHC-016",
    "detail": "C3 cyclone cone / discharge throat · Weekly · OP",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.3",
    "description": "Component: C3 cyclone cone / discharge throat. Pass Criteria: Passage clear; no unsafe manual blockage removal under hot meal. Frequency: Weekly, Owner: OP, Mode: RUN + STOP.",
    "machine": "PHC-01-01",
    "x": 0.11518734789369879,
    "y": 0.06458538914856199,
    "size": 1.2
  },
  {
    "id": "PHC-018",
    "label": "PHC-018",
    "detail": "C3 downcomer / flap or trickle valve · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.3",
    "description": "Component: C3 downcomer / flap or trickle valve. Pass Criteria: No false-air leakage or stuck flap; service isolated. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "PHC-01-01",
    "x": 0.11311257277641255,
    "y": 0.06894898987805892,
    "size": 1.2
  },
  {
    "id": "PHC-019",
    "label": "PHC-019",
    "detail": "C4 cyclone cylindrical/conical shell · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.4",
    "description": "Component: C4 cyclone cylindrical/conical shell. Pass Criteria: No leaks/cracks or distortion; repair in planned outage. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "PHC-01-01",
    "x": 0.11065080281487634,
    "y": 0.07323380000140041,
    "size": 1.2
  },
  {
    "id": "PHC-020",
    "label": "PHC-020",
    "detail": "C4 refractory / castable / anchors · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.4",
    "description": "Component: C4 refractory / castable / anchors. Pass Criteria: No exposed shell, loose castable or missing anchors; restore OEM lining. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "PHC-01-01",
    "x": 0.10740202571387931,
    "y": 0.07723838753934252,
    "size": 1.2
  },
  {
    "id": "PHC-021",
    "label": "PHC-021",
    "detail": "C4 vortex finder / dip tube (where fitted) · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.4",
    "description": "Component: C4 vortex finder / dip tube (where fitted). Pass Criteria: Restored profile and clearance per cyclone OEM; replace worn segments. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "PHC-01-01",
    "x": 0.10304660943744177,
    "y": 0.08072826593346236,
    "size": 1.2
  },
  {
    "id": "PHC-022",
    "label": "PHC-022",
    "detail": "C4 cyclone cone / discharge throat · Weekly · OP",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.4",
    "description": "Component: C4 cyclone cone / discharge throat. Pass Criteria: Passage clear; no unsafe manual blockage removal under hot meal. Frequency: Weekly, Owner: OP, Mode: RUN + STOP.",
    "machine": "PHC-01-01",
    "x": 0.09741896725678725,
    "y": 0.08348272115200386,
    "size": 1.2
  },
  {
    "id": "PHC-024",
    "label": "PHC-024",
    "detail": "C4 downcomer / flap or trickle valve · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.4",
    "description": "Component: C4 downcomer / flap or trickle valve. Pass Criteria: No false-air leakage or stuck flap; service isolated. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "PHC-01-01",
    "x": 0.09055146144189642,
    "y": 0.08534634428724251,
    "size": 1.2
  },
  {
    "id": "PHC-025",
    "label": "PHC-025",
    "detail": "C5 cyclone cylindrical/conical shell · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.5",
    "description": "Component: C5 cyclone cylindrical/conical shell. Pass Criteria: No leaks/cracks or distortion; repair in planned outage. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "PHC-01-01",
    "x": 0.08268046004748138,
    "y": 0.08627497874490106,
    "size": 1.2
  },
  {
    "id": "PHC-026",
    "label": "PHC-026",
    "detail": "C5 refractory / castable / anchors · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.5",
    "description": "Component: C5 refractory / castable / anchors. Pass Criteria: No exposed shell, loose castable or missing anchors; restore OEM lining. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "PHC-01-01",
    "x": 0.07421359081181415,
    "y": 0.08636612457537507,
    "size": 1.2
  },
  {
    "id": "PHC-027",
    "label": "PHC-027",
    "detail": "C5 vortex finder / dip tube (where fitted) · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.5",
    "description": "Component: C5 vortex finder / dip tube (where fitted). Pass Criteria: Restored profile and clearance per cyclone OEM; replace worn segments. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "PHC-01-01",
    "x": 0.06566444974342849,
    "y": 0.08586616074223628,
    "size": 1.2
  },
  {
    "id": "PHC-028",
    "label": "PHC-028",
    "detail": "C5 cyclone cone / discharge throat · Weekly · OP",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.5",
    "description": "Component: C5 cyclone cone / discharge throat. Pass Criteria: Passage clear; no unsafe manual blockage removal under hot meal. Frequency: Weekly, Owner: OP, Mode: RUN + STOP.",
    "machine": "PHC-01-01",
    "x": 0.05756698420979606,
    "y": 0.08515068209506509,
    "size": 1.2
  },
  {
    "id": "PHC-030",
    "label": "PHC-030",
    "detail": "C5 downcomer / flap or trickle valve · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.5",
    "description": "Component: C5 downcomer / flap or trickle valve. Pass Criteria: No false-air leakage or stuck flap; service isolated. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "PHC-01-01",
    "x": 0.05038539283069014,
    "y": 0.08467911116468076,
    "size": 1.2
  },
  {
    "id": "PHC-031",
    "label": "PHC-031",
    "detail": "C6 cyclone cylindrical/conical shell · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.6",
    "description": "Component: C6 cyclone cylindrical/conical shell. Pass Criteria: No leaks/cracks or distortion; repair in planned outage. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "PHC-01-01",
    "x": 0.044436025790302175,
    "y": 0.08492964572452388,
    "size": 1.2
  },
  {
    "id": "PHC-032",
    "label": "PHC-032",
    "detail": "C6 refractory / castable / anchors · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.6",
    "description": "Component: C6 refractory / castable / anchors. Pass Criteria: No exposed shell, loose castable or missing anchors; restore OEM lining. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "PHC-01-01",
    "x": 0.03983535011598424,
    "y": 0.08632461613242312,
    "size": 1.2
  },
  {
    "id": "PHC-033",
    "label": "PHC-033",
    "detail": "C6 vortex finder / dip tube (where fitted) · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.6",
    "description": "Component: C6 vortex finder / dip tube (where fitted). Pass Criteria: Restored profile and clearance per cyclone OEM; replace worn segments. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "PHC-01-01",
    "x": 0.03648305729501418,
    "y": 0.08915866550070083,
    "size": 1.2
  },
  {
    "id": "PHC-034",
    "label": "PHC-034",
    "detail": "C6 cyclone cone / discharge throat · Weekly · OP",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.6",
    "description": "Component: C6 cyclone cone / discharge throat. Pass Criteria: Passage clear; no unsafe manual blockage removal under hot meal. Frequency: Weekly, Owner: OP, Mode: RUN + STOP.",
    "machine": "PHC-01-01",
    "x": 0.03408280120345944,
    "y": 0.09354233491836182,
    "size": 1.2
  },
  {
    "id": "PHC-036",
    "label": "PHC-036",
    "detail": "C6 downcomer / flap or trickle valve · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.6",
    "description": "Component: C6 downcomer / flap or trickle valve. Pass Criteria: No false-air leakage or stuck flap; service isolated. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "PHC-01-01",
    "x": 0.03219611629015154,
    "y": 0.09937152970049047,
    "size": 1.2
  },
  {
    "id": "PHC-038",
    "label": "PHC-038",
    "detail": "Kiln riser duct lining / bends · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.7",
    "description": "Component: Kiln riser duct lining / bends. Pass Criteria: Clear free section and intact castable / supports. Frequency: Weekly, Owner: ME, Mode: RUN + STOP.",
    "machine": "PHC-01-01",
    "x": 0.030319082065028816,
    "y": 0.10632927413090947,
    "size": 1.2
  },
  {
    "id": "PHC-039",
    "label": "PHC-039",
    "detail": "Interstage gas ducts and elbows · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.7",
    "description": "Component: Interstage gas ducts and elbows. Pass Criteria: No false air or hot spots; renew linings at stop. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "PHC-01-01",
    "x": 0.02796737628290281,
    "y": 0.11392081399983003,
    "size": 1.2
  },
  {
    "id": "PHC-040",
    "label": "PHC-040",
    "detail": "Raw-meal inlet chute / dispersion box · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.7",
    "description": "Component: Raw-meal inlet chute / dispersion box. Pass Criteria: Even distribution and clear chute; remove buildup only isolated. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "PHC-01-01",
    "x": 0.02475419845916377,
    "y": 0.12153743147968842,
    "size": 1.2
  },
  {
    "id": "PHC-041",
    "label": "PHC-041",
    "detail": "Final hot-meal chute C6 to kiln · Weekly · OP",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.7",
    "description": "Component: Final hot-meal chute C6 to kiln. Pass Criteria: No blockage or leak; maintain covered hot chute at outage. Frequency: Weekly, Owner: OP, Mode: RUN.",
    "machine": "PHC-01-01",
    "x": 0.02044731795255873,
    "y": 0.12853931159111673,
    "size": 1.2
  },
  {
    "id": "PHC-042",
    "label": "PHC-042",
    "detail": "Air cannon / air blaster pressure vessels · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.7",
    "description": "Component: Air cannon / air blaster pressure vessels. Pass Criteria: Certified and secure; function per safe OEM procedure. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "PHC-01-01",
    "x": 0.014995818177859953,
    "y": 0.13434435736553765,
    "size": 1.2
  },
  {
    "id": "PHC-043",
    "label": "PHC-043",
    "detail": "Air cannon nozzle / check and isolation valves · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.7",
    "description": "Component: Air cannon nozzle / check and isolation valves. Pass Criteria: No uncontrolled discharge; repair under zero-pressure verified isolation. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "PHC-01-01",
    "x": 0.008523102507107569,
    "y": 0.138508634028268,
    "size": 1.2
  },
  {
    "id": "PHC-044",
    "label": "PHC-044",
    "detail": "Stair towers / hot cyclone platforms · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.7",
    "description": "Component: Stair towers / hot cyclone platforms. Pass Criteria: Safe access, no missing grating clip / thermal hazard. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "PHC-01-01",
    "x": 0.0012892210382068232,
    "y": 0.14078538064779064,
    "size": 1.2
  },
  {
    "id": "PHC-045",
    "label": "PHC-045",
    "detail": "Expansion joints between cyclone/ducts · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.7",
    "description": "Component: Expansion joints between cyclone/ducts. Pass Criteria: No cracks / false air and no excessive restraint. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "PHC-01-01",
    "x": -0.00636868699951928,
    "y": 0.141153067206434,
    "size": 1.2
  },
  {
    "id": "PHC-046",
    "label": "PHC-046",
    "detail": "High-temperature manhole / inspection ports · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.7",
    "description": "Component: High-temperature manhole / inspection ports. Pass Criteria: Doors sealed; no opening except cooled and permitted. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "PHC-01-01",
    "x": -0.01410515868727483,
    "y": 0.13980818983879978,
    "size": 1.2
  },
  {
    "id": "PHC-064",
    "label": "PHC-064",
    "detail": "Cyclone / riser cleaning: hot-meal rush safety · Event-based · EH",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.7",
    "description": "Component: Cyclone / riser cleaning: hot-meal rush safety. Pass Criteria: Cleaning only under permit with exclusion zone enforced; nobody in a hot-meal flush path; stop work if any control is missing. Frequency: Event-based, Owner: EH, Mode: RUN + STOP.",
    "machine": "PHC-01-01",
    "x": -0.021630400185800047,
    "y": 0.13712447477977144,
    "size": 1.2
  },
  {
    "id": "PHC-050",
    "label": "PHC-050",
    "detail": "Exit gas duct / gas-sampling flanges · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.8",
    "description": "Component: Exit gas duct / gas-sampling flanges. Pass Criteria: No false air or hot dust release; repair on shut-down. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "PHC-01-01",
    "x": -0.028757014495152035,
    "y": 0.1335858472680564,
    "size": 1.2
  },
  {
    "id": "PHC-051",
    "label": "PHC-051",
    "detail": "ID fan impeller / blades / hub · Weekly · REL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.8",
    "description": "Component: ID fan impeller / blades / hub. Pass Criteria: No blade cracks/imbalance; balance after repair. Frequency: Weekly, Owner: REL, Mode: RUN + STOP.",
    "machine": "PHC-01-01",
    "x": -0.03542091853541054,
    "y": 0.12970490794073283,
    "size": 1.2
  },
  {
    "id": "PHC-052",
    "label": "PHC-052",
    "detail": "ID fan casing / inlet cone / shaft seal · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.8",
    "description": "Component: ID fan casing / inlet cone / shaft seal. Pass Criteria: No rubbing/leakage; service after isolation. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "PHC-01-01",
    "x": -0.041673494611640334,
    "y": 0.12594096948875083,
    "size": 1.2
  },
  {
    "id": "PHC-053",
    "label": "PHC-053",
    "detail": "ID fan inlet damper blades / shaft / linkages · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.8",
    "description": "Component: ID fan inlet damper blades / shaft / linkages. Pass Criteria: No sticking/slop; repaired without unapproved control overrides. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "PHC-01-01",
    "x": -0.04764812157210008,
    "y": 0.12263153610524301,
    "size": 1.2
  },
  {
    "id": "PHC-054",
    "label": "PHC-054",
    "detail": "ID fan DE / NDE bearings · Weekly · REL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.8",
    "description": "Component: ID fan DE / NDE bearings. Pass Criteria: Stable baseline and OEM temp/velocity limits; raise urgent work order if rising. Frequency: Weekly, Owner: REL, Mode: RUN.",
    "machine": "PHC-01-01",
    "x": -0.05350960879935791,
    "y": 0.11994849932312929,
    "size": 1.2
  },
  {
    "id": "PHC-055",
    "label": "PHC-055",
    "detail": "ID fan bearing pedestals / hold- down studs · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.8",
    "description": "Component: ID fan bearing pedestals / hold- down studs. Pass Criteria: No movement/cracked plinth; align after repair. Frequency: Quarterly, Owner: ME, Mode: RUN.",
    "machine": "PHC-01-01",
    "x": -0.059398624302667805,
    "y": 0.11788575675622567,
    "size": 1.2
  },
  {
    "id": "PHC-056",
    "label": "PHC-056",
    "detail": "ID fan flexible coupling / guard · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.8",
    "description": "Component: ID fan flexible coupling / guard. Pass Criteria: OEM axial/radial alignment maintained. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "PHC-01-01",
    "x": -0.06538423844714278,
    "y": 0.11627926672316677,
    "size": 1.2
  },
  {
    "id": "PHC-057",
    "label": "PHC-057",
    "detail": "ID fan motor / enclosure / cooling · Weekly · EL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.8",
    "description": "Component: ID fan motor / enclosure / cooling. Pass Criteria: No high-temperature alarms or abnormal trip history. Frequency: Weekly, Owner: EL, Mode: RUN.",
    "machine": "PHC-01-01",
    "x": -0.07143597353836563,
    "y": 0.11485476273400855,
    "size": 1.2
  },
  {
    "id": "PHC-058",
    "label": "PHC-058",
    "detail": "ID fan VFD / MCC / isolation · Planned stop · EL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.8",
    "description": "Component: ID fan VFD / MCC / isolation. Pass Criteria: No unauthorized protection bypass; electrical test at outage. Frequency: Planned stop, Owner: EL, Mode: OFF.",
    "machine": "PHC-01-01",
    "x": -0.07742258490781728,
    "y": 0.1132935094542645,
    "size": 1.2
  },
  {
    "id": "PHC-059",
    "label": "PHC-059",
    "detail": "ID fan outlet flex joint / duct to treatment interface · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.8",
    "description": "Component: ID fan outlet flex joint / duct to treatment interface. Pass Criteria: No gas/dust leak; confirm downstream layout on plant P&ID. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "PHC-01-01",
    "x": -0.08313902175672627,
    "y": 0.11130344935379922,
    "size": 1.2
  },
  {
    "id": "PHC-060",
    "label": "PHC-060",
    "detail": "Downstream gas treatment / raw mill interface · Annually · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.8",
    "description": "Component: Downstream gas treatment / raw mill interface. Pass Criteria: Maintenance ownership assigned; not automatically part of 161 signals. Frequency: Annually, Owner: ME, Mode: OFF.",
    "machine": "PHC-01-01",
    "x": -0.08835678169200112,
    "y": 0.10868239471603736,
    "size": 1.2
  },
  {
    "id": "PHC-061",
    "label": "PHC-061",
    "detail": "Preheater exit diverter / hot-gas raw-mill damper · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.9",
    "description": "Component: Preheater exit diverter / hot-gas raw-mill damper. Pass Criteria: No hot-gas leakage or stuck movement; verify interlocks with process group. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "PHC-01-01",
    "x": -0.09288744905077842,
    "y": 0.10536166096681437,
    "size": 1.2
  },
  {
    "id": "PHC-062",
    "label": "PHC-062",
    "detail": "Riser / cyclone air cannon quick- exhaust valves and seals · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.9",
    "description": "Component: Riser / cyclone air cannon quick- exhaust valves and seals. Pass Criteria: No leaking/blocked air-blaster circuit; safe automated firing checked per OEM. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "PHC-01-01",
    "x": -0.09664572433538456,
    "y": 0.1014223671324105,
    "size": 1.2
  },
  {
    "id": "PHC-063",
    "label": "PHC-063",
    "detail": "Duct expansion-compensator ring, refractory stop and tie rod · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 5.9",
    "description": "Component: Duct expansion-compensator ring, refractory stop and tie rod. Pass Criteria: No false-air ingress or heat shield failure; restore at outage. Frequency: Quarterly, Owner: ME, Mode: RUN.",
    "machine": "PHC-01-01",
    "x": -0.09969747902194756,
    "y": 0.09708182194397277,
    "size": 1.2
  },
  {
    "id": "EXH-001",
    "label": "EXH-001",
    "detail": "Gas route / plant P&ID reconciliation · Annually · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.1",
    "description": "Component: Gas route / plant P&ID reconciliation. Pass Criteria: Signed gas-flow map, fan order and collector asset list; no assumed series arrangement. Frequency: Annually, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.10228055543873041,
    "y": 0.0926530015744605,
    "size": 1.2
  },
  {
    "id": "EXH-002",
    "label": "EXH-002",
    "detail": "Preheater outlet takeoff and transition ducts · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.1",
    "description": "Component: Preheater outlet takeoff and transition ducts. Pass Criteria: No loss of gas containment or support; renew erosion plates at stop. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.10479084475817906,
    "y": 0.08848507672452283,
    "size": 1.2
  },
  {
    "id": "EXH-003",
    "label": "EXH-003",
    "detail": "Gas distribution elbows / turning vanes · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.1",
    "description": "Component: Gas distribution elbows / turning vanes. Pass Criteria: Clear cross-section and intact vanes; replace eroded vanes/bolts. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.1077327593074055,
    "y": 0.0848963602457338,
    "size": 1.2
  },
  {
    "id": "EXH-004",
    "label": "EXH-004",
    "detail": "Gas cooling/conditioning inlet and outlet joints · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.1",
    "description": "Component: Gas cooling/conditioning inlet and outlet joints. Pass Criteria: No leaks, excessive movement or loose guide; correct hot- service parts. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.111640337505911,
    "y": 0.08211231261006656,
    "size": 1.2
  },
  {
    "id": "EXH-005",
    "label": "EXH-005",
    "detail": "Raw mill operation versus bypass mode · Quarterly · OP",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.1",
    "description": "Component: Raw mill operation versus bypass mode. Pass Criteria: Interlocked routing matches approved cause-effect, with no untracked leak path. Frequency: Quarterly, Owner: OP, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.11698150667642533,
    "y": 0.08022015556630908,
    "size": 1.2
  },
  {
    "id": "EXH-006",
    "label": "EXH-006",
    "detail": "Hot-gas shutoff/diverter flap · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.1",
    "description": "Component: Hot-gas shutoff/diverter flap. Pass Criteria: No sticking/partial closure; test only under planned process permit. Frequency: Quarterly, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.12406222488057457,
    "y": 0.07914843617318178,
    "size": 1.2
  },
  {
    "id": "EXH-007",
    "label": "EXH-007",
    "detail": "Bypass/butterfly damper blades · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.1",
    "description": "Component: Bypass/butterfly damper blades. Pass Criteria: Actual travel and sealing conform to OEM; no jam or severe bypass leakage. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.13294843417726396,
    "y": 0.07867517631326845,
    "size": 1.2
  },
  {
    "id": "EXH-008",
    "label": "EXH-008",
    "detail": "Damper electric/pneumatic/hydraulic actuator · Quarterly · IN",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.1",
    "description": "Component: Damper electric/pneumatic/hydraulic actuator. Pass Criteria: Position feedback credible and damper reaches allowed stops. Frequency: Quarterly, Owner: IN, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.1434216326051757,
    "y": 0.07846292977952969,
    "size": 1.2
  },
  {
    "id": "EXH-009",
    "label": "EXH-009",
    "detail": "Expansion joints fabric, metal or refractory-lined · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.1",
    "description": "Component: Expansion joints fabric, metal or refractory-lined. Pass Criteria: Correct expansion clearance, sealed and restrained; replace defective joint. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.15497868124464045,
    "y": 0.07811414476468054,
    "size": 1.2
  },
  {
    "id": "EXH-010",
    "label": "EXH-010",
    "detail": "Duct support shoes, spring hangers, guide stops · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.1",
    "description": "Component: Duct support shoes, spring hangers, guide stops. Pass Criteria: No binding/overstress; correct cold/hot positions per design. Frequency: Quarterly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.16687906252403892,
    "y": 0.07723660375157015,
    "size": 1.2
  },
  {
    "id": "EXH-011",
    "label": "EXH-011",
    "detail": "Duct insulation, cladding, manway gaskets · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.1",
    "description": "Component: Duct insulation, cladding, manway gaskets. Pass Criteria: Insulation intact, manways locked and no exposed hot points. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.17823449181976087,
    "y": 0.07550704090524551,
    "size": 1.2
  },
  {
    "id": "EXH-012",
    "label": "EXH-012",
    "detail": "Duct drain/condensate traps and washout · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.1",
    "description": "Component: Duct drain/condensate traps and washout. Pass Criteria: No water accumulation or uncontrolled corrosive condensate. Frequency: Monthly, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.18812805768647403,
    "y": 0.07272160037761284,
    "size": 1.2
  },
  {
    "id": "EXH-014",
    "label": "EXH-014",
    "detail": "Duct flanges / expansion joint splices · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.1",
    "description": "Component: Duct flanges / expansion joint splices. Pass Criteria: Proper hot-service gasket, torque and continuous containment. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.19574435852713318,
    "y": 0.06882445578663939,
    "size": 1.2
  },
  {
    "id": "EXH-015",
    "label": "EXH-015",
    "detail": "Access ladders / anchor plates / working platforms · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.1",
    "description": "Component: Access ladders / anchor plates / working platforms. Pass Criteria: Safe structural access without uncontrolled hot exposure. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.2004895100148679,
    "y": 0.06391012826151035,
    "size": 1.2
  },
  {
    "id": "EXH-016",
    "label": "EXH-016",
    "detail": "Gas cleaning plant isolation blinds / dampers · Event-based · EH",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.1",
    "description": "Component: Gas cleaning plant isolation blinds / dampers. Pass Criteria: Approved positive isolation, no uncontrolled connected branch. Frequency: Event-based, Owner: EH, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.202080966931609,
    "y": 0.05819999795967781,
    "size": 1.2
  },
  {
    "id": "EXH-017",
    "label": "EXH-017",
    "detail": "Gas compensators and expansion-joint hardware · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.1",
    "description": "Component: Gas compensators and expansion-joint hardware. Pass Criteria: Compensator fabric/metal, fasteners, guide/stop and thermal restraints secure with no visible leak/damage. Frequency: Quarterly, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.20059172709767292,
    "y": 0.0519982536190948,
    "size": 1.2
  },
  {
    "id": "EXH-018",
    "label": "EXH-018",
    "detail": "Hot-gas route dust/gas fugitive emission survey · Weekly · OP",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.1",
    "description": "Component: Hot-gas route dust/gas fugitive emission survey. Pass Criteria: No new powder deposits, uncontrolled visible emissions or loss of draft. Frequency: Weekly, Owner: OP, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.19644090755861202,
    "y": 0.04563617122188614,
    "size": 1.2
  },
  {
    "id": "EXH-019",
    "label": "EXH-019",
    "detail": "GCT shell, roof, cone and wind braces · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.2",
    "description": "Component: GCT shell, roof, cone and wind braces. Pass Criteria: Sound tower structure and no active corrosion/perforation; engineer repair. Frequency: Quarterly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.1903316288357787,
    "y": 0.03941548367726094,
    "size": 1.2
  },
  {
    "id": "EXH-020",
    "label": "EXH-020",
    "detail": "GCT inlet gas baffle/distributor · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.2",
    "description": "Component: GCT inlet gas baffle/distributor. Pass Criteria: Flow distributor open and mechanically secured. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.18314604340398172,
    "y": 0.03356137486814242,
    "size": 1.2
  },
  {
    "id": "EXH-021",
    "label": "EXH-021",
    "detail": "GCT refractory/insulation and liner · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.2",
    "description": "Component: GCT refractory/insulation and liner. Pass Criteria: No exposed shell or detached lining; repair with approved material. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.1758146205772131,
    "y": 0.028193387117345453,
    "size": 1.2
  },
  {
    "id": "EXH-022",
    "label": "EXH-022",
    "detail": "Water tank/level/overflow makeup valve · Daily · OP",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.2",
    "description": "Component: Water tank/level/overflow makeup valve. Pass Criteria: Stable clean water supply and no uncontrolled overfill. Frequency: Daily, Owner: OP, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.16918114919550947,
    "y": 0.02331874234615896,
    "size": 1.2
  },
  {
    "id": "EXH-023",
    "label": "EXH-023",
    "detail": "Water duty/standby pump motors, bases and couplings · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.2",
    "description": "Component: Water duty/standby pump motors, bases and couplings. Pass Criteria: Duty maintains required flow; spare available; no seal spray. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.16388555503913313,
    "y": 0.018848008612703835,
    "size": 1.2
  },
  {
    "id": "EXH-024",
    "label": "EXH-024",
    "detail": "Pump mechanical seals, gland drains and seal flush · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.2",
    "description": "Component: Pump mechanical seals, gland drains and seal flush. Pass Criteria: Leakage within pump OEM limit, no dry-running distress. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.16028342685616268,
    "y": 0.014628603379168144,
    "size": 1.2
  },
  {
    "id": "EXH-025",
    "label": "EXH-025",
    "detail": "Pump suction isolation / strainer / check valves · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.2",
    "description": "Component: Pump suction isolation / strainer / check valves. Pass Criteria: Clean suction path and no reverse flow; service without bypassing isolation. Frequency: Monthly, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.15841466658252593,
    "y": 0.010488187025915415,
    "size": 1.2
  },
  {
    "id": "EXH-026",
    "label": "EXH-026",
    "detail": "Pump discharge regulating/control valve · Quarterly · IN",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.2",
    "description": "Component: Pump discharge regulating/control valve. Pass Criteria: Smooth stable adjustment, no sticking or leak. Frequency: Quarterly, Owner: IN, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.15802507784013006,
    "y": 0.006278235197605737,
    "size": 1.2
  },
  {
    "id": "EXH-027",
    "label": "EXH-027",
    "detail": "Water ring main piping / flanges / hoses · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.2",
    "description": "Component: Water ring main piping / flanges / hoses. Pass Criteria: No water escape or weak supports; correct hot rated fittings. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.15863551561267678,
    "y": 0.0019083228000104646,
    "size": 1.2
  },
  {
    "id": "EXH-028",
    "label": "EXH-028",
    "detail": "Atomising air compressor / receiver connection · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.2",
    "description": "Component: Atomising air compressor / receiver connection. Pass Criteria: Dry air in approved band with no line restriction. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.15964507645370266,
    "y": -0.002636157281294571,
    "size": 1.2
  },
  {
    "id": "EXH-030",
    "label": "EXH-030",
    "detail": "Spray lances, supports and positioning · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.2",
    "description": "Component: Spray lances, supports and positioning. Pass Criteria: Sprays positioned to OEM map; no wall wetting. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.16044915688233014,
    "y": -0.0072964315982113614,
    "size": 1.2
  },
  {
    "id": "EXH-031",
    "label": "EXH-031",
    "detail": "Spray nozzle orifice/atomiser/strain screen · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.2",
    "description": "Component: Spray nozzle orifice/atomiser/strain screen. Pass Criteria: No plugged or oversize orifices; nozzle flow to OEM specification. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.1605510370120535,
    "y": -0.011962098105063334,
    "size": 1.2
  },
  {
    "id": "EXH-032",
    "label": "EXH-032",
    "detail": "Nozzle anti-drip valves and check valves · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.2",
    "description": "Component: Nozzle anti-drip valves and check valves. Pass Criteria: No uncontrolled water flow after shutdown. Frequency: Quarterly, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.15964731266735932,
    "y": -0.016507074421819912,
    "size": 1.2
  },
  {
    "id": "EXH-035",
    "label": "EXH-035",
    "detail": "GCT throat outlet / dust deposit survey · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.2",
    "description": "Component: GCT throat outlet / dust deposit survey. Pass Criteria: No buildup obstructing gas flow or starving dust exit. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.15767266205477756,
    "y": -0.02083138101188255,
    "size": 1.2
  },
  {
    "id": "EXH-036",
    "label": "EXH-036",
    "detail": "GCT discharge cone, airlock or screw · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.2",
    "description": "Component: GCT discharge cone, airlock or screw. Pass Criteria: Free discharge with dust containment; no material bridge. Frequency: Monthly, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.1547971213872007,
    "y": -0.024898868001637372,
    "size": 1.2
  },
  {
    "id": "EXH-037",
    "label": "EXH-037",
    "detail": "GCT washdown drains and condensate/effluent · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.2",
    "description": "Component: GCT washdown drains and condensate/effluent. Pass Criteria: No liquid carryover to dry collector or unsafe runoff. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.15137783621736126,
    "y": -0.02876152301307194,
    "size": 1.2
  },
  {
    "id": "EXH-038",
    "label": "EXH-038",
    "detail": "GCT manholes, nozzles and instrument flanges · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.2",
    "description": "Component: GCT manholes, nozzles and instrument flanges. Pass Criteria: Proper high-temperature sealing, no false-air ingress. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.14787554206166417,
    "y": -0.0325635229376047,
    "size": 1.2
  },
  {
    "id": "EXH-039",
    "label": "EXH-039",
    "detail": "GCT emergency water isolation/fire readiness · Annually · EH",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.2",
    "description": "Component: GCT emergency water isolation/fire readiness. Pass Criteria: Water flow stops/continues only as designed; procedure verified. Frequency: Annually, Owner: EH, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.1447523072591718,
    "y": -0.03652225260559462,
    "size": 1.2
  },
  {
    "id": "EXH-040",
    "label": "EXH-040",
    "detail": "ESP casing structural shell/roof/support steel · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.3",
    "description": "Component: ESP casing structural shell/roof/support steel. Pass Criteria: No perforation/instability; repairs with qualified work plan. Frequency: Quarterly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.14237022298345733,
    "y": -0.040888328828769305,
    "size": 1.2
  },
  {
    "id": "EXH-041",
    "label": "EXH-041",
    "detail": "ESP inlet nozzle and gas turning section · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.3",
    "description": "Component: ESP inlet nozzle and gas turning section. Pass Criteria: Tight duct and no abnormal erosion / blocked entry. Frequency: Quarterly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.1409102144661097,
    "y": -0.045891290916620406,
    "size": 1.2
  },
  {
    "id": "EXH-042",
    "label": "EXH-042",
    "detail": "Inlet gas distribution perforated screens · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.3",
    "description": "Component: Inlet gas distribution perforated screens. Pass Criteria: Even gas entry and secure screens; renew distorted plates. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.14032611633471886,
    "y": -0.051681112985813016,
    "size": 1.2
  },
  {
    "id": "EXH-043",
    "label": "EXH-043",
    "detail": "ESP field collector plates - flatness / alignment · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.3",
    "description": "Component: ESP field collector plates - flatness / alignment. Pass Criteria: Design interelectrode spacing maintained; repair/replace approved parts. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.14034239174229596,
    "y": -0.05827731943094104,
    "size": 1.2
  },
  {
    "id": "EXH-044",
    "label": "EXH-044",
    "detail": "ESP discharge electrode wires/rigid frames · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.3",
    "description": "Component: ESP discharge electrode wires/rigid frames. Pass Criteria: Electrode geometry and clearance to OEM drawings; no shorting. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.14049566217384113,
    "y": -0.06553684703133217,
    "size": 1.2
  },
  {
    "id": "EXH-045",
    "label": "EXH-045",
    "detail": "Electrode tension weights / centering guides · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.3",
    "description": "Component: Electrode tension weights / centering guides. Pass Criteria: No loose electrode or displaced guide; replace wear parts. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.14021208745368743,
    "y": -0.0731489282301216,
    "size": 1.2
  },
  {
    "id": "EXH-046",
    "label": "EXH-046",
    "detail": "ESP collecting-plate suspension hooks and bars · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.3",
    "description": "Component: ESP collecting-plate suspension hooks and bars. Pass Criteria: No cracks, failed hooks or moving plate sets. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.13890609432144768,
    "y": -0.08066063566280085,
    "size": 1.2
  },
  {
    "id": "EXH-047",
    "label": "EXH-047",
    "detail": "Interfield partitions and bypass gaps · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.3",
    "description": "Component: Interfield partitions and bypass gaps. Pass Criteria: Designed gas distribution without unintended dust short circuit. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.1360821855435916,
    "y": -0.08753114740945804,
    "size": 1.2
  },
  {
    "id": "EXH-048",
    "label": "EXH-048",
    "detail": "ESP discharge frame support beams · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.3",
    "description": "Component: ESP discharge frame support beams. Pass Criteria: Frame aligned and free from conductor contact. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.13142122862546957,
    "y": -0.09320729113697329,
    "size": 1.2
  },
  {
    "id": "EXH-049",
    "label": "EXH-049",
    "detail": "ESP guide plates / inlet diffuser / outlet baffles · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.3",
    "description": "Component: ESP guide plates / inlet diffuser / outlet baffles. Pass Criteria: Uniform flow guidance and no loose metal in duct. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.1248357357749448,
    "y": -0.09720854497085103,
    "size": 1.2
  },
  {
    "id": "EXH-050",
    "label": "EXH-050",
    "detail": "ESP process doors, manholes and door gaskets · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.3",
    "description": "Component: ESP process doors, manholes and door gaskets. Pass Criteria: No uncontrolled air inleakage, doors secured. Frequency: Monthly, Owner: ME, Mode: RUN + STOP.",
    "machine": "EXH-IF-01",
    "x": -0.11648457492667413,
    "y": -0.09920727498541314,
    "size": 1.2
  },
  {
    "id": "EXH-051",
    "label": "EXH-051",
    "detail": "ESP interelectrode clearances / discharge spines · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.3",
    "description": "Component: ESP interelectrode clearances / discharge spines. Pass Criteria: Minimum clearances comply with vendor; no distorted spines. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.10674514842855586,
    "y": -0.09909008849050398,
    "size": 1.2
  },
  {
    "id": "EXH-053",
    "label": "EXH-053",
    "detail": "ESP inlet/outlet expansion joints and tie rods · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.3",
    "description": "Component: ESP inlet/outlet expansion joints and tie rods. Pass Criteria: Sealed and free to thermally move; renew worn bellows. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.09614889812691585,
    "y": -0.09698884300596042,
    "size": 1.2
  },
  {
    "id": "EXH-054",
    "label": "EXH-054",
    "detail": "ESP internal corrosion / condensation pattern · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.3",
    "description": "Component: ESP internal corrosion / condensation pattern. Pass Criteria: No severe wall loss; investigate process dewpoint and ingress. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.08529257773512937,
    "y": -0.09327466487816345,
    "size": 1.2
  },
  {
    "id": "EXH-055",
    "label": "EXH-055",
    "detail": "ESP field numbering and physical access control · Annually · EL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.3",
    "description": "Component: ESP field numbering and physical access control. Pass Criteria: Correct one-to-one register, no ambiguous isolation point. Frequency: Annually, Owner: EL, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.07474186413548665,
    "y": -0.08851448480770344,
    "size": 1.2
  },
  {
    "id": "EXH-056",
    "label": "EXH-056",
    "detail": "ESP access-platform anti-fall hardware · Monthly · EH",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.3",
    "description": "Component: ESP access-platform anti-fall hardware. Pass Criteria: No access hazard; close unsafe route and repair. Frequency: Monthly, Owner: EH, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.06494482676668274,
    "y": -0.08339601286965242,
    "size": 1.2
  },
  {
    "id": "EXH-057",
    "label": "EXH-057",
    "detail": "ESP pressure-tight window and inspection fittings · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.3",
    "description": "Component: ESP pressure-tight window and inspection fittings. Pass Criteria: No leakage/false air, all safety locks intact. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.0561704190511737,
    "y": -0.07863260637854413,
    "size": 1.2
  },
  {
    "id": "EXH-062",
    "label": "EXH-062",
    "detail": "ESP HV disconnect, earthing switch and interlocks · Event-based · EH",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.4",
    "description": "Component: ESP HV disconnect, earthing switch and interlocks. Pass Criteria: Positive zero-energy proof per site HV procedure; no bypassed key interlock. Frequency: Event-based, Owner: EH, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.04848200663764318,
    "y": -0.07486312378527468,
    "size": 1.2
  },
  {
    "id": "EXH-063",
    "label": "EXH-063",
    "detail": "T/R set oil, bushings, conservator and gaskets · Quarterly · EL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.4",
    "description": "Component: T/R set oil, bushings, conservator and gaskets. Pass Criteria: Dry intact insulation and no oil leakage; dielectric test under OEM plan. Frequency: Quarterly, Owner: EL, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.04174903721527373,
    "y": -0.07256292673570422,
    "size": 1.2
  },
  {
    "id": "EXH-064",
    "label": "EXH-064",
    "detail": "T/R enclosure cooling fan / heat exchanger · Monthly · EL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.4",
    "description": "Component: T/R enclosure cooling fan / heat exchanger. Pass Criteria: Cooling maintained, filters clean; no hotspots. Frequency: Monthly, Owner: EL, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.03569264059130274,
    "y": -0.07198046533260813,
    "size": 1.2
  },
  {
    "id": "EXH-065",
    "label": "EXH-065",
    "detail": "T/R control cabinet, thyristor/IGBT firing unit · Quarterly · EL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.4",
    "description": "Component: T/R control cabinet, thyristor/IGBT firing unit. Pass Criteria: Correct field regulation and no recurring faults; maintenance electrically isolated. Frequency: Quarterly, Owner: EL, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.02995463940381353,
    "y": -0.07310963436227032,
    "size": 1.2
  },
  {
    "id": "EXH-066",
    "label": "EXH-066",
    "detail": "HV cable, bus duct and porcelain lead-in insulator · Planned stop · EL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.4",
    "description": "Component: HV cable, bus duct and porcelain lead-in insulator. Pass Criteria: No tracking, cracks, overflash or loose terminations. Frequency: Planned stop, Owner: EL, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.024175350934599063,
    "y": -0.07570205226715929,
    "size": 1.2
  },
  {
    "id": "EXH-067",
    "label": "EXH-067",
    "detail": "HV support insulators / compartment heaters · Quarterly · EL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.4",
    "description": "Component: HV support insulators / compartment heaters. Pass Criteria: Dry insulator compartment and functioning heater; correct dewpoint. Frequency: Quarterly, Owner: EL, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.018064426998688137,
    "y": -0.07931664794344344,
    "size": 1.2
  },
  {
    "id": "EXH-068",
    "label": "EXH-068",
    "detail": "Insulator purge-air blower/filter/header · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.4",
    "description": "Component: Insulator purge-air blower/filter/header. Pass Criteria: Clean dry positive purge as specified, no blocked branch. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.011450984026393345,
    "y": -0.08339763766794875,
    "size": 1.2
  },
  {
    "id": "EXH-069",
    "label": "EXH-069",
    "detail": "ESP electrical earthing grids and equipment bonds · Annually · EL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.4",
    "description": "Component: ESP electrical earthing grids and equipment bonds. Pass Criteria: Earth impedance/continuity per plant test; no loose connection. Frequency: Annually, Owner: EL, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.004303976106480263,
    "y": -0.08736725105853034,
    "size": 1.2
  },
  {
    "id": "EXH-070",
    "label": "EXH-070",
    "detail": "Collecting-plate rapper drive motors · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.4",
    "description": "Component: Collecting-plate rapper drive motors. Pass Criteria: Effective rapping without missed strokes or unsafe drive motion. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": 0.0032798089856047076,
    "y": -0.09071725479636458,
    "size": 1.2
  },
  {
    "id": "EXH-071",
    "label": "EXH-071",
    "detail": "Discharge-electrode rapper mechanisms · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.4",
    "description": "Component: Discharge-electrode rapper mechanisms. Pass Criteria: No jam or broken hammer; operate under OEM condition and permissions. Frequency: Quarterly, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.01111590040195748,
    "y": -0.0930838265048571,
    "size": 1.2
  },
  {
    "id": "EXH-072",
    "label": "EXH-072",
    "detail": "Gas distributor/field rapper shafts and hammers · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.4",
    "description": "Component: Gas distributor/field rapper shafts and hammers. Pass Criteria: Full specified travel, no loose/broken rapper part. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.018990319790323344,
    "y": -0.09429354319023632,
    "size": 1.2
  },
  {
    "id": "EXH-073",
    "label": "EXH-073",
    "detail": "ESP rapper controller physical cabinet and outputs · Quarterly · EL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.4",
    "description": "Component: ESP rapper controller physical cabinet and outputs. Pass Criteria: Rapper controller cabinet, power wiring and relay outputs electrically sound after planned inspection. Frequency: Quarterly, Owner: EL, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.026721917195245627,
    "y": -0.0943735768398944,
    "size": 1.2
  },
  {
    "id": "EXH-074",
    "label": "EXH-074",
    "detail": "Rapper drive gearbox seals, bearings, oil levels · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.4",
    "description": "Component: Rapper drive gearbox seals, bearings, oil levels. Pass Criteria: Correct lubricant and no high bearing vibration. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": 0.03421417033346494,
    "y": -0.09352566364423026,
    "size": 1.2
  },
  {
    "id": "EXH-075",
    "label": "EXH-075",
    "detail": "ESP rapper shaft penetration seals / packings · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.4",
    "description": "Component: ESP rapper shaft penetration seals / packings. Pass Criteria: No appreciable leak and no shaft binding. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": 0.04148401173465113,
    "y": -0.09206986137102145,
    "size": 1.2
  },
  {
    "id": "EXH-076",
    "label": "EXH-076",
    "detail": "Anti-condensation cabinet heaters / thermostat · Quarterly · EL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.4",
    "description": "Component: Anti-condensation cabinet heaters / thermostat. Pass Criteria: No moisture buildup/shorting in cabinet. Frequency: Quarterly, Owner: EL, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.048660168028003103,
    "y": -0.09036937298307318,
    "size": 1.2
  },
  {
    "id": "EXH-077",
    "label": "EXH-077",
    "detail": "ESP access-door interlock key exchange · Annually · EH",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.4",
    "description": "Component: ESP access-door interlock key exchange. Pass Criteria: No bypass or shared key mismatch; restore before startup. Frequency: Annually, Owner: EH, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.05595010061683196,
    "y": -0.08875085860013855,
    "size": 1.2
  },
  {
    "id": "EXH-078",
    "label": "EXH-078",
    "detail": "ESP HV warning lamps / insulation resistance log · Quarterly · EL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.4",
    "description": "Component: ESP HV warning lamps / insulation resistance log. Pass Criteria: Alarm lamps and insulation readings valid against OEM thresholds. Frequency: Quarterly, Owner: EL, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.06358160283458146,
    "y": -0.08743514011882925,
    "size": 1.2
  },
  {
    "id": "EXH-079",
    "label": "EXH-079",
    "detail": "ESP control cable tray, glands and marshalling · Quarterly · EL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.4",
    "description": "Component: ESP control cable tray, glands and marshalling. Pass Criteria: No cable compromise, earth faults or orphan wire. Frequency: Quarterly, Owner: EL, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.07173101700244096,
    "y": -0.08649097020708699,
    "size": 1.2
  },
  {
    "id": "EXH-080",
    "label": "EXH-080",
    "detail": "ESP T/R surge suppression/overvoltage protection · Annually · EL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.4",
    "description": "Component: ESP T/R surge suppression/overvoltage protection. Pass Criteria: No out-of-date protective components or defeated trips. Frequency: Annually, Owner: EL, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.08045365132170372,
    "y": -0.08582003236711416,
    "size": 1.2
  },
  {
    "id": "EXH-183",
    "label": "EXH-183",
    "detail": "ESP CO-trip interlock (if ESP installed) · Planned stop · EH",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.4",
    "description": "Component: ESP CO-trip interlock (if ESP installed). Pass Criteria: HV de-energises on the CO trip within the approved time; no bypass; restart permissive works; test recorded. Frequency: Planned stop, Owner: EH, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.0896324970021281,
    "y": -0.08517541418821159,
    "size": 1.2
  },
  {
    "id": "EXH-082",
    "label": "EXH-082",
    "detail": "ESP hopper shell, taper and support attachments · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.5",
    "description": "Component: ESP hopper shell, taper and support attachments. Pass Criteria: No ash escape, structural corrosion or plugging risk. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": 0.09895856201911245,
    "y": -0.08420955523878025,
    "size": 1.2
  },
  {
    "id": "EXH-084",
    "label": "EXH-084",
    "detail": "ESP hopper heater tapes/elements · Quarterly · EL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.5",
    "description": "Component: ESP hopper heater tapes/elements. Pass Criteria: Dry material flow and protection against condensation. Frequency: Quarterly, Owner: EL, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.10795048938592776,
    "y": -0.08254226327474384,
    "size": 1.2
  },
  {
    "id": "EXH-086",
    "label": "EXH-086",
    "detail": "ESP hopper access doors and gaskets · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.5",
    "description": "Component: ESP hopper access doors and gaskets. Pass Criteria: No leakage, no access without high-voltage and thermal isolation. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": 0.11601363110309452,
    "y": -0.07983580014805233,
    "size": 1.2
  },
  {
    "id": "EXH-087",
    "label": "EXH-087",
    "detail": "ESP hopper discharge rotary airlock · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.5",
    "description": "Component: ESP hopper discharge rotary airlock. Pass Criteria: Rotation correct, dust discharged, no uncontrolled false-air ingress. Frequency: Monthly, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.12253081192384659,
    "y": -0.07586289852088522,
    "size": 1.2
  },
  {
    "id": "EXH-088",
    "label": "EXH-088",
    "detail": "ESP hopper screw conveyor or chain conveyor · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.5",
    "description": "Component: ESP hopper screw conveyor or chain conveyor. Pass Criteria: No packing, bent screw or failed discharge route. Frequency: Monthly, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.1269701759104007,
    "y": -0.07055505857499116,
    "size": 1.2
  },
  {
    "id": "EXH-089",
    "label": "EXH-089",
    "detail": "ESP double-flap / pneumatic gate valve · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.5",
    "description": "Component: ESP double-flap / pneumatic gate valve. Pass Criteria: Material discharged without loss of gas sealing. Frequency: Quarterly, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.1289911349614908,
    "y": -0.06402227861190525,
    "size": 1.2
  },
  {
    "id": "EXH-090",
    "label": "EXH-090",
    "detail": "ESP pneumatic dust conveying lines · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.5",
    "description": "Component: ESP pneumatic dust conveying lines. Pass Criteria: Stable dust transport with no leak or blockage. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": 0.12852847202304427,
    "y": -0.05654075792245998,
    "size": 1.2
  },
  {
    "id": "EXH-091",
    "label": "EXH-091",
    "detail": "ESP ash receiver / intermediate bin and silo · Weekly · OP",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.5",
    "description": "Component: ESP ash receiver / intermediate bin and silo. Pass Criteria: Not overfilled; vent and discharge operational. Frequency: Weekly, Owner: OP, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": 0.12583741123573045,
    "y": -0.048511054111005564,
    "size": 1.2
  },
  {
    "id": "EXH-092",
    "label": "EXH-092",
    "detail": "ESP return-dust routing diverter · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.5",
    "description": "Component: ESP return-dust routing diverter. Pass Criteria: Dust destination approved and no process contamination. Frequency: Quarterly, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.12148857492453026,
    "y": -0.04039456920862594,
    "size": 1.2
  },
  {
    "id": "EXH-093",
    "label": "EXH-093",
    "detail": "ESP hopper vibrator / fluidisation pads · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.5",
    "description": "Component: ESP hopper vibrator / fluidisation pads. Pass Criteria: No bridge; energized only as approved by OEM. Frequency: Quarterly, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.1163101837125844,
    "y": -0.03264008609212472,
    "size": 1.2
  },
  {
    "id": "EXH-094",
    "label": "EXH-094",
    "detail": "ESP hopper flange gasket and isolation slide · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.5",
    "description": "Component: ESP hopper flange gasket and isolation slide. Pass Criteria: Controlled isolation and no ash leakage. Frequency: Monthly, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.11128413736755112,
    "y": -0.025613687567747314,
    "size": 1.2
  },
  {
    "id": "EXH-095",
    "label": "EXH-095",
    "detail": "ESP hopper explosion/pressure relief devices · Annually · EH",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.5",
    "description": "Component: ESP hopper explosion/pressure relief devices. Pass Criteria: Undamaged protective component, no obstruction or unauthorized replacement. Frequency: Annually, Owner: EH, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.10741105963752824,
    "y": -0.019544501489945205,
    "size": 1.2
  },
  {
    "id": "EXH-097",
    "label": "EXH-097",
    "detail": "ESP dust screw bearing seal and drive MCB · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.5",
    "description": "Component: ESP dust screw bearing seal and drive MCB. Pass Criteria: Drive available with no material accumulation near hot components. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": 0.10556543188767238,
    "y": -0.014495535275183474,
    "size": 1.2
  },
  {
    "id": "EXH-098",
    "label": "EXH-098",
    "detail": "Main bag filter gas-inlet isolation and hot-gas protective dampers · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.6",
    "description": "Component: Main bag filter gas-inlet isolation and hot-gas protective dampers. Pass Criteria: Isolation/protective damper structure, seating and fail- position hardware conform to approved cause-and-effect arrangement. Frequency: Quarterly, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.10636441485861402,
    "y": -0.010364028375319873,
    "size": 1.2
  },
  {
    "id": "EXH-099",
    "label": "EXH-099",
    "detail": "Baghouse dirty-air entry and diffuser · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.6",
    "description": "Component: Baghouse dirty-air entry and diffuser. Pass Criteria: Even flow and no large deposit/rubbing or air short circuit. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.1100723303042735,
    "y": -0.006910200300766941,
    "size": 1.2
  },
  {
    "id": "EXH-100",
    "label": "EXH-100",
    "detail": "Baghouse outer casing roof/walls/supports · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.6",
    "description": "Component: Baghouse outer casing roof/walls/supports. Pass Criteria: No gas leak or structural defect; engineer repairs. Frequency: Quarterly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": 0.11655724679668523,
    "y": -0.0038080645526402633,
    "size": 1.2
  },
  {
    "id": "EXH-101",
    "label": "EXH-101",
    "detail": "Baghouse internal chamber partition and baffles · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.6",
    "description": "Component: Baghouse internal chamber partition and baffles. Pass Criteria: Separation maintained; clean plenum free of collected dust. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.12530760038816838,
    "y": -0.0007080941647781593,
    "size": 1.2
  },
  {
    "id": "EXH-102",
    "label": "EXH-102",
    "detail": "Filter bags - fabric surface, seam and dust cake · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.6",
    "description": "Component: Filter bags - fabric surface, seam and dust cake. Pass Criteria: No failed or damaged fabric; renew approved media. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.13550674928018752,
    "y": 0.0027003250379035657,
    "size": 1.2
  },
  {
    "id": "EXH-103",
    "label": "EXH-103",
    "detail": "Filter bag top cuffs, snap bands and venturi · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.6",
    "description": "Component: Filter bag top cuffs, snap bands and venturi. Pass Criteria: No annular bypass; bag seated and secured. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.14615357367462276,
    "y": 0.006638218734020828,
    "size": 1.2
  },
  {
    "id": "EXH-104",
    "label": "EXH-104",
    "detail": "Filter cages - straightness, wire corrosion and welded joints · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.6",
    "description": "Component: Filter cages - straightness, wire corrosion and welded joints. Pass Criteria: No broken cage damaging bag; replace defective cages. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.1562094247609742,
    "y": 0.01120698629664848,
    "size": 1.2
  },
  {
    "id": "EXH-105",
    "label": "EXH-105",
    "detail": "Tubesheet - cracks, corrosion, seals and welds · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.6",
    "description": "Component: Tubesheet - cracks, corrosion, seals and welds. Pass Criteria: No dust breakthrough/bag seating bypass. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.16474729710797908,
    "y": 0.016383515234484457,
    "size": 1.2
  },
  {
    "id": "EXH-106",
    "label": "EXH-106",
    "detail": "Baghouse clean-air plenum and outlet manifold · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.6",
    "description": "Component: Baghouse clean-air plenum and outlet manifold. Pass Criteria: No accumulation suggesting bag leak or gasket failure. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.17107884676326207,
    "y": 0.022039850984184754,
    "size": 1.2
  },
  {
    "id": "EXH-111",
    "label": "EXH-111",
    "detail": "Baghouse fire/hot particle protection · Quarterly · EH",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.6",
    "description": "Component: Baghouse fire/hot particle protection. Pass Criteria: Correct alerts and protection; no bypassed safeties. Frequency: Quarterly, Owner: EH, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.17483885793894524,
    "y": 0.027981963147253423,
    "size": 1.2
  },
  {
    "id": "EXH-112",
    "label": "EXH-112",
    "detail": "Baghouse compartment isolation dampers · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.6",
    "description": "Component: Baghouse compartment isolation dampers. Pass Criteria: Each compartment isolated according to OEM sequence. Frequency: Quarterly, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.17601427038851158,
    "y": 0.0339984919364782,
    "size": 1.2
  },
  {
    "id": "EXH-113",
    "label": "EXH-113",
    "detail": "Baghouse access door gasket/clamp/hinges · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.6",
    "description": "Component: Baghouse access door gasket/clamp/hinges. Pass Criteria: Tight closure without false air or dust emission. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": 0.1749145800350908,
    "y": 0.039908616663309,
    "size": 1.2
  },
  {
    "id": "EXH-114",
    "label": "EXH-114",
    "detail": "Baghouse thermal insulation and trace heating · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.6",
    "description": "Component: Baghouse thermal insulation and trace heating. Pass Criteria: No cold bridges and no exposed hot casing. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": 0.17209058732706994,
    "y": 0.04559868977729638,
    "size": 1.2
  },
  {
    "id": "EXH-115",
    "label": "EXH-115",
    "detail": "Baghouse structural expansion frames and sliding shoes · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.6",
    "description": "Component: Baghouse structural expansion frames and sliding shoes. Pass Criteria: Structure free to expand and safely supported. Frequency: Quarterly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": 0.16821728232337688,
    "y": 0.05103990760848788,
    "size": 1.2
  },
  {
    "id": "EXH-116",
    "label": "EXH-116",
    "detail": "Baghouse roof weather covers and vent fittings · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.6",
    "description": "Component: Baghouse roof weather covers and vent fittings. Pass Criteria: No water ingress to bags/electricals. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": 0.16396256265032086,
    "y": 0.05628350234972458,
    "size": 1.2
  },
  {
    "id": "EXH-117",
    "label": "EXH-117",
    "detail": "Baghouse combustion/dust hazard classification · Annually · EH",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.6",
    "description": "Component: Baghouse combustion/dust hazard classification. Pass Criteria: Protection installed if required; no unapproved ignition source. Frequency: Annually, Owner: EH, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.15986545149322223,
    "y": 0.06143488181380506,
    "size": 1.2
  },
  {
    "id": "EXH-118",
    "label": "EXH-118",
    "detail": "Baghouse filter media life and replacement record · Annually · REL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.6",
    "description": "Component: Baghouse filter media life and replacement record. Pass Criteria: Media selected for actual gas chemistry, dewpoint and service. Frequency: Annually, Owner: REL, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.1562452052448467,
    "y": 0.06661280782768186,
    "size": 1.2
  },
  {
    "id": "EXH-119",
    "label": "EXH-119",
    "detail": "Baghouse acid condensate/corrosion survey · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.6",
    "description": "Component: Baghouse acid condensate/corrosion survey. Pass Criteria: No persistent wet cake or shell attack; address dewpoint/cooling controls. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.15315663187041592,
    "y": 0.07190313303208372,
    "size": 1.2
  },
  {
    "id": "EXH-120",
    "label": "EXH-120",
    "detail": "Bag-filter pulse sequencing controller hardware · Weekly · EL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.7",
    "description": "Component: Bag-filter pulse sequencing controller hardware. Pass Criteria: Controller power, relay hardware and terminations sound; physical output modules and enclosure intact. Frequency: Weekly, Owner: EL, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": 0.15039822168454453,
    "y": 0.07731808959422846,
    "size": 1.2
  },
  {
    "id": "EXH-121",
    "label": "EXH-121",
    "detail": "Pulse diaphragm valve body · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.7",
    "description": "Component: Pulse diaphragm valve body. Pass Criteria: Opens/closes reliably; no stuck open bleed. Frequency: Monthly, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.14756993300038582,
    "y": 0.08277130469042553,
    "size": 1.2
  },
  {
    "id": "EXH-122",
    "label": "EXH-122",
    "detail": "Diaphragm membranes and spring assemblies · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.7",
    "description": "Component: Diaphragm membranes and spring assemblies. Pass Criteria: Flexible intact membrane and correct spring/seat. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.1441684603827614,
    "y": 0.08807572311851632,
    "size": 1.2
  },
  {
    "id": "EXH-123",
    "label": "EXH-123",
    "detail": "Pulse-cleaning pilot valve bodies and solenoid coils · Quarterly · IN",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.7",
    "description": "Component: Pulse-cleaning pilot valve bodies and solenoid coils. Pass Criteria: No failed coil or pilot leak; output matches controller command. Frequency: Quarterly, Owner: IN, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.13970117330657775,
    "y": 0.09296700091226295,
    "size": 1.2
  },
  {
    "id": "EXH-124",
    "label": "EXH-124",
    "detail": "Pulse-air receiver, drain and relief-valve hardware · Annually · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.7",
    "description": "Component: Pulse-air receiver, drain and relief-valve hardware. Pass Criteria: Receiver integrity and statutory documentation current; drains/valve/fittings leak-tight and relief certified. Frequency: Annually, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.13379682679718324,
    "y": 0.09714958467706443,
    "size": 1.2
  },
  {
    "id": "EXH-125",
    "label": "EXH-125",
    "detail": "Pulse air compressor/motor and drive · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.7",
    "description": "Component: Pulse air compressor/motor and drive. Pass Criteria: Clean dry air supply, normal temperature/current and standby availability. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": 0.12629212829082664,
    "y": 0.10035766586342074,
    "size": 1.2
  },
  {
    "id": "EXH-126",
    "label": "EXH-126",
    "detail": "Pulse-air dryer / separator / filter elements · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.7",
    "description": "Component: Pulse-air dryer / separator / filter elements. Pass Criteria: No liquid carryover into pilot and pulse valves. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": 0.11727805935988965,
    "y": 0.10241951722442791,
    "size": 1.2
  },
  {
    "id": "EXH-127",
    "label": "EXH-127",
    "detail": "Pulse manifold / distribution header leak test · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.7",
    "description": "Component: Pulse manifold / distribution header leak test. Pass Criteria: No air waste/leakage or damaged header. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": 0.10709755849680659,
    "y": 0.10331216408107746,
    "size": 1.2
  },
  {
    "id": "EXH-128",
    "label": "EXH-128",
    "detail": "Blowpipes / injector jets / nozzles · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.7",
    "description": "Component: Blowpipes / injector jets / nozzles. Pass Criteria: Proper centered pulse into each bag row. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.09629531184985694,
    "y": 0.10319430604893505,
    "size": 1.2
  },
  {
    "id": "EXH-129",
    "label": "EXH-129",
    "detail": "Pulse flexible pilot tubing, fittings and tees · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.7",
    "description": "Component: Pulse flexible pilot tubing, fittings and tees. Pass Criteria: All pilots tight and protected, correct pulse response. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": 0.08552926635331211,
    "y": 0.10240879788427791,
    "size": 1.2
  },
  {
    "id": "EXH-130",
    "label": "EXH-130",
    "detail": "Pulse line isolation valve and nonreturn check · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.7",
    "description": "Component: Pulse line isolation valve and nonreturn check. Pass Criteria: Manifold fully isolated for safe repair and check valve seated. Frequency: Quarterly, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.07546043987804982,
    "y": 0.10145126113621478,
    "size": 1.2
  },
  {
    "id": "EXH-132",
    "label": "EXH-132",
    "detail": "Pulse-air pressure relief and condensate drain · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.7",
    "description": "Component: Pulse-air pressure relief and condensate drain. Pass Criteria: No failed relief device or blocked drain. Frequency: Quarterly, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.06664139591839738,
    "y": 0.10090759525178232,
    "size": 1.2
  },
  {
    "id": "EXH-135",
    "label": "EXH-135",
    "detail": "Pulse header fastening and structural isolation · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.7",
    "description": "Component: Pulse header fastening and structural isolation. Pass Criteria: No fatigue cracks or pipe movement. Frequency: Quarterly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": 0.059423720139156005,
    "y": 0.1013691450539329,
    "size": 1.2
  },
  {
    "id": "EXH-136",
    "label": "EXH-136",
    "detail": "Cleaning type identification (pulse/reverse/shaker) · Annually · REL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.7",
    "description": "Component: Cleaning type identification (pulse/reverse/shaker). Pass Criteria: Uninstalled sub-system marked NA, alternative type given its OEM plan. Frequency: Annually, Owner: REL, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.05390104635455059,
    "y": 0.10333892395728882,
    "size": 1.2
  },
  {
    "id": "EXH-137",
    "label": "EXH-137",
    "detail": "Offline reverse-air / mechanical shaker system (if fitted) · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.7",
    "description": "Component: Offline reverse-air / mechanical shaker system (if fitted). Pass Criteria: Effective cleaning without bag damage, under OEM plan. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.04989739285141359,
    "y": 0.10714467214749746,
    "size": 1.2
  },
  {
    "id": "EXH-138",
    "label": "EXH-138",
    "detail": "Main filter hopper cones and dust bridges · Daily · OP",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.8",
    "description": "Component: Main filter hopper cones and dust bridges. Pass Criteria: No dust flooding into bag compartment; prevent unsafe hopper entry. Frequency: Daily, Owner: OP, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": 0.04700209746973434,
    "y": 0.11287412713211459,
    "size": 1.2
  },
  {
    "id": "EXH-139",
    "label": "EXH-139",
    "detail": "Hopper heaters / local thermostats · Quarterly · EL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.8",
    "description": "Component: Hopper heaters / local thermostats. Pass Criteria: Dry dust flow, no heater ground fault. Frequency: Quarterly, Owner: EL, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.04464408898391416,
    "y": 0.12034468486554278,
    "size": 1.2
  },
  {
    "id": "EXH-140",
    "label": "EXH-140",
    "detail": "Hopper rotary airlock - rotor and tip seals · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.8",
    "description": "Component: Hopper rotary airlock - rotor and tip seals. Pass Criteria: Free rotor and acceptable sealing; repair worn tips. Frequency: Quarterly, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.042191201743562196,
    "y": 0.12911413404126695,
    "size": 1.2
  },
  {
    "id": "EXH-141",
    "label": "EXH-141",
    "detail": "Hopper double-dump valve/pendulum flaps · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.8",
    "description": "Component: Hopper double-dump valve/pendulum flaps. Pass Criteria: Reliable dust discharge without false-air path. Frequency: Quarterly, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.03905601947752396,
    "y": 0.1385322889351433,
    "size": 1.2
  },
  {
    "id": "EXH-142",
    "label": "EXH-142",
    "detail": "Hopper screw conveyor flights / shaft seals · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.8",
    "description": "Component: Hopper screw conveyor flights / shaft seals. Pass Criteria: No jam or dust leakage; replace worn screws. Frequency: Monthly, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.03478906310203009,
    "y": 0.14782633116388835,
    "size": 1.2
  },
  {
    "id": "EXH-143",
    "label": "EXH-143",
    "detail": "Hopper chain/drag conveyors if fitted · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.8",
    "description": "Component: Hopper chain/drag conveyors if fitted. Pass Criteria: Smooth conveying without hanging; OEM take-up setting. Frequency: Quarterly, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": 0.029143074593018296,
    "y": 0.15620675356864677,
    "size": 1.2
  },
  {
    "id": "EXH-144",
    "label": "EXH-144",
    "detail": "Hopper pneumatic conveying airlocks and diverters · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.8",
    "description": "Component: Hopper pneumatic conveying airlocks and diverters. Pass Criteria: No dust discharge buildup or blocked transfer to collection silo. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": 0.02209806766419826,
    "y": 0.1629770580878801,
    "size": 1.2
  },
  {
    "id": "EXH-145",
    "label": "EXH-145",
    "detail": "Dust transport blower or pump motor and gearbox · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.8",
    "description": "Component: Dust transport blower or pump motor and gearbox. Pass Criteria: Stable conveyance, no overheating or leakage. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": 0.013844531392210719,
    "y": 0.167629494488641,
    "size": 1.2
  },
  {
    "id": "EXH-146",
    "label": "EXH-146",
    "detail": "Dust return bin level, vent and extract gate · Weekly · OP",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.8",
    "description": "Component: Dust return bin level, vent and extract gate. Pass Criteria: No overfill or unstable return to approved destination. Frequency: Weekly, Owner: OP, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": 0.0047301746844244305,
    "y": 0.1699113288748195,
    "size": 1.2
  },
  {
    "id": "EXH-147",
    "label": "EXH-147",
    "detail": "Dust return branch flange seals and expansion · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.8",
    "description": "Component: Dust return branch flange seals and expansion. Pass Criteria: No powder emission or blockage. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.004817655814377823,
    "y": 0.16985104070817678,
    "size": 1.2
  },
  {
    "id": "EXH-148",
    "label": "EXH-148",
    "detail": "Hopper inspection doors / pressure-relief devices · Quarterly · EH",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.8",
    "description": "Component: Hopper inspection doors / pressure-relief devices. Pass Criteria: Closed with valid certification and vent path. Frequency: Quarterly, Owner: EH, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.014377543867747759,
    "y": 0.16774061578033295,
    "size": 1.2
  },
  {
    "id": "EXH-149",
    "label": "EXH-149",
    "detail": "Baghouse dust mass-balance and hopper inventory · Monthly · OP",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.8",
    "description": "Component: Baghouse dust mass-balance and hopper inventory. Pass Criteria: No silent hopper plugging; any unusual carryover investigated. Frequency: Monthly, Owner: OP, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.0236103181380029,
    "y": 0.16407754213574455,
    "size": 1.2
  },
  {
    "id": "EXH-150",
    "label": "EXH-150",
    "detail": "Baghouse ash-handling motor starter and overload · Quarterly · EL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.8",
    "description": "Component: Baghouse ash-handling motor starter and overload. Pass Criteria: Correct protection and no unreported trips. Frequency: Quarterly, Owner: EL, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.03231140190682644,
    "y": 0.15947691262789118,
    "size": 1.2
  },
  {
    "id": "EXH-151",
    "label": "EXH-151",
    "detail": "Post-collector fan identity / process position · Annually · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.9",
    "description": "Component: Post-collector fan identity / process position. Pass Criteria: No false assumption that every installation has a separate filter fan. Frequency: Annually, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.040429891075684746,
    "y": 0.1545689896220951,
    "size": 1.2
  },
  {
    "id": "EXH-152",
    "label": "EXH-152",
    "detail": "Additional filter/exhaust fan impeller · Weekly · REL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.9",
    "description": "Component: Additional filter/exhaust fan impeller. Pass Criteria: No imbalance, excessive clearance or cracked hub. Frequency: Weekly, Owner: REL, Mode: RUN + STOP.",
    "machine": "EXH-IF-01",
    "x": -0.04805222105313086,
    "y": 0.14989982212775216,
    "size": 1.2
  },
  {
    "id": "EXH-153",
    "label": "EXH-153",
    "detail": "Filter fan bearings/grease/oil and shaft seals · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.9",
    "description": "Component: Filter fan bearings/grease/oil and shaft seals. Pass Criteria: Normal trend and lubricant for duty; bearings secure. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.055355761448433544,
    "y": 0.14585163929627196,
    "size": 1.2
  },
  {
    "id": "EXH-154",
    "label": "EXH-154",
    "detail": "Filter fan motor/VFD/MCC · Weekly · EL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.9",
    "description": "Component: Filter fan motor/VFD/MCC. Pass Criteria: No overcurrent/tripped cooling; correct protection. Frequency: Weekly, Owner: EL, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.06254395872457674,
    "y": 0.14259595042543824,
    "size": 1.2
  },
  {
    "id": "EXH-155",
    "label": "EXH-155",
    "detail": "Filter fan coupling, guards and foundation · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.9",
    "description": "Component: Filter fan coupling, guards and foundation. Pass Criteria: No relative movement or loose guard; repair isolated. Frequency: Quarterly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.06977846408619906,
    "y": 0.14008625957119117,
    "size": 1.2
  },
  {
    "id": "EXH-156",
    "label": "EXH-156",
    "detail": "Filter fan outlet damper and actuator · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.9",
    "description": "Component: Filter fan outlet damper and actuator. Pass Criteria: Authorized smooth travel and correct position. Frequency: Quarterly, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.07712426020988931,
    "y": 0.13809014922776863,
    "size": 1.2
  },
  {
    "id": "EXH-157",
    "label": "EXH-157",
    "detail": "Fan inlet silencer and inlet guide vane · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.9",
    "description": "Component: Fan inlet silencer and inlet guide vane. Pass Criteria: No loose silencer or jammed vanes. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.08452100435339999,
    "y": 0.13625349589241342,
    "size": 1.2
  },
  {
    "id": "EXH-158",
    "label": "EXH-158",
    "detail": "Fan expansion connectors / compensator boots · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.9",
    "description": "Component: Fan expansion connectors / compensator boots. Pass Criteria: Continuous gas sealing, no binding. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.09178817993611964,
    "y": 0.13418400523959353,
    "size": 1.2
  },
  {
    "id": "EXH-159",
    "label": "EXH-159",
    "detail": "Post-filter outlet clean-gas duct and isolation · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.9",
    "description": "Component: Post-filter outlet clean-gas duct and isolation. Pass Criteria: Tight ducts and valid authorized routing. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.09866430960945934,
    "y": 0.13153808354202776,
    "size": 1.2
  },
  {
    "id": "EXH-160",
    "label": "EXH-160",
    "detail": "Stack shell corrosion and vertical welds · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.9",
    "description": "Component: Stack shell corrosion and vertical welds. Pass Criteria: No wall loss/unsafe structural component; structural engineer review. Frequency: Quarterly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.10487290407581848,
    "y": 0.12809483699432045,
    "size": 1.2
  },
  {
    "id": "EXH-161",
    "label": "EXH-161",
    "detail": "Stack rain hood / drains / low point water trap · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.9",
    "description": "Component: Stack rain hood / drains / low point water trap. Pass Criteria: Free drainage and no corrosion accelerating wet spots. Frequency: Quarterly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.11020154819063124,
    "y": 0.12380371270775156,
    "size": 1.2
  },
  {
    "id": "EXH-162",
    "label": "EXH-162",
    "detail": "Stack guy wires / anchor blocks (if fitted) · Annually · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.9",
    "description": "Component: Stack guy wires / anchor blocks (if fitted). Pass Criteria: Acceptable engineered tension and integrity. Frequency: Annually, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.11457687316202142,
    "y": 0.11879742826105658,
    "size": 1.2
  },
  {
    "id": "EXH-163",
    "label": "EXH-163",
    "detail": "Stack duct/stack access flanges and test ports · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.9",
    "description": "Component: Stack duct/stack access flanges and test ports. Pass Criteria: Sampling stations serviceable, no hot-gas escape. Frequency: Quarterly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.11811795101925852,
    "y": 0.1133684103116124,
    "size": 1.2
  },
  {
    "id": "EXH-167",
    "label": "EXH-167",
    "detail": "Emission control emergency operation / power loss · Annually · EH",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.9",
    "description": "Component: Emission control emergency operation / power loss. Pass Criteria: Permissives and safe stop tested under authorized exercise. Frequency: Annually, Owner: EH, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.12115403142999105,
    "y": 0.10791375387132951,
    "size": 1.2
  },
  {
    "id": "EXH-168",
    "label": "EXH-168",
    "detail": "Dust-control gas temperature/dewpoint risk · Daily · OP",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.9",
    "description": "Component: Dust-control gas temperature/dewpoint risk. Pass Criteria: No damaging condensation/overheat episodes. Frequency: Daily, Owner: OP, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.1241989708135703,
    "y": 0.1028594739764022,
    "size": 1.2
  },
  {
    "id": "EXH-169",
    "label": "EXH-169",
    "detail": "Plant compressed air pressure receiver and certification · Annually · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.10",
    "description": "Component: Plant compressed air pressure receiver and certification. Pass Criteria: Safe dry supply, no expired pressure-vessel checks. Frequency: Annually, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.12788301454825987,
    "y": 0.098578506784998,
    "size": 1.2
  },
  {
    "id": "EXH-170",
    "label": "EXH-170",
    "detail": "Compressed air dryer and coalescing filters · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.10",
    "description": "Component: Compressed air dryer and coalescing filters. Pass Criteria: Clean dry air to pulse valves, air cannons and actuators. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.1328512183765492,
    "y": 0.0953178787719281,
    "size": 1.2
  },
  {
    "id": "EXH-171",
    "label": "EXH-171",
    "detail": "Instrument-air distribution root valves, fittings and branches · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.10",
    "description": "Component: Instrument-air distribution root valves, fittings and branches. Pass Criteria: Identified air valves, branches, drains, fittings and tubes mechanically secure, accessible and leak-tight. Frequency: Quarterly, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.13964506061928872,
    "y": 0.09314856248989743,
    "size": 1.2
  },
  {
    "id": "EXH-172",
    "label": "EXH-172",
    "detail": "Gas treatment cooling water pumps and strainers · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.10",
    "description": "Component: Gas treatment cooling water pumps and strainers. Pass Criteria: Water flow within approved band; no cavitation or coolant leak. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.14858824030772366,
    "y": 0.09194716788413304,
    "size": 1.2
  },
  {
    "id": "EXH-173",
    "label": "EXH-173",
    "detail": "Cooling water heat exchanger / fouling · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.10",
    "description": "Component: Cooling water heat exchanger / fouling. Pass Criteria: No cross-contamination or restricted heat transfer. Frequency: Quarterly, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.15969831277649543,
    "y": 0.09141262397407725,
    "size": 1.2
  },
  {
    "id": "EXH-174",
    "label": "EXH-174",
    "detail": "Main collector access and confined-space entry · Event-based · EH",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.10",
    "description": "Component: Main collector access and confined-space entry. Pass Criteria: Never enter until gas/isolation/HV tests signed off. Frequency: Event-based, Owner: EH, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.17264241139896316,
    "y": 0.09111452148497587,
    "size": 1.2
  },
  {
    "id": "EXH-175",
    "label": "EXH-175",
    "detail": "ESP HV stored-energy discharge / grounding · Event-based · EH",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.10",
    "description": "Component: ESP HV stored-energy discharge / grounding. Pass Criteria: Field proven de-energized and grounded; no access without clearance. Frequency: Event-based, Owner: EH, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.18674833036613958,
    "y": 0.09056402290233459,
    "size": 1.2
  },
  {
    "id": "EXH-176",
    "label": "EXH-176",
    "detail": "Dust ignition and fire protection audit · Annually · EH",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.10",
    "description": "Component: Dust ignition and fire protection audit. Pass Criteria: Applicable hazard assessment current; no assumed explosion-protection hardware. Frequency: Annually, Owner: EH, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.20107287287071,
    "y": 0.08929426164110332,
    "size": 1.2
  },
  {
    "id": "EXH-177",
    "label": "EXH-177",
    "detail": "Spare filter bags, pulse diaphragms, ESP electrodes · Quarterly · REL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.10",
    "description": "Component: Spare filter bags, pulse diaphragms, ESP electrodes. Pass Criteria: Spares fit actual OEM and service rating; no substitution without engineering. Frequency: Quarterly, Owner: REL, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.21451925629377208,
    "y": 0.08693565873653789,
    "size": 1.2
  },
  {
    "id": "EXH-178",
    "label": "EXH-178",
    "detail": "Dust collector inspection scaffold and lifting points · Event-based · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.10",
    "description": "Component: Dust collector inspection scaffold and lifting points. Pass Criteria: No improvised lift on duct or roof. Frequency: Event-based, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.22598634671939408,
    "y": 0.08327281968626014,
    "size": 1.2
  },
  {
    "id": "EXH-179",
    "label": "EXH-179",
    "detail": "Filter fan / ID fan operating point review · Quarterly · REL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.10",
    "description": "Component: Filter fan / ID fan operating point review. Pass Criteria: Stable process without exceeding fan limits; no unauthorized setpoint change. Frequency: Quarterly, Owner: REL, Mode: RUN.",
    "machine": "EXH-IF-01",
    "x": -0.23452624807408234,
    "y": 0.07827335720891068,
    "size": 1.2
  },
  {
    "id": "EXH-180",
    "label": "EXH-180",
    "detail": "ESP/baghouse operational responsibility · Annually · REL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.10",
    "description": "Component: ESP/baghouse operational responsibility. Pass Criteria: CMMS ownership and service plans complete before Rev.01 field issue. Frequency: Annually, Owner: REL, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.239484503889735,
    "y": 0.07208438327366112,
    "size": 1.2
  },
  {
    "id": "EXH-181",
    "label": "EXH-181",
    "detail": "Dust discharge valve/flange/coupling asset census · Annually · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.10",
    "description": "Component: Dust discharge valve/flange/coupling asset census. Pass Criteria: No untagged part; task performed per unique physical asset. Frequency: Annually, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.24059938686547377,
    "y": 0.06499847957887918,
    "size": 1.2
  },
  {
    "id": "EXH-182",
    "label": "EXH-182",
    "detail": "Gas-treatment overhaul spare gasket/seal kit · Annually · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 6.10",
    "description": "Component: Gas-treatment overhaul spare gasket/seal kit. Pass Criteria: Approved spare matches actual service and material rating. Frequency: Annually, Owner: ME, Mode: OFF.",
    "machine": "EXH-IF-01",
    "x": -0.23804315056106143,
    "y": 0.05739653336722993,
    "size": 1.2
  },
  {
    "id": "KLN-001",
    "label": "KLN-001",
    "detail": "Stationary kiln smoke/inlet chamber shell · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.1",
    "description": "Component: Stationary kiln smoke/inlet chamber shell. Pass Criteria: No exposed-hot spots or leaks; plan refractory repair. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": -0.23239763230611918,
    "y": 0.049678869155184435,
    "size": 1.2
  },
  {
    "id": "KLN-002",
    "label": "KLN-002",
    "detail": "Inlet meal chute / duct / feed spout · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.1",
    "description": "Component: Inlet meal chute / duct / feed spout. Pass Criteria: Clear passage, intact liner and gaskets. Frequency: Weekly, Owner: ME, Mode: RUN + STOP.",
    "machine": "KLN-01-01",
    "x": -0.2245675812155247,
    "y": 0.042197878760837026,
    "size": 1.2
  },
  {
    "id": "KLN-003",
    "label": "KLN-003",
    "detail": "Inlet seal graphite / lamella / labyrinth elements · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.1",
    "description": "Component: Inlet seal graphite / lamella / labyrinth elements. Pass Criteria: Leakage normal per OEM; repair failed elements on stop. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": -0.2156456086850191,
    "y": 0.03520455933337038,
    "size": 1.2
  },
  {
    "id": "KLN-004",
    "label": "KLN-004",
    "detail": "Inlet seal retaining rings / springs / bolting · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.1",
    "description": "Component: Inlet seal retaining rings / springs / bolting. Pass Criteria: Uniform preload, no missing ring or spring. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": -0.20675085234417975,
    "y": 0.028818215707208994,
    "size": 1.2
  },
  {
    "id": "KLN-005",
    "label": "KLN-005",
    "detail": "Inlet chamber manways / flameproof gaskets · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.1",
    "description": "Component: Inlet chamber manways / flameproof gaskets. Pass Criteria: Closed tight with no hot-gas escape. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": -0.198867842533561,
    "y": 0.02302372526274448,
    "size": 1.2
  },
  {
    "id": "KLN-010",
    "label": "KLN-010",
    "detail": "Smoke chamber refractory / anchors · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.1",
    "description": "Component: Smoke chamber refractory / anchors. Pass Criteria: No loose lining/metal exposed; kiln startup approved. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": -0.19271186906450494,
    "y": 0.017695178003573335,
    "size": 1.2
  },
  {
    "id": "KLN-011",
    "label": "KLN-011",
    "detail": "Riser-to-inlet flanges / expansion seals · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.1",
    "description": "Component: Riser-to-inlet flanges / expansion seals. Pass Criteria: Correct sealed connection; replace gasket under isolation. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": -0.18864239080466802,
    "y": 0.012639498988658696,
    "size": 1.2
  },
  {
    "id": "KLN-012",
    "label": "KLN-012",
    "detail": "Kiln shell plates / circumferential welds · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.2",
    "description": "Component: Kiln shell plates / circumferential welds. Pass Criteria: No structural crack / abnormal deformation; engineering acceptance. Frequency: Quarterly, Owner: ME, Mode: RUN + STOP.",
    "machine": "KLN-01-01",
    "x": -0.18663755503747687,
    "y": 0.0076498558869362,
    "size": 1.2
  },
  {
    "id": "KLN-013",
    "label": "KLN-013",
    "detail": "Refractory brick lining / joints · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.2",
    "description": "Component: Refractory brick lining / joints. Pass Criteria: Thickness and lining anchorage to OEM approved limits. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": -0.18633220845498488,
    "y": 0.002556988363325338,
    "size": 1.2
  },
  {
    "id": "KLN-014",
    "label": "KLN-014",
    "detail": "Refractory metal anchors / castable sectors · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.2",
    "description": "Component: Refractory metal anchors / castable sectors. Pass Criteria: Secure anchors, no shell exposure or loose fragments. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": -0.18711079247402906,
    "y": -0.002732621475797732,
    "size": 1.2
  },
  {
    "id": "KLN-017",
    "label": "KLN-017",
    "detail": "Tyre 1 / retaining bars / filler bars · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.2",
    "description": "Component: Tyre 1 / retaining bars / filler bars. Pass Criteria: Within OEM creep/gap band; rising slip requires alignment review. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": -0.1882371770794719,
    "y": -0.008219763443312829,
    "size": 1.2
  },
  {
    "id": "KLN-018",
    "label": "KLN-018",
    "detail": "Tyre 2 / retaining bars / filler bars · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.2",
    "description": "Component: Tyre 2 / retaining bars / filler bars. Pass Criteria: Within OEM creep/gap band; rising slip requires alignment review. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": -0.1889974494444659,
    "y": -0.01382002469230904,
    "size": 1.2
  },
  {
    "id": "KLN-019",
    "label": "KLN-019",
    "detail": "Tyre 3 / retaining bars / filler bars · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.2",
    "description": "Component: Tyre 3 / retaining bars / filler bars. Pass Criteria: Within OEM creep/gap band; rising slip requires alignment review. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": -0.1888299827512466,
    "y": -0.019393764397796883,
    "size": 1.2
  },
  {
    "id": "KLN-020",
    "label": "KLN-020",
    "detail": "Tyre face / roller wear profile · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.2",
    "description": "Component: Tyre face / roller wear profile. Pass Criteria: No severe profile loss, galling or metal breakage; call kiln OEM. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": -0.18742002261916987,
    "y": -0.024791496938699083,
    "size": 1.2
  },
  {
    "id": "KLN-021",
    "label": "KLN-021",
    "detail": "Tyre mounting pads / retaining bolts · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.2",
    "description": "Component: Tyre mounting pads / retaining bolts. Pass Criteria: No loose pads/wedge/retainer; use approved repair technique. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": -0.18474296546565858,
    "y": -0.02990409605196288,
    "size": 1.2
  },
  {
    "id": "KLN-022",
    "label": "KLN-022",
    "detail": "Tyre thermal expansion / fit · Weekly · REL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.2",
    "description": "Component: Tyre thermal expansion / fit. Pass Criteria: Stable under equal load/heat; escalate sudden change. Frequency: Weekly, Owner: REL, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": -0.1810501634846739,
    "y": -0.03470586403480694,
    "size": 1.2
  },
  {
    "id": "KLN-116",
    "label": "KLN-116",
    "detail": "Kiln hot alignment and shell ovality survey · 1–2 years · REL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.2",
    "description": "Component: Kiln hot alignment and shell ovality survey. Pass Criteria: Kiln axis, roller settings and ovality within kiln OEM limits; corrective roller adjustment only per engineered survey. Frequency: 1–2 years, Owner: REL, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": -0.17680169151651798,
    "y": -0.03927963930755461,
    "size": 1.2
  },
  {
    "id": "KLN-023",
    "label": "KLN-023",
    "detail": "Station 1 left roller tread / shell contact · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.3",
    "description": "Component: Station 1 left roller tread / shell contact. Pass Criteria: Correct tracking; engineer-approved roller alignment only after survey. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": -0.1725601159264924,
    "y": -0.043816566765404796,
    "size": 1.2
  },
  {
    "id": "KLN-024",
    "label": "KLN-024",
    "detail": "Station 1 right roller tread / shell contact · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.3",
    "description": "Component: Station 1 right roller tread / shell contact. Pass Criteria: Correct tracking; engineer-approved roller alignment only after survey. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": -0.16886618105339685,
    "y": -0.04858828524011265,
    "size": 1.2
  },
  {
    "id": "KLN-025",
    "label": "KLN-025",
    "detail": "Station 1 left bearing A / B · Daily · REL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.3",
    "description": "Component: Station 1 left bearing A / B. Pass Criteria: Both readings consistent with load and OEM limits. Frequency: Daily, Owner: REL, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": -0.1661202591699939,
    "y": -0.05389510359400365,
    "size": 1.2
  },
  {
    "id": "KLN-026",
    "label": "KLN-026",
    "detail": "Station 1 right bearing A / B · Daily · REL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.3",
    "description": "Component: Station 1 right bearing A / B. Pass Criteria: Both readings consistent with load and OEM limits. Frequency: Daily, Owner: REL, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": -0.16449191577005684,
    "y": -0.05999908994219158,
    "size": 1.2
  },
  {
    "id": "KLN-027",
    "label": "KLN-027",
    "detail": "Station 1 roller oil-bath reservoir, sight glasses and breathers · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.3",
    "description": "Component: Station 1 roller oil-bath reservoir, sight glasses and breathers. Pass Criteria: Correct oil level/grade; alarm verified after stop. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": -0.16387436113964307,
    "y": -0.06705479774399609,
    "size": 1.2
  },
  {
    "id": "KLN-028",
    "label": "KLN-028",
    "detail": "Station 1 roller bearing bolts / foundations · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.3",
    "description": "Component: Station 1 roller bearing bolts / foundations. Pass Criteria: No uplift/cracked grout or hot bearing housing. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": -0.16389197622546492,
    "y": -0.07505178414838543,
    "size": 1.2
  },
  {
    "id": "KLN-029",
    "label": "KLN-029",
    "detail": "Station 1 roller adjustment screws / locks · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.3",
    "description": "Component: Station 1 roller adjustment screws / locks. Pass Criteria: Alignment adjustments locked and documented; no unauthorized turning. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": -0.16395913953619135,
    "y": -0.083781765720205,
    "size": 1.2
  },
  {
    "id": "KLN-031",
    "label": "KLN-031",
    "detail": "Station 2 left roller tread / shell contact · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.4",
    "description": "Component: Station 2 left roller tread / shell contact. Pass Criteria: Correct tracking; engineer-approved roller alignment only after survey. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": -0.16337909937328943,
    "y": -0.09283935199611752,
    "size": 1.2
  },
  {
    "id": "KLN-032",
    "label": "KLN-032",
    "detail": "Station 2 right roller tread / shell contact · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.4",
    "description": "Component: Station 2 right roller tread / shell contact. Pass Criteria: Correct tracking; engineer-approved roller alignment only after survey. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": -0.1614643764551692,
    "y": -0.10165945109640835,
    "size": 1.2
  },
  {
    "id": "KLN-033",
    "label": "KLN-033",
    "detail": "Station 2 left bearing A / B · Daily · REL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.4",
    "description": "Component: Station 2 left bearing A / B. Pass Criteria: Both readings consistent with load and OEM limits. Frequency: Daily, Owner: REL, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": -0.15765645546231197,
    "y": -0.10958769884036935,
    "size": 1.2
  },
  {
    "id": "KLN-034",
    "label": "KLN-034",
    "detail": "Station 2 right bearing A / B · Daily · REL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.4",
    "description": "Component: Station 2 right bearing A / B. Pass Criteria: Both readings consistent with load and OEM limits. Frequency: Daily, Owner: REL, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": -0.15162296664520508,
    "y": -0.11597387055006657,
    "size": 1.2
  },
  {
    "id": "KLN-035",
    "label": "KLN-035",
    "detail": "Station 2 roller oil-bath reservoir, sight glasses and breathers · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.4",
    "description": "Component: Station 2 roller oil-bath reservoir, sight glasses and breathers. Pass Criteria: Correct oil level/grade; alarm verified after stop. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": -0.14331502333519383,
    "y": -0.12027341027416706,
    "size": 1.2
  },
  {
    "id": "KLN-036",
    "label": "KLN-036",
    "detail": "Station 2 roller bearing bolts / foundations · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.4",
    "description": "Component: Station 2 roller bearing bolts / foundations. Pass Criteria: No uplift/cracked grout or hot bearing housing. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": -0.1329749742150367,
    "y": -0.12213991260650582,
    "size": 1.2
  },
  {
    "id": "KLN-037",
    "label": "KLN-037",
    "detail": "Station 2 roller adjustment screws / locks · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.4",
    "description": "Component: Station 2 roller adjustment screws / locks. Pass Criteria: Alignment adjustments locked and documented; no unauthorized turning. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": -0.12109408613350145,
    "y": -0.12149212898590324,
    "size": 1.2
  },
  {
    "id": "KLN-039",
    "label": "KLN-039",
    "detail": "Station 3 left roller tread / shell contact · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.5",
    "description": "Component: Station 3 left roller tread / shell contact. Pass Criteria: Correct tracking; engineer-approved roller alignment only after survey. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": -0.10832884022125078,
    "y": -0.11854280396368248,
    "size": 1.2
  },
  {
    "id": "KLN-040",
    "label": "KLN-040",
    "detail": "Station 3 right roller tread / shell contact · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.5",
    "description": "Component: Station 3 right roller tread / shell contact. Pass Criteria: Correct tracking; engineer-approved roller alignment only after survey. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": -0.095391890439039,
    "y": -0.11378278352403269,
    "size": 1.2
  },
  {
    "id": "KLN-041",
    "label": "KLN-041",
    "detail": "Station 3 left bearing A / B · Daily · REL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.5",
    "description": "Component: Station 3 left bearing A / B. Pass Criteria: Both readings consistent with load and OEM limits. Frequency: Daily, Owner: REL, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": -0.08293795323476555,
    "y": -0.10792132831859773,
    "size": 1.2
  },
  {
    "id": "KLN-042",
    "label": "KLN-042",
    "detail": "Station 3 right bearing A / B · Daily · REL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.5",
    "description": "Component: Station 3 right bearing A / B. Pass Criteria: Both readings consistent with load and OEM limits. Frequency: Daily, Owner: REL, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": -0.07146523717353516,
    "y": -0.10179109150563385,
    "size": 1.2
  },
  {
    "id": "KLN-043",
    "label": "KLN-043",
    "detail": "Station 3 roller oil-bath reservoir, sight glasses and breathers · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.5",
    "description": "Component: Station 3 roller oil-bath reservoir, sight glasses and breathers. Pass Criteria: Correct oil level/grade; alarm verified after stop. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": -0.061249494269234886,
    "y": -0.09623243447873063,
    "size": 1.2
  },
  {
    "id": "KLN-044",
    "label": "KLN-044",
    "detail": "Station 3 roller bearing bolts / foundations · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.5",
    "description": "Component: Station 3 roller bearing bolts / foundations. Pass Criteria: No uplift/cracked grout or hot bearing housing. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": -0.052321125471787314,
    "y": -0.0919755206729222,
    "size": 1.2
  },
  {
    "id": "KLN-045",
    "label": "KLN-045",
    "detail": "Station 3 roller adjustment screws / locks · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.5",
    "description": "Component: Station 3 roller adjustment screws / locks. Pass Criteria: Alignment adjustments locked and documented; no unauthorized turning. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": -0.04448732917559326,
    "y": -0.08953924035183963,
    "size": 1.2
  },
  {
    "id": "KLN-047",
    "label": "KLN-047",
    "detail": "Main motor casing / fan guard / cooling · Weekly · EL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.6",
    "description": "Component: Main motor casing / fan guard / cooling. Pass Criteria: No blocked cooling or enclosure overtemperature. Frequency: Weekly, Owner: EL, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": -0.037392694107457436,
    "y": -0.08916333030147859,
    "size": 1.2
  },
  {
    "id": "KLN-048",
    "label": "KLN-048",
    "detail": "Main motor DE bearing + NDE bearing · Weekly · REL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.6",
    "description": "Component: Main motor DE bearing + NDE bearing. Pass Criteria: Stable under similar load; investigate step rises. Frequency: Weekly, Owner: REL, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": -0.030604560054299464,
    "y": -0.09078450665832412,
    "size": 1.2
  },
  {
    "id": "KLN-049",
    "label": "KLN-049",
    "detail": "Motor rotor and winding insulation · Planned stop · EL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.6",
    "description": "Component: Motor rotor and winding insulation. Pass Criteria: OEM electrical condition; repair/rewind after failure assessment. Frequency: Planned stop, Owner: EL, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": -0.023705240710546343,
    "y": -0.09405998831049293,
    "size": 1.2
  },
  {
    "id": "KLN-050",
    "label": "KLN-050",
    "detail": "Main motor MCC / VFD / cable terminations · Planned stop · EL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.6",
    "description": "Component: Main motor MCC / VFD / cable terminations. Pass Criteria: No overheating/protection defeats; annual testing by qualified electrician. Frequency: Planned stop, Owner: EL, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": -0.016372592149516793,
    "y": -0.09843375979640522,
    "size": 1.2
  },
  {
    "id": "KLN-051",
    "label": "KLN-051",
    "detail": "Motor flexible coupling / keys / guard · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.6",
    "description": "Component: Motor flexible coupling / keys / guard. Pass Criteria: No cracked insert or loose key; align to OEM spec. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": -0.008433474397001444,
    "y": -0.10323372437648454,
    "size": 1.2
  },
  {
    "id": "KLN-052",
    "label": "KLN-052",
    "detail": "Gearbox casing / access cover / breather · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.6",
    "description": "Component: Gearbox casing / access cover / breather. Pass Criteria: Sealed, clean, correctly ventilated and no foundation motion. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": 0.0001192703455463566,
    "y": -0.10778280218354964,
    "size": 1.2
  },
  {
    "id": "KLN-053",
    "label": "KLN-053",
    "detail": "Gearbox input shaft bearing · Weekly · REL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.6",
    "description": "Component: Gearbox input shaft bearing. Pass Criteria: Trending within learned baseline; investigate harmonics/new peaks. Frequency: Weekly, Owner: REL, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": 0.009147859475572274,
    "y": -0.11150493083945111,
    "size": 1.2
  },
  {
    "id": "KLN-054",
    "label": "KLN-054",
    "detail": "Gearbox output shaft bearing · Weekly · REL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.6",
    "description": "Component: Gearbox output shaft bearing. Pass Criteria: Trending within learned baseline; investigate harmonics/new peaks. Frequency: Weekly, Owner: REL, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": 0.01842215261137439,
    "y": -0.11400818349068957,
    "size": 1.2
  },
  {
    "id": "KLN-055",
    "label": "KLN-055",
    "detail": "Gearbox internal gear stages · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.6",
    "description": "Component: Gearbox internal gear stages. Pass Criteria: No spalling/severe tooth damage; metrology/repair required if abnormal. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": 0.027690719483768746,
    "y": -0.11513158539276779,
    "size": 1.2
  },
  {
    "id": "KLN-056",
    "label": "KLN-056",
    "detail": "Gearbox bearings / shims / retention · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.6",
    "description": "Component: Gearbox bearings / shims / retention. Pass Criteria: OEM bearing fits and preload restored; record metrology. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": 0.03675352638973585,
    "y": -0.11494888089006465,
    "size": 1.2
  },
  {
    "id": "KLN-057",
    "label": "KLN-057",
    "detail": "Gearbox drain / fill / sight plug · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.6",
    "description": "Component: Gearbox drain / fill / sight plug. Pass Criteria: No leakage/particles inconsistent with baseline. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": 0.04551910405913685,
    "y": -0.11373026364021137,
    "size": 1.2
  },
  {
    "id": "KLN-058",
    "label": "KLN-058",
    "detail": "Pinion shaft stationary bearings and housings · Weekly · REL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.6",
    "description": "Component: Pinion shaft stationary bearings and housings. Pass Criteria: No rising mesh vibration or shaft movement. Frequency: Weekly, Owner: REL, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": 0.05403240036411229,
    "y": -0.11187053180114857,
    "size": 1.2
  },
  {
    "id": "KLN-059",
    "label": "KLN-059",
    "detail": "Pinion teeth / face wear / contact · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.6",
    "description": "Component: Pinion teeth / face wear / contact. Pass Criteria: OEM acceptable mesh; rectify alignment/wear after expert review. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": 0.06246582049351271,
    "y": -0.10979793181308213,
    "size": 1.2
  },
  {
    "id": "KLN-060",
    "label": "KLN-060",
    "detail": "Girth gear rim / tooth flanks · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.6",
    "description": "Component: Girth gear rim / tooth flanks. Pass Criteria: Even film and contact; expert evaluation on bottoming or tooth failure. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": 0.07107396313147828,
    "y": -0.1078810845871414,
    "size": 1.2
  },
  {
    "id": "KLN-061",
    "label": "KLN-061",
    "detail": "Girth gear bolted flange / key / shell lug · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.6",
    "description": "Component: Girth gear bolted flange / key / shell lug. Pass Criteria: No movement or cracking; OEM torque and repair procedure. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": 0.08012066360930939,
    "y": -0.10635131622900378,
    "size": 1.2
  },
  {
    "id": "KLN-062",
    "label": "KLN-062",
    "detail": "Girth gear split joints and guard · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.6",
    "description": "Component: Girth gear split joints and guard. Pass Criteria: No missing bolts or exposed rotating teeth. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": 0.08979349866973106,
    "y": -0.10525449941279712,
    "size": 1.2
  },
  {
    "id": "KLN-114",
    "label": "KLN-114",
    "detail": "Girth gear and pinion running thermography · Monthly · REL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.6",
    "description": "Component: Girth gear and pinion running thermography. Pass Criteria: Even temperature across the face width; a hot edge or rising difference indicates misalignment or lubrication fault — investigate. Frequency: Monthly, Owner: REL, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": 0.10012451742805879,
    "y": -0.10444078104176804,
    "size": 1.2
  },
  {
    "id": "KLN-115",
    "label": "KLN-115",
    "detail": "Girth gear and pinion stroboscope inspection · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.6",
    "description": "Component: Girth gear and pinion stroboscope inspection. Pass Criteria: Full-face contact, even lubricant film and all spray nozzles delivering. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": 0.11093581941181412,
    "y": -0.10359340873348159,
    "size": 1.2
  },
  {
    "id": "KLN-117",
    "label": "KLN-117",
    "detail": "Girth gear radial / axial runout measurement · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.6",
    "description": "Component: Girth gear radial / axial runout measurement. Pass Criteria: Runout and backlash within kiln OEM limits; re-shim or adjust per OEM if exceeded. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": 0.12182460887479794,
    "y": -0.10229060416030115,
    "size": 1.2
  },
  {
    "id": "KLN-064",
    "label": "KLN-064",
    "detail": "Gearbox lubricating-oil tank, sight glass and fittings · Daily · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.7",
    "description": "Component: Gearbox lubricating-oil tank, sight glass and fittings. Pass Criteria: OEM level and clean reservoir; investigate loss. Frequency: Daily, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": 0.13219517849305618,
    "y": -0.10008839893369888,
    "size": 1.2
  },
  {
    "id": "KLN-065",
    "label": "KLN-065",
    "detail": "Oil pump duty motor / coupling · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.7",
    "description": "Component: Oil pump duty motor / coupling. Pass Criteria: Pump starts on command, no cavitation or damage. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": 0.14133622276046162,
    "y": -0.09660863902514494,
    "size": 1.2
  },
  {
    "id": "KLN-066",
    "label": "KLN-066",
    "detail": "Standby lube pump / automatic selection · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.7",
    "description": "Component: Standby lube pump / automatic selection. Pass Criteria: Backup available; restore failed pump before critical service. Frequency: Quarterly, Owner: ME, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": 0.14853266380428007,
    "y": -0.09161562558090186,
    "size": 1.2
  },
  {
    "id": "KLN-067",
    "label": "KLN-067",
    "detail": "Oil pump suction strainer · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.7",
    "description": "Component: Oil pump suction strainer. Pass Criteria: Clean screen, no cavitation or suction restriction. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": 0.15319358423246504,
    "y": -0.08506718572501254,
    "size": 1.2
  },
  {
    "id": "KLN-069",
    "label": "KLN-069",
    "detail": "Oil filter elements / housings · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.7",
    "description": "Component: Oil filter elements / housings. Pass Criteria: Below OEM changeout threshold; replace element and record delta. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": 0.1549734364272601,
    "y": -0.07713088142243384,
    "size": 1.2
  },
  {
    "id": "KLN-070",
    "label": "KLN-070",
    "detail": "Filter bypass / isolation / bleed valves · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.7",
    "description": "Component: Filter bypass / isolation / bleed valves. Pass Criteria: No unintended bypass or leaks, correct isolation labeling. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": 0.1538634083517667,
    "y": -0.06816261970366988,
    "size": 1.2
  },
  {
    "id": "KLN-071",
    "label": "KLN-071",
    "detail": "Oil cooler (air / water type TBC) · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.7",
    "description": "Component: Oil cooler (air / water type TBC). Pass Criteria: Temperature under OEM limits, no cross-contamination. Frequency: Weekly, Owner: ME, Mode: RUN + STOP.",
    "machine": "KLN-01-01",
    "x": 0.15023388654933437,
    "y": -0.058651884280587555,
    "size": 1.2
  },
  {
    "id": "KLN-072",
    "label": "KLN-072",
    "detail": "Oil cooler water isolation / regulator valves · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.7",
    "description": "Component: Oil cooler water isolation / regulator valves. Pass Criteria: Correct coolant flow, no oil-water mixing. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": 0.14481676489491357,
    "y": -0.04914387034969883,
    "size": 1.2
  },
  {
    "id": "KLN-075",
    "label": "KLN-075",
    "detail": "Pressure relief / check valves / accumulators · Annually · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.7",
    "description": "Component: Pressure relief / check valves / accumulators. Pass Criteria: Protective devices in service; no stored pressure before work. Frequency: Annually, Owner: ME, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": 0.13862657867449243,
    "y": -0.04015285990043946,
    "size": 1.2
  },
  {
    "id": "KLN-076",
    "label": "KLN-076",
    "detail": "Lube oil lines / bends / hose crimp / flanges · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.7",
    "description": "Component: Lube oil lines / bends / hose crimp / flanges. Pass Criteria: Leak-free and secured; replace damaged lines offline. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": 0.1328302850885523,
    "y": -0.03208250332333268,
    "size": 1.2
  },
  {
    "id": "KLN-077",
    "label": "KLN-077",
    "detail": "Gearbox oil sampling tap and sample valve hardware · Planned stop · REL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.7",
    "description": "Component: Gearbox oil sampling tap and sample valve hardware. Pass Criteria: Sampling valve and cap sealed, safely identifiable and free of corrosion; laboratory interpretation is separate. Frequency: Planned stop, Owner: REL, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": 0.1285849907455155,
    "y": -0.025167074293734475,
    "size": 1.2
  },
  {
    "id": "KLN-078",
    "label": "KLN-078",
    "detail": "Gearbox oil breather / desiccant (if fitted) · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.7",
    "description": "Component: Gearbox oil breather / desiccant (if fitted). Pass Criteria: Clean and functional; replace per OEM. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": 0.12686927556407046,
    "y": -0.019443590103625074,
    "size": 1.2
  },
  {
    "id": "KLN-079",
    "label": "KLN-079",
    "detail": "Spray lubricant drum / reservoir · Daily · OP",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.8",
    "description": "Component: Spray lubricant drum / reservoir. Pass Criteria: Correct OEM grade and sufficient supply; no contamination. Frequency: Daily, Owner: OP, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": 0.12833574774271378,
    "y": -0.014758768653121031,
    "size": 1.2
  },
  {
    "id": "KLN-080",
    "label": "KLN-080",
    "detail": "Spray lubrication pump and motor · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.8",
    "description": "Component: Spray lubrication pump and motor. Pass Criteria: Pump responds to controller; service failing unit. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": 0.1332096256287462,
    "y": -0.010808272016870846,
    "size": 1.2
  },
  {
    "id": "KLN-082",
    "label": "KLN-082",
    "detail": "Spray metering block / progressive distributor · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.8",
    "description": "Component: Spray metering block / progressive distributor. Pass Criteria: No blocked or skipped metering output; OEM method required. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": 0.14125088863299468,
    "y": -0.007199806081222695,
    "size": 1.2
  },
  {
    "id": "KLN-083",
    "label": "KLN-083",
    "detail": "Spray branches 1-6: pipe and fittings · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.8",
    "description": "Component: Spray branches 1-6: pipe and fittings. Pass Criteria: No branch blockage/leak; branch mapping verified to installed OEM. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": 0.15178708731542526,
    "y": -0.003527506292391819,
    "size": 1.2
  },
  {
    "id": "KLN-084",
    "label": "KLN-084",
    "detail": "Spray nozzles / manifolds / nozzle mounts · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.8",
    "description": "Component: Spray nozzles / manifolds / nozzle mounts. Pass Criteria: Even gear-face delivery; metering pulse alone is NOT proof of spray. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": 0.1638120643803776,
    "y": 0.0005566074667622302,
    "size": 1.2
  },
  {
    "id": "KLN-085",
    "label": "KLN-085",
    "detail": "Spray air header / regulator / filter · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.8",
    "description": "Component: Spray air header / regulator / filter. Pass Criteria: Approved pressure and unobstructed atomizing path. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": 0.1761346973726389,
    "y": 0.005287214850971372,
    "size": 1.2
  },
  {
    "id": "KLN-086",
    "label": "KLN-086",
    "detail": "Open gear guards / drain / splash tray · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.8",
    "description": "Component: Open gear guards / drain / splash tray. Pass Criteria: No unsafe access / lubricant spillage; repair offline. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": 0.1875533094758595,
    "y": 0.010755830088975946,
    "size": 1.2
  },
  {
    "id": "KLN-087",
    "label": "KLN-087",
    "detail": "Spray line isolation / drain valves · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.8",
    "description": "Component: Spray line isolation / drain valves. Pass Criteria: Correct normal valve lineup and no leakage. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": 0.1970271210358959,
    "y": 0.016910662547949,
    "size": 1.2
  },
  {
    "id": "KLN-088",
    "label": "KLN-088",
    "detail": "Auxiliary motor, cooling and gearbox · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.9",
    "description": "Component: Auxiliary motor, cooling and gearbox. Pass Criteria: Auxiliary turning system ready for main-drive trip. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": 0.2038168024987045,
    "y": 0.02358436976612623,
    "size": 1.2
  },
  {
    "id": "KLN-089",
    "label": "KLN-089",
    "detail": "Auxiliary drive clutch / overrunning device · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.9",
    "description": "Component: Auxiliary drive clutch / overrunning device. Pass Criteria: No unintended simultaneous engagement or slip. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": 0.20757172423961232,
    "y": 0.03054238204992349,
    "size": 1.2
  },
  {
    "id": "KLN-090",
    "label": "KLN-090",
    "detail": "Auxiliary brake lining, armature and release mechanism · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.9",
    "description": "Component: Auxiliary brake lining, armature and release mechanism. Pass Criteria: Brake lining thickness and mechanical clearance meet OEM criteria; no fluid/grease contamination. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": 0.20835089646619748,
    "y": 0.03754058467385825,
    "size": 1.2
  },
  {
    "id": "KLN-091",
    "label": "KLN-091",
    "detail": "Auxiliary brake linkages / springs / air actuation · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.9",
    "description": "Component: Auxiliary brake linkages / springs / air actuation. Pass Criteria: Proper hold/release under approved procedure. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": 0.20657617680070967,
    "y": 0.04437959765601571,
    "size": 1.2
  },
  {
    "id": "KLN-092",
    "label": "KLN-092",
    "detail": "Thrust roller face / bearings / housing · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.9",
    "description": "Component: Thrust roller face / bearings / housing. Pass Criteria: Correct OEM face contact and no bearing damage. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": 0.2029280286480667,
    "y": 0.050943977941962676,
    "size": 1.2
  },
  {
    "id": "KLN-093",
    "label": "KLN-093",
    "detail": "Thrust hydraulic unit tank / filter / oil · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.9",
    "description": "Component: Thrust hydraulic unit tank / filter / oil. Pass Criteria: Correct oil/pressure; no foaming/water. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": 0.1982038592242352,
    "y": 0.057218146013587184,
    "size": 1.2
  },
  {
    "id": "KLN-094",
    "label": "KLN-094",
    "detail": "Thrust pump / motor / suction · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.9",
    "description": "Component: Thrust pump / motor / suction. Pass Criteria: No cavitation or oil leakage. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": 0.19316503317301792,
    "y": 0.06327599463151833,
    "size": 1.2
  },
  {
    "id": "KLN-095",
    "label": "KLN-095",
    "detail": "Thrust directional / proportional valve · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.9",
    "description": "Component: Thrust directional / proportional valve. Pass Criteria: Valve follows accepted strategy; service under isolation. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": 0.1883999994000409,
    "y": 0.06924692247396941,
    "size": 1.2
  },
  {
    "id": "KLN-096",
    "label": "KLN-096",
    "detail": "Thrust relief / check / pilot valves · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.9",
    "description": "Component: Thrust relief / check / pilot valves. Pass Criteria: No uncontrolled thrust pressure or drift. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": 0.18422739792490922,
    "y": 0.07526627098083907,
    "size": 1.2
  },
  {
    "id": "KLN-097",
    "label": "KLN-097",
    "detail": "Thrust cylinder / ram / rod seals · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.9",
    "description": "Component: Thrust cylinder / ram / rod seals. Pass Criteria: No leaking seals or bent rod. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": 0.1806552320123931,
    "y": 0.08142175194468187,
    "size": 1.2
  },
  {
    "id": "KLN-100",
    "label": "KLN-100",
    "detail": "Hydraulic hose / tube / flange / manifold · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.9",
    "description": "Component: Hydraulic hose / tube / flange / manifold. Pass Criteria: No spraying oil or damaged hose; zero-pressure isolation before repair. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": 0.17740165627978108,
    "y": 0.08770867480842989,
    "size": 1.2
  },
  {
    "id": "KLN-101",
    "label": "KLN-101",
    "detail": "Outlet stationary hood structure / expansion · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.10",
    "description": "Component: Outlet stationary hood structure / expansion. Pass Criteria: No leaking hot process gas or distorted hood. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": 0.1739715866244438,
    "y": 0.09400532335028254,
    "size": 1.2
  },
  {
    "id": "KLN-102",
    "label": "KLN-102",
    "detail": "Outlet seal / labyrinth / flexible blades · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.10",
    "description": "Component: Outlet seal / labyrinth / flexible blades. Pass Criteria: No excessive false air or rubbing on rotating shell. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": 0.16977325223111217,
    "y": 0.10007593050096932,
    "size": 1.2
  },
  {
    "id": "KLN-103",
    "label": "KLN-103",
    "detail": "Outlet sector plates / retaining bolts · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.10",
    "description": "Component: Outlet sector plates / retaining bolts. Pass Criteria: No broken segment or exposed shell, correct retention. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": 0.16425180067886558,
    "y": 0.10560308873788503,
    "size": 1.2
  },
  {
    "id": "KLN-104",
    "label": "KLN-104",
    "detail": "Cooling shroud (cow shell) metal / insulation · Weekly · REL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.10",
    "description": "Component: Cooling shroud (cow shell) metal / insulation. Pass Criteria: Stable measured surface temp and intact cladding. Frequency: Weekly, Owner: REL, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": 0.15701436846972647,
    "y": 0.11024519942412457,
    "size": 1.2
  },
  {
    "id": "KLN-105",
    "label": "KLN-105",
    "detail": "Sector-plate cooling-air supply / branches · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.10",
    "description": "Component: Sector-plate cooling-air supply / branches. Pass Criteria: Air path unobstructed and cooling available. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": 0.14792307164569762,
    "y": 0.11370894452134886,
    "size": 1.2
  },
  {
    "id": "KLN-106",
    "label": "KLN-106",
    "detail": "Outlet cooling fan motor / rotor / guards · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.10",
    "description": "Component: Outlet cooling fan motor / rotor / guards. Pass Criteria: Fan and motor run normally if fitted; no assumed sensors. Frequency: Quarterly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": 0.1371387102589843,
    "y": 0.11582290562218818,
    "size": 1.2
  },
  {
    "id": "KLN-110",
    "label": "KLN-110",
    "detail": "Burner lance support / hood seals · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.10",
    "description": "Component: Burner lance support / hood seals. Pass Criteria: No rubbing/misalignment; restore offline. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": 0.12510738805149912,
    "y": 0.11659719065759462,
    "size": 1.2
  },
  {
    "id": "KLN-111",
    "label": "KLN-111",
    "detail": "Outlet fasteners / expansion joints / flanges · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.10",
    "description": "Component: Outlet fasteners / expansion joints / flanges. Pass Criteria: No hot gas leaks; engineering repair after cool shutdown. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": 0.1124929474050493,
    "y": 0.11625560725773876,
    "size": 1.2
  },
  {
    "id": "KLN-112",
    "label": "KLN-112",
    "detail": "Kiln drive coupling oil guard / inspection drain · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.11",
    "description": "Component: Kiln drive coupling oil guard / inspection drain. Pass Criteria: OEM lubricant retained; no spray to hot surfaces; service isolated. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "KLN-01-01",
    "x": 0.10006811727683441,
    "y": 0.11523133158842541,
    "size": 1.2
  },
  {
    "id": "KLN-113",
    "label": "KLN-113",
    "detail": "Outlet cooling shroud fan suction screens / flex duct · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 7.11",
    "description": "Component: Outlet cooling shroud fan suction screens / flex duct. Pass Criteria: Open air path, no broken screen or loss of cooling; restore before hot duty. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "KLN-01-01",
    "x": 0.08858473251578791,
    "y": 0.11412341726328143,
    "size": 1.2
  },
  {
    "id": "BRN-001",
    "label": "BRN-001",
    "detail": "Main burner lance tube and support bearings · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 8.1",
    "description": "Component: Main burner lance tube and support bearings. Pass Criteria: Lance stable and correctly centered; adjust only under approved stop. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "BRN-01-01",
    "x": 0.07864696547760597,
    "y": 0.11361872246314103,
    "size": 1.2
  },
  {
    "id": "BRN-002",
    "label": "BRN-002",
    "detail": "Burner hot tip / nozzles / diffuser · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 8.1",
    "description": "Component: Burner hot tip / nozzles / diffuser. Pass Criteria: Clean OEM geometry; replace damaged burner tip. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "BRN-01-01",
    "x": 0.07061061195466535,
    "y": 0.11439056303805828,
    "size": 1.2
  },
  {
    "id": "BRN-003",
    "label": "BRN-003",
    "detail": "Burner swirl/helical air channel and duct seals · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 8.1",
    "description": "Component: Burner swirl/helical air channel and duct seals. Pass Criteria: No burned/deformed channel, cracked duct seal, sticking damper or leaking flange; OEM geometry retained. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "BRN-01-01",
    "x": 0.06452633108141281,
    "y": 0.11699033992759715,
    "size": 1.2
  },
  {
    "id": "BRN-004",
    "label": "BRN-004",
    "detail": "Burner jet/axial air channel and duct seals · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 8.1",
    "description": "Component: Burner jet/axial air channel and duct seals. Pass Criteria: Jet-air path clean, mechanically aligned and leak-tight under OEM conditions; no damaged nozzle. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "BRN-01-01",
    "x": 0.060136377562014634,
    "y": 0.12175055564357369,
    "size": 1.2
  },
  {
    "id": "BRN-005",
    "label": "BRN-005",
    "detail": "Primary-air header pipework and dampers · Daily · OP",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 8.1",
    "description": "Component: Primary-air header pipework and dampers. Pass Criteria: Primary-air header, branch flanges and mechanical dampers leak-tight and securely supported. Frequency: Daily, Owner: OP, Mode: RUN.",
    "machine": "BRN-01-01",
    "x": 0.05692439412677068,
    "y": 0.12871653330091581,
    "size": 1.2
  },
  {
    "id": "BRN-006",
    "label": "BRN-006",
    "detail": "Primary air line butterfly / control dampers · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 8.1",
    "description": "Component: Primary air line butterfly / control dampers. Pass Criteria: Travel free and retains setpoint; refurbish after shutdown. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "BRN-01-01",
    "x": 0.05420813897154632,
    "y": 0.13761988323138463,
    "size": 1.2
  },
  {
    "id": "BRN-007",
    "label": "BRN-007",
    "detail": "Primary air fan impeller / housing · Weekly · REL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 8.1",
    "description": "Component: Primary air fan impeller / housing. Pass Criteria: No imbalance/erosion defects. Frequency: Weekly, Owner: REL, Mode: RUN.",
    "machine": "BRN-01-01",
    "x": 0.05125741260437734,
    "y": 0.1479000140755921,
    "size": 1.2
  },
  {
    "id": "BRN-008",
    "label": "BRN-008",
    "detail": "Primary air fan bearings / shaft seals · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 8.1",
    "description": "Component: Primary air fan bearings / shaft seals. Pass Criteria: Within OEM band and no loss of lubricant. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "BRN-01-01",
    "x": 0.04741530712012153,
    "y": 0.15877191548325886,
    "size": 1.2
  },
  {
    "id": "BRN-009",
    "label": "BRN-009",
    "detail": "Primary air fan motor / starter / VFD · Weekly · EL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 8.1",
    "description": "Component: Primary air fan motor / starter / VFD. Pass Criteria: Load consistent with air demand; protection healthy. Frequency: Weekly, Owner: EL, Mode: RUN.",
    "machine": "BRN-01-01",
    "x": 0.04220093912016466,
    "y": 0.16933047118095151,
    "size": 1.2
  },
  {
    "id": "BRN-010",
    "label": "BRN-010",
    "detail": "Primary air fan coupling / guards / foundation · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 8.1",
    "description": "Component: Primary air fan coupling / guards / foundation. Pass Criteria: No worn element/loose anchors. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "BRN-01-01",
    "x": 0.03537595473899585,
    "y": 0.17867512467924468,
    "size": 1.2
  },
  {
    "id": "BRN-011",
    "label": "BRN-011",
    "detail": "Burner channel expansion hose / clamps · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 8.1",
    "description": "Component: Burner channel expansion hose / clamps. Pass Criteria: No fraying or air loss; replace with OEM part. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "BRN-01-01",
    "x": 0.026964446961823745,
    "y": 0.1860349911256015,
    "size": 1.2
  },
  {
    "id": "BRN-015",
    "label": "BRN-015",
    "detail": "Fine-coal bin shell / roof / cone / inspection hatch · Daily · OP",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 8.2",
    "description": "Component: Fine-coal bin shell / roof / cone / inspection hatch. Pass Criteria: No leak, hot surface or gas hazard; do not open with combustible atmosphere. Frequency: Daily, Owner: OP, Mode: RUN.",
    "machine": "BRN-01-01",
    "x": 0.01722503692763742,
    "y": 0.1908741907487962,
    "size": 1.2
  },
  {
    "id": "BRN-019",
    "label": "BRN-019",
    "detail": "Coal-bin vent / filter / isolation protections · Planned stop · EH",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 8.2",
    "description": "Component: Coal-bin vent / filter / isolation protections. Pass Criteria: Site combustible-dust control scheme intact; no improvised opening. Frequency: Planned stop, Owner: EH, Mode: OFF.",
    "machine": "BRN-01-01",
    "x": 0.0065829639403111664,
    "y": 0.192960368605307,
    "size": 1.2
  },
  {
    "id": "BRN-020",
    "label": "BRN-020",
    "detail": "Coal bin aeration / anti-bridging tools · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 8.2",
    "description": "Component: Coal bin aeration / anti-bridging tools. Pass Criteria: No unintended air ingress into coal inventory; safe use per OEM/EHS. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "BRN-01-01",
    "x": -0.0044626444878669725,
    "y": 0.1923855287365199,
    "size": 1.2
  },
  {
    "id": "BRN-021",
    "label": "BRN-021",
    "detail": "Kiln coal feeder: dosing rotor / belt, rollers, bearings, seals and drive · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 8.2",
    "description": "Component: Kiln coal feeder: dosing rotor / belt, rollers, bearings, seals and drive. Pass Criteria: Feeder rotor, dosing blade, seal, bearings and housing mechanically sound; no coal leakage or buildup. Frequency: Weekly, Owner: ME, Mode: RUN + STOP.",
    "machine": "BRN-01-01",
    "x": -0.015436973327755302,
    "y": 0.18953637713460858,
    "size": 1.2
  },
  {
    "id": "BRN-023",
    "label": "BRN-023",
    "detail": "Coal feeder gate / isolation and airlock · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 8.2",
    "description": "Component: Coal feeder gate / isolation and airlock. Pass Criteria: Dust-tight and correctly actuated; no control bypass. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "BRN-01-01",
    "x": -0.0259735668277774,
    "y": 0.1850199186124269,
    "size": 1.2
  },
  {
    "id": "BRN-025",
    "label": "BRN-025",
    "detail": "Coal transport pipes / elbows / flanges · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 8.2",
    "description": "Component: Coal transport pipes / elbows / flanges. Pass Criteria: No coal leak/hot spot; replace worn elbow on isolation. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "BRN-01-01",
    "x": -0.03586820900549914,
    "y": 0.17955757736925942,
    "size": 1.2
  },
  {
    "id": "BRN-026",
    "label": "BRN-026",
    "detail": "Coal transport piping supports / expansion pieces · Quarterly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 8.2",
    "description": "Component: Coal transport piping supports / expansion pieces. Pass Criteria: No fatigue/corrosion or chafing. Frequency: Quarterly, Owner: ME, Mode: RUN.",
    "machine": "BRN-01-01",
    "x": -0.04509335040093333,
    "y": 0.1738662805815825,
    "size": 1.2
  },
  {
    "id": "BRN-027",
    "label": "BRN-027",
    "detail": "Coal blower impeller / rotor / casing · Weekly · REL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 8.2",
    "description": "Component: Coal blower impeller / rotor / casing. Pass Criteria: No imbalance / leakage; clean under safe isolation. Frequency: Weekly, Owner: REL, Mode: RUN.",
    "machine": "BRN-01-01",
    "x": -0.05377225199172872,
    "y": 0.16854685175433537,
    "size": 1.2
  },
  {
    "id": "BRN-028",
    "label": "BRN-028",
    "detail": "Coal blower motor / terminal box / MCC · Weekly · EL",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 8.2",
    "description": "Component: Coal blower motor / terminal box / MCC. Pass Criteria: Electrical load aligns with pneumatic conveying. Frequency: Weekly, Owner: EL, Mode: RUN.",
    "machine": "BRN-01-01",
    "x": -0.06212049707032928,
    "y": 0.1639983854348441,
    "size": 1.2
  },
  {
    "id": "BRN-029",
    "label": "BRN-029",
    "detail": "Coal blower bearings / shaft seals · Weekly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 8.2",
    "description": "Component: Coal blower bearings / shaft seals. Pass Criteria: No lubricant loss or emerging defect. Frequency: Weekly, Owner: ME, Mode: RUN.",
    "machine": "BRN-01-01",
    "x": -0.07036931520228447,
    "y": 0.1603723408908822,
    "size": 1.2
  },
  {
    "id": "BRN-030",
    "label": "BRN-030",
    "detail": "Coal blower check / relief / vent / isolation valves · Annually · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 8.2",
    "description": "Component: Coal blower check / relief / vent / isolation valves. Pass Criteria: All safety valves approved and tested under shutdown. Frequency: Annually, Owner: ME, Mode: OFF.",
    "machine": "BRN-01-01",
    "x": -0.07868889986495531,
    "y": 0.1575728072545821,
    "size": 1.2
  },
  {
    "id": "BRN-031",
    "label": "BRN-031",
    "detail": "Coal piping flexible connectors / expansion joints · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 8.2",
    "description": "Component: Coal piping flexible connectors / expansion joints. Pass Criteria: No breach, correct conductive hose and bond. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "BRN-01-01",
    "x": -0.0871298222647277,
    "y": 0.15530108181693228,
    "size": 1.2
  },
  {
    "id": "BRN-032",
    "label": "BRN-032",
    "detail": "Coal system grounding / bonding / area equipment · Planned stop · EH",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 8.2",
    "description": "Component: Coal system grounding / bonding / area equipment. Pass Criteria: Combustible-dust controls intact; respond to spark/heat hazards. Frequency: Planned stop, Owner: EH, Mode: OFF.",
    "machine": "BRN-01-01",
    "x": -0.09559674767869768,
    "y": 0.15313486728260392,
    "size": 1.2
  },
  {
    "id": "BRN-033",
    "label": "BRN-033",
    "detail": "Coal line pressure relief / purge spool / drain fittings · Planned stop · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 8.3",
    "description": "Component: Coal line pressure relief / purge spool / drain fittings. Pass Criteria: Fuel/air flow intact and no unapproved vent; plant fire safety approved. Frequency: Planned stop, Owner: ME, Mode: OFF.",
    "machine": "BRN-01-01",
    "x": -0.10386171139175286,
    "y": 0.15062643521979538,
    "size": 1.2
  },
  {
    "id": "BRN-034",
    "label": "BRN-034",
    "detail": "Burner lance sliding support / expansion seal / flange bolts · Monthly · ME",
    "kind": "maintenance",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 8.3",
    "description": "Component: Burner lance sliding support / expansion seal / flange bolts. Pass Criteria: Lance supported without distortion or flame path leakage. Frequency: Monthly, Owner: ME, Mode: RUN.",
    "machine": "BRN-01-01",
    "x": -0.11161559224559071,
    "y": 0.1474010712225786,
    "size": 1.2
  }
];

export const SOURCE_LINKS: PolycronLink[] = [
  {
    "from": "FSL-01",
    "to": "KFS-01",
    "type": "flows_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Extracted raw meal flows to dosing gates and weigh bin.",
    "flow": true
  },
  {
    "from": "KFS-01",
    "to": "PHC-01",
    "type": "flows_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Bucket elevator conveys meal to cyclone stage C1.",
    "flow": true
  },
  {
    "from": "PHC-01",
    "to": "KLN-01",
    "type": "flows_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Bottom cyclone stage C6 feeds calcined meal into the kiln inlet chute.",
    "flow": true
  },
  {
    "from": "KLN-01",
    "to": "CLR-01",
    "type": "flows_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Sintered clinker drops from kiln discharge onto cooler grate 1.",
    "flow": true
  },
  {
    "from": "CLR-01",
    "to": "HMR-01",
    "type": "flows_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Cooled clinker passes through hammer crusher clinker breaker.",
    "flow": true
  },
  {
    "from": "HMR-01",
    "to": "CSL-01",
    "type": "flows_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Crushed clinker is conveyed by pan conveyor to clinker silo.",
    "flow": true
  },
  {
    "from": "CLR-01",
    "to": "BRN-01",
    "type": "secondary_air_loop",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Hot secondary air is recovered from clinker cooling and ducted to burner.",
    "flow": true
  },
  {
    "from": "BRN-01",
    "to": "KLN-01",
    "type": "heats",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Main burner supplies heat energy directly to the kiln sintering zone.",
    "flow": true
  },
  {
    "from": "KLN-01",
    "to": "PHC-01",
    "type": "counter_current_gas",
    "evidence": "D5-OSW-PE-PYR Rev. 00, p. 3",
    "note": "Kiln exhaust gas flows counter-current through preheater cyclones.",
    "flow": true
  },
  {
    "from": "PHC-01",
    "to": "EXH-IF",
    "type": "exhaust_draft",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, p. 2",
    "note": "Induced draft fan draws gas through conditioning tower.",
    "flow": true
  },
  {
    "from": "EXH-IF",
    "to": "BGH-01",
    "type": "discharges_to",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, p. 2",
    "note": "Exhaust fan delivers gas to fabric filter baghouse stack.",
    "flow": true
  },
  {
    "from": "MAT-RAW-MEAL",
    "to": "FSL-01",
    "type": "passes_through",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Raw meal originates from feed silo extraction.",
    "flow": false
  },
  {
    "from": "MAT-RAW-MEAL",
    "to": "KFS-01",
    "type": "passes_through",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Meters raw meal continuously.",
    "flow": false
  },
  {
    "from": "MAT-RAW-MEAL",
    "to": "PHC-01",
    "type": "passes_through",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Suspension preheater heats raw meal.",
    "flow": false
  },
  {
    "from": "MAT-RAW-MEAL",
    "to": "KLN-01",
    "type": "passes_through",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Reaches kiln inlet at calcination temperature.",
    "flow": false
  },
  {
    "from": "MAT-CLINKER",
    "to": "KLN-01",
    "type": "originates_at",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Formed by sintering reactions at 1450°C.",
    "flow": false
  },
  {
    "from": "MAT-CLINKER",
    "to": "CLR-01",
    "type": "passes_through",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Rapidly quenched on reciprocating grates.",
    "flow": false
  },
  {
    "from": "MAT-CLINKER",
    "to": "HMR-01",
    "type": "passes_through",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Crushed to uniform size.",
    "flow": false
  },
  {
    "from": "MAT-CLINKER",
    "to": "CSL-01",
    "type": "stores_at",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Stored in concrete silo.",
    "flow": false
  },
  {
    "from": "MAT-SECONDARY-AIR",
    "to": "CLR-01",
    "type": "recovered_from",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "High-temperature air recovered from grate 1.",
    "flow": false
  },
  {
    "from": "MAT-SECONDARY-AIR",
    "to": "BRN-01",
    "type": "feeds_combustion",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Provides oxygen and sensible heat to burner flame.",
    "flow": false
  },
  {
    "from": "MAT-EXHAUST-GAS",
    "to": "KLN-01",
    "type": "flue_gas_from",
    "evidence": "D5-OSW-PE-PYR Rev. 00, p. 3",
    "note": "Flue gas leaves kiln inlet hood.",
    "flow": false
  },
  {
    "from": "MAT-EXHAUST-GAS",
    "to": "PHC-01",
    "type": "heats_cyclones",
    "evidence": "D5-OSW-PE-PYR Rev. 00, p. 3",
    "note": "Gas transfers enthalpy to cascading meal.",
    "flow": false
  },
  {
    "from": "MAT-EXHAUST-GAS",
    "to": "BGH-01",
    "type": "filtered_by",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, p. 2",
    "note": "Cleaned in baghouse prior to stack.",
    "flow": false
  },
  {
    "from": "FSL-01",
    "to": "D4",
    "type": "specified_in",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 2",
    "note": "Included in technical specification scope.",
    "flow": false
  },
  {
    "from": "FSL-01",
    "to": "D5",
    "type": "modeled_in",
    "evidence": "D5-OSW-PE-PYR Rev. 00, p. 2",
    "note": "Included in internal system model.",
    "flow": false
  },
  {
    "from": "FSL-01",
    "to": "MNT",
    "type": "maintained_under",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, p. 2",
    "note": "Subject to equipment maintenance checklist.",
    "flow": false
  },
  {
    "from": "FSL-01",
    "to": "SNL",
    "type": "metered_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, p. 2",
    "note": "Covered in sensor schedule with calibrated ranges.",
    "flow": false
  },
  {
    "from": "KFS-01",
    "to": "D4",
    "type": "specified_in",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 2",
    "note": "Included in technical specification scope.",
    "flow": false
  },
  {
    "from": "KFS-01",
    "to": "D5",
    "type": "modeled_in",
    "evidence": "D5-OSW-PE-PYR Rev. 00, p. 2",
    "note": "Included in internal system model.",
    "flow": false
  },
  {
    "from": "KFS-01",
    "to": "MNT",
    "type": "maintained_under",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, p. 2",
    "note": "Subject to equipment maintenance checklist.",
    "flow": false
  },
  {
    "from": "KFS-01",
    "to": "SNL",
    "type": "metered_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, p. 2",
    "note": "Covered in sensor schedule with calibrated ranges.",
    "flow": false
  },
  {
    "from": "PHC-01",
    "to": "D4",
    "type": "specified_in",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 2",
    "note": "Included in technical specification scope.",
    "flow": false
  },
  {
    "from": "PHC-01",
    "to": "D5",
    "type": "modeled_in",
    "evidence": "D5-OSW-PE-PYR Rev. 00, p. 2",
    "note": "Included in internal system model.",
    "flow": false
  },
  {
    "from": "PHC-01",
    "to": "MNT",
    "type": "maintained_under",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, p. 2",
    "note": "Subject to equipment maintenance checklist.",
    "flow": false
  },
  {
    "from": "PHC-01",
    "to": "SNL",
    "type": "metered_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, p. 2",
    "note": "Covered in sensor schedule with calibrated ranges.",
    "flow": false
  },
  {
    "from": "KLN-01",
    "to": "D4",
    "type": "specified_in",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 2",
    "note": "Included in technical specification scope.",
    "flow": false
  },
  {
    "from": "KLN-01",
    "to": "D5",
    "type": "modeled_in",
    "evidence": "D5-OSW-PE-PYR Rev. 00, p. 2",
    "note": "Included in internal system model.",
    "flow": false
  },
  {
    "from": "KLN-01",
    "to": "MNT",
    "type": "maintained_under",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, p. 2",
    "note": "Subject to equipment maintenance checklist.",
    "flow": false
  },
  {
    "from": "KLN-01",
    "to": "SNL",
    "type": "metered_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, p. 2",
    "note": "Covered in sensor schedule with calibrated ranges.",
    "flow": false
  },
  {
    "from": "BRN-01",
    "to": "D4",
    "type": "specified_in",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 2",
    "note": "Included in technical specification scope.",
    "flow": false
  },
  {
    "from": "BRN-01",
    "to": "D5",
    "type": "modeled_in",
    "evidence": "D5-OSW-PE-PYR Rev. 00, p. 2",
    "note": "Included in internal system model.",
    "flow": false
  },
  {
    "from": "BRN-01",
    "to": "MNT",
    "type": "maintained_under",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, p. 2",
    "note": "Subject to equipment maintenance checklist.",
    "flow": false
  },
  {
    "from": "BRN-01",
    "to": "SNL",
    "type": "metered_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, p. 2",
    "note": "Covered in sensor schedule with calibrated ranges.",
    "flow": false
  },
  {
    "from": "CLR-01",
    "to": "D4",
    "type": "specified_in",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 2",
    "note": "Included in technical specification scope.",
    "flow": false
  },
  {
    "from": "CLR-01",
    "to": "D5",
    "type": "modeled_in",
    "evidence": "D5-OSW-PE-PYR Rev. 00, p. 2",
    "note": "Included in internal system model.",
    "flow": false
  },
  {
    "from": "CLR-01",
    "to": "MNT",
    "type": "maintained_under",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, p. 2",
    "note": "Subject to equipment maintenance checklist.",
    "flow": false
  },
  {
    "from": "CLR-01",
    "to": "SNL",
    "type": "metered_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, p. 2",
    "note": "Covered in sensor schedule with calibrated ranges.",
    "flow": false
  },
  {
    "from": "HMR-01",
    "to": "D4",
    "type": "specified_in",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 2",
    "note": "Included in technical specification scope.",
    "flow": false
  },
  {
    "from": "HMR-01",
    "to": "D5",
    "type": "modeled_in",
    "evidence": "D5-OSW-PE-PYR Rev. 00, p. 2",
    "note": "Included in internal system model.",
    "flow": false
  },
  {
    "from": "HMR-01",
    "to": "MNT",
    "type": "maintained_under",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, p. 2",
    "note": "Subject to equipment maintenance checklist.",
    "flow": false
  },
  {
    "from": "HMR-01",
    "to": "SNL",
    "type": "metered_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, p. 2",
    "note": "Covered in sensor schedule with calibrated ranges.",
    "flow": false
  },
  {
    "from": "CSL-01",
    "to": "D4",
    "type": "specified_in",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 2",
    "note": "Included in technical specification scope.",
    "flow": false
  },
  {
    "from": "CSL-01",
    "to": "D5",
    "type": "modeled_in",
    "evidence": "D5-OSW-PE-PYR Rev. 00, p. 2",
    "note": "Included in internal system model.",
    "flow": false
  },
  {
    "from": "CSL-01",
    "to": "MNT",
    "type": "maintained_under",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, p. 2",
    "note": "Subject to equipment maintenance checklist.",
    "flow": false
  },
  {
    "from": "CSL-01",
    "to": "SNL",
    "type": "metered_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, p. 2",
    "note": "Covered in sensor schedule with calibrated ranges.",
    "flow": false
  },
  {
    "from": "BGH-01",
    "to": "D4",
    "type": "specified_in",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 2",
    "note": "Included in technical specification scope.",
    "flow": false
  },
  {
    "from": "BGH-01",
    "to": "D5",
    "type": "modeled_in",
    "evidence": "D5-OSW-PE-PYR Rev. 00, p. 2",
    "note": "Included in internal system model.",
    "flow": false
  },
  {
    "from": "BGH-01",
    "to": "MNT",
    "type": "maintained_under",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, p. 2",
    "note": "Subject to equipment maintenance checklist.",
    "flow": false
  },
  {
    "from": "BGH-01",
    "to": "SNL",
    "type": "metered_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, p. 2",
    "note": "Covered in sensor schedule with calibrated ranges.",
    "flow": false
  },
  {
    "from": "EXH-IF",
    "to": "D4",
    "type": "specified_in",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 2",
    "note": "Included in technical specification scope.",
    "flow": false
  },
  {
    "from": "EXH-IF",
    "to": "D5",
    "type": "modeled_in",
    "evidence": "D5-OSW-PE-PYR Rev. 00, p. 2",
    "note": "Included in internal system model.",
    "flow": false
  },
  {
    "from": "EXH-IF",
    "to": "MNT",
    "type": "maintained_under",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, p. 2",
    "note": "Subject to equipment maintenance checklist.",
    "flow": false
  },
  {
    "from": "EXH-IF",
    "to": "SNL",
    "type": "metered_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, p. 2",
    "note": "Covered in sensor schedule with calibrated ranges.",
    "flow": false
  },
  {
    "from": "D01",
    "to": "FSL-01",
    "type": "depicts",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D",
    "note": "Diagram portrays FSL-01 mechanical assembly.",
    "flow": false
  },
  {
    "from": "D01",
    "to": "D4",
    "type": "published_in",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 2",
    "note": "Diagram published in D4 specification.",
    "flow": false
  },
  {
    "from": "D02",
    "to": "PHC-01",
    "type": "depicts",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D",
    "note": "Diagram portrays PHC-01 mechanical assembly.",
    "flow": false
  },
  {
    "from": "D02",
    "to": "D4",
    "type": "published_in",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 2",
    "note": "Diagram published in D4 specification.",
    "flow": false
  },
  {
    "from": "D03",
    "to": "PHC-01",
    "type": "depicts",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D",
    "note": "Diagram portrays PHC-01 mechanical assembly.",
    "flow": false
  },
  {
    "from": "D03",
    "to": "D4",
    "type": "published_in",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 2",
    "note": "Diagram published in D4 specification.",
    "flow": false
  },
  {
    "from": "D04",
    "to": "KLN-01",
    "type": "depicts",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D",
    "note": "Diagram portrays KLN-01 mechanical assembly.",
    "flow": false
  },
  {
    "from": "D04",
    "to": "D4",
    "type": "published_in",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 2",
    "note": "Diagram published in D4 specification.",
    "flow": false
  },
  {
    "from": "D05",
    "to": "KLN-01",
    "type": "depicts",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D",
    "note": "Diagram portrays KLN-01 mechanical assembly.",
    "flow": false
  },
  {
    "from": "D05",
    "to": "D4",
    "type": "published_in",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 2",
    "note": "Diagram published in D4 specification.",
    "flow": false
  },
  {
    "from": "D06",
    "to": "KLN-01",
    "type": "depicts",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D",
    "note": "Diagram portrays KLN-01 mechanical assembly.",
    "flow": false
  },
  {
    "from": "D06",
    "to": "D4",
    "type": "published_in",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 2",
    "note": "Diagram published in D4 specification.",
    "flow": false
  },
  {
    "from": "D07",
    "to": "KLN-01",
    "type": "depicts",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D",
    "note": "Diagram portrays KLN-01 mechanical assembly.",
    "flow": false
  },
  {
    "from": "D07",
    "to": "D4",
    "type": "published_in",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 2",
    "note": "Diagram published in D4 specification.",
    "flow": false
  },
  {
    "from": "D08",
    "to": "BRN-01",
    "type": "depicts",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D",
    "note": "Diagram portrays BRN-01 mechanical assembly.",
    "flow": false
  },
  {
    "from": "D08",
    "to": "D4",
    "type": "published_in",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 2",
    "note": "Diagram published in D4 specification.",
    "flow": false
  },
  {
    "from": "D09",
    "to": "CLR-01",
    "type": "depicts",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D",
    "note": "Diagram portrays CLR-01 mechanical assembly.",
    "flow": false
  },
  {
    "from": "D09",
    "to": "D4",
    "type": "published_in",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 2",
    "note": "Diagram published in D4 specification.",
    "flow": false
  },
  {
    "from": "D10",
    "to": "CLR-01",
    "type": "depicts",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D",
    "note": "Diagram portrays CLR-01 mechanical assembly.",
    "flow": false
  },
  {
    "from": "D10",
    "to": "D4",
    "type": "published_in",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 2",
    "note": "Diagram published in D4 specification.",
    "flow": false
  },
  {
    "from": "D11",
    "to": "HMR-01",
    "type": "depicts",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Appendix D",
    "note": "Diagram portrays HMR-01 mechanical assembly.",
    "flow": false
  },
  {
    "from": "D11",
    "to": "D4",
    "type": "published_in",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 2",
    "note": "Diagram published in D4 specification.",
    "flow": false
  },
  {
    "from": "SA-FSL-SILO",
    "to": "FSL-01",
    "type": "subassembly_of",
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "note": "Sub-assembly belonging to FSL-01.",
    "flow": false
  },
  {
    "from": "SA-FSL-AERATION",
    "to": "FSL-01",
    "type": "subassembly_of",
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "note": "Sub-assembly belonging to FSL-01.",
    "flow": false
  },
  {
    "from": "SA-FSL-DC",
    "to": "FSL-01",
    "type": "subassembly_of",
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "note": "Sub-assembly belonging to FSL-01.",
    "flow": false
  },
  {
    "from": "SA-KFS-DOSING",
    "to": "KFS-01",
    "type": "subassembly_of",
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "note": "Sub-assembly belonging to KFS-01.",
    "flow": false
  },
  {
    "from": "SA-KFS-ELEVATOR",
    "to": "KFS-01",
    "type": "subassembly_of",
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "note": "Sub-assembly belonging to KFS-01.",
    "flow": false
  },
  {
    "from": "SA-PHC-CYCLONES",
    "to": "PHC-01",
    "type": "subassembly_of",
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "note": "Sub-assembly belonging to PHC-01.",
    "flow": false
  },
  {
    "from": "SA-PHC-CALCINER",
    "to": "PHC-01",
    "type": "subassembly_of",
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "note": "Sub-assembly belonging to PHC-01.",
    "flow": false
  },
  {
    "from": "SA-PHC-IDFAN",
    "to": "PHC-01",
    "type": "subassembly_of",
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "note": "Sub-assembly belonging to PHC-01.",
    "flow": false
  },
  {
    "from": "SA-PHC-GAS",
    "to": "PHC-01",
    "type": "subassembly_of",
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "note": "Sub-assembly belonging to PHC-01.",
    "flow": false
  },
  {
    "from": "SA-KLN-DRIVE",
    "to": "KLN-01",
    "type": "subassembly_of",
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "note": "Sub-assembly belonging to KLN-01.",
    "flow": false
  },
  {
    "from": "SA-KLN-TYRES",
    "to": "KLN-01",
    "type": "subassembly_of",
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "note": "Sub-assembly belonging to KLN-01.",
    "flow": false
  },
  {
    "from": "SA-KLN-ROLLERS",
    "to": "KLN-01",
    "type": "subassembly_of",
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "note": "Sub-assembly belonging to KLN-01.",
    "flow": false
  },
  {
    "from": "SA-KLN-THRUST",
    "to": "KLN-01",
    "type": "subassembly_of",
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "note": "Sub-assembly belonging to KLN-01.",
    "flow": false
  },
  {
    "from": "SA-KLN-SEALS",
    "to": "KLN-01",
    "type": "subassembly_of",
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "note": "Sub-assembly belonging to KLN-01.",
    "flow": false
  },
  {
    "from": "SA-KLN-SHELL",
    "to": "KLN-01",
    "type": "subassembly_of",
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "note": "Sub-assembly belonging to KLN-01.",
    "flow": false
  },
  {
    "from": "SA-BRN-CARRIAGE",
    "to": "BRN-01",
    "type": "subassembly_of",
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "note": "Sub-assembly belonging to BRN-01.",
    "flow": false
  },
  {
    "from": "SA-BRN-FUEL",
    "to": "BRN-01",
    "type": "subassembly_of",
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "note": "Sub-assembly belonging to BRN-01.",
    "flow": false
  },
  {
    "from": "SA-BRN-PRIMARY-AIR",
    "to": "BRN-01",
    "type": "subassembly_of",
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "note": "Sub-assembly belonging to BRN-01.",
    "flow": false
  },
  {
    "from": "SA-CLR-GRATES",
    "to": "CLR-01",
    "type": "subassembly_of",
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "note": "Sub-assembly belonging to CLR-01.",
    "flow": false
  },
  {
    "from": "SA-CLR-HYDRAULICS",
    "to": "CLR-01",
    "type": "subassembly_of",
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "note": "Sub-assembly belonging to CLR-01.",
    "flow": false
  },
  {
    "from": "SA-CLR-COOLING",
    "to": "CLR-01",
    "type": "subassembly_of",
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "note": "Sub-assembly belonging to CLR-01.",
    "flow": false
  },
  {
    "from": "SA-CLR-TERTIARY",
    "to": "CLR-01",
    "type": "subassembly_of",
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "note": "Sub-assembly belonging to CLR-01.",
    "flow": false
  },
  {
    "from": "SA-HMR-ROTOR",
    "to": "HMR-01",
    "type": "subassembly_of",
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "note": "Sub-assembly belonging to HMR-01.",
    "flow": false
  },
  {
    "from": "SA-HMR-DRIVE",
    "to": "HMR-01",
    "type": "subassembly_of",
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "note": "Sub-assembly belonging to HMR-01.",
    "flow": false
  },
  {
    "from": "SA-CSL-STORAGE",
    "to": "CSL-01",
    "type": "subassembly_of",
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "note": "Sub-assembly belonging to CSL-01.",
    "flow": false
  },
  {
    "from": "SA-CSL-DISCHARGE",
    "to": "CSL-01",
    "type": "subassembly_of",
    "evidence": "D5-OSW-PE-PYR Rev. 00, Section 4",
    "note": "Sub-assembly belonging to CSL-01.",
    "flow": false
  },
  {
    "from": "LEV-FSL-01",
    "to": "D01",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D01",
    "note": "Allocated to sheet D01.",
    "flow": false
  },
  {
    "from": "LEV-FSL-01",
    "to": "FSL-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Raw-meal silo continuous level on FSL-01.",
    "flow": false
  },
  {
    "from": "PRS-FSL-01",
    "to": "D01",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D01",
    "note": "Allocated to sheet D01.",
    "flow": false
  },
  {
    "from": "PRS-FSL-01",
    "to": "FSL-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Silo extraction/ aeration header pressure on FSL-01.",
    "flow": false
  },
  {
    "from": "ELE-FSL-01",
    "to": "D01",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D01",
    "note": "Allocated to sheet D01.",
    "flow": false
  },
  {
    "from": "ELE-FSL-01",
    "to": "FSL-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Aeration blower motor current on FSL-01.",
    "flow": false
  },
  {
    "from": "WGT-KFS-01",
    "to": "D01",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D01",
    "note": "Allocated to sheet D01.",
    "flow": false
  },
  {
    "from": "WGT-KFS-01",
    "to": "KFS-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Bin weight (calc = sum of 3 cells) on KFS-01.",
    "flow": false
  },
  {
    "from": "POS-KFS-01",
    "to": "D01",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D01",
    "note": "Allocated to sheet D01.",
    "flow": false
  },
  {
    "from": "POS-KFS-01",
    "to": "KFS-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Feed control valve / dosing-gate position on KFS-01.",
    "flow": false
  },
  {
    "from": "PRS-KFS-01",
    "to": "D01",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D01",
    "note": "Allocated to sheet D01.",
    "flow": false
  },
  {
    "from": "PRS-KFS-01",
    "to": "KFS-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Air-slide aeration chamber pressure on KFS-01.",
    "flow": false
  },
  {
    "from": "FLO-KFS-01",
    "to": "D01",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D01",
    "note": "Allocated to sheet D01.",
    "flow": false
  },
  {
    "from": "FLO-KFS-01",
    "to": "KFS-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Kiln-feed mass flow on KFS-01.",
    "flow": false
  },
  {
    "from": "PRS-KFS-02",
    "to": "D01",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D01",
    "note": "Allocated to sheet D01.",
    "flow": false
  },
  {
    "from": "PRS-KFS-02",
    "to": "KFS-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Solid-flow-meter body / pressure interface on KFS-01.",
    "flow": false
  },
  {
    "from": "ELE-KFS-01",
    "to": "D01",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D01",
    "note": "Allocated to sheet D01.",
    "flow": false
  },
  {
    "from": "ELE-KFS-01",
    "to": "KFS-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Elevator motor current on KFS-01.",
    "flow": false
  },
  {
    "from": "VIB-KFS-01",
    "to": "D01",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D01",
    "note": "Allocated to sheet D01.",
    "flow": false
  },
  {
    "from": "VIB-KFS-01",
    "to": "KFS-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Bucket elevator drive vibration on KFS-01.",
    "flow": false
  },
  {
    "from": "TMP-KFS-01",
    "to": "D01",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D01",
    "note": "Allocated to sheet D01.",
    "flow": false
  },
  {
    "from": "TMP-KFS-01",
    "to": "KFS-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Bucket elevator head drive bearing temperature on KFS-01.",
    "flow": false
  },
  {
    "from": "SPD-KFS-01",
    "to": "D01",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D01",
    "note": "Allocated to sheet D01.",
    "flow": false
  },
  {
    "from": "SPD-KFS-01",
    "to": "KFS-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Zero-speed switch (boot) on KFS-01.",
    "flow": false
  },
  {
    "from": "TMP-PHC-02",
    "to": "D02",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D02",
    "note": "Allocated to sheet D02.",
    "flow": false
  },
  {
    "from": "TMP-PHC-02",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors C2 riser duct temperature (tag on hold) on PHC-01.",
    "flow": false
  },
  {
    "from": "PRS-PHC-02",
    "to": "D02",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D02",
    "note": "Allocated to sheet D02.",
    "flow": false
  },
  {
    "from": "PRS-PHC-02",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors C2 riser duct pressure (tag on hold) on PHC-01.",
    "flow": false
  },
  {
    "from": "TMP-PHC-04",
    "to": "D02",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D02",
    "note": "Allocated to sheet D02.",
    "flow": false
  },
  {
    "from": "TMP-PHC-04",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors C4 riser duct temperature (tag on hold) on PHC-01.",
    "flow": false
  },
  {
    "from": "PRS-PHC-04",
    "to": "D02",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D02",
    "note": "Allocated to sheet D02.",
    "flow": false
  },
  {
    "from": "PRS-PHC-04",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors C4 riser duct pressure (tag on hold) on PHC-01.",
    "flow": false
  },
  {
    "from": "TMP-PHC-06",
    "to": "D02",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D02",
    "note": "Allocated to sheet D02.",
    "flow": false
  },
  {
    "from": "TMP-PHC-06",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors C6 riser duct temperature (tag on hold) on PHC-01.",
    "flow": false
  },
  {
    "from": "PRS-PHC-06",
    "to": "D02",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D02",
    "note": "Allocated to sheet D02.",
    "flow": false
  },
  {
    "from": "PRS-PHC-06",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors C6 riser duct pressure (tag on hold) on PHC-01.",
    "flow": false
  },
  {
    "from": "TMP-PHC-01",
    "to": "D02",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D02",
    "note": "Allocated to sheet D02.",
    "flow": false
  },
  {
    "from": "TMP-PHC-01",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors C1 riser duct temperature (tag on hold) on PHC-01.",
    "flow": false
  },
  {
    "from": "PRS-PHC-01",
    "to": "D02",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D02",
    "note": "Allocated to sheet D02.",
    "flow": false
  },
  {
    "from": "PRS-PHC-01",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors C1 riser duct pressure (tag on hold) on PHC-01.",
    "flow": false
  },
  {
    "from": "TMP-PHC-03",
    "to": "D02",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D02",
    "note": "Allocated to sheet D02.",
    "flow": false
  },
  {
    "from": "TMP-PHC-03",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors C3 riser duct temperature (tag on hold) on PHC-01.",
    "flow": false
  },
  {
    "from": "PRS-PHC-03",
    "to": "D02",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D02",
    "note": "Allocated to sheet D02.",
    "flow": false
  },
  {
    "from": "PRS-PHC-03",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors C3 riser duct pressure (tag on hold) on PHC-01.",
    "flow": false
  },
  {
    "from": "TMP-PHC-05",
    "to": "D02",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D02",
    "note": "Allocated to sheet D02.",
    "flow": false
  },
  {
    "from": "TMP-PHC-05",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors C5 riser duct temperature (tag on hold) on PHC-01.",
    "flow": false
  },
  {
    "from": "PRS-PHC-05",
    "to": "D02",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D02",
    "note": "Allocated to sheet D02.",
    "flow": false
  },
  {
    "from": "PRS-PHC-05",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors C5 riser duct pressure (tag on hold) on PHC-01.",
    "flow": false
  },
  {
    "from": "TMP-PHC-08",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Calciner outlet temp. on PHC-01.",
    "flow": false
  },
  {
    "from": "TMP-PHC-07",
    "to": "D02",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D02",
    "note": "Allocated to sheet D02.",
    "flow": false
  },
  {
    "from": "TMP-PHC-07",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Final meal temperature to kiln on PHC-01.",
    "flow": false
  },
  {
    "from": "GAS-PHC-01",
    "to": "D03",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D03",
    "note": "Allocated to sheet D03.",
    "flow": false
  },
  {
    "from": "GAS-PHC-01",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Preheater exit oxygen on PHC-01.",
    "flow": false
  },
  {
    "from": "GAS-PHC-02",
    "to": "D03",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D03",
    "note": "Allocated to sheet D03.",
    "flow": false
  },
  {
    "from": "GAS-PHC-02",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Preheater exit CO on PHC-01.",
    "flow": false
  },
  {
    "from": "POS-PHC-01",
    "to": "D03",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D03",
    "note": "Allocated to sheet D03.",
    "flow": false
  },
  {
    "from": "POS-PHC-01",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors ID fan damper position on PHC-01.",
    "flow": false
  },
  {
    "from": "VIB-PHC-02",
    "to": "D03",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D03",
    "note": "Allocated to sheet D03.",
    "flow": false
  },
  {
    "from": "VIB-PHC-02",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors ID fan NDE vibration on PHC-01.",
    "flow": false
  },
  {
    "from": "TMP-PHC-10",
    "to": "D03",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D03",
    "note": "Allocated to sheet D03.",
    "flow": false
  },
  {
    "from": "TMP-PHC-10",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors ID fan NDE bearing temperature on PHC-01.",
    "flow": false
  },
  {
    "from": "VIB-PHC-01",
    "to": "D03",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D03",
    "note": "Allocated to sheet D03.",
    "flow": false
  },
  {
    "from": "VIB-PHC-01",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors ID fan DE vibration on PHC-01.",
    "flow": false
  },
  {
    "from": "TMP-PHC-09",
    "to": "D03",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D03",
    "note": "Allocated to sheet D03.",
    "flow": false
  },
  {
    "from": "TMP-PHC-09",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors ID fan DE bearing temperature on PHC-01.",
    "flow": false
  },
  {
    "from": "ELE-PHC-01",
    "to": "D03",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D03",
    "note": "Allocated to sheet D03.",
    "flow": false
  },
  {
    "from": "ELE-PHC-01",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors ID fan electrical power on PHC-01.",
    "flow": false
  },
  {
    "from": "SPD-PHC-01",
    "to": "D03",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D03",
    "note": "Allocated to sheet D03.",
    "flow": false
  },
  {
    "from": "SPD-PHC-01",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors ID fan speed feedback on PHC-01.",
    "flow": false
  },
  {
    "from": "ELE-KLN-01",
    "to": "D04",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D04",
    "note": "Allocated to sheet D04.",
    "flow": false
  },
  {
    "from": "ELE-KLN-01",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Main motor current / power / torque if available on KLN-01.",
    "flow": false
  },
  {
    "from": "TMP-KLN-20",
    "to": "D04",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D04",
    "note": "Allocated to sheet D04.",
    "flow": false
  },
  {
    "from": "TMP-KLN-20",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Motor NDE bearing temperature on KLN-01.",
    "flow": false
  },
  {
    "from": "SPD-KLN-01",
    "to": "D04",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D04",
    "note": "Allocated to sheet D04.",
    "flow": false
  },
  {
    "from": "SPD-KLN-01",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Kiln speed feedback on KLN-01.",
    "flow": false
  },
  {
    "from": "TMP-KLN-19",
    "to": "D04",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D04",
    "note": "Allocated to sheet D04.",
    "flow": false
  },
  {
    "from": "TMP-KLN-19",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Motor DE bearing temperature on KLN-01.",
    "flow": false
  },
  {
    "from": "VIB-KLN-01",
    "to": "D04",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D04",
    "note": "Allocated to sheet D04.",
    "flow": false
  },
  {
    "from": "VIB-KLN-01",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Motor DE vibration on KLN-01.",
    "flow": false
  },
  {
    "from": "TMP-KLN-22",
    "to": "D04",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D04",
    "note": "Allocated to sheet D04.",
    "flow": false
  },
  {
    "from": "TMP-KLN-22",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Gearbox input bearing temperature on KLN-01.",
    "flow": false
  },
  {
    "from": "VIB-KLN-02",
    "to": "D04",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D04",
    "note": "Allocated to sheet D04.",
    "flow": false
  },
  {
    "from": "VIB-KLN-02",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Gearbox input vibration on KLN-01.",
    "flow": false
  },
  {
    "from": "VIB-KLN-03",
    "to": "D04",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D04",
    "note": "Allocated to sheet D04.",
    "flow": false
  },
  {
    "from": "VIB-KLN-03",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Gearbox output vibration on KLN-01.",
    "flow": false
  },
  {
    "from": "TMP-KLN-23",
    "to": "D04",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D04",
    "note": "Allocated to sheet D04.",
    "flow": false
  },
  {
    "from": "TMP-KLN-23",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Gearbox output bearing temperature on KLN-01.",
    "flow": false
  },
  {
    "from": "VIB-KLN-04",
    "to": "D04",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D04",
    "note": "Allocated to sheet D04.",
    "flow": false
  },
  {
    "from": "VIB-KLN-04",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Pinion vibration on KLN-01.",
    "flow": false
  },
  {
    "from": "TMP-KLN-15",
    "to": "D04",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D04",
    "note": "Allocated to sheet D04.",
    "flow": false
  },
  {
    "from": "TMP-KLN-15",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Gearbox oil temperature on KLN-01.",
    "flow": false
  },
  {
    "from": "PRS-KLN-04",
    "to": "D04",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D04",
    "note": "Allocated to sheet D04.",
    "flow": false
  },
  {
    "from": "PRS-KLN-04",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Gearbox oil pressure / status on KLN-01.",
    "flow": false
  },
  {
    "from": "LEV-KLN-01",
    "to": "D04",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D04",
    "note": "Allocated to sheet D04.",
    "flow": false
  },
  {
    "from": "LEV-KLN-01",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Gearbox oil low level on KLN-01.",
    "flow": false
  },
  {
    "from": "PRS-KLN-05",
    "to": "D04",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D04",
    "note": "Allocated to sheet D04.",
    "flow": false
  },
  {
    "from": "PRS-KLN-05",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Gearbox filter differential pressure on KLN-01.",
    "flow": false
  },
  {
    "from": "FLO-KLN-05",
    "to": "D04",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D04",
    "note": "Allocated to sheet D04.",
    "flow": false
  },
  {
    "from": "FLO-KLN-05",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Gearbox oil flow switch on KLN-01.",
    "flow": false
  },
  {
    "from": "STS-KLN-11",
    "to": "D04",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D04",
    "note": "Allocated to sheet D04.",
    "flow": false
  },
  {
    "from": "STS-KLN-11",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Auxiliary-drive status on KLN-01.",
    "flow": false
  },
  {
    "from": "LIM-KLN-01",
    "to": "D04",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D04",
    "note": "Allocated to sheet D04.",
    "flow": false
  },
  {
    "from": "LIM-KLN-01",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Auxiliary drive brake lining wear limit on KLN-01.",
    "flow": false
  },
  {
    "from": "STS-KLN-05",
    "to": "D05",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D05",
    "note": "Allocated to sheet D05.",
    "flow": false
  },
  {
    "from": "STS-KLN-05",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Girth-gear spray controller status/fault on KLN-01.",
    "flow": false
  },
  {
    "from": "PRX-KLN-01",
    "to": "D05",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D05",
    "note": "Allocated to sheet D05.",
    "flow": false
  },
  {
    "from": "PRX-KLN-01",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Spray circuit branch/nozzle check #1 on KLN-01.",
    "flow": false
  },
  {
    "from": "PRX-KLN-02",
    "to": "D05",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D05",
    "note": "Allocated to sheet D05.",
    "flow": false
  },
  {
    "from": "PRX-KLN-02",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Spray circuit branch/nozzle check #2 on KLN-01.",
    "flow": false
  },
  {
    "from": "PRX-KLN-03",
    "to": "D05",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D05",
    "note": "Allocated to sheet D05.",
    "flow": false
  },
  {
    "from": "PRX-KLN-03",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Spray circuit branch/nozzle check #3 on KLN-01.",
    "flow": false
  },
  {
    "from": "PRX-KLN-04",
    "to": "D05",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D05",
    "note": "Allocated to sheet D05.",
    "flow": false
  },
  {
    "from": "PRX-KLN-04",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Spray circuit branch/nozzle check #4 on KLN-01.",
    "flow": false
  },
  {
    "from": "PRX-KLN-05",
    "to": "D05",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D05",
    "note": "Allocated to sheet D05.",
    "flow": false
  },
  {
    "from": "PRX-KLN-05",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Spray circuit branch/nozzle check #5 on KLN-01.",
    "flow": false
  },
  {
    "from": "PRX-KLN-06",
    "to": "D05",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D05",
    "note": "Allocated to sheet D05.",
    "flow": false
  },
  {
    "from": "PRX-KLN-06",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Spray circuit branch/nozzle check #6 on KLN-01.",
    "flow": false
  },
  {
    "from": "MIG-KLN-01",
    "to": "D06",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D06",
    "note": "Allocated to sheet D06.",
    "flow": false
  },
  {
    "from": "MIG-KLN-01",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Tyre 1 slip / migration on KLN-01.",
    "flow": false
  },
  {
    "from": "MIG-KLN-02",
    "to": "D06",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D06",
    "note": "Allocated to sheet D06.",
    "flow": false
  },
  {
    "from": "MIG-KLN-02",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Tyre 2 slip / migration on KLN-01.",
    "flow": false
  },
  {
    "from": "MIG-KLN-03",
    "to": "D06",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D06",
    "note": "Allocated to sheet D06.",
    "flow": false
  },
  {
    "from": "MIG-KLN-03",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Tyre 3 slip / migration on KLN-01.",
    "flow": false
  },
  {
    "from": "TMP-KLN-01",
    "to": "D06",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D06",
    "note": "Allocated to sheet D06.",
    "flow": false
  },
  {
    "from": "TMP-KLN-01",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Station 1 left bearing A temperature on KLN-01.",
    "flow": false
  },
  {
    "from": "TMP-KLN-02",
    "to": "D06",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D06",
    "note": "Allocated to sheet D06.",
    "flow": false
  },
  {
    "from": "TMP-KLN-02",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Station 1 left bearing B temperature on KLN-01.",
    "flow": false
  },
  {
    "from": "TMP-KLN-03",
    "to": "D06",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D06",
    "note": "Allocated to sheet D06.",
    "flow": false
  },
  {
    "from": "TMP-KLN-03",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Station 1 right bearing A temperature on KLN-01.",
    "flow": false
  },
  {
    "from": "TMP-KLN-04",
    "to": "D06",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D06",
    "note": "Allocated to sheet D06.",
    "flow": false
  },
  {
    "from": "TMP-KLN-04",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Station 1 right bearing B temperature on KLN-01.",
    "flow": false
  },
  {
    "from": "TMP-KLN-05",
    "to": "D06",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D06",
    "note": "Allocated to sheet D06.",
    "flow": false
  },
  {
    "from": "TMP-KLN-05",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Station 2 left bearing A temperature on KLN-01.",
    "flow": false
  },
  {
    "from": "TMP-KLN-06",
    "to": "D06",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D06",
    "note": "Allocated to sheet D06.",
    "flow": false
  },
  {
    "from": "TMP-KLN-06",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Station 2 left bearing B temperature on KLN-01.",
    "flow": false
  },
  {
    "from": "TMP-KLN-07",
    "to": "D06",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D06",
    "note": "Allocated to sheet D06.",
    "flow": false
  },
  {
    "from": "TMP-KLN-07",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Station 2 right bearing A temperature on KLN-01.",
    "flow": false
  },
  {
    "from": "TMP-KLN-08",
    "to": "D06",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D06",
    "note": "Allocated to sheet D06.",
    "flow": false
  },
  {
    "from": "TMP-KLN-08",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Station 2 right bearing B temperature on KLN-01.",
    "flow": false
  },
  {
    "from": "TMP-KLN-09",
    "to": "D06",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D06",
    "note": "Allocated to sheet D06.",
    "flow": false
  },
  {
    "from": "TMP-KLN-09",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Station 3 left bearing A temperature on KLN-01.",
    "flow": false
  },
  {
    "from": "TMP-KLN-10",
    "to": "D06",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D06",
    "note": "Allocated to sheet D06.",
    "flow": false
  },
  {
    "from": "TMP-KLN-10",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Station 3 left bearing B temperature on KLN-01.",
    "flow": false
  },
  {
    "from": "TMP-KLN-11",
    "to": "D06",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D06",
    "note": "Allocated to sheet D06.",
    "flow": false
  },
  {
    "from": "TMP-KLN-11",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Station 3 right bearing A temperature on KLN-01.",
    "flow": false
  },
  {
    "from": "TMP-KLN-12",
    "to": "D06",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D06",
    "note": "Allocated to sheet D06.",
    "flow": false
  },
  {
    "from": "TMP-KLN-12",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Station 3 right bearing B temperature on KLN-01.",
    "flow": false
  },
  {
    "from": "POS-KLN-01",
    "to": "D06",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D06",
    "note": "Allocated to sheet D06.",
    "flow": false
  },
  {
    "from": "POS-KLN-01",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Kiln axial position on KLN-01.",
    "flow": false
  },
  {
    "from": "POS-KLN-02",
    "to": "D06",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D06",
    "note": "Allocated to sheet D06.",
    "flow": false
  },
  {
    "from": "POS-KLN-02",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Thrust travel-limit status on KLN-01.",
    "flow": false
  },
  {
    "from": "PRS-KLN-07",
    "to": "D06",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D06",
    "note": "Allocated to sheet D06.",
    "flow": false
  },
  {
    "from": "PRS-KLN-07",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Hydraulic thrust pressure on KLN-01.",
    "flow": false
  },
  {
    "from": "TMP-KLN-13",
    "to": "D07",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D07",
    "note": "Allocated to sheet D07.",
    "flow": false
  },
  {
    "from": "TMP-KLN-13",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Kiln-inlet gas temperature on KLN-01.",
    "flow": false
  },
  {
    "from": "PRS-KLN-01",
    "to": "D07",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D07",
    "note": "Allocated to sheet D07.",
    "flow": false
  },
  {
    "from": "PRS-KLN-01",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Kiln-inlet draft on KLN-01.",
    "flow": false
  },
  {
    "from": "GAS-KLN-01",
    "to": "D07",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D07",
    "note": "Allocated to sheet D07.",
    "flow": false
  },
  {
    "from": "GAS-KLN-01",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Kiln inlet O₂ on KLN-01.",
    "flow": false
  },
  {
    "from": "GAS-KLN-02",
    "to": "D07",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D07",
    "note": "Allocated to sheet D07.",
    "flow": false
  },
  {
    "from": "GAS-KLN-02",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Kiln inlet CO on KLN-01.",
    "flow": false
  },
  {
    "from": "GAS-KLN-03",
    "to": "D07",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D07",
    "note": "Allocated to sheet D07.",
    "flow": false
  },
  {
    "from": "GAS-KLN-03",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Kiln-inlet NOx on KLN-01.",
    "flow": false
  },
  {
    "from": "STS-KLN-06",
    "to": "D07",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D07",
    "note": "Allocated to sheet D07.",
    "flow": false
  },
  {
    "from": "STS-KLN-06",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Gas analyzer validity/status on KLN-01.",
    "flow": false
  },
  {
    "from": "STS-KLN-08",
    "to": "D07",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D07",
    "note": "Allocated to sheet D07.",
    "flow": false
  },
  {
    "from": "STS-KLN-08",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Shell scanner: max temp. + position, min temp. + position on KLN-01.",
    "flow": false
  },
  {
    "from": "TMP-KLN-14",
    "to": "D07",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D07",
    "note": "Allocated to sheet D07.",
    "flow": false
  },
  {
    "from": "TMP-KLN-14",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Burning-zone temperature / optical proxy on KLN-01.",
    "flow": false
  },
  {
    "from": "TMP-KLN-27",
    "to": "D07",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D07",
    "note": "Allocated to sheet D07.",
    "flow": false
  },
  {
    "from": "TMP-KLN-27",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Kiln hood gas / structural temperature on KLN-01.",
    "flow": false
  },
  {
    "from": "PRS-KLN-03",
    "to": "D07",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D07",
    "note": "Allocated to sheet D07.",
    "flow": false
  },
  {
    "from": "PRS-KLN-03",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Kiln hood pressure on KLN-01.",
    "flow": false
  },
  {
    "from": "TMP-KLN-25",
    "to": "D07",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D07",
    "note": "Allocated to sheet D07.",
    "flow": false
  },
  {
    "from": "TMP-KLN-25",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Outlet sector-plate cooling supply temperature on KLN-01.",
    "flow": false
  },
  {
    "from": "TMP-KLN-26",
    "to": "D07",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D07",
    "note": "Allocated to sheet D07.",
    "flow": false
  },
  {
    "from": "TMP-KLN-26",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Outlet cooling shroud (cow shell) surface temperature on KLN-01.",
    "flow": false
  },
  {
    "from": "CAM-BRN-01",
    "to": "D08",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D08",
    "note": "Allocated to sheet D08.",
    "flow": false
  },
  {
    "from": "CAM-BRN-01",
    "to": "BRN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Flame-view camera / picture on BRN-01.",
    "flow": false
  },
  {
    "from": "PRS-BRN-01",
    "to": "D08",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D08",
    "note": "Allocated to sheet D08.",
    "flow": false
  },
  {
    "from": "PRS-BRN-01",
    "to": "BRN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors PA header pressure on BRN-01.",
    "flow": false
  },
  {
    "from": "PRS-BRN-02",
    "to": "D08",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D08",
    "note": "Allocated to sheet D08.",
    "flow": false
  },
  {
    "from": "PRS-BRN-02",
    "to": "BRN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Burner swirl air pressure on BRN-01.",
    "flow": false
  },
  {
    "from": "PRS-BRN-03",
    "to": "D08",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D08",
    "note": "Allocated to sheet D08.",
    "flow": false
  },
  {
    "from": "PRS-BRN-03",
    "to": "BRN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Burner axial air pressure on BRN-01.",
    "flow": false
  },
  {
    "from": "PRS-BRN-04",
    "to": "D08",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D08",
    "note": "Allocated to sheet D08.",
    "flow": false
  },
  {
    "from": "PRS-BRN-04",
    "to": "BRN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Coal transport line pressure on BRN-01.",
    "flow": false
  },
  {
    "from": "VIB-BRN-01",
    "to": "D08",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D08",
    "note": "Allocated to sheet D08.",
    "flow": false
  },
  {
    "from": "VIB-BRN-01",
    "to": "BRN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Primary-air fan vibration on BRN-01.",
    "flow": false
  },
  {
    "from": "TMP-BRN-01",
    "to": "D08",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D08",
    "note": "Allocated to sheet D08.",
    "flow": false
  },
  {
    "from": "TMP-BRN-01",
    "to": "BRN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Primary-air fan bearing temperature on BRN-01.",
    "flow": false
  },
  {
    "from": "ELE-BRN-01",
    "to": "D08",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D08",
    "note": "Allocated to sheet D08.",
    "flow": false
  },
  {
    "from": "ELE-BRN-01",
    "to": "BRN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Primary-air fan motor current on BRN-01.",
    "flow": false
  },
  {
    "from": "TMP-BRN-02",
    "to": "D08",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D08",
    "note": "Allocated to sheet D08.",
    "flow": false
  },
  {
    "from": "TMP-BRN-02",
    "to": "BRN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Secondary air temperature on BRN-01.",
    "flow": false
  },
  {
    "from": "TMP-BRN-04",
    "to": "D08",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D08",
    "note": "Allocated to sheet D08.",
    "flow": false
  },
  {
    "from": "TMP-BRN-04",
    "to": "BRN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Fine-coal bin temperature on BRN-01.",
    "flow": false
  },
  {
    "from": "GAS-BRN-01",
    "to": "D08",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D08",
    "note": "Allocated to sheet D08.",
    "flow": false
  },
  {
    "from": "GAS-BRN-01",
    "to": "BRN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Coal bin CO on BRN-01.",
    "flow": false
  },
  {
    "from": "LEV-BRN-01",
    "to": "D08",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D08",
    "note": "Allocated to sheet D08.",
    "flow": false
  },
  {
    "from": "LEV-BRN-01",
    "to": "BRN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Fine-coal bin level on BRN-01.",
    "flow": false
  },
  {
    "from": "FLO-BRN-01",
    "to": "D08",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D08",
    "note": "Allocated to sheet D08.",
    "flow": false
  },
  {
    "from": "FLO-BRN-01",
    "to": "BRN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Kiln coal mass flow on BRN-01.",
    "flow": false
  },
  {
    "from": "VIB-BRN-02",
    "to": "D08",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D08",
    "note": "Allocated to sheet D08.",
    "flow": false
  },
  {
    "from": "VIB-BRN-02",
    "to": "BRN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Coal transport blower vibration on BRN-01.",
    "flow": false
  },
  {
    "from": "ELE-BRN-02",
    "to": "D08",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D08",
    "note": "Allocated to sheet D08.",
    "flow": false
  },
  {
    "from": "ELE-BRN-02",
    "to": "BRN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Coal transport blower current on BRN-01.",
    "flow": false
  },
  {
    "from": "PRS-CLR-01",
    "to": "D09",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D09",
    "note": "Allocated to sheet D09.",
    "flow": false
  },
  {
    "from": "PRS-CLR-01",
    "to": "CLR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Under-grate chamber 1 static pressure on CLR-01.",
    "flow": false
  },
  {
    "from": "TMP-CLR-01",
    "to": "D09",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D09",
    "note": "Allocated to sheet D09.",
    "flow": false
  },
  {
    "from": "TMP-CLR-01",
    "to": "CLR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Cooling fan 1 bearing temperature on CLR-01.",
    "flow": false
  },
  {
    "from": "VIB-CLR-01",
    "to": "D09",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D09",
    "note": "Allocated to sheet D09.",
    "flow": false
  },
  {
    "from": "VIB-CLR-01",
    "to": "CLR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Cooling fan 1 vibration on CLR-01.",
    "flow": false
  },
  {
    "from": "ELE-CLR-01",
    "to": "D09",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D09",
    "note": "Allocated to sheet D09.",
    "flow": false
  },
  {
    "from": "ELE-CLR-01",
    "to": "CLR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Cooling fan 1 motor current on CLR-01.",
    "flow": false
  },
  {
    "from": "PRS-CLR-02",
    "to": "D09",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D09",
    "note": "Allocated to sheet D09.",
    "flow": false
  },
  {
    "from": "PRS-CLR-02",
    "to": "CLR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Under-grate chamber 2 static pressure on CLR-01.",
    "flow": false
  },
  {
    "from": "TMP-CLR-02",
    "to": "D09",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D09",
    "note": "Allocated to sheet D09.",
    "flow": false
  },
  {
    "from": "TMP-CLR-02",
    "to": "CLR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Cooling fan 2 bearing temperature on CLR-01.",
    "flow": false
  },
  {
    "from": "VIB-CLR-02",
    "to": "D09",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D09",
    "note": "Allocated to sheet D09.",
    "flow": false
  },
  {
    "from": "VIB-CLR-02",
    "to": "CLR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Cooling fan 2 vibration on CLR-01.",
    "flow": false
  },
  {
    "from": "ELE-CLR-02",
    "to": "D09",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D09",
    "note": "Allocated to sheet D09.",
    "flow": false
  },
  {
    "from": "ELE-CLR-02",
    "to": "CLR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Cooling fan 2 motor current on CLR-01.",
    "flow": false
  },
  {
    "from": "PRS-CLR-03",
    "to": "D09",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D09",
    "note": "Allocated to sheet D09.",
    "flow": false
  },
  {
    "from": "PRS-CLR-03",
    "to": "CLR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Under-grate chamber 3 static pressure on CLR-01.",
    "flow": false
  },
  {
    "from": "TMP-CLR-03",
    "to": "D09",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D09",
    "note": "Allocated to sheet D09.",
    "flow": false
  },
  {
    "from": "TMP-CLR-03",
    "to": "CLR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Cooling fan 3 bearing temperature on CLR-01.",
    "flow": false
  },
  {
    "from": "VIB-CLR-03",
    "to": "D09",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D09",
    "note": "Allocated to sheet D09.",
    "flow": false
  },
  {
    "from": "VIB-CLR-03",
    "to": "CLR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Cooling fan 3 vibration on CLR-01.",
    "flow": false
  },
  {
    "from": "ELE-CLR-03",
    "to": "D09",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D09",
    "note": "Allocated to sheet D09.",
    "flow": false
  },
  {
    "from": "ELE-CLR-03",
    "to": "CLR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Cooling fan 3 motor current on CLR-01.",
    "flow": false
  },
  {
    "from": "PRS-CLR-04",
    "to": "D10",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D10",
    "note": "Allocated to sheet D10.",
    "flow": false
  },
  {
    "from": "PRS-CLR-04",
    "to": "CLR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Under-grate chamber 4 static pressure on CLR-01.",
    "flow": false
  },
  {
    "from": "TMP-CLR-04",
    "to": "D10",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D10",
    "note": "Allocated to sheet D10.",
    "flow": false
  },
  {
    "from": "TMP-CLR-04",
    "to": "CLR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Cooling fan 4 bearing temperature on CLR-01.",
    "flow": false
  },
  {
    "from": "ELE-CLR-04",
    "to": "D10",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D10",
    "note": "Allocated to sheet D10.",
    "flow": false
  },
  {
    "from": "ELE-CLR-04",
    "to": "CLR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Cooling fan 4 motor current on CLR-01.",
    "flow": false
  },
  {
    "from": "PRS-CLR-05",
    "to": "D10",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D10",
    "note": "Allocated to sheet D10.",
    "flow": false
  },
  {
    "from": "PRS-CLR-05",
    "to": "CLR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Under-grate chamber 5 static pressure on CLR-01.",
    "flow": false
  },
  {
    "from": "TMP-CLR-05",
    "to": "D10",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D10",
    "note": "Allocated to sheet D10.",
    "flow": false
  },
  {
    "from": "TMP-CLR-05",
    "to": "CLR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Cooling fan 5 bearing temperature on CLR-01.",
    "flow": false
  },
  {
    "from": "ELE-CLR-05",
    "to": "D10",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D10",
    "note": "Allocated to sheet D10.",
    "flow": false
  },
  {
    "from": "ELE-CLR-05",
    "to": "CLR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Cooling fan 5 motor current on CLR-01.",
    "flow": false
  },
  {
    "from": "PRS-CLR-06",
    "to": "D10",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D10",
    "note": "Allocated to sheet D10.",
    "flow": false
  },
  {
    "from": "PRS-CLR-06",
    "to": "CLR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Under-grate chamber 6 static pressure on CLR-01.",
    "flow": false
  },
  {
    "from": "TMP-CLR-06",
    "to": "D10",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D10",
    "note": "Allocated to sheet D10.",
    "flow": false
  },
  {
    "from": "TMP-CLR-06",
    "to": "CLR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Cooling fan 6 bearing temperature on CLR-01.",
    "flow": false
  },
  {
    "from": "ELE-CLR-06",
    "to": "D10",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D10",
    "note": "Allocated to sheet D10.",
    "flow": false
  },
  {
    "from": "ELE-CLR-06",
    "to": "CLR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Cooling fan 6 motor current on CLR-01.",
    "flow": false
  },
  {
    "from": "TMP-CLR-08",
    "to": "D10",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D10",
    "note": "Allocated to sheet D10.",
    "flow": false
  },
  {
    "from": "TMP-CLR-08",
    "to": "CLR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Discharge clinker surface temperature on CLR-01.",
    "flow": false
  },
  {
    "from": "TMP-CLR-09",
    "to": "D10",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D10",
    "note": "Allocated to sheet D10.",
    "flow": false
  },
  {
    "from": "TMP-CLR-09",
    "to": "CLR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Cooler exhaust gas temperature on CLR-01.",
    "flow": false
  },
  {
    "from": "VIB-CLR-07",
    "to": "D10",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D10",
    "note": "Allocated to sheet D10.",
    "flow": false
  },
  {
    "from": "VIB-CLR-07",
    "to": "CLR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Cooler vent fan vibration on CLR-01.",
    "flow": false
  },
  {
    "from": "TMP-CLR-10",
    "to": "D10",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D10",
    "note": "Allocated to sheet D10.",
    "flow": false
  },
  {
    "from": "TMP-CLR-10",
    "to": "CLR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Vent fan bearing temperature on CLR-01.",
    "flow": false
  },
  {
    "from": "ELE-CLR-07",
    "to": "D10",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D10",
    "note": "Allocated to sheet D10.",
    "flow": false
  },
  {
    "from": "ELE-CLR-07",
    "to": "CLR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Vent fan electrical current on CLR-01.",
    "flow": false
  },
  {
    "from": "SPD-CLR-01",
    "to": "CLR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Fan speed (RPM) (fan 1) on CLR-01.",
    "flow": false
  },
  {
    "from": "TMP-HMR-03",
    "to": "D11",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D11",
    "note": "Allocated to sheet D11.",
    "flow": false
  },
  {
    "from": "TMP-HMR-03",
    "to": "HMR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Crusher motor winding temperature on HMR-01.",
    "flow": false
  },
  {
    "from": "ELE-HMR-01",
    "to": "D11",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D11",
    "note": "Allocated to sheet D11.",
    "flow": false
  },
  {
    "from": "ELE-HMR-01",
    "to": "HMR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Crusher motor current on HMR-01.",
    "flow": false
  },
  {
    "from": "VIB-HMR-02",
    "to": "D11",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D11",
    "note": "Allocated to sheet D11.",
    "flow": false
  },
  {
    "from": "VIB-HMR-02",
    "to": "HMR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Clinker crusher rotor NDE vibration on HMR-01.",
    "flow": false
  },
  {
    "from": "TMP-HMR-02",
    "to": "D11",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D11",
    "note": "Allocated to sheet D11.",
    "flow": false
  },
  {
    "from": "TMP-HMR-02",
    "to": "HMR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Crusher NDE bearing temperature on HMR-01.",
    "flow": false
  },
  {
    "from": "SPD-HMR-01",
    "to": "D11",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D11",
    "note": "Allocated to sheet D11.",
    "flow": false
  },
  {
    "from": "SPD-HMR-01",
    "to": "HMR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Rotor zero-speed switch (no RPM) on HMR-01.",
    "flow": false
  },
  {
    "from": "VIB-HMR-01",
    "to": "D11",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D11",
    "note": "Allocated to sheet D11.",
    "flow": false
  },
  {
    "from": "VIB-HMR-01",
    "to": "HMR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Clinker crusher rotor DE vibration on HMR-01.",
    "flow": false
  },
  {
    "from": "TMP-HMR-01",
    "to": "D11",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D11",
    "note": "Allocated to sheet D11.",
    "flow": false
  },
  {
    "from": "TMP-HMR-01",
    "to": "HMR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Crusher DE bearing temperature on HMR-01.",
    "flow": false
  },
  {
    "from": "VIB-CSL-01",
    "to": "D11",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D11",
    "note": "Allocated to sheet D11.",
    "flow": false
  },
  {
    "from": "VIB-CSL-01",
    "to": "CSL-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Pan conveyor drive vibration on CSL-01.",
    "flow": false
  },
  {
    "from": "ELE-CSL-01",
    "to": "D11",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D11",
    "note": "Allocated to sheet D11.",
    "flow": false
  },
  {
    "from": "ELE-CSL-01",
    "to": "CSL-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Pan conveyor motor current on CSL-01.",
    "flow": false
  },
  {
    "from": "SPD-CSL-01",
    "to": "D11",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D11",
    "note": "Allocated to sheet D11.",
    "flow": false
  },
  {
    "from": "SPD-CSL-01",
    "to": "CSL-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Zero-speed switch (tail, no RPM) on CSL-01.",
    "flow": false
  },
  {
    "from": "PRS-CSL-01",
    "to": "D11",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D11",
    "note": "Allocated to sheet D11.",
    "flow": false
  },
  {
    "from": "PRS-CSL-01",
    "to": "CSL-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Silo baghouse ΔP (calc) on CSL-01.",
    "flow": false
  },
  {
    "from": "ELE-CSL-02",
    "to": "D11",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D11",
    "note": "Allocated to sheet D11.",
    "flow": false
  },
  {
    "from": "ELE-CSL-02",
    "to": "CSL-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Dust collector fan motor current on CSL-01.",
    "flow": false
  },
  {
    "from": "LEV-CSL-01",
    "to": "D11",
    "type": "allocated_to",
    "evidence": "D4-OSW-PE-PYR Rev. 02, Diagram D11",
    "note": "Allocated to sheet D11.",
    "flow": false
  },
  {
    "from": "LEV-CSL-01",
    "to": "CSL-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Clinker silo continuous level on CSL-01.",
    "flow": false
  },
  {
    "from": "POS-FSL-01",
    "to": "FSL-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Motorised gate 1 opening (manual + pneumatic gates not monitored) on FSL-01.",
    "flow": false
  },
  {
    "from": "POS-FSL-02",
    "to": "FSL-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Motorised gate 2 opening (manual + pneumatic gates not monitored) on FSL-01.",
    "flow": false
  },
  {
    "from": "POS-FSL-03",
    "to": "FSL-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Motorised gate 3 opening (manual + pneumatic gates not monitored) on FSL-01.",
    "flow": false
  },
  {
    "from": "POS-FSL-04",
    "to": "FSL-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Motorised gate 4 opening (manual + pneumatic gates not monitored) on FSL-01.",
    "flow": false
  },
  {
    "from": "POS-FSL-05",
    "to": "FSL-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Motorised gate 5 opening (manual + pneumatic gates not monitored) on FSL-01.",
    "flow": false
  },
  {
    "from": "POS-FSL-06",
    "to": "FSL-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Motorised gate 6 opening (manual + pneumatic gates not monitored) on FSL-01.",
    "flow": false
  },
  {
    "from": "STS-FSL-03",
    "to": "FSL-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Slide purge sequence on FSL-01.",
    "flow": false
  },
  {
    "from": "TMP-FSL-01",
    "to": "FSL-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Aeration blower motor winding temperature on FSL-01.",
    "flow": false
  },
  {
    "from": "PRS-FSL-02",
    "to": "FSL-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Silo DC filter ΔP (calc = in − out) on FSL-01.",
    "flow": false
  },
  {
    "from": "ELE-FSL-02",
    "to": "FSL-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Silo dust-collector fan motor current on FSL-01.",
    "flow": false
  },
  {
    "from": "PRS-KFS-05",
    "to": "KFS-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Bin DC filter ΔP (calc) on KFS-01.",
    "flow": false
  },
  {
    "from": "ELE-KFS-03",
    "to": "KFS-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Feed-bin dust-collector fan motor current on KFS-01.",
    "flow": false
  },
  {
    "from": "WGT-KFS-02",
    "to": "KFS-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Load cell 1 on KFS-01.",
    "flow": false
  },
  {
    "from": "WGT-KFS-03",
    "to": "KFS-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Load cell 2 on KFS-01.",
    "flow": false
  },
  {
    "from": "POS-KFS-02",
    "to": "KFS-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Discharge gate B open / closed on KFS-01.",
    "flow": false
  },
  {
    "from": "FLO-KFS-02",
    "to": "KFS-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Kiln feed mass flow, SFM B on KFS-01.",
    "flow": false
  },
  {
    "from": "PRS-KFS-06",
    "to": "KFS-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors SFM B pressure (P3) on KFS-01.",
    "flow": false
  },
  {
    "from": "PRS-KFS-04",
    "to": "KFS-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Common air slide SFM A/B → elevator pressure on KFS-01.",
    "flow": false
  },
  {
    "from": "LEV-KFS-04",
    "to": "KFS-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Elevator boot material build-up level on KFS-01.",
    "flow": false
  },
  {
    "from": "LIM-KFS-01",
    "to": "KFS-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Elevator belt sway / misalignment switch on KFS-01.",
    "flow": false
  },
  {
    "from": "TMP-KFS-02",
    "to": "KFS-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Bucket elevator head motor winding temperature on KFS-01.",
    "flow": false
  },
  {
    "from": "TMP-PHC-11",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors ID fan motor winding temperature on PHC-01.",
    "flow": false
  },
  {
    "from": "PRS-PHC-10",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Calciner outlet draft on PHC-01.",
    "flow": false
  },
  {
    "from": "GAS-PHC-03",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Calciner outlet O₂ on PHC-01.",
    "flow": false
  },
  {
    "from": "GAS-PHC-04",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Calciner outlet CO on PHC-01.",
    "flow": false
  },
  {
    "from": "POS-PHC-02",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors C5 meal-split gate position (calciner / riser) on PHC-01.",
    "flow": false
  },
  {
    "from": "STS-BGH-01",
    "to": "BGH-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Pulse-cleaning controller status on BGH-01.",
    "flow": false
  },
  {
    "from": "TMP-BGH-02",
    "to": "BGH-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Baghouse inlet gas temperature (bag protection) on BGH-01.",
    "flow": false
  },
  {
    "from": "PRS-BGH-02",
    "to": "BGH-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Baghouse inlet draft on BGH-01.",
    "flow": false
  },
  {
    "from": "PRS-BGH-01",
    "to": "BGH-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Bag ΔP (calc = in − out) on BGH-01.",
    "flow": false
  },
  {
    "from": "LEV-BGH-01",
    "to": "BGH-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Baghouse dust-hopper level on BGH-01.",
    "flow": false
  },
  {
    "from": "GAS-BGH-01",
    "to": "BGH-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Stack dust (existing CEMS, read-only) on BGH-01.",
    "flow": false
  },
  {
    "from": "VIB-BGH-01",
    "to": "BGH-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Baghouse fan bearing vibration on BGH-01.",
    "flow": false
  },
  {
    "from": "TMP-BGH-01",
    "to": "BGH-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Baghouse fan bearing temperature on BGH-01.",
    "flow": false
  },
  {
    "from": "ELE-BGH-01",
    "to": "BGH-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Baghouse fan motor current on BGH-01.",
    "flow": false
  },
  {
    "from": "SPD-BGH-01",
    "to": "BGH-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Baghouse fan speed on BGH-01.",
    "flow": false
  },
  {
    "from": "TMP-BGH-03",
    "to": "BGH-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Baghouse fan motor winding temperature on BGH-01.",
    "flow": false
  },
  {
    "from": "STS-KLN-12",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Main-drive health and motor cooling fans (DCS) on KLN-01.",
    "flow": false
  },
  {
    "from": "TMP-KLN-28",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Tyre 1 temperature (DCS read-only) on KLN-01.",
    "flow": false
  },
  {
    "from": "TMP-KLN-29",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Tyre 2 temperature (DCS read-only) on KLN-01.",
    "flow": false
  },
  {
    "from": "TMP-KLN-30",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Tyre 3 temperature (DCS read-only) on KLN-01.",
    "flow": false
  },
  {
    "from": "STS-KLN-13",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Shell cooling fans status (DCS) on KLN-01.",
    "flow": false
  },
  {
    "from": "POS-BRN-01",
    "to": "BRN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Tertiary-air damper position on BRN-01.",
    "flow": false
  },
  {
    "from": "TMP-BRN-03",
    "to": "BRN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Tertiary-air temperature on BRN-01.",
    "flow": false
  },
  {
    "from": "PRS-BRN-05",
    "to": "BRN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Tertiary-air duct pressure on BRN-01.",
    "flow": false
  },
  {
    "from": "FLO-BRN-02",
    "to": "BRN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Calciner coal mass flow on BRN-01.",
    "flow": false
  },
  {
    "from": "TMP-BRN-05",
    "to": "BRN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Primary-air fan motor winding temperature on BRN-01.",
    "flow": false
  },
  {
    "from": "TMP-BRN-06",
    "to": "BRN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Coal conveying blower motor winding temperature on BRN-01.",
    "flow": false
  },
  {
    "from": "TMP-CLR-17",
    "to": "CLR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Cooling fan 1 motor winding temperature on CLR-01.",
    "flow": false
  },
  {
    "from": "TMP-CLR-18",
    "to": "CLR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Cooling fan 2 motor winding temperature on CLR-01.",
    "flow": false
  },
  {
    "from": "TMP-CLR-19",
    "to": "CLR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Cooling fan 3 motor winding temperature on CLR-01.",
    "flow": false
  },
  {
    "from": "TMP-CLR-20",
    "to": "CLR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Cooling fan 4 motor winding temperature on CLR-01.",
    "flow": false
  },
  {
    "from": "TMP-CLR-21",
    "to": "CLR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Cooling fan 5 motor winding temperature on CLR-01.",
    "flow": false
  },
  {
    "from": "TMP-CLR-22",
    "to": "CLR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Cooling fan 6 motor winding temperature on CLR-01.",
    "flow": false
  },
  {
    "from": "TMP-CLR-23",
    "to": "CLR-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Vent fan motor winding temperature on CLR-01.",
    "flow": false
  },
  {
    "from": "TMP-CSL-02",
    "to": "CSL-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Pan conveyor motor winding temperature on CSL-01.",
    "flow": false
  },
  {
    "from": "PRS-FSL-03",
    "to": "FSL-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Silo DC inlet pressure on FSL-01.",
    "flow": false
  },
  {
    "from": "PRS-FSL-04",
    "to": "FSL-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Silo DC outlet pressure on FSL-01.",
    "flow": false
  },
  {
    "from": "WGT-KFS-04",
    "to": "KFS-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Load cell 3 on KFS-01.",
    "flow": false
  },
  {
    "from": "PRS-KFS-08",
    "to": "KFS-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Bin DC inlet pressure on KFS-01.",
    "flow": false
  },
  {
    "from": "PRS-KFS-09",
    "to": "KFS-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Bin DC outlet pressure on KFS-01.",
    "flow": false
  },
  {
    "from": "PRS-KFS-03",
    "to": "KFS-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Slide B air pressure on KFS-01.",
    "flow": false
  },
  {
    "from": "ELE-KFS-04",
    "to": "KFS-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Slide A blower motor current on KFS-01.",
    "flow": false
  },
  {
    "from": "ELE-KFS-05",
    "to": "KFS-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Slide B blower motor current on KFS-01.",
    "flow": false
  },
  {
    "from": "ELE-KFS-06",
    "to": "KFS-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Common slide blower current on KFS-01.",
    "flow": false
  },
  {
    "from": "VIB-KFS-04",
    "to": "KFS-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Head shaft vibration NDE on KFS-01.",
    "flow": false
  },
  {
    "from": "TMP-KFS-03",
    "to": "KFS-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Head bearing temp. NDE on KFS-01.",
    "flow": false
  },
  {
    "from": "PRS-KFS-07",
    "to": "KFS-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Preheater-top slide air pressure on KFS-01.",
    "flow": false
  },
  {
    "from": "ELE-KFS-07",
    "to": "KFS-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Preheater-top slide blower current on KFS-01.",
    "flow": false
  },
  {
    "from": "SPD-KFS-02",
    "to": "KFS-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Rotary airlock 1 zero-speed (in series) on KFS-01.",
    "flow": false
  },
  {
    "from": "SPD-KFS-03",
    "to": "KFS-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Rotary airlock 2 zero-speed (in series) on KFS-01.",
    "flow": false
  },
  {
    "from": "PRS-PHC-11",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors C1 cone pressure (tag on hold) on PHC-01.",
    "flow": false
  },
  {
    "from": "TMP-PHC-21",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors C1 cone temperature (tag on hold) on PHC-01.",
    "flow": false
  },
  {
    "from": "PRS-PHC-12",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors C2 cone pressure (tag on hold) on PHC-01.",
    "flow": false
  },
  {
    "from": "TMP-PHC-22",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors C2 cone temperature (tag on hold) on PHC-01.",
    "flow": false
  },
  {
    "from": "PRS-PHC-13",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors C3 cone pressure (tag on hold) on PHC-01.",
    "flow": false
  },
  {
    "from": "TMP-PHC-23",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors C3 cone temperature (tag on hold) on PHC-01.",
    "flow": false
  },
  {
    "from": "PRS-PHC-14",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors C4 cone pressure (tag on hold) on PHC-01.",
    "flow": false
  },
  {
    "from": "TMP-PHC-24",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors C4 cone temperature (tag on hold) on PHC-01.",
    "flow": false
  },
  {
    "from": "PRS-PHC-15",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors C5 cone pressure (tag on hold) on PHC-01.",
    "flow": false
  },
  {
    "from": "TMP-PHC-25",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors C5 cone temperature (tag on hold) on PHC-01.",
    "flow": false
  },
  {
    "from": "PRS-PHC-16",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors C6 cone pressure (tag on hold) on PHC-01.",
    "flow": false
  },
  {
    "from": "TMP-PHC-26",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors C6 cone temperature (tag on hold) on PHC-01.",
    "flow": false
  },
  {
    "from": "TMP-PHC-30",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Gas out temp. (C1 top, before WHRS) on PHC-01.",
    "flow": false
  },
  {
    "from": "POS-PHC-03",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors WHRS inlet damper on PHC-01.",
    "flow": false
  },
  {
    "from": "POS-PHC-04",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors WHRS outlet damper on PHC-01.",
    "flow": false
  },
  {
    "from": "POS-PHC-05",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Main-line bypass damper on PHC-01.",
    "flow": false
  },
  {
    "from": "TMP-PHC-31",
    "to": "PHC-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Gas temp. after WHRS (before ID fan) on PHC-01.",
    "flow": false
  },
  {
    "from": "PRS-BGH-03",
    "to": "BGH-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Baghouse outlet pressure on BGH-01.",
    "flow": false
  },
  {
    "from": "LEV-BGH-02",
    "to": "BGH-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Hopper 2 level switch on BGH-01.",
    "flow": false
  },
  {
    "from": "LEV-BGH-03",
    "to": "BGH-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Hopper 3 level switch on BGH-01.",
    "flow": false
  },
  {
    "from": "SPD-BGH-02",
    "to": "BGH-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Hopper 1 rotary airlock zero-speed on BGH-01.",
    "flow": false
  },
  {
    "from": "SPD-BGH-03",
    "to": "BGH-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Hopper 2 rotary airlock zero-speed on BGH-01.",
    "flow": false
  },
  {
    "from": "SPD-BGH-04",
    "to": "BGH-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Hopper 3 rotary airlock zero-speed on BGH-01.",
    "flow": false
  },
  {
    "from": "GAS-BGH-02",
    "to": "BGH-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Stack SOx on BGH-01.",
    "flow": false
  },
  {
    "from": "GAS-BGH-03",
    "to": "BGH-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Stack NOx on BGH-01.",
    "flow": false
  },
  {
    "from": "GAS-BGH-04",
    "to": "BGH-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Stack CO on BGH-01.",
    "flow": false
  },
  {
    "from": "GAS-BGH-05",
    "to": "BGH-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Stack CO₂ on BGH-01.",
    "flow": false
  },
  {
    "from": "VIB-KLN-05",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Main motor vibration NDE on KLN-01.",
    "flow": false
  },
  {
    "from": "TMP-KLN-41",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Winding temp. 1 on KLN-01.",
    "flow": false
  },
  {
    "from": "TMP-KLN-42",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Winding temp. 2 on KLN-01.",
    "flow": false
  },
  {
    "from": "TMP-KLN-43",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Winding temp. 3 on KLN-01.",
    "flow": false
  },
  {
    "from": "TMP-KLN-44",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Winding temp. 4 on KLN-01.",
    "flow": false
  },
  {
    "from": "TMP-KLN-45",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Winding temp. 5 on KLN-01.",
    "flow": false
  },
  {
    "from": "TMP-KLN-46",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Winding temp. 6 on KLN-01.",
    "flow": false
  },
  {
    "from": "STS-KLN-14",
    "to": "KLN-01",
    "type": "monitors",
    "evidence": "D4-OSW-PE-PYR Rev. 02, p. 6",
    "note": "Monitors Motor cooling fan on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:LEV-FSL-01",
    "to": "FSL-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-1",
    "note": "Register position on FSL-01.",
    "flow": false
  },
  {
    "from": "SNL:LEV-FSL-01",
    "to": "LEV-FSL-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:LEV-FSL-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-FSL-01",
    "to": "FSL-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-2",
    "note": "Register position on FSL-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-FSL-01",
    "to": "PRS-FSL-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-FSL-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:ELE-FSL-01",
    "to": "FSL-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-2",
    "note": "Register position on FSL-01.",
    "flow": false
  },
  {
    "from": "SNL:ELE-FSL-01",
    "to": "ELE-FSL-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:ELE-FSL-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-FSL-01",
    "to": "FSL-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-2",
    "note": "Register position on FSL-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-FSL-01",
    "to": "TMP-FSL-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-FSL-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:STS-FSL-03",
    "to": "FSL-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-2",
    "note": "Register position on FSL-01.",
    "flow": false
  },
  {
    "from": "SNL:STS-FSL-03",
    "to": "STS-FSL-03",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:STS-FSL-03",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:POS-FSL-01",
    "to": "FSL-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-1",
    "note": "Register position on FSL-01.",
    "flow": false
  },
  {
    "from": "SNL:POS-FSL-01",
    "to": "POS-FSL-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:POS-FSL-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:POS-FSL-02",
    "to": "FSL-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-1",
    "note": "Register position on FSL-01.",
    "flow": false
  },
  {
    "from": "SNL:POS-FSL-02",
    "to": "POS-FSL-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:POS-FSL-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:POS-FSL-03",
    "to": "FSL-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-1",
    "note": "Register position on FSL-01.",
    "flow": false
  },
  {
    "from": "SNL:POS-FSL-03",
    "to": "POS-FSL-03",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:POS-FSL-03",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:POS-FSL-04",
    "to": "FSL-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-1",
    "note": "Register position on FSL-01.",
    "flow": false
  },
  {
    "from": "SNL:POS-FSL-04",
    "to": "POS-FSL-04",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:POS-FSL-04",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:POS-FSL-05",
    "to": "FSL-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-1",
    "note": "Register position on FSL-01.",
    "flow": false
  },
  {
    "from": "SNL:POS-FSL-05",
    "to": "POS-FSL-05",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:POS-FSL-05",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:POS-FSL-06",
    "to": "FSL-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-1",
    "note": "Register position on FSL-01.",
    "flow": false
  },
  {
    "from": "SNL:POS-FSL-06",
    "to": "POS-FSL-06",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:POS-FSL-06",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-FSL-03",
    "to": "FSL-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-3",
    "note": "Register position on FSL-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-FSL-03",
    "to": "PRS-FSL-03",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-FSL-03",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-FSL-04",
    "to": "FSL-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-3",
    "note": "Register position on FSL-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-FSL-04",
    "to": "PRS-FSL-04",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-FSL-04",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-FSL-02",
    "to": "FSL-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-3",
    "note": "Register position on FSL-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-FSL-02",
    "to": "PRS-FSL-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-FSL-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:ELE-FSL-02",
    "to": "FSL-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-3",
    "note": "Register position on FSL-01.",
    "flow": false
  },
  {
    "from": "SNL:ELE-FSL-02",
    "to": "ELE-FSL-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:ELE-FSL-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:WGT-KFS-02",
    "to": "KFS-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-4",
    "note": "Register position on KFS-01.",
    "flow": false
  },
  {
    "from": "SNL:WGT-KFS-02",
    "to": "WGT-KFS-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:WGT-KFS-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:WGT-KFS-03",
    "to": "KFS-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-4",
    "note": "Register position on KFS-01.",
    "flow": false
  },
  {
    "from": "SNL:WGT-KFS-03",
    "to": "WGT-KFS-03",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:WGT-KFS-03",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:WGT-KFS-04",
    "to": "KFS-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-4",
    "note": "Register position on KFS-01.",
    "flow": false
  },
  {
    "from": "SNL:WGT-KFS-04",
    "to": "WGT-KFS-04",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:WGT-KFS-04",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:WGT-KFS-01",
    "to": "KFS-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-4",
    "note": "Register position on KFS-01.",
    "flow": false
  },
  {
    "from": "SNL:WGT-KFS-01",
    "to": "WGT-KFS-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:WGT-KFS-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KFS-08",
    "to": "KFS-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-4",
    "note": "Register position on KFS-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KFS-08",
    "to": "PRS-KFS-08",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KFS-08",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KFS-09",
    "to": "KFS-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-4",
    "note": "Register position on KFS-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KFS-09",
    "to": "PRS-KFS-09",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KFS-09",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KFS-05",
    "to": "KFS-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-4",
    "note": "Register position on KFS-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KFS-05",
    "to": "PRS-KFS-05",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KFS-05",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:ELE-KFS-03",
    "to": "KFS-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-4",
    "note": "Register position on KFS-01.",
    "flow": false
  },
  {
    "from": "SNL:ELE-KFS-03",
    "to": "ELE-KFS-03",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:ELE-KFS-03",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:POS-KFS-01",
    "to": "KFS-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-5",
    "note": "Register position on KFS-01.",
    "flow": false
  },
  {
    "from": "SNL:POS-KFS-01",
    "to": "POS-KFS-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:POS-KFS-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:POS-KFS-02",
    "to": "KFS-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-5",
    "note": "Register position on KFS-01.",
    "flow": false
  },
  {
    "from": "SNL:POS-KFS-02",
    "to": "POS-KFS-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:POS-KFS-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KFS-01",
    "to": "KFS-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-5",
    "note": "Register position on KFS-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KFS-01",
    "to": "PRS-KFS-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KFS-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KFS-03",
    "to": "KFS-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-5",
    "note": "Register position on KFS-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KFS-03",
    "to": "PRS-KFS-03",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KFS-03",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:ELE-KFS-04",
    "to": "KFS-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-5",
    "note": "Register position on KFS-01.",
    "flow": false
  },
  {
    "from": "SNL:ELE-KFS-04",
    "to": "ELE-KFS-04",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:ELE-KFS-04",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:ELE-KFS-05",
    "to": "KFS-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-5",
    "note": "Register position on KFS-01.",
    "flow": false
  },
  {
    "from": "SNL:ELE-KFS-05",
    "to": "ELE-KFS-05",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:ELE-KFS-05",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:FLO-KFS-01",
    "to": "KFS-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-6",
    "note": "Register position on KFS-01.",
    "flow": false
  },
  {
    "from": "SNL:FLO-KFS-01",
    "to": "FLO-KFS-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:FLO-KFS-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:FLO-KFS-02",
    "to": "KFS-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-6",
    "note": "Register position on KFS-01.",
    "flow": false
  },
  {
    "from": "SNL:FLO-KFS-02",
    "to": "FLO-KFS-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:FLO-KFS-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KFS-02",
    "to": "KFS-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-6",
    "note": "Register position on KFS-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KFS-02",
    "to": "PRS-KFS-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KFS-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KFS-06",
    "to": "KFS-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-6",
    "note": "Register position on KFS-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KFS-06",
    "to": "PRS-KFS-06",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KFS-06",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KFS-04",
    "to": "KFS-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-6",
    "note": "Register position on KFS-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KFS-04",
    "to": "PRS-KFS-04",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KFS-04",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:ELE-KFS-06",
    "to": "KFS-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-6",
    "note": "Register position on KFS-01.",
    "flow": false
  },
  {
    "from": "SNL:ELE-KFS-06",
    "to": "ELE-KFS-06",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:ELE-KFS-06",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:LEV-KFS-04",
    "to": "KFS-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-7",
    "note": "Register position on KFS-01.",
    "flow": false
  },
  {
    "from": "SNL:LEV-KFS-04",
    "to": "LEV-KFS-04",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:LEV-KFS-04",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:LIM-KFS-01",
    "to": "KFS-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-7",
    "note": "Register position on KFS-01.",
    "flow": false
  },
  {
    "from": "SNL:LIM-KFS-01",
    "to": "LIM-KFS-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:LIM-KFS-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:SPD-KFS-01",
    "to": "KFS-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-7",
    "note": "Register position on KFS-01.",
    "flow": false
  },
  {
    "from": "SNL:SPD-KFS-01",
    "to": "SPD-KFS-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:SPD-KFS-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:VIB-KFS-01",
    "to": "KFS-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-7",
    "note": "Register position on KFS-01.",
    "flow": false
  },
  {
    "from": "SNL:VIB-KFS-01",
    "to": "VIB-KFS-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:VIB-KFS-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:VIB-KFS-04",
    "to": "KFS-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-7",
    "note": "Register position on KFS-01.",
    "flow": false
  },
  {
    "from": "SNL:VIB-KFS-04",
    "to": "VIB-KFS-04",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:VIB-KFS-04",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KFS-01",
    "to": "KFS-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-7",
    "note": "Register position on KFS-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KFS-01",
    "to": "TMP-KFS-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KFS-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KFS-03",
    "to": "KFS-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-7",
    "note": "Register position on KFS-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KFS-03",
    "to": "TMP-KFS-03",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KFS-03",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KFS-02",
    "to": "KFS-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-7",
    "note": "Register position on KFS-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KFS-02",
    "to": "TMP-KFS-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KFS-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:ELE-KFS-01",
    "to": "KFS-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-7",
    "note": "Register position on KFS-01.",
    "flow": false
  },
  {
    "from": "SNL:ELE-KFS-01",
    "to": "ELE-KFS-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:ELE-KFS-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KFS-07",
    "to": "KFS-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-7",
    "note": "Register position on KFS-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KFS-07",
    "to": "PRS-KFS-07",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KFS-07",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:ELE-KFS-07",
    "to": "KFS-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-7",
    "note": "Register position on KFS-01.",
    "flow": false
  },
  {
    "from": "SNL:ELE-KFS-07",
    "to": "ELE-KFS-07",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:ELE-KFS-07",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:SPD-KFS-02",
    "to": "KFS-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-7",
    "note": "Register position on KFS-01.",
    "flow": false
  },
  {
    "from": "SNL:SPD-KFS-02",
    "to": "SPD-KFS-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:SPD-KFS-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:SPD-KFS-03",
    "to": "KFS-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet F-7",
    "note": "Register position on KFS-01.",
    "flow": false
  },
  {
    "from": "SNL:SPD-KFS-03",
    "to": "SPD-KFS-03",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:SPD-KFS-03",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-01",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-1",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-01",
    "to": "PRS-PHC-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-01",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-1",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-01",
    "to": "TMP-PHC-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-11",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-2",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-11",
    "to": "PRS-PHC-11",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-11",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-21",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-2",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-21",
    "to": "TMP-PHC-21",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-21",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-02",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-1",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-02",
    "to": "PRS-PHC-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-02",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-1",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-02",
    "to": "TMP-PHC-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-12",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-2",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-12",
    "to": "PRS-PHC-12",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-12",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-22",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-2",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-22",
    "to": "TMP-PHC-22",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-22",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-03",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-1",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-03",
    "to": "PRS-PHC-03",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-03",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-03",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-1",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-03",
    "to": "TMP-PHC-03",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-03",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-13",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-2",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-13",
    "to": "PRS-PHC-13",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-13",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-23",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-2",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-23",
    "to": "TMP-PHC-23",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-23",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-04",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-1",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-04",
    "to": "PRS-PHC-04",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-04",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-04",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-1",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-04",
    "to": "TMP-PHC-04",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-04",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-14",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-2",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-14",
    "to": "PRS-PHC-14",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-14",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-24",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-2",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-24",
    "to": "TMP-PHC-24",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-24",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-05",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-1",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-05",
    "to": "PRS-PHC-05",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-05",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-05",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-1",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-05",
    "to": "TMP-PHC-05",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-05",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-15",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-2",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-15",
    "to": "PRS-PHC-15",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-15",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-25",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-2",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-25",
    "to": "TMP-PHC-25",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-25",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-06",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-1",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-06",
    "to": "PRS-PHC-06",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-06",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-06",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-1",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-06",
    "to": "TMP-PHC-06",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-06",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-16",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-2",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-16",
    "to": "PRS-PHC-16",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-16",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-26",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-2",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-26",
    "to": "TMP-PHC-26",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-26",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-30",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-3",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-30",
    "to": "TMP-PHC-30",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-30",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:GAS-PHC-01",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-3",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:GAS-PHC-01",
    "to": "GAS-PHC-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:GAS-PHC-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:GAS-PHC-02",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-3",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:GAS-PHC-02",
    "to": "GAS-PHC-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:GAS-PHC-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-08",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-5",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-08",
    "to": "TMP-PHC-08",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-08",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-10",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-5",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-10",
    "to": "PRS-PHC-10",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-10",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:GAS-PHC-03",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-5",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:GAS-PHC-03",
    "to": "GAS-PHC-03",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:GAS-PHC-03",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:GAS-PHC-04",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-5",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:GAS-PHC-04",
    "to": "GAS-PHC-04",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:GAS-PHC-04",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:POS-PHC-02",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-5",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:POS-PHC-02",
    "to": "POS-PHC-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:POS-PHC-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-07",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-2",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-07",
    "to": "TMP-PHC-07",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-07",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:POS-PHC-03",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-3",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:POS-PHC-03",
    "to": "POS-PHC-03",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:POS-PHC-03",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:POS-PHC-04",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-3",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:POS-PHC-04",
    "to": "POS-PHC-04",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:POS-PHC-04",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:POS-PHC-05",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-3",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:POS-PHC-05",
    "to": "POS-PHC-05",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:POS-PHC-05",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-31",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-3",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-31",
    "to": "TMP-PHC-31",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-31",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:POS-PHC-01",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-3",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:POS-PHC-01",
    "to": "POS-PHC-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:POS-PHC-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:VIB-PHC-01",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-4",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:VIB-PHC-01",
    "to": "VIB-PHC-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:VIB-PHC-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:VIB-PHC-02",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-4",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:VIB-PHC-02",
    "to": "VIB-PHC-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:VIB-PHC-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-09",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-4",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-09",
    "to": "TMP-PHC-09",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-09",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-10",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-4",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-10",
    "to": "TMP-PHC-10",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-10",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-11",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-4",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-11",
    "to": "TMP-PHC-11",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-11",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:ELE-PHC-01",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-4",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:ELE-PHC-01",
    "to": "ELE-PHC-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:ELE-PHC-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:SPD-PHC-01",
    "to": "PHC-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-4",
    "note": "Register position on PHC-01.",
    "flow": false
  },
  {
    "from": "SNL:SPD-PHC-01",
    "to": "SPD-PHC-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:SPD-PHC-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-BGH-02",
    "to": "BGH-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-1",
    "note": "Register position on BGH-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-BGH-02",
    "to": "PRS-BGH-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-BGH-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-BGH-03",
    "to": "BGH-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-1",
    "note": "Register position on BGH-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-BGH-03",
    "to": "PRS-BGH-03",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-BGH-03",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-BGH-01",
    "to": "BGH-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-1",
    "note": "Register position on BGH-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-BGH-01",
    "to": "PRS-BGH-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-BGH-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BGH-02",
    "to": "BGH-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-1",
    "note": "Register position on BGH-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BGH-02",
    "to": "TMP-BGH-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BGH-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:STS-BGH-01",
    "to": "BGH-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-1",
    "note": "Register position on BGH-01.",
    "flow": false
  },
  {
    "from": "SNL:STS-BGH-01",
    "to": "STS-BGH-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:STS-BGH-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:LEV-BGH-01",
    "to": "BGH-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-1",
    "note": "Register position on BGH-01.",
    "flow": false
  },
  {
    "from": "SNL:LEV-BGH-01",
    "to": "LEV-BGH-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:LEV-BGH-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:LEV-BGH-02",
    "to": "BGH-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-1",
    "note": "Register position on BGH-01.",
    "flow": false
  },
  {
    "from": "SNL:LEV-BGH-02",
    "to": "LEV-BGH-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:LEV-BGH-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:LEV-BGH-03",
    "to": "BGH-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-1",
    "note": "Register position on BGH-01.",
    "flow": false
  },
  {
    "from": "SNL:LEV-BGH-03",
    "to": "LEV-BGH-03",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:LEV-BGH-03",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:SPD-BGH-02",
    "to": "BGH-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-1",
    "note": "Register position on BGH-01.",
    "flow": false
  },
  {
    "from": "SNL:SPD-BGH-02",
    "to": "SPD-BGH-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:SPD-BGH-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:SPD-BGH-03",
    "to": "BGH-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-1",
    "note": "Register position on BGH-01.",
    "flow": false
  },
  {
    "from": "SNL:SPD-BGH-03",
    "to": "SPD-BGH-03",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:SPD-BGH-03",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:SPD-BGH-04",
    "to": "BGH-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-1",
    "note": "Register position on BGH-01.",
    "flow": false
  },
  {
    "from": "SNL:SPD-BGH-04",
    "to": "SPD-BGH-04",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:SPD-BGH-04",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:VIB-BGH-01",
    "to": "BGH-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-2",
    "note": "Register position on BGH-01.",
    "flow": false
  },
  {
    "from": "SNL:VIB-BGH-01",
    "to": "VIB-BGH-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:VIB-BGH-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BGH-01",
    "to": "BGH-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-2",
    "note": "Register position on BGH-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BGH-01",
    "to": "TMP-BGH-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BGH-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BGH-03",
    "to": "BGH-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-2",
    "note": "Register position on BGH-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BGH-03",
    "to": "TMP-BGH-03",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BGH-03",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:ELE-BGH-01",
    "to": "BGH-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-2",
    "note": "Register position on BGH-01.",
    "flow": false
  },
  {
    "from": "SNL:ELE-BGH-01",
    "to": "ELE-BGH-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:ELE-BGH-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:SPD-BGH-01",
    "to": "BGH-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-2",
    "note": "Register position on BGH-01.",
    "flow": false
  },
  {
    "from": "SNL:SPD-BGH-01",
    "to": "SPD-BGH-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:SPD-BGH-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:GAS-BGH-01",
    "to": "BGH-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-1",
    "note": "Register position on BGH-01.",
    "flow": false
  },
  {
    "from": "SNL:GAS-BGH-01",
    "to": "GAS-BGH-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:GAS-BGH-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:GAS-BGH-02",
    "to": "BGH-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-1",
    "note": "Register position on BGH-01.",
    "flow": false
  },
  {
    "from": "SNL:GAS-BGH-02",
    "to": "GAS-BGH-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:GAS-BGH-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:GAS-BGH-03",
    "to": "BGH-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-1",
    "note": "Register position on BGH-01.",
    "flow": false
  },
  {
    "from": "SNL:GAS-BGH-03",
    "to": "GAS-BGH-03",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:GAS-BGH-03",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:GAS-BGH-04",
    "to": "BGH-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-1",
    "note": "Register position on BGH-01.",
    "flow": false
  },
  {
    "from": "SNL:GAS-BGH-04",
    "to": "GAS-BGH-04",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:GAS-BGH-04",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:GAS-BGH-05",
    "to": "BGH-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet G-1",
    "note": "Register position on BGH-01.",
    "flow": false
  },
  {
    "from": "SNL:GAS-BGH-05",
    "to": "GAS-BGH-05",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:GAS-BGH-05",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-13",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-1",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-13",
    "to": "TMP-KLN-13",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-13",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KLN-01",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-1",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KLN-01",
    "to": "PRS-KLN-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KLN-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:GAS-KLN-01",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-1",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:GAS-KLN-01",
    "to": "GAS-KLN-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:GAS-KLN-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:GAS-KLN-02",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-1",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:GAS-KLN-02",
    "to": "GAS-KLN-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:GAS-KLN-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:GAS-KLN-03",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-1",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:GAS-KLN-03",
    "to": "GAS-KLN-03",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:GAS-KLN-03",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:STS-KLN-06",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-1",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:STS-KLN-06",
    "to": "STS-KLN-06",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:STS-KLN-06",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:VIB-KLN-01",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:VIB-KLN-01",
    "to": "VIB-KLN-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:VIB-KLN-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:VIB-KLN-05",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:VIB-KLN-05",
    "to": "VIB-KLN-05",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:VIB-KLN-05",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-19",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-19",
    "to": "TMP-KLN-19",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-19",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-20",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-20",
    "to": "TMP-KLN-20",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-20",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-41",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-41",
    "to": "TMP-KLN-41",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-41",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-42",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-42",
    "to": "TMP-KLN-42",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-42",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-43",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-43",
    "to": "TMP-KLN-43",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-43",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-44",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-44",
    "to": "TMP-KLN-44",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-44",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-45",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-45",
    "to": "TMP-KLN-45",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-45",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-46",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-46",
    "to": "TMP-KLN-46",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-46",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:STS-KLN-14",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:STS-KLN-14",
    "to": "STS-KLN-14",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:STS-KLN-14",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:STS-KLN-12",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:STS-KLN-12",
    "to": "STS-KLN-12",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:STS-KLN-12",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:ELE-KLN-01",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:ELE-KLN-01",
    "to": "ELE-KLN-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:ELE-KLN-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:SPD-KLN-01",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:SPD-KLN-01",
    "to": "SPD-KLN-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:SPD-KLN-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:VIB-KLN-02",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:VIB-KLN-02",
    "to": "VIB-KLN-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:VIB-KLN-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:VIB-KLN-03",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:VIB-KLN-03",
    "to": "VIB-KLN-03",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:VIB-KLN-03",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:VIB-KLN-04",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:VIB-KLN-04",
    "to": "VIB-KLN-04",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:VIB-KLN-04",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-22",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-22",
    "to": "TMP-KLN-22",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-22",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-23",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-2",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-23",
    "to": "TMP-KLN-23",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-23",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KLN-04",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-4",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KLN-04",
    "to": "PRS-KLN-04",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KLN-04",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-15",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-4",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-15",
    "to": "TMP-KLN-15",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-15",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KLN-05",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-4",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KLN-05",
    "to": "PRS-KLN-05",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KLN-05",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:FLO-KLN-05",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-4",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:FLO-KLN-05",
    "to": "FLO-KLN-05",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:FLO-KLN-05",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:LEV-KLN-01",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-4",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:LEV-KLN-01",
    "to": "LEV-KLN-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:LEV-KLN-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:LAB-KLN-01",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-4",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:LAB-KLN-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:STS-KLN-05",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-5",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:STS-KLN-05",
    "to": "STS-KLN-05",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:STS-KLN-05",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRX-KLN-01",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-5",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:PRX-KLN-01",
    "to": "PRX-KLN-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRX-KLN-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRX-KLN-02",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-5",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:PRX-KLN-02",
    "to": "PRX-KLN-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRX-KLN-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRX-KLN-03",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-5",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:PRX-KLN-03",
    "to": "PRX-KLN-03",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRX-KLN-03",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRX-KLN-04",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-5",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:PRX-KLN-04",
    "to": "PRX-KLN-04",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRX-KLN-04",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRX-KLN-05",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-5",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:PRX-KLN-05",
    "to": "PRX-KLN-05",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRX-KLN-05",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRX-KLN-06",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-5",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:PRX-KLN-06",
    "to": "PRX-KLN-06",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRX-KLN-06",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:STS-KLN-11",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-3",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:STS-KLN-11",
    "to": "STS-KLN-11",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:STS-KLN-11",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:LIM-KLN-01",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-3",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:LIM-KLN-01",
    "to": "LIM-KLN-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:LIM-KLN-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:MIG-KLN-01",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:MIG-KLN-01",
    "to": "MIG-KLN-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:MIG-KLN-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:MIG-KLN-02",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:MIG-KLN-02",
    "to": "MIG-KLN-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:MIG-KLN-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:MIG-KLN-03",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:MIG-KLN-03",
    "to": "MIG-KLN-03",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:MIG-KLN-03",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-28",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-28",
    "to": "TMP-KLN-28",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-28",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-29",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-29",
    "to": "TMP-KLN-29",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-29",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-30",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-30",
    "to": "TMP-KLN-30",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-30",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-01",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-01",
    "to": "TMP-KLN-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-02",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-02",
    "to": "TMP-KLN-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-03",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-03",
    "to": "TMP-KLN-03",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-03",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-04",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-04",
    "to": "TMP-KLN-04",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-04",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-05",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-05",
    "to": "TMP-KLN-05",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-05",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-06",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-06",
    "to": "TMP-KLN-06",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-06",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-07",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-07",
    "to": "TMP-KLN-07",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-07",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-08",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-08",
    "to": "TMP-KLN-08",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-08",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-09",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-09",
    "to": "TMP-KLN-09",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-09",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-10",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-10",
    "to": "TMP-KLN-10",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-10",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-11",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-11",
    "to": "TMP-KLN-11",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-11",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-12",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-6",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-12",
    "to": "TMP-KLN-12",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-12",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:POS-KLN-01",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-7",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:POS-KLN-01",
    "to": "POS-KLN-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:POS-KLN-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KLN-07",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-7",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KLN-07",
    "to": "PRS-KLN-07",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KLN-07",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:POS-KLN-02",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-7",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:POS-KLN-02",
    "to": "POS-KLN-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:POS-KLN-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:STS-KLN-08",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-8",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:STS-KLN-08",
    "to": "STS-KLN-08",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:STS-KLN-08",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:MAN-KLN-01",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-8",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:MAN-KLN-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:STS-KLN-13",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-8",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:STS-KLN-13",
    "to": "STS-KLN-13",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:STS-KLN-13",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-26",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-9",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-26",
    "to": "TMP-KLN-26",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-26",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-25",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-9",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-25",
    "to": "TMP-KLN-25",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-25",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-14",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-9",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-14",
    "to": "TMP-KLN-14",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-14",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-27",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-9",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-27",
    "to": "TMP-KLN-27",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-27",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KLN-03",
    "to": "KLN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet K-9",
    "note": "Register position on KLN-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KLN-03",
    "to": "PRS-KLN-03",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KLN-03",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:CAM-BRN-01",
    "to": "BRN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-1",
    "note": "Register position on BRN-01.",
    "flow": false
  },
  {
    "from": "SNL:CAM-BRN-01",
    "to": "CAM-BRN-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:CAM-BRN-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BRN-02",
    "to": "BRN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-1",
    "note": "Register position on BRN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BRN-02",
    "to": "TMP-BRN-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BRN-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-BRN-03",
    "to": "BRN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-1",
    "note": "Register position on BRN-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-BRN-03",
    "to": "PRS-BRN-03",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-BRN-03",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-BRN-02",
    "to": "BRN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-1",
    "note": "Register position on BRN-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-BRN-02",
    "to": "PRS-BRN-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-BRN-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-BRN-04",
    "to": "BRN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-4",
    "note": "Register position on BRN-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-BRN-04",
    "to": "PRS-BRN-04",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-BRN-04",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:FLO-BRN-01",
    "to": "BRN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-3",
    "note": "Register position on BRN-01.",
    "flow": false
  },
  {
    "from": "SNL:FLO-BRN-01",
    "to": "FLO-BRN-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:FLO-BRN-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-BRN-01",
    "to": "BRN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-1",
    "note": "Register position on BRN-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-BRN-01",
    "to": "PRS-BRN-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-BRN-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:VIB-BRN-01",
    "to": "BRN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-2",
    "note": "Register position on BRN-01.",
    "flow": false
  },
  {
    "from": "SNL:VIB-BRN-01",
    "to": "VIB-BRN-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:VIB-BRN-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BRN-01",
    "to": "BRN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-2",
    "note": "Register position on BRN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BRN-01",
    "to": "TMP-BRN-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BRN-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BRN-05",
    "to": "BRN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-2",
    "note": "Register position on BRN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BRN-05",
    "to": "TMP-BRN-05",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BRN-05",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:ELE-BRN-01",
    "to": "BRN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-2",
    "note": "Register position on BRN-01.",
    "flow": false
  },
  {
    "from": "SNL:ELE-BRN-01",
    "to": "ELE-BRN-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:ELE-BRN-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:LEV-BRN-01",
    "to": "BRN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-3",
    "note": "Register position on BRN-01.",
    "flow": false
  },
  {
    "from": "SNL:LEV-BRN-01",
    "to": "LEV-BRN-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:LEV-BRN-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BRN-04",
    "to": "BRN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-3",
    "note": "Register position on BRN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BRN-04",
    "to": "TMP-BRN-04",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BRN-04",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:GAS-BRN-01",
    "to": "BRN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-3",
    "note": "Register position on BRN-01.",
    "flow": false
  },
  {
    "from": "SNL:GAS-BRN-01",
    "to": "GAS-BRN-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:GAS-BRN-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:STS-BRN-02",
    "to": "BRN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-3",
    "note": "Register position on BRN-01.",
    "flow": false
  },
  {
    "from": "SNL:STS-BRN-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:STS-BRN-01",
    "to": "BRN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-3",
    "note": "Register position on BRN-01.",
    "flow": false
  },
  {
    "from": "SNL:STS-BRN-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:ELE-BRN-03",
    "to": "BRN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-3",
    "note": "Register position on BRN-01.",
    "flow": false
  },
  {
    "from": "SNL:ELE-BRN-03",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:FLO-BRN-02",
    "to": "BRN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-5",
    "note": "Register position on BRN-01.",
    "flow": false
  },
  {
    "from": "SNL:FLO-BRN-02",
    "to": "FLO-BRN-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:FLO-BRN-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:VIB-BRN-02",
    "to": "BRN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-4",
    "note": "Register position on BRN-01.",
    "flow": false
  },
  {
    "from": "SNL:VIB-BRN-02",
    "to": "VIB-BRN-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:VIB-BRN-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BRN-06",
    "to": "BRN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-4",
    "note": "Register position on BRN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BRN-06",
    "to": "TMP-BRN-06",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BRN-06",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:ELE-BRN-02",
    "to": "BRN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet B-4",
    "note": "Register position on BRN-01.",
    "flow": false
  },
  {
    "from": "SNL:ELE-BRN-02",
    "to": "ELE-BRN-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:ELE-BRN-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BRN-03",
    "to": "BRN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-5",
    "note": "Register position on BRN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BRN-03",
    "to": "TMP-BRN-03",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BRN-03",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BRN-07",
    "to": "BRN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-5",
    "note": "Register position on BRN-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BRN-07",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-BRN-05",
    "to": "BRN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-5",
    "note": "Register position on BRN-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-BRN-05",
    "to": "PRS-BRN-05",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-BRN-05",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-BRN-06",
    "to": "BRN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-5",
    "note": "Register position on BRN-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-BRN-06",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:POS-BRN-01",
    "to": "BRN-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet P-5",
    "note": "Register position on BRN-01.",
    "flow": false
  },
  {
    "from": "SNL:POS-BRN-01",
    "to": "POS-BRN-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:POS-BRN-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:SPD-CLR-11",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-4",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:SPD-CLR-11",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:SPD-CLR-12",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-4",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:SPD-CLR-12",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:SPD-CLR-13",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-4",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:SPD-CLR-13",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:VIB-CLR-11",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-4",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:VIB-CLR-11",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:VIB-CLR-12",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-4",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:VIB-CLR-12",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:VIB-CLR-13",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-4",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:VIB-CLR-13",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-31",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-4",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-31",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-32",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-4",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-32",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-33",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-4",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-33",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:ELE-CLR-11",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-4",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:ELE-CLR-11",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:ELE-CLR-12",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-4",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:ELE-CLR-12",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:ELE-CLR-13",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-4",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:ELE-CLR-13",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-CLR-01",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-1",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-CLR-01",
    "to": "PRS-CLR-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-CLR-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-CLR-02",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-1",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-CLR-02",
    "to": "PRS-CLR-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-CLR-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-CLR-03",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-1",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-CLR-03",
    "to": "PRS-CLR-03",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-CLR-03",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-CLR-04",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-1",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-CLR-04",
    "to": "PRS-CLR-04",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-CLR-04",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-CLR-05",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-1",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-CLR-05",
    "to": "PRS-CLR-05",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-CLR-05",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-CLR-06",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-1",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-CLR-06",
    "to": "PRS-CLR-06",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:PRS-CLR-06",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:VIB-CLR-01",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-2",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:VIB-CLR-01",
    "to": "VIB-CLR-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:VIB-CLR-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:VIB-CLR-02",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-2",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:VIB-CLR-02",
    "to": "VIB-CLR-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:VIB-CLR-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:VIB-CLR-03",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-2",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:VIB-CLR-03",
    "to": "VIB-CLR-03",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:VIB-CLR-03",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:VIB-CLR-04",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-3",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:VIB-CLR-04",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:VIB-CLR-05",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-3",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:VIB-CLR-05",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:VIB-CLR-06",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-3",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:VIB-CLR-06",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-01",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-2",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-01",
    "to": "TMP-CLR-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-02",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-2",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-02",
    "to": "TMP-CLR-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-03",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-2",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-03",
    "to": "TMP-CLR-03",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-03",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-04",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-3",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-04",
    "to": "TMP-CLR-04",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-04",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-05",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-3",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-05",
    "to": "TMP-CLR-05",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-05",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-06",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-3",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-06",
    "to": "TMP-CLR-06",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-06",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-17",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-2",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-17",
    "to": "TMP-CLR-17",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-17",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-18",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-2",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-18",
    "to": "TMP-CLR-18",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-18",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-19",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-2",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-19",
    "to": "TMP-CLR-19",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-19",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-20",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-3",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-20",
    "to": "TMP-CLR-20",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-20",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-21",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-3",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-21",
    "to": "TMP-CLR-21",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-21",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-22",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-3",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-22",
    "to": "TMP-CLR-22",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-22",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:ELE-CLR-01",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-2",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:ELE-CLR-01",
    "to": "ELE-CLR-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:ELE-CLR-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:ELE-CLR-02",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-2",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:ELE-CLR-02",
    "to": "ELE-CLR-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:ELE-CLR-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:ELE-CLR-03",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-2",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:ELE-CLR-03",
    "to": "ELE-CLR-03",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:ELE-CLR-03",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:ELE-CLR-04",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-3",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:ELE-CLR-04",
    "to": "ELE-CLR-04",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:ELE-CLR-04",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:ELE-CLR-05",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-3",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:ELE-CLR-05",
    "to": "ELE-CLR-05",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:ELE-CLR-05",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:ELE-CLR-06",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-3",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:ELE-CLR-06",
    "to": "ELE-CLR-06",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:ELE-CLR-06",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:SPD-CLR-01",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-2",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:SPD-CLR-01",
    "to": "SPD-CLR-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:SPD-CLR-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:SPD-CLR-02",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-2",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:SPD-CLR-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:SPD-CLR-03",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-2",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:SPD-CLR-03",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:SPD-CLR-04",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-3",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:SPD-CLR-04",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:SPD-CLR-05",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-3",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:SPD-CLR-05",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:SPD-CLR-06",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-3",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:SPD-CLR-06",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-09",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-5",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-09",
    "to": "TMP-CLR-09",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-09",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-24",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-5",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-24",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-CLR-21",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-5",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-CLR-21",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-CLR-22",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-5",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-CLR-22",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:PRS-CLR-20",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-5",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:PRS-CLR-20",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:VIB-CLR-07",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-5",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:VIB-CLR-07",
    "to": "VIB-CLR-07",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:VIB-CLR-07",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-10",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-5",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-10",
    "to": "TMP-CLR-10",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-10",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-23",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-5",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-23",
    "to": "TMP-CLR-23",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-23",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:ELE-CLR-07",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-5",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:ELE-CLR-07",
    "to": "ELE-CLR-07",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:ELE-CLR-07",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-25",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-5",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-25",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-08",
    "to": "CLR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet C-5",
    "note": "Register position on CLR-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-08",
    "to": "TMP-CLR-08",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-08",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:VIB-HMR-03",
    "to": "HMR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet H-1",
    "note": "Register position on HMR-01.",
    "flow": false
  },
  {
    "from": "SNL:VIB-HMR-03",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:VIB-HMR-04",
    "to": "HMR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet H-1",
    "note": "Register position on HMR-01.",
    "flow": false
  },
  {
    "from": "SNL:VIB-HMR-04",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-HMR-04",
    "to": "HMR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet H-1",
    "note": "Register position on HMR-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-HMR-04",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-HMR-05",
    "to": "HMR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet H-1",
    "note": "Register position on HMR-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-HMR-05",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-HMR-03",
    "to": "HMR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet H-1",
    "note": "Register position on HMR-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-HMR-03",
    "to": "TMP-HMR-03",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-HMR-03",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:ELE-HMR-01",
    "to": "HMR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet H-1",
    "note": "Register position on HMR-01.",
    "flow": false
  },
  {
    "from": "SNL:ELE-HMR-01",
    "to": "ELE-HMR-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:ELE-HMR-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-HMR-06",
    "to": "HMR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet H-1",
    "note": "Register position on HMR-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-HMR-06",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:VIB-HMR-01",
    "to": "HMR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet H-1",
    "note": "Register position on HMR-01.",
    "flow": false
  },
  {
    "from": "SNL:VIB-HMR-01",
    "to": "VIB-HMR-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:VIB-HMR-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:VIB-HMR-02",
    "to": "HMR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet H-1",
    "note": "Register position on HMR-01.",
    "flow": false
  },
  {
    "from": "SNL:VIB-HMR-02",
    "to": "VIB-HMR-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:VIB-HMR-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-HMR-01",
    "to": "HMR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet H-1",
    "note": "Register position on HMR-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-HMR-01",
    "to": "TMP-HMR-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-HMR-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:TMP-HMR-02",
    "to": "HMR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet H-1",
    "note": "Register position on HMR-01.",
    "flow": false
  },
  {
    "from": "SNL:TMP-HMR-02",
    "to": "TMP-HMR-02",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:TMP-HMR-02",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "SNL:SPD-HMR-01",
    "to": "HMR-01",
    "type": "registers_for",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02, Sheet H-1",
    "note": "Register position on HMR-01.",
    "flow": false
  },
  {
    "from": "SNL:SPD-HMR-01",
    "to": "SPD-HMR-01",
    "type": "verified_cross_reference",
    "evidence": "D4 & SNL Schedules",
    "note": "Matches tag in D4 online schedule.",
    "flow": false
  },
  {
    "from": "SNL:SPD-HMR-01",
    "to": "SNL",
    "type": "listed_in",
    "evidence": "OSW-PE-SNL-PYR-01 Rev. 02",
    "note": "Published in revised sensor register.",
    "flow": false
  },
  {
    "from": "GEN-001",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.1",
    "note": "Maintenance checklist task for Asset identification / tag plates.",
    "flow": false
  },
  {
    "from": "GEN-001",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-002",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.1",
    "note": "Maintenance checklist task for Fixed guards / inspection barriers.",
    "flow": false
  },
  {
    "from": "GEN-002",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-003",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.1",
    "note": "Maintenance checklist task for Rotating-coupling and shaft guards.",
    "flow": false
  },
  {
    "from": "GEN-003",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-004",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.1",
    "note": "Maintenance checklist task for Equipment anchor bolts / grout.",
    "flow": false
  },
  {
    "from": "GEN-004",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-005",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.1",
    "note": "Maintenance checklist task for Support frames / baseplates / brackets.",
    "flow": false
  },
  {
    "from": "GEN-005",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-006",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.1",
    "note": "Maintenance checklist task for Platforms / stairs / toe plates / handrails.",
    "flow": false
  },
  {
    "from": "GEN-006",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-007",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.1",
    "note": "Maintenance checklist task for Access doors / manways / sight ports.",
    "flow": false
  },
  {
    "from": "GEN-007",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-008",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.1",
    "note": "Maintenance checklist task for Thermal insulation / cladding.",
    "flow": false
  },
  {
    "from": "GEN-008",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-009",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.1",
    "note": "Maintenance checklist task for Equipment earthing / bonding.",
    "flow": false
  },
  {
    "from": "GEN-009",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-010",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.1",
    "note": "Maintenance checklist task for Emergency stops / local pull cords.",
    "flow": false
  },
  {
    "from": "GEN-010",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-011",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.1",
    "note": "Maintenance checklist task for LOTO points / isolators / local switches.",
    "flow": false
  },
  {
    "from": "GEN-011",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-012",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.1",
    "note": "Maintenance checklist task for Oil / coal / dust spill collection.",
    "flow": false
  },
  {
    "from": "GEN-012",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-013",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.1",
    "note": "Maintenance checklist task for Pipe / duct supports and sliding guides.",
    "flow": false
  },
  {
    "from": "GEN-013",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-014",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.1",
    "note": "Maintenance checklist task for Maintenance access / lifting lugs.",
    "flow": false
  },
  {
    "from": "GEN-014",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-015",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.1",
    "note": "Maintenance checklist task for Fasteners / locking devices.",
    "flow": false
  },
  {
    "from": "GEN-015",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-016",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.1",
    "note": "Maintenance checklist task for Cable trays / conduits / glands.",
    "flow": false
  },
  {
    "from": "GEN-016",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-017",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.1",
    "note": "Maintenance checklist task for Fire protection and escape access.",
    "flow": false
  },
  {
    "from": "GEN-017",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-018",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.2",
    "note": "Maintenance checklist task for Isolation valves (ball / gate / butterfly).",
    "flow": false
  },
  {
    "from": "GEN-018",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-019",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.2",
    "note": "Maintenance checklist task for Knife / slide / flap valves.",
    "flow": false
  },
  {
    "from": "GEN-019",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-020",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.2",
    "note": "Maintenance checklist task for Check / non-return valves.",
    "flow": false
  },
  {
    "from": "GEN-020",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-021",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.2",
    "note": "Maintenance checklist task for Solenoid / pneumatically actuated valves.",
    "flow": false
  },
  {
    "from": "GEN-021",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-022",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.2",
    "note": "Maintenance checklist task for Pressure relief / safety valves.",
    "flow": false
  },
  {
    "from": "GEN-022",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-023",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.2",
    "note": "Maintenance checklist task for Pressure regulator / FRL units.",
    "flow": false
  },
  {
    "from": "GEN-023",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-024",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.2",
    "note": "Maintenance checklist task for Manual drains / vents / bleed fittings.",
    "flow": false
  },
  {
    "from": "GEN-024",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-025",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.2",
    "note": "Maintenance checklist task for Flanged joints / pipe gaskets.",
    "flow": false
  },
  {
    "from": "GEN-025",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-026",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.2",
    "note": "Maintenance checklist task for Threaded fittings / union nuts.",
    "flow": false
  },
  {
    "from": "GEN-026",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-027",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.2",
    "note": "Maintenance checklist task for Flexible hoses / couplers.",
    "flow": false
  },
  {
    "from": "GEN-027",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-028",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.2",
    "note": "Maintenance checklist task for Expansion joints / bellows / fabric connectors.",
    "flow": false
  },
  {
    "from": "GEN-028",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-030",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.2",
    "note": "Maintenance checklist task for Valve handles, travel indicators and asset labels.",
    "flow": false
  },
  {
    "from": "GEN-030",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-032",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.2",
    "note": "Maintenance checklist task for Air / dust / oil pipe clamps and guides.",
    "flow": false
  },
  {
    "from": "GEN-032",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-045",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.3",
    "note": "Maintenance checklist task for Power supply / network gateway / switch / UPS.",
    "flow": false
  },
  {
    "from": "GEN-045",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-046",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.3",
    "note": "Maintenance checklist task for PLCs/SIS protection boundary.",
    "flow": false
  },
  {
    "from": "GEN-046",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-048",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.4",
    "note": "Maintenance checklist task for Master valve and flange census.",
    "flow": false
  },
  {
    "from": "GEN-048",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-049",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.4",
    "note": "Maintenance checklist task for Bolting, stud material and gasket compatibility.",
    "flow": false
  },
  {
    "from": "GEN-049",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-050",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.4",
    "note": "Maintenance checklist task for Actuator diaphragm, solenoid- valve body and pneumatic tubing.",
    "flow": false
  },
  {
    "from": "GEN-050",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-051",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.4",
    "note": "Maintenance checklist task for Duct and pipe temporary blanks / spectacles.",
    "flow": false
  },
  {
    "from": "GEN-051",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-053",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.4",
    "note": "Maintenance checklist task for Flexible expansion-joint restraint rods and guides.",
    "flow": false
  },
  {
    "from": "GEN-053",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-054",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.4",
    "note": "Maintenance checklist task for Rotating bearings - grease drains, vents and labyrinths.",
    "flow": false
  },
  {
    "from": "GEN-054",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-055",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.4",
    "note": "Maintenance checklist task for Rotating fans - shaft seal and drain nipples.",
    "flow": false
  },
  {
    "from": "GEN-055",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-056",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.4",
    "note": "Maintenance checklist task for Service-air header drains, strainers and filters.",
    "flow": false
  },
  {
    "from": "GEN-056",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "GEN-057",
    "to": "KLN-01",
    "type": "maintains",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05, Group 2.4",
    "note": "Maintenance checklist task for Thrust/support-roller oil bath sight glasses and breathers.",
    "flow": false
  },
  {
    "from": "GEN-057",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "FSL-001",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "FSL-002",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "FSL-003",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "FSL-004",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "FSL-006",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "FSL-007",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "FSL-008",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "FSL-010",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "FSL-011",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "FSL-012",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "FSL-013",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "FSL-014",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "FSL-015",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "FSL-017",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "FSL-018",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "FSL-019",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "FSL-020",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "FSL-021",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "FSL-022",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "FSL-023",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "FSL-024",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "FSL-025",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "FSL-026",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "FSL-027",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "FSL-028",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "FSL-029",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "FSL-030",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KFS-001",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KFS-005",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KFS-006",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KFS-007",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KFS-008",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KFS-009",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KFS-010",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KFS-011",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KFS-012",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KFS-013",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KFS-014",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KFS-015",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KFS-016",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KFS-017",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KFS-021",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KFS-022",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KFS-023",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KFS-024",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KFS-025",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KFS-026",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KFS-027",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KFS-028",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KFS-029",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KFS-030",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KFS-031",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KFS-033",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KFS-034",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KFS-035",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KFS-036",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KFS-037",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KFS-038",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KFS-039",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KFS-040",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-001",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-002",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-003",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-004",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-006",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-007",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-008",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-009",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-010",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-012",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-013",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-014",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-015",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-016",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-018",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-019",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-020",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-021",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-022",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-024",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-025",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-026",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-027",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-028",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-030",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-031",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-032",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-033",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-034",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-036",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-038",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-039",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-040",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-041",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-042",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-043",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-044",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-045",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-046",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-064",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-050",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-051",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-052",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-053",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-054",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-055",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-056",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-057",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-058",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-059",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-060",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-061",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-062",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "PHC-063",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-001",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-002",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-003",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-004",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-005",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-006",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-007",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-008",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-009",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-010",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-011",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-012",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-014",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-015",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-016",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-017",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-018",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-019",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-020",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-021",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-022",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-023",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-024",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-025",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-026",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-027",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-028",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-030",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-031",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-032",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-035",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-036",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-037",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-038",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-039",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-040",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-041",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-042",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-043",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-044",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-045",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-046",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-047",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-048",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-049",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-050",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-051",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-053",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-054",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-055",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-056",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-057",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-062",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-063",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-064",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-065",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-066",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-067",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-068",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-069",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-070",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-071",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-072",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-073",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-074",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-075",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-076",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-077",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-078",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-079",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-080",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-183",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-082",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-084",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-086",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-087",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-088",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-089",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-090",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-091",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-092",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-093",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-094",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-095",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-097",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-098",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-099",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-100",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-101",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-102",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-103",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-104",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-105",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-106",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-111",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-112",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-113",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-114",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-115",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-116",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-117",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-118",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-119",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-120",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-121",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-122",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-123",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-124",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-125",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-126",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-127",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-128",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-129",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-130",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-132",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-135",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-136",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-137",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-138",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-139",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-140",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-141",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-142",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-143",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-144",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-145",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-146",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-147",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-148",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-149",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-150",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-151",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-152",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-153",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-154",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-155",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-156",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-157",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-158",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-159",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-160",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-161",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-162",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-163",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-167",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-168",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-169",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-170",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-171",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-172",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-173",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-174",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-175",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-176",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-177",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-178",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-179",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-180",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-181",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "EXH-182",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-001",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-002",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-003",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-004",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-005",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-010",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-011",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-012",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-013",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-014",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-017",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-018",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-019",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-020",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-021",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-022",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-116",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-023",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-024",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-025",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-026",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-027",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-028",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-029",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-031",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-032",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-033",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-034",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-035",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-036",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-037",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-039",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-040",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-041",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-042",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-043",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-044",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-045",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-047",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-048",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-049",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-050",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-051",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-052",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-053",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-054",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-055",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-056",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-057",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-058",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-059",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-060",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-061",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-062",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-114",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-115",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-117",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-064",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-065",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-066",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-067",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-069",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-070",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-071",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-072",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-075",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-076",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-077",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-078",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-079",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-080",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-082",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-083",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-084",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-085",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-086",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-087",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-088",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-089",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-090",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-091",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-092",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-093",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-094",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-095",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-096",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-097",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-100",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-101",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-102",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-103",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-104",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-105",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-106",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-110",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-111",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-112",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "KLN-113",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "BRN-001",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "BRN-002",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "BRN-003",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "BRN-004",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "BRN-005",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "BRN-006",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "BRN-007",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "BRN-008",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "BRN-009",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "BRN-010",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "BRN-011",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "BRN-015",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "BRN-019",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "BRN-020",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "BRN-021",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "BRN-023",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "BRN-025",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "BRN-026",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "BRN-027",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "BRN-028",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "BRN-029",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "BRN-030",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "BRN-031",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "BRN-032",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "BRN-033",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "BRN-034",
    "to": "MNT",
    "type": "checklist_item",
    "evidence": "OSW-PE-MNT-PYR-01 Rev. 05",
    "note": "Task documented in plant maintenance register.",
    "flow": false
  },
  {
    "from": "D04",
    "to": "TMP-KLN-43",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "D06",
    "to": "SA-KLN-ROLLERS",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "D08",
    "to": "SNL:TMP-BRN-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "D11",
    "to": "SNL:VIB-HMR-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected HMR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SA-FSL-SILO",
    "to": "PRS-FSL-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected FSL-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SA-FSL-AERATION",
    "to": "SNL:POS-FSL-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected FSL-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SA-FSL-DC",
    "to": "LEV-FSL-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected FSL-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SA-KFS-DOSING",
    "to": "SNL:SPD-KFS-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SA-KFS-ELEVATOR",
    "to": "PRS-KFS-08",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SA-PHC-CYCLONES",
    "to": "SNL:PRS-PHC-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SA-PHC-CALCINER",
    "to": "SNL:TMP-PHC-23",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SA-PHC-IDFAN",
    "to": "SNL:TMP-PHC-24",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SA-KLN-DRIVE",
    "to": "TMP-KLN-45",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SA-KLN-TYRES",
    "to": "GEN-001",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SA-KLN-ROLLERS",
    "to": "TMP-KLN-26",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SA-KLN-THRUST",
    "to": "GAS-KLN-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SA-KLN-SEALS",
    "to": "SNL:TMP-KLN-15",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SA-KLN-SHELL",
    "to": "SNL:PRX-KLN-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SA-BRN-CARRIAGE",
    "to": "LEV-BRN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SA-BRN-FUEL",
    "to": "SNL:CAM-BRN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SA-BRN-PRIMARY-AIR",
    "to": "PRS-BRN-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SA-CLR-TERTIARY",
    "to": "TMP-CLR-04",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SA-CSL-DISCHARGE",
    "to": "TMP-CSL-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CSL-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "LEV-FSL-01",
    "to": "SNL:LEV-FSL-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected FSL-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-FSL-01",
    "to": "SNL:LEV-FSL-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected FSL-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "ELE-FSL-01",
    "to": "SNL:LEV-FSL-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected FSL-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "VIB-KFS-01",
    "to": "KFS-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-KFS-01",
    "to": "KFS-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SPD-KFS-01",
    "to": "KFS-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-PHC-02",
    "to": "SNL:ELE-PHC-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-PHC-02",
    "to": "PHC-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-PHC-04",
    "to": "PHC-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-PHC-04",
    "to": "PHC-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-PHC-06",
    "to": "PHC-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-PHC-06",
    "to": "PHC-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-PHC-01",
    "to": "PHC-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-PHC-01",
    "to": "PHC-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-PHC-03",
    "to": "GEN-002",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-PHC-03",
    "to": "GEN-002",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-PHC-05",
    "to": "GEN-004",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-PHC-05",
    "to": "GEN-006",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-PHC-08",
    "to": "GEN-008",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-PHC-07",
    "to": "GEN-010",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GAS-PHC-01",
    "to": "GEN-012",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GAS-PHC-02",
    "to": "GEN-014",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "POS-PHC-01",
    "to": "GEN-016",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "VIB-PHC-02",
    "to": "GEN-018",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-PHC-10",
    "to": "GEN-020",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "VIB-PHC-01",
    "to": "GEN-022",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-PHC-09",
    "to": "GEN-024",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "ELE-PHC-01",
    "to": "GEN-026",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SPD-PHC-01",
    "to": "GEN-028",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "ELE-KLN-01",
    "to": "GEN-030",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-KLN-20",
    "to": "GEN-045",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SPD-KLN-01",
    "to": "GEN-048",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-KLN-19",
    "to": "GEN-050",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "VIB-KLN-01",
    "to": "GEN-053",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-KLN-22",
    "to": "GEN-055",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "VIB-KLN-02",
    "to": "GEN-057",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "VIB-KLN-03",
    "to": "GEN-057",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-KLN-23",
    "to": "GEN-057",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "VIB-KLN-04",
    "to": "GEN-057",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-KLN-15",
    "to": "GEN-057",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-KLN-04",
    "to": "SNL:ELE-KLN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "LEV-KLN-01",
    "to": "SNL:ELE-KLN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-KLN-05",
    "to": "SA-KLN-SEALS",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "FLO-KLN-05",
    "to": "SA-KLN-SEALS",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "STS-KLN-11",
    "to": "SA-KLN-SEALS",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "LIM-KLN-01",
    "to": "SNL:PRS-KLN-05",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "STS-KLN-05",
    "to": "SNL:FLO-KLN-05",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRX-KLN-01",
    "to": "SNL:LEV-KLN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRX-KLN-02",
    "to": "SNL:LEV-KLN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRX-KLN-03",
    "to": "SNL:LAB-KLN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRX-KLN-04",
    "to": "SNL:LAB-KLN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRX-KLN-05",
    "to": "SNL:STS-KLN-05",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRX-KLN-06",
    "to": "SA-KLN-SHELL",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "MIG-KLN-01",
    "to": "SA-KLN-SHELL",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "MIG-KLN-02",
    "to": "SA-KLN-SHELL",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "MIG-KLN-03",
    "to": "SNL:PRX-KLN-06",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-KLN-01",
    "to": "SNL:STS-KLN-11",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-KLN-02",
    "to": "SNL:STS-KLN-11",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-KLN-03",
    "to": "SNL:LIM-KLN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-KLN-04",
    "to": "SNL:TMP-KLN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-KLN-05",
    "to": "SNL:TMP-KLN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-KLN-06",
    "to": "SNL:TMP-KLN-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-KLN-07",
    "to": "SNL:TMP-KLN-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-KLN-08",
    "to": "SNL:TMP-KLN-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-KLN-09",
    "to": "SNL:TMP-KLN-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-KLN-10",
    "to": "SNL:TMP-KLN-04",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-KLN-11",
    "to": "SNL:TMP-KLN-04",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-KLN-12",
    "to": "SNL:TMP-KLN-06",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "POS-KLN-01",
    "to": "SNL:TMP-KLN-06",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "POS-KLN-02",
    "to": "SNL:TMP-KLN-07",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-KLN-07",
    "to": "SNL:POS-KLN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-KLN-13",
    "to": "SNL:PRS-KLN-07",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-KLN-01",
    "to": "SA-KLN-THRUST",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GAS-KLN-01",
    "to": "SA-KLN-THRUST",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GAS-KLN-02",
    "to": "SA-KLN-THRUST",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GAS-KLN-03",
    "to": "SA-KLN-THRUST",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "STS-KLN-06",
    "to": "SA-KLN-THRUST",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "STS-KLN-08",
    "to": "SNL:TMP-KLN-27",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-KLN-14",
    "to": "SNL:PRS-KLN-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-KLN-27",
    "to": "SNL:PRS-KLN-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-KLN-03",
    "to": "SNL:PRS-KLN-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-KLN-25",
    "to": "SNL:PRS-KLN-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-KLN-26",
    "to": "SA-KLN-ROLLERS",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "CAM-BRN-01",
    "to": "SNL:PRS-BRN-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-BRN-01",
    "to": "SA-BRN-PRIMARY-AIR",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-BRN-02",
    "to": "SA-BRN-PRIMARY-AIR",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-BRN-03",
    "to": "SA-BRN-PRIMARY-AIR",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-BRN-04",
    "to": "SNL:TMP-BRN-05",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "VIB-BRN-01",
    "to": "SNL:ELE-BRN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-BRN-01",
    "to": "SNL:LEV-BRN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "ELE-BRN-01",
    "to": "SNL:TMP-BRN-04",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-BRN-02",
    "to": "SNL:GAS-BRN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-BRN-04",
    "to": "SNL:STS-BRN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GAS-BRN-01",
    "to": "SNL:FLO-BRN-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "LEV-BRN-01",
    "to": "SNL:FLO-BRN-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "FLO-BRN-01",
    "to": "SNL:VIB-BRN-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "VIB-BRN-02",
    "to": "SNL:TMP-BRN-06",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "ELE-BRN-02",
    "to": "SNL:TMP-BRN-06",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-CLR-01",
    "to": "SNL:VIB-CLR-11",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-CLR-01",
    "to": "SNL:VIB-CLR-11",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "VIB-CLR-01",
    "to": "SNL:SPD-CLR-13",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "ELE-CLR-01",
    "to": "SNL:SPD-CLR-13",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-CLR-02",
    "to": "SNL:VIB-CLR-11",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-CLR-02",
    "to": "SNL:VIB-CLR-12",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "VIB-CLR-02",
    "to": "SNL:VIB-CLR-13",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "ELE-CLR-02",
    "to": "SNL:VIB-CLR-13",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-CLR-03",
    "to": "SNL:TMP-CLR-31",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-CLR-03",
    "to": "SNL:TMP-CLR-31",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "VIB-CLR-03",
    "to": "SNL:TMP-CLR-32",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "ELE-CLR-03",
    "to": "SNL:ELE-CLR-13",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-CLR-04",
    "to": "SNL:PRS-CLR-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-CLR-04",
    "to": "SNL:PRS-CLR-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "ELE-CLR-04",
    "to": "SNL:PRS-CLR-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-CLR-05",
    "to": "SNL:PRS-CLR-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-CLR-05",
    "to": "SNL:PRS-CLR-04",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "ELE-CLR-05",
    "to": "SNL:PRS-CLR-05",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-CLR-06",
    "to": "SNL:VIB-CLR-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-CLR-06",
    "to": "SNL:VIB-CLR-04",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "ELE-CLR-06",
    "to": "SNL:VIB-CLR-05",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-CLR-08",
    "to": "SNL:VIB-CLR-06",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-CLR-09",
    "to": "SNL:TMP-CLR-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "VIB-CLR-07",
    "to": "CLR-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-CLR-10",
    "to": "SNL:TMP-CLR-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "ELE-CLR-07",
    "to": "SNL:TMP-CLR-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SPD-CLR-01",
    "to": "SNL:TMP-CLR-05",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-PHC-10",
    "to": "GEN-002",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GAS-PHC-03",
    "to": "GEN-002",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GAS-PHC-04",
    "to": "GEN-004",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "POS-PHC-02",
    "to": "GEN-006",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "STS-BGH-01",
    "to": "SNL:TMP-BGH-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-BGH-02",
    "to": "SNL:TMP-BGH-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-BGH-02",
    "to": "SNL:ELE-BGH-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-BGH-01",
    "to": "SNL:SPD-BGH-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "LEV-BGH-01",
    "to": "SNL:GAS-BGH-04",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GAS-BGH-01",
    "to": "SNL:GAS-BGH-04",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "VIB-BGH-01",
    "to": "SNL:GAS-BGH-05",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-BGH-01",
    "to": "SNL:GAS-BGH-05",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "ELE-BGH-01",
    "to": "SNL:GAS-BGH-05",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "STS-KLN-12",
    "to": "SNL:GAS-KLN-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-KLN-28",
    "to": "SNL:GAS-KLN-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-KLN-29",
    "to": "SNL:STS-KLN-06",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-KLN-30",
    "to": "SNL:VIB-KLN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "STS-KLN-13",
    "to": "SNL:VIB-KLN-05",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-CLR-17",
    "to": "SNL:PRS-CLR-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-CLR-18",
    "to": "SNL:PRS-CLR-04",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-CLR-19",
    "to": "SNL:PRS-CLR-06",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-CLR-20",
    "to": "SNL:VIB-CLR-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-CLR-21",
    "to": "SNL:VIB-CLR-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-CLR-22",
    "to": "SNL:VIB-CLR-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-CLR-23",
    "to": "SNL:VIB-CLR-05",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-CSL-02",
    "to": "SA-CSL-DISCHARGE",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CSL-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-FSL-03",
    "to": "SA-FSL-SILO",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected FSL-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-FSL-04",
    "to": "SA-FSL-SILO",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected FSL-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "WGT-KFS-04",
    "to": "SA-KFS-ELEVATOR",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-KFS-08",
    "to": "SA-KFS-ELEVATOR",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-KFS-09",
    "to": "SA-KFS-ELEVATOR",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-KFS-03",
    "to": "SA-KFS-ELEVATOR",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "ELE-KFS-04",
    "to": "SA-KFS-ELEVATOR",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "ELE-KFS-05",
    "to": "SA-KFS-ELEVATOR",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "ELE-KFS-06",
    "to": "SA-KFS-ELEVATOR",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-PHC-11",
    "to": "SNL:TMP-PHC-25",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-PHC-21",
    "to": "SNL:TMP-PHC-08",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-PHC-12",
    "to": "SNL:TMP-PHC-08",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-PHC-22",
    "to": "SNL:PRS-PHC-10",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-PHC-13",
    "to": "SNL:GAS-PHC-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-PHC-23",
    "to": "SNL:GAS-PHC-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-PHC-14",
    "to": "SNL:GAS-PHC-04",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-PHC-24",
    "to": "SNL:GAS-PHC-04",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-PHC-15",
    "to": "SNL:GAS-PHC-04",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-PHC-25",
    "to": "SNL:POS-PHC-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-PHC-16",
    "to": "SNL:POS-PHC-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-PHC-26",
    "to": "SNL:TMP-PHC-07",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-PHC-30",
    "to": "SNL:POS-PHC-05",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "POS-PHC-03",
    "to": "SNL:TMP-PHC-31",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "POS-PHC-04",
    "to": "SNL:POS-PHC-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "POS-PHC-05",
    "to": "SNL:VIB-PHC-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-PHC-31",
    "to": "SNL:VIB-PHC-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "PRS-BGH-03",
    "to": "SNL:PRS-BGH-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "LEV-BGH-02",
    "to": "SNL:PRS-BGH-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "LEV-BGH-03",
    "to": "SNL:PRS-BGH-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SPD-BGH-02",
    "to": "SNL:PRS-BGH-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SPD-BGH-03",
    "to": "SNL:TMP-BGH-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SPD-BGH-04",
    "to": "SNL:STS-BGH-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GAS-BGH-02",
    "to": "SNL:LEV-BGH-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GAS-BGH-03",
    "to": "SNL:LEV-BGH-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GAS-BGH-04",
    "to": "SNL:LEV-BGH-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GAS-BGH-05",
    "to": "SNL:LEV-BGH-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "VIB-KLN-05",
    "to": "SA-KLN-TYRES",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-KLN-41",
    "to": "SA-KLN-TYRES",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-KLN-42",
    "to": "SA-KLN-DRIVE",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-KLN-43",
    "to": "SA-KLN-DRIVE",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-KLN-44",
    "to": "SA-KLN-DRIVE",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-KLN-45",
    "to": "SA-KLN-DRIVE",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "TMP-KLN-46",
    "to": "SA-KLN-DRIVE",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "STS-KLN-14",
    "to": "SNL:TMP-KLN-13",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:LEV-FSL-01",
    "to": "LEV-FSL-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected FSL-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-FSL-01",
    "to": "LEV-FSL-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected FSL-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:ELE-FSL-01",
    "to": "LEV-FSL-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected FSL-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-FSL-01",
    "to": "SA-FSL-AERATION",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected FSL-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:STS-FSL-03",
    "to": "SA-FSL-AERATION",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected FSL-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:POS-FSL-01",
    "to": "SA-FSL-AERATION",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected FSL-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:POS-FSL-02",
    "to": "SA-FSL-AERATION",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected FSL-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:POS-FSL-03",
    "to": "SA-FSL-AERATION",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected FSL-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:POS-FSL-04",
    "to": "SA-FSL-AERATION",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected FSL-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:POS-FSL-05",
    "to": "SA-FSL-AERATION",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected FSL-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:POS-FSL-06",
    "to": "SA-FSL-AERATION",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected FSL-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-FSL-03",
    "to": "SA-FSL-AERATION",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected FSL-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-FSL-04",
    "to": "FSL-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected FSL-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-FSL-02",
    "to": "FSL-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected FSL-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:ELE-FSL-02",
    "to": "FSL-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected FSL-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:WGT-KFS-02",
    "to": "KFS-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:WGT-KFS-03",
    "to": "KFS-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:WGT-KFS-04",
    "to": "KFS-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:WGT-KFS-01",
    "to": "KFS-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KFS-08",
    "to": "KFS-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KFS-09",
    "to": "KFS-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KFS-05",
    "to": "KFS-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:ELE-KFS-03",
    "to": "KFS-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:POS-KFS-01",
    "to": "KFS-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:FLO-KFS-02",
    "to": "SA-KFS-DOSING",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KFS-02",
    "to": "SA-KFS-DOSING",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KFS-06",
    "to": "SA-KFS-DOSING",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KFS-04",
    "to": "SA-KFS-DOSING",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:ELE-KFS-06",
    "to": "SA-KFS-DOSING",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:LEV-KFS-04",
    "to": "SA-KFS-DOSING",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:LIM-KFS-01",
    "to": "SA-KFS-DOSING",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:SPD-KFS-01",
    "to": "SA-KFS-DOSING",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:VIB-KFS-01",
    "to": "SA-KFS-DOSING",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:VIB-KFS-04",
    "to": "SA-KFS-DOSING",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KFS-01",
    "to": "SA-KFS-DOSING",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KFS-03",
    "to": "SA-KFS-DOSING",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KFS-02",
    "to": "SA-KFS-DOSING",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:ELE-KFS-01",
    "to": "SA-KFS-DOSING",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KFS-07",
    "to": "SA-KFS-DOSING",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:ELE-KFS-07",
    "to": "SA-KFS-DOSING",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:SPD-KFS-02",
    "to": "SA-KFS-DOSING",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:SPD-KFS-03",
    "to": "SA-KFS-DOSING",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KFS-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-01",
    "to": "SA-PHC-CYCLONES",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-01",
    "to": "SA-PHC-CYCLONES",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-11",
    "to": "SA-PHC-CYCLONES",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-21",
    "to": "SA-PHC-CALCINER",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-02",
    "to": "SA-PHC-CALCINER",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-02",
    "to": "SA-PHC-CALCINER",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-12",
    "to": "SA-PHC-CALCINER",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-22",
    "to": "SA-PHC-CALCINER",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-03",
    "to": "SA-PHC-CALCINER",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-03",
    "to": "SA-PHC-CALCINER",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-13",
    "to": "SA-PHC-CALCINER",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-23",
    "to": "SA-PHC-CALCINER",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-04",
    "to": "SA-PHC-CALCINER",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-04",
    "to": "SA-PHC-CALCINER",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-14",
    "to": "SA-PHC-CALCINER",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-24",
    "to": "SA-PHC-IDFAN",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-05",
    "to": "TMP-PHC-21",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-05",
    "to": "TMP-PHC-21",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-15",
    "to": "TMP-PHC-21",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-25",
    "to": "TMP-PHC-21",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-06",
    "to": "TMP-PHC-21",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-06",
    "to": "TMP-PHC-21",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-16",
    "to": "TMP-PHC-21",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-26",
    "to": "TMP-PHC-21",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-30",
    "to": "PRS-PHC-12",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:GAS-PHC-01",
    "to": "PRS-PHC-12",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:GAS-PHC-02",
    "to": "PRS-PHC-12",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-08",
    "to": "PRS-PHC-12",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-PHC-10",
    "to": "TMP-PHC-22",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:GAS-PHC-03",
    "to": "TMP-PHC-22",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:GAS-PHC-04",
    "to": "TMP-PHC-22",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:POS-PHC-02",
    "to": "TMP-PHC-22",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-07",
    "to": "TMP-PHC-22",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:POS-PHC-03",
    "to": "POS-PHC-05",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:POS-PHC-04",
    "to": "POS-PHC-05",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:POS-PHC-05",
    "to": "POS-PHC-05",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-31",
    "to": "POS-PHC-05",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:POS-PHC-01",
    "to": "TMP-PHC-31",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:VIB-PHC-01",
    "to": "TMP-PHC-31",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:VIB-PHC-02",
    "to": "TMP-PHC-31",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-09",
    "to": "TMP-PHC-31",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-10",
    "to": "TMP-PHC-31",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-PHC-11",
    "to": "TMP-PHC-04",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:ELE-PHC-01",
    "to": "PRS-PHC-04",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:SPD-PHC-01",
    "to": "PRS-PHC-04",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-BGH-02",
    "to": "LEV-BGH-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-BGH-03",
    "to": "LEV-BGH-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-BGH-01",
    "to": "LEV-BGH-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BGH-02",
    "to": "SPD-BGH-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:STS-BGH-01",
    "to": "SPD-BGH-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:LEV-BGH-01",
    "to": "GAS-BGH-04",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:LEV-BGH-02",
    "to": "GAS-BGH-04",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:LEV-BGH-03",
    "to": "GAS-BGH-05",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:SPD-BGH-02",
    "to": "GAS-BGH-05",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:SPD-BGH-03",
    "to": "STS-BGH-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:SPD-BGH-04",
    "to": "STS-BGH-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:VIB-BGH-01",
    "to": "STS-BGH-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BGH-01",
    "to": "STS-BGH-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BGH-03",
    "to": "TMP-BGH-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:ELE-BGH-01",
    "to": "PRS-BGH-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:SPD-BGH-01",
    "to": "PRS-BGH-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:GAS-BGH-01",
    "to": "LEV-BGH-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:GAS-BGH-02",
    "to": "LEV-BGH-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:GAS-BGH-03",
    "to": "LEV-BGH-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:GAS-BGH-04",
    "to": "GAS-BGH-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:GAS-BGH-05",
    "to": "VIB-BGH-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BGH-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-13",
    "to": "STS-KLN-14",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KLN-01",
    "to": "STS-KLN-14",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:GAS-KLN-01",
    "to": "TMP-KLN-28",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:GAS-KLN-02",
    "to": "TMP-KLN-28",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:GAS-KLN-03",
    "to": "TMP-KLN-29",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:STS-KLN-06",
    "to": "TMP-KLN-29",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:VIB-KLN-01",
    "to": "TMP-KLN-30",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:VIB-KLN-05",
    "to": "TMP-KLN-30",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-19",
    "to": "STS-KLN-13",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-20",
    "to": "STS-KLN-13",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-41",
    "to": "STS-KLN-13",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-42",
    "to": "STS-KLN-13",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-43",
    "to": "STS-KLN-13",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-44",
    "to": "STS-KLN-13",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-45",
    "to": "VIB-KLN-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-46",
    "to": "VIB-KLN-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:STS-KLN-14",
    "to": "VIB-KLN-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:STS-KLN-12",
    "to": "PRS-KLN-04",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:ELE-KLN-01",
    "to": "LEV-KLN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:SPD-KLN-01",
    "to": "LEV-KLN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:VIB-KLN-02",
    "to": "PRS-KLN-05",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:VIB-KLN-03",
    "to": "PRS-KLN-05",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:VIB-KLN-04",
    "to": "PRS-KLN-05",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-22",
    "to": "PRS-KLN-05",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-23",
    "to": "SA-KLN-SEALS",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KLN-04",
    "to": "SA-KLN-SEALS",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-15",
    "to": "SA-KLN-SEALS",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KLN-05",
    "to": "LIM-KLN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:FLO-KLN-05",
    "to": "STS-KLN-05",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:LEV-KLN-01",
    "to": "PRX-KLN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:LAB-KLN-01",
    "to": "PRX-KLN-04",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:STS-KLN-05",
    "to": "PRX-KLN-04",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRX-KLN-01",
    "to": "PRX-KLN-05",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRX-KLN-02",
    "to": "SA-KLN-SHELL",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRX-KLN-03",
    "to": "SA-KLN-SHELL",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRX-KLN-04",
    "to": "SA-KLN-SHELL",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRX-KLN-05",
    "to": "SA-KLN-SHELL",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRX-KLN-06",
    "to": "TMP-KLN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:STS-KLN-11",
    "to": "TMP-KLN-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:LIM-KLN-01",
    "to": "TMP-KLN-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:MIG-KLN-01",
    "to": "TMP-KLN-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:MIG-KLN-02",
    "to": "TMP-KLN-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:MIG-KLN-03",
    "to": "TMP-KLN-04",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-28",
    "to": "TMP-KLN-04",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-29",
    "to": "TMP-KLN-04",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-30",
    "to": "TMP-KLN-05",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-01",
    "to": "TMP-KLN-05",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-02",
    "to": "TMP-KLN-06",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-03",
    "to": "TMP-KLN-06",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-04",
    "to": "TMP-KLN-11",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-05",
    "to": "TMP-KLN-11",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-06",
    "to": "TMP-KLN-12",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-07",
    "to": "POS-KLN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-08",
    "to": "POS-KLN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-09",
    "to": "POS-KLN-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-10",
    "to": "POS-KLN-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-11",
    "to": "POS-KLN-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-12",
    "to": "POS-KLN-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:POS-KLN-01",
    "to": "PRS-KLN-07",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KLN-07",
    "to": "TMP-KLN-13",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:POS-KLN-02",
    "to": "PRS-KLN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:STS-KLN-08",
    "to": "GAS-KLN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:MAN-KLN-01",
    "to": "GAS-KLN-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:STS-KLN-13",
    "to": "GAS-KLN-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-26",
    "to": "GAS-KLN-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-25",
    "to": "STS-KLN-06",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-14",
    "to": "STS-KLN-08",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-KLN-27",
    "to": "STS-KLN-08",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-KLN-03",
    "to": "TMP-KLN-14",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:CAM-BRN-01",
    "to": "D08",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BRN-02",
    "to": "D08",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-BRN-03",
    "to": "CAM-BRN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-BRN-02",
    "to": "CAM-BRN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-BRN-04",
    "to": "PRS-BRN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:FLO-BRN-01",
    "to": "PRS-BRN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-BRN-01",
    "to": "PRS-BRN-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:VIB-BRN-01",
    "to": "PRS-BRN-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BRN-01",
    "to": "PRS-BRN-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BRN-05",
    "to": "PRS-BRN-04",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:ELE-BRN-01",
    "to": "VIB-BRN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:LEV-BRN-01",
    "to": "TMP-BRN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BRN-04",
    "to": "ELE-BRN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:GAS-BRN-01",
    "to": "TMP-BRN-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:STS-BRN-02",
    "to": "TMP-BRN-04",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:STS-BRN-01",
    "to": "TMP-BRN-04",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:ELE-BRN-03",
    "to": "GAS-BRN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:FLO-BRN-02",
    "to": "GAS-BRN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:VIB-BRN-02",
    "to": "VIB-BRN-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BRN-06",
    "to": "ELE-BRN-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:ELE-BRN-02",
    "to": "ELE-BRN-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BRN-03",
    "to": "ELE-BRN-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-BRN-07",
    "to": "ELE-BRN-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-BRN-05",
    "to": "ELE-BRN-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected BRN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:SPD-CLR-11",
    "to": "ELE-CLR-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:SPD-CLR-12",
    "to": "ELE-CLR-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:SPD-CLR-13",
    "to": "ELE-CLR-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:VIB-CLR-11",
    "to": "PRS-CLR-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:VIB-CLR-12",
    "to": "TMP-CLR-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:VIB-CLR-13",
    "to": "TMP-CLR-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-31",
    "to": "VIB-CLR-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-32",
    "to": "VIB-CLR-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-33",
    "to": "VIB-CLR-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:ELE-CLR-11",
    "to": "VIB-CLR-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:ELE-CLR-12",
    "to": "ELE-CLR-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:ELE-CLR-13",
    "to": "ELE-CLR-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-CLR-01",
    "to": "TMP-CLR-17",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-CLR-02",
    "to": "TMP-CLR-17",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-CLR-03",
    "to": "TMP-CLR-17",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-CLR-04",
    "to": "TMP-CLR-18",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-CLR-05",
    "to": "TMP-CLR-19",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:PRS-CLR-06",
    "to": "TMP-CLR-19",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:VIB-CLR-01",
    "to": "TMP-CLR-20",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:VIB-CLR-02",
    "to": "TMP-CLR-21",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:VIB-CLR-03",
    "to": "TMP-CLR-22",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:VIB-CLR-04",
    "to": "TMP-CLR-23",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:VIB-CLR-05",
    "to": "TMP-CLR-23",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:VIB-CLR-06",
    "to": "TMP-CLR-08",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-01",
    "to": "TMP-CLR-09",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-02",
    "to": "VIB-CLR-07",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-03",
    "to": "ELE-CLR-07",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-04",
    "to": "ELE-CLR-07",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-05",
    "to": "SPD-CLR-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-06",
    "to": "SPD-CLR-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-17",
    "to": "SPD-CLR-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-18",
    "to": "SPD-CLR-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-19",
    "to": "SPD-CLR-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-CLR-20",
    "to": "SPD-CLR-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected CLR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-HMR-04",
    "to": "D11",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected HMR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-HMR-05",
    "to": "D11",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected HMR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-HMR-03",
    "to": "D11",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected HMR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:ELE-HMR-01",
    "to": "D11",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected HMR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-HMR-06",
    "to": "D11",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected HMR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:VIB-HMR-01",
    "to": "D11",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected HMR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:VIB-HMR-02",
    "to": "D11",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected HMR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-HMR-01",
    "to": "D11",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected HMR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:TMP-HMR-02",
    "to": "D11",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected HMR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "SNL:SPD-HMR-01",
    "to": "D11",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected HMR-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-001",
    "to": "SA-KLN-TYRES",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-002",
    "to": "PRS-PHC-03",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-003",
    "to": "SA-KLN-TYRES",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-004",
    "to": "TMP-PHC-05",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-005",
    "to": "SA-KLN-TYRES",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-006",
    "to": "PRS-PHC-05",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-007",
    "to": "SA-KLN-TYRES",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-008",
    "to": "TMP-PHC-08",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-009",
    "to": "SA-KLN-TYRES",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-010",
    "to": "TMP-PHC-07",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-011",
    "to": "SA-KLN-DRIVE",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-012",
    "to": "GAS-PHC-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-013",
    "to": "SA-KLN-DRIVE",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-014",
    "to": "GAS-PHC-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-015",
    "to": "SA-KLN-DRIVE",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-016",
    "to": "POS-PHC-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-017",
    "to": "SA-KLN-DRIVE",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-018",
    "to": "VIB-PHC-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-019",
    "to": "TMP-KLN-20",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-020",
    "to": "TMP-PHC-10",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-021",
    "to": "ELE-KLN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-022",
    "to": "VIB-PHC-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-023",
    "to": "ELE-KLN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-024",
    "to": "TMP-PHC-09",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-025",
    "to": "ELE-KLN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-026",
    "to": "ELE-PHC-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-027",
    "to": "ELE-KLN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-028",
    "to": "SPD-PHC-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-030",
    "to": "ELE-KLN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-032",
    "to": "SPD-PHC-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-045",
    "to": "TMP-KLN-20",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-046",
    "to": "SPD-PHC-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-048",
    "to": "SPD-KLN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-049",
    "to": "SPD-PHC-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-050",
    "to": "TMP-KLN-19",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-051",
    "to": "SPD-PHC-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-053",
    "to": "VIB-KLN-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-054",
    "to": "SPD-PHC-01",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-055",
    "to": "TMP-KLN-22",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-056",
    "to": "SA-PHC-CYCLONES",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected PHC-01 subsystem relationship.",
    "flow": false
  },
  {
    "from": "GEN-057",
    "to": "VIB-KLN-02",
    "type": "synaptic_connection",
    "evidence": "Cement Plant Topology",
    "note": "Interconnected KLN-01 subsystem relationship.",
    "flow": false
  }
];

export const SOURCE_BY_ID: Record<string, PolycronNode> = Object.fromEntries(
  SOURCE_NODES.map((node) => [node.id, node])
);
