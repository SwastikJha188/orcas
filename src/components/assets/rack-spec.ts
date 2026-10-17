/* ==========================================================================
   Machine › Rack — what the design documents specify for the acquisition
   hardware, so the page can compare the recorded cabinet against it.

   Source: D5-OSW-PE-KLN Internal System Specification – Rotary Kiln, Rev. 01
     §7 Table 7.1  ULTRON edge hardware
     §7.2          Network overview
     §8 Table 8.2  Data, sampling and transmission
     §9 Table 9.2  Calculated values (software)
     §10 Table 10.1 Area classification
   D4-OSW-PE-KLN Technical Specification Report Rev. 02 (purchase list,
   data-quality checks) agrees with these figures.

   The kiln documents cover the rotary kiln (KLN-* machines); the pyro line
   has its own D5-OSW-PE-PYR Rev. 00 rows below (`rackSpecFor`). Other
   machines get `null` and the page says no specification is on file.
   ========================================================================== */

import { isPyroMachineId, isVpcMachineId } from "@/lib/live-defs";
import { DAQ_NODES as PYRO_DAQ_NODES, type DaqNode } from "@/lib/pyro-sim/sensor-meta";
import { PYRO_SIGNAL_BY_TAG } from "@/lib/pyro-sim/signals";

export const RACK_SPEC_REF = "D5-OSW-PE-KLN Rev. 01";

export function hasKilnSpec(machineId: string): boolean {
  return /^KLN-/i.test(machineId);
}

export interface SpecRow {
  label: string;
  value: string;
  ref: string;
}

/** D5 Table 7.1 — ULTRON edge hardware (demo). */
export const EDGE_HARDWARE_SPEC: SpecRow[] = [
  { label: "Devices", value: "1 × ULTRON edge gateway (industrial PC); 1 × IEPE vibration DAQ module", ref: "D5 Table 7.1" },
  { label: "Dynamic channels", value: "8 IEPE inputs (4 used: VIB-KLN-01 to 04; 4 spare); 24-bit; up to 51.2 kS/s; synchronous", ref: "D5 Table 7.1" },
  { label: "Process data", value: "Read-only client for 39 existing signals; capacity ≥ 500 tags", ref: "D5 Table 7.1" },
  { label: "Edge processing", value: "RMS, peak, crest factor, FFT, envelope; time stamps; data-quality flags", ref: "D5 Table 7.1" },
  { label: "Location / Ex", value: "Safe area (drive MCC room); no Ex rating required", ref: "D5 Table 7.1 · Table 10.1" },
  { label: "IP rating", value: "IP20 devices in IP54 cabinet; 0 … +55 °C", ref: "D5 Table 7.1 · IEC 60529" },
  { label: "Quantity", value: "1 gateway + 1 DAQ module", ref: "D5 Table 7.1" },
];

/** D5 Table 7.1 / §7.2 — network and uplink. */
export const UPLINK_SPEC: SpecRow[] = [
  { label: "Plant side", value: "OPC UA (preferred), Modbus TCP; read-only — the gateway never writes to plant systems", ref: "D5 Table 7.1 · §7.2" },
  { label: "Server side", value: "MQTT over TLS 1.2+ through the plant DMZ / firewall", ref: "D5 Table 7.1 · §7.2" },
  { label: "Buffering", value: "256 GB SSD; store-and-forward ≥ 7 days scalar, ≥ 48 h waveforms", ref: "D5 Table 7.1" },
  { label: "OT security", value: "Client OT security rules (IEC 62443 approach)", ref: "D5 §7.2 · Table 10.1" },
];

/** Channels the IEPE DAQ module carries per D5 Table 7.1. */
export const IEPE_SPEC_CHANNELS = 8;

/** D5 Table 9.2 + Table 5.3.4 — inputs each calculated value is derived from. */
export const CALCULATED_INPUTS: Record<string, { inputs: string[]; basis: string; ref: string }> = {
  "CAL-KLN-03": { inputs: ["STS-KLN-08"], basis: "Shell maximum from the IR scanner map", ref: "D5 Table 9.2 · Table 5.3.4" },
  "CAL-KLN-06": { inputs: ["GAS-KLN-01"], basis: "Inlet O₂ above the reference model", ref: "D5 Table 9.2 · Table 5.3.4" },
  "CAL-KLN-07": { inputs: ["POS-KLN-01"], basis: "LVDT position against seal travel", ref: "D5 Table 9.2 · Table 5.3.4" },
  DT1: { inputs: ["T2", "T3"], basis: "Cooling-water temperature rise (T3 − T2)", ref: "VPC 066 §7.2" },
};

