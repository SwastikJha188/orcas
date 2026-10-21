"use client";

import React, { useMemo, useRef, useState } from "react";
import { ConfirmAction, Field, FieldGrid, FieldSection, FormNote, PillButton, Select } from "@/components/ui";
import { StatusTag } from "@/components/assets/assets-shell-ui";
import { useEdge } from "@/providers/edge-context";
import { checkFormat, checkTemplate, parsePath, templateFilter } from "@shared/lib/edge-format";
import { FORMAT_FIELD_KEYS, type EdgeFormat, type FormatFields, type TimestampFormat } from "@shared/types/edge";
import { FormatPreview } from "./format-preview";
import type { JsonPath } from "./json-view";
import {
  FIELD_META,
  PRESETS,
  TIMESTAMP_OPTIONS,
  draftFormat,
  draftPayload,
  pickedField,
  pickedRecords,
  type FormatDraft,
} from "./format-model";

/* ==========================================================================
   Format editor: the mapping on the left, the live parse on the right.
   ========================================================================== */

type Target = "records" | keyof FormatFields;

const TOKENS = ["{gateway}", "{rack}", "{card}", "{channel}", "+", "#"] as const;

export interface FormatEditorProps {
  /** Stored format being edited; null for a new one. */
  format: EdgeFormat | null;
  /** Starting values (a new, duplicated, or stored format). */
  initial: FormatDraft;
  /** Gateway codes using this format. */
  gateways: string[];
  onClose: () => void;
  onDuplicate: (draft: FormatDraft) => void;
}

