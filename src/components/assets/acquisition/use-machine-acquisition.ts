"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { MachineAcquisition } from "@shared/types/edge";

/* ==========================================================================
   A machine's acquisition chain (gateway → source → card → channel) with the
   live MQTT reading of every mapped point, polled from
   GET /api/edge/machines/<id>.

   One module-level store per machine: every component that calls the hook
   for the same machine shares one poll loop and one history. Polling runs
   only while someone is subscribed and the tab is visible.
   ========================================================================== */

/** Samples kept per point for sparklines (one per new `updatedAt`). */
export const HISTORY_LEN = 60;
const POLL_MS = 2000;
/** A machine with nothing mapped is re-checked slowly, so new mappings still appear. */
const IDLE_POLL_MS = 15000;

export interface MachineAcquisitionState {
  data: MachineAcquisition | null;
  /** pointId → numeric values, oldest first. */
  history: Record<string, number[]>;
  loading: boolean;
  error: string | null;
}

interface Entry {
  state: MachineAcquisitionState;
  lastAt: Map<string, string>;
  listeners: Set<() => void>;
  timer: ReturnType<typeof setTimeout> | null;
  inflight: boolean;
}

const EMPTY: MachineAcquisitionState = { data: null, history: {}, loading: false, error: null };
const store = new Map<string, Entry>();

function entryFor(machineId: string): Entry {
  let e = store.get(machineId);
  if (!e) {
    e = { state: { ...EMPTY, loading: true }, lastAt: new Map(), listeners: new Set(), timer: null, inflight: false };
    store.set(machineId, e);
  }
  return e;
}

function emit(e: Entry, next: Partial<MachineAcquisitionState>) {
  e.state = { ...e.state, ...next };
  e.listeners.forEach((l) => l());
}

function schedule(machineId: string, e: Entry) {
  if (e.timer) clearTimeout(e.timer);
  e.timer = null;
  if (e.listeners.size === 0 || (typeof document !== "undefined" && document.hidden)) return;
  const idle = e.state.data !== null && e.state.data.points.length === 0;
  e.timer = setTimeout(() => void poll(machineId), idle ? IDLE_POLL_MS : POLL_MS);
}

async function poll(machineId: string) {
  const e = entryFor(machineId);
  if (e.inflight) return;
  e.inflight = true;
  try {
    const res = await fetch(`/api/edge/machines/${encodeURIComponent(machineId)}`, { cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.data) {
      emit(e, { loading: false, error: body?.error?.message ?? `Could not load the live readings (server error ${res.status})` });
    } else {
      const data = body.data as MachineAcquisition;
      let history = e.state.history;
      let changed = false;
      for (const p of data.points) {
        const at = p.live.updatedAt;
        if (!at || p.live.value === null || e.lastAt.get(p.pointId) === at) continue;
        if (!changed) {
          history = { ...history };
          changed = true;
        }
        e.lastAt.set(p.pointId, at);
        const prev = history[p.pointId] ?? [];
        history[p.pointId] = [...prev.slice(-(HISTORY_LEN - 1)), p.live.value];
      }
      emit(e, { data, history, loading: false, error: null });
    }
  } catch (err) {
    emit(e, { loading: false, error: err instanceof Error ? err.message : "Could not reach the server" });
  } finally {
    e.inflight = false;
    schedule(machineId, e);
  }
}

let visibilityBound = false;
function bindVisibility() {
  if (visibilityBound || typeof document === "undefined") return;
  visibilityBound = true;
  document.addEventListener("visibilitychange", () => {
    for (const [id, e] of store) {
      if (e.listeners.size === 0) continue;
      if (document.hidden) {
        if (e.timer) clearTimeout(e.timer);
        e.timer = null;
      } else {
        void poll(id);
      }
    }
  });
}

function subscribe(machineId: string, listener: () => void): () => void {
  const e = entryFor(machineId);
  e.listeners.add(listener);
  bindVisibility();
  if (e.listeners.size === 1 && !e.inflight) void poll(machineId);
  return () => {
    e.listeners.delete(listener);
    if (e.listeners.size === 0 && e.timer) {
      clearTimeout(e.timer);
      e.timer = null;
    }
  };
}

const noop = () => () => {};
const getEmpty = () => EMPTY;

/**
 * Live acquisition chain of one machine. Pass `null` to skip (no request).
 * The cached snapshot survives remounts, so switching tabs does not blank it.
 */
export function useMachineAcquisition(machineId: string | null | undefined): MachineAcquisitionState {
  // Stable per machine: a new subscribe function would re-subscribe (and re-poll) every render.
  const sub = useCallback((l: () => void) => (machineId ? subscribe(machineId, l) : noop()), [machineId]);
  const get = useCallback(() => (machineId ? entryFor(machineId).state : EMPTY), [machineId]);
  return useSyncExternalStore(sub, get, getEmpty);
}
