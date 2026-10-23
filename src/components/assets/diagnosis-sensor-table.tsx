"use client";

import React from "react";
import { PillButton, RestLine, StatusTag, Table, useFold, type Column } from "@/components/ui";
import { ACTION, ALARM_STATE, validityTone } from "@/components/ui/status";
import type { OpsWorkOrder } from "@/providers/kiln-ops-context";
import { formatDuration, type SimFrame } from "@shared/lib/kiln-sim/engine";
import { HYSTERESIS_SAMPLES, VALIDITY_HELP, VALIDITY_LABEL, type DxSensor } from "./diagnosis-model";
import { isRaised, type FaultCandidate, type SensorRow } from "./diagnosis-rows";
import { twoSided, twoSidedValues } from "./sensor-gauge";

/* ==========================================================================
   Diagnosis sensor table: one row per mapped sensor, fixed catalog order.
   Sensor · Part (hidden while one part is picked) · Reading check · Now · Last 6 h ·
   Alarm limit · Possible problems (each with its Acknowledge / Create work order, shown on
   row hover or keyboard focus) · In alarm since. Failure chance lives on
   Prognosis. The tag opens Trends; each fault's Investigate → opens it in Analysis. A row is red
   while the sensor is beyond its alarm limit or is evidence for a raised fault; nothing
   else is coloured.
   ========================================================================== */

function fmt(v: number): string {
  const a = Math.abs(v);
  return v.toFixed(a >= 1000 ? 0 : a >= 100 ? 1 : 2);
}

const unitOf = (s: DxSensor) => (s.unit && s.unit !== "state" ? s.unit : "");

/** Alarm-limit values to draw, low → high. */
function alarmLines(s: DxSensor, frame: SimFrame | null): number[] {
  const band = s.band ?? twoSided(frame?.defs.signalByTag[s.tag]?.limit, s.model);
  if (band) return [band.alarmLo, band.alarmHi].filter((v): v is number => v !== undefined && Number.isFinite(v));
  return s.alarm !== null ? [s.alarm] : [];
}

/** Limits are set values: no trailing zeros (15, 92, 334.9). */
const lim = (v: number) => String(Number(fmt(v))).replace("-", "−");

/** The readings that trip: "≤ 15 or ≥ 96" for a band, "≤ 15" / "≥ 96" for one side (as Health and the gauges). */
function sideText(lo: number | undefined, hi: number | undefined): string | null {
  // No break inside "≤ 15"; a long band may wrap at "or".
  if (lo !== undefined && hi !== undefined) return `≤\u00a0${lim(lo)} or ≥\u00a0${lim(hi)}`;
  if (hi !== undefined) return `≥\u00a0${lim(hi)}`;
  if (lo !== undefined) return `≤\u00a0${lim(lo)}`;
  return null;
}

export function limitText(s: DxSensor, frame: SimFrame | null): { alarm: string; warn: string | null } | null {
  const band = s.band ?? twoSided(frame?.defs.signalByTag[s.tag]?.limit, s.model);
  if (band && twoSidedValues(band).length) {
    const alarm = sideText(band.alarmLo, band.alarmHi);
    return alarm ? { alarm, warn: sideText(band.warnLo, band.warnHi) } : null;
  }
  if (s.alarm === null) return null;
  // One-sided: a low limit sits below its warning, a high one above.
  const op = s.warn !== null && s.alarm < s.warn ? "≤" : "≥";
  return { alarm: `${op}\u00a0${lim(s.alarm)}`, warn: s.warn !== null ? `${op}\u00a0${lim(s.warn)}` : null };
}

