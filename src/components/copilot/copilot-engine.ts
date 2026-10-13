/**
 * ULTRON Copilot intent engine.
 *
 * A deterministic intent router plus templated answer generator over the LIVE
 * KLN-01 frame. No network, no LLM: every number in an answer is read from the
 * running plant (signals, reference model residuals, rule states, forecasts).
 * Pure TypeScript, no React, so it can be unit-tested headlessly.
 */
import { RULE_BY_ID } from "@/lib/kiln-sim/rules";
import { SIGNALS, SIGNAL_BY_TAG, SUBASSEMBLIES, SYSTEMS, limitPair, type SignalDef, type SubassemblyId, type SystemId } from "@/lib/kiln-sim/signals";
import { formatDuration, type LiveSignal, type RuleState, type SimFrame } from "@/lib/kiln-sim/engine";
import { buildLiveInsights } from "@/lib/kiln-sim/live-insights";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type Sev = "Normal" | "Advisory" | "Critical";

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
}

export type Focus = { kind: "tag" | "sub" | "rule"; id: string } | null;

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
}

export interface AskContext {
  frame: SimFrame;
  focus: Focus;
}

/* ------------------------------------------------------------------ */
/* Frame helpers                                                       */
/* ------------------------------------------------------------------ */

const sevRank: Record<Sev, number> = { Normal: 0, Advisory: 1, Critical: 2 };
const SUB_NAME: Record<string, string> = Object.fromEntries(SUBASSEMBLIES.map((s) => [s.id, s.name]));
const subName = (id: string) => SUB_NAME[id] ?? id;

export function activeRules(f: SimFrame): RuleState[] {
  return f.rules
    .filter((r) => r.status === "ACTIVE")
    .sort((a, b) => sevRank[b.severity] - sevRank[a.severity] || b.confidence - a.confidence);
}
export function pendingRules(f: SimFrame): RuleState[] {
  return f.rules.filter((r) => r.status === "PENDING").sort((a, b) => sevRank[b.severity] - sevRank[a.severity]);
}
const isDq = (r: RuleState) => r.category === "Data quality" || r.category === "Anomaly";

const fmtZ = (z: number | null) => (z === null ? "—" : `${z >= 0 ? "+" : "−"}${Math.abs(z).toFixed(1)}σ`);
const unitOf = (tag: string) => {
  const u = SIGNAL_BY_TAG[tag]?.unit ?? "";
  return u === "state" ? "" : u;
};
const val = (f: SimFrame, tag: string) => {
  const s = f.signals[tag];
  if (!s) return "—";
  const u = unitOf(tag);
  return `${s.display}${u ? ` ${u}` : ""}`;
};
const nm = (tag: string) => SIGNAL_BY_TAG[tag]?.name ?? tag;
const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

function chip(f: SimFrame, tag: string): EvidenceChip | null {
  const s = f.signals[tag];
  if (!s || !SIGNAL_BY_TAG[tag]) return null;
  return { tag, name: nm(tag), value: s.display, unit: unitOf(tag), z: s.z, status: s.status };
}
function chips(f: SimFrame, tags: string[], max = 5): EvidenceChip[] {
  const out: EvidenceChip[] = [];
  for (const t of tags) {
    if (out.length >= max) break;
    if (out.some((c) => c.tag === t)) continue;
    const c = chip(f, t);
    if (c) out.push(c);
  }
  return out;
}

function spark(f: SimFrame, tag: string): Spark | null {
  const def = SIGNAL_BY_TAG[tag];
  const h = f.history[tag];
  if (!def || def.type !== "analog" || !h || h.length < 8) return null;
  const n = 90;
  const lim = limitPair(def, f.drivers.feedSp);
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
  const list = (pool ?? Object.keys(f.signals)).map((t) => f.signals[t]).filter((s): s is LiveSignal => !!s && SIGNAL_BY_TAG[s.tag]?.type === "analog" && s.quality === "Good");
  list.sort((a, b) => sevRank[b.status] * 100 + Math.abs(b.z ?? 0) - (sevRank[a.status] * 100 + Math.abs(a.z ?? 0)));
  return list[0] ?? null;
}

function rulesFor(f: SimFrame, tag: string | null, sub: string | null): RuleState[] {
  return f.rules
    .filter((r) => r.status !== "QUIET" && ((tag && r.tags.includes(tag)) || (sub && r.subs.includes(sub as SubassemblyId))))
    .sort((a, b) => (a.status === b.status ? 0 : a.status === "ACTIVE" ? -1 : 1) || sevRank[b.severity] - sevRank[a.severity]);
}

function actionsFor(rule: RuleState | null, opts: { diagnosis?: boolean } = {}): ActionSpec[] {
  const out: ActionSpec[] = [];
  if (rule && rule.status !== "QUIET") {
    const dq = isDq(rule);
    if (!dq) out.push({ kind: "mitigate", label: "Mitigate", ruleId: rule.id });
    out.push({ kind: "repair", label: dq ? "Schedule calibration" : "Schedule repair", ruleId: rule.id });
    out.push({ kind: "workorder", label: "Create work order", ruleId: rule.id });
  }
  if (rule || opts.diagnosis) out.push({ kind: "diagnosis", label: "Open Diagnosis", ruleId: rule?.id ?? null });
  return out;
}

