import crypto from "crypto";
import { getClient, query } from "@backend/db";
import { InputError, NotFoundError } from "@backend/errors";
import { decryptSapCredentials, encryptSapCredentials } from "./crypto";
import { forgetSapToken, readSapContinuation, readSapResource, testSapConnection, writeSapResource } from "./client";
import {
  SAP_RESOURCE_NAMES,
  type PublicSapConnection,
  type SapAuthType,
  type SapConnection,
  type SapConnectionInput,
  type SapCredentials,
  type SapResource,
  type SapResourceName,
} from "./types";
import { normalizeSapUrl } from "./url";
import { SIM_ORIGIN, SIM_TOKEN_PATH, isSimUrl } from "./sim/origin";
import { createSapSim, deleteSapSim, getSapSim, updateSapSim, type SapSimSettings } from "./sim/engine";

/**
 * SAP integration for one plant (ported from the ULTRON console's
 * src/server/sap): the connection, sync into the object cache, the outbox of
 * writes to SAP, the audit log, and the equipment / material mappings.
 */

const maxPageSize = () => Math.min(Math.max(Number(process.env.SAP_SYNC_PAGE_SIZE ?? 100), 1), 500);
const maxPages = () => Math.min(Math.max(Number(process.env.SAP_SYNC_MAX_PAGES ?? 5), 1), 25);
/** Seconds before the next try of a failed write, by attempt; the last try fails for good. */
const RETRY_DELAYS_S = [30, 120, 600, 1800, 3600];

const iso = (v: Date | string | null): string | null => (v ? new Date(v).toISOString() : null);
const clean = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/* ------------------------------------------------------------------ lookups */

export interface SapVocabulary {
  editions: { id: string; label: string }[];
  authTypes: { id: SapAuthType; label: string }[];
  resources: SapResource[];
}

export async function sapVocabulary(): Promise<SapVocabulary> {
  const [editions, authTypes, resources] = await Promise.all([
    query<{ id: string; label: string }>("SELECT id, label FROM sap_editions ORDER BY sort_order"),
    query<{ id: SapAuthType; label: string }>("SELECT id, label FROM sap_auth_types ORDER BY sort_order"),
    query<{ id: SapResourceName; label: string; api_name: string; default_path: string; key_fields: string[]; write_action: string | null }>(
      "SELECT id, label, api_name, default_path, key_fields, write_action FROM sap_resources ORDER BY sort_order",
    ),
  ]);
  return {
    editions: editions.rows,
    authTypes: authTypes.rows,
    resources: resources.rows.map((r) => ({ id: r.id, label: r.label, apiName: r.api_name, defaultPath: r.default_path, keyFields: r.key_fields, writeAction: r.write_action })),
  };
}

/* --------------------------------------------------------------- connection */

interface ConnectionRow {
  id: string;
  plant_id: string;
  name: string;
  edition_id: string;
  base_url: string;
  auth_type_id: SapAuthType;
  token_url: string | null;
  encrypted_credentials: string;
  sap_plant: string | null;
  notification_type: string;
  sync_every_min: number | null;
  publish_every_min: number | null;
  enabled: boolean;
  updated_at: Date;
}

async function loadConnection(plantId: string): Promise<{ row: ConnectionRow; overrides: Partial<Record<SapResourceName, string>> } | null> {
  const row = (await query<ConnectionRow>("SELECT * FROM sap_connections WHERE plant_id = $1", [plantId])).rows[0];
  if (!row) return null;
  const paths = await query<{ resource_id: SapResourceName; path: string }>("SELECT resource_id, path FROM sap_connection_paths WHERE connection_id = $1", [row.id]);
  return { row, overrides: Object.fromEntries(paths.rows.map((p) => [p.resource_id, p.path])) };
}

/** The plant's SAP connection with its credentials (server only). */
export async function getSapConnection(plantId: string): Promise<SapConnection> {
  const found = await loadConnection(plantId);
  if (!found) throw new NotFoundError("This plant has no SAP connection yet.");
  const { row, overrides } = found;
  if (!row.enabled) throw new InputError("The plant's SAP connection is switched off.");
  const { resources } = await sapVocabulary();
  const paths = Object.fromEntries(resources.map((r) => [r.id, overrides[r.id] ?? r.defaultPath])) as Record<SapResourceName, string>;
  return {
    id: row.id,
    plantId: row.plant_id,
    name: row.name,
    editionId: row.edition_id,
    baseUrl: row.base_url,
    authType: row.auth_type_id,
    tokenUrl: row.token_url,
    credentials: decryptSapCredentials(row.encrypted_credentials),
    sapPlant: row.sap_plant,
    notificationType: row.notification_type,
    enabled: row.enabled,
    paths,
  };
}

function credentialsComplete(authType: SapAuthType, c: SapCredentials, tokenUrl: string | null): boolean {
  return authType === "basic" ? Boolean(c.username && c.password) : Boolean(c.clientId && c.clientSecret && tokenUrl);
}

async function publicConnection(plantId: string): Promise<PublicSapConnection | null> {
  const found = await loadConnection(plantId);
  if (!found) return null;
  const { row, overrides } = found;
  // The credentials are only read to say whether they are complete; a key problem reads as missing.
  let creds: SapCredentials = {};
  try {
    creds = decryptSapCredentials(row.encrypted_credentials);
  } catch {
    /* shown as missing: the settings ask for them again */
  }
  const test = (
    await query<{ created_at: Date; status: string; message: string | null }>(
      "SELECT created_at, status, message FROM sap_audit_log WHERE connection_id = $1 AND action = 'connection.test' ORDER BY created_at DESC LIMIT 1",
      [row.id],
    )
  ).rows[0];
  return {
    id: row.id,
    plantId: row.plant_id,
    name: row.name,
    editionId: row.edition_id,
    baseUrl: row.base_url,
    authType: row.auth_type_id,
    tokenUrl: row.token_url,
    sapPlant: row.sap_plant,
    notificationType: row.notification_type,
    syncEveryMin: row.sync_every_min,
    publishEveryMin: row.publish_every_min,
    enabled: row.enabled,
    paths: overrides,
    credentialStatus: credentialsComplete(row.auth_type_id, creds, row.token_url) ? "configured" : "missing",
    credentialUser: (row.auth_type_id === "basic" ? creds.username : creds.clientId) ?? null,
    lastTest: test ? { at: iso(test.created_at)!, ok: test.status === "success", message: test.message } : null,
    updatedAt: iso(row.updated_at)!,
  };
}

