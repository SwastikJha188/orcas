"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { PillButton, PillNav, type Tone } from "@/components/ui";
import { StatusTag } from "@/components/assets/assets-shell-ui";
import { KpiStrip, Section } from "@/components/assets/analysis/an-ui";
import { PRIMARY_PYRO_ID, PRIMARY_VPC_ID, useKilnFleet, usePrimaryMachineId } from "@/providers/kiln-simulation-context";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { DIAGNOSIS_RULE_KEY } from "@/components/assets/diagnosis-view";
import "@/components/assets/assets-shell.css";
import "@/components/assets/analysis/analysis-page.css";
import "@/components/ui/page.css";
import "./pms.css";

/* ==========================================================================
   Maintenance Workspace:
   1. Preventive Maintenance — Daily · Weekly · 15 Days · 1 Month checklists
      with Boots on Ground (BOG: RFID scan + photo proof) toggle per task.
   2. Predictive Maintenance — Alerts coming from our system and what our
      system recommends to check, with Boots on Ground (BOG) toggle per task.
   3. Proactive Maintenance — Component lifespan tracking where parts approaching
      their rated lifespan are cautiously replaced before failure.
   ========================================================================== */

type MaintTab = "all" | "preventive" | "predictive" | "proactive";
type PreventiveInterval = "all" | "Daily" | "Weekly" | "15 days" | "1 month";

interface PreventiveTask {
  id: string;
  machineId: string;
  machineName: string;
  interval: Exclude<PreventiveInterval, "all">;
  component: string;
  check: string;
  passCriteria: string;
  owner: string;
  defaultBog: boolean;
}

interface PredictiveTask {
  id: string;
  machineId: string;
  machineName: string;
  ruleId?: string;
  severity: "Critical" | "Advisory";
  alertTitle: string;
  evidence: string;
  recommendedCheck: string;
  source: string;
  defaultBog: boolean;
}

interface ProactivePart {
  id: string;
  machineId: string;
  machineName: string;
  component: string;
  used: number;
  rated: number;
  unit: string;
  remainingText: string;
  reason: string;
}

const MAINT_TABS: { id: MaintTab; label: string }[] = [
  { id: "all", label: "All maintenance" },
  { id: "preventive", label: "Preventive maintenance" },
  { id: "predictive", label: "Predictive maintenance" },
  { id: "proactive", label: "Proactive maintenance" },
];

const INTERVAL_ITEMS: { id: PreventiveInterval; label: string }[] = [
  { id: "all", label: "All intervals" },
  { id: "Daily", label: "Daily" },
  { id: "Weekly", label: "Weekly" },
  { id: "15 days", label: "15 days" },
  { id: "1 month", label: "1 month" },
];

/* --------------------------------------------------------------------------
   Preventive Maintenance Checklists (Daily · Weekly · 15 days · 1 month)
   -------------------------------------------------------------------------- */

