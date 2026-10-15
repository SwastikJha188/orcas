"use client";

import React, { useMemo, useState } from "react";
import { useApi } from "@/lib/api-cache";
import type { DiagnosisRecord } from "@/components/assets/assets-data";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { isLiveMachine, useKilnFleet } from "@/providers/kiln-simulation-context";
import { formatDuration } from "@/lib/kiln-sim/engine";
import { PillNav, Table, type Column } from "@/components/ui";
import {
  IconChevron,
  StatusTag,
  Ticks,
  severityTone,
} from "@/components/assets/assets-shell-ui";
import { CrossLinks } from "./assetiq-parts";
import { KpiCard, KpiCards } from "@/components/ui/kpi";
import { conditionTone } from "@/components/ui/status";
import "./assetiq-ai.css";

/* ==========================================================================
   AssetIQ · Findings — every conclusion the engine holds across the active
   plant's fleet, worst first (each plant is a separate workspace). Live machines report their confirmed rules; the others report
   the findings on record. A row opens that machine's Diagnosis.
   ========================================================================== */

type Severity = "Critical" | "Advisory" | "Normal";
const RANK: Record<Severity, number> = { Critical: 2, Advisory: 1, Normal: 0 };

interface Finding {
  key: string;
  machineId: string;
  machine: string;
  title: string;
  where: string;
  evidence: string;
  confidence: number;
  severity: Severity;
  action: string;
  /** Simulated minutes a live finding has been confirmed; null for findings on record. */
  ageMin: number | null;
  live: boolean;
}

type Filter = "open" | "all";

const columns: Column<Finding>[] = [
  {
    key: "finding",
    header: "Finding",
    render: (f) => (
      <span className="ast-cell-stack">
        <span className="ast-cell-title pg-wrap">{f.title}</span>
        <span className="ast-cell-sub">
          {f.machine} · {f.where}
        </span>
      </span>
    ),
  },
  {
    key: "severity",
    header: "Severity",
    render: (f) => (
      <StatusTag tone={severityTone(f.severity)} label={f.severity} />
    ),
  },
  {
    key: "evidence",
    header: "Evidence",
    render: (f) => <span className="ast-cell-text pg-wrap">{f.evidence}</span>,
  },
  {
    key: "confidence",
    header: "Confidence",
    render: (f) => (
      <span className="pg-prob">
        <Ticks
          value={f.confidence}
          ticks={10}
          tone={severityTone(f.severity)}
        />
        <span className="ast-num">{Math.round(f.confidence)} %</span>
      </span>
    ),
  },
  {
    key: "action",
    header: "Action",
    render: (f) => <span className="ast-cell-text pg-wrap">{f.action}</span>,
  },
  {
    key: "age",
    header: "Open for",
    render: (f) => (
      <span className="ast-muted ast-num">
        {f.ageMin !== null ? formatDuration(f.ageMin) : f.live ? "—" : "On record"}
      </span>
    ),
  },
  {
    key: "go",
    header: "",
    width: "32px",
    render: () => (
      <span className="pg-chev" aria-hidden="true">
        <IconChevron />
      </span>
    ),
  },
];

/** Every machine's diagnosis_records row (the context only holds the selected machine's). */
function useFleetDiagnosis() {
  const { data, isLoading, error } = useApi<DiagnosisRecord[]>("/api/diagnosis");
  const records = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  return { records, isLoading, error };
}

interface MachineLoad {
  id: string;
  name: string;
  critical: number;
  advisory: number;
  live: boolean;
}

/** Open findings per machine as a compact divider list: machine · count · worst condition. */
function FindingsByMachine({
  loads,
  onOpen,
}: {
  loads: MachineLoad[];
  onOpen: (id: string) => void;
}) {
  const cols: Column<MachineLoad>[] = [
    {
      key: "machine",
      header: "Machine",
      render: (l) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-title">{l.name}</span>
          <span className="ast-cell-sub">
            {l.id} · {l.live ? "live" : "on record"}
          </span>
        </span>
      ),
    },
    {
      key: "count",
      header: "Open",
      width: "96px",
      render: (l) => <span className="ast-num">{l.critical + l.advisory}</span>,
    },
    {
      key: "worst",
      header: "Worst condition",
      width: "160px",
      render: (l) => {
        const c = l.critical > 0 ? "Critical" : l.advisory > 0 ? "Advisory" : "Normal";
        return <StatusTag tone={conditionTone(c)} label={c} />;
      },
    },
    {
      key: "go",
      header: "",
      width: "32px",
      render: () => (
        <span className="pg-chev" aria-hidden="true">
          <IconChevron />
        </span>
      ),
    },
  ];
  return (
    <section className="ast-card pg-table-card" aria-label="Open findings by machine">
      <div className="ast-card-head">
        <h2 className="ast-card-title">Open findings by machine</h2>
      </div>
      {loads.length === 0 ? (
        <div className="ast-empty">
          <strong>No machines in the catalog.</strong>
        </div>
      ) : (
        <Table className="ast-table" columns={cols} data={loads} keyExtractor={(l) => l.id} onRowClick={(l) => onOpen(l.id)} />
      )}
    </section>
  );
}

