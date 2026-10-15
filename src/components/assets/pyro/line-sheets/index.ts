/**
 * Pyro-line diagram pack (Rev01, 37 sheets): register, drawings and lookups.
 * PYR-0 line overview; per group an overview (X-0) and its detail sheets.
 */
import { LINE_SHEETS, LINE_SHEET_GROUPS } from "./sheet-data";
import { LINE_SHEET_ART } from "./art";
import type { LineSheetArt, LineSheetGroup, LineSheetMeta, LineSheetPoint } from "./types";

export type { LineSheetArt, LineSheetGroup, LineSheetMeta, LineSheetPoint };
export { LINE_SHEETS, LINE_SHEET_GROUPS, LINE_SHEET_ART };

export const LINE_SHEET_BY_ID: Record<string, LineSheetMeta> = Object.fromEntries(LINE_SHEETS.map((s) => [s.id, s]));

/** Detail sheet and point entry of every tag ("TMP-KLN-20" → K-2). */
export const LINE_SHEET_OF_TAG: Record<string, { sheet: string; point: LineSheetPoint }> = Object.fromEntries(
  LINE_SHEETS.flatMap((s) => (s.points ?? []).map((p) => [p.tag, { sheet: s.id, point: p }])),
);

/** Every point drawn on a sheet: a detail sheet's own points; an overview carries all points of its parts. */
export function lineSheetTags(id: string): string[] {
  const s = LINE_SHEET_BY_ID[id];
  if (!s) return [];
  if (s.kind === "overview") return (s.parts ?? []).flatMap((p) => LINE_SHEET_BY_ID[p]?.points?.map((x) => x.tag) ?? []);
  return s.points?.map((p) => p.tag) ?? [];
}

/** The group sheets for a machine (overview first, then the detail sheets), e.g. PYR-KLN-01 → K-0 … K-9. */
export function lineSheetsForMachine(machineId: string): LineSheetMeta[] {
  const group = LINE_SHEETS.find((s) => s.kind === "overview" && s.machines.includes(machineId))?.group;
  return group ? LINE_SHEETS.filter((s) => s.group === group) : [];
}

/**
 * Detail sheets holding a component's points, most points first (a component
 * spanning two sheets, e.g. dosing gate + flow meter, gets both).
 */
export function lineSheetsForTags(tags: string[]): string[] {
  const n = new Map<string, number>();
  for (const t of tags) {
    const s = LINE_SHEET_OF_TAG[t]?.sheet;
    if (s) n.set(s, (n.get(s) ?? 0) + 1);
  }
  return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([s]) => s);
}

/** Session key a page sets before opening a machine's Overview on a given sheet. */
export const LINE_SHEET_FOCUS_KEY = "ultron.overview.sheet";
