"use client";

import React from "react";

/* ==========================================================================
   Shared primitives for the Assets shell (directory, header, overview,
   sensor mapping). Token-only colour via data-tone → --tone (assets-shell.css).
   ========================================================================== */

import type { Tone } from "@/components/ui/status";
export type { Tone };
export { StatusTag } from "@/components/ui/status-tag";

export function severityTone(status: string): Tone {
  if (status === "Critical" || status === "Alarm" || status === "Trip") return "bad";
  if (status === "Advisory" || status === "Warning" || status === "Alert") return "warn";
  return "good";
}

export function machineTone(status: string): Tone {
  if (status === "Advisory") return "warn";
  if (status === "Critical") return "bad";
  if (status === "Standby" || status === "Maintenance") return "idle";
  return "good";
}

export function healthTone(health: number): Tone {
  if (health >= 90) return "good";
  if (health >= 75) return "warn";
  return "bad";
}

/** Quantised instrument meter — discrete ticks, fill carries state. */
export function Ticks({
  value,
  max = 100,
  tone,
  ticks = 20,
  label,
}: {
  value: number;
  max?: number;
  tone: Tone;
  ticks?: number;
  label?: string;
}) {
  const filled = Math.max(0, Math.min(ticks, Math.round((value / (max || 1)) * ticks)));
  return (
    <span
      className="ast-ticks"
      data-tone={tone}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {Array.from({ length: ticks }, (_, i) => (
        <i key={i} className={i < filled ? "on" : undefined} />
      ))}
    </span>
  );
}

/** Stacked segment bar with a 2px surface gap between segments. */
export function SegmentBar({
  segments,
  label,
}: {
  segments: Array<{ id: string; value: number; tone: Tone }>;
  label: string;
}) {
  const total = segments.reduce((n, s) => n + s.value, 0) || 1;
  return (
    <span className="ast-seg" role="img" aria-label={label}>
      {segments
        .filter((s) => s.value > 0)
        .map((s) => (
          <span key={s.id} data-tone={s.tone} style={{ flexGrow: s.value / total }} />
        ))}
    </span>
  );
}

/** Pill search field. */
export function SearchPill({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <label className="ast-search">
      <IconSearch />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/* ---------------------------------------------------------------- icons */

type IconProps = { size?: number };

const svgBase = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export function IconMachine({ size = 16 }: IconProps) {
  return (
    <svg {...svgBase(size)}>
      <rect x="3" y="7" width="13" height="10" rx="2" />
      <path d="M16 10h3l2 2v0l-2 2h-3" />
      <path d="M6 17v2M13 17v2" />
    </svg>
  );
}

export function IconArea({ size = 16 }: IconProps) {
  return (
    <svg {...svgBase(size)}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function IconSensor({ size = 16 }: IconProps) {
  return (
    <svg {...svgBase(size)}>
      <circle cx="12" cy="12" r="2.5" />
      <path d="M7.5 7.5a6.4 6.4 0 0 0 0 9M16.5 7.5a6.4 6.4 0 0 1 0 9" />
    </svg>
  );
}

export function IconSearch({ size = 14 }: IconProps) {
  return (
    <svg {...svgBase(size)} strokeWidth={2}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4.2-4.2" />
    </svg>
  );
}

export function IconChevron({ size = 12, dir = "right" }: IconProps & { dir?: "right" | "down" | "left" }) {
  const d = dir === "down" ? "m6 9 6 6 6-6" : dir === "left" ? "m15 6-6 6 6 6" : "m9 6 6 6-6 6";
  return (
    <svg {...svgBase(size)} strokeWidth={2.2}>
      <path d={d} />
    </svg>
  );
}

export function IconBack({ size = 14 }: IconProps) {
  return (
    <svg {...svgBase(size)} strokeWidth={2}>
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </svg>
  );
}

export function IconMore({ size = 16 }: IconProps) {
  return (
    <svg {...svgBase(size)} strokeWidth={2.4}>
      <path d="M6 12h.01M12 12h.01M18 12h.01" />
    </svg>
  );
}

export function IconClose({ size = 14 }: IconProps) {
  return (
    <svg {...svgBase(size)} strokeWidth={2}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

