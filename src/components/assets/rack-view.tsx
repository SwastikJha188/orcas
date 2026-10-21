"use client";

import React, { useCallback, useMemo, useState } from "react";
import type { AssetMachine } from "./assets-data";
import type { MachineRackInfo } from "@shared/lib/rack-data";
import type { KilnSimulation } from "./kiln-seals-simulation";
import { useMachineRackUnits } from "./use-machine-rack-units";
import { applyRackLive, applyRackMqtt, applyRackSimulation } from "./rack-simulation";
import { useMachineCatalog, useMachineMeasurements } from "./use-machine-catalog";
import { useApi } from "@/lib/api-cache";
import type { EdgeRegistry } from "@shared/types/edge";
import { rackSpecFrom } from "./rack-spec";
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
import { D4_REQUIRED_TARGET_PCT, requiredAvailability } from "./sensors-model";
import { PillButton } from "@/components/ui";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { isKilnMachine, useKilnSimulationFor } from "@/providers/kiln-simulation-context";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import { formatLocalTime } from "@/lib/time";
import { simTimeMs } from "@shared/lib/kiln-sim/engine";
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
  { id: "rack-chassis", label: "Card frame" },
  { id: "rack-slots", label: "Slots" },
  { id: "rack-channels", label: "Inputs" },
  { id: "rack-cabinet", label: "Cabinet and clock" },
  { id: "rack-calculated", label: "Calculated values" },
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
  const measurements = useMachineMeasurements(machine.id);
  // Edge registry: the gateway / source / card record the cabinet is compared against.
  const registry = useApi<EdgeRegistry>("/api/edge");
  const spec = useMemo(() => rackSpecFrom(registry.data, machine.id), [registry.data, machine.id]);
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
        measurements: measurements.byTag,
      }),
    [machine.id, liveRacks, acq.data, sim?.frame, catalog.sensors, measurements.byTag],
  );

  const [pickedRackId, setPickedRackId] = useState<string | null>(null);
  const [picked, setPicked] = useState<{ position: number; channel: string | null } | null>(null);
  const [mapFilter, setMapFilter] = useState<string>("all");

  const heartbeatOf = useCallback(
    (iso: string | null) => (iso ? `${formatLocalTime(iso, { date: true, timeZone: tz.timeZone })} · ${tz.label}` : "No sign of life recorded"),
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
          <Empty title={`Loading the rack for ${machine.name}…`} />
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
          <Empty title={isError ? "Could not load the cabinet data. Try again." : `No rack is linked to ${machine.name}.`}>
            {isError ? null : "Link this machine's sensor inputs to it on the Devices page."}
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
  const heartbeat = lastSeen ? heartbeatOf(lastSeen) : "No sign of life received";
  const required = requiredAvailability(sim?.frame, measurements.byTag);
  const tones = sectionTones(model);
  const sections = SECTIONS.filter((s) => s.id !== "rack-calculated" || model.calculated.length > 0);
  const index: SectionIndexItem[] = sections.map((s) => ({ id: s.id, label: s.label, tone: tones[s.id] }));
  const stateLabel = model.state === "empty" ? "Not assessed" : model.state === "ok" ? "Normal" : stateSeverityLabel(model.state);
  const alertTone = (t: Tone): Tone | undefined => (t === "warn" || t === "bad" ? t : undefined);
  const faults = model.signal.bad + model.signal.warn;
  const kpis: KpiItem[] = [
    {
      label: proposed ? "Slots planned" : "Slots in use",
      value: String(model.cards),
      unit: `of ${model.positions}`,
      foot: `${model.chassisCount} card frame${model.chassisCount === 1 ? "" : "s"} · ${model.positions - model.cards} ${proposed ? "not planned yet" : "spare"}`,
    },
    {
      label: proposed ? "Inputs planned" : "Sensors wired",
      value: String(model.rows.length),
      unit: model.catalogTotal ? `of ${model.catalogTotal}` : undefined,
      tone: model.unwired.length ? "warn" : undefined,
      foot: model.catalogTotal
        ? `${model.catalogTotal} sensors in all · ${model.calculated.length} calculated${model.manual.length ? ` · ${model.manual.length} typed in by hand` : ""} · ${model.unwired.length} ${proposed ? "not planned yet" : "not wired yet"}`
        : catalog.isLoading
          ? "Loading sensors…"
          : `${model.calculated.length} calculated`,
    },
    {
      label: "Doubtful readings",
      value: String(faults),
      tone: model.signal.bad ? "bad" : faults ? "warn" : required && required.pct < D4_REQUIRED_TARGET_PCT ? "warn" : undefined,
      foot: `${model.signal.bad} not usable · ${model.signal.warn} may be wrong${required ? ` · must-have sensors ${required.pct} % good (target ${D4_REQUIRED_TARGET_PCT} %, D4 Table 11.1)` : ""}`,
    },
    {
      label: "Clock",
      value: PTP_WORD[model.record.ptp.mode] ?? model.record.ptp.mode,
      text: true,
      tone: alertTone(STATE_TONE[model.record.ptp.state]),
      foot: model.record.ptp.latencyMs !== null ? `time signal delay ${model.record.ptp.latencyMs} ms (PTP)` : "no clock record",
    },
  ];

  return (
    <div className="ast-root pg-frame pg-analysis pg-rack" aria-label="Rack">
      {header(
        { label: stateLabel, tone: model.state === "empty" || model.state === "ok" ? undefined : STATE_TONE[model.state] },
        [
          { label: "Gateway", value: `${model.link.code} · ${model.link.label}` },
          { label: "Cabinets", value: liveRacks.map((r) => r.code).filter((c, i, a) => a.indexOf(c) === i).join(" · ") },
          {
            label: "Sensors",
            value: model.catalogTotal
              ? `${model.catalogTotal} in all · ${model.rows.length} ${proposed ? "planned" : "wired"}, ${model.calculated.length} calculated${model.manual.length ? `, ${model.manual.length} typed in by hand` : ""}${model.unwired.length ? `, ${model.unwired.length} ${proposed ? "not planned yet" : "not wired yet"}` : ""}`
              : `${model.rows.length} ${proposed ? "planned" : "wired"}`,
          },
          lastSeen || proposed ? { label: "Last sign of life", value: heartbeat } : null,
        ],
        <PillButton variant="secondary" onClick={() => links.devices(model.link.gateway ? `gw:${model.link.gateway.id}` : undefined)}>
          Network devices
        </PillButton>,
      )}

      {proposed && spec?.notes && (
        <p className="ast-caption" role="note">
          {spec.notes}
        </p>
      )}

      {acq.error && acq.data && (
        <p className="ast-caption" role="status">
          Could not reach the gateway. Showing the previous reading.
        </p>
      )}

      <KpiStrip page items={kpis} label="Rack" />

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
                  const f = (t: number) => `${formatLocalTime(simTimeMs(t), { date: true, seconds: true, timeZone: tz.timeZone })}`;
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
            {s.id === "rack-cabinet" && <RackCabinetSync model={model} spec={spec} heartbeat={heartbeat} links={links} />}
            {s.id === "rack-calculated" && <RackCalculatedSignals model={model} links={links} />}
          </Section>
        ))}
      </div>
    </div>
  );
}

const stateSeverityLabel = (s: "warn" | "bad") => (s === "bad" ? "Critical" : "Alert");
/** Everyday words for the cabinet clock state. */
const PTP_WORD: Record<string, string> = { Locked: "In sync", Holdover: "Running on its own", "As recorded": "As recorded", "Not reported": "Not reported" };
