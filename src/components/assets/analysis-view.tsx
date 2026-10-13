"use client";

import React, { useState } from "react";
import { PillNav } from "@/components/ui";
import { InsightsState } from "./insights-ui";
import { AnalysisOverview, type AnalysisPage } from "./analysis-overview";
import {
  DegradationModule,
  FaultModule,
  MaintenanceModule,
  SourceModule,
  XaiModule,
} from "./analysis-modules";
import type { PrognosisPage } from "./prognosis-overview";
import { ForecastModule } from "./prognosis/forecast-module";
import { RulModule } from "./prognosis/rul-module";
import { RelationshipsModule } from "./prognosis/relationships-module";
import {
  AnomalyModule,
  ConditionModule,
  RiskModule,
} from "./prognosis-modules";
import type { InsightsResponse } from "@/server/services/insights-service";

/** Every Analysis sub-page, including the forward-looking modules moved from Prognosis. */
export type AnalysisTabPage = AnalysisPage | Exclude<PrognosisPage, "overview">;
export type { AnalysisPage };

const SUB_TABS = [
  { id: "overview", label: "Overview" },
  { id: "source", label: "Issue source" },
  { id: "fault", label: "Fault diagnosis" },
  { id: "degradation", label: "Degradation" },
  { id: "maintenance", label: "Maintenance" },
  { id: "xai", label: "Explainable AI" },
  { id: "forecast", label: "Sensor behaviour" },
  { id: "relationships", label: "Relationships" },
  { id: "condition", label: "Future condition" },
  { id: "risk", label: "Failure risk" },
  { id: "rul", label: "Remaining life" },
  { id: "anomalies", label: "Anomalies" },
];

export interface AnalysisViewProps {
  insights: InsightsResponse | null;
  isLoading: boolean;
  isError: boolean;
  error?: string | null;
  /** Controlled sub-page; falls back to internal state when omitted. */
  page?: AnalysisTabPage;
  onPageChange?: (page: AnalysisTabPage) => void;
}

export function AnalysisView({ insights, isLoading, isError, error, page: externalPage, onPageChange }: AnalysisViewProps) {
  const [internalPage, setInternalPage] = useState<AnalysisTabPage>("overview");
  const page = externalPage ?? internalPage;
  const setPage = (next: AnalysisTabPage) => {
    setInternalPage(next);
    onPageChange?.(next);
  };

  return (
    <div className="ins-page ins-page--hub">
      <div className="dx-diagnosis-nav">
        <PillNav items={SUB_TABS} activeId={page} onChange={(id) => setPage(id as AnalysisTabPage)} />
      </div>

      <InsightsState isLoading={isLoading} isError={isError} error={error} />

      {insights && !isLoading && !isError && (
        <>
          {page === "overview" && (
            <AnalysisOverview data={insights.analysis} onOpen={setPage} />
          )}
          {page === "source" && <SourceModule data={insights.analysis} />}
          {page === "fault" && <FaultModule data={insights.analysis} />}
          {page === "degradation" && <DegradationModule data={insights.analysis} />}
          {page === "maintenance" && <MaintenanceModule data={insights.analysis} />}
          {page === "xai" && <XaiModule data={insights.analysis} />}
          {page === "forecast" && <ForecastModule data={insights.prognosis} />}
          {page === "relationships" && <RelationshipsModule data={insights.prognosis} />}
          {page === "condition" && <ConditionModule data={insights.prognosis} />}
          {page === "risk" && <RiskModule data={insights.prognosis} />}
          {page === "rul" && <RulModule data={insights.prognosis} />}
          {page === "anomalies" && <AnomalyModule data={insights.prognosis} />}
        </>
      )}
    </div>
  );
}
