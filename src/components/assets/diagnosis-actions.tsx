"use client";

import React from "react";
import { PillButton } from "@/components/ui";
import type { OpsWorkOrder } from "@/providers/kiln-ops-context";
import type { DxAction } from "./diagnosis-model";
import { ACTION } from "@/components/ui/status";
import { WhyDisclosure } from "./analysis/an-ui";

/* ==========================================================================
   Actions: prescriptive steps from the open findings (rule library / DB
   failure-mode library / stored record) and instrument checks for sensors
   that validation does not trust, by priority — with owner, status and the
   work order (KLN-01 work orders live in the database via KilnOps).
   ========================================================================== */

const WO_STATUS: Record<OpsWorkOrder["status"], string> = { open: "Open", in_progress: "In progress", done: "Done", cancelled: "Cancelled" };

export function RecommendedActions({
  actions,
  workOrders,
  onWorkOrder,
  onAnalysis,
}: {
  actions: DxAction[];
  workOrders: OpsWorkOrder[] | null;
  onWorkOrder?: (ruleId: string) => void;
  onAnalysis: () => void;
}) {
  return (
    <div className="dxo-card dxo-table-card">
      <div className="dxo-table-wrap">
        <table className="dxo-table pg-diag-table">
          <thead>
            <tr>
              <th scope="col">Pri.</th>
              <th scope="col">Action</th>
              <th scope="col">Triggered by</th>
              <th scope="col">Due</th>
              <th scope="col">Owner</th>
              <th scope="col">Status</th>
              <th scope="col" className="is-right">
                Work order
              </th>
            </tr>
          </thead>
          <tbody>
            {actions.map((a) => {
              const wo = a.ruleId ? (workOrders?.filter((w) => w.ruleId === a.ruleId).sort((x, y) => y.id - x.id)[0] ?? null) : null;
              const openWo = wo && (wo.status === "open" || wo.status === "in_progress") ? wo : null;
              return (
                <tr key={a.key} className="dxo-row">
                  <td>
                    <span className="pg-diag-state" data-tone={a.tone === "info" || a.tone === "good" ? "idle" : a.tone}>
                      <span className="ast-chip-dot" aria-hidden="true" />
                      <span className="ast-num">{a.priority}</span>
                    </span>
                  </td>
                  <td>
                    <span className="ast-cell-stack">
                      <span className="pg-diag-act-text">{a.text}</span>
                      <span className="dxo-secondary-text">
                        {a.where}
                        {a.tags.length ? ` · ${a.tags.slice(0, 3).join(", ")}${a.tags.length > 3 ? ` +${a.tags.length - 3}` : ""}` : ""}
                      </span>
                    </span>
                  </td>
                  <td>
                    <span className="pg-diag-wrap pg-diag-muted">{a.source}</span>
                  </td>
                  <td className="ast-num pg-diag-nowrap">{a.due ?? "—"}</td>
                  <td className="pg-diag-nowrap">{openWo?.assignee ?? (a.owner ? <span className="pg-diag-muted">{a.owner}</span> : <span className="dxo-none">—</span>)}</td>
                  <td className="pg-diag-nowrap">{openWo ? WO_STATUS[openWo.status] : <span className="pg-diag-muted">Open</span>}</td>
                  <td className="is-right">
                    {openWo ? (
                      <span className="ast-num">WO-{openWo.id}</span>
                    ) : a.live && a.ruleId && onWorkOrder && !a.ruleId.startsWith("R-DQ") ? (
                      <PillButton variant="secondary" className="pg-diag-sm" onClick={() => onWorkOrder(a.ruleId as string)}>
                        {ACTION.workOrder}
                      </PillButton>
                    ) : (
                      <span className="dxo-none">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <WhyDisclosure summary="Method">
        <p>
          Due dates follow the response time by priority: P1 4 h, P2 24 h, P3 7 d, P4 next outage. Creating a work order also acknowledges the alarm. The
          full maintenance plan is on{" "}
          <button type="button" className="pg-diag-inline-link" onClick={onAnalysis}>
            Analysis
          </button>
          .
        </p>
      </WhyDisclosure>
    </div>
  );
}
