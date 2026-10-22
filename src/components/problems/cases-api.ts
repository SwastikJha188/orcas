"use client";

/**
 * Read side of problem cases (backend/src/services/case-service.ts,
 * /api/cases/...): the open-alarm count on the rail and Home, and the checks
 * recorded on a problem's case that Analysis shows. The Problems pages were
 * removed from Maintenance; nothing here writes.
 */
import type { CaseDetail, CaseSummary, ConditionStrip } from "@backend/services/case-service";

export type { CaseDetail, CaseSummary, ConditionStrip };

export interface CaseList {
  cases: CaseSummary[];
  counts: { open: number; waiting: number; maintenance: number; verifying: number; closed: number };
}

const qs = (o: Record<string, string | number | null | undefined>) => {
  const p = Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== "");
  return p.length ? `?${p.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&")}` : "";
};

/** URLs for `useApi`. */
export const casesUrl = (f: { plantId?: string | null; machineId?: string | null; ruleCode?: string | null } = {}) => `/api/cases${qs(f)}`;
export const caseUrl = (id: number) => `/api/cases/${id}`;
export const conditionUrl = (f: { plantId?: string | null; machineId?: string | null } = {}) => `/api/cases/condition${qs(f)}`;
