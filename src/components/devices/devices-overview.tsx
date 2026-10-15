"use client";

import React, { useEffect, useMemo, useState } from "react";
import { KpiCard, KpiCards, PillButton, PillNav, Table, type Column } from "@/components/ui";
import { IconSensor, SegmentBar, StatusTag, type Tone } from "@/components/assets/assets-shell-ui";
import { useEdge } from "@/providers/edge-context";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { LINK_LABEL, LINK_TONE, READING_LABEL, READING_TONE, ago, buildIndex, discoveredGateways } from "./edge-model";
import { IconCard, IconGateway, IconNetwork, IconPlus, IconRack } from "./hierarchy/edge-icons";
import { linkSegments, segmentText } from "./hierarchy/edge-tree-model";
import {
  type BreakRow,
  type Lane,
  type Layer,
  type PointRow,
  LAYERS,
  LAYER_LABEL,
  activeOf,
  breakRows,
  buildLanes,
  countsTone,
  layerTotals,
  pointRows,
} from "./devices-overview-model";
import { nf, rate } from "./mqtt/mqtt-model";
import "@/components/assets/assets-shell.css";
import "./devices-overview.css";

/* ==========================================================================
   Devices › Overview — "Is data reaching ULTRON from the edge?"

     header → KPI strip (one tile per layer + throughput)
            → data path by gateway (broker → gateway → source → card → point)
            → where data stops (root causes only)
            → points and the machine each one feeds
            → related pages

   Registry from /api/edge, live state from the MQTT stream (EdgeProvider).
   ========================================================================== */

export type DevicesSectionId = "overview" | "hierarchy" | "formats" | "mqtt";

export interface DevicesOverviewProps {
  sectionNav: React.ReactNode;
  /** Open the hierarchy at a selection key (gw:…, src:…, card:…/…, disc:…/…), or start the connect wizard. */
  onOpenHierarchy: (opts?: { key?: string; connect?: boolean }) => void;
  onOpenSection: (id: DevicesSectionId) => void;
}

const LAYER_ICON: Record<Layer, React.ReactNode> = {
  broker: <IconNetwork size={14} />,
  gateway: <IconGateway size={14} />,
  source: <IconRack size={14} />,
  card: <IconCard size={14} />,
  point: <IconSensor size={14} />,
};

/** Wall clock for "seen 12s ago", ticking every few seconds. 0 until mounted. */
function useClock(ms: number): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return now;
}

type PointFilter = "all" | "live" | "down" | "unmapped";

