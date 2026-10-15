"use client";

import React, { useEffect, useRef, useState } from "react";
import { PillNav, PillButton } from "@/components/ui";
import { AssetHierarchyPage } from "./hierarchy/asset-hierarchy-page";
import { MachineDiagram } from "./machine-diagram";
import { MachineSensorMappingView } from "./machine-sensor-mapping-view";
import { MachineAnalysisPage } from "./analysis/analysis-page";
import { MachinePrognosisPage } from "./prognosis/prognosis-page";
import { DiagnosisView } from "./diagnosis-view";
import { MachineHealthPage } from "./health-page";
import { TrendsView } from "./trends-view";
import type { AssetMachine } from "./assets-data";
import { MachineRackTab } from "./acquisition/acquisition-view";
import { useKilnSimulationFor } from "@/providers/kiln-simulation-context";
import { IconBack } from "./assets-shell-ui";
import { SimulationView } from "./simulation-view";
import { ThermalView } from "./thermal-view";
import "./assets-shell.css";

// Machine tabs, ordered by the operator's questions:
// is it OK → which part → what's wrong → why → what's next → history → setup.
export type AssetsSubPage =
  | "overview"
  | "health"
  | "diagnosis"
  | "analysis"
  | "prognosis"
  | "trends"
  | "sensors"
  | "rack"
  | "thermal"
  | "simulation";

// Five tabs. Diagnosis and Sensors each hold several pages, switched by a view
// control at the end of the tab row. Page ids stay addressable on their own
// (deep links, cross-page buttons), the tab row just groups them.
type TabGroup = { id: string; label: string; views: { id: AssetsSubPage; label: string; requires?: "live" | "shell" }[] };

const TAB_GROUPS: TabGroup[] = [
  { id: "overview", label: "Overview", views: [{ id: "overview", label: "Overview" }] },
  {
    id: "diagnosis",
    label: "Diagnosis",
    views: [
      { id: "diagnosis", label: "Diagnosis" },
      { id: "health", label: "Health" },
      // Machines with a kiln shell scanner profile (frame.defs.hasShell).
      { id: "thermal", label: "Thermal", requires: "shell" },
    ],
  },
  { id: "prognosis", label: "Prognosis", views: [{ id: "prognosis", label: "Prognosis" }] },
  { id: "analysis", label: "Analysis", views: [{ id: "analysis", label: "Analysis" }] },
  {
    id: "sensors",
    label: "Sensors",
    views: [
      { id: "sensors", label: "Mapping" },
      { id: "trends", label: "Trends" },
      { id: "rack", label: "Rack" },
      // Live machines only: the demonstration that drives the signals.
      { id: "simulation", label: "Simulation", requires: "live" },
    ],
  },
];

const groupOf = (page: AssetsSubPage) =>
  TAB_GROUPS.find((g) => g.views.some((v) => v.id === page)) ?? TAB_GROUPS[0];

import { useIndustrialData } from "@/providers/industrial-data-context";

export interface AssetsViewProps {
  selectedMachineId?: string | null;
  onSelectMachineId?: (id: string | null) => void;
  subPage?: AssetsSubPage;
  onSubPageChange?: (page: AssetsSubPage) => void;
}

