"use client";

/**
 * Alert popups on the operator mimic: an active alert or failure is pinned on
 * the drawing where it is raised — over the sub-assembly's health dot on the
 * Full line, over the sensor that carries the evidence on a machine sheet.
 * One popup per place (the most severe alert; a count of the rest), written in
 * everyday words (where, what is wrong, what is happening, what to do — see
 * docs/plain-language.md), at a fixed on-screen size, kept clear of each other. A popup
 * stays while its alert is active; the operator can close it (a new alert at
 * the same place shows again). Clicking it opens that component or sensor.
 *
 * `useAlertPopupControl` holds what the operator chose, above the drawing so it
 * survives sheet changes: every message on or off (kept per browser), and the
 * messages closed one by one (kept for the browser session) with a way to bring
 * them back. `AlertPopupToggle` is that control for the drawing's toolbar.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MX } from "@/components/assets/machine-kit/machine-kit";
import type { LineSheetArt } from "@/components/assets/pyro/line-sheets";
import { textWidth } from "@/components/assets/pyro/line-sheets/text-width";
import type { HomeAlert } from "../home-widgets";
import { lineLegendBox, lineMachineTags } from "./line-health-layer";
import { plainWords } from "@/lib/plain-words";

type Pt = [number, number];

/** Popup size on screen (px). */
const CARD_W = 340;
/** A compact popup (level · where, then the problem on one line), used where a full card has no free spot. */
const COMPACT_W = 230;
const PAD = 10;
const TITLE_PX = 12.5;
const BODY_PX = 11;
const META_PX = 10;
const LINE_H = 1.32;
const LINE_GAP = 5;
const GAP = 12;
/** At most this many popups at once (most severe first); the alarm sidebar lists every alert. A machine sheet
 * already colours its abnormal readings, so it pins fewer, two-line popups. */
const MAX_POPUPS = { line: 6, sheet: 3 };

interface Placed {
  key: string;
  anchor: Pt;
  alerts: HomeAlert[];
  /** Where the popup opens: the component (Full line) or the sensor (machine sheet). */
  target: { machineId: string; sub?: string; tag?: string };
  box: [number, number, number, number];
  card: CardText;
}

/** The card's wrapped lines (docs/plain-language.md: where, what is wrong, what is happening, what to do). */
interface CardText {
  meta: string;
  title: string[];
  what: string[];
  todo: string[];
  more: string | null;
  /** Height in screen px. */
  h: number;
}

const rank = (a: HomeAlert) => (a.level === "danger" ? 0 : 1);

/** Shortens `text` to fit `w` at `size`, with an ellipsis. */
function fit(text: string, size: number, w: number, weight = 500): string {
  if (textWidth(text, size, weight, 0.01) <= w) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (textWidth(`${text.slice(0, mid)}…`, size, weight, 0.01) <= w) lo = mid;
    else hi = mid - 1;
  }
  return `${text.slice(0, lo).trimEnd()}…`;
}

/** `text` broken into lines of at most `w`; past `max` lines the last one ends with an ellipsis. */
function wrap(text: string, size: number, w: number, weight: number, max: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  let i = 0;
  for (; i < words.length; i++) {
    const next = cur ? `${cur} ${words[i]}` : words[i];
    if (!cur || textWidth(next, size, weight, 0.01) <= w) {
      cur = next;
      continue;
    }
    lines.push(cur);
    cur = words[i];
    if (lines.length === max) break;
  }
  if (lines.length < max) {
    if (cur) lines.push(cur);
    return lines.map((l) => fit(l, size, w, weight));
  }
  // Out of lines: the last line carries the rest, shortened.
  lines[max - 1] = fit([lines[max - 1], ...words.slice(i)].join(" "), size, w, weight);
  return lines;
}

const sentence = (t: string | undefined | null) => (t ? t.trim().replace(/([^.!?])$/, "$1.") : "");

/** The card's text in everyday words, falling back to the engineering text for alerts without plain fields.
 * `compact` keeps only the first line and a one-line title. */
