"use client";

import React, { useEffect, useId, useState } from "react";
import { Dialog, Field, FieldGrid, FieldSection, FormNote, NumberInput, PillButton, Select, TextInput } from "@/components/ui";
import { StatusTag } from "@/components/assets/assets-shell-ui";
import { useEdge } from "@/providers/edge-context";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { SOURCE_KINDS, SOURCE_KIND_LABEL, type EdgeMapResult, type EdgePoint, type SourceKind } from "@/types/edge";
import type { MqttMeasurement } from "@/types/mqtt";
import { type EdgeIndex, READING_LABEL, READING_TONE, type ReadingStatus, sourcesOf } from "../edge-model";
import { DeleteConfirm, machineOptions, numberOrNull, str } from "./edge-dialog-parts";
import { fmt } from "./edge-tree-model";

/* ==========================================================================
   Map one channel (gateway › rack › card · channel) to a machine signal.
   The server creates the source if the rack is new, creates or updates the
   point, and adds the tag to the machine's sensor list when it is new.
   ========================================================================== */

export interface MapTarget {
  gatewayId: string;
  rack: string;
  card: string;
  channel: string;
  measurement: MqttMeasurement | null;
  point: EdgePoint | null;
  status: ReadingStatus;
}

interface MachineSensor {
  tag: string;
  name: string;
  unit: string;
}

type Errors = Partial<Record<"machineId" | "tag" | "name" | "alertLimit" | "dangerLimit", string>>;

/** Tag-safe text: "Bearing temp DE" → "BEARING-TEMP-DE". */
const toTag = (s: string) =>
  s
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** The machine's existing signal tags, for the tag picker. */
function useMachineSensors(machineId: string): { sensors: MachineSensor[]; failed: boolean } {
  const [state, setState] = useState<{ id: string; sensors: MachineSensor[]; failed: boolean }>({ id: "", sensors: [], failed: false });
  useEffect(() => {
    if (!machineId) return;
    const ctrl = new AbortController();
    fetch(`/api/catalog?machineId=${encodeURIComponent(machineId)}`, { signal: ctrl.signal, cache: "no-store" })
      .then((r) => r.json())
      .then((body: { data?: { sensors?: MachineSensor[] } }) => {
        const list = (body.data?.sensors ?? []).map((s) => ({ tag: s.tag, name: s.name, unit: s.unit }));
        setState({ id: machineId, sensors: list, failed: !body.data });
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") setState({ id: machineId, sensors: [], failed: true });
      });
    return () => ctrl.abort();
  }, [machineId]);
  return state.id === machineId ? state : { sensors: [], failed: false };
}

export interface MapDialogProps {
  open: boolean;
  ix: EdgeIndex;
  target: MapTarget;
  onClose: () => void;
}

