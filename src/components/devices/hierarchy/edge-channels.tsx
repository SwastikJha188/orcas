"use client";

import React, { useState } from "react";
import { ConfirmAction, FormNote, PillButton, Table, type Column } from "@/components/ui";
import { IconSensor, StatusTag } from "@/components/assets/assets-shell-ui";
import { Sparkline } from "@/components/ui/sparkline";
import { useEdge } from "@/providers/edge-context";
import { isLiveMachine } from "@/providers/kiln-simulation-context";
import type { LiveSignal } from "@shared/lib/kiln-sim/engine";
import { SOURCE_KIND_LABEL, type EdgeGateway } from "@shared/types/edge";
import { type EdgeIndex, LINK_LABEL, LINK_TONE, READING_LABEL, READING_TONE, ago, sep } from "../edge-model";
import type { DetectedCard, DetectedChannel, Detection } from "./edge-detect";
import { IconRack, SourceKindIcon } from "./edge-icons";
import type { MapTarget } from "./edge-map-dialog";
import { fmt, plural } from "./edge-tree-model";

/* ==========================================================================
   Channels as the data shows them: card tiles with their channel lines
   (gateway page) and the channel table (card page). Mapped channels carry a
   machine · tag chip; unmapped ones a Map action.
   ========================================================================== */

export function mapTarget(gw: EdgeGateway, ch: DetectedChannel): MapTarget {
  return { gatewayId: gw.id, rack: ch.rack, card: ch.card, channel: ch.id, measurement: ch.measurement, point: ch.point, status: ch.status };
}

/** "KLN-01 · VIB-KLN-09" — the signal a channel feeds. */
export function MappingChip({ ch, onClick }: { ch: DetectedChannel; onClick?: () => void }) {
  const p = ch.point!;
  const text = p.machineId ? `${p.machineId} · ${p.tag ?? "?"}` : "No machine";
  if (!onClick) return <span className="dv-chip ast-num">{text}</span>;
  return (
    <button type="button" className="dv-chip ast-num" onClick={onClick} aria-label={`Change which machine channel ${ch.id} feeds: ${text}`} title="Change which machine this feeds">
      {text}
    </button>
  );
}

function Value({ ch }: { ch: DetectedChannel }) {
  if (ch.value === null && !ch.display) return <span className="ast-muted">—</span>;
  const tone = ch.status === "alert" ? "warn" : ch.status === "danger" ? "bad" : undefined;
  return (
    <span className="dv-value ast-num pg-tone-value" data-tone={tone}>
      {ch.display ?? fmt(ch.value)}
      <span className="ast-unit">{ch.unit ?? ""}</span>
    </span>
  );
}

