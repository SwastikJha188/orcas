"use client";

import React, { useState } from "react";

/*
 * Progressive disclosure for lists and tables — the one implementation.
 *
 *   useFold(rows, quiet)   rows that need someone show; the quiet rest fold away
 *   <RestLine … />         one line under the list: what the folded rows share,
 *                          with Show them / Hide them
 *
 * Callers keep the row a person picked out of `quiet`, so a selection never folds.
 * Styles: .pg-table-rest and .ui-fold-toggle in page.css (loaded on every page).
 */

export function useFold<T>(rows: T[], quiet: (row: T, index: number) => boolean) {
  const [open, setOpen] = useState(false);
  const isQuiet = rows.map(quiet);
  const rest = isQuiet.filter(Boolean).length;
  const shown = open ? rows : rows.filter((_, i) => !isQuiet[i]);
  return { shown, rest, open, toggle: () => setOpen((v) => !v) };
}

export function RestLine({
  rest,
  shown,
  noun,
  plural = `${noun}s`,
  note,
  open,
  onToggle,
}: {
  /** How many rows fold away. */
  rest: number;
  /** How many rows show while folded (0 → "All 12 parts: …"). */
  shown: number;
  noun: string;
  plural?: string;
  /** What the folded rows share, e.g. "healthy, every sensor in range". */
  note: string;
  open: boolean;
  onToggle: () => void;
}) {
  if (rest <= 0) return null;
  const words = rest === 1 ? noun : plural;
  return (
    <p className="pg-table-rest">
      {open ? `${rest} of these ${words}: ${note}.` : `${shown ? `${rest} other ${words}` : `All ${rest} ${words}`}: ${note}.`}{" "}
      <button type="button" className="ui-fold-toggle" onClick={onToggle} aria-expanded={open}>
        {open ? "Hide them" : "Show them"}
        <svg className="ui-fold-chev" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </p>
  );
}
