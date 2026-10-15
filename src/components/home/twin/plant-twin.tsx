"use client";

import dynamic from "next/dynamic";
import React, { useEffect, useMemo, useState } from "react";
import type { HierarchyNode } from "@/components/assets/assets-data";
import { IconChevron, IconClose, StatusTag, machineTone, type Tone } from "@/components/assets/assets-shell-ui";
import {
  type MachineLookup,
  averageHealth,
  isFolder,
  machineCondition,
  rollupTone,
  subtreeMachines,
} from "@/components/assets/hierarchy/hierarchy-model";
import { PLANT_MODELS, buildPlantScene, type TwinCallout } from "./plant-twin-model";
import type { TwinCameraCommand, TwinColors, TwinInset } from "./plant-twin-canvas";
import { TwinHint, TwinNavBar, usePersistedNavMode } from "./twin-nav-ui";

const PlantTwinCanvas = dynamic(() => import("./plant-twin-canvas"), {
  ssr: false,
  loading: () => <div className="ph-twin-loading" role="status">Loading 3D twin…</div>,
});

/** Theme tokens resolved to concrete colours for WebGL; follows theme switches. */
export function useTwinColors(): TwinColors | null {
  const [colors, setColors] = useState<TwinColors | null>(null);
  useEffect(() => {
    const read = () => {
      const cs = getComputedStyle(document.documentElement);
      const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
      setColors({
        ground: v("--mx-canvas", "#151619"),
        grid: v("--separator", "#35343a"),
        fog: v("--mx-canvas", "#151619"),
        plinth: v("--mx-body", "#1c1e23"),
        plinthTop: v("--mx-raised", "#2a2d34"),
        rimIdle: v("--mx-edge", "#60646d"),
        select: v("--signal-blue", "#60a5fa"),
        good: v("--status-success", "#34d399"),
        warn: v("--status-warning", "#fbbf24"),
        bad: v("--status-danger", "#f87171"),
        idle: v("--text-muted", "#8e8e93"),
        // Readable on both themes (the metal highlight is near-white in light).
        electrical: v("--text-muted", "#8e8e93"),
        network: v("--signal-blue", "#60a5fa"),
        sun: v("--twin-sun", "#fff6ea"),
        dark: document.documentElement.dataset.theme !== "light",
      });
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class", "style"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", read);
    return () => {
      mo.disconnect();
      mq.removeEventListener("change", read);
    };
  }, []);
  return colors;
}

export function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export interface PlantTwinProps {
  plant: HierarchyNode;
  lookup: MachineLookup;
  /** Active alert count per machine id. */
  alertsByMachine: Map<string, number>;
  liveIds: Set<string>;
  onOpenMachine: (machineId: string) => void;
  /** No WebGL: hand back to the 2D layout. */
  onUnsupported: () => void;
  /** Canvas covered by the page's floating panels; controls and framing stay clear of it. */
  inset?: TwinInset;
}

const toneLabel = (t: Tone) => (t === "bad" ? "Critical" : t === "warn" ? "Advisory" : t === "idle" ? "Standby" : "Normal");

