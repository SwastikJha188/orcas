"use client";

import React, { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { LiquidGlassShell } from "@/components/liquid-glass-shell";
import { PlantHome, MAP_VIEW_KEY } from "@/components/home/plant-home";
import {
  IndustrialDataProvider,
  useIndustrialData,
} from "@/providers/industrial-data-context";
import { KilnSimulationProvider } from "@/providers/kiln-simulation-context";
import { KilnOpsProvider } from "@/providers/kiln-ops-context";
import { EdgeProvider } from "@/providers/edge-context";
import { CopilotProvider } from "@/components/copilot/copilot-provider";
import { AuthChecking, SignInScreen } from "@/components/auth/sign-in";
import { homeActive } from "@/components/home/home-active";

// Home (the operator overview) is the landing tab; the other workspaces load on first visit.
// While a tab's code loads it shows one quiet line instead of an empty workspace.
function TabLoading() {
  return <div className="ast-empty" role="status">Loading…</div>;
}
const AssetsView = dynamic(() => import("@/components/assets/assets-view").then((m) => m.AssetsView), { loading: TabLoading });
const IndustrialDevicesView = dynamic(() => import("@/components/devices/devices-view").then((m) => m.IndustrialDevicesView), { loading: TabLoading });
const MaintenanceWorkspace = dynamic(() => import("@/components/maintenance/maintenance-workspace").then((m) => m.MaintenanceWorkspace), { loading: TabLoading });
const AssetIqHubView = dynamic(() => import("@/components/assetiq/assetiq-hub-view").then((m) => m.AssetIqHubView), { loading: TabLoading });
const ConfigureView = dynamic(() => import("@/components/configure/configure-view").then((m) => m.ConfigureView), { loading: TabLoading });
const SimulationView = dynamic(() => import("@/components/simulation/simulation-view").then((m) => m.SimulationView), { loading: TabLoading });

function UltronWorkspaceContent() {
  const { activeTab, setActiveTab, setSelectedMachineId, setActiveSubPage, navigateToMachine, navigateToAssetsHome, currentUser } = useIndustrialData();
  // Simulation belongs to the Oswar super administrator alone (an old link opens nothing for anyone else).
  const canSimulate = Boolean(currentUser?.role.allPlants);
  useEffect(() => {
    if (activeTab === "simulation" && currentUser && !canSimulate) setActiveTab("home");
  }, [activeTab, currentUser, canSimulate, setActiveTab]);
  const isHome = activeTab === "home";

  // Home stays mounted once opened: rebuilding its 3D scene froze the page for
  // up to a second on every return. It is hidden (and its loop idles) meanwhile.
  const [homeVisited, setHomeVisited] = useState(isHome);
  if (isHome && !homeVisited) setHomeVisited(true);
  homeActive.current = isHome;

  // AssetIQ "Open Diagnosis": go straight to the machine's Diagnosis tab, on the rule when given.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const { machineId, ruleId } = (e as CustomEvent<{ machineId?: string; ruleId?: string }>).detail ?? {};
      if (!machineId) return;
      if (ruleId) {
        try {
          sessionStorage.setItem("ultron.diagnosis.rule", ruleId);
        } catch {
          /* storage unavailable: Diagnosis opens unfocused */
        }
      }
      navigateToMachine(machineId, "diagnosis");
    };
    window.addEventListener("ultron:open-diagnosis", onOpen);
    return () => window.removeEventListener("ultron:open-diagnosis", onOpen);
  }, [navigateToMachine]);

  const handleSelectTab = (tab: string) => {
    // The rail's Assets opens the asset directory.
    if (tab === "assets") navigateToAssetsHome();
    else setActiveTab(tab as Parameters<typeof setActiveTab>[0]);
  };

  // The logo always lands on Home's Operator view at the Full line, whatever was open.
  const goToFullLine = () => {
    setSelectedMachineId(null);
    setActiveSubPage("overview");
    setActiveTab("home");
    try {
      localStorage.setItem(MAP_VIEW_KEY, "operator");
    } catch {
      /* storage unavailable */
    }
    window.dispatchEvent(new Event("ultron:open-full-line"));
  };

  return (
    <div className="app-shell liquid-glass-backdrop">
      <a className="skip-link" href="#workspace-content">
        Skip to workspace
      </a>
      <LiquidGlassShell activeTab={activeTab} onSelectTab={handleSelectTab} onBrand={goToFullLine} />

      <main
        className="workspace"
        id="workspace-content"
        aria-label="Workspace"
        tabIndex={-1}
        style={{ height: "100%", overflow: "hidden" }}
      >
        {/* A tab's code loading suspends here, inside the providers: without this
            boundary React discarded the whole first render and rebuilt the plant. */}
        <Suspense fallback={null}>
          {homeVisited && (
            <div className="workspace-keepalive" hidden={!isHome}>
              <PlantHome />
            </div>
          )}
          {activeTab === "assets" && <AssetsView />}
          {activeTab === "maintenance" && <MaintenanceWorkspace />}
          {activeTab === "devices" && <IndustrialDevicesView />}
          {activeTab === "assetiq" && <AssetIqHubView />}
          {activeTab === "configure" && <ConfigureView />}
          {activeTab === "simulation" && canSimulate && <SimulationView />}
        </Suspense>
      </main>
    </div>
  );
}

/** Signed-out visitors see the sign-in screen; the workspace mounts only for a signed-in account. */
function AuthGate() {
  const { authStatus } = useIndustrialData();
  if (authStatus === "checking") return <AuthChecking />;
  if (authStatus === "signedOut") return <SignInScreen />;
  return (
    <KilnSimulationProvider>
      <KilnOpsProvider>
        <EdgeProvider>
          <CopilotProvider>
            <UltronWorkspaceContent />
          </CopilotProvider>
        </EdgeProvider>
      </KilnOpsProvider>
    </KilnSimulationProvider>
  );
}

export default function Home() {
  return (
    <IndustrialDataProvider>
      <AuthGate />
    </IndustrialDataProvider>
  );
}
