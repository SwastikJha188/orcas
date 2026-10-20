"use client";

import React, { useEffect, useRef } from "react";
import { PillButton, Table, Tile, TileGrid, type Column } from "@/components/ui";
import { StatusTag } from "./assets-shell-ui";
import { isConditionRule } from "@/lib/plant-defs";
import type { Tone } from "./assets-shell-ui";
import { HYSTERESIS_SAMPLES, VALIDITY_LABEL, toneOf, type DxSensor, type Finding } from "./diagnosis-model";
import { zText } from "./diagnosis-summary";

export type Feedback = "confirmed" | "rejected";

function stateText(f: Finding): string {
  if (f.ruleId === "R-ANM-01") return "Unknown anomaly";
  switch (f.state) {
    case "active":
      return "Confirmed";
    case "clearing":
      return `Clearing (${f.clean}/${HYSTERESIS_SAMPLES})`;
    case "confirming":
      return `Confirming (${Math.min(f.persistence, f.threshold)}/${f.threshold})`;
    case "recorded":
      return f.probability !== null ? `Recorded · ${Math.round(f.probability)}%` : "Recorded";
    case "matching":
      return f.probability !== null ? `Match · ${Math.round(f.probability)}%` : "Match";
    default:
      return "Normal";
  }
}

function fmt(v: number) {
  const a = Math.abs(v);
  return v.toFixed(a >= 1000 ? 0 : a >= 10 ? 1 : 2);
}

const signed = (v: number, text: string) => `${v > 0 ? "+" : v < 0 ? "−" : "±"}${text}`;

export function deviationText(s: DxSensor | undefined): string | null {
  if (!s || s.value === null || s.model === null || !Number.isFinite(s.value) || !Number.isFinite(s.model)) return null;
  const d = s.value - s.model;
  if (s.unit === "%") return signed(d, `${fmt(Math.abs(d))} pp`);
  const pct = Math.abs(s.model) > 1e-6 ? (d / Math.abs(s.model)) * 100 : Infinity;
  if (!Number.isFinite(pct) || Math.abs(pct) > 1000) return signed(d, `${fmt(Math.abs(d))} ${s.unit}`.trim());
  return signed(pct, `${Math.abs(pct) < 10 ? Math.abs(pct).toFixed(1) : Math.round(Math.abs(pct))}%`);
}

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

function limitTone(s: DxSensor | undefined): Tone | undefined {
  if (!s) return undefined;
  return s.severity === "Critical" ? "bad" : s.severity === "Alert" ? "warn" : undefined;
}

