export type SealSubAssembly = "both" | "inlet" | "outlet";

export type SimulationScenarioId =
  | "healthy"
  | "inlet_leak"
  | "outlet_trip"
  | "axial_drift"
  | "compound_fault"
  | "sensor_drift";

export interface SimulationScenario {
  id: SimulationScenarioId;
  name: string;
  code: string;
  description: string;
  expectedRule: string;
  expectedCondition: "Normal" | "Alert" | "Critical";
  feedOffset?: number;
  fuelOffset?: number;
  draftOffset?: number;
  lvdtOffset?: number;
  inletWearFactor?: number;
  fanStopped?: boolean;
  o2SensorFault?: boolean;
  analyserStatus?: "OK" | "BLOWBACK" | "FAULT";
}

export interface KilnSealsSensorData {
  // Primary Seals Signals
  gasO2: number; // GAS-KLN-01 (vol%)
  gasO2Model: number; // Reference model expected O2
  gasO2Residual: number; // Measured - Model
  gasCO: number; // GAS-KLN-02 (ppm)
  inletGasTemp: number; // TMP-KLN-13 (°C)
  inletGasTempModel: number; // Reference model expected temp
  inletGasTempResidual: number; // Measured - Model
  inletDraft: number; // PRS-KLN-01 (mbar)
  gasAnalyserStatus: "OK" | "BLOWBACK" | "FAULT"; // STS-KLN-06
  
  hoodPressure: number; // PRS-KLN-03 (mbar)
  hoodPressureModel: number; // Reference model
  outletFanStatus: "RUNNING" | "STOPPED"; // STS-KLN-10
  shellMaxTemp: number; // CAL-KLN-03 (°C)
  scannerCoverage: number; // STS-KLN-08 (%)

  lvdtPosition: number; // POS-KLN-01 (mm)
  travelLimitSwitch: "CLEAR" | "LIMIT"; // POS-KLN-02
  falseAirIndex: number; // CAL-KLN-06 (vol%)
  sealOverlapMargin: number; // CAL-KLN-07 (mm)

  // Upstream Process Context Drivers
  kilnFeed: number; // FLO-KLN-01 (t/h)
  kilnFuel: number; // FLO-KLN-02 (t/h)
  kilnSpeed: number; // SPD-KLN-01 (rpm)
  ambientTemp: number; // AMB-EST (°C)
  
  // Physical Simulation States
  inletSealWear: number; // 0 - 100%
  outletSealWear: number; // 0 - 100%
  rotationAngle: number; // 0 - 360 deg
  timestamp: string;
}

export interface KilnSealsHealthScores {
  overallHealth: number; // 0 - 100
  inletSealHealth: number; // 0 - 100
  outletSealHealth: number; // 0 - 100
  axialOverlapHealth: number; // 0 - 100
  dataQualityScore: number; // 0 - 100
  condition: "Healthy" | "Alert" | "Critical";
  primaryCause?: string;
  recommendedAction?: string;
}

export interface EvaluatedRule {
  id: string; // "R-SHL-03" etc
  name: string;
  category: import("@/lib/kiln-sim/rules").RuleCategory;
  severity: "Normal" | "Alert" | "Critical";
  status: "ACTIVE" | "PENDING" | "QUIET";
  logicDescription: string;
  triggerCondition: string;
  activeEvidence: string;
  persistenceCount: number;
  persistenceThreshold: number;
  hysteresisCount: number;
  leadTimeToLimit: string;
  rootCause: string;
  prescriptiveAction: string;
}

export interface SealTimeSeriesPoint {
  time: string;
  gasO2: number;
  gasO2Model: number;
  inletGasTemp: number;
  inletGasTempModel: number;
  inletDraft?: number;
  hoodPressure: number;
  hoodPressureModel?: number;
  outletFanRunning: number; // 1 or 0
  sealOverlap: number;
  lvdtPosition: number;
  falseAirIndex: number;
  shellMaxTemp?: number;
  kilnFeed?: number;
  kilnFuel?: number;
  kilnSpeed?: number;
  health: number;
}

