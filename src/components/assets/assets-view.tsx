"use client";

import { useComponentScope } from "./component-scope";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { PillButton } from "@/components/ui";
import { conditionTone } from "@/components/ui/status";
import { AssetHierarchyPage } from "./hierarchy/asset-hierarchy-page";
import { machineCondition, nodeTone, subtreeMachines } from "./hierarchy/hierarchy-model";
import { displayName } from "@/lib/display-name";
import { useHierarchyData } from "./hierarchy/use-hierarchy-data";
import { MachineSensorMappingView } from "./machine-sensor-mapping-view";
import { MachineAnalysisPage } from "./analysis/analysis-page";
import { MachinePrognosisPage } from "./prognosis/prognosis-page";
import { DiagnosisView } from "./diagnosis-view";
import { TrendsView } from "./trends-view";
import { MachineRackTab } from "./acquisition/acquisition-view";
import { useOverviewDigest } from "./overview-digest";
import { PageHeaderSlot } from "./analysis/an-ui";
import type { AssetMachine } from "./assets-data";
import { useKilnSimulationFor, usePlantEngineOf } from "@/providers/kiln-simulation-context";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { defsFor } from "@/lib/live-defs";
import {
  MachinePageToggle,
  MachineTopbar,
  PlantStatusBar,
  StatusSummary,
  machineTabs,
  plantKindOf,
  usePlantStatus,
  type MachinePageId,
  type MachineTab,
} from "@/components/home/operator/machine-nav";
import type { MapView } from "@/components/home/plant-home";
import { SimulationView } from "./simulation-view";
import { ThermalView } from "./thermal-view";
import { LineDiagnosis } from "./line/line-diagnosis";
import { LinePrognosis } from "./line/line-prognosis";
import { LineAnalysis } from "./line/line-analysis";
import "./assets-shell.css";
import "@/components/home/operator/operator-console.css";

// Machine tabs, ordered by the operator's questions:
// is it OK → which part → what's wrong → why → what's next → history → setup.
export type AssetsSubPage = "overview" | "health" | "diagnosis" | "analysis" | "prognosis" | "trends" | "sensors" | "rack" | "thermal" | "simulation";

/*
 * Where machine pages live:
 *   Operator view (Home)  the machine's Overview: 2D machine, sub-assemblies, live alarms.
 *   Assets (this file)    asset directory, then a machine's Diagnosis, Prognosis,
 *                         Analysis and Sensors pages (Trends, Rack, Thermal and
 *                         Simulation open as popups over them).
 * Both draw the same three bars (machine-nav.tsx): the plant's machines and the view toggle,
 * then the machine's parts, then its status, quick views and page tabs at the right end. `navigateToMachine`
 * sends each page to its workspace, so every link, tab and toggle follows the
 * same rule. "health" stays a page id for old links (Diagnosis).
 */
type AssetLayerId = "sensors" | "diagnosis" | "prognosis" | "analysis";
type ModalPage = "trends" | "rack" | "thermal" | "simulation";
const isModalPage = (p: AssetsSubPage): p is ModalPage => p === "trends" || p === "rack" || p === "thermal" || p === "simulation";

/** The tab a page belongs to; the Overview is not an Assets page, so it shows Diagnosis. */
function layerOf(p: AssetsSubPage): AssetLayerId {
  if (p === "sensors" || p === "trends" || p === "rack" || p === "simulation") return "sensors";
  if (p === "prognosis" || p === "analysis") return p;
  return "diagnosis";
}

/** Shows a Home view (Operator view or 3D twin); PlantHome listens for the event. */
function showHomeView(view: "operator" | "twin") {
  try {
    localStorage.setItem("ultron.home.viewMode", view);
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new CustomEvent("ultron:set-home-view", { detail: view }));
}

/**
 * Bars 2 and 3 of a machine page, laid out exactly as in the Operator view so nothing moves when
 * you switch between Home and Assets: bar 2 the machine's parts; bar 3 its status on the left, then
 * the quick-look popups and the page tabs (Overview · Diagnosis · Prognosis · Analysis · Sensors)
 * at the right end.
 */
