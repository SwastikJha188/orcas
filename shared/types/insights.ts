/**
 * Prognosis and analysis contract (/api/insights). Every number is calculated
 * from stored readings, findings and health scores; what the evaluation does
 * not estimate is null rather than invented.
 */

export type Severity = "Normal" | "Alert" | "Critical";

/* ------------------------------------------------------------------ */
/* Normalized input                                                   */
/* ------------------------------------------------------------------ */

export interface InsightController {
  ruleId: string;
  ruleName: string;
  primaryCause: string;
  mechanism: string;
  symptomSignature: string;
  consequence: string;
  prescriptiveAction: string;
  crossCheckSensors?: string[];
}

export interface InsightSensor {
  tag: string;
  name: string;
  unit: string;
  status: Severity;
  numericValue: number;
  warningVal: number;
  alarmVal: number;
  component: string;
  subAssembly: string;
  subassemblyId: string;
  systemId: string;
  reasons: InsightController[];
  /** Measured history (oldest → newest). Empty when no trend points exist. */
  history: number[];
}

export interface InsightSubsystem {
  subassemblyId: string;
  name: string;
  systemId: string;
  health: number;
  status: Severity;
}

/* ------------------------------------------------------------------ */
/* Output contracts                                                   */
/* ------------------------------------------------------------------ */

export interface ForecastHorizon {
  id: string;
  label: string;
  hours: number;
  steps: number;
}


export interface ForecastSeries {
  tag: string;
  name: string;
  unit: string;
  status: Severity;
  history: number[];
  forecast: number[];
  lower: number[];
  upper: number[];
  current: number;
  predicted: number;
  deltaPct: number;
  trend: "rising" | "falling" | "stable";
  warning: number | null;
  alarm: number | null;
  horizonLabel: string;
  /** Fit quality of the trend model (R², %); null without enough readings. */
  confidence: number | null;
}

export interface InfluenceLink {
  tag: string;
  name: string;
  unit: string;
  coefficient: number;
  delta: number;
  direction: "up" | "down";
}

/** A system of the machine as registered in `machine_systems` (or the sim's system list). */
export interface ConditionSystem {
  id: string;
  name: string;
}

/** Projected health at `day`: overall plus one value per system id in `condition.systems`. */
export interface ConditionPoint {
  day: number;
  overall: number;
  systems: Record<string, number>;
}

/** Where a sensor sits in the machine hierarchy (DB catalog or sim signal defs). */
export interface SensorLocation {
  systemId: string;
  system: string;
  subassemblyId: string;
  subassembly: string;
  component: string;
}

/** Pearson r between two sensors over their measured history. */
export interface CorrelationPair {
  a: string;
  b: string;
  r: number;
  /** Number of paired samples the coefficient was computed from. */
  n: number;
  /** r over the earlier part of the window and over its most recent part, when there is enough history. */
  baseline?: number;
  recent?: number;
}

export interface FailureRisk {
  id: string;
  fault: string;
  component: string;
  /** Only a validated probabilistic model sets this; the rule and limit evaluation does not. */
  probability: number | null;
  severity: Severity;
  /** Projected time until the alarm limit at the current trend, or "—". */
  window: string;
  /** Work-order priority the severity calls for (work_order_priorities). */
  priority: string;
}

export interface RulItem {
  id: string;
  name: string;
  component: string;
  health: number | null;
  /** Hours until a measurement of the component reaches its alarm limit at the current trend; null when none is trending toward one. */
  hours: number | null;
  days: number | null;
  /** R² (%) of the trend fit behind `hours`. */
  confidence: number | null;
  status: Severity;
  dueLabel: string;
  /** The measurement whose trend sets `hours`. */
  driver?: string;
  /**
   * Set when no reading is moving toward its limit: `hours` is then the median
   * time left from the part's life (its own record, else the typical life for
   * its kind of part, migration 055) on a Weibull curve.
   */
  life?: RulLife | null;
}

export interface RulLife {
  /** "recorded": the plant's part record; "typical": the typical life for its kind of part. */
  source: "recorded" | "typical";
  /** Kind of part the typical life is for ("motor or drive"). */
  kind: string;
  /** Characteristic life η, plant hours. */
  lifeH: number;
  /** Weibull shape β. */
  shape: number;
  /** Life already used, plant hours (recorded, else estimated from the part's health). */
  ageH: number;
  usedPct: number;
}

export interface AnomalyItem {
  tag: string;
  name: string;
  component: string;
  score: number;
  severity: Severity;
  deviation: string;
  onset: string;
}

/** A sensor reading that supports an issue source, as measured. */
export interface SourceEvidence {
  tag: string;
  label: string;
  /** Measured value / deviation text, e.g. "7.4 mm/s · +12 % vs warning". */
  detail: string;
  severity: Severity;
}

export interface IssueSource {
  id: string;
  cause: string;
  subsystem: string;
  contribution: number;
  /** Not estimated by the rule and limit evaluation. */
  confidence: number | null;
  severity: Severity;
  /** Sensors behind this source; empty when the source has no sensor link (e.g. a diagnosis finding). */
  evidence: SourceEvidence[];
}

export interface FaultClass {
  id: string;
  label: string;
  /** Only a validated classifier sets this. */
  probability: number | null;
  severity: Severity;
  band: string;
}

export interface DegradationItem {
  id: string;
  name: string;
  stageIndex: number;
  stageLabel: string;
  health: number | null;
  trend: "rising" | "stable" | "falling";
}

export interface MaintenanceAction {
  id: string;
  title: string;
  component: string;
  /** Work-order priority name (work_order_priorities). */
  priority: string;
  window: string;
  eta: string;
  confidence: number | null;
  rationale: string;
}

export interface FeatureWeight {
  id: string;
  label: string;
  weight: number;
  tag: string;
}

export interface ReasoningStep {
  id: string;
  label: string;
  detail: string;
  status: Severity;
}



export interface InsightsResponse {
  machineId: string;
  generatedAt: string;
  keySensors: string[];
  prognosis: {
    horizons: ForecastHorizon[];
    forecasts: Record<string, Record<string, ForecastSeries>>;
    /**
     * `tags`/`matrix`: key sensors only, for a readable heat-map.
     * `pairs`: every pair of forecast sensors that both carry measured
     * history (strongest |r| first).
     */
    correlation: { tags: string[]; matrix: number[][]; pairs: CorrelationPair[] };
    influences: Record<string, InfluenceLink[]>;
    condition: { horizons: number[]; systems: ConditionSystem[]; points: ConditionPoint[] };
    /** Hierarchy location for every sensor tag on the machine. */
    locations: Record<string, SensorLocation>;
    risks: FailureRisk[];
    rul: RulItem[];
    anomalies: AnomalyItem[];
    anomalyTimeline: number[];
  };
  analysis: {
    model: {
      healthIndex: number | null;
      /** Share of measurements with a current valid reading (%). */
      confidence: number | null;
      inputs: number;
      condition: string;
      engine: string;
    };
    sources: IssueSource[];
    faults: FaultClass[];
    degradation: { stages: string[]; items: DegradationItem[] };
    actions: MaintenanceAction[];
    features: FeatureWeight[];
    reasoning: ReasoningStep[];
  };
}

