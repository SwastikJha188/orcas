"use client";

import React, { useCallback, useMemo, useState } from "react";
import { StatusTag } from "@/components/assets/assets-shell-ui";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { machineName, useDefaultMachine, usePmsLine } from "./pms-model";
import { usePlantMachineTabs } from "@/components/home/operator/machine-nav";
import { PMS_PAGES, PmsNavProvider, setPmsFocus, type PmsPage } from "./pms-ui";
import { PageOverview } from "./page-overview";
import { PageCalendar } from "./page-calendar";
import { PageMachine } from "./page-machine";
import { PagePreventive } from "./page-preventive";
import { PagePredictive } from "./page-predictive";
import { PageProactive } from "./page-proactive";
import { PageWork } from "./page-work";
import { PageResources } from "./page-resources";
import { PageHistory } from "./page-history";
import "@/components/assets/assets-shell.css";
import "@/components/assets/analysis/analysis-page.css";
import "@/components/ui/page.css";
import "@/components/home/plant-home.css";
import "@/components/home/operator/operator-console.css";
import "./pms.css";

/* ==========================================================================
   Maintenance workspace (OSW-SW-PMS-PYR-01): planned maintenance for the
   active plant. Connected pages:
     Overview · Preventive (rounds by interval) · Predictive & planned (checks
     raised by alarms, jobs engineers plan) · Proactive (remaining life) ·
     Work orders · Calendar · Machine maintenance · Resources & shutdown ·
     History & performance
   Plans, work orders, checklist results and the audit trail come from
   /api/maintenance/pms/line (the machines with checklists are the machine
   tabs); live findings from the plant simulation. Nothing here is stored in
   the browser except the page last opened.
   ========================================================================== */

const PAGE_KEY = "ultron.maint.page";
const FULL_LINE = "full-line";

function storedPage(): PmsPage {
  try {
    const v = localStorage.getItem(PAGE_KEY);
    if (v && PMS_PAGES.some((p) => p.id === v)) return v as PmsPage;
  } catch {
    /* storage unavailable */
  }
  return "overview";
}

