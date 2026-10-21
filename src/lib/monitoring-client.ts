"use client";

/**
 * Browser side of the server monitoring records: findings, acknowledgements,
 * investigation entries, machine events and reference sets. Everything here is
 * read from or written to the database through /api; nothing is derived in the
 * browser. Lists refresh with the calm display cadence (DISPLAY_MS) and at once
 * after the operator's own writes.
 */
import { invalidateApi, useApi } from "@/lib/api-cache";
import { DISPLAY_MS } from "@/providers/kiln-simulation-context";
import type { FindingDto, MachineEventDto, MeasurementDto, ReferenceSetDto } from "@shared/types/monitoring";

type Envelope<T> = { data?: T; error?: { code: string; message: string } };

async function send<T>(url: string, method: "POST" | "PATCH", body: unknown): Promise<T> {
  const res = await fetch(url, { method, body: JSON.stringify(body ?? {}), headers: { "content-type": "application/json" } });
  const env = (await res.json().catch(() => ({}))) as Envelope<T>;
  if (!res.ok || env.data === undefined) throw new Error(env.error?.message ?? `Request failed (${res.status})`);
  return env.data;
}

const enc = encodeURIComponent;

/* ------------------------------- Findings ------------------------------- */

export type FindingScope = "open" | "all";
export const findingsUrl = (machineId: string, scope: FindingScope) => `/api/findings?machineId=${enc(machineId)}&status=${scope}&limit=200`;

export function useFindings(machineId: string | null, scope: FindingScope) {
  return useApi<FindingDto[]>(machineId ? findingsUrl(machineId, scope) : null, { refreshMs: DISPLAY_MS });
}

/** Records that the finding was seen. It resolves nothing: the finding stays open until the evaluation clears it. */
export async function acknowledgeFinding(id: number, note?: string | null): Promise<FindingDto> {
  const f = await send<FindingDto>(`/api/findings/${id}/acknowledge`, "POST", { note: note ?? undefined });
  invalidateApi("/api/findings");
  return f;
}

export const ENTRY_KINDS = ["observation", "inspection", "confirmed_cause", "corrective_action", "verification", "note"] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];
export const ENTRY_LABEL: Record<EntryKind, string> = {
  observation: "Observation",
  inspection: "Inspection",
  confirmed_cause: "Confirmed cause",
  corrective_action: "Corrective action",
  verification: "Verification",
  note: "Note",
};
export const entryLabel = (kind: string) => ENTRY_LABEL[kind as EntryKind] ?? kind;

export async function addInvestigationEntry(id: number, input: { kind: EntryKind; body: string; suspected?: boolean; workOrderId?: number | null }): Promise<FindingDto> {
  const f = await send<FindingDto>(`/api/findings/${id}/entries`, "POST", input);
  invalidateApi("/api/findings");
  invalidateApi("/api/machines/");
  return f;
}

export const CAUSE_LABEL: Record<FindingDto["causeStatus"], string> = {
  not_established: "Not established",
  suspected: "Suspected",
  confirmed: "Confirmed",
};

export const ASSESSMENT_LABEL: Record<FindingDto["dataAssessment"], string> = {
  valid: "Valid",
  stale: "Stale",
  missing: "No data",
  unreliable: "Invalid",
};

/* -------------------------------- Events -------------------------------- */

export const eventsUrl = (machineId: string) => `/api/machines/${enc(machineId)}/events?limit=200`;

export function useMachineEvents(machineId: string | null) {
  return useApi<MachineEventDto[]>(machineId ? eventsUrl(machineId) : null, { refreshMs: DISPLAY_MS });
}

/* ------------------------------ References ------------------------------ */

export interface OperatingStatesDto {
  states: Array<{ id: number; code: string; name: string; running: boolean; priority: number; description: string | null; criteria: Array<{ measurementId: string; tag: string; min: number | null; max: number | null }> }>;
  periods: Array<{ stateId: number; startedAt: string; endedAt: string | null }>;
}

export const referencesUrl = (machineId: string) => `/api/machines/${enc(machineId)}/references`;

export function useReferenceSets(machineId: string | null) {
  return useApi<ReferenceSetDto[]>(machineId ? referencesUrl(machineId) : null);
}

export function useOperatingStates(machineId: string | null) {
  return useApi<OperatingStatesDto>(machineId ? `/api/machines/${enc(machineId)}/operating-states` : null);
}

export function useMeasurements(machineId: string | null) {
  return useApi<MeasurementDto[]>(machineId ? `/api/measurements?machineId=${enc(machineId)}` : null);
}

/** Builds a draft from stored readings in the window. A draft is never used until it is accepted. */
export async function deriveReference(machineId: string, input: { stateId: number; from: string; to: string; name?: string }): Promise<ReferenceSetDto> {
  const set = await send<ReferenceSetDto>(referencesUrl(machineId), "POST", input);
  invalidateApi(referencesUrl(machineId));
  return set;
}

export async function reviewReference(machineId: string, setId: number, status: "accepted" | "retired"): Promise<ReferenceSetDto> {
  const set = await send<ReferenceSetDto>(`/api/references/${setId}`, "PATCH", { status });
  invalidateApi(referencesUrl(machineId));
  invalidateApi("/api/measurements");
  return set;
}

/* ------------------------------ Formatting ------------------------------ */

/** A stored number at a precision that suits its size; null stays "—". */
export function fmtNumber(v: number | null | undefined, decimals?: number): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  if (decimals !== undefined) return v.toFixed(decimals);
  const a = Math.abs(v);
  return v.toFixed(a >= 1000 ? 0 : a >= 100 ? 1 : a >= 1 ? 2 : 3);
}
