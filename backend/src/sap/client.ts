import crypto from "crypto";
import { SapError, type SapConnection, type SapODataPage, type SapResourceName } from "./types";
import { assertSafeSapUrl, joinSapUrl } from "./url";
import { isSimUrl } from "./sim/origin";

/** fetch, or the plant's simulated SAP system when the connection points at it. */
async function sapFetch(connection: SapConnection, url: string, init: RequestInit): Promise<Response> {
  if (!isSimUrl(url)) return fetch(url, init);
  const { handleSimRequest } = await import("./sim/odata");
  const timeout = new Promise<never>((_, reject) => {
    const signal = init.signal;
    signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
  });
  return Promise.race([handleSimRequest(connection.plantId, new Request(url, { ...init, signal: undefined, redirect: undefined })), timeout]);
}

/**
 * OData client for SAP S/4HANA: OAuth client-credentials tokens (cached until
 * shortly before they expire) or basic sign-in, a timeout on every request,
 * OData V2 and V4 pages, and CSRF tokens for writes.
 */

type TokenEntry = { token: string; expiresAt: number };
const globalRef = globalThis as unknown as { __ultronSapTokens?: Map<string, TokenEntry> };
const tokenCache = () => (globalRef.__ultronSapTokens ??= new Map());

export type SapRequestResult<T> = {
  data: T;
  status: number;
  durationMs: number;
  correlationId: string;
};

function timeoutMs(): number {
  const configured = Number(process.env.SAP_REQUEST_TIMEOUT_MS ?? 15000);
  return Number.isFinite(configured) ? Math.min(Math.max(configured, 1000), 60000) : 15000;
}

/** SAP's own error text, when the body carries one. */
function sapErrorText(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const error = (value as Record<string, unknown>).error as Record<string, unknown> | undefined;
  const message = error?.message;
  if (typeof message === "string") return message.slice(0, 300);
  if (message && typeof message === "object" && typeof (message as Record<string, unknown>).value === "string") {
    return String((message as Record<string, unknown>).value).slice(0, 300);
  }
  return "";
}

async function oauthToken(connection: SapConnection): Promise<string> {
  const cached = tokenCache().get(connection.id);
  if (cached && cached.expiresAt > Date.now() + 30000) return cached.token;
  if (!connection.tokenUrl) throw new SapError(400, "The SAP connection has no token URL.");
  await assertSafeSapUrl(connection.tokenUrl);
  const body = new URLSearchParams({ grant_type: "client_credentials" });
  if (connection.credentials.scope) body.set("scope", connection.credentials.scope);
  const basic = Buffer.from(`${connection.credentials.clientId}:${connection.credentials.clientSecret}`).toString("base64");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());
  try {
    const response = await sapFetch(connection, connection.tokenUrl, {
      method: "POST",
      headers: { authorization: `Basic ${basic}`, "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal,
      redirect: "error",
    });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok || typeof payload.access_token !== "string") throw new SapError(502, `SAP refused the sign-in (token request ${response.status}).`);
    const expires = Math.max(Number(payload.expires_in ?? 300), 60);
    tokenCache().set(connection.id, { token: payload.access_token, expiresAt: Date.now() + expires * 1000 });
    return payload.access_token;
  } catch (error) {
    if (error instanceof SapError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw new SapError(504, "The SAP sign-in took too long.");
    throw new SapError(502, "The SAP token address could not be reached.");
  } finally {
    clearTimeout(timer);
  }
}

/** Forget a cached token (after the connection's credentials change). */
export const forgetSapToken = (connectionId: string) => {
  tokenCache().delete(connectionId);
  for (const k of csrfCache.keys()) if (k.startsWith(`${connectionId}|`)) csrfCache.delete(k);
};

async function authHeader(connection: SapConnection): Promise<string> {
  if (connection.authType === "basic") {
    return `Basic ${Buffer.from(`${connection.credentials.username}:${connection.credentials.password}`).toString("base64")}`;
  }
  return `Bearer ${await oauthToken(connection)}`;
}

