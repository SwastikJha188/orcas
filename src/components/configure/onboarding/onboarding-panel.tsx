"use client";

/**
 * Configure › Onboarding: bring a new plant into ULTRON. One onboarding holds
 * a working draft (plant, areas, people, machines with parts, sensors with
 * ranges and limits) and its uploads. Uploaded PDFs and machine photos are read
 * by the onboarding processor (for now a Claude Code session running the
 * onboarding-process skill: pdf-extract + diagram skills), which fills the
 * draft and stores the machine drawings; everything stays editable here until
 * "Create plant" writes it into the monitoring tables.
 *
 * Data: /api/onboarding (draft, files, commit), /api/onboarding/reference
 * (quantities, units, roles), /api/diagrams + code drawings (drawing kinds).
 * The draft saves itself; while uploads wait it refreshes every 30 s.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ModelSwitch } from "../model-switch";
import { ConfirmAction, Field, FieldGrid, FormNote, PillButton, PillNav, Select, StatusTag, TextArea, TextInput, normalizeNumberText, rowActivate, type PillNavItem, Loading } from "@/components/ui";
import type { Tone } from "@/components/assets/assets-shell-ui";
import { DIAGRAM_SHEETS } from "@/components/assets/diagrams";
import { KIT_MODELS } from "@/components/home/twin/models";
import {
  guessQuantity,
  type DraftMachine,
  type DraftPoint,
  type OnboardingDraft,
  type OnboardingFile,
  type OnboardingPackage,
  type OnboardingStatus,
} from "@shared/types/onboarding";
import { invalidateApi } from "@/lib/api-cache";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { formatLocalTime } from "@/lib/time";
import "./onboarding.css";

type Step = "files" | "plant" | "areas" | "people" | "machines" | "sensors" | "check";
type Pkg = OnboardingPackage & { problems: string[] };
/** A draft change; `removed` names what it takes out, so it can be undone for 10 s. */
type Edit = (fn: (d: OnboardingDraft) => void, removed?: string) => void;
/** What "Create the plant" wrote. */
interface Created {
  plantId: string;
  machines: number;
  points: number;
  users: number;
}

const STEP_ORDER: Step[] = ["files", "plant", "areas", "people", "machines", "sensors", "check"];
const STEP_NAME: Record<Step, string> = {
  files: "Documents & photos",
  plant: "Plant",
  areas: "Areas",
  people: "People",
  machines: "Machines",
  sensors: "Sensors",
  check: "Check & create",
};
/** The step that fixes a problem the server lists, from its opening words (draftProblems); anything else stays on Check & create. */
function problemStep(problem: string): Step {
  if (/^The plant\b/.test(problem)) return "plant";
  if (/^(A machine|Machine|Two machines)\b/.test(problem)) return "machines";
  if (/^Sensor\b/.test(problem)) return "sensors";
  if (/^User\b/.test(problem)) return "people";
  return "check";
}
interface ListRow {
  id: string;
  name: string;
  status: OnboardingStatus;
  files: number;
  machines: number;
  points: number;
  updatedAt: string;
  plantId: string | null;
}
interface ProcState {
  processor: { available: boolean; reason: string | null; model: string };
  run: {
    id: number;
    status: "running" | "done" | "failed" | "stopped";
    model: string;
    lastStep: string | null;
    log: string[];
    error: string | null;
    costUsd: number | null;
    startedAt: string;
    finishedAt: string | null;
  } | null;
}
interface Reference {
  quantities: Array<{ id: string; name: string }>;
  units: Array<{ id: string; symbol: string; name: string }>;
  roles: Array<{ id: string; name: string }>;
}

