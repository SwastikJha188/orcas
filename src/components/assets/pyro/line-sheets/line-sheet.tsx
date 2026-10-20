"use client";

/**
 * One sheet of the pyro-line diagram pack (Rev01, 37 sheets), drawn with the
 * ULTRON machine kit and composed as its PDF page:
 *
 *  - detail sheet: the part with a pad and a tag chip at every point, and the
 *    "Monitoring points" panel (tag, required / optional, description,
 *    location, live value) with the sheet note;
 *  - overview (X-0): the whole group with every pad, and its parts with their
 *    points, each part opening its detail sheet;
 *  - PYR-0: the line, each machine opening its page, and the sheet index.
 *
 * Pads follow the kit: hollow ring when healthy, filled when the point needs
 * attention (live status, or data validity when the page colours by validity);
 * a thinner light ring marks an optional point, a dashed ring a manual record.
 * Points of another machine on a shared sheet read that machine's frame and
 * stay read-only here.
 */

import React, { useMemo, useState } from "react";
import { MX, MachinePad, MachineSvg } from "@/components/assets/machine-kit/machine-kit";
import { PYRO_SPEC } from "@/lib/pyro-sim/spec";
import { PYRO_MACHINE_BY_ID, PYRO_SIGNAL_BY_TAG, PYRO_SIGNALS } from "@/lib/pyro-sim/signals";
import { VPC_MACHINE_BY_ID, VPC_SIGNAL_BY_TAG, VPC_SPEC } from "@/lib/vpc-sim/signals";
import type { LiveSignal, SimFrame } from "@/lib/kiln-sim/engine";
import { useKilnFleet } from "@/providers/kiln-simulation-context";
import { LINE_SHEETS, LINE_SHEET_ART, LINE_SHEET_BY_ID, LINE_SHEET_GROUPS, lineSheetTags } from ".";
import { textWidth } from "./text-width";
import { HealthOutline, type OutlineOwner } from "./health-outline";
import type { LineSheetArt } from "./types";
import { useContentBox, type ContentBox } from "../../use-content-box";
import { displayName } from "@/lib/display-name";
import { plainWords } from "@/lib/plain-words";
import "./line-sheet.css";

export type LineSheetColorBy = "limits" | "validity";

const VALIDITY_STATUS: Record<string, string> = {
  Good: "Normal",
  Suspect: "Alert",
  Invalid: "Critical",
};
/** Pad scale on a sheet. */
const PAD_SCALE = 0.9;
const PAD_R = 5 * PAD_SCALE + 1;
const CHIP_H = 15;
const CHIP_FONT = 8.6;

const code = (machineId: string) => machineId.replace(/^PYR-/, "");

/** "FSL-01 + KFS-01 · Feed system — Overview". */
export function lineSheetHeading(id: string): string {
  const s = LINE_SHEET_BY_ID[id];
  if (!s) return id;
  if (s.kind === "line") return `Pyro line · ${s.equipment} — ${s.title}`;
  return `${s.machines.map((id) => PYRO_MACHINE_BY_ID[id]?.shortName ?? VPC_MACHINE_BY_ID[id]?.shortName ?? code(id)).join(" + ")} · ${s.equipment} — ${s.title}`;
}

/** "Detail sheet · 11 monitoring points". */
export function lineSheetCaption(id: string): string {
  const s = LINE_SHEET_BY_ID[id];
  if (!s) return "";
  if (s.kind === "line") {
    const online = PYRO_SIGNALS.filter((x) => x.origin === "online").length;
    const manual = PYRO_SIGNALS.filter((x) => x.origin === "manual").length;
    return `Line overview · ${online} live sensors + ${manual} readings typed in by hand · simplified layout, not to scale · no burner in the preheater`;
  }
  const n = lineSheetTags(id).length;
  const tagSet = s.group === "V" ? "Schultheiss VPC 066 (P1–E2, DT1)" : "tag set D4-OSW-PE-PYR Rev. 02";
  return `${s.kind === "overview" ? "System overview" : "Detail sheet"} · ${n} sensor${n === 1 ? "" : "s"} · simplified layout, not to scale · ${tagSet}`;
}

