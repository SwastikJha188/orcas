"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { invalidateApi, revalidateApi, useApi } from "@/lib/api-cache";
import { useWorkOrderPriorities } from "@/lib/reference-data";
import type { FindingDto } from "@shared/types/monitoring";
import { isRuleFinding, journalState, raisedAlarms, raisedKey } from "@shared/lib/alarm-journal";
import { acknowledgeFinding } from "@/lib/monitoring-client";
import { simTimeMs } from "@shared/lib/kiln-sim/engine";
import { DISPLAY_MS, useKilnFleet, useKilnSimulation, usePrimaryMachineId } from "@/providers/kiln-simulation-context";
import { useIndustrialData } from "@/providers/industrial-data-context";

/* ==========================================================================
   Suggestion -> action loop for the active plant's primary machine (KLN-01 on
   the kiln-seal plant, PYR-KLN-01 on the pyro line). Alerts are the live rule
   findings; acknowledgements and work orders persist in Postgres through /api.
   Starting a mitigation or completing a repair drives the simulation's recovery.

   The alarm journal is the server evaluation's rule findings (/api/findings)
   for every live machine of the plant: the server opens and clears them from
   stored readings, and a finding that cleared before anyone acknowledged it
   stays unacknowledged until someone does (ISA-18.2). Acknowledgements are
   finding acknowledgements; nothing here records alarms from the browser.
   ========================================================================== */

export type WorkOrderStatus = "open" | "in_progress" | "done" | "cancelled";
export type WorkOrderKind = "mitigate" | "repair";

export interface OpsWorkOrder {
  id: number;
  machineId: string;
  ruleId: string | null;
  title: string;
  component: string | null;
  priority: string;
  status: WorkOrderStatus;
  actionKind: WorkOrderKind;
  /** The priority's due wording, read from work_order_priorities by the server. */
  dueLabel: string | null;
  assignee: string | null;
  notes: string | null;
  simTime: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface OpsAlert {
  id: string;
  machineId: string;
  ruleId: string;
  name: string;
  status: "ACTIVE" | "PENDING";
  severity: "Normal" | "Alert" | "Critical";
  priority: "P1" | "P2" | "P3" | "P4";
  confidence: number;
  evidence: string;
  cause: string;
  consequence: string;
  action: string;
  timeToLimit: string;
  since: number | null;
  subs: string[];
  acknowledged: boolean;
  /** Open / in-progress work order raised for this finding, if any. */
  workOrderId: number | null;
}

export interface KilnOps {
  /** Machine the ops loop runs on: the active plant's primary machine. */
  machineId: string;
  alerts: OpsAlert[];
  workOrders: OpsWorkOrder[];
  acknowledge: (ruleId: string) => Promise<void>;
  createWorkOrder: (ruleId: string, kind?: WorkOrderKind) => Promise<OpsWorkOrder | null>;
  updateWorkOrder: (id: number, patch: { status?: WorkOrderStatus; notes?: string; assignee?: string }) => Promise<void>;
  /** Active alerts nobody has acknowledged. */
  unread: number;
  /** Alarm journal per live machine of the plant: its rule findings from the database (open, and cleared in the last day). */
  journal: Record<string, FindingDto[]>;
  /** Acknowledge an alarm on any live machine of the plant, raised or already cleared. */
  acknowledgeAlarm: (machineId: string, ruleId: string) => Promise<void>;
}

const EMPTY: KilnOps = {
  machineId: "",
  alerts: [],
  workOrders: [],
  acknowledge: async () => {},
  createWorkOrder: async () => null,
  updateWorkOrder: async () => {},
  unread: 0,
  journal: {},
  acknowledgeAlarm: async () => {},
};

const OpsContext = createContext<KilnOps>(EMPTY);

export function useKilnOps(): KilnOps {
  return useContext(OpsContext);
}

type Envelope<T> = { data?: T; error?: { code: string; message: string } };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init ? { ...init, headers: { "content-type": "application/json" } } : undefined);
  const body = (await res.json()) as Envelope<T>;
  if (!res.ok || body.data === undefined) throw new Error(body.error?.message ?? "Request failed");
  if (init?.method && init.method !== "GET") invalidateApi("/api/");
  return body.data;
}

const plantIso = (t: number) => new Date(simTimeMs(t)).toISOString();

type ActionKind = "acknowledge" | "mitigate" | "repair";
type SimWithActions = { performAction?: (ruleId: string, kind: ActionKind) => unknown };

