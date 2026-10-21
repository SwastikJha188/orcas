/**
 * Schultheiss VPC 066 — Live Demonstration Engine.
 *
 * Implements the Defined Demo Operating Case (§5.2: VPC 066 Power, 18 kt yellow
 * gold, 1.0 kg), Indicative Demo Alert Levels (§7.3), and Combined Fault-Finding
 * Rules (§7.4) across all 16 signals (P1..E2 + calculated DT1 = T3 − T2).
 *
 * Produces standard `SimFrame` objects stamped with `VPC_DEFS` so every ULTRON
 * page (Home, Overview, Structure, Trends, Sensors, Health, Rack, Simulation,
 * Diagnosis, Prognosis, Analysis, Maintenance) works seamlessly.
 */
import {
  HISTORY_LEN,
  formatClock,
  formatDuration,
  type HealthCell,
  type LiveSignal,
  type OperatorAction,
  type Quality,
  type RuleState,
  type RuleStatus,
  type ShiftValidityLog,
  type SimEvent,
  type SimFrame,
  type StoryPhase,
  type StoryProfile,
} from "../kiln-sim/engine";
import { evaluateLimit, stateSeverity, type Severity, type SignalDef } from "../kiln-sim/signals";
import { effectLevel } from "../kiln-sim/scenarios";
import { isEquipmentEffect } from "../pyro-sim/scenarios/common";
import { VPC_DEFS } from "./defs";
import { VPC_RULES } from "./rules";
import { VPC_SCENARIOS, vpcScenario } from "./scenarios";
import { VPC_MACHINE_ID, VPC_SIGNALS, VPC_SIGNAL_BY_TAG, VPC_SUBASSEMBLIES, VPC_SYSTEMS } from "./signals";

const EPOCH_MIN = 6 * 60;

interface RuleMem {
  persistence: number;
  clean: number;
  status: RuleStatus;
  since: number | null;
  severity: Severity;
}

export interface VpcSimState {
  t: number;
  seed: number;
  s: number;
  scenarioId: string;
  scenarioStart: number;
  autopilot: boolean;
  profile: StoryProfile;
  storyIdx: number;
  phase: StoryPhase;
  storyLabel: string;
  relief: Record<string, number>;
  acknowledged: Record<string, number>;
  repairedAt: number | null;
  heldValue: Record<string, number>;
  ruleMem: Record<string, RuleMem>;
  times: number[];
  history: Record<string, number[]>;
  modelHistory: Record<string, number[]>;
  qualityHistory: Record<string, number[]>;
  /** Discrete states reported at the last step (the gateway publishes them). */
  lastStates?: Record<string, string>;
  healthHist: { overall: number[] } & Record<string, number[]>;
  events: SimEvent[];
  frame: SimFrame | null;
}

export type FrozenVpc = Omit<VpcSimState, "frame"> & { frame: SimFrame | null };

const ADVISORY_ROTATION = [
  "vpc-flask-seal-leak",
  "vpc-cooling-restrict",
  "vpc-gas-valve-stick",
  "vpc-tc-drift-charge",
  "vpc-stopper-lag",
];

const CRITICAL_ROTATION = [
  "vpc-vac-pump-wear",
  "vpc-ind-power-derate",
  "vpc-gas-supply-low",
  "vpc-cooling-warm-inlet",
  "vpc-vib-mount-fault",
];

function nextRand(state: VpcSimState): number {
  let x = state.s | 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  state.s = x | 0;
  return ((x >>> 0) / 4294967296);
}

