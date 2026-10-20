"use client";

/**
 * Health layer of the PYR-0 line sheet in the Operator view: a status dot per
 * sub-assembly at its place on the drawing (ring = normal, filled amber / red =
 * watch / critical) with a legend, and a name-and-health chip per machine when
 * the sheet places them (`machineChips`). No sensor values: those are on each
 * machine's own sheets. Sizes scale with the sheet width.
 *
 * Clicks: a dot opens that sub-assembly; a machine chip, or anywhere else on
 * the machine's drawing (its link region, below this layer), opens the
 * machine. Hovering a dot names the sub-assembly and its health.
 */
import React, { useState } from "react";
import { HealthOutline, type OutlineTone } from "@/components/assets/pyro/line-sheets/health-outline";
import { MX, MachinePad } from "@/components/assets/machine-kit/machine-kit";
import type { LineSheetArt } from "@/components/assets/pyro/line-sheets";
import { textWidth } from "@/components/assets/pyro/line-sheets/text-width";
import type { Tone } from "@/components/assets/assets-shell-ui";

export interface LineHealthCell {
  name: string;
  /** 0–100; null while no live health. */
  health: number | null;
  tone: Tone;
}

const toneStroke = (tone: Tone, hot: boolean) => (tone === "bad" ? MX.bad : tone === "warn" ? MX.warn : hot ? "var(--dx-ink)" : MX.fine);
const toneText = (tone: Tone) => (tone === "bad" ? MX.bad : tone === "warn" ? MX.warn : "var(--dx-ink)");

/** Sizes on a 1,144.5-unit-wide line sheet; scaled to the sheet's width. */
const CHIP_FONT = 10;
const CHIP_H = 17;
const DOT_SCALE = 0.7;
const LEGEND = ["Normal", "Alert", "Critical"] as const;
/** Top left of legend row i (sheet units). */
const legendAt = (art: LineSheetArt, i: number): [number, number] => {
  const k = art.width / 1144.5;
  return [art.width - 112 * k, (14 + i * 13) * k];
};
/** Box [x, y, w, h] of the dot legend (top right, sheet units), so popups can keep clear of it. */
export function lineLegendBox(art: LineSheetArt): [number, number, number, number] {
  const k = art.width / 1144.5;
  const [lx, y0] = legendAt(art, 0);
  const y1 = legendAt(art, LEGEND.length - 1)[1];
  const w = 9 * k + Math.max(...LEGEND.map((l) => textWidth(l, CHIP_FONT * 0.85 * k, 600, 0)));
  return [lx - 7 * k, y0 - 7 * k, w + 11 * k, y1 - y0 + 14 * k];
}
/** Tone → pad status: hollow ring when healthy, filled with a halo when it needs attention. */
const statusOf = (tone: Tone) => (tone === "bad" ? "Critical" : tone === "warn" ? "Alert" : "Normal");

function activate(e: React.KeyboardEvent, fn: () => void) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fn();
  }
}

