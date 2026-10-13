"use client";

import React from "react";
import type { CabinetChannel, CabinetModule, SensorTypeCode } from "./rack-data";

/* ------------------------------------------------------------------
   Module model helpers — shared by the chassis elevation, the module
   inspector and the channel table.
   ------------------------------------------------------------------ */

export type SlotState = "ok" | "warn" | "bad" | "empty";

export const STATE_COLOR: Record<SlotState, string> = {
  ok: "var(--status-success)",
  warn: "var(--status-warning)",
  bad: "var(--status-danger)",
  empty: "var(--dx-stroke)",
};

/** 19" sub-rack: 84 HP usable width, 3U height. */
export const RACK_HP = 84;
export const PSU_HP = 8;
export const CPU_HP = 4;
export const SLOT_HP = 6;

export function channelState(ch: CabinetChannel): SlotState {
  if (ch.status === "Critical") return "bad";
  if (ch.status === "Advisory" || !ch.ledOk) return "warn";
  return "ok";
}

export function worstState(states: SlotState[]): SlotState {
  if (states.includes("bad")) return "bad";
  if (states.includes("warn")) return "warn";
  return states.length ? "ok" : "empty";
}

export function moduleState(m: CabinetModule | undefined): SlotState {
  return m ? worstState(m.channels.map(channelState)) : "empty";
}

export function stateSeverity(s: SlotState): "Normal" | "Advisory" | "Critical" {
  return s === "bad" ? "Critical" : s === "warn" ? "Advisory" : "Normal";
}

/** "25.6 kS/s waveform…" → "25.6 kS/s"; "10 s (PLC / DCS…)" → "10 s"; unconfigured → "—". */
export function parseRate(raw: string | undefined): string {
  const text = raw ?? "";
  const rate = text.match(/[\d.,]+\s*(?:[kMG])?(?:S\/s|Hz)/);
  if (rate) return rate[0].replace(/\s+/, " ");
  const period = text.match(/\d+(?:[.,]\d+)?(?:\s*[–-]\s*\d+)?\s*(?:ms|s|min)\b/);
  return period ? period[0].replace(/\s+/g, " ") : "—";
}

/** Short face label of a module type. */
export function typeLabel(t: SensorTypeCode): string {
  return t === "PRESS" ? "PRS" : t;
}

/* ------------------------------------------------------------------
   Monoline module glyphs (24×24, stroke = currentColor)
   ------------------------------------------------------------------ */

export function ModuleGlyph({ type, empty = false }: { type: SensorTypeCode; empty?: boolean }) {
  if (empty) return <rect x="4" y="4" width="16" height="16" rx="3" strokeDasharray="3 3" />;
  switch (type) {
    case "VIB":
      return <path d="M2 12h3l3-7 4 14 3-9 2 2h5" />;
    case "RTD":
    case "TMP":
      return <path d="M14 14.8V4.5a2.5 2.5 0 0 0-5 0v10.3a4.5 4.5 0 1 0 5 0z" />;
    case "SPD":
      return (
        <>
          <path d="M4 17a8 8 0 1 1 16 0" />
          <path d="M12 17l4-5" />
        </>
      );
    case "UVI":
      return (
        <>
          <path d="M12 6L6 18M12 6l6 12" />
          <circle cx="12" cy="6" r="1.6" />
        </>
      );
    case "PRESS":
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 12l4-4" />
        </>
      );
    case "GAS":
      return <path d="M12 3c-3 4-6 7.5-6 11.5a6 6 0 0 0 12 0C18 10.5 15 7 12 3z" />;
    case "POS":
      return <path d="M3 12h18M6 9l-3 3 3 3M18 9l3 3-3 3" />;
    case "CAL":
      return <path d="M12 4l9 16H3z" />;
    case "FLO":
      return <path d="M3 8h13M3 12h18M3 16h11" />;
    case "OPT":
      return (
        <>
          <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z" />
          <circle cx="12" cy="12" r="2.5" />
        </>
      );
    case "STS":
    default:
      return (
        <>
          <circle cx="5" cy="14" r="2" />
          <circle cx="19" cy="14" r="2" />
          <path d="M7 14l10-6" />
        </>
      );
  }
}

/* ------------------------------------------------------------------
   Channel connector grid: every channel the card carries, mapped ones
   ringed in their state colour. Columns grow with the channel count so
   an 18-channel RTD card fits the 6 HP face without dropping any.
   ------------------------------------------------------------------ */

export function channelGrid(capacity: number, width: number, height: number) {
  const n = Math.max(1, capacity);
  const cols = n <= 6 ? 1 : n <= 12 ? 2 : n <= 24 ? 3 : 4;
  const rows = Math.ceil(n / cols);
  const pitchX = width / cols;
  const pitchY = Math.min(22, height / rows);
  const r = Math.max(2.4, Math.min(7, pitchX / 2 - 2.5, pitchY / 2 - 1.5));
  return { cols, rows, pitchX, pitchY, r };
}

