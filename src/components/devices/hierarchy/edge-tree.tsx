"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PillButton } from "@/components/ui/pill-button";
import { IconChevron, SearchPill, type Tone } from "@/components/assets/assets-shell-ui";
import { SOURCE_KIND_LABEL, type EdgeGateway } from "@/types/edge";
import {
  type DiscoveredGateway,
  type EdgeIndex,
  LINK_LABEL,
  LINK_TONE,
  gatewayLink,
  gatewayTone,
  sourceLink,
  sourceTone,
  worstTone,
} from "../edge-model";
import { IconCard, IconGateway, IconNetwork, IconPlus, SourceKindIcon } from "./edge-icons";
import { sourceCards } from "./edge-detect";
import {
  ALL_PLANTS,
  DISCOVERED_KEY,
  NETWORK_KEY,
  type PlantOption,
  type Selection,
  discoveredMatches,
  gatewayMatches,
  selectionKey,
  sortGateways,
  visibleSources,
} from "./edge-tree-model";

/* ==========================================================================
   Device hierarchy tree. Same behaviour as the asset tree: plant menu ·
   filter keeps ancestors · dot (own state) or ring (worse state hidden in a
   collapsed parent) · roving tabindex · arrows / Home / End / typeahead.

     Edge network ─▶ gateways ─▶ sources
     Discovered   ─▶ gateways publishing but not registered
   ========================================================================== */

/** Rows toggled away from their default: gateways open, sources (cards) closed. */
const COLLAPSED_KEY = "ultron.devices.tree.toggled";
const openByDefault = (id: string) => !id.startsWith("src:");

