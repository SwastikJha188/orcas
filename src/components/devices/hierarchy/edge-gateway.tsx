"use client";

import React, { useState } from "react";
import { FormNote, PillButton } from "@/components/ui";
import { StatusTag, type Tone } from "@/components/assets/assets-shell-ui";
import type { EdgeGateway } from "@/types/edge";
import type { BrokerState } from "@/types/mqtt";
import {
  type EdgeIndex,
  LINK_LABEL,
  LINK_TONE,
  ago,
  gatewayLink,
  gatewayPoints,
  liveGateway,
  sitePath,
  sourcesOf,
} from "../edge-model";
import { IconEdit, IconGateway, IconPlus } from "./edge-icons";
import { DetectedSection } from "./edge-channels";
import { GatewayTopics } from "./edge-gateway-topics";
import { detectGateway, formatLabel, pendingFromDetection, subscriptionFor } from "./edge-detect";
import { useEdge } from "@/providers/edge-context";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import type { MapTarget } from "./edge-map-dialog";
import { ContentsHead, Kpi, SourceCard } from "./edge-parts";
import { type Selection, fmt, kindSummary, plural, sortSources } from "./edge-tree-model";

/* ==========================================================================
   Gateway: broker · network · link · site strip, its sources as cards, and
   racks it publishes that are not configured yet.
   ========================================================================== */

export const BROKER_STATE: Record<BrokerState, [Tone, string]> = {
  connected: ["good", "Connected"],
  connecting: ["info", "Connecting"],
  reconnecting: ["warn", "Reconnecting"],
  offline: ["bad", "Offline"],
  disabled: ["idle", "Switched off"],
};

/** Broker chip for a broker id; honest when there is no live status yet. */
export function BrokerTag({ ix, brokerId }: { ix: EdgeIndex; brokerId: string | null }) {
  const broker = brokerId ? ix.brokers.get(brokerId) : undefined;
  if (!broker) return <StatusTag tone="idle" label="No data connection" />;
  const live = ix.brokerState.get(broker.id);
  if (!live) return <StatusTag tone="idle" label={broker.enabled ? "No status" : "Switched off"} />;
  const [tone, label] = BROKER_STATE[live.state];
  return <StatusTag tone={tone} label={label} />;
}

export interface EdgeGatewayViewProps {
  ix: EdgeIndex;
  gw: EdgeGateway;
  now: number;
  sectionNav: React.ReactNode;
  onSelect: (sel: Selection) => void;
  onEdit: () => void;
  onAddSource: (prefill?: { code: string; name: string }) => void;
  onMap: (t: MapTarget) => void;
}

