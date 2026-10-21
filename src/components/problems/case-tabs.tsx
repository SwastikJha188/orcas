"use client";

/**
 * The three tabs of the case page's main column:
 * Diagnosis (what the readings say now, what was seen, how they moved),
 * Prognosis (is it getting worse, time left, what happens if it does),
 * Analysis (possible causes and the checks that test them).
 */
import React, { useState } from "react";
import { ConfirmAction, Dialog, Field, FieldGrid, PillButton, Select, Table, TextArea, TextInput, type Column, Loading } from "@/components/ui";
import { VALIDITY_WORDS, validityTone, type Validity } from "@/components/ui/status";
import { StatusTag } from "@/components/assets/assets-shell-ui";
import { useApi } from "@/lib/api-cache";
import type { RulItem } from "@shared/types/insights";
import { casesApi, type CaseCause, type CaseReading } from "./cases-api";
import { ReadingChart } from "./case-chart";
import { CAUSE_TONE, CaseCard, ErrorNote, num, useCase, useSave } from "./case-shared";

/* ------------------------------------------------------------------ */
/* Diagnosis                                                           */
/* ------------------------------------------------------------------ */

/** Stored reading quality codes (quality_codes) and the app's own words → the one validity scale. */
const VALIDITY: Record<string, Validity> = {
  good: "Valid",
  valid: "Valid",
  uncertain: "Suspect",
  suspect: "Suspect",
  stale: "Stale",
  missing: "No data",
  invalid: "Invalid",
  bad: "Invalid",
  overrange: "Invalid",
  underrange: "Invalid",
  clipped: "Invalid",
};
const validityOf = (q: string | null): Validity => (q ? (VALIDITY[q.toLowerCase()] ?? "No data") : "No data");

export function DiagnosisTab() {
  const { c, when } = useCase();
  const [knowOpen, setKnowOpen] = useState(false);
  const [runOpen, setRunOpen] = useState(false);

  const columns: Column<CaseReading>[] = [
    { key: "name", header: "Reading", render: (r) => <span className="ast-cell-title">{r.name}</span> },
    {
      key: "now",
      header: "Now",
      width: "130px",
      render: (r) =>
        r.value !== null ? (
          <span className="case-value">
            {num(r.value)}
            {r.unit && <span className="ast-unit">{r.unit}</span>}
          </span>
        ) : r.state ? (
          r.state
        ) : (
          <span className="ast-muted">—</span>
        ),
    },
    { key: "normal", header: "Normal range", render: (r) => r.normal ?? <span className="ast-muted">Not stored</span> },
    {
      key: "quality",
      header: "Reading quality",
      width: "150px",
      render: (r) => {
        const v = validityOf(r.quality);
        return <StatusTag tone={validityTone(v)} label={VALIDITY_WORDS[v]} />;
      },
    },
    { key: "source", header: "Where it comes from", render: (r) => r.source },
    { key: "ref", header: "Normal values stored", width: "150px", render: (r) => (r.hasReference ? "Yes" : "No") },
  ];

  return (
    <div className="case-grid">
      <CaseCard
        title="Readings for this case"
        id="case-readings"
        className="case-wide pg-table-card"
        actions={
          <PillButton variant="secondary" onClick={() => setKnowOpen(true)}>
            What we know now
          </PillButton>
        }
      >
        {c.readings.length ? (
          <Table columns={columns} data={c.readings} keyExtractor={(r) => r.measurementId} />
        ) : (
          <p className="ast-muted case-empty case-pad">No readings are linked to this case.</p>
        )}
        <div className="case-know case-pad">
          <span className="case-label">What we know now</span>
          <span className="case-strong">{c.assessmentWord}</span>
          {c.assessmentNote && <p className="case-text">{c.assessmentNote}</p>}
        </div>
      </CaseCard>

      <CaseCard
        title="What was seen and how it was running"
        id="case-seen"
        className="case-wide"
        actions={
          <PillButton variant="secondary" onClick={() => setRunOpen(true)}>
            Edit
          </PillButton>
        }
      >
        <p className="case-text">{c.observation}</p>
        <dl className="case-facts">
          <div>
            <dt>Machine was</dt>
            <dd>
              {c.runningWord}
              {c.runningNote && <span className="case-sub">{c.runningNote}</span>}
            </dd>
          </div>
          <div>
            <dt>The plant&apos;s own record</dt>
            <dd>
              {c.plantRunning ? (
                <>
                  The plant has it as {c.plantRunning.mode.toLowerCase()} since {when(c.plantRunning.since)}
                  {c.plantRunning.reason && <span className="case-sub">{c.plantRunning.reason}</span>}
                </>
              ) : (
                <span className="ast-muted">The plant has not recorded how it is running.</span>
              )}
            </dd>
          </div>
        </dl>
      </CaseCard>

      <ReadingChart idPrefix="dx" />

      {knowOpen && <KnowDialog onClose={() => setKnowOpen(false)} />}
      {runOpen && <RunningDialog onClose={() => setRunOpen(false)} />}
    </div>
  );
}

