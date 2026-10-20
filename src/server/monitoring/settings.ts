/**
 * System settings (table `system_settings`): operating parameters of the
 * monitoring pipeline. Read through a short cache so a change in the database
 * takes effect within a minute without a restart.
 */
import { query } from "@/server/db";

export type SettingKey =
  | "readings.publish_period_s"
  | "readings.raw_keep_h"
  | "readings.hourly_keep_d"
  | "readings.stale_factor"
  | "evaluation.period_s"
  | "evaluation.trend_window_h"
  | "evaluation.deviation_samples"
  | "evaluation.clear_samples"
  | "evaluation.change_fraction"
  | "evaluation.change_clear_fraction"
  | "evaluation.min_trend_samples"
  | "evaluation.unreliable_samples"
  | "evaluation.state_raise_samples"
  | "evaluation.state_clear_samples"
  | "reference.derive_sigma"
  | "reference.min_samples"
  | "health.sample_keep_h"
  | "auth.session_days"
  | "health.bucket_s";

const TTL_MS = 60_000;
const g = globalThis as typeof globalThis & { __ultronSettings?: { at: number; values: Map<string, number> } };

export class MissingSettingError extends Error {}

export async function loadSettings(force = false): Promise<Map<string, number>> {
  const hit = g.__ultronSettings;
  if (!force && hit && Date.now() - hit.at < TTL_MS) return hit.values;
  const res = await query<{ key: string; value: number }>("SELECT key, value FROM system_settings");
  const values = new Map(res.rows.map((r) => [r.key, Number(r.value)]));
  g.__ultronSettings = { at: Date.now(), values };
  return values;
}

/** A setting's value; throws when the row is missing (never falls back to a compiled default). */
export async function setting(key: SettingKey): Promise<number> {
  const v = (await loadSettings()).get(key);
  if (v === undefined || !Number.isFinite(v)) throw new MissingSettingError(`system setting "${key}" is not configured`);
  return v;
}

export async function listSettings(): Promise<Array<{ key: string; value: number; unit: string | null; description: string; updatedAt: string }>> {
  const res = await query<{ key: string; value: number; unit: string | null; description: string; updated_at: Date }>(
    `SELECT s.key, s.value, u.symbol AS unit, s.description, s.updated_at FROM system_settings s LEFT JOIN units u ON u.id = s.unit_id ORDER BY s.key`,
  );
  return res.rows.map((r) => ({ key: r.key, value: Number(r.value), unit: r.unit, description: r.description, updatedAt: r.updated_at.toISOString() }));
}

export async function updateSetting(key: string, value: number): Promise<void> {
  const res = await query("UPDATE system_settings SET value = $2, updated_at = NOW() WHERE key = $1", [key, value]);
  if (!res.rowCount) throw new MissingSettingError(`unknown system setting "${key}"`);
  g.__ultronSettings = undefined;
}
