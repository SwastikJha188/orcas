"use client";

import React from "react";
import type { DiagnosisRecord } from "../assets-data";
import type { SimFrame } from "@/lib/kiln-sim/engine";
import { RULE_BY_ID } from "@/lib/kiln-sim/rules";
import { SUBASSEMBLIES } from "@/lib/kiln-sim/signals";
import "./record-card.css";

/* ==========================================================================
   Diagnosis record: the AssetIQ classification for one machine, written so
   a maintenance engineer can read it at a glance — what the model sees, what
   to do, and how likely each checked fault mode is right now.

   KLN-01 runs live, so its record follows the running plant: a fault mode
   whose rule is active or developing shows that, with the rule's evidence and
   action; quiet ones keep the stored baseline. Other machines show the stored
   record as is.
   ========================================================================== */

type Tone = "good" | "warn" | "bad" | "idle";

interface Row {
  key: string;
  name: string;
  ruleId: string | null;
  where: string;
  signature: string;
  likelihood: number | null;
  state: string;
  tone: Tone;
  detail: string;
  action: string | null;
}

const toneOf = (severity: string): Tone => {
  const s = severity.toLowerCase();
  return s === "critical" || s === "danger" ? "bad" : s === "advisory" || s === "alert" || s === "warning" ? "warn" : "good";
};

/** Plain word for a likelihood, so the number never has to be interpreted alone. */
function likelihoodWord(p: number): string {
  if (p >= 60) return "Very likely";
  if (p >= 25) return "Likely";
  if (p >= 5) return "Possible";
  return "Unlikely";
}

const PRIORITY_FROM_RULE: Record<string, DiagnosisRecord["maintenancePriority"]> = { P1: "Immediate", P2: "High", P3: "Medium", P4: "Low" };
const CONDITION_TONE: Record<string, Tone> = { Nominal: "good", Advisory: "warn", Critical: "bad" };

function buildRows(record: DiagnosisRecord, frame: SimFrame | null): Row[] {
  const stored = storedRows(record, frame);
  if (!frame) return stored;
  // Live findings the stored record does not list still belong here, or the
  // list would say "none present" while the summary reports a fault.
  const listed = new Set(stored.map((r) => r.ruleId).filter(Boolean));
  const extra: Row[] = frame.rules
    .filter((r) => r.status !== "QUIET" && r.category !== "Data quality" && !listed.has(r.id))
    .map((r) => ({
      key: `live-${r.id}`,
      name: r.name,
      ruleId: r.id,
      where: r.subs.length ? r.subs.map((x) => SUBASSEMBLIES.find((sa) => sa.id === x)?.name ?? x).join(", ") : r.system,
      signature: "",
      likelihood: r.status === "ACTIVE" ? r.confidence : Math.round(r.confidence * 0.6),
      state: r.status === "ACTIVE" ? "Detected now" : "Developing",
      tone: r.status === "ACTIVE" ? (r.severity === "Critical" ? "bad" : "warn") : "warn",
      detail: r.evidence,
      action: r.action,
    }));
  return [...extra, ...stored].sort((a, b) => (b.likelihood ?? -1) - (a.likelihood ?? -1));
}

function storedRows(record: DiagnosisRecord, frame: SimFrame | null): Row[] {
  return record.findings
    .map((f, i): Row => {
      const ruleId = f.fault.match(/\((R-[A-Z]+-\d+)\)\s*$/)?.[1] ?? null;
      const rule = ruleId ? RULE_BY_ID[ruleId] : undefined;
      const live = ruleId && frame ? frame.rules.find((r) => r.id === ruleId) : undefined;
      const stored = Number(f.probability);
      const base: Row = {
        // Finding ids are not guaranteed unique within a record (cloned fleet data).
        key: `${f.id}-${i}`,
        name: rule?.name ?? f.fault.replace(/\s*\(R-[A-Z]+-\d+\)\s*$/, ""),
        ruleId,
        where: f.location,
        signature: f.frequency,
        likelihood: Number.isFinite(stored) ? stored : null,
        state: toneOf(f.severity) === "good" ? "Not detected" : "Detected",
        tone: toneOf(f.severity),
        detail: f.recommendation,
        action: null,
      };
      if (!live || live.status === "QUIET") return base;
      const active = live.status === "ACTIVE";
      return {
        ...base,
        likelihood: active ? live.confidence : Math.round(live.confidence * 0.6),
        state: active ? "Detected now" : "Developing",
        tone: active ? (live.severity === "Critical" ? "bad" : "warn") : "warn",
        detail: live.evidence,
        action: live.action,
      };
    })
    .sort((a, b) => (b.likelihood ?? -1) - (a.likelihood ?? -1));
}

