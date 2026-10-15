"use client";

import React, { useCallback, useEffect, useState } from "react";
import "./twin-nav.css";

/* Twin camera UI (no three.js here, so pages can import it eagerly). */

/** Kept for prop compatibility; both Move and Orbit are always active simultaneously. */
export type TwinNavMode = "move" | "orbit";

export type TwinNudgeAction =
  | "move-up"
  | "move-down"
  | "move-left"
  | "move-right"
  | "orbit-left"
  | "orbit-right"
  | "zoom-in"
  | "zoom-out";

/** Shared held-key set so on-screen buttons in TwinNavBar drive useTwinNavigation at 60fps. */
export const twinExternalHeld = new Set<string>();

export function emitTwinNudge(action: TwinNudgeAction) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<TwinNudgeAction>("ultron:twin-nudge", { detail: action }));
  }
}

export function usePersistedNavMode(): [TwinNavMode, (m: TwinNavMode) => void] {
  const [mode, setMode] = useState<TwinNavMode>("orbit");
  const update = useCallback((m: TwinNavMode) => {
    setMode(m);
  }, []);
  return [mode, update];
}

function HoldButton({
  holdKey,
  nudge,
  label,
  title,
  onAction,
  children,
}: {
  holdKey: string;
  nudge: TwinNudgeAction;
  label: string;
  title: string;
  onAction?: (action: TwinNudgeAction) => void;
  children: React.ReactNode;
}) {
  const stop = () => {
    if (holdKey) {
      twinExternalHeld.delete(holdKey);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ultron:twin-hold"));
      }
    }
  };
  return (
    <button
      type="button"
      className="twin-nav-btn"
      aria-label={label}
      title={title}
      onPointerDown={() => {
        if (onAction) {
          onAction(nudge);
        } else {
          emitTwinNudge(nudge);
          if (holdKey) {
            twinExternalHeld.add(holdKey);
            window.dispatchEvent(new CustomEvent("ultron:twin-hold"));
          }
        }
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (onAction) onAction(nudge);
          else emitTwinNudge(nudge);
        }
      }}
    >
      {children}
    </button>
  );
}

/** Direct zero-toggle camera controls (Move, Orbit, Zoom, Reset), floating bottom-right of the stage. */
export function TwinNavBar({
  onReset,
  onAction,
}: {
  navMode?: TwinNavMode;
  onNavMode?: (m: TwinNavMode) => void;
  onReset: () => void;
  onAction?: (action: TwinNudgeAction) => void;
}) {
  return (
    <div className="twin-nav" role="group" aria-label="Camera controls">
      <div className="twin-nav-cluster" role="group" aria-label="Move camera">
        <span className="twin-nav-tag">Move</span>
        <HoldButton holdKey="a" nudge="move-left" label="Move left" title="Move left (A / Left arrow / Right-drag)" onAction={onAction}>
          ←
        </HoldButton>
        <HoldButton holdKey="w" nudge="move-up" label="Move forward" title="Move forward (W / Up arrow / Right-drag)" onAction={onAction}>
          ↑
        </HoldButton>
        <HoldButton holdKey="s" nudge="move-down" label="Move back" title="Move back (S / Down arrow / Right-drag)" onAction={onAction}>
          ↓
        </HoldButton>
        <HoldButton holdKey="d" nudge="move-right" label="Move right" title="Move right (D / Right arrow / Right-drag)" onAction={onAction}>
          →
        </HoldButton>
      </div>

      <span className="twin-nav-sep" aria-hidden="true" />

      <div className="twin-nav-cluster" role="group" aria-label="Orbit and zoom camera">
        <span className="twin-nav-tag">Orbit</span>
        <HoldButton holdKey="q" nudge="orbit-left" label="Orbit left" title="Orbit left (Q / Left-drag)" onAction={onAction}>
          ↺
        </HoldButton>
        <HoldButton holdKey="e" nudge="orbit-right" label="Orbit right" title="Orbit right (E / Left-drag)" onAction={onAction}>
          ↻
        </HoldButton>
        <HoldButton holdKey="" nudge="zoom-in" label="Zoom in" title="Zoom in (Scroll)" onAction={onAction}>
          +
        </HoldButton>
        <HoldButton holdKey="" nudge="zoom-out" label="Zoom out" title="Zoom out (Scroll)" onAction={onAction}>
          −
        </HoldButton>
      </div>

      <span className="twin-nav-sep" aria-hidden="true" />

      <button type="button" className="twin-nav-reset" onClick={onReset} aria-label="Reset view" title="Reset view to default position">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 9V4h5M20 15v5h-5M4 4l6 6M20 20l-6-6" />
        </svg>
        <span>Reset</span>
      </button>
    </div>
  );
}

const HINT_KEY = "ultron.twin.hintSeen";

/** The camera hint shows until the visitor first touches the twin (pointer, wheel or key), then stays hidden. */
export function TwinHint({ navMode, extra }: { navMode?: TwinNavMode; extra?: string }) {
  const [seen, setSeen] = useState(true);
  useEffect(() => {
    let stored = false;
    try {
      stored = window.localStorage.getItem(HINT_KEY) === "1";
    } catch {
      /* storage unavailable */
    }
    if (stored) return;
    setSeen(false);
    const done = () => {
      setSeen(true);
      try {
        window.localStorage.setItem(HINT_KEY, "1");
      } catch {
        /* storage unavailable */
      }
    };
    const opts = { once: true, passive: true } as const;
    window.addEventListener("pointerdown", done, opts);
    window.addEventListener("wheel", done, opts);
    window.addEventListener("keydown", done, opts);
    return () => {
      window.removeEventListener("pointerdown", done);
      window.removeEventListener("wheel", done);
      window.removeEventListener("keydown", done);
    };
  }, []);
  if (seen) return null;
  return (
    <div className="ph-twin-hint" aria-hidden="true">
      {twinHint(navMode, extra)}
    </div>
  );
}

export function twinHint(_navMode?: TwinNavMode, extra?: string) {
  return `Drag to orbit · Right-drag or Shift+drag to move · Two-finger pan · Scroll to zoom · WASD to walk${extra ? ` · ${extra}` : ""}`;
}
