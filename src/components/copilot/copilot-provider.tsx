"use client";

/**
 * AssetIQ conversations: the chat state behind the AssetIQ "Ask" sheet and
 * the rail's sparkle launcher, run once at the app root so proactive insights
 * (alarms the server evaluation newly opens) queue while another page is open
 * and light the launcher's dot.
 *
 * Each plant is a separate workspace: its conversations are kept per primary
 * machine in localStorage, newest first. The "AI" is the deterministic intent
 * engine in `copilot-engine.ts`, answering from the live frame and the plant's
 * findings and events in the database.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { DISPLAY_MS, useKilnFleet, useKilnSimulation, usePrimaryMachineId } from "@/providers/kiln-simulation-context";
import { useApi } from "@/lib/api-cache";
import { useMachineEvents } from "@/lib/monitoring-client";
import type { FindingDto } from "@shared/types/monitoring";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { nameIds } from "@/lib/display-name";
import type { PlantDefs } from "@shared/lib/plant-defs";
import { ask, findingInsight, pendingRules, suggestions, type ActionSpec, type CopilotAnswer, type Focus, type MachineRecord, type PlantMachine } from "./copilot-engine";
import { answerPrefixed, matchQuestion, type AssetIqQuestion, type PrefixedContext } from "./prefixed";
import { usePlantMachineTabs } from "@/components/home/operator/machine-nav";

export interface Msg {
  id: string;
  role: "user" | "assistant" | "note";
  text: string;
  answer?: CopilotAnswer;
  proactive?: boolean;
  /** Severity of the finding a proactive insight reports. */
  severity?: string;
  /** Database id of the finding a proactive insight reports (each is told once). */
  findingId?: number;
  clock?: string;
}

export interface ChatThread {
  id: string;
  title: string;
  messages: Msg[];
  focus: Focus;
  /** Wall-clock ms of the last message. */
  updatedAt: number;
}

type SimWithActions = {
  performAction?: (ruleId: string, action: "acknowledge" | "mitigate" | "repair") => void;
};

const STORE_KEY = "ultron-assetiq-chats-v1";
/** The single conversation the old Copilot drawer kept per plant (sessionStorage). */
const LEGACY_KEY = "ultron-copilot-v1";
const storeKey = (machineId: string) => `${STORE_KEY}:${machineId}`;
const MAX_THREADS = 40;
const MAX_MESSAGES = 60;
/** Pause before an instant (engine) answer appears, so the question lands first. */
const THINK_MS = 420;
/** Waiting insights shown at once: the newest few, not a backlog. */
const MAX_DELIVERED = 3;
/** How long a deleted conversation can be brought back. */
const UNDO_MS = 10_000;
let uid = 0;
const nextId = () => `m${Date.now().toString(36)}${(uid++).toString(36)}`;

/** Answer text and steps with tags, rule IDs and machine IDs shown as names; chips keep the tag in their tooltip. */
function namedAnswer(a: CopilotAnswer, defs: PlantDefs | undefined, machineNames: Record<string, string>): CopilotAnswer {
  if (!defs) return a;
  return { ...a, text: nameIds(a.text, defs, machineNames), steps: a.steps.map((st) => nameIds(st, defs, machineNames)) };
}

/** A thread is titled by its first question, or by its first insight when it opened with one. */
function titleOf(messages: Msg[]): string {
  const first = messages.find((m) => m.role === "user") ?? messages.find((m) => m.role === "assistant");
  if (!first) return "";
  const line = first.text.replace(/\*\*/g, "").split(/\n|(?<=\.)\s/)[0].trim();
  return line.length > 64 ? `${line.slice(0, 63)}…` : line;
}

function loadThreads(machineId: string): ChatThread[] {
  try {
    const raw = window.localStorage.getItem(storeKey(machineId));
    if (raw) {
      const p = JSON.parse(raw) as { threads: ChatThread[] };
      return p.threads ?? [];
    }
  } catch {
    /* storage unavailable or corrupt: start empty */
  }
  // Carry over the drawer's conversation as the first thread.
  try {
    const raw = window.sessionStorage.getItem(`${LEGACY_KEY}:${machineId}`);
    if (!raw) return [];
    const p = JSON.parse(raw) as { messages: Msg[]; focus: Focus };
    if (!p.messages?.length) return [];
    const messages = p.messages;
    return [{ id: nextId(), title: titleOf(messages), messages, focus: p.focus ?? null, updatedAt: Date.now() }];
  } catch {
    return [];
  }
}

