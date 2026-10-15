"use client";

import { type ComponentType } from "react";
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
          <ContextSwitchers />
          <CopilotLauncher />
          <ThemeToggle />
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
      </nav>

      <footer className="info-bar" aria-label="Product information">
        <span>ORCAS.v.jg.3</span>
        <span>Copyright © OSWAR TECK INC.</span>
      </footer>
    </>
  );
}
