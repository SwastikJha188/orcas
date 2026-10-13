"use client";

import React, { useState } from "react";
import { FormNote, PillButton } from "@/components/ui";
import { templateFilter } from "@/lib/edge-format";
import type { EdgeBroker, EdgeFormat } from "@/types/edge";
import type { BrokerStatus } from "@/types/mqtt";

/* ==========================================================================
   How a gateway reaches ULTRON. Nothing here connects anything: the gateway
   opens its own MQTT connection with its own settings (gateway.env on the
   ULTRON gateway), and ULTRON subscribes to the same broker separately.

     gateway ──publish──▶ broker ◀──subscribe── ULTRON (Devices › MQTT)

   This panel writes out the settings the gateway needs so both sides meet.
   ========================================================================== */

const LOOPBACK = /^(127\.|localhost$|::1$)/i;

export interface GatewaySetupProps {
  code: string;
  ipAddress: string;
  broker: EdgeBroker | null;
  brokerStatus: BrokerStatus | null;
  /** null = the ULTRON contract. */
  format: EdgeFormat | null;
  /** Source codes already registered, used as RACK_IDS. */
  rackIds: string[];
}

/** Connection state of ULTRON's own side, as a note; null when all is well. */
export function brokerNote(broker: EdgeBroker | null, status: BrokerStatus | null): { tone: "warn" | "bad" | "info"; text: string } | null {
  if (!broker) return { tone: "warn", text: "No broker selected: ULTRON will not receive anything from this gateway." };
  if (!broker.enabled) return { tone: "warn", text: `ULTRON is not listening on ${broker.name}: the broker is disabled. Enable it on the MQTT page.` };
  if (status && status.state !== "connected") {
    return { tone: "bad", text: `ULTRON cannot reach ${broker.name} (${status.state})${status.lastError ? `: ${status.lastError}` : ""}.` };
  }
  return null;
}

export function GatewaySetup({ code, ipAddress, broker, brokerStatus, format, rackIds }: GatewaySetupProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const id = code.trim() || "<gateway id>";

  if (!broker) {
    return <p className="dv-setup-lead">Choose a broker to see the settings the gateway needs.</p>;
  }

  const prefix = broker.topicPrefix.replace(/\/+$/, "");
  const ultron = format === null || format.kind === "ultron-v2";
  const loopback = LOOPBACK.test(broker.host);
  const host = loopback ? "<this server's LAN address>" : broker.host;

  const env = [
    `GATEWAY_ID=${id}`,
    `RACK_IDS=${rackIds.length ? rackIds.join(",") : "Rack-A"}`,
    `GATEWAY_IP=${ipAddress.trim() || "<gateway LAN IPv4>"}`,
    `MQTT_HOST=${host}`,
    `MQTT_PORT=${broker.port}`,
    `MQTT_USE_TLS=${broker.tls ? 1 : 0}`,
    `MQTT_USERNAME=${id}`,
    "MQTT_PASSWORD=<this gateway's broker password>",
    ...(broker.caCert ? ["MQTT_CA_CERT=/etc/ultron-gateway/certs/ca.pem"] : []),
  ].join("\n");

  // One broker user per gateway, username = gateway id; the ACL scopes it to its own branch.
  const acl = ultron
    ? [`publish    ${prefix}/${id}/#`, `subscribe  ${prefix}/${id}/racks/+/commands/request`].join("\n")
    : `publish    ${format ? templateFilter(format.topic, code.trim() || null) : ""}`;

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  };

  const note = brokerNote(broker, brokerStatus);

  return (
    <div className="dv-setup">
      <ol className="dv-setup-flow" aria-label="Connection path">
        <li>
          <span className="dv-setup-k">Gateway</span>
          <span className="dv-setup-v ast-num">{id}</span>
          <span className="dv-setup-s">publishes</span>
        </li>
        <li>
          <span className="dv-setup-k">Broker</span>
          <span className="dv-setup-v ast-num">
            {broker.tls ? "mqtts" : "mqtt"}://{broker.host}:{broker.port}
          </span>
          <span className="dv-setup-s">{broker.name}</span>
        </li>
        <li>
          <span className="dv-setup-k">ULTRON</span>
          <span className="dv-setup-v">{brokerStatus?.state === "connected" ? "Subscribed" : broker.enabled ? "Not connected" : "Broker disabled"}</span>
          <span className="dv-setup-s">subscribes</span>
        </li>
      </ol>

      {note && <FormNote tone={note.tone}>{note.text}</FormNote>}

      {ultron ? (
        <>
          <div className="dv-setup-block">
            <div className="dv-setup-head">
              <span>On the gateway · /etc/ultron-gateway/gateway.env</span>
              <PillButton variant="secondary" className="dv-setup-copy" onClick={() => void copy("env", env)}>
                {copied === "env" ? "Copied" : "Copy"}
              </PillButton>
            </div>
            <pre className="dv-setup-code">{env}</pre>
            <span className="dv-setup-foot">
              Then <code>sudo systemctl restart ultron-gateway</code>. Racks, cards and channels appear here from its data.
              {loopback && " The broker address is local to this server; the gateway must use an address it can reach."}
            </span>
          </div>
          <div className="dv-setup-block">
            <div className="dv-setup-head">
              <span>On the broker · user “{id}” with this ACL</span>
              <PillButton variant="secondary" className="dv-setup-copy" onClick={() => void copy("acl", acl)}>
                {copied === "acl" ? "Copied" : "Copy"}
              </PillButton>
            </div>
            <pre className="dv-setup-code">{acl}</pre>
          </div>
        </>
      ) : (
        <div className="dv-setup-block">
          <div className="dv-setup-head">
            <span>Point the gateway at the broker and publish to</span>
            <PillButton variant="secondary" className="dv-setup-copy" onClick={() => void copy("acl", acl)}>
              {copied === "acl" ? "Copied" : "Copy"}
            </PillButton>
          </div>
          <pre className="dv-setup-code">
            {`host   ${host}:${broker.port}${broker.tls ? " (TLS)" : ""}\ntopic  ${format ? templateFilter(format.topic, code.trim() || null) : ""}`}
          </pre>
          <span className="dv-setup-foot">Payloads are read with the “{format?.name}” format (Devices › Data formats).</span>
        </div>
      )}
    </div>
  );
}