export function MaintenanceWorkspace() {
  const { plants, hierarchy, selectedPlantId, setActiveTab } = useIndustrialData();
  const pms = usePmsLine();
  const [page, setPage] = useState<PmsPage>(storedPage);
  // Remounting a page on every switch lets it read the focus another page left.
  const [visit, setVisit] = useState(0);
  const [machineId, setMachineId] = useState<string | null>(null);
  const defaultMachine = useDefaultMachine(pms.data?.machineIds);

  const nav = useCallback((p: PmsPage, focus?: string) => {
    if (focus) setPmsFocus(focus);
    setPage(p);
    setVisit((v) => v + 1);
    try {
      localStorage.setItem(PAGE_KEY, p);
    } catch {
      /* storage unavailable */
    }
    document.querySelector(".opc-module-stage")?.scrollTo({ top: 0 });
  }, []);

  const switchToHomeView = useCallback(
    (v: "operator" | "twin" | "assets") => {
      // Assets is its own workspace.
      if (v === "assets") {
        setActiveTab("assets");
        return;
      }
      try {
        localStorage.setItem("ultron.home.viewMode", v);
      } catch {
        /* storage unavailable */
      }
      window.dispatchEvent(new CustomEvent("ultron:set-home-view", { detail: v }));
      setActiveTab("home");
    },
    [setActiveTab],
  );

  // Machine tabs: the plant's machine pills (as the Operator view names them) that have
  // planned maintenance (database).
  const plantTabs = usePlantMachineTabs();
  const machineTabs = useMemo(() => {
    const planned = pms.data?.machineIds ?? [];
    const tabs = plantTabs.flatMap((t) =>
      t.machineId === null ? [{ id: FULL_LINE, label: t.label }] : planned.includes(t.machineId) ? [{ id: t.machineId, label: t.label }] : [],
    );
    // A planned machine without a pill of its own (outside the plant's drawing groups) keeps its name.
    const shown = new Set(tabs.map((t) => t.id));
    return [...tabs, ...planned.filter((id) => !shown.has(id)).map((id) => ({ id, label: machineName(id) }))];
  }, [plantTabs, pms.data]);
  const shownMachine = machineId && pms.data?.machineIds.includes(machineId) ? machineId : defaultMachine;
  const activeMachineTab = page === "machine" ? (shownMachine ?? FULL_LINE) : FULL_LINE;
  const pickMachineTab = (id: string) => {
    if (id === FULL_LINE) {
      if (page === "machine") nav("overview");
      return;
    }
    setMachineId(id);
    if (page !== "machine") nav("machine");
  };

  const pageIdx = Math.max(0, PMS_PAGES.findIndex((p) => p.id === page));
  const active = PMS_PAGES[pageIdx];
  const step = (delta: number) => nav(PMS_PAGES[(pageIdx + delta + PMS_PAGES.length) % PMS_PAGES.length].id);

  const plantName = plants.find((p) => p.id === selectedPlantId)?.name ?? hierarchy.find((p) => p.id === selectedPlantId)?.name ?? null;
  const p1 = pms.queue.filter((q) => q.priority === "P1").length;
  const overdue = pms.queue.filter((q) => q.kind === "plan" && q.status.label === "Overdue").length;

  return (
    <PmsNavProvider value={nav}>
      <div className="ph-root ph-operator-canvas ast-root" aria-label="Maintenance">
        <div className="opc-shell">
          {/* ROW 1: machines with planned maintenance (left) + view switcher (right) */}
          <header className="opc-topbar">
            <div className="opc-stage-tabs" role="tablist" aria-label="Machines">
              <div className="opc-pill-group">
                {machineTabs.map((item) => {
                  const isActive = activeMachineTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      data-active={isActive || undefined}
                      className={`opc-pill-btn ${isActive ? "is-active" : ""}`}
                      onClick={() => pickMachineTab(item.id)}
                    >
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="opc-topbar-right">
              <div className="opc-pill-group" role="tablist" aria-label="How to show the plant">
                {(["operator", "twin", "assets"] as const).map((v) => (
                  <button key={v} type="button" role="tab" aria-selected={false} className="opc-pill-btn" onClick={() => switchToHomeView(v)}>
                    <span>{v === "operator" ? "Operator view" : v === "twin" ? "3D twin" : "Assets"}</span>
                  </button>
                ))}
              </div>
            </div>
          </header>

          <div className="opc-workspace">
            <div className="opc-main-col">
              {/* ROW 2: maintenance pages + stepper */}
              <div className="opc-subbar">
                <div className="opc-stage-toggles">
                  <div className="opc-pill-group" role="tablist" aria-label="Maintenance pages">
                    {PMS_PAGES.map((item) => {
                      const isActive = page === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          data-active={isActive || undefined}
                          className={`opc-pill-btn ${isActive ? "is-active" : ""}`}
                          onClick={() => nav(item.id)}
                        >
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="opc-stepper" aria-label="Previous or next page">
                    <span className="opc-stepper-pos">
                      {pageIdx + 1}/{PMS_PAGES.length}
                    </span>
                    <button type="button" className="opc-step-btn" onClick={() => step(-1)} aria-label="Previous page">
                      ‹
                    </button>
                    <button type="button" className="opc-step-btn" onClick={() => step(1)} aria-label="Next page">
                      ›
                    </button>
                  </div>
                </div>
              </div>

              <div className="opc-module-stage">
                <div className="pg-root ast-root pm-workspace" style={{ padding: 0 }}>
                  <header className="ast-head pg-head">
                    <div className="ast-head-main">
                      <ol className="ast-crumbs" aria-label="Location">
                        <li>Maintenance</li>
                        <li>{plantName ?? "—"}</li>
                        <li>{active.label}</li>
                      </ol>
                      <div className="ast-title-row">
                        <h1 className="ast-title">Planned maintenance</h1>
                        {pms.data && (
                          <StatusTag
                            tone={p1 ? "bad" : overdue ? "warn" : "good"}
                            label={
                              p1
                                ? `${p1} need action now`
                                : overdue
                                  ? `${overdue} rounds overdue`
                                  : `${pms.data.machineIds.length} ${pms.data.machineIds.length === 1 ? "machine" : "machines"} · ${pms.queue.length} waiting`
                            }
                          />
                        )}
                      </div>
                    </div>
                  </header>

                  <div className="pm-workspace-body" key={`${page}-${visit}`}>
                    {page === "overview" && <PageOverview pms={pms} />}
                    {page === "preventive" && <PagePreventive pms={pms} />}
                    {page === "predictive" && <PagePredictive pms={pms} />}
                    {page === "proactive" && <PageProactive pms={pms} />}
                    {page === "work" && <PageWork pms={pms} />}
                    {page === "calendar" && <PageCalendar pms={pms} />}
                    {page === "machine" && <PageMachine pms={pms} machineId={shownMachine} onMachineChange={setMachineId} />}
                    {page === "resources" && <PageResources pms={pms} />}
                    {page === "history" && <PageHistory pms={pms} />}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PmsNavProvider>
  );
}
