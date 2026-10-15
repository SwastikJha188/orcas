"use client";

import React, { useState } from "react";
import { rowActivate } from "@/components/ui/row-activate";
import { PillButton, PillNav } from "@/components/ui";
import type { OpsWorkOrder } from "@/providers/kiln-ops-context";
import { formatDuration } from "@/lib/kiln-sim/engine";
import type { Tone } from "./assets-shell-ui";
import { ACTION } from "@/components/ui/status";
import {
  HYSTERESIS_SAMPLES,
  responseLeft,
  toneOf,
  type DxAlarm,
  type DxSensor,
} from "./diagnosis-model";

/* ==========================================================================
   Alarms (ISA-18.2 lifecycle): pending (persistence n/k) → unacknowledged →
   acknowledged → clearing (hysteresis n/4) → cleared. Per-row acknowledge
   and shelve (time-limited, reason required, auto-unshelve; kept in this
   browser only — there is no shelving backend).
   ========================================================================== */

/** Segmented sample counter: filled = samples counted toward the transition. */
export function Samples({ n, of, label }: { n: number; of: number; label: string }) {
  const filled = Math.max(0, Math.min(of, n));
  return (
    <span className="pg-diag-samples" role="img" aria-label={label}>
      {Array.from({ length: of }, (_, i) => (
        <i key={i} className={i < filled ? "is-on" : ""} />
      ))}
    </span>
  );
}

export interface Shelf {
  until: number;
  reason: string;
  since: number | null;
}

const SHELVE_FOR = [
  { id: "1h", label: "1 h", ms: 3_600_000 },
  { id: "8h", label: "8 h", ms: 8 * 3_600_000 },
  { id: "12h", label: "1 shift (12 h)", ms: 12 * 3_600_000 },
];
const SHELVE_REASONS = ["Nuisance / chattering", "Maintenance in progress", "Known — awaiting planned stop", "Instrument under check"];

function isaState(a: DxAlarm): { label: string; tone: Tone } {
  if (a.state === "confirming") return { label: "Pending", tone: "idle" };
  if (a.state === "clearing") return { label: a.acknowledged ? "Clearing · ack" : "Clearing · unack", tone: toneOf(a.severity) };
  return { label: a.acknowledged ? "Active · ack" : "Active · unack", tone: toneOf(a.severity) };
}

function fmtNum(v: number) {
  const a = Math.abs(v);
  return v.toFixed(a >= 1000 ? 0 : a >= 100 ? 1 : 2);
}

function SignalCell({ a, byTag }: { a: DxAlarm; byTag: Map<string, DxSensor> }) {
  const s = a.tags.map((t) => byTag.get(t)).find((x) => x && x.value !== null);
  if (!s || s.value === null) return <span className="dxo-none">—</span>;
  const limit = s.alarm ?? s.warn;
  return (
    <span className="ast-cell-stack">
      <span className="ast-num pg-diag-name">
        {fmtNum(s.value)} <span className="pg-diag-unit">{s.unit}</span>
      </span>
      <span className="dxo-secondary-text ast-num">
        {s.tag}
        {limit !== null ? ` · limit ${limit}` : ""}
      </span>
    </span>
  );
}