export function PlantTwin({ plant, lookup, alertsByMachine, liveIds, onOpenMachine, onUnsupported, inset }: PlantTwinProps) {
  const colors = useTwinColors();
  const scene = useMemo(() => buildPlantScene(plant), [plant]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [command, setCommand] = useState<TwinCameraCommand>({ kind: "fit", n: 0 });
  const [navMode, setNavMode] = usePersistedNavMode();
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!hasWebGL()) {
      setSupported(false);
      onUnsupported();
    }
  }, [onUnsupported]);

  useEffect(() => setSelectedId(null), [plant.id]);

  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelectedId(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedId]);

  const areasById = useMemo(() => new Map((plant.children ?? []).filter(isFolder).map((a) => [a.id, a])), [plant]);

  const callouts = useMemo(() => {
    const out: Record<string, TwinCallout> = {};
    for (const b of scene.buildings) {
      const area = b.areaId ? areasById.get(b.areaId) : undefined;
      if (!area) continue;
      const machines = subtreeMachines(area);
      const tone = rollupTone(area, lookup);
      out[b.id] = {
        tone,
        status: toneLabel(tone),
        health: averageHealth(machines, lookup),
        machines: machines.length,
        running: machines.filter((m) => machineTone(machineCondition(m, lookup).status) !== "idle").length,
        alerts: machines.reduce((n, m) => n + (m.machineId ? alertsByMachine.get(m.machineId) ?? 0 : 0), 0),
        telemetry: machines.some((m) => m.machineId && liveIds.has(m.machineId)) ? "LIVE" : machines.length ? "RECORD" : "—",
      };
    }
    return out;
  }, [scene, areasById, lookup, alertsByMachine, liveIds]);

  const select = (id: string | null) => {
    setSelectedId(id);
    if (id) setCommand((c) => ({ kind: "focus", n: c.n + 1 }));
  };

  if (!supported) return null;

  const selected = scene.buildings.find((b) => b.id === selectedId) ?? null;
  const selectedArea = selected?.areaId ? areasById.get(selected.areaId) : undefined;
  const callout = selected ? callouts[selected.id] : undefined;

  return (
    <div
      className="ph-twin"
      style={
        inset
          ? ({
              "--twin-top": `${inset.top}px`,
              "--twin-right": `${inset.right}px`,
              "--twin-bottom": `${inset.bottom}px`,
              "--twin-left": `${inset.left}px`,
            } as React.CSSProperties)
          : undefined
      }
    >
      {colors ? (
        <PlantTwinCanvas
          scene={scene}
          callouts={callouts}
          selectedId={selectedId}
          onSelect={select}
          command={command}
          colors={colors}
          showLabels
          inset={inset}
          navMode={navMode}
          persistKey={`plant.${plant.id}`}
        />
      ) : (
        <div className="ph-twin-loading" role="status">Loading 3D twin…</div>
      )}

      <TwinNavBar navMode={navMode} onNavMode={setNavMode} onReset={() => setCommand((c) => ({ kind: "fit", n: c.n + 1 }))} />

      <TwinHint navMode={navMode} />

      <div className="ph-twin-legend" aria-label="Legend">
        <span><i data-tone="good" />Normal</span>
        <span><i data-tone="warn" />Advisory</span>
        <span><i data-tone="bad" />Critical</span>
        <span><b data-kind="electrical" />Power</span>
        <span><b data-kind="network" />Network</span>
      </div>

      {selected && (
        <aside className="ph-inspector ph-twin-inspector" aria-label={`${selected.name} details`}>
          <div className="ph-insp-head">
            <div>
              <span className="ph-insp-name">{selected.name}</span>
              <span className="ph-sub">{selectedArea ? "Area" : "Site infrastructure"} · {PLANT_MODELS[selected.model].name}</span>
            </div>
            <button type="button" className="ast-icon-btn" onClick={() => setSelectedId(null)} aria-label="Close details">
              <IconClose />
            </button>
          </div>
          {selectedArea && callout ? (
            <>
              <StatusTag tone={callout.tone} label={callout.status} />
              <dl className="ph-insp-rows">
                <div><dt>Health</dt><dd className="ast-num">{callout.health ?? "—"}<span className="ast-unit">/100</span></dd></div>
                <div><dt>Machines</dt><dd className="ast-num">{callout.machines}</dd></div>
                <div><dt>Running</dt><dd className="ast-num">{callout.running}</dd></div>
                <div><dt>Active alerts</dt><dd className="ast-num">{callout.alerts}</dd></div>
                <div><dt>Telemetry</dt><dd>{callout.telemetry === "LIVE" ? "Live" : callout.telemetry === "RECORD" ? "Asset record" : "—"}</dd></div>
              </dl>
              <ul className="ph-twin-machines" aria-label="Machines in this area">
                {subtreeMachines(selectedArea).map((m) => {
                  const c = machineCondition(m, lookup);
                  return (
                    <li key={m.id}>
                      <button type="button" onClick={() => m.machineId && onOpenMachine(m.machineId)}>
                        <span className="ph-unit-dot" data-tone={machineTone(c.status)} aria-hidden="true" />
                        <span className="ph-twin-mname">{m.name}</span>
                        <span className="ast-num ph-twin-mhealth">{c.health}</span>
                        <IconChevron size={10} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="ph-twin-note">
              Shared site service. Every area draws power from the electrical house and reports through the gateway house; neither carries
              monitored machines.
            </p>
          )}
        </aside>
      )}
    </div>
  );
}
