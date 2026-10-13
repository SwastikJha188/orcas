"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FormNote, Select } from "@/components/ui";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { formatLocalTime, timeZoneOptions, viewerTimeZone, zoneLabel } from "@/lib/time";
import type { ApiResponse } from "@/types/api";
import type { HierarchyNode } from "../assets-data";

/* ==========================================================================
   Plant › Time zone — the site's wall clock. Every timestamp of this plant's
   machines and gateways is shown in it, wherever the viewer is.
   ========================================================================== */

const VIEWER = "";

export function PlantTimeZone({ plant }: { plant: HierarchyNode }) {
  const { refreshData } = useIndustrialData();
  const zone = plant.timeZone ?? null;
  const [now, setNow] = useState(() => Date.now());
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ tone: "good" | "bad"; text: string } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const options = useMemo(
    () => [{ value: VIEWER, label: `Not set · each viewer's own zone (${viewerTimeZone().replace(/_/g, " ")})` }, ...timeZoneOptions([zone])],
    [zone],
  );

  const save = async (value: string) => {
    setSaving(true);
    setNote(null);
    try {
      const res = await fetch(`/api/hierarchy/${encodeURIComponent(plant.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ timeZone: value || null }),
      });
      const body = (await res.json().catch(() => null)) as ApiResponse<{ timeZone: string | null }> | null;
      if (!body || "error" in body) throw new Error(body && "error" in body ? body.error.message : `Save failed (${res.status}).`);
      await refreshData();
      setNote({ tone: "good", text: value ? `Times for this plant now show in ${zoneLabel(value)}.` : "Cleared: each viewer sees their own time zone." });
    } catch (err) {
      setNote({ tone: "bad", text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="hx-stat hx-tz" aria-label="Plant time zone">
      <div className="hx-tz-clock">
        <span className="hx-stat-label">Plant time</span>
        <span className="hx-stat-value ast-num">{formatLocalTime(now, { seconds: false, timeZone: zone })}</span>
        <span className="ast-caption ast-num">
          {formatLocalTime(now, { date: true, seconds: false, timeZone: zone }).split(",")[0]} · {zone ? zoneLabel(zone) : `${zoneLabel()} · your time`}
        </span>
      </div>
      <div className="hx-tz-field">
        <label className="hx-stat-label" htmlFor={`tz-${plant.id}`}>
          Time zone
        </label>
        <Select id={`tz-${plant.id}`} value={zone ?? VIEWER} options={options} disabled={saving} onChange={(v) => void save(v)} />
        <span className="ast-caption">
          {saving ? "Saving…" : "Timestamps of this plant's machines and gateways use this zone. Areas and machines inherit it."}
        </span>
        {note && <FormNote tone={note.tone}>{note.text}</FormNote>}
      </div>
    </section>
  );
}
