"use client";

/**
 * ULTRON machine diagram sheet (D4-OSW-PE-PYR §5, diagrams D01–D11): the
 * machine drawing cropped to one sheet with a callout — tag and plain
 * description, worded as on the PDF page — at every measurement point,
 * linked to its live reading. A shared sheet (D01 FSL-01 + KFS-01, D11
 * HMR-01 + CSL-01) shows every point on it; the other machine's callouts are
 * dimmed and read that machine's live frame.
 *
 * Callout bar per the D4 legend (Table 4.4), drawn neutral because ULTRON
 * reserves colour for status: D4 green → solid bar (required), D4 slate →
 * light bar and thin light pad ring (retained optional), D4 purple dashed →
 * dashed bar, box and pad ring (manual record). Pad colour is live status, or
 * data validity when the Sensors page colours by validity. A sheet that
 * carries callout anchors places each box next to its feature as on the PDF
 * page; otherwise the callouts stack in two columns beside the art.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { MX, MachinePad, MachineSvg } from "@/components/assets/machine-kit/machine-kit";
import { PYRO_SPEC } from "@/lib/pyro-sim/spec";
import { PYRO_SIGNALS, type PyroSignalDef } from "@/lib/pyro-sim/signals";
import type { SimFrame } from "@/lib/kiln-sim/engine";
import { useKilnFleet } from "@/providers/kiln-simulation-context";
import { pyroDrawingForMachine } from "./pyro-drawings";
import { PYRO_SHEETS } from "./sheets";
import { SHEET_CALLOUT, SHEET_TAG_LABEL } from "./sheets/callouts";

/** Diagram each manual record appears on (D4 Table 6.4 / Figures 5.4.1, 5.4.4). */
const MANUAL_SHEET: Record<string, string> = { "LAB-KLN-01": "D04", "MAN-KLN-01": "D07" };

/** Sheet titles with the PDF scope notes ("no calciner firing", "single burner", "hot zone"). */
export const SHEET_TITLES: Record<string, string> = {
  D01: "Feed silo and kiln feed system",
  D02: "Six-stage preheater tower (no calciner firing)",
  D03: "Preheater exit, gas analysis and ID fan",
  D04: "Rotary kiln main drive, gearbox lubrication and auxiliary drive",
  D05: "Pinion, girth gear and spray lubrication",
  D06: "Support stations, tyres and thrust",
  D07: "Kiln shell, inlet and outlet",
  D08: "Main kiln burner, combustion air and coal firing (single burner)",
  D09: "Grate cooler — compartments and cooling fans 1–3 (hot zone)",
  D10: "Grate cooler — compartments 4–6, grate drive, discharge and vent",
  D11: "Clinker hammer crusher, pan conveyor and clinker silo",
};

/** D4 figure number of each sheet (§5). */
export const SHEET_FIGURES: Record<string, string> = {
  D01: "5.1.1",
  D02: "5.3.1",
  D03: "5.3.2",
  D04: "5.4.1",
  D05: "5.4.2",
  D06: "5.4.3",
  D07: "5.4.4",
  D08: "5.5.1",
  D09: "5.6.1",
  D10: "5.6.2",
  D11: "5.7.1",
};

const onSheet = (s: PyroSignalDef, sheet: string) => (s.origin === "manual" ? MANUAL_SHEET[s.tag] === sheet : s.origin === "online" && PYRO_SPEC[s.tag]?.diagram === sheet);

/** Every point drawn on a sheet, whichever machine owns it (D01 and D11 carry two machines). */
export function allSheetTags(sheet: string): string[] {
  return PYRO_SIGNALS.filter((s) => onSheet(s, sheet)).map((s) => s.tag);
}

/** The points of one machine on a sheet. */
export function sheetTags(machineId: string, sheet: string): string[] {
  return PYRO_SIGNALS.filter((s) => s.machine === machineId && onSheet(s, sheet)).map((s) => s.tag);
}

/** Machines on a sheet with their point counts, in schedule order ("FSL-01" → 5, "KFS-01" → 12). */
export function sheetMachines(sheet: string): Array<{ machineId: string; code: string; count: number }> {
  const out: Array<{ machineId: string; code: string; count: number }> = [];
  for (const s of PYRO_SIGNALS) {
    if (!onSheet(s, sheet)) continue;
    const row = out.find((m) => m.machineId === s.machine);
    if (row) row.count += 1;
    else out.push({ machineId: s.machine, code: s.machine.replace(/^PYR-/, ""), count: 1 });
  }
  return out;
}

