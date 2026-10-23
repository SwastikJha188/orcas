"use client";

import React, { useMemo } from "react";
import { RestLine, Table, useFold, type Column } from "@/components/ui";
import { defsFor } from "@/lib/live-defs";
import { logPos, rangeText, roundHours, type RulRow } from "./prognosis-derive";
import { buildRecs, type Rec } from "./prog-maintenance";
import { useWorkOrderPriorities } from "@/lib/reference-data";
import { TimeTicks, toneFor, type ProgSectionProps } from "./prog-ui";

/** A part whose limit is closer than this stays on the list even when nothing is to be done yet. */
const SOON_H = 30 * 24;

const MAX_H = 8760 * 1.1;
const LABELS = [
  { h: 1, label: "1 h" },
  { h: 24, label: "24 h" },
  { h: 720, label: "30 d" },
  { h: 8760, label: "1 y" },
];

const quiet = (t: ReturnType<typeof toneFor>) => (t === "warn" || t === "bad" ? t : undefined);

/** Remaining life per sub-assembly (fixed order): estimate and interval, 1 h–1 y graph, recommended action, links. The page KPI carries the failure chance. */
export function ProgRul({ machine, focusedComponent, data, analysis, rows, onSeeReason, onSeeDiagnosis }: ProgSectionProps) {
  // Fixed order (the machine's sub-assembly definitions), never re-sorted by live values.
  const sorted = useMemo(() => {
    const at = new Map((defsFor(machine.id)?.subassemblies ?? []).map((sa, i) => [sa.id, i]));
    const pos = (r: RulRow) => at.get(r.id) ?? Number.MAX_SAFE_INTEGER;
    return [...rows].sort((a, b) => pos(a) - pos(b) || a.name.localeCompare(b.name));
  }, [rows, machine.id]);
  const focused = focusedComponent
    ? sorted.find((r) => r.name.toLowerCase() === focusedComponent.toLowerCase() || focusedComponent.toLowerCase().includes(r.name.toLowerCase()))
    : undefined;
  const priorities = useWorkOrderPriorities();
  const recs = useMemo(() => buildRecs(data, analysis, rows, priorities), [data, analysis, rows, priorities]);
  const recFor = (r: RulRow): Rec | undefined => recs.find((x) => x.component.toLowerCase().includes(r.name.toLowerCase()));
  // Parts with nothing to do and no limit within 30 days fold into one line; the picked part always shows.
  const needs = (r: RulRow) => r.status !== "Normal" || Boolean(recFor(r)) || r.id === focused?.id || (r.hours !== null && r.hours <= SOON_H);
  // One part picked: its own row always shows, whatever it holds.
  const one = sorted.length === 1;
  const fold = useFold(sorted, (r) => !one && !needs(r));
  const shown = fold.shown;
  const riskFor = (r: RulRow) =>
    data.risks.find((k) => !k.id.startsWith("base-") && k.component.toLowerCase().includes(r.name.toLowerCase())) ??
    data.risks.find((k) => k.id === `base-${r.id}` || k.component.toLowerCase().includes(r.name.toLowerCase())) ??
    null;

  const cols: Column<RulRow>[] = [
    {
      key: "name",
      header: "Part",
      width: "210px",
      render: (r) => {
        const k = riskFor(r);
        return (
          <span className="ast-cell-stack">
            <strong>{r.name}</strong>
            {k && !k.id.startsWith("base-") && (
              <span className="ast-cell-sub" title={k.id}>
                {k.fault}
              </span>
            )}
          </span>
        );
      },
    },
    {
      key: "estimate",
      header: "Time left",
      width: "130px",
      render: (r) =>
        r.hours === null ? (
          // No reading is heading toward a limit: nothing to count down (the reason stays in the tooltip).
          <span className="ast-muted" title={r.dueLabel}>
            No limit ahead
          </span>
        ) : (
          <span className="ast-cell-stack ast-num" title={r.life ? r.dueLabel : undefined}>
            <strong>{roundHours(r.hours)}</strong>
            <span className="ast-cell-sub">{r.band ? `likely ${rangeText(r.band.lo, r.band.hi)}` : r.dueLabel}</span>
          </span>
        ),
    },
    {
      key: "horizon",
      header: "Time left, 1 hour to 1 year",
      width: "220px",
      render: (r) => <HorizonBar row={r} tone={quiet(toneFor(r.status))} />,
    },
    {
      key: "action",
      header: "What to do",
      render: (r) => {
        const rec = recFor(r);
        return rec ? (
          <span>
            {rec.title}
            {rec.window && <span className="ast-muted ast-num"> ({rec.window})</span>}
          </span>
        ) : (
          <span className="ast-muted">Nothing needed, keep watching</span>
        );
      },
    },
    {
      key: "layers",
      header: "Open",
      width: "195px",
      render: (r) => {
        const k = riskFor(r);
        const ruleId = k && !k.id.startsWith("base-") ? k.id : null;
        return (
          <span style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}>
            {onSeeReason && (
              <button type="button" className="pg-diag-inline-link" onClick={() => onSeeReason(ruleId, r.name, null)}>
                Investigate <span aria-hidden="true">→</span>
              </button>
            )}
            {onSeeDiagnosis && (
              <button type="button" className="pg-diag-inline-link" onClick={() => onSeeDiagnosis(ruleId, r.name, null)}>
                See sensors <span aria-hidden="true">→</span>
              </button>
            )}
          </span>
        );
      },
    },
  ];

  return (
    <section className="ast-card pg-table-card" aria-label="Time left before each part needs repair">
      {shown.length > 0 && (
        <Table
          columns={cols}
          data={shown}
          keyExtractor={(r) => r.id}
          selectedKey={focused?.id}
        />
      )}
      <RestLine rest={fold.rest} shown={shown.length} noun="part" note="no limit within 30 days, nothing needed" open={fold.open} onToggle={fold.toggle} />
    </section>
  );
}

function HorizonBar({ row, tone }: { row: RulRow; tone?: "warn" | "bad" }) {
  // No estimate: nothing to place on the time axis.
  if (!row.band || row.hours === null) return <span className="ast-muted">—</span>;
  // Lives beyond the 1-year scale run to its end.
  const lo = Math.min(99.2, logPos(row.band.lo, MAX_H));
  const hi = Math.min(100, logPos(row.band.hi, MAX_H));
  return (
    <div
      className="pg-prog-hbar"
      style={{ minWidth: 190 }}
      role="img"
      aria-label={`Likely ${rangeText(row.band.lo, row.band.hi)} left before repair, on a 1 hour to 1 year scale`}
    >
      <span className="pg-prog-cell-track pg-prog-hbar-track" data-tone={tone}>
        <TimeTicks maxH={MAX_H} />
        <span className="pg-prog-rul-band" style={{ left: `${lo}%`, width: `${Math.max(0.8, hi - lo)}%` }} />
        <span className="pg-prog-rul-mark" style={{ left: `${Math.min(100, logPos(row.hours, MAX_H))}%` }} />
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
