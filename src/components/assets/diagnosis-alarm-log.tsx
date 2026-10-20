"use client";

import React from "react";
import { PillButton, StatusTag, Table, type Column } from "@/components/ui";
import { ACTION, ALARM_STATE } from "@/components/ui/status";
import type { AlarmOccurrence } from "@/lib/alarm-journal";
import { formatDuration, simMinuteMs } from "@/lib/kiln-sim/engine";

/* ==========================================================================
   Alarm log: every alarm occurrence of the machine from the alarm journal
   (alarm_events), newest first. Raised · Alarm · Trigger · Cleared ·
   Acknowledged. An occurrence that cleared before anyone acknowledged it
   keeps its Acknowledge button.
   ========================================================================== */

export interface AlarmLogRow {
  o: AlarmOccurrence;
  name: string;
  where: string;
  unit: string;
  /** Name of the sensor that triggered it. */
  triggerName: string | null;
}

function fmtValue(v: number): string {
  const a = Math.abs(v);
  return v.toFixed(a >= 1000 ? 0 : a >= 100 ? 1 : 2);
}

/** Plant minutes between two journal times: engine minutes when both are from one run, else the plant clock. */
function minutesBetween(o: AlarmOccurrence, endAt: string, endSimT: number | null): number {
  if (o.raisedSimT !== null && endSimT !== null && endSimT >= o.raisedSimT) return endSimT - o.raisedSimT;
  return Math.max(0, (Date.parse(endAt) - Date.parse(o.raisedAt)) / simMinuteMs());
}

export function AlarmLogTable({
  rows,
  fmtTime,
  fmtDate,
  onAcknowledge,
}: {
  rows: AlarmLogRow[];
  /** Plant clock (ms) → hh:mm:ss. */
  fmtTime: (ms: number) => string;
  /** Plant clock (ms) → day. */
  fmtDate: (ms: number) => string;
  onAcknowledge: (ruleId: string) => void;
}) {
  const when = (iso: string, sub?: React.ReactNode) => {
    const ms = Date.parse(iso);
    return (
      <span className="ast-cell-stack">
        <span className="ast-num">{fmtTime(ms)}</span>
        <span className="ast-cell-sub">{sub ?? fmtDate(ms)}</span>
      </span>
    );
  };

  const cols: Column<AlarmLogRow>[] = [
    {
      key: "raised",
      header: "Raised",
      width: "130px",
      render: (r) => when(r.o.raisedAt),
    },
    {
      key: "alarm",
      header: "Alarm",
      render: (r) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-title" title={r.o.ruleId}>
            {r.name}
          </span>
          {r.where && <span className="ast-cell-sub">{r.where}</span>}
        </span>
      ),
    },
    {
      key: "trigger",
      header: "Trigger",
      width: "160px",
      render: (r) =>
        r.o.triggerTag ? (
          <span className="ast-cell-stack">
            <span title={r.o.triggerTag}>{r.triggerName ?? r.o.triggerTag}</span>
            <span className="ast-cell-sub">
              {r.o.triggerValue !== null ? `${fmtValue(r.o.triggerValue)}${r.unit ? ` ${r.unit}` : ""} at raise` : "—"}
            </span>
          </span>
        ) : (
          <span className="ast-muted">—</span>
        ),
    },
    {
      key: "cleared",
      header: "Cleared",
      width: "150px",
      render: (r) =>
        r.o.clearedAt ? (
          when(r.o.clearedAt, `after ${formatDuration(minutesBetween(r.o, r.o.clearedAt, r.o.clearedSimT))}`)
        ) : (
          <StatusTag tone="bad" label={ALARM_STATE.active} />
        ),
    },
    {
      key: "acked",
      header: "Acknowledged",
      width: "170px",
      render: (r) =>
        r.o.ackedAt ? (
          when(r.o.ackedAt, r.o.ackedBy ?? `after ${formatDuration(minutesBetween(r.o, r.o.ackedAt, r.o.ackedSimT))}`)
        ) : (
          <PillButton variant="secondary" className="pg-diag-sm" onClick={() => onAcknowledge(r.o.ruleId)}>
            {ACTION.acknowledge}
          </PillButton>
        ),
    },
  ];

  return <Table className="pg-dx-table" columns={cols} data={rows} keyExtractor={(r) => String(r.o.id)} />;
}
