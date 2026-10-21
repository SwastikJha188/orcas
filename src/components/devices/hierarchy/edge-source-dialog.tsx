"use client";

import React, { useState } from "react";
import { ConfirmAction, Dialog, Field, FieldGrid, FieldSection, FormNote, NumberInput, PillButton, Select, TextArea, TextInput, Toggle } from "@/components/ui";
import { useEdge } from "@/providers/edge-context";
import { SOURCE_KINDS, SOURCE_KIND_LABEL, SOURCE_PROTOCOLS, type EdgeSource, type SourceKind } from "@shared/types/edge";
import { type EdgeIndex, pointsOf } from "../edge-model";
import { CODE_RULE, CODE_RULE_TEXT, machineOptions, numberOrNull, str, textOrNull } from "./edge-dialog-parts";
import { type Selection, plural, sortGateways } from "./edge-tree-model";

/* ==========================================================================
   Add / edit source: a DAQ rack, PLC, SCADA, DCS or analyser behind a
   gateway. Its code is the rack_id it appears under on the wire.
   ========================================================================== */

/** Usual protocol for a kind, used until the protocol is picked by hand. */
const KIND_PROTOCOL: Record<SourceKind, string> = {
  rack: "Backplane",
  plc: "OPC UA",
  scada: "OPC UA",
  dcs: "OPC UA",
  analyzer: "Modbus TCP",
  other: "Other",
};

const ENDPOINT_HINT: Record<string, string> = {
  Backplane: "Slot path, e.g. chassis 1",
  "OPC UA": "opc.tcp://host:4840",
  "Modbus TCP": "10.0.0.5:502",
  "Modbus RTU": "/dev/ttyS0 · 19200 8N1 · unit 1",
  "EtherNet/IP": "10.0.0.5 (slot 0)",
  PROFINET: "Device name, e.g. plc-kiln-01",
  S7: "10.0.0.5 · rack 0 · slot 1",
  "HART-IP": "10.0.0.5:5094",
  "BACnet/IP": "10.0.0.5:47808 · device 1001",
  Other: "Address or path",
};

export interface SourcePrefill {
  gatewayId?: string;
  code?: string;
  name?: string;
}

export interface SourceDialogProps {
  open: boolean;
  ix: EdgeIndex;
  source?: EdgeSource;
  prefill?: SourcePrefill;
  /** Opened from a gateway: the gateway cannot be changed. */
  lockGateway?: boolean;
  onClose: () => void;
  onSaved: (sel: Selection) => void;
}

type Errors = Partial<Record<"gatewayId" | "code" | "name" | "pollIntervalMs", string>>;

