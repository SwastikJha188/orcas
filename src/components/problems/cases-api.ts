"use client";

/**
 * Client side of problem cases (backend/src/services/case-service.ts,
 * /api/cases/...): types, URLs and the calls the Problems pages make. Every
 * write returns the updated case (or a small result) and refreshes the cached
 * reads, so pages using `useApi` show the change at once.
 */
import { revalidateApi } from "@/lib/api-cache";
import type {
  CaseDetail,
  CaseRequest,
  CaseSummary,
  ConditionStrip,
  Guide,
  ManualAlarm,
} from "@backend/services/case-service";

export type { CaseDetail, CaseRequest, CaseSummary, ConditionStrip, Guide, ManualAlarm };
export type { CaseCause, CaseCheck, CaseReading, CaseStage, CasePriority, RunningMode, Assessment, CheckKind, CheckResult, WorkType } from "@backend/services/case-service";

export interface CaseList {
  cases: CaseSummary[];
  counts: { open: number; waiting: number; maintenance: number; verifying: number; closed: number };
}

export interface Choice {
  value: string;
  label: string;
}
export interface CaseVocabulary {
  stages: Choice[];
  priorities: Choice[];
  modes: Choice[];
  assessments: Choice[];
  checks: Choice[];
  results: Choice[];
  works: Choice[];
}

const qs = (o: Record<string, string | number | null | undefined>) => {
  const p = Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== "");
  return p.length ? `?${p.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&")}` : "";
};

/** URLs for `useApi`. */
export const casesUrl = (f: { plantId?: string | null; machineId?: string | null; ruleCode?: string | null } = {}) => `/api/cases${qs(f)}`;
export const caseUrl = (id: number) => `/api/cases/${id}`;
export const guidesUrl = (f: { plantId?: string | null; machineId?: string | null } = {}) => `/api/cases/guides${qs(f)}`;
export const requestsUrl = (f: { plantId?: string | null } = {}) => `/api/cases/requests${qs(f)}`;
export const conditionUrl = (f: { plantId?: string | null; machineId?: string | null } = {}) => `/api/cases/condition${qs(f)}`;
export const VOCABULARY_URL = "/api/cases/vocabulary";
export const fileUrl = (caseId: number, fileId: number) => `/api/cases/${caseId}/files${qs({ fileId })}`;
export const exportUrl = (caseId: number) => `/api/cases/${caseId}/export`;

/** Refreshes every cached case read (lists, the case, guides, requests, condition). */
async function refresh(caseId?: number): Promise<void> {
  const urls = new Set<string>();
  if (typeof window !== "undefined") {
    // api-cache keys are the URLs; revalidate the ones this module owns.
    for (const u of [caseId ? caseUrl(caseId) : null]) if (u) urls.add(u);
  }
  await Promise.all([...urls].map((u) => revalidateApi(u)));
  window.dispatchEvent(new CustomEvent(CASES_CHANGED_EVENT, { detail: { caseId } }));
}

/** Fired after any change, so lists and popups re-read. */
export const CASES_CHANGED_EVENT = "ultron:cases-changed";

export class CaseApiError extends Error {}

async function send<T>(method: string, url: string, body?: unknown, form?: FormData): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: form ? undefined : { "content-type": "application/json" },
    body: form ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const json = (await res.json().catch(() => null)) as { data?: T; error?: { message?: string } } | null;
  if (!res.ok || !json || json.data === undefined) throw new CaseApiError(json?.error?.message ?? `Could not save (${res.status}). Try again.`);
  return json.data;
}

