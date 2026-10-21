// Maintenance by type (migration 040): preventive rounds, checks raised by
// alarms (predictive) and part service lives (proactive).

export type MaintenanceTypeId = "preventive" | "predictive" | "proactive";

/** A "go and check" task the server raised for an alarm (one per alarm finding). */
export interface AlertCheck {
  id: number;
  findingId: number;
  machineId: string;
  /** A limit crossed by one measurement, or a diagnostic pattern (rule). */
  kind: "limit" | "pattern";
  severity: "Alert" | "Critical";
  /** Priority from the alarm's severity (database); the due time is its response time. */
  priority: string;
  raisedAt: string;
  /** null when the priority has no response time (next planned outage). */
  dueAt: string | null;
  /** The alarm (or a later alarm on the same thing) is still on. */
  alarmActive: boolean;
  title: string;
  /** What the alarm said when it was raised. */
  summary: string;
  /** What to check, from the rule (null for a limit: the reading itself is the check). */
  todo: string | null;
  cause: string | null;
  consequence: string | null;
  ruleCode: string | null;
  measurement: { tag: string; name: string; unit: string; observed: number | null; limit: number | null } | null;
  /** Sub-assemblies where to look. */
  places: string[];
  /** Measurements behind the alarm. */
  tags: string[];
  /** Their names, in the same order (what a person reads). */
  readings: string[];
  result: "fine" | "problem" | null;
  note: string | null;
  checkedBy: string | null;
  checkedAt: string | null;
  workOrderId: number | null;
}

/** A part's service life record (component_service_lives). */
export interface ServicePartRecord {
  id: string;
  machineId: string;
  subassemblyRefId: string | null;
  /** Sub-assembly code inside the machine (`kln-lube`). */
  sub: string | null;
  subName: string | null;
  name: string;
  basis: "h" | "d";
  life: number;
  dueShare: number;
  used: number;
  counterH: number;
  installed: string | null;
  duty: string | null;
  recordSource: string | null;
  events: Array<{ id: number; action: "replaced" | "corrected"; usedBefore: number | null; at: string; actor: string | null; workOrderId: number | null; note: string | null }>;
}

/** Remaining life from a measurement trending toward its alarm limit (server insights). */
export interface TrendLife {
  machineId: string;
  /** Sub-assembly id as the insights name it. */
  id: string;
  name: string;
  /** Hours (plant clock) until the reading reaches its alarm limit at the current trend. */
  hours: number;
  /** Fit quality (R² %). */
  confidence: number | null;
  driver: string | null;
  status: string;
}

export interface PreventiveGroup {
  id: string;
  label: string;
  /** Rounds (maintenance_routes ids) in this group, in display order. */
  routes: string[];
}