const VPC_PREVENTIVE_TASKS: PreventiveTask[] = [
  // Daily
  {
    id: "VPC-PM-D01",
    machineId: "VPC-066",
    machineName: "Schultheiss VPC 066",
    interval: "Daily",
    component: "Graphite crucible & bottom pouring nozzle",
    check: "Inspect crucible wall thickness, nozzle bore erosion and slag residue before first casting batch.",
    passCriteria: "No cracks, spalling or nozzle restriction; clean bore.",
    owner: "Operator",
    defaultBog: true,
  },
  {
    id: "VPC-PM-D02",
    machineId: "VPC-066",
    machineName: "Schultheiss VPC 066",
    interval: "Daily",
    component: "Upper chamber lid Viton O-ring & sight glass (P1 / S2)",
    check: "Clean lid sealing groove, inspect Viton O-ring for thermal flattening or nicks, and wipe sight glass.",
    passCriteria: "Seal supple and continuous; holds vacuum and 1.2–3.0 bar overpressure.",
    owner: "Operator",
    defaultBog: true,
  },
  {
    id: "VPC-PM-D03",
    machineId: "VPC-066",
    machineName: "Schultheiss VPC 066",
    interval: "Daily",
    component: "Stopper / sealing rod tip & crucible seat (S1)",
    check: "Verify stopper tip concentricity with crucible pouring nozzle and check drip-free seating.",
    passCriteria: "Clean spherical contact; no premature melt dribble during pump-down.",
    owner: "Operator",
    defaultBog: true,
  },
  {
    id: "VPC-PM-D04",
    machineId: "VPC-066",
    machineName: "Schultheiss VPC 066",
    interval: "Daily",
    component: "Flask adapter plate & silicone/graphite gasket (P2)",
    check: "Clean investment powder residue from flask seating collar and inspect inter-chamber gasket.",
    passCriteria: "Flat, clean seating ring; lower flask vacuum reaches 300 mbar abs on time.",
    owner: "Operator",
    defaultBog: true,
  },
  {
    id: "VPC-PM-D05",
    machineId: "VPC-066",
    machineName: "Schultheiss VPC 066",
    interval: "Daily",
    component: "Rotary-vane vacuum pump oil level & condition (V1 / T4)",
    check: "Inspect pump sight glass for oil level, emulsification or darkening before shift start.",
    passCriteria: "Oil clear and within sight-glass marks; pump housing T4 ≤ 62 °C.",
    owner: "Operator",
    defaultBog: false,
  },
  // Weekly
  {
    id: "VPC-PM-W01",
    machineId: "VPC-066",
    machineName: "Schultheiss VPC 066",
    interval: "Weekly",
    component: "In-line investment dust & zinc-vapour vacuum filter (P4)",
    check: "Open vacuum branch filter housing, clean or replace cartridge element and inspect housing O-ring.",
    passCriteria: "Unrestricted evacuation flow; P2 − P4 differential ≤ 25 mbar.",
    owner: "Mechanical",
    defaultBog: true,
  },
  {
    id: "VPC-PM-W02",
    machineId: "VPC-066",
    machineName: "Schultheiss VPC 066",
    interval: "Weekly",
    component: "12 kW induction coil turns & ceramic sleeve (E1 / T1)",
    check: "Inspect copper coil turns for alloy splash, turn-to-turn spacing and refractory sleeve condition.",
    passCriteria: "Zero metallic bridges or carbon tracking; coil insulation intact.",
    owner: "Electrical",
    defaultBog: true,
  },
  {
    id: "VPC-PM-W03",
    machineId: "VPC-066",
    machineName: "Schultheiss VPC 066",
    interval: "Weekly",
    component: "Chamber clamp lock & safety interlock switch (S2)",
    check: "Test upper lid mechanical lock engagement and verify overpressure cycle inhibit when unlatched.",
    passCriteria: "Positive lock engagement; S2 reports LOCKED only when fully latched.",
    owner: "Mechanical",
    defaultBog: true,
  },
  {
    id: "VPC-PM-W04",
    machineId: "VPC-066",
    machineName: "Schultheiss VPC 066",
    interval: "Weekly",
    component: "Pneumatic stopper lift actuator & guide bushing (S1)",
    check: "Cycle pouring actuator and check for smooth 45 mm lift stroke without stick-slip or air bypass.",
    passCriteria: "Full stroke within 0.4 s; no binding or rod side-play.",
    owner: "Mechanical",
    defaultBog: false,
  },
  // 15 days
  {
    id: "VPC-PM-F01",
    machineId: "VPC-066",
    machineName: "Schultheiss VPC 066",
    interval: "15 days",
    component: "Cooling-water inline strainer & coil manifold (F1 / DT1)",
    check: "Isolate cooling water loop, remove and clean inline mesh strainer, and flush induction coil manifold.",
    passCriteria: "Cooling flow F1 ≥ 14.0 L/min and temperature rise DT1 (T3 − T2) ≤ 6.0 °C.",
    owner: "Mechanical",
    defaultBog: true,
  },
  {
    id: "VPC-PM-F02",
    machineId: "VPC-066",
    machineName: "Schultheiss VPC 066",
    interval: "15 days",
    component: "Type-S crucible thermocouple & ceramic sheath (T1)",
    check: "Inspect Pt-Rh thermocouple tip and protection sheath for flux erosion or thermal reading offset.",
    passCriteria: "Sheath intact; T1 tracks reference pyrometer within ±3 °C at 1,020 °C.",
    owner: "Instrumentation",
    defaultBog: true,
  },
  {
    id: "VPC-PM-F03",
    machineId: "VPC-066",
    machineName: "Schultheiss VPC 066",
    interval: "15 days",
    component: "Lower flask chamber blank-off & leak-up test (P2 / P4)",
    check: "Evacuate empty sealed chamber to 280 mbar abs, isolate pump valve and measure 60 s pressure rise.",
    passCriteria: "Chamber leak-up rate < 8 mbar/min with pump isolated.",
    owner: "Mechanical",
    defaultBog: true,
  },
  {
    id: "VPC-PM-F04",
    machineId: "VPC-066",
    machineName: "Schultheiss VPC 066",
    interval: "15 days",
    component: "Direct flask vibration table spring mounts (V2)",
    check: "Inspect vibration actuator mounts, elastomer springs and fastener torque under lower flask base.",
    passCriteria: "Mounts secure; vibration V2 stays within 2.40–4.20 mm/s RMS during hold stage.",
    owner: "Mechanical",
    defaultBog: false,
  },
  // 1 month
  {
    id: "VPC-PM-M01",
    machineId: "VPC-066",
    machineName: "Schultheiss VPC 066",
    interval: "1 month",
    component: "Induction generator cabinet, HF feedthroughs & busbars (E1)",
    check: "Replace cabinet cooling air filters, inspect high-frequency coaxial feedthrough seals and torque busbars.",
    passCriteria: "No discolouration or loose connections; full 12 kW generator output available.",
    owner: "Electrical",
    defaultBog: true,
  },
  {
    id: "VPC-PM-M02",
    machineId: "VPC-066",
    machineName: "Schultheiss VPC 066",
    interval: "1 month",
    component: "Proportional overpressure, gas regulator & vent valves (P1 / P3)",
    check: "Check argon/N₂ regulator droop under step load, clean exhaust mufflers and time solenoid actuation.",
    passCriteria: "P3 steady at 5.00 bar; P1 reaches 1.20 bar casting pressure without overshoot.",
    owner: "Instrumentation",
    defaultBog: true,
  },
  {
    id: "VPC-PM-M03",
    machineId: "VPC-066",
    machineName: "Schultheiss VPC 066",
    interval: "1 month",
    component: "Vacuum pump oil change, shaft seal & drive coupling (V1 / E2)",
    check: "Drain and replace vacuum pump oil, inspect elastomer coupling spider and record baseline vibration.",
    passCriteria: "Fresh oil charge; pump vibration V1 ≤ 2.0 mm/s RMS and motor current E2 ≤ 4.5 A.",
    owner: "Mechanical",
    defaultBog: true,
  },
  {
    id: "VPC-PM-M04",
    machineId: "VPC-066",
    machineName: "Schultheiss VPC 066",
    interval: "1 month",
    component: "Pressure & RTD sensor loop verification (P1–P4, T2–T4)",
    check: "Verify 4–20 mA pressure transmitters and Pt100 RTD channels against calibrated master gauge.",
    passCriteria: "All channels within ±0.5% FS accuracy; zero Suspect/Invalid flags in edge gateway.",
    owner: "Instrumentation",
    defaultBog: false,
  },
];

