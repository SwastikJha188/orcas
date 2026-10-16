"use client";

import React, { useCallback, useState } from "react";
import { PillNav } from "@/components/ui";
import { StatusTag } from "@/components/assets/assets-shell-ui";
import { usePmsLine } from "./pms-model";
import { PMS_PAGES, PmsNavProvider, setPmsFocus, type PmsPage } from "./pms-ui";
import { PageOverview } from "./page-overview";
import { PageCalendar } from "./page-calendar";
import { PageMachine } from "./page-machine";
import { PageCondition } from "./page-condition";
import { PageWork } from "./page-work";
import { PageResources } from "./page-resources";
import { PageHistory } from "./page-history";
import "@/components/assets/assets-shell.css";
import "@/components/assets/analysis/analysis-page.css";
import "@/components/ui/page.css";
import "./pms.css";

/* ==========================================================================
   Maintenance workspace (OSW-SW-PMS-PYR-01): the work-management layer of
   ULTRON for the pyro line. Seven connected pages:
     Overview · Calendar · Machine maintenance · Condition planning ·
     Work orders & checklists · Resources & shutdown · History & performance
   Plans, work orders, checklist results and the audit trail come from
   /api/maintenance/pms/line; findings from the live line simulation.
   ========================================================================== */

export function MaintenanceWorkspace() {
  const [page, setPage] = useState<PmsPage>("overview");
  // Remounting a page on every switch lets it read the focus another page left.
  const [visit, setVisit] = useState(0);
  const pms = usePmsLine();
  const nav = useCallback((p: PmsPage, focus?: string) => {
    if (focus) setPmsFocus(focus);
    setPage(p);
    setVisit((v) => v + 1);
    document.querySelector(".pm-workspace")?.scrollTo({ top: 0 });
  }, []);

  const active = PMS_PAGES.find((p) => p.id === page) ?? PMS_PAGES[0];
  const p1 = pms.queue.filter((q) => q.priority === "P1").length;
  const overdue = pms.queue.filter((q) => q.kind === "plan" && q.status.label === "Overdue").length;

  return (
    <PmsNavProvider value={nav}>
      <div className="pg-root ast-root pm-workspace" aria-label="Maintenance">
        <header className="ast-head pg-head">
          <div className="ast-head-main">
            <ol className="ast-crumbs" aria-label="Location">
              <li>Maintenance</li>
              <li>Pyro line</li>
              <li>{active.label}</li>
            </ol>
            <div className="ast-title-row">
              <h1 className="ast-title">Planned maintenance</h1>
              {pms.data && (
                <StatusTag
                  tone={p1 ? "bad" : overdue ? "warn" : "good"}
                  label={p1 ? `${p1} immediate` : overdue ? `${overdue} rounds overdue` : `${pms.data.machineIds.length} machines · ${pms.queue.length} in queue`}
                />
              )}
            </div>
          </div>
        </header>

        <PillNav items={PMS_PAGES} activeId={page} onChange={(id) => nav(id as PmsPage)} ariaLabel="Maintenance pages" />

        <div className="pm-workspace-body" key={`${page}-${visit}`}>
          {page === "overview" && <PageOverview pms={pms} />}
          {page === "calendar" && <PageCalendar pms={pms} />}
          {page === "machine" && <PageMachine pms={pms} />}
          {page === "condition" && <PageCondition pms={pms} />}
          {page === "work" && <PageWork pms={pms} />}
          {page === "resources" && <PageResources pms={pms} />}
          {page === "history" && <PageHistory pms={pms} />}
        </div>
      </div>
    </PmsNavProvider>
  );
}
