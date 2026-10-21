"use client";

/* ==========================================================================
   Machine › Rack — page sections. One card per section, one dominant visual
   or one table each. Monochrome by default: status colour appears only on
   something that is actually suspect / invalid / in alarm.
   ========================================================================== */

import React from "react";
import { PillButton, PillNav, Table, type Column } from "@/components/ui";
import { StatusTag } from "./assets-shell-ui";
import type { CabinetChannel, CabinetModule, MachineRackInfo } from "@shared/lib/rack-data";
import { RackEnclosure } from "./rack-enclosure";
import {
  ModuleGlyph,
  SLOT_HP,
  STATE_COLOR,
  channelState,
  moduleState,
  parseRate,
  processState,
  stateSeverity,
  type SlotState,
} from "./eurocard-module";
import { SIGNAL_LABEL, STATE_TONE, rowKey, type ChannelRow, type RackModel } from "./rack-model";
import { signalTypeOf, type RackSpecSet } from "./rack-spec";
import { displayName } from "@/lib/display-name";
import { QUALITY_LABEL } from "./sensors-model";

export interface RackLinks {
  sensor: (tag: string) => void;
  devices: (selection?: string) => void;
  sub: (page: "sensors" | "trends" | "diagnosis") => void;
}

const orDash = (v: string | null | undefined) => (v && v.trim() ? v : "—");
const pad2 = (n: number) => String(n).padStart(2, "0");
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

/** Status only when something is wrong; a healthy state is muted text. */
function State({ state, ok = "Normal", label }: { state: SlotState; ok?: string; label?: string }) {
  if (state === "empty") return <span className="ast-muted">{label ?? "Spare"}</span>;
  if (state === "ok") return <span className="ast-muted">{label ?? ok}</span>;
  return <StatusTag tone={STATE_TONE[state]} label={label ?? stateSeverity(state)} />;
}

function Glyph({ type, state, empty = false }: { type: CabinetModule["sensorType"]; state: SlotState; empty?: boolean }) {
  const alert = state === "warn" || state === "bad";
  return (
    <span className={`ast-badge pg-rack-badge ${empty ? "is-empty" : ""}`} data-tone={alert ? STATE_TONE[state] : undefined} aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <ModuleGlyph type={type} empty={empty} />
      </svg>
    </span>
  );
}

function CardHead({ title, meta, right }: { title: string; meta?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="ast-card-head pg-rack-card-head">
      <div className="pg-rack-card-title">
        <h4 className="ast-card-title">{title}</h4>
        {meta && <span className="ast-caption">{meta}</span>}
      </div>
      {right}
    </div>
  );
}

function Value({ v, unit }: { v: React.ReactNode; unit?: string }) {
  return (
    <span className="pg-analysis-r ast-num">
      {v}
      {unit && <span className="ast-unit">{unit}</span>}
    </span>
  );
}

function LinkButton({ label, title, onClick }: { label: string; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="pg-rack-link"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {label}
    </button>
  );
}

/** Chassis switcher: one pill per chassis of the machine. */
export function ChassisSwitch({ racks, activeId, onChange }: { racks: MachineRackInfo[]; activeId: string; onChange: (id: string) => void }) {
  if (racks.length < 2) return null;
  return <PillNav items={racks.map((r) => ({ id: r.rackId, label: r.code }))} activeId={activeId} onChange={onChange} wrap className="pg-rack-switch" />;
}

/* ================================================================== */
/* Chassis — elevation drawing + selected card                         */
/* ================================================================== */