export async function saveSapConnection(input: SapConnectionInput, userId: string | null): Promise<PublicSapConnection> {
  const plantId = clean(input.plantId);
  if (!plantId) throw new InputError("Pick the plant first.");
  const name = clean(input.name);
  if (!name) throw new InputError("Give the connection a name.");
  const vocab = await sapVocabulary();
  if (!vocab.editions.some((e) => e.id === input.editionId)) throw new InputError("Pick the SAP edition.");
  if (!vocab.authTypes.some((a) => a.id === input.authType)) throw new InputError("Pick how ULTRON signs in to SAP.");
  const existing = await loadConnection(plantId);
  let old: SapCredentials = {};
  if (existing) {
    try {
      old = decryptSapCredentials(existing.row.encrypted_credentials);
    } catch {
      /* the new input must then carry them all */
    }
  }
  const baseUrl = normalizeSapUrl(input.baseUrl ?? "", "SAP address");
  const tokenUrl = input.authType === "oauth_client_credentials" ? normalizeSapUrl(clean(input.tokenUrl) ?? existing?.row.token_url ?? "", "Token address") : null;
  // A blank secret keeps the stored one (the form never shows it).
  const credentials: SapCredentials =
    input.authType === "basic"
      ? { username: clean(input.username) ?? old.username, password: input.password || old.password }
      : { clientId: clean(input.clientId) ?? old.clientId, clientSecret: input.clientSecret || old.clientSecret, scope: clean(input.scope) ?? undefined };
  if (!credentialsComplete(input.authType, credentials, tokenUrl)) {
    throw new InputError(input.authType === "basic" ? "Enter the SAP user name and password." : "Enter the token address, client ID and client secret.");
  }
  const paths: [SapResourceName, string][] = [];
  for (const r of vocab.resources) {
    const p = clean(input.paths?.[r.id]);
    if (!p || p === r.defaultPath) continue;
    if (!p.startsWith("/") || p.startsWith("//")) throw new InputError(`The ${r.label.toLowerCase()} path must start with a single /.`);
    paths.push([r.id, p]);
  }
  const notificationType = clean(input.notificationType)?.toUpperCase() ?? "M1";
  if (notificationType.length > 4) throw new InputError("The notification type is at most 4 characters (for example M1).");
  const sapPlant = clean(input.sapPlant);
  if (sapPlant && sapPlant.length > 16) throw new InputError("The SAP plant code is at most 16 characters.");
  const every = (v: unknown, what: string): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = Math.round(Number(v));
    if (!Number.isFinite(n) || n < 1 || n > 1440) throw new InputError(`${what} must be between 1 and 1440 minutes, or blank.`);
    return n;
  };
  const syncEvery = input.syncEveryMin === undefined ? (existing?.row.sync_every_min ?? null) : every(input.syncEveryMin, "Automatic sync");
  const publishEvery = input.publishEveryMin === undefined ? (existing?.row.publish_every_min ?? null) : every(input.publishEveryMin, "Reading publish");

  const id = existing?.row.id ?? `sap-${plantId}`;
  const client = await getClient();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO sap_connections (id, plant_id, name, edition_id, base_url, auth_type_id, token_url, encrypted_credentials, sap_plant, notification_type, sync_every_min, publish_every_min, enabled, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14)
       ON CONFLICT (plant_id) DO UPDATE SET
         name = EXCLUDED.name, edition_id = EXCLUDED.edition_id, base_url = EXCLUDED.base_url, auth_type_id = EXCLUDED.auth_type_id,
         token_url = EXCLUDED.token_url, encrypted_credentials = EXCLUDED.encrypted_credentials, sap_plant = EXCLUDED.sap_plant,
         notification_type = EXCLUDED.notification_type, sync_every_min = EXCLUDED.sync_every_min, publish_every_min = EXCLUDED.publish_every_min,
         enabled = EXCLUDED.enabled, updated_by = EXCLUDED.updated_by, updated_at = now()`,
      [id, plantId, name, input.editionId, baseUrl, input.authType, tokenUrl, encryptSapCredentials(credentials), sapPlant, notificationType, syncEvery, publishEvery, input.enabled ?? true, userId],
    );
    await client.query("DELETE FROM sap_connection_paths WHERE connection_id = $1", [id]);
    for (const [resource, path] of paths) {
      await client.query("INSERT INTO sap_connection_paths (connection_id, resource_id, path) VALUES ($1,$2,$3)", [id, resource, path]);
    }
    await client.query(
      "INSERT INTO sap_audit_log (connection_id, user_id, action, status, message) VALUES ($1,$2,'connection.save','success',$3)",
      [id, userId, existing ? "Connection settings changed" : "Connection set up"],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  forgetSapToken(id);
  return (await publicConnection(plantId))!;
}

/* -------------------------------------------------------------------- audit */

async function writeAudit(input: {
  connectionId: string;
  userId: string | null;
  action: string;
  resource?: SapResourceName | null;
  objectKey?: string | null;
  direction?: "to_sap" | "from_sap" | "internal";
  status: "success" | "warning" | "failed";
  httpStatus?: number;
  durationMs?: number;
  correlationId?: string;
  message?: string | null;
}): Promise<void> {
  await query(
    `INSERT INTO sap_audit_log (connection_id, user_id, action, resource_id, object_key, direction, status, http_status, duration_ms, correlation_id, message)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      input.connectionId,
      input.userId,
      input.action,
      input.resource ?? null,
      input.objectKey ?? null,
      input.direction ?? "internal",
      input.status,
      input.httpStatus ?? null,
      input.durationMs ?? null,
      input.correlationId ?? null,
      input.message?.slice(0, 500) ?? null,
    ],
  );
}

/* --------------------------------------------------------------- test, sync */

export async function testSapPlant(plantId: string, userId: string | null): Promise<{ ok: boolean; message: string; latencyMs: number | null }> {
  const connection = await getSapConnection(plantId);
  const started = Date.now();
  try {
    const result = await testSapConnection(connection);
    const message = `Connected in ${result.durationMs} ms`;
    await writeAudit({ connectionId: connection.id, userId, action: "connection.test", resource: "equipment", direction: "from_sap", status: "success", httpStatus: result.status, durationMs: result.durationMs, correlationId: result.correlationId, message });
    return { ok: true, message, latencyMs: result.durationMs };
  } catch (error) {
    const message = error instanceof Error ? error.message : "The connection failed.";
    await writeAudit({ connectionId: connection.id, userId, action: "connection.test", direction: "from_sap", status: "failed", durationMs: Date.now() - started, message });
    return { ok: false, message, latencyMs: null };
  }
}

function recordKey(resource: SapResource, record: Record<string, unknown>, index: number): string {
  const parts = resource.keyFields.map((k) => record[k]).filter((v) => v !== undefined && v !== null && v !== "");
  return parts.length ? parts.map(String).join("|") : `${resource.id}-${index}`;
}

export interface SapSyncResult {
  runId: number;
  records: number;
  failed: { resource: SapResourceName; message: string }[];
}

