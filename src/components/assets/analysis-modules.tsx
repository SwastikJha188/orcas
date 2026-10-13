"use client";

import type { InsightsResponse } from "@/server/services/insights-service";

export type AnalysisData = InsightsResponse["analysis"];

export interface ModuleProps {
  data: AnalysisData;
  onBack?: () => void;
}

/* ================================================================== */
/* 1 · Issue-Source Identification (PDF 3, p5-6)                      */
/* Full-page Root-Cause Analysis Studio                               */
/* ================================================================== */

export { SourceModule } from "./analysis/source-module";

/* ================================================================== */
/* 2 · Fault Diagnosis (PDF 3, p5-6)                                  */
/* Full-page ML fault classification center                           */
/* ================================================================== */

export { FaultModule } from "./analysis/fault-module";


/* ================================================================== */
/* 3 · Degradation Assessment (PDF 2, p1-2)                           */
/* Main Question: "Is my machine or component gradually               */
/* deteriorating, and what evidence supports that assessment?"        */
/* Full-page wear staging dashboard modularized in analysis/          */
/* ================================================================== */

export { DegradationModule } from "./analysis/degradation-module";

/* ================================================================== */
/* 4 · Predictive Maintenance Recommendations (PDF 2, p6-7)          */
/* Full-page prescriptive maintenance command center                  */
/* ================================================================== */

export { MaintenanceModule } from "./analysis/maintenance-module";


/* ================================================================== */
/* 5 · Explainable AI & Decision Transparency (PDF 1, p1)             */
/* Main Question: "Why did ULTRON's AI model produce this particular  */
/* result?"                                                           */
/* ================================================================== */

export { XaiModule } from "./analysis/xai-module";

