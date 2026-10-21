"use client";

import React, { useMemo } from "react";
import { Table, type Column, Skel } from "@/components/ui";
import { IconChevron } from "@/components/assets/assets-shell-ui";
import { SOURCE_KIND_LABEL } from "@shared/types/edge";
import { type EdgeIndex, ago } from "./edge-model";
import { type ChannelRow, natural } from "./devices-rows";
import { ChannelActions, PositionCell, SensorCell, Stack, StatusCell, ValueCell } from "./devices-cells";

/* ==========================================================================
   Devices › Machine mapping: which gateway, rack and channel feeds each
   machine sensor.
     All machines  one row per machine (gateways, racks, linked channels,
                   how many are sending), then channels linked to none
     One machine   its sensors with gateway › rack › card · channel, then
                   the unlinked channels on the racks that feed it
   ========================================================================== */

export const ALL_MACHINES = "all";

interface MachineRow {
  id: string;
  name: string;
  gateways: string[];
  racks: string[];
  linked: number;
  sending: number;
}

const sending = (r: ChannelRow) => r.value !== null;
const uniq = (xs: string[]) => [...new Set(xs)].sort(natural);

export interface MappingBodyProps {
  ix: EdgeIndex;
  channels: ChannelRow[];
  machineId: string;
  now: number;
  /** The first live snapshot has not arrived: how many sensors send is not known yet. */
  connecting?: boolean;
  onMachine: (id: string) => void;
  onLink: (r: ChannelRow) => void;
  onEditPoint: (r: ChannelRow) => void;
}

export function machineRows(ix: EdgeIndex, channels: ChannelRow[]): MachineRow[] {
  return ix.registry.machines.map((m) => {
    const mine = channels.filter((r) => r.machineId === m.id);
    return {
      id: m.id,
      name: m.name,
      gateways: uniq(mine.map((r) => r.gw.code)),
      racks: uniq(mine.map((r) => r.rack.rackId)),
      linked: mine.length,
      sending: mine.filter(sending).length,
    };
  });
}

function Codes({ codes }: { codes: string[] }) {
  if (!codes.length) return <span className="ast-muted">—</span>;
  const shown = codes.slice(0, 4).join(", ");
  return (
    <span className="ast-cell-text ast-num" title={codes.join(", ")}>
      {shown}
      {codes.length > 4 ? ` +${codes.length - 4}` : ""}
    </span>
  );
}

