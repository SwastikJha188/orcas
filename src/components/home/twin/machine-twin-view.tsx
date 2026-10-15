"use client";

import dynamic from "next/dynamic";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { PillButton } from "@/components/ui";
import type { AssetMachine } from "@/components/assets/assets-data";
import type { AssetsSubPage } from "@/components/assets/assets-view";
import { IconBack, IconChevron, IconClose, StatusTag, healthTone, severityTone, type Tone } from "@/components/assets/assets-shell-ui";
import type { Distribution } from "@/components/assets/hierarchy/hierarchy-model";
import { useMachineOverview } from "@/components/assets/machine-diagram";
import { formatClock } from "@/lib/kiln-sim/engine";
import { AlertsFeed, HealthTrendCard, PlantHealthGauge, type HomeActivity, type HomeAlert } from "../home-widgets";
import type { TwinPaints } from "./twin-part";
import type { MachineTwinSystem } from "./machine-twin-canvas";
import { TwinHint, TwinNavBar, usePersistedNavMode } from "./twin-nav-ui";
import type { TwinCameraCommand, TwinInset } from "./plant-twin-canvas";
import { hasWebGL, useTwinColors } from "./plant-twin";
import { useCoveredInset, type Side } from "./use-covered-inset";
import "./machine-twin.css";

/* ==========================================================================
   Machine twin on Home (ULTRON MachineQuickView, inside the Digital Twin).
   Picking a machine in the top bar swaps the plant for the machine, in the
   same immersive page: the 3D machine fills the stage, and the HUD keeps its
   places — health gauge and alerts on the right, health over time along the
   bottom — showing this machine's data. Numbers are the Overview's own
   (useMachineOverview), so the twin never disagrees with the machine page.
   ========================================================================== */

const MachineTwinCanvas = dynamic(() => import("./machine-twin-canvas"), {
  ssr: false,
  loading: () => <div className="ph-twin-loading" role="status">Loading 3D twin…</div>,
});

/** Linear mix of two #rrggbb colours (t = share of b). */
function mixHex(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  if (x.some(Number.isNaN) || y.some(Number.isNaN)) return a;
  return `#${x.map((c, i) => Math.round(c + (y[i] - c) * t).toString(16).padStart(2, "0")).join("")}`;
}

/** Machine-kit (TSE) paints from the --mx-* tokens, resolved for WebGL; follows theme switches. */
function usePaints(): TwinPaints | null {
  const colors = useTwinColors();
  return useMemo(() => {
    if (!colors) return null;
    const cs = getComputedStyle(document.documentElement);
    const v = (n: string, f: string) => cs.getPropertyValue(n).trim() || f;
    const dark = colors.dark;
    const material = v("--mx-material", "#9a7a3c");
    const shell = v("--mx-raised", dark ? "#2a2d34" : "#f3f4f6");
    return {
      concrete: v("--mx-raised-hi", dark ? "#363a42" : "#ffffff"),
      steel: v("--mx-raised", dark ? "#2a2d34" : "#f3f4f6"),
      steelDark: v("--mx-metal-dark", dark ? "#25282e" : "#5c6572"),
      shell,
      machined: v("--mx-metal", dark ? "#565b65" : "#8a93a0"),
      paint: v("--mx-body", dark ? "#1c1e23" : "#e3e5e9"),
      housing: v("--mx-body", dark ? "#1c1e23" : "#e3e5e9"),
      material,
      // Burning-zone shell: graphite warmed toward the process brass (heat is process, not decoration).
      heat: mixHex(shell, material, 0.35),
      deep: v("--mx-deep", dark ? "#0c0d10" : "#c2c6cd"),
    };
  }, [colors]);
}

const systemTone = (status: string, health: number): Tone => (status === "Normal" ? healthTone(health) : severityTone(status));