export function AlarmTable({
  alarms,
  shelved,
  t,
  fmtT,
  byTag,
  selectedRuleId,
  onSelect,
  onAcknowledge,
  onShelve,
  onUnshelve,
  workOrders,
  onWorkOrder,
}: {
  alarms: DxAlarm[];
  shelved: Map<string, Shelf>;
  t: number;
  fmtT: (t: number) => string;
  byTag: Map<string, DxSensor>;
  selectedRuleId: string | null;
  onSelect: (ruleId: string | null) => void;
  onAcknowledge: (ruleId: string) => void;
  onShelve: (ruleId: string, ms: number, reason: string) => void;
  onUnshelve: (ruleId: string) => void;
  workOrders: OpsWorkOrder[] | null;
  onWorkOrder?: (ruleId: string) => void;
}) {
  const [shelving, setShelving] = useState<string | null>(null);
  const [dur, setDur] = useState(SHELVE_FOR[0].id);
  const [reason, setReason] = useState("");
  const [showShelved, setShowShelved] = useState(false);

  const live = alarms.filter((a) => !shelved.has(a.ruleId));
  const onShelf = alarms.filter((a) => shelved.has(a.ruleId));
  const now = Date.now();

  return (
    <div className="dxo-card dxo-table-card">
      {live.length === 0 ? (
        <div className="dxo-empty">{onShelf.length ? "Every raised alarm is shelved." : "No alarms."}</div>
      ) : (
        <div className="dxo-table-wrap">
          <table className="dxo-table pg-diag-table">
            <thead>
              <tr>
                <th scope="col">Pri.</th>
                <th scope="col">Alarm</th>
                <th scope="col">State</th>
                <th scope="col" className="is-right">
                  Signal
                </th>
                <th scope="col">Persist.</th>
                <th scope="col">Clear</th>
                <th scope="col">In alarm</th>
                <th scope="col" className="is-right">
                  Respond in
                </th>
                <th scope="col" className="is-right">
                  <span className="dxo-sr">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {live.map((a) => {
                const st = isaState(a);
                const selected = selectedRuleId === a.ruleId;
                const raised = a.state !== "confirming";
                const left = responseLeft(a, t);
                const wo = workOrders?.find((w) => w.ruleId === a.ruleId && (w.status === "open" || w.status === "in_progress")) ?? null;
                return (
                  <React.Fragment key={a.ruleId}>
                    <tr
                      className={`dxo-row is-clickable ${selected ? "is-focus" : ""}`}
                      {...rowActivate(() => onSelect(selected ? null : a.ruleId), selected)}
                    >
                      <td className="ast-num">{a.priority}</td>
                      <td>
                        <span className="ast-cell-stack">
                          <span className="pg-diag-name">
                            {a.name} <span className="pg-diag-code">{a.ruleId}</span>
                          </span>
                          <span className="dxo-secondary-text">{a.where}</span>
                        </span>
                      </td>
                      <td>
                        <span className="pg-diag-state" data-tone={st.tone}>
                          <span className="ast-chip-dot" aria-hidden="true" />
                          {st.label}
                        </span>
                      </td>
                      <td className="is-right">
                        <SignalCell a={a} byTag={byTag} />
                      </td>
                      <td>
                        <span className="pg-diag-progress">
                          <Samples n={raised ? a.threshold : a.persistence} of={a.threshold} label={`Persistence ${Math.min(a.persistence, a.threshold)} of ${a.threshold}`} />
                          <span className="ast-num">
                            {raised ? a.threshold : Math.min(a.persistence, a.threshold)}/{a.threshold}
                          </span>
                        </span>
                      </td>
                      <td>
                        {a.state === "clearing" ? (
                          <span className="pg-diag-progress">
                            <Samples n={a.clean} of={HYSTERESIS_SAMPLES} label={`${a.clean} of ${HYSTERESIS_SAMPLES} clean samples`} />
                            <span className="ast-num">
                              {a.clean}/{HYSTERESIS_SAMPLES}
                            </span>
                          </span>
                        ) : (
                          <span className="dxo-none">—</span>
                        )}
                      </td>
                      <td>
                        <span className="ast-cell-stack">
                          <span className="ast-num">{raised && a.activeFor ? a.activeFor : "—"}</span>
                          {raised && a.since !== null && <span className="dxo-secondary-text ast-num">since {fmtT(a.since)}</span>}
                        </span>
                      </td>
                      <td className={`is-right ast-num ${left === "overdue" ? "pg-diag-warn" : ""}`}>{left ?? <span className="dxo-none">—</span>}</td>
                      <td className="is-right" onClick={(e) => e.stopPropagation()}>
                        <span className="pg-diag-row-actions">
                          {raised && !a.acknowledged && (
                            <PillButton variant="secondary" className="pg-diag-sm" onClick={() => onAcknowledge(a.ruleId)}>
                              {ACTION.acknowledge}
                            </PillButton>
                          )}
                          {raised && (
                            <PillButton
                              variant="secondary"
                              className="pg-diag-sm"
                              aria-expanded={shelving === a.ruleId}
                              onClick={() => {
                                setShelving(shelving === a.ruleId ? null : a.ruleId);
                                setReason("");
                              }}
                            >
                              Shelve
                            </PillButton>
                          )}
                          {wo ? (
                            <span className="dxo-secondary-text ast-num" title={wo.title}>
                              WO-{wo.id}
                            </span>
                          ) : (
                            onWorkOrder &&
                            raised &&
                            a.category !== "Data quality" && (
                              <PillButton variant="secondary" className="pg-diag-sm" onClick={() => onWorkOrder(a.ruleId)}>
                                Work order
                              </PillButton>
                            )
                          )}
                        </span>
                      </td>
                    </tr>
                    {shelving === a.ruleId && (
                      <tr className="dxo-drawer">
                        <td colSpan={9}>
                          <form
                            className="pg-diag-shelve"
                            onSubmit={(e) => {
                              e.preventDefault();
                              const d = SHELVE_FOR.find((x) => x.id === dur) ?? SHELVE_FOR[0];
                              if (!reason) return;
                              onShelve(a.ruleId, d.ms, reason);
                              setShelving(null);
                            }}
                          >
                            <span className="pg-diag-k">Shelve {a.ruleId}</span>
                            <PillNav items={SHELVE_FOR.map(({ id, label }) => ({ id, label }))} activeId={dur} onChange={setDur} />
                            <label className="pg-diag-select">
                              <span className="dxo-sr">Reason</span>
                              <select value={reason} onChange={(e) => setReason(e.target.value)} required>
                                <option value="">Reason…</option>
                                {SHELVE_REASONS.map((r) => (
                                  <option key={r} value={r}>
                                    {r}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <PillButton type="submit" variant="primary" className="pg-diag-sm" disabled={!reason}>
                              Shelve
                            </PillButton>
                          </form>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {onShelf.length > 0 && (
        <div className="pg-diag-sub">
          <button type="button" className="pg-diag-inline-link" aria-expanded={showShelved} onClick={() => setShowShelved((v) => !v)}>
            Shelved ({onShelf.length})
          </button>
          {showShelved && (
            <ul className="pg-diag-shelf">
              {onShelf.map((a) => {
                const sh = shelved.get(a.ruleId) as Shelf;
                return (
                  <li key={a.ruleId}>
                    <span className="pg-diag-name">
                      {a.name} <span className="pg-diag-code">{a.ruleId}</span>
                    </span>
                    <span className="dxo-secondary-text">{sh.reason}</span>
                    <span className="ast-num dxo-secondary-text">returns in {formatDuration(Math.max(0, (sh.until - now) / 60_000))}</span>
                    <PillButton variant="secondary" className="pg-diag-sm" onClick={() => onUnshelve(a.ruleId)}>
                      Unshelve
                    </PillButton>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
