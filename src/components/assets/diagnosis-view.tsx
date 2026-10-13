"use client";

import React, { useState } from "react";
import { PillNav } from "@/components/ui";
import { AssetMachine } from "./assets-data";
import { ProcessStagesView } from "./process-stages-view";
import { ComponentHealthView } from "./component-health-view";
import { DiagnosticsOverviewTab } from "./diagnostics-overview-tab";
import "./diagnosis.css";
import "./diagnosis/overview-tab.css";

export type HealthPage = "components" | "process";

const healthTabs = [
  { id: "components", label: "Components" },
  { id: "process", label: "Process" },
];

export interface DiagnosisViewProps {
  machine: AssetMachine;
  onNavigateToSensors?: () => void;
  onNavigateToTrends?: (metricKey?: string) => void;
  onNavigateToHealth?: () => void;
}

/** Diagnosis tab — current condition: KPIs, fault modes, sensor register. */
export function DiagnosisView({
  machine,
  onNavigateToSensors,
  onNavigateToTrends,
  onNavigateToHealth,
}: DiagnosisViewProps) {
  return (
    <div className="dx-page">
      <DiagnosticsOverviewTab
        machine={machine}
        onNavigateToSensors={onNavigateToSensors}
        onNavigateToTrends={onNavigateToTrends}
        onNavigateToComponentHealth={onNavigateToHealth}
      />
    </div>
  );
}

export interface MachineHealthViewProps {
  machine: AssetMachine;
  onNavigateToSensors?: () => void;
}

/** Health tab — sub-assembly (component) health and process-stage health. */
export function MachineHealthView({ machine, onNavigateToSensors }: MachineHealthViewProps) {
  const [page, setPage] = useState<HealthPage>("components");

  return (
    <div className="dx-page">
      <div className="dxo-root" style={{ gap: 12 }}>
        <div className="dxo-subtabs">
          <PillNav items={healthTabs} activeId={page} onChange={(id) => setPage(id as HealthPage)} />
        </div>

        {page === "components" ? (
          <ComponentHealthView machine={machine} onNavigateToSensors={onNavigateToSensors} />
        ) : (
          <ProcessStagesView machine={machine} />
        )}
      </div>
    </div>
  );
}
