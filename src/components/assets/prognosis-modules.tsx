import type { InsightsResponse } from "@/server/services/insights-service";

export type PrognosisData = InsightsResponse["prognosis"];

export interface ModuleProps {
  data: PrognosisData;
  onBack?: () => void;
}

/* ================================================================== */
/* 1 · Expected Behaviour Prediction (PDF 3, p2-3)                    */
/* Main Question: "How should my machine or process be behaving       */
/* right now, and how is its actual behaviour different?"             */
/* Full-page dashboard component located in ./prognosis/forecast-module */
/* ================================================================== */

export { ForecastModule } from "./prognosis/forecast-module";


/* ================================================================== */
/* 2 · Unknown Anomaly Detection (PDF 3, p3-5)                        */
/* Main Question: "Is my machine showing an unfamiliar pattern of     */
/* behaviour that AI has not learned as normal?"                      */
/* Full-page investigation center located in ./prognosis/anomaly-module */
/* ================================================================== */

export { AnomalyModule } from "./prognosis/anomaly-module";

/* ================================================================== */
/* 3 · Future Condition Prediction (PDF 2, p2-3)                      */
/* Main Question: "How is my machine's condition likely to change     */
/* over the next few hours or days?"                                  */
/* ================================================================== */

export { ConditionModule } from "./prognosis/condition-module";

/* ================================================================== */
/* 4 · Failure Risk Prediction (PDF 2, p3-4)                          */
/* Main Question: "How likely is my machine or component to           */
/* experience a defined failure within a particular period?"          */
/* Re-exported from dedicated full-page module ./prognosis/risk-module*/
/* ================================================================== */
export { RiskModule } from "./prognosis/risk-module";

/* ================================================================== */
/* 5 · Remaining Useful Life (RUL) Estimation (PDF 2, p4-6)           */
/* Re-exported from dedicated full-page module ./prognosis/rul-module */
/* ================================================================== */
export { RulModule } from "./prognosis/rul-module";

/* ================================================================== */
/* 6 · Sensor Relationships (PDF 3)                                   */
/* Multivariate Covariance Matrix & Cross-Coupling Sensitivity        */
/* Re-exported from dedicated full-page module ./prognosis/relationships-module */
/* ================================================================== */
export { RelationshipsModule } from "./prognosis/relationships-module";

