"use client";

import React, { useCallback, useMemo, useState } from "react";
import type { AssetMachine } from "./assets-data";
import type { MachineRackInfo } from "./rack-data";
import type { KilnSimulation } from "./kiln-seals-simulation";
import { useMachineRackUnits } from "./use-machine-rack-units";
import { applyRackLive, applyRackMqtt, applyRackSimulation } from "./rack-simulation";
import { useMachineCatalog } from "./use-machine-catalog";
import { useMachineAcquisition } from "./acquisition/use-machine-acquisition";
import { STATE_TONE, buildRackModel, type ChannelRow, type RackModel } from "./rack-model";
import {
  RackCabinetSync,
  RackCalculatedSignals,
  RackChannelMap,
  RackChassis,
  RackSlots,
  type RackLinks,
} from "./rack-sections";
import { Empty, KpiStrip, PageHeader, Section, SectionIndex, type KpiItem, type PageMetaItem, type SectionIndexItem } from "./analysis/an-ui";
import type { Tone } from "./assets-shell-ui";
import { focusSensorOn } from "./sensor-focus";
import { D4_REQUIRED_TARGET_PCT, PYRO_PROPOSED_RACK, requiredAvailability } from "./sensors-model";
import { PillButton } from "@/components/ui";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { isKilnMachine, useKilnSimulationFor } from "@/providers/kiln-simulation-context";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import { formatLocalTime } from "@/lib/time";
import { simTimeMs } from "@/lib/kiln-sim/engine";
import "./assets-shell.css";
import "./analysis/analysis-page.css";
import "./rack.css";

export interface RackViewProps {
  machine: AssetMachine;
  simulation?: KilnSimulation;
}

/* ==========================================================================
   Machine › Rack — one scrolling page.
   Question: is the acquisition hardware for this machine healthy and
   correctly configured?

     01 Summary          verdict + checks          all sources below
     02 Chassis          19" 3U elevation + card   /api/rack-units (+ live overlay)
     03 Slots & modules  every position, spares    /api/rack-units
     04 Channel map      channel → sensor → point  /api/rack-units · /api/edge/machines
     05 Time sync        PTP record, time stamps   rack_chassis · MQTT stamps · D5 Table 8.2
     06 Cabinet & power  record vs specification   rack_chassis · D5 Table 7.1
     07 Gateway & uplink link, broker, sources     /api/edge/machines · rack_chassis · D5 §7.2
     08 Calculated       gateway-computed values   sensor catalog · D5 Table 9.2

   Live values: MQTT first, the live simulation for channels MQTT has nothing
   for. Per-sensor validity lives on Sensors, the edge network on Devices.
   ========================================================================== */

/** sessionStorage key another page can set to open Rack at a section id. */
export const RACK_SECTION_KEY = "ultron.rack.section";

const SECTIONS = [
  { id: "rack-chassis", label: "Chassis" },
  { id: "rack-slots", label: "Slots" },
  { id: "rack-channels", label: "Channels" },
  { id: "rack-cabinet", label: "Cabinet & sync" },
  { id: "rack-calculated", label: "Calculated" },
] as const;

/* ------------------------------------------------------------------
   Navigation: context API only, so the page works without parent wiring.
   Devices restores its tree selection from sessionStorage after mount.
   ------------------------------------------------------------------ */

