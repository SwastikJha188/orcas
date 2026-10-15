"use client";

import React, { useMemo, useState } from "react";
import { PillButton, Table, type Column } from "@/components/ui";
import { IconChevron, StatusTag } from "@/components/assets/assets-shell-ui";
import { useEdge } from "@/providers/edge-context";
import { ULTRON_FORMAT, joinTopic } from "@/lib/edge-format";
import type { EdgeFormat } from "@/types/edge";
import { FormatEditor } from "./format-editor";
import { draftFrom, fmtDate, usage, type FormatDraft } from "./format-model";
import "@/components/assets/assets-shell.css";

/* ==========================================================================
   Devices › Data formats — how each gateway's messages are read: the topic
   it publishes on and where rack, card, channel and value sit in the JSON.
   ========================================================================== */

const ULTRON_ROOT = "ultron/v1/gateways";

type Editing = { format: EdgeFormat | null; initial: FormatDraft; seq: number } | null;

function IconFormat() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 4H6a2 2 0 0 0-2 2v4l-2 2 2 2v4a2 2 0 0 0 2 2h2M16 4h2a2 2 0 0 1 2 2v4l2 2-2 2v4a2 2 0 0 1-2 2h-2" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function FormatsView({ sectionNav }: { sectionNav?: React.ReactNode }) {
  const { registry, error, refresh } = useEdge();
  const [editing, setEditing] = useState<Editing>(null);

  const formats = useMemo(() => {
    const list = registry?.formats ?? [];
    return list.some((f) => f.id === ULTRON_FORMAT.id) ? list : [ULTRON_FORMAT, ...list];
  }, [registry]);
  const used = useMemo(() => (registry ? usage(registry) : new Map<string, string[]>()), [registry]);

  const open = (format: EdgeFormat | null, initial?: FormatDraft) => setEditing((e) => ({ format, initial: initial ?? draftFrom(format), seq: (e?.seq ?? 0) + 1 }));

  const duplicate = (source: EdgeFormat | null) => (draft: FormatDraft) =>
    open(null, {
      ...draft,
      name: `Copy of ${draft.name || source?.name || "format"}`,
      // The built-in template is relative to the broker's prefix; custom ones are full topics.
      topic: source?.builtIn ? joinTopic(ULTRON_ROOT, draft.topic) : draft.topic,
    });

  const current = editing?.format ? formats.find((f) => f.id === editing.format!.id) ?? editing.format : null;

  return (
    <div className="pg-root ast-root fmt-root" aria-label="Data formats">
      <header className="ast-head pg-head">
        <div className="ast-head-main">
          <ol className="ast-crumbs" aria-label="Location">
            <li>Devices</li>
            <li>Data formats</li>
            {editing && <li>{current?.name ?? "New format"}</li>}
          </ol>
          <div className="ast-title-row">
            <h1 className="ast-title">Data formats</h1>
            {registry && <StatusTag tone="idle" label={`${formats.length} format${formats.length === 1 ? "" : "s"}`} />}
          </div>
        </div>
        {!editing && (
          <div className="pg-actions">
            <PillButton variant="primary" icon={<IconPlus />} onClick={() => open(null)} disabled={!registry}>
              New format
            </PillButton>
          </div>
        )}
      </header>

      {sectionNav}

      {!registry ? (
        error ? (
          <div className="ast-card ast-empty">
            <strong className="fmt-empty-title">Format registry unavailable. Retry.</strong>
            <PillButton variant="secondary" onClick={() => void refresh()}>
              Retry
            </PillButton>
          </div>
        ) : (
          <div className="ast-card ast-empty">Loading formats…</div>
        )
      ) : editing ? (
        <FormatEditor
          key={editing.seq}
          format={current}
          initial={editing.initial}
          gateways={current ? used.get(current.id) ?? [] : []}
          onClose={() => setEditing(null)}
          onDuplicate={duplicate(current)}
        />
      ) : (
        <FormatsTable formats={formats} used={used} onOpen={(f) => open(f)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- list
function FormatsTable({ formats, used, onOpen }: { formats: EdgeFormat[]; used: Map<string, string[]>; onOpen: (f: EdgeFormat) => void }) {
  const columns: Column<EdgeFormat>[] = [
    {
      key: "name",
      header: "Format",
      render: (f) => (
        <span className="fmt-lead">
          <span className="ast-badge" data-tone={f.builtIn ? "info" : undefined}>
            <IconFormat />
          </span>
          <span className="ast-cell-stack">
            <span className="ast-cell-title">{f.name}</span>
            {f.description && (
              <span className="ast-cell-sub fmt-desc" title={f.description}>
                {f.description}
              </span>
            )}
          </span>
        </span>
      ),
    },
    {
      key: "kind",
      header: "Kind",
      render: (f) => (f.builtIn ? <StatusTag tone="info" label="Built in" /> : <span className="ast-cell-text">JSON</span>),
    },
    {
      key: "topic",
      header: "Topic template",
      render: (f) => (
        <span className="ast-cell-stack">
          <span className="fmt-mono">{f.builtIn ? `…/${f.topic}` : f.topic}</span>
          {f.builtIn && <span className="ast-cell-sub">Under each broker&rsquo;s topic prefix</span>}
        </span>
      ),
    },
    { key: "records", header: "Records", render: (f) => <span className="fmt-mono">{f.records || <span className="ast-muted">Whole payload</span>}</span> },
    {
      key: "gateways",
      header: "Gateways",
      render: (f) => {
        const codes = used.get(f.id) ?? [];
        if (codes.length === 0) return <span className="ast-muted">None</span>;
        return (
          <span className="ast-cell-stack">
            <span className="ast-cell-text ast-num">
              {codes.length} gateway{codes.length === 1 ? "" : "s"}
            </span>
            <span className="ast-cell-sub" title={codes.join(", ")}>
              {codes.slice(0, 3).join(", ")}
              {codes.length > 3 ? ` +${codes.length - 3}` : ""}
            </span>
          </span>
        );
      },
    },
    { key: "updated", header: "Updated", render: (f) => <span className="ast-num ast-muted">{f.builtIn ? "—" : fmtDate(f.updatedAt)}</span> },
    {
      key: "open",
      header: "",
      width: "40px",
      render: () => (
        <span className="pg-chev" aria-hidden="true">
          <IconChevron />
        </span>
      ),
    },
  ];

  return (
    <>
      <section className="ast-card pg-table-card fmt-list" aria-label="Formats">
        <Table className="ast-table" columns={columns} data={formats} keyExtractor={(f) => f.id} onRowClick={onOpen} />
      </section>
      {formats.length === 1 && (
        <p className="ast-caption fmt-note">
          Every gateway uses the built-in ULTRON contract. Add a format for gateways that publish their own JSON (Kepware, PLC bridges, custom
          firmware), then assign it to the gateway in Devices › Hierarchy.
        </p>
      )}
    </>
  );
}
