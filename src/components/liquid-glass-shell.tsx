"use client";

import { useId, useMemo, type ComponentType } from "react";
import {
  HomeIcon,
  AssetsIcon,
  DevicesIcon,
  AssetIQIcon,
  ConfigureIcon,
  MaintenanceIcon,
  SapIcon,
  SimulationIcon,
} from "./navigation-icons";
import { ThemeToggle } from "./theme-toggle";
import { ContextSwitchers, UserSwitcher } from "./context-switchers";
import { useEdge } from "@/providers/edge-context";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { useApi } from "@/lib/api-cache";
import { conditionUrl, type ConditionStrip as ConditionData } from "@/components/problems/cases-api";

export type WorkspaceTab = "home" | "assets" | "problems" | "maintenance" | "sap" | "devices" | "assetiq" | "configure" | "simulation";

interface LiquidGlassShellProps {
  activeTab?: WorkspaceTab;
  onSelectTab?: (tab: WorkspaceTab) => void;
  /** The logo: back to Home's Operator view at the Full line. */
  onBrand?: () => void;
}

type RailItem = { id: WorkspaceTab; label: string; hint: string; Icon: ComponentType<{ className?: string }> };

// Daily work first, in the order an operator reaches for it; plant set-up last (Serial position).
const PRIMARY: RailItem[] = [
  { id: "home", label: "Home", hint: "Home: live view of the plant and its machines", Icon: HomeIcon },
  // Problems (cases) and planned maintenance in one place; planned sections where the plant has checklists.
  { id: "maintenance", label: "Maintenance", hint: "Maintenance: planned checks, repair jobs and their history", Icon: MaintenanceIcon },
  // The plant's SAP system: problems raised there, its orders, spare parts and production.
  { id: "sap", label: "SAP", hint: "SAP: notifications, maintenance orders, spare parts and production orders in the plant's SAP system", Icon: SapIcon },
  // Asset directory and each machine's Sensors, Diagnosis, Prognosis and Analysis.
  { id: "assets", label: "Assets", hint: "Assets: every machine, its sensors, health and problems", Icon: AssetsIcon },
  { id: "assetiq", label: "AssetIQ", hint: "AssetIQ: ask questions about your machines in plain words", Icon: AssetIQIcon },
];

const SETUP: RailItem[] = [
  { id: "devices", label: "Devices", hint: "Devices: the gateways and racks that bring sensor readings in, and which machine sensor each channel feeds", Icon: DevicesIcon },
  { id: "configure", label: "Configure", hint: "Configure: plants, machines, users and settings", Icon: ConfigureIcon },
  { id: "simulation", label: "Simulation", hint: "Simulation: how often faults happen, how long they last, and each machine's demo state", Icon: SimulationIcon },
];

/** Open alarms on the active plant: the same server read (and cache entry) as Maintenance › Problems' "Open alarms", every 30 s. */
function useOpenAlarms(): { count: number; critical: number } {
  const { selectedPlantId } = useIndustrialData();
  const { data } = useApi<ConditionData>(selectedPlantId ? conditionUrl({ plantId: selectedPlantId }) : null, { refreshMs: 30_000 });
  return useMemo(() => {
    const alarms = data?.alarms ?? [];
    return { count: alarms.length, critical: alarms.filter((a) => a.severity === "Critical").length };
  }, [data]);
}

function RailButton({
  id,
  label,
  hint,
  Icon,
  active,
  onSelect,
  badge,
}: {
  id: WorkspaceTab;
  label: string;
  hint?: string;
  Icon: ComponentType<{ className?: string }>;
  active: boolean;
  onSelect?: (tab: WorkspaceTab) => void;
  /** A count worth noticing from any page (open alarms on Problems). */
  badge?: { count: number; tone: "warn" | "bad"; text: string };
}) {
  const hintId = useId();
  return (
    <button
      type="button"
      className={`rail-btn ${active ? "active" : ""}`}
      onClick={() => onSelect?.(id)}
      aria-label={label}
      aria-describedby={hint ? hintId : undefined}
      aria-current={active ? "page" : undefined}
    >
      <Icon />
      <span className="rail-label" aria-hidden="true">{label}</span>
      {badge && badge.count > 0 && (
        <span className="rail-badge" data-tone={badge.tone} title={badge.text}>
          <span aria-hidden="true">{badge.count > 99 ? "99+" : badge.count}</span>
          <span className="sr-only">{badge.text}</span>
        </span>
      )}
      {hint && (
        <span id={hintId} className="sr-only">
          {hint}
        </span>
      )}
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
    <button type="button" className="navbar-gw-status" data-active={gw.tone} onClick={() => onSelectTab?.("devices")} title={gw.title} aria-label={gw.label}>
      <span className="navbar-gw-dot" aria-hidden="true" />
      <span className="navbar-gw-label">{gw.label}</span>
    </button>
  );
}

export function LiquidGlassShell({ activeTab = "home", onSelectTab, onBrand }: LiquidGlassShellProps) {
  const alarms = useOpenAlarms();
  const superAdmin = Boolean(useIndustrialData().currentUser?.role.allPlants);
  const problemsBadge = {
    count: alarms.count,
    tone: alarms.critical > 0 ? ("bad" as const) : ("warn" as const),
    text: `${alarms.count} open alarm${alarms.count === 1 ? "" : "s"}${alarms.critical ? `, ${alarms.critical} critical` : ""}`,
  };
  return (
    <>
      <header className="navbar liquid-glass" aria-label="Top navigation">
        <button
          type="button"
          className="brand-btn"
          onClick={() => (onBrand ? onBrand() : onSelectTab?.("home"))}
          aria-label="Go to the full line operator view"
        >
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
          {PRIMARY.map((item) => (
            <RailButton
              key={item.id}
              {...item}
              active={activeTab === item.id}
              onSelect={onSelectTab}
              badge={item.id === "maintenance" ? problemsBadge : undefined}
            />
          ))}
        </div>
        <div className="rail-divider" />
        <div className="nav-rail-group">
          {/* Simulation belongs to the Oswar super administrator alone. */}
          {SETUP.filter((item) => item.id !== "simulation" || superAdmin).map((item) => (
            <RailButton key={item.id} {...item} active={activeTab === item.id} onSelect={onSelectTab} />
          ))}
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
        <span className="ast-num">ORCAS.v.jg.3</span>
        <span>Copyright © OSWAR TECK INC.</span>
      </footer>
    </>
  );
}
