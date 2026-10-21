/**
 * ULTRON Copilot intent engine.
 *
 * A deterministic intent router plus templated answer generator over the LIVE
 * frame of the active plant's primary machine (from the database). The
 * machine is described by `frame.defs`
 * (signals, sub-assemblies, systems, rules); a question that names another
 * machine of the plant is answered from that machine's frame. No network, no
 * LLM: every number in an answer is read from the running plant (signals,
 * reference model residuals, rule states, forecasts). Alarms and findings come
 * from the database: the server evaluation's findings and the machine's event
 * record (`AskContext.record`), never from the browser engine's rule states.
 * Pure TypeScript, no React, so it can be unit-tested headlessly.
 */
import { ACTION } from "@/components/ui/status";
import { isRelativeLimit, limitPair, type SignalDef } from "@shared/lib/kiln-sim/signals";
import { formatDuration, type LiveSignal, type RuleState, type SimFrame } from "@shared/lib/kiln-sim/engine";
import { formatRulHours } from "@/components/assets/prognosis/prognosis-derive";
import { buildLiveInsights } from "@/lib/kiln-sim/live-insights";
import type { PlantDefs } from "@shared/lib/plant-defs";
import { isConditionRule } from "@shared/lib/plant-defs";
import type { FindingDto, MachineEventDto } from "@shared/types/monitoring";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type Sev = "Normal" | "Alert" | "Critical";

export type IntentId = "status" | "why" | "predict" | "recommend" | "rule" | "compare" | "sensor-fault" | "health" | "help" | "fallback";

export interface EvidenceChip {
  tag: string;
  name: string;
  value: string;
  unit: string;
  z: number | null;
  status: Sev;
}

export interface Spark {
  tag: string;
  label: string;
  unit: string;
  values: number[];
  model: number[];
  warn: number | null;
  alarm: number | null;
}

export type ActionKind = "mitigate" | "repair" | "workorder" | "diagnosis";
export interface ActionSpec {
  kind: ActionKind;
  label: string;
  ruleId: string | null;
  /** Machine the action applies to, when the answer came from another machine than the primary. */
  machineId?: string;
}

/** What the conversation is about; `machineId` names the machine when the plant has several. */
export type Focus = { kind: "tag" | "sub" | "rule"; id: string; machineId?: string } | null;

export interface CopilotAnswer {
  intent: IntentId;
  /** Reasoning steps shown while "thinking". */
  steps: string[];
  /** Paragraphs separated by blank lines; lines starting with "• " are bullets; **bold** supported. */
  text: string;
  evidence: EvidenceChip[];
  spark: Spark | null;
  confidence: number | null;
  actions: ActionSpec[];
  focus: Focus;
  /** Machine the answer was computed from (set when the context names machines). */
  machineId?: string;
}

/** A machine's monitoring record from the database: open findings and recent events (newest first). */
export interface MachineRecord {
  findings: FindingDto[];
  events: MachineEventDto[] | null;
}

/** A live machine of the active plant. */
export interface PlantMachine {
  id: string;
  name: string;
  frame: SimFrame;
  /** Its record from the database; null while it loads or when it failed. */
  record?: MachineRecord | null;
}

export interface AskContext {
  /** Frame of the machine the Copilot speaks for (the plant's primary machine). */
  frame: SimFrame;
  focus: Focus;
  /** Id of the machine `frame` belongs to; labels the answers. */
  machineId?: string;
  /** Every live machine of the active plant, the primary included. A question naming another machine is answered from its frame. */
  plant?: PlantMachine[];
  /** The machine's findings and events from the database; null while they load. Alarms are read only from here. */
  record?: MachineRecord | null;
}

/* ------------------------------------------------------------------ */
/* Frame helpers                                                       */
/* ------------------------------------------------------------------ */

const sevRank: Record<Sev, number> = { Normal: 0, Alert: 1, Critical: 2 };
const subName = (f: SimFrame, id: string) => f.defs.subassemblies.find((s) => s.id === id)?.name ?? id;
/** Machine label used in answers. */
const labelOf = (ctx: AskContext) => ctx.machineId ?? "this machine";
/** Sub-assemblies that describe process context, not machine condition. */
const isProcessSub = (f: SimFrame, id: string) => {
  const sa = f.defs.subassemblies.find((s) => s.id === id);
  return !!sa && f.defs.processSystems.includes(sa.system);
};

export function activeRules(f: SimFrame): RuleState[] {
  return f.rules
    .filter((r) => r.status === "ACTIVE")
    .sort((a, b) => sevRank[b.severity] - sevRank[a.severity] || b.confidence - a.confidence);
}
export function pendingRules(f: SimFrame): RuleState[] {
  return f.rules.filter((r) => r.status === "PENDING").sort((a, b) => sevRank[b.severity] - sevRank[a.severity]);
}
const isDq = (r: RuleState) => !isConditionRule(r);

const defOf = (f: SimFrame, tag: string) => f.defs.signalByTag[tag];
const isAnalog = (f: SimFrame, tag: string) => f.defs.signalByTag[tag]?.type === "analog";
const unitOf = (f: SimFrame, tag: string) => {
  const u = defOf(f, tag)?.unit ?? "";
  return u === "state" ? "" : u;
};
const val = (f: SimFrame, tag: string) => {
  const s = f.signals[tag];
  if (!s) return "—";
  const u = unitOf(f, tag);
  return `${s.display}${u ? ` ${u}` : ""}`;
};
const nm = (f: SimFrame, tag: string) => defOf(f, tag)?.name ?? tag;
const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
/** Lower-cases a name's first letter unless it starts an acronym ("ID fan" stays). */
const lcName = (s: string) => (/^[A-Z][a-z]/.test(s) ? lc(s) : s);
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
/** A sentence used inside another one: first letter lower-cased, closing full stop dropped. */
const clause = (s: string) => lc(s.trim()).replace(/[.!?]+$/, "");
/** Plain headline of a rule (docs/plain-language.md); the engineering name when none is written. */
const ruleTitle = (r: { name: string; plainTitle?: string }) => r.plainTitle || r.name;
/** What to do about a rule, in plain words when written. */
const ruleTodo = (r: { action: string; plainTodo?: string }) => r.plainTodo || r.action;
/** A rule's live state in words. */
const stateWords = (status: string) => (status === "ACTIVE" ? "active" : status === "PENDING" ? "still being confirmed" : "quiet");
/** How far a reading sits from its expected value, in words. */
const zWords = (z: number | null) => {
  if (z === null) return "no expected value to compare with";
  const a = Math.abs(z);
  const dir = z >= 0 ? "above" : "below";
  return a < 2 ? "close to its expected value" : a < 3 ? `somewhat ${dir} its expected value` : `far ${dir} its expected value`;
};
/** Live set-point for set-point-judged tags (`defs.setpoints`). */
const setpointOf = (f: SimFrame, tag: string) => {
  const key = f.defs.setpoints[tag];
  return key ? f.drivers[key] * (f.defs.setpointShare?.[tag] ?? 1) : undefined;
};
/**
 * limitPair only reads `limit` (and the set-point), which kiln and pyro definitions share.
 * Relative limits (pyro D5 Table 9.2) resolve at the live reference model.
 */
const limitsOf = (f: SimFrame, tag: string) => {
  const def = defOf(f, tag);
  return def ? limitPair(def as SignalDef, setpointOf(f, tag), f.signals[tag]?.model) : null;
};

function chip(f: SimFrame, tag: string): EvidenceChip | null {
  const s = f.signals[tag];
  if (!s || !defOf(f, tag)) return null;
  return { tag, name: nm(f, tag), value: s.display, unit: unitOf(f, tag), z: s.z, status: s.status };
}
export function chips(f: SimFrame, tags: string[], max = 5): EvidenceChip[] {
  const out: EvidenceChip[] = [];
  for (const t of tags) {
    if (out.length >= max) break;
    if (out.some((c) => c.tag === t)) continue;
    const c = chip(f, t);
    if (c) out.push(c);
  }
  return out;
}

export function spark(f: SimFrame, tag: string): Spark | null {
  const def = defOf(f, tag);
  const h = f.history[tag];
  if (!def || def.type !== "analog" || !h || h.length < 8) return null;
  const n = 90;
  const lim = limitsOf(f, tag);
  const mh = f.modelHistory[tag] ?? [];
  const values = h.slice(-n).map((v) => +v.toFixed(def.decimals + 1));
  return {
    tag,
    label: def.name,
    unit: def.unit,
    values,
    model: mh.slice(-n).map((v) => +v.toFixed(def.decimals + 1)),
    warn: def.limit && def.limit.kind !== "setpoint" && lim ? lim.warn : null,
    alarm: def.limit && def.limit.kind !== "setpoint" && lim ? lim.alarm : null,
  };
}

/** Most abnormal analog signal right now (limit status first, then σ). */
function mostAbnormal(f: SimFrame, pool?: string[]): LiveSignal | null {
  const list = (pool ?? Object.keys(f.signals)).map((t) => f.signals[t]).filter((s): s is LiveSignal => !!s && isAnalog(f, s.tag) && s.quality === "Good");
  list.sort((a, b) => sevRank[b.status] * 100 + Math.abs(b.z ?? 0) - (sevRank[a.status] * 100 + Math.abs(a.z ?? 0)));
  return list[0] ?? null;
}

