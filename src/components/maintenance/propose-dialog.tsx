"use client";

import React, { useEffect, useState } from "react";
import { Dialog, Field, FieldGrid, PillButton, Select, TextArea, TextInput } from "@/components/ui";
import { PRIORITY_LABEL } from "@/lib/pms";
import type { PmsFinding, PmsModel } from "./pms-model";
import { machineCode } from "./pms-model";

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
  const [machine, setMachine] = useState("");
  const [title, setTitle] = useState("");
  const [component, setComponent] = useState("");
  const [priority, setPriority] = useState("P3");
  const [mode, setMode] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setMachine(finding?.machineId ?? defaultMachine ?? machineIds[0] ?? "");
    setTitle(finding ? finding.action : "");
    setComponent(finding ? finding.subs.join(", ") : "");
    setPriority(finding ? finding.priority : "P3");
    setMode("");
    setNotes(finding ? `${finding.name}. Evidence: ${finding.evidence}. Likely cause: ${finding.cause}.` : "");
    setErr(null);
    // Only when opened: the live finding re-renders every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, finding?.ruleId]);
  const submit = async () => {
    if (!title.trim()) {
      setErr("Describe the work requested");
      return;
    }
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
      title={finding ? "Propose work request" : "New work request"}
      subtitle={finding ? `${machineCode(finding.machineId)} · finding ${finding.ruleId} · ${finding.name}` : "Manual request · reviewed before planning"}
      busy={busy}
      onSubmit={() => void submit()}
      width={600}
      footer={
        <>
          <PillButton variant="secondary" type="button" onClick={onClose} disabled={busy}>
            Cancel
          </PillButton>
          <PillButton type="submit" loading={busy}>
            Propose request
          </PillButton>
        </>
      }
    >
      <FieldGrid>
        {!finding && (
          <Field label="Machine" wide>
            {(fid, d) => <Select id={fid} describedBy={d} value={machine} onChange={setMachine} options={machineIds.map((m) => ({ value: m, label: machineCode(m) }))} />}
          </Field>
        )}
        <Field label="Suggested work" wide required>
          {(fid, d) => <TextInput id={fid} describedBy={d} value={title} onChange={setTitle} placeholder="Inspect gear coupling condition" />}
        </Field>
        <Field label="Equipment / component">
          {(fid, d) => <TextInput id={fid} describedBy={d} value={component} onChange={setComponent} />}
        </Field>
        <Field label="Suggested priority" hint="Reviewed against site policy">
          {(fid, d) => <Select id={fid} describedBy={d} value={priority} onChange={setPriority} options={["P1", "P2", "P3", "P4"].map((p) => ({ value: p, label: `${p} · ${PRIORITY_LABEL[p]}` }))} />}
        </Field>
        <Field label="Work mode">
          {(fid, d) => <Select id={fid} describedBy={d} value={mode} onChange={setMode} options={[{ value: "", label: "Decide in planning" }, { value: "Run", label: "Operating checks" }, { value: "Isolate", label: "Isolation (plant permit)" }]} />}
        </Field>
        <Field label="Evidence and notes" wide>
          {(fid, d) => <TextArea id={fid} describedBy={d} value={notes} onChange={setNotes} rows={3} />}
        </Field>
      </FieldGrid>
      {err && <p className="ui-form-note" data-tone="bad">{err}</p>}
    </Dialog>
  );
}