function KnowDialog({ onClose }: { onClose: () => void }) {
  const { c, vocab } = useCase();
  const save = useSave();
  const [assessment, setAssessment] = useState<string>(c.assessment);
  const [note, setNote] = useState(c.assessmentNote ?? "");
  const [next, setNext] = useState(c.nextAction ?? "");
  const submit = async () => {
    const patch: Record<string, unknown> = {};
    if (assessment !== c.assessment) patch.assessment = assessment;
    if (note.trim() !== (c.assessmentNote ?? "")) patch.assessmentNote = note.trim() || null;
    if (next.trim() !== (c.nextAction ?? "")) patch.nextAction = next.trim() || null;
    if (!Object.keys(patch).length) return onClose();
    if (await save.run(() => casesApi.update(c.id, patch))) onClose();
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title="What we know now"
      subtitle={c.title}
      busy={save.busy}
      onSubmit={() => void submit()}
      footerStart={<ErrorNote error={save.error} />}
      footer={
        <>
          <PillButton variant="secondary" onClick={onClose} disabled={save.busy}>
            Cancel
          </PillButton>
          <PillButton type="submit" loading={save.busy}>
            Save
          </PillButton>
        </>
      }
    >
      <FieldGrid>
        <Field label="What we know now" wide>
          {(id) => <Select id={id} value={assessment} onChange={setAssessment} options={vocab?.assessments ?? [{ value: c.assessment, label: c.assessmentWord }]} />}
        </Field>
        <Field label="Notes" wide>
          {(id) => <TextArea id={id} value={note} onChange={setNote} rows={4} />}
        </Field>
        <Field label="Next step" wide hint="One thing a person should do next.">
          {(id, d) => <TextInput id={id} describedBy={d} value={next} onChange={setNext} />}
        </Field>
      </FieldGrid>
    </Dialog>
  );
}

