"use client";

import React, { useMemo, useState } from "react";
import { PillButton, PillNav, Table, type Column } from "@/components/ui";
import { StatusTag, type Tone } from "@/components/assets/assets-shell-ui";
import { Sparkline } from "@/components/ui/sparkline";
import { sendMqttCommand } from "@/providers/use-mqtt-live";
import type { EdgeRegistry } from "@/types/edge";
import type {
  BrokerStatus,
  MqttAlarm,
  MqttGateway,
  MqttMeasurement,
  MqttQuarantineEntry,
  MqttRack,
  MqttSnapshot,
  MqttTrafficEntry,
} from "@/types/mqtt";
import { ago } from "../edge-model";
import { BROKER_STATE, LIVE_LINK_LABEL, LIVE_LINK_TONE, bytes, clock, nf, registeredGateway, shortTopic, type BrokerRow } from "./mqtt-model";

/* ==========================================================================
   Devices › MQTT diagnostics: what the brokers deliver, filtered to one
   broker or all. Gateways and their racks, readings, alarms, raw traffic
   and what was refused.
   ========================================================================== */

export type Section = "gateways" | "readings" | "alarms" | "traffic" | "quarantine";

interface Ctx {
  registry: EdgeRegistry;
  snapshot: MqttSnapshot;
  rows: BrokerRow[];
  /** Broker id → its status. */
  status: Map<string, BrokerStatus>;
  /** Broker id → display name. */
  names: Map<string, string>;
  /** Show the broker column (more than one broker in view). */
  showBroker: boolean;
  /** Brokers in view (the selected one, or all). */
  inView: BrokerRow[];
  now: number;
}

// ---------------------------------------------------------------- icons
function IconGateway() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="7" rx="2" />
      <rect x="3" y="13" width="18" height="7" rx="2" />
      <path d="M7 7.5h.01M7 16.5h.01M11 7.5h6M11 16.5h6" />
    </svg>
  );
}

function IconSignal() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12h4l3-8 4 16 3-8h4" />
    </svg>
  );
}

// ---------------------------------------------------------------- shell
export function Diagnostics({
  registry,
  snapshot,
  rows,
  filter,
  onFilter,
  traffic,
  history,
  trafficPaused,
  setTrafficPaused,
  clearTraffic,
}: {
  registry: EdgeRegistry;
  snapshot: MqttSnapshot;
  rows: BrokerRow[];
  /** Broker id, or "all". */
  filter: string;
  onFilter: (id: string) => void;
  traffic: MqttTrafficEntry[];
  history: Record<string, number[]>;
  trafficPaused: boolean;
  setTrafficPaused: (p: boolean) => void;
  clearTraffic: () => void;
}) {
  const [section, setSection] = useState<Section>("gateways");
  const [confirmClear, setConfirmClear] = useState(false);
  const inScope = <T extends { brokerId: string }>(items: T[]) => (filter === "all" ? items : items.filter((i) => i.brokerId === filter));

  const ctx: Ctx = useMemo(
    () => ({
      registry,
      snapshot,
      rows,
      status: new Map(snapshot.brokers.map((b) => [b.brokerId, b])),
      names: new Map(rows.map((r) => [r.broker.id, r.broker.name])),
      showBroker: filter === "all" && rows.length > 1,
      inView: filter === "all" ? rows : rows.filter((r) => r.broker.id === filter),
      now: Date.parse(snapshot.serverNow),
    }),
    [registry, snapshot, rows, filter],
  );

  const gateways = inScope(snapshot.gateways);
  const racks = inScope(snapshot.racks);
  const measurements = inScope(snapshot.measurements);
  const alarms = inScope(snapshot.alarms);
  const quarantine = inScope(snapshot.quarantine);
  const trafficInView = inScope(traffic);

  return (
    <section className="mq-diag" aria-label="Diagnostics">
      <div className="mq-toolbar">
        <PillNav
          items={[
            { id: "gateways", label: `Gateways ${gateways.length}` },
            { id: "readings", label: `Readings ${measurements.length}` },
            { id: "alarms", label: `Alarms ${alarms.filter((a) => a.state === "ACTIVE").length}` },
            { id: "traffic", label: "Traffic" },
            { id: "quarantine", label: `Quarantine ${quarantine.length}` },
          ]}
          activeId={section}
          onChange={(id) => setSection(id as Section)}
          wrap
        />
        <div className="pg-actions">
          {section === "traffic" && (
            <>
              <PillButton variant="secondary" onClick={() => setTrafficPaused(!trafficPaused)} aria-pressed={trafficPaused}>
                {trafficPaused ? "Resume" : "Pause"}
              </PillButton>
              {confirmClear ? (
                <span className="mq-confirm" role="group" aria-label="Confirm clear">
                  <span className="ast-caption">Clear {traffic.length} captured messages?</span>
                  <PillButton
                    variant="danger"
                    onClick={() => {
                      clearTraffic();
                      setConfirmClear(false);
                    }}
                  >
                    Clear
                  </PillButton>
                  <PillButton variant="secondary" onClick={() => setConfirmClear(false)}>
                    Cancel
                  </PillButton>
                </span>
              ) : (
                <PillButton variant="secondary" onClick={() => setConfirmClear(true)} disabled={traffic.length === 0} title="Empties the captured traffic list in this view; brokers are not affected">
                  Clear…
                </PillButton>
              )}
            </>
          )}
        </div>
      </div>

      {rows.length > 1 && (
        <div className="mq-filter" aria-label="Broker filter">
          <span className="ast-caption">Broker</span>
          <PillNav
            items={[{ id: "all", label: "All" }, ...rows.map((r) => ({ id: r.broker.id, label: r.broker.name }))]}
            activeId={filter}
            onChange={onFilter}
            wrap
          />
        </div>
      )}

      {section === "gateways" && <GatewaysTable ctx={ctx} gateways={gateways} racks={racks} />}
      {section === "readings" && <ReadingsTable ctx={ctx} measurements={measurements} history={history} />}
      {section === "alarms" && <AlarmsTable ctx={ctx} alarms={alarms} />}
      {section === "traffic" && <TrafficTable ctx={ctx} traffic={trafficInView} paused={trafficPaused} />}
      {section === "quarantine" && <QuarantineTable ctx={ctx} entries={quarantine} />}
    </section>
  );
}