/* --------------------------------------------------------------------------
   Pyro line — D5-OSW-PE-PYR Rev. 00 §7 (Tables 7.1, 7.2), §8 Table 8.2,
   Table 10.1. One edge gateway for the line, four vibration DAQ nodes.
   -------------------------------------------------------------------------- */

export const PYRO_RACK_SPEC_REF = "D5-OSW-PE-PYR Rev. 00";

/** D5 Table 7.1 — ULTRON edge hardware (demo), pyro line. Labels match the kiln rows the cabinet table looks up. */
export const PYRO_EDGE_HARDWARE_SPEC: SpecRow[] = [
  { label: "Devices", value: "1 × ULTRON edge gateway (industrial PC, ≥ 500 tags, 256 GB SSD); 4 × 8-channel IEPE vibration DAQ nodes", ref: "D5 Table 7.1" },
  { label: "Dynamic channels", value: "32 IEPE inputs (16 used, 16 spare); 24-bit; up to 51.2 kS/s", ref: "D5 Tables 7.1 / 7.2" },
  { label: "Process data", value: "Read-only OPC UA (preferred) / Modbus TCP client to PLC / DCS, scanner, analyser and camera servers", ref: "D5 Table 7.1" },
  { label: "Edge processing", value: "RMS, peak, crest factor, FFT, envelope; time stamps; data-quality flags; variability bands", ref: "D5 Table 7.1" },
  { label: "Location / Ex", value: "Gateway in a safe area (MCC / electrical room); DAQ-3 Ex-certified for the coal area", ref: "D5 Tables 7.1 / 10.1" },
  { label: "IP rating", value: "Gateway IP54; DAQ nodes in local IP54 panels", ref: "D5 Tables 7.1 / 10.1" },
  { label: "Spares", value: "2 accelerometers, 1 DAQ module", ref: "D5 Table 7.1" },
];

/** D5 Table 7.1 / §7.3 — network and uplink, pyro line. */
export const PYRO_UPLINK_SPEC: SpecRow[] = [
  { label: "Plant side", value: "Read-only OPC UA (preferred) / Modbus TCP; ULTRON never writes to plant systems", ref: "D5 Table 7.1 · §7.3" },
  { label: "Server side", value: "MQTT over TLS 1.2+ through the plant DMZ / firewall", ref: "D5 Table 7.1 · §7.3" },
  { label: "Buffering", value: "Store-and-forward ≥ 7 days scalar, ≥ 48 h waveforms", ref: "D5 Table 7.1" },
  { label: "OT security", value: "Client OT security rules (IEC 62443 approach)", ref: "D5 §7.3 · Table 10.1" },
];

export const VPC_EDGE_HARDWARE_SPEC: SpecRow[] = [
  { label: "Devices", value: "1 × ULTRON edge gateway (industrial PC); 1 × 4-channel IEPE vibration DAQ card; 1 × analog/RTD acquisition module", ref: "VPC 066 §7" },
  { label: "Dynamic channels", value: "4 IEPE inputs (2 used: V1 vacuum pump, V2 optional flask vibration base; 2 spare); 24-bit; up to 25.6 kS/s", ref: "VPC 066 §7.1 / §7.2" },
  { label: "Process data", value: "Read-only Modbus TCP / OPC UA client to VPC 066 control cabinet (T1, P1, P2, F1, E1, S1, S2) + external transmitters (P3, T2, T3, T4, P4, E2)", ref: "VPC 066 §7.1" },
  { label: "Edge processing", value: "Cooling ΔT calculation (DT1 = T3 − T2), RMS vibration, rule evaluation (R-VPC-01 … R-VPC-11), data-quality checks", ref: "VPC 066 §7.2 / §7.4" },
  { label: "Location / Ex", value: "Jewellery casting cell control cabinet (safe area, 400 V / 3-phase / 16 A)", ref: "VPC 066 §3" },
  { label: "IP rating", value: "IP54 enclosure adjacent to VPC 066 control cabinet", ref: "VPC 066 §3" },
];

