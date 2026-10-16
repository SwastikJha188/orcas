"use client";

/*
 * Shared building blocks for the one-page Prognosis (prefix pg-prog-).
 * Generic AI-page primitives (Section, SectionIndex, VerdictCard, EvidenceChip,
 * ConfidenceMeter, WhyDisclosure, MissingNote, PointerCard …) come from the
 * Analysis page so the two pages read as siblings; only prognosis-specific
 * pieces live here.
 */

import React from "react";
import { rowActivate } from "@/components/ui/row-activate";
import type { FailureRisk, Severity } from "@/server/services/insights-service";
import type { SimFrame } from "@/lib/kiln-sim/engine";
import type { AssetMachine } from "../assets-data";
import type { AssetsSubPage } from "../assets-view";
import { severityTone, type Tone } from "../assets-shell-ui";
import { ANALYSIS_ANCHOR_KEY } from "../analysis/analysis-page";
import { SECTION_IDS as ANALYSIS_SECTIONS } from "../analysis/an-derive";
import { logPos, tagsForRisk, TIME_TICKS, type AnalysisPayload, type PrognosisData, type RulRow } from "./prognosis-derive";

export { Empty, EvidenceChip, KpiStrip, PageHeader, Section, SectionIndex, WhyDisclosure, PRIORITY_TONE, type KpiItem } from "../analysis/an-ui";

/** Open Analysis scrolled to one of its sections (Analysis reads the anchor once on mount). */
export function openAnalysisAt(section: keyof typeof ANALYSIS_SECTIONS, go: (sub: AssetsSubPage) => void): void {
  try {
    sessionStorage.setItem(ANALYSIS_ANCHOR_KEY, ANALYSIS_SECTIONS[section]);
  } catch {
    /* storage unavailable: Analysis opens at the top */
  }
  go("analysis");
}

/** sessionStorage key another page can set to open Prognosis at a section id. */
export const PROG_SECTION_KEY = "ultron.prognosis.section";

export interface ProgSectionProps {
  machine: AssetMachine;
  data: PrognosisData;
  analysis: AnalysisPayload | null;
  rows: RulRow[];
  /** Key sensors chosen by the model (forecast focus). */
  keySensors: string[];
  /** KLN live demonstration engine (values are sim.) vs stored snapshot (est.). */
  live: boolean;
  go: (sub: AssetsSubPage) => void;
  /** Live kiln frame (rule onset, persistence, validation); null for snapshots. */
  frame: SimFrame | null;
  /** Failure mode selected in the risk table; drives forecasts and degradation. */
  mode: FailureRisk | null;
  setMode: (id: string) => void;
}

/** Sensor tags behind a failure mode (rule evidence, or the tag itself). */
export function tagsForMode(mode: FailureRisk | null, analysis: AnalysisPayload | null, data: PrognosisData): string[] {
  return mode ? tagsForRisk(mode, analysis, data) : [];
}

export const toneFor = (s: Severity): Tone => severityTone(s);

/** Value + unit, right-aligned in tables. */
export function Num({ value, unit, strong = false }: { value: React.ReactNode; unit?: string; strong?: boolean }) {
  return (
    <span className={`ast-num ${strong ? "pg-prog-strong" : ""}`}>
      {value}
      {unit && <span className="ast-unit">{unit}</span>}
    </span>
  );
}

/** Section content (the shared Section is the card): optional toolbar row, flush content. */
export function Card({ children, toolbar, label }: { children: React.ReactNode; toolbar?: React.ReactNode; label?: string }) {
  return (
    <div className="pg-prog-card" aria-label={label}>
      {toolbar && <div className="pg-prog-toolbar">{toolbar}</div>}
      {children}
    </div>
  );
}

/** One muted line naming the single most important missing input. */
export function Note({ children }: { children: React.ReactNode }) {
  return <p className="pg-prog-note">{children}</p>;
}

/** Status dot + text; neutral when healthy. */
export function Dot({ tone, children }: { tone?: Tone; children: React.ReactNode }) {
  const t = tone === "good" ? undefined : tone;
  return (
    <span className="pg-prog-dot" data-tone={t}>
      {t && t !== "idle" && <span className="ast-chip-dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

/** Log time ticks for a horizontal track (1 h → maxH). */
export function TimeTicks({ maxH }: { maxH: number }) {
  return (
    <>
      {TIME_TICKS.filter((t) => t.h <= maxH).map((t) => (
        <span key={t.h} className="pg-prog-tick" style={{ left: `${logPos(t.h, maxH)}%` }} aria-hidden="true" />
      ))}
    </>
  );
}

/** Small legend swatch row. */
export function Legend({ items }: { items: { label: string; kind: "dot" | "ring" | "band" | "dash" | "diamond"; tone?: Tone }[] }) {
  return (
    <ul className="pg-prog-legend" aria-label="Legend">
      {items.map((i) => (
        <li key={i.label} data-tone={i.tone}>
          <span className={`pg-prog-sw pg-prog-sw-${i.kind}`} aria-hidden="true" />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Divider table with right-aligned numeric columns                   */
/* (same ast-table / ui-table classes as the shared ui Table)         */
/* ------------------------------------------------------------------ */

export interface Col<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  align?: "right";
  width?: string;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  label,
  selected,
}: {
  selected?: string;
  columns: Col<T>[];
  data: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  label?: string;
}) {
  return (
    <div className="ui-table-container ast-table pg-prog-table">
      <table className="ui-table" aria-label={label}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} data-col={c.key} style={{ width: c.width }} className={c.align === "right" ? "pg-prog-r" : undefined} scope="col">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={rowKey(row)}
              className={[onRowClick ? "is-clickable" : "", selected === rowKey(row) ? "active" : ""].filter(Boolean).join(" ") || undefined}
              {...(onRowClick ? rowActivate(() => onRowClick(row)) : {})}
              aria-selected={selected !== undefined ? selected === rowKey(row) : undefined}
            >
              {columns.map((c) => (
                <td key={c.key} data-col={c.key} data-label={typeof c.header === "string" && c.header ? c.header : undefined} className={c.align === "right" ? "pg-prog-r" : undefined}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
