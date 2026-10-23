"use client";

/**
 * Manual records (D4-OSW-PE-PYR Rev. 02 Table 6.4): oil laboratory results and
 * matched handheld shell scans, kept as dated records with method, place,
 * operator and review status — outside the 161 online entries.
 */

import React, { useMemo } from "react";
import { RestLine, Table, useFold, type Column } from "@/components/ui";
import { simTimeMs } from "@shared/lib/kiln-sim/engine";
import { formatLocalTime } from "@/lib/time";
import type { ManualRecord } from "@shared/lib/plant-defs";
import { PYRO_SIGNAL_BY_TAG } from "@shared/lib/pyro-sim/signals";
import { displayName } from "@/lib/display-name";

/** Newest records shown before the rest fold away. */
const RECENT = 6;

export function ManualRecords({ records, timeZone }: { records: ManualRecord[]; timeZone?: string | null }) {
  const when = (t: number) => formatLocalTime(simTimeMs(t), { date: true, seconds: false, timeZone });
  const newest = useMemo(() => [...records].sort((a, b) => b.t - a.t), [records]);
  const fold = useFold(newest, (_, i) => i >= RECENT);
  const cols: Column<ManualRecord>[] = [
    { key: "t", header: "Taken", width: "150px", render: (r) => <span className="ast-num">{when(r.t)}</span> },
    {
      key: "tag",
      header: "Record",
      width: "230px",
      render: (r) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-title" title={r.tag}>
            {displayName(PYRO_SIGNAL_BY_TAG[r.tag]?.name ?? r.tag)}
          </span>
          <span className="ast-cell-sub">{r.where}</span>
        </span>
      ),
    },
    {
      key: "value",
      header: "Result",
      width: "110px",
      render: (r) => (
        <span className="ast-num">
          {r.value} <span className="ast-unit">{r.unit}</span>
        </span>
      ),
    },
    {
      key: "fields",
      header: "What was written down",
      render: (r) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-text">{r.fields.map((f) => `${f.label} ${f.value}`).join(" · ")}</span>
          <span className="ast-cell-sub">{r.method}</span>
        </span>
      ),
    },
    {
      key: "by",
      header: "Taken by and checked by",
      width: "240px",
      render: (r) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-text">{r.by}</span>
          <span className="ast-cell-sub">{r.reviewedBy && r.reviewedAt !== undefined ? `Checked · ${r.reviewedBy} · ${when(r.reviewedAt)}` : r.review}</span>
        </span>
      ),
    },
  ];
  return (
    <section className="ast-card pg-table-card" aria-label="Readings typed in by hand">
      <div className="ast-card-head">
        <h2 className="ast-card-title">
          Readings typed in by hand
          <span className="ast-caption">{records.length} dated records (D4 Table 6.4) · never replaced by a live sensor</span>
        </h2>
      </div>
      <Table columns={cols} data={fold.shown} keyExtractor={(r) => r.id} />
      <RestLine rest={fold.rest} shown={fold.shown.length} noun="record" note="taken earlier" open={fold.open} onToggle={fold.toggle} />
    </section>
  );
}