export const VPC_UPLINK_SPEC: SpecRow[] = [
  { label: "Plant side", value: "Read-only interface to Schultheiss VPC 066 PLC + external monitoring module; never overrides safety interlocks", ref: "VPC 066 §6 / §7" },
  { label: "Server side", value: "MQTT over TLS 1.2+ to ULTRON cloud / plant server", ref: "VPC 066 §7" },
  { label: "Buffering", value: "Local SSD store-and-forward ≥ 7 days cycle & scalar history", ref: "VPC 066 §7" },
];

/** Hardware specification a machine's Rack page compares against, or null when none is on file. */
export interface RackSpecSet {
  ref: string;
  hardware: SpecRow[];
  uplink: SpecRow[];
  /** IEPE inputs per DAQ module. */
  iepeChannels: number;
  iepe: string;
  clock: string;
  gateway: string;
  /** D5 Table 7.2 vibration DAQ nodes (pyro line). */
  daqNodes: DaqNode[];
}

export function rackSpecFor(machineId: string): RackSpecSet | null {
  if (hasKilnSpec(machineId))
    return { ref: RACK_SPEC_REF, hardware: EDGE_HARDWARE_SPEC, uplink: UPLINK_SPEC, iepeChannels: IEPE_SPEC_CHANNELS, iepe: `${IEPE_SPEC_CHANNELS} inputs, 24-bit, ≤ 51.2 kS/s, synchronous`, clock: "Time stamps at the gateway", gateway: "1 × ULTRON edge gateway (industrial PC)", daqNodes: [] };
  if (isVpcMachineId(machineId))
    return {
      ref: "Schultheiss VPC 066 §7",
      hardware: VPC_EDGE_HARDWARE_SPEC,
      uplink: VPC_UPLINK_SPEC,
      iepeChannels: 4,
      iepe: "4 IEPE inputs (V1 required, V2 optional), 24-bit, 25.6 kS/s",
      clock: "NTP / PTP synchronised at edge gateway",
      gateway: "1 × ULTRON edge gateway (VPC-GW-01)",
      daqNodes: [],
    };
  if (isPyroMachineId(machineId))
    return {
      ref: PYRO_RACK_SPEC_REF,
      hardware: PYRO_EDGE_HARDWARE_SPEC,
      uplink: PYRO_UPLINK_SPEC,
      iepeChannels: 8,
      iepe: "8 IEPE inputs per DAQ node, 24-bit, ≤ 51.2 kS/s; 4 nodes",
      clock: "Time stamps at the gateway (D5 Table 7.1)",
      gateway: "1 × ULTRON edge gateway (industrial PC), safe area",
      daqNodes: PYRO_DAQ_NODES.filter((n) => n.tags.some((t) => PYRO_SIGNAL_BY_TAG[t]?.machine === machineId)),
    };
  return null;
}

/** Field signal a card type carries (generic; D5 Table 11.1 names the kiln instruments). */
export function signalTypeOf(cardType: string | null, protocol: string): string {
  const t = (cardType ?? "").toLowerCase();
  const via = protocol ? ` · ${protocol}` : "";
  if (/iepe|vib/.test(t)) return "IEPE accelerometer, 24-bit";
  if (/rtd/.test(t)) return `Pt100 RTD, 3/4-wire${via}`;
  if (/thermocouple/.test(t)) return `Thermocouple${via}`;
  if (/hart|4–20|4-20/.test(t)) return `4–20 mA / HART${via}`;
  if (/lvdt/.test(t)) return `4–20 mA LVDT${via}`;
  if (/pyro/.test(t)) return `4–20 mA pyrometer${via}`;
  if (/digital/.test(t)) return `Discrete status, on change${via}`;
  if (/vfd/.test(t)) return `VFD data point${via}`;
  if (/pulse|speed input/.test(t)) return `Pulse / speed pickup${via}`;
  if (/video/.test(t)) return `Video stream, no register${via}`;
  if (/flow/.test(t)) return `Flow meter value${via}`;
  if (/gas/.test(t)) return `Analyser channel${via}`;
  if (/scanner/.test(t)) return `Scanner server value${via}`;
  return protocol || "Not recorded";
}