// ---------------------------------------------------------------- shared
export function EmptyCard({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="ast-card ast-empty">
      <strong className="mq-empty-title">{title}</strong>
      {children && <span className="mq-empty-body">{children}</span>}
      {action}
    </div>
  );
}

/**
 * Why a table is empty, before blaming the gateways: no broker enabled, none
 * connected, or connected and waiting (with the filters it listens on).
 */
function NoData({ ctx, title, waiting }: { ctx: Ctx; title: string; waiting: React.ReactNode }) {
  const enabled = ctx.inView.filter((r) => r.broker.enabled);
  if (enabled.length === 0) {
    const one = ctx.inView.length === 1 ? ctx.inView[0].broker.name : null;
    return (
      <EmptyCard title={one ? `${one} is disabled` : "No broker enabled"}>
        Enable a broker to start receiving. Use the switch on its row in the list above.
      </EmptyCard>
    );
  }
  const connected = enabled.filter((r) => r.state === "connected");
  if (connected.length === 0) {
    const errors = enabled.map((r) => r.status?.lastError).filter((e): e is string => Boolean(e));
    return (
      <EmptyCard title={enabled.length === 1 ? `${enabled[0].broker.name} is not connected` : "No broker connected"}>
        {errors.length > 0 ? errors.join(" · ") : "Waiting for the broker to accept the connection."}
      </EmptyCard>
    );
  }
  const filters = connected.flatMap((r) => r.status?.subscriptions ?? []);
  return (
    <EmptyCard title={title}>
      <span>{waiting}</span>
      {filters.length > 0 && (
        <span className="mq-subs">
          <span className="ast-caption">Subscribed to</span>
          {[...new Set(filters)].map((f) => (
            <code key={f}>{f}</code>
          ))}
        </span>
      )}
    </EmptyCard>
  );
}

function BrokerCell({ ctx, brokerId }: { ctx: Ctx; brokerId: string }) {
  const s = ctx.status.get(brokerId);
  const [tone] = s ? BROKER_STATE[s.state] : (["idle"] as [Tone]);
  return (
    <span className="mq-broker-cell">
      <span className="ast-chip-dot" data-tone={tone} aria-hidden="true" />
      {ctx.names.get(brokerId) ?? s?.name ?? brokerId}
    </span>
  );
}

