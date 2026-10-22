"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconChevron, SearchPill, type Tone } from "@/components/assets/assets-shell-ui";
import type { EdgeGateway } from "@shared/types/edge";
import { type DiscoveredGateway, type EdgeIndex, LINK_LABEL, LINK_TONE, gatewayLink, gatewayTone, worstTone } from "./edge-model";
import type { Detection } from "./hierarchy/edge-detect";
import { IconCard, IconGateway, IconPlus, SourceKindIcon } from "./hierarchy/edge-icons";
import { plural } from "./hierarchy/edge-tree-model";
import { type ChannelRow, rackRow } from "./devices-rows";

/* ==========================================================================
   Devices sidebar: every gateway › rack › card › channel. Same behaviour as
   the asset tree: filter keeps ancestors (and opens them) · dot (own state) or ring (worse
   state inside a collapsed row) · roving tabindex · arrows / Home / End /
   typeahead. Picking a row opens it in the Gateways section.

     gateway   its facts, racks and the first rack's channels
     rack      that rack's channels
     card      that rack's channels (the card's rows are in the table)
     channel   that rack's channels, with the channel's row marked
     new       a gateway sending readings but not added yet
   ========================================================================== */

/** What a tree row opens. Racks are keyed by code, like the racks table. */
export type TreePick =
  | { type: "gateway"; gatewayId: string }
  | { type: "rack"; gatewayId: string; rackId: string }
  | { type: "channel"; gatewayId: string; rackId: string; channelKey: string }
  | { type: "discovered"; key: string };

/** Rows toggled away from their default: gateways open, racks and cards closed. */
const TOGGLED_KEY = "ultron.devices.tree.toggled";
const openByDefault = (id: string) => id.startsWith("gw:");

