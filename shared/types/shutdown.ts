// Shutdowns (migration 061): one planned stop of a plant's machines, from the
// plan to the restart. The work in it points at checklist items, work orders
// and part records; their titles, trades and readiness are read from those.

export type ShutdownState = "draft" | "approved" | "stopping" | "in_progress" | "restarting" | "closed" | "cancelled";

export type ShutdownItemKind = "task" | "work_order" | "part";

export type PartsState = "pending" | "confirmed" | "blocked" | "na";

export interface ShutdownSummary {
  id: number;
  plantId: string;
  name: string;
  plannedStart: string;
  plannedEnd: string;
  state: ShutdownState;
  machineIds: string[];
  /** Work items in it (moved ones included). */
  items: number;
}

export interface ShutdownMachine {
  machineId: string;
  /** Hours the machine needs to cool before work can start (person-set); null = not known. */
  cooldownHours: number | null;
  /** The machine has a run signal (speed or run feedback) the stop and start are read from. */
  runSignal: boolean;
  /** When the readings showed it stopped during this shutdown; null until seen. */
  stoppedAt: string | null;
  /** When the readings showed it running again after the restart began; null until seen. */
  startedAt: string | null;
  /** Running now by its run signal (null without one, or before its state is known). */
  runningNow: boolean | null;
}

export interface ShutdownItem {
  id: number;
  kind: ShutdownItemKind;
  /** Checklist items name their machine; work orders and parts are read through their own record (null here). */
  machineId: string | null;
  checklistKind: "equipment" | "sensor" | null;
  taskId: string | null;
  workOrderId: number | null;
  partId: string | null;
  /** Hours of work for a checklist item or a part (a work order keeps its own). */
  estimateHours: number | null;
  /** Part in the store (part replacements). */
  partsState: PartsState | null;
  /** Trade doing a work order or a part replacement (maintenance_owners code); checklist items name their own. */
  owner: string | null;
  /** Added while the line was stopped. */
  found: boolean;
  moved: { reason: string; at: string; by: string | null } | null;
  addedAt: string;
  addedBy: string | null;
  /** Done during this shutdown: a checklist result, the work order finished (or cancelled), the part replaced. */
  done: { at: string; by: string | null; result: string } | null;
}

export interface ShutdownCrew {
  /** maintenance_owners code (ME, EL, IN …). */
  owner: string;
  people: number;
  hoursPerDay: number;
}

export interface ShutdownIsolation {
  id: number;
  machineId: string;
  kind: string;
  point: string;
  permitRef: string | null;
  isolatedAt: string | null;
  isolatedBy: string | null;
  releasedAt: string | null;
  releasedBy: string | null;
}

export interface ShutdownEvent {
  id: number;
  action: string;
  from: ShutdownState | null;
  to: ShutdownState | null;
  reason: string | null;
  actor: string | null;
  at: string;
}

/** One reading in the first hours after the restart against the hours before the stop. */
export interface ShutdownComparison {
  measurementId: string;
  machineId: string;
  tag: string;
  name: string;
  unit: string;
  decimals: number | null;
  rangeLo: number | null;
  rangeHi: number | null;
  before: number | null;
  after: number | null;
}

export interface ShutdownDetail extends ShutdownSummary {
  notes: string | null;
  createdBy: string | null;
  machines: ShutdownMachine[];
  items: number;
  work: ShutdownItem[];
  crews: ShutdownCrew[];
  isolations: ShutdownIsolation[];
  events: ShutdownEvent[];
  /** When each state began (latest change into it); null when it has not. */
  phases: Partial<Record<ShutdownState, string>>;
  /** Hours compared before the stop and after the restart (system setting). */
  compareWindowH: number;
  comparison: ShutdownComparison[];
  /** The work list in SAP: each machine's maintenance order (latest write). */
  sapOrders: ShutdownSapOrder[];
}

/** pending · processing · retry · completed (sent, with the order number) · failed · not_mapped (no SAP equipment). */
export interface ShutdownSapOrder {
  machineId: string;
  state: string;
  order: string | null;
  error: string | null;
  at: string;
}

export interface ShutdownVocabulary {
  states: { id: ShutdownState; label: string }[];
  isolationKinds: { id: string; label: string; isBlank: boolean }[];
  owners: { code: string; label: string }[];
}

/** GET /api/maintenance/shutdowns?plantId= */
export interface ShutdownList {
  shutdowns: ShutdownSummary[];
  vocabulary: ShutdownVocabulary;
  /** Signed-in user may approve the plan, the stop and the restart (role can_manage_work_orders). */
  canApprove: boolean;
  /** The plant has a SAP connection that is switched on (the work list can go to SAP). */
  sapConnected: boolean;
}
