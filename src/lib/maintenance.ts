import type { ChecklistKind, ChecklistTask, MaintenanceRecord } from "@/types/maintenance";

/* ==========================================================================
   Maintenance checklist vocabulary and due logic (client side, pure).
   Codes come from the documents' §1.4 tables; intervals are the documents'
   starting inspection routes, not plant-approved intervals.
   ========================================================================== */

export type RouteId =
  | "shift" | "daily" | "weekly" | "monthly" | "quarterly" | "annual" | "stop" | "event"
  | "live" | "oem" | "site";

interface Route {
  id: RouteId;
  label: string;
  /** Calendar interval in hours; null = not calendar-driven (stop, event, OEM, live). */
  hours: number | null;
}

const H = 1;
const DAY = 24 * H;

export const ROUTES: Record<RouteId, Route> = {
  shift: { id: "shift", label: "Shift", hours: 8 * H },
  daily: { id: "daily", label: "Daily", hours: DAY },
  weekly: { id: "weekly", label: "Weekly", hours: 7 * DAY },
  monthly: { id: "monthly", label: "Monthly", hours: 30 * DAY },
  quarterly: { id: "quarterly", label: "Quarterly", hours: 91 * DAY },
  annual: { id: "annual", label: "Annual", hours: 365 * DAY },
  stop: { id: "stop", label: "Planned stop", hours: null },
  event: { id: "event", label: "Event", hours: null },
  live: { id: "live", label: "Live", hours: null },
  oem: { id: "oem", label: "OEM interval", hours: null },
  site: { id: "site", label: "Site survey", hours: null },
};

export const ROUTE_ORDER: Record<ChecklistKind, RouteId[]> = {
  equipment: ["shift", "daily", "weekly", "monthly", "quarterly", "annual", "stop", "event"],
  sensor: ["live", "oem", "site"],
};

export function routeOf(task: ChecklistTask): RouteId {
  switch (task.freq) {
    case "Each shift": return "shift";
    case "Daily": return "daily";
    case "Weekly": return "weekly";
    case "Monthly": return "monthly";
    case "Quarterly": return "quarterly";
    case "Annually":
    case "1–2 years": return "annual";
    case "Planned stop": return "stop";
    case "Event-based": return "event";
    case "AUTO / SHIFT":
    case "AUTO / W": return "live";
    case "O / OEM": return "oem";
    default: return "site";
  }
}

/** Rounds a site-added item can join: every route except the automatic live checks. */
export const ADDABLE_ROUTES: Record<ChecklistKind, RouteId[]> = {
  equipment: ROUTE_ORDER.equipment,
  sensor: ["oem", "site"],
};

/** The document's interval wording for a route (inverse of `routeOf`). */
export function freqOf(route: RouteId): string {
  const FREQ: Record<RouteId, string> = {
    shift: "Each shift",
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    quarterly: "Quarterly",
    annual: "Annually",
    stop: "Planned stop",
    event: "Event-based",
    live: "AUTO / SHIFT",
    oem: "O / OEM",
    site: "SITE / OEM",
  };
  return FREQ[route];
}

/** The interval as written, in plain words. */
export function intervalLabel(task: ChecklistTask): string {
  switch (task.freq) {
    case "AUTO / SHIFT": return "Live · shift review";
    case "AUTO / W": return "Live · weekly review";
    case "O / OEM": return "OEM interval";
    case "SITE / OEM": return "After site survey";
    case "Annually": return "Annual";
    default: return task.freq;
  }
}

export const OWNER: Record<string, string> = {
  ME: "Mechanical maintenance",
  EL: "Electrical maintenance",
  IN: "Instrumentation and control",
  REL: "Reliability / condition monitoring",
  OP: "Operations (CCR and field)",
  EH: "Environment, health and safety",
};

export const MODE: Record<string, string> = {
  RUN: "While running · DCS review or guarded external observation",
  "RUN + STOP": "Trend while running, isolated inspection at a stop",
  OFF: "Only under verified isolation (LOTO)",
  "OFF / RUN": "Depends on the installation",
};

export const SCOPE: Record<string, string> = {
  BASE: "Expected on this line",
  VERIFY: "Confirm on the approved P&ID, OEM BOM and field survey first",
  "DCS DATA": "From DCS / ULTRON data",
  FIELD: "Non-intrusive field check while operating",
};

/* ------------------------------------------------------------ state */

/** Data validity of the tag behind a live check (sensor checklist). */
export type LiveValidity = "Valid" | "Suspect" | "Invalid" | "No live feed";

export type TaskStateKey = "Pass" | "NA" | "Defect" | "Hold" | "Overdue" | "Not recorded" | LiveValidity;

export interface TaskState {
  key: TaskStateKey;
  last: MaintenanceRecord | null;
  /** Counts toward "Due": calendar task never recorded or past its interval, or a live-check exception. */
  due: boolean;
  /** Has a current result (recorded within its interval, or a valid live check). */
  current: boolean;
  /** Latest result is a defect / hold not yet cleared by a later result. */
  open: "Defect" | "Hold" | null;
  /** Live check: the validation note for the tag. */
  liveNote?: string | null;
}

export function taskState(
  task: ChecklistTask,
  last: MaintenanceRecord | null,
  now: number,
  live?: { quality: LiveValidity; note: string | null } | null,
): TaskState {
  const open = last && (last.result === "Defect" || last.result === "Hold") ? last.result : null;
  if (open) return { key: open, last, due: false, current: false, open };
  const route = routeOf(task);
  if (route === "live") {
    const q = live?.quality ?? "No live feed";
    const exception = q === "Suspect" || q === "Invalid";
    return { key: q, last, due: exception, current: q === "Valid", open: null, liveNote: live?.note ?? null };
  }
  const hours = ROUTES[route].hours;
  if (!last) return { key: "Not recorded", last, due: hours !== null, current: false, open: null };
  const lapsed = hours !== null && now - Date.parse(last.recordedAt) > hours * 3_600_000;
  if (lapsed) return { key: "Overdue", last, due: true, current: false, open: null };
  return { key: last.result as "Pass" | "NA", last, due: false, current: true, open: null };
}

/** Latest record per task (records arrive newest first). */
export function latestByTask(records: MaintenanceRecord[]): Map<string, MaintenanceRecord> {
  const m = new Map<string, MaintenanceRecord>();
  for (const r of records) if (!m.has(r.taskId)) m.set(r.taskId, r);
  return m;
}

/** The step a row shows: the live / field check rather than the location line. */
export function primaryStep(task: ChecklistTask) {
  return task.check.find((s) => s.label !== "Location") ?? task.check[0];
}
