"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { AssetMachine } from "./assets-data";
import { PillNav } from "@/components/ui";
import type { MachineCatalog } from "./use-machine-catalog";
import type { DetailedSensorInfo } from "./machine-sensor-mapping-view";
import { MachineSchematic, SCHEMATIC_H, SCHEMATIC_W, type SchematicDot } from "./machine-schematic";
import { KilnSubAssemblyDiagram, VIEW_H, VIEW_W, type DiagramPin } from "./kiln-component-diagrams";
import { KILN_SUB_ASSEMBLIES } from "./component-health-view";
import { StatusTag, severityTone } from "./assets-shell-ui";
import { SensorWidgetStage, type RingPosition, type SensorGroup } from "./sensor-widget-stage";

/* ==========================================================================
   Sensor mapping · diagram section.
   The drawing at full width with one floating card per channel docked
   above and below it (SensorWidgetStage). The whole-machine view clusters
   the cards by component; a component view lets each card stand alone with
   its limit bar. Hover a card to light its pad; select it to keep it lit.
   ========================================================================== */

type Status = DetailedSensorInfo["status"];
const SEVERITY: Record<Status, number> = { Normal: 0, Advisory: 1, Critical: 2 };
const worst = (list: Status[]): Status =>
  list.reduce<Status>((w, s) => (SEVERITY[s] > SEVERITY[w] ? s : w), "Normal");

const tagOf = (s: DetailedSensorInfo) => s.parameter || s.id;

/** Reading as a share of its alarm limit — only for rising, non-negative limits. */
export function sensorAlarmLoad(s: DetailedSensorInfo): number | null {
  const warn = Number(s.warningVal);
  const alarm = Number(s.alarmVal);
  if (!(alarm > 0) || !(s.numericValue >= 0) || warn >= alarm) return null;
  if (!Number.isFinite(parseFloat(s.value))) return null;
  const load = Math.round((s.numericValue / alarm) * 100);
  if (load > 100 && s.status === "Normal") return null;
  return load;
}

interface Component {
  id: string;
  systemId: string;
  name: string;
  shortName: string;
  health: number | null;
  status: Status;
  tags: string[];
  /** Pins on the dedicated component drawing, when one exists. */
  pins: DiagramPin[] | null;
}


const MACHINE = "machine";

