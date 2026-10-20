"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FormNote, PillButton, Table, type Column } from "@/components/ui";
import { StatusTag } from "@/components/assets/assets-shell-ui";
import { useEdge } from "@/providers/edge-context";
import { topicMatchesFilter } from "@/lib/edge-format";
import { formatLocalTime } from "@/lib/time";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import type { EdgeGateway, RawSample } from "@/types/edge";
import type { ApiResponse } from "@/types/api";
import { type EdgeIndex, ago } from "../edge-model";
import { gatewayFormat } from "./edge-detect";
import { IconPlus } from "./edge-icons";
import { fmt } from "./edge-tree-model";

/* ==========================================================================
   Gateway › Topics — every MQTT filter the app subscribes to for this
   gateway: the one its data format implies, plus extra topics added here.
   Each row shows the newest message received on a matching topic.
   ========================================================================== */

const POLL_MS = 2000;
const MAX_TOPICS = 16;

interface TopicRow {
  filter: string;
  origin: "format" | "added";
  latest: RawSample | null;
  /** Distinct topics seen under the filter, and their message total. */
  topics: number;
  messages: number;
}

/** Same rules the server applies; checked here so a typo is caught before saving. */
export function filterProblem(filter: string, existing: string[] = []): string | null {
  if (!filter) return "Type a topic or a filter, e.g. plant/line1/+/data";
  if (filter.length > 512) return "At most 512 characters";
  const parts = filter.split("/");
  if (parts.some((p, i) => (p.includes("#") && (p !== "#" || i !== parts.length - 1)) || (p.includes("+") && p !== "+"))) {
    return "Wildcards must fill a whole level: + for one level, # only at the end";
  }
  if (parts[0] === "+" || parts[0] === "#" || filter.startsWith("$")) return "Start with a fixed topic level, not a wildcard or a $SYS topic";
  if (existing.includes(filter)) return "Already listening on this channel";
  return null;
}

function preview(payload: string): string {
  try {
    return JSON.stringify(JSON.parse(payload));
  } catch {
    return payload;
  }
}

function pretty(payload: string): string {
  try {
    return JSON.stringify(JSON.parse(payload), null, 2);
  } catch {
    return payload;
  }
}