export function EdgeGatewayView({ ix, gw, now, sectionNav, onSelect, onEdit, onAddSource, onMap }: EdgeGatewayViewProps) {
  const { commission } = useEdge();
  const [adding, setAdding] = useState(false);
  const [addNote, setAddNote] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const link = gatewayLink(ix, gw);
  const live = liveGateway(ix, gw);
  const broker = gw.brokerId ? ix.brokers.get(gw.brokerId) : undefined;
  const brokerLive = broker ? ix.brokerState.get(broker.id) : undefined;
  const sources = sortSources(sourcesOf(ix, gw.id));
  const points = gatewayPoints(ix, gw.id);
  const detection = detectGateway(ix, gw);
  const subscription = subscriptionFor(ix, gw);
  const pending = pendingFromDetection(detection);

  // Registers every rack and card the data shows that the registry lacks.
  const addDetected = async () => {
    setAdding(true);
    setAddNote(null);
    try {
      const res = await commission({ gatewayId: gw.id, sources: pending });
      setAddNote({ tone: "good", text: `Added ${plural(res.sourcesCreated, "device")} · ${plural(res.cardsCreated, "sensor card")}${res.skipped ? ` · ${res.skipped} already registered` : ""}` });
    } catch (err) {
      setAddNote({ tone: "bad", text: (err as Error).message });
    } finally {
      setAdding(false);
    }
  };
  const site = sitePath(ix.registry, gw.siteNodeId);
  const siteZone = useSiteTimeZone({ nodeId: gw.siteNodeId });

  return (
    <>
      <ContentsHead
        crumbs={[{ label: "Devices" }, { label: "Data collectors", onClick: () => onSelect({ type: "network" }) }, { label: gw.code }]}
        title={gw.name}
        badge={
          <>
            <IconGateway size={12} />
            Data collector
          </>
        }
        status={<StatusTag tone={LINK_TONE[link.status]} label={LINK_LABEL[link.status]} />}
        actions={
          <>
            <PillButton variant="secondary" icon={<IconEdit size={13} />} onClick={onEdit}>
              Edit data collector
            </PillButton>
            <PillButton variant="primary" icon={<IconPlus size={13} />} onClick={() => onAddSource()}>
              Add device
            </PillButton>
          </>
        }
        sectionNav={sectionNav}
      />

      <section className="ast-kpis" aria-label="Data collector status">
        <Kpi label="Data connection" value={broker ? broker.name : "Not linked"} aside={<BrokerTag ix={ix} brokerId={gw.brokerId} />}>
          <span className="ast-caption ast-num">{broker ? brokerLive?.host ?? `${broker.host}:${broker.port}` : "Link a data connection (MQTT broker) so its messages are read"}</span>
          {broker && <span className="ast-caption">{broker.tls ? "TLS" : "Plain TCP"}{brokerLive?.protocolVersion ? ` · MQTT ${brokerLive.protocolVersion === 5 ? "5" : "3.1.1"}` : ""}</span>}
        </Kpi>
        <Kpi label="Network" value={gw.ipAddress ?? live?.ip ?? "No IP address"}>
          <span className="ast-caption">{formatLabel(ix, gw.formatId)}</span>
          <code className="dv-code">{subscription}</code>
        </Kpi>
        <Kpi label="Connection" value={LINK_LABEL[link.status]} tone={link.status === "waiting" || link.status === "disabled" ? undefined : LINK_TONE[link.status]}>
          {live ? (
            <>
              <span className="ast-caption ast-num">Last seen {ago(live.lastSeenAt, now)} · seq {fmt(live.lastSequence)}</span>
              <span className="ast-caption ast-num">
                {fmt(live.sequenceGaps)} lost · {fmt(live.replayed)} replayed · {fmt(live.messages)} msgs
              </span>
            </>
          ) : (
            <span className="ast-caption">{link.reason ?? "Nothing sent yet"}</span>
          )}
        </Kpi>
        <Kpi label="Site" value={site ?? "No site"}>
          <span className="ast-caption">{gw.location ?? "No location"}</span>
          <span className="ast-caption ast-num">{siteZone.fallback ? `No plant time zone · ${siteZone.label}` : `Plant time ${siteZone.label}`}</span>
          <span className="ast-caption">{[gw.model, gw.firmware].filter(Boolean).join(" · ") || "Model and firmware not set"}</span>
        </Kpi>
      </section>

      <section className="hx-section" aria-label="Devices">
        <h2 className="ast-section-label">
          Devices
          <span>
            {sources.length === 0 ? "0" : `${kindSummary(sources)} · ${plural(points.length, "reading point")}`}
          </span>
        </h2>
        {sources.length === 0 ? (
          <div className="ast-card ast-empty">
            <strong className="hx-empty-title">No devices</strong>
            Add the sensor racks, controllers (PLC), SCADA or DCS systems this data collector reads. The device code is the code it sends its data under.
            <PillButton variant="secondary" icon={<IconPlus size={13} />} onClick={() => onAddSource()}>
              Add device
            </PillButton>
          </div>
        ) : (
          <div className="hx-grid">
            {sources.map((s) => (
              <SourceCard key={s.id} ix={ix} src={s} now={now} onOpen={() => onSelect({ type: "source", id: s.id })} />
            ))}
          </div>
        )}
      </section>

      <GatewayTopics ix={ix} gw={gw} subscription={subscription} now={now} />

      <DetectedSection
        ix={ix}
        gw={gw}
        detection={detection}
        subscription={subscription}
        now={now}
        onRegister={(rackId) => onAddSource({ code: rackId, name: `${rackId} DAQ rack` })}
        onMap={onMap}
        onOpenSource={(id) => onSelect({ type: "source", id })}
        onOpenCard={(sourceId, card) => onSelect({ type: "card", sourceId, card })}
        pending={{ sources: pending.filter((p) => !sources.some((s) => s.code === p.code)).length, cards: pending.reduce((n, p) => n + p.cards.length, 0) }}
        onAddDetected={addDetected}
        adding={adding}
        addNote={addNote && <FormNote tone={addNote.tone}>{addNote.text}</FormNote>}
      />
    </>
  );
}
