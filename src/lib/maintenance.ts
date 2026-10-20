import type { ChecklistTask, MaintenanceRecord } from "@/types/maintenance";

/* ==========================================================================
   Maintenance checklist due logic (client side, pure). The vocabulary (rounds,
   intervals, owners, modes, scopes) comes from the database:
   GET /api/maintenance/vocabulary, and each task carries its round.
   ========================================================================== */

export const MAINTENANCE_VOCABULARY_URL = "/api/maintenance/vocabulary";

/** A calendar interval in words: "Every 8 h", "Every day", "Every 7 days", "Every 12 months". */
export function everyText(hours: number): string {
  if (hours < 24) return `Every ${hours} h`;
  const d = hours / 24;
  if (d === 1) return "Every day";
  if (d === 365) return "Every 12 months";
  return `Every ${Math.round(d * 10) / 10} days`;
}

/** A round's name from its vocabulary label: calendar rounds read "Weekly round", the others keep their label. */
export function roundName(label: string, intervalHours: number | null): string {
  return intervalHours === null ? label : `${label} round`;
}

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
  if (task.route === "live") {
    const q = live?.quality ?? "No live feed";
    const exception = q === "Suspect" || q === "Invalid";
    return { key: q, last, due: exception, current: q === "Valid", open: null, liveNote: live?.note ?? null };
  }
  const hours = task.intervalHours;
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
