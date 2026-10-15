/**
 * Shared context of one rule-evaluation pass (one simulated minute).
 *
 * `stepLine` (engine.ts) builds the context after the readings, the reference
 * model, data quality and the history of the minute are in place; each
 * machine's evaluator (`eval/<machine>.ts`) reads it and records findings
 * with `H`. Evaluators never change the line state: persistence, hysteresis,
 * health and the frames stay in the engine.
 */
import type { Quality } from "../../kiln-sim/engine";
import type { Severity } from "../../kiln-sim/signals";
import type { Drivers, LineState } from "../engine";
import type { EquipmentStates } from "../equipment";
import type { ShellThermal } from "../../kiln-sim/shell-map";
import { PYRO_SIGNAL_BY_TAG } from "../signals";

export type Values = Record<string, number>;

/** Signal and target a finding's time-to-limit is projected on. */
export interface Lead {
  tag: string;
  target: number;
}

/** One rule matching this minute, before persistence / hysteresis. */
export interface Hit {
  severity: Severity;
  evidence: string;
  tags: string[];
  subs?: string[];
  lead?: Lead;
  stateRule?: boolean;
}

export interface EvalContext {
  /** Simulated minute. */
  t: number;
  /** Line state: `hist` / `modelHist` (this minute included), `manual` records, quality `flags`. Read only. */
  s: LineState;
  /** Readings (analog, calculated and the latest manual record value). */
  measured: Values;
  /** Reference model at the measured drivers. */
  model: Values;
  /** State signals. */
  states: Record<string, string>;
  /** Drivers the reference model was computed from (measured, witnesses substituted for out-voted meters). */
  drivers: Drivers;
  /** Running evidence per machine (D4 §8.2 comparable state): the machine's main unit runs. */
  running: Record<string, boolean>;
  /** Run state of every unit this minute (contract §1; scenario trips / stops plus the line interlocks). */
  equipment: EquipmentStates;
  /** Kiln feed stopped by a trip or interlock (line stop); feed and fuel are cut, the kiln turned down. */
  lineStop: boolean;
  /** The unit that drives the tag runs (its current / speed / vibration are ≈ 0 and bearings cool while it is stopped). */
  tagRunning: (tag: string) => boolean;
  /** Operating point changing inside the transient window. */
  transient: boolean;
  /** Commanded feed / coal set-points. */
  feedSp: number;
  coalSp: number;
  /** Feed set-point unchanged over the last 15 min. */
  feedSpSteady: boolean;
  /** Feed / coal meters following their model with normal scatter. */
  steadyFeed: boolean;
  steadyCoal: boolean;

  /** Kiln shell scanner map, its profile model and their difference, per 0.5 m point. */
  shellProfile: number[];
  shellModel: number[];
  shellRes: number[];
  /** Mean scanner residual between two kiln positions (m). */
  shellResMean: (fromM: number, toM: number) => number;
  /** Profile index of each tyre. */
  tyreIdx: number[];
  /** Scanner coverage below the D5 95 % target (eval/quality.ts): the shell maximum is suspect. */
  scannerSuspect: boolean;
  /**
   * Thermal-map processing of this minute (D5 Table 9.5, RULES-B): hottest cell and the model there, its circumferential
   * spread, area above alert (now and 1 h ago), cold / warm bands, outlet-end residual, latest handheld round.
   */
  thermal: ShellThermal;

  /** Residual (measured − model). */
  res: (tag: string) => number;
  /** Noise σ of a signal (1 when none). */
  sig: (tag: string) => number;
  /** Residual in σ. */
  z: (tag: string) => number;
  /** Mean residual over the last `n` samples. */
  meanRes: (tag: string, n?: number) => number;
  /** Residual standard deviation over the last `n` samples. */
  resStd: (tag: string, n?: number) => number;
  /** Measured / model. */
  ratio: (tag: string) => number;
  quality: (tag: string) => Quality;
  /** Every tag has Good quality. */
  good: (...tags: string[]) => boolean;
  /** The tag carries a data-quality flag. */
  flagged: (tag: string) => boolean;

  /** Findings of this minute per machine, by rule id. */
  hits: Record<string, Record<string, Hit>>;
  /** Record a finding. */
  H: (machine: string, id: string, h: Hit) => void;
}

/** Vibration + bearing temperature, two independent signals (D4 §8.2). */
export function bearingHit(c: EvalContext, machine: string, id: string, groups: Array<[string, string | null, string, string]>, warn: number, alarm: number): void {
  const { good, ratio, meanRes, measured } = c;
  let best: { vib: string; tmp: string | null; sub: string; label: string; rt: number; dt: number } | null = null;
  for (const [vib, tmp, sub, label] of groups) {
    if (!good(vib) || (tmp && !good(tmp))) continue;
    const rt = ratio(vib);
    const dt = tmp ? meanRes(tmp, 10) : 0;
    if (rt > 1.4 && (tmp ? dt > 1.5 : true) && (!best || rt > best.rt)) best = { vib, tmp, sub, label, rt, dt };
  }
  if (!best) return;
  c.H(machine, id, {
    severity: best.rt > 2.2 || measured[best.vib] >= warn ? "Critical" : "Advisory",
    evidence: `${best.label} vibration ×${best.rt.toFixed(2)} model${best.tmp ? ` with bearing +${best.dt.toFixed(1)} K` : ""}`,
    tags: best.tmp ? [best.vib, best.tmp] : [best.vib],
    subs: [best.sub],
    lead: { tag: best.vib, target: measured[best.vib] < warn ? warn : alarm },
  });
}

/** Run state of one piece of equipment (contract §1, filled by the engine); "run" until the engine exposes it. */
export type UnitRun = "run" | "stopped" | "tripped";

export function unitRun(c: EvalContext, id: string): UnitRun {
  const eq = (c as { equipment?: Partial<Record<string, UnitRun>> }).equipment;
  return eq?.[id] ?? "run";
}

/** Per-minute slope of a signal's recorded history (or of its reference model) over the last `n` samples, in units per hour. */
export function slopePerHour(c: EvalContext, tag: string, n: number, model = false): number | null {
  const h = (model ? c.s.modelHist : c.s.hist)[tag];
  if (!h || h.length < n) return null;
  const ys = h.slice(-n);
  const xm = (n - 1) / 2;
  const ym = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xm) * (ys[i] - ym);
    den += (i - xm) * (i - xm);
  }
  return den === 0 ? 0 : (num / den) * 60;
}

/** Sub-assemblies of a set of tags (for findings that name several instruments). */
export function subsOf(tags: string[]): string[] {
  return [...new Set(tags.map((t) => PYRO_SIGNAL_BY_TAG[t]?.sub).filter((x): x is string => Boolean(x)))];
}

/** A condition rule anywhere on the line (not a data-quality rule) is pending or active on this tag: its deviation has a known pattern. */
export function patterned(c: EvalContext, tag: string): boolean {
  return Object.values(c.s.machines).some((ms) => Object.entries(ms.rules).some(([id, mem]) => !/^(R-DQ|R-ANM|SV)-/.test(id) && mem.status !== "QUIET" && mem.tags.includes(tag)));
}
