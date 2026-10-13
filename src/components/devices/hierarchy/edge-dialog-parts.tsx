"use client";

import React, { useEffect, useState } from "react";
import { PillButton } from "@/components/ui";
import type { EdgeRegistry } from "@/types/edge";

/* ==========================================================================
   Shared by the gateway / source / point dialogs: two-step delete, field
   parsing and the select options every dialog offers.
   ========================================================================== */

/** Same rule as the server: codes are MQTT topic segments. */
export const CODE_RULE = /^[^/#+\s]+$/;
export const CODE_RULE_TEXT = "No spaces, “/”, “#” or “+” (it is a topic segment)";

/** Trimmed text, or null when empty. */
export const textOrNull = (v: string): string | null => (v.trim() ? v.trim() : null);

/** Parsed number, null when empty, NaN when not a number. */
export function numberOrNull(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

export const str = (v: string | number | null | undefined): string => (v === null || v === undefined ? "" : String(v));

export function machineOptions(registry: EdgeRegistry) {
  return [
    { value: "", label: "None" },
    ...[...registry.machines].sort((a, b) => a.id.localeCompare(b.id)).map((m) => ({ value: m.id, label: `${m.id} · ${m.name}` })),
  ];
}

/**
 * Delete with a confirm step: the first click asks ("Delete gateway and its
 * 4 sources?"), the second deletes. The question lapses after 5 s.
 */
export function DeleteConfirm({ label, question, onDelete, disabled }: { label: string; question: string; onDelete: () => void; disabled?: boolean }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 5000);
    return () => window.clearTimeout(t);
  }, [armed]);
  return (
    <PillButton
      variant="secondary"
      className="dv-danger"
      data-armed={armed || undefined}
      disabled={disabled}
      aria-live="polite"
      onClick={() => {
        if (armed) {
          setArmed(false);
          onDelete();
        } else setArmed(true);
      }}
    >
      {armed ? question : label}
    </PillButton>
  );
}
