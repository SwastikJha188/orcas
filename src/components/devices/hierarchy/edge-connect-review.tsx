"use client";

import React from "react";
import { Field, FieldGrid, Select, TextInput } from "@/components/ui";
import { IconClose } from "@/components/assets/assets-shell-ui";
import { naturalCompare } from "@/lib/edge-format";
import { SOURCE_KINDS, SOURCE_KIND_LABEL, SOURCE_PROTOCOLS, type EdgeRegistry, type SourceKind } from "@/types/edge";
import { KIND_DEFAULT_PROTOCOL } from "./edge-detect";
import { machineOptions } from "./edge-dialog-parts";
import type { FoundRack } from "./edge-connect-find";
import { IconPlus, SourceKindIcon } from "./edge-icons";
import { plural } from "./edge-tree-model";

/* ==========================================================================
   Connect wizard · review. One block per rack the gateway reports (kept
   live), plus sources and cards added by hand. Detected codes are fixed;
   everything else is editable before commissioning.
   ========================================================================== */

export interface ManualCard {
  key: string;
  code: string;
  cardType: string;
  channelCount: string;
}

export interface ReviewRow {
  /** Detected rows are keyed by their code; manual rows by a local key. */
  key: string;
  detected: boolean;
  include: boolean;
  code: string;
  name: string;
  kind: SourceKind;
  protocol: string;
  machineId: string;
  cards: ManualCard[];
}

let seq = 0;
export const localKey = (prefix: string) => `${prefix}-${(seq += 1)}`;

export function defaultRow(code: string, detected: boolean): ReviewRow {
  return { key: detected ? `d:${code}` : localKey("m"), detected, include: true, code, name: code, kind: "rack", protocol: "Backplane", machineId: "", cards: [] };
}

/** Detected racks merged with the stored edits and manual rows, in order. */
export function reviewRows(racks: FoundRack[], rows: ReviewRow[]): ReviewRow[] {
  const detected = racks.map((r) => rows.find((x) => x.key === `d:${r.code}`) ?? defaultRow(r.code, true));
  // A row kept from a rack that stopped reporting stays, so edits are not lost.
  const stale = rows.filter((x) => x.detected && !racks.some((r) => `d:${r.code}` === x.key));
  return [...detected, ...stale].sort((a, b) => naturalCompare(a.code, b.code)).concat(rows.filter((x) => !x.detected));
}