/** Last 6 plant-hours of the reading, with the alarm limit(s) and the alarm onset. */
function PastTrend({ row, frame }: { row: SensorRow; frame: SimFrame | null }) {
  const h = frame?.history[row.s.tag];
  if (!frame || !h || h.length < 2) return <span className="ast-muted">—</span>;
  const W = 132;
  const H = 28;
  const lo0 = Math.min(...h);
  const hi0 = Math.max(...h);
  const span = hi0 - lo0 || Math.abs(hi0) || 1;
  // A limit far outside the trace would flatten it: draw only limits within one span of the data.
  const limits = alarmLines(row.s, frame).filter((v) => v >= lo0 - span && v <= hi0 + span);
  const lo = Math.min(lo0, ...limits);
  const hi = Math.max(hi0, ...limits);
  const pad = (hi - lo) * 0.1 || 1;
  const y = (v: number) => H - 2 - ((v - (lo - pad)) / (hi - lo + 2 * pad)) * (H - 4);
  const x = (i: number) => (i / (h.length - 1)) * W;
  const d = h.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const times = frame.times;
  const onsetIdx = row.since !== null && times.length === h.length ? times.findIndex((t) => t >= (row.since as number)) : -1;
  return (
    <svg
      className="pg-dx-trend"
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`${row.s.name} over the last ${formatDuration(h.length)}: ${fmt(lo0)} to ${fmt(hi0)} ${unitOf(row.s)}`}
    >
      {limits.map((v) => (
        <line key={v} x1="0" x2={W} y1={y(v)} y2={y(v)} className="pg-dx-trend-limit" />
      ))}
      {onsetIdx > 0 && <line x1={x(onsetIdx)} x2={x(onsetIdx)} y1="0" y2={H} className="pg-dx-trend-onset" />}
      <path d={d} className="pg-dx-trend-line" data-alarm={row.inAlarm || undefined} />
    </svg>
  );
}

function stateText(f: FaultCandidate, fmtClock: (ms: number) => string): string {
  // Returned to normal, unacknowledged: stays on the line until someone acknowledges it.
  const cleared = f.cleared ? `${ALARM_STATE.cleared}${f.clearedAt !== null ? ` ${fmtClock(f.clearedAt)}` : ""} · ${ALARM_STATE.unacknowledged}` : null;
  switch (f.state) {
    case "confirming": {
      const confirming = `${ALARM_STATE.confirming} (${Math.min(f.persistence, f.threshold)} of ${f.threshold} readings)`;
      return cleared ? `${confirming} · ${cleared}` : confirming;
    }
    case "clearing":
      return `${ALARM_STATE.clearing} (${f.clean} of ${HYSTERESIS_SAMPLES} normal readings)`;
    case "active":
      return `${ALARM_STATE.active} · ${f.acknowledged ? ALARM_STATE.acknowledged : ALARM_STATE.unacknowledged}`;
    default:
      return cleared ?? "Not happening now";
  }
}

/** The fault's open (or in-progress) work order, if any. */
const openWorkOrder = (workOrders: OpsWorkOrder[] | null, ruleId: string) =>
  workOrders?.find((w) => w.ruleId === ruleId && (w.status === "open" || w.status === "in_progress")) ?? null;

function FaultList({
  faults,
  fmtClock,
  workOrders,
  onWhy,
  onAcknowledge,
  onWorkOrder,
}: {
  faults: FaultCandidate[];
  fmtClock: (ms: number) => string;
  workOrders: OpsWorkOrder[] | null;
  /** Open the fault's mechanism on Analysis. */
  onWhy: (f: FaultCandidate) => void;
  onAcknowledge: (ruleId: string) => void;
  onWorkOrder?: (ruleId: string) => void;
}) {
  if (!faults.length) return <span className="ast-muted">—</span>;
  return (
    <ul className="pg-dx-faults">
      {faults.map((f) => {
        const raised = isRaised(f.state);
        const wo = openWorkOrder(workOrders, f.ruleId);
        const state = stateText(f, fmtClock);
        return (
          <li key={f.ruleId} data-raised={raised || undefined}>
            <span className="pg-dx-fault-head">
              <span className="pg-dx-fault-name" title={f.engName !== f.name ? `${f.engName} (${f.ruleId})` : f.ruleId}>
                {f.name}
              </span>
              {f.of > 0 && (
                <span
                  className="pg-dx-fault-pct ast-num"
                  title={`Evidence found: ${f.matched} of the ${f.of} trusted sensors this check looks at are outside normal (${f.match}%)`}
                >
                  {f.matched} of {f.of} signs
                </span>
              )}
            </span>
            <span className="pg-dx-fault-sub">
              {[f.where, state].filter(Boolean).join(" · ")}
              {" · "}
              <button type="button" className="pg-diag-inline-link" onClick={() => onWhy(f)}>
                Investigate <span aria-hidden="true">→</span>
              </button>
              {wo && (
                <span title={`${wo.title} (WO-${wo.id})`}>
                  {" · "}Work order {wo.id}
                </span>
              )}
            </span>
            <FaultActions f={f} workOrders={workOrders} onAcknowledge={onAcknowledge} onWorkOrder={onWorkOrder} />
          </li>
        );
      })}
    </ul>
  );
}

