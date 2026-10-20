"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { EdgeProvider, useEdge } from "@/providers/edge-context";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { DevicesHierarchy } from "@/components/devices/hierarchy/devices-hierarchy";
import { MqttView } from "@/components/devices/mqtt-view";
import { FormatsView } from "@/components/devices/formats/formats-view";
import { DevicesOverview, type DevicesSectionId } from "@/components/devices/devices-overview";
import { usePlantMachineTabs } from "@/components/home/operator/machine-nav";
import "@/components/assets/assets-shell.css";
import "@/components/home/plant-home.css";
import "@/components/home/operator/operator-console.css";
import "./devices-overview.css";

/* ==========================================================================
   Devices — the acquisition network behind the plant.
     Overview:  is data reaching ULTRON? The data path per gateway
                (broker → gateway → source → card → point), where it stops,
                and the machine each point feeds.
     Hierarchy: gateway → source (DAQ rack · PLC · SCADA · DCS) → points,
                configured here and joined with what the brokers report.
     Formats:   how each gateway's messages are read (topic + JSON layout).
     MQTT:      the brokers the gateways publish to, and the live traffic.
   One registry fetch and one event stream (EdgeProvider) serve all four.
   ========================================================================== */

type DevicesSection = DevicesSectionId;
const SECTIONS: DevicesSection[] = ["overview", "hierarchy", "formats", "mqtt"];
const asSection = (v: string | null): DevicesSection => (SECTIONS as (string | null)[]).includes(v) ? (v as DevicesSection) : "overview";
const SECTION_KEY = "ultron.devices.section";

const SECTION_ITEMS: { id: DevicesSection; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "hierarchy", label: "Device tree" },
  { id: "formats", label: "Message formats" },
  { id: "mqtt", label: "Data connections (MQTT)" },
];

function readSection(): DevicesSection {
  try {
    return asSection(sessionStorage.getItem(SECTION_KEY));
  } catch {
    return "overview";
  }
}

/** What the hierarchy opens on when another section sends the operator there. */
interface HierarchyIntent {
  seq: number;
  key?: string;
  connect?: boolean;
}

export function IndustrialDevicesView() {
  return (
    <EdgeProvider>
      <DevicesWorkspaceShell />
    </EdgeProvider>
  );
}

