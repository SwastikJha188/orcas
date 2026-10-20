"use client";

import React, { useState } from "react";
import { Dialog, Field, FieldGrid, FieldSection, FormNote, PillButton, Select, TextArea, TextInput, Toggle } from "@/components/ui";
import { useEdge } from "@/providers/edge-context";
import type { EdgeGateway } from "@/types/edge";
import { ULTRON_FORMAT, ULTRON_FORMAT_ID } from "@/lib/edge-format";
import { type EdgeIndex, gatewayPoints, sourcesOf } from "../edge-model";
import { subscriptionFor } from "./edge-detect";
import { GatewaySetup } from "./edge-gateway-setup";
import { CODE_RULE, CODE_RULE_TEXT, DeleteConfirm, str, textOrNull } from "./edge-dialog-parts";
import { type Selection, plural, siteOptions } from "./edge-tree-model";

/* ==========================================================================
   Add / edit gateway. Registering a discovered gateway prefills its code,
   broker and IP and can add the racks it reports as sources in one go.
   ========================================================================== */

export interface GatewayPrefill {
  code?: string;
  brokerId?: string | null;
  ipAddress?: string | null;
  siteNodeId?: string | null;
  /** Rack ids the gateway reports, offered as sources. */
  racks?: string[];
}

export interface GatewayDialogProps {
  open: boolean;
  ix: EdgeIndex;
  gateway?: EdgeGateway;
  prefill?: GatewayPrefill;
  onClose: () => void;
  onSaved: (sel: Selection) => void;
}

type Errors = Partial<Record<"code" | "name", string>>;

