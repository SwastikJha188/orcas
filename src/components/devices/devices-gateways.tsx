"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { PillButton, Table, type Column, Loading } from "@/components/ui";
import { StatusTag } from "@/components/assets/assets-shell-ui";
import { ULTRON_FORMAT_ID } from "@shared/lib/edge-format";
import type { EdgeBroker, EdgeGateway, EdgeSource } from "@shared/types/edge";
import { type DiscoveredGateway, type EdgeIndex, LINK_LABEL, LINK_TONE, ago, gatewayLink, liveGateway, sitePath } from "./edge-model";
import { type Detection, formatLabel, subscriptionFor } from "./hierarchy/edge-detect";
import { IconEdit, IconPlus, SourceKindIcon } from "./hierarchy/edge-icons";
import { type ChannelRow, type RackRow, type Signals, rackChannels, rackRow } from "./devices-rows";
import { ChannelActions, PositionCell, SensorCell, Stack, StatusCell, ValueCell } from "./devices-cells";

/* ==========================================================================
   Devices › Gateways: one gateway at a time (picked in the bar above).
     Gateway   status, data connection, topic, message format, network, site
     Racks     every rack it has or sends (DAQ rack · PLC · SCADA · DCS …)
     Channels  the chosen rack's cards and channels, and the machine sensor
               each one feeds
   ========================================================================== */

export interface GatewayBodyProps {
  ix: EdgeIndex;
  /** The first live snapshot has not arrived: what the gateway sends is not known yet. */
  connecting?: boolean;
  gw: EdgeGateway;
  detection: Detection | undefined;
  rackId: string | null;
  /** Channel picked in the tree: its row is marked and scrolled into view. */
  channelKey?: string | null;
  now: number;
  signals: Signals;
  onRack: (rackId: string) => void;
  onBroker: (broker: EdgeBroker | null) => void;
  onEditGateway: () => void;
  onFormat: () => void;
  onAddRack: (code?: string) => void;
  onEditRack: (src: EdgeSource) => void;
  onAddChannel: (src: EdgeSource) => void;
  onLink: (r: ChannelRow) => void;
  onEditPoint: (r: ChannelRow) => void;
}

function Fact({ label, children, sub, action }: { label: string; children: React.ReactNode; sub?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="dvp-fact">
      <dt>{label}</dt>
      <dd>
        <span className="dvp-fact-value">
          {children}
          {action}
        </span>
        {sub && <span className="dvp-fact-sub">{sub}</span>}
      </dd>
    </div>
  );
}

function TextButton({ onClick, children, label }: { onClick: () => void; children: React.ReactNode; label?: string }) {
  return (
    <button type="button" className="dvp-link" onClick={onClick} aria-label={label}>
      {children}
    </button>
  );
}

