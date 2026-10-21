"use client";

import React, { useCallback, useRef } from "react";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { useCopilot } from "@/components/copilot/copilot-provider";
import { usePlantMachineTabs } from "@/components/home/operator/machine-nav";
import { AskTab } from "./assetiq-ask-view";
import "@/components/assets/assets-shell.css";
import "@/components/ui/page.css";
import "@/components/home/plant-home.css";
import "@/components/home/operator/operator-console.css";
import "./assetiq-ask.css";

/* ==========================================================================
   AssetIQ — the conversation with the engine about the active plant. Each
   plant is a separate workspace. The machine pills of Row 1 are the one
   scope control: the answers speak for the picked machine, or the whole
   plant on Full line.
   ========================================================================== */

export function AssetIqHubView() {
  const { setActiveTab } = useIndustrialData();
  const cp = useCopilot();
  // The plant's machines named as every other workspace's Row 1 names them.
  const tabs = usePlantMachineTabs();
  // A machine can be asked about once its live data has arrived.
  const askable = new Set((cp?.scopes ?? []).map((s) => s.id));
  const current = cp?.scope ?? null;
  const pillsRef = useRef<HTMLDivElement>(null);
  const pickable = tabs.filter((t) => t.machineId === null || askable.has(t.machineId));

  // Tabs pattern: one tab stop for the row; arrows / Home / End move and select.
  const onPillKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!cp || !pickable.length) return;
    const at = Math.max(0, pickable.findIndex((t) => t.machineId === current));
    const moves: Record<string, number> = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: pickable.length - 1 };
    if (!(e.key in moves)) return;
    e.preventDefault();
    const next = pickable[(moves[e.key] + pickable.length) % pickable.length];
    cp.setScope(next.machineId);
    pillsRef.current?.querySelector<HTMLButtonElement>(`[data-key="${CSS.escape(next.key)}"]`)?.focus();
  };

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
          {/* What the answers are about: picking a machine scopes the conversation, it stays on AssetIQ. */}
          <div className="opc-stage-tabs">
            <div ref={pillsRef} className="opc-pill-group" role="tablist" aria-label="Ask about" onKeyDown={onPillKey}>
              {tabs.map((t) => {
                const isActive = t.machineId === current;
                const live = t.machineId === null || askable.has(t.machineId);
                return (
                  <button
                    key={t.key}
                    data-key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    tabIndex={isActive ? 0 : -1}
                    disabled={!cp || !live}
                    title={live ? undefined : "No live data from this machine yet"}
                    data-active={isActive || undefined}
                    className={`opc-pill-btn ${isActive ? "is-active" : ""}`}
                    onClick={() => cp?.setScope(t.machineId)}
                  >
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="opc-topbar-right">
            {/* Each view opens Home or Assets, so these are plain buttons, not tabs. */}
            <div className="opc-pill-group" role="group" aria-label="How to show the plant">
              {(["operator", "twin", "assets"] as const).map((v) => {
                const label = v === "operator" ? "Operator view" : v === "twin" ? "3D twin" : "Assets";
                return (
                  <button
                    key={v}
                    type="button"
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
