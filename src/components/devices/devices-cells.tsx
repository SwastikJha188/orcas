"use client";

import React from "react";
import { StatusTag } from "@/components/assets/assets-shell-ui";
import type { ChannelRow } from "./devices-rows";
import { IconEdit } from "./hierarchy/edge-icons";

/* ==========================================================================
   Table cells shared by the Gateways and Machine mapping tables.
   Mono only for codes and numbers; names and words in the UI face.
   ========================================================================== */

export function Stack({ title, sub, mono }: { title: React.ReactNode; sub?: React.ReactNode; mono?: boolean }) {
  // Full text on hover when the cell cuts it short.
  const tip = [title, sub].filter((x) => typeof x === "string").join(" · ") || undefined;
  return (
    <span className="ast-cell-stack" title={tip}>
      <span className={mono ? "ast-cell-title ast-num" : "ast-cell-title"}>{title}</span>
      {sub && <span className="ast-cell-sub">{sub}</span>}
    </span>
  );
}

/** Card · channel, with the card's module type under it. */
export function PositionCell({ r }: { r: ChannelRow }) {
  return <Stack mono title={`${r.card.id} · ${r.ch.id}`} sub={r.card.cardType ?? undefined} />;
}

/** The machine sensor the channel feeds: tag and name, or what the payload calls it. */
export function SensorCell({ r }: { r: ChannelRow }) {
  if (r.tag) return <Stack mono title={r.tag} sub={r.ch.point?.name ?? undefined} />;
  return <Stack title={<span className="ast-muted">Not linked</span>} sub={r.ch.label ? `Sent as “${r.ch.label}”` : undefined} />;
}

export function ValueCell({ r }: { r: ChannelRow }) {
  if (r.value === null) return <span className="ast-muted">—</span>;
  return (
    <span className="ast-num dvp-value" data-tone={r.tone === "warn" || r.tone === "bad" ? r.tone : undefined}>
      {r.value}
      {r.unit && <span className="ast-unit"> {r.unit}</span>}
    </span>
  );
}

export function StatusCell({ r }: { r: ChannelRow }) {
  return <StatusTag tone={r.tone} label={r.status} />;
}

/** Row actions: link (or change the link) to a machine sensor; edit the point when there is one. */
export function ChannelActions({ r, onLink, onEdit }: { r: ChannelRow; onLink: (r: ChannelRow) => void; onEdit?: (r: ChannelRow) => void }) {
  return (
    <span className="dvp-actions">
      {!r.tag ? (
        <button
          type="button"
          className="dvp-link"
          onClick={(e) => {
            e.stopPropagation();
            onLink(r);
          }}
        >
          Link to machine
        </button>
      ) : (
        onEdit &&
        r.ch.point && (
          <button
            type="button"
            className="ast-icon-btn dvp-reveal"
            aria-label={`Edit channel ${r.card.id} · ${r.ch.id}`}
            title="Edit channel"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(r);
            }}
          >
            <IconEdit size={14} />
          </button>
        )
      )}
    </span>
  );
}
