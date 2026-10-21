"use client";

import { useEffect, useRef, useState } from "react";
import { naturalCompare, parseMessage, topicMatchesFilter } from "@shared/lib/edge-format";
import { useEdge } from "@/providers/edge-context";
import type { EdgeFormat } from "@shared/types/edge";
import type { LinkState } from "@shared/types/mqtt";
import { type EdgeIndex, sep } from "../edge-model";

/* ==========================================================================
   Connect wizard · finding gateways. ULTRON gateways come from the live
   snapshot (retained status + inventory). A custom format has no runtime
   subscription for an unknown gateway, and neither has a topic the operator
   typed, so the wizard asks the broker to listen on that filter and parses
   the captured samples itself.
   ========================================================================== */

export interface FoundCard {
  code: string;
  cardType: string | null;
  channels: string[];
}

export interface FoundRack {
  code: string;
  cards: FoundCard[];
}

export interface FoundGateway {
  /** "" = the format's topics carry no gateway id (it must be typed). */
  code: string;
  ip: string | null;
  state: LinkState | null;
  lastSeenAt: string | null;
  racks: FoundRack[];
  registered: boolean;
  /** Messages it was seen in (samples only). */
  messages: number;
}

/** Is a gateway code already registered for this broker (or unassigned)? */
export function isRegistered(ix: EdgeIndex, brokerId: string, code: string): boolean {
  return ix.registry.gateways.some((g) => g.code === code && (!g.brokerId || g.brokerId === brokerId));
}

/** Gateways publishing on a broker in the ULTRON contract, from the live snapshot. */
export function liveFound(ix: EdgeIndex, brokerId: string): FoundGateway[] {
  const snap = ix.snapshot;
  if (!snap) return [];
  return snap.gateways
    .filter((g) => g.brokerId === brokerId)
    .map((g) => {
      const racks = snap.racks
        .filter((r) => r.brokerId === brokerId && r.gatewayId === g.gatewayId)
        .map((r) => {
          const cards = new Map<string, FoundCard>();
          for (const c of r.cards ?? []) cards.set(c.card, { code: c.card, cardType: c.cardType, channels: [...c.channels] });
          for (const m of snap.measurements) {
            if (m.brokerId !== brokerId || m.gatewayId !== g.gatewayId || m.rackId !== r.rackId) continue;
            const c = cards.get(m.slot) ?? { code: m.slot, cardType: m.cardType, channels: [] };
            if (!c.channels.includes(m.channel)) c.channels.push(m.channel);
            if (!c.cardType) c.cardType = m.cardType;
            cards.set(m.slot, c);
          }
          return { code: r.rackId, cards: sortCards([...cards.values()]) };
        })
        .sort((a, b) => naturalCompare(a.code, b.code));
      return {
        code: g.gatewayId,
        ip: g.ip || null,
        state: g.state,
        lastSeenAt: g.lastSeenAt,
        racks,
        registered: isRegistered(ix, brokerId, g.gatewayId),
        messages: g.messages,
      };
    })
    .sort((a, b) => Number(a.registered) - Number(b.registered) || naturalCompare(a.code, b.code));
}

function sortCards(cards: FoundCard[]): FoundCard[] {
  return cards.map((c) => ({ ...c, channels: [...c.channels].sort(naturalCompare) })).sort((a, b) => naturalCompare(a.code, b.code));
}

/** Gateway id in an ULTRON contract topic (status, topology, racks/…). */
const ULTRON_GATEWAY = /(?:^|\/)([^/]+)\/(?:status|topology|racks\/[^/]+\/.+)$/;

/**
 * While `active` with a `filter`, asks the broker to listen on it (renewed
 * before the 120 s window runs out) and parses the captured samples every 3 s
 * with `format`. Messages on the filter that the format cannot read are kept
 * under "" so the operator still sees traffic and can type the gateway id.
 */
export function useSampleDiscovery(ix: EdgeIndex, active: boolean, brokerId: string, format: EdgeFormat, filter: string | null) {
  const { listen, fetchSamples } = useEdge();
  const [found, setFound] = useState<FoundGateway[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [samples, setSamples] = useState(0);
  const ixRef = useRef(ix);
  useEffect(() => {
    ixRef.current = ix;
  });

  // Restart only when the format or filter really changes, not on every registry refresh.
  const key = filter ? `${format.id}${sep}${format.topic}${sep}${format.updatedAt}${sep}${filter}` : null;
  const formatRef = useRef(format);
  useEffect(() => {
    formatRef.current = format;
  });

  useEffect(() => {
    const format = formatRef.current;
    if (!active || !key || !filter || !brokerId) return;
    let stopped = false;
    const doListen = () => listen(brokerId, filter, 120).catch((err: Error) => !stopped && setError(err.message));
    const poll = async () => {
      try {
        const list = (await fetchSamples(brokerId)).filter((s) => topicMatchesFilter(s.topic, filter));
        if (stopped) return;
        setError(null);
        setSamples(list.length);
        const acc = new Map<string, { racks: Map<string, Map<string, FoundCard>>; messages: number; at: string | null }>();
        for (const s of list) {
          const res = parseMessage(format, s.payload, { topic: s.topic });
          const gw = (res.matched && (res.captures.gateway ?? (format.kind === "ultron-v2" ? ULTRON_GATEWAY.exec(s.topic)?.[1] : undefined))) || "";
          let g = acc.get(gw);
          if (!g) acc.set(gw, (g = { racks: new Map(), messages: 0, at: null }));
          g.messages += 1;
          if (!g.at || s.at > g.at) g.at = s.at;
          for (const r of res.readings) {
            let rack = g.racks.get(r.rack);
            if (!rack) g.racks.set(r.rack, (rack = new Map()));
            const card = rack.get(r.card) ?? { code: r.card, cardType: r.cardType, channels: [] };
            if (!card.channels.includes(r.channel)) card.channels.push(r.channel);
            if (!card.cardType) card.cardType = r.cardType;
            rack.set(r.card, card);
          }
        }
        setFound(
          [...acc.entries()]
            .map(([code, g]) => ({
              code,
              ip: null,
              state: null,
              lastSeenAt: g.at,
              racks: [...g.racks.entries()].map(([rc, cards]) => ({ code: rc, cards: sortCards([...cards.values()]) })).sort((a, b) => naturalCompare(a.code, b.code)),
              registered: code ? isRegistered(ixRef.current, brokerId, code) : false,
              messages: g.messages,
            }))
            .sort((a, b) => Number(a.registered) - Number(b.registered) || naturalCompare(a.code, b.code)),
        );
      } catch (err) {
        if (!stopped) setError((err as Error).message);
      }
    };
    void doListen();
    void poll();
    const pollTimer = window.setInterval(poll, 3000);
    const listenTimer = window.setInterval(doListen, 110_000);
    return () => {
      stopped = true;
      window.clearInterval(pollTimer);
      window.clearInterval(listenTimer);
    };
  }, [active, key, filter, brokerId, listen, fetchSamples]);

  return { found: key ? found : [], error: key ? error : null, samples: key ? samples : 0 };
}

/** Totals for a found gateway: "3 racks · 14 cards · 52 channels". */
export function foundTotals(racks: FoundRack[]) {
  let cards = 0;
  let channels = 0;
  for (const r of racks)
    for (const c of r.cards) {
      cards += 1;
      channels += c.channels.length;
    }
  return { racks: racks.length, cards, channels };
}

