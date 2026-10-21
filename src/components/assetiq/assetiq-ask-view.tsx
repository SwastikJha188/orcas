"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useCopilot, type ChatThread, type CopilotHeader, type CopilotState } from "@/components/copilot/copilot-provider";
import { AssistantMessage, CheckIcon, CloseIcon, SendIcon, UserMessage } from "@/components/copilot/copilot";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { zonedParts } from "@/lib/time";
import "./assetiq-ask.css";

/* ==========================================================================
   AssetIQ · Ask — the conversation with the engine. Conversations on the
   left (one list per plant; a drawer on narrow screens); an empty
   conversation opens on the composer, a running one reads top to bottom with
   the composer docked below it. What the answers speak for is the machine
   picked in the top bar. Answers are computed from the live frame and the
   database, not canned, and shown as soon as they are computed.
   ========================================================================== */

/** How long to wait for the first live frame before saying it has not come. */
const WAIT_MS = 15_000;
/** Narrow screens: the conversation list becomes a drawer (matches the CSS breakpoint). */
const NARROW = "(max-width: 760px)";

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  );
}

/** Calendar day of a wall-clock instant in the viewer's zone, as a sortable number. */
function dayNumber(t: number): number {
  const p = zonedParts(t);
  return Date.UTC(p.year, p.month, p.day) / 86_400_000;
}

const GROUPS = ["Today", "Yesterday", "Previous 7 days", "Older"] as const;

function groupThreads(threads: ChatThread[], now: number): Array<{ label: string; items: ChatThread[] }> {
  const today = dayNumber(now);
  const buckets = new Map<string, ChatThread[]>(GROUPS.map((g) => [g, []]));
  for (const t of threads) {
    if (!t.messages.length) continue;
    const age = today - dayNumber(t.updatedAt);
    const g = age <= 0 ? "Today" : age === 1 ? "Yesterday" : age <= 7 ? "Previous 7 days" : "Older";
    buckets.get(g)!.push(t);
  }
  return GROUPS.map((label) => ({ label, items: buckets.get(label)! })).filter((g) => g.items.length);
}

/* ---------------------------------------------------------------- composer */

function Composer({
  onSend,
  placeholder,
  autoFocusKey,
  large,
}: {
  onSend: (q: string) => void;
  /** Names what the answer will be about (the machine picked in the top bar). */
  placeholder: string;
  /** Changing it moves focus to the composer (a new or switched conversation). */
  autoFocusKey: string;
  large?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, [autoFocusKey]);

  // Grow with the text up to the CSS max height.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.blockSize = "auto";
    el.style.blockSize = `${el.scrollHeight}px`;
  }, [draft]);

  const submit = () => {
    const q = draft.trim();
    if (!q) return;
    setDraft("");
    onSend(q);
  };

  return (
    <form
      className={`aqk-composer ${large ? "is-large" : ""}`}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <textarea
        ref={ref}
        rows={1}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        aria-label="Message to AssetIQ"
        maxLength={400}
        autoComplete="off"
      />
      <div className="aqk-composer-bar">
        {draft.length > 320 && (
          <span className="aqk-count ast-num" title="Characters used of the 400 allowed">
            {draft.length}/400
          </span>
        )}
        <button type="submit" className="aqk-send" disabled={!draft.trim()} aria-label="Send">
          <SendIcon />
        </button>
      </div>
    </form>
  );
}

function Suggestions({ cp, onPick, wrap }: { cp: CopilotState; onPick: () => void; wrap?: boolean }) {
  if (!cp.chips.length && !cp.nudgeCount) return null;
  return (
    <div className={`aqk-suggest ${wrap ? "is-wrap" : ""}`} aria-label="Suggested questions">
      {cp.nudgeCount > 0 && (
        // Findings opened since the session started wait here; they join the conversation on request.
        <button
          type="button"
          className={`aqk-chip aqk-alerts ${cp.nudgeCritical ? "is-crit" : ""}`}
          onClick={() => {
            onPick();
            cp.showNudges();
          }}
        >
          <i aria-hidden="true" />
          {cp.nudgeCount} new problem{cp.nudgeCount === 1 ? "" : "s"}
        </button>
      )}
      {cp.chips.map((c) => (
        <button
          key={c}
          type="button"
          className="aqk-chip"
          title={c}
          onClick={() => {
            onPick();
            cp.send(c, cp.chipLabel(c));
          }}
        >
          {cp.chipLabel(c)}
        </button>
      ))}
    </div>
  );
}

