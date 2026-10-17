"use client";

import React, { useState } from "react";
import { PillButton, PillNav, Table, type Column } from "@/components/ui";
import type { OpsWorkOrder } from "@/providers/kiln-ops-context";
import { formatDuration } from "@/lib/kiln-sim/engine";
import { StatusTag, type Tone } from "./assets-shell-ui";
import { ACTION } from "@/components/ui/status";
import {
  HYSTERESIS_SAMPLES,
  responseLeft,
  toneOf,
  type DxAlarm,
  type DxSensor,
} from "./diagnosis-model";

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
  if (a.state === "confirming") return { label: "Confirming", tone: "idle" };
  if (a.state === "clearing") return { label: a.acknowledged ? "Clearing · Ack" : "Clearing", tone: toneOf(a.severity) };
  return { label: a.acknowledged ? "Acknowledged" : "Unacknowledged", tone: toneOf(a.severity) };
}

function fmtNum(v: number) {
  const a = Math.abs(v);
  return v.toFixed(a >= 1000 ? 0 : a >= 100 ? 1 : 2);
}

function signalOf(a: DxAlarm, byTag: Map<string, DxSensor>): DxSensor | null {
  const s = a.tags.map((t) => byTag.get(t)).find((x) => x && x.value !== null);
  return s && s.value !== null ? s : null;
}

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

  const cols: Column<DxAlarm>[] = [
    {
      key: "rule",
      header: "Rule broken",
      width: "130px",
      render: (a) => (
        <span className="ast-cell-stack">
          <span className="ast-mono">{a.ruleId}</span>
          <span className="ast-cell-sub">{a.priority}</span>
        </span>
      ),
    },
    {
      key: "name",
      header: "What is wrong",
      render: (a) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-title">{a.name}</span>
          {a.where && <span className="ast-cell-sub">{a.where}</span>}
        </span>
      ),
    },
    {
      key: "sensor",
      header: "Evidence reading",
      width: "210px",
      render: (a) => {
        const s = signalOf(a, byTag);
        const limit = s ? (s.alarm ?? s.warn) : null;
        if (!s) return <span className="ast-num">{a.tags.join(", ") || "—"}</span>;
        return (
          <span className="ast-cell-stack ast-num">
            <span className="ast-cell-title">
              {s.tag}: {fmtNum(s.value as number)} {s.unit}
            </span>
            {limit !== null && <span className="ast-cell-sub">Limit {limit} {s.unit}</span>}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "State",
      width: "150px",
      render: (a) => {
        const st = isaState(a);
        return <StatusTag tone={st.tone} label={`${a.severity} · ${st.label}`} />;
      },
    },
    {
      key: "duration",
      header: "Active for",
      width: "140px",
      render: (a) => {
        const raised = a.state !== "confirming";
        const left = responseLeft(a, t);
        return (
          <span className="ast-cell-stack ast-num">
            <span>{raised && a.activeFor ? a.activeFor : `${a.persistence}/${a.threshold} samples`}</span>
            {raised && a.since !== null && <span className="ast-cell-sub">Since {fmtT(a.since)}</span>}
            {left && <span className="ast-cell-sub">Respond in {left}</span>}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      width: "220px",
      render: (a) => {
        const raised = a.state !== "confirming";
        const wo = workOrders?.find((w) => w.ruleId === a.ruleId && (w.status === "open" || w.status === "in_progress")) ?? null;
        return (
          <span
            style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}
            onClick={(e) => e.stopPropagation()}
          >
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
          </span>
        );
      },
    },
  ];

  return (
    <section className="ast-card pg-table-card" aria-label="Active alarms">
      {live.length === 0 ? (
        <p className="pg-diag-missing" style={{ padding: "12px 16px", margin: 0 }}>
          {onShelf.length ? "All active alarms are currently shelved." : "No active alarms."}
        </p>
      ) : (
        <Table
          columns={cols}
          data={live}
          keyExtractor={(a) => a.ruleId}
          onRowClick={(a) => onSelect(selectedRuleId === a.ruleId ? null : a.ruleId)}
        />
      )}

      {shelving && (
        <form
          className="pg-diag-shelve"
          style={{ padding: "10px 16px", borderTop: "1px solid var(--border-subtle)" }}
          onSubmit={(e) => {
            e.preventDefault();
            const d = SHELVE_FOR.find((x) => x.id === dur) ?? SHELVE_FOR[0];
            if (!reason) return;
            onShelve(shelving, d.ms, reason);
            setShelving(null);
          }}
        >
          <span className="ast-mono" style={{ marginRight: 8 }}>Shelve {shelving}:</span>
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
            Confirm shelve
          </PillButton>
          <PillButton type="button" variant="secondary" className="pg-diag-sm" onClick={() => setShelving(null)}>
            Cancel
          </PillButton>
        </form>
      )}

      {onShelf.length > 0 && (
        <div className="pg-diag-shelf-bar" style={{ padding: "8px 16px" }}>
          <button type="button" className="dxo-link" aria-expanded={showShelved} onClick={() => setShowShelved((v) => !v)}>
            {showShelved ? "Hide" : "Show"} {onShelf.length} shelved
          </button>
          {showShelved && (
            <ul className="pg-diag-shelf-list">
              {onShelf.map((a) => {
                const sh = shelved.get(a.ruleId)!;
                const leftMin = Math.max(1, Math.round((sh.until - now) / 60_000));
                return (
                  <li key={a.ruleId}>
                    <span className="ast-num">
                      {a.ruleId} · {a.name}
                    </span>
                    <span className="pg-diag-muted">
                      {sh.reason} · {formatDuration(leftMin)} left
                    </span>
                    <button type="button" className="dxo-link" onClick={() => onUnshelve(a.ruleId)}>
                      Unshelve
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