interface PointView {
  tag: string;
  own: boolean;
  owner: string;
  live: LiveSignal | undefined;
  /** Pad colour (live status or data validity). */
  padStatus: string;
  /** Value colour (always live status). */
  status: string;
  value: string;
  manual: boolean;
  optional: boolean;
  name: string;
}

function usePoints(tags: string[], machineId: string | null | undefined, frame: SimFrame | null | undefined, colorBy: LineSheetColorBy) {
  const fleet = useKilnFleet();
  return useMemo(() => {
    const out: Record<string, PointView> = {};
    const isVpcMachine = Boolean(machineId && VPC_MACHINE_BY_ID[machineId]);
    for (const tag of tags) {
      const isVpcSig = Boolean(VPC_SIGNAL_BY_TAG[tag]);
      const def = PYRO_SIGNAL_BY_TAG[tag] ?? VPC_SIGNAL_BY_TAG[tag];
      const spec = PYRO_SPEC[tag] ?? VPC_SPEC[tag];
      const own = !machineId || !def || def.machine === machineId || (isVpcSig && isVpcMachine);
      // The page's frame for its own points (every point when no machine is set); another machine reads its own frame.
      const ownerId = isVpcSig && isVpcMachine && machineId ? machineId : def?.machine;
      const src = frame && own ? frame : ownerId ? fleet[ownerId]?.frame : null;
      const live = src?.signals[tag];
      const status = live?.status ?? "Normal";
      const padStatus = colorBy === "validity" ? (live ? (VALIDITY_STATUS[live.quality] ?? "Normal") : "Normal") : status;
      const unit = def && def.unit !== "state" ? ` ${def.unit}` : "";
      out[tag] = {
        tag,
        own,
        owner: ownerId ? code(ownerId) : "",
        live,
        padStatus,
        status,
        value: live ? `${live.display}${unit}` : "—",
        manual: def?.origin === "manual",
        optional: spec?.priority === "Optional",
        name: spec?.parameter ?? def?.name ?? tag,
      };
    }
    return out;
  }, [tags, machineId, frame, fleet, colorBy]);
}

const valueTone = (status: string) => (status === "Critical" ? "bad" : status === "Alert" ? "warn" : undefined);

/** Small pad glyph for lists (same marks as the drawing). */
function PadGlyph({ p }: { p: PointView }) {
  return (
    <svg width={18} height={18} viewBox="-9 -9 18 18" aria-hidden="true" className="lsh-glyph">
      {p.manual && <circle r={8} fill="none" stroke={MX.label} strokeWidth={0.9} strokeDasharray="2.4 2" />}
      <MachinePad x={0} y={0} status={p.padStatus} scale={p.manual ? 0.8 : 1} priority={p.optional ? "optional" : "required"} />
    </svg>
  );
}

/** Hairline from the pad edge to the nearest edge of its chip. */
function leader(px: number, py: number, cx: number, cy: number, w: number): string {
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const y0 = cy - CHIP_H / 2;
  const y1 = cy + CHIP_H / 2;
  const ex = Math.min(x1, Math.max(x0, px));
  const ey = Math.min(y1, Math.max(y0, py));
  // Pad above / below the chip: leave from the top / bottom edge near the pad; beside it: from the side.
  const [tx, ty] = px >= x0 && px <= x1 ? [ex, py < y0 ? y0 : y1] : py >= y0 && py <= y1 ? [px < x0 ? x0 : x1, cy] : [ex, ey];
  const len = Math.hypot(tx - px, ty - py) || 1;
  const sx = px + ((tx - px) / len) * PAD_R;
  const sy = py + ((ty - py) / len) * PAD_R;
  return `M ${sx.toFixed(1)} ${sy.toFixed(1)} L ${tx.toFixed(1)} ${ty.toFixed(1)}`;
}