const KILN_PREVENTIVE_TASKS: PreventiveTask[] = [
  // Daily
  {
    id: "KLN-PM-D01",
    machineId: "KLN-01",
    machineName: "Rotary Kiln #1 (KLN-01)",
    interval: "Daily",
    component: "Kiln inlet & outlet pneumatic lamella seals",
    check: "Walk-down visual and IR check of inlet and outlet seal segments for hot gas blow-by or material spill.",
    passCriteria: "No visible blow-by; false air index CAL-KLN-06 within normal band.",
    owner: "Operator",
    defaultBog: true,
  },
  {
    id: "KLN-PM-D02",
    machineId: "KLN-01",
    machineName: "Rotary Kiln #1 (KLN-01)",
    interval: "Daily",
    component: "Support roller bearings & oil rings (Piers 1–3)",
    check: "Check bearing housing oil sight glasses, spoon lubrication delivery and cooling water flow.",
    passCriteria: "Oil clear and at mark; bearing temperatures < 65 °C.",
    owner: "Operator",
    defaultBog: true,
  },
  {
    id: "KLN-PM-D03",
    machineId: "KLN-01",
    machineName: "Rotary Kiln #1 (KLN-01)",
    interval: "Daily",
    component: "Girth gear & pinion spray lubrication panel",
    check: "Verify grease spray cycle completion, nozzle pattern across gear face and drum level.",
    passCriteria: "Uniform film across full tooth width; zero blocked nozzles.",
    owner: "Operator",
    defaultBog: true,
  },
  {
    id: "KLN-PM-D04",
    machineId: "CL-01",
    machineName: "Grate Cooler (CL-01)",
    interval: "Daily",
    component: "Cooler grate hydraulic pack & under-grate air chambers",
    check: "Inspect hydraulic oil level, return filter ΔP indicator and under-grate compartment inspection doors.",
    passCriteria: "Hydraulic pressure steady; no clinker snowmen on grate.",
    owner: "Operator",
    defaultBog: false,
  },
  // Weekly
  {
    id: "KLN-PM-W01",
    machineId: "KLN-01",
    machineName: "Rotary Kiln #1 (KLN-01)",
    interval: "Weekly",
    component: "Inlet seal pneumatic cylinders & LVDT travel sensor (POS-KLN-01)",
    check: "Measure axial seal overlap margin, inspect tensioning wire ropes and verify LVDT rod linkage.",
    passCriteria: "Seal overlap margin ≥ 35 mm; smooth cylinder movement.",
    owner: "Mechanical",
    defaultBog: true,
  },
  {
    id: "KLN-PM-W02",
    machineId: "KLN-01",
    machineName: "Rotary Kiln #1 (KLN-01)",
    interval: "Weekly",
    component: "Kiln inlet O₂ / CO gas analyser probe & condensate trap (GAS-KLN-01)",
    check: "Perform manual probe blow-back check, drain sample chiller condensate trap and replace particulate filter.",
    passCriteria: "Sample flow green; O₂ reading responds cleanly after purge.",
    owner: "Instrumentation",
    defaultBog: true,
  },
  {
    id: "KLN-PM-W03",
    machineId: "KLN-01",
    machineName: "Rotary Kiln #1 (KLN-01)",
    interval: "Weekly",
    component: "Kiln shell IR line-scanner optics & purge blower (STS-KLN-08)",
    check: "Clean scanner sapphire window and replace purge blower air intake filter pad.",
    passCriteria: "Scanner coverage ≥ 98%; clear thermal profile across burning zone.",
    owner: "Instrumentation",
    defaultBog: true,
  },
  {
    id: "KLN-PM-W04",
    machineId: "KLN-02",
    machineName: "Rotary Kiln #2 (KLN-02)",
    interval: "Weekly",
    component: "Outlet seal cooling fan & ductwork damper (STS-KLN-10)",
    check: "Check outlet seal cooling fan belt tension, impeller vibration and damper position lock.",
    passCriteria: "Fan running smoothly; vibration < 2.8 mm/s RMS.",
    owner: "Mechanical",
    defaultBog: false,
  },
  // 15 days
  {
    id: "KLN-PM-F01",
    machineId: "KLN-01",
    machineName: "Rotary Kiln #1 (KLN-01)",
    interval: "15 days",
    component: "Hydraulic thrust device & axial limit switches (POS-KLN-02)",
    check: "Verify kiln uphill/downhill axial float cycle timing, hydraulic pump pressure and travel limit switches.",
    passCriteria: "Smooth axial float within ±25 mm window; limit switches CLEAR.",
    owner: "Mechanical",
    defaultBog: true,
  },
  {
    id: "KLN-PM-F02",
    machineId: "KLN-01",
    machineName: "Rotary Kiln #1 (KLN-01)",
    interval: "15 days",
    component: "Kiln tyre-to-shell migration & stop-block wear pads",
    check: "Measure relative tyre creep per revolution on Piers 1–3 and inspect stop-block shims and welds.",
    passCriteria: "Tyre migration 4–12 mm/rev; no cracked stop blocks.",
    owner: "Mechanical",
    defaultBog: true,
  },
  {
    id: "KLN-PM-F03",
    machineId: "KLN-01",
    machineName: "Rotary Kiln #1 (KLN-01)",
    interval: "15 days",
    component: "Hood draft & inlet draft impulse lines (PRS-KLN-01 / PRS-KLN-03)",
    check: "Rod out and compressed-air purge pressure transmitter impulse taps; verify zero with manometer.",
    passCriteria: "Unplugged impulse taps; hood draft tracks around −0.30 mbar.",
    owner: "Instrumentation",
    defaultBog: true,
  },
  {
    id: "KLN-PM-F04",
    machineId: "CL-01",
    machineName: "Grate Cooler (CL-01)",
    interval: "15 days",
    component: "Clinker hammer crusher rotor & breaker plate clearance",
    check: "Inspect hammer wear profile, rotor bearing housing seals and drive V-belt tension.",
    passCriteria: "No cracked hammers; bearing vibration within baseline.",
    owner: "Mechanical",
    defaultBog: false,
  },
  // 1 month
  {
    id: "KLN-PM-M01",
    machineId: "KLN-01",
    machineName: "Rotary Kiln #1 (KLN-01)",
    interval: "1 month",
    component: "Circumferential kiln seal gap survey & graphite block tensioning",
    check: "Measure radial gap around 12 clock positions on inlet and outlet seals; re-tension counterweight cables.",
    passCriteria: "Uniform seal contact around shell; radial gap ≤ 4 mm.",
    owner: "Mechanical",
    defaultBog: true,
  },
  {
    id: "KLN-PM-M02",
    machineId: "KLN-01",
    machineName: "Rotary Kiln #1 (KLN-01)",
    interval: "1 month",
    component: "Main kiln drive gearbox oil lab sampling & coupling alignment",
    check: "Draw gearbox oil sample for ISO 4406 cleanliness/wear metals and check main motor coupling alignment.",
    passCriteria: "Oil viscosity and iron ppm within OEM limits; coupling misalignment < 0.05 mm.",
    owner: "Mechanical",
    defaultBog: true,
  },
  {
    id: "KLN-PM-M03",
    machineId: "KLN-02",
    machineName: "Rotary Kiln #2 (KLN-02)",
    interval: "1 month",
    component: "Main burner lance tip refractory & swirl air nozzle audit",
    check: "Inspect burner refractory nose castable for spalling, coking or radial crack propagation.",
    passCriteria: "Refractory nose intact; concentric primary air annular gap.",
    owner: "Mechanical",
    defaultBog: true,
  },
  {
    id: "KLN-PM-M04",
    machineId: "CL-01",
    machineName: "Grate Cooler (CL-01)",
    interval: "1 month",
    component: "Cooler hot-zone grate plates & under-grate seal strips",
    check: "Inspect Rows 1–6 cast grate plates for thermal cracking or blow-through and tighten T-bolts.",
    passCriteria: "All grate plates secure; no fine clinker fall-through spike.",
    owner: "Mechanical",
    defaultBog: true,
  },
];

