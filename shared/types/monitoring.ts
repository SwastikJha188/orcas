/**
 * Monitoring API contracts (client and server). Every value here is read from
 * the database or calculated from stored readings by the server.
 */

export type SeverityId = "Normal" | "Alert" | "Critical";
export type DataAssessment = "valid" | "stale" | "missing" | "unreliable";

export interface MeasurementLimitDto {
  kind: string;
  kindName: string;
  relative: boolean;
  direction: "hi" | "lo" | "both" | null;
  warnValue: number | null;
  alarmValue: number | null;
  warnLo: number | null;
  warnHi: number | null;
  alarmLo: number | null;
  alarmHi: number | null;
  warnPct: number | null;
  alarmPct: number | null;
  collapsePct: number | null;
  ratio: number | null;
  rise: number | null;
  split: number | null;
  pairTag: string | null;
  driveTag: string | null;
  driveOn: number | null;
  referenceValue: number | null;
  absWarnLo: number | null;
  absWarnHi: number | null;
  absAlarmLo: number | null;
  absAlarmHi: number | null;
  ratePerHour: number | null;
  rateOf: "value" | "residual" | null;
  rateWindow: number | null;
  raiseSamples: number;
  clearSamples: number;
  basisNormal: string | null;
  basisWarning: string | null;
  basisAlarm: string | null;
  source: string | null;
  note: string | null;
  approval: "provisional" | "approved";
  approvedBy: string | null;
  approvedAt: string | null;
}

export interface MeasurementDto {
  id: string;
  tag: string;
  name: string;
  machineId: string;
  plantId: string;
  system: { id: string; code: string; name: string };
  subassembly: { id: string; code: string; name: string };
  point: { id: number; code: string; location: string | null; x: number | null; y: number | null };
  quantity: { id: string; name: string };
  unit: string | null;
  statistic: string;
  direction: string;
  origin: "online" | "calculated" | "manual";
  valueKind: "analog" | "state";
  instrument: string | null;
  sensorType: string | null;
  decimals: number;
  acquisitionRateHz: number | null;
  publishPeriodS: number | null;
  staleAfterS: number | null;
  bandLoHz: number | null;
  bandHiHz: number | null;
  windowS: number | null;
  rangeLo: number | null;
  rangeHi: number | null;
  accuracy: string | null;
  noiseSigma: number | null;
  priority: string | null;
  installStatus: string | null;
  standard: string | null;
  acquisitionText: string | null;
  rangeText: string | null;
  normalText: string | null;
  acquisition: { rack: string; card: string; address: string | null } | null;
  states: Array<{ state: string; severity: SeverityId }>;
  limit: MeasurementLimitDto | null;
  /** Accepted reference for the machine's current operating state. */
  reference: { setId: number; setName: string; expected: number | null; lo: number | null; hi: number | null } | null;
  latest: {
    acquiredAt: string;
    receivedAt: string;
    timeSource: "device" | "gateway" | "server";
    value: number | null;
    state: string | null;
    quality: string;
    ageS: number;
  } | null;
  assessment: DataAssessment;
  /** Severity of open limit findings on this measurement. */
  severity: SeverityId;
  sortOrder: number;
}

export interface ReadingPointDto {
  t: string;
  value: number | null;
  state: string | null;
  quality: string;
}

export interface ReadingBucketDto {
  t: string;
  n: number;
  good: number;
  min: number | null;
  max: number | null;
  mean: number | null;
}

export interface FeaturesDto {
  measurementId: string;
  from: string;
  to: string;
  samples: number;
  usable: number;
  latest: number | null;
  first: number | null;
  min: number | null;
  max: number | null;
  mean: number | null;
  stdDev: number | null;
  rms: number | null;
  peak: number | null;
  peakToPeak: number | null;
  crestFactor: number | null;
  change: number | null;
  changePct: number | null;
  ratePerHour: number | null;
}

export interface FindingDto {
  id: number;
  machineId: string;
  type: string;
  typeName: string;
  severity: SeverityId;
  measurement: { id: string; tag: string; name: string; unit: string | null } | null;
  /** The rule that raised it; the plain* fields are the everyday-words texts (docs/plain-language.md). */
  rule: { id: number; code: string; name: string; category: string; action: string; plainTitle: string | null; plainWhat: string | null; plainTodo: string | null } | null;
  operatingState: string | null;
  reference: string | null;
  observed: number | null;
  expected: number | null;
  expectedLo: number | null;
  expectedHi: number | null;
  limitValue: number | null;
  change: number | null;
  changeWindowS: number | null;
  dataAssessment: DataAssessment;
  causeStatus: "not_established" | "suspected" | "confirmed";
  summary: string;
  openedAt: string;
  lastEvaluatedAt: string;
  clearedAt: string | null;
  acknowledgement: { by: string | null; at: string; note: string | null } | null;
  entries: Array<{ id: number; kind: string; body: string; by: string | null; at: string; workOrderId: number | null }>;
}

export interface HealthBandDto {
  severity: SeverityId;
  /** Scores below `below` take this severity (null for Normal). */
  below: number | null;
}

export interface HealthModelDto {
  id: string;
  name: string;
  description: string;
  parameters: Array<{ key: string; value: number; description: string }>;
  bands: HealthBandDto[];
}

export interface MachineConditionDto {
  machineId: string;
  operatingState: { id: number; code: string; name: string; running: boolean; since: string } | null;
  health: { score: number; status: SeverityId; at: string; model: string } | null;
  subassemblies: Array<{ id: string; code: string; name: string; system: string; score: number | null; status: SeverityId | null }>;
  findings: { open: number; critical: number; advisory: number; unacknowledged: number };
  data: { measurements: number; valid: number; stale: number; missing: number; unreliable: number; lastReadingAt: string | null };
}

export interface MachineEventDto {
  id: number;
  machineId: string;
  type: string;
  typeName: string;
  category: string;
  occurredAt: string;
  severity: SeverityId;
  measurementTag: string | null;
  title: string;
  description: string | null;
  source: string;
  actor: string | null;
}

export interface ReferenceSetDto {
  id: number;
  machineId: string;
  state: { id: number; code: string; name: string } | null;
  name: string;
  status: "draft" | "accepted" | "retired";
  basis: string;
  windowFrom: string | null;
  windowTo: string | null;
  createdBy: string | null;
  createdAt: string;
  acceptedBy: string | null;
  acceptedAt: string | null;
  values: Array<{ measurementId: string; tag: string; expected: number | null; lo: number | null; hi: number | null; samples: number | null }>;
}

export interface SimulationDto {
  machineId: string;
  plantId: string;
  engine: "kiln" | "pyro" | "vpc" | "limits";
  seed: number | null;
  profile: string | null;
  enabled: boolean;
}

export interface WorkOrderPriorityDto {
  id: string;
  name: string;
  /** Response time; null when the priority is "at the next planned outage" (no fixed time). */
  responseMinutes: number | null;
  /** How the response is worded ("Within 4 h", "Next planned outage"). */
  description: string;
  /** The priority a new work order gets when none is chosen. */
  defaultNew: boolean;
  /** The priority an inspection defect opens with. */
  defaultDefect: boolean;
}