function cardText(group: HomeAlert[], textW: number, compact = false): CardText {
  const top = group[0];
  const level = top.level === "danger" ? "Critical" : "Alert";
  const machine = plainWords(top.machine);
  const meta = fit([level, top.where ? plainWords(top.where) : null, machine].filter(Boolean).join(" · "), META_PX, textW, 700);
  const title = wrap(top.plainTitle ?? top.finding, TITLE_PX, textW, 700, compact ? 1 : 2);
  const what = compact ? [] : wrap(sentence(top.plainWhat ?? top.reading), BODY_PX, textW, 500, 4);
  const todoText = compact ? null : (top.plainTodo ?? top.action ?? null);
  const todo = todoText ? wrap(`What to do: ${sentence(todoText)}`, BODY_PX, textW, 600, 3) : [];
  const n = group.length - 1;
  const more = n > 0 && !compact ? `${n} more ${n === 1 ? "problem" : "problems"} on this part. Click to see all.` : null;
  const h =
    PAD * 2 +
    META_PX * LINE_H +
    LINE_GAP +
    title.length * TITLE_PX * LINE_H +
    LINE_GAP +
    what.length * BODY_PX * LINE_H +
    (what.length ? 0 : -LINE_GAP) +
    (todo.length ? LINE_GAP + todo.length * BODY_PX * LINE_H : 0) +
    (more ? LINE_GAP + META_PX * LINE_H : 0);
  return { meta, title, what, todo, more, h };
}

const SHOW_KEY = "ultron.operator.alertPopups";
const CLOSED_KEY = "ultron.operator.closedAlerts";

export interface AlertPopupControl {
  /** Messages are drawn at all. */
  show: boolean;
  setShow: (on: boolean) => void;
  /** Alerts whose message the operator closed. */
  closed: ReadonlySet<string>;
  close: (ids: string[]) => void;
  /** Bring every closed message back. */
  restore: () => void;
}

/** The operator's message choices; `activeIds` (the alerts still active) keeps the closed list from growing forever. */
export function useAlertPopupControl(activeIds: readonly string[]): AlertPopupControl {
  const [show, setShowState] = useState(true);
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    try {
      if (localStorage.getItem(SHOW_KEY) === "off") setShowState(false);
      const saved = JSON.parse(sessionStorage.getItem(CLOSED_KEY) ?? "[]") as unknown;
      if (Array.isArray(saved)) setClosed(new Set(saved.filter((x): x is string => typeof x === "string")));
    } catch {
      /* storage unavailable: defaults */
    }
  }, []);
  const persistClosed = (next: ReadonlySet<string>) => {
    try {
      sessionStorage.setItem(CLOSED_KEY, JSON.stringify([...next]));
    } catch {
      /* storage unavailable */
    }
  };
  // Forget closed alerts that are no longer active (a later alert gets a new id and shows again).
  const activeKey = activeIds.join("|");
  useEffect(() => {
    if (!activeKey) return;
    const active = new Set(activeKey.split("|"));
    setClosed((c) => {
      const kept = [...c].filter((id) => active.has(id));
      if (kept.length === c.size) return c;
      const next = new Set(kept);
      persistClosed(next);
      return next;
    });
  }, [activeKey]);
  const setShow = useCallback((on: boolean) => {
    setShowState(on);
    try {
      localStorage.setItem(SHOW_KEY, on ? "on" : "off");
    } catch {
      /* storage unavailable */
    }
  }, []);
  const close = useCallback((ids: string[]) => {
    setClosed((c) => {
      const next = new Set([...c, ...ids]);
      persistClosed(next);
      return next;
    });
  }, []);
  const restore = useCallback(() => {
    setClosed(new Set());
    persistClosed(new Set());
  }, []);
  return { show, setShow, closed, close, restore };
}

/** Toolbar control: hide or show every message on the drawing, and bring back the ones closed one by one. */
export function AlertPopupToggle({ control, activeCount }: { control: AlertPopupControl; activeCount: number }) {
  const closedCount = control.closed.size;
  if (activeCount === 0 && control.show) return null;
  return (
    <div className="opc-zoom-group alp-toggle" role="group" aria-label="Problem messages on the drawing">
      <span className="alp-toggle-label" aria-hidden="true">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 5h16v11H9l-5 4z" />
        </svg>
        Messages
      </span>
      {control.show ? (
        <>
          {closedCount > 0 && (
            <button
              type="button"
              className="opc-zoom-btn"
              onClick={control.restore}
              title={`Show the ${closedCount} ${closedCount === 1 ? "message" : "messages"} you closed again`}
            >
              Bring back {closedCount}
            </button>
          )}
          <button
            type="button"
            className="opc-zoom-btn"
            onClick={() => control.setShow(false)}
            aria-pressed={true}
            title="Hide every problem message on the drawing. The Alarms panel still lists them all."
          >
            Hide
          </button>
        </>
      ) : (
        <button
          type="button"
          className="opc-zoom-btn"
          onClick={() => control.setShow(true)}
          aria-pressed={false}
          title="Show the problem messages on the drawing again"
        >
          Show{activeCount ? ` · ${activeCount}` : ""}
        </button>
      )}
    </div>
  );
}

