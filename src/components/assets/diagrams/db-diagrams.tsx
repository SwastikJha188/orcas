/**
 * Drawings kept as data in the DB (`diagrams`, made by the diagram skills and
 * saved by scripts/diagram-lab/export.mjs or onboarding), loaded on demand per
 * drawing kind and cached for the session. Lookups stay synchronous
 * (`dbSheet` / `dbModel`); a component that draws one calls
 * `useDbDiagram(kind, diagramType)` so it re-renders once the data arrives.
 * Code-registered drawings (./index.ts, ../pyro) always win.
 */
import { useEffect, useSyncExternalStore } from "react";
import type { LineSheetArt } from "@/components/assets/pyro/line-sheets/types";
import type { KitModel } from "@/components/home/twin/models/kit-model";
import { isKitModelData, kitModelFromData } from "@/components/home/twin/models/kit-model-data";

interface SheetData {
  format: "ultron.sheet2d/1";
  id: string;
  width: number;
  height: number;
  svg: string;
  pads: Record<string, [number, number]>;
  callouts?: LineSheetArt["callouts"];
  chips?: LineSheetArt["chips"];
}

type Kind = "2d" | "3d";
const sheets = new Map<string, LineSheetArt | null>();
const models = new Map<string, KitModel | null>();
const inflight = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;

const bump = () => {
  version++;
  for (const l of listeners) l();
};

function sheetFrom(d: SheetData): LineSheetArt {
  const html = { __html: d.svg };
  function Art() {
    return <g dangerouslySetInnerHTML={html} />;
  }
  return { id: d.id, width: d.width, height: d.height, Art, pads: d.pads ?? {}, callouts: d.callouts, chips: d.chips, ready: true };
}

/** Loads one stored drawing (once per session); `known` skips kinds drawn by code. */
export function requestDiagram(kind: Kind, diagramType: string | null | undefined) {
  if (!diagramType || typeof window === "undefined") return;
  const key = `${diagramType}:${kind}`;
  const cache = kind === "2d" ? sheets : models;
  if (cache.has(diagramType) || inflight.has(key)) return;
  inflight.add(key);
  fetch(`/api/diagrams?type=${encodeURIComponent(diagramType)}&kind=${kind}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((body: { data?: { data?: unknown } } | null) => {
      const data = body?.data?.data;
      if (kind === "2d") sheets.set(diagramType, data && (data as SheetData).format === "ultron.sheet2d/1" ? sheetFrom(data as SheetData) : null);
      else models.set(diagramType, isKitModelData(data) ? kitModelFromData(data) : null);
    })
    .catch(() => (kind === "2d" ? sheets : models).set(diagramType, null))
    .finally(() => {
      inflight.delete(key);
      bump();
    });
}

/** True once the stored drawing of this kind and dimension has been asked for and answered (found or not). */
export const dbFetched = (kind: Kind, diagramType: string | null | undefined): boolean => Boolean(diagramType && (kind === "2d" ? sheets : models).has(diagramType));

/** The stored 2D sheet of a drawing kind, once loaded. */
export const dbSheet = (diagramType: string | null | undefined): LineSheetArt | null => (diagramType && sheets.get(diagramType)) || null;
/** The stored 3D model of a drawing kind, once loaded. */
export const dbModel = (diagramType: string | null | undefined): KitModel | null => (diagramType && models.get(diagramType)) || null;

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Asks for a stored drawing and re-renders the caller when it (or any other) arrives. */
export function useDbDiagram(kind: Kind, diagramType: string | null | undefined, skip = false): number {
  const v = useSyncExternalStore(subscribe, () => version, () => 0);
  useEffect(() => {
    if (!skip) requestDiagram(kind, diagramType);
  }, [kind, diagramType, skip]);
  return v;
}

/** Forget cached drawings (after saving a new one in this session). */
export function resetDbDiagrams() {
  sheets.clear();
  models.clear();
  bump();
}

export type { SheetData };
