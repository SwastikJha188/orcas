/**
 * Thermal sub-page derivations (pure TypeScript, no React).
 *
 * Everything here reads the live shell map (`buildShellMap` over
 * `frame.shellProfile`) and the D5 limits / rule logic:
 *   - CAL-KLN-03 shell maximum: normal 250–330 °C, warning 380 °C or > 20 K/h, alarm 420 °C (D5 Table 9.2)
 *   - STS-KLN-08 coverage: normal ≥ 95 %, warning < 90 %, alarm < 80 % (D5 Table 9.3)
 *   - R-SHL-01 refractory loss / hot spot: shell max above the expected profile (> 12.5 K) and / or fast rise; local
 *   - R-SHL-02 ring / coating build-up: cold band 29–37 m residual < −15 K + torque residual; drive vibration normal
 *
 * The pyro line follows D5-OSW-PE-PYR Tables 5.4.7a / 9.2 / 9.5 instead (`thermalLimits(true)`): hot spot at
 * model + 40 K or > 15 K/h, coverage target 95 % (alarm < 80 %), cold band 30–36 m from the engine's map processing
 * (`frame.shellThermal`). The 12.5 K residual stays a map highlight there, not a finding threshold.
 */

import type { RuleState } from "@/lib/kiln-sim/engine";
import type { Severity } from "@/lib/kiln-sim/signals";
import {
  SHELL_ALERT,
  SHELL_CELL_AREA,
  SHELL_COVERAGE_ALARM,
  SHELL_COVERAGE_TARGET,
  SHELL_HOT_DELTA,
  SHELL_RATE_WARN,
  SHELL_DA,
  SHELL_DANGER,
  SHELL_DZ,
  SHELL_NA,
  SHELL_ZONES,
  shellZoneAt,
  type ShellMap,
  type ShellZoneStats,
} from "@/lib/kiln-sim/shell-map";
import type { Tone } from "./assets-shell-ui";

/** R-SHL-01 residual threshold: a cell this far above the section model is part of a hot spot. */
export const HOT_DELTA = 12.5;
/** R-SHL-02 cold-band threshold, used symmetrically for the zone mean estimate. */
export const ZONE_DELTA = 15;
/** CAL-KLN-03 warning rate of rise, K/h (D5 Table 9.2). */
export const RATE_WARN = 20;
/** D5 cold band where a ring / coating build-up shows (Table 5.3.4). */
export const COLD_BAND = { from: 29, to: 37 } as const;
/** STS-KLN-08 limits (D5 Table 9.3). */
export const COVERAGE = { normal: 95, warn: 90, alarm: 80 } as const;
/** CAL-KLN-03 normal band (D5 Table 9.2). */
export const SHELL_NORMAL_BAND = { lo: 250, hi: 330 } as const;

/** Thresholds the Thermal page judges and draws with, per plant. */
export interface ThermalLimits {
  /** Residual of the hottest section that makes a hot-spot finding (K). */
  hotDelta: number;
  /** Rate of rise that is a warning (K/h). */
  rateWarn: number;
  coverage: { normal: number; warn: number; alarm: number };
  /** Where a ring / coating build-up shows as a cold band (m). */
  coldBand: { from: number; to: number };
  /** Source of the numbers, for the method notes. */
  source: string;
}

/** Kiln fleet: the kiln-seal demo rules (R-SHL-01 / -02). Pyro line: D5 Tables 5.4.7a, 9.2 and 9.5. */
export function thermalLimits(pyro: boolean): ThermalLimits {
  return pyro
    ? {
        hotDelta: SHELL_HOT_DELTA,
        rateWarn: SHELL_RATE_WARN,
        coverage: { normal: SHELL_COVERAGE_TARGET, warn: SHELL_COVERAGE_TARGET, alarm: SHELL_COVERAGE_ALARM },
        coldBand: { from: 30, to: 36 },
        source: "D5 Tables 5.4.7a / 9.2 / 9.5 (provisional demo values)",
      }
    : { hotDelta: HOT_DELTA, rateWarn: RATE_WARN, coverage: COVERAGE, coldBand: COLD_BAND, source: "kiln-seal demo rules" };
}

export const SEV_TONE: Record<Severity, Tone> = { Normal: "good", Advisory: "warn", Critical: "bad" };
const TONE_RANK: Record<Tone, number> = { idle: 0, info: 0, good: 1, warn: 2, bad: 3 };