/** Note text with tags set in the tag face and sheet references ("sheet B-1", "(F-2)") opening that sheet. */
function NoteText({ text, onOpenSheet }: { text: string; onOpenSheet?: (id: string) => void }) {
  const parts = text.split(/(\b[A-Z]{3}-[A-Z]{3}-\d{2}\b|\b(?:[FPKBCH]-\d)\b)/g);
  return (
    <>
      {parts.map((t, i) => {
        if (/^[A-Z]{3}-[A-Z]{3}-\d{2}$/.test(t)) return <b key={i}>{t}</b>;
        if (/^[FPKBCH]-\d$/.test(t) && LINE_SHEET_BY_ID[t] && onOpenSheet)
          return (
            <button key={i} type="button" className="lsh-ref" onClick={() => onOpenSheet(t)}>
              {t}
            </button>
          );
        return <React.Fragment key={i}>{t}</React.Fragment>;
      })}
    </>
  );
}

/** Content box of a sheet drawing in sheet units: [x, y, w, h]. */
export type SheetBox = ContentBox;

/**
 * Line sheet (PYR-0): each machine's condition as a thin line in its colour
 * along the outline of its own equipment (green normal, amber advisory, red
 * critical); the drawing itself is never coloured. A stretch of outline belongs
 * to the smallest of the machines' areas (`shades`, else its link region) it
 * lies in; machines without a condition stay unoutlined.
 */
export function MachineHealthShade({
  art,
  toneOf,
}: {
  art: Pick<LineSheetArt, "id" | "Art" | "width" | "height" | "links" | "shades">;
  toneOf: (machineId: string) => "good" | "warn" | "bad" | "idle" | "info" | null | undefined;
}) {
  const owners = Object.entries(art.links ?? {})
    .flatMap(([id, link]) => {
      const t = toneOf(id);
      const tone = t === "bad" ? "bad" : t === "warn" ? "warn" : t === "good" || t === "info" ? "good" : null;
      return (art.shades?.[id] ?? [link]).map((box) => ({ box, tone }) as OutlineOwner);
    })
    .sort((a, b) => a.box[2] * a.box[3] - b.box[2] * b.box[3]);
  if (!owners.some((o) => o.tone)) return null;
  return <HealthOutline art={art} owners={owners} />;
}
/** Outer radius of a pad as drawn (halo of the MachinePad at PAD_SCALE). */
const PAD_OUTER = 9 * PAD_SCALE;

/** Equipment art, pads and (optionally) tag chips — the geometry `useSheetBox` measures. */
function SheetFootprint({ sheetId, chips }: { sheetId: string; chips: boolean }) {
  const art = LINE_SHEET_ART[sheetId];
  if (!art) return null;
  const Art = art.Art;
  const chipW = (tag: string) => Math.ceil(textWidth(tag, CHIP_FONT, 600, 0.02) + 12);
  return (
    <>
      <Art />
      {Object.values(art.pads).map(([x, y], i) => (
        <circle key={`p${i}`} cx={x} cy={y} r={PAD_OUTER} />
      ))}
      {chips &&
        Object.entries(art.chips ?? {}).map(([t, [x, y]]) => <rect key={t} x={x - chipW(t) / 2} y={y - CHIP_H / 2} width={chipW(t)} height={CHIP_H} />)}
    </>
  );
}

/** The tight content box of a sheet drawing (art + pads, + chips when shown); see `useContentBox`. */
export function useSheetBox(sheetId: string | null, chips: boolean): { box: SheetBox | null; measure: React.ReactNode } {
  return useContentBox(sheetId ? `sheet:v4:${sheetId}|${chips ? 1 : 0}` : null, () => (sheetId ? <SheetFootprint sheetId={sheetId} chips={chips} /> : null));
}

/** A detail sheet's note, as printed; sheet references open that sheet. */
export function LineSheetNote({ sheetId, onOpenSheet }: { sheetId: string; onOpenSheet?: (id: string) => void }) {
  const note = LINE_SHEET_BY_ID[sheetId]?.note;
  if (!note) return null;
  return (
    <div className="lsh-note">
      <h4>Note</h4>
      <p>
        <NoteText text={note} onOpenSheet={onOpenSheet} />
      </p>
    </div>
  );
}