function readCollapsed(): Set<string> | null {
  try {
    const raw = sessionStorage.getItem(COLLAPSED_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

function writeCollapsed(ids: Set<string>) {
  try {
    sessionStorage.setItem(COLLAPSED_KEY, JSON.stringify([...ids]));
  } catch {
    /* storage unavailable */
  }
}

type RowKind = "network" | "gateway" | "source" | "card" | "group" | "discovered";

interface Row {
  id: string;
  kind: RowKind;
  depth: number;
  parentId: string | null;
  label: string;
  /** What activating the row selects; groups only expand. */
  select: Selection | null;
  icon: React.ReactNode;
  count: number | null;
  /** Own state (dot) and worst state inside (ring when collapsed). */
  own: Tone | null;
  inner: Tone | null;
  status: string | null;
  disabled: boolean;
  isNew: boolean;
  kids: Row[];
  expandable: boolean;
  expanded: boolean;
}

export interface EdgeTreeProps {
  ix: EdgeIndex;
  gateways: EdgeGateway[];
  discovered: DiscoveredGateway[];
  plants: PlantOption[];
  plantId: string;
  onPlantChange: (id: string) => void;
  selected: Selection;
  onSelect: (sel: Selection) => void;
  onAddGateway: () => void;
}

// Idle ("No data", "Disabled") carries no mark: with a broker off every row would
// be grey. Marks are kept for states that need attention: stale, offline, alarms.
const quiet = (t: Tone | null) => !t || t === "good" || t === "info" || t === "idle";

export function EdgeTree({ ix, gateways, discovered, plants, plantId, onPlantChange, selected, onSelect, onAddGateway }: EdgeTreeProps) {
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  // Phone/tablet only: the tree folds into the header (responsive CSS reads data-tree-open).
  const [treeOpen, setTreeOpen] = useState(false);
  // Gateways start open (few per plant, few sources each); sources start closed (cards can be many).
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [focusId, setFocusId] = useState<string | null>(null);
  const headRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const typeahead = useRef({ buffer: "", at: 0 });
  const selectedKey = selectionKey(selected);

  // Restore the saved expansion after mount (sessionStorage is client-only).
  useEffect(() => {
    const saved = readCollapsed();
    if (saved) setCollapsed(saved);
  }, []);

  const updateCollapsed = useCallback((fn: (prev: Set<string>) => Set<string>) => {
    setCollapsed((prev) => {
      const next = fn(prev);
      if (next !== prev) writeCollapsed(next);
      return next;
    });
  }, []);

  // Selecting reveals: the root and the parent gateway (or the discovered group) open.
  useEffect(() => {
    const ancestors: string[] = [];
    if (selected.type === "gateway") ancestors.push(NETWORK_KEY);
    if (selected.type === "source") {
      const src = ix.sources.get(selected.id);
      ancestors.push(NETWORK_KEY);
      if (src) ancestors.push(`gw:${src.gatewayId}`);
    }
    if (selected.type === "card") {
      const src = ix.sources.get(selected.sourceId);
      ancestors.push(NETWORK_KEY);
      if (src) ancestors.push(`gw:${src.gatewayId}`, `src:${src.id}`);
    }
    if (selected.type === "discovered") ancestors.push(DISCOVERED_KEY);
    if (ancestors.length === 0) return;
    const isOpen = (set: Set<string>, id: string) => openByDefault(id) !== set.has(id);
    updateCollapsed((prev) => {
      if (ancestors.every((id) => isOpen(prev, id))) return prev;
      const next = new Set(prev);
      ancestors.forEach((id) => (openByDefault(id) ? next.delete(id) : next.add(id)));
      return next;
    });
  }, [selected, ix, updateCollapsed]);

  const q = query.trim().toLowerCase();
  const filtering = q.length > 0;

  // The model tree, filtered: a match keeps its ancestors.
  const roots = useMemo<Row[]>(() => {
    const gatewayRows: Row[] = [];
    for (const gw of sortGateways(gateways)) {
      const sources = visibleSources(ix, gw, q);
      if (filtering && !gatewayMatches(gw, q) && sources.length === 0) continue;
      const link = gatewayLink(ix, gw);
      const kids: Row[] = sources.map((src) => {
        const sl = sourceLink(ix, src);
        const tone = sourceTone(ix, src);
        const cards: Row[] = sourceCards(ix, src).map((c) =>
          leaf({
            id: selectionKey({ type: "card", sourceId: src.id, card: c.id }),
            kind: "card",
            depth: 3,
            parentId: `src:${src.id}`,
            label: `Card ${c.id}`,
            select: { type: "card", sourceId: src.id, card: c.id },
            icon: <IconCard size={13} />,
            count: c.channels.length,
            own: sl.status === "disabled" || c.live === 0 ? null : c.tone,
            inner: null,
            status: `Sensor card${c.cardType ? ` ${c.cardType}` : ""}, ${c.isNew ? "found, not set up yet, " : ""}${c.mapped} of ${c.channels.length} channels linked to a machine`,
            disabled: sl.status === "disabled" || c.config?.enabled === false,
            isNew: c.isNew,
          }),
        );
        return {
          id: `src:${src.id}`,
          kind: "source",
          depth: 2,
          parentId: `gw:${gw.id}`,
          label: src.code,
          select: { type: "source", id: src.id },
          icon: <SourceKindIcon kind={src.kind} size={13} />,
          count: cards.length,
          own: sl.status === "disabled" ? null : sl.status === "online" ? null : LINK_TONE[sl.status],
          inner: sl.status === "disabled" ? null : tone,
          status: `${SOURCE_KIND_LABEL[src.kind]}, ${sl.status === "online" && tone !== "good" ? (tone === "bad" ? "danger" : "alert") : LINK_LABEL[sl.status]}`,
          disabled: sl.status === "disabled",
          isNew: false,
          kids: cards,
          expandable: cards.length > 0,
          expanded: false,
        };
      });
      gatewayRows.push({
        id: `gw:${gw.id}`,
        kind: "gateway",
        depth: 1,
        parentId: NETWORK_KEY,
        label: gw.name,
        select: { type: "gateway", id: gw.id },
        icon: <IconGateway size={13} />,
        count: kids.length,
        own: link.status === "disabled" ? null : LINK_TONE[link.status],
        inner: link.status === "disabled" ? null : gatewayTone(ix, gw),
        status: `Data collector ${gw.code}, ${LINK_LABEL[link.status]}`,
        disabled: link.status === "disabled",
        isNew: false,
        kids,
        expandable: kids.length > 0,
        expanded: false,
      });
    }

    const out: Row[] = [];
    if (!filtering || gatewayRows.length > 0) {
      out.push({
        id: NETWORK_KEY,
        kind: "network",
        depth: 0,
        parentId: null,
        label: "All data collectors",
        select: { type: "network" },
        icon: <IconNetwork size={13} />,
        count: gatewayRows.length,
        own: null,
        inner: worstTone(...gatewayRows.map((g) => g.inner ?? "good")),
        status: null,
        disabled: false,
        isNew: false,
        kids: gatewayRows,
        expandable: gatewayRows.length > 0,
        expanded: false,
      });
    }

    const found = discovered.filter((d) => discoveredMatches(d, q));
    if (found.length > 0) {
      const kids = found.map((d) =>
        leaf({
          id: selectionKey({ type: "discovered", brokerId: d.brokerId, gatewayId: d.gatewayId }),
          kind: "discovered",
          depth: 1,
          parentId: DISCOVERED_KEY,
          label: d.gatewayId,
          select: { type: "discovered", brokerId: d.brokerId, gatewayId: d.gatewayId },
          icon: <IconGateway size={13} />,
          count: d.rackIds.length,
          own: null,
          inner: null,
          status: "Discovered gateway, not registered",
          disabled: false,
          isNew: true,
        }),
      );
      out.push({
        id: DISCOVERED_KEY,
        kind: "group",
        depth: 0,
        parentId: null,
        label: "Found, not registered",
        select: null,
        icon: <IconPlus size={13} />,
        count: kids.length,
        own: null,
        inner: null,
        status: "Data collectors sending data that are not registered yet",
        disabled: false,
        isNew: false,
        kids,
        expandable: true,
        expanded: false,
      });
    }
    return out;
  }, [ix, gateways, discovered, q, filtering]);

  // Flatten what is open. A filter shows every match open.
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    const walk = (r: Row) => {
      const expanded = r.expandable && ((filtering && r.kind !== "source") || openByDefault(r.id) !== collapsed.has(r.id));
      out.push({ ...r, expanded });
      if (expanded) r.kids.forEach(walk);
    };
    roots.forEach(walk);
    return out;
  }, [roots, collapsed, filtering]);

  const activeFocus = rows.some((r) => r.id === focusId) ? focusId : rows.find((r) => r.id === selectedKey)?.id ?? rows[0]?.id ?? null;

  const focusRow = (id: string | null | undefined) => {
    if (!id) return;
    setFocusId(id);
    rowRefs.current.get(id)?.focus();
  };

  const toggle = (id: string) =>
    updateCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // A filter holds every matching parent open; sources still open and close by hand.
  const locked = (row: Row) => filtering && row.kind !== "source";

  const activate = (row: Row) => {
    if (row.select) onSelect(row.select);
    // Opening a parent also expands it; a group row only toggles.
    if (row.expandable && !locked(row) && (!row.select || !row.expanded)) toggle(row.id);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = rows.findIndex((r) => r.id === activeFocus);
    if (i < 0) return;
    const row = rows[i];
    switch (e.key) {
      case "ArrowDown":
        focusRow(rows[i + 1]?.id);
        break;
      case "ArrowUp":
        focusRow(rows[i - 1]?.id);
        break;
      case "ArrowRight":
        if (row.expandable && !row.expanded) toggle(row.id);
        else if (row.expanded) focusRow(rows[i + 1]?.id);
        break;
      case "ArrowLeft":
        if (row.expanded && !locked(row)) toggle(row.id);
        else focusRow(row.parentId);
        break;
      case "Home":
        focusRow(rows[0]?.id);
        break;
      case "End":
        focusRow(rows[rows.length - 1]?.id);
        break;
      case "Enter":
      case " ":
        activate(row);
        break;
      default:
        if (e.key.length === 1 && /\S/.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
          const now = Date.now();
          const t = typeahead.current;
          t.buffer = now - t.at > 600 ? e.key.toLowerCase() : t.buffer + e.key.toLowerCase();
          t.at = now;
          const order = [...rows.slice(i + 1), ...rows.slice(0, i + 1)];
          const hit = order.find((r) => r.label.toLowerCase().startsWith(t.buffer));
          if (hit) focusRow(hit.id);
          break;
        }
        return;
    }
    e.preventDefault();
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (headRef.current && !headRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const plantLabel = plantId === ALL_PLANTS ? "All plants" : plants.find((p) => p.id === plantId)?.label ?? "All plants";

  return (
    <aside className="assets-industrial-sidebar ast-sidebar hx-sidebar dv-sidebar" aria-label="Device tree" data-tree-open={treeOpen || undefined}>
      <div className="ast-side-head" ref={headRef}>
        <div className="hx-side-title dv-side-title">
          <span>Device tree</span>
          <span className="dv-side-tail">
            <span className="ast-num">{gateways.length === 1 ? "1 gateway" : `${gateways.length} gateways`}</span>
            <PillButton variant="secondary" className="dv-tree-toggle" aria-expanded={treeOpen} trailing={<IconChevron dir="down" />} onClick={() => setTreeOpen((v) => !v)}>
              {treeOpen ? "Hide tree" : "Show tree"}
            </PillButton>
            <button type="button" className="ast-icon-btn dv-add-btn" aria-label="Connect a data collector" title="Connect a data collector (gateway)" onClick={onAddGateway}>
              <IconPlus size={14} />
            </button>
          </span>
        </div>
        <button type="button" className="ast-plant-btn" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
          <span>{plantLabel}</span>
          <IconChevron dir="down" />
        </button>
        {menuOpen && (
          <div className="ast-menu" role="menu" aria-label="Select plant">
            {[{ id: ALL_PLANTS, label: "All plants" }, ...plants].map((p) => (
              <button
                key={p.id}
                type="button"
                role="menuitemradio"
                aria-checked={p.id === plantId}
                onClick={() => {
                  onPlantChange(p.id);
                  setMenuOpen(false);
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
        <SearchPill value={query} onChange={setQuery} placeholder="Filter collectors, devices, sensors" label="Filter the device tree" />
      </div>

      {rows.length === 0 ? (
        <div className="ast-tree-empty hx-tree-empty">
          <strong>No match</strong>
          Nothing matches “{query.trim()}”.
        </div>
      ) : (
        <div className="ast-tree hx-tree" role="tree" aria-label="Device tree" onKeyDown={onKeyDown}>
          {rows.map((row) => {
            const isSelected = row.id === selectedKey;
            // Dot: the row's own non-good state. Ring: a worse state hidden in a collapsed parent.
            const ring = row.expandable && !row.expanded && !quiet(row.inner) && rank(row.inner) > rank(row.own);
            const tone = ring ? row.inner : quiet(row.own) ? null : row.own;
            const mark = !tone ? null : ring ? "ring" : "dot";
            const label = [
              row.label,
              row.status,
              row.count !== null ? countText(row) : null,
              mark === "ring" ? `contains ${toneWord(tone!)} items` : null,
              row.isNew ? "new" : null,
            ]
              .filter(Boolean)
              .join(", ");
            return (
              <div
                key={row.id}
                ref={(el) => {
                  if (el) rowRefs.current.set(row.id, el);
                  else rowRefs.current.delete(row.id);
                }}
                role="treeitem"
                aria-level={row.depth + 1}
                aria-expanded={row.expandable ? row.expanded : undefined}
                aria-selected={isSelected}
                aria-label={label}
                aria-current={isSelected ? "true" : undefined}
                tabIndex={row.id === activeFocus ? 0 : -1}
                className="ast-tree-row hx-row dv-row"
                data-kind={row.kind}
                data-disabled={row.disabled || undefined}
                title={row.label}
                style={{ paddingLeft: 8 + row.depth * 16 }}
                onClick={() => {
                  setFocusId(row.id);
                  activate(row);
                  if (row.select) setTreeOpen(false);
                }}
                onFocus={() => setFocusId(row.id)}
              >
                <span
                  className="hx-chev"
                  data-open={row.expanded || undefined}
                  aria-hidden="true"
                  onClick={(e) => {
                    if (!row.expandable || locked(row)) return;
                    e.stopPropagation();
                    toggle(row.id);
                  }}
                >
                  {row.expandable && <IconChevron size={10} />}
                </span>
                <span className="ast-badge">{row.icon}</span>
                <span className="ast-tree-name" data-strong={row.depth === 0 || isSelected || undefined}>
                  {row.label}
                </span>
                {row.isNew && <span className="dv-new">New</span>}
                {row.count !== null && <span className="ast-tree-count">{row.count}</span>}
                {mark && <span className="hx-mark" data-mark={mark} data-tone={tone!} aria-hidden="true" />}
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}

function leaf(r: Omit<Row, "kids" | "expandable" | "expanded">): Row {
  return { ...r, kids: [], expandable: false, expanded: false };
}

const TONE_RANK: Record<Tone, number> = { good: 0, info: 0, idle: 1, warn: 2, bad: 3 };
const rank = (t: Tone | null) => (t ? TONE_RANK[t] : -1);

function toneWord(t: Tone): string {
  return t === "bad" ? "offline or danger" : t === "warn" ? "stale or alert" : "silent";
}

function countText(row: Row): string {
  const n = row.count ?? 0;
  if (row.kind === "network") return n === 1 ? "1 gateway" : `${n} gateways`;
  if (row.kind === "gateway") return n === 1 ? "1 source" : `${n} sources`;
  if (row.kind === "source") return n === 1 ? "1 card" : `${n} cards`;
  if (row.kind === "card") return n === 1 ? "1 channel" : `${n} channels`;
  if (row.kind === "discovered") return n === 1 ? "1 rack reported" : `${n} racks reported`;
  return n === 1 ? "1 gateway" : `${n} gateways`;
}