/** Clear sensor evidence table inside a fault card showing which readings are off-normal. */
function EvidenceTable({
  f,
  byTag,
  onOpenTrend,
}: {
  f: Finding;
  byTag: Map<string, DxSensor>;
  onOpenTrend?: (tag: string) => void;
}) {
  const { rows } = symptomsOf(f, byTag);
  if (!rows.length) {
    return f.evidence ? <p className="pg-diag-f-note">{f.evidence}</p> : null;
  }
  const sorted = [...rows].sort((a, b) => Number(b.state === "present") - Number(a.state === "present"));
  return (
    <div className="pg-diag-in">
      <span className="pg-diag-in-head">
        <span>Evidence sensor</span>
        <span aria-hidden="true">Current</span>
        <span aria-hidden="true">Normal / Expected</span>
        <span aria-hidden="true">Deviation</span>
      </span>
      <ul className="pg-diag-in-list">
        {sorted.map(({ tag, s, state }) => {
          const dev = deviationText(s);
          const z = zText(s?.z ?? null);
          const statusNote =
            state === "present"
              ? "Off-normal"
              : state === "absent"
                ? "Normal"
                : s
                  ? VALIDITY_LABEL[s.validity]
                  : "Invalid";
          const unit = s?.unit && s.unit !== "state" ? ` ${s.unit}` : "";
          return (
            <li key={tag} className={state === "present" ? "" : "is-quiet"}>
              <span className="pg-diag-in-sig">
                {onOpenTrend ? (
                  <button
                    type="button"
                    className="pg-diag-inline-link pg-diag-in-tag ast-num"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenTrend(tag);
                    }}
                    title={`Inspect ${tag} live trend & sensor details`}
                  >
                    {tag} ↗
                  </button>
                ) : (
                  <span className="pg-diag-in-tag ast-num">{tag}</span>
                )}
                <span className="pg-diag-in-sub">{[s?.name, statusNote].filter(Boolean).join(" · ")}</span>
              </span>
              <span className="pg-diag-in-num ast-num">
                <span className="pg-diag-val" data-tone={state === "n/a" ? undefined : limitTone(s)}>
                  {s ? (s.value !== null ? fmt(s.value) : s.display) : "—"}
                </span>
                {s?.value !== null && <span className="pg-diag-unit">{unit}</span>}
              </span>
              <span className="pg-diag-in-num ast-num pg-diag-muted">
                {s?.model != null ? `${fmt(s.model)}${unit}` : "—"}
              </span>
              <span className="pg-diag-in-num ast-num">
                {dev ?? "—"}
                {z && <span className="pg-diag-in-sub">{z}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FindingCard({
  f,
  byTag,
  onset,
  selected,
  onToggle,
  feedback,
  onFeedback,
  onAnalysis,
  onPrognosis,
  onLocatePart,
  onOpenTrend,
}: {
  f: Finding;
  byTag: Map<string, DxSensor>;
  onset: string | null;
  selected: boolean;
  onToggle: () => void;
  feedback: Feedback | null;
  onFeedback: (v: Feedback) => void;
  onAnalysis: (f: Finding) => void;
  onPrognosis: (f: Finding) => void;
  onLocatePart?: (f: Finding) => void;
  onOpenTrend?: (tag: string) => void;
}) {
  const raised = f.state === "active" || f.state === "clearing" || f.state === "recorded";
  const tone: Tone = raised ? toneOf(f.severity) : "idle";
  const [ttl] = (f.timeToLimit ?? "").split(/\s+(?=\()/);
  const numericTtl = /\d/.test(ttl ?? "");
  const where = f.where && f.where !== "DQ" ? f.where : f.tags.join(", ") || f.category;

  return (
    <Tile
      className="pg-diag-tile pg-diag-ftile"
      title={f.name}
      sub={[f.ruleId ? `Rule ${f.ruleId}` : null, where].filter(Boolean).join(" · ")}
      status={{ label: f.severity, tone }}
      tone={raised ? tone : undefined}
      value={ttl ? (numericTtl ? ttl : ttl.charAt(0).toUpperCase() + ttl.slice(1)) : undefined}
      unit={!ttl ? undefined : !numericTtl ? undefined : "to limit"}
      selected={selected}
      onSelect={f.ruleId ? onToggle : undefined}
      attrs={f.ruleId ? { "data-rule": f.ruleId } : undefined}
      facts={[
        { label: "Status", value: [f.priority, stateText(f)].filter(Boolean).join(" · ") },
        { label: "Detected", value: onset ?? "—" },
        { label: "Duration", value: f.activeFor ?? "—" },
      ]}
      foot={
        <span className="pg-diag-f-links">
          <button
            type="button"
            className="pg-diag-inline-link"
            onClick={(e) => {
              e.stopPropagation();
              onAnalysis(f);
            }}
          >
            See reason (Root cause) →
          </button>
          <button
            type="button"
            className="pg-diag-inline-link"
            onClick={(e) => {
              e.stopPropagation();
              onPrognosis(f);
            }}
          >
            See RUL &amp; forecast (Prognosis) →
          </button>
          {onLocatePart && f.tags.length > 0 && (
            <button
              type="button"
              className="pg-diag-inline-link"
              onClick={(e) => {
                e.stopPropagation();
                onLocatePart(f);
              }}
            >
              Locate part on 2D →
            </button>
          )}
        </span>
      }
      actions={
        feedback ? (
          <span className="pg-diag-tile-meta">{feedback === "confirmed" ? "Confirmed" : "Dismissed"}</span>
        ) : (
          <>
            <PillButton variant="secondary" className="pg-diag-sm" onClick={() => onFeedback("confirmed")}>
              Confirm
            </PillButton>
            <PillButton variant="secondary" className="pg-diag-sm" onClick={() => onFeedback("rejected")}>
              Dismiss
            </PillButton>
          </>
        )
      }
    >
      <dl className="pg-diag-f-do">
        {f.cause && (
          <>
            <dt>What is wrong</dt>
            <dd>{f.cause}</dd>
          </>
        )}
        {f.consequence && (
          <>
            <dt>What it impacts</dt>
            <dd>{f.consequence}</dd>
          </>
        )}
        {(f.ruleId || f.logic) && (
          <>
            <dt>Rule broken</dt>
            <dd className="ast-num">
              {f.ruleId ? `${f.ruleId}: ` : ""}
              {f.logic ?? f.evidence ?? "Threshold exceeded"}
            </dd>
          </>
        )}
        {f.action && (
          <>
            <dt>Action to take</dt>
            <dd>{f.action}</dd>
          </>
        )}
      </dl>
      <EvidenceTable f={f} byTag={byTag} onOpenTrend={onOpenTrend} />
    </Tile>
  );
}

export function FaultCandidates({
  findings,
  byTag,
  onsetOf,
  selectedRuleId,
  onSelect,
  feedback,
  onFeedback,
  onAnalysis,
  onPrognosis,
  onLocatePart,
  onOpenTrend,
  focusRuleId = null,
}: {
  focusRuleId?: string | null;
  findings: Finding[];
  live: boolean;
  byTag: Map<string, DxSensor>;
  onsetOf: (f: Finding) => string | null;
  selectedRuleId: string | null;
  onSelect: (ruleId: string | null) => void;
  feedback: Map<string, Feedback>;
  onFeedback: (f: Finding, v: Feedback) => void;
  onAnalysis: (f: Finding) => void;
  onPrognosis: (f: Finding) => void;
  onLocatePart?: (f: Finding) => void;
  onOpenTrend?: (tag: string) => void;
}) {
  const faults = findings.filter((f) => isConditionRule(f));
  const others = findings.filter((f) => !isConditionRule(f));

  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!focusRuleId) return;
    const el = rootRef.current?.querySelector<HTMLElement>(`[data-rule="${CSS.escape(focusRuleId)}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    el?.focus({ preventScroll: true });
  }, [focusRuleId]);

  const otherCols: Column<Finding>[] = [
    {
      key: "rule",
      header: "Rule",
      width: "120px",
      render: (f) => <span className="ast-mono">{f.ruleId ?? f.category}</span>,
    },
    {
      key: "what",
      header: "What is flagged",
      width: "240px",
      render: (f) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-title">{f.name}</span>
          <span className="ast-cell-sub">{f.cause || f.category}</span>
        </span>
      ),
    },
    {
      key: "evidence",
      header: "Evidence",
      render: (f) => <span className="ast-num">{f.evidence || f.tags.join(", ") || "—"}</span>,
    },
    {
      key: "action",
      header: "Action to take",
      render: (f) => f.action || "—",
    },
    {
      key: "severity",
      header: "Severity",
      width: "110px",
      render: (f) => <StatusTag tone={toneOf(f.severity)} label={f.severity} />,
    },
    {
      key: "links",
      header: "Layer drill-down",
      width: "210px",
      render: (f) => (
        <span style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
          <button type="button" className="pg-diag-inline-link" onClick={() => onAnalysis(f)}>
            See reason →
          </button>
          <button type="button" className="pg-diag-inline-link" onClick={() => onPrognosis(f)}>
            Prognosis →
          </button>
        </span>
      ),
    },
  ];

  return (
    <div className="pg-diag-fgroups" ref={rootRef}>
      <section className="pg-diag-fgroup" aria-label="Active machine faults">
        {faults.length === 0 ? (
          <p className="pg-diag-missing">No machine fault present.</p>
        ) : (
          <TileGrid label="Active machine faults" min={380} className="pg-diag-tiles">
            {faults.map((f) => (
              <FindingCard
                key={f.key}
                f={f}
                byTag={byTag}
                onset={onsetOf(f)}
                selected={!!f.ruleId && f.ruleId === selectedRuleId}
                onToggle={() => {
                  if (f.ruleId) onSelect(f.ruleId === selectedRuleId ? null : f.ruleId);
                }}
                feedback={feedback.get(f.key) ?? null}
                onFeedback={(v) => onFeedback(f, v)}
                onAnalysis={onAnalysis}
                onPrognosis={onPrognosis}
                onLocatePart={onLocatePart}
                onOpenTrend={onOpenTrend}
              />
            ))}
          </TileGrid>
        )}
      </section>

      {others.length > 0 && (
        <section className="ast-card pg-table-card" aria-label="Data quality and service alerts">
          <div className="ast-card-head">
            <h3 className="ast-card-title">Sensor data quality &amp; service alerts</h3>
          </div>
          <Table
            columns={otherCols}
            data={others}
            keyExtractor={(f) => f.key}
            onRowClick={(f) => {
              if (f.ruleId) onSelect(f.ruleId === selectedRuleId ? null : f.ruleId);
            }}
          />
        </section>
      )}
    </div>
  );
}
