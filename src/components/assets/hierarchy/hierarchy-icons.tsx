import React from "react";
import { IconArea, IconMachine } from "../assets-shell-ui";
import type { NodeType } from "./hierarchy-model";

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

/** Factory: plant / site root. */
export function IconPlant({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M3 20V10l5 3V10l5 3V10l5 3V5h3v15z" />
      <path d="M7 17h2M12 17h2M17 17h2" />
    </svg>
  );
}

/** Sitemap: machine group / train. */
export function IconGroup({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="9" y="3" width="6" height="5" rx="1" />
      <rect x="3" y="16" width="6" height="5" rx="1" />
      <rect x="15" y="16" width="6" height="5" rx="1" />
      <path d="M12 8v4M6 16v-4h12v4" />
    </svg>
  );
}

export function TypeIcon({ type, size = 14 }: { type: NodeType; size?: number }) {
  if (type === "plant") return <IconPlant size={size} />;
  if (type === "area") return <IconArea size={size} />;
  if (type === "group") return <IconGroup size={size} />;
  return <IconMachine size={size} />;
}
