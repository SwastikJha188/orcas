/* ==========================================================================
   ULTRON status vocabulary: one scale, one set of words, one tone each.

   Condition (machines, sub-assemblies, plants, findings):
     Normal · Alert · Critical   (+ Standby, No data when not judged)
   Process limits (a signal against its limits):
     Normal · Alert · Critical
   Data validity (a sensor's reading):
     Valid · Suspect · Invalid · Stale · No data

   Every page maps its raw states through these helpers, so the same
   condition always reads with the same word and colour.
   ========================================================================== */

/** Status tone: drives `data-tone` → `--tone` on chips, ticks, dots and bars. */
export type Tone = "good" | "warn" | "bad" | "idle" | "info";

export type Condition = "Normal" | "Alert" | "Critical" | "Standby" | "No data";
export type LimitState = "Normal" | "Alert" | "Critical";
export type Validity = "Valid" | "Suspect" | "Invalid" | "Stale" | "No data";

const CONDITION_SYNONYMS: Record<string, Condition> = {
  normal: "Normal",
  healthy: "Normal",
  operational: "Normal",
  nominal: "Normal",
  ok: "Normal",
  good: "Normal",
  pass: "Normal",
  stable: "Normal",
  clear: "Normal",
  cleared: "Normal",
  low: "Normal",
  minor: "Normal",
  running: "Normal",
  online: "Normal",
  quiet: "Normal",
  advisory: "Alert",
  warning: "Alert",
  warn: "Alert",
  alert: "Alert",
  "at risk": "Alert",
  "needs attention": "Alert",
  attention: "Alert",
  check: "Alert",
  watch: "Alert",
  elevated: "Alert",
  degrading: "Alert",
  drifting: "Alert",
  medium: "Alert",
  major: "Alert",
  critical: "Critical",
  alarm: "Critical",
  danger: "Critical",
  trip: "Critical",
  fail: "Critical",
  failed: "Critical",
  faults: "Critical",
  intervene: "Critical",
  "short life": "Critical",
  severe: "Critical",
  high: "Critical",
  immediate: "Critical",
  standby: "Standby",
  maintenance: "Standby",
  disabled: "Standby",
  offline: "Standby",
  "no data": "No data",
  "no live feed": "No data",
  waiting: "No data",
  "n/a": "No data",
  unknown: "No data",
  checking: "No data",
};

/** Any raw condition word (Healthy, Operational, Danger, At risk…) → the one scale.
 *  A word we do not know is "No data": an unknown state is never shown as Normal. */
export function toCondition(raw: string | null | undefined): Condition {
  if (!raw) return "No data";
  return CONDITION_SYNONYMS[raw.trim().toLowerCase()] ?? "No data";
}

export function conditionTone(c: Condition | string | null | undefined): Tone {
  const k = typeof c === "string" && (c === "Normal" || c === "Alert" || c === "Critical" || c === "Standby" || c === "No data") ? c : toCondition(c);
  if (k === "Critical") return "bad";
  if (k === "Alert") return "warn";
  if (k === "Standby" || k === "No data") return "idle";
  return "good";
}

/** Worst of several conditions (Critical > Alert > Normal > Standby > No data). */
export function worstCondition(list: (Condition | string)[]): Condition {
  const rank: Record<Condition, number> = { Critical: 4, Alert: 3, Normal: 2, Standby: 1, "No data": 0 };
  let worst: Condition = "No data";
  for (const raw of list) {
    const c = toCondition(raw);
    if (rank[c] > rank[worst]) worst = c;
  }
  return worst;
}

export function limitTone(s: LimitState | string): Tone {
  const k = s.toLowerCase();
  if (k === "alarm" || k === "danger" || k === "trip" || k === "critical") return "bad";
  if (k === "warning" || k === "warn" || k === "alert" || k === "advisory") return "warn";
  return "good";
}

/** Raw limit words (Alert/Danger, Warn/Trip, warning/danger) → Alert / Critical. */
export function toLimitState(raw: string | null | undefined): LimitState {
  const t = limitTone(raw ?? "");
  return t === "bad" ? "Critical" : t === "warn" ? "Alert" : "Normal";
}

/** Reading-quality words people see, the same on every page (the Validity values stay the data's own words). */
export const VALIDITY_WORDS: Record<Validity, string> = {
  Valid: "Good",
  Suspect: "May be wrong",
  Invalid: "Not usable",
  Stale: "Not updating",
  "No data": "No reading",
};

export function validityTone(v: Validity | string): Tone {
  switch (v.toLowerCase()) {
    case "valid":
      return "good";
    case "suspect":
    case "stale":
      return "warn";
    case "invalid":
      return "bad";
    default:
      return "idle";
  }
}

/**
 * Alarm states (ISA-18.2). Acknowledgement is separate from returning to
 * normal: a cleared alarm nobody acknowledged is still unacknowledged.
 */
export const ALARM_STATE = {
  confirming: "Confirming",
  active: "Active",
  clearing: "Clearing",
  cleared: "Cleared",
  acknowledged: "Acknowledged",
  unacknowledged: "Unacknowledged",
} as const;

/** Standard action labels, so the same action reads the same everywhere. */
export const ACTION = {
  workOrder: "Create work order",
  acknowledge: "Acknowledge",
  back: "All assets",
  exportCsv: "Export CSV",
  refresh: "Refresh",
} as const;