export function LineHealthLayer({
  art,
  machineOf,
  partOf,
  onSelectMachine,
  onSelectPart,
}: {
  art: LineSheetArt;
  machineOf: (machineId: string) => LineHealthCell | null;
  partOf: (machineId: string, subId: string) => LineHealthCell | null;
  onSelectMachine: (machineId: string) => void;
  onSelectPart: (machineId: string, subId: string) => void;
}) {
  const [hot, setHot] = useState<string | null>(null);
  const k = art.width / 1144.5;
  const chipFont = CHIP_FONT * k;
  const chipH = CHIP_H * k;
  const dotR = 8.5 * DOT_SCALE * k;

  const chips = Object.entries(art.machineChips ?? {}).flatMap(([id, [x, y]]) => {
    const cell = machineOf(id);
    return cell ? [{ id, x, y, cell }] : [];
  });
  const badges = Object.entries(art.parts ?? {}).flatMap(([sub, { machine, at }]) => {
    const cell = partOf(machine, sub);
    return cell ? [{ sub, machine, x: at[0], y: at[1], cell }] : [];
  });
  const hotBadge = badges.find((b) => `part:${b.sub}` === hot) ?? null;
  // Each sub-assembly's area is clickable too (not just its dot): larger areas first, so a smaller one inside wins.
  const areas = Object.entries(art.partRegions ?? {})
    .flatMap(([sub, { machine, box }]) => {
      const cell = partOf(machine, sub);
      return cell ? [{ sub, machine, box, cell }] : [];
    })
    .sort((a, b) => b.box[2] * b.box[3] - a.box[2] * a.box[3]);

  return (
    <g className="lhl">
      {areas.map(({ sub, machine, box: [x, y, w, h], cell }) => {
        const isHot = hot === `part:${sub}`;
        return (
          <g
            key={`a-${sub}`}
            className="lhl-area"
            aria-hidden="true"
            onClick={() => onSelectPart(machine, sub)}
            onPointerEnter={() => setHot(`part:${sub}`)}
            onPointerLeave={() => setHot((v) => (v === `part:${sub}` ? null : v))}
          >
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              rx={12 * k}
              fill="transparent"
              stroke={isHot ? toneFill(cell.tone) : "transparent"}
              strokeWidth={1.4 * k}
              strokeDasharray={`${5 * k} ${4 * k}`}
            />
          </g>
        );
      })}

      {/* Each machine's name tag (drawn by the tint below) opens the machine: its area is the components'. */}
      {lineMachineTags(art).map(({ id, x, y, h, font }) => {
        const cell = machineOf(id);
        if (!cell || cell.tone === "idle") return null;
        const { w } = lineMachineTagLabel(cell, font, k);
        const isHot = hot === `machine:${id}`;
        return (
          <g
            key={`t-${id}`}
            className="lhl-tag"
            role="button"
            tabIndex={0}
            aria-label={`${cell.name}: health ${cell.health === null ? "—" : `${cell.health}%`}. Open machine summary`}
            onClick={() => onSelectMachine(id)}
            onKeyDown={(e) => activate(e, () => onSelectMachine(id))}
            onPointerEnter={() => setHot(`machine:${id}`)}
            onPointerLeave={() => setHot((v) => (v === `machine:${id}` ? null : v))}
          >
            <rect x={x - 2 * k} y={y - h / 2 - 2 * k} width={w + 4 * k} height={h + 4 * k} rx={h / 2 + 2 * k} fill="transparent" stroke={isHot ? "var(--dx-ink)" : "transparent"} strokeWidth={1.3 * k} />
          </g>
        );
      })}

      {chips.map(({ id, x, y, cell }) => {
        const value = cell.health === null ? "—" : `${cell.health}%`;
        const nameW = textWidth(cell.name, chipFont, 600, 0.01);
        const valueW = textWidth(value, chipFont, 700, 0.01);
        const gap = 6 * k;
        const w = nameW + gap + valueW + 14 * k;
        const isHot = hot === `machine:${id}`;
        const left = x - (nameW + gap + valueW) / 2;
        return (
          <g
            key={id}
            className="lhl-chip"
            role="button"
            tabIndex={0}
            aria-label={`${cell.name}: health ${value}. Open machine summary`}
            onClick={() => onSelectMachine(id)}
            onKeyDown={(e) => activate(e, () => onSelectMachine(id))}
            onPointerEnter={() => setHot(`machine:${id}`)}
            onPointerLeave={() => setHot((h) => (h === `machine:${id}` ? null : h))}
          >
            <rect x={x - w / 2} y={y - chipH / 2} width={w} height={chipH} rx={chipH / 2} fill={MX.padPanel} stroke={toneStroke(cell.tone, isHot)} strokeWidth={(isHot || cell.tone !== "good" ? 1.3 : 0.9) * k} />
            <text y={y + chipFont * 0.36} fontSize={chipFont} style={{ fontVariantNumeric: "tabular-nums" }}>
              <tspan x={left} fontWeight={600} fill="var(--dx-ink)">
                {cell.name}
              </tspan>
              <tspan x={left + nameW + gap} fontWeight={700} fill={toneText(cell.tone)}>
                {value}
              </tspan>
            </text>
          </g>
        );
      })}

      {badges.map(({ sub, machine, x, y, cell }) => {
        const value = cell.health === null ? "—" : `${cell.health}%`;
        const isHot = hot === `part:${sub}`;
        return (
          <g
            key={sub}
            className="lhl-badge"
            role="button"
            tabIndex={0}
            aria-label={`${cell.name}: health ${value}. Open sub-assembly`}
            onClick={() => onSelectPart(machine, sub)}
            onKeyDown={(e) => activate(e, () => onSelectPart(machine, sub))}
            onPointerEnter={() => setHot(`part:${sub}`)}
            onPointerLeave={() => setHot((h) => (h === `part:${sub}` ? null : h))}
            onFocus={() => setHot(`part:${sub}`)}
            onBlur={() => setHot((h) => (h === `part:${sub}` ? null : h))}
          >
            {/* Generous hit area so a small dot is easy to click without reaching the machine behind it. */}
            <circle cx={x} cy={y} r={dotR * 1.6} fill="transparent" />
            {cell.health === null ? (
              <circle cx={x} cy={y} r={dotR * 0.6} fill={MX.padPanel} stroke={MX.fine} strokeWidth={1.3 * k * DOT_SCALE} />
            ) : (
              <MachinePad x={x} y={y} status={statusOf(cell.tone)} selected={isHot} scale={DOT_SCALE * k} />
            )}
          </g>
        );
      })}

      {/* Legend of the health dots, top right. */}
      {badges.length > 0 && (
        <g pointerEvents="none" aria-hidden="true">
          {LEGEND.map((label, i) => {
            const [lx, ly] = legendAt(art, i);
            return (
              <g key={label}>
                <MachinePad x={lx} y={ly} status={label} scale={DOT_SCALE * k * 0.8} />
                <text x={lx + 9 * k} y={ly + chipFont * 0.33} fontSize={chipFont * 0.85} fontWeight={600} fill="var(--dx-ink)">
                  {label}
                </text>
              </g>
            );
          })}
        </g>
      )}

      {/* Name and health of the hovered sub-assembly, drawn last so it sits above every dot. */}
      {hotBadge && (() => {
        const label = `${hotBadge.cell.name} · ${hotBadge.cell.health === null ? "—" : `${hotBadge.cell.health}%`}`;
        const w = textWidth(label, chipFont, 600, 0.01) + 12 * k;
        const y = hotBadge.y - dotR - 4 * k - chipH / 2;
        return (
          <g pointerEvents="none" aria-hidden="true">
            <rect x={hotBadge.x - w / 2} y={y - chipH / 2} width={w} height={chipH} rx={4 * k} fill="var(--dx-ink)" />
            <text x={hotBadge.x} y={y + chipFont * 0.36} textAnchor="middle" fontSize={chipFont} fontWeight={600} fill={MX.padPanel}>
              {label}
            </text>
          </g>
        );
      })()}
    </g>
  );
}

