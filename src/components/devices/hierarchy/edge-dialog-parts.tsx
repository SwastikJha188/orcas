"use client";

import React, { useId } from "react";
import { IconChevron } from "@/components/assets/assets-shell-ui";
import type { EdgeRegistry } from "@shared/types/edge";

/* ==========================================================================
   Shared by the gateway / source / point dialogs: field parsing, the select
   options every dialog offers and the "more settings" disclosure.
   (Deletes confirm with the shared ConfirmAction from @/components/ui.)
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

/** Moved to the shared ui kit; re-exported for the Devices dialogs. */
export { MoreFields } from "@/components/ui/more-fields";
