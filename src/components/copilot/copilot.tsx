"use client";

/**
 * AssetIQ chat pieces: the message renderers (answer text, evidence chips,
 * sparklines, action buttons) the AssetIQ Ask sheet draws its thread with.
 * Conversation state lives in `copilot-provider.tsx`; answers come from the
 * deterministic intent engine in `copilot-engine.ts` and are shown in full
 * the moment they are computed.
 */
import { memo } from "react";
import { ACTION } from "@/components/ui/status";
import type { ActionKind, ActionSpec, EvidenceChip, Spark } from "./copilot-engine";
import type { Msg } from "./copilot-provider";
import { displayName } from "@/lib/display-name";
import "./copilot.css";

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

export function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
export function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );
}
export function CheckIcon() {
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
    <span className={`cp-chip cp-chip-${c.status.toLowerCase()}`} title={`${c.tag} · ${c.name}`}>
      <i className="cp-chip-dot" aria-hidden="true" />
      <span className="cp-chip-tag">{displayName(c.name)}</span>
      <span className="cp-chip-val">
        {c.value}
        {c.unit ? ` ${c.unit}` : ""}
      </span>
      {c.z !== null && <span className="cp-chip-z" title="How far this reading is from its expected value, in standard deviations (σ)">{fmtZ(c.z)}</span>}
    </span>
  );
}

function EvidenceSpark({ s }: { s: Spark }) {
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
        <span className="cp-spark-tag" title={s.tag}>{displayName(s.label)}</span>
        <span className="cp-spark-key">
          <i className="cp-key-line" aria-hidden="true" /> measured <i className="cp-key-dash" aria-hidden="true" /> expected
        </span>
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Messages                                                            */
/* ------------------------------------------------------------------ */

const ACTION_DONE: Record<ActionKind, string> = { mitigate: "Short-term fix sent", repair: "Repair scheduled", workorder: "Work order created", diagnosis: "Opened" };

export const AssistantMessage = memo(function AssistantMessage({
  msg,
  doneActions,
  onAction,
}: {
  msg: Msg;
  doneActions: Record<string, boolean>;
  onAction: (msgId: string, a: ActionSpec) => void;
}) {
  const a = msg.answer!;
  return (
    <div className="cp-msg cp-msg-ai">
      <div className="cp-body">
        {msg.proactive && (
          <span className={`cp-meta ${msg.severity ? `cp-meta-${msg.severity.toLowerCase()}` : ""}`}>
            <i className="cp-meta-dot" aria-hidden="true" />
            {msg.severity && msg.severity !== "Alert" ? msg.severity : "Alert"}
            {msg.clock && <span className="cp-meta-clock">{msg.clock}</span>}
          </span>
        )}
        <div className="cp-text">
          <RichText text={a.text} />
        </div>
        <div className="cp-extras">
          {a.spark && <EvidenceSpark s={a.spark} />}
          {a.evidence.length > 0 && (
            <div className="cp-evidence" aria-label="Readings behind this answer">
              {a.evidence.map((c) => (
                <Chip key={c.tag} c={c} />
              ))}
            </div>
          )}
          {a.actions.length > 0 && (
            <div className="cp-actions">
              {a.actions.map((x, i) => {
                const key = `${msg.id}:${x.kind}`;
                const done = doneActions[key];
                // One primary action per message; the rest stay quiet text actions.
                return (
                  <button
                    key={x.kind}
                    type="button"
                    className={`cp-btn ${i === 0 ? "cp-btn-primary" : "cp-btn-text"}`}
                    disabled={done && x.kind !== "diagnosis"}
                    onClick={() => onAction(msg.id, x)}
                  >
                    {done && x.kind !== "diagnosis" ? (
                      <>
                        <CheckIcon /> {ACTION_DONE[x.kind]}
                      </>
                    ) : (
                      x.kind === "workorder" ? ACTION.workOrder : x.label
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export const UserMessage = memo(function UserMessage({ msg }: { msg: Msg }) {
  return (
    <div className="cp-msg cp-msg-user">
      <div className="cp-user-bubble">{msg.text}</div>
    </div>
  );
});