export const worst = (...t: Tone[]): Tone => t.reduce<Tone>((a, b) => (TONE_RANK[b] > TONE_RANK[a] ? b : a), "good");
export const tempTone = (v: number): Tone => (v >= SHELL_DANGER ? "bad" : v >= SHELL_ALERT ? "warn" : "good");
export const coverageTone = (v: number, c: ThermalLimits["coverage"] = COVERAGE): Tone => (v < c.alarm ? "bad" : v < c.warn ? "warn" : "good");

export const fmt0 = (v: number | null | undefined) => (v != null && Number.isFinite(v) ? v.toFixed(0) : "—");
export const fmt1 = (v: number | null | undefined) => (v != null && Number.isFinite(v) ? v.toFixed(1) : "—");

/** Signed number with a true minus sign. */
export function signed(v: number | null | undefined, d = 0): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const r = Math.abs(v).toFixed(d);
  return Number(r) === 0 ? r : `${v > 0 ? "+" : "−"}${r}`;
}

/* ------------------------------------------------------------------ */
/* Hot spots: connected cells above the profile or at / over alert      */
/* ------------------------------------------------------------------ */

export interface HotSpot {
  /** Stable id: peak section index. */
  id: string;
  rank: number;
  peak: number;
  peakI: number;
  peakZ: number;
  peakA: number;
  model: number;
  delta: number;
  z0: number;
  z1: number;
  /** Circumferential arc, degrees; a1 may exceed 360 when the arc wraps. */
  a0: number;
  a1: number;
  area: number;
  zone: string;
  tone: Tone;
}

export function findHotSpots(map: ShellMap, limit = 8): HotSpot[] {
  const nz = map.colMax.length;
  const NA = SHELL_NA;
  const n = nz * NA;
  const hot = new Uint8Array(n);
  for (let i = 0; i < nz; i++) {
    const m = map.model[i];
    for (let k = 0; k < NA; k++) {
      const j = i * NA + k;
      if (map.mask[j]) continue;
      const v = map.temp[j];
      if (v - m >= HOT_DELTA || v >= SHELL_ALERT) hot[j] = 1;
    }
  }
  const seen = new Uint8Array(n);
  const spots: HotSpot[] = [];
  const stack: number[] = [];
  for (let s = 0; s < n; s++) {
    if (!hot[s] || seen[s]) continue;
    seen[s] = 1;
    stack.push(s);
    let cells = 0;
    let peak = -Infinity;
    let peakJ = s;
    let i0 = Infinity;
    let i1 = -Infinity;
    const ks = new Uint8Array(NA);
    while (stack.length) {
      const j = stack.pop()!;
      const i = Math.floor(j / NA);
      const k = j % NA;
      cells++;
      ks[k] = 1;
      if (i < i0) i0 = i;
      if (i > i1) i1 = i;
      if (map.temp[j] > peak) {
        peak = map.temp[j];
        peakJ = j;
      }
      const nb = [i > 0 ? j - NA : -1, i < nz - 1 ? j + NA : -1, i * NA + ((k + 1) % NA), i * NA + ((k + NA - 1) % NA)];
      for (const q of nb) {
        if (q >= 0 && hot[q] && !seen[q]) {
          seen[q] = 1;
          stack.push(q);
        }
      }
    }
    if (cells < 2) continue;
    // Smallest arc covering the occupied angles: start after the largest empty gap.
    let gapStart = -1;
    let gapLen = 0;
    for (let k = 0; k < NA; k++) {
      if (ks[k]) continue;
      let len = 0;
      while (len < NA && !ks[(k + len) % NA]) len++;
      if (len > gapLen) {
        gapLen = len;
        gapStart = k;
      }
    }
    const arcStart = gapStart < 0 ? 0 : (gapStart + gapLen) % NA;
    const arcLen = NA - gapLen;
    const pi = Math.floor(peakJ / NA);
    const m = map.model[pi];
    spots.push({
      id: `hs-${pi}`,
      rank: 0,
      peak,
      peakI: pi,
      peakZ: pi * SHELL_DZ,
      peakA: (peakJ % NA) * SHELL_DA,
      model: m,
      delta: peak - m,
      z0: Math.max(0, i0 * SHELL_DZ - SHELL_DZ / 2),
      z1: i1 * SHELL_DZ + SHELL_DZ / 2,
      a0: arcStart * SHELL_DA,
      a1: (arcStart + arcLen) * SHELL_DA,
      area: cells * SHELL_CELL_AREA,
      zone: shellZoneAt(pi * SHELL_DZ),
      tone: worst(tempTone(peak), peak - m >= HOT_DELTA ? "warn" : "good"),
    });
  }
  spots.sort((a, b) => b.peak - a.peak);
  return spots.slice(0, limit).map((s, r) => ({ ...s, rank: r + 1 }));
}