/* ------------------------------------------------------------------ */
/* Entity resolution (fuzzy)                                           */
/* ------------------------------------------------------------------ */

const STOP = new Set(["the", "a", "an", "of", "is", "are", "in", "on", "at", "to", "for", "and", "or", "my", "kiln", "kln", "01", "sensor", "temperature", "temp", "what", "why", "how", "will", "when", "high", "low", "abnormal"]);

interface Aliases {
  sub: Record<string, string[]>;
  system: Record<string, string[]>;
}
const ALIASES: Aliases = {
  sub: {
    "main-motor": ["main motor", "motor", "winding", "drive motor", "kiln motor"],
    gearbox: ["gearbox", "gear box", "reducer", "gear unit"],
    "pinion-gear": ["pinion", "girth gear", "girth", "gear mesh", "pinion gear"],
    lubrication: ["lubrication", "lube", "oil system", "oil circuit", "oil cooler", "gearbox oil", "oil"],
    "auxiliary-drive": ["auxiliary drive", "aux drive", "auxiliary", "barring", "inching"],
    "station-1": ["station 1", "station one", "pier 1", "support 1"],
    "station-2": ["station 2", "station two", "pier 2", "support 2"],
    "station-3": ["station 3", "station three", "pier 3", "support 3"],
    thrust: ["thrust", "hydraulic thrust", "axial", "lvdt", "axial position"],
    "shell-refractory": ["shell", "refractory", "hot spot", "hotspot", "scanner", "coating", "ring build"],
    "inlet-seal": ["inlet seal", "kiln inlet seal", "false air", "inlet"],
    "outlet-seal": ["outlet seal", "outlet", "hood seal", "seal overlap", "overlap"],
    "kiln-inlet": ["kiln inlet gas", "gas analyser", "analyser", "o2", "co "],
    "feed-fuel": ["feed", "fuel", "feed and fuel", "throughput"],
    "burner-hood": ["burner", "hood", "hood pressure"],
  },
  system: {
    "DRV-KLN-01": ["drive train", "drivetrain", "drive system", "drive"],
    "SUP-KLN-01": ["support", "supports", "support and thrust", "rollers", "roller"],
    "SHL-KLN-01": ["shell", "seals", "shell and seals"],
    "PRC-KLN-01": ["process", "process context"],
  },
};

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

const KEYWORD_TAGS: Array<[RegExp, string[]]> = [
  [/\bvibration|\bvib\b/, ["VIB-KLN-01", "VIB-KLN-02", "VIB-KLN-03", "VIB-KLN-04"]],
  [/\bwinding\b/, ["TMP-KLN-21"]],
  [/\btorque\b|\bmotor current\b|\bcurrent\b/, ["ELE-KLN-01"]],
  [/\boil temp/, ["TMP-KLN-15"]],
  [/\boil pressure\b/, ["PRS-KLN-04"]],
  [/\bo2\b|\boxygen\b/, ["GAS-KLN-01"]],
  [/\bshell temp|\bhot ?spot\b/, ["CAL-KLN-03"]],
  [/\bfalse air\b/, ["CAL-KLN-06"]],
  [/\bseal overlap\b|\boverlap\b/, ["CAL-KLN-07"]],
  [/\bhood pressure\b/, ["PRS-KLN-03"]],
  [/\blvdt\b|\baxial\b/, ["POS-KLN-01"]],
  [/\bkiln speed\b|\brpm\b/, ["SPD-KLN-01"]],
];