export function RackChassis({
  rack,
  racks,
  model,
  selected,
  selectedChannel,
  onSelect,
  onRack,
  links,
  formatTime,
  stampsOf,
}: {
  rack: MachineRackInfo;
  racks: MachineRackInfo[];
  model: RackModel;
  selected: CabinetModule | undefined;
  selectedChannel: CabinetChannel | undefined;
  onSelect: (position: number, channel?: string | null) => void;
  onRack: (id: string) => void;
  links: RackLinks;
  /** Formats an ISO stamp in the site's time zone (never on the server). */
  formatTime?: (iso: string) => string;
  /** Live-engine source / receipt stamps for a tag, already formatted (SW-DATA-01). */
  stampsOf?: (tag: string) => { source: string; received: string } | null;
}) {
  const rows = model.rowsByRack.get(rack.rackId) ?? [];
  const selectedRow = rows.find((r) => r.module === selected && r.ch === selectedChannel);
  const st = moduleState(selected);
  const showNote = selected?.note && !new RegExp(`slot\\s*0*${selected.position}$`, "i").test(selected.note);
  return (
    <section className="ast-card pg-rack-chassis" aria-label={`Card frame ${rack.code}`}>
      <CardHead
        title={`${rack.code} · ${rack.kindLabel}`}
        meta={`${rack.positions} slots, one sensor each · ${rack.modules.length} ${model.proposed ? "planned" : "wired"} · ${rack.positions - rack.modules.length} spare${rack.protocol ? ` · ${rack.protocol}` : ""}`}
        right={<ChassisSwitch racks={racks} activeId={rack.rackId} onChange={onRack} />}
      />
      <div className="pg-rack-chassis-body">
        <div className="pg-rack-drawing">
          <div className="mx-canvas pg-rack-canvas">
            <RackEnclosure
              rack={rack}
              selectedPosition={selected?.position ?? null}
              selectedChannel={selectedChannel?.channel ?? null}
              onSelectPosition={(p) => onSelect(p, null)}
              psuState={model.record.psu.state}
              psuVolts={model.record.psu.volts}
              ptpState={model.record.ptp.state}
            />
          </div>
          <div className="pg-rack-legend" aria-hidden="true">
            {(["ok", "warn", "bad"] as SlotState[]).map((s) => (
              <span key={s}>
                <i style={{ background: STATE_COLOR[s] }} />
                {SIGNAL_LABEL[s]}
              </span>
            ))}
            <span>
              <i className="is-empty" />
              Spare
            </span>
          </div>
        </div>

        <div className="pg-rack-inspect" aria-label={selected ? `Card ${selected.code}` : "Card"}>
          {selected ? (
            <>
              <div className="pg-rack-inspect-head">
                <span className="pg-rack-kicker ast-num">
                  Slot {selected.positionLabel} · card {selected.code}
                  {showNote ? ` · on the drawings as ${selected.note!.toLowerCase()}` : ""}
                </span>
                <span className="pg-rack-inspect-title">
                  {selected.model ?? `Card ${selected.code}`}
                  <State state={st} />
                </span>
              </div>
              <dl className="pg-rack-dl">
                <dt>Card type</dt>
                <dd>{orDash(selected.cardType)}</dd>
                <dt>Takes in</dt>
                <dd>{signalTypeOf(selected.cardType, rack.protocol)}</dd>
                <dt>Input on card</dt>
                <dd className="ast-num">
                  {selected.channels[0]?.channel ?? "—"} of {selected.cardCapacity}
                </dd>
              </dl>

              <ul className="pg-rack-chlist" aria-label={`Inputs of card ${selected.code}`}>
                {selected.channels.map((ch) => {
                  const on = ch.channel === selectedChannel?.channel;
                  const s = channelState(ch);
                  const row = rows.find((r) => r.module === selected && r.ch === ch);
                  return (
                    <li key={ch.channel}>
                      <button type="button" className="pg-rack-chlist-row" aria-pressed={on} onClick={() => onSelect(selected.position, ch.channel)}>
                        <span className="pg-rack-chlist-ch ast-num">{/^\d+$/.test(ch.channel) ? pad2(Number(ch.channel)) : ch.channel}</span>
                        <span className="pg-rack-chlist-tag" title={`${ch.tag} · ${ch.parameter}`}>
                          {s !== "ok" && <span className="ast-chip-dot" data-tone={STATE_TONE[s]} aria-label={SIGNAL_LABEL[s]} />}
                          <span>{displayName(ch.parameter || ch.tag)}</span>
                        </span>
                        <span className="pg-rack-chlist-val ast-num">
                          {row?.ch.currentValue || "—"}
                          {row?.ch.currentValue && ch.unit && <span className="ast-unit">{ch.unit}</span>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {selectedChannel && (
                <>
                  <dl className="pg-rack-dl">
                    <dt>Input</dt>
                    <dd title={selectedChannel.tag}>
                      <span className="ast-num">{selectedChannel.channel}</span> · {displayName(selectedChannel.parameter || selectedChannel.tag)}
                    </dd>
                    <dt>Instrument</dt>
                    <dd>{orDash(selectedChannel.instrument)}</dd>
                    <dt>How often</dt>
                    <dd className="ast-num">{parseRate(selectedChannel.sampleRate)}</dd>
                    <dt>Data address</dt>
                    <dd className="ast-num">{orDash(selectedChannel.address)}</dd>
                    <dt>Reading quality</dt>
                    <dd>{selectedChannel.quality ? ((QUALITY_LABEL as Record<string, string>)[selectedChannel.quality] ?? selectedChannel.quality) : "—"}</dd>
                    {selectedRow?.point && (
                      <>
                        <dt>Name in the plant system</dt>
                        <dd className="ast-num">{selectedRow.point.sourceTag || "Not recorded"}</dd>
                        <dt>Security zone</dt>
                        <dd>{selectedRow.point.source.securityZone || selectedRow.point.gateway.securityZone || "Not recorded"}</dd>
                        <dt>Measured at</dt>
                        <dd className="ast-num">{stampsOf?.(selectedChannel.tag)?.source ?? "Not recorded (only the time it arrived)"}</dd>
                        <dt>Received at</dt>
                        <dd className="ast-num">
                          {stampsOf?.(selectedChannel.tag)?.received ?? (selectedRow.point.live.updatedAt
                            ? formatTime
                              ? formatTime(selectedRow.point.live.updatedAt)
                              : selectedRow.point.live.updatedAt
                            : "No reading received yet")}
                        </dd>
                      </>
                    )}
                  </dl>
                  <div className="pg-rack-actions">
                    <PillButton variant="secondary" onClick={() => links.sensor(selectedChannel.tag)}>
                      Open sensor
                    </PillButton>
                    {selectedRow?.point && (
                      <PillButton variant="secondary" onClick={() => links.devices(`card:${selectedRow.point!.source.id}/${selectedRow.point!.card}`)}>
                        Open network device
                      </PillButton>
                    )}
                  </div>
                </>
              )}
            </>
          ) : (
            <span className="ast-muted">No card is recorded in this frame.</span>
          )}
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/* Slots — every position, fitted or spare                            */
/* ================================================================== */

interface SlotRow {
  position: number;
  module: CabinetModule | null;
}

export function RackSlots({
  rack,
  racks,
  selectedPosition,
  onSelect,
  onRack,
  proposed = false,
}: {
  rack: MachineRackInfo;
  racks: MachineRackInfo[];
  selectedPosition: number | null;
  onSelect: (position: number) => void;
  onRack: (id: string) => void;
  /** Pyro line: a proposed allocation pending the walkdown, not fitted hardware. */
  proposed?: boolean;
}) {
  const [showSpare, setShowSpare] = React.useState(false);
  const all: SlotRow[] = Array.from({ length: rack.positions }, (_, i) => ({
    position: i + 1,
    module: rack.modules.find((m) => m.position === i + 1) ?? null,
  }));
  const slots = showSpare ? all : all.filter((s) => s.module);
  const spare = rack.positions - rack.modules.length;
  const columns: Column<SlotRow>[] = [
    { key: "slot", header: "Slot", width: "64px", render: (r) => <span className="ast-num">{pad2(r.position)}</span> },
    {
      key: "module",
      header: "Card",
      render: (r) => {
        const m = r.module;
        return (
          <span className="pg-rack-item">
            <Glyph type={m?.sensorType ?? "STS"} state={moduleState(m ?? undefined)} empty={!m} />
            <span className="ast-cell-stack">
              <span className={m ? "ast-cell-title" : "ast-muted"}>{m ? m.model ?? `Card ${m.code}` : "Spare"}</span>
              <span className="ast-cell-sub">{m ? m.cardType ?? "Type not recorded" : `${SLOT_HP} HP wide`}</span>
            </span>
          </span>
        );
      },
    },
    { key: "signal", header: "Takes in", render: (r) => (r.module ? <span className="ast-cell-sub">{signalTypeOf(r.module.cardType, rack.protocol)}</span> : <span className="ast-muted">—</span>) },
    {
      key: "channel",
      header: "Input on card",
      width: "96px",
      render: (r) => (r.module ? <Value v={`${r.module.channels[0]?.channel ?? "—"} of ${r.module.cardCapacity}`} /> : <span className="pg-analysis-r ast-muted">—</span>),
    },
    {
      key: "sensor",
      header: "Sensor",
      render: (r) => {
        const c = r.module?.channels[0];
        return c ? (
          <span className="ast-cell-sub" title={`${c.tag} · ${c.parameter}`}>
            {displayName(c.parameter || c.tag)}
          </span>
        ) : (
          <span className="ast-cell-sub">—</span>
        );
      },
    },
    { key: "state", header: "State", width: "112px", render: (r) => <State state={moduleState(r.module ?? undefined)} /> },
  ];
  return (
    <section className="ast-card pg-table-card" aria-label={`Slots of ${rack.code}`}>
      <CardHead
        title={`Slots · ${rack.code}`}
        meta={`${rack.modules.length} ${proposed ? "planned" : "in use"} · ${spare} spare`}
        right={
          <div className="pg-actions">
            {spare > 0 && (
              <PillButton variant="secondary" onClick={() => setShowSpare((v) => !v)} aria-pressed={showSpare}>
                {showSpare ? "Hide spare" : "Show spare"}
              </PillButton>
            )}
            <ChassisSwitch racks={racks} activeId={rack.rackId} onChange={onRack} />
          </div>
        }
      />
      <Table
        columns={columns}
        data={slots}
        keyExtractor={(r) => `${rack.rackId}-slot-${r.position}`}
        selectedKey={selectedPosition ? `${rack.rackId}-slot-${selectedPosition}` : undefined}
        onRowClick={(r) => r.module && onSelect(r.position)}
        className="pg-rack-table pg-rack-slots"
      />
    </section>
  );
}

/* ================================================================== */
/* Channels — channel → sensor → point                                 */
/* ================================================================== */

export function RackChannelMap({
  model,
  racks,
  filter,
  onFilter,
  selectedKey,
  onSelect,
  links,
}: {
  model: RackModel;
  racks: MachineRackInfo[];
  filter: string;
  onFilter: (id: string) => void;
  selectedKey: string | undefined;
  onSelect: (row: ChannelRow) => void;
  links: RackLinks;
}) {
  const rows = filter === "all" ? model.rows : model.rowsByRack.get(filter) ?? [];
  const columns: Column<ChannelRow>[] = [
    {
      key: "loc",
      header: "Where",
      width: "128px",
      render: (r) => (
        <span className="ast-num pg-rack-loc">
          {r.rack.code}
          <span className="ast-muted">
            {" "}
            · {r.module.positionLabel}.{r.ch.channel}
          </span>
        </span>
      ),
    },
    {
      key: "sensor",
      header: "Sensor",
      render: (r) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-title" title={`${r.ch.tag} · ${r.ch.parameter}`}>
            {displayName(r.ch.parameter || r.ch.tag)}
          </span>
        </span>
      ),
    },
    { key: "card", header: "Card", render: (r) => <span className="ast-cell-sub">{r.module.model ?? `Card ${r.module.code}`}</span> },
    { key: "reg", header: "Data address", width: "88px", render: (r) => <Value v={orDash(r.ch.address)} /> },
    { key: "rate", header: "How often", width: "92px", render: (r) => <Value v={parseRate(r.ch.sampleRate)} /> },
    {
      key: "reading",
      header: "Reading",
      width: "124px",
      render: (r) => (
        <span className="pg-analysis-r ast-num">
          {r.ch.currentValue || "—"}
          {r.ch.currentValue && r.ch.unit && <span className="ast-unit">{r.ch.unit}</span>}
        </span>
      ),
    },
    {
      key: "signal",
      header: "Quality",
      width: "96px",
      render: (r) => {
        const s = channelState(r.ch);
        return <State state={s} label={SIGNAL_LABEL[s]} />;
      },
    },
    { key: "process", header: "Status", width: "96px", render: (r) => <State state={processState(r.ch)} /> },
    {
      key: "open",
      header: "",
      width: "124px",
      render: (r) => (
        <span className="pg-rack-links">
          <LinkButton label="Sensor" title={`${r.ch.tag} · open on the Sensors page`} onClick={() => links.sensor(r.ch.tag)} />
          {r.point && (
            <LinkButton
              label="Device"
              title={`Open card ${r.point.card} of ${r.point.source.code} on the Devices page`}
              onClick={() => links.devices(`card:${r.point!.source.id}/${r.point!.card}`)}
            />
          )}
        </span>
      ),
    },
  ];

  return (
    <section className="ast-card pg-table-card" aria-label="Inputs">
      <CardHead
        title="Inputs"
        meta={`${rows.length} ${model.proposed ? "planned" : "wired"} · ${model.origin.mqtt + model.origin.sim} live · ${model.origin.stored} saved values`}
        right={
          racks.length > 1 ? (
            <PillNav
              items={[{ id: "all", label: "All" }, ...racks.map((r) => ({ id: r.rackId, label: r.code }))]}
              activeId={filter}
              onChange={onFilter}
              wrap
              className="pg-rack-switch"
            />
          ) : undefined
        }
      />
      <Table columns={columns} data={rows} keyExtractor={rowKey} selectedKey={selectedKey} onRowClick={onSelect} className="pg-rack-table pg-rack-channels" />
    </section>
  );
}

/* ================================================================== */
/* Cabinet & sync — one spec table: recorded vs specified              */
/* ================================================================== */

interface SpecLine {
  group: string;
  item: string;
  recorded: React.ReactNode;
  specified: string | null;
  state: SlotState;
}

export function RackCabinetSync({
  model,
  spec: set,
  heartbeat,
  links,
}: {
  model: RackModel;
  /** The edge registry's record for this machine (GET /api/edge); null when none is on file or while loading. */
  spec: RackSpecSet | null;
  heartbeat: string;
  links: RackLinks;
}) {
  const { chassis, psu, ptp, packetLossPct } = model.record;
  const gw = model.link;
  // IEPE module as the cabinet records it (rack units): channels on the card and channels mapped.
  const iepeModule = model.rows.find((r) => r.module.sensorType === "VIB")?.module ?? null;
  const iepeMapped = iepeModule ? model.rows.filter((r) => r.module === iepeModule).length : 0;
  const fr = model.freshness;
  const sourceZones = [
    ...new Map(model.rows.filter((r) => r.point?.source.securityZone).map((r) => [r.point!.source.code, `${r.point!.source.code} ${r.point!.source.securityZone}`])).values(),
  ];

  const raw: SpecLine[] = [
    { group: "Cabinet", item: "Cabinet", recorded: chassis ? `${chassis.id}` : null, specified: set?.devices ?? null, state: "empty" },
    { group: "Cabinet", item: "Location", recorded: chassis?.cabinetLocation || null, specified: set?.location ?? null, state: "empty" },
    { group: "Cabinet", item: "Enclosure", recorded: chassis?.cabinetLocation.match(/IP\d{2}/)?.[0] ?? null, specified: null, state: "empty" },
    { group: "Cabinet", item: "Firmware", recorded: chassis?.firmware || null, specified: null, state: "empty" },
    {
      group: "Cabinet",
      item: "Vibration card (IEPE)",
      recorded: iepeModule ? `${iepeModule.cardCapacity} inputs · ${iepeMapped} in use` : null,
      specified: set?.iepe ?? null,
      state: "empty",
    },
    // Vibration DAQ nodes in the edge registry (rack sources with IEPE cards), against the channels allocated to each.
    ...(set?.daqNodes ?? []).map((n): SpecLine => {
      const used = model.rows.filter((r) => r.rack.code === n.code).length;
      return {
        group: "Vibration box",
        item: n.code,
        recorded: used ? `${used} input${used === 1 ? "" : "s"} in use` : null,
        specified: [n.name, n.channels !== null ? `${n.channels} vibration inputs` : null].filter(Boolean).join(" · "),
        state: "empty",
      };
    }),
    {
      group: "Power",
      item: "Supply",
      recorded: psu.raw ? psu.raw.replace(/\s*\([^)]*\)\s*$/, "") : null,
      specified: null,
      state: psu.state,
    },
    { group: "Power", item: "Voltages", recorded: psu.volts.length ? psu.volts.map((v) => `${v.toFixed(1)} V`).join(" / ") : null, specified: null, state: "empty" },
    {
      group: "Time",
      item: "Clock",
      recorded: ptp.mode === "Not reported" ? null : ptp.mode === "Locked" ? "In sync with the master clock (PTP)" : `PTP · ${ptp.mode === "Holdover" ? "running on its own" : ptp.mode.toLowerCase()}`,
      specified: null,
      state: ptp.state,
    },
    { group: "Time", item: "Time signal delay", recorded: ptp.latencyMs !== null ? `${ptp.latencyMs} ms` : null, specified: null, state: "empty" },
    {
      group: "Time",
      item: "Newest time stamp",
      recorded: fr ? `${Math.round(fr.newestS)} s ago · ${fr.stamped} readings` : null,
      specified: null,
      state: "empty",
    },
    {
      group: "Uplink",
      item: "Gateway",
      recorded: gw.gateway ? (
        <button type="button" className="pg-rack-textlink" onClick={() => links.devices(`gw:${gw.gateway!.id}`)}>
          {gw.code}
        </button>
      ) : null,
      specified: set?.gateway ?? null,
      state: gw.state,
    },
    { group: "Uplink", item: "Connection", recorded: gw.gateway ? gw.label : null, specified: null, state: gw.state },
    { group: "Uplink", item: "Security zone", recorded: gw.gateway?.securityZone ?? null, specified: null, state: "empty" },
    { group: "Uplink", item: "Source security zones", recorded: sourceZones.length ? sourceZones.join(" · ") : null, specified: null, state: "empty" },
    { group: "Uplink", item: "Last sign of life", recorded: gw.gateway?.lastSeenAt || model.proposed ? heartbeat : null, specified: null, state: "empty" },
    { group: "Uplink", item: "Message server", recorded: gw.gateway?.brokerName ?? null, specified: null, state: "empty" },
    { group: "Uplink", item: "Protocols", recorded: chassis?.protocol || null, specified: set?.protocols ?? null, state: "empty" },
    { group: "Uplink", item: "Network address", recorded: gw.gateway?.ip ?? chassis?.ipAddress ?? null, specified: null, state: "empty" },
    { group: "Uplink", item: "Data lost on the way", recorded: packetLossPct !== null ? `${packetLossPct.toFixed(2)} %` : null, specified: null, state: "empty" },
  ];
  const lines = raw.filter((l) => l.recorded !== null || l.specified !== null);

  const missing = [
    "clock offset (PTP)",
    "master clock",
    "cabinet temperature",
    "message rate",
    ...(!chassis ? ["cabinet record"] : []),
    ...(!gw.gateway?.lastSeenAt ? ["sign of life"] : []),
  ];

  const columns: Column<SpecLine>[] = [
    { key: "group", header: "", width: "84px", render: (l) => <span className="pg-rack-kicker">{l.group}</span> },
    { key: "item", header: "Item", width: "140px", render: (l) => <span className="ast-cell-title">{l.item}</span> },
    { key: "rec", header: "On record", render: (l) => (l.recorded !== null ? <span className="ast-num">{l.recorded}</span> : <span className="ast-muted">—</span>) },
    { key: "spec", header: "Should be", render: (l) => <span className="ast-cell-sub">{l.specified ?? "—"}</span> },
    { key: "state", header: "State", width: "112px", render: (l) => (l.state === "empty" ? <span className="ast-muted">—</span> : <State state={l.state} />) },
  ];

  return (
    <section className="ast-card pg-table-card" aria-label="Cabinet and clock">
      <CardHead title="Cabinet and clock" />
      <Table columns={columns} data={lines} keyExtractor={(l) => `${l.group}-${l.item}`} className="pg-rack-table pg-rack-spec" />
      <p className="pg-rack-foot ast-caption">Not reported by the cabinet: {missing.join(", ")}.</p>
    </section>
  );
}

/* ================================================================== */
/* Calculated — gateway-computed values and their inputs               */
/* ================================================================== */

export function RackCalculatedSignals({ model, links }: { model: RackModel; links: RackLinks }) {
  type Row = (typeof model.calculated)[number];
  const nameOf = new Map<string, string>([...model.calculated, ...model.manual, ...model.unwired].map((s) => [s.tag, s.name]));
  const allColumns: Column<Row>[] = [
    {
      key: "tag",
      header: "Value",
      render: (s) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-title" title={`${s.tag} · ${s.name}`}>
            {displayName(s.name)}
          </span>
        </span>
      ),
    },
    {
      key: "inputs",
      header: "Worked out from",
      render: (s) => {
        const ins = model.calcInputs.get(s.tag);
        if (!ins) return <span className="ast-muted">—</span>;
        return (
          <span className="pg-rack-inputs">
            {ins.map((i) => (
              <span key={i.tag}>
                <button type="button" className="pg-rack-textlink" onClick={() => links.sensor(i.tag)} title={i.tag}>
                  {displayName(i.row?.ch.parameter || nameOf.get(i.tag) || i.tag)}
                </button>
                <span className="ast-muted ast-num"> {i.row ? `${i.row.rack.code} · ${i.row.module.positionLabel}.${i.row.ch.channel}` : "not wired yet"}</span>
              </span>
            ))}
          </span>
        );
      },
    },
    {
      key: "basis",
      header: "Method",
      // The DB sensor type of the calculated measurement names its basis.
      render: (s) => <span className="ast-cell-sub">{(model.calcInputs.has(s.tag) && s.sensorType) || "—"}</span>,
    },
    { key: "value", header: "Reading", width: "120px", render: (s) => <Value v={s.value || "—"} unit={s.unit || undefined} /> },
    { key: "state", header: "Status", width: "96px", render: (s) => <State state={s.status === "Critical" ? "bad" : s.status === "Alert" ? "warn" : "ok"} /> },
    { key: "open", header: "", width: "84px", render: (s) => <LinkButton label="Sensor" title={`${s.tag} · open on the Sensors page`} onClick={() => links.sensor(s.tag)} /> },
  ];
  // Inputs come from the gateway formulas on file; machines without one omit the inputs and basis columns.
  const columns = model.calcInputs.size > 0 ? allColumns : allColumns.filter((c) => c.key !== "inputs" && c.key !== "basis");
  return (
    <section className="ast-card pg-table-card" aria-label="Calculated values">
      <CardHead title="Calculated values" meta={`${plural(model.calculated.length, "value", "values")} · worked out on the gateway from other sensors · no wiring`} />
      <Table columns={columns} data={model.calculated} keyExtractor={(s) => s.tag} className="pg-rack-table pg-rack-calc" />
    </section>
  );
}
