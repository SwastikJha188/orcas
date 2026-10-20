"use client";

/**
 * Shared pieces of the case page (case-view.tsx): the case context every card
 * reads, the save hook (busy + plain error), small display helpers and the
 * dialogs more than one card opens (ask for a check, send to maintenance).
 */
import React, { createContext, useContext, useState } from "react";
import { Dialog, Field, FieldGrid, FormNote, PillButton, Select, TextArea, TextInput } from "@/components/ui";
import type { Tone } from "@/components/ui/status";
import { formatLocalTime } from "@/lib/time";
import { CaseApiError, casesApi, type CaseDetail, type CaseVocabulary, type Choice } from "./cases-api";

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

export interface CaseCtx {
  c: CaseDetail;
  vocab: CaseVocabulary | undefined;
  /** Users people can pick (owner, who does a check). */
  people: Choice[];
  /** The plant's time zone (undefined: the viewer's). */
  timeZone: string | undefined;
  /** A time in the plant's own zone. */
  when: (t: string | null | undefined) => string;
  /** Opens the ask-for-a-check dialog, optionally for one cause or with the text filled in. */
  askCheck: (pre?: { causeId?: number | null; detail?: string }) => void;
  /** Opens the send-to-maintenance dialog. */
  sendToMaintenance: () => void;
}

const Ctx = createContext<CaseCtx | null>(null);
export const CaseProvider = Ctx.Provider;

export function useCase(): CaseCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCase outside the case page");
  return v;
}

/* ------------------------------------------------------------------ */
/* Saving                                                              */
/* ------------------------------------------------------------------ */

/** Runs one write at a time; keeps its plain error for the note next to the action. */
export function useSave() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<unknown>): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      return true;
    } catch (e) {
      setError(e instanceof CaseApiError ? e.message : "Could not reach the server. Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run, setError, clear: () => setError(null) };
}

export function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return <FormNote tone="bad">{error}</FormNote>;
}

/* ------------------------------------------------------------------ */
/* Display helpers                                                     */
/* ------------------------------------------------------------------ */

export const PRIORITY_TONE: Record<string, Tone> = { urgent: "bad", priority: "warn", routine: "idle", unassigned: "idle" };
export const CAUSE_TONE: Record<string, Tone> = { not_checked: "idle", being_checked: "info", supported: "warn", ruled_out: "good", unclear: "idle" };
export const RESULT_TONE: Record<string, Tone> = { supports: "warn", rules_out: "good", unclear: "idle" };

/** A reading in plain digits: fewer decimals as the number grows. */
export function num(v: number): string {
  const a = Math.abs(v);
  const d = a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : 3;
  return v.toLocaleString("en-GB", { maximumFractionDigits: d, minimumFractionDigits: 0 });
}

export const timeOf = (timeZone: string | undefined) => (t: string | null | undefined) => (t ? formatLocalTime(t, { date: true, seconds: false, timeZone }) : "—");

