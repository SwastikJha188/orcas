"use client";

/**
 * Photos, drawings or layouts of a plant or a machine, in Configure's Add /
 * Edit dialogs. A picked photo uploads straight away and Claude Code (Haiku)
 * draws it (asset_images → photo-drawings skill → diagrams); when the drawing
 * is ready its 2D sheet and 3D model are previewed here, with "Draw again" and
 * a note on what to change — all before the plant or machine is added.
 *
 * In an Add form the photos belong to the form (`draft`) until it is saved
 * (the dialog then attaches them) or cancelled (it discards them). In an Edit
 * form they belong to the plant / machine already.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { FormNote } from "@/components/ui";
import { resetDbDiagrams } from "@/components/assets/diagrams/db-diagrams";
import { DrawingPreview } from "./drawing-preview";

interface StoredImage {
  id: number;
  machineId: string | null;
  fileName: string;
  status: "waiting" | "processed" | "failed";
  diagramType: string | null;
  note: string | null;
  processedAt: string | null;
}
interface Run {
  status: "running" | "done" | "failed" | "stopped";
  model: string;
  lastStep: string | null;
  error: string | null;
  startedAt: string;
}
interface Listing {
  images: StoredImage[];
  processor: { available: boolean; reason: string | null; model: string };
  run: Run | null;
}

/** An unsaved Add plant / Add machine form: what its photos show, as typed so far. */
export interface DraftTarget {
  draftKey: string;
  subject: "machine" | "plant";
  name: string;
  type?: string;
  code?: string;
  plantId?: string | null;
}

/** What the form needs to know: the drawing kind planned for its photos, and whether it is drawn yet. */
export interface DrawingState {
  photos: number;
  kind: string | null;
  drawing: boolean;
  ready: boolean;
}

const STATE: Record<StoredImage["status"], string> = { waiting: "Being drawn", processed: "Drawn", failed: "Could not be drawn" };
const modelName = (m: string) => {
  const family = /haiku/i.test(m) ? "Haiku" : /sonnet/i.test(m) ? "Sonnet" : /opus/i.test(m) ? "Opus" : /fable/i.test(m) ? "Fable" : null;
  const version = /(\d+)[-.](\d+)/.exec(m);
  return family ? `${family}${version ? ` ${version[1]}.${version[2]}` : ""}` : m;
};
const minutes = (from: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(from).getTime()) / 60000));
  return m < 1 ? "under a minute" : `${m} min`;
};

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error?.message ?? `${res.status} ${res.statusText}`);
  return body.data as T;
}

/** The form was saved: its photos (and drawings made from them) now belong to the new plant / machine. */
export const attachDraftPhotos = (draftKey: string, plantId: string, machineId: string | null) =>
  call("/api/asset-images/attach", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ draftKey, plantId, machineId }) });

/** The form was cancelled: its photos go. */
export const discardDraftPhotos = (draftKey: string) => fetch(`/api/asset-images?draftKey=${encodeURIComponent(draftKey)}`, { method: "DELETE" }).catch(() => undefined);

