"use client";

import React, { useCallback, useEffect, useState } from "react";
import { PillButton, Tile, TileGrid } from "@/components/ui";
import type { AssetsSubPage } from "../assets-view";
import { DIAGNOSIS_SECTION_KEY } from "../diagnosis-view";
import { Chevron, PRIORITIES, Section, openActions } from "./an-ui";
import { SECTION_IDS, liveRules, machineFaults, type SectionProps } from "./an-derive";
import { isConditionRule } from "@/lib/plant-defs";

/** Open Diagnosis scrolled to one of its sections ("dx-alarms", "dx-diagnosis", "dx-evidence"). */
export function openDiagnosisAt(section: string, go: (sub: AssetsSubPage) => void): void {
  try {
    sessionStorage.setItem(DIAGNOSIS_SECTION_KEY, section);
  } catch {
    /* storage unavailable: Diagnosis opens at the top */
  }
  go("diagnosis");
}

/* ------------------------------------------------------------------ */
/* Operator feedback labels                                           */
/* ------------------------------------------------------------------ */

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

/**
 * Labels per finding. There is no server store for operator labels yet (the
 * prediction ledger only records outcomes), so they are kept in this
 * browser's localStorage per machine.
 */
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
          /* storage unavailable: label kept for this view only */
        }
        return next;
      });
    },
    [key],
  );
  return { labels, set };
}

/** Feedback — operator labels on each open finding; each fault's verify action and owner live on Diagnosis (one linked summary line here). */
export function AnActions({ insights, frame, go, feedback }: SectionProps & { feedback: FeedbackStore }) {
  const a = insights.analysis;
  const actions = [...openActions(a)].sort((x, y) => PRIORITIES.indexOf(x.priority) - PRIORITIES.indexOf(y.priority));
  const findings = frame
    ? liveRules(frame)
        .filter((r) => isConditionRule(r))
        .map((r) => ({ id: r.id, name: r.name, state: r.status === "ACTIVE" ? "confirmed" : `pending ${r.persistence}/${r.threshold}` }))
    : machineFaults(a).map((f) => ({ id: f.id, name: f.label, state: f.severity }));

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
              {` · first ${actions[0].title}`}
            </span>
            <PillButton variant="secondary" className="pg-analysis-link" trailing={<Chevron />} onClick={() => openDiagnosisAt("dx-diagnosis", go)}>
              Faults in Diagnosis
            </PillButton>
          </div>
        </section>
      )}

      {findings.length > 0 && (
        <>
          <h4 className="ui-tiles-head">
            <span>
              Labels <b>{findings.length}</b>
            </span>
            <span>stored in this browser</span>
          </h4>
          <TileGrid label="Labels per finding" min={340} className="pg-an-labels">
            {findings.map((f) => {
              const cur = feedback.labels[f.id]?.label ?? null;
              return (
                <Tile
                  key={f.id}
                  title={f.id}
                  sub={f.name}
                  status={{ label: f.state }}
                  actions={
                    <span className="pg-analysis-feedback" role="group" aria-label={`Label ${f.id}`}>
                      {FEEDBACK.map((b) => (
                        <PillButton key={b.id} variant="secondary" pressed={cur === b.id} onClick={() => feedback.set(f.id, cur === b.id ? null : b.id)}>
                          {b.label}
                        </PillButton>
                      ))}
                    </span>
                  }
                />
              );
            })}
          </TileGrid>
        </>
      )}
    </Section>
  );
}
