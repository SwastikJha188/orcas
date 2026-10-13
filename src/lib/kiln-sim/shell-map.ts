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
 * @param profile scanner maximum per section (`frame.shellProfile`)
 * @param model   expected profile (`frame.shellModel`)
 * @param coverage STS-KLN-08, %
 * @param t       simulated minute (slow rotational texture)
 */
export function buildShellMap(profile: number[], model: number[], coverage: number, t: number): ShellMap {
  const NZ = Math.min(SHELL_NZ, profile.length);
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
    const excess = Math.max(0, target - model[i] - 6);
    let rowMax = -Infinity;
    for (let k = 0; k < NA; k++) {
      const a = k * SHELL_DA;
      const texture = 6 * grain(i, k) + 2.5 * (1 + Math.sin(t / 45 + z / 9 + a / 9));
      const local = excess * (1 - Math.exp(-(angDist(a + SHELL_DA / 2, HOT_ANGLE) ** 2) / 260));
      const v = target - texture - local;
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
      temp[j] += lift;
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
