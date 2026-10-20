"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { PillButton } from "@/components/ui";
import { useEdge } from "@/providers/edge-context";
import type { EdgeCard, EdgeGateway, EdgePoint, EdgeSource } from "@/types/edge";
import { buildIndex, discoveredGateways } from "../edge-model";
import { EdgeTree } from "./edge-tree";
import { EdgeNetwork } from "./edge-network";
import { EdgeGatewayView } from "./edge-gateway";
import { EdgeSourceView, type PointPrefill } from "./edge-source";
import { EdgeDiscoveredView } from "./edge-discovered";
import { GatewayDialog, type GatewayPrefill } from "./edge-gateway-dialog";
import { SourceDialog, type SourcePrefill } from "./edge-source-dialog";
import { PointDialog } from "./edge-point-dialog";
import { MapDialog, type MapTarget } from "./edge-map-dialog";
import { EdgeCardView } from "./edge-card";
import { sourceCards } from "./edge-detect";
import { CardDialog, type CardPrefill } from "./edge-card-dialog";
import { ConnectWizard } from "./edge-connect-wizard";
import {
  ALL_PLANTS,
  NETWORK_KEY,
  type Selection,
  gatewaysInPlant,
  parseSelection,
  plantOptions,
  resolveSelection,
  selectionKey,
} from "./edge-tree-model";
import "@/components/assets/assets-shell.css";

/* ==========================================================================
   Devices › Hierarchy: the acquisition network as a tree, like the asset
   hierarchy. Edge network → gateway → source (rack · PLC · SCADA · DCS ·
   analyser), with points in the source view. Registry from /api/edge, live
   state from the MQTT stream, both through EdgeProvider.
   ========================================================================== */

const SELECTED_KEY = "ultron.devices.selected";
const PLANT_KEY = "ultron.devices.plant";

type DialogSpec =
  | { kind: "gateway"; gateway?: EdgeGateway; prefill?: GatewayPrefill }
  | { kind: "source"; source?: EdgeSource; prefill?: SourcePrefill; lockGateway?: boolean }
  | { kind: "point"; sourceId: string; point?: EdgePoint; prefill?: PointPrefill }
  | { kind: "map"; target: MapTarget }
  | { kind: "card"; sourceId: string; card?: EdgeCard; prefill?: CardPrefill }
  | { kind: "connect" };

interface DialogState {
  /** Remounts the form, so every opening starts from its own values. */
  seq: number;
  open: boolean;
  spec: DialogSpec;
}

