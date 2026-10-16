"use client";

import React, { useState } from "react";
import { PillButton, PillNav, Tile, TileGrid } from "@/components/ui";
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
   acknowledged → clearing (hysteresis n/4) → cleared. One card per alarm:
   signal value against its limit as the headline; per-card acknowledge
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

/** The signal behind the alarm: first cited sensor with a numeric reading. */
function signalOf(a: DxAlarm, byTag: Map<string, DxSensor>): DxSensor | null {
  const s = a.tags.map((t) => byTag.get(t)).find((x) => x && x.value !== null);
  return s && s.value !== null ? s : null;
}

/** Stops clicks / keys inside a tile body from selecting the tile. */
const keepInside = {
  onClick: (e: React.SyntheticEvent) => e.stopPropagation(),
  onKeyDown: (e: React.SyntheticEvent) => e.stopPropagation(),
};

export function AlarmCards({
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
    <>
      {live.length === 0 ? (
        <p className="pg-diag-missing">{onShelf.length ? "Every raised alarm is shelved." : "No alarms."}</p>
      ) : (
        <TileGrid label="Alarms" min={300} className="pg-diag-tiles">
          {live.map((a) => {
            const st = isaState(a);
            const selected = selectedRuleId === a.ruleId;
            const raised = a.state !== "confirming";
            const left = responseLeft(a, t);
            const wo = workOrders?.find((w) => w.ruleId === a.ruleId && (w.status === "open" || w.status === "in_progress")) ?? null;
            const s = signalOf(a, byTag);
            const limit = s ? (s.alarm ?? s.warn) : null;
            const persisted = raised ? a.threshold : Math.min(a.persistence, a.threshold);
            return (
              <Tile
                key={a.ruleId}
                className="pg-diag-tile"
                title={
                  <>
                    {a.priority} · {a.ruleId}
                  </>
                }
                sub={
                  <>
                    <span className="pg-diag-tile-name">{a.name}</span>
                    {a.where ? ` · ${a.where}` : ""}
                  </>
                }
                status={st}
                tone={raised ? st.tone : undefined}
                value={s ? fmtNum(s.value as number) : undefined}
                unit={s ? s.unit : undefined}
                meter={
                  s ? (
                    <span className="pg-diag-tile-meta">
                      {s.tag}
                      {limit !== null ? ` · limit ${limit} ${s.unit}` : ""}
                    </span>
                  ) : undefined
                }
                selected={selected}
                onSelect={() => onSelect(selected ? null : a.ruleId)}
                attrs={{ "data-rule": a.ruleId }}
                facts={[
                  {
                    label: "Persistence",
                    value: (
                      <span className="pg-diag-progress">
                        <Samples n={persisted} of={a.threshold} label={`Persistence ${persisted} of ${a.threshold}`} />
                        {persisted}/{a.threshold}
                      </span>
                    ),
                  },
                  {
                    label: "Clear",
                    value:
                      a.state === "clearing" ? (
                        <span className="pg-diag-progress">
                          <Samples n={a.clean} of={HYSTERESIS_SAMPLES} label={`${a.clean} of ${HYSTERESIS_SAMPLES} clean samples`} />
                          {a.clean}/{HYSTERESIS_SAMPLES}
                        </span>
                      ) : (
                        "—"
                      ),
                  },
                  { label: "In alarm", value: raised && a.activeFor ? a.activeFor : "—" },
                  { label: "Respond in", value: left ?? "—", tone: left === "overdue" ? "warn" : undefined },
                ]}
                foot={raised && a.since !== null ? `since ${fmtT(a.since)}` : `${a.persistence} sample${a.persistence === 1 ? "" : "s"} matching`}
                actions={
                  <>
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
                      <span className="pg-diag-tile-meta" title={wo.title}>
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
                  </>
                }
              >
                {shelving === a.ruleId && (
                  <form
                    className="pg-diag-shelve"
                    {...keepInside}
                    onSubmit={(e) => {
                      e.preventDefault();
                      const d = SHELVE_FOR.find((x) => x.id === dur) ?? SHELVE_FOR[0];
                      if (!reason) return;
                      onShelve(a.ruleId, d.ms, reason);
                      setShelving(null);
                    }}
                  >
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
                )}
              </Tile>
            );
          })}
        </TileGrid>
      )}

      {onShelf.length > 0 && (
        <>
          <div className="ui-tiles-head">
            <button type="button" className="pg-diag-inline-link" aria-expanded={showShelved} onClick={() => setShowShelved((v) => !v)}>
              Shelved ({onShelf.length})
            </button>
          </div>
          {showShelved && (
            <TileGrid label="Shelved alarms" min={300} className="pg-diag-tiles">
              {onShelf.map((a) => {
                const sh = shelved.get(a.ruleId) as Shelf;
                return (
                  <Tile
                    key={a.ruleId}
                    className="pg-diag-tile"
                    title={
                      <>
                        {a.priority} · {a.ruleId}
                      </>
                    }
                    sub={<span className="pg-diag-tile-name">{a.name}</span>}
                    status={{ label: "Shelved" }}
                    value={formatDuration(Math.max(0, (sh.until - now) / 60_000))}
                    unit="to return"
                    foot={sh.reason}
                    actions={
                      <PillButton variant="secondary" className="pg-diag-sm" onClick={() => onUnshelve(a.ruleId)}>
                        Unshelve
                      </PillButton>
                    }
                  />
                );
              })}
            </TileGrid>
          )}
        </>
      )}
    </>
  );
}