function randn(state: VpcSimState): number {
  const u1 = Math.max(1e-7, nextRand(state));
  const u2 = nextRand(state);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function pushRoll(arr: number[], v: number, max = HISTORY_LEN): void {
  arr.push(v);
  if (arr.length > max) arr.shift();
}

function slopePerHour(arr: number[]): number | null {
  const n = Math.min(15, arr.length);
  if (n < 5) return null;
  let sx = 0;
  let sy = 0;
  let sxy = 0;
  let sxx = 0;
  const start = arr.length - n;
  for (let i = 0; i < n; i++) {
    const y = arr[start + i];
    sx += i;
    sy += y;
    sxy += i * y;
    sxx += i * i;
  }
  const denom = n * sxx - sx * sx;
  if (Math.abs(denom) < 1e-9) return 0;
  const perMin = (n * sxy - sx * sy) / denom;
  return +(perMin * 60).toFixed(3);
}

export function createVpcSim(seed = 20261016): VpcSimState {
  const history: Record<string, number[]> = {};
  const modelHistory: Record<string, number[]> = {};
  const qualityHistory: Record<string, number[]> = {};
  for (const sig of VPC_SIGNALS) {
    history[sig.tag] = [];
    modelHistory[sig.tag] = [];
    qualityHistory[sig.tag] = [];
  }
  const healthHist: { overall: number[] } & Record<string, number[]> = { overall: [] };
  for (const sub of VPC_SUBASSEMBLIES) healthHist[sub.id] = [];
  for (const sys of VPC_SYSTEMS) healthHist[sys.id] = [];

  const ruleMem: Record<string, RuleMem> = {};
  for (const r of VPC_RULES) {
    ruleMem[r.id] = { persistence: 0, clean: 0, status: "QUIET", since: null, severity: "Normal" };
  }

  return {
    t: EPOCH_MIN,
    seed,
    s: seed,
    scenarioId: "healthy",
    scenarioStart: EPOCH_MIN,
    autopilot: true,
    profile: "advisory",
    storyIdx: 0,
    phase: "healthy",
    storyLabel: "VPC 066 Power — 18 kt yellow gold (1.0 kg) casting cycle nominal",
    relief: {},
    acknowledged: {},
    repairedAt: null,
    heldValue: {},
    ruleMem,
    times: [],
    history,
    modelHistory,
    qualityHistory,
    healthHist,
    events: [],
    frame: null,
  };
}

export function freezeVpc(state: VpcSimState): FrozenVpc {
  return structuredClone({ ...state, frame: null });
}

export function thawVpc(snap: FrozenVpc): VpcSimState {
  return structuredClone(snap);
}

function addEvent(state: VpcSimState, kind: SimEvent["kind"], severity: Severity, title: string, detail: string, action?: SimEvent["action"]): void {
  const { clock } = formatClock(state.t);
  state.events.unshift({ t: state.t, clock, kind, severity, title, detail, action });
  if (state.events.length > 60) state.events.length = 60;
}

export function setVpcScenario(state: VpcSimState, scenarioId: string): void {
  const sc = vpcScenario(scenarioId);
  state.scenarioId = sc.id;
  state.scenarioStart = state.t;
  state.relief = {};
  state.acknowledged = {};
  state.repairedAt = null;
  state.heldValue = {};
  addEvent(state, "scenario", "Normal", `Scenario: ${sc.name}`, sc.description);
}

export function setVpcAutopilot(state: VpcSimState, on: boolean): void {
  state.autopilot = on;
  addEvent(state, "action", "Normal", `Autopilot ${on ? "enabled" : "paused"}`, on ? `Autopilot managing VPC 066 (${state.profile} profile).` : "Manual scenario control active.");
}

export function setVpcProfile(state: VpcSimState, profile: StoryProfile): void {
  state.profile = profile;
  if (profile === "healthy") {
    setVpcScenario(state, "healthy");
  } else if (profile === "advisory") {
    const next = ADVISORY_ROTATION[state.storyIdx % ADVISORY_ROTATION.length];
    setVpcScenario(state, next);
  } else if (profile === "critical") {
    const next = CRITICAL_ROTATION[state.storyIdx % CRITICAL_ROTATION.length];
    setVpcScenario(state, next);
  }
}

export function performVpcAction(state: VpcSimState, ruleId: string, kind: OperatorAction, auto = false): void {
  const rule = VPC_DEFS.ruleById[ruleId];
  const rName = rule ? `${rule.id} (${rule.name})` : ruleId;
  if (kind === "acknowledge") {
    state.acknowledged[ruleId] = state.t;
    addEvent(state, "action", "Normal", `Acknowledged ${ruleId}`, `${rName} acknowledged by ${auto ? "cast crew" : "operator"}.`, { ruleId, kind, auto });
  } else if (kind === "mitigate") {
    state.relief[ruleId] = 0.55;
    addEvent(state, "action", "Alert", `Mitigation applied for ${ruleId}`, `Temporary process/utility adjustment applied for ${rName}; deviation reduced ~55 %.`, { ruleId, kind, auto });
  } else if (kind === "repair") {
    state.relief[ruleId] = 1;
    state.repairedAt = state.t;
    state.scenarioId = "healthy";
    state.scenarioStart = state.t;
    state.heldValue = {};
    addEvent(state, "action", "Normal", `Repaired & verified ${ruleId}`, `Corrective action completed for ${rName}; VPC 066 restored to nominal 18 kt gold parameters.`, { ruleId, kind, auto });
  }
}

function stepAutopilot(state: VpcSimState): void {
  if (!state.autopilot) return;
  const elapsed = state.t - state.scenarioStart;

  if (state.profile === "healthy") {
    if (state.scenarioId !== "healthy") setVpcScenario(state, "healthy");
    state.phase = "healthy";
    state.storyLabel = "VPC 066 Power — 18 kt yellow gold (1.0 kg) cycle nominal";
    return;
  }

  // If operator manually repaired the fault, recover briefly and then start the next fault in the profile rotation.
  if (state.scenarioId === "healthy") {
    if (elapsed >= 8) {
      const list = state.profile === "critical" ? CRITICAL_ROTATION : ADVISORY_ROTATION;
      const next = list[state.storyIdx % list.length];
      state.storyIdx += 1;
      setVpcScenario(state, next);
    } else {
      state.phase = state.repairedAt !== null ? "recovering" : "healthy";
      state.storyLabel =
        state.repairedAt !== null
          ? "Corrective maintenance completed · returning to nominal cycle"
          : "VPC 066 Power — 18 kt yellow gold (1.0 kg) cycle nominal";
    }
    return;
  }

  const sc = vpcScenario(state.scenarioId);
  const leadRule = sc.expected[0];
  const rm = leadRule ? state.ruleMem[leadRule] : undefined;

  if (elapsed < 6) {
    state.phase = "developing";
    state.storyLabel = `Developing: ${sc.name}`;
  } else if (leadRule && state.relief[leadRule]) {
    state.phase = "mitigated";
    state.storyLabel = `Mitigated ${leadRule} · temporary relief active, repair still required`;
  } else if (rm?.status === "ACTIVE") {
    state.phase = "detected";
    state.storyLabel = `Confirmed finding: ${leadRule} — ${sc.name} (awaiting operator action)`;
  } else {
    state.phase = "developing";
    state.storyLabel = `Monitoring: ${sc.name}`;
  }
}

interface EvalHit {
  ruleId: string;
  matched: boolean;
  severity: Severity;
  evidence: string;
  tags: string[];
}

function evaluateVpcRules(
  vals: Record<string, number>,
  states: Record<string, string>,
  qualities: Record<string, Quality>,
): EvalHit[] {
  const hits: EvalHit[] = [];
  const good = (t: string) => qualities[t] === "Good";

  // R-DQ-01: Any online sensor Invalid or Suspect (flat-line / range)
  const badTags = Object.entries(qualities)
    .filter(([t, q]) => VPC_SIGNAL_BY_TAG[t]?.origin === "online" && q !== "Good")
    .map(([t]) => t);
  hits.push({
    ruleId: "R-DQ-01",
    matched: badTags.length > 0,
    severity: badTags.some((t) => qualities[t] === "Invalid") ? "Critical" : "Alert",
    evidence: badTags.length
      ? `Flagged channel(s): ${badTags.map((t) => `${t} (${qualities[t]})`).join(", ")}`
      : "All 15 wired VPC 066 channels within calibrated range and variability band",
    tags: badTags.length ? badTags : ["P2"],
  });

  // R-DQ-02: Cross-channel plausibility (T3 < T2 - 0.5 while E1 > 4 kW, or P4 > P2 + 65 mbar)
  const dtMismatch = vals.T3 < vals.T2 - 0.5 && vals.E1 > 4.0;
  const vacMismatch = vals.P4 > vals.P2 + 65;
  hits.push({
    ruleId: "R-DQ-02",
    matched: dtMismatch || vacMismatch,
    severity: "Alert",
    evidence: dtMismatch
      ? `T3 (${vals.T3.toFixed(1)} °C) < T2 (${vals.T2.toFixed(1)} °C) while E1 = ${vals.E1.toFixed(2)} kW`
      : vacMismatch
        ? `Pump suction P4 (${Math.round(vals.P4)} mbar) > flask P2 (${Math.round(vals.P2)} mbar) by > 65 mbar`
        : `T3 − T2 = ${vals.DT1.toFixed(1)} °C; P2 vs P4 Δ = ${Math.round(vals.P2 - vals.P4)} mbar`,
    tags: dtMismatch ? ["T2", "T3", "DT1", "E1"] : ["P2", "P4"],
  });

  // R-VPC-01: P2 pump-down slow + V1/T4 rising
  const p2Slow = good("P2") && vals.P2 >= 390;
  const pumpRising = (good("V1") && vals.V1 >= 2.70) || (good("T4") && vals.T4 >= 67.0);
  const r01Crit = vals.P2 >= 450 && (vals.V1 >= 3.60 || vals.T4 >= 77.0);
  hits.push({
    ruleId: "R-VPC-01",
    matched: p2Slow && pumpRising,
    severity: r01Crit ? "Critical" : "Alert",
    evidence: `P2 = ${Math.round(vals.P2)} mbar (target 300 mbar) · V1 = ${vals.V1.toFixed(2)} mm/s · T4 = ${vals.T4.toFixed(1)} °C · P4 = ${Math.round(vals.P4)} mbar · E2 = ${vals.E2.toFixed(2)} A`,
    tags: ["P2", "V1", "T4", "P4", "E2"],
  });

  // R-VPC-02: P2 pump-down slow + V1/T4 normal
  const pumpNormal = (!good("V1") || vals.V1 < 2.70) && (!good("T4") || vals.T4 < 67.0);
  hits.push({
    ruleId: "R-VPC-02",
    matched: p2Slow && pumpNormal && states.S1 === "OK",
    severity: vals.P2 >= 450 ? "Critical" : "Alert",
    evidence: `P2 = ${Math.round(vals.P2)} mbar (≥ 390 mbar limit) while V1 = ${vals.V1.toFixed(2)} mm/s & T4 = ${vals.T4.toFixed(1)} °C normal`,
    tags: ["P2", "V1", "T4", "S2"],
  });

  // R-VPC-03: P1 pressure rise slow + P3 low
  const p1Low = good("P1") && (vals.P1 <= 1.05 || vals.P1 >= 1.35);
  const p3Low = good("P3") && vals.P3 <= 4.50;
  hits.push({
    ruleId: "R-VPC-03",
    matched: p1Low && p3Low,
    severity: vals.P3 <= 4.00 || vals.P1 <= 0.90 ? "Critical" : "Alert",
    evidence: `P1 = ${vals.P1.toFixed(2)} bar (target 1.20 bar) · P3 regulated supply = ${vals.P3.toFixed(2)} bar (baseline 5.00 bar)`,
    tags: ["P1", "P3"],
  });

  // R-VPC-04: P1 pressure deviation + P3 stable
  const p3Stable = !good("P3") || vals.P3 > 4.50;
  hits.push({
    ruleId: "R-VPC-04",
    matched: p1Low && p3Stable && states.S1 === "OK",
    severity: vals.P1 <= 0.90 || vals.P1 >= 1.50 ? "Critical" : "Alert",
    evidence: `P1 = ${vals.P1.toFixed(2)} bar (deviation ${(vals.P1 - 1.20).toFixed(2)} bar) with P3 stable at ${vals.P3.toFixed(2)} bar`,
    tags: ["P1", "P3", "S2"],
  });

  // R-VPC-05: T1 heat-up slow + E1 low
  const t1Dev = good("T1") && Math.abs(vals.T1 - 1020) >= 15;
  const e1Low = good("E1") && vals.E1 <= 7.56;
  hits.push({
    ruleId: "R-VPC-05",
    matched: t1Dev && e1Low,
    severity: vals.E1 <= 6.72 || Math.abs(vals.T1 - 1020) >= 30 ? "Critical" : "Alert",
    evidence: `T1 = ${Math.round(vals.T1)} °C (target 1,020 °C) · E1 = ${vals.E1.toFixed(2)} kW (${Math.round((vals.E1 / 8.4) * 100)} % of matched 8.4 kW basis)`,
    tags: ["T1", "E1"],
  });

  // R-VPC-06: T1 heat-up slow / error + E1 normal
  const e1Normal = !good("E1") || vals.E1 > 7.56;
  hits.push({
    ruleId: "R-VPC-06",
    matched: t1Dev && e1Normal,
    severity: Math.abs(vals.T1 - 1020) >= 30 ? "Critical" : "Alert",
    evidence: `T1 = ${Math.round(vals.T1)} °C (${vals.T1 >= 1020 ? "+" : ""}${Math.round(vals.T1 - 1020)} °C vs 1,020 °C) while E1 normal at ${vals.E1.toFixed(2)} kW`,
    tags: ["T1", "E1"],
  });

  // R-VPC-07: F1 low + T3-T2 rises
  const f1Low = good("F1") && vals.F1 <= 11.9;
  const dtHigh = vals.DT1 >= 8.0;
  hits.push({
    ruleId: "R-VPC-07",
    matched: f1Low && dtHigh,
    severity: vals.F1 <= 10.5 || vals.DT1 >= 11.0 ? "Critical" : "Alert",
    evidence: `F1 = ${vals.F1.toFixed(1)} L/min (baseline 14.0 L/min) · DT1 = ${vals.DT1.toFixed(1)} °C (T2 ${vals.T2.toFixed(1)} °C → T3 ${vals.T3.toFixed(1)} °C)`,
    tags: ["F1", "T2", "T3", "DT1"],
  });

  // R-VPC-08: T2 high + F1 normal
  const t2High = good("T2") && vals.T2 > 26.0;
  const f1Normal = !good("F1") || vals.F1 > 11.9;
  hits.push({
    ruleId: "R-VPC-08",
    matched: t2High && f1Normal,
    severity: vals.T2 > 29.0 || vals.T3 >= 33.0 ? "Critical" : "Alert",
    evidence: `T2 inlet = ${vals.T2.toFixed(1)} °C (warn > 26 °C) · T3 outlet = ${vals.T3.toFixed(1)} °C · F1 normal at ${vals.F1.toFixed(1)} L/min`,
    tags: ["T2", "T3", "F1", "DT1"],
  });

  // R-VPC-09: S1 lag + P1/P2 profile altered
  const s1Bad = states.S1 !== "OK";
  const profileAltered = vals.P1 <= 1.08 || vals.P2 >= 370;
  hits.push({
    ruleId: "R-VPC-09",
    matched: s1Bad && profileAltered,
    severity: states.S1 === "FAULT" ? "Critical" : "Alert",
    evidence: `S1 stopper = ${states.S1} · P1 = ${vals.P1.toFixed(2)} bar · P2 = ${Math.round(vals.P2)} mbar`,
    tags: ["S1", "P1", "P2"],
  });

  // R-VPC-10: V2 outside mode-specific envelope
  const v2Bad = good("V2") && (vals.V2 <= 2.00 || vals.V2 >= 4.80);
  hits.push({
    ruleId: "R-VPC-10",
    matched: v2Bad,
    severity: vals.V2 <= 1.20 || vals.V2 >= 6.00 ? "Critical" : "Alert",
    evidence: `V2 flask vibration = ${vals.V2.toFixed(2)} mm/s RMS (normal envelope 2.40–4.20 mm/s)`,
    tags: ["V2", "P2"],
  });

  // R-VPC-11: S2 closure / interlock fault
  const s2Bad = states.S2 !== "LOCKED";
  hits.push({
    ruleId: "R-VPC-11",
    matched: s2Bad,
    severity: states.S2 === "OPEN_FAULT" ? "Critical" : "Alert",
    evidence: `S2 chamber closure permissive = ${states.S2}`,
    tags: ["S2", "P1", "P2"],
  });

  return hits;
}

export function stepVpcSim(state: VpcSimState, buildFrame = true): SimFrame {
  state.t += 1;
  stepAutopilot(state);

  const sc = vpcScenario(state.scenarioId);
  const elapsed = Math.max(0, state.t - state.scenarioStart);

  // Compute relief factor from any mitigated rule; advisory autopilot stays within the Alert threshold band.
  const activeRelief = Math.max(0, ...Object.values(state.relief));
  const profileScale = state.autopilot && state.profile === "advisory" ? 0.68 : 1;
  const scale = (1 - activeRelief) * profileScale;

  const vals: Record<string, number> = {};
  const models: Record<string, number> = {};
  const states: Record<string, string> = { S1: "OK", S2: "LOCKED" };
  const qualities: Record<string, Quality> = {};
  const qualityNotes: Record<string, string | null> = {};

  // Subtle cycle harmonic so signals breathe naturally across casting cycles
  const cyc = Math.sin((state.t * 2 * Math.PI) / 18);
  const cyc2 = Math.cos((state.t * 2 * Math.PI) / 24);

  for (const def of VPC_SIGNALS) {
    qualities[def.tag] = "Good";
    qualityNotes[def.tag] = null;
    if (def.type === "state") {
      models[def.tag] = 1;
      continue;
    }
    if (def.tag === "DT1") continue; // computed after T2 & T3

    let model = def.base;
    if (def.tag === "T1") model += cyc * 1.4;
    else if (def.tag === "P2") model += cyc2 * 3.0;
    else if (def.tag === "P1") model += cyc * 0.012;
    else if (def.tag === "E1") model += cyc * 0.08;
    else if (def.tag === "F1") model += cyc2 * 0.1;
    else if (def.tag === "T2") model += cyc * 0.12;
    else if (def.tag === "T3") model += cyc * 0.18;
    else if (def.tag === "V1") model += cyc2 * 0.04;
    else if (def.tag === "T4") model += cyc * 0.25;
    else if (def.tag === "V2") model += cyc2 * 0.06;
    else if (def.tag === "P4") model += cyc2 * 2.5;
    else if (def.tag === "E2") model += cyc * 0.04;

    models[def.tag] = model;
    vals[def.tag] = model + randn(state) * def.sigma;
  }

  // Apply scenario effects
  for (const ef of sc.effects) {
    if (isEquipmentEffect(ef)) continue;
    if (ef.target.kind !== "signal") continue;
    const tag = ef.target.tag;
    const lvl = effectLevel(ef as unknown as Parameters<typeof effectLevel>[0], elapsed);
    if (lvl <= 0) continue;
    const def = VPC_SIGNAL_BY_TAG[tag];
    if (!def) continue;

    if (def.type === "state" && ef.state) {
      if (scale > 0.5) states[tag] = ef.state;
      continue;
    }
    if (ef.hold) {
      if (state.heldValue[tag] === undefined) {
        state.heldValue[tag] = vals[tag] ?? def.base;
      }
      vals[tag] = state.heldValue[tag];
      if (elapsed - ef.onsetMin >= (def.flatlineN ?? 8)) {
        qualities[tag] = "Suspect";
        qualityNotes[tag] = `Variability band: flat-line over ${def.flatlineN ?? 8} samples (R-DQ-01)`;
      }
      continue;
    }
    if (ef.delta !== undefined) {
      vals[tag] = (vals[tag] ?? def.base) + ef.delta * lvl * (ef.sensor ? 1 : scale);
    }
  }

  // Clamp analog signals to physical bounds and compute DT1 = T3 - T2
  for (const def of VPC_SIGNALS) {
    if (def.type === "analog" && def.tag !== "DT1" && def.range) {
      vals[def.tag] = clamp(vals[def.tag], def.range[0], def.range[1]);
    }
  }
  models.DT1 = models.T3 - models.T2;
  vals.DT1 = +(vals.T3 - vals.T2).toFixed(2);
  qualities.DT1 = qualities.T2 !== "Good" || qualities.T3 !== "Good" ? "Suspect" : "Good";
  qualityNotes.DT1 = qualities.DT1 !== "Good" ? "Input RTD (T2 or T3) flagged" : null;

  // Push histories
  state.lastStates = { ...states };
  pushRoll(state.times, state.t);
  for (const def of VPC_SIGNALS) {
    const v = def.type === "state" ? (states[def.tag] === def.states?.normal ? 1 : 0) : vals[def.tag];
    pushRoll(state.history[def.tag], +v.toFixed(def.decimals));
    pushRoll(state.modelHistory[def.tag], +(models[def.tag] ?? v).toFixed(def.decimals));
    pushRoll(state.qualityHistory[def.tag], qualities[def.tag] === "Good" ? 0 : qualities[def.tag] === "Suspect" ? 1 : 2);
  }

  // Evaluate rules with persistence & hysteresis
  const hits = evaluateVpcRules(vals, states, qualities);
  const hitById = Object.fromEntries(hits.map((h) => [h.ruleId, h]));

  const evaluatedRules: RuleState[] = VPC_RULES.map((r) => {
    const hit = hitById[r.id];
    const mem = state.ruleMem[r.id];
    const threshold = hit?.severity === "Critical" ? 2 : 3;

    if (hit?.matched) {
      mem.persistence += 1;
      mem.clean = 0;
      mem.severity = hit.severity;
      if (mem.persistence >= threshold) {
        if (mem.status !== "ACTIVE") {
          mem.status = "ACTIVE";
          mem.since = state.t;
          addEvent(state, "rule", hit.severity, `${r.id}: ${r.name}`, `${hit.evidence} — ${r.action}`);
        }
      } else if (mem.status !== "ACTIVE") {
        mem.status = "PENDING";
      }
    } else {
      mem.persistence = 0;
      if (mem.status === "ACTIVE") {
        mem.clean += 1;
        if (mem.clean >= 4) {
          mem.status = "QUIET";
          mem.since = null;
          mem.severity = "Normal";
          addEvent(state, "rule", "Normal", `${r.id} cleared`, `${r.name} returned within normal limits.`);
        }
      } else {
        mem.status = "QUIET";
        mem.severity = "Normal";
      }
    }

    const status = mem.status;
    const severity: Severity = status === "ACTIVE" ? mem.severity : status === "PENDING" ? hit?.severity ?? "Alert" : "Normal";
    const priority = severity === "Critical" ? "P1" : severity === "Alert" ? (r.category === "Data quality" ? "P3" : "P2") : "P4";

    return {
      id: r.id,
      name: r.name,
      category: r.category,
      system: r.system,
      subs: r.subs,
      logic: r.logic,
      severity,
      status,
      evidence: hit?.evidence ?? "Within nominal demo operating envelope",
      tags: hit?.tags ?? r.inputs,
      persistence: mem.persistence,
      threshold,
      clean: mem.clean,
      confidence: status === "ACTIVE" ? (severity === "Critical" ? 94 : 88) : status === "PENDING" ? 64 : 98,
      timeToLimit: status === "ACTIVE" ? (severity === "Critical" ? "At limit" : "~25 min") : "—",
      priority,
      cause: r.cause,
      consequence: r.consequence,
      action: r.action,
      plainTitle: r.plainTitle,
      plainWhat: r.plainWhat,
      plainTodo: r.plainTodo,
      since: mem.since,
      owner: r.owner,
      unproven: r.unproven,
    };
  });

  // Compute subassembly, system, and overall health
  const subs: Record<string, HealthCell> = {};
  for (const sub of VPC_SUBASSEMBLIES) {
    const activeOnSub = evaluatedRules.filter((r) => r.status === "ACTIVE" && r.category !== "Data quality" && r.subs.includes(sub.id));
    let penalty = 0;
    let worst: Severity = "Normal";
    for (const r of activeOnSub) {
      if (r.severity === "Critical") {
        penalty += 28;
        worst = "Critical";
      } else if (r.severity === "Alert") {
        penalty += 14;
        if (worst === "Normal") worst = "Alert";
      }
    }
    // Also factor in direct signal limit deviations on this subassembly
    for (const sig of VPC_SIGNALS.filter((s) => s.sub === sub.id)) {
      const asDef = sig as unknown as SignalDef;
      const limSev =
        sig.type === "state"
          ? stateSeverity(asDef, states[sig.tag])
          : evaluateLimit(asDef, vals[sig.tag], { model: models[sig.tag] }).severity;
      if (limSev === "Critical") {
        penalty = Math.max(penalty, 22);
        worst = "Critical";
      } else if (limSev === "Alert") {
        penalty = Math.max(penalty, 10);
        if (worst === "Normal") worst = "Alert";
      }
    }
    const h = clamp(98 - penalty, 42, 99);
    subs[sub.id] = { id: sub.id, name: sub.name, health: h, status: worst };
    pushRoll(state.healthHist[sub.id], h);
  }

  const systems: Record<string, HealthCell> = {};
  for (const sys of VPC_SYSTEMS) {
    const children = VPC_SUBASSEMBLIES.filter((s) => s.system === sys.id).map((s) => subs[s.id]);
    const h = children.length ? Math.round(children.reduce((n, c) => n + c.health, 0) / children.length) : 98;
    const st: Severity = children.some((c) => c.status === "Critical")
      ? "Critical"
      : children.some((c) => c.status === "Alert")
        ? "Alert"
        : "Normal";
    systems[sys.id] = { id: sys.id, name: sys.name, health: h, status: st };
    pushRoll(state.healthHist[sys.id], h);
  }

  const subScores = Object.values(subs).map((c) => c.health);
  const minSub = Math.min(...subScores);
  const avgSub = subScores.reduce((a, b) => a + b, 0) / subScores.length;
  const overall = Math.round(0.55 * minSub + 0.45 * avgSub);
  pushRoll(state.healthHist.overall, overall);

  const hasCrit = Object.values(subs).some((c) => c.status === "Critical");
  const hasAdv = Object.values(subs).some((c) => c.status === "Alert");
  const condition: SimFrame["condition"] = hasCrit ? "Critical" : hasAdv ? "Alert" : "Healthy";

  if (!buildFrame && state.frame) {
    state.frame.overall = overall;
    state.frame.condition = condition;
    return state.frame;
  }

  // Build LiveSignal map
  const liveSignals: Record<string, LiveSignal> = {};
  for (const def of VPC_SIGNALS) {
    const asDef = def as unknown as SignalDef;
    if (def.type === "state") {
      const stVal = states[def.tag] ?? def.states?.normal ?? "OK";
      const limSev = stateSeverity(asDef, stVal);
      liveSignals[def.tag] = {
        tag: def.tag,
        value: stVal === (def.states?.normal ?? "OK") ? 1 : 0,
        state: stVal,
        display: stVal,
        model: 1,
        residual: 0,
        z: 0,
        limitSeverity: limSev,
        limitNote: limSev !== "Normal" ? `State ${stVal} (expected ${def.states?.normal})` : null,
        status: limSev,
        quality: qualities[def.tag],
        qualityNote: qualityNotes[def.tag],
        slopePerHour: 0,
        timeToLimit: limSev !== "Normal" ? "At limit" : null,
        sourceTs: state.t,
        receivedTs: state.t,
      };
      continue;
    }

    const v = +vals[def.tag].toFixed(def.decimals);
    const m = +models[def.tag].toFixed(def.decimals);
    const res = +(v - m).toFixed(def.decimals);
    const z = def.sigma > 0 ? +(res / def.sigma).toFixed(2) : 0;
    const limEval = evaluateLimit(asDef, v, { model: m });
    const limSev = limEval.severity;
    const ruleSev = evaluatedRules
      .filter((r) => r.status === "ACTIVE" && r.category !== "Data quality" && r.tags.includes(def.tag))
      .reduce<Severity>((w, r) => (r.severity === "Critical" ? "Critical" : r.severity === "Alert" && w === "Normal" ? "Alert" : w), "Normal");
    const status: Severity =
      limSev === "Critical" || ruleSev === "Critical"
        ? "Critical"
        : limSev === "Alert" || ruleSev === "Alert"
          ? "Alert"
          : "Normal";
    const sl = slopePerHour(state.history[def.tag]);

    liveSignals[def.tag] = {
      tag: def.tag,
      value: v,
      state: null,
      display: v.toFixed(def.decimals),
      model: m,
      residual: res,
      z,
      limitSeverity: limSev,
      limitNote: limEval.why || null,
      status,
      quality: qualities[def.tag],
      qualityNote: qualityNotes[def.tag],
      slopePerHour: sl,
      timeToLimit: status === "Critical" ? "At limit" : status === "Alert" ? "~25 min" : null,
      sourceTs: qualities[def.tag] === "Suspect" && state.heldValue[def.tag] !== undefined ? state.scenarioStart + 2 : state.t,
      receivedTs: state.t,
    };
  }

  const validCount = Object.values(qualities).filter((q) => q === "Good").length;
  const suspectCount = Object.values(qualities).filter((q) => q === "Suspect").length;
  const invalidCount = Object.values(qualities).filter((q) => q === "Invalid").length;
  const activeRules = evaluatedRules.filter((r) => r.status === "ACTIVE");
  const pendingRules = evaluatedRules.filter((r) => r.status === "PENDING");

  const { clock, day } = formatClock(state.t);
  const currentShift: ShiftValidityLog = {
    start: EPOCH_MIN,
    label: "Shift 1 · 18 kt Yellow Gold Batch (1.0 kg)",
    minutes: Math.max(1, state.t - EPOCH_MIN),
    tags: Object.fromEntries(
      Object.entries(qualities)
        .filter(([, q]) => q !== "Good")
        .map(([t, q]) => [
          t,
          {
            suspect: q === "Suspect" ? Math.max(1, elapsed) : 0,
            invalid: q === "Invalid" ? Math.max(1, elapsed) : 0,
            flagOnly: 0,
            first: state.scenarioStart,
            last: state.t,
            note: qualityNotes[t] ?? "Flagged by R-DQ-01",
          },
        ]),
    ),
  };

  // Stage label based on cycle minute (8 process stages from Section 4)
  const stageIdx = Math.floor((state.t % 16) / 2);
  const stageNames = [
    "Stage 1 · Ready (utilities & chamber permissive S2)",
    "Stage 2 · Prepare upper zone (evacuate/backfill P1)",
    "Stage 3 · Melt (18 kt yellow gold to 1,020 °C, T1 & E1)",
    "Stage 4 · Load flask (position heated flask & close S2)",
    "Stage 5 · Evacuate flask (pump-down P2 to 300 mbar)",
    "Stage 6 · Cast (release stopper S1 under 1.2 bar P1)",
    "Stage 7 · Hold / vibrate (solidification hold P1/P2 & V2)",
    "Stage 8 · Finish (equalise chambers & unload)",
  ];

  const frame: SimFrame = {
    t: state.t,
    clock,
    day,
    scenarioId: state.scenarioId,
    scenarioMinute: elapsed,
    drivers: {
      feed: 1.0, // 1.0 kg alloy charge
      feedSp: 1.0,
      fuel: liveSignals.E1?.value ?? 8.4,
      fuelSp: 8.4,
      speed: 1.0,
      draft: liveSignals.P2?.value ?? 300,
      ambientEst: liveSignals.T2?.value ?? 22,
    },
    witnesses: {
      feedTorque: liveSignals.E1?.value ?? 8.4,
      feedO2: liveSignals.P2?.value ?? 300,
      fuelBurning: liveSignals.T1?.value ?? 1020,
      fuelInlet: liveSignals.T3?.value ?? 27,
    },
    signals: liveSignals,
    rules: evaluatedRules,
    subs,
    systems,
    overall,
    condition,
    pipeline: {
      valid: validCount,
      held: suspectCount + invalidCount,
      invalid: invalidCount,
      suspect: suspectCount,
      beyond3s: Object.values(liveSignals).filter((s) => Math.abs(s.z ?? 0) >= 3).length,
      evaluated: evaluatedRules.length,
      matching: activeRules.length + pendingRules.length,
      confirmed: activeRules.length,
      pending: pendingRules.length,
      p1: activeRules.filter((r) => r.priority === "P1").length,
      p2: activeRules.filter((r) => r.priority === "P2").length,
      p3: activeRules.filter((r) => r.priority === "P3").length,
    },
    shellProfile: [],
    shellModel: [],
    coldBandResidual: 0,
    times: state.times.slice(),
    history: Object.fromEntries(Object.entries(state.history).map(([k, v]) => [k, v.slice()])),
    modelHistory: Object.fromEntries(Object.entries(state.modelHistory).map(([k, v]) => [k, v.slice()])),
    qualityHistory: Object.fromEntries(Object.entries(state.qualityHistory).map(([k, v]) => [k, v.slice()])),
    healthHistory: Object.fromEntries(Object.entries(state.healthHist).map(([k, v]) => [k, v.slice()])) as SimFrame["healthHistory"],
    events: state.events.slice(),
    phase: state.phase,
    storyLabel: state.storyLabel,
    autopilot: state.autopilot,
    profile: state.profile,
    background: null,
    defs: VPC_DEFS,
    records: [],
    operatingState: {
      running: true,
      transient: false,
      note: `${stageNames[stageIdx]} · VPC 066 Power · 18 kt yellow gold (1.0 kg)`,
    },
    shiftValidity: { current: currentShift, previous: null },
  };

  state.frame = frame;
  return frame;
}

export { VPC_MACHINE_ID };
