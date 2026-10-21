"use client";

import React, { useCallback, useMemo, useState } from "react";
import { revalidateApi, useApi } from "@/lib/api-cache";
import type { MachineVerdictsDto } from "@backend/services/verdict-service";
import { PillButton, Table, type Column } from "@/components/ui";
import type { AssetsSubPage } from "../assets-view";
import { DIAGNOSIS_SECTION_KEY } from "../diagnosis-view";
import { Chevron, Section, openActions, priorityRank } from "./an-ui";
import { useWorkOrderPriorities } from "@/lib/reference-data";
import { SECTION_IDS, liveRules, machineFaults, type SectionProps } from "./an-derive";
import { isConditionRule } from "@shared/lib/plant-defs";

export function openDiagnosisAt(section: string, go: (sub: AssetsSubPage) => void): void {
  try {
    sessionStorage.setItem(DIAGNOSIS_SECTION_KEY, section);
  } catch {
    /* storage unavailable */
  }
  go("diagnosis");
}

/** An answer id from verdict_kinds (e.g. "confirm", "false-alarm", "new-normal"). */
export type FeedbackLabel = string;

export interface FeedbackStore {
  /** The answer words, from the database (verdict_kinds). */
  kinds: { id: string; name: string }[];
  /** Current answer by rule code, with who gave it and when. */
  labels: Record<string, { label: FeedbackLabel; at: string; by: string | null }>;
  set: (finding: string, label: FeedbackLabel | null) => void;
  /** Rule code whose answer is being saved. */
  busy: string | null;
  error: string | null;
}

/**
 * "Is this problem real?" answers for one machine, stored for everyone (/api/machines/:id/verdicts).
 * A click shows at once; if the save fails the answer goes back and the error is shown.
 */
export function useFeedbackLabels(machineId: string): FeedbackStore {
  const url = `/api/machines/${encodeURIComponent(machineId)}/verdicts`;
  const { data } = useApi<MachineVerdictsDto>(url);
  const [pending, setPending] = useState<Record<string, FeedbackLabel | null>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const labels = useMemo(() => {
    const out: FeedbackStore["labels"] = {};
    for (const [code, v] of Object.entries(data?.byRule ?? {})) out[code] = { label: v.kind, at: v.at, by: v.by };
    for (const [code, label] of Object.entries(pending)) {
      if (label === null) delete out[code];
      else out[code] = { label, at: new Date().toISOString(), by: null };
    }
    return out;
  }, [data, pending]);
  const set = useCallback(
    async (finding: string, label: FeedbackLabel | null) => {
      setPending((p) => ({ ...p, [finding]: label }));
      setBusy(finding);
      setError(null);
      try {
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ruleCode: finding, kind: label }) });
        const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        if (!res.ok) throw new Error(json?.error?.message ?? "Could not save the answer. Try again.");
        await revalidateApi(url);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save the answer. Try again.");
      } finally {
        setPending((p) => {
          const next = { ...p };
          delete next[finding];
          return next;
        });
        setBusy(null);
      }
    },
    [url],
  );
  return { kinds: data?.kinds ?? [], labels, set: (f, l) => void set(f, l), busy, error };
}

/** Feedback — operator verification table per open finding. */
export function AnActions({ insights, frame, go, feedback }: SectionProps & { feedback: FeedbackStore }) {
  const a = insights.analysis;
  const priorities = useWorkOrderPriorities();
  const actions = [...openActions(a)].sort((x, y) => priorityRank(x.priority, priorities) - priorityRank(y.priority, priorities));
  const findings = frame
    ? liveRules(frame)
        .filter((r) => isConditionRule(r))
        .map((r) => ({ id: r.id, name: r.plainTitle || r.name, state: r.status === "ACTIVE" ? "Confirmed" : `Being checked (${r.persistence} of ${r.threshold})` }))
    : machineFaults(a).map((f) => ({ id: f.id, name: f.label, state: f.severity }));

  const cols: Column<(typeof findings)[number]>[] = [
    { key: "id", header: "Code", width: "120px", render: (f) => <span className="ast-mono">{f.id}</span> },
    { key: "name", header: "What is wrong", render: (f) => <strong>{f.name}</strong> },
    { key: "state", header: "Status", width: "160px", render: (f) => <span className="ast-num">{f.state}</span> },
    {
      key: "feedback",
      header: "Is this problem real?",
      width: "340px",
      render: (f) => {
        const cur = feedback.labels[f.id]?.label ?? null;
        return (
          <span className="pg-analysis-feedback" role="group" aria-label={`Is ${f.name} a real problem?`}>
            {feedback.kinds.map((b) => (
              <PillButton key={b.id} variant="secondary" pressed={cur === b.id} loading={feedback.busy === f.id && cur === b.id} onClick={() => feedback.set(f.id, cur === b.id ? null : b.id)}>
                {b.name}
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
              {actions.length} job{actions.length === 1 ? "" : "s"} still to do
              {(priorities ?? [])
                .map((p) => p.name)
                .filter((p) => actions.some((x) => x.priority === p))
                .map((p) => ` · ${actions.filter((x) => x.priority === p).length} ${p}`)
                .join("")}
              {` · first: ${actions[0].title}`}
            </span>
            <PillButton variant="secondary" className="pg-analysis-link" trailing={<Chevron />} onClick={() => openDiagnosisAt("dx-diagnosis", go)}>
              See current problems
            </PillButton>
          </div>
        </section>
      )}

      {findings.length > 0 && (
        <section className="ast-card pg-table-card" aria-label="Operator answer for each problem">
          <Table columns={cols} data={findings} keyExtractor={(f) => f.id} />
        </section>
      )}
    </Section>
  );
}