function AssetsMachineBar({
  machine,
  label,
  page,
  onPage,
  onPopup,
}: {
  machine: AssetMachine;
  label: string;
  page: AssetLayerId;
  onPage: (page: MachinePageId) => void;
  onPopup: (popup: "thermal" | "trends" | "rack") => void;
}) {
  const sim = useKilnSimulationFor(machine.id);
  const d = useOverviewDigest(machine, sim?.sensorData);
  const hasData = d.sensors.length > 0 || d.groups.rows.length > 0 || d.isLiveHealth;
  const tone = conditionTone(d.conditionLabel);
  const offNormal = d.counts.Alert + d.counts.Critical;
  return (
    <>
      <div className="opc-subbar ast-part-row" role="region" aria-label="Machine parts">
        <PartBar machine={machine} />
      </div>
      <div className="opc-context-bar" role="region" aria-label="Machine status, quick views and pages">
        <div className="opc-context-left">
          <StatusSummary
            tone={tone}
            label={label}
            health={hasData ? d.overall : null}
            offNormal={offNormal > 0 ? `${offNormal} ${offNormal === 1 ? "sensor needs" : "sensors need"} attention` : null}
          />
        </div>
        <div className="opc-context-right">
        <div className="opc-pill-group opc-subassembly-pills" role="group" aria-label="Quick views">
          {defsFor(machine.id)?.hasShell && (
            <button type="button" className="opc-pill-btn" onClick={() => onPopup("thermal")} title="Kiln shell temperature map">
              Shell temperature <span aria-hidden="true">↗</span>
            </button>
          )}
          <button type="button" className="opc-pill-btn" onClick={() => onPopup("trends")} title="Sensor readings over time">
            Trends <span aria-hidden="true">↗</span>
          </button>
          <button type="button" className="opc-pill-btn" onClick={() => onPopup("rack")} title="Which input card and channel each sensor is wired to">
            Rack <span aria-hidden="true">↗</span>
          </button>
        </div>
          <span className="opc-bar-sep" aria-hidden="true" />
          <MachinePageToggle alarms={d.findings.active.length} active={page} onSelect={onPage} />
        </div>
      </div>
    </>
  );
}

/**
 * Bar 2 on the asset directory, as on the Operator view's Full line: "All" and each machine with its
 * condition and health, so the bar below (status and page tabs) sits where it does on every page.
 * A machine opens its own pages here in Assets.
 */
