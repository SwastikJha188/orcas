/**
 * Component service records for SW-ALL-01 (D4 Table 8.3, asset-lifetime
 * yellow advisory; Table B.1 item 2.4).
 *
 * D4 asks for per-component installation / rebuild date, duty and OEM life
 * criteria. The plant has not supplied these records (Table 9.1), so the
 * values below are DEMO records for the simulation. A service-due advisory is
 * calendar / hour based: it is NOT observed mechanical deterioration, is shown
 * yellow, and never lowers machine health or condition.
 */

export interface ServiceComponent {
  id: string;
  machine: string;
  sub: string;
  name: string;
  /** Life basis: running hours or calendar days. */
  basis: "h" | "d";
  /** OEM / plant life criterion in `basis` units. */
  life: number;
  /** Units already used when the simulation starts (installation / rebuild until t = 0). */
  usedAtStart: number;
  /** Installation or last rebuild, as recorded. */
  installed: string;
  duty: string;
}

/** Share of life at which the yellow advisory opens. */
export const SERVICE_DUE_SHARE = 0.9;

export const PYRO_SERVICE_COMPONENTS: ServiceComponent[] = [
  { id: "FSL-C1", machine: "PYR-FED-01", sub: "fsl-aeration", name: "Aeration blower filter / belts", basis: "h", life: 8000, usedAtStart: 6100, installed: "2026-01-24 (belt set)", duty: "Duty blower, continuous" },
  { id: "KFS-C1", machine: "PYR-FED-01", sub: "kfs-dosing", name: "Air-slide fabric", basis: "h", life: 16000, usedAtStart: 14480, installed: "2024-09-02", duty: "Continuous aeration" },
  { id: "KFS-C2", machine: "PYR-FED-01", sub: "kfs-elevator", name: "Elevator belt and buckets", basis: "h", life: 30000, usedAtStart: 17900, installed: "2025-03-11", duty: "Kiln feed, continuous" },
  { id: "PHC-C1", machine: "PYR-PHC-01", sub: "phc-idfan", name: "ID fan bearings (regrease / replace)", basis: "h", life: 26000, usedAtStart: 11800, installed: "2025-06-30", duty: "Variable speed" },
  { id: "KLN-C1", machine: "PYR-KLN-01", sub: "kln-aux", name: "Main-drive brake pads", basis: "d", life: 730, usedAtStart: 500, installed: "2025-05-27", duty: "Holding brake, stops only" },
  { id: "KLN-C2", machine: "PYR-KLN-01", sub: "kln-lube", name: "Gearbox oil charge", basis: "h", life: 8000, usedAtStart: 7230, installed: "2025-12-01", duty: "Circulating, filtered" },
  { id: "BRN-C1", machine: "PYR-BRN-01", sub: "brn-burner", name: "Burner tip", basis: "d", life: 365, usedAtStart: 190, installed: "2026-04-07", duty: "Continuous firing" },
  { id: "CLR-C1", machine: "PYR-CLR-01", sub: "clr-hot", name: "Grate plates, compartment 1", basis: "h", life: 20000, usedAtStart: 18850, installed: "2024-07-15", duty: "Hot inlet zone" },
  { id: "HMR-C1", machine: "PYR-CCT-01", sub: "hmr-rotor", name: "Hammer set", basis: "h", life: 6000, usedAtStart: 4250, installed: "2026-02-09", duty: "Clinker, continuous" },
  { id: "CSL-C1", machine: "PYR-CCT-01", sub: "csl-silo", name: "Baghouse filter bags", basis: "h", life: 17500, usedAtStart: 9600, installed: "2025-04-18", duty: "Pulse-jet, continuous" },
];

/** Used share of life at a simulated minute (running hours accrue while the line runs). */
export function serviceUsed(c: ServiceComponent, t: number): number {
  const elapsed = c.basis === "h" ? t / 60 : t / 1440;
  return (c.usedAtStart + elapsed) / c.life;
}
