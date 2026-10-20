"use client";

import React, { useMemo, useState } from "react";
import { KpiCard, KpiCards, PillButton, Table, type Column } from "@/components/ui";
import { StatusTag, type Tone } from "@/components/assets/assets-shell-ui";
import { useEdge } from "@/providers/edge-context";
import type { EdgeBroker } from "@/types/edge";
import type { MqttGateway, MqttMetrics, MqttRack } from "@/types/mqtt";
import { ago } from "./edge-model";
import { BrokerDialog } from "./broker-dialog";
import { Diagnostics, EmptyCard } from "./mqtt/diagnostics";
import { BROKER_STATE, EMPTY_METRICS, brokerRows, brokerUrl, bytes, connectionSummary, nf, protocolLabel, rate, type BrokerRow } from "./mqtt/mqtt-model";
import "@/components/assets/assets-shell.css";

/* ==========================================================================
   Devices › MQTT — the brokers the gateways publish to. Brokers are rows in
   the edge registry, managed here; below them, live diagnostics across all
   brokers or the one selected.
   ========================================================================== */

type Editing = { broker: EdgeBroker | null } | null;

function IconBroker() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <circle cx="12" cy="3" r="0.5" />
      <circle cx="12" cy="21" r="0.5" />
      <circle cx="3" cy="12" r="0.5" />
      <circle cx="21" cy="12" r="0.5" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function MqttView({ sectionNav }: { sectionNav?: React.ReactNode }) {
  const edge = useEdge();
  const { registry, snapshot, stream } = edge;
  const [filter, setFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Editing>(null);

  const rows = useMemo(() => (registry ? brokerRows(registry, snapshot) : []), [registry, snapshot]);
  // A removed broker drops the filter back to all.
  const activeFilter = filter !== "all" && rows.some((r) => r.broker.id === filter) ? filter : "all";
  const toggleFilter = (id: string) => setFilter((f) => (f === id || id === "all" ? "all" : id));
  const [tone, label] = registry ? connectionSummary(rows) : (["idle", "Loading…"] as [Tone, string]);

  const editingCount = editing?.broker ? (rows.find((r) => r.broker.id === editing.broker!.id)?.registered ?? 0) : 0;

  return (
    <div className="pg-root ast-root mq-root" aria-label="Data connections (MQTT brokers)">
      <header className="ast-head pg-head">
        <div className="ast-head-main">
          <ol className="ast-crumbs" aria-label="Location">
            <li>Devices</li>
            <li>Data connections</li>
          </ol>
          <div className="ast-title-row">
            <h1 className="ast-title">Data connections (MQTT brokers)</h1>
            <StatusTag tone={tone} label={label} />
            {stream !== "open" && <StatusTag tone="warn" label={stream === "connecting" ? "Live updates connecting" : "Live updates reconnecting"} />}
          </div>
        </div>
        <div className="pg-actions">
          <PillButton variant="primary" icon={<IconPlus />} onClick={() => setEditing({ broker: null })} disabled={!registry}>
            Add data connection
          </PillButton>
        </div>
      </header>

      {sectionNav}

      {!registry ? (
        edge.error ? (
          <EmptyCard title="The list of data connections could not be loaded. Try again." action={<PillButton variant="secondary" onClick={() => void edge.refresh()}>Retry</PillButton>} />
        ) : (
          <div className="ast-card ast-empty">Loading data connections…</div>
        )
      ) : rows.length === 0 ? (
        <EmptyCard
          title="No data connections"
          action={
            <PillButton variant="primary" icon={<IconPlus />} onClick={() => setEditing({ broker: null })}>
              Add data connection
            </PillButton>
          }
        >
          Data collectors (gateways) send their readings to a message server (MQTT broker), and ULTRON listens to it. Add one for each
          network the data collectors can reach.
        </EmptyCard>
      ) : (
        <>
          <BrokersTable rows={rows} filter={activeFilter} onSelect={toggleFilter} onEdit={(b) => setEditing({ broker: b })} now={snapshot ? Date.parse(snapshot.serverNow) : Date.now()} />
          {snapshot ? (
            <>
              <Kpis
                metrics={activeFilter === "all" ? snapshot.metrics : (rows.find((r) => r.broker.id === activeFilter)?.status?.metrics ?? EMPTY_METRICS)}
                gateways={activeFilter === "all" ? snapshot.gateways : snapshot.gateways.filter((g) => g.brokerId === activeFilter)}
                racks={activeFilter === "all" ? snapshot.racks : snapshot.racks.filter((r) => r.brokerId === activeFilter)}
                known={rows.filter((r) => activeFilter === "all" || r.broker.id === activeFilter).reduce((n, r) => n + r.known, 0)}
                now={Date.parse(snapshot.serverNow)}
              />
              <Diagnostics
                registry={registry}
                snapshot={snapshot}
                rows={rows}
                filter={activeFilter}
                onFilter={toggleFilter}
                traffic={edge.traffic}
                history={edge.history}
                trafficPaused={edge.trafficPaused}
                setTrafficPaused={edge.setTrafficPaused}
                clearTraffic={edge.clearTraffic}
              />
            </>
          ) : (
            <div className="ast-card ast-empty">Connecting to the data receiver…</div>
          )}
        </>
      )}

      {editing && <BrokerDialog broker={editing.broker} gatewayCount={editingCount} onClose={() => setEditing(null)} />}
    </div>
  );
}

// ---------------------------------------------------------------- brokers
function clockTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function securityLabel(b: EdgeBroker): string {
  if (!b.tls) return "Not encrypted";
  return `Encrypted (TLS) · ${b.rejectUnauthorized ? "server checked" : "server not checked"}${b.hasClientCert ? " · two-way (mTLS)" : ""}`;
}

function BrokersTable({
  rows,
  filter,
  onSelect,
  onEdit,
  now,
}: {
  rows: BrokerRow[];
  filter: string;
  onSelect: (id: string) => void;
  onEdit: (b: EdgeBroker) => void;
  now: number;
}) {
  const { update } = useEdge();
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [failed, setFailed] = useState<Record<string, string>>({});

  const setEnabled = async (b: EdgeBroker, enabled: boolean) => {
    setPending((p) => ({ ...p, [b.id]: true }));
    setFailed((f) => {
      const { [b.id]: _drop, ...rest } = f;
      void _drop;
      return rest;
    });
    try {
      await update("brokers", b.id, { enabled });
    } catch (err) {
      setFailed((f) => ({ ...f, [b.id]: (err as Error).message }));
    } finally {
      setPending((p) => ({ ...p, [b.id]: false }));
    }
  };

  const columns: Column<BrokerRow>[] = [
    {
      key: "broker",
      header: "Data connection",
      render: (r) => {
        const [tone] = BROKER_STATE[r.state];
        return (
          <span className="mq-lead" data-broker-off={r.broker.enabled ? undefined : true}>
            <span className="ast-badge" data-tone={tone}>
              <IconBroker />
            </span>
            <span className="ast-cell-stack">
              <span className="ast-cell-title">{r.broker.name}</span>
              <span className="ast-cell-sub ast-num">{brokerUrl(r.broker)}</span>
            </span>
          </span>
        );
      },
    },
    {
      key: "state",
      header: "Status",
      render: (r) => {
        const [tone, label] = BROKER_STATE[r.state];
        const error = failed[r.broker.id] ?? (r.broker.enabled ? r.status?.lastError : null);
        return (
          <span className="ast-cell-stack mq-state">
            <span className="mq-tags">
              <StatusTag tone={tone} label={label} />
              {r.status?.listening && Date.parse(r.status.listening.until) > now && (
                <span title={`Recording messages on ${r.status.listening.filter} for Message formats`}>
                  <StatusTag tone="info" label={`Listening until ${clockTime(r.status.listening.until)}`} />
                </span>
              )}
            </span>
            {error && (
              <span className="ast-cell-sub mq-error" title={error}>
                {error}
              </span>
            )}
            {!error && r.state === "connected" && r.status?.connectedAt && (
              <span className="ast-cell-sub ast-num">
                Since {ago(r.status.connectedAt, now).replace(" ago", "")}
                {r.status.reconnects > 0 ? ` · ${nf.format(r.status.reconnects)} reconnects` : ""}
              </span>
            )}
          </span>
        );
      },
    },
    {
      key: "security",
      header: "Security",
      render: (r) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-text">{securityLabel(r.broker)}</span>
          <span className="ast-cell-sub">{protocolLabel(r.status?.protocolVersion ?? r.broker.protocolVersion)}</span>
        </span>
      ),
    },
    {
      key: "gateways",
      header: "Data collectors",
      render: (r) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-text ast-num">{r.known === 0 ? "None linked" : `${nf.format(r.online)} of ${nf.format(r.known)} online`}</span>
          {r.unregistered > 0 && <span className="ast-cell-sub pg-tone-value" data-tone="warn">{nf.format(r.unregistered)} not registered</span>}
        </span>
      ),
    },
    {
      key: "rate",
      header: "Messages",
      render: (r) =>
        r.status && r.broker.enabled ? (
          <span className="ast-num">
            {rate(r.status.metrics.messagesPerSecond)}
            <span className="ast-unit">per s</span>
          </span>
        ) : (
          <span className="ast-muted">—</span>
        ),
    },
    {
      key: "latency",
      header: "Typical delay",
      render: (r) =>
        r.status?.metrics.latencyP50Ms != null ? (
          <span className="ast-num">
            {nf.format(Math.round(r.status.metrics.latencyP50Ms))}
            <span className="ast-unit">ms</span>
          </span>
        ) : (
          <span className="ast-muted">—</span>
        ),
    },
    {
      key: "last",
      header: "Last message",
      render: (r) => <span className="ast-num ast-muted">{ago(r.status?.metrics.lastMessageAt ?? null, now)}</span>,
    },
    {
      key: "actions",
      header: "",
      width: "190px",
      render: (r) => {
        const busy = Boolean(pending[r.broker.id]);
        const on = r.broker.enabled;
        return (
          // Actions act on the broker, not on the row's filter selection.
          <span className="mq-action" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              aria-label={`${on ? "Switch off" : "Switch on"} ${r.broker.name}`}
              className="mq-switch mq-reveal"
              data-on={on || undefined}
              disabled={busy}
              onClick={() => void setEnabled(r.broker, !on)}
            >
              <span className="mq-switch-track" aria-hidden="true">
                <span className="mq-switch-thumb" />
              </span>
              <span className="mq-switch-label">{busy ? "Saving…" : on ? "On" : "Off"}</span>
            </button>
            <PillButton variant="secondary" className="mq-reveal" onClick={() => onEdit(r.broker)} aria-label={`Edit ${r.broker.name}`}>
              Edit
            </PillButton>
          </span>
        );
      },
    },
  ];

  return (
    <section className="ast-card pg-table-card mq-brokers" aria-label="Data connections">
      <Table
        className="ast-table"
        columns={columns}
        data={rows}
        keyExtractor={(r) => r.broker.id}
        onRowClick={(r) => onSelect(r.broker.id)}
        selectedKey={filter === "all" ? undefined : filter}
      />
    </section>
  );
}

