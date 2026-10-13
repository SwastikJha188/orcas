"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { HierarchyNode } from "../assets-data";
import { IconChevron, SearchPill, machineTone } from "../assets-shell-ui";
import { TypeIcon } from "./hierarchy-icons";
import {
  type MachineLookup,
  filterVisible,
  findPath,
  isFolder,
  machineCondition,
  nodeLabel,
  orderedChildren,
  rollupTone,
  subtreeMachines,
} from "./hierarchy-model";

/* ==========================================================================
   Asset hierarchy tree (ULTRON LeftPanel + TreeNode + useTreeKeyboard).
   One plant at a time · filter keeps ancestors · status dot (own) or ring
   (rolled up from a collapsed subtree) · full keyboard navigation.
   ========================================================================== */

const EXPANDED_KEY = "ultron.tree.expanded";

function readExpanded(): Set<string> | null {
  try {
    const raw = sessionStorage.getItem(EXPANDED_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

function writeExpanded(ids: Set<string>) {
  try {
    sessionStorage.setItem(EXPANDED_KEY, JSON.stringify([...ids]));
  } catch {
    /* storage unavailable */
  }
}

interface Row {
  node: HierarchyNode;
  depth: number;
  parentId: string | null;
  expandable: boolean;
  expanded: boolean;
}

export interface HierarchyTreeProps {
  roots: HierarchyNode[];
  lookup: MachineLookup;
  plantId: string;
  onPlantChange: (plantId: string) => void;
  selectedId: string | null;
  onSelect: (node: HierarchyNode) => void;
}

export function HierarchyTree({ roots, lookup, plantId, onPlantChange, selectedId, onSelect }: HierarchyTreeProps) {
  const plant = roots.find((p) => p.id === plantId) ?? roots[0];
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  // Plants and areas start open; deeper folders start closed (ULTRON default).
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(roots.flatMap((p) => [p.id, ...(p.children ?? []).filter(isFolder).map((a) => a.id)])),
  );
  const [focusId, setFocusId] = useState<string | null>(null);
  const headRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const typeahead = useRef({ buffer: "", at: 0 });

  // Restore the saved expansion after mount (sessionStorage is client-only).
  useEffect(() => {
    const saved = readExpanded();
    if (saved) setExpanded(saved);
  }, []);

  const updateExpanded = useCallback((fn: (prev: Set<string>) => Set<string>) => {
    setExpanded((prev) => {
      const next = fn(prev);
      writeExpanded(next);
      return next;
    });
  }, []);

  // Selecting a node reveals it: every ancestor opens.
  useEffect(() => {
    if (!selectedId) return;
    const path = findPath(roots, selectedId).slice(0, -1);
    if (path.length === 0) return;
    updateExpanded((prev) => {
      if (path.every((n) => prev.has(n.id))) return prev;
      const next = new Set(prev);
      path.forEach((n) => next.add(n.id));
      return next;
    });
  }, [selectedId, roots, updateExpanded]);

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => (plant ? filterVisible(plant, q, lookup) : null), [plant, q, lookup]);

  const rows = useMemo<Row[]>(() => {
    if (!plant) return [];
    const out: Row[] = [];
    const walk = (node: HierarchyNode, depth: number, parentId: string | null) => {
      if (visible && !visible.has(node.id)) return;
      const kids = orderedChildren(node).filter((k) => !visible || visible.has(k.id));
      const expandable = kids.length > 0;
      const open = expandable && (visible !== null || expanded.has(node.id));
      out.push({ node, depth, parentId, expandable, expanded: open });
      if (open) kids.forEach((k) => walk(k, depth + 1, node.id));
    };
    walk(plant, 0, null);
    return out;
  }, [plant, visible, expanded]);

  const activeFocus = rows.some((r) => r.node.id === focusId)
    ? focusId
    : rows.find((r) => r.node.id === selectedId)?.node.id ?? rows[0]?.node.id ?? null;

  const focusRow = (id: string | undefined) => {
    if (!id) return;
    setFocusId(id);
    rowRefs.current.get(id)?.focus();
  };

  const toggle = (id: string) =>
    updateExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const activate = (row: Row) => {
    onSelect(row.node);
    // Opening a folder also expands it (ULTRON behaviour).
    if (row.expandable && !row.expanded && visible === null) toggle(row.node.id);
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
        if (row.expanded && visible === null) toggle(row.node.id);
        else focusRow(row.parentId ?? undefined);
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
          const hit = order.find((r) => nodeLabel(r.node).toLowerCase().startsWith(t.buffer));
          if (hit) focusRow(hit.node.id);
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

  return (
    <aside className="assets-industrial-sidebar ast-sidebar hx-sidebar" aria-label="Asset hierarchy">
      <div className="ast-side-head" ref={headRef}>
        <div className="hx-side-title">
          <span>Asset hierarchy</span>
          <span className="ast-num">
            {roots.length} {roots.length === 1 ? "plant" : "plants"}
          </span>
        </div>
        <button
          type="button"
          className="ast-plant-btn"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span>{plant ? nodeLabel(plant) : "No plants"}</span>
          <IconChevron dir="down" />
        </button>
        {menuOpen && (
          <div className="ast-menu" role="menu" aria-label="Select plant">
            {roots.map((p) => (
              <button
                key={p.id}
                type="button"
                role="menuitemradio"
                aria-checked={p.id === plant?.id}
                onClick={() => {
                  onPlantChange(p.id);
                  setMenuOpen(false);
                }}
              >
                {nodeLabel(p)}
              </button>
            ))}
          </div>
        )}
        <SearchPill
          value={query}
          onChange={setQuery}
          placeholder="Filter areas, groups, machines"
          label="Filter asset hierarchy"
        />
      </div>

      {!plant ? (
        <div className="ast-tree-empty hx-tree-empty">
          <strong>No plants configured</strong>
        </div>
      ) : rows.length === 0 ? (
        <div className="ast-tree-empty hx-tree-empty">
          <strong>No match</strong>
          Nothing matches “{query.trim()}”.
        </div>
      ) : (
        <div className="ast-tree hx-tree" role="tree" aria-label={`${nodeLabel(plant)} hierarchy`} onKeyDown={onKeyDown}>
          {rows.map((row) => {
            const { node } = row;
            const selected = node.id === selectedId;
            const folder = isFolder(node);
            const own = folder ? null : machineCondition(node, lookup);
            const tone = own ? machineTone(own.status) : rollupTone(node, lookup);
            // Filled dot: the machine's own state. Ring: worst state hidden
            // inside a collapsed folder. Healthy rows carry no mark.
            const mark = tone === "good" || tone === "info" ? null : folder ? (row.expanded ? null : "ring") : "dot";
            const count = folder ? subtreeMachines(node).length : 0;
            const label = nodeLabel(node);
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
                aria-label={`${label}${own ? `, ${own.status}, health ${own.health} %` : ""}${mark === "ring" ? `, contains ${tone === "bad" ? "critical" : tone === "warn" ? "advisory" : "standby"} machines` : ""}`}
                tabIndex={node.id === activeFocus ? 0 : -1}
                className="ast-tree-row hx-row"
                data-depth={row.depth}
                aria-current={selected ? "true" : undefined}
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
                    if (!row.expandable || visible !== null) return;
                    e.stopPropagation();
                    toggle(node.id);
                  }}
                >
                  {row.expandable && <IconChevron size={10} />}
                </span>
                <span className="ast-badge" data-type={node.type}>
                  <TypeIcon type={node.type} size={13} />
                </span>
                <span className="ast-tree-name" data-strong={row.depth === 0 || selected || undefined}>
                  {label}
                </span>
                {folder && <span className="ast-tree-count">{count}</span>}
                {mark && <span className="hx-mark" data-mark={mark} data-tone={tone} aria-hidden="true" />}
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
