"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { PillButton, Loading } from "@/components/ui";
import { EdgeProvider, useEdge } from "@/providers/edge-context";
import { useKilnFleet } from "@/providers/kiln-simulation-context";
import { machineCode } from "@/lib/display-name";
import { ULTRON_FORMAT, ULTRON_FORMAT_ID } from "@shared/lib/edge-format";
import type { EdgeBroker, EdgeFormat, EdgeGateway, EdgePoint, EdgeSource } from "@shared/types/edge";
import { type DiscoveredGateway, buildIndex, discoveredGateways, gatewayTone } from "./edge-model";
import { type ChannelRow, type Signals, allChannels, detections } from "./devices-rows";
import { DiscoveredBody, GatewayBody } from "./devices-gateways";
import { ALL_MACHINES, MappingBody, machineRows } from "./devices-mapping";
import { DevicesTree, type TreePick, channelRowId, discoveredRowId, gatewayRowId, rackRowId } from "./devices-tree";
import { BrokerDialog } from "./broker-dialog";
import { FormatEditor } from "./formats/format-editor";
import { draftFrom, usage, type FormatDraft } from "./formats/format-model";
import { GatewayDialog, type GatewayPrefill } from "./hierarchy/edge-gateway-dialog";
import { SourceDialog, type SourcePrefill } from "./hierarchy/edge-source-dialog";
import { PointDialog } from "./hierarchy/edge-point-dialog";
import { MapDialog, type MapTarget } from "./hierarchy/edge-map-dialog";
import { ConnectWizard } from "./hierarchy/edge-connect-wizard";
import { mapTarget } from "./hierarchy/edge-channels";
import { IconPlus } from "./hierarchy/edge-icons";
import { plural, sortGateways } from "./hierarchy/edge-tree-model";
import "@/components/assets/assets-shell.css";
import "@/components/ui/page.css";
import "@/components/home/plant-home.css";
import "@/components/home/operator/operator-console.css";
import "@/components/configure/configure.css";
import "./devices.css";

/* ==========================================================================
   Devices — how sensor readings reach ULTRON. Same frame as Configure: a
   section bar, a bar for what is inside the section, then the section.

     Gateways         pick a gateway → its settings, its racks, the chosen
                      rack's channels. Data connection (MQTT broker) and
                      message format open from the gateway.
     Machine mapping  pick a machine → which gateway › rack › card · channel
                      feeds each of its sensors; channels linked to none.

   One registry fetch and one event stream (EdgeProvider) serve both.
   ========================================================================== */

type Section = "gateways" | "mapping";
const SECTIONS: Section[] = ["gateways", "mapping"];
const SECTION_LABEL: Record<Section, string> = { gateways: "Gateways", mapping: "Machine mapping" };
const KEY = { section: "ultron.devices.section", gateway: "ultron.devices.gateway", machine: "ultron.devices.machine" };

const discKey = (d: DiscoveredGateway) => `disc:${d.brokerId}/${d.gatewayId}`;

function read(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

/** Wall clock for "12s ago", ticking every few seconds. 0 until mounted. */
function useClock(ms: number): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return now;
}

type DialogSpec =
  | { kind: "gateway"; gateway?: EdgeGateway; prefill?: GatewayPrefill }
  | { kind: "source"; source?: EdgeSource; prefill?: SourcePrefill }
  | { kind: "point"; sourceId: string; point?: EdgePoint }
  | { kind: "map"; target: MapTarget }
  | { kind: "broker"; broker: EdgeBroker | null }
  | { kind: "connect" };

interface DialogState {
  /** Remounts the form, so every opening starts from its own values. */
  seq: number;
  open: boolean;
  spec: DialogSpec;
}

type Editing = { format: EdgeFormat | null; initial: FormatDraft; seq: number } | null;

/** "8 racks with 223 channels. All are linked to a machine." */
function gatewaySummary(racks: number, channels: number, linked: number): string {
  const head = `${plural(racks, "rack")} with ${plural(channels, "channel")}.`;
  if (!channels) return head;
  if (linked === channels) return `${head} All are linked to a machine.`;
  return `${head} ${linked} of ${channels} are linked to a machine.`;
}

