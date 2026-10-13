"use client";

import React, { useMemo, useState } from "react";
import type { AssetMachine } from "./assets-data";
import { cabinetCounts, hardwareCountLine, type CabinetChannel, type CabinetModule, type MachineRackInfo } from "./rack-data";
import type { KilnSimulation } from "./kiln-seals-simulation";
import { useMachineRackUnits } from "./use-machine-rack-units";
import { applyRackLive, applyRackMqtt, applyRackSimulation } from "./rack-simulation";
import { useMachineCatalog } from "./use-machine-catalog";
import { GatewayCalculated, calculatedSensors } from "./rack-calculated";
import { useMachineAcquisition } from "./acquisition/use-machine-acquisition";
import { RackEnclosure } from "./rack-enclosure";
import {
  ModuleGlyph,
  STATE_COLOR,
  channelState,
  moduleState,
  parseRate,
  stateSeverity,
  worstState,
  RACK_HP,
  SLOT_HP,
  type SlotState,
} from "./eurocard-module";
import { Table, PillNav, type Column } from "@/components/ui";
import "./rack.css";

export interface RackViewProps {
  machine: AssetMachine;
  simulation?: KilnSimulation;
}

/* ------------------------------------------------------------------
   Cabinet: the machine's acquisition hardware as chassis → card →
   channel, from /api/rack-units. A machine with edge registry points
   (KLN-01) is built from the registry, the same rows the Acquisition
   view reads; others from mapped_signals. Live values: MQTT first, the
   KLN-01 simulation for channels MQTT has nothing for.
   ------------------------------------------------------------------ */

type PtpMode = "Locked" | "Holdover" | "Unknown";

const TONE: Record<SlotState, string> = { ok: "good", warn: "warn", bad: "bad", empty: "neutral" };

const orDash = (v: string | undefined | null) => (v && v.trim() ? v : "—");

/** One table row: a channel with the module it sits on. */
interface ChannelRow {
  module: CabinetModule;
  ch: CabinetChannel;
}

/* ------------------------------------------------------------------
   Small presentational pieces
   ------------------------------------------------------------------ */

function Chip({ state, children }: { state: SlotState; children: React.ReactNode }) {
  return (
    <span className={`rack-chip ${TONE[state]}`}>
      <span className="rack-chip-dot" aria-hidden="true" />
      {children}
    </span>
  );
}

function Spec({ label, value, wide = false }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`rack-spec ${wide ? "wide" : ""}`}>
      <dt>{label}</dt>
      <dd title={typeof value === "string" ? value : undefined}>{value}</dd>
    </div>
  );
}

function Reading({ ch }: { ch: CabinetChannel }) {
  return (
    <span className="rack-num">
      {orDash(ch.currentValue)}
      {ch.unit && ch.currentValue && <span className="rack-muted"> {ch.unit}</span>}
    </span>
  );
}

/* ------------------------------------------------------------------
   Page
   ------------------------------------------------------------------ */