/**
 * A fault's actions: Acknowledge / Create work order when it needs one. Hidden until the row
 * is hovered or holds keyboard focus (always shown on touch); the group names its fault for
 * screen readers.
 */
function FaultActions({
  f,
  workOrders,
  onAcknowledge,
  onWorkOrder,
}: {
  f: FaultCandidate;
  workOrders: OpsWorkOrder[] | null;
  onAcknowledge: (ruleId: string) => void;
  onWorkOrder?: (ruleId: string) => void;
}) {
  const raised = isRaised(f.state);
  const ack = (raised || f.cleared) && !f.acknowledged;
  const order = raised && Boolean(onWorkOrder) && !openWorkOrder(workOrders, f.ruleId);
  if (!ack && !order) return null;
  return (
    <span className="pg-dx-fault-actions pg-dx-row-actions" role="group" aria-label={f.name}>
      {ack && (
        <PillButton variant="secondary" className="pg-diag-sm" title={`${ACTION.acknowledge}: ${f.name}`} onClick={() => onAcknowledge(f.ruleId)}>
          {ACTION.acknowledge}
        </PillButton>
      )}
      {order && onWorkOrder && (
        <PillButton variant="secondary" className="pg-diag-sm" title={`${ACTION.workOrder}: ${f.name}`} onClick={() => onWorkOrder(f.ruleId)}>
          {ACTION.workOrder}
        </PillButton>
      )}
    </span>
  );
}

