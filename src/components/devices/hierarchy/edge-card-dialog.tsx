"use client";

import React, { useState } from "react";
import { Dialog, Field, FieldGrid, FormNote, NumberInput, PillButton, TextArea, TextInput, Toggle } from "@/components/ui";
import { useEdge } from "@/providers/edge-context";
import type { EdgeCard } from "@/types/edge";
import { type EdgeIndex, pointsOf } from "../edge-model";
import { DeleteConfirm, numberOrNull, str, textOrNull } from "./edge-dialog-parts";
import { type Selection, plural } from "./edge-tree-model";

/* ==========================================================================
   Add / edit card: one I/O card (slot) of a source. Its code is the card id
   on the wire and the `slot` of every point on it.
   ========================================================================== */

export interface CardPrefill {
  code?: string;
  cardType?: string | null;
  channelCount?: number | null;
}

export interface CardDialogProps {
  open: boolean;
  ix: EdgeIndex;
  sourceId: string;
  card?: EdgeCard;
  prefill?: CardPrefill;
  onClose: () => void;
  onSaved: (sel: Selection) => void;
}

type Errors = Partial<Record<"code" | "channelCount", string>>;

export function CardDialog({ open, ix, sourceId, card, prefill, onClose, onSaved }: CardDialogProps) {
  const { create, update, remove } = useEdge();
  const source = ix.sources.get(sourceId);
  const editing = Boolean(card);

  const [code, setCode] = useState(card?.code ?? prefill?.code ?? "");
  const [cardType, setCardType] = useState(str(card ? card.cardType : prefill?.cardType));
  const [channelCount, setChannelCount] = useState(str(card ? card.channelCount : prefill?.channelCount));
  const [model, setModel] = useState(str(card?.model));
  const [notes, setNotes] = useState(str(card?.notes));
  const [enabled, setEnabled] = useState(card?.enabled ?? true);

  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const validate = (): boolean => {
    const e: Errors = {};
    if (!code.trim()) e.code = "Card id is required";
    else if (code.trim().length > 64) e.code = "64 characters at most";
    const n = numberOrNull(channelCount);
    if (n !== null && (!Number.isInteger(n) || n < 0 || n > 4096)) e.channelCount = "Whole number from 0 to 4096";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setBusy(true);
    setFailure(null);
    const body = {
      sourceId,
      code: code.trim(),
      cardType: textOrNull(cardType),
      channelCount: numberOrNull(channelCount),
      model: textOrNull(model),
      notes: textOrNull(notes),
      enabled,
    };
    try {
      const saved = card ? await update("cards", card.id, body) : await create("cards", body);
      onSaved({ type: "card", sourceId, card: saved.code });
    } catch (err) {
      setFailure((err as Error).message);
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!card) return;
    setBusy(true);
    setFailure(null);
    try {
      await remove("cards", card.id);
      onSaved({ type: "source", id: sourceId });
    } catch (err) {
      setFailure((err as Error).message);
      setBusy(false);
    }
  };

  const onCard = card ? pointsOf(ix, sourceId).filter((p) => p.slot === card.code).length : 0;
  const question = onCard ? `Delete card ${card!.code}? Its ${plural(onCard, "point")} are kept` : `Delete card ${card?.code ?? ""}?`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={busy}
      onSubmit={submit}
      width={560}
      title={editing ? "Edit card" : prefill?.code ? "Register card" : "Add card"}
      subtitle={source ? `On ${source.code} · ${source.name}` : undefined}
      footerStart={editing ? <DeleteConfirm label="Delete card" question={question} onDelete={doDelete} disabled={busy} /> : undefined}
      footer={
        <>
          <PillButton variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </PillButton>
          <PillButton type="submit" variant="primary" disabled={busy}>
            {busy ? "Saving…" : editing ? "Save" : "Add card"}
          </PillButton>
        </>
      }
    >
      <FieldGrid>
        <Field label="Card id" required error={errors.code} hint="Slot number or card name as the gateway sends it">
          {(id, d) => <TextInput id={id} describedBy={d} value={code} onChange={setCode} mono placeholder="3 or AI-4" autoFocus={!editing && !prefill?.code} disabled={busy} />}
        </Field>
        <Field label="Card type">
          {(id, d) => <TextInput id={id} describedBy={d} value={cardType} onChange={setCardType} placeholder="VIBRATION, AI, RTD" disabled={busy} />}
        </Field>
        <Field label="Channels" error={errors.channelCount}>
          {(id, d) => <NumberInput id={id} describedBy={d} value={channelCount} onChange={setChannelCount} min={0} step={1} placeholder="8" disabled={busy} />}
        </Field>
        <Field label="Model">
          {(id, d) => <TextInput id={id} describedBy={d} value={model} onChange={setModel} disabled={busy} />}
        </Field>
        <Field label="Notes" wide>
          {(id, d) => <TextArea id={id} describedBy={d} value={notes} onChange={setNotes} rows={2} disabled={busy} />}
        </Field>
      </FieldGrid>
      <Toggle checked={enabled} onChange={setEnabled} disabled={busy} label="Enabled" />
      {editing && onCard > 0 && <FormNote tone="info">Deleting the card keeps its {plural(onCard, "point")}; they stay mapped by card id {card!.code}.</FormNote>}
      {failure && <FormNote tone="bad">{failure}</FormNote>}
    </Dialog>
  );
}