export function FindingsTab() {
  const { machines: allMachines, navigateToMachine, setActiveTab, selectedPlantId } = useIndustrialData();
  const { records: allRecords, isLoading, error } = useFleetDiagnosis();
  const fleet = useKilnFleet();
  // The active plant's machines only; `useKilnFleet` is already plant-scoped.
  const machines = useMemo(
    () => allMachines.filter((m) => (m.plantId ? m.plantId === selectedPlantId : Boolean(fleet[m.id]))),
    [allMachines, selectedPlantId, fleet],
  );
  const records = useMemo(() => {
    const ids = new Set(machines.map((m) => m.id));
    return allRecords.filter((r) => ids.has(r.machineId));
  }, [allRecords, machines]);
  const [filter, setFilter] = useState<Filter>("open");

  const findings = useMemo<Finding[]>(() => {
    const nameOf = (id: string) =>
      machines.find((m) => m.id === id)?.name ?? id;
    const out: Finding[] = [];
    for (const record of records) {
      // A live machine speaks for itself: its confirmed rules replace the stored findings.
      if (isLiveMachine(record.machineId) && fleet[record.machineId]) continue;
      for (const f of record.findings) {
        out.push({
          key: `${record.machineId}:${f.id}`,
          machineId: record.machineId,
          machine: nameOf(record.machineId),
          title: f.fault,
          where: f.location,
          evidence: f.frequency,
          confidence: f.probability,
          severity: f.severity,
          action: f.recommendation,
          ageMin: null,
          live: false,
        });
      }
    }
    for (const [id, s] of Object.entries(fleet)) {
      const frame = s.frame;
      for (const r of frame.rules) {
        if (r.status !== "ACTIVE") continue;
        out.push({
          key: `live:${id}:${r.id}`,
          machineId: id,
          machine: nameOf(id),
          title: r.name,
          where: r.id,
          evidence: r.evidence,
          confidence: r.confidence,
          severity: r.severity,
          action: r.action,
          ageMin: r.since !== null ? frame.t - r.since : null,
          live: true,
        });
      }
    }
    return out.sort(
      (a, b) =>
        RANK[b.severity] - RANK[a.severity] ||
        Number(b.live) - Number(a.live) ||
        b.confidence - a.confidence,
    );
  }, [records, machines, fleet]);

  const open = findings.filter((f) => f.severity !== "Normal");
  const critical = open.filter((f) => f.severity === "Critical").length;
  const affected = new Set(open.map((f) => f.machineId)).size;
  const monitoredIds = new Set<string>([
    ...machines.map((m) => m.id),
    ...Object.keys(fleet),
  ]);
  const oldest = open.reduce<number | null>(
    (a, f) => (f.ageMin !== null && (a === null || f.ageMin > a) ? f.ageMin : a),
    null,
  );
  const rows = filter === "open" ? open : findings;

  const loads: MachineLoad[] = [...monitoredIds]
      .map((id) => {
        const mine = open.filter((f) => f.machineId === id);
        return {
          id,
          name: machines.find((m) => m.id === id)?.name ?? id,
          critical: mine.filter((f) => f.severity === "Critical").length,
          advisory: mine.filter((f) => f.severity === "Advisory").length,
          live: Boolean(fleet[id]),
        };
      })
      .sort(
        (a, b) =>
          b.critical - a.critical ||
          b.advisory - a.advisory ||
          a.id.localeCompare(b.id),
      );

  return (
    <div className="aiq-stack">
      <KpiCards className="aiq-kpis" label="Findings summary">
        <KpiCard
          alertOnly
          label="Open findings"
          value={String(open.length)}
          unit="findings"
          tone={critical > 0 ? "bad" : open.length > 0 ? "warn" : undefined}
          foot={`${findings.length - open.length} normal on record`}
        />
        <KpiCard
          alertOnly
          label="Critical"
          value={String(critical)}
          unit="findings"
          tone={critical > 0 ? "bad" : undefined}
          foot={`${open.length - critical} advisory`}
        />
        <KpiCard
          alertOnly
          label="Machines affected"
          value={String(affected)}
          unit={`of ${monitoredIds.size}`}
          tone={affected > 0 ? "warn" : undefined}
          foot={`${Object.keys(fleet).length} live · ${Math.max(0, monitoredIds.size - Object.keys(fleet).length)} on record`}
        />
        <KpiCard
          alertOnly
          label="Oldest live finding"
          value={oldest === null ? "—" : formatDuration(oldest)}
          foot="Since the rule confirmed"
        />
      </KpiCards>

      <FindingsByMachine
        loads={loads}
        onOpen={(id) => navigateToMachine(id, "diagnosis")}
      />

      <section className="ast-card pg-table-card" aria-label="Findings">
        <div className="ast-card-head">
          <div className="aiq-head-title">
            <h2 className="ast-card-title">Fleet findings</h2>
            <span className="ast-caption">Worst first · opens the machine&apos;s Diagnosis</span>
          </div>
          <PillNav
            items={[
              { id: "open", label: `Open · ${open.length}` },
              { id: "all", label: `All · ${findings.length}` },
            ]}
            activeId={filter}
            onChange={(id) => setFilter(id as Filter)}
          />
        </div>
        {isLoading && rows.length === 0 ? (
          <div className="ast-empty" role="status" aria-live="polite">
            <strong>Loading findings…</strong>
          </div>
        ) : error && rows.length === 0 ? (
          <div className="ast-empty" role="alert">
            <strong>Findings unavailable. Retry.</strong>
          </div>
        ) : rows.length === 0 ? (
          <div className="ast-empty">
            <strong>No open findings.</strong>
          </div>
        ) : (
          <>
            {error && (
              <p className="pg-note aiq-table-note" data-tone="warn" role="alert">
                Stored findings unavailable. Showing live machines only.
              </p>
            )}
            <Table
              className="ast-table"
              columns={columns}
              data={rows}
              keyExtractor={(f) => f.key}
              onRowClick={(f) => navigateToMachine(f.machineId, "diagnosis")}
            />
          </>
        )}
      </section>

      <CrossLinks
        links={[
          { label: "Fleet home", onClick: () => setActiveTab("home") },
          { label: "Open in Devices", onClick: () => setActiveTab("devices") },
        ]}
      />
    </div>
  );
}
