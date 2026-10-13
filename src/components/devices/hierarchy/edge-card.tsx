"use client";

import React from "react";
import { StatusTag } from "@/components/assets/assets-shell-ui";
import { PillButton } from "@/components/ui";
import { isKilnMachine, useKilnSimulationFor } from "@/providers/kiln-simulation-context";
import type { EdgeCard, EdgeSource } from "@/types/edge";
import { type EdgeIndex, LINK_LABEL, LINK_TONE, ago, sourceLink } from "../edge-model";
import { ChannelTable, simulatedSignal } from "./edge-channels";
import type { DetectedCard } from "./edge-detect";
import { IconEdit, IconPlus, IconRack } from "./edge-icons";
import type { CardPrefill } from "./edge-card-dialog";
import type { MapTarget } from "./edge-map-dialog";
import { ContentsHead, Kpi } from "./edge-parts";
import { type Selection, plural } from "./edge-tree-model";

/* ==========================================================================
   Card: one slot of a source, its channels with live values and what each
   one is mapped to. KLN-01 channels with no MQTT reading show the running
   simulation, labelled "Simulated".
   ========================================================================== */

export interface EdgeCardViewProps {
  ix: EdgeIndex;
  src: EdgeSource;
  card: DetectedCard | null;
  cardId: string;
  now: number;
  history: Record<string, number[]>;
  sectionNav: React.ReactNode;
  onSelect: (sel: Selection) => void;
  onMap: (t: MapTarget) => void;
  onEditCard: (card: EdgeCard) => void;
  onRegisterCard: (prefill: CardPrefill) => void;
}

export function EdgeCardView({ ix, src, card, cardId, now, history, sectionNav, onSelect, onMap, onEditCard, onRegisterCard }: EdgeCardViewProps) {
  const gw = ix.gateways.get(src.gatewayId);
  const link = sourceLink(ix, src);
  const channels = card?.channels ?? [];
  const lastAt = channels.reduce<string | null>((t, ch) => {
    const at = ch.measurement?.updatedAt ?? null;
    return at && (!t || at > t) ? at : t;
  }, null);
  const flagged = channels.filter((c) => c.status === "alert" || c.status === "danger").length;
  const kilnMachine = channels.find((c) => isKilnMachine(c.point?.machineId))?.point?.machineId ?? (isKilnMachine(src.machineId) ? src.machineId : null);
  // Subscribes only for kiln cards (re-renders every second while it does).
  const sim = useKilnSimulationFor(kilnMachine);
  const simSignals = sim?.frame.signals ?? null;
  const simulated = channels.filter((c) => simulatedSignal(c, simSignals)).length;

  return (
    <>
      <ContentsHead
        crumbs={[
          { label: "Devices" },
          { label: "Edge network", onClick: () => onSelect({ type: "network" }) },
          ...(gw ? [{ label: gw.code, onClick: () => onSelect({ type: "gateway", id: gw.id }) }] : []),
          { label: src.code, onClick: () => onSelect({ type: "source", id: src.id }) },
          { label: `Card ${cardId}` },
        ]}
        title={`Card ${cardId}`}
        badge={
          <>
            <IconRack size={12} />
            Card · {src.code}
          </>
        }
        status={
          <>
            <StatusTag tone={LINK_TONE[link.status]} label={LINK_LABEL[link.status]} />
            {card?.isNew && <span className="dv-new">New</span>}
          </>
        }
        actions={
          card?.config ? (
            <PillButton variant="secondary" icon={<IconEdit size={13} />} onClick={() => onEditCard(card.config!)}>
              Edit card
            </PillButton>
          ) : (
            <PillButton variant="primary" icon={<IconPlus size={13} />} onClick={() => onRegisterCard({ code: cardId, cardType: card?.cardType ?? null, channelCount: card?.live || null })}>
              Register card
            </PillButton>
          )
        }
        sectionNav={sectionNav}
      />

      <section className="ast-kpis" aria-label="Card status">
        <Kpi label="Card type" value={card?.cardType ?? "Not set"}>
          <span className="ast-caption">
            {card?.config ? `Configured: ${card.config.cardType ?? "not set"}` : "Not configured"}
            {card?.reported ? ` · reported: ${card.reported.cardType ?? "not given"}` : ""}
          </span>
          {card?.reported?.presence && <span className="ast-caption">Presence: {card.reported.presence}</span>}
        </Kpi>
        <Kpi
          label="Channels"
          value={
            <>
              {card?.live ?? 0}
              <span className="ast-unit">reporting</span>
            </>
          }
          tone={card?.config?.channelCount != null && card.live < card.config.channelCount && card.detected ? "warn" : undefined}
        >
          <span className="ast-caption ast-num">
            {card?.config?.channelCount != null ? `Configured ${card.config.channelCount} ch · ${card.live} reporting` : "Channel count not configured"}
            {simulated ? ` · ${simulated} simulated` : ""}
          </span>
        </Kpi>
        <Kpi label="Mapped" value={`${card?.mapped ?? 0} / ${channels.length}`} tone={card && card.mapped < channels.length ? "warn" : undefined}>
          <span className="ast-caption ast-num">{plural(channels.length - (card?.mapped ?? 0), "channel")} not mapped</span>
        </Kpi>
        <Kpi label="Last reading" value={ago(lastAt, now)} tone={flagged ? "warn" : undefined}>
          <span className="ast-caption ast-num">{flagged ? `${plural(flagged, "channel")} over a limit` : "No channel over a limit"}</span>
        </Kpi>
      </section>

      <section className="ast-card pg-table-card" aria-label="Channels">
        <div className="ast-card-head">
          <h2 className="ast-card-title">
            Channels <span className="ast-caption ast-num">{channels.length}</span>
          </h2>
        </div>
        {!gw || channels.length === 0 ? (
          <div className="ast-empty">
            <strong className="hx-empty-title">No channels</strong>
            Nothing on card {cardId} is registered or has been received.
          </div>
        ) : (
          <ChannelTable gw={gw} channels={channels} history={history} now={now} onMap={onMap} simSignals={simSignals} />
        )}
      </section>
    </>
  );
}
