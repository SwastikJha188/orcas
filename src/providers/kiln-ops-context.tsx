"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { invalidateApi } from "@/lib/api-cache";
import { PRIMARY_KILN_ID, useKilnSimulation, usePrimaryMachineId } from "@/providers/kiln-simulation-context";
import { OpsToastHost, type OpsToast } from "@/components/ops/ops-toasts";

/* ==========================================================================
   Suggestion -> action loop for the active plant's primary machine (KLN-01 on
   the kiln-seal plant, PYR-KLN-01 on the pyro line). Alerts are the live rule
   findings; acknowledgements and work orders persist in Postgres through /api.
   Starting a mitigation or completing a repair drives the simulation's recovery.
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
  severity: "Normal" | "Advisory" | "Critical";
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
}

const EMPTY: KilnOps = {
  machineId: PRIMARY_KILN_ID,
  alerts: [],
  workOrders: [],
  acknowledge: async () => {},
  createWorkOrder: async () => null,
  updateWorkOrder: async () => {},
  unread: 0,
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

type ActionKind = "acknowledge" | "mitigate" | "repair";
type SimWithActions = { performAction?: (ruleId: string, kind: ActionKind) => unknown };

const DUE: Record<string, string> = { P1: "Within 4 h", P2: "Within 24 h", P3: "Within 7 days", P4: "Next planned outage" };

let toastSeq = 0;

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
            .filter((w) => w.status === "open" || w.status === "in_progress")
            .map((w) =>
              api<OpsWorkOrder>(`/api/work-orders/${w.id}`, {
                method: "PATCH",
                body: JSON.stringify({ status: "cancelled", notes: `${w.notes ? `${w.notes} ` : ""}Closed: the simulation restarted and this fault is no longer on the plant.` }),
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
  const [workOrders, setWorkOrders] = useState<OpsWorkOrder[]>([]);
  const [acks, setAcks] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<OpsToast[]>([]);

  const pushToast = useCallback((toast: Omit<OpsToast, "id">) => {
    setToasts((list) => [...list.slice(-2), { ...toast, id: ++toastSeq }]);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  // Load from the database for the active plant's primary machine.
  const machineRef = useRef(machineId);
  machineRef.current = machineId;
  useEffect(() => {
    let live = true;
    setWorkOrders([]);
    setAcks(new Set());
    const target = machineId;
    closeStaleOnce(target)
      .then(() => api<OpsWorkOrder[]>(`/api/work-orders?machineId=${encodeURIComponent(target)}`))
      .then((rows) => {
        if (live) setWorkOrders(rows);
      })
      .catch(() => {});
    api<Array<{ ruleId: string }>>(`/api/alerts/ack?machineId=${encodeURIComponent(target)}`)
      .then((rows) => live && setAcks(new Set(rows.map((r) => r.ruleId))))
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

  // Actions this provider sent to the simulation; the event mirror skips them.
  const selfActions = useRef(new Set<string>());
  const perform = useCallback((ruleId: string, kind: ActionKind) => {
    selfActions.current.add(`${ruleId}|${kind}`);
    (simRef.current as unknown as SimWithActions | null)?.performAction?.(ruleId, kind);
  }, []);

  // Rule transitions: clear stale acks when a rule returns to QUIET.
  const prevRef = useRef<{ machineId: string; status: Map<string, string> } | null>(null);
  useEffect(() => {
    const prev = prevRef.current?.machineId === machineId ? prevRef.current.status : null;
    const next = new Map(rules.map((r) => [r.id, r.status]));
    prevRef.current = { machineId, status: next };
    if (!prev || rules.length === 0) return;
    for (const r of rules) {
      const before = prev.get(r.id);
      if (!before) continue;
      if (r.status === "QUIET" && before !== "QUIET") {
        setAcks((s) => {
          if (!s.has(r.id)) return s;
          const n = new Set(s);
          n.delete(r.id);
          return n;
        });
        fetch(`/api/alerts/ack?machineId=${encodeURIComponent(machineId)}&ruleId=${encodeURIComponent(r.id)}`, { method: "DELETE" }).catch(() => {});
      }
    }
  }, [rules, machineId]);

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
        acknowledged: acks.has(r.id),
        workOrderId: wo?.id ?? null,
      });
    }
    const pr = { P1: 0, P2: 1, P3: 2, P4: 3 } as const;
    return out.sort((a, b) => (a.status === b.status ? 0 : a.status === "ACTIVE" ? -1 : 1) || pr[a.priority] - pr[b.priority]);
  }, [rules, acks, workOrders, machineId]);

  const acknowledge = useCallback(
    async (ruleId: string) => {
      setAcks((s) => new Set(s).add(ruleId));
      perform(ruleId, "acknowledge");
      try {
        await api("/api/alerts/ack", { method: "POST", body: JSON.stringify({ ruleId, machineId: machineRef.current, simTime: tRef.current }) });
      } catch {
        setAcks((s) => {
          const n = new Set(s);
          n.delete(ruleId);
          return n;
        });
        pushToast({ tone: "bad", title: "Acknowledgement failed", detail: "The alert could not be saved." });
      }
    },
    [perform, pushToast],
  );

  const createWorkOrder = useCallback(
    async (ruleId: string, kind?: WorkOrderKind) => {
      const rule = rulesRef.current.find((r) => r.id === ruleId);
      if (!rule) return null;
      const existing = workOrdersRef.current.find((w) => w.ruleId === ruleId && (w.status === "open" || w.status === "in_progress"));
      if (existing) {
        pushToast({ tone: "info", title: `Work order WO-${existing.id} already open`, detail: existing.title });
        return existing;
      }
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
            dueLabel: DUE[rule.priority] ?? null,
            assignee: actionKind === "repair" ? "Mechanical crew" : "Control room",
            notes: `${rule.name}. Likely cause: ${rule.cause}.`,
            simTime: tRef.current,
          }),
        });
        setWorkOrders((list) => [wo, ...list]);
        pushToast({ tone: "info", title: `Work order WO-${wo.id} created`, detail: rule.name });
        // Raising a work order also acknowledges the finding.
        if (!acks.has(ruleId)) void acknowledge(ruleId);
        return wo;
      } catch (e) {
        pushToast({ tone: "bad", title: "Work order failed", detail: e instanceof Error ? e.message : "Request failed" });
        return null;
      }
    },
    [acks, acknowledge, pushToast],
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
          if (patch.status === "done") pushToast({ tone: "good", title: `WO-${id} completed`, detail: current.title });
          if (patch.status === "in_progress") pushToast({ tone: "info", title: `WO-${id} started`, detail: current.title });
        }
      } catch (e) {
        setWorkOrders((list) => list.map((w) => (w.id === id ? current : w)));
        pushToast({ tone: "bad", title: "Update failed", detail: e instanceof Error ? e.message : "Request failed" });
      }
    },
    [perform, pushToast],
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
      const selfKey = `${a.ruleId}|${a.kind}`;
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
            priority: rule?.priority ?? "P2",
            actionKind: kind,
            dueLabel: rule ? DUE[rule.priority] ?? null : null,
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
            setAcks((set) => new Set(set).add(a.ruleId));
            await api("/api/alerts/ack", { method: "POST", body: JSON.stringify({ ruleId: a.ruleId, machineId: target, simTime: e.t }) });
          } else if (a.kind === "mitigate") {
            const wo = openFor("mitigate");
            const saved = wo ? await save(wo.id, { status: "in_progress" }) : await raise("mitigate");
            pushToast({ tone: "info", title: `WO-${saved.id} mitigation started`, detail: e.title });
          } else if (a.kind === "repair") {
            const mitigation = openFor("mitigate");
            if (mitigation) await save(mitigation.id, { status: "done", notes: "Superseded by repair" });
            const wo = openFor("repair");
            const saved = wo ? await save(wo.id, { status: "in_progress" }) : await raise("repair");
            pushToast({ tone: "info", title: `WO-${saved.id} repair dispatched`, detail: e.title });
          } else if (a.kind === "complete") {
            for (const w of workOrdersRef.current.filter((x) => x.ruleId === a.ruleId && (x.status === "open" || x.status === "in_progress"))) {
              await save(w.id, { status: "done" });
            }
          }
        } catch {
          pushToast({ tone: "bad", title: "Work order sync failed", detail: e.title });
        }
      })();
    }
  }, [events, pushToast, machineId]);

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
    () => ({ machineId, alerts, workOrders, acknowledge, createWorkOrder, updateWorkOrder, unread }),
    [machineId, alerts, workOrders, acknowledge, createWorkOrder, updateWorkOrder, unread],
  );

  return (
    <OpsContext.Provider value={value}>
      {children}
      <OpsToastHost toasts={toasts} onDismiss={dismissToast} />
    </OpsContext.Provider>
  );
}
