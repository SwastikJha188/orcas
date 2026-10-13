import React from "react";
import type { SourceKind } from "@/types/edge";

/* ==========================================================================
   Device hierarchy icons: one outline glyph per level and source kind, drawn
   on the same 24-unit grid and stroke as hierarchy-icons.tsx.
   ========================================================================== */

type IconProps = { size?: number };

const base = (size: number) => ({
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

/** Star topology: the edge network root. */
export function IconNetwork({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="2.5" />
      <circle cx="5" cy="5" r="1.8" />
      <circle cx="19" cy="5" r="1.8" />
      <circle cx="5" cy="19" r="1.8" />
      <circle cx="19" cy="19" r="1.8" />
      <path d="M6.4 6.4 10.2 10.2M17.6 6.4l-3.8 3.8M6.4 17.6l3.8-3.8M17.6 17.6l-3.8-3.8" />
    </svg>
  );
}

/** Edge gateway: box with an uplink antenna. */
export function IconGateway({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="3" y="12" width="18" height="8" rx="2" />
      <path d="M7 16h.01M10.5 16h.01M14 16h3" />
      <path d="M12 12V7" />
      <path d="M8.5 6.2a5 5 0 0 1 7 0M6.2 3.9a8.2 8.2 0 0 1 11.6 0" />
    </svg>
  );
}

/** DAQ rack: chassis with card slots. */
export function IconRack({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 8v8M10.5 8v8M14 8v8M17.5 8v8" />
    </svg>
  );
}

/** PLC: DIN-rail module with I/O terminals. */
export function IconPlc({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 6.5h8M8 17.5h8" />
      <rect x="8.5" y="9.5" width="7" height="5" rx="1" />
    </svg>
  );
}

/** SCADA: operator display with a trend. */
export function IconScada({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M6.5 12.5l3-3 2.5 2 5-4.5" />
      <path d="M9 20h6M12 16v4" />
    </svg>
  );
}

/** DCS: controller nodes on a redundant bus. */
export function IconDcs({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="3" y="3" width="7" height="6" rx="1.5" />
      <rect x="14" y="3" width="7" height="6" rx="1.5" />
      <path d="M6.5 9v4M17.5 9v4M3 13h18M3 17h18" />
      <path d="M12 17v4" />
    </svg>
  );
}

/** Analyser: sample cell with a measuring beam. */
export function IconAnalyzer({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" />
      <path d="M7.5 14h9" />
    </svg>
  );
}

/** Other source: generic I/O block. */
export function IconIo({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="5" y="5" width="14" height="14" rx="2" />
      <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
    </svg>
  );
}

/** I/O card: a board with a connector edge. */
export function IconCard({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="6" y="3" width="12" height="18" rx="1.5" />
      <path d="M9 7h6M9 10.5h6M9 14h3" />
      <path d="M8.5 21v-2M11 21v-2M13.5 21v-2M16 21v-2" />
    </svg>
  );
}

export function IconPlus({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconEdit({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
      <path d="m13.5 6.5 4 4" />
    </svg>
  );
}

export function SourceKindIcon({ kind, size = 14 }: { kind: SourceKind; size?: number }) {
  if (kind === "rack") return <IconRack size={size} />;
  if (kind === "plc") return <IconPlc size={size} />;
  if (kind === "scada") return <IconScada size={size} />;
  if (kind === "dcs") return <IconDcs size={size} />;
  if (kind === "analyzer") return <IconAnalyzer size={size} />;
  return <IconIo size={size} />;
}