export function DiagnosisRecordCard({
  record,
  loading,
  failed,
  machineId,
  frame,
}: {
  record: DiagnosisRecord | null;
  loading: boolean;
  failed: boolean;
  machineId: string;
  frame: SimFrame | null;
}) {
  if (loading || failed || !record) {
    return (
      <div className="dxo-card dxo-span-12">
        <div className="dxo-card-head">
          <h3 className="dxo-card-title">Diagnosis record</h3>
        </div>
        <div className="dxo-empty">
          {loading ? "Loading diagnosis record…" : failed ? "Diagnosis records could not be loaded" : `No diagnosis record stored for ${machineId}`}
        </div>
      </div>
    );
  }

  const rows = buildRows(record, frame);
  // Live machine: what the running plant says overrides the stored headline.
  const liveActive = frame ? frame.rules.filter((r) => r.status === "ACTIVE" && r.category !== "Data quality") : [];
  const lead = [...liveActive].sort((a, b) => (a.priority < b.priority ? -1 : 1))[0];
  const condition = frame ? (frame.condition === "Healthy" ? "Nominal" : frame.condition) : record.overallCondition;
  const priority = lead ? PRIORITY_FROM_RULE[lead.priority] ?? record.maintenancePriority : frame ? "Low" : record.maintenancePriority;
  const detected = rows.filter((r) => r.tone !== "good").length;

  return (
    <div className="dxo-card dxo-span-12 dxr-card">
      <div className="dxr-head">
        <div className="dxr-titles">
          <h3 className="dxo-card-title">Diagnosis record</h3>
          <span className="dxr-meta">
            {record.engineVersion} · model confidence {Number(record.confidence).toFixed(1)} %
            {frame && <span className="dxr-live"> · updated live</span>}
          </span>
        </div>
        <div className="dxr-status">
          <span className="ast-chip" data-tone={CONDITION_TONE[condition] ?? "idle"}>
            <span className="ast-chip-dot" />
            {condition}
          </span>
          <span className="dxr-priority">{priority} priority</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="dxo-empty">No fault modes in this record</div>
      ) : (
        <>
          <div className="dxr-list-head">
            <h4>
              Fault modes checked <span className="ast-num">{rows.length}</span>
            </h4>
            <span className="dxr-caption">{detected === 0 ? "None present" : `${detected} present or developing`} · likelihood that each fault is present now</span>
          </div>
          <ul className="dxr-list">
            {rows.map((r) => {
              const p = r.likelihood;
              return (
                <li key={r.key} className="dxr-row" data-tone={r.tone}>
                  <div className="dxr-what">
                    <span className="dxr-name">
                      <span className="dxr-dot" aria-hidden="true" />
                      {r.name}
                      {r.ruleId && <code className="dxr-rule">{r.ruleId}</code>}
                    </span>
                    <span className="dxr-where">{r.where}</span>
                  </div>
                  <div className="dxr-odds" aria-label={p === null ? "Likelihood not recorded" : `${likelihoodWord(p)}, ${p.toFixed(1)} percent`}>
                    <span className="dxr-bar" aria-hidden="true">
                      <i style={{ width: `${Math.max(2, Math.min(100, p ?? 0))}%` }} />
                    </span>
                    <span className="dxr-pct ast-num">{p === null ? "—" : `${p < 10 ? p.toFixed(1) : Math.round(p)} %`}</span>
                    <span className="dxr-word">{p === null ? "" : likelihoodWord(p)}</span>
                  </div>
                  <span className="dxr-state">{r.state}</span>
                  <p className="dxr-detail">
                    {/[.!?]$/.test(r.detail.trim()) ? r.detail : `${r.detail}.`}
                    {r.signature && <span className="dxr-sig"> Signature: {r.signature}.</span>}
                    {r.action && <span className="dxr-do"> Do: {r.action}</span>}
                  </p>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
