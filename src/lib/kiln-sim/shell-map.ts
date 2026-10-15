/**
 * Kiln shell scanner map (SHL-KLN-01): the unrolled shell, 74 m × 360°, at
 * 0.5 m × 5°. Pure TypeScript, no React.
 *
 * The engine models the scanner maximum per 0.5 m section (`shellProfile`).
 * This module spreads each section around the circumference so the map's
 * column maximum is exactly that section's reading, and therefore the map's
 * hottest cell is exactly CAL-KLN-03. A hot spot (profile above the model)
 * is local around the circumference; a coating ring stays a full band.
 * Tyres hide the shell from the scanner; when coverage (STS-KLN-08) falls
 * below normal, a fouled-lens patch hides the rest.
 *
 * Grid: 149 section nodes at 0, 0.5 … 74 m bound the D5 Table 5.4.7a / 9.5
 * 148 × 0.5 m cells; one map column per node (the engine's profile points).
 *
 * The pyro line engine knows how its shell field is built (a refractory hot
 * spot is local around the circumference, a ring, coating or outlet change is
 * a full band) and passes that per-section local excess (`local`), so the
 * engine and the Thermal page build the identical map. Without it the
 * excess over the model is treated as local (kiln fleet).
 */

export const SHELL_LEN = 74;
export const SHELL_DZ = 0.5;
export const SHELL_DA = 5;
export const SHELL_DIA = 4.8;
/** One column per engine profile point: 0 … 74 m. */
export const SHELL_NZ = Math.round(SHELL_LEN / SHELL_DZ) + 1;
export const SHELL_NA = 360 / SHELL_DA;
export const SHELL_CIRC = Math.PI * SHELL_DIA;
export const SHELL_CELL_AREA = SHELL_DZ * ((SHELL_CIRC * SHELL_DA) / 360);

/** Top of the scanner measuring range (°C): cells read no higher. */
export const SHELL_SCAN_MAX = 600;
export const SHELL_ALERT = 380;
export const SHELL_DANGER = 420;
/** Scanner coverage with only the tyres in the way. */
export const SHELL_NORMAL_COVERAGE = 95.9;

export const SHELL_TYRES = [
  { z: 11, label: "T1" },
  { z: 39, label: "T2" },
  { z: 60, label: "T3" },
] as const;
export const SHELL_GIRTH = 17;

export const SHELL_ZONES = [
  { name: "Inlet", from: 0, to: 15 },
  { name: "Transition", from: 15, to: 40 },
  { name: "Burning", from: 40, to: 66 },
  { name: "Outlet", from: 66, to: 74 },
] as const;

/** Circumferential position of a refractory hot spot (D5 scenario: 52 m). */
const HOT_ANGLE = 120;
/** Fouled-lens patch: starts here and grows along the kiln, above this angle it stays clear. */
const LENS_FROM = 44;
const LENS_MAX_ANGLE = 270;

export interface ShellZoneStats {
  name: string;
  from: number;
  to: number;
  /** Mean of the per-section scanner maxima, comparable with the model profile. */
  mean: number;
  model: number;
  max: number;
  /** Share of visible cells at or above the alert limit, %. */
  pAbove: number;
}

export interface ShellMap {
  /** Column-major: `temp[i * SHELL_NA + k]` is section i (z = i × 0.5 m), angle k × 5°. */
  temp: Float32Array;
  /** 1 where the scanner has no view. */
  mask: Uint8Array;
  model: number[];
  /** Per-section maximum and mean over visible cells (null when the section is hidden). */
  colMax: Array<number | null>;
  colMean: Array<number | null>;
  max: number;
  maxZ: number;
  maxI: number;
  maxAngle: number;
  /** Area at or above the alert limit, m². */
  hotArea: number;
  /** Bounding box of the ≥ alert area, or null. */
  hotBox: { z0: number; z1: number; a0: number; a1: number } | null;
  /** Visible share of the shell, %. */
  coverage: number;
  zones: ShellZoneStats[];
}