function readToggled(): Set<string> | null {
  try {
    const raw = sessionStorage.getItem(TOGGLED_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

function writeToggled(ids: Set<string>) {
  try {
    sessionStorage.setItem(TOGGLED_KEY, JSON.stringify([...ids]));
  } catch {
    /* storage unavailable */
  }
}

type RowKind = "gateway" | "rack" | "card" | "channel" | "discovered";

interface Node {
  id: string;
  kind: RowKind;
  label: string;
  /** Words read out after the label (screen readers and the tooltip). */
  status: string;
  pick: TreePick;
  icon: React.ReactNode;
  count: number | null;
  /** Own state (dot) and worst state inside (ring when collapsed). */
  own: Tone | null;
  inner: Tone | null;
  muted: boolean;
  isNew: boolean;
  /** Lower-case text the filter matches. */
  text: string;
  kids: Node[];
}

interface Row {
  node: Node;
  depth: number;
  parentId: string | null;
  expandable: boolean;
  expanded: boolean;
}

export const gatewayRowId = (gatewayId: string) => `gw:${gatewayId}`;
export const rackRowId = (gatewayId: string, rackId: string) => `rk:${gatewayId}/${rackId}`;
const cardRowId = (gatewayId: string, rackId: string, cardId: string) => `cd:${gatewayId}/${rackId}/${cardId}`;
export const channelRowId = (channelKey: string) => `ch:${channelKey}`;
export const discoveredRowId = (key: string) => `new:${key}`;

// Healthy and idle rows carry no mark: with a message server off every row would be grey.
const quiet = (t: Tone | null) => !t || t === "good" || t === "info" || t === "idle";
const TONE_RANK: Record<Tone, number> = { good: 0, info: 0, idle: 1, warn: 2, bad: 3 };
const rank = (t: Tone | null) => (t ? TONE_RANK[t] : -1);
const toneWord = (t: Tone) => (t === "bad" ? "offline or danger" : "late or alert");

export interface DevicesTreeProps {
  ix: EdgeIndex;
  gateways: EdgeGateway[];
  discovered: DiscoveredGateway[];
  discoveredKey: (d: DiscoveredGateway) => string;
  det: Map<string, Detection>;
  channels: ChannelRow[];
  /** Row id of what the section shows, or null when nothing in the tree is open. */
  selectedId: string | null;
  onPick: (pick: TreePick) => void;
}

export function DevicesTree({ ix, gateways, discovered, discoveredKey, det, channels, selectedId, onPick }: DevicesTreeProps) {
  const [query, setQuery] = useState("");
  const [toggled, setToggled] = useState<Set<string>>(() => new Set());
  const [focusId, setFocusId] = useState<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const typeahead = useRef({ buffer: "", at: 0 });

  // Restore the saved expansion after mount (sessionStorage is client-only).
  useEffect(() => {
    const saved = readToggled();
    if (saved) setToggled(saved);
  }, []);

  const updateToggled = useCallback((fn: (prev: Set<string>) => Set<string>) => {
    setToggled((prev) => {
      const next = fn(prev);
      if (next !== prev) writeToggled(next);
      return next;
    });
  }, []);

  /* ---------- model */
  const roots = useMemo<Node[]>(() => {
    const byKey = new Map(channels.map((r) => [r.key, r]));
    const out: Node[] = gateways.map((gw) => {
      const link = gatewayLink(ix, gw);
      const off = link.status === "disabled";
      const racks: Node[] = (det.get(gw.id)?.racks ?? []).map((rack) => {
        const rr = rackRow(ix, gw, rack);
        const cards: Node[] = rack.cards.map((card) => {
          const chans: Node[] = card.channels.map((ch) => {
            const r = byKey.get(`${gw.id}/${rack.rackId}/${card.id}/${ch.id}`);
            const tag = r?.tag ?? null;
            const key = r?.key ?? `${gw.id}/${rack.rackId}/${card.id}/${ch.id}`;
            return {
              id: channelRowId(key),
              kind: "channel",
              label: tag ? `${ch.id} · ${tag}` : ch.id,
              status: `Channel ${ch.id}${tag ? `, feeds ${tag}` : ", not linked to a machine"}${r ? `, ${r.status}` : ""}`,
              pick: { type: "channel", gatewayId: gw.id, rackId: rack.rackId, channelKey: key },
              icon: null,
              count: null,
              own: off || !r ? null : r.tone,
              inner: null,
              muted: !tag,
              isNew: false,
              text: [ch.id, tag, ch.point?.name, ch.label].filter(Boolean).join(" ").toLowerCase(),
              kids: [],
            };
          });
          return {
            id: cardRowId(gw.id, rack.rackId, card.id),
            kind: "card",
            label: `Card ${card.id}`,
            status: `${card.cardType ? `${card.cardType} card` : "Card"}, ${card.isNew ? "sending readings but not added yet, " : ""}${card.mapped} of ${plural(card.channels.length, "channel")} linked to a machine`,
            pick: { type: "rack", gatewayId: gw.id, rackId: rack.rackId },
            icon: <IconCard size={13} />,
            count: chans.length,
            own: off || card.live === 0 ? null : card.tone,
            inner: off ? null : worstTone(...chans.map((c) => c.own ?? "good")),
            muted: card.config?.enabled === false,
            isNew: card.isNew,
            text: [card.id, card.cardType].filter(Boolean).join(" ").toLowerCase(),
            kids: chans,
          };
        });
        const src = rack.source;
        return {
          id: rackRowId(gw.id, rack.rackId),
          kind: "rack",
          label: rack.rackId,
          status: `${rr.kind}, ${rr.status}, ${plural(rr.channels, "channel")}`,
          pick: { type: "rack", gatewayId: gw.id, rackId: rack.rackId },
          icon: src ? <SourceKindIcon kind={src.kind} size={13} /> : <IconPlus size={13} />,
          count: cards.length,
          own: off ? null : rr.tone,
          inner: off ? null : worstTone(rr.tone, ...cards.map((c) => c.inner ?? "good")),
          muted: rr.link === "disabled",
          isNew: !src,
          text: [rack.rackId, src?.name].filter(Boolean).join(" ").toLowerCase(),
          kids: cards,
        };
      });
      return {
        id: gatewayRowId(gw.id),
        kind: "gateway",
        label: gw.code,
        status: `Gateway ${gw.name}, ${LINK_LABEL[link.status]}`,
        pick: { type: "gateway", gatewayId: gw.id },
        icon: <IconGateway size={13} />,
        count: racks.length,
        own: off ? null : LINK_TONE[link.status],
        inner: off ? null : worstTone(gatewayTone(ix, gw), ...racks.map((r) => r.inner ?? "good")),
        muted: off,
        isNew: false,
        text: [gw.code, gw.name].join(" ").toLowerCase(),
        kids: racks,
      };
    });
    for (const d of discovered) {
      const key = discoveredKey(d);
      out.push({
        id: discoveredRowId(key),
        kind: "discovered",
        label: d.gatewayId,
        status: `Gateway sending readings but not added yet, ${plural(d.rackIds.length, "rack")}`,
        pick: { type: "discovered", key },
        icon: <IconGateway size={13} />,
        count: d.rackIds.length,
        own: null,
        inner: null,
        muted: false,
        isNew: true,
        text: d.gatewayId.toLowerCase(),
        kids: [],
      });
    }
    return out;
  }, [ix, gateways, discovered, discoveredKey, det, channels]);

  // Parent of every row, to open the way to the selected one.
  const parents = useMemo(() => {
    const map = new Map<string, string>();
    const walk = (n: Node) => n.kids.forEach((k) => (map.set(k.id, n.id), walk(k)));
    roots.forEach(walk);
    return map;
  }, [roots]);

  // Selecting reveals: every ancestor of the selected row opens.
  useEffect(() => {
    if (!selectedId) return;
    const up: string[] = [];
    for (let p = parents.get(selectedId); p; p = parents.get(p)) up.push(p);
    if (!up.length) return;
    updateToggled((prev) => {
      const closed = up.filter((id) => openByDefault(id) === prev.has(id));
      if (!closed.length) return prev;
      const next = new Set(prev);
      closed.forEach((id) => (openByDefault(id) ? next.delete(id) : next.add(id)));
      return next;
    });
  }, [selectedId, parents, updateToggled]);

  /* ---------- filtered, flattened rows */
  const q = query.trim().toLowerCase();
  const filtering = q.length > 0;
  const rows = useMemo<Row[]>(() => {
    // A match keeps its ancestors; a matching parent keeps its own children too.
    const keep = (n: Node): Node | null => {
      if (!filtering || n.text.includes(q)) return n;
      const kids = n.kids.map(keep).filter((k): k is Node => k !== null);
      return kids.length ? { ...n, kids } : null;
    };
    const out: Row[] = [];
    const walk = (n: Node, depth: number, parentId: string | null) => {
      const expandable = n.kids.length > 0;
      const expanded = expandable && (filtering || openByDefault(n.id) !== toggled.has(n.id));
      out.push({ node: n, depth, parentId, expandable, expanded });
      if (expanded) n.kids.forEach((k) => walk(k, depth + 1, n.id));
    };
    roots.map(keep).forEach((n) => n && walk(n, 0, null));
    return out;
  }, [roots, filtering, q, toggled]);

  const activeFocus = rows.some((r) => r.node.id === focusId) ? focusId : (rows.find((r) => r.node.id === selectedId)?.node.id ?? rows[0]?.node.id ?? null);

  const focusRow = (id: string | null | undefined) => {
    if (!id) return;
    setFocusId(id);
    rowRefs.current.get(id)?.focus();
  };

  const toggle = (id: string) =>
    updateToggled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const activate = (row: Row) => {
    onPick(row.node.pick);
    // Opening a parent also expands it (asset tree behaviour); a filter holds every match open.
    if (row.expandable && !row.expanded && !filtering) toggle(row.node.id);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = rows.findIndex((r) => r.node.id === activeFocus);
    if (i < 0) return;
    const row = rows[i];
    switch (e.key) {
      case "ArrowDown":
        focusRow(rows[i + 1]?.node.id);
        break;
      case "ArrowUp":
        focusRow(rows[i - 1]?.node.id);
        break;
      case "ArrowRight":
        if (row.expandable && !row.expanded) toggle(row.node.id);
        else if (row.expanded) focusRow(rows[i + 1]?.node.id);
        break;
      case "ArrowLeft":
        if (row.expanded && !filtering) toggle(row.node.id);
        else focusRow(row.parentId);
        break;
      case "Home":
        focusRow(rows[0]?.node.id);
        break;
      case "End":
        focusRow(rows[rows.length - 1]?.node.id);
        break;
      case "Enter":
      case " ":
        activate(row);
        break;
      default:
        if (e.key.length === 1 && /\S/.test(e.key) && !e.metaKey && !e.ctrlKey) {
          const now = Date.now();
          const t = typeahead.current;
          t.buffer = now - t.at > 600 ? e.key.toLowerCase() : t.buffer + e.key.toLowerCase();
          t.at = now;
          const order = [...rows.slice(i + 1), ...rows.slice(0, i + 1)];
          const hit = order.find((r) => r.node.label.toLowerCase().startsWith(t.buffer));
          if (hit) focusRow(hit.node.id);
          break;
        }
        return;
    }
    e.preventDefault();
  };

  const total = gateways.length + discovered.length;

  return (
    <aside className="assets-industrial-sidebar ast-sidebar hx-sidebar dvp-sidebar" aria-label="Device hierarchy">
      <div className="ast-side-head">
        <div className="hx-side-title">
          <span>Devices</span>
          <span className="ast-num">{plural(total, "gateway")}</span>
        </div>
        <SearchPill value={query} onChange={setQuery} placeholder="Search gateways, racks, channels" label="Search the devices" />
      </div>

      {rows.length === 0 ? (
        <div className="ast-tree-empty hx-tree-empty">
          <strong>No match</strong>
          Nothing matches “{query.trim()}”.
        </div>
      ) : (
        <div className="ast-tree hx-tree" role="tree" aria-label="Gateways, racks, cards and channels" onKeyDown={onKeyDown}>
          {rows.map((row) => {
            const { node } = row;
            const selected = node.id === selectedId;
            // Dot: the row's own non-good state. Ring: a worse state hidden in a collapsed row.
            const ring = row.expandable && !row.expanded && !quiet(node.inner) && rank(node.inner) > rank(node.own);
            const tone = ring ? node.inner : quiet(node.own) ? null : node.own;
            const mark = !tone ? null : ring ? "ring" : "dot";
            const label = [node.label, node.status, mark === "ring" ? `contains ${toneWord(tone!)} items` : null].filter(Boolean).join(", ");
            return (
              <div
                key={node.id}
                ref={(el) => {
                  if (el) rowRefs.current.set(node.id, el);
                  else rowRefs.current.delete(node.id);
                }}
                role="treeitem"
                aria-level={row.depth + 1}
                aria-expanded={row.expandable ? row.expanded : undefined}
                aria-selected={selected}
                aria-label={label}
                aria-current={selected ? "true" : undefined}
                tabIndex={node.id === activeFocus ? 0 : -1}
                className="ast-tree-row hx-row dvp-row"
                data-kind={node.kind}
                data-muted={node.muted || undefined}
                title={node.status}
                style={{ paddingLeft: 8 + row.depth * 16 }}
                onClick={() => {
                  setFocusId(node.id);
                  activate(row);
                }}
                onFocus={() => setFocusId(node.id)}
              >
                <span
                  className="hx-chev"
                  data-open={row.expanded || undefined}
                  aria-hidden="true"
                  onClick={(e) => {
                    if (!row.expandable || filtering) return;
                    e.stopPropagation();
                    toggle(node.id);
                  }}
                >
                  {row.expandable && <IconChevron size={10} />}
                </span>
                {node.icon && <span className="ast-badge">{node.icon}</span>}
                <span className="ast-tree-name" data-strong={row.depth === 0 || selected || undefined}>
                  {node.label}
                </span>
                {node.isNew && <span className="dvp-new">New</span>}
                {node.count !== null && <span className="ast-tree-count">{node.count}</span>}
                {mark && <span className="hx-mark" data-mark={mark} data-tone={tone!} aria-hidden="true" />}
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