export function FormatEditor({ format, initial, gateways, onClose, onDuplicate }: FormatEditorProps) {
  const { create, update, remove } = useEdge();
  const readOnly = Boolean(format?.builtIn);
  const [draft, setDraft] = useState<FormatDraft>(initial);
  const [target, setTarget] = useState<Target>("value");
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  // Cancel with unsaved edits asks first.
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [preset, setPreset] = useState<string | null>(null);
  const topicRef = useRef<HTMLInputElement | null>(null);

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const set = <K extends keyof FormatDraft>(key: K, value: FormatDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setField = (key: keyof FormatFields, value: string) => setDraft((d) => ({ ...d, fields: { ...d.fields, [key]: value } }));

  // The built-in contract previews with its own parser; a draft with the JSON one.
  const previewFormat = useMemo(() => (readOnly && format ? format : draftFormat(draft)), [readOnly, format, draft]);
  const template = checkTemplate(draft.topic);
  const problems = readOnly ? [] : checkFormat({ kind: "json", topic: draft.topic, records: draft.records, fields: draft.fields });
  const recordSteps = useMemo(() => parsePath(draft.records), [draft.records]);

  const insertToken = (token: string) => {
    const el = topicRef.current;
    const value = draft.topic;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const lead = before && !before.endsWith("/") ? "/" : "";
    const trail = after && !after.startsWith("/") ? "/" : "";
    const next = `${before}${lead}${token}${trail}${after}`;
    set("topic", next);
    const caret = before.length + lead.length + token.length;
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(caret, caret);
    });
  };

  const applyPreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setPreset(id);
    setDraft((d) => ({ ...d, ...p.draft, name: d.name || p.label, description: d.description }));
  };

  const onPick = (path: JsonPath, root: unknown) => {
    if (target === "records") {
      const r = pickedRecords(path);
      if (r !== null) set("records", r);
      return;
    }
    let f = pickedField(path, draft.records, recordSteps, root);
    if (f === "$key" && target === "value") f = "$value";
    if (f !== null) setField(target, f);
  };

  const save = async () => {
    setTried(true);
    if (!draft.name.trim()) setNameError("Enter a name.");
    if (!draft.name.trim() || problems.length > 0 || busy) return;
    setBusy("save");
    setServerError(null);
    try {
      if (format) await update("formats", format.id, draftPayload(draft));
      else await create("formats", draftPayload(draft));
      onClose();
    } catch (err) {
      setServerError((err as Error).message);
      setBusy(null);
    }
  };

  const destroy = async () => {
    if (!format || busy) return;
    setBusy("delete");
    setServerError(null);
    try {
      await remove("formats", format.id);
      onClose();
    } catch (err) {
      setServerError((err as Error).message);
      setBusy(null);
    }
  };

  const pathInput = (key: Target, label: string, value: string, onChange: (v: string) => void, placeholder?: string) => (
    <input
      className="ui-input fmt-path"
      data-mono
      data-target={target === key && !readOnly ? true : undefined}
      aria-label={label}
      value={value}
      placeholder={placeholder}
      spellCheck={false}
      autoComplete="off"
      disabled={readOnly}
      onFocus={() => setTarget(key)}
      onChange={(e) => onChange(e.target.value)}
    />
  );

  return (
    <form
      className="fmt-editor"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!readOnly) void save();
      }}
    >
      <div className="fmt-editor-bar">
        <div className="fmt-editor-title">
          <h2 className="ast-card-title">{readOnly ? format?.name : format ? "Edit format" : "New format"}</h2>
          {readOnly && <StatusTag tone="info" label="Built in · cannot be changed" />}
          {!readOnly && dirty && <StatusTag tone="warn" label="Unsaved" />}
        </div>
        <div className="pg-actions">
          {confirmDiscard ? (
            <>
              <span className="fmt-confirm" role="alert">
                Discard changes?
              </span>
              <PillButton variant="secondary" autoFocus onClick={() => setConfirmDiscard(false)}>
                Keep editing
              </PillButton>
              <PillButton variant="danger" onClick={onClose}>
                Discard
              </PillButton>
            </>
          ) : (
            <>
              {format && (
                <PillButton variant="secondary" onClick={() => onDuplicate(draft)} disabled={busy !== null}>
                  Duplicate
                </PillButton>
              )}
              {format && !readOnly && (
                <ConfirmAction
                  label="Delete"
                  question={`Delete format? ${
                    gateways.length > 0 ? `${gateways.length} gateway${gateways.length === 1 ? " goes" : "s go"} back to the built-in ULTRON format.` : "No gateway uses it."
                  }`}
                  onConfirm={() => void destroy()}
                  busy={busy === "delete"}
                  disabled={busy !== null}
                />
              )}
              <PillButton variant="secondary" onClick={() => (dirty && !readOnly ? setConfirmDiscard(true) : onClose())} disabled={busy !== null}>
                {readOnly ? "Close" : "Cancel"}
              </PillButton>
              {!readOnly && (
                <PillButton variant="primary" type="submit" disabled={busy !== null}>
                  {busy === "save" ? "Saving…" : format ? "Save" : "Create format"}
                </PillButton>
              )}
            </>
          )}
        </div>
      </div>

      {serverError && <FormNote tone="bad">{serverError}</FormNote>}

      <div className="fmt-workspace">
        <div className="fmt-form ast-card">
          {!format && (
            <div className="fmt-presets">
              <span className="fmt-label">Start from</span>
              <div className="fmt-preset-list">
                {PRESETS.map((p) => (
                  <button key={p.id} type="button" className="fmt-preset" aria-pressed={preset === p.id} onClick={() => applyPreset(p.id)} title={p.hint}>
                    <span className="fmt-preset-name">{p.label}</span>
                    <span className="fmt-preset-hint">{p.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <FieldSection title="Format">
            <FieldGrid>
              <Field label="Name" required error={nameError} wide>
                {(id, d) => (
                  <input
                    id={id}
                    aria-describedby={d}
                    className="ui-input"
                    value={draft.name}
                    disabled={readOnly}
                    onChange={(e) => {
                      set("name", e.target.value);
                      setNameError(null);
                    }}
                    placeholder="Kepware line 2"
                  />
                )}
              </Field>
              <Field label="Description" wide>
                {(id, d) => (
                  <input id={id} aria-describedby={d} className="ui-input" value={draft.description} disabled={readOnly} onChange={(e) => set("description", e.target.value)} />
                )}
              </Field>
            </FieldGrid>
          </FieldSection>

          <FieldSection title="Message channel (topic)">
            <Field
              label={readOnly ? "Channel pattern (after the message server's channel prefix)" : "Channel pattern (topic)"}
              required
              wide
              error={!readOnly && (tried || draft.topic) && !template.ok ? template.message : null}
              hint={
                template.ok
                  ? `Listens on ${templateFilter(draft.topic, null)} ({gateway} becomes each linked gateway)`
                  : "Full topic. One placeholder or + per level; # only last."
              }
            >
              {(id, d) => (
                <input
                  id={id}
                  ref={topicRef}
                  aria-describedby={d}
                  className="ui-input"
                  data-mono
                  value={draft.topic}
                  spellCheck={false}
                  disabled={readOnly}
                  onChange={(e) => set("topic", e.target.value)}
                  placeholder="plant/{gateway}/{rack}/data"
                />
              )}
            </Field>
            {!readOnly && (
              <div className="fmt-chips" role="group" aria-label="Insert into the channel pattern">
                {TOKENS.map((t) => (
                  <button key={t} type="button" className="fmt-chip" onClick={() => insertToken(t)} aria-label={`Insert ${t}`}>
                    {t}
                  </button>
                ))}
              </div>
            )}
          </FieldSection>

          <FieldSection title="Where each value sits in the message">
            <div className="fmt-map">
              <label className="fmt-map-row">
                <span className="fmt-map-label">
                  <span className="fmt-map-name">Readings</span>
                  <span className="fmt-map-hint">Where the list of readings sits; empty = the whole message</span>
                </span>
                {pathInput("records", "Readings path", draft.records, (v) => set("records", v), "readings · racks[*].cards[*]")}
              </label>
              {FORMAT_FIELD_KEYS.map((k) => (
                <label key={k} className="fmt-map-row">
                  <span className="fmt-map-label">
                    <span className="fmt-map-name">{FIELD_META[k].label}</span>
                    <span className="fmt-map-hint">{FIELD_META[k].hint}</span>
                  </span>
                  {pathInput(k, `${FIELD_META[k].label} path`, draft.fields[k], (v) => setField(k, v), k === "rack" || k === "card" || k === "channel" ? "topic / default" : "")}
                </label>
              ))}
            </div>
            {!readOnly && (
              <p className="fmt-syntax ast-caption">
                <code>a.b</code> nested key · <code>[0]</code> index · <code>$key</code> map key · <code>$index</code> position · <code>$value</code> the record ·{" "}
                <code>=°C</code> literal · empty takes it from the topic, else the default. Keys not on the record are looked up on its parents.
              </p>
            )}
          </FieldSection>

          <FieldSection title="Time and defaults">
            <FieldGrid>
              <Field label="Time format" wide>
                {(id, d) => (
                  <Select
                    id={id}
                    describedBy={d}
                    value={draft.timestampFormat}
                    disabled={readOnly}
                    onChange={(v) => set("timestampFormat", v as TimestampFormat)}
                    options={TIMESTAMP_OPTIONS}
                  />
                )}
              </Field>
              {(["rack", "card", "channel"] as const).map((k) => (
                <Field key={k} label={`Default ${k}`} hint="Used when neither the message nor its channel gives it">
                  {(id, d) => (
                    <input
                      id={id}
                      aria-describedby={d}
                      className="ui-input"
                      data-mono
                      value={draft.defaults[k]}
                      disabled={readOnly}
                      onChange={(e) => set("defaults", { ...draft.defaults, [k]: e.target.value })}
                    />
                  )}
                </Field>
              ))}
            </FieldGrid>
          </FieldSection>

          {format && (
            <p className="ast-caption">
              {gateways.length === 0 ? "No gateway uses this format." : `Used by ${gateways.join(", ")}.`}
            </p>
          )}
          {!readOnly && problems.length > 0 && (tried || dirty) && <FormNote tone="bad">{problems.join(" ")}</FormNote>}
        </div>

        <div className="fmt-side ast-card">
          <FormatPreview format={previewFormat} pickLabel={readOnly ? null : target === "records" ? "Readings" : FIELD_META[target].label} onPick={readOnly ? null : onPick} />
        </div>
      </div>
    </form>
  );
}
