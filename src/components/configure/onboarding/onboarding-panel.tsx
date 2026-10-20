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
import { Field, FieldGrid, FormNote, PillButton, PillNav, Select, StatusTag, TextArea, TextInput, type PillNavItem } from "@/components/ui";
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
} from "@/types/onboarding";
import { invalidateApi } from "@/lib/api-cache";
import "./onboarding.css";

type Step = "files" | "plant" | "areas" | "people" | "machines" | "sensors" | "check";
type Pkg = OnboardingPackage & { problems: string[] };
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
const num = (v: string) => (v.trim() === "" || Number.isNaN(Number(v)) ? null : Number(v));
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
          {rows && rows.length > 0 && <span className="ast-caption ast-num">{rows.length}</span>}
        </h2>
        <form
          className="onb-start"
          onSubmit={(e) => {
            e.preventDefault();
            if (newName.trim()) void start();
          }}
        >
          <TextInput id="onb-new-name" value={newName} onChange={setNewName} placeholder="Plant name, e.g. Lusaka cement plant" />
          <PillButton variant="primary" type="submit" disabled={!newName.trim() || busy}>
            + Start onboarding
          </PillButton>
        </form>
      </div>
      {error && <FormNote tone="bad">{error}</FormNote>}
      {rows === null ? (
        <div className="ast-empty">Loading…</div>
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
                <tr key={r.id} className="onb-row-link" tabIndex={0} onClick={() => setOpenId(r.id)} onKeyDown={(e) => e.key === "Enter" && setOpenId(r.id)}>
                  <td>
                    <span className="ast-cell-title">{r.name}</span>
                  </td>
                  <td>
                    <StatusTag tone={STATUS[r.status].tone} label={STATUS[r.status].label} />
                  </td>
                  <td className="onb-num">{r.files}</td>
                  <td className="onb-num">{r.machines}</td>
                  <td className="onb-num">{r.points}</td>
                  <td className="ast-cell-text">{new Date(r.updatedAt).toLocaleString()}</td>
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
  const [saveState, setSaveState] = useState<"saved" | "saving" | "unsaved">("saved");
  const dirty = useRef(false);
  const committed = pkg?.status === "committed";

  const load = useCallback(
    async (replaceDraft: boolean) => {
      try {
        const p = await call<Pkg>(`/api/onboarding/${id}`);
        setPkg(p);
        if (replaceDraft || !dirty.current) setDraft(p.draft);
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

  // Claude Code (Haiku) on this computer reads the uploads: its latest run, refreshed every 5 s while it works.
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
        setSaveState("unsaved");
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [draft, id, committed]);

  const edit = useCallback((fn: (d: OnboardingDraft) => void) => {
    setDraft((d) => {
      if (!d) return d;
      const next: OnboardingDraft = JSON.parse(JSON.stringify(d));
      fn(next);
      dirty.current = true;
      return next;
    });
  }, []);

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
        <div className="ast-empty">{error ?? "Loading the onboarding…"}</div>
      </section>
    );

  const steps: PillNavItem<Step>[] = [
    { id: "files", label: `1 Documents & photos (${pkg.files.length})` },
    { id: "plant", label: "2 Plant" },
    { id: "areas", label: `3 Areas (${draft.areas.length})` },
    { id: "people", label: `4 People (${draft.users.length})` },
    { id: "machines", label: `5 Machines (${draft.machines.length})` },
    { id: "sensors", label: `6 Sensors (${draft.points.length})` },
    {
      id: "check",
      label: `7 Check & create${pkg.problems.length ? ` (${pkg.problems.length} to fix)` : ""}`,
    },
  ];

  return (
    <div className="onb-editor">
      <section className="ast-card onb-headcard" aria-label="Onboarding">
        <div className="ast-card-head">
          <h2 className="ast-card-title">
            <button type="button" className="onb-back" onClick={onBack} aria-label="Back to all onboardings">
              ‹ All onboardings
            </button>
            {draft.plant.name || pkg.name}
            <span className="ast-caption">
              <StatusTag tone={STATUS[pkg.status].tone} label={STATUS[pkg.status].label} />{" "}
              {committed ? "Read-only" : saveState === "saved" ? "All changes saved" : saveState === "saving" ? "Saving…" : "Not saved yet"}
            </span>
          </h2>
        </div>
        <PillNav items={steps} activeId={step} onChange={setStep} ariaLabel="Onboarding steps" wrap />
        {error && <FormNote tone="bad">{error}</FormNote>}
      </section>

      <fieldset className="onb-fieldset" disabled={committed}>
        {step === "files" && (
          <FilesStep
            pkg={pkg}
            draft={draft}
            onChanged={() => load(false)}
            onUploaded={() => void afterUpload()}
            setError={setError}
            reader={<ReaderCard pkgId={pkg.id} proc={proc} waiting={pkg.files.filter((f) => f.status === "waiting").length} onStart={startReading} onStop={stopReading} />}
          />
        )}
        {step === "plant" && <PlantStep draft={draft} edit={edit} />}
        {step === "areas" && <AreasStep id={id} files={pkg.files} draft={draft} edit={edit} onUploaded={() => void afterUpload()} setError={setError} />}
        {step === "people" && <PeopleStep draft={draft} edit={edit} roles={ref?.roles ?? []} />}
        {step === "machines" && (
          <MachinesStep id={id} files={pkg.files} draft={draft} edit={edit} drawingOptions={drawingOptions} onUploaded={() => void afterUpload()} setError={setError} />
        )}
        {step === "sensors" && <SensorsStep draft={draft} edit={edit} reference={ref} />}
      </fieldset>
      {step === "check" && (
        <CheckStep
          id={id}
          pkg={pkg}
          draft={draft}
          saving={saveState !== "saved"}
          onCommitted={() => {
            void load(true);
            onCommitted();
          }}
        />
      )}
    </div>
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
    for (const f of Array.from(files)) {
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
                    <button type="button" className="onb-x" onClick={() => void remove(f)} aria-label={`Remove ${f.fileName}`}>
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
}: {
  pkgId: string;
  proc: ProcState | null;
  waiting: number;
  onStart: () => void;
  onStop: () => void;
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

function PlantStep({ draft, edit }: { draft: OnboardingDraft; edit: (fn: (d: OnboardingDraft) => void) => void }) {
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
  edit: (fn: (d: OnboardingDraft) => void) => void;
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
                      aria-label="Area name"
                      value={a.name}
                      onChange={(e) => edit((d) => void (d.areas[i].name = e.target.value))}
                    />
                  </td>
                  <td>
                    <Select
                      id={`area-parent-${a.key}`}
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
                        })
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

function PeopleStep({ draft, edit, roles }: { draft: OnboardingDraft; edit: (fn: (d: OnboardingDraft) => void) => void; roles: Reference["roles"] }) {
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
                      aria-label="Name"
                      value={u.fullName}
                      onChange={(e) => edit((d) => void (d.users[i].fullName = e.target.value))}
                    />
                  </td>
                  <td>
                    <input
                      className="ui-input onb-in"
                      type="email"
                      aria-label="Email"
                      value={u.email}
                      onChange={(e) => edit((d) => void (d.users[i].email = e.target.value))}
                    />
                  </td>
                  <td>
                    <input
                      className="ui-input onb-in"
                      aria-label="Job title"
                      value={u.title ?? ""}
                      onChange={(e) => edit((d) => void (d.users[i].title = txt(e.target.value)))}
                    />
                  </td>
                  <td>
                    <Select
                      id={`role-${u.key}`}
                      value={u.roleId}
                      onChange={(v) => edit((d) => void (d.users[i].roleId = v))}
                      options={[{ value: "", label: "Choose…" }, ...roles.map((r) => ({ value: r.id, label: r.name }))]}
                    />
                  </td>
                  <td>
                    <Select
                      id={`access-${u.key}`}
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
                    <button type="button" className="onb-x" aria-label={`Remove ${u.fullName}`} onClick={() => edit((d) => void d.users.splice(i, 1))}>
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
  edit: (fn: (d: OnboardingDraft) => void) => void;
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
                        aria-label="Machine code"
                        value={m.code}
                        onChange={(e) => edit((d) => void (d.machines[i].code = e.target.value.toUpperCase()))}
                      />
                    </td>
                    <td>
                      <input
                        className="ui-input onb-in"
                        aria-label="Machine name"
                        value={m.name}
                        onChange={(e) => edit((d) => void (d.machines[i].name = e.target.value))}
                      />
                    </td>
                    <td>
                      <Select
                        id={`m-area-${m.key}`}
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
  edit: (fn: (d: OnboardingDraft) => void) => void;
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
              aria-label="Part name"
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
                })
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
          })
        }
      >
        Remove machine
        {sensors ? ` (its ${sensors} sensors stay, without a machine)` : ""}
      </button>
    </div>
  );
}

