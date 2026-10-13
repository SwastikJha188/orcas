import { AssetMachine } from "./assets-data";

export interface ProcessIOItem {
  name: string;
  category: "Material" | "Water" | "Energy" | "Media" | "Slurry" | "Gas" | "Product" | "Reject" | "Utility";
  rateOrSpec: string;
  sourceOrDestination: string;
  status: "Normal" | "Advisory" | "Critical";
}

export interface ProcessParameter {
  label: string;
  value: string;
  unit?: string;
  status?: "Normal" | "Advisory" | "Critical";
}

export interface MachineProcessStage {
  id: string;
  stepNumber: string; // "01", "02", etc.
  name: string;
  role: string;
  subtitle: string;
  health: number;
  status: "Normal" | "Advisory" | "Critical";
  healthNotes: string;
  transformation: string;
  associatedParts: string[];
  parameters: ProcessParameter[];
  inputs: ProcessIOItem[];
  outputs: ProcessIOItem[];
}

export function getMachineProcesses(machine: AssetMachine): MachineProcessStage[] {
  switch (machine.id) {
    case "KLN-01":
      return [
        {
          id: "kln01-s1",
          stepNumber: "01",
          name: "Raw Meal Infeed & Negative Draft Induction (0m)",
          role: "Infeed & Draft Induction",
          subtitle: "Pre-calcined meal induction from cyclone C5 with negative draft containment",
          health: 99,
          status: "Normal",
          healthNotes: "Inlet false-air index CAL-KLN-06 nominal (0.18 vol%); meal spillage chute clear.",
          transformation: "Transfers 330 t/h pre-calcined meal from preheater cyclone C5 into the rotating kiln inlet under -3.82 mbar draft.",
          associatedParts: ["Inlet Lamella Seal (0m)", "Station 1 Support Pier & Rollers"],
          parameters: [
            { label: "Kiln Feed Rate (FLO-01)", value: "330", unit: "t/h", status: "Normal" },
            { label: "Inlet O₂ (GAS-01)", value: "2.59", unit: "vol%", status: "Normal" },
            { label: "Inlet Gas Temp (TMP-13)", value: "1,086", unit: "°C", status: "Normal" },
            { label: "Inlet Draft (PRS-01)", value: "-3.82", unit: "mbar", status: "Normal" },
          ],
          inputs: [
            { name: "Pre-Calcined Raw Meal", category: "Material", rateOrSpec: "330 t/h (88% calcined)", sourceOrDestination: "From Cyclone C5 Flap Gate", status: "Normal" },
            { name: "Counterflow Flue Gas", category: "Gas", rateOrSpec: "1,086 °C (-3.82 mbar)", sourceOrDestination: "From Kiln Interior Riser", status: "Normal" },
            { name: "Inlet Lamella Boundary", category: "Gas", rateOrSpec: "< 0.30 vol% false-air index", sourceOrDestination: "Inlet Seal Barrier", status: "Normal" },
          ],
          outputs: [
            { name: "Meal Infeed to Calcining Zone", category: "Material", rateOrSpec: "330 t/h into Shell Section 0–15m", sourceOrDestination: "To Rotary Calcining Zone", status: "Normal" },
            { name: "Exhaust Gas to Precalciner", category: "Gas", rateOrSpec: "Induced Draw to Tower", sourceOrDestination: "To ID Fan Suction Header", status: "Normal" },
          ],
        },
        {
          id: "kln01-s2",
          stepNumber: "02",
          name: "630 kW Drive Train & Girth Gear Power Transmission",
          role: "Rotational Power Transmission",
          subtitle: "VFD inverter torque control, helical speed reduction, and girth gear meshing",
          health: 97,
          status: "Normal",
          healthNotes: "VFD torque steady at 62.1%; motor DE vibration 1.42 mm/s; pinion vibration 2.10 mm/s.",
          transformation: "Converts 630 kW VFD electrical power through a triple-reduction helical gearbox and 19-tooth pinion into 3.80 RPM rotation.",
          associatedParts: ["Main Drive Motor (630 kW)", "Triple-Reduction Gearbox", "Pinion & Girth Gear (Z=19/128)"],
          parameters: [
            { label: "Drive Torque (ELE-01)", value: "62.1", unit: "%", status: "Normal" },
            { label: "Kiln Speed (SPD-01)", value: "3.80", unit: "RPM", status: "Normal" },
            { label: "Motor DE Vib (VIB-01)", value: "1.42", unit: "mm/s", status: "Normal" },
            { label: "Pinion Vib (VIB-04)", value: "2.10", unit: "mm/s", status: "Normal" },
          ],
          inputs: [
            { name: "Medium Voltage Power", category: "Energy", rateOrSpec: "630 kW (3.3 kV VFD)", sourceOrDestination: "Drive MCC Substation", status: "Normal" },
            { name: "Gearbox Lube Oil Supply", category: "Utility", rateOrSpec: "2.24 bar (ISO VG 320)", sourceOrDestination: "Lube Skid Pump FLO-05", status: "Normal" },
            { name: "Spray Grease Delivery", category: "Utility", rateOrSpec: "120 g/h adhesive grease", sourceOrDestination: "Auto-Lube Spray Skid STS-05", status: "Normal" },
          ],
          outputs: [
            { name: "Mechanical Shell Torque", category: "Energy", rateOrSpec: "1,320 kN·m at 3.80 RPM", sourceOrDestination: "To Rotary Shell Body", status: "Normal" },
            { name: "Dynamic Vibration Waveform", category: "Reject", rateOrSpec: "GMF 16.7 Hz / Harmonics", sourceOrDestination: "To IEPE Accelerometers", status: "Normal" },
          ],
        },
        {
          id: "kln01-s3",
          stepNumber: "03",
          name: "3-Pier Roller Support & Station 2 Hydraulic Thrust Float",
          role: "Load Support & Axial Float",
          subtitle: "Hydrodynamic load sharing and hydraulic cylinder oscillating axial float ±20 mm",
          health: 96,
          status: "Normal",
          healthNotes: "Station 2 LVDT axial position -3.1 mm floating normally; bearing pair splits < 3.2 K across all 3 stations.",
          transformation: "Supports 3,200 t kiln deadweight across 3 piers while Station 2 hydraulic cylinder cycles axial float over a 4.2h period.",
          associatedParts: ["Station 1 Support Pier & Rollers", "Station 2 Hydraulic Thrust & Rollers", "Station 3 Support Pier & Rollers"],
          parameters: [
            { label: "LVDT Float (POS-01)", value: "-3.1", unit: "mm", status: "Normal" },
            { label: "Thrust Press (PRS-07)", value: "86.4", unit: "bar", status: "Normal" },
            { label: "Station 2 Left Temp (TMP-05)", value: "54.2", unit: "°C", status: "Normal" },
            { label: "Seal Overlap (CAL-07)", value: "37.0", unit: "mm", status: "Normal" },
          ],
          inputs: [
            { name: "Kiln Mass & Dynamic Load", category: "Material", rateOrSpec: "3,200 t total rotating mass", sourceOrDestination: "From Rotary Kiln Shell", status: "Normal" },
            { name: "Hydraulic Thrust Pressure", category: "Utility", rateOrSpec: "86.4 bar (40–120 bar)", sourceOrDestination: "Thrust HPU Manifold PRS-07", status: "Normal" },
          ],
          outputs: [
            { name: "Controlled Axial Oscillation", category: "Product", rateOrSpec: "±20 mm float period (4.2h)", sourceOrDestination: "Across Roller Contact Faces", status: "Normal" },
            { name: "Hydrodynamic Oil Film", category: "Utility", rateOrSpec: "38 µm wedge thickness", sourceOrDestination: "Station 1–3 Babbitt Bearings", status: "Normal" },
          ],
        },
        {
          id: "kln01-s4",
          stepNumber: "04",
          name: "Rotary Shell Clinkering & Infrared Thermal Scanner Mapping",
          role: "Thermal Pyroprocessing & Clinkering",
          subtitle: "High-temperature calcination and clinkering with 360° shell infrared line-scanner monitoring",
          health: 98,
          status: "Normal",
          healthNotes: "Shell max temp 327 °C; burning zone 1,448 °C; IR line-scanner coverage 98.4%.",
          transformation: "Cascades raw meal through the 1,450 °C burning zone to sinter alite and belite clinker phases under constant optical shell monitoring.",
          associatedParts: ["Rotary Shell & Refractory Lining", "Optical IR Shell Scanner (0–74m)", "Kiln Burner & Firing Hood"],
          parameters: [
            { label: "Shell Max Temp (CAL-03)", value: "327", unit: "°C", status: "Normal" },
            { label: "Burning Zone (TMP-14)", value: "1,448", unit: "°C", status: "Normal" },
            { label: "Scanner Coverage (STS-08)", value: "98.4", unit: "%", status: "Normal" },
            { label: "Coal Fuel Rate (FLO-02)", value: "10.58", unit: "t/h", status: "Normal" },
          ],
          inputs: [
            { name: "Pre-Calcined Raw Meal Bed", category: "Material", rateOrSpec: "330 t/h cascade bed", sourceOrDestination: "From Calcining Shell Section", status: "Normal" },
            { name: "Burner Coal Fuel (FLO-02)", category: "Energy", rateOrSpec: "10.58 t/h pulverized coal", sourceOrDestination: "Primary Burner Pipe Header", status: "Normal" },
            { name: "Secondary Combustion Air", category: "Gas", rateOrSpec: "~850 °C preheated air", sourceOrDestination: "Inducted from Grate Cooler", status: "Normal" },
          ],
          outputs: [
            { name: "Formed Clinker Nodules", category: "Product", rateOrSpec: "208 t/h sintered clinker", sourceOrDestination: "Moves to Discharge Hood", status: "Normal" },
            { name: "360° Shell Thermal Profile", category: "Energy", rateOrSpec: "250–330 °C (Peak 327 °C)", sourceOrDestination: "To IR Line-Scanner System", status: "Normal" },
          ],
        },
        {
          id: "kln01-s5",
          stepNumber: "05",
          name: "Discharge Hood & Outlet Seal Forced Air Cooling (74m)",
          role: "Discharge Containment & Cooler Quench",
          subtitle: "Clinker evacuation to grate cooler with negative hood draft and forced cooling fan",
          health: 98,
          status: "Normal",
          healthNotes: "Outlet seal cooling fan STS-KLN-10 RUNNING; hood static pressure -0.29 mbar negative.",
          transformation: "Discharges 1,400 °C clinker into the grate cooler while forced cooling fan protects lamella spring plates under negative hood draft.",
          associatedParts: ["Kiln Discharge Hood", "Kiln Outlet Lamella Seal (74m)", "Kiln Burner & Firing Hood"],
          parameters: [
            { label: "Hood Pressure (PRS-03)", value: "-0.29", unit: "mbar", status: "Normal" },
            { label: "Cooling Fan (STS-10)", value: "RUNNING", status: "Normal" },
            { label: "Clinker Production", value: "208", unit: "t/h", status: "Normal" },
            { label: "Shell Temp Near Seal", value: "327", unit: "°C", status: "Normal" },
          ],
          inputs: [
            { name: "Sintered Clinker Bed", category: "Material", rateOrSpec: "208 t/h (1,400 °C)", sourceOrDestination: "From Burning Zone Shell", status: "Normal" },
            { name: "Seal Forced Cooling Air", category: "Utility", rateOrSpec: "Blower Active (STS-10)", sourceOrDestination: "From Cooling Fan Duct", status: "Normal" },
          ],
          outputs: [
            { name: "Discharged Clinker to Cooler", category: "Product", rateOrSpec: "208 t/h to Grate Cooler", sourceOrDestination: "Into Clinker Grate Cooler", status: "Normal" },
            { name: "Preheated Secondary Air", category: "Gas", rateOrSpec: "~850 °C secondary air", sourceOrDestination: "Inducted into Kiln Burner Flame", status: "Normal" },
          ],
        },
        {
          id: "kln01-s6",
          stepNumber: "06",
          name: "Multi-Channel Primary Burner & Pulverized Coal Line (74m)",
          role: "Primary Firing & Thermal Input",
          subtitle: "10.58 t/h pulverized coal dosing with axial/radial swirl air flame shaping",
          health: 99,
          status: "Normal",
          healthNotes: "Primary flame momentum nominal; coal feeder SFM-02 steady at 10.58 t/h; burner primary air pressure 142 mbar.",
          transformation: "Injects 10.58 t/h pulverized coal with high-momentum primary air to sustain a 1,450 °C sintering flame core in the burning zone.",
          associatedParts: ["Kiln Burner & Firing Hood", "Raw Meal Feed & Primary Fuel Delivery"],
          parameters: [
            { label: "Coal Fuel Rate (FLO-02)", value: "10.58", unit: "t/h", status: "Normal" },
            { label: "Primary Air Pressure (PRS-05)", value: "142", unit: "mbar", status: "Normal" },
            { label: "Burning Zone Temp (TMP-14)", value: "1,448", unit: "°C", status: "Normal" },
            { label: "Hood Static Draft (PRS-03)", value: "-0.29", unit: "mbar", status: "Normal" },
          ],
          inputs: [
            { name: "Pulverized Fuel Stream", category: "Energy", rateOrSpec: "10.58 t/h (Schenck SFM-02)", sourceOrDestination: "From Coal Dosing Bin", status: "Normal" },
            { name: "Primary Swirl Air", category: "Gas", rateOrSpec: "142 mbar (Roots Blower)", sourceOrDestination: "Primary Air Skid", status: "Normal" },
          ],
          outputs: [
            { name: "Sintering Flame Core", category: "Energy", rateOrSpec: "1,448 °C Thermal Plasma Core", sourceOrDestination: "Into Burning Zone Shell", status: "Normal" },
            { name: "Radiant Heat Heat Flux", category: "Energy", rateOrSpec: "3,050 kJ/kg Clinker", sourceOrDestination: "To Clinker Sinter Bed", status: "Normal" },
          ],
        },
      ];

    case "DRV-KLN-01":
      return [
        {
          id: "drvkln-s1",
          stepNumber: "01",
          name: "630 kW VFD Inverter & MV Main Motor Power Conversion",
          role: "Electrical Power Conversion",
          subtitle: "Variable-frequency inverter speed regulation and stator torque generation",
          health: 98,
          status: "Normal",
          healthNotes: "Stator winding temp 88.4 °C (limit 130 °C); motor DE vibration 1.42 mm/s (limit 4.5 mm/s).",
          transformation: "Modulates 3.3 kV medium voltage supply to drive the 630 kW induction motor between 2.5 and 4.8 RPM equivalent kiln speed.",
          associatedParts: ["Main Drive Motor (630 kW)", "Main Drive VFD Inverter (MCC)"],
          parameters: [
            { label: "Motor Current / Torque (ELE-01)", value: "62.1", unit: "%", status: "Normal" },
            { label: "Stator Winding Temp (TMP-21)", value: "88.4", unit: "°C", status: "Normal" },
            { label: "Motor DE Bearing Temp (TMP-19)", value: "58.2", unit: "°C", status: "Normal" },
            { label: "Motor DE Vibration (VIB-01)", value: "1.42", unit: "mm/s", status: "Normal" },
          ],
          inputs: [
            { name: "Medium-Voltage Supply", category: "Energy", rateOrSpec: "3.3 kV 50 Hz Grid", sourceOrDestination: "Plant Substation Pyro Bus", status: "Normal" },
            { name: "DCS Speed Setpoint", category: "Utility", rateOrSpec: "3.80 RPM Target", sourceOrDestination: "Yokogawa DCS Speed Loop", status: "Normal" },
          ],
          outputs: [
            { name: "Motor High-Speed Shaft Output", category: "Energy", rateOrSpec: "990 RPM shaft rotation", sourceOrDestination: "Into Flexible Spacer Coupling", status: "Normal" },
            { name: "VFD Status Telemetry", category: "Utility", rateOrSpec: "OPC UA / Modbus TCP 1s", sourceOrDestination: "ULTRON Edge Gateway Slot 01", status: "Normal" },
          ],
        },
        {
          id: "drvkln-s2",
          stepNumber: "02",
          name: "Triple-Reduction Helical Gearbox & Forced Lube Oil Skid",
          role: "Torque Multiplication & Lubrication",
          subtitle: "Speed reduction from 990 to 53.2 RPM with pressurized lube circulation",
          health: 96,
          status: "Normal",
          healthNotes: "Gearbox lube pressure 2.24 bar (limit > 1.2 bar); sump oil temp 54.8 °C (limit 75 °C); oil flow OK.",
          transformation: "Reduces shaft speed from 990 RPM down to 53.2 RPM while multiplying torque and circulating filtered ISO VG 320 lube oil.",
          associatedParts: ["Triple-Reduction Helical Gearbox", "Forced Lubrication Skid"],
          parameters: [
            { label: "Gearbox Input Vib (VIB-02)", value: "1.68", unit: "mm/s", status: "Normal" },
            { label: "Gearbox Output Vib (VIB-03)", value: "1.84", unit: "mm/s", status: "Normal" },
            { label: "Lube Oil Pressure (PRS-04)", value: "2.24", unit: "bar", status: "Normal" },
            { label: "Sump Oil Temp (TMP-15)", value: "54.8", unit: "°C", status: "Normal" },
          ],
          inputs: [
            { name: "High-Speed Motor Shaft", category: "Energy", rateOrSpec: "990 RPM input torque", sourceOrDestination: "From Main Motor Spacer Coupling", status: "Normal" },
            { name: "Pressurized Lube Oil", category: "Utility", rateOrSpec: "2.24 bar (ISO VG 320)", sourceOrDestination: "Lube Skid Pump FLO-05 / LEV-01", status: "Normal" },
          ],
          outputs: [
            { name: "Low-Speed Intermediate Shaft", category: "Energy", rateOrSpec: "53.2 RPM output torque", sourceOrDestination: "To Drive Pinion Shaft", status: "Normal" },
            { name: "Condition Telemetry", category: "Utility", rateOrSpec: "IEPE & Pt100 Signals", sourceOrDestination: "To ULTRON Rack 1 Slots 02, 03, 10, 11", status: "Normal" },
          ],
        },
        {
          id: "drvkln-s3",
          stepNumber: "03",
          name: "Pinion & Girth Gear Meshing with Automatic Spray Lubrication",
          role: "Final Drive Transmission",
          subtitle: "19-tooth pinion driving 128-tooth girth gear with intermittent adhesive spray",
          health: 97,
          status: "Normal",
          healthNotes: "Pinion vibration 2.10 mm/s (limit 5.6 mm/s); spray status OK; auxiliary barring drive READY.",
          transformation: "Drives the 128-tooth kiln girth gear at 3.80 RPM via the 19-tooth pinion while automated spray system deposits adhesive lubricant.",
          associatedParts: ["Pinion & Girth Gear (Z=19/128)", "Auxiliary Drive Barring Unit"],
          parameters: [
            { label: "Pinion Bearing Vib (VIB-04)", value: "2.10", unit: "mm/s", status: "Normal" },
            { label: "Kiln Operating Speed (SPD-01)", value: "3.80", unit: "RPM", status: "Normal" },
            { label: "Girth Spray System (STS-05)", value: "OK", status: "Normal" },
            { label: "Aux Drive Barring (STS-11)", value: "READY", status: "Normal" },
          ],
          inputs: [
            { name: "Pinion Shaft Rotation", category: "Energy", rateOrSpec: "53.2 RPM drive torque", sourceOrDestination: "From Gearbox Output Shaft", status: "Normal" },
            { name: "Adhesive Spray Grease", category: "Utility", rateOrSpec: "120 g/h pulse cycles", sourceOrDestination: "Girth Spray Skid System STS-05", status: "Normal" },
          ],
          outputs: [
            { name: "Rotary Kiln Shell Drive", category: "Energy", rateOrSpec: "1,320 kN·m at 3.80 RPM", sourceOrDestination: "Transmitted to Kiln Shell Body", status: "Normal" },
            { name: "Tooth Flank Meshing Data", category: "Utility", rateOrSpec: "GMF 16.7 Hz spectral energy", sourceOrDestination: "To IEPE Card Slot 04 (VIB-04)", status: "Normal" },
          ],
        },
      ];

    case "SUP-KLN-01":
      return [
        {
          id: "supkln-s1",
          stepNumber: "01",
          name: "3-Station Roller Bearings & Hydrodynamic Load Sharing",
          role: "Load Distribution & Bearing Support",
          subtitle: "Gravimetric support across 3 piers with 12 Pt100 RTD duplex bearing temperature monitoring",
          health: 97,
          status: "Normal",
          healthNotes: "All 12 bearing temperatures between 46.2 °C and 55.4 °C; bearing pair splits < 3.2 K across Stations 1, 2, and 3.",
          transformation: "Distributes 3,200 t kiln rotating load across 6 hydrodynamic roller bearings with synthetic oil bath lubrication.",
          associatedParts: ["Station 1 Support Pier & Rollers", "Station 2 Support Rollers", "Station 3 Support Pier & Rollers"],
          parameters: [
            { label: "Station 1 Bearing Avg (TMP-01–04)", value: "48.6", unit: "°C", status: "Normal" },
            { label: "Station 2 Bearing Avg (TMP-05–08)", value: "54.2", unit: "°C", status: "Normal" },
            { label: "Station 3 Bearing Avg (TMP-09–12)", value: "51.8", unit: "°C", status: "Normal" },
            { label: "Max Bearing Pair Split", value: "2.4", unit: "K", status: "Normal" },
          ],
          inputs: [
            { name: "Rotating Shell & Charge Load", category: "Material", rateOrSpec: "3,200 t deadweight & bed", sourceOrDestination: "From Riding Tyres 1, 2, 3", status: "Normal" },
            { name: "Synthetic Lube Oil", category: "Utility", rateOrSpec: "ISO VG 460 bath lubrication", sourceOrDestination: "Roller Bearing Pedestals", status: "Normal" },
          ],
          outputs: [
            { name: "Equalized Pier Load Reaction", category: "Energy", rateOrSpec: "~1,070 t per pier", sourceOrDestination: "Civil Concrete Foundation Piers", status: "Normal" },
            { name: "Bearing Telemetry Vector", category: "Utility", rateOrSpec: "12 Channels Pt100 RTDs", sourceOrDestination: "To ULTRON Rack 2 Slots 01–10", status: "Normal" },
          ],
        },
        {
          id: "supkln-s2",
          stepNumber: "02",
          name: "Station 2 Hydraulic Thrust Cylinder & LVDT Axial Float",
          role: "Axial Positioning & Float Regulation",
          subtitle: "Hydraulic thrust cylinder oscillating kiln ±20 mm with continuous LVDT feedback",
          health: 96,
          status: "Normal",
          healthNotes: "LVDT position -3.1 mm (normal ±20 mm); thrust pressure 86.4 bar (normal 40–120 bar); limit switches CLEAR.",
          transformation: "Maintains controlled axial kiln movement against 3.5% downward slope to equalize tyre-to-roller contact wear.",
          associatedParts: ["Station 2 Hydraulic Thrust Cylinder", "LVDT Linear Position Sensor", "Station 2 Support Rollers"],
          parameters: [
            { label: "LVDT Axial Float (POS-01)", value: "-3.1", unit: "mm", status: "Normal" },
            { label: "Thrust Pressure (PRS-07)", value: "86.4", unit: "bar", status: "Normal" },
            { label: "Safety Limit Switches (POS-02)", value: "CLEAR", status: "Normal" },
            { label: "Float Cycle Duration", value: "4.2", unit: "h", status: "Normal" },
          ],
          inputs: [
            { name: "Gravitational Downhill Force", category: "Energy", rateOrSpec: "112 t downhill gravity vector", sourceOrDestination: "3.5% Kiln Slope Vector", status: "Normal" },
            { name: "Hydraulic Power Supply", category: "Utility", rateOrSpec: "86.4 bar oil delivery", sourceOrDestination: "Station 2 Thrust HPU Skid", status: "Normal" },
          ],
          outputs: [
            { name: "Controlled Axial Oscillation", category: "Product", rateOrSpec: "±20 mm sinusoidal float", sourceOrDestination: "Across Roller Surface Flanks", status: "Normal" },
            { name: "Safety Position Interlocks", category: "Utility", rateOrSpec: "POS-01 / POS-02 Telemetry", sourceOrDestination: "To ULTRON Rack 2 Slots 11, 12", status: "Normal" },
          ],
        },
        {
          id: "supkln-s3",
          stepNumber: "03",
          name: "Support Roller Skew Alignment & Riding Tyre Tracking",
          role: "Mechanical Alignment & Tracking",
          subtitle: "Precision roller skew angle maintaining axial equilibrium across all three riding tyres",
          health: 97,
          status: "Normal",
          healthNotes: "Roller skew angles within 0.04° tolerance; tyre slip nominal at 8.2 mm/rev; zero flank galling.",
          transformation: "Directs upward thrust component through minute roller skew adjustments to balance gravitational axial drift.",
          associatedParts: ["Station 1 Support Pier & Rollers", "Station 2 Support Rollers", "Station 3 Support Pier & Rollers"],
          parameters: [
            { label: "Station 2 Skew Offset", value: "+0.04", unit: "°", status: "Normal" },
            { label: "Tyre 2 Slip Clearance", value: "8.2", unit: "mm/rev", status: "Normal" },
            { label: "Roller Face Contact Width", value: "92", unit: "%", status: "Normal" },
            { label: "Station Load Shift Residual", value: "1.2", unit: "%", status: "Normal" },
          ],
          inputs: [
            { name: "Tyre Rotational Motion", category: "Energy", rateOrSpec: "3.80 RPM riding tyre rotation", sourceOrDestination: "From Rotary Kiln Shell", status: "Normal" },
            { name: "Graphite Block Lubrication", category: "Utility", rateOrSpec: "Dry film lubrication", sourceOrDestination: "Roller Flank Contact Bars", status: "Normal" },
          ],
          outputs: [
            { name: "Neutralized Axial Drift", category: "Product", rateOrSpec: "Balanced kiln centerline", sourceOrDestination: "Station 1–3 Foundations", status: "Normal" },
            { name: "Wear Debris Baseline", category: "Reject", rateOrSpec: "Zero micro-flaking debris", sourceOrDestination: "Lube Oil Analysis Ledger", status: "Normal" },
          ],
        },
      ];

    case "PRC-KLN-01":
      return [
        {
          id: "prckln-s1",
          stepNumber: "01",
          name: "Raw Meal Solid Infeed & Primary Coal Burner Combustion",
          role: "Feed Conditioning & Thermal Energy",
          subtitle: "Gravimetric raw meal weighfeeding and burner coal delivery establishing burning zone thermal core",
          health: 99,
          status: "Normal",
          healthNotes: "Kiln feed 330 t/h; fuel flow 10.58 t/h; burning zone pyrometer 1,448 °C.",
          transformation: "Injects pulverized coal fuel and loss-in-weight solid feed to sustain the 1,450 °C sintering flame.",
          associatedParts: ["Kiln Burner & Firing Hood", "Preheater Feed Infeed System"],
          parameters: [
            { label: "Kiln Feed Rate (FLO-01)", value: "330", unit: "t/h", status: "Normal" },
            { label: "Burner Fuel Rate (FLO-02)", value: "10.58", unit: "t/h", status: "Normal" },
            { label: "Burning Zone Temp (TMP-14)", value: "1,448", unit: "°C", status: "Normal" },
            { label: "Discharge Hood Draft (PRS-03)", value: "-0.29", unit: "mbar", status: "Normal" },
          ],
          inputs: [
            { name: "Pre-Calcined Raw Meal", category: "Material", rateOrSpec: "330 t/h (88% calcination)", sourceOrDestination: "From Cyclone C5 Loss-in-Weight Feeder", status: "Normal" },
            { name: "Pulverized Burner Coal", category: "Energy", rateOrSpec: "10.58 t/h (28 MJ/kg)", sourceOrDestination: "From Fuel Dosing Weighfeeder", status: "Normal" },
            { name: "Preheated Secondary Air", category: "Gas", rateOrSpec: "~850 °C from Grate Cooler", sourceOrDestination: "Inducted through Firing Hood", status: "Normal" },
          ],
          outputs: [
            { name: "Clinkering Thermal Flame Core", category: "Energy", rateOrSpec: "1,448 °C radiant flame", sourceOrDestination: "Into Burning Zone Shell Interior", status: "Normal" },
            { name: "Combustion Flue Gas Stream", category: "Gas", rateOrSpec: "Counterflow draw to inlet", sourceOrDestination: "Moving toward Kiln Inlet (Stage 02)", status: "Normal" },
          ],
        },
        {
          id: "prckln-s2",
          stepNumber: "02",
          name: "Inlet Gas Stoichiometry & Continuous O₂ / CO Analyser Sampling",
          role: "Flue Gas Combustion Analysis",
          subtitle: "Extractive paramagnetic O₂ and photometric CO measurement with automated blowback purge",
          health: 99,
          status: "Normal",
          healthNotes: "Inlet O₂ 2.59 vol% (normal 1.5–3.5 vol%); CO 120 ppm (normal < 500 ppm); analyser status OK.",
          transformation: "Extracts counterflow flue gas at the kiln-inlet riser to monitor complete combustion and detect air leakage.",
          associatedParts: ["Extractive Gas Analyser Sampling System", "Inlet Housing & Riser Duct"],
          parameters: [
            { label: "Inlet O₂ Concentration (GAS-01)", value: "2.59", unit: "vol%", status: "Normal" },
            { label: "Inlet CO Concentration (GAS-02)", value: "120", unit: "ppm", status: "Normal" },
            { label: "Gas Analyser Status (STS-06)", value: "OK", status: "Normal" },
            { label: "Combustion Excess Air (Lambda)", value: "1.14", status: "Normal" },
          ],
          inputs: [
            { name: "Extracted Flue Gas Sample", category: "Gas", rateOrSpec: "10 L/min sample suction", sourceOrDestination: "Kiln-Inlet Riser Duct Sampling Tap", status: "Normal" },
            { name: "Instrument Air Blowback Purge", category: "Utility", rateOrSpec: "6 bar periodic pulse (STS-06)", sourceOrDestination: "Plant Instrument Air Header", status: "Normal" },
          ],
          outputs: [
            { name: "Real-Time Flue Gas Analysis", category: "Utility", rateOrSpec: "OPC UA & 4–20 mA Signals", sourceOrDestination: "To ULTRON Rack 3 Slots 01, 02, 05", status: "Normal" },
            { name: "Combustion Control Feedback", category: "Energy", rateOrSpec: "DCS fuel/air ratio trim", sourceOrDestination: "To Burner Fan Control Loop", status: "Normal" },
          ],
        },
        {
          id: "prckln-s3",
          stepNumber: "03",
          name: "Riser Duct Static Draft & Aerodynamic Preheater Balance",
          role: "Draft Aerodynamics & Containment",
          subtitle: "Negative draft balancing at kiln inlet preventing flame backdraft and dust spillage",
          health: 98,
          status: "Normal",
          healthNotes: "Inlet draft -3.82 mbar; gas temperature 1,086 °C; ID fan draft damper steady at 68.4%.",
          transformation: "Balances ID fan suction against kiln thermal buoyancy to maintain stable negative static draft across the entire pyro line.",
          associatedParts: ["Inlet Housing & Riser Duct", "Kiln Discharge Hood"],
          parameters: [
            { label: "Inlet Static Draft (PRS-01)", value: "-3.82", unit: "mbar", status: "Normal" },
            { label: "Inlet Gas Temperature (TMP-13)", value: "1,086", unit: "°C", status: "Normal" },
            { label: "Discharge Hood Draft (PRS-03)", value: "-0.29", unit: "mbar", status: "Normal" },
            { label: "Preheater ID Fan Damper", value: "68.4", unit: "%", status: "Normal" },
          ],
          inputs: [
            { name: "Kiln Interior Flue Gas", category: "Gas", rateOrSpec: "1,086 °C counterflow gas", sourceOrDestination: "From Kiln Sintering Interior", status: "Normal" },
            { name: "Preheater ID Fan Induced Suction", category: "Energy", rateOrSpec: "-3.82 mbar riser vacuum", sourceOrDestination: "Preheater Induced Draft Fan", status: "Normal" },
          ],
          outputs: [
            { name: "Exhaust Stream to Precalciner", category: "Gas", rateOrSpec: "Drafted into Cyclone C5/C4", sourceOrDestination: "Into Preheater Calciner Tower", status: "Normal" },
            { name: "Static Draft Telemetry", category: "Utility", rateOrSpec: "PRS-01 & TMP-13 Data Link", sourceOrDestination: "To ULTRON Rack 3 Slots 03, 04", status: "Normal" },
          ],
        },
      ];

    case "SHL-KLN-01":
      return [
        {
          id: "kln-s1",
          stepNumber: "01",
          name: "Preheater Infeed & Inlet Seal Interface (0m)",
          role: "Negative Draft Feed Induction",
          subtitle: "Hot meal induction from preheater cyclone C5 with lamella seal preventing ambient cold air ingress",
          health: 99,
          status: "Normal",
          healthNotes: "Inlet false-air index CAL-KLN-06 within normal range (<0.3 vol%); meal spillage chute clear.",
          transformation: "Transfers pre-calcined raw meal from preheater cyclone C5 into the rotating kiln inlet while maintaining airtight negative draft seal.",
          associatedParts: ["Inlet Lamella Seal (P1)", "Preheater Feed Chute (P4)"],
          parameters: [
            { label: "Kiln Feed Rate", value: "330", unit: "t/h", status: "Normal" },
            { label: "Inlet O₂ (GAS-01)", value: "2.59", unit: "vol%", status: "Normal" },
            { label: "Inlet Gas Temp (TMP-13)", value: "1,086", unit: "°C", status: "Normal" },
            { label: "Inlet Draft (PRS-01)", value: "-3.82", unit: "mbar", status: "Normal" },
          ],
          inputs: [
            { name: "Pre-Calcined Raw Meal", category: "Material", rateOrSpec: "330 t/h (88% calcined)", sourceOrDestination: "From Cyclone C5 Flap Gate", status: "Normal" },
            { name: "Kiln Counterflow Flue Gas", category: "Gas", rateOrSpec: "1,086 °C (-3.82 mbar draft)", sourceOrDestination: "From Rotary Kiln Interior", status: "Normal" },
            { name: "Ambient Seal Boundary", category: "Gas", rateOrSpec: "< 0.30 vol% false air index", sourceOrDestination: "Inlet Lamella Overlap Barrier", status: "Normal" },
          ],
          outputs: [
            { name: "Meal Infeed to Calcining Zone", category: "Material", rateOrSpec: "330 t/h into Kiln Inlet", sourceOrDestination: "Into Kiln Section 0-15m", status: "Normal" },
            { name: "Exhaust Gas to Riser/Calciner", category: "Gas", rateOrSpec: "Draw to Preheater Tower", sourceOrDestination: "To Cyclone Preheater Fan", status: "Normal" },
          ],
        },
        {
          id: "kln-s2",
          stepNumber: "02",
          name: "Rotary Shell Clinkering & Station 2 Axial Float",
          role: "Pyro-Processing & Axial Tracking",
          subtitle: "High-temperature calcination and clinkering with Station 2 hydraulic thrust maintaining axial float",
          health: 98,
          status: "Normal",
          healthNotes: "Station 2 LVDT axial position (-3.1 mm) floating normally; seal overlap margin (37.0 mm) safely above 15 mm minimum limit.",
          transformation: "Rotates shell at 3.8 RPM to cascade meal through the 1,450°C burning zone while hydraulic thrust cylinder oscillates shell axially ±20 mm across support rollers.",
          associatedParts: ["Rotary Shell Body (P4)", "Station 2 LVDT Thrust Collar (P3)"],
          parameters: [
            { label: "Kiln Speed (SPD-01)", value: "3.80", unit: "RPM", status: "Normal" },
            { label: "Burning Zone Temp", value: "1,448", unit: "°C", status: "Normal" },
            { label: "LVDT Float (POS-01)", value: "-3.1", unit: "mm", status: "Normal" },
            { label: "Seal Overlap (CAL-07)", value: "37.0", unit: "mm", status: "Normal" },
          ],
          inputs: [
            { name: "Calcined Raw Meal", category: "Material", rateOrSpec: "330 t/h", sourceOrDestination: "From Inlet Calcining Zone", status: "Normal" },
            { name: "Burner Coal Fuel (FLO-02)", category: "Energy", rateOrSpec: "10.58 t/h (Pulverized Coal)", sourceOrDestination: "From Coal Bin Weighfeeder", status: "Normal" },
            { name: "Main Drive Torque (630 kW)", category: "Energy", rateOrSpec: "62.1% nominal torque", sourceOrDestination: "From Drive Train DRV-KLN-01", status: "Normal" },
          ],
          outputs: [
            { name: "Formed Clinker Nodules", category: "Product", rateOrSpec: "~208 t/h clinker output", sourceOrDestination: "Moves to Firing Discharge", status: "Normal" },
            { name: "Shell IR Thermal Profile", category: "Energy", rateOrSpec: "250 – 330 °C (Max 327 °C)", sourceOrDestination: "To IR Shell Scanner STS-08", status: "Normal" },
          ],
        },
        {
          id: "kln-s3",
          stepNumber: "03",
          name: "Kiln Discharge Hood & Outlet Seal Forced Cooling (74m)",
          role: "Discharge Containment & Cooling",
          subtitle: "Clinker drop to grate cooler with air-cooled lamella seal and secondary air induction",
          health: 98,
          status: "Normal",
          healthNotes: "Seal cooling fan STS-KLN-10 RUNNING; hood static pressure (-0.29 mbar) negative; no hot dust blowout.",
          transformation: "Discharges 1,400°C clinker nodules into the grate cooler while forced cooling fan protects lamella spring plates from thermal warping under negative hood pressure.",
          associatedParts: ["Outlet Air-Cooled Seal (P2)", "Kiln Firing Hood (Fixed)"],
          parameters: [
            { label: "Hood Pressure (PRS-03)", value: "-0.29", unit: "mbar", status: "Normal" },
            { label: "Cooling Fan (STS-10)", value: "RUNNING", status: "Normal" },
            { label: "Outlet Shell Temp", value: "327", unit: "°C", status: "Normal" },
            { label: "Clinker Production", value: "208", unit: "t/h", status: "Normal" },
          ],
          inputs: [
            { name: "Molten Clinker Bed", category: "Material", rateOrSpec: "208 t/h (1,400 °C)", sourceOrDestination: "From Burning Zone Shell", status: "Normal" },
            { name: "Seal Forced Cooling Air", category: "Utility", rateOrSpec: "Blower Fan Active (STS-10)", sourceOrDestination: "From Outlet Seal Fan Duct", status: "Normal" },
          ],
          outputs: [
            { name: "Discharged Clinker to Cooler", category: "Product", rateOrSpec: "208 t/h to Grate Cooler", sourceOrDestination: "Into Clinker Grate Cooler", status: "Normal" },
            { name: "Preheated Secondary Air", category: "Gas", rateOrSpec: "~850 °C Combustion Air", sourceOrDestination: "Inducted into Kiln Burner Flame", status: "Normal" },
          ],
        },
      ];
    default:
      // Generic fallback based on machine properties
      return [
        {
          id: `${machine.id}-s1`,
          stepNumber: "01",
          name: "Infeed Induction & Conditioning",
          role: "Infeed Preparation",
          subtitle: "Material intake and preliminary feed metering",
          health: machine.health,
          status: machine.status === "Advisory" ? "Advisory" : machine.status === "Maintenance" ? "Critical" : "Normal",
          healthNotes: "Infeed condition nominal; sensors active.",
          transformation: `Regulates raw incoming stream for ${machine.name} operation.`,
          associatedParts: [machine.parts[0]?.name || "Infeed Assembly"],
          parameters: [
            { label: "Operating Speed", value: machine.operatingSpeed, status: "Normal" },
            { label: "Active Channels", value: `${machine.signalsCount}`, status: "Normal" },
          ],
          inputs: [
            { name: "Raw Infeed Stream", category: "Material", rateOrSpec: "Nominal Feed", sourceOrDestination: "Upstream Process", status: "Normal" },
          ],
          outputs: [
            { name: "Conditioned Feed", category: "Product", rateOrSpec: "Operational", sourceOrDestination: "Into Core Process", status: "Normal" },
          ],
        },
        {
          id: `${machine.id}-s2`,
          stepNumber: "02",
          name: "Core Mechanical Transformation",
          role: "Main Processing",
          subtitle: "Main mechanical operation and energy conversion",
          health: machine.health,
          status: machine.status === "Advisory" ? "Advisory" : machine.status === "Maintenance" ? "Critical" : "Normal",
          healthNotes: "Operating within nominal equipment envelope.",
          transformation: `Converts ${machine.powerRating} drive energy into primary unit operation.`,
          associatedParts: machine.parts.slice(1, 3).map((p) => p.name),
          parameters: [
            { label: "Power Rating", value: machine.powerRating, status: "Normal" },
            { label: "Speed Setpoint", value: machine.operatingSpeed, status: "Normal" },
          ],
          inputs: [
            { name: "Conditioned Feed", category: "Product", rateOrSpec: "Nominal", sourceOrDestination: "From Stage 01", status: "Normal" },
            { name: "Drive Power", category: "Energy", rateOrSpec: machine.powerRating, sourceOrDestination: "Plant Substation", status: "Normal" },
          ],
          outputs: [
            { name: "Processed Stream", category: "Product", rateOrSpec: "Transformed", sourceOrDestination: "To Discharge Stage", status: "Normal" },
          ],
        },
        {
          id: `${machine.id}-s3`,
          stepNumber: "03",
          name: "Discharge & Downstream Hand-Off",
          role: "Discharge Evacuation",
          subtitle: "Delivery to downstream process cell",
          health: 98,
          status: "Normal",
          healthNotes: "Discharge parameters stable.",
          transformation: "Delivers processed output to the downstream plant circuit.",
          associatedParts: [machine.parts[machine.parts.length - 1]?.name || "Discharge Assembly"],
          parameters: [
            { label: "Discharge Health", value: "98%", status: "Normal" },
          ],
          inputs: [
            { name: "Processed Stream", category: "Product", rateOrSpec: "Nominal", sourceOrDestination: "From Stage 02", status: "Normal" },
          ],
          outputs: [
            { name: "Final Stage Output", category: "Product", rateOrSpec: "To Next Unit", sourceOrDestination: "Downstream Circuit", status: "Normal" },
          ],
        },
      ];
  }
}
