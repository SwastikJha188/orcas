"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { DiagnosisRecord } from "@/components/assets/assets-data";
import { useIndustrialData } from "@/providers/industrial-data-context";
import {
  isKilnMachine,
  useKilnSimulation,
} from "@/providers/kiln-simulation-context";
import { formatDuration } from "@/lib/kiln-sim/engine";
import { PillNav, Table, type Column } from "@/components/ui";
import {
  IconChevron,
  StatusTag,
  Ticks,
  severityTone,
} from "@/components/assets/assets-shell-ui";
import {
  InferenceTicker,
  ModelStrip,
  PredictionLedgerSection,
} from "./ai-engine-view";
import { ModelAccuracyView } from "./model-accuracy-view";
import { useAiEngine } from "@/providers/ai-engine-context";
import "@/components/assets/assets-shell.css";
import "@/components/ui/page.css";

/* ==========================================================================
   AssetIQ — every open finding across the fleet, worst first, each with the
   action to take. Live machines report their confirmed rules; the others
   report the findings on record. A row opens that machine's Diagnosis.
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
  /** Age of a live finding; null for findings on record. */
  age: string | null;
}

type Filter = "open" | "all";
type HubTab = "engine" | "accuracy" | "findings";

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
    header: "Open",
    render: (f) => (
      <span className="ast-muted ast-num">{f.age ?? "On record"}</span>
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
  const [records, setRecords] = useState<DiagnosisRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/diagnosis")
      .then(async (r) => {
        const j = await r.json().catch(() => null);
        if (!r.ok || !Array.isArray(j?.data))
          throw new Error(j?.error?.message ?? `HTTP ${r.status}`);
        return j.data as DiagnosisRecord[];
      })
      .then((data) => {
        if (!cancelled) setRecords(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return { records, isLoading, error };
}

export function AssetIqHubView() {
  const { machines, navigateToMachine } = useIndustrialData();
  const { records: diagnosisRecords, isLoading, error } = useFleetDiagnosis();
  const sim = useKilnSimulation();
  const frame = sim?.frame ?? null;
  const [filter, setFilter] = useState<Filter>("open");
  const [tab, setTab] = useState<HubTab>("engine");
  // Runs at the app root (AiEngineProvider) so predictions are recorded on every page.
  const ai = useAiEngine();

  const findings = useMemo<Finding[]>(() => {
    const nameOf = (id: string) =>
      machines.find((m) => m.id === id)?.name ?? id;
    const out: Finding[] = [];
    for (const record of diagnosisRecords) {
      // A live machine speaks for itself: its confirmed rules replace the stored findings.
      if (frame && isKilnMachine(record.machineId)) continue;
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
          age: null,
        });
      }
    }
    if (frame) {
      const kiln = machines.find((m) => isKilnMachine(m.id));
      for (const r of frame.rules) {
        if (r.status !== "ACTIVE") continue;
        out.push({
          key: `live:${r.id}`,
          machineId: kiln?.id ?? "KLN-01",
          machine: kiln?.name ?? "KLN-01",
          title: r.name,
          where: r.id,
          evidence: r.evidence,
          confidence: r.confidence,
          severity: r.severity,
          action: r.action,
          age: r.since !== null ? formatDuration(frame.t - r.since) : null,
        });
      }
    }
    return out.sort(
      (a, b) =>
        RANK[b.severity] - RANK[a.severity] ||
        Number(b.age !== null) - Number(a.age !== null) ||
        b.confidence - a.confidence,
    );
  }, [diagnosisRecords, machines, frame]);

  const open = findings.filter((f) => f.severity !== "Normal");
  const critical = open.filter((f) => f.severity === "Critical").length;
  const affected = new Set(open.map((f) => f.machineId)).size;
  const monitored = new Set(
    findings
      .map((f) => f.machineId)
      .concat(diagnosisRecords.map((d) => d.machineId)),
  ).size;
  const rows = filter === "open" ? open : findings;

  return (
    <div className="pg-root ast-root" aria-label="AssetIQ findings">
      <header className="ast-head pg-head">
        <div className="ast-head-main">
          <ol className="ast-crumbs" aria-label="Location">
            <li>AssetIQ</li>
            <li>Fleet</li>
          </ol>
          <div className="ast-title-row">
            <h1 className="ast-title">
              {tab === "findings"
                ? "Findings"
                : tab === "accuracy"
                  ? "Model accuracy"
                  : "AI engine"}
            </h1>
            <StatusTag
              tone={
                critical > 0
                  ? "bad"
                  : open.length > 0 || error
                    ? "warn"
                    : "good"
              }
              label={
                open.length > 0
                  ? `${open.length} open`
                  : error
                    ? "Records unavailable"
                    : isLoading
                      ? "Loading"
                      : "All clear"
              }
            />
          </div>
        </div>
        <PillNav
          items={[
            { id: "engine", label: "AI engine" },
            { id: "accuracy", label: "Model accuracy" },
            { id: "findings", label: "Findings" },
          ]}
          activeId={tab}
          onChange={(id) => setTab(id as HubTab)}
        />
      </header>

      {tab === "engine" &&
        (frame && ai ? (
          <div className="aiq-stack">
            <ModelStrip models={ai.engine.models} />
            <InferenceTicker entries={ai.engine.ticker} />
            <PredictionLedgerSection ledger={ai.ledger} />
          </div>
        ) : (
          <section className="ast-card">
            <div className="ast-empty">
              <strong>Live inference unavailable</strong>
              The KLN-01 simulation is not running.
            </div>
          </section>
        ))}

      {tab === "accuracy" &&
        (frame ? (
          <ModelAccuracyView frame={frame} />
        ) : (
          <section className="ast-card">
            <div className="ast-empty">
              <strong>Model accuracy unavailable</strong>
              The KLN-01 simulation is not running.
            </div>
          </section>
        ))}

      {tab === "findings" && (
        <div className="aiq-stack">
          <section className="ast-card pg-table-card" aria-label="Findings">
            <div className="ast-card-head">
              <div className="aiq-head-title">
                <h2 className="ast-card-title">Fleet findings</h2>
                {open.length > 0 && (
                  <span className="ast-caption ast-num">
                    <b className="pg-tone-value" data-tone={critical > 0 ? "bad" : undefined}>
                      {critical} critical
                    </b>{" "}
                    · {affected} of {monitored} machines affected
                  </span>
                )}
              </div>
              <PillNav
                items={[
                  { id: "open", label: "Open" },
                  { id: "all", label: "All" },
                ]}
                activeId={filter}
                onChange={(id) => setFilter(id as Filter)}
              />
            </div>
            {isLoading && rows.length === 0 ? (
              <div className="ast-empty" role="status" aria-live="polite">
                <strong>Loading findings</strong>
              </div>
            ) : error && rows.length === 0 ? (
              <div className="ast-empty" role="alert">
                <strong>Findings unavailable</strong>
                /api/diagnosis · {error}
              </div>
            ) : rows.length === 0 ? (
              <div className="ast-empty">
                <strong>Nothing needs attention</strong>
              </div>
            ) : (
              <Table
                className="ast-table"
                columns={columns}
                data={rows}
                keyExtractor={(f) => f.key}
                onRowClick={(f) => navigateToMachine(f.machineId, "diagnosis")}
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
