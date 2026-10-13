"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { HierarchyNode } from "../assets-data";
import { HierarchyTree } from "./hierarchy-tree";
import { HierarchyContents } from "./hierarchy-contents";
import { findPath } from "./hierarchy-model";
import { useHierarchyData } from "./use-hierarchy-data";
import "../assets-shell.css";
import "./hierarchy.css";

const SELECTED_KEY = "ultron.hierarchy.selected";
const DEFAULT_PLANT = "plant-kln";

/**
 * Assets home: hierarchy tree + contents of the selected plant / area /
 * group. Picking a machine opens its workspace. The selection survives the
 * round trip into a machine (sessionStorage, like ULTRON's tree state).
 */
export function AssetHierarchyPage({ onOpenMachine }: { onOpenMachine: (machineId: string) => void }) {
  const { roots, lookup, isLoading, loadError } = useHierarchyData();
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
                <strong className="hx-empty-title">No plant configured</strong>
                Build the plant hierarchy in Configure.
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="assets-module-container">
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
