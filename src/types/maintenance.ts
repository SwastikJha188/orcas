// Machine maintenance checklists (OSWARteck pyro-line standards) and the
// inspection results recorded against them.
//
//   equipment  OSW-PE-MNT-PYR-01  mechanical / electrical / process hardware
//   sensor     OSW-PE-SMT-PYR-01  field instruments and signal integrity
//
// The checklist text is verbatim from the PDFs; results live in PostgreSQL
// (`maintenance_records`), one row per recorded inspection.

export type ChecklistKind = "equipment" | "sensor";

/** Pass · Defect · NA (documented proof of absence) · Hold (as-found observation, follow-up). */
export type InspectionResult = "Pass" | "Defect" | "NA" | "Hold";

export const INSPECTION_RESULTS: InspectionResult[] = ["Pass", "Defect", "NA", "Hold"];

export interface ChecklistStep {
  /** "Location", "Live Check", "Field Check", "Planned Test", "Area"; null for a plain check. */
  label: string | null;
  text: string;
}

export interface ChecklistTask {
  id: string;
  /** D5 signal tag (sensor checklist); absent for site-survey candidates. */
  tag?: string;
  component: string;
  /** Sensor checklist: D5 priority (Required / Optional) or Conditional. */
  priority?: string;
  check: ChecklistStep[];
  pass: string;
  /** Equipment: Each shift … Planned stop · Event-based. Sensor: AUTO / SHIFT, AUTO / W, O / OEM, SITE / OEM. */
  freq: string;
  /** ME · EL · IN · REL · OP · EH */
  owner: string;
  /** RUN · RUN + STOP · OFF (· OFF / RUN on conditional sensor tasks) */
  mode: string;
  /** BASE · VERIFY (equipment) · DCS DATA · FIELD · VERIFY (sensor) */
  scope: string;
  /** Added on site for this machine (not in the document); id is `U-<n>`. */
  added?: { by: string | null; at: string };
}

/** A checklist item taken off this machine's checklist; it can be put back. */
export interface RemovedChecklistItem {
  taskId: string;
  component: string;
  text: string;
  /** Section it belonged to, e.g. "FSL-01 · Silo body". */
  where: string;
  removedBy: string | null;
  removedAt: string;
}

export interface ChecklistGroup {
  /** Section number in the source document, e.g. "7.3". */
  num: string;
  title: string;
  tasks: ChecklistTask[];
}

/** One machine unit of a checklist (GEN, FSL-01, KLN-01, EXH-IF …). */
export interface ChecklistUnit {
  code: string;
  title: string;
  /** Sensor EXH-IF candidates: not D5-approved signals. */
  conditional?: boolean;
  groups: ChecklistGroup[];
}

export interface ChecklistDocument {
  kind: ChecklistKind;
  number: string;
  revision: string;
  title: string;
  issued: string;
  status: string;
}

export interface MaintenanceRecord {
  id: number;
  machineId: string;
  kind: ChecklistKind;
  taskId: string;
  result: InspectionResult;
  note: string | null;
  inspector: string | null;
  workOrderId: number | null;
  recordedAt: string;
}

/** GET /api/maintenance?machineId=&kind= */
export interface MaintenanceChecklist {
  machineId: string;
  document: ChecklistDocument;
  units: ChecklistUnit[];
  records: MaintenanceRecord[];
  removed: RemovedChecklistItem[];
}

/** POST /api/maintenance/items: a site-added item in an existing section. */
export interface AddChecklistItemInput {
  machineId: string;
  kind: ChecklistKind;
  unitCode: string;
  groupNum: string;
  /** Round the item belongs to (RouteId, never "live"). */
  route: string;
  component: string;
  check: string;
  pass?: string;
}

/** POST /api/maintenance */
export interface RecordInspectionInput {
  machineId: string;
  kind: ChecklistKind;
  taskId: string;
  result: InspectionResult;
  note?: string;
}
