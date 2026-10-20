"use client";

import React, { useState } from "react";
import { Dialog, Field, FieldGrid, FieldSection, FormNote, NumberInput, PillButton, Select, TextInput, Toggle } from "@/components/ui";
import { useEdge } from "@/providers/edge-context";
import type { EdgePoint, PointDataType } from "@/types/edge";
import type { EdgeIndex } from "../edge-model";
import { DeleteConfirm, machineOptions, numberOrNull, str, textOrNull } from "./edge-dialog-parts";
import type { PointPrefill } from "./edge-source";
import type { Selection } from "./edge-tree-model";

/* ==========================================================================
   Add / edit point: one card + channel of a source mapped to a tag, with its
   limits and the machine signal it feeds. "Map" on an unmapped channel opens
   this prefilled from what the gateway publishes.
   ========================================================================== */

const DATA_TYPES: Array<{ value: PointDataType; label: string }> = [
  { value: "float", label: "Decimal number" },
  { value: "int", label: "Whole number" },
  { value: "bool", label: "On / off" },
  { value: "string", label: "Text" },
  { value: "video", label: "Video stream" },
  { value: "status+map", label: "Status + map" },
];

export interface PointDialogProps {
  open: boolean;
  ix: EdgeIndex;
  sourceId: string;
  point?: EdgePoint;
  prefill?: PointPrefill;
  onClose: () => void;
  onSaved: (sel: Selection) => void;
}

type Errors = Partial<Record<"tag" | "name" | "slot" | "channel" | "alertLimit" | "dangerLimit", string>>;

/** Card and channel ids are text ("3", "AI-4", "TT-101"). */
const idProblem = (v: string, what: string): string | undefined => {
  const t = v.trim();
  if (!t) return `${what} is required`;
  if (t.length > 64) return "64 characters at most";
  return undefined;
};

