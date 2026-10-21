"use client";

/**
 * Records an alarm someone saw on site or on another system. It is stored with
 * the machine (and the case, when opened from one); it does not raise a live
 * alarm.
 */
import React, { useEffect, useRef, useState } from "react";
import { Dialog, Field, FieldGrid, PillButton, Select, TextArea, TextInput } from "@/components/ui";
import { CaseApiError, casesApi } from "./cases-api";
import "./problems.css";

/** "YYYY-MM-DDTHH:mm" in the browser's own time zone (the datetime-local format). */
function localNow(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

interface Draft {
  machineId: string;
  title: string;
  severity: "alert" | "critical";
  location: string;
  observedValue: string;
  limitText: string;
  observedAt: string;
  source: string;
}

export function RecordAlarmDialog({
  open,
  machineId,
  caseId,
  machines,
  onClose,
}: {
  open: boolean;
  machineId?: string | null;
  caseId?: number | null;
  machines: Array<{ id: string; name: string }>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  // What the form opened with, so a stray click does not throw away typed input.
  const [first, setFirst] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const machinesRef = useRef(machines);
  machinesRef.current = machines;

  // A fresh form each time the dialog opens (not on every new `machines` array).
  useEffect(() => {
    if (!open) return;
    const fresh: Draft = {
      machineId: machineId ?? machinesRef.current[0]?.id ?? "",
      title: "",
      severity: "alert",
      location: "",
      observedValue: "",
      limitText: "",
      observedAt: localNow(),
      source: "",
    };
    setDraft(fresh);
    setFirst(fresh);
    setError(null);
    setTried(false);
  }, [open, machineId]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));
  const need = (v: string | undefined, msg: string) => (tried && !v?.trim() ? msg : null);
  const at = draft?.observedAt ? new Date(draft.observedAt) : null;
  const atBad = !at || Number.isNaN(at.getTime());
  const atLater = !atBad && at!.getTime() > Date.now();
  const dirty = Boolean(draft && first && (Object.keys(draft) as (keyof Draft)[]).some((k) => draft[k] !== first[k]));

  const save = async () => {
    if (!draft) return;
    setTried(true);
    if (!draft.machineId || !draft.title.trim() || !draft.location.trim() || !draft.source.trim() || atBad || atLater) return;
    setBusy(true);
    setError(null);
    try {
      await casesApi.recordAlarm({
        machineId: draft.machineId,
        caseId: caseId ?? null,
        title: draft.title.trim(),
        severity: draft.severity,
        location: draft.location.trim(),
        observedValue: draft.observedValue.trim() || undefined,
        limitText: draft.limitText.trim() || undefined,
        // datetime-local is the browser's wall clock; Date reads it in the browser's zone.
        observedAt: at!.toISOString(),
        source: draft.source.trim(),
      });
      onClose();
    } catch (e) {
      setError(e instanceof CaseApiError ? e.message : "Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Record an alarm seen on site"
      subtitle={caseId ? "It is added to this case and to the machine's open alarms." : "It is added to the machine's open alarms."}
      width={620}
      busy={busy}
      dirty={dirty}
      onSubmit={() => void save()}
      footerStart={
        error ? (
          <span className="pg-note" data-tone="bad" role="alert">
            {error}
          </span>
        ) : undefined
      }
      footer={
        <>
          <PillButton variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </PillButton>
          <PillButton type="submit" loading={busy}>
            Record the alarm
          </PillButton>
        </>
      }
    >
      {draft && (
        <>
          <p className="prb-dialog-note">Use this for an alarm someone saw on site or on another system. It is recorded here; it does not raise a live alarm.</p>
          <FieldGrid>
            <Field label="Machine" required hint={caseId ? "The case's machine." : undefined} error={tried && !draft.machineId ? "Choose the machine" : null}>
              {(id, d) => (
                <Select
                  id={id}
                  describedBy={d}
                  // A case is about one machine: its alarms stay on that machine.
                  disabled={Boolean(caseId)}
                  value={draft.machineId}
                  onChange={(v) => set("machineId", v)}
                  options={[...(draft.machineId ? [] : [{ value: "", label: "Choose a machine" }]), ...machines.map((m) => ({ value: m.id, label: m.name }))]}
                />
              )}
            </Field>
            <Field label="How serious" required hint="Alert: needs a look soon. Critical: act now.">
              {(id, d) => (
                <Select
                  id={id}
                  describedBy={d}
                  value={draft.severity}
                  onChange={(v) => set("severity", v === "critical" ? "critical" : "alert")}
                  options={[
                    { value: "alert", label: "Alert" },
                    { value: "critical", label: "Critical" },
                  ]}
                />
              )}
            </Field>
            <Field label="What the alarm is" required wide error={need(draft.title, "Say what the alarm is")}>
              {(id, d) => <TextInput id={id} describedBy={d} value={draft.title} onChange={(v) => set("title", v)} placeholder="For example: Kiln drive motor too hot" />}
            </Field>
            <Field label="Where on the machine" required wide error={need(draft.location, "Say where on the machine")}>
              {(id, d) => <TextInput id={id} describedBy={d} value={draft.location} onChange={(v) => set("location", v)} placeholder="For example: Drive end bearing of the main motor" />}
            </Field>
            <Field label="What was seen (value)" hint="Optional. Include the unit.">
              {(id, d) => <TextInput id={id} describedBy={d} value={draft.observedValue} onChange={(v) => set("observedValue", v)} placeholder="For example: 92 °C" />}
            </Field>
            <Field label="The limit it passed" hint="Optional.">
              {(id, d) => <TextInput id={id} describedBy={d} value={draft.limitText} onChange={(v) => set("limitText", v)} placeholder="For example: normally below 80 °C" />}
            </Field>
            <Field label="When it was seen" required hint="Your own time zone." error={tried && atBad ? "Enter the date and time" : tried && atLater ? "Can't be later than now" : null}>
              {(id, d) => (
                <input id={id} aria-describedby={d} className="ui-input" type="datetime-local" value={draft.observedAt} onChange={(e) => set("observedAt", e.target.value)} />
              )}
            </Field>
            <Field label="Who saw it and how" required wide error={need(draft.source, "Say who saw it and how")}>
              {(id, d) => (
                <TextArea
                  id={id}
                  describedBy={d}
                  rows={2}
                  value={draft.source}
                  onChange={(v) => set("source", v)}
                  placeholder="For example: Shift operator on the control room screen, or a handheld reading on the walk round"
                />
              )}
            </Field>
          </FieldGrid>
        </>
      )}
    </Dialog>
  );
}
