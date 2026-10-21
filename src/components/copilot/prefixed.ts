import type { SimFrame } from "@shared/lib/kiln-sim/engine";
import type { FindingDto } from "@shared/types/monitoring";
import type { InsightsResponse } from "@shared/types/insights";
import type { PmsLine } from "@shared/types/pms";
import type { FleetConditionRow } from "@backend/services/monitoring-service";
import type { ConditionStrip } from "@backend/services/case-service";
import type { SupportTicket } from "@backend/routes/support";
import type { AssetIqQuestion } from "@backend/routes/assetiq";
import { isOpenStage, planDues, planKey } from "@shared/lib/pms";
import { planRound } from "@/components/maintenance/pms-model";
import { crossingsAt, durationText, failureChance, fmt, rangeText, rulRows, type RulRow } from "@/components/assets/prognosis/prognosis-derive";
import { chips, spark, type ActionSpec, type CopilotAnswer, type EvidenceChip, type IntentId } from "./copilot-engine";

/* ==========================================================================
   AssetIQ · the account's own questions (assetiq_questions). Each question
   names an answer kind; the answer is worked out when it is asked, from the
   same data the pages show:

     machine health and condition   /api/fleet/condition
     open alarms                    /api/cases/condition
     remaining life and forecasts   /api/insights (per machine)
     what changed                   /api/findings (since)
     maintenance due                /api/maintenance/pms/line
     support tickets                /api/support/tickets
     live readings and checks       the running engines' frames

   Answers say what is true now, in plain words (docs/plain-language.md), and
   say plainly when there is nothing to report. Nothing is invented: a figure
   that is not in the data is left out.
   ========================================================================== */

export type { AssetIqQuestion };

export interface PrefixedContext {
  plantId: string | null;
  plantName: string;
  /** The active plant's machines the account opens, in plant order. */
  machines: Array<{ id: string; name: string }>;
  /** Every plant the account opens. */
  plants: Array<{ id: string; name: string }>;
  /** Live frames of the active plant's simulated machines. */
  frames: Record<string, SimFrame>;
  /** Short names the machine pills use ("Grate cooler"), by machine id. */
  shortNames: Record<string, string>;
  /** Every machine the account opens, by id (for answers across plants). */
  allNames: Record<string, string>;
}

const SEV_RANK: Record<string, number> = { Critical: 2, Alert: 1, Normal: 0 };
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

async function get<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return ((await res.json()) as { data?: T }).data ?? null;
  } catch {
    return null;
  }
}

function answer(intent: IntentId, steps: string[], text: string, extra: Partial<CopilotAnswer> = {}): CopilotAnswer {
  return { intent, steps, text, evidence: [], spark: null, confidence: null, actions: [], focus: null, ...extra };
}

/** Readings as chips without the σ figure (the answer text says what matters). */
const plainChips = (f: SimFrame, tags: string[], max = 4): EvidenceChip[] => chips(f, tags, max).map((c) => ({ ...c, z: null }));

const conditionWord = (status: string | null, health: number | null) => (health === null && !status ? "No data" : status === "Healthy" ? "Normal" : (status ?? "Normal"));

/* ---------------------------------------------------------------- data */

interface Loaded {
  condition: FleetConditionRow[];
  alarms: ConditionStrip | null;
}

async function loadCondition(ctx: PrefixedContext, all: boolean): Promise<Loaded> {
  const [condition, alarms] = await Promise.all([
    get<FleetConditionRow[]>(all || !ctx.plantId ? "/api/fleet/condition" : `/api/fleet/condition?plantId=${encodeURIComponent(ctx.plantId)}`),
    all ? Promise.resolve(null) : ctx.plantId ? get<ConditionStrip>(`/api/cases/condition?plantId=${encodeURIComponent(ctx.plantId)}`) : Promise.resolve(null),
  ]);
  return { condition: condition ?? [], alarms };
}

async function loadInsights(ids: string[]): Promise<Record<string, InsightsResponse>> {
  const out: Record<string, InsightsResponse> = {};
  await Promise.all(
    ids.map(async (id) => {
      const d = await get<InsightsResponse>(`/api/insights?machineId=${encodeURIComponent(id)}`);
      if (d) out[id] = d;
    }),
  );
  return out;
}

/** "Schultheiss VPC 066 — Unit 03" → "Unit 03": the part after a dash names the unit. */
const shorten = (name: string) => (name.includes(" — ") ? name.split(" — ").pop()!.trim() : name);
const nameOf = (ctx: PrefixedContext, id: string) => shorten(ctx.shortNames[id] ?? ctx.machines.find((m) => m.id === id)?.name ?? ctx.allNames[id] ?? id);
const STAND_WORD = ["Normal", "Alert", "Critical"];

/** Rules raising an alarm (or building toward one) on a live machine, worst first. */
function liveProblems(f: SimFrame) {
  // Something measured going wrong comes before a service-life reminder (nothing measured shows wear).
  const reminder = (r: { category: string }) => (r.category === "Service life" ? 1 : 0);
  return f.rules
    .filter((r) => r.status !== "QUIET" && r.category !== "Data quality")
    .sort(
      (a, b) =>
        reminder(a) - reminder(b) || (SEV_RANK[b.severity] ?? 0) - (SEV_RANK[a.severity] ?? 0) || (a.status === "ACTIVE" ? 0 : 1) - (b.status === "ACTIVE" ? 0 : 1),
    );
}