/* --------------------------------------------------------------------------
   Proactive Maintenance — Component Lifespan & Cautious Replacement
   -------------------------------------------------------------------------- */

const VPC_PROACTIVE_PARTS: ProactivePart[] = [
  {
    id: "VPC-PRO-01",
    machineId: "VPC-066",
    machineName: "Schultheiss VPC 066",
    component: "Graphite Crucible & Bottom Pouring Nozzle",
    used: 186,
    rated: 200,
    unit: "casts",
    remainingText: "14 casts left (~2 shifts)",
    reason: "Approaching 200-cast service life; cautious replacement before wall thinning or nozzle erosion causes melt dribble during vacuum pump-down.",
  },
  {
    id: "VPC-PRO-02",
    machineId: "VPC-066",
    machineName: "Schultheiss VPC 066",
    component: "In-Line Investment Dust & Zinc Filter Cartridge (P4)",
    used: 138,
    rated: 150,
    unit: "hrs",
    remainingText: "12 hrs left (~2 days)",
    reason: "Filter cartridge at 92% capacity; replacing cautiously before pressure drop slows flask evacuation (P2) or passes dust to the vacuum pump.",
  },
  {
    id: "VPC-PRO-03",
    machineId: "VPC-066",
    machineName: "Schultheiss VPC 066",
    component: "Stopper / Sealing Rod Graphite Tip (S1)",
    used: 178,
    rated: 200,
    unit: "casts",
    remainingText: "22 casts left (~3 shifts)",
    reason: "Spherical stopper tip mates with the crucible nozzle; replacing cautiously alongside the crucible prevents pour lag and seat leakage.",
  },
  {
    id: "VPC-PRO-04",
    machineId: "VPC-066",
    machineName: "Schultheiss VPC 066",
    component: "Lower Flask Silicone / Graphite Adapter Gasket (P2)",
    used: 268,
    rated: 300,
    unit: "casts",
    remainingText: "32 casts left (~4 shifts)",
    reason: "Repeated high-temperature flask loading compresses the collar gasket; cautious replacement prevents vacuum leak-up above 390 mbar.",
  },
  {
    id: "VPC-PRO-05",
    machineId: "VPC-066",
    machineName: "Schultheiss VPC 066",
    component: "Type-S Crucible Thermocouple & Ceramic Sheath (T1)",
    used: 430,
    rated: 500,
    unit: "casts",
    remainingText: "70 casts left (~9 shifts)",
    reason: "Continuous 1,020 °C gold melt cycling causes gradual Pt-Rh drift; proactive replacement avoids ±15 °C casting temperature error.",
  },
  {
    id: "VPC-PRO-06",
    machineId: "VPC-066",
    machineName: "Schultheiss VPC 066",
    component: "Rotary-Vane Vacuum Pump Oil & Vane Kit (V1 / T4)",
    used: 820,
    rated: 1000,
    unit: "hrs",
    remainingText: "180 hrs left (~3 weeks)",
    reason: "Scheduled cautious vane and oil service before 1,000 hrs keeps pump vibration V1 ≤ 2.5 mm/s and housing temperature T4 ≤ 67 °C.",
  },
];

