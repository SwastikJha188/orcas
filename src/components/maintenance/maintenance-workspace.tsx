"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PillButton } from "@/components/ui";
import { StatusTag } from "@/components/assets/assets-shell-ui";
import { useApi } from "@/lib/api-cache";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { machineName, useDefaultMachine, usePmsLine, type PmsModel } from "./pms-model";
import { usePlantMachineTabs } from "@/components/home/operator/machine-nav";
import { MAINT_PAGE_EVENT, MAINT_PAGE_KEY, PMS_PAGES, PMS_TABS, PmsNavProvider, PmsViewNav, pmsTabOf, setPmsFocus, type PmsPage } from "./pms-ui";
import { PageOverview } from "./page-overview";
import { PageCalendar } from "./page-calendar";
import { PageMachine } from "./page-machine";
import { PagePreventive } from "./page-preventive";
import { PagePredictive } from "./page-predictive";
import { PageProactive } from "./page-proactive";
import { PageWork } from "./page-work";
import { PageResources } from "./page-resources";
import { PageHistory } from "./page-history";
import { ProblemsSection } from "@/components/problems/problems-section";
import { NewCaseDialog, type NewCasePreset } from "@/components/problems/new-case-dialog";
import { OPEN_CASE_EVENT, casesUrl, takeCaseToOpen, type CaseList } from "@/components/problems/cases-api";
import "@/components/assets/assets-shell.css";
import "@/components/assets/analysis/analysis-page.css";
import "@/components/ui/page.css";
import "@/components/home/plant-home.css";
import "@/components/home/operator/operator-console.css";
import "@/components/configure/configure.css";
import "./pms.css";

/* ==========================================================================
   Maintenance workspace — everything that gets the plant looked after, in the
   same frame as Configure and Devices: the section bar, then the machine bar
   (the one machine filter, plus the section's views and actions), then the
   section.

     Overview      what needs doing next, most urgent first
     Problems      cases from the first sign to a checked repair (+ guides)
     Preventive    rounds at fixed intervals
     Predictive    checks raised by alarms, jobs engineers plan
     Proactive     part life: replace before it wears out
     Work orders   every job from request to closed (+ history)
     Calendar      when each job runs (+ people, parts & shutdowns)
     Machines      one machine's drawing, part by part

   Problems works on every plant; the planned sections need the plant's
   maintenance documents (/api/maintenance/pms/line). It opens on
   Preventive, unless another page asked for a section.
   ========================================================================== */

const FULL_LINE = "full-line";

/** Title and one plain line under it, per page. */
const PAGE_HEAD: Record<PmsPage, { title: string; context: string }> = {
  overview: { title: "Overview", context: "What needs doing next on the line, the most urgent first." },
  problems: { title: "Problems", context: "Each case follows one problem from the first sign to a checked repair." },
  guides: { title: "Investigation guides", context: "Step-by-step guides for common problems: what to read, what to check, what may cause it. Start a case from one." },
  preventive: { title: "Preventive", context: "Routine checks and servicing at fixed times: daily, weekly, every 15 days and monthly." },
  predictive: { title: "Predictive & planned", context: "Checks raised automatically when an alarm goes off, and jobs engineers plan from what the readings show." },
  proactive: { title: "Proactive", context: "Each part's remaining life, so it is replaced before it wears out." },
  work: { title: "Work orders", context: "Every repair and service job, from request to closed." },
  history: { title: "History & performance", context: "Jobs done before, and how well maintenance keeps up." },
  calendar: { title: "Calendar", context: "When each round and job is planned." },
  resources: { title: "People, parts & shutdowns", context: "Who and what each planned job needs, and which shutdowns it waits for." },
  machine: { title: "Machines", context: "One machine's drawing: pick a part to see its problems, readings, checks and jobs." },
};

/** Maintenance opens on Preventive, unless another page asked for one (`requestMaintenancePage`, taken once). */
function storedPage(): PmsPage {
  try {
    const v = localStorage.getItem(MAINT_PAGE_KEY);
    localStorage.removeItem(MAINT_PAGE_KEY);
    if (v && PMS_PAGES.some((p) => p.id === v)) return v as PmsPage;
  } catch {
    /* storage unavailable */
  }
  return "preventive";
}