export async function syncSapPlant(plantId: string, userId: string | null, scope?: SapResourceName[]): Promise<SapSyncResult> {
  const connection = await getSapConnection(plantId);
  const { resources } = await sapVocabulary();
  const wanted = resources.filter((r) => !scope?.length || scope.includes(r.id));
  const runId = Number(
    (await query<{ id: string }>("INSERT INTO sap_sync_runs (connection_id, requested_by) VALUES ($1,$2) RETURNING id", [connection.id, userId])).rows[0].id,
  );
  let total = 0;
  const failed: SapSyncResult["failed"] = [];
  // Three resources at a time: each waits on SAP, not on this server.
  await pool(wanted, 3, async (resource) => {
    try {
      let result = await readSapResource(connection, resource.id, { $top: String(maxPageSize()) });
      const records = [...result.data.records];
      let nextLink = result.data.nextLink;
      let pages = 1;
      while (nextLink && pages < maxPages()) {
        result = await readSapContinuation(connection, nextLink);
        records.push(...result.data.records);
        nextLink = result.data.nextLink;
        pages += 1;
      }
      // The cache holds what SAP has now: records SAP no longer returns go. A key read twice keeps its last record.
      const byKey = new Map(records.map((r, i) => [recordKey(resource, r, i), r]));
      const keys = [...byKey.keys()];
      const client = await getClient();
      try {
        await client.query("BEGIN");
        await client.query("DELETE FROM sap_object_cache WHERE connection_id = $1 AND resource_id = $2 AND NOT (object_key = ANY($3::text[]))", [connection.id, resource.id, keys]);
        // One statement for the whole resource: the database is a long round trip away.
        await client.query(
          `INSERT INTO sap_object_cache (connection_id, resource_id, object_key, payload, synced_at)
           SELECT $1, $2, k, p, now() FROM unnest($3::text[], $4::jsonb[]) AS x(k, p)
           ON CONFLICT (connection_id, resource_id, object_key) DO UPDATE SET payload = EXCLUDED.payload, synced_at = now()`,
          [connection.id, resource.id, keys, [...byKey.values()].map((r) => JSON.stringify(r))],
        );
        await client.query(
          "INSERT INTO sap_sync_run_resources (run_id, resource_id, records, pages, truncated) VALUES ($1,$2,$3,$4,$5)",
          [runId, resource.id, records.length, pages, Boolean(nextLink)],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
      total += records.length;
      await writeAudit({ connectionId: connection.id, userId, action: "resource.sync", resource: resource.id, direction: "from_sap", status: nextLink ? "warning" : "success", httpStatus: result.status, durationMs: result.durationMs, correlationId: result.correlationId, message: `${records.length} records${nextLink ? ", more left in SAP" : ""}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The sync failed.";
      failed.push({ resource: resource.id, message });
      await query("INSERT INTO sap_sync_run_resources (run_id, resource_id, error) VALUES ($1,$2,$3)", [runId, resource.id, message.slice(0, 500)]);
      await writeAudit({ connectionId: connection.id, userId, action: "resource.sync", resource: resource.id, direction: "from_sap", status: "failed", message });
    }
  });
  await query("UPDATE sap_sync_runs SET finished_at = now() WHERE id = $1", [runId]);
  return { runId, records: total, failed };
}

/* ------------------------------------------------------------------- outbox */

async function processOutboxJob(id: number, userId: string | null, opts: { quiet?: boolean } = {}): Promise<boolean> {
  const client = await getClient();
  let claimed: { connection_id: string; resource_id: SapResourceName; payload: Record<string, unknown>; attempts: number; correlation_id: string; plant_id: string } | null = null;
  try {
    await client.query("BEGIN");
    const res = await client.query(
      `SELECT o.connection_id, o.resource_id, o.payload, o.attempts, o.correlation_id, c.plant_id
         FROM sap_outbox o JOIN sap_connections c ON c.id = o.connection_id
        WHERE o.id = $1 AND o.state IN ('pending','retry') AND o.next_attempt_at <= now()
        FOR UPDATE OF o SKIP LOCKED`,
      [id],
    );
    claimed = res.rows[0] ?? null;
    if (claimed) await client.query("UPDATE sap_outbox SET state = 'processing', attempts = attempts + 1, updated_at = now() WHERE id = $1", [id]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  if (!claimed) return false;
  const attempts = claimed.attempts + 1;
  try {
    const connection = await getSapConnection(claimed.plant_id);
    const result = await writeSapResource(connection, claimed.resource_id, claimed.payload);
    const resource = (await sapVocabulary()).resources.find((r) => r.id === claimed!.resource_id)!;
    const objectKey = recordKey(resource, result.data, 0);
    await query("UPDATE sap_outbox SET state = 'completed', object_key = $2, last_error = NULL, processed_at = now(), updated_at = now() WHERE id = $1", [id, objectKey]);
    if (!opts.quiet) await writeAudit({ connectionId: claimed.connection_id, userId, action: resource.writeAction ?? "outbox.write", resource: claimed.resource_id, objectKey, direction: "to_sap", status: "success", httpStatus: result.status, durationMs: result.durationMs, correlationId: result.correlationId });
    return true;
  } catch (error) {
    const terminal = attempts > RETRY_DELAYS_S.length;
    const delay = RETRY_DELAYS_S[Math.min(attempts - 1, RETRY_DELAYS_S.length - 1)];
    const message = error instanceof Error ? error.message.slice(0, 500) : "The write to SAP failed.";
    await query(
      "UPDATE sap_outbox SET state = $2, last_error = $3, next_attempt_at = now() + make_interval(secs => $4), updated_at = now() WHERE id = $1",
      [id, terminal ? "failed" : "retry", message, delay],
    );
    if (!opts.quiet) await writeAudit({ connectionId: claimed.connection_id, userId, action: "outbox.write", resource: claimed.resource_id, direction: "to_sap", status: "failed", correlationId: claimed.correlation_id, message: `Try ${attempts}: ${message}` });
    return false;
  }
}

/** Sends the plant's writes that are due (pending, or waiting for their next try). */
export async function processDueSapOutbox(plantId: string, userId: string | null): Promise<number> {
  const due = await query<{ id: string }>(
    `SELECT o.id FROM sap_outbox o JOIN sap_connections c ON c.id = o.connection_id
      WHERE c.plant_id = $1 AND o.state IN ('pending','retry') AND o.next_attempt_at <= now()
      ORDER BY o.next_attempt_at, o.created_at LIMIT 25`,
    [plantId],
  );
  for (const job of due.rows) await processOutboxJob(Number(job.id), userId);
  return due.rows.length;
}

/** Puts a failed write back in the queue for one more round of tries. */
export async function retrySapWrite(plantId: string, outboxId: number, userId: string | null): Promise<void> {
  const res = await query(
    `UPDATE sap_outbox o SET state = 'retry', attempts = 0, next_attempt_at = now(), updated_at = now()
       FROM sap_connections c WHERE c.id = o.connection_id AND c.plant_id = $1 AND o.id = $2 AND o.state IN ('failed','retry')`,
    [plantId, outboxId],
  );
  if (!res.rowCount) throw new NotFoundError("That write is not waiting to be sent.");
  await processOutboxJob(outboxId, userId);
}

/**
 * Raises a maintenance notification in SAP for a problem ULTRON found on a
 * machine. The machine must be mapped to SAP equipment. One notification per
 * open problem: a second request for the same problem answers with the first.
 */
export async function raiseSapNotification(
  plantId: string,
  input: { machineId: string; ruleCode?: string | null; title: string; detail?: string | null; priority?: string | null },
  userId: string | null,
): Promise<{ id: number; state: string }> {
  const connection = await getSapConnection(plantId);
  const title = clean(input.title);
  if (!title) throw new InputError("Say what the notification is about.");
  const eq = (
    await query<{ sap_equipment_id: string; plant_id: string }>(
      "SELECT s.sap_equipment_id, m.plant_id FROM machines m LEFT JOIN sap_equipment_records s ON s.machine_id = m.id WHERE m.id = $1",
      [input.machineId],
    )
  ).rows[0];
  if (!eq || eq.plant_id !== plantId) throw new NotFoundError(`Machine '${input.machineId}' not found.`);
  if (!eq.sap_equipment_id) throw new InputError("Map this machine to its SAP equipment first (Equipment mapping).");
  const ruleCode = clean(input.ruleCode);
  if (ruleCode) {
    const open = (
      await query<{ id: string; state: string }>(
        "SELECT id, state FROM sap_outbox WHERE connection_id = $1 AND machine_id = $2 AND rule_code = $3 AND state <> 'failed' ORDER BY created_at DESC LIMIT 1",
        [connection.id, input.machineId, ruleCode],
      )
    ).rows[0];
    if (open) return { id: Number(open.id), state: open.state };
  }
  const priority = /^P([1-4])$/.exec(input.priority ?? "")?.[1];
  const payload: Record<string, unknown> = {
    NotificationType: connection.notificationType,
    NotificationText: title.slice(0, 40),
    TechnicalObject: eq.sap_equipment_id,
    TechObjIsEquipOrFuncnlLoc: "EAMS_EQUI",
    ...(priority ? { MaintPriority: priority } : {}),
    ...(connection.sapPlant ? { MaintenancePlanningPlant: connection.sapPlant } : {}),
    ...(clean(input.detail) ? { MaintNotifLongTextForEdit: clean(input.detail)!.slice(0, 4000) } : {}),
  };
  const row = (
    await query<{ id: string }>(
      `INSERT INTO sap_outbox (connection_id, resource_id, machine_id, rule_code, payload, idempotency_key, correlation_id, created_by)
       VALUES ($1,'notifications',$2,$3,$4::jsonb,$5,$6,$7) RETURNING id`,
      [connection.id, input.machineId, ruleCode, JSON.stringify(payload), crypto.randomUUID(), crypto.randomUUID(), userId],
    )
  ).rows[0];
  const id = Number(row.id);
  await processOutboxJob(id, userId);
  const state = (await query<{ state: string }>("SELECT state FROM sap_outbox WHERE id = $1", [id])).rows[0]?.state ?? "pending";
  return { id, state };
}

export interface SapShutdownOrder {
  machineId: string;
  description: string;
  start: Date;
  end: Date;
  /** One operation per work item (short text, planned hours when known). */
  operations: { text: string; hours: number | null }[];
}

/** A machine's order for a shutdown: queued, sent (with the order number) or failed (with why). */
export interface SapShutdownOrderState {
  machineId: string;
  state: string;
  order: string | null;
  error: string | null;
  at: string;
}

const v2Date = (d: Date) => `/Date(${Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())})/`;
const v2Time = (d: Date) => `PT${String(d.getUTCHours()).padStart(2, "0")}H${String(d.getUTCMinutes()).padStart(2, "0")}M${String(d.getUTCSeconds()).padStart(2, "0")}S`;

/**
 * Puts a shutdown's work list in SAP: one maintenance order (PM02, planned) per
 * machine on its SAP equipment, one operation per work item. A machine that
 * already has an order for this shutdown (sent or on its way) is skipped; a
 * failed one is sent again. Field names follow API_MAINTENANCEORDER_0002 and are
 * not yet checked against a live SAP system.
 */
export async function createSapShutdownOrders(plantId: string, shutdownId: number, orders: SapShutdownOrder[], userId: string | null): Promise<SapShutdownOrderState[]> {
  const connection = await getSapConnection(plantId);
  const eqs = await query<{ machine_id: string; sap_equipment_id: string | null; plant_id: string }>(
    "SELECT m.id AS machine_id, s.sap_equipment_id, m.plant_id FROM machines m LEFT JOIN sap_equipment_records s ON s.machine_id = m.id WHERE m.id = ANY($1::varchar[])",
    [orders.map((o) => o.machineId)],
  );
  const eqOf = new Map(eqs.rows.map((r) => [r.machine_id, r]));
  const ids: number[] = [];
  const skipped: SapShutdownOrderState[] = [];
  for (const o of orders) {
    const eq = eqOf.get(o.machineId);
    if (!eq || eq.plant_id !== plantId) throw new NotFoundError(`Machine '${o.machineId}' not found.`);
    if (!eq.sap_equipment_id) {
      skipped.push({ machineId: o.machineId, state: "not_mapped", order: null, error: "Map this machine to its SAP equipment first (Equipment mapping).", at: new Date().toISOString() });
      continue;
    }
    const open = (
      await query<{ id: string }>(
        "SELECT id FROM sap_outbox WHERE connection_id = $1 AND shutdown_id = $2 AND machine_id = $3 AND state <> 'failed' LIMIT 1",
        [connection.id, shutdownId, o.machineId],
      )
    ).rows[0];
    if (open) continue;
    const operations = o.operations.slice(0, 999).map((op, i) => ({
      MaintenanceOrderOperation: String((i + 1) * 10).padStart(4, "0"),
      OperationDescription: op.text.slice(0, 40),
      ...(op.hours ? { OperationPlannedWorkQuantity: op.hours.toFixed(1), OperationPlannedWorkQuantityUnit: "H" } : {}),
    }));
    const payload: Record<string, unknown> = {
      MaintenanceOrderType: "PM02",
      MaintenanceOrderDesc: o.description.slice(0, 40),
      Equipment: eq.sap_equipment_id,
      ...(connection.sapPlant ? { MaintenancePlanningPlant: connection.sapPlant } : {}),
      MaintOrdBasicStartDate: v2Date(o.start),
      MaintOrdBasicStartTime: v2Time(o.start),
      MaintOrdBasicEndDate: v2Date(o.end),
      MaintOrdBasicEndTime: v2Time(o.end),
      to_MaintenanceOrderOperation: { results: operations },
    };
    const row = (
      await query<{ id: string }>(
        `INSERT INTO sap_outbox (connection_id, resource_id, machine_id, shutdown_id, payload, idempotency_key, correlation_id, created_by)
         VALUES ($1,'maintenanceOrders',$2,$3,$4::jsonb,$5,$6,$7) RETURNING id`,
        [connection.id, o.machineId, shutdownId, JSON.stringify(payload), crypto.randomUUID(), crypto.randomUUID(), userId],
      )
    ).rows[0];
    ids.push(Number(row.id));
  }
  for (const id of ids) await processOutboxJob(id, userId);
  return [...(await sapShutdownOrders(shutdownId)), ...skipped];
}

/** The latest order write per machine for a shutdown. */
export async function sapShutdownOrders(shutdownId: number): Promise<SapShutdownOrderState[]> {
  const res = await query<{ machine_id: string; state: string; object_key: string | null; last_error: string | null; updated_at: Date }>(
    `SELECT DISTINCT ON (machine_id) machine_id, state, object_key, last_error, updated_at FROM sap_outbox
      WHERE shutdown_id = $1 AND resource_id = 'maintenanceOrders' ORDER BY machine_id, created_at DESC, id DESC`,
    [shutdownId],
  );
  return res.rows.map((r) => ({ machineId: r.machine_id, state: r.state, order: r.object_key, error: r.last_error, at: iso(r.updated_at)! }));
}

/* ----------------------------------------------------------------- mappings */

export interface SapEquipmentMapping {
  machineId: string;
  machineName: string;
  sapEquipmentId: string | null;
  functionalLocation: string | null;
  workCenter: string | null;
  costCenter: string | null;
  description: string | null;
}

export interface SapMaterialMapping {
  id: number;
  machineId: string;
  partId: string | null;
  partName: string | null;
  description: string;
  sapMaterial: string;
  storageLocation: string | null;
  requiredQuantity: number | null;
  unit: string | null;
}

async function equipmentMappings(plantId: string): Promise<SapEquipmentMapping[]> {
  const res = await query<{ id: string; name: string; sap_equipment_id: string | null; floc: string | null; work_center: string | null; cost_center: string | null; description: string | null }>(
    `SELECT m.id, m.name, s.sap_equipment_id, s.floc, s.work_center, s.cost_center, s.description
       FROM machines m LEFT JOIN sap_equipment_records s ON s.machine_id = m.id
      WHERE m.plant_id = $1 ORDER BY m.id`,
    [plantId],
  );
  return res.rows.map((r) => ({
    machineId: r.id,
    machineName: r.name,
    sapEquipmentId: r.sap_equipment_id,
    functionalLocation: r.floc,
    workCenter: r.work_center,
    costCenter: r.cost_center,
    description: r.description,
  }));
}

async function materialMappings(plantId: string): Promise<SapMaterialMapping[]> {
  const res = await query<{ id: string; machine_id: string; subassembly_id: string | null; part_name: string | null; description: string; sap_material: string; storage_location: string | null; required_quantity: number | null; unit: string | null }>(
    `SELECT mm.id, mm.machine_id, mm.subassembly_id, sa.name AS part_name, mm.description, mm.sap_material, mm.storage_location, mm.required_quantity, mm.unit
       FROM sap_material_mappings mm
       JOIN machines m ON m.id = mm.machine_id
       LEFT JOIN machine_subassemblies sa ON sa.id = mm.subassembly_id
      WHERE m.plant_id = $1 ORDER BY mm.machine_id, mm.description`,
    [plantId],
  );
  return res.rows.map((r) => ({
    id: Number(r.id),
    machineId: r.machine_id,
    partId: r.subassembly_id,
    partName: r.part_name,
    description: r.description,
    sapMaterial: r.sap_material,
    storageLocation: r.storage_location,
    requiredQuantity: r.required_quantity,
    unit: r.unit,
  }));
}

async function machineOfPlant(plantId: string, machineId: string): Promise<{ name: string }> {
  const m = (await query<{ name: string; plant_id: string }>("SELECT name, plant_id FROM machines WHERE id = $1", [machineId])).rows[0];
  if (!m || m.plant_id !== plantId) throw new NotFoundError(`Machine '${machineId}' not found.`);
  return m;
}

export async function saveEquipmentMapping(
  plantId: string,
  input: { machineId: string; sapEquipmentId: string; functionalLocation?: string | null; workCenter?: string | null; costCenter?: string | null },
  userId: string | null,
): Promise<void> {
  const machine = await machineOfPlant(plantId, input.machineId);
  const equipment = clean(input.sapEquipmentId);
  if (!equipment) throw new InputError("Enter the SAP equipment number.");
  try {
    await query(
      `INSERT INTO sap_equipment_records (sap_number, machine_id, sap_equipment_id, floc, description, work_center, cost_center, sync_state)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'Synced')
       ON CONFLICT (machine_id) DO UPDATE SET sap_equipment_id = EXCLUDED.sap_equipment_id, floc = EXCLUDED.floc,
         work_center = EXCLUDED.work_center, cost_center = EXCLUDED.cost_center`,
      [`SAP-${input.machineId}`, input.machineId, equipment, clean(input.functionalLocation), machine.name.toUpperCase(), clean(input.workCenter), clean(input.costCenter)],
    );
  } catch (error) {
    if (error instanceof Error && /duplicate key/.test(error.message)) throw new InputError("That SAP equipment number or functional location is already mapped to another machine.");
    throw error;
  }
  const connectionId = (await loadConnection(plantId))?.row.id;
  if (connectionId) await writeAudit({ connectionId, userId, action: "mapping.equipment", resource: "equipment", objectKey: `${input.machineId} → ${equipment}`, status: "success" });
}

export async function deleteEquipmentMapping(plantId: string, machineId: string, userId: string | null): Promise<void> {
  await machineOfPlant(plantId, machineId);
  await query("DELETE FROM sap_equipment_records WHERE machine_id = $1", [machineId]);
  const connectionId = (await loadConnection(plantId))?.row.id;
  if (connectionId) await writeAudit({ connectionId, userId, action: "mapping.equipment", resource: "equipment", objectKey: `${machineId} unmapped`, status: "success" });
}

export async function saveMaterialMapping(
  plantId: string,
  input: { machineId: string; partId?: string | null; description: string; sapMaterial: string; storageLocation?: string | null; requiredQuantity?: number | null; unit?: string | null },
  userId: string | null,
): Promise<void> {
  await machineOfPlant(plantId, input.machineId);
  const material = clean(input.sapMaterial)?.toUpperCase();
  const description = clean(input.description);
  if (!material) throw new InputError("Enter the SAP material number.");
  if (!description) throw new InputError("Say what the material is (for example, Drive-end bearing).");
  const qty = input.requiredQuantity === null || input.requiredQuantity === undefined ? null : Number(input.requiredQuantity);
  if (qty !== null && !(Number.isFinite(qty) && qty > 0)) throw new InputError("The quantity needed must be above 0.");
  const partId = clean(input.partId);
  if (partId) {
    const ok = await query(
      "SELECT 1 FROM machine_subassemblies sa JOIN machine_systems s ON s.id = sa.machine_system_ref_id WHERE sa.id = $1 AND s.machine_id = $2",
      [partId, input.machineId],
    );
    if (!ok.rowCount) throw new InputError("That part is not on this machine.");
  }
  await query(
    `INSERT INTO sap_material_mappings (machine_id, subassembly_id, description, sap_material, storage_location, required_quantity, unit, updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (machine_id, sap_material) DO UPDATE SET subassembly_id = EXCLUDED.subassembly_id, description = EXCLUDED.description,
       storage_location = EXCLUDED.storage_location, required_quantity = EXCLUDED.required_quantity, unit = EXCLUDED.unit,
       updated_by = EXCLUDED.updated_by, updated_at = now()`,
    [input.machineId, partId, description, material, clean(input.storageLocation)?.toUpperCase() ?? null, qty, clean(input.unit)?.toUpperCase() ?? null, userId],
  );
  const connectionId = (await loadConnection(plantId))?.row.id;
  if (connectionId) await writeAudit({ connectionId, userId, action: "mapping.material", resource: "materialStock", objectKey: `${input.machineId} → ${material}`, status: "success" });
}

export async function deleteMaterialMapping(plantId: string, id: number, userId: string | null): Promise<void> {
  const res = await query<{ machine_id: string; sap_material: string }>(
    `DELETE FROM sap_material_mappings mm USING machines m WHERE m.id = mm.machine_id AND m.plant_id = $1 AND mm.id = $2 RETURNING mm.machine_id, mm.sap_material`,
    [plantId, id],
  );
  const row = res.rows[0];
  if (!row) throw new NotFoundError("That material mapping no longer exists.");
  const connectionId = (await loadConnection(plantId))?.row.id;
  if (connectionId) await writeAudit({ connectionId, userId, action: "mapping.material", resource: "materialStock", objectKey: `${row.machine_id} → ${row.sap_material} removed`, status: "success" });
}

/* ---------------------------------------------------------------- dashboard */

export interface SapSyncRun {
  id: number;
  startedAt: string;
  finishedAt: string | null;
  requestedBy: string | null;
  records: number;
  failed: { resource: SapResourceName; message: string }[];
  truncated: SapResourceName[];
}

export interface SapOutboxJob {
  id: number;
  resource: SapResourceName;
  machineId: string | null;
  ruleCode: string | null;
  title: string | null;
  state: "pending" | "processing" | "retry" | "completed" | "failed";
  attempts: number;
  nextAttemptAt: string | null;
  lastError: string | null;
  objectKey: string | null;
  createdAt: string;
  createdBy: string | null;
  processedAt: string | null;
}

export interface SapAuditEntry {
  id: number;
  at: string;
  action: string;
  resource: SapResourceName | null;
  objectKey: string | null;
  direction: "to_sap" | "from_sap" | "internal";
  status: "success" | "warning" | "failed";
  httpStatus: number | null;
  durationMs: number | null;
  correlationId: string | null;
  message: string | null;
  user: string | null;
}

export interface SapDashboard {
  vocabulary: SapVocabulary;
  connection: PublicSapConnection | null;
  /** Latest cached records per resource (at most 200 each), with when they were read. */
  records: Record<SapResourceName, { syncedAt: string; payload: Record<string, unknown> }[]>;
  syncRuns: SapSyncRun[];
  outbox: SapOutboxJob[];
  audit: SapAuditEntry[];
  equipment: SapEquipmentMapping[];
  materials: SapMaterialMapping[];
  /** The plant's machine parts, for picking which part a material belongs to. */
  parts: { id: string; machineId: string; name: string }[];
  /** Every analog measurement of the plant and the SAP measuring point it is written to. */
  points: SapPointMapping[];
}

async function plantParts(plantId: string): Promise<SapDashboard["parts"]> {
  const res = await query<{ id: string; machine_id: string; name: string }>(
    `SELECT sa.id, s.machine_id, sa.name
       FROM machine_subassemblies sa
       JOIN machine_systems s ON s.id = sa.machine_system_ref_id
       JOIN machines m ON m.id = s.machine_id
      WHERE m.plant_id = $1 ORDER BY s.machine_id, sa.sort_order, sa.name`,
    [plantId],
  );
  return res.rows.map((r) => ({ id: r.id, machineId: r.machine_id, name: r.name }));
}

export async function sapDashboard(plantId: string): Promise<SapDashboard> {
  const [vocabulary, connection, equipment, materials, parts, points] = await Promise.all([sapVocabulary(), publicConnection(plantId), equipmentMappings(plantId), materialMappings(plantId), plantParts(plantId), pointMappings(plantId)]);
  const records = Object.fromEntries(SAP_RESOURCE_NAMES.map((r) => [r, []])) as unknown as SapDashboard["records"];
  if (!connection) return { vocabulary, connection, records, syncRuns: [], outbox: [], audit: [], equipment, materials, parts, points };
  const [cache, runs, outbox, audit] = await Promise.all([
    query<{ resource_id: SapResourceName; payload: Record<string, unknown>; synced_at: Date }>(
      `SELECT resource_id, payload, synced_at FROM (
         SELECT resource_id, payload, synced_at, row_number() OVER (PARTITION BY resource_id ORDER BY synced_at DESC, object_key) AS n
           FROM sap_object_cache WHERE connection_id = $1) r
        WHERE n <= 200 ORDER BY resource_id, n`,
      [connection.id],
    ),
    query<{ id: string; started_at: Date; finished_at: Date | null; requested_by: string | null; records: number; failed: { resource: SapResourceName; message: string }[] | null; truncated: SapResourceName[] | null }>(
      `SELECT r.id, r.started_at, r.finished_at, u.full_name AS requested_by,
              COALESCE(SUM(x.records), 0)::int AS records,
              json_agg(json_build_object('resource', x.resource_id, 'message', x.error)) FILTER (WHERE x.error IS NOT NULL) AS failed,
              array_agg(x.resource_id) FILTER (WHERE x.truncated) AS truncated
         FROM sap_sync_runs r
         LEFT JOIN users u ON u.id = r.requested_by
         LEFT JOIN sap_sync_run_resources x ON x.run_id = r.id
        WHERE r.connection_id = $1
        GROUP BY r.id, u.full_name ORDER BY r.started_at DESC LIMIT 10`,
      [connection.id],
    ),
    query<{ id: string; resource_id: SapResourceName; machine_id: string | null; rule_code: string | null; title: string | null; state: SapOutboxJob["state"]; attempts: number; next_attempt_at: Date | null; last_error: string | null; object_key: string | null; created_at: Date; created_by: string | null; processed_at: Date | null }>(
      `SELECT o.id, o.resource_id, o.machine_id, o.rule_code, o.payload->>'NotificationText' AS title, o.state, o.attempts, o.next_attempt_at,
              o.last_error, o.object_key, o.created_at, u.full_name AS created_by, o.processed_at
         FROM sap_outbox o LEFT JOIN users u ON u.id = o.created_by
        WHERE o.connection_id = $1 ORDER BY o.created_at DESC LIMIT 50`,
      [connection.id],
    ),
    query<{ id: string; created_at: Date; action: string; resource_id: SapResourceName | null; object_key: string | null; direction: SapAuditEntry["direction"]; status: SapAuditEntry["status"]; http_status: number | null; duration_ms: number | null; correlation_id: string | null; message: string | null; user_name: string | null }>(
      `SELECT a.id, a.created_at, a.action, a.resource_id, a.object_key, a.direction, a.status, a.http_status, a.duration_ms, a.correlation_id::text, a.message, u.full_name AS user_name
         FROM sap_audit_log a LEFT JOIN users u ON u.id = a.user_id
        WHERE a.connection_id = $1 ORDER BY a.created_at DESC LIMIT 60`,
      [connection.id],
    ),
  ]);
  for (const row of cache.rows) records[row.resource_id].push({ syncedAt: iso(row.synced_at)!, payload: row.payload });
  return {
    vocabulary,
    connection,
    records,
    syncRuns: runs.rows.map((r) => ({ id: Number(r.id), startedAt: iso(r.started_at)!, finishedAt: iso(r.finished_at), requestedBy: r.requested_by, records: r.records, failed: r.failed ?? [], truncated: r.truncated ?? [] })),
    outbox: outbox.rows.map((o) => ({
      id: Number(o.id),
      resource: o.resource_id,
      machineId: o.machine_id,
      ruleCode: o.rule_code,
      title: o.title,
      state: o.state,
      attempts: o.attempts,
      nextAttemptAt: o.state === "retry" || o.state === "pending" ? iso(o.next_attempt_at) : null,
      lastError: o.last_error,
      objectKey: o.object_key,
      createdAt: iso(o.created_at)!,
      createdBy: o.created_by,
      processedAt: iso(o.processed_at),
    })),
    audit: audit.rows.map((a) => ({
      id: Number(a.id),
      at: iso(a.created_at)!,
      action: a.action,
      resource: a.resource_id,
      objectKey: a.object_key,
      direction: a.direction,
      status: a.status,
      httpStatus: a.http_status,
      durationMs: a.duration_ms,
      correlationId: a.correlation_id,
      message: a.message,
      user: a.user_name,
    })),
    equipment,
    materials,
    parts,
    points,
  };
}

/* ----------------------------------------------------------- measuring points */

export interface SapPointMapping {
  measurementId: string;
  machineId: string;
  tag: string;
  name: string;
  unit: string | null;
  sapPoint: string | null;
  /** Last reading sent to SAP, and when it was taken. */
  lastSentAt: string | null;
  lastSentState: SapOutboxJob["state"] | null;
}

async function pointMappings(plantId: string): Promise<SapPointMapping[]> {
  const res = await query<{ measurement_id: string; machine_id: string; tag: string; name: string; unit: string | null; sap_point: string | null; sent_at: Date | null; sent_state: SapOutboxJob["state"] | null }>(
    `SELECT v.measurement_id, v.machine_id, v.tag, v.name, v.unit, mp.sap_point, o.created_at AS sent_at, o.state AS sent_state
       FROM v_measurement_context v
       LEFT JOIN sap_measuring_point_mappings mp ON mp.measurement_id = v.measurement_id
       LEFT JOIN LATERAL (SELECT created_at, state FROM sap_outbox WHERE measurement_id = v.measurement_id ORDER BY created_at DESC LIMIT 1) o ON true
      WHERE v.plant_id = $1 AND v.value_kind = 'analog'
      ORDER BY v.machine_id, v.sort_order, v.measurement_id`,
    [plantId],
  );
  return res.rows.map((r) => ({
    measurementId: r.measurement_id,
    machineId: r.machine_id,
    tag: r.tag,
    name: r.name,
    unit: r.unit,
    sapPoint: r.sap_point,
    lastSentAt: iso(r.sent_at),
    lastSentState: r.sent_state,
  }));
}

/** Links (or, with a blank point, unlinks) measurements to SAP measuring points, several at once. */
export async function savePointMappings(plantId: string, rows: { measurementId: string; sapPoint: string | null }[], userId: string | null): Promise<number> {
  if (!rows.length) return 0;
  const ok = await query<{ measurement_id: string }>("SELECT measurement_id FROM v_measurement_context WHERE plant_id = $1 AND measurement_id = ANY($2::varchar[])", [plantId, rows.map((r) => r.measurementId)]);
  const mine = new Set(ok.rows.map((r) => r.measurement_id));
  const bad = rows.find((r) => !mine.has(r.measurementId));
  if (bad) throw new NotFoundError(`Measurement '${bad.measurementId}' not found.`);
  const client = await getClient();
  try {
    await client.query("BEGIN");
    for (const r of rows) {
      const point = clean(r.sapPoint);
      if (point && point.length > 12) throw new InputError("A measuring point number is at most 12 characters.");
      if (point) {
        await client.query(
          `INSERT INTO sap_measuring_point_mappings (measurement_id, sap_point, updated_by) VALUES ($1,$2,$3)
           ON CONFLICT (measurement_id) DO UPDATE SET sap_point = EXCLUDED.sap_point, updated_by = EXCLUDED.updated_by, updated_at = now()`,
          [r.measurementId, point, userId],
        );
      } else await client.query("DELETE FROM sap_measuring_point_mappings WHERE measurement_id = $1", [r.measurementId]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  const connectionId = (await loadConnection(plantId))?.row.id;
  if (connectionId) await writeAudit({ connectionId, userId, action: "mapping.point", resource: "measuringPoints", objectKey: `${rows.length} measuring point${rows.length === 1 ? "" : "s"}`, status: "success" });
  return rows.length;
}

/** Runs `fn` over `items`, `n` at a time. */
async function pool<T>(items: T[], n: number, fn: (item: T) => Promise<void>): Promise<void> {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) await fn(items[i++]);
    }),
  );
}

/**
 * Writes each linked measurement's latest reading to SAP as a measurement
 * document (once per reading). One log line for the whole publish.
 */
export async function publishSapReadings(plantId: string, userId: string | null): Promise<{ sent: number; failed: number; unchanged: number }> {
  const connection = await getSapConnection(plantId);
  const latest = await query<{ measurement_id: string; sap_point: string; unit: string | null; value: string | number; acquired_at: Date }>(
    `SELECT mp.measurement_id, mp.sap_point, v.unit, r.value, r.acquired_at
       FROM sap_measuring_point_mappings mp
       JOIN v_measurement_context v ON v.measurement_id = mp.measurement_id AND v.plant_id = $1
       JOIN LATERAL (SELECT value, acquired_at FROM readings WHERE measurement_id = mp.measurement_id AND value IS NOT NULL ORDER BY acquired_at DESC LIMIT 1) r ON true`,
    [plantId],
  );
  const jobs: number[] = [];
  for (const r of latest.rows) {
    const at = new Date(r.acquired_at);
    const payload = {
      MeasuringPoint: r.sap_point,
      MsmtRdngDate: at.toISOString().slice(0, 10),
      MsmtRdngTime: at.toISOString().slice(11, 19),
      MeasurementReading: Number(r.value),
      ...(r.unit ? { MeasurementReadingEntryUoM: r.unit } : {}),
    };
    const ins = await query<{ id: string }>(
      `INSERT INTO sap_outbox (connection_id, resource_id, machine_id, measurement_id, payload, idempotency_key, correlation_id, created_by)
       SELECT $1, 'measurementDocuments', v.machine_id, v.measurement_id, $3::jsonb, $4, $5, $6 FROM v_measurement_context v WHERE v.measurement_id = $2::varchar
       ON CONFLICT (idempotency_key) DO NOTHING RETURNING id`,
      [connection.id, r.measurement_id, JSON.stringify(payload), `msmt|${r.measurement_id}|${at.toISOString()}`, crypto.randomUUID(), userId],
    );
    if (ins.rows[0]) jobs.push(Number(ins.rows[0].id));
  }
  let sent = 0;
  let failed = 0;
  const started = Date.now();
  await pool(jobs, 8, async (id) => {
    if (await processOutboxJob(id, userId, { quiet: true })) sent += 1;
    else failed += 1;
  });
  if (jobs.length) {
    await writeAudit({
      connectionId: connection.id,
      userId,
      action: "measurement.publish",
      resource: "measurementDocuments",
      direction: "to_sap",
      status: failed ? (sent ? "warning" : "failed") : "success",
      durationMs: Date.now() - started,
      message: `${sent} readings sent${failed ? `, ${failed} will be tried again` : ""}`,
    });
  }
  return { sent, failed, unchanged: latest.rows.length - jobs.length };
}

/* ------------------------------------------------------------- the simulator */

export interface SapSimStatus {
  settings: SapSimSettings | null;
  /** The plant's SAP connection points at the simulator. */
  connected: boolean;
  /** A connection to a real SAP system that starting the simulator would replace. */
  realConnection: string | null;
  counts: { equipment: number; materials: number; measuringPoints: number; openNotifications: number; openOrders: number; shortMaterials: number; productionOrders: number } | null;
  resources: { id: SapResourceName; label: string }[];
}

export async function sapSimStatus(plantId: string): Promise<SapSimStatus> {
  const [settings, conn, vocab] = await Promise.all([getSapSim(plantId), loadConnection(plantId), sapVocabulary()]);
  const connected = Boolean(conn && isSimUrl(conn.row.base_url));
  let counts: SapSimStatus["counts"] = null;
  if (settings) {
    const r = (
      await query<{ eq: string; mat: string; mp: string; notif: string; orders: string; short: string; prod: string }>(
        `SELECT (SELECT count(*) FROM sap_sim_equipment WHERE plant_id = $1) AS eq,
                (SELECT count(*) FROM sap_sim_materials WHERE plant_id = $1) AS mat,
                (SELECT count(*) FROM sap_sim_measuring_points WHERE plant_id = $1) AS mp,
                (SELECT count(*) FROM sap_sim_notifications n WHERE n.plant_id = $1 AND NOT EXISTS
                   (SELECT 1 FROM sap_sim_orders o WHERE o.plant_id = n.plant_id AND o.notification = n.notification AND o.closed_at <= now())) AS notif,
                (SELECT count(*) FROM sap_sim_orders WHERE plant_id = $1 AND created_at <= now() AND closed_at > now()) AS orders,
                (SELECT count(*) FROM sap_sim_stock s WHERE s.plant_id = $1 AND s.opening_qty * (SELECT stock_level FROM sap_sim_systems WHERE plant_id = $1)
                   + COALESCE((SELECT sum(quantity) FROM sap_sim_stock_movements m WHERE m.plant_id = s.plant_id AND m.material = s.material AND m.storage_location = s.storage_location AND m.at <= now()), 0) <= 0) AS short,
                (SELECT count(*) FROM sap_sim_production_orders WHERE plant_id = $1 AND created_at <= now() AND end_at > now()) AS prod`,
        [plantId],
      )
    ).rows[0];
    counts = { equipment: +r.eq, materials: +r.mat, measuringPoints: +r.mp, openNotifications: +r.notif, openOrders: +r.orders, shortMaterials: +r.short, productionOrders: +r.prod };
  }
  return {
    settings,
    connected,
    realConnection: conn && !connected ? conn.row.base_url : null,
    counts,
    resources: vocab.resources.map((x) => ({ id: x.id, label: x.label })),
  };
}

/** Starts (or starts again from scratch) the plant's simulated SAP and links the plant to it. */
export async function startSimulatedSap(plantId: string, userId: string | null, opts: { replace?: boolean } = {}): Promise<SapSimStatus> {
  const conn = await loadConnection(plantId);
  if (conn && !isSimUrl(conn.row.base_url) && !opts.replace) throw new InputError(`This plant is linked to a real SAP system (${conn.row.base_url}). Replace it to start the simulated one.`);
  const previous = await getSapSim(plantId);
  const sim = await createSapSim(plantId, userId);
  if (previous) {
    await updateSapSim(
      plantId,
      {
        plannerDelayMin: previous.plannerDelayMin,
        releaseDelayMin: previous.releaseDelayMin,
        workHours: previous.workHours,
        verifyHours: previous.verifyHours,
        preventiveEveryDays: previous.preventiveEveryDays,
        productionHours: previous.productionHours,
        latencyMs: previous.latencyMs,
        failureRate: previous.failureRate,
        stockLevel: previous.stockLevel,
        slowResourceId: previous.slowResourceId,
      },
      userId,
    );
  }
  // A new SAP system: what ULTRON held from the old one no longer exists.
  if (conn) await query("DELETE FROM sap_object_cache WHERE connection_id = $1", [conn.row.id]);
  const editions = (await sapVocabulary()).editions;
  await saveSapConnection(
    {
      plantId,
      name: conn?.row.name && isSimUrl(conn.row.base_url) ? conn.row.name : "SAP S/4HANA",
      editionId: editions.find((e) => e.id === "cloud_private")?.id ?? editions[0].id,
      baseUrl: SIM_ORIGIN,
      authType: "oauth_client_credentials",
      tokenUrl: `${SIM_ORIGIN}${SIM_TOKEN_PATH}`,
      clientId: sim.clientId,
      clientSecret: sim.clientSecret,
      sapPlant: sim.plantCode,
      notificationType: "M1",
      syncEveryMin: conn?.row.sync_every_min ?? 15,
      publishEveryMin: conn?.row.publish_every_min ?? null,
    },
    userId,
  );
  await testSapPlant(plantId, userId);
  await syncSapPlant(plantId, userId);
  return sapSimStatus(plantId);
}

/** Stops the plant's simulated SAP; the plant's link to it goes too. */
export async function stopSimulatedSap(plantId: string): Promise<SapSimStatus> {
  const conn = await loadConnection(plantId);
  if (conn && isSimUrl(conn.row.base_url)) await query("DELETE FROM sap_connections WHERE id = $1", [conn.row.id]);
  await deleteSapSim(plantId);
  return sapSimStatus(plantId);
}

export { updateSapSim };

/* --------------------------------------------------------------- the schedule */

/**
 * Background work for every plant with an SAP connection, once a minute:
 * writes that are due, then a sync and a reading publish when their interval
 * has passed. One server does a plant at a time (advisory lock).
 */
export async function runSapSchedule(): Promise<void> {
  const conns = await query<{ id: string; plant_id: string; sync_every_min: number | null; publish_every_min: number | null; last_sync: Date | null; last_publish: Date | null }>(
    `SELECT c.id, c.plant_id, c.sync_every_min, c.publish_every_min,
            (SELECT max(started_at) FROM sap_sync_runs r WHERE r.connection_id = c.id) AS last_sync,
            (SELECT max(created_at) FROM sap_audit_log a WHERE a.connection_id = c.id AND a.action = 'measurement.publish') AS last_publish
       FROM sap_connections c WHERE c.enabled`,
  );
  for (const c of conns.rows) {
    const lock = await getClient();
    try {
      const got = (await lock.query<{ ok: boolean }>("SELECT pg_try_advisory_lock(hashtext($1)) AS ok", [`ultron-sap:${c.id}`])).rows[0]?.ok;
      if (!got) continue;
      try {
        await processDueSapOutbox(c.plant_id, null);
        const now = Date.now();
        if (c.sync_every_min && (!c.last_sync || now - new Date(c.last_sync).getTime() >= c.sync_every_min * 60_000)) await syncSapPlant(c.plant_id, null);
        if (c.publish_every_min && (!c.last_publish || now - new Date(c.last_publish).getTime() >= c.publish_every_min * 60_000)) await publishSapReadings(c.plant_id, null);
      } finally {
        await lock.query("SELECT pg_advisory_unlock(hashtext($1))", [`ultron-sap:${c.id}`]);
      }
    } catch (error) {
      console.error(`[sap] scheduled work for ${c.plant_id} failed:`, error instanceof Error ? error.message : error);
    } finally {
      lock.release();
    }
  }
}

let scheduler: ReturnType<typeof setInterval> | null = null;
export function startSapScheduler(): void {
  if (scheduler) return;
  let running = false;
  const tick = () => {
    if (running) return;
    running = true;
    void runSapSchedule()
      .catch((error) => console.error("[sap] schedule failed:", error instanceof Error ? error.message : error))
      .finally(() => {
        running = false;
      });
  };
  setTimeout(tick, 20_000);
  scheduler = setInterval(tick, 60_000);
}