// ---------------------------------------------------------------- detected (gateway page)
function CardTile({ gw, card, onMap, onOpen }: { gw: EdgeGateway; card: DetectedCard; onMap: (t: MapTarget) => void; onOpen?: () => void }) {
  const head = (
    <>
      <span className="dv-tile-dot" data-tone={card.live === 0 ? "idle" : card.tone} aria-hidden="true" />
      <span className="dv-tile-name">
        Card {card.id}
        {card.isNew && <span className="dv-new">New</span>}
      </span>
      <span className="dv-tile-type">{card.cardType ?? "Type not sent"}</span>
      <span className="dv-tile-count ast-num">
        {card.config?.channelCount != null ? `${card.live}/${card.config.channelCount}` : card.channels.length} ch · {card.mapped} mapped
      </span>
    </>
  );
  return (
    <div className="dv-tile">
      {onOpen ? (
        <button type="button" className="dv-tile-head" onClick={onOpen} aria-label={`Open card ${card.id} of ${card.rack}`}>
          {head}
        </button>
      ) : (
        <div className="dv-tile-head">{head}</div>
      )}
      <ul className="dv-chlist">
        {card.channels.map((ch) => (
          <li key={ch.id} className="dv-chline">
            <span className="dv-ch-id ast-num" data-tone={ch.status === "nodata" || ch.status === "disabled" ? undefined : READING_TONE[ch.status]}>
              {ch.id}
            </span>
            <span className="dv-ch-label" title={ch.label ?? undefined}>
              {ch.label ?? "Unnamed"}
            </span>
            <span className="dv-ch-value">
              <Value ch={ch} />
            </span>
            <span className="dv-ch-map">
              {ch.point ? (
                <MappingChip ch={ch} onClick={() => onMap(mapTarget(gw, ch))} />
              ) : (
                <button type="button" className="dv-map-btn" onClick={() => onMap(mapTarget(gw, ch))} aria-label={`Link ${ch.rack} card ${ch.card} channel ${ch.id} to a machine`}>
                  Map
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface DetectedSectionProps {
  ix: EdgeIndex;
  gw: EdgeGateway;
  detection: Detection;
  subscription: string;
  now: number;
  onRegister: (rackId: string) => void;
  onMap: (t: MapTarget) => void;
  onOpenSource: (sourceId: string) => void;
  onOpenCard: (sourceId: string, card: string) => void;
  /** Unregistered racks / cards in the data, and the action that registers them. */
  pending: { sources: number; cards: number };
  onAddDetected: () => void;
  adding: boolean;
  addNote: React.ReactNode;
}

export function DetectedSection({ gw, detection, subscription, now, onRegister, onMap, onOpenSource, onOpenCard, pending, onAddDetected, adding, addNote }: DetectedSectionProps) {
  const { heard, racks } = detection;
  const silent = heard.channels === 0 && heard.racks === 0;
  return (
    <section className="hx-section" aria-label="Found in the incoming data">
      <div className="dv-section-head">
        <h2 className="ast-section-label">
          Found in the incoming data
          <span className="ast-num">
            {silent ? "nothing received yet" : `${plural(heard.racks, "rack")} · ${plural(heard.cards, "card")} · ${plural(heard.channels, "channel")} found`}
          </span>
        </h2>
        {pending.sources + pending.cards > 0 && (
          <PillButton variant="primary" onClick={onAddDetected} disabled={adding} aria-label={`Register ${plural(pending.sources, "found rack")} and ${plural(pending.cards, "card")}`}>
            {adding ? "Adding…" : `Add what was found · ${[pending.sources ? plural(pending.sources, "rack") : null, pending.cards ? plural(pending.cards, "card") : null].filter(Boolean).join(" · ")}`}
          </PillButton>
        )}
      </div>
      {addNote}

      {silent && (
        <div className="ast-card dv-listening" role="status">
          <span className="dv-pulse" aria-hidden="true" />
          <span className="ast-cell-stack">
            <span className="ast-cell-title">
              Listening on <code className="dv-code">{subscription}</code>
            </span>
            <span className="ast-caption">
              Nothing received yet. Racks, cards and channels appear here as {gw.code} publishes; map each channel to a machine signal.
            </span>
          </span>
        </div>
      )}

      {racks
        .filter((r) => r.cards.length > 0 || r.live)
        .map((r) => {
          const linkState = r.live ? (r.live.state === "ONLINE" ? "online" : r.live.state === "STALE" ? "stale" : "offline") : "waiting";
          const cards = r.cards.length;
          const channels = r.cards.reduce((n, c) => n + c.channels.length, 0);
          return (
            <div key={r.rackId} className="ast-card dv-rack" aria-label={`Rack ${r.rackId}`}>
              <div className="dv-rack-head">
                <span className="ast-badge" data-tone={r.source ? undefined : "info"}>
                  {r.source ? <SourceKindIcon kind={r.source.kind} size={14} /> : <IconRack size={14} />}
                </span>
                <span className="ast-cell-stack">
                  {r.source ? (
                    <button type="button" className="dv-rack-name" onClick={() => onOpenSource(r.source!.id)}>
                      {r.rackId} <span className="ast-muted">· {r.source.name}</span>
                    </button>
                  ) : (
                    <span className="dv-rack-name">{r.rackId}</span>
                  )}
                  <span className="ast-caption">
                    {r.source ? SOURCE_KIND_LABEL[r.source.kind] : "Not registered"} · {plural(cards, "card")} · {plural(channels, "channel")}
                    {r.live ? ` · seen ${ago(r.live.lastSeenAt, now)}` : ""}
                  </span>
                </span>
                <span className="dv-rack-tail">
                  <StatusTag tone={LINK_TONE[linkState]} label={LINK_LABEL[linkState]} />
                  {!r.source && (
                    <>
                      <span className="dv-new">New</span>
                      <PillButton variant="secondary" onClick={() => onRegister(r.rackId)} aria-label={`Register ${r.rackId} as a rack`}>
                        Register
                      </PillButton>
                    </>
                  )}
                </span>
              </div>
              {r.cards.length === 0 ? (
                <span className="ast-caption">Rack status received; no channel readings yet.</span>
              ) : (
                <div className="dv-tiles">
                  {r.cards.map((c) => (
                    <CardTile key={c.id} gw={gw} card={c} onMap={onMap} onOpen={r.source ? () => onOpenCard(r.source!.id, c.id) : undefined} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
    </section>
  );
}

// ---------------------------------------------------------------- channel table (card page)
const SIM_TONE: Record<LiveSignal["status"], "good" | "warn" | "bad"> = { Normal: "good", Alert: "warn", Critical: "bad" };

/**
 * The KLN-01 simulation's signal for a channel mapped to the kiln that has
 * no MQTT reading, shown as "Simulated" and never as an MQTT value.
 */
export function simulatedSignal(ch: DetectedChannel, signals: Record<string, LiveSignal> | null | undefined): LiveSignal | null {
  if (!signals || ch.status !== "nodata" || !ch.point?.tag || !isLiveMachine(ch.point.machineId)) return null;
  const s = signals[ch.point.tag];
  return s && s.value !== null ? s : null;
}

export function ChannelTable({
  gw,
  channels,
  history,
  now,
  onMap,
  simSignals,
}: {
  gw: EdgeGateway;
  channels: DetectedChannel[];
  history: Record<string, number[]>;
  now: number;
  onMap: (t: MapTarget) => void;
  /** Running KLN-01 simulation signals, for kiln channels with no MQTT reading. */
  simSignals?: Record<string, LiveSignal> | null;
}) {
  const { deleteTag } = useEdge();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const doDelete = async (ch: DetectedChannel) => {
    setDeleting(`${ch.card}${sep}${ch.id}`);
    setFailure(null);
    try {
      await deleteTag({ gatewayId: gw.id, rack: ch.rack, card: ch.card });
    } catch (err) {
      setFailure((err as Error).message);
    } finally {
      setDeleting(null);
    }
  };
  const simOf = (ch: DetectedChannel) => simulatedSignal(ch, simSignals);
  // A rack's table spans its cards; with one sensor per card every channel is "1", so name the card.
  const multiCard = new Set(channels.map((ch) => ch.card)).size > 1;
  const columns: Column<DetectedChannel>[] = [
    {
      key: "ch",
      header: "Channel",
      render: (ch) => (
        <span className="dv-lead">
          <span className="ast-badge" data-tone={ch.status === "nodata" || ch.status === "disabled" ? undefined : READING_TONE[ch.status]}>
            <IconSensor size={14} />
          </span>
          <span className="ast-cell-stack">
            <span className="ast-cell-title ast-num">{multiCard ? `${ch.card} · channel ${ch.id}` : `Channel ${ch.id}`}</span>
            <span className="ast-cell-sub">{ch.label ?? "No name in the message"}</span>
          </span>
        </span>
      ),
    },
    {
      key: "value",
      header: "Value",
      render: (ch) => {
        const s = simOf(ch);
        if (!s) return <Value ch={ch} />;
        return (
          <span className="dv-value ast-num pg-tone-value" data-tone={s.status === "Normal" ? undefined : SIM_TONE[s.status]}>
            {s.display}
            <span className="ast-unit">{ch.point?.unit ?? ch.unit ?? ""}</span>
          </span>
        );
      },
    },
    {
      key: "trend",
      header: "Trend",
      render: (ch) => {
        const values = ch.measurement ? history[ch.measurement.key] ?? [] : [];
        if (values.length < 2) return <span className="ast-muted">—</span>;
        const tone = READING_TONE[ch.status];
        return (
          <span className="dv-trend">
            <Sparkline values={values} unit={ch.unit ?? ""} height={28} tone={tone === "idle" ? "info" : tone} ariaLabel={`Channel ${ch.id} recent values`} />
          </span>
        );
      },
    },
    {
      // The thresholds the gateway reports with the reading; the machine sensor's own limits live on its measurement.
      key: "limits",
      header: "Gateway alarm limits",
      render: (ch) => {
        const a = ch.measurement?.alertThreshold ?? null;
        const d = ch.measurement?.dangerThreshold ?? null;
        if (a === null && d === null) return <span className="ast-muted">Not sent</span>;
        return (
          <span className="ast-num">
            {fmt(a)} / {fmt(d)}
            <span className="ast-unit">{ch.unit ?? ""}</span>
          </span>
        );
      },
    },
    { key: "map", header: "Feeds machine", render: (ch) => (ch.point ? <MappingChip ch={ch} /> : <span className="ast-muted">Not linked</span>) },
    {
      key: "state",
      header: "Status",
      render: (ch) =>
        simOf(ch) ? <StatusTag tone="info" label="Live" /> : <StatusTag tone={READING_TONE[ch.status]} label={READING_LABEL[ch.status]} />,
    },
    {
      key: "updated",
      header: "Updated",
      render: (ch) => <span className="ast-num ast-muted">{simOf(ch) ? "Live" : ago(ch.measurement?.updatedAt ?? null, now)}</span>,
    },
    {
      key: "action",
      header: "",
      width: "1%",
      render: (ch) => (
        <span className="dv-action">
          <PillButton
            variant="secondary"
            className={ch.point ? "dv-reveal" : undefined}
            onClick={(e) => {
              e.stopPropagation();
              onMap(mapTarget(gw, ch));
            }}
            aria-label={ch.point ? `Change which machine channel ${ch.id} feeds` : `Link channel ${ch.id} to a machine`}
          >
            {ch.point ? "Change link" : "Link to machine"}
          </PillButton>
          <span className="dv-reveal" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <ConfirmAction
              label="Delete"
              question={ch.point ? `Delete ${ch.card} and its machine link?` : `Delete ${ch.card}?`}
              onConfirm={() => void doDelete(ch)}
              disabled={deleting !== null}
            />
          </span>
        </span>
      ),
    },
  ];
  return (
    <>
      <Table className="ast-table dv-points" columns={columns} data={channels} keyExtractor={(ch) => `${ch.card}${sep}${ch.id}`} onRowClick={(ch) => onMap(mapTarget(gw, ch))} />
      {failure && <FormNote tone="bad">{failure}</FormNote>}
    </>
  );
}