export function RackView({ machine, simulation }: RackViewProps) {
  const { racks, isLoading, isError, error } = useMachineRackUnits(machine);
  const acq = useMachineAcquisition(machine.id);
  const machineRacks = useMemo(() => {
    const sim = simulation?.frame ? applyRackLive(racks, simulation.frame) : applyRackSimulation(racks, simulation?.sensorData);
    return applyRackMqtt(sim, acq.data);
  }, [racks, simulation?.frame, simulation?.sensorData, acq.data]);
  const catalog = useMachineCatalog(machine);
  const counts = useMemo(() => cabinetCounts(machineRacks), [machineRacks]);

  const [pickedRackId, setPickedRackId] = useState<string | null>(null);
  const [picked, setPicked] = useState<{ position: number; channel: string | null } | null>(null);

  const rack: MachineRackInfo | undefined = machineRacks.find((r) => r.rackId === pickedRackId) ?? machineRacks[0];

  const model = useMemo(() => {
    if (!rack) return null;
    // Cabinet facts: the rack_chassis row linked by machine_id.
    const c = rack.chassis ?? null;
    const latencyRaw = c?.latency ?? "";
    const psuRaw = c?.psuStatus ?? "";
    const ptpMode: PtpMode = !latencyRaw ? "Unknown" : /synced|lock/i.test(latencyRaw) ? "Locked" : "Holdover";
    const psuVolts = (psuRaw.match(/[\d.]+(?=\s*V\b)/g) ?? []).map(Number).filter((v) => v > 5 && v < 60);
    const psuState: SlotState = !psuRaw ? "empty" : /active|ok/i.test(psuRaw) ? "ok" : "warn";
    const rows: ChannelRow[] = rack.modules.flatMap((m) => m.channels.map((ch) => ({ module: m, ch })));
    return { chassis: c, latencyRaw, psuRaw, ptpMode, psuVolts, psuState, rows };
  }, [rack]);

  if (isLoading) {
    return (
      <div className="rack-page">
        <div className="rack-card rack-state" role="status" aria-live="polite">
          <span className="rack-spinner" aria-hidden="true" />
          Loading cabinet
        </div>
      </div>
    );
  }

  if (isError || !rack || !model) {
    return (
      <div className="rack-page">
        <div className="rack-card rack-state is-error" role="alert">
          <strong>Cabinet unavailable</strong>
          <span>{isError ? `/api/rack-units · ${error}` : `No acquisition hardware mapped to ${machine.id}`}</span>
        </div>
      </div>
    );
  }

  const selected: CabinetModule | undefined =
    rack.modules.find((m) => m.position === picked?.position) ?? rack.modules[0];
  const selectedChannel: CabinetChannel | undefined =
    selected?.channels.find((c) => c.channel === picked?.channel) ?? selected?.channels[0];

  const ptpState: SlotState = model.ptpMode === "Unknown" ? "empty" : model.ptpMode === "Holdover" ? "warn" : "ok";
  const moduleStates = rack.modules.map(moduleState);
  const rackState = worstState(model.psuState === "empty" ? moduleStates : [...moduleStates, model.psuState]);
  const rackChannels = model.rows.length;
  const selState = moduleState(selected);

  const selectPosition = (position: number) => setPicked({ position, channel: null });

  const columns: Column<ChannelRow>[] = [
    {
      key: "pos",
      header: "Pos",
      width: "52px",
      render: (r) => <span className="rack-num">{r.module.positionLabel}</span>,
    },
    {
      key: "signal",
      header: "Signal",
      render: (r) => (
        <div className="rack-cell-module">
          <span className="rack-badge" aria-hidden="true">
            <svg viewBox="0 0 24 24" style={{ color: STATE_COLOR[channelState(r.ch)] }}>
              <ModuleGlyph type={r.ch.sensorType} />
            </svg>
          </span>
          <span className="rack-cell-text">
            <span className="rack-cell-main">{r.ch.tag}</span>
            <span className="rack-cell-sub">{r.ch.parameter}</span>
          </span>
        </div>
      ),
    },
    {
      key: "card",
      header: "Card · Ch",
      render: (r) => (
        <span className="rack-cell-text">
          <span className="rack-num">
            {r.module.model ?? `Card ${r.module.code}`} · {r.ch.channel}
          </span>
          {r.module.cardType && <span className="rack-cell-sub">{r.module.cardType}</span>}
        </span>
      ),
    },
    {
      key: "rate",
      header: "Sampling",
      render: (r) => <span className="rack-num">{parseRate(r.ch.sampleRate)}</span>,
    },
    {
      key: "reading",
      header: "Reading",
      render: (r) => <Reading ch={r.ch} />,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => {
        const st = channelState(r.ch);
        return <Chip state={st}>{stateSeverity(st)}</Chip>;
      },
    },
  ];

  return (
    <div className="rack-page">
      {machineRacks.length > 1 && (
        <PillNav
          items={machineRacks.map((r) => ({ id: r.rackId, label: r.tabLabel }))}
          activeId={rack.rackId}
          onChange={(id) => {
            setPickedRackId(id);
            setPicked(null);
          }}
          wrap
          className="rack-nav"
        />
      )}

      {/* 1 · Header */}
      <header className="rack-head">
        <div className="rack-head-id">
          <span className="rack-head-code">
            {rack.code} · {rack.kindLabel}
            {rack.protocol ? ` · ${rack.protocol}` : ""}
          </span>
          <h2 className="rack-head-name">{rack.name}</h2>
          <span className="rack-muted rack-num">
            {machine.id}:{" "}
            {hardwareCountLine(counts.sources, counts.cards, counts.channels, {
              total: catalog.sensors.length,
              calculated: calculatedSensors(catalog.sensors).length,
            })}
          </span>
        </div>
        <div className="rack-head-chips">
          <Chip state={rackState}>{stateSeverity(rackState)}</Chip>
          {model.ptpMode !== "Unknown" && <Chip state={ptpState}>PTP {model.ptpMode}</Chip>}
          {!catalog.isLive && !catalog.isLoading && <Chip state="warn">Catalog offline</Chip>}
        </div>
      </header>

      {/* 2 · Chassis elevation + selected card */}
      <section className="rack-main">
        <div className="rack-card rack-chassis">
          <div className="rack-card-head">
            <h3>Chassis</h3>
            <span className="rack-muted">
              19&quot; 3U · {RACK_HP} HP · {rack.modules.length} of {rack.positions} × {SLOT_HP} HP positions · {rackChannels}{" "}
              {rackChannels === 1 ? "channel" : "channels"}
            </span>
          </div>
          <RackEnclosure
            rack={rack}
            selectedPosition={selected?.position ?? null}
            selectedChannel={selectedChannel?.channel ?? null}
            onSelectPosition={selectPosition}
            psuState={model.psuState}
            psuVolts={model.psuVolts}
            ptpState={ptpState}
          />
          <div className="rack-legend" aria-hidden="true">
            {(["ok", "warn", "bad"] as SlotState[]).map((s) => (
              <span key={s}>
                <i style={{ background: STATE_COLOR[s] }} />
                {stateSeverity(s)}
              </span>
            ))}
            <span>
              <i className="is-empty" />
              Spare channel / position
            </span>
          </div>
        </div>

        <aside className="rack-card rack-detail" aria-label={selected ? `Card ${selected.code} detail` : "Card detail"}>
          {selected ? (
            <>
              <div className="rack-detail-head">
                <span className="rack-badge lg" aria-hidden="true">
                  <svg viewBox="0 0 24 24" style={{ color: STATE_COLOR[selState] }}>
                    <ModuleGlyph type={selected.sensorType} />
                  </svg>
                </span>
                <div className="rack-detail-id">
                  <span className="rack-muted">
                    Position {selected.positionLabel} · Card {selected.code}
                    {selected.note ? ` · ${selected.note}` : ""}
                  </span>
                  <span className="rack-detail-title">{selected.model ?? `Card ${selected.code}`}</span>
                  <span className="rack-cell-sub">
                    {selected.cardType ?? "Type not set"} · {selected.channels.length} of {selected.capacity} channels mapped
                  </span>
                </div>
                <Chip state={selState}>{stateSeverity(selState)}</Chip>
              </div>

              <div className="rack-detail-block">
                <span className="rack-label">Channels</span>
                <ul className="rack-chlist" aria-label={`Channels of card ${selected.code}`}>
                  {selected.channels.map((ch) => {
                    const st = channelState(ch);
                    const on = ch.channel === selectedChannel?.channel;
                    return (
                      <li key={ch.channel}>
                        <button
                          type="button"
                          className="rack-chlist-row"
                          aria-pressed={on}
                          onClick={() => setPicked({ position: selected.position, channel: ch.channel })}
                        >
                          <span className="rack-chlist-ch rack-num">{ch.channel}</span>
                          <span className="rack-chlist-dot" style={{ background: STATE_COLOR[st] }} aria-hidden="true" />
                          <span className="rack-chlist-tag">{ch.tag}</span>
                          <span className="rack-chlist-val">
                            <Reading ch={ch} />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {selectedChannel && (
                <dl className="rack-specs">
                  <Spec label="Channel" value={`${selectedChannel.channel} · ${selectedChannel.tag}`} wide />
                  <Spec label="Parameter" value={selectedChannel.parameter} wide />
                  <Spec label="Sampling" value={parseRate(selectedChannel.sampleRate)} />
                  <Spec label="Register" value={orDash(selectedChannel.address)} />
                  <Spec label="Quality" value={orDash(selectedChannel.quality)} />
                  <Spec
                    label="Alert / danger"
                    value={
                      selectedChannel.alertLimit === null && selectedChannel.dangerLimit === null
                        ? "—"
                        : `${selectedChannel.alertLimit ?? "—"} / ${selectedChannel.dangerLimit ?? "—"} ${selectedChannel.unit}`
                    }
                  />
                  <Spec label="Range" value={orDash(selectedChannel.normalRange).split(" (")[0]} wide />
                  <Spec label="Instrument" value={orDash(selectedChannel.instrument)} wide />
                  {selectedChannel.component && <Spec label="Component" value={selectedChannel.component} wide />}
                </dl>
              )}
            </>
          ) : (
            <dl className="rack-specs">
              <Spec label="Width" value={`${SLOT_HP} HP`} />
              <Spec label="State" value="No card fitted" />
            </dl>
          )}
        </aside>
      </section>

      {/* 3 · Channel table + cabinet record */}
      <section className="rack-lower">
        <div className="rack-card rack-table-card">
          <div className="rack-card-head">
            <h3>Channel allocation</h3>
            <span className="rack-muted">
              {rack.modules.length} {rack.modules.length === 1 ? "card" : "cards"} · {rackChannels}{" "}
              {rackChannels === 1 ? "channel" : "channels"}
            </span>
          </div>
          <Table
            columns={columns}
            data={model.rows}
            keyExtractor={(r) => `${rack.rackId}-${r.module.position}-${r.ch.channel}`}
            selectedKey={selected && selectedChannel ? `${rack.rackId}-${selected.position}-${selectedChannel.channel}` : undefined}
            onRowClick={(r) => setPicked({ position: r.module.position, channel: r.ch.channel })}
            className="rack-table"
          />
        </div>

        <div className="rack-side">
          <div className="rack-card">
            <div className="rack-card-head">
              <h3>Cabinet</h3>
              {model.psuState !== "empty" && (
                <Chip state={model.psuState}>{model.psuVolts.length > 1 ? "PSU redundant" : "PSU single"}</Chip>
              )}
            </div>
            {model.chassis ? (
              <dl className="rack-specs">
                <Spec label="Chassis" value={`${model.chassis.id} · ${model.chassis.name}`} wide />
                <Spec label="Gateway" value={orDash(rack.gateway)} wide />
                <Spec label="Location" value={orDash(model.chassis.cabinetLocation)} wide />
                <Spec label="Address" value={orDash(model.chassis.ipAddress)} />
                <Spec label="Protocol" value={orDash(model.chassis.protocol)} />
                <Spec label="PSU" value={orDash(model.psuRaw)} wide />
                <Spec label="Latency" value={orDash(model.latencyRaw)} />
                <Spec label="Packet loss" value={orDash(model.chassis.packetLoss)} />
                <Spec label="Firmware" value={orDash(model.chassis.firmware)} />
                <Spec label="Uptime" value={orDash(model.chassis.uptime)} />
              </dl>
            ) : (
              <p className="rack-muted">
                No cabinet record for {machine.id}. Gateway {rack.gateway} has no rack_chassis row, so location, network
                and power are not shown.
              </p>
            )}
          </div>
        </div>
      </section>

      <GatewayCalculated sensors={calculatedSensors(catalog.sensors)} />
    </div>
  );
}
