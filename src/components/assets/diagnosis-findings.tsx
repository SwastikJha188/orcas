"use client";

import React, { useState } from "react";
import { rowActivate } from "@/components/ui/row-activate";
import { PillButton } from "@/components/ui";
import type { Tone } from "./assets-shell-ui";
import { BASIS_TEXT, alternativesFor, toneOf, type DxSensor, type Finding } from "./diagnosis-model";
import { zText } from "./diagnosis-summary";

/* ==========================================================================
   Fault candidates: one row per fault pattern present now, with an
   auditable symptom count (rule inputs that fired / inputs read), onset,
   and an expanded evidence matrix (expected vs observed per input, σ,
   symptom present / absent / not valid), cause → consequence → rule logic,
   what distinguishes it from the other candidates, and confirm / reject
   feedback (stored in this browser and written to the log).
   ========================================================================== */

export type Feedback = "confirmed" | "rejected";

const STATE_LABEL: Record<Finding["state"], string> = {
  active: "Confirmed",
  clearing: "Clearing",
  confirming: "Suspected",
  recorded: "Recorded",
  matching: "Signature match",
  clear: "Not present",
};

function fmt(v: number | null) {
  if (v === null) return "—";
  const a = Math.abs(v);
  return v.toFixed(a >= 1000 ? 0 : a >= 100 ? 1 : 2);
}

/** Inputs the pattern reads, and which of them currently show the symptom. */
export function symptomsOf(f: Finding, byTag: Map<string, DxSensor>) {
  const inputs = f.inputs.length ? f.inputs : f.tags;
  const fired = new Set(f.tags);
  const rows = inputs.map((tag) => {
    const s = byTag.get(tag);
    const invalid = !!s && (s.validity === "invalid" || s.validity === "stale");
    return { tag, s, state: invalid ? ("n/a" as const) : fired.has(tag) ? ("present" as const) : ("absent" as const) };
  });
  return { rows, present: rows.filter((r) => r.state === "present").length, valid: rows.filter((r) => r.state !== "n/a").length };
}

