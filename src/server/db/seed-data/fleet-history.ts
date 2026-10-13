/**
 * Trend history and diagnosis records for the non-kiln demonstration machines.
 *
 * Trend history is generated from each sensor's own mapped_signals row (value,
 * limits, normal band, status), so it always agrees with the catalog: a
 * healthy sensor holds steady around its current value; an Advisory or
 * Critical sensor drifts from its normal band into the warning zone over the
 * last 24 h. Deterministic per tag (seeded), no Math.random.
 *
 * Diagnosis records follow the same sensor states and the failure modes in
 * fleet-sensor-specs.ts. Spectral peaks use each machine's running speed.
 * Demo values, like the limits.
 */

export interface TrendSignalRow {
  machine_id: string;
  tag: string;
  name: string;
  unit: string;
  numeric_value: string | number | null;
  warning_val: string | number | null;
  alarm_val: string | number | null;
  nominal_band: string | null;
  sensor_type: string | null;
  status: string;
}

export interface TrendRecordRow {
  machineId: string;
  metricKey: string;
  label: string;
  unit: string;
  baseline: number;
  advisoryLimit: number;
  criticalLimit: number;
  points: Array<{ time: string; value: number }>;
  stats: { mean: string; peak: string; drift30d: string; kurtosis: string; crestFactor: string };
}

/** 24 hourly samples ending at "Now"; labels are offsets ("-23h" … "-1h", "Now") so the history never goes stale. */
export const TREND_HOURS = 24;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32: small seeded PRNG so every reseed writes the same history. */
function prng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Midpoint of a "lo – hi" normal band, else null. */
function bandMid(band: string | null): number | null {
  if (!band) return null;
  const nums = band.replace(/,/g, "").match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  if (band.includes("–") && nums.length >= 2) return (nums[0] + nums[1]) / 2;
  return null;
}

function decimalsFor(v: number): number {
  const a = Math.abs(v);
  return a >= 1000 ? 0 : a >= 100 ? 1 : a >= 10 ? 1 : 2;
}

