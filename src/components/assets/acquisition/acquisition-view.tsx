"use client";

import React, { useMemo, useState } from "react";
import { PillButton, PillNav } from "@/components/ui";
import { SOURCE_KIND_LABEL, type MachineAcquisition, type MachineLivePoint, type SourceKind } from "@/types/edge";
import { naturalCompare } from "@/lib/edge-format";
import type { KilnSimulation } from "@/components/assets/kiln-seals-simulation";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { IconGateway, SourceKindIcon } from "@/components/devices/hierarchy/edge-icons";
import { SegmentBar, Spark, StatusTag, type Tone } from "../assets-shell-ui";
import type { AssetMachine } from "../assets-data";
import { RackView } from "../rack-view";
import { hardwareCountLine } from "../rack-data";
import { useMachineCatalog } from "../use-machine-catalog";
import { GatewayCalculated, calculatedSensors } from "../rack-calculated";
import { HISTORY_LEN, useMachineAcquisition } from "./use-machine-acquisition";
import "./acquisition.css";

/* ==========================================================================
   Machine › Rack
     Acquisition: the edge chain that feeds this machine, read from the
                  registry and the brokers: gateway → source → card → channel.
     Cabinet:     the hardware cabinet model (RackView, unchanged).
   ========================================================================== */

type RackTabView = "acquisition" | "cabinet";

