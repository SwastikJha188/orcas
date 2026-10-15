"use client";

import React, { useMemo } from "react";
import { logPos, rangeText, roundHours, type RulRow } from "./prognosis-derive";
import { buildRecs, type Rec } from "./prog-maintenance";
import { Card, DataTable, TimeTicks, WhyDisclosure, toneFor, type Col, type ProgSectionProps } from "./prog-ui";

const MAX_H = 8760 * 1.1;

/** Remaining life and window plan: RUL range bars on one shared log-time axis. */
export function ProgRul({ data, analysis, rows, live, frame }: ProgSectionProps) {
  const d5 = frame?.defs.plant !== "pyro";
  const sorted = rows;
  const recs = useMemo(() => buildRecs(data, analysis, rows), [data, analysis, rows]);
  const recFor = (r: RulRow): Rec | undefined => recs.find((x) => x.component.toLowerCase().includes(r.name.toLowerCase()));
  const quiet = (t: ReturnType<typeof toneFor>) => (t === "warn" || t === "bad" ? t : undefined);

  const columns: Col<RulRow>[] = [
    { key: "name", header: "Sub-assembly", render: (r) => <span className="ast-cell-title">{r.name}</span> },
    {
      key: "range",
      header: "Interval est.",
      align: "right",
      render: (r) => (
        <span className="ast-num pg-prog-strong pg-prog-tone" data-tone={quiet(toneFor(r.status))}>
          {rangeText(r.band.lo, r.band.hi)}
        </span>
      ),
    },
    {
      key: "track",
      header: (
        <span className="pg-prog-cell-track is-head" aria-label="Log time from now">
          <TimeTicks maxH={MAX_H} labels />
        </span>
      ),
      width: "34%",
      render: (r) => (
        <span className="pg-prog-cell-track" data-tone={quiet(toneFor(r.status))} title={`${rangeText(r.band.lo, r.band.hi)} · estimate ${roundHours(r.hours)}`}>
          <TimeTicks maxH={MAX_H} />
          <span className="pg-prog-rul-band" style={{ left: `${logPos(r.band.lo, MAX_H)}%`, width: `${Math.max(0.8, logPos(r.band.hi, MAX_H) - logPos(r.band.lo, MAX_H))}%` }} />
          <span className="pg-prog-rul-mark" style={{ left: `${logPos(r.hours, MAX_H)}%` }} />
        </span>
      ),
    },
    { key: "health", header: "Health %", align: "right", render: (r) => <span className="ast-num ast-muted">{r.health.toFixed(0)}</span> },
    { key: "basis", header: "Basis", render: (r) => <span className="ast-muted">{r.basis === "finding" ? "Rule time-to-limit" : "Health-index trend"}</span> },
    {
      key: "act",
      header: "Recommended action",
      render: (r) => {
        const rec = recFor(r);
        return rec ? (
          <span className="ast-cell-text pg-prog-clip" title={`${rec.title} · ${rec.priority} · ${rec.window}`}>
            {rec.title}
          </span>
        ) : (
          <span className="ast-muted">Monitor</span>
        );
      },
    },
  ];

  return (
    <Card label="Remaining life">
      <DataTable columns={columns} data={sorted} rowKey={(r) => r.id} label="Remaining useful life per sub-assembly" />
      <WhyDisclosure summary="Method">
        <ul className="pg-prog-why-list">
          <li>With an active {d5 ? "D5 " : ""}rule finding: time for its trending signal to reach the alarm limit (residual vs reference model{d5 ? ", D5 Table 9.5" : ""}).</li>
          <li>Without a finding: extrapolation of the sub-assembly health index; no run-to-failure history backs it.</li>
          <li>Interval = estimate ± (100 − confidence) %; bar = interval, tick = estimate. Duty assumed comparable to now{live ? " (simulated plant)" : ""}.</li>
          <li>Planned stops, production campaign and spare-part lead times are not connected, so no deferral comparison is possible yet.</li>
        </ul>
      </WhyDisclosure>
    </Card>
  );
}