function saveThreads(machineId: string, threads: ChatThread[]) {
  try {
    const slim = threads.slice(0, MAX_THREADS).map((t) => ({ ...t, messages: t.messages.slice(-MAX_MESSAGES) }));
    window.localStorage.setItem(storeKey(machineId), JSON.stringify({ threads: slim }));
  } catch {
    /* storage full or unavailable: conversations stay in memory */
  }
}

/** What the answers speak for: one live machine, or the full line (`id` null). */
export interface ScopeOption {
  id: string | null;
  name: string;
}

export interface CopilotHeader {
  /** Machine the answers speak for, or null for the full line. */
  machineId: string | null;
  label: string;
  /** Live machines on the line (full-line scope only). */
  machineCount: number | null;
  overall: number | null;
  condition: string | null;
  signalCount: number | null;
  ruleCount: number | null;
  /** Open abnormal findings in scope, from the database; null while they load. */
  openFindings: number | null;
}

export interface CopilotState {
  /** False until the primary machine's live frame is available. */
  ready: boolean;
  header: CopilotHeader | null;
  scopes: ScopeOption[];
  scope: string | null;
  setScope: (id: string | null) => void;
  threads: ChatThread[];
  activeId: string | null;
  messages: Msg[];
  chips: string[];
  /** Suggestion text as shown: IDs replaced by names (the raw text is what gets asked). */
  chipLabel: (c: string) => string;
  doneActions: Record<string, boolean>;
  /** Findings opened since the session started that have not been shown yet. */
  nudgeCount: number;
  nudgeCritical: boolean;
  /** Adds the newest waiting findings to the open conversation. */
  showNudges: () => void;
  /** True while the Ask sheet is on screen. */
  viewing: boolean;
  setViewing: (on: boolean) => void;
  /** `label` is what the user bubble shows (a suggestion's text with names instead of IDs). */
  send: (q: string, label?: string) => void;
  /** The signed-in account's own questions (assetiq_questions), in order. */
  questions: string[];
  /** True while an answer is being worked out. */
  thinking: boolean;
  /** The answer just given to a question asked here; it plays its reveal once (history never animates). */
  freshId: string | null;
  onAction: (msgId: string, a: ActionSpec) => void;
  newChat: () => void;
  selectChat: (id: string) => void;
  /** Removes a conversation; it can be brought back with `undoDelete` for a few seconds. */
  deleteChat: (id: string) => void;
  /** The conversation deleted last, while it can still be brought back. */
  deleted: { id: string; title: string } | null;
  undoDelete: () => void;
}

const CopilotContext = createContext<CopilotState | null>(null);

export function useCopilot(): CopilotState | null {
  return useContext(CopilotContext);
}