/* ==================================================================== 6 sensors */

function SensorsStep({ draft, edit, reference }: { draft: OnboardingDraft; edit: (fn: (d: OnboardingDraft) => void) => void; reference: Reference | null }) {
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
  const numCell = (i: number, p: DraftPoint, k: "rangeLo" | "rangeHi" | "ll" | "l" | "h" | "hh", label: string) => (
    <input
      className="ui-input onb-in onb-in-num"
      aria-label={`${p.tag} ${label}`}
      inputMode="decimal"
      defaultValue={p[k] ?? ""}
      onBlur={(e) => {
        const v = num(e.target.value);
        if (v !== p[k]) setP(i, (x) => void (x[k] = v));
      }}
    />
  );
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
                          aria-label="Tag"
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
                        <button type="button" className="onb-x" aria-label={`Remove ${p.tag}`} onClick={() => edit((d) => void d.points.splice(i, 1))}>
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

function CheckStep({ id, pkg, draft, saving, onCommitted }: { id: string; pkg: Pkg; draft: OnboardingDraft; saving: boolean; onCommitted: () => void }) {
  const [result, setResult] = useState<{
    tone: "good" | "bad" | "info";
    text: string;
  } | null>(null);
  const [busy, setBusy] = useState<"check" | "create" | null>(null);
  const [confirm, setConfirm] = useState(false);
  const run = async (dryRun: boolean) => {
    setBusy(dryRun ? "check" : "create");
    setResult(null);
    try {
      const r = await call<{
        plantId: string;
        machines: number;
        points: number;
        users: number;
      }>(`/api/onboarding/${id}/commit`, json("POST", { dryRun }));
      if (dryRun)
        setResult({
          tone: "good",
          text: `Everything fits: ${r.machines} machines, ${r.points} sensors and ${r.users} people can be created. Nothing was written.`,
        });
      else {
        setResult({
          tone: "good",
          text: `Plant created with ${r.machines} machines, ${r.points} sensors and ${r.users} people. Open it from the plant switcher.`,
        });
        onCommitted();
      }
    } catch (e) {
      setResult({ tone: "bad", text: (e as Error).message });
    } finally {
      setBusy(null);
      setConfirm(false);
    }
  };
  const withLimits = draft.points.filter((p) => [p.ll, p.l, p.h, p.hh].some((v) => v !== null)).length;
  const tiles: Array<[string, number | string]> = [
    ["Machines", draft.machines.length],
    ["Sensors", draft.points.length],
    ["Sensors with alarm limits", withLimits],
    ["People", draft.users.length],
  ];
  return (
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
          {pkg.status !== "committed" && (
            <div className="onb-tools">
              <PillButton variant="secondary" type="button" disabled={!!busy || saving || pkg.problems.length > 0} onClick={() => void run(true)}>
                Check against the database
              </PillButton>
              {confirm ? (
                <PillButton variant="primary" type="button" disabled={!!busy} onClick={() => void run(false)}>
                  Yes, create {draft.plant.name || "the plant"}
                </PillButton>
              ) : (
                <PillButton variant="primary" type="button" disabled={!!busy || saving || pkg.problems.length > 0} onClick={() => setConfirm(true)}>
                  Create plant
                </PillButton>
              )}
            </div>
          )}
        </div>
        {busy && (
          <FormNote tone="info">
            {busy === "check"
              ? `Checking ${draft.points.length} sensors on ${draft.machines.length} machines against the database…`
              : `Creating ${draft.plant.name || "the plant"}: ${draft.machines.length} machines and ${draft.points.length} sensors…`}
          </FormNote>
        )}
        {result && <FormNote tone={result.tone}>{result.text}</FormNote>}
        {pkg.problems.length > 0 && (
          <ul className="onb-list">
            {pkg.problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
      </section>
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
    </>
  );
}