/** The account's own questions on the empty page: all of them, two columns, one tap each. */
function QuestionList({ cp, onPick }: { cp: CopilotState; onPick: () => void }) {
  if (!cp.questions.length) return null;
  return (
    <div className="aqk-questions" aria-label="Your questions">
      {cp.questions.map((q) => (
        <button
          key={q}
          type="button"
          className="aqk-question"
          onClick={() => {
            onPick();
            cp.send(q, cp.chipLabel(q));
          }}
        >
          {cp.chipLabel(q)}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- history */

/**
 * The plant's conversations. On narrow screens it is a drawer (`drawer` true while open):
 * a modal dialog that keeps focus inside, closes on Esc or the scrim, and closes after a pick.
 */
function History({ cp, drawer, onClose }: { cp: CopilotState; drawer: boolean; onClose: () => void }) {
  // Grouped against the day the list was drawn; a conversation re-sorts only when it changes.
  const groups = useMemo(() => groupThreads(cp.threads, Date.now()), [cp.threads]);
  const ref = useRef<HTMLElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const deletedId = cp.deleted?.id ?? null;

  // The delete button leaves with its row: keep the keyboard on the list by moving to Undo.
  useEffect(() => {
    if (!deletedId) return;
    const lost = !document.activeElement || document.activeElement === document.body;
    if (lost) undoRef.current?.focus();
  }, [deletedId]);

  useEffect(() => {
    if (drawer) ref.current?.querySelector<HTMLElement>("button")?.focus();
  }, [drawer]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (!drawer) return;
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    // Keep Tab inside the open drawer.
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>("button:not(:disabled)") ?? []);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  const pick = (run: () => void) => () => {
    run();
    if (drawer) onClose();
  };

  return (
    <aside
      ref={ref}
      className={`aqk-side ${drawer ? "is-open" : ""}`}
      aria-label="Conversations"
      role={drawer ? "dialog" : undefined}
      aria-modal={drawer || undefined}
      onKeyDown={onKeyDown}
    >
      <div className="aqk-side-head">
        <button type="button" className="aqk-new" onClick={pick(cp.newChat)} aria-pressed={cp.activeId === null}>
          <PlusIcon />
          New chat
        </button>
        {drawer && (
          <button type="button" className="aqk-side-close" onClick={onClose} aria-label="Close conversations">
            <CloseIcon />
          </button>
        )}
      </div>
      <nav className="aqk-side-scroll">
        {groups.map((g) => (
          <section key={g.label} className="aqk-group">
            <h3>{g.label}</h3>
            <ul>
              {g.items.map((t) => {
                const active = t.id === cp.activeId;
                return (
                  <li key={t.id} className={active ? "is-active" : undefined}>
                    <button type="button" className="aqk-hist" aria-current={active ? "true" : undefined} onClick={pick(() => cp.selectChat(t.id))} title={t.title}>
                      {t.title || "Conversation"}
                    </button>
                    <button type="button" className="aqk-hist-del" onClick={() => cp.deleteChat(t.id)} aria-label={`Delete conversation: ${t.title}`} title="Delete this conversation">
                      <CloseIcon />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </nav>
      <div className="aqk-undo" role="status">
        {cp.deleted && (
          <>
            <span>Conversation deleted</span>
            <button ref={undoRef} type="button" className="aqk-undo-btn" onClick={cp.undoDelete}>
              Undo
            </button>
          </>
        )}
      </div>
    </aside>
  );
}

/* ---------------------------------------------------------------- page */

const conditionClass = (c: string) => (c === "Critical" ? "is-crit" : c === "Alert" ? "is-warn" : "");

/** The scope's numbers under the title: health and condition for a machine, the line's size for the full line. */
function ScopeFacts({ h, onOpen }: { h: CopilotHeader; onOpen?: () => void }) {
  return (
    <p className="aqk-context">
      <span>{h.label}</span>
      {h.machineCount !== null && (
        <span>
          <b className="aqk-num">{h.machineCount}</b> machines sending live data
        </span>
      )}
      {h.overall !== null && (
        <span>
          Health score <b className="aqk-num">{h.overall}%</b>
        </span>
      )}
      {h.condition && <span className={`aqk-cond ${conditionClass(h.condition)}`}>{h.condition}</span>}
      {h.openFindings !== null && (
        <span className={h.openFindings > 0 ? "aqk-cond is-warn" : undefined}>
          <b className="aqk-num">{h.openFindings}</b> open problems
        </span>
      )}
      {h.signalCount !== null && (
        <span>
          <b className="aqk-num">{h.signalCount}</b> measurements
        </span>
      )}
      {h.ruleCount !== null && (
        <span>
          <b className="aqk-num">{h.ruleCount}</b> automatic checks
        </span>
      )}
      {h.machineId && onOpen && (
        <span>
          <button type="button" className="aqk-open" onClick={onOpen}>
            Open in Assets
          </button>
        </span>
      )}
    </p>
  );
}

export function AskTab() {
  const cp = useCopilot();
  const { navigateToMachine } = useIndustrialData();
  const setViewing = cp?.setViewing;
  useEffect(() => {
    if (!setViewing) return;
    setViewing(true);
    return () => setViewing(false);
  }, [setViewing]);

  const list = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  /** Where the thread last scrolled itself; only scrolling up from there is the reader leaving the bottom. */
  const lastSet = useRef(0);
  const empty = !cp || cp.messages.length === 0;

  // Follow the newest message while the reader is at the bottom.
  useLayoutEffect(() => {
    const el = list.current;
    const content = inner.current;
    if (!el || !content) return;
    stick.current = true;
    const toEnd = () => {
      if (!stick.current) return;
      el.scrollTop = el.scrollHeight;
      lastSet.current = el.scrollTop;
    };
    toEnd();
    const ro = new ResizeObserver(toEnd);
    ro.observe(content);
    return () => ro.disconnect();
  }, [empty, cp?.activeId]);

  // The first live frame normally arrives within a second or two; past WAIT_MS, say it has not come.
  const waiting = !cp?.ready || !cp.header;
  const [late, setLate] = useState(false);
  useEffect(() => {
    if (!waiting) return;
    const t = setTimeout(() => setLate(true), WAIT_MS);
    return () => {
      clearTimeout(t);
      setLate(false);
    };
  }, [waiting]);

  // Narrow screens: the conversation list opens as a drawer from the "Conversations" button.
  const [drawer, setDrawer] = useState(false);
  const drawerBtn = useRef<HTMLButtonElement>(null);
  const closeDrawer = useCallback(() => {
    setDrawer(false);
    drawerBtn.current?.focus();
  }, []);
  useEffect(() => {
    if (!drawer) return;
    // Widening past the breakpoint shows the list in place; the drawer is no longer needed.
    const mq = window.matchMedia(NARROW);
    const onChange = () => {
      if (!mq.matches) setDrawer(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [drawer]);

  if (!cp || waiting) {
    return (
      <div className="aqk-root">
        <div className="aqk-main">
          <div className="aqk-hero">
            <h1 className="aqk-hero-title">AssetIQ</h1>
            <p className="aqk-context" role="status">
              {late ? "Live data has not arrived yet. Questions can be asked as soon as the plant's readings load." : "Waiting for live data from the plant…"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const h = cp.header!;
  const send = (q: string) => {
    stick.current = true;
    cp.send(q);
  };
  const pick = () => {
    stick.current = true;
  };
  const placeholder = h.machineId ? `Ask a question about ${h.label} or one of its readings` : "Ask a question about the plant, a machine or a reading";
  const openInAssets = h.machineId ? () => navigateToMachine(h.machineId!, "diagnosis") : undefined;

  return (
    <div className="aqk-root">
      <History cp={cp} drawer={drawer} onClose={closeDrawer} />
      {drawer && <div className="aqk-scrim" aria-hidden="true" onClick={closeDrawer} />}

      <section className="aqk-main" aria-label="Conversation">
        <div className="aqk-mobile-bar">
          <button ref={drawerBtn} type="button" className="aqk-convs" aria-haspopup="dialog" aria-expanded={drawer} onClick={() => setDrawer(true)}>
            <ListIcon />
            Conversations
          </button>
        </div>
        {empty ? (
          <div className="aqk-hero">
            <h1 className="aqk-hero-title">What do you want to know?</h1>
            <ScopeFacts h={h} onOpen={openInAssets} />
            <Composer onSend={send} placeholder={placeholder} autoFocusKey={`new:${h.machineId ?? "line"}`} large />
            {cp.questions.length ? <QuestionList cp={cp} onPick={pick} /> : <Suggestions cp={cp} onPick={pick} wrap />}
          </div>
        ) : (
          <>
            <div
              ref={list}
              className="aqk-scroll"
              role="log"
              aria-live="polite"
              aria-relevant="additions"
              onScroll={(e) => {
                // A new answer can grow the thread faster than scroll events arrive, so distance from the
                // bottom alone would unstick it; the reader scrolling up is what does.
                const el = e.currentTarget;
                if (el.scrollHeight - el.scrollTop - el.clientHeight < 48) stick.current = true;
                else if (el.scrollTop < lastSet.current - 4) stick.current = false;
                lastSet.current = Math.min(lastSet.current, el.scrollTop);
              }}
            >
              <div ref={inner} className="aqk-thread">
                {cp.messages.map((m) =>
                  m.role === "user" ? (
                    <UserMessage key={m.id} msg={m} />
                  ) : m.role === "note" ? (
                    <div key={m.id} className="cp-note">
                      <CheckIcon /> {m.text}
                      {m.clock && <span>{m.clock}</span>}
                    </div>
                  ) : (
                    <AssistantMessage key={m.id} msg={m} doneActions={cp.doneActions} onAction={cp.onAction} />
                  ),
                )}
                {cp.thinking && (
                  <div className="aqk-thinking" role="status">
                    <i aria-hidden="true" />
                    Reading the plant&apos;s data…
                  </div>
                )}
              </div>
            </div>
            <div className="aqk-dock">
              <Suggestions cp={cp} onPick={pick} />
              <Composer onSend={send} placeholder={placeholder} autoFocusKey={`thread:${cp.activeId}`} />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
