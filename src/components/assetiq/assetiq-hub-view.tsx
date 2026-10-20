"use client";

import React, { useCallback, useMemo } from "react";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { AskTab } from "./assetiq-ask-view";
import "@/components/assets/assets-shell.css";
import "@/components/ui/page.css";
import "@/components/home/plant-home.css";
import "@/components/home/operator/operator-console.css";
import "./assetiq-ask.css";

/* ==========================================================================
   AssetIQ — the conversation with the engine about the active plant (the
   rail's sparkle opens it). Each plant is a separate workspace.
   ========================================================================== */

export function AssetIqHubView() {
  const { setActiveTab, navigateToMachine, machines, selectedPlantId } = useIndustrialData();

  // The active plant's machines, as the database lists them.
  const equipmentTabs = useMemo(
    () => [
      { id: "full-line", label: "Full line" },
      ...machines.filter((m) => m.plantId === selectedPlantId).map((m) => ({ id: m.id, label: m.name || m.id })),
    ],
    [machines, selectedPlantId],
  );

  const switchToHomeView = useCallback(
    (v: "operator" | "twin" | "layout" | "assets") => {
      // Assets is its own workspace.
      if (v === "assets") {
        setActiveTab("assets");
        return;
      }
      try {
        localStorage.setItem("ultron.home.viewMode", v);
      } catch {
        /* ignore */
      }
      window.dispatchEvent(new CustomEvent("ultron:set-home-view", { detail: v }));
      setActiveTab("home");
    },
    [setActiveTab],
  );

  return (
    <div className="ph-root ph-operator-canvas ast-root aiq-hub" aria-label="AssetIQ">
      <div className="opc-shell">
        {/* ROW 1: Equipment Units (left) + View Switcher (right) */}
        <header className="opc-topbar">
          <div className="opc-stage-tabs" role="tablist" aria-label="Machines">
            <div className="opc-pill-group">
              {equipmentTabs.map((item) => {
                const isActive = item.id === "full-line";
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    data-active={isActive || undefined}
                    className={`opc-pill-btn ${isActive ? "is-active" : ""}`}
                    onClick={() => {
                      if (item.id !== "full-line") {
                        navigateToMachine(item.id, "diagnosis");
                      }
                    }}
                  >
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="opc-topbar-right">
            <div className="opc-pill-group" role="tablist" aria-label="How to show the plant">
              {(["operator", "twin", "assets"] as const).map((v) => {
                const label = v === "operator" ? "Operator view" : v === "twin" ? "3D twin" : "Assets";
                return (
                  <button
                    key={v}
                    type="button"
                    role="tab"
                    aria-selected={false}
                    className="opc-pill-btn"
                    onClick={() => switchToHomeView(v)}
                  >
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        <div className="opc-workspace">
          <div className="opc-main-col">
            <div className="opc-module-stage aqk-stage">
              <AskTab />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