export function MaintenanceWorkspace() {
  const { selectedPlantId } = useIndustrialData();
  const pms = usePmsLine();
  const [page, setPage] = useState<PmsPage>(storedPage);
  // Remounting a page on every switch lets it read the focus another page left.
  const [visit, setVisit] = useState(0);
  const [machineId, setMachineId] = useState<string | null>(null);
  const [caseId, setCaseId] = useState<number | null>(null);
  const [newCase, setNewCase] = useState<{ open: boolean; preset?: NewCasePreset }>({ open: false });
  const defaultMachine = useDefaultMachine(pms.data?.machineIds);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const nav = useCallback((p: PmsPage, focus?: string) => {
    if (focus) setPmsFocus(focus);
    // Opening a machine from another page sets the machine bar (the one machine filter).
    if (focus?.startsWith("m:")) setMachineId(focus.slice(2));
    setPage(p);
    setVisit((v) => v + 1);
    bodyRef.current?.scrollTo({ top: 0 });
  }, []);

  // Another page asked for a section (an old Problems link, a case to open).
  useEffect(() => {
    const onPage = (e: Event) => {
      const p = (e as CustomEvent<PmsPage>).detail;
      // Taken here, so the next visit opens on Preventive again.
      try {
        localStorage.removeItem(MAINT_PAGE_KEY);
      } catch {
        /* storage unavailable */
      }
      if (PMS_PAGES.some((x) => x.id === p)) nav(p);
    };
    const takeCase = () => {
      const id = takeCaseToOpen();
      if (id) {
        setCaseId(id);
        nav("problems");
      }
    };
    takeCase();
    const onCase = (e: Event) => {
      const id = Number((e as CustomEvent<{ id?: number }>).detail?.id);
      takeCaseToOpen();
      if (Number.isFinite(id) && id > 0) {
        setCaseId(id);
        nav("problems");
      }
    };
    window.addEventListener(MAINT_PAGE_EVENT, onPage);
    window.addEventListener(OPEN_CASE_EVENT, onCase);
    return () => {
      window.removeEventListener(MAINT_PAGE_EVENT, onPage);
      window.removeEventListener(OPEN_CASE_EVENT, onCase);
    };
  }, [nav]);

  // Planned sections only where the plant has maintenance documents; Problems everywhere.
  // Until the plans have loaded the sections stay, so a slow answer never reads as "no plans".
  const known = pms.data !== undefined || Boolean(pms.error);
  const planned = !known || (pms.data?.machineIds.length ?? 0) > 0;
  const tabs = PMS_TABS.filter((t) => planned || !t.planned);
  const tab = pmsTabOf(page);
  const shownPage: PmsPage = tabs.includes(tab) ? page : "problems";
  const shownTab = pmsTabOf(shownPage);

  // Machine bar: the plant's machine pills (as the Operator view names them). Planned sections
  // list the machines with planned maintenance; Problems lists every machine.
  const plantTabs = usePlantMachineTabs();
  const machinePills = useMemo(() => {
    const ids = pms.data?.machineIds ?? [];
    const all = shownTab.planned === false || !pms.data;
    const pills = plantTabs.flatMap((t) =>
      t.machineId === null ? [{ id: FULL_LINE, label: t.label }] : all || ids.includes(t.machineId) ? [{ id: t.machineId, label: t.label }] : [],
    );
    // A planned machine without a pill of its own (outside the plant's drawing groups) keeps its name.
    const shown = new Set(pills.map((t) => t.id));
    return all ? pills : [...pills, ...ids.filter((id) => !shown.has(id)).map((id) => ({ id, label: machineName(id) }))];
  }, [plantTabs, pms.data, shownTab.planned]);
  const machineFilter = machineId && machinePills.some((p) => p.id === machineId) ? machineId : null;
  // Machines always shows one machine.
  useEffect(() => {
    if (shownPage === "machine" && !machineFilter && defaultMachine) setMachineId(defaultMachine);
  }, [shownPage, machineFilter, defaultMachine]);
  const pickMachine = (id: string) => {
    if (id === FULL_LINE) {
      setMachineId(null);
      if (shownPage === "machine") nav("overview");
      return;
    }
    setMachineId(id);
    setCaseId(null);
  };

  // Every planned page reads the model narrowed to the picked machine; memoised on the model's
  // own parts so the per-second frame does not re-derive the pages.
  const narrowed = useMemo(() => {
    if (!machineFilter || !pms.data) return null;
    const on = (x: { machineId: string }) => x.machineId === machineFilter;
    return {
      data: {
        ...pms.data,
        machineIds: [machineFilter],
        plans: pms.data.plans.filter(on),
        workOrders: pms.data.workOrders.filter(on),
        records: pms.data.records.filter(on),
        events: pms.data.events.filter(on),
      },
      findings: pms.findings.filter(on),
      openWos: pms.openWos.filter(on),
      queue: pms.queue.filter(on),
    };
  }, [machineFilter, pms.data, pms.findings, pms.openWos, pms.queue]);
  const scoped: PmsModel = narrowed ? { ...pms, ...narrowed } : pms;

  // Section counts: what each holds that needs someone.
  const { data: caseList } = useApi<CaseList>(selectedPlantId ? casesUrl({ plantId: selectedPlantId }) : null);
  const openCases = (caseList?.cases ?? []).filter((c) => c.stage !== "closed" && (!machineFilter || c.machineId === machineFilter));
  const p1 = scoped.queue.filter((q) => q.priority === "P1").length;
  const overdue = scoped.queue.filter((q) => q.kind === "plan" && q.status.label === "Overdue").length;
  const counts: Partial<Record<PmsPage, { count: number; tone?: string }>> = {
    overview: { count: scoped.queue.length, tone: p1 ? "bad" : overdue ? "warn" : undefined },
    problems: { count: openCases.length, tone: openCases.some((c) => c.priority === "urgent") ? "bad" : undefined },
    work: { count: scoped.openWos.length },
  };

  const head = PAGE_HEAD[shownPage];
  const startCase = (preset?: NewCasePreset) => setNewCase({ open: true, preset: preset ?? (machineFilter ? { machineId: machineFilter } : undefined) });
  const isProblems = shownTab.id === "problems";

  return (
    <PmsNavProvider value={nav}>
      <div className="cfg-shell pm-shell" aria-label="Maintenance">
        <header className="opc-topbar cfg-topbar" aria-label="Maintenance sections">
          <div className="opc-stage-tabs">
            <div className="opc-pill-group" role="tablist" aria-label="Maintenance sections">
              {tabs.map((t) => {
                const active = shownTab.id === t.id;
                const c = counts[t.id];
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className="opc-pill-btn"
                    data-active={active || undefined}
                    onClick={() => {
                      if (t.id === "problems") setCaseId(null);
                      nav(t.id);
                    }}
                  >
                    {c?.tone && <span className="ph-unit-dot" data-tone={c.tone} aria-hidden="true" />}
                    <span>{t.label}</span>
                    {c && c.count > 0 && <span className="opc-app-count">{c.count}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        <div className="opc-subbar cfg-subbar" role="region" aria-label={`${shownTab.label}: machine, views and actions`}>
          <div className="opc-stage-tabs">
            <div className="opc-pill-group opc-subassembly-pills" role="tablist" aria-label="Machine">
              {machinePills.map((m) => {
                const active = (machineFilter ?? FULL_LINE) === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className="opc-pill-btn"
                    data-active={active || undefined}
                    onClick={() => pickMachine(m.id)}
                  >
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="opc-stage-toggles">
            <PmsViewNav page={shownPage} />
            {isProblems && (
              <PillButton variant="primary" onClick={() => startCase()}>
                Start a case
              </PillButton>
            )}
          </div>
        </div>

        <div ref={bodyRef} className="pg-root ast-root cfg-root pm-workspace">
          <div className="cfg-main">
            <header className="ast-head pg-head">
              <div className="ast-head-main">
                <div className="ast-title-row">
                  <h1 className="ast-title">{head.title}</h1>
                  {/* Colour only for Critical (P1 work) or Alert (overdue rounds). */}
                  {shownPage === "overview" && scoped.data && (p1 || overdue) ? (
                    <StatusTag tone={p1 ? "bad" : "warn"} label={p1 ? `${p1} need action now` : `${overdue} rounds overdue`} />
                  ) : null}
                </div>
                <p className="pg-cfg-context">
                  {machineFilter ? `${machineName(machineFilter)}. ` : ""}
                  {head.context}
                </p>
              </div>
            </header>

            <div className="pm-workspace-body" key={`${shownPage}-${visit}-${machineFilter ?? FULL_LINE}`}>
              {isProblems && (
                <ProblemsSection
                  view={shownPage === "guides" ? "guides" : "problems"}
                  machineId={machineFilter}
                  caseId={caseId}
                  onOpenCase={setCaseId}
                  onCloseCase={() => setCaseId(null)}
                  onStartCase={startCase}
                />
              )}
              {shownPage === "overview" && <PageOverview pms={scoped} />}
              {shownPage === "preventive" && <PagePreventive pms={scoped} />}
              {shownPage === "predictive" && <PagePredictive pms={scoped} />}
              {shownPage === "proactive" && <PageProactive pms={scoped} />}
              {shownPage === "work" && <PageWork pms={scoped} />}
              {shownPage === "calendar" && <PageCalendar pms={scoped} />}
              {shownPage === "machine" && <PageMachine pms={scoped} machineId={machineFilter} onMachineChange={setMachineId} />}
              {shownPage === "resources" && <PageResources pms={scoped} />}
              {shownPage === "history" && <PageHistory pms={scoped} />}
            </div>
          </div>
        </div>

        <NewCaseDialog
          open={newCase.open}
          preset={newCase.preset}
          onClose={() => setNewCase({ open: false })}
          onCreated={(id) => {
            setNewCase({ open: false });
            setCaseId(id);
            nav("problems");
          }}
        />
      </div>
    </PmsNavProvider>
  );
}
