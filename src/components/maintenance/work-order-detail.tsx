"use client";

import React, { useEffect, useState } from "react";
import { Dialog, Field, FieldGrid, PillButton, Select, TextInput, type Tone } from "@/components/ui";
import {
  PAUSED,
  PRIORITY_LABEL,
  READINESS_KEYS,
  READINESS_LABEL,
  READINESS_STATE_LABEL,
  STAGE_LABEL,
  TERMINAL,
  isOpenStage,
  readinessBlockers,
  stepOf,
  transitionBlocker,
  transitionsFrom,
  type Transition,
} from "@/lib/pms";
import { formatLocalTime } from "@/lib/time";
import type { PmsWorkOrder, ReadinessKey, ReadinessState, WoStage } from "@/types/pms";
import { Section } from "@/components/assets/analysis/an-ui";
import type { Outcome, PmsModel } from "./pms-model";
import { machineCode, priorityTone, stageTone, woRef } from "./pms-model";
import { DefList, NoteDialog, Notice, StateWord, Stepper } from "./pms-ui";

/* One work order: lifecycle, planning details, readiness, execution record, actions and audit trail. */

const READINESS_TONE: Record<ReadinessState, Tone | undefined> = { pending: undefined, confirmed: undefined, blocked: "bad", na: undefined };

/* ---------------------------------------------------------------- work order */