function GatewayLabel({ ctx, brokerId, gatewayId }: { ctx: Ctx; brokerId: string; gatewayId: string }) {
  const g = registeredGateway(ctx.registry, brokerId, gatewayId);
  return <span className="ast-cell-sub">{g ? `${g.name} · ${gatewayId}` : gatewayId}</span>;
}

function brokerColumn<T extends { brokerId: string }>(ctx: Ctx): Column<T>[] {
  return ctx.showBroker ? [{ key: "broker", header: "Broker", render: (r: T) => <BrokerCell ctx={ctx} brokerId={r.brokerId} /> }] : [];
}

// ---------------------------------------------------------------- gateways
interface RackRow {
  key: string;
  brokerId: string;
  gateway: MqttGateway | undefined;
  gatewayId: string;
  /** null: the gateway has reported no racks yet. */
  rack: MqttRack | null;
}

type PingState = { busy: boolean; tone: Tone; text: string };

function GatewaysTable({ ctx, gateways, racks }: { ctx: Ctx; gateways: MqttGateway[]; racks: MqttRack[] }) {
  const [ping, setPing] = useState<Record<string, PingState>>({});

  const rows = useMemo<RackRow[]>(() => {
    const byGateway = new Map(gateways.map((g) => [`${g.brokerId}/${g.gatewayId}`, g]));
    const out: RackRow[] = racks.map((r) => ({
      key: `${r.brokerId}/${r.gatewayId}/${r.rackId}`,
      brokerId: r.brokerId,
      gateway: byGateway.get(`${r.brokerId}/${r.gatewayId}`),
      gatewayId: r.gatewayId,
      rack: r,
    }));
    const withRacks = new Set(racks.map((r) => `${r.brokerId}/${r.gatewayId}`));
    for (const g of gateways) {
      const k = `${g.brokerId}/${g.gatewayId}`;
      if (!withRacks.has(k)) out.push({ key: k, brokerId: g.brokerId, gateway: g, gatewayId: g.gatewayId, rack: null });
    }
    const order = new Map(ctx.rows.map((r, i) => [r.broker.id, i]));
    return out.sort(
      (a, b) =>
        (order.get(a.brokerId) ?? 99) - (order.get(b.brokerId) ?? 99) ||
        a.gatewayId.localeCompare(b.gatewayId) ||
        (a.rack?.rackId ?? "").localeCompare(b.rack?.rackId ?? ""),
    );
  }, [gateways, racks, ctx.rows]);

  const runPing = async (row: RackRow) => {
    if (!row.rack) return;
    setPing((p) => ({ ...p, [row.key]: { busy: true, tone: "idle", text: "Waiting…" } }));
    try {
      const result = await sendMqttCommand(row.gatewayId, row.rack.rackId, "PING", row.brokerId);
      const ok = result.response.status === "COMPLETED";
      setPing((p) => ({
        ...p,
        [row.key]: { busy: false, tone: ok ? "good" : "bad", text: ok ? `Pong · ${nf.format(result.roundTripMs)} ms` : result.response.message ?? result.response.status },
      }));
    } catch (err) {
      setPing((p) => ({ ...p, [row.key]: { busy: false, tone: "bad", text: (err as Error).message } }));
    }
  };

  const columns: Column<RackRow>[] = [
    {
      key: "source",
      header: "Source · gateway",
      render: (r) => {
        const state = r.rack?.state ?? r.gateway?.state ?? "OFFLINE";
        const registered = registeredGateway(ctx.registry, r.brokerId, r.gatewayId);
        return (
          <span className="mq-lead">
            <span className="ast-badge" data-tone={LIVE_LINK_TONE[state]}>
              <IconGateway />
            </span>
            <span className="ast-cell-stack">
              <span className="ast-cell-title">{r.rack ? r.rack.rackId : <span className="ast-muted">No sources reported</span>}</span>
              <GatewayLabel ctx={ctx} brokerId={r.brokerId} gatewayId={r.gatewayId} />
            </span>
            {!registered && (
              <span title="Register it under Devices › Hierarchy">
                <StatusTag tone="warn" label="Not registered" />
              </span>
            )}
          </span>
        );
      },
    },
    ...brokerColumn<RackRow>(ctx),
    { key: "ip", header: "Gateway IP", render: (r) => <span className="ast-num">{r.gateway?.ip || "—"}</span> },
    {
      key: "link",
      header: "Link",
      render: (r) => {
        const state = r.rack?.state ?? r.gateway?.state;
        return state ? <StatusTag tone={LIVE_LINK_TONE[state]} label={LIVE_LINK_LABEL[state]} /> : "—";
      },
    },
    {
      key: "data",
      header: "Data",
      render: (r) =>
        r.rack ? (
          <span className="ast-cell-stack">
            <span className="ast-cell-text">{r.rack.dataCurrent ? "Current" : "Not current"}</span>
            {r.rack.reason && <span className="ast-cell-sub">{r.rack.reason}</span>}
          </span>
        ) : (
          <span className="ast-muted">—</span>
        ),
    },
    { key: "slots", header: "Slots", width: "64px", render: (r) => <span className="ast-num">{r.rack?.slotCount ? nf.format(r.rack.slotCount) : "—"}</span> },
    {
      key: "seq",
      header: "Sequence",
      render: (r) => {
        const g = r.gateway;
        if (!g) return <span className="ast-muted">—</span>;
        // Custom formats carry no envelope sequence, so loss cannot be measured.
        if (!g.bootId) {
          return (
            <span className="ast-cell-stack">
              <span className="ast-muted">—</span>
              <span className="ast-cell-sub">Not reported</span>
            </span>
          );
        }
        return (
          <span className="ast-cell-stack">
            <span className="ast-num ast-cell-text">#{nf.format(g.lastSequence)}</span>
            <span className="ast-cell-sub pg-tone-value" data-tone={g.sequenceGaps > 0 ? "warn" : undefined}>
              {g.sequenceGaps > 0 ? `${nf.format(g.sequenceGaps)} lost` : "No loss"}
              {g.replayed > 0 ? ` · ${nf.format(g.replayed)} replayed` : ""}
            </span>
          </span>
        );
      },
    },
    {
      key: "seen",
      header: "Last seen",
      render: (r) => <span className="ast-num ast-muted">{ago(r.rack?.lastSeenAt ?? r.gateway?.lastSeenAt ?? null, ctx.now)}</span>,
    },
    {
      key: "action",
      header: "",
      width: "200px",
      render: (r) => {
        const result = ping[r.key];
        const s = ctx.status.get(r.brokerId);
        const canPing = Boolean(r.rack) && s?.state === "connected" && s.allowedCommands.includes("PING");
        return (
          <span className="mq-action">
            {result && (
              <span className="pg-note ast-num" data-tone={result.tone} role="status">
                {result.text}
              </span>
            )}
            {canPing && (
              <PillButton
                variant="secondary"
                className="mq-reveal"
                disabled={result?.busy}
                onClick={() => void runPing(r)}
                aria-label={`Ping ${r.rack?.rackId} on ${r.gatewayId}`}
              >
                Ping
              </PillButton>
            )}
          </span>
        );
      },
    },
  ];

  if (rows.length === 0) {
    return (
      <NoData
        ctx={ctx}
        title="No gateway has published yet"
        waiting="Retained status, topology and health appear here as soon as a gateway connects."
      />
    );
  }
  return (
    <section className="ast-card pg-table-card" aria-label="Gateways and sources">
      <Table className="ast-table" columns={columns} data={rows} keyExtractor={(r) => r.key} />
    </section>
  );
}

