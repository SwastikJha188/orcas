"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useCopilot, type ChatThread, type CopilotHeader, type CopilotState, type ScopeOption } from "@/components/copilot/copilot-provider";
import { AssistantMessage, CheckIcon, CloseIcon, SendIcon, SparkIcon, UserMessage } from "@/components/copilot/copilot";
import { zonedParts } from "@/lib/time";
import "./assetiq-ask.css";

/* ==========================================================================
   AssetIQ · Ask — the conversation with the engine. Conversations on the
   left (one list per plant); an empty conversation opens on the composer,
   a running one reads top to bottom with the composer docked below it.
   Answers are computed from the live frame and the database, not canned.
   ========================================================================== */

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
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

/** What the answers speak for: the full line or one live machine. */
function ScopeSelect({ scopes, scope, onScope }: { scopes: ScopeOption[]; scope: string | null; onScope: (id: string | null) => void }) {
  return (
    <label className="aqk-scope">
      <span className="aqk-scope-key">Ask</span>
      <select value={scope ?? ""} onChange={(e) => onScope(e.target.value || null)} aria-label="Which machine the answer is about">
        {scopes.map((o) => (
          <option key={o.id ?? ""} value={o.id ?? ""}>
            {o.name}
          </option>
        ))}
      </select>
      <ChevronIcon />
    </label>
  );
}

function Composer({
  onSend,
  scope,
  autoFocusKey,
  large,
}: {
  onSend: (q: string) => void;
  scope: React.ReactNode;
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
        placeholder="Ask a question about the plant, a machine or a reading"
        aria-label="Message to AssetIQ"
        maxLength={400}
        autoComplete="off"
      />
      <div className="aqk-composer-bar">
        {scope}
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

/* ---------------------------------------------------------------- history */

function History({ cp }: { cp: CopilotState }) {
  // Grouped against the day the list was drawn; a conversation re-sorts only when it changes.
  const groups = useMemo(() => groupThreads(cp.threads, Date.now()), [cp.threads]);
  return (
    <aside className="aqk-side" aria-label="Conversations">
      <button type="button" className="aqk-new" onClick={cp.newChat} aria-pressed={cp.activeId === null}>
        <PlusIcon />
        New chat
      </button>
      <nav className="aqk-side-scroll">
        {groups.map((g) => (
          <section key={g.label} className="aqk-group">
            <h3>{g.label}</h3>
            <ul>
              {g.items.map((t) => {
                const active = t.id === cp.activeId;
                return (
                  <li key={t.id} className={active ? "is-active" : undefined}>
                    <button type="button" className="aqk-hist" aria-current={active ? "true" : undefined} onClick={() => cp.selectChat(t.id)} title={t.title}>
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
    </aside>
  );
}

/* ---------------------------------------------------------------- page */

const conditionClass = (c: string) => (c === "Critical" ? "is-crit" : c === "Alert" ? "is-warn" : "");

/** The scope's numbers under the title: health and condition for a machine, the line's size for the full line. */
function ScopeFacts({ h }: { h: CopilotHeader }) {
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
    </p>
  );
}

export function AskTab() {
  const cp = useCopilot();
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

  if (!cp?.ready || !cp.header) {
    return (
      <div className="aqk-root">
        <div className="aqk-main">
          <div className="aqk-hero">
            <span className="aqk-mark" aria-hidden="true">
              <SparkIcon size={26} />
            </span>
            <h1 className="aqk-hero-title">AssetIQ</h1>
            <p className="aqk-context">Waiting for live data from the plant…</p>
          </div>
        </div>
      </div>
    );
  }

  const h = cp.header;
  const send = (q: string) => {
    stick.current = true;
    cp.send(q);
  };
  const pick = () => {
    stick.current = true;
  };
  const scope = <ScopeSelect scopes={cp.scopes} scope={cp.scope} onScope={cp.setScope} />;

  return (
    <div className="aqk-root">
      <History cp={cp} />

      <section className="aqk-main" aria-label="Conversation">
        {empty ? (
          <div className="aqk-hero">
            <span className="aqk-mark" aria-hidden="true">
              <SparkIcon size={26} />
            </span>
            <h1 className="aqk-hero-title">What do you want to know?</h1>
            <ScopeFacts h={h} />
            <Composer onSend={send} scope={scope} autoFocusKey={`new:${h.machineId ?? "line"}`} large />
            <Suggestions cp={cp} onPick={pick} wrap />
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
                // Streaming grows the thread faster than scroll events arrive, so distance from the
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
                    <AssistantMessage key={m.id} msg={m} doneActions={cp.doneActions} onDone={cp.onDone} onAction={cp.onAction} />
                  ),
                )}
              </div>
            </div>
            <div className="aqk-dock">
              <Suggestions cp={cp} onPick={pick} />
              <Composer onSend={send} scope={scope} autoFocusKey={`thread:${cp.activeId}`} />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
