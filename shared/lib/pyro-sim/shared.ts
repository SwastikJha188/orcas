/**
 * Helpers and constants shared by the line engine (`engine.ts`) and the
 * per-machine rule evaluators (`eval/*`). Pure functions, no state.
 */
import { formatClock } from "../kiln-sim/engine";

/** Kiln shell profile points: 0 … 74 m at 0.5 m. */
export const PROFILE_N = 149;
/** Emissivity set-ups of the handheld IR thermometer and of the shell scanner (SW-KLN-03 correction). */
export const HANDHELD_EMISSIVITY = 0.85;
export const SCANNER_EMISSIVITY = 0.85;
/**
 * Cooler compartment under-grate pressures at the design point (mbar), compartments 1–6. Compartments 2, 3, 5 and 6 sit
 * at the OSW-PE-SNL-PYR-01 Rev. 01 nominal mid-points (500–650, 400–550, 250–350, 150–250 mmWG).
 */
export const CLR_BASE = [78, 56.4, 46.6, 44, 29.4, 19.6];
/** Signed channels: shown with a sign and spanning both sides of zero. */
export const SIGNED = new Set(["POS-KLN-01", "PRS-KLN-01", "PRS-KLN-03", "CAL-KLN-06"]);

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  // Typed-array sort: numeric order without a comparator callback.
  const s = Float64Array.from(values).sort();
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function slope(values: number[], n = 30): number | null {
  const len = Math.min(n, values.length);
  if (len < 6) return null;
  const ys = values.slice(values.length - len);
  const xm = (len - 1) / 2;
  const ym = ys.reduce((a, b) => a + b, 0) / len;
  let num = 0;
  let den = 0;
  for (let i = 0; i < len; i++) {
    num += (i - xm) * (ys[i] - ym);
    den += (i - xm) * (i - xm);
  }
  return den === 0 ? 0 : num / den;
}

export const fmtZ = (z: number) => `${z >= 0 ? "+" : "−"}${Math.abs(z).toFixed(1)}σ`;

export const fmtSigned = (v: number, d = 1) => {
  const r = Math.abs(v).toFixed(d);
  return Number(r) === 0 ? r : `${v >= 0 ? "+" : "−"}${r}`;
};

/** Scanner reading re-expressed at the handheld's emissivity set-up (grey body: radiance ∝ ε·T⁴ in kelvin). */
export function emissivityMatched(scanC: number): number {
  return (scanC + 273.15) * Math.pow(SCANNER_EMISSIVITY / HANDHELD_EMISSIVITY, 0.25) - 273.15;
}

/** Simulated minute as a short clock label (D+n hh:mm). */
export function clockLabel(t: number): string {
  const { clock, day } = formatClock(t);
  return day > 0 ? `D+${day} ${clock}` : clock;
}
