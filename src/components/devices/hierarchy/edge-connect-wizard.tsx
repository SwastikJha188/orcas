"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, Field, FieldGrid, FormNote, PillButton, Table, TextInput, type Column } from "@/components/ui";
import { useEdge } from "@/providers/edge-context";
import type { ApiResponse } from "@/types/api";
import { FORMAT_FIELD_KEYS, type EdgeBroker, type EdgeFormat, type EdgeGateway, type RawSample, type SourceKind } from "@/types/edge";
import { type EdgeIndex, ago } from "../edge-model";
import { coverFilter, detectFormat } from "./edge-connect-detect";
import { isRegistered } from "./edge-connect-find";
import { CODE_RULE } from "./edge-dialog-parts";
import { filterProblem } from "./edge-gateway-topics";
import { IconPlus } from "./edge-icons";
import { DEFAULT_TOPIC_PREFIX, fmt, plural } from "./edge-tree-model";

/* ==========================================================================
   Connect gateway: type the broker and one or more topics, press Connect.
   The broker is reused when one with that host and port exists, else added;
   a gateway is registered with the topics as its subscriptions, and the
   messages that arrive on them show here straight away. The first message
   names the gateway (gateway_id / gateway_name) and sets its data format, so
   each device becomes a rack / PLC / SCADA and each tag a card under it.
   ========================================================================== */

const POLL_MS = 2000;
const KIND_LABEL: Record<SourceKind, string> = { rack: "Rack", plc: "PLC", scada: "SCADA", dcs: "DCS", analyzer: "Analyzer", other: "Source" };
const SHOWN = 8;
/** Same cap the server applies to a gateway's topics. */
const MAX_TOPICS = 16;

export interface ConnectWizardProps {
  open: boolean;
  ix: EdgeIndex;
  now: number;
  onClose: () => void;
  /** Called once the gateway exists, to select it. */
  onCommissioned: (gatewayId: string) => void;
}

interface BrokerAddress {
  host: string;
  port: number;
  tls: boolean;
}

/** "host", "host:port" or "mqtt(s)://host:port"; plain 1883 unless TLS is asked for. */
function parseBroker(text: string): BrokerAddress | null {
  const m = /^(?:(mqtts?|ssl|tls|tcp):\/\/)?(\[[^\]]+\]|[A-Za-z0-9.-]+)(?::(\d{1,5}))?\/?$/i.exec(text.trim());
  if (!m) return null;
  const scheme = m[1]?.toLowerCase();
  const tlsScheme = scheme === "mqtts" || scheme === "ssl" || scheme === "tls";
  const port = m[3] ? Number(m[3]) : tlsScheme ? 8883 : 1883;
  if (port < 1 || port > 65535) return null;
  return { host: m[2], port, tls: tlsScheme || port === 8883 };
}

const addressOf = (b: EdgeBroker) => `${b.host}:${b.port}`;

/** A gateway id from the topic: the level after the ULTRON prefix, else its fixed levels. */
function codeFor(topic: string, prefix: string): string {
  const parts = topic.split("/");
  const pre = prefix.split("/");
  const next = parts[pre.length];
  if (pre.every((p, i) => parts[i] === p) && next && next !== "+" && next !== "#") return next;
  return (
    parts
      .filter((p) => p && p !== "+" && p !== "#")
      .join("-")
      .slice(0, 60) || "GATEWAY"
  );
}

function preview(payload: string): string {
  try {
    return JSON.stringify(JSON.parse(payload));
  } catch {
    return payload;
  }
}

