"use client";

import React from "react";
import { PillButton, type PillClick } from "./pill-button";
import { RestLine, useFold } from "./fold";

/*
 * Next actions: what to do about what the page shows, most urgent first.
 * Each row names the thing, the facts that call for the action (numbers, not
 * prose), and one verb-first button that does it here or opens the place it is
 * done. Nothing runs on its own: a person clicks. Pages build the list from
 * their own data and hide the section when it is empty.
 * Styles: .ui-next* in page.css.
 */

export type NextTone = "bad" | "warn" | "info";

export interface NextAction {
  key: string;
  /** bad: act now · warn: act soon · info: when convenient. Rows sort by this, then by `rank`. */
  tone: NextTone;
  /** Smaller is more urgent inside one tone (minutes to a limit, priority number). */
  rank?: number;
  /** The thing: "Clinker leaving the cooler is too hot · CLR-01". */
  what: string;
  /** Why this action: the facts, "P1 · limit in 8 min · 98 % sure". */
  why: string;
  /** Verb first: "Raise notification", "Confirm equipment", "Open work order". */
  label: string;
  /** Does the action (promise → spinner, true → tick) or goes where it is done. */
  run: PillClick;
}

const ORDER: Record<NextTone, number> = { bad: 0, warn: 1, info: 2 };

/** Minutes in an estimate like "8m 18s (6m 13s–10m 47s)", "2d 4h" or "3 h"; null when there is no time in it. */
export function minutesIn(text: string | null | undefined): number | null {
  const head = (text ?? "").split("(")[0];
  let min = 0;
  let found = false;
  for (const m of head.matchAll(/(\d+(?:[.,]\d+)?)\s*(y|mo|w|d|h|m|s)[a-z]*\b/gi)) {
    const n = Number(m[1].replace(",", "."));
    const u = m[2].toLowerCase();
    min += u === "y" ? n * 525600 : u === "mo" ? n * 43200 : u === "w" ? n * 10080 : u === "d" ? n * 1440 : u === "h" ? n * 60 : u === "m" ? n : n / 60;
    found = true;
  }
  return found ? min : null;
}

/** The estimate without its range: "8m 18s (6m 13s–10m 47s)" → "8m 18s". */
export const estimateOf = (text: string) => text.replace(/\s*\(.*\)\s*$/, "");

export function sortNextActions(items: NextAction[]): NextAction[] {
  return [...items].sort((a, b) => ORDER[a.tone] - ORDER[b.tone] || (a.rank ?? Infinity) - (b.rank ?? Infinity));
}

/** The ranked list; the first `limit` show, the rest fold into one line. */
export function NextActions({ items, limit = 3, label = "Next actions" }: { items: NextAction[]; limit?: number; label?: string }) {
  const sorted = sortNextActions(items);
  const fold = useFold(sorted, (_, i) => i >= limit);
  if (sorted.length === 0) return null;
  return (
    <>
      <ol className="ui-next" aria-label={label}>
        {fold.shown.map((a, i) => (
          <li key={a.key} className="ui-next-row" data-tone={a.tone}>
            <span className="ui-next-text">
              <span className="ui-next-what">{a.what}</span>
              <span className="ui-next-why">{a.why}</span>
            </span>
            <PillButton variant={i === 0 && a.tone !== "info" ? "primary" : "secondary"} className="ui-next-btn" onClick={a.run}>
              {a.label}
            </PillButton>
          </li>
        ))}
      </ol>
      <RestLine rest={fold.rest} shown={fold.shown.length} noun="action" note="ranked after these" open={fold.open} onToggle={fold.toggle} />
    </>
  );
}
