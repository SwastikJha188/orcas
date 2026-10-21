"use client";

/**
 * Starts a case: one problem on one machine (optionally one part), what was
 * seen, who looks after it, how soon, and how the machine was running.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useApi } from "@/lib/api-cache";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { useMachineCatalog } from "@/components/assets/use-machine-catalog";
import type { AssetMachine } from "@/components/assets/assets-data";
import { Dialog, Field, FieldGrid, PillButton, Select, TextArea, TextInput, type SelectOption } from "@/components/ui";
import { CaseApiError, VOCABULARY_URL, casesApi, type CaseVocabulary } from "./cases-api";
import "./problems.css";

export interface NewCasePreset {
  machineId?: string;
  partId?: string | null;
  title?: string;
  observation?: string;
  guideId?: string | null;
  ruleCode?: string | null;
}

interface Draft {
  machineId: string;
  partId: string;
  title: string;
  observation: string;
  ownerUserId: string;
  priority: string;
  runningMode: string;
  runningNote: string;
}

const FALLBACK_PRIORITIES: SelectOption[] = [{ value: "unassigned", label: "Not set" }];
const FALLBACK_MODES: SelectOption[] = [{ value: "unknown", label: "Not known" }];

/** The machine's parts (needs the catalog hook, so it renders only with a machine). */
function PartSelect({ machine, id, describedBy, value, onChange }: { machine: AssetMachine; id: string; describedBy?: string; value: string; onChange: (v: string) => void }) {
  const catalog = useMachineCatalog(machine);
  const options = useMemo(() => {
    const parts = catalog.subassemblies.map((s) => ({ value: s.subassemblyId, label: s.name }));
    // Keep a preset part visible while the catalog loads.
    if (value && !parts.some((p) => p.value === value)) parts.unshift({ value, label: catalog.isLoading ? "Loading parts…" : value });
    return [{ value: "", label: "Whole machine" }, ...parts];
  }, [catalog.subassemblies, catalog.isLoading, value]);
  return <Select id={id} describedBy={describedBy} value={value} onChange={onChange} options={options} />;
}