export function AssetsView({
  selectedMachineId: externalMachineId,
  onSelectMachineId,
  subPage: externalSubPage,
  onSubPageChange,
}: AssetsViewProps = {}) {
  let contextMachineId: string | null | undefined;
  let contextSetMachineId: ((id: string | null) => void) | undefined;
  let contextSubPage: AssetsSubPage | undefined;
  let contextSetSubPage: ((page: AssetsSubPage) => void) | undefined;
  let contextSelectedMachine: AssetMachine | null | undefined;

  try {
    const dataContext = useIndustrialData();
    contextMachineId = dataContext.selectedMachineId;
    contextSetMachineId = dataContext.setSelectedMachineId;
    contextSubPage = dataContext.activeSubPage;
    contextSetSubPage = dataContext.setActiveSubPage;
    contextSelectedMachine = dataContext.selectedMachine;
  } catch {
    // Fallback when outside provider
  }

  const [internalMachineId, setInternalMachineId] = useState<string | null>(null);
  const selectedMachineId =
    externalMachineId !== undefined
      ? externalMachineId
      : (contextMachineId !== undefined ? contextMachineId : internalMachineId);

  const setSelectedMachineId = (id: string | null) => {
    setInternalMachineId(id);
    contextSetMachineId?.(id);
    onSelectMachineId?.(id);
  };

  const handleBackToAssets = () => {
    setSelectedMachineId(null);
  };

  const [internalSubPage, setInternalSubPage] = useState<AssetsSubPage>("overview");
  const activeSubPage =
    externalSubPage || contextSubPage || internalSubPage;

  const setActiveSubPage = (page: AssetsSubPage) => {
    setInternalSubPage(page);
    contextSetSubPage?.(page);
    onSubPageChange?.(page);
  };


  // Last view opened inside each grouped tab.
  const [lastView, setLastView] = useState<Record<string, AssetsSubPage>>({});
  useEffect(() => {
    const group = groupOf(activeSubPage);
    setLastView((prev) => (prev[group.id] === activeSubPage ? prev : { ...prev, [group.id]: activeSubPage }));
  }, [activeSubPage]);

  const handleNavigateToTrends = () => setActiveSubPage("trends");
  const handleNavigateToDiagnosis = () => setActiveSubPage("diagnosis");
  const handleNavigateToSensors = () => setActiveSubPage("sensors");
  const handleNavigateToHealth = () => setActiveSubPage("health");

  // Selected machine comes only from PostgreSQL (data context); no static fallback.
  const selectedMachine = selectedMachineId
    ? (contextSelectedMachine?.id === selectedMachineId ? contextSelectedMachine : null)
    : null;

  // Only a live machine (kiln fleet or pyro line) follows the 1 s tick; other machines get null.
  const kilnSimulation = useKilnSimulationFor(selectedMachine?.id) ?? undefined;

  // Narrow screens scroll the tab row sideways: keep the active tab and view in view.
  // Phones stack the view switcher under the tabs, so each group may scroll on its own.
  const tabsRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const bar = tabsRef.current;
    if (!bar) return;
    for (const tab of bar.querySelectorAll<HTMLElement>(".nav-pill.active")) {
      const group = tab.closest<HTMLElement>(".nav-pill-group");
      const scroller = group && group.scrollWidth > group.clientWidth ? group : bar;
      if (scroller.scrollWidth <= scroller.clientWidth) continue;
      const b = scroller.getBoundingClientRect();
      const t = tab.getBoundingClientRect();
      const uz = b.width / (scroller.offsetWidth || b.width) || 1; // rects are zoomed px on TV, scrollLeft is CSS px
      if (t.left < b.left || t.right > b.right) scroller.scrollLeft += (t.left - b.left - (b.width - t.width) / 2) / uz;
    }
  }, [activeSubPage, selectedMachine?.id]);

  // If no machine is selected, display the Assets Directory Homepage with the sidebar!
  if (!selectedMachineId || !selectedMachine) {
    return (
      <AssetHierarchyPage />
    );
  }

  // Simulation exists on live machines, Thermal on those with a shell scanner; elsewhere show Overview.
  const hasShell = Boolean(kilnSimulation?.frame.defs.hasShell);
  const available = (req: "live" | "shell" | undefined) => !req || (req === "shell" ? hasShell : Boolean(kilnSimulation));
  const page =
    (activeSubPage === "simulation" && !available("live")) || (activeSubPage === "thermal" && !available("shell")) ? "overview" : activeSubPage;
  const groupViews = (g: TabGroup) => g.views.filter((v) => available(v.requires));
  const activeGroup = groupOf(page);
  const activeViews = groupViews(activeGroup);

  return (
    <div className="assets-module-container">
      {/* SECONDARY SIDEBAR DISAPPEARS WHEN A MACHINE IS SELECTED */}

      {/* MACHINE DETAIL WORKSPACE */}
      <main className="assets-machine-workspace" aria-label="Machine">
        {/* Machine header: crumbs → title · id, single back action */}
        <header className="ast-head">
          <div className="ast-head-main">
            <ol className="ast-crumbs" aria-label="Location">
              <li>Assets</li>
              <li>{selectedMachine.plant}</li>
              <li>{selectedMachine.area}</li>
              <li>{selectedMachine.processCell}</li>
            </ol>
            <div className="ast-title-row">
              <h1 className="ast-title">{selectedMachine.name}</h1>
              <span className="ast-id">{selectedMachine.id}</span>
            </div>
          </div>
          <PillButton variant="secondary" onClick={handleBackToAssets} icon={<IconBack />}>
            All assets
          </PillButton>
        </header>

        {/* 1. HORIZONTAL PILL NAVIGATION (Tabs) */}
        <div className="machine-tabs-bar" ref={tabsRef}>
          <PillNav
            items={TAB_GROUPS}
            activeId={activeGroup.id}
            onChange={(id) => {
              const group = TAB_GROUPS.find((g) => g.id === id);
              if (!group) return;
              // Return to the view last opened in that tab.
              const last = lastView[group.id];
              setActiveSubPage(last && groupViews(group).some((v) => v.id === last) ? last : group.views[0].id);
            }}
          />
          {activeViews.length > 1 && (
            <PillNav
              className="machine-views-nav"
              items={activeViews}
              activeId={page}
              onChange={(id) => setActiveSubPage(id as AssetsSubPage)}
            />
          )}
        </div>

        {/* ==============================================================
            PAGE 1: OVERVIEW PAGE (KILN SEALS LIVE SIMULATION & DIAGRAMS)
            ============================================================== */}
        {page === "overview" && (
          <section className="subpage-content" aria-label="Overview">
            <MachineDiagram
              machine={selectedMachine}
              onNavigateToDiagnosis={handleNavigateToDiagnosis}
              simulation={kilnSimulation}
            />
          </section>
        )}

        {page === "health" && (
          <section className="subpage-content" aria-label="Health">
            <MachineHealthPage key={selectedMachine.id} machine={selectedMachine} />
          </section>
        )}

        {page === "diagnosis" && (
          <section className="subpage-content" aria-label="Diagnosis">
            <DiagnosisView
              key={selectedMachine.id}
              machine={selectedMachine}
              onNavigateToSensors={handleNavigateToSensors}
              onNavigateToTrends={handleNavigateToTrends}
              onNavigateToHealth={handleNavigateToHealth}
            />
          </section>
        )}

        {page === "analysis" && (
          <section className="subpage-content" aria-label="Analysis">
            <MachineAnalysisPage
              key={selectedMachine.id}
              machine={selectedMachine}
            />
          </section>
        )}

        {page === "prognosis" && (
          <section className="subpage-content" aria-label="Prognosis">
            <MachinePrognosisPage
              key={selectedMachine.id}
              machine={selectedMachine}
            />
          </section>
        )}

        {page === "trends" && (
          <section className="subpage-content" aria-label="Trends">
            <TrendsView
              key={selectedMachine.id}
              machine={selectedMachine}
              simulation={kilnSimulation}
              onNavigateToSensors={handleNavigateToSensors}
              onNavigateToDiagnosis={handleNavigateToDiagnosis}
            />
          </section>
        )}

        {page === "sensors" && (
          <section className="subpage-content" aria-label="Sensors">
            <MachineSensorMappingView
              machine={selectedMachine}
              simulation={kilnSimulation}
              onNavigateToDiagnosis={handleNavigateToDiagnosis}
              onNavigateToTrends={handleNavigateToTrends}
            />
          </section>
        )}
        {/* Shell scanner map to scale, profile, hottest section, zones. */}
        {page === "thermal" && hasShell && (
          <section className="subpage-content" aria-label="Thermal">
            <ThermalView machine={selectedMachine} />
          </section>
        )}

        {/* Live demonstration: playback, scenario library, findings, event log. */}
        {page === "simulation" && kilnSimulation && (
          <section className="subpage-content" aria-label="Simulation">
            <SimulationView simulation={kilnSimulation} />
          </section>
        )}

        {page === "rack" && (
          <section className="subpage-content" aria-label="Rack">
            <MachineRackTab
              key={selectedMachine.id}
              machine={selectedMachine}
              simulation={kilnSimulation}
            />
          </section>
        )}

      </main>
    </div>
  );
}