/** A machine's standing: its evaluated condition, raised to the worst alarm open on it. */
function standing(c: FleetConditionRow, alarms: ConditionStrip["alarms"] | null): number {
  const own = SEV_RANK[conditionWord(c.status, c.health)] ?? 0;
  // Without the alarm list (across plants), the machine's open problem counts stand in for it.
  const worstAlarm = alarms
    ? Math.max(0, ...alarms.filter((a) => a.machineId === c.machineId).map((a) => SEV_RANK[a.severity] ?? 0))
    : c.findings.critical > 0
      ? 2
      : c.findings.advisory > 0
        ? 1
        : 0;
  return Math.max(own, worstAlarm);
}

/* ---------------------------------------------------------------- answers */

async function plantStatus(ctx: PrefixedContext): Promise<CopilotAnswer> {
  const { condition, alarms } = await loadCondition(ctx, false);
  const rows = ctx.machines.map((m) => ({ m, c: condition.find((x) => x.machineId === m.id) }));
  // A machine stands at its evaluated condition, raised to the worst alarm open on it.
  const words = rows.map((r) => (r.c ? STAND_WORD[standing(r.c, alarms?.alarms ?? null)] : "No data"));
  const count = (w: string) => words.filter((x) => x === w).length;
  const worstWord = words.includes("Critical") ? "Critical" : words.includes("Alert") ? "Alert" : rows.length ? "Normal" : "No data";
  const scored = rows.filter((r) => r.c?.health !== null && r.c?.health !== undefined);
  const lowest = scored.sort((a, b) => (a.c!.health ?? 0) - (b.c!.health ?? 0))[0];
  const open = alarms?.alarms ?? [];
  const unacked = open.filter((a) => !a.ackedAt).length;
  const lines = rows
    .map((r, i) => ({ r, w: words[i] }))
    .sort((a, b) => (SEV_RANK[b.w] ?? -1) - (SEV_RANK[a.w] ?? -1) || (a.r.c?.health ?? 101) - (b.r.c?.health ?? 101))
    .map(({ r, w }) => {
      const n = open.filter((a) => a.machineId === r.m.id).length;
      return `• **${nameOf(ctx, r.m.id)}**: ${w}${r.c?.health != null ? `, health ${Math.round(r.c.health)} of 100` : ""}${n ? `, ${plural(n, "open alarm")}` : ""}`;
    });
  const text = [
    `**${ctx.plantName} is ${worstWord === "Normal" ? "running normally" : `at ${worstWord}`}.** Of its ${plural(rows.length, "machine")}, ${count("Normal")} ${count("Normal") === 1 ? "is" : "are"} normal, ${count("Alert")} at Alert and ${count("Critical")} at Critical.${lowest ? ` The lowest health is ${nameOf(ctx, lowest.m.id)} at ${Math.round(lowest.c!.health!)} of 100.` : ""}`,
    lines.join("\n"),
    open.length
      ? `${plural(open.length, "alarm is", "alarms are")} open${unacked ? `; ${unacked} of them nobody has acknowledged yet` : ", and all have been acknowledged"}.`
      : "No alarm is open.",
  ].join("\n\n");
  return answer("status", ["Reading each machine's health and condition", "Counting the open alarms"], text);
}