export function NewCaseDialog({
  open,
  onClose,
  onCreated,
  preset,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: number) => void;
  preset?: NewCasePreset;
}) {
  const { machines, users, currentUser } = useIndustrialData();
  const { data: vocab } = useApi<CaseVocabulary>(VOCABULARY_URL);
  const [draft, setDraft] = useState<Draft | null>(null);
  // What the form opened with, so a stray click does not throw away typed input.
  const [first, setFirst] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const ctx = useRef({ preset, machines, currentUser });
  ctx.current = { preset, machines, currentUser };

  // A fresh form each time the dialog opens, filled from the preset.
  useEffect(() => {
    if (!open) return;
    const { preset: p, machines: ms, currentUser: me } = ctx.current;
    const machineId = p?.machineId ?? ms[0]?.id ?? "";
    const fresh: Draft = {
      machineId,
      partId: p?.machineId && p.machineId === machineId ? (p.partId ?? "") : "",
      title: p?.title ?? "",
      observation: p?.observation ?? "",
      ownerUserId: me?.id ?? "",
      priority: "unassigned",
      runningMode: "unknown",
      runningNote: "",
    };
    setDraft(fresh);
    setFirst(fresh);
    setError(null);
    setTried(false);
  }, [open]);

  const machine = machines.find((m) => m.id === draft?.machineId) ?? null;
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));
  const need = (v: string | undefined, msg: string) => (tried && !v?.trim() ? msg : null);
  const dirty = Boolean(draft && first && (Object.keys(draft) as (keyof Draft)[]).some((k) => draft[k] !== first[k]));

  const machineOptions: SelectOption[] = useMemo(() => {
    const list = machines.map((m) => ({ value: m.id, label: m.name }));
    // A preset machine outside the selected plant still shows by its id.
    if (draft?.machineId && !list.some((m) => m.value === draft.machineId)) list.unshift({ value: draft.machineId, label: draft.machineId });
    return draft?.machineId ? list : [{ value: "", label: "Choose a machine" }, ...list];
  }, [machines, draft?.machineId]);

  const save = async () => {
    if (!draft) return;
    setTried(true);
    if (!draft.machineId || !draft.title.trim() || !draft.observation.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const id = await casesApi.create({
        machineId: draft.machineId,
        partId: draft.partId || null,
        title: draft.title.trim(),
        observation: draft.observation.trim(),
        ownerUserId: draft.ownerUserId || null,
        priority: draft.priority,
        runningMode: draft.runningMode,
        runningNote: draft.runningNote.trim() || null,
        ruleCode: preset?.ruleCode ?? null,
        guideId: preset?.guideId ?? null,
      });
      onClose();
      onCreated(id);
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
      title="Start a case"
      subtitle={preset?.guideId ? "From an investigation guide. Write down what was actually seen." : "One problem on one machine, followed until the repair is checked."}
      width={680}
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
            Start the case
          </PillButton>
        </>
      }
    >
      {draft && (
        <FieldGrid>
          <Field label="Machine" required error={tried && !draft.machineId ? "Choose the machine" : null}>
            {(id, d) => (
              <Select
                id={id}
                describedBy={d}
                value={draft.machineId}
                onChange={(v) => setDraft((x) => (x ? { ...x, machineId: v, partId: "" } : x))}
                options={machineOptions}
              />
            )}
          </Field>
          <Field label="Part of the machine" hint="Leave as whole machine if you are not sure.">
            {(id, d) =>
              machine ? (
                <PartSelect machine={machine} id={id} describedBy={d} value={draft.partId} onChange={(v) => set("partId", v)} />
              ) : (
                <Select id={id} describedBy={d} value="" onChange={() => {}} options={[{ value: "", label: "Whole machine" }]} disabled />
              )
            }
          </Field>
          <Field label="What is the problem" required wide hint="A short title, for example: Kiln drive motor running hot." error={need(draft.title, "Give the problem a short title")}>
            {(id, d) => <TextInput id={id} describedBy={d} value={draft.title} onChange={(v) => set("title", v)} />}
          </Field>
          <Field
            label="What was seen, when, and how"
            required
            wide
            hint="For example: Bearing reading rose from 2 to 4 mm/s since Monday, seen on the vibration trend."
            error={need(draft.observation, "Write down what was seen")}
          >
            {(id, d) => <TextArea id={id} describedBy={d} rows={4} value={draft.observation} onChange={(v) => set("observation", v)} />}
          </Field>
          <Field label="Who looks after it">
            {(id, d) => (
              <Select
                id={id}
                describedBy={d}
                value={draft.ownerUserId}
                onChange={(v) => set("ownerUserId", v)}
                options={[{ value: "", label: "No one yet" }, ...users.map((u) => ({ value: u.id, label: u.id === currentUser?.id ? `${u.fullName} (you)` : u.fullName }))]}
              />
            )}
          </Field>
          <Field label="How soon">
            {(id, d) => <Select id={id} describedBy={d} value={draft.priority} onChange={(v) => set("priority", v)} options={vocab?.priorities ?? FALLBACK_PRIORITIES} />}
          </Field>
          <Field label="How the machine was running">
            {(id, d) => <Select id={id} describedBy={d} value={draft.runningMode} onChange={(v) => set("runningMode", v)} options={vocab?.modes ?? FALLBACK_MODES} />}
          </Field>
          <Field label="Anything about how it was being run" hint="Optional. Load, speed, settings, or anything unusual.">
            {(id, d) => <TextInput id={id} describedBy={d} value={draft.runningNote} onChange={(v) => set("runningNote", v)} />}
          </Field>
        </FieldGrid>
      )}
    </Dialog>
  );
}
