"use client";

import React, { useState } from "react";
import {
  Dialog,
  Field,
  FieldGrid,
  FieldSection,
  FormNote,
  NumberInput,
  PillButton,
  Select,
  TextArea,
  TextInput,
  Toggle,
} from "@/components/ui";
import { useEdge } from "@/providers/edge-context";
import type { EdgeBroker } from "@/types/edge";
import { protocolLabel } from "./mqtt/mqtt-model";

/* ==========================================================================
   Broker dialog: create or edit one MQTT broker in the edge registry.
   Secrets never come back from the server; blank keeps what is stored.
   ========================================================================== */

const DEFAULT_TOPIC_PREFIX = "ultron/v1/gateways";
const DEFAULT_CLIENT_ID_PREFIX = "ultron-orcas-ingest";
const portFor = (tls: boolean) => (tls ? "8883" : "1883");

interface FormState {
  name: string;
  host: string;
  port: string;
  tls: boolean;
  protocol: "auto" | "5" | "4";
  enabled: boolean;
  username: string;
  password: string;
  clearPassword: boolean;
  rejectUnauthorized: boolean;
  caCert: string;
  clientCert: string;
  clientKey: string;
  clearClientCert: boolean;
  topicPrefix: string;
  clientIdPrefix: string;
  qos: "0" | "1";
  allowedCommands: string;
  notes: string;
}

type Errors = Partial<Record<keyof FormState, string>>;

function initial(b: EdgeBroker | null): FormState {
  return {
    name: b?.name ?? "",
    host: b?.host ?? "",
    port: b ? String(b.port) : portFor(true),
    tls: b?.tls ?? true,
    protocol: b?.protocolVersion === 5 ? "5" : b?.protocolVersion === 4 ? "4" : "auto",
    enabled: b?.enabled ?? true,
    username: b?.username ?? "",
    password: "",
    clearPassword: false,
    rejectUnauthorized: b?.rejectUnauthorized ?? true,
    caCert: b?.caCert ?? "",
    clientCert: "",
    clientKey: "",
    clearClientCert: false,
    topicPrefix: b?.topicPrefix ?? DEFAULT_TOPIC_PREFIX,
    clientIdPrefix: b?.clientIdPrefix ?? DEFAULT_CLIENT_ID_PREFIX,
    qos: b?.qos === 0 ? "0" : "1",
    allowedCommands: (b?.allowedCommands ?? ["PING"]).join(", "),
    notes: b?.notes ?? "",
  };
}