/** Tone → outline colour; no live health (idle) leaves the outline undrawn. */
const outlineTone = (tone: Tone | undefined): OutlineTone | null => (tone === "bad" ? "bad" : tone === "warn" ? "warn" : tone && tone !== "idle" ? "good" : null);
const toneFill = (tone: Tone) => (tone === "bad" ? MX.bad : tone === "warn" ? MX.warn : MX.good);

/**
 * Each machine's area (the union of its sub-assemblies' areas, plus a margin)
 * and its name-and-health tag at the area's top left, inset into the sheet.
 * Shared by the tint (draws the tag), the health layer (makes the tag the
 * machine's click target) and the alert popups (keep clear of it).
 */
export function lineMachineTags(art: LineSheetArt): Array<{ id: string; area: [number, number, number, number]; x: number; y: number; h: number; font: number }> {
  const k = art.width / 1144.5;
  const font = CHIP_FONT * 0.95 * k;
  const h = font * 1.7;
  return Object.keys(art.links ?? {}).flatMap((id) => {
    const own = Object.values(art.partRegions ?? {}).filter((r) => r.machine === id).map((r) => r.box);
    if (!own.length) return [];
    const m = 14 * k;
    const x0 = Math.min(...own.map((b) => b[0])) - m;
    const y0 = Math.min(...own.map((b) => b[1])) - m;
    const x1 = Math.max(...own.map((b) => b[0] + b[2])) + m;
    const y1 = Math.max(...own.map((b) => b[1] + b[3])) + m;
    return [{ id, area: [x0, y0, x1 - x0, y1 - y0] as [number, number, number, number], x: Math.max(4 * k, x0), y: Math.max(h * 0.5 + 3 * k, y0), h, font }];
  });
}

