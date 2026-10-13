"use client";

import React from "react";
import { PillButton, Table, type Column } from "@/components/ui";
import { StatusTag } from "@/components/assets/assets-shell-ui";
import type { MqttRack } from "@/types/mqtt";
import { type DiscoveredGateway, type EdgeIndex, LINK_LABEL, LINK_TONE, type LinkStatus, ago } from "../edge-model";
import { IconGateway, IconPlus, IconRack } from "./edge-icons";
import { BrokerTag } from "./edge-gateway";
import { ContentsHead, Kpi } from "./edge-parts";
import { type Selection, fmt, plural } from "./edge-tree-model";
import { subscriptionFor } from "./edge-detect";

/* ==========================================================================
   Discovered gateway: publishing to a broker but not in the registry. Shows
   what the broker reports and offers to register it (and its racks).
   ========================================================================== */

const fromLive = (s: MqttRack["state"]): LinkStatus => (s === "ONLINE" ? "online" : s === "STALE" ? "stale" : "offline");

export interface EdgeDiscoveredViewProps {
  ix: EdgeIndex;
  found: DiscoveredGateway;
  now: number;
  sectionNav: React.ReactNode;
  onSelect: (sel: Selection) => void;
  onRegister: () => void;
}

export function EdgeDiscoveredView({ ix, found, now, sectionNav, onSelect, onRegister }: EdgeDiscoveredViewProps) {
  const broker = ix.brokers.get(found.brokerId);
  const live = ix.snapshot?.gateways.find((g) => g.brokerId === found.brokerId && g.gatewayId === found.gatewayId);
  const racks = (ix.snapshot?.racks ?? []).filter((r) => r.brokerId === found.brokerId && r.gatewayId === found.gatewayId);
  const state = fromLive(found.state);

  const columns: Column<MqttRack>[] = [
    {
      key: "rack",
      header: "Rack ID",
      render: (r) => (
        <span className="dv-lead">
          <span className="ast-badge">
            <IconRack size={14} />
          </span>
          <span className="ast-cell-title">{r.rackId}</span>
        </span>
      ),
    },
    { key: "slots", header: "Slots", render: (r) => <span className="ast-num">{r.slotCount}</span> },
    { key: "status", header: "Reported status", render: (r) => <span className="ast-cell-text">{r.status}</span> },
    { key: "state", header: "Link", render: (r) => <StatusTag tone={LINK_TONE[fromLive(r.state)]} label={LINK_LABEL[fromLive(r.state)]} /> },
    { key: "seen", header: "Last seen", render: (r) => <span className="ast-num ast-muted">{ago(r.lastSeenAt, now)}</span> },
  ];

  return (
    <>
      <ContentsHead
        crumbs={[{ label: "Devices" }, { label: "Edge network", onClick: () => onSelect({ type: "network" }) }, { label: "Discovered" }]}
        title={found.gatewayId}
        badge={
          <>
            <IconGateway size={12} />
            Discovered gateway
          </>
        }
        status={<StatusTag tone="info" label="Not registered" />}
        actions={
          <PillButton variant="primary" icon={<IconPlus size={13} />} onClick={onRegister}>
            Register gateway
          </PillButton>
        }
        sectionNav={sectionNav}
      />

      <section className="ast-kpis" aria-label="Discovered gateway status">
        <Kpi label="Broker" value={broker?.name ?? found.brokerId} aside={<BrokerTag ix={ix} brokerId={found.brokerId} />}>
          <span className="ast-caption ast-num">{broker ? `${broker.host}:${broker.port}` : "Broker not in the registry"}</span>
        </Kpi>
        <Kpi label="Network" value={found.ip || "No IP reported"}>
          <span className="ast-caption">Topic</span>
          <code className="dv-code">{subscriptionFor(ix, { code: found.gatewayId, brokerId: found.brokerId, formatId: null })}</code>
        </Kpi>
        <Kpi label="Link" value={LINK_LABEL[state]} tone={LINK_TONE[state]}>
          <span className="ast-caption ast-num">Last seen {ago(found.lastSeenAt, now)}</span>
          {live && (
            <span className="ast-caption ast-num">
              seq {fmt(live.lastSequence)} · {fmt(live.messages)} msgs
            </span>
          )}
        </Kpi>
      </section>

      <section className="ast-card pg-table-card" aria-label="Racks reported">
        <div className="ast-card-head">
          <h2 className="ast-card-title">
            Racks reported <span className="ast-caption ast-num">{plural(racks.length, "rack")}</span>
          </h2>
        </div>
        {racks.length === 0 ? (
          <div className="ast-empty">
            <strong className="hx-empty-title">No racks reported</strong>
            The gateway has announced itself but published no rack status yet.
          </div>
        ) : (
          <Table className="ast-table" columns={columns} data={racks} keyExtractor={(r) => r.rackId} />
        )}
      </section>
    </>
  );
}
