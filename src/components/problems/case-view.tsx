"use client";

/**
 * Case page: one problem on one machine, followed from first sign to a checked
 * repair. Header (stage, how soon, owner, actions), the stage stepper, the
 * machine's condition strip, then the main column (Diagnosis / Prognosis /
 * Analysis) beside the case tools (checks with the next step, maintenance,
 * files, history with hand-recorded alarms), which stay the same on every tab.
 * Download and Print sit behind the header's "More" menu. Everything comes from
 * /api/cases/<id> (backend/src/services/case-service.ts).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { revalidateApi, useApi } from "@/lib/api-cache";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import { Dialog, Field, FieldGrid, PillButton, PillNav, Select, TextArea, TextInput, Loading } from "@/components/ui";
import { IconBack, StatusTag } from "@/components/assets/assets-shell-ui";
import { useMenuFocus } from "@/components/assets/use-menu-focus";
import { CASES_CHANGED_EVENT, STAGE_TONE, VOCABULARY_URL, casesApi, caseUrl, exportUrl, type CaseDetail, type CaseVocabulary } from "./cases-api";
import { CaseProvider, CheckDialog, ErrorNote, MaintenanceDialog, PRIORITY_TONE, timeOf, useCase, useSave, type CaseCtx } from "./case-shared";
import { AnalysisTab, DiagnosisTab, PrognosisTab } from "./case-tabs";
import { CaseSide } from "./case-side";
import { ConditionStrip } from "./condition-strip";
import { RecordAlarmDialog } from "./record-alarm-dialog";
import "@/components/assets/assets-shell.css";
import "@/components/ui/page.css";
import "./case.css";

type Tab = "diagnosis" | "prognosis" | "analysis";
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "diagnosis", label: "Diagnosis" },
  { id: "prognosis", label: "Prognosis" },
  { id: "analysis", label: "Analysis" },
];

export function CaseView({ caseId, onBack }: { caseId: number; onBack: () => void }) {
  const url = caseUrl(caseId);
  const { data: c, error, isLoading } = useApi<CaseDetail>(url);
  const { data: vocab } = useApi<CaseVocabulary>(VOCABULARY_URL);
  const { users, machines } = useIndustrialData();
  const { timeZone } = useSiteTimeZone({ machineId: c?.machineId ?? null });

  // Re-read when this case (or something without a case, like an acknowledged alarm) changes elsewhere.
  useEffect(() => {
    const on = (e: Event) => {
      const id = (e as CustomEvent<{ caseId?: number | null }>).detail?.caseId;
      if (id === undefined || id === null || id === caseId) void revalidateApi(url);
    };
    window.addEventListener(CASES_CHANGED_EVENT, on);
    return () => window.removeEventListener(CASES_CHANGED_EVENT, on);
  }, [url, caseId]);

  const [tab, setTab] = useState<Tab>("diagnosis");
  const [check, setCheck] = useState<{ causeId?: number | null; detail?: string } | null>(null);
  const [maint, setMaint] = useState(false);
  const [alarm, setAlarm] = useState(false);

  const people = useMemo(
    () => users.filter((u) => u.status !== "Inactive").map((u) => ({ value: u.id, label: u.fullName })).sort((a, b) => a.label.localeCompare(b.label)),
    [users],
  );

  const ctx = useMemo<CaseCtx | null>(
    () =>
      c
        ? {
            c,
            vocab,
            people,
            timeZone,
            when: timeOf(timeZone),
            askCheck: (pre) => setCheck(pre ?? {}),
            sendToMaintenance: () => setMaint(true),
          }
        : null,
    [c, vocab, people, timeZone],
  );

  if (!ctx) {
    return (
      <div className="pg-root ast-root case-root">
        <BackRow onBack={onBack} caseId={caseId} />
        {isLoading && <Loading label="Loading the case…" rows={6} />}
        {error && (
          <p className="pg-note" data-tone="bad" role="alert">
            Could not load this case. It may have been removed. Go back to all cases and try again.
          </p>
        )}
      </div>
    );
  }

  return (
    <CaseProvider value={ctx}>
      <div className="pg-root ast-root case-root">
        <BackRow onBack={onBack} caseId={caseId} />
        <CaseHeader onRecordAlarm={() => setAlarm(true)} />
        <Stepper />
        <div className="case-strip">
          <ConditionStrip plantId={null} machineId={ctx.c.machineId} onRecordAlarm={() => setAlarm(true)} />
        </div>

        <div className="case-layout">
          <div className="case-main">
            <PillNav items={TABS} activeId={tab} onChange={setTab} ariaLabel="Case views" className="case-noprint" />
            {tab === "diagnosis" && <DiagnosisTab />}
            {tab === "prognosis" && <PrognosisTab />}
            {tab === "analysis" && <AnalysisTab />}
          </div>
          <CaseSide />
        </div>

        {check && <CheckDialog pre={check} onClose={() => setCheck(null)} />}
        {maint && <MaintenanceDialog onClose={() => setMaint(false)} />}
        <RecordAlarmDialog open={alarm} machineId={ctx.c.machineId} caseId={ctx.c.id} machines={machines.map((m) => ({ id: m.id, name: m.name }))} onClose={() => setAlarm(false)} />
      </div>
    </CaseProvider>
  );
}

function BackRow({ onBack, caseId }: { onBack: () => void; caseId: number }) {
  return (
    <div className="case-back">
      <PillButton variant="secondary" className="case-noprint" onClick={onBack} icon={<IconBack size={12} />}>
        All cases
      </PillButton>
      <ol className="ast-crumbs" aria-label="Location">
        <li>Problems</li>
        <li>Case {caseId}</li>
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

function CaseHeader({ onRecordAlarm }: { onRecordAlarm: () => void }) {
  const { c, when } = useCase();
  const [details, setDetails] = useState(false);

  return (
    <header className="ast-head pg-head case-head">
      <div className="ast-head-main">
        <div className="ast-title-row">
          <h1 className="ast-title">{c.title}</h1>
        </div>
        <div className="case-chips">
          <StatusTag tone={STAGE_TONE[c.stage] ?? "idle"} label={c.stageWord} />
          <StatusTag tone={PRIORITY_TONE[c.priority] ?? "idle"} label={`How soon: ${c.priorityWord}`} />
          <StatusTag tone={c.ownerName ? "info" : "warn"} label={c.ownerName ? `Looked after by ${c.ownerName}` : "No owner yet"} />
        </div>
        <p className="case-context">
          {c.machineName} · {c.partName ?? "Whole machine"} · started {when(c.createdAt)} · updated {when(c.updatedAt)}
          {c.updatedBy ? ` by ${c.updatedBy}` : ""}
        </p>
      </div>
      <div className="pg-actions case-noprint">
        <PillButton variant="secondary" onClick={() => setDetails(true)}>
          Details
        </PillButton>
        <PillButton variant="secondary" onClick={onRecordAlarm}>
          Record an alarm
        </PillButton>
        <MoreMenu caseId={c.id} />
      </div>
      {details && <DetailsDialog onClose={() => setDetails(false)} />}
    </header>
  );
}

/** Download and Print, the rarely used header actions, behind one "More" button. */
function MoreMenu({ caseId }: { caseId: number }) {
  const [open, setOpen] = useState(false);
  const menu = useMenuFocus(open, () => setOpen(false));
  const wrap = useRef<HTMLSpanElement | null>(null);
  // PillButton takes no ref: the menu returns focus to the first button in the wrapper.
  useEffect(() => {
    menu.triggerRef.current = wrap.current?.querySelector("button") ?? null;
  }, [menu.triggerRef]);
  // A click anywhere else closes it (Esc, Tab and the arrow keys are handled by useMenuFocus).
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);
  const choose = (run: () => void) => () => {
    menu.closeToTrigger();
    run();
  };
  const download = () => {
    const a = document.createElement("a");
    a.href = exportUrl(caseId);
    a.download = `case-${caseId}.json`;
    a.click();
  };
  return (
    <span className="case-menu" ref={wrap}>
      <PillButton variant="secondary" hasDropdown aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        More
      </PillButton>
      {open && (
        <span ref={menu.menuRef} className="ast-menu" role="menu" aria-label="More actions" onKeyDown={menu.onMenuKeyDown}>
          <button type="button" role="menuitem" tabIndex={-1} onClick={choose(download)}>
            Download the case
          </button>
          <button type="button" role="menuitem" tabIndex={-1} onClick={choose(() => window.print())}>
            Print
          </button>
        </span>
      )}
    </span>
  );
}