// ---------------------------------------------------------------- readings
function readingTone(m: MqttMeasurement): [Tone, string] {
  if (!m.valid || !m.fresh) return ["warn", "Stale"];
  if (m.dangerActive) return ["bad", "Alarm"];
  if (m.alertActive) return ["warn", "Warning"];
  return ["good", "Normal"];
}

function limit(v: number | null, unit: string) {
  return v === null ? "—" : `${nf.format(v)}${unit ? ` ${unit}` : ""}`;
}

function ReadingsTable({ ctx, measurements, history }: { ctx: Ctx; measurements: MqttMeasurement[]; history: Record<string, number[]> }) {
  const columns: Column<MqttMeasurement>[] = [
    {
      key: "point",
      header: "Point",
      render: (m) => (
        <span className="mq-lead">
          <span className="ast-badge" data-tone={readingTone(m)[0]}>
            <IconSignal />
          </span>
          <span className="ast-cell-stack">
            <span className="ast-cell-title">{m.sensor ?? m.cardType ?? "Channel"}</span>
            <span className="ast-cell-sub ast-num">
              Slot {m.slot} · Ch {m.channel}
              {m.cardType && m.sensor ? ` · ${m.cardType}` : ""}
            </span>
          </span>
        </span>
      ),
    },
    {
      key: "value",
      header: "Value",
      render: (m) => {
        const [tone] = readingTone(m);
        return (
          <span className="mq-value ast-num pg-tone-value" data-tone={tone === "good" ? undefined : tone}>
            {m.display ?? (m.value !== null ? nf.format(m.value) : "—")}
            {m.unit && <span className="ast-unit">{m.unit}</span>}
          </span>
        );
      },
    },
    {
      key: "trend",
      header: "Last minute",
      width: "180px",
      render: (m) => {
        const tone = readingTone(m)[0];
        return (
          <span className="mq-trend">
            <Sparkline
              values={history[m.key] ?? []}
              unit={m.unit}
              height={28}
              tone={tone === "good" ? "info" : tone}
              digits={Math.abs(m.value ?? 0) < 10 ? 3 : 1}
              ariaLabel={`${m.sensor ?? "Channel"} trend`}
            />
          </span>
        );
      },
    },
    {
      key: "limits",
      header: "Warning / alarm",
      render: (m) => (
        <span className="ast-num ast-muted">
          {limit(m.alertThreshold, m.unit)} / {limit(m.dangerThreshold, m.unit)}
        </span>
      ),
    },
    {
      key: "state",
      header: "State",
      render: (m) => {
        const [tone, label] = readingTone(m);
        return <StatusTag tone={tone} label={label} />;
      },
    },
    {
      key: "rack",
      header: "Source",
      render: (m) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-text">{m.rackId}</span>
          <GatewayLabel ctx={ctx} brokerId={m.brokerId} gatewayId={m.gatewayId} />
        </span>
      ),
    },
    ...brokerColumn<MqttMeasurement>(ctx),
    { key: "updated", header: "Updated", render: (m) => <span className="ast-num ast-muted">{ago(m.updatedAt, ctx.now)}</span> },
  ];

  if (measurements.length === 0) {
    return (
      <NoData
        ctx={ctx}
        title="No live readings"
        waiting={
          <>
            A reading appears once a source publishes telemetry with <code>measurement_valid</code>, an OK channel status and current data.
          </>
        }
      />
    );
  }
  return (
    <section className="ast-card pg-table-card" aria-label="Live readings">
      <Table className="ast-table" columns={columns} data={measurements} keyExtractor={(m) => m.key} />
    </section>
  );
}

