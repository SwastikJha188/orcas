"use client";

import React, { useMemo, useState } from "react";
import { PillButton, PillNav } from "@/components/ui";
import { formatClock } from "@shared/lib/kiln-sim/engine";
import {
  useKilnOps,
  type OpsAlert,
  type OpsWorkOrder,
  type WorkOrderStatus,
} from "@/providers/kiln-ops-context";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { defsFor } from "@/lib/live-defs";
import { nameIds, namesOf } from "@/lib/display-name";
import { ACTION, ALARM_STATE } from "@/components/ui/status";
import { woRef } from "@/components/maintenance/pms-model";
import "./ops.css";

const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  done: "Done",
  cancelled: "Cancelled",
};

const FILTERS = [
  { id: "active", label: "Active" },
  { id: "done", label: "Done" },
  { id: "all", label: "All" },
];

function when(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Machine name for display (the ID stays in tooltips). */
function useMachineName(): (id: string) => string {
  const { allMachines } = useIndustrialData();
  return useMemo(() => {
    const names = new Map(allMachines.map((m) => [m.id, m.name]));
    return (id: string) => names.get(id) ?? id;
  }, [allMachines]);
}

function alertTone(a: OpsAlert) {
  return a.status === "PENDING" ? "idle" : a.severity === "Critical" ? "bad" : "warn";
}

/** Alerts inbox: live rule findings with Acknowledge / Create work order. */
export function OpsAlertRows({ alerts, limit }: { alerts: OpsAlert[]; limit?: number }) {
  const { acknowledge, createWorkOrder, workOrders, machineId } = useKilnOps();
  const machineName = useMachineName();
  const defs = defsFor(machineId);
  const [open, setOpen] = useState<string | null>(null);
  const rows = limit ? alerts.slice(0, limit) : alerts;
  if (rows.length === 0) {
    return (
      <div className="ast-empty">
        <strong>No problems found</strong>
        {machineName(machineId)} is running within its normal range.
      </div>
    );
  }
  return (
    <ul className="ops-list">
      {rows.map((a) => {
        const expanded = open === a.id;
        const wo = a.workOrderId !== null ? workOrders.find((w) => w.id === a.workOrderId) : null;
        const rule = defs?.ruleById[a.ruleId];
        return (
          <li key={a.id} className="ops-row" data-tone={alertTone(a)} data-acked={a.acknowledged ? "" : undefined}>
            <button type="button" className="ops-row-main" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : a.id)}>
              <span className="ops-row-top">
                <span className="ops-tag">{a.status === "PENDING" ? "Checking" : a.severity === "Critical" ? "Critical" : "Alert"}</span>
                <span className="ops-tag ops-tag-quiet" title="Priority 1 is the most urgent">Priority {a.priority.replace("P", "")}</span>
                {a.acknowledged && <span className="ops-tag ops-tag-quiet">{ALARM_STATE.acknowledged}</span>}
                <span className="ops-row-time ast-num">{a.since !== null ? formatClock(a.since).clock : "still checking"}</span>
              </span>
              <span className="ops-row-title" title={`${a.name} (${a.ruleId})`}>
                {rule?.plainTitle ?? a.name}
              </span>
              <span className="ops-row-sub ast-num" title={a.evidence}>
                {nameIds(a.evidence, defs)}
              </span>
            </button>
            {expanded && (
              <div className="ops-row-more">
                {rule?.plainWhat ? (
                  <p>
                    <b>What is happening</b> {rule.plainWhat}
                  </p>
                ) : (
                  <>
                    <p>
                      <b>Likely cause</b> {a.cause}
                    </p>
                    <p>
                      <b>If nobody acts</b> {a.consequence}
                    </p>
                  </>
                )}
                <p>
                  <b>What to do</b> {rule?.plainTodo ?? a.action}
                </p>
                <span className="ast-caption">
                  How sure: {Math.round(a.confidence * (a.confidence <= 1 ? 100 : 1))} % · Time until it reaches its limit: {a.timeToLimit}
                </span>
              </div>
            )}
            <div className="ops-row-actions">
              {!a.acknowledged && a.status === "ACTIVE" && (
                <PillButton variant="secondary" onClick={() => void acknowledge(a.ruleId)}>
                  {ACTION.acknowledge}
                </PillButton>
              )}
              {wo ? (
                <span className="ops-tag ops-tag-quiet">
                  {woRef(wo.id)}: {STATUS_LABEL[wo.status]}
                </span>
              ) : (
                a.status === "ACTIVE" && (
                  <PillButton variant="primary" onClick={() => void createWorkOrder(a.ruleId)}>
                    {ACTION.workOrder}
                  </PillButton>
                )
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Timeline({ wo }: { wo: OpsWorkOrder }) {
  const steps: Array<{ label: string; at: string }> = [
    { label: wo.simTime !== null ? `Created from a live problem at ${formatClock(wo.simTime).clock}` : "Created", at: when(wo.createdAt) },
  ];
  if (wo.status !== "open") {
    steps.push({ label: wo.status === "cancelled" ? "Cancelled" : wo.actionKind === "mitigate" ? "Short-term fix started" : "Repair started", at: when(wo.updatedAt) });
  }
  if (wo.status === "done") steps.push({ label: wo.actionKind === "repair" ? "Repair completed, plant recovering" : "Completed", at: when(wo.updatedAt) });
  return (
    <ol className="ops-timeline" aria-label={`Work order ${wo.id} history`}>
      {steps.map((s, i) => (
        <li key={i}>
          <i aria-hidden="true" />
          <span>{s.label}</span>
          <span className="ast-num ops-row-time">{s.at}</span>
        </li>
      ))}
    </ol>
  );
}

export function OpsWorkOrderRows({ orders }: { orders: OpsWorkOrder[] }) {
  const { updateWorkOrder, machineId } = useKilnOps();
  const machineName = useMachineName();
  const [open, setOpen] = useState<number | null>(null);
  if (orders.length === 0) {
    return (
      <div className="ast-empty">
        <strong>No work orders</strong>
        Create one from a problem in the list to start a repair.
      </div>
    );
  }
  return (
    <ul className="ops-list">
      {orders.map((w) => {
        const expanded = open === w.id;
        const live = w.status === "open" || w.status === "in_progress";
        return (
          <li key={w.id} className="ops-row" data-status={w.status}>
            <button type="button" className="ops-row-main" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : w.id)}>
              <span className="ops-row-top">
                <span className="ops-tag">{woRef(w.id)}</span>
                <span className="ops-tag ops-tag-status" data-status={w.status}>{STATUS_LABEL[w.status]}</span>
                <span className="ops-tag ops-tag-quiet">{w.actionKind === "repair" ? "Repair" : "Short-term fix"}</span>
                <span className="ops-tag ops-tag-quiet" title="Priority 1 is the most urgent">Priority {w.priority.replace("P", "")}</span>
              </span>
              <span className="ops-row-title" title={w.ruleId ?? undefined}>
                {nameIds(w.title, defsFor(w.machineId ?? machineId))}
              </span>
              <span className="ops-row-sub" title={w.component ?? w.machineId ?? machineId}>
                {w.component ? namesOf(w.component, defsFor(w.machineId ?? machineId)) : machineName(w.machineId ?? machineId)}
                {w.dueLabel ? ` · due ${w.dueLabel.toLowerCase()}` : ""}
                {w.assignee ? ` · ${w.assignee}` : ""}
              </span>
            </button>
            {expanded && (
              <div className="ops-row-more">
                {w.notes && <p title={w.notes}>{nameIds(w.notes, defsFor(w.machineId))}</p>}
                <Timeline wo={w} />
              </div>
            )}
            {live && (
              <div className="ops-row-actions">
                {w.status === "open" && (
                  <PillButton variant="secondary" onClick={() => void updateWorkOrder(w.id, { status: "in_progress" })}>
                    {w.actionKind === "mitigate" ? "Start short-term fix" : "Start work"}
                  </PillButton>
                )}
                <PillButton variant="primary" onClick={() => void updateWorkOrder(w.id, { status: "done" })}>
                  Mark done
                </PillButton>
                <PillButton variant="secondary" onClick={() => void updateWorkOrder(w.id, { status: "cancelled" })}>
                  Cancel
                </PillButton>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Operations: alerts inbox beside the work-order board. */
export function OpsCenter() {
  const { alerts, workOrders, unread } = useKilnOps();
  const [filter, setFilter] = useState("active");
  const shown = useMemo(
    () =>
      workOrders.filter((w) =>
        filter === "all" ? true : filter === "done" ? w.status === "done" || w.status === "cancelled" : w.status === "open" || w.status === "in_progress",
      ),
    [workOrders, filter],
  );
  return (
    <section className="ops-center" aria-label="Problems and work orders">
      <div className="ast-card ops-card">
        <div className="ast-card-head">
          <h2 className="ast-card-title">Problems found</h2>
          <span className="ast-caption">
            {alerts.length} open · {unread} not yet acknowledged
          </span>
        </div>
        <OpsAlertRows alerts={alerts} />
      </div>
      <div className="ast-card ops-card">
        <div className="ast-card-head">
          <h2 className="ast-card-title">Work orders</h2>
          <PillNav items={FILTERS} activeId={filter} onChange={setFilter} />
        </div>
        <OpsWorkOrderRows orders={shown} />
      </div>
    </section>
  );
}
