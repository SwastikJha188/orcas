"use client";

/**
 * The case page's side column, the same on every tab: checks (with the next
 * step), maintenance (work orders, checking the fix, closing), files, and
 * history (with alarms recorded by hand for this case).
 */
import React, { useRef, useState } from "react";
import { ConfirmAction, Dialog, Field, FieldGrid, PillButton, Select, TextArea } from "@/components/ui";
import { StatusTag } from "@/components/assets/assets-shell-ui";
import { woRef } from "@/components/maintenance/pms-model";
import { casesApi, fileUrl, sizeWord, type CaseCheck } from "./cases-api";
import { CaseCard, ErrorNote, RESULT_TONE, useCase, useSave } from "./case-shared";

const Count = ({ n, word }: { n: number; word?: string }) => <span className="case-count">{word ? `${n} ${word}` : n}</span>;

export function CaseSide() {
  return (
    <aside className="case-side" aria-label="Case tools">
      <ChecksCard />
      <MaintenanceCard />
      <FilesCard />
      <HistoryCard />
    </aside>
  );
}

/* ------------------------------------------------------------------ */

/** Checks, headed by the case's next step; "Ask for a check" is the card's action. */
function ChecksCard() {
  const { c, when, askCheck } = useCase();
  const save = useSave();
  const [finishing, setFinishing] = useState<CaseCheck | null>(null);
  const closed = c.stage === "closed";
  const open = c.checks.filter((k) => k.status === "open");
  const rest = c.checks.filter((k) => k.status !== "open").sort((a, b) => Date.parse(b.doneAt ?? b.createdAt) - Date.parse(a.doneAt ?? a.createdAt));

  return (
    <CaseCard
      title={
        <>
          Checks <Count n={open.length} word="open" />
        </>
      }
      id="case-checks"
      actions={
        !closed && (
          <PillButton variant="secondary" onClick={() => askCheck()}>
            Ask for a check
          </PillButton>
        )
      }
    >
      <div className="case-next">
        <span className="case-label">Next step</span>
        <p className="case-text">{c.nextAction ?? <span className="ast-muted">No next step yet.</span>}</p>
      </div>
      {c.checks.length ? (
        <ul className="case-list">
          {[...open, ...rest].map((k) => (
            <li key={k.id} className="case-item">
              <div className="case-item-head">
                <span className="case-strong">{k.kindWord}</span>
                {k.status === "open" ? (
                  <StatusTag tone="info" label="Waiting" />
                ) : k.status === "cancelled" ? (
                  <StatusTag tone="idle" label="Cancelled" />
                ) : (
                  <StatusTag tone={k.result ? (RESULT_TONE[k.result] ?? "idle") : "idle"} label={k.resultWord ?? "Done"} />
                )}
              </div>
              <p className="case-text">{k.detail}</p>
              {k.causeText && <span className="case-sub">For the possible cause: {k.causeText}</span>}
              <span className="case-sub">
                {k.assignee ? `Asked of ${k.assignee}` : "Not given to anyone"}
                {k.createdBy ? ` by ${k.createdBy}` : ""} · {when(k.createdAt)}
              </span>
              {k.status === "done" && (
                <>
                  {k.resultNote && <p className="case-text case-found">{k.resultNote}</p>}
                  <span className="case-sub">
                    Done{k.doneBy ? ` by ${k.doneBy}` : ""} · {when(k.doneAt)}
                  </span>
                </>
              )}
              {k.status === "open" && (
                <div className="case-buttons">
                  <PillButton variant="secondary" onClick={() => setFinishing(k)} disabled={save.busy}>
                    Record the result
                  </PillButton>
                  <ConfirmAction
                    tone="secondary"
                    label="Cancel this check"
                    question="Cancel this check?"
                    confirmLabel="Cancel the check"
                    keepLabel="Keep it"
                    disabled={save.busy}
                    onConfirm={() => void save.run(() => casesApi.finishCheck(c.id, k.id, { cancel: true }))}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="ast-muted">No checks yet. Ask for one here or from a possible cause.</p>
      )}
      <ErrorNote error={save.error} />
      {finishing && <FinishDialog check={finishing} onClose={() => setFinishing(null)} />}
    </CaseCard>
  );
}

function FinishDialog({ check, onClose }: { check: CaseCheck; onClose: () => void }) {
  const { c, vocab } = useCase();
  const save = useSave();
  const [result, setResult] = useState(vocab?.results[0]?.value ?? "supports");
  const [note, setNote] = useState("");
  const submit = async () => {
    if (!note.trim()) return save.setError("Say what was found.");
    if (await save.run(() => casesApi.finishCheck(c.id, check.id, { result, note: note.trim() }))) onClose();
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title="Record the result"
      subtitle={`${check.kindWord}: ${check.detail}`}
      busy={save.busy}
      dirty={note.trim() !== ""}
      onSubmit={() => void submit()}
      footerStart={<ErrorNote error={save.error} />}
      footer={
        <>
          <PillButton variant="secondary" onClick={onClose} disabled={save.busy}>
            Cancel
          </PillButton>
          <PillButton type="submit" loading={save.busy}>
            Save the result
          </PillButton>
        </>
      }
    >
      <FieldGrid>
        <Field label={check.causeText ? `What it says about: ${check.causeText}` : "What it says"} required wide>
          {(id) => <Select id={id} value={result} onChange={setResult} options={vocab?.results ?? []} />}
        </Field>
        <Field label="What was found" required wide>
          {(id) => <TextArea id={id} value={note} onChange={setNote} rows={4} />}
        </Field>
      </FieldGrid>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */

function MaintenanceCard() {
  const { c, when, sendToMaintenance } = useCase();
  const save = useSave();
  const [dialog, setDialog] = useState<"verify" | "close" | null>(null);
  const closed = c.stage === "closed";
  const canVerify = c.stage === "maintenance" || c.stage === "verifying";

  return (
    <CaseCard
      title="Maintenance"
      id="case-maint"
      actions={
        !closed && (
          <PillButton variant="secondary" onClick={sendToMaintenance}>
            Send to maintenance
          </PillButton>
        )
      }
    >
      {c.requests.length ? (
        <ul className="case-list">
          {[...c.requests].reverse().map((r) => (
            <li key={r.id} className="case-item">
              <div className="case-item-head">
                <span className="case-strong">{r.workWord}</span>
                {r.workOrderStatus && <StatusTag tone={r.workOrderStatus === "Done" ? "good" : r.workOrderStatus === "Cancelled" ? "idle" : "info"} label={r.workOrderStatus} />}
              </div>
              <p className="case-text">{r.scope}</p>
              <span className="case-sub">
                {r.team}
                {r.workOrderId !== null ? ` · ${woRef(r.workOrderId)}` : ""} · {when(r.createdAt)}
              </span>
              <span className="case-sub">Fixed when: {r.acceptance}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ast-muted">Nothing sent to maintenance yet.</p>
      )}

      {closed ? (
        <div className="case-closed">
          <span className="case-label">Closed {when(c.closedAt)}</span>
          {c.closeNote && <p className="case-text">{c.closeNote}</p>}
          <div className="case-buttons">
            <PillButton variant="secondary" loading={save.busy} onClick={() => void save.run(() => casesApi.action(c.id, "reopen"))}>
              Open again
            </PillButton>
          </div>
        </div>
      ) : (
        <div className="case-buttons">
          {canVerify && (
            <PillButton variant="secondary" onClick={() => setDialog("verify")}>
              Check the fix worked
            </PillButton>
          )}
          <PillButton variant="secondary" onClick={() => setDialog("close")}>
            Close the case
          </PillButton>
        </div>
      )}
      <ErrorNote error={save.error} />
      {dialog && <StageDialog kind={dialog} onClose={() => setDialog(null)} />}
    </CaseCard>
  );
}

function StageDialog({ kind, onClose }: { kind: "verify" | "close"; onClose: () => void }) {
  const { c } = useCase();
  const save = useSave();
  const [note, setNote] = useState("");
  const close = kind === "close";
  const submit = async () => {
    if (close && !note.trim()) return save.setError("Say why it can be closed.");
    if (await save.run(() => casesApi.action(c.id, kind, note.trim() || undefined))) onClose();
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title={close ? "Close the case" : "Check the fix worked"}
      subtitle={c.title}
      width={500}
      busy={save.busy}
      onSubmit={() => void submit()}
      footerStart={<ErrorNote error={save.error} />}
      footer={
        <>
          <PillButton variant="secondary" onClick={onClose} disabled={save.busy}>
            Cancel
          </PillButton>
          <PillButton type="submit" loading={save.busy}>
            {close ? "Close the case" : "Start checking"}
          </PillButton>
        </>
      }
    >
      <FieldGrid>
        <Field
          label={close ? "Why it can be closed" : "Notes"}
          required={close}
          wide
          hint={close ? "For example: the repair is done and the readings stayed normal for a full shift." : "The case moves to Checking the fix. Watch the readings, then close it."}
        >
          {(id, d) => <TextArea id={id} describedBy={d} value={note} onChange={setNote} rows={4} />}
        </Field>
      </FieldGrid>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */

const MAX_FILE = 10 * 1024 * 1024;

function FilesCard() {
  const { c, when } = useCase();
  const save = useSave();
  const input = useRef<HTMLInputElement | null>(null);

  const attach = (f: File | undefined) => {
    if (input.current) input.current.value = "";
    if (!f) return;
    if (f.size > MAX_FILE) return save.setError("That file is larger than 10 MB. Pick a smaller one.");
    void save.run(() => casesApi.addFile(c.id, f));
  };

  return (
    <CaseCard
      title={
        <>
          Files <Count n={c.files.length} />
        </>
      }
      id="case-files"
      actions={
        <>
          <input ref={input} type="file" hidden onChange={(e) => attach(e.target.files?.[0])} />
          <PillButton variant="secondary" loading={save.busy} onClick={() => input.current?.click()}>
            Attach a file
          </PillButton>
        </>
      }
    >
      {c.files.length ? (
        <ul className="case-list">
          {c.files.map((f) => (
            <li key={f.id} className="case-item">
              <div className="case-item-head">
                <a className="case-link" href={fileUrl(c.id, f.id)} download={f.name}>
                  {f.name}
                </a>
                <span className="case-sub">{sizeWord(f.size)}</span>
              </div>
              <span className="case-sub">
                {f.uploadedBy ? `${f.uploadedBy} · ` : ""}
                {when(f.uploadedAt)}
              </span>
              <div className="case-buttons">
                <ConfirmAction
                  label="Remove"
                  question={`Remove ${f.name} for good?`}
                  confirmLabel="Remove for good"
                  keepLabel="Keep it"
                  disabled={save.busy}
                  onConfirm={() => void save.run(() => casesApi.removeFile(c.id, f.id))}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ast-muted">No files yet. Photos, reports and readings can be attached, up to 10 MB each.</p>
      )}
      <ErrorNote error={save.error} />
    </CaseCard>
  );
}

/* ------------------------------------------------------------------ */

/** Alarms recorded by hand for this case, shown at the top of History. */
function HandAlarms() {
  const { c, when } = useCase();
  if (!c.alarms.length) return null;
  return (
    <div className="case-alarms">
      <span className="case-label">Alarms recorded by hand · {c.alarms.length}</span>
      <ul className="case-list">
        {c.alarms.map((a) => (
          <li key={a.id} className="case-item">
            <div className="case-item-head">
              <span className="case-strong">{a.title}</span>
              <StatusTag tone={a.severity === "critical" ? "bad" : "warn"} label={a.severity === "critical" ? "Critical" : "Alert"} />
            </div>
            <span className="case-sub">
              {a.location}
              {a.observedValue ? ` · ${a.observedValue}` : ""}
              {a.limitText ? ` (limit ${a.limitText})` : ""}
            </span>
            <span className="case-sub">
              Seen {when(a.observedAt)} · from {a.source}
              {a.recordedBy ? ` · recorded by ${a.recordedBy}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const HISTORY_SHOWN = 10;

function HistoryCard() {
  const { c, when } = useCase();
  const [all, setAll] = useState(false);
  const events = [...c.events].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return (
    <CaseCard
      title={
        <>
          History <Count n={events.length} />
        </>
      }
      id="case-history"
    >
      <HandAlarms />
      {events.length ? (
        <>
          <ul className="case-list case-history">
            {events.map((e, i) => (
              <li key={`${e.at}-${i}`} className={`case-item${!all && i >= HISTORY_SHOWN ? " case-more" : ""}`}>
                <p className="case-text">{e.text}</p>
                <span className="case-sub">
                  {e.who ?? "The system"} · {when(e.at)}
                </span>
              </li>
            ))}
          </ul>
          {events.length > HISTORY_SHOWN && (
            <PillButton variant="secondary" className="case-noprint" onClick={() => setAll((v) => !v)}>
              {all ? "Show the latest only" : `Show all ${events.length} entries`}
            </PillButton>
          )}
        </>
      ) : (
        <p className="ast-muted">Nothing has happened on this case yet.</p>
      )}
    </CaseCard>
  );
}