export function WorkOrderDetail({
  wo,
  pms,
  timeZone,
  notice,
  setNotice,
}: {
  wo: PmsWorkOrder;
  pms: PmsModel;
  timeZone: string | null;
  notice: Outcome | null;
  setNotice: (o: Outcome | null) => void;
}) {
  const { data } = pms;
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState<Transition | null>(null);
  const [editing, setEditing] = useState(false);
  const canApprove = Boolean(data?.canApprove);
  const options = transitionsFrom(wo);
  const primary = options.find((t) => t.primary) ?? null;
  const others = options.filter((t) => !t.primary);
  const events = (data?.events ?? []).filter((e) => e.workOrderId === wo.id);
  const live = isOpenStage(wo.stage);
  const editableReadiness = live && stepOf(wo) <= 3;
  const when = (t: string | number) => formatLocalTime(t, { date: true, seconds: false, timeZone: timeZone ?? undefined });

  const run = async (t: Transition, text = "") => {
    setBusy(true);
    let out: Outcome;
    if (t.to === "awaiting_verification") {
      const saved = await pms.update(wo, { asFound: text });
      out = saved.tone === "bad" ? saved : await pms.transition({ ...wo, asFound: text }, t.to);
    } else if (t.to === "completed") {
      const saved = await pms.update(wo, { asLeft: text });
      out = saved.tone === "bad" ? saved : await pms.transition({ ...wo, asLeft: text }, t.to);
    } else out = await pms.transition(wo, t.to, text);
    setBusy(false);
    setNotice(out);
    return out;
  };

  const needsText = (t: Transition) => t.reason || t.to === "awaiting_verification" || t.to === "completed";
  const press = (t: Transition) => (needsText(t) ? setAsk(t) : void run(t));
  const blockerOf = (t: Transition) => {
    if (t.approval && !canApprove) return "Your role cannot approve, release or close";
    if (needsText(t)) return null;
    return transitionBlocker(wo, t.to, "");
  };
  const primaryBlocker = primary ? blockerOf(primary) : null;

  const setReadiness = async (k: ReadinessKey, state: ReadinessState) => {
    setBusy(true);
    setNotice(await pms.update(wo, { readiness: { [k]: { state, note: wo.readiness[k].note } } }));
    setBusy(false);
  };

  return (
    <Section id="pm-wo" title={woRef(wo.id)} right={<StateWord label={STAGE_LABEL[wo.stage]} tone={stageTone(wo.stage)} />}>
      <h4 className="pm-detail-title">{wo.title}</h4>
      <Stepper step={stepOf(wo)} paused={PAUSED.includes(wo.stage) ? STAGE_LABEL[wo.stage] : null} ended={TERMINAL.includes(wo.stage) && wo.stage !== "closed" ? STAGE_LABEL[wo.stage] : null} />

      <DefList
        rows={[
          { label: "Priority", value: `${wo.priority} · ${PRIORITY_LABEL[wo.priority] ?? ""}`, tone: priorityTone(wo.priority) },
          { label: "Equipment", value: `${machineCode(wo.machineId)}${wo.component ? ` · ${wo.component}` : ""}` },
          {
            label: "Source",
            value: wo.source.kind === "finding" ? `Finding ${wo.source.ref}` : wo.source.kind === "inspection" ? `Checklist defect ${wo.source.ref}` : "Manual request",
          },
          { label: "Work mode", value: wo.workMode === "Isolate" ? "Isolation · plant permit required" : wo.workMode === "Run" ? "Operating checks" : "Not set" },
          { label: "Planned start", value: wo.plannedStart ? when(wo.plannedStart) : "Not set", tone: wo.stage === "ready" && !wo.plannedStart ? "warn" : undefined },
          { label: "Estimate", value: wo.estimateHours ? `${wo.estimateHours} h` : "Not estimated" },
          { label: "Owner", value: wo.assignee ?? "Unassigned" },
          { label: "Raised", value: when(wo.createdAt) },
        ]}
      />
      {wo.notes && <p className="pm-note">{wo.notes}</p>}

      {(stepOf(wo) <= 3 || readinessBlockers(wo.readiness).length < READINESS_KEYS.length) && (
        <div className="pm-readiness" role="group" aria-label="Readiness">
          <div className="pm-block-head">
            <h4 className="pg-analysis-block-title">Readiness</h4>
            <span className="ast-caption">
              {readinessBlockers(wo.readiness).length ? `${readinessBlockers(wo.readiness).length} open · blocks Ready` : "All confirmed"}
            </span>
          </div>
          <ul>
            {READINESS_KEYS.map((k) => (
              <li key={k} data-tone={READINESS_TONE[wo.readiness[k].state]}>
                <span className="pm-rd-dot" data-state={wo.readiness[k].state} aria-hidden="true" />
                <span className="pm-rd-label">{READINESS_LABEL[k]}</span>
                {editableReadiness ? (
                  <Select
                    id={`rd-${wo.id}-${k}`}
                    value={wo.readiness[k].state}
                    disabled={busy}
                    onChange={(v) => void setReadiness(k, v as ReadinessState)}
                    options={(["pending", "confirmed", "blocked", "na"] as ReadinessState[]).map((s) => ({ value: s, label: READINESS_STATE_LABEL[s] }))}
                  />
                ) : (
                  <span className="pm-muted">{READINESS_STATE_LABEL[wo.readiness[k].state]}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(wo.asFound || wo.asLeft) && (
        <DefList
          className="pm-record"
          rows={[...(wo.asFound ? [{ label: "As found", value: wo.asFound }] : []), ...(wo.asLeft ? [{ label: "As left", value: wo.asLeft }] : [])]}
        />
      )}

      <Notice outcome={notice} />
      {live && (
        <div className="pm-actions">
          {primary && (
            <PillButton disabled={busy || Boolean(primaryBlocker)} title={primaryBlocker ?? undefined} onClick={() => press(primary)}>
              {primary.label}
            </PillButton>
          )}
          <PillButton variant="secondary" disabled={busy} onClick={() => setEditing(true)}>
            Edit planning
          </PillButton>
          {others.map((t) => {
            const b = blockerOf(t);
            return (
              <PillButton key={t.to} variant={t.to === "cancelled" || t.to === "rejected" ? "danger" : "secondary"} disabled={busy || Boolean(b)} title={b ?? undefined} onClick={() => press(t)}>
                {t.label}
              </PillButton>
            );
          })}
        </div>
      )}
      {live && primaryBlocker && <p className="ast-caption pm-foot">{primaryBlocker}</p>}
      {!live && <p className="ast-caption pm-foot">Closed record · read only</p>}

      <div className="pm-audit" role="group" aria-label="Audit trail">
        <h4 className="pg-analysis-block-title">Audit trail</h4>
        {events.length === 0 ? (
          <p className="ast-caption">Raised {when(wo.createdAt)} · no planned-maintenance changes yet.</p>
        ) : (
          <ol>
            {events.map((e) => (
              <li key={e.id}>
                <span className="pm-muted">{when(e.at)}</span>
                <span>
                  {e.action === "transition" || e.action === "create"
                    ? `${e.from ? `${STAGE_LABEL[e.from as WoStage] ?? e.from} → ` : ""}${STAGE_LABEL[e.to as WoStage] ?? e.to}`
                    : e.action === "denied"
                      ? `Denied: ${STAGE_LABEL[e.to as WoStage] ?? e.to}`
                      : e.action === "readiness"
                        ? "Readiness"
                        : e.action === "finding"
                          ? "Finding repeated"
                          : "Planning details"}
                  {e.reason && <span className="ast-caption"> · {e.reason}</span>}
                </span>
                <span className="ast-caption">{e.actor ?? "—"}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {ask && (
        <NoteDialog
          open
          title={ask.label}
          subtitle={`${woRef(wo.id)} · ${wo.title}`}
          label={ask.to === "awaiting_verification" ? "As found and work done" : ask.to === "completed" ? "As-left verification" : "Reason"}
          hint={
            ask.to === "awaiting_verification"
              ? "Observed condition, measurements, parts used"
              : ask.to === "completed"
                ? "Tests and values after the work, at comparable load"
                : "Recorded with your name in the audit trail"
          }
          initial={ask.to === "awaiting_verification" ? (wo.asFound ?? "") : ask.to === "completed" ? (wo.asLeft ?? "") : ""}
          confirm={ask.label}
          danger={ask.to === "cancelled" || ask.to === "rejected"}
          onClose={() => setAsk(null)}
          onConfirm={(text) => run(ask, text)}
        />
      )}
      <PlanningDialog open={editing} wo={wo} onClose={() => setEditing(false)} onSave={async (patch) => {
        const out = await pms.update(wo, patch);
        setNotice(out);
        return out;
      }} />
    </Section>
  );
}

/* ---------------------------------------------------------------- dialogs */

const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function PlanningDialog({ open, wo, onClose, onSave }: { open: boolean; wo: PmsWorkOrder; onClose: () => void; onSave: (patch: Record<string, unknown>) => Promise<Outcome> }) {
  const [priority, setPriority] = useState(wo.priority);
  const [owner, setOwner] = useState(wo.assignee ?? "");
  const [mode, setMode] = useState<string>(wo.workMode ?? "");
  const [start, setStart] = useState(toLocalInput(wo.plannedStart));
  const [hours, setHours] = useState(wo.estimateHours ? String(wo.estimateHours) : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setPriority(wo.priority);
    setOwner(wo.assignee ?? "");
    setMode(wo.workMode ?? "");
    setStart(toLocalInput(wo.plannedStart));
    setHours(wo.estimateHours ? String(wo.estimateHours) : "");
    setErr(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, wo.id]);
  const save = async () => {
    setBusy(true);
    const out = await onSave({
      priority,
      assignee: owner,
      workMode: mode || null,
      plannedStart: start ? new Date(start).toISOString() : null,
      estimateHours: hours ? Number(hours) : null,
    });
    setBusy(false);
    if (out.tone === "bad") setErr(out.text);
    else onClose();
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Planning details"
      subtitle={`${woRef(wo.id)} · ${wo.title}`}
      busy={busy}
      onSubmit={() => void save()}
      footer={
        <>
          <PillButton variant="secondary" type="button" onClick={onClose} disabled={busy}>
            Cancel
          </PillButton>
          <PillButton type="submit" loading={busy}>
            Save
          </PillButton>
        </>
      }
    >
      <FieldGrid>
        <Field label="Priority" hint="Urgency, separate from the stage">
          {(fid, d) => <Select id={fid} describedBy={d} value={priority} onChange={setPriority} options={["P1", "P2", "P3", "P4"].map((p) => ({ value: p, label: `${p} · ${PRIORITY_LABEL[p]}` }))} />}
        </Field>
        <Field label="Work mode">
          {(fid, d) => <Select id={fid} describedBy={d} value={mode} onChange={setMode} options={[{ value: "", label: "Not set" }, { value: "Run", label: "Operating checks" }, { value: "Isolate", label: "Isolation (plant permit)" }]} />}
        </Field>
        <Field label="Planned start" hint="A date alone does not make the job ready">
          {(fid, d) => <input id={fid} aria-describedby={d} className="ui-input" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />}
        </Field>
        <Field label="Estimate (h)">
          {(fid, d) => <input id={fid} aria-describedby={d} className="ui-input" type="number" min={0} step={0.5} inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} />}
        </Field>
        <Field label="Owner" wide>
          {(fid, d) => <TextInput id={fid} describedBy={d} value={owner} onChange={setOwner} placeholder="Crew or person" />}
        </Field>
      </FieldGrid>
      {err && <p className="ui-form-note" data-tone="bad">{err}</p>}
    </Dialog>
  );
}