export function ConnectWizard({ open, ix, now, onClose, onCommissioned }: ConnectWizardProps) {
  const { create, update, remove, refresh } = useEdge();
  const registry = ix.registry;
  const firstBroker = registry.brokers.find((b) => b.enabled) ?? registry.brokers[0];
  const [brokerText, setBrokerText] = useState(firstBroker ? addressOf(firstBroker) : "");
  const [topics, setTopics] = useState<string[]>([""]);
  const [errors, setErrors] = useState<{ broker?: string; topics?: Record<number, string> }>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [gateway, setGateway] = useState<EdgeGateway | null>(null);
  const [samples, setSamples] = useState<RawSample[]>([]);
  /** First message read: "pending", "shaped" (format set) or "raw" (not a reading we can map). */
  const [shape, setShape] = useState<"pending" | "shaped" | "raw">("pending");
  const shaping = useRef(false);

  const broker = gateway?.brokerId ? ix.brokers.get(gateway.brokerId) : undefined;
  const live = broker ? ix.brokerState.get(broker.id) : undefined;
  const typed = topics.map((t) => t.trim()).filter(Boolean);
  const filterKey = gateway ? typed.join("\n") : "";

  // Once connected, show what arrives on the topics.
  useEffect(() => {
    if (!open || !broker || !filterKey) return;
    let alive = true;
    const qs = new URLSearchParams({ brokerId: broker.id });
    for (const f of filterKey.split("\n")) qs.append("filter", f);
    const load = async () => {
      try {
        const res = await fetch(`/api/mqtt/samples?${qs}`, { cache: "no-store" });
        const body = (await res.json()) as ApiResponse<RawSample[]>;
        if (alive && "data" in body) setSamples(body.data);
      } catch {
        /* the next poll retries */
      }
    };
    void load();
    const timer = window.setInterval(load, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [open, broker, filterKey]);

  // First message in: name the gateway from it and read its topics with a matching format.
  useEffect(() => {
    if (!gateway || !broker || shaping.current || samples.length === 0) return;
    shaping.current = true;
    const sample = samples[samples.length - 1];
    const run = async () => {
      const detected = detectFormat(sample.payload);
      if (!detected) return setShape("raw");
      const cover = coverFilter(typed);
      const topic = cover ?? typed[0];
      const extras = cover ? [] : typed.slice(1);
      const same = (f: EdgeFormat) => f.kind === "json" && f.topic === topic && !f.records && FORMAT_FIELD_KEYS.every((k) => f.fields[k] === detected.fields[k]);
      const label = detected.gatewayName ?? detected.gateway ?? gateway.code;
      const format =
        registry.formats.find(same) ??
        (await create("formats", {
          name: `${label} · one reading per message`.slice(0, 120),
          description: `Detected from the first message on ${topic}`,
          kind: "json",
          topic,
          records: "",
          fields: detected.fields,
          timestampFormat: detected.timestampFormat,
          defaults: { rack: "R1", card: "1", channel: "1" },
        }));
      const code = detected.gateway && CODE_RULE.test(detected.gateway) ? detected.gateway : gateway.code;
      const existing = registry.gateways.find((g) => g.id !== gateway.id && g.code === code && (!g.brokerId || g.brokerId === broker.id));
      if (existing) {
        // Already registered: give that gateway these topics and drop the placeholder.
        const next = await update("gateways", existing.id, { brokerId: broker.id, formatId: format.id, topics: [...new Set([...existing.topics, ...extras])] });
        await remove("gateways", gateway.id);
        setGateway(next);
        onCommissioned(next.id);
      } else {
        setGateway(await update("gateways", gateway.id, { code, name: detected.gatewayName ?? code, formatId: format.id, topics: extras }));
      }
      setShape("shaped");
    };
    run().catch((err: Error) => {
      setFailure(err.message);
      setShape("raw");
    });
  }, [gateway, broker, samples, typed, registry, create, update, remove, onCommissioned]);

  // Racks and cards are registered on the server as data names them; pick them up.
  useEffect(() => {
    if (!open || shape !== "shaped") return;
    const timer = window.setInterval(() => void refresh(), 4000);
    return () => window.clearInterval(timer);
  }, [open, shape, refresh]);

  const racks = useMemo(() => {
    if (!gateway || shape !== "shaped") return [];
    const out = new Map<string, Set<string>>();
    for (const m of ix.snapshot?.measurements ?? []) {
      if (m.brokerId !== gateway.brokerId || m.gatewayId !== gateway.code) continue;
      const cards = out.get(m.rackId) ?? new Set<string>();
      cards.add(m.slot);
      out.set(m.rackId, cards);
    }
    return [...out.entries()].map(([code, cards]) => {
      const src = registry.sources.find((x) => x.gatewayId === gateway.id && x.code === code);
      return { code, name: src?.name ?? code, kind: src?.kind ?? null, cards: [...cards].sort() };
    });
  }, [gateway, shape, ix.snapshot, registry.sources]);

  const setTopic = (i: number, v: string) => setTopics((prev) => prev.map((t, j) => (j === i ? v : t)));

  const connect = async () => {
    const address = parseBroker(brokerText);
    const e: typeof errors = {};
    if (!brokerText.trim()) e.broker = "Type the broker address, e.g. 10.14.22.5:1883";
    else if (!address) e.broker = "Host and port only, e.g. 10.14.22.5:1883 or mqtts://broker.local:8883";
    const topicErrors: Record<number, string> = {};
    const seen: string[] = [];
    topics.forEach((raw, i) => {
      const t = raw.trim();
      if (!t) return;
      const problem = filterProblem(t, seen);
      if (problem) topicErrors[i] = problem === "Already subscribed" ? "Listed twice" : problem;
      seen.push(t);
    });
    if (typed.length === 0) topicErrors[0] = "Type a topic, e.g. plant/line1/#";
    if (Object.keys(topicErrors).length) e.topics = topicErrors;
    setErrors(e);
    if (!address || e.topics) return;

    setBusy(true);
    setFailure(null);
    try {
      let b = registry.brokers.find((x) => x.host.toLowerCase() === address.host.toLowerCase() && x.port === address.port);
      if (!b) {
        b = await create("brokers", {
          name: address.host,
          host: address.host,
          port: address.port,
          tls: address.tls,
          protocolVersion: null,
          username: null,
          clientIdPrefix: "ultron-orcas-ingest",
          topicPrefix: DEFAULT_TOPIC_PREFIX,
          qos: 1,
          rejectUnauthorized: true,
          caCert: null,
          allowedCommands: ["PING"],
          enabled: true,
          notes: null,
        });
      } else if (!b.enabled) {
        b = await update("brokers", b.id, { enabled: true });
      }

      const base = codeFor(typed[0], b.topicPrefix || DEFAULT_TOPIC_PREFIX);
      const safe = CODE_RULE.test(base) ? base : "GATEWAY";
      let code = safe;
      for (let n = 2; isRegistered(ix, b.id, code); n += 1) code = `${safe}-${n}`;
      // The ULTRON contract already subscribes to <prefix>/<code>/#; every other topic is added.
      const implied = `${b.topicPrefix || DEFAULT_TOPIC_PREFIX}/${code}/#`;
      const gw = await create("gateways", {
        code,
        name: code,
        brokerId: b.id,
        formatId: null,
        siteNodeId: null,
        location: null,
        ipAddress: null,
        model: null,
        firmware: null,
        enabled: true,
        notes: null,
        topics: typed.filter((t) => t !== implied),
      });
      setGateway(gw);
      onCommissioned(gw.id);
    } catch (err) {
      setFailure((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const shown = samples.slice(0, SHOWN);
  const total = samples.reduce((n, s) => n + (s.count ?? 1), 0);
  const columns: Column<RawSample>[] = [
    {
      key: "payload",
      header: "Message",
      render: (s) => (
        <span className="ast-cell-stack hx-topic-payload">
          <span className="ast-cell-sub hx-topic-from">{s.topic}</span>
          <span className="ast-cell-text hx-topic-preview">{preview(s.payload)}</span>
        </span>
      ),
    },
    { key: "at", header: "Received", width: "110px", render: (s) => <span className="ast-cell-sub ast-num">{ago(s.at, now)}</span> },
  ];

  const status = !gateway
    ? null
    : live?.state !== "connected"
      ? live?.lastError
        ? `Cannot reach ${broker?.host ?? "the broker"}: ${live.lastError}`
        : `Connecting to ${broker ? addressOf(broker) : "the broker"}…`
      : samples.length === 0
        ? "Connected. Waiting for the first message…"
        : `Receiving · ${fmt(total)} ${total === 1 ? "message" : "messages"} on ${fmt(samples.length)} ${samples.length === 1 ? "topic" : "topics"}${
            shape === "pending" ? " · reading the first message…" : ""
          }`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={busy}
      onSubmit={gateway ? onClose : connect}
      width={720}
      title="Connect gateway"
      subtitle={gateway ? `${gateway.code} on ${broker ? addressOf(broker) : "broker"}` : "Broker and topics"}
      footer={
        gateway ? (
          <PillButton type="submit" variant="primary">
            Done
          </PillButton>
        ) : (
          <>
            <PillButton variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </PillButton>
            <PillButton type="submit" variant="primary" disabled={busy}>
              {busy ? "Connecting…" : "Connect"}
            </PillButton>
          </>
        )
      }
    >
      {!gateway ? (
        <FieldGrid>
          <Field label="Broker" required error={errors.broker} hint="Host and port, e.g. 10.14.22.5:1883">
            {(id, d) => <TextInput id={id} describedBy={d} value={brokerText} onChange={setBrokerText} mono placeholder="10.14.22.5:1883" disabled={busy} />}
          </Field>
          <div className="ui-field" data-wide role="group" aria-labelledby="connect-topics-label">
            <span className="ui-field-label" id="connect-topics-label">
              Topics
              <span className="ui-field-req" aria-hidden="true">
                *
              </span>
            </span>
            {topics.map((t, i) => (
              <div key={i} className="dv-topic-row" data-invalid={errors.topics?.[i] ? true : undefined}>
                <TextInput
                  id={`connect-topic-${i}`}
                  describedBy={errors.topics?.[i] ? `connect-topic-${i}-note` : undefined}
                  value={t}
                  onChange={(v) => setTopic(i, v)}
                  mono
                  placeholder={i === 0 ? "plant/line1/#" : "plant/line2/+/data"}
                  disabled={busy}
                />
                {topics.length > 1 && (
                  <PillButton variant="secondary" onClick={() => setTopics((prev) => prev.filter((_, j) => j !== i))} disabled={busy} aria-label={`Remove topic ${i + 1}`}>
                    Remove
                  </PillButton>
                )}
                {errors.topics?.[i] && (
                  <span id={`connect-topic-${i}-note`} className="ui-field-note" role="alert">
                    {errors.topics[i]}
                  </span>
                )}
              </div>
            ))}
            <div className="dv-topic-add">
              <PillButton variant="secondary" icon={<IconPlus size={13} />} onClick={() => setTopics((prev) => [...prev, ""])} disabled={busy || topics.length >= MAX_TOPICS}>
                Add topic
              </PillButton>
              <span className="ui-field-note">+ matches one level, # everything below</span>
            </div>
          </div>
        </FieldGrid>
      ) : (
        <>
          <div className="dv-listening dv-listening-compact" role="status">
            <span className="dv-pulse" aria-hidden="true" />
            <span className="ast-caption">{status}</span>
          </div>
          {shape === "raw" && !failure && (
            <p className="ast-caption">These messages are not one JSON reading each (no device and value keys), so they are kept as raw messages. Pick a data format for the gateway to read them.</p>
          )}
          {racks.length > 0 && (
            <ul className="dv-connect-racks" aria-label="Racks and cards">
              {racks.map((r) => (
                <li key={r.code}>
                  <span className="ast-cell-title">{r.name}</span>
                  <span className="ast-caption ast-num">
                    {r.kind ? `${KIND_LABEL[r.kind]} ` : ""}
                    {r.name !== r.code ? `${r.code} · ` : ""}
                    {plural(r.cards.length, "card")}: {r.cards.join(", ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {shown.length > 0 && <Table className="ast-table" columns={columns} data={shown} keyExtractor={(s) => s.topic} />}
          {live?.lastError && <p className="ast-caption">If the broker needs a user name, password or certificate, add them to {broker?.name} on the MQTT page.</p>}
        </>
      )}
      {failure && <FormNote tone="bad">{failure}</FormNote>}
    </Dialog>
  );
}