export function MappingBody({ ix, channels, machineId, now, connecting = false, onMachine, onLink, onEditPoint }: MappingBodyProps) {
  const machines = useMemo(() => machineRows(ix, channels), [ix, channels]);
  const machine = machineId === ALL_MACHINES ? null : (machines.find((m) => m.id === machineId) ?? null);

  const sensors = useMemo(
    () => (machine ? channels.filter((r) => r.machineId === machine.id).sort((a, b) => natural(a.tag ?? "", b.tag ?? "")) : []),
    [channels, machine],
  );
  // Unlinked channels: all of them, or those on the racks that feed the chosen machine.
  const unlinked = useMemo(() => {
    const free = channels.filter((r) => !r.tag);
    if (!machine) return free;
    const racks = new Set(channels.filter((r) => r.machineId === machine.id || r.rack.source?.machineId === machine.id).map((r) => `${r.gw.id}/${r.rack.rackId}`));
    return free.filter((r) => racks.has(`${r.gw.id}/${r.rack.rackId}`));
  }, [channels, machine]);

  const machineColumns: Column<MachineRow>[] = [
    { key: "machine", header: "Machine", render: (m) => <Stack title={m.name} sub={<span className="ast-num">{m.id}</span>} /> },
    { key: "gateways", header: "Gateway", width: "200px", render: (m) => <Codes codes={m.gateways} /> },
    { key: "racks", header: "Racks", width: "240px", render: (m) => <Codes codes={m.racks} /> },
    {
      key: "linked",
      header: "Sensors linked",
      width: "140px",
      render: (m) => (m.linked ? <span className="ast-num">{m.linked}</span> : <span className="ast-muted">None yet</span>),
    },
    {
      key: "sending",
      header: "Sending readings now",
      width: "170px",
      render: (m) =>
        m.linked && connecting ? (
          <Skel width="5ch" />
        ) : m.linked ? (
          <span className="ast-num dvp-value" data-tone={m.sending < m.linked ? "warn" : undefined}>
            {m.sending}
            <span className="ast-muted"> of {m.linked}</span>
          </span>
        ) : (
          <span className="ast-muted">—</span>
        ),
    },
    {
      key: "open",
      header: "",
      width: "40px",
      render: () => (
        <span className="pg-chev" aria-hidden="true">
          <IconChevron />
        </span>
      ),
    },
  ];

  const path = (r: ChannelRow) => (
    <Stack mono title={r.rack.rackId} sub={`${r.rack.source ? SOURCE_KIND_LABEL[r.rack.source.kind] : "Not added yet"} · on gateway ${r.gw.code}`} />
  );

  const sensorColumns: Column<ChannelRow>[] = [
    { key: "sensor", header: "Sensor", render: (r) => <SensorCell r={r} /> },
    { key: "path", header: "Rack", render: path },
    { key: "pos", header: "Card and channel", width: "150px", render: (r) => <PositionCell r={r} /> },
    { key: "value", header: "Reading", width: "130px", render: (r) => <ValueCell r={r} /> },
    { key: "status", header: "Status", width: "110px", render: (r) => <StatusCell r={r} /> },
    { key: "seen", header: "Updated", width: "90px", render: (r) => <span className="ast-num ast-muted">{ago(r.updatedAt, now)}</span> },
    { key: "act", header: "", width: "60px", render: (r) => <ChannelActions r={r} onLink={onLink} onEdit={onEditPoint} /> },
  ];

  const unlinkedColumns: Column<ChannelRow>[] = [
    { key: "path", header: "Rack", render: path },
    { key: "pos", header: "Card and channel", width: "150px", render: (r) => <PositionCell r={r} /> },
    { key: "name", header: "Name the gateway sends", render: (r) => (r.ch.label ? <span className="ast-cell-text">{r.ch.label}</span> : <span className="ast-muted">—</span>) },
    { key: "value", header: "Reading", width: "130px", render: (r) => <ValueCell r={r} /> },
    { key: "status", header: "Status", width: "110px", render: (r) => <StatusCell r={r} /> },
    { key: "act", header: "", width: "130px", render: (r) => <ChannelActions r={r} onLink={onLink} /> },
  ];

  return (
    <>
      {machine ? (
        <section className="ast-card pg-table-card" aria-label={`Sensors of ${machine.name}`}>
          <div className="ast-card-head">
            <h2 className="ast-card-title">
              Sensors
              <span className="ast-caption">
                {machine.linked} linked, {machine.sending === machine.linked ? "all" : machine.sending} sending readings now
              </span>
            </h2>
          </div>
          {sensors.length ? (
            <Table className="ast-table dvp-table" columns={sensorColumns} data={sensors} keyExtractor={(r) => r.key} onRowClick={onLink} />
          ) : (
            <div className="ast-empty">No sensor of this machine is linked to a channel yet. Link one from the list below, or from the rack on the Gateways page.</div>
          )}
        </section>
      ) : (
        <section className="ast-card pg-table-card" aria-label="Machines">
          <div className="ast-card-head">
            <h2 className="ast-card-title">
              Machines
              <span className="ast-caption">{machines.length}</span>
            </h2>
          </div>
          {machines.length ? (
            <Table className="ast-table dvp-table" columns={machineColumns} data={machines} keyExtractor={(m) => m.id} onRowClick={(m) => onMachine(m.id)} />
          ) : (
            <div className="ast-empty">No machines yet. Add them on the Configure page, under Plants &amp; machines.</div>
          )}
        </section>
      )}

      {unlinked.length > 0 && (
        <section className="ast-card pg-table-card" aria-label="Channels not linked to a machine">
          <div className="ast-card-head">
            <h2 className="ast-card-title">
              Channels not linked to any machine
              <span className="ast-caption">{unlinked.length}</span>
            </h2>
          </div>
          <Table className="ast-table dvp-table" columns={unlinkedColumns} data={unlinked} keyExtractor={(r) => r.key} onRowClick={onLink} />
        </section>
      )}
    </>
  );
}
