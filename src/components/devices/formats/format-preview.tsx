"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FormNote, PillButton, PillNav, Table, type Column } from "@/components/ui";
import { SearchPill, StatusTag } from "@/components/assets/assets-shell-ui";
import { useEdge } from "@/providers/edge-context";
import { naturalCompare, parseMessage } from "@/lib/edge-format";
import type { EdgeFormat, ParsedReading, RawSample } from "@/types/edge";
import { JsonView, type JsonPath } from "./json-view";

/* ==========================================================================
   Live preview: run the format being edited over a captured broker message
   (or a pasted one) on every change.
   ========================================================================== */

const LISTEN_SECONDS = 60;
const READING_LIMIT = 200;
const SAMPLE_LIMIT = 80;

const nf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 6 });

function clock(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

function sampleKey(s: RawSample) {
  return `${s.brokerId}|${s.at}|${s.topic}`;
}

export function FormatPreview({
  format,
  pickLabel,
  onPick,
}: {
  format: EdgeFormat;
  /** Field the next JSON click fills (null: read-only). */
  pickLabel: string | null;
  onPick: ((path: JsonPath, root: unknown) => void) | null;
}) {
  const { registry, snapshot, fetchSamples, listen } = useEdge();
  const brokers = useMemo(() => registry?.brokers ?? [], [registry]);
  const [mode, setMode] = useState<"captured" | "paste">("captured");
  const [brokerId, setBrokerId] = useState<string>("all");
  const [samples, setSamples] = useState<RawSample[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [pasteTopic, setPasteTopic] = useState("");
  const [pastePayload, setPastePayload] = useState("");
  const [listenError, setListenError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const scopeId = brokerId === "all" ? undefined : brokerId;
  const brokerIds = useMemo(() => brokers.map((b) => b.id), [brokers]);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      // The samples endpoint is per broker; "All brokers" merges them, newest first.
      const ids = scopeId ? [scopeId] : brokerIds;
      const lists = await Promise.all(ids.map((id) => fetchSamples(id)));
      setSamples(lists.flat().sort((a, b) => Date.parse(b.at) - Date.parse(a.at)));
      setLoadError(null);
    } catch (err) {
      setLoadError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [fetchSamples, scopeId, brokerIds]);

  useEffect(() => {
    void load();
  }, [load]);

  // Listening: the broker to capture on, and the countdown from the runtime.
  const listenBroker = brokerId !== "all" ? brokerId : brokers.length === 1 ? brokers[0].id : null;
  const listenStatus = snapshot?.brokers.find((b) => b.brokerId === listenBroker);
  const until = listenStatus?.listening ? Date.parse(listenStatus.listening.until) : null;
  const remaining = until !== null ? Math.max(0, Math.ceil((until - now) / 1000)) : 0;
  const isListening = remaining > 0;

  useEffect(() => {
    if (!isListening) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    // New messages land in the sample store while listening.
    const poll = setInterval(() => void load(), 3000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [isListening, load]);

  const startListening = async () => {
    if (!listenBroker) return;
    setListenError(null);
    try {
      await listen(listenBroker, "#", LISTEN_SECONDS);
      setNow(Date.now());
    } catch (err) {
      setListenError((err as Error).message);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = samples ?? [];
    return (q ? list.filter((s) => s.topic.toLowerCase().includes(q) || s.payload.toLowerCase().includes(q)) : list).slice(0, SAMPLE_LIMIT);
  }, [samples, query]);

  // Each sample is matched against the format so the list shows what this format would take.
  const matches = useMemo(() => {
    const out = new Map<string, boolean>();
    for (const s of filtered) out.set(sampleKey(s), parseMessage(format, s.payload, { topic: s.topic }).matched);
    return out;
  }, [filtered, format]);

  const chosen = useMemo(() => {
    if (mode === "paste") return pastePayload || pasteTopic ? { topic: pasteTopic.trim(), payload: pastePayload } : null;
    const byKey = picked ? filtered.find((s) => sampleKey(s) === picked) : undefined;
    const s = byKey ?? filtered.find((x) => matches.get(sampleKey(x))) ?? filtered[0];
    return s ? { topic: s.topic, payload: s.payload, key: sampleKey(s), truncated: s.truncated } : null;
  }, [mode, pasteTopic, pastePayload, picked, filtered, matches]);

  const result = useMemo(() => (chosen ? parseMessage(format, chosen.payload, { topic: chosen.topic }) : null), [format, chosen]);

  const root = useMemo(() => {
    if (!chosen) return undefined;
    try {
      return JSON.parse(chosen.payload) as unknown;
    } catch {
      return undefined;
    }
  }, [chosen]);

  const brokerName = (id: string) => brokers.find((b) => b.id === id)?.name ?? id;

  return (
    <div className="fmt-preview">
      <div className="fmt-preview-head">
        <h2 className="ast-card-title">Preview</h2>
        <PillNav
          items={[
            { id: "captured", label: "Recorded" },
            { id: "paste", label: "Paste" },
          ]}
          activeId={mode}
          onChange={(id) => setMode(id as "captured" | "paste")}
        />
      </div>

      {mode === "captured" ? (
        <div className="fmt-source">
          <div className="fmt-source-bar">
            <span className="ui-select fmt-select">
              <select aria-label="Data connection" value={brokerId} onChange={(e) => setBrokerId(e.target.value)}>
                <option value="all">All data connections</option>
                {brokers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
            <SearchPill value={query} onChange={setQuery} placeholder="Search channel or message" label="Search recorded messages" />
            <PillButton variant="secondary" onClick={() => void load()} disabled={loading}>
              {loading ? "Loading…" : "Refresh"}
            </PillButton>
            <PillButton
              variant="secondary"
              onClick={() => void startListening()}
              disabled={!listenBroker || isListening}
              title={listenBroker ? `Listen to every channel on ${brokerName(listenBroker)} for ${LISTEN_SECONDS} s` : "Choose a data connection to listen on"}
            >
              {isListening ? `Listening · ${remaining} s` : `Listen ${LISTEN_SECONDS} s`}
            </PillButton>
          </div>
          {listenError && <FormNote tone="bad">{listenError}</FormNote>}
          {loadError ? (
            <FormNote tone="bad">Recorded messages could not be loaded. Try again.</FormNote>
          ) : samples === null ? (
            <p className="fmt-muted">Loading recorded messages…</p>
          ) : filtered.length === 0 ? (
            <p className="fmt-muted">
              {samples.length === 0
                ? listenBroker
                  ? `No messages recorded${scopeId ? ` on ${brokerName(scopeId)}` : ""}. Listen for ${LISTEN_SECONDS} s to record what the data collectors send, or paste a message.`
                  : "No messages captured. Choose a broker and listen, or paste a message."
                : "No captured message matches the filter."}
            </p>
          ) : (
            <ul className="fmt-samples" aria-label="Recorded messages">
              {filtered.map((s) => {
                const k = sampleKey(s);
                const ok = matches.get(k);
                return (
                  <li key={k}>
                    <button type="button" className="fmt-sample" aria-pressed={chosen && "key" in chosen ? chosen.key === k : false} onClick={() => setPicked(k)}>
                      <span className="ast-chip-dot" data-tone={ok ? "good" : "idle"} aria-hidden="true" />
                      <span className="fmt-sample-topic">{s.topic}</span>
                      <span className="fmt-sample-meta ast-num">
                        {brokers.length > 1 && brokerId === "all" ? `${brokerName(s.brokerId)} · ` : ""}
                        {clock(Date.parse(s.at))} · {nf.format(s.bytes)} B
                      </span>
                      <span className="fmt-sr">{ok ? "matches this format" : "does not match"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="fmt-source">
          <label className="fmt-label" htmlFor="fmt-paste-topic">
            Topic
          </label>
          <input id="fmt-paste-topic" className="ui-input" data-mono value={pasteTopic} spellCheck={false} onChange={(e) => setPasteTopic(e.target.value)} placeholder="plant/GW-01/data" />
          <label className="fmt-label" htmlFor="fmt-paste-payload">
            Payload
          </label>
          <textarea
            id="fmt-paste-payload"
            className="ui-input ui-textarea"
            data-mono
            rows={6}
            value={pastePayload}
            spellCheck={false}
            onChange={(e) => setPastePayload(e.target.value)}
            placeholder='{"readings":[{"channel":"TT101","value":23.4}]}'
          />
        </div>
      )}

      {!chosen || !result ? null : <Outcome result={result} topic={chosen.topic} />}

      {chosen && root !== undefined && typeof root === "object" && root !== null && (
        <section className="fmt-json-wrap" aria-label="Message content">
          <div className="fmt-json-head">
            <span className="fmt-label">Message content</span>
            {onPick && pickLabel && <span className="ast-caption">Click a key to fill {pickLabel}</span>}
          </div>
          <JsonView value={root} pickLabel={pickLabel ?? undefined} onPick={onPick ? (p) => onPick(p, root) : undefined} />
          {"truncated" in chosen && chosen.truncated && <p className="fmt-muted">Message cut off at 16 kB.</p>}
        </section>
      )}
      {chosen && (root === undefined || typeof root !== "object" || root === null) && chosen.payload && (
        <section className="fmt-json-wrap" aria-label="Message content">
          <span className="fmt-label">Message content (not a JSON object)</span>
          <pre className="fmt-json">{chosen.payload}</pre>
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- outcome
function Outcome({ result, topic }: { result: ReturnType<typeof parseMessage>; topic: string }) {
  const tree = useMemo(() => {
    const racks = new Map<string, Map<string, string[]>>();
    for (const r of result.readings) {
      const cards = racks.get(r.rack) ?? new Map<string, string[]>();
      cards.set(r.card, [...(cards.get(r.card) ?? []), r.channel]);
      racks.set(r.rack, cards);
    }
    return [...racks.entries()]
      .sort(([a], [b]) => naturalCompare(a, b))
      .map(([rack, cards]) => ({
        rack,
        cards: [...cards.entries()].sort(([a], [b]) => naturalCompare(a, b)).map(([card, ch]) => ({ card, channels: [...new Set(ch)].sort(naturalCompare) })),
      }));
  }, [result]);

  const cardCount = tree.reduce((n, r) => n + r.cards.length, 0);
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const captures = Object.entries(result.captures);

  const columns: Column<ParsedReading & { k: string }>[] = [
    { key: "rack", header: "Device", render: (r) => <span className="ast-num">{r.rack}</span> },
    { key: "card", header: "Card", render: (r) => <span className="ast-num">{r.card}</span> },
    { key: "channel", header: "Channel", render: (r) => <span className="ast-num">{r.channel}</span> },
    { key: "name", header: "Name", render: (r) => <span className="ast-cell-text">{r.name ?? <span className="ast-muted">—</span>}</span> },
    {
      key: "value",
      header: "Value",
      render: (r) => (
        <span className="ast-num fmt-value">
          {r.value !== null ? nf.format(r.value) : r.display ?? "—"}
          {r.unit && <span className="ast-unit">{r.unit}</span>}
        </span>
      ),
    },
    { key: "valid", header: "Quality", render: (r) => <StatusTag tone={r.valid ? "good" : "bad"} label={r.valid ? "Valid" : "Invalid"} /> },
    { key: "at", header: "Time", render: (r) => <span className="ast-num ast-muted">{r.at !== null ? clock(r.at) : "—"}</span> },
  ];

  return (
    <section className="fmt-outcome" aria-label="How the message is read" aria-live="polite">
      <div className="fmt-outcome-line">
        <StatusTag tone={result.matched ? "good" : "warn"} label={result.matched ? "Channel matches" : "Channel does not match"} />
        {captures.map(([k, v]) => (
          <span key={k} className="fmt-capture">
            <span className="ast-muted">{k}</span> <span className="ast-num">{v}</span>
          </span>
        ))}
        {!topic && <span className="ast-caption">No channel given</span>}
      </div>
      {result.errors.map((e) => (
        <FormNote key={e} tone={result.readings.length ? "warn" : "bad"}>
          {e}
        </FormNote>
      ))}
      {result.matched && result.readings.length === 0 && result.errors.length === 0 && (
        <FormNote tone="info">This message matches but carries no readings.</FormNote>
      )}
      {result.readings.length > 0 && (
        <>
          <p className="fmt-structure ast-num">
            {plural(tree.length, "rack")} · {plural(cardCount, "card")} · {plural(result.readings.length, "channel")}
          </p>
          <ul className="fmt-tree" aria-label="Structure">
            {tree.map((r) => (
              <li key={r.rack}>
                <span className="fmt-tree-rack">{r.rack}</span>
                <ul>
                  {r.cards.map((c) => (
                    <li key={c.card}>
                      <span className="fmt-tree-card">Card {c.card}</span>
                      <span className="fmt-tree-ch ast-num">{c.channels.join(" · ")}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <div className="fmt-readings">
            <Table
              className="ast-table"
              columns={columns}
              data={result.readings.slice(0, READING_LIMIT).map((r, i) => ({ ...r, k: `${i}` }))}
              keyExtractor={(r) => r.k}
            />
            {result.readings.length > READING_LIMIT && (
              <p className="fmt-muted">
                First {READING_LIMIT} of {nf.format(result.readings.length)} readings shown.
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
