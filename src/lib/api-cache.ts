"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

/* ==========================================================================
   Shared client cache for GET /api/* reads (stale-while-revalidate).
   The database is a network round trip away, so a page that remounts (tab
   switch, back navigation) shows the last response at once and refreshes it
   in the background. Concurrent readers of one URL share a single request.
   ========================================================================== */

type Entry = {
  /** True once a response body with `data` has arrived. */
  has: boolean;
  data: unknown;
  /** Last failure; only surfaced while there is no data to show. */
  error: string | null;
  at: number;
};

/** Mounts within this window reuse the cached body without refetching. */
const FRESH_MS = 10_000;

const entries = new Map<string, Entry>();
const inflight = new Map<string, Promise<void>>();
const listeners = new Map<string, Set<() => void>>();

function set(url: string, next: Entry) {
  entries.set(url, next);
  listeners.get(url)?.forEach((l) => l());
}

/** Fetches `url` (deduped) and stores its `{ data }` body or error. */
export function revalidateApi(url: string): Promise<void> {
  const running = inflight.get(url);
  if (running) return running;
  const p = (async () => {
    const prev = entries.get(url);
    try {
      const r = await fetch(url);
      const j = await r.json().catch(() => null);
      if (!r.ok || !j || !("data" in j)) throw new Error(j?.error?.message ?? `HTTP ${r.status}`);
      set(url, { has: true, data: j.data, error: null, at: Date.now() });
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      set(url, { has: prev?.has ?? false, data: prev?.data, error, at: Date.now() });
    } finally {
      inflight.delete(url);
    }
  })();
  inflight.set(url, p);
  return p;
}

/** Marks matching cached URLs stale and refreshes the ones on screen. */
export function invalidateApi(prefix: string) {
  for (const [url, e] of entries) {
    if (!url.startsWith(prefix)) continue;
    entries.set(url, { ...e, at: 0 });
    if (listeners.get(url)?.size) void revalidateApi(url);
  }
}

export interface ApiState<T> {
  data: T | undefined;
  /** Set only when there is no data (a failed refresh keeps the last good body). */
  error: string | null;
  isLoading: boolean;
}

const EMPTY: ApiState<never> = { data: undefined, error: null, isLoading: true };
const IDLE: ApiState<never> = { data: undefined, error: null, isLoading: false };
const views = new WeakMap<Entry, ApiState<unknown>>();

function view(e: Entry | undefined): ApiState<unknown> {
  if (!e) return EMPTY;
  let v = views.get(e);
  if (!v) {
    v = { data: e.data, error: e.has ? null : e.error, isLoading: false };
    views.set(e, v);
  }
  return v;
}

/**
 * `data` of GET `url`, cached across mounts. Pass `null` to skip.
 * `refreshMs` polls while mounted.
 */
export function useApi<T>(url: string | null, opts?: { refreshMs?: number }): ApiState<T> {
  const subscribe = useCallback(
    (l: () => void) => {
      if (!url) return () => {};
      let ls = listeners.get(url);
      if (!ls) listeners.set(url, (ls = new Set()));
      ls.add(l);
      return () => {
        ls.delete(l);
      };
    },
    [url],
  );
  const get = useCallback(() => (url ? view(entries.get(url)) : IDLE), [url]);
  const state = useSyncExternalStore(subscribe, get, () => (url ? EMPTY : IDLE));

  const refreshMs = opts?.refreshMs;
  useEffect(() => {
    if (!url) return;
    const e = entries.get(url);
    if (!e || Date.now() - e.at > FRESH_MS) void revalidateApi(url);
    if (!refreshMs) return;
    const id = window.setInterval(() => void revalidateApi(url), refreshMs);
    return () => window.clearInterval(id);
  }, [url, refreshMs]);

  return state as ApiState<T>;
}
