"use client";

import React, { useMemo } from "react";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { liveMachineStatus, useKilnLiveStatus } from "@/providers/kiln-simulation-context";
import { ASSET_MACHINES, HierarchyNode, PLANT_HIERARCHY } from "./assets-data";
import { IconArea, IconChevron, IconMachine, machineTone } from "./assets-shell-ui";
import "./assets-shell.css";

interface AssetsDirectoryViewProps {
  onSelectMachine: (machineId: string) => void;
}

interface MachineEntry {
  key: string;
  machineId: string;
  name: string;
  status: string;
}

interface GroupEntry {
  id: string;
  name: string;
  machines: MachineEntry[];
}

interface AreaEntry {
  id: string;
  name: string;
  plant: string;
  groups: GroupEntry[];
}

const shortPlant = (name: string) => name.split("—")[0].split("(")[0].trim();

export function AssetsDirectoryView({ onSelectMachine }: AssetsDirectoryViewProps) {
  const { hierarchy: contextHierarchy, machines: contextMachines } = useIndustrialData();
  const liveKiln = useKilnLiveStatus();
  const hierarchy = contextHierarchy && contextHierarchy.length > 0 ? contextHierarchy : PLANT_HIERARCHY;
  const machines = contextMachines && contextMachines.length > 0 ? contextMachines : ASSET_MACHINES;

  /* Plant → Area → Machine group → Machine, limited to the kiln line. */
  const areas = useMemo<AreaEntry[]>(() => {
    const kilns = new Map(machines.filter((m) => m.diagramType === "kiln").map((m) => [m.id, m]));
    const toMachine = (node: HierarchyNode): MachineEntry | null => {
      if (node.type !== "machine" || !node.machineId || !kilns.has(node.machineId)) return null;
      const d = kilns.get(node.machineId)!;
      return { key: node.id, machineId: node.machineId, name: node.name, status: liveMachineStatus(liveKiln, node.machineId, { health: 0, status: d.status ?? node.status ?? "Operational" }).status };
    };

    const out: AreaEntry[] = [];
    for (const plant of hierarchy) {
      for (const area of plant.children ?? []) {
        if (area.type !== "area") continue;
        const groups: GroupEntry[] = [];
        const loose: MachineEntry[] = [];
        for (const child of area.children ?? []) {
          if (child.type === "machine") {
            const m = toMachine(child);
            if (m) loose.push(m);
            continue;
          }
          const list = (child.children ?? []).map(toMachine).filter((m): m is MachineEntry => !!m);
          if (list.length) groups.push({ id: child.id, name: child.name, machines: list });
        }
        if (loose.length) groups.unshift({ id: `${area.id}-direct`, name: area.name, machines: loose });
        if (groups.length) out.push({ id: area.id, name: area.name, plant: shortPlant(plant.name), groups });
      }
    }
    return out;
  }, [hierarchy, machines, liveKiln]);

  const groupCount = areas.reduce((n, a) => n + a.groups.length, 0);
  const machineCount = areas.reduce((n, a) => n + a.groups.reduce((k, g) => k + g.machines.length, 0), 0);

  return (
    <div className="assets-directory-workspace ast-root" aria-label="Assets directory">
      <header className="ast-dir-head">
        <h1 className="ast-dir-title">
          Assets{" "}
          <span>
            {areas.length} {areas.length === 1 ? "area" : "areas"} · {groupCount} {groupCount === 1 ? "group" : "groups"} ·{" "}
            {machineCount} {machineCount === 1 ? "machine" : "machines"}
          </span>
        </h1>
      </header>

      {areas.length === 0 ? (
        <div className="ast-card ast-empty">No machines registered.</div>
      ) : (
        areas.map((area) => (
          <section key={area.id} className="ast-area" aria-label={area.name}>
            <h2 className="ast-area-head">
              <span className="ast-icon-tile">
                <IconArea size={14} />
              </span>
              {area.name}
              <span className="ast-area-plant">{area.plant}</span>
            </h2>

            {area.groups.map((group) => (
              <div key={group.id} className="ast-group">
                <h3 className="ast-section-label">
                  {group.name}
                  <span>{group.machines.length}</span>
                </h3>
                <div className="ast-grid">
                  {group.machines.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      className="ast-card ast-tile ast-machine-tile"
                      onClick={() => onSelectMachine(m.machineId)}
                      aria-label={`${m.name}, ${m.machineId}, ${m.status}`}
                    >
                      <div className="ast-tile-top">
                        <span className="ast-icon-tile">
                          <IconMachine size={14} />
                        </span>
                        <span className="ast-tile-status" data-tone={machineTone(m.status)}>
                          <i aria-hidden="true" />
                          {m.status}
                        </span>
                      </div>
                      <div className="ast-tile-foot">
                        <span className="ast-cell-stack">
                          <span className="ast-tile-name">{m.name}</span>
                          <span className="ast-cell-sub ast-num">{m.machineId}</span>
                        </span>
                        <span className="ast-muted" aria-hidden="true">
                          <IconChevron />
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))
      )}
    </div>
  );
}
