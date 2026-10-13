"use client";

import React from "react";
import type { Severity } from "@/server/services/insights-service";

export const TONE: Record<Severity, string> = {
  Normal: "var(--status-success)",
  Advisory: "var(--status-warning)",
  Critical: "var(--status-danger)",
};

export function StatusChip({ status }: { status: Severity }) {
  const cls = status === "Critical" ? "bad" : status === "Advisory" ? "warn" : "good";
  return (
    <span className={`dx-chip ${cls}`}>
      <span className="dx-dot" />
      {status}
    </span>
  );
}

/**
 * Quantised instrument scale — discrete 2px ticks instead of a solid fill.
 * Attribution and probability read as a countable meter, not a progress bar.
 */
export function TickMeter({
  value,
  max = 100,
  color,
  ticks = 24,
  className = "",
}: {
  value: number;
  max?: number;
  color: string;
  ticks?: number;
  className?: string;
}) {
  const filled = Math.max(0, Math.min(ticks, Math.round((value / (max || 1)) * ticks)));
  return (
    <span className={`ins-ticks ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: ticks }).map((_, i) => (
        <i key={i} className={i < filled ? "on" : ""} style={i < filled ? { background: color } : undefined} />
      ))}
    </span>
  );
}

export function ModuleCard({
  eyebrow,
  title,
  right,
  children,
  className = "",
  delay = 0,
}: {
  eyebrow: string;
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <section
      className={`dx-card ins-card ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <header className="dx-card-head">
        <div style={{ minWidth: 0 }}>
          <span className="dx-eyebrow">{eyebrow}</span>
          <h3 className="dx-title">{title}</h3>
        </div>
        {right && <div className="ins-card-right">{right}</div>}
      </header>
      {children}
    </section>
  );
}

export function InsightsState({
  isLoading,
  isError,
  error,
}: {
  isLoading: boolean;
  isError: boolean;
  error?: string | null;
}) {
  if (isLoading) {
    return (
      <div className="ins-state" role="status" aria-live="polite">
        <span className="ins-spinner" />
        Loading insights…
      </div>
    );
  }
  if (isError) {
    return (
      <div className="ins-state ins-state--error" role="alert">
        Insights unavailable{error ? ` (${error})` : ""}.
      </div>
    );
  }
  return null;
}