export function MapDialog({ open, ix, target, onClose }: MapDialogProps) {
  const { mapChannel, remove } = useEdge();
  const { navigateToMachine } = useIndustrialData();
  const listId = useId();
  const gw = ix.gateways.get(target.gatewayId);
  const source = gw ? sourcesOf(ix, gw.id).find((s) => s.code === target.rack) ?? null : null;
  // The reading follows the stream while the dialog is open.
  const m = (target.measurement && ix.snapshot?.measurements.find((x) => x.key === target.measurement!.key)) || target.measurement;
  const p = target.point;

  const [machineId, setMachineId] = useState(str(p?.machineId ?? source?.machineId));
  const [tag, setTag] = useState(p?.signalTag ?? p?.tag ?? (m?.sensor ? toTag(m.sensor) : `${target.rack}-${target.card}-${target.channel}`));
  const [name, setName] = useState(p?.name ?? m?.sensor ?? `${target.rack} card ${target.card} ch ${target.channel}`);
  const [unit, setUnit] = useState(str(p?.unit ?? m?.unit));
  const [alertLimit, setAlertLimit] = useState(str(p ? p.alertLimit : m?.alertThreshold));
  const [dangerLimit, setDangerLimit] = useState(str(p ? p.dangerLimit : m?.dangerThreshold));
  const [kind, setKind] = useState<SourceKind>("rack");

  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [result, setResult] = useState<EdgeMapResult | null>(null);
  const { sensors, failed } = useMachineSensors(machineId);
  const existing = sensors.find((s) => s.tag === tag.trim());

  const pickTag = (v: string) => {
    setTag(v);
    // Linking an existing signal takes its name and unit.
    const hit = sensors.find((s) => s.tag === v.trim());
    if (hit) {
      setName(hit.name);
      if (hit.unit) setUnit(hit.unit);
    }
  };

  const validate = (): boolean => {
    const e: Errors = {};
    if (!machineId) e.machineId = "Pick the machine this channel measures";
    if (!tag.trim()) e.tag = "Tag is required";
    if (!name.trim()) e.name = "Name is required";
    if (Number.isNaN(numberOrNull(alertLimit))) e.alertLimit = "Must be a number";
    if (Number.isNaN(numberOrNull(dangerLimit))) e.dangerLimit = "Must be a number";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (result) {
      onClose();
      return;
    }
    if (!validate() || !gw) return;
    setBusy(true);
    setFailure(null);
    try {
      const res = await mapChannel({
        gatewayId: gw.id,
        rack: target.rack,
        card: target.card,
        channel: target.channel,
        machineId,
        tag: tag.trim(),
        name: name.trim(),
        unit: unit.trim() || null,
        alertLimit: numberOrNull(alertLimit),
        dangerLimit: numberOrNull(dangerLimit),
        ...(source ? {} : { sourceKind: kind }),
      });
      setResult(res);
    } catch (err) {
      setFailure((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const unmap = async () => {
    if (!p) return;
    setBusy(true);
    setFailure(null);
    try {
      await remove("points", p.id);
      onClose();
    } catch (err) {
      setFailure((err as Error).message);
      setBusy(false);
    }
  };

  const path = `${gw?.code ?? "?"} › ${target.rack} › card ${target.card} · ch ${target.channel}`;
  const live = m && (m.display ?? (m.value !== null ? fmt(m.value) : null));
  const unitSuffix = unit.trim() ? ` (${unit.trim()})` : "";
  const notes: string[] = [];
  if (result?.sourceCreated) notes.push(`${target.rack} registered as a ${SOURCE_KIND_LABEL[result.source.kind]}`);
  if (result?.signalCreated) notes.push("new sensor added to the machine");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={busy}
      onSubmit={submit}
      width={600}
      title={p ? "Edit mapping" : "Map channel"}
      subtitle={path}
      footerStart={p && !result ? <DeleteConfirm label="Unmap" question={`Remove point ${p.tag}? The machine keeps its sensor.`} onDelete={unmap} disabled={busy} /> : undefined}
      footer={
        result ? (
          <>
            <PillButton
              variant="secondary"
              onClick={() => {
                onClose();
                navigateToMachine(result.point.machineId ?? machineId, "rack");
              }}
            >
              Open machine
            </PillButton>
            <PillButton type="submit" variant="primary">
              Done
            </PillButton>
          </>
        ) : (
          <>
            <PillButton variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </PillButton>
            <PillButton type="submit" variant="primary" disabled={busy || !gw}>
              {busy ? "Mapping…" : p ? "Save mapping" : "Map"}
            </PillButton>
          </>
        )
      }
    >
      <div className="dv-map-live" aria-label="Channel reading">
        <span className="ast-caption">Live reading</span>
        <span className="dv-value ast-num">
          {live ?? "—"}
          {live && <span className="ast-unit">{m?.unit ?? ""}</span>}
        </span>
        <StatusTag tone={READING_TONE[target.status]} label={READING_LABEL[target.status]} />
        {m?.sensor && <span className="ast-caption">Payload name: {m.sensor}</span>}
        {m?.cardType && <span className="ast-caption">Card type: {m.cardType}</span>}
      </div>

      <FieldSection title="Machine signal">
        <FieldGrid>
          <Field label="Machine" required error={errors.machineId}>
            {(id, d) => <Select id={id} describedBy={d} value={machineId} onChange={setMachineId} disabled={busy || Boolean(result)} options={machineOptions(ix.registry).map((o) => (o.value ? o : { ...o, label: "Choose a machine" }))} />}
          </Field>
          <Field
            label="Tag"
            required
            error={errors.tag}
            hint={
              !machineId
                ? "Pick a machine to see its tags"
                : failed
                  ? "Could not load the machine's tags; a typed tag still works"
                  : existing
                    ? `Links the existing sensor ${existing.tag}`
                    : `New tag; it is added to the machine's ${sensors.length} sensors`
            }
          >
            {(id, d) => (
              <>
                <input
                  id={id}
                  className="ui-input"
                  data-mono
                  aria-describedby={d}
                  list={listId}
                  value={tag}
                  spellCheck={false}
                  autoComplete="off"
                  disabled={busy || Boolean(result)}
                  onChange={(e) => pickTag(e.target.value)}
                />
                <datalist id={listId}>
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
          <Field label="Name" required error={errors.name}>
            {(id, d) => <TextInput id={id} describedBy={d} value={name} onChange={setName} disabled={busy || Boolean(result)} />}
          </Field>
          <Field label="Unit">
            {(id, d) => <TextInput id={id} describedBy={d} value={unit} onChange={setUnit} placeholder="mm/s" disabled={busy || Boolean(result)} />}
          </Field>
          <Field label={`Warning limit${unitSuffix}`} error={errors.alertLimit}>
            {(id, d) => <NumberInput id={id} describedBy={d} value={alertLimit} onChange={setAlertLimit} step="any" disabled={busy || Boolean(result)} />}
          </Field>
          <Field label={`Alarm limit${unitSuffix}`} error={errors.dangerLimit}>
            {(id, d) => <NumberInput id={id} describedBy={d} value={dangerLimit} onChange={setDangerLimit} step="any" disabled={busy || Boolean(result)} />}
          </Field>
          {!source && (
            <Field label="Rack kind" hint={`${target.rack} is not registered yet; it is added as this kind`} wide>
              {(id, d) => (
                <Select
                  id={id}
                  describedBy={d}
                  value={kind}
                  onChange={(v) => setKind(v as SourceKind)}
                  disabled={busy || Boolean(result)}
                  options={SOURCE_KINDS.map((k) => ({ value: k, label: SOURCE_KIND_LABEL[k] }))}
                />
              )}
            </Field>
          )}
        </FieldGrid>
      </FieldSection>

      {failure && <FormNote tone="bad">{failure}</FormNote>}
      {result && (
        <FormNote tone="good">
          Mapped to {result.point.machineId ?? machineId} · {result.point.signalTag ?? result.point.tag}
          {notes.length ? ` (${notes.join("; ")})` : ""}
        </FormNote>
      )}
    </Dialog>
  );
}