/* ------------------------------------------------------------------ */
/* Refractory & coating estimate per zone (D5 R-SHL-01 / R-SHL-02)     */
/* ------------------------------------------------------------------ */

export type LiningKind = "hot-spot" | "loss" | "ring" | "build-up" | "normal" | "no-view";

export interface ZoneEstimate {
  zone: ShellZoneStats;
  kind: LiningKind;
  label: string;
  tone: Tone;
  /** Mean of section maxima minus the model mean, K. */
  meanDelta: number;
  /** Largest section maximum minus the model at that section, K. */
  maxDelta: number;
  spots: HotSpot[];
  /** Cold band residual, only for the zone that contains 29–37 m. */
  coldBand: number | null;
}

export interface LiningContext {
  coldBandResidual: number;
  /** ELE-KLN-01 torque residual in σ. */
  torqueZ: number | null;
  /**
   * Pyro line: label shell-temperature deviation only. D4 ENGINEERING LIMITATION 3:
   * the shell scanner is not refractory thickness or graphite seal temperature.
   */
  deviationOnly?: boolean;
  /** Cold-band span to report (default the kiln-seal demo 29–37 m). */
  coldBandSpan?: { from: number; to: number };
}

export function zoneEstimates(map: ShellMap, spots: HotSpot[], ctx: LiningContext): ZoneEstimate[] {
  return map.zones.map((z) => {
    const meanDelta = z.mean - z.model;
    // Largest section residual (section maximum minus the model at that section).
    let maxDelta = Number.NaN;
    for (let i = Math.round(z.from / SHELL_DZ); i < Math.min(map.colMax.length, Math.round(z.to / SHELL_DZ) + 1); i++) {
      const v = map.colMax[i];
      if (v == null) continue;
      const d = v - map.model[i];
      if (!(d <= maxDelta)) maxDelta = d;
    }
    const own = spots.filter((s) => s.peakZ >= z.from && (s.peakZ < z.to || z.to === SHELL_ZONES[SHELL_ZONES.length - 1].to));
    const span = ctx.coldBandSpan ?? COLD_BAND;
    const hasBand = span.from >= z.from && span.to <= z.to;
    const coldBand = hasBand ? ctx.coldBandResidual : null;
    const limit = Number.isFinite(z.max) ? tempTone(z.max) : "good";
    let kind: LiningKind;
    let label: string;
    let tone: Tone;
    if (!Number.isFinite(meanDelta)) {
      kind = "no-view";
      label = "No scanner view";
      tone = "idle";
    } else if (own.some((s) => s.delta >= HOT_DELTA)) {
      kind = "hot-spot";
      label = ctx.deviationOnly ? "Hot spot vs profile" : "Local refractory loss / hot spot";
      tone = worst(limit, "warn");
    } else if (meanDelta > ZONE_DELTA) {
      kind = "loss";
      label = ctx.deviationOnly ? "Zone above profile" : "Coating loss / lining thinning";
      tone = worst(limit, "warn");
    } else if (coldBand !== null && coldBand < -ZONE_DELTA) {
      kind = "ring";
      label = ctx.deviationOnly ? "Cold band below profile" : "Ring / coating build-up";
      tone = worst(limit, "warn");
    } else if (meanDelta < -ZONE_DELTA) {
      kind = "build-up";
      label = ctx.deviationOnly ? "Zone below profile" : "Coating build-up";
      tone = worst(limit, "warn");
    } else {
      kind = "normal";
      label = "On model profile";
      tone = limit;
    }
    return { zone: z, kind, label, tone, meanDelta, maxDelta, spots: own, coldBand };
  });
}

/* ------------------------------------------------------------------ */
/* Zone change against earlier scans (engine scan history)             */
/* ------------------------------------------------------------------ */

/** One operating shift, simulated minutes. */
export const SHIFT_MIN = 8 * 60;

