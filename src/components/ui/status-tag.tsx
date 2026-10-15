import React from "react";
import type { Tone } from "./status";

/**
 * The one status chip: coloured dot carries state, label stays in text ink.
 * Tone comes from the ui/status helpers (conditionTone, limitTone, validityTone).
 */
export function StatusTag({
  tone,
  label,
  className = "",
  title,
}: {
  tone: Tone;
  label: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span className={`ast-chip ${className}`.trim()} data-tone={tone} title={title}>
      <span className="ast-chip-dot" aria-hidden="true" />
      {label}
    </span>
  );
}