const KILN_PROACTIVE_PARTS: ProactivePart[] = [
  {
    id: "KLN-PRO-01",
    machineId: "KLN-01",
    machineName: "Rotary Kiln #1 (KLN-01)",
    component: "Inlet Pneumatic Lamella Seal Leaf Set",
    used: 8120,
    rated: 8760,
    unit: "hrs",
    remainingText: "640 hrs left (~26 days)",
    reason: "At 93% of rated 12-month wear life; cautious replacement prevents false-air ingress spike (GAS-KLN-01) and ID fan overload.",
  },
  {
    id: "KLN-PRO-02",
    machineId: "KLN-01",
    machineName: "Rotary Kiln #1 (KLN-01)",
    component: "Main Burner Lance Refractory Nose Castable",
    used: 3950,
    rated: 4380,
    unit: "hrs",
    remainingText: "430 hrs left (~18 days)",
    reason: "At 90% of thermal service life in burning zone; proactive replacement prevents lance tip warping and flame impingement on kiln shell.",
  },
  {
    id: "KLN-PRO-03",
    machineId: "KLN-01",
    machineName: "Rotary Kiln #1 (KLN-01)",
    component: "Inlet Gas Analyser Heated Sample Filter & Tube (STS-KLN-06)",
    used: 1940,
    rated: 2160,
    unit: "hrs",
    remainingText: "220 hrs left (~9 days)",
    reason: "Alkali and raw-meal dust gradually sinter the ceramic filter; cautious replacement avoids analyser sample blockage during operation.",
  },
  {
    id: "KLN-PRO-04",
    machineId: "KLN-02",
    machineName: "Rotary Kiln #2 (KLN-02)",
    component: "Outlet Hood Seal Graphite Contact Segments",
    used: 7120,
    rated: 8000,
    unit: "hrs",
    remainingText: "880 hrs left (~5 weeks)",
    reason: "Hot clinker dust abrades the lower graphite blocks; replacing cautiously at 89% life preserves hood draft stability (PRS-KLN-03).",
  },
  {
    id: "KLN-PRO-05",
    machineId: "CL-01",
    machineName: "Grate Cooler (CL-01)",
    component: "Hot-Zone Cast Grate Plates (Rows 1–4)",
    used: 7400,
    rated: 8500,
    unit: "hrs",
    remainingText: "1,100 hrs left (~6 weeks)",
    reason: "Approaching 87% wear life under hot clinker bed; cautious replacement prevents grate plate blow-through and under-grate chamber damage.",
  },
];

/* --------------------------------------------------------------------------
   Storage helpers for BOG toggle, task completion & replacement scheduling
   -------------------------------------------------------------------------- */

const BOG_STORAGE_KEY = "ultron.maint.bog.v1";
const DONE_STORAGE_KEY = "ultron.maint.done.v1";
const REPLACED_STORAGE_KEY = "ultron.maint.proactive.v1";

function loadMap(key: string): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function saveMap(key: string, val: Record<string, boolean>) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* ignore */
  }
}

function BogSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`Boots on Ground (RFID + Photo) for ${label}`}
      className="pm-bog-toggle"
      onClick={onChange}
      title="Boots on Ground (BOG): Engineer must scan RFID tag + take photos on site to prove task completion"
    >
      <span className="pm-bog-track" aria-hidden="true">
        <span className="pm-bog-thumb" />
      </span>
      <span>{checked ? "BOG: RFID + Photo" : "BOG: Off"}</span>
    </button>
  );
}

