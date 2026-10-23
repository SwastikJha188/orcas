"use client";

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
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
  /** Unsaved input: a stray backdrop click is ignored and Esc / × ask before discarding. */
  dirty?: boolean;
  /** Full-height sheet on the right edge instead of a centred box: a row's details over its list. */
  side?: boolean;
  /** Breadcrumbs above the title (see Crumbs): where this sheet sits in the page. */
  crumbs?: React.ReactNode;
}

/**
 * Modal on the native <dialog>: the browser owns focus trapping, Esc and the
 * top layer. Glass surface (cheap CSS tier) over a dimmed workspace.
 */
export function Dialog({ open, onClose, title, subtitle, children, footer, footerStart, width = 560, onSubmit, busy = false, dirty = false, side = false, crumbs }: DialogProps) {
  const ref = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const subId = useId();
  const [askDiscard, setAskDiscard] = useState(false);
  if (!open && askDiscard) setAskDiscard(false);
  if (!dirty && askDiscard) setAskDiscard(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let watch: MutationObserver | null = null;
    let stopWatch: number | undefined;
    if (open && !el.open) {
      el.showModal();
      // Start on the first field, not on ×: Enter must not close a form that was just opened.
      // Forms that load their options first get their fields a moment later, so wait briefly.
      const firstField = () => el.querySelector<HTMLElement>(".ui-dialog-body :is(input, select, textarea):not([disabled]):not([type=hidden])");
      const stillAtStart = () => document.activeElement === el || !!document.activeElement?.classList.contains("ui-dialog-close");
      if (!el.querySelector("[autofocus]")) {
        const field = firstField();
        if (field) field.focus();
        else {
          watch = new MutationObserver(() => {
            const f = firstField();
            if (!f) return;
            if (stillAtStart()) f.focus();
            watch?.disconnect();
          });
          watch.observe(el, { childList: true, subtree: true });
          stopWatch = window.setTimeout(() => watch?.disconnect(), 1500);
        }
      }
    }
    if (!open && el.open) el.close();
    return () => {
      watch?.disconnect();
      window.clearTimeout(stopWatch);
    };
  }, [open]);

  // Dialogs rendered only while open unmount without close(); close first so the
  // browser hands focus back to the control that opened them.
  useLayoutEffect(() => {
    const el = ref.current;
    return () => {
      if (el?.open) el.close();
    };
  }, []);

  const requestClose = () => {
    if (busy) return;
    if (dirty) setAskDiscard(true);
    else onClose();
  };

  const body = (
    <>
      <header className="ui-dialog-head">
        <div className="ui-dialog-titles">
          {crumbs}
          <h2 id={titleId} className="ui-dialog-title">
            {title}
          </h2>
          {subtitle && (
            <p id={subId} className="ui-dialog-sub">
              {subtitle}
            </p>
          )}
        </div>
        <button type="button" className="ui-dialog-close" aria-label="Close" onClick={requestClose} disabled={busy}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>
      <div className="ui-dialog-body">{children}</div>
      {askDiscard ? (
        <footer className="ui-dialog-foot" role="alertdialog" aria-label="Discard changes?">
          <div className="ui-dialog-foot-start">
            <span className="ui-dialog-discard">Discard your changes?</span>
          </div>
          <div className="ui-dialog-foot-end">
            <button type="button" className="btn-pill btn-pill-secondary" autoFocus onClick={() => setAskDiscard(false)}>
              Keep editing
            </button>
            <button type="button" className="btn-pill btn-pill-secondary btn-pill-danger" onClick={onClose}>
              Discard
            </button>
          </div>
        </footer>
      ) : (
        (footer || footerStart) && (
          <footer className="ui-dialog-foot">
            <div className="ui-dialog-foot-start">{footerStart}</div>
            <div className="ui-dialog-foot-end">{footer}</div>
          </footer>
        )
      )}
    </>
  );

  return (
    <dialog
      ref={ref}
      className={`ui-dialog liquid-glass${side ? " ui-sheet" : ""}`}
      aria-labelledby={titleId}
      aria-describedby={subtitle ? subId : undefined}
      style={{ width: `min(${width}px, calc(100vw - 32px))` }}
      onCancel={(e) => {
        e.preventDefault();
        requestClose();
      }}
      onClick={(e) => {
        // A click on the backdrop lands on the <dialog> itself. With unsaved input it is ignored.
        if (e.target === e.currentTarget && !busy && !dirty) onClose();
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
