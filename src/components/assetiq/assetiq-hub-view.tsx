"use client";

import React, { useState } from "react";
import { PillNav } from "@/components/ui";
import { StatusTag } from "@/components/assets/assets-shell-ui";
import {
  useKilnLiveStatus,
  usePrimaryMachineId,
} from "@/providers/kiln-simulation-context";
import { isPyroMachineId } from "@/lib/live-defs";
import { EngineTab } from "./ai-engine-view";
import { AccuracyTab, consumeAssetIqTab } from "./model-accuracy-view";
import { FindingsTab } from "./assetiq-findings-view";
import "@/components/assets/assets-shell.css";
import "@/components/ui/page.css";
import "./assetiq-ai.css";

/* ==========================================================================
   AssetIQ hub — what is the AI engine concluding across the active plant's
   fleet, and can it be trusted? Each plant is a separate workspace. Three self-contained sub-modules, each with its own KPIs:
     Engine    — model status, inference cadence, inputs
     Accuracy  — prediction vs outcome ledger, calibration, model fit
     Findings  — fleet-wide findings, each row opens that machine's Diagnosis
   ========================================================================== */

type HubTab = "engine" | "accuracy" | "findings";

const TABS: Array<{ id: HubTab; label: string }> = [
  { id: "engine", label: "Engine" },
  { id: "accuracy", label: "Accuracy" },
  { id: "findings", label: "Findings" },
];

export function AssetIqHubView() {
  const [tab, setTab] = useState<HubTab>(() => consumeAssetIqTab() ?? "engine");
  const status = useKilnLiveStatus();
  const primaryId = usePrimaryMachineId();
  const live = Boolean(status?.byMachine[primaryId]);
  // Live machines of the active plant only (the status covers every plant).
  const liveCount = status ? Object.keys(status.byMachine).filter((id) => isPyroMachineId(id) === isPyroMachineId(primaryId)).length : 0;
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <div className="pg-root ast-root" aria-label="AssetIQ">
      <header className="ast-head pg-head">
        <div className="ast-head-main">
          <ol className="ast-crumbs" aria-label="Location">
            <li>AssetIQ</li>
            <li>Fleet</li>
            <li>{active.label}</li>
          </ol>
          <div className="ast-title-row">
            <h1 className="ast-title">AssetIQ</h1>
            <StatusTag
              tone={live ? "good" : "idle"}
              label={
                live
                  ? `Engine live · ${liveCount} machine${liveCount === 1 ? "" : "s"}`
                  : "Engine offline"
              }
            />
          </div>
        </div>
      </header>

      {/* Tabs sit left, below the page title, as on every other workspace. */}
      <PillNav
        items={TABS.map((t) => ({ id: t.id, label: t.label }))}
        activeId={tab}
        onChange={(id) => setTab(id as HubTab)}
      />

      {tab === "engine" && <EngineTab />}
      {tab === "accuracy" && <AccuracyTab />}
      {tab === "findings" && <FindingsTab />}
    </div>
  );
}
