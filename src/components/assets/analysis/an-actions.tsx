"use client";

import React, { useCallback, useEffect, useState } from "react";
import { PillButton, Table, type Column } from "@/components/ui";
import type { AssetsSubPage } from "../assets-view";
import { DIAGNOSIS_SECTION_KEY } from "../diagnosis-view";
import { Chevron, PRIORITIES, Section, openActions } from "./an-ui";
import { SECTION_IDS, liveRules, machineFaults, type SectionProps } from "./an-derive";
import { isConditionRule } from "@/lib/plant-defs";

export function openDiagnosisAt(section: string, go: (sub: AssetsSubPage) => void): void {
  try {
    sessionStorage.setItem(DIAGNOSIS_SECTION_KEY, section);
  } catch {
    /* storage unavailable */
  }
  go("diagnosis");
}

export type FeedbackLabel = "confirm" | "false-alarm" | "new-normal";
export const FEEDBACK: { id: FeedbackLabel; label: string }[] = [
  { id: "confirm", label: "Confirm fault" },
  { id: "false-alarm", label: "False alarm" },
  { id: "new-normal", label: "New normal" },
];

export interface FeedbackStore {
  labels: Record<string, { label: FeedbackLabel; at: string }>;
  set: (finding: string, label: FeedbackLabel | null) => void;
}

export function useFeedbackLabels(machineId: string): FeedbackStore {
  const key = `ultron.analysis.labels.${machineId}`;
  const [labels, setLabels] = useState<FeedbackStore["labels"]>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      setLabels(raw ? JSON.parse(raw) : {});
    } catch {
      setLabels({});
    }
  }, [key]);
  const set = useCallback(
    (finding: string, label: FeedbackLabel | null) => {
      setLabels((prev) => {
        const next = { ...prev };
        if (label === null) delete next[finding];
        else next[finding] = { label, at: new Date().toISOString() };
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          /* storage unavailable */
        }
        return next;
      });
    },
    [key],
  );
  return { labels, set };
}

/** Feedback — operator verification table per open finding. */
export function AnActions({ insights, frame, go, feedback }: SectionProps & { feedback: FeedbackStore }) {
  const a = insights.analysis;
  const actions = [...openActions(a)].sort((x, y) => PRIORITIES.indexOf(x.priority) - PRIORITIES.indexOf(y.priority));
  const findings = frame
    ? liveRules(frame)
        .filter((r) => isConditionRule(r))
        .map((r) => ({ id: r.id, name: r.name, state: r.status === "ACTIVE" ? "Confirmed" : `Confirming (${r.persistence}/${r.threshold})` }))
    : machineFaults(a).map((f) => ({ id: f.id, name: f.label, state: f.severity }));

  const cols: Column<(typeof findings)[number]>[] = [
    { key: "id", header: "Rule", width: "120px", render: (f) => <span className="ast-mono">{f.id}</span> },
    { key: "name", header: "What is wrong", render: (f) => <strong>{f.name}</strong> },
    { key: "state", header: "Status", width: "160px", render: (f) => <span className="ast-num">{f.state}</span> },
    {
      key: "feedback",
      header: "Operator verification",
      width: "340px",
      render: (f) => {
        const cur = feedback.labels[f.id]?.label ?? null;
        return (
          <span className="pg-analysis-feedback" role="group" aria-label={`Label ${f.id}`}>
            {FEEDBACK.map((b) => (
              <PillButton key={b.id} variant="secondary" pressed={cur === b.id} onClick={() => feedback.set(f.id, cur === b.id ? null : b.id)}>
                {b.label}
              </PillButton>
            ))}
          </span>
        );
      },
    },
  ];

  return (
    <Section id={SECTION_IDS.actions} title="Feedback" bare>
      {actions.length > 0 && (
        <section className="ast-card pg-an-card">
          <div className="pg-analysis-pointer" role="group" aria-label="Actions">
            <span className="pg-analysis-pointer-line ast-num">
              {actions.length} open action{actions.length === 1 ? "" : "s"}
              {PRIORITIES.filter((p) => actions.some((x) => x.priority === p))
                .map((p) => ` · ${actions.filter((x) => x.priority === p).length} ${p}`)
                .join("")}
              {` · first: ${actions[0].title}`}
            </span>
            <PillButton variant="secondary" className="pg-analysis-link" trailing={<Chevron />} onClick={() => openDiagnosisAt("dx-diagnosis", go)}>
              Faults in Diagnosis
            </PillButton>
          </div>
        </section>
      )}

      {findings.length > 0 && (
        <section className="ast-card pg-table-card" aria-label="Operator feedback per finding">
          <Table columns={cols} data={findings} keyExtractor={(f) => f.id} />
        </section>
      )}
    </Section>
  );
}
