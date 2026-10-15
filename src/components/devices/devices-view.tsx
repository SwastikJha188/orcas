"use client";

import React, { useEffect, useState } from "react";
import { PillNav } from "@/components/ui";
import { EdgeProvider } from "@/providers/edge-context";
import { DevicesHierarchy } from "@/components/devices/hierarchy/devices-hierarchy";
import { MqttView } from "@/components/devices/mqtt-view";
import { FormatsView } from "@/components/devices/formats/formats-view";
import { DevicesOverview, type DevicesSectionId } from "@/components/devices/devices-overview";
import "@/components/assets/assets-shell.css";
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
  const [section, setSection] = useState<DevicesSection>("overview");
  const [intent, setIntent] = useState<HierarchyIntent | null>(null);
  // Restored after mount: sessionStorage is client-only and SSR renders the default.
  useEffect(() => setSection(readSection()), []);
  const change = (id: string) => {
    const next = asSection(id);
    setSection(next);
    if (next !== "hierarchy") setIntent(null);
    try {
      sessionStorage.setItem(SECTION_KEY, next);
    } catch {
      /* storage unavailable */
    }
  };
  const openHierarchy = (opts?: { key?: string; connect?: boolean }) => {
    setIntent((i) => ({ seq: (i?.seq ?? 0) + 1, ...opts }));
    change("hierarchy");
  };
  const sectionNav = (
    <PillNav
      items={[
        { id: "overview", label: "Overview" },
        { id: "hierarchy", label: "Hierarchy" },
        { id: "formats", label: "Data formats" },
        { id: "mqtt", label: "MQTT" },
      ]}
      activeId={section}
      onChange={change}
    />
  );
  // The tab row sits above every section (and above the Hierarchy tree), so it
  // never moves when the operator switches tabs.
  return (
    <EdgeProvider>
      <div className="dv-frame">
        <div className="dv-frame-tabs">{sectionNav}</div>
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
    </EdgeProvider>
  );
}
