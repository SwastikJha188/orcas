"use client";

import React, { useEffect, useState } from "react";
import { PillNav } from "@/components/ui";
import { EdgeProvider } from "@/providers/edge-context";
import { DevicesHierarchy } from "@/components/devices/hierarchy/devices-hierarchy";
import { MqttView } from "@/components/devices/mqtt-view";
import { FormatsView } from "@/components/devices/formats/formats-view";
import "@/components/assets/assets-shell.css";

/* ==========================================================================
   Devices — the acquisition network behind the plant.
     Hierarchy: gateway → source (DAQ rack · PLC · SCADA · DCS) → points,
                configured here and joined with what the brokers report.
     Formats:   how each gateway's messages are read (topic + JSON layout).
     MQTT:      the brokers the gateways publish to, and the live traffic.
   One registry fetch and one event stream (EdgeProvider) serve both.
   ========================================================================== */

type DevicesSection = "hierarchy" | "formats" | "mqtt";
const SECTIONS: DevicesSection[] = ["hierarchy", "formats", "mqtt"];
const asSection = (v: string | null): DevicesSection => (SECTIONS as (string | null)[]).includes(v) ? (v as DevicesSection) : "hierarchy";
const SECTION_KEY = "ultron.devices.section";

function readSection(): DevicesSection {
  try {
    return asSection(sessionStorage.getItem(SECTION_KEY));
  } catch {
    return "hierarchy";
  }
}

export function IndustrialDevicesView() {
  const [section, setSection] = useState<DevicesSection>("hierarchy");
  // Restored after mount: sessionStorage is client-only and SSR renders the default.
  useEffect(() => setSection(readSection()), []);
  const change = (id: string) => {
    const next = asSection(id);
    setSection(next);
    try {
      sessionStorage.setItem(SECTION_KEY, next);
    } catch {
      /* storage unavailable */
    }
  };
  const sectionNav = (
    <PillNav
      items={[
        { id: "hierarchy", label: "Hierarchy" },
        { id: "formats", label: "Data formats" },
        { id: "mqtt", label: "MQTT" },
      ]}
      activeId={section}
      onChange={change}
    />
  );
  return (
    <EdgeProvider>
      {section === "mqtt" ? (
        <MqttView sectionNav={sectionNav} />
      ) : section === "formats" ? (
        <FormatsView sectionNav={sectionNav} />
      ) : (
        <DevicesHierarchy sectionNav={sectionNav} />
      )}
    </EdgeProvider>
  );
}