/** Sheet heading as on the PDF page: "PHC-01 • Six-stage preheater tower (no calciner firing)". */
export function sheetHeading(sheet: string): string {
  const codes = sheetMachines(sheet).map((m) => m.code);
  return `${codes.join(" + ")} • ${SHEET_TITLES[sheet] ?? ""}`;
}

/** Figure caption: D4 figure number, callout count (per machine on a shared sheet) and the D4 status note. */
export function sheetCaption(machineId: string, sheet: string): string {
  const machines = sheetMachines(sheet);
  const total = machines.reduce((n, m) => n + m.count, 0);
  const split = machines.length > 1 ? ` (${machines.map((m) => `${m.code} ${m.count}`).join(" · ")}; ${machines.filter((m) => m.machineId !== machineId).map((m) => m.code).join(", ")} dimmed)` : "";
  const fig = SHEET_FIGURES[sheet] ? `Figure ${SHEET_FIGURES[sheet]} · ` : "";
  return `${fig}${total} callouts${split} · D4-OSW-PE-PYR Rev. 02, proposed, not approved · schematic sensor locations, not to scale; final mounting follows the installed machine`;
}

const W = 1400;
const COL_W = 262;
const GUT = 26;
/** Box height for a one-line description; each further line adds LINE_H. */
const BOX_H = 50;
const LINE_H = 14;
const GAP = 8;
const ART_X = COL_W + GUT;
const ART_W = W - 2 * (COL_W + GUT);
/** Container width below which the callouts become a list under the drawing. */
const NARROW_PX = 700;
/** Default width of a box placed on the drawing (viewBox units); padding inside a box (bar + text insets). */
const ANCHOR_W = 150;
const BOX_PAD = 28;
/** Canvas margin around the art and boxes of a sheet with placed callouts. */
const MARGIN = 10;
/** Pad radius on the sheet (MachinePad r 5 + ring at scale 1.25), where a leader starts. */
const PAD_R = 7.5;

/** Word-wrap a description (11.5-unit Inter) onto lines no wider than `width`. */
function wrap(text: string, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && textWidth(next, 11.5) > width) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

/** Inter advance widths (em × 100, weight 400): a–z, A–Z and common symbols; figures are tabular (tnum is on globally). */
const ADV_LOWER = [56, 61, 57, 61, 58, 37, 61, 59, 24, 24, 55, 24, 88, 59, 60, 61, 61, 38, 53, 33, 59, 56, 82, 55, 56, 55];
const ADV_UPPER = [69, 65, 73, 72, 60, 59, 75, 74, 27, 57, 67, 56, 90, 75, 76, 64, 76, 64, 64, 65, 74, 69, 98, 68, 68, 63];
const ADV_OTHER: Record<string, number> = { " ": 28, ".": 27, ",": 27, ":": 27, "·": 29, "-": 46, "/": 36, "°": 46, "%": 98, "(": 37, ")": 37, "+": 66, "—": 100, "–": 70, "³": 45, "²": 44, "₂": 44, "×": 60 };

/** Width of a string set in Inter at `size` (viewBox units), so boxes and wraps fit the product font. */
function textWidth(text: string, size: number, weight = 400): number {
  let em = 0;
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    if (c >= 97 && c <= 122) em += ADV_LOWER[c - 97];
    else if (c >= 65 && c <= 90) em += ADV_UPPER[c - 65];
    else if (c >= 48 && c <= 57) em += 65;
    else em += ADV_OTHER[ch] ?? 62;
  }
  return (em / 100) * size * (weight >= 600 ? 1.026 : weight >= 500 ? 1.013 : 1);
}

