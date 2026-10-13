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
  diagramType: "mill" | "crusher" | "pump" | "blower" | "kiln";
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
    plant: "Demo Cement Plant (Pyro Line)",
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
    plant: "Demo Cement Plant — Pyro Line",
    workCenter: "WC-MECH-PYRO",
    costCenter: "CC-3100-CLINKER",
    activeWorkOrder: "WO-2026-88014",
    nextScheduledPm: "2026-11-20 (Annual Outage & Shell Alignment)",
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
];

