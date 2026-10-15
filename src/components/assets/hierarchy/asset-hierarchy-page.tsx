"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { HierarchyNode } from "../assets-data";
import { HierarchyTree } from "./hierarchy-tree";
import { HierarchyContents } from "./hierarchy-contents";
import { findPath, nodeLabel } from "./hierarchy-model";
import { IconChevron } from "../assets-shell-ui";
import { useHierarchyData } from "./use-hierarchy-data";
import { useIndustrialData } from "@/providers/industrial-data-context";
import type { AssetsSubPage } from "../assets-view";
import "../assets-shell.css";
import "./hierarchy.css";

const SELECTED_KEY = "ultron.hierarchy.selected";
const DEFAULT_PLANT = "plant-kln";

/**
 * Assets directory: "What equipment do I have, where is it in the plant
 * hierarchy, and what state is each asset in?" Hierarchy tree + contents of the
 * selected plant / area / process cell. Self-contained: reads the data context
 * and opens machines through `navigateToMachine`. The selection survives the
 * round trip into a machine (sessionStorage, like ULTRON's tree state).
 */
export function AssetHierarchyPage() {
  const { roots, lookup, isLoading, loadError } = useHierarchyData();
  const { navigateToMachine } = useIndustrialData();
  const onOpenMachine = (machineId: string, subPage: AssetsSubPage = "overview") => navigateToMachine(machineId, subPage);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Phone / tablet only: the tree is a drawer behind a toggle (CSS hides both on wider screens).
  const [treeOpen, setTreeOpen] = useState(false);

  useEffect(() => {
    try {
      setSelectedId(sessionStorage.getItem(SELECTED_KEY));
    } catch {
      /* storage unavailable */
    }
  }, []);

  const select = (node: HierarchyNode) => {
    if (node.type === "machine") {
      if (node.machineId) onOpenMachine(node.machineId);
      return;
    }
    setSelectedId(node.id);
    setTreeOpen(false);
    try {
      sessionStorage.setItem(SELECTED_KEY, node.id);
    } catch {
      /* storage unavailable */
    }
  };

  // Resolve the selection; fall back to the default plant root.
  const path = useMemo(() => (selectedId ? findPath(roots, selectedId) : []), [roots, selectedId]);
  const fallback = roots.find((p) => p.id === DEFAULT_PLANT) ?? roots[0];
  const node = path[path.length - 1] ?? fallback;
  const plant = path[0] ?? fallback;

  if (!plant || !node) {
    return (
      <div className="assets-module-container">
        <div className="assets-directory-workspace ast-root">
          <div className="ast-card ast-empty">
            {isLoading ? (
              <strong className="hx-empty-title">Loading plant hierarchy…</strong>
            ) : loadError ? (
              <>
                <strong className="hx-empty-title">Plant hierarchy unavailable</strong>
                {loadError}
              </>
            ) : (
              <>
                <strong className="hx-empty-title">No plant in the database</strong>
                The plant hierarchy table is empty. Seed or import the plant structure to list its equipment here.
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="assets-module-container hx-module"
      data-tree-open={treeOpen || undefined}
      onKeyDown={(e) => {
        if (e.key === "Escape" && treeOpen) setTreeOpen(false);
      }}
    >
      <button type="button" className="hx-tree-toggle" aria-expanded={treeOpen} onClick={() => setTreeOpen((o) => !o)}>
        <span className="hx-tree-toggle-label">Hierarchy</span>
        <span className="hx-tree-toggle-node">{(path.length ? path : [node]).map(nodeLabel).join(" / ")}</span>
        <IconChevron size={12} dir="down" />
      </button>
      {treeOpen && <div className="hx-tree-scrim" aria-hidden="true" onClick={() => setTreeOpen(false)} />}
      <HierarchyTree
        roots={roots}
        lookup={lookup}
        plantId={plant.id}
        onPlantChange={(id) => {
          const p = roots.find((r) => r.id === id);
          if (p) select(p);
        }}
        selectedId={node.id}
        onSelect={select}
      />
      <HierarchyContents roots={roots} lookup={lookup} node={node} onSelectNode={select} onOpenMachine={onOpenMachine} />
    </div>
  );
}