export interface ShellScan {
  t: number;
  profile: number[];
  coverage: number;
  valid: boolean;
}

export interface ZoneScanDelta {
  /** Zone mean of the latest valid scan minus the previous valid scan, K. */
  scan: number | null;
  /** Zone mean of the latest valid scan minus the last valid scan at least one shift earlier, K. */
  shift: number | null;
}

export interface ScanComparison {
  byZone: Map<string, ZoneScanDelta>;
  /** Simulated minutes of the scans compared (null when not available). */
  latestAt: number | null;
  prevAt: number | null;
  shiftAt: number | null;
  /** Valid scans kept by the engine, and the span they cover (minutes). */
  kept: number;
  spanMin: number;
}

/** Mean of the axial profile (section maxima) over a zone. */
function profileZoneMean(profile: number[], from: number, to: number): number {
  let acc = 0;
  let n = 0;
  for (let i = Math.round(from / SHELL_DZ); i <= Math.min(profile.length - 1, Math.round(to / SHELL_DZ)); i++) {
    acc += profile[i];
    n++;
  }
  return n ? acc / n : Number.NaN;
}

/**
 * Change of each zone against the previous validated scan and the scan one
 * shift earlier. Only scans taken with good scanner coverage are compared, so a
 * fouled window never reads as a shell change.
 */
export function zoneScanDeltas(scans: readonly ShellScan[] | undefined, zones: ReadonlyArray<{ name: string; from: number; to: number }>): ScanComparison {
  const valid = (scans ?? []).filter((s) => s.valid);
  const latest = valid[valid.length - 1] ?? null;
  const prev = valid.length > 1 ? valid[valid.length - 2] : null;
  let shift: ShellScan | null = null;
  if (latest) for (const s of valid) if (s.t <= latest.t - SHIFT_MIN) shift = s;
  const byZone = new Map<string, ZoneScanDelta>();
  for (const z of zones) {
    const now = latest ? profileZoneMean(latest.profile, z.from, z.to) : Number.NaN;
    const d = (other: ShellScan | null) => {
      if (!other) return null;
      const v = now - profileZoneMean(other.profile, z.from, z.to);
      return Number.isFinite(v) ? v : null;
    };
    byZone.set(z.name, { scan: d(prev), shift: d(shift) });
  }
  return {
    byZone,
    latestAt: latest?.t ?? null,
    prevAt: prev?.t ?? null,
    shiftAt: shift?.t ?? null,
    kept: valid.length,
    spanMin: valid.length > 1 ? valid[valid.length - 1].t - valid[0].t : 0,
  };
}

/* ------------------------------------------------------------------ */
/* Rule state                                                          */
/* ------------------------------------------------------------------ */

export type RuleStage = "Quiet" | "Confirming" | "Active" | "Clearing";

/** Hysteresis: 4 clean samples clear a confirmed rule (D5 §9). */
export const CLEAR_SAMPLES = 4;

export function ruleStage(r: RuleState): { stage: RuleStage; tone: Tone; detail: string } {
  if (r.status === "QUIET") return { stage: "Quiet", tone: "idle", detail: "No match" };
  if (r.status === "PENDING") return { stage: "Confirming", tone: "info", detail: `${r.persistence}/${r.threshold} samples` };
  if (r.clean > 0) return { stage: "Clearing", tone: "good", detail: `${r.clean}/${CLEAR_SAMPLES} clean samples` };
  return { stage: "Active", tone: SEV_TONE[r.severity], detail: r.severity };
}

/* ------------------------------------------------------------------ */
/* Map coverage breakdown                                              */
/* ------------------------------------------------------------------ */

export function hiddenBreakdown(map: ShellMap, tyreZ: readonly number[]): { tyres: number; other: number } {
  const nz = map.colMax.length;
  let tyres = 0;
  let other = 0;
  for (let i = 0; i < nz; i++) {
    const z = i * SHELL_DZ;
    const atTyre = tyreZ.some((t) => z >= t && z <= t + SHELL_DZ);
    for (let k = 0; k < SHELL_NA; k++) {
      if (!map.mask[i * SHELL_NA + k]) continue;
      if (atTyre) tyres++;
      else other++;
    }
  }
  const total = nz * SHELL_NA;
  return { tyres: (tyres / total) * 100, other: (other / total) * 100 };
}
