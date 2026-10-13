"use client";

import React, { useState } from "react";
import { PillNav, PillButton } from "@/components/ui";
import { AssetHierarchyPage } from "./hierarchy/asset-hierarchy-page";
import { MachineDiagram } from "./machine-diagram";
import { MachineSensorMappingView } from "./machine-sensor-mapping-view";
import { MachineAnalysisTab, MachinePrognosisTab } from "./insights-view";
import type { AnalysisTabPage } from "./analysis-view";
import { DiagnosisView, MachineHealthView } from "./diagnosis-view";
import { TrendsView } from "./trends-view";
import type { AssetMachine } from "./assets-data";
import { MachineRackTab } from "./acquisition/acquisition-view";
import { useKilnSimulationFor } from "@/providers/kiln-simulation-context";
import { IconBack } from "./assets-shell-ui";
import { SimulationView } from "./simulation-view";
import { ThermalView } from "./thermal-view";
import "./assets-shell.css";

// One flat row of machine tabs, ordered by the operator's questions:
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

const SUB_PAGE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "sensors", label: "Sensors" },
  { id: "diagnosis", label: "Diagnosis" },
  { id: "prognosis", label: "Prognosis" },
  { id: "analysis", label: "Analysis" },
  { id: "health", label: "Health" },
  { id: "trends", label: "Trends" },
  { id: "rack", label: "Rack" },
];

// Kiln-only: the shell scanner map and the live demonstration controls get their own tabs.
const THERMAL_TAB = { id: "thermal", label: "Thermal" };
const SIMULATION_TAB = { id: "simulation", label: "Simulation" };

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

  // Analysis sub-page is lifted so Prognosis tiles can open their module there.
  const [analysisPage, setAnalysisPage] = useState<AnalysisTabPage>("overview");
  const handleOpenAnalysis = (page: AnalysisTabPage) => {
    setAnalysisPage(page);
    setActiveSubPage("analysis");
  };

  const handleNavigateToTrends = () => setActiveSubPage("trends");
  const handleNavigateToDiagnosis = () => setActiveSubPage("diagnosis");
  const handleNavigateToSensors = () => setActiveSubPage("sensors");
  const handleNavigateToHealth = () => setActiveSubPage("health");

  // Selected machine comes only from PostgreSQL (data context); no static fallback.
  const selectedMachine = selectedMachineId
    ? (contextSelectedMachine?.id === selectedMachineId ? contextSelectedMachine : null)
    : null;

  // Only a kiln workspace follows the 1 s tick; other machines get null.
  const kilnSimulation = useKilnSimulationFor(selectedMachine?.id) ?? undefined;

  // If no machine is selected, display the Assets Directory Homepage with the sidebar!
  if (!selectedMachineId || !selectedMachine) {
    return (
      <AssetHierarchyPage
        onOpenMachine={(machId) => {
          setActiveSubPage("overview");
          setSelectedMachineId(machId);
        }}
      />
    );
  }

  // The Thermal and Simulation tabs only exist on kiln machines; elsewhere show Overview.
  const page = (activeSubPage === "simulation" || activeSubPage === "thermal") && !kilnSimulation ? "overview" : activeSubPage;

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
        <div className="machine-tabs-bar">
          <PillNav
            items={kilnSimulation ? [...SUB_PAGE_TABS.slice(0, 3), THERMAL_TAB, ...SUB_PAGE_TABS.slice(3), SIMULATION_TAB] : SUB_PAGE_TABS}
            activeId={page}
            onChange={(id) => {
              if (id === "analysis") setAnalysisPage("overview");
              setActiveSubPage(id as AssetsSubPage);
            }}
          />
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
            <MachineHealthView
              key={selectedMachine.id}
              machine={selectedMachine}
              onNavigateToSensors={handleNavigateToSensors}
            />
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
            <MachineAnalysisTab
              key={selectedMachine.id}
              machine={selectedMachine}
              page={analysisPage}
              onPageChange={setAnalysisPage}
            />
          </section>
        )}

        {page === "prognosis" && (
          <section className="subpage-content" aria-label="Prognosis">
            <MachinePrognosisTab
              key={selectedMachine.id}
              machine={selectedMachine}
              onOpenModule={handleOpenAnalysis}
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
        {page === "thermal" && kilnSimulation && (
          <section className="subpage-content" aria-label="Thermal">
            <ThermalView
              simulation={kilnSimulation}
              onNavigateToTrends={handleNavigateToTrends}
              onNavigateToDiagnosis={handleNavigateToDiagnosis}
            />
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