function DirectoryMachineBar({
  tabs,
  status,
  lookup,
  onOpen,
}: {
  tabs: MachineTab[];
  status: ReturnType<typeof usePlantStatus>;
  lookup: ReturnType<typeof useHierarchyData>["lookup"];
  onOpen: (machineId: string) => void;
}) {
  const units = tabs.flatMap((t) => {
    const node = t.machineId ? status.machines.find((m) => m.machineId === t.machineId) : undefined;
    return node ? [{ tab: t, node }] : [];
  });
  return (
    <div className="opc-subbar" role="region" aria-label="Machines on the line">
      <div className="opc-stage-tabs">
        <div className="opc-pill-group opc-subassembly-pills" role="group" aria-label="Machines on the line">
          <button type="button" className="opc-pill-btn" data-active aria-current="page">
            All
          </button>
          {units.map(({ tab, node }) => {
            const health = machineCondition(node, lookup).health;
            return (
              <button key={tab.key} type="button" className="opc-pill-btn" title={displayName(node.name)} onClick={() => onOpen(tab.machineId!)}>
                <span className="ph-unit-dot" data-tone={nodeTone(node, lookup)} aria-hidden="true" />
                <span>{tab.label}</span>
                <span className="opc-app-count">{health !== null ? `${Math.round(health)}%` : "—"}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * The parts (sub-assemblies) of the machine as pills in bar 2: "Whole machine" or one part,
 * which gives Diagnosis, Prognosis, Analysis and Sensors for that part alone. Each pill
 * carries the part's health dot and score.
 */
function PartBar({ machine }: { machine: AssetMachine }) {
  const { options, selected, select } = useComponentScope(machine);
  const bar = useRef<HTMLDivElement | null>(null);
  // Keep the picked part in view; "Whole machine" brings the row back to its start.
  const selectedId = selected?.id ?? null;
  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    if (!selectedId) el.scrollTo({ left: 0 });
    else el.querySelector<HTMLElement>("[data-active]")?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [selectedId]);
  if (options.length < 2) return null;
  return (
    <div className="opc-stage-tabs ast-part-bar" ref={bar}>
      {/* Same pill size as the Operator view's part row, so the bars line up between Home and Assets. */}
      <div className="opc-pill-group opc-subassembly-pills" role="tablist" aria-label="Parts">
        <button type="button" role="tab" aria-selected={!selected} className="opc-pill-btn" data-active={!selected || undefined} onClick={() => select(null)}>
          Whole machine
        </button>
        {options.map((o) => {
          const on = selected?.id === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="tab"
              aria-selected={on}
              className="opc-pill-btn"
              data-active={on || undefined}
              title={`${o.name}: its own diagnosis, prognosis, analysis and sensors (${o.tags.length} sensors)`}
              onClick={() => select(o.id)}
            >
              <span className="ph-unit-dot" data-tone={conditionTone(o.status)} aria-hidden="true" />
              <span>{o.name}</span>
              <span className="opc-app-count">{o.health !== null ? `${o.health}%` : "—"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AssetsView() {
  const {
    selectedMachineId,
    setActiveTab,
    activeSubPage,
    setActiveSubPage,
    selectedMachine: contextMachine,
    selectedPlantId,
    navigateToMachine,
    navigateToAssetsHome,
    navigateToLine,
    currentUser,
  } = useIndustrialData();
  const { roots, lookup } = useHierarchyData();

  // A machine page's own header renders here, first below the machine bar (PageHeaderSlot).
  const [headerSlot, setHeaderSlot] = useState<HTMLDivElement | null>(null);

  const [detailModal, setDetailModal] = useState<"diagnosis" | "prognosis" | "analysis" | "thermal" | "trends" | "rack" | "simulation" | null>(null);
  const isModalOpen = detailModal !== null;
  useEffect(() => {
    if (!isModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      // Esc belongs to whatever is on top: an inner dialog or menu handles it first.
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (document.querySelector("dialog[open]")) return;
      setDetailModal(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isModalOpen]);

  // The pop-up takes focus when it opens and hands it back to the control that opened it.
  const modalRef = useRef<HTMLDivElement | null>(null);
  const modalTitleId = useId();
  useEffect(() => {
    if (!isModalOpen) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modalRef.current?.focus();
    return () => {
      if (opener?.isConnected) opener.focus();
    };
  }, [isModalOpen]);
  /** Tab stays inside the pop-up: past the last control it wraps to the first, and back. */
  const trapTab = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !modalRef.current) return;
    const items = Array.from(
      modalRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'),
    ).filter((el) => el.offsetParent !== null);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === modalRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  // Selected machine comes only from PostgreSQL (data context); no static fallback.
  const selectedMachine = selectedMachineId && contextMachine?.id === selectedMachineId ? contextMachine : null;
  const machineId = selectedMachine?.id ?? null;

  // Row 1: the same machine pills as the Operator view, for the plant in the top bar.
  const plant = roots.find((p) => p.id === selectedPlantId) ?? roots[0];
  const engine = usePlantEngineOf(plant?.id);
  const units = useMemo(
    () =>
      (plant ? subtreeMachines(plant) : []).flatMap((n) => {
        const m = n.machineId ? lookup.get(n.machineId)?.machine : undefined;
        return m ? [m] : [];
      }),
    [plant, lookup],
  );
  const tabs = useMemo(() => machineTabs(plantKindOf(engine, units), units), [units, engine]);
  // The short names the machine pills use ("Feed", "Rotary kiln"), for the Full line tables.
  const shortNames = useMemo(() => Object.fromEntries(tabs.flatMap((t) => (t.machineId ? [[t.machineId, t.label]] : []))) as Record<string, string>, [tabs]);
  const activeTab = machineId ? tabs.find((t) => t.machineId === machineId) : tabs[0];
  const plantStatus = usePlantStatus(plant, lookup);

  // A popup page asked for from elsewhere (deep link, another workspace) opens over its tab.
  useEffect(() => {
    if (isModalPage(activeSubPage)) setDetailModal(activeSubPage);
  }, [activeSubPage, machineId]);

  // Arriving on a machine without a page (Assets toggle, deep link) shows Diagnosis. Once a
  // page is showing, a page component asking for the Overview opens the Operator view.
  const shownFor = useRef<string | null>(null);
  useEffect(() => {
    if (!machineId) {
      shownFor.current = null;
      return;
    }
    if (activeSubPage !== "overview") shownFor.current = machineId;
    else if (shownFor.current === machineId) navigateToMachine(machineId, "overview");
    else setActiveSubPage("diagnosis");
  }, [activeSubPage, machineId, navigateToMachine, setActiveSubPage]);

  const activeLayer = layerOf(activeSubPage);
  // A plant showing one machine has no full line or plant page: Assets opens that machine.
  const onlyUnit = units.length === 1 ? units[0].id : null;
  useEffect(() => {
    if (!machineId && !selectedMachineId && onlyUnit) navigateToMachine(onlyUnit, activeSubPage === "overview" ? "diagnosis" : activeLayer);
  }, [machineId, selectedMachineId, onlyUnit, activeLayer, activeSubPage, navigateToMachine]);
  // Practice faults (simulation) belong to the Oswar super administrator alone.
  const canSimulate = Boolean(currentUser?.role.allPlants);
  // Full line pages: Diagnosis, Prognosis and Analysis of the whole line (no machine picked).
  const linePage = !machineId && activeSubPage !== "overview" && activeLayer !== "sensors" ? activeLayer : null;

  const selectAssetLayer = (layer: AssetLayerId) => {
    setDetailModal(null);
    setActiveSubPage(layer);
  };
  /** The machine's Overview is the Operator view. */
  const openOverview = () => {
    if (machineId) navigateToMachine(machineId, "overview");
  };
  const selectPage = (page: MachinePageId) => (page === "overview" ? openOverview() : selectAssetLayer(page));

  const changeView = (view: MapView) => {
    if (view === "assets") return;
    if (view === "twin") {
      setActiveTab("home");
      showHomeView("twin");
    } else if (machineId) navigateToMachine(machineId, "overview");
    else {
      setActiveTab("home");
      showHomeView("operator");
    }
  };

  const handleNavigateToTrends = () => setDetailModal("trends");
  const handleNavigateToDiagnosis = () => selectAssetLayer("diagnosis");
  const handleNavigateToSensors = () => selectAssetLayer("sensors");

  // Only a live machine (kiln fleet or pyro line) follows the 1 s tick; other machines get null.
  const kilnSimulation = useKilnSimulationFor(machineId) ?? undefined;

  const hasShell = Boolean(machineId && defsFor(machineId)?.hasShell);

  return (
    <div className="ph-root ph-operator-canvas ast-root" aria-label="Assets">
      <div className="opc-shell">
        <MachineTopbar
          tabs={tabs}
          activeKey={activeTab?.key ?? null}
          onSelect={(t) => {
            if (t.machineId) return navigateToMachine(t.machineId, activeLayer);
            // Full line keeps the page you are on when the line has one.
            if (activeSubPage !== "overview" && activeLayer !== "sensors") navigateToLine(activeLayer);
            else navigateToAssetsHome();
          }}
          view="assets"
          onChangeView={changeView}
        />

        <div className="opc-workspace">
          <div className="opc-main-col ast-modal-host">
            {!selectedMachine ? (
              // Full line: the plant's status and pages, then the asset directory.
              <>
                {/* Bars 2 and 3 as on Home's Full line: the machines, then the plant's status with the page tabs at the right. */}
                <DirectoryMachineBar tabs={tabs} status={plantStatus} lookup={lookup} onOpen={(id) => navigateToMachine(id, linePage ?? "diagnosis")} />
                <PlantStatusBar
                  label="Full line"
                  status={plantStatus}
                  active={linePage ?? "overview"}
                  onSelect={(p) => {
                    if (p === "overview") navigateToAssetsHome();
                    else if (p === "sensors") {
                      // Sensors stay a machine page: the machine needing attention most.
                      if (plantStatus.focusMachineId) navigateToMachine(plantStatus.focusMachineId, p);
                    } else navigateToLine(p);
                  }}
                />
                {linePage ? (
                  <section className="assets-machine-workspace" data-subpage={linePage} aria-label={`Full line ${linePage}`}>
                    <div className="ast-page-head" ref={setHeaderSlot} />
                    <PageHeaderSlot.Provider value={headerSlot}>
                      <section className="subpage-content" aria-label={`Full line ${linePage}`}>
                        {linePage === "diagnosis" ? (
                          <LineDiagnosis units={units} names={shortNames} health={plantStatus.score} />
                        ) : linePage === "prognosis" ? (
                          <LinePrognosis units={units} names={shortNames} />
                        ) : (
                          <LineAnalysis units={units} names={shortNames} />
                        )}
                      </section>
                    </PageHeaderSlot.Provider>
                  </section>
                ) : (
                  <AssetHierarchyPage />
                )}
              </>
            ) : (
              <>
                <AssetsMachineBar
                  machine={selectedMachine}
                  label={activeTab?.label ?? selectedMachine.name}
                  page={activeLayer}
                  onPage={selectPage}
                  onPopup={setDetailModal}
                />
                <section className="assets-machine-workspace" data-subpage={activeLayer} aria-label={selectedMachine.name}>
                  {/* The page's header row (title = the tab's name) is the first thing below the bar. */}
                  <div className="ast-page-head" ref={setHeaderSlot} />
                  <PageHeaderSlot.Provider value={headerSlot}>
                    {activeLayer === "diagnosis" && (
                      <section className="subpage-content" aria-label="Diagnosis">
                        <DiagnosisView
                          key={selectedMachine.id}
                          machine={selectedMachine}
                          onNavigateToTrends={handleNavigateToTrends}
                          onNavigateToAnalysis={() => selectAssetLayer("analysis")}
                          onNavigateToPrognosis={() => selectAssetLayer("prognosis")}
                        />
                      </section>
                    )}

                    {activeLayer === "prognosis" && (
                      <section className="subpage-content" aria-label="Prognosis">
                        <MachinePrognosisPage
                          key={`prog-${selectedMachine.id}`}
                          machine={selectedMachine}
                          onNavigateToDiagnosis={handleNavigateToDiagnosis}
                          onNavigateToAnalysis={() => selectAssetLayer("analysis")}
                          onNavigateToSensors={handleNavigateToSensors}
                          onNavigateToTrends={handleNavigateToTrends}
                          onNavigateToOverview={openOverview}
                        />
                      </section>
                    )}

                    {activeLayer === "analysis" && (
                      <section className="subpage-content" aria-label="Analysis">
                        <MachineAnalysisPage
                          key={selectedMachine.id}
                          machine={selectedMachine}
                          onNavigateToDiagnosis={handleNavigateToDiagnosis}
                          onNavigateToPrognosis={() => selectAssetLayer("prognosis")}
                          onNavigateToSensors={handleNavigateToSensors}
                          onNavigateToTrends={handleNavigateToTrends}
                          onNavigateToOverview={openOverview}
                        />
                      </section>
                    )}

                    {activeLayer === "sensors" && (
                      <section className="subpage-content" aria-label="Sensors">
                        <MachineSensorMappingView
                          machine={selectedMachine}
                          simulation={kilnSimulation}
                          onNavigateToHealth={handleNavigateToDiagnosis}
                          onNavigateToDiagnosis={handleNavigateToDiagnosis}
                          onNavigateToTrends={handleNavigateToTrends}
                          onNavigateToRack={() => setDetailModal("rack")}
                        />
                      </section>
                    )}
                  </PageHeaderSlot.Provider>

                  {/* ==============================================================
                CONTEXTUAL DETAIL POPUP MODAL
                ============================================================== */}
                  {detailModal && (
                    <div
                      className="opc-trend-modal-backdrop"
                      onClick={(e) => {
                        if (e.target === e.currentTarget) setDetailModal(null);
                      }}
                    >
                      <div
                        className="opc-detail-modal"
                        ref={modalRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={modalTitleId}
                        tabIndex={-1}
                        onKeyDown={trapTab}
                      >
                        <div className="opc-detail-modal-head">
                          <div className="opc-detail-modal-title-wrap">
                            <strong className="opc-detail-modal-title" id={modalTitleId}>
                              {detailModal === "diagnosis" && "Diagnosis: what is wrong now"}
                              {detailModal === "prognosis" && "Prognosis: what will happen next"}
                              {detailModal === "analysis" && "Analysis: why it is happening"}
                              {detailModal === "thermal" && "Kiln shell temperature map"}
                              {detailModal === "trends" && "Sensor readings over time"}
                              {detailModal === "rack" && "Rack: input cards and channels"}
                              {detailModal === "simulation" && "Practice faults"}
                            </strong>
                            <span className="opc-detail-modal-scope">{selectedMachine.name}</span>
                          </div>
                          <div className="opc-detail-modal-actions">
                            {(detailModal === "diagnosis" || detailModal === "prognosis" || detailModal === "analysis") && (
                              <PillButton
                                variant="secondary"
                                onClick={() => {
                                  const target = detailModal;
                                  setDetailModal(null);
                                  selectAssetLayer(target);
                                }}
                              >
                                Open the full page <span aria-hidden="true">→</span>
                              </PillButton>
                            )}
                            <PillButton variant="secondary" onClick={() => setDetailModal(null)}>
                              Close <span aria-hidden="true">×</span>
                            </PillButton>
                          </div>
                        </div>
                        <div className="opc-detail-modal-body assets-machine-workspace">
                          {detailModal === "diagnosis" && (
                            <DiagnosisView
                              key={selectedMachine.id}
                              machine={selectedMachine}
                              onNavigateToTrends={() => setDetailModal("trends")}
                              onNavigateToAnalysis={() => {
                                setDetailModal(null);
                                selectAssetLayer("analysis");
                              }}
                              onNavigateToPrognosis={() => {
                                setDetailModal(null);
                                selectAssetLayer("prognosis");
                              }}
                            />
                          )}
                          {detailModal === "prognosis" && (
                            <MachinePrognosisPage
                              key={`prog-modal-${selectedMachine.id}`}
                              machine={selectedMachine}
                              onNavigateToDiagnosis={() => {
                                setDetailModal(null);
                                selectAssetLayer("diagnosis");
                              }}
                              onNavigateToAnalysis={() => {
                                setDetailModal(null);
                                selectAssetLayer("analysis");
                              }}
                              onNavigateToSensors={() => {
                                setDetailModal(null);
                                handleNavigateToSensors();
                              }}
                            />
                          )}
                          {detailModal === "analysis" && (
                            <MachineAnalysisPage
                              key={selectedMachine.id}
                              machine={selectedMachine}
                              onNavigateToDiagnosis={() => {
                                setDetailModal(null);
                                handleNavigateToDiagnosis();
                              }}
                              onNavigateToPrognosis={() => {
                                setDetailModal(null);
                                selectAssetLayer("prognosis");
                              }}
                              onNavigateToSensors={() => {
                                setDetailModal(null);
                                handleNavigateToSensors();
                              }}
                            />
                          )}
                          {detailModal === "thermal" && hasShell && <ThermalView machine={selectedMachine} />}
                          {detailModal === "trends" && (
                            <TrendsView
                              key={selectedMachine.id}
                              machine={selectedMachine}
                              simulation={kilnSimulation}
                              onNavigateToSensors={() => {
                                setDetailModal(null);
                                handleNavigateToSensors();
                              }}
                              onNavigateToDiagnosis={() => {
                                setDetailModal(null);
                                handleNavigateToDiagnosis();
                              }}
                            />
                          )}
                          {detailModal === "rack" && <MachineRackTab key={selectedMachine.id} machine={selectedMachine} simulation={kilnSimulation} />}
                          {detailModal === "simulation" && canSimulate && <SimulationView simulation={kilnSimulation ?? null} />}
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