export function DevicesOverview({ sectionNav, onOpenHierarchy, onOpenSection }: DevicesOverviewProps) {
  const { registry, snapshot, loading, error, refresh, stream } = useEdge();
  const { navigateToMachine, setActiveTab } = useIndustrialData();
  const clock = useClock(5000);
  const now = Math.max(clock, snapshot ? Date.parse(snapshot.serverNow) : 0);
  const [pointFilter, setPointFilter] = useState<PointFilter>("all");

  const ix = useMemo(() => (registry ? buildIndex(registry, snapshot) : null), [registry, snapshot]);
  const totals = useMemo(() => (ix ? layerTotals(ix) : null), [ix]);
  const lanes = useMemo(() => (ix ? buildLanes(ix) : []), [ix]);
  const points = useMemo(() => (ix ? pointRows(ix) : []), [ix]);
  const breaks = useMemo<BreakRow[]>(() => {
    if (!ix) return [];
    const found: BreakRow[] = discoveredGateways(ix).map((d) => ({
      key: `d:${d.brokerId}/${d.gatewayId}`,
      layer: "gateway",
      name: d.gatewayId,
      path: ix.brokers.get(d.brokerId)?.name ?? d.brokerId,
      status: "waiting",
      tone: "info",
      reason: "Publishing, not registered: its data is not mapped to any machine",
      lastSeenAt: d.lastSeenAt,
      target: { kind: "hierarchy", key: `disc:${d.brokerId}/${d.gatewayId}` },
    }));
    return [...breakRows(ix), ...found];
  }, [ix]);

  const openMachine = (id: string) => navigateToMachine(id, "sensors");
  const openBreak = (r: BreakRow) => (r.target.kind === "mqtt" ? onOpenSection("mqtt") : onOpenHierarchy({ key: r.target.key }));

  const head = (status: React.ReactNode) => (
    <header className="ast-head pg-head">
      <div className="ast-head-main">
        <ol className="ast-crumbs" aria-label="Location">
          <li>Devices</li>
          <li>Overview</li>
        </ol>
        <div className="ast-title-row">
          <h1 className="ast-title">Edge network</h1>
          {status}
          {stream !== "open" && <StatusTag tone="warn" label={stream === "connecting" ? "Live feed connecting" : "Live feed retrying"} />}
        </div>
      </div>
      <div className="pg-actions">
        <PillButton variant="secondary" onClick={() => void refresh()}>
          Refresh registry
        </PillButton>
        <PillButton variant="primary" icon={<IconPlus size={13} />} onClick={() => onOpenHierarchy({ connect: true })} disabled={!registry}>
          Connect gateway
        </PillButton>
      </div>
    </header>
  );

  if (!ix || !totals) {
    return (
      <div className="pg-root ast-root pg-devices-root" aria-label="Devices overview">
        {head(null)}
        {sectionNav}
        <div className="ast-card ast-empty" role={error ? "alert" : "status"}>
          {loading || !error ? (
            "Loading device registry…"
          ) : (
            <>
              <strong>Device registry unavailable. Retry.</strong>
              <PillButton variant="secondary" onClick={() => void refresh()}>
                Retry
              </PillButton>
            </>
          )}
        </div>
      </div>
    );
  }

  const broken = lanes.filter((l) => l.breakAt && l.tone === "bad").length;
  const degraded = lanes.filter((l) => l.tone === "warn").length;
  const [sumTone, sumLabel]: [Tone, string] =
    lanes.length === 0
      ? ["idle", "No gateways"]
      : broken > 0
        ? ["bad", `${broken} of ${lanes.length} paths broken`]
        : degraded > 0
          ? ["warn", `${degraded} of ${lanes.length} paths degraded`]
          : lanes.every((l) => l.tone === "idle")
            ? ["idle", "All gateways disabled"]
            : ["good", "Data reaching ULTRON"];

  const metrics = snapshot?.metrics ?? null;
  const ptActive = activeOf(totals.point);
  const alerts = points.filter((p) => p.reading.status === "alert").length;
  const dangers = points.filter((p) => p.reading.status === "danger").length;
  const unmapped = points.filter((p) => !p.machine).length;

  return (
    <div className="pg-root ast-root pg-devices-root" aria-label="Devices overview">
      {head(<StatusTag tone={sumTone} label={sumLabel} />)}
      {sectionNav}

      {/* ------------------------------------------------ KPI strip */}
      <KpiCards className="pg-devices-kpis" label="Edge link summary">
        {(["broker", "gateway", "source", "point"] as Layer[]).map((layer) => {
          const c = totals[layer];
          const active = activeOf(c);
          const segs = linkSegments(c);
          const label = layer === "broker" ? "Brokers connected" : layer === "point" ? "Points live" : `${LAYER_LABEL[layer]}s online`;
          return (
            <KpiCard
              key={layer}
              label={label}
              value={nf.format(c.online)}
              unit={`of ${nf.format(active)}`}
              tone={countsTone(c)}
              footClassName="ast-kpi-foot ast-caption ast-num"
              foot={
                <>
                  {active > 0 && <SegmentBar segments={segs} label={segmentText(segs)} />}
                  {layer === "point"
                    ? `${nf.format(alerts)} alert · ${nf.format(dangers)} danger · ${nf.format(unmapped)} not mapped`
                    : layer === "source"
                      ? `${nf.format(c.online)} streaming · ${nf.format(activeOf(totals.card))} cards, ${nf.format(totals.card.online)} reporting`
                      : c.disabled > 0
                        ? `${nf.format(c.disabled)} disabled`
                        : active === 0
                          ? "None configured"
                          : segmentText(segs)}
                </>
              }
            />
          );
        })}
        <KpiCard
          label="Ingest throughput"
          value={metrics ? rate(metrics.messagesPerSecond) : "—"}
          unit="msg/s"
          footClassName="ast-kpi-foot ast-caption ast-num"
          foot={
            metrics
              ? `p50 ${metrics.latencyP50Ms !== null ? `${nf.format(Math.round(metrics.latencyP50Ms))} ms` : "—"} · ${nf.format(metrics.quarantined)} quarantined · last ${ago(metrics.lastMessageAt, now)}`
              : "Waiting for the ingest runtime"
          }
        />
      </KpiCards>

      {/* ------------------------------------------------ primary visual */}
      <section className="ast-card pg-devices-path" aria-label="Data path by gateway">
        <div className="ast-card-head">
          <h2 className="ast-card-title">Data path by gateway</h2>
          <span className="ast-caption">First broken layer marked · worst first</span>
        </div>
        {lanes.length === 0 ? (
          <div className="ast-empty pg-devices-empty">
            <strong>No gateways registered</strong>
            Connect the edge gateway that publishes the plant&rsquo;s racks, PLCs and SCADA to a broker.
            <PillButton variant="secondary" icon={<IconPlus size={13} />} onClick={() => onOpenHierarchy({ connect: true })}>
              Connect gateway
            </PillButton>
          </div>
        ) : (
          <div className="pg-devices-lanes" role="table" aria-label="Data path per gateway">
            <div className="pg-devices-lane pg-devices-lane-head" role="row">
              {LAYERS.map((layer) => {
                const c = totals[layer];
                return (
                  <div key={layer} className="pg-devices-col-head" role="columnheader">
                    <span className="pg-devices-col-name">
                      {LAYER_ICON[layer]}
                      {LAYER_LABEL[layer]}s
                    </span>
                    <span className="ast-num ast-caption">
                      {nf.format(c.online)} / {nf.format(activeOf(c))}
                    </span>
                  </div>
                );
              })}
              <div className="pg-devices-col-head" role="columnheader">
                <span className="pg-devices-col-name">Feeds</span>
              </div>
            </div>
            {lanes.map((lane) => (
              <LaneRow key={lane.gateway.id} lane={lane} now={now} onOpen={() => onOpenHierarchy({ key: `gw:${lane.gateway.id}` })} onMachine={openMachine} />
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------ breaks */}
      <section className="ast-card pg-table-card" aria-label="Where data stops">
        <div className="ast-card-head">
          <h2 className="ast-card-title">Where data stops</h2>
          <span className="ast-caption ast-num">{breaks.length === 0 ? "No broken links" : `${nf.format(breaks.length)} root causes`}</span>
        </div>
        {breaks.length === 0 ? (
          <p className="pg-devices-note">Every enabled broker, gateway, source and point is reporting.</p>
        ) : (
          <BreaksTable rows={breaks} now={now} onOpen={openBreak} />
        )}
      </section>

      {/* ------------------------------------------------ points */}
      <section className="ast-card pg-table-card" aria-label="Points and the machines they feed">
        <div className="ast-card-head pg-devices-points-head">
          <h2 className="ast-card-title">Points → machines</h2>
          <PillNav
            items={[
              { id: "all", label: `All ${points.length}` },
              { id: "live", label: `Live ${totals.point.online}` },
              { id: "down", label: `Not live ${ptActive - totals.point.online}` },
              { id: "unmapped", label: `Not mapped ${unmapped}` },
            ]}
            activeId={pointFilter}
            onChange={(id) => setPointFilter(id as PointFilter)}
          />
        </div>
        <PointsTable
          rows={points.filter((p) =>
            pointFilter === "live" ? p.link === "online" : pointFilter === "down" ? p.link !== "online" && p.link !== "disabled" : pointFilter === "unmapped" ? !p.machine : true,
          )}
          now={now}
          onOpen={(p) => onOpenHierarchy({ key: `card:${p.point.sourceId}/${p.point.slot}` })}
          onMachine={openMachine}
        />
      </section>

      {/* ------------------------------------------------ related */}
      <nav className="pg-devices-related" aria-label="Related pages">
        <span className="ast-caption">Related</span>
        <PillButton variant="secondary" onClick={() => onOpenHierarchy()}>
          Hierarchy · configure gateways, sources, cards
        </PillButton>
        <PillButton variant="secondary" onClick={() => onOpenSection("formats")}>
          Data formats
        </PillButton>
        <PillButton variant="secondary" onClick={() => onOpenSection("mqtt")}>
          MQTT diagnostics
        </PillButton>
        <PillButton variant="secondary" onClick={() => setActiveTab("assets")}>
          Assets
        </PillButton>
      </nav>
    </div>
  );
}

// ---------------------------------------------------------------- lane
function LaneRow({ lane, now, onOpen, onMachine }: { lane: Lane; now: number; onOpen: () => void; onMachine: (id: string) => void }) {
  const brokenIdx = lane.breakAt ? LAYERS.indexOf(lane.breakAt) : -1;
  return (
    <div className="pg-devices-lane" role="row" data-tone={lane.tone}>
      {LAYERS.map((layer, i) => {
        const c = lane.cells[layer];
        // Below a break nothing can arrive: draw it quiet rather than red.
        const beyond = brokenIdx >= 0 && i > brokenIdx;
        const tone: Tone = beyond ? "idle" : LINK_TONE[c.status];
        const isBreak = i === brokenIdx;
        const node = (
          <>
            <i className="pg-devices-dot" aria-hidden="true" />
            <span className="pg-devices-node-text">
              <span className="pg-devices-node-label ast-num">{c.label}</span>
              <span className="pg-devices-node-sub">{isBreak ? "Data stops here" : LINK_LABEL[c.status]}</span>
            </span>
          </>
        );
        return (
          <div key={layer} className="pg-devices-cell" role="cell" data-break={isBreak || undefined}>
            {i > 0 && <span className="pg-devices-wire" data-tone={tone} data-break={isBreak || undefined} aria-hidden="true" />}
            {layer === "gateway" ? (
              <button
                type="button"
                className="pg-devices-node pg-devices-node-btn"
                data-tone={tone}
                onClick={onOpen}
                aria-label={`Open gateway ${lane.gateway.code} in the hierarchy, ${LINK_LABEL[c.status]}`}
              >
                {node}
              </button>
            ) : (
              <span className="pg-devices-node" data-tone={tone} aria-label={`${LAYER_LABEL[layer]}: ${c.label}, ${isBreak ? "data stops here" : LINK_LABEL[c.status]}`}>
                {node}
              </span>
            )}
          </div>
        );
      })}
      <div className="pg-devices-cell pg-devices-feeds" role="cell">
        {lane.machines.length === 0 ? (
          <span className="ast-muted ast-caption">No machine mapped</span>
        ) : (
          lane.machines.map((m) => (
            <button key={m.id} type="button" className="pg-devices-machine" onClick={() => onMachine(m.id)} aria-label={`Open ${m.name} sensors`}>
              {m.name}
            </button>
          ))
        )}
      </div>
      {(lane.reason || lane.lastSeenAt) && (
        <div className="pg-devices-lane-foot ast-caption ast-num" data-tone={lane.tone}>
          {lane.reason && <span className="pg-devices-reason">{lane.reason}</span>}
          <span className="ast-muted">
            seen {ago(lane.lastSeenAt, now)}
            {lane.messages !== null ? ` · ${nf.format(lane.messages)} msgs` : ""}
            {lane.lost ? ` · ${nf.format(lane.lost)} lost` : ""}
          </span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- tables
function Chevron() {
  return (
    <svg className="pg-chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function BreaksTable({ rows, now, onOpen }: { rows: BreakRow[]; now: number; onOpen: (r: BreakRow) => void }) {
  const columns: Column<BreakRow>[] = [
    {
      key: "item",
      header: "Link",
      render: (r) => (
        <span className="pg-devices-lead">
          <span className="ast-badge" data-tone={r.tone}>
            {LAYER_ICON[r.layer]}
          </span>
          <span className="ast-cell-stack">
            <span className="ast-cell-title">{r.name}</span>
            <span className="ast-cell-sub">{LAYER_LABEL[r.layer]}</span>
          </span>
        </span>
      ),
    },
    { key: "path", header: "Path", render: (r) => <span className="ast-cell-text ast-num">{r.path}</span> },
    { key: "state", header: "State", render: (r) => <StatusTag tone={r.tone} label={r.tone === "info" ? "Not registered" : LINK_LABEL[r.status]} /> },
    { key: "reason", header: "Reason", render: (r) => <span className="ast-cell-text pg-wrap">{r.reason}</span> },
    { key: "seen", header: "Last data", render: (r) => <span className="ast-num ast-muted">{ago(r.lastSeenAt, now)}</span> },
    {
      key: "open",
      header: "",
      width: "120px",
      render: (r) => (
        <span className="pg-devices-open">
          {r.target.kind === "mqtt" ? "MQTT" : "Hierarchy"}
          <Chevron />
        </span>
      ),
    },
  ];
  return <Table className="ast-table" columns={columns} data={rows} keyExtractor={(r) => r.key} onRowClick={onOpen} />;
}

function PointsTable({ rows, now, onOpen, onMachine }: { rows: PointRow[]; now: number; onOpen: (r: PointRow) => void; onMachine: (id: string) => void }) {
  if (rows.length === 0) return <p className="pg-devices-note">No points in this filter.</p>;
  const columns: Column<PointRow>[] = [
    {
      key: "point",
      header: "Point",
      render: (r) => (
        <span className="pg-devices-lead">
          <span className="ast-badge" data-tone={READING_TONE[r.reading.status]}>
            <IconSensor size={14} />
          </span>
          <span className="ast-cell-stack">
            <span className="ast-cell-title ast-num">{r.point.tag}</span>
            <span className="ast-cell-sub">{r.point.name}</span>
          </span>
        </span>
      ),
    },
    {
      key: "path",
      header: "Gateway › source · card · ch",
      render: (r) => (
        <span className="ast-cell-text ast-num">
          {r.gateway?.code ?? "—"} › {r.source?.code ?? "—"} · {r.point.slot} · {r.point.channel}
        </span>
      ),
    },
    {
      key: "value",
      header: "Reading",
      render: (r) =>
        r.reading.value !== null || r.reading.display ? (
          <span className="ast-num">
            {r.reading.display ?? nf.format(r.reading.value as number)}
            {r.reading.unit && <span className="ast-unit">{r.reading.unit}</span>}
          </span>
        ) : (
          <span className="ast-muted">—</span>
        ),
    },
    { key: "state", header: "State", render: (r) => <StatusTag tone={READING_TONE[r.reading.status]} label={READING_LABEL[r.reading.status]} /> },
    { key: "updated", header: "Updated", render: (r) => <span className="ast-num ast-muted">{ago(r.reading.updatedAt, now)}</span> },
    {
      key: "feeds",
      header: "Feeds",
      render: (r) =>
        r.machine ? (
          <button
            type="button"
            className="pg-devices-machine"
            onClick={(e) => {
              e.stopPropagation();
              onMachine(r.machine!.id);
            }}
            onKeyDown={(e) => e.stopPropagation()}
            aria-label={`Open ${r.machine.name} sensors${r.point.signalTag ? `, signal ${r.point.signalTag}` : ""}`}
          >
            {r.machine.name}
            {r.point.signalTag && <span className="pg-devices-machine-sig ast-num">{r.point.signalTag}</span>}
          </button>
        ) : (
          <span className="ast-muted ast-caption">Not mapped</span>
        ),
    },
  ];
  return <Table className="ast-table" columns={columns} data={rows} keyExtractor={(r) => r.point.id} onRowClick={onOpen} />;
}