export function MachineRackTab({ machine, simulation }: { machine: AssetMachine; simulation?: KilnSimulation }) {
  const acq = useMachineAcquisition(machine.id);
  const [chosen, setChosen] = useState<RackTabView | null>(null);
  const hasPoints = (acq.data?.points.length ?? 0) > 0;
  const view: RackTabView = chosen ?? (acq.data && !hasPoints ? "cabinet" : "acquisition");

  return (
    <div className="acq-tab">
      <PillNav
        items={[
          { id: "acquisition", label: "Acquisition" },
          { id: "cabinet", label: "Cabinet" },
        ]}
        activeId={view}
        onChange={(id) => setChosen(id as RackTabView)}
      />
      {view === "cabinet" ? (
        <RackView machine={machine} simulation={simulation} />
      ) : (
        <AcquisitionView machine={machine} simulation={simulation} />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- model */

type Severity = "normal" | "alert" | "danger";

interface Row {
  p: MachineLivePoint;
  /** Where the shown value comes from. */
  origin: "mqtt" | "sim" | "none";
  severity: Severity | null;
  value: number | null;
  display: string | null;
  unit: string | null;
  spark: number[];
}

const SEV_TONE: Record<Severity, Tone> = { normal: "good", alert: "warn", danger: "bad" };
const SEV_RANK: Record<Severity, number> = { normal: 0, alert: 1, danger: 2 };
const STATE_LABEL = { normal: "Normal", alert: "Alert", danger: "Danger", stale: "Stale", nodata: "No data" } as const;

const LINK: Record<MachineAcquisition["gateways"][number]["state"], { tone: Tone; label: string }> = {
  online: { tone: "good", label: "Online" },
  stale: { tone: "warn", label: "Stale" },
  offline: { tone: "bad", label: "Offline" },
  waiting: { tone: "idle", label: "Waiting for data" },
  disabled: { tone: "idle", label: "Disabled" },
};

const rowTone = (r: Row): Tone => (r.severity ? SEV_TONE[r.severity] : "idle");

function fmt(v: number): string {
  const a = Math.abs(v);
  return v.toFixed(a >= 1000 ? 0 : a >= 100 ? 1 : 2);
}

function ago(iso: string | null, now: number): string {
  if (!iso) return "—";
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 2) return "now";
  if (s < 60) return `${s} s ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

const srcKey = (p: MachineLivePoint) => p.source.id;
const cardKey = (p: MachineLivePoint) => `${p.source.id}\u0000${p.card}`;

function buildRows(data: MachineAcquisition, history: Record<string, number[]>, simulation?: KilnSimulation): Row[] {
  const frame = simulation?.frame;
  return data.points
    .map((p): Row => {
      const live = p.live;
      if (live.state !== "nodata") {
        const severity = live.state === "normal" || live.state === "alert" || live.state === "danger" ? live.state : null;
        return { p, origin: "mqtt", severity, value: live.value, display: live.display, unit: live.unit ?? p.unit, spark: history[p.pointId] ?? [] };
      }
      // KLN-01: the kiln simulation is the live source when MQTT has nothing.
      const tag = p.signalTag ?? p.tag;
      const sig = frame ? frame.signals[tag] : undefined;
      if (frame && sig) {
        const severity: Severity = sig.status === "Critical" ? "danger" : sig.status === "Advisory" ? "alert" : "normal";
        return {
          p,
          origin: "sim",
          severity,
          value: sig.value,
          display: sig.value === null ? sig.display : null,
          unit: p.unit,
          spark: (frame.history[tag] ?? []).slice(-HISTORY_LEN),
        };
      }
      return { p, origin: "none", severity: null, value: null, display: null, unit: p.unit, spark: [] };
    })
    .sort(
      (a, b) =>
        naturalCompare(a.p.source.code, b.p.source.code) ||
        naturalCompare(a.p.card, b.p.card) ||
        naturalCompare(a.p.channel, b.p.channel),
    );
}

function worst(rows: Row[]): Severity | null {
  let w: Severity | null = null;
  for (const r of rows) if (r.severity && (!w || SEV_RANK[r.severity] > SEV_RANK[w])) w = r.severity;
  return w;
}

interface SourceGroup {
  id: string;
  code: string;
  name: string;
  kind: SourceKind;
  protocol: string;
  gatewayName: string;
  cards: { key: string; card: string; cardType: string | null; model: string | null; note: string | null; rows: Row[] }[];
}

function groupSources(rows: Row[]): SourceGroup[] {
  const out = new Map<string, SourceGroup>();
  for (const r of rows) {
    const { source, gateway } = r.p;
    let g = out.get(source.id);
    if (!g) {
      g = { id: source.id, code: source.code, name: source.name, kind: source.kind, protocol: source.protocol, gatewayName: gateway.name, cards: [] };
      out.set(source.id, g);
    }
    let c = g.cards.find((x) => x.card === r.p.card);
    if (!c) {
      const info = r.p.cardInfo;
      c = { key: cardKey(r.p), card: r.p.card, cardType: info?.type ?? null, model: info?.model ?? null, note: info?.note ?? null, rows: [] };
      g.cards.push(c);
    }
    // Registry type first; a gateway that reports one fills a card typed nowhere else.
    c.cardType ??= r.p.live.cardType;
    c.rows.push(r);
  }
  return [...out.values()];
}

/* ---------------------------------------------------------------- view */

function AcquisitionView({ machine, simulation }: { machine: AssetMachine; simulation?: KilnSimulation }) {
  const { data, history, loading, error } = useMachineAcquisition(machine.id);
  // The DB catalog: the same sensor total every other page shows.
  const catalog = useMachineCatalog(machine);
  const calculated = useMemo(() => calculatedSensors(catalog.sensors), [catalog.sensors]);
  const [sourceId, setSourceId] = useState<string>("all");
  const [cardFilter, setCardFilter] = useState<string | null>(null);

  const rows = useMemo(() => (data ? buildRows(data, history, simulation) : []), [data, history, simulation]);
  const sources = useMemo(() => groupSources(rows), [rows]);

  if (!data) {
    return (
      <div className="acq-card acq-empty" role="status">
        {error ? `Acquisition chain unavailable: ${error}` : loading ? "Loading acquisition chain…" : null}
      </div>
    );
  }
  if (data.points.length === 0) return <AcquisitionEmpty machineId={machine.id} />;

  const now = Date.parse(data.serverNow);
  const activeSource = sources.find((s) => s.id === sourceId) ?? null;
  const shownSources = activeSource ? [activeSource] : sources;
  const tableRows = rows.filter(
    (r) => (!activeSource || srcKey(r.p) === activeSource.id) && (!cardFilter || cardKey(r.p) === cardFilter),
  );

  return (
    <div className="acq-page">
      {error && (
        <p className="acq-note" role="status" data-tone="warn">
          Last refresh failed: {error}. Showing the previous reading.
        </p>
      )}
      <Summary data={data} rows={rows} now={now} />

      <div className="acq-bar">
        <PillNav
          wrap
          items={[
            { id: "all", label: "All" },
            ...sources.map((s) => ({ id: s.id, label: `${s.code} · ${SOURCE_KIND_LABEL[s.kind]}` })),
          ]}
          activeId={activeSource ? activeSource.id : "all"}
          onChange={(id) => {
            setSourceId(id);
            setCardFilter(null);
          }}
        />
        <span className="acq-count acq-num">
          {hardwareCountLine(sources.length, sources.reduce((n, s) => n + s.cards.length, 0), rows.length, {
            total: catalog.sensors.length,
            calculated: calculated.length,
          })}
        </span>
        {rows.some((r) => r.origin === "sim") && (
          <span className="acq-legend" aria-label="Indicator legend">
            <span><i className="acq-led" data-tone="good" /> MQTT</span>
            <span><i className="acq-led" data-tone="good" data-origin="sim" /> Simulated</span>
          </span>
        )}
      </div>

      <div className="acq-chassis-list">
        {shownSources.map((s) => (
          <Chassis key={s.id} source={s} selected={cardFilter} onSelect={(k) => setCardFilter((cur) => (cur === k ? null : k))} />
        ))}
      </div>

      {!activeSource && <GatewayCalculated sensors={calculated} />}

      <ChannelTable rows={tableRows} showSource={!activeSource} now={now} cardFilter={cardFilter} onClearFilter={() => setCardFilter(null)} />
    </div>
  );
}

function AcquisitionEmpty({ machineId }: { machineId: string }) {
  let goDevices: (() => void) | null = null;
  try {
    const ctx = useIndustrialData();
    goDevices = () => {
      try {
        sessionStorage.setItem("ultron.devices.section", "hierarchy");
      } catch {
        /* storage unavailable */
      }
      ctx.setActiveTab("devices");
    };
  } catch {
    goDevices = null;
  }
  return (
    <div className="acq-card acq-empty">
      <span className="acq-empty-icon" aria-hidden="true">
        <IconGateway size={20} />
      </span>
      <strong>No channels mapped to {machineId}</strong>
      <span>Connect a gateway and map its channels to this machine&apos;s signals in Devices › Hierarchy.</span>
      {goDevices && (
        <PillButton variant="primary" onClick={goDevices}>
          Open Devices
        </PillButton>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- summary */

function Summary({ data, rows, now }: { data: MachineAcquisition; rows: Row[]; now: number }) {
  const mqtt = rows.filter((r) => r.origin === "mqtt" && r.severity).length;
  const sim = rows.filter((r) => r.origin === "sim").length;
  const count = (s: Severity) => rows.filter((r) => r.severity === s).length;
  const normal = count("normal");
  const alert = count("alert");
  const danger = count("danger");
  const silent = rows.length - normal - alert - danger;
  // One card per gateway: link state, where the readings come from, and channel
  // health. Source / card / channel counts live in the source bar below.
  return (
    <div className="acq-head">
      {data.gateways.map((g) => {
        const simulated = g.state === "waiting" && sim > 0;
        const link = simulated ? { tone: "info" as Tone, label: "Simulated" } : LINK[g.state];
        return (
          <section key={g.id} className="acq-card acq-gw" aria-label={`Gateway ${g.code}`}>
            <div className="acq-card-top">
              <span className="acq-tile" aria-hidden="true">
                <IconGateway size={16} />
              </span>
              <StatusTag tone={link.tone} label={link.label} />
            </div>
            <div>
              <h3 className="acq-title">{g.name}</h3>
              <div className="acq-code">{g.code}</div>
            </div>
            <dl className="acq-facts">
              <div>
                <dt>Broker</dt>
                <dd>{g.brokerName ?? "Not assigned"}</dd>
              </div>
              <div>
                <dt>IP</dt>
                <dd className="acq-num">{g.ip ?? "—"}</dd>
              </div>
              <div>
                <dt>Feed</dt>
                <dd className="acq-num">
                  {mqtt > 0 ? `MQTT · ${mqtt} live` : sim > 0 ? `Simulation · ${sim} ch` : "None yet"}
                  {mqtt > 0 && sim > 0 ? ` · ${sim} simulated` : ""}
                </dd>
              </div>
              <div>
                <dt>Last seen</dt>
                <dd className="acq-num">{g.lastSeenAt ? ago(g.lastSeenAt, now) : "Never"}</dd>
              </div>
            </dl>
            <div className="acq-health">
              <SegmentBar
                label={`${normal} normal, ${alert} alert, ${danger} danger, ${silent} without a reading`}
                segments={[
                  { id: "n", value: normal, tone: "good" },
                  { id: "a", value: alert, tone: "warn" },
                  { id: "d", value: danger, tone: "bad" },
                  { id: "s", value: silent, tone: "idle" },
                ]}
              />
              <span className="acq-health-text acq-num">
                {normal} normal · {alert} alert · {danger} danger{silent ? ` · ${silent} no reading` : ""}
              </span>
            </div>
          </section>
        );
      })}
    </div>
  );
}


/* ---------------------------------------------------------------- chassis */

function Chassis({ source, selected, onSelect }: { source: SourceGroup; selected: string | null; onSelect: (key: string) => void }) {
  const isRack = source.kind === "rack";
  const channels = source.cards.reduce((n, c) => n + c.rows.length, 0);
  return (
    <section className="acq-card acq-src" aria-label={`${source.code} ${SOURCE_KIND_LABEL[source.kind]}`}>
      <header className="acq-src-head">
        <span className="acq-tile" aria-hidden="true">
          <SourceKindIcon kind={source.kind} size={16} />
        </span>
        <div className="acq-src-id">
          <h3 className="acq-title">
            {source.code} <span className="acq-muted">· {source.name}</span>
          </h3>
          <div className="acq-muted">
            {SOURCE_KIND_LABEL[source.kind]} · {source.protocol} · {source.cards.length} {source.cards.length === 1 ? "card" : "cards"} · {channels}{" "}
            {channels === 1 ? "channel" : "channels"} mapped
          </div>
        </div>
      </header>
      <div className="acq-strip" data-kind={isRack ? "rack" : "module"} role="group" aria-label={`Cards of ${source.code}`}>
        {source.cards.map((c) => {
          const w = worst(c.rows);
          const isSel = selected === c.key;
          return (
            <button
              key={c.key}
              type="button"
              className="acq-mod"
              aria-pressed={isSel}
              data-tone={w ? SEV_TONE[w] : "idle"}
              onClick={() => onSelect(c.key)}
              title={isSel ? "Show all channels" : `Show channels of card ${c.card}${c.model ? ` (${c.model})` : ""}`}
            >
              <span className="acq-mod-slot">
                Card {c.card}
                {c.note && <span className="acq-muted"> · {c.note}</span>}
              </span>
              {c.model && <span className="acq-mod-model">{c.model}</span>}
              <span className="acq-mod-type">{c.cardType ?? "Type not set"}</span>
              <span className="acq-mod-leds" aria-hidden="true">
                {c.rows.map((r) => (
                  <i key={r.p.pointId} className="acq-led" data-tone={rowTone(r)} data-origin={r.origin === "sim" ? "sim" : undefined} />
                ))}
              </span>
              <span className="acq-mod-foot">
                <span>
                  {c.rows.length} ch
                </span>
                <span className="acq-mod-state">{w ? STATE_LABEL[w] : "No data"}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- table */

function ChannelTable({
  rows,
  showSource,
  now,
  cardFilter,
  onClearFilter,
}: {
  rows: Row[];
  showSource: boolean;
  now: number;
  cardFilter: string | null;
  onClearFilter: () => void;
}) {
  let lastGroup = "";
  return (
    <section className="acq-card acq-table-card" aria-label="Channels">
      <header className="acq-table-head">
        <h3 className="acq-title">Channels</h3>
        <span className="acq-muted">{rows.length} {rows.length === 1 ? "point" : "points"}</span>
        {cardFilter && (
          <PillButton variant="secondary" onClick={onClearFilter} className="acq-clear">
            Show all cards
          </PillButton>
        )}
      </header>
      <div className="ui-table-container">
        <table className="ui-table acq-table">
          <thead>
            <tr>
              <th>Point</th>
              <th>Path</th>
              <th className="acq-r">Value</th>
              <th className="acq-trend-col">Trend</th>
              <th className="acq-r">Alert / danger</th>
              <th>State</th>
              <th className="acq-r">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const p = r.p;
              const group = cardKey(p);
              const head = group !== lastGroup;
              lastGroup = group;
              const tone = rowTone(r);
              const unit = r.unit ?? "";
              return (
                <React.Fragment key={p.pointId}>
                  {head && (
                    <tr className="acq-group">
                      <td colSpan={7}>
                        {showSource && <b>{p.source.code}</b>}
                        {showSource && " · "}
                        Card {p.card}
                        {p.cardInfo?.model && <> · {p.cardInfo.model}</>}
                        {(p.cardInfo?.type ?? p.live.cardType) && <span className="acq-muted"> · {p.cardInfo?.type ?? p.live.cardType}</span>}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td>
                      <div className="acq-point">
                        <span className="acq-badge" data-tone={tone} aria-hidden="true">
                          <SourceKindIcon kind={p.source.kind} size={14} />
                        </span>
                        <span className="acq-point-id">
                          <span className="acq-point-tag">{p.tag}</span>
                          <span className="acq-muted">{p.name}</span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="acq-num">
                        Card {p.card} · Ch {p.channel}
                      </span>
                      {p.address && <div className="acq-muted acq-num">{p.address}</div>}
                    </td>
                    <td className="acq-r">
                      <Value r={r} />
                    </td>
                    <td className="acq-trend-col">
                      {r.spark.length >= 2 ? (
                        <Spark values={r.spark} unit={unit} height={28} tone={tone === "idle" ? "info" : tone} ariaLabel={`${p.tag} last ${r.spark.length} samples`} />
                      ) : (
                        <span className="acq-muted">—</span>
                      )}
                    </td>
                    <td className="acq-r acq-num">
                      {p.alertLimit === null && p.dangerLimit === null ? (
                        <span className="acq-muted">—</span>
                      ) : (
                        <>
                          {p.alertLimit ?? "—"} / {p.dangerLimit ?? "—"} <span className="acq-muted">{p.unit}</span>
                        </>
                      )}
                    </td>
                    <td>
                      {r.origin === "sim" ? (
                        <StatusTag tone="info" label="Simulated" />
                      ) : (
                        <StatusTag tone={tone} label={STATE_LABEL[p.live.state]} />
                      )}
                    </td>
                    <td className="acq-r acq-num acq-muted">{r.origin === "mqtt" ? ago(p.live.updatedAt, now) : "—"}</td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Value({ r }: { r: Row }) {
  if (r.value === null && !r.display) return <span className="acq-muted">—</span>;
  const tone = r.severity === "alert" ? "warn" : r.severity === "danger" ? "bad" : undefined;
  const stale = r.origin === "mqtt" && r.p.live.state === "stale";
  return (
    <span className="acq-value" data-tone={tone} data-stale={stale || undefined}>
      {r.value !== null ? fmt(r.value) : r.display}
      {r.value !== null && r.unit && <span className="acq-unit"> {r.unit}</span>}
    </span>
  );
}