/** The tag's label and width (its box is [x, y − h/2, w, h]). */
export function lineMachineTagLabel(cell: LineHealthCell, font: number, k: number): { label: string; w: number } {
  const label = `${cell.name} · ${cell.health === null ? "—" : `${cell.health}%`}`;
  return { label, w: textWidth(label, font, 700, 0.01) + 14 * k };
}

/**
 * Health colours of the line drawing, under the health dots: each machine's
 * name-and-health tag, and a thin line in its health colour that follows the
 * outline of the equipment. Each stretch of outline takes the colour of the
 * smallest sub-assembly area it lies in (as for clicks), else of the smallest
 * machine area, so equipment between sub-assembly areas takes its machine's
 * colour. The drawing itself is never coloured.
 */
export function LineHealthTint({
  art,
  machineOf,
  partOf,
}: {
  art: LineSheetArt;
  machineOf: (machineId: string) => LineHealthCell | null;
  partOf: (machineId: string, subId: string) => LineHealthCell | null;
}) {
  // A machine's area: the union of its sub-assemblies' areas.
  const machines = lineMachineTags(art).flatMap((t) => {
    const cell = machineOf(t.id);
    return cell && cell.tone !== "idle" ? [{ ...t, cell, box: t.area }] : [];
  });
  const owners = [
    ...Object.entries(art.partRegions ?? {}).map(([sub, { machine, box }]) => ({ box, tone: outlineTone(partOf(machine, sub)?.tone), part: true })),
    ...machines.map(({ box, cell }) => ({ box, tone: outlineTone(cell.tone), part: false })),
  ].sort((a, b) => Number(b.part) - Number(a.part) || a.box[2] * a.box[3] - b.box[2] * b.box[3]);
  const k = art.width / 1144.5;
  return (
    <g className="lhl-tint" aria-hidden="true" pointerEvents="none">
      <HealthOutline art={art} owners={owners} />
      {/* Machine name and health, at the top left of its area (its click target is in LineHealthLayer). */}
      {machines.map(({ id, x, y, h, font, cell }) => {
        const color = toneFill(cell.tone);
        const { label, w } = lineMachineTagLabel(cell, font, k);
        return (
          <g key={id}>
            <rect x={x} y={y - h / 2} width={w} height={h} rx={h / 2} fill={MX.padPanel} stroke={color} strokeWidth={1 * k} opacity={0.95} />
            <circle cx={x + 7 * k} cy={y} r={2.6 * k} fill={color} />
            <text x={x + 12 * k} y={y + font * 0.36} fontSize={font} fontWeight={700} fill={cell.tone === "good" ? "var(--dx-ink)" : color}>
              {label}
            </text>
          </g>
        );
      })}
    </g>
  );
}