function DevicesWorkspaceShell() {
  const { registry } = useEdge();
  const { setActiveTab, navigateToMachine } = useIndustrialData();

  const [section, setSection] = useState<DevicesSection>("overview");
  const [intent, setIntent] = useState<HierarchyIntent | null>(null);
  const [activeGatewayId, setActiveGatewayId] = useState<string>("all");

  // Restored after mount: sessionStorage is client-only and SSR renders the default.
  useEffect(() => setSection(readSection()), []);

  const change = useCallback((id: string) => {
    const next = asSection(id);
    setSection(next);
    if (next !== "hierarchy") setIntent(null);
    try {
      sessionStorage.setItem(SECTION_KEY, next);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const openHierarchy = useCallback(
    (opts?: { key?: string; connect?: boolean }) => {
      setIntent((i) => ({ seq: (i?.seq ?? 0) + 1, ...opts }));
      change("hierarchy");
    },
    [change],
  );

  // The active plant's machine pills, named as the Operator view names them.
  const plantTabs = usePlantMachineTabs();
  const equipmentTabs = useMemo(
    () => plantTabs.map((t) => ({ id: t.machineId ?? "full-line", label: t.label })),
    [plantTabs],
  );

  const gatewayPills = useMemo(() => {
    const gws = registry?.gateways ?? [];
    return [
      { id: "all", label: "All data collectors" },
      ...gws.map((g) => ({ id: g.id, label: g.name || g.code })),
    ];
  }, [registry]);

  const activeGwIdx = Math.max(0, gatewayPills.findIndex((g) => g.id === activeGatewayId));
  const selectGateway = (gwId: string) => {
    setActiveGatewayId(gwId);
    if (gwId === "all") {
      change("overview");
    } else {
      openHierarchy({ key: `gateway:${gwId}` });
    }
  };
  const stepGateway = (delta: number) => {
    if (gatewayPills.length <= 1) return;
    const nextIdx = (activeGwIdx + delta + gatewayPills.length) % gatewayPills.length;
    selectGateway(gatewayPills[nextIdx].id);
  };

  const switchToHomeView = useCallback(
    (v: "operator" | "twin" | "layout" | "assets") => {
      // Assets is its own workspace.
      if (v === "assets") {
        setActiveTab("assets");
        return;
      }
      try {
        localStorage.setItem("ultron.home.viewMode", v);
      } catch {
        /* ignore */
      }
      window.dispatchEvent(new CustomEvent("ultron:set-home-view", { detail: v }));
      setActiveTab("home");
    },
    [setActiveTab],
  );

  return (
    <div className="ph-root ph-operator-canvas ast-root" aria-label="Devices">
      <div className="opc-shell">
        {/* ROW 1: Equipment Units (left) + View Switcher (right) */}
        <header className="opc-topbar">
          <div className="opc-stage-tabs" role="tablist" aria-label="Machines">
            <div className="opc-pill-group">
              {equipmentTabs.map((item) => {
                const isActive = item.id === "full-line";
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    data-active={isActive || undefined}
                    className={`opc-pill-btn ${isActive ? "is-active" : ""}`}
                    onClick={() => {
                      if (item.id === "full-line") {
                        change("overview");
                      } else {
                        navigateToMachine(item.id, "rack");
                      }
                    }}
                  >
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="opc-topbar-right">
            <div className="opc-pill-group" role="tablist" aria-label="How to show the plant">
              {(["operator", "twin", "assets"] as const).map((v) => {
                const label = v === "operator" ? "Operator view" : v === "twin" ? "3D twin" : "Assets";
                return (
                  <button
                    key={v}
                    type="button"
                    role="tab"
                    aria-selected={false}
                    className="opc-pill-btn"
                    onClick={() => switchToHomeView(v)}
                  >
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        <div className="opc-workspace">
          <div className="opc-main-col">
            {/* ROW 2: Edge Gateways + Stepper (left) + Sub-navigation & Connect Action (right) */}
            <div className="opc-subbar">
              <div className="opc-stage-toggles">
                <div className="opc-pill-group" role="tablist" aria-label="Data collectors (gateways)">
                  {gatewayPills.map((gw) => {
                    const isActive = activeGatewayId === gw.id;
                    return (
                      <button
                        key={gw.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        data-active={isActive || undefined}
                        className={`opc-pill-btn ${isActive ? "is-active" : ""}`}
                        onClick={() => selectGateway(gw.id)}
                      >
                        <span>{gw.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="opc-stepper" aria-label="Previous or next data collector">
                  <span className="opc-stepper-pos">
                    {activeGwIdx + 1}/{gatewayPills.length}
                  </span>
                  <button type="button" className="opc-step-btn" onClick={() => stepGateway(-1)} aria-label="Previous data collector">
                    ‹
                  </button>
                  <button type="button" className="opc-step-btn" onClick={() => stepGateway(1)} aria-label="Next data collector">
                    ›
                  </button>
                </div>
              </div>

              <div className="opc-stage-toggles" style={{ marginLeft: "auto" }}>
                <div className="opc-pill-group" role="tablist" aria-label="Devices pages">
                  {SECTION_ITEMS.map((item) => {
                    const isActive = section === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        data-active={isActive || undefined}
                        className={`opc-pill-btn ${isActive ? "is-active" : ""}`}
                        onClick={() => change(item.id)}
                      >
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                  {section !== "overview" && (
                    <button
                      type="button"
                      className="opc-pill-btn"
                      onClick={() => openHierarchy({ connect: true })}
                    >
                      <span>+ Connect a data collector</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="opc-module-stage" style={{ padding: 0 }}>
              <div className="dv-frame" style={{ height: "100%" }}>
                <div className="dv-frame-body">
                  {section === "overview" ? (
                    <DevicesOverview sectionNav={null} onOpenHierarchy={openHierarchy} onOpenSection={change} />
                  ) : section === "mqtt" ? (
                    <MqttView />
                  ) : section === "formats" ? (
                    <FormatsView />
                  ) : (
                    <DevicesHierarchy key={intent?.seq ?? 0} sectionNav={null} initialSelection={intent?.key} startConnect={intent?.connect} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
