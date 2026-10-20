"use client";

/**
 * Problems workspace: cases (one problem on one machine, followed from the
 * first sign to a checked repair), investigation guides to start one from, and
 * the maintenance requests cases have sent. A case opens in place of the list.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useApi } from "@/lib/api-cache";
import { formatLocalTime } from "@/lib/time";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import { PillButton, PillNav, Select, type PillNavItem, type SelectOption } from "@/components/ui";
import { SearchPill, StatusTag, type Tone } from "@/components/assets/assets-shell-ui";
import { OPEN_CASE_EVENT, STAGE_TONE, VOCABULARY_URL, casesUrl, takeCaseToOpen, type CaseList, type CaseSummary, type CaseVocabulary } from "./cases-api";
import { CaseView } from "./case-view";
import { ConditionStrip, useRefreshOnCaseChange } from "./condition-strip";
import { RecordAlarmDialog } from "./record-alarm-dialog";
import { NewCaseDialog, type NewCasePreset } from "./new-case-dialog";
import { GuidesTab } from "./guides-tab";
import { RequestsTab } from "./requests-tab";
import "@/components/assets/assets-shell.css";
import "@/components/ui/page.css";
import "./problems.css";

type ProblemsTab = "cases" | "guides" | "requests";

const PRIORITY_TONE: Record<string, Tone> = { urgent: "bad", priority: "warn", routine: "idle", unassigned: "idle" };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function CaseCard({ c, timeZone, onOpen }: { c: CaseSummary; timeZone: string | undefined; onOpen: () => void }) {
  return (
    <article className="ast-card prb-case">
      <div className="prb-case-main">
        <div className="prb-case-tags">
          <StatusTag tone={PRIORITY_TONE[c.priority] ?? "idle"} label={c.priority === "unassigned" ? "How soon: not set" : `How soon: ${c.priorityWord}`} />
          <StatusTag tone={STAGE_TONE[c.stage] ?? "idle"} label={c.stageWord} />
        </div>
        <h3 className="prb-case-title">
          <button type="button" className="prb-title-btn" onClick={onOpen}>
            {c.title}
          </button>
        </h3>
        <span className="prb-where">
          {c.machineName} · {c.partName ?? "Whole machine"}
        </span>
        <p className="prb-next" data-empty={c.nextAction ? undefined : true}>
          {c.nextAction ? (
            <>
              <span className="prb-next-label">Next step:</span> {c.nextAction}
            </>
          ) : (
            "No next step written yet"
          )}
        </p>
      </div>
      <div className="prb-case-side">
        <span className="prb-owner">{c.ownerName ?? <span className="ast-muted">No owner</span>}</span>
        <span className="prb-side-line">
          Updated {formatLocalTime(c.updatedAt, { date: true, seconds: false, timeZone })}
          {c.updatedBy ? ` by ${c.updatedBy}` : ""}
        </span>
        {c.openChecks > 0 && <span className="prb-side-line prb-checks">{plural(c.openChecks, "check waiting", "checks waiting")}</span>}
        <PillButton variant="secondary" className="prb-open-btn" onClick={onOpen}>
          Open →
        </PillButton>
      </div>
    </article>
  );
}

function CasesTab({ plantId, onOpen }: { plantId: string | null; onOpen: (id: number) => void }) {
  const { machines } = useIndustrialData();
  const url = plantId ? casesUrl({ plantId }) : null;
  const { data, error, isLoading } = useApi<CaseList>(url);
  useRefreshOnCaseChange(url);
  const { data: vocab } = useApi<CaseVocabulary>(VOCABULARY_URL);
  const { timeZone } = useSiteTimeZone({ nodeId: plantId });

  const [search, setSearch] = useState("");
  const [machine, setMachine] = useState("all");
  const [stage, setStage] = useState("open");

  const cases = useMemo(() => data?.cases ?? [], [data]);
  const machineOptions: SelectOption[] = useMemo(() => {
    const seen = new Map<string, string>(machines.map((m) => [m.id, m.name]));
    for (const c of cases) if (!seen.has(c.machineId)) seen.set(c.machineId, c.machineName);
    return [{ value: "all", label: "All machines" }, ...[...seen.entries()].map(([value, label]) => ({ value, label }))];
  }, [machines, cases]);
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
      if (machine !== "all" && c.machineId !== machine) return false;
      if (stage === "open" ? c.stage === "closed" : stage !== "all" && c.stage !== stage) return false;
      if (!q) return true;
      return [c.machineId, c.machineName, c.partName, c.title, c.nextAction, c.ownerName].some((v) => v?.toLowerCase().includes(q));
    });
  }, [cases, search, machine, stage]);

  const counts = data?.counts;
  return (
    <div className="prb-tab">
      <div className="prb-toolbar">
        {counts && (
          <ul className="prb-counts" aria-label="Cases by stage">
            <li>
              <b>{counts.open}</b> open
            </li>
            <li>
              <b>{counts.waiting}</b> waiting for checks
            </li>
            <li>
              <b>{counts.maintenance}</b> with maintenance
            </li>
            <li>
              <b>{counts.verifying}</b> checking the fix
            </li>
          </ul>
        )}
        <div className="prb-filters">
          <SearchPill value={search} onChange={setSearch} placeholder="Search machine, problem or owner" label="Search cases" />
          <Select id="prb-filter-machine" value={machine} onChange={setMachine} options={machineOptions} />
          <Select id="prb-filter-stage" value={stage} onChange={setStage} options={stageOptions} />
        </div>
      </div>

      {isLoading && !data && <p className="ast-muted">Loading the cases…</p>}
      {error && !data && (
        <p className="pg-note" data-tone="bad" role="alert">
          Could not load the cases. Reload the page to try again.
        </p>
      )}
      {data && cases.length === 0 && (
        <p className="prb-empty">No cases yet. Start one from a problem the system found (Diagnosis or Analysis pages), from an investigation guide, or with + Start a case.</p>
      )}
      {data && cases.length > 0 && shown.length === 0 && <p className="prb-empty">No cases match these filters.</p>}

      <div className="prb-list">
        {shown.map((c) => (
          <CaseCard key={c.id} c={c} timeZone={timeZone} onOpen={() => onOpen(c.id)} />
        ))}
      </div>
    </div>
  );
}

export function ProblemsView() {
  const { selectedPlantId, machines } = useIndustrialData();
  const [tab, setTab] = useState<ProblemsTab>("cases");
  const [caseId, setCaseId] = useState<number | null>(null);
  const [newCase, setNewCase] = useState<{ open: boolean; preset?: NewCasePreset }>({ open: false });
  const [alarmOpen, setAlarmOpen] = useState(false);

  // A case another page asked to open (stored before switching here, or sent while mounted).
  useEffect(() => {
    const first = takeCaseToOpen();
    if (first) setCaseId(first);
    const on = (e: Event) => {
      const id = Number((e as CustomEvent<{ id?: number }>).detail?.id);
      takeCaseToOpen();
      if (Number.isFinite(id) && id > 0) setCaseId(id);
    };
    window.addEventListener(OPEN_CASE_EVENT, on);
    return () => window.removeEventListener(OPEN_CASE_EVENT, on);
  }, []);

  const openCaseHere = useCallback((id: number) => setCaseId(id), []);
  const startCase = useCallback((preset?: NewCasePreset) => setNewCase({ open: true, preset }), []);
  const machineChoices = useMemo(() => machines.map((m) => ({ id: m.id, name: m.name })), [machines]);

  const tabs: PillNavItem<ProblemsTab>[] = [
    { id: "cases", label: "Cases" },
    { id: "guides", label: "Investigation guides" },
    { id: "requests", label: "Maintenance requests" },
  ];

  const dialogs = (
    <>
      <NewCaseDialog open={newCase.open} preset={newCase.preset} onClose={() => setNewCase({ open: false })} onCreated={openCaseHere} />
      <RecordAlarmDialog open={alarmOpen} machines={machineChoices} onClose={() => setAlarmOpen(false)} />
    </>
  );

  if (caseId !== null) {
    return (
      <>
        <CaseView caseId={caseId} onBack={() => setCaseId(null)} />
        {dialogs}
      </>
    );
  }

  return (
    <div className="pg-root ast-root prb-root">
      <header className="ast-head pg-head">
        <div className="ast-head-main">
          <ol className="ast-crumbs" aria-label="Location">
            <li>Problems</li>
          </ol>
          <div className="ast-title-row">
            <h1 className="ast-title">Problems</h1>
          </div>
          <p className="prb-subtitle">Each case follows one problem from the first sign to a checked repair.</p>
        </div>
        <div className="pg-actions">
          <PillButton onClick={() => startCase()}>+ Start a case</PillButton>
        </div>
      </header>

      <ConditionStrip plantId={selectedPlantId} onRecordAlarm={() => setAlarmOpen(true)} />

      <PillNav items={tabs} activeId={tab} onChange={setTab} ariaLabel="Problems sections" className="prb-tabs" />

      {tab === "cases" && <CasesTab plantId={selectedPlantId} onOpen={openCaseHere} />}
      {tab === "guides" && <GuidesTab plantId={selectedPlantId} onStartCase={startCase} />}
      {tab === "requests" && <RequestsTab plantId={selectedPlantId} onOpenCase={openCaseHere} />}

      {dialogs}
    </div>
  );
}