function validate(f: FormState, broker: EdgeBroker | null): Errors {
  const e: Errors = {};
  if (!f.name.trim()) e.name = "Enter a name.";
  const host = f.host.trim();
  if (!host) e.host = "Enter a host name or IP address.";
  else if (!/^[A-Za-z0-9.\-:[\]]+$/.test(host)) e.host = "Host name or IP address only, without scheme or port.";
  const port = Number(f.port);
  if (!f.port.trim()) e.port = "Enter a port.";
  else if (!Number.isInteger(port) || port < 1 || port > 65535) e.port = "1 to 65 535.";
  if (/[#+\s]/.test(f.topicPrefix.trim())) e.topicPrefix = "A topic path without spaces or wildcards.";
  if (/[/#+\s]/.test(f.clientIdPrefix.trim())) e.clientIdPrefix = "No spaces, “/”, “#” or “+”.";
  if (f.tls && !f.clearClientCert) {
    const cert = f.clientCert.trim();
    const key = f.clientKey.trim();
    if (cert && !key) e.clientKey = broker?.hasClientCert ? "Paste the key that belongs to the new certificate." : "Paste the matching private key.";
    if (key && !cert) e.clientCert = "Paste the certificate that belongs to this key.";
  }
  return e;
}

function payload(f: FormState, broker: EdgeBroker | null): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: f.name.trim(),
    host: f.host.trim(),
    port: Number(f.port),
    tls: f.tls,
    protocolVersion: f.protocol === "auto" ? null : Number(f.protocol),
    username: f.username.trim() || null,
    clientIdPrefix: f.clientIdPrefix.trim() || DEFAULT_CLIENT_ID_PREFIX,
    topicPrefix: f.topicPrefix.trim().replace(/\/+$/, "") || DEFAULT_TOPIC_PREFIX,
    qos: f.qos === "0" ? 0 : 1,
    rejectUnauthorized: f.rejectUnauthorized,
    caCert: f.caCert.trim() || null,
    allowedCommands: f.allowedCommands
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean),
    enabled: f.enabled,
    notes: f.notes.trim() || null,
  };
  // Secrets: send only what changed. Absent keeps the stored value.
  if (broker?.hasPassword && f.clearPassword) body.password = null;
  else if (f.password) body.password = f.password;
  if (broker?.hasClientCert && f.clearClientCert) {
    body.clientCert = null;
    body.clientKey = null;
  } else if (f.tls && f.clientCert.trim() && f.clientKey.trim()) {
    body.clientCert = f.clientCert.trim();
    body.clientKey = f.clientKey.trim();
  }
  return body;
}

type Note = { tone: "good" | "bad" | "info"; text: string } | null;

export interface BrokerDialogProps {
  /** `null` creates a new broker. */
  broker: EdgeBroker | null;
  /** Registry gateways assigned to this broker (for the delete warning). */
  gatewayCount: number;
  onClose: () => void;
}

/** Mount when opening; unmount to close (state starts fresh each time). */
export function BrokerDialog({ broker, gatewayCount, onClose }: BrokerDialogProps) {
  const { create, update, remove, testBroker } = useEdge();
  const [form, setForm] = useState<FormState>(() => initial(broker));
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState<"save" | "test" | "delete" | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [testNote, setTestNote] = useState<Note>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
    setTestNote(null);
  };

  const setTls = (tls: boolean) =>
    setForm((f) => ({
      ...f,
      tls,
      // Follow the default port unless the user has typed their own.
      port: f.port.trim() === "" || f.port.trim() === portFor(f.tls) ? portFor(tls) : f.port,
    }));

  const check = (): boolean => {
    const e = validate(form, broker);
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (busy || !check()) return;
    setBusy("save");
    setServerError(null);
    try {
      const body = payload(form, broker);
      if (broker) await update("brokers", broker.id, body);
      else await create("brokers", body);
      onClose();
    } catch (err) {
      setServerError((err as Error).message);
      setBusy(null);
    }
  };

  const test = async () => {
    if (busy || !check()) return;
    setBusy("test");
    setTestNote({ tone: "info", text: `Connecting to ${form.host.trim()}:${form.port}…` });
    try {
      const r = await testBroker(payload(form, broker), broker?.id);
      setTestNote(
        r.ok
          ? { tone: "good", text: `Connected in ${r.ms} ms · ${protocolLabel(r.protocolVersion)}` }
          : { tone: "bad", text: `${r.error ?? "Connection refused"} · after ${r.ms} ms` },
      );
    } catch (err) {
      setTestNote({ tone: "bad", text: (err as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const destroy = async () => {
    if (!broker || busy) return;
    setBusy("delete");
    setServerError(null);
    try {
      await remove("brokers", broker.id);
      onClose();
    } catch (err) {
      setServerError((err as Error).message);
      setConfirmDelete(false);
      setBusy(null);
    }
  };

  const footerStart = confirmDelete ? (
    <>
      <span className="mq-confirm" role="alert">
        Delete broker?{" "}
        {gatewayCount > 0
          ? `${gatewayCount} gateway${gatewayCount === 1 ? "" : "s"} become${gatewayCount === 1 ? "s" : ""} unassigned.`
          : "No gateways are assigned to it."}
      </span>
      <PillButton variant="secondary" className="mq-danger" onClick={() => void destroy()} disabled={busy !== null}>
        {busy === "delete" ? "Deleting…" : "Delete"}
      </PillButton>
      <PillButton variant="secondary" onClick={() => setConfirmDelete(false)} disabled={busy !== null}>
        Keep
      </PillButton>
    </>
  ) : (
    <>
      <PillButton variant="secondary" onClick={() => void test()} disabled={busy !== null}>
        {busy === "test" ? "Testing…" : "Test connection"}
      </PillButton>
      {broker && (
        <PillButton variant="secondary" className="mq-danger" onClick={() => setConfirmDelete(true)} disabled={busy !== null}>
          Delete
        </PillButton>
      )}
    </>
  );

  const footer = (
    <>
      <PillButton variant="secondary" onClick={onClose} disabled={busy !== null}>
        Cancel
      </PillButton>
      <PillButton variant="primary" type="submit" disabled={busy !== null}>
        {busy === "save" ? "Saving…" : broker ? "Save" : "Add broker"}
      </PillButton>
    </>
  );

  return (
    <Dialog
      open
      onClose={onClose}
      title={broker ? "Edit broker" : "Add broker"}
      subtitle={broker ? `${broker.name} · ${broker.id}` : "Gateways publish to it; the app subscribes with these settings."}
      width={640}
      onSubmit={() => void save()}
      busy={busy !== null}
      footer={footer}
      footerStart={footerStart}
    >
      <FieldSection title="Connection">
        <FieldGrid>
          <Field label="Name" required error={errors.name} wide>
            {(id, d) => <TextInput id={id} describedBy={d} value={form.name} onChange={(v) => set("name", v)} placeholder="Plant broker" autoFocus />}
          </Field>
          <Field label="Host" required error={errors.host} hint="Host name or IP address">
            {(id, d) => <TextInput id={id} describedBy={d} value={form.host} onChange={(v) => set("host", v)} placeholder="mqtt.plant.local" mono />}
          </Field>
          <Field label="Port" required error={errors.port}>
            {(id, d) => <NumberInput id={id} describedBy={d} value={form.port} onChange={(v) => set("port", v)} min={1} max={65535} step={1} />}
          </Field>
          <Field label="Protocol">
            {(id, d) => (
              <Select
                id={id}
                describedBy={d}
                value={form.protocol}
                onChange={(v) => set("protocol", v as FormState["protocol"])}
                options={[
                  { value: "auto", label: "Auto (5.0 → 3.1.1)" },
                  { value: "5", label: "MQTT 5.0" },
                  { value: "4", label: "MQTT 3.1.1" },
                ]}
              />
            )}
          </Field>
        </FieldGrid>
        <Toggle checked={form.tls} onChange={setTls} label="TLS" description="Encrypt the connection (mqtts)" />
        <Toggle checked={form.enabled} onChange={(v) => set("enabled", v)} label="Enabled" description="The app keeps a connection open and subscribes" />
      </FieldSection>

      <FieldSection title="Authentication">
        <FieldGrid>
          <Field label="Username">
            {(id, d) => <TextInput id={id} describedBy={d} value={form.username} onChange={(v) => set("username", v)} autoComplete="off" />}
          </Field>
          <Field label="Password" hint={broker?.hasPassword && !form.clearPassword ? "Stored. Leave blank to keep it." : undefined}>
            {(id, d) => (
              <TextInput
                id={id}
                describedBy={d}
                type="password"
                value={form.password}
                onChange={(v) => set("password", v)}
                autoComplete="new-password"
                disabled={form.clearPassword}
                placeholder={broker?.hasPassword ? (form.clearPassword ? "Will be cleared" : "Stored — leave blank to keep") : undefined}
              />
            )}
          </Field>
        </FieldGrid>
        {broker?.hasPassword && (
          <Toggle
            checked={form.clearPassword}
            onChange={(v) => setForm((f) => ({ ...f, clearPassword: v, password: v ? "" : f.password }))}
            label="Clear stored password"
            description="Connect without a password"
          />
        )}
      </FieldSection>

      {form.tls && (
        <FieldSection title="TLS">
          <Toggle
            checked={form.rejectUnauthorized}
            onChange={(v) => set("rejectUnauthorized", v)}
            label="Verify server certificate"
            description="Refuse a certificate the CA does not sign or whose name does not match the host"
          />
          <Field label="CA certificate" hint="PEM. Only for a private CA; public CAs are trusted already." wide>
            {(id, d) => (
              <TextArea id={id} describedBy={d} value={form.caCert} onChange={(v) => set("caCert", v)} rows={3} mono placeholder="-----BEGIN CERTIFICATE-----" />
            )}
          </Field>
          {broker?.hasClientCert && (
            <Toggle
              checked={form.clearClientCert}
              onChange={(v) => setForm((f) => ({ ...f, clearClientCert: v, clientCert: v ? "" : f.clientCert, clientKey: v ? "" : f.clientKey }))}
              label="Clear stored client certificate"
              description="A client certificate and key are stored. Leave the fields below blank to keep them."
            />
          )}
          {!form.clearClientCert && (
            <FieldGrid>
              <Field label="Client certificate" hint="PEM, for mutual TLS" error={errors.clientCert}>
                {(id, d) => (
                  <TextArea
                    id={id}
                    describedBy={d}
                    value={form.clientCert}
                    onChange={(v) => set("clientCert", v)}
                    rows={3}
                    mono
                    placeholder={broker?.hasClientCert ? "Stored — leave blank to keep" : "-----BEGIN CERTIFICATE-----"}
                  />
                )}
              </Field>
              <Field label="Client key" hint="PEM, unencrypted" error={errors.clientKey}>
                {(id, d) => (
                  <TextArea
                    id={id}
                    describedBy={d}
                    value={form.clientKey}
                    onChange={(v) => set("clientKey", v)}
                    rows={3}
                    mono
                    placeholder={broker?.hasClientCert ? "Stored — leave blank to keep" : "-----BEGIN PRIVATE KEY-----"}
                  />
                )}
              </Field>
            </FieldGrid>
          )}
        </FieldSection>
      )}

      <FieldSection title="Topics and commands">
        <FieldGrid>
          <Field label="Topic prefix" error={errors.topicPrefix} hint="Root of the gateway tree">
            {(id, d) => <TextInput id={id} describedBy={d} value={form.topicPrefix} onChange={(v) => set("topicPrefix", v)} placeholder={DEFAULT_TOPIC_PREFIX} mono />}
          </Field>
          <Field label="Client ID prefix" error={errors.clientIdPrefix} hint="A random suffix is appended per connection">
            {(id, d) => (
              <TextInput id={id} describedBy={d} value={form.clientIdPrefix} onChange={(v) => set("clientIdPrefix", v)} placeholder={DEFAULT_CLIENT_ID_PREFIX} mono />
            )}
          </Field>
          <Field label="Subscribe QoS">
            {(id, d) => (
              <Select
                id={id}
                describedBy={d}
                value={form.qos}
                onChange={(v) => set("qos", v as FormState["qos"])}
                options={[
                  { value: "1", label: "1 · at least once" },
                  { value: "0", label: "0 · at most once" },
                ]}
              />
            )}
          </Field>
          <Field label="Allowed commands" hint="Comma-separated, e.g. PING">
            {(id, d) => <TextInput id={id} describedBy={d} value={form.allowedCommands} onChange={(v) => set("allowedCommands", v)} mono />}
          </Field>
        </FieldGrid>
      </FieldSection>

      <FieldSection title="Notes">
        <Field label="Notes" wide>
          {(id, d) => <TextArea id={id} describedBy={d} value={form.notes} onChange={(v) => set("notes", v)} rows={2} />}
        </Field>
      </FieldSection>

      {testNote && <FormNote tone={testNote.tone}>{testNote.text}</FormNote>}
      {serverError && <FormNote tone="bad">{serverError}</FormNote>}
    </Dialog>
  );
}