export function GatewayTopics({ ix, gw, subscription, now }: { ix: EdgeIndex; gw: EdgeGateway; subscription: string; now: number }) {
  const { update } = useEdge();
  // Times are the plant's wall clock when the gateway's site has a zone.
  const { timeZone, label: zoneText } = useSiteTimeZone({ nodeId: gw.siteNodeId });
  const broker = gw.brokerId ? ix.brokers.get(gw.brokerId) : undefined;
  const connected = broker ? ix.brokerState.get(broker.id)?.state === "connected" : false;
  const filters = useMemo(() => [subscription, ...gw.topics.filter((t) => t !== subscription)], [subscription, gw.topics]);

  const [samples, setSamples] = useState<RawSample[]>([]);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  // Newest message per topic under any of this gateway's filters.
  const filterKey = filters.join("\n");
  useEffect(() => {
    if (!broker || !broker.enabled) {
      setSamples([]);
      return;
    }
    let alive = true;
    const qs = new URLSearchParams({ brokerId: broker.id });
    for (const f of filterKey.split("\n")) qs.append("filter", f);
    const load = async () => {
      try {
        const res = await fetch(`/api/mqtt/samples?${qs}`, { cache: "no-store" });
        const body = (await res.json()) as ApiResponse<RawSample[]>;
        if (alive && "data" in body) setSamples(body.data);
      } catch {
        /* the next poll retries */
      }
    };
    void load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [broker, filterKey]);

  const rows: TopicRow[] = filters.map((filter, i) => {
    const matching = samples.filter((s) => topicMatchesFilter(s.topic, filter));
    return {
      filter,
      origin: i === 0 ? "format" : "added",
      latest: matching[0] ?? null,
      topics: matching.length,
      messages: matching.reduce((n, s) => n + (s.count ?? 1), 0),
    };
  });

  const save = async (topics: string[], done: string) => {
    setSaving(true);
    setNote(null);
    try {
      await update("gateways", gw.id, { topics });
      setNote({ tone: "good", text: done });
      return true;
    } catch (err) {
      setNote({ tone: "bad", text: (err as Error).message });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const trimmed = draft.trim();
  const problem = trimmed ? filterProblem(trimmed, filters) : null;
  const full = gw.topics.length >= MAX_TOPICS;
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const issue = filterProblem(trimmed, filters);
    if (issue) return setNote({ tone: "bad", text: issue });
    if (await save([...gw.topics, trimmed], `Now listening on ${trimmed}`)) setDraft("");
  };
  const remove = (filter: string) => void save(gw.topics.filter((t) => t !== filter), `Stopped listening on ${filter}`);

  const columns: Column<TopicRow>[] = [
    {
      key: "filter",
      header: "Message channel (topic)",
      render: (r) => (
        <span className="ast-cell-stack">
          <code className="dv-code hx-topic-filter">{r.filter}</code>
          <span className="ast-cell-sub">{r.origin === "format" ? "From the message format" : "Added here"}</span>
        </span>
      ),
    },
    {
      key: "last",
      header: "Last message",
      render: (r) =>
        r.latest ? (
          <span className="ast-cell-stack">
            <span className="ast-num ast-cell-text" title={formatLocalTime(r.latest.at, { date: true, zone: true, timeZone })}>
              {formatLocalTime(r.latest.at, { timeZone })}
            </span>
            <span className="ast-cell-sub ast-num">{ago(r.latest.at, now)}</span>
          </span>
        ) : (
          <span className="ast-muted">{connected ? "Waiting" : "—"}</span>
        ),
    },
    {
      key: "count",
      header: "Messages",
      width: "110px",
      render: (r) =>
        r.latest ? (
          <span className="ast-cell-stack">
            <span className="ast-num ast-cell-text">{fmt(r.messages)}</span>
            <span className="ast-cell-sub ast-num">{r.topics === 1 ? "1 topic" : `${fmt(r.topics)} topics`}</span>
          </span>
        ) : (
          <span className="ast-muted">0</span>
        ),
    },
    {
      key: "payload",
      header: "Latest message",
      render: (r) =>
        r.latest ? (
          <span className="ast-cell-stack hx-topic-payload">
            <span className="ast-cell-sub hx-topic-from">{r.latest.topic}</span>
            <span className="ast-cell-text hx-topic-preview">{preview(r.latest.payload)}</span>
          </span>
        ) : (
          <span className="ast-muted">—</span>
        ),
    },
    {
      key: "action",
      header: "",
      width: "120px",
      render: (r) =>
        r.origin === "added" ? (
          <span className="mq-action" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <PillButton variant="secondary" className="mq-reveal" disabled={saving} onClick={() => remove(r.filter)} aria-label={`Stop listening on ${r.filter}`}>
              Unsubscribe
            </PillButton>
          </span>
        ) : null,
    },
  ];

  const opened = rows.find((r) => r.filter === open && r.latest);

  return (
    <section className="hx-section" aria-label="Message channels (topics)">
      <h2 className="ast-section-label">
        Message channels (topics)
        <span>
          listening on {filters.length}{broker ? ` via ${broker.name}` : ""} · times in {zoneText}
        </span>
      </h2>
      <div className="ast-card pg-table-card">
        {!broker ? (
          <div className="ast-empty">Link this data collector to a data connection (MQTT broker) to listen on its channels.</div>
        ) : (
          <>
            {!broker.enabled && <FormNote tone="warn">{broker.name} is switched off, so nothing is being received. Switch it on under Data connections.</FormNote>}
            <Table
              className="ast-table"
              columns={columns}
              data={rows}
              keyExtractor={(r) => r.filter}
              onRowClick={(r) => r.latest && setOpen((o) => (o === r.filter ? null : r.filter))}
              selectedKey={opened?.filter}
            />
            {opened?.latest && (
              <div className="hx-topic-detail">
                <div className="hx-topic-detail-head">
                  <code className="dv-code">{opened.latest.topic}</code>
                  <span className="ast-caption ast-num">
                    {formatLocalTime(opened.latest.at, { date: true, zone: true, timeZone })} · {fmt(opened.latest.bytes)} B
                    {opened.latest.truncated ? " · cut at 16 kB" : ""}
                  </span>
                </div>
                <pre className="hx-topic-json">{pretty(opened.latest.payload)}</pre>
              </div>
            )}
            <form className="hx-topic-add" onSubmit={add}>
              <input
                className="ui-input"
                data-mono
                aria-label="Message channel to listen on"
                placeholder={full ? `At most ${MAX_TOPICS} extra channels` : "Channel (topic), e.g. plant/line1/+/data"}
                value={draft}
                spellCheck={false}
                disabled={saving || full}
                aria-invalid={problem ? true : undefined}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setNote(null);
                }}
              />
              <PillButton type="submit" variant="primary" icon={<IconPlus size={13} />} disabled={saving || full || !trimmed || Boolean(problem)}>
                {saving ? "Saving…" : "Listen"}
              </PillButton>
            </form>
            {(problem || note) && (
              <div className="hx-topic-note">
                {problem ? <FormNote tone="warn">{problem}</FormNote> : note && <FormNote tone={note.tone}>{note.text}</FormNote>}
              </div>
            )}
            {gatewayFormat(ix, gw.formatId)?.kind !== "json" && gw.topics.length > 0 && (
              <p className="ast-caption hx-topic-hint">
                <StatusTag tone="idle" label="Kept as is" /> This data collector uses the standard ULTRON format, so messages on added channels outside {broker.topicPrefix} are
                kept as they arrive; pick a JSON message format to read them as readings.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