export function MachineTwinHome({
  machine,
  alerts,
  activity,
  alertsLoading,
  alertsError,
  onOpenDiagnosis,
  onBack,
  onOpen,
}: {
  machine: AssetMachine;
  alerts: HomeAlert[];
  activity: HomeActivity[];
  alertsLoading: boolean;
  alertsError: string | null;
  onOpenDiagnosis: (machineId: string) => void;
  onBack: () => void;
  onOpen: (subPage: AssetsSubPage) => void;
}) {
  const { frame, systems, dots, overall, worst, conditionLabel } = useMachineOverview(machine);
  const colors = useTwinColors();
  const paints = usePaints();
  const [supported, setSupported] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [command, setCommand] = useState<TwinCameraCommand>({ kind: "fit", n: 0 });
  const [navMode, setNavMode] = usePersistedNavMode();

  useEffect(() => setSupported(hasWebGL()), []);
  useEffect(() => setSelectedId(null), [machine.id]);
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelectedId(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedId]);

  const stageRef = useRef<HTMLDivElement>(null);
  const sideRef = useRef<HTMLElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const panels = useMemo<Array<[Side, React.RefObject<HTMLElement | null>]>>(
    () => [["right", sideRef], ["bottom", bottomRef], ["top", topRef]],
    [],
  );
  const covered: TwinInset = useCoveredInset(stageRef, panels, true);

  const twinSystems = useMemo<MachineTwinSystem[]>(
    () =>
      systems.map((s) => ({
        id: s.id,
        name: s.name,
        health: s.health,
        status: s.status,
        tone: systemTone(s.status, s.health),
        bbox: s.bbox,
      })),
    [systems],
  );

  const dist = useMemo<Distribution>(() => {
    const d: Distribution = { critical: 0, atRisk: 0, offline: 0, healthy: 0 };
    for (const s of systems) {
      if (s.status === "Critical") d.critical++;
      else if (s.status === "Advisory") d.atRisk++;
      else d.healthy++;
    }
    return d;
  }, [systems]);

  // Live machines carry their health history; the others show the empty state.
  const trend = useMemo(
    () =>
      frame
        ? { series: frame.healthHistory.overall, labels: frame.times.map((t) => formatClock(t).clock) }
        : { series: [] as number[], labels: [] as string[] },
    [frame],
  );

  const tone: Tone = worst === "Normal" ? healthTone(overall) : severityTone(worst);
  const selected = twinSystems.find((s) => s.id === selectedId) ?? null;
  const selectedDots = selected ? dots.filter((d) => d.systemId === selected.id) : [];

  const select = (id: string | null) => {
    setSelectedId(id);
    setCommand((c) => ({ kind: id ? "focus" : "fit", n: c.n + 1 }));
  };

  return (
    <div className="ph-root ph-immersive ast-root" aria-label={`${machine.name} digital twin`}>
      <div ref={stageRef} className="ph-stage">
        <div
          className="ph-twin"
          style={
            {
              "--twin-top": `${covered.top}px`,
              "--twin-right": `${covered.right}px`,
              "--twin-bottom": `${covered.bottom}px`,
              "--twin-left": `${covered.left}px`,
            } as React.CSSProperties
          }
        >
          {!supported ? (
            <div className="ph-twin-loading" role="status">3D twin needs WebGL</div>
          ) : colors && paints ? (
            <MachineTwinCanvas
              diagramType={machine.diagramType}
              machineTone={tone}
              systems={twinSystems}
              dots={dots}
              selectedId={selectedId}
              onSelect={select}
              command={command}
              colors={colors}
              paints={paints}
              inset={covered}
              navMode={navMode}
              persistKey={`machine.${machine.id}`}
            />
          ) : (
            <div className="ph-twin-loading" role="status">Loading 3D twin…</div>
          )}

          <TwinNavBar navMode={navMode} onNavMode={setNavMode} onReset={() => setCommand((c) => ({ kind: "fit", n: c.n + 1 }))} />

          <TwinHint navMode={navMode} extra="click a component" />

          <div className="ph-twin-legend" aria-label="Legend">
            <span><i data-tone="good" />Normal</span>
            <span><i data-tone="warn" />Advisory</span>
            <span><i data-tone="bad" />Critical</span>
            <span className="ast-num">{dots.length} sensors · {twinSystems.length} components</span>
          </div>

          {selected && (
            <aside className="ph-inspector ph-twin-inspector mt3-inspector" aria-label={`${selected.name} details`}>
              <div className="ph-insp-head">
                <div>
                  <span className="ph-insp-name">{selected.name}</span>
                  <span className="ph-sub">Component · {machine.id}</span>
                </div>
                <button type="button" className="ast-icon-btn" onClick={() => select(null)} aria-label="Close details">
                  <IconClose />
                </button>
              </div>
              <StatusTag tone={selected.tone} label={selected.status} />
              <dl className="ph-insp-rows">
                <div><dt>Health</dt><dd className="ast-num">{selected.health}<span className="ast-unit">%</span></dd></div>
                <div><dt>Sensors</dt><dd className="ast-num">{selectedDots.length}</dd></div>
              </dl>
              {selectedDots.length > 0 && (
                <ul className="mt3-sensors" aria-label="Sensors on this component">
                  {selectedDots.map((d) => (
                    <li key={d.tag}>
                      <span className="ph-unit-dot" data-tone={severityTone(d.status)} aria-hidden="true" />
                      <span className="mt3-sensor-tag ast-num">{d.tag}</span>
                      <span className="mt3-sensor-name">{d.name}</span>
                      <span className="mt3-sensor-value ast-num">
                        {d.value}
                        {d.unit && <span className="ast-unit"> {d.unit}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <PillButton onClick={() => onOpen("health")}>
                Component health <IconChevron size={10} />
              </PillButton>
            </aside>
          )}
        </div>
      </div>

      <div className="ph-hud">
        <div ref={topRef} className="mt3-bar">
          <PillButton variant="secondary" onClick={onBack} icon={<IconBack size={12} />}>
            Plant
          </PillButton>
          <span className="mt3-title">
            <span className="mt3-name">{machine.name}</span>
            <span className="mt3-sub ast-num">
              {machine.id} · {machine.area}
            </span>
          </span>
          <StatusTag tone={tone} label={conditionLabel} />
          <PillButton variant="primary" onClick={() => onOpen("overview")}>
            Open machine <IconChevron size={10} />
          </PillButton>
        </div>
        <aside ref={sideRef} className="ph-hud-side" aria-label="Machine condition">
          <PlantHealthGauge score={overall} dist={dist} title="Machine health" />
          <AlertsFeed alerts={alerts} activity={activity} onOpen={onOpenDiagnosis} loading={alertsLoading} error={alertsError} />
        </aside>
        <div ref={bottomRef} className="ph-hud-bottom ph-strip">
          <HealthTrendCard series={trend.series} labels={trend.labels} />
        </div>
      </div>
    </div>
  );
}