// ---------------------------------------------------------------- KPIs
function Kpis({ metrics, gateways, racks, known, now }: { metrics: MqttMetrics; gateways: MqttGateway[]; racks: MqttRack[]; known: number; now: number }) {
  // Same denominator as the broker rows: registered gateways plus any live unregistered ones.
  const online = gateways.filter((g) => g.state === "ONLINE").length;
  const streaming = racks.filter((r) => r.state === "ONLINE" && r.dataCurrent).length;
  const gatewayTone: Tone | undefined = known === 0 ? undefined : online === known ? "good" : online === 0 ? "bad" : "warn";
  const refused = metrics.schemaFailures + metrics.identityMismatches + metrics.parseFailures + metrics.payloadTooLarge;

  return (
    <KpiCards label="Data connection figures">
      <KpiCard
        label="Messages received"
        value={rate(metrics.messagesPerSecond)}
        unit="per second"
        footClassName="ast-kpi-foot ast-caption ast-num"
        foot={`${nf.format(metrics.messagesTotal)} messages · ${bytes(metrics.bytesTotal)} · last ${ago(metrics.lastMessageAt, now)}`}
      />
      <KpiCard
        label="Gateways online"
        value={nf.format(online)}
        unit={`of ${nf.format(known)}`}
        tone={gatewayTone}
        footClassName="ast-kpi-foot ast-caption ast-num"
        foot={`${nf.format(streaming)} of ${nf.format(racks.length)} devices sending current data`}
      />
      <KpiCard
        label="Delay to ULTRON"
        value={metrics.latencyP50Ms !== null ? nf.format(Math.round(metrics.latencyP50Ms)) : "—"}
        unit={metrics.latencyP50Ms !== null ? "ms typical" : undefined}
        footClassName="ast-kpi-foot ast-caption ast-num"
        foot={`slowest 5%: ${metrics.latencyP95Ms !== null ? `${nf.format(Math.round(metrics.latencyP95Ms))} ms` : "—"} · ${nf.format(metrics.sequenceGaps)} lost · ${nf.format(metrics.duplicates)} duplicate`}
      />
      <KpiCard
        label="Set aside"
        value={nf.format(metrics.quarantined)}
        unit="messages"
        tone={metrics.quarantined > 0 ? "warn" : undefined}
        footClassName="ast-kpi-foot ast-caption ast-num"
        foot={
          refused === 0
            ? "No message was rejected"
            : `${nf.format(metrics.schemaFailures)} wrong format · ${nf.format(metrics.identityMismatches)} wrong sender · ${nf.format(metrics.parseFailures)} unreadable${
                metrics.payloadTooLarge ? ` · ${nf.format(metrics.payloadTooLarge)} too large` : ""
              }`
        }
      />
    </KpiCards>
  );
}
