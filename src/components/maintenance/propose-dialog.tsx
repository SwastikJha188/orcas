"use client";

import React, { useEffect, useState } from "react";
import { Dialog, Field, FieldGrid, PillButton, Select, TextArea, TextInput } from "@/components/ui";
import { useWorkOrderPriorities } from "@/lib/reference-data";
import type { PmsFinding, PmsModel } from "./pms-model";
import { machineName, priorityOptions } from "./pms-model";

/* Propose a work request: from a live finding (prefilled with its evidence) or by hand. */

export function ProposeDialog({
  open,
  finding,
  machineIds,
  defaultMachine,
  onClose,
  onPropose,
}: {
  open: boolean;
  finding: PmsFinding | null;
  /** Machines a manual request may be raised on. */
  machineIds: string[];
  defaultMachine?: string | null;
  onClose: () => void;
  onPropose: PmsModel["propose"];
}) {
  const priorities = useWorkOrderPriorities();
  // A manual request starts at the configured default priority; a finding brings its own.
  const fallback = priorities?.find((p) => p.defaultNew)?.id ?? "";
  const [machine, setMachine] = useState("");
  const [title, setTitle] = useState("");
  const [component, setComponent] = useState("");
  const [priority, setPriority] = useState(fallback);
  const [mode, setMode] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  // What the form opened with, so a stray click does not throw away typed input.
  const [init, setInit] = useState({ machine: "", title: "", component: "", priority: "", notes: "" });
  useEffect(() => {
    if (!open) return;
    const first = {
      machine: finding?.machineId ?? defaultMachine ?? machineIds[0] ?? "",
      title: finding ? finding.action : "",
      component: finding ? finding.subs.join(", ") : "",
      priority: finding ? finding.priority : "",
      notes: finding ? `${finding.name}. Evidence: ${finding.evidence}. Likely cause: ${finding.cause}.` : "",
    };
    setInit(first);
    setMachine(first.machine);
    setTitle(first.title);
    setComponent(first.component);
    setPriority(first.priority || fallback);
    setMode("");
    setNotes(first.notes);
    setErr(null);
    setTried(false);
    // Only when opened: the live finding re-renders every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, finding?.ruleId]);
  // Priorities that arrive after opening fill an empty choice only.
  useEffect(() => {
    if (open && !priority && fallback) setPriority(fallback);
  }, [open, priority, fallback]);
  const need = (v: string, msg: string) => (tried && !v.trim() ? msg : null);
  const dirty =
    machine !== init.machine || title !== init.title || component !== init.component || notes !== init.notes || mode !== "" || priority !== (init.priority || fallback);
  const submit = async () => {
    setTried(true);
    if (!title.trim() || !priority) return;
    setErr(null);
    setBusy(true);
    const out = await onPropose({
      machineId: finding?.machineId ?? machine,
      ruleId: finding?.ruleId ?? null,
      title: title.trim(),
      component: component.trim() || null,
      priority,
      notes: notes.trim() || null,
      actionKind: finding?.severity === "Critical" ? "repair" : "mitigate",
      workMode: mode === "Run" || mode === "Isolate" ? mode : null,
    });
    setBusy(false);
    if (out.tone === "bad") setErr(out.text);
    else onClose();
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={finding ? "Ask for a repair" : "New work request"}
      subtitle={finding ? `${machineName(finding.machineId)} · ${finding.plainTitle || finding.name}` : "An engineer reviews it before it is planned"}
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
            Send request
          </PillButton>
        </>
      }
    >
      <FieldGrid>
        {!finding && (
          <Field label="Machine" wide>
            {(fid, d) => <Select id={fid} describedBy={d} value={machine} onChange={setMachine} options={machineIds.map((m) => ({ value: m, label: machineName(m) }))} />}
          </Field>
        )}
        <Field label="Suggested work" wide required error={need(title, "Describe the work requested")}>
          {(fid, d) => <TextInput id={fid} describedBy={d} value={title} onChange={setTitle} placeholder="Inspect gear coupling condition" />}
        </Field>
        <Field label="Part of the machine">
          {(fid, d) => <TextInput id={fid} describedBy={d} value={component} onChange={setComponent} />}
        </Field>
        <Field label="Suggested priority" hint="An engineer checks it against site rules" required error={need(priority, "Choose a priority")}>
          {(fid, d) => <Select id={fid} describedBy={d} value={priority} onChange={setPriority} options={priorityOptions(priorities, priority)} />}
        </Field>
        <Field label="How the work is done">
          {(fid, d) => <Select id={fid} describedBy={d} value={mode} onChange={setMode} options={[{ value: "", label: "Decide later, when planning" }, { value: "Run", label: "Checks while the machine runs" }, { value: "Isolate", label: "Machine stopped and locked off (permit needed)" }]} />}
        </Field>
        <Field label="What was seen, and notes" wide>
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