export function AlertPopupLayer({
  alerts,
  art,
  line,
  overview,
  machines,
  pxPerUnit,
  viewBox,
  onOpen,
  closed,
  onClose,
}: {
  alerts: HomeAlert[];
  art: LineSheetArt;
  /** Full line: anchor on sub-assembly dots / machine regions. */
  line: boolean;
  /** A machine's overview sheet: alerts without a sensor on the sheet sit at its top edge. */
  overview: boolean;
  /** Machines drawn on the sheet. */
  machines: string[];
  pxPerUnit: number | null;
  viewBox: [number, number, number, number];
  onOpen: (target: { machineId: string; sub?: string; tag?: string }) => void;
  /** Alerts whose message the operator closed (useAlertPopupControl). */
  closed: ReadonlySet<string>;
  onClose: (ids: string[]) => void;
}) {
  const u = 1 / (pxPerUnit && pxPerUnit > 0 ? pxPerUnit : 1);
  /** A typical card's height, for anchoring alerts that have no place on the sheet. */
  const cardH = 130 * u;

  const { placed, hidden } = useMemo(() => {
    const groups = new Map<string, { anchor: Pt; alerts: HomeAlert[]; target: Placed["target"] }>();
    for (const a of alerts) {
      if (closed.has(a.id) || !machines.includes(a.machineId)) continue;
      let anchor: Pt | null = null;
      let target: Placed["target"] = { machineId: a.machineId };
      let key = "";
      if (line) {
        const sub = a.subs?.find((s) => art.parts?.[s]?.machine === a.machineId);
        if (sub) {
          anchor = art.parts![sub].at;
          target = { machineId: a.machineId, sub };
          key = `sub:${sub}`;
        } else if (art.links?.[a.machineId]) {
          const [x, y, w] = art.links[a.machineId];
          anchor = [x + w / 2, y + 8 * u];
          key = `machine:${a.machineId}`;
        }
      } else {
        const tag = a.tags?.find((t) => art.pads[t]);
        if (tag) {
          anchor = art.pads[tag];
          target = { machineId: a.machineId, tag };
          key = `tag:${tag}`;
        } else if (overview) {
          anchor = [viewBox[0] + viewBox[2] / 2, viewBox[1] + cardH + 20 * u];
          key = `machine:${a.machineId}`;
        }
      }
      if (!anchor) continue;
      const g = groups.get(key) ?? { anchor, alerts: [], target };
      g.alerts.push(a);
      groups.set(key, g);
    }
    const all = [...groups.entries()]
      .map(([key, g]) => ({ key, ...g, alerts: g.alerts.sort((x, y) => rank(x) - rank(y) || (y.t ?? -Infinity) - (x.t ?? -Infinity)) }))
      .sort((x, y) => rank(x.alerts[0]) - rank(y.alerts[0]) || (y.alerts[0].t ?? -Infinity) - (x.alerts[0].t ?? -Infinity));
    const cap = line ? MAX_POPUPS.line : MAX_POPUPS.sheet;
    const list = all.slice(0, cap);
    let hidden = all.slice(cap).reduce((n, g) => n + g.alerts.length, 0);

    // Above the anchor first, then below, left, right; clear of popups already placed and inside the view.
    const [vx, vy, vw, vh] = viewBox;
    // Points a card must not cover: every health dot (Full line) or sensor pad (machine sheet).
    const obstacles: Pt[] = line ? Object.values(art.parts ?? {}).map((p) => p.at) : Object.values(art.pads);
    // Clear of a dot's whole hit circle (≈ 9 px radius on screen), not just its centre.
    const dotPad = 13 * u;
    const out: Placed[] = [];
    // The Full line's dot legend (top right) is kept clear like a placed popup.
    const legend: Placed["box"] | null = line && art.parts ? lineLegendBox(art) : null;
    // So are the machine name tags (each machine's click target); a tag is at most ~180 units wide at k = 1.
    const tags: Placed["box"][] = line ? lineMachineTags(art).map((t) => [t.x, t.y - t.h / 2, 180 * (art.width / 1144.5), t.h]) : [];
    const overlaps = (b: Placed["box"]) => [...out.map((o) => o.box), ...(legend ? [legend] : []), ...tags].some((o) => b[0] < o[0] + o[2] + 6 * u && o[0] < b[0] + b[2] + 6 * u && b[1] < o[1] + o[3] + 6 * u && o[1] < b[1] + b[3] + 6 * u);
    const covers = (b: Placed["box"]) =>
      obstacles.some(([ox, oy]) => ox > b[0] - dotPad && ox < b[0] + b[2] + dotPad && oy > b[1] - dotPad && oy < b[1] + b[3] + dotPad);
    /** The closest clean spot for a `w` × `h` (screen px) card at `[ax, ay]`, or null. */
    const spot = ([ax, ay]: Pt, wPx: number, hPx: number): Placed["box"] | null => {
      const w = wPx * u;
      const h = hPx * u;
      const clampX = (x: number) => Math.min(vx + vw - w - 4 * u, Math.max(vx + 4 * u, x));
      const clampY = (y: number) => Math.min(vy + vh - h - 4 * u, Math.max(vy + 4 * u, y));
      const tries: Placed["box"][] = [
        [clampX(ax - w / 2), clampY(ay - GAP * u - h), w, h],
        [clampX(ax - w / 2), clampY(ay + GAP * u), w, h],
        [clampX(ax - GAP * u - w), clampY(ay - h / 2), w, h],
        [clampX(ax + GAP * u), clampY(ay - h / 2), w, h],
      ];
      // All four taken: any spot in the view on a fine grid, nearest to the anchor first (the leader still
      // points at the part), up to about one card width away.
      const far: Array<{ b: Placed["box"]; d: number }> = [];
      const step = 24 * u;
      for (let x = vx + 4 * u; x <= vx + vw - w - 4 * u; x += step) {
        for (let yy = vy + 4 * u; yy <= vy + vh - h - 4 * u; yy += step) {
          const cx = Math.min(x + w, Math.max(x, ax));
          const cy = Math.min(yy + h, Math.max(yy, ay));
          const d = Math.hypot(cx - ax, cy - ay);
          if (d >= GAP * u && d <= w * 1.1) far.push({ b: [x, yy, w, h], d });
        }
      }
      far.sort((p, q) => p.d - q.d);
      tries.push(...far.map((f) => f.b));
      // A card never covers another popup or any dot / sensor pad, its own anchor included (they must stay
      // clickable): the first (closest) clean candidate wins.
      return tries.find((b) => !overlaps(b) && !covers(b)) ?? null;
    };
    for (const g of list) {
      // The full card first; on a small drawing (zoomed out, narrow pane) a compact one. With no clean spot for
      // either the card is not drawn and its alerts join the "+N more" count; they are all in the alarm list.
      let card = cardText(g.alerts, CARD_W - PAD * 2 - 18);
      let box = spot(g.anchor, CARD_W, card.h);
      if (!box) {
        card = cardText(g.alerts, COMPACT_W - PAD * 2 - 18, true);
        box = spot(g.anchor, COMPACT_W, card.h);
      }
      if (!box) {
        hidden += g.alerts.length;
        continue;
      }
      out.push({ key: g.key, anchor: g.anchor, alerts: g.alerts, target: g.target, box, card });
    }
    return { placed: out, hidden };
  }, [alerts, closed, machines, line, overview, art, viewBox, u, cardH]);

  if (!placed.length && !hidden) return null;

  return (
    <g className="alp" aria-live="polite">
      {/* Alerts beyond the cap: a count, bottom left; every alert is in the alarm list. */}
      {hidden > 0 && (
        <text x={viewBox[0] + 40 * u} y={viewBox[1] + viewBox[3] - 12 * u} fontSize={META_PX * u} fontWeight={600} fill={MX.label} pointerEvents="none">
          {hidden} more {hidden === 1 ? "problem is" : "problems are"} listed in the Alarms panel
        </text>
      )}
      {/* Markers and leaders first, so no leader crosses a card. Marker only: clicks pass through to the dot / sensor. */}
      <g pointerEvents="none" aria-hidden="true">
        {placed.map(({ key, anchor, alerts: group, box: [bx, by, bw, bh] }) => {
          const color = group[0].level === "danger" ? MX.bad : MX.warn;
          const ex = Math.min(bx + bw, Math.max(bx, anchor[0]));
          const ey = Math.min(by + bh, Math.max(by, anchor[1]));
          return (
            <g key={key}>
              <circle cx={anchor[0]} cy={anchor[1]} r={11 * u} fill="none" stroke={color} strokeWidth={2 * u} />
              <path d={`M ${anchor[0]} ${anchor[1]} L ${ex} ${ey}`} stroke={color} strokeWidth={1.4 * u} />
            </g>
          );
        })}
      </g>
      {placed.map(({ key, alerts: group, target, box, card }) => {
        const top = group[0];
        const color = top.level === "danger" ? MX.bad : MX.warn;
        const [bx, by, bw, bh] = box;
        const x0 = bx + PAD * u + 4 * u;
        // Baselines, top to bottom.
        let y = by + PAD * u;
        const next = (px: number, gap = 0) => {
          y += gap * u;
          const base = y + px * 0.95 * u;
          y += px * LINE_H * u;
          return base;
        };
        return (
          <g key={key}>
            <g
              role="button"
              tabIndex={0}
              aria-label={`${top.level === "danger" ? "Critical" : "Alert"}: ${top.plainTitle ?? top.finding}, ${top.where ? `${top.where}, ` : ""}${top.machine}. Open details`}
              style={{ cursor: "pointer" }}
              onClick={() => onOpen(target)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpen(target);
                }
              }}
            >
              <rect x={bx} y={by} width={bw} height={bh} rx={6 * u} fill={MX.padPanel} stroke={color} strokeWidth={1.5 * u} />
              <rect x={bx} y={by} width={4 * u} height={bh} rx={2 * u} fill={color} />
              <title>{`Details: ${top.finding} — ${top.reading}${top.raised ? ` (since ${top.raised})` : ""}`}</title>
              <text x={x0} y={next(META_PX)} fontSize={META_PX * u} fontWeight={700} fill={color} letterSpacing={0.02 * META_PX * u}>
                {card.meta}
              </text>
              {card.title.map((t, i) => (
                <text key={`t${i}`} x={x0} y={next(TITLE_PX, i === 0 ? LINE_GAP : 0)} fontSize={TITLE_PX * u} fontWeight={700} fill="var(--dx-ink)">
                  {t}
                </text>
              ))}
              {card.what.map((t, i) => (
                <text key={`w${i}`} x={x0} y={next(BODY_PX, i === 0 ? LINE_GAP : 0)} fontSize={BODY_PX * u} fontWeight={500} fill="var(--dx-ink)">
                  {t}
                </text>
              ))}
              {card.todo.map((t, i) => (
                <text key={`d${i}`} x={x0} y={next(BODY_PX, i === 0 ? LINE_GAP : 0)} fontSize={BODY_PX * u} fontWeight={600} fill="var(--dx-ink)">
                  {t}
                </text>
              ))}
              {card.more && (
                <text x={x0} y={next(META_PX, LINE_GAP)} fontSize={META_PX * u} fontWeight={600} fill={MX.label}>
                  {card.more}
                </text>
              )}
            </g>
            {/* Close: hides this place's alerts until a new one arrives there or the operator brings them back. */}
            <g
              role="button"
              tabIndex={0}
              aria-label="Close this message (Messages › Bring back shows it again)"
              style={{ cursor: "pointer" }}
              onClick={() => onClose(group.map((a) => a.id))}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClose(group.map((a) => a.id));
                }
              }}
            >
              <rect x={bx + bw - 22 * u} y={by + 2 * u} width={20 * u} height={20 * u} fill="transparent" />
              <path
                d={`M ${bx + bw - 15 * u} ${by + 8 * u} l ${7 * u} ${7 * u} M ${bx + bw - 8 * u} ${by + 8 * u} l ${-7 * u} ${7 * u}`}
                stroke={MX.label}
                strokeWidth={1.4 * u}
                strokeLinecap="round"
              />
            </g>
          </g>
        );
      })}
    </g>
  );
}