export function CopilotProvider({ children }: { children: React.ReactNode }) {
  const primaryId = usePrimaryMachineId();
  const sim = useKilnSimulation();
  const frame = sim?.machineId === primaryId ? sim.frame : null;
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const primaryRef = useRef(primaryId);
  primaryRef.current = primaryId;
  // Every live machine of the active plant, named from the machine records.
  const fleet = useKilnFleet();
  const fleetRef = useRef(fleet);
  fleetRef.current = fleet;
  const { machines, selectedPlantId, currentUser, plants } = useIndustrialData();
  // The account's own questions; the user id keeps one account's list out of another's cache.
  const questionList = useApi<AssetIqQuestion[]>(currentUser ? `/api/assetiq/questions?u=${encodeURIComponent(currentUser.id)}` : null).data;
  const questionsRef = useRef<AssetIqQuestion[]>([]);
  questionsRef.current = questionList ?? [];
  const plantTabs = usePlantMachineTabs();
  const prefixedRef = useRef<PrefixedContext | null>(null);
  prefixedRef.current = {
    plantId: selectedPlantId,
    plantName: plants.find((p) => p.id === selectedPlantId)?.name ?? "This plant",
    machines: machines.filter((m) => m.plantId === selectedPlantId).map((m) => ({ id: m.id, name: m.name })),
    plants: plants.map((p) => ({ id: p.id, name: p.name })),
    frames: Object.fromEntries(Object.entries(fleet).map(([id, s]) => [id, s.frame])),
    shortNames: Object.fromEntries(plantTabs.flatMap((t) => (t.machineId ? [[t.machineId, t.label]] : []))),
    allNames: Object.fromEntries(machines.map((m) => [m.id, m.name])),
  };
  const [thinking, setThinking] = useState(false);
  const [freshId, setFreshId] = useState<string | null>(null);
  // Alarms come from the database: the plant's open findings and the primary machine's events.
  const openUrl = selectedPlantId ? `/api/findings?plantId=${encodeURIComponent(selectedPlantId)}&status=open&limit=500` : null;
  const plantFindings = useApi<FindingDto[]>(openUrl, { refreshMs: DISPLAY_MS }).data;
  const events = useMachineEvents(primaryId || null).data;
  const recordOf = useCallback(
    (mid: string): MachineRecord | null =>
      plantFindings ? { findings: plantFindings.filter((x) => x.machineId === mid), events: mid === primaryId ? (events ?? null) : null } : null,
    [plantFindings, events, primaryId],
  );
  const record = recordOf(primaryId);
  const recordRef = useRef(record);
  recordRef.current = record;
  const plantRef = useRef<PlantMachine[]>([]);
  plantRef.current = Object.entries(fleet).map(([id, s]) => ({ id, name: machines.find((m) => m.id === id)?.name ?? id, frame: s.frame, record: recordOf(id) }));
  const machineNamesRef = useRef<Record<string, string>>({});
  machineNamesRef.current = Object.fromEntries(machines.map((m) => [m.id, m.name]));
  /** Defs of the machine an answer came from (the primary unless it named another). */
  const defsOf = (machineId: string | undefined, f: { defs: PlantDefs }) => (machineId ? fleetRef.current[machineId]?.frame.defs : undefined) ?? f.defs;

  /** Machine the answers speak for; null asks the full line (a question naming a machine goes to it). */
  const [scope, setScopeState] = useState<string | null>(null);
  const scopeRef = useRef<string | null>(null);
  scopeRef.current = scope && fleet[scope] ? scope : null;
  const setScope = useCallback((id: string | null) => setScopeState(id), []);

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeRef = useRef<string | null>(null);
  activeRef.current = activeId;
  const [doneActions, setDoneActions] = useState<Record<string, boolean>>({});
  /** Finding ids opened since the session started, not yet shown. */
  const [nudges, setNudges] = useState<number[]>([]);
  /** Open findings already observed; null until the plant's first observation (the baseline, not news). */
  const seen = useRef<Set<number> | null>(null);
  const [viewing, setViewingState] = useState(false);
  /** Primary machine whose stored conversations `threads` holds; saving waits for it so the empty first render never overwrites storage. */
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const threadsRef = useRef(threads);
  threadsRef.current = threads;

  const active = threads.find((t) => t.id === activeId) ?? null;
  const focusRef = useRef<Focus>(null);
  focusRef.current = active?.focus ?? null;

  // Restore the plant's conversations after mount and on a plant switch (storage is client-only).
  useEffect(() => {
    setThreads(primaryId ? loadThreads(primaryId) : []);
    setLoadedFor(primaryId || null);
    setActiveId(null);
    setScopeState(null);
    setDoneActions({});
    setNudges([]);
    seen.current = null;
  }, [primaryId]);
  useEffect(() => {
    if (loadedFor && loadedFor === primaryRef.current) saveThreads(loadedFor, threads);
  }, [threads, loadedFor]);

  /** Appends to the open thread, starting one when none is open. */
  const append = useCallback((add: Msg[], focus?: Focus, threadId?: string): string => {
    let tid = threadId ?? activeRef.current;
    if (!tid) {
      tid = nextId();
      activeRef.current = tid;
      setActiveId(tid);
    }
    const id = tid;
    setThreads((ts) => {
      const cur = ts.find((t) => t.id === id) ?? { id, title: "", messages: [], focus: null, updatedAt: 0 };
      const messages = [...cur.messages, ...add].slice(-MAX_MESSAGES);
      const next: ChatThread = { ...cur, messages, focus: focus === undefined ? cur.focus : focus, title: cur.title || titleOf(messages), updatedAt: Date.now() };
      return [next, ...ts.filter((t) => t.id !== id)].slice(0, MAX_THREADS);
    });
    return id;
  }, []);

  const pushInsight = useCallback(
    (findingId: number) => {
      const f = frameRef.current;
      const finding = recordRef.current?.findings.find((x) => x.id === findingId);
      // A finding that has cleared since it was queued is no longer news; one already told is not repeated.
      if (!f || !finding || finding.clearedAt !== null) return;
      if (threadsRef.current.some((t) => t.messages.some((m) => m.findingId === findingId))) return;
      const raw = findingInsight(finding, { frame: f, focus: null, machineId: primaryRef.current, record: recordRef.current });
      const answer = namedAnswer(raw, f.defs, machineNamesRef.current);
      append([{ id: nextId(), role: "assistant", text: answer.text, answer, proactive: true, severity: finding.severity, findingId, clock: f.clock }], answer.focus);
    },
    [append],
  );

  // Proactive nudge: an alarm the server evaluation newly opened on the primary machine (a
  // limit or rule finding: the ones it records alarm_raised events for).
  const openIds = record
    ? record.findings.filter((x) => x.clearedAt === null && x.severity !== "Normal" && (x.type === "limit_exceeded" || x.type === "rule_pattern")).map((x) => x.id)
    : null;
  const activeKey = openIds ? openIds.join(",") : "";
  // They wait (the launcher's dot, the Ask sheet's "new alerts" button) until the reader asks
  // for them: nothing is added to a conversation on its own.
  useEffect(() => {
    if (!openIds) return;
    const prev = seen.current;
    seen.current = new Set(openIds);
    // Findings open when the plant is first seen are the baseline, not news.
    if (!prev) return;
    const fresh = openIds.filter((id) => !prev.has(id));
    // Waiting nudges for findings that have since cleared are dropped (and their dot).
    setNudges((n) => {
      const kept = n.filter((id) => openIds.includes(id));
      return fresh.length ? Array.from(new Set([...kept, ...fresh])) : kept.length === n.length ? n : kept;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  const nudgesRef = useRef(nudges);
  nudgesRef.current = nudges;
  const showNudges = useCallback(() => {
    [...nudgesRef.current].sort((a, b) => a - b).slice(-MAX_DELIVERED).forEach(pushInsight);
    setNudges([]);
  }, [pushInsight]);
  const setViewing = useCallback((on: boolean) => setViewingState(on), []);

  const send = useCallback(
    (q: string, label?: string) => {
      const f = frameRef.current;
      // One of the account's own questions: answered from the account's live data (any plant, live engine or not).
      const pq = matchQuestion(q, questionsRef.current);
      if (pq && prefixedRef.current) {
        const tid = append([{ id: nextId(), role: "user", text: label ?? pq.question }]);
        setThinking(true);
        void answerPrefixed(pq, prefixedRef.current)
          // These answers are written with names already (no tag or machine codes to swap).
          .then((answer) => {
            const id = nextId();
            setFreshId(id);
            append([{ id, role: "assistant", text: answer.text, answer }], answer.focus, tid);
          })
          .catch(() => append([{ id: nextId(), role: "note", text: "That answer could not be worked out just now. Try again in a moment." }], undefined, tid))
          .finally(() => setThinking(false));
        return;
      }
      if (!f) {
        append([
          { id: nextId(), role: "user", text: label ?? q },
          { id: nextId(), role: "note", text: "This plant has no live model to answer free questions from. Ask one of the suggested questions: they read the plant's stored readings and alarms." },
        ]);
        return;
      }
      const sid = scopeRef.current;
      const scoped = sid ? fleetRef.current[sid]?.frame : null;
      let raw: CopilotAnswer;
      if (sid && scoped) {
        // One machine: answered from its own frame and record only.
        const a = ask(q, { frame: scoped, focus: focusRef.current?.machineId === sid ? focusRef.current : null, machineId: sid, record: recordOf(sid) });
        // Work orders run through the ops loop, which follows the primary machine; other machines act through their engine.
        const actions = a.actions.filter((x) => sid === primaryRef.current || x.kind !== "workorder").map((x) => ({ ...x, machineId: sid }));
        raw = { ...a, actions, machineId: sid, focus: a.focus ? { ...a.focus, machineId: sid } : null };
      } else {
        raw = ask(q, { frame: f, focus: focusRef.current, machineId: primaryRef.current, plant: plantRef.current, record: recordRef.current });
      }
      const answer = namedAnswer(raw, defsOf(raw.machineId, f), machineNamesRef.current);
      // The answer is ready at once; a short working beat keeps question and answer readable as two steps.
      const tid = append([{ id: nextId(), role: "user", text: label ?? q }]);
      const id = nextId();
      setThinking(true);
      setFreshId(id);
      window.setTimeout(
        () => {
          append([{ id, role: "assistant", text: answer.text, answer }], answer.focus, tid);
          setThinking(false);
        },
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : THINK_MS,
      );
    },
    [append, recordOf],
  );

  const onAction = useCallback(
    (msgId: string, a: ActionSpec) => {
      const note = (text: string) => append([{ id: nextId(), role: "note", text, clock: frameRef.current?.clock }]);
      const mark = () => setDoneActions((d) => ({ ...d, [`${msgId}:${a.kind}`]: true }));
      // Actions go to the machine the answer came from (the primary unless the question named another).
      const target = a.machineId ?? primaryRef.current;
      const s = (fleetRef.current[target] ?? null) as unknown as SimWithActions | null;
      const ruleDef = a.ruleId ? fleetRef.current[target]?.frame.defs.ruleById[a.ruleId] : undefined;
      const ruleName = (a.ruleId && (ruleDef?.plainTitle || ruleDef?.name)) || a.ruleId;
      switch (a.kind) {
        case "mitigate":
          if (a.ruleId) s?.performAction?.(a.ruleId, "mitigate");
          mark();
          note(`Short-term fix sent for "${ruleName}". Watching the related readings to see if they recover.`);
          break;
        case "repair":
          if (a.ruleId) s?.performAction?.(a.ruleId, "repair");
          mark();
          note(`Repair scheduled for "${ruleName}".`);
          break;
        case "workorder":
          if (a.ruleId) window.dispatchEvent(new CustomEvent("ultron:create-work-order", { detail: { ruleId: a.ruleId } }));
          mark();
          note(`Work order requested for "${ruleName}".`);
          break;
        case "diagnosis":
          window.dispatchEvent(new CustomEvent("ultron:open-diagnosis", { detail: { machineId: target, ruleId: a.ruleId } }));
          break;
      }
    },
    [append],
  );

  const newChat = useCallback(() => setActiveId(null), []);
  const selectChat = useCallback((id: string) => setActiveId(id), []);
  /** The conversation deleted last, with its place in the list, kept for UNDO_MS so it can be brought back. */
  const [trash, setTrash] = useState<{ thread: ChatThread; index: number; wasActive: boolean } | null>(null);
  useEffect(() => {
    if (!trash) return;
    const t = setTimeout(() => setTrash(null), UNDO_MS);
    return () => clearTimeout(t);
  }, [trash]);
  // A plant switch loads other conversations; the deleted one cannot come back into them.
  useEffect(() => setTrash(null), [primaryId]);
  const deleteChat = useCallback((id: string) => {
    const ts = threadsRef.current;
    const index = ts.findIndex((t) => t.id === id);
    if (index < 0) return;
    setTrash({ thread: ts[index], index, wasActive: activeRef.current === id });
    setThreads((cur) => cur.filter((t) => t.id !== id));
    setActiveId((cur) => (cur === id ? null : cur));
  }, []);
  const trashRef = useRef(trash);
  trashRef.current = trash;
  const undoDelete = useCallback(() => {
    const d = trashRef.current;
    if (!d) return;
    setTrash(null);
    setThreads((ts) => {
      if (ts.some((t) => t.id === d.thread.id)) return ts;
      const next = [...ts];
      next.splice(Math.min(d.index, next.length), 0, d.thread);
      return next.slice(0, MAX_THREADS);
    });
    // Reopen it only when nothing else was started in the meantime.
    if (d.wasActive && activeRef.current === null) setActiveId(d.thread.id);
  }, []);
  const deleted = useMemo(() => (trash ? { id: trash.thread.id, title: trash.thread.title } : null), [trash]);

  const focus = active?.focus ?? null;
  const scopeId = scope && fleet[scope] ? scope : null;
  // Suggestions follow the scoped machine (the primary for the full line).
  const chipFrame = scopeId ? fleet[scopeId].frame : frame;
  const chipRecord = scopeId ? recordOf(scopeId) : record;
  const chipRecordKey = chipRecord ? chipRecord.findings.filter((x) => x.clearedAt === null).map((x) => x.id).join(",") : "";
  const pendKey = chipFrame ? pendingRules(chipFrame).map((r) => r.id).join(",") : "";
  const engineChips = useMemo(
    () => (chipFrame ? suggestions(chipFrame, focus?.machineId && focus.machineId !== (scopeId ?? primaryId) ? null : focus, chipRecord) : []),
    [Boolean(chipFrame), chipRecordKey, pendKey, focus, primaryId, scopeId], // eslint-disable-line react-hooks/exhaustive-deps
  );
  // The account's own questions come first: the next three not yet asked in this conversation.
  const questions = useMemo(() => (questionList ?? []).map((q) => q.question), [questionList]);
  const askedKey = (active?.messages ?? []).filter((m) => m.role === "user").map((m) => m.text).join("|");
  const chips = useMemo(() => {
    if (!questions.length) return engineChips;
    const asked = new Set(askedKey.split("|"));
    const next = questions.filter((q) => !asked.has(q));
    return (next.length ? next : questions).slice(0, 3);
  }, [questions, askedKey, engineChips]);
  const defs = chipFrame?.defs;
  const chipLabel = useCallback((c: string) => (defs ? nameIds(c, defs, machineNamesRef.current) : c), [defs]);

  const nameOf = useCallback((id: string) => machines.find((m) => m.id === id)?.name ?? id, [machines]);
  const fleetIds = Object.keys(fleet).join(",");
  const scopes = useMemo<ScopeOption[]>(
    () => [{ id: null, name: "Full line" }, ...fleetIds.split(",").filter(Boolean).map((id) => ({ id, name: nameOf(id) }))],
    [fleetIds, nameOf],
  );
  const abnormal = (xs: FindingDto[]) => xs.filter((x) => x.clearedAt === null && x.severity !== "Normal").length;
  const plantMachineCount = machines.filter((m) => m.plantId === selectedPlantId).length;
  const header = useMemo<CopilotHeader | null>(() => {
    // A plant without a live model still has its stored readings and alarms (the account's questions read those).
    if (!frame)
      return questions.length
        ? { machineId: null, label: "Full line", machineCount: plantMachineCount, overall: null, condition: null, signalCount: null, ruleCount: null, openFindings: plantFindings ? abnormal(plantFindings) : null }
        : null;
    if (scopeId) {
      const f = fleet[scopeId].frame;
      return {
        machineId: scopeId,
        label: nameOf(scopeId),
        machineCount: null,
        overall: f.overall,
        condition: f.condition,
        signalCount: Object.keys(f.signals).length,
        ruleCount: f.rules.length,
        openFindings: plantFindings ? abnormal(plantFindings.filter((x) => x.machineId === scopeId)) : null,
      };
    }
    return {
      machineId: null,
      label: "Full line",
      machineCount: Object.keys(fleet).length,
      overall: null,
      condition: null,
      signalCount: Object.values(fleet).reduce((n, s) => n + Object.keys(s.frame.signals).length, 0),
      ruleCount: null,
      openFindings: plantFindings ? abnormal(plantFindings) : null,
    };
  }, [frame, scopeId, fleet, nameOf, plantFindings, questions.length, plantMachineCount]);
  const nudgeCritical = nudges.some((id) => record?.findings.find((x) => x.id === id)?.severity === "Critical");
  const messages = active?.messages;

  const value = useMemo<CopilotState>(
    () => ({
      ready: Boolean(sim && frame) || questions.length > 0,
      header,
      scopes,
      scope: scopeId,
      setScope,
      threads,
      activeId,
      messages: messages ?? [],
      chips,
      chipLabel,
      doneActions,
      nudgeCount: nudges.length,
      nudgeCritical,
      showNudges,
      viewing,
      setViewing,
      send,
      questions,
      thinking,
      freshId,
      onAction,
      newChat,
      selectChat,
      deleteChat,
      deleted,
      undoDelete,
    }),
    [sim, frame, header, scopes, scopeId, setScope, threads, activeId, messages, chips, chipLabel, doneActions, nudges.length, nudgeCritical, showNudges, viewing, setViewing, send, questions, thinking, freshId, onAction, newChat, selectChat, deleteChat, deleted, undoDelete],
  );

  return <CopilotContext.Provider value={value}>{children}</CopilotContext.Provider>;
}
