"use client";

import React, { useEffect, useState } from "react";
import { Dialog, Field, FieldGrid, NumberInput, PillButton, Select, TextInput, type Tone } from "@/components/ui";
import {
  PAUSED,
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
} from "@shared/lib/pms";
import { formatLocalTime } from "@/lib/time";
import { useWorkOrderPriorities } from "@/lib/reference-data";
import type { PmsWorkOrder, ReadinessKey, ReadinessState, WoStage } from "@shared/types/pms";
import { Section } from "@/components/assets/analysis/an-ui";
import type { Outcome, PmsModel } from "./pms-model";
import { machineName, priorityOptions, priorityTone, stageTone, woRef } from "./pms-model";
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
  const priorities = useWorkOrderPriorities();
  const priorityName = priorities?.find((p) => p.id === wo.priority)?.name ?? null;
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
  // Why the other actions are greyed out, said once each under the buttons (not only in a tooltip).
  const otherBlockers = others
    .map((t) => ({ label: t.label, why: blockerOf(t) }))
    .filter((x): x is { label: string; why: string } => Boolean(x.why) && x.why !== primaryBlocker);

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
          { label: "Priority", value: priorityName ? `${wo.priority} · ${priorityName}` : wo.priority, tone: priorityTone(wo.priority) },
          { label: "Equipment", value: `${machineName(wo.machineId)}${wo.component ? ` · ${wo.component}` : ""}` },
          {
            label: "Source",
            value:
              wo.checkId !== null
                ? "Problem found on a check raised by an alarm"
                : wo.source.kind === "finding"
                  ? "Raised from a sensor problem"
                  : wo.source.kind === "inspection"
                    ? `Fault found on checklist ${wo.source.ref}`
                    : wo.maintenanceType === "proactive"
                      ? wo.partId
                        ? "Planned before the part's service life runs out"
                        : "Planned before a reading reaches its limit"
                      : wo.plannedStart && wo.maintenanceType === "predictive"
                        ? "Planned by an engineer"
                        : "Requested by a person",
          },
          { label: "How the work is done", value: wo.workMode === "Isolate" ? "Machine stopped and locked off · permit needed" : wo.workMode === "Run" ? "Checks while the machine runs" : "Not set" },
          { label: "Planned start", value: wo.plannedStart ? when(wo.plannedStart) : "Not set", tone: wo.stage === "ready" && !wo.plannedStart ? "warn" : undefined },
          { label: "Time needed", value: wo.estimateHours ? `${wo.estimateHours} h` : "Not estimated" },
          { label: "Who", value: wo.assignee ?? "Nobody yet" },
          { label: "Created", value: when(wo.createdAt) },
        ]}
      />
      {wo.notes && <p className="pm-note">{wo.notes}</p>}

      {(stepOf(wo) <= 3 || readinessBlockers(wo.readiness).length < READINESS_KEYS.length) && (
        <div className="pm-readiness" role="group" aria-label="Ready to start?">
          <div className="pm-block-head">
            <h4 className="pg-analysis-block-title">Ready to start?</h4>
            <span className="ast-caption">
              {readinessBlockers(wo.readiness).length ? `${readinessBlockers(wo.readiness).length} still missing, so it cannot be marked ready` : "Everything is in place"}
            </span>
          </div>
          <ul>
            {READINESS_KEYS.map((k) => (
              <li key={k} data-tone={READINESS_TONE[wo.readiness[k].state]}>
                <span className="pm-rd-dot" data-state={wo.readiness[k].state} aria-hidden="true" />
                {editableReadiness ? (
                  <label className="pm-rd-label" htmlFor={`rd-${wo.id}-${k}`}>
                    {READINESS_LABEL[k]}
                  </label>
                ) : (
                  <span className="pm-rd-label">{READINESS_LABEL[k]}</span>
                )}
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
          rows={[...(wo.asFound ? [{ label: "Found before the work", value: wo.asFound }] : []), ...(wo.asLeft ? [{ label: "Left after the work", value: wo.asLeft }] : [])]}
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
            Edit plan details
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
      {live &&
        otherBlockers.map((x) => (
          <p key={x.label} className="ast-caption pm-foot">
            {x.label}: {x.why}
          </p>
        ))}
      {!live && <p className="ast-caption pm-foot">This work order is closed and can no longer be changed.</p>}

      <div className="pm-audit" role="group" aria-label="History of changes">
        <h4 className="pg-analysis-block-title">History of changes</h4>
        {events.length === 0 ? (
          <p className="ast-caption">Created {when(wo.createdAt)} · no changes yet.</p>
        ) : (
          <ol>
            {events.map((e) => (
              <li key={e.id}>
                <span className="pm-muted">{when(e.at)}</span>
                <span>
                  {e.action === "transition" || e.action === "create"
                    ? `${e.from ? `${STAGE_LABEL[e.from as WoStage] ?? e.from} → ` : ""}${STAGE_LABEL[e.to as WoStage] ?? e.to}`
                    : e.action === "denied"
                      ? `Not allowed: ${STAGE_LABEL[e.to as WoStage] ?? e.to}`
                      : e.action === "readiness"
                        ? "Readiness updated"
                        : e.action === "finding"
                          ? "Same problem seen again"
                          : "Plan details changed"}
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
          label={ask.to === "awaiting_verification" ? "What you found and what you did" : ask.to === "completed" ? "Check after the work" : "Reason"}
          hint={
            ask.to === "awaiting_verification"
              ? "What it looked like, measurements, parts used"
              : ask.to === "completed"
                ? "Test results and readings after the work, at a similar load"
                : "Saved with your name in the history of changes"
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
  const priorities = useWorkOrderPriorities();
  const [priority, setPriority] = useState(wo.priority);
  const [owner, setOwner] = useState(wo.assignee ?? "");
  const [mode, setMode] = useState<string>(wo.workMode ?? "");
  const [start, setStart] = useState(toLocalInput(wo.plannedStart));
  const [hours, setHours] = useState(wo.estimateHours ? String(wo.estimateHours) : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  useEffect(() => {
    if (!open) return;
    setPriority(wo.priority);
    setOwner(wo.assignee ?? "");
    setMode(wo.workMode ?? "");
    setStart(toLocalInput(wo.plannedStart));
    setHours(wo.estimateHours ? String(wo.estimateHours) : "");
    setErr(null);
    setTried(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, wo.id]);
  const h = hours.trim() ? Number(hours) : null;
  const hoursBad = h !== null && (!Number.isFinite(h) || h <= 0);
  const dirty =
    priority !== wo.priority ||
    owner !== (wo.assignee ?? "") ||
    mode !== (wo.workMode ?? "") ||
    start !== toLocalInput(wo.plannedStart) ||
    hours !== (wo.estimateHours ? String(wo.estimateHours) : "");
  const save = async () => {
    setTried(true);
    if (hoursBad) return;
    setErr(null);
    setBusy(true);
    const out = await onSave({
      priority,
      assignee: owner,
      workMode: mode || null,
      plannedStart: start ? new Date(start).toISOString() : null,
      estimateHours: h,
    });
    setBusy(false);
    if (out.tone === "bad") setErr(out.text);
    else onClose();
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Plan details"
      subtitle={`${woRef(wo.id)} · ${wo.title}`}
      busy={busy}
      dirty={dirty}
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
        <Field label="Priority" hint="How urgent it is (separate from the stage)">
          {(fid, d) => <Select id={fid} describedBy={d} value={priority} onChange={setPriority} options={priorityOptions(priorities, priority)} />}
        </Field>
        <Field label="How the work is done">
          {(fid, d) => <Select id={fid} describedBy={d} value={mode} onChange={setMode} options={[{ value: "", label: "Not set" }, { value: "Run", label: "Checks while the machine runs" }, { value: "Isolate", label: "Machine stopped and locked off (permit needed)" }]} />}
        </Field>
        <Field label="Planned start" hint="Setting a date does not by itself make the job ready">
          {(fid, d) => <input id={fid} aria-describedby={d} className="ui-input" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />}
        </Field>
        <Field label="Time needed (hours)" error={tried && hoursBad ? "Enter hours as a number, like 1.5" : null}>
          {(fid, d) => <NumberInput id={fid} describedBy={d} value={hours} onChange={setHours} />}
        </Field>
        <Field label="Who does it" wide>
          {(fid, d) => <TextInput id={fid} describedBy={d} value={owner} onChange={setOwner} placeholder="Crew or person" />}
        </Field>
      </FieldGrid>
      {err && (
        <p className="ui-form-note" data-tone="bad" role="alert">
          {err}
        </p>
      )}
    </Dialog>
  );
}

