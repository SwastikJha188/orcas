"use client";

import React, { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { LiquidGlassShell } from "@/components/liquid-glass-shell";
import { PlantHome } from "@/components/home/plant-home";
import {
  IndustrialDataProvider,
  useIndustrialData,
} from "@/providers/industrial-data-context";
import { KilnSimulationProvider } from "@/providers/kiln-simulation-context";
import { KilnOpsProvider } from "@/providers/kiln-ops-context";
import { AiEngineProvider } from "@/providers/ai-engine-context";
import { EdgeProvider } from "@/providers/edge-context";
import { SignInScreen } from "@/components/auth/sign-in";
import { homeActive } from "@/components/home/home-active";

// Home is the landing tab; the other workspaces load on first visit.
const AssetsView = dynamic(() => import("@/components/assets/assets-view").then((m) => m.AssetsView));
const IndustrialDevicesView = dynamic(() => import("@/components/devices/devices-view").then((m) => m.IndustrialDevicesView));
const AssetIqHubView = dynamic(() => import("@/components/assetiq/assetiq-hub-view").then((m) => m.AssetIqHubView));
const ConfigureView = dynamic(() => import("@/components/configure/configure-view").then((m) => m.ConfigureView));

function UltronWorkspaceContent() {
  const { activeTab, setActiveTab, setSelectedMachineId, navigateToMachine } = useIndustrialData();

  // Home stays mounted once opened: rebuilding its 3D scene froze the page for
  // up to a second on every return. It is hidden (and its loop idles) meanwhile.
  const [homeVisited, setHomeVisited] = useState(activeTab === "home");
  if (activeTab === "home" && !homeVisited) setHomeVisited(true);
  homeActive.current = activeTab === "home";

  // Copilot "Open Diagnosis": go straight to the machine's Diagnosis tab, on the rule when given.
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
    setActiveTab(tab as Parameters<typeof setActiveTab>[0]);
    if (tab === "assets") {
      setSelectedMachineId(null);
    }
  };

  return (
    <main className="app-shell liquid-glass-backdrop">
      <LiquidGlassShell activeTab={activeTab} onSelectTab={handleSelectTab} />

      <section
        className="workspace"
        id="workspace-content"
        aria-label="Workspace Content"
        style={{ height: "100%", overflow: "hidden" }}
      >
        {/* A tab's code loading suspends here, inside the providers: without this
            boundary React discarded the whole first render and rebuilt the plant. */}
        <Suspense fallback={null}>
          {homeVisited && (
            <div className="workspace-keepalive" hidden={activeTab !== "home"}>
              <PlantHome />
            </div>
          )}
          {activeTab === "assets" && <AssetsView />}
          {activeTab === "devices" && <IndustrialDevicesView />}
          {activeTab === "assetiq" && <AssetIqHubView />}
          {activeTab === "configure" && <ConfigureView />}
        </Suspense>
      </section>
    </main>
  );
}

/** Signed-out visitors see the sign-in screen; the workspace mounts only for a signed-in account. */
function AuthGate() {
  const { authStatus } = useIndustrialData();
  if (authStatus === "checking") return <main className="app-shell liquid-glass-backdrop" aria-busy="true" />;
  if (authStatus === "signedOut") return <SignInScreen />;
  return (
    <KilnSimulationProvider>
      <KilnOpsProvider>
        <AiEngineProvider>
          <EdgeProvider>
            <UltronWorkspaceContent />
          </EdgeProvider>
        </AiEngineProvider>
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
