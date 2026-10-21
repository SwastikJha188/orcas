"use client";

import React, { useId, useState } from "react";
import { ConfirmAction, Dialog, Field, FieldGrid, FieldSection, FormNote, PillButton, Select, TextInput, Toggle } from "@/components/ui";
import { useEdge } from "@/providers/edge-context";
import type { EdgePoint, EdgePointInput, PointDataType } from "@shared/types/edge";
import type { EdgeIndex } from "../edge-model";
import { machineOptions, str, textOrNull } from "./edge-dialog-parts";
import { sameTag, useMachineSensors } from "./edge-map-dialog";
import { type Selection, pointLabel } from "./edge-tree-model";

/* ==========================================================================
   Add / edit point: one card + channel of a source and the machine sensor
   (measurement) it feeds. The point is hardware only; its tag, name, unit
   and limits are the measurement's, edited with the machine's sensors.
   ========================================================================== */

const DATA_TYPES: Array<{ value: PointDataType; label: string }> = [
  { value: "float", label: "Decimal number" },
  { value: "int", label: "Whole number" },
  { value: "bool", label: "On / off" },
  { value: "string", label: "Text" },
  { value: "video", label: "Video stream" },
  { value: "status+map", label: "Status + map" },
];

/** Card and channel to start a new point on (a channel heard on the wire). */
export interface PointPrefill {
  slot: string;
  channel: string;
}

export interface PointDialogProps {
  open: boolean;
  ix: EdgeIndex;
  sourceId: string;
  point?: EdgePoint;
  prefill?: PointPrefill;
  onClose: () => void;
  onSaved: (sel: Selection) => void;
}