export function ReviewSources({
  registry,
  racks,
  rows,
  errors,
  disabled,
  onChange,
  onAddRow,
  onRemoveRow,
}: {
  registry: EdgeRegistry;
  racks: FoundRack[];
  rows: ReviewRow[];
  errors: Record<string, string>;
  disabled: boolean;
  onChange: (row: ReviewRow) => void;
  onAddRow: () => void;
  onRemoveRow: (key: string) => void;
}) {
  const machines = machineOptions(registry);
  return (
    <div className="dv-review">
      {rows.length === 0 && (
        <p className="ast-caption">No racks reported yet. Add the gateway&rsquo;s racks, PLCs or SCADA by hand, or wait for its first messages.</p>
      )}
      {rows.map((row) => {
        const rack = racks.find((r) => `d:${r.code}` === row.key);
        const set = (patch: Partial<ReviewRow>) => onChange({ ...row, ...patch });
        const detectedCards = rack?.cards ?? [];
        const channels = detectedCards.reduce((n, c) => n + c.channels.length, 0);
        return (
          <div key={row.key} className="dv-review-row" data-off={!row.include || undefined}>
            <div className="dv-review-head">
              <input
                type="checkbox"
                className="dv-check"
                aria-label={`Include ${row.code || "new source"}`}
                checked={row.include}
                disabled={disabled}
                onChange={(e) => set({ include: e.target.checked })}
              />
              <span className="ast-badge">
                <SourceKindIcon kind={row.kind} size={14} />
              </span>
              <span className="ast-cell-stack">
                <span className="ast-cell-title ast-num">{row.code || "New source"}</span>
                <span className="ast-cell-sub ast-num">
                  {row.detected
                    ? rack
                      ? `Detected · ${plural(detectedCards.length, "card")} · ${plural(channels, "channel")}`
                      : "No longer reporting"
                    : "Added by hand"}
                </span>
              </span>
              {!row.detected && (
                <button type="button" className="ast-icon-btn dv-review-remove" aria-label={`Remove ${row.code || "new source"}`} disabled={disabled} onClick={() => onRemoveRow(row.key)}>
                  <IconClose size={13} />
                </button>
              )}
            </div>
            {row.include && (
              <>
                <FieldGrid>
                  {!row.detected && (
                    <Field label="Code" required error={errors[`${row.key}:code`]} hint="rack_id on the wire">
                      {(id, d) => <TextInput id={id} describedBy={d} value={row.code} onChange={(v) => set({ code: v })} mono placeholder="PLC-01" disabled={disabled} />}
                    </Field>
                  )}
                  <Field label="Name" required error={errors[`${row.key}:name`]}>
                    {(id, d) => <TextInput id={id} describedBy={d} value={row.name} onChange={(v) => set({ name: v })} disabled={disabled} />}
                  </Field>
                  <Field label="Kind">
                    {(id, d) => (
                      <Select
                        id={id}
                        describedBy={d}
                        value={row.kind}
                        disabled={disabled}
                        onChange={(v) => {
                          const kind = v as SourceKind;
                          // Follow the kind's usual protocol until one is picked by hand.
                          const auto = row.protocol === KIND_DEFAULT_PROTOCOL(row.kind);
                          set({ kind, ...(auto ? { protocol: KIND_DEFAULT_PROTOCOL(kind) } : {}) });
                        }}
                        options={SOURCE_KINDS.map((k) => ({ value: k, label: SOURCE_KIND_LABEL[k] }))}
                      />
                    )}
                  </Field>
                  <Field label="Protocol">
                    {(id, d) => <Select id={id} describedBy={d} value={row.protocol} disabled={disabled} onChange={(v) => set({ protocol: v })} options={SOURCE_PROTOCOLS.map((p) => ({ value: p, label: p }))} />}
                  </Field>
                  <Field label="Machine">
                    {(id, d) => <Select id={id} describedBy={d} value={row.machineId} disabled={disabled} onChange={(v) => set({ machineId: v })} options={machines} />}
                  </Field>
                </FieldGrid>

                <div className="dv-review-cards" aria-label={`Cards of ${row.code || "new source"}`}>
                  {detectedCards.map((c) => (
                    <span key={c.code} className="dv-cardchip ast-num" title={c.channels.join(", ")}>
                      <b>{c.code}</b>
                      {c.cardType ? ` · ${c.cardType}` : ""} · {c.channels.length} ch
                    </span>
                  ))}
                  {row.cards.map((c) => (
                    <span key={c.key} className="dv-cardedit">
                      <input
                        className="ui-input"
                        data-mono
                        aria-label="Card id"
                        placeholder="Card"
                        value={c.code}
                        disabled={disabled}
                        aria-invalid={errors[`${row.key}:${c.key}`] ? true : undefined}
                        onChange={(e) => set({ cards: row.cards.map((x) => (x.key === c.key ? { ...x, code: e.target.value } : x)) })}
                      />
                      <input
                        className="ui-input"
                        aria-label="Card type"
                        placeholder="Type"
                        value={c.cardType}
                        disabled={disabled}
                        onChange={(e) => set({ cards: row.cards.map((x) => (x.key === c.key ? { ...x, cardType: e.target.value } : x)) })}
                      />
                      <input
                        className="ui-input"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        aria-label="Channels"
                        placeholder="Ch"
                        value={c.channelCount}
                        disabled={disabled}
                        onChange={(e) => set({ cards: row.cards.map((x) => (x.key === c.key ? { ...x, channelCount: e.target.value } : x)) })}
                      />
                      <button
                        type="button"
                        className="ast-icon-btn"
                        aria-label={`Remove card ${c.code || "row"}`}
                        disabled={disabled}
                        onClick={() => set({ cards: row.cards.filter((x) => x.key !== c.key) })}
                      >
                        <IconClose size={12} />
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    className="dv-map-btn"
                    disabled={disabled}
                    onClick={() => set({ cards: [...row.cards, { key: localKey("c"), code: "", cardType: "", channelCount: "" }] })}
                  >
                    + Add card
                  </button>
                </div>
                {errors[row.key] && (
                  <span className="ui-field-note dv-review-error" role="alert">
                    {errors[row.key]}
                  </span>
                )}
              </>
            )}
          </div>
        );
      })}
      <button type="button" className="dv-review-add" disabled={disabled} onClick={onAddRow}>
        <IconPlus size={13} /> Add source
      </button>
    </div>
  );
}
