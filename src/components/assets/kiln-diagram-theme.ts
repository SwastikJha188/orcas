"use client";

import { useEffect, useState } from "react";

/**
 * Kiln schematic theme.
 *
 * Every value resolves to a semantic CSS token from globals.css, so the
 * schematics follow the active light/dark theme without re-rendering.
 * Drawing style is the ULTRON machine kit (TSE reference) — see
 * ./machine-kit/machine-kit.tsx. Colour stays reserved for operational state.
 */

export type DiagramState = "Normal" | "Advisory" | "Critical";

/** Monoline drawing tokens shared by every kiln schematic. */
export const DIAGRAM = {
  /** Primary outline stroke. */
  stroke: "var(--mx-edge)",
  /** Secondary detail stroke (seams, internal parts). */
  detail: "var(--mx-fine)",
  /** Hairline (foundations, guides, leader lines). */
  hair: "var(--mx-fine)",
  /** Equipment body fill (machine-kit gradient inside a MachineSvg). */
  body: "var(--mx-paint-body, var(--mx-body))",
  /** Raised / moving part fill. */
  raised: "var(--mx-paint-raised, var(--mx-raised))",
  /** Canvas & recessed fill. */
  inset: "var(--dx-inset)",
  /** Surface used behind callouts. */
  surface: "var(--card-bg)",
  ink: "var(--dx-ink)",
  ink2: "var(--dx-ink-2)",
  muted: "var(--text-muted)",
  line: "var(--dx-line)",
  good: "var(--status-success)",
  warn: "var(--status-warning)",
  bad: "var(--status-danger)",
  /** Stroke widths. */
  w: 1.5,
  wFine: 1,
  font: "var(--font-ui)",
} as const;

export function diagramStateColor(status: string | undefined): string {
  if (status === "Critical" || status === "Active" || status === "Alarm" || status === "Trip") return DIAGRAM.bad;
  if (status === "Advisory" || status === "Alert" || status === "Warning") return DIAGRAM.warn;
  return DIAGRAM.good;
}

export interface KilnDiagramPalette {
  dark: boolean;
  panel: string;
  panelBorder: string;
  grid: string;
  gridStrong: string;
  body: string;
  raised: string;
  deep: string;
  edge: string;
  fine: string;
  muted: string;
  accent: string;
  datum: string;
  ink: string;
  heading: string;
  /** Process material. Neutral: colour is reserved for state. */
  material: string;
  /** Hot-process stream. Neutral: colour is reserved for state. */
  injection: string;
  /** Auxiliary / electrical circuits. Neutral. */
  auxiliary: string;
  edgeHi: string;
  seam: string;
  bolt: string;
  boltHi: string;
  brass: string;
  brassHi: string;
  ember: string;
  emberDeep: string;
  shadow: string;
}

const TOKEN_PALETTE: Omit<KilnDiagramPalette, "dark"> = {
  panel: "var(--dx-inset)",
  panelBorder: "var(--dx-line)",
  grid: "var(--dx-line)",
  gridStrong: "var(--dx-stroke-soft)",
  body: "var(--dx-body)",
  raised: "var(--dx-body-2)",
  deep: "var(--dx-inset)",
  edge: "var(--diagram-stroke)",
  fine: "var(--dx-stroke)",
  muted: "var(--text-muted)",
  accent: "var(--status-success)",
  datum: "var(--status-success)",
  ink: "var(--dx-ink)",
  heading: "var(--dx-ink)",
  material: "var(--dx-stroke)",
  injection: "var(--dx-stroke)",
  auxiliary: "var(--diagram-stroke)",
  edgeHi: "var(--dx-ink)",
  seam: "var(--dx-stroke-soft)",
  bolt: "var(--dx-body-2)",
  boltHi: "var(--dx-stroke)",
  brass: "var(--dx-body-2)",
  brassHi: "var(--dx-stroke)",
  ember: "var(--dx-stroke)",
  emberDeep: "var(--dx-stroke-soft)",
  shadow: "var(--page-bg)",
};

export const DARK_PALETTE: KilnDiagramPalette = { dark: true, ...TOKEN_PALETTE };
export const LIGHT_PALETTE: KilnDiagramPalette = { dark: false, ...TOKEN_PALETTE };

/**
 * Token palette plus the current theme flag. Colours are CSS variables, so
 * they switch with the theme on their own; `dark` is kept for callers that
 * branch on it.
 */
export function useKilnDiagramPalette(): KilnDiagramPalette {
  const [palette, setPalette] = useState<KilnDiagramPalette>(DARK_PALETTE);

  useEffect(() => {
    const isDark = () => document.documentElement.dataset.theme !== "light";
    const sync = () => setPalette(isDark() ? DARK_PALETTE : LIGHT_PALETTE);
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  return palette;
}

export interface KilnGridLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strong: boolean;
}

export function kilnGridLines(
  width: number,
  height: number,
  step: number,
  palette: KilnDiagramPalette,
): KilnGridLine[] {
  const cell = Math.max(1, Math.round(step));
  const minor = palette.gridStrong === palette.grid ? cell : cell / 2;
  const lines: KilnGridLine[] = [];

  const isStrong = (value: number) => {
    const rem = value % cell;
    return rem < 0.001 || rem > cell - 0.001;
  };

  for (let x = 0; x <= width; x += minor) {
    lines.push({ x1: x, y1: 0, x2: x, y2: height, strong: isStrong(x) });
  }
  for (let y = 0; y <= height; y += minor) {
    lines.push({ x1: 0, y1: y, x2: width, y2: y, strong: isStrong(y) });
  }

  return lines;
}

/**
 * Neutral fill ramp (index 0 = lightest step, 6 = deepest). Token-based and
 * nearly flat, so gradients built from it read as solid graphite.
 */
export function neutralStops(dark: boolean): string[] {
  void dark;
  return [
    "var(--dx-body-2)",
    "var(--dx-body-2)",
    "var(--dx-body)",
    "var(--dx-body)",
    "var(--dx-body)",
    "var(--dx-inset)",
    "var(--dx-inset)",
  ];
}