const fmt = (v: number, d: number, unit: string) => `${v.toFixed(d)} ${unit}`.trim();
const signed = (v: number, d: number, unit: string) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(d)} ${unit}`.trim();

export function buildTrendRecord(row: TrendSignalRow): TrendRecordRow {
  const current = Number(row.numeric_value) || 0;
  const warning = Number(row.warning_val) || 0;
  const alarm = Number(row.alarm_val) || 0;
  const unit = row.unit;
  const d = decimalsFor(current || warning);
  const rnd = prng(hash(`${row.machine_id}|${row.tag}`));
  const degrading = row.status !== "Normal";
  const isVib = unit === "mm/s";

  // A degrading sensor started the day inside its normal band.
  const mid = bandMid(row.nominal_band);
  const start = degrading ? mid ?? current * (warning > alarm ? 1.12 : 0.85) : current;
  const scale = Math.max(Math.abs(current), Math.abs(warning) * 0.25, 0.01);
  const noise = scale * (isVib ? 0.035 : 0.006);

  const points: Array<{ time: string; value: number }> = [];
  for (let i = 0; i < TREND_HOURS; i++) {
    const f = i / (TREND_HOURS - 1);
    // Degradation accelerates late in the window (quadratic), healthy is flat.
    const base = degrading ? start + (current - start) * f * f : current;
    const jitter = i === TREND_HOURS - 1 || current === 0 ? 0 : (rnd() - 0.5) * 2 * noise;
    const value = Number((base + jitter).toFixed(d));
    const hoursAgo = TREND_HOURS - 1 - i;
    points.push({ time: hoursAgo === 0 ? "Now" : `-${hoursAgo}h`, value });
  }

  const values = points.map((p) => p.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const peak = warning > alarm ? Math.min(...values) : Math.max(...values);
  const rms = Math.sqrt(values.reduce((a, b) => a + b * b, 0) / values.length) || 1;
  // A stopped (standby) sensor reads zero: no crest, no drift.
  const stopped = current === 0 && !degrading;
  const crest = stopped ? 1 : isVib ? 3.1 + rnd() * 0.4 : Math.max(...values.map(Math.abs)) / rms || 1;
  // 30-day drift: a degrading sensor moved by its whole 24 h excursion; a healthy one barely.
  const drift = stopped ? 0 : degrading ? current - start : (rnd() - 0.5) * noise * 2;

  return {
    machineId: row.machine_id,
    metricKey: row.tag,
    label: row.name,
    unit,
    baseline: Number((degrading ? start : current).toFixed(2)),
    advisoryLimit: warning,
    criticalLimit: alarm,
    points,
    stats: {
      mean: fmt(mean, d, unit),
      peak: fmt(peak, d, unit),
      drift30d: signed(drift, d, unit),
      kurtosis: (degrading && isVib ? 3.6 + rnd() * 0.6 : 2.85 + rnd() * 0.3).toFixed(2),
      crestFactor: crest.toFixed(2),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Diagnosis records                                                  */
/* ------------------------------------------------------------------ */

export interface FleetDiagnosisRecord {
  machineId: string;
  overallCondition: "Nominal" | "Advisory" | "Critical";
  confidence: number;
  engineVersion: string;
  summary: string;
  findings: Array<{ id: string; fault: string; location: string; severity: string; frequency: string; probability: number; recommendation: string }>;
  peakFrequencies: Array<{ freq: string; name: string; status: string; amplitude: string }>;
  maintenancePriority: string;
  prescriptiveAction: string;
}

const ENGINE = "AssetIQ ML v4.2 + ISO 20816-3";

export const FLEET_DIAGNOSIS_RECORDS: FleetDiagnosisRecord[] = [
  {
    // Replaces the original BALL-02 record, which named the discharge trunnion
    // while the DB sensors show the feed trunnion and the pinion in Advisory.
    machineId: "BALL-02",
    overallCondition: "Advisory",
    confidence: 84.2,
    engineVersion: ENGINE,
    summary:
      "Pinion drive-end bearing shows outer-race defect energy: RMS 4.12 mm/s against a 3.5 mm/s pinion limit with BPFO harmonics, and girth-gear mesh acoustic has risen to 88.2 dB. The feed trunnion bearing has climbed to 76.8 °C (warning 75 °C) while the discharge trunnion holds at 68.4 °C, pointing to a feed-end lubrication issue rather than a mill-wide one.",
    findings: [
      { id: "F-BALL02-01", fault: "Pinion DE Bearing Outer-Race Defect (BPFO)", location: "Pinion Drive Shaft", severity: "Advisory", frequency: "98.4 Hz (6.15X)", probability: 58.0, recommendation: "Confirm BPFO with envelope demodulation; plan pinion bearing change at the next planned stop." },
      { id: "F-BALL02-02", fault: "Feed Trunnion Lube-Film Breakdown", location: "Feed Bearing", severity: "Advisory", frequency: "Thermal trend", probability: 34.0, recommendation: "Check HP lift and LP lube pressures, oil cooler and feed slurry temperature at the feed end." },
      { id: "F-BALL02-03", fault: "Girth Gear Mesh Distress (GMF)", location: "Rotating Shell (26x42ft)", severity: "Advisory", frequency: "448.0 Hz (28X)", probability: 21.0, recommendation: "Check spray lubrication pattern and pinion alignment by thermography." },
    ],
    peakFrequencies: [
      { freq: "16.00 Hz", name: "Running Speed 1X", status: "Normal", amplitude: "1.42 mm/s" },
      { freq: "98.40 Hz", name: "Pinion Bearing BPFO", status: "Elevated", amplitude: "3.48 mm/s" },
      { freq: "196.80 Hz", name: "Pinion Bearing 2× BPFO", status: "Elevated", amplitude: "1.36 mm/s" },
      { freq: "448.00 Hz", name: "Gearmesh GMF (28X)", status: "Elevated", amplitude: "2.10 mm/s" },
    ],
    maintenancePriority: "Medium",
    prescriptiveAction: "Inspect feed-trunnion lubrication now; schedule pinion DE bearing replacement and a girth-gear contact check at the next planned stop.",
  },
  {
    machineId: "PMP-101",
    overallCondition: "Advisory",
    confidence: 86.4,
    engineVersion: ENGINE,
    summary:
      "Drive-end bearing B-101 shows outer-race defect energy: overall RMS 3.50 mm/s (ISO 20816-3 Group 2 zone C) with BPFO harmonics and a matching temperature rise to 72 °C. Motor current is 18.0 A against a 16.5 A warning while discharge flow has fallen to 70 m³/h, consistent with rising system resistance from filtration blockage.",
    findings: [
      { id: "F-PMP-01", fault: "Bearing B-101 Outer-Race Defect (BPFO)", location: "Drive-End Bearing Assembly B-101", severity: "Advisory", frequency: "74.2 Hz (3.07X)", probability: 64.0, recommendation: "Confirm BPFO with envelope demodulation; re-grease and plan bearing replacement within 2 weeks." },
      { id: "F-PMP-02", fault: "Low Flow / Filtration Blockage", location: "Discharge & Water Circulation", severity: "Advisory", frequency: "Process trend", probability: 38.0, recommendation: "Clean suction strainer and filters; verify the pump returns to its best-efficiency flow." },
      { id: "F-PMP-03", fault: "Motor Overload (≈ 110 % FLA)", location: "Drive Motor M-101", severity: "Advisory", frequency: "Electrical trend", probability: 22.0, recommendation: "Re-check current after bearing and filter work; inspect for mechanical drag." },
    ],
    peakFrequencies: [
      { freq: "24.17 Hz", name: "Running Speed 1X", status: "Normal", amplitude: "1.10 mm/s" },
      { freq: "48.33 Hz", name: "Coupling Harmonic 2X", status: "Normal", amplitude: "0.42 mm/s" },
      { freq: "74.20 Hz", name: "Bearing BPFO", status: "Elevated", amplitude: "2.35 mm/s" },
      { freq: "148.40 Hz", name: "Bearing 2× BPFO", status: "Elevated", amplitude: "0.96 mm/s" },
      { freq: "169.17 Hz", name: "Vane Pass (7X)", status: "Normal", amplitude: "0.38 mm/s" },
    ],
    maintenancePriority: "High",
    prescriptiveAction: "Replace drive-end bearing B-101 at the next planned stop (within 2 weeks); clean filtration and suction strainer now; trend vibration daily until replacement.",
  },
  {
    machineId: "AGIT-01",
    overallCondition: "Nominal",
    confidence: 96.8,
    engineVersion: ENGINE,
    summary: "Gearbox high-speed stage at 1.82 mm/s (Group 2 zone B), seal barrier fluid 68.5 °C and shaft runout 0.28 mm, all inside their normal bands. No fault pattern above threshold.",
    findings: [
      { id: "F-AGIT-01", fault: "Gear-Mesh Wear (HS Stage)", location: "Helical Gearbox Drive", severity: "Normal", frequency: "569.3 Hz (GMF 23X)", probability: 3.2, recommendation: "Routine oil sample at next quarterly round." },
      { id: "F-AGIT-02", fault: "Impeller Imbalance (1X)", location: "Mechanical Seal & Shaft", severity: "Normal", frequency: "24.75 Hz (1.0X)", probability: 2.1, recommendation: "Inspect impeller for build-up at next vessel entry." },
    ],
    peakFrequencies: [
      { freq: "24.75 Hz", name: "Motor Running Speed 1X", status: "Normal", amplitude: "0.64 mm/s" },
      { freq: "569.25 Hz", name: "HS Gearmesh GMF", status: "Normal", amplitude: "0.92 mm/s" },
      { freq: "1.42 Hz", name: "Agitator Shaft 1X", status: "Normal", amplitude: "0.21 mm/s" },
    ],
    maintenancePriority: "Low",
    prescriptiveAction: "Continue condition-based monitoring. No intervention required.",
  },
  {
    machineId: "BALL-03",
    overallCondition: "Nominal",
    confidence: 97.2,
    engineVersion: ENGINE,
    summary: "Motor DE 1.92 mm/s and pinion 2.10 mm/s inside their zones; both trunnions below 63 °C; shell displacement 0.18 mm. No fault pattern above threshold.",
    findings: [
      { id: "F-BALL03-01", fault: "Pinion Gearmesh Modulation (GMF)", location: "Pinion Gearbox", severity: "Normal", frequency: "448.0 Hz (28X)", probability: 2.6, recommendation: "Verify girth-gear contact pattern at next shutdown." },
      { id: "F-BALL03-02", fault: "Trunnion Bearing Film Breakdown", location: "Feed Bearing", severity: "Normal", frequency: "Thermal trend", probability: 1.4, recommendation: "Routine lube-oil particle count." },
    ],
    peakFrequencies: [
      { freq: "16.00 Hz", name: "Running Speed 1X", status: "Normal", amplitude: "0.88 mm/s" },
      { freq: "32.00 Hz", name: "Coupling Harmonic 2X", status: "Normal", amplitude: "0.31 mm/s" },
      { freq: "448.00 Hz", name: "Gearmesh GMF (28X)", status: "Normal", amplitude: "1.24 mm/s" },
    ],
    maintenancePriority: "Low",
    prescriptiveAction: "Continue condition-based monitoring. No intervention required.",
  },
  {
    machineId: "BLOW-03",
    overallCondition: "Nominal",
    confidence: 97.6,
    engineVersion: ENGINE,
    summary: "Motor DE 1.45 mm/s and coupling 1.20 mm/s (zone A/B); thrust pad 51.2 °C; discharge air 78.4 °C. No surge or misalignment signature.",
    findings: [
      { id: "F-BLOW-01", fault: "Coupling Misalignment (2X)", location: "Shaft & Bearing Pedestal", severity: "Normal", frequency: "99.3 Hz (2.0X)", probability: 1.8, recommendation: "Hot alignment check at next overhaul." },
      { id: "F-BLOW-02", fault: "Surge / Rotating Stall", location: "Impeller Volute Casing", severity: "Normal", frequency: "Sub-synchronous", probability: 0.9, recommendation: "Anti-surge margin nominal." },
    ],
    peakFrequencies: [
      { freq: "49.67 Hz", name: "Running Speed 1X", status: "Normal", amplitude: "0.71 mm/s" },
      { freq: "99.33 Hz", name: "Coupling Harmonic 2X", status: "Normal", amplitude: "0.28 mm/s" },
      { freq: "596.00 Hz", name: "Blade Pass (12X)", status: "Normal", amplitude: "0.46 mm/s" },
    ],
    maintenancePriority: "Low",
    prescriptiveAction: "Continue condition-based monitoring. No intervention required.",
  },
  {
    machineId: "CONV-04",
    overallCondition: "Nominal",
    confidence: 96.1,
    engineVersion: ENGINE,
    summary: "Head pulley DE 1.74 mm/s, reducer oil 58.2 °C and belt integrity 100 %. No splice or bearing fault pattern.",
    findings: [
      { id: "F-CONV-01", fault: "Head Pulley Bearing Defect", location: "Head Pulley Reducer", severity: "Normal", frequency: "Envelope band", probability: 2.2, recommendation: "Routine greasing per schedule." },
      { id: "F-CONV-02", fault: "Belt Splice Degradation", location: "Overland Belt Splice", severity: "Normal", frequency: "Scanner", probability: 1.1, recommendation: "Next splice survey per plan." },
    ],
    peakFrequencies: [
      { freq: "24.83 Hz", name: "Motor Running Speed 1X", status: "Normal", amplitude: "0.66 mm/s" },
      { freq: "1.12 Hz", name: "Head Pulley 1X", status: "Normal", amplitude: "0.24 mm/s" },
      { freq: "422.17 Hz", name: "Bevel Gearmesh GMF", status: "Normal", amplitude: "0.81 mm/s" },
    ],
    maintenancePriority: "Low",
    prescriptiveAction: "Continue condition-based monitoring. No intervention required.",
  },
  {
    machineId: "HP-PUMP-01",
    overallCondition: "Nominal",
    confidence: 95.4,
    engineVersion: ENGINE,
    summary: "Crank bearing 1.65 mm/s; injection pressure 48.2 bar and diaphragm stroke 18.2 mm inside their bands. No check-valve or diaphragm fault pattern.",
    findings: [
      { id: "F-HPP-01", fault: "Crank Bearing Clearance Growth", location: "Triplex Crank Drive", severity: "Normal", frequency: "Plunger impacts (3X crank)", probability: 2.4, recommendation: "Lube-oil ferrous debris check at next round." },
      { id: "F-HPP-02", fault: "Check-Valve Leakage", location: "Diaphragm Chamber", severity: "Normal", frequency: "Pressure pulsation", probability: 1.6, recommendation: "Valve inspection at next planned stop." },
    ],
    peakFrequencies: [
      { freq: "16.50 Hz", name: "Motor Running Speed 1X", status: "Normal", amplitude: "0.58 mm/s" },
      { freq: "1.00 Hz", name: "Crank 1X", status: "Normal", amplitude: "0.42 mm/s" },
      { freq: "3.00 Hz", name: "Plunger Pass (3X)", status: "Normal", amplitude: "0.77 mm/s" },
    ],
    maintenancePriority: "Low",
    prescriptiveAction: "Continue condition-based monitoring. No intervention required.",
  },
  {
    machineId: "PUMP-104",
    overallCondition: "Nominal",
    confidence: 90.0,
    engineVersion: ENGINE,
    summary: "Standby unit: discharge pressure and bearing vibration at zero, motor DE at ambient 24.1 °C; gland water pressure held at 4.8 bar. No running data to classify.",
    findings: [
      { id: "F-PUMP104-01", fault: "Standby Bearing False Brinelling", location: "Pump Bearing Assembly", severity: "Normal", frequency: "Not running", probability: 1.0, recommendation: "Rotate the shaft weekly and run the standby pump monthly." },
    ],
    peakFrequencies: [],
    maintenancePriority: "Low",
    prescriptiveAction: "Keep on standby; monthly test run to collect a running baseline.",
  },
];
