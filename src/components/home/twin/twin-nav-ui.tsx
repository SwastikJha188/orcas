"use client";

import React, { useCallback, useEffect, useState } from "react";
import { PillNav } from "@/components/ui";
import "./twin-nav.css";

/* Twin camera UI (no three.js here, so pages can import it eagerly). */

/** How a left-drag moves the camera: across the floor ("move") or around the scene ("orbit"). */
export type TwinNavMode = "move" | "orbit";

/** Move / Orbit mode that survives reloads (read after mount so server and client markup match). */
export function usePersistedNavMode(): [TwinNavMode, (m: TwinNavMode) => void] {
  const [mode, setMode] = useState<TwinNavMode>("move");
  useEffect(() => {
    try {
      if (window.localStorage.getItem("ultron.twin.navMode") === "orbit") setMode("orbit");
    } catch {
      /* storage unavailable */
    }
  }, []);
  const update = useCallback((m: TwinNavMode) => {
    setMode(m);
    try {
      window.localStorage.setItem("ultron.twin.navMode", m);
    } catch {
      /* storage unavailable */
    }
  }, []);
  return [mode, update];
}

/** Move / Orbit switch and reset, floating bottom-right of the stage. */
export function TwinNavBar({ navMode, onNavMode, onReset }: { navMode: TwinNavMode; onNavMode: (m: TwinNavMode) => void; onReset: () => void }) {
  return (
    <div className="twin-nav" role="group" aria-label="Camera">
      <PillNav
        items={[
          { id: "move", label: "Move" },
          { id: "orbit", label: "Orbit" },
        ]}
        activeId={navMode}
        onChange={(id) => onNavMode(id as TwinNavMode)}
      />
      <button type="button" className="twin-nav-reset" onClick={onReset} aria-label="Reset view" title="Reset view to default position">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 9V4h5M20 15v5h-5M4 4l6 6M20 20l-6-6" />
        </svg>
        <span>Reset</span>
      </button>
    </div>
  );
}

const HINT_KEY = "ultron.twin.hintSeen";

/** The camera hint shows until the visitor first touches the twin (pointer, wheel or key), then stays hidden. */
export function TwinHint({ navMode, extra }: { navMode: TwinNavMode; extra?: string }) {
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

export function twinHint(navMode: TwinNavMode, extra?: string) {
  const drag = navMode === "move" ? "Drag to move · right-drag to orbit" : "Drag to orbit · right-drag to move";
  return `${drag} · scroll to zoom · WASD to walk · Q E to turn${extra ? ` · ${extra}` : ""}`;
}
