"use client";

import React, { useState } from "react";
import { Table, type Column } from "@/components/ui";
import { bandOf, type SubNode } from "./health-derive";
import type { HealthBands } from "@/lib/reference-data";

/* ==========================================================================
   Diagnosis · Sub-assemblies: health per sub-assembly in fixed definition
   order. Health 0–100 with the health-model band ticks (DB), and how many of its
   sensors are in alarm. A row filters the sensor table below.
   ========================================================================== */

export interface SubRow {
  sub: SubNode;
  /** Sensors of this sub-assembly in the sensor table, and how many are in alarm. */
  sensors: number;
  inAlarm: number;
}

const bandTone = (v: number, bands: HealthBands | null) => {
  const band = bandOf(v, bands);
  return band === "Critical" ? "bad" : band === "Alert" ? "warn" : undefined;
};

/** 0–100 bar with Critical / Alert band ticks; grey unless below Alert (no ticks while the bands load). */
export function HealthBar({ value, bands }: { value: number; bands: HealthBands | null }) {
  const band = bandOf(value, bands);
  return (
    <span className="pg-dx-hbar" data-tone={bandTone(value, bands)} role="img" aria-label={band ? `Health ${value} of 100, ${band}` : `Health ${value} of 100`}>
      <i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      {bands && <b style={{ left: `${bands.critical}%` }} />}
      {bands && <b style={{ left: `${bands.advisory}%` }} />}
    </span>
  );
}

export function SubassemblyHealthTable({
  rows,
  selectedId,
  onSelect,
  bands,
}: {
  rows: SubRow[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** The machine's health-model bands; null while loading. */
  bands: HealthBands | null;
}) {
  const [showAll, setShowAll] = useState(false);
  const cols: Column<SubRow>[] = [
    {
      key: "sub",
      header: "Part",
      width: "300px",
      render: (r) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-title">{r.sub.name}</span>
          <span className="ast-cell-sub">{r.sub.systemName}</span>
        </span>
      ),
    },
    {
      key: "health",
      header: "Health",
      // Fixed, so the count sits next to the bar and wide screens leave their spare room at the row's end.
      width: "560px",
      render: (r) =>
        r.sub.scored && r.sub.health !== null ? (
          <span className="pg-dx-health">
            <span className="ast-num pg-dx-health-num" data-tone={bandTone(r.sub.health, bands)}>
              {r.sub.health}
            </span>
            <HealthBar value={r.sub.health} bands={bands} />
          </span>
        ) : (
          <span className="ast-muted" title="This part has no health score">No score</span>
        ),
    },
    {
      key: "alarm",
      header: "Sensors out of range",
      render: (r) => (
        <span className="ast-num" data-alarm={r.inAlarm > 0 || undefined}>
          {r.inAlarm} <span className="ast-muted">of {r.sensors}</span>
        </span>
      ),
    },
  ];

  // Parts in the normal band with no sensor out of range fold into one line (once the bands are
  // known); the picked part always shows.
  const quiet = (r: SubRow) =>
    bands !== null && r.inAlarm === 0 && r.sub.id !== selectedId && !(r.sub.scored && r.sub.health !== null && bandTone(r.sub.health, bands));
  const rest = rows.filter(quiet).length;
  const shown = showAll ? rows : rows.filter((r) => !quiet(r));

  return (
    <>
      {shown.length > 0 && (
        <Table
          className="pg-dx-subs"
          columns={cols}
          data={shown}
          keyExtractor={(r) => r.sub.id}
          selectedKey={selectedId ?? undefined}
          onRowClick={(r) => onSelect(r.sub.id === selectedId ? null : r.sub.id)}
        />
      )}
      {rest > 0 && (
        <p className="pg-table-rest">
          {showAll
            ? `${rest} of these parts are healthy with every sensor in range.`
            : `${shown.length ? `${rest} other part${rest === 1 ? "" : "s"}` : `All ${rest} parts`}: healthy, every sensor in range.`}{" "}
          <button type="button" className="pg-diag-inline-link" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
            {showAll ? "Hide them" : "Show them"}
          </button>
        </p>
      )}
    </>
  );
}