function rulesFor(f: SimFrame, tag: string | null, sub: string | null): RuleState[] {
  return f.rules
    .filter((r) => r.status !== "QUIET" && ((tag && r.tags.includes(tag)) || (sub && (r.subs as string[]).includes(sub))))
    .sort((a, b) => (a.status === b.status ? 0 : a.status === "ACTIVE" ? -1 : 1) || sevRank[b.severity] - sevRank[a.severity]);
}

function actionsFor(rule: RuleState | null, opts: { diagnosis?: boolean } = {}): ActionSpec[] {
  const out: ActionSpec[] = [];
  if (rule && rule.status !== "QUIET") {
    const dq = isDq(rule);
    if (!dq) out.push({ kind: "mitigate", label: "Apply short-term fix", ruleId: rule.id });
    out.push({ kind: "repair", label: dq ? "Schedule calibration" : "Schedule repair", ruleId: rule.id });
    out.push({ kind: "workorder", label: ACTION.workOrder, ruleId: rule.id });
  }
  if (rule || opts.diagnosis) out.push({ kind: "diagnosis", label: "Open Diagnosis", ruleId: rule?.id ?? null });
  return out;
}

/* ------------------------------------------------------------------ */
/* Database record (findings, events)                                  */
/* ------------------------------------------------------------------ */

/** Open findings, most severe first, then newest. */
function openFindings(rec: MachineRecord): FindingDto[] {
  return rec.findings
    .filter((x) => x.clearedAt === null)
    .sort((a, b) => sevRank[b.severity] - sevRank[a.severity] || Date.parse(b.openedAt) - Date.parse(a.openedAt));
}
const findingId = (x: FindingDto) => x.rule?.code ?? x.measurement?.tag ?? null;
const findingLabel = (x: FindingDto) => {
  const id = findingId(x);
  if (x.rule?.plainTitle) return x.rule.plainTitle;
  const name = x.rule?.name ?? x.measurement?.name ?? x.typeName;
  return id ? `${id} ${name}` : name;
};
const sentence = (t: string) => (/[.!?]$/.test(t.trim()) ? t.trim() : `${t.trim()}.`);
const causeWords = (x: FindingDto) => x.causeStatus.replace("_", " ");
/** Live tags that carry a finding's evidence: the fired rule's inputs, or its measurement. */
function findingTags(f: SimFrame, x: FindingDto): string[] {
  const code = x.rule?.code;
  const r = code ? f.rules.find((y) => y.id === code) : undefined;
  if (r?.tags.length) return r.tags;
  if (x.measurement) return [x.measurement.tag];
  return code ? (f.defs.ruleById[code]?.inputs ?? []) : [];
}
const ruleOfFinding = (f: SimFrame, x: FindingDto | undefined) => (x?.rule ? (f.rules.find((r) => r.id === x.rule!.code) ?? null) : null);

/* ------------------------------------------------------------------ */
/* Entity resolution (fuzzy)                                           */
/* ------------------------------------------------------------------ */

const STOP = new Set(["the", "a", "an", "of", "is", "are", "in", "on", "at", "to", "for", "and", "or", "my", "sensor", "temperature", "temp", "what", "why", "how", "will", "when", "high", "low", "abnormal"]);

/**
 * Plain-English synonyms for sub-assembly / system names, matched against the
 * names in the machine's definitions (never against ids). A synonym only
 * applies when exactly one sub-assembly (or system) of the machine claims it.
 */
const NAME_SYNONYMS: Array<[RegExp, string[]]> = [
  [/\bmotor\b/i, ["motor", "drive motor", "winding"]],
  [/\bgearbox\b/i, ["gear box", "reducer", "gear unit"]],
  [/\bpinion\b|\bgirth\b/i, ["pinion", "girth", "gear mesh"]],
  [/\blubricat/i, ["lube", "oil system", "oil circuit", "oil cooler", "oil"]],
  [/\bauxiliary\b/i, ["aux drive", "auxiliary", "barring", "inching"]],
  [/\bthrust\b/i, ["hydraulic thrust", "axial", "axial position", "lvdt"]],
  [/\bshell\b|\brefractory\b/i, ["hot spot", "hotspot", "scanner", "coating", "ring build"]],
  [/\binlet seal\b/i, ["false air", "inlet"]],
  [/\boutlet seal\b/i, ["outlet", "hood seal", "seal overlap", "overlap"]],
  [/\bfeed\b/i, ["throughput"]],
  [/^drive\b/i, ["drivetrain", "drive system", "drive"]],
  [/\bsupports?\b/i, ["supports", "rollers", "roller"]],
];

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

/** Synonyms a name earns: the table above plus "station 1" → "station one", "pier 1", "support 1". */
function nameSynonyms(name: string): string[] {
  const out = NAME_SYNONYMS.filter(([re]) => re.test(name)).flatMap(([, syn]) => syn);
  const station = name.match(/\bstation\s+(\d)\b/i);
  if (station) {
    const n = station[1];
    out.push(`station ${NUMBER_WORDS[+n]}`, `pier ${n}`, `support ${n}`);
  }
  return out;
}

/** Synonyms per entity id, keeping only those exactly one entity of the list claims. */
function uniqueSynonyms(items: Array<{ id: string; name: string }>): Record<string, string[]> {
  const claimed = new Map<string, number>();
  const per = items.map((it) => [it.id, [...new Set(nameSynonyms(it.name))]] as const);
  for (const [, syn] of per) for (const a of syn) claimed.set(a, (claimed.get(a) ?? 0) + 1);
  return Object.fromEntries(per.map(([id, syn]) => [id, syn.filter((a) => claimed.get(a) === 1)]));
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9.\- ]+/g, " ").replace(/\s+/g, " ").trim();
const words = (s: string) => norm(s).split(" ").filter((w) => w && !STOP.has(w));

/** Levenshtein distance with early exit (short strings only). */
function lev(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
    cur = [];
  }
  return prev[b.length];
}

export interface Entities {
  rules: string[];
  tags: string[];
  subs: string[];
  systems: string[];
}

/** Keyword → signal-name patterns; the tags come from the machine's definitions (names as stored in the database). */
const NAME_KEYWORDS: Array<[RegExp, RegExp]> = [
  [/\bvibration|\bvib\b/, /vibration/i],
  [/\bwinding\b/, /winding/i],
  [/\btorque\b|\bmotor current\b|\bcurrent\b|\bmotor power\b/, /current|torque|power/i],
  [/\boil temp/, /oil temperature/i],
  [/\boil pressure\b/, /oil.*pressure/i],
  [/\bhood pressure\b/, /hood pressure/i],
  [/\bseal overlap\b|\boverlap\b/, /overlap/i],
  [/\blvdt\b|\baxial\b/, /axial/i],
  [/\bo2\b|\boxygen\b/, /O₂/],
  [/\bco\b|\bcarbon monoxide\b/, /\bCO\b/],
  [/\bshell temp|\bhot ?spot\b/, /shell.*temperature/i],
  [/\bfalse air\b/, /false.air/i],
  [/\bdraft\b/, /draft/i],
  [/\bspeed\b|\brpm\b|\bstroke\b/, /speed|stroke rate/i],
  [/\blevel\b/, /level/i],
  [/\bflow\b/, /flow/i],
  [/\bpressures?\b/, /pressure/i],
  [/\btemperatures?\b|\btemps?\b/, /temperature/i],
];

/** Aliases generated from a definition name: the name, its parts and their singular forms. */
function nameAliases(name: string): string[] {
  const out = new Set<string>();
  const add = (raw: string) => {
    const a = norm(raw);
    if (a.length < 3) return;
    out.add(a);
    // "Cyclones C1–C3" → "cyclones"; "Station 1 & tyre 1" keeps "station 1".
    const bare = a.split(" ").filter((w) => !/^c?\d+$/.test(w)).join(" ");
    if (bare.length >= 3) out.add(bare);
    for (const x of [a, bare]) if (/[a-z]{3}s$/.test(x)) out.add(x.slice(0, -1));
  };
  add(name);
  for (const part of name.split(/\s*(?:&|,|\/|\(|\)|\band\b)\s*/)) if (part.trim()) add(part);
  return [...out];
}

interface Vocab {
  /** Tag area code ("KLN", "PHC"): "vib 01" resolves to VIB-<code>-01. */
  code: string;
  /** Tag type prefixes of this machine ("VIB", "TMP", …). */
  prefixes: Set<string>;
  sub: Record<string, string[]>;
  system: Record<string, string[]>;
  keywords: Array<[RegExp, string[]]>;
}

const VOCAB = new WeakMap<PlantDefs, Vocab>();

