"use client";

/**
 * Open the Trends page focused on one sensor, without a shared context field.
 *
 *   requestTrendsFocus(tag, machineId);
 *   navigateToMachine(machineId, "trends");   // or setActiveSubPage("trends")
 *
 * Or, without importing this module: write the tag to sessionStorage
 * `ultron.trends.focus` and open "trends"; the key is read once and removed.
 *
 * Deep links work too: `?tab=assets&machine=KLN-01&page=trends&sensor=TT-SHL-01`.
 * The URL is read once when this module is first evaluated (before the
 * navigation provider rewrites the query string), and Trends keeps the
 * `sensor` parameter in sync with its focus so the link stays shareable.
 */

interface PendingFocus {
  tag: string;
  machineId: string | null;
}

let pending: PendingFocus | null = null;

if (typeof window !== "undefined") {
  try {
    const p = new URLSearchParams(window.location.search);
    const tag = p.get("sensor");
    if (tag && p.get("page") === "trends") pending = { tag, machineId: p.get("machine") };
  } catch {
    /* no URL access */
  }
}

/** Ask the next Trends render to focus `tag` (optionally only for `machineId`). */
export function requestTrendsFocus(tag: string, machineId?: string): void {
  pending = { tag, machineId: machineId ?? null };
}

/** Cross-page contract: other pages write a sensor tag here, then open the "trends" sub-page. */
export const TRENDS_FOCUS_KEY = "ultron.trends.focus";

function storedFocus(): string | null {
  try {
    return window.sessionStorage.getItem(TRENDS_FOCUS_KEY);
  } catch {
    return null;
  }
}

/** The pending focus tag for `machineId`, without consuming it (safe in render). */
export function peekTrendsFocus(machineId: string): string | null {
  const stored = typeof window === "undefined" ? null : storedFocus();
  if (stored) return stored;
  if (!pending) return null;
  return pending.machineId === null || pending.machineId === machineId ? pending.tag : null;
}

/** Drop the pending focus once Trends has applied it. */
export function clearTrendsFocus(): void {
  pending = null;
  try {
    window.sessionStorage.removeItem(TRENDS_FOCUS_KEY);
  } catch {
    /* storage unavailable */
  }
}

/** Mirror the focused sensor into the address bar while Trends is the open page. */
export function syncTrendsFocusUrl(machineId: string, tag: string | null): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    const p = url.searchParams;
    if (p.get("page") !== "trends" || p.get("machine") !== machineId) return;
    if (tag) p.set("sensor", tag);
    else p.delete("sensor");
    const next = `${url.pathname}?${p.toString()}${url.hash}`;
    if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState(window.history.state, "", next);
    }
  } catch {
    /* history unavailable */
  }
}
