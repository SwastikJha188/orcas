"use client";

import React, { useEffect } from "react";
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

// Home is the landing tab; the other workspaces load on first visit.
const AssetsView = dynamic(() => import("@/components/assets/assets-view").then((m) => m.AssetsView));
const IndustrialDevicesView = dynamic(() => import("@/components/devices/devices-view").then((m) => m.IndustrialDevicesView));
const AssetIqHubView = dynamic(() => import("@/components/assetiq/assetiq-hub-view").then((m) => m.AssetIqHubView));
const ConfigureView = dynamic(() => import("@/components/configure/configure-view").then((m) => m.ConfigureView));

function UltronWorkspaceContent() {
  const { activeTab, setActiveTab, setSelectedMachineId, navigateToMachine } = useIndustrialData();

  // Copilot "Open Diagnosis": go straight to the machine's Diagnosis tab.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const machineId = (e as CustomEvent<{ machineId?: string }>).detail?.machineId;
      if (machineId) navigateToMachine(machineId, "diagnosis");
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
        {activeTab === "home" && <PlantHome />}
        {activeTab === "assets" && <AssetsView />}
        {activeTab === "devices" && <IndustrialDevicesView />}
        {activeTab === "assetiq" && <AssetIqHubView />}
        {activeTab === "configure" && <ConfigureView />}
      </section>
    </main>
  );
}

export default function Home() {
  return (
    <IndustrialDataProvider>
      <KilnSimulationProvider>
        <KilnOpsProvider>
          <AiEngineProvider>
            <UltronWorkspaceContent />
          </AiEngineProvider>
        </KilnOpsProvider>
      </KilnSimulationProvider>
    </IndustrialDataProvider>
  );
}