export function IndustrialDevicesView() {
  return (
    <EdgeProvider>
      <DevicesShell />
    </EdgeProvider>
  );
}

function DevicesShell() {
  const { registry, snapshot, loading, error, refresh } = useEdge();
  const fleet = useKilnFleet();
  const clock = useClock(5000);
  const now = Math.max(clock, snapshot ? Date.parse(snapshot.serverNow) : 0);

  const [section, setSectionState] = useState<Section>("gateways");
  const [gatewayKey, setGatewayKey] = useState<string | null>(null);
  const [rackId, setRackId] = useState<string | null>(null);
  // Channel picked in the tree: its row is marked in the channels table.
  const [channelKey, setChannelKey] = useState<string | null>(null);
  const [machineId, setMachineId] = useState<string>(ALL_MACHINES);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [editing, setEditing] = useState<Editing>(null);

  // Restored after mount: sessionStorage is client-only and SSR renders the default.
  useEffect(() => {
    const s = read(KEY.section);
    if (s && (SECTIONS as string[]).includes(s)) setSectionState(s as Section);
    setGatewayKey(read(KEY.gateway));
    setMachineId(read(KEY.machine) ?? ALL_MACHINES);
  }, []);

  const setSection = useCallback((s: Section) => {
    setSectionState(s);
    setEditing(null);
    store(KEY.section, s);
  }, []);
  const pickGateway = useCallback((key: string) => {
    setGatewayKey(key);
    setRackId(null);
    setChannelKey(null);
    setEditing(null);
    store(KEY.gateway, key);
  }, []);
  const pickRack = useCallback((id: string) => {
    setRackId(id);
    setChannelKey(null);
  }, []);
  const pickInTree = useCallback(
    (pick: TreePick) => {
      setSection("gateways");
      if (pick.type === "discovered") return pickGateway(pick.key);
      pickGateway(pick.gatewayId);
      if (pick.type === "rack" || pick.type === "channel") setRackId(pick.rackId);
      if (pick.type === "channel") setChannelKey(pick.channelKey);
    },
    [setSection, pickGateway],
  );
  const pickMachine = useCallback((id: string) => {
    setMachineId(id);
    store(KEY.machine, id);
  }, []);

  const ix = useMemo(() => (registry ? buildIndex(registry, snapshot) : null), [registry, snapshot]);
  // Registry loaded, live state not yet: counts of readings would read 0 until the first snapshot.
  const connecting = Boolean(registry) && snapshot === null && !error;
  const signals = useMemo<Signals>(() => Object.fromEntries(Object.entries(fleet).map(([id, s]) => [id, s.frame.signals])), [fleet]);
  const det = useMemo(() => (ix ? detections(ix) : new Map()), [ix]);
  const channels = useMemo<ChannelRow[]>(() => (ix ? allChannels(ix, det, signals) : []), [ix, det, signals]);
  const discovered = useMemo(() => (ix ? discoveredGateways(ix) : []), [ix]);
  const gateways = useMemo(() => (registry ? sortGateways(registry.gateways) : []), [registry]);

  const gw = gateways.find((g) => g.id === gatewayKey) ?? (discovered.some((d) => discKey(d) === gatewayKey) ? null : (gateways[0] ?? null));
  const found = gw ? null : (discovered.find((d) => discKey(d) === gatewayKey) ?? (gateways.length ? null : (discovered[0] ?? null)));
  const machines = useMemo(() => (ix ? machineRows(ix, channels) : []), [ix, channels]);
  const machine = machines.find((m) => m.id === machineId) ?? null;
  const unlinked = channels.filter((r) => !r.tag).length;
  // The tree marks what the Gateways section shows; nothing while on Machine mapping.
  const treeSelected =
    section !== "gateways" || editing
      ? null
      : gw
        ? channelKey
          ? channelRowId(channelKey)
          : rackId
            ? rackRowId(gw.id, rackId)
            : gatewayRowId(gw.id)
        : found
          ? discoveredRowId(discKey(found))
          : null;

  const openDialog = (spec: DialogSpec) => setDialog((d) => ({ seq: (d?.seq ?? 0) + 1, open: true, spec }));
  const closeDialog = () => setDialog((d) => (d ? { ...d, open: false } : d));
  const link = (r: ChannelRow) => openDialog({ kind: "map", target: mapTarget(r.gw, r.ch) });
  const editPoint = (r: ChannelRow) => r.ch.point && openDialog({ kind: "point", sourceId: r.ch.point.sourceId, point: r.ch.point });

  const openFormat = (g: EdgeGateway) => {
    const id = g.formatId ?? ULTRON_FORMAT_ID;
    const format = registry?.formats.find((f) => f.id === id) ?? (g.formatId ? null : ULTRON_FORMAT);
    setEditing((e) => ({ format, initial: draftFrom(format), seq: (e?.seq ?? 0) + 1 }));
  };
  const duplicateFormat = (source: EdgeFormat | null) => (draft: FormatDraft) =>
    setEditing((e) => ({
      format: null,
      initial: { ...draft, name: `Copy of ${draft.name || source?.name || "format"}` },
      seq: (e?.seq ?? 0) + 1,
    }));

  /* ---------- bars */
  const sectionCount: Record<Section, string> = {
    gateways: String(gateways.length + discovered.length),
    mapping: String(channels.length - unlinked),
  };
  const sectionTone: Record<Section, string | undefined> = {
    gateways: ix && gateways.some((g) => ["warn", "bad"].includes(gatewayTone(ix, g))) ? "bad" : discovered.length ? "info" : undefined,
    mapping: unlinked ? "warn" : undefined,
  };

  type Pill = { id: string; label: string; count?: string; tone?: string; title?: string };
  const pills: Pill[] =
    section === "gateways"
      ? [
          ...gateways.map((g) => {
            const tone = ix ? gatewayTone(ix, g) : "idle";
            return { id: g.id, label: g.code, count: String(det.get(g.id)?.racks.length ?? 0), tone: tone === "good" || tone === "idle" ? undefined : tone, title: g.name };
          }),
          ...discovered.map((d) => ({ id: discKey(d), label: d.gatewayId, count: "New", tone: "info", title: `${d.gatewayId} is sending readings but is not added yet` })),
        ]
      : [
          { id: ALL_MACHINES, label: "All machines", count: String(machines.length) },
          ...machines.map((m) => ({ id: m.id, label: machineCode(m.name), count: String(m.linked), title: m.name })),
        ];
  const activePill = section === "gateways" ? (gw?.id ?? (found ? discKey(found) : "")) : machine ? machine.id : ALL_MACHINES;

  const barActions =
    // The format editor carries its own Close.
    section === "gateways" && gw && !editing ? (
      <PillButton variant="secondary" onClick={() => openDialog({ kind: "gateway", gateway: gw })}>
        Edit gateway
      </PillButton>
    ) : section === "mapping" && unlinked > 0 ? (
      <span className="pg-note cfg-bar-note" data-tone="warn">
        {unlinked === 1 ? "1 channel is" : `${unlinked} channels are`} not linked to any machine
      </span>
    ) : null;

  /* ---------- section head */
  const gwChannels = gw ? channels.filter((r) => r.gw.id === gw.id) : [];
  const head =
    section === "gateways"
      ? editing && gw
        ? { title: "Message format", context: "How ULTRON reads this gateway's messages: where they arrive, and where each reading sits in them." }
        : gw
          ? {
              title: gw.name,
              context: gatewaySummary(det.get(gw.id)?.racks.length ?? 0, gwChannels.length, gwChannels.filter((r) => r.tag).length),
            }
          : found
            ? { title: found.gatewayId, context: "This gateway is sending readings but is not added yet. Add it to see its racks and link its sensors." }
            : { title: "Gateways", context: "A gateway is the box on site that collects sensor readings from racks and control systems and sends them to ULTRON." }
      : machine
        ? { title: machine.name, context: "Where each sensor of this machine is wired: its gateway, rack, card and channel." }
        : { title: "Machine mapping", context: "Where each machine's sensors are wired: the gateway, rack, card and channel that bring in their readings." };

  let body: React.ReactNode;
  if (!ix) {
    body = (
      <div className="ast-card ast-empty" role={error && !loading ? "alert" : undefined}>
        {loading || !error ? (
          <Loading label="Loading gateways…" rows={5} inline />
        ) : (
          <>
            The gateways could not be loaded. Try again.
            <div className="cfg-empty-actions">
              <PillButton variant="secondary" onClick={() => void refresh()}>
                Retry
              </PillButton>
            </div>
          </>
        )}
      </div>
    );
  } else if (section === "mapping") {
    body = <MappingBody ix={ix} channels={channels} machineId={machine ? machine.id : ALL_MACHINES} now={now} connecting={connecting} onMachine={pickMachine} onLink={link} onEditPoint={editPoint} />;
  } else if (gw && editing) {
    body = (
      <FormatEditor
        key={editing.seq}
        format={editing.format}
        initial={editing.initial}
        gateways={editing.format ? (usage(ix.registry).get(editing.format.id) ?? []) : []}
        onClose={() => setEditing(null)}
        onDuplicate={duplicateFormat(editing.format)}
      />
    );
  } else if (gw) {
    body = (
      <GatewayBody
        ix={ix}
        connecting={connecting}
        gw={gw}
        detection={det.get(gw.id)}
        rackId={rackId}
        channelKey={channelKey}
        now={now}
        signals={signals}
        onRack={pickRack}
        onBroker={(broker) => openDialog({ kind: "broker", broker })}
        onEditGateway={() => openDialog({ kind: "gateway", gateway: gw })}
        onFormat={() => openFormat(gw)}
        onAddRack={(code) => openDialog({ kind: "source", prefill: { gatewayId: gw.id, ...(code ? { code } : {}) } })}
        onEditRack={(source) => openDialog({ kind: "source", source })}
        onAddChannel={(source) => openDialog({ kind: "point", sourceId: source.id })}
        onLink={link}
        onEditPoint={editPoint}
      />
    );
  } else if (found) {
    body = (
      <DiscoveredBody
        ix={ix}
        found={found}
        now={now}
        onAdd={() => openDialog({ kind: "gateway", prefill: { code: found.gatewayId, brokerId: found.brokerId, ipAddress: found.ip || null, racks: found.rackIds } })}
      />
    );
  } else {
    body = (
      <div className="ast-card ast-empty">
        No gateways yet. Add one: choose its message server and topic, and its racks and channels appear as soon as it sends readings.
        <div className="cfg-empty-actions">
          <PillButton variant="primary" icon={<IconPlus size={13} />} onClick={() => openDialog({ kind: "connect" })}>
            Add gateway
          </PillButton>
        </div>
      </div>
    );
  }

  return (
    <div className="cfg-shell dvp-shell" aria-label="Devices">
      <header className="opc-topbar cfg-topbar" aria-label="Devices sections">
        <div className="opc-stage-tabs">
          <div className="opc-pill-group" role="tablist" aria-label="Devices sections">
            {SECTIONS.map((id) => {
              const active = section === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className="opc-pill-btn"
                  data-active={active || undefined}
                  onClick={() => setSection(id)}
                >
                  {sectionTone[id] && <span className="ph-unit-dot" data-tone={sectionTone[id]} aria-hidden="true" />}
                  <span>{SECTION_LABEL[id]}</span>
                  {ix && <span className="opc-app-count">{sectionCount[id]}</span>}
                </button>
              );
            })}
          </div>
        </div>
        <div className="opc-topbar-right">
          <PillButton variant="primary" icon={<IconPlus size={13} />} onClick={() => openDialog({ kind: "connect" })} disabled={!ix}>
            Add gateway
          </PillButton>
        </div>
      </header>

      <div className="opc-subbar cfg-subbar" role="region" aria-label={`${SECTION_LABEL[section]}: contents and actions`}>
        <div className="opc-stage-tabs">
          {pills.length > 0 && (
            <div className="opc-pill-group opc-subassembly-pills" role="tablist" aria-label={section === "gateways" ? "Gateways" : "Machines"}>
              {pills.map((p) => {
                const active = p.id === activePill;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className="opc-pill-btn"
                    data-active={active || undefined}
                    title={p.title ?? p.label}
                    onClick={() => (section === "gateways" ? pickGateway(p.id) : pickMachine(p.id))}
                  >
                    {p.tone && <span className="ph-unit-dot" data-tone={p.tone} aria-hidden="true" />}
                    <span>{p.label}</span>
                    {p.count && <span className="opc-app-count">{p.count}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="opc-stage-toggles">{barActions}</div>
      </div>

      <div className="dvp-body">
        {/* No gateways: the section's own empty state says what to do. */}
        {ix && gateways.length + discovered.length > 0 && (
          <DevicesTree
            ix={ix}
            gateways={gateways}
            discovered={discovered}
            discoveredKey={discKey}
            det={det}
            channels={channels}
            selectedId={treeSelected}
            onPick={pickInTree}
          />
        )}
        <div className="pg-root ast-root cfg-root">
          <div className="cfg-main">
            <header className="ast-head pg-head">
              <div className="ast-head-main">
                <div className="ast-title-row">
                  <h1 className="ast-title">{head.title}</h1>
                </div>
                <p className="pg-cfg-context">{head.context}</p>
              </div>
            </header>
            {/* Saved gateways are shown; their live state arrives with the first MQTT snapshot. */}
            {connecting && (
              <div className="ast-card dvp-connecting">
                <Loading label="Connecting to live data…" inline />
              </div>
            )}
            {body}
          </div>
        </div>
      </div>

      {ix && dialog?.spec.kind === "gateway" && (
        <GatewayDialog
          key={dialog.seq}
          open={dialog.open}
          ix={ix}
          gateway={dialog.spec.gateway}
          prefill={dialog.spec.prefill}
          onClose={closeDialog}
          onSaved={(sel) => {
            closeDialog();
            if (sel.type === "gateway") pickGateway(sel.id);
          }}
        />
      )}
      {ix && dialog?.spec.kind === "source" && (
        <SourceDialog
          key={dialog.seq}
          open={dialog.open}
          ix={ix}
          source={dialog.spec.source}
          prefill={dialog.spec.prefill}
          lockGateway={!dialog.spec.source}
          onClose={closeDialog}
          onSaved={(sel) => {
            closeDialog();
            const code = sel.type === "source" ? ix.sources.get(sel.id)?.code : undefined;
            if (code) setRackId(code);
          }}
        />
      )}
      {ix && dialog?.spec.kind === "point" && (
        <PointDialog key={dialog.seq} open={dialog.open} ix={ix} sourceId={dialog.spec.sourceId} point={dialog.spec.point} onClose={closeDialog} onSaved={closeDialog} />
      )}
      {ix && dialog?.spec.kind === "map" && <MapDialog key={dialog.seq} open={dialog.open} ix={ix} target={dialog.spec.target} onClose={closeDialog} />}
      {ix && dialog?.spec.kind === "connect" && (
        <ConnectWizard
          key={dialog.seq}
          open={dialog.open}
          ix={ix}
          now={now}
          onClose={closeDialog}
          onCommissioned={(id) => {
            setSection("gateways");
            pickGateway(id);
          }}
        />
      )}
      {ix && dialog?.open && dialog.spec.kind === "broker" && (
        <BrokerDialog
          key={dialog.seq}
          broker={dialog.spec.broker}
          gatewayCount={dialog.spec.broker ? ix.registry.gateways.filter((g) => g.brokerId === (dialog.spec as { broker: EdgeBroker }).broker.id).length : 0}
          onClose={closeDialog}
        />
      )}
    </div>
  );
}