export function GatewayDialog({ open, ix, gateway, prefill, onClose, onSaved }: GatewayDialogProps) {
  const { create, update, remove, snapshot } = useEdge();
  const registry = ix.registry;
  const editing = Boolean(gateway);
  const onlyBroker = registry.brokers.length === 1 ? registry.brokers[0].id : "";

  const [code, setCode] = useState(gateway?.code ?? prefill?.code ?? "");
  const [name, setName] = useState(gateway?.name ?? (prefill?.code ? `${prefill.code} edge gateway` : ""));
  const [brokerId, setBrokerId] = useState(str(gateway ? gateway.brokerId : prefill?.brokerId ?? onlyBroker));
  const [formatId, setFormatId] = useState(gateway?.formatId ?? ULTRON_FORMAT_ID);
  const [siteNodeId, setSiteNodeId] = useState(str(gateway?.siteNodeId ?? prefill?.siteNodeId));
  const [location, setLocation] = useState(str(gateway?.location));
  const [ipAddress, setIpAddress] = useState(str(gateway?.ipAddress ?? prefill?.ipAddress));
  const [model, setModel] = useState(str(gateway?.model));
  const [firmware, setFirmware] = useState(str(gateway?.firmware));
  const [enabled, setEnabled] = useState(gateway?.enabled ?? true);
  const [notes, setNotes] = useState(str(gateway?.notes));
  const racks = prefill?.racks ?? [];
  const [withRacks, setWithRacks] = useState(racks.length > 0);

  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  // Set when the gateway saved but some racks did not: the dialog stays to say which.
  const [partial, setPartial] = useState<{ id: string; text: string } | null>(null);

  const validate = (): boolean => {
    const e: Errors = {};
    if (!code.trim()) e.code = "Gateway ID is required";
    else if (!CODE_RULE.test(code.trim())) e.code = CODE_RULE_TEXT;
    if (!name.trim()) e.name = "Name is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (partial) {
      onSaved({ type: "gateway", id: partial.id });
      return;
    }
    if (!validate()) return;
    setBusy(true);
    setFailure(null);
    const body = {
      code: code.trim(),
      name: name.trim(),
      brokerId: brokerId || null,
      // The built-in contract is stored as null.
      formatId: formatId === ULTRON_FORMAT_ID ? null : formatId,
      siteNodeId: siteNodeId || null,
      location: textOrNull(location),
      ipAddress: textOrNull(ipAddress),
      model: textOrNull(model),
      firmware: textOrNull(firmware),
      enabled,
      notes: textOrNull(notes),
    };
    try {
      const saved = gateway ? await update("gateways", gateway.id, body) : await create("gateways", body);
      if (!gateway && withRacks && racks.length > 0) {
        const failed: string[] = [];
        for (const rack of racks) {
          try {
            await create("sources", { gatewayId: saved.id, code: rack, name: `${rack} DAQ rack`, kind: "rack", protocol: "Backplane", enabled: true });
          } catch (err) {
            failed.push(`${rack}: ${(err as Error).message}`);
          }
        }
        if (failed.length > 0) {
          setPartial({ id: saved.id, text: `Data collector registered. Not added: ${failed.join("; ")}` });
          setBusy(false);
          return;
        }
      }
      onSaved({ type: "gateway", id: saved.id });
    } catch (err) {
      setFailure((err as Error).message);
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!gateway) return;
    setBusy(true);
    setFailure(null);
    try {
      await remove("gateways", gateway.id);
      onSaved({ type: "network" });
    } catch (err) {
      setFailure((err as Error).message);
      setBusy(false);
    }
  };

  // Built-in formats first, then the plant's own, by name.
  const formats = [...registry.formats].sort((a, b) => Number(b.builtIn) - Number(a.builtIn) || a.name.localeCompare(b.name));
  if (!formats.some((f) => f.id === ULTRON_FORMAT_ID)) formats.unshift(ULTRON_FORMAT);
  const formatOptions = formats.map((f) => ({ value: f.id, label: f.builtIn ? `${f.name} (built-in)` : f.name }));
  const broker = registry.brokers.find((b) => b.id === brokerId) ?? null;
  const brokerStatus = snapshot?.brokers.find((b) => b.brokerId === brokerId) ?? null;
  const format = formatId === ULTRON_FORMAT_ID ? null : registry.formats.find((f) => f.id === formatId) ?? null;
  const rackIds = gateway ? sourcesOf(ix, gateway.id).map((s) => s.code) : racks;
  const subscription = subscriptionFor(ix, { code, brokerId: brokerId || null, formatId: formatId === ULTRON_FORMAT_ID ? null : formatId });

  const nSources = gateway ? sourcesOf(ix, gateway.id).length : 0;
  const nPoints = gateway ? gatewayPoints(ix, gateway.id).length : 0;
  const question =
    nSources === 0 ? "Delete this data collector?" : `Delete this data collector and its ${plural(nSources, "device")}${nPoints ? `, ${plural(nPoints, "reading point")}` : ""}?`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={busy}
      onSubmit={submit}
      width={620}
      title={editing ? "Edit data collector" : prefill?.code ? "Register data collector" : "Add data collector"}
      subtitle={
        editing
          ? `${gateway!.name} · ${gateway!.code}`
          : "Registers a gateway so ULTRON recognises its data. The gateway connects to the broker itself, with the settings below."
      }
      footerStart={editing && !partial ? <DeleteConfirm label="Delete data collector" question={question} onDelete={doDelete} disabled={busy} /> : undefined}
      footer={
        partial ? (
          <PillButton type="submit" variant="primary">
            Done
          </PillButton>
        ) : (
          <>
            <PillButton variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </PillButton>
            <PillButton type="submit" variant="primary" disabled={busy}>
              {busy ? "Saving…" : editing ? "Save" : prefill?.code ? "Register" : "Add data collector"}
            </PillButton>
          </>
        )
      }
    >
      <FieldSection title="Identity">
        <FieldGrid>
          <Field label="Data collector ID" required error={errors.code} hint="GATEWAY_ID set on the data collector; also its user name on the message server">
            {(id, d) => <TextInput id={id} describedBy={d} value={code} onChange={setCode} mono placeholder="ULTRON-EDGE-01" autoFocus={!editing} disabled={busy} />}
          </Field>
          <Field label="Name" required error={errors.name}>
            {(id, d) => <TextInput id={id} describedBy={d} value={name} onChange={setName} placeholder="Kiln line edge gateway" disabled={busy} />}
          </Field>
          <Field label="Site">
            {(id, d) => <Select id={id} describedBy={d} value={siteNodeId} onChange={setSiteNodeId} disabled={busy} options={[{ value: "", label: "No site" }, ...siteOptions(registry)]} />}
          </Field>
        </FieldGrid>
      </FieldSection>

      <FieldSection title="Connection">
        <FieldGrid>
          <Field label="Data connection (MQTT broker)" hint={registry.brokers.length === 0 ? "Add a data connection under Data connections first" : "The message server this data collector sends to"}>
            {(id, d) => (
              <Select
                id={id}
                describedBy={d}
                value={brokerId}
                onChange={setBrokerId}
                disabled={busy}
                options={[{ value: "", label: "Not linked" }, ...registry.brokers.map((b) => ({ value: b.id, label: `${b.name}${b.enabled ? "" : " (switched off)"}` }))]}
              />
            )}
          </Field>
          <Field label="Message format" hint="How this data collector's channels and messages are read">
            {(id, d) => <Select id={id} describedBy={d} value={formatId} onChange={setFormatId} disabled={busy} options={formatOptions} />}
          </Field>
          <Field label="ULTRON listens on" wide>
            {(id, d) => (
              <output id={id} aria-describedby={d} className="dv-sub-preview ast-num">
                {subscription}
              </output>
            )}
          </Field>
        </FieldGrid>
      </FieldSection>

      <FieldSection title="Settings for the data collector">
        <GatewaySetup code={code} ipAddress={ipAddress} broker={broker} brokerStatus={brokerStatus} format={format} rackIds={rackIds} />
      </FieldSection>

      <FieldSection title="Hardware">
        <FieldGrid>
          <Field label="IP address">
            {(id, d) => <TextInput id={id} describedBy={d} value={ipAddress} onChange={setIpAddress} mono placeholder="10.14.22.80" disabled={busy} />}
          </Field>
          <Field label="Location">
            {(id, d) => <TextInput id={id} describedBy={d} value={location} onChange={setLocation} placeholder="MCC room, cabinet 3" disabled={busy} />}
          </Field>
          <Field label="Model">
            {(id, d) => <TextInput id={id} describedBy={d} value={model} onChange={setModel} disabled={busy} />}
          </Field>
          <Field label="Firmware">
            {(id, d) => <TextInput id={id} describedBy={d} value={firmware} onChange={setFirmware} disabled={busy} />}
          </Field>
          <Field label="Notes" wide>
            {(id, d) => <TextArea id={id} describedBy={d} value={notes} onChange={setNotes} rows={2} disabled={busy} />}
          </Field>
        </FieldGrid>
      </FieldSection>

      <Toggle checked={enabled} onChange={setEnabled} disabled={busy} label="Switched on" description="When off, the data collector is kept but its messages are not shown as live" />
      {!editing && racks.length > 0 && (
        <Toggle
          checked={withRacks}
          onChange={setWithRacks}
          disabled={busy || Boolean(partial)}
          label={`Also register its ${plural(racks.length, "rack")} as devices`}
          description={`${racks.join(", ")} · kind DAQ rack, protocol Backplane`}
        />
      )}

      {failure && <FormNote tone="bad">{failure}</FormNote>}
      {partial && <FormNote tone="warn">{partial.text}</FormNote>}
    </Dialog>
  );
}