async function request(connection: SapConnection, url: string, init: RequestInit = {}): Promise<SapRequestResult<unknown>> {
  await assertSafeSapUrl(url);
  const correlationId = crypto.randomUUID();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());
  const started = Date.now();
  try {
    const response = await sapFetch(connection, url, {
      ...init,
      headers: {
        accept: "application/json",
        authorization: await authHeader(connection),
        "x-correlation-id": correlationId,
        ...(init.headers ?? {}),
      },
      signal: controller.signal,
      redirect: "error",
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    if (!response.ok) {
      const detail = sapErrorText(data);
      throw new SapError(502, `SAP answered ${response.status}${detail ? `: ${detail}` : "."}`);
    }
    return { data, status: response.status, durationMs: Date.now() - started, correlationId };
  } catch (error) {
    if (error instanceof SapError) throw error;
    if (error instanceof SyntaxError) throw new SapError(502, "SAP sent an answer that is not JSON.");
    if (error instanceof Error && error.name === "AbortError") throw new SapError(504, "SAP took too long to answer.");
    throw new SapError(502, "SAP could not be reached.");
  } finally {
    clearTimeout(timer);
  }
}

/** Records, next-page link and count of an OData V2 (`d.results`) or V4 (`value`) answer. */
export function parseSapODataPage(data: unknown): SapODataPage {
  const root = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const v2 = root.d && typeof root.d === "object" ? (root.d as Record<string, unknown>) : null;
  const records = Array.isArray(root.value) ? root.value : Array.isArray(v2?.results) ? v2.results : v2 && !Array.isArray(v2) ? [v2] : [];
  const rawNext = root["@odata.nextLink"] ?? root["odata.nextLink"] ?? v2?.__next;
  const rawCount = root["@odata.count"] ?? v2?.__count;
  return {
    records: records.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")),
    nextLink: typeof rawNext === "string" ? rawNext : null,
    count: rawCount === undefined ? null : Number(rawCount),
  };
}

export async function readSapResource(
  connection: SapConnection,
  resource: SapResourceName,
  search: Record<string, string> = {},
): Promise<SapRequestResult<SapODataPage>> {
  const url = new URL(joinSapUrl(connection.baseUrl, connection.paths[resource]));
  for (const [key, value] of Object.entries(search)) url.searchParams.set(key, value);
  const result = await request(connection, url.toString());
  return { ...result, data: parseSapODataPage(result.data) };
}

export async function readSapContinuation(connection: SapConnection, nextLink: string): Promise<SapRequestResult<SapODataPage>> {
  const result = await request(connection, joinSapUrl(connection.baseUrl, nextLink));
  return { ...result, data: parseSapODataPage(result.data) };
}

const csrfCache = new Map<string, { token: string; cookie: string; at: number }>();
const CSRF_TTL_MS = 10 * 60_000;

/** A CSRF token for writes to `resource`, reused for a few minutes like a browser session would. */
async function csrfFor(connection: SapConnection, resource: SapResourceName, fresh = false) {
  const key = `${connection.id}|${resource}`;
  const hit = csrfCache.get(key);
  if (!fresh && hit && Date.now() - hit.at < CSRF_TTL_MS) return hit;
  const got = await csrfContext(connection, resource);
  const entry = { ...got, at: Date.now() };
  csrfCache.set(key, entry);
  return entry;
}

async function csrfContext(connection: SapConnection, resource: SapResourceName) {
  const url = joinSapUrl(connection.baseUrl, connection.paths[resource]);
  await assertSafeSapUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());
  try {
    const response = await sapFetch(connection, url, {
      method: "GET",
      headers: { authorization: await authHeader(connection), "x-csrf-token": "Fetch", accept: "application/json" },
      signal: controller.signal,
      redirect: "error",
    });
    if (!response.ok) throw new SapError(502, `SAP refused the write token (${response.status}).`);
    const token = response.headers.get("x-csrf-token");
    if (!token) throw new SapError(502, "SAP sent no write (CSRF) token.");
    const cookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [response.headers.get("set-cookie") ?? ""];
    return {
      token,
      cookie: cookies
        .filter(Boolean)
        .map((value) => value.split(";")[0])
        .join("; "),
    };
  } catch (error) {
    if (error instanceof SapError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw new SapError(504, "SAP took too long to answer.");
    throw new SapError(502, "SAP could not be reached.");
  } finally {
    clearTimeout(timer);
  }
}

export async function writeSapResource(
  connection: SapConnection,
  resource: SapResourceName,
  payload: Record<string, unknown>,
): Promise<SapRequestResult<Record<string, unknown>>> {
  const post = async (fresh: boolean) => {
    const csrf = await csrfFor(connection, resource, fresh);
    return request(connection, joinSapUrl(connection.baseUrl, connection.paths[resource]), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": csrf.token,
        ...(csrf.cookie ? { cookie: csrf.cookie } : {}),
      },
      body: JSON.stringify(payload),
    });
  };
  let result: SapRequestResult<unknown>;
  try {
    result = await post(false);
  } catch (error) {
    // An expired session answers 403: fetch a new token once.
    if (!(error instanceof SapError && / 403/.test(error.message))) throw error;
    result = await post(true);
  }
  const root = result.data as Record<string, unknown>;
  const data = root.d && typeof root.d === "object" ? (root.d as Record<string, unknown>) : root;
  return { ...result, data };
}

/** One equipment record: proves the address, the sign-in and the Equipment API. */
export const testSapConnection = (connection: SapConnection) => readSapResource(connection, "equipment", { $top: "1" });
