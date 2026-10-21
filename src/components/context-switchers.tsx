"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { HierarchyNode } from "@/components/assets/assets-data";
import { IconChevron, machineTone } from "@/components/assets/assets-shell-ui";
import { toCondition, worstCondition } from "@/components/ui/status";
import { TypeIcon } from "@/components/assets/hierarchy/hierarchy-icons";
import {
  nodeLabel,
  type MachineLookup,
  findPath,
  isFolder,
  machineCondition,
  rollupTone,
  shortName,
  subtreeMachines,
} from "@/components/assets/hierarchy/hierarchy-model";
import { displayName } from "@/lib/display-name";
import { useHierarchyData } from "@/components/assets/hierarchy/use-hierarchy-data";
import { useIndustrialData } from "@/providers/industrial-data-context";
import "@/components/assets/assets-shell.css";
import "./context-switchers.css";

/* ==========================================================================
   Top-bar context switchers (ported from ULTRON TopBar: ShellSelect +
   MachineTreeSelect + UserSwitcher). The bar answers three questions on
   every page: which plant, which machine inside it, and which operator/user
   session is active.
   ========================================================================== */

/* ------------------------------------------------------------ anchored menu */

export function useAnchoredMenu(width: number) {
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });

  const place = useCallback(() => {
    const r = trigger.current?.getBoundingClientRect();
    if (!r) return;
    // TV tier: rects are zoomed px; the portalled menu is placed in CSS px under body { zoom }.
    const uz = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--ui-zoom")) || 1;
    const vw = window.innerWidth / uz;
    const vh = window.innerHeight / uz;
    const menuH = menu.current?.offsetHeight || 280;
    if (r.left / uz < 96 && vw >= 600) {
      const left = Math.min(r.right / uz + 8, vw - width - 8);
      const top = Math.max(8, Math.min(r.top / uz, vh - menuH - 32));
      setPos({ left, top });
    } else {
      const left = Math.max(8, Math.min(r.right / uz - width, vw - width - 8));
      const top = Math.max(8, Math.min(r.bottom / uz + 6, vh - menuH - 12));
      setPos({ left, top });
    }
  }, [width]);

  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const raf = requestAnimationFrame(place);
    window.addEventListener("resize", place);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  // Close on outside press and Escape; arrow keys move between items.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !trigger.current?.contains(t)) close(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      // Tab leaves the menu: focus goes back to the trigger, then the browser moves on from there.
      if (e.key === "Tab") {
        close();
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
      const items = Array.from(menu.current?.querySelectorAll<HTMLElement>("[data-menu-item]") ?? []);
      if (items.length === 0) return;
      e.preventDefault();
      const i = items.indexOf(document.activeElement as HTMLElement);
      const next =
        e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
      items[next].focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  // Focus the selected (or first) item when the menu opens or its level changes.
  const focusFirst = useCallback(() => {
    requestAnimationFrame(() => {
      const root = menu.current;
      if (!root) return;
      const el = root.querySelector<HTMLElement>('[data-menu-item][aria-checked="true"]') ?? root.querySelector<HTMLElement>("[data-menu-item]");
      el?.focus();
    });
  }, []);

  return { trigger, menu, open, setOpen, close, pos, focusFirst };
}

export function Trigger({
  innerRef,
  open,
  icon,
  kind,
  label,
  tone,
  condition,
  onClick,
  disabled,
}: {
  innerRef: React.RefObject<HTMLButtonElement | null>;
  open: boolean;
  icon: React.ReactNode;
  kind: string;
  label: string;
  tone?: string;
  /** Condition word for the dot (Normal, Alert, Critical…), read out with the label. */
  condition?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  const said = condition ? `${kind}: ${label}, ${condition}` : `${kind}: ${label}`;
  return (
    <button
      ref={innerRef}
      type="button"
      className="ctx-trigger"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label={`${said}. Change`}
      title={said}
      data-open={open || undefined}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="ctx-trigger-icon">{icon}</span>
      <span className="ctx-trigger-label">{label}</span>
      {tone && <span className="ctx-dot" data-tone={tone} aria-hidden="true" />}
      <span className="ctx-trigger-chev" aria-hidden="true">
        <IconChevron size={10} dir="down" />
      </span>
    </button>
  );
}

export function Menu({
  innerRef,
  pos,
  width,
  label,
  children,
}: {
  innerRef: React.RefObject<HTMLDivElement | null>;
  pos: { left: number; top: number };
  width: number;
  label: string;
  children: React.ReactNode;
}) {
  // The top bar is a backdrop-filter surface, which traps fixed descendants: portal out.
  return createPortal(
    <div ref={innerRef} className="ctx-menu" role="menu" aria-label={label} style={{ left: pos.left, top: pos.top, width }}>
      {children}
    </div>,
    document.body,
  );
}

export function Check({ on }: { on: boolean }) {
  return (
    <svg className="ctx-check" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ opacity: on ? 1 : 0 }}>
      <polyline points="5 12.5 10 17.5 19 7" />
    </svg>
  );
}