export function SensorMappingDiagram({
  machine,
  catalog,
  sensors,
}: {
  machine: AssetMachine;
  catalog: MachineCatalog;
  sensors: DetailedSensorInfo[];
}) {
  const [componentId, setComponentId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    setComponentId(null);
    setSelectedTag(null);
  }, [machine.id]);

  const byTag = useMemo(() => new Map(sensors.map((s) => [tagOf(s), s])), [sensors]);

  const components = useMemo<Component[]>(() => {
    const specs = new Map(KILN_SUB_ASSEMBLIES.map((a) => [a.id, a]));
    const subByTag = new Map(catalog.sensors.map((s) => [s.tag, s.subassemblyId]));
    return catalog.subassemblies
      .map((sa) => {
        const spec = specs.get(sa.subassemblyId);
        const tags = spec
          ? spec.pins.map((p) => p.tag)
          : sensors.filter((s) => subByTag.get(tagOf(s)) === sa.subassemblyId).map(tagOf);
        // Callout cards replace the drawing's own in-SVG callouts.
        const pins = spec
          ? spec.pins.map((p) => {
              const s = byTag.get(p.tag);
              const pin = { ...p, calloutX: undefined, calloutY: undefined };
              return s ? { ...pin, label: s.name, value: s.value, unit: s.unit, status: s.status } : pin;
            })
          : null;
        const statuses = tags.map((t) => byTag.get(t)?.status ?? "Normal");
        return {
          id: sa.subassemblyId,
          systemId: sa.systemId,
          name: sa.name,
          shortName: sa.shortName || sa.name,
          health: Number.isFinite(sa.health) ? sa.health : null,
          status: SEVERITY[sa.status] >= SEVERITY[worst(statuses)] ? sa.status : worst(statuses),
          tags,
          pins,
        };
      })
      .filter((c) => c.tags.length > 0);
  }, [catalog, sensors, byTag]);

  const active = components.find((c) => c.id === componentId) ?? null;
  const activeSystemId = active?.systemId ?? MACHINE;

  const systemTabs = useMemo(() => {
    const tabs = [{ id: MACHINE, label: "Whole machine" }];
    for (const sys of catalog.systems) {
      if (components.some((c) => c.systemId === sys.systemId)) {
        tabs.push({ id: sys.systemId, label: sys.shortName || sys.name });
      }
    }
    return tabs;
  }, [catalog.systems, components]);

  const siblings = active ? components.filter((c) => c.systemId === active.systemId) : [];

  const selectSystem = (id: string) => {
    setSelectedTag(null);
    setComponentId(id === MACHINE ? null : components.find((c) => c.systemId === id)?.id ?? null);
  };

  const openComponent = (id: string) => {
    setSelectedTag(null);
    setComponentId(id);
  };

  const componentByTag = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of components) for (const t of c.tags) m.set(t, c.id);
    return m;
  }, [components]);

  // Sensors on the active drawing.
  const drawingSensors = useMemo(() => {
    const tags = active ? active.tags : sensors.map(tagOf);
    return tags.map((t) => byTag.get(t)).filter((s): s is DetailedSensorInfo => Boolean(s));
  }, [active, sensors, byTag]);

  const dots = useMemo<SchematicDot[]>(
    () =>
      sensors.map((s) => ({
        tag: tagOf(s),
        name: s.name,
        value: s.value,
        unit: s.unit,
        status: s.status,
        x: s.x,
        y: s.y,
        systemId: componentByTag.get(tagOf(s)),
      })),
    [sensors, componentByTag]
  );

  const machineView = !active;
  const toggle = useCallback((tag: string | null) => setSelectedTag((prev) => (tag === null || prev === tag ? null : tag)), []);

  // Pads on the dedicated component drawing (720 × 310) or the machine schematic (% of 1000 × 372).
  const pins = active?.pins ?? null;
  const positionOf = useCallback(
    (s: DetailedSensorInfo): RingPosition | null => {
      if (pins) {
        const pin = pins.find((p) => p.tag === tagOf(s));
        return pin ? { u: pin.x / VIEW_W, v: pin.y / VIEW_H } : null;
      }
      return s.x > 0 || s.y > 0 ? { u: s.x / 100, v: s.y / 100 } : null;
    },
    [pins]
  );
  const pointOf = useCallback(
    (s: DetailedSensorInfo) => pins?.find((p) => p.tag === tagOf(s))?.id ?? s.point ?? "",
    [pins]
  );

  // One widget per component on the whole-machine view.
  const groups = useMemo<SensorGroup[] | undefined>(
    () =>
      active
        ? undefined
        : components.map((c) => ({
            id: c.id,
            label: c.name,
            caption: c.health != null ? `${c.health} %` : undefined,
            tags: c.tags,
          })),
    [active, components]
  );

  const renderDrawing = (hot: string | null, hover: string | null, hoverGroup: string | null) =>
    active && pins ? (
      <KilnSubAssemblyDiagram
        subAssemblyId={active.id}
        pins={pins}
        selectedPinId={hot}
        onSelectPin={(pin) => toggle(pin.tag)}
        ariaLabel={`${active.name} drawing with ${pins.length} measurement points`}
      />
    ) : (
      <MachineSchematic
        diagramType={machine.diagramType}
        dots={dots}
        selectedTag={hot}
        onSelect={toggle}
        focusSystemId={active ? active.id : hoverGroup ?? (hover ? componentByTag.get(hover) ?? null : null)}
        label={active ? `${active.name} sensors on ${machine.name}` : `${machine.name} sensor layout`}
      />
    );

  const statuses = drawingSensors.map((s) => s.status);
  const title = active ? active.name : machine.name;

  return (
    <section className="ast-card ast-smd" aria-label="Machine and sensor mapping diagram">
      <header className="ast-card-head ast-smd-head">
        <div className="ast-smd-title">
          <h3 className="ast-card-title">{title}</h3>
          <span className="ast-caption">
            {active ? `${active.shortName} · ` : `${components.length} components · `}
            {drawingSensors.length} sensor{drawingSensors.length === 1 ? "" : "s"} mapped
          </span>
        </div>
        {drawingSensors.length > 0 && (
          <StatusTag
            tone={severityTone(worst(statuses))}
            label={
              active?.health != null
                ? `${active.health} % health`
                : `${statuses.filter((s) => s === "Normal").length} / ${statuses.length} normal`
            }
          />
        )}
      </header>

      {systemTabs.length > 1 && (
        <div className="ast-smd-nav">
          <PillNav items={systemTabs} activeId={activeSystemId} onChange={selectSystem} wrap />
          {siblings.length > 1 && (
            <PillNav
              className="ast-smd-subnav"
              items={siblings.map((c) => ({ id: c.id, label: c.shortName }))}
              activeId={active?.id ?? ""}
              onChange={openComponent}
              wrap
            />
          )}
        </div>
      )}

      {drawingSensors.length === 0 ? (
        <div className="ast-empty">{catalog.isLoading ? "Loading sensor catalog…" : "No sensors mapped."}</div>
      ) : (
        <div className="ast-smr-scene mx-canvas">
          <SensorWidgetStage
            key={active?.id ?? MACHINE}
            sensors={drawingSensors}
            aspect={pins ? VIEW_W / VIEW_H : SCHEMATIC_W / SCHEMATIC_H}
            positionOf={positionOf}
            pointOf={pointOf}
            groups={groups}
            renderDrawing={renderDrawing}
            selectedTag={selectedTag}
            onToggle={toggle}
          />
          <p className="ast-caption ast-smd-hint">
            {machineView
              ? components.length > 0
                ? "Hover a card to light its pad and component · pick a component above to open its drawing."
                : "Hover a card to light its pad."
              : "Hover a card to light its pad · select it to keep the pad lit."}
          </p>
        </div>
      )}
    </section>
  );
}
