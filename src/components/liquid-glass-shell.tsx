"use client";

import { useMemo, type ComponentType } from "react";
import {
  HomeIcon,
  AssetsIcon,
  DevicesIcon,
  AssetIQIcon,
  ConfigureIcon,
} from "./navigation-icons";
import { ThemeToggle } from "./theme-toggle";
import { CopilotLauncher } from "./copilot/copilot";
import { ContextSwitchers } from "./context-switchers";
import { useEdge } from "@/providers/edge-context";

export type WorkspaceTab = "home" | "assets" | "devices" | "assetiq" | "configure";

interface LiquidGlassShellProps {
  activeTab?: WorkspaceTab;
  onSelectTab?: (tab: WorkspaceTab) => void;
}

const PRIMARY: Array<{ id: WorkspaceTab; label: string; Icon: ComponentType<{ className?: string }> }> = [
  { id: "home", label: "Home", Icon: HomeIcon },
  { id: "assets", label: "Assets", Icon: AssetsIcon },
  { id: "devices", label: "Devices", Icon: DevicesIcon },
  { id: "assetiq", label: "AssetIQ", Icon: AssetIQIcon },
];

function RailButton({ id, label, Icon, active, onSelect }: { id: WorkspaceTab; label: string; Icon: ComponentType<{ className?: string }>; active: boolean; onSelect?: (tab: WorkspaceTab) => void }) {
  return (
    <button
      type="button"
      className={`rail-btn ${active ? "active" : ""}`}
      onClick={() => onSelect?.(id)}
      title={label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
    >
      <Icon />
      <span className="rail-label" aria-hidden="true">{label}</span>
    </button>
  );
}

function GatewayNavbarStatus({ onSelectTab }: { onSelectTab?: (tab: WorkspaceTab) => void }) {
  const { registry, snapshot, error } = useEdge();

  const allActive = useMemo(() => {
    if (!registry && !error) return true;
    if (error || !registry || registry.gateways.length === 0) return false;
    if (!registry.gateways.every((g) => g.enabled)) return false;

    const liveByCode = new Map((snapshot?.gateways ?? []).map((g) => [g.gatewayId, g]));
    const brokerStateById = new Map((snapshot?.brokers ?? []).map((b) => [b.brokerId, b.state]));
    const brokerById = new Map(registry.brokers.map((b) => [b.id, b]));

    for (const gw of registry.gateways) {
      const live = liveByCode.get(gw.code);
      if (live && live.state !== "ONLINE") return false;
      if (gw.brokerId) {
        const broker = brokerById.get(gw.brokerId);
        const bState = brokerStateById.get(gw.brokerId);
        if (broker?.enabled && bState && (bState === "offline" || bState === "reconnecting")) {
          return false;
        }
      }
    }
    return true;
  }, [registry, snapshot, error]);

  return (
    <button
      type="button"
      className="navbar-gw-status"
      data-active={allActive ? "true" : "false"}
      onClick={() => onSelectTab?.("devices")}
      title={allActive ? "All edge gateways are active — click to open Devices" : "One or more gateways are inactive — click to open Devices"}
    >
      <span className="navbar-gw-dot" aria-hidden="true" />
      <span>All Gateways active</span>
    </button>
  );
}

export function LiquidGlassShell({ activeTab = "home", onSelectTab }: LiquidGlassShellProps) {
  return (
    <>
      <header className="navbar liquid-glass" aria-label="Top navigation">
        <button type="button" className="brand-btn" onClick={() => onSelectTab?.("home")} aria-label="ULTRON home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/wordmark-dark.png" alt="" className="brand-logo brand-logo-dark" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/wordmark-light.png" alt="" className="brand-logo brand-logo-light" />
        </button>
        <div className="cp-topbar-actions">
          <GatewayNavbarStatus onSelectTab={onSelectTab} />
        </div>
      </header>

      <nav className="nav-rail liquid-glass" aria-label="Primary navigation">
        <div className="nav-rail-group">
          {PRIMARY.map((item) => (
            <RailButton key={item.id} {...item} active={activeTab === item.id} onSelect={onSelectTab} />
          ))}
        </div>
        <div className="rail-divider" />
        <div className="nav-rail-group">
          <RailButton id="configure" label="Configure" Icon={ConfigureIcon} active={activeTab === "configure"} onSelect={onSelectTab} />
        </div>

        <div className="nav-rail-footer">
          <ContextSwitchers />
          <div className="rail-divider" />
          <CopilotLauncher />
          <ThemeToggle />
        </div>
      </nav>

      <footer className="info-bar" aria-label="Product information">
        <span>ORCAS.v.jg.3</span>
        <span>Copyright © OSWAR TECK INC.</span>
      </footer>
    </>
  );
}