/** Deterministic cell texture in [0, 1): the refractory lining does not flicker between ticks. */
function grain(i: number, k: number): number {
  let h = Math.imul(i + 1, 374761393) ^ Math.imul(k + 1, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const angDist = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/**
 * Per-cell constants of the synthesis, built once: the lining grain, the
 * phase of the slow rotational texture (sin / cos of z/9 + a/9) and the
 * angular weight of a local hot spot. The engine builds a map every
 * simulated minute, so these are not recomputed per cell and tick.
 */
let TABLES: { grain: Float32Array; sinB: Float64Array; cosB: Float64Array; offHot: Float64Array } | null = null;
function tables() {
  if (TABLES) return TABLES;
  const n = SHELL_NZ * SHELL_NA;
  const g = new Float32Array(n);
  const sinB = new Float64Array(n);
  const cosB = new Float64Array(n);
  for (let i = 0; i < SHELL_NZ; i++) {
    for (let k = 0; k < SHELL_NA; k++) {
      const j = i * SHELL_NA + k;
      const b = (i * SHELL_DZ) / 9 + (k * SHELL_DA) / 9;
      g[j] = grain(i, k);
      sinB[j] = Math.sin(b);
      cosB[j] = Math.cos(b);
    }
  }
  const offHot = new Float64Array(SHELL_NA);
  for (let k = 0; k < SHELL_NA; k++) offHot[k] = 1 - Math.exp(-(angDist(k * SHELL_DA + SHELL_DA / 2, HOT_ANGLE) ** 2) / 260);
  TABLES = { grain: g, sinB, cosB, offHot };
  return TABLES;
}

/** Section index of a kiln position (m) and cell index of a position and angle (°). */
export const shellSection = (z: number) => Math.max(0, Math.min(SHELL_NZ - 1, Math.round(z / SHELL_DZ)));
export const shellCell = (z: number, angle: number) => shellSection(z) * SHELL_NA + (Math.floor((((angle % 360) + 360) % 360) / SHELL_DA) % SHELL_NA);

/**
 * @param profile scanner maximum per section (`frame.shellProfile`)
 * @param model   expected profile (`frame.shellModel`)
 * @param coverage STS-KLN-08, %
 * @param t       simulated minute (slow rotational texture)
 */
export function buildShellMap(profile: number[], model: number[], coverage: number, t: number, local?: ArrayLike<number> | null): ShellMap {
  const NZ = Math.min(SHELL_NZ, profile.length);
  const tb = tables();
  const sinT = Math.sin(t / 45);
  const cosT = Math.cos(t / 45);
  const NA = SHELL_NA;
  const temp = new Float32Array(NZ * NA);
  const mask = new Uint8Array(NZ * NA);

  // Hidden cells: tyres (two sections each, ≈ 4 % of the shell, hence 95.9 %
  // normal coverage), then a lens patch sized to the coverage shortfall.
  for (let i = 0; i < NZ; i++) {
    const z = i * SHELL_DZ;
    if (SHELL_TYRES.some((ty) => z >= ty.z && z <= ty.z + SHELL_DZ)) for (let k = 0; k < NA; k++) mask[i * NA + k] = 1;
  }
  // Sensor noise around normal coverage (σ 0.15 %) is not an obstruction.
  const shortfall = SHELL_NORMAL_COVERAGE - coverage;
  let patch = shortfall > 0.5 ? Math.round((shortfall / 100) * NZ * NA) : 0;
  for (let i = Math.round(LENS_FROM / SHELL_DZ); i < NZ && patch > 0; i++) {
    for (let k = 0; k * SHELL_DA < LENS_MAX_ANGLE && patch > 0; k++) {
      if (!mask[i * NA + k]) {
        mask[i * NA + k] = 1;
        patch--;
      }
    }
  }

  const colMax: Array<number | null> = [];
  const colMean: Array<number | null> = [];
  let max = -Infinity;
  let maxI = 0;
  let maxK = 0;
  let visible = 0;
  let hotCells = 0;
  let box: ShellMap["hotBox"] = null;

  for (let i = 0; i < NZ; i++) {
    const z = i * SHELL_DZ;
    const target = profile[i];
    const excess = Math.max(0, local ? local[i] ?? 0 : target - model[i] - 6);
    let rowMax = -Infinity;
    for (let k = 0; k < NA; k++) {
      const j = i * NA + k;
      // 6·grain + 2.5·(1 + sin(t/45 + z/9 + a/9)), with the sine expanded over the per-cell phase table.
      const texture = 6 * tb.grain[j] + 2.5 * (1 + sinT * tb.cosB[j] + cosT * tb.sinB[j]);
      const v = target - texture - excess * tb.offHot[k];
      temp[i * NA + k] = v;
      if (v > rowMax) rowMax = v;
    }
    // Lift the section so its hottest cell is the scanner reading.
    const lift = target - rowMax;
    let m: number | null = null;
    let s = 0;
    let c = 0;
    for (let k = 0; k < NA; k++) {
      const j = i * NA + k;
      // The scanner saturates at the top of its range (0–600 °C); saturation itself is flagged on CAL-KLN-03.
      temp[j] = Math.min(SHELL_SCAN_MAX, temp[j] + lift);
      if (mask[j]) continue;
      const v = temp[j];
      visible++;
      s += v;
      c++;
      if (m === null || v > m) m = v;
      if (v > max) {
        max = v;
        maxI = i;
        maxK = k;
      }
      if (v >= SHELL_ALERT) {
        hotCells++;
        const a = k * SHELL_DA;
        box = box
          ? { z0: Math.min(box.z0, z - SHELL_DZ / 2), z1: Math.max(box.z1, z + SHELL_DZ / 2), a0: Math.min(box.a0, a), a1: Math.max(box.a1, a + SHELL_DA) }
          : { z0: z - SHELL_DZ / 2, z1: z + SHELL_DZ / 2, a0: a, a1: a + SHELL_DA };
      }
    }
    colMax.push(m);
    colMean.push(c ? s / c : null);
  }

  const zones = SHELL_ZONES.map(({ name, from, to }) => {
    let s = 0;
    let sc = 0;
    let ms = 0;
    let c = 0;
    let m = -Infinity;
    let above = 0;
    for (let i = Math.round(from / SHELL_DZ); i < Math.min(NZ, Math.round(to / SHELL_DZ) + (to === SHELL_LEN ? 1 : 0)); i++) {
      const top = colMax[i];
      if (top === null) continue;
      s += top;
      ms += model[i];
      sc++;
      for (let k = 0; k < NA; k++) {
        const j = i * NA + k;
        if (mask[j]) continue;
        c++;
        if (temp[j] > m) m = temp[j];
        if (temp[j] >= SHELL_ALERT) above++;
      }
    }
    return { name, from, to, mean: sc ? s / sc : NaN, model: sc ? ms / sc : NaN, max: m, pAbove: c ? (above / c) * 100 : 0 };
  });

  return {
    temp,
    mask,
    model: model.slice(0, NZ),
    colMax,
    colMean,
    max,
    maxZ: maxI * SHELL_DZ,
    maxI,
    maxAngle: maxK * SHELL_DA,
    hotArea: hotCells * SHELL_CELL_AREA,
    hotBox: box,
    coverage: (visible / (NZ * NA)) * 100,
    zones,
  };
}

export function shellZoneAt(z: number): string {
  return (SHELL_ZONES.find((q) => z >= q.from && z < q.to) ?? SHELL_ZONES[SHELL_ZONES.length - 1]).name;
}

/* ------------------------------------------------------------------ */
/* Thermal-map processing outputs (D5 Tables 5.4.7a / 9.5)             */
/* ------------------------------------------------------------------ */

/** D5 Table 9.5 hot-spot detection: local maximum ≥ model + 40 K, or a rise > 15 K/h (provisional). */
export const SHELL_HOT_DELTA = 40;
export const SHELL_RATE_WARN = 15;
/** D5 Table 5.4.7a / 9.2 scanner coverage target and alarm, %. */
export const SHELL_COVERAGE_TARGET = 95;
export const SHELL_COVERAGE_ALARM = 80;
/** Last-good values older than this are no longer shown for hidden cells (min). */
export const SHELL_LAST_GOOD_MAX_AGE = 60;

/** A run of sections along the kiln and its mean section residual (section maximum − model), K. */
export interface ShellBand {
  from: number;
  to: number;
  residual: number;
}

/** One handheld comparison point (MAN-KLN-01) against the scanner cell at the same metre and angle. */
export interface HandheldPoint {
  m: number;
  angle: number;
  hand: number;
  /** Scanner cell at the same position and time, or null when the scanner had no view there. */
  scan: number | null;
  /** Handheld − scanner after matching the two emissivity set-ups, K. */
  gap: number | null;
}

/** A full map kept for a finding (D5 Table 5.4.7a storage: maps around every finding at full resolution). */
export interface ShellMapSnapshot {
  t: number;
  profile: number[];
  model: number[];
  local: number[];
  coverage: number;
}

export interface ShellFindingMaps {
  ruleId: string;
  /** Minute the finding became active. */
  since: number;
  /** Maps from one hour before to one hour after `since`, oldest first. */
  maps: ShellMapSnapshot[];
}

/**
 * Derived values of the engine's thermal-map processing, per minute
 * (pyro line). The Thermal page reads these instead of re-deriving them, so
 * the rules and the page share one value.
 */
export interface ShellThermal {
  /** Per-section circumferentially local excess (K) the map was built with. */
  local: number[];
  /** Hottest visible cell: position (m), angle (°), the model at that section and the residual (K). */
  hotPos: number;
  hotAngle: number;
  hotModel: number;
  hotResidual: number;
  /** Section maximum − section mean at the hottest section (K): a local spot stands well above its section mean. */
  hotSpread: number;
  /** Shell area at or above the alert / danger limits (m²), and the alert area one hour earlier. */
  areaAboveAlert: number;
  areaAboveDanger: number;
  areaAboveAlert1h: number | null;
  /** Cold band in the transition zone (whole circumference below model), or null. */
  coldBand: ShellBand | null;
  /** Broad warm area in the burning zone (whole circumference above model), or null. */
  warmBand: ShellBand | null;
  /** Mean section residual over the outlet zone 66–74 m, K. */
  outletResidual: number;
  coverageTarget: number;
  /** Last good reading of every cell (`i · 72 + k`) and the minute it was taken (−1: never seen). */
  lastGood: Float32Array;
  lastGoodAt: Int32Array;
  /** Latest handheld round (MAN-KLN-01) compared with the scanner at the same positions. */
  handheld: { at: number; points: HandheldPoint[] } | null;
  /** Maps kept around shell findings, newest first. */
  findingMaps: ShellFindingMaps[];
}

/** Longest run of flagged sections inside [from, to] m; hidden sections (tyres) neither break nor count. */
function longestRun(map: ShellMap, from: number, to: number, hit: (i: number, d: number) => boolean, minLen: number): ShellBand | null {
  const i0 = Math.round(from / SHELL_DZ);
  const i1 = Math.min(map.colMax.length - 1, Math.round(to / SHELL_DZ));
  type Run = { a: number; b: number; sum: number; n: number };
  let best: Run | null = null;
  let cur: Run | null = null;
  for (let i = i0; i <= i1; i++) {
    const top = map.colMax[i];
    if (top === null) continue;
    const d = top - map.model[i];
    if (!hit(i, d)) {
      cur = null;
      continue;
    }
    const next: Run = cur === null ? { a: i, b: i, sum: d, n: 1 } : { a: cur.a, b: i, sum: cur.sum + d, n: cur.n + 1 };
    cur = next;
    if (best === null || next.n > best.n) best = next;
  }
  const b = best as Run | null;
  if (b === null || b.n < minLen) return null;
  return { from: b.a * SHELL_DZ, to: b.b * SHELL_DZ, residual: b.sum / b.n };
}

/**
 * D5 Table 9.5 cold-band detection: section maximum (so every visible cell
 * around the circumference) more than 10 K below the model in the transition
 * zone over ≥ 2 m, band mean ≤ −15 K. The torque rise is judged by the rule.
 */
export function shellColdBand(map: ShellMap): ShellBand | null {
  const band = longestRun(map, 15, 40, (_i, d) => d < -10, 4);
  return band && band.residual <= -15 ? band : null;
}

/**
 * D5 Table 5.4.7b coating loss / hot band: the whole circumference above the
 * model (section maximum > +15 K while the section mean follows it, spread
 * < 15 K) over ≥ 6 m of the burning zone.
 */
export function shellWarmBand(map: ShellMap): ShellBand | null {
  return longestRun(map, 40, 66, (i, d) => d > 15 && (map.colMax[i] ?? 0) - (map.colMean[i] ?? 0) < 15, 12);
}

/** Mean section residual over a span (visible sections only). */
export function shellSpanResidual(map: ShellMap, from: number, to: number): number {
  let acc = 0;
  let n = 0;
  for (let i = Math.round(from / SHELL_DZ); i <= Math.min(map.colMax.length - 1, Math.round(to / SHELL_DZ)); i++) {
    const top = map.colMax[i];
    if (top === null) continue;
    acc += top - map.model[i];
    n++;
  }
  return n ? acc / n : 0;
}

/** Area at or above a temperature over the visible cells, m². */
export function shellAreaAbove(map: ShellMap, limit: number): number {
  let n = 0;
  for (let j = 0; j < map.temp.length; j++) if (!map.mask[j] && map.temp[j] >= limit) n++;
  return n * SHELL_CELL_AREA;
}