type Errors = Partial<Record<"slot" | "channel" | "signalTag", string>>;

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

  const [slot, setSlot] = useState(str(point?.slot ?? prefill?.slot));
  const [channel, setChannel] = useState(str(point?.channel ?? prefill?.channel ?? "1"));
  const [address, setAddress] = useState(str(point?.address));
  const [sourceTag, setSourceTag] = useState(str(point?.sourceTag));
  const [dataType, setDataType] = useState<PointDataType>(point?.dataType ?? "float");
  const [sampleRate, setSampleRate] = useState(str(point?.sampleRate));
  const [machineId, setMachineId] = useState(str(point ? point.machineId : source?.machineId));
  const [signalTag, setSignalTag] = useState(str(point?.tag));
  const [enabled, setEnabled] = useState(point?.enabled ?? true);

  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  // The machine's own sensor tags, offered for "Machine sensor tag".
  const tagListId = useId();
  const { sensors, failed: sensorsFailed } = useMachineSensors(machineId);
  const linked = signalTag.trim() ? sensors.find((s) => sameTag(s.tag, signalTag)) : undefined;
  const pickSignalTag = (v: string) => setSignalTag(sensors.find((s) => sameTag(s.tag, v))?.tag ?? v);

  const validate = (): boolean => {
    const e: Errors = {};
    if (machineId && !signalTag.trim()) e.signalTag = "Pick the machine sensor this channel feeds";
    const cardIssue = idProblem(slot, "Card");
    const channelIssue = idProblem(channel, "Channel");
    if (cardIssue) e.slot = cardIssue;
    if (channelIssue) e.channel = channelIssue;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setBusy(true);
    setFailure(null);
    const body = {
      sourceId,
      slot: slot.trim(),
      channel: channel.trim(),
      address: textOrNull(address),
      dataType,
      sampleRate: textOrNull(sampleRate),
      sourceTag: textOrNull(sourceTag),
      machineId: machineId || null,
      tag: machineId ? (linked?.tag ?? textOrNull(signalTag)) : null,
      enabled,
    } satisfies EdgePointInput;
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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={busy}
      onSubmit={submit}
      width={620}
      title={editing ? "Edit channel" : prefill ? "Link channel to a machine" : "Add channel"}
      subtitle={
        editing ? `${pointLabel(point!)} · card ${point!.slot}, channel ${point!.channel}` : source ? `On ${source.code} · ${source.name}` : undefined
      }
      footerStart={editing ? <ConfirmAction label="Delete channel" question={`Delete channel ${pointLabel(point!)}?`} onConfirm={doDelete} disabled={busy} /> : undefined}
      footer={
        <>
          <PillButton variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </PillButton>
          <PillButton type="submit" variant="primary" disabled={busy}>
            {busy ? "Saving…" : editing ? "Save" : "Add channel"}
          </PillButton>
        </>
      }
    >
      <FieldSection title="Channel">
        <FieldGrid>
          <Field label="Card" required error={errors.slot} hint="Card (slot) ID, exactly as the gateway sends it">
            {(id, d) => <TextInput id={id} describedBy={d} value={slot} onChange={setSlot} mono placeholder="3 or AI-4" autoFocus={!editing} disabled={busy} />}
          </Field>
          <Field label="Channel" required error={errors.channel}>
            {(id, d) => <TextInput id={id} describedBy={d} value={channel} onChange={setChannel} mono placeholder="1 or TT-101" disabled={busy} />}
          </Field>
          <Field label="Address" hint="Register number, OPC UA node ID or PLC tag path">
            {(id, d) => <TextInput id={id} describedBy={d} value={address} onChange={setAddress} mono placeholder="40001" disabled={busy} />}
          </Field>
          <Field label="Plant tag" hint="The channel's tag in the plant DCS, PLC or historian">
            {(id, d) => <TextInput id={id} describedBy={d} value={sourceTag} onChange={setSourceTag} mono placeholder="TI-4012" disabled={busy} />}
          </Field>
          <Field label="Data type">
            {(id, d) => <Select id={id} describedBy={d} value={dataType} onChange={(v) => setDataType(v as PointDataType)} disabled={busy} options={DATA_TYPES} />}
          </Field>
          <Field label="How often it is read">
            {(id, d) => <TextInput id={id} describedBy={d} value={sampleRate} onChange={setSampleRate} placeholder="1 s" disabled={busy} />}
          </Field>
        </FieldGrid>
      </FieldSection>

      <FieldSection title="Which machine it feeds">
        <FieldGrid>
          <Field label="Machine">
            {(id, d) => <Select id={id} describedBy={d} value={machineId} onChange={setMachineId} disabled={busy} options={machineOptions(ix.registry)} />}
          </Field>
          <Field
            label="Machine sensor tag"
            error={errors.signalTag}
            hint={
              !machineId
                ? "The machine sensor this channel feeds. Pick a machine to see its tags"
                : sensorsFailed
                  ? "Could not load the machine's tags; a typed tag still works"
                  : linked
                    ? `Feeds the machine's sensor ${linked.tag}${linked.name ? ` · ${linked.name}` : ""}${linked.unit ? ` (${linked.unit})` : ""}; its name, unit and limits are the sensor's`
                    : "The machine sensor this channel feeds. Pick one of the machine's tags or type it"
            }
          >
            {(id, d) => (
              <>
                <input
                  id={id}
                  className="ui-input"
                  data-mono
                  aria-describedby={d}
                  list={tagListId}
                  value={signalTag}
                  spellCheck={false}
                  autoComplete="off"
                  placeholder="TMP-KLN-04"
                  disabled={busy}
                  onChange={(e) => pickSignalTag(e.target.value)}
                />
                <datalist id={tagListId}>
                  {sensors.map((s) => (
                    <option key={s.tag} value={s.tag}>
                      {s.name}
                      {s.unit ? ` (${s.unit})` : ""}
                    </option>
                  ))}
                </datalist>
              </>
            )}
          </Field>
        </FieldGrid>
      </FieldSection>

      <Toggle checked={enabled} onChange={setEnabled} disabled={busy} label="Switched on" />
      {failure && <FormNote tone="bad">{failure}</FormNote>}
    </Dialog>
  );
}
