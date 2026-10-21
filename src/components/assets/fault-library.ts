"use client";

/**
 * Client side of the pyro-line fault library (OSW-PE-FLT-PYR-01 Rev. 01,
 * /api/fault-library): the library sheets a rule implements and the sheets a
 * sensor is evidence for. Machines without a library get an empty result.
 */
import { useApi } from "@/lib/api-cache";
import { plainWords } from "@/lib/plain-words";
import type { FaultEntry, FaultLibrary } from "@backend/services/fault-library-service";

export type { FaultEntry, FaultLibrary };

export const faultLibraryUrl = (machineId: string) => `/api/fault-library?machineId=${encodeURIComponent(machineId)}`;

export function useFaultLibrary(machineId: string | null | undefined): FaultLibrary | null {
  const { data } = useApi<FaultLibrary>(machineId ? faultLibraryUrl(machineId) : null);
  return data ?? null;
}

/** Library sheets a rule implements, main sheet first. */
export function faultsForRule(lib: FaultLibrary | null, ruleId: string): FaultEntry[] {
  if (!lib) return [];
  const ids = lib.rules[ruleId] ?? [];
  return ids.map((id) => lib.faults.find((f) => f.id === id)).filter((f): f is FaultEntry => Boolean(f));
}

/** Library sheets that read a sensor: as their main evidence, or in support. */
export function faultsForTag(lib: FaultLibrary | null, tag: string): { primary: FaultEntry[]; support: FaultEntry[] } {
  const primary: FaultEntry[] = [];
  const support: FaultEntry[] = [];
  for (const f of lib?.faults ?? []) {
    const hit = f.inputs.find((i) => i.tag === tag);
    if (hit) (hit.role === "primary" ? primary : support).push(f);
  }
  return { primary, support };
}

/** A library text in everyday words: abbreviations spelled out, first letter capital, no trailing full stop. */
export function libraryText(text: string | null | undefined): string | null {
  if (!text) return null;
  const t = plainWords(text.trim()).replace(/\.$/, "");
  return t ? t[0].toUpperCase() + t.slice(1) : null;
}

/** Distinct, non-empty texts in order (several sheets often share a check or an alternative). */
export function distinctTexts(values: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  for (const v of values) {
    const t = libraryText(v);
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}