export function PointDialog({ open, ix, sourceId, point, prefill, onClose, onSaved }: PointDialogProps) {
  const { create, update, remove } = useEdge();
  const source = ix.sources.get(sourceId);
  const editing = Boolean(point);

  const [tag, setTag] = useState(point?.tag ?? "");
  const [name, setName] = useState(point?.name ?? prefill?.name ?? "");
  const [slot, setSlot] = useState(str(point?.slot ?? prefill?.slot));
  const [channel, setChannel] = useState(str(point?.channel ?? prefill?.channel ?? "1"));
  const [address, setAddress] = useState(str(point?.address));
  const [unit, setUnit] = useState(str(point?.unit ?? prefill?.unit));
  const [dataType, setDataType] = useState<PointDataType>(point?.dataType ?? "float");
  const [sampleRate, setSampleRate] = useState(str(point?.sampleRate));
  const [alertLimit, setAlertLimit] = useState(str(point ? point.alertLimit : prefill?.alertLimit));
  const [dangerLimit, setDangerLimit] = useState(str(point ? point.dangerLimit : prefill?.dangerLimit));
  const [machineId, setMachineId] = useState(str(point ? point.machineId : source?.machineId));
  const [signalTag, setSignalTag] = useState(str(point?.signalTag));
  const [enabled, setEnabled] = useState(point?.enabled ?? true);

  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const alertN = numberOrNull(alertLimit);
  const dangerN = numberOrNull(dangerLimit);
  // Only "high" limits are modelled; a danger below alert may be a low limit, so warn but allow.
  const inverted = alertN !== null && dangerN !== null && !Number.isNaN(alertN) && !Number.isNaN(dangerN) && dangerN < alertN;

  const validate = (): boolean => {
    const e: Errors = {};
    if (!tag.trim()) e.tag = "Enter the sensor tag";
    if (!name.trim()) e.name = "Enter a name";
    const cardIssue = idProblem(slot, "Card");
    const channelIssue = idProblem(channel, "Channel");
    if (cardIssue) e.slot = cardIssue;
    if (channelIssue) e.channel = channelIssue;
    if (Number.isNaN(alertN)) e.alertLimit = "Must be a number";
    if (Number.isNaN(dangerN)) e.dangerLimit = "Must be a number";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setBusy(true);
    setFailure(null);
    const body = {
      sourceId,
      tag: tag.trim(),
      name: name.trim(),
      slot: slot.trim(),
      channel: channel.trim(),
      address: textOrNull(address),
      unit: textOrNull(unit),
      dataType,
      sampleRate: textOrNull(sampleRate),
      alertLimit: alertN,
      dangerLimit: dangerN,
      machineId: machineId || null,
      signalTag: textOrNull(signalTag),
      enabled,
    };
    try {
      if (point) await update("points", point.id, body);
      else await create("points", body);
      onSaved({ type: "source", id: sourceId });
    } catch (err) {
      setFailure((err as Error).message);
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!point) return;
    setBusy(true);
    setFailure(null);
    try {
      await remove("points", point.id);
      onSaved({ type: "source", id: sourceId });
    } catch (err) {
      setFailure((err as Error).message);
      setBusy(false);
    }
  };

  const unitLabel = unit.trim() ? ` (${unit.trim()})` : "";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={busy}
      onSubmit={submit}
      width={620}
      title={editing ? "Edit reading point" : prefill ? "Link channel to a machine" : "Add reading point"}
      subtitle={
        editing ? `${point!.tag} · card ${point!.slot}, channel ${point!.channel}` : source ? `On ${source.code} · ${source.name}` : undefined
      }
      footerStart={editing ? <DeleteConfirm label="Delete reading point" question={`Delete reading point ${point!.tag}?`} onDelete={doDelete} disabled={busy} /> : undefined}
      footer={
        <>
          <PillButton variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </PillButton>
          <PillButton type="submit" variant="primary" disabled={busy}>
            {busy ? "Saving…" : editing ? "Save" : "Add reading point"}
          </PillButton>
        </>
      }
    >
      <FieldSection title="Reading point">
        <FieldGrid>
          <Field label="Sensor tag" required error={errors.tag}>
            {(id, d) => <TextInput id={id} describedBy={d} value={tag} onChange={setTag} mono placeholder="TMP-KLN-04" autoFocus={!editing} disabled={busy} />}
          </Field>
          <Field label="Name" required error={errors.name}>
            {(id, d) => <TextInput id={id} describedBy={d} value={name} onChange={setName} placeholder="Tyre 2 bearing temperature" disabled={busy} />}
          </Field>
          <Field label="Card" required error={errors.slot} hint="Card (slot) ID, exactly as the data collector sends it">
            {(id, d) => <TextInput id={id} describedBy={d} value={slot} onChange={setSlot} mono placeholder="3 or AI-4" disabled={busy} />}
          </Field>
          <Field label="Channel" required error={errors.channel}>
            {(id, d) => <TextInput id={id} describedBy={d} value={channel} onChange={setChannel} mono placeholder="1 or TT-101" disabled={busy} />}
          </Field>
          <Field label="Address" hint="Register number, OPC UA node ID or PLC tag path">
            {(id, d) => <TextInput id={id} describedBy={d} value={address} onChange={setAddress} mono placeholder="40001" disabled={busy} />}
          </Field>
          <Field label="Unit">
            {(id, d) => <TextInput id={id} describedBy={d} value={unit} onChange={setUnit} placeholder="°C" disabled={busy} />}
          </Field>
          <Field label="Data type">
            {(id, d) => <Select id={id} describedBy={d} value={dataType} onChange={(v) => setDataType(v as PointDataType)} disabled={busy} options={DATA_TYPES} />}
          </Field>
          <Field label="How often it is read">
            {(id, d) => <TextInput id={id} describedBy={d} value={sampleRate} onChange={setSampleRate} placeholder="1 s" disabled={busy} />}
          </Field>
        </FieldGrid>
      </FieldSection>

      <FieldSection title="Limits">
        <FieldGrid>
          <Field label={`Warning limit${unitLabel}`} error={errors.alertLimit}>
            {(id, d) => <NumberInput id={id} describedBy={d} value={alertLimit} onChange={setAlertLimit} step="any" disabled={busy} />}
          </Field>
          <Field label={`Alarm limit${unitLabel}`} error={errors.dangerLimit}>
            {(id, d) => <NumberInput id={id} describedBy={d} value={dangerLimit} onChange={setDangerLimit} step="any" disabled={busy} />}
          </Field>
        </FieldGrid>
        {inverted && <FormNote tone="warn">The alarm limit is below the warning limit. That is only right for a reading that must not drop too low; for a high limit, set the alarm at or above the warning.</FormNote>}
      </FieldSection>

      <FieldSection title="Which machine it feeds">
        <FieldGrid>
          <Field label="Machine">
            {(id, d) => <Select id={id} describedBy={d} value={machineId} onChange={setMachineId} disabled={busy} options={machineOptions(ix.registry)} />}
          </Field>
          <Field label="Machine sensor tag" hint="The machine sensor this reading point feeds">
            {(id, d) => <TextInput id={id} describedBy={d} value={signalTag} onChange={setSignalTag} mono placeholder="TMP-KLN-04" disabled={busy} />}
          </Field>
        </FieldGrid>
      </FieldSection>

      <Toggle checked={enabled} onChange={setEnabled} disabled={busy} label="Switched on" />
      {failure && <FormNote tone="bad">{failure}</FormNote>}
    </Dialog>
  );
}