const STATUS: Record<OnboardingStatus, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "idle" },
  waiting: { label: "Files waiting to be read", tone: "warn" },
  processed: { label: "Ready to check", tone: "good" },
  committed: { label: "Plant created", tone: "good" },
};
const FILE_STATUS: Record<OnboardingFile["status"], { label: string; tone: Tone }> = {
  waiting: { label: "Waiting to be read", tone: "warn" },
  processed: { label: "Read", tone: "good" },
  failed: { label: "Could not read", tone: "bad" },
};
/** The original drawings of the app, offered next to generated ones. */
const BUILT_IN_DRAWINGS = [
  { value: "pump", label: "Centrifugal / slurry pump (built-in)" },
  { value: "mill", label: "Grinding mill (built-in)" },
  { value: "crusher", label: "Crusher / conveyor (built-in)" },
  { value: "blower", label: "Blower / agitator (built-in)" },
  { value: "kiln", label: "Rotary kiln (built-in)" },
];
const CRITICALITY: DraftMachine["criticality"][] = ["A (Critical)", "B (Essential)", "C (General)"];
const PAGE = 60;

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error?.message ?? `${res.status} ${res.statusText}`);
  return body.data as T;
}
const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});
const key = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
/** Typed number → value: "85,5" reads as 85.5, empty is null, anything else is undefined (not a number). */
const num = (v: string): number | null | undefined => {
  const t = normalizeNumberText(v.trim());
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
};
const txt = (v: string) => (v.trim() === "" ? null : v);
const fmtSize = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} kB`);

/* ==================================================================== list */

export function OnboardingPanel({ onCommitted }: { onCommitted?: () => void }) {
  const [rows, setRows] = useState<ListRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    call<ListRow[]>("/api/onboarding")
      .then((r) => {
        setRows(r);
        setError(null);
        // Configure's step list counts onboardings from the shared cache.
        invalidateApi("/api/onboarding");
      })
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const start = async () => {
    setBusy(true);
    try {
      const pkg = await call<Pkg>("/api/onboarding", json("POST", { name: newName }));
      setNewName("");
      setOpenId(pkg.id);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (openId)
    return (
      <OnboardingEditor
        id={openId}
        onBack={() => {
          setOpenId(null);
          load();
        }}
        onCommitted={() => {
          onCommitted?.();
          load();
        }}
      />
    );

  return (
    <section className="ast-card pg-table-card" aria-label="Plant onboarding">
      <div className="ast-card-head">
        <h2 className="ast-card-title">
          Onboardings
          {rows && rows.length > 0 && <span className="ast-caption">{rows.length}</span>}
        </h2>
        <form
          className="onb-start"
          onSubmit={(e) => {
            e.preventDefault();
            if (newName.trim()) void start();
          }}
        >
          <TextInput id="onb-new-name" ariaLabel="Name of the new plant" value={newName} onChange={setNewName} placeholder="Plant name, e.g. Lusaka cement plant" />
          <PillButton variant="primary" type="submit" disabled={!newName.trim() || busy}>
            + Start onboarding
          </PillButton>
        </form>
      </div>
      {error && <FormNote tone="bad">{error}</FormNote>}
      {rows === null ? (
        <Loading label="Loading the onboardings…" rows={4} />
      ) : rows.length === 0 ? (
        <div className="ast-empty">No onboardings yet. Name the plant above to start one.</div>
      ) : (
        <div className="ui-table-container ast-table">
          <table className="ui-table onb-table">
            <thead>
              <tr>
                <th>Plant</th>
                <th>State</th>
                <th className="onb-num">Files</th>
                <th className="onb-num">Machines</th>
                <th className="onb-num">Sensors</th>
                <th>Last change</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="onb-row-link" {...rowActivate(() => setOpenId(r.id))}>
                  <td>
                    <span className="ast-cell-title">{r.name}</span>
                  </td>
                  <td>
                    <StatusTag tone={STATUS[r.status].tone} label={STATUS[r.status].label} />
                  </td>
                  <td className="onb-num">{r.files}</td>
                  <td className="onb-num">{r.machines}</td>
                  <td className="onb-num">{r.points}</td>
                  <td className="ast-cell-text">{formatLocalTime(r.updatedAt, { date: true, seconds: false })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ==================================================================== editor */

function OnboardingEditor({ id, onBack, onCommitted }: { id: string; onBack: () => void; onCommitted: () => void }) {
  const [pkg, setPkg] = useState<Pkg | null>(null);
  const [draft, setDraft] = useState<OnboardingDraft | null>(null);
  const [ref, setRef] = useState<Reference | null>(null);
  const [stored, setStored] = useState<Array<{ diagramType: string; kind: "2d" | "3d"; name: string }>>([]);
  const [step, setStep] = useState<Step>("files");
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "unsaved" | "failed">("saved");
  // Bumped by "Retry save" to run the save again after a failure.
  const [saveTry, setSaveTry] = useState(0);
  const dirty = useRef(false);
  const committed = pkg?.status === "committed";
  // The draft before the last removal or Excel import, kept 10 s for Undo.
  const [undo, setUndo] = useState<{ label: string; verb?: string; draft: OnboardingDraft } | null>(null);
  // What "Create the plant" wrote (counts for the completion block).
  const [created, setCreated] = useState<Created | null>(null);
  const headRef = useRef<HTMLElement | null>(null);

  const load = useCallback(
    async (replaceDraft: boolean) => {
      try {
        const p = await call<Pkg>(`/api/onboarding/${id}`);
        setPkg(p);
        if (replaceDraft || !dirty.current) {
          setDraft(p.draft);
          // A draft from the server replaces the one Undo would bring back.
          setUndo(null);
        }
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [id],
  );
  useEffect(() => {
    void load(true);
    call<Reference>("/api/onboarding/reference").then(setRef, () => setRef({ quantities: [], units: [], roles: [] }));
    call<typeof stored>("/api/diagrams").then(setStored, () => setStored([]));
  }, [load]);

  // Claude Code (the model chosen in ModelSwitch) on this computer reads the uploads: its latest run, refreshed every 5 s while it works.
  const [proc, setProc] = useState<ProcState | null>(null);
  const procRef = useRef<ProcState | null>(null);
  procRef.current = proc;
  const loadProc = useCallback(async () => {
    try {
      const p = await call<ProcState>(`/api/onboarding/${id}/process`);
      setProc(p);
      return p;
    } catch {
      return null;
    }
  }, [id]);
  useEffect(() => void loadProc(), [loadProc]);
  const running = proc?.run?.status === "running";
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      void loadProc();
      void load(false);
    }, 5000);
    return () => clearInterval(t);
  }, [running, loadProc, load]);
  const startReading = useCallback(async () => {
    try {
      setProc(await call<ProcState>(`/api/onboarding/${id}/process`, { method: "POST" }));
    } catch (e) {
      setError((e as Error).message);
      void loadProc();
    }
  }, [id, loadProc]);
  const stopReading = useCallback(async () => {
    try {
      setProc(await call<ProcState>(`/api/onboarding/${id}/process`, { method: "DELETE" }));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);
  /** After an upload: show it, then let Claude Code read it straight away (when it can and is not already reading). */
  const afterUpload = useCallback(async () => {
    await load(false);
    const p = procRef.current;
    if (p?.processor.available && p.run?.status !== "running") void startReading();
  }, [load, startReading]);

  // Uploads read elsewhere (no Claude Code here): look again every 30 s while any wait.
  const waiting = pkg?.files.some((f) => f.status === "waiting") ?? false;
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(() => void load(false), 30_000);
    return () => clearInterval(t);
  }, [waiting, load]);

  // The draft saves itself 1.2 s after the last change.
  useEffect(() => {
    if (!draft || !dirty.current || committed) return;
    setSaveState("unsaved");
    const t = setTimeout(async () => {
      setSaveState("saving");
      try {
        const p = await call<Pkg>(`/api/onboarding/${id}`, json("PUT", { draft }));
        dirty.current = false;
        setPkg(p);
        setSaveState("saved");
      } catch (e) {
        setError((e as Error).message);
        setSaveState("failed");
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [draft, id, committed, saveTry]);

  // Leaving the page with changes not saved yet: the browser asks first.
  const unsaved = !committed && saveState !== "saved";
  useEffect(() => {
    if (!unsaved) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  const edit = useCallback((fn: (d: OnboardingDraft) => void) => {
    setDraft((d) => {
      if (!d) return d;
      const next: OnboardingDraft = JSON.parse(JSON.stringify(d));
      fn(next);
      dirty.current = true;
      return next;
    });
  }, []);

  // Every step edits through this: a removal keeps the draft before it for Undo; any other change drops it.
  const draftRef = useRef<OnboardingDraft | null>(null);
  draftRef.current = draft;
  const change = useCallback<Edit>(
    (fn, removed) => {
      const before = draftRef.current;
      setUndo(removed && before ? { label: removed, draft: before } : null);
      edit(fn);
    },
    [edit],
  );
  /** An Excel workbook read into the draft (server-side, from this draft): applied here so the autosave stores it, with Undo. */
  const applyImport = useCallback((next: OnboardingDraft, fileName: string) => {
    const before = draftRef.current;
    setUndo(before ? { verb: "Read", label: fileName, draft: before } : null);
    dirty.current = true;
    setDraft(next);
  }, []);
  useEffect(() => {
    if (!undo) return;
    const t = window.setTimeout(() => setUndo(null), 10_000);
    return () => window.clearTimeout(t);
  }, [undo]);
  /** Puts the removed item back; the autosave stores the restored draft. */
  const undoRemove = () => {
    if (!undo) return;
    dirty.current = true;
    setDraft(undo.draft);
    setUndo(null);
  };

  // A created plant opens on its completion block.
  useEffect(() => {
    if (committed) setStep("check");
  }, [committed]);

  const drawingOptions = useMemo(() => {
    const kinds = new Map<string, { label: string; has2d: boolean; has3d: boolean }>();
    for (const s of DIAGRAM_SHEETS) kinds.set(s.diagramType, { label: s.label, has2d: true, has3d: false });
    for (const m of KIT_MODELS)
      kinds.set(m.diagramType, {
        ...(kinds.get(m.diagramType) ?? { label: m.model.name, has2d: false }),
        has3d: true,
      });
    for (const d of stored) {
      const k = kinds.get(d.diagramType) ?? {
        label: d.name,
        has2d: false,
        has3d: false,
      };
      if (d.kind === "2d") k.has2d = true;
      else k.has3d = true;
      kinds.set(d.diagramType, k);
    }
    return [
      { value: "", label: "None yet (upload a photo)" },
      ...[...kinds.entries()].map(([value, k]) => ({
        value,
        label: `${k.label} · ${[k.has2d && "2D", k.has3d && "3D"].filter(Boolean).join(" + ")}`,
      })),
      ...BUILT_IN_DRAWINGS,
    ];
  }, [stored]);

  if (!pkg || !draft)
    return (
      <section className="ast-card">
        <div className="ast-empty">{error ?? <Loading label="Loading the onboarding…" rows={5} inline />}</div>
      </section>
    );

  // Progress per step: problems the server found, mapped to the step that fixes them.
  const toFix = new Map<Step, number>();
  for (const p of pkg.problems) toFix.set(problemStep(p), (toFix.get(problemStep(p)) ?? 0) + 1);
  const done: Record<Step, boolean> = {
    files: pkg.files.length > 0 && !pkg.files.some((f) => f.status === "waiting"),
    plant: !toFix.has("plant"),
    areas: draft.areas.length > 0 && draft.areas.every((a) => a.name.trim() !== ""),
    people: draft.users.length > 0 && !toFix.has("people"),
    machines: draft.machines.length > 0 && !toFix.has("machines"),
    sensors: draft.points.length > 0 && !toFix.has("sensors"),
    check: committed,
  };
  const progress = (s: Step): React.ReactNode => {
    const n = toFix.get(s) ?? 0;
    if (n > 0) return <span className="onb-step-fix">{n} to fix</span>;
    if (!done[s]) return null;
    return (
      <span className="onb-step-done">
        <span aria-hidden="true">✓</span>
        <span className="sr-only">done</span>
      </span>
    );
  };
  const counts: Partial<Record<Step, number>> = {
    files: pkg.files.length,
    areas: draft.areas.length,
    people: draft.users.length,
    machines: draft.machines.length,
    sensors: draft.points.length,
  };
  const steps: PillNavItem<Step>[] = STEP_ORDER.map((s, i) => ({
    id: s,
    label: `${i + 1} ${STEP_NAME[s]}${counts[s] !== undefined ? ` (${counts[s]})` : ""}`,
    suffix: progress(s),
  }));
  const at = STEP_ORDER.indexOf(step);
  /** Back / Next and the problem links: show the step from its top. */
  const go = (s: Step) => {
    setStep(s);
    headRef.current?.scrollIntoView({ block: "nearest" });
  };

  return (
    <div className="onb-editor">
      <section ref={headRef} className="ast-card onb-headcard" aria-label="Onboarding">
        <div className="ast-card-head">
          <h2 className="ast-card-title">
            <button type="button" className="onb-back" onClick={onBack} aria-label="Back to all onboardings">
              ‹ All onboardings
            </button>
            {draft.plant.name || pkg.name}
            <span className="ast-caption">
              <StatusTag tone={STATUS[pkg.status].tone} label={STATUS[pkg.status].label} />{" "}
              {committed ? "Read-only" : saveState === "saved" ? "All changes saved" : saveState === "saving" ? "Saving…" : saveState === "failed" ? "Could not save" : "Not saved yet"}
              {undo && !committed && ` · ${undo.verb ?? "Removed"} ${undo.label}`}
            </span>
            {undo && !committed && (
              <button type="button" className="onb-mini" onClick={undoRemove}>
                Undo
              </button>
            )}
            {!committed && saveState === "failed" && (
              <button type="button" className="onb-mini" onClick={() => setSaveTry((n) => n + 1)}>
                Retry save
              </button>
            )}
          </h2>
        </div>
        <div className="onb-steps">
          <PillNav items={steps} activeId={step} onChange={setStep} ariaLabel="Onboarding steps" wrap />
          <span className="ast-caption onb-step-of">
            Step {at + 1} of {STEP_ORDER.length}
          </span>
        </div>
        {error && <FormNote tone="bad">{error}</FormNote>}
      </section>

      <fieldset className="onb-fieldset" disabled={committed}>
        {step === "files" && <ExcelCard pkgId={pkg.id} getDraft={() => draftRef.current} onImported={applyImport} setError={setError} />}
        {step === "files" && (
          <FilesStep
            pkg={pkg}
            draft={draft}
            onChanged={() => load(false)}
            onUploaded={() => void afterUpload()}
            setError={setError}
            reader={<ReaderCard pkgId={pkg.id} proc={proc} waiting={pkg.files.filter((f) => f.status === "waiting").length} onStart={startReading} onStop={stopReading} onModel={() => void loadProc()} />}
          />
        )}
        {step === "plant" && <PlantStep draft={draft} edit={change} />}
        {step === "areas" && <AreasStep id={id} files={pkg.files} draft={draft} edit={change} onUploaded={() => void afterUpload()} setError={setError} />}
        {step === "people" && <PeopleStep draft={draft} edit={change} roles={ref?.roles ?? []} />}
        {step === "machines" && (
          <MachinesStep id={id} files={pkg.files} draft={draft} edit={change} drawingOptions={drawingOptions} onUploaded={() => void afterUpload()} setError={setError} />
        )}
        {step === "sensors" && <SensorsStep draft={draft} edit={change} reference={ref} />}
      </fieldset>
      {step === "check" ? (
        <CheckStep
          id={id}
          pkg={pkg}
          draft={draft}
          saving={saveState !== "saved"}
          created={created}
          onGo={go}
          onBack={onBack}
          onCommitted={(r) => {
            setCreated(r);
            void load(true);
            onCommitted();
          }}
        />
      ) : (
        // While files wait on the first step, reading them is the step's one primary action; Next goes quiet.
        <StepFooter at={at} onGo={go} quietNext={STEP_ORDER[at] === "files" && waiting} />
      )}
    </div>
  );
}

/**
 * Back / Next under every step; Next is the one primary action and names the
 * step it opens. The last step passes its own primary ("Create the plant").
 */
function StepFooter({ at, onGo, primary, quietNext = false }: { at: number; onGo: (s: Step) => void; primary?: React.ReactNode; quietNext?: boolean }) {
  const prev = STEP_ORDER[at - 1];
  const next = STEP_ORDER[at + 1];
  return (
    <nav className="onb-stepfoot" aria-label="Previous or next step">
      {prev && (
        <PillButton variant="secondary" type="button" onClick={() => onGo(prev)}>
          ‹ Back
        </PillButton>
      )}
      {primary ??
        (next && (
          <PillButton variant={quietNext ? "secondary" : "primary"} type="button" onClick={() => onGo(next)}>
            Next: {STEP_NAME[next]} ›
          </PillButton>
        ))}
    </nav>
  );
}

/* ==================================================================== 1 files */

function FilesStep({
  pkg,
  draft,
  onChanged,
  onUploaded,
  setError,
  reader,
}: {
  pkg: Pkg;
  draft: OnboardingDraft;
  onChanged: () => void;
  onUploaded: () => void;
  setError: (e: string | null) => void;
  reader: React.ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [over, setOver] = useState(false);
  const upload = async (files: FileList | File[]) => {
    // Only PDFs are read here (photos go on their machine or area); anything else is named and left out.
    const all = Array.from(files);
    const pdfs = all.filter((f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name));
    const skipped = all.filter((f) => !pdfs.includes(f));
    if (skipped.length) setError(skipped.map((f) => `${f.name}: only PDF files are read here.`).join(" "));
    if (!pdfs.length) return;
    for (const f of pdfs) {
      setUploading((n) => n + 1);
      const form = new FormData();
      form.append("file", f);
      try {
        await call(`/api/onboarding/${pkg.id}/files`, {
          method: "POST",
          body: form,
        });
      } catch (e) {
        setError(`${f.name}: ${(e as Error).message}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    onUploaded();
  };
  const remove = async (f: OnboardingFile) => {
    try {
      await call(`/api/onboarding/${pkg.id}/files/${f.id}`, {
        method: "DELETE",
      });
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const machineName = (k: string | null) => draft.machines.find((m) => m.key === k)?.name ?? "—";
  return (
    <section className="ast-card pg-table-card" aria-label="Documents and photos">
      <div className="ast-card-head">
        <h2 className="ast-card-title">
          Documents and photos
          <span className="ast-caption">
            PDFs: sensor lists, specifications, maintenance checklists, drawings. Photos of machines and factories are added on them (steps 3 and 5).
          </span>
        </h2>
      </div>
      <div
        className="onb-drop"
        data-over={over || undefined}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void upload(e.dataTransfer.files);
        }}
      >
        <span>Drop PDF files here, or</span>
        <PillButton variant="secondary" type="button" onClick={() => input.current?.click()}>
          Choose files…
        </PillButton>
        <input ref={input} type="file" accept="application/pdf" multiple hidden onChange={(e) => e.target.files && void upload(e.target.files)} />
        {uploading > 0 && <span className="ast-caption">Uploading {uploading}…</span>}
      </div>
      {reader}
      {pkg.files.length === 0 ? (
        <div className="ast-empty">Nothing uploaded yet. You can also fill every step by hand.</div>
      ) : (
        <div className="ui-table-container ast-table">
          <table className="ui-table onb-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Kind</th>
                <th>State</th>
                <th>What was read</th>
                <th className="onb-num">Size</th>
                <th aria-label="Remove" />
              </tr>
            </thead>
            <tbody>
              {pkg.files.map((f) => (
                <tr key={f.id}>
                  <td>
                    <a className="onb-link" href={`/api/onboarding/${pkg.id}/files/${f.id}`}>
                      {f.fileName}
                    </a>
                  </td>
                  <td className="ast-cell-text">{f.kind === "document" ? "Document" : `Photo of ${machineName(f.machineKey)}`}</td>
                  <td>
                    <StatusTag tone={FILE_STATUS[f.status].tone} label={FILE_STATUS[f.status].label} title={f.note ?? undefined} />
                  </td>
                  <td className="ast-cell-text">{f.summary ?? f.note ?? "—"}</td>
                  <td className="onb-num">{fmtSize(f.sizeBytes)}</td>
                  <td>
                    {/* Uploads are deleted on the server, so they ask first (draft rows offer Undo instead). */}
                    <span className="onb-actions">
                      <ConfirmAction label="Remove" ariaLabel={`Remove ${f.fileName}`} question={`Remove ${f.fileName}?`} confirmLabel="Remove" onConfirm={() => void remove(f)} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ==================================================================== Excel */

interface ExcelSummary {
  plant: boolean;
  added: { areas: number; machines: number; parts: number; sensors: number };
  updated: { areas: number; machines: number; parts: number; sensors: number };
  notes: string[];
}

/** "2 areas, 1 machine and 14 sensors"; null when all are zero. */
function countWords(c: ExcelSummary["added"]): string | null {
  const parts = (
    [
      [c.areas, "area", "areas"],
      [c.machines, "machine", "machines"],
      [c.parts, "part", "parts"],
      [c.sensors, "sensor", "sensors"],
    ] as const
  )
    .filter(([n]) => n > 0)
    .map(([n, one, many]) => `${n} ${n === 1 ? one : many}`);
  if (!parts.length) return null;
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/**
 * The asset hierarchy from one workbook: download the Excel format (filled with
 * what the draft holds), fill in Plant, Areas, Machines, Parts and Sensors,
 * upload it. The server reads it into this draft and nothing is removed; rows
 * with the same name, code or tag are updated.
 */
function ExcelCard({
  pkgId,
  getDraft,
  onImported,
  setError,
}: {
  pkgId: string;
  getDraft: () => OnboardingDraft | null;
  onImported: (draft: OnboardingDraft, fileName: string) => void;
  setError: (e: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [over, setOver] = useState(false);
  const [result, setResult] = useState<{ fileName: string; summary: ExcelSummary } | null>(null);
  const read = async (files: FileList | File[]) => {
    const f = Array.from(files)[0];
    if (!f) return;
    if (!/\.xlsx$/i.test(f.name)) {
      setError(`${f.name}: choose an Excel workbook (.xlsx).`);
      return;
    }
    setReading(true);
    setResult(null);
    const form = new FormData();
    form.append("file", f);
    const draft = getDraft();
    if (draft) form.append("draft", JSON.stringify(draft));
    try {
      const r = await call<{ draft: OnboardingDraft; summary: ExcelSummary }>(`/api/onboarding/${pkgId}/excel`, { method: "POST", body: form });
      onImported(r.draft, f.name);
      setResult({ fileName: f.name, summary: r.summary });
      setError(null);
    } catch (e) {
      setError(`${f.name}: ${(e as Error).message}`);
    } finally {
      setReading(false);
      if (input.current) input.current.value = "";
    }
  };
  const s = result?.summary;
  const added = s && countWords(s.added);
  const updated = s && countWords(s.updated);
  return (
    <section className="ast-card onb-excel" aria-label="Fill from Excel">
      <div className="ast-card-head">
        <h2 className="ast-card-title">
          Fill from Excel
          <span className="ast-caption">Plant, areas, machines, parts and sensors in one workbook. Uploading it again updates the same rows; nothing is removed.</span>
        </h2>
      </div>
      <div
        className="onb-drop"
        data-over={over || undefined}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void read(e.dataTransfer.files);
        }}
      >
        <span>Drop the filled-in workbook here, or</span>
        <PillButton variant="secondary" type="button" loading={reading} onClick={() => input.current?.click()}>
          Upload Excel…
        </PillButton>
        <a className="btn-pill btn-pill-secondary" href={`/api/onboarding/${pkgId}/excel`} download>
          Download Excel format
        </a>
        <input
          ref={input}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          hidden
          onChange={(e) => e.target.files && void read(e.target.files)}
        />
        {reading && <span className="ast-caption">Reading…</span>}
      </div>
      {s && result && (
        <>
          <FormNote tone={s.notes.length ? "warn" : "good"}>
            Read {result.fileName}:{" "}
            {[added && `added ${added}`, updated && `updated ${updated}`, s.plant && "updated the plant details"].filter(Boolean).join("; ") || "nothing new"}.
            {s.notes.length > 0 && ` ${s.notes.length} row${s.notes.length === 1 ? " was" : "s were"} not read as written:`}
          </FormNote>
          {s.notes.length > 0 && (
            <ul className="onb-log onb-excel-notes" aria-label="Rows not read as written">
              {s.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

/* ==================================================================== reading with Claude Code */

const modelName = (m: string) => {
  const family = /haiku/i.test(m) ? "Haiku" : /sonnet/i.test(m) ? "Sonnet" : /opus/i.test(m) ? "Opus" : /fable/i.test(m) ? "Fable" : null;
  const version = /(\d+)[-.](\d+)/.exec(m);
  return family ? `${family}${version ? ` ${version[1]}.${version[2]}` : ""}` : m;
};
const minutes = (from: string, to?: string | null) => {
  const ms = (to ? new Date(to).getTime() : Date.now()) - new Date(from).getTime();
  const m = Math.max(0, Math.round(ms / 60000));
  return m < 1 ? "under a minute" : `${m} min`;
};

/**
 * Who reads the uploads and how far it got: Claude Code (Haiku) on this
 * computer, started after each upload or by hand; its current step, a log
 * tail, stop / try again. Without Claude Code here, how to read them by hand.
 */
function ReaderCard({
  pkgId,
  proc,
  waiting,
  onStart,
  onStop,
  onModel,
}: {
  pkgId: string;
  proc: ProcState | null;
  waiting: number;
  onStart: () => void;
  onStop: () => void;
  /** The model that reads uploads was switched. */
  onModel?: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (!proc) return null;
  const run = proc.run;
  const who = `Claude Code (${modelName(run?.model ?? proc.processor.model)})`;
  if (!proc.processor.available)
    return waiting ? (
      <FormNote tone="info">
        {waiting} file{waiting === 1 ? " is" : "s are"} waiting to be read. {proc.processor.reason} In Claude Code, ask it to &ldquo;process onboarding {pkgId}&rdquo;; this page
        shows the results as they arrive.
      </FormNote>
    ) : null;
  const details = run && run.log.length > 0 && (
    <>
      <button type="button" className="onb-mini" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? "Hide steps" : "Show steps"}
      </button>
      {open && (
        <ol className="onb-log" aria-label="Steps so far">
          {run.log.slice(-14).map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ol>
      )}
    </>
  );
  if (run?.status === "running")
    return (
      <div className="onb-reader" data-state="running" role="status">
        <span className="onb-reader-line">
          <i aria-hidden="true" />
          <b>{who} is reading the uploads</b>
          <span className="ast-caption">
            {run.lastStep ?? "Working"} · for {minutes(run.startedAt)}
          </span>
          <button type="button" className="onb-mini" onClick={onStop}>
            Stop
          </button>
          {details}
        </span>
      </div>
    );
  return (
    <div className="onb-reader" data-state={run?.status ?? "idle"}>
      {run?.status === "failed" && <FormNote tone="bad">{run.error ?? "Reading stopped with a problem."}</FormNote>}
      <span className="onb-reader-line">
        {waiting > 0 ? (
          <>
            <b>
              {waiting} file{waiting === 1 ? " is" : "s are"} waiting to be read
            </b>
            <PillButton variant="primary" type="button" onClick={onStart}>
              {run?.status === "failed" || run?.status === "stopped" ? "Try again" : `Read with ${who}`}
            </PillButton>
          </>
        ) : run?.status === "done" ? (
          <span className="ast-caption">
            Read by {who} in {minutes(run.startedAt, run.finishedAt)}
            {run.costUsd !== null ? ` · usage $${run.costUsd.toFixed(2)}` : ""}
          </span>
        ) : null}
        {details}
      </span>
      <ModelSwitch onChange={onModel} />
    </div>
  );
}

/* ==================================================================== photos */

/**
 * The photos (or drawings, layouts, P&IDs) uploaded for one machine or area,
 * with their read state, and "Add photo". The onboarding processor turns each
 * into the machine's 2D drawing and 3D model, or the area's line drawing.
 */
function PhotoStrip({
  pkgId,
  subjectKey,
  subjectName,
  field,
  files,
  drawing,
  onUploaded,
  setError,
}: {
  pkgId: string;
  subjectKey: string;
  subjectName: string;
  field: "machineKey" | "areaKey";
  files: OnboardingFile[];
  /** Drawing kind already made for it, if any. */
  drawing: string | null;
  onUploaded: () => void;
  setError: (e: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const mine = files.filter((f) => f.kind === "image" && f.machineKey === subjectKey);
  const upload = async (list: FileList) => {
    setBusy(true);
    for (const file of Array.from(list)) {
      const form = new FormData();
      form.append("file", file);
      form.append(field, subjectKey);
      try {
        await call(`/api/onboarding/${pkgId}/files`, { method: "POST", body: form });
      } catch (e) {
        setError(`${file.name}: ${(e as Error).message}`);
      }
    }
    setBusy(false);
    onUploaded();
  };
  return (
    <span className="onb-photos">
      {mine.map((f) => (
        <a
          key={f.id}
          className="onb-thumb"
          data-state={f.status}
          href={`/api/onboarding/${pkgId}/files/${f.id}`}
          title={`${f.fileName} · ${FILE_STATUS[f.status].label}${f.summary ? ` · ${f.summary}` : ""}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- an uploaded file served by the API, not a static asset */}
          <img src={`/api/onboarding/${pkgId}/files/${f.id}`} alt={`Photo of ${subjectName}`} loading="lazy" />
          <i aria-hidden="true" />
        </a>
      ))}
      {drawing && <span className="ast-caption">Drawing made</span>}
      <button type="button" className="onb-mini" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? "Uploading…" : mine.length ? "+ Photo" : "Add photo"}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) void upload(e.target.files);
          e.target.value = "";
        }}
      />
    </span>
  );
}

/* ==================================================================== 2 plant */

function PlantStep({ draft, edit }: { draft: OnboardingDraft; edit: Edit }) {
  const zones = useMemo(() => {
    try {
      return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone");
    } catch {
      return [];
    }
  }, []);
  const p = draft.plant;
  const set = (k: keyof typeof p) => (v: string) =>
    edit((d) => {
      (d.plant as unknown as Record<string, string | null>)[k] = k === "name" || k === "code" ? v : txt(v);
    });
  return (
    <section className="ast-card" aria-label="Plant">
      <div className="ast-card-head">
        <h2 className="ast-card-title">
          The plant
          <span className="ast-caption">Name, short code and time zone are needed; the rest only when known</span>
        </h2>
      </div>
      <div className="onb-form">
        <FieldGrid>
          <Field label="Plant name" required wide>
            {(fid) => <TextInput id={fid} value={p.name} onChange={set("name")} />}
          </Field>
          <Field label="Short code" required hint="Letters, digits, dashes — e.g. LUM-04">
            {(fid) => <TextInput id={fid} value={p.code} onChange={(v) => set("code")(v.toUpperCase())} />}
          </Field>
          <Field label="Time zone" required hint="Where the plant is: times are shown in it">
            {(fid) => (
              <Select
                id={fid}
                value={p.timeZone ?? ""}
                onChange={set("timeZone")}
                options={[
                  { value: "", label: "Choose…" },
                  ...zones.map((z) => ({
                    value: z,
                    label: z.replace(/_/g, " "),
                  })),
                ]}
              />
            )}
          </Field>
          <Field label="Region">{(fid) => <TextInput id={fid} value={p.region ?? ""} onChange={set("region")} />}</Field>
          <Field label="Location (town, site)">{(fid) => <TextInput id={fid} value={p.location ?? ""} onChange={set("location")} />}</Field>
          <Field label="Coordinates">
            {(fid) => <TextInput id={fid} value={p.coordinates ?? ""} onChange={set("coordinates")} placeholder="-15.41, 28.28" />}
          </Field>
          <Field label="Design capacity">
            {(fid) => <TextInput id={fid} value={p.designCapacity ?? ""} onChange={set("designCapacity")} placeholder="5 000 t/d clinker" />}
          </Field>
          <Field label="Description" wide>
            {(fid) => <TextArea id={fid} value={p.description ?? ""} onChange={set("description")} rows={2} />}
          </Field>
        </FieldGrid>
      </div>
    </section>
  );
}

/* ==================================================================== 3 areas */

function AreasStep({
  id,
  files,
  draft,
  edit,
  onUploaded,
  setError,
}: {
  id: string;
  files: OnboardingFile[];
  draft: OnboardingDraft;
  edit: Edit;
  onUploaded: () => void;
  setError: (e: string | null) => void;
}) {
  return (
    <section className="ast-card pg-table-card" aria-label="Areas">
      <div className="ast-card-head">
        <h2 className="ast-card-title">
          Factories, sections and lines
          <span className="ast-caption">Machines are placed in these; a photo or layout of a factory or line becomes its line drawing</span>
        </h2>
        <PillButton variant="secondary" type="button" onClick={() => edit((d) => void d.areas.push({ key: key("a"), name: "", parentKey: null, diagramType: null }))}>
          + Add area
        </PillButton>
      </div>
      {draft.areas.length === 0 ? (
        <div className="ast-empty">No areas. Machines will sit directly under the plant.</div>
      ) : (
        <div className="ui-table-container ast-table">
          <table className="ui-table onb-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Inside</th>
                <th className="onb-num">Machines</th>
                <th>Photo or layout</th>
                <th aria-label="Remove" />
              </tr>
            </thead>
            <tbody>
              {draft.areas.map((a, i) => (
                <tr key={a.key}>
                  <td>
                    <input
                      className="ui-input onb-in"
                      aria-label={a.name ? `Name of area ${a.name}` : "Name of new area"}
                      value={a.name}
                      onChange={(e) => edit((d) => void (d.areas[i].name = e.target.value))}
                    />
                  </td>
                  <td>
                    <Select
                      id={`area-parent-${a.key}`}
                      ariaLabel={`What ${a.name || "new area"} is inside`}
                      value={a.parentKey ?? ""}
                      onChange={(v) => edit((d) => void (d.areas[i].parentKey = v || null))}
                      options={[
                        { value: "", label: "The plant" },
                        ...draft.areas
                          .filter((x) => x.key !== a.key)
                          .map((x) => ({
                            value: x.key,
                            label: x.name || "(unnamed)",
                          })),
                      ]}
                    />
                  </td>
                  <td className="onb-num">{draft.machines.filter((m) => m.areaKey === a.key).length}</td>
                  <td>
                    <PhotoStrip
                      pkgId={id}
                      subjectKey={a.key}
                      subjectName={a.name || "this area"}
                      field="areaKey"
                      files={files}
                      drawing={a.diagramType ?? null}
                      onUploaded={onUploaded}
                      setError={setError}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="onb-x"
                      aria-label={`Remove ${a.name}`}
                      onClick={() =>
                        edit((d) => {
                          d.areas.splice(i, 1);
                          for (const x of d.areas) if (x.parentKey === a.key) x.parentKey = null;
                          for (const m of d.machines) if (m.areaKey === a.key) m.areaKey = null;
                        }, `area ${a.name || "(unnamed)"}`)
                      }
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ==================================================================== 4 people */

function PeopleStep({ draft, edit, roles }: { draft: OnboardingDraft; edit: Edit; roles: Reference["roles"] }) {
  return (
    <section className="ast-card pg-table-card" aria-label="People">
      <div className="ast-card-head">
        <h2 className="ast-card-title">
          People who will use the plant
          <span className="ast-caption">Someone who already has an account only gets access to this plant</span>
        </h2>
        <PillButton
          variant="secondary"
          type="button"
          onClick={() =>
            edit(
              (d) =>
                void d.users.push({
                  key: key("u"),
                  fullName: "",
                  email: "",
                  title: null,
                  department: null,
                  roleId: "",
                  access: "write",
                }),
            )
          }
        >
          + Add person
        </PillButton>
      </div>
      {draft.users.length === 0 ? (
        <div className="ast-empty">Nobody added. Plant administrators get access automatically.</div>
      ) : (
        <div className="ui-table-container ast-table">
          <table className="ui-table onb-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Job title</th>
                <th>Role</th>
                <th>Access</th>
                <th aria-label="Remove" />
              </tr>
            </thead>
            <tbody>
              {draft.users.map((u, i) => (
                <tr key={u.key}>
                  <td>
                    <input
                      className="ui-input onb-in"
                      aria-label={u.fullName ? `Name of ${u.fullName}` : "Name of new person"}
                      value={u.fullName}
                      onChange={(e) => edit((d) => void (d.users[i].fullName = e.target.value))}
                    />
                  </td>
                  <td>
                    <input
                      className="ui-input onb-in"
                      type="email"
                      inputMode="email"
                      autoCapitalize="none"
                      aria-label={`Email of ${u.fullName || "new person"}`}
                      value={u.email}
                      onChange={(e) => edit((d) => void (d.users[i].email = e.target.value))}
                      onBlur={(e) => {
                        const v = e.target.value.trim().toLowerCase();
                        if (v !== u.email) edit((d) => void (d.users[i].email = v));
                      }}
                    />
                  </td>
                  <td>
                    <input
                      className="ui-input onb-in"
                      aria-label={`Job title of ${u.fullName || "new person"}`}
                      value={u.title ?? ""}
                      onChange={(e) => edit((d) => void (d.users[i].title = txt(e.target.value)))}
                    />
                  </td>
                  <td>
                    <Select
                      id={`role-${u.key}`}
                      ariaLabel={`Role of ${u.fullName || "new person"}`}
                      value={u.roleId}
                      onChange={(v) => edit((d) => void (d.users[i].roleId = v))}
                      options={[{ value: "", label: "Choose…" }, ...roles.map((r) => ({ value: r.id, label: r.name }))]}
                    />
                  </td>
                  <td>
                    <Select
                      id={`access-${u.key}`}
                      ariaLabel={`Access of ${u.fullName || "new person"}`}
                      value={u.access}
                      onChange={(v) => edit((d) => void (d.users[i].access = v as typeof u.access))}
                      options={[
                        { value: "read", label: "Can view" },
                        { value: "write", label: "Can act" },
                        { value: "admin", label: "Can manage" },
                      ]}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="onb-x"
                      aria-label={`Remove ${u.fullName}`}
                      onClick={() => edit((d) => void d.users.splice(i, 1), u.fullName || u.email || "a person")}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ==================================================================== 5 machines */

function MachinesStep({
  id,
  files,
  draft,
  edit,
  drawingOptions,
  onUploaded,
  setError,
}: {
  id: string;
  files: OnboardingFile[];
  draft: OnboardingDraft;
  edit: Edit;
  drawingOptions: Array<{ value: string; label: string }>;
  onUploaded: () => void;
  setError: (e: string | null) => void;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const sensors = (m: DraftMachine) => draft.points.filter((p) => p.machineKey === m.key).length;
  return (
    <section className="ast-card pg-table-card" aria-label="Machines">
      <div className="ast-card-head">
        <h2 className="ast-card-title">
          Machines and their parts
          <span className="ast-caption">A photo or drawing of a machine becomes its 2D drawing and 3D model</span>
        </h2>
        <PillButton
          variant="secondary"
          type="button"
          onClick={() => {
            const k = key("m");
            edit(
              (d) =>
                void d.machines.push({
                  key: k,
                  code: "",
                  name: "",
                  areaKey: null,
                  type: null,
                  manufacturer: null,
                  model: null,
                  powerRating: null,
                  operatingSpeed: null,
                  criticality: "B (Essential)",
                  diagramType: null,
                  components: [],
                  source: null,
                }),
            );
            setOpenKey(k);
          }}
        >
          + Add machine
        </PillButton>
      </div>
      {draft.machines.length === 0 ? (
        <div className="ast-empty">No machines yet. They come from the documents, or add them here.</div>
      ) : (
        <div className="ui-table-container ast-table">
          <table className="ui-table onb-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Area</th>
                <th>Importance</th>
                <th>Drawing</th>
                <th className="onb-num">Parts</th>
                <th className="onb-num">Sensors</th>
                <th>Photo</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {draft.machines.map((m, i) => (
                <React.Fragment key={m.key}>
                  <tr>
                    <td>
                      <input
                        className="ui-input onb-in onb-in-code"
                        aria-label={`Code of ${m.name || "new machine"}`}
                        value={m.code}
                        onChange={(e) => edit((d) => void (d.machines[i].code = e.target.value.toUpperCase()))}
                      />
                    </td>
                    <td>
                      <input
                        className="ui-input onb-in"
                        aria-label={m.code ? `Name of machine ${m.code}` : "Name of new machine"}
                        value={m.name}
                        onChange={(e) => edit((d) => void (d.machines[i].name = e.target.value))}
                      />
                    </td>
                    <td>
                      <Select
                        id={`m-area-${m.key}`}
                        ariaLabel={`Area of ${m.name || "new machine"}`}
                        value={m.areaKey ?? ""}
                        onChange={(v) => edit((d) => void (d.machines[i].areaKey = v || null))}
                        options={[
                          { value: "", label: "The plant" },
                          ...draft.areas.map((a) => ({
                            value: a.key,
                            label: a.name || "(unnamed)",
                          })),
                        ]}
                      />
                    </td>
                    <td>
                      <Select
                        id={`m-crit-${m.key}`}
                        ariaLabel={`How critical ${m.name || "new machine"} is`}
                        value={m.criticality}
                        onChange={(v) => edit((d) => void (d.machines[i].criticality = v as DraftMachine["criticality"]))}
                        options={CRITICALITY.map((c) => ({
                          value: c,
                          label: c,
                        }))}
                      />
                    </td>
                    <td>
                      <Select
                        id={`m-dt-${m.key}`}
                        ariaLabel={`Drawing of ${m.name || "new machine"}`}
                        value={m.diagramType ?? ""}
                        onChange={(v) => edit((d) => void (d.machines[i].diagramType = v || null))}
                        options={drawingOptions}
                      />
                    </td>
                    <td className="onb-num">{m.components.length}</td>
                    <td className="onb-num">{sensors(m)}</td>
                    <td>
                      <PhotoStrip
                        pkgId={id}
                        subjectKey={m.key}
                        subjectName={m.name || "this machine"}
                        field="machineKey"
                        files={files}
                        drawing={null}
                        onUploaded={onUploaded}
                        setError={setError}
                      />
                    </td>
                    <td className="onb-actions">
                      <button type="button" className="onb-mini" aria-expanded={openKey === m.key} onClick={() => setOpenKey(openKey === m.key ? null : m.key)}>
                        {openKey === m.key ? "Close" : "Details"}
                      </button>
                    </td>
                  </tr>
                  {openKey === m.key && (
                    <tr className="onb-detail">
                      <td colSpan={9}>
                        <MachineDetail
                          m={m}
                          i={i}
                          edit={edit}
                          sensors={sensors(m)}
                          photos={
                            <PhotoStrip
                              pkgId={id}
                              subjectKey={m.key}
                              subjectName={m.name || "this machine"}
                              field="machineKey"
                              files={files}
                              drawing={m.diagramType}
                              onUploaded={onUploaded}
                              setError={setError}
                            />
                          }
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function MachineDetail({
  m,
  i,
  edit,
  sensors,
  photos,
}: {
  m: DraftMachine;
  i: number;
  edit: Edit;
  sensors: number;
  photos: React.ReactNode;
}) {
  const set = (k: "type" | "manufacturer" | "model" | "powerRating" | "operatingSpeed") => (v: string) => edit((d) => void (d.machines[i][k] = txt(v)));
  return (
    <div className="onb-machine">
      <div className="onb-parts">
        <span className="ast-caption">Photo, drawing or P&amp;ID of the machine — it becomes the machine&rsquo;s 2D drawing and 3D model</span>
        {photos}
      </div>
      <FieldGrid>
        <Field label="What kind of machine">{(fid) => <TextInput id={fid} value={m.type ?? ""} onChange={set("type")} placeholder="rotary kiln" />}</Field>
        <Field label="Maker">{(fid) => <TextInput id={fid} value={m.manufacturer ?? ""} onChange={set("manufacturer")} />}</Field>
        <Field label="Model">{(fid) => <TextInput id={fid} value={m.model ?? ""} onChange={set("model")} />}</Field>
        <Field label="Power">{(fid) => <TextInput id={fid} value={m.powerRating ?? ""} onChange={set("powerRating")} placeholder="630 kW" />}</Field>
        <Field label="Speed">{(fid) => <TextInput id={fid} value={m.operatingSpeed ?? ""} onChange={set("operatingSpeed")} placeholder="3.8 rpm" />}</Field>
      </FieldGrid>
      <div className="onb-parts">
        <span className="ast-caption">Parts (each sensor sits on one)</span>
        {m.components.map((c, ci) => (
          <span key={c.key} className="onb-part">
            <input
              className="ui-input onb-in"
              aria-label={`Name of part ${ci + 1} of ${m.name || "new machine"}`}
              value={c.name}
              onChange={(e) => edit((d) => void (d.machines[i].components[ci].name = e.target.value))}
            />
            <button
              type="button"
              className="onb-x"
              aria-label={`Remove ${c.name}`}
              onClick={() =>
                edit((d) => {
                  d.machines[i].components.splice(ci, 1);
                  for (const p of d.points) if (p.componentKey === c.key) p.componentKey = null;
                }, `part ${c.name || "(unnamed)"}`)
              }
            >
              ×
            </button>
          </span>
        ))}
        <button type="button" className="onb-mini" onClick={() => edit((d) => void d.machines[i].components.push({ key: key("c"), name: "" }))}>
          + Part
        </button>
      </div>
      <button
        type="button"
        className="onb-mini onb-danger"
        onClick={() =>
          edit((d) => {
            d.machines.splice(i, 1);
            for (const p of d.points)
              if (p.machineKey === m.key) {
                p.machineKey = null;
                p.componentKey = null;
              }
          }, `machine ${m.code || m.name || "(unnamed)"}`)
        }
      >
        Remove machine
        {sensors ? ` (its ${sensors} sensors stay, without a machine)` : ""}
      </button>
    </div>
  );
}

/* ==================================================================== 6 sensors */

function SensorsStep({ draft, edit, reference }: { draft: OnboardingDraft; edit: Edit; reference: Reference | null }) {
  const [machineKey, setMachineKey] = useState<string>("all");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [page, setPage] = useState(0);
  const quantityOptions = [
    { value: "", label: "Choose…" },
    ...(reference?.quantities ?? []).map((q) => ({
      value: q.id,
      label: q.name,
    })),
  ];
  const rows = draft.points
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => machineKey === "all" || (machineKey === "none" ? !p.machineKey : p.machineKey === machineKey))
    .filter(({ p }) => !onlyOpen || !p.quantity || !p.componentKey || !p.machineKey);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const shown = rows.slice(page * PAGE, page * PAGE + PAGE);
  const setP = (i: number, fn: (p: DraftPoint) => void) => edit((d) => fn(d.points[i]));
  // Cells whose typed text is not a number: the stored value is kept and the cell is marked.
  const [badCells, setBadCells] = useState<ReadonlySet<string>>(new Set());
  const numCell = (i: number, p: DraftPoint, k: "rangeLo" | "rangeHi" | "ll" | "l" | "h" | "hh", label: string) => {
    const cell = `${p.key}:${k}`;
    return (
      <input
        // Keyed on the stored value, so a reload or a fix elsewhere shows here.
        key={`${cell}:${p[k] ?? ""}`}
        className="ui-input onb-in onb-in-num"
        aria-label={`${p.tag} ${label}`}
        aria-invalid={badCells.has(cell) || undefined}
        title={badCells.has(cell) ? "Not a number: the value before it is kept" : undefined}
        inputMode="decimal"
        defaultValue={p[k] ?? ""}
        onBlur={(e) => {
          const v = num(e.target.value);
          const bad = v === undefined;
          if (bad !== badCells.has(cell))
            setBadCells((prev) => {
              const next = new Set(prev);
              if (bad) next.add(cell);
              else next.delete(cell);
              return next;
            });
          if (v !== undefined && v !== p[k]) setP(i, (x) => void (x[k] = v));
        }}
      />
    );
  };
  return (
    <section className="ast-card pg-table-card" aria-label="Sensors">
      <div className="ast-card-head">
        <h2 className="ast-card-title">
          Sensors, ranges and alarm limits
          <span className="ast-caption">LL / HH stop or trip the process; L / H warn the operator. Empty = not used.</span>
        </h2>
        <div className="onb-tools">
          <Select
            id="onb-sensor-machine"
            ariaLabel="Show sensors of"
            value={machineKey}
            onChange={(v) => {
              setMachineKey(v);
              setPage(0);
            }}
            options={[
              { value: "all", label: "All machines" },
              ...draft.machines.map((m) => ({
                value: m.key,
                label: m.code ? `${m.code} · ${m.name}` : m.name,
              })),
              { value: "none", label: "Not on a machine" },
            ]}
          />
          <label className="onb-check">
            <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} /> Only those missing something
          </label>
          <PillButton
            variant="secondary"
            type="button"
            onClick={() =>
              edit(
                (d) =>
                  void d.points.push({
                    key: key("p"),
                    tag: "",
                    name: "",
                    machineKey: machineKey !== "all" && machineKey !== "none" ? machineKey : null,
                    componentKey: null,
                    location: null,
                    quantity: null,
                    unit: null,
                    valueKind: "analog",
                    origin: "online",
                    signalType: null,
                    rangeLo: null,
                    rangeHi: null,
                    rangeText: null,
                    nominalLo: null,
                    nominalHi: null,
                    nominalText: null,
                    ll: null,
                    l: null,
                    h: null,
                    hh: null,
                    limitsText: null,
                    priority: null,
                    remarks: null,
                    source: null,
                  }),
              )
            }
          >
            + Add sensor
          </PillButton>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="ast-empty">
          {draft.points.length ? "No sensor matches." : "No sensors yet. They come from sensor lists and specifications, or add them here."}
        </div>
      ) : (
        <div className="onb-scroll">
          <div className="ui-table-container ast-table">
            <table className="ui-table onb-table onb-sensors">
              <thead>
                <tr>
                  <th>Tag</th>
                  <th>Name</th>
                  <th>Machine</th>
                  <th>Part</th>
                  <th>Measures</th>
                  <th>Unit</th>
                  <th className="onb-num">Range from</th>
                  <th className="onb-num">to</th>
                  <th className="onb-num">LL</th>
                  <th className="onb-num">L</th>
                  <th className="onb-num">H</th>
                  <th className="onb-num">HH</th>
                  <th>As printed</th>
                  <th aria-label="Remove" />
                </tr>
              </thead>
              <tbody>
                {shown.map(({ p, i }) => {
                  const m = draft.machines.find((x) => x.key === p.machineKey);
                  return (
                    <tr key={p.key}>
                      <td>
                        <input
                          className="ui-input onb-in onb-in-code"
                          aria-label={p.name ? `Tag of ${p.name}` : "Tag of new sensor"}
                          value={p.tag}
                          onChange={(e) => setP(i, (x) => void (x.tag = e.target.value.trim()))}
                        />
                      </td>
                      <td>
                        <input
                          className="ui-input onb-in onb-in-name"
                          aria-label={`${p.tag} name`}
                          value={p.name}
                          onChange={(e) => setP(i, (x) => void (x.name = e.target.value))}
                        />
                      </td>
                      <td>
                        <Select
                          id={`p-m-${p.key}`}
                          ariaLabel={`Machine of ${p.tag || "new sensor"}`}
                          value={p.machineKey ?? ""}
                          onChange={(v) => setP(i, (x) => ((x.machineKey = v || null), (x.componentKey = null)))}
                          options={[
                            { value: "", label: "Choose…" },
                            ...draft.machines.map((mm) => ({
                              value: mm.key,
                              label: mm.code || mm.name,
                            })),
                          ]}
                        />
                      </td>
                      <td>
                        <Select
                          id={`p-c-${p.key}`}
                          ariaLabel={`Part of ${p.tag || "new sensor"}`}
                          value={p.componentKey ?? ""}
                          onChange={(v) => setP(i, (x) => void (x.componentKey = v || null))}
                          options={[
                            {
                              value: "",
                              label: m ? "Choose…" : "Machine first",
                            },
                            ...(m?.components ?? []).map((c) => ({
                              value: c.key,
                              label: c.name || "(unnamed)",
                            })),
                          ]}
                        />
                      </td>
                      <td>
                        <Select
                          id={`p-q-${p.key}`}
                          ariaLabel={`What ${p.tag || "new sensor"} measures`}
                          value={p.quantity ?? ""}
                          onChange={(v) => setP(i, (x) => ((x.quantity = v || null), (x.valueKind = v === "state" ? "state" : "analog")))}
                          options={quantityOptions}
                        />
                      </td>
                      <td>
                        <input
                          className="ui-input onb-in onb-in-unit"
                          aria-label={`${p.tag} unit`}
                          list="onb-units"
                          value={p.unit ?? ""}
                          disabled={p.valueKind === "state"}
                          onChange={(e) =>
                            setP(i, (x) => {
                              x.unit = txt(e.target.value);
                              x.quantity ??= guessQuantity(x.tag, x.unit, x.valueKind);
                            })
                          }
                        />
                      </td>
                      <td>{numCell(i, p, "rangeLo", "range from")}</td>
                      <td>{numCell(i, p, "rangeHi", "range to")}</td>
                      <td>{numCell(i, p, "ll", "LL")}</td>
                      <td>{numCell(i, p, "l", "L")}</td>
                      <td>{numCell(i, p, "h", "H")}</td>
                      <td>{numCell(i, p, "hh", "HH")}</td>
                      <td
                        className="onb-printed"
                        title={[p.rangeText && `Range ${p.rangeText}`, p.nominalText && `Normal ${p.nominalText}`, p.limitsText, p.remarks]
                          .filter(Boolean)
                          .join(" · ")}
                      >
                        {[p.rangeText, p.limitsText].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td>
                        <button type="button" className="onb-x" aria-label={`Remove ${p.tag}`} onClick={() => edit((d) => void d.points.splice(i, 1), `sensor ${p.tag || "(no tag)"}`)}>
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <datalist id="onb-units">
            {(reference?.units ?? []).map((u) => (
              <option key={u.id} value={u.symbol}>
                {u.name}
              </option>
            ))}
          </datalist>
        </div>
      )}
      {pages > 1 && (
        <div className="onb-pager">
          <button type="button" className="onb-mini" disabled={page === 0} onClick={() => setPage(page - 1)}>
            ‹ Previous
          </button>
          <span className="ast-caption">
            {page * PAGE + 1}–{Math.min(rows.length, page * PAGE + PAGE)} of {rows.length}
          </span>
          <button type="button" className="onb-mini" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>
            Next ›
          </button>
        </div>
      )}
    </section>
  );
}

/* ==================================================================== 7 check */

function CheckStep({
  id,
  pkg,
  draft,
  saving,
  created,
  onGo,
  onBack,
  onCommitted,
}: {
  id: string;
  pkg: Pkg;
  draft: OnboardingDraft;
  saving: boolean;
  /** What this session's "Create the plant" wrote; null when the plant was created earlier. */
  created: Created | null;
  onGo: (s: Step) => void;
  onBack: () => void;
  onCommitted: (r: Created) => void;
}) {
  const { setSelectedPlantId, setActiveTab } = useIndustrialData();
  const doneTitleId = React.useId();
  const [result, setResult] = useState<{
    tone: "good" | "bad" | "info";
    text: string;
  } | null>(null);
  const [busy, setBusy] = useState<"check" | "create" | null>(null);
  const run = async (dryRun: boolean) => {
    setBusy(dryRun ? "check" : "create");
    setResult(null);
    try {
      const r = await call<Created>(`/api/onboarding/${id}/commit`, json("POST", { dryRun }));
      if (dryRun)
        setResult({
          tone: "good",
          text: `Everything fits: ${r.machines} machines, ${r.points} sensors and ${r.users} people can be created. Nothing was written.`,
        });
      else onCommitted(r);
    } catch (e) {
      setResult({ tone: "bad", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };
  // Created here: the completion shows at once, before the reloaded onboarding says so.
  const committed = pkg.status === "committed" || created !== null;
  const plantName = draft.plant.name || pkg.name;
  const plantId = created?.plantId ?? pkg.plantId;
  const withLimits = draft.points.filter((p) => [p.ll, p.l, p.h, p.hh].some((v) => v !== null)).length;
  const tiles: Array<[string, number | string]> = [
    ["Machines", draft.machines.length],
    ["Sensors", draft.points.length],
    ["Sensors with alarm limits", withLimits],
    ["People", draft.users.length],
  ];
  // Counts from the create response when it ran here; the draft holds the same rows otherwise.
  const createdTiles: Array<[string, number]> = [
    ["Areas", draft.areas.length],
    ["Machines", created?.machines ?? draft.machines.length],
    ["Sensors", created?.points ?? draft.points.length],
    ["People", created?.users ?? draft.users.length],
  ];
  return (
    <>
      {committed ? (
        <section className="ast-card onb-done" aria-labelledby={doneTitleId}>
          <h2 id={doneTitleId} className="onb-done-title">
            <span className="onb-done-mark" aria-hidden="true">
              ✓
            </span>
            {plantName} is created
          </h2>
          <p className="ast-caption">
            {pkg.committedAt ? `Created ${formatLocalTime(pkg.committedAt, { date: true, seconds: false })}. ` : ""}
            Its machines, parts, sensors, ranges and alarm limits are in ULTRON now; limits start as provisional.
          </p>
          <div className="onb-kpis">
            {createdTiles.map(([label, v]) => (
              <div key={label} className="onb-kpi">
                <span className="onb-kpi-label">{label}</span>
                <span className="onb-kpi-value">{v}</span>
              </div>
            ))}
          </div>
          <div className="onb-done-actions">
            <PillButton variant="secondary" type="button" onClick={onBack}>
              Back to all onboardings
            </PillButton>
            {plantId && (
              <PillButton
                variant="primary"
                type="button"
                onClick={() => {
                  setSelectedPlantId(plantId);
                  setActiveTab("home");
                }}
              >
                Open {plantName}
              </PillButton>
            )}
          </div>
        </section>
      ) : (
        <>
          <section className="ast-card" aria-label="Summary">
            <div className="onb-kpis">
              {tiles.map(([label, v]) => (
                <div key={label} className="onb-kpi">
                  <span className="onb-kpi-label">{label}</span>
                  <span className="onb-kpi-value">{v}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="ast-card" aria-label="Before the plant can be created">
            <div className="ast-card-head">
              <h2 className="ast-card-title">
                {pkg.problems.length ? `${pkg.problems.length} things to settle first` : "Ready to create the plant"}
                <span className="ast-caption">
                  Creating writes the plant, its areas, people, machines, parts, sensors, ranges and limits. Limits start as provisional.
                </span>
              </h2>
              <div className="onb-tools">
                <PillButton variant="secondary" type="button" disabled={!!busy || saving || pkg.problems.length > 0} onClick={() => void run(true)}>
                  Check against the database
                </PillButton>
              </div>
            </div>
            {busy && (
              <FormNote tone="info">
                {busy === "check"
                  ? `Checking ${draft.points.length} sensors on ${draft.machines.length} machines against the database…`
                  : `Creating ${plantName}: ${draft.machines.length} machines and ${draft.points.length} sensors…`}
              </FormNote>
            )}
            {result && <FormNote tone={result.tone}>{result.text}</FormNote>}
            {pkg.problems.length > 0 && (
              <ul className="onb-list">
                {pkg.problems.map((p) => {
                  const s = problemStep(p);
                  return (
                    <li key={p}>
                      {s === "check" ? (
                        p
                      ) : (
                        <button type="button" className="onb-problem" onClick={() => onGo(s)}>
                          {p}
                          <span className="onb-problem-step">
                            Step {STEP_ORDER.indexOf(s) + 1} · {STEP_NAME[s]} <span aria-hidden="true">›</span>
                          </span>
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
      {draft.gaps.length > 0 && (
        <section className="ast-card" aria-label="What the documents leave open">
          <div className="ast-card-head">
            <h2 className="ast-card-title">
              What the documents leave open
              <span className="ast-caption">Found while reading the uploads; worth asking the plant about</span>
            </h2>
          </div>
          {/* Gaps are stored as "<document>: <gap>"; one heading per document. */}
          {[...new Set(draft.gaps.map((g) => g.split(": ")[0]))].map((doc) => (
            <div key={doc} className="onb-gaps">
              <h3 className="onb-gaps-doc">{doc}</h3>
              <ul className="onb-list onb-list-muted">
                {draft.gaps
                  .filter((g) => g.split(": ")[0] === doc)
                  .map((g) => (
                    <li key={g}>{g.slice(doc.length + 2) || g}</li>
                  ))}
              </ul>
            </div>
          ))}
        </section>
      )}
      <StepFooter
        at={STEP_ORDER.indexOf("check")}
        onGo={onGo}
        primary={
          committed ? undefined : (
            <ConfirmAction
              label="Create the plant"
              question={`Create ${plantName} with ${draft.machines.length} machines, ${draft.points.length} sensors and ${draft.users.length} people?`}
              confirmLabel="Yes, create"
              keepLabel="Keep editing"
              tone="primary"
              busy={busy === "create"}
              disabled={!!busy || saving || pkg.problems.length > 0}
              onConfirm={() => void run(false)}
            />
          )
        }
      />
    </>
  );
}