/** The widest value a point is expected to show: its longest state, or 1.5 × nominal with its decimals and unit. */
function valueSample(def: PyroSignalDef | undefined): string {
  if (!def) return "—";
  if (def.type === "state") return [def.states?.normal ?? "", ...(def.states?.warn ?? []), ...(def.states?.alarm ?? [])].reduce((a, b) => (b.length > a.length ? b : a), "OFF");
  const n = (Math.abs(def.base) * 1.5).toFixed(def.decimals);
  const [int, frac] = n.split(".");
  return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${frac !== undefined ? `.${frac}` : ""}${def.unit ? ` ${def.unit}` : ""}`;
}

interface Callout {
  tag: string;
  /** Tag line (the D4 entry: "STS-KLN-08 / CAL-KLN-03" for the shell scanner). */
  label: string;
  side: "L" | "R" | "A";
  /** Pad centre, viewBox units. */
  px: number;
  py: number;
  /** Box, viewBox units. */
  x: number;
  y: number;
  w: number;
  h: number;
  lines: string[];
  /** Narrow placed box: the value takes its own line under the tag instead of sharing the tag line. */
  compact?: boolean;
}

/** Stack callouts beside their pads without overlap (push down, then pull back up inside the sheet). */
function stack(items: Callout[], height: number): void {
  items.sort((a, b) => a.py - b.py);
  let next = 0;
  for (const c of items) {
    c.y = Math.max(next, c.py - c.h / 2);
    next = c.y + c.h + GAP;
  }
  let limit = height;
  for (let i = items.length - 1; i >= 0; i--) {
    items[i].y = Math.min(items[i].y, limit - items[i].h);
    limit = items[i].y - GAP;
  }
}

const columnHeight = (items: Callout[]) => items.reduce((n, c) => n + c.h + GAP, GAP);

/** Leader from the pad to its box: a column callout bends once; a placed box takes a straight hairline to its nearest edge. */
function leaderPoints(c: Callout): string {
  if (c.side !== "A") {
    const ex = c.side === "L" ? COL_W : W - COL_W;
    return `${c.px},${c.py} ${c.side === "L" ? c.px - 14 : c.px + 14},${c.py} ${ex},${c.y + c.h / 2}`;
  }
  // A pad beside the box takes the leader from that side; a pad above or below it, from the top or bottom edge.
  const beside = c.px < c.x || c.px > c.x + c.w;
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const [ex, ey] = beside ? [c.px < c.x ? c.x : c.x + c.w, clamp(c.py, c.y + 10, c.y + c.h - 10)] : [clamp(c.px, c.x + 12, c.x + c.w - 12), c.py < c.y ? c.y : c.y + c.h];
  const len = Math.hypot(ex - c.px, ey - c.py) || 1;
  const sx = c.px + ((ex - c.px) / len) * PAD_R;
  const sy = c.py + ((ey - c.py) / len) * PAD_R;
  return `${+sx.toFixed(1)},${+sy.toFixed(1)} ${+ex.toFixed(1)},${+ey.toFixed(1)}`;
}

/** Pad colouring: live status (limits and rules) or data validity (Good → normal, Suspect → advisory, Invalid → critical). */
export type SheetColorBy = "limits" | "validity";
const VALIDITY_STATUS: Record<string, string> = { Good: "Normal", Suspect: "Advisory", Invalid: "Critical" };

export function PyroSheet({
  machineId,
  sheet,
  frame,
  selectedTag,
  onSelectTag,
  colorBy = "limits",
}: {
  machineId: string;
  sheet: string;
  frame: SimFrame | null;
  selectedTag?: string | null;
  onSelectTag?: (tag: string | null) => void;
  /** "validity": pads coloured by data validity, as the Sensors map's "Data validity" mode (values keep live status). */
  colorBy?: SheetColorBy;
}) {
  const fleet = useKilnFleet();
  // Below ~700 px the 1400-unit sheet makes 13-unit text unreadable: switch to drawing + list.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => setNarrow(entry.contentRect.width < NARROW_PX));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // The dedicated sheet drawing (composed like its PDF page); the machine drawing is the fallback.
  const sheetArt = PYRO_SHEETS[sheet];
  const machineArt = pyroDrawingForMachine(machineId);
  const drawing = useMemo(
    () => (sheetArt ? { width: sheetArt.width, height: sheetArt.height, Art: sheetArt.Art, pads: sheetArt.pads, callouts: sheetArt.callouts } : machineArt ? { ...machineArt, callouts: undefined } : null),
    [sheetArt, machineArt],
  );
  // A dedicated sheet shows all its points; the machine-drawing fallback only has this machine's pads.
  const tags = useMemo(() => (sheetArt ? allSheetTags(sheet) : sheetTags(machineId, sheet)), [sheetArt, machineId, sheet]);

  const layout = useMemo(() => {
    if (!drawing) return null;
    const drawn = tags.filter((t) => drawing.pads[t]);
    if (!drawn.length) return null;
    const text = (t: string) => SHEET_CALLOUT[t] ?? PYRO_SPEC[t]?.parameter ?? PYRO_SIGNALS.find((s) => s.tag === t)?.name ?? "";
    const label = (t: string) => SHEET_TAG_LABEL[t] ?? t;
    const anchors = drawing.callouts;

    // Placed callouts (as on the PDF page): every box at its anchor, the art scaled to fill the canvas width.
    if (anchors && drawn.every((t) => anchors[t])) {
      // A placed box keeps its anchor width unless the tag or value needs more. One too narrow for tag and value on one
      // line goes compact like the PDF's narrow boxes: tag, then the live value, then the description.
      const fit = (t: string, k: number) => {
        const tagW = textWidth(label(t), 13, 600);
        const valW = textWidth(valueSample(PYRO_SIGNALS.find((s) => s.tag === t)), 12.5, 500);
        const aw = anchors[t][2];
        const want = aw ? aw * k : ANCHOR_W;
        const compact = want < BOX_PAD + tagW + 12 + valW;
        return { compact, w: Math.ceil(Math.max(want, BOX_PAD + (compact ? Math.max(tagW, valW) : tagW + 12 + valW))) };
      };
      const boxW = (t: string, k: number) => fit(t, k).w;
      // The boxes' drawing-unit width depends on the scale: settle it in a few passes.
      let k = (W - 2 * MARGIN) / drawing.width;
      let x0 = 0;
      for (let pass = 0; pass < 6; pass++) {
        x0 = Math.min(0, ...drawn.map((t) => anchors[t][0]));
        const x1 = Math.max(drawing.width, ...drawn.map((t) => anchors[t][0] + boxW(t, k) / k));
        const next = (W - 2 * MARGIN) / (x1 - x0);
        if (Math.abs(next - k) < 1e-5) break;
        k = next;
      }
      const callouts: Callout[] = drawn.map((t) => {
        const { w, compact } = fit(t, k);
        const lines = wrap(text(t), w - BOX_PAD);
        return { tag: t, label: label(t), side: "A", px: 0, py: 0, x: 0, y: 0, w, h: BOX_H + (lines.length - 1) * LINE_H + (compact ? LINE_H + 2 : 0), lines, compact };
      });
      const y0 = Math.min(0, ...callouts.map((c) => anchors[c.tag][1]));
      const y1 = Math.max(drawing.height, ...callouts.map((c) => anchors[c.tag][1] + c.h / k));
      const X = (v: number) => MARGIN + (v - x0) * k;
      const Y = (v: number) => MARGIN + (v - y0) * k;
      for (const c of callouts) {
        const [ax, ay] = anchors[c.tag];
        c.x = X(ax);
        c.y = Y(ay);
        c.px = X(drawing.pads[c.tag][0]);
        c.py = Y(drawing.pads[c.tag][1]);
      }
      return { art: { x: X(0), y: Y(0), w: drawing.width * k, h: drawing.height * k }, crop: { x0: 0, y0: 0 }, k, H: (y1 - y0) * k + 2 * MARGIN, callouts };
    }

    // Callout columns left and right of the art.
    const pts = drawn.map((t) => drawing.pads[t]);
    const m = 34;
    // A dedicated sheet is shown whole, like its PDF page; the machine drawing is cropped to the sheet's points.
    const x0 = sheetArt ? 0 : Math.max(0, Math.min(...pts.map((p) => p[0])) - m * 2);
    const x1 = sheetArt ? drawing.width : Math.min(drawing.width, Math.max(...pts.map((p) => p[0])) + m * 2);
    const y0 = sheetArt ? 0 : Math.max(0, Math.min(...pts.map((p) => p[1])) - m * 2);
    const y1 = sheetArt ? drawing.height : Math.min(drawing.height, Math.max(...pts.map((p) => p[1])) + m * 2);
    const cw = x1 - x0;
    const ch = y1 - y0;
    const k = ART_W / cw;
    const artH = ch * k;
    const callouts: Callout[] = drawn.map((t) => {
      const lines = wrap(text(t), COL_W - BOX_PAD);
      return { tag: t, label: label(t), side: "L", px: 0, py: 0, x: 0, y: 0, w: COL_W, h: BOX_H + (lines.length - 1) * LINE_H, lines };
    });
    const H = Math.max(artH, Math.ceil(columnHeight(callouts) / 2) + BOX_H, 260);
    const artY = (H - artH) / 2;
    for (const c of callouts) {
      const p = drawing.pads[c.tag];
      c.px = ART_X + (p[0] - x0) * k;
      c.py = artY + (p[1] - y0) * k;
      c.side = c.px < ART_X + ART_W / 2 ? "L" : "R";
    }
    // Keep the two columns balanced when one side is crowded: move the callout nearest the centre across.
    const left = callouts.filter((c) => c.side === "L");
    const right = callouts.filter((c) => c.side === "R");
    while (columnHeight(left) > H && left.length > 1) {
      const c = left.sort((a, b) => b.px - a.px).shift()!;
      c.side = "R";
      right.push(c);
    }
    while (columnHeight(right) > H && right.length > 1) {
      const c = right.sort((a, b) => a.px - b.px).shift()!;
      c.side = "L";
      left.push(c);
    }
    const height = Math.max(H, columnHeight(left), columnHeight(right));
    stack(left, height);
    stack(right, height);
    for (const c of callouts) c.x = c.side === "L" ? 0 : W - COL_W;
    return { art: { x: ART_X, y: artY, w: ART_W, h: artH }, crop: { x0, y0 }, k, H: height, callouts: [...left, ...right] };
  }, [drawing, tags, sheetArt]);

  if (!drawing || !layout) return null;
  const Art = drawing.Art;
  const sigOf = (t: string) => PYRO_SIGNALS.find((s) => s.tag === t);
  // Other machines' callouts first, so this machine's callouts and pads draw on top.
  const ordered = [...layout.callouts].sort((a, b) => Number(sigOf(a.tag)?.machine === machineId) - Number(sigOf(b.tag)?.machine === machineId));
  const shared = sheetArt ? sheetMachines(sheet).length > 1 : false;

  const info = (c: Callout) => {
    const def = sigOf(c.tag);
    const spec = PYRO_SPEC[c.tag];
    const own = !def || def.machine === machineId;
    const owner = def?.machine.replace(/^PYR-/, "") ?? "";
    const live = def && !own ? fleet[def.machine]?.frame?.signals[c.tag] : frame?.signals[c.tag];
    const quality = live?.quality;
    const liveStatus = live?.status ?? "Normal";
    // The pad follows the page's colouring (live status or data validity); the value always shows live status.
    const status = colorBy === "validity" ? (quality ? (VALIDITY_STATUS[quality] ?? "Normal") : "Normal") : liveStatus;
    const unit = def && def.unit !== "state" ? ` ${def.unit}` : "";
    const full = spec?.parameter ?? def?.name ?? "";
    const value = `${live?.display ?? "—"}${live ? unit : ""}`;
    const sel = own && selectedTag === c.tag;
    const select = () => onSelectTag?.(sel ? null : c.tag);
    const data = quality ? ` · data ${quality === "Good" ? "valid" : quality.toLowerCase()}` : "";
    return {
      own,
      owner,
      status,
      full,
      value,
      sel,
      manual: def?.origin === "manual",
      optional: spec?.priority === "Optional",
      valueColor: liveStatus === "Normal" ? "var(--dx-ink)" : liveStatus === "Critical" ? MX.bad : MX.warn,
      title: own ? `${c.label} · ${full}${data}` : `${c.label} · ${full}${data} · ${owner}; open ${owner} to select it`,
      // This machine's points select their reading; another machine's points are shown dimmed and read-only.
      interaction: own
        ? {
            role: "button",
            tabIndex: 0,
            "aria-label": `${c.label} ${full}: ${value}${data}`,
            "aria-pressed": sel,
            onClick: select,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                select();
              }
            },
            style: { cursor: "pointer" },
          }
        : { role: "img", "aria-label": `${c.label} ${full}: ${value}${data} (${owner}, shown on this sheet)` },
    };
  };

  const pad = (c: Callout, i: ReturnType<typeof info>) => (
    <g transform={`translate(${+c.px.toFixed(1)} ${+c.py.toFixed(1)})`}>
      {i.manual && <circle r={11.5 * 1.25} fill="none" stroke={MX.label} strokeWidth={1.1} strokeDasharray="3 2.5" />}
      <MachinePad x={0} y={0} status={i.status} selected={i.sel} scale={1.25} priority={i.optional ? "optional" : "required"} />
    </g>
  );

  const artGroup = (
    <g transform={`translate(${+layout.art.x.toFixed(2)} ${+layout.art.y.toFixed(2)}) scale(${+layout.k.toFixed(5)}) translate(${-layout.crop.x0} ${-layout.crop.y0})`} aria-hidden="true">
      <Art />
    </g>
  );
  const legend = <SheetLegend shared={shared} colorBy={colorBy} />;

  // Narrow container (phone): the drawing with its pads, and the callouts as a list underneath.
  if (narrow) {
    const a = layout.art;
    return (
      <div ref={wrapRef}>
        <div className="mx-canvas pyro-sheet" style={{ width: "100%", overflow: "hidden" }}>
          <MachineSvg viewBox={`${Math.floor(a.x - 12)} ${Math.floor(a.y - 12)} ${Math.ceil(a.w + 24)} ${Math.ceil(a.h + 24)}`} label={`${sheet} — ${sheetHeading(sheet)}`} interactive>
            {artGroup}
            {ordered.map((c) => {
              const i = info(c);
              return (
                <g key={c.tag} {...i.interaction} opacity={i.own ? undefined : 0.5}>
                  <title>{i.title}</title>
                  {pad(c, i)}
                </g>
              );
            })}
          </MachineSvg>
        </div>
        <div role="group" aria-label={`${sheet} callouts`} style={{ marginTop: 8 }}>
          {[...layout.callouts]
            .sort((a, b) => a.tag.localeCompare(b.tag))
            .map((c) => {
              const i = info(c);
              const line = { display: "flex", alignItems: "baseline", gap: 10, padding: "8px 10px", borderBottom: "1px solid var(--separator)", borderRadius: "var(--corner-row, 10px)" } as const;
              return (
                <div key={c.tag} {...i.interaction} style={{ ...line, opacity: i.own ? 1 : 0.5, cursor: i.own ? "pointer" : undefined, background: i.sel ? "var(--row-hover-bg)" : undefined }}>
                  <span aria-hidden="true" style={{ alignSelf: "stretch", width: 3, borderRadius: 2, flex: "none", background: i.manual ? "none" : i.optional ? MX.fine : MX.label, border: i.manual ? `1px dashed ${MX.label}` : undefined }} />
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: "block", fontWeight: 600, fontSize: 13, color: "var(--dx-ink)" }}>{c.label}</span>
                    <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)" }}>{c.lines.join(" ")}</span>
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: i.valueColor, fontFeatureSettings: '"tnum","zero"', whiteSpace: "nowrap" }}>{i.value}</span>
                </div>
              );
            })}
        </div>
        {legend}
      </div>
    );
  }

  return (
    <div ref={wrapRef}>
      <div className="mx-canvas pyro-sheet" style={{ width: "100%", overflow: "hidden" }}>
        <MachineSvg viewBox={`0 0 ${W} ${Math.ceil(layout.H)}`} label={`${sheet} — ${sheetHeading(sheet)}`} interactive>
          {artGroup}
          {/* Leaders under every box, so a hairline never crosses another callout's text. */}
          <g aria-hidden="true">
            {ordered.map((c) => {
              const sel = selectedTag === c.tag && sigOf(c.tag)?.machine === machineId;
              return (
                <polyline
                  key={c.tag}
                  points={leaderPoints(c)}
                  fill="none"
                  stroke={sel ? "var(--dx-ink)" : MX.label}
                  strokeWidth={sel ? 1.2 : 0.9}
                  opacity={(sel ? 0.9 : 0.5) * (sigOf(c.tag)?.machine === machineId || !sigOf(c.tag) ? 1 : 0.5)}
                />
              );
            })}
          </g>
          {ordered.map((c) => {
            const i = info(c);
            return (
              <g key={c.tag} {...i.interaction} opacity={i.own ? undefined : 0.5}>
                <title>{i.title}</title>
                <rect
                  x={c.x}
                  y={+c.y.toFixed(1)}
                  width={c.w}
                  height={c.h}
                  rx={8}
                  fill={MX.padPanel}
                  stroke={i.sel ? "var(--dx-ink)" : MX.fine}
                  strokeWidth={i.sel ? 1.4 : 1}
                  strokeDasharray={i.manual ? "5 4" : undefined}
                />
                <rect x={c.x + 7} y={+(c.y + 9).toFixed(1)} width={3} height={c.h - 18} rx={1.5} fill={i.manual ? "none" : i.optional ? MX.fine : MX.label} stroke={i.manual ? MX.label : "none"} strokeDasharray={i.manual ? "2 2" : undefined} />
                <text x={c.x + 18} y={+(c.y + 20).toFixed(1)} fontFamily={MX.font} fontSize={13} fontWeight={600} fill="var(--dx-ink)" style={{ fontFeatureSettings: '"tnum","zero"' }}>
                  {c.label}
                </text>
                <text
                  x={c.compact ? c.x + 18 : c.x + c.w - 10}
                  y={+(c.y + (c.compact ? 38 : 20)).toFixed(1)}
                  textAnchor={c.compact ? "start" : "end"}
                  fontFamily={MX.font}
                  fontSize={12.5}
                  fontWeight={500}
                  fill={i.valueColor}
                  style={{ fontFeatureSettings: '"tnum","zero"' }}
                >
                  {i.value}
                </text>
                <text fontFamily={MX.font} fontSize={11.5} fill={MX.label}>
                  {c.lines.map((line, n) => (
                    <tspan key={n} x={c.x + 18} y={+(c.y + 38 + (c.compact ? LINE_H + 2 : 0) + n * LINE_H).toFixed(1)}>
                      {line}
                    </tspan>
                  ))}
                </text>
                {pad(c, i)}
              </g>
            );
          })}
        </MachineSvg>
      </div>
      {legend}
    </div>
  );
}

/** Callout legend: the D4 Table 4.4 colours and their neutral ULTRON equivalents (callout bar and pad ring). */
function SheetLegend({ shared, colorBy }: { shared: boolean; colorBy: SheetColorBy }) {
  const items: Array<{ key: string; label: string; d4: string; bar: React.ReactNode; ring: React.ReactNode }> = [
    {
      key: "req",
      label: "Required (solid bar, full ring)",
      d4: "D4 green",
      bar: <rect x={1} y={1} width={4} height={14} rx={1.5} fill={MX.label} />,
      ring: <MachinePad x={9} y={8} scale={1} />,
    },
    {
      key: "opt",
      label: "Optional (light bar, thin light ring)",
      d4: "D4 slate",
      bar: <rect x={1} y={1} width={4} height={14} rx={1.5} fill={MX.fine} />,
      ring: <MachinePad x={9} y={8} scale={1} priority="optional" />,
    },
    {
      key: "man",
      label: "Manual record (dashed box, dashed ring)",
      d4: "D4 purple dashed",
      bar: <rect x={1.5} y={1.5} width={3} height={13} rx={1.5} fill="none" stroke={MX.label} strokeDasharray="2 2" />,
      ring: (
        <g>
          <circle cx={9} cy={8} r={7.2} fill="none" stroke={MX.label} strokeWidth={0.9} strokeDasharray="2.4 2" />
          <MachinePad x={9} y={8} scale={0.8} />
        </g>
      ),
    },
  ];
  return (
    <div role="list" aria-label="Callout legend" style={{ display: "flex", flexWrap: "wrap", gap: "6px 18px", alignItems: "center", padding: "10px 2px 0", fontSize: 12, color: "var(--text-muted)" }}>
      {items.map((it) => (
        <span key={it.key} role="listitem" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <svg width={6} height={16} viewBox="0 0 6 16" aria-hidden="true">
            {it.bar}
          </svg>
          <svg width={18} height={16} viewBox="0 0 18 16" aria-hidden="true">
            {it.ring}
          </svg>
          <span>
            {it.label} <span style={{ opacity: 0.75 }}>· {it.d4}</span>
          </span>
        </span>
      ))}
      <span role="listitem">
        {colorBy === "validity" ? "Pad colour = data validity (suspect amber, invalid red) · value colour = live status" : "Pad colour = live status"}
        {shared ? " · dimmed = the other machine on this sheet" : ""}
      </span>
    </div>
  );
}
