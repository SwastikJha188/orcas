"use client";

/**
 * What the operator chose for the drawing canvas, kept per browser:
 *
 * - `useCanvasPrefs`: which readings show (all, only those in alarm, none),
 *   short or full names, the reading size, whether readings in alarm are linked
 *   to their sensors on the drawing, and parts whose readout block is hidden
 *   (their readings in alarm still show).
 * - `useSheetLayouts`: how the operator arranged each drawing: machines moved
 *   on a composed sheet (Full line, combined sheets) and readout blocks moved
 *   by hand. Reset puts a drawing back as it was.
 * - `CanvasViewMenu`: the toolbar's View button and its panel for both.
 * - `useCanvasShortcuts` + `ShortcutsPanel`: keyboard navigation of machines,
 *   drawings, readings in alarm and the canvas views, and the list of keys.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { PieceOffsets } from "@/components/assets/pyro/line-sheets/types";

export type ReadingsShown = "all" | "alerts" | "none";
export type ReadingSize = "s" | "m" | "l";

export interface CanvasPrefs {
  readings: ReadingsShown;
  names: "short" | "full";
  size: ReadingSize;
  /** Readings in alarm are tied to their sensor by a line, and the equipment around it is outlined. */
  alarmLinks: boolean;
  /** Parts (sub-assembly ids) whose readout block is hidden; their readings in alarm still show. */
  hiddenParts: string[];
}

/** On-screen size of a reading's value text (px) per size choice. */
export const READING_PX: Record<ReadingSize, number> = { s: 13, m: 16, l: 19 };

const PREFS_KEY = "ultron.operator.canvas";
const LAYOUT_KEY = "ultron.operator.layout";
const DEFAULTS: CanvasPrefs = { readings: "all", names: "short", size: "m", alarmLinks: true, hiddenParts: [] };

function readPrefs(): CanvasPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null") as Partial<CanvasPrefs> | null;
    if (!raw || typeof raw !== "object") return DEFAULTS;
    return {
      readings: raw.readings === "alerts" || raw.readings === "none" ? raw.readings : "all",
      names: raw.names === "full" ? "full" : "short",
      size: raw.size === "s" || raw.size === "l" ? raw.size : "m",
      alarmLinks: raw.alarmLinks !== false,
      hiddenParts: Array.isArray(raw.hiddenParts) ? raw.hiddenParts.filter((x): x is string => typeof x === "string") : [],
    };
  } catch {
    return DEFAULTS;
  }
}

export function useCanvasPrefs(): [CanvasPrefs, (patch: Partial<CanvasPrefs>) => void] {
  const [prefs, setPrefs] = useState<CanvasPrefs>(DEFAULTS);
  useEffect(() => setPrefs(readPrefs()), []);
  const update = useCallback((patch: Partial<CanvasPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable: the choice holds for this visit */
      }
      return next;
    });
  }, []);
  return [prefs, update];
}

/** How the operator arranged one drawing (sheet units). */
export interface SheetLayout {
  /** Machine id → offset from where the composed sheet places it. */
  pieces?: PieceOffsets;
  /** Readout block id → its top-left corner. */
  blocks?: Record<string, [number, number]>;
}

export interface SheetLayouts {
  of: (sheetId: string | null) => SheetLayout | undefined;
  movePiece: (sheetId: string, id: string, offset: [number, number]) => void;
  moveBlock: (sheetId: string, id: string, at: [number, number]) => void;
  reset: (sheetId: string) => void;
}

const isPair = (v: unknown): v is [number, number] => Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === "number" && Number.isFinite(n));

function readLayouts(): Record<string, SheetLayout> {
  try {
    const raw = JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? "{}") as Record<string, SheetLayout>;
    const out: Record<string, SheetLayout> = {};
    for (const [sheet, l] of Object.entries(raw ?? {})) {
      const pieces = Object.fromEntries(Object.entries(l?.pieces ?? {}).filter(([, v]) => isPair(v)));
      const blocks = Object.fromEntries(Object.entries(l?.blocks ?? {}).filter(([, v]) => isPair(v)));
      if (Object.keys(pieces).length || Object.keys(blocks).length) out[sheet] = { pieces, blocks };
    }
    return out;
  } catch {
    return {};
  }
}

