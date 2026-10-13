"use client";

import React from "react";
import { AssetMachine } from "./assets-data";
import { PrognosisView, type PrognosisPage } from "./prognosis-view";
import { AnalysisView, type AnalysisTabPage } from "./analysis-view";
import { useMachineInsights } from "./use-machine-insights";
import "./insights.css";

export interface MachineInsightsTabProps {
  machine: AssetMachine;
}

/** Prognosis tab — brief of the forward-looking predictions; details open in Analysis. */
export function MachinePrognosisTab({
  machine,
  onOpenModule,
}: MachineInsightsTabProps & { onOpenModule?: (page: Exclude<PrognosisPage, "overview">) => void }) {
  const insights = useMachineInsights(machine);
  return (
    <div className="insights-page">
      <PrognosisView
        insights={insights.data}
        isLoading={insights.isLoading}
        isError={insights.isError}
        error={insights.error}
        onOpenModule={onOpenModule}
      />
    </div>
  );
}

/** Analysis tab — root cause, fault class, degradation, maintenance, XAI and prognosis modules. */
export function MachineAnalysisTab({
  machine,
  page,
  onPageChange,
}: MachineInsightsTabProps & { page?: AnalysisTabPage; onPageChange?: (page: AnalysisTabPage) => void }) {
  const insights = useMachineInsights(machine);
  return (
    <div className="insights-page">
      <AnalysisView
        insights={insights.data}
        isLoading={insights.isLoading}
        isError={insights.isError}
        error={insights.error}
        page={page}
        onPageChange={onPageChange}
      />
    </div>
  );
}