export function LineSheet({
  sheetId,
  machineId,
  frame,
  selectedTag,
  onSelectTag,
  onOpenSheet,
  onOpenMachine,
  colorBy = "limits",
  drawingOnly = false,
  viewBox,
  chips: showChips = true,
}: {
  sheetId: string;
  /** The page's machine: its points are selectable, another machine's are read-only. */
  machineId?: string | null;
  frame?: SimFrame | null;
  selectedTag?: string | null;
  onSelectTag?: (tag: string | null) => void;
  onOpenSheet?: (id: string) => void;
  /** PYR-0: open a machine. */
  onOpenMachine?: (machineId: string) => void;
  colorBy?: LineSheetColorBy;
  /** Only the drawing (pads, chips, leaders) — the host page lists the points itself (machine Overview). */
  drawingOnly?: boolean;
  /** Exact drawing box (sheet units, from `useSheetBox`): the drawing fills its box with no margin. */
  viewBox?: SheetBox;
  /** Tag chips and their leaders (off when the host draws its own cards). */
  chips?: boolean;
}) {
  const meta = LINE_SHEET_BY_ID[sheetId];
  const art = LINE_SHEET_ART[sheetId];
  const tags = useMemo(() => lineSheetTags(sheetId), [sheetId]);
  const points = usePoints(tags, machineId, frame, colorBy);
  const fleet = useKilnFleet();
  const [hover, setHover] = useState<string | null>(null);
  if (!meta || !art) return null;
  const Art = art.Art;
  const drawn = tags.filter((t) => art.pads[t]);
  const chipAt = showChips ? art.chips : undefined;

  const select = (tag: string) => {
    const p = points[tag];
    if (!p?.own || !onSelectTag) return;
    onSelectTag(selectedTag === tag ? null : tag);
  };
  const interactive = (tag: string) => {
    const p = points[tag];
    const sel = selectedTag === tag;
    const label = `${p?.name ? plainWords(displayName(p.name)) : ""} (${tag}): ${p?.value ?? "—"}`;
    return p?.own && onSelectTag
      ? {
          role: "button",
          tabIndex: 0,
          "aria-pressed": sel,
          "aria-label": label,
          onClick: () => select(tag),
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              select(tag);
            }
          },
          onPointerEnter: () => setHover(tag),
          onPointerLeave: () => setHover((h) => (h === tag ? null : h)),
        }
      : {
          role: "img",
          "aria-label": p && !p.own ? `${label} (${p.owner}, read-only here)` : label,
          onPointerEnter: () => setHover(tag),
          onPointerLeave: () => setHover((h) => (h === tag ? null : h)),
        };
  };

  // ---------------------------------------------------------------- drawing
  const chipW = (tag: string) => Math.ceil(textWidth(tag, CHIP_FONT, 600, 0.02) + 12);
  const drawing = (
    <MachineSvg
      viewBox={viewBox ? viewBox.map((v) => +v.toFixed(1)).join(" ") : `0 0 ${art.width} ${art.height}`}
      label={`${sheetId} — ${lineSheetHeading(sheetId)}`}
      interactive
      cadFrame={false}
      autoFit={!viewBox}
    >
      <g aria-hidden="true">
        <Art />
      </g>
      {meta.kind === "line" && (
        <MachineHealthShade
          art={art}
          toneOf={(id) => {
            const cond = fleet[id]?.frame?.condition;
            return cond === "Critical" ? "bad" : cond === "Alert" ? "warn" : cond ? "good" : null;
          }}
        />
      )}
      {meta.kind === "line" && art.links && (
        <g>
          {Object.entries(art.links).map(([id, [x, y, w, h]]) => {
            const m = PYRO_MACHINE_BY_ID[id];
            const cond = fleet[id]?.frame?.condition;
            const tone = cond === "Critical" ? MX.bad : cond === "Alert" ? MX.warn : MX.good;
            const online = PYRO_SIGNALS.filter((s) => s.machine === id && s.origin === "online").length;
            const manual = PYRO_SIGNALS.filter((s) => s.machine === id && s.origin === "manual").length;
            const n = manual ? `${online} + ${manual}` : `${online}`;
            const open = () => onOpenMachine?.(id);
            // Machine name; its D4 unit codes ("FSL-01 + KFS-01") stay in the tooltip.
            const units = m?.units?.join(" + ") ?? code(id);
            const label = m?.shortName ?? m?.name ?? units;
            return (
              <g
                key={id}
                className="lsh-link"
                role={onOpenMachine ? "link" : "img"}
                tabIndex={onOpenMachine ? 0 : undefined}
                aria-label={`${m?.name ?? label} · ${n} points${cond ? ` · ${cond === "Healthy" ? "healthy" : cond.toLowerCase()}` : ""}`}
                onClick={open}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    open();
                  }
                }}
              >
                <title>{`${units} · ${m?.name ?? ""}`}</title>
                <rect x={x} y={y} width={w} height={h} rx={10} fill="transparent" stroke="transparent" className="lsh-link-hit" />
                <circle cx={x + w / 2 - textWidth(`${label} · ${n}`, 9, 600, 0.06) / 2 - 8} cy={y + h + 12} r={3.2} fill={tone} />
                <text x={x + w / 2 + 2} y={y + h + 15.5} textAnchor="middle" fontSize={9} fontWeight={600} letterSpacing="0.06em" fill="var(--dx-ink)">
                  {label} · {n}
                </text>
              </g>
            );
          })}
        </g>
      )}
      {chipAt && (
        <g aria-hidden="true">
          {drawn.map((t) => {
            const c = chipAt[t];
            if (!c) return null;
            const [px, py] = art.pads[t];
            const hot = selectedTag === t || hover === t;
            return <path key={t} d={leader(px, py, c[0], c[1], chipW(t))} stroke={hot ? "var(--dx-ink)" : MX.label} strokeWidth={hot ? 1.1 : 0.8} opacity={hot ? 0.9 : 0.55} fill="none" />;
          })}
        </g>
      )}
      {drawn.map((t) => {
        const p = points[t];
        const [px, py] = art.pads[t];
        const c = chipAt?.[t];
        const sel = selectedTag === t;
        const hot = sel || hover === t;
        const w = chipW(t);
        return (
          <g key={t} {...interactive(t)} className="lsh-point" opacity={p.own ? undefined : 0.55}>
            <title>{`${t} · ${p.name} · ${p.value}${p.own ? "" : ` · ${p.owner}`}`}</title>
            {c && (
              <g>
                <rect
                  x={c[0] - w / 2}
                  y={c[1] - CHIP_H / 2}
                  width={w}
                  height={CHIP_H}
                  rx={4}
                  fill={MX.padPanel}
                  stroke={hot ? "var(--dx-ink)" : MX.fine}
                  strokeWidth={hot ? 1.1 : 0.9}
                  strokeDasharray={p.manual ? "3 2.5" : undefined}
                />
                <text x={c[0]} y={c[1] + 3.1} textAnchor="middle" fontSize={CHIP_FONT} fontWeight={600} letterSpacing="0.02em" fill="var(--dx-ink)">
                  {t}
                </text>
              </g>
            )}
            <g transform={`translate(${px} ${py})`} data-pad={t}>
              <circle r={PAD_R + 5} fill="transparent" />
              {p.manual && <circle r={11.5 * PAD_SCALE * 0.9} fill="none" stroke={MX.label} strokeWidth={1.1} strokeDasharray="3 2.5" />}
              <MachinePad x={0} y={0} status={p.padStatus} selected={hot} scale={PAD_SCALE} priority={p.optional ? "optional" : "required"} />
            </g>
          </g>
        );
      })}
    </MachineSvg>
  );

  if (drawingOnly) return drawing;

  // ---------------------------------------------------------------- detail
  if (meta.kind === "detail") {
    return (
      <div className="lsh-host">
        <div className="lsh lsh-detail">
          <div className="lsh-draw mx-canvas">{drawing}</div>
          <aside className="lsh-panel" aria-label={`${sheetId} sensors`}>
            <h3 className="lsh-panel-title">Sensors on this drawing · {tags.length}</h3>
            <ul className="lsh-points">
              {(meta.points ?? []).map((pt) => {
                const p = points[pt.tag];
                if (!p) return null;
                return (
                  <li
                    key={pt.tag}
                    {...interactive(pt.tag)}
                    className="lsh-row"
                    data-selected={selectedTag === pt.tag || undefined}
                    data-hot={hover === pt.tag || undefined}
                    data-other={p.own ? undefined : ""}
                    title={`${pt.tag} · ${p.name}`}
                  >
                    <PadGlyph p={p} />
                    <span className="lsh-row-main">
                      <span className="lsh-row-head">
                        <span className="lsh-tag">{plainWords(displayName(p.name))}</span>
                        <span className="lsh-req">{p.manual ? "Typed in by hand" : p.optional ? "Nice to have" : "Must have"}</span>
                      </span>
                      <span className="lsh-desc">{plainWords(pt.text)}</span>
                      {pt.location && <span className="lsh-loc">{plainWords(pt.location)}</span>}
                    </span>
                    <span className="lsh-val" data-tone={valueTone(p.status)}>
                      {p.value}
                    </span>
                  </li>
                );
              })}
            </ul>
            {meta.note && (
              <div className="lsh-note">
                <h4>Note</h4>
                <p>
                  <NoteText text={meta.note} onOpenSheet={onOpenSheet} />
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- overview
  if (meta.kind === "overview") {
    return (
      <div className="lsh-host">
        <div className="lsh lsh-overview">
          <div className="lsh-draw mx-canvas">{drawing}</div>
          <section className="lsh-parts" aria-label={`${sheetId} parts and sensors`}>
            <h3 className="lsh-panel-title">Parts and sensors · {tags.length}</h3>
            <div className="lsh-parts-grid">
              {(meta.parts ?? []).map((id) => {
                const part = LINE_SHEET_BY_ID[id];
                if (!part) return null;
                return (
                  <div key={id} className="lsh-part">
                    <button type="button" className="lsh-part-head" onClick={() => onOpenSheet?.(id)} disabled={!onOpenSheet} title={`Open ${id} · ${part.title}`}>
                      <span className="lsh-part-id">{id}</span>
                      <span className="lsh-part-title">{part.title}</span>
                      <span aria-hidden="true" className="lsh-part-go">
                        ›
                      </span>
                    </button>
                    <ul className="lsh-part-tags">
                      {(part.points ?? []).map((pt) => {
                        const p = points[pt.tag];
                        if (!p) return null;
                        return (
                          <li
                            key={pt.tag}
                            {...interactive(pt.tag)}
                            className="lsh-chiprow"
                            data-selected={selectedTag === pt.tag || undefined}
                            data-hot={hover === pt.tag || undefined}
                            data-other={p.own ? undefined : ""}
                            title={`${pt.tag} · ${p.name} · ${pt.text}`}
                          >
                            <PadGlyph p={p} />
                            <span className="lsh-tag">{plainWords(displayName(p.name))}</span>
                            <span className="lsh-val" data-tone={valueTone(p.status)}>
                              {p.value}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- line (PYR-0)
  const groups = (["F", "P", "K", "B", "C", "H"] as const).map((g) => ({
    g,
    sheets: LINE_SHEETS.filter((s) => s.group === g),
  }));
  return (
    <div className="lsh-host">
      <div className="lsh lsh-line">
        <div className="lsh-draw mx-canvas">{drawing}</div>
        <section className="lsh-parts" aria-label="All drawings">
          <h3 className="lsh-panel-title">All drawings · {LINE_SHEETS.length}</h3>
          <div className="lsh-parts-grid lsh-index">
            {groups.map(({ g, sheets }) => (
              <div key={g} className="lsh-part">
                <h4 className="lsh-index-group">{LINE_SHEET_GROUPS[g]}</h4>
                <ul className="lsh-index-list">
                  {sheets.map((s) => (
                    <li key={s.id}>
                      <button type="button" className="lsh-index-item" onClick={() => onOpenSheet?.(s.id)} disabled={!onOpenSheet}>
                        <span className="lsh-part-id">{s.id}</span>
                        <span>{s.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