// ---------------------------------------------------------------- alarms
function AlarmsTable({ ctx, alarms }: { ctx: Ctx; alarms: MqttAlarm[] }) {
  const columns: Column<MqttAlarm>[] = [
    {
      key: "severity",
      header: "Severity",
      width: "130px",
      render: (a) => (
        <StatusTag
          tone={a.state === "CLEARED" ? "idle" : a.severity === "CRITICAL" ? "bad" : "warn"}
          label={a.state === "CLEARED" ? "Cleared" : a.severity === "CRITICAL" ? "Critical" : "Warning"}
        />
      ),
    },
    { key: "message", header: "Alarm", render: (a) => <span className="pg-wrap ast-cell-title">{a.message ?? "Alarm"}</span> },
    {
      key: "point",
      header: "Point",
      render: (a) => <span className="ast-num ast-muted">{a.slot !== null ? `Slot ${a.slot}${a.channel !== null ? ` · Ch ${a.channel}` : ""}` : "—"}</span>,
    },
    {
      key: "value",
      header: "Value / limit",
      render: (a) => (
        <span className="ast-num">
          {a.value !== null ? nf.format(a.value) : "—"}
          <span className="ast-muted"> / {a.threshold !== null ? nf.format(a.threshold) : "—"}</span>
          {a.unit && <span className="ast-unit">{a.unit}</span>}
        </span>
      ),
    },
    {
      key: "rack",
      header: "Source",
      render: (a) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-text">{a.rackId}</span>
          <GatewayLabel ctx={ctx} brokerId={a.brokerId} gatewayId={a.gatewayId} />
        </span>
      ),
    },
    ...brokerColumn<MqttAlarm>(ctx),
    { key: "at", header: "Raised (your time)", render: (a) => <span className="ast-num ast-muted">{clock(a.at)}</span> },
  ];
  if (alarms.length === 0) {
    return (
      <NoData
        ctx={ctx}
        title="No alarms received"
        waiting={
          <>
            Gateway alarm events (<code>events/alarm</code>) are listed here as they arrive.
          </>
        }
      />
    );
  }
  return (
    <section className="ast-card pg-table-card" aria-label="Alarms">
      <Table className="ast-table" columns={columns} data={alarms} keyExtractor={(a) => `${a.brokerId}/${a.id}`} />
    </section>
  );
}