export function resolveEntities(q: string): Entities {
  const n = norm(q);
  const ent: Entities = { rules: [], tags: [], subs: [], systems: [] };
  // Rule ids, tolerant of "r-drv-08", "r drv 08", "rdrv08".
  for (const m of q.toUpperCase().matchAll(/\bR[-\s]?([A-Z]{2,3})[-\s]?(\d{1,2})\b/g)) {
    const id = `R-${m[1]}-${m[2].padStart(2, "0")}`;
    if (RULE_BY_ID[id] && !ent.rules.includes(id)) ent.rules.push(id);
  }
  // Tag ids: "VIB-KLN-01", "vib 01", "tmp-21", "tmp kln 21".
  for (const m of q.toUpperCase().matchAll(/\b([A-Z]{3})[-\s]?(?:KLN[-\s]?)?(\d{1,2})\b/g)) {
    const tag = `${m[1]}-KLN-${m[2].padStart(2, "0")}`;
    if (SIGNAL_BY_TAG[tag] && !ent.tags.includes(tag)) ent.tags.push(tag);
  }
  // Sub-assemblies / systems by alias (longest alias wins; token boundaries).
  const subHits: Array<[string, number]> = [];
  for (const [id, al] of Object.entries(ALIASES.sub)) {
    for (const a of al) {
      const i = n.indexOf(a.trim());
      if (i >= 0 && (i === 0 || n[i - 1] === " ")) subHits.push([id, a.length]);
    }
  }
  subHits.sort((a, b) => b[1] - a[1]);
  for (const [id] of subHits) if (!ent.subs.includes(id)) ent.subs.push(id);
  for (const [id, al] of Object.entries(ALIASES.system)) {
    if (al.some((a) => new RegExp(`(^| )${a}( |$)`).test(n))) ent.systems.push(id);
  }
  // Keyword → tag shortcuts when no explicit tag was given.
  if (!ent.tags.length) {
    for (const [re, tags] of KEYWORD_TAGS) {
      if (re.test(n)) {
        const scoped = ent.subs.length ? tags.filter((t) => SIGNAL_BY_TAG[t]?.sub === ent.subs[0]) : tags;
        for (const t of scoped) if (!ent.tags.includes(t)) ent.tags.push(t);
        break;
      }
    }
  }
  // Sensor-name fuzzy match (token overlap with typo tolerance), only when still nothing found.
  if (!ent.tags.length) {
    const qw = words(n);
    if (qw.length) {
      let best: { tag: string; score: number } | null = null;
      for (const d of SIGNALS) {
        const dw = words(d.name);
        let score = 0;
        for (const w of qw) {
          if (dw.includes(w)) score += 2;
          else if (w.length > 4 && dw.some((x) => x.length > 4 && lev(w, x, 1) <= 1)) score += 1.5;
        }
        const need = Math.min(2, qw.length);
        if (score >= need * 2 - 0.5 && (!best || score > best.score)) best = { tag: d.tag, score };
      }
      if (best) ent.tags.push(best.tag);
    }
  }
  return ent;
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

const subsOfSystem = (sys: string) => SUBASSEMBLIES.filter((s) => s.system === (sys as SystemId)).map((s) => s.id);

function ttlText(r: RuleState): string | null {
  const t = r.timeToLimit;
  if (!t || t === "stable" || t === "—") return null;
  return t;
}

function overallLine(f: SimFrame): string {
  return `Overall machine health is **${f.overall}%** (${f.condition.toLowerCase()}).`;
}

function answerStatus(ctx: AskContext): CopilotAnswer {
  const f = ctx.frame;
  const act = activeRules(f);
  const pend = pendingRules(f);
  const total = Object.keys(f.signals).length;
  const p = f.pipeline;
  const worstSubs = Object.values(f.subs).filter((s) => s.id !== "kiln-inlet" && s.id !== "feed-fuel" && s.id !== "burner-hood").sort((a, b) => a.health - b.health).slice(0, 3);
  const steps = [`Reading ${total} signals`, "Comparing to reference model", `Evaluating ${f.rules.length}-rule library`, "Ranking findings"];
  const lines: string[] = [];
  const evTags: string[] = [];
  if (!act.length) {
    lines.push(`KLN-01 is running **normally**. ${overallLine(f)} No rule is active.`);
    lines.push(`• ${p.valid} of ${total} signals valid, ${p.beyond3s} beyond 3σ of the reference model, ${plural(p.pending, "rule")} pending.`);
    lines.push(`• Lowest sub-assembly health: ${worstSubs.map((s) => `${subName(s.id)} ${s.health}%`).join(", ")}.`);
    if (pend.length) {
      lines.push(`Early warning: **${pend[0].id} ${pend[0].name}** is building (${pend[0].persistence}/${pend[0].threshold} samples). ${pend[0].evidence}.`);
      evTags.push(...pend[0].tags);
    } else {
      const top = mostAbnormal(f);
      if (top) {
        lines.push(`Largest deviation from model: ${nm(top.tag)} at ${val(f, top.tag)} (${fmtZ(top.z)}), within normal scatter.`);
        evTags.push(top.tag);
      }
    }
  } else {
    const lead = act[0];
    lines.push(`KLN-01 needs attention. ${overallLine(f)} **${plural(act.length, "active finding")}**${pend.length ? `, ${pend.length} pending` : ""}.`);
    for (const r of act.slice(0, 3)) {
      lines.push(`• **${r.id} ${r.name}** · ${r.severity} · ${r.confidence}% confidence. ${r.evidence}${ttlText(r) ? `. Time to limit ${ttlText(r)}` : ""}.`);
      evTags.push(...r.tags);
    }
    lines.push(`Most affected: ${worstSubs.map((s) => `${subName(s.id)} ${s.health}%`).join(", ")}. Lead action: ${lc(lead.action)}.`);
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
    const subs = subsOfSystem(ent.systems[0]).map((id) => f.subs[id]).filter(Boolean).sort((a, b) => a.health - b.health);
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
    const pool = SIGNALS.filter((d) => d.sub === sub).map((d) => d.tag);
    tag = mostAbnormal(f, pool)?.tag ?? pool[0] ?? null;
  }
  return { tag, sub, rule, fromFocus };
}

function nothingWrong(f: SimFrame): CopilotAnswer {
  const top = mostAbnormal(f);
  const pend = pendingRules(f);
  const p = f.pipeline;
  const lines = [`Nothing is wrong right now. ${overallLine(f)} No rule is active and ${p.beyond3s} of ${Object.keys(f.signals).length} signals sit beyond 3σ of the reference model.`];
  if (top) lines.push(`The most deviating signal is ${nm(top.tag)} at ${val(f, top.tag)} (${fmtZ(top.z)}), which is normal scatter.`);
  if (pend.length) lines.push(`Watch item: ${pend[0].id} ${pend[0].name} is pending (${pend[0].persistence}/${pend[0].threshold} samples).`);
  return {
    intent: "why",
    steps: ["Reading 46 signals", "Comparing to reference model", "Checking 21 rule states"],
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
  const def = t.tag ? SIGNAL_BY_TAG[t.tag] : null;
  const rs = rulesFor(f, t.tag, t.sub);
  const act = rs.filter((r) => r.status === "ACTIVE");
  const abnormal = !!s && (s.status !== "Normal" || Math.abs(s.z ?? 0) >= 3);
  const noRuleAtAll = !act.length && !rs.length;
  if (noRuleAtAll && !abnormal && !ent.tags.length && !ent.subs.length && !ent.systems.length) return nothingWrong(f);
  const steps = [`Reading ${def ? def.tag : "46 signals"} and neighbours`, "Comparing to reference model", `Ranking ${Math.max(3, rs.length + 1)} candidate causes`, "Cross-checking rule evidence"];
  const lines: string[] = [];
  if (s && def) {
    const dir = (s.residual ?? 0) >= 0 ? "above" : "below";
    lines.push(
      `**${def.name}** (${def.tag}) reads **${val(f, def.tag)}**` +
        (s.model !== null && s.z !== null ? `, ${Math.abs(s.residual ?? 0).toFixed(def.decimals)} ${def.unit} ${dir} its model value of ${s.model.toFixed(def.decimals)} (${fmtZ(s.z)}).` : ".") +
        (s.status !== "Normal" ? ` It is past its ${s.status === "Critical" ? "alarm" : "warning"} limit.` : ""),
    );
  }
  if (!abnormal && !act.length) {
    lines.push(`This is within normal scatter: nothing indicates a problem${t.sub ? ` on ${subName(t.sub)}` : ""}. Sub-assembly health is ${t.sub ? `${f.subs[t.sub as SubassemblyId].health}%` : `${f.overall}% overall`}.`);
    if (rs.length) lines.push(`Watch item: ${rs[0].id} ${rs[0].name} is ${rs[0].status.toLowerCase()} (${rs[0].persistence}/${rs[0].threshold} samples).`);
  } else {
    const lead = act[0] ?? rs[0];
    if (lead) {
      lines.push(`Ranked candidate causes:`);
      lines.push(
        rs
          .slice(0, 3)
          .map((r) => `• **${r.id} ${r.name}** (${r.status.toLowerCase()}, ${r.confidence}%): ${lc(r.cause)}.`)
          .join("\n"),
      );
      lines.push(`Most likely: **${lead.name}**. ${lead.evidence}. If it continues: ${lc(lead.consequence)}.`);
    } else {
      lines.push(`No rule has matched yet, so this is an **unclassified deviation**. Neighbouring signals: ${neighbourText(f, t.tag!)}. Keep watching; ULTRON will raise a finding once the pattern persists.`);
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
  const def = SIGNAL_BY_TAG[tag];
  const pool = SIGNALS.filter((d) => d.sub === def.sub && d.tag !== tag && d.type === "analog").map((d) => d.tag);
  if (!pool.length) return "none on the same sub-assembly";
  return pool.slice(0, 3).map((t) => `${t} ${fmtZ(f.signals[t].z)}`).join(", ");
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
  if (!tag || SIGNAL_BY_TAG[tag]?.type !== "analog") return null;
  const h = f.history[tag];
  const out: Array<{ tag: string; r: number }> = [];
  for (const d of SIGNALS) {
    if (d.tag === tag || d.type !== "analog" || !f.history[d.tag]) continue;
    const r = pearson(h.slice(-120), f.history[d.tag].slice(-120));
    if (Math.abs(r) > 0.6) out.push({ tag: d.tag, r });
  }
  out.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
  if (!out.length) return null;
  return `Strongest co-movers over the last 2 h: ${out.slice(0, 3).map((o) => `${o.tag} (r = ${o.r.toFixed(2)})`).join(", ")}. Correlation points to where to look; it is not proof of physical cause.`;
}

function answerPredict(ctx: AskContext, ent: Entities): CopilotAnswer {
  const f = ctx.frame;
  const steps = ["Reading signal history", "Fitting 2 h trend with damping", "Projecting against warning and alarm limits", "Checking rule time-to-limit"];
  const t = ent.tags.length || ent.subs.length || ent.systems.length || ctx.focus ? resolveTarget(ctx, ent) : null;
  const ins = buildLiveInsights(f, "KLN-01");
  const lines: string[] = [];
  let tag = t?.tag ?? null;
  let lead: RuleState | null = t?.rule ?? null;
  if (!t) {
    lead = activeRules(f)[0] ?? pendingRules(f)[0] ?? null;
    tag = lead?.tags.find((x) => SIGNAL_BY_TAG[x]?.type === "analog") ?? mostAbnormal(f)?.tag ?? null;
  }
  if (lead && (!tag || SIGNAL_BY_TAG[tag]?.type !== "analog")) tag = lead.tags.find((x) => SIGNAL_BY_TAG[x]?.type === "analog") ?? tag;
  const s = tag ? f.signals[tag] : null;
  const def = tag ? SIGNAL_BY_TAG[tag] : null;
  if (!s || !def || def.type !== "analog") {
    return { ...answerStatus(ctx), intent: "predict" };
  }
  const fc = ins.prognosis.forecasts[tag!];
  const f6 = fc?.["6h"];
  const f24 = fc?.["24h"];
  const lim = limitPair(def, f.drivers.feedSp);
  const slope = s.slopePerHour;
  const flatSlope = slope === null || Math.abs(slope) < def.sigma * 0.15;
  const trend = fc?.["24h"] && fc["24h"].trend !== "stable" ? (fc["24h"].trend as string) : flatSlope ? "flat" : (slope as number) > 0 ? "rising" : "falling";
  const calm = s.status === "Normal" && Math.abs(s.z ?? 0) < 2 && !lead;
  lines.push(
    `**${def.name}** (${tag}) is ${trend === "flat" ? "stable" : trend} at **${val(f, tag!)}**` +
      (slope !== null && !flatSlope && (slope > 0) === (trend === "rising") ? ` (${slope >= 0 ? "+" : "−"}${Math.abs(slope).toFixed(def.decimals + 1)} ${def.unit}/h)` : "") +
      ".",
  );
  if (s.timeToLimit && s.timeToLimit !== "stable" && !calm) {
    lines.push(`At the current slope it reaches its limit in **${s.timeToLimit}**.`);
  } else if (lim && def.limit && def.limit.kind !== "setpoint") {
    const lo = def.limit.kind === "lo";
    const room = lo ? (s.value ?? 0) - lim.warn : lim.warn - (s.value ?? 0);
    lines.push(trend === "flat" ? `No limit crossing is projected. Warning limit ${lim.warn}${def.unit ? ` ${def.unit}` : ""} leaves ${room.toFixed(def.decimals)} ${def.unit} of headroom.` : `It is not on course to cross its warning limit (${lim.warn} ${def.unit}) within the forecast horizon.`);
  }
  if (f6 && f24) {
    lines.push(`Forecast: **${f6.predicted.toFixed(def.decimals)} ${def.unit}** in 6 h and **${f24.predicted.toFixed(def.decimals)} ${def.unit}** in 24 h (${f24.deltaPct >= 0 ? "+" : "−"}${Math.abs(f24.deltaPct).toFixed(1)}%).`);
  }
  if (lead) {
    lines.push(`Linked finding: **${lead.id} ${lead.name}** (${lead.status.toLowerCase()}${ttlText(lead) ? `, time to limit ${ttlText(lead)}` : ""}). Consequence: ${lc(lead.consequence)}.`);
  }
  if (!t && !lead) {
    const rl0 = ins.prognosis.rul.slice().sort((a, b) => a.hours - b.hours)[0];
    lines.push(`Plant-wide: no rule is active and nothing is projected to reach a limit within 24 h. Shortest remaining useful life is ${rl0 ? `${rl0.name}, about ${rl0.dueLabel}` : "long"}.`);
  } else if (!t) {
    const rl = ins.prognosis.rul.filter((r) => r.status !== "Normal").slice(0, 2);
    if (rl.length) lines.push(rl.map((r) => `• ${r.name}: ~${r.dueLabel} remaining (${r.confidence}% confidence)`).join("\n"));
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
  const steps = ["Collecting active and pending findings", "Ranking by severity and time to limit", "Selecting prescriptive actions"];
  let rs = activeRules(f);
  const t = ent.tags.length || ent.subs.length || ent.systems.length ? resolveTarget(ctx, ent) : null;
  if (t && (t.tag || t.sub)) {
    const scoped = rulesFor(f, t.tag, t.sub).filter((r) => r.status === "ACTIVE");
    if (scoped.length) rs = scoped;
  }
  if (!rs.length) {
    const pend = pendingRules(f);
    const lines = [`No action is required. ${overallLine(f)} No rule is active.`];
    if (pend.length) lines.push(`Keep an eye on **${pend[0].id} ${pend[0].name}** (${pend[0].persistence}/${pend[0].threshold} samples). If it confirms: ${lc(pend[0].action)}.`);
    else lines.push(`Routine only: continue scheduled lubrication and walk-down inspections. Lowest sub-assembly health is ${Math.min(...Object.values(f.subs).filter((s) => !["kiln-inlet", "feed-fuel", "burner-hood"].includes(s.id)).map((s) => s.health))}%.`);
    return { intent: "recommend", steps, text: lines.join("\n\n"), evidence: chips(f, pend[0]?.tags ?? [], 3), spark: pend[0] ? spark(f, pend[0].tags[0]) : null, confidence: 94, actions: [{ kind: "diagnosis", label: "Open Diagnosis", ruleId: null }], focus: pend[0] ? { kind: "rule", id: pend[0].id } : null };
  }
  const lead = rs[0];
  const lines = [`Recommended order of work (${plural(rs.length, "finding")}):`];
  lines.push(
    rs
      .slice(0, 4)
      .map((r) => `• **${r.priority} · ${r.id} ${r.name}**: ${lc(r.action)}${ttlText(r) ? ` (limit in ${ttlText(r)})` : ""}.`)
      .join("\n"),
  );
  lines.push(`Do first: ${lc(lead.action)}. Reason: ${lead.evidence}. Leaving it risks ${lc(lead.consequence)}.`);
  if (isDq(lead)) lines.push("This is an instrument finding: machine health is unaffected, so it can wait for the next walk-down.");
  return {
    intent: "recommend",
    steps,
    text: lines.join("\n\n"),
    evidence: chips(f, lead.tags, 4),
    spark: spark(f, lead.tags.find((x) => SIGNAL_BY_TAG[x]?.type === "analog") ?? lead.tags[0] ?? ""),
    confidence: lead.confidence,
    actions: actionsFor(lead),
    focus: { kind: "rule", id: lead.id },
  };
}

function answerRule(ctx: AskContext, ent: Entities): CopilotAnswer {
  const f = ctx.frame;
  const id = ent.rules[0];
  const def = RULE_BY_ID[id];
  const r = f.rules.find((x) => x.id === id)!;
  const steps = [`Loading ${id} definition`, "Reading live inputs", "Checking persistence and hysteresis"];
  const lines = [`**${id} · ${def.name}** (${def.category}). Logic: ${def.logic}.`];
  if (r.status === "ACTIVE") {
    lines.push(`State: **ACTIVE** (${r.severity}, ${r.confidence}% confidence${r.since !== null ? `, confirmed ${formatDuration(f.t - r.since)} ago` : ""}). ${r.evidence}.`);
  } else if (r.status === "PENDING") {
    lines.push(`State: **PENDING**, ${r.persistence} of ${r.threshold} confirming samples. ${r.evidence}.`);
  } else {
    lines.push(`State: **QUIET**. Its inputs currently follow the model, so it is not firing.`);
  }
  lines.push(`• Likely cause: ${lc(def.cause)}.\n• If ignored: ${lc(def.consequence)}.\n• Action: ${lc(def.action)}.`);
  if (r.status !== "QUIET" && ttlText(r)) lines.push(`Time to limit: ${ttlText(r)}.`);
  const inputs = r.tags.length ? r.tags : def.inputs;
  return {
    intent: "rule",
    steps,
    text: lines.join("\n\n"),
    evidence: chips(f, inputs, 5),
    spark: spark(f, inputs.find((x) => SIGNAL_BY_TAG[x]?.type === "analog") ?? ""),
    confidence: r.status === "QUIET" ? null : r.confidence,
    actions: r.status === "QUIET" ? [{ kind: "diagnosis", label: "Open Diagnosis", ruleId: id }] : actionsFor(r),
    focus: { kind: "rule", id },
  };
}

function answerCompare(ctx: AskContext, ent: Entities): CopilotAnswer {
  const f = ctx.frame;
  const steps = ["Reading both histories", "Computing correlation over 2 h", "Comparing deviation from model"];
  const tags = [...ent.tags];
  for (const sub of ent.subs) {
    if (tags.length >= 2) break;
    const pool = SIGNALS.filter((d) => d.sub === sub && d.type === "analog").map((d) => d.tag);
    const m = mostAbnormal(f, pool);
    if (m && !tags.includes(m.tag)) tags.push(m.tag);
  }
  if (tags.length < 2 && ctx.focus?.kind === "tag" && !tags.includes(ctx.focus.id)) tags.push(ctx.focus.id);
  if (tags.length < 2) {
    return {
      intent: "compare",
      steps,
      text: `I need two sensors to compare. Try "Compare VIB-KLN-01 and TMP-KLN-21" or name two sub-assemblies such as "gearbox vs main motor".`,
      evidence: [],
      spark: null,
      confidence: null,
      actions: [],
      focus: ctx.focus,
    };
  }
  const [a, b] = tags;
  const da = SIGNAL_BY_TAG[a];
  const db = SIGNAL_BY_TAG[b];
  const lines: string[] = [];
  if (da.type !== "analog" || db.type !== "analog") {
    lines.push(`Correlation needs two analog signals; ${da.type !== "analog" ? a : b} is a state signal currently **${f.signals[da.type !== "analog" ? a : b].display}**.`);
  } else {
    const r = pearson(f.history[a].slice(-120), f.history[b].slice(-120));
    const strength = Math.abs(r) > 0.8 ? "strongly" : Math.abs(r) > 0.5 ? "moderately" : "weakly";
    lines.push(`Over the last 2 h **${da.name}** and **${db.name}** are ${strength} ${r >= 0 ? "positively" : "negatively"} correlated (r = ${r.toFixed(2)}).`);
    lines.push(`• ${a}: ${val(f, a)} (${fmtZ(f.signals[a].z)} vs model)\n• ${b}: ${val(f, b)} (${fmtZ(f.signals[b].z)} vs model)`);
    const za = Math.abs(f.signals[a].z ?? 0);
    const zb = Math.abs(f.signals[b].z ?? 0);
    const shared = f.rules.find((x) => x.status !== "QUIET" && x.tags.includes(a) && x.tags.includes(b));
    if (shared) lines.push(`Both are evidence for **${shared.id} ${shared.name}**, so a common cause is likely.`);
    else if (za >= 3 && zb < 2) lines.push(`Only ${a} is deviating, so the effect is local to that sensor's area rather than shared.`);
    else if (zb >= 3 && za < 2) lines.push(`Only ${b} is deviating, so the effect is local to that sensor's area rather than shared.`);
    else if (za < 2 && zb < 2) lines.push("Both follow their reference model; the relationship is normal process coupling.");
  }
  return {
    intent: "compare",
    steps,
    text: lines.join("\n\n"),
    evidence: chips(f, [a, b], 2),
    spark: spark(f, Math.abs(f.signals[a].z ?? 0) >= Math.abs(f.signals[b].z ?? 0) ? a : b),
    confidence: 88,
    actions: [{ kind: "diagnosis", label: "Open Diagnosis", ruleId: null }],
    focus: { kind: "tag", id: a },
  };
}

function answerSensorFault(ctx: AskContext, ent: Entities): CopilotAnswer {
  const f = ctx.frame;
  const steps = ["Reading validation flags", "Checking flat-line and range tests", "Comparing against redundant signals", "Reviewing R-DQ-01 / R-DQ-02"];
  const t = ent.tags.length || ent.subs.length || ctx.focus ? resolveTarget(ctx, ent) : null;
  const dq = f.rules.filter((r) => isDq(r) && r.status !== "QUIET");
  const bad = Object.values(f.signals).filter((s) => s.quality !== "Good");
  const lines: string[] = [];
  let evTags: string[] = [];
  let lead: RuleState | null = null;
  if (t?.tag) {
    const s = f.signals[t.tag];
    const def = SIGNAL_BY_TAG[t.tag];
    evTags = [t.tag];
    const mine = dq.filter((r) => r.tags.includes(t.tag!));
    lead = mine[0] ?? null;
    if (s.quality !== "Good" || mine.length) {
      lines.push(`**Yes, ${t.tag} looks like a sensor problem.** Quality flag: **${s.quality}**${s.qualityNote ? ` (${s.qualityNote})` : ""}.`);
      for (const r of mine) lines.push(`• ${r.id} ${r.name} is ${r.status.toLowerCase()}: ${r.evidence}.`);
      lines.push(`The model is substituting witness estimates. Next: ${lc(lead ? lead.action : "walk down the instrument and its cabling")}.`);
    } else {
      const sameSub = SIGNALS.filter((d) => d.sub === def.sub && d.tag !== t.tag && d.type === "analog");
      const agree = sameSub.filter((d) => Math.abs(f.signals[d.tag].z ?? 0) >= 2.5);
      lines.push(`**No sign of a sensor fault on ${t.tag}.** Quality is **Good**, no flat-line, range or jump test has tripped, and no data-quality rule is active for it.`);
      if (Math.abs(s.z ?? 0) >= 3) {
        lines.push(agree.length ? `Its deviation (${fmtZ(s.z)}) is corroborated by ${agree.slice(0, 3).map((d) => d.tag).join(", ")}, so it is a **real process change**, not an instrument error.` : `Its deviation (${fmtZ(s.z)}) has no corroborating neighbour yet; keep watching for a drift or step pattern.`);
      } else lines.push(`Reading ${val(f, t.tag)} follows the model (${fmtZ(s.z)}).`);
    }
  } else {
    if (!bad.length && !dq.length) {
      lines.push(`**No sensor faults detected.** All ${Object.keys(f.signals).length} signals have **Good** quality; ${f.pipeline.held} held, ${f.pipeline.invalid} invalid, ${f.pipeline.suspect} suspect. R-DQ-01 and R-DQ-02 are quiet.`);
    } else {
      lines.push(`**${plural(bad.length, "signal")} flagged by validation** (${f.pipeline.invalid} invalid, ${f.pipeline.suspect} suspect, ${f.pipeline.held} held).`);
      lines.push(bad.slice(0, 5).map((s) => `• ${s.tag} ${nm(s.tag)}: ${s.quality}${s.qualityNote ? `, ${s.qualityNote}` : ""}`).join("\n"));
      for (const r of dq.slice(0, 2)) lines.push(`${r.id} ${r.name} is ${r.status.toLowerCase()}. ${r.evidence}. Action: ${lc(r.action)}.`);
      evTags = bad.map((s) => s.tag);
      lead = dq[0] ?? null;
    }
  }
  const sp = evTags.find((x) => SIGNAL_BY_TAG[x]?.type === "analog");
  return {
    intent: "sensor-fault",
    steps,
    text: lines.join("\n\n"),
    evidence: chips(f, evTags, 5),
    spark: sp ? spark(f, sp) : null,
    confidence: lead ? lead.confidence : 90,
    actions: lead ? actionsFor(lead) : [{ kind: "diagnosis", label: "Open Diagnosis", ruleId: null }],
    focus: t?.tag ? { kind: "tag", id: t.tag } : lead ? { kind: "rule", id: lead.id } : null,
  };
}

function answerHealth(ctx: AskContext, ent: Entities): CopilotAnswer {
  const f = ctx.frame;
  const steps = ["Reading sub-assembly signals", "Scoring against reference model", "Checking related rules"];
  const subId = (ent.subs[0] ?? (ctx.focus?.kind === "sub" ? ctx.focus.id : null)) as SubassemblyId | null;
  const lines: string[] = [];
  let tags: string[] = [];
  let lead: RuleState | null = null;
  let focus: Focus = null;
  if (!subId && ent.systems.length) {
    const sys = SYSTEMS.find((x) => x.id === ent.systems[0])!;
    const cell = f.systems[sys.id];
    const subs = subsOfSystem(sys.id).map((id) => f.subs[id]).sort((a, b) => a.health - b.health);
    lines.push(`**${sys.name}** health is **${cell.health}%** (${cell.status.toLowerCase()}).`);
    lines.push(subs.map((s) => `• ${subName(s.id)}: ${s.health}% ${s.status === "Normal" ? "" : `(${s.status.toLowerCase()})`}`).join("\n"));
    const rs = f.rules.filter((r) => r.status !== "QUIET" && r.system === sys.id).sort((a, b) => sevRank[b.severity] - sevRank[a.severity]);
    lead = rs[0] ?? null;
    if (lead) {
      lines.push(`Driving it: **${lead.id} ${lead.name}**. ${lead.evidence}.`);
      tags = lead.tags;
    } else lines.push("No finding is open on this system.");
    focus = lead ? { kind: "rule", id: lead.id } : null;
  } else if (subId) {
    const cell = f.subs[subId];
    const sigs = SIGNALS.filter((d) => d.sub === subId && d.type === "analog");
    const worst = sigs.map((d) => f.signals[d.tag]).sort((a, b) => Math.abs(b.z ?? 0) - Math.abs(a.z ?? 0));
    lines.push(`**${subName(subId)}** health is **${cell.health}%** (${cell.status === "Normal" ? "normal" : cell.status.toLowerCase()}), from ${sigs.length} analog signals.`);
    lines.push(worst.slice(0, 3).map((s) => `• ${s.tag} ${nm(s.tag)}: ${val(f, s.tag)} (${fmtZ(s.z)})`).join("\n"));
    const rs = rulesFor(f, null, subId);
    lead = rs[0] ?? null;
    lines.push(lead ? `Open finding: **${lead.id} ${lead.name}** (${lead.status.toLowerCase()}). ${lead.evidence}. Action: ${lc(lead.action)}.` : "No rule is open for this sub-assembly; every signal follows its model.");
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

function answerHelp(ctx: AskContext): CopilotAnswer {
  return {
    intent: "help",
    steps: ["Loading capabilities"],
    text:
      "I am the ULTRON Copilot for KLN-01. I answer from the live plant, so every number is current. You can ask me:\n\n" +
      "• **Status**: \"How is the plant?\" or \"Any early warnings?\"\n" +
      "• **Why**: \"Why is gearbox vibration high?\" or \"Why is TMP-KLN-05 abnormal?\"\n" +
      "• **Predict**: \"When will the winding temperature hit its limit?\"\n" +
      "• **Recommend**: \"What should I do first?\"\n" +
      "• **Explain a rule**: \"Explain R-DRV-08\"\n" +
      "• **Compare**: \"Compare VIB-KLN-01 and VIB-KLN-02\"\n" +
      "• **Sensor trust**: \"Is TMP-KLN-21 a sensor fault?\"\n" +
      "• **Health**: \"How is the thrust system?\"",
    evidence: [],
    spark: null,
    confidence: null,
    actions: [],
    focus: ctx.focus,
  };
}

function answerFallback(ctx: AskContext): CopilotAnswer {
  const h = answerHelp(ctx);
  return { ...h, intent: "fallback", text: `I could not map that to a plant question. ${overallLine(ctx.frame)}\n\n` + h.text.replace(/^I am the ULTRON Copilot for KLN-01\. I answer from the live plant, so every number is current\. /, "") };
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export function ask(question: string, context: AskContext): CopilotAnswer {
  const ent = resolveEntities(question);
  // Conversation focus only carries over for pronoun follow-ups ("is it a sensor fault?").
  const ctx: AskContext = /\b(it|its|this|that|these|those)\b/.test(norm(question)) ? context : { ...context, focus: null };
  switch (classify(question, ent)) {
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

/** Pre-written insight offered when a rule newly becomes ACTIVE. */
export function proactiveInsight(rule: RuleState, ctx: AskContext): CopilotAnswer {
  const f = ctx.frame;
  const a = answerRule({ ...ctx, focus: null }, { rules: [rule.id], tags: [], subs: [], systems: [] });
  const lead = rule.tags.find((x) => SIGNAL_BY_TAG[x]?.type === "analog");
  const intro = `**New finding: ${rule.id} ${rule.name}** (${rule.severity}). ${rule.evidence}.${ttlText(rule) ? ` Time to limit ${ttlText(rule)}.` : ""} ${overallLine(f)}`;
  return { ...a, intent: "rule", steps: ["Rule newly confirmed", "Reading live evidence", "Preparing recommendation"], text: `${intro}\n\nLikely cause: ${lc(rule.cause)}. Recommended: ${lc(rule.action)}.`, spark: lead ? spark(f, lead) : null };
}

/** Suggested prompts that follow the plant state. */
export function suggestions(f: SimFrame, focus: Focus): string[] {
  const act = activeRules(f);
  const pend = pendingRules(f);
  const out: string[] = [];
  if (act.length) {
    const r = act[0];
    out.push(`Why did ${r.id} fire?`);
    if (ttlText(r) || !isDq(r)) out.push(r.tags[0] && SIGNAL_BY_TAG[r.tags[0]]?.type === "analog" ? `How long until ${r.tags[0]} hits its limit?` : "How long until the trip limit?");
    out.push("What should I do first?");
    out.push(r.tags[0] ? `Is ${r.tags[0]} a sensor fault?` : "Are any sensors faulty?");
    if (act.length > 1) out.push("Summarise the plant status");
  } else {
    out.push("How is the plant?");
    if (pend.length) out.push(`Explain ${pend[0].id}`);
    else out.push("Any early warnings?");
    out.push("Predict the next 24 hours");
    out.push("Compare VIB-KLN-01 and VIB-KLN-02");
    out.push("Are any sensors faulty?");
  }
  if (focus?.kind === "sub") out.push(`How is ${subName(focus.id)}?`);
  out.push("What can you do?");
  return out.slice(0, 5);
}

export function ruleNameById(id: string): string {
  return RULE_BY_ID[id]?.name ?? id;
}

export type { SignalDef };
