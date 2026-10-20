"use client";

/**
 * Maintenance requests sent from cases. Each one created a work order in the
 * Maintenance page; the table shows where that work order and its case stand.
 */
import React from "react";
import { useApi } from "@/lib/api-cache";
import { formatLocalTime } from "@/lib/time";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import { Table, type Column } from "@/components/ui";
import { requestsUrl, type CaseRequest } from "./cases-api";
import { useRefreshOnCaseChange } from "./condition-strip";
import "./problems.css";

export type RequestRow = CaseRequest & { caseId: number; caseTitle: string; machineName: string; stageWord: string };

export function RequestsTab({ plantId, onOpenCase }: { plantId: string | null; onOpenCase: (id: number) => void }) {
  const url = plantId ? requestsUrl({ plantId }) : null;
  const { data, error, isLoading } = useApi<RequestRow[]>(url);
  useRefreshOnCaseChange(url);
  const { timeZone } = useSiteTimeZone({ nodeId: plantId });

  const columns: Column<RequestRow>[] = [
    {
      key: "when",
      header: "When",
      width: "150px",
      render: (r) => (
        <span className="ast-cell-stack">
          <span className="prb-nowrap">{formatLocalTime(r.createdAt, { date: true, seconds: false, timeZone })}</span>
          {r.createdBy && <span className="ast-cell-sub">by {r.createdBy}</span>}
        </span>
      ),
    },
    { key: "machine", header: "Machine", render: (r) => r.machineName },
    {
      key: "case",
      header: "Case",
      render: (r) => (
        <button type="button" className="prb-link-btn prb-wrap" onClick={() => onOpenCase(r.caseId)}>
          {r.caseTitle}
        </button>
      ),
    },
    {
      key: "work",
      header: "Kind of work",
      render: (r) => (
        <span className="ast-cell-stack">
          <span>{r.workWord}</span>
          <span className="ast-cell-sub prb-wrap">{r.scope}</span>
        </span>
      ),
    },
    { key: "team", header: "Team", render: (r) => r.team },
    {
      key: "wo",
      header: "Work order",
      render: (r) =>
        r.workOrderId !== null ? (
          <span className="ast-cell-stack">
            <span>Number {r.workOrderId}</span>
            <span className="ast-cell-sub">{r.workOrderStatus ?? "Status not known"}</span>
          </span>
        ) : (
          <span className="ast-muted">Not created</span>
        ),
    },
    { key: "stage", header: "Case stage", render: (r) => r.stageWord },
  ];

  return (
    <div className="prb-tab">
      <div className="prb-toolbar">
        <p className="prb-intro">Requests sent from cases. Each one created a work order in Maintenance.</p>
      </div>
      {isLoading && !data && <p className="ast-muted">Loading the maintenance requests…</p>}
      {error && !data && (
        <p className="pg-note" data-tone="bad" role="alert">
          Could not load the maintenance requests. Reload the page to try again.
        </p>
      )}
      {data && data.length === 0 && <p className="prb-empty">No maintenance requests yet. Send one from a case when it needs work on the machine.</p>}
      {data && data.length > 0 && (
        <section className="ast-card pg-table-card" aria-label="Maintenance requests">
          <Table columns={columns} data={data} keyExtractor={(r) => String(r.id)} />
        </section>
      )}
    </div>
  );
}