/* ------------------------------------------------------------------
   One 6 HP Eurocard module (or an empty position), in chassis coordinates.
   ------------------------------------------------------------------ */

export interface EurocardModuleProps {
  module?: CabinetModule;
  position: number;
  x: number;
  y: number;
  w: number;
  h: number;
  isSelected: boolean;
  /** Channel highlighted in the table / inspector. */
  selectedChannel?: string | null;
  onSelect: (position: number) => void;
}

export function EurocardModule({ module: m, position, x, y, w, h, isSelected, selectedChannel, onSelect }: EurocardModuleProps) {
  const state = moduleState(m);
  const cx = x + w / 2;
  const inset = 1; // 2px surface gap between neighbouring modules
  const mx = x + inset;
  const mw = w - inset * 2;
  const pos = String(position).padStart(2, "0");
  const label = m
    ? `Position ${pos}, card ${m.code}${m.model ? ` ${m.model}` : ""}${m.cardType ? `, ${m.cardType}` : ""}, ${m.channels.length} of ${m.capacity} channels mapped, ${stateSeverity(state)}`
    : `Position ${pos}, empty`;

  const gridTop = y + 96;
  const gridH = h - 96 - 28;
  const ids = m ? channelIds(m) : [];
  const g = channelGrid(ids.length, mw - 8, gridH);
  const byChannel = new Map((m?.channels ?? []).map((c) => [c.channel, c]));

  return (
    <g
      className={`rack-slot ${isSelected ? "is-selected" : ""} ${m ? "" : "is-empty"}`}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={label}
      onClick={() => onSelect(position)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(position);
        }
      }}
    >
      <title>{label}</title>
      {/* Hit target spans the full slot pitch */}
      <rect className="rack-slot-hit" x={x} y={y - 18} width={w} height={h + 18} />
      <rect className="rack-slot-focus" x={mx - 2} y={y - 2} width={mw + 4} height={h + 4} rx={6} />

      {m ? (
        <>
          <rect className="rack-mod-frame" x={mx} y={y} width={mw} height={h} rx={4} />
          {/* Ejector handles */}
          <rect className="rack-mod-line" x={cx - 11} y={y + 5} width={22} height={7} rx={3.5} />
          <rect className="rack-mod-line" x={cx - 11} y={y + h - 12} width={22} height={7} rx={3.5} />
          {/* State LED strip */}
          <rect x={mx + 9} y={y + 20} width={mw - 18} height={4} rx={2} style={{ fill: STATE_COLOR[state] }} />
          {/* Type glyph */}
          <svg x={cx - 10} y={y + 34} width={20} height={20} viewBox="0 0 24 24" className="rack-mod-glyph" aria-hidden="true">
            <ModuleGlyph type={m.sensorType} />
          </svg>
          <text className="rack-mod-type" x={cx} y={y + 70} textAnchor="middle">
            {typeLabel(m.sensorType)}
          </text>
          <text className="rack-mod-temp" x={cx} y={y + 85} textAnchor="middle">
            {m.channels.length}/{m.capacity} ch
          </text>
          {/* Channel connectors */}
          {ids.map((id, i) => {
            const col = Math.floor(i / g.rows);
            const row = i % g.rows;
            const ccx = mx + 4 + g.pitchX * (col + 0.5);
            const ccy = gridTop + g.pitchY * (row + 0.5);
            const ch = byChannel.get(id);
            const st = ch ? channelState(ch) : null;
            const sel = ch && selectedChannel === ch.channel;
            return (
              <g key={id}>
                <circle
                  className="rack-mod-conn"
                  cx={ccx}
                  cy={ccy}
                  r={g.r}
                  style={st ? { stroke: STATE_COLOR[st], strokeWidth: sel ? 2.4 : 1.4 } : undefined}
                />
                <circle className="rack-mod-pin" cx={ccx} cy={ccy} r={Math.min(2, g.r / 2.5)} style={st ? { fill: STATE_COLOR[st] } : undefined} />
              </g>
            );
          })}
        </>
      ) : (
        <rect className="rack-mod-empty" x={mx + 3} y={y + 3} width={mw - 6} height={h - 6} rx={4} />
      )}
    </g>
  );
}

/**
 * Connector ids of a module: 1…capacity when channels are numbered, then any
 * mapped channel with another id, so nothing mapped is ever left off the face.
 */
export function channelIds(m: CabinetModule): string[] {
  const ids = Array.from({ length: m.capacity }, (_, i) => String(i + 1));
  const known = new Set(ids);
  for (const c of m.channels) if (!known.has(c.channel)) ids.push(c.channel);
  return ids;
}
