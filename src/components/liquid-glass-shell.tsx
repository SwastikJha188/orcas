"use client";

import { useMemo, type ComponentType } from "react";
import {
  HomeIcon,
  AssetsIcon,
  DevicesIcon,
  AssetIQIcon,
  ConfigureIcon,
  MaintenanceIcon,
  SimulationIcon,
  ProblemsIcon,
} from "./navigation-icons";
import { ThemeToggle } from "./theme-toggle";
import { ContextSwitchers, UserSwitcher } from "./context-switchers";
import { useEdge } from "@/providers/edge-context";
import { usePrimaryMachineId } from "@/providers/kiln-simulation-context";
import { isPyroMachineId, isVpcMachineId } from "@/lib/live-defs";

export type WorkspaceTab = "home" | "assets" | "problems" | "maintenance" | "devices" | "assetiq" | "configure" | "simulation";

interface LiquidGlassShellProps {
  activeTab?: WorkspaceTab;
  onSelectTab?: (tab: WorkspaceTab) => void;
}

const PRIMARY: Array<{ id: WorkspaceTab; label: string; hint: string; Icon: ComponentType<{ className?: string }> }> = [
  { id: "home", label: "Home", hint: "Home: 3D view of the plant and its machines", Icon: HomeIcon },
  // Asset directory and each machine's Sensors, Diagnosis, Prognosis and Analysis.
  { id: "assets", label: "Assets", hint: "Assets: every machine, its sensors, health and problems", Icon: AssetsIcon },
  { id: "problems", label: "Problems", hint: "Problems: follow each problem from first sign to a checked repair", Icon: ProblemsIcon },
  // Planned maintenance: the pyro line and VPC 066 carry checklists and plans.
  { id: "maintenance", label: "Maintenance", hint: "Maintenance: planned checks, repair jobs and their history", Icon: MaintenanceIcon },
  { id: "devices", label: "Devices", hint: "Devices: the data collectors and connections that bring sensor readings in", Icon: DevicesIcon },
  { id: "assetiq", label: "AssetIQ", hint: "AssetIQ: ask questions about your machines in plain words", Icon: AssetIQIcon },
];

function RailButton({ id, label, hint, Icon, active, onSelect }: { id: WorkspaceTab; label: string; hint?: string; Icon: ComponentType<{ className?: string }>; active: boolean; onSelect?: (tab: WorkspaceTab) => void }) {
  return (
    <button
      type="button"
      className={`rail-btn ${active ? "active" : ""}`}
      onClick={() => onSelect?.(id)}
      title={hint ?? label}
      aria-label={hint ?? label}
      aria-current={active ? "page" : undefined}
    >
      <Icon />
      <span className="rail-label" aria-hidden="true">{label}</span>
    </button>
  );
}

function GatewayNavbarStatus({ onSelectTab }: { onSelectTab?: (tab: WorkspaceTab) => void }) {
  const { registry, snapshot, error } = useEdge();

  // What the pill says is what is true: checking, none registered, how many online, or all.
  const gw = useMemo((): { tone: "true" | "false" | "idle"; label: string; title: string } => {
    if (!registry && !error) return { tone: "idle", label: "Checking gateways", title: "Checking the gateways that send sensor readings." };
    if (error || !registry) return { tone: "false", label: "Gateways unknown", title: "The gateway list could not be loaded. Click to open Devices." };
    if (registry.gateways.length === 0)
      return { tone: "idle", label: "No gateways", title: "No gateway is registered yet: readings do not come from the plant's own data collectors. Click to open Devices." };

    const liveByCode = new Map((snapshot?.gateways ?? []).map((g) => [g.gatewayId, g]));
    const brokerStateById = new Map((snapshot?.brokers ?? []).map((b) => [b.brokerId, b.state]));
    const brokerById = new Map(registry.brokers.map((b) => [b.id, b]));
    const online = registry.gateways.filter((g) => {
      if (!g.enabled) return false;
      const live = liveByCode.get(g.code);
      if (live && live.state !== "ONLINE") return false;
      if (g.brokerId) {
        const broker = brokerById.get(g.brokerId);
        const bState = brokerStateById.get(g.brokerId);
        if (broker?.enabled && bState && (bState === "offline" || bState === "reconnecting")) return false;
      }
      return true;
    }).length;
    const total = registry.gateways.length;
    return online === total
      ? { tone: "true", label: total === 1 ? "Gateway online" : "All gateways online", title: "Every gateway that sends sensor readings is online. Click to open Devices." }
      : {
          tone: "false",
          label: `${online} of ${total} gateways online`,
          title: "At least one gateway is off or not connected, so some sensor readings are missing. Click to open Devices.",
        };
  }, [registry, snapshot, error]);

  return (
    <button type="button" className="navbar-gw-status" data-active={gw.tone} onClick={() => onSelectTab?.("devices")} title={gw.title}>
      <span className="navbar-gw-dot" aria-hidden="true" />
      <span className="navbar-gw-label">{gw.label}</span>
    </button>
  );
}

export function LiquidGlassShell({ activeTab = "home", onSelectTab }: LiquidGlassShellProps) {
  const primaryId = usePrimaryMachineId();
  const hasPms = isPyroMachineId(primaryId) || isVpcMachineId(primaryId);
  return (
    <>
      <header className="navbar liquid-glass" aria-label="Top navigation">
        <button type="button" className="brand-btn" onClick={() => onSelectTab?.("home")} aria-label="Go to the home page">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/wordmark-dark.png" alt="" className="brand-logo brand-logo-dark" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/wordmark-light.png" alt="" className="brand-logo brand-logo-light" />
        </button>
        <div className="cp-topbar-actions">
          <ContextSwitchers />
          <GatewayNavbarStatus onSelectTab={onSelectTab} />
          <ThemeToggle />
        </div>
      </header>

      <nav className="nav-rail liquid-glass" aria-label="Primary navigation">
        <div className="nav-rail-group">
          {PRIMARY.filter((item) => item.id !== "maintenance" || hasPms).map((item) => (
            <RailButton key={item.id} {...item} active={activeTab === item.id} onSelect={onSelectTab} />
          ))}
        </div>
        <div className="rail-divider" />
        <div className="nav-rail-group">
          <RailButton id="configure" label="Configure" hint="Configure: plants, machines, users and settings" Icon={ConfigureIcon} active={activeTab === "configure"} onSelect={onSelectTab} />
          <RailButton id="simulation" label="Simulation" hint="Simulation: how often faults happen, how long they last, and each machine's demo state" Icon={SimulationIcon} active={activeTab === "simulation"} onSelect={onSelectTab} />
        </div>

        <div className="nav-rail-footer">
          <UserSwitcher
            onManageUsers={() => {
              // Open Configure on its Users & access section.
              try {
                localStorage.setItem("ultron.configure.section", "users");
              } catch {
                /* storage unavailable */
              }
              onSelectTab?.("configure");
            }}
          />
        </div>
      </nav>

      <footer className="info-bar" aria-label="Product information">
        <span>ORCAS.v.jg.3</span>
        <span>Copyright © OSWAR TECK INC.</span>
      </footer>
    </>
  );
}
