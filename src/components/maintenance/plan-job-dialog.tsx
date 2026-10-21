"use client";

import React, { useEffect, useState } from "react";
import { Dialog, Field, FieldGrid, NumberInput, PillButton, Select, TextArea, TextInput } from "@/components/ui";
import { useWorkOrderPriorities } from "@/lib/reference-data";
import type { MaintenanceTypeId } from "@shared/types/maintenance-types";
import type { PmsModel } from "./pms-model";
import { machineName, priorityOptions } from "./pms-model";

/* Plan a maintenance job with a date: by hand (Predictive & planned), for a part running out of life (Proactive)
   or for an active fault (Machine maintenance, prefilled from the fault and linked to it). */

export interface PlanJobDraft {
  machineId?: string | null;
  title?: string;
  component?: string | null;
  /** Suggested start (ms). */
  at?: number | null;
  notes?: string;
  type: MaintenanceTypeId;
  componentId?: string | null;
  /** The fault (rule) the job answers: links the work order to it, so the same fault never gets a second one. */
  ruleId?: string | null;
}

/** "YYYY-MM-DDTHH:mm" in the browser's zone (datetime-local), on the next full hour when no time is given. */
function toLocalInput(ms: number | null | undefined): string {
  const d = new Date(ms ?? Date.now() + 3_600_000);
  if (!ms) d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PlanJobDialog({
  open,
  draft,
  machineIds,
  title,
  onClose,
  onPropose,
}: {
  open: boolean;
  draft: PlanJobDraft | null;
  machineIds: string[];
  title: string;
  onClose: () => void;
  onPropose: PmsModel["propose"];
}) {
  const priorities = useWorkOrderPriorities();
  const fallback = priorities?.find((p) => p.defaultNew)?.id ?? "";
  const [machine, setMachine] = useState("");
  const [what, setWhat] = useState("");
  const [component, setComponent] = useState("");
  const [start, setStart] = useState("");
  const [hours, setHours] = useState("");
  const [priority, setPriority] = useState(fallback);
  const [mode, setMode] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  // What the form opened with, so a stray click does not throw away typed input.
  const [init, setInit] = useState({ machine: "", what: "", component: "", start: "", notes: "" });
  useEffect(() => {
    if (!open) return;
    const first = {
      machine: draft?.machineId ?? machineIds[0] ?? "",
      what: draft?.title ?? "",
      component: draft?.component ?? "",
      start: toLocalInput(draft?.at && draft.at > Date.now() ? draft.at : null),
      notes: draft?.notes ?? "",
    };
    setInit(first);
    setMachine(first.machine);
    setWhat(first.what);
    setComponent(first.component);
    setStart(first.start);
    setHours("");
    setPriority(fallback);
    setMode("");
    setNotes(first.notes);
    setErr(null);
    setTried(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => {
    if (open && !priority && fallback) setPriority(fallback);
  }, [open, priority, fallback]);

  const h = hours.trim() ? Number(hours) : null;
  const hoursBad = h !== null && (!Number.isFinite(h) || h <= 0);
  const need = (v: string, msg: string) => (tried && !v.trim() ? msg : null);
  const dirty =
    machine !== init.machine || what !== init.what || component !== init.component || start !== init.start || notes !== init.notes || hours !== "" || mode !== "" || priority !== fallback;

  const submit = async () => {
    setTried(true);
    if (!what.trim() || !start || !priority || hoursBad) return;
    setErr(null);
    setBusy(true);
    const out = await onPropose({
      machineId: machine,
      ruleId: draft?.ruleId ?? null,
      title: what.trim(),
      component: component.trim() || null,
      priority,
      notes: notes.trim() || null,
      actionKind: "repair",
      workMode: mode === "Run" || mode === "Isolate" ? mode : null,
      // datetime-local is the browser's wall clock; Date reads it in the browser's zone.
      plannedStart: new Date(start).toISOString(),
      estimateHours: h,
      type: draft?.type ?? "predictive",
      componentId: draft?.componentId ?? null,
    });
    setBusy(false);
    if (out.tone === "bad") setErr(out.text);
    else onClose();
  };

  const fixedMachine = Boolean(draft?.machineId);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      subtitle={fixedMachine && draft?.machineId ? machineName(draft.machineId) : "Goes on the calendar and into Work orders"}
      busy={busy}
      dirty={dirty}
      onSubmit={() => void submit()}
      width={600}
      footer={
        <>
          <PillButton variant="secondary" type="button" onClick={onClose} disabled={busy}>
            Cancel
          </PillButton>
          <PillButton type="submit" loading={busy}>
            Plan job
          </PillButton>
        </>
      }
    >
      <FieldGrid>
        {!fixedMachine && (
          <Field label="Machine" wide>
            {(fid, d) => <Select id={fid} describedBy={d} value={machine} onChange={setMachine} options={machineIds.map((m) => ({ value: m, label: machineName(m) }))} />}
          </Field>
        )}
        <Field label="Work planned" wide required error={need(what, "Say what work is planned")}>
          {(fid, d) => <TextInput id={fid} describedBy={d} value={what} onChange={setWhat} placeholder="Replace exhaust fan bearings" />}
        </Field>
        <Field label="Part of the machine">
          {(fid, d) => <TextInput id={fid} describedBy={d} value={component} onChange={setComponent} />}
        </Field>
        <Field label="Priority" required error={need(priority, "Choose a priority")}>
          {(fid, d) => <Select id={fid} describedBy={d} value={priority} onChange={setPriority} options={priorityOptions(priorities, priority)} />}
        </Field>
        <Field label="Start" required error={need(start, "Pick when the work is planned")}>
          {(fid, d) => <input id={fid} aria-describedby={d} className="ui-input" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />}
        </Field>
        <Field label="Hours of work" hint="Estimate" error={tried && hoursBad ? "Enter hours as a number, like 1.5" : null}>
          {(fid, d) => <NumberInput id={fid} describedBy={d} value={hours} onChange={setHours} min={0} step="any" />}
        </Field>
        <Field label="How the work is done" wide>
          {(fid, d) => (
            <Select
              id={fid}
              describedBy={d}
              value={mode}
              onChange={setMode}
              options={[
                { value: "", label: "Decide later, when planning" },
                { value: "Run", label: "While the machine runs" },
                { value: "Isolate", label: "Machine stopped and locked off (permit needed)" },
              ]}
            />
          )}
        </Field>
        <Field label="Notes" wide>
          {(fid, d) => <TextArea id={fid} describedBy={d} value={notes} onChange={setNotes} rows={3} />}
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