/** "3 machines", with only the count in the number face. */
function plural(n: number, noun: string) {
  return (
    <>
      <span className="ast-num">{n}</span> {noun}
      {n === 1 ? "" : "s"}
    </>
  );
}

const IconUser = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
  </svg>
);

const IconSignOut = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" />
  </svg>
);

/* ------------------------------------------------------------ plant switcher */

const PLANT_W = 290;

function PlantSwitcher({
  roots,
  plant,
  lookup,
  onChange,
}: {
  roots: HierarchyNode[];
  plant: HierarchyNode | undefined;
  lookup: MachineLookup;
  onChange: (id: string) => void;
}) {
  const m = useAnchoredMenu(PLANT_W);
  const label = plant ? shortName(plant.name) : "No plant";

  return (
    <>
      <Trigger
        innerRef={m.trigger}
        open={m.open}
        icon={<TypeIcon type="plant" size={14} />}
        kind="Plant"
        label={label}
        tone={plant ? rollupTone(plant, lookup) : undefined}
        condition={plant ? worstCondition(subtreeMachines(plant).map((n) => machineCondition(n, lookup).status)) : undefined}
        disabled={roots.length === 0}
        onClick={() => {
          m.setOpen((o) => !o);
          m.focusFirst();
        }}
      />
      {m.open && (
        <Menu innerRef={m.menu} pos={m.pos} width={PLANT_W} label="Plants">
          <div className="ctx-menu-head">
            <span className="ctx-menu-title">Plants you can open</span>
            <span className="ctx-menu-meta">
              <span className="ast-num">{roots.length}</span>
            </span>
          </div>
          <div className="ctx-list">
            {roots.map((p) => {
              const active = p.id === plant?.id;
              const n = subtreeMachines(p).length;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  data-menu-item
                  className="ctx-row"
                  onClick={() => {
                    onChange(p.id);
                    m.close();
                  }}
                >
                  <Check on={active} />
                  <span className="ctx-badge">
                    <TypeIcon type="plant" size={14} />
                  </span>
                  <span className="ctx-row-text">
                    <span className="ctx-row-name">{shortName(p.name)}</span>
                    <span className="ctx-row-meta">{plural(n, "machine")}</span>
                  </span>
                  <span className="ctx-dot" data-tone={rollupTone(p, lookup)} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </Menu>
      )}
    </>
  );
}

/* ---------------------------------------------------------- machine switcher */

const MACHINE_W = 300;

function MachineSwitcher({
  plant,
  machineId,
  lookup,
  onChange,
}: {
  plant: HierarchyNode | undefined;
  machineId: string | null;
  lookup: MachineLookup;
  onChange: (id: string | null) => void;
}) {
  const m = useAnchoredMenu(MACHINE_W);
  /** Folder ids below the plant the open menu stands in; [] is the plant itself. */
  const [trail, setTrail] = useState<string[]>([]);

  const machineNode = useMemo(
    () => (plant && machineId ? subtreeMachines(plant).find((n) => n.machineId === machineId) : undefined),
    [plant, machineId],
  );

  // Reopening returns to the level the selected machine is on, not to the top.
  useEffect(() => {
    if (m.open || !plant) return;
    const path = machineNode ? findPath([plant], machineNode.id) : [];
    setTrail(path.slice(1, -1).map((n) => n.id));
  }, [m.open, plant, machineNode]);

  if (!plant) return null;

  // Walk the trail; stop where a step no longer exists (renamed or moved).
  const steps: HierarchyNode[] = [];
  let level: HierarchyNode = plant;
  for (const id of trail) {
    const next = (level.children ?? []).find((c) => c.id === id && isFolder(c));
    if (!next) break;
    steps.push(next);
    level = next;
  }
  const kids = level.children ?? [];
  const rows = [...kids.filter(isFolder), ...kids.filter((k) => k.type === "machine")];
  const go = (t: string[]) => {
    setTrail(t);
    m.focusFirst();
  };

  const tone = machineNode ? machineTone(machineCondition(machineNode, lookup).status) : undefined;

  return (
    <>
      <Trigger
        innerRef={m.trigger}
        open={m.open}
        icon={<TypeIcon type="machine" size={14} />}
        kind="Machine"
        label={machineNode ? nodeLabel(machineNode) : "All machines"}
        tone={tone}
        condition={machineNode ? toCondition(machineCondition(machineNode, lookup).status) : undefined}
        onClick={() => {
          m.setOpen((o) => !o);
          m.focusFirst();
        }}
      />
      {m.open && (
        <Menu innerRef={m.menu} pos={m.pos} width={MACHINE_W} label="Machines">
          <nav className="ctx-crumbs" role="none">
            {steps.length > 0 && (
              <button type="button" className="ctx-crumb-back" aria-label="Up one level" onClick={() => go(trail.slice(0, steps.length - 1))}>
                <IconChevron size={10} dir="left" />
              </button>
            )}
            {[plant, ...steps].map((node, i, all) => {
              const last = i === all.length - 1;
              return (
                <React.Fragment key={node.id}>
                  {i > 0 && <span className="ctx-crumb-sep" aria-hidden="true">/</span>}
                  {last ? (
                    <span className="ctx-crumb is-current" aria-current="location">
                      {i === 0 ? shortName(node.name) : node.name}
                    </span>
                  ) : (
                    <button type="button" className="ctx-crumb" onClick={() => go(steps.slice(0, i).map((s) => s.id))}>
                      {i === 0 ? shortName(node.name) : node.name}
                    </button>
                  )}
                </React.Fragment>
              );
            })}
          </nav>

          <div className="ctx-list">
            {/* The whole plant is a real state to return to, offered once at the root. */}
            {steps.length === 0 && (
              <button
                type="button"
                role="menuitemradio"
                aria-checked={!machineNode}
                data-menu-item
                className="ctx-row"
                onClick={() => {
                  onChange(null);
                  m.close();
                }}
              >
                <Check on={!machineNode} />
                <span className="ctx-badge">
                  <TypeIcon type="plant" size={14} />
                </span>
                <span className="ctx-row-text">
                  <span className="ctx-row-name">All machines</span>
                  <span className="ctx-row-meta">The whole plant</span>
                </span>
              </button>
            )}

            {rows.length === 0 && <p className="ctx-empty">No machines at this level.</p>}

            {rows.map((row) => {
              if (row.type !== "machine") {
                const n = subtreeMachines(row).length;
                return (
                  <button
                    key={row.id}
                    type="button"
                    role="menuitem"
                    aria-haspopup="menu"
                    data-menu-item
                    className="ctx-row"
                    onClick={() => go([...steps.map((s) => s.id), row.id])}
                  >
                    <Check on={false} />
                    <span className="ctx-badge">
                      <TypeIcon type={row.type} size={14} />
                    </span>
                    <span className="ctx-row-text">
                      <span className="ctx-row-name">{row.name}</span>
                      <span className="ctx-row-meta">{plural(n, "machine")}</span>
                    </span>
                    <span className="ctx-dot" data-tone={rollupTone(row, lookup)} aria-hidden="true" />
                    <span className="ctx-row-chev" aria-hidden="true">
                      <IconChevron size={10} />
                    </span>
                  </button>
                );
              }
              const c = machineCondition(row, lookup);
              const active = row.machineId === machineId;
              return (
                <button
                  key={row.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  data-menu-item
                  className="ctx-row"
                  disabled={!row.machineId}
                  onClick={() => {
                    onChange(row.machineId ?? null);
                    m.close();
                  }}
                >
                  <Check on={active} />
                  <span className="ctx-badge" data-tone={machineTone(c.status)}>
                    <TypeIcon type="machine" size={14} />
                  </span>
                  <span className="ctx-row-text">
                    <span className="ctx-row-name" title={row.machineId}>
                      {displayName(row.name)}
                    </span>
                    <span className="ctx-row-meta">{toCondition(c.status)}</span>
                  </span>
                  <span className="ctx-row-value ast-num" title={c.health !== null ? `Health score ${c.health}%` : "Health score not available"}>
                    {c.health ?? "—"}
                    {c.health !== null && <span className="ast-unit">%</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </Menu>
      )}
    </>
  );
}

/* ------------------------------------------------------------ user switcher */

const USER_W = 310;

export function UserSwitcher({
  onManageUsers,
}: {
  onManageUsers?: () => void;
} = {}) {
  const { currentUser, signOut, setActiveTab } = useIndustrialData();
  const m = useAnchoredMenu(USER_W);
  if (!currentUser) return null;

  const userTone = currentUser.status === "Active" ? "good" : currentUser.status === "On Call" ? "warn" : "idle";
  const plantSummary = currentUser.role.allPlants
    ? "Every plant"
    : currentUser.plantAccess.length > 0
      ? currentUser.plantAccess.map((p) => p.plantName).join(", ")
      : "All plants";

  return (
    <>
      <Trigger
        innerRef={m.trigger}
        open={m.open}
        icon={<IconUser />}
        kind="Signed in as"
        label={currentUser.fullName}
        tone={userTone}
        onClick={() => {
          m.setOpen((o) => !o);
          m.focusFirst();
        }}
      />
      {m.open && (
        <Menu innerRef={m.menu} pos={m.pos} width={USER_W} label="Account">
          <div className="ctx-menu-head">
            <span className="ctx-menu-title">Signed in</span>
            <span className="ctx-menu-meta">{currentUser.email}</span>
          </div>
          <div className="ctx-list" role="none">
            <div className="ctx-row" role="none">
              <Check on />
              <span className="ctx-badge" data-tone={userTone} style={{ fontSize: 10, fontWeight: 600 }}>
                {currentUser.avatarInitials}
              </span>
              <span className="ctx-row-text">
                <span className="ctx-row-name">{currentUser.fullName}</span>
                <span className="ctx-row-meta">
                  {currentUser.title} · {plantSummary}
                </span>
              </span>
              <span className="ctx-dot" data-tone={userTone} aria-hidden="true" />
            </div>
            {currentUser.role.canManageUsers && (
              <button
                type="button"
                role="menuitem"
                data-menu-item
                className="ctx-row"
                onClick={() => {
                  (onManageUsers ?? (() => setActiveTab("configure")))();
                  m.close();
                }}
              >
                <Check on={false} />
                <span className="ctx-badge">
                  <IconUser />
                </span>
                <span className="ctx-row-text">
                  <span className="ctx-row-name">Manage users & plants</span>
                  <span className="ctx-row-meta">Choose who can see and change each plant</span>
                </span>
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              data-menu-item
              className="ctx-row"
              onClick={() => {
                m.close();
                void signOut();
              }}
            >
              <Check on={false} />
              <span className="ctx-badge">
                <IconSignOut />
              </span>
              <span className="ctx-row-text">
                <span className="ctx-row-name">Sign out</span>
                <span className="ctx-row-meta">Return to the sign-in screen</span>
              </span>
            </button>
          </div>
        </Menu>
      )}
    </>
  );
}

/* --------------------------------------------------------------- top bar slot */

export function ContextSwitchers() {
  const {
    selectedPlantId,
    setSelectedPlantId,
    selectedMachineId,
    setSelectedMachineId,
    activeTab,
    setActiveTab,
  } = useIndustrialData();
  const { roots, lookup } = useHierarchyData();
  const plant = roots.find((p) => p.id === selectedPlantId) ?? roots[0];

  const choosePlant = (id: string) => {
    setSelectedPlantId(id);
    const next = roots.find((p) => p.id === id);
    if (selectedMachineId && next && !subtreeMachines(next).some((n) => n.machineId === selectedMachineId)) {
      setSelectedMachineId(null);
    }
  };

  // A machine opens in Assets when Assets is open; anywhere else, as a twin on Home.
  const chooseMachine = (id: string | null) => {
    setSelectedMachineId(id);
    if (activeTab !== "assets" && activeTab !== "home") setActiveTab("home");
  };

  if (roots.length === 0) return null;

  return (
    <div className="ctx-switchers" role="group" aria-label="Choose plant and machine">
      <PlantSwitcher roots={roots} plant={plant} lookup={lookup} onChange={choosePlant} />
      <span className="ctx-sep" aria-hidden="true">/</span>
      <MachineSwitcher plant={plant} machineId={selectedMachineId} lookup={lookup} onChange={chooseMachine} />
    </div>
  );
}
