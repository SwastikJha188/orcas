/**
 * Engine configuration from the database.
 *
 * The simulation engines stand in for the plant. What they simulate — which
 * machines, with which seed and demo profile — and how the monitoring layer
 * inside them reads their signals (names, units, decimals, limits, discrete
 * states, rule texts) is configuration, held in the database and served by
 * /api/simulations/config. `applyEngineConfig` writes it into the engines'
 * catalogues in place, before any engine steps, on the server (plant runner)
 * and in the browser (main thread and boot worker) alike.
 *
 * Machines of one engine type that share a catalogue (the kiln-seal fleet,
 * the VPC cells) take the configuration of the first simulated machine of
 * that type; the pyro line is configured per machine.
 *
 * Pure TypeScript, no React and no server imports.
 */
import { SIGNALS, type LimitRule } from "./kiln-sim/signals";
import { RULES } from "./kiln-sim/rules";
import { KILN_FLEET, setKilnFleet } from "./kiln-sim/fleet";
import { PYRO_SIGNALS } from "./pyro-sim/signals";
import { PYRO_RULES } from "./pyro-sim/rules";
import { PYRO_FLEET, setPyroFleet, setPyroLineSim } from "./pyro-sim/fleet";
import { setServiceParts, type ServicePart } from "./pyro-sim/service-life";
import type { LineSimSettings } from "./pyro-sim/engine";
import { VPC_SIGNALS } from "./vpc-sim/signals";
import { VPC_RULES } from "./vpc-sim/rules";
import { VPC_FLEET, setVpcFleet } from "./vpc-sim/defs";
import type { StoryProfile } from "./kiln-sim/engine";

export type EngineId = "kiln" | "pyro" | "vpc";

export interface EngineSignalConfig {
  tag: string;
  name: string;
  unit: string;
  decimals: number;
  instrument: string | null;
  normalBand: string | null;
  /** null: the measurement has no limit in the database. */
  limit: LimitRule | null;
  states: { normal: string; warn: string[]; alarm: string[] } | null;
}

export interface EngineRuleConfig {
  code: string;
  name: string;
  logic: string;
  cause: string;
  consequence: string;
  action: string;
  owner: string | null;
  unproven: string | null;
  hold: string | null;
}

export interface EngineConfig {
  fleet: Array<{ machineId: string; engine: EngineId; seed: number; profile: string }>;
  /** engine → machineId → catalogue. */
  machines: Record<string, { engine: EngineId; signals: EngineSignalConfig[]; rules: EngineRuleConfig[] }>;
  /** The live pyro line's simulation settings (Simulation page) and their version; null when none are stored. */
  lineSim?: { settings: Partial<LineSimSettings>; version: number } | null;
  /** Part service lives of the simulated machines (SW-ALL-01 service-due advisory). */
  serviceParts?: ServicePart[];
  /** When the configuration was read. */
  at: string;
}

interface MutableSignal {
  tag: string;
  name: string;
  unit: string;
  decimals: number;
  instrument: string;
  normalBand: string;
  limit?: LimitRule;
  states?: { normal: string; warn?: string[]; alarm?: string[] };
}

interface MutableRule {
  id: string;
  name: string;
  logic: string;
  cause: string;
  consequence: string;
  action: string;
  owner?: string;
  unproven?: string;
  hold?: string;
}

function applySignals(target: MutableSignal[], cfg: EngineSignalConfig[]): void {
  const byTag = new Map(cfg.map((s) => [s.tag, s]));
  for (const def of target) {
    const c = byTag.get(def.tag);
    if (!c) continue;
    def.name = c.name;
    def.unit = c.unit;
    def.decimals = c.decimals;
    if (c.instrument) def.instrument = c.instrument;
    if (c.normalBand) def.normalBand = c.normalBand;
    if (c.limit) def.limit = c.limit;
    else delete def.limit;
    if (c.states) def.states = c.states;
  }
}

function applyRules(target: MutableRule[], cfg: EngineRuleConfig[]): void {
  const byCode = new Map(cfg.map((r) => [r.code, r]));
  for (const rule of target) {
    const c = byCode.get(rule.id);
    if (!c) continue;
    rule.name = c.name;
    rule.logic = c.logic;
    rule.cause = c.cause;
    rule.consequence = c.consequence;
    rule.action = c.action;
    if (c.owner) rule.owner = c.owner;
    if (c.unproven) rule.unproven = c.unproven;
    if (c.hold) rule.hold = c.hold;
  }
}

let appliedAt: string | null = null;

/** The `at` of the configuration last applied in this JavaScript realm (null before the first). */
export const engineConfigAppliedAt = (): string | null => appliedAt;

/** Writes the database configuration into the engines' catalogues (idempotent). */
export function applyEngineConfig(cfg: EngineConfig): void {
  const of = (engine: EngineId) => cfg.fleet.filter((m) => m.engine === engine);
  setKilnFleet(of("kiln").map((m) => ({ machineId: m.machineId, seed: m.seed, profile: m.profile as StoryProfile })));
  setVpcFleet(of("vpc").map((m) => ({ machineId: m.machineId, seed: m.seed, profile: m.profile as "healthy" | "advisory" | "critical" })));
  const pyro = of("pyro");
  setPyroFleet(
    pyro.map((m) => ({ machineId: m.machineId, profile: m.profile as StoryProfile })),
    pyro[0]?.seed ?? null,
  );
  setPyroLineSim(cfg.lineSim ?? null);
  setServiceParts(cfg.serviceParts ?? []);

  const firstKiln = KILN_FLEET[0] && cfg.machines[KILN_FLEET[0].machineId];
  if (firstKiln) {
    applySignals(SIGNALS as unknown as MutableSignal[], firstKiln.signals);
    applyRules(RULES as unknown as MutableRule[], firstKiln.rules);
  }
  const firstVpc = VPC_FLEET[0] && cfg.machines[VPC_FLEET[0].machineId];
  if (firstVpc) {
    applySignals(VPC_SIGNALS as unknown as MutableSignal[], firstVpc.signals);
    applyRules(VPC_RULES as unknown as MutableRule[], firstVpc.rules);
  }
  for (const m of PYRO_FLEET) {
    const c = cfg.machines[m.machineId];
    if (!c) continue;
    applySignals(PYRO_SIGNALS.filter((s) => s.machine === m.machineId) as unknown as MutableSignal[], c.signals);
    applyRules(PYRO_RULES.filter((r) => r.machine === m.machineId) as unknown as MutableRule[], c.rules);
  }
  appliedAt = cfg.at;
}

/** Fetches the configuration from the app (browser main thread or worker). */
export async function fetchEngineConfig(origin: string): Promise<EngineConfig> {
  const res = await fetch(new URL("/api/simulations/config", origin), { cache: "no-store" });
  if (!res.ok) throw new Error(`engine configuration unavailable (${res.status})`);
  const body = (await res.json()) as { data?: EngineConfig };
  if (!body.data) throw new Error("engine configuration missing");
  return body.data;
}
