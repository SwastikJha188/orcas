"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { HierarchyNode, PLANT_HIERARCHY } from "./assets-data";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { liveMachineStatus, useKilnLiveStatus } from "@/providers/kiln-simulation-context";
import { IconArea, IconChevron, IconMachine, SearchPill, machineTone } from "./assets-shell-ui";
import "./assets-shell.css";

export interface AssetsTreeSidebarProps {
  selectedMachineId?: string | null;
  onSelectMachine: (machineId: string) => void;
  className?: string;
  hierarchy?: HierarchyNode[];
}

interface TreeMachine {
  id: string;
  name: string;
  machineId: string;
  status: string;
}

interface TreeCell {
  id: string;
  name: string;
  machines: TreeMachine[];
}

interface TreeArea {
  id: string;
  name: string;
  cells: TreeCell[];
}

/** Plant → Area → Process cell → Machine. Machines placed directly under an
 *  area are gathered into an unnamed cell. */
function buildAreas(plant: HierarchyNode): TreeArea[] {
  return (plant.children ?? [])
    .filter((n) => n.type === "area")
    .map((area) => {
      const cells: TreeCell[] = [];
      const direct: TreeMachine[] = [];
      for (const child of area.children ?? []) {
        if (child.type === "machine" && child.machineId) {
          direct.push({ id: child.id, name: child.name, machineId: child.machineId, status: child.status ?? "Operational" });
        } else if (child.children) {
          cells.push({
            id: child.id,
            name: child.name,
            machines: child.children
              .filter((m) => m.type === "machine" && m.machineId)
              .map((m) => ({ id: m.id, name: m.name, machineId: m.machineId!, status: m.status ?? "Operational" })),
          });
        }
      }
      if (direct.length) cells.unshift({ id: `${area.id}-direct`, name: "", machines: direct });
      return { id: area.id, name: area.name, cells };
    });
}

export function AssetsTreeSidebar({
  selectedMachineId,
  onSelectMachine,
  className = "",
  hierarchy: propHierarchy,
}: AssetsTreeSidebarProps) {
  const liveKiln = useKilnLiveStatus();
  const statusOf = (machineId: string, stored: string) => liveMachineStatus(liveKiln, machineId, { health: 0, status: stored }).status;
  let contextHierarchy: HierarchyNode[] | undefined;
  try {
    const dataContext = useIndustrialData();
    contextHierarchy = dataContext.hierarchy;
  } catch {
    // Outside IndustrialDataProvider
  }

  const hierarchyList =
    propHierarchy || (contextHierarchy && contextHierarchy.length > 0 ? contextHierarchy : PLANT_HIERARCHY);

  const [plantId, setPlantId] = useState<string>(
    hierarchyList.find((p) => p.id === "plant-kln")?.id ?? hierarchyList[0]?.id ?? ""
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const headRef = useRef<HTMLDivElement | null>(null);

  const plant = hierarchyList.find((p) => p.id === plantId) ?? hierarchyList[0];
  const areas = useMemo(() => (plant ? buildAreas(plant) : []), [plant]);

  const q = query.trim().toLowerCase();
  const visibleAreas = useMemo(() => {
    if (!q) return areas;
    return areas
      .map((a) => ({
        ...a,
        cells: a.cells
          .map((c) => ({
            ...c,
            machines: c.machines.filter(
              (m) =>
                m.name.toLowerCase().includes(q) ||
                m.machineId.toLowerCase().includes(q) ||
                c.name.toLowerCase().includes(q) ||
                a.name.toLowerCase().includes(q)
            ),
          }))
          .filter((c) => c.machines.length > 0),
      }))
      .filter((a) => a.cells.length > 0);
  }, [areas, q]);

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
    <aside className={`assets-industrial-sidebar ast-sidebar ${className}`} aria-label="Plant asset hierarchy">
      <div className="ast-side-head" ref={headRef}>
        <button
          type="button"
          className="ast-plant-btn"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span>{plant?.name ?? "Plant"}</span>
          <IconChevron dir="down" />
        </button>
        {menuOpen && (
          <div className="ast-menu" role="menu" aria-label="Select plant">
            {hierarchyList.map((p) => (
              <button
                key={p.id}
                type="button"
                role="menuitemradio"
                aria-checked={p.id === plant?.id}
                onClick={() => {
                  setPlantId(p.id);
                  setMenuOpen(false);
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
        <SearchPill value={query} onChange={setQuery} placeholder="Filter machines" label="Filter machines" />
      </div>

      <ul className="ast-tree" aria-label={`${plant?.name ?? "Plant"} hierarchy`}>
        {visibleAreas.length === 0 && <li className="ast-tree-empty">No matches</li>}
        {visibleAreas.map((area) => {
          const open = q.length > 0 || !collapsed[area.id];
          const count = area.cells.reduce((n, c) => n + c.machines.length, 0);
          return (
            <li key={area.id}>
              <button
                type="button"
                className="ast-tree-row"
                aria-expanded={open}
                onClick={() => setCollapsed((prev) => ({ ...prev, [area.id]: !prev[area.id] }))}
              >
                <span className="ast-tree-chev">
                  <IconChevron size={10} />
                </span>
                <span className="ast-badge">
                  <IconArea size={13} />
                </span>
                <span className="ast-tree-name">{area.name}</span>
                <span className="ast-tree-count">{count}</span>
              </button>

              {open && (
                <ul>
                  {area.cells.map((cell) => (
                    <li key={cell.id}>
                      {cell.name && <div className="ast-tree-cell">{cell.name}</div>}
                      <ul>
                        {cell.machines.map((m) => {
                          const selected = selectedMachineId === m.machineId;
                          return (
                            <li key={m.id}>
                              <button
                                type="button"
                                className="ast-tree-row ast-tree-machine"
                                aria-current={selected ? "true" : undefined}
                                onClick={() => onSelectMachine(m.machineId)}
                                title={`${m.name} · ${m.machineId}`}
                              >
                                <span className="ast-badge">
                                  <IconMachine size={13} />
                                </span>
                                <span className="ast-tree-name">{m.name}</span>
                                <span
                                  className="ast-tree-dot"
                                  data-tone={machineTone(statusOf(m.machineId, m.status))}
                                  role="img"
                                  aria-label={statusOf(m.machineId, m.status)}
                                />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
