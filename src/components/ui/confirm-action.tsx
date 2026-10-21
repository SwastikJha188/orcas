"use client";

import React, { useEffect, useState } from "react";
import { PillButton } from "./pill-button";
import "./form.css";

export interface ConfirmActionProps {
  /** Trigger text, e.g. "Delete plant". */
  label: string;
  /** Asked in place once the trigger is pressed, e.g. "Delete this plant and its 6 machines?". */
  question: string;
  /** Text of the button that carries the action out. */
  confirmLabel?: string;
  /** Text of the button that backs out. */
  keepLabel?: string;
  onConfirm: () => void;
  disabled?: boolean;
  /** The action is running: the confirm button shows a spinner. */
  busy?: boolean;
  /** "danger" for destructive actions (default); "secondary" for undoable ones such as cancelling a check;
   *  "primary" when the confirmed action is the page's main step (e.g. "Create the plant"). */
  tone?: "danger" | "secondary" | "primary";
  /** Accessible name of the trigger when its text alone is ambiguous (e.g. "Remove report.pdf"). */
  ariaLabel?: string;
  /** Seconds before an unanswered question folds back to the trigger. */
  timeoutS?: number;
}

/**
 * The one two-step confirmation in ULTRON: the trigger turns into "question · Keep · Confirm"
 * in the same place, with Keep focused so Enter backs out. Used for every delete, remove and
 * cancel that cannot be undone, instead of a modal or a one-click action.
 */
export function ConfirmAction({
  label,
  question,
  confirmLabel = "Delete",
  keepLabel = "Keep",
  onConfirm,
  disabled,
  busy = false,
  tone = "danger",
  timeoutS = 8,
  ariaLabel,
}: ConfirmActionProps) {
  const [asking, setAsking] = useState(false);
  useEffect(() => {
    if (!asking || busy) return;
    const t = window.setTimeout(() => setAsking(false), timeoutS * 1000);
    return () => window.clearTimeout(t);
  }, [asking, busy, timeoutS]);

  if (!asking && !busy) {
    return (
      <PillButton variant={tone} disabled={disabled} aria-label={ariaLabel} onClick={() => setAsking(true)}>
        {label}
      </PillButton>
    );
  }
  return (
    <span className="ui-confirm" role="group" aria-label={question}>
      <span className="ui-confirm-q" data-tone={tone}>
        {question}
      </span>
      <PillButton variant="secondary" autoFocus disabled={busy} onClick={() => setAsking(false)}>
        {keepLabel}
      </PillButton>
      <PillButton
        variant={tone}
        disabled={disabled}
        loading={busy}
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </PillButton>
    </span>
  );
}
