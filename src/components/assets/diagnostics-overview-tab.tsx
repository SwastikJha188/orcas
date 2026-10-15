"use client";

/**
 * Sensor-kind classification and the icon used in leading table badges.
 */

import React from "react";
import "./diagnosis/overview-tab.css";

export type SensorKind = "vib" | "temp" | "press" | "elec" | "speed" | "gas" | "other";

export function sensorKind(sensorType: string, unit: string, tag: string): SensorKind {
  const st = (sensorType || "").toLowerCase();
  const u = (unit || "").toLowerCase();
  const t = (tag || "").toUpperCase();
  if (st.includes("vibrat") || u.includes("mm/s") || t.startsWith("VIB") || t.startsWith("VE-") || t.startsWith("ACC")) return "vib";
  if (st.includes("temp") || u.includes("°c") || t.startsWith("TMP") || t.startsWith("TE-")) return "temp";
  if (st.includes("press") || u.includes("bar") || t.startsWith("PRS") || t.startsWith("PT-")) return "press";
  if (u.includes("vol%") || u.includes("ppm") || t.startsWith("GAS")) return "gas";
  if (u.includes("rpm") || t.startsWith("SPD") || t.startsWith("SE-")) return "speed";
  if (u.includes("kw") || u === "a" || u.includes("%") || t.startsWith("ELE") || t.startsWith("IT-") || t.startsWith("PWR")) return "elec";
  return "other";
}

export function KindIcon({ kind, size = 15 }: { kind: SensorKind; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (kind) {
    case "vib":
      return (
        <svg {...common}>
          <path d="M2 12h3l3-8 4 16 3-8h7" />
        </svg>
      );
    case "temp":
      return (
        <svg {...common}>
          <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
        </svg>
      );
    case "press":
      return (
        <svg {...common}>
          <circle cx="12" cy="13" r="8" />
          <path d="m15 10-3 3" />
          <path d="M12 3v2" />
        </svg>
      );
    case "elec":
      return (
        <svg {...common}>
          <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
        </svg>
      );
    case "speed":
      return (
        <svg {...common}>
          <path d="M4 18a9 9 0 1 1 16 0" />
          <path d="m12 14 4-5" />
        </svg>
      );
    case "gas":
      return (
        <svg {...common}>
          <path d="M9 3h6" />
          <path d="M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4a1.5 1.5 0 0 0 1.3-2L14 9V3" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <rect x="5" y="5" width="14" height="14" rx="2" />
          <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
        </svg>
      );
  }
}