export function PhotoPicker({
  label,
  hint,
  draft,
  plantId,
  machineId = null,
  previewLabel,
  onState,
}: {
  label: string;
  hint: string;
  /** An Add form: photos belong to it until it is saved. */
  draft?: DraftTarget | null;
  /** An existing plant (and machine): photos belong to it. */
  plantId?: string | null;
  machineId?: string | null;
  /** Name for the preview ("Cooling fan"). */
  previewLabel: string;
  onState?: (s: DrawingState) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [change, setChange] = useState("");
  const query = draft ? `draftKey=${encodeURIComponent(draft.draftKey)}` : plantId ? `plantId=${encodeURIComponent(plantId)}` : null;

  const load = useCallback(async () => {
    if (!query) return;
    try {
      setListing(await call<Listing>(`/api/asset-images?${query}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [query]);
  useEffect(() => void load(), [load]);

  const mine = (listing?.images ?? []).filter((i) => (draft ? true : machineId ? i.machineId === machineId : !i.machineId));
  const waiting = mine.filter((i) => i.status === "waiting").length;
  const running = listing?.run?.status === "running";
  // While a photo is being drawn, look again every 5 s.
  useEffect(() => {
    if (!running && !waiting) return;
    const t = setInterval(() => void load(), 5000);
    return () => clearInterval(t);
  }, [running, waiting, load]);

  const drawn = [...mine].reverse().find((i) => i.status === "processed" && i.diagramType);
  // The last photo that could not be drawn (its note says why), unless a later one was drawn.
  const failedImg = [...mine].reverse().find((i) => i.status === "failed" && (!drawn || i.id > drawn.id));
  const kind = drawn?.diagramType ?? mine.find((i) => i.diagramType)?.diagramType ?? null;
  // A drawing made again replaces the cached one.
  const drawnAt = drawn?.processedAt ?? null;
  useEffect(() => {
    if (drawnAt) resetDbDiagrams();
  }, [drawnAt]);
  useEffect(() => {
    onState?.({ photos: mine.length, kind, drawing: waiting > 0, ready: Boolean(drawn) && waiting === 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- report when the photos' state changes
  }, [mine.length, kind, waiting, drawn?.id, drawnAt]);

  const pick = async (list: FileList) => {
    if (!query) return;
    setBusy(true);
    setError(null);
    for (const f of Array.from(list)) {
      const form = new FormData();
      form.append("file", f);
      if (draft) {
        form.append("draftKey", draft.draftKey);
        form.append("subject", draft.subject);
        form.append("name", draft.name);
        if (draft.type) form.append("type", draft.type);
        if (draft.code) form.append("code", draft.code);
        if (draft.plantId) form.append("plantId", draft.plantId);
      } else {
        form.append("plantId", plantId!);
        if (machineId) form.append("machineId", machineId);
      }
      try {
        await call("/api/asset-images", { method: "POST", body: form });
      } catch (e) {
        setError(`${f.name}: ${(e as Error).message}`);
      }
    }
    setBusy(false);
    void load();
  };
  const redraw = async (imageId = drawn?.id) => {
    if (!imageId) return;
    try {
      await call(`/api/asset-images/${imageId}/redraw`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ note: imageId === drawn?.id ? change : "" }) });
      setChange("");
      void load();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const retry = async () => {
    try {
      await call(`/api/asset-images/process?${query}`, { method: "POST" });
      void load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const run = listing?.run;
  const who = `Claude Code (${modelName(run?.model ?? listing?.processor.model ?? "claude-opus-5-5")})`;
  const status =
    waiting && running
      ? `${who} is drawing it: ${run?.lastStep ?? "working"} · ${minutes(run!.startedAt)} so far. The preview appears here when it is ready (usually 5–7 minutes).`
      : waiting && listing && !listing.processor.available
        ? `Waiting to be drawn. ${listing.processor.reason ?? ""}`
        : waiting
          ? "Waiting to be drawn…"
          : drawn
            ? "Drawn from the photo. Check the drawing below before you add it."
            : hint;

  return (
    <div className="cfg-photos">
      <div className="cfg-photos-row">
        {mine.map((img) => (
          <a
            key={img.id}
            className="cfg-thumb"
            data-state={img.status}
            href={`/api/asset-images/${img.id}`}
            target="_blank"
            rel="noreferrer"
            title={`${img.fileName} · ${STATE[img.status]}${img.note ? ` · ${img.note}` : ""}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- an uploaded photo served by the API */}
            <img src={`/api/asset-images/${img.id}`} alt={img.fileName} loading="lazy" />
            <i aria-hidden="true" />
          </a>
        ))}
        <button type="button" className="cfg-photo-add" disabled={busy || !query} onClick={() => input.current?.click()}>
          {busy ? "Uploading…" : `+ ${label}`}
        </button>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) void pick(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      <span className="cfg-photos-hint" role="status">
        {waiting > 0 && running && <i className="cfg-dot" aria-hidden="true" />}
        {status}
      </span>
      {run?.status === "failed" && waiting > 0 && (
        <FormNote tone="bad">
          {run.error ?? "Drawing stopped with a problem."}{" "}
          <button type="button" className="cfg-photo-add" onClick={() => void retry()}>
            Try again
          </button>
        </FormNote>
      )}
      {failedImg && !waiting && (
        <FormNote tone="bad">
          {failedImg.fileName}: {failedImg.note ?? "could not be drawn."}{" "}
          <button type="button" className="cfg-photo-add" onClick={() => void redraw(failedImg.id)}>
            Try again
          </button>
        </FormNote>
      )}
      {drawn && kind && waiting === 0 && (
        <>
          <DrawingPreview key={`${kind}-${drawnAt}`} kind={kind} label={previewLabel} />
          <div className="cfg-redraw">
            <input className="ui-input" value={change} onChange={(e) => setChange(e.target.value)} placeholder="Not right? Say what to change (optional), e.g. the motor sits left of the fan" aria-label="What to change" />
            <button type="button" className="cfg-photo-add" onClick={() => void redraw(drawn.id)}>
              Draw again
            </button>
          </div>
        </>
      )}
      {error && <FormNote tone="bad">{error}</FormNote>}
    </div>
  );
}
