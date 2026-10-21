"use client";

/**
 * Maintenance › Problems: cases (one problem on one machine, followed from the
 * first sign to a checked repair) and the investigation guides to start one
 * from. The Maintenance bars above pick the machine and the view; a case opens
 * in place of the list. Repair requests a case sends are work orders, listed
 * with every other job under Work orders.
 */
import React, { useMemo, useState } from "react";
import { useApi } from "@/lib/api-cache";
import { formatLocalTime } from "@/lib/time";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import { Select, Table, type Column, type SelectOption } from "@/components/ui";
import { SearchPill, StatusTag, type Tone } from "@/components/assets/assets-shell-ui";
import { STAGE_TONE, VOCABULARY_URL, casesUrl, type CaseList, type CaseSummary, type CaseVocabulary } from "./cases-api";
import { CaseView } from "./case-view";
import { ConditionStrip, useRefreshOnCaseChange } from "./condition-strip";
import { RecordAlarmDialog } from "./record-alarm-dialog";
import type { NewCasePreset } from "./new-case-dialog";
import { GuidesTab } from "./guides-tab";
import "@/components/assets/assets-shell.css";
import "@/components/ui/page.css";
import "./problems.css";

const PRIORITY_TONE: Record<string, Tone> = { urgent: "bad", priority: "warn", routine: "idle", unassigned: "idle" };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The case list: one row per case; the whole row opens it (one tab stop per row). */
function caseColumns(timeZone: string | undefined, showMachine: boolean): Column<CaseSummary>[] {
  return [
    {
      key: "priority",
      header: "How soon",
      render: (c) => <StatusTag tone={PRIORITY_TONE[c.priority] ?? "idle"} label={c.priority === "unassigned" ? "Not set" : c.priorityWord} />,
    },
    {
      key: "title",
      header: "Problem",
      render: (c) => (
        <span className="ast-cell-stack">
          <span className="prb-wrap">{c.title}</span>
          {c.openChecks > 0 && <span className="ast-cell-sub">{plural(c.openChecks, "check waiting", "checks waiting")}</span>}
        </span>
      ),
    },
    {
      key: "where",
      header: showMachine ? "Machine and part" : "Part",
      render: (c) => (showMachine ? `${c.machineName} · ${c.partName ?? "Whole machine"}` : (c.partName ?? "Whole machine")),
    },
    { key: "stage", header: "Stage", render: (c) => <StatusTag tone={STAGE_TONE[c.stage] ?? "idle"} label={c.stageWord} /> },
    { key: "owner", header: "Looked after by", render: (c) => c.ownerName ?? <span className="ast-muted">No one yet</span> },
    {
      key: "updated",
      header: "Updated",
      render: (c) => (
        <span className="ast-cell-stack">
          <span className="prb-nowrap">{formatLocalTime(c.updatedAt, { date: true, seconds: false, timeZone })}</span>
          {c.updatedBy && <span className="ast-cell-sub">by {c.updatedBy}</span>}
        </span>
      ),
    },
  ];
}

function CaseList({ plantId, machineId, onOpen }: { plantId: string | null; machineId: string | null; onOpen: (id: number) => void }) {
  const url = plantId ? casesUrl({ plantId }) : null;
  const { data, error, isLoading } = useApi<CaseList>(url);
  useRefreshOnCaseChange(url);
  const { data: vocab } = useApi<CaseVocabulary>(VOCABULARY_URL);
  const { timeZone } = useSiteTimeZone({ nodeId: plantId });

  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("open");

  const cases = useMemo(() => (data?.cases ?? []).filter((c) => !machineId || c.machineId === machineId), [data, machineId]);
  const stageOptions: SelectOption[] = useMemo(
    () => [
      { value: "open", label: "All open" },
      ...(vocab?.stages ?? []).filter((s) => s.value !== "closed").map((s) => ({ value: s.value, label: s.label })),
      { value: "closed", label: "Closed" },
      { value: "all", label: "Everything" },
    ],
    [vocab],
  );

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cases.filter((c) => {
      if (stage === "open" ? c.stage === "closed" : stage !== "all" && c.stage !== stage) return false;
      if (!q) return true;
      return [c.machineId, c.machineName, c.partName, c.title, c.nextAction, c.ownerName].some((v) => v?.toLowerCase().includes(q));
    });
  }, [cases, search, stage]);

  const open = cases.filter((c) => c.stage !== "closed").length;
  const by = (s: string) => cases.filter((c) => c.stage === s).length;

  return (
    <section className="ast-card pg-table-card" aria-label="Cases">
      <div className="ast-card-head">
        <h2 className="ast-card-title">
          Cases
          <span className="ast-caption">
            {data
              ? `${open} open · ${by("waiting")} waiting for checks · ${by("maintenance")} with maintenance · ${by("verifying")} checking the fix`
              : ""}
          </span>
        </h2>
        <div className="prb-filters">
          <SearchPill value={search} onChange={setSearch} placeholder="Search problem, part or owner" label="Search cases" />
          <Select id="prb-filter-stage" ariaLabel="Stage" value={stage} onChange={setStage} options={stageOptions} />
        </div>
      </div>

      {isLoading && !data && <div className="ast-empty">Loading the cases…</div>}
      {error && !data && (
        <div className="ast-empty" role="alert">
          The cases could not be loaded. Reload the page to try again.
        </div>
      )}
      {data && cases.length === 0 && (
        <div className="ast-empty">
          No cases yet. Start one with Start a case, from an investigation guide, or from a problem on a machine&rsquo;s Diagnosis or Analysis page.
        </div>
      )}
      {data && cases.length > 0 && shown.length === 0 && <div className="ast-empty">No cases match these filters.</div>}

      {shown.length > 0 && (
        <Table columns={caseColumns(timeZone, !machineId)} data={shown} keyExtractor={(c) => String(c.id)} onRowClick={(c) => onOpen(c.id)} />
      )}
    </section>
  );
}

export interface ProblemsSectionProps {
  view: "problems" | "guides";
  /** The machine picked in the Maintenance bar; null = the whole line. */
  machineId: string | null;
  /** The case open in place of the list, if any. */
  caseId: number | null;
  onOpenCase: (id: number) => void;
  onCloseCase: () => void;
  onStartCase: (preset?: NewCasePreset) => void;
}

export function ProblemsSection({ view, machineId, caseId, onOpenCase, onCloseCase, onStartCase }: ProblemsSectionProps) {
  const { selectedPlantId, machines } = useIndustrialData();
  const [alarmOpen, setAlarmOpen] = useState(false);
  const machineChoices = useMemo(() => machines.map((m) => ({ id: m.id, name: m.name })), [machines]);

  const dialog = <RecordAlarmDialog open={alarmOpen} machines={machineChoices} onClose={() => setAlarmOpen(false)} />;

  if (caseId !== null) {
    return (
      <>
        <CaseView caseId={caseId} onBack={onCloseCase} />
        {dialog}
      </>
    );
  }

  return (
    <div className="prb-root">
      <ConditionStrip plantId={selectedPlantId} machineId={machineId ?? undefined} onRecordAlarm={() => setAlarmOpen(true)} />
      {view === "problems" ? (
        <CaseList plantId={selectedPlantId} machineId={machineId} onOpen={onOpenCase} />
      ) : (
        <GuidesTab plantId={selectedPlantId} onStartCase={(preset) => onStartCase({ ...(machineId ? { machineId } : {}), ...preset })} />
      )}
      {dialog}
    </div>
  );
}
