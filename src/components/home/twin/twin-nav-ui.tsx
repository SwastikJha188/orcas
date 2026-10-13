"use client";

import React from "react";
import { PillNav } from "@/components/ui";
import "./twin-nav.css";

/* Twin camera UI (no three.js here, so pages can import it eagerly). */

/** How a left-drag moves the camera: across the floor ("move") or around the scene ("orbit"). */
export type TwinNavMode = "move" | "orbit";

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
      <button type="button" className="twin-nav-reset" onClick={onReset} aria-label="Reset view" title="Reset view">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 9V4h5M20 15v5h-5M4 4l6 6M20 20l-6-6" />
        </svg>
      </button>
    </div>
  );
}

export function twinHint(navMode: TwinNavMode, extra?: string) {
  const drag = navMode === "move" ? "Drag to move · right-drag to orbit" : "Drag to orbit · right-drag to move";
  return `${drag} · scroll to zoom · WASD to walk · Q E to turn${extra ? ` · ${extra}` : ""}`;
}