/** Card shell: title row with optional actions, then the body. */
export function CaseCard({
  title,
  id,
  actions,
  className = "",
  children,
}: {
  title: React.ReactNode;
  id: string;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`ast-card case-card ${className}`.trim()} aria-labelledby={id}>
      <div className="ast-card-head">
        <h2 className="ast-card-title" id={id}>
          {title}
        </h2>
        {actions && <span className="case-card-actions">{actions}</span>}
      </div>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Ask for a check                                                     */
/* ------------------------------------------------------------------ */

const TEAM = "__team__";

/** Mount only while open (each opening starts a fresh form). */
export function CheckDialog({ pre, onClose }: { pre: { causeId?: number | null; detail?: string } | null; onClose: () => void }) {
  const { c, vocab, people } = useCase();
  const save = useSave();
  const [kind, setKind] = useState(vocab?.checks[0]?.value ?? "");
  const [causeId, setCauseId] = useState(pre?.causeId ? String(pre.causeId) : "");
  const [who, setWho] = useState(c.ownerId ?? "");
  const [team, setTeam] = useState("");
  const [detail, setDetail] = useState(pre?.detail ?? "");

  const submit = async () => {
    if (!detail.trim()) return save.setError("Say what exactly to check.");
    if (!who) return save.setError("Pick who should do it.");
    if (who === TEAM && !team.trim()) return save.setError("Type the name of the team.");
    const ok = await save.run(() =>
      casesApi.addCheck(c.id, {
        kind: kind || (vocab?.checks[0]?.value ?? "inspection"),
        detail: detail.trim(),
        causeId: causeId ? Number(causeId) : null,
        assigneeUserId: who === TEAM ? null : who,
        assigneeText: who === TEAM ? team.trim() : null,
      }),
    );
    if (ok) onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Ask for a check"
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
            Add the check
          </PillButton>
        </>
      }
    >
      <FieldGrid>
        <Field label="What is needed" required>
          {(id) => <Select id={id} value={kind} onChange={setKind} options={vocab?.checks ?? []} />}
        </Field>
        <Field label="For which possible cause">
          {(id) => (
            <Select
              id={id}
              value={causeId}
              onChange={setCauseId}
              options={[{ value: "", label: "Not for one cause" }, ...c.causes.map((x) => ({ value: String(x.id), label: x.text }))]}
            />
          )}
        </Field>
        <Field label="Who should do it" required>
          {(id) => (
            <Select
              id={id}
              value={who}
              onChange={setWho}
              options={[{ value: "", label: "Pick a person or a team" }, ...people, { value: TEAM, label: "A team (type its name)" }]}
            />
          )}
        </Field>
        {who === TEAM ? (
          <Field label="Team name" required>
            {(id) => <TextInput id={id} value={team} onChange={setTeam} placeholder="For example: Mechanical crew, shift B" />}
          </Field>
        ) : (
          <span />
        )}
        <Field label="What exactly to check" required wide hint="This adds a task here. It does not send a message or make a work order.">
          {(id, d) => <TextArea id={id} describedBy={d} value={detail} onChange={setDetail} rows={4} />}
        </Field>
      </FieldGrid>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Send to maintenance                                                 */
/* ------------------------------------------------------------------ */

/** Mount only while open (each opening starts a fresh form). */
export function MaintenanceDialog({ onClose }: { onClose: () => void }) {
  const { c, vocab } = useCase();
  const save = useSave();
  const [work, setWork] = useState(vocab?.works[0]?.value ?? "");
  const [team, setTeam] = useState("");
  const [scope, setScope] = useState(c.nextAction ?? "");
  const [acceptance, setAcceptance] = useState("");
  const [windowText, setWindowText] = useState("");
  const [resources, setResources] = useState("");

  const submit = async () => {
    if (!team.trim()) return save.setError("Say which team does the work.");
    if (!scope.trim()) return save.setError("Say what needs doing.");
    if (!acceptance.trim()) return save.setError("Say how we will know it is fixed.");
    const ok = await save.run(() =>
      casesApi.addRequest(c.id, {
        workType: work || (vocab?.works[0]?.value ?? "inspection"),
        team: team.trim(),
        scope: scope.trim(),
        acceptance: acceptance.trim(),
        window: windowText.trim() || null,
        resources: resources.trim() || null,
      }),
    );
    if (ok) onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Send to maintenance"
      subtitle={`${c.machineName} · ${c.partName ?? "Whole machine"}`}
      width={620}
      busy={save.busy}
      onSubmit={() => void submit()}
      footerStart={<ErrorNote error={save.error} />}
      footer={
        <>
          <PillButton variant="secondary" onClick={onClose} disabled={save.busy}>
            Cancel
          </PillButton>
          <PillButton type="submit" loading={save.busy}>
            Make the work order
          </PillButton>
        </>
      }
    >
      <FieldGrid>
        <Field label="Kind of work" required>
          {(id) => <Select id={id} value={work} onChange={setWork} options={vocab?.works ?? []} />}
        </Field>
        <Field label="Team" required>
          {(id) => <TextInput id={id} value={team} onChange={setTeam} placeholder="For example: Mechanical crew" />}
        </Field>
        <Field label="What needs doing" required wide>
          {(id) => <TextArea id={id} value={scope} onChange={setScope} rows={3} />}
        </Field>
        <Field label="How we will know it is fixed" required wide>
          {(id) => <TextArea id={id} value={acceptance} onChange={setAcceptance} rows={2} placeholder="For example: vibration back below 2.3 mm/s for a full shift" />}
        </Field>
        <Field label="When it can be done">
          {(id) => <TextInput id={id} value={windowText} onChange={setWindowText} placeholder="For example: next planned stop" />}
        </Field>
        <Field label="Parts, tools and procedures">
          {(id) => <TextInput id={id} value={resources} onChange={setResources} />}
        </Field>
      </FieldGrid>
      <p className="case-help">This creates a work order in Maintenance with everything above.</p>
    </Dialog>
  );
}
