"use client";

/**
 * ULTRON Copilot: launcher + right-side glass drawer.
 *
 * A mock assistant over the live KLN-01 plant. The "AI" is the deterministic
 * intent engine in `copilot-engine.ts`; this file owns the chat UI, the
 * thinking / streaming animation, evidence chips, sparklines and action
 * buttons. Mounted once in the top bar.
 */
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useKilnSimulation } from "@/providers/kiln-simulation-context";
import { activeRules, ask, pendingRules, proactiveInsight, suggestions, type ActionKind, type ActionSpec, type CopilotAnswer, type EvidenceChip, type Focus, type Spark } from "./copilot-engine";
import "./copilot.css";

/* ------------------------------------------------------------------ */
/* Types & helpers                                                     */
/* ------------------------------------------------------------------ */

interface Msg {
  id: string;
  role: "user" | "assistant" | "note";
  text: string;
  answer?: CopilotAnswer;
  fresh?: boolean;
  proactive?: boolean;
  clock?: string;
}

type SimWithActions = {
  performAction?: (ruleId: string, action: "acknowledge" | "mitigate" | "repair") => void;
};

const STORE_KEY = "ultron-copilot-v1";
let uid = 0;
const nextId = () => `m${Date.now().toString(36)}${(uid++).toString(36)}`;

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function loadStore(): { messages: Msg[]; focus: Focus } | null {
  try {
    const raw = window.sessionStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { messages: Msg[]; focus: Focus };
    return { messages: p.messages.map((m) => ({ ...m, fresh: false })), focus: p.focus ?? null };
  } catch {
    return null;
  }
}
function saveStore(messages: Msg[], focus: Focus) {
  try {
    window.sessionStorage.setItem(STORE_KEY, JSON.stringify({ messages: messages.slice(-60).map((m) => ({ ...m, fresh: false })), focus }));
  } catch {
    /* storage unavailable: conversation stays in memory */
  }
}

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), summary, [href], [tabindex]:not([tabindex="-1"])';

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

function SparkIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9L12 3.5Z" />
      <path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Rich text, chips, sparkline                                         */
/* ------------------------------------------------------------------ */

function Inline({ text }: { text: string }) {
  const t = (text.match(/\*\*/g)?.length ?? 0) % 2 ? `${text}**` : text;
  const parts = t.split(/\*\*(.*?)\*\*/g);
  return (
    <>
      {parts.map((p, i) => (i % 2 ? <strong key={i}>{p}</strong> : <span key={i}>{p}</span>))}
    </>
  );
}

function RichText({ text }: { text: string }) {
  const blocks = text.split(/\n\n+/).filter((b) => b.trim());
  return (
    <>
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (lines.every((l) => l.startsWith("• "))) {
          return (
            <ul key={i} className="cp-list">
              {lines.map((l, j) => (
                <li key={j}>
                  <Inline text={l.slice(2)} />
                </li>
              ))}
            </ul>
          );
        }
        if (lines.length === 1 && lines[0].startsWith("• ")) {
          return (
            <ul key={i} className="cp-list">
              <li>
                <Inline text={lines[0].slice(2)} />
              </li>
            </ul>
          );
        }
        return (
          <p key={i}>
            <Inline text={b.replace(/\n/g, " ")} />
          </p>
        );
      })}
    </>
  );
}

const fmtZ = (z: number) => `${z >= 0 ? "+" : "−"}${Math.abs(z).toFixed(1)}σ`;

function Chip({ c }: { c: EvidenceChip }) {
  return (
    <span className={`cp-chip cp-chip-${c.status.toLowerCase()}`} title={c.name}>
      <i className="cp-chip-dot" aria-hidden="true" />
      <span className="cp-chip-tag">{c.tag}</span>
      <span className="cp-chip-val">
        {c.value}
        {c.unit ? ` ${c.unit}` : ""}
      </span>
      {c.z !== null && <span className="cp-chip-z">{fmtZ(c.z)}</span>}
    </span>
  );
}