export function SourceDialog({ open, ix, source, prefill, lockGateway, onClose, onSaved }: SourceDialogProps) {
  const { create, update, remove } = useEdge();
  const registry = ix.registry;
  const editing = Boolean(source);
  const initialKind: SourceKind = source?.kind ?? "rack";

  const [gatewayId, setGatewayId] = useState(source?.gatewayId ?? prefill?.gatewayId ?? "");
  const [code, setCode] = useState(source?.code ?? prefill?.code ?? "");
  const [name, setName] = useState(source?.name ?? prefill?.name ?? "");
  const [kind, setKind] = useState<SourceKind>(initialKind);
  const [protocol, setProtocol] = useState(source?.protocol ?? KIND_PROTOCOL[initialKind]);
  const [protocolTouched, setProtocolTouched] = useState(editing);
  const [endpoint, setEndpoint] = useState(str(source?.endpoint));
  const [location, setLocation] = useState(str(source?.location));
  const [machineId, setMachineId] = useState(str(source?.machineId));
  const [model, setModel] = useState(str(source?.model));
  const [pollIntervalMs, setPollIntervalMs] = useState(str(source?.pollIntervalMs));
  const [enabled, setEnabled] = useState(source?.enabled ?? true);
  const [notes, setNotes] = useState(str(source?.notes));

  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const gateway = ix.gateways.get(gatewayId);
  const protocols: string[] = [...SOURCE_PROTOCOLS];
  if (protocol && !protocols.includes(protocol)) protocols.push(protocol);

  const changeKind = (k: string) => {
    setKind(k as SourceKind);
    if (!protocolTouched) setProtocol(KIND_PROTOCOL[k as SourceKind]);
  };

  const validate = (): boolean => {
    const e: Errors = {};
    if (!gatewayId) e.gatewayId = "Pick the gateway that reads this rack";
    if (!code.trim()) e.code = "Enter the rack code";
    else if (!CODE_RULE.test(code.trim())) e.code = CODE_RULE_TEXT;
    if (!name.trim()) e.name = "Name is required";
    const poll = numberOrNull(pollIntervalMs);
    if (poll !== null && (!Number.isInteger(poll) || poll < 1)) e.pollIntervalMs = "Whole milliseconds, 1 or more";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setBusy(true);
    setFailure(null);
    const body = {
      gatewayId,
      code: code.trim(),
      name: name.trim(),
      kind,
      protocol,
      endpoint: textOrNull(endpoint),
      location: textOrNull(location),
      machineId: machineId || null,
      model: textOrNull(model),
      pollIntervalMs: numberOrNull(pollIntervalMs),
      enabled,
      notes: textOrNull(notes),
    };
    try {
      const saved = source ? await update("sources", source.id, body) : await create("sources", body);
      onSaved({ type: "source", id: saved.id });
    } catch (err) {
      setFailure((err as Error).message);
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!source) return;
    setBusy(true);
    setFailure(null);
    try {
      await remove("sources", source.id);
      onSaved({ type: "gateway", id: source.gatewayId });
    } catch (err) {
      setFailure((err as Error).message);
      setBusy(false);
    }
  };

  const nPoints = source ? pointsOf(ix, source.id).length : 0;
  const question = nPoints === 0 ? "Delete this rack?" : `Delete this rack and its ${plural(nPoints, "channel")}?`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={busy}
      onSubmit={submit}
      width={620}
      title={editing ? "Edit rack" : prefill?.code ? "Register rack" : "Add rack"}
      subtitle={editing ? `${source!.name} · ${source!.code}` : gateway ? `Read by ${gateway.name} · ${gateway.code}` : "A sensor rack, controller (PLC), SCADA, DCS or analyser read by a gateway"}
      footerStart={editing ? <ConfirmAction label="Delete rack" question={question} onConfirm={doDelete} disabled={busy} /> : undefined}
      footer={
        <>
          <PillButton variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </PillButton>
          <PillButton type="submit" variant="primary" disabled={busy}>
            {busy ? "Saving…" : editing ? "Save" : "Add rack"}
          </PillButton>
        </>
      }
    >
      <FieldSection title="Identity">
        <FieldGrid>
          <Field label="Gateway" required error={errors.gatewayId} wide>
            {(id, d) => (
              <Select
                id={id}
                describedBy={d}
                value={gatewayId}
                onChange={setGatewayId}
                disabled={busy || lockGateway}
                options={[
                  ...(gatewayId ? [] : [{ value: "", label: "Choose a gateway" }]),
                  ...sortGateways(registry.gateways).map((g) => ({ value: g.id, label: `${g.code} · ${g.name}` })),
                ]}
              />
            )}
          </Field>
          <Field label="Rack code" required error={errors.code} hint="The code the gateway sends this rack's data under">
            {(id, d) => <TextInput id={id} describedBy={d} value={code} onChange={setCode} mono placeholder="PLC-01" autoFocus={!editing && !prefill?.code} disabled={busy} />}
          </Field>
          <Field label="Name" required error={errors.name}>
            {(id, d) => <TextInput id={id} describedBy={d} value={name} onChange={setName} placeholder="Kiln drive PLC" disabled={busy} />}
          </Field>
          <Field label="Type">
            {(id, d) => (
              <Select id={id} describedBy={d} value={kind} onChange={changeKind} disabled={busy} options={SOURCE_KINDS.map((k) => ({ value: k, label: SOURCE_KIND_LABEL[k] }))} />
            )}
          </Field>
          <Field label="How it talks (protocol)">
            {(id, d) => (
              <Select
                id={id}
                describedBy={d}
                value={protocol}
                onChange={(v) => {
                  setProtocol(v);
                  setProtocolTouched(true);
                }}
                disabled={busy}
                options={protocols.map((p) => ({ value: p, label: p }))}
              />
            )}
          </Field>
          <Field label="Network address" wide>
            {(id, d) => <TextInput id={id} describedBy={d} value={endpoint} onChange={setEndpoint} mono placeholder={ENDPOINT_HINT[protocol] ?? ENDPOINT_HINT.Other} disabled={busy} />}
          </Field>
        </FieldGrid>
      </FieldSection>

      <FieldSection title="Placement">
        <FieldGrid>
          <Field label="Machine" hint="The main machine it measures; single channels can link to others">
            {(id, d) => <Select id={id} describedBy={d} value={machineId} onChange={setMachineId} disabled={busy} options={machineOptions(registry)} />}
          </Field>
          <Field label="Location">
            {(id, d) => <TextInput id={id} describedBy={d} value={location} onChange={setLocation} placeholder="Kiln pier 2, junction box" disabled={busy} />}
          </Field>
          <Field label="Model">
            {(id, d) => <TextInput id={id} describedBy={d} value={model} onChange={setModel} disabled={busy} />}
          </Field>
          <Field label="Read every (ms)" error={errors.pollIntervalMs}>
            {(id, d) => <NumberInput id={id} describedBy={d} value={pollIntervalMs} onChange={setPollIntervalMs} min={1} step={1} placeholder="1000" disabled={busy} />}
          </Field>
          <Field label="Notes" wide>
            {(id, d) => <TextArea id={id} describedBy={d} value={notes} onChange={setNotes} rows={2} disabled={busy} />}
          </Field>
        </FieldGrid>
      </FieldSection>

      <Toggle checked={enabled} onChange={setEnabled} disabled={busy} label="Switched on" description="When off, the rack keeps its channels but shows no live data" />
      {failure && <FormNote tone="bad">{failure}</FormNote>}
    </Dialog>
  );
}