export const casesApi = {
  async create(input: {
    machineId: string;
    partId?: string | null;
    title: string;
    observation: string;
    ownerUserId?: string | null;
    priority?: string;
    runningMode?: string;
    runningNote?: string | null;
    ruleCode?: string | null;
    guideId?: string | null;
    measurementIds?: string[];
  }): Promise<number> {
    const r = await send<{ id: number }>("POST", "/api/cases", input);
    await refresh(r.id);
    return r.id;
  },
  async update(id: number, patch: Record<string, unknown>): Promise<CaseDetail> {
    const r = await send<CaseDetail>("PATCH", caseUrl(id), patch);
    await refresh(id);
    return r;
  },
  async addCause(id: number, text: string): Promise<CaseDetail> {
    const r = await send<CaseDetail>("POST", `${caseUrl(id)}/causes`, { text });
    await refresh(id);
    return r;
  },
  async removeCause(id: number, causeId: number): Promise<CaseDetail> {
    const r = await send<CaseDetail>("DELETE", `${caseUrl(id)}/causes${qs({ causeId })}`);
    await refresh(id);
    return r;
  },
  async addCheck(id: number, input: { kind: string; detail: string; causeId?: number | null; assigneeUserId?: string | null; assigneeText?: string | null }): Promise<CaseDetail> {
    const r = await send<CaseDetail>("POST", `${caseUrl(id)}/checks`, input);
    await refresh(id);
    return r;
  },
  async finishCheck(id: number, checkId: number, input: { result: string; note: string } | { cancel: true }): Promise<CaseDetail> {
    const r = await send<CaseDetail>("PATCH", `${caseUrl(id)}/checks`, { checkId, ...input });
    await refresh(id);
    return r;
  },
  async addRequest(id: number, input: { workType: string; team: string; scope: string; acceptance: string; window?: string | null; resources?: string | null }): Promise<CaseDetail> {
    const r = await send<CaseDetail>("POST", `${caseUrl(id)}/requests`, input);
    await refresh(id);
    return r;
  },
  async action(id: number, action: "verify" | "close" | "reopen", note?: string): Promise<CaseDetail> {
    const r = await send<CaseDetail>("POST", `${caseUrl(id)}/actions`, { action, note });
    await refresh(id);
    return r;
  },
  async addFile(id: number, file: File): Promise<CaseDetail> {
    const form = new FormData();
    form.append("file", file);
    const r = await send<CaseDetail>("POST", `${caseUrl(id)}/files`, undefined, form);
    await refresh(id);
    return r;
  },
  async removeFile(id: number, fileId: number): Promise<CaseDetail> {
    const r = await send<CaseDetail>("DELETE", fileUrl(id, fileId));
    await refresh(id);
    return r;
  },
  async importSeries(id: number, input: { name: string; unit: string; csv: string }): Promise<CaseDetail> {
    const r = await send<CaseDetail>("POST", `${caseUrl(id)}/series`, input);
    await refresh(id);
    return r;
  },
  async recordAlarm(input: { machineId: string; caseId?: number | null; title: string; severity: "alert" | "critical"; location: string; observedValue?: string; limitText?: string; observedAt: string; source: string }): Promise<void> {
    await send("POST", "/api/cases/alarms", input);
    await refresh(input.caseId ?? undefined);
  },
  async acknowledge(kind: "system" | "manual", id: number): Promise<void> {
    await send("POST", "/api/cases/condition", { kind, id });
    await refresh();
  },
};

/* ------------------------------------------------------------------ */
/* Opening a case from another page                                    */
/* ------------------------------------------------------------------ */

/** sessionStorage key: the case Maintenance › Problems opens on its next mount. */
export const OPEN_CASE_KEY = "ultron.problems.open-case";

/** Opens a case in Maintenance › Problems (pass the context's `setActiveTab`). */
export function openCase(id: number, setActiveTab: (tab: "maintenance") => void): void {
  try {
    sessionStorage.setItem(OPEN_CASE_KEY, String(id));
    localStorage.setItem("ultron.maint.page", "problems");
  } catch {
    /* storage unavailable: the Problems list still shows it */
  }
  window.dispatchEvent(new CustomEvent(OPEN_CASE_EVENT, { detail: { id } }));
  setActiveTab("maintenance");
}

/** Fired by `openCase` so an already mounted Maintenance workspace switches to the case. */
export const OPEN_CASE_EVENT = "ultron:open-case";

/** Reads (and clears) the case to open. */
export function takeCaseToOpen(): number | null {
  try {
    const v = sessionStorage.getItem(OPEN_CASE_KEY);
    sessionStorage.removeItem(OPEN_CASE_KEY);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

/** Plain-words tone of a stage, for status chips. */
export const STAGE_TONE: Record<string, "good" | "warn" | "bad" | "idle" | "info"> = {
  new: "warn",
  investigating: "warn",
  waiting: "info",
  maintenance: "info",
  verifying: "info",
  closed: "good",
};

/** Bytes in plain words. */
export const sizeWord = (n: number) => (n < 1024 ? `${n} bytes` : n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