function Sparkline({ s }: { s: Spark }) {
  const W = 300;
  const H = 52;
  const all = [...s.values, ...s.model];
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  const span0 = hi - lo || Math.abs(hi) * 0.1 || 1;
  const near = (v: number | null) => v !== null && v >= lo - span0 * 1.5 && v <= hi + span0 * 1.5;
  if (near(s.warn)) {
    lo = Math.min(lo, s.warn!);
    hi = Math.max(hi, s.warn!);
  }
  if (near(s.alarm)) {
    lo = Math.min(lo, s.alarm!);
    hi = Math.max(hi, s.alarm!);
  }
  const pad = (hi - lo) * 0.08 || 1;
  lo -= pad;
  hi += pad;
  const x = (i: number, n: number) => (n <= 1 ? 0 : (i / (n - 1)) * (W - 6)) + 3;
  const y = (v: number) => H - 3 - ((v - lo) / (hi - lo)) * (H - 6);
  const path = (v: number[]) => v.map((p, i) => `${i ? "L" : "M"}${x(i, v.length).toFixed(1)} ${y(p).toFixed(1)}`).join("");
  const last = s.values[s.values.length - 1];
  return (
    <figure className="cp-spark">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${s.label}, last ${s.values.length} minutes, now ${last} ${s.unit}`} preserveAspectRatio="none">
        {near(s.alarm) && <line x1="0" x2={W} y1={y(s.alarm!)} y2={y(s.alarm!)} className="cp-spark-alarm" />}
        {near(s.warn) && <line x1="0" x2={W} y1={y(s.warn!)} y2={y(s.warn!)} className="cp-spark-warn" />}
        {s.model.length > 1 && <path d={path(s.model)} className="cp-spark-model" />}
        <path d={path(s.values)} className="cp-spark-line" />
        <circle cx={x(s.values.length - 1, s.values.length)} cy={y(last)} r="3" className="cp-spark-dot" />
      </svg>
      <figcaption>
        <span className="cp-spark-tag">{s.tag}</span>
        <span>{s.label}</span>
        <span className="cp-spark-key">
          <i className="cp-key-line" /> actual <i className="cp-key-dash" /> model
        </span>
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Messages                                                            */
/* ------------------------------------------------------------------ */

const ACTION_DONE: Record<ActionKind, string> = { mitigate: "Mitigation sent", repair: "Repair scheduled", workorder: "Work order created", diagnosis: "Opened" };

const AssistantMessage = memo(function AssistantMessage({
  msg,
  doneActions,
  onDone,
  onAction,
}: {
  msg: Msg;
  doneActions: Record<string, boolean>;
  onDone: (id: string) => void;
  onAction: (msgId: string, a: ActionSpec) => void;
}) {
  const a = msg.answer!;
  const animate = !!msg.fresh && !reducedMotion();
  const tokens = useMemo(() => a.text.split(/(\s+)/), [a.text]);
  const [phase, setPhase] = useState<"thinking" | "stream" | "done">(animate ? (a.steps.length && !msg.proactive ? "thinking" : "stream") : "done");
  const [step, setStep] = useState(0);
  const [shown, setShown] = useState(animate ? 0 : tokens.length);

  useEffect(() => {
    if (!animate) {
      if (msg.fresh) onDone(msg.id);
      return;
    }
    if (phase !== "thinking") return;
    if (step >= a.steps.length) {
      const t = setTimeout(() => setPhase("stream"), 320);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep((s) => s + 1), 380 + (step === 0 ? 120 : 0));
    return () => clearTimeout(t);
  }, [animate, phase, step, a.steps.length, msg.fresh, msg.id, onDone]);

  useEffect(() => {
    if (!animate || phase !== "stream") return;
    if (shown >= tokens.length) {
      setPhase("done");
      onDone(msg.id);
      return;
    }
    const t = setTimeout(() => setShown((n) => Math.min(tokens.length, n + 3)), 28);
    return () => clearTimeout(t);
  }, [animate, phase, shown, tokens.length, msg.id, onDone]);

  const partial = phase === "done" ? a.text : tokens.slice(0, shown).join("");
  return (
    <div className="cp-msg cp-msg-ai" aria-busy={phase !== "done"}>
      <span className="cp-avatar" aria-hidden="true">
        <SparkIcon size={13} />
      </span>
      <div className="cp-body">
        {msg.proactive && <span className="cp-badge">Proactive insight</span>}
        {phase === "thinking" && (
          <ol className="cp-think" aria-label="Reasoning">
            {a.steps.slice(0, Math.min(step + 1, a.steps.length)).map((s, i) => (
              <li key={i} className={i < step ? "done" : "active"}>
                <span className="cp-step-ic">{i < step ? <CheckIcon /> : <i className="cp-spin" />}</span>
                {s}
              </li>
            ))}
          </ol>
        )}
        {phase !== "thinking" && (
          <>
            {a.steps.length > 0 && !msg.proactive && (
              <details className="cp-reasoning">
                <summary>Reasoned over {a.steps.length} steps</summary>
                <ol>
                  {a.steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </details>
            )}
            <div className="cp-text" aria-hidden={phase !== "done"}>
              <RichText text={partial} />
              {phase === "stream" && <span className="cp-caret" aria-hidden="true" />}
            </div>
            {phase === "done" && (
              <div className="cp-extras">
                {a.spark && <Sparkline s={a.spark} />}
                {a.evidence.length > 0 && (
                  <div className="cp-evidence" aria-label="Evidence">
                    {a.evidence.map((c) => (
                      <Chip key={c.tag} c={c} />
                    ))}
                  </div>
                )}
                {a.confidence !== null && (
                  <div className="cp-conf" aria-label={`Confidence ${a.confidence} percent`}>
                    <span>Confidence</span>
                    <span className="cp-conf-bar">
                      <i style={{ inlineSize: `${a.confidence}%` }} />
                    </span>
                    <span className="cp-conf-n">{a.confidence}%</span>
                  </div>
                )}
                {a.actions.length > 0 && (
                  <div className="cp-actions">
                    {a.actions.map((x) => {
                      const key = `${msg.id}:${x.kind}`;
                      const done = doneActions[key];
                      return (
                        <button
                          key={x.kind}
                          type="button"
                          className={`cp-btn ${x.kind === "mitigate" || (x.kind === "workorder" && !a.actions.some((y) => y.kind === "mitigate")) ? "cp-btn-primary" : ""}`}
                          disabled={done && x.kind !== "diagnosis"}
                          onClick={() => onAction(msg.id, x)}
                        >
                          {done && x.kind !== "diagnosis" ? (
                            <>
                              <CheckIcon /> {ACTION_DONE[x.kind]}
                            </>
                          ) : (
                            x.label
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});

const UserMessage = memo(function UserMessage({ msg }: { msg: Msg }) {
  return (
    <div className="cp-msg cp-msg-user">
      <div className="cp-user-bubble">{msg.text}</div>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Drawer                                                              */
/* ------------------------------------------------------------------ */

interface DrawerProps {
  messages: Msg[];
  chips: string[];
  doneActions: Record<string, boolean>;
  overall: number;
  condition: string;
  signalCount: number;
  ruleCount: number;
  onSend: (q: string) => void;
  onClear: () => void;
  onClose: () => void;
  onDone: (id: string) => void;
  onAction: (msgId: string, a: ActionSpec) => void;
}

function Drawer(p: DrawerProps) {
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const stick = useRef(true);
  const [draft, setDraft] = useState("");
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const r = requestAnimationFrame(() => setEntered(true));
    input.current?.focus();
    return () => cancelAnimationFrame(r);
  }, []);

  useLayoutEffect(() => {
    const el = list.current;
    const content = inner.current;
    if (!el || !content) return;
    const toEnd = () => {
      if (stick.current) el.scrollTop = el.scrollHeight;
    };
    toEnd();
    const ro = new ResizeObserver(toEnd);
    ro.observe(content);
    return () => ro.disconnect();
  }, []);

  const onKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      p.onClose();
      return;
    }
    if (e.key !== "Tab" || !root.current) return;
    const nodes = Array.from(root.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const act = document.activeElement;
    if (e.shiftKey && (act === first || !root.current.contains(act))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (act === last || !root.current.contains(act))) {
      e.preventDefault();
      first.focus();
    }
  };

  const submit = () => {
    const q = draft.trim();
    if (!q) return;
    stick.current = true;
    setDraft("");
    p.onSend(q);
  };

  return (
    <div className="cp-layer">
      <div className={`cp-scrim ${entered ? "in" : ""}`} onClick={p.onClose} aria-hidden="true" />
      <div ref={root} className={`cp-drawer ${entered ? "in" : ""}`} role="dialog" aria-modal="true" aria-labelledby="cp-title" onKeyDown={onKey}>
        <header className="cp-head">
          <span className="cp-avatar cp-avatar-lg" aria-hidden="true">
            <SparkIcon size={15} />
          </span>
          <div className="cp-head-text">
            <h2 id="cp-title">ULTRON Copilot</h2>
            <p>
              KLN-01 · health {p.overall}% · {p.condition.toLowerCase()}
            </p>
          </div>
          {p.messages.length > 0 && (
            <button type="button" className="cp-btn" onClick={p.onClear}>
              New chat
            </button>
          )}
          <button type="button" className="cp-icon-btn" onClick={p.onClose} aria-label="Close Copilot">
            <CloseIcon />
          </button>
        </header>

        <div
          ref={list}
          className="cp-scroll"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          onScroll={(e) => {
            const el = e.currentTarget;
            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
          }}
        >
          <div ref={inner} className="cp-thread">
            {p.messages.length === 0 && (
              <div className="cp-intro">
                <span className="cp-avatar cp-avatar-xl" aria-hidden="true">
                  <SparkIcon size={20} />
                </span>
                <h3>Ask about KLN-01</h3>
                <p>
                  I read the live plant: {p.signalCount} signals, the reference model and the {p.ruleCount}-rule library. Answers are computed from the current state, not canned.
                </p>
              </div>
            )}
            {p.messages.map((m) =>
              m.role === "user" ? (
                <UserMessage key={m.id} msg={m} />
              ) : m.role === "note" ? (
                <div key={m.id} className="cp-note">
                  <CheckIcon /> {m.text}
                  {m.clock && <span>{m.clock}</span>}
                </div>
              ) : (
                <AssistantMessage key={m.id} msg={m} doneActions={p.doneActions} onDone={p.onDone} onAction={p.onAction} />
              ),
            )}
          </div>
        </div>

        <footer className="cp-foot">
          <div className="cp-suggest" aria-label="Suggested questions">
            {p.chips.map((c) => (
              <button
                key={c}
                type="button"
                className="cp-btn cp-btn-sm"
                onClick={() => {
                  stick.current = true;
                  p.onSend(c);
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <form
            className="cp-composer"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <input ref={input} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask about the plant, a sensor or a rule" aria-label="Message to ULTRON Copilot" maxLength={400} autoComplete="off" />
            <button type="submit" className="cp-send" disabled={!draft.trim()} aria-label="Send">
              <SendIcon />
            </button>
          </form>
        </footer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Launcher (mounted in the top bar)                                   */
/* ------------------------------------------------------------------ */

export function CopilotLauncher({ onOpenDiagnosis }: { onOpenDiagnosis?: () => void }) {
  const sim = useKilnSimulation();
  const frame = sim?.frame ?? null;
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const simRef = useRef(sim);
  simRef.current = sim;

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [focus, setFocus] = useState<Focus>(null);
  const [doneActions, setDoneActions] = useState<Record<string, boolean>>({});
  const [nudges, setNudges] = useState<string[]>([]);
  const seen = useRef<Set<string>>(new Set());
  const focusRef = useRef<Focus>(null);
  focusRef.current = focus;
  const openRef = useRef(open);
  openRef.current = open;
  const btn = useRef<HTMLButtonElement>(null);
  const hydrated = useRef(false);

  // Restore the conversation after mount (sessionStorage is client-only).
  useEffect(() => {
    const s = loadStore();
    if (s) {
      setMessages(s.messages);
      setFocus(s.focus);
    }
    hydrated.current = true;
  }, []);
  useEffect(() => {
    if (hydrated.current) saveStore(messages, focus);
  }, [messages, focus]);

  const pushInsight = useCallback((ruleId: string) => {
    const f = frameRef.current;
    const rule = f?.rules.find((r) => r.id === ruleId);
    // A finding that has cleared since it was queued is no longer news.
    if (!f || !rule || rule.status !== "ACTIVE") return;
    const answer = proactiveInsight(rule, { frame: f, focus: null });
    setMessages((m) => [...m, { id: nextId(), role: "assistant", text: answer.text, answer, fresh: true, proactive: true }]);
    setFocus(answer.focus);
  }, []);

  // Proactive nudge: a rule that newly becomes ACTIVE.
  const activeKey = frame ? activeRules(frame).map((r) => r.id).join(",") : "";
  useEffect(() => {
    if (!frame) return;
    const act = activeRules(frame).map((r) => r.id);
    const fresh = act.filter((id) => !seen.current.has(id));
    // Keep the set in step so a rule that clears and returns nudges again.
    seen.current = new Set(act);
    // Queued nudges for rules that have since cleared are dropped (and their dot).
    setNudges((n) => (n.every((id) => act.includes(id)) ? n : n.filter((id) => act.includes(id))));
    if (!fresh.length) return;
    if (openRef.current) fresh.forEach(pushInsight);
    else setNudges((n) => Array.from(new Set([...n, ...fresh])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  const openDrawer = () => {
    setOpen(true);
    if (nudges.length) {
      nudges.forEach(pushInsight);
      setNudges([]);
    }
  };
  const closeDrawer = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => btn.current?.focus());
  }, []);

  const send = useCallback((q: string) => {
    const f = frameRef.current;
    if (!f) return;
    const answer = ask(q, { frame: f, focus: focusRef.current });
    setMessages((m) => [...m, { id: nextId(), role: "user", text: q }, { id: nextId(), role: "assistant", text: answer.text, answer, fresh: true }]);
    setFocus(answer.focus);
  }, []);

  const onDone = useCallback((id: string) => {
    setMessages((m) => m.map((x) => (x.id === id && x.fresh ? { ...x, fresh: false } : x)));
  }, []);

  const onAction = useCallback(
    (msgId: string, a: ActionSpec) => {
      const note = (text: string) => setMessages((m) => [...m, { id: nextId(), role: "note", text, clock: frameRef.current?.clock }]);
      const mark = () => setDoneActions((d) => ({ ...d, [`${msgId}:${a.kind}`]: true }));
      const s = simRef.current as unknown as SimWithActions | null;
      switch (a.kind) {
        case "mitigate":
          if (a.ruleId) s?.performAction?.(a.ruleId, "mitigate");
          mark();
          note(`Mitigation sent for ${a.ruleId}. Watching the evidence signals for recovery.`);
          break;
        case "repair":
          if (a.ruleId) s?.performAction?.(a.ruleId, "repair");
          mark();
          note(`Repair scheduled for ${a.ruleId}.`);
          break;
        case "workorder":
          if (a.ruleId) window.dispatchEvent(new CustomEvent("ultron:create-work-order", { detail: { ruleId: a.ruleId } }));
          mark();
          note(`Work order requested for ${a.ruleId}.`);
          break;
        case "diagnosis":
          window.dispatchEvent(new CustomEvent("ultron:open-diagnosis", { detail: { machineId: "KLN-01", ruleId: a.ruleId } }));
          onOpenDiagnosis?.();
          closeDrawer();
          break;
      }
    },
    [closeDrawer, onOpenDiagnosis],
  );

  const clear = useCallback(() => {
    setMessages([]);
    setFocus(null);
    setDoneActions({});
  }, []);

  const pendKey = frame ? pendingRules(frame).map((r) => r.id).join(",") : "";
  const chips = useMemo(() => (frameRef.current ? suggestions(frameRef.current, focus) : []), [activeKey, pendKey, focus]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!sim || !frame) return null;
  const critical = nudges.some((id) => frame.rules.find((r) => r.id === id)?.severity === "Critical");

  return (
    <>
      <button
        ref={btn}
        type="button"
        className={`cp-launcher ${open ? "open" : ""}`}
        onClick={() => (open ? closeDrawer() : openDrawer())}
        aria-label={nudges.length ? "Open ULTRON Copilot, new insight available" : "Open ULTRON Copilot"}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="ULTRON Copilot"
      >
        <SparkIcon />
        {nudges.length > 0 && !open && <i className={`cp-dot ${critical ? "crit" : ""}`} aria-hidden="true" />}
      </button>
      {open &&
        createPortal(
          <Drawer
            messages={messages}
            chips={chips}
            doneActions={doneActions}
            overall={frame.overall}
            condition={frame.condition}
            signalCount={Object.keys(frame.signals).length}
            ruleCount={frame.rules.length}
            onSend={send}
            onClear={clear}
            onClose={closeDrawer}
            onDone={onDone}
            onAction={onAction}
          />,
          document.body,
        )}
    </>
  );
}
