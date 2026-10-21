"use client";

import { useCallback } from "react";
import { useApi } from "@/lib/api-cache";
import { simMinuteMs } from "@shared/lib/kiln-sim/engine";
import { runningHours, serviceUsedUnits } from "@shared/lib/pyro-sim/service-life";
import { MAINTENANCE_VOCABULARY_URL } from "@shared/lib/maintenance";
import { useKilnFleet } from "@/providers/kiln-simulation-context";
import type { Tone } from "@/components/ui";
import type { MaintenanceVocabulary } from "@shared/types/maintenance";
import type { AlertCheck, ServicePartRecord, TrendLife } from "@shared/types/maintenance-types";

/* ==========================================================================
   Maintenance by type: the checks alarms raised (predictive), part service
   lives and readings heading to a limit (proactive). Read from the database
   through /api/maintenance/{alert-checks,parts,remaining-life}.
   ========================================================================== */

export const ALERT_CHECKS_URL = "/api/maintenance/alert-checks";
export const PARTS_URL = "/api/maintenance/parts";
export const REMAINING_LIFE_URL = "/api/maintenance/remaining-life";

/** Checks raised by alarms; re-read every minute so a new alarm's check shows soon after it is raised. */
export const useAlertChecks = () => useApi<AlertCheck[]>(ALERT_CHECKS_URL, { refreshMs: 60_000 });
export const useServiceParts = () => useApi<ServicePartRecord[]>(PARTS_URL);
/** Remaining life from trends: as calm as Prognosis (about every 12 minutes). */
export const useTrendLives = () => useApi<TrendLife[]>(REMAINING_LIFE_URL, { refreshMs: 12 * 60_000 });
export const useMaintenanceVocabulary = () => useApi<MaintenanceVocabulary>(MAINTENANCE_VOCABULARY_URL);

/* ------------------------------------------------------------ checks */

export interface CheckState {
  label: string;
  tone: Tone;
  open: boolean;
  overdue: boolean;
}

export function checkState(c: AlertCheck, now: number): CheckState {
  if (c.result === "fine") return { label: "Nothing wrong found", tone: "idle", open: false, overdue: false };
  if (c.result === "problem") return { label: "Problem found", tone: "warn", open: false, overdue: false };
  const overdue = c.dueAt !== null && Date.parse(c.dueAt) < now;
  if (overdue) return { label: "Overdue", tone: c.severity === "Critical" ? "bad" : "warn", open: true, overdue };
  if (!c.alarmActive) return { label: "Alarm cleared · still to check", tone: "idle", open: true, overdue };
  return { label: "To check", tone: c.severity === "Critical" ? "bad" : "warn", open: true, overdue };
}

/* ------------------------------------------------------------ part lives */

/** The machine's running-hours counter (plant clock), from its live frame; null until the plant is running here. */
export function useRunningHours(): (machineId: string) => number | null {
  const fleet = useKilnFleet();
  return useCallback(
    (machineId: string) => {
      const t = fleet[machineId]?.frame.t;
      return typeof t === "number" ? runningHours(t) : null;
    },
    [fleet],
  );
}

export interface PartLife {
  part: ServicePartRecord;
  /** Units used now (h or days of plant time). */
  usedUnits: number;
  share: number;
  leftUnits: number;
  /** When the due share is reached (plan the replacement by then) and when the life runs out; null when the counter is unknown. */
  planBy: number | null;
  runsOut: number | null;
  state: "over" | "due" | "ok";
}

/**
 * Where a part stands when the counter reads `counterH`. Dates come from the
 * plant clock: one plant hour lasts `60 × simMinuteMs()` of real time.
 */
export function partLife(part: ServicePartRecord, counterH: number | null, now: number): PartLife {
  const usedUnits = counterH === null ? part.used : serviceUsedUnits(part, counterH);
  const share = usedUnits / part.life;
  const unitMs = (part.basis === "d" ? 24 : 1) * 60 * simMinuteMs();
  const at = (units: number) => (counterH === null ? null : now + Math.max(0, units - usedUnits) * unitMs);
  return {
    part,
    usedUnits,
    share,
    leftUnits: Math.max(0, part.life - usedUnits),
    planBy: at(part.life * part.dueShare),
    runsOut: at(part.life),
    state: share >= 1 ? "over" : share >= part.dueShare ? "due" : "ok",
  };
}

const NUM = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

/** "7,950 h" / "120 days" in the record's own unit. */
export const lifeUnits = (n: number, basis: "h" | "d") => (basis === "h" ? `${NUM.format(n)} h` : `${NUM.format(n)} ${Math.round(n) === 1 ? "day" : "days"}`);
