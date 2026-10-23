"use client";

/**
 * Which Claude model reads uploads (photos → drawings, documents → data).
 * The list and the current choice come from the server (ai_models); a change
 * applies to the next drawing or reading, and to "Draw again". A run already
 * going keeps the model it started with.
 */
import React, { useCallback, useEffect, useId, useState } from "react";
import { Select } from "@/components/ui";

interface AiModel {
  id: string;
  label: string;
  description: string;
}
interface Models {
  models: AiModel[];
  current: string;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error?.message ?? `${res.status} ${res.statusText}`);
  return body.data as T;
}

export function ModelSwitch({ onChange, disabled }: { onChange?: (id: string) => void; disabled?: boolean }) {
  const uid = useId();
  const [data, setData] = useState<Models | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await call<Models>("/api/onboarding/models"));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => void load(), [load]);

  if (!data || !data.models.length) return null;
  const current = data.models.find((m) => m.id === data.current);
  const pick = async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      setData(await call<Models>("/api/onboarding/models", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) }));
      onChange?.(id);
    } catch (e) {
      setError((e as Error).message);
    }
    setSaving(false);
  };

  return (
    <span className="cfg-model">
      <label className="cfg-model-label" htmlFor={`${uid}-model`}>
        Model
      </label>
      <Select
        id={`${uid}-model`}
        describedBy={`${uid}-note`}
        value={data.current}
        disabled={disabled || saving}
        onChange={(v) => void pick(v)}
        options={data.models.map((m) => ({ value: m.id, label: m.label }))}
      />
      <span className="cfg-model-note" id={`${uid}-note`}>
        {error ?? current?.description}
      </span>
    </span>
  );
}
