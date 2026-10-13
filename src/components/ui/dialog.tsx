"use client";

import React, { useEffect, useId, useRef } from "react";
import "./form.css";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** One line under the title: what is being edited. */
  subtitle?: string;
  children: React.ReactNode;
  /** Buttons, right aligned. */
  footer?: React.ReactNode;
  /** Shown left of the footer buttons (a destructive action, a test result). */
  footerStart?: React.ReactNode;
  width?: number;
  /** Wraps the body in a form; Enter submits. */
  onSubmit?: () => void;
  /** Blocks closing while a request is in flight. */
  busy?: boolean;
}

/**
 * Modal on the native <dialog>: the browser owns focus trapping, Esc and the
 * top layer. Glass surface (cheap CSS tier) over a dimmed workspace.
 */
export function Dialog({ open, onClose, title, subtitle, children, footer, footerStart, width = 560, onSubmit, busy = false }: DialogProps) {
  const ref = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const body = (
    <>
      <header className="ui-dialog-head">
        <div className="ui-dialog-titles">
          <h2 id={titleId} className="ui-dialog-title">
            {title}
          </h2>
          {subtitle && <p className="ui-dialog-sub">{subtitle}</p>}
        </div>
        <button type="button" className="ui-dialog-close" aria-label="Close" onClick={onClose} disabled={busy}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>
      <div className="ui-dialog-body">{children}</div>
      {(footer || footerStart) && (
        <footer className="ui-dialog-foot">
          <div className="ui-dialog-foot-start">{footerStart}</div>
          <div className="ui-dialog-foot-end">{footer}</div>
        </footer>
      )}
    </>
  );

  return (
    <dialog
      ref={ref}
      className="ui-dialog liquid-glass"
      aria-labelledby={titleId}
      style={{ width: `min(${width}px, calc(100vw - 32px))` }}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(e) => {
        // A click on the backdrop lands on the <dialog> itself.
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      {open &&
        (onSubmit ? (
          <form
            className="ui-dialog-inner"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!busy) onSubmit();
            }}
          >
            {body}
          </form>
        ) : (
          <div className="ui-dialog-inner">{body}</div>
        ))}
    </dialog>
  );
}