export function MaintenanceWorkspace() {
  const primaryId = usePrimaryMachineId();
  const isVpc = primaryId === PRIMARY_VPC_ID;
  const isPyro = primaryId === PRIMARY_PYRO_ID;
  const fleet = useKilnFleet();
  const { machines, diagnosisRecords, navigateToMachine } = useIndustrialData();

  const [tab, setTab] = useState<MaintTab>("all");
  const [interval, setIntervalFilter] = useState<PreventiveInterval>("all");
  const [bogMap, setBogMap] = useState<Record<string, boolean>>({});
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>({});
  const [scheduledMap, setScheduledMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setBogMap(loadMap(BOG_STORAGE_KEY));
    setDoneMap(loadMap(DONE_STORAGE_KEY));
    setScheduledMap(loadMap(REPLACED_STORAGE_KEY));
  }, []);

  // 1. Preventive Maintenance tasks for active plant
  const preventiveTasks = useMemo<PreventiveTask[]>(() => {
    if (isVpc) return VPC_PREVENTIVE_TASKS;
    if (isPyro) {
      return KILN_PREVENTIVE_TASKS.map((t) => ({
        ...t,
        machineId: t.machineId === "CL-01" ? "PYR-CLR-01" : "PYR-KLN-01",
        machineName: t.machineId === "CL-01" ? "Reciprocating Grate Cooler (PYR-CLR-01)" : "Rotary Kiln (PYR-KLN-01)",
      }));
    }
    return KILN_PREVENTIVE_TASKS;
  }, [isVpc, isPyro]);

  const filteredPreventive = useMemo(
    () => (interval === "all" ? preventiveTasks : preventiveTasks.filter((t) => t.interval === interval)),
    [preventiveTasks, interval],
  );

  // 2. Predictive Maintenance tasks (from live system alerts + sensor breaches + diagnosis records)
  const predictiveTasks = useMemo<PredictiveTask[]>(() => {
    const out: PredictiveTask[] = [];
    const seen = new Set<string>();

    for (const [mId, sim] of Object.entries(fleet)) {
      const f = sim.frame;
      const mName =
        mId === "VPC-066"
          ? "Schultheiss VPC 066"
          : mId === "KLN-01"
            ? "Rotary Kiln #1 (KLN-01)"
            : mId === "KLN-02"
              ? "Rotary Kiln #2 (KLN-02)"
              : mId === "CL-01"
                ? "Grate Cooler (CL-01)"
                : mId;

      for (const r of f.rules) {
        if ((r.status !== "ACTIVE" && r.status !== "PENDING") || r.severity === "Normal") continue;
        const id = `pred:${mId}:${r.id}`;
        seen.add(id);
        out.push({
          id,
          machineId: mId,
          machineName: mName,
          ruleId: r.id,
          severity: r.severity === "Critical" ? "Critical" : "Advisory",
          alertTitle: `${r.name} (${r.id})`,
          evidence: r.evidence,
          recommendedCheck: r.action,
          source: r.status === "ACTIVE" ? "Live rule alert" : "Developing rule watch",
          defaultBog: true,
        });
      }

      for (const sig of Object.values(f.signals)) {
        if (sig.limitSeverity !== "Critical" && sig.limitSeverity !== "Advisory") continue;
        const def = f.defs.signalByTag[sig.tag];
        if (!def) continue;
        const id = `pred:${mId}:sig:${sig.tag}`;
        if (seen.has(id)) continue;
        seen.add(id);
        out.push({
          id,
          machineId: mId,
          machineName: mName,
          severity: sig.limitSeverity === "Critical" ? "Critical" : "Advisory",
          alertTitle: `${def.name} (${sig.tag}) off-normal`,
          evidence: `${sig.display}${def.unit ? ` ${def.unit}` : ""}${sig.limitNote ? ` · ${sig.limitNote}` : ` (normal ${def.normalBand})`}`,
          recommendedCheck: `Inspect ${def.sub} and verify ${def.name} (${sig.tag}) returns within ${def.normalBand}.`,
          source: "Live sensor threshold",
          defaultBog: sig.limitSeverity === "Critical",
        });
      }
    }

    // Also include stored diagnosis findings for machines in the active plant
    if (!isVpc) {
      for (const rec of diagnosisRecords) {
        const mName = machines.find((m) => m.id === rec.machineId)?.name ?? rec.machineId;
        for (const f of rec.findings) {
          if (f.severity !== "Critical" && f.severity !== "Advisory") continue;
          const id = `pred:${rec.machineId}:dx:${f.id}`;
          if (seen.has(id)) continue;
          seen.add(id);
          out.push({
            id,
            machineId: rec.machineId,
            machineName: mName,
            severity: f.severity,
            alertTitle: f.fault,
            evidence: `${f.location} · ${f.frequency} · ${f.probability}% confidence`,
            recommendedCheck: f.recommendation,
            source: "Diagnostic engine finding",
            defaultBog: true,
          });
        }
      }
    }

    // Fallback system-recommended checks if a single-machine plant is momentarily between fault scenarios
    if (out.length === 0 && isVpc) {
      out.push(
        {
          id: "pred:VPC-066:R-VPC-07",
          machineId: "VPC-066",
          machineName: "Schultheiss VPC 066",
          ruleId: "R-VPC-07",
          severity: "Advisory",
          alertTitle: "Cooling-water flow & coil ΔT check (R-VPC-07)",
          evidence: "F1 baseline 14.0 L/min (warn ≤ 11.9 L/min) · DT1 = T3 − T2 (warn ≥ 8.0 °C)",
          recommendedCheck: "Inspect coolant supply pump, inline strainer, hoses and manifold valves.",
          source: "System rule watch",
          defaultBog: true,
        },
        {
          id: "pred:VPC-066:R-VPC-01",
          machineId: "VPC-066",
          machineName: "Schultheiss VPC 066",
          ruleId: "R-VPC-01",
          severity: "Advisory",
          alertTitle: "Vacuum pump-down & pump housing check (R-VPC-01)",
          evidence: "P2 flask vacuum target 300 mbar abs · V1 pump vibration ≤ 2.70 mm/s · T4 ≤ 67 °C",
          recommendedCheck: "Check vacuum pump oil level/condition, suction filter P4 and shaft seal.",
          source: "System rule watch",
          defaultBog: true,
        },
      );
    }

    return out;
  }, [fleet, machines, diagnosisRecords, isVpc]);

  // 3. Proactive Maintenance parts for active plant
  const proactiveParts = useMemo<ProactivePart[]>(() => {
    if (isVpc) return VPC_PROACTIVE_PARTS;
    if (isPyro) {
      return KILN_PROACTIVE_PARTS.map((p) => ({
        ...p,
        machineId: p.machineId === "CL-01" ? "PYR-CLR-01" : "PYR-KLN-01",
        machineName: p.machineId === "CL-01" ? "Reciprocating Grate Cooler (PYR-CLR-01)" : "Rotary Kiln (PYR-KLN-01)",
      }));
    }
    return KILN_PROACTIVE_PARTS;
  }, [isVpc, isPyro]);

  const isBogOn = useCallback(
    (id: string, defaultBog: boolean) => (id in bogMap ? bogMap[id] : defaultBog),
    [bogMap],
  );

  const toggleBog = useCallback((id: string, defaultBog: boolean) => {
    setBogMap((prev) => {
      const next = { ...prev, [id]: !(id in prev ? prev[id] : defaultBog) };
      saveMap(BOG_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const setAllBog = useCallback(
    (tasks: Array<{ id: string; defaultBog: boolean }>, enable: boolean) => {
      setBogMap((prev) => {
        const next = { ...prev };
        for (const t of tasks) next[t.id] = enable;
        saveMap(BOG_STORAGE_KEY, next);
        return next;
      });
    },
    [],
  );

  const toggleDone = useCallback((id: string) => {
    setDoneMap((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveMap(DONE_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const toggleScheduled = useCallback((id: string) => {
    setScheduledMap((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveMap(REPLACED_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const bogCount = useMemo(() => {
    const prevBog = preventiveTasks.filter((t) => isBogOn(t.id, t.defaultBog)).length;
    const predBog = predictiveTasks.filter((t) => isBogOn(t.id, t.defaultBog)).length;
    return prevBog + predBog;
  }, [preventiveTasks, predictiveTasks, isBogOn]);

  const critPredCount = predictiveTasks.filter((t) => t.severity === "Critical").length;
  const urgentProactiveCount = proactiveParts.filter((p) => p.used / p.rated >= 0.85).length;

  const plantTitle = isVpc
    ? "Jewellery Casting Plant — Schultheiss VPC 066"
    : isPyro
      ? "Pyroprocessing Line"
      : "Cement Kiln & Cooler Line";

  return (
    <div className="pg-root ast-root pm-workspace" aria-label="Maintenance">
      <header className="ast-head pg-head">
        <div className="ast-head-main">
          <ol className="ast-crumbs" aria-label="Location">
            <li>Maintenance</li>
            <li>{plantTitle}</li>
          </ol>
          <div className="ast-title-row">
            <h1 className="ast-title">Maintenance</h1>
            <StatusTag
              tone={critPredCount > 0 ? "bad" : urgentProactiveCount > 0 ? "warn" : "good"}
              label={`${preventiveTasks.length} preventive · ${predictiveTasks.length} predictive · ${proactiveParts.length} proactive`}
            />
          </div>
        </div>
      </header>

      <KpiStrip
        page
        label="Maintenance overview"
        items={[
          {
            label: "Preventive checklists",
            value: `${preventiveTasks.length}`,
            foot: "Daily · Weekly · 15 days · 1 month",
          },
          {
            label: "Predictive (System alerts)",
            value: `${predictiveTasks.length}`,
            tone: critPredCount > 0 ? "bad" : predictiveTasks.length > 0 ? "warn" : undefined,
            foot: critPredCount > 0 ? `${critPredCount} critical system alerts to check` : "Recommended checks from live alerts",
          },
          {
            label: "Proactive (Lifespan)",
            value: `${urgentProactiveCount}`,
            tone: urgentProactiveCount > 0 ? "warn" : undefined,
            foot: `${proactiveParts.length} tracked wear parts approaching lifespan`,
          },
          {
            label: "Boots on Ground (BOG)",
            value: `${bogCount} active`,
            foot: "Requires field RFID scan + photo proof",
          },
        ]}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <PillNav
          items={MAINT_TABS}
          activeId={tab}
          onChange={(id) => setTab(id as MaintTab)}
          ariaLabel="Maintenance categories"
        />
      </div>

      <div className="pm-workspace-body" style={{ display: "grid", gap: 20 }}>
        {/* ================================================================
            1. PREVENTIVE MAINTENANCE (Daily, Weekly, 15 days, 1 month + BOG)
            ================================================================ */}
        {(tab === "all" || tab === "preventive") && (
          <Section
            id="pm-preventive"
            title="Preventive maintenance checklists"
            right={
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <PillNav
                  items={INTERVAL_ITEMS}
                  activeId={interval}
                  onChange={(id) => setIntervalFilter(id as PreventiveInterval)}
                  ariaLabel="Checklist interval"
                />
                <PillButton
                  variant="secondary"
                  onClick={() => {
                    const allOn = filteredPreventive.every((t) => isBogOn(t.id, t.defaultBog));
                    setAllBog(filteredPreventive, !allOn);
                  }}
                >
                  {filteredPreventive.every((t) => isBogOn(t.id, t.defaultBog)) ? "Disable BOG on all" : "Enable BOG on all"}
                </PillButton>
              </div>
            }
          >
            <div className="ui-table-container ast-table pm-table pm-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th style={{ width: 96 }}>Interval</th>
                    <th style={{ width: 220 }}>Machine &amp; component</th>
                    <th>Checklist task &amp; pass criteria</th>
                    <th style={{ width: 110 }}>Owner</th>
                    <th style={{ width: 190 }}>Boots on Ground (BOG)</th>
                    <th style={{ width: 130 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPreventive.map((t) => {
                    const bog = isBogOn(t.id, t.defaultBog);
                    const done = Boolean(doneMap[t.id]);
                    return (
                      <tr key={t.id}>
                        <td>
                          <StatusTag
                            tone={t.interval === "Daily" ? "info" : "idle"}
                            label={t.interval}
                          />
                        </td>
                        <td>
                          <strong style={{ display: "block", color: "var(--dx-ink)" }}>{t.component}</strong>
                          <span className="ast-caption ast-num">
                            {t.machineId} · {t.id}
                          </span>
                        </td>
                        <td>
                          <div style={{ color: "var(--dx-ink)", fontWeight: 500, marginBottom: 4 }}>{t.check}</div>
                          <div className="ast-caption">Pass: {t.passCriteria}</div>
                        </td>
                        <td className="pm-muted">{t.owner}</td>
                        <td>
                          <BogSwitch
                            checked={bog}
                            onChange={() => toggleBog(t.id, t.defaultBog)}
                            label={`${t.id} ${t.component}`}
                          />
                        </td>
                        <td>
                          <PillButton
                            variant={done ? "secondary" : "primary"}
                            onClick={() => toggleDone(t.id)}
                          >
                            {done ? "Completed" : "Mark done"}
                          </PillButton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* ================================================================
            2. PREDICTIVE MAINTENANCE (System Alerts & Recommended Checks + BOG)
            ================================================================ */}
        {(tab === "all" || tab === "predictive") && (
          <Section
            id="pm-predictive"
            title="Predictive maintenance — system alerts &amp; recommended checks"
            right={
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span className="ast-caption">Triggered by live system alerts &amp; sensor thresholds</span>
                <PillButton
                  variant="secondary"
                  onClick={() => {
                    const allOn = predictiveTasks.every((t) => isBogOn(t.id, t.defaultBog));
                    setAllBog(predictiveTasks, !allOn);
                  }}
                >
                  {predictiveTasks.every((t) => isBogOn(t.id, t.defaultBog)) ? "Disable BOG on all" : "Enable BOG on all"}
                </PillButton>
              </div>
            }
          >
            <div className="ui-table-container ast-table pm-table pm-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th style={{ width: 100 }}>Severity</th>
                    <th style={{ width: 230 }}>System alert</th>
                    <th style={{ width: 250 }}>Evidence from sensors</th>
                    <th>What our system recommends to check</th>
                    <th style={{ width: 190 }}>Boots on Ground (BOG)</th>
                    <th style={{ width: 200 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {predictiveTasks.map((t) => {
                    const bog = isBogOn(t.id, t.defaultBog);
                    const done = Boolean(doneMap[t.id]);
                    const tone: Tone = t.severity === "Critical" ? "bad" : "warn";
                    return (
                      <tr key={t.id}>
                        <td>
                          <StatusTag tone={tone} label={t.severity} />
                        </td>
                        <td>
                          <strong style={{ display: "block", color: "var(--dx-ink)" }}>{t.alertTitle}</strong>
                          <span className="ast-caption ast-num">
                            {t.machineName} · {t.source}
                          </span>
                        </td>
                        <td>
                          <span className="ast-num" style={{ fontSize: "var(--fs-xs, 12px)" }}>
                            {t.evidence}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: "var(--dx-ink)", fontWeight: 500 }}>{t.recommendedCheck}</strong>
                        </td>
                        <td>
                          <BogSwitch
                            checked={bog}
                            onChange={() => toggleBog(t.id, t.defaultBog)}
                            label={t.alertTitle}
                          />
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <PillButton
                              variant={done ? "secondary" : "primary"}
                              onClick={() => toggleDone(t.id)}
                            >
                              {done ? "Checked" : "Mark checked"}
                            </PillButton>
                            <PillButton
                              variant="secondary"
                              onClick={() => {
                                if (t.ruleId) {
                                  try {
                                    sessionStorage.setItem(DIAGNOSIS_RULE_KEY, t.ruleId);
                                  } catch {
                                    /* ignore */
                                  }
                                }
                                navigateToMachine(t.machineId, "diagnosis");
                              }}
                            >
                              Diagnosis
                            </PillButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* ================================================================
            3. PROACTIVE MAINTENANCE (Lifespan Approaching → Cautious Replacement)
            ================================================================ */}
        {(tab === "all" || tab === "proactive") && (
          <Section
            id="pm-proactive"
            title="Proactive maintenance — component lifespan &amp; cautious replacement"
            right={<span className="ast-caption">Replacing components cautiously as they approach rated service life</span>}
          >
            <div className="ui-table-container ast-table pm-table pm-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th style={{ width: 150 }}>Lifespan status</th>
                    <th style={{ width: 230 }}>Component / part</th>
                    <th style={{ width: 210 }}>Lifespan consumed</th>
                    <th style={{ width: 160 }}>Remaining life</th>
                    <th>Why replace cautiously now</th>
                    <th style={{ width: 170 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {proactiveParts.map((p) => {
                    const pct = Math.min(100, Math.round((p.used / p.rated) * 100));
                    const tone: Tone = pct >= 90 ? "bad" : pct >= 80 ? "warn" : "good";
                    const scheduled = Boolean(scheduledMap[p.id]);
                    const statusLabel = scheduled
                      ? "Replacement scheduled"
                      : pct >= 90
                        ? "Replace cautiously"
                        : pct >= 80
                          ? "Approaching limit"
                          : "Within lifespan";
                    return (
                      <tr key={p.id}>
                        <td>
                          <StatusTag tone={scheduled ? "info" : tone} label={statusLabel} />
                        </td>
                        <td>
                          <strong style={{ display: "block", color: "var(--dx-ink)" }}>{p.component}</strong>
                          <span className="ast-caption ast-num">{p.machineName}</span>
                        </td>
                        <td>
                          <div className="pm-lifespan-cell" style={{ "--tone": `var(--status-${tone === "bad" ? "danger" : tone === "warn" ? "warning" : "success"})` } as React.CSSProperties}>
                            <div className="pm-lifespan-top ast-num">
                              <strong>{pct}% used</strong>
                              <span className="pm-muted">
                                {p.used.toLocaleString()} / {p.rated.toLocaleString()} {p.unit}
                              </span>
                            </div>
                            <div className="pm-lifespan-bar" aria-hidden="true">
                              <div className="pm-lifespan-fill" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="ast-num" style={{ fontWeight: 500 }}>
                          {p.remainingText}
                        </td>
                        <td>{p.reason}</td>
                        <td>
                          <PillButton
                            variant={scheduled ? "secondary" : "primary"}
                            onClick={() => toggleScheduled(p.id)}
                          >
                            {scheduled ? "Scheduled" : "Replace cautiously"}
                          </PillButton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}