function DetailsDialog({ onClose }: { onClose: () => void }) {
  const { c, vocab, people } = useCase();
  const save = useSave();
  // The machine's parts (sub-assemblies) from its catalogue: the codes the case stores.
  const catalog = useApi<{ subassemblies?: Array<{ subassemblyId: string; name: string }> }>(`/api/catalog?machineId=${encodeURIComponent(c.machineId)}`);
  const parts = (catalog.data?.subassemblies ?? []).map((p) => ({ id: p.subassemblyId, name: p.name }));
  const [title, setTitle] = useState(c.title);
  const [observation, setObservation] = useState(c.observation);
  const [owner, setOwner] = useState(c.ownerId ?? "");
  const [priority, setPriority] = useState<string>(c.priority);
  const [part, setPart] = useState(c.partId ?? "");
  const [stage, setStage] = useState<string>(c.stage);

  const partOptions = [
    { value: "", label: "Whole machine" },
    ...parts.map((p) => ({ value: p.id, label: p.name })),
    ...(c.partId && !parts.some((p) => p.id === c.partId) ? [{ value: c.partId, label: c.partName ?? c.partId }] : []),
  ];
  const ownerOptions = [
    { value: "", label: "No owner yet" },
    ...people,
    ...(c.ownerId && !people.some((p) => p.value === c.ownerId) ? [{ value: c.ownerId, label: c.ownerName ?? c.ownerId }] : []),
  ];

  const submit = async () => {
    if (!title.trim()) return save.setError("Say what the problem is.");
    if (!observation.trim()) return save.setError("Say what was seen.");
    const patch: Record<string, unknown> = {};
    if (title.trim() !== c.title) patch.title = title.trim();
    if (observation.trim() !== c.observation) patch.observation = observation.trim();
    if (owner !== (c.ownerId ?? "")) patch.ownerUserId = owner || null;
    if (priority !== c.priority) patch.priority = priority;
    if (part !== (c.partId ?? "")) patch.partId = part || null;
    if (stage !== c.stage) patch.stage = stage;
    if (!Object.keys(patch).length) return onClose();
    if (await save.run(() => casesApi.update(c.id, patch))) onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Case details"
      subtitle={`Case ${c.id} · ${c.machineName}`}
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
            Save
          </PillButton>
        </>
      }
    >
      <FieldGrid>
        <Field label="What the problem is" required wide>
          {(id) => <TextInput id={id} value={title} onChange={setTitle} />}
        </Field>
        <Field label="What was seen" required wide>
          {(id) => <TextArea id={id} value={observation} onChange={setObservation} rows={4} />}
        </Field>
        <Field label="Looked after by">
          {(id) => <Select id={id} value={owner} onChange={setOwner} options={ownerOptions} />}
        </Field>
        <Field label="How soon">
          {(id) => <Select id={id} value={priority} onChange={setPriority} options={vocab?.priorities ?? [{ value: c.priority, label: c.priorityWord }]} />}
        </Field>
        <Field label="Part">
          {(id) => <Select id={id} value={part} onChange={setPart} options={partOptions} />}
        </Field>
        <Field label="Stage" hint="The stage also moves on its own when checks and maintenance requests are added.">
          {(id, d) => <Select id={id} describedBy={d} value={stage} onChange={setStage} options={vocab?.stages ?? [{ value: c.stage, label: c.stageWord }]} />}
        </Field>
      </FieldGrid>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Stage stepper                                                       */
/* ------------------------------------------------------------------ */

function Stepper() {
  const { c, vocab } = useCase();
  const stages = vocab?.stages ?? [];
  if (!stages.length) return null;
  const at = stages.findIndex((s) => s.value === c.stage);
  const closed = c.stage === "closed";
  return (
    <ol className="case-steps" aria-label="Stage of the case">
      {stages.map((s, i) => {
        const state = i < at || (closed && i === at) ? "done" : i === at ? "now" : "next";
        return (
          <li key={s.value} className="case-step" data-state={state} aria-current={i === at ? "step" : undefined}>
            <span className="case-step-mark" aria-hidden="true">
              {state === "done" ? (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="5 12 10 17 19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </span>
            <span className="case-step-label">{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