function store(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

function useRackLinks(machineId: string): RackLinks {
  const ctx = useIndustrialData();
  return useMemo(
    () => ({
      sub: (page) => ctx.navigateToMachine(machineId, page),
      sensor: (tag) => {
        focusSensorOn("sensors", tag);
        ctx.navigateToMachine(machineId, "sensors");
      },
      /** `selection`: a Devices tree key (`gw:<id>`, `src:<id>`, `card:<sourceId>/<card>`); omitted opens the tree as it was. */
      devices: (selection) => {
        store("ultron.devices.section", "hierarchy");
        if (selection) {
          store("ultron.devices.selected", selection);
          store("ultron.devices.plant", "all");
        }
        ctx.setActiveTab("devices");
      },
    }),
    [ctx, machineId],
  );
}

function sectionTones(m: RackModel): Record<string, Tone> {
  const alert = (t: Tone | undefined): Tone | undefined => (t === "warn" || t === "bad" ? t : undefined);
  const check = (id: string) => alert(m.checks.find((c) => c.id === id)?.tone);
  const worst = (...t: (Tone | undefined)[]) => (t.includes("bad") ? "bad" : t.includes("warn") ? "warn" : undefined);
  return Object.fromEntries(
    Object.entries({
      "rack-chassis": check("signals"),
      "rack-channels": check("signals"),
      "rack-cabinet": worst(check("clock"), check("power"), check("gateway")),
    }).filter(([, v]) => v),
  ) as Record<string, Tone>;
}

/* ------------------------------------------------------------------
   Page
   ------------------------------------------------------------------ */

export function RackView({ machine, simulation }: RackViewProps) {
  const fleetSim = useKilnSimulationFor(machine.id);
  const sim = simulation ?? fleetSim ?? undefined;
  const { racks, isLoading, isError } = useMachineRackUnits(machine);
  const acq = useMachineAcquisition(machine.id);
  const catalog = useMachineCatalog(machine);
  const links = useRackLinks(machine.id);
  const tz = useSiteTimeZone({ machineId: machine.id });
  const sealFleet = isKilnMachine(machine.id);

  const liveRacks = useMemo(() => {
    // The live frame carries every live machine's own signals; the seals-only fallback models kiln-fleet tags only.
    const live = sim?.frame ? applyRackLive(racks, sim.frame) : sealFleet ? applyRackSimulation(racks, sim?.sensorData) : racks;
    return applyRackMqtt(live, acq.data);
  }, [racks, sim?.frame, sim?.sensorData, sealFleet, acq.data]);

  const model = useMemo(
    () =>
      buildRackModel({
        machineId: machine.id,
        racks: liveRacks,
        acq: acq.data,
        frame: sim?.frame,
        catalog: catalog.sensors,
      }),
    [machine.id, liveRacks, acq.data, sim?.frame, catalog.sensors],
  );

  const [pickedRackId, setPickedRackId] = useState<string | null>(null);
  const [picked, setPicked] = useState<{ position: number; channel: string | null } | null>(null);
  const [mapFilter, setMapFilter] = useState<string>("all");

  const heartbeatOf = useCallback(
    (iso: string | null) => (iso ? `${formatLocalTime(iso, { date: true, timeZone: tz.timeZone })} · ${tz.label}` : "No heartbeat recorded"),
    [tz.timeZone, tz.label],
  );

  const rack: MachineRackInfo | undefined = liveRacks.find((r) => r.rackId === pickedRackId) ?? liveRacks[0];

  const header = (status?: { label: string; tone?: Tone } | null, meta?: (PageMetaItem | null)[], actions?: React.ReactNode) => (
    <PageHeader title="Rack" status={status} meta={meta} actions={actions} />
  );

  /* ---------- loading / error / empty ---------- */

  if (isLoading && racks.length === 0) {
    return (
      <div className="ast-root pg-frame pg-analysis pg-rack" aria-label="Rack">
        {header()}
        <section className="ast-card" role="status" aria-live="polite">
          <Empty title={`Loading acquisition hardware for ${machine.id}…`} />
        </section>
      </div>
    );
  }

  if (isError || !rack) {
    return (
      <div className="ast-root pg-frame pg-analysis pg-rack" aria-label="Rack">
        {header(
          undefined,
          undefined,
          <PillButton variant="secondary" onClick={() => links.devices()}>
            Open in Devices
          </PillButton>,
        )}
        <section className="ast-card" role={isError ? "alert" : "status"}>
          <Empty title={isError ? "Rack data unavailable. Retry." : `No acquisition hardware mapped to ${machine.id}.`}>
            {isError ? null : "Map gateway channels to this machine in Devices."}
          </Empty>
        </section>
      </div>
    );
  }

  /* ---------- selection ---------- */

  const selected = rack.modules.find((m) => m.position === picked?.position) ?? rack.modules[0];
  const selectedChannel = selected?.channels.find((c) => c.channel === picked?.channel) ?? selected?.channels[0];
  const selectedRowKey = selected && selectedChannel ? `${rack.rackId}|${selected.position}|${selectedChannel.channel}` : undefined;

  const pickRack = (id: string) => {
    setPickedRackId(id);
    setPicked(null);
  };
  const pickPosition = (position: number, channel: string | null = null) => setPicked({ position, channel });
  const pickRow = (r: ChannelRow) => {
    setPickedRackId(r.rack.rackId);
    setPicked({ position: r.module.position, channel: r.ch.channel });
  };

  const lastSeen = model.link.gateway?.lastSeenAt ?? null;
  // Pyro line: the gateway is simulated; say so rather than imply a live link.
  const proposed = model.proposed;
  const heartbeat = lastSeen ? heartbeatOf(lastSeen) : proposed ? "Simulated gateway · no heartbeat" : "No heartbeat";
  const required = requiredAvailability(sim?.frame);
  const tones = sectionTones(model);
  const sections = SECTIONS.filter((s) => s.id !== "rack-calculated" || model.calculated.length > 0);
  const index: SectionIndexItem[] = sections.map((s) => ({ id: s.id, label: s.label, tone: tones[s.id] }));
  const stateLabel = model.state === "empty" ? "Not assessed" : model.state === "ok" ? "Normal" : stateSeverityLabel(model.state);
  const alertTone = (t: Tone): Tone | undefined => (t === "warn" || t === "bad" ? t : undefined);
  const faults = model.signal.bad + model.signal.warn;
  const kpis: KpiItem[] = [
    {
      label: proposed ? "Slots proposed" : "Slots fitted",
      value: String(model.cards),
      unit: `/ ${model.positions}`,
      foot: `${model.chassisCount} chassis · ${model.positions - model.cards} ${proposed ? "unallocated" : "spare"}`,
    },
    {
      label: proposed ? "Channels allocated" : "Sensors wired",
      value: String(model.rows.length),
      unit: model.catalogTotal ? `/ ${model.catalogTotal}` : undefined,
      tone: model.unwired.length ? "warn" : undefined,
      foot: model.catalogTotal
        ? `${model.catalogTotal} in catalog · ${model.calculated.length} calculated${model.manual.length ? ` · ${model.manual.length} manual` : ""} · ${model.unwired.length} ${proposed ? "not allocated" : "not wired"}`
        : catalog.isLoading
          ? "Loading catalog…"
          : `${model.calculated.length} calculated`,
    },
    {
      label: "Signal faults",
      value: String(faults),
      tone: model.signal.bad ? "bad" : faults ? "warn" : required && required.pct < D4_REQUIRED_TARGET_PCT ? "warn" : undefined,
      foot: `${model.signal.bad} invalid · ${model.signal.warn} suspect${required ? ` · Required ${required.pct} % valid (≥ ${D4_REQUIRED_TARGET_PCT} %, D4 Table 11.1)` : ""}`,
    },
    {
      label: "Clock",
      value: model.record.ptp.mode,
      text: true,
      tone: alertTone(STATE_TONE[model.record.ptp.state]),
      foot: model.record.ptp.latencyMs !== null ? `PTP path delay ${model.record.ptp.latencyMs} ms` : "no clock record",
    },
  ];

  return (
    <div className="ast-root pg-frame pg-analysis pg-rack" aria-label="Rack">
      {header(
        { label: stateLabel, tone: model.state === "empty" || model.state === "ok" ? undefined : STATE_TONE[model.state] },
        [
          { label: "Gateway", value: `${model.link.code} · ${model.link.label}` },
          { label: "Sources", value: liveRacks.map((r) => r.code).filter((c, i, a) => a.indexOf(c) === i).join(" · ") },
          {
            label: "Sensors",
            value: model.catalogTotal
              ? `${model.catalogTotal} · ${model.rows.length} ${proposed ? "allocated (proposed)" : "wired"} + ${model.calculated.length} calc.${model.manual.length ? ` + ${model.manual.length} manual` : ""}${model.unwired.length ? ` + ${model.unwired.length} ${proposed ? "unallocated" : "unwired"}` : ""}`
              : `${model.rows.length} ${proposed ? "allocated (proposed)" : "wired"}`,
          },
          lastSeen || proposed ? { label: "Heartbeat", value: heartbeat } : null,
        ],
        <PillButton variant="secondary" onClick={() => links.devices(model.link.gateway ? `gw:${model.link.gateway.id}` : undefined)}>
          Open in Devices
        </PillButton>,
      )}

      {proposed && (
        <p className="ast-caption" role="note">
          {PYRO_PROPOSED_RACK}
        </p>
      )}

      {acq.error && acq.data && (
        <p className="ast-caption" role="status">
          Gateway reading unavailable. Showing the previous reading.
        </p>
      )}

      <KpiStrip page items={kpis} label="Acquisition hardware" />

      <SectionIndex items={index} label="Rack sections" pendingKey={RACK_SECTION_KEY} />

      <div className="pg-frame-body pg-analysis-body pg-rack-body">
        {sections.map((s) => (
          <Section key={s.id} id={s.id} title={s.label}>
            {s.id === "rack-chassis" && (
              <RackChassis
                rack={rack}
                racks={liveRacks}
                model={model}
                selected={selected}
                selectedChannel={selectedChannel}
                onSelect={pickPosition}
                onRack={pickRack}
                links={links}
                formatTime={heartbeatOf}
                stampsOf={(tag) => {
                  const sg = sim?.frame?.signals[tag];
                  if (sg?.sourceTs === undefined) return null;
                  const f = (t: number) => `${formatLocalTime(simTimeMs(t), { date: true, seconds: true, timeZone: tz.timeZone })} · sim.`;
                  return { source: f(sg.sourceTs), received: sg.receivedTs !== undefined ? f(sg.receivedTs) : "—" };
                }}
              />
            )}
            {s.id === "rack-slots" && (
              <RackSlots
                rack={rack}
                racks={liveRacks}
                selectedPosition={selected?.position ?? null}
                onSelect={(p) => pickPosition(p)}
                onRack={pickRack}
                proposed={proposed}
              />
            )}
            {s.id === "rack-channels" && (
              <RackChannelMap
                model={model}
                racks={liveRacks}
                filter={mapFilter === "all" || model.rowsByRack.has(mapFilter) ? mapFilter : "all"}
                onFilter={setMapFilter}
                selectedKey={selectedRowKey}
                onSelect={pickRow}
                links={links}
              />
            )}
            {s.id === "rack-cabinet" && <RackCabinetSync model={model} machineId={machine.id} heartbeat={heartbeat} links={links} />}
            {s.id === "rack-calculated" && <RackCalculatedSignals model={model} links={links} />}
          </Section>
        ))}
      </div>
    </div>
  );
}

const stateSeverityLabel = (s: "warn" | "bad") => (s === "bad" ? "Critical" : "Advisory");