export function SensorDiagnosisTable({
  rows,
  frame,
  fmtT,
  fmtClock,
  workOrders,
  onAcknowledge,
  onWorkOrder,
  onOpenTrend,
  onWhy,
  hidePart = false,
  frameOf,
  machineOf,
  rowKey,
}: {
  rows: SensorRow[];
  frame: SimFrame | null;
  /** Full line: each row's own machine frame (else `frame`). */
  frameOf?: (r: SensorRow) => SimFrame | null;
  /** Full line: the machine each row belongs to; adds a Machine column. */
  machineOf?: (r: SensorRow) => string | null;
  /** Full line: rows from several machines need a key beyond the tag. */
  rowKey?: (r: SensorRow) => string;
  fmtT: (t: number) => string;
  /** Plant clock (ms) → hh:mm. */
  fmtClock: (ms: number) => string;
  workOrders: OpsWorkOrder[] | null;
  onAcknowledge: (ruleId: string) => void;
  onWorkOrder?: (ruleId: string) => void;
  onOpenTrend: (tag: string) => void;
  onWhy: (f: FaultCandidate, tag: string) => void;
  /** One part is picked: every row is that part, so the Part column is left out. */
  hidePart?: boolean;
}) {
  const fr = (r: SensorRow) => (frameOf ? frameOf(r) : frame);
  const cols: Column<SensorRow>[] = [
    {
      key: "sensor",
      header: "Sensor",
      width: "190px",
      render: (r) => (
        <span className="ast-cell-stack pg-dx-sensor" data-alarm={r.inAlarm || undefined}>
          <button
            type="button"
            className="ast-cell-title pg-dx-tag"
            onClick={() => onOpenTrend(r.s.tag)}
            title={`Open the trend chart of this sensor (tag ${r.s.tag})`}
          >
            {r.s.name} <span aria-hidden="true">↗</span>
          </button>
        </span>
      ),
    },
    {
      key: "machine",
      header: "Machine",
      width: "110px",
      render: (r) => <span className="ast-cell-text">{machineOf?.(r) ?? "—"}</span>,
    },
    {
      key: "where",
      header: "Part",
      width: "150px",
      render: (r) => <span className="ast-cell-text">{r.s.subAssembly || "—"}</span>,
    },
    {
      key: "validity",
      header: "Reading check",
      width: "110px",
      render: (r) =>
        r.s.validity === "valid" ? (
          <span className="ast-muted" title={VALIDITY_HELP.valid}>
            {VALIDITY_LABEL.valid}
          </span>
        ) : (
          <StatusTag
            tone={validityTone(VALIDITY_LABEL[r.s.validity])}
            label={VALIDITY_LABEL[r.s.validity]}
            title={[VALIDITY_HELP[r.s.validity], r.s.qualityNote].filter(Boolean).join(" · ")}
          />
        ),
    },
    {
      key: "now",
      header: "Now",
      width: "120px",
      render: (r) => (
        <span className="ast-num pg-dx-now" data-alarm={r.inAlarm || undefined}>
          {r.s.value !== null ? fmt(r.s.value) : r.s.display}
          {r.s.value !== null && unitOf(r.s) && <span className="ast-unit"> {unitOf(r.s)}</span>}
        </span>
      ),
    },
    {
      key: "past",
      header: "Last 6 hours",
      width: "144px",
      render: (r) => <PastTrend row={r} frame={fr(r)} />,
    },
    {
      key: "limit",
      header: "Alarm limit",
      width: "150px",
      render: (r) => {
        const l = limitText(r.s, fr(r));
        if (!l) return <span className="ast-muted">—</span>;
        return (
          <span className="ast-cell-stack ast-num pg-dx-limit">
            <span>{l.alarm}</span>
            {l.warn && <span className="ast-cell-sub">Alert {l.warn}</span>}
          </span>
        );
      },
    },
    {
      key: "faults",
      header: "Possible problems",
      render: (r) => (
        <FaultList
          faults={r.faults}
          fmtClock={fmtClock}
          workOrders={workOrders}
          onWhy={(f) => onWhy(f, r.s.tag)}
          onAcknowledge={onAcknowledge}
          onWorkOrder={onWorkOrder}
        />
      ),
    },
    {
      key: "since",
      header: "In alarm since",
      width: "96px",
      render: (r) =>
        r.since !== null && fr(r) ? (
          <span className="ast-cell-stack ast-num">
            <span>{fmtT(r.since)}</span>
            <span className="ast-cell-sub">for {formatDuration(fr(r)!.t - r.since)}</span>
          </span>
        ) : (
          <span className="ast-muted">—</span>
        ),
    },
  ];

  // Sensors with a good reading inside their limits and nothing to act on fold into one line: a
  // possible problem keeps its sensor in view only while raised, confirming, waiting to be
  // acknowledged or showing signs. With one part picked, all of its sensors show.
  const live = (f: FaultCandidate) => isRaised(f.state) || f.state === "confirming" || (f.cleared && !f.acknowledged) || f.matched > 0 || f.fired;
  const fold = useFold(rows, (r) => !hidePart && !r.inAlarm && !r.faults.some(live) && r.s.severity === "Normal" && r.s.validity === "valid");

  // A column that is empty on every row says nothing: leave it out until a row fills it.
  const filled: Record<string, boolean> = {
    machine: Boolean(machineOf),
    where: !hidePart,
    faults: rows.some((r) => r.faults.length > 0),
    since: rows.some((r) => r.since !== null),
  };
  return (
    <>
      {fold.shown.length > 0 && (
        <Table className="pg-dx-table" columns={cols.filter((c) => filled[c.key] ?? true)} data={fold.shown} keyExtractor={rowKey ?? ((r) => r.s.tag)} />
      )}
      <RestLine rest={fold.rest} shown={fold.shown.length} noun="sensor" note="good readings, inside their limits" open={fold.open} onToggle={fold.toggle} />
    </>
  );
}
