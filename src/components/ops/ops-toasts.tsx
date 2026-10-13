"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import "./ops.css";

export interface OpsToast {
  id: number;
  tone: "good" | "warn" | "bad" | "info";
  title: string;
  detail?: string;
}

const LIFETIME_MS = 6000;

function ToastItem({ toast, onDismiss }: { toast: OpsToast; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), LIFETIME_MS);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);
  return (
    <div className="ops-toast" data-tone={toast.tone} role="status">
      <i className="ops-toast-dot" aria-hidden="true" />
      <div className="ops-toast-body">
        <strong>{toast.title}</strong>
        {toast.detail && <span>{toast.detail}</span>}
      </div>
      <button type="button" className="ops-toast-close" aria-label="Dismiss notification" onClick={() => onDismiss(toast.id)}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}

/** Bottom-right toast stack, portaled to body so card backdrop filters cannot trap it. */
export function OpsToastHost({ toasts, onDismiss }: { toasts: OpsToast[]; onDismiss: (id: number) => void }) {
  const [mounted, setMounted] = React.useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div className="ops-toasts" aria-live="polite" aria-relevant="additions" aria-label="Notifications">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body,
  );
}
