"use client";

import React, { useMemo, useState } from "react";
import { PillButton, PillNav, Table, type Column } from "@/components/ui";
import type { AssetsSubPage } from "../assets-view";
import { IconChevron, SearchPill, StatusTag } from "../assets-shell-ui";
import { TypeIcon } from "./hierarchy-icons";
import { type MachineEntry, toneBucket, toneRank } from "./hierarchy-model";
import { toCondition } from "@/components/ui/status";

/* ==========================================================================
   Machine register — divider list of every machine under the selected node:
   location, live status, criticality and the DB sensor count.
   Row opens Overview; trailing actions jump straight to Diagnosis / Sensors.
   ========================================================================== */

type StatusFilter = "all" | "attention" | "normal" | "standby";
type CritFilter = "all" | "A" | "B" | "C";

function crit(m: MachineEntry): string | null {
  return m.machine?.criticality?.charAt(0) ?? null;
}

function matches(m: MachineEntry, q: string): boolean {
  if (!q) return true;
  return [m.node.name, m.machineId, m.machine?.type, m.machine?.manufacturer, ...m.location]
    .filter(Boolean)
    .some((s) => s!.toLowerCase().includes(q));
}

export function MachineRegister({
  entries,
  onOpenMachine,
}: {
  entries: MachineEntry[];
  onOpenMachine: (machineId: string, subPage: AssetsSubPage) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [critFilter, setCritFilter] = useState<CritFilter>("all");
  const q = query.trim().toLowerCase();

  const counts = useMemo(() => {
    const c = { attention: 0, normal: 0, standby: 0 };
    for (const e of entries) c[toneBucket(e.tone)]++;
    return c;
  }, [entries]);

  const rows = useMemo(
    () =>
      entries
        .filter((e) => (status === "all" || toneBucket(e.tone) === status) && (critFilter === "all" || crit(e) === critFilter) && matches(e, q))
        .sort((a, b) => toneRank(a.tone) - toneRank(b.tone) || a.node.name.localeCompare(b.node.name)),
    [entries, status, critFilter, q],
  );

  const filtered = q !== "" || status !== "all" || critFilter !== "all";
  const sensors = rows.reduce((n, r) => n + (r.machine?.signalsCount ?? 0), 0);

  const columns: Column<MachineEntry>[] = [
    {
      key: "machine",
      header: "Machine",
      render: (r) => (
        <span className="ast-row-btn">
          <span className="ast-badge" data-tone={r.tone}>
            <TypeIcon type="machine" size={14} />
          </span>
          <span className="ast-cell-stack">
            <span className="ast-cell-title">{r.node.name}</span>
            <span className="ast-cell-sub ast-num">
              {r.machineId}
              {r.machine?.type ? ` · ${r.machine.type}` : ""}
            </span>
          </span>
        </span>
      ),
    },
    {
      key: "location",
      header: "Location",
      // Deepest level only: the parents repeat on every row and crowd out the machine name.
      render: (r) => (
        <span className="ast-cell-text" title={r.location.join(" › ") || undefined}>
          {r.location.length ? r.location[r.location.length - 1] : "Plant level"}
        </span>
      ),
    },
    { key: "status", header: "Status", render: (r) => <StatusTag tone={r.tone} label={toCondition(r.status)} /> },
    {
      key: "criticality",
      header: "Criticality",
      render: (r) => <span className="ast-cell-text">{r.machine?.criticality ?? "—"}</span>,
    },
    {
      key: "sensors",
      header: "Sensors",
      render: (r) => (
        <span className="ast-num">
          {r.machine ? r.machine.signalsCount : "—"}
        </span>
      ),
    },
    {
      key: "open",
      header: "",
      render: (r) => (
        <span className="hx-row-actions">
          <button
            type="button"
            className="hx-row-link"
            onClick={(e) => {
              e.stopPropagation();
              onOpenMachine(r.machineId, "diagnosis");
            }}
          >
            Diagnosis
          </button>
          <button
            type="button"
            className="hx-row-link"
            onClick={(e) => {
              e.stopPropagation();
              onOpenMachine(r.machineId, "sensors");
            }}
          >
            Sensors
          </button>
          <span className="pg-chev" aria-hidden="true">
            <IconChevron size={11} />
          </span>
        </span>
      ),
    },
  ];

  return (
    <section className="ast-card pg-table-card hx-register" aria-label="Machine register">
      <div className="ast-card-head">
        <h2 className="ast-card-title">
          Machine register
          <span className="ast-caption ast-num">
            {filtered ? `${rows.length} of ${entries.length} machines · ${sensors} sensors` : `${entries.length} machines · ${sensors} sensors`}
          </span>
        </h2>
      </div>
      <div className="hx-register-tools">
        <SearchPill value={query} onChange={setQuery} placeholder="Name, ID, type, location" label="Search machines" />
        <PillNav
          items={[
            { id: "all", label: `All ${entries.length}` },
            { id: "attention", label: `Attention ${counts.attention}` },
            { id: "normal", label: `Normal ${counts.normal}` },
            { id: "standby", label: `Standby ${counts.standby}` },
          ]}
          activeId={status}
          onChange={(id) => setStatus(id as StatusFilter)}
        />
        <PillNav
          items={[
            { id: "all", label: "Any criticality" },
            { id: "A", label: "A" },
            { id: "B", label: "B" },
            { id: "C", label: "C" },
          ]}
          activeId={critFilter}
          onChange={(id) => setCritFilter(id as CritFilter)}
        />
      </div>
      {entries.length === 0 ? (
        <div className="ast-empty">
          <strong className="hx-empty-title">No machines at this level</strong>
          Machines appear here once they are registered under this node in the plant hierarchy.
        </div>
      ) : rows.length === 0 ? (
        <div className="ast-empty">
          <strong className="hx-empty-title">No match</strong>
          No machine here matches these filters.
          <PillButton
            variant="secondary"
            onClick={() => {
              setQuery("");
              setStatus("all");
              setCritFilter("all");
            }}
          >
            Reset filters
          </PillButton>
        </div>
      ) : (
        <Table
          className="ast-table hx-register-table"
          columns={columns}
          data={rows}
          keyExtractor={(r) => r.node.id}
          onRowClick={(r) => onOpenMachine(r.machineId, "overview")}
        />
      )}
    </section>
  );
}
