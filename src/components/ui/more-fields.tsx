"use client";

import React, { useId } from "react";
import "./form.css";

/**
 * Optional fields behind one labelled toggle (progressive disclosure). The caller owns
 * `open`, so it can open the group itself when a hidden field has an error or a value
 * that is not the default.
 */
export function MoreFields({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: (open: boolean) => void; children: React.ReactNode }) {
  const id = useId();
  return (
    <div className="ui-more">
      <button type="button" className="ui-more-btn" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => onToggle(!open)}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 6 15 12 9 18" />
        </svg>
        {label}
      </button>
      {open && (
        <div id={id} className="ui-more-body">
          {children}
        </div>
      )}
    </div>
  );
}