function RunningDialog({ onClose }: { onClose: () => void }) {
  const { c, vocab } = useCase();
  const save = useSave();
  const [mode, setMode] = useState<string>(c.runningMode);
  const [note, setNote] = useState(c.runningNote ?? "");
  const submit = async () => {
    const patch: Record<string, unknown> = {};
    if (mode !== c.runningMode) patch.runningMode = mode;
    if (note.trim() !== (c.runningNote ?? "")) patch.runningNote = note.trim() || null;
    if (!Object.keys(patch).length) return onClose();
    if (await save.run(() => casesApi.update(c.id, patch))) onClose();
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title="How the machine was running"
      subtitle={c.machineName}
      busy={save.busy}
      onSubmit={() => void submit()}
      footerStart={<ErrorNote error={save.error} />}
      footer={
        <>
          <PillButton variant="secondary" onClick={onClose} disabled={save.busy}>
            Cancel
          </PillButton>
          <PillButton type="submit" loading={save.busy}>
            Save
          </PillButton>
        </>
      }
    >
      <FieldGrid>
        <Field label="When it was seen, the machine was" wide>
          {(id) => <Select id={id} value={mode} onChange={setMode} options={vocab?.modes ?? [{ value: c.runningMode, label: c.runningWord }]} />}
        </Field>
        <Field label="Notes" wide hint="Load, speed or settings that were different from usual.">
          {(id, d) => <TextArea id={id} describedBy={d} value={note} onChange={setNote} rows={4} />}
        </Field>
      </FieldGrid>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Prognosis                                                           */
/* ------------------------------------------------------------------ */

export function PrognosisTab() {
  const { c } = useCase();
  const insights = useApi<{ prognosis?: { rul?: RulItem[] } }>(c.partId ? `/api/insights?machineId=${encodeURIComponent(c.machineId)}` : null);
  const row = insights.data?.prognosis?.rul?.find((r) => r.id === c.partId) ?? null;

  return (
    <div className="case-grid">
      <CaseCard title="Is it getting worse?" id="case-worse">
        <span className="case-big" data-tone={c.progression.tone}>
          {c.progression.label}
        </span>
        <p className="case-text case-muted">{c.progression.basis}</p>
      </CaseCard>

      <CaseCard title="Time left" id="case-time">
        {!c.partId ? (
          <p className="ast-muted">Pick a part in Details to see its time left.</p>
        ) : insights.isLoading && !insights.data ? (
          <Loading label="Working out the time left…" inline />
        ) : insights.error && !insights.data ? (
          <p className="ast-muted">Could not work out the time left. Reload the page to try again.</p>
        ) : (
          <>
            <span className="case-big" data-tone={row?.hours !== null && row?.hours !== undefined ? (row.hours < 48 ? "bad" : "warn") : "idle"}>
              {row?.dueLabel ?? "No reading is moving toward its limit"}
            </span>
            <p className="case-text case-muted">For {c.partName ?? "this part"}: how long until a reading reaches its alarm limit if it keeps moving as it is now.</p>
          </>
        )}
      </CaseCard>

      <CaseCard title="If it gets worse" id="case-affects" className="case-wide">
        <p className="case-text">{c.rule?.affects ?? (c.origin === "manual" ? "Not known for a case started by hand." : "Not known yet.")}</p>
        <span className="case-label">What to do</span>
        <p className="case-text">{c.rule?.todo ?? c.nextAction ?? <span className="ast-muted">No next step yet.</span>}</p>
      </CaseCard>

      <ReadingChart idPrefix="px" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Analysis                                                            */
/* ------------------------------------------------------------------ */

export function AnalysisTab() {
  const { c, askCheck } = useCase();
  const save = useSave();
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");

  const add = async () => {
    if (!text.trim()) return save.setError("Type the possible cause.");
    if (await save.run(() => casesApi.addCause(c.id, text.trim()))) {
      setText("");
      setAdding(false);
    }
  };

  const columns: Column<CaseCause>[] = [
    { key: "text", header: "Possible cause", render: (x) => <span className="case-wrap">{x.text}</span> },
    { key: "status", header: "What the checks say", width: "190px", render: (x) => <StatusTag tone={CAUSE_TONE[x.status] ?? "idle"} label={x.statusWord} /> },
    { key: "checks", header: "Checks", width: "80px", render: (x) => x.checks },
    {
      key: "act",
      header: "",
      render: (x) => (
        <span className="case-row-actions">
          <PillButton variant="secondary" onClick={() => askCheck({ causeId: x.id })}>
            Add a check
          </PillButton>
          <ConfirmAction
            label="Remove"
            question={x.checks ? `Remove? Its ${x.checks === 1 ? "check stays" : `${x.checks} checks stay`} on the case.` : "Remove this cause?"}
            confirmLabel="Remove"
            keepLabel="Keep it"
            disabled={save.busy}
            onConfirm={() => void save.run(() => casesApi.removeCause(c.id, x.id))}
          />
        </span>
      ),
    },
  ];

  const hasGuide = Boolean(c.guide && c.guide.checks.length);
  return (
    <div className="case-grid">
      <CaseCard title="Possible causes" id="case-causes" className="case-wide pg-table-card">
        {c.causes.length ? (
          <Table columns={columns} data={c.causes} keyExtractor={(x) => String(x.id)} />
        ) : (
          <p className="ast-muted case-empty case-pad">No possible causes yet. Add one to start checking it.</p>
        )}
        <div className="case-pad case-add">
          {adding ? (
            <form
              className="case-add-row"
              onSubmit={(e) => {
                e.preventDefault();
                void add();
              }}
            >
              <span className="case-add-input">
                <TextInput id="case-new-cause" ariaLabel="Possible cause" value={text} onChange={setText} placeholder="For example: The drive end bearing is worn" autoFocus />
              </span>
              <PillButton type="submit" loading={save.busy}>
                Add
              </PillButton>
              <PillButton
                variant="secondary"
                disabled={save.busy}
                onClick={() => {
                  setAdding(false);
                  setText("");
                  save.clear();
                }}
              >
                Cancel
              </PillButton>
            </form>
          ) : (
            <PillButton variant="secondary" onClick={() => setAdding(true)}>
              + Add a possible cause
            </PillButton>
          )}
          <ErrorNote error={save.error} />
          <p className="case-help">The status comes from the checks: a finished check either points to a cause, rules it out, or is not clear.</p>
        </div>
      </CaseCard>

      <CaseCard title="What it affects" id="case-affects-an" className={hasGuide ? "" : "case-wide"}>
        {c.rule?.what && <p className="case-text">{c.rule.what}</p>}
        <p className="case-text">{c.rule?.affects ?? <span className="ast-muted">Not known yet.</span>}</p>
      </CaseCard>

      {hasGuide && c.guide && (
        <CaseCard title="Checks the guide suggests" id="case-guide">
          <span className="case-sub">{c.guide.title}</span>
          <ul className="case-list">
            {c.guide.checks.map((g, i) => (
              <li key={i} className="case-list-row">
                <span className="case-wrap">{g}</span>
                <PillButton variant="secondary" onClick={() => askCheck({ detail: g })}>
                  Ask for this check
                </PillButton>
              </li>
            ))}
          </ul>
        </CaseCard>
      )}
    </div>
  );
}