export function useSheetLayouts(): SheetLayouts {
  const [all, setAll] = useState<Record<string, SheetLayout>>({});
  useEffect(() => setAll(readLayouts()), []);
  const write = useCallback((fn: (prev: Record<string, SheetLayout>) => Record<string, SheetLayout>) => {
    setAll((prev) => {
      const next = fn(prev);
      try {
        localStorage.setItem(LAYOUT_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);
  const snap = (n: number) => Math.round(n / 2) * 2;
  return {
    of: useCallback((sheetId: string | null) => (sheetId ? all[sheetId] : undefined), [all]),
    movePiece: useCallback(
      (sheetId: string, id: string, [dx, dy]: [number, number]) =>
        write((prev) => ({ ...prev, [sheetId]: { ...prev[sheetId], pieces: { ...prev[sheetId]?.pieces, [id]: [snap(dx), snap(dy)] } } })),
      [write],
    ),
    moveBlock: useCallback(
      (sheetId: string, id: string, [x, y]: [number, number]) =>
        write((prev) => ({ ...prev, [sheetId]: { ...prev[sheetId], blocks: { ...prev[sheetId]?.blocks, [id]: [snap(x), snap(y)] } } })),
      [write],
    ),
    reset: useCallback(
      (sheetId: string) =>
        write((prev) => {
          const next = { ...prev };
          delete next[sheetId];
          return next;
        }),
      [write],
    ),
  };
}

/* --------------------------------------------------------------------------
   Toolbar: View button and its panel
   -------------------------------------------------------------------------- */

function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<[T, string]>; onChange: (v: T) => void }) {
  return (
    <div className="opc-vm-row">
      <span className="opc-vm-label" id={`opc-vm-${label}`}>
        {label}
      </span>
      <div className="opc-vm-seg" role="radiogroup" aria-labelledby={`opc-vm-${label}`}>
        {options.map(([v, text]) => (
          <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CanvasViewMenu({
  prefs,
  onChange,
  parts,
  readingsOnSheet,
  canArrange,
  arranging,
  onArrange,
  arranged,
  onReset,
  onShowKeys,
  up,
}: {
  prefs: CanvasPrefs;
  onChange: (patch: Partial<CanvasPrefs>) => void;
  /** Parts with readings on this drawing, for hiding their blocks. */
  parts: Array<{ id: string; name: string }>;
  /** The drawing shows readings (machine sheets; not the Full line). */
  readingsOnSheet: boolean;
  canArrange: boolean;
  arranging: boolean;
  onArrange: (on: boolean) => void;
  /** This drawing has been arranged by hand. */
  arranged: boolean;
  onReset: () => void;
  onShowKeys: () => void;
  /** Open upward (full screen: the toolbar sits on the drawing's bottom edge). */
  up?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);
  const hidden = new Set(prefs.hiddenParts);
  const hiddenHere = parts.filter((p) => hidden.has(p.id)).length;
  return (
    <div className="opc-vm" ref={wrap}>
      <div className="opc-zoom-group">
        <button
          ref={button}
          type="button"
          className="opc-zoom-btn opc-vm-btn"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-keyshortcuts="R E"
          onClick={() => setOpen((o) => !o)}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" />
            <circle cx="9" cy="6" r="2" fill="var(--card-bg)" />
            <circle cx="15" cy="12" r="2" fill="var(--card-bg)" />
            <circle cx="8" cy="18" r="2" fill="var(--card-bg)" />
          </svg>
          <span className="opc-vm-btn-label">View</span>
          {readingsOnSheet && prefs.readings !== "all" && <span className="opc-vm-flag">{prefs.readings === "alerts" ? "Alerts only" : "No readings"}</span>}
        </button>
      </div>
      {open && (
        <div className="opc-vm-panel" role="dialog" aria-label="Drawing view" data-up={up || undefined}>
          {readingsOnSheet && (
            <section>
              <h3 className="opc-vm-head">Readings</h3>
              <Seg
                label="Show"
                value={prefs.readings}
                options={[
                  ["all", "All"],
                  ["alerts", "Alerts only"],
                  ["none", "None"],
                ]}
                onChange={(readings) => onChange({ readings })}
              />
              <Seg
                label="Names"
                value={prefs.names}
                options={[
                  ["short", "Short"],
                  ["full", "Full"],
                ]}
                onChange={(names) => onChange({ names })}
              />
              <Seg
                label="Size"
                value={prefs.size}
                options={[
                  ["s", "Small"],
                  ["m", "Medium"],
                  ["l", "Large"],
                ]}
                onChange={(size) => onChange({ size })}
              />
              <label className="opc-vm-check">
                <input type="checkbox" checked={prefs.alarmLinks} onChange={(e) => onChange({ alarmLinks: e.target.checked })} />
                <span>Link readings in alarm to their sensor</span>
              </label>
            </section>
          )}
          {readingsOnSheet && parts.length > 1 && prefs.readings !== "none" && (
            <section>
              <div className="opc-vm-head-row">
                <h3 className="opc-vm-head">Parts</h3>
                {hiddenHere > 0 && (
                  <button type="button" className="opc-vm-link" onClick={() => onChange({ hiddenParts: prefs.hiddenParts.filter((id) => !parts.some((p) => p.id === id)) })}>
                    Show all
                  </button>
                )}
              </div>
              <div className="opc-vm-parts">
                {parts.map((p) => (
                  <label key={p.id} className="opc-vm-check">
                    <input
                      type="checkbox"
                      checked={!hidden.has(p.id)}
                      onChange={(e) =>
                        onChange({ hiddenParts: e.target.checked ? prefs.hiddenParts.filter((id) => id !== p.id) : [...prefs.hiddenParts, p.id] })
                      }
                    />
                    <span>{p.name}</span>
                  </label>
                ))}
              </div>
              <p className="opc-vm-note">A hidden part still shows its readings in alarm.</p>
            </section>
          )}
          {canArrange && (
            <section>
              <h3 className="opc-vm-head">Layout</h3>
              <div className="opc-vm-actions">
                <button
                  type="button"
                  className="opc-vm-action"
                  aria-pressed={arranging}
                  onClick={() => {
                    onArrange(!arranging);
                    setOpen(false);
                  }}
                >
                  {arranging ? "Done arranging" : "Arrange this drawing"}
                  <kbd>E</kbd>
                </button>
                {arranged && (
                  <button type="button" className="opc-vm-action" onClick={onReset}>
                    Reset layout
                  </button>
                )}
              </div>
            </section>
          )}
          <section>
            <button
              type="button"
              className="opc-vm-action opc-vm-keys"
              onClick={() => {
                setOpen(false);
                onShowKeys();
              }}
            >
              Keyboard shortcuts
              <kbd>?</kbd>
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

/** Bar on the drawing while the operator arranges it. */
export function ArrangeBar({ machines, arranged, onReset, onDone }: { machines: boolean; arranged: boolean; onReset: () => void; onDone: () => void }) {
  return (
    <div className="opc-arrange-bar" role="status">
      <span>{machines ? "Drag a machine or a readout block to move it." : "Drag a readout block to move it."}</span>
      {arranged && (
        <button type="button" onClick={onReset}>
          Reset layout
        </button>
      )}
      <button type="button" className="opc-arrange-done" onClick={onDone}>
        Done
      </button>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Keyboard shortcuts
   -------------------------------------------------------------------------- */

export const SHORTCUTS: Array<{ group: string; keys: Array<[string[], string]> }> = [
  {
    group: "Move around",
    keys: [
      [["1", "…", "9"], "Machine tab by its place in the top bar"],
      [["[", "]"], "Previous / next machine"],
      [["←", "→"], "Previous / next drawing of the machine (its parts)"],
      [["N"], "Next reading in alarm on the drawing (Shift + N: previous)"],
      [["V"], "Switch between Operator view and 3D twin"],
    ],
  },
  {
    group: "Drawing",
    keys: [
      [["R"], "Readings: all, alerts only, none"],
      [["E"], "Arrange the drawing (Esc when done)"],
      [["A"], "Alarms panel"],
      [["M"], "Problem messages on the drawing"],
      [["+", "−", "0"], "Zoom in, out, back to normal"],
      [["F"], "Full screen"],
      [["?"], "This list"],
    ],
  },
];

export function ShortcutsPanel({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div
      ref={ref}
      className="opc-keys-panel"
      role="dialog"
      aria-label="Keyboard shortcuts"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape" || e.key === "?") {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="opc-keys-head">
        <h3>Keyboard shortcuts</h3>
        <button type="button" className="opc-al-close" aria-label="Close the shortcuts" onClick={onClose}>
          <svg width="12" height="12" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <path d="M2 2l8 8M10 2l-8 8" />
          </svg>
        </button>
      </div>
      {SHORTCUTS.map((g) => (
        <section key={g.group}>
          <h4>{g.group}</h4>
          <dl>
            {g.keys.map(([keys, what]) => (
              <div key={what} className="opc-keys-row">
                <dt>
                  {keys.map((k) => (k === "…" ? <span key={k}>…</span> : <kbd key={k}>{k}</kbd>))}
                </dt>
                <dd>{what}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

export interface ShortcutActions {
  /** 0-based tab of the top bar. */
  tab: (index: number) => void;
  machine: (delta: 1 | -1) => void;
  sheet: (delta: 1 | -1) => void;
  nextAlarm: (delta: 1 | -1) => void;
  view: () => void;
  readings: () => void;
  arrange: () => void;
  alarms: () => void;
  messages: () => void;
  fullscreen: () => void;
  zoom: (dir: 1 | -1 | 0) => void;
  help: () => void;
  /** Esc: true when it closed something of the canvas (arrange mode, the shortcuts list). */
  escape: () => boolean;
}

/**
 * Canvas keys, on the whole page while the console is shown. Ignored while typing, with Ctrl / Cmd / Alt
 * held, while a modal dialog is open, and (arrows) inside a control that uses arrow keys itself.
 */
export function useCanvasShortcuts(actions: ShortcutActions, enabled: boolean) {
  const ref = useRef(actions);
  ref.current = actions;
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("input, textarea, select, [contenteditable=''], [contenteditable='true'], [role='textbox'], [role='combobox']")) return;
      if (document.querySelector("[aria-modal='true']")) return;
      const a = ref.current;
      const k = e.key;
      let done = true;
      if (k === "Escape") done = a.escape();
      else if (/^[1-9]$/.test(k)) a.tab(Number(k) - 1);
      else if (k === "[") a.machine(-1);
      else if (k === "]") a.machine(1);
      else if (k === "ArrowLeft" || k === "ArrowRight") {
        if (t?.closest?.("[role='tablist'], [role='menu'], [role='listbox'], [role='slider'], [role='radiogroup'], [role='grid']")) return;
        a.sheet(k === "ArrowLeft" ? -1 : 1);
      } else if (k === "n" || k === "N") a.nextAlarm(e.shiftKey ? -1 : 1);
      else if (k === "v" || k === "V") a.view();
      else if (k === "r" || k === "R") a.readings();
      else if (k === "e" || k === "E") a.arrange();
      else if (k === "a" || k === "A") a.alarms();
      else if (k === "m" || k === "M") a.messages();
      else if (k === "f" || k === "F") a.fullscreen();
      else if (k === "+" || k === "=") a.zoom(1);
      else if (k === "-" || k === "_") a.zoom(-1);
      else if (k === "0") a.zoom(0);
      else if (k === "?") a.help();
      else done = false;
      if (done) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}