async function openAlarms(ctx: PrefixedContext, all: boolean): Promise<CopilotAnswer> {
  const plants = all ? ctx.plants : ctx.plants.filter((p) => p.id === ctx.plantId);
  const strips = await Promise.all(plants.map(async (p) => ({ p, s: await get<ConditionStrip>(`/api/cases/condition?plantId=${encodeURIComponent(p.id)}`) })));
  const list = strips.flatMap(({ p, s }) => (s?.alarms ?? []).map((a) => ({ ...a, plant: p.name })));
  if (!list.length) return answer("status", ["Reading the open alarms"], `**No alarm is open${all ? " in any plant" : ` in ${ctx.plantName}`}.** Every machine's readings are inside their limits.`);
  list.sort((a, b) => (SEV_RANK[b.severity] ?? 0) - (SEV_RANK[a.severity] ?? 0) || a.since.localeCompare(b.since));
  const unacked = list.filter((a) => !a.ackedAt);
  const critical = list.filter((a) => a.severity === "Critical").length;
  const shown = list.slice(0, 10).map((a) => {
    const who = all ? `${a.plant} · ${shorten(a.machineName)}` : nameOf(ctx, a.machineId);
    return `• **${a.severity}** · ${who}: ${a.title}${a.where ? ` (${a.where})` : ""}${a.ackedAt ? ` · acknowledged by ${a.ackedBy ?? "someone"}` : " · **not acknowledged**"}`;
  });
  const text = [
    `**${plural(list.length, "alarm is", "alarms are")} open${all ? " across your plants" : ` in ${ctx.plantName}`}**: ${critical} Critical and ${list.length - critical} Alert. ${unacked.length ? `Nobody has acknowledged ${unacked.length} of them.` : "All have been acknowledged."}`,
    shown.join("\n") + (list.length > 10 ? `\n• …and ${list.length - 10} more on the Maintenance page, under Problems.` : ""),
    unacked.length ? "Acknowledge an alarm once someone is looking at it, so the team knows it is being handled." : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  return answer("status", ["Reading the open alarms", "Checking which are acknowledged"], text);
}

async function worstMachine(ctx: PrefixedContext, all: boolean): Promise<CopilotAnswer> {
  const { condition, alarms } = await loadCondition(ctx, all);
  const pool = all ? condition : condition.filter((c) => ctx.machines.some((m) => m.id === c.machineId));
  if (!pool.length) return answer("status", ["Reading machine health"], "No machine has a health score yet, so none stands out.");
  const list = alarms?.alarms ?? null;
  const ranked0 = [...pool].sort((a, b) => standing(b, list) - standing(a, list) || (a.health ?? 101) - (b.health ?? 101));
  const worst = ranked0[0];
  const plantName = ctx.plants.find((p) => p.id === worst.plantId)?.name;
  const label = all ? `${nameOf(ctx, worst.machineId)}${plantName ? ` (${plantName})` : ""}` : nameOf(ctx, worst.machineId);
  const word = STAND_WORD[standing(worst, list)];
  const f = ctx.frames[worst.machineId];
  const top = f ? liveProblems(f)[0] : undefined;
  // The same alarm count as the plant summary (open alarms); across plants, the open problems per machine.
  const mine = (alarms?.alarms ?? []).filter((a) => a.machineId === worst.machineId);
  const counts = alarms
    ? `${plural(mine.length, "open alarm")}${mine.some((a) => !a.ackedAt) ? ` (${mine.filter((a) => !a.ackedAt).length} not acknowledged)` : ""}`
    : `${plural(worst.findings.critical, "Critical problem")} and ${plural(worst.findings.advisory, "Alert")} open`;
  const parts = [`**${label} needs attention most.** It is at ${word}${worst.health != null ? ` with health ${Math.round(worst.health)} of 100` : ""}, with ${counts}.`];
  if (top) {
    parts.push(`The main reason: **${top.plainTitle || top.name}**. ${top.plainWhat ?? ""}`.trim());
    if (top.plainTodo) parts.push(`What to do: ${top.plainTodo}`);
  }
  const ranked = ranked0
    .slice(1, 4)
    .map((c) => `• ${nameOf(ctx, c.machineId)}: ${STAND_WORD[standing(c, list)]}${c.health != null ? `, health ${Math.round(c.health)}` : ""}`);
  if (ranked.length) parts.push(`Next in line:\n${ranked.join("\n")}`);
  const tags = top ? [...(top.tags ?? [])] : [];
  return answer("health", ["Ranking machines by condition, then by health", "Reading the worst machine's live checks"], parts.join("\n\n"), {
    evidence: f && tags.length ? plainChips(f, tags) : [],
    spark: f && tags[0] ? spark(f, tags[0]) : null,
    machineId: worst.machineId,
    actions: [{ kind: "diagnosis", label: "Open Diagnosis", ruleId: top?.id ?? null, machineId: worst.machineId }],
  });
}

async function firstAction(ctx: PrefixedContext): Promise<CopilotAnswer> {
  const { alarms } = await loadCondition(ctx, false);
  // Live machines: the worst raised check across the plant; others: their oldest open alarm.
  const live = ctx.machines.flatMap((m) => {
    const f = ctx.frames[m.id];
    return f ? liveProblems(f).filter((r) => r.status === "ACTIVE").map((r) => ({ m, f, r })) : [];
  });
  live.sort((a, b) => (SEV_RANK[b.r.severity] ?? 0) - (SEV_RANK[a.r.severity] ?? 0) || (a.r.priority ?? "P9").localeCompare(b.r.priority ?? "P9"));
  const open = (alarms?.alarms ?? []).slice().sort((a, b) => (SEV_RANK[b.severity] ?? 0) - (SEV_RANK[a.severity] ?? 0) || a.since.localeCompare(b.since));
  if (!live.length && !open.length) return answer("recommend", ["Looking for raised problems and open alarms"], `**Nothing needs doing right now.** No problem is raised and no alarm is open in ${ctx.plantName}. Keep the planned rounds going.`);
  if (live.length) {
    const { m, f, r } = live[0];
    const rest = live.slice(1, 4).map((x) => `• ${x.r.severity} · ${nameOf(ctx, x.m.id)}: ${x.r.plainTitle || x.r.name}`);
    const text = [
      `**Start with ${nameOf(ctx, m.id)}: ${r.plainTitle || r.name}** (${r.severity}).`,
      r.plainWhat ?? "",
      r.plainTodo ? `**Do this:** ${r.plainTodo}` : "",
      rest.length ? `Then:\n${rest.join("\n")}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    const actions: ActionSpec[] = [
      { kind: "mitigate", label: "Apply short-term fix", ruleId: r.id, machineId: m.id },
      { kind: "workorder", label: "Create work order", ruleId: r.id, machineId: m.id },
      { kind: "diagnosis", label: "Open Diagnosis", ruleId: r.id, machineId: m.id },
    ];
    return answer("recommend", ["Ranking raised problems by severity and priority", "Reading what to do for the first one"], text, {
      evidence: plainChips(f, r.tags ?? []),
      spark: r.tags?.[0] ? spark(f, r.tags[0]) : null,
      actions,
      machineId: m.id,
      focus: { kind: "rule", id: r.id, machineId: m.id },
    });
  }
  const a = open[0];
  return answer(
    "recommend",
    ["Ranking open alarms by severity and age"],
    [
      `**Start with ${shorten(a.machineName)}: ${a.title}** (${a.severity}${a.ackedAt ? "" : ", not acknowledged"}).`,
      a.where ? `Where: ${a.where}.` : "",
      `Send someone to check it and acknowledge the alarm once they are on it. ${open.length > 1 ? `${plural(open.length - 1, "other alarm is", "other alarms are")} open after this one.` : ""}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    { actions: [{ kind: "diagnosis", label: "Open Diagnosis", ruleId: null, machineId: a.machineId }], machineId: a.machineId },
  );
}

function explainLive(ctx: PrefixedContext, id: string, f: SimFrame): CopilotAnswer {
  const problems = liveProblems(f);
  const name = nameOf(ctx, id);
  if (!problems.length) {
    return answer("why", ["Reading the machine's live checks"], `**Nothing is wrong with ${name} right now.** All ${plural(f.rules.length, "check")} are quiet and its readings sit where they are expected. Health is ${Math.round(f.overall)} of 100.`, { machineId: id });
  }
  const [top, ...rest] = problems;
  const text = [
    `**${name}: ${top.plainTitle || top.name}** (${top.status === "ACTIVE" ? top.severity : "being confirmed"}).`,
    top.plainWhat ?? "",
    top.plainTodo ? `**What to do:** ${top.plainTodo}` : "",
    rest.length ? `Also on this machine:\n${rest.slice(0, 4).map((r) => `• ${r.status === "ACTIVE" ? r.severity : "Being confirmed"}: ${r.plainTitle || r.name}`).join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  return answer("why", ["Reading the machine's raised checks", "Explaining the worst one in plain words"], text, {
    evidence: plainChips(f, top.tags ?? []),
    spark: top.tags?.[0] ? spark(f, top.tags[0]) : null,
    machineId: id,
    focus: { kind: "rule", id: top.id, machineId: id },
    actions: [
      { kind: "workorder", label: "Create work order", ruleId: top.id, machineId: id },
      { kind: "diagnosis", label: "Open Diagnosis", ruleId: top.id, machineId: id },
    ],
  });
}

async function explainMachine(ctx: PrefixedContext, id: string): Promise<CopilotAnswer> {
  const f = ctx.frames[id];
  if (f) return explainLive(ctx, id, f);
  const findings = (await get<FindingDto[]>(`/api/findings?machineId=${encodeURIComponent(id)}&status=open`)) ?? [];
  const bad = findings.filter((x) => x.severity !== "Normal").sort((a, b) => (SEV_RANK[b.severity] ?? 0) - (SEV_RANK[a.severity] ?? 0));
  if (!bad.length) return answer("why", ["Reading the machine's open findings"], `**Nothing is wrong with ${nameOf(ctx, id)} right now.** None of its readings is past a limit or behaving unusually.`, { machineId: id });
  return answer(
    "why",
    ["Reading the machine's open findings"],
    [`**${nameOf(ctx, id)} has ${plural(bad.length, "open problem")}.**`, bad.slice(0, 5).map((x) => `• **${x.severity}** · ${x.rule?.plainTitle || x.measurement?.name || x.typeName}: ${x.rule?.plainWhat || x.summary}`).join("\n")].join("\n\n"),
    { machineId: id, actions: [{ kind: "diagnosis", label: "Open Diagnosis", ruleId: null, machineId: id }] },
  );
}

async function machineHealth(ctx: PrefixedContext, id: string): Promise<CopilotAnswer> {
  const { condition } = await loadCondition(ctx, false);
  const c = condition.find((x) => x.machineId === id);
  const f = ctx.frames[id];
  const name = nameOf(ctx, id);
  const health = c?.health ?? (f ? f.overall : null);
  const head = `**${name} is at ${conditionWord(c?.status ?? null, health)}${health != null ? `, health ${Math.round(health)} of 100` : ""}.**`;
  if (!f) {
    const ins = (await loadInsights([id]))[id];
    const rows = ins ? rulRows(ins.prognosis, ins.analysis) : [];
    const weakest = [...rows].filter((r) => r.health !== null).sort((a, b) => (a.health ?? 101) - (b.health ?? 101))[0];
    return answer("health", ["Reading the machine's health", "Finding its weakest part"], [head, weakest ? `Its weakest part is **${weakest.name}** at ${Math.round(weakest.health!)} of 100.` : "Its parts have no separate scores yet."].join("\n\n"), { machineId: id });
  }
  const subs = Object.values(f.subs ?? {})
    .filter((s) => typeof s.health === "number")
    .sort((a, b) => a.health - b.health);
  const weakest = subs[0];
  const subName = (sid: string) => f.defs.subassemblies.find((s) => s.id === sid)?.name ?? sid;
  const lines = subs.slice(0, 4).map((s) => `• ${subName(s.id)}: ${Math.round(s.health)} of 100`);
  const tags = weakest ? f.defs.signals.filter((d) => d.sub === weakest.id).map((d) => d.tag) : [];
  return answer(
    "health",
    ["Reading the machine's health", "Ranking its parts by health"],
    [head, weakest ? `Its weakest part is **${subName(weakest.id)}** at ${Math.round(weakest.health)} of 100.` : "", lines.length ? `Lowest parts:\n${lines.join("\n")}` : ""].filter(Boolean).join("\n\n"),
    { evidence: plainChips(f, tags), spark: tags[0] ? spark(f, tags[0]) : null, machineId: id, actions: [{ kind: "diagnosis", label: "Open Diagnosis", ruleId: null, machineId: id }] },
  );
}

async function partDetail(ctx: PrefixedContext, id: string, part: string): Promise<CopilotAnswer> {
  const f = ctx.frames[id];
  if (!f) return machineHealth(ctx, id);
  // "inlet lamella seal" finds "Inlet seal"; "support station" finds stations 1–3.
  const words = (x: string) => x.toLowerCase().replace(/[^a-z ]+/g, " ").split(/\s+/).filter((w) => w.length > 2);
  const want = words(part);
  const subs = f.defs.subassemblies.filter((s) => {
    const name = words(s.name);
    return name.length > 0 && (name.every((w) => want.includes(w)) || want.every((w) => name.includes(w)));
  });
  if (!subs.length) return machineHealth(ctx, id);
  const blocks = subs.map((sa) => {
    const h = f.subs?.[sa.id]?.health;
    const rules = liveProblems(f).filter((r) => r.subs.includes(sa.id));
    const sensors = f.defs.signals.filter((d) => d.sub === sa.id);
    const off = sensors.filter((d) => f.signals[d.tag] && f.signals[d.tag].status !== "Normal");
    return `**${sa.name}**: ${typeof h === "number" ? `health ${Math.round(h)} of 100` : "no score yet"}. ${
      rules.length ? `${rules.map((r) => r.plainTitle || r.name).join("; ")}.` : "No problem is raised on it."
    } ${off.length ? `${plural(off.length, "reading is", "readings are")} outside normal: ${off.map((d) => `${d.name} ${f.signals[d.tag].display} ${d.unit}`).join(", ")}.` : `All ${plural(sensors.length, "reading")} are normal.`}`;
  });
  const tags = subs.flatMap((sa) => f.defs.signals.filter((d) => d.sub === sa.id).map((d) => d.tag));
  return answer("health", ["Finding the part", "Reading its health, checks and readings"], blocks.join("\n\n"), {
    evidence: plainChips(f, tags, 5),
    spark: tags[0] ? spark(f, tags[0]) : null,
    machineId: id,
    focus: { kind: "sub", id: subs[0].id, machineId: id },
  });
}

async function nextFailure(ctx: PrefixedContext): Promise<CopilotAnswer> {
  const ins = await loadInsights(ctx.machines.map((m) => m.id));
  const rows: Array<{ id: string; r: RulRow }> = [];
  for (const m of ctx.machines) {
    const d = ins[m.id];
    if (d) for (const r of rulRows(d.prognosis, d.analysis)) if (r.hours !== null && r.band) rows.push({ id: m.id, r });
  }
  if (!rows.length) {
    const strip = ctx.plantId ? await get<ConditionStrip>(`/api/cases/condition?plantId=${encodeURIComponent(ctx.plantId)}`) : null;
    const past = (strip?.alarms ?? []).slice().sort((a, b) => (SEV_RANK[b.severity] ?? 0) - (SEV_RANK[a.severity] ?? 0));
    return answer(
      "predict",
      ["Reading every part's remaining-life estimate", "Checking what is already past a limit"],
      past.length
        ? [
            `**No reading is trending toward a limit, but ${plural(past.length, "alarm is", "alarms are")} already open**, so those parts need a look now rather than later:`,
            past.slice(0, 5).map((a) => `• **${a.severity}** · ${nameOf(ctx, a.machineId)}: ${a.title}`).join("\n"),
          ].join("\n\n")
        : `**No part is heading toward a limit.** No reading in ${ctx.plantName} is trending toward its alarm limit, so no repair date can be estimated. Keep to the planned rounds.`,
    );
  }
  rows.sort((a, b) => (a.r.hours ?? 0) - (b.r.hours ?? 0));
  const [first, ...rest] = rows;
  const sixMonths = 4320;
  const text = [
    `**${first.r.name} on ${nameOf(ctx, first.id)} is likely to need repair first: in about ${durationText(first.r.hours!)}**${rangeText(first.r.band!.lo, first.r.band!.hi) !== durationText(first.r.hours!) ? ` (likely ${rangeText(first.r.band!.lo, first.r.band!.hi)})` : ""}.`,
    first.r.driver ? `What sets it: ${first.r.driver.fault}.` : first.r.dueLabel ? `What sets it: ${first.r.dueLabel}.` : "",
    `Chance it fails within 6 months: ${failureChance(first.r.band!, sixMonths)} %. This comes from how fast its readings are moving toward their limits, so it firms up as more readings arrive.`,
    rest.length ? `After that:\n${rest.slice(0, 4).map((x) => `• ${x.r.name} (${nameOf(ctx, x.id)}): about ${durationText(x.r.hours!)}`).join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  return answer("predict", ["Reading every part's remaining-life estimate", "Sorting them by time left"], text, { machineId: first.id });
}

async function alarmForecast(ctx: PrefixedContext): Promise<CopilotAnswer> {
  const ins = await loadInsights(ctx.machines.map((m) => m.id));
  const hits = ctx.machines.flatMap((m) => {
    const d = ins[m.id];
    return d ? crossingsAt(d.prognosis, "7d").filter((x) => x.c.level === "alarm").map((x) => ({ id: m.id, name: x.s.name, unit: x.s.unit, hours: x.c.hours, now: x.s.current, limit: x.s.alarm })) : [];
  });
  if (!hits.length) {
    const strip = ctx.plantId ? await get<ConditionStrip>(`/api/cases/condition?plantId=${encodeURIComponent(ctx.plantId)}`) : null;
    const past = (strip?.alarms ?? []).filter((a) => a.tag).sort((a, b) => (SEV_RANK[b.severity] ?? 0) - (SEV_RANK[a.severity] ?? 0));
    return answer(
      "predict",
      ["Reading each sensor's 7-day forecast", "Checking which readings are already past a limit"],
      [
        `**No reading is trending toward its alarm limit in the next 7 days** in ${ctx.plantName}.`,
        past.length ? `${past.length === 1 ? "1 reading is already past its limit" : `${past.length} readings are already past their limits`} now:\n${past.slice(0, 6).map((a) => `• **${a.severity}** · ${nameOf(ctx, a.machineId)}: ${a.title}`).join("\n")}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    );
  }
  hits.sort((a, b) => a.hours - b.hours);
  const already = hits.filter((h) => h.hours === 0);
  const coming = hits.filter((h) => h.hours > 0);
  const line = (h: (typeof hits)[number]) =>
    `• **${h.name}** (${nameOf(ctx, h.id)}): now ${fmt(h.now)} ${h.unit}, alarm limit ${fmt(h.limit)} ${h.unit}${h.hours ? `, reached in about ${durationText(h.hours)}` : ""}`;
  const text = [
    `**${plural(hits.length, "reading is", "readings are")} expected at an alarm limit within 7 days.**`,
    already.length ? `Already past it:\n${already.slice(0, 5).map(line).join("\n")}` : "",
    coming.length ? `Getting there:\n${coming.slice(0, 6).map(line).join("\n")}` : "",
    "Each forecast follows the reading's recent trend; the Prognosis page shows the full curve and its likely range.",
  ]
    .filter(Boolean)
    .join("\n\n");
  return answer("predict", ["Reading each sensor's 7-day forecast", "Finding where it crosses the alarm limit"], text);
}

async function untrustedSensors(ctx: PrefixedContext): Promise<CopilotAnswer> {
  const out: Array<{ id: string; name: string; why: string; tag: string }> = [];
  let checked = 0;
  for (const m of ctx.machines) {
    const f = ctx.frames[m.id];
    if (!f) continue;
    for (const d of f.defs.signals) {
      const s = f.signals[d.tag];
      if (!s) continue;
      checked += 1;
      if (s.quality === "Good") continue;
      out.push({ id: m.id, name: d.name, tag: d.tag, why: s.quality === "Suspect" ? "may be wrong" : /stale|frozen|flat|stuck/i.test(s.qualityNote ?? "") ? "has stopped updating" : "is not usable" });
    }
  }
  if (!checked) return answer("sensor-fault", ["Checking each sensor's readings"], "These machines have no live sensor checks to read yet.");
  if (!out.length) return answer("sensor-fault", ["Checking each sensor's readings"], `**All ${plural(checked, "sensor")} are giving readings you can trust.** None is stuck, out of range or disagreeing with the readings around it.`);
  const first = out[0];
  const f = ctx.frames[first.id];
  return answer(
    "sensor-fault",
    ["Checking each sensor's readings", "Listing the ones that failed a check"],
    [`**${plural(out.length, "sensor")} of ${checked} should not be trusted right now.**`, out.slice(0, 8).map((x) => `• **${x.name}** (${nameOf(ctx, x.id)}) ${x.why}`).join("\n"), "Do not act on these readings alone: check the sensor and its wiring, or compare with a hand-held reading."].join("\n\n"),
    { evidence: f ? plainChips(f, out.filter((x) => x.id === first.id).map((x) => x.tag)) : [], machineId: first.id },
  );
}

async function lastHours(ctx: PrefixedContext, hours: number): Promise<CopilotAnswer> {
  const since = new Date(Date.now() - hours * 3_600_000).toISOString();
  const lists = await Promise.all(ctx.machines.map((m) => get<FindingDto[]>(`/api/findings?machineId=${encodeURIComponent(m.id)}&status=all&since=${encodeURIComponent(since)}&limit=200`)));
  // Alarms only (past a limit, or a known problem pattern), as the alarm list counts them; early warnings stay on Diagnosis.
  const all = lists.flatMap((l) => l ?? []).filter((x) => x.severity !== "Normal" && (x.type === "limit_exceeded" || x.type === "rule_pattern"));
  const opened = all.filter((x) => x.openedAt >= since);
  const cleared = all.filter((x) => x.clearedAt && x.clearedAt >= since);
  const stillOpen = opened.filter((x) => !x.clearedAt);
  if (!opened.length && !cleared.length) return answer("status", [`Reading the last ${hours} hours of alarms`], `**Nothing changed in the last ${hours} hours.** No alarm was raised and none cleared.`);
  const label = (x: FindingDto) => `${nameOf(ctx, x.machineId)}: ${x.rule?.plainTitle || x.measurement?.name || x.typeName}`;
  // A problem that came and went several times is one problem: count and list each once.
  const distinct = (xs: FindingDto[]) => [...new Map(xs.map((x) => [label(x), x])).values()];
  const kinds = distinct(opened);
  const openKinds = distinct(stillOpen).sort((a, b) => (SEV_RANK[b.severity] ?? 0) - (SEV_RANK[a.severity] ?? 0));
  const clearedKinds = distinct(cleared).filter((x) => !openKinds.some((o) => label(o) === label(x)));
  const text = [
    `**In the last ${hours} hours ${plural(kinds.length, "different alarm")} went off${opened.length > kinds.length ? ` (${opened.length} times in all, as some came and went)` : ""}.** ${openKinds.length ? `${openKinds.length} ${openKinds.length === 1 ? "is" : "are"} still open.` : "All of them have cleared again."}`,
    openKinds.length ? `Still open:\n${openKinds.slice(0, 6).map((x) => `• **${x.severity}** · ${label(x)}`).join("\n")}` : "",
    clearedKinds.length ? `Came and went:\n${clearedKinds.slice(0, 5).map((x) => `• ${label(x)}`).join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  return answer("status", [`Reading the last ${hours} hours of findings`, "Sorting raised from cleared"], text);
}

async function maintenanceDue(ctx: PrefixedContext): Promise<CopilotAnswer> {
  const line = await get<PmsLine>("/api/maintenance/pms/line");
  const ids = new Set(ctx.machines.map((m) => m.id));
  const snaps = (line?.snapshots ?? []).filter((s) => ids.has(s.machineId));
  if (!snaps.length) return answer("recommend", ["Reading the maintenance plans"], `${ctx.plantName} has no planned maintenance in ULTRON yet, so nothing is due here.`);
  const now = Date.now();
  const plans = snaps.flatMap((s) => s.plans);
  const dues = planDues(plans, snaps.flatMap((s) => s.records), now);
  const byState = (st: string) => plans.filter((p) => dues.get(planKey(p))?.state === st);
  const overdue = byState("overdue");
  const due = byState("due");
  const soon = byState("soon");
  const openWos = snaps.flatMap((s) => s.workOrders).filter((w) => isOpenStage(w.stage));
  const name = (p: (typeof plans)[number]) => `${nameOf(ctx, p.machineId)}${p.unitCode && p.unitCode !== "GEN" ? ` ${p.unitCode}` : ""}${p.kind === "sensor" ? " instruments" : ""} · ${planRound(p)}`;
  const text = [
    `**${plural(overdue.length, "round is", "rounds are")} overdue, ${due.length} due now and ${soon.length} due within 7 days.** ${plural(openWos.length, "work order is", "work orders are")} open.`,
    overdue.length ? `Overdue:\n${overdue.slice(0, 5).map((p) => `• ${name(p)}`).join("\n")}` : "",
    due.length ? `Due now:\n${due.slice(0, 5).map((p) => `• ${name(p)}`).join("\n")}` : "",
    "Tick off each round on the Maintenance page, under Preventive.",
  ]
    .filter(Boolean)
    .join("\n\n");
  return answer("recommend", ["Reading the maintenance plans", "Checking what is due"], text);
}

async function compareMachines(ctx: PrefixedContext): Promise<CopilotAnswer> {
  const { condition, alarms } = await loadCondition(ctx, false);
  const rows = ctx.machines
    .map((m) => {
      const mine = (alarms?.alarms ?? []).filter((a) => a.machineId === m.id);
      return { m, c: condition.find((x) => x.machineId === m.id), n: mine.length, u: mine.filter((a) => !a.ackedAt).length };
    })
    .sort((a, b) => (b.c?.health ?? -1) - (a.c?.health ?? -1));
  if (!rows.length) return answer("compare", ["Reading each machine"], "There are no machines to compare in this plant.");
  const best = rows[0];
  const worst = rows[rows.length - 1];
  const text = [
    `**${nameOf(ctx, best.m.id)} is in the best shape${best.c?.health != null ? ` (health ${Math.round(best.c.health)})` : ""}; ${nameOf(ctx, worst.m.id)} the worst${worst.c?.health != null ? ` (health ${Math.round(worst.c.health)})` : ""}.**`,
    rows
      .map(
        (r) =>
          `• **${nameOf(ctx, r.m.id)}**: ${r.c ? STAND_WORD[standing(r.c, alarms?.alarms ?? null)] : "No data"}${r.c?.health != null ? `, health ${Math.round(r.c.health)}` : ""}, ${plural(r.n, "open alarm")}${r.u ? `, ${r.u} not acknowledged` : ""}`,
      )
      .join("\n"),
  ].join("\n\n");
  return answer("compare", ["Reading each machine's health and alarms", "Ranking them"], text);
}

async function supportTickets(): Promise<CopilotAnswer> {
  const tickets = (await get<SupportTicket[]>("/api/support/tickets")) ?? [];
  const open = tickets.filter((t) => t.status === "open");
  const answered = tickets.filter((t) => t.status === "answered");
  if (!tickets.length) return answer("help", ["Reading the support tickets"], "**There are no support tickets.** Raise one on the Configure page, under Support, whenever you need help from the Oswar Teck team.");
  const line = (t: SupportTicket) => `• #${t.id} ${t.subject} (${t.plantName}${t.urgent ? ", urgent" : ""})`;
  return answer(
    "help",
    ["Reading the support tickets"],
    [
      `**${plural(open.length, "ticket is", "tickets are")} waiting for an answer** and ${plural(answered.length, "has", "have")} been answered.`,
      open.length ? `Waiting:\n${open.slice(0, 6).map(line).join("\n")}` : "",
      answered.length ? `Answered:\n${answered.slice(0, 4).map(line).join("\n")}` : "",
      "Open each one on the Configure page, under Support.",
    ]
      .filter(Boolean)
      .join("\n\n"),
  );
}

async function plantsOverview(ctx: PrefixedContext): Promise<CopilotAnswer> {
  const condition = (await get<FleetConditionRow[]>("/api/fleet/condition")) ?? [];
  const per = ctx.plants
    .map((p) => {
      const rows = condition.filter((c) => c.plantId === p.id);
      const scored = rows.filter((r) => r.health !== null);
      return {
        p,
        n: rows.length,
        critical: rows.reduce((s, r) => s + r.findings.critical, 0),
        alert: rows.reduce((s, r) => s + r.findings.advisory, 0),
        low: scored.length ? Math.min(...scored.map((r) => r.health as number)) : null,
        worst: rows.length ? STAND_WORD[Math.max(...rows.map((r) => standing(r, null)))] : "No data",
      };
    })
    .filter((x) => x.n > 0)
    .sort((a, b) => (SEV_RANK[b.worst] ?? -1) - (SEV_RANK[a.worst] ?? -1) || b.critical - a.critical || (a.low ?? 101) - (b.low ?? 101));
  if (!per.length) return answer("status", ["Reading every plant"], "None of your plants has machines with readings yet.");
  const top = per[0];
  return answer(
    "status",
    ["Reading every plant's machines", "Ranking plants by their worst machine"],
    [
      `**${top.p.name} needs attention most**: ${top.worst}, with ${plural(top.critical, "Critical problem")} and ${plural(top.alert, "Alert")} open${top.low !== null ? `; its lowest machine health is ${Math.round(top.low)} of 100` : ""}.`,
      per.map((x) => `• **${x.p.name}**: ${x.worst}, ${plural(x.n, "machine")}, ${x.critical} Critical and ${x.alert} Alert open${x.low !== null ? `, lowest health ${Math.round(x.low)}` : ""}`).join("\n"),
    ].join("\n\n"),
  );
}

/** The answer to one of the account's own questions. */
export async function answerPrefixed(q: AssetIqQuestion, ctx: PrefixedContext): Promise<CopilotAnswer> {
  const p = q.params as { machineId?: string; part?: string; hours?: number; scope?: string };
  const all = p.scope === "all";
  switch (q.intent) {
    case "plant_status":
      return plantStatus(ctx);
    case "first_action":
      return firstAction(ctx);
    case "open_alarms":
      return openAlarms(ctx, all);
    case "worst_machine":
      return worstMachine(ctx, all);
    case "explain_machine":
      return explainMachine(ctx, p.machineId ?? ctx.machines[0]?.id ?? "");
    case "machine_health":
      return machineHealth(ctx, p.machineId ?? ctx.machines[0]?.id ?? "");
    case "part_detail":
      return partDetail(ctx, p.machineId ?? ctx.machines[0]?.id ?? "", p.part ?? "");
    case "next_failure":
      return nextFailure(ctx);
    case "alarm_forecast":
      return alarmForecast(ctx);
    case "untrusted_sensors":
      return untrustedSensors(ctx);
    case "last_hours":
      return lastHours(ctx, p.hours ?? 6);
    case "maintenance_due":
      return maintenanceDue(ctx);
    case "compare_machines":
      return compareMachines(ctx);
    case "support_tickets":
      return supportTickets();
    case "plants_overview":
      return plantsOverview(ctx);
    default:
      return answer("help", [], "I do not know how to answer that one yet.");
  }
}

/** The account question a typed text is (same words, ignoring case and punctuation), if any. */
export function matchQuestion(text: string, questions: AssetIqQuestion[]): AssetIqQuestion | null {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  const t = norm(text);
  return questions.find((q) => norm(q.question) === t) ?? null;
}