function store(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

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

export function DevicesHierarchy({
  sectionNav,
  initialSelection,
  startConnect,
}: {
  sectionNav: React.ReactNode;
  /** Selection key to open on (from the Devices overview); shows all plants so it is in the tree. */
  initialSelection?: string;
  /** Open the connect-gateway wizard on mount. */
  startConnect?: boolean;
}) {
  const { registry, loading, error, refresh, snapshot, history } = useEdge();
  const [selKey, setSelKey] = useState<string>(NETWORK_KEY);
  const [plantId, setPlantId] = useState<string>(ALL_PLANTS);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const clock = useClock(5000);
  const now = Math.max(clock, snapshot ? Date.parse(snapshot.serverNow) : 0);

  // Restored after mount: sessionStorage is client-only and SSR renders the default.
  useEffect(() => {
    if (initialSelection) {
      setSelKey(initialSelection);
      setPlantId(ALL_PLANTS);
      store(SELECTED_KEY, initialSelection);
      store(PLANT_KEY, ALL_PLANTS);
    } else {
      try {
        setSelKey(sessionStorage.getItem(SELECTED_KEY) ?? NETWORK_KEY);
        setPlantId(sessionStorage.getItem(PLANT_KEY) ?? ALL_PLANTS);
      } catch {
        /* storage unavailable */
      }
    }
    if (startConnect) setDialog({ seq: 1, open: true, spec: { kind: "connect" } });
    // Mount-only: the parent remounts this view for each new intent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const select = useCallback((sel: Selection) => {
    const key = selectionKey(sel);
    setSelKey(key);
    store(SELECTED_KEY, key);
  }, []);

  const changePlant = (id: string) => {
    setPlantId(id);
    store(PLANT_KEY, id);
    select({ type: "network" });
  };

  const ix = useMemo(() => (registry ? buildIndex(registry, snapshot) : null), [registry, snapshot]);
  const discovered = useMemo(() => (ix ? discoveredGateways(ix) : []), [ix]);
  const plants = useMemo(() => (registry ? plantOptions(registry) : []), [registry]);
  const validPlant = plantId === ALL_PLANTS || plants.some((p) => p.id === plantId) ? plantId : ALL_PLANTS;
  const gateways = useMemo(() => (registry ? gatewaysInPlant(registry, validPlant) : []), [registry, validPlant]);
  const plantLabel = validPlant === ALL_PLANTS ? "All plants" : plants.find((p) => p.id === validPlant)?.label ?? "All plants";

  const openDialog = (spec: DialogSpec) => setDialog((d) => ({ seq: (d?.seq ?? 0) + 1, open: true, spec }));
  const closeDialog = () => setDialog((d) => (d ? { ...d, open: false } : d));
  const saved = (sel: Selection) => {
    closeDialog();
    select(sel);
  };

  if (!ix) {
    return (
      <div className="assets-module-container">
        <div className="assets-directory-workspace ast-root">
          {sectionNav}
          <div className="ast-card ast-empty" role={error ? "alert" : "status"}>
            {loading || !error ? (
              <strong className="hx-empty-title">Loading the list of devices…</strong>
            ) : (
              <>
                <strong className="hx-empty-title">The list of devices could not be loaded. Try again.</strong>
                <PillButton variant="secondary" onClick={() => void refresh()}>
                  Retry
                </PillButton>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const selection = resolveSelection(ix, parseSelection(selKey), discovered);
  const addGateway = () => openDialog({ kind: "gateway" });
  const connect = () => openDialog({ kind: "connect" });
  const openMap = (target: MapTarget) => openDialog({ kind: "map", target });

  let contents: React.ReactNode;
  if (selection.type === "gateway") {
    const gw = ix.gateways.get(selection.id)!;
    contents = (
      <EdgeGatewayView
        ix={ix}
        gw={gw}
        now={now}
        sectionNav={sectionNav}
        onSelect={select}
        onEdit={() => openDialog({ kind: "gateway", gateway: gw })}
        onAddSource={(prefill) => openDialog({ kind: "source", prefill: { gatewayId: gw.id, ...prefill }, lockGateway: true })}
        onMap={openMap}
      />
    );
  } else if (selection.type === "source") {
    const src = ix.sources.get(selection.id)!;
    contents = (
      <EdgeSourceView
        key={src.id}
        ix={ix}
        src={src}
        now={now}
        history={history}
        sectionNav={sectionNav}
        onSelect={select}
        onEdit={() => openDialog({ kind: "source", source: src })}
        onAddPoint={(prefill) => openDialog({ kind: "point", sourceId: src.id, prefill })}
        onEditPoint={(point) => openDialog({ kind: "point", sourceId: src.id, point })}
        onMap={openMap}
        onAddCard={() => openDialog({ kind: "card", sourceId: src.id })}
      />
    );
  } else if (selection.type === "card") {
    const src = ix.sources.get(selection.sourceId)!;
    const card = sourceCards(ix, src).find((c) => c.id === selection.card) ?? null;
    contents = (
      <EdgeCardView
        ix={ix}
        src={src}
        card={card}
        cardId={selection.card}
        now={now}
        history={history}
        sectionNav={sectionNav}
        onSelect={select}
        onMap={openMap}
        onEditCard={(c) => openDialog({ kind: "card", sourceId: src.id, card: c })}
        onRegisterCard={(prefill) => openDialog({ kind: "card", sourceId: src.id, prefill })}
      />
    );
  } else if (selection.type === "discovered") {
    const found = discovered.find((d) => d.brokerId === selection.brokerId && d.gatewayId === selection.gatewayId)!;
    contents = (
      <EdgeDiscoveredView
        ix={ix}
        found={found}
        now={now}
        sectionNav={sectionNav}
        onSelect={select}
        onRegister={() => openDialog({ kind: "gateway", prefill: { code: found.gatewayId, brokerId: found.brokerId, ipAddress: found.ip || null, racks: found.rackIds } })}
      />
    );
  } else {
    contents = (
      <EdgeNetwork
        ix={ix}
        gateways={gateways}
        discovered={discovered}
        plantLabel={plantLabel}
        now={now}
        sectionNav={sectionNav}
        onSelect={select}
        onConnect={connect}
        onAddManual={addGateway}
      />
    );
  }

  return (
    <div className="assets-module-container">
      <EdgeTree
        ix={ix}
        gateways={gateways}
        discovered={discovered}
        plants={plants}
        plantId={validPlant}
        onPlantChange={changePlant}
        selected={selection}
        onSelect={select}
        onAddGateway={connect}
      />
      <div className="assets-directory-workspace ast-root hx-contents dv-contents" aria-label="Device tree contents">
        {contents}
      </div>

      {dialog?.spec.kind === "gateway" && (
        <GatewayDialog key={dialog.seq} open={dialog.open} ix={ix} gateway={dialog.spec.gateway} prefill={dialog.spec.prefill} onClose={closeDialog} onSaved={saved} />
      )}
      {dialog?.spec.kind === "source" && (
        <SourceDialog
          key={dialog.seq}
          open={dialog.open}
          ix={ix}
          source={dialog.spec.source}
          prefill={dialog.spec.prefill}
          lockGateway={dialog.spec.lockGateway}
          onClose={closeDialog}
          onSaved={saved}
        />
      )}
      {dialog?.spec.kind === "connect" && (
        <ConnectWizard key={dialog.seq} open={dialog.open} ix={ix} now={now} onClose={closeDialog} onCommissioned={(id) => select({ type: "gateway", id })} />
      )}
      {dialog?.spec.kind === "card" && (
        <CardDialog
          key={dialog.seq}
          open={dialog.open}
          ix={ix}
          sourceId={dialog.spec.sourceId}
          card={dialog.spec.card}
          prefill={dialog.spec.prefill}
          onClose={closeDialog}
          onSaved={saved}
        />
      )}
      {dialog?.spec.kind === "map" && <MapDialog key={dialog.seq} open={dialog.open} ix={ix} target={dialog.spec.target} onClose={closeDialog} />}
      {dialog?.spec.kind === "point" && (
        <PointDialog
          key={dialog.seq}
          open={dialog.open}
          ix={ix}
          sourceId={dialog.spec.sourceId}
          point={dialog.spec.point}
          prefill={dialog.spec.prefill}
          onClose={closeDialog}
          onSaved={saved}
        />
      )}
    </div>
  );
}