export function GatewayBody(props: GatewayBodyProps) {
  const { ix, gw, detection, rackId, now, signals } = props;
  const link = gatewayLink(ix, gw);
  const live = liveGateway(ix, gw);
  const broker = gw.brokerId ? (ix.brokers.get(gw.brokerId) ?? null) : null;
  const site = sitePath(ix.registry, gw.siteNodeId);
  const builtIn = !gw.formatId || gw.formatId === ULTRON_FORMAT_ID;

  const racks = useMemo(() => (detection?.racks ?? []).map((r) => rackRow(ix, gw, r)), [ix, gw, detection]);
  const rack = racks.find((r) => r.rack.rackId === rackId) ?? racks[0] ?? null;
  const channels = useMemo(() => (rack ? rackChannels(gw, rack.rack, signals) : []), [gw, rack, signals]);
  const linked = channels.filter((c) => c.tag).length;
  const channelsRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (props.channelKey) channelsRef.current?.querySelector("tbody tr.active")?.scrollIntoView({ block: "nearest" });
  }, [props.channelKey]);

  const rackColumns = useMemo<Column<RackRow>[]>(
    () => [
      {
        key: "rack",
        header: "Rack",
        render: (r) => (
          <span className="pg-cfg-lead">
            <span className="ast-badge">{r.rack.source ? <SourceKindIcon kind={r.rack.source.kind} size={14} /> : <IconPlus size={13} />}</span>
            <Stack mono title={r.rack.rackId} sub={r.rack.source?.name ?? undefined} />
          </span>
        ),
      },
      { key: "kind", header: "Type", width: "96px", render: (r) => <span className="ast-cell-text">{r.kind}</span> },
      {
        key: "conn",
        header: "How it connects",
        width: "176px",
        render: (r) =>
          r.rack.source ? <Stack title={r.rack.source.protocol} sub={r.rack.source.endpoint ?? "No address recorded"} /> : <span className="ast-muted">—</span>,
      },
      {
        key: "machine",
        header: "Machine",
        render: (r) => (r.machineId ? <Stack title={r.machine ?? r.machineId} sub={<span className="ast-num">{r.machineId}</span>} /> : <span className="ast-muted">Not linked</span>),
      },
      {
        key: "channels",
        header: "Linked to a machine",
        width: "104px",
        render: (r) => (
          <span className="ast-num">
            {r.linked}
            <span className="ast-muted"> of {r.channels}</span>
          </span>
        ),
      },
      { key: "status", header: "Status", width: "104px", render: (r) => <StatusTag tone={r.tone} label={r.status} title={r.reason ?? undefined} /> },
      { key: "seen", header: "Last reading", width: "104px", render: (r) => <span className="ast-num ast-muted">{ago(r.lastSeenAt, now)}</span> },
      {
        key: "act",
        header: "",
        width: "1%",
        render: (r) => (
          <span className="dvp-actions">
            {r.rack.source ? (
              <button
                type="button"
                className="ast-icon-btn dvp-reveal"
                aria-label={`Edit rack ${r.rack.rackId}`}
                title="Edit rack"
                onClick={(e) => {
                  e.stopPropagation();
                  props.onEditRack(r.rack.source!);
                }}
              >
                <IconEdit size={14} />
              </button>
            ) : (
              <button
                type="button"
                className="dvp-link"
                onClick={(e) => {
                  e.stopPropagation();
                  props.onAddRack(r.rack.rackId);
                }}
              >
                Add rack
              </button>
            )}
          </span>
        ),
      },
    ],
    [now, props],
  );

  const channelColumns = useMemo<Column<ChannelRow>[]>(
    () => [
      { key: "pos", header: "Card and channel", width: "150px", render: (r) => <PositionCell r={r} /> },
      { key: "sensor", header: "Sensor", render: (r) => <SensorCell r={r} /> },
      {
        key: "machine",
        header: "Machine",
        render: (r) => (r.machineId ? <span className="ast-cell-text">{ix.registry.machines.find((m) => m.id === r.machineId)?.name ?? r.machineId}</span> : <span className="ast-muted">—</span>),
      },
      { key: "value", header: "Reading", width: "130px", render: (r) => <ValueCell r={r} /> },
      { key: "status", header: "Status", width: "110px", render: (r) => <StatusCell r={r} /> },
      { key: "seen", header: "Updated", width: "90px", render: (r) => <span className="ast-num ast-muted">{ago(r.updatedAt, now)}</span> },
      { key: "act", header: "", width: "130px", render: (r) => <ChannelActions r={r} onLink={props.onLink} onEdit={props.onEditPoint} /> },
    ],
    [ix, now, props],
  );

  return (
    <>
      <section className="ast-card dvp-card" aria-label="Gateway">
        <dl className="dvp-facts">
          <Fact label="Status" sub={link.reason ?? undefined}>
            <StatusTag tone={LINK_TONE[link.status]} label={LINK_LABEL[link.status]} />
          </Fact>
          <Fact label="Last reading received" sub={live?.ip ? `From address ${live.ip}` : undefined}>
            {live?.lastSeenAt ? <span className="ast-num">{ago(live.lastSeenAt, now)}</span> : <span className="ast-muted">None yet</span>}
          </Fact>
          <Fact
            label="Message server (MQTT)"
            sub={
              broker ? (
                <span className="ast-num">{`${broker.host}:${broker.port}${broker.tls ? " · TLS" : ""}`}</span>
              ) : ix.registry.brokers.length ? (
                "Readings cannot arrive until one is chosen"
              ) : (
                "No message server added yet"
              )
            }
            action={
              broker ? (
                <TextButton onClick={() => props.onBroker(broker)} label={`Edit message server ${broker.name}`}>
                  Edit
                </TextButton>
              ) : ix.registry.brokers.length ? (
                <TextButton onClick={props.onEditGateway}>Choose</TextButton>
              ) : (
                <TextButton onClick={() => props.onBroker(null)}>Add</TextButton>
              )
            }
          >
            {broker ? broker.name : <span className="ast-muted">Not chosen</span>}
          </Fact>
          <Fact
            label="Message format"
            sub={builtIn ? "The format ULTRON gateways send" : "How this gateway's messages are read"}
            action={<TextButton onClick={props.onFormat}>{builtIn ? "View" : "Edit"}</TextButton>}
          >
            {builtIn ? "Standard ULTRON format" : formatLabel(ix, gw.formatId)}
          </Fact>
          <Fact label="MQTT topic" sub="Where its messages arrive">
            <span className="ast-num dvp-clip" title={subscriptionFor(ix, gw)}>
              {subscriptionFor(ix, gw)}
            </span>
          </Fact>
          <Fact label="Network address">{gw.ipAddress ? <span className="ast-num">{gw.ipAddress}</span> : <span className="ast-muted">Not recorded</span>}</Fact>
          <Fact label="Hardware">
            {gw.model || gw.firmware ? (
              <span className="dvp-clamp" title={[gw.model, gw.firmware].filter(Boolean).join(" · ")}>
                {[gw.model, gw.firmware].filter(Boolean).join(" · ")}
              </span>
            ) : (
              <span className="ast-muted">Not recorded</span>
            )}
          </Fact>
          <Fact label="Location">{site ?? <span className="ast-muted">Not recorded</span>}</Fact>
        </dl>
      </section>

      <section className="ast-card pg-table-card" aria-label="Racks">
        <div className="ast-card-head">
          <h2 className="ast-card-title">
            Racks
            <span className="ast-caption">{racks.length}</span>
          </h2>
          <PillButton variant="secondary" icon={<IconPlus size={13} />} onClick={() => props.onAddRack()}>
            Add rack
          </PillButton>
        </div>
        {racks.length ? (
          <Table
            className="ast-table dvp-table dvp-racks"
            columns={rackColumns}
            data={racks}
            keyExtractor={(r) => r.key}
            selectedId={rack?.key}
            onRowClick={(r) => props.onRack(r.rack.rackId)}
          />
        ) : (
          props.connecting ? (
            <Loading label="Connecting to live data…" rows={3} />
          ) : (
          <div className="ast-empty">No racks yet. Add the racks and control systems (PLC, SCADA, DCS) wired to this gateway, or wait: they appear when it sends its first readings.</div>
          )
        )}
      </section>

      {rack && (
        <section className="ast-card pg-table-card" aria-label={`Channels of ${rack.rack.rackId}`} ref={channelsRef}>
          <div className="ast-card-head">
            <h2 className="ast-card-title">
              Channels on <span className="ast-num">{rack.rack.rackId}</span>
              <span className="ast-caption">
                {linked === channels.length ? `All ${channels.length} linked to a machine` : `${linked} of ${channels.length} linked to a machine`}
              </span>
            </h2>
            {rack.rack.source && (
              <PillButton variant="secondary" icon={<IconPlus size={13} />} onClick={() => props.onAddChannel(rack.rack.source!)}>
                Add channel
              </PillButton>
            )}
          </div>
          {channels.length ? (
            <Table
              className="ast-table dvp-table"
              columns={channelColumns}
              data={channels}
              keyExtractor={(r) => r.key}
              selectedId={props.channelKey ?? undefined}
              onRowClick={props.onLink}
            />
          ) : (
            props.connecting ? (
              <Loading label="Connecting to live data…" rows={3} />
            ) : (
              <div className="ast-empty">No channels on this rack yet. Add one, or wait: they appear when the rack sends readings.</div>
            )
          )}
        </section>
      )}
    </>
  );
}

/** A gateway publishing to a data connection that is not added yet. */
export function DiscoveredBody({ ix, found, now, onAdd }: { ix: EdgeIndex; found: DiscoveredGateway; now: number; onAdd: () => void }) {
  const broker = ix.brokers.get(found.brokerId);
  return (
    <section className="ast-card dvp-card" aria-label="New gateway">
      <dl className="dvp-facts">
        <Fact label="Status">
          <StatusTag tone="info" label="Not added" />
        </Fact>
        <Fact label="Last reading received">
          <span className="ast-num">{ago(found.lastSeenAt, now)}</span>
        </Fact>
        <Fact label="Message server (MQTT)">{broker?.name ?? found.brokerId}</Fact>
        <Fact label="Racks it sends readings from">
          {found.rackIds.length ? <span className="ast-num">{found.rackIds.join(", ")}</span> : <span className="ast-muted">None yet</span>}
        </Fact>
      </dl>
      <div className="dvp-card-foot">
        <PillButton variant="primary" icon={<IconPlus size={13} />} onClick={onAdd}>
          Add this gateway
        </PillButton>
      </div>
    </section>
  );
}
