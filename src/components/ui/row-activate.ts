import type React from "react";

/**
 * Keyboard + click props for a clickable row (table <tr> or list <div>):
 * focusable, Enter/Space activate, aria-current (plus aria-selected for styling) reflects selection.
 * Keys from nested controls are ignored (target must be the row itself).
 */
export function rowActivate(run: () => void, selected?: boolean) {
  return {
    tabIndex: 0,
    "aria-selected": selected,
    "aria-current": selected ? ("true" as const) : undefined,
    onClick: run,
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        run();
      }
    },
  };
}
