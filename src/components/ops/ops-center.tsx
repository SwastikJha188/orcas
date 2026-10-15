"use client";

import React, { useMemo, useState } from "react";
import { PillButton, PillNav } from "@/components/ui";
import { formatClock } from "@/lib/kiln-sim/engine";
import {
  useKilnOps,
  type OpsAlert,
  type OpsWorkOrder,
  type WorkOrderStatus,
} from "@/providers/kiln-ops-context";
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

function alertTone(a: OpsAlert) {
  return a.status === "PENDING" ? "idle" : a.severity === "Critical" ? "bad" : "warn";
}

/** Alerts inbox: live rule findings with Acknowledge / Create work order. */
export function OpsAlertRows({ alerts, limit }: { alerts: OpsAlert[]; limit?: number }) {
  const { acknowledge, createWorkOrder, workOrders, machineId } = useKilnOps();
  const [open, setOpen] = useState<string | null>(null);
  const rows = limit ? alerts.slice(0, limit) : alerts;
  if (rows.length === 0) {
    return (
      <div className="ast-empty">
        <strong>No active findings</strong>
        {machineId} is running inside its reference envelope.
      </div>
    );
  }
  return (
    <ul className="ops-list">
      {rows.map((a) => {
        const expanded = open === a.id;
        const wo = a.workOrderId !== null ? workOrders.find((w) => w.id === a.workOrderId) : null;
        return (
          <li key={a.id} className="ops-row" data-tone={alertTone(a)} data-acked={a.acknowledged ? "" : undefined}>
            <button type="button" className="ops-row-main" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : a.id)}>
              <span className="ops-row-top">
                <span className="ops-tag">{a.status === "PENDING" ? "PENDING" : a.severity === "Critical" ? "CRITICAL" : "ADVISORY"}</span>
                <span className="ops-tag ops-tag-quiet">{a.priority}</span>
                {a.acknowledged && <span className="ops-tag ops-tag-quiet">ACKNOWLEDGED</span>}
                <span className="ops-row-time ast-num">{a.since !== null ? formatClock(a.since).clock : "confirming"}</span>
              </span>
              <span className="ops-row-title">{a.name}</span>
              <span className="ops-row-sub ast-num">{a.evidence}</span>
            </button>
            {expanded && (
              <div className="ops-row-more">
                <p>
                  <b>Likely cause</b> {a.cause}
                </p>
                <p>
                  <b>If ignored</b> {a.consequence}
                </p>
                <p>
                  <b>Recommended</b> {a.action}
                </p>
                <span className="ast-caption ast-num">
                  Confidence {Math.round(a.confidence * (a.confidence <= 1 ? 100 : 1))} % · time to limit {a.timeToLimit}
                </span>
              </div>
            )}
            <div className="ops-row-actions">
              {!a.acknowledged && a.status === "ACTIVE" && (
                <PillButton variant="secondary" onClick={() => void acknowledge(a.ruleId)}>
                  Acknowledge
                </PillButton>
              )}
              {wo ? (
                <span className="ops-tag ops-tag-quiet">WO-{wo.id} · {STATUS_LABEL[wo.status]}</span>
              ) : (
                a.status === "ACTIVE" && (
                  <PillButton variant="primary" onClick={() => void createWorkOrder(a.ruleId)}>
                    Create work order
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
    { label: wo.simTime !== null ? `Created from live finding at ${formatClock(wo.simTime).clock}` : "Created", at: when(wo.createdAt) },
  ];
  if (wo.status !== "open") {
    steps.push({ label: wo.status === "cancelled" ? "Cancelled" : wo.actionKind === "mitigate" ? "Mitigation started" : "Repair started", at: when(wo.updatedAt) });
  }
  if (wo.status === "done") steps.push({ label: wo.actionKind === "repair" ? "Repair completed, plant recovering" : "Completed", at: when(wo.updatedAt) });
  return (
    <ol className="ops-timeline" aria-label={`WO-${wo.id} timeline`}>
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
  const [open, setOpen] = useState<number | null>(null);
  if (orders.length === 0) {
    return (
      <div className="ast-empty">
        <strong>No work orders</strong>
        Create one from a finding to start the recovery.
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
                <span className="ops-tag">WO-{w.id}</span>
                <span className="ops-tag ops-tag-status" data-status={w.status}>{STATUS_LABEL[w.status]}</span>
                <span className="ops-tag ops-tag-quiet">{w.actionKind === "repair" ? "Repair" : "Mitigate"}</span>
                <span className="ops-tag ops-tag-quiet">{w.priority}</span>
              </span>
              <span className="ops-row-title">{w.title}</span>
              <span className="ops-row-sub">
                {w.component ?? w.machineId ?? machineId}
                {w.dueLabel ? ` · due ${w.dueLabel.toLowerCase()}` : ""}
                {w.assignee ? ` · ${w.assignee}` : ""}
              </span>
            </button>
            {expanded && (
              <div className="ops-row-more">
                {w.notes && <p>{w.notes}</p>}
                <Timeline wo={w} />
              </div>
            )}
            {live && (
              <div className="ops-row-actions">
                {w.status === "open" && (
                  <PillButton variant="secondary" onClick={() => void updateWorkOrder(w.id, { status: "in_progress" })}>
                    {w.actionKind === "mitigate" ? "Start mitigation" : "Start work"}
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
    <section className="ops-center" aria-label="Operations">
      <div className="ast-card ops-card">
        <div className="ast-card-head">
          <h2 className="ast-card-title">Findings inbox</h2>
          <span className="ast-caption ast-num">
            {alerts.length} open · {unread} unacknowledged
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
