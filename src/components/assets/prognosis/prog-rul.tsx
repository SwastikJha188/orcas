"use client";

import React, { useMemo } from "react";
import { Table, type Column } from "@/components/ui";
import { toCondition } from "@/components/ui/status";
import { StatusTag } from "../assets-shell-ui";
import { formatRulHours, logPos, rangeText, roundHours, SEVERITY_RANK, type RulRow } from "./prognosis-derive";
import { buildRecs, type Rec } from "./prog-maintenance";
import { TimeTicks, toneFor, type ProgSectionProps } from "./prog-ui";

const MAX_H = 8760 * 1.1;
const LABELS = [
  { h: 1, label: "1 h" },
  { h: 24, label: "24 h" },
  { h: 720, label: "30 d" },
  { h: 8760, label: "1 y" },
];

const quiet = (t: ReturnType<typeof toneFor>) => (t === "warn" || t === "bad" ? t : undefined);

/** Remaining life table with inline 1h–1y horizon graph per sub-assembly. */
export function ProgRul({ data, analysis, rows }: ProgSectionProps) {
  const sorted = useMemo(() => [...rows].sort((a, b) => SEVERITY_RANK[b.status] - SEVERITY_RANK[a.status] || a.band.lo - b.band.lo), [rows]);
  const recs = useMemo(() => buildRecs(data, analysis, rows), [data, analysis, rows]);
  const recFor = (r: RulRow): Rec | undefined => recs.find((x) => x.component.toLowerCase().includes(r.name.toLowerCase()));

  const cols: Column<RulRow>[] = [
    {
      key: "name",
      header: "Sub-assembly",
      width: "220px",
      render: (r) => <strong>{r.name}</strong>,
    },
    {
      key: "status",
      header: "Condition",
      width: "120px",
      render: (r) => {
        const tone = toneFor(r.status);
        return <StatusTag tone={tone} label={toCondition(r.status)} />;
      },
    },
    {
      key: "health",
      header: "Health",
      width: "100px",
      render: (r) => <span className="ast-num">{r.health.toFixed(0)} %</span>,
    },
    {
      key: "estimate",
      header: "Estimated life",
      width: "120px",
      render: (r) => <strong className="ast-num">{roundHours(r.hours)}</strong>,
    },
    {
      key: "range",
      header: "Interval",
      width: "130px",
      render: (r) => <span className="ast-num ast-muted">{rangeText(r.band.lo, r.band.hi)}</span>,
    },
    {
      key: "horizon",
      header: "Horizon graph (1 h – 1 y)",
      width: "240px",
      render: (r) => <HorizonBar row={r} tone={quiet(toneFor(r.status))} />,
    },
    {
      key: "action",
      header: "Recommended action",
      render: (r) => {
        const rec = recFor(r);
        return rec ? (
          <span>
            {rec.title} <span className="ast-muted ast-num">({rec.window})</span>
          </span>
        ) : (
          <span className="ast-muted">Routine monitoring</span>
        );
      },
    },
  ];

  return (
    <section className="ast-card pg-table-card" aria-label="Remaining useful life per sub-assembly">
      <Table columns={cols} data={sorted} keyExtractor={(r) => r.id} />
    </section>
  );
}

function HorizonBar({ row, tone }: { row: RulRow; tone?: "warn" | "bad" }) {
  const lo = logPos(row.band.lo, MAX_H);
  const hi = logPos(row.band.hi, MAX_H);
  return (
    <div className="pg-prog-hbar" style={{ minWidth: 190 }} role="img" aria-label={`Remaining life ${rangeText(row.band.lo, row.band.hi)} on a 1 hour to 1 year scale`}>
      <span className="pg-prog-cell-track pg-prog-hbar-track" data-tone={tone}>
        <TimeTicks maxH={MAX_H} />
        <span className="pg-prog-rul-band" style={{ left: `${lo}%`, width: `${Math.max(0.8, hi - lo)}%` }} />
        <span className="pg-prog-rul-mark" style={{ left: `${logPos(row.hours, MAX_H)}%` }} />
      </span>
      <span className="pg-prog-hbar-scale" aria-hidden="true">
        {LABELS.map((t) => (
          <span key={t.h} style={{ left: `${logPos(t.h, MAX_H)}%` }}>
            {t.label}
          </span>
        ))}
      </span>
    </div>
  );
}