function vocabOf(defs: PlantDefs): Vocab {
  const hit = VOCAB.get(defs);
  if (hit) return hit;
  const codes = new Map<string, number>();
  const prefixes = new Set<string>();
  for (const d of defs.signals) {
    const [p, c] = d.tag.split("-");
    if (p) prefixes.add(p);
    if (c) codes.set(c, (codes.get(c) ?? 0) + 1);
  }
  const code = [...codes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  const merge = (synonyms: string[] | undefined, generated: string[]) => [...new Set([...generated, ...(synonyms ?? [])])];
  const subSyn = uniqueSynonyms(defs.subassemblies);
  const sysSyn = uniqueSynonyms(defs.systems);
  const sub = Object.fromEntries(defs.subassemblies.map((sa) => [sa.id, merge(subSyn[sa.id], nameAliases(sa.name))]));
  const system = Object.fromEntries(defs.systems.map((sy) => [sy.id, merge(sysSyn[sy.id], nameAliases(sy.name))]));
  const keywords: Array<[RegExp, string[]]> = NAME_KEYWORDS.map(([q, name]) => [q, defs.signals.filter((d) => name.test(d.name)).map((d) => d.tag)] as [RegExp, string[]]).filter(([, tags]) => tags.length > 0);
  const v: Vocab = { code, prefixes, sub, system, keywords };
  VOCAB.set(defs, v);
  return v;
}

/** Entities plus how strongly the question points at this machine (used to pick a machine of the plant). */
function resolveScored(q: string, f: SimFrame, self?: { id?: string; name?: string }): { ent: Entities; score: number } {
  const defs = f.defs;
  const v = vocabOf(defs);
  const n = norm(q);
  const up = q.toUpperCase();
  const ent: Entities = { rules: [], tags: [], subs: [], systems: [] };
  let score = 0;
  // Rule ids, tolerant of "r-drv-08", "r drv 08", "rdrv08", "sw-kln-04".
  for (const m of up.matchAll(/\b(R|SW)[-\s]?([A-Z]{2,3})[-\s]?(?:([A-Z]{3})[-\s]?)?(\d{1,2})\b/g)) {
    const id = m[3] ? `${m[1]}-${m[2]}-${m[3]}-${m[4].padStart(2, "0")}` : `${m[1]}-${m[2]}-${m[4].padStart(2, "0")}`;
    if (defs.ruleById[id] && !ent.rules.includes(id)) ent.rules.push(id);
  }
  // Tag ids of this machine's area: "VIB-KLN-01", "vib 01", "tmp-21", "tmp kln 21".
  if (v.code) {
    const re = new RegExp(`\\b([A-Z]{3})[-\\s]?(?:${v.code}[-\\s]?)?(\\d{1,2})\\b`, "g");
    for (const m of up.matchAll(re)) {
      const tag = `${m[1]}-${v.code}-${m[2].padStart(2, "0")}`;
      if (defs.signalByTag[tag] && !ent.tags.includes(tag)) ent.tags.push(tag);
    }
  }
  // Fully written tags of any area ("TMP-PHC-03").
  for (const m of up.matchAll(/\b([A-Z]{3})[-\s]?([A-Z]{3})[-\s]?(\d{1,2})\b/g)) {
    for (const tag of [`${m[1]}-${m[2]}-${m[3].padStart(2, "0")}`, `${m[2]}-${v.code}-${m[3].padStart(2, "0")}`]) {
      if (defs.signalByTag[tag] && !ent.tags.includes(tag)) ent.tags.push(tag);
    }
  }
  score += 50 * Math.min(2, ent.rules.length + ent.tags.length);
  // Sub-assemblies / systems by alias (longest alias wins; token boundaries).
  const subHits: Array<[string, number]> = [];
  for (const [id, al] of Object.entries(v.sub)) {
    for (const a of al) {
      const i = n.indexOf(a.trim());
      if (i >= 0 && (i === 0 || n[i - 1] === " ")) subHits.push([id, a.length]);
    }
  }
  subHits.sort((a, b) => b[1] - a[1]);
  for (const [id] of subHits) if (!ent.subs.includes(id)) ent.subs.push(id);
  let sysBest = 0;
  for (const [id, al] of Object.entries(v.system)) {
    const esc = (a: string) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const hits = al.filter((a) => new RegExp(`(^| )${esc(a)}( |$)`).test(n));
    if (hits.length) {
      ent.systems.push(id);
      sysBest = Math.max(sysBest, ...hits.map((a) => a.length));
    }
  }
  score += Math.max(subHits[0]?.[1] ?? 0, sysBest);
  // Keyword → tag shortcuts when no explicit tag was given.
  if (!ent.tags.length) {
    for (const [re, tags] of v.keywords) {
      if (re.test(n)) {
        let scoped = ent.subs.length ? tags.filter((t) => defs.signalByTag[t]?.sub === ent.subs[0]) : tags;
        const rank = (t: string) => {
          const s = f.signals[t];
          return s ? sevRank[s.status] * 100 + Math.abs(s.z ?? 0) : -1;
        };
        scoped = [...scoped].sort((a, b) => rank(b) - rank(a));
        for (const t of scoped) if (!ent.tags.includes(t)) ent.tags.push(t);
        if (scoped.length) score += 4;
        break;
      }
    }
  }
  // Sensor-name fuzzy match (token overlap with typo tolerance), only when still nothing found.
  if (!ent.tags.length) {
    // Words that only name the machine itself ("kiln", "kln", "01") say nothing about the sensor.
    const selfWords = new Set([v.code, self?.id ?? "", self?.name ?? ""].flatMap((x) => norm(x).split(/[\s-]+/)).filter(Boolean));
    const qw = words(n).filter((w) => !selfWords.has(w));
    if (qw.length) {
      let best: { tag: string; score: number } | null = null;
      for (const d of defs.signals) {
        const dw = words(d.name);
        let sc = 0;
        for (const w of qw) {
          if (dw.includes(w)) sc += 2;
          else if (w.length > 4 && dw.some((x) => x.length > 4 && lev(w, x, 1) <= 1)) sc += 1.5;
        }
        const need = Math.min(2, qw.length);
        if (sc >= need * 2 - 0.5 && (!best || sc > best.score)) best = { tag: d.tag, score: sc };
      }
      if (best) {
        ent.tags.push(best.tag);
        score += 3;
      }
    }
  }
  return { ent, score };
}

export function resolveEntities(q: string, f: SimFrame, self?: { id?: string; name?: string }): Entities {
  return resolveScored(q, f, self).ent;
}

/* ------------------------------------------------------------------ */
/* Intent routing                                                      */
/* ------------------------------------------------------------------ */

const has = (n: string, re: RegExp) => re.test(n);

export function classify(q: string, ent: Entities): IntentId {
  const n = norm(q);
  if (!n) return "help";
  if (has(n, /^(hi|hello|hey|help|what can you do|what do you do|capabilities|commands)\b/) || has(n, /\bwhat can (you|i) (do|ask)\b/)) return "help";
  if (has(n, /\b(sensor|instrument|transducer|probe|analy[sz]er|rtd|data quality|calibrat\w*|drift\w*|flat ?line|faulty|broken|trust|reliable|spurious|glitch)\b/) && has(n, /\b(fault\w*|faulty|error|bad|wrong|broken|drift\w*|trust|reliable|real|genuine|quality|calibrat\w*|spurious|glitch|failed|fail|flat ?line|stuck)\b/)) return "sensor-fault";
  if (has(n, /\b(real|genuine|believe|trustworthy)\b/) && !has(n, /\bwhy\b/)) return "sensor-fault";
  if (ent.rules.length && !has(n, /\b(why .*fire|why did|why is|fire[ds]?|triggered?|raised|predict|when)\b/)) return "rule";
  if (has(n, /\b(compare|correlat\w*|versus|vs\.?|relationship|related|relate|between|track together|move together)\b/) && (ent.tags.length + ent.subs.length >= 2 || ent.tags.length >= 1)) return "compare";
  if (ent.rules.length) return has(n, /\bwhy\b/) ? "rule" : "rule";
  if (has(n, /\b(predict\w*|forecast\w*|will|going to|how long|when (will|do|does|is|would|might|could)|time to|remaining|rul\b|useful life|trip|reach|hit|exceed|cross|next (hour|day|week|shift)|trend\w*|expect\w*|future|ahead)\b/)) return "predict";
  if (has(n, /\b(should i|should we|what (do|can|could|must) (i|we)|recommend\w*|advice|advise|fix|mitigate|action\w*|next step\w*|to do|remedy|repair|maintenance|prioriti[sz]e|first|handle|deal with|resolve)\b/)) return "recommend";
  if (has(n, /\b(why|cause\w*|reason\w*|explain|root|behind|source|responsible|going on|wrong|happening|abnormal|elevated|rising|high|low|spike\w*|deviat\w*|drop\w*|issue|problem|alarm\w*|alert\w*|unusual|strange|odd)\b/) && (ent.tags.length || ent.subs.length || ent.systems.length || has(n, /\b(why|cause|wrong|going on|happening|alarm|alert|issue|problem)\b/))) return "why";
  if (has(n, /\b(health|condition|how is|how are|how's|state of|doing|status of|performing)\b/) && (ent.subs.length || ent.systems.length || ent.tags.length)) return "health";
  if (has(n, /\b(status|summary|summari[sz]e|overview|plant|brief\w*|report|all ?clear|everything|overall|any(thing)? (wrong|issue|problem|alarm|new)|early warning\w*|going on|situation|how is|how are|how's|health|condition|shift)\b/)) return "status";
  if (ent.tags.length || ent.subs.length || ent.systems.length) return ent.tags.length ? "why" : "health";
  return "fallback";
}

/* ------------------------------------------------------------------ */
/* Answer generators                                                   */
/* ------------------------------------------------------------------ */

const subsOfSystem = (f: SimFrame, sys: string) => f.defs.subassemblies.filter((s) => s.system === sys).map((s) => s.id);

function ttlText(r: RuleState): string | null {
  const t = r.timeToLimit;
  if (!t || t === "stable" || t === "—") return null;
  return t;
}

function overallLine(f: SimFrame): string {
  return `Overall health score: **${f.overall}%** (${f.condition}).`;
}

/** Status from the database record: open findings and the latest alarm event. */
function recordStatus(ctx: AskContext, rec: MachineRecord | null): CopilotAnswer {
  const f = ctx.frame;
  const total = Object.keys(f.signals).length;
  const p = f.pipeline;
  const steps = ["Reading open problems", "Reading the machine's event log", `Reading ${total} live readings`];
  const lines: string[] = [];
  const evTags: string[] = [];
  if (!rec) {
    lines.push(`The list of problems for ${labelOf(ctx)} has not loaded yet, so I cannot say which alarms are open. ${overallLine(f)}`);
    return { intent: "status", steps, text: lines.join("\n\n"), evidence: [], spark: null, confidence: null, actions: [{ kind: "diagnosis", label: "Open Diagnosis", ruleId: null }], focus: null };
  }
  const open = openFindings(rec);
  if (!open.length) {
    lines.push(`${labelOf(ctx)} has **no open problems**. ${overallLine(f)}`);
    lines.push(`• ${p.valid} of ${total} readings are valid; ${p.beyond3s} are far from their expected value.`);
    const top = mostAbnormal(f);
    if (top) {
      lines.push(`Furthest from its expected value: ${nm(f, top.tag)} at ${val(f, top.tag)}, still within its normal variation.`);
      evTags.push(top.tag);
    }
  } else {
    const crit = open.filter((x) => x.severity === "Critical").length;
    const unacked = open.filter((x) => !x.acknowledgement).length;
    lines.push(
      `${labelOf(ctx)} needs attention: **${plural(open.length, "open problem")}** (${crit} critical, ${open.length - crit} less urgent, ${unacked} not yet seen by anyone). ${overallLine(f)}`,
    );
    for (const x of open.slice(0, 3)) {
      lines.push(`• **${findingLabel(x)}** · ${x.severity}. ${sentence(x.rule?.plainWhat || x.summary)}${x.acknowledgement ? "" : " Not yet seen."}`);
      evTags.push(...findingTags(f, x));
    }
    if (open[0].rule?.action) lines.push(`What to do first: ${clause(open[0].rule.plainTodo || open[0].rule.action)}.`);
  }
  const lastAlarm = rec.events?.find((e) => e.category === "alarm") ?? null;
  if (lastAlarm) lines.push(`Most recent alarm: ${lastAlarm.title}${lastAlarm.description ? ` · ${sentence(lastAlarm.description)}` : "."}`);
  const leadRule = ruleOfFinding(f, open[0]);
  const ev = chips(f, evTags, 4);
  return {
    intent: "status",
    steps,
    text: lines.join("\n\n"),
    evidence: ev,
    spark: ev[0] ? spark(f, ev[0].tag) : null,
    confidence: null,
    actions: leadRule ? actionsFor(leadRule, { diagnosis: true }) : [{ kind: "diagnosis", label: "Open Diagnosis", ruleId: open[0]?.rule?.code ?? null }],
    focus: open[0]?.rule ? { kind: "rule", id: open[0].rule.code } : open[0]?.measurement ? { kind: "tag", id: open[0].measurement.tag } : null,
  };
}

function answerStatus(ctx: AskContext): CopilotAnswer {
  if (ctx.record !== undefined) return recordStatus(ctx, ctx.record);
  const f = ctx.frame;
  const act = activeRules(f);
  const pend = pendingRules(f);
  const total = Object.keys(f.signals).length;
  const p = f.pipeline;
  const worstSubs = Object.values(f.subs).filter((s) => !isProcessSub(f, s.id)).sort((a, b) => a.health - b.health).slice(0, 3);
  const steps = [`Reading ${total} live readings`, "Comparing each with its expected value", `Running ${f.rules.length} automatic checks`, "Ranking the problems found"];
  const lines: string[] = [];
  const evTags: string[] = [];
  if (!act.length) {
    lines.push(`${labelOf(ctx)} is running **normally**. ${overallLine(f)} No automatic check has found a problem.`);
    lines.push(`• ${p.valid} of ${total} readings are valid; ${p.beyond3s} are far from their expected value; ${plural(p.pending, "check")} still confirming a possible problem.`);
    lines.push(`• Lowest part health scores: ${worstSubs.map((s) => `${subName(f, s.id)} ${s.health}%`).join(", ")}.`);
    if (pend.length) {
      lines.push(`Early warning: **${ruleTitle(pend[0])}** may be starting (seen in ${pend[0].persistence} of ${pend[0].threshold} checks so far). ${pend[0].evidence}.`);
      evTags.push(...pend[0].tags);
    } else {
      const top = mostAbnormal(f);
      if (top) {
        lines.push(`Furthest from its expected value: ${nm(f, top.tag)} at ${val(f, top.tag)}, still within its normal variation.`);
        evTags.push(top.tag);
      }
    }
  } else {
    const lead = act[0];
    lines.push(`${labelOf(ctx)} needs attention. ${overallLine(f)} **${plural(act.length, "active problem")}**${pend.length ? `, ${pend.length} more still being confirmed` : ""}.`);
    for (const r of act.slice(0, 3)) {
      lines.push(`• **${ruleTitle(r)}** · ${r.severity} · ${r.confidence}% sure. ${sentence(r.plainWhat || r.evidence)}${ttlText(r) ? ` Reaches its limit in ${ttlText(r)}.` : ""}`);
      evTags.push(...r.tags);
    }
    lines.push(`Most affected parts: ${worstSubs.map((s) => `${subName(f, s.id)} ${s.health}%`).join(", ")}. What to do first: ${clause(ruleTodo(lead))}.`);
  }
  const lead = act[0] ?? null;
  const ev = chips(f, evTags, 4);
  return {
    intent: "status",
    steps,
    text: lines.join("\n\n"),
    evidence: ev,
    spark: ev[0] ? spark(f, ev[0].tag) : null,
    confidence: lead ? lead.confidence : 96,
    actions: lead ? actionsFor(lead) : [{ kind: "diagnosis", label: "Open Diagnosis", ruleId: null }],
    focus: lead ? { kind: "rule", id: lead.id } : null,
  };
}

function resolveTarget(ctx: AskContext, ent: Entities): { tag: string | null; sub: string | null; rule: RuleState | null; fromFocus: boolean } {
  const f = ctx.frame;
  let tag = ent.tags[0] ?? null;
  let sub = ent.subs[0] ?? null;
  let fromFocus = false;
  if (!tag && !sub && !ent.systems.length && ctx.focus) {
    fromFocus = true;
    if (ctx.focus.kind === "tag") tag = ctx.focus.id;
    else if (ctx.focus.kind === "sub") sub = ctx.focus.id;
    else {
      const r = f.rules.find((x) => x.id === ctx.focus!.id);
      if (r) return { tag: r.tags[0] ?? null, sub: r.subs[0] ?? null, rule: r, fromFocus };
    }
  }
  if (!tag && !sub && ent.systems.length) {
    // System → its worst sub-assembly.
    const subs = subsOfSystem(f, ent.systems[0]).map((id) => f.subs[id]).filter(Boolean).sort((a, b) => a.health - b.health);
    sub = subs[0]?.id ?? null;
  }
  const rs = rulesFor(f, tag, sub);
  let rule: RuleState | null = rs[0] ?? null;
  if (!tag && !sub) rule = activeRules(f)[0] ?? pendingRules(f)[0] ?? null;
  if (!tag && !sub && rule) {
    tag = rule.tags[0] ?? null;
    sub = rule.subs[0] ?? null;
  }
  if (!tag && sub) {
    const pool = f.defs.signals.filter((d) => d.sub === sub).map((d) => d.tag);
    tag = mostAbnormal(f, pool)?.tag ?? pool[0] ?? null;
  }
  return { tag, sub, rule, fromFocus };
}

function nothingWrong(f: SimFrame): CopilotAnswer {
  const top = mostAbnormal(f);
  const pend = pendingRules(f);
  const p = f.pipeline;
  const lines = [`Nothing is wrong right now. ${overallLine(f)} No automatic check has found a problem, and ${p.beyond3s} of ${Object.keys(f.signals).length} readings are far from their expected value.`];
  if (top) lines.push(`The reading furthest from its expected value is ${nm(f, top.tag)} at ${val(f, top.tag)}, which is within its normal variation.`);
  if (pend.length) lines.push(`Worth watching: ${ruleTitle(pend[0])} may be starting (seen in ${pend[0].persistence} of ${pend[0].threshold} checks so far).`);
  return {
    intent: "why",
    steps: [`Reading ${f.defs.signals.length} live readings`, "Comparing each with its expected value", `Going through ${f.defs.rules.length} automatic checks`],
    text: lines.join("\n\n"),
    evidence: chips(f, top ? [top.tag] : [], 3),
    spark: top ? spark(f, top.tag) : null,
    confidence: 96,
    actions: [{ kind: "diagnosis", label: "Open Diagnosis", ruleId: null }],
    focus: top ? { kind: "tag", id: top.tag } : null,
  };
}

function answerWhy(ctx: AskContext, ent: Entities): CopilotAnswer {
  const f = ctx.frame;
  const t = resolveTarget(ctx, ent);
  if (!t.tag && !t.sub) return nothingWrong(f);
  const s = t.tag ? f.signals[t.tag] : null;
  const def = t.tag ? (defOf(f, t.tag) ?? null) : null;
  const rs = rulesFor(f, t.tag, t.sub);
  const act = rs.filter((r) => r.status === "ACTIVE");
  const abnormal = !!s && (s.status !== "Normal" || Math.abs(s.z ?? 0) >= 3);
  const noRuleAtAll = !act.length && !rs.length;
  if (noRuleAtAll && !abnormal && !ent.tags.length && !ent.subs.length && !ent.systems.length) return nothingWrong(f);
  const steps = [`Reading ${def ? def.name : `${f.defs.signals.length} live readings`} and the readings near it`, "Comparing with expected values", `Ranking ${Math.max(3, rs.length + 1)} possible causes`, "Cross-checking the evidence"];
  const lines: string[] = [];
  if (s && def) {
    const dir = (s.residual ?? 0) >= 0 ? "above" : "below";
    lines.push(
      `**${def.name}** reads **${val(f, def.tag)}**` +
        (s.model !== null && s.z !== null ? `, ${Math.abs(s.residual ?? 0).toFixed(def.decimals)} ${def.unit} ${dir} its expected value of ${s.model.toFixed(def.decimals)} ${def.unit}.` : ".") +
        (s.status !== "Normal" ? ` It is past its ${s.status === "Critical" ? "alarm" : "warning"} limit.` : ""),
    );
  }
  if (!abnormal && !act.length) {
    lines.push(`This is within its normal variation: nothing points to a problem${t.sub ? ` on ${subName(f, t.sub)}` : ""}. ${t.sub ? `Health score of this part: ${f.subs[t.sub]?.health ?? f.overall}%` : `Overall health score: ${f.overall}%`}.`);
    if (rs.length) lines.push(`Worth watching: ${ruleTitle(rs[0])} is ${stateWords(rs[0].status)} (seen in ${rs[0].persistence} of ${rs[0].threshold} checks).`);
  } else {
    const lead = act[0] ?? rs[0];
    if (lead) {
      lines.push(`Possible causes, most likely first:`);
      lines.push(
        rs
          .slice(0, 3)
          .map((r) => `• **${ruleTitle(r)}** (${stateWords(r.status)}, ${r.confidence}% sure): ${r.plainWhat ? sentence(r.plainWhat) : `${clause(r.cause)}.`}`)
          .join("\n"),
      );
      lines.push(`Most likely: **${ruleTitle(lead)}**. ${lead.evidence}. If it continues: ${clause(lead.consequence)}.${lead.plainTodo ? ` What to do: ${clause(lead.plainTodo)}.` : ""}`);
    } else {
      lines.push(`No automatic check matches this yet, so the cause is **not known yet**. Nearby readings: ${neighbourText(f, t.tag!)}. Keep watching; ULTRON will raise a problem if the pattern continues.`);
    }
    const infl = influencers(f, t.tag);
    if (infl) lines.push(infl);
  }
  const lead = act[0] ?? rs[0] ?? null;
  const tags = [...(t.tag ? [t.tag] : []), ...(lead ? lead.tags : [])];
  return {
    intent: "why",
    steps,
    text: lines.join("\n\n"),
    evidence: chips(f, tags, 5),
    spark: t.tag ? spark(f, t.tag) : null,
    confidence: lead ? lead.confidence : abnormal ? 55 : 92,
    actions: actionsFor(lead, { diagnosis: true }),
    focus: lead ? { kind: "rule", id: lead.id } : t.tag ? { kind: "tag", id: t.tag } : null,
  };
}

function neighbourText(f: SimFrame, tag: string): string {
  const def = defOf(f, tag);
  const pool = def ? f.defs.signals.filter((d) => d.sub === def.sub && d.tag !== tag && d.type === "analog" && f.signals[d.tag]).map((d) => d.tag) : [];
  if (!pool.length) return "none on the same part";
  return pool.slice(0, 3).map((t) => `${nm(f, t)} (${zWords(f.signals[t].z)})`).join(", ");
}

function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 6) return 0;
  const x = a.slice(-n);
  const y = b.slice(-n);
  const mx = x.reduce((p, c) => p + c, 0) / n;
  const my = y.reduce((p, c) => p + c, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
  }
  return sxx === 0 || syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy);
}

function influencers(f: SimFrame, tag: string | null): string | null {
  if (!tag || !isAnalog(f, tag)) return null;
  const h = f.history[tag];
  const out: Array<{ tag: string; r: number }> = [];
  if (!h) return null;
  for (const d of f.defs.signals) {
    if (d.tag === tag || d.type !== "analog" || !f.history[d.tag]) continue;
    const r = pearson(h.slice(-120), f.history[d.tag].slice(-120));
    if (Math.abs(r) > 0.6) out.push({ tag: d.tag, r });
  }
  out.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
  if (!out.length) return null;
  return `Readings that moved with it over the last 2 hours: ${out.slice(0, 3).map((o) => `${nm(f, o.tag)} (${o.r >= 0 ? "same direction" : "opposite direction"}, link ${o.r.toFixed(2)} out of 1)`).join(", ")}. Moving together shows where to look; it does not prove the cause.`;
}

function answerPredict(ctx: AskContext, ent: Entities): CopilotAnswer {
  const f = ctx.frame;
  const steps = ["Reading the recent history", "Fitting the trend of the last 2 hours", "Projecting against the warning and alarm limits", "Checking the time left before each limit"];
  const t = ent.tags.length || ent.subs.length || ent.systems.length || ctx.focus ? resolveTarget(ctx, ent) : null;
  const ins = buildLiveInsights(f, labelOf(ctx));
  const lines: string[] = [];
  let tag = t?.tag ?? null;
  let lead: RuleState | null = t?.rule ?? null;
  if (!t) {
    lead = activeRules(f)[0] ?? pendingRules(f)[0] ?? null;
    tag = lead?.tags.find((x) => isAnalog(f, x)) ?? mostAbnormal(f)?.tag ?? null;
  }
  if (lead && (!tag || !isAnalog(f, tag))) tag = lead.tags.find((x) => isAnalog(f, x)) ?? tag;
  const s = tag ? f.signals[tag] : null;
  const def = tag ? (defOf(f, tag) ?? null) : null;
  if (!s || !def || def.type !== "analog") {
    return { ...answerStatus(ctx), intent: "predict" };
  }
  const fc = ins.prognosis.forecasts[tag!];
  const f6 = fc?.["6h"];
  const f24 = fc?.["24h"];
  const lim = limitsOf(f, tag!);
  const slope = s.slopePerHour;
  const flatSlope = slope === null || Math.abs(slope) < def.sigma * 0.15;
  const trend = fc?.["24h"] && fc["24h"].trend !== "stable" ? (fc["24h"].trend as string) : flatSlope ? "flat" : (slope as number) > 0 ? "rising" : "falling";
  const calm = s.status === "Normal" && Math.abs(s.z ?? 0) < 2 && !lead;
  lines.push(
    `**${def.name}** is ${trend === "flat" ? "steady" : trend} at **${val(f, tag!)}**` +
      (slope !== null && !flatSlope && (slope > 0) === (trend === "rising") ? ` (${slope >= 0 ? "+" : "−"}${Math.abs(slope).toFixed(def.decimals + 1)} ${def.unit}/h)` : "") +
      ".",
  );
  if (s.timeToLimit && s.timeToLimit !== "stable" && !calm) {
    lines.push(`At the current rate it reaches its limit in **${s.timeToLimit}**.`);
  } else if (lim && def.limit && def.limit.kind !== "setpoint") {
    const lo = def.limit.kind === "lo" || (isRelativeLimit(def.limit) && lim.alarm < lim.warn);
    const room = lo ? (s.value ?? 0) - lim.warn : lim.warn - (s.value ?? 0);
    lines.push(trend === "flat" ? `It is not expected to reach a limit. Its warning limit is ${lim.warn}${def.unit ? ` ${def.unit}` : ""}, which leaves ${room.toFixed(def.decimals)} ${def.unit} of room.` : `It is not heading for its warning limit (${lim.warn} ${def.unit}) within the forecast period.`);
  }
  if (f6 && f24) {
    lines.push(`Expected value: **${f6.predicted.toFixed(def.decimals)} ${def.unit}** in 6 hours and **${f24.predicted.toFixed(def.decimals)} ${def.unit}** in 24 hours (${f24.deltaPct >= 0 ? "+" : "−"}${Math.abs(f24.deltaPct).toFixed(1)}%).`);
  }
  if (lead) {
    lines.push(`Related problem: **${ruleTitle(lead)}** (${stateWords(lead.status)}${ttlText(lead) ? `, reaches its limit in ${ttlText(lead)}` : ""}). If nobody acts: ${clause(lead.consequence)}.`);
  }
  if (!t && !lead) {
    // A remaining life comes from a measurement trending toward a limit, else from the part's life.
    const rl0 = ins.prognosis.rul.flatMap((r) => (r.hours === null ? [] : [{ r, h: r.hours }])).sort((a, b) => a.h - b.h)[0]?.r;
    lines.push(`Across the machine: no automatic check has found a problem and nothing is expected to reach a limit within 24 hours. ${rl0 ? `The part with the shortest expected remaining life is ${rl0.name}, about ${formatRulHours(rl0.hours)}${rl0.life ? ` (${rl0.dueLabel.toLowerCase()})` : ""}.` : "No reading is moving toward a limit, so no remaining life can be estimated."}`);
  } else if (!t) {
    const rl = ins.prognosis.rul.filter((r) => r.status !== "Normal").slice(0, 2);
    if (rl.length)
      lines.push(
        rl
          .map((r) =>
            r.hours === null
              ? `• ${r.name}: ${r.dueLabel}`
              : r.life
                ? `• ${r.name}: about ${formatRulHours(r.hours)} left (${r.dueLabel.toLowerCase()})`
                : `• ${r.name}: about ${r.dueLabel} left${r.confidence !== null ? ` (${r.confidence}% sure)` : ""}`,
          )
          .join("\n"),
      );
  }
  return {
    intent: "predict",
    steps,
    text: lines.join("\n\n"),
    evidence: chips(f, [tag!, ...(lead?.tags ?? [])], 4),
    spark: spark(f, tag!),
    confidence: f24?.confidence ?? lead?.confidence ?? 80,
    actions: actionsFor(lead, { diagnosis: true }),
    focus: lead ? { kind: "rule", id: lead.id } : { kind: "tag", id: tag! },
  };
}

function answerRecommend(ctx: AskContext, ent: Entities): CopilotAnswer {
  const f = ctx.frame;
  const steps = ["Collecting active and possible problems", "Ranking by urgency and time left", "Choosing what to do"];
  let rs = activeRules(f);
  const t = ent.tags.length || ent.subs.length || ent.systems.length ? resolveTarget(ctx, ent) : null;
  if (t && (t.tag || t.sub)) {
    const scoped = rulesFor(f, t.tag, t.sub).filter((r) => r.status === "ACTIVE");
    if (scoped.length) rs = scoped;
  }
  if (!rs.length) {
    const pend = pendingRules(f);
    const lines = [`Nothing needs to be done now. ${overallLine(f)} No automatic check has found a problem.`];
    if (pend.length) lines.push(`Keep an eye on **${ruleTitle(pend[0])}** (seen in ${pend[0].persistence} of ${pend[0].threshold} checks so far). If it is confirmed: ${clause(ruleTodo(pend[0]))}.`);
    else lines.push(`Only routine work is needed: keep up the planned lubrication and inspection rounds. The lowest part health score is ${Math.min(...Object.values(f.subs).filter((s) => !isProcessSub(f, s.id)).map((s) => s.health))}%.`);
    return { intent: "recommend", steps, text: lines.join("\n\n"), evidence: chips(f, pend[0]?.tags ?? [], 3), spark: pend[0] ? spark(f, pend[0].tags[0]) : null, confidence: 94, actions: [{ kind: "diagnosis", label: "Open Diagnosis", ruleId: null }], focus: pend[0] ? { kind: "rule", id: pend[0].id } : null };
  }
  const lead = rs[0];
  const lines = [`Suggested order of work (${plural(rs.length, "problem")}):`];
  lines.push(
    rs
      .slice(0, 4)
      .map((r) => `• **Priority ${r.priority.replace(/^P/, "")} · ${ruleTitle(r)}**: ${clause(ruleTodo(r))}${ttlText(r) ? ` (reaches its limit in ${ttlText(r)})` : ""}.`)
      .join("\n"),
  );
  lines.push(`Do first: ${clause(ruleTodo(lead))}. ${lead.plainWhat ? sentence(lead.plainWhat) : `Why: ${lead.evidence}. If nobody acts: ${clause(lead.consequence)}.`}`);
  if (isDq(lead)) lines.push("This is a problem with a sensor, not with the machine itself, so it can wait for the next inspection round.");
  return {
    intent: "recommend",
    steps,
    text: lines.join("\n\n"),
    evidence: chips(f, lead.tags, 4),
    spark: spark(f, lead.tags.find((x) => isAnalog(f, x)) ?? lead.tags[0] ?? ""),
    confidence: lead.confidence,
    actions: actionsFor(lead),
    focus: { kind: "rule", id: lead.id },
  };
}

function answerRule(ctx: AskContext, ent: Entities): CopilotAnswer {
  const f = ctx.frame;
  const id = ent.rules[0];
  const def = f.defs.ruleById[id];
  const r = f.rules.find((x) => x.id === id);
  if (!def || !r) return answerStatus(ctx);
  const steps = [`Loading the check "${ruleTitle(def)}"`, "Reading its live inputs", "Checking how long the pattern has lasted"];
  const lines = [`**${ruleTitle(def)}**${def.plainWhat ? `. ${def.plainWhat}` : ""}`, `Technical check: ${def.name} (${id}, ${def.category}). How it decides: ${def.logic}.`];
  if (r.status === "ACTIVE") {
    lines.push(`Right now: **problem found** (${r.severity}, ${r.confidence}% sure${r.since !== null ? `, confirmed ${formatDuration(f.t - r.since)} ago` : ""}). ${r.evidence}.`);
  } else if (r.status === "PENDING") {
    lines.push(`Right now: **possible problem, still being confirmed** (seen in ${r.persistence} of ${r.threshold} checks). ${r.evidence}.`);
  } else {
    lines.push(`Right now: **no problem**. Its inputs match their expected values.`);
  }
  if (ctx.record) {
    const rec = ctx.record.findings.find((x) => x.rule?.code === id && x.clearedAt === null);
    lines.push(
      rec
        ? `Problem record: **open** (${rec.severity}), ${rec.acknowledgement ? "seen" : "not yet seen"}, cause: ${causeWords(rec)}.`
        : "Problem record: no open problem for this check.",
    );
  }
  lines.push(`• Likely cause: ${clause(def.cause)}.\n• If nobody acts: ${clause(def.consequence)}.\n• What to do: ${clause(ruleTodo(def))}.`);
  if (r.status !== "QUIET" && ttlText(r)) lines.push(`Time until it reaches its limit: ${ttlText(r)}.`);
  const inputs = r.tags.length ? r.tags : def.inputs;
  return {
    intent: "rule",
    steps,
    text: lines.join("\n\n"),
    evidence: chips(f, inputs, 5),
    spark: spark(f, inputs.find((x) => isAnalog(f, x)) ?? ""),
    confidence: r.status === "QUIET" ? null : r.confidence,
    actions: r.status === "QUIET" ? [{ kind: "diagnosis", label: "Open Diagnosis", ruleId: id }] : actionsFor(r),
    focus: { kind: "rule", id },
  };
}

function answerCompare(ctx: AskContext, ent: Entities): CopilotAnswer {
  const f = ctx.frame;
  const steps = ["Reading both histories", "Checking how closely they moved together over 2 hours", "Comparing each with its expected value"];
  const tags = [...ent.tags];
  for (const sub of ent.subs) {
    if (tags.length >= 2) break;
    const pool = f.defs.signals.filter((d) => d.sub === sub && d.type === "analog").map((d) => d.tag);
    const m = mostAbnormal(f, pool);
    if (m && !tags.includes(m.tag)) tags.push(m.tag);
  }
  if (tags.length < 2 && ctx.focus?.kind === "tag" && !tags.includes(ctx.focus.id)) tags.push(ctx.focus.id);
  if (tags.length < 2) {
    return {
      intent: "compare",
      steps,
      text: compareHint(f),
      evidence: [],
      spark: null,
      confidence: null,
      actions: [],
      focus: ctx.focus,
    };
  }
  const [a, b] = tags;
  const da = defOf(f, a);
  const db = defOf(f, b);
  const lines: string[] = [];
  if (!da || !db || !f.signals[a] || !f.signals[b]) {
    lines.push(`${!da || !f.signals[a] ? a : b} is not a live reading on ${labelOf(ctx)}.`);
  } else if (da.type !== "analog" || db.type !== "analog") {
    lines.push(`I can only compare two measured values; ${da.type !== "analog" ? a : b} is an on/off reading, currently **${f.signals[da.type !== "analog" ? a : b].display}**.`);
  } else {
    const r = pearson((f.history[a] ?? []).slice(-120), (f.history[b] ?? []).slice(-120));
    const strength = Math.abs(r) > 0.8 ? "strongly" : Math.abs(r) > 0.5 ? "moderately" : "weakly";
    lines.push(`Over the last 2 hours **${da.name}** and **${db.name}** ${r >= 0 ? "rose and fell together" : "moved in opposite directions"}, ${strength} linked (link ${r.toFixed(2)} out of 1).`);
    lines.push(`• ${da.name}: ${val(f, a)} (${zWords(f.signals[a].z)})\n• ${db.name}: ${val(f, b)} (${zWords(f.signals[b].z)})`);
    const za = Math.abs(f.signals[a].z ?? 0);
    const zb = Math.abs(f.signals[b].z ?? 0);
    const shared = f.rules.find((x) => x.status !== "QUIET" && x.tags.includes(a) && x.tags.includes(b));
    if (shared) lines.push(`Both point to **${ruleTitle(shared)}**, so they likely share a cause.`);
    else if (za >= 3 && zb < 2) lines.push(`Only ${da.name} is away from its expected value, so the effect is local to that sensor's area, not shared.`);
    else if (zb >= 3 && za < 2) lines.push(`Only ${db.name} is away from its expected value, so the effect is local to that sensor's area, not shared.`);
    else if (za < 2 && zb < 2) lines.push("Both match their expected values; they move together the way the process normally does.");
  }
  return {
    intent: "compare",
    steps,
    text: lines.join("\n\n"),
    evidence: chips(f, [a, b], 2),
    spark: spark(f, Math.abs(f.signals[a]?.z ?? 0) >= Math.abs(f.signals[b]?.z ?? 0) ? a : b),
    confidence: 88,
    actions: [{ kind: "diagnosis", label: "Open Diagnosis", ruleId: null }],
    focus: { kind: "tag", id: a },
  };
}

function answerSensorFault(ctx: AskContext, ent: Entities): CopilotAnswer {
  const f = ctx.frame;
  const steps = ["Reading the sensor quality flags", "Checking for stuck or out-of-range readings", "Comparing with sensors that measure the same thing", "Reviewing the sensor-quality checks"];
  const t = ent.tags.length || ent.subs.length || ctx.focus ? resolveTarget(ctx, ent) : null;
  const dq = f.rules.filter((r) => isDq(r) && r.status !== "QUIET");
  const bad = Object.values(f.signals).filter((s) => s.quality !== "Good");
  const lines: string[] = [];
  let evTags: string[] = [];
  let lead: RuleState | null = null;
  const tagged = t?.tag && f.signals[t.tag] && defOf(f, t.tag) ? t.tag : null;
  if (tagged) {
    const s = f.signals[tagged];
    const def = defOf(f, tagged);
    evTags = [tagged];
    const mine = dq.filter((r) => r.tags.includes(tagged));
    lead = mine[0] ?? null;
    if (s.quality !== "Good" || mine.length) {
      lines.push(`**Yes, ${def.name} looks like a sensor problem.** Quality: **${s.quality}**${s.qualityNote ? ` (${s.qualityNote})` : ""}.`);
      for (const r of mine) lines.push(`• ${ruleTitle(r)} is ${stateWords(r.status)}: ${r.evidence}.`);
      lines.push(`ULTRON is using an estimate from related sensors in its place. Next: ${clause(lead ? ruleTodo(lead) : "send someone to check the sensor and its cabling")}.`);
    } else {
      const sameSub = f.defs.signals.filter((d) => d.sub === def.sub && d.tag !== tagged && d.type === "analog");
      const agree = sameSub.filter((d) => Math.abs(f.signals[d.tag]?.z ?? 0) >= 2.5);
      lines.push(`**No sign of a sensor fault on ${def.name}.** Quality is **Good**: the reading is not stuck, not out of range, has not jumped, and no sensor-quality check has flagged it.`);
      if (Math.abs(s.z ?? 0) >= 3) {
        lines.push(agree.length ? `It is ${zWords(s.z)}, and nearby sensors (${agree.slice(0, 3).map((d) => d.name).join(", ")}) show the same, so this is a **real change in the process**, not a sensor error.` : `It is ${zWords(s.z)}, but no nearby sensor shows the same yet; keep watching for a slow drift or a sudden step.`);
      } else lines.push(`Its reading of ${val(f, tagged)} is ${zWords(s.z)}.`);
    }
  } else {
    if (!bad.length && !dq.length) {
      lines.push(`**No sensor faults found.** All ${Object.keys(f.signals).length} readings have **Good** quality (${f.pipeline.held} held at their last value, ${f.pipeline.invalid} invalid, ${f.pipeline.suspect} doubtful). The sensor-quality checks are quiet.`);
    } else {
      lines.push(`**${plural(bad.length, "reading")} flagged as unreliable** (${f.pipeline.invalid} invalid, ${f.pipeline.suspect} doubtful, ${f.pipeline.held} held at their last value).`);
      lines.push(bad.slice(0, 5).map((s) => `• ${nm(f, s.tag)}: ${s.quality}${s.qualityNote ? `, ${s.qualityNote}` : ""}`).join("\n"));
      for (const r of dq.slice(0, 2)) lines.push(`${ruleTitle(r)} is ${stateWords(r.status)}. ${r.evidence}. What to do: ${clause(ruleTodo(r))}.`);
      evTags = bad.map((s) => s.tag);
      lead = dq[0] ?? null;
    }
  }
  const sp = evTags.find((x) => isAnalog(f, x));
  return {
    intent: "sensor-fault",
    steps,
    text: lines.join("\n\n"),
    evidence: chips(f, evTags, 5),
    spark: sp ? spark(f, sp) : null,
    confidence: lead ? lead.confidence : 90,
    actions: lead ? actionsFor(lead) : [{ kind: "diagnosis", label: "Open Diagnosis", ruleId: null }],
    focus: tagged ? { kind: "tag", id: tagged } : lead ? { kind: "rule", id: lead.id } : null,
  };
}

function answerHealth(ctx: AskContext, ent: Entities): CopilotAnswer {
  const f = ctx.frame;
  const steps = ["Reading the part's sensors", "Comparing with expected values", "Checking the related automatic checks"];
  const subId = ent.subs[0] ?? (ctx.focus?.kind === "sub" ? ctx.focus.id : null);
  const lines: string[] = [];
  let tags: string[] = [];
  let lead: RuleState | null = null;
  let focus: Focus = null;
  if (!subId && ent.systems.length) {
    const sys = f.defs.systems.find((x) => x.id === ent.systems[0])!;
    const cell = f.systems[sys.id];
    const subs = subsOfSystem(f, sys.id).map((id) => f.subs[id]).filter(Boolean).sort((a, b) => a.health - b.health);
    lines.push(cell ? `**${sys.name}** health score: **${cell.health}%** (${cell.status}).` : `**${sys.name}** describes the process, not machine wear, so it has no health score.`);
    lines.push(subs.map((s) => `• ${subName(f, s.id)}: ${s.health}% ${s.status === "Normal" ? "" : `(${s.status})`}`).join("\n"));
    const rs = f.rules.filter((r) => r.status !== "QUIET" && r.system === sys.id).sort((a, b) => sevRank[b.severity] - sevRank[a.severity]);
    lead = rs[0] ?? null;
    if (lead) {
      lines.push(`Main reason: **${ruleTitle(lead)}**. ${lead.plainWhat ? sentence(lead.plainWhat) : `${lead.evidence}.`}`);
      tags = lead.tags;
    } else lines.push("No problem is open on this system.");
    focus = lead ? { kind: "rule", id: lead.id } : null;
  } else if (subId && f.subs[subId]) {
    const cell = f.subs[subId];
    const sigs = f.defs.signals.filter((d) => d.sub === subId && d.type === "analog");
    const worst = sigs.map((d) => f.signals[d.tag]).filter(Boolean).sort((a, b) => Math.abs(b.z ?? 0) - Math.abs(a.z ?? 0));
    lines.push(`**${subName(f, subId)}** health score: **${cell.health}%** (${cell.status}), based on ${plural(sigs.length, "measured reading")}.`);
    lines.push(worst.slice(0, 3).map((s) => `• ${nm(f, s.tag)}: ${val(f, s.tag)} (${zWords(s.z)})`).join("\n"));
    const rs = rulesFor(f, null, subId);
    lead = rs[0] ?? null;
    lines.push(lead ? `Open problem: **${ruleTitle(lead)}** (${stateWords(lead.status)}). ${lead.evidence}. What to do: ${clause(ruleTodo(lead))}.` : "No automatic check has flagged this part; every reading matches its expected value.");
    tags = worst.slice(0, 3).map((s) => s.tag);
    focus = { kind: "sub", id: subId };
  } else if (ent.tags.length) {
    return answerWhy(ctx, ent);
  } else return answerStatus(ctx);
  return {
    intent: "health",
    steps,
    text: lines.join("\n\n"),
    evidence: chips(f, tags, 4),
    spark: tags[0] ? spark(f, tags[0]) : null,
    confidence: lead ? lead.confidence : 93,
    actions: actionsFor(lead, { diagnosis: true }),
    focus,
  };
}

const helpIntro = (ctx: AskContext) => `I am AssetIQ, the assistant for ${labelOf(ctx)}. I answer from live plant data, so every number is current. `;

/** Example questions built from the machine's definitions. */
function helpExamples(f: SimFrame): string {
  const d = f.defs;
  const analog = d.signals.filter((s) => s.type === "analog" && f.signals[s.tag]);
  const limited = analog.find((s) => s.limit && s.limit.kind !== "setpoint") ?? analog[0];
  const rule = d.rules.find((r) => isConditionRule(r)) ?? d.rules[0];
  const [a, b] = comparePair(f);
  const sys = d.systems.find((s) => s.scored) ?? d.systems[0];
  const lines = ["• **How things are**: \"How is the plant?\" or \"Any early warnings?\""];
  if (analog[0]) lines.push(`• **Why something is off**: "Why is ${analog[0].tag} abnormal?"`);
  if (limited) lines.push(`• **What comes next**: "When will ${lcName(limited.name)} hit its limit?"`);
  lines.push("• **What to do**: \"What should I do first?\"");
  if (rule) lines.push(`• **Explain an automatic check**: "Explain ${rule.id}"`);
  if (a && b) lines.push(`• **Compare two readings**: "Compare ${a} and ${b}"`);
  if (analog[0]) lines.push(`• **Can I trust a sensor**: "Is ${(limited ?? analog[0]).tag} a sensor fault?"`);
  if (sys) lines.push(`• **Health of a part**: "How is the ${lcName(sys.name)}?"`);
  return lines.join("\n");
}

/** Two analog signals worth comparing: the first pair on one sub-assembly. */
function comparePair(f: SimFrame): string[] {
  const analog = f.defs.signals.filter((s) => s.type === "analog" && f.signals[s.tag]);
  const vib = analog.filter((s) => /vibration/i.test(s.name));
  if (vib.length >= 2) return [vib[0].tag, vib[1].tag];
  for (const sa of f.defs.subassemblies) {
    const on = analog.filter((s) => s.sub === sa.id);
    if (on.length >= 2) return [on[0].tag, on[1].tag];
  }
  return analog.slice(0, 2).map((s) => s.tag);
}

function compareHint(f: SimFrame): string {
  const [a, b] = comparePair(f);
  const subs = f.defs.subassemblies.filter((s) => !f.defs.processSystems.includes(s.system));
  const pair = a && b ? `Try "Compare ${a} and ${b}"` : "Name two sensors";
  return `I need two sensors to compare. ${pair}${subs.length >= 2 ? ` or name two parts such as "${lcName(subs[0].name)} vs ${lcName(subs[1].name)}"` : ""}.`;
}

function answerHelp(ctx: AskContext): CopilotAnswer {
  return {
    intent: "help",
    steps: ["Listing what I can answer"],
    text: `${helpIntro(ctx)}You can ask me:\n\n${helpExamples(ctx.frame)}`,
    evidence: [],
    spark: null,
    confidence: null,
    actions: [],
    focus: ctx.focus,
  };
}

function answerFallback(ctx: AskContext): CopilotAnswer {
  const h = answerHelp(ctx);
  const intro = helpIntro(ctx);
  return { ...h, intent: "fallback", text: `I did not understand that question. ${overallLine(ctx.frame)}\n\n` + (h.text.startsWith(intro) ? h.text.slice(intro.length) : h.text) };
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

const PRONOUN = /\b(it|its|this|that|these|those)\b/;
const GENERIC_NAME_WORDS = new Set(["and", "the", "with", "system", "main"]);
const singular = (w: string) => (/[a-z]{3}s$/.test(w) ? w.slice(0, -1) : w);
/** A non-primary machine needs at least a name, alias or id match, not just a keyword. */
const ROUTE_MIN = 5;

/**
 * How strongly the question names each machine of the plant: its id (100), or
 * the words of its name, rarer words weighing more ("cooler" → the grate
 * cooler; "kiln" is shared by several names).
 */
function machineScores(question: string, plant: PlantMachine[]): Map<string, number> {
  const lower = question.toLowerCase();
  const prefixes = new Set(plant.flatMap((m) => [...vocabOf(m.frame.defs).prefixes].map((x) => x.toLowerCase())));
  const nameWords = new Map(
    plant.map((m) => [m.id, new Set(norm(m.name).split(" ").filter((w) => w.length >= 3 && !GENERIC_NAME_WORDS.has(w) && !/\d/.test(w)).map(singular))]),
  );
  const df = new Map<string, number>();
  for (const ws of nameWords.values()) for (const w of ws) df.set(w, (df.get(w) ?? 0) + 1);
  const qWords = new Set(norm(question).split(" ").map(singular));
  const out = new Map<string, number>();
  for (const m of plant) {
    let score = 0;
    // "PYR-CLR-01", "CLR-01", "clr 01" — but not the area code inside a tag ("VIB-KLN-01", "vib kln 01").
    const ids = new Set([m.id, m.id.replace(/^[A-Z]+-(?=[A-Z]+-\d)/, "")].map((x) => x.toLowerCase()));
    for (const id of ids) {
      const re = new RegExp(`(^|[^a-z0-9-])${id.replace(/-/g, "[-\\s]?")}(?![a-z0-9])`, "g");
      for (const hit of lower.matchAll(re)) {
        const prev = lower.slice(0, (hit.index ?? 0) + hit[1].length).match(/(?:^|[^a-z])([a-z]{3})[-\s]*$/)?.[1];
        if (!prev || !prefixes.has(prev)) score = 100;
      }
    }
    for (const w of nameWords.get(m.id) ?? []) if (qWords.has(w)) score += 10 / (df.get(w) ?? 1);
    out.set(m.id, score);
  }
  return out;
}

function answerFor(question: string, ctx: AskContext, ent: Entities, intent: IntentId = classify(question, ent)): CopilotAnswer {
  switch (intent) {
    case "status":
      return answerStatus(ctx);
    case "why":
      return answerWhy(ctx, ent);
    case "predict":
      return answerPredict(ctx, ent);
    case "recommend":
      return answerRecommend(ctx, ent);
    case "rule":
      return answerRule(ctx, ent);
    case "compare":
      return answerCompare(ctx, ent);
    case "sensor-fault":
      return answerSensorFault(ctx, ent);
    case "health":
      return answerHealth(ctx, ent);
    case "help":
      return answerHelp(ctx);
    default:
      return answerFallback(ctx);
  }
}

/** Picks the machine of the plant the question is about (the primary unless another is named) and answers from its frame. */
function askPlant(question: string, context: AskContext, plant: PlantMachine[], pronoun: boolean): CopilotAnswer {
  const primaryId = context.machineId ?? plant[0].id;
  const names = machineScores(question, plant);
  const scored = plant.map((m) => {
    const r = resolveScored(question, m.frame, m);
    return { m, ent: r.ent, score: r.score + (names.get(m.id) ?? 0) };
  });
  const primary = scored.find((x) => x.m.id === primaryId) ?? scored[0];
  let best = primary;
  for (const x of scored) if (x !== primary && x.score >= ROUTE_MIN && x.score > best.score) best = x;
  // A pronoun follow-up stays on the machine the conversation is about unless the question names another.
  const focusId = context.focus?.machineId ?? primaryId;
  if (pronoun && best === primary && primary.score === 0) best = scored.find((x) => x.m.id === focusId) ?? best;
  const m = best.m;
  const record = m.record !== undefined ? m.record : m.id === primaryId ? context.record : undefined;
  const ctx: AskContext = { frame: m.frame, machineId: m.id, focus: pronoun && focusId === m.id ? context.focus : null, record };
  let intent = classify(question, best.ent);
  // "the cooler" names a machine and nothing else (at most a sensor-name echo of the
  // machine name): answer with that machine's status.
  const nameOnly = (names.get(m.id) ?? 0) > 0 && best.score - (names.get(m.id) ?? 0) <= 3 && classify(question, { rules: [], tags: [], subs: [], systems: [] }) === "fallback";
  if (m.id !== primaryId && (intent === "fallback" || intent === "help" || nameOnly)) intent = "status";
  const a = answerFor(question, ctx, best.ent, intent);
  const text = m.id !== primaryId && !a.text.includes(m.id) ? `**${m.id}** · ${a.text}` : a.text;
  // Work orders run through the ops loop, which follows the primary machine; other machines act through their engine.
  const actions = a.actions.filter((x) => m.id === primaryId || x.kind !== "workorder").map((x) => ({ ...x, machineId: m.id }));
  return { ...a, text, actions, machineId: m.id, focus: a.focus ? { ...a.focus, machineId: m.id } : null };
}

export function ask(question: string, context: AskContext): CopilotAnswer {
  // Conversation focus only carries over for pronoun follow-ups ("is it a sensor fault?").
  const pronoun = PRONOUN.test(norm(question));
  if (context.plant && context.plant.length > 1) return askPlant(question, context, context.plant, pronoun);
  const ctx: AskContext = pronoun ? context : { ...context, focus: null };
  const self = context.plant?.find((m) => m.id === context.machineId) ?? { id: context.machineId };
  return answerFor(question, ctx, resolveEntities(question, context.frame, self));
}

/** Insight offered when the server evaluation opens a new finding. */
export function findingInsight(x: FindingDto, ctx: AskContext): CopilotAnswer {
  const f = ctx.frame;
  const code = x.rule?.code ?? null;
  const def = code ? f.defs.ruleById[code] : undefined;
  const rule = ruleOfFinding(f, x);
  const tags = findingTags(f, x);
  const lead = tags.find((t) => isAnalog(f, t));
  const intro = `**New problem: ${findingLabel(x)}** (${x.severity}, ${lcName(x.typeName)}). ${sentence(x.rule?.plainWhat || x.summary)} ${overallLine(f)}`;
  const next = x.rule?.plainTodo
    ? `What to do: ${sentence(x.rule.plainTodo)}`
    : [def?.cause ? `Likely cause: ${clause(def.cause)}.` : null, x.rule?.action ? `What to do: ${clause(x.rule.action)}.` : null].filter(Boolean).join(" ");
  return {
    intent: "rule",
    steps: ["A problem was opened by the automatic checks", "Reading the live evidence", "Preparing what to do"],
    text: next ? `${intro}\n\n${next}` : intro,
    evidence: chips(f, tags, 5),
    spark: lead ? spark(f, lead) : null,
    confidence: null,
    actions: rule ? actionsFor(rule, { diagnosis: true }) : [{ kind: "diagnosis", label: "Open Diagnosis", ruleId: code }],
    focus: code ? { kind: "rule", id: code } : x.measurement ? { kind: "tag", id: x.measurement.tag } : null,
    machineId: ctx.machineId,
  };
}

/** Suggested prompts that follow the plant state (open findings from the record when it is given). */
export function suggestions(f: SimFrame, focus: Focus, record?: MachineRecord | null): string[] {
  const act =
    record === undefined
      ? activeRules(f)
      : (record ? openFindings(record) : []).map((x) => ruleOfFinding(f, x)).filter((r): r is RuleState => r !== null);
  const pend = pendingRules(f);
  const out: string[] = [];
  if (act.length) {
    const r = act[0];
    out.push(`Why did ${r.id} fire?`);
    if (ttlText(r) || !isDq(r)) out.push(r.tags[0] && isAnalog(f, r.tags[0]) ? `How long until ${r.tags[0]} hits its limit?` : "How long until the trip limit?");
    out.push("What should I do first?");
    out.push(r.tags[0] ? `Is ${r.tags[0]} a sensor fault?` : "Are any sensors faulty?");
    if (act.length > 1) out.push("Summarise the plant status");
  } else {
    out.push("How is the plant?");
    if (pend.length) out.push(`Explain ${pend[0].id}`);
    else out.push("Any early warnings?");
    out.push("Predict the next 24 hours");
    const [a, b] = comparePair(f);
    if (a && b) out.push(`Compare ${a} and ${b}`);
    out.push("Are any sensors faulty?");
  }
  if (focus?.kind === "sub") out.push(`How is ${subName(f, focus.id)}?`);
  out.push("What can you do?");
  return out.slice(0, 3);
}

export function ruleNameById(f: SimFrame, id: string): string {
  return f.defs.ruleById[id]?.name ?? id;
}

export type { SignalDef };