/**
 * The simulated plant restarts healthy on every page load, so work orders still
 * open from an earlier run refer to faults that are no longer on the plant.
 * They are closed (kept in history under Done / All) once per machine and page
 * load: switching plants keeps both simulations running, so work orders opened
 * since are still valid. Shared promise, so a remount waits for the same pass.
 */
const staleClosed = new Map<string, Promise<void>>();
function closeStaleOnce(machineId: string): Promise<void> {
  let pass = staleClosed.get(machineId);
  if (!pass) {
    pass = api<OpsWorkOrder[]>(`/api/work-orders?machineId=${encodeURIComponent(machineId)}`)
      .then((rows) =>
        Promise.all(
          rows
            // Only work orders raised from a simulated finding (rule id); maintenance and manual ones stay open.
            .filter((w) => Boolean(w.ruleId) && (w.status === "open" || w.status === "in_progress"))
            .map((w) =>
              api<OpsWorkOrder>(`/api/work-orders/${w.id}`, {
                method: "PATCH",
                body: JSON.stringify({ status: "cancelled", notes: `${w.notes ? `${w.notes} ` : ""}Closed: this fault is no longer on the plant.` }),
              }).catch(() => w),
            ),
        ),
      )
      .then(() => undefined)
      .catch(() => undefined);
    staleClosed.set(machineId, pass);
  }
  return pass;
}

