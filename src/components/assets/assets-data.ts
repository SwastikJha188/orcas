import type { PyroDiagramType } from "@/lib/pyro-sim/signals";

export interface HierarchyNode {
  id: string;
  name: string;
  type: "plant" | "area" | "group" | "machine";
  machineId?: string;
  status?: "Operational" | "Advisory" | "Standby" | "Maintenance";
  health?: number;
  /** Plants only: IANA time zone of the site (e.g. "Africa/Lusaka"). Areas and machines inherit it. */
  timeZone?: string | null;
  children?: HierarchyNode[];
}

export const PLANT_HIERARCHY: HierarchyNode[] = [
  {
    id: "plant-kln",
    name: "Demo Cement Plant — Pyro Line (KLN-01)",
    type: "plant",
    timeZone: "Africa/Lusaka",
    children: [
      {
        id: "area-kiln",
        name: "Pyroprocessing & Clinker Line",
        type: "area",
        children: [
          {
            id: "group-kiln-main",
            name: "Rotary Kiln System (KLN-01)",
            type: "group",
            children: [
              { id: "mach-kln-01", name: "Rotary Kiln KLN-01", type: "machine", machineId: "KLN-01", status: "Operational", health: 98 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "plant-conc",
    name: "Kansanshi Copper Concentrator & Comminution Plant",
    type: "plant",
    timeZone: "Africa/Lusaka",
    children: [
      {
        id: "area-crushing",
        name: "Primary Crushing & Overland Stockpile",
        type: "area",
        children: [
          {
            id: "group-crush-01",
            name: "Gyratory Crushing Station",
            type: "group",
            children: [
              { id: "mach-crush-01", name: "Primary Gyratory Crusher CRUSH-01", type: "machine", machineId: "CRUSH-01", status: "Operational", health: 95 },
            ],
          },
          {
            id: "group-conv-04",
            name: "Course Ore Overland Transport",
            type: "group",
            children: [
              { id: "mach-conv-04", name: "Overland Stockpile Conveyor CONV-04", type: "machine", machineId: "CONV-04", status: "Operational", health: 96 },
            ],
          },
        ],
      },
      {
        id: "area-grinding",
        name: "SAG & Ball Mill Grinding Circuit",
        type: "area",
        children: [
          {
            id: "group-sag-01",
            name: "Primary Semi-Autogenous Grinding",
            type: "group",
            children: [
              { id: "mach-sag-01", name: "Primary SAG Mill SAG-01", type: "machine", machineId: "SAG-01", status: "Operational", health: 96 },
            ],
          },
          {
            id: "group-ball-mills",
            name: "Secondary Ball Mill Circuit",
            type: "group",
            children: [
              { id: "mach-ball-02", name: "Secondary Ball Mill BALL-02", type: "machine", machineId: "BALL-02", status: "Advisory", health: 78 },
              { id: "mach-ball-03", name: "Secondary Ball Mill BALL-03", type: "machine", machineId: "BALL-03", status: "Operational", health: 97 },
            ],
          },
          {
            id: "group-cyclone-feed",
            name: "Hydrocyclone Underflow Pumping",
            type: "group",
            children: [
              { id: "mach-pump-104", name: "Standby Slurry Underflow Pump PUMP-104", type: "machine", machineId: "PUMP-104", status: "Standby", health: 99 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "plant-hyd",
    name: "Ndola Hydrometallurgy & Utilities Plant",
    type: "plant",
    timeZone: "Africa/Lusaka",
    children: [
      {
        id: "area-leach",
        name: "High-Pressure Leaching & Slurry Autoclave",
        type: "area",
        children: [
          {
            id: "group-hp-pump",
            name: "Autoclave Slurry Injection",
            type: "group",
            children: [
              { id: "mach-hp-pump-01", name: "Triplex Diaphragm Slurry Pump HP-PUMP-01", type: "machine", machineId: "HP-PUMP-01", status: "Operational", health: 95 },
            ],
          },
          {
            id: "group-agit-01",
            name: "Leach Tank Agitation",
            type: "group",
            children: [
              { id: "mach-agit-01", name: "Leach Vessel Slurry Agitator AGIT-01", type: "machine", machineId: "AGIT-01", status: "Operational", health: 97 },
            ],
          },
        ],
      },
      {
        id: "area-utilities",
        name: "Process Water & Aeration Utilities",
        type: "area",
        children: [
          {
            id: "group-pmp-101",
            name: "Process Water Circulation",
            type: "group",
            children: [
              { id: "mach-pmp-101", name: "Process Water Circulation Pump PMP-101", type: "machine", machineId: "PMP-101", status: "Advisory", health: 74 },
            ],
          },
          {
            id: "group-blow-03",
            name: "Flotation & Oxidation Air Supply",
            type: "group",
            children: [
              { id: "mach-blow-03", name: "Centrifugal Process Air Blower BLOW-03", type: "machine", machineId: "BLOW-03", status: "Operational", health: 98 },
            ],
          },
        ],
      },
    ],
  },
];

export interface MachineComponentPart {
  id: string;
  name: string;
  health: number; // 0 - 100
  status: "Normal" | "Advisory" | "Critical";
  bbox: { x: number; y: number; width: number; height: number };
  criticalNotes?: string;
}

export interface DiagramHotspot {
  id: string;
  label: string;
  parameter: string;
  value: string;
  unit: string;
  status: "Normal" | "Advisory" | "Critical";
  x: number; // percentage
  y: number; // percentage
  component: string;
  criticalNotes?: string;
}

export interface AssetMachine {
  id: string;
  name: string;
  plantId?: string;
  area: string;
  processCell: string;
  type: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  commissioned: string;
  location: string;
  coordinates: string;
  powerRating: string;
  operatingSpeed: string;
  criticality: "A (Critical)" | "B (Essential)" | "C (General)";
  status: "Operational" | "Advisory" | "Standby" | "Maintenance";
  health: number;
  sapEquipmentId: string;
  floc: string;
  costCenter: string;
  plant: string;
  workCenter: string;
  activeWorkOrder?: string;
  signalsCount: number;
  /** Drawing kind: the original five schematics, or a pyro-line drawing (`pyroDrawingForType`). */
  diagramType: "mill" | "crusher" | "pump" | "blower" | "kiln" | PyroDiagramType;
  parts: MachineComponentPart[];
  hotspots: DiagramHotspot[];
}

// Drive Train Hotspots (17 tags per D4/D5 Table 5.1c / 9.1)
export const KILN_DRV_HOTSPOTS: DiagramHotspot[] = [
  { id: "VIB-KLN-01", label: "Motor DE Vibration RMS (P4)", parameter: "VIB-KLN-01", value: "1.60", unit: "mm/s", status: "Normal", x: 44.5, y: 46, component: "Main Drive Motor (630 kW)" },
  { id: "TMP-KLN-21", label: "Motor Stator Winding Temp (P2)", parameter: "TMP-KLN-21", value: "100.0", unit: "°C", status: "Normal", x: 46.5, y: 38, component: "Main Drive Motor (630 kW)" },
  { id: "ELE-KLN-01", label: "Drive Torque / Motor Current (P3)", parameter: "ELE-KLN-01", value: "62.1", unit: "%", status: "Normal", x: 44.0, y: 28, component: "Main Drive VFD Inverter" },
  { id: "SPD-KLN-01", label: "Kiln Speed (P6)", parameter: "SPD-KLN-01", value: "3.80", unit: "rpm", status: "Normal", x: 41.5, y: 28, component: "Kiln Drive Pinion Shaft" },
  { id: "TMP-KLN-19", label: "Motor DE Bearing Temp (P5)", parameter: "TMP-KLN-19", value: "65.0", unit: "°C", status: "Normal", x: 45.0, y: 55, component: "Main Motor DE Bearing" },
  { id: "TMP-KLN-20", label: "Motor NDE Bearing Temp (P1)", parameter: "TMP-KLN-20", value: "60.5", unit: "°C", status: "Normal", x: 47.5, y: 46, component: "Main Motor NDE Bearing" },
  { id: "VIB-KLN-02", label: "Gearbox Input Vibration (P1)", parameter: "VIB-KLN-02", value: "1.85", unit: "mm/s", status: "Normal", x: 38.0, y: 48, component: "3-Stage Helical Gearbox" },
  { id: "VIB-KLN-03", label: "Gearbox Output Vibration (P3)", parameter: "VIB-KLN-03", value: "1.51", unit: "mm/s", status: "Normal", x: 42.0, y: 48, component: "3-Stage Helical Gearbox" },
  { id: "TMP-KLN-22", label: "Gearbox Input Bearing Temp (P2)", parameter: "TMP-KLN-22", value: "69.9", unit: "°C", status: "Normal", x: 38.0, y: 57, component: "Gearbox Input Bearing" },
  { id: "TMP-KLN-23", label: "Gearbox Output Bearing Temp (P4)", parameter: "TMP-KLN-23", value: "67.7", unit: "°C", status: "Normal", x: 42.0, y: 57, component: "Gearbox Output Bearing" },
  { id: "VIB-KLN-04", label: "Pinion Vibration Girth-Gear (P2)", parameter: "VIB-KLN-04", value: "2.33", unit: "mm/s", status: "Normal", x: 37.0, y: 30, component: "Drive Pinion & Girth Gear" },
  { id: "STS-KLN-05", label: "Girth-Gear Spray Status (P1)", parameter: "STS-KLN-05", value: "OK", unit: "state", status: "Normal", x: 39.0, y: 22, component: "Girth Gear Spray System" },
  { id: "TMP-KLN-15", label: "Gearbox Oil Temp (P1)", parameter: "TMP-KLN-15", value: "59.8", unit: "°C", status: "Normal", x: 36.0, y: 68, component: "Gearbox Lubrication Skid" },
  { id: "PRS-KLN-04", label: "Gearbox Oil Pressure (P4)", parameter: "PRS-KLN-04", value: "2.12", unit: "bar", status: "Normal", x: 40.0, y: 68, component: "Gearbox Lubrication Skid" },
  { id: "FLO-KLN-05", label: "Gearbox Oil Flow Switch (P3)", parameter: "FLO-KLN-05", value: "FLOW OK", unit: "state", status: "Normal", x: 43.0, y: 68, component: "Gearbox Lubrication Skid" },
  { id: "LEV-KLN-01", label: "Gearbox Oil Level Switch (P2)", parameter: "LEV-KLN-01", value: "LEVEL OK", unit: "state", status: "Normal", x: 36.0, y: 78, component: "800L Oil Reservoir Tank" },
  { id: "STS-KLN-11", label: "Auxiliary Drive Status (P1)", parameter: "STS-KLN-11", value: "READY", unit: "state", status: "Normal", x: 45.0, y: 76, component: "Auxiliary Inching Drive" },
];

// Support & Thrust Hotspots (15 tags per D4/D5 Table 5.2c / 9.1)
export const KILN_SUP_HOTSPOTS: DiagramHotspot[] = [
  { id: "TMP-KLN-01", label: "Station 1 Left A Bearing (P1)", parameter: "TMP-KLN-01", value: "57.8", unit: "°C", status: "Normal", x: 28.0, y: 65, component: "Station 1 Pier (11m)" },
  { id: "TMP-KLN-02", label: "Station 1 Left B Bearing (P3)", parameter: "TMP-KLN-02", value: "59.4", unit: "°C", status: "Normal", x: 31.0, y: 65, component: "Station 1 Pier (11m)" },
  { id: "TMP-KLN-03", label: "Station 1 Right A Bearing (P2)", parameter: "TMP-KLN-03", value: "57.1", unit: "°C", status: "Normal", x: 28.0, y: 79, component: "Station 1 Pier (11m)" },
  { id: "TMP-KLN-04", label: "Station 1 Right B Bearing (P4)", parameter: "TMP-KLN-04", value: "58.5", unit: "°C", status: "Normal", x: 31.0, y: 79, component: "Station 1 Pier (11m)" },
  { id: "TMP-KLN-05", label: "Station 2 Left A Bearing (P1)", parameter: "TMP-KLN-05", value: "62.0", unit: "°C", status: "Normal", x: 53.0, y: 65, component: "Station 2 Pier (39m)" },
  { id: "TMP-KLN-06", label: "Station 2 Left B Bearing (P3)", parameter: "TMP-KLN-06", value: "62.5", unit: "°C", status: "Normal", x: 56.0, y: 65, component: "Station 2 Pier (39m)" },
  { id: "TMP-KLN-07", label: "Station 2 Right A Bearing (P2)", parameter: "TMP-KLN-07", value: "61.3", unit: "°C", status: "Normal", x: 53.0, y: 79, component: "Station 2 Pier (39m)" },
  { id: "TMP-KLN-08", label: "Station 2 Right B Bearing (P4)", parameter: "TMP-KLN-08", value: "62.0", unit: "°C", status: "Normal", x: 56.0, y: 79, component: "Station 2 Pier (39m)" },
  { id: "TMP-KLN-09", label: "Station 3 Left A Bearing (P1)", parameter: "TMP-KLN-09", value: "59.0", unit: "°C", status: "Normal", x: 78.0, y: 65, component: "Station 3 Pier (60m)" },
  { id: "TMP-KLN-10", label: "Station 3 Left B Bearing (P3)", parameter: "TMP-KLN-10", value: "58.0", unit: "°C", status: "Normal", x: 81.0, y: 65, component: "Station 3 Pier (60m)" },
  { id: "TMP-KLN-11", label: "Station 3 Right A Bearing (P2)", parameter: "TMP-KLN-11", value: "60.0", unit: "°C", status: "Normal", x: 78.0, y: 79, component: "Station 3 Pier (60m)" },
  { id: "TMP-KLN-12", label: "Station 3 Right B Bearing (P4)", parameter: "TMP-KLN-12", value: "59.2", unit: "°C", status: "Normal", x: 81.0, y: 79, component: "Station 3 Pier (60m)" },
  { id: "PRS-KLN-07", label: "Thrust Hydraulic Pressure (P2)", parameter: "PRS-KLN-07", value: "90", unit: "bar", status: "Normal", x: 58.0, y: 77, component: "Hydraulic Thrust Station 2" },
  { id: "POS-KLN-01", label: "Kiln Axial Position LVDT (P1)", parameter: "POS-KLN-01", value: "-3.1", unit: "mm", status: "Normal", x: 58.0, y: 67, component: "Hydraulic Thrust Station 2" },
  { id: "POS-KLN-02", label: "Thrust Limit Switches (P3)", parameter: "POS-KLN-02", value: "CLEAR", unit: "state", status: "Normal", x: 58.0, y: 86, component: "Hydraulic Thrust Station 2" },
];

// Shell, Refractory & Seals Hotspots (2 tags + 3 calculated per D4/D5 Table 5.3c / 9.2)
export const KILN_SHL_HOTSPOTS: DiagramHotspot[] = [
  { id: "STS-KLN-08", label: "IR Shell Scanner Coverage (P2)", parameter: "STS-KLN-08", value: "95.9", unit: "%", status: "Normal", x: 67.0, y: 16, component: "Rotary Shell & Refractory" },
  { id: "CAL-KLN-03", label: "Shell Maximum Temp (P1)", parameter: "CAL-KLN-03", value: "327", unit: "°C", status: "Normal", x: 71.0, y: 28, component: "Rotary Shell (Burning Zone)" },
  { id: "CAL-KLN-06", label: "Inlet False-Air Index (P3)", parameter: "CAL-KLN-06", value: "-0.02", unit: "vol%", status: "Normal", x: 18.0, y: 25, component: "Inlet Lamella Seal" },
  { id: "CAL-KLN-07", label: "Seal Overlap Margin (P4)", parameter: "CAL-KLN-07", value: "37.0", unit: "mm", status: "Normal", x: 19.0, y: 72, component: "Inlet Lamella Seal" },
  { id: "STS-KLN-10", label: "Outlet Seal Fan Status (P2)", parameter: "STS-KLN-10", value: "RUNNING", unit: "state", status: "Normal", x: 86.0, y: 76, component: "Outlet Lamella Seal" },
];

// Process Context Hotspots (9 tags per D4/D5 Table 5.4c / 9.1)
export const KILN_PRC_HOTSPOTS: DiagramHotspot[] = [
  { id: "GAS-KLN-01", label: "Kiln-Inlet O₂ (P2)", parameter: "GAS-KLN-01", value: "2.58", unit: "vol%", status: "Normal", x: 9.0, y: 32, component: "Kiln Inlet Chamber" },
  { id: "GAS-KLN-02", label: "Kiln-Inlet CO (P3)", parameter: "GAS-KLN-02", value: "408", unit: "ppm", status: "Normal", x: 9.0, y: 48, component: "Kiln Inlet Chamber" },
  { id: "TMP-KLN-13", label: "Inlet Gas Temperature (P4)", parameter: "TMP-KLN-13", value: "1087", unit: "°C", status: "Normal", x: 13.0, y: 36, component: "Kiln Inlet Chamber" },
  { id: "PRS-KLN-01", label: "Kiln-Inlet Draft (P5)", parameter: "PRS-KLN-01", value: "-3.82", unit: "mbar", status: "Normal", x: 13.0, y: 52, component: "Kiln Inlet Chamber" },
  { id: "STS-KLN-06", label: "Gas Analyser Status (P1)", parameter: "STS-KLN-06", value: "OK", unit: "state", status: "Normal", x: 9.0, y: 20, component: "Kiln Inlet Chamber" },
  { id: "FLO-KLN-01", label: "Kiln Feed Rate (P1)", parameter: "FLO-KLN-01", value: "330", unit: "t/h", status: "Normal", x: 6.0, y: 15, component: "Raw Meal Dosing & Feed" },
  { id: "FLO-KLN-02", label: "Kiln Burner Fuel (P2)", parameter: "FLO-KLN-02", value: "10.57", unit: "t/h", status: "Normal", x: 94.0, y: 18, component: "Kiln Coal Dosing Burner" },
  { id: "TMP-KLN-14", label: "Burning-Zone Temp (P1)", parameter: "TMP-KLN-14", value: "1448", unit: "°C", status: "Normal", x: 89.0, y: 24, component: "Firing Hood Optical Pyrometer" },
  { id: "PRS-KLN-03", label: "Hood Static Pressure (P2)", parameter: "PRS-KLN-03", value: "-0.29", unit: "mbar", status: "Normal", x: 91.0, y: 38, component: "Kiln Discharge Hood" },
];

// All 46 signals (17 Drive + 15 Support + 5 Shell/Seals + 9 Process)
export const KILN_ALL_HOTSPOTS: DiagramHotspot[] = [
  ...KILN_DRV_HOTSPOTS,
  ...KILN_SUP_HOTSPOTS,
  ...KILN_SHL_HOTSPOTS,
  ...KILN_PRC_HOTSPOTS,
];

export const ASSET_MACHINES: AssetMachine[] = [
  {
    id: "KLN-01",
    name: "Rotary Kiln KLN-01",
    plantId: "plant-kln",
    area: "Pyroprocessing & Clinker Line",
    processCell: "Rotary Kiln System (KLN-01)",
    type: "Rotary Kiln System (5,000 t/d clinker)",
    manufacturer: "FLSmidth / OSWARteck",
    model: "Ø4.8m × 74m · Slope 3.5% · 3.0–4.5 RPM",
    serialNumber: "SN-KLN-2026-SYS-01",
    commissioned: "2021-08-15",
    location: "Pyro Line Bay 1, Elevation +8m",
    coordinates: "14°58'12\"S 28°14'45\"E",
    powerRating: "630 kW Main / 7.5 kW HPU",
    operatingSpeed: "3.80 RPM (3.0–4.5 RPM)",
    criticality: "A (Critical)",
    status: "Operational",
    health: 98,
    sapEquipmentId: "EQ-KLN-ALL-01",
    floc: "FLOC-CEM-PYRO-KLN01-SYS",
    costCenter: "CC-7102-CLINKER",
    plant: "Demo Cement Plant — Pyro Line (KLN-01)",
    workCenter: "WC-PYRO-KILN",
    activeWorkOrder: "WO-2026-KLN-901",
    signalsCount: 46,
    diagramType: "kiln",
    parts: [
      { id: "P1", name: "Drive Train DRV-KLN-01 (630 kW)", health: 97, status: "Normal", bbox: { x: 335, y: 98, width: 175, height: 215 } },
      { id: "P2", name: "Support & Thrust SUP-KLN-01", health: 96, status: "Normal", bbox: { x: 230, y: 198, width: 615, height: 108 } },
      { id: "P3", name: "Shell, Refractory & Seals SHL-KLN-01", health: 98, status: "Normal", bbox: { x: 148, y: 115, width: 725, height: 118 } },
      { id: "P4", name: "Process Context PRC-KLN-01", health: 99, status: "Normal", bbox: { x: 50, y: 35, width: 900, height: 275 } },
    ],
    hotspots: KILN_ALL_HOTSPOTS,
  },
  {
    id: "CRUSH-01",
    name: "Primary Gyratory Crusher CRUSH-01",
    plantId: "plant-conc",
    area: "Primary Crushing & Overland Stockpile",
    processCell: "Gyratory Crushing Station",
    type: "Primary Gyratory Crusher (60×113 Superior)",
    manufacturer: "Metso Outotec",
    model: "Superior MK-III 60-113 (1,000 kW)",
    serialNumber: "SN-MET-CRUSH-2019-01",
    commissioned: "2019-11-04",
    location: "ROM Tip Pocket Bay A, Level -12m",
    coordinates: "12°09'48\"S 26°25'33\"E",
    powerRating: "1,000 kW MV Wound Rotor",
    operatingSpeed: "165 RPM Eccentric / 742 RPM Countershaft",
    criticality: "A (Critical)",
    status: "Operational",
    health: 95,
    sapEquipmentId: "EQ-CONC-CRUSH-01",
    floc: "FLOC-CONC-CRSH-GYR01",
    costCenter: "CC-4100-CRUSHING",
    plant: "Kansanshi Copper Concentrator & Comminution Plant",
    workCenter: "WC-MECH-CRUSH",
    signalsCount: 5,
    diagramType: "crusher",
    parts: [
      { id: "P1", name: "Spider Cap & Upper Bushing Assembly", health: 96, status: "Normal", bbox: { x: 375, y: 35, width: 250, height: 55 } },
      { id: "P2", name: "Main Shaft & Concave Crushing Chamber", health: 95, status: "Normal", bbox: { x: 300, y: 70, width: 400, height: 175 } },
      { id: "P3", name: "Countershaft Pinion & MV Drive Motor", health: 94, status: "Normal", bbox: { x: 155, y: 220, width: 345, height: 75 } },
      { id: "P4", name: "Hydroset Cylinder & Eccentric Assembly", health: 96, status: "Normal", bbox: { x: 465, y: 280, width: 75, height: 60 } },
    ],
    hotspots: [
      { id: "SPIDER-LUBE-FLOW", label: "Spider Bushing Lube Flow (P1)", parameter: "SPIDER-LUBE-FLOW", value: "18.6", unit: "L/min", status: "Normal", x: 50.0, y: 14.0, component: "Spider Cap & Upper Bushing Assembly" },
      { id: "SHAFT-THRUST", label: "Main Shaft Axial Position (P2)", parameter: "SHAFT-THRUST", value: "0.34", unit: "mm", status: "Normal", x: 50.0, y: 42.0, component: "Main Shaft & Concave Crushing Chamber" },
      { id: "MOTOR-AMP", label: "Drive Motor Phase Current (P3)", parameter: "MOTOR-AMP", value: "78.4", unit: "A", status: "Normal", x: 21.0, y: 68.0, component: "Countershaft Pinion & MV Drive Motor" },
      { id: "COUNTERSHAFT-VIB", label: "Countershaft Bearing Vibration (P3)", parameter: "COUNTERSHAFT-VIB", value: "2.18", unit: "mm/s", status: "Normal", x: 39.0, y: 72.0, component: "Countershaft Pinion & MV Drive Motor" },
      { id: "ECC-HYD-PRESS", label: "Hydroset Support Pressure (P4)", parameter: "ECC-HYD-PRESS", value: "168.0", unit: "bar", status: "Normal", x: 50.0, y: 84.0, component: "Hydroset Cylinder & Eccentric Assembly" },
    ],
  },
  {
    id: "CONV-04",
    name: "Overland Stockpile Conveyor CONV-04",
    plantId: "plant-conc",
    area: "Primary Crushing & Overland Stockpile",
    processCell: "Course Ore Overland Transport",
    type: "Steel-Cord Overland Belt Conveyor (4,500 t/h)",
    manufacturer: "FLSmidth / Continental",
    model: "ST-3150 × 1,800mm · Dual 800 kW Drive",
    serialNumber: "SN-FLS-CONV-2020-04",
    commissioned: "2020-04-12",
    location: "Overland Corridor Transfer House T4",
    coordinates: "12°10'02\"S 26°26'10\"E",
    powerRating: "2 × 800 kW Bevel-Helical",
    operatingSpeed: "5.2 m/s (67 RPM Head Pulley)",
    criticality: "B (Essential)",
    status: "Operational",
    health: 96,
    sapEquipmentId: "EQ-CONC-CONV-04",
    floc: "FLOC-CONC-MAT-CONV04",
    costCenter: "CC-4100-CRUSHING",
    plant: "Kansanshi Copper Concentrator & Comminution Plant",
    workCenter: "WC-MECH-CONV",
    signalsCount: 3,
    diagramType: "mill",
    parts: [
      { id: "P1", name: "Primary Drive Motor (800 kW)", health: 97, status: "Normal", bbox: { x: 80, y: 105, width: 145, height: 170 } },
      { id: "P2", name: "Head Pulley & Bevel-Helical Reducer", health: 96, status: "Normal", bbox: { x: 255, y: 115, width: 165, height: 155 } },
      { id: "P3", name: "Overland Steel-Cord Belt & Splice Loop", health: 96, status: "Normal", bbox: { x: 460, y: 65, width: 350, height: 240 } },
    ],
    hotspots: [
      { id: "PULLEY-DE-VIB", label: "Head Pulley DE Vibration (P2)", parameter: "PULLEY-DE-VIB", value: "1.74", unit: "mm/s", status: "Normal", x: 32.0, y: 48.0, component: "Head Pulley & Bevel-Helical Reducer" },
      { id: "GEARBOX-OIL-TEMP", label: "Reducer Sump Oil Temperature (P2)", parameter: "GEARBOX-OIL-TEMP", value: "58.2", unit: "°C", status: "Normal", x: 36.0, y: 62.0, component: "Head Pulley & Bevel-Helical Reducer" },
      { id: "BELT-RIP-STATUS", label: "Steel-Cord Belt Splice Integrity (P3)", parameter: "BELT-RIP-STATUS", value: "100", unit: "%", status: "Normal", x: 62.0, y: 55.0, component: "Overland Steel-Cord Belt & Splice Loop" },
    ],
  },
  {
    id: "SAG-01",
    name: "Primary SAG Mill SAG-01",
    plantId: "plant-conc",
    area: "SAG & Ball Mill Grinding Circuit",
    processCell: "Primary Semi-Autogenous Grinding",
    type: "Semi-Autogenous Grinding Mill (38 × 20 ft)",
    manufacturer: "FLSmidth",
    model: "OK-3820 Twin-Pinion (18 MW)",
    serialNumber: "SN-FLS-SAG-2020-01",
    commissioned: "2020-06-18",
    location: "Grinding Bay 1, West Pedestal",
    coordinates: "12°10'15\"S 26°26'28\"E",
    powerRating: "2 × 9,000 kW Synchronous",
    operatingSpeed: "9.85 RPM (74% Critical Speed)",
    criticality: "A (Critical)",
    status: "Operational",
    health: 96,
    sapEquipmentId: "EQ-CONC-SAG-01",
    floc: "FLOC-CONC-GRND-SAG01",
    costCenter: "CC-4200-GRINDING",
    plant: "Kansanshi Copper Concentrator & Comminution Plant",
    workCenter: "WC-MECH-MILLS",
    signalsCount: 5,
    diagramType: "mill",
    parts: [
      { id: "P1", name: "Main Synchronous Drive Motor", health: 97, status: "Normal", bbox: { x: 80, y: 105, width: 145, height: 170 } },
      { id: "P2", name: "Pinion Drive Shaft & Reducer", health: 95, status: "Normal", bbox: { x: 255, y: 115, width: 165, height: 155 } },
      { id: "P3", name: "Feed Hydrostatic Trunnion Bearing", health: 96, status: "Normal", bbox: { x: 415, y: 195, width: 55, height: 110 } },
      { id: "P4", name: "Rotating Mill Shell & Lifter Liners", health: 96, status: "Normal", bbox: { x: 475, y: 65, width: 285, height: 240 } },
      { id: "P5", name: "Discharge Trunnion Bearing", health: 97, status: "Normal", bbox: { x: 765, y: 195, width: 55, height: 110 } },
    ],
    hotspots: [
      { id: "VIB-RMS-DE", label: "Motor DE Bearing Vibration (P1)", parameter: "VIB-RMS-DE", value: "1.84", unit: "mm/s", status: "Normal", x: 16.0, y: 48.0, component: "Main Synchronous Drive Motor" },
      { id: "PINION-ACC-RMS", label: "Pinion Bearing Vibration RMS (P2)", parameter: "PINION-ACC-RMS", value: "2.24", unit: "mm/s", status: "Normal", x: 33.0, y: 50.0, component: "Pinion Drive Shaft & Reducer" },
      { id: "TRUNNION-TEMP-01", label: "Feed Trunnion Bearing Temp (P3)", parameter: "TRUNNION-TEMP-01", value: "61.4", unit: "°C", status: "Normal", x: 44.0, y: 66.0, component: "Feed Hydrostatic Trunnion Bearing" },
      { id: "AXIAL-THRUST-MM", label: "Shell Axial Float Displacement (P4)", parameter: "AXIAL-THRUST-MM", value: "0.21", unit: "mm", status: "Normal", x: 64.0, y: 38.0, component: "Rotating Mill Shell & Lifter Liners" },
      { id: "TRUNNION-TEMP-02", label: "Discharge Trunnion Bearing Temp (P5)", parameter: "TRUNNION-TEMP-02", value: "62.8", unit: "°C", status: "Normal", x: 79.0, y: 66.0, component: "Discharge Trunnion Bearing" },
    ],
  },
  {
    id: "BALL-02",
    name: "Secondary Ball Mill BALL-02",
    plantId: "plant-conc",
    area: "SAG & Ball Mill Grinding Circuit",
    processCell: "Secondary Ball Mill Circuit",
    type: "Overflow Ball Mill (26 × 42 ft)",
    manufacturer: "Metso Outotec",
    model: "Premier 2642 Twin-Drive (13 MW)",
    serialNumber: "SN-MET-BALL-2020-02",
    commissioned: "2020-07-10",
    location: "Grinding Bay 2, Center Pedestal",
    coordinates: "12°10'17\"S 26°26'31\"E",
    powerRating: "13,000 kW Dual Pinion",
    operatingSpeed: "13.2 RPM (76% Critical Speed)",
    criticality: "A (Critical)",
    status: "Advisory",
    health: 78,
    sapEquipmentId: "EQ-CONC-BALL-02",
    floc: "FLOC-CONC-GRND-BALL02",
    costCenter: "CC-4200-GRINDING",
    plant: "Kansanshi Copper Concentrator & Comminution Plant",
    workCenter: "WC-MECH-MILLS",
    activeWorkOrder: "WO-2026-BALL-412",
    signalsCount: 5,
    diagramType: "mill",
    parts: [
      { id: "P1", name: "Main Drive Synchronous Motor", health: 94, status: "Normal", bbox: { x: 80, y: 105, width: 145, height: 170 } },
      { id: "P2", name: "Pinion Drive Shaft", health: 72, status: "Advisory", bbox: { x: 255, y: 115, width: 165, height: 155 }, criticalNotes: "Outer-race BPFO energy elevated at 4.12 mm/s." },
      { id: "P3", name: "Feed Bearing", health: 76, status: "Advisory", bbox: { x: 415, y: 195, width: 55, height: 110 }, criticalNotes: "Feed trunnion temperature 76.8 °C above 75 °C warning." },
      { id: "P4", name: "Rotating Shell (26x42ft)", health: 81, status: "Advisory", bbox: { x: 475, y: 65, width: 285, height: 240 } },
      { id: "P5", name: "Discharge Bearing", health: 93, status: "Normal", bbox: { x: 765, y: 195, width: 55, height: 110 } },
    ],
    hotspots: [
      { id: "VIB-RMS-DE", label: "Motor DE Bearing Vibration (P1)", parameter: "VIB-RMS-DE", value: "2.45", unit: "mm/s", status: "Normal", x: 16.0, y: 48.0, component: "Main Drive Synchronous Motor" },
      { id: "PINION-ACC-RMS", label: "Pinion DE Bearing Vibration (P2)", parameter: "PINION-ACC-RMS", value: "4.12", unit: "mm/s", status: "Advisory", x: 33.0, y: 50.0, component: "Pinion Drive Shaft" },
      { id: "TRUNNION-TEMP-01", label: "Feed Trunnion Bearing Temp (P3)", parameter: "TRUNNION-TEMP-01", value: "76.8", unit: "°C", status: "Advisory", x: 44.0, y: 66.0, component: "Feed Bearing" },
      { id: "GIRTH-ACOUSTIC", label: "Girth Gear Mesh Acoustic Emission (P4)", parameter: "GIRTH-ACOUSTIC", value: "88.2", unit: "dB", status: "Advisory", x: 64.5, y: 34.0, component: "Rotating Shell (26x42ft)" },
      { id: "TRUNNION-TEMP-02", label: "Discharge Trunnion Bearing Temp (P5)", parameter: "TRUNNION-TEMP-02", value: "68.4", unit: "°C", status: "Normal", x: 79.0, y: 66.0, component: "Discharge Bearing" },
    ],
  },
  {
    id: "BALL-03",
    name: "Secondary Ball Mill BALL-03",
    plantId: "plant-conc",
    area: "SAG & Ball Mill Grinding Circuit",
    processCell: "Secondary Ball Mill Circuit",
    type: "Overflow Ball Mill (26 × 42 ft)",
    manufacturer: "Metso Outotec",
    model: "Premier 2642 Twin-Drive (13 MW)",
    serialNumber: "SN-MET-BALL-2020-03",
    commissioned: "2020-08-22",
    location: "Grinding Bay 3, East Pedestal",
    coordinates: "12°10'19\"S 26°26'34\"E",
    powerRating: "13,000 kW Dual Pinion",
    operatingSpeed: "13.2 RPM (76% Critical Speed)",
    criticality: "A (Critical)",
    status: "Operational",
    health: 97,
    sapEquipmentId: "EQ-CONC-BALL-03",
    floc: "FLOC-CONC-GRND-BALL03",
    costCenter: "CC-4200-GRINDING",
    plant: "Kansanshi Copper Concentrator & Comminution Plant",
    workCenter: "WC-MECH-MILLS",
    signalsCount: 5,
    diagramType: "mill",
    parts: [
      { id: "P1", name: "Main Drive Synchronous Motor", health: 98, status: "Normal", bbox: { x: 80, y: 105, width: 145, height: 170 } },
      { id: "P2", name: "Pinion Gearbox", health: 97, status: "Normal", bbox: { x: 255, y: 115, width: 165, height: 155 } },
      { id: "P3", name: "Feed Bearing", health: 97, status: "Normal", bbox: { x: 415, y: 195, width: 55, height: 110 } },
      { id: "P4", name: "Rotating Shell (26x42ft)", health: 96, status: "Normal", bbox: { x: 475, y: 65, width: 285, height: 240 } },
      { id: "P5", name: "Discharge Bearing", health: 97, status: "Normal", bbox: { x: 765, y: 195, width: 55, height: 110 } },
    ],
    hotspots: [
      { id: "VIB-RMS-DE", label: "Motor DE Bearing Vibration (P1)", parameter: "VIB-RMS-DE", value: "1.92", unit: "mm/s", status: "Normal", x: 16.0, y: 48.0, component: "Main Drive Synchronous Motor" },
      { id: "PINION-ACC-RMS", label: "Pinion Gearbox Vibration RMS (P2)", parameter: "PINION-ACC-RMS", value: "2.10", unit: "mm/s", status: "Normal", x: 33.0, y: 50.0, component: "Pinion Gearbox" },
      { id: "TRUNNION-TEMP-01", label: "Feed Trunnion Bearing Temp (P3)", parameter: "TRUNNION-TEMP-01", value: "61.8", unit: "°C", status: "Normal", x: 44.0, y: 66.0, component: "Feed Bearing" },
      { id: "SHELL-DISP", label: "Shell Liner Radial Displacement (P4)", parameter: "SHELL-DISP", value: "0.18", unit: "mm", status: "Normal", x: 61.0, y: 42.0, component: "Rotating Shell (26x42ft)" },
      { id: "TRUNNION-TEMP-02", label: "Discharge Trunnion Bearing Temp (P5)", parameter: "TRUNNION-TEMP-02", value: "62.4", unit: "°C", status: "Normal", x: 79.0, y: 66.0, component: "Discharge Bearing" },
    ],
  },
  {
    id: "PUMP-104",
    name: "Standby Slurry Underflow Pump PUMP-104",
    plantId: "plant-conc",
    area: "SAG & Ball Mill Grinding Circuit",
    processCell: "Hydrocyclone Underflow Pumping",
    type: "Heavy-Duty Centrifugal Slurry Pump",
    manufacturer: "Weir Minerals",
    model: "Warman MCR 550 (1,200 kW)",
    serialNumber: "SN-WAR-MCR550-2021-04",
    commissioned: "2021-02-14",
    location: "Cyclone Cluster Sump Bay B",
    coordinates: "12°10'21\"S 26°26'38\"E",
    powerRating: "1,200 kW VFD",
    operatingSpeed: "0 RPM (Standby · Nominal 590 RPM)",
    criticality: "B (Essential)",
    status: "Standby",
    health: 99,
    sapEquipmentId: "EQ-CONC-PMP-104",
    floc: "FLOC-CONC-CYC-PMP104",
    costCenter: "CC-4200-GRINDING",
    plant: "Kansanshi Copper Concentrator & Comminution Plant",
    workCenter: "WC-MECH-PUMPS",
    signalsCount: 4,
    diagramType: "pump",
    parts: [
      { id: "P1", name: "Drive Motor M-104 (1,200 kW)", health: 99, status: "Normal", bbox: { x: 115, y: 110, width: 185, height: 155 } },
      { id: "P2", name: "Pump Bearing Cartridge Assembly", health: 99, status: "Normal", bbox: { x: 325, y: 135, width: 195, height: 110 } },
      { id: "P3", name: "Slurry Volute & Gland Seal Chamber", health: 98, status: "Normal", bbox: { x: 540, y: 85, width: 345, height: 185 } },
    ],
    hotspots: [
      { id: "MOTOR-DE-TEMP", label: "Motor DE Bearing Temperature (P1)", parameter: "MOTOR-DE-TEMP", value: "24.1", unit: "°C", status: "Normal", x: 24.0, y: 48.0, component: "Drive Motor M-104 (1,200 kW)" },
      { id: "PUMP-BEAR-VIB", label: "Pump Bearing Vibration RMS (P2)", parameter: "PUMP-BEAR-VIB", value: "0.00", unit: "mm/s", status: "Normal", x: 42.0, y: 50.0, component: "Pump Bearing Cartridge Assembly" },
      { id: "GLAND-WATER-PRESS", label: "Gland Seal Water Pressure (P3)", parameter: "GLAND-WATER-PRESS", value: "4.80", unit: "bar", status: "Normal", x: 56.0, y: 52.0, component: "Slurry Volute & Gland Seal Chamber" },
      { id: "DISCH-PRESS", label: "Slurry Discharge Pressure (P3)", parameter: "DISCH-PRESS", value: "0.00", unit: "bar", status: "Normal", x: 76.0, y: 30.0, component: "Slurry Volute & Gland Seal Chamber" },
    ],
  },
  {
    id: "HP-PUMP-01",
    name: "Triplex Diaphragm Slurry Pump HP-PUMP-01",
    plantId: "plant-hyd",
    area: "High-Pressure Leaching & Slurry Autoclave",
    processCell: "Autoclave Slurry Injection",
    type: "Positive-Displacement Piston-Diaphragm Pump",
    manufacturer: "GEHO / Weir Minerals",
    model: "TZPM 2000 Triplex (1,600 kW)",
    serialNumber: "SN-GEHO-TZPM-2021-01",
    commissioned: "2021-05-19",
    location: "Autoclave Feed Bay 1",
    coordinates: "12°58'04\"S 28°38'19\"E",
    powerRating: "1,600 kW MV VFD",
    operatingSpeed: "60.0 SPM (990 RPM Motor)",
    criticality: "A (Critical)",
    status: "Operational",
    health: 95,
    sapEquipmentId: "EQ-HYD-HPP-01",
    floc: "FLOC-HYD-LEACH-HPP01",
    costCenter: "CC-5100-LEACHING",
    plant: "Ndola Hydrometallurgy & Utilities Plant",
    workCenter: "WC-MECH-HYD",
    signalsCount: 3,
    diagramType: "pump",
    parts: [
      { id: "P1", name: "Main MV Drive Motor (1,600 kW)", health: 97, status: "Normal", bbox: { x: 115, y: 110, width: 185, height: 155 } },
      { id: "P2", name: "Triplex Crank Drive & Crosshead", health: 95, status: "Normal", bbox: { x: 325, y: 135, width: 195, height: 110 } },
      { id: "P3", name: "Diaphragm Chamber & Check-Valve Manifold", health: 94, status: "Normal", bbox: { x: 540, y: 85, width: 345, height: 185 } },
    ],
    hotspots: [
      { id: "CRANK-VIB-RMS", label: "Crankshaft Bearing Vibration RMS (P2)", parameter: "CRANK-VIB-RMS", value: "1.65", unit: "mm/s", status: "Normal", x: 42.0, y: 50.0, component: "Triplex Crank Drive & Crosshead" },
      { id: "DIAPH-DISP", label: "Diaphragm Stroke Displacement (P3)", parameter: "DIAPH-DISP", value: "18.2", unit: "mm", status: "Normal", x: 63.0, y: 52.0, component: "Diaphragm Chamber & Check-Valve Manifold" },
      { id: "INJECT-PRESS", label: "Autoclave Injection Pressure (P3)", parameter: "INJECT-PRESS", value: "48.2", unit: "bar", status: "Normal", x: 78.0, y: 30.0, component: "Diaphragm Chamber & Check-Valve Manifold" },
    ],
  },
  {
    id: "AGIT-01",
    name: "Leach Vessel Slurry Agitator AGIT-01",
    plantId: "plant-hyd",
    area: "High-Pressure Leaching & Slurry Autoclave",
    processCell: "Leach Tank Agitation",
    type: "Top-Entry Heavy Slurry Agitator",
    manufacturer: "Lightnin / SPX Flow",
    model: "Series 800 Helical-Bevel (185 kW)",
    serialNumber: "SN-SPX-AGIT-2021-01",
    commissioned: "2021-06-08",
    location: "Leach Vessel TK-101 Top Bridge",
    coordinates: "12°58'07\"S 28°38'22\"E",
    powerRating: "185 kW 4-Pole",
    operatingSpeed: "85 RPM Shaft (1,485 RPM Motor)",
    criticality: "B (Essential)",
    status: "Operational",
    health: 97,
    sapEquipmentId: "EQ-HYD-AGIT-01",
    floc: "FLOC-HYD-LEACH-AGIT01",
    costCenter: "CC-5100-LEACHING",
    plant: "Ndola Hydrometallurgy & Utilities Plant",
    workCenter: "WC-MECH-HYD",
    signalsCount: 3,
    diagramType: "pump",
    parts: [
      { id: "P1", name: "Induction Drive Motor (185 kW)", health: 98, status: "Normal", bbox: { x: 115, y: 110, width: 185, height: 155 } },
      { id: "P2", name: "Helical Gearbox Drive", health: 96, status: "Normal", bbox: { x: 325, y: 135, width: 195, height: 110 } },
      { id: "P3", name: "Mechanical Seal & Shaft", health: 97, status: "Normal", bbox: { x: 540, y: 85, width: 345, height: 185 } },
    ],
    hotspots: [
      { id: "GEAR-HS-VIB", label: "Gearbox High-Speed Stage Vibration (P2)", parameter: "GEAR-HS-VIB", value: "1.82", unit: "mm/s", status: "Normal", x: 42.0, y: 48.0, component: "Helical Gearbox Drive" },
      { id: "SEAL-TEMP", label: "Mechanical Seal Barrier Fluid Temp (P3)", parameter: "SEAL-TEMP", value: "68.5", unit: "°C", status: "Normal", x: 56.0, y: 52.0, component: "Mechanical Seal & Shaft" },
      { id: "SHAFT-RUNOUT", label: "Agitator Overhung Shaft Runout (P3)", parameter: "SHAFT-RUNOUT", value: "0.28", unit: "mm", status: "Normal", x: 66.0, y: 48.0, component: "Mechanical Seal & Shaft" },
    ],
  },
  {
    id: "PMP-101",
    name: "Process Water Circulation Pump PMP-101",
    plantId: "plant-hyd",
    area: "Process Water & Aeration Utilities",
    processCell: "Process Water Circulation",
    type: "Horizontal End-Suction Process Pump",
    manufacturer: "Sulzer",
    model: "AHLSTAR A33-150 (110 kW)",
    serialNumber: "SN-SUL-PMP101-2021-01",
    commissioned: "2021-06-15",
    location: "Utility Pumphouse Bay 1",
    coordinates: "12°58'11\"S 28°38'25\"E",
    powerRating: "110 kW VFD",
    operatingSpeed: "1,450 RPM",
    criticality: "B (Essential)",
    status: "Advisory",
    health: 74,
    sapEquipmentId: "EQ-HYD-PMP-101",
    floc: "FLOC-HYD-UTIL-PMP101",
    costCenter: "CC-5200-UTILITIES",
    plant: "Ndola Hydrometallurgy & Utilities Plant",
    workCenter: "WC-MECH-UTIL",
    activeWorkOrder: "WO-2026-PMP-108",
    signalsCount: 6,
    diagramType: "pump",
    parts: [
      { id: "P1", name: "Drive Motor M-101", health: 80, status: "Advisory", bbox: { x: 115, y: 110, width: 185, height: 155 }, criticalNotes: "Motor current at 18.0 A above 16.5 A warning." },
      { id: "P2", name: "Drive-End Bearing Assembly B-101", health: 68, status: "Advisory", bbox: { x: 325, y: 135, width: 195, height: 110 }, criticalNotes: "Outer-race BPFO defect energy 3.50 mm/s and bearing temp 72.0 °C." },
      { id: "P3", name: "Coupling & Seal Housing", health: 92, status: "Normal", bbox: { x: 500, y: 145, width: 65, height: 90 } },
      { id: "P4", name: "Discharge & Water Circulation", health: 75, status: "Advisory", bbox: { x: 565, y: 85, width: 325, height: 185 }, criticalNotes: "Flow reduced to 70 m³/h from strainer resistance." },
    ],
    hotspots: [
      { id: "ELE-PMP-01", label: "Motor Stator Current (P1)", parameter: "ELE-PMP-01", value: "18.0", unit: "A", status: "Advisory", x: 18.0, y: 45.0, component: "Drive Motor M-101" },
      { id: "SPD-PMP-01", label: "Pump Operating Speed (P1)", parameter: "SPD-PMP-01", value: "1450", unit: "RPM", status: "Normal", x: 25.0, y: 55.0, component: "Drive Motor M-101" },
      { id: "VIB-PMP-01", label: "Bearing B-101 Vibration RMS (P2)", parameter: "VIB-PMP-01", value: "3.50", unit: "mm/s", status: "Advisory", x: 40.0, y: 48.0, component: "Drive-End Bearing Assembly B-101" },
      { id: "TMP-PMP-01", label: "Bearing B-101 Temperature (P2)", parameter: "TMP-PMP-01", value: "72.0", unit: "°C", status: "Advisory", x: 46.0, y: 56.0, component: "Drive-End Bearing Assembly B-101" },
      { id: "PRS-PMP-01", label: "Pump Discharge Pressure (P4)", parameter: "PRS-PMP-01", value: "5.20", unit: "bar", status: "Normal", x: 63.0, y: 48.0, component: "Discharge & Water Circulation" },
      { id: "FLO-PMP-01", label: "Water Circulation Flow Rate (P4)", parameter: "FLO-PMP-01", value: "70.0", unit: "m³/h", status: "Advisory", x: 78.0, y: 30.0, component: "Discharge & Water Circulation" },
    ],
  },
  {
    id: "BLOW-03",
    name: "Centrifugal Process Air Blower BLOW-03",
    plantId: "plant-hyd",
    area: "Process Water & Aeration Utilities",
    processCell: "Flotation & Oxidation Air Supply",
    type: "Single-Stage Integrally Geared Turbo Blower",
    manufacturer: "Howden / Siemens",
    model: "SG-75 Turbo Blower (450 kW)",
    serialNumber: "SN-HOW-BLOW-2022-03",
    commissioned: "2022-01-20",
    location: "Compressor House Bay 3",
    coordinates: "12°58'14\"S 28°38'29\"E",
    powerRating: "450 kW MV",
    operatingSpeed: "2,980 RPM Motor / 14,200 RPM Impeller",
    criticality: "B (Essential)",
    status: "Operational",
    health: 98,
    sapEquipmentId: "EQ-HYD-BLOW-03",
    floc: "FLOC-HYD-UTIL-BLOW03",
    costCenter: "CC-5200-UTILITIES",
    plant: "Ndola Hydrometallurgy & Utilities Plant",
    workCenter: "WC-MECH-UTIL",
    signalsCount: 4,
    diagramType: "blower",
    parts: [
      { id: "P1", name: "High-Speed Drive Motor (450 kW)", health: 98, status: "Normal", bbox: { x: 115, y: 110, width: 185, height: 155 } },
      { id: "P2", name: "Shaft & Bearing Pedestal", health: 98, status: "Normal", bbox: { x: 325, y: 145, width: 195, height: 95 } },
      { id: "P3", name: "Impeller Volute Casing", health: 97, status: "Normal", bbox: { x: 535, y: 55, width: 310, height: 220 } },
    ],
    hotspots: [
      { id: "MOTOR-DE-VIB", label: "Motor DE Bearing Vibration (P1)", parameter: "MOTOR-DE-VIB", value: "1.45", unit: "mm/s", status: "Normal", x: 22.0, y: 48.0, component: "High-Speed Drive Motor (450 kW)" },
      { id: "COUPLING-VIB", label: "Spacer Coupling Vibration RMS (P2)", parameter: "COUPLING-VIB", value: "1.20", unit: "mm/s", status: "Normal", x: 38.0, y: 50.0, component: "Shaft & Bearing Pedestal" },
      { id: "BEAR-TEMP-IB", label: "Inboard Thrust Bearing Temp (P2)", parameter: "BEAR-TEMP-IB", value: "51.2", unit: "°C", status: "Normal", x: 45.0, y: 52.0, component: "Shaft & Bearing Pedestal" },
      { id: "AIR-TEMP-DISCH", label: "Blower Discharge Air Temp (P3)", parameter: "AIR-TEMP-DISCH", value: "78.4", unit: "°C", status: "Normal", x: 76.0, y: 24.0, component: "Impeller Volute Casing" },
    ],
  },
];

export interface MappedSignal {
  id: string;
  machineId: string;
  tag: string;
  instrument: string;
  sensorType: string;
  edgeRack: string;
  cardSlot: string;
  modbusAddress: string;
  currentValue: string;
  unit: string;
  quality: "100% Good" | "98% Good" | "Degraded";
  sampleRate: string;
  status: "Normal" | "Advisory" | "Critical";
}

export const MAPPED_SIGNALS: MappedSignal[] = [
  {
    id: "SIG-KLN-01",
    machineId: "KLN-01",
    tag: "DRV-KLN-01-VIB-01",
    instrument: "IEPE Dynamic Accelerometer (100 mV/g)",
    sensorType: "High-Freq Vibration RMS",
    edgeRack: "ULTRON-EDGE-KLN01",
    cardSlot: "Slot 01 (DAQ-IEPE-01)",
    modbusAddress: "40011 (Float32)",
    currentValue: "1.42",
    unit: "mm/s",
    quality: "100% Good",
    sampleRate: "25.6 kS/s",
    status: "Normal",
  },
  {
    id: "SIG-KLN-02",
    machineId: "KLN-01",
    tag: "DRV-KLN-01-TMP-21",
    instrument: "Duplex Pt100 RTD Class A 3-Wire",
    sensorType: "Motor Stator Winding Temperature",
    edgeRack: "ULTRON-EDGE-KLN01",
    cardSlot: "Slot 05 (PLC-RTD-01)",
    modbusAddress: "40121 (Int16)",
    currentValue: "88.4",
    unit: "°C",
    quality: "100% Good",
    sampleRate: "10 s Continuous",
    status: "Normal",
  },
  {
    id: "SIG-KLN-03",
    machineId: "KLN-01",
    tag: "DRV-KLN-01-ELE-01",
    instrument: "ABB MV VFD Power Transmitter",
    sensorType: "Torque / Inverter Current Feedback",
    edgeRack: "ULTRON-EDGE-KLN01",
    cardSlot: "Slot 12 (PLC-VFD-01)",
    modbusAddress: "40001 (Float32)",
    currentValue: "62.1",
    unit: "%",
    quality: "100% Good",
    sampleRate: "1 s Synchronous",
    status: "Normal",
  },
  {
    id: "SIG-KLN-04",
    machineId: "KLN-01",
    tag: "DRV-KLN-01-VIB-04",
    instrument: "IEPE Dynamic Accelerometer (100 mV/g)",
    sensorType: "Pinion Bearing Mesh Vibration",
    edgeRack: "ULTRON-EDGE-KLN01",
    cardSlot: "Slot 04 (DAQ-IEPE-01)",
    modbusAddress: "40017 (Float32)",
    currentValue: "2.10",
    unit: "mm/s",
    quality: "100% Good",
    sampleRate: "25.6 kS/s",
    status: "Normal",
  },
  {
    id: "SIG-KLN-05",
    machineId: "KLN-01",
    tag: "SUP-KLN-01-TMP-05",
    instrument: "Duplex Pt100 RTD Class A",
    sensorType: "Station 2 Left Bearing Temperature",
    edgeRack: "ULTRON-EDGE-KLN01",
    cardSlot: "Slot 05 (PLC-RTD-02)",
    modbusAddress: "40205 (Int16)",
    currentValue: "54.2",
    unit: "°C",
    quality: "100% Good",
    sampleRate: "10 s Continuous",
    status: "Normal",
  },
  {
    id: "SIG-KLN-06",
    machineId: "KLN-01",
    tag: "SUP-KLN-01-PRS-07",
    instrument: "WIKA S-20 Isolated 4-20mA HART",
    sensorType: "Hydraulic Thrust Cylinder Pressure",
    edgeRack: "ULTRON-EDGE-KLN01",
    cardSlot: "Slot 11 (PLC-HART-01)",
    modbusAddress: "40207 (Float32)",
    currentValue: "86.4",
    unit: "bar",
    quality: "100% Good",
    sampleRate: "1 s Continuous",
    status: "Normal",
  },
  {
    id: "SIG-KLN-07",
    machineId: "KLN-01",
    tag: "SUP-KLN-01-POS-01",
    instrument: "Penny & Giles Inductive LVDT",
    sensorType: "Kiln Axial Float Position",
    edgeRack: "ULTRON-EDGE-KLN01",
    cardSlot: "Slot 12 (PLC-LVDT-01)",
    modbusAddress: "40501 (Float32)",
    currentValue: "-3.1",
    unit: "mm",
    quality: "100% Good",
    sampleRate: "1 s (±0.5 mm)",
    status: "Normal",
  },
  {
    id: "SIG-KLN-08",
    machineId: "KLN-01",
    tag: "SHL-KLN-01-CAL-03",
    instrument: "CemScanner Optical 360° Matrix",
    sensorType: "Shell Maximum Temperature Derived",
    edgeRack: "ULTRON-EDGE-KLN01",
    cardSlot: "Slot 03 (ANALYTICS-CORE)",
    modbusAddress: "40703 (Float32)",
    currentValue: "327.0",
    unit: "°C",
    quality: "100% Good",
    sampleRate: "1 min Real-Time",
    status: "Normal",
  },
  {
    id: "SIG-KLN-09",
    machineId: "KLN-01",
    tag: "SHL-KLN-01-CAL-07",
    instrument: "Kinematic Seal Geometry Algorithm",
    sensorType: "Inlet Seal Overlap Travel Margin",
    edgeRack: "ULTRON-EDGE-KLN01",
    cardSlot: "Slot 05 (ANALYTICS-CORE)",
    modbusAddress: "40707 (Float32)",
    currentValue: "37.0",
    unit: "mm",
    quality: "100% Good",
    sampleRate: "100 ms Continuous",
    status: "Normal",
  },
  {
    id: "SIG-KLN-10",
    machineId: "KLN-01",
    tag: "PRC-KLN-01-GAS-01",
    instrument: "ABB AO2000 Paramagnetic Analyser",
    sensorType: "Inlet Flue Gas O₂ Concentration",
    edgeRack: "ULTRON-EDGE-KLN01",
    cardSlot: "Slot 01 (DAQ-GAS-MOD)",
    modbusAddress: "40301 (Float32)",
    currentValue: "2.59",
    unit: "vol%",
    quality: "100% Good",
    sampleRate: "5 s Continuous",
    status: "Normal",
  },
  {
    id: "SIG-KLN-11",
    machineId: "KLN-01",
    tag: "PRC-KLN-01-TMP-13",
    instrument: "Duplex Type K Immersion Thermocouple",
    sensorType: "Kiln-Inlet Riser Gas Temperature",
    edgeRack: "ULTRON-EDGE-KLN01",
    cardSlot: "Slot 03 (PLC-TC-01)",
    modbusAddress: "40313 (Float32)",
    currentValue: "1086",
    unit: "°C",
    quality: "100% Good",
    sampleRate: "1 s Continuous",
    status: "Normal",
  },
  {
    id: "SIG-KLN-12",
    machineId: "KLN-01",
    tag: "KLN-01-MASTER-HEALTH",
    instrument: "OSWARteck Kiln Reference System",
    sensorType: "Master Pyroprocessing Health Vector",
    edgeRack: "ULTRON-EDGE-KLN01",
    cardSlot: "Slot 01 (ULTRON-GW-IPC)",
    modbusAddress: "40901 (Float32)",
    currentValue: "98.0",
    unit: "%",
    quality: "100% Good",
    sampleRate: "1 s Synchronous",
    status: "Normal",
  },
];

export interface OperatingEvent {
  id: string;
  machineId: string;
  timestamp: string;
  type: "Telemetry Advisory" | "Maintenance Log" | "Operating Change" | "Inspection";
  severity: "Normal" | "Advisory" | "Critical";
  title: string;
  description: string;
  source: string;
}

export const OPERATING_EVENTS: OperatingEvent[] = [
  {
    id: "EVT-KLN-01",
    machineId: "KLN-01",
    timestamp: "Today, 14:15 UTC",
    type: "Telemetry Advisory",
    severity: "Normal",
    title: "Overall Pyroprocessing Telemetry Harmonization",
    description: "All 46 continuous sensors across Drive, Support, Shell & Process synchronized to IEEE 1588 PTP grandmaster clock (±0.8 ms latency, zero packet loss).",
    source: "ULTRON Edge OS Gateway IPC",
  },
  {
    id: "EVT-KLN-02",
    machineId: "KLN-01",
    timestamp: "Yesterday, 11:30 UTC",
    type: "Operating Change",
    severity: "Normal",
    title: "Nominal 5,000 t/d Clinker Production Baseline Set",
    description: "Kiln operating recipe steady: feed 330 t/h, fuel 10.58 t/h, speed 3.80 RPM, burning zone 1,448 °C, clinker production 208 t/h.",
    source: "Yokogawa DCS Pyro Controller",
  },
  {
    id: "EVT-KLN-03",
    machineId: "KLN-01",
    timestamp: "Today, 08:30 UTC",
    type: "Maintenance Log",
    severity: "Normal",
    title: "Automated Girth Gear Spray Lubrication Pulse Completed",
    description: "Automatic spray skid STS-05 injected 120g high-viscosity synthetic open-gear lubricant across 128 teeth during 15-minute barring cycle. Delivery pressure 4.2 bar nominal.",
    source: "Lincoln Centro-Matic PLC Skid",
  },
  {
    id: "EVT-KLN-04",
    machineId: "KLN-01",
    timestamp: "Yesterday, 16:45 UTC",
    type: "Telemetry Advisory",
    severity: "Normal",
    title: "Motor Drive-End Vibration Spectral Scan (VIB-01)",
    description: "IEPE dynamic accelerometer recorded 1.42 mm/s RMS. Synchronous 1X motor rotational peak (16.5 Hz) safely inside ISO 20816-3 Zone A (< 2.5 mm/s).",
    source: "AssetIQ Vibration Engine v4.2",
  },
  {
    id: "EVT-KLN-05",
    machineId: "KLN-01",
    timestamp: "3 days ago",
    type: "Inspection",
    severity: "Normal",
    title: "Gearbox Forced-Lube Oil Filter Differential Verified",
    description: "Sump oil temperature 54.8 °C; supply pressure 2.24 bar; duplex 25 µm filter differential clean at 0.18 bar (alarm threshold > 0.8 bar).",
    source: "Lube Skid Inspection Tech",
  },
  {
    id: "EVT-KLN-06",
    machineId: "KLN-01",
    timestamp: "Today, 06:20 UTC",
    type: "Operating Change",
    severity: "Normal",
    title: "Station 2 Hydraulic Thrust Float Cycle Logged",
    description: "LVDT axial float cycled between -18.2 mm (downhill) and +16.4 mm (uphill) over 4.2 hours. Hydraulic thrust pressure steady at 86.4 bar.",
    source: "Station 2 Thrust PLC Controller",
  },
  {
    id: "EVT-KLN-07",
    machineId: "KLN-01",
    timestamp: "Yesterday, 19:10 UTC",
    type: "Telemetry Advisory",
    severity: "Normal",
    title: "Support Roller Bearing Pair Temperature Audit",
    description: "All 12 Pt100 RTDs normal (46.2 °C – 55.4 °C). Maximum bearing pair split across Stations 1, 2, and 3 measured at 2.4 K, well below 10 K advisory limit.",
    source: "ULTRON Thermal Telemetry Module",
  },
  {
    id: "EVT-KLN-08",
    machineId: "KLN-01",
    timestamp: "4 days ago",
    type: "Inspection",
    severity: "Normal",
    title: "Station 2 Safety Travel Limit Switches Verified",
    description: "Pepperl+Fuchs inductive sensors POS-KLN-02 confirmed CLEAR at ±40 mm travel stops; emergency hydraulic dump interlock validated.",
    source: "Safety Instrument Systems SIS Crew",
  },
  {
    id: "EVT-KLN-09",
    machineId: "KLN-01",
    timestamp: "Today, 10:00 UTC",
    type: "Telemetry Advisory",
    severity: "Normal",
    title: "CemScanner 360° Infrared Shell Thermal Map Updated",
    description: "Full 74m shell surface scan completed; peak burning zone outer casing temperature nominal at 327 °C (alarm threshold 420 °C); scanner coverage 98.4%.",
    source: "CemScanner Optical Gateway",
  },
  {
    id: "EVT-KLN-10",
    machineId: "KLN-01",
    timestamp: "Yesterday, 14:00 UTC",
    type: "Inspection",
    severity: "Normal",
    title: "Inlet Lamella Seal Travel Overlap Verification",
    description: "Kinematic overlap margin measured at 37.0 mm (warning limit < 10 mm); inlet false-air index CAL-KLN-06 nominal at 0.18 vol%.",
    source: "Mechanical Maintenance Team",
  },
  {
    id: "EVT-KLN-11",
    machineId: "KLN-01",
    timestamp: "2 days ago",
    type: "Operating Change",
    severity: "Normal",
    title: "Discharge Hood Static Pressure Draft Maintained",
    description: "Outlet seal cooling blower fan STS-KLN-10 RUNNING; hood draft static pressure negative at -0.29 mbar; zero dust blowout observed.",
    source: "Pyro Operations Ledger",
  },
  {
    id: "EVT-KLN-12",
    machineId: "KLN-01",
    timestamp: "Today, 12:40 UTC",
    type: "Maintenance Log",
    severity: "Normal",
    title: "Inlet Gas Analyser Automated Blowback Purge Cycle",
    description: "Periodic 6 bar instrument air back-flush executed through ceramic sample probe filter; STS-KLN-06 state returned to OK without signal loss.",
    source: "ABB Gas Analyser Shelter PLC",
  },
  {
    id: "EVT-KLN-13",
    machineId: "KLN-01",
    timestamp: "Yesterday, 07:15 UTC",
    type: "Telemetry Advisory",
    severity: "Normal",
    title: "Stoichiometric Oxygen Combustion Model Verification",
    description: "Paramagnetic cell measured 2.59 vol% inlet O₂; mass-energy stoichiometric model residual ΔO₂ is +0.02 vol%, confirming optimal excess air ratio.",
    source: "OSWARteck Kiln Reference Model",
  },
  {
    id: "EVT-KLN-14",
    machineId: "KLN-01",
    timestamp: "3 days ago",
    type: "Inspection",
    severity: "Normal",
    title: "Riser Duct Static Draft Stability Audit",
    description: "Differential draft transmitter PRS-KLN-01 confirmed steady negative suction at -3.82 mbar; preheater ID fan damper at 68.4%.",
    source: "Process Engineering Field Audit",
  },
  {
    id: "EVT-CRUSH-01",
    machineId: "CRUSH-01",
    timestamp: "Today, 09:40 UTC",
    type: "Telemetry Advisory",
    severity: "Normal",
    title: "Hydroset Support Pressure & CSS Calibration Verified",
    description: "Hydroset support pressure steady at 168 bar under 4,200 t/h ROM ore dump cycle; main shaft axial position nominal at 0.34 mm.",
    source: "ULTRON Rack C1 Edge Analytics",
  },
  {
    id: "EVT-CONV-01",
    machineId: "CONV-04",
    timestamp: "Yesterday, 15:20 UTC",
    type: "Inspection",
    severity: "Normal",
    title: "Magnetic Steel-Cord Belt Splice Scan Completed",
    description: "Full 4.8 km overland belt loop scanned across all 14 vulcanized splices; cord integrity verified at 100% with zero broken cables.",
    source: "Belt Rip Scanner PLC",
  },
  {
    id: "EVT-SAG-01",
    machineId: "SAG-01",
    timestamp: "Today, 11:05 UTC",
    type: "Operating Change",
    severity: "Normal",
    title: "Twin-Pinion Load Share & Trunnion Film Audit",
    description: "Dual 9 MW synchronous drive load split balanced within 0.4%; feed and discharge hydrostatic trunnion bearings steady at 61.4 °C and 62.8 °C.",
    source: "ULTRON Rack G4 Mill Controller",
  },
  {
    id: "EVT-BALL02-01",
    machineId: "BALL-02",
    timestamp: "Today, 13:10 UTC",
    type: "Telemetry Advisory",
    severity: "Advisory",
    title: "Pinion DE Bearing BPFO Harmonics & Feed Trunnion Temp Rise",
    description: "Pinion DE accelerometer PINION-ACC-RMS reached 4.12 mm/s (warning 3.5 mm/s) with 98.4 Hz outer-race BPFO sidebands; feed trunnion bearing temperature elevated at 76.8 °C.",
    source: "AssetIQ Vibration Engine v4.2",
  },
  {
    id: "EVT-BALL02-02",
    machineId: "BALL-02",
    timestamp: "Yesterday, 18:00 UTC",
    type: "Maintenance Log",
    severity: "Advisory",
    title: "Work Order WO-2026-BALL-412 Raised for Pinion Bearing & Lube Cooler",
    description: "Scheduled feed-trunnion oil cooler flush and pinion DE spherical roller bearing replacement for upcoming concentrator maintenance window.",
    source: "Reliability Engineering Team",
  },
  {
    id: "EVT-BALL03-01",
    machineId: "BALL-03",
    timestamp: "Yesterday, 10:15 UTC",
    type: "Inspection",
    severity: "Normal",
    title: "Ultrasonic Shell Liner Bolt Torque & Ovality Check",
    description: "Laser shell displacement sensor reading 0.18 mm nominal; zero liner bolt looseness detected across feed and shell rows.",
    source: "Comminution Reliability Crew",
  },
  {
    id: "EVT-PUMP104-01",
    machineId: "PUMP-104",
    timestamp: "2 days ago",
    type: "Maintenance Log",
    severity: "Normal",
    title: "Weekly Standby Shaft Barring & Gland Seal Pressure Verification",
    description: "Standby cyclone underflow pump rotated 4.5 turns to prevent false brinelling; gland seal water held at 4.80 bar.",
    source: "Concentrator Area Operator",
  },
  {
    id: "EVT-HPP-01",
    machineId: "HP-PUMP-01",
    timestamp: "Today, 07:50 UTC",
    type: "Telemetry Advisory",
    severity: "Normal",
    title: "Triplex Diaphragm Stroke & Autoclave Injection Pressure Audit",
    description: "All three propelling-fluid chambers balanced at 18.2 mm stroke; autoclave discharge pressure steady at 48.2 bar.",
    source: "Hydromet Autoclave DCS",
  },
  {
    id: "EVT-AGIT-01",
    machineId: "AGIT-01",
    timestamp: "Yesterday, 13:45 UTC",
    type: "Inspection",
    severity: "Normal",
    title: "Mechanical Seal Thermosiphon Pot & Barrier Fluid Check",
    description: "Seal barrier fluid temperature steady at 68.5 °C; overhung shaft runout 0.28 mm within 0.40 mm limit.",
    source: "Leach Area Mechanical Tech",
  },
  {
    id: "EVT-PMP101-01",
    machineId: "PMP-101",
    timestamp: "Today, 12:20 UTC",
    type: "Telemetry Advisory",
    severity: "Advisory",
    title: "Drive-End Bearing B-101 Outer-Race Defect & Strainer Restriction",
    description: "Bearing vibration rose to 3.50 mm/s (ISO Group 2 Zone C) with 74.2 Hz BPFO peak and 72.0 °C bearing temperature; circulation flow dropped to 70 m³/h.",
    source: "AssetIQ Vibration Engine v4.2",
  },
  {
    id: "EVT-BLOW-01",
    machineId: "BLOW-03",
    timestamp: "Today, 08:05 UTC",
    type: "Telemetry Advisory",
    severity: "Normal",
    title: "Turbo Blower Anti-Surge Margin & Tilting-Pad Thrust Audit",
    description: "Inboard thrust pad steady at 51.2 °C; coupling vibration 1.20 mm/s; discharge air 78.4 °C with 24% surge margin.",
    source: "Utilities Compressor PLC",
  },
];

export interface SapEquipmentRecord {
  machineId: string;
  sapNumber: string;
  floc: string;
  description: string;
  plant: string;
  workCenter: string;
  costCenter: string;
  activeWorkOrder?: string;
  nextScheduledPm: string;
  syncState: "Synced" | "Pending Approval";
}

export const SAP_EQUIPMENT_RECORDS: SapEquipmentRecord[] = [
  {
    machineId: "KLN-01",
    sapNumber: "EQ-10041-A",
    floc: "FLOC-PYRO-KLN-01-MAIN",
    description: "ROTARY KILN DIA 4.8M X 74M PYROPROCESSING LINE",
    plant: "Demo Cement Plant — Pyro Line (KLN-01)",
    workCenter: "WC-MECH-PYRO",
    costCenter: "CC-3100-CLINKER",
    activeWorkOrder: "WO-2026-88014",
    nextScheduledPm: "2026-11-20 (Annual Outage & Shell Alignment)",
    syncState: "Synced",
  },
  {
    machineId: "CRUSH-01",
    sapNumber: "EQ-20101-A",
    floc: "FLOC-CONC-CRSH-GYR01",
    description: "PRIMARY GYRATORY CRUSHER METSO SUPERIOR 60-113",
    plant: "Kansanshi Copper Concentrator & Comminution Plant",
    workCenter: "WC-MECH-CRUSH",
    costCenter: "CC-4100-CRUSHING",
    nextScheduledPm: "2026-10-28 (Concave Liner Wear & Spider Bushing Check)",
    syncState: "Synced",
  },
  {
    machineId: "CONV-04",
    sapNumber: "EQ-20104-B",
    floc: "FLOC-CONC-MAT-CONV04",
    description: "OVERLAND STEEL-CORD CONVEYOR ST-3150 X 1800MM",
    plant: "Kansanshi Copper Concentrator & Comminution Plant",
    workCenter: "WC-MECH-CONV",
    costCenter: "CC-4100-CRUSHING",
    nextScheduledPm: "2026-11-05 (Head Pulley Lagging & Reducer Oil Sample)",
    syncState: "Synced",
  },
  {
    machineId: "SAG-01",
    sapNumber: "EQ-20201-A",
    floc: "FLOC-CONC-GRND-SAG01",
    description: "PRIMARY SAG MILL 38X20FT TWIN-PINION 18MW",
    plant: "Kansanshi Copper Concentrator & Comminution Plant",
    workCenter: "WC-MECH-MILLS",
    costCenter: "CC-4200-GRINDING",
    nextScheduledPm: "2026-11-12 (Shell Lifter Relining & Trunnion Inspection)",
    syncState: "Synced",
  },
  {
    machineId: "BALL-02",
    sapNumber: "EQ-20202-A",
    floc: "FLOC-CONC-GRND-BALL02",
    description: "SECONDARY OVERFLOW BALL MILL 26X42FT 13MW #2",
    plant: "Kansanshi Copper Concentrator & Comminution Plant",
    workCenter: "WC-MECH-MILLS",
    costCenter: "CC-4200-GRINDING",
    activeWorkOrder: "WO-2026-BALL-412",
    nextScheduledPm: "2026-10-21 (Pinion DE Bearing Replacement & Lube Flush)",
    syncState: "Pending Approval",
  },
  {
    machineId: "BALL-03",
    sapNumber: "EQ-20203-A",
    floc: "FLOC-CONC-GRND-BALL03",
    description: "SECONDARY OVERFLOW BALL MILL 26X42FT 13MW #3",
    plant: "Kansanshi Copper Concentrator & Comminution Plant",
    workCenter: "WC-MECH-MILLS",
    costCenter: "CC-4200-GRINDING",
    nextScheduledPm: "2026-12-02 (Quarterly Girth Gear Thermography & Oil Audit)",
    syncState: "Synced",
  },
  {
    machineId: "PUMP-104",
    sapNumber: "EQ-20214-B",
    floc: "FLOC-CONC-CYC-PMP104",
    description: "WARMAN MCR 550 CYCLONE UNDERFLOW SLURRY PUMP (STANDBY)",
    plant: "Kansanshi Copper Concentrator & Comminution Plant",
    workCenter: "WC-MECH-PUMPS",
    costCenter: "CC-4200-GRINDING",
    nextScheduledPm: "2026-10-30 (Monthly Standby Load Swap & Wet-End Check)",
    syncState: "Synced",
  },
  {
    machineId: "HP-PUMP-01",
    sapNumber: "EQ-30101-A",
    floc: "FLOC-HYD-LEACH-HPP01",
    description: "GEHO TZPM 2000 TRIPLEX PISTON-DIAPHRAGM AUTOCLAVE PUMP",
    plant: "Ndola Hydrometallurgy & Utilities Plant",
    workCenter: "WC-MECH-HYD",
    costCenter: "CC-5100-LEACHING",
    nextScheduledPm: "2026-11-08 (Check-Valve Cone & Diaphragm Precharge Audit)",
    syncState: "Synced",
  },
  {
    machineId: "AGIT-01",
    sapNumber: "EQ-30105-B",
    floc: "FLOC-HYD-LEACH-AGIT01",
    description: "LIGHTNIN SERIES 800 TOP-ENTRY LEACH SLURRY AGITATOR",
    plant: "Ndola Hydrometallurgy & Utilities Plant",
    workCenter: "WC-MECH-HYD",
    costCenter: "CC-5100-LEACHING",
    nextScheduledPm: "2026-11-18 (Mechanical Seal Barrier Pot & Gearbox Oil Check)",
    syncState: "Synced",
  },
  {
    machineId: "PMP-101",
    sapNumber: "EQ-30201-B",
    floc: "FLOC-HYD-UTIL-PMP101",
    description: "SULZER AHLSTAR A33-150 PROCESS WATER CIRCULATION PUMP",
    plant: "Ndola Hydrometallurgy & Utilities Plant",
    workCenter: "WC-MECH-UTIL",
    costCenter: "CC-5200-UTILITIES",
    activeWorkOrder: "WO-2026-PMP-108",
    nextScheduledPm: "2026-10-19 (Bearing B-101 Replacement & Suction Strainer Clean)",
    syncState: "Pending Approval",
  },
  {
    machineId: "BLOW-03",
    sapNumber: "EQ-30208-B",
    floc: "FLOC-HYD-UTIL-BLOW03",
    description: "HOWDEN SG-75 INTEGRALLY GEARED CENTRIFUGAL AIR BLOWER",
    plant: "Ndola Hydrometallurgy & Utilities Plant",
    workCenter: "WC-MECH-UTIL",
    costCenter: "CC-5200-UTILITIES",
    nextScheduledPm: "2026-11-25 (Inlet Suction Filter & Anti-Surge Valve Calibration)",
    syncState: "Synced",
  },
];

/* ==========================================================================
   DIAGNOSIS DOMAIN DATA
   ========================================================================== */

export interface SpectralFinding {
  id: string;
  fault: string;
  probability: number;
  location: string;
  frequency: string;
  severity: "Normal" | "Advisory" | "Critical";
  recommendation: string;
}

export interface DiagnosisRecord {
  machineId: string;
  overallCondition: "Nominal" | "Advisory" | "Critical";
  confidence: number;
  engineVersion: string;
  summary: string;
  findings: SpectralFinding[];
  peakFrequencies: Array<{ name: string; freq: string; amplitude: string; status: "Normal" | "Elevated" }>;
  maintenancePriority: "Low" | "Medium" | "High" | "Immediate";
  prescriptiveAction: string;
}

export const DIAGNOSIS_RECORDS: DiagnosisRecord[] = [
  {
    machineId: "KLN-01",
    overallCondition: "Nominal",
    confidence: 98.7,
    engineVersion: "OSWARteck Kiln Reference Model v2.4 + ISO 20816-3",
    summary: "Full rotary kiln pyroprocessing train operating with high thermodynamic balance and mechanical stability. Drive train vibration velocity is within ISO 20816-3 Zone A (< 2.5 mm/s), Station 2 hydraulic thrust float cycle is continuous and regular (±20 mm), and shell thermal envelope shows no refractory anomalies.",
    findings: [
      {
        id: "F-KLN-01",
        fault: "Gearbox Input Bearing Pass Frequency (R-DRV-01)",
        probability: 1.2,
        location: "Drive Train · Gearbox High-Speed Input Shaft",
        frequency: "16.5 Hz (1.0X Motor Speed)",
        severity: "Normal",
        recommendation: "Duplex spherical roller bearing harmonics nominal. Continue quarterly vibration audit.",
      },
      {
        id: "F-KLN-02",
        fault: "Drive Pinion & Girth Gear Flank Alignment (R-DRV-02)",
        probability: 1.8,
        location: "Drive Train · Girth Gear (128T) & Pinion (19T) Mesh",
        frequency: "16.72 Hz (GMF)",
        severity: "Normal",
        recommendation: "Tooth flank contact verified at 88%; automatic spray lubrication cycle nominal at 120 g/h.",
      },
      {
        id: "F-KLN-03",
        fault: "Support Roller Skew & Pier Load Distribution (R-SUP-01)",
        probability: 1.4,
        location: "Station 2 Support Pier · Left & Right Rollers",
        frequency: "0.28 Hz (Roller Running Speed)",
        severity: "Normal",
        recommendation: "Station 2 roller skew balanced (+0.04°); bearing pair temperature splits under 2.4 K.",
      },
      {
        id: "F-KLN-04",
        fault: "Kiln Axial Float & Hydraulic Thrust Tracking (R-SUP-04)",
        probability: 1.6,
        location: "Station 2 Hydraulic Thrust Cylinder & LVDT",
        frequency: "0.002 Hz (4.2h Float Cycle)",
        severity: "Normal",
        recommendation: "LVDT float position (-3.1 mm) active within ±20 mm neutral float zone; pressure nominal at 86.4 bar.",
      },
      {
        id: "F-KLN-05",
        fault: "Shell Refractory Hotspot Risk (R-SHL-01)",
        probability: 0.8,
        location: "Kiln Shell · Sintering Zone Section 35–55m",
        frequency: "Spatial 360° Matrix",
        severity: "Normal",
        recommendation: "Peak outer casing temp at 327 °C, well below 380 °C alert threshold; coating layer intact.",
      },
      {
        id: "F-KLN-06",
        fault: "Inlet Seal False Air Ingress (R-SHL-03)",
        probability: 1.1,
        location: "Kiln Inlet Station 0m · Preheater Interface",
        frequency: "DC / Steady State",
        severity: "Normal",
        recommendation: "Inlet false-air index CAL-KLN-06 nominal at 0.18 vol%; lamella leaves sealed under -3.82 mbar draft.",
      },
    ],
    peakFrequencies: [
      { name: "1X Kiln Running Speed (3.80 RPM)", freq: "0.063 Hz", amplitude: "0.12 mm/s", status: "Normal" },
      { name: "1X Motor Speed (990 RPM)", freq: "16.50 Hz", amplitude: "0.92 mm/s", status: "Normal" },
      { name: "Pinion/Girth Gearmesh GMF (19X)", freq: "16.72 Hz", amplitude: "1.24 mm/s", status: "Normal" },
      { name: "Support Roller Speed (16.8 RPM)", freq: "0.28 Hz", amplitude: "0.18 mm/s", status: "Normal" },
      { name: "Roller Bearing Outer Race (BPFO)", freq: "1.84 Hz", amplitude: "0.15 mm/s", status: "Normal" },
    ],
    maintenancePriority: "Low",
    prescriptiveAction: "Continue continuous multi-subsystem model tracking. Next planned service intervention at annual plant turnaround.",
  },
];

/* ==========================================================================
   TREND DOMAIN DATA
   ========================================================================== */

export interface TrendMetricConfig {
  key: string;
  label: string;
  unit: string;
  baseline: number;
  advisoryLimit: number;
  criticalLimit: number;
  stats: {
    mean: string;
    peak: string;
    crestFactor: string;
    kurtosis: string;
    drift30d: string;
  };
  points: Array<{ time: string; value: number }>;
}

export interface MachineTrendRecord {
  machineId: string;
  metrics: TrendMetricConfig[];
}

export const TREND_RECORDS: MachineTrendRecord[] = [
  {
    machineId: "KLN-01",
    metrics: [
      {
        key: "VIB-KLN-01",
        label: "Motor DE Vibration RMS (VIB-01)",
        unit: "mm/s",
        baseline: 1.42,
        advisoryLimit: 4.50,
        criticalLimit: 7.10,
        points: [
          { time: "00:00", value: 1.38 },
          { time: "04:00", value: 1.41 },
          { time: "08:00", value: 1.45 },
          { time: "12:00", value: 1.43 },
          { time: "16:00", value: 1.40 },
          { time: "20:00", value: 1.42 },
          { time: "Now", value: 1.42 },
        ],
        stats: { mean: "1.42 mm/s", peak: "1.45 mm/s", crestFactor: "3.24", kurtosis: "3.08", drift30d: "+0.02 mm/s" },
      },
      {
        key: "TMP-KLN-21",
        label: "Motor Stator Winding Temp (TMP-21)",
        unit: "°C",
        baseline: 88.4,
        advisoryLimit: 130.0,
        criticalLimit: 140.0,
        points: [
          { time: "00:00", value: 86.8 },
          { time: "04:00", value: 87.5 },
          { time: "08:00", value: 89.2 },
          { time: "12:00", value: 88.7 },
          { time: "16:00", value: 88.1 },
          { time: "20:00", value: 88.4 },
          { time: "Now", value: 88.4 },
        ],
        stats: { mean: "88.2 °C", peak: "89.2 °C", crestFactor: "1.06", kurtosis: "2.95", drift30d: "+0.8 °C" },
      },
      {
        key: "ELE-KLN-01",
        label: "Drive Torque / Current (ELE-01)",
        unit: "%",
        baseline: 62.1,
        advisoryLimit: 90.0,
        criticalLimit: 105.0,
        points: [
          { time: "00:00", value: 61.4 },
          { time: "04:00", value: 62.0 },
          { time: "08:00", value: 62.8 },
          { time: "12:00", value: 62.3 },
          { time: "16:00", value: 61.9 },
          { time: "20:00", value: 62.1 },
          { time: "Now", value: 62.1 },
        ],
        stats: { mean: "62.1 %", peak: "62.8 %", crestFactor: "1.12", kurtosis: "3.01", drift30d: "-0.4 %" },
      },
      {
        key: "TMP-KLN-05",
        label: "Station 2 Left Bearing Temp (TMP-05)",
        unit: "°C",
        baseline: 54.2,
        advisoryLimit: 75.0,
        criticalLimit: 85.0,
        points: [
          { time: "00:00", value: 53.5 },
          { time: "04:00", value: 53.9 },
          { time: "08:00", value: 54.6 },
          { time: "12:00", value: 54.4 },
          { time: "16:00", value: 54.0 },
          { time: "20:00", value: 54.2 },
          { time: "Now", value: 54.2 },
        ],
        stats: { mean: "54.1 °C", peak: "54.6 °C", crestFactor: "1.04", kurtosis: "2.92", drift30d: "+0.3 °C" },
      },
      {
        key: "PRS-KLN-07",
        label: "Thrust Hydraulic Pressure (PRS-07)",
        unit: "bar",
        baseline: 86.4,
        advisoryLimit: 150.0,
        criticalLimit: 180.0,
        points: [
          { time: "00:00", value: 84.8 },
          { time: "04:00", value: 85.9 },
          { time: "08:00", value: 87.2 },
          { time: "12:00", value: 86.6 },
          { time: "16:00", value: 86.0 },
          { time: "20:00", value: 86.4 },
          { time: "Now", value: 86.4 },
        ],
        stats: { mean: "86.2 bar", peak: "87.2 bar", crestFactor: "1.08", kurtosis: "3.10", drift30d: "+0.5 bar" },
      },
      {
        key: "POS-KLN-01",
        label: "Station 2 LVDT Float Position (POS-01)",
        unit: "mm",
        baseline: -3.1,
        advisoryLimit: 30.0,
        criticalLimit: 40.0,
        points: [
          { time: "00:00", value: -12.4 },
          { time: "04:00", value: 8.6 },
          { time: "08:00", value: 14.2 },
          { time: "12:00", value: -4.8 },
          { time: "16:00", value: -16.2 },
          { time: "20:00", value: 2.4 },
          { time: "Now", value: -3.1 },
        ],
        stats: { mean: "-1.6 mm", peak: "+14.2 mm", crestFactor: "1.45", kurtosis: "2.68", drift30d: "+0.2 mm" },
      },
      {
        key: "CAL-KLN-03",
        label: "Shell Scanner Max Temp (CAL-03)",
        unit: "°C",
        baseline: 327.0,
        advisoryLimit: 380.0,
        criticalLimit: 420.0,
        points: [
          { time: "00:00", value: 324.0 },
          { time: "04:00", value: 326.5 },
          { time: "08:00", value: 329.0 },
          { time: "12:00", value: 327.8 },
          { time: "16:00", value: 325.5 },
          { time: "20:00", value: 327.0 },
          { time: "Now", value: 327.0 },
        ],
        stats: { mean: "326.6 °C", peak: "329.0 °C", crestFactor: "1.02", kurtosis: "2.98", drift30d: "-1.5 °C" },
      },
      {
        key: "GAS-KLN-01",
        label: "Inlet O₂ Concentration (GAS-01)",
        unit: "vol%",
        baseline: 2.59,
        advisoryLimit: 3.50,
        criticalLimit: 5.00,
        points: [
          { time: "00:00", value: 2.55 },
          { time: "04:00", value: 2.58 },
          { time: "08:00", value: 2.61 },
          { time: "12:00", value: 2.57 },
          { time: "16:00", value: 2.60 },
          { time: "20:00", value: 2.59 },
          { time: "Now", value: 2.59 },
        ],
        stats: { mean: "2.58 vol%", peak: "2.61 vol%", crestFactor: "1.01", kurtosis: "2.98", drift30d: "+0.02 vol%" },
      },
      {
        key: "FLO-KLN-01",
        label: "Raw Meal Kiln Feed (FLO-01)",
        unit: "t/h",
        baseline: 330.0,
        advisoryLimit: 355.0,
        criticalLimit: 380.0,
        points: [
          { time: "00:00", value: 328.5 },
          { time: "04:00", value: 330.0 },
          { time: "08:00", value: 331.5 },
          { time: "12:00", value: 330.2 },
          { time: "16:00", value: 329.4 },
          { time: "20:00", value: 330.0 },
          { time: "Now", value: 330.0 },
        ],
        stats: { mean: "330.1 t/h", peak: "331.5 t/h", crestFactor: "1.02", kurtosis: "3.04", drift30d: "+0.4 t/h" },
      },
    ],
  },
  {
    machineId: "DRV-KLN-01",
    metrics: [
      {
        key: "VIB-KLN-01",
        label: "Motor DE Vibration RMS (VIB-01)",
        unit: "mm/s",
        baseline: 1.42,
        advisoryLimit: 4.50,
        criticalLimit: 7.10,
        points: [
          { time: "00:00", value: 1.38 },
          { time: "04:00", value: 1.41 },
          { time: "08:00", value: 1.45 },
          { time: "12:00", value: 1.43 },
          { time: "16:00", value: 1.40 },
          { time: "20:00", value: 1.42 },
          { time: "Now", value: 1.42 },
        ],
        stats: { mean: "1.42 mm/s", peak: "1.45 mm/s", crestFactor: "3.24", kurtosis: "3.08", drift30d: "+0.02 mm/s" },
      },
      {
        key: "VIB-KLN-04",
        label: "Pinion Bearing Vibration (VIB-04)",
        unit: "mm/s",
        baseline: 2.10,
        advisoryLimit: 5.60,
        criticalLimit: 9.00,
        points: [
          { time: "00:00", value: 2.04 },
          { time: "04:00", value: 2.08 },
          { time: "08:00", value: 2.15 },
          { time: "12:00", value: 2.12 },
          { time: "16:00", value: 2.07 },
          { time: "20:00", value: 2.10 },
          { time: "Now", value: 2.10 },
        ],
        stats: { mean: "2.10 mm/s", peak: "2.15 mm/s", crestFactor: "3.12", kurtosis: "2.98", drift30d: "+0.04 mm/s" },
      },
      {
        key: "ELE-KLN-01",
        label: "Drive Torque / Motor Current (ELE-01)",
        unit: "%",
        baseline: 62.1,
        advisoryLimit: 90.0,
        criticalLimit: 105.0,
        points: [
          { time: "00:00", value: 61.4 },
          { time: "04:00", value: 62.0 },
          { time: "08:00", value: 62.8 },
          { time: "12:00", value: 62.3 },
          { time: "16:00", value: 61.9 },
          { time: "20:00", value: 62.1 },
          { time: "Now", value: 62.1 },
        ],
        stats: { mean: "62.1 %", peak: "62.8 %", crestFactor: "1.12", kurtosis: "3.01", drift30d: "-0.4 %" },
      },
      {
        key: "TMP-KLN-21",
        label: "Stator Winding Temperature (TMP-21)",
        unit: "°C",
        baseline: 88.4,
        advisoryLimit: 130.0,
        criticalLimit: 140.0,
        points: [
          { time: "00:00", value: 86.8 },
          { time: "04:00", value: 87.5 },
          { time: "08:00", value: 89.2 },
          { time: "12:00", value: 88.7 },
          { time: "16:00", value: 88.1 },
          { time: "20:00", value: 88.4 },
          { time: "Now", value: 88.4 },
        ],
        stats: { mean: "88.2 °C", peak: "89.2 °C", crestFactor: "1.06", kurtosis: "2.95", drift30d: "+0.8 °C" },
      },
      {
        key: "TMP-KLN-15",
        label: "Gearbox Sump Oil Temp (TMP-15)",
        unit: "°C",
        baseline: 54.8,
        advisoryLimit: 75.0,
        criticalLimit: 85.0,
        points: [
          { time: "00:00", value: 53.9 },
          { time: "04:00", value: 54.4 },
          { time: "08:00", value: 55.2 },
          { time: "12:00", value: 55.0 },
          { time: "16:00", value: 54.6 },
          { time: "20:00", value: 54.8 },
          { time: "Now", value: 54.8 },
        ],
        stats: { mean: "54.7 °C", peak: "55.2 °C", crestFactor: "1.05", kurtosis: "2.90", drift30d: "+0.4 °C" },
      },
      {
        key: "PRS-KLN-04",
        label: "Gearbox Lube Oil Pressure (PRS-04)",
        unit: "bar",
        baseline: 2.24,
        advisoryLimit: 1.20,
        criticalLimit: 0.80,
        points: [
          { time: "00:00", value: 2.26 },
          { time: "04:00", value: 2.25 },
          { time: "08:00", value: 2.22 },
          { time: "12:00", value: 2.23 },
          { time: "16:00", value: 2.25 },
          { time: "20:00", value: 2.24 },
          { time: "Now", value: 2.24 },
        ],
        stats: { mean: "2.24 bar", peak: "2.26 bar", crestFactor: "1.03", kurtosis: "2.96", drift30d: "-0.02 bar" },
      },
    ],
  },
  {
    machineId: "SUP-KLN-01",
    metrics: [
      {
        key: "TMP-KLN-05",
        label: "Station 2 Left Bearing A Temp (TMP-05)",
        unit: "°C",
        baseline: 54.2,
        advisoryLimit: 75.0,
        criticalLimit: 85.0,
        points: [
          { time: "00:00", value: 53.5 },
          { time: "04:00", value: 53.9 },
          { time: "08:00", value: 54.6 },
          { time: "12:00", value: 54.4 },
          { time: "16:00", value: 54.0 },
          { time: "20:00", value: 54.2 },
          { time: "Now", value: 54.2 },
        ],
        stats: { mean: "54.1 °C", peak: "54.6 °C", crestFactor: "1.04", kurtosis: "2.92", drift30d: "+0.3 °C" },
      },
      {
        key: "TMP-KLN-07",
        label: "Station 2 Right Bearing A Temp (TMP-07)",
        unit: "°C",
        baseline: 53.8,
        advisoryLimit: 75.0,
        criticalLimit: 85.0,
        points: [
          { time: "00:00", value: 53.0 },
          { time: "04:00", value: 53.5 },
          { time: "08:00", value: 54.2 },
          { time: "12:00", value: 54.0 },
          { time: "16:00", value: 53.6 },
          { time: "20:00", value: 53.8 },
          { time: "Now", value: 53.8 },
        ],
        stats: { mean: "53.7 °C", peak: "54.2 °C", crestFactor: "1.04", kurtosis: "2.90", drift30d: "+0.2 °C" },
      },
      {
        key: "PRS-KLN-07",
        label: "Thrust Hydraulic Pressure (PRS-07)",
        unit: "bar",
        baseline: 86.4,
        advisoryLimit: 150.0,
        criticalLimit: 180.0,
        points: [
          { time: "00:00", value: 84.8 },
          { time: "04:00", value: 85.9 },
          { time: "08:00", value: 87.2 },
          { time: "12:00", value: 86.6 },
          { time: "16:00", value: 86.0 },
          { time: "20:00", value: 86.4 },
          { time: "Now", value: 86.4 },
        ],
        stats: { mean: "86.2 bar", peak: "87.2 bar", crestFactor: "1.08", kurtosis: "3.10", drift30d: "+0.5 bar" },
      },
      {
        key: "POS-KLN-01",
        label: "Kiln Axial Float LVDT (POS-01)",
        unit: "mm",
        baseline: -3.1,
        advisoryLimit: 30.0,
        criticalLimit: 40.0,
        points: [
          { time: "00:00", value: -12.4 },
          { time: "04:00", value: 8.6 },
          { time: "08:00", value: 14.2 },
          { time: "12:00", value: -4.8 },
          { time: "16:00", value: -16.2 },
          { time: "20:00", value: 2.4 },
          { time: "Now", value: -3.1 },
        ],
        stats: { mean: "-1.6 mm", peak: "+14.2 mm", crestFactor: "1.45", kurtosis: "2.68", drift30d: "+0.2 mm" },
      },
      {
        key: "TMP-KLN-01",
        label: "Station 1 Left Bearing A Temp (TMP-01)",
        unit: "°C",
        baseline: 48.6,
        advisoryLimit: 75.0,
        criticalLimit: 85.0,
        points: [
          { time: "00:00", value: 47.9 },
          { time: "04:00", value: 48.3 },
          { time: "08:00", value: 49.0 },
          { time: "12:00", value: 48.8 },
          { time: "16:00", value: 48.4 },
          { time: "20:00", value: 48.6 },
          { time: "Now", value: 48.6 },
        ],
        stats: { mean: "48.5 °C", peak: "49.0 °C", crestFactor: "1.03", kurtosis: "2.94", drift30d: "+0.1 °C" },
      },
      {
        key: "TMP-KLN-09",
        label: "Station 3 Left Bearing A Temp (TMP-09)",
        unit: "°C",
        baseline: 51.8,
        advisoryLimit: 75.0,
        criticalLimit: 85.0,
        points: [
          { time: "00:00", value: 51.1 },
          { time: "04:00", value: 51.5 },
          { time: "08:00", value: 52.2 },
          { time: "12:00", value: 52.0 },
          { time: "16:00", value: 51.6 },
          { time: "20:00", value: 51.8 },
          { time: "Now", value: 51.8 },
        ],
        stats: { mean: "51.7 °C", peak: "52.2 °C", crestFactor: "1.03", kurtosis: "2.91", drift30d: "+0.2 °C" },
      },
    ],
  },
  {
    machineId: "PRC-KLN-01",
    metrics: [
      {
        key: "GAS-KLN-01",
        label: "Inlet O₂ Concentration (GAS-01)",
        unit: "vol%",
        baseline: 2.59,
        advisoryLimit: 3.50,
        criticalLimit: 5.00,
        points: [
          { time: "00:00", value: 2.55 },
          { time: "04:00", value: 2.58 },
          { time: "08:00", value: 2.61 },
          { time: "12:00", value: 2.57 },
          { time: "16:00", value: 2.60 },
          { time: "20:00", value: 2.59 },
          { time: "Now", value: 2.59 },
        ],
        stats: { mean: "2.58 vol%", peak: "2.61 vol%", crestFactor: "1.01", kurtosis: "2.98", drift30d: "+0.02 vol%" },
      },
      {
        key: "GAS-KLN-02",
        label: "Inlet CO Concentration (GAS-02)",
        unit: "ppm",
        baseline: 120.0,
        advisoryLimit: 1000.0,
        criticalLimit: 3000.0,
        points: [
          { time: "00:00", value: 112.0 },
          { time: "04:00", value: 118.0 },
          { time: "08:00", value: 126.0 },
          { time: "12:00", value: 122.0 },
          { time: "16:00", value: 117.0 },
          { time: "20:00", value: 120.0 },
          { time: "Now", value: 120.0 },
        ],
        stats: { mean: "119.2 ppm", peak: "126.0 ppm", crestFactor: "1.08", kurtosis: "2.90", drift30d: "-5.0 ppm" },
      },
      {
        key: "TMP-KLN-13",
        label: "Inlet Gas Temperature (TMP-13)",
        unit: "°C",
        baseline: 1086,
        advisoryLimit: 950,
        criticalLimit: 900,
        points: [
          { time: "00:00", value: 1084 },
          { time: "04:00", value: 1085 },
          { time: "08:00", value: 1088 },
          { time: "12:00", value: 1086 },
          { time: "16:00", value: 1087 },
          { time: "20:00", value: 1086 },
          { time: "Now", value: 1086 },
        ],
        stats: { mean: "1086 °C", peak: "1088 °C", crestFactor: "1.00", kurtosis: "3.01", drift30d: "-1.2 °C" },
      },
      {
        key: "PRS-KLN-01",
        label: "Inlet Static Draft (PRS-01)",
        unit: "mbar",
        baseline: -3.82,
        advisoryLimit: -1.50,
        criticalLimit: -0.50,
        points: [
          { time: "00:00", value: -3.85 },
          { time: "04:00", value: -3.80 },
          { time: "08:00", value: -3.78 },
          { time: "12:00", value: -3.83 },
          { time: "16:00", value: -3.81 },
          { time: "20:00", value: -3.82 },
          { time: "Now", value: -3.82 },
        ],
        stats: { mean: "-3.81 mbar", peak: "-3.78 mbar", crestFactor: "1.03", kurtosis: "2.97", drift30d: "+0.04 mbar" },
      },
      {
        key: "FLO-KLN-01",
        label: "Raw Meal Kiln Feed (FLO-01)",
        unit: "t/h",
        baseline: 330.0,
        advisoryLimit: 355.0,
        criticalLimit: 380.0,
        points: [
          { time: "00:00", value: 328.5 },
          { time: "04:00", value: 330.0 },
          { time: "08:00", value: 331.5 },
          { time: "12:00", value: 330.2 },
          { time: "16:00", value: 329.4 },
          { time: "20:00", value: 330.0 },
          { time: "Now", value: 330.0 },
        ],
        stats: { mean: "330.1 t/h", peak: "331.5 t/h", crestFactor: "1.02", kurtosis: "3.04", drift30d: "+0.4 t/h" },
      },
      {
        key: "FLO-KLN-02",
        label: "Kiln Burner Fuel (FLO-02)",
        unit: "t/h",
        baseline: 10.58,
        advisoryLimit: 12.00,
        criticalLimit: 14.00,
        points: [
          { time: "00:00", value: 10.52 },
          { time: "04:00", value: 10.56 },
          { time: "08:00", value: 10.62 },
          { time: "12:00", value: 10.59 },
          { time: "16:00", value: 10.55 },
          { time: "20:00", value: 10.58 },
          { time: "Now", value: 10.58 },
        ],
        stats: { mean: "10.57 t/h", peak: "10.62 t/h", crestFactor: "1.02", kurtosis: "2.98", drift30d: "+0.03 t/h" },
      },
      {
        key: "TMP-KLN-14",
        label: "Burning Zone Temp (TMP-14)",
        unit: "°C",
        baseline: 1448,
        advisoryLimit: 1300,
        criticalLimit: 1550,
        points: [
          { time: "00:00", value: 1442 },
          { time: "04:00", value: 1446 },
          { time: "08:00", value: 1452 },
          { time: "12:00", value: 1449 },
          { time: "16:00", value: 1445 },
          { time: "20:00", value: 1448 },
          { time: "Now", value: 1448 },
        ],
        stats: { mean: "1447 °C", peak: "1452 °C", crestFactor: "1.01", kurtosis: "3.02", drift30d: "-2.0 °C" },
      },
    ],
  },
];

/* ==========================================================================
   RACK DOMAIN DATA
   ========================================================================== */

export interface RackSlotCard {
  slotNumber: number;
  cardModel: string;
  moduleType: string;
  channelCount: number;
  connectedProbes: string;
  sampleRate: string;
  syncState: "Synced" | "Acquiring" | "Standby";
}

export interface RackChassisRecord {
  machineId: string;
  primaryRack: {
    rackId: string;
    name: string;
    cabinetLocation: string;
    ipAddress: string;
    protocol: string;
    firmware: string;
    uptime: string;
    psuStatus: string;
    packetLoss: string;
    latency: string;
  };
  slots: RackSlotCard[];
}

export const RACK_RECORDS: RackChassisRecord[] = [
  {
    machineId: "KLN-01",
    primaryRack: {
      rackId: "ULTRON-EDGE-KLN01",
      name: "Rotary Kiln KLN-01 Acquisition & Edge Gateway",
      cabinetLocation: "Drive MCC Room Cabinet IP54 (Safe Area)",
      ipAddress: "10.14.22.80",
      protocol: "OPC UA Read-Only Client + MQTT TLS 1.3",
      firmware: "ULTRON Edge OS v4.1.2-Industrial",
      uptime: "182d 08h 14m",
      psuStatus: "Redundant 24V DC Active (24.1V / 24.1V)",
      packetLoss: "0.00%",
      latency: "0.8 ms (PTP Grandmaster Synced)",
    },
    slots: [
      { slotNumber: 1, cardModel: "ULTRON-GW-IPC", moduleType: "Edge Gateway IPC (Core i7, 256GB SSD)", channelCount: 8, connectedProbes: "OPC UA & Modbus TCP Read-Only Data Link", sampleRate: "1 s synchronous poll", syncState: "Synced" },
      { slotNumber: 2, cardModel: "DAQ-GAS-MOD", moduleType: "Gas Analyser Modbus Gateway Channel", channelCount: 4, connectedProbes: "GAS-KLN-01 (O₂), GAS-KLN-02 (CO), STS-06", sampleRate: "5 s (held on blowback)", syncState: "Synced" },
      { slotNumber: 3, cardModel: "DAQ-PRESS-HART", moduleType: "4-Channel Isolated HART Pressure Receiver", channelCount: 4, connectedProbes: "PRS-KLN-01 (Inlet Draft), PRS-KLN-03 (Hood)", sampleRate: "1 s continuous", syncState: "Synced" },
      { slotNumber: 4, cardModel: "DAQ-TC-ISO", moduleType: "8-Channel Cold-Junction Compensated TC Module", channelCount: 8, connectedProbes: "TMP-KLN-13 (Inlet Thermocouple Type K)", sampleRate: "5 s continuous", syncState: "Synced" },
      { slotNumber: 5, cardModel: "DAQ-LVDT-PLC", moduleType: "High-Resolution LVDT Position Receiver", channelCount: 2, connectedProbes: "POS-KLN-01 (Thrust LVDT ±50 mm), POS-02", sampleRate: "1 s (±0.5 mm accuracy)", syncState: "Synced" },
      { slotNumber: 6, cardModel: "DAQ-DI-24V", moduleType: "16-Channel Isolated Digital Input Module", channelCount: 16, connectedProbes: "STS-KLN-10 (Cooling Fan Contact), Aux Drive", sampleRate: "1 ms interrupt / 1s scan", syncState: "Synced" },
    ],
  },
  {
    machineId: "CRUSH-01",
    primaryRack: {
      rackId: "ULTRON-RACK-C1",
      name: "Gyratory Crusher CRUSH-01 Edge DAQ Rack",
      cabinetLocation: "Primary Crusher MCC Substation Room C1",
      ipAddress: "10.18.10.21",
      protocol: "Modbus TCP + MQTT TLS 1.3",
      firmware: "ULTRON Edge OS v4.1.2-Industrial",
      uptime: "214d 16h 05m",
      psuStatus: "Redundant 24V DC Active (24.2V / 24.1V)",
      packetLoss: "0.00%",
      latency: "1.1 ms (PTP Grandmaster Synced)",
    },
    slots: [
      { slotNumber: 1, cardModel: "ULTRON-GW-IPC", moduleType: "Edge Gateway IPC (Core i7, 256GB SSD)", channelCount: 8, connectedProbes: "Crusher PLC & Hydroset Data Link", sampleRate: "1 s synchronous poll", syncState: "Synced" },
      { slotNumber: 2, cardModel: "DAQ-IEPE-08", moduleType: "8-Channel 24-Bit Dynamic IEPE Vibration", channelCount: 8, connectedProbes: "COUNTERSHAFT-VIB", sampleRate: "25.6 kS/s", syncState: "Synced" },
      { slotNumber: 3, cardModel: "DAQ-AI-HART", moduleType: "8-Channel 4–20 mA HART Analog Input", channelCount: 8, connectedProbes: "ECC-HYD-PRESS, MOTOR-AMP, SHAFT-THRUST, SPIDER-LUBE-FLOW", sampleRate: "1 s continuous", syncState: "Synced" },
    ],
  },
  {
    machineId: "SAG-01",
    primaryRack: {
      rackId: "ULTRON-RACK-G4",
      name: "SAG Mill SAG-01 Condition Monitoring Cabinet",
      cabinetLocation: "Grinding Substation G4 Control Room",
      ipAddress: "10.18.20.14",
      protocol: "OPC UA + MQTT TLS 1.3",
      firmware: "ULTRON Edge OS v4.1.2-Industrial",
      uptime: "196d 04h 42m",
      psuStatus: "Redundant 24V DC Active (24.1V / 24.0V)",
      packetLoss: "0.00%",
      latency: "0.9 ms (PTP Grandmaster Synced)",
    },
    slots: [
      { slotNumber: 1, cardModel: "ULTRON-GW-IPC", moduleType: "Edge Gateway IPC (Core i7, 256GB SSD)", channelCount: 8, connectedProbes: "Mill Drive & Lube PLC Interface", sampleRate: "1 s synchronous poll", syncState: "Synced" },
      { slotNumber: 2, cardModel: "DAQ-IEPE-08", moduleType: "8-Channel 24-Bit Dynamic IEPE Vibration", channelCount: 8, connectedProbes: "VIB-RMS-DE, PINION-ACC-RMS", sampleRate: "25.6 kS/s", syncState: "Synced" },
      { slotNumber: 3, cardModel: "DAQ-AI-HART", moduleType: "8-Channel 4–20 mA Proximity & HART Input", channelCount: 8, connectedProbes: "AXIAL-THRUST-MM", sampleRate: "1 s continuous", syncState: "Synced" },
      { slotNumber: 4, cardModel: "DAQ-RTD-08", moduleType: "8-Channel Pt100 RTD Temperature Module", channelCount: 8, connectedProbes: "TRUNNION-TEMP-01, TRUNNION-TEMP-02", sampleRate: "10 s continuous", syncState: "Synced" },
    ],
  },
  {
    machineId: "BALL-02",
    primaryRack: {
      rackId: "ULTRON-EDGE-BALL02",
      name: "Ball Mill BALL-02 Acquisition Cabinet",
      cabinetLocation: "Grinding Bay 2 Local Field Panel",
      ipAddress: "10.18.20.22",
      protocol: "OPC UA + MQTT TLS 1.3",
      firmware: "ULTRON Edge OS v4.1.2-Industrial",
      uptime: "164d 19h 11m",
      psuStatus: "Redundant 24V DC Active (24.1V / 24.1V)",
      packetLoss: "0.00%",
      latency: "1.0 ms (PTP Grandmaster Synced)",
    },
    slots: [
      { slotNumber: 1, cardModel: "ULTRON-GW-IPC", moduleType: "Edge Gateway IPC", channelCount: 8, connectedProbes: "Ball Mill #2 PLC Link", sampleRate: "1 s synchronous poll", syncState: "Synced" },
      { slotNumber: 2, cardModel: "DAQ-IEPE-08", moduleType: "8-Channel IEPE Accelerometer Card", channelCount: 8, connectedProbes: "PINION-ACC-RMS, VIB-RMS-DE", sampleRate: "25.6 kS/s", syncState: "Synced" },
      { slotNumber: 3, cardModel: "DAQ-AI-HART", moduleType: "8-Channel Acoustic & HART Card", channelCount: 8, connectedProbes: "GIRTH-ACOUSTIC", sampleRate: "1 s continuous", syncState: "Synced" },
      { slotNumber: 4, cardModel: "DAQ-RTD-08", moduleType: "8-Channel Pt100 RTD Card", channelCount: 8, connectedProbes: "TRUNNION-TEMP-01, TRUNNION-TEMP-02", sampleRate: "10 s continuous", syncState: "Synced" },
    ],
  },
  {
    machineId: "BALL-03",
    primaryRack: {
      rackId: "ULTRON-EDGE-BALL03",
      name: "Ball Mill BALL-03 Acquisition Cabinet",
      cabinetLocation: "Grinding Bay 3 Local Field Panel",
      ipAddress: "10.18.20.23",
      protocol: "OPC UA + MQTT TLS 1.3",
      firmware: "ULTRON Edge OS v4.1.2-Industrial",
      uptime: "164d 19h 08m",
      psuStatus: "Redundant 24V DC Active (24.1V / 24.1V)",
      packetLoss: "0.00%",
      latency: "1.0 ms (PTP Grandmaster Synced)",
    },
    slots: [
      { slotNumber: 1, cardModel: "ULTRON-GW-IPC", moduleType: "Edge Gateway IPC", channelCount: 8, connectedProbes: "Ball Mill #3 PLC Link", sampleRate: "1 s synchronous poll", syncState: "Synced" },
      { slotNumber: 2, cardModel: "DAQ-IEPE-08", moduleType: "8-Channel IEPE Accelerometer Card", channelCount: 8, connectedProbes: "PINION-ACC-RMS, VIB-RMS-DE", sampleRate: "25.6 kS/s", syncState: "Synced" },
      { slotNumber: 3, cardModel: "DAQ-AI-HART", moduleType: "8-Channel Displacement & HART Card", channelCount: 8, connectedProbes: "SHELL-DISP", sampleRate: "1 s continuous", syncState: "Synced" },
      { slotNumber: 4, cardModel: "DAQ-RTD-08", moduleType: "8-Channel Pt100 RTD Card", channelCount: 8, connectedProbes: "TRUNNION-TEMP-01, TRUNNION-TEMP-02", sampleRate: "10 s continuous", syncState: "Synced" },
    ],
  },
  {
    machineId: "PMP-101",
    primaryRack: {
      rackId: "ULTRON-EDGE-PMP101",
      name: "Process Water Pump PMP-101 Acquisition Unit",
      cabinetLocation: "Ndola Utility Pumphouse MCC Panel 2",
      ipAddress: "10.22.14.11",
      protocol: "Modbus TCP + MQTT TLS 1.3",
      firmware: "ULTRON Edge OS v4.1.2-Industrial",
      uptime: "142d 11h 30m",
      psuStatus: "Redundant 24V DC Active (24.0V / 24.1V)",
      packetLoss: "0.00%",
      latency: "1.2 ms (PTP Grandmaster Synced)",
    },
    slots: [
      { slotNumber: 1, cardModel: "ULTRON-GW-IPC", moduleType: "Edge Gateway IPC", channelCount: 8, connectedProbes: "Pumphouse VFD & Flow Link", sampleRate: "1 s synchronous poll", syncState: "Synced" },
      { slotNumber: 2, cardModel: "DAQ-IEPE-08", moduleType: "8-Channel IEPE Accelerometer Card", channelCount: 8, connectedProbes: "VIB-PMP-01", sampleRate: "25.6 kS/s", syncState: "Synced" },
      { slotNumber: 3, cardModel: "DAQ-AI-HART", moduleType: "8-Channel 4–20 mA HART Card", channelCount: 8, connectedProbes: "ELE-PMP-01, FLO-PMP-01, PRS-PMP-01, SPD-PMP-01", sampleRate: "1 s continuous", syncState: "Synced" },
      { slotNumber: 4, cardModel: "DAQ-RTD-08", moduleType: "8-Channel Pt100 RTD Card", channelCount: 8, connectedProbes: "TMP-PMP-01", sampleRate: "10 s continuous", syncState: "Synced" },
    ],
  },
];