// ---------------------------------------------------------------- traffic
function TrafficTable({ ctx, traffic, paused }: { ctx: Ctx; traffic: MqttTrafficEntry[]; paused: boolean }) {
  const columns: Column<MqttTrafficEntry>[] = [
    { key: "at", header: "Received (your time)", width: "140px", render: (t) => <span className="ast-num ast-muted">{clock(t.at)}</span> },
    {
      key: "topic",
      header: "Topic",
      render: (t) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-title mq-topic" title={t.topic}>
            {shortTopic(t.topic, ctx.status.get(t.brokerId)?.topicPrefix)}
          </span>
          <span className="ast-cell-sub">{t.schema ?? t.kind}</span>
        </span>
      ),
    },
    ...brokerColumn<MqttTrafficEntry>(ctx),
    { key: "bytes", header: "Size", width: "90px", render: (t) => <span className="ast-num">{bytes(t.bytes)}</span> },
    {
      key: "latency",
      header: "Latency",
      width: "90px",
      render: (t) => <span className="ast-num">{t.latencyMs !== null ? `${nf.format(Math.round(t.latencyMs))} ms` : "—"}</span>,
    },
    {
      key: "flags",
      header: "Delivery",
      render: (t) => (
        <span className="mq-flags">
          {t.outcome === "quarantined" ? (
            <StatusTag tone="bad" label="Quarantined" />
          ) : t.duplicate ? (
            <StatusTag tone="idle" label="Duplicate" />
          ) : (
            <StatusTag tone="good" label="Accepted" />
          )}
          {t.retained && <StatusTag tone="info" label="Retained" />}
          {t.replayed && <StatusTag tone="warn" label="Replayed" />}
        </span>
      ),
    },
  ];
  if (traffic.length === 0) {
    if (paused) return <EmptyCard title="Feed paused">Resume to list new messages. Messages that arrive while paused are not kept.</EmptyCard>;
    return <NoData ctx={ctx} title="Waiting for messages" waiting="Every message the broker delivers is listed here, newest first." />;
  }
  return (
    <section className="ast-card pg-table-card" aria-label="Message traffic">
      <Table className="ast-table" columns={columns} data={traffic} keyExtractor={(t) => String(t.id)} />
    </section>
  );
}

// ---------------------------------------------------------------- quarantine
function QuarantineTable({ ctx, entries }: { ctx: Ctx; entries: MqttQuarantineEntry[] }) {
  const columns: Column<MqttQuarantineEntry>[] = [
    { key: "at", header: "Received (your time)", width: "140px", render: (q) => <span className="ast-num ast-muted">{clock(q.at)}</span> },
    {
      key: "topic",
      header: "Topic",
      render: (q) => (
        <span className="ast-cell-title mq-topic" title={q.topic}>
          {shortTopic(q.topic, ctx.status.get(q.brokerId)?.topicPrefix)}
        </span>
      ),
    },
    ...brokerColumn<MqttQuarantineEntry>(ctx),
    { key: "reason", header: "Reason", render: (q) => <span className="pg-wrap ast-cell-text">{q.reason}</span> },
  ];
  if (entries.length === 0) {
    return (
      <EmptyCard title="Nothing quarantined">
        Messages that fail the topic, envelope, schema or identity checks are held here instead of reaching live state.
      </EmptyCard>
    );
  }
  return (
    <section className="ast-card pg-table-card" aria-label="Quarantine">
      <Table className="ast-table" columns={columns} data={entries} keyExtractor={(q) => `${q.brokerId}/${q.id}`} />
    </section>
  );
}