export function KilnOpsProvider({ children }: { children: React.ReactNode }) {
  const machineId = usePrimaryMachineId();
  const sim = useKilnSimulation();
  const frame = sim?.machineId === machineId ? sim.frame : null;
  const fleet = useKilnFleet();
  const fleetRef = useRef(fleet);
  fleetRef.current = fleet;
  const priorities = useWorkOrderPriorities();
  const [workOrders, setWorkOrders] = useState<OpsWorkOrder[]>([]);
  /** Optimistic acknowledgements, `machine|rule@since`: one occurrence, so a recurrence alerts again. */
  const [localAcks, setLocalAcks] = useState<Set<string>>(new Set());
  /** Finding ids acknowledged here and not yet confirmed by a reload. */
  const [ackedIds, setAckedIds] = useState<Map<number, string>>(new Map());
  /** `machine|rule` acknowledged before the server evaluation opened its finding: applied once it appears. */
  const pendingAcks = useRef(new Map<string, string>());

  // Load from the database for the active plant's primary machine.
  const machineRef = useRef(machineId);
  machineRef.current = machineId;
  useEffect(() => {
    let live = true;
    setWorkOrders([]);
    const target = machineId;
    closeStaleOnce(target)
      .then(() => api<OpsWorkOrder[]>(`/api/work-orders?machineId=${encodeURIComponent(target)}`))
      .then((rows) => {
        if (live) setWorkOrders(rows);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [machineId]);

  const rules = useMemo(() => frame?.rules ?? [], [frame]);
  const rulesRef = useRef(rules);
  rulesRef.current = rules;
  const tRef = useRef(frame?.t ?? 0);
  tRef.current = frame?.t ?? 0;
  const simRef = useRef(sim);
  simRef.current = sim;
  const workOrdersRef = useRef(workOrders);
  workOrdersRef.current = workOrders;

  // Actions this provider sent to a simulation (`machine|rule|kind`); the event mirrors skip them.
  const selfActions = useRef(new Set<string>());
  const perform = useCallback((ruleId: string, kind: ActionKind) => {
    selfActions.current.add(`${machineRef.current}|${ruleId}|${kind}`);
    (simRef.current as unknown as SimWithActions | null)?.performAction?.(ruleId, kind);
  }, []);

  /* ---------------------------- Alarm journal ---------------------------- */
  // The plant's findings from the server evaluation: open ones and those cleared in
  // the last day (the window moves on the hour, so the URL stays put between polls).
  const { selectedPlantId } = useIndustrialData();
  const sinceHour = Math.floor((Date.now() - 24 * 3_600_000) / 3_600_000) * 3_600_000;
  const journalUrl = selectedPlantId
    ? `/api/findings?plantId=${encodeURIComponent(selectedPlantId)}&status=all&since=${new Date(sinceHour).toISOString()}&limit=1000`
    : null;
  const findings = useApi<FindingDto[]>(journalUrl, { refreshMs: DISPLAY_MS });
  const journal = useMemo(() => {
    const out: Record<string, FindingDto[]> = {};
    for (const mid of Object.keys(fleet)) out[mid] = [];
    for (const f of findings.data ?? []) {
      if (!out[f.machineId] || !isRuleFinding(f)) continue;
      const at = ackedIds.get(f.id);
      out[f.machineId].push(f.acknowledgement || at === undefined ? f : { ...f, acknowledgement: { by: null, at, note: null } });
    }
    return out;
  }, [findings.data, fleet, ackedIds]);
  const journalRef = useRef(journal);
  journalRef.current = journal;

  // A raise or clear on any live machine: read the journal again (the evaluation may already have it).
  const plantRaisedKey = Object.entries(fleet)
    .map(([mid, s]) => `${mid}:${raisedKey(raisedAlarms(s.frame))}`)
    .join(";");
  useEffect(() => {
    if (journalUrl) void revalidateApi(journalUrl);
  }, [journalUrl, plantRaisedKey]);

  /** Acknowledge the rule's unacknowledged findings on a machine; optimistic until the reload confirms. */
  const ackFindings = useCallback((list: FindingDto[], at: string) => {
    if (!list.length) return Promise.resolve();
    setAckedIds((m) => {
      const n = new Map(m);
      for (const f of list) n.set(f.id, at);
      return n;
    });
    return Promise.all(
      list.map((f) =>
        acknowledgeFinding(f.id).catch(() =>
          setAckedIds((m) => {
            const n = new Map(m);
            n.delete(f.id);
            return n;
          }),
        ),
      ),
    ).then(() => undefined);
  }, []);

  // Acknowledgements made before the evaluation opened the finding: apply them once it is there.
  useEffect(() => {
    for (const [key, at] of pendingAcks.current) {
      const [mid, ruleId] = key.split("|");
      const raised = fleetRef.current[mid]?.frame.rules.some((x) => x.id === ruleId && x.status !== "QUIET");
      const open = (journal[mid] ?? []).filter((f) => f.rule?.code === ruleId && f.clearedAt === null && !f.acknowledgement);
      if (open.length) void ackFindings(open, at);
      if (open.length || !raised) pendingAcks.current.delete(key);
    }
  }, [journal, ackFindings]);

  /** Record an acknowledgement (the engine already knows, or was told by the caller). */
  const recordAck = useCallback(
    (mid: string, ruleId: string, t: number) => {
      const r = fleetRef.current[mid]?.frame.rules.find((x) => x.id === ruleId);
      const local = r && r.status !== "QUIET" ? `${mid}|${ruleId}@${r.since}` : null;
      const at = plantIso(t);
      if (local) setLocalAcks((set) => new Set(set).add(local));
      const targets = (journalRef.current[mid] ?? []).filter((f) => f.rule?.code === ruleId && !f.acknowledgement);
      if (local && !targets.some((f) => f.clearedAt === null)) pendingAcks.current.set(`${mid}|${ruleId}`, at);
      return ackFindings(targets, at);
    },
    [ackFindings],
  );

  const acknowledgeAlarm = useCallback(
    async (mid: string, ruleId: string) => {
      const s = fleetRef.current[mid];
      const r = s?.frame.rules.find((x) => x.id === ruleId);
      // A cleared alarm is acknowledged in the journal only: the engine has nothing raised to act on.
      if (s && r && r.status !== "QUIET") {
        selfActions.current.add(`${mid}|${ruleId}|acknowledge`);
        s.performAction(ruleId, "acknowledge");
      }
      await recordAck(mid, ruleId, s?.frame.t ?? 0);
    },
    [recordAck],
  );

  // Acknowledgements the engines made themselves (autopilot crew) on the plant's
  // other machines; the primary machine's are mirrored with its work orders below.
  const seenAcks = useRef(new Map<string, Set<string>>());
  useEffect(() => {
    for (const [mid, s] of Object.entries(fleet)) {
      if (mid === machineId) continue;
      const events = s.frame.events;
      const keyOf = (e: (typeof events)[number]) => `${e.t}|${e.title}`;
      const seen = seenAcks.current.get(mid);
      seenAcks.current.set(mid, new Set(events.map(keyOf)));
      if (!seen) continue;
      for (const e of events) {
        const a = e.action;
        if (a?.kind !== "acknowledge" || seen.has(keyOf(e))) continue;
        if (!a.auto && selfActions.current.delete(`${mid}|${a.ruleId}|acknowledge`)) continue;
        void recordAck(mid, a.ruleId, e.t);
      }
    }
  }, [fleet, machineId, recordAck]);

  const primaryJournal = useMemo(() => journalState(frame, journal[machineId] ?? []), [frame, journal, machineId]);

  const alerts = useMemo<OpsAlert[]>(() => {
    const out: OpsAlert[] = [];
    for (const r of rules) {
      if (r.status === "QUIET" || r.category === "Data quality") continue;
      const wo = workOrders.find((w) => w.ruleId === r.id && (w.status === "open" || w.status === "in_progress"));
      out.push({
        id: `${machineId}:${r.id}`,
        machineId,
        ruleId: r.id,
        name: r.name,
        status: r.status as "ACTIVE" | "PENDING",
        severity: r.severity,
        priority: r.priority,
        confidence: r.confidence,
        evidence: r.evidence,
        cause: r.cause,
        consequence: r.consequence,
        action: r.action,
        timeToLimit: r.timeToLimit,
        since: r.since,
        subs: r.subs as string[],
        acknowledged: primaryJournal.acked.has(r.id) || localAcks.has(`${machineId}|${r.id}@${r.since}`),
        workOrderId: wo?.id ?? null,
      });
    }
    // Priority order as stored (most urgent first); unknown or still loading sorts last.
    const pr = (id: string) => {
      const i = priorities ? priorities.findIndex((p) => p.id === id) : -1;
      return i < 0 ? Number.MAX_SAFE_INTEGER : i;
    };
    return out.sort((a, b) => (a.status === b.status ? 0 : a.status === "ACTIVE" ? -1 : 1) || pr(a.priority) - pr(b.priority));
  }, [rules, primaryJournal, localAcks, workOrders, machineId, priorities]);
  const alertsRef = useRef(alerts);
  alertsRef.current = alerts;

  const acknowledge = useCallback((ruleId: string) => acknowledgeAlarm(machineRef.current, ruleId), [acknowledgeAlarm]);

  // Work orders being posted, per rule: a second click while the first is in flight posts nothing.
  const creatingWo = useRef(new Set<string>());
  const createWorkOrder = useCallback(
    async (ruleId: string, kind?: WorkOrderKind) => {
      const rule = rulesRef.current.find((r) => r.id === ruleId);
      if (!rule) return null;
      const existing = workOrdersRef.current.find((w) => w.ruleId === ruleId && (w.status === "open" || w.status === "in_progress"));
      if (existing) {
        return existing;
      }
      const flightKey = `${machineRef.current}|${ruleId}`;
      if (creatingWo.current.has(flightKey)) return null;
      creatingWo.current.add(flightKey);
      const actionKind: WorkOrderKind = kind ?? (rule.severity === "Critical" ? "repair" : "mitigate");
      try {
        const wo = await api<OpsWorkOrder>("/api/work-orders", {
          method: "POST",
          body: JSON.stringify({
            machineId: machineRef.current,
            ruleId,
            title: rule.action.length > 120 ? `${rule.action.slice(0, 117)}...` : rule.action,
            component: rule.subs.join(", ") || rule.name,
            priority: rule.priority,
            actionKind,
            assignee: actionKind === "repair" ? "Mechanical crew" : "Control room",
            notes: `${rule.name}. Likely cause: ${rule.cause}.`,
            simTime: tRef.current,
          }),
        });
        setWorkOrders((list) => [wo, ...list]);
        // Raising a work order also acknowledges the finding.
        if (!alertsRef.current.find((a) => a.ruleId === ruleId)?.acknowledged) void acknowledge(ruleId);
        return wo;
      } catch {
        return null;
      } finally {
        creatingWo.current.delete(flightKey);
      }
    },
    [acknowledge],
  );

  const updateWorkOrder = useCallback(
    async (id: number, patch: { status?: WorkOrderStatus; notes?: string; assignee?: string }) => {
      const current = workOrdersRef.current.find((w) => w.id === id);
      if (!current) return;
      setWorkOrders((list) => list.map((w) => (w.id === id ? { ...w, ...patch } : w)));
      try {
        const saved = await api<OpsWorkOrder>(`/api/work-orders/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
        setWorkOrders((list) => list.map((w) => (w.id === id ? saved : w)));
        if (patch.status && patch.status !== current.status && current.ruleId) {
          if (patch.status === "in_progress" && current.actionKind === "mitigate") perform(current.ruleId, "mitigate");
          if (patch.status === "done" && current.actionKind === "repair") perform(current.ruleId, "repair");
        }
      } catch {
        setWorkOrders((list) => list.map((w) => (w.id === id ? current : w)));
      }
    },
    [perform],
  );

  // Mirror actions taken outside this provider — the autopilot crew, or the
  // Copilot's Mitigate / Repair buttons — and repair completion into the DB, so
  // every action on the plant has an acknowledgement and a work order. These
  // calls never go back into the simulation: the engine already acted.
  const seenEvents = useRef<Set<string> | null>(null);
  const seenFor = useRef(machineId);
  const events = frame?.events;
  useEffect(() => {
    if (!events) return;
    const target = machineId;
    const keyOf = (e: (typeof events)[number]) => `${e.t}|${e.title}`;
    if (seenEvents.current === null || seenFor.current !== target) {
      // First frame (of this session or after a plant switch): earlier history is not replayed.
      seenFor.current = target;
      seenEvents.current = new Set(events.map(keyOf));
      return;
    }
    const fresh = events.filter((e) => e.action && !seenEvents.current!.has(keyOf(e))).reverse();
    for (const e of events) seenEvents.current.add(keyOf(e));
    for (const e of fresh) {
      const a = e.action!;
      const selfKey = `${target}|${a.ruleId}|${a.kind}`;
      if (!a.auto && selfActions.current.has(selfKey)) {
        selfActions.current.delete(selfKey);
        continue;
      }
      const rule = rulesRef.current.find((r) => r.id === a.ruleId);
      const openFor = (kind?: WorkOrderKind) =>
        workOrdersRef.current.find((w) => w.ruleId === a.ruleId && (w.status === "open" || w.status === "in_progress") && (!kind || w.actionKind === kind));
      const save = async (id: number, patch: { status: WorkOrderStatus; notes?: string }) => {
        const saved = await api<OpsWorkOrder>(`/api/work-orders/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
        setWorkOrders((list) => list.map((w) => (w.id === id ? saved : w)));
        return saved;
      };
      const raise = async (kind: WorkOrderKind) => {
        const wo = await api<OpsWorkOrder>("/api/work-orders", {
          method: "POST",
          body: JSON.stringify({
            machineId: target,
            ruleId: a.ruleId,
            title: rule ? (rule.action.length > 120 ? `${rule.action.slice(0, 117)}...` : rule.action) : e.title,
            component: rule ? rule.subs.join(", ") || rule.name : null,
            // No rule: the server applies the configured default priority.
            priority: rule?.priority ?? null,
            actionKind: kind,
            assignee: `${kind === "repair" ? "Mechanical crew" : "Control room"}${a.auto ? " (autopilot)" : ""}`,
            notes: e.detail,
            simTime: e.t,
          }),
        });
        setWorkOrders((list) => [wo, ...list]);
        return save(wo.id, { status: "in_progress" });
      };
      void (async () => {
        try {
          if (a.kind === "acknowledge") {
            await recordAck(target, a.ruleId, e.t);
          } else if (a.kind === "mitigate") {
            const wo = openFor("mitigate");
            if (wo) await save(wo.id, { status: "in_progress" });
            else await raise("mitigate");
          } else if (a.kind === "repair") {
            const mitigation = openFor("mitigate");
            if (mitigation) await save(mitigation.id, { status: "done", notes: "Superseded by repair" });
            const wo = openFor("repair");
            if (wo) await save(wo.id, { status: "in_progress" });
            else await raise("repair");
          } else if (a.kind === "complete") {
            for (const w of workOrdersRef.current.filter((x) => x.ruleId === a.ruleId && (x.status === "open" || x.status === "in_progress"))) {
              await save(w.id, { status: "done" });
            }
          }
        } catch {
          /* ignore background sync errors */
        }
      })();
    }
  }, [events, machineId, recordAck]);

  // Copilot: window.dispatchEvent(new CustomEvent("ultron:create-work-order", { detail: { ruleId } })).
  const createRef = useRef(createWorkOrder);
  createRef.current = createWorkOrder;
  useEffect(() => {
    const onCreate = (e: Event) => {
      const detail = (e as CustomEvent<{ ruleId?: string; kind?: WorkOrderKind }>).detail;
      if (detail?.ruleId) void createRef.current(detail.ruleId, detail.kind);
    };
    window.addEventListener("ultron:create-work-order", onCreate);
    return () => window.removeEventListener("ultron:create-work-order", onCreate);
  }, []);

  const unread = useMemo(() => alerts.filter((a) => a.status === "ACTIVE" && !a.acknowledged).length, [alerts]);

  const value = useMemo<KilnOps>(
    () => ({ machineId, alerts, workOrders, acknowledge, createWorkOrder, updateWorkOrder, unread, journal, acknowledgeAlarm }),
    [machineId, alerts, workOrders, acknowledge, createWorkOrder, updateWorkOrder, unread, journal, acknowledgeAlarm],
  );

  return <OpsContext.Provider value={value}>{children}</OpsContext.Provider>;
}