function EvidenceMatrix({ f, byTag }: { f: Finding; byTag: Map<string, DxSensor> }) {
  const { rows } = symptomsOf(f, byTag);
  if (!rows.length) return <span className="dxo-secondary-text">{f.evidence || "No sensor inputs recorded for this pattern."}</span>;
  // Fired inputs first, then canonical rule input order.
  const sorted = [...rows].sort((a, b) => Number(b.state === "present") - Number(a.state === "present"));
  return (
    <table className="pg-diag-matrix">
      <thead>
        <tr>
          <th scope="col">Input</th>
          <th scope="col" className="is-right">
            Expected
          </th>
          <th scope="col" className="is-right">
            Observed
          </th>
          <th scope="col" className="is-right">
            Residual
          </th>
          <th scope="col">Symptom</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((r) => (
          <tr key={r.tag}>
            <td className="ast-num">{r.tag}</td>
            <td className="is-right ast-num pg-diag-muted">{fmt(r.s?.model ?? null)}</td>
            <td className="is-right ast-num">
              {r.s ? (r.s.value !== null ? fmt(r.s.value) : r.s.display) : "—"} <span className="pg-diag-unit">{r.s?.unit}</span>
            </td>
            <td className="is-right ast-num">{zText(r.s?.z ?? null) ?? "—"}</td>
            <td className={r.state === "present" ? "pg-diag-name" : "pg-diag-muted"}>{r.state === "present" ? "✓ present" : r.state === "absent" ? "✗ absent" : "n/a · invalid"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function FaultCandidates({
  findings,
  live,
  byTag,
  onsetOf,
  selectedRuleId,
  onSelect,
  feedback,
  onFeedback,
  onAnalysis,
  onPrognosis,
  focusRuleId = null,
}: {
  /** Rule opened from another page: its row is expanded. */
  focusRuleId?: string | null;
  findings: Finding[];
  live: boolean;
  byTag: Map<string, DxSensor>;
  onsetOf: (f: Finding) => string | null;
  selectedRuleId: string | null;
  onSelect: (ruleId: string | null) => void;
  feedback: Map<string, Feedback>;
  onFeedback: (f: Finding, v: Feedback) => void;
  onAnalysis: () => void;
  onPrognosis: () => void;
}) {
  const focusKey = focusRuleId ? (findings.find((f) => f.ruleId === focusRuleId)?.key ?? null) : null;
  const [expanded, setExpanded] = useState<string | null>(focusKey ?? findings[0]?.key ?? null);
  const [seenFocus, setSeenFocus] = useState<string | null>(focusKey);
  if (focusKey !== seenFocus) {
    setSeenFocus(focusKey);
    if (focusKey) setExpanded(focusKey);
  }

  return (
    <div className="dxo-table-wrap">
      <table className="dxo-table pg-diag-table">
        <thead>
          <tr>
            <th scope="col">Fault candidate</th>
            <th scope="col">Status</th>
            <th scope="col" className="is-right">
              {live ? "Persistence score" : "Probability"}
            </th>
            <th scope="col" className="is-right">
              Symptoms
            </th>
            <th scope="col">Onset</th>
            <th scope="col" className="is-right">
              Time to limit
            </th>
            <th scope="col" className="is-right">
              Feedback
            </th>
          </tr>
        </thead>
        <tbody>
          {findings.map((f) => {
            const isOpen = expanded === f.key;
            const selected = !!f.ruleId && f.ruleId === selectedRuleId;
            const tone: Tone = f.state === "active" || f.state === "clearing" || f.state === "recorded" ? toneOf(f.severity) : "idle";
            const sym = symptomsOf(f, byTag);
            const fb = feedback.get(f.key) ?? null;
            const alts = alternativesFor(f, findings, byTag);
            const p = f.probability;
            return (
              <React.Fragment key={f.key}>
                <tr
                  className={`dxo-row is-clickable ${isOpen ? "is-open" : ""} ${selected ? "is-focus" : ""}`}
                  aria-expanded={isOpen}
                  {...rowActivate(() => {
                    setExpanded(isOpen ? null : f.key);
                    if (f.ruleId) onSelect(f.ruleId);
                  }, selected)}
                >
                  <td>
                    <span className="ast-cell-stack">
                      <span className="pg-diag-name">
                        {f.name} {f.ruleId && <span className="pg-diag-code">{f.ruleId}</span>}
                      </span>
                      <span className="dxo-secondary-text">{f.where || f.category}</span>
                    </span>
                  </td>
                  <td>
                    <span className="pg-diag-state" data-tone={tone}>
                      <span className="ast-chip-dot" aria-hidden="true" />
                      {f.ruleId === "R-ANM-01" ? "Unknown anomaly" : STATE_LABEL[f.state]}
                      {tone !== "idle" ? ` · ${f.severity}` : ""}
                    </span>
                  </td>
                  <td className="is-right">
                    <span className="pg-diag-prob" title={BASIS_TEXT[f.basis]}>
                      <span className="pg-diag-bar" aria-hidden="true">
                        <i style={{ width: `${Math.max(0, Math.min(100, p ?? 0))}%` }} />
                      </span>
                      <span className="ast-num">{p === null ? "—" : `${p < 10 ? p.toFixed(1) : Math.round(p)}${f.basis === "Rule engine" ? "" : " %"}`}</span>
                    </span>
                  </td>
                  <td className="is-right ast-num">{sym.rows.length ? `${sym.present}/${sym.valid}` : "—"}</td>
                  <td className="ast-num">{onsetOf(f) ?? "—"}</td>
                  <td className="is-right ast-num">{f.timeToLimit ?? "—"}</td>
                  <td className="is-right" onClick={(e) => e.stopPropagation()}>
                    {fb ? (
                      <span className="dxo-secondary-text">{fb === "confirmed" ? "Confirmed by you" : "Rejected by you"}</span>
                    ) : (
                      <span className="pg-diag-row-actions">
                        <PillButton variant="secondary" className="pg-diag-sm" onClick={() => onFeedback(f, "confirmed")}>
                          Confirm
                        </PillButton>
                        <PillButton variant="secondary" className="pg-diag-sm" onClick={() => onFeedback(f, "rejected")}>
                          Reject
                        </PillButton>
                      </span>
                    )}
                  </td>
                </tr>
                {isOpen && (
                  <tr className="dxo-drawer">
                    <td colSpan={7}>
                      <div className="pg-diag-detail">
                        <EvidenceMatrix f={f} byTag={byTag} />
                        <dl className="pg-diag-dl">
                          <dt>Rule logic</dt>
                          <dd>{f.logic ?? "—"}</dd>
                          <dt>Cause</dt>
                          <dd>{f.cause ?? "—"}</dd>
                          <dt>Consequence</dt>
                          <dd>{f.consequence ?? "—"}</dd>
                          <dt>Distinguish</dt>
                          <dd>
                            {alts.length ? (
                              <ul className="pg-diag-alts">
                                {alts.map((a) => (
                                  <li key={a}>{a}</li>
                                ))}
                              </ul>
                            ) : (
                              "No competing candidate."
                            )}
                          </dd>
                          <dt>Verify</dt>
                          <dd>{f.action ?? "—"}</dd>
                          {f.unproven && (
                            <>
                              <dt>Not yet proven</dt>
                              <dd>{f.unproven}</dd>
                            </>
                          )}
                          {f.hold && (
                            <>
                              <dt>HOLD</dt>
                              <dd>{f.hold}</dd>
                            </>
                          )}
                          {f.owner && (
                            <>
                              <dt>Owner</dt>
                              <dd>{f.owner}</dd>
                            </>
                          )}
                          <dt>Basis</dt>
                          <dd>
                            {BASIS_TEXT[f.basis]}
                          </dd>
                          <dt>More</dt>
                          <dd>
                            <span>
                              <button type="button" className="pg-diag-inline-link" onClick={onAnalysis}>
                                Root cause
                              </button>
                              {" · "}
                              <button type="button" className="pg-diag-inline-link" onClick={onPrognosis}>
                                Time to limit
                              </button>
                            </span>
                          </dd>
                        </dl>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
